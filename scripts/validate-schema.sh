#!/usr/bin/env bash
# validate-schema.sh
#
# Validates all JSON Schema files in schema/ against:
#   1. Valid JSON (always checked — uses Node.js built-in JSON.parse)
#   2. JSON Schema meta-schema conformance (checked if check-jsonschema is available)
#
# Usage: ./validate-schema.sh [--json] [--schema-dir <path>]
#   --json          Output results in JSON format
#   --schema-dir    Override the schema directory (default: <repo-root>/schema)

set -e

# Parse arguments
JSON_MODE=false
SCHEMA_DIR=""

for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=true ;;
    --schema-dir) SCHEMA_DIR_NEXT=true ;;
    *) [ "${SCHEMA_DIR_NEXT:-false}" = true ] && SCHEMA_DIR="$arg" && SCHEMA_DIR_NEXT=false ;;
  esac
done

# Locate repo root and schema dir
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(CDPATH="" cd "$SCRIPT_DIR/../../.." && pwd)"
SCHEMA_DIR="${SCHEMA_DIR:-$REPO_ROOT/schema}"

if [ ! -d "$SCHEMA_DIR" ]; then
  echo "ERROR: Schema directory not found: $SCHEMA_DIR" >&2
  exit 1
fi

# Collect schema files
SCHEMA_FILES=()
while IFS= read -r -d '' f; do
  SCHEMA_FILES+=("$f")
done < <(find "$SCHEMA_DIR" -name "*.schema.json" -print0 | sort -z)

if [ ${#SCHEMA_FILES[@]} -eq 0 ]; then
  echo "WARNING: No *.schema.json files found in $SCHEMA_DIR" >&2
  exit 0
fi

# ─── Phase 1: JSON parse validation via Node.js ───────────────────────────────

PASS=()
FAIL=()
FAIL_MSGS=()

for schema_file in "${SCHEMA_FILES[@]}"; do
  name="$(basename "$schema_file")"
  result=$(node --input-type=module <<EOF 2>&1
import { readFileSync } from 'fs';
try {
  JSON.parse(readFileSync('${schema_file}', 'utf8'));
  process.stdout.write('OK');
} catch (e) {
  process.stdout.write('FAIL: ' + e.message);
  process.exit(1);
}
EOF
  ) || true

  if [[ "$result" == "OK" ]]; then
    PASS+=("$name")
  else
    FAIL+=("$name")
    FAIL_MSGS+=("$name: $result")
  fi
done

# ─── Phase 2: JSON Schema meta-validation (if check-jsonschema available) ─────

META_AVAILABLE=false
META_RESULTS=()

if command -v check-jsonschema >/dev/null 2>&1; then
  META_AVAILABLE=true
  for schema_file in "${SCHEMA_FILES[@]}"; do
    name="$(basename "$schema_file")"
    if meta_out=$(check-jsonschema --check-metaschema "$schema_file" 2>&1); then
      META_RESULTS+=("$name: ✓ meta-valid")
    else
      META_RESULTS+=("$name: ✗ $meta_out")
      # Add to FAIL if not already there
      already_failed=false
      for f in "${FAIL[@]}"; do [ "$f" = "$name" ] && already_failed=true; done
      if ! $already_failed; then
        FAIL+=("$name")
        FAIL_MSGS+=("$name (meta): $meta_out")
      fi
    fi
  done
fi

# ─── Output ───────────────────────────────────────────────────────────────────

TOTAL=${#SCHEMA_FILES[@]}
PASSED=${#PASS[@]}
FAILED=${#FAIL[@]}
OVERALL=$( [ $FAILED -eq 0 ] && echo "PASS" || echo "FAIL" )

if $JSON_MODE; then
  # Build JSON arrays
  pass_json=$(printf '"%s",' "${PASS[@]}" | sed 's/,$//'); pass_json="[${pass_json}]"
  fail_json=$(printf '"%s",' "${FAIL[@]}" | sed 's/,$//'); fail_json="[${fail_json}]"
  printf '{"overall":"%s","total":%d,"passed":%d,"failed":%d,"pass":%s,"fail":%s,"meta_available":%s}\n' \
    "$OVERALL" "$TOTAL" "$PASSED" "$FAILED" "$pass_json" "$fail_json" \
    "$( $META_AVAILABLE && echo true || echo false )"
else
  echo "Schema validation: $OVERALL ($PASSED/$TOTAL passed)"
  echo ""
  for f in "${PASS[@]}"; do echo "  ✓ $f"; done
  for msg in "${FAIL_MSGS[@]}"; do echo "  ✗ $msg"; done
  if $META_AVAILABLE; then
    echo ""
    echo "Meta-schema results:"
    for r in "${META_RESULTS[@]}"; do echo "  $r"; done
  else
    echo ""
    echo "  (JSON Schema meta-validation skipped — install check-jsonschema for full validation)"
    echo "  pip install check-jsonschema"
  fi
  if [ $FAILED -gt 0 ]; then exit 1; fi
fi

exit $( [ $FAILED -eq 0 ] && echo 0 || echo 1 )
