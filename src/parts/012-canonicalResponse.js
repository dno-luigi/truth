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
