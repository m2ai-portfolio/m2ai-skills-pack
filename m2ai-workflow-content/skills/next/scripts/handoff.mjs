#!/usr/bin/env node
// Deterministic half of the /next skill and its resume side. The model writes the prose;
// this script owns filenames, the Supersedes chain, LATEST, and DECISIONS.md so
// no harness (Claude, Codex, local model) can get the bookkeeping wrong.
//
//   handoff.mjs project [--project P]          print resolved project slug
//   handoff.mjs latest  [--project P]          print absolute path of latest handoff
//   handoff.mjs history [--project P]          print absolute path of DECISIONS.md
//   handoff.mjs list                           every project and its latest handoff
//   handoff.mjs save --slug S --file F [--project P] [--key K] [--cutoff "<uuid> <iso>"|none]
//                                              validate draft F, store it, move LATEST
//                                              --key: idempotent keyed save (task-runner exports);
//                                              a rerun repairs instead of writing twice
//                                              --cutoff: the Transcript-Cutoff to stamp; absent,
//                                              a Claude Code draft is stamped from its transcript now
//   handoff.mjs cutoff --session S [--cwd D] [--fork]
//                                              print "<uuid> <iso>" of the transcript's last entry
//                                              --fork: the last entry a $.model.fork replays
//   handoff.mjs tail <handoff-file>            print every user/assistant message the session's
//                                              transcript holds after the handoff's cutoff
//   handoff.mjs claims <handoff-file>          sort each "Claims to verify" command: RUN (only
//                                              reads) or ASK (needs a look first), and say
//                                              whether a session or a worker wrote the handoff
//   handoff.mjs decide --handoff F --text T [--project P]
//                                              append one tail decision to DECISIONS.md
//
// Root is ~/handoffs, overridable with HANDOFF_ROOT (tests). Transcripts are read from
// ~/.claude/projects, overridable with CLAUDE_PROJECTS_ROOT (tests).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = process.env.HANDOFF_ROOT || path.join(os.homedir(), "handoffs");
const REQUIRED = ["## Where we are", "## What we decided", "## Next step"];
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PROJECTS = process.env.CLAUDE_PROJECTS_ROOT || path.join(os.homedir(), ".claude", "projects");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUTOFF_RE = /^Transcript-Cutoff:[ \t]*(.*?)\s*$/m;

