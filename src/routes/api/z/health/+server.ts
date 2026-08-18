// src/routes/api/z/health/+server.ts — base API endpoint
import { json } from '@sveltejs/kit';

export const GET = () =>
  json({
    ok: true,
    service: 'z/health',
    now: new Date().toISOString(),
    probes: ['/z/health', '/z/health/stream', '/api/z/health/stream']
  });
