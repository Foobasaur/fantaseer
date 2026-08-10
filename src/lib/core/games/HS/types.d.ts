import type { Game } from '@';
import type {
  CardClass,
  CardSet,
  CardType,
  Faction,
  MultiClassGroup,
  Race,
  Rarity,
  SpellSchool
} from './api/enums';

export const MODES = ['Standard', 'Arena', 'Wild', 'Battlegrounds'] as const;
export type GameMode = (typeof MODES)[number];

export type GameResult = 'Win' | 'Loss' | 'Tie' | 'None';

/**
 * GameTag mechanics that can appear in the mechanics array
 */
export type GameTagMechanic =
  | 'REWIND'
  | 'ADJACENT_BUFF'
  | 'AI_MUST_PLAY'
  | 'APPEAR_FUNCTIONALLY_DEAD'
  | 'ADAPT'
  | 'AURA'
  | 'BATTLECRY'
  | 'CANT_ATTACK'
  | 'CANT_BE_TARGETED_BY_ABILITIES'
  | 'CANT_BE_TARGETED_BY_HERO_POWERS'
  | 'CHARGE'
  | 'CHOOSE_ONE'
  | 'COMBO'
  | 'COUNTER'
  | 'DEATHRATTLE'
  | 'DISCOVER'
  | 'DIVINE_SHIELD'
  | 'ENRAGED'
  | 'EVIL_GLOW'
  | 'FORGETFUL'
  | 'FREEZE'
  | 'IMMUNE'
  | 'INSPIRE'
  | 'JADE_GOLEM'
  | 'LIFESTEAL'
  | 'MORPH'
  | 'POISONOUS'
  | 'QUEST'
  | 'RECEIVES_DOUBLE_SPELLDAMAGE_BONUS'
  | 'RITUAL'
  | 'SECRET'
  | 'SILENCE'
  | 'STEALTH'
  | 'TAG_ONE_TURN_EFFECT'
  | 'TAUNT'
  | 'TOPDECK'
  | 'UNTOUCHABLE'
  | 'WINDFURY'
  | 'OVERLOAD'
  | 'SPELLPOWER'
  | 'AUTO_ATTACK'
  | 'RUSH'
  | 'ECHO'
  | 'MODULAR'
  | 'OVERKILL'
  | 'TWINSPELL'
  | 'MAGNETIC'
  | 'REBORN'
  | 'INVOKE'
  | 'SIDEQUEST'
  | 'SPELLBURST'
  | 'CORRUPT'
  | 'FRENZY'
  | 'TRADEABLE'
  | 'HONORABLE_KILL'
  | 'COLOSSAL'
  | 'DREDGE'
  | 'INFUSE'
  | 'MANATHIRST'
  | 'LOCATION'
  | 'FORGE'
  | 'TITAN'
  | 'QUICKDRAW'
  | 'EXCAVATE'
  | 'FINALE'
  | 'MINIATURIZE'
  | 'TOURIST'
  | 'ImmuneToSpellpower'
  | 'InvisibleDeathrattle';

/**
 * Represents the structure of a single Hearthstone card object
 * as returned by the HearthstoneJSON API. This interface ensures
 * that any data used in the application conforms to a predictable shape.
 */
export interface ICard {
  // Core identifiers
  id: string;
  dbfId: number;

  // Localized strings
  name: string;
  text?: string;
  flavor?: string;
  artist?: string;
  howToEarn?: string;
  howToEarnGolden?: string;
  // targetingArrowText?: string;

  // Enum-based attributes (non-localized)
  set: CardSet | string;
  cardClass: CardClass | string; // Allow string for flexibility with unknown values
  type: CardType | string;
  rarity?: Rarity | string;
  faction?: Faction | string;
  race?: Race | string;
  races?: (Race | string)[];
  spellSchool?: SpellSchool | string;

  // Collectibility
  collectible: boolean;

  // Numeric attributes
  cost?: number; // Mana cost (always shown except on hero and buff cards)
  attack?: number; // Attack value (always shown on minions and weapons)
  health?: number; // Health value (always shown for minions and heroes)
  durability?: number; // Durability value (always shown for weapons)
  armor?: number; // Armor value of heroes
  overload?: number; // Overload cost
  spellDamage?: number; // Spell damage bonus

