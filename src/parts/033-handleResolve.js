async function handleResolve(request, env) {
  const body = await request.json().catch(() => ({}));
  const input = (body.input || "").trim();
  if (!input) {
    return new Response(JSON.stringify({ error: "input required" }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }
  const id = normalizeId(input);
  const master = await getMaster(env, input);
  if (master && master.answer) {
    const resp = canonicalResponse({
      status: "ok",
      layer: "master",
      id: master.id,
      query: master.query || input,
      answer: master.answer,
      source: "master_truth",
      verified: true,
      provisional: false,
      eitl: {
        verifier: master.eitlVerifier || master.editor || "justice",
        last_editor: master.editor || "justice"
      },
      meta: {
        literalVsMythos: master.literalVsMythos || "literal",
        model: master.model || "justice-approved",
        confidence: clampMasterConfidence(master.confidence),
        citations: master.metadata && master.metadata.citations || [],
        created: master.created,
        updated: master.updated,
        qc_passed: true
      }
    });
    await logEvent(env, "master_hit", { id: master.id, layer: "master" });
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: CORS_HEADERS
    });
  }
  const textMaster = await findMasterByText(env, input);
  if (textMaster && textMaster.answer) {
    const resp = canonicalResponse({
      status: "ok",
      layer: "master",
      id: textMaster.id,
      query: textMaster.query || input,
      answer: textMaster.answer,
      source: "master_truth",
      verified: true,
      provisional: false,
      eitl: {
        verifier: textMaster.eitlVerifier || textMaster.editor || "justice",
        last_editor: textMaster.editor || "justice"
      },
      meta: {
        literalVsMythos: textMaster.literalVsMythos || "literal",
        model: textMaster.model || "justice-approved",
        confidence: clampMasterConfidence(textMaster.confidence),
        citations: textMaster.metadata && textMaster.metadata.citations || [],
        created: textMaster.created,
        updated: textMaster.updated,
        qc_passed: true,
        match: "text",
        matched_query: textMaster.query || textMaster.id,
        score: textMaster._score
      }
    });
    await logEvent(env, "master_text_hit", {
      id: textMaster.id,
      score: textMaster._score
    });
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: CORS_HEADERS
    });
  }
  const prov = await getProvisional(env, input);
  if (prov && prov.answer) {
    const resp = canonicalResponse({
      status: "ok",
      layer: "provisional",
      id: prov.id,
      query: prov.query || input,
      answer: prov.answer,
      source: prov.source || "provisional_truth",
      verified: false,
      provisional: true,
      eitl: prov.eitl || null,
      meta: {
        model: prov.model || "proxy-model",
        confidence: clampProvisionalConfidence(prov.confidence),
        citations: prov.citations || [],
        created: prov.created,
        updated: prov.updated,
        qc_passed: prov.qc_passed === true
      }
    });
    await logEvent(env, "provisional_hit", {
      id: prov.id,
      layer: "provisional"
    });
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: CORS_HEADERS
    });
  }
  const memory = await getMemory(env, input);
  if (memory && memory.answer) {
    const resp = canonicalResponse({
      status: "ok",
      layer: "provisional",
      id: memory.id,
      query: input,
      answer: memory.answer,
      source: "memory_truth",
      verified: false,
      provisional: true,
      eitl: null,
      meta: {
        model: memory.model || null,
        confidence: clampProvisionalConfidence(memory.confidence),
        citations: memory.citations || [],
        created: memory.created,
        updated: memory.updated,
        qc_passed: memory.qc_passed === true
      }
    });
    await logEvent(env, "memory_hit", { id: memory.id, layer: "memory" });
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: CORS_HEADERS
    });
  }
  try {
    await logEvent(env, "candidate_requested", { id, layer: "none" });
    const candidates = await requestCandidateFromProxy(env, {
      id,
      query: input
    });
    const cand = candidates[0];
    if (!cand || typeof cand.answer !== "string" || !cand.answer.trim()) {
      throw new Error("INVALID_CANDIDATE");
    }
    const rec = await setProvisional(env, {
      query: input,
      answer: cand.answer.trim(),
      source: "proxy_ai_candidate",
      model: cand.model,
      confidence: cand.confidence,
      citations: Array.isArray(cand.citations) ? cand.citations : [],
      meta: { qc_passed: true }
    });
    await logEvent(env, "provisional_created", {
      id: rec.id,
      layer: "provisional"
    });
    if (env.JUSTICE) {
      env.JUSTICE.fetch("/notify/provisional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rec.id,
          query: rec.query,
          created: rec.created
        })
      }).catch(() => {
      });
    }
    const resp = canonicalResponse({
      status: "ok",
      layer: "provisional",
      id: rec.id,
      query: rec.query,
      answer: rec.answer,
      source: rec.source,
      verified: false,
      provisional: true,
      eitl: null,
      meta: {
        model: rec.model,
        confidence: rec.confidence,
        citations: rec.citations,
        created: rec.created,
        updated: rec.updated,
        qc_passed: true
      }
    });
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: CORS_HEADERS
    });
  } catch (err) {
    console.error("candidate flow error:", err.message || err);
    await logEvent(env, "candidate_failed", {
      id,
      layer: "none",
      error: err.message || String(err)
    });
    const miss = missResponse(
      id,
      "no_master_memory_or_provisional_and_no_valid_candidate"
    );
    return new Response(JSON.stringify(miss), {
      status: 200,
      headers: CORS_HEADERS
    });
  }
}
__name(handleResolve, "handleResolve");
__name2(handleResolve, "handleResolve");
