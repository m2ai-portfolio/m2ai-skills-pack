#!/usr/bin/env bash
# audit-skill.sh — Audit a single skill directory against Anthropic best practices
# Usage: audit-skill.sh <path-to-skill-directory>
# Outputs JSON to stdout. Exit 0 on valid skill dir, exit 1 on missing SKILL.md.

set -euo pipefail

SKILL_DIR="${1:?Usage: audit-skill.sh <skill-directory>}"
SKILL_MD="$SKILL_DIR/SKILL.md"

if [ ! -f "$SKILL_MD" ]; then
  echo '{"error":"SKILL.md not found","skill_dir":"'"$SKILL_DIR"'"}'
  exit 1
fi

SKILL_NAME=$(basename "$SKILL_DIR")

# --- Raw metrics ---
TOTAL_LINES=$(wc -l < "$SKILL_MD")
FRONTMATTER_LINES=0
CODE_BLOCK_COUNT=$(grep -c '^\s*```' "$SKILL_MD" 2>/dev/null || echo 0)
# Count divided by 2 for paired blocks
CODE_BLOCK_COUNT=$(( CODE_BLOCK_COUNT / 2 ))
EXTERNAL_FILE_REFS=$(grep -cE '(references/|scripts/|assets/)' "$SKILL_MD" 2>/dev/null) || EXTERNAL_FILE_REFS=0
READ_TOOL_MENTIONS=$(grep -ciE 'read\s+.*scripts/' "$SKILL_MD" 2>/dev/null) || READ_TOOL_MENTIONS=0
BASH_EXEC_MENTIONS=$(grep -cE '(bash\s|\.sh\b|Run.*script|run.*script)' "$SKILL_MD" 2>/dev/null) || BASH_EXEC_MENTIONS=0

# --- Frontmatter parsing ---
HAS_FRONTMATTER=false
FM_NAME=""
FM_DESCRIPTION=""
FM_HAS_ALLOWED_TOOLS=false
FM_HAS_MODEL=false

if head -1 "$SKILL_MD" | grep -q '^---$'; then
  # Find closing ---
  CLOSING_LINE=$(tail -n +2 "$SKILL_MD" | grep -n '^---$' | head -1 | cut -d: -f1)
  if [ -n "$CLOSING_LINE" ]; then
    HAS_FRONTMATTER=true
    FRONTMATTER_LINES=$((CLOSING_LINE + 1))

    # Extract fields from frontmatter
    FM_BLOCK=$(sed -n "2,${CLOSING_LINE}p" "$SKILL_MD")
    FM_NAME=$(echo "$FM_BLOCK" | grep -E '^name:\s*' | sed 's/^name:\s*//' | tr -d '\r' | xargs)
    FM_DESCRIPTION=$(echo "$FM_BLOCK" | grep -E '^description:\s*' | sed 's/^description:\s*//' | tr -d '\r')

    if echo "$FM_BLOCK" | grep -qE '^allowed-tools:'; then
      FM_HAS_ALLOWED_TOOLS=true
    fi
    if echo "$FM_BLOCK" | grep -qE '^model:'; then
      FM_HAS_MODEL=true
    fi
  fi
fi

# --- Checks ---

# name_valid: lowercase, hyphens, numbers only, max 64 chars
NAME_VALID=false
if [ -n "$FM_NAME" ] && echo "$FM_NAME" | grep -qE '^[a-z0-9-]{1,64}$'; then
  NAME_VALID=true
fi

# name_matches_dir
NAME_MATCHES_DIR=false
if [ "$FM_NAME" = "$SKILL_NAME" ]; then
  NAME_MATCHES_DIR=true
fi

# description checks
DESC_PRESENT=false
DESC_LENGTH=0
DESC_ANSWERS_WHAT=false
DESC_ANSWERS_WHEN=false

