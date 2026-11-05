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
