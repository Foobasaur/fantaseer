import { page } from '$app/state';
import { kappa } from '$lib/utilz/morph';

export const fabio = [
  { route: '/app/[game]/[[mode]]', slug: 'home', icon: '🕹️', tagline: 'Fantaseer' },
  { route: '/app/[game]/[[mode]]/fantasy', slug: 'fantasy', icon: '✨', tagline: 'Draft `em' },
  { route: '/app/[game]/[[mode]]/pickaroo', slug: 'pickaroo', icon: '⚡', tagline: 'Pick `em' },
  { route: '/app/[game]/[[mode]]/scores', slug: 'scores', icon: '🏆', tagline: 'Beat `em' }
] as const;

export const foobonic = (route?: (typeof fabio)[number]['route'] | (typeof fabio)[number]['slug']) => {
  const id = route || page.route.id;
  const item = fabio[fabio.findIndex(i => i.route === id || i.slug === id)] || fabio[0];
  return { ...item, title: kappa(item.slug) };
};