if [ -n "$FM_DESCRIPTION" ]; then
  DESC_PRESENT=true
  DESC_LENGTH=${#FM_DESCRIPTION}

  # Heuristic: action verbs suggest "what" is answered
  if echo "$FM_DESCRIPTION" | grep -qiE '(audit|generate|create|build|analyze|check|review|manage|deploy|run|execute|transform|convert|scan|monitor|report|help|guide|produce|extract|process|search|fetch|validate|test|format|optimize|schedule|automate)'; then
    DESC_ANSWERS_WHAT=true
  fi

  # Heuristic: trigger phrases suggest "when" is answered
  if echo "$FM_DESCRIPTION" | grep -qiE '(use when|activate when|trigger when|when the user|when forge|when you need|when asked|when running|when reviewing|when creating|when building|before publishing|after bulk|use this)'; then
    DESC_ANSWERS_WHEN=true
  fi
fi

# Line count check
UNDER_500=false
if [ "$TOTAL_LINES" -le 500 ]; then
  UNDER_500=true
fi

# Directory structure
HAS_SCRIPTS_DIR=false
HAS_REFERENCES_DIR=false
HAS_ASSETS_DIR=false
[ -d "$SKILL_DIR/scripts" ] && HAS_SCRIPTS_DIR=true
[ -d "$SKILL_DIR/references" ] && HAS_REFERENCES_DIR=true
[ -d "$SKILL_DIR/assets" ] && HAS_ASSETS_DIR=true

# Progressive disclosure: references external files for on-demand loading
USES_PROGRESSIVE_DISCLOSURE=false
if [ "$EXTERNAL_FILE_REFS" -gt 0 ]; then
  USES_PROGRESSIVE_DISCLOSURE=true
fi

# Scripts run not read: only applicable if scripts/ exists
SCRIPTS_RUN_NOT_READ="null"
if [ "$HAS_SCRIPTS_DIR" = "true" ]; then
  if [ "$READ_TOOL_MENTIONS" -eq 0 ] && [ "$BASH_EXEC_MENTIONS" -gt 0 ]; then
    SCRIPTS_RUN_NOT_READ="true"
  elif [ "$READ_TOOL_MENTIONS" -gt 0 ]; then
    SCRIPTS_RUN_NOT_READ="false"
  elif [ "$BASH_EXEC_MENTIONS" -eq 0 ]; then
    SCRIPTS_RUN_NOT_READ="false"
  fi
fi

# --- Output JSON ---
cat <<ENDJSON
{
  "skill_name": "$SKILL_NAME",
  "skill_dir": "$SKILL_DIR",
  "schema_version": "1.0",
  "checks": {
    "has_frontmatter": $HAS_FRONTMATTER,
    "name_valid": $NAME_VALID,
    "name_matches_dir": $NAME_MATCHES_DIR,
    "description_present": $DESC_PRESENT,
    "description_length": $DESC_LENGTH,
    "description_answers_what": $DESC_ANSWERS_WHAT,
    "description_answers_when": $DESC_ANSWERS_WHEN,
    "line_count": $TOTAL_LINES,
    "under_500_lines": $UNDER_500,
    "has_scripts_dir": $HAS_SCRIPTS_DIR,
    "has_references_dir": $HAS_REFERENCES_DIR,
    "has_assets_dir": $HAS_ASSETS_DIR,
    "uses_progressive_disclosure": $USES_PROGRESSIVE_DISCLOSURE,
    "scripts_run_not_read": $SCRIPTS_RUN_NOT_READ,
    "has_allowed_tools": $FM_HAS_ALLOWED_TOOLS,
    "has_model_field": $FM_HAS_MODEL
  },
  "raw_metrics": {
    "total_lines": $TOTAL_LINES,
    "frontmatter_lines": $FRONTMATTER_LINES,
    "code_block_count": $CODE_BLOCK_COUNT,
    "external_file_refs": $EXTERNAL_FILE_REFS,
    "read_tool_mentions": $READ_TOOL_MENTIONS,
    "bash_execution_mentions": $BASH_EXEC_MENTIONS
  }
}
ENDJSON