function die(msg) {
  process.stderr.write(`handoff: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fork") out.fork = "true";
    else if (a.startsWith("--")) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) die(`missing value for ${a}`);
      out[a.slice(2)] = v;
      i++;
    } else out._.push(a);
  }
  return out;
}

export function resolveProject(explicit, cwd = process.cwd()) {
  if (explicit) {
    if (!SLUG_RE.test(explicit)) die(`project "${explicit}" must be kebab-case`);
    return explicit;
  }
  let dir = cwd;
  try {
    dir = execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // not a git repo: fall back to cwd
  }
  const home = process.env.HANDOFF_HOME || os.homedir();
  if (path.resolve(dir) === path.resolve(home) || dir === "/") {
    die(
      "working directory is the home folder, which is not a project. " +
        "Pass --project <kebab-name> (run `list` to see existing projects).",
    );
  }
  const slug = path
    .basename(dir)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!SLUG_RE.test(slug)) die(`could not derive a project slug from ${dir}; pass --project`);
  return slug;
}

function projectDir(p) {
  return path.join(ROOT, p);
}

export function latestPath(p) {
  const pointer = path.join(projectDir(p), "LATEST");
  if (!fs.existsSync(pointer)) return null;
  const name = fs.readFileSync(pointer, "utf8").trim();
  const full = path.join(projectDir(p), name);
  if (!name || !fs.existsSync(full)) die(`LATEST in ${p} points at missing file "${name}"`);
  return full;
}

function stamp(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`;
}

export function extractDecisions(md) {
  const m = md.match(/^## What we decided\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.match(/^\s*[-*]\s+(.*\S)\s*$/))
    .filter(Boolean)
    .map((x) => x[1])
    .filter((t) => !EMPTY_DECISION.test(t));
}

// "- None" marks an empty section, and drafts add an explanation after it ("None. Alex
// has not responded", "None (the rulings are in the previous handoff)"). The marker must
// end the bullet or meet punctuation, so a real decision such as "None of the vendors fit"
// still reaches the ledger.
const EMPTY_DECISION =
  /^[*_]*(?:none|n\/a|nothing(?: (?:new|was))? decided|no(?: new)? decisions?(?: (?:were|was) made)?)(?: this session)?[*_]*\s*(?:$|[.;:,(\u2014-])/i;

const attemptKeyOf = (md) => md.match(/^Attempt-Key:\s*(\S+)\s*$/m)?.[1] ?? null;

// Keyed save (task-runner exports): the file carrying `Attempt-Key: K` is written once. A rerun
// after a crash between steps skips the write, moves LATEST only if it points at an
// older handoff, and appends ledger lines only if DECISIONS.md does not cite the file.
// Order stays file, LATEST, ledger; `hooks` lets tests crash between steps.
export function save({ project, slug, file, key, cutoff: given, now = new Date(), hooks = {}, env = process.env }) {
  if (!slug || !SLUG_RE.test(slug)) die("--slug must be kebab-case, e.g. avatar-cutout");
  if (!file || !fs.existsSync(file)) die(`draft file not found: ${file}`);
  let md = fs.readFileSync(file, "utf8");
  const missing = REQUIRED.filter((h) => !new RegExp(`^${h}\\s*$`, "m").test(md));
  if (missing.length) die(`draft is missing required section(s): ${missing.join(", ")}`);
  if (/^Supersedes:/m.test(md)) die("do not write a Supersedes: line; the script adds it");
  if (key !== undefined && (!/^\S+$/.test(key) || attemptKeyOf(md) !== key)) die(`--key ${key} requires the draft to carry the line "Attempt-Key: ${key}"`);

  const dir = projectDir(project);
  fs.mkdirSync(dir, { recursive: true });
  const existing = key === undefined ? null : fs.readdirSync(dir).filter((n) => n.endsWith(".md") && n !== "DECISIONS.md")
    .find((n) => attemptKeyOf(fs.readFileSync(path.join(dir, n), "utf8")) === key);
  const prev = latestPath(project);
  let name, full;
  if (existing) {
    name = existing; full = path.join(dir, name); md = fs.readFileSync(full, "utf8");
  } else {
    name = `${stamp(now)}-${slug}.md`;
    full = path.join(dir, name);
    if (fs.existsSync(full)) die(`${name} already exists; handoffs are immutable, use a new slug`);
    md = stampCutoff(md, given, env);
    // Insert the chain link after the H1 title line.
    const link = `Supersedes: ${prev ? path.basename(prev) : "none (first handoff)"}`;
    md = /^# .*$/m.test(md) ? md.replace(/^(# .*)$/m, `$1\n${link}`) : `${link}\n\n${md}`;
    fs.writeFileSync(full, md, { flag: "wx" });
  }
  hooks.afterFile?.();

  // Timestamped names sort by age, so "older" is a plain string compare.
  if (!existing || !prev || path.basename(prev) < name) {
    const tmp = path.join(dir, `.LATEST.${process.pid}`);
    fs.writeFileSync(tmp, `${name}\n`);
    fs.renameSync(tmp, path.join(dir, "LATEST"));
  }
  hooks.afterLatest?.();

  const decisions = extractDecisions(md);
  const ledger = path.join(dir, "DECISIONS.md");
  if (!fs.existsSync(ledger)) {
    fs.writeFileSync(ledger, `# Decisions: ${project}\n\nAppend-only. One line per decision, newest last.\n\n`);
  }
  const cited = existing && fs.readFileSync(ledger, "utf8").includes(`](${name})`);
  if (decisions.length && !cited) {
    const day = name.slice(0, 10);
    fs.appendFileSync(ledger, decisions.map((d) => `- ${day} · ${d} · [${name}](${name})\n`).join(""));
  }
  return { path: full, decisions: cited ? 0 : decisions.length, supersedes: prev ? path.basename(prev) : null, repaired: Boolean(existing) };
}

// --- Transcript tail -------------------------------------------------------------
// A handoff is a checkpoint, like a log backup: the session can keep talking after
// the draft was taken (2026-10-07: a decision 16 s after the auto-handoff's draft never
// reached the handoff). Every handoff carries `Transcript-Cutoff: <uuid> <iso>`, the
// last transcript entry its draft saw, and `tail` reads what came after it.

const headerOf = (md, name) => md.match(new RegExp(`^${name}:[ \\t]*(.*?)\\s*$`, "m"))?.[1] ?? null;
const harnessOf = (md) => headerOf(md, "Harness");
const isClaudeCode = (harness) => /claude code/i.test(harness ?? "");
const sessionOf = (md) => md.match(/Session:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i)?.[1] ?? null;

// Claude Code stores a session as ~/.claude/projects/<cwd, non-alphanumerics as "-">/<id>.jsonl.
// The id is unique, so a session whose folder moved (a worktree, /cd) is found by scanning.
export function transcriptPath(session, cwd) {
  if (!session || !UUID_RE.test(session)) return null;
  if (cwd) {
    const p = path.join(PROJECTS, cwd.replace(/[^a-zA-Z0-9]/g, "-"), `${session}.jsonl`);
    if (fs.existsSync(p)) return p;
  }
  if (!fs.existsSync(PROJECTS)) return null;
  for (const d of fs.readdirSync(PROJECTS)) {
    const p = path.join(PROJECTS, d, `${session}.jsonl`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readRows(file) {
  return fs.readFileSync(file, "utf8").split("\n").flatMap((l) => {
    if (!l.trim()) return [];
    try {
      return [JSON.parse(l)];
    } catch {
      return []; // a line still being written
    }
  });
}

// A main-thread conversation entry: what the model was sent or said. Queue, attachment,
// system and bookkeeping rows are not; a subagent's rows are not.
const isEntry = (r) => (r.type === "user" || r.type === "assistant") && r.uuid && r.timestamp && !r.isSidechain;

function textOf(r) {
  const c = r.message?.content;
  if (typeof c === "string") return c.trim();
  if (!Array.isArray(c)) return "";
  return c.filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n").trim();
}

// fork: the cutoff as $.model.fork sees it. A fork replays the main thread's last API
// request, which ends before that request's own reply, so the reply rows (one requestId)
// are left out. If the fork did see them, the resume side marks them CAPTURED: the error runs
// toward a longer tail, never toward a silently lost message.
export function cutoffOf(rows, { fork = false } = {}) {
  const entries = rows.filter(isEntry);
  let end = entries.length;
  if (fork) {
    const reply = entries.findLast((r) => r.type === "assistant")?.requestId;
    if (reply) end = entries.findIndex((r) => r.requestId === reply);
  }
  const e = entries[end - 1];
  return e ? `${e.uuid} ${e.timestamp}` : null;
}

// A writer that could not read the transcript passes "none": the stamp says so, and
// tail falls back to the Date line instead of trusting a guess.
function stampCutoff(md, given, env) {
  let value = given;
  if (value === undefined) {
    if (CUTOFF_RE.test(md) || !isClaudeCode(harnessOf(md))) return md;
    // /next runs save in the session it hands off: the transcript as it stands now is
    // everything the drafting model saw, up to and including this save call.
    const session = sessionOf(md) ?? (UUID_RE.test(env.CLAUDE_CODE_SESSION_ID ?? "") ? env.CLAUDE_CODE_SESSION_ID : null);
    const file = transcriptPath(session, headerOf(md, "Working directory"));
    if (!file) {
      process.stderr.write(`handoff: no transcript for session ${session ?? "unknown"}; stamped Transcript-Cutoff: none\n`);
      value = "none";
    } else {
      value = cutoffOf(readRows(file)) ?? "none";
      if (!sessionOf(md)) md = md.replace(/^(Harness:.*?Session:)[ \t]*\S*/m, `$1 ${session}`);
    }
  }
  if (value !== "none") {
    const [uuid, iso, extra] = value.trim().split(/\s+/);
    if (!UUID_RE.test(uuid ?? "") || Number.isNaN(Date.parse(iso ?? "")) || extra) die(`--cutoff must be "<uuid> <iso timestamp>" or none, got "${value}"`);
    value = `${uuid} ${iso}`;
  } else value = "none (the writer could not read the transcript)";
  const line = `Transcript-Cutoff: ${value}`;
  if (CUTOFF_RE.test(md)) return md.replace(CUTOFF_RE, line);
  if (/^Harness:.*$/m.test(md)) return md.replace(/^(Harness:.*)$/m, `$1\n${line}`);
  return /^# .*$/m.test(md) ? md.replace(/^(# .*)$/m, `$1\n${line}`) : `${line}\n${md}`;
}

// US zone abbreviations `date` prints here, in minutes east of UTC.
const ZONES = { UTC: 0, GMT: 0, Z: 0, EST: -300, EDT: -240, CST: -360, CDT: -300, MST: -420, MDT: -360, PST: -480, PDT: -420 };

// "2026-10-07 16:06 CDT" -> the start of that minute, in ms. Legacy handoffs only.
export function parseDateLine(s) {
  const m = s?.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?(?:\s*([A-Za-z]{1,5}|[+-]\d{2}:?\d{2}))?/);
  if (!m) return null;
  const [, Y, M, D, h, mi, zone] = m;
  let offset = null;
  if (zone && /^[+-]/.test(zone)) {
    const d = zone.slice(1).replace(":", "");
    offset = (zone[0] === "-" ? -1 : 1) * (Number(d.slice(0, 2)) * 60 + Number(d.slice(2)));
  } else if (zone && zone.toUpperCase() in ZONES) offset = ZONES[zone.toUpperCase()];
  const fields = [Number(Y), Number(M) - 1, Number(D), Number(h ?? 0), Number(mi ?? 0)];
  const ms = offset === null ? new Date(...fields).getTime() : Date.UTC(...fields) - offset * 60_000;
  return { ms, precision: h === undefined ? "day" : "minute", zone: offset === null ? null : zone };
}

const TAIL_TEXT_MAX = 4000;

// Returns { status: "clean" | "items" | "unchecked", lines }. Never silent: every outcome
// prints a "tail ..." line, so the resume report shows the check ran.
export function tail(file) {
  if (!file || !fs.existsSync(file)) die(`handoff file not found: ${file}`);
  const md = fs.readFileSync(file, "utf8");
  const name = path.basename(file);
  const unchecked = (why) => ({ status: "unchecked", lines: [`tail: UNCHECKED (${why})`] });
  // task-runner exports written before they carried a Harness line still carry Attempt-Id.
  const harness = harnessOf(md) ?? (headerOf(md, "Attempt-Id") ? "sandboxed worker" : null);
  const harnessName = harness ? harness.split(/[,.]/)[0].trim() : "unknown";
  // A sandboxed worker's transcript lived on its sandbox's tmpfs and is gone; its handoff is
  // the committed work, which the runner's review already checked.
  if (harnessName === "sandboxed worker") return unchecked("harness sandboxed worker: its sandbox transcript is discarded");
  if (!isClaudeCode(harness)) return unchecked(`harness ${harnessName}`);
  const session = sessionOf(md);
  if (!session) return unchecked("no Session id on the Harness line");
  const transcript = transcriptPath(session, headerOf(md, "Working directory"));
  if (!transcript) return unchecked(`no transcript for session ${session} under ${PROJECTS}`);

  const rows = readRows(transcript);
  const lines = [`tail: ${name}`, `transcript: ${transcript}`];
  const stamp = headerOf(md, "Transcript-Cutoff");
  const [uuid, iso] = (stamp ?? "").split(/\s+/);
  let after;
  if (UUID_RE.test(uuid ?? "") && !Number.isNaN(Date.parse(iso ?? ""))) {
    const at = rows.findIndex((r) => r.uuid === uuid);
    if (at >= 0) {
      lines.push(`cutoff: ${uuid} ${iso} (Transcript-Cutoff)`);
      after = rows.slice(at + 1);
    } else {
      lines.push(`WARNING: cutoff entry ${uuid} is not in the transcript; using its timestamp ${iso}`);
      after = rows.filter((r) => Date.parse(r.timestamp) > Date.parse(iso));
    }
  } else {
    const date = parseDateLine(headerOf(md, "Date"));
    if (!date) return unchecked(`no Transcript-Cutoff${stamp ? ` ("${stamp}")` : ""} and no parseable Date line`);
    const from = new Date(date.ms).toISOString();
    lines.push(
      `WARNING: ${stamp ? `Transcript-Cutoff is "${stamp}"` : "no Transcript-Cutoff line (written before the tail check existed)"}; ` +
        `falling back to the Date line "${headerOf(md, "Date")}", from ${from}. ${date.precision} precision` +
        `${date.zone ? "" : ", zone unknown so read as local time"}: the tail may repeat messages the draft saw.`,
    );
    after = rows.filter((r) => Date.parse(r.timestamp) >= date.ms);
  }

  // Past a /clear the file holds the next conversation, which started from this handoff.
  const clear = after.findIndex((r) => r.type === "user" && /<command-name>\/clear<\/command-name>/.test(textOf(r)));
  if (clear >= 0) {
    lines.push(`note: stopped at /clear (${after[clear].timestamp}); what follows is the next conversation`);
    after = after.slice(0, clear);
  }

  const items = after.filter((r) => isEntry(r) && !r.isMeta && !r.isCompactSummary && textOf(r));
  if (!items.length) {
    lines.push(`tail clean (0 messages after the cutoff)`);
    return { status: "clean", lines };
  }
  let notices = 0;
  items.forEach((r, i) => {
    const text = textOf(r);
    const tags = [];
    // Written knowing the handoff exists (it names this file): about the handoff, not new work.
    if (text.includes(name)) tags.push("handoff-notice"), notices++;
    if (r.type === "user" && r.origin && r.origin.kind !== "human") tags.push(`automated: ${r.origin.kind}`);
    lines.push(`[${i + 1}] ${r.timestamp} ${r.type} ${r.uuid}${tags.map((t) => ` [${t}]`).join("")}`);
    const shown = text.length > TAIL_TEXT_MAX ? `${text.slice(0, TAIL_TEXT_MAX)}\n[... ${text.length - TAIL_TEXT_MAX} more chars]` : text;
    lines.push(...shown.split("\n").map((l) => `    ${l}`));
  });
  lines.push(
    `tail: ${items.length} message(s) after the cutoff${notices ? `, ${notices} tagged handoff-notice` : ""}. ` +
      "Mark each CAPTURED or MISSING against the handoff.",
  );
  return { status: "items", lines };
}

// A decision found in a tail, appended on the user's yes. The ledger stays script-owned.
export function decide({ project, handoff, text }) {
  const name = path.basename(handoff ?? "");
  if (!name || !fs.existsSync(path.join(projectDir(project), name))) die(`--handoff must name a handoff in ${projectDir(project)}`);
  const line = (text ?? "").trim();
  if (!line || /\n/.test(line)) die("--text must be one non-empty line");
  const ledger = path.join(projectDir(project), "DECISIONS.md");
  if (!fs.existsSync(ledger)) fs.writeFileSync(ledger, `# Decisions: ${project}\n\nAppend-only. One line per decision, newest last.\n\n`);
  const entry = `- ${name.slice(0, 10)} · ${line} · [${name}](${name}) (said after this handoff was drafted)\n`;
  fs.appendFileSync(ledger, entry);
  return entry.trimEnd();
}

// ---- claims: what a resuming session may run from a handoff (2026-10-08) -------------------
// A handoff is data. A resuming session runs the commands under "Claims to verify", and a handoff
// can be written by another agent (a sandboxed worker's export lands in ~/handoffs on accept),
// so each command is sorted before anything runs it: RUN when every program in it only
// reads, ASK for anything else, with the reason. A worker's ASK commands never run
// without the user; a session's own ASK commands run only after the model reads them.

// Programs that only read, whatever their arguments (the exceptions are checked below).
const READ_ONLY = new Set([
  "cat", "head", "tail", "wc", "ls", "stat", "file", "du", "df", "readlink", "realpath",
  "basename", "dirname", "pwd", "whoami", "hostname", "uname", "nproc", "uptime", "which",
  "grep", "egrep", "fgrep", "rg", "jq", "sort", "cut", "tr", "diff", "cmp", "date",
  "sha256sum", "sha1sum", "md5sum", "test", "[", "echo", "printf", "true", "false", "find",
]);
const SECRET_RE = /(^|\/)(\.env(\.[a-z0-9_-]+)*|\.netrc|\.pgpass|\.git-credentials|credentials(\.json)?|auth\.json|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?)$|(^|\/)\.ssh(\/|$)/;
const FIND_ACTS = new Set(["-exec", "-execdir", "-ok", "-okdir", "-delete", "-fprint", "-fprint0", "-fprintf", "-fls"]);
const SYSTEMCTL_READ = new Set(["status", "is-active", "is-enabled", "is-failed", "list-units", "list-timers", "list-unit-files", "show", "cat"]);
const HANDOFF_READ = new Set(["project", "latest", "history", "list", "tail", "claims", "cutoff"]);
const GIT_READ = new Set([
  "status", "log", "show", "diff", "rev-parse", "ls-remote", "cat-file", "ls-files", "ls-tree",
  "merge-base", "describe", "for-each-ref", "grep", "show-ref", "rev-list", "shortlog", "blame",
  "count-objects", "name-rev", "cherry",
]);
const GIT_REF_ARG = new Set(["--contains", "--no-contains", "--merged", "--no-merged", "--points-at"]);
const GIT_LISTING = /^(-a|-r|-v|-vv|-l|-n\d*|--list|--all|--remotes|--show-current|--verbose|--no-color|--color(=.*)?|--column|--no-column|--format=.*|--sort=.*|--(no-)?(contains|merged)=.*|--points-at=.*)$/;

// Splits a command into pipeline/list segments of words, honouring quotes. Returns
// { segments } or { ask } when the shell would do more than run the listed programs.
export function splitCommand(cmd) {
  const segments = [];
  let words = [];
  let word = "";
  let inWord = false;
  let quote = null;
  const endWord = () => {
    if (inWord) words.push(word);
    word = "";
    inWord = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length) segments.push(words);
    words = [];
  };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    const n = cmd[i + 1];
    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
      continue;
    }
    if (c === "`" || (c === "$" && n === "(")) return { ask: "command substitution" };
    if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === "\\" && n !== undefined) word += cmd[++i];
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      inWord = true;
    } else if (c === "\\") {
      if (n === undefined) return { ask: "trailing backslash" };
      word += cmd[++i];
      inWord = true;
    } else if (c === " " || c === "\t") {
      endWord();
    } else if (c === ";" || c === "\n" || c === "|") {
      if (c === "|" && (n === "|" || n === "&")) i++;
      endSegment();
    } else if (c === "&") {
      if (n === "&") {
        i++;
        endSegment();
      } else if (n !== ">") return { ask: "runs in the background" };
    } else if (c === ">" || c === "<") {
      // A bare fd number ("2>") belongs to the operator; "foo>x" ends the word foo.
      if (/^\d+$/.test(word)) {
        word = "";
        inWord = false;
      } else endWord();
      let j = i + 1;
      if (cmd[j] === "(") return { ask: "process substitution" };
      if (c === ">" && cmd[j] === ">") j++;
      if (cmd[j] === "&") {
        const m = /^(\d+|-)/.exec(cmd.slice(j + 1));
        if (!m) return { ask: "redirect" };
        j += 1 + m[0].length;
      } else {
        while (cmd[j] === " " || cmd[j] === "\t") j++;
        const m = /^[^\s|&;<>()]+/.exec(cmd.slice(j));
        if (!m) return { ask: "redirect" };
        if (m[0] !== "/dev/null") return { ask: `redirects to ${m[0]}` };
        j += m[0].length;
      }
      i = j - 1;
    } else if (c === "(" || c === ")") {
      return { ask: "subshell" };
    } else {
      word += c;
      inWord = true;
    }
  }
  if (quote) return { ask: "unbalanced quotes" };
  endSegment();
  return segments.length ? { segments } : { ask: "empty command" };
}

