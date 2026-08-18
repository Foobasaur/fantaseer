import type { Game } from '@';
import type { CardClass, CardSet, CardType, Faction, MultiClassGroup, Race, Rarity, SpellSchool } from './common/enums';

export namespace HS {
  const MODES = ['Standard', 'Arena', 'Wild', 'Battlegrounds'] as const;
  type Mode = (typeof MODES)[number];

  /**
   * Represents the structure of a single Hearthstone card object
   * as returned by the HearthstoneJSON API. This interface ensures
   * that any data used in the application conforms to a predictable shape.
   */
  interface ICard {
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

    // Mechanics and tags that can appear @https://hearthstonejson.com/docs/cards.html
    mechanics?: string[]; // GameTag boolean enums
    referencedTags?: string[]; // Tags referenced by the card but not present on it

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

  type ImgResolution = { '256x': string; '512x': string; orig?: string };
  type Card = ICard & {
    img: {
      tile: string;
      render: ImgResolution;
      art: ImgResolution;
      hero: ImgResolution;
    };
  };

  type Cards = { any: Card[]; collectible: Card[] };

  // Game event payload types (referenced by GameEvents)

  // Hearthstone game events mapped to their payload types
  interface GameEvents<
    CardPayload = { card: unknown },
    AttackInfoPayload = { attacker: unknown; defender: unknown },
    PredamageInfoPayload = { entity: unknown; damage: number },
    FatiguePayload = { damage: number },
    ActivePlayerPayload = { player: 'player' | 'opponent' },
    ModePayload = { mode: string },
    NoPayload = Record<string, never>
  > {
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
  }

  // Utility types for working with game events
  type GameEventName = keyof GameEvents;
  type GameEventPayload<T extends GameEventName> = GameEvents[T];
}
