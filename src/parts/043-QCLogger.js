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
