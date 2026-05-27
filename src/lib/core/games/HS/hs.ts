import { strumbolize } from '$lib/utilz/morph';
import type { Game } from '@';
import type { CardClass, CardSet, CardType, Race, Rarity, SpellSchool } from './api/enums';
import type { Card, GameEventName, GameTagMechanic } from './types';

// UI-friendly transformations via morph.strumbolize
export const filtrations = {
  sets: strumbolize('Set', {
    CORE: 'Core',
    EVENT: 'Event',
    NAXX: 'Curse of Naxxramas',
    GVG: 'Goblins vs Gnomes',
    BRM: 'Blackrock Mountain',
    TGT: 'The Grand Tournament',
    LOE: 'League of Explorers',
    OG: 'Whispers of the Old Gods',
    KARA: 'One Night in Karazhan',
    GANGS: 'Mean Streets of Gadgetzan',
    UNGORO: "Journey to Un'Goro",
    ICECROWN: 'Knights of the Frozen Throne',
    LOOTAPALOOZA: 'Kobolds and Catacombs',
    GILNEAS: 'The Witchwood',
    BOOMSDAY: 'The Boomsday Project',
    TROLL: "Rastakhan's Rumble",
    DALARAN: 'Rise of Shadows',
    ULDUM: 'Saviors of Uldum',
    DRAGONS: 'Descent of Dragons',
    YEAR_OF_THE_DRAGON: "Galakrond's Awakening",
    DEMON_HUNTER_INITIATE: 'Demon Hunter Initiate',
    BLACK_TEMPLE: 'Ashes of Outland',
    SCHOLOMANCE: 'Scholomance Academy',
    DARKMOON_FAIRE: 'Madness at the Darkmoon Faire',
    THE_BARRENS: 'Forged In The Barrens',
    STORMWIND: 'United in Stormwind',
    ALTERAC_VALLEY: 'Fractured in Alterac Valley',
    THE_SUNKEN_CITY: 'Voyage to the Sunken City',
    REVENDRETH: 'Murder at Castle Nathria',
    PATH_OF_ARTHAS: 'Path of Arthas',
    RETURN_OF_THE_LICH_KING: 'March of the Lich King',
    WONDERS: 'Caverns of Time',
    BATTLE_OF_THE_BANDS: 'Festival of Legends',
    TITANS: 'TITANS',
    WILD_WEST: 'Showdown in the Badlands',
    WHIZBANGS_WORKSHOP: "Whizbang's Workshop",
    ISLAND_VACATION: 'Perils in Paradise',
    SPACE: 'The Great Dark Beyond',
    EMERALD_DREAM: 'Into the Emerald Dream',
    THE_LOST_CITY: 'The Lost City',
    TIME_TRAVEL: 'Across the Timeways',
    CATACLYSM: 'CATACLYSM',
    EXPERT1: 'Classic',
    LEGACY: 'Legacy',
    TB: 'Tavern Brawl',
    BATTLEGROUNDS: 'Battlegrounds',
    BASIC: 'Basic',
    VANILLA: 'VANILLA'
    // HOF: 'HOF',
    // SLUSH: 'SLUSH',
    // REWARD: 'REWARD',
    // TEST_TEMPORARY: '',
    // INVALID: '',
    // MISSIONS: '',
    // DEMO: '',
    // NONE: '',
    // CHEAT: '',
    // BLANK: '',
    // DEBUG_SP: '',
    // PROMO: '',
    // CREDITS: '',
    // HERO_SKINS: '',
    // OG_RESERVE: '',
    // KARA_RESERVE: '',
    // GANGS_RESERVE: '',
    // TB_DEV: '',
    // TAVERNS_OF_TIME: '',
    // WILD_EVENT: '',
    // WAILING_CAVERNS: '',
    // LETTUCE: '',
    // MERCENARIES_DEV: '',
    // PLACEHOLDER_202204: '',
    // TUTORIAL: '',
    // PET: '',
    // FP1: '',
    // PE1: '',
    // FP2: '',
    // PE2: '',
    // TEMP1: ''
  } satisfies Partial<Record<keyof typeof CardSet, string>>),
  classes: strumbolize('Class', {
    DEATHKNIGHT: 'Death Knight',
    DEMONHUNTER: 'Demon Hunter',
    DRUID: 'Druid',
    HUNTER: 'Hunter',
    MAGE: 'Mage',
    PALADIN: 'Paladin',
    PRIEST: 'Priest',
    ROGUE: 'Rogue',
    SHAMAN: 'Shaman',
    WARLOCK: 'Warlock',
    WARRIOR: 'Warrior',
    NEUTRAL: 'Neutral'
  } satisfies Partial<Record<keyof typeof CardClass, string>>), // Exclude 'Any' from class list,
  mechanics: strumbolize('Mechanic', {
    BATTLECRY: 'Battlecry',
    CHARGE: 'Charge',
    COMBO: 'Combo',
    COUNTER: 'Counter',
    DEATHRATTLE: 'Deathrattle',
    DISCOVER: 'Discover',
    DIVINE_SHIELD: 'Divine Shield',
    FREEZE: 'Freeze',
    IMMUNE: 'Immune',
    LIFESTEAL: 'Lifesteal',
    MINIATURIZE: 'Miniaturize',
    OVERLOAD: 'Overload',
    POISONOUS: 'Poisonous',
    QUEST: 'Quest',
    REBORN: 'Reborn',
    RUSH: 'Rush',
    SECRET: 'Secret',
    SIDEQUEST: 'Sidequest',
    SILENCE: 'Silence',
    SPELLPOWER: 'Spell Damage',
    SPELLBURST: 'Spellburst',
    STEALTH: 'Stealth',
    TAUNT: 'Taunt',
    TITAN: 'Titan',
    TRADEABLE: 'Tradeable',
    REWIND: 'Rewind',
    WINDFURY: 'Windfury'
  } satisfies Partial<Record<GameTagMechanic, string>>),
  types: {
    card: strumbolize('Card Type', {
      HERO: 'Hero',
      MINION: 'Minion',
      SPELL: 'Spell',
      WEAPON: 'Weapon',
      LOCATION: 'Location'
    } satisfies Partial<Record<keyof typeof CardType, string>>),
    minion: strumbolize('Minion Type', {
      ALL: 'All',
      BEAST: 'Beast',
      DEMON: 'Demon',
      DRAENEI: 'Draenei',
      DRAGON: 'Dragon',
      ELEMENTAL: 'Elemental',
      MECHANICAL: 'Mech',
      MURLOC: 'Murloc',
      NAGA: 'Naga',
      PIRATE: 'Pirate',
      QUILBOAR: 'Quilboar',
      TOTEM: 'Totem',
      UNDEAD: 'Undead'
    } satisfies Partial<Record<keyof typeof Race, string>>),
    spell: strumbolize('Spell School', {
      ARCANE: 'Arcane',
      FIRE: 'Fire',
      FROST: 'Frost',
      NATURE: 'Nature',
      HOLY: 'Holy',
      SHADOW: 'Shadow',
      FEL: 'Fel'
    } satisfies Partial<Record<keyof typeof SpellSchool, string>>),
    rarity: strumbolize('Rarity', {
      COMMON: 'Common',
      FREE: 'Free',
      RARE: 'Rare',
      EPIC: 'Epic',
      LEGENDARY: 'Legendary'
    } satisfies Partial<Record<keyof typeof Rarity, string>>)
  }
} as const;

