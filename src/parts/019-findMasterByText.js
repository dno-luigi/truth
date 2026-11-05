async function findMasterByText(env, input) {
  const want = matchTokens(input);
  if (want.length < 2) return null;
  let best = null;
  try {
    const listed = await env.MASTER_TRUTHS.list({ prefix: KV_PREFIX_MASTER, limit: 500 });
    const keys = listed.keys || [];
    for (let i = 0; i < keys.length; i += 25) {
      const chunk = keys.slice(i, i + 25);
      const values = await Promise.all(
        chunk.map((k) => env.MASTER_TRUTHS.get(k.name).catch(() => null))
      );
      chunk.forEach((k, j) => {
        const raw = values[j];
        if (!raw) return;
        let rec;
        try {
          rec = JSON.parse(raw);
        } catch {
          return;
        }
        if (!rec || !rec.answer) return;
        const bare = k.name.slice(KV_PREFIX_MASTER.length);
        const hay = new Set(matchTokens(`${rec.query || ""} ${bare.replace(/-/g, " ")}`));
        if (!hay.size) return;
        let hits = 0;
        for (const t of want) if (hay.has(t)) hits++;
        const score = hits / want.length;
        if (!best || score > best._score) {
          best = {
            ...rec,
            id: bare,
            query: rec.query,
            created: Number(rec.created) || 0,
            updated: Number(rec.updated) || 0,
            _score: score
          };
        }
      });
    }
  } catch (e) {
    console.error("master text scan failed", e.message);
  }
  return best && best._score >= 0.75 ? best : null;
}
__name(findMasterByText, "findMasterByText");
__name2(findMasterByText, "findMasterByText");