const expandHome = (p) => (p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p);
const sameFile = (a, b) => {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return false;
  }
};

function gitRisk(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) {
    if (args[i] === "-C") i += 2;
    else if (args[i] === "--no-pager" || /^--(git-dir|work-tree)=/.test(args[i])) i += 1;
    // -c can set an alias, pager or hook path that runs a program.
    else return `git option ${args[i]}`;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (rest.some((a) => a.startsWith("--output") || a === "--ext-diff" || a.startsWith("--exec") || a.startsWith("--upload-pack")))
    return `git ${sub} with an option that writes a file or runs a program`;
  if (GIT_READ.has(sub)) return null;
  if (sub === "branch" || sub === "tag") {
    const listing = rest.some((a) => a === "-l" || a === "--list");
    for (let k = 0; k < rest.length; k++) {
      if (GIT_REF_ARG.has(rest[k])) k++;
      else if (GIT_LISTING.test(rest[k])) continue;
      else if (!rest[k].startsWith("-") && listing) continue;
      else return `git ${sub} ${rest[k]} can change refs`;
    }
    return null;
  }
  if (sub === "remote") return rest.length === 0 || ["-v", "--verbose", "show", "get-url"].includes(rest[0]) ? null : `git remote ${rest[0]}`;
  if (sub === "config") {
    const reads = rest.some((a) => /^(--get(-all|-regexp|-urlmatch)?|--list|-l)$/.test(a));
    const writes = rest.some((a) => /^(--(add|unset|unset-all|replace-all|edit|rename-section|remove-section)|-e)$/.test(a));
    return reads && !writes ? null : "git config that is not a read";
  }
  if (sub === "stash" || sub === "worktree") return rest[0] === "list" ? null : `git ${sub} ${rest[0] ?? ""}`.trim();
  if (sub === "reflog") return rest.length === 0 || rest[0] === "show" || rest[0].startsWith("-") ? null : `git reflog ${rest[0]}`;
  return `git ${sub ?? "(no subcommand)"} is not a read-only git command`;
}

