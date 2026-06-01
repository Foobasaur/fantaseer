import { Resource } from 'sst';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as tables from './.sql/tables';

export const tablez = { ...tables } as const;

export const db = drizzle({
  connection: process.env.DATABASE_URL ?? {
    host: Resource.MyPostgres.host,
    port: Resource.MyPostgres.port,
    user: Resource.MyPostgres.username,
    password: Resource.MyPostgres.password,
    database: Resource.MyPostgres.database,
    ssl: false
  },
  relations: defineRelations(tables, r => ({
    games: {
      categories: r.many.categories()
    },
    categories: {
      game: r.one.games({ from: r.categories.gameId, to: r.games.id }),
      events: r.many.events(),
      pickaroos: r.many.pickaroos(),
      drafts: r.many.drafts(),
      pickems: r.many.pickems()
    },
    users: {
      identities: r.many.identities()
    },
    identities: {
      user: r.one.users({ from: r.identities.userId, to: r.users.id }),
      player: r.one.players({ from: r.identities.id, to: r.players.identityId }),
      viewer: r.one.viewers({ from: r.identities.id, to: r.viewers.identityId })
    },
    players: {
      identity: r.one.identities({ from: r.players.identityId, to: r.identities.id }),
      events: r.many.events(),
      pickaroos: r.many.pickaroos(),
      drafts: r.many.drafts(),
      pickems: r.many.pickems(),
      banned: r.many.banned()
    },
    viewers: {
      identity: r.one.identities({ from: r.viewers.identityId, to: r.identities.id }),
      drafts: r.many.drafts(),
      observers: r.many.observers(),
      pickems: r.many.pickems(),
      banned: r.many.banned()
    },
    banned: {
      player: r.one.players({ from: r.banned.playerId, to: r.players.id }),
      viewer: r.one.viewers({ from: r.banned.viewerId, to: r.viewers.id })
    },
    events: {
      category: r.one.categories({ from: r.events.categoryId, to: r.categories.id }),
      player: r.one.players({ from: r.events.playerId, to: r.players.id }),
      observers: r.many.observers(),
      pickaroos: r.many.pickaroos()
    },
    pickaroos: {
      category: r.one.categories({ from: r.pickaroos.categoryId, to: r.categories.id }),
      player: r.one.players({ from: r.pickaroos.playerId, to: r.players.id }),
      event: r.one.events({ from: r.pickaroos.outcomeId, to: r.events.id }),
      pickems: r.many.pickems()
    },
    drafts: {
      category: r.one.categories({ from: r.drafts.categoryId, to: r.categories.id }),
      viewer: r.one.viewers({ from: r.drafts.viewerId, to: r.viewers.id }),
      player: r.one.players({ from: r.drafts.playerId, to: r.players.id }),
      picks: r.many.picks()
    },
    picks: {
      draft: r.one.drafts({ from: r.picks.draftId, to: r.drafts.id })
    },
    observers: {
      viewer: r.one.viewers({ from: r.observers.viewerId, to: r.viewers.id }),
      event: r.one.events({ from: r.observers.eventId, to: r.events.id })
    },
    pickems: {
      category: r.one.categories({ from: r.pickems.categoryId, to: r.categories.id }),
      viewer: r.one.viewers({ from: r.pickems.viewerId, to: r.viewers.id }),
      player: r.one.players({ from: r.pickems.playerId, to: r.players.id }),
      pickaroo: r.one.pickaroos({ from: r.pickems.pickarooId, to: r.pickaroos.id })
    }
  }))
});
