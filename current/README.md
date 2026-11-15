# current

Promoted from `patches/2026-11-12-op-candidate/index.js` on 2026-11-13.

- Source patch: `patches/2026-11-12-op-candidate/` (README records the deployment it came from)
- `index.js` sha256: `3cd9b1ea3ce043927e41226df79899f9f14982478be392f4a041c048a68ed267`
- `index.js` bytes: 51746

`wrangler.jsonc` deploys this file (`main: "current/index.js"`, `no_bundle: true`), and this
filename never changes — only its contents do.

Promotion is a copy, not a pointer edit. To deploy a new patch: copy its `index.js` here, update
the sha256 above, and commit both together. `verify.sh` fails the build if the two disagree.
