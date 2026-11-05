function clampProvisionalConfidence(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0.5;
  const clamped = Math.min(0.8, Math.max(0, n));
  return Number(clamped.toFixed(4));
}
__name(clampProvisionalConfidence, "clampProvisionalConfidence");
__name2(clampProvisionalConfidence, "clampProvisionalConfidence");