function segmentRisk(words) {
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) return "sets environment variables";
  const secret = words.find((w) => SECRET_RE.test(w));
  if (secret) return `reads a credential file (${secret})`;
  const name = path.basename(words[0]);
  const args = words.slice(1);
  switch (name) {
    case "find":
      return args.some((a) => FIND_ACTS.has(a)) ? "find with an action that runs or writes" : null;
    case "sort":
      return args.some((a) => a.startsWith("--output") || /^-[a-zA-Z]*o/.test(a)) ? "sort -o writes a file" : null;
    case "tail":
      return args.some((a) => a.startsWith("--follow") || /^-[a-zA-Z]*[fF]/.test(a)) ? "tail -f never ends" : null;
    case "date":
      return args.some((a) => a === "-s" || a.startsWith("--set")) ? "date --set changes the clock" : null;
    case "rg":
      return args.some((a) => a.startsWith("--pre")) ? "rg --pre runs a program" : null;
    case "jq":
      return args.some((a) => /\$ENV\b|(^|[^.\w$])env\b/.test(a)) ? "jq reads the environment" : null;
    case "crontab":
      return args.length === 1 && args[0] === "-l" ? null : "crontab other than -l";
    case "systemctl": {
      const sub = args.find((a) => !a.startsWith("-"));
      return SYSTEMCTL_READ.has(sub) ? null : `systemctl ${sub ?? ""} is not a read`.replace("  ", " ");
    }
    case "git":
      return gitRisk(args);
    case "node":
      // Only this script's own read verbs, at its real path.
      return args[0] && sameFile(expandHome(args[0]), fileURLToPath(import.meta.url)) && HANDOFF_READ.has(args[1])
        ? null
        : "runs a node script";
    default:
      return READ_ONLY.has(name) ? null : `${name} is not on the read-only list`;
  }
}

