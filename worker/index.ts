export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Example API route
    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Everything else = frontend
    return env.ASSETS.fetch(request);
  },
};
