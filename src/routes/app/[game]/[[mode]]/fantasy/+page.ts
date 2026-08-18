import ebs from '$lib/common/ebs';
import type { PageLoad } from './$types';
export const load: PageLoad = o => ebs(o).get();
