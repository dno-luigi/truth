var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
  "Content-Type": "application/json"
};
var KV_PREFIX_MASTER = "master:";
var KV_PREFIX_PROV = "provisional:";
var SPEC_VERSION = "v1";
function normalizeId(input) {
  if (!input || typeof input !== "string") return "unknown-query";
  let q = input.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
  const stemRules = {
    "\\brun(?:ning|s|n)?\\b": "run",
    "\\bprogram(?:ming|med)?\\b": "program",
    "\\bcode(?:d|ing)?\\b": "code",
    "\\bdevelop(?:ing|ed|ment)?\\b": "develop",
    "\\boptimiz(?:e|ation|ing|ed)?\\b": "optimize",
    "\\bcreat(?:e|ing|ed|ion)?\\b": "create",
    "\\bdebug(?:ging|ged)?\\b": "debug"
  };
  for (const pattern in stemRules) {
    const re = new RegExp(pattern, "gi");
    q = q.replace(re, stemRules[pattern]);
  }
  q = q.replace(/\s+/g, "-").substring(0, 100);
  if (q.length > 50) {
    const enc = new TextEncoder().encode(input);
    let hash = 0;
    for (const b of enc) {
      hash = (hash << 5) - hash + b | 0;
    }
    const short = (hash >>> 0).toString(16).substring(0, 8);
    q = q.substring(0, 80) + "-" + short;
  }
  return q || "unknown-query";
}
__name(normalizeId, "normalizeId");
__name2(normalizeId, "normalizeId");
function clampMasterConfidence(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0.97;
  const clamped = Math.max(0.9, Math.min(1, n));
  return Number(clamped.toFixed(4));
}
__name(clampMasterConfidence, "clampMasterConfidence");
__name2(clampMasterConfidence, "clampMasterConfidence");
function clampProvisionalConfidence(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0.5;
  const clamped = Math.min(0.8, Math.max(0, n));
  return Number(clamped.toFixed(4));
}
__name(clampProvisionalConfidence, "clampProvisionalConfidence");
__name2(clampProvisionalConfidence, "clampProvisionalConfidence");
function canonicalResponse({
  status = "ok",
  layer = "none",
  id,
  query = null,
  answer = null,
  source = "none",
  verified = false,
  provisional = false,
  eitl = null,
  meta = {},
  audit = null
}) {
  return {
    status,
    layer,
    id,
    query,
    answer,
    source,
    verified,
    provisional,
    eitl,
    meta: {
      literalVsMythos: meta.literalVsMythos ?? null,
      model: meta.model ?? null,
      confidence: meta.confidence ?? null,
      citations: meta.citations ?? [],
      created: meta.created ?? null,
      updated: meta.updated ?? null,
      qc_passed: meta.qc_passed ?? null,
      spec_version: meta.spec_version ?? SPEC_VERSION,
      reason: meta.reason ?? null
    },
    audit: audit ?? null
  };
}
__name(canonicalResponse, "canonicalResponse");
__name2(canonicalResponse, "canonicalResponse");
function missResponse(id, reason) {
  return canonicalResponse({
    status: "miss",
    layer: "none",
    id,
    source: "none",
    verified: false,
    provisional: false,
    meta: {
      reason,
      qc_passed: false
    }
  });
}
__name(missResponse, "missResponse");
__name2(missResponse, "missResponse");
async function logEvent(env, type, data) {
  try {
    if (!env.QC) return;
    const qcId = env.QC.idFromName("truth-qc");
    const stub = env.QC.get(qcId);
    await stub.fetch("https://qc.internal/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ts: Date.now(), ...data })
    });
  } catch (err) {
    console.warn(
      "QC log failed:",
      err && err.message ? err.message : String(err)
    );
  }
}
__name(logEvent, "logEvent");
__name2(logEvent, "logEvent");
function slugify(input) {
  return String(input || "").trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 100);
}
__name(slugify, "slugify");
__name2(slugify, "slugify");
function masterCandidates(inputOrId) {
  const raw = String(inputOrId || "").trim();
  const ids = [normalizeId(raw), slugify(raw), slugify(raw.replace(/[-_]+/g, " "))];
  return [...new Set(ids.filter(Boolean))];
}
__name(masterCandidates, "masterCandidates");
__name2(masterCandidates, "masterCandidates");
async function getMaster(env, inputOrId) {
  const ids = masterCandidates(inputOrId);
  for (const id of ids) {
    const raw = await env.MASTER_TRUTHS.get(KV_PREFIX_MASTER + id);
    if (!raw) continue;
    try {
      const rec = JSON.parse(raw);
      return {
        ...rec,
        id,
        created: Number(rec.created) || 0,
        updated: Number(rec.updated) || 0
      };
    } catch {
    }
  }
  try {
    const wanted = new Set(ids.map((id) => id.replace(/-/g, "")));
    const listed = await env.MASTER_TRUTHS.list({ prefix: KV_PREFIX_MASTER, limit: 500 });
    for (const key of listed.keys) {
      const bare = key.name.slice(KV_PREFIX_MASTER.length);
      if (!wanted.has(bare.replace(/-/g, ""))) continue;
      const raw = await env.MASTER_TRUTHS.get(key.name);
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw);
        return {
          ...rec,
          id: bare,
          created: Number(rec.created) || 0,
          updated: Number(rec.updated) || 0
        };
      } catch {
      }
    }
  } catch (e) {
    console.error("master scan failed", e.message);
  }
  return null;
}
__name(getMaster, "getMaster");
__name2(getMaster, "getMaster");
function matchTokens(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2).slice(0, 24);
}
__name(matchTokens, "matchTokens");
__name2(matchTokens, "matchTokens");
async function findMasterByText(env, input) {
  const want = matchTokens(input);
  if (want.length < 2) return null;
  let best = null;
  try {
    const listed = await env.MASTER_TRUTHS.list({ prefix: KV_PREFIX_MASTER, limit: 500 });
    const keys = listed.keys || [];
    for (let i = 0; i < keys.length; i += 25) {
      const chunk = keys.slice(i, i + 25);
      const values = await Promise.all(
        chunk.map((k) => env.MASTER_TRUTHS.get(k.name).catch(() => null))
      );
      chunk.forEach((k, j) => {
        const raw = values[j];
        if (!raw) return;
        let rec;
        try {
          rec = JSON.parse(raw);
        } catch {
          return;
        }
        if (!rec || !rec.answer) return;
        const bare = k.name.slice(KV_PREFIX_MASTER.length);
        const hay = new Set(matchTokens(`${rec.query || ""} ${bare.replace(/-/g, " ")}`));
        if (!hay.size) return;
        let hits = 0;
        for (const t of want) if (hay.has(t)) hits++;
        const score = hits / want.length;
        if (!best || score > best._score) {
          best = {
            ...rec,
            id: bare,
            query: rec.query,
            created: Number(rec.created) || 0,
            updated: Number(rec.updated) || 0,
            _score: score
          };
        }
      });
    }
  } catch (e) {
    console.error("master text scan failed", e.message);
  }
  return best && best._score >= 0.75 ? best : null;
}
__name(findMasterByText, "findMasterByText");
__name2(findMasterByText, "findMasterByText");
async function setMaster(env, { query, answer, editor, meta }) {
  const id = normalizeId(query);
  const key = KV_PREFIX_MASTER + id;
  const now = Date.now();
  const record = {
    id,
    query,
    answer,
    created: meta?.created ? Number(meta.created) : now,
    updated: now,
    editor: editor || "justice",
    source: "justice",
    verified: true,
    literalVsMythos: meta?.literalVsMythos || "literal",
    model: meta?.model || "justice-approved",
    confidence: clampMasterConfidence(meta?.confidence),
    eitlVerifier: meta?.eitlVerifier || editor || "justice",
    metadata: meta?.metadata || {}
  };
  await env.MASTER_TRUTHS.put(key, JSON.stringify(record));
  return record;
}
__name(setMaster, "setMaster");
__name2(setMaster, "setMaster");
async function updateMaster(env, {
  idOrQuery,
  answer,
  editor,
  meta,
  expectedVersion
}) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_MASTER + id;
  const raw = await env.MASTER_TRUTHS.get(key);
  if (!raw) {
    const e = new Error("NOT_FOUND");
    e.code = "NOT_FOUND";
    throw e;
  }
  const existing = JSON.parse(raw);
  existing.created = Number(existing.created) || 0;
  existing.updated = Number(existing.updated) || 0;
  if (expectedVersion && existing.version && existing.version !== expectedVersion) {
    const e = new Error("VERSION_CONFLICT");
    e.code = "VERSION_CONFLICT";
    e.current = existing;
    throw e;
  }
  const now = Date.now();
  const updated = {
    ...existing,
    id,
    answer: answer ?? existing.answer,
    updated: now,
    editor: editor || existing.editor || "justice",
    literalVsMythos: meta?.literalVsMythos || existing.literalVsMythos || "literal",
    model: meta?.model || existing.model || "justice-approved",
    confidence: meta?.confidence ? clampMasterConfidence(meta.confidence) : clampMasterConfidence(existing.confidence),
    eitlVerifier: meta?.eitlVerifier || existing.eitlVerifier || editor || "justice",
    metadata: {
      ...existing.metadata || {},
      ...meta?.metadata || {}
    },
    version: Number(now)
  };
  await env.MASTER_TRUTHS.put(key, JSON.stringify(updated));
  return updated;
}
__name(updateMaster, "updateMaster");
__name2(updateMaster, "updateMaster");
async function deleteMaster(env, idOrQuery) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_MASTER + id;
  await env.MASTER_TRUTHS.delete(key);
  return { id };
}
__name(deleteMaster, "deleteMaster");
__name2(deleteMaster, "deleteMaster");
async function getProvisional(env, inputOrId) {
  const id = normalizeId(inputOrId);
  if (!env.PROV_TRUTH) return null;
  const newKey = KV_PREFIX_PROV + id;
  const legacyKey = `truth:provisional:${id}`;
  let rawProv = await env.PROV_TRUTH.get(newKey);
  let key = newKey;
  if (!rawProv) {
    rawProv = await env.PROV_TRUTH.get(legacyKey);
    key = legacyKey;
  }
  if (!rawProv) return null;
  try {
    const rec = JSON.parse(rawProv);
    rec.created = Number(rec.created) || 0;
    rec.updated = Number(rec.updated) || 0;
    return { id, ...rec };
  } catch {
    return null;
  }
}
__name(getProvisional, "getProvisional");
__name2(getProvisional, "getProvisional");
async function setProvisional(env, {
  query,
  answer,
  source,
  model,
  confidence,
  citations,
  meta
}) {
  const id = normalizeId(query);
  const key = KV_PREFIX_PROV + id;
  const now = Date.now();
  const record = {
    id,
    query,
    answer,
    source: source || "proxy_ai_candidate",
    model: model || "proxy-model",
    confidence: clampProvisionalConfidence(confidence),
    citations: citations || [],
    created: meta?.created ? Number(meta.created) : now,
    updated: now,
    provisional: true,
    verified: false,
    qc_passed: meta?.qc_passed !== false
  };
  await env.PROV_TRUTH.put(key, JSON.stringify(record), {
    expirationTtl: 24 * 3600
  });
  return record;
}
__name(setProvisional, "setProvisional");
__name2(setProvisional, "setProvisional");
async function getMemory(env, inputOrId) {
  const id = normalizeId(inputOrId);
  if (!env.PROV_TRUTH) return null;
  const raw = await env.PROV_TRUTH.get("truth:" + id);
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw);
    rec.id = rec.id || id;
    rec.created = Number(rec.created || rec.timestamp) || 0;
    rec.updated = Number(rec.updated || rec.edited || rec.timestamp) || rec.created;
    return rec;
  } catch {
    return null;
  }
}
__name(getMemory, "getMemory");
__name2(getMemory, "getMemory");
async function updateProvisional(env, { idOrQuery, answer, meta }) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_PROV + id;
  const now = Date.now();
  const raw = await env.PROV_TRUTH.get(key);
  if (!raw) {
    if (!answer) {
      const e = new Error("NOT_FOUND");
      e.code = "NOT_FOUND";
      throw e;
    }
    const record = {
      id,
      query: idOrQuery,
      answer,
      source: "justice_manual",
      model: meta?.model || "manual",
      confidence: clampProvisionalConfidence(meta?.confidence),
      citations: meta?.citations || [],
      created: now,
      updated: now,
      provisional: true,
      verified: false,
      qc_passed: meta?.qc_passed !== false
    };
    await env.PROV_TRUTH.put(key, JSON.stringify(record), {
      expirationTtl: 24 * 3600
    });
    return record;
  }
  const existing = JSON.parse(raw);
  existing.created = Number(existing.created) || 0;
  existing.updated = Number(existing.updated) || 0;
  const updated = {
    ...existing,
    id,
    answer: answer ?? existing.answer,
    updated: now,
    confidence: clampProvisionalConfidence(
      meta?.confidence ?? existing.confidence
    ),
    citations: meta?.citations || existing.citations || [],
    qc_passed: meta?.qc_passed !== void 0 ? !!meta.qc_passed : existing.qc_passed
  };
  await env.PROV_TRUTH.put(key, JSON.stringify(updated), {
    expirationTtl: 24 * 3600
  });
  return updated;
}
__name(updateProvisional, "updateProvisional");
__name2(updateProvisional, "updateProvisional");
async function deleteProvisional(env, idOrQuery) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_PROV + id;
  await env.PROV_TRUTH.delete(key);
  return { id };
}
__name(deleteProvisional, "deleteProvisional");
__name2(deleteProvisional, "deleteProvisional");
async function queryProvisionals(env, { query, limit = 20 }) {
  const id = normalizeId(query);
  let keyPrefix = KV_PREFIX_PROV;
  if (id !== "unknown-query") keyPrefix = keyPrefix + id;
  const list = await env.PROV_TRUTH.list({ prefix: keyPrefix, limit: Number(limit) });
  const results = [];
  for (const meta of list.keys) {
    const raw = await env.PROV_TRUTH.get(meta.name);
    if (!raw) continue;
    try {
      let obj = JSON.parse(raw);
      obj.created = Number(obj.created) || 0;
      obj.updated = Number(obj.updated) || 0;
      obj.id = obj.id || normalizeId(obj.query);
      results.push(obj);
    } catch {
    }
  }
  return results;
}
__name(queryProvisionals, "queryProvisionals");
__name2(queryProvisionals, "queryProvisionals");
async function requestCandidateFromProxy(env, { id, query }) {
  if (!env.PROXY) throw new Error("PROXY service not bound");
  const spec = {
    id,
    query,
    spec_version: SPEC_VERSION,
    model: "mistralai/mistral-nemo",
    // must be present
    instruction: "You are a backend JSON generator. Return ONLY a valid JSON array of candidate truths matching the provided JSON Schema. No prose, no markdown, no extra keys.",
    schema: {
      type: "array",
      items: {
        type: "object",
        required: ["answer"],
        properties: {
          answer: { type: "string" },
          model: { type: "string" },
          confidence: { type: "number" },
          citations: { type: "array" }
        }
      }
    }
  };
  const res = await env.PROXY.fetch("https://ai-proxy/candidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(spec)
  });
  if (!res.ok) {
    throw new Error("PROXY error " + res.status);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("NO_CANDIDATE");
  }
  return data;
}
__name(requestCandidateFromProxy, "requestCandidateFromProxy");
__name2(requestCandidateFromProxy, "requestCandidateFromProxy");
var ADMIN_WRITE_PATHS = /* @__PURE__ */ new Set([
  "/api/truth/master/create",
  "/api/truth/master/update",
  "/api/truth/master/delete",
  "/api/truth/provisional/update",
  "/api/truth/provisional/delete",
  "/api/truth/promote"
]);
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
async function countKeys(kv, prefix) {
  let total = 0;
  let cursor;
  for (let page = 0; page < 50; page++) {
    const opts = prefix ? { prefix } : {};
    if (cursor) opts.cursor = cursor;
    const res = await kv.list(opts);
    total += res.keys.length;
    if (res.list_complete || !res.cursor || !res.keys.length) break;
    cursor = res.cursor;
  }
  return total;
}
__name(countKeys, "countKeys");
__name2(countKeys, "countKeys");
async function handleKVStatus(env) {
  try {
    const [masterCount, provisionalCount, memoryCount, candidateCount, reviewCount] = await Promise.all([
      countKeys(env.MASTER_TRUTHS, KV_PREFIX_MASTER),
      countKeys(env.PROV_TRUTH, KV_PREFIX_PROV),
      countKeys(env.PROV_TRUTH, "truth:"),
      countKeys(env.PROV_TRUTH, "candidate:"),
      countKeys(env.MASTER_TRUTHS, "review:")
    ]);
    return new Response(
      JSON.stringify({
        masterCount,
        provisionalCount,
        memoryCount,
        candidateCount,
        reviewCount,
        namespaces: {
          masters: "master truths",
          memory: "Memoria"
        },
        proxyBound: !!env.PROXY,
        adminGated: !!env.ADMIN_KEY
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
__name(handleKVStatus, "handleKVStatus");
__name2(handleKVStatus, "handleKVStatus");
var QCLogger = class {
  static {
    __name(this, "QCLogger");
  }
  static {
    __name2(this, "QCLogger");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.endsWith("/log") && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { type, ts, ...rest } = body || {};
      if (!type) {
        return new Response(
          JSON.stringify({ error: "type required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      const now = typeof ts === "number" ? ts : Date.now();
      const event = { type, ts: now, ...rest };
      const existing = await this.state.storage.get("events") || [];
      existing.push(event);
      if (existing.length > 1e3) {
        existing.splice(0, existing.length - 1e3);
      }
      await this.state.storage.put("events", existing);
      if (this.env.TBACKED) {
        try {
          const day = new Date(now).toISOString().slice(0, 10);
          const key = `qc-events/${day}.jsonl`;
          const line = JSON.stringify(event) + "\n";
          const existingObj = await this.env.TBACKED.head(
            key
          );
          if (existingObj) {
            const old = await this.env.TBACKED.get(key);
            const oldText = await old.text();
            await this.env.TBACKED.put(key, oldText + line);
          } else {
            await this.env.TBACKED.put(key, line);
          }
        } catch (e) {
          console.warn(
            "QCLogger R2 write failed:",
            e && e.message ? e.message : String(e)
          );
        }
      }
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (path.endsWith("/events") && request.method === "GET") {
      const events = await this.state.storage.get("events") || [];
      return new Response(
        JSON.stringify({ events }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    return new Response("Not found", { status: 404 });
  }
};
var worker_default = truthHandler;
export {
  QCLogger,
  worker_default as default
};
//# sourceMappingURL=worker.js.map