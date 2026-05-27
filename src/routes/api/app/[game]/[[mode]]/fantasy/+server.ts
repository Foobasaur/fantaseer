import { draft } from '$lib/server/ebs';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const mod = await draft();
  return json(await mod.fantasy());
};
