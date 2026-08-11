import { dependz } from '$lib/svelted/app';
import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { LayoutLoad } from './$types';

export const load = ({ fetch, depends, untrack, params }: Parameters<LayoutLoad>[0]) => {
  depends(dependz.app);
  const mode = untrack(() => params.mode);
  return ebs({ fetch, path: `/app/${params.game}${mode ? `/${mode}` : ''}` }).get<Server.EBS.Game>();
};