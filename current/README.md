# current

Promoted from `patches/2026-11-16-purge-lookup/index.js` on 2026-11-16.

- Source patch: `patches/2026-11-12-op-candidate/` (README records the deployment it came from)
- `index.js` sha256: `102742a4f65f60e83e89de49fedc6c3baf08d10d336f92e801da521c1313e1e6`
- `index.js` bytes: 53168

`wrangler.jsonc` deploys this file (`main: "current/index.js"`, `no_bundle: true`), and this
filename never changes — only its contents do.

Promotion is a copy, not a pointer edit. To deploy a new patch: copy its `index.js` here, update
the sha256 above, and commit both together. `verify.sh` fails the build if the two disagree.
