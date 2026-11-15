# Deploying `truth`

This repo is both the record of what shipped and the source that deploys next. `AGENTS.md` is
the rule that keeps those apart; this file is the operational detail.

**`wrangler.jsonc` deploys `current/index.js`.** That filename never changes — only its contents
do, by promotion. The November build failures were all one mistake: `main` pointed into a dated
patch directory (`patches/2026-11-12-op-candidate/index.js`), that file was renamed to
`worker.js`, and every build after that died at the entry point (`Missing entry-point`,
`ValueExpected`, `Could not detect a directory containing static files`). A stable path removes
that whole class of failure.

## Prerequisites

- **Wrangler.** No `package.json` here. Validated with `4.161.0` and `4.158.0`; pin what you use.
- **Credentials.** `wrangler login`, or `CLOUDFLARE_API_TOKEN` with Workers Scripts:Edit, plus
  `CLOUDFLARE_ACCOUNT_ID=771ee2cc20f09248129114b7535b2cc9` so a multi-account token can't target
  the wrong account.
- **Existing resources.** A dry run validates config and upload, not the account. These must
  exist, or the deploy fails at upload: Workers `ai-proxy`, `pi-harness-example`, `justice`,
  `orproxy`; KV `904eff3af4c14f06964e4f651cce9573` and `4a9bfbffb4d440cba86badc508e2045a`;
  R2 `ai-nspired`; the `QCLogger` Durable Object namespace on script `truth`; and the `ADMIN_KEY`
  secret (write paths are gated on it).

## The gate

Workers Builds runs `sh verify.sh` as the build command; the deploy command stays
`npx wrangler deploy`. Four checks, all of which must print `OK`:

| Check | Guards against |
|---|---|
| `bundle OK` | `bundle/worker.js` drifting from the sha256 in `provenance.json` (the v26 proof) |
| `assemble OK` | the derived split no longer reproducing that bundle |
| `current OK` | `current/index.js` no longer matching the sha256 in `current/README.md` |
| `syntax OK` | `current/index.js` not parsing as ESM |
| `bindings OK` | config not binding an env name the artifact reads |

That last one is the one that matters most. It reads `current/index.js`, collects every
`env.<NAME>` it dereferences, and fails if `wrangler.jsonc` doesn't bind it. This is exactly the
bug that broke production: the script's binding was renamed `PROXY` → `AI-PROXY` while the code
still read `env.PROXY`, so the candidate path threw, `handleResolve` caught it, and every resolve
returned a **200 `miss`**. It also checks that the `QC` binding names a class the artifact
actually exports, and reports bindings nothing reads (`AI-PROXY`, `ORPROXY`) as notes, not errors.

## Promote a patch

```sh
cp patches/<date>-<slug>/index.js current/index.js
sha256sum current/index.js          # copy into current/README.md
sh verify.sh                        # must pass before committing
```

Commit the copy and the README update together. `wrangler.jsonc` is not touched, so it cannot
drift out of step with the code. Never point `main` at a patch directory, and never rename
`current/index.js`.

## Deploy

```sh
wrangler deploy --dry-run     # binding table + upload size, uploads nothing
wrangler deploy
```

Expect nine bindings — `env.AI-PROXY`, `env.PROXY` (both `ai-proxy`), `env.OP`
(`pi-harness-example`), `env.JUSTICE`, `env.ORPROXY`, `env.QC (QCLogger)`,
`env.MASTER_TRUTHS`, `env.PROV_TRUTH`, `env.TBACKED` — and an upload around 50.5 KiB.

Two warnings are expected and should not be "fixed": the `QCLogger` exports notice is silenced by
the `exports` block already in the config, and any `unsafe` notice only appears if a binding was
declared that way. Do not add migrations for `QCLogger`: `exports` already declares its storage.

## After it deploys

```sh
curl -s https://truth.<subdomain>.workers.dev/debug/kv-status
```

`proxyBound: true` means `env.PROXY` is live (it is `!!env.PROXY`), `adminGated: true` means the
secret survived. Then a real resolve — the patch's README records the expected shape:
`status: ok`, `layer: provisional`, `source: op_candidate`, ~18 s cold and ~1.4 s on a repeat.
`POST /api/truth/master/create` without `x-admin-key` should return `401 admin_key_required`.

## What is deployed today

`patches/2026-11-12-op-candidate/` → copied to `current/index.js`. That patch supersedes v26
(`c19d749a`, kept in `bundle/worker.js` + `provenance.json` as the proof of what shipped on
2026-11-05) and adds `/api/truth/provisional/restore` and `/debug/archive-status`.

Rollback: `wrangler deployments list`, then `wrangler rollback --version-id <id>`.

## Not verified here

No deploy was performed from this workspace and no Cloudflare credentials were available, so
account state (resources, `ADMIN_KEY`, current version) comes from the patch README and
`provenance.json`, not from the API. The config is validated by `wrangler deploy --dry-run` and by
`sh verify.sh` only.
