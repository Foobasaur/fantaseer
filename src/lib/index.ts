// place files you want to import through the `$lib` alias in this folder.
export * from '$lib/utilz/fscache';
export const fabio = [
  { route: '/app/[game]/[[mode]]', title: 'home', icon: '🕹️' },
  { route: '/app/[game]/[[mode]]/fantasy', title: 'fantasy', icon: '✨' },
  { route: '/app/[game]/[[mode]]/pickaroo', title: 'pickaroo', icon: '⚡' },
  { route: '/app/[game]/[[mode]]/scores', title: 'scores', icon: '🏆' }
] as const;