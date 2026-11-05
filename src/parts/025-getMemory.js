async function getMemory(env, inputOrId) {
  const id = normalizeId(inputOrId);
  if (!env.PROV_TRUTH) return null;
  const raw = await env.PROV_TRUTH.get("truth:" + id);
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw);
    rec.id = rec.id || id;
    rec.created = Number(rec.created || rec.timestamp) || 0;
    rec.updated = Number(rec.updated || rec.edited || rec.timestamp) || rec.created;
    return rec;
  } catch {
    return null;
  }
}
__name(getMemory, "getMemory");
__name2(getMemory, "getMemory");
