# Provenance - truth

Two records live here, and only one of them describes what is deployed.

## Current - what is deployed now

| Field | Value |
|---|---|
| Cloudflare script | `truth` |
| Version id | `5fc78afd-9e44-48a5-b6d3-30488255f047` |
| Deployed | 2026-11-12 (date only; no timestamp asserted) |
| Supersedes | `c19d749a-f84b-45d2-9610-2d3ceb5e48b3` (v26) |
| Source patch | `patches/2026-11-12-op-candidate/` |
| Deploy target | `current/index.js` |
| Artifact SHA-256 | `3cd9b1ea3ce043927e41226df79899f9f14982478be392f4a041c048a68ed267` |
| Artifact bytes | 51746 |
| Compatibility date | 2025-11-10 |
| `ADMIN_KEY` | set on the script (write paths gated); value not recorded |

Bindings: `AI-PROXY` and `PROXY` (both `ai-proxy`), `OP` (`pi-harness-example`), `JUSTICE`
(`justice`), `ORPROXY` (`orproxy`), KV `MASTER_TRUTHS` / `PROV_TRUTH`, R2 `TBACKED`,
DO `QC` -> class `QCLogger` (sqlite export).

The code reads eight env names - `PROV_TRUTH`, `TBACKED`, `MASTER_TRUTHS`, `JUSTICE`, `ADMIN_KEY`,
`QC`, `PROXY`, `OP`. `AI-PROXY` and `ORPROXY` are declared but read by no captured version;
`PROXY` is the one the candidate path needs, and its absence is what produced the November
silent-miss outage.

**How this record was obtained:** from `patches/2026-11-12-op-candidate/README.md` (version id and
verified behaviour) and `wrangler.jsonc` (bindings, deploy target). It was **not** re-read from the
Cloudflare API - no credentials were available when it was written, so treat it as the repo's
account of production, not a live query. Open gaps are listed under `current.gaps` in
`provenance.json`.

## Baseline v26 - the proof of what shipped on 2026-11-05

| Field | Value |
|---|---|
| Version | v26 |
| Version id | `c19d749a-f84b-45d2-9610-2d3ceb5e48b3` |
| Deployed (UTC) | 2026-11-05T16:11:52.944606Z |
| Retrieved (UTC) | 2026-11-05T19:20:28.433148Z |
| Compatibility date | 2025-11-10 |
| Bundle bytes | 38357 |
| SHA-256 | `582fa128ff3b15d2b65beaeb49b612a06d8d59691fdb22c9f8f0ca9776fc0ce6` |
| workers_dev | `{"enabled": true, "previews_enabled": false}` |
| Account | `771ee2cc20f09248129114b7535b2cc9` |
| Version history | 26 versions archived, latest v26 |

Retrieval: `GET /accounts/771ee2cc20f09248129114b7535b2cc9/workers/scripts/truth (multipart, part name="worker.js")`. Read-only; response body preserved unmodified.

Bindings: `JUSTICE` (service), `MASTER_TRUTHS` (kv_namespace), `PROV_TRUTH` (kv_namespace),
`PROXY` (service), `QC` (durable_object_namespace), `TBACKED` (r2_bucket), `TEP`
(secrets_store_secret).

Classification: **recovered production artifact** - authoritative for what ran on 2026-11-05, not
the current deployment and not a clean, complete or reproducible source baseline. Related evidence
is sealed under `evidence/sealed/incident-MSB26006196` (digest
`74148457b1defa69caed0f92a59e18d4fb453358153f113bf76ba16dd270e79b`).

`bundle/worker.js` is this baseline. `sh verify.sh` checks it still hashes to the value above, so
the record cannot drift from the artifact.
