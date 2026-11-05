async function handleMasterDelete(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!body.input) {
    return new Response(JSON.stringify({ error: "input required" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  const { id } = await deleteMaster(env, body.input);
  await logEvent(env, "master_deleted", { id, layer: "master" });
  if (env.JUSTICE) {
    env.JUSTICE.fetch("/notify/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, layer: "master" })
    }).catch(() => {
    });
  }
  return new Response(JSON.stringify({ success: true, id }), {
    status: 200,
    headers: CORS_HEADERS
  });
}
__name(handleMasterDelete, "handleMasterDelete");
__name2(handleMasterDelete, "handleMasterDelete");
