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
