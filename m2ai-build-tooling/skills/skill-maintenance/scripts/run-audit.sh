#!/usr/bin/env bash
# run-audit.sh — Batch audit all skills in ~/.claude/skills/
# JSON report to stdout, human summary to stderr.
# Max 60 seconds total execution time.

set -uo pipefail

SKILLS_DIR="${HOME}/.claude/skills"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIT_SCRIPT="$SCRIPT_DIR/audit-skill.sh"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TIMEOUT_SECONDS=60
START_TIME=$(date +%s)

# Collect results
RESULTS_JSON="["
TOTAL_SKILLS=0
TOTAL_SCORE=0
SCORES=()
SKILLS_BELOW_THRESHOLD=0
THRESHOLD=40
FIRST=true

for SKILL_DIR in "$SKILLS_DIR"/*/; do
  # Timeout check
  NOW=$(date +%s)
  ELAPSED=$(( NOW - START_TIME ))
  if [ "$ELAPSED" -ge "$TIMEOUT_SECONDS" ]; then
    echo "WARN: Timeout after ${TIMEOUT_SECONDS}s, processed $TOTAL_SKILLS skills" >&2
    break
  fi

  [ ! -d "$SKILL_DIR" ] && continue

  SKILL_NAME=$(basename "$SKILL_DIR")

  # Skip directories without SKILL.md
  if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
    echo "SKIP: $SKILL_NAME (no SKILL.md)" >&2
    continue
  fi

  # Run audit
  AUDIT_JSON=$(bash "$AUDIT_SCRIPT" "$SKILL_DIR" 2>/dev/null) || {
    echo "ERROR: $SKILL_NAME audit failed" >&2
    continue
  }

  # Extract check values from JSON using grep/sed
  get_json_bool() {
    echo "$AUDIT_JSON" | grep "\"$1\":" | head -1 | sed 's/.*: *//;s/[, ].*//'
  }
  get_json_num() {
    echo "$AUDIT_JSON" | grep "\"$1\":" | head -1 | sed 's/.*: *//;s/[, ].*//'
  }

  HAS_FM=$(get_json_bool "has_frontmatter")
  NAME_VALID=$(get_json_bool "name_valid")
  NAME_MATCHES=$(get_json_bool "name_matches_dir")
  DESC_PRESENT=$(get_json_bool "description_present")
  DESC_LENGTH=$(get_json_num "description_length")
  DESC_WHAT=$(get_json_bool "description_answers_what")
  DESC_WHEN=$(get_json_bool "description_answers_when")
  LINE_COUNT=$(get_json_num "line_count")
  UNDER_500=$(get_json_bool "under_500_lines")
  HAS_SCRIPTS=$(get_json_bool "has_scripts_dir")
  HAS_REFS=$(get_json_bool "has_references_dir")
  HAS_ASSETS=$(get_json_bool "has_assets_dir")
  USES_PD=$(get_json_bool "uses_progressive_disclosure")
  SCRIPTS_RNR=$(get_json_bool "scripts_run_not_read")
  HAS_AT=$(get_json_bool "has_allowed_tools")
  HAS_MODEL=$(get_json_bool "has_model_field")
  TOTAL_LINES=$(get_json_num "total_lines")

  IS_SIMPLE=false
  [ "$TOTAL_LINES" -le 60 ] 2>/dev/null && IS_SIMPLE=true

  # --- Scoring ---
  # NOTE: patch_candidates include audit_criterion and auto_applicable (known at audit time).
  # Fields suggested_change and audit_score_before are deferred to Phase 2b enrichment.
  SCORE=0
  FINDINGS="[]"
  PATCHES="[]"
  F_LIST=""
  P_LIST=""

  # 1. Frontmatter (15)
  if [ "$HAS_FM" = "true" ]; then
    SCORE=$((SCORE + 15))
  else
    F_LIST="${F_LIST}{\"id\":\"FM-01\",\"message\":\"Missing frontmatter block\"},"
    P_LIST="${P_LIST}{\"type\":\"add_frontmatter\",\"priority\":1,\"description\":\"Add --- delimited frontmatter with name and description\",\"audit_criterion\":\"FM-01\",\"auto_applicable\":true},"
  fi

  # 2. Name (10)
  if [ "$NAME_VALID" = "true" ] && [ "$NAME_MATCHES" = "true" ]; then
    SCORE=$((SCORE + 10))
  elif [ "$NAME_VALID" = "true" ]; then
    SCORE=$((SCORE + 5))
    F_LIST="${F_LIST}{\"id\":\"NM-02\",\"message\":\"Name does not match directory\"},"
    P_LIST="${P_LIST}{\"type\":\"fix_name\",\"priority\":1,\"description\":\"Set name field to match directory name\",\"audit_criterion\":\"NM-02\",\"auto_applicable\":true},"
  else
    F_LIST="${F_LIST}{\"id\":\"NM-01\",\"message\":\"Invalid name format\"},"
    P_LIST="${P_LIST}{\"type\":\"fix_name\",\"priority\":1,\"description\":\"Fix name to lowercase-hyphens, max 64 chars\",\"audit_criterion\":\"NM-01\",\"auto_applicable\":true},"
  fi

  # 3. Description (20)
  DESC_SCORE=0
  if [ "$DESC_PRESENT" = "true" ]; then
    DESC_SCORE=5
    [ "$DESC_WHAT" = "true" ] && DESC_SCORE=10
    [ "$DESC_WHEN" = "true" ] && DESC_SCORE=$((DESC_SCORE + 5))
    if [ "$DESC_WHAT" = "true" ] && [ "$DESC_WHEN" = "true" ]; then
      # Check length <= 1024
      if [ "$DESC_LENGTH" -le 1024 ] 2>/dev/null; then
        DESC_SCORE=20
      else
        DESC_SCORE=15
        F_LIST="${F_LIST}{\"id\":\"DS-02\",\"message\":\"Description exceeds 1024 characters\"},"
      fi
    fi
    [ "$DESC_WHAT" != "true" ] && F_LIST="${F_LIST}{\"id\":\"DS-03\",\"message\":\"Description lacks action verbs (what)\"},"
    [ "$DESC_WHEN" != "true" ] && F_LIST="${F_LIST}{\"id\":\"DS-04\",\"message\":\"Description lacks trigger phrases (when)\"},"
  else
    F_LIST="${F_LIST}{\"id\":\"DS-01\",\"message\":\"Missing description\"},"
    P_LIST="${P_LIST}{\"type\":\"add_trigger_phrases\",\"priority\":2,\"description\":\"Add description with what+when\",\"audit_criterion\":\"DS-01\",\"auto_applicable\":false},"
  fi
  SCORE=$((SCORE + DESC_SCORE))

  # 4. Progressive disclosure (20)
  PD_SCORE=0
  if [ "$UNDER_500" = "true" ] && [ "$USES_PD" = "true" ]; then
    PD_SCORE=20
  elif [ "$UNDER_500" = "true" ] || [ "$USES_PD" = "true" ]; then
    PD_SCORE=10
  else
    F_LIST="${F_LIST}{\"id\":\"PD-01\",\"message\":\"Over 500 lines without progressive disclosure\"},"
    P_LIST="${P_LIST}{\"type\":\"split_progressive\",\"priority\":2,\"description\":\"Split content into references/ and reduce SKILL.md\",\"audit_criterion\":\"PD-01\",\"auto_applicable\":false},"
  fi
  SCORE=$((SCORE + PD_SCORE))

  # 5. Directory structure (10)
  DIR_SCORE=0
  if [ "$IS_SIMPLE" = "true" ]; then
    DIR_SCORE=10
  else
    DIR_COUNT=0
    [ "$HAS_SCRIPTS" = "true" ] && DIR_COUNT=$((DIR_COUNT + 1))
    [ "$HAS_REFS" = "true" ] && DIR_COUNT=$((DIR_COUNT + 1))
    [ "$HAS_ASSETS" = "true" ] && DIR_COUNT=$((DIR_COUNT + 1))
    if [ "$DIR_COUNT" -ge 2 ]; then
      DIR_SCORE=10
    elif [ "$DIR_COUNT" -eq 1 ]; then
      DIR_SCORE=7
    else
      DIR_SCORE=3
      F_LIST="${F_LIST}{\"id\":\"ST-01\",\"message\":\"No subdirectories for complex skill\"},"
    fi
  fi
  SCORE=$((SCORE + DIR_SCORE))

  # 6. Script efficiency (10)
  SCRIPT_SCORE=10
  if [ "$HAS_SCRIPTS" = "true" ]; then
    if [ "$SCRIPTS_RNR" = "true" ]; then
      SCRIPT_SCORE=10
    elif [ "$SCRIPTS_RNR" = "null" ]; then
      SCRIPT_SCORE=5
    else
      SCRIPT_SCORE=0
      F_LIST="${F_LIST}{\"id\":\"PD-03\",\"message\":\"Scripts are read instead of executed\"},"
      P_LIST="${P_LIST}{\"type\":\"fix_script_refs\",\"priority\":2,\"description\":\"Change Read tool refs to Bash execution for scripts\",\"audit_criterion\":\"PD-03\",\"auto_applicable\":false},"
    fi
  fi
  SCORE=$((SCORE + SCRIPT_SCORE))

  # 7. Tool restrictions (15)
  TOOL_SCORE=0
  if [ "$HAS_FM" = "true" ]; then
    TOOL_SCORE=5
    [ "$HAS_AT" = "true" ] && TOOL_SCORE=$((TOOL_SCORE + 5))
    [ "$HAS_MODEL" = "true" ] && TOOL_SCORE=$((TOOL_SCORE + 5))
  fi
  SCORE=$((SCORE + TOOL_SCORE))

  # Clean up JSON arrays
  F_LIST="${F_LIST%,}"
  P_LIST="${P_LIST%,}"
  [ -n "$F_LIST" ] && FINDINGS="[$F_LIST]" || FINDINGS="[]"
  [ -n "$P_LIST" ] && PATCHES="[$P_LIST]" || PATCHES="[]"

  # Category
  CATEGORY="excellent"
  [ "$SCORE" -lt 80 ] && CATEGORY="good"
  [ "$SCORE" -lt 60 ] && CATEGORY="needs_attention"
  [ "$SCORE" -lt 40 ] && CATEGORY="critical"

  [ "$SCORE" -lt "$THRESHOLD" ] && SKILLS_BELOW_THRESHOLD=$((SKILLS_BELOW_THRESHOLD + 1))

  # Append result
  [ "$FIRST" = "true" ] && FIRST=false || RESULTS_JSON="${RESULTS_JSON},"
  RESULTS_JSON="${RESULTS_JSON}{\"name\":\"$SKILL_NAME\",\"score\":$SCORE,\"category\":\"$CATEGORY\",\"findings\":$FINDINGS,\"patch_candidates\":$PATCHES}"

  SCORES+=("$SCORE")
  TOTAL_SCORE=$((TOTAL_SCORE + SCORE))
  TOTAL_SKILLS=$((TOTAL_SKILLS + 1))

  echo "  $SKILL_NAME: $SCORE/100 ($CATEGORY)" >&2
