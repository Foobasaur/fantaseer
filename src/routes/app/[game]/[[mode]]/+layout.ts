import ebs from '$lib/svelted/ebs';
import type { LayoutLoad } from './$types';
export const load: LayoutLoad = ({ fetch, depends, untrack, params, route }) => {
 const mode = untrack(() => params.mode);
  return ebs({ path: `/app/${params.game}${mode ? `/${mode}` : ''}`, fetch, depends, route }).get();
};
