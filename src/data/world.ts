// Leviatano — world, economy and equipment data. Prices are "tuning" placeholders.
import type { StageId, StatusId } from './moveBattle';
import { TypeId } from './rules';

export type RegionId = 'baia' | 'delta' | 'barriera' | 'foresta' | 'ghiaccio' | 'fossa' | 'abisso' | 'fossaNera';

export interface RegionDef {
  id: RegionId;
  name: string;
  levels: [number, number];      // recommended level band
  depth: [number, number];       // metres
  guardian?: string;             // species id or unique variant id
  guardianType?: TypeId | 'variabile';
  fish: string[];                // catchable fish ids (FISH)
  postGame?: boolean;
}

export const REGIONS: RegionDef[] = [
  { id: 'baia', name: 'Baia di Portofosco', levels: [1, 5], depth: [0, 60], guardian: 'sfregiato', guardianType: 'predatore', fish: ['sardina', 'sgombro'] },
  { id: 'delta', name: 'Delta delle Mangrovie', levels: [6, 12], depth: [0, 30], fish: ['cefalo', 'pesce_arciere'] }, // brackish river mouth between Baia and Barriera: murky shallow water, mangrove roots, banks
  { id: 'barriera', name: 'Barriera Rossa', levels: [5, 10], depth: [20, 150], guardian: 're_corallo', guardianType: 'corazzato', fish: ['pesce_pagliaccio', 'pesce_chirurgo'] },
  { id: 'foresta', name: 'Foresta Sommersa', levels: [10, 15], depth: [60, 300], guardian: 'piovra', guardianType: 'abissale', fish: ['cavalluccio', 'triglia'] },
  { id: 'ghiaccio', name: 'Mare di Ghiaccio', levels: [15, 20], depth: [0, 400], guardian: 'regina_bianca', guardianType: 'glaciale', fish: ['merluzzo_artico', 'krill'] },
  { id: 'fossa', name: 'Fossa del Capodoglio', levels: [20, 28], depth: [300, 1000], guardian: 'calamaro_colossale', guardianType: 'abissale', fish: ['pesce_vipera', 'pesce_accetta'] },
  { id: 'abisso', name: 'Abisso del Tempio', levels: [28, 35], depth: [800, 2000], guardian: 'leviatano', guardianType: 'variabile', fish: ['pesce_vipera', 'pesce_accetta'] },
  { id: 'fossaNera', name: 'Fossa Nera', levels: [35, 50], depth: [2000, 6000], fish: ['pesce_accetta'], postGame: true },
];

/** Small fish: caught with harpoon, fiocine or net; sold for teeth; eaten by beasts (nourishment). */
export interface FishDef { id: string; name: string; sellPrice: number; effect?: 'cuore' | 'ossigeno'; }
export const FISH: FishDef[] = [
  { id: 'sardina', name: 'Sardina argentea', sellPrice: 1, effect: 'cuore' }, // was 2 (owner, 8 ottobre: too many teeth)
  { id: 'sgombro', name: 'Sgombro', sellPrice: 3 },
  { id: 'cefalo', name: 'Cefalo', sellPrice: 4 },
  { id: 'pesce_arciere', name: 'Pesce arciere', sellPrice: 7 },
  { id: 'pesce_pagliaccio', name: 'Pesce pagliaccio', sellPrice: 5 },
  { id: 'pesce_chirurgo', name: 'Pesce chirurgo', sellPrice: 6 },
  { id: 'pesce_farfalla', name: 'Pesce farfalla', sellPrice: 5 },
  { id: 'pesce_angelo', name: 'Pesce angelo', sellPrice: 7 },
  { id: 'cavalluccio', name: 'Cavalluccio marino', sellPrice: 9 },
  { id: 'triglia', name: 'Triglia', sellPrice: 8 },
  { id: 'merluzzo_artico', name: 'Merluzzo artico', sellPrice: 12 },
  { id: 'krill', name: 'Krill', sellPrice: 4 },
  { id: 'pesce_vipera', name: 'Pesce vipera', sellPrice: 20, effect: 'ossigeno' },
  { id: 'pesce_accetta', name: 'Pesce accetta', sellPrice: 25, effect: 'ossigeno' },
];

/** Diving suits: the diver's progression. Max depth depends on the suit worn. */
export interface SuitDef { id: string; name: string; price: number; maxDepth: number; o2Mult: number; speedMult: number; hpBonus: number; dash: boolean; note: string; }
export const SUITS: SuitDef[] = [
  { id: 'leggera', name: 'Muta leggera', price: 0, maxDepth: 150, o2Mult: 1, speedMult: 1.1, hpBonus: 0, dash: true, note: 'Veloce, doppio scatto; poca profondità' },
  { id: 'rinforzata', name: 'Muta rinforzata', price: 400, maxDepth: 500, o2Mult: 1, speedMult: 1, hpBonus: 2, dash: true, note: 'Più profondità e più vita' },
  // tappa 11: long dives into the endless sea (owner: 4-5 minutes of air)
  { id: 'traversata', name: 'Muta da traversata', price: 1000, maxDepth: 300, o2Mult: 0.22, speedMult: 1.05, hpBonus: 1, dash: true, note: 'Circa 4 minuti d’aria: per le traversate in mare aperto' },
  { id: 'bombole', name: 'Muta con bombole', price: 2500, maxDepth: 700, o2Mult: 0.18, speedMult: 0.95, hpBonus: 2, dash: true, note: 'Circa 5 minuti d’aria e più profondità' },
  { id: 'palombaro', name: 'Scafandro da palombaro', price: 1500, maxDepth: 1200, o2Mult: 0.35, speedMult: 0.75, hpBonus: 3, dash: false, note: 'Ossigeno che cala lentissimo; lento, niente scatto' },
  { id: 'abissale', name: 'Muta abissale', price: 6000, maxDepth: 6000, o2Mult: 0.6, speedMult: 1, hpBonus: 4, dash: true, note: 'Resiste alle fosse più profonde; costosissima' },
];

/** Suit upgrades (diver abilities), bought with teeth. */
export interface SuitUpgradeDef { id: string; name: string; price: number; effect: string; }
export const SUIT_UPGRADES: SuitUpgradeDef[] = [
  { id: 'apnea', name: 'Apnea', price: 300, effect: 'L\u2019ossigeno cala del 25% più lentamente' },
  { id: 'lampo_sonar', name: 'Lampo sonar', price: 600, effect: 'Impulso che mostra per un attimo le creature nascoste' },
  { id: 'controcorrente', name: 'Nuoto controcorrente', price: 900, effect: 'Nuoti nelle correnti forti anche senza manta' },
  { id: 'lampada_1', name: 'Lampada potenziata', price: 250, effect: 'Cono di luce più lungo del 30%' },
  { id: 'lampada_2', name: 'Lampada abissale', price: 1200, effect: 'Cono di luce più lungo del 60% e più largo' },
];

/** Weapons: the base harpoon is always equipped; others go in backpack slots. */
export interface WeaponDef { id: string; name: string; type?: TypeId; damage: number; cooldown: number; source: string; text: string; singleUse?: boolean; price?: number; }
export const WEAPONS: WeaponDef[] = [
  { id: 'arpione', name: 'Fucile subacqueo', damage: 1, cooldown: 0.4, source: 'Iniziale', text: 'Fucile ad arpione: cattura i pesci e sfianca le bestie' },
  { id: 'fiocine', name: 'Fiocine a ventaglio', damage: 1, cooldown: 0.9, source: 'Relitto, Baia di Portofosco', text: '3 dardi a corto raggio, 1 danno ciascuno; catturano i pesci' },
  { id: 'rete', name: 'Rete zavorrata', damage: 0, cooldown: 3, source: 'Relitto, Barriera Rossa', text: 'Si apre in acqua e raccoglie fino a 5 pesci in un colpo' },
  { id: 'folgore', name: 'Lancia folgore', type: 'tempesta', damage: 2, cooldown: 2.5, source: 'Relitto, Fossa del Capodoglio', text: 'Colpisce i 3 bersagli più vicini: 2 danni e stordimento' },
  { id: 'runico', name: 'Arpione runico', damage: 3, cooldown: 0.7, source: 'Ricompensa del tempio', text: 'Dardo di luce che trapassa tutto' },
];

/** Backpack: base harpoon always equipped + BACKPACK_SLOTS chosen before each dive (weapons or items). */
export const BACKPACK_SLOTS = 3;

/** The pockets of the backpack, like Pokémon's bag. */
export type Pocket = 'cure' | 'battaglia' | 'esche' | 'varie';
export const POCKET_NAMES: Record<Pocket, string> = { cure: 'Cure', battaglia: 'Battaglia', esche: 'Esche', varie: 'Varie' };
/** What an item does to a beast, like Pokémon's items (systems/economy/items.ts). */
export interface ItemUse {
  heal?: number | 'full';                  // health back (Pozione 20, Superpozione 60, Iperpozione 120, Pozione Max)
  revive?: number;                         // a worn-out beast comes back with this share of its health (Revitalizzante ½)
  cure?: StatusId[] | 'all';               // the conditions it ends (Antidoto, Cura totale…)
  pp?: { amount: number | 'full'; all?: boolean }; // PP back to one move (Etere) or all of them (Elisir)
  stage?: { stat: StageId; by: number };   // in battle only: a statistic up (Attacco X: +2 since gen 7)
  tameMult?: number;                       // in battle only: the next taming attempt × this
}
export interface ItemDef { id: string; name: string; price: number; stockPerVisit?: number; restockAfterGuardian?: boolean; text: string;
  lure?: string[];         // a bait: these species come to you for a while (ITEM_RULES.bait)
  battleOnly?: boolean;    // used in battle only: never in a backpack slot
  pocket?: Pocket;         // its pocket in the backpack (default: varie)
  use?: ItemUse;
}
export const ITEMS: ItemDef[] = [
  { id: 'krill_dorato', name: 'Krill dorato', price: 500, stockPerVisit: 2, text: '+1 livello a una bestia' },
  // like Pokémon's medicine (owner, 3 ottobre: "copia da Pokémon"); prices about 0.3 × Pokémon's (tuning)
  { id: 'alga_curativa', name: 'Alga curativa', price: 60, pocket: 'cure', use: { heal: 20 }, text: 'Recupera 20 PS a una bestia (come una Pozione)' },
  { id: 'alga_rossa', name: 'Alga rossa', price: 210, pocket: 'cure', use: { heal: 60 }, text: 'Recupera 60 PS (come una Superpozione)' },
  { id: 'alga_reale', name: 'Alga reale', price: 450, pocket: 'cure', use: { heal: 120 }, text: 'Recupera 120 PS (come un\u2019Iperpozione)' },
  { id: 'corallo_vitale', name: 'Corallo vitale', price: 750, pocket: 'cure', use: { heal: 'full' }, text: 'Tutti i PS (come una Pozione Max)' },
  { id: 'perla_ristoro', name: 'Perla di ristoro', price: 900, pocket: 'cure', use: { heal: 'full', cure: 'all' }, text: 'Tutti i PS e cura ogni stato (come una Ricarica totale)' },
  { id: 'ambra_risveglio', name: 'Ambra del risveglio', price: 600, pocket: 'cure', use: { revive: 0.5 }, text: 'Rianima una bestia sfinita con metà dei PS (come un Revitalizzante)' },
  { id: 'muschio_luminoso', name: 'Muschio luminoso', price: 360, pocket: 'cure', use: { pp: { amount: 10 } }, text: 'Ridà 10 PP a una mossa (come un Etere)' },
  { id: 'elisir_abissale', name: 'Elisir abissale', price: 900, pocket: 'cure', use: { pp: { amount: 10, all: true } }, text: 'Ridà 10 PP a tutte le mosse (come un Elisir)' },
  { id: 'antidoto', name: 'Antidoto', price: 30, pocket: 'cure', use: { cure: ['avvelenato'] }, text: 'Cura l\u2019avvelenamento' },
  { id: 'benda_alga', name: 'Benda d\u2019alga', price: 60, pocket: 'cure', use: { cure: ['ferito'] }, text: 'Chiude le ferite (come una Antiscottatura)' },
  { id: 'spugna_isolante', name: 'Spugna isolante', price: 60, pocket: 'cure', use: { cure: ['paralizzato'] }, text: 'Toglie la paralisi' },
  { id: 'sale_aromatico', name: 'Sale aromatico', price: 30, pocket: 'cure', use: { cure: ['stordito'] }, text: 'Risveglia una bestia stordita (come una Sveglia)' },
  { id: 'pietra_termale', name: 'Pietra termale', price: 30, pocket: 'cure', use: { cure: ['congelato'] }, text: 'Scongela una bestia (come un Antigelo)' },
  { id: 'panacea', name: 'Panacea di madreperla', price: 120, pocket: 'cure', use: { cure: 'all' }, text: 'Cura ogni stato (come una Cura totale)' },
  // like Pokémon's X items: in battle only, +2 since gen 7
  { id: 'attacco_x', name: 'Attacco X', price: 300, pocket: 'battaglia', battleOnly: true, use: { stage: { stat: 'atk', by: 2 } }, text: 'In battaglia: alza molto l\u2019Attacco' },
  { id: 'difesa_x', name: 'Difesa X', price: 300, pocket: 'battaglia', battleOnly: true, use: { stage: { stat: 'def', by: 2 } }, text: 'In battaglia: alza molto la Difesa' },
  { id: 'attacco_sp_x', name: 'Att. Speciale X', price: 300, pocket: 'battaglia', battleOnly: true, use: { stage: { stat: 'spa', by: 2 } }, text: 'In battaglia: alza molto l\u2019Attacco Speciale' },
  { id: 'difesa_sp_x', name: 'Dif. Speciale X', price: 300, pocket: 'battaglia', battleOnly: true, use: { stage: { stat: 'spd', by: 2 } }, text: 'In battaglia: alza molto la Difesa Speciale' },
  { id: 'velocita_x', name: 'Velocità X', price: 300, pocket: 'battaglia', battleOnly: true, use: { stage: { stat: 'spe', by: 2 } }, text: 'In battaglia: alza molto la Velocità' },
  { id: 'precisione_x', name: 'Precisione X', price: 300, pocket: 'battaglia', battleOnly: true, use: { stage: { stat: 'acc', by: 2 } }, text: 'In battaglia: alza molto la Precisione' },
  { id: 'bolla_aria', name: 'Bolla d\u2019aria', price: 40, text: 'Ricarica l\u2019ossigeno' },
  { id: 'esca', name: 'Esca', price: 80, pocket: 'esche', text: 'Attira le creature di una zona' },
  // owner, 2 ottobre: baits for the beasts you are looking for, and shells for taming (no longer endless)
  { id: 'esca_sangue', name: 'Esca di sangue', price: 180, pocket: 'esche', text: 'Per un minuto e mezzo attira gli squali: bianco, tigre, martello', lure: ['squalo_bianco', 'squalo_tigre', 'squalo_martello'] },
  { id: 'esca_gamberi', name: 'Esca di gamberi', price: 90, pocket: 'esche', text: 'Attira tartarughe, pesci palla e mante', lure: ['tartaruga_marina', 'pesce_palla', 'manta'] },
  { id: 'esca_viva', name: 'Esca viva', price: 90, pocket: 'esche', text: 'Attira barracuda, murene, torpedini e coccodrilli', lure: ['barracuda', 'murena', 'torpedine', 'coccodrillo_marino'] },
  { id: 'conchiglia', name: 'Conchiglia del domatore', price: 30, pocket: 'battaglia', text: 'Serve per domare: una per ogni tentativo in battaglia', battleOnly: true },
  { id: 'arpione_mitico', name: 'Arpione mitico', price: 5000, stockPerVisit: 1, restockAfterGuardian: true, pocket: 'battaglia', use: { tameMult: 3 }, text: 'Monouso: stordisce all\u2019istante la bestia colpita e porta subito al minigioco' },
];

