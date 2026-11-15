#!/bin/sh
# The build gate. AGENTS.md: "A failing gate means nothing ships."
#   1. bundle/worker.js still matches the sha256 recorded in provenance.json (baseline_v26)
#   2. src/parts/ still reassembles to that bundle byte for byte
#   3. current/ matches the sha256 in current/README.md, and parses as ESM
#   4. wrangler.jsonc binds every env name the deployed artifact reads
set -e
cd "$(dirname "$0")"

want=$(python3 -c "import json;print(json.load(open('provenance.json'))['baseline_v26']['bundle_sha256'])")
got=$(sha256sum bundle/worker.js | cut -d' ' -f1)
[ "$want" = "$got" ] && echo "bundle OK $got" || { echo "MISMATCH bundle want=$want got=$got"; exit 1; }

node src/assemble.mjs --check

cur=current/index.js
[ -f "$cur" ] || { echo "MISSING $cur"; exit 1; }
recorded=$(sed -n 's/.*sha256: `\([0-9a-f]\{64\}\)`.*/\1/p' current/README.md | head -n 1)
[ -n "$recorded" ] || { echo "MISSING sha256 in current/README.md"; exit 1; }
actual=$(sha256sum "$cur" | cut -d' ' -f1)
[ "$recorded" = "$actual" ] && echo "current OK $actual" || {
  echo "MISMATCH current want=$recorded got=$actual (promote a patch by copying it and updating current/README.md together)"
  exit 1
}

# Parse current/index.js as ESM without executing it: node --check on a .js file assumes
# CommonJS and rejects `export`, so check a .mjs copy.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp "$cur" "$tmp/current.mjs"
node --check "$tmp/current.mjs" && echo "syntax OK $cur"

node src/check-bindings.mjs
