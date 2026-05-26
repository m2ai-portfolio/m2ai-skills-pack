"""Model Audit benchmark runner.

Loads benchmark prompts, sends them to specified models, evaluates outputs
against quality checks, and produces structured results.

Usage:
    python runner.py --model nvidia/NVIDIA-Nemotron-3-Super-120B-A12B
    python runner.py --model gpt-4.1 --provider openai
    python runner.py --model gemini-3.1-pro-preview --provider google
    python runner.py --compare model1 model2 [model3...]
    python runner.py --benchmark spec_expansion --model MODEL
    python runner.py --list-benchmarks
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from cost_rates import estimate_cost, get_rate

logger = logging.getLogger(__name__)

BENCHMARKS_DIR = Path(__file__).parent / "benchmarks"

# Provider configurations
PROVIDERS = {
    "deepinfra": {
        "base_url": "https://api.deepinfra.com/v1/openai",
        "env_key": "DEEPINFRA_API_KEY",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "env_key": "OPENAI_API_KEY",
    },
    "google": {
        "base_url": None,  # Uses google.generativeai SDK
        "env_key": "GOOGLE_API_KEY",
    },
}

# Auto-detect provider from model name
PROVIDER_HINTS = {
    "nvidia/": "deepinfra",
    "mistralai/": "deepinfra",
    "meta-llama/": "deepinfra",
    "anthropic/": "deepinfra",
    "deepseek-ai/": "deepinfra",
    "gpt-": "openai",
    "o1-": "openai",
    "o3-": "openai",
    "gemini-": "google",
}


@dataclass
class CheckResult:
    check_id: str
    name: str
    passed: bool
    severity: str
    detail: str = ""


@dataclass
class BenchmarkResult:
    benchmark_id: str
    benchmark_name: str
    model: str
    provider: str
    output: str
    checks: list[CheckResult] = field(default_factory=list)
    latency_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    error: str = ""
    cost_usd: float | None = None
    input_rate: float | None = None
    output_rate: float | None = None

    @property
    def cost_per_check_passed(self) -> float | None:
        """Cost effectiveness: USD per passing check. Lower is better."""
        if self.cost_usd is None or self.total_pass == 0:
            return None
        return self.cost_usd / self.total_pass

    @property
    def critical_pass(self) -> bool:
        return all(c.passed for c in self.checks if c.severity == "critical")

    @property
    def total_pass(self) -> int:
        return sum(1 for c in self.checks if c.passed)

    @property
    def total_checks(self) -> int:
        return len(self.checks)

    @property
    def score_pct(self) -> float:
        return (self.total_pass / self.total_checks * 100) if self.total_checks else 0


def detect_provider(model: str) -> str:
    for prefix, provider in PROVIDER_HINTS.items():
        if model.startswith(prefix):
            return provider
    return "deepinfra"


def load_benchmarks(benchmark_ids: list[str] | None = None) -> list[dict]:
    """Load benchmark definitions from JSON files."""
    benchmarks = []
    for f in sorted(BENCHMARKS_DIR.glob("*.json")):
        data = json.loads(f.read_text())
        if benchmark_ids is None or data["id"] in benchmark_ids:
            benchmarks.append(data)
    return benchmarks


def call_model_openai_compat(
    model: str, prompt: str, base_url: str, api_key: str, max_tokens: int = 8192
) -> tuple[str, int, int, int]:
    """Call a model via OpenAI-compatible API. Returns (output, latency_ms, in_tokens, out_tokens)."""
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url=base_url)
    t0 = time.time()
    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    latency = int((time.time() - t0) * 1000)
    output = response.choices[0].message.content or ""
    in_tok = response.usage.prompt_tokens if response.usage else 0
    out_tok = response.usage.completion_tokens if response.usage else 0
    return output, latency, in_tok, out_tok


def call_model_google(
    model: str, prompt: str, api_key: str, max_tokens: int = 8192
) -> tuple[str, int, int, int]:
    """Call a Google Gemini model. Returns (output, latency_ms, in_tokens, out_tokens)."""
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    gen_model = genai.GenerativeModel(model)
    t0 = time.time()
    response = gen_model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(max_output_tokens=max_tokens),
    )
    latency = int((time.time() - t0) * 1000)
    output = response.text or ""
    in_tok = response.usage_metadata.prompt_token_count if response.usage_metadata else 0
    out_tok = response.usage_metadata.candidates_token_count if response.usage_metadata else 0
    return output, latency, in_tok, out_tok


def call_model(
    model: str, prompt: str, provider: str, max_tokens: int = 8192
) -> tuple[str, int, int, int]:
    """Route to the correct provider. Returns (output, latency_ms, in_tokens, out_tokens)."""
    prov = PROVIDERS[provider]
    api_key = os.environ.get(prov["env_key"], "")
    if not api_key:
        raise ValueError(f"Missing API key: set {prov['env_key']} in ~/.env.shared")

    if provider == "google":
        return call_model_google(model, prompt, api_key, max_tokens)
    else:
        return call_model_openai_compat(model, prompt, prov["base_url"], api_key, max_tokens)


# ---------------------------------------------------------------------------
# Check evaluators
# ---------------------------------------------------------------------------


def _extract_json(text: str) -> Optional[dict]:
    """Try to parse JSON from text, stripping markdown fencing if present."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _get_nested(d: dict, field: str):
    """Get a field from dict, searching nested 'scores' dict as fallback."""
    val = d.get(field)
    if val is not None:
        return val
    # Check nested dicts (Tyrest nests scores under 'scores' key)
    for v in d.values():
        if isinstance(v, dict) and field in v:
            return v[field]
    return None


