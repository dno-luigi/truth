async function getMaster(env, inputOrId) {
  const ids = masterCandidates(inputOrId);
  for (const id of ids) {
    const raw = await env.MASTER_TRUTHS.get(KV_PREFIX_MASTER + id);
    if (!raw) continue;
    try {
      const rec = JSON.parse(raw);
      return {
        ...rec,
        id,
        created: Number(rec.created) || 0,
        updated: Number(rec.updated) || 0
      };
    } catch {
    }
  }
  try {
    const wanted = new Set(ids.map((id) => id.replace(/-/g, "")));
    const listed = await env.MASTER_TRUTHS.list({ prefix: KV_PREFIX_MASTER, limit: 500 });
    for (const key of listed.keys) {
      const bare = key.name.slice(KV_PREFIX_MASTER.length);
      if (!wanted.has(bare.replace(/-/g, ""))) continue;
      const raw = await env.MASTER_TRUTHS.get(key.name);
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw);
        return {
          ...rec,
          id: bare,
          created: Number(rec.created) || 0,
          updated: Number(rec.updated) || 0
        };
      } catch {
      }
    }
  } catch (e) {
    console.error("master scan failed", e.message);
  }
  return null;
}
__name(getMaster, "getMaster");
__name2(getMaster, "getMaster");
