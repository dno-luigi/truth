function adminRequired(env, request, path) {
  if (!env.ADMIN_KEY) return null;
  if (!ADMIN_WRITE_PATHS.has(path)) return null;
  const given = request.headers.get("x-admin-key") || "";
  if (given.length === env.ADMIN_KEY.length) {
    let diff = 0;
    for (let i = 0; i < given.length; i++) {
      diff |= given.charCodeAt(i) ^ env.ADMIN_KEY.charCodeAt(i);
    }
    if (diff === 0) return null;
  }
  return new Response(
    JSON.stringify({
      error: "admin_key_required",
      message: "Send the ADMIN_KEY in the x-admin-key header."
    }),
    { status: 401, headers: CORS_HEADERS }
  );
}
__name(adminRequired, "adminRequired");
__name2(adminRequired, "adminRequired");
