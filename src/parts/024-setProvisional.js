async function setProvisional(env, {
  query,
  answer,
  source,
  model,
  confidence,
  citations,
  meta
}) {
  const id = normalizeId(query);
  const key = KV_PREFIX_PROV + id;
  const now = Date.now();
  const record = {
    id,
    query,
    answer,
    source: source || "proxy_ai_candidate",
    model: model || "proxy-model",
    confidence: clampProvisionalConfidence(confidence),
    citations: citations || [],
    created: meta?.created ? Number(meta.created) : now,
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
__name(setProvisional, "setProvisional");
__name2(setProvisional, "setProvisional");
