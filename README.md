# truth - recovered production snapshot (v26)

**This repository is not a source baseline.** It records what was deployed.

- `bundle/worker.js` - exact deployed artifact, 38357 bytes, SHA-256 `582fa128ff3b15d2b65beaeb49b612a06d8d59691fdb22c9f8f0ca9776fc0ce6`.
- Tag `recovered-v26` marks the commit holding that artifact.
- `src/parts/` - derived navigation split; `node src/assemble.mjs --check` reproduces the bundle exactly.
- `PROVENANCE.md` / `provenance.json` - version id, deploy time, compatibility date, retrieval
  method and timestamp, SHA-256, workers_dev flags, binding inventory.

Never regenerate `bundle/` from `src/parts/`. The bundle is authoritative; the split derives from it.
