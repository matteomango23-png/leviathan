// The step-by-step tutorial (owner, 12 novembre 2026: "servirebbe un tipico tutorial per giochi mobile, ovvero che ti
// dicono dove toccare e che cosa fare all'inizio"): four rounds, each shown once, the first time you are in the water,
// in a harbour, at the helm and in the cockpit (ui/coach.ts). Each step lights one button (its `data-coach` name in
// the interface) and says what it does in Aurelio's words; a button not on the screen is skipped. They can all be
// seen again from the Guida.

export type CoachRound = 'acqua' | 'porto' | 'timone' | 'cockpit';

export interface CoachStep {
  /** The `data-coach` of the element it lights. */
  target: string;
  text: string;
}

export const COACH_TITLES: Record<CoachRound, string> = {
  acqua: 'In acqua',
  porto: 'Il porto',
  timone: 'Al timone',
  cockpit: 'Il cockpit',
};

export const COACH: Record<CoachRound, CoachStep[]> = {
  acqua: [
    { target: 'stick', text: 'Tocca e trascina qui a sinistra per nuotare, dove vuoi sullo schermo.' },
    { target: 'fire', text: 'Il Fucile: trascinalo verso un pesce per mirare, lascia per sparare. Le sardine finiscono nella sacca.' },
    { target: 'dash', text: 'Scatto: un colpo di pinne veloce, per raggiungere o per scappare.' },
    {
      target: 'team',
      text: 'La tua squadra. Tocca la sfera di una bestia piccola e nuota con te come compagna (fino a due). Una bestia grande la cavalchi.',
    },
    { target: 'pause', text: 'Pausa: la squadra, il bestiario, lo zaino e la Guida con tutti i miei consigli.' },
    { target: 'goal', text: 'Qui c’è sempre cosa fare adesso. La freccia gialla sul bordo dello schermo ti indica dove andare.' },
  ],
  porto: [
    { target: 'port-sell', text: 'Prima cosa, sempre: vendi i pesci della sacca. Le sardine diventano denti, il denaro del mare.' },
    { target: 'port-bacheca', text: 'Bacheca: le taglie su tutte le bestie del mare, dalle più facili ai leggendari. Accettale e i denti arrivano quando le batti.' },
    { target: 'port-mercato', text: 'Mercato: vendi il pescato, le bestie che il porto cerca (pagate due o tre volte) e il Baratto.' },
    { target: 'port-conchiglie', text: 'Conchiglie: servono per domare. Le migliori catturano anche le bestie più forti.' },
    { target: 'port-cure', text: 'Cure: rimettono in forze le bestie durante la battaglia.' },
    { target: 'port-esche', text: 'Esche: attirano le bestie. Quelle pregiate a volte portano un alfa o un albino.' },
    { target: 'port-sub', text: 'Sub: mute per scendere più in fondo, e armi nuove.' },
    { target: 'port-mezzi', text: 'Mezzi: il pieno, le riparazioni e, a Porto Fango, il cantiere con le navi nuove.' },
    { target: 'port-zaino', text: 'Zaino: quello che porti con te.' },
    { target: 'port-recinto', text: 'Recinto: le bestie che non stanno in squadra. Qui le scambi e le vendi.' },
    { target: 'port-rest', text: 'Riposa: cura te e la squadra, e ti risvegli qui se perdi i sensi.' },
    { target: 'port-aurelio', text: 'Se non sai cosa fare, chiedi a me.' },
    { target: 'port-dive', text: 'Tuffati: torni in mare.' },
  ],
  timone: [
    { target: 'helm-throttle', text: 'Il Gas: tira su la leva per andare più forte. Più vai forte, più carburante bruci.' },
    { target: 'helm-dir', text: 'Le frecce girano la nave a sinistra o a destra.' },
    { target: 'helm-engine', text: 'Il motore: verde acceso, rosso spento. Spento non consuma.' },
    { target: 'helm-sonar', text: 'Il Sonar: a velocità bassa ascolta il mare. Le bestie grandi rispondono con un’eco.' },
    { target: 'helm-dive-lever', text: 'Sali / Scendi: sulle navi che si immergono. Il pulsante B la blocca dove la lasci.' },
    { target: 'helm-launch', text: 'Con la nave ferma: cala il sottomarino per esplorare il fondo.' },
    { target: 'helm-light', text: 'Luce: un faro sotto lo scafo, a nave ferma. Le bestie curiose vengono a vedere, i predatori arrivano dopo.' },
    { target: 'helm-swim', text: 'Tuffati: scendi in acqua a nuoto, con la squadra.' },
    { target: 'helm-rescue', text: 'Razzo di soccorso: se resti senza carburante o la nave è rotta, ti riportano in porto.' },
    { target: 'helm-cockpit', text: 'Cockpit: sonar, radar, mappa e il Diario delle bestie che segui.' },
  ],
  cockpit: [
    { target: 'cockpit-sonar', text: 'Sonar: le echi delle bestie sotto la nave, con la loro grandezza; in oro le leggende, in arancio l’eco anomala di una tana. Tocca un’eco per sapere che bestia è.' },
    { target: 'cockpit-radar', text: 'Radar: roccia, ghiaccio e moli vicini, e le bestie come punti grandi quanto loro.' },
    { target: 'cockpit-plancia', text: 'Plancia: la mappa, la tua rotta, le bestie che segui.' },
    { target: 'cockpit-drone', text: 'Drone: manda il drone a esplorare e leggi cosa ha visto.' },
    { target: 'cockpit-diario', text: 'Diario: le taglie e il leggendario che segui, con dove trovarli.' },
    { target: 'cockpit-recinto', text: 'Recinto: le bestie nella stiva della nave.' },
    { target: 'cockpit-zaino', text: 'Zaino: quello che porti a bordo.' },
    { target: 'cockpit-back', text: 'Torna al timone quando vuoi: la nave intanto va avanti.' },
  ],
};

/** A round of the sea waits this long with no dialogue on screen (Aurelio's tips first). */
export const COACH_QUIET_SECONDS = 0.8;

/** In story.seen: this round was shown. */
export const coachSeen = (r: CoachRound): string => `coach-${r}`;
