---
name: validated-data-migration
description: Migrate a shoebox of inconsistent files (CSV, Excel, JSON, PDFs, VCF) into a clean SQLite database with rejection logic, enum normalization, duplicate merges, source provenance, row-count checks, conflict tables, and a human review queue. Use when onboarding a client with legacy data or cleaning up a data dump before importing into a new system.
---

# Validated Data Migration

Takes a directory of inconsistent source files and produces a clean, validated SQLite database with a full audit trail. The core problem it solves: naive imports treat every row as valid, hide conflicts, and produce databases that look complete but contain fake records, duplicate customers, unnormalized enums, and orphaned foreign keys. This skill makes rejection, normalization, and provenance first-class outputs — not afterthoughts.

## Trigger

Use when the user says "/validated-data-migration", "clean up this data dump", "migrate these files to a database", "onboard client data", "fix this shoebox of files", or when any task involves importing mixed-format legacy files into a structured store.

## Phase 1: Intake

Ask the user for:
1. **Source directory** — path containing the files to migrate.
2. **Target entity** — what the data represents (customers, transactions, contacts, inventory, etc.).
3. **Output database path** — where to write the SQLite DB (default: `{source_dir}/migration.db`).
4. **Known issues** (optional) — duplicate entries, inconsistent date formats, enum aliases.

Scan the source directory and report:

```
SOURCE SCAN
-----------
Files found: {n}
Types:       CSV ({n}), Excel ({n}), JSON ({n}), PDF ({n}), VCF ({n}), Other ({n})
Estimated rows (CSV/Excel): {n}
Likely entity: {detected type}
```

## Phase 2: Schema Discovery

Analyze a sample of the source files (first 100 rows of each CSV/Excel, first 20 JSON objects) and propose a unified schema. Get user confirmation before proceeding. This is the HIL gate.

Example schema:
```sql
CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  status      TEXT,  -- enum: active | inactive | prospect
  source_file TEXT,  -- provenance
  source_row  INTEGER,
  import_flag TEXT   -- null | REJECTED | CONFLICT | REVIEW
);
```

## Phase 3: Migration with Validation

Process each source file and apply validation layers before inserting any row:

### 3a. Rejection logic (REJECTED rows)
- **Canary / test records**: name contains "Test", "Mickey Mouse", "Asdf", "Example", "Sample"; email ends in @example.com or @test.com.
- **Implausible values**: transaction amounts > $1M (flag for review), dates before 1900 or in the future.
- **Missing required fields**: rows with null `name` after normalization.

### 3b. Enum normalization
Map aliases to canonical values before inserting (log every normalization):
- `active`, `Active`, `ACTIVE`, `1`, `yes` → `active`
- `inactive`, `Inactive`, `INACTIVE`, `0`, `no` → `inactive`
- `prospect`, `lead`, `Lead` → `prospect`

### 3c. Duplicate detection and merging
- For each incoming row, check if a record with the same `email` (case-insensitive) already exists.
- If duplicate found: merge non-null fields (incoming overwrites existing only if existing is null), log the merge in `conflicts` table, mark surviving row `import_flag = 'CONFLICT'`.

### 3d. Source provenance
Every inserted row must have `source_file` (filename) and `source_row` (line number). Non-negotiable — do not insert rows without provenance.

### 3e. Row-count reconciliation
After each file is processed:
```
{filename}: {total} source rows → {inserted} inserted, {rejected} rejected, {merged} merged as duplicates
```

## Phase 4: Conflict and Rejection Tables

Create these two auxiliary tables in the same database:

```sql
CREATE TABLE rejected_rows (
  id              INTEGER PRIMARY KEY,
  source_file     TEXT,
  source_row      INTEGER,
  raw_data        TEXT,  -- JSON dump of original row
  rejection_reason TEXT
);

CREATE TABLE conflicts (
  id                     INTEGER PRIMARY KEY,
  surviving_id           INTEGER REFERENCES customers(id),
  duplicate_source_file  TEXT,
  duplicate_source_row   INTEGER,
  raw_duplicate          TEXT,  -- JSON dump
  merge_notes            TEXT
);
```

## Phase 5: Migration Report

Write `migration-report.md` in the output directory:

```
MIGRATION REPORT
================
Run date:     {date}
Source dir:   {path}
Database:     {path}

Summary
-------
Files processed:     {n}
Total source rows:   {n}
Inserted:            {n}
Rejected:            {n}
Conflicts resolved:  {n}
Rows pending review: {n}

Row-Count Check
---------------
{filename}: {source_n} → {inserted_n} + {rejected_n} + {merged_n} = {total_n} ✓

Enum Normalizations Applied
---------------------------
{source_value} → {canonical_value}: {count} occurrences

Rejection Reasons
-----------------
Canary/test records:    {n}
Missing required fields: {n}
Implausible values:     {n}

Human Review Queue
------------------
{n} rows flagged import_flag = 'REVIEW' or 'CONFLICT'.
Queries:
  SELECT * FROM customers WHERE import_flag IS NOT NULL;
  SELECT * FROM conflicts;
  SELECT * FROM rejected_rows;
```

## Phase 6: Human Review Queue

After printing the report, tell the user exactly what to inspect:

1. Open the database: `sqlite3 {db_path}`
2. Review conflicts: `SELECT * FROM conflicts ORDER BY id;`
3. Review rejections: `SELECT * FROM rejected_rows ORDER BY rejection_reason;`
4. Review flagged rows: `SELECT * FROM customers WHERE import_flag IS NOT NULL;`

Do not mark the migration complete until the user has reviewed and cleared the review queue.

## What This Does NOT Do

- Does not process scanned PDF images — OCR is out of scope; flag those files for manual handling.
- Does not clean free-text fields (names, addresses) — normalization covers structured fields only.
- Does not integrate with non-SQLite targets without adaptation.
- Does not auto-resolve conflicts — human review is always required.

## Source

Extracted from Nate Kadlac newsletter (2026-04-28): "ChatGPT 5.5 scored 87 where the next best model scored 67. Here's what that gap looks like in real work." Prompt 3 of the five-prompt kit: Validated Data Migration, with explicit rejection logic, enum normalization, duplicate merges, source provenance, and human review queue.
