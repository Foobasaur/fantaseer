import ebs from '$lib/svelted/ebs';
import { dependz } from '$lib/svelted/app';
import type { Server } from '@';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends, params }) => {
  depends(dependz.fantasy);
  return await ebs({ fetch, path: `/app/${params.game}/${params.mode}/fantasy` }).get<Server.EBS.Fantasy>();
};
