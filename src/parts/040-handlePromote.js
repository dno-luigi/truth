async function handlePromote(request, env) {
  const body = await request.json().catch(() => ({}));
  const idOrInput = body.id || body.input;
  if (!idOrInput) {
    return new Response(JSON.stringify({ error: "id or input required" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  const prov = await getProvisional(env, idOrInput);
  if (!prov || !prov.answer) {
    return new Response(
      JSON.stringify({ error: "No provisional truth to promote" }),
      { status: 404, headers: CORS_HEADERS }
    );
  }
  const record = await setMaster(env, {
    query: prov.query || idOrInput,
    answer: prov.answer,
    editor: body.editor || "justice",
    meta: {
      literalVsMythos: body.literalVsMythos || "literal",
      model: body.model || prov.model || "justice-approved",
      confidence: body.confidence,
      eitlVerifier: body.eitlVerifier || body.editor || "justice",
      metadata: {
        ...prov.metadata || {},
        citations: prov.citations || [],
        promotedFrom: prov.id
      }
    }
  });
  await deleteProvisional(env, prov.id);
  await logEvent(env, "provisional_promoted", {
    id: record.id,
    layer: "master",
    from: prov.id
  });
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
      confidence: clampMasterConfidence(
        record.confidence
      ),
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
__name(handlePromote, "handlePromote");
__name2(handlePromote, "handlePromote");
