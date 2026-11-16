# truth — how this repo is worked on

`truth` is two things at once: **the record of what was deployed**, and **the source
that deploys next**. Most of the confusion in this repo has come from those two
roles being served by the same file. This is the rule that keeps them apart.

## The rule in one line

`main` names `current/index.js`, that file never changes its name, and
`verify.sh` gates the deploy. Everything else is history.

## The layout

| Path | What it is | Edited how |
|---|---|---|
| `bundle/worker.js` | the artifact deployed as v26 on 2026-11-05, hash-pinned in `provenance.json` | **never** |
| `src/parts/` + `src/assemble.mjs` | a navigation split that reassembles to that bundle byte for byte | never (derived) |
| `patches/<date>-<slug>/` | one change each: `index.js` + `README.md` | new directory per change |
| `current/index.js` | **the file that is deployed** | only by promotion |
| `current/README.md` | which patch this came from, and its sha256 | only by promotion |
| `wrangler.jsonc` | `main: "current/index.js"`, `no_bundle: true` | only when bindings change |
| `verify.sh` | the gate the build runs | when the gate needs to grow |

## The rules

1. **`main` names a file that never gets renamed.** The build uploads exactly what
   `main` names (`no_bundle: true`), so a rename anywhere in that path breaks every
   build until the config agrees. Pointing `main` at a dated patch directory is what
   caused the November failures.
2. **A change is a patch directory, never an edit to `bundle/`.** The bundle is the
   proof of what shipped; it is written once and left alone. `verify.sh` fails the
   build if its sha256 stops matching `provenance.json`.
3. **Promotion is a copy, not a pointer edit.** To deploy a patch: copy
   `patches/<date>-<slug>/index.js` to `current/index.js`, record the patch name and
   the new sha256 in `current/README.md`, commit both. `wrangler.jsonc` is not
   touched, so it cannot drift out of step with the code.
4. **The build is gated.** The Workers Builds **build command** is `sh verify.sh`;
   the deploy command stays the default `npx wrangler deploy`. A failing gate means
   nothing ships. This is the truth equivalent of the `node test.mjs` gate in
   `cods` and `mind`.
5. **A patch's README names the routes and bindings it touches.** A new route is a
   security decision, not just a feature — record whether it is public and why.
6. **Nothing is deleted from `patches/`.** A patch that shipped is history; a patch
   that did not is a record of what was tried.

## What is deployed today

**`patches/2026-11-12-op-candidate/index.js`** — verified 2026-11-15: the live
worker answers `/debug/archive-status`, a route that exists only in that patch and
not in `bundle/worker.js` (v26). So the first `current/` is a copy of that patch.

Consequences worth knowing before touching it:

- Write paths are gated on `ADMIN_KEY` (sent as `x-admin-key`); the reads are open,
  including `/api/truth/provisional/query` and `/debug/kv-status`, which reports
  counts. Never store a secret, credential or private user content as an answer.
- More routes than the bundle: the patch adds `/api/truth/provisional/restore` and
  `/debug/archive-status`.
- Configuration is `no_bundle: true`, `exports` for the `QCLogger` durable object
  (**`legacy-kv` storage — permanently**), KV `MASTER_TRUTHS` and `PROV_TRUTH`, R2
  `TBACKED`, and service bindings to `ai-proxy`, `pi-harness-example`, `justice` and
  `orproxy`.

## Status: applied (2026-11-16)

`main` names `current/index.js`, `current/` is the promoted copy of
`patches/2026-11-12-op-candidate/`, `verify.sh` checks the bundle, the derived split,
`current/` against its recorded sha256, the syntax, and every `env.<NAME>` the file
reads. The build command is `sh verify.sh`; the deploy command is `npx wrangler deploy`.

The build was broken twice, for two different reasons, in this order:

1. **Entry point.** `main` named `patches/2026-11-12-op-candidate/worker.js` after
   that file had been renamed to `index.js`. Every build died before upload:
   `The entry-point file at "…/worker.js" was not found`. Fixed by pointing `main`
   at `current/index.js`, a path that never changes.
2. **Durable Object storage.** The build then uploaded the script and all nine
   bindings and failed in exports reconciliation:

   ```
   ✘ [storage_type_mismatch] class 'QCLogger': declared with storage 'sqlite'
     but the provisioned namespace uses 'legacy-kv'; storage type cannot be changed
     after creation.
   ```

   **`exports['QCLogger'].storage` is `legacy-kv` and must stay `legacy-kv`.** The
   namespace was created that way and the storage type cannot be changed after
   creation. Declaring `sqlite` — or "fixing" the config to `sqlite` because
   newer Wrangler mentions it — fails every deploy at the last step, after upload.

The first complete Workers Builds deploy landed 2026-11-16T05:05:04Z as version
`9eafb0cb`: `/debug/kv-status` reported `proxyBound: true`, `adminGated: true`, and
`POST /api/truth/master/create` without `x-admin-key` returned `401`. Nothing about
the program changed; the pipeline did.
