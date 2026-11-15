# truth - recovered production snapshot (v26)

**This repository is not a source baseline.** It records what was deployed.

- `bundle/worker.js` - exact deployed artifact, 38357 bytes, SHA-256 `582fa128ff3b15d2b65beaeb49b612a06d8d59691fdb22c9f8f0ca9776fc0ce6`.
- Tag `recovered-v26` marks the commit holding that artifact.
- `src/parts/` - derived navigation split; `node src/assemble.mjs --check` reproduces the bundle exactly.
- `PROVENANCE.md` / `provenance.json` - version id, deploy time, compatibility date, retrieval
  method and timestamp, SHA-256, workers_dev flags, binding inventory.

- `current/index.js` - **the file that is deployed**. A promotion copies a patch here and never
  renames it; `current/README.md` records the patch it came from and its sha256.
- `wrangler.jsonc` - `main: "current/index.js"`, `no_bundle: true`, and the bindings.
- `verify.sh` - the build gate: bundle sha, split reassembly, `current/` integrity, and that every
  env name the deployed artifact reads is actually bound.
- `DEPLOY.md` - the deploy path, promotion procedure and post-deploy checks.

Never regenerate `bundle/` from `src/parts/`. The bundle is authoritative; the split derives from it.

- How changes are made and deployed in this repo: see `AGENTS.md`. `main` names
  `current/index.js`, `patches/` holds every change, and `verify.sh` gates the build.
  The bundle stays frozen as the record of what shipped, not as the file you edit.