def run_check(check: dict, output: str) -> CheckResult:
    """Evaluate a single check against model output."""
    ctype = check["type"]
    output_lower = output.lower()

    if ctype == "marker_count":
        markers = check["markers"]
        hits = [m for m in markers if m.lower() in output_lower]
        max_hits = check["max_hits"]
        passed = len(hits) <= max_hits
        detail = f"{len(hits)} hits (max {max_hits})"
        if hits:
            detail += f": {hits[:3]}"
        return CheckResult(check["id"], check["name"], passed, check["severity"], detail)

    elif ctype == "min_header_count":
        count = output.count("\n## ") + (1 if output.startswith("## ") else 0)
        count += output.count("\n# ") + (1 if output.startswith("# ") else 0)
        passed = count >= check["min_count"]
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"{count} headers (need >= {check['min_count']})"
        )

    elif ctype == "line_count_range":
        lines = output.count("\n") + 1
        passed = check["min_lines"] <= lines <= check["max_lines"]
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"{lines} lines (range: {check['min_lines']}-{check['max_lines']})"
        )

    elif ctype == "regex_present":
        matches = re.findall(check["pattern"], output, re.IGNORECASE)
        passed = len(matches) >= check["min_matches"]
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"{len(matches)} matches (need >= {check['min_matches']})"
        )

    elif ctype == "starts_with":
        stripped = output.lstrip()
        passed = stripped.startswith(check["prefix"])
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"Starts with: {repr(stripped[:30])}"
        )

    elif ctype == "valid_json":
        parsed = _extract_json(output)
        passed = parsed is not None
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            "Valid JSON" if passed else f"Invalid JSON: {output[:100]}"
        )

    elif ctype == "json_field_max":
        parsed = _extract_json(output)
        if parsed is None:
            return CheckResult(check["id"], check["name"], False, check["severity"], "Cannot parse JSON")
        val = _get_nested(parsed, check["field"])
        if val is None:
            return CheckResult(check["id"], check["name"], False, check["severity"], f"Field '{check['field']}' missing")
        try:
            passed = float(val) <= check["max_value"]
        except (ValueError, TypeError):
            return CheckResult(check["id"], check["name"], False, check["severity"],
                f"{check['field']} is not numeric: {str(val)[:60]}")
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"{check['field']}={val} (max {check['max_value']})"
        )

    elif ctype == "json_max_average":
        parsed = _extract_json(output)
        if parsed is None:
            return CheckResult(check["id"], check["name"], False, check["severity"], "Cannot parse JSON")
        try:
            values = [float(_get_nested(parsed, f) or 0) for f in check["fields"]]
        except (ValueError, TypeError):
            return CheckResult(check["id"], check["name"], False, check["severity"],
                "Non-numeric values in scoring fields")
        avg = sum(values) / len(values) if values else 0
        passed = avg <= check["max_average"]
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"Average={avg:.1f} (max {check['max_average']}), values={values}"
        )

    elif ctype == "json_field_min_length":
        parsed = _extract_json(output)
        if parsed is None:
            return CheckResult(check["id"], check["name"], False, check["severity"], "Cannot parse JSON")
        val = str(_get_nested(parsed, check["field"]) or "")
        passed = len(val) >= check["min_length"]
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"Length={len(val)} (min {check['min_length']})"
        )

    elif ctype == "summary_length":
        match = re.search(r"SUMMARY:\s*(.+)", output)
        if not match:
            return CheckResult(check["id"], check["name"], False, check["severity"], "No SUMMARY line found")
        summary = match.group(1).strip()
        passed = len(summary) <= check["max_chars"]
        return CheckResult(
            check["id"], check["name"], passed, check["severity"],
            f"Summary length={len(summary)} (max {check['max_chars']})"
        )

    return CheckResult(check["id"], check["name"], False, "warning", f"Unknown check type: {ctype}")


