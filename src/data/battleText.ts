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
  dodged: 'Schivato!',
  grazed: 'Schivato a metà!',
  dodgeButton: 'SCHIVA!',
  dodgeTutorial:
    'Quando il nemico attacca compare SCHIVA: tocca nel momento esatto in cui la lancetta bianca passa sulla zona chiara. Preciso: nessun danno. Quasi: metà danno. Attento, a volte si ferma per ingannarti!',
  healed: (b: Named, n: number): string => `${b.name} recupera ${n} di vita.`,
  fainted: (b: Named): string => `${b.name} è sfinit${o(b)}!`,
  foeFainted: (b: Named): string => `${b.name} selvatic${o(b)} è sfinit${o(b)} e fugge nel buio!`,
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
  stunned: (b: Named): string => `${b.name} è stordit${o(b)}!`,
  guarding: (b: Named): string => `${b.name} si protegge: i prossimi colpi faranno metà danno.`,
  noFlee: 'Non puoi fuggire da questa battaglia!',
  again: 'Nuova battaglia',
  back: 'Torna in acqua',
};
