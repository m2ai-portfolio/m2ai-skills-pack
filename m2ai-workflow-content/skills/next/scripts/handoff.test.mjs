// Run: node --test ~/.claude/skills/next/scripts/handoff.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./handoff.mjs", import.meta.url));

function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-test-"));
  const root = path.join(base, "handoffs");
  const home = path.join(base, "home");
  fs.mkdirSync(home);
  const projects = path.join(base, "projects");
  const env = { ...process.env, HANDOFF_ROOT: root, HANDOFF_HOME: home, CLAUDE_PROJECTS_ROOT: projects };
  delete env.CLAUDE_CODE_SESSION_ID;
  const run = (args, cwd = base, script = SCRIPT) =>
    spawnSync("node", [script, ...args], { cwd, env, encoding: "utf8" });
  return { base, root, home, projects, env, run };
}

function draft(dir, body) {
  const f = path.join(dir, `draft-${Math.random().toString(36).slice(2)}.md`);
  fs.writeFileSync(f, body);
  return f;
}

const GOOD = `# Handoff: avatar cutout
Date: 2026-09-27

## Where we are
Cutout rendered.

## What we decided
- Use Creatify Aurora. Why: best lip sync.
- Remove background locally. Why: free.

## Next step
Composite beats 1 to 5.
`;

test("rejects a draft missing a required section", () => {
  const s = sandbox();
  const f = draft(s.base, GOOD.replace("## Next step", "## Later"));
  const r = s.run(["save", "--project", "demo", "--slug", "x", "--file", f]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing required section\(s\): ## Next step/);
});

test("save builds the chain, moves LATEST, logs decisions", () => {
  const s = sandbox();
  const r1 = s.run(["save", "--project", "demo", "--slug", "first", "--file", draft(s.base, GOOD)]);
  assert.equal(r1.status, 0, r1.stderr);
  const first = r1.stdout.trim();
  assert.match(fs.readFileSync(first, "utf8"), /^Supersedes: none \(first handoff\)$/m);

  const second = GOOD.replace("- Remove background locally. Why: free.", "- None");
  const r2 = s.run(["save", "--project", "demo", "--slug", "second", "--file", draft(s.base, second)]);
  assert.equal(r2.status, 0, r2.stderr);
  const p2 = r2.stdout.trim();
  assert.match(fs.readFileSync(p2, "utf8"), new RegExp(`^Supersedes: ${path.basename(first)}$`, "m"));
  assert.equal(fs.readFileSync(path.join(s.root, "demo", "LATEST"), "utf8").trim(), path.basename(p2));
  assert.equal(s.run(["latest", "--project", "demo"]).stdout.trim(), p2);

  const ledger = fs.readFileSync(path.join(s.root, "demo", "DECISIONS.md"), "utf8");
  const lines = ledger.split("\n").filter((l) => l.startsWith("- "));
  // 2 from first handoff, 1 from second ("None" is skipped)
  assert.equal(lines.length, 3);
  assert.match(lines[2], /Use Creatify Aurora.*\[.*second\.md\]/);
});

test("refuses to treat the home folder as a project", () => {
  const s = sandbox();
  const r = s.run(["latest"], s.home);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /home folder, which is not a project/);
});

test("derives project from git toplevel, not the subfolder", () => {
  const s = sandbox();
  const repo = path.join(s.base, "My_Repo");
  fs.mkdirSync(path.join(repo, "src"), { recursive: true });
  execFileSync("git", ["init", "-q", repo]);
  assert.equal(s.run(["project"], path.join(repo, "src")).stdout.trim(), "my-repo");
});

test("works when invoked through a symlinked skill dir (Codex path)", () => {
  const s = sandbox();
  const link = path.join(s.base, "linked-skill");
  fs.symlinkSync(path.dirname(SCRIPT), link);
  const r = s.run(["project", "--project", "via-link"], s.base, path.join(link, "handoff.mjs"));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "via-link");
});

test("refuses a hand-written Supersedes line", () => {
  const s = sandbox();
  const f = draft(s.base, GOOD.replace("Date:", "Supersedes: fake.md\nDate:"));
  const r = s.run(["save", "--project", "demo", "--slug", "x", "--file", f]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /script adds it/);
});

// ---- keyed save (task-runner exports) ------------------------------------
const KEYED = (key, decision = "Keep the pinned base. Why: rework inherits it.") =>
  `# Handoff: runner attempt\nAttempt-Key: ${key}\n\n## Where we are\nDone.\n\n## What we decided\n- ${decision}\n\n## Next step\nReview.\n`;
