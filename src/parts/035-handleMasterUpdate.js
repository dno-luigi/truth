async function handleMasterUpdate(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!body.input || !body.answer) {
    return new Response(JSON.stringify({ error: "input and answer required" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  try {
    const record = await updateMaster(env, {
      idOrQuery: body.input,
      answer: body.answer,
      editor: body.editor || "justice",
      meta: body.meta || {},
      expectedVersion: body.expectedVersion
    });
    await logEvent(env, "master_updated", {
      id: record.id,
      layer: "master"
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
  } catch (err) {
    if (err.code === "VERSION_CONFLICT") {
      return new Response(
        JSON.stringify({
          error: "VERSION_CONFLICT",
          current: err.current
        }),
        { status: 409, headers: CORS_HEADERS }
      );
    }
    if (err.code === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: CORS_HEADERS
      });
    }
    throw err;
  }
}
__name(handleMasterUpdate, "handleMasterUpdate");
__name2(handleMasterUpdate, "handleMasterUpdate");