// Battlegrounds configuration
export const battlegrounds = {
  units: strumbolize('Unit Type', {
    // HERO: 'Hero',
    // WORP_MINION: 'Timewarped',
    MINION: 'Minion',
    BATTLEGROUND_SPELL: 'Spell'
  }),
  tribes: strumbolize('Tribe', {
    BEAST: 'Beast',
    DEMON: 'Demon',
    DRAGON: 'Dragon',
    ELEMENTAL: 'Elemental',
    MECHANICAL: 'Mech',
    MURLOC: 'Murloc',
    NAGA: 'Naga',
    PIRATE: 'Pirate',
    QUILBOAR: 'Quilboar',
    UNDEAD: 'Undead'
  }), // Exclude 'All' from tribe list
  mechanics: strumbolize('Mechanic', {
    BATTLECRY: 'Battlecry',
    DEATHRATTLE: 'Deathrattle',
    AVENGE: 'Avenge',
    BACON_RALLY: 'Rally',
    DIVINE_SHIELD: 'Divine Shield',
    TAUNT: 'Taunt',
    END_OF_TURN_TRIGGER: 'End of Turn Trigger',
    START_OF_COMBAT: 'Start of Combat',
    REBORN: 'Reborn',
    CHOOSE_ONE: 'Choose One',
    MODULAR: 'Modular',
    VENOMOUS: 'Venomous'
  })
} as const;