def run_benchmark(
    benchmark: dict, model: str, provider: str
) -> BenchmarkResult:
    """Run a single benchmark against a model and evaluate all checks."""
    result = BenchmarkResult(
        benchmark_id=benchmark["id"],
        benchmark_name=benchmark["name"],
        model=model,
        provider=provider,
        output="",
    )

    try:
        output, latency, in_tok, out_tok = call_model(
            model, benchmark["prompt"], provider
        )
        result.output = output
        result.latency_ms = latency
        result.input_tokens = in_tok
        result.output_tokens = out_tok
        rate = get_rate(model)
        if rate:
            result.input_rate = rate["input"]
            result.output_rate = rate["output"]
            result.cost_usd = estimate_cost(model, in_tok, out_tok)
    except Exception as e:
        result.error = str(e)
        return result

    for check in benchmark.get("checks", []):
        result.checks.append(run_check(check, output))

    return result


def _fmt_cost(cost: float | None) -> str:
    """Format a cost value for display."""
    if cost is None:
        return "n/a"
    if cost < 0.001:
        return f"${cost:.6f}"
    return f"${cost:.4f}"


def _value_analysis(results: list[BenchmarkResult], monthly_volume: int | None) -> list[str]:
    """Generate value analysis comparing models per benchmark."""
    lines = []
    models = sorted(set(r.model for r in results))
    benchmarks = sorted(set(r.benchmark_id for r in results))

    if len(models) < 2:
        return lines

    lines.append("## Value Analysis\n")

    for bid in benchmarks:
        br = [r for r in results if r.benchmark_id == bid and not r.error and r.cost_usd is not None]
        if len(br) < 2:
            continue

        # Sort by score descending
        br.sort(key=lambda r: r.score_pct, reverse=True)
        best = br[0]
        lines.append(f"### {bid}\n")

        for r in br:
            short = r.model.split("/")[-1]
            lines.append(f"  {short}: {r.score_pct:.1f}% effectiveness at {_fmt_cost(r.cost_usd)}/run")

        # Compare each pair: cheapest vs others
        cheapest = min(br, key=lambda r: r.cost_usd)
        for r in br:
            if r.model == cheapest.model:
                continue
            short_exp = r.model.split("/")[-1]
            short_cheap = cheapest.model.split("/")[-1]
            score_delta = r.score_pct - cheapest.score_pct
            cost_ratio = r.cost_usd / cheapest.cost_usd if cheapest.cost_usd > 0 else float("inf")

            if score_delta <= 0:
                # Cheaper model is equal or better
                lines.append(f"\n  -> STRONG MATCH: {short_cheap} matches or beats {short_exp} at {cost_ratio:.1f}x less cost")
                if monthly_volume and cheapest.cost_usd is not None and r.cost_usd is not None:
                    saving = (r.cost_usd - cheapest.cost_usd) * monthly_volume
                    lines.append(f"     Projected saving at {monthly_volume} runs/mo: ${saving:.2f}/mo")
            elif score_delta / max(cheapest.score_pct, 1) <= 0.10:
                # Within 10% relative
                lines.append(f"\n  -> STRONG MATCH: {short_cheap} within {score_delta:.1f}pp of {short_exp} at {cost_ratio:.1f}x less cost")
                if monthly_volume and cheapest.cost_usd is not None and r.cost_usd is not None:
                    saving = (r.cost_usd - cheapest.cost_usd) * monthly_volume
                    lines.append(f"     Projected saving at {monthly_volume} runs/mo: ${saving:.2f}/mo")
            elif score_delta / max(cheapest.score_pct, 1) <= 0.15:
                # Within 15% relative
                lines.append(f"\n  -> ACCEPTABLE MATCH: {short_exp} +{score_delta:.1f}pp for {cost_ratio:.1f}x cost -- marginal, consider if task-critical")
                if monthly_volume and cheapest.cost_usd is not None and r.cost_usd is not None:
                    saving = (r.cost_usd - cheapest.cost_usd) * monthly_volume
                    lines.append(f"     Potential saving if tier-reduced: ${saving:.2f}/mo")
            else:
                # >15% gap -- justified
                lines.append(f"\n  -> JUSTIFIED: {short_exp} +{score_delta:.1f}pp effectiveness for {cost_ratio:.1f}x cost")

        lines.append("")

    return lines


