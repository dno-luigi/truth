function matchTokens(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2).slice(0, 24);
}
__name(matchTokens, "matchTokens");
__name2(matchTokens, "matchTokens");
