// Tests for log-route.mjs. Run: node --test <skill dir>/scripts/log-route.test.mjs
// Each test points HOME at a temp dir, so the real ~/logs/model-router/routes.jsonl is never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "log-route.mjs");

function sandbox() {
  const home = mkdtempSync(join(tmpdir(), "log-route-test-"));
  const log = join(home, "logs", "model-router", "routes.jsonl");
  const run = (...args) =>
    spawnSync("node", [SCRIPT, ...args], { env: { ...process.env, HOME: home }, encoding: "utf8" });
  const rows = () =>
    existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { home, log, run, rows };
}

const base = ["dispatch", "--tier", "haiku", "--mode", "letter", "--task", "t", "--channel", "subagent"];

test("dispatch with --wanted records the router's pick next to the kept tier", () => {
  const s = sandbox();
  const r = s.run(...base, "--wanted", "sonnet");
  assert.equal(r.status, 0, r.stderr);
  const [row] = s.rows();
  assert.equal(row.tier, "haiku");
  assert.equal(row.wanted, "sonnet");
});

test("--wanted equal to the kept tier is not an override and is not stored", () => {
  const s = sandbox();
  s.run(...base, "--wanted", "haiku");
  assert.equal("wanted" in s.rows()[0], false);
});

test("an unknown --wanted value is refused and nothing is written", () => {
  const s = sandbox();
  const r = s.run(...base, "--wanted", "cheapest");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--wanted must be one of/);
  assert.equal(s.rows().length, 0);
});

test("dispatch without --wanted keeps the legacy row shape", () => {
  const s = sandbox();
  s.run(...base);
  assert.deepEqual(Object.keys(s.rows()[0]).sort(), ["channel", "event", "id", "mode", "task", "tier", "ts"]);
});

test("review-check surfaces in-window overrides; legacy rows without the field still parse", () => {
  const s = sandbox();
  mkdirSync(dirname(s.log), { recursive: true });
  const ts = new Date().toISOString();
  writeFileSync(
    s.log,
    [
      { event: "dispatch", id: "rt-1-aaaa", ts, tier: "sonnet", mode: "auto", task: "legacy" },
      { event: "outcome", id: "rt-1-aaaa", ts, result: "clean" },
    ].map((o) => JSON.stringify(o)).join("\n") + "\n",
  );
  s.run(...base, "--wanted", "opus");

  const text = s.run("review-check");
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /OVERRIDES \(1\)/);
  assert.match(text.stdout, /kept haiku, wanted opus/);

  const json = JSON.parse(s.run("review-check", "--json").stdout);
  assert.equal(json.overrides, 1);
});

test("review-check prints no override line when there are none", () => {
  const s = sandbox();
  s.run(...base);
  assert.doesNotMatch(s.run("review-check").stdout, /OVERRIDES/);
  assert.equal(JSON.parse(s.run("review-check", "--json").stdout).overrides, 0);
});