/** Cosmetic skins for beasts already tamed: small bonus, one active per beast. */
export interface SkinDef { id: string; species: string; name: string; price: number; bonus: { stat: 'hp' | 'bite' | 'charge' | 'defense' | 'speed'; mult: number }; }
export const SKINS: SkinDef[] = [
  { id: 'tigre_elettrico', species: 'squalo_tigre', name: 'Squalo tigre elettrico', price: 1200, bonus: { stat: 'speed', mult: 1.05 } },
  { id: 'tigre_radioattivo', species: 'squalo_tigre', name: 'Squalo tigre radioattivo', price: 1200, bonus: { stat: 'bite', mult: 1.05 } },
  { id: 'tigre_preistorico', species: 'squalo_tigre', name: 'Squalo tigre preistorico', price: 1500, bonus: { stat: 'hp', mult: 1.05 } },
];


/**
 * Swarms (Sciami): creatures that live in schools are not tamed one by one.
 * You bind the whole swarm by catching `bindCount` individuals; it then enters the bestiary
 * and can be equipped in a backpack slot as a summon with duration and cooldown.
 */
export interface SwarmDef {
  id: string;
  name: string;
  region: RegionId;
  bindCount: number;            // individuals to catch to bind the swarm
  bindWith: ('arpione' | 'fiocine' | 'rete')[];
  duration: number;             // seconds the swarm stays around the diver
  cooldown: number;             // seconds
  fx: string[];                 // implementation hints
  text: string;                 // Italian UI description
  artPrompt: string;            // [CREATURE] part of the illustration prompt (see docs/ART.md)
}
export const SWARMS: SwarmDef[] = [
  { id: 'sciame_sardine', name: 'Sciame di sardine', region: 'baia', bindCount: 10, bindWith: ['arpione', 'fiocine', 'rete'], duration: 8, cooldown: 45,
    fx: ['decoy', 'ring:diver'], text: 'Un muro di sardine ti nasconde: per 8 s nessuna bestia viene verso di te',
    artPrompt: 'a dense silver school of sardines swirling into a protective sphere around a small diver' },
  { id: 'sciame_meduse', name: 'Sciame di meduse spettrali', region: 'barriera', bindCount: 5, bindWith: ['rete'], duration: 6, cooldown: 50,
    fx: ['barrier:ring', 'stunOnContact:1.5'], text: 'Barriera urticante intorno a te: chi la attraversa resta stordito',
    artPrompt: 'a drifting swarm of ghostly translucent violet jellyfish with long glowing tentacles' },
  { id: 'sciame_lanterne', name: 'Sciame di pesci lanterna', region: 'fossa', bindCount: 10, bindWith: ['arpione', 'fiocine', 'rete'], duration: 20, cooldown: 60,
    fx: ['light:radius:x2'], text: 'Una nube di luce viva illumina il buio intorno a te',
    artPrompt: 'a glittering cloud of small bioluminescent lanternfish lighting up the abyss' },
  { id: 'sciame_krill', name: 'Sciame di krill', region: 'ghiaccio', bindCount: 15, bindWith: ['rete'], duration: 10, cooldown: 60,
    fx: ['heal:team:overTime'], text: 'Una nuvola di krill: la tua squadra se lo mangia e si cura lentamente',
    artPrompt: 'a vast pink-orange cloud of krill glowing faintly in icy dark water' },
];

/** What a new game starts with in the backpack (and old games receive once, save v8). */
export const START_INVENTORY: Record<string, number> = { conchiglia: 5 };
