// carddefs.ts

export type LocString = Partial<Record<string, string>>;

export type Tag =
  | { enumID: number; name: string; type: 'Int'; value: number }
  | { enumID: number; name: string; type: 'Card'; value: number; cardID?: string }
  | { enumID: number; name: string; type: 'LocString'; value: LocString }
  | { enumID: number; name: string; type: 'String'; value: string };

export interface Entity {
  cardID: string;
  id: number;
  version: number;
  tags: Record<number, Tag>;
}

export interface CardDefs {
  build: number;
  entities: Entity[];
}

const ATTR_RE = /(\w+)="([^"]*)"/g;
const ENTITY_RE = /<Entity\s+([^>]+)>([\s\S]*?)<\/Entity>/g;
const TAG_SELF = /<Tag\s+([^>]+?)\/>/g;
const TAG_OPEN = /<Tag\s+([^>\/]+)>([\s\S]*?)<\/Tag>/g;
const LOC_CHILD = /<([A-Za-z]{2,8})>([\s\S]*?)<\/\1>/g;

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const parseAttrs = (s: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [, k, v] of s.matchAll(ATTR_RE)) out[k] = decode(v);
  return out;
};

const tagFromAttrs = (a: Record<string, string>): Tag => {
  const base = { enumID: Number(a.enumID), name: a.name };
  switch (a.type) {
    case 'Int':
      return { ...base, type: 'Int', value: Number(a.value) };
    case 'Card':
      return { ...base, type: 'Card', value: Number(a.value), cardID: a.cardID };
    default:
      return { ...base, type: 'String', value: a.value ?? '' };
  }
};

export const parse = (xml: string): CardDefs => {
  const build = Number(xml.match(/<CardDefs\s+build="(\d+)"/)?.[1] ?? 0);
  const entities: Entity[] = [];

  for (const [, attrStr, body] of xml.matchAll(ENTITY_RE)) {
    const attrs = parseAttrs(attrStr);
    const tags: Record<number, Tag> = {};

    for (const [, s] of body.matchAll(TAG_SELF)) {
      const a = parseAttrs(s);
      tags[Number(a.enumID)] = tagFromAttrs(a);
    }

    for (const [, s, inner] of body.replace(TAG_SELF, '').matchAll(TAG_OPEN)) {
      const a = parseAttrs(s);
      const value: LocString = {};
      for (const [, lang, text] of inner.matchAll(LOC_CHILD)) value[lang] = decode(text);
      tags[Number(a.enumID)] = { enumID: Number(a.enumID), name: a.name, type: 'LocString', value };
    }

    entities.push({
      cardID: attrs.CardID,
      id: Number(attrs.ID),
      version: Number(attrs.version),
      tags
    });
  }

  return { build, entities };
};

// accessors
export const getInt = (e: Entity, enumID: number) => {
  const t = e.tags[enumID];
  return t?.type === 'Int' ? t.value : undefined;
};

export const hasInts = (e: Entity, enumIDs: number[]) => enumIDs.filter(id => e.tags[id]?.type === 'Int').length;

export const getLoc = (e: Entity, enumID: number, lang = 'enUS'): string | undefined => {
  const t = e.tags[enumID];
  return t?.type === 'LocString' ? t.value[lang] : undefined;
};
