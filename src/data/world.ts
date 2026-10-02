// Leviatano — world, economy and equipment data. Prices are "tuning" placeholders.
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
  { id: 'sardina', name: 'Sardina argentea', sellPrice: 2, effect: 'cuore' },
  { id: 'sgombro', name: 'Sgombro', sellPrice: 3 },
  { id: 'cefalo', name: 'Cefalo', sellPrice: 4 },
  { id: 'pesce_arciere', name: 'Pesce arciere', sellPrice: 7 },
  { id: 'pesce_pagliaccio', name: 'Pesce pagliaccio', sellPrice: 5 },
  { id: 'pesce_chirurgo', name: 'Pesce chirurgo', sellPrice: 6 },
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

export interface ItemDef { id: string; name: string; price: number; stockPerVisit?: number; restockAfterGuardian?: boolean; text: string;
  lure?: string[];         // a bait: these species come to you for a while (ITEM_RULES.bait)
  battleOnly?: boolean;    // used in battle only: never in a backpack slot
}
export const ITEMS: ItemDef[] = [
  { id: 'krill_dorato', name: 'Krill dorato', price: 500, stockPerVisit: 2, text: '+1 livello a una bestia' },
  { id: 'alga_curativa', name: 'Alga curativa', price: 60, text: 'Cura una bestia, anche KO' },
  { id: 'bolla_aria', name: 'Bolla d\u2019aria', price: 40, text: 'Ricarica l\u2019ossigeno' },
  { id: 'esca', name: 'Esca', price: 80, text: 'Attira le creature di una zona' },
  // owner, 2 ottobre: baits for the beasts you are looking for, and shells for taming (no longer endless)
  { id: 'esca_sangue', name: 'Esca di sangue', price: 180, text: 'Per un minuto e mezzo attira gli squali: bianco, tigre, martello', lure: ['squalo_bianco', 'squalo_tigre', 'squalo_martello'] },
  { id: 'esca_gamberi', name: 'Esca di gamberi', price: 90, text: 'Attira tartarughe, pesci palla e mante', lure: ['tartaruga_marina', 'pesce_palla', 'manta'] },
  { id: 'esca_viva', name: 'Esca viva', price: 90, text: 'Attira barracuda, murene, torpedini e coccodrilli', lure: ['barracuda', 'murena', 'torpedine', 'coccodrillo_marino'] },
  { id: 'conchiglia', name: 'Conchiglia del domatore', price: 30, text: 'Serve per domare: una per ogni tentativo in battaglia', battleOnly: true },
  { id: 'arpione_mitico', name: 'Arpione mitico', price: 5000, stockPerVisit: 1, restockAfterGuardian: true, text: 'Monouso: stordisce all\u2019istante la bestia colpita e porta subito al minigioco' },
];

/** Cosmetic skins for beasts already tamed: small bonus, one active per beast. */
export interface SkinDef { id: string; species: string; name: string; price: number; bonus: { stat: 'hp' | 'bite' | 'charge' | 'defense' | 'speed'; mult: number }; }
export const SKINS: SkinDef[] = [
  { id: 'tigre_elettrico', species: 'squalo_tigre', name: 'Squalo tigre elettrico', price: 1200, bonus: { stat: 'speed', mult: 1.05 } },
  { id: 'tigre_radioattivo', species: 'squalo_tigre', name: 'Squalo tigre radioattivo', price: 1200, bonus: { stat: 'bite', mult: 1.05 } },
  { id: 'tigre_preistorico', species: 'squalo_tigre', name: 'Squalo tigre preistorico', price: 1500, bonus: { stat: 'hp', mult: 1.05 } },
];

export const GUARDIAN_TEETH_REWARD = 800; // tuning

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
