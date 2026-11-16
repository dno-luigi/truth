# 2026-11-16 — purge lookup

`deleteProvisional` and `deleteMaster` slugged the id through `normalizeId` and deleted one key built
from that slug. A row written by hand keeps its own shape - `provisional:i-am-justice` - while the
slugger yields `iamjustice`, so the API answered `200 {"success":true}` and the row kept serving. A
poisoned answer could not be removed through its own delete route.

Both deletes now try the key as asked, its lowercase form and the slug, delete only keys that hold
something, and return `{ deleted, found }`. A miss is `404 {"error":"not_found"}` listing the keys
tried, so a delete cannot claim what it did not do. Both handlers accept `id` or `input` and report
the keys removed. Promoted to `current/index.js`; `bundle/` and `src/parts/` still describe
baseline_v26 and were left untouched, so the build gate stays meaningful.
