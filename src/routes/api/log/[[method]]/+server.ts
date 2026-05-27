import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, getClientAddress }) => {
  const body = await request.json().catch(() => ({}));
  console.error(
    Object.assign(new Error(`[client ${body.errorId}] ${body.route ?? body.href} → ${body.message}`), {
      ...body,
      params,
      clientIp: getClientAddress(),
      userAgent: request.headers.get('user-agent')
    })
  );
  return new Response(null, { status: 204 });
};
