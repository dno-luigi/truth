# Reconstruction status - truth

Stage 1 - **recovered artifact** (complete, authoritative): `bundle/worker.js`, tag `recovered-v26`,
38357 bytes, SHA-256 `582fa128ff3b15d2b65beaeb49b612a06d8d59691fdb22c9f8f0ca9776fc0ce6`.

Stage 2 - **readable navigation split** (complete, derived): 46 byte-exact segments split at
top-level declaration boundaries, with line ranges and per-part hashes in `src/parts.json`.
`node src/assemble.mjs --check` concatenates them and asserts byte equality with the bundle, so the
split cannot silently drift from the deployed artifact.

Stage 3 - **refactor into maintainable modules** (not started): requires behaviour-preserving
restructuring backed by tests. No equivalence is claimed until that suite exists; until then the
bundle remains the only authoritative statement of behaviour.
