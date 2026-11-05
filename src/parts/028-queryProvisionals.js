async function queryProvisionals(env, { query, limit = 20 }) {
  const id = normalizeId(query);
  let keyPrefix = KV_PREFIX_PROV;
  if (id !== "unknown-query") keyPrefix = keyPrefix + id;
  const list = await env.PROV_TRUTH.list({ prefix: keyPrefix, limit: Number(limit) });
  const results = [];
  for (const meta of list.keys) {
    const raw = await env.PROV_TRUTH.get(meta.name);
    if (!raw) continue;
    try {
      let obj = JSON.parse(raw);
      obj.created = Number(obj.created) || 0;
      obj.updated = Number(obj.updated) || 0;
      obj.id = obj.id || normalizeId(obj.query);
      results.push(obj);
    } catch {
    }
  }
  return results;
}
__name(queryProvisionals, "queryProvisionals");
__name2(queryProvisionals, "queryProvisionals");
