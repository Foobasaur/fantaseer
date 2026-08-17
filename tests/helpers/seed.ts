// ============================================================
// TYPES
// ============================================================

import Fetcher from '$lib/core/games/HS/common/cdn';
import { rando } from '$lib/utilz/numbaz';
import type { Server } from '@';
import {
  insertCategory,
  insertDrafts,
  insertEvents,
  insertGame,
  insertIdentioty,
  insertObserversBatched,
  insertPicks,
  insertPlayer,
  insertUser,
  insertViewer
} from './db';
import type { HS } from '$lib/core/games/HS/types';

// ============================================================
// CORE TYPES
// ============================================================

export type ViewerProfile = {
  type: 'high' | 'medium' | 'low' | 'inactive' | 'bot' | 'lucky';
  observeRate: number;
  pickRate: number;
  pickCorrectness: number;
};

export type ProfileCounts = Partial<Record<ViewerProfile['type'], number>>;

export interface GeneratedViewerProfile {
  viewerId: number;
  profile: ViewerProfile;
}

export type CategoryEntry = {
  id: number;
  gameId: number;
  mode: string;
};

export type ViewerProfileEntry = {
  viewerId: number;
  userId: string;
  profile: ViewerProfile;
};

export type PlayerEntry = Server.DB.Infertable['players'];

export type Counts = {
  playersPerCategory: number;
  profiles: ProfileCounts;
  events: {
    perPlayer: number;
    eventTypes: string[];
  };
  drafts: {
    perViewer: number;
    picksPerDraft: number;
  };
};

// ============================================================
// PROFILE CONFIGURATIONS
// ============================================================

export const gameEvents: HS.GameEventName[] = [
  // Player events
  'OnPlayerDraw',
  'OnPlayerGet',
  'OnPlayerPlay',
  'OnPlayerHandDiscard',
  'OnPlayerMulligan',
  'OnPlayerDeckDiscard',
  'OnPlayerPlayToDeck',
  'OnPlayerPlayToHand',
  'OnPlayerPlayToGraveyard',
  'OnPlayerCreateInDeck',
  'OnPlayerCreateInPlay',
  'OnPlayerJoustReveal',
  'OnPlayerDeckToPlay',
  'OnPlayerHeroPower',
  'OnPlayerFatigue',
  'OnPlayerMinionMouseOver',
  'OnPlayerHandMouseOver',
  'OnPlayerMinionAttack',

  // Opponent events
  'OnOpponentDraw',
  'OnOpponentGet',
  'OnOpponentPlay',
  'OnOpponentHandDiscard',
  'OnOpponentMulligan',
  'OnOpponentDeckDiscard',
  'OnOpponentPlayToDeck',
  'OnOpponentHandToDeck',
  'OnOpponentPlayToHand',
  'OnOpponentPlayToGraveyard',
  'OnOpponentSecretTriggered',
  'OnOpponentCreateInDeck',
  'OnOpponentCreateInPlay',
  'OnOpponentJoustReveal',
  'OnOpponentDeckToPlay',
  'OnOpponentHeroPower',
  'OnOpponentFatigue',
  'OnOpponentMinionMouseOver',
  'OnOpponentMinionAttack',

  // Entity events
  'OnEntityWillTakeDamage',

  // Game events
  'OnGameStart',
  'OnGameEnd',
  'OnGameWon',
  'OnGameLost',
  'OnGameTied',
  'OnInMenu',
  'OnTurnStart',
  'OnMouseOverOff',
  'OnModeChanged'
];
export const profileFixtures: Record<ViewerProfile['type'], ViewerProfile> = {
  high: { type: 'high', observeRate: 0.9, pickRate: 0.8, pickCorrectness: 0.85 },
  medium: { type: 'medium', observeRate: 0.6, pickRate: 0.5, pickCorrectness: 0.5 },
  low: { type: 'low', observeRate: 0.3, pickRate: 0.4, pickCorrectness: 0.25 },
  inactive: { type: 'inactive', observeRate: 0.1, pickRate: 0.05, pickCorrectness: 0.3 },
  bot: { type: 'bot', observeRate: 0.05, pickRate: 0.95, pickCorrectness: 0.2 },
  lucky: { type: 'lucky', observeRate: 0.8, pickRate: 0.3, pickCorrectness: 1.0 }
};

// export const counts: Counts = {
//   playersPerCategory: 1,
//   profiles: {
//     high: 2,
//     medium: 4,
//     low: 3,
//     inactive: 2,
//     bot: 6,
//     lucky: 1
//   },
//   events: {
//     perPlayer: 3,
//     eventTypes: gameEvents
//   },
//   drafts: {
//     perViewer: 2,
//     picksPerDraft: 3
//   },
//   predictions: {
//     perCategory: 2,
//     templates: ['DRAW_RARITY', 'DRAW_COST', 'NEXT_PLAY_TYPE']
//   }
// };