// ============================================
// Type exports
// ============================================
export const MODES = ['Standard', 'Arena', 'Wild', 'Battlegrounds'] as const;
export type GameMode = (typeof MODES)[number];

export type HSC = Game.IGameClient<'HS'>;

export const hs: HSC = {
  code: 'HS',
  name: 'Hearthstone',
  scoreables(e) {
    const keys: Partial<Record<GameEventName, [string, Emoji]>> = {
      // OnEntityWillTakeDamage: ['damaged', '✊'],
      // OnPlayerDraw: ['drawn', '🫳'],
      // OnOpponentPlay: ['played', '👇'],
      // OnPlayerMinionAttack: ['attacked', '👊'],
      // OnOpponentMinionAttack: ['defended', '🤚']
      OnEntityWillTakeDamage: ['damaged', '🫨'], // 💥
      OnPlayerDraw: ['drawn', '🥏'],
      OnOpponentPlay: ['played', '🫳'], // 🎯
      OnPlayerMinionAttack: ['attacked', '⚔️'],
      OnOpponentMinionAttack: ['defended', '🛡️'],
      // OnPlayerGet: '',
      // OnPlayerPlay: '',
      // OnPlayerHandDiscard: '',
      // OnPlayerMulligan: '',
      // OnPlayerDeckDiscard: '',
      // OnPlayerPlayToDeck: '',
      // OnPlayerPlayToHand: '',
      // OnPlayerPlayToGraveyard: '',
      // OnPlayerCreateInDeck: '',
      // OnPlayerCreateInPlay: '',
      // OnPlayerJoustReveal: '',
      // OnPlayerDeckToPlay: '',
      // OnPlayerHeroPower: '',
      // OnPlayerFatigue: '',
      // OnPlayerMinionMouseOver: '',
      // OnPlayerHandMouseOver: '',
      // OnOpponentDraw: '',
      // OnOpponentGet: '',
      // OnOpponentHandDiscard: '',
      // OnOpponentMulligan: '',
      // OnOpponentDeckDiscard: '',
      // OnOpponentPlayToDeck: '',
      // OnOpponentHandToDeck: '',
      // OnOpponentPlayToHand: '',
      // OnOpponentPlayToGraveyard: '',
      // OnOpponentSecretTriggered: '',
      // OnOpponentCreateInDeck: '',
      // OnOpponentCreateInPlay: '',
      // OnOpponentJoustReveal: '',
      // OnOpponentDeckToPlay: '',
      // OnOpponentHeroPower: '',
      // OnOpponentFatigue: '',
      // OnOpponentMinionMouseOver: '',
      OnGameStart: ['starts', '💫']
      // OnGameEnd: ['ended', '🎬'],
      // OnGameWon: '',
      // OnGameLost: '',
      // OnGameTied: '',
      // OnInMenu: '',
      // OnTurnStart: '',
      // OnMouseOverOff: '',
      // OnModeChanged: ''
    };
    return keys[e as GameEventName];
  },
  scored(items) {
    return (items || []).map(e => {
      const [title, icon] = this.scoreables(e.eventable) ?? [e.eventable, '♾️'];
      return { ...e, scoreable: { title, icon } };
    });
  }
};