def _monthly_projection(results: list[BenchmarkResult], monthly_volume: int) -> list[str]:
    """Generate monthly cost projection table."""
    lines = []
    models = sorted(set(r.model for r in results))
    benchmarks = sorted(set(r.benchmark_id for r in results))

    lines.append(f"## Monthly Cost Projection ({monthly_volume} runs/benchmark)\n")

    header = "| Model |"
    sep = "|-------|"
    for bid in benchmarks:
        header += f" {bid} |"
        sep += "------|"
    header += " Total |"
    sep += "------|"
    lines.append(header)
    lines.append(sep)

    for model in models:
        short = model.split("/")[-1][:25]
        row = f"| {short} |"
        total = 0.0
        has_cost = False
        for bid in benchmarks:
            r = next((r for r in results if r.model == model and r.benchmark_id == bid), None)
            if r and r.cost_usd is not None:
                monthly = r.cost_usd * monthly_volume
                total += monthly
                row += f" ${monthly:.2f} |"
                has_cost = True
            else:
                row += " -- |"
        row += f" ${total:.2f} |" if has_cost else " -- |"
        lines.append(row)

    lines.append("")
    return lines


def format_results(
    results: list[BenchmarkResult],
    show_cost: bool = True,
    monthly_volume: int | None = None,
) -> str:
    """Format results as a readable report."""
    lines = []

    # Group by model for comparison view
    models = sorted(set(r.model for r in results))
    benchmarks = sorted(set(r.benchmark_id for r in results))

    if len(models) > 1:
        lines.append("## Model Comparison\n")
        header = "| Benchmark |"
        sep = "|-----------|"
        for m in models:
            short = m.split("/")[-1][:25]
            header += f" {short} |"
            sep += "------|"
        lines.append(header)
        lines.append(sep)

        for bid in benchmarks:
            row = f"| {bid} |"
            for m in models:
                r = next((r for r in results if r.model == m and r.benchmark_id == bid), None)
                if r is None:
                    row += " -- |"
                elif r.error:
                    row += " ERROR |"
                else:
                    icon = "PASS" if r.critical_pass else "FAIL"
                    cost_str = f" {_fmt_cost(r.cost_usd)}" if show_cost and r.cost_usd is not None else ""
                    row += f" {icon} {r.total_pass}/{r.total_checks} ({r.latency_ms}ms){cost_str} |"
            lines.append(row)
        lines.append("")

    # Detailed results per model
    for model in models:
        model_results = [r for r in results if r.model == model]
        short_model = model.split("/")[-1]
        lines.append(f"## {short_model}\n")

        for r in model_results:
            status = "PASS" if r.critical_pass else "**FAIL**"
            lines.append(f"### {r.benchmark_name} -- {status} ({r.total_pass}/{r.total_checks})")
            lines.append(f"Latency: {r.latency_ms}ms | Tokens: {r.input_tokens} in / {r.output_tokens} out")

            if show_cost and r.cost_usd is not None:
                rate_str = f"in: ${r.input_rate}/M, out: ${r.output_rate}/M" if r.input_rate else ""
                val_str = f" | Value: {_fmt_cost(r.cost_per_check_passed)}/check" if r.cost_per_check_passed else ""
                lines.append(f"Cost: {_fmt_cost(r.cost_usd)} ({rate_str}){val_str}")
            elif show_cost:
                lines.append("Cost: rate unavailable")

            lines.append("")

            if r.error:
                lines.append(f"**Error:** {r.error}\n")
                continue

            for c in r.checks:
                icon = "PASS" if c.passed else "FAIL"
                sev = f" [{c.severity}]" if not c.passed else ""
                lines.append(f"  {icon} {c.name}{sev}: {c.detail}")

            lines.append("")

    # Value analysis (comparison mode only, cost enabled)
    if show_cost and len(models) > 1:
        lines.extend(_value_analysis(results, monthly_volume))

    # Monthly projection
    if show_cost and monthly_volume:
        lines.extend(_monthly_projection(results, monthly_volume))

    return "\n".join(lines)


