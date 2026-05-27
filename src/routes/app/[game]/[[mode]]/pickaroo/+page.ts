import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';

const dependz = 'ebs:pickaroo:get';
export const load: PageLoad = async ({ fetch, depends, params }) => {
  depends(dependz);
  const data = await ebs({ fetch, path: `/app/${params.game}/${params.mode}/pickaroo` }).get<Server.EBS.Predictachu>();
  return { ...data, dependz };
};
