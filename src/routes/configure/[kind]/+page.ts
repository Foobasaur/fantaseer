import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, params }) =>
  ebs({ fetch, path: `/configure/${params.kind}` }).get<Server.EBS.Configure>();
