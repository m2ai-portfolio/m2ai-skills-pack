---
name: pre-turn-budget-guardian
description: Enforce a token budget ceiling on Claude Code sessions by checking projected usage BEFORE each turn and halting with a structured stop reason if the budget would be exceeded. Prevents runaway loops and silent token burn. Completes the token management trilogy alongside boot-tax-monitor (measures startup) and token-burn-auditor (measures waste).
---

# Pre-Turn Token Budget Guardian

Enforces a hard or soft token budget on the current session. Unlike boot-tax-monitor (measures startup overhead) and token-burn-auditor (finds waste after the fact), this skill prevents overspend by checking projected usage before each significant operation.

## Trigger

Use when the user says "set a token budget", "budget guardian", "limit my spend", "cap this session", "don't let me burn more than X tokens", "token ceiling", "prevent runaway", or wants to enforce cost limits on a Claude Code session.

## Phase 1: Set Budget Parameters

Ask for or accept defaults:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `budget_tokens` | 500,000 | Max total tokens (input + output) for this session |
| `budget_usd` | $5.00 | Max estimated cost for this session |
| `warning_threshold` | 80% | Alert when this % of budget is consumed |
| `enforcement` | soft | `soft` = warn and ask to continue; `hard` = halt immediately |
| `model` | auto-detect | Model in use (for pricing calculation) |

If the user gives a dollar amount, convert to tokens using current pricing:

| Model | Input $/1M | Output $/1M | Blended avg $/1M |
|-------|-----------|------------|------------------|
| Haiku 3.5 | $0.80 | $4.00 | ~$2.40 |
| Sonnet 4 | $3.00 | $15.00 | ~$9.00 |
| Opus 4 | $15.00 | $75.00 | ~$45.00 |

Formula: `budget_tokens = (budget_usd / blended_per_token) * 1,000,000`

## Phase 2: Measure Current Usage

Check current session token consumption:

1. **If the agent platform DB available** (`store/the agent platform.db`):
   ```sql
   SELECT SUM(context_tokens) as total_input, SUM(output_tokens) as total_output,
          SUM(cost_usd) as total_cost, COUNT(*) as turns
   FROM token_usage WHERE session_id = '<current_session>';
   ```

2. **If session JSONL available** (`~/.claude/projects/*/sessions/`):
   Parse the most recent session file for token usage entries.

3. **If neither available**, estimate from conversation length:
   - Count user messages and assistant responses
   - Estimate ~1,000 tokens per user turn, ~2,000 per assistant turn
   - This is a rough fallback -- note the estimate in output

## Phase 3: Project Next Turn Cost

Before the user's next significant operation, estimate what it will cost:

- **Simple question/answer**: ~3,000-5,000 tokens
- **Code generation**: ~5,000-15,000 tokens
- **Multi-file edit**: ~15,000-30,000 tokens
- **Agent task with tool use**: ~20,000-50,000 tokens
- **Sub-agent spawn**: ~50,000-100,000 tokens

Calculate:
```
used_tokens = total_input + total_output
projected_after_next = used_tokens + estimated_next_turn
remaining = budget_tokens - used_tokens
```

## Phase 4: Enforce

### At warning threshold (default 80%):
```
Token Budget Warning
====================
Used: XXK / XXK tokens (XX%)
Est. cost: $X.XX / $X.XX
Remaining: ~XX turns at current rate

Continue? [y/n]
```

### At budget limit:
**Soft mode**: Show warning, ask to continue or stop
**Hard mode**: Output structured stop and refuse further operations:
```
Token Budget Exceeded
=====================
Budget: XXK tokens ($X.XX)
Used: XXK tokens ($X.XX)
Stop reason: BUDGET_EXCEEDED

Session halted. To continue, run /pre-turn-budget-guardian with a higher budget.
```

## Phase 5: Ongoing Monitoring

After setting the budget, append a status line after each significant response:

```
[Budget: XXK/XXK tokens (XX%) | ~XX turns remaining]
```

If the user runs multiple operations, track cumulative usage and warn proactively when approaching the threshold.

## Runaway Loop Detection

The specific failure mode this prevents: Claude Code's autoCompact or retry logic silently burning thousands of tokens in a loop. Detect this by:

1. If 3+ consecutive turns have >10,000 output tokens each, flag as potential loop
2. If token consumption rate doubles between consecutive turns, flag as acceleration
3. If the same tool is called 5+ times in a row with similar inputs, flag as retry storm

On detection:
```
Runaway Loop Detected
=====================
Pattern: [retry storm / token acceleration / repeated tool calls]
Tokens burned in loop: ~XXK
Action: [HALTED (hard) / WARNING (soft)]
```

## Integration Notes

- **boot-tax-monitor**: Measures what you pay at startup (static). Run first to know your baseline.
- **token-burn-auditor**: Finds waste patterns after the fact (diagnostic). Run periodically.
- **pre-turn-budget-guardian**: Prevents overspend in real-time (enforcement). Run during sessions.

Together these form the token management trilogy: measure, diagnose, enforce.

## Source Attribution

Technique derived from Nate's Newsletter (2026-04-03): "Your Agent Is 80% Plumbing" -- pre-turn token budget checking as a core infrastructure primitive, inspired by Claude Code's internal budget guardian that checks projected usage before each API call and halts with structured stop reasons on budget exhaustion.