  // Boolean flags
  elite?: boolean; // Legendary status (corresponds to rarity)
  hideStats?: boolean; // Whether to hide stats (cost, atk, health)

  // Multi-class support
  multiClassGroup?: MultiClassGroup | string;
  classes?: (CardClass | string)[];

  // Mechanics and tags
  mechanics?: (GameTagMechanic | string)[]; // GameTag boolean enums
  referencedTags?: (GameTagMechanic | string)[]; // Tags referenced by the card but not present on it

  // Play requirements
  playRequirements?: Record<string, number>; // Key-value pairs of PlayReq enums and their parameters

  // Entourage
  entourage?: string[]; // Array of card IDs representing the card's entourage pool

  // Additional metadata (for specific card types)
  collectionText?: string; // Text shown in collection (may differ from play text)
  targetingArrowText?: string; // Text when targeting with the card

  // Mercenaries mode specific (if applicable)
  mercenariesRole?: string;
  mercenariesAbilityCooldown?: number;

  // Battlegrounds specific (if applicable)
  battlegroundsHero?: boolean;
  battlegroundsPremiumDbfId?: number;
  battlegroundsNormalDbfId?: number;
  battlegroundsSkinParentId?: number;
  battlegroundsTimewarpCard?: string | number;
  techLevel?: number; // Battlegrounds tier

  // Duels and other mode specific
  duels?: {
    relevant?: boolean;
    constructed?: boolean;
  };
}

export type ImgResolution = { '256x': string; '512x': string; orig?: string };
export type Card = ICard & {
  img: {
    tile: string;
    render: ImgResolution;
    art: ImgResolution;
    hero: ImgResolution;
  };
};

export type Cards = { any: Card[]; collectible: Card[] };

export interface IGameStats {
  // Core properties
  gameId: string;
  deckId: string;
  deckName: string | null;
  deckNameAndVersion: string | null;

  // Game details
  playerHero: string | null;
  opponentHero: string | null;
  playerHeroCardId: string | null;
  playerHeroClasses: string[] | null;
  opponentHeroCardId: string | null;
  opponentHeroClasses: string[] | null;

  // Game state
  coin: boolean;
  gameMode: number; // GameMode enum
  result: GameResult; // GameResult enum
  turns: number;
  wasConceded: boolean;
  isClone: boolean;

  // Players
  playerName: string | null;
  opponentName: string | null;
  friendlyPlayerId: number;
  opponentPlayerId: number;

  // Timing
  startTime: string; // ISO date string
  endTime: string; // ISO date string

  // Ranking
  rank: number;
  starLevel: number;
  starLevelAfter: number;
  stars: number;
  starsAfter: number;
  legendRank: number;
  legendRankAfter: number;
  opponentRank: number;
  opponentStarLevel: number;
  opponentLegendRank: number;
  leagueId: number;
  starMultiplier: number;

  // Rating systems
  battlegroundsRating: number;
  battlegroundsRatingAfter: number;
  mercenariesRating: number;
  mercenariesRatingAfter: number;
  arenaRating: number | null;

  // Arena
  arenaWins: number;
  arenaLosses: number;
  arenaSeasonId: number;

  // Brawl
  brawlWins: number;
  brawlLosses: number;
  brawlSeasonId: number;

  // Mercenaries
  // mercenariesBountyRunId: string | null;
  // mercenariesBountyRunTurnsTaken: number;
  // mercenariesBountyRunCompletedNodes: number;
  // mercenariesBountyRunRewards: MercenariesCoinsEntry[] | null;

  // Battlegrounds
  // battlegroundsRaces: number[] | null; // HashSet<Race>
  // battlegroundsDetails: BattlegroundsLobbyDetails | null;

  // Cards
  // playerCards: TrackedCard[];
  // playerSideboards: Sideboard[];
  // opponentCards: TrackedCard[];

