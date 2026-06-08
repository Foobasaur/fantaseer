import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';
import { resolve } from '$app/paths';

const dependz = 'ebs:fantasy:get';
export const load: PageLoad = async ({ fetch, depends, params }) => {
  depends(dependz);
  const data = await ebs({ fetch, path: `/app/${params.game}/${params.mode}/fantasy` }).get<Server.EBS.Fantasy>();
  return { ...data, dependz };
};