def format_json(
    results: list[BenchmarkResult],
    show_cost: bool = True,
    monthly_volume: int | None = None,
) -> str:
    """Format results as JSON for programmatic consumption."""
    items = []
    for r in results:
        entry: dict = {
            "benchmark_id": r.benchmark_id,
            "model": r.model,
            "provider": r.provider,
            "critical_pass": r.critical_pass,
            "score_pct": round(r.score_pct, 1),
            "total_pass": r.total_pass,
            "total_checks": r.total_checks,
            "latency_ms": r.latency_ms,
            "input_tokens": r.input_tokens,
            "output_tokens": r.output_tokens,
            "error": r.error,
            "checks": [
                {"id": c.check_id, "passed": c.passed, "severity": c.severity, "detail": c.detail}
                for c in r.checks
            ],
        }
        if show_cost:
            entry["cost_usd"] = r.cost_usd
            entry["input_rate_per_m"] = r.input_rate
            entry["output_rate_per_m"] = r.output_rate
            entry["cost_per_check_passed"] = round(r.cost_per_check_passed, 8) if r.cost_per_check_passed else None
        items.append(entry)

    # Build value analysis for comparison mode
    models = sorted(set(r.model for r in results))
    benchmarks_ids = sorted(set(r.benchmark_id for r in results))
    value_recs = []

    if show_cost and len(models) > 1:
        for bid in benchmarks_ids:
            br = [r for r in results if r.benchmark_id == bid and not r.error and r.cost_usd is not None]
            if len(br) < 2:
                continue
            cheapest = min(br, key=lambda r: r.cost_usd)
            for r in br:
                if r.model == cheapest.model:
                    continue
                score_delta = r.score_pct - cheapest.score_pct
                rel_delta = score_delta / max(cheapest.score_pct, 1)
                cost_ratio = r.cost_usd / cheapest.cost_usd if cheapest.cost_usd > 0 else None
                if rel_delta <= 0.10:
                    rec_type = "strong_match"
                elif rel_delta <= 0.15:
                    rec_type = "acceptable_match"
                else:
                    rec_type = "justified"
                rec: dict = {
                    "benchmark_id": bid,
                    "recommendation": rec_type,
                    "cheaper_model": cheapest.model,
                    "expensive_model": r.model,
                    "score_delta_pct": round(score_delta, 1),
                    "cost_ratio": round(cost_ratio, 1) if cost_ratio else None,
                }
                if monthly_volume and cheapest.cost_usd is not None and r.cost_usd is not None:
                    rec["monthly_saving_usd"] = round((r.cost_usd - cheapest.cost_usd) * monthly_volume, 2)
                value_recs.append(rec)

    output: dict = {"results": items}
    if show_cost and value_recs:
        output["value_analysis"] = value_recs
    if monthly_volume:
        output["monthly_volume"] = monthly_volume

    return json.dumps(output, indent=2)


PIPELINE_FILE = Path(__file__).parent / "pipeline.json"


@dataclass
class PipelineComponent:
    name: str
    model: str
    provider: str
    benchmark_ids: list[str]
    monthly_runs: int
    results: list[BenchmarkResult] = field(default_factory=list)

    @property
    def total_cost(self) -> float | None:
        costs = [r.cost_usd for r in self.results if r.cost_usd is not None]
        return sum(costs) if costs else None

    @property
    def monthly_cost(self) -> float | None:
        tc = self.total_cost
        return tc * self.monthly_runs if tc is not None else None

    @property
    def all_critical_pass(self) -> bool:
        return all(r.critical_pass for r in self.results if not r.error)

    @property
    def avg_score(self) -> float:
        scores = [r.score_pct for r in self.results if not r.error]
        return sum(scores) / len(scores) if scores else 0


