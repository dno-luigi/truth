function masterCandidates(inputOrId) {
  const raw = String(inputOrId || "").trim();
  const ids = [normalizeId(raw), slugify(raw), slugify(raw.replace(/[-_]+/g, " "))];
  return [...new Set(ids.filter(Boolean))];
}
__name(masterCandidates, "masterCandidates");
__name2(masterCandidates, "masterCandidates");
