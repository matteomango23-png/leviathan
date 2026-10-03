// Leviatano — what the battle says (Italian game text). Words agree with the beast: "selvatico/selvatica",
// "sfinito/sfinita"… (FEMININE_SPECIES).

/** Species whose Italian name is feminine (la tartaruga, la torpedine, l'orca…). */
export const FEMININE_SPECIES: readonly string[] = [
  'tartaruga_marina',
  'torpedine',
  'murena',
  'manta',
  'megattera',
  'lontra_marina',
  'anguilla_elettrica',
  'piovra',
  'foca_leopardo',
  'orca',
  'rana_pescatrice',
];

/** A beast as the battle talks about it. */
export interface Named {
  name: string;
  /** Feminine (la tartaruga): "selvatica", "sfinita"… */
  f: boolean;
}

const o = (b: Named): string => (b.f ? 'a' : 'o');

export const BATTLE_TEXT = {
  appears: (b: Named): string => `Dal buio emerge ${b.name} selvatic${o(b)}!`,
  go: (b: Named): string => `Vai, ${b.name}!`,
  whatNext: (b: Named): string => `Cosa farà ${b.name}?`,
  uses: (b: Named, move: string): string => `${b.name} usa ${move}!`,
  foeUses: (b: Named, move: string): string => `${b.name} selvatic${o(b)} usa ${move}!`,
  super: 'È superefficace!',
  weak: 'Non è molto efficace…',
  crit: 'Colpo critico!',
  hits: (n: number): string => `Colpito ${n} volte!`,
  healed: (b: Named, n: number): string => `${b.name} recupera ${n} di vita.`,
  fainted: (b: Named): string => `${b.name} è sfinit${o(b)}!`,
  foeFainted: (b: Named): string => `${b.name} selvatic${o(b)} è sfinit${o(b)} e fugge nel buio!`,
  /** A beast with a title (Guardian, story beast): it does not run away. */
  bossFainted: (b: Named): string => `${b.name} è sfinit${o(b)}!`,
  chooseNext: 'Chi mandi in acqua?',
  switched: (from: Named, to: Named): string => `Torna, ${from.name}! Vai, ${to.name}!`,
  tameThrow: (b: Named): string => `Suoni la Conchiglia del domatore verso ${b.name}…`,
  noShells: 'Non hai più conchiglie del domatore: comprale al mercato del porto.',
  tamed: (b: Named): string => `${b.name} è domat${o(b)}! Entra nella tua squadra.`,
  tameBroke: ['Oh no! Si è liberata dalla conchiglia!', 'Ci mancava poco!', 'Accidenti, quasi!'],
  fleeOk: 'Sei riuscito a fuggire!',
  fleeFail: 'Non riesci a fuggire!',
  item: (item: string, b: Named): string => `Usi ${item} su ${b.name}.`,
  won: 'Vittoria!',
  lost: 'Tutta la squadra è sfinita… il mare ti respinge in superficie.',
  xp: (b: Named, xp: number): string => `${b.name} guadagna ${xp} punti esperienza.`,
  ambushed: (b: Named): string => `${b.name} ti ha preso di sorpresa!`,
  surprise: (b: Named): string => `Attacco a sorpresa! ${b.name} è stordit${o(b)}.`,
  stunnedSkip: (b: Named): string => `${b.name} è stordit${o(b)} e non riesce a muoversi!`,
  // conditions and stages, like Pokémon
  flinched: (b: Named): string => `${b.name} tentenna e non attacca!`,
  asleep: (b: Named): string => `${b.name} è stordit${o(b)} e non si muove.`,
  frozen: (b: Named): string => `${b.name} è congelat${o(b)} e non si muove!`,
  paralyzed: (b: Named): string => `${b.name} è paralizzat${o(b)}! Non riesce a muoversi!`,
  woke: (b: Named): string => `${b.name} si riprende!`,
  thawed: (b: Named): string => `${b.name} si è scongelat${o(b)}!`,
  missed: (b: Named): string => `L’attacco di ${b.name} va a vuoto!`,
  noEffect: 'Non ha effetto…',
  boostAll: (b: Named): string => `Tutte le statistiche di ${b.name} aumentano!`,
  haze: 'L’acqua si calma: tutte le statistiche tornano normali.',
  // learning moves, like Pokémon
  learned: (b: Named, move: string): string => `${b.name} impara ${move}!`,
  wantsToLearn: (b: Named, move: string): string =>
    `${b.name} vuole imparare ${move}, ma conosce già 4 mosse. Quale deve dimenticare?`,
  forgot: (b: Named, old: string, move: string): string => `${b.name} dimentica ${old} e impara ${move}!`,
  gaveUp: (b: Named, move: string): string => `${b.name} non impara ${move}.`,
  giveUp: 'Non imparare',
  recoil: (b: Named): string => `${b.name} si fa male nello sforzo!`,
  gotStatus: {
    avvelenato: (b: Named): string => `${b.name} è avvelenat${o(b)}!`,
    ferito: (b: Named): string => `${b.name} è ferit${o(b)}!`,
    paralizzato: (b: Named): string => `${b.name} è paralizzat${o(b)}! Forse non riuscirà a muoversi!`,
    stordito: (b: Named): string => `${b.name} è stordit${o(b)}!`,
    congelato: (b: Named): string => `${b.name} è congelat${o(b)}!`,
  },
  residual: {
    avvelenato: (b: Named): string => `${b.name} soffre per il veleno!`,
    ferito: (b: Named): string => `${b.name} perde sangue dalla ferita!`,
    paralizzato: (_b: Named): string => '',
    stordito: (_b: Named): string => '',
    congelato: (_b: Named): string => '',
  },
  stage: (b: Named, stat: string, moved: number, by: number): string =>
    moved === 0
      ? `${stat[0]!.toUpperCase()}${stat.slice(1)} di ${b.name} non può ${by > 0 ? 'salire' : 'scendere'} oltre!`
      : `${stat[0]!.toUpperCase()}${stat.slice(1)} di ${b.name} ${moved > 0 ? 'aumenta' : 'diminuisce'}${Math.abs(moved) > 1 ? ' molto' : ''}!`,
  stunned: (b: Named): string => `${b.name} è stordit${o(b)}!`,
  guarding: (b: Named): string => `${b.name} si protegge: i prossimi colpi faranno metà danno.`,
  noFlee: 'Non puoi fuggire da questa battaglia!',
  again: 'Nuova battaglia',
  back: 'Torna in acqua',
};