export const counts: Counts = {
  playersPerCategory: 1,
  profiles: {
    high: 1,
    medium: 1,
    low: 1,
    inactive: 1,
    bot: 1,
    lucky: 1
  },
  events: {
    perPlayer: 1,
    eventTypes: gameEvents
  },
  drafts: {
    perViewer: 1,
    picksPerDraft: 1
  }
};

/** @deprecated Use counts.profiles instead */
export const profileCounts = counts.profiles;

export const SEED_CONFIG = {
  games: [
    {
      name: 'Hearthsone',
      code: 'HS',
      description: 'Digital collectible card game'
    }
  ],

  categories: [
    {
      mode: 'Arena',
      draftables: ['TIME_TRAVEL', 'THE_LOST_CITY', 'EMERALD_DREAM', 'SPACE', 'ISLAND_VACATION', 'WHIZBANGS_WORKSHOP']
    },
    {
      mode: 'Standard',
      draftables: [
        'WHIZBANGS_WORKSHOP',
        'ISLAND_VACATION',
        'SPACE',
        'EMERALD_DREAM',
        'THE_LOST_CITY',
        'TIME_TRAVEL',
        'CORE',
        'EVENT'
      ]
    },
    {
      mode: 'Wild',
      draftables: [
        'NAXX',
        'GVG',
        'BRM',
        'TGT',
        'LOE',
        'OG',
        'KARA',
        'GANGS',
        'UNGORO',
        'ICECROWN',
        'LOOTAPALOOZA',
        'GILNEAS',
        'BOOMSDAY',
        'TROLL',
        'DALARAN',
        'ULDUM',
        'DRAGONS',
        'YEAR_OF_THE_DRAGON',
        'DEMON_HUNTER_INITIATE',
        'BLACK_TEMPLE',
        'SCHOLOMANCE',
        'DARKMOON_FAIRE',
        'THE_BARRENS',
        'STORMWIND',
        'ALTERAC_VALLEY',
        'THE_SUNKEN_CITY',
        'REVENDRETH',
        'PATH_OF_ARTHAS',
        'RETURN_OF_THE_LICH_KING',
        'WONDERS',
        'BATTLE_OF_THE_BANDS',
        'TITANS',
        'WILD_WEST',
        'WHIZBANGS_WORKSHOP',
        'ISLAND_VACATION',
        'SPACE',
        'EMERALD_DREAM',
        'THE_LOST_CITY',
        'TIME_TRAVEL',
        'CORE',
        'EVENT',
        'LEGACY'
      ]
    },
    { mode: 'Battlegrounds', draftables: ['BATTLEGROUNDS'] }
  ] as Array<{ mode: string; draftables: string[] }>,
  counts
} as const;

// ============================================================
// PURE GENERATORS (No DB, Unit Testable)
// ============================================================

export const generateViewerProfiles = (profileCounts: ProfileCounts): GeneratedViewerProfile[] => {
  const profiles: GeneratedViewerProfile[] = [];
  let viewerId = 1;

  for (const [profileType, count] of Object.entries(profileCounts)) {
    const type = profileType as ViewerProfile['type'];
    const profile = profileFixtures[type];
    for (let i = 0; i < (count ?? 0); i++) {
      profiles.push({ viewerId: viewerId++, profile });
    }
  }
  return profiles;
};

export const calculatePickCorrectness = (profile: ViewerProfile): boolean => Math.random() < profile.pickCorrectness;

export const shouldObserve = (profile: ViewerProfile): boolean => Math.random() < profile.observeRate;

export const shouldPick = (profile: ViewerProfile): boolean => Math.random() < profile.pickRate;

export const calculateDraftsToCreate = (profile: ViewerProfile, defaultCount: number) =>
  profile.type === 'inactive' ?
    Math.random() < 0.3 ?
      1
    : 0
  : defaultCount;

export const selectPickable = (
  willBeCorrect: boolean,
  availablePickables: string[],
  allPickables: string[],
  existingPicks: string[]
): string => {
  const availableFiltered = availablePickables.filter(p => !existingPicks.includes(p));
  const allFiltered = allPickables.filter(p => !existingPicks.includes(p));
  const sourcePool = willBeCorrect && availableFiltered.length > 0 ? availableFiltered : allFiltered;

  if (sourcePool.length === 0) {
    return allPickables[Math.floor(Math.random() * allPickables.length)];
  }
  return sourcePool[Math.floor(Math.random() * sourcePool.length)];
};

export const getAllPickablesFromConfig = async () => {
  const pickablesSet = new Map<string, string[]>();
  const pickables = await Fetcher();

  for (const category of SEED_CONFIG.categories) {
    const modePickables = pickables.cards
      .filter(card => card.set && category.draftables.includes(card.set as string))
      .map(card => card.id);
    pickablesSet.set(category.mode, modePickables);
  }
  return pickablesSet;
};

// ============================================================
// SEED STEPS (Use DB helpers)
// ============================================================

export const createGamesAndCategories = async () => {
  console.log('🎮 Creating games and categories...');
  const categoryMap = new Map<number, CategoryEntry>();

  let gameId = 0;
  for (const game of SEED_CONFIG.games) {
    const insertedGame = await insertGame(game);
    gameId = insertedGame.id;

    for (const category of SEED_CONFIG.categories) {
      const insertedCategory = await insertCategory({
        gameId,
        mode: category.mode
      });

      categoryMap.set(insertedCategory.id, {
        id: insertedCategory.id,
        gameId: insertedCategory.gameId,
        mode: insertedCategory.mode
      });
    }
  }

  console.log(`  ✓ Created ${SEED_CONFIG.games.length} game(s), ${categoryMap.size} categories`);
  return { gameId, categoryMap };
};

export const createUsersViewersPlayers = async (categoryMap: Map<number, CategoryEntry>) => {
  console.log('👤 Creating users, viewers, and players...');
  const viewerProfiles: ViewerProfileEntry[] = [];
  const playerMap = new Map<number, PlayerEntry[]>();

  for (const [categoryId] of categoryMap) {
    playerMap.set(categoryId, []);
  }

  // Create viewers
  for (const [profileType, count] of Object.entries(counts.profiles)) {
    for (let i = 0; i < (count ?? 0); i++) {
      const user = await insertUser();
      const identity = await insertIdentioty({
        userId: user.id,
        platform: 'mock',
        platformId: `viewer_${profileType}_${i + 1}`,
        meta: {
          opaqueId: `viewer_${profileType}_${i + 1}`,
          channelId: 'mock_channel',
          role: 'viewer',
          isLinked: true
        }
      });
      const viewer = await insertViewer({
        identityId: identity.id
      });

      viewerProfiles.push({
        viewerId: viewer.id,
        userId: user.id,
        profile: profileFixtures[profileType as ViewerProfile['type']]
      });
    }
  }

  // Create players
  for (const [categoryId] of categoryMap) {
    for (let i = 0; i < counts.playersPerCategory; i++) {
      const user = await insertUser();
      const identity = await insertIdentioty({
        userId: user.id,
        platform: 'mock',
        platformId: `player_${categoryId}_${i + 1}`,
        meta: {
          opaqueId: `player_${categoryId}_${i + 1}`,
          channelId: 'mock_channel',
          role: 'player',
          isLinked: true
        }
      });
      const player = await insertPlayer({
        identityId: identity.id
      });
      playerMap.get(categoryId)!.push(player);
    }
  }

  console.log(`  ✓ Created ${viewerProfiles.length} viewers, ${categoryMap.size * counts.playersPerCategory} players`);
  return { viewerProfiles, playerMap };
};

export const createEvents = async (
  categoryMap: Map<number, CategoryEntry>,
  playerMap: Map<number, PlayerEntry[]>,
  pickables: Map<string, string[]>
) => {
  console.log('📊 Creating events...');
  const eventList: Server.DB.Infertable<'Insert'>['events'][] = [];

  for (const [categoryId, category] of categoryMap) {
    for (const player of playerMap.get(categoryId)!) {
      for (let i = 0; i < counts.events.perPlayer; i++) {
        eventList.push({
          categoryId,
          playerId: player.id,
          eventable: rando.choice(counts.events.eventTypes),
          pickable: rando.choice(pickables.get(category.mode) ?? []),
          meta: null
        });
      }
    }
  }

  const inserted = await insertEvents(eventList);
  const mapping = new Map<number, Server.DB.Infertable['events'][]>();
  for (const [categoryId] of categoryMap) mapping.set(categoryId, []);
  for (const e of inserted) mapping.get(e.categoryId)!.push(e);

  console.log(`  ✓ Created ${inserted.length} events`);
  return mapping;
};

