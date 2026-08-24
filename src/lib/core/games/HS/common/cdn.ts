import { cached } from '$lib/server/fscache';
import type { HS } from '@';

import { FormatType, GameTag, GameType } from './enums';
import { parse } from './xdefs';

export default async function ({
  api = 'https://api.hearthstonejson.com/v1/latest/enUS',
  xdefs = 'https://api.hearthstonejson.com/v1/latest/CardDefs.xml',
  legal = {
    arena: `https://hsreplay.net/api/v1/live/legal_cards/?game_type=${GameType.GT_UNDERGROUND_ARENA}&format_type=${FormatType.FT_WILD}`,
    standard: `https://hsreplay.net/api/v1/live/legal_cards/?game_type=${GameType.GT_RANKED}&format_type=${FormatType.FT_STANDARD}`
  }
} = {}) {
  const resolutions = ['256x', '512x', 'orig'];
  const [all, collectible] = await Promise.all(
    [`${api}/cards`, `${api}/cards.collectible`].map(url =>
      cached(url.split('/').pop()!, async () => {
        const res = await fetch(url + '.json');
        const data = (await res.json()) as HS.ICard[];
        return data.map(card => {
          const art = (url = 'https://art.hearthstonejson.com/v1') => {
            const urls = (path: string, { res = resolutions, fmt = 'png' } = {}) =>
              Object.fromEntries(res.map(r => [r, `${url}/${path}/${r}/${card.id}.${fmt}`])) as HS.ImgResolution;
            return {
              tile: `${url}/tiles/${card.id}.webp`,
              art: urls('art/latest'),
              hero: urls('heroes/latest'),
              render: urls('render/latest/enUS', { res: resolutions.slice(0, -1) })
            };
          };
          return { ...card, img: art() };
        });
      })
    )
  );

  const Wild = collectible.filter(c => !['HERO_SKINS', 'CORE_HIDDEN', 'EVENT'].includes(c.set as string)).map(c => c.id);
  const [Arena, Standard] = await Promise.all(
    Object.entries(legal).map(([k, v]) =>
      cached(k, async () => {
        const res = await fetch(v, { headers: { 'User-Agent': 'HDTPortable/1.0 (Unknown)' } });
        return (await res.json()) as string[];
      })
    )
  );
  const Battlegrounds = await cached('battlegrounds', async () => {
    const res = await fetch(xdefs);
    const defs = parse(await res.text(), [
      GameTag.BACON_HERO_CAN_BE_DRAFTED,
      GameTag.BACON_TIMEWARPED,
      GameTag.IS_BACON_POOL_MINION,
      GameTag.IS_BACON_POOL_SPELL
    ]);
    return defs.entities.map(e => e.cardID);
  });
  return {
    Wild,
    Arena,
    Standard,
    Battlegrounds,
    cards: [...collectible, ...all].reduce((acc, card) => {
      const tail = card.id.split('_').pop() ?? '';
      if (/^\d+$/.test(tail) && !acc.some(c => card.id.startsWith(c.id))) acc.push(card);
      return acc;
    }, [] as HS.Card[])
  };
}