  // Metadata
  region: number; // Region enum
  format: number | null; // Format enum
  note: string | null;
  replayFile: string | null;
  // playerDeckVersion: SerializableVersion | null;
  hearthstoneBuild: number | null;

  // Server info
  playerCardbackId: number;
  opponentCardbackId: number;
  scenarioId: number;
  // serverInfo: GameServerInfo | null;
  isReconnect: boolean;
  gameType: number; // GameType enum
  rankedSeasonId: number;

  // HSReplay
  // hsReplay: HsReplayInfo;
  // hsDeckId: number;
}

// interface BattlegroundsLobbyDetails {
//   lobbyRawHeroDbfIds: number[];
//   friendlyPlayerEntityId: number | null;
//   friendlyRawHeroDbfId: number | null;
//   finalPlacement: number | null;
//   anomalyDbfId: number | null;
// }

// interface TrackedCard {
//   id: string;
//   count: number;
//   unconfirmed?: number;
// }

// interface Sideboard {
//   ownerCardId: string;
//   cards: Card[];
// }


// Game event payload types (referenced by GameEvents)
type CardPayload = { card: unknown }; // Replace 'unknown' with actual Card type when available
type AttackInfoPayload = { attacker: unknown; defender: unknown };
type PredamageInfoPayload = { entity: unknown; damage: number };
type FatiguePayload = { damage: number };
type ActivePlayerPayload = { player: 'player' | 'opponent' };
type ModePayload = { mode: string };
type NoPayload = Record<string, never>;

// Hearthstone game events mapped to their payload types
export type GameEvents = {
  // Player events
  OnPlayerDraw: CardPayload;
  OnPlayerGet: CardPayload;
  OnPlayerPlay: CardPayload;
  OnPlayerHandDiscard: CardPayload;
  OnPlayerMulligan: CardPayload;
  OnPlayerDeckDiscard: CardPayload;
  OnPlayerPlayToDeck: CardPayload;
  OnPlayerPlayToHand: CardPayload;
  OnPlayerPlayToGraveyard: CardPayload;
  OnPlayerCreateInDeck: CardPayload;
  OnPlayerCreateInPlay: CardPayload;
  OnPlayerJoustReveal: CardPayload;
  OnPlayerDeckToPlay: CardPayload;
  OnPlayerHeroPower: NoPayload;
  OnPlayerFatigue: FatiguePayload;
  OnPlayerMinionMouseOver: CardPayload;
  OnPlayerHandMouseOver: CardPayload;
  OnPlayerMinionAttack: AttackInfoPayload;

  // Opponent events
  OnOpponentDraw: NoPayload;
  OnOpponentGet: NoPayload;
  OnOpponentPlay: CardPayload;
  OnOpponentHandDiscard: CardPayload;
  OnOpponentMulligan: NoPayload;
  OnOpponentDeckDiscard: CardPayload;
  OnOpponentPlayToDeck: CardPayload;
  OnOpponentHandToDeck: CardPayload;
  OnOpponentPlayToHand: CardPayload;
  OnOpponentPlayToGraveyard: CardPayload;
  OnOpponentSecretTriggered: CardPayload;
  OnOpponentCreateInDeck: CardPayload;
  OnOpponentCreateInPlay: CardPayload;
  OnOpponentJoustReveal: CardPayload;
  OnOpponentDeckToPlay: CardPayload;
  OnOpponentHeroPower: NoPayload;
  OnOpponentFatigue: FatiguePayload;
  OnOpponentMinionMouseOver: CardPayload;
  OnOpponentMinionAttack: AttackInfoPayload;

  // Entity events
  OnEntityWillTakeDamage: PredamageInfoPayload;

  // Game events
  OnGameStart: NoPayload;
  OnGameEnd: NoPayload;
  OnGameWon: NoPayload;
  OnGameLost: NoPayload;
  OnGameTied: NoPayload;
  OnInMenu: NoPayload;
  OnTurnStart: ActivePlayerPayload;
  OnMouseOverOff: NoPayload;
  OnModeChanged: ModePayload;
};

// Utility types for working with game events
export type GameEventName = keyof GameEvents;
export type GameEventPayload<T extends GameEventName> = GameEvents[T];