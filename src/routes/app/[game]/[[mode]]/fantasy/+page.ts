import ebs from '$lib/svelted/ebs';
import type { PageLoad } from './$types';
export const load: PageLoad = o => ebs(o).get();
