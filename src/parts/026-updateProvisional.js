async function updateProvisional(env, { idOrQuery, answer, meta }) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_PROV + id;
  const now = Date.now();
  const raw = await env.PROV_TRUTH.get(key);
  if (!raw) {
    if (!answer) {
      const e = new Error("NOT_FOUND");
      e.code = "NOT_FOUND";
      throw e;
    }
    const record = {
      id,
      query: idOrQuery,
      answer,
      source: "justice_manual",
      model: meta?.model || "manual",
      confidence: clampProvisionalConfidence(meta?.confidence),
      citations: meta?.citations || [],
      created: now,
      updated: now,
      provisional: true,
      verified: false,
      qc_passed: meta?.qc_passed !== false
    };
    await env.PROV_TRUTH.put(key, JSON.stringify(record), {
      expirationTtl: 24 * 3600
    });
    return record;
  }
  const existing = JSON.parse(raw);
  existing.created = Number(existing.created) || 0;
  existing.updated = Number(existing.updated) || 0;
  const updated = {
    ...existing,
    id,
    answer: answer ?? existing.answer,
    updated: now,
    confidence: clampProvisionalConfidence(
      meta?.confidence ?? existing.confidence
    ),
    citations: meta?.citations || existing.citations || [],
    qc_passed: meta?.qc_passed !== void 0 ? !!meta.qc_passed : existing.qc_passed
  };
  await env.PROV_TRUTH.put(key, JSON.stringify(updated), {
    expirationTtl: 24 * 3600
  });
  return updated;
}
__name(updateProvisional, "updateProvisional");
__name2(updateProvisional, "updateProvisional");
