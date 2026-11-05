#!/bin/sh
# Re-verify the recovered bundle and the derived split.
set -e
cd "$(dirname "$0")"
want=$(python3 -c "import json;print(json.load(open('provenance.json'))['bundle_sha256'])")
got=$(sha256sum bundle/worker.js | cut -d' ' -f1)
[ "$want" = "$got" ] && echo "bundle OK $got" || { echo "MISMATCH want=$want got=$got"; exit 1; }
node src/assemble.mjs --check
