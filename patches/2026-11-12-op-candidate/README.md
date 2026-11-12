# 2026-11-12 — resolve asks op for a candidate

Deployed as script `truth`, version `5fc78afd-9e44-48a5-b6d3-30488255f047`
(previous version `c19d749a`, the v26 bundle in this repository).

## What was wrong

`/api/truth/resolve` answered `miss` for every input. Two faults, both visible
in `wrangler tail truth`:

1. `requestCandidateFromProxy` asked `env.PROXY`, but the binding on the script
   had been renamed `AI-PROXY` — so the fallback candidate path threw
   `PROXY service not bound` and the request returned
   `no_master_memory_or_provisional_and_no_valid_candidate`.
2. Even with a candidate, the proxy path asks a small model for a JSON array,
   which is not the work a docket question needs.

## What this patch does

- Adds `requestCandidateFromOp`, which asks **op** (the pi harness,
  `pi-harness-example`) on its `truth` preset, one session per query id, and
  takes its answer as the candidate. Everything downstream is unchanged: the
  candidate is stored as provisional (`source: "op_candidate"`), logged,
  notified to `JUSTICE`, and returned in the same canonical response.
- Falls back to the old proxy path if op fails, so a bad day for op is still a
  provisional answer rather than a miss.
- Declares a `PROXY` binding again (same `ai-proxy` service) next to
  `AI-PROXY`, which fixes the pre-existing `PROXY service not bound`.

## The binding, not the URL

`env.OP.fetch("https://op/api/assistant", …)` — a service binding to
`pi-harness-example`. A plain `fetch("https://pi-harness-example.ai-n.workers.dev/…")`
from inside a Worker on the same account fails with **error 1042**, which is
what the first deploy did.

## Verified

- `POST /api/truth/resolve` fresh question → `status: ok`,
  `layer: provisional`, `source: op_candidate`, `model: @preset/truth`,
  3,265 characters, 18.4 s.
- The same question again → provisional hit in 1.4 s, no model call.
- `POST /api/truth/master/create` without the key → `401 admin_key_required`
  (the admin gate still applies).
- `GET /debug/kv-status` → `proxyBound: true`, `adminGated: true`.

## Not changed

Masters, memory, the QC durable object, R2 archive and the admin console.