def load_pipeline(path: Path | None = None) -> list[PipelineComponent]:
    """Load pipeline config from JSON."""
    p = path or PIPELINE_FILE
    data = json.loads(p.read_text())
    components = []
    for c in data["components"]:
        components.append(PipelineComponent(
            name=c["name"],
            model=c["model"],
            provider=c.get("provider", "deepinfra"),
            benchmark_ids=c["benchmarks"],
            monthly_runs=c.get("monthly_runs_estimate", 100),
        ))
    return components


def format_pipeline_results(components: list[PipelineComponent], show_cost: bool = True) -> str:
    """Format pipeline audit as a component-grouped report."""
    lines = []
    lines.append("## ST Metro Pipeline Audit\n")

    # Summary table
    lines.append("| Component | Model | Score | Status | Cost/run | Est. Monthly |")
    lines.append("|-----------|-------|-------|--------|----------|-------------|")

    total_monthly = 0.0
    for comp in components:
        short_model = comp.model.split("/")[-1][:20]
        status = "PASS" if comp.all_critical_pass else "**FAIL**"
        cost_str = _fmt_cost(comp.total_cost) if show_cost else ""
        monthly_str = ""
        if show_cost and comp.monthly_cost is not None:
            monthly_str = f"${comp.monthly_cost:.2f}"
            total_monthly += comp.monthly_cost
        lines.append(
            f"| {comp.name} | {short_model} | {comp.avg_score:.0f}% | {status} | {cost_str} | {monthly_str} |"
        )

    if show_cost:
        lines.append(f"| **Total** | | | | | **${total_monthly:.2f}/mo** |")
    lines.append("")

    # Detailed per-component results
    for comp in components:
        lines.append(f"## {comp.name}\n")
        lines.append(f"Model: `{comp.model}` via {comp.provider}")
        lines.append(f"Monthly volume estimate: {comp.monthly_runs} runs\n")

        for r in comp.results:
            status = "PASS" if r.critical_pass else "**FAIL**"
            lines.append(f"### {r.benchmark_name} -- {status} ({r.total_pass}/{r.total_checks})")
            lines.append(f"Latency: {r.latency_ms}ms | Tokens: {r.input_tokens} in / {r.output_tokens} out")

            if show_cost and r.cost_usd is not None:
                rate_str = f"in: ${r.input_rate}/M, out: ${r.output_rate}/M" if r.input_rate else ""
                val_str = f" | Value: {_fmt_cost(r.cost_per_check_passed)}/check" if r.cost_per_check_passed else ""
                lines.append(f"Cost: {_fmt_cost(r.cost_usd)} ({rate_str}){val_str}")
            elif show_cost:
                lines.append("Cost: rate unavailable")

            lines.append("")

            if r.error:
                lines.append(f"**Error:** {r.error}\n")
                continue

            for c in r.checks:
                icon = "PASS" if c.passed else "FAIL"
                sev = f" [{c.severity}]" if not c.passed else ""
                lines.append(f"  {icon} {c.name}{sev}: {c.detail}")

            lines.append("")

    # Recommendations
    failing = [c for c in components if not c.all_critical_pass]
    if failing:
        lines.append("## Recommendations\n")
        for comp in failing:
            failed_checks = []
            for r in comp.results:
                for c in r.checks:
                    if not c.passed and c.severity == "critical":
                        failed_checks.append(f"{r.benchmark_id}/{c.name}")
            lines.append(f"- **{comp.name}** ({comp.model.split('/')[-1]}): Critical failures in {', '.join(failed_checks)}")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Model Audit Benchmark Runner")
    parser.add_argument("--model", type=str, help="Model ID to test")
    parser.add_argument("--provider", type=str, choices=list(PROVIDERS.keys()), help="API provider (auto-detected if omitted)")
    parser.add_argument("--benchmark", type=str, help="Run specific benchmark(s), comma-separated")
    parser.add_argument("--compare", nargs="+", help="Compare multiple models")
    parser.add_argument("--pipeline", nargs="?", const=str(PIPELINE_FILE), metavar="PATH",
        help="Run full pipeline audit using pipeline.json (or custom path)")
    parser.add_argument("--list-benchmarks", action="store_true", help="List available benchmarks")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of formatted report")
    parser.add_argument("--show-output", action="store_true", help="Include raw model output in report")
    parser.add_argument("--monthly-volume", type=int, default=None, metavar="N",
        help="Project monthly cost assuming N runs of each benchmark")
    parser.add_argument("--no-cost", action="store_true", help="Suppress cost analysis in output")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-8s %(message)s",
    )

    # Load env
    env_shared = Path.home() / ".env.shared"
    if env_shared.exists():
        for line in env_shared.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

    if args.list_benchmarks:
        benchmarks = load_benchmarks()
        print(f"\nAvailable benchmarks ({len(benchmarks)}):\n")
        for b in benchmarks:
            print(f"  {b['id']:<20} {b['name']}")
            print(f"  {'':20} {b['description']}")
            print(f"  {'':20} Checks: {len(b.get('checks', []))}\n")
        return

    # Pipeline mode
    if args.pipeline:
        pipeline_path = Path(args.pipeline)
        if not pipeline_path.exists():
            print(f"Pipeline config not found: {pipeline_path}")
            return
        components = load_pipeline(pipeline_path)
        all_benchmark_data = {b["id"]: b for b in load_benchmarks()}

        print(f"\nRunning pipeline audit: {len(components)} components...\n")

        for comp in components:
            for bid in comp.benchmark_ids:
                benchmark = all_benchmark_data.get(bid)
                if not benchmark:
                    print(f"  WARNING: benchmark '{bid}' not found, skipping")
                    continue
                print(f"  [{comp.provider}] {comp.name}: {comp.model} x {bid}...", end=" ", flush=True)
                result = run_benchmark(benchmark, comp.model, comp.provider)
                comp.results.append(result)
                if result.error:
                    print(f"ERROR: {result.error}")
                else:
                    status = "PASS" if result.critical_pass else "FAIL"
                    cost_str = f", {_fmt_cost(result.cost_usd)}" if result.cost_usd is not None else ""
                    print(f"{status} ({result.total_pass}/{result.total_checks}, {result.latency_ms}ms{cost_str})")
                time.sleep(1)

        print("\n" + "=" * 60)
        show_cost = not args.no_cost
        print(format_pipeline_results(components, show_cost=show_cost))
        return

    # Determine models to test
    models = []
    if args.compare:
        models = args.compare
    elif args.model:
        models = [args.model]
    else:
        parser.error("Specify --model, --compare, or --pipeline")

    # Load benchmarks
    benchmark_ids = args.benchmark.split(",") if args.benchmark else None
    benchmarks = load_benchmarks(benchmark_ids)
    if not benchmarks:
        print("No benchmarks found. Use --list-benchmarks to see available ones.")
        return

    print(f"\nRunning {len(benchmarks)} benchmark(s) against {len(models)} model(s)...\n")

    results = []
    for model in models:
        provider = args.provider or detect_provider(model)
        for benchmark in benchmarks:
            print(f"  [{provider}] {model} x {benchmark['id']}...", end=" ", flush=True)
            result = run_benchmark(benchmark, model, provider)
            results.append(result)
            if result.error:
                print(f"ERROR: {result.error}")
            else:
                status = "PASS" if result.critical_pass else "FAIL"
                print(f"{status} ({result.total_pass}/{result.total_checks}, {result.latency_ms}ms)")
            time.sleep(1)  # Rate limit between calls

    print("\n" + "=" * 60)
    show_cost = not args.no_cost
    if args.json:
        print(format_json(results, show_cost=show_cost, monthly_volume=args.monthly_volume))
    else:
        print(format_results(results, show_cost=show_cost, monthly_volume=args.monthly_volume))

    if args.show_output:
        print("\n" + "=" * 60)
        print("## Raw Model Outputs\n")
        for r in results:
            print(f"### {r.model} x {r.benchmark_id}\n")
            print(r.output[:2000])
            if len(r.output) > 2000:
                print(f"\n... ({len(r.output)} chars total, truncated)")
            print()


if __name__ == "__main__":
    main()
