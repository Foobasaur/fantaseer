import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';

const dependz = 'ebs:draft:get';
export const load: PageLoad = async ({ fetch, depends, params }) => {
  depends(dependz);
  const data = await ebs({ fetch, path: `/app/${params.game}/${params.mode}/fantasy/${params.draft}` }).get<
    Server.EBS.Draft<'get'>
  >();
  return { ...data, dependz };
};
