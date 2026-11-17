// Ported from the 2026 site.
// Cloudflare Worker in front of the static assets, invoked only for .mp4
// requests (see run_worker_first in wrangler.jsonc). Workers static assets
// answer Range requests with the whole file (200), and iOS Safari refuses to
// play video from a server that can't return 206 Partial Content, so this
// slices the requested byte range itself. Everything else passes through.

import { parseRange } from "./range";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const rangeHeader = request.headers.get("Range");

    if (!rangeHeader || response.status !== 200 || request.method !== "GET") {
      return withHeaders(response, { "Accept-Ranges": "bytes" });
    }

    const body = await response.arrayBuffer();
    const size = body.byteLength;
    const range = parseRange(rangeHeader, size);

    if (!range) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }

    const headers = new Headers(response.headers);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(body.slice(range.start, range.end + 1), { status: 206, headers });
  },
};

function withHeaders(response: Response, extra: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
