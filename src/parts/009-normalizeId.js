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
