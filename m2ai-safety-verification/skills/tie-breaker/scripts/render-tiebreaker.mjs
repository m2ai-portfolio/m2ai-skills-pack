#!/usr/bin/env node
// render-tiebreaker.mjs: turn a tie-breaker JSON spec into a self-contained HTML page.
//
// Usage: node render-tiebreaker.mjs <input.json> <output.html>
//
// Input shape:
// {
//   "issue": "plain-language restatement of the blocker",
//   "models": [
//     { "name": "Claude", "recommendation": "...", "reasoning": "...", "risks": "..." },
//     { "name": "Hermes", "recommendation": "...", "reasoning": "...", "risks": "..." }
//   ],
//   "middle_ground": [
//     { "title": "...", "summary": "...", "steps": ["...", "..."], "tradeoffs": "...",
//       "who": "...", "reversal": "..." }
//   ],
//   "comparison": [
//     { "option": "...", "effort": "...", "risk": "...", "reversibility": "...",
//       "speed": "...", "objection": "..." }
//   ],
//   "claude_pick": "one paragraph, clearly labeled as opinion"
// }

import fs from 'fs';
import path from 'path';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escList(items) {
  return (items || []).map((i) => `<li>${esc(i)}</li>`).join('\n');
}

function render(data) {
  const title = `Tie-breaker: ${esc(data.issue || 'blocker')}`.slice(0, 120);
  const models = data.models || [];
  const middle = data.middle_ground || [];
  const comparison = data.comparison || [];

  const modelCards = models
    .map(
      (m) => `
      <div class="card">
        <h3>${esc(m.name)}</h3>
        <p class="label">Recommendation</p>
        <p>${esc(m.recommendation)}</p>
        <p class="label">Why it thinks so</p>
        <p>${esc(m.reasoning)}</p>
        <p class="label">Cost / what could go wrong</p>
        <p>${esc(m.risks)}</p>
      </div>`
    )
    .join('\n');

  const middleCards = middle
    .map(
      (o, idx) => `
      <div class="card option">
        <h3>Option ${idx + 1}: ${esc(o.title)}</h3>
        <p class="summary">${esc(o.summary)}</p>
        <p class="label">Steps</p>
        <ol>${escList(o.steps)}</ol>
        <p class="label">Tradeoffs</p>
        <p>${esc(o.tradeoffs)}</p>
        <p class="label">Who does what</p>
        <p>${esc(o.who)}</p>
        <p class="label">How to reverse it</p>
        <p>${esc(o.reversal)}</p>
      </div>`
    )
    .join('\n');

  const compRows = comparison
    .map(
      (c) => `
      <tr>
        <td>${esc(c.option)}</td>
        <td>${esc(c.effort)}</td>
        <td>${esc(c.risk)}</td>
        <td>${esc(c.reversibility)}</td>
        <td>${esc(c.speed)}</td>
        <td>${esc(c.objection)}</td>
      </tr>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f7f7f5;
    --panel: #ffffff;
    --text: #1c1c1c;
    --muted: #5a5a5a;
    --border: #e2e0da;
    --accent: #2b6cb0;
    --pick: #f0f7ee;
    --pick-border: #8bbf6f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
    padding: 24px;
  }
  .wrap { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  h2 { font-size: 1.15rem; margin-top: 36px; border-bottom: 2px solid var(--border); padding-bottom: 6px; }
  h3 { font-size: 1.05rem; margin: 0 0 8px; }
  .issue-box {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 20px;
    margin-top: 12px;
  }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top: 16px; }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 18px;
  }
  .card.option { border-left: 4px solid var(--accent); }
  .label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin: 10px 0 2px; }
  .summary { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; overflow-x: auto; display: block; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); font-size: 0.92rem; }
  th { background: var(--panel); color: var(--muted); font-weight: 600; }
  .pick {
    background: var(--pick);
    border: 1px solid var(--pick-border);
    border-radius: 10px;
    padding: 16px 20px;
    margin-top: 16px;
  }
  .pick .tag {
    display: inline-block;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--pick-border);
    color: #fff;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 8px;
  }
  footer { margin-top: 40px; font-size: 0.8rem; color: var(--muted); }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #1a1a1a;
      --panel: #242424;
      --text: #ececec;
      --muted: #a0a0a0;
      --border: #383838;
      --accent: #7ab0e6;
      --pick: #1e2a1a;
      --pick-border: #6fa356;
    }
  }
  :root[data-theme="dark"] {
    --bg: #1a1a1a;
    --panel: #242424;
    --text: #ececec;
    --muted: #a0a0a0;
    --border: #383838;
    --accent: #7ab0e6;
    --pick: #1e2a1a;
    --pick-border: #6fa356;
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>Tie-breaker</h1>
  <p class="issue-box">${esc(data.issue)}</p>

  <h2>What each side recommends</h2>
  <div class="grid">
    ${modelCards}
  </div>

  <h2>Middle-ground options</h2>
  <div class="grid">
    ${middleCards}
  </div>

  <h2>Comparison</h2>
  <table>
    <thead>
      <tr><th>Option</th><th>Effort</th><th>Risk</th><th>Reversibility</th><th>Speed</th><th>Who would object</th></tr>
    </thead>
    <tbody>
      ${compRows}
    </tbody>
  </table>

  <h2>What Claude would pick</h2>
  <div class="pick">
    <span class="tag">Opinion</span>
    <p>${esc(data.claude_pick)}</p>
  </div>

  <footer>Generated by the tie-breaker skill. This page presents options only; no action has been taken automatically.</footer>
</div>
</body>
</html>
`;
}

function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: node render-tiebreaker.mjs <input.json> <output.html>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const html = render(data);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`Wrote ${outputPath} (${html.length} bytes)`);
}

main();
