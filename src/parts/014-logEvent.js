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
