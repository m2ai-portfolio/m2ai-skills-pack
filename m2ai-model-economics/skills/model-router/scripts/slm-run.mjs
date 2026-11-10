#!/usr/bin/env node
// L-tier dispatch: run a leaf task on a local LLM behind any OpenAI-compatible
// server (llama-server, vLLM, Ollama's /v1 endpoint, LM Studio).
// No agency, no tools - pure text-in/text-out. Fails loud so the router can
// escalate to Haiku instead of dying silently.
//
// API contract (verified against llama-server --jinja):
//   - OpenAI /v1/chat/completions; content in choices[0].message.content
//   - thinking disabled per-request via chat_template_kwargs.enable_thinking=false
//     (for thinking models; without this, small max_tokens => empty content; servers
//     that do not know the field ignore it)
//   - JSON modes use response_format json_schema ONLY. json_object returns
//     markdown-fenced JSON and must not be used.
//
// Usage:
//   LLM_BASE_URL=http://<your-host>:8080 LLM_MODEL=<model-id> \
//   node slm-run.mjs --prompt "..." [--system "..."] [--model <model-id>] [--json] [--schema '<json-schema>'] [--timeout <ms>]
//   echo "..." | node slm-run.mjs [--system "..."]
//
// Exit codes: 0 ok · 2 host unreachable · 3 bad/empty response · 4 schema validation failed

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name) => args.includes(`--${name}`);

// LLM_BASE_URL is required: there is no safe default host. A missing setting exits 2
// (same as an unreachable host) so the router escalates instead of guessing.
const BASE = (process.env.LLM_BASE_URL || "").replace(/\/+$/, "");
const model = opt("model") || process.env.LLM_MODEL;
if (!BASE) {
  console.error("slm-run: SLM host unreachable (LLM_BASE_URL is not set). Escalate this call to Haiku.");
  process.exit(2);
}
if (!model) {
  console.error("slm-run: no model given (pass --model or set LLM_MODEL)");
  process.exit(3);
}
const system = opt("system");
const schemaArg = opt("schema");
let prompt = opt("prompt");
if (!prompt) prompt = readFileSync(0, "utf8").trim();
if (!prompt) {
  console.error("slm-run: no prompt given (use --prompt or stdin)");
  process.exit(3);
}

const body = {
  model,
  stream: false,
  messages: [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ],
  chat_template_kwargs: { enable_thinking: false },
};
if (schemaArg)
  body.response_format = {
    type: "json_schema",
    json_schema: { name: "output", schema: JSON.parse(schemaArg) },
  };
else if (flag("json"))
  body.response_format = {
    type: "json_schema",
    json_schema: { name: "freeform", schema: { type: "object" } },
  };

let res;
try {
  res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(opt("timeout") || 120000)),
  });
} catch (e) {
  console.error(`slm-run: SLM host unreachable at ${BASE} (${e.message}). Escalate this call to Haiku.`);
  process.exit(2);
}
if (!res.ok) {
  console.error(`slm-run: llama-server HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(3);
}

const data = await res.json();
const content = data?.choices?.[0]?.message?.content?.trim();
if (!content) {
  console.error("slm-run: empty response from model");
  process.exit(3);
}

if (schemaArg || flag("json")) {
  try {
    JSON.parse(content);
  } catch {
    console.error(`slm-run: response is not valid JSON. Escalate to Haiku. Raw:\n${content.slice(0, 500)}`);
    process.exit(4);
  }
}

console.log(content);
