async function handleKVStatus(env) {
  try {
    const [masterCount, provisionalCount, memoryCount, candidateCount, reviewCount] = await Promise.all([
      countKeys(env.MASTER_TRUTHS, KV_PREFIX_MASTER),
      countKeys(env.PROV_TRUTH, KV_PREFIX_PROV),
      countKeys(env.PROV_TRUTH, "truth:"),
      countKeys(env.PROV_TRUTH, "candidate:"),
      countKeys(env.MASTER_TRUTHS, "review:")
    ]);
    return new Response(
      JSON.stringify({
        masterCount,
        provisionalCount,
        memoryCount,
        candidateCount,
        reviewCount,
        namespaces: {
          masters: "master truths",
          memory: "Memoria"
        },
        proxyBound: !!env.PROXY,
        adminGated: !!env.ADMIN_KEY
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
__name(handleKVStatus, "handleKVStatus");
__name2(handleKVStatus, "handleKVStatus");
