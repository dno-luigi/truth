async function handleProvisionalDelete(request, env) {
  const body = await request.json().catch(() => ({}));
  const idOrInput = body.id || body.input;
  if (!idOrInput) {
    return new Response(JSON.stringify({ error: "id or input required" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  const { id } = await deleteProvisional(env, idOrInput);
  await logEvent(env, "provisional_deleted", {
    id,
    layer: "provisional"
  });
  if (env.JUSTICE) {
    env.JUSTICE.fetch("/notify/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, layer: "provisional" })
    }).catch(() => {
    });
  }
  return new Response(JSON.stringify({ success: true, id }), {
    status: 200,
    headers: CORS_HEADERS
  });
}
__name(handleProvisionalDelete, "handleProvisionalDelete");
__name2(handleProvisionalDelete, "handleProvisionalDelete");