export const createDraftsAndPicks = async (
  categoryMap: Map<number, CategoryEntry>,
  playerProfiles: Map<number, PlayerEntry[]>,
  viewerProfiles: ViewerProfileEntry[],
  eventMap: Map<number, Server.DB.Infertable['events'][]>,
  pickables: Map<string, string[]>
) => {
  console.log('📝 Creating drafts and picks...');

  type DraftWithProfile = {
    categoryId: number;
    viewerId: number;
    playerId: number;
    _profile: ViewerProfile;
  };
  const draftData: DraftWithProfile[] = [];

  for (const { viewerId, profile } of viewerProfiles) {
    const draftsToCreate = calculateDraftsToCreate(profile, counts.drafts.perViewer);
    for (const [categoryId] of categoryMap) {
      for (let d = 0; d < draftsToCreate; d++) {
        draftData.push({
          playerId: rando.choice(playerProfiles.get(categoryId)!).id,
          categoryId,
          viewerId,
          _profile: profile
        });
      }
    }
  }

  const insertedDrafts = await insertDrafts(draftData.map(({ _profile, ...d }) => d));

  // Build mappings
  const draftMapping = new Map<number, Server.DB.Infertable['drafts'][]>();
  for (const [categoryId] of categoryMap) draftMapping.set(categoryId, []);
  for (const draft of insertedDrafts) draftMapping.get(draft.categoryId)!.push(draft);

  // Create picks
  const pickData: { draftId: number; pickable: string }[] = [];
  const pickMapping = new Map<number, Server.DB.Infertable['picks'][]>();

  for (let i = 0; i < insertedDrafts.length; i++) {
    const draft = insertedDrafts[i];
    const profile = draftData[i]._profile;
    pickMapping.set(draft.id, []);

    const categoryEvents = eventMap.get(draft.categoryId)!;
    const availablePickables = [...new Set(categoryEvents.map(e => e.pickable))];
    const allPickablesForMode = pickables.get(categoryMap.get(draft.categoryId)!.mode) ?? [];
    const existingPicks: string[] = [];

    for (let p = 0; p < counts.drafts.picksPerDraft; p++) {
      const willBeCorrect = calculatePickCorrectness(profile);
      const pickableId = selectPickable(willBeCorrect, availablePickables, allPickablesForMode, existingPicks);
      pickData.push({ draftId: draft.id, pickable: pickableId });
      existingPicks.push(pickableId);
    }
  }

  const insertedPicks = await insertPicks(pickData);
  for (const pick of insertedPicks) pickMapping.get(pick.draftId)!.push(pick);

  console.log(`  ✓ Created ${insertedDrafts.length} drafts, ${insertedPicks.length} picks`);
  return { draftMapping, pickMapping };
};

export const createObservers = async (
  viewerProfiles: ViewerProfileEntry[],
  eventMap: Map<number, Server.DB.Infertable['events'][]>
) => {
  console.log('👁️ Creating observer relationships...');

  const allEvents = [...eventMap.values()].flat();
  const observerData: { viewerId: number; eventId: number }[] = [];

  for (const { viewerId, profile } of viewerProfiles) {
    for (const event of allEvents) {
      if (shouldObserve(profile)) {
        observerData.push({ viewerId, eventId: event.id });
      }
    }
  }

  const inserted = await insertObserversBatched(observerData);

  const mapping = new Map<number, Server.DB.Infertable['observers'][]>();
  for (const { viewerId } of viewerProfiles) mapping.set(viewerId, []);
  for (const obs of inserted) mapping.get(obs.viewerId)!.push(obs);

  console.log(`  ✓ Created ${inserted.length} observer relationships`);
  return mapping;
};

// ============================================================
// ORCHESTRATOR
// ============================================================

export type SeedResult = {
  gameId: number;
  categoryMap: Map<number, CategoryEntry>;
  viewerProfiles: ViewerProfileEntry[];
  playerMap: Map<number, PlayerEntry[]>;
  eventMap: Map<number, Server.DB.Infertable['events'][]>;
  draftMapping: Map<number, Server.DB.Infertable['drafts'][]>;
  pickMapping: Map<number, Server.DB.Infertable['picks'][]>;
  observerMap: Map<number, Server.DB.Infertable['observers'][]>;
};

export const seedAll = async (): Promise<SeedResult> => {
  console.log('🌱 Starting comprehensive seed script...\n');

  const { gameId, categoryMap } = await createGamesAndCategories();
  const { viewerProfiles, playerMap } = await createUsersViewersPlayers(categoryMap);
  const pickables = await getAllPickablesFromConfig();
  const eventMap = await createEvents(categoryMap, playerMap, pickables);
  const { draftMapping, pickMapping } = await createDraftsAndPicks(
    categoryMap,
    playerMap,
    viewerProfiles,
    eventMap,
    pickables
  );
  const observerMap = await createObservers(viewerProfiles, eventMap);

  console.log('\n✅ Seed script completed successfully!');

  return {
    gameId,
    categoryMap,
    viewerProfiles,
    playerMap,
    eventMap,
    draftMapping,
    pickMapping,
    observerMap
  };
};
