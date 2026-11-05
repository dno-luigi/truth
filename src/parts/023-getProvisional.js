async function getProvisional(env, inputOrId) {
  const id = normalizeId(inputOrId);
  if (!env.PROV_TRUTH) return null;
  const newKey = KV_PREFIX_PROV + id;
  const legacyKey = `truth:provisional:${id}`;
  let rawProv = await env.PROV_TRUTH.get(newKey);
  let key = newKey;
  if (!rawProv) {
    rawProv = await env.PROV_TRUTH.get(legacyKey);
    key = legacyKey;
  }
  if (!rawProv) return null;
  try {
    const rec = JSON.parse(rawProv);
    rec.created = Number(rec.created) || 0;
    rec.updated = Number(rec.updated) || 0;
    return { id, ...rec };
  } catch {
    return null;
  }
}
__name(getProvisional, "getProvisional");
__name2(getProvisional, "getProvisional");
