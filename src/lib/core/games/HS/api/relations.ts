// Static card ID constants organized by class (from HearthDb.CardIds)

export const CardIds = {
  // Death Knight
  Deathknight: {
    TalanjiOfTheGraves: 'CORE_TTN_862',
    TalanjiOfTheGraves_BwonsamdiToken: 'TTN_862t',
    TalanjiOfTheGraves_WhatBefellZandalarToken: 'TTN_862t2',
    TalanjiOfTheGraves_BoonOfPowerToken: 'TTN_862t3',
    TalanjiOfTheGraves_BoonOfLongevityToken: 'TTN_862t4',
    TalanjiOfTheGraves_BoonOfSpeedToken: 'TTN_862t5'
  },

  // Druid
  Druid: {
    KiriChosenOfElune: 'BAR_536',
    SolarEclipse: 'BAR_533',
    LunarEclipse: 'BAR_534',
    SkyscreamerEggs_SkyscreamerHatchlingToken: 'WW_001t',
    RavenousFlock: 'WW_001'
  },

  // Hunter
  Hunter: {},

  // Mage
  Mage: {
    Rewind: 'REV_938'
  },

  // Neutral
  Neutral: {
    ArchdruidNaralex: 'BAR_720',
    DaUndatakah: 'TRL_541',
    Shaladrassil: 'WW_091',
    StarlightWhelp: 'DRG_035',
    VelenLeaderOfTheExiled: 'DEEP_011',
    ZilliaxDeluxe3000: 'TOY_330',
    SizzlingCinder: 'WW_025'
  },

  // Paladin
  Paladin: {
    TyrsTears_TyrsTearsToken: 'CORE_YOP_001t',
    TyrsTears: 'YOP_001t'
  },

  // Priest
  Priest: {
    CatrinaMuerte: 'DAL_721',
    CatrinaMuerteCorePlaceholder: 'CORE_DAL_721',
    MassResurrection: 'DAL_724',
    Mothership: 'DEEP_025',
    PastConflux: 'TOY_825',
    PastConflux_PresentConfluxToken: 'TOY_825t',
    PastConflux_FutureConfluxToken: 'TOY_825t2',
    Resuscitate: 'SW_032',
    RestInPeace: 'WORK_018',
    TramHeist: 'WW_405',
    ShadowVisions: 'UNG_029',
    SpiritGuide: 'BAR_326',
    SpiritGuideCore: 'CORE_BAR_326'
  },

  // Rogue
  Rogue: {
    CostumeMerchant: 'WW_332',
    Mixtape: 'WORK_019',
    TessGreymane: 'GIL_598',
    TessGreymaneCore: 'CORE_GIL_598',
    TwistedWebweaver: 'WW_321'
  },

  // Shaman
  Shaman: {
    Cinderfin: 'WW_025p'
  },

  // Warlock
  Warlock: {
    WallowTheWretched: 'WW_363',
    TimethiefRafaam_TinyRafaamToken: 'WORK_RLK_707t1',
    TimethiefRafaam_GreenRafaamToken: 'WORK_RLK_707t2',
    TimethiefRafaam_MurlocRafaamToken: 'WORK_RLK_707t3',
    TimethiefRafaam_ExplorerRafaamToken: 'WORK_RLK_707t4',
    TimethiefRafaam_WarchiefRafaamToken: 'WORK_RLK_707t5',
    TimethiefRafaam_CalamitousRafaamToken: 'WORK_RLK_707t6',
    TimethiefRafaam_MindflayerRfaamToken: 'WORK_RLK_707t7',
    TimethiefRafaam_GiantRafaamToken: 'WORK_RLK_707t8',
    TimethiefRafaam_ArchmageRafaamToken: 'WORK_RLK_707t9'
  },

  // Warrior
  Warrior: {
    InventorBoom: 'BOT_498',
    LatorviusGazeOfTheCity: 'UNG_934t',
    EntertheLostCity_LatorviusGazeOfTheCityToken: 'UNG_934t'
  },

  // Dream Cards
  DreamCards: {
    Dream: 'DREAM_02',
    NightmareExpert1: 'DREAM_04',
    YseraAwakens: 'DREAM_05',
    LaughingSister: 'DREAM_03',
    EmeraldDrake: 'DREAM_01',
    Shaladrassil_CorruptedDreamToken: 'WW_091t1',
    Shaladrassil_CorruptedNightmareToken: 'WW_091t2',
    Shaladrassil_CorruptedAwakeningToken: 'WW_091t3',
    Shaladrassil_CorruptedLaughingSisterToken: 'WW_091t4',
    Shaladrassil_CorruptedDrakeToken: 'WW_091t5'
  },

  // Masks
  Masks: {
    PantherMask: 'WW_332t1',
    DevilsaurMask: 'WW_332t2',
    SheepMask: 'WW_332t3',
    BehemothMask: 'WW_332t4',
    BatMask: 'WW_332t5'
  },

  // Quest Rewards (Un'Goro)
  QuestRewards: {
    BarnabusTheStomper: 'UNG_116t',
    QueenCarnassa: 'UNG_920t1',
    TimeWarp: 'UNG_028t',
    Galvadon: 'UNG_953t1',
    AmaraWardenOfHope: 'UNG_963t1',
    CrystalCore: 'UNG_067t1',
    Megafin: 'UNG_942t',
    NetherPortal: 'UNG_829t1',
    Sulfuras: 'UNG_934t1'
  }
} as const;

export type CardIdCategory = keyof typeof CardIds;
export type CardIdKey<T extends CardIdCategory> = keyof (typeof CardIds)[T];

/**
 * Related cards definitions - card relationships from Hearthstone Deck Tracker
 * */

// ============================================================================
// INTERFACES
// ============================================================================

export interface IRelatedCardsDefinition {
  cardId: string;
  relatedCardIds: string[];
  shouldShowForOpponent?: boolean;
  isDynamic?: boolean;
  description?: string;
}

export interface IResurrectionCardDefinition {
  cardId: string;
  filterDescription: string;
  resurrectMultiple: boolean;
  shouldShowForOpponent: boolean;
}

export interface IHighlightCardDefinition {
  cardId: string;
  highlightCondition: string;
  highlightColors?: ('Teal' | 'Orange' | 'Green')[];
}

// ============================================================================
// STATIC RELATED CARDS
// ============================================================================

export const StaticRelatedCards: IRelatedCardsDefinition[] = [
  // Death Knight
  {
    cardId: CardIds.Deathknight.TalanjiOfTheGraves,
    relatedCardIds: [
      CardIds.Deathknight.TalanjiOfTheGraves_BoonOfPowerToken,
      CardIds.Deathknight.TalanjiOfTheGraves_BoonOfLongevityToken,
      CardIds.Deathknight.TalanjiOfTheGraves_BoonOfSpeedToken
    ],
    shouldShowForOpponent: false,
    description: 'Shows the three Boon tokens'
  },
  {
    cardId: CardIds.Deathknight.TalanjiOfTheGraves_WhatBefellZandalarToken,
    relatedCardIds: [
      CardIds.Deathknight.TalanjiOfTheGraves_BoonOfPowerToken,
      CardIds.Deathknight.TalanjiOfTheGraves_BoonOfLongevityToken,
      CardIds.Deathknight.TalanjiOfTheGraves_BoonOfSpeedToken
    ],
    shouldShowForOpponent: false,
    description: 'Shows the three Boon tokens'
  },

  // Druid
  {
    cardId: CardIds.Druid.KiriChosenOfElune,
    relatedCardIds: [CardIds.Druid.SolarEclipse, CardIds.Druid.LunarEclipse],
    shouldShowForOpponent: false,
    description: 'Shows Solar and Lunar Eclipse'
  },
  {
    cardId: CardIds.Druid.RavenousFlock,
    relatedCardIds: [
      CardIds.Druid.SkyscreamerEggs_SkyscreamerHatchlingToken,
      CardIds.Druid.SkyscreamerEggs_SkyscreamerHatchlingToken,
      CardIds.Druid.SkyscreamerEggs_SkyscreamerHatchlingToken
    ],
    shouldShowForOpponent: false,
    description: 'Shows three Skyscreamer Hatchlings'
  },

  // Neutral
  {
    cardId: CardIds.Neutral.ArchdruidNaralex,
    relatedCardIds: [
      CardIds.DreamCards.Dream,
      CardIds.DreamCards.NightmareExpert1,
      CardIds.DreamCards.YseraAwakens,
      CardIds.DreamCards.LaughingSister,
      CardIds.DreamCards.EmeraldDrake
    ],
    shouldShowForOpponent: false,
    description: 'Shows the five classic Dream cards'
  },
  {
    cardId: CardIds.Neutral.Shaladrassil,
    relatedCardIds: [
      CardIds.DreamCards.Dream,
      CardIds.DreamCards.NightmareExpert1,
      CardIds.DreamCards.YseraAwakens,
      CardIds.DreamCards.LaughingSister,
      CardIds.DreamCards.EmeraldDrake,
      CardIds.DreamCards.Shaladrassil_CorruptedDreamToken,
      CardIds.DreamCards.Shaladrassil_CorruptedNightmareToken,
      CardIds.DreamCards.Shaladrassil_CorruptedAwakeningToken,
      CardIds.DreamCards.Shaladrassil_CorruptedLaughingSisterToken,
      CardIds.DreamCards.Shaladrassil_CorruptedDrakeToken
    ],
    shouldShowForOpponent: false,
    description: 'Shows all Dream cards including Corrupted versions'
  },

  // Priest
  {
    cardId: CardIds.Priest.PastConflux,
    relatedCardIds: [
      CardIds.Priest.PastConflux_PresentConfluxToken,
      CardIds.Priest.PastConflux_FutureConfluxToken
    ],
    shouldShowForOpponent: false,
    description: 'Shows Present and Future Conflux'
  },
  {
    cardId: CardIds.Priest.PastConflux_PresentConfluxToken,
    relatedCardIds: [CardIds.Priest.PastConflux_FutureConfluxToken],
    shouldShowForOpponent: false,
    description: 'Shows Future Conflux'
  },

  // Rogue
  {
    cardId: CardIds.Rogue.CostumeMerchant,
    relatedCardIds: [
      CardIds.Masks.PantherMask,
      CardIds.Masks.DevilsaurMask,
      CardIds.Masks.SheepMask,
      CardIds.Masks.BehemothMask,
      CardIds.Masks.BatMask
    ],
    shouldShowForOpponent: false,
    description: 'Shows the five Mask cards'
  },

  // Shaman
  {
    cardId: CardIds.Shaman.Cinderfin,
    relatedCardIds: [CardIds.Neutral.SizzlingCinder],
    shouldShowForOpponent: false,
    description: 'Shows Sizzling Cinder'
  },

  // Warrior
  {
    cardId: CardIds.Warrior.EntertheLostCity_LatorviusGazeOfTheCityToken,
    relatedCardIds: [
      CardIds.QuestRewards.BarnabusTheStomper,
      CardIds.QuestRewards.QueenCarnassa,
      CardIds.QuestRewards.TimeWarp,
      CardIds.QuestRewards.Galvadon,
      CardIds.QuestRewards.AmaraWardenOfHope,
      CardIds.QuestRewards.CrystalCore,
      CardIds.QuestRewards.Megafin,
      CardIds.QuestRewards.NetherPortal,
      CardIds.QuestRewards.Sulfuras
    ],
    shouldShowForOpponent: false,
    description: "Shows all Un'Goro Quest rewards"
  }
];

// ============================================================================
// DYNAMIC RELATED CARDS
// ============================================================================

export const DynamicRelatedCards: IRelatedCardsDefinition[] = [
  // Mage
  {
    cardId: CardIds.Mage.Rewind,
    isDynamic: true,
    shouldShowForOpponent: false,
    description:
      'Shows spells played this game (excluding Rewind itself), ordered by cost descending',
    relatedCardIds: []
  },

  // Neutral
  {
    cardId: CardIds.Neutral.StarlightWhelp,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows cards from starting hand',
    relatedCardIds: []
  },
  {
    cardId: CardIds.Neutral.VelenLeaderOfTheExiled,
    isDynamic: true,
    shouldShowForOpponent: true,
    description:
      'Shows Draenei minions with Battlecry or Deathrattle played this match (requires >2 cards)',
    relatedCardIds: []
  },

  // Paladin
  {
    cardId: CardIds.Paladin.TyrsTears_TyrsTearsToken,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows dead class minions, ordered by cost',
    relatedCardIds: []
  },
  {
    cardId: CardIds.Paladin.TyrsTears,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows dead class minions, ordered by cost',
    relatedCardIds: []
  },

  // Priest
  {
    cardId: CardIds.Priest.RestInPeace,
    isDynamic: true,
    shouldShowForOpponent: true,
    description: 'Shows highest cost dead minions from both players (requires >0 cards)',
    relatedCardIds: []
  },
  {
    cardId: CardIds.Priest.TramHeist,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows cards opponent played last turn, ordered by cost descending',
    relatedCardIds: []
  },

  // Rogue
  {
    cardId: CardIds.Rogue.Mixtape,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows all distinct cards opponent played this game',
    relatedCardIds: []
  },
  {
    cardId: CardIds.Rogue.TessGreymane,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows non-class, non-neutral cards played this game, ordered by cost',
    relatedCardIds: []
  },
  {
    cardId: CardIds.Rogue.TessGreymaneCore,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows non-class, non-neutral cards played this game, ordered by cost',
    relatedCardIds: []
  },
  {
    cardId: CardIds.Rogue.TwistedWebweaver,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows minions played this match, distinct, ordered by cost',
    relatedCardIds: []
  },

  // Warlock
  {
    cardId: CardIds.Warlock.WallowTheWretched,
    isDynamic: true,
    shouldShowForOpponent: true,
    description: 'Shows revealed Nightmare bonus spells (requires >1 cards)',
    relatedCardIds: []
  }
];

// ============================================================================
// RESURRECTION CARDS
// ============================================================================

export const ResurrectionCards: IResurrectionCardDefinition[] = [
  // Druid
  {
    cardId: 'GIL_663', // Hadronox
    filterDescription: 'Minions with Taunt',
    resurrectMultiple: true,
    shouldShowForOpponent: false
  },
  {
    cardId: 'WW_091', // Unending Swarm
    filterDescription: 'Minions with cost <= 2',
    resurrectMultiple: true,
    shouldShowForOpponent: false
  },

  // Hunter
  {
    cardId: 'BAR_031', // Nine Lives
    filterDescription: 'Minions with Deathrattle',
    resurrectMultiple: false,
    shouldShowForOpponent: false
  },

  // Neutral
  {
    cardId: CardIds.Neutral.DaUndatakah,
    filterDescription: 'Minions with Deathrattle',
    resurrectMultiple: true,
    shouldShowForOpponent: false
  },

  // Priest
  {
    cardId: CardIds.Priest.CatrinaMuerte,
    filterDescription: 'Undead minions (excluding self)',
    resurrectMultiple: false,
    shouldShowForOpponent: false
  },
  {
    cardId: CardIds.Priest.CatrinaMuerteCorePlaceholder,
    filterDescription: 'Undead minions (excluding self)',
    resurrectMultiple: false,
    shouldShowForOpponent: false
  },
  {
    cardId: CardIds.Priest.MassResurrection,
    filterDescription: 'All minions',
    resurrectMultiple: true,
    shouldShowForOpponent: false
  },
  {
    cardId: CardIds.Priest.Resuscitate,
    filterDescription: 'Minions with cost <= 3',
    resurrectMultiple: false,
    shouldShowForOpponent: false
  },

  // Warrior
  {
    cardId: CardIds.Warrior.InventorBoom,
    filterDescription: 'Mech minions with cost >= 5',
    resurrectMultiple: true,
    shouldShowForOpponent: true
  }
];

// ============================================================================
// HIGHLIGHT CARDS
// ============================================================================

export const HighlightCards: IHighlightCardDefinition[] = [
  {
    cardId: CardIds.Priest.ShadowVisions,
    highlightCondition: 'card.Type === "Spell"',
    highlightColors: ['Teal']
  },
  {
    cardId: CardIds.Priest.SpiritGuide,
    highlightCondition: 'card has Holy or Shadow spell school',
    highlightColors: ['Teal', 'Orange']
  },
  {
    cardId: CardIds.Priest.SpiritGuideCore,
    highlightCondition: 'card has Holy or Shadow spell school',
    highlightColors: ['Teal', 'Orange']
  },
  {
    cardId: 'DEEP_018', // Summer Flowerchild
    highlightCondition: 'card.Cost >= 6',
    highlightColors: ['Teal']
  },
  {
    cardId: 'WORK_012', // Quality Assurance (Warrior)
    highlightCondition: 'card.Type === "Minion" && card has Taunt',
    highlightColors: ['Teal']
  }
];

// ============================================================================
// COLLECTION-BASED CARDS
// ============================================================================

export const CollectionBasedCards: IRelatedCardsDefinition[] = [
  {
    cardId: CardIds.Priest.Mothership,
    isDynamic: true,
    shouldShowForOpponent: false,
    description: 'Shows all collectible Protoss minions from HearthDb, ordered by cost',
    relatedCardIds: []
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get all related cards for a given card ID (static only) */
export const getRelatedCardsForCardId = (cardId: string): string[] => {
  const staticCard = StaticRelatedCards.find(c => c.cardId === cardId);
  if (staticCard) return staticCard.relatedCardIds;

  // Dynamic/resurrection cards need game state
  return [];
};

/** Check if a card has related cards defined */
export const hasRelatedCards = (cardId: string): boolean =>
  StaticRelatedCards.some(c => c.cardId === cardId) ||
  DynamicRelatedCards.some(c => c.cardId === cardId) ||
  ResurrectionCards.some(c => c.cardId === cardId) ||
  CollectionBasedCards.some(c => c.cardId === cardId);

/** Get card definition by ID */
export const getCardDefinition = (
  cardId: string
):
  | IRelatedCardsDefinition
  | IResurrectionCardDefinition
  | IHighlightCardDefinition
  | null =>
  StaticRelatedCards.find(c => c.cardId === cardId) ??
  DynamicRelatedCards.find(c => c.cardId === cardId) ??
  ResurrectionCards.find(c => c.cardId === cardId) ??
  HighlightCards.find(c => c.cardId === cardId) ??
  CollectionBasedCards.find(c => c.cardId === cardId) ??
  null;

/** Get all cards that should show for opponent */
export const getCardsForOpponent = (): string[] => [
  ...StaticRelatedCards.filter(c => c.shouldShowForOpponent).map(c => c.cardId),
  ...DynamicRelatedCards.filter(c => c.shouldShowForOpponent).map(c => c.cardId),
  ...ResurrectionCards.filter(c => c.shouldShowForOpponent).map(c => c.cardId)
];
