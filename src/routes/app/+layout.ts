import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { LayoutLoad } from './$types';
export const load: LayoutLoad = ({ fetch }) => ebs({ fetch, path: '/app' }).get<Server.EBS.Games>();
