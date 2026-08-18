import ebs from '$lib/common/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';

const newz: Partial<Record<string, Promise<Server.EBS.Draft<'new'>>>> = {};
export const load: PageLoad = async opts => {
  const req = (newz[opts.params.mode ?? 'all'] ??= ebs(opts).get()).then(res => res);
  req.catch(()=>{});
  return { req };
};
