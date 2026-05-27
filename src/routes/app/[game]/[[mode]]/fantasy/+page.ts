import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';
import { resolve } from '$app/paths';

const dependz = 'ebs:fantasy:get';
export const load: PageLoad = async ({ fetch, depends, params }) => {
  depends(dependz);
  const data = await ebs({ fetch, path: resolve('/app/[game]/[[mode]]/fantasy', { ...params }) }).get<Server.EBS.Fantasy>();
  return { ...data, dependz };
};
