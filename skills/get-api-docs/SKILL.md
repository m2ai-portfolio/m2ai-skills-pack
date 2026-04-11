---
argument-hint: get <id> [--lang py|js] [--full] [--file FILENAME]
---

# Skill: Get API Documentation via Context Hub

Use the `chub` CLI to fetch curated, versioned API documentation before writing code against external APIs. This prevents hallucinated API calls and ensures correct SDK usage.

## When to Use

- Before implementing code that calls an external API or SDK
- When unsure about correct API parameters, methods, or patterns
- When the user asks about how to use a specific service's API

## Commands

```bash
# Search for available docs (no query lists all)
chub search [query]

# Fetch documentation by ID (with language variant)
chub get <id> --lang py    # Python docs
chub get <id> --lang js    # JavaScript/TypeScript docs
chub get <id>              # Default (usually JS)

# Fetch full docs (all reference files)
chub get <id> --lang py --full

# Fetch specific reference file (token-efficient)
chub get <id> --file <filename>

# Add persistent annotation when you discover a gap or workaround
chub annotate <id> "note about what you learned"

# View existing annotations
chub annotate --list

# Rate documentation quality
chub feedback <id> up      # Helpful
chub feedback <id> down    # Needs improvement
```

## Workflow

1. **Search** for the relevant API: `chub search "stripe"`
2. **Fetch** language-specific docs: `chub get stripe/api --lang js`
3. **Read** the output and use it as the source of truth for API calls
4. **Annotate** if you discover gaps: `chub annotate stripe/api "webhook needs raw body"`
5. **Rate** after use: `chub feedback stripe/api up`

## Available Docs (as of 2026-03-07)

20 entries including: airtable, amplitude, anthropic/claude-api, asana, assemblyai, atlassian/confluence, auth0, aws/s3, binance, braintree, chromadb, clerk, cloudflare/workers, cockroachdb, cohere, datadog, deepgram, deepl, deepseek, directus.

Run `chub search` to get the current full list.

## Important

- Always fetch docs BEFORE writing API integration code, not after
- Use `--lang py` or `--lang js` to get language-specific examples
- Use `--full` sparingly — it returns all reference files and uses more tokens
- Annotations persist locally across sessions — use them to build knowledge
