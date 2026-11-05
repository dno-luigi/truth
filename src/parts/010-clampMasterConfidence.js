function clampMasterConfidence(c) {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0.97;
  const clamped = Math.max(0.9, Math.min(1, n));
  return Number(clamped.toFixed(4));
}
__name(clampMasterConfidence, "clampMasterConfidence");
__name2(clampMasterConfidence, "clampMasterConfidence");
