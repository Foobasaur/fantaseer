// src/routes/api/z/health/stream/+server.ts
export const GET = () => {
  const enc = new TextEncoder();
  const t0 = Date.now();
  const stream = new ReadableStream({
    async start(c) {
      for (let i = 1; i <= 9; i++) {
        c.enqueue(enc.encode(`chunk ${i} +${Date.now() - t0}ms\n`));
        await new Promise((r) => setTimeout(r, 600));
      }
      c.close();
    }
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
  });
};