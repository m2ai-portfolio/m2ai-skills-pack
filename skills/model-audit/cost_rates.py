"""
Cost Rates -- Per-model token pricing for value analysis.

Prices are USD per million tokens. Override or extend via MODEL_AUDIT_COST_RATES_JSON
environment variable (JSON dict mapping model name -> {"input": float, "output": float}).

Rates verified 2026-04-03 from provider pricing pages.
"""
import json
import os

# Default rates: USD per million tokens
MODEL_RATES: dict[str, dict[str, float]] = {
    # DeepInfra -- nvidia
    "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B": {"input": 0.10, "output": 0.50},
    # DeepInfra -- deepseek
    "deepseek-ai/DeepSeek-V3": {"input": 0.27, "output": 1.10},
    # DeepInfra -- mistral
    "mistralai/Mistral-Small-3.2-24B-Instruct-2506": {"input": 0.07, "output": 0.20},
    # OpenAI
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-4.1-mini": {"input": 0.40, "output": 1.60},
    "gpt-4.1-nano": {"input": 0.05, "output": 0.20},
    # Google Gemini
    "gemini-3.1-pro-preview": {"input": 2.00, "output": 12.00},
    "gemini-3.1-flash-lite-preview": {"input": 0.25, "output": 1.50},
    "gemini-3-flash-preview": {"input": 0.50, "output": 3.00},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    # Anthropic (via DeepInfra)
    "anthropic/claude-4-sonnet": {"input": 3.00, "output": 15.00},
    # Anthropic (direct API -- DISABLED, rates for reference/comparison only)
    "claude-opus-4-20250514": {"input": 15.00, "output": 75.00},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-haiku-4-20250414": {"input": 0.80, "output": 4.00},
    # Anthropic Max plan -- flat $200/mo, no per-token cost.
    # Rates here represent API-equivalent cost for comparison purposes.
    # Use these to evaluate "what would this cost if not on Max?"
    "opus": {"input": 15.00, "output": 75.00},
    "sonnet": {"input": 3.00, "output": 15.00},
    "haiku": {"input": 0.80, "output": 4.00},
    # Local (Ollama on a self-hosted GPU box) -- free
    "qwen2.5:7b-instruct": {"input": 0.00, "output": 0.00},
}


def _load_rates() -> dict[str, dict[str, float]]:
    """Merge user-provided rate overrides from env."""
    rates = dict(MODEL_RATES)
    custom_json = os.environ.get("MODEL_AUDIT_COST_RATES_JSON", "")
    if custom_json:
        try:
            overrides = json.loads(custom_json)
            rates.update(overrides)
        except (json.JSONDecodeError, TypeError):
            pass
    return rates


def get_rate(model: str) -> dict[str, float] | None:
    """Look up per-million-token rates for a model.

    Returns {"input": float, "output": float} or None if model not in rates.
    """
    return _load_rates().get(model)


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float | None:
    """Estimate cost in USD for a single API call.

    Returns estimated cost or None for unknown models.
    """
    rate = get_rate(model)
    if rate is None:
        return None
    return (input_tokens * rate["input"] + output_tokens * rate["output"]) / 1_000_000