done

RESULTS_JSON="${RESULTS_JSON}]"

# Calculate mean and median
MEAN_SCORE=0
MEDIAN_SCORE=0
if [ "$TOTAL_SKILLS" -gt 0 ]; then
  MEAN_SCORE=$((TOTAL_SCORE / TOTAL_SKILLS))

  # Sort scores for median
  SORTED=$(printf '%s\n' "${SCORES[@]}" | sort -n)
  MID=$((TOTAL_SKILLS / 2))
  MEDIAN_SCORE=$(echo "$SORTED" | sed -n "$((MID + 1))p")
fi

# Recalibration check
RECAL=false
[ "$MEAN_SCORE" -gt 85 ] && RECAL=true
[ "$MEAN_SCORE" -lt 30 ] && RECAL=true

# Summary to stderr
echo "" >&2
echo "=== Skill Maintenance Audit Report ===" >&2
echo "Timestamp: $TIMESTAMP" >&2
echo "Total skills: $TOTAL_SKILLS" >&2
echo "Mean score: $MEAN_SCORE" >&2
echo "Median score: $MEDIAN_SCORE" >&2
echo "Below threshold ($THRESHOLD): $SKILLS_BELOW_THRESHOLD" >&2
[ "$RECAL" = "true" ] && echo "WARNING: Recalibration needed (mean=$MEAN_SCORE)" >&2
echo "=======================================" >&2

# Persist report to file
REPORTS_DIR="$SKILLS_DIR/skill-maintenance/reports"
mkdir -p "$REPORTS_DIR"
REPORT_FILE="$REPORTS_DIR/audit-$(date +%Y-%m-%d).json"

# JSON to stdout AND file
tee "$REPORT_FILE" <<ENDJSON
{
  "timestamp": "$TIMESTAMP",
  "schema_version": "1.0",
  "total_skills": $TOTAL_SKILLS,
  "mean_score": $MEAN_SCORE,
  "median_score": $MEDIAN_SCORE,
  "skills_below_threshold": $SKILLS_BELOW_THRESHOLD,
  "threshold": $THRESHOLD,
  "recalibration_needed": $RECAL,
  "results": $RESULTS_JSON
}
ENDJSON

echo "Report saved: $REPORT_FILE" >&2
