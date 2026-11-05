async function setMaster(env, { query, answer, editor, meta }) {
  const id = normalizeId(query);
  const key = KV_PREFIX_MASTER + id;
  const now = Date.now();
  const record = {
    id,
    query,
    answer,
    created: meta?.created ? Number(meta.created) : now,
    updated: now,
    editor: editor || "justice",
    source: "justice",
    verified: true,
    literalVsMythos: meta?.literalVsMythos || "literal",
    model: meta?.model || "justice-approved",
    confidence: clampMasterConfidence(meta?.confidence),
    eitlVerifier: meta?.eitlVerifier || editor || "justice",
    metadata: meta?.metadata || {}
  };
  await env.MASTER_TRUTHS.put(key, JSON.stringify(record));
  return record;
}
__name(setMaster, "setMaster");
__name2(setMaster, "setMaster");
