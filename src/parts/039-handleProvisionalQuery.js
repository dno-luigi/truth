async function handleProvisionalQuery(request, env) {
  const url = new URL(request.url);
  const input = (url.searchParams.get("q") || "").trim();
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  if (input && input.length > 100) {
    return new Response(JSON.stringify({ error: "query too long" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  const results = await queryProvisionals(env, { query: input, limit });
  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: CORS_HEADERS
  });
}
__name(handleProvisionalQuery, "handleProvisionalQuery");
__name2(handleProvisionalQuery, "handleProvisionalQuery");
