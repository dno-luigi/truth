async function handleProvisionalUpdate(request, env) {
  const body = await request.json().catch(() => ({}));
  const idOrInput = body.id || body.input;
  if (!idOrInput) {
    return new Response(JSON.stringify({ error: "id or input required" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  try {
    const rec = await updateProvisional(env, {
      idOrQuery: idOrInput,
      answer: body.answer,
      meta: body.meta || {}
    });
    await logEvent(env, "provisional_updated", {
      id: rec.id,
      layer: "provisional"
    });
    const resp = canonicalResponse({
      status: "ok",
      layer: "provisional",
      id: rec.id,
      query: rec.query,
      answer: rec.answer,
      source: rec.source || "provisional_truth",
      verified: false,
      provisional: true,
      eitl: rec.eitl || null,
      meta: {
        model: rec.model,
        confidence: clampProvisionalConfidence(rec.confidence),
        citations: rec.citations || [],
        created: rec.created,
        updated: rec.updated,
        qc_passed: rec.qc_passed === true
      }
    });
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: CORS_HEADERS
    });
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: CORS_HEADERS
      });
    }
    throw err;
  }
}
__name(handleProvisionalUpdate, "handleProvisionalUpdate");
__name2(handleProvisionalUpdate, "handleProvisionalUpdate");
