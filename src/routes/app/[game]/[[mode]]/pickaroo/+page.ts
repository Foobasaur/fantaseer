import { dependz } from '$lib/svelted/app';
import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends, params }) => {
  depends(dependz.pickaroo);
  return await ebs({ fetch, path: `/app/${params.game}/${params.mode}/pickaroo` }).get<Server.EBS.Predictachu>();
};
