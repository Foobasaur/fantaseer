import { draft } from '$lib/server/ebs';
import { json } from '@sveltejs/kit';

// GET — load draft entities
export const GET = async () => {
  const req = await draft();
  return json(await req.get());
};
