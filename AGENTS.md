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
  (sqlite storage), KV `MASTER_TRUTHS` and `PROV_TRUTH`, R2 `TBACKED`, and service
  bindings to `ai-proxy`, `pi-harness-example`, `justice` and `orproxy`.

## Status: not yet applied

`wrangler.jsonc` still names `patches/2026-11-12-op-candidate/worker.js`, a file that
does not exist (it was renamed to `index.js`, then `main` was pointed at the old
name). **Every push fails at the entry point until that is fixed.** Applying this
workflow is one commit:

1. `mkdir current && cp patches/2026-11-12-op-candidate/index.js current/index.js`
2. write `current/README.md` with the patch name and `sha256sum current/index.js`
3. set `"main": "current/index.js"` in `wrangler.jsonc`
4. extend `verify.sh` to check `current/` matches its README and `node --check`s it
5. set the Workers Builds build command to `sh verify.sh`

That commit deploys the same program that is serving today, so it changes the
pipeline, not the behaviour.
