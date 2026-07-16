---
name: agent-sdk-layer-stack
description: Build a personal multi-agent AI command center using Claude Code as the immutable foundation with independently swappable specialized layers — Agent SDK bridge, voice interface (Gemini Live + Pipecat), cross-agent hive mind, self-managing memory with decay/promotion, and a mission control dashboard. Use when designing a personal AI stack, replacing an agent framework, building a multi-agent system, or asking "how do I build my own agent platform".
---

# Agent SDK Layer Stack

Build a personal AI command center where Claude Code is the foundation and every other layer is independently removable. No framework lock-in — the base is always Claude Code itself.

## Core Philosophy

External frameworks (orchestration platforms, third-party agent systems) add dependencies that can be deprecated, rate-limited, or changed under you. By contrast:

- Claude Code is your subscription — it doesn't go away
- The Agent SDK is Anthropic's standard interface — it's stable
- Every layer you add on top should be **independently swappable**

A few hundred lines of Agent SDK code + specialized agents organized by role is sufficient to replace any third-party orchestration framework.

## Architecture Overview

```
[ Mission Control Dashboard ]  ← trigger tasks, monitor status
         ↓
[ Agent SDK Bridge ]           ← routes tasks to the right agent
    ↙        ↘        ↘
[ Agent A ] [ Agent B ] [ Agent C ]  ← specialized roles
         ↓ (cross-agent)
[ Hive Mind ]                  ← shared context / awareness bus
         ↓
[ Memory System ]              ← self-managing, decays, pins, consolidates
         ↓
[ Voice Layer ]                ← optional real-time voice interface
```

## Layer 1: Agent SDK Bridge

The bridge is the entry point — a thin routing layer (typically 200–400 lines) that:

1. Receives a task (from Telegram, dashboard, API, or voice)
2. Classifies the task type
3. Routes to the appropriate specialized agent
4. Returns the result to the caller

**3 routing rules** (start simple, only add complexity when needed):

1. If task contains a code-related keyword → route to coding agent
2. If task is a research or summarization request → route to research agent
3. Default → route to general-purpose agent

**Message queue pattern**: Wrap all inter-agent messages in a queue (even an in-memory one). This prevents silent failures where an agent task is submitted but never picked up.

```python
# Minimal message queue pattern
import asyncio
from collections import deque

queue: deque = deque()

async def enqueue(task: dict) -> str:
    task_id = generate_id()
    queue.append({**task, "id": task_id, "status": "queued"})
    return task_id

async def drain_queue(agents: dict):
    while queue:
        task = queue.popleft()
        agent = agents.get(task["agent_type"])
        if agent:
            await agent.run(task)
```

## Layer 2: Specialized Agents

Each agent is a focused role with its own system prompt and tool set. Recommended starting roles:
- **Research agent** — web search, summarization, briefings
- **Coding agent** — code generation, review, debugging
- **Comms agent** — drafting messages, scheduling, summaries

Add roles only when an existing agent is handling tasks outside its strength. Over-splitting creates coordination overhead that costs more than it saves.

Each agent runs via Claude Code's Agent SDK. The Agent SDK provides:
- Tool execution (Bash, file reads, web search)
- Session isolation (each agent task is its own context)
- Configurable `maxTurns` per task

## Layer 3: Hive Mind (Cross-Agent Awareness)

A shared context store that lets agents leave notes for each other without needing direct API calls:

```python
# Minimal hive mind — a JSON file or SQLite table
{
  "timestamp": "ISO-8601",
  "agent": "research",
  "event": "completed",
  "summary": "Found 3 sources on topic X. Key finding: ...",
  "tags": ["research", "topic-x"]
}
```

Any agent can read recent hive mind entries at the start of its turn. This gives each agent awareness of what others have done without tight coupling.

**Rule**: Hive mind entries older than 24 hours are automatically pruned (keep the store small and relevant).

## Layer 4: Self-Managing Memory

Memory that handles its own lifecycle — no manual curation required.

**Extraction**: After each session (or on a 30-min cron), extract memorable events from recent activity using a language model call:

> Review these recent agent outputs. Identify facts, preferences, decisions, or patterns worth remembering for future sessions. Return as a JSON list: [{content, category, importance_score, tags}]

**Classify → Decay → Pin → Consolidate** cycle (runs every 30 minutes):

1. **Classify**: Each new memory gets a category (preference, fact, decision, mistake, project-context) and an initial importance score (0–1).

2. **Decay**: Every cycle, reduce importance score by a small factor (e.g., `score *= 0.95`). Memories that haven't been accessed decay toward zero.

3. **Pin**: If a memory is explicitly invoked by the user or appears relevant 3+ times in a session, set `pinned = true`. Pinned memories don't decay.

4. **Consolidate**: When 5+ memories share the same category and tags, merge them into a single summary memory. This prevents unbounded growth.

**Exfiltration guard**: Before storing any memory, check it against a blocklist of sensitive patterns (credentials, personal identifiers, private API keys). Drop any memory that matches. This is especially important if the memory system pulls from agent outputs that might have handled external data.

## Layer 5: Voice Interface (Optional)

For real-time voice interaction with your agents:

- **Pipecat** provides the media pipeline (audio in → frames → LLM → audio out)
- **Gemini Live** (or any real-time speech model) handles the voice-to-text and text-to-voice loops
- **Pipecat frames and envelopes** carry agent state through the pipeline so multi-turn voice conversations have context

Minimal voice setup:
1. Pipecat listens on a local audio port
2. On utterance complete, forward transcribed text to the Agent SDK bridge (same as a text task)
3. On agent completion, synthesize the response and play it back

Voice is an additive layer — removing it doesn't affect any other layer.

## Layer 6: Mission Control Dashboard

A local web UI (or Cloudflare-tunneled for remote access) that shows:
- Active agents and their current task
- Hive mind recent activity
- Memory health (total count, decay distribution, pinned count)
- Manual task submission form

Expose via a **Cloudflare tunnel** if you need access from a mobile device or another machine without opening ports.

```bash
cloudflared tunnel --url http://localhost:8080
```

## Layer 7: Auto-Launch

Configure your OS to start all agents on boot:

**macOS**: launchd plist files under `~/Library/LaunchAgents/`
**Linux**: systemd user services under `~/.config/systemd/user/`

Each agent gets its own service file. The Agent SDK bridge gets a service file that depends on the agent services starting first.

## Security Layers

- **Chat/caller allowlist**: Only accept tasks from known sources (Telegram chat IDs, specific IPs, authenticated dashboard sessions)
- **Exfiltration guard on memory** (see Layer 4)
- **Secrets via environment variables only** — never hardcode in agent system prompts or config files
- **Anthropic Terms of Service compliance**: Automated agent pipelines that use your API key must comply with Anthropic's ToS. Review the current ToS before deploying agents that act autonomously on your behalf

## Phased Build Order

Build in this order to maintain a working system at every step:

1. Agent SDK bridge + one agent (minimal viable stack)
2. Message queue (prevents silent failures as you add agents)
3. Hive mind store (coordination before adding more agents)
4. Second and third specialized agents
5. Memory extraction + classify/decay loop
6. Mission control dashboard
7. Voice layer (optional)
8. Auto-launch services

## Source Attribution

Technique from Mark Kashef: "I Replaced OpenClaw and Hermes With This Claude Code Setup" (2026-04-14)
https://www.youtube.com/watch?v=rVzGu5OYYS0
