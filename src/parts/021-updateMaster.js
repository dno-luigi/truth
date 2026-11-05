async function updateMaster(env, {
  idOrQuery,
  answer,
  editor,
  meta,
  expectedVersion
}) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_MASTER + id;
  const raw = await env.MASTER_TRUTHS.get(key);
  if (!raw) {
    const e = new Error("NOT_FOUND");
    e.code = "NOT_FOUND";
    throw e;
  }
  const existing = JSON.parse(raw);
  existing.created = Number(existing.created) || 0;
  existing.updated = Number(existing.updated) || 0;
  if (expectedVersion && existing.version && existing.version !== expectedVersion) {
    const e = new Error("VERSION_CONFLICT");
    e.code = "VERSION_CONFLICT";
    e.current = existing;
    throw e;
  }
  const now = Date.now();
  const updated = {
    ...existing,
    id,
    answer: answer ?? existing.answer,
    updated: now,
    editor: editor || existing.editor || "justice",
    literalVsMythos: meta?.literalVsMythos || existing.literalVsMythos || "literal",
    model: meta?.model || existing.model || "justice-approved",
    confidence: meta?.confidence ? clampMasterConfidence(meta.confidence) : clampMasterConfidence(existing.confidence),
    eitlVerifier: meta?.eitlVerifier || existing.eitlVerifier || editor || "justice",
    metadata: {
      ...existing.metadata || {},
      ...meta?.metadata || {}
    },
    version: Number(now)
  };
  await env.MASTER_TRUTHS.put(key, JSON.stringify(updated));
  return updated;
}
__name(updateMaster, "updateMaster");
__name2(updateMaster, "updateMaster");
