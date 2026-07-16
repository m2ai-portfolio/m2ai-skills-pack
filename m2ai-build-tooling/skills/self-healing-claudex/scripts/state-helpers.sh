#!/usr/bin/env bash
# state-helpers.sh — atomic state, CAS phase transitions, sweeper, findings counts.
# Sourceable. Borrowed from claudex's state-helpers.sh, adapted for self-healing-claudex.

# All functions prefixed shc_ to avoid collision if sourced alongside claudex helpers.

SHC_STATE_DIR="${SHC_STATE_DIR:-.self-healing-claudex}"
SHC_STALE_MINUTES="${SHC_STALE_MINUTES:-15}"

shc_iso8601_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

shc_epoch() {
  date -u +%s
}

shc_new_review_id() {
  local ts hex
  ts=$(date -u +"%Y%m%d-%H%M%S")
  hex=$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 6)
  printf '%s-%s\n' "$ts" "$hex"
}

shc_validate_review_id() {
  local id="$1"
  [[ "$id" =~ ^[0-9]{8}-[0-9]{6}-[0-9a-f]{6}$ ]]
}

# Atomic write: tmp + rename. Never partial files on the destination.
shc_state_write() {
  local file="$1"
  local content="$2"
  local tmp="${file}.tmp.$$"
  printf '%s' "$content" > "$tmp" || return 1
  mv -f "$tmp" "$file"
}

# Read a single key from YAML-ish state file. Returns empty if missing.
shc_state_read_field() {
  local file="$1"
  local field="$2"
  [[ -f "$file" ]] || return 0
  grep -E "^${field}:" "$file" 2>/dev/null | head -1 | sed -E "s/^${field}:[[:space:]]*//; s/^['\"]//; s/['\"]$//"
}

# Set a single key atomically. Always bumps last_updated_at unless we are setting it.
shc_state_set_field() {
  local file="$1"
  local field="$2"
  local value="$3"
  [[ -f "$file" ]] || return 1
  local tmp="${file}.tmp.$$"
  local now
  now=$(shc_iso8601_utc)

  if grep -qE "^${field}:" "$file"; then
    sed -E "s|^${field}:.*|${field}: ${value}|" "$file" > "$tmp"
  else
    cp "$file" "$tmp"
    printf '%s: %s\n' "$field" "$value" >> "$tmp"
  fi

  if [[ "$field" != "last_updated_at" ]]; then
    if grep -qE "^last_updated_at:" "$tmp"; then
      sed -i.bak -E "s|^last_updated_at:.*|last_updated_at: ${now}|" "$tmp" && rm -f "${tmp}.bak"
    else
      printf 'last_updated_at: %s\n' "$now" >> "$tmp"
    fi
  fi

  mv -f "$tmp" "$file"
}

# Compare-and-swap phase. Only writes if current phase matches `from`.
# Returns 0 on success, 1 on phase mismatch or missing file.
shc_phase_transition() {
  local file="$1"
  local from_phase="$2"
  local to_phase="$3"
  [[ -f "$file" ]] || return 1
  local current
  current=$(shc_state_read_field "$file" "phase")
  if [[ "$current" != "$from_phase" ]]; then
    return 1
  fi
  shc_state_set_field "$file" "phase" "$to_phase"
}

# Lockfile helpers (informational only; does not gate concurrency).
shc_lock_write() {
  local lockfile="$1"
  printf '%s\n' "$$" > "$lockfile"
}

shc_lock_is_active() {
  local lockfile="$1"
  [[ -f "$lockfile" ]] || return 1
  local pid
  pid=$(cat "$lockfile" 2>/dev/null)
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

# Sweep stale state files older than SHC_STALE_MINUTES.
# Removes the .state file plus matching .lock, per-review subfolder.
shc_sweep_stale() {
  local dir="$SHC_STATE_DIR"
  [[ -d "$dir" ]] || return 0
  local removed=0
  while IFS= read -r -d '' state_file; do
    local id
    id=$(basename "$state_file" .state)
    rm -f "$state_file" "${dir}/${id}.lock"
    rm -rf "${dir}/${id}"
    removed=$((removed + 1))
  done < <(find "$dir" -maxdepth 1 -name "*.state" -mmin +"$SHC_STALE_MINUTES" -print0 2>/dev/null)
  printf '%d\n' "$removed"
}

# Find the most recent .state file by mtime. Empty stdout + return 1 if none.
shc_find_active_loop() {
  local dir="$SHC_STATE_DIR"
  [[ -d "$dir" ]] || return 1
  local latest
  latest=$(find "$dir" -maxdepth 1 -name "*.state" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
  [[ -n "$latest" ]] || return 1
  printf '%s\n' "$latest"
}

# Refuse to start a new loop if any existing state file has phase NOT in terminal set.
# Prints the conflicting review_id to stdout and returns 1 on conflict, 0 if clear.
shc_check_no_active_loops() {
  local dir="$SHC_STATE_DIR"
  [[ -d "$dir" ]] || return 0
  local terminal_phases="done cancelled errored"
  while IFS= read -r -d '' state_file; do
    local phase
    phase=$(shc_state_read_field "$state_file" "phase")
    local is_terminal=0
    for t in $terminal_phases; do
      [[ "$phase" == "$t" ]] && is_terminal=1
    done
    if [[ "$is_terminal" -eq 0 ]]; then
      basename "$state_file" .state
      return 1
    fi
  done < <(find "$dir" -maxdepth 1 -name "*.state" -print0 2>/dev/null)
  return 0
}

# Count severity bullets in a findings file.
# Echoes "high=N medium=N low=N". Missing file returns all zeros.
shc_findings_severity_counts() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    printf 'high=0 medium=0 low=0\n'
    return 0
  fi
  local high medium low
  high=$(awk '/^## High/{flag=1; next} /^## /{flag=0} flag && /^- /{c++} END{print c+0}' "$file")
  medium=$(awk '/^## Medium/{flag=1; next} /^## /{flag=0} flag && /^- /{c++} END{print c+0}' "$file")
  low=$(awk '/^## Low/{flag=1; next} /^## /{flag=0} flag && /^- /{c++} END{print c+0}' "$file")
  printf 'high=%d medium=%d low=%d\n' "$high" "$medium" "$low"
}

# Read full state as `KEY=value` pairs to stdout (caller can `eval` if trusted).
shc_state_dump() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  cat "$file"
}

# Append a timestamped log line.
shc_log() {
  local msg="$*"
  local logfile="${SHC_STATE_DIR}/log"
  mkdir -p "$SHC_STATE_DIR"
  printf '[%s] %s\n' "$(shc_iso8601_utc)" "$msg" >> "$logfile"
}
