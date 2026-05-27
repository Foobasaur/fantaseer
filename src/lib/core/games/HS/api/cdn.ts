// Hearthstone json API client with CDN URL construction
import { cached } from '$lib/utilz/fscache';
import type { Card, ICard, ImgResolution } from '../types';
import { FormatType, GameType } from './enums';
import { parse, type CardDefs } from './xdefs';

const art = (id: string, url = 'https://art.hearthstonejson.com/v1') => {
  const resolutions = ['256x', '512x', 'orig'];
  const urls = (path: string, { res = resolutions, fmt = 'png' } = {}) =>
    Object.fromEntries(res.map(r => [r, `${url}/${path}/${r}/${id}.${fmt}`])) as ImgResolution;
  return {
    tile: `${url}/tiles/${id}.webp`,
    art: urls('art/latest'),
    hero: urls('heroes/latest'),
    render: urls('render/latest/enUS', { res: resolutions.slice(0, -1) })
  };
};

export default async function ({
  api = 'https://api.hearthstonejson.com/v1/latest/enUS',
  xdefs = 'https://api.hearthstonejson.com/v1/latest/CardDefs.xml',
  legal = {
    arena: `https://hsreplay.net/api/v1/live/legal_cards/?game_type=${GameType.GT_UNDERGROUND_ARENA}&format_type=${FormatType.FT_WILD}`,
    standard: `https://hsreplay.net/api/v1/live/legal_cards/?game_type=${GameType.GT_RANKED}&format_type=${FormatType.FT_STANDARD}`,
    wild: `https://hsreplay.net/api/v1/live/legal_cards/?game_type=${GameType.GT_RANKED}&format_type=${FormatType.FT_WILD}`
  }
} = {}) {
  const [all, collectible] = await Promise.all(
    [`${api}/cards.json`, `${api}/cards.collectible.json`].map(async url =>
      cached(url.split('/').pop()!, async () => {
        const res = await fetch(url);
        const data = (await res.json()) as ICard[];
        return data.map(card => ({ ...card, img: art(card.id) }));
      })
    )
  );

  const [underground, standard, wild] = await Promise.all(
    [legal.arena, legal.standard, legal.wild].map(url =>
      cached(new URL(url).searchParams.get('game_type')! + new URL(url).searchParams.get('format_type'), async () => {
        const res = await fetch(url, { headers: { 'User-Agent': 'HDTPortable/1.0 (Unknown)' } });
        return (await res.json()) as string[];
      })
    )
  );

  const xcards =
    ['mock', 'extension'].includes(import.meta.env.VITE_TARGET) ?
      await cached('CardDefs', async () => {
        const res = await fetch(xdefs);
        return parse(await res.text());
      })
    : await (async () => {
        const { default: raw } = await import('../../../../../../.cache/CardDefs.json?raw');
        return JSON.parse(raw) as CardDefs;
      })();

  const cards = [...collectible, ...all].reduce((acc, card) => {
    const tail = card.id.split('_').pop() ?? '';
    if (/^\d+$/.test(tail) && !acc.some(c => card.id.startsWith(c.id))) acc.push(card);
    return acc;
  }, [] as Card[]);

  return { cards, xcards, underground, standard, wild };
}