// null when the command only reads; otherwise the reason it needs a look first.
export function commandRisk(cmd) {
  const s = splitCommand(cmd);
  if (s.ask) return s.ask;
  for (const words of s.segments) {
    const why = segmentRisk(words);
    if (why) return why;
  }
  return null;
}

// "worker" when another agent wrote the handoff (a task-runner export: Attempt-Id, a non-auto
// Attempt-Key, or a sandboxed worker harness); "session" for this machine's own sessions.
export function originOf(md) {
  if (headerOf(md, "Attempt-Id")) return "worker";
  const key = attemptKeyOf(md);
  if (key && !key.startsWith("auto-")) return "worker";
  if (/sandboxed worker/i.test(harnessOf(md) ?? "")) return "worker";
  return "session";
}

// Same parse as the task runner's review: one bullet per claim, the first backtick span is the command.
export function parseClaims(md) {
  const start = md.search(/^## Claims to verify\b.*$/m);
  if (start < 0) return [];
  const body = md.slice(start).split("\n").slice(1);
  const end = body.findIndex((line) => line.startsWith("## "));
  const claims = [];
  for (const line of end < 0 ? body : body.slice(0, end)) {
    const bullet = /^\s*[-*]\s+(.*\S)\s*$/.exec(line);
    if (!bullet) continue;
    const claim = bullet[1];
    if (/^(none|n\/a|nothing)\.?$/i.test(claim)) continue;
    const span = claim.includes("``") ? /``(.+?)``/.exec(claim) : /`([^`]+)`/.exec(claim);
    const command = span ? span[1].trim() : null;
    claims.push({ claim, command, risk: command ? commandRisk(command) : null });
  }
  return claims;
}

export function claims(file) {
  if (!file || !fs.existsSync(file)) die(`handoff file not found: ${file}`);
  const md = fs.readFileSync(file, "utf8");
  const origin = originOf(md);
  const list = parseClaims(md);
  const lines = [`origin: ${origin}`];
  for (const c of list) {
    if (!c.command) lines.push(`NONE ${c.claim}`);
    else if (!c.risk) lines.push(`RUN  ${c.command}`);
    else lines.push(`ASK  ${c.command}`, `     why: ${c.risk}`);
  }
  const count = (k) => list.filter(k).length;
  lines.push(
    `claims: ${count((c) => c.command && !c.risk)} run, ${count((c) => c.command && c.risk)} ask, ${count((c) => !c.command)} without a command` +
      (origin === "worker" ? ". Worker handoff: never run an ASK command without the user." : ""),
  );
  return { origin, claims: list, lines };
}

function listProjects() {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .map((e) => {
      const pointer = path.join(ROOT, e.name, "LATEST");
      return { project: e.name, latest: fs.existsSync(pointer) ? fs.readFileSync(pointer, "utf8").trim() : "(none)" };
    });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  switch (cmd) {
    case "project":
      console.log(resolveProject(args.project));
      break;
    case "latest": {
      const p = resolveProject(args.project);
      const l = latestPath(p);
      if (!l) die(`no handoffs yet for project "${p}" (looked in ${projectDir(p)})`);
      console.log(l);
      break;
    }
    case "history": {
      const p = resolveProject(args.project);
      const f = path.join(projectDir(p), "DECISIONS.md");
      if (!fs.existsSync(f)) die(`no DECISIONS.md yet for project "${p}"`);
      console.log(f);
      break;
    }
    case "list":
      for (const r of listProjects()) console.log(`${r.project}\t${r.latest}`);
      break;
    case "save": {
      const r = save({ project: resolveProject(args.project), slug: args.slug, file: args.file, key: args.key, cutoff: args.cutoff });
      console.log(r.path);
      console.error(`${r.repaired ? "already saved (repaired LATEST/ledger if needed)" : `supersedes: ${r.supersedes ?? "none"}`}; decisions logged: ${r.decisions}`);
      break;
    }
    case "cutoff": {
      const file = transcriptPath(args.session, args.cwd);
      if (!file) die(`no transcript for session ${args.session ?? "(none given)"} under ${PROJECTS}`);
      const c = cutoffOf(readRows(file), { fork: args.fork === "true" });
      if (!c) die(`transcript ${file} has no conversation entries yet`);
      console.log(c);
      break;
    }
    case "tail":
      console.log(tail(args._[1]).lines.join("\n"));
      break;
    case "claims":
      console.log(claims(args._[1]).lines.join("\n"));
      break;
    case "decide":
      console.log(decide({ project: resolveProject(args.project), handoff: args.handoff, text: args.text }));
      break;
    default:
      die("usage: handoff.mjs <project|latest|history|list|save|cutoff|tail|claims|decide> [--project P] [--slug S --file F [--key K] [--cutoff C]] [--session S [--cwd D] [--fork]] [<handoff-file>] [--handoff F --text T]");
  }
}

// realpath both sides: Codex reaches this file through a symlinked skill dir.
const invoked = process.argv[1] && fs.realpathSync(process.argv[1]);
if (invoked === fs.realpathSync(fileURLToPath(import.meta.url))) main();
