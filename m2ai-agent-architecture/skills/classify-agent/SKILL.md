---
name: classify-agent
description: >
  Classify a problem into one of four agent architectures: coding harness, dark factory,
  auto research, or orchestration framework. Implements the "one-question test" diagnostic
  from Nate Kadlac's agent taxonomy. Use when starting a new agent project, evaluating a
  build approach, or when someone says "what kind of agent should I build?", "classify this",
  or "/classify-agent".
---

# Agent Architecture Classifier

Takes a problem description and determines which of four agent architectures is the best fit, using the diagnostic question: **"What are you optimizing against?"**

## The Four Architectures

| Architecture | Governing Principle | Optimizing Against | Example |
|---|---|---|---|
| **Coding Harness** | Decomposition boundaries | Task isolation -- each unit of work touches minimal shared state | Claude Code, Cursor, Aider |
| **Dark Factory** | Specification-as-code | Convergence to spec -- can an agent reach the target without human input? | StrongDM's autonomous build pipeline |
| **Auto Research** | Metric + guardrail | Measurable improvement -- is there a benchmark to beat? | Karpathy's 630-line research loop |
| **Orchestration Framework** | Handoff contracts | Pipeline throughput -- do agents pass clean data to each other? | CrewAI, LangGraph, multi-agent chains |

## Phases

### Phase 1: Gather Context
Ask the user to describe their problem in 2-3 sentences. If they've already provided it, skip this.

### Phase 2: The One-Question Test
Analyze the description against the diagnostic: **"What are you optimizing against?"**

Map the answer:
- "I need isolated tasks that don't step on each other" -> **Coding Harness**
- "I need an agent that converges to a precise spec without hand-holding" -> **Dark Factory**
- "I need to beat a benchmark or improve a measurable metric" -> **Auto Research**
- "I need multiple agents to coordinate and pass work between them" -> **Orchestration Framework**

### Phase 3: Confirmation Diagnostics
Run three follow-up questions to confirm the classification:

1. **Decomposition test**: "Can the work be split into units that don't share files/state?" (Yes = Coding Harness signal)
2. **Spec maturity test**: "Do you have a precise, testable specification?" (Yes = Dark Factory signal)
3. **Metric test**: "Is there a quantitative benchmark you're trying to beat?" (Yes = Auto Research signal)
4. **Handoff test**: "Does the output of one step become the input of another step with a different agent?" (Yes = Orchestration signal)

### Phase 4: Output Classification
Report:
- **Primary architecture**: The best fit with confidence (high/medium/low)
- **Runner-up**: Second-best fit if signals are mixed
- **Anti-patterns to avoid**: Common mistakes for this architecture type
- **Governing principle**: The one rule that should guide all design decisions
- **Next step**: What to build first

## Verification
- Classification maps to exactly one of the four architectures
- At least 2 of 4 diagnostic signals align with the primary classification
- Anti-patterns are specific to the chosen architecture, not generic advice

## Source
Nate Kadlac, "There are 4 kinds of agents and you're probably using the wrong one", natesnewsletter.substack.com, 2026-03-25.
