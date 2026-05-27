import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { games } from '$lib/server/ebs';

export const GET: RequestHandler = async () => {
  return json(await games());
};