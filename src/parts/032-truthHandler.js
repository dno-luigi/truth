var truthHandler = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      const gate = adminRequired(env, request, path);
      if (gate) return gate;
      if (path === "/api/truth/resolve" && request.method === "POST") {
        return await handleResolve(request, env);
      }
      if (path === "/api/truth/master/create" && request.method === "POST") {
        return await handleMasterCreate(request, env);
      }
      if (path === "/api/truth/master/update" && request.method === "POST") {
        return await handleMasterUpdate(request, env);
      }
      if (path === "/api/truth/master/delete" && request.method === "POST") {
        return await handleMasterDelete(request, env);
      }
      if (path === "/api/truth/provisional/update" && request.method === "POST") {
        return await handleProvisionalUpdate(request, env);
      }
      if (path === "/api/truth/provisional/delete" && request.method === "POST") {
        return await handleProvisionalDelete(request, env);
      }
      if (path === "/api/truth/provisional/query" && request.method === "GET") {
        return await handleProvisionalQuery(request, env);
      }
      if (path === "/api/truth/promote" && request.method === "POST") {
        return await handlePromote(request, env);
      }
      if (path === "/debug/kv-status" && request.method === "GET") {
        return await handleKVStatus(env);
      }
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: CORS_HEADERS
      });
    } catch (err) {
      console.error("truth worker error:", err);
      return new Response(
        JSON.stringify({ error: err.message || "Internal error" }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }
};
