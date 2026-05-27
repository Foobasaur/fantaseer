import { pickaroo } from '$lib/server/ebs';
import { json } from '@sveltejs/kit';

const request = async (method: 'get' | 'post') => {
  const mod = await pickaroo();
  return json(await mod[method]());
};
export const GET = () => request('get');
export const POST = () => request('post');
