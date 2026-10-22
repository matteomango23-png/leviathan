# Progressi

## Dove siamo (aggiornato il 22 ottobre 2026, v0.102.0)

- **Gioco:** mare in tre zone (baia, Delta, mare aperto infinito), 34 bestie con albini, alfa, forme finali e uniche, battaglie a turni con mosse e domatura, flotta (navi, sottomarini, motoscafi), porti con bacheca, mercato, cantiere, riparazioni, sonar e cacce, meteo, suoni e musiche.
- **Salvataggi:** menu iniziale con più partite (`systems/save/slots.ts`); una partita illeggibile non si sovrascrive mai. Dire sempre al proprietario quando un lotto tocca i salvataggi.
- **Immagini:** quasi tutte le bestie hanno card, profili, fronte e retro. Mancano:
  - Kraken, Leviatano, calamaro colossale, serpente di mare (disegno provvisorio);
  - conchiglie (`docs/GEMINI-LOTTO-7.md`);
  - sfondo del menu iniziale (`art-inbox/menu_sfondo.jpg`).
- **Strumenti di prova da togliere più avanti** (il proprietario l'ha chiesto): 5 tocchi sulla versione in pausa, "+50.000 denti", Galleria di prova (`systems/gallery.ts`, `ui/galleryBar.ts`).
- **Immagini attese:** del lotto 8 (`docs/GEMINI-LOTTO-8.md`) mancano `squalo_balena_back` e i 6 dei coccodrilli; il Leviatano (le dà il proprietario: ricordarglielo); la grafica della schermata iniziale (`art-inbox/splash.jpg`).
- **Note del 21 ottobre sera** (`docs/BACKLOG.md`, in alto): AE schermo e musica ✅, AF salti e incastri ✅, AG schede ✅, AH sub ✅, AI bagliori ✅; AD-4 poteri speciali ✅ (v0.99.0). Blocco 2 già fatto; **Blocco 6 in corso**: BA arpione e morsi ✅, BB vasca e costa ✅, BC mosse animate ✅. **Prossimo: la pulizia** (rimandata dal proprietario a dopo il Blocco 6). **Blocco 8 (immagini) rimandato** finché il proprietario non lo dice (ricordarglielo).
- **Ruoli, tipi e compagni** (`docs/PROPOSTA-RUOLI.md`, confermata): AD-1 tipi chiari ✅, AD-2 cavalcature ✅, AD-3 il branco ✅, AD-4 poteri speciali ✅ (v0.99.0): proposta completata.
- **Dopo AD-3 e AD-4:** correzioni del "Blocco 2" ancora aperte, Blocco 6 (cattura e combattimento, da progettare insieme), poi blocchi 7-10 (`docs/BACKLOG.md`).
- **Ultima pulizia:** v0.94.1 (21 ottobre), la prossima dopo altri 3 lotti. La galleria e gli strumenti di prova restano finché il proprietario prova.
- **Storia:** `docs/PROGRESS-ARCHIVIO.md` ha le sessioni fino al lotto AD-3 (v0.92.0); qui sotto le ultime.
- **Per vedere il gioco quando il pannello del browser è nascosto:** `renderer.snapshot` più `node scripts/snap-server.mjs <cartella>` (dettagli nella sessione del lotto AA, nell'archivio).

## Lotto BC, mosse animate (22 ottobre 2026, Blocco 6) → v0.102.0

- **Dati:** `data/moveAnims.ts` (`MoveAnim` e le eccezioni per id: `ram`, `tail`, `burst`, `ranged`).
- **Regola:** `systems/battle/moveAnim.ts` `moveAnimOf`:
  - fisico → `bite`, speciale → `ranged`;
  - stato tutto su di sé → `self`, altrimenti `hex`;
  - il passo `attack` della battaglia porta `anim`.
- **Vista:**
  - `views/battle/moveAnims.ts` (`playMove`): i movimenti, compreso il vecchio affondo;
  - `views/battle/moveFx.ts` (`MoveFx`): fauci, fendente, colpo, anelli, alone, onde;
  - `BattleView.attack` sostituisce `lunge`.
- **Test:** `tests/lottoBC.test.ts`.
- **Nel browser:** foto di morso, getto, coda, onde e carica nella galleria; il fendente corretto per attraversare il corpo.

**Da provare sull'iPhone:** qualche battaglia con mosse diverse.

## Lotto BB, vasca e costa (22 ottobre 2026, Blocco 6) → v0.101.0

- **Vasca:**
  - in `ship/shipPool.ts`: `poolPicks` e `poolOut` su `ShipState` (non salvati), `poolNow`, `goesInPool`, `togglePool`;
  - nel pannello della squadra a bordo (`teamPanel.ts`, modo `ship`) c'è il pulsante "Metti in vasca / In vasca".
- **Costa:**
  - `COAST_LEVELS` in `data/beasts.ts`;
  - `rollWildLevel` senza fascia (le acque fatte a mano) tira tra `byDanger` con `t^1,6`;
  - il mare aperto, che ha sempre una fascia, non cambia.
- **Cambiato rispetto al piano:** nessun aumento con la profondità della baia (non serviva).
- **Test:** `tests/lottoBB.test.ts`.
- **Nel browser:** non provato. Il pulsante è un elemento semplice del pannello già esistente: va guardato sull'iPhone.

**Da provare sull'iPhone:**
- a bordo, aprire il Cockpit e la squadra, mettere e togliere una bestia dalla vasca;
- in baia, guardare i livelli delle bestie.

## Lotto BA, l'arpione e i morsi (22 ottobre 2026, Blocco 6) → v0.100.0

- **Blocco 2:** tutte le correzioni erano già fatte (v0.48.0); segnate nel `BACKLOG.md`.
- **Arpione:**
  - `systems/swimFight.ts` (nuovo): `weaponHitsBeast` toglie `HARPOON_WEAKEN.perDamage` × il danno dell'arma fino a `max` (`w.wounds`); l'aggressiva insegue (`chase`, `charging`), le altre scappano;
  - `battleSetup` fa entrare la bestia con `maxHp × (1 − wounds)`;
  - `beastsLayer.woundBar` disegna la barretta.
- **Morso a nuoto:**
  - `swimBite`: un cuore, `SWIM_BITE.push`, tregua `truce` (× `gentleTruce` sotto `gentleUntilLevel`);
  - in `encounters.ts` il contatto senza cavalcatura morde, in groppa fa partire la battaglia come prima.
- **Affrontare:**
  - `hunterAfterYou` (inseguitore aggressivo entro `engageRadius`, se hai qualcuno in piedi) attiva il pulsante `affronta`;
  - `faceHunter` (`encounters.ts`) apre la battaglia; il tocco su una bestia della barra la mette in testa (`BattleRequest.lead`, `battleSetup`).
- **Test:** `tests/lottoBA.test.ts`; `sea.test.ts` aggiornato (il contatto a nuoto non apre più la battaglia; il colpo d'arpione non la apre più).
- **Nel browser:**
  - tre colpi d'arpione su uno squalo tigre: barretta al 70 %;
  - lui ti insegue, ti morde (un cuore, messaggio) e il pulsante diventa "Affronta".

**Da provare sull'iPhone:**
- sfiancare una bestia con l'arpione e poi domarla;
- farsi raggiungere da un predatore a nuoto e affrontarlo, o scappare.

## Lotto AD-4, poteri speciali (22 ottobre 2026) → v0.99.0

- **Dati:** `data/powers.ts` (`SPECIAL_POWER_OF`, `SPECIAL_POWERS`, `SPECIAL_POWER_TEXT`).
- **Logica:** `systems/specialPowers.ts` (`powerHolder`, `wreckShown`, `canOpen`, `wreckReach`, `scavengerBonus`, `longEcho`, `stepAirStation`, `stepBuried`). Un potere vale con la bestia nel branco (`follow`) o sotto di te.
- **Forzieri:**
  - `WreckDef.kind`: il forziere di mezzo di ogni regione è `locked` (denti × 1,5);
  - un quarto forziere, `relitto_<regione>_4`, è `buried` (denti × 2 e oggetto, al 40 % della regione);
  - `nearWreck` accetta portata e filtro, `openWreck` il bonus della lontra;
  - "Apri" su un forziere chiuso senza polpo manda l'evento `wreckLocked`.
- **Disegno:** `placesView.ts` disegna le incrostazioni del forziere chiuso e un mucchio di sabbia per quello sepolto (visibile solo vicino al martello, con un alone azzurro pulsante).
- **Eco:** `stepPackEcho` usa il beluga, anche cavalcato (portata × 2, ogni 3 s).
- **Cambiato rispetto al piano:** la lontra non porta i pesci nella borsa, perché i pesci del branco ci finiscono già per tutti.
- **Test:** `tests/lottoAD4.test.ts`.
- **Nel browser:**
  - in groppa allo squalo martello, vicino a `relitto_barriera_esterna_4` il forziere sepolto brilla e compare il messaggio;
  - al forziere chiuso "Apri" risponde "serve un polpo gigante".
- **Salvataggi:** il formato non cambia; i forzieri già aperti restano aperti (stessi nomi).

**Da provare sull'iPhone:**
- un forziere chiuso, prima senza e poi con il polpo;
- lo squalo martello in mare aperto;
- l'aria del tricheco da fermo.

## Lotto AJ, salire in groppa e ruoli (22 ottobre 2026) → v0.98.0

- **Ruoli:**
  - `MOUNT_RULE` in `data/beasts.ts`: almeno 4,5 m, `noBack` (mai cavalcate), `onHead` (seduti sulla testa, `headForward`);
  - `ridesForm` non guarda più `role`, che resta per le statistiche di battaglia;
  - `riderForwardOf` in `mountTraits.ts` dice dove sei seduto;
  - la scheda scrive "Cavalcatura" secondo `ridesForm`.
- **Salire:**
  - in `mount.ts` la bestia punta alla sella sotto di te e rallenta (`TEAM_RULES.arrive`); arrivata, il sub prende il suo centro;
  - il disegno parte da dove eri (`seatFrom`, `seatT`, `seat.ts` `seatPoint`/`seatLag`, `mountSeconds` 0,35 s);
  - `riderPose` in `beastsLayer.ts` fa la miscela.
- **Scendere:** `dismount` mette il sub sulla sella con una spinta (`dismountPush`); la bestia va via nella sua direzione (`sendAway(..., keepFace)`).
- **Arrivi e partenze:**
  - `callMount(..., view)` fa nascere la bestia appena fuori dall'inquadratura;
  - andando via accelera (`leaveSpeed`) e viene tolta fuori dallo schermo (`leftView`); sfuma solo se resta in vista oltre `leaveSeconds × leaveFallback`.
- **A bordo:**
  - `packAboard` in `pack.ts` e `vesselOf` in `vehicles.ts`: sotto `PACK.followShipBelow` (75 u/s) i compagni restano, altrimenti se ne vanno;
  - i compagni non salgono mai sopra la superficie inseguendo il sub.
- **Barra della squadra:** `.team-slot:not(.rideable)` violetto.
- **Test:** `tests/lottoAJ.test.ts`; in `lottoAD2` ora il più profondo può essere anche un calamaro colossale o il Kraken.
- **Nel browser:**
  - chiamata dello squalo bianco: nasce fuori dallo schermo, sale in sella dopo 1,3 s;
  - il punto in cui è disegnato il sub si sposta al massimo di 0,77 unità per fotogramma salendo e di 0,3 scendendo;
  - andando via esce nuotando.

**Da provare sull'iPhone:**
- chiamare una cavalcatura e salirci;
- scendere;
- chiamare un compagno e mandarlo via;
- salire sulla nave e partire piano, poi a tutta velocità.

## Lotto AI, bagliori (21 ottobre 2026) → v0.97.0

- **Dati:** `data/glow.ts` (`GLOW` per chiave d'immagine: tinta, saturazione, luminosità, modo `pulse`/`steady`, forza; `GLOW_PULSE`, `GLOW_ART`). Il file non importa niente perché lo legge anche lo script.
- **Immagini:** `scripts/art/glow.ts`, chiamato da `npm run art` a ogni giro. Da `public/sprites` prende solo i pixel di quel colore e li salva sfumati in `public/glow/` (stesso nome e stessa cornice). Elenco `GLOW_KEYS` e impronte in `sprites.generated.ts`.
- **In mare:** `BeastSprite` ha una seconda fila di strisce in modo additivo, che copiano posizione e piega di quelle del corpo. La luce viene da `systems/glowPulse.ts` (`glowAt`): una fascia che va dalla testa alla coda e torna in 1,6 s; il resto al 35 %, con un tremolio.
- **In battaglia:** `views/battle/battleGlow.ts`, 8 fette verticali dell'immagine di bagliore sopra quella di tre quarti, caricate con le immagini della battaglia. Spente quando la bestia lampeggia o diventa bianca.
- **Test:** `tests/lottoAI.test.ts`.
- **Nel browser:**
  - in mare, in groppa a Folgore: le rune brillano gialle e la luce scorre;
  - in battaglia: le strisce di Saetta brillano.
- **Velocità:** i controlli contro la roccia delle sardine lontane (v0.94.0) rallentavano il gioco di 2-3 volte in mare aperto. Tolti: basta che il banco eviti la roccia, e una sardina rimasta nel ghiaccio ne esce da sola appena è vicina (`moveBody`).
- **Da aggiungere una bestia che brilla:** una riga in `GLOW`, poi `npm run art`.

**Da provare sull'iPhone:** Folgore e Saetta in mare e in battaglia; una rana pescatrice o un dunkleosteus nel buio.

## Lotto AH, il sub (21 ottobre 2026) → v0.96.0

- **Scatto a nuoto:**
  - `DIVER.dash` ora ha `accel`, `duration` 0,45 s, `settle` e la resistenza (`dashes`, `regenSeconds`, `exhaustedSeconds`);
  - `swimSelf` spinge lungo la mira durante lo scatto, fino a `speed`; dopo, la velocità scende piano verso l'andatura invece di tagliarsi di colpo.
- **Resistenza del sub:**
  - `systems/diverStamina.ts` (nuovo), con la chiave `diver` in `beasts.stamina` (non si salva);
  - `rest()` di `stamina.ts` ora accetta i tempi propri;
  - vuota manda l'evento `diverWorn` e `canDash` diventa falso finché non è piena;
  - l'HUD mostra la barra del sub quando non è piena, quella della cavalcatura in groppa.
- **Freccia verso la nave:**
  - `systems/shipPointer.ts` (`arrowTo`, `shipArrow`) punta a `respawnPoint` (la nave, o il porto), solo fuori dallo schermo e fuori dai mezzi;
  - `SHIP_POINTER.edge` in `data/diver.ts`;
  - la freccia SVG `.ship-arrow` è disegnata in `ui/hud.ts`.
- **Test:** `tests/lottoAH.test.ts`; `game.test.ts` adattato allo scatto graduale.
- **Nel browser:** in groppa all'orca con la nave 3000 unità a sinistra, la freccia è sul bordo sinistro e punta a sinistra.

**Da provare sull'iPhone:**
- quattro scatti di fila a nuoto e la barra;
- allontanarsi dalla nave e seguire la freccia.

## Lotto AG, schede (21 ottobre 2026) → v0.95.0

- **Causa del pallino nero:** `knowsForm` guardava solo la squadra di adesso e gli avvistamenti. Evolvendo, le forme precedenti mai viste in mare restavano "sconosciute" (ombra nera, non toccabile).
- **Ora:**
  - una bestia della squadra fa conoscere tutte le forme della sua linea fino alla sua (`grewFrom` in `bestiaryEntries.ts`);
  - `openBeastSheet(..., { unknown: true })` apre la scheda sfocata (`.sheet-card.unknown`), con "???", un testo e niente pagine;
  - i pallini sconosciuti sono sfocati e toccabili.
- **Test:** `tests/lottoAG.test.ts`, che controlla anche che ogni forma di ogni linea abbia la sua illustrazione.
- **Nel browser:** con Saetta in squadra i pallini sono Scintilla (conosciuta), Saetta (accesa), Folgore (sfocata); toccando Folgore si apre la scheda sfocata "???".

**Da provare sull'iPhone:** la scheda di Folgore e le evoluzioni nel bestiario.

## Pulizia dopo i lotti AD-3, AE, AF (21 ottobre 2026) → v0.94.1

- Tolto `splashEntered` (mai usato). Non più esportate le funzioni usate solo nel loro file: `isLegendary`, `speedShareOf`, `mountProfile`, `nameSeenEchoes`, `RideNow`.
- Le sessioni dal lotto AB al lotto AD-3 sono passate in `PROGRESS-ARCHIVIO.md`.
- Tutti i file di codice sono sotto le 300 righe (sopra restano solo file di dati).
- Nessuna funzione nuova; i salvataggi non cambiano.

## Lotto AF, bestiario, salti e incastri (21 ottobre 2026) → v0.94.0

- **Immagini:** 13 del lotto 8 riconosciute dalla cartella del desktop e messe in `art-inbox/` (le vecchie sono `_vecchia_`/`_vecchia2_`).
  - Archelon: profilo, bocca aperta, fronte e retro.
  - Saetta: fronte e retro.
  - Un'immagine ciascuno per murena, squalo bianco albino, tartaruga liuto, manta, megattera.
  - Lontra: fronte (specchiato con `_flip`) e retro.
  - Tolto il taglio in basso della manta (la roccia non c'è più).
  - **Mancano:** `squalo_balena_back` e i 6 dei coccodrilli.
- **Bestiario:** `data/bestiaryOrder.ts` (famiglie in ordine); `bestiaryEntries` lo segue (`bestiaryOrder()`, campo `family`); titoli `.bestiary-family` nascosti se la famiglia è vuota nel filtro o con l'ordine per rarità.
- **Collisioni** (`COLLISION` in `worldLayout.ts`):
  - `moveBody` fa scivolare lungo l'ostacolo (in su o in giù fino a `slideSlope` × il passo);
  - incastrato anche con il centro, esce verso l'acqua libera (`nearestOpen(…, true)`, prima in basso, mai sopra la superficie).
- **Salto:**
  - `stepAirborne` muove con le collisioni;
  - atterrando su qualcosa fuori dall'acqua, `landOn` fa un saltino e scivola indietro (`RIDE_BREACH.landHop`, `slideSpeed`);
  - in volo lo scafo della nave spinge fuori lungo la sua forma;
  - "sotto la chiglia" solo per una bestia già sott'acqua.
- **Sardine:** il banco cambia meta se la strada entra nella roccia; i pesci lontani non entrano nella roccia.
- **Test:** `tests/lottoAF.test.ts`.
- **Nel browser:** salti dello squalo bianco contro la nave: atterra, scivola indietro, spostamento massimo per fotogramma 1,8 unità (prima 21); bestiario con 12 titoli.

**Da provare sull'iPhone:**
- saltare sulla nave, su un iceberg e su un'isoletta;
- nuotare con una bestia grande sotto gli iceberg;
- il bestiario.

## Lotto AE, schermo e musica (21 ottobre 2026) → v0.93.0

- **Schermata iniziale:**
  - `#splash` in `index.html` (stile in `style.css`), `ui/splash.ts` (`initSplash`, `splashReady` da `TitleScene`);
  - il tocco manda `leviatano-entered` e `main.ts` rimisura (subito, dopo 300 ms e dopo 900 ms);
  - immagine `public/ui/splash.webp` da `art-inbox/splash.jpg` (`npm run art`, tipo "screen"), caricata solo se esiste.
- **Perché la musica non si sentiva:** l'audio parte al primo tocco, e il primo tocco sceglieva già la partita, spegnendo la musica.
- **Misure e verticale:**
  - `ui/orientation.ts` (nuovo): `gameSize` prende la misura più grande fra `inner`, `visualViewport` e `clientWidth`, più lo schermo dalla Home; `isTurned`, `safeSides`;
  - `main.ts` mette `html.turned`, `--app-w`, `--app-h` e i `--safe-*` scambiati, e fa `scrollTo(0,0)`;
  - `style.css`: `body` fisso, almeno `100lvw`/`100lvh`; da girato `translateX(--app-h) rotate(90deg)`;
  - `safeBottomPx` legge `--safe-b`;
  - tolto il messaggio "Ruota il telefono".
  - Funziona perché tutti i comandi sono elementi della pagina (Phaser non riceve tocchi).
- **Musica:** `TITLE_MUSIC` riscritta, 16 battute in re minore a 52 bpm: voce di basso, coro, bordone, tamburo ogni 4 battute.
- **Test:** `tests/lottoAE.test.ts`.
- **Nel browser:**
  - schermata iniziale → tocco → menu;
  - emulazione verticale 375×812: pagina girata, Phaser 1624×750, il pulsante "Nuova partita" risponde nel punto giusto (`elementFromPoint`).
- **Limiti:**
  - la barra nera non si riproduce al computer: serve la prova sull'iPhone;
  - il verso della rotazione è fisso (orario): tenendo il telefono dall'altra parte il gioco appare capovolto.

**Da provare sull'iPhone:**
- aprire l'app dalla Home in orizzontale, poi in verticale (e con il blocco della rotazione attivo);
- ascoltare la musica del menu.
