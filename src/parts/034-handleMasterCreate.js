async function handleMasterCreate(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!body.input || !body.answer) {
    return new Response(JSON.stringify({ error: "input and answer required" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  const record = await setMaster(env, {
    query: body.input,
    answer: body.answer,
    editor: body.editor || "justice",
    meta: body.meta || {}
  });
  await logEvent(env, "master_created", { id: record.id, layer: "master" });
  const resp = canonicalResponse({
    status: "ok",
    layer: "master",
    id: record.id,
    query: record.query,
    answer: record.answer,
    source: "master_truth",
    verified: true,
    provisional: false,
    eitl: {
      verifier: record.eitlVerifier || "justice",
      last_editor: record.editor || "justice"
    },
    meta: {
      literalVsMythos: record.literalVsMythos,
      model: record.model,
      confidence: clampMasterConfidence(record.confidence),
      citations: record.metadata && record.metadata.citations || [],
      created: record.created,
      updated: record.updated,
      qc_passed: true
    }
  });
  return new Response(JSON.stringify(resp), {
    status: 200,
    headers: CORS_HEADERS
  });
}
__name(handleMasterCreate, "handleMasterCreate");
__name2(handleMasterCreate, "handleMasterCreate");
