// The bestiary's order (owner, 21 ottobre 2026: "un filo logico… per macrospecie… dai più piccoli ai più grandi…
// finendo con la più rara"): families of kin, and in each one from the smallest, commonest and least dangerous to the
// biggest and rarest; a starter's line closes its family, the megalodon the sharks. Every species of the game appears
// exactly once (tests/lottoAF.test.ts).
export interface BestiaryFamily {
  name: string;
  ids: readonly string[];
}

export const BESTIARY_FAMILIES: readonly BestiaryFamily[] = [
  {
    name: 'Pesci di scogliera',
    ids: [
      'pesce_leone',
      'pesce_palla',
      'istrice_gigante',
      'scorfano',
      'cernia',
      'pesce_napoleone',
      'napoleone_corazzato',
      'pesce_luna',
    ],
  },
  { name: 'Pesci del mare aperto', ids: ['lampuga', 'barracuda', 'tonno', 'pesce_vela', 'pesce_spada'] },
  { name: 'Razze', ids: ['torpedine', 'pastinaca', 'pesce_sega', 'manta'] },
  {
    name: 'Meduse, crostacei e molluschi',
    ids: [
      'medusa_gigante',
      'isopode_gigante',
      'granchio_ragno',
      'polpo_gigante',
      'calamaro_gigante',
      'calamaro_colossale',
      'kraken',
    ],
  },
  { name: 'Abissali', ids: ['dragone_nero', 'rana_pescatrice', 'chimera'] },
  {
    name: 'Anguille e serpenti',
    ids: ['murena', 'anguilla_elettrica', 'serpente_di_mare', 'scintilla', 'saetta', 'folgore'],
  },
  { name: 'Tartarughe', ids: ['tartaruga_marina', 'tartaruga_liuto', 'guscio', 'rocciaguscio', 'archelon'] },
  { name: 'Rettili delle rive', ids: ['varano_nilo', 'coccodrillo_nilo', 'coccodrillo_marino'] },
  {
    name: 'Mammiferi marini',
    ids: [
      'lontra_marina',
      'foca_comune',
      'delfino',
      'foca_leopardo',
      'tricheco',
      'elefante_marino',
      'beluga',
      'narvalo',
      'orca',
      'megattera',
      'capodoglio',
      'livyatan',
    ],
  },
  { name: 'Giganti preistorici', ids: ['dunkleosteus', 'plesiosauro', 'mosasauro'] },
  {
    name: 'Squali',
    ids: [
      'squalo_nutrice',
      'squalo_toro',
      'squalo_leuca',
      'squalo_mako',
      'squalo_capopiatto',
      'squalo_goblin',
      'squalo_volpe',
      'squalo_tigre',
      'squalo_martello',
      'squalo_bianco',
      'squalo_elefante',
      'squalo_balena',
      'zanna',
      'squarcio',
      'zannarossa',
      'megalodonte',
    ],
  },
  { name: 'Leviatano', ids: ['leviatano'] },
];
