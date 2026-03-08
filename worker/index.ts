export interface Env {
  ASSETS: Fetcher;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Test route
    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    // GET current user
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return json({ message: "Not implemented yet" }, 501);
    }

    // Login
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      return json({ message: "Not implemented yet" }, 501);
    }

    // Register
    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      return json({ message: "Not implemented yet" }, 501);
    }

    // Logout
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return json({ success: true });
    }

    return env.ASSETS.fetch(request);
  },
};
