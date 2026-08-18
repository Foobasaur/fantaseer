import { draft } from '$lib/server/ebs';
import { json } from '@sveltejs/kit';

const res = (method: keyof Returnz<typeof draft>) => async () => {
  const req = await draft();
  return json(await req[method]());
}

// GET — load draft entities
export const GET = res('new');

// POST — confirm draft picks (replaces form action `?/confirm`)
export const POST = res('post');
