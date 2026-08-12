import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';

const newz: Partial<Record<string, Server.EBS.Draft<'get'>>> = {};
export const load: PageLoad = async opts => {
  const req = ebs(opts);
  return (async mode => (mode ? (newz[mode] ??= await req.get()) : req.get()))(
    opts.untrack(() => opts.params.draft === 'new' && opts.params.mode)
  );
};