const ledgerLines = (root, p, name) => fs.readFileSync(path.join(root, p, "DECISIONS.md"), "utf8").split("\n").filter((l) => l.includes(`](${name})`)).length;
const mdFiles = (root, p) => fs.readdirSync(path.join(root, p)).filter((n) => n.endsWith(".md") && n !== "DECISIONS.md");

test("keyed save writes once; a rerun repairs instead of duplicating", () => {
  const s = sandbox();
  const d = draft(s.base, KEYED("a-0001"));
  const first = s.run(["save", "--project", "demo", "--slug", "run-a-0001", "--file", d, "--key", "a-0001"]);
  assert.equal(first.status, 0, first.stderr);
  const again = s.run(["save", "--project", "demo", "--slug", "run-a-0001", "--file", d, "--key", "a-0001"]);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stderr, /already saved/);
  assert.equal(mdFiles(s.root, "demo").length, 1);
  assert.equal(ledgerLines(s.root, "demo", path.basename(first.stdout.trim())), 1);
});

test("keyed save refuses a draft whose Attempt-Key line does not match", () => {
  const s = sandbox();
  const r = s.run(["save", "--project", "demo", "--slug", "run-x", "--file", draft(s.base, KEYED("a-other")), "--key", "a-0001"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /requires the draft to carry the line "Attempt-Key: a-0001"/);
});

// In-process so a crash can be injected between steps; ROOT is read once at import.
const crashRoot = fs.mkdtempSync(path.join(os.tmpdir(), "handoff-crash-"));
process.env.HANDOFF_ROOT = crashRoot;
const { save } = await import(`./handoff.mjs?crash=${Date.now()}`);
const crash = () => { throw new Error("crash"); };

for (const step of ["afterFile", "afterLatest"]) {
  test(`keyed save converges after a crash at ${step}`, () => {
    const p = `crash-${step.toLowerCase()}`;
    const d = draft(crashRoot, KEYED("a-0002"));
    assert.throws(() => save({ project: p, slug: "run-a-0002", file: d, key: "a-0002", hooks: { [step]: crash } }), /crash/);
    const r = save({ project: p, slug: "run-a-0002", file: d, key: "a-0002" });
    assert.equal(r.repaired, true);
    const name = path.basename(r.path);
    assert.deepEqual(mdFiles(crashRoot, p), [name]);
    assert.equal(fs.readFileSync(path.join(crashRoot, p, "LATEST"), "utf8").trim(), name);
    assert.equal(ledgerLines(crashRoot, p, name), 1);
    save({ project: p, slug: "run-a-0002", file: d, key: "a-0002" });
    assert.equal(ledgerLines(crashRoot, p, name), 1);
  });
}

test("a keyed rerun never moves LATEST back past a newer handoff", () => {
  const p = "no-rewind";
  const k = save({ project: p, slug: "run-a-0003", file: draft(crashRoot, KEYED("a-0003")), key: "a-0003", now: new Date("2026-09-30T10:00:00") });
  const newer = save({ project: p, slug: "later-work", file: draft(crashRoot, GOOD), now: new Date("2026-09-30T11:00:00") });
  save({ project: p, slug: "run-a-0003", file: draft(crashRoot, KEYED("a-0003")), key: "a-0003" });
  assert.equal(fs.readFileSync(path.join(crashRoot, p, "LATEST"), "utf8").trim(), path.basename(newer.path));
  assert.equal(ledgerLines(crashRoot, p, path.basename(k.path)), 1);
});

// ---- transcript tail (2026-10-07) ---------------------------------------------
// Real case: the auto-handoff drafted 2026-10-07-1606-t4-handoff-rework-running.md at
// 16:06:04 CDT; the user's "go with the headless judge, cap at 3 rounds" (16:06:20) and the
// "Locked in" reply (16:06:34) came after the draft and never reached the handoff.
// The fixture is the transcript's last 27 rows, tool and thinking content trimmed. It is
// JSONL named .txt so a config-repo export (which skips *.jsonl) keeps it. It holds a
// private session, so the published copy of this file ships without it and these tests skip.
const FIX = fileURLToPath(new URL("./fixtures/2026-10-07-tail/", import.meta.url));
const NO_FIX = fs.existsSync(FIX) ? false : "private transcript fixture not shipped";
const SESSION = "9d1f5fdd-f27e-4233-9fc2-001520770483";
const REAL = "2026-10-07-1606-t4-handoff-rework-running.md";
const REAL_MD = NO_FIX ? "" : fs.readFileSync(path.join(FIX, REAL), "utf8");
const ROWS_FILE = path.join(FIX, "transcript-rows.jsonl.txt");
const ROWS = NO_FIX ? [] : fs.readFileSync(ROWS_FILE, "utf8").split("\n").filter(Boolean);
// The draft moment: the turn's closing stop-hook row, after which turn.complete forked.
const AT_DRAFT = ROWS.slice(0, ROWS.findIndex((l) => l.includes('"d9de7df3-45ea-438d-b312-8c05f2c5e6f2"')) + 1);

function tailBox(rows = ROWS) {
  const s = sandbox();
  const dir = path.join(s.projects, "-home-user");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${SESSION}.jsonl`), `${rows.join("\n")}\n`);
  // The handoff keeps its real name: the handoff-notice tag matches on it.
  const handoff = (md) => {
    const d = fs.mkdtempSync(path.join(s.base, "h-"));
    fs.writeFileSync(path.join(d, REAL), md);
    return path.join(d, REAL);
  };
  const tail = (md) => s.run(["tail", handoff(md)]);
  return { ...s, handoff, tail };
}
const stamped = (cutoff) => REAL_MD.replace(/^(Harness:.*)$/m, `$1\nTranscript-Cutoff: ${cutoff}`);
// Each tail item's header: "[n] <iso> <role> <uuid> [tags]".
const items = (out) => out.split("\n").filter((l) => /^\[\d+\] /.test(l)).map((l) => l.split(" ").slice(2).join(" "));

test("cutoff --fork stops before the reply a fork never saw; plain cutoff is the last entry", { skip: NO_FIX }, () => {
  const t = tailBox(AT_DRAFT);
  const fork = t.run(["cutoff", "--session", SESSION, "--cwd", "/home/user", "--fork"]);
  assert.equal(fork.status, 0, fork.stderr);
  assert.equal(fork.stdout.trim(), "5d6fe2e0-4e96-4002-b681-c1aec6d962a7 2026-10-07T21:06:01.903Z");
  const plain = t.run(["cutoff", "--session", SESSION, "--cwd", "/home/user"]);
  assert.equal(plain.stdout.trim(), "965ec35a-2d09-4032-8682-f52011814c0d 2026-10-07T21:06:04.507Z");
});

test("real case: the stamped handoff's tail holds the decision and the Locked-in reply", { skip: NO_FIX }, () => {
  const t = tailBox();
  const r = t.tail(stamped("5d6fe2e0-4e96-4002-b681-c1aec6d962a7 2026-10-07T21:06:01.903Z"));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^cutoff: 5d6fe2e0-\S+ 2026-10-07T21:06:01\.903Z \(Transcript-Cutoff\)$/m);
  assert.doesNotMatch(r.stdout, /WARNING/);
  assert.deepEqual(items(r.stdout), [
    "assistant 965ec35a-2d09-4032-8682-f52011814c0d",
    "user ad9ed588-9031-464e-812d-f4c7cfc95571",
    "assistant 6f76c886-cc4b-49f6-a82e-6b3fa09916e1",
    "assistant a07aecb8-24e0-4a9e-b022-0a1be07ae885 [handoff-notice]",
  ]);
  assert.match(r.stdout, /^    go with the headless judge, cap at 3 rounds$/m);
  assert.match(r.stdout, /^    - \*\*Round cap:\*\* 3 per task\.$/m);
  // The handoff itself left both open: this is what the resume side must mark MISSING.
  assert.match(REAL_MD, /\(1\) who rules on Codex findings.*\(3\) round cap of 3 or 4/);
  assert.match(r.stdout, /^tail: 4 message\(s\) after the cutoff, 1 tagged handoff-notice\./m);
});

test("legacy handoff: no Transcript-Cutoff falls back to the Date minute, with a warning", { skip: NO_FIX }, () => {
  const t = tailBox();
  const r = t.tail(REAL_MD);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^WARNING: no Transcript-Cutoff line .*"2026-10-07 16:06 CDT", from 2026-10-07T21:06:00\.000Z\. minute precision/m);
  assert.deepEqual(items(r.stdout).map((i) => i.split(" ")[1].slice(0, 8)), ["965ec35a", "ad9ed588", "6f76c886", "a07aecb8"]);
});

test("an empty tail prints tail clean", { skip: NO_FIX }, () => {
  const t = tailBox();
  const r = t.tail(stamped("a07aecb8-24e0-4a9e-b022-0a1be07ae885 2026-10-07T21:06:42.918Z"));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^tail clean \(0 messages after the cutoff\)$/m);
  assert.deepEqual(items(r.stdout), []);
});

test("a missing transcript, a non-Claude harness, or no session is UNCHECKED, never silent", { skip: NO_FIX }, () => {
  const t = tailBox();
  const gone = t.tail(stamped("x").replaceAll(SESSION, "00000000-0000-4000-8000-000000000000"));
  assert.equal(gone.status, 0, gone.stderr);
  assert.match(gone.stdout, /^tail: UNCHECKED \(no transcript for session 00000000-0000-4000-8000-000000000000 under /m);
  const codex = t.tail(REAL_MD.replace(/^Harness:.*$/m, "Harness: Codex, gpt-6.1-sol. Session: unknown"));
  assert.equal(codex.stdout.trim(), "tail: UNCHECKED (harness Codex)");
  const none = t.tail(REAL_MD.replace(/^Harness:.*$/m, "Harness: Claude Code, model x. Session: unknown"));
  assert.equal(none.stdout.trim(), "tail: UNCHECKED (no Session id on the Harness line)");
});

test("a task-runner export is UNCHECKED as a sandboxed worker, named or inferred from Attempt-Id", () => {
  const t = tailBox();
  const legacy = t.tail("# Handoff: x\nAttempt-Key: a-1\nAttempt-Id: p:t:o:1:a1\n\n## Where we are\nx\n");
  assert.equal(legacy.stdout.trim(), "tail: UNCHECKED (harness sandboxed worker: its sandbox transcript is discarded)");
  const named = t.tail("# Handoff: x\nHarness: sandboxed worker, headless claude -p in a bwrap sandbox. Session: none\n");
  assert.equal(named.stdout.trim(), legacy.stdout.trim());
});

test("a cutoff uuid missing from the transcript falls back to its timestamp, with a warning", { skip: NO_FIX }, () => {
  const t = tailBox();
  const r = t.tail(stamped("11111111-1111-4111-8111-111111111111 2026-10-07T21:06:30.000Z"));
  assert.match(r.stdout, /^WARNING: cutoff entry 11111111-\S+ is not in the transcript/m);
  assert.deepEqual(items(r.stdout).map((i) => i.split(" ")[1].slice(0, 8)), ["6f76c886", "a07aecb8"]);
});

test("the tail stops at a /clear: past it is the next conversation", { skip: NO_FIX }, () => {
  const clear = JSON.stringify({ type: "user", uuid: "22222222-2222-4222-8222-222222222222", timestamp: "2026-10-07T21:08:00.000Z", sessionId: SESSION, message: { role: "user", content: "<command-name>/clear</command-name>" } });
  const after = JSON.stringify({ type: "user", uuid: "33333333-3333-4333-8333-333333333333", timestamp: "2026-10-07T21:08:05.000Z", sessionId: SESSION, origin: { kind: "human" }, message: { role: "user", content: "fresh start" } });
  const t = tailBox([...ROWS, clear, after]);
  const r = t.tail(stamped("6f76c886-cc4b-49f6-a82e-6b3fa09916e1 2026-10-07T21:06:34.429Z"));
  assert.match(r.stdout, /^note: stopped at \/clear/m);
  assert.deepEqual(items(r.stdout).map((i) => i.split(" ")[1].slice(0, 8)), ["a07aecb8"]);
});

test("save stamps a Claude Code draft from its own transcript, and fills an unknown Session", { skip: NO_FIX }, () => {
  const t = tailBox();
  const body = GOOD.replace("Date: 2026-09-27", "Date: 2026-09-27\nWorking directory: /home/user\nHarness: Claude Code, model claude-opus-5-5. Session: unknown");
  const r = spawnSync("node", [SCRIPT, "save", "--project", "demo", "--slug", "stamp", "--file", draft(t.base, body)], {
    cwd: t.base, env: { ...t.env, CLAUDE_CODE_SESSION_ID: SESSION }, encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  const md = fs.readFileSync(r.stdout.trim(), "utf8");
  // The newest entry when save ran: everything /next's drafting model had seen.
  assert.match(md, /^Harness: Claude Code, model claude-opus-5-5\. Session: 9d1f5fdd-f27e-4233-9fc2-001520770483\nTranscript-Cutoff: a07aecb8-24e0-4a9e-b022-0a1be07ae885 2026-10-07T21:06:42\.918Z$/m);
});

test("save leaves non-Claude drafts unstamped, honours --cutoff, and refuses a malformed one", () => {
  const t = tailBox();
  const codex = t.run(["save", "--project", "demo", "--slug", "codex", "--file", draft(t.base, GOOD.replace("Date: 2026-09-27", "Date: 2026-09-27\nHarness: Codex. Session: unknown"))]);
  assert.equal(codex.status, 0, codex.stderr);
  assert.doesNotMatch(fs.readFileSync(codex.stdout.trim(), "utf8"), /Transcript-Cutoff/);
  const given = t.run(["save", "--project", "demo", "--slug", "given", "--cutoff", "965ec35a-2d09-4032-8682-f52011814c0d 2026-10-07T21:06:04.507Z", "--file", draft(t.base, GOOD)]);
  assert.match(fs.readFileSync(given.stdout.trim(), "utf8"), /^# Handoff: avatar cutout\nSupersedes: .*\nTranscript-Cutoff: 965ec35a-\S+ 2026-10-07T21:06:04\.507Z$/m);
  const none = t.run(["save", "--project", "demo", "--slug", "none", "--cutoff", "none", "--file", draft(t.base, GOOD)]);
  assert.match(fs.readFileSync(none.stdout.trim(), "utf8"), /^Transcript-Cutoff: none \(the writer could not read the transcript\)$/m);
  const bad = t.run(["save", "--project", "demo", "--slug", "bad", "--cutoff", "yesterday", "--file", draft(t.base, GOOD)]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /--cutoff must be/);
});

test("decide appends one cited tail decision, and only for a handoff in the project", () => {
  const s = sandbox();
  const saved = s.run(["save", "--project", "demo", "--slug", "first", "--file", draft(s.base, GOOD)]).stdout.trim();
  const name = path.basename(saved);
  const r = s.run(["decide", "--project", "demo", "--handoff", saved, "--text", "Headless Claude judge rules on Codex findings, cap 3 rounds. Why: the user, after the draft."]);
  assert.equal(r.status, 0, r.stderr);
  const last = fs.readFileSync(path.join(s.root, "demo", "DECISIONS.md"), "utf8").trimEnd().split("\n").at(-1);
  assert.equal(last, `- ${name.slice(0, 10)} · Headless Claude judge rules on Codex findings, cap 3 rounds. Why: the user, after the draft. · [${name}](${name}) (said after this handoff was drafted)`);
  assert.equal(s.run(["decide", "--project", "demo", "--handoff", "nope.md", "--text", "x"]).status, 1);
});

// ---- claims (2026-10-08) -------------------------------------------------------
// A resuming session runs a handoff's "Claims to verify". Worker exports land in ~/handoffs, so every
// command is sorted first: RUN only when each program in it reads, else ASK with a reason.
import { commandRisk, originOf } from "./handoff.mjs";

test("read-only claim commands, including the real ones in past handoffs, are RUN", () => {
  for (const cmd of [
    "git -C ~/.claude/mods ls-remote origin main",
    "jq -r '.env.CLAUDE_CODE_PLUGIN_DIRS' ~/.claude/settings.json",
    "jq '.permissions.allow|length' ~/.claude/settings.json",
    "git -C ~/projects/dotfiles log -1 --format='%h %ci' -- skills/prime",
    "git diff --quiet dac9c29 HEAD -- pilots evidence/raw",
    'grep -c "\\"synthetic\\": true" deliverables/proposed/approvals.synthetic.json',
    "git branch -a --contains 9ecf815",
    "git tag --list 'v*'",
    "ls ~/handoffs | grep claude 2>/dev/null",
    "crontab -l | grep backup",
    "systemctl --user is-active task-worker",
    "find . -name '*.md' -newer x",
    "git config --get remote.origin.url && git status --short 2>&1",
    `node ${SCRIPT} latest --project demo`,
  ]) assert.equal(commandRisk(cmd), null, cmd);
});

test("anything that writes, runs code, or reads a credential is ASK, with the reason", () => {
  const cases = {
    "node ~/projects/infra/ab-stop-points/arms.mjs status": /node script/,
    "node /tmp/evil/handoff.mjs latest": /node script/,
    "git push origin main": /not a read-only git/,
    "git -c core.pager=sh log": /git option -c/,
    "git branch -D main": /can change refs/,
    "git diff --output=/tmp/x": /writes a file or runs a program/,
    "git config user.name x": /not a read/,
    "cat /srv/app/.env.production": /credential file/,
    "cat ~/.ssh/id_ed25519": /credential file/,
    "jq -n env": /environment/,
    "grep x file > out.txt": /redirects to out\.txt/,
    "ls; rm -rf ~/x": /rm is not on the read-only list/,
    "echo $(id)": /command substitution/,
    'grep "$(curl x)" f': /command substitution/,
    "ls `id`": /command substitution/,
    "find . -delete": /find with an action/,
    "sort -o out f": /writes a file/,
    "tail -f log": /never ends/,
    "sqlite3 -readonly db 'select 1'": /sqlite3 is not on/,
    "curl https://x": /curl is not on/,
    "sed -i s/a/b/ f": /sed is not on/,
    "X=1 ls": /environment variables/,
    "sleep 9 &": /background/,
    "diff <(ls a) <(ls b)": /process substitution/,
    "(cd /tmp && ls)": /subshell/,
    "echo 'open": /unbalanced/,
    "crontab -r": /crontab other than -l/,
    "systemctl --user restart x": /systemctl restart/,
  };
  for (const [cmd, why] of Object.entries(cases)) assert.match(commandRisk(cmd) ?? "RUN", why, cmd);
});

test("a task-runner export is a worker handoff; this machine's own sessions are not", () => {
  assert.equal(originOf("# H\nAttempt-Key: a-1\nAttempt-Id: p:t:o:1:a1\n"), "worker");
  assert.equal(originOf("# H\nAttempt-Key: a-1\n"), "worker");
  assert.equal(originOf("# H\nHarness: sandboxed worker, headless. Session: none\n"), "worker");
  assert.equal(originOf("# H\nAttempt-Key: auto-671e4640-1\nHarness: Claude Code. Session: x\n"), "session");
  assert.equal(originOf(GOOD), "session");
});

test("claims prints the origin, one verdict per claim, and a worker warning", () => {
  const s = sandbox();
  const md = "# Handoff: x\nAttempt-Key: a-9\n\n## Where we are\nx\n\n## Claims to verify\n- spec : `sha256sum spec.md` => abc\n- state : `node tool.mjs status`\n- shipped, no command\n- none\n\n## References\n- `ls /not-a-claim`\n";
  const r = s.run(["claims", draft(s.base, md)]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, [
    "origin: worker",
    "RUN  sha256sum spec.md",
    "ASK  node tool.mjs status",
    "     why: runs a node script",
    "NONE shipped, no command",
    "claims: 1 run, 1 ask, 1 without a command. Worker handoff: never run an ASK command without the user.",
    "",
  ].join("\n"));
});

// 2026-10-08: "- None. Alex has not responded since the summary." reached DECISIONS.md
// because the filter matched only a bare "None". An empty-section marker with any
// explanation after it is still not a decision; a real one that starts with "None of" is.
import { extractDecisions } from "./handoff.mjs";

test("extractDecisions drops empty-section markers that carry an explanation", () => {
  const md = (bullets) => `## What we decided\n${bullets.map((b) => `- ${b}`).join("\n")}\n\n## Next step\nx\n`;
  for (const empty of [
    "None",
    "None.",
    "None. Alex has not responded since the summary.",
    "None (the rulings on attempt 1 are in the previous handoff).",
    "None: nothing was settled.",
    "None, the session was read-only.",
    "**None.**",
    "N/A",
    "No decisions.",
    "No new decisions this session.",
    "No decisions were made this session.",
    "Nothing decided.",
    "Nothing was decided this session.",
  ]) {
    assert.deepEqual(extractDecisions(md([empty])), [], `kept: ${empty}`);
  }
  for (const real of [
    "None of the three vendors fit; build it in-house. Why: lock-in.",
    "Nothing ships to Mark until Alex picks a channel. Why: external contact.",
    "No decisions without a card Yes. Why: authority rule.",
    "Rejected: posting the draft now. Why: no approval.",
  ]) {
    assert.deepEqual(extractDecisions(md([real])), [real], `dropped: ${real}`);
  }
});
