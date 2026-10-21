# Progressi

## Dove siamo (aggiornato il 21 ottobre 2026, v0.91.1)

- **Gioco:** mare in tre zone (baia, Delta, mare aperto infinito), 34 bestie con albini, alfa, forme finali e uniche, battaglie a turni con mosse e domatura, flotta (navi, sottomarini, motoscafi), porti con bacheca, mercato, cantiere, riparazioni, sonar e cacce, meteo, suoni e musiche.
- **Salvataggi:** menu iniziale con più partite (`systems/save/slots.ts`); una partita illeggibile non si sovrascrive mai. Dire sempre al proprietario quando un lotto tocca i salvataggi.
- **Immagini:** quasi tutte le bestie hanno card, profili, fronte e retro. Mancano:
  - Kraken, Leviatano, calamaro colossale, serpente di mare (disegno provvisorio);
  - conchiglie (`docs/GEMINI-LOTTO-7.md`);
  - sfondo del menu iniziale (`art-inbox/menu_sfondo.jpg`).
- **Strumenti di prova da togliere più avanti** (il proprietario l'ha chiesto): 5 tocchi sulla versione in pausa, "+50.000 denti", Galleria di prova (`systems/gallery.ts`, `ui/galleryBar.ts`).
- **Feedback del 20 e del 21 ottobre:** fatto tutto (lotti S–Z, Y, AA, AB, AC). Aspetto le immagini di `docs/GEMINI-LOTTO-8.md` (19 da rifare) e quelle del Leviatano (le dà il proprietario: ricordarglielo).
- **Ruoli, tipi e compagni** (`docs/PROPOSTA-RUOLI.md`, confermata): AD-1 tipi chiari ✅, AD-2 cavalcature ✅; **prossimi AD-3 il branco** (cavalcatura + due compagni, caccia dei pesci in vista, poteri per tipo) e **AD-4 poteri speciali**.
- **Dopo AD-3 e AD-4:** correzioni del "Blocco 2" ancora aperte, Blocco 6 (cattura e combattimento, da progettare insieme), poi blocchi 7-10 (`docs/BACKLOG.md`).
- **Ultima pulizia:** v0.91.1 (21 ottobre), la prossima dopo altri 3 lotti. La galleria e gli strumenti di prova restano finché il proprietario prova.
- **Storia:** `docs/PROGRESS-ARCHIVIO.md` ha le sessioni fino al 20 ottobre; qui sotto il dettaglio del 21 ottobre.
- **Per vedere il gioco quando il pannello del browser è nascosto:** `renderer.snapshot` più `node scripts/snap-server.mjs <cartella>` (dettagli nella sessione del lotto AA, nell'archivio).

## Pulizia dopo i lotti AA–AD-2 (21 ottobre 2026) → v0.91.1

- Nessun codice morto, nessun file del gioco oltre le 300 righe, nessuno stile inutilizzato, nessun riferimento a cose tolte (controlli automatici).
- **Documenti:**
  - sessioni del 20 ottobre nell'archivio;
  - decisione AD-2 in `DECISIONS.md`;
  - ruoli e paura dei superpredatori nel `GDD.md`.

## Lotto AD-2, le cavalcature (21 ottobre 2026) → v0.91.0

- **`systems/beasts/mountTraits.ts` (nuovo):**
  - `rideSpeedOf` (spostato da `mountSpeed`), `profileOf`, `biteReach` (filtratori ×1,6, `FILTER_FEEDERS`), `mountDepthM` (`RIDE_TALENTS.depthM` per tipo, giganti fino a ×1,5), `mountBars`;
  - `ridesForm` (ora usata da `canRide`), `talentOf`, `openingFor` (Assalto), `isApex` (Predatore con 3 stelle o più, più l'orca), `isLegendary`, `fearOf`;
  - i dati sono in `RIDE_TALENTS` e `RIDE_TALENT_TEXT` (`data/beasts.ts`).
- **Collegamenti:**
  - `feeding.ts` usa `biteReach`;
  - `game.ts`: in groppa `maxDepthY` è il massimo fra muta e bestia (`rideDepthM` in `rideStamina.ts`);
  - `encounters.ts`: `riderFear` passato a `roam` (tiene lontani), `openingFor` e `fear` in `requestBattle` → `BattleRequest.fear`;
  - `battleSetup`: `foeFleeTries` e `frozen`;
  - `BattleScene`: paralisi ("paralizzato dalla paura"); `foeTriesFlee` (`tameFlee.ts`) al posto della mossa del nemico; esito `'escaped'`;
  - `abilities.ts`: `breakTiles` per ossa e ghiaccio (Ariete e Rompighiaccio, evento `bonesBroken` con `ice`);
  - `rideTalents.ts` (nuovo): la Scarica;
  - `lamp.ts`: Occhi del buio.
- **Scheda:** `sheet.ride` (barre e talento), `rideBars` in `sheetPages.ts`.
- **Pulizia:** la battaglia di prova (`?battaglia`) è in `scenes/battlePrototype.ts`, così `BattleScene` resta sotto le 300 righe.
- **Test:** `tests/lottoAD2.test.ts`; `feeding.test.ts` ora usa una bestia con la sua specie.
- **Nel browser** a 667×375: scheda dello squalo bianco, barre 4/3/3/1 e "Assalto", dentro lo schermo.
- **Da tarare con il proprietario:** gli intervalli delle barre (`RIDE_TALENTS.bars`), le profondità per tipo, la probabilità di fuga (0,5).

**Da provare sull'iPhone:**
- le schede di più cavalcature;
- scattare contro una bestia con uno squalo;
- la Scarica con la manta o Folgore;
- scendere in profondità con il capodoglio;
- Rompighiaccio con l'orca vicino agli iceberg;
- una battaglia con un superpredatore molto più forte.

## Lotto AD-1, i tipi chiari (21 ottobre 2026) → v0.90.0

- **Proposta su ruoli, tipi e compagni:** `docs/PROPOSTA-RUOLI.md`, confermata dal proprietario con le sue modifiche:
  - la paura dei superpredatori: almeno 30 livelli in più per tenere lontani e far tentare la fuga 1-2 volte; la paralisi di un turno solo per un predatore leggendario con almeno 10 livelli in più;
  - il branco di due compagni che caccia solo i pesci in vista;
  - i poteri per tipo basati su ciò che esiste in mare (Caccia, Guscio contro la pressione, Scarica, Eco, Lanterna).
  - **Prossimi lotti:** AD-2 cavalcature, AD-3 branco, AD-4 poteri speciali.
- **Questo lotto:**
  - `TYPES.beatsWhy` (una frase per vittoria) al posto di `why`; `weakAgainst` in `rules.ts`;
  - la scheda ha `strongAgainst`/`weakAgainst` e le righe "Forte contro / Debole contro" (`sheetPages.ts`, `.sheet-vs`);
  - `ui/typeWheel.ts` (nuovo), aperto dal pulsante "Tipi" del bestiario;
  - il delfino e le sue tre mosse diventano Glaciali;
  - la regola dei tipi è nel `GDD.md`;
  - `box-sizing: border-box` su `.bestiary-panel` e `.sheet-card`: uscivano di 5 px a 375 px d'altezza.
- **Nota:** la ruota è "ognuno batte il successivo e quello tre posti dopo", come nei dati. Nella proposta avevo scritto per sbaglio "i due dopo": corretto.
- **Test:** `tests/lottoAD1.test.ts`.
- **Nel browser** a 667×375: ruota, bestiario e scheda misurati dentro lo schermo; le 10 frasi della ruota e le righe "Forte contro / Debole contro" sono presenti.

**Da provare sull'iPhone:** bestiario, pulsante "Tipi", scheda di qualche bestia, una battaglia con il delfino.

## Lotto AC, il movimento delle cavalcature (21 ottobre 2026) → v0.89.0

- **Folgore:** tolto `girth: 1.6` (`species.ts`).
- **`systems/rideMotion.ts` (nuovo):**
  - `rideProfile(lunghezza, velocità)` ricava tempi di accelerazione, scivolata, spinta e durata dello scatto, ricarica, salto e costo in resistenza da `RIDE_MOTION` (`data/beasts.ts`), dalla bestia piccola a quella gigante;
  - `swimMount`: il joystick spinge fino alla velocità della bestia e mai oltre; la deriva di lato nelle virate si smorza (`turnGrip`); lo scatto spinge lungo la direzione fino a `boost` volte e poi cala (`dashCurve`); sopra la velocità rallenta piano;
  - `stepDiver` lo usa quando sei in groppa (il nuoto del sub è in `swimSelf`); tolti `TEAM_RULES.accelMult` e `rideDash`.
- **Resistenza:** `systems/stamina.ts` (`staminaOf`, `spendDash`, `spendSprint`, `rest`).
  - È tenuta in `beasts.stamina` per bestia, **non salvata**.
  - `systems/rideStamina.ts`: `rideNow` per il passo del sub e `stepRideStamina` dopo (evento `mountWorn`).
  - Barra `.hud-stamina` in `ui/hud.ts`.
- **Salto:** `leaveWater(..., leap)` con il tetto in base alla grandezza della bestia. Lo scatto non è più smorzato vicino alla superficie: è lui che lancia fuori dall'acqua.
- **Test:** `tests/lottoAC.test.ts` (11); `lottoL` aggiornato allo scatto vero.
- **Nel browser:** foto di Folgore in groppa (lungo e sottile); barra di resistenza misurata a 667×375 (sotto l'ossigeno, non tocca niente).

**Da provare sull'iPhone:**
- in groppa a una bestia piccola e veloce (squalo mako, pesce vela) e a una grande (megattera, Folgore): accelerare, lasciare il joystick, scattare da fermo e in corsa;
- scattare fino a sfinirla;
- cambiare cavalcatura;
- saltare fuori dall'acqua a velocità diverse.

## Lotto AB, il mare più vero (21 ottobre 2026) → v0.88.0

- **Filtro dell'acqua:** `views/waterFilter.ts` (nuovo).
  - È una grafica in modalità MULTIPLY, l'ultima del livello `front` del mondo, sotto il buio. Copre dalle onde (`seaHeight`) in giù: a colonne nella fascia delle onde, poi a fasce intere.
  - Il colore viene da `systems/waterTint.ts` `filterColor` (rampa `SEA.filter.byY`, poco rosso già vicino alla superficie) e vira al marrone con la torbidità.
  - Tolti `surfaceOver.ts` e `SEA.bodyWater`.
  - **Perché:** il buio di `lightView` è uniforme sullo schermo e dipende dalla telecamera, non distingue sopra e sotto l'acqua.
- **Raggi e particelle:** `views/seaLight.ts` (nuovo) e `views/seaRays.ts` (calcoli puri: `raysInView`, `rayLightAt`).
  - Raggi: texture con bordi morbidi, `SEA.lightRays`; copia davanti nel livello `overlay`, sotto il buio.
  - Particelle: tre strati (`SEA.particles`), la luce dei raggi le accende.
  - `backgroundView` non disegna più i vecchi raggi e la neve.
  - In `worldViews` la luce del giorno dipende da profondità (`fadePower`), meteo e torbidità.
- **Audio:** `bubblesFor` (`seaAmbience`): nessuna bollicina nuotando (`perSecondAtFullSpeed: 0`), 3 scattando.
- **Provato con le foto** (`scripts/snap-server.mjs`):
  - il filtro era troppo debole, l'ho rinforzato;
  - i raggi erano ammucchiati e quasi spenti: ora sono distribuiti, con la luce più lunga;
  - il tuffo del megalodonte, con il mare calmo e in tempesta.
- **Test:** `tests/lottoAB.test.ts`.

**Da provare sull'iPhone:**
- tuffarsi in groppa vicino alla superficie;
- nuotare vicino alla superficie di giorno, poi scendere;
- il Delta torbido;
- la tempesta.
