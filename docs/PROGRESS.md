# Progressi

## Onde realistiche (9 ottobre 2026) → v0.60.0

**Fatto:**
- `systems/sea.ts`: onde di Gerstner su 8 treni (`SEA_STATE.waves.lengths`), velocità dalla legge del mare profondo, ripidità che cresce col meteo, onda lunga di fondo (`swell`). `seaHeight` = onde + colonne; `troughDepth` per lo sfondo.
- `systems/waterColumns.ts`: fila di colonne d'acqua a molle attorno alla telecamera (`COLUMNS`), spinte dagli scafi (`hullOnWater`: onda di prua, cavo dietro, atterraggio). Il galleggiamento (`ride.ts`) legge `seaHeight`.
- `views/seaSurfaceView.ts` riscritta: mare pieno senza contorno, luce sulle creste, schiuma sulle creste ripide, onde lontane solo col mare mosso. Tolto il contorno anche in `waterOver`.
- Nave più morbida (`ride.big` k 11, c 1.5, `follow` 0.15). Gli scafi leggono solo `waveHeight` (niente trampolino); colonne limitate a `COLUMNS.maxHeight`.
- Sottomarino: sale fino a `subTopY` (`SUBMARINE.surfaceFloat`), vicino alla superficie risale da solo (`floatUp`); ormeggio e rimorchio lo lasciano lì.
- Pioggia e neve si fermano sulle onde (`weatherView`), `waterOver` è una fascia che sfuma, il mare sfuma sotto il cavo (`FADE`), torbidità dello schermo pesata (`viewWet` in `WorldScene`).
- Test: `tests/waves.test.ts`.

**Da provare sull'iPhone:**
1. Col sereno: nessuna linea dritta sulla superficie.
2. In tempesta con la nave a tutta velocità: onda di prua, schiuma, spruzzi; la nave sale e scende morbida.
3. Varo del motoscafo e del sottomarino in tempesta: niente filtro colore.
4. Sottomarino: risali in superficie e lascia la leva: deve galleggiare con ponte e torretta fuori.
5. La pioggia cade fino alle onde, nessuna riga dritta.

**Da regolare a gusto** (`data/sea.ts`): `swell`, `amp`, `steepStorm`, `COLUMNS.bowWave`, `ride.big`.

## Galleggiamento vero (9 ottobre 2026) → v0.59.1

**Fatto:**
- `systems/ride.ts`: corpo su due punti (prua e poppa), spinta dell'acqua che dipende da quanto è immerso e dalla velocità relativa all'onda, gravità.
  - Rigidità e smorzamento secondo la lunghezza (`SEA_STATE.ride`).
  - Ribaltamento delle barche leggere (`flipped`, `boatCapsized`, −20% di scafo).
  - `plunge` per gli spruzzi.
- **Onde:** trocoidali (`sharpness`).
- **Superficie:** `troughDepth`. Lo sfondo dipinge il cielo fino al cavo più profondo e `seaSurfaceView` disegna il mare pieno dalla linea dell'onda in giù, quindi niente righe dritte.
- **Scafi:** `views/seaFx.ts`: `waterOver` (acqua davanti agli scafi lungo l'onda) e spruzzi. Scie sulle onde.
- **Sottomarino:** `SubmarineView` lo fa galleggiare in superficie.

**Da provare sull'iPhone:**
1. In tempesta, motoscafo a tutta velocità: salti, atterraggi di muso, ribaltamenti.
2. La nave grande a tutta velocità: prua nelle creste, spruzzi.
3. Controlla che non si veda nessuna linea dritta dell'acqua.

## Il mare vivo (9 ottobre 2026) → v0.59.0

**Fatto:**
- **Mare:** `data/sea.ts` (`SEA_STATE`, `CLARITY`) e `systems/sea.ts`:
  - `waveHeight`, `rideWaves` per navi e barche (al posto di `SHIP.rock`);
  - `currentMult` / `diverCurrentMult`, `boatWear`.
- **Superficie:** `views/seaSurfaceView.ts` (creste, cavi, linea), dietro i mezzi.
- **Barche:** `BoatState.hull` salvato, `repairBoat` al porto, barra dello scafo al timone (`helmBars`); `boatCrew.ts` per tuffo e risalita.
- **Tempesta:** `audio/stormSound.ts` (tuono e pioggia, `STORM_SOUND`), cielo più nero, 8 fulmini al minuto.
- **Acqua:** `systems/clarity.ts` (`turbidityAt`, sagome con `shade` in `beastView`).
- **Fumo del motoscafo EH2:** reattori misurati, fumo davanti e con una scia (`carry`).
- **Meteo:** una partita nuova parte sereno; i test non dipendono più dal meteo a caso.

**Da provare sull'iPhone:**
1. Aspetta o fai capitare una tempesta: onde, pioggia, tuoni.
2. Col motoscafo vai a tutta velocità: guarda la barra dello scafo e i salti sulle onde.
3. Nuota in acqua torbida: lampada corta, sagome.
4. Tuffati dal motoscafo fermo e risali con "A bordo".

**Da regolare a gusto** (`data/sea.ts`): altezza delle onde, forza delle correnti, usura dello scafo, cicli della torbidità.

## Pulizia dopo il blocco 4 (9 ottobre 2026) → v0.58.6

**Fatto:**
- **Tolto:**
  - il cockpit a vapore (`cockpitSteam.ts`, `steamStage.ts`, `bridgeSteam.ts`, `cockpitSteam.css`, `public/bg/cockpit*_far.webp`, `cockpitStyle`); gli originali sono in `art-inbox/_bg_cockpit*`;
  - le funzioni mai usate (`rideAbilities`, `powerOf`, `isPhysical`, `isWounded`, `inBiteReach`, `damageTeamBeast`, `allTemples`, `GAME_FONT`).
- **Divisi:**
  - `save/migrations.ts` e `save/guards.ts` da `saveData.ts`;
  - `newGame.ts` (`GameState`, `createGame`, `applySave`) e `port.ts` da `game.ts`, che li riesporta;
  - `subState.ts` da `submarine.ts`, che lo riesporta;
  - `helmBars.ts` e `helmTypes.ts` da `helmControls.ts`;
  - `systems/lamp.ts` da `WorldScene`;
  - `helm.css` da `ui.css`, importato subito dopo.
- **Restano un po' sopra le 300 righe:** `WorldScene.ts` (396), `battle.ts` (319), `ship.ts` (315), `saveData.ts` (311).

**Da provare sull'iPhone:** niente di nuovo. Gioca come sempre e segnala se qualcosa non va come prima.

**Prossimo:** blocco 5 (Sonar e spedizioni): prima le domande di design, poi il piano in Plan mode.

## Nebbia senza taglio (9 ottobre 2026) → v0.58.5

**Fatto:** in `views/weatherView.ts` la cima del cielo è `min(0, CAMERA.minY sullo schermo)` per nebbia, nuvole e pioggia; la texture della nebbia parte da trasparente.

**Da provare sull'iPhone:** con la nebbia, al timone di una nave grande, il cielo deve sfumare senza linee.

## Cielo e faro (9 ottobre 2026) → v0.58.4

**Fatto:** `paintWater` (`views/backgroundView.ts`) sfuma il cielo su tutta l'altezza visibile, almeno `SEA.skyFade`; `ShipPicture.lampU` (Nightmare 0,88) per il faro degli U-Boat.

**Da provare sull'iPhone:** al timone di una nave grande guarda il cielo; scendi poco con l'Ocean's Nightmare e guarda il fascio davanti alla prua.

## Cockpit rosso del Nightmare (9 ottobre 2026) → v0.58.3

**Fatto:** `cockpitTheme: 'nightmare'` in `data/fleet.ts`; la classe `theme-nightmare` in `cockpit.css` ridefinisce variabili e colori; i colori del sonar in `ui/cockpitTheme.ts` (`sonarPalette`).

**Da provare sull'iPhone:** apri il Cockpit dell'Ocean's Nightmare e passa tutte le schede; con un'altra nave il cockpit resta com'era.

## Sottomarino calato in profondità (9 ottobre 2026) → v0.58.2

**Fatto:**
- `dockPoint` (`ship/geometry.ts`) tiene conto di `dive`.
- `freeSubFromHull` in `vehicles.ts` sposta sotto la chiglia un sottomarino fuori dalla stiva rimasto dentro lo scafo.
- `SPHERE.sizeM` 9. Due test nuovi in `tests/nightmare.test.ts`.

**Da provare sull'iPhone:**
1. Riapri il gioco: il sottomarino bloccato deve trovarsi sotto la nave.
2. Nuota fino a lui, sali, riaggancialo.
3. Poi prova di nuovo: scendi con l'Ocean's Nightmare, apri il portellone e cala il drone; deve fermarsi sotto la nave e riagganciarsi lì.

## Ritocchi al Nightmare (9 ottobre 2026) → v0.58.1

**Fatto:**
- `SPHERE.sizeM` 11.
- Bagliore anche per `sottomarino_drone`: `npm run art` fa `<nome>_glow.webp` per la lista `GLOW`; `placeGlow` in `views/submarineView.ts`, usato anche dal drone in ricognizione.
- Niente tuffo con il drone fuori: `game.ts` scarta il comando, `HelmInfo.canDiveOff` nasconde "Tuffati".
- `.helm-has-air .helm-objective` più in basso.

**Da provare sull'iPhone:**
1. Apri il vano della sfera: deve starci dentro.
2. Guarda il drone (nella stiva aperta e calato in acqua): i dettagli rossi pulsano.
3. Durante la ricognizione "Tuffati" non c'è.
4. Con una caccia seguita, al timone di un U-Boat la scritta non copre più i denti.

## Aria a tempo, rune rosse, sfera nel vano (9 ottobre 2026) → v0.58.0

**Fatto:**
- **Aria:**
  - `SubModel.airSeconds` e `SUBMARINE.air`, logica in `systems/subAir.ts`, `SubState.air` salvata;
  - U-Boat 300 / 480 / 600 s;
  - `RIDE_AIR.bySpecies` vuoto (i cetacei non danno aria), `o2Mult` delle mute tra 0,7 e 0,85;
  - barra al timone `.helm-air`, `#ui.helm-has-air`.
- **Sfera e bestia bloccata:** `SPHERE.sizeM` 19 (con gli spunzoni), visibile nel vano aperto. Bestia bloccata: toccata, battaglia con `first: 'you'`; non sparisce mentre è bloccata.
- **Rune:** `nave_nightmare_glow.webp` fatta da `npm run art` (`GLOW_SHIPS`), `art.glow` disegnato in ADD e pulsante in `ShipView`.
- **U-Boat:** con un portellone aperto `stepDive` ignora la leva.
- **Salvataggi:** `matchSubToShip` all'avvio dà alla nave il suo sottomarino (un salvataggio di prova aveva il batiscafo al posto del drone).

**Da provare sull'iPhone:**
1. In sottomarino scendi e guarda la barra dell'aria; lasciala finire e verifica che risale da solo.
2. Con un U-Boat apri un portellone: non deve salire né scendere.
3. Cavalca un cetaceo sott'acqua: ora usi la tua aria.
4. Blocca una bestia con la sfera, nuota fino a lei: battaglia, con il primo attacco tuo.
5. Guarda le rune dell'Ocean's Nightmare e la sfera nel vano aperto.

## Ritocchi all'Ocean's Nightmare (9 ottobre 2026) → v0.57.1

**Fatto:**
- **Drone** 14 m. `canRecon` vuole il portellone del drone aperto e la nave ferma.
- **Sfera** partita solo con "Invia sfera" (`helmCmd 'sphere'`, `canSendSphere`); nessun portellone si apre o si chiude da solo.
- **Resoconto** nella scheda "Drone" del cockpit (`renderReconTab` in `ui/reconPanel.ts`, `CockpitTab 'drone'`); bussola sotto i ritratti.
- **Pulsanti del timone** su griglia: 3 per colonna (`.helm-still`).
- **Nuova** `nave_nightmare_moto`.

**Da provare sull'iPhone:**
1. Apri il portellone del drone: "Ricognizione", poi richiudilo.
2. Cockpit, scheda Drone: scegli un animale.
3. Apri il vano della sfera e tocca "Invia sfera"; dopo il minuto, quando la sfera è tornata, chiudi il vano.
4. Controlla che con le altre navi i pulsanti del timone siano ancora a posto.

## Parte 4d — Ocean's Nightmare (9 ottobre 2026) → v0.57.0

**Fatto:**
- **Immagini** dalla cartella del desktop, girate con la prua a destra:
  - chiusa (eliche ferme prese da un'altra immagine), in movimento, aperta, aperta 1 (drone), aperta 2 (sfera);
  - la scritta "OCEAN'S NIGHTMARE" rigirata per leggersi andando verso est (verso ovest l'immagine si specchia, come tutte le navi);
  - `sottomarino_drone`, `sfera_nightmare` (nuovo tipo `sfera_` in `npm run art`).
- **Dati:** `data/fleet.ts` (`ready`, `dive` 500 m / 8 min, portelloni misurati), `data/submarine.ts` (`drone_nightmare`, `recon: true`), `data/nightmare.ts` (`RECON`, `SPHERE`, `COMPASS`).
- **Sistemi:**
  - `systems/ship/gadgets.ts`: ricognizione, sfera, bersaglio;
  - `systems/tracking.ts`: dov'è il bersaglio, animali a portata, bussola, bersaglio salvato;
  - `BeastState.held`: bestia bloccata in `encounters.ts`; i residenti addormentati restano fermi tramite `residentsNear(..., held)`.
- **Interfaccia e vista:** `ui/compass.ts`, `ui/reconPanel.ts`, `views/nightmareView.ts`; pulsanti "Ricognizione" e "Resoconto (N)" al timone.
- **Test:** `tests/nightmare.test.ts` (7).

**Da provare sull'iPhone:**
1. Con i +50.000 denti di prova compra l'Ocean's Nightmare e vai in mare aperto.
2. "Ricognizione", poi "Resoconto": scegli un animale.
3. Guarda la sfera che parte.
4. Tuffati e segui la bussola: l'animale deve essere fermo, con le scosse rosse.
5. Prova "Cala drone" per guidarlo a mano.

**Da regolare a gusto** (`data/nightmare.ts`): velocità del drone e della sfera, durata del blocco (60 s), ricarica (180 s).

**Prossimo:** blocco 5 (sonar a 360° e strumenti), in Plan mode. Rimane da studiare il cockpit dipinto.

## Molo di Porto Fango solo in superficie (9 ottobre 2026) → v0.56.2

**Fatto:** in `sailShip` (`systems/ship/ship.ts`) la frenata d'arrivo abbassa anche `helm.throttle` (`velocità / massima`). Frenata e limite ovest (`SHIP_WEST_X`) valgono solo se la nave non è `submerged`. A galla oltre il limite si può solo tornare a est. Due test in `tests/uboat.test.ts`.

**Da provare sull'iPhone:**
1. Entra a Porto Fango col gas al massimo: la leva deve scendere da sola fino a zero.
2. Con l'U-Boat immerso, passa sotto il molo verso ovest.

## Meteo a caso e salvato (9 ottobre 2026) → v0.56.1

**Fatto:** `createWeather` parte da `WEATHER.startWeights` con un seme diverso a ogni sessione; `SaveData.weather` (facoltativo, senza cambiare versione) con `saveWeather` e `checkedWeather` in `systems/weather.ts`.

**Da provare sull'iPhone:** apri e chiudi il gioco qualche volta, il tempo all'inizio cambia; con la pioggia in corso salva, chiudi e riapri: piove ancora.

## Musiche e bestie (9 ottobre 2026) → v0.56.0

**Fatto:**
- Musica del mare aperto (`audio/seaMusic.ts`): coro sintetizzato con filtri a formante, voce solista, bordone, tamburo ed eco a convoluzione. Entra oltre `SEA_MUSIC.fromKm` (1,25 km, appena oltre Porto Fango) ed esce sotto 1,15 km.
- Nuova musica di battaglia (`audio/battleMusic.ts`): ostinato a mezzo tono, ottoni, timpani, tremolo; un'introduzione che si avvicina e poi un giro di 8 battute.
- I numeri di tutte e due stanno in `data/music.ts` (nuovo), i suoni del mare restano in `data/audio.ts`.
- Le bestie (selvatiche e compagno) urtano solo lo scafo del sottomarino, non quello della nave (`pushOutOfVehicles(..., beast)`).

**Da provare sull'iPhone:**
1. Col suono acceso, allontanati da Porto Fango verso il mare aperto: la musica entra piano (circa 8 secondi).
2. Torna verso il porto: sfuma.
3. Entra in una battaglia: nuova musica; finita la battaglia, torna il mare.
4. Con l'U-Boat scendi e sali tra le bestie: non devono essere spinte né restare incastrate nelle rocce.

**Da regolare a orecchio:** il volume della musica del mare (`SEA_MUSIC.volume`) e di quella di battaglia (`BATTLE_MUSIC.volume`) in `data/music.ts`.

**Prossimo:** parte 4d (Ocean's Nightmare, con drone e sfera), in Plan mode.

## Cockpit a vapore (8 ottobre 2026) → v0.53.0

**Fatto:** `cockpitStyle: 'vapore'` in `data/fleet.ts` per EH1 ed EH2, stile in `ui/cockpitSteam.css` (solo CSS e SVG, niente immagini); immagine `nave_eh2_moto` con le eliche.

**Da provare sull'iPhone:** con l'EH1 o l'EH2 apri il Cockpit e passa tutte le schede; con l'EH2 dai gas e guarda le eliche.

**Sospeso (v0.54.1):** al proprietario il cockpit dipinto non basta ancora, "va studiato bene": nessuna nave lo usa (`cockpitStyle` tolto da EH1/EH2), il codice resta pronto. **Era (v0.54.0):** il cockpit usa le quattro schermate dipinte di Gemini (`public/bg/cockpit*_far.webp`), con i comandi messi sugli spazi dipinti (`data/cockpitSteam.ts`, `ui/steamStage.ts`, `ui/bridgeSteam.ts`). Il lotto 4 di pezzi separati non serve più per EH1/EH2.

**Prossimo:** il cockpit con le immagini del lotto 4; poi la parte 4c (U-Boat).

## Blocco 4c — Gli U-Boat (9 ottobre 2026) → v0.55.0

**Fatto:**
- Whale e Stormtrooper comprabili, con le immagini girate (`nave_whale`, `nave_stormtrooper`, `open` uguale a `closed`).
- Immersione in `systems/ship/uboat.ts` (`ship.dive`, `ship.air`, salvati) e `dive` in `data/fleet.ts`, regole in `SHIP.dive`.
- La geometria segue `dive`: timone, scafo solido, vista, faro di prua.
- Tuffo e rientro in profondità; passaggio sotto il ghiaccio, sfondato nella risalita d'emergenza.

**Da provare sull'iPhone:**
1. Compra il Whale (+50.000 denti di prova) e scendi con la leva "Sali / Scendi".
2. Lascia finire l'aria: arriva l'avviso, poi risale da solo.
3. Immerso, vai sotto il Mare di Ghiaccio.
4. Fermo in profondità, premi "Tuffati" e poi rientra con "A bordo".
5. Prova lo Stormtrooper vicino al fondale: è più lento e più grande.

**Rimandati come deciso:** il sonar a 360° (blocco 5) e gli urti delle bestie contro l'U-Boat (blocco 6).

**Prossimo:** parte 4d (Ocean's Nightmare, con drone e sfera), in Plan mode.

## ⚠️ Da togliere prima della fine: strumenti di prova sulla Home (v0.52.1)

Il proprietario ha chiesto di ricordarlo: `toggleTestMode` in `systems/testTools.ts` e i 5 tocchi sulla versione in `ui/pauseMenu.ts` accendono gli strumenti di prova anche senza il link `?prove`. Togliere entrambi (e la chiave `leviatano-prove` resta innocua) quando le prove non servono più.

**Da provare sull'iPhone:** pausa → scorri in fondo → tocca 5 volte "Versione 0.52.1" → chiudi e riapri la pausa → "+50.000 denti".

## Cantiere: più navi e statistiche (8 ottobre 2026) → v0.52.0

**Fatto:** flotta posseduta (`g.fleet`, salvataggio v20), cambio nave e vendita a metà prezzo (non l'Aurelia), categorie al cantiere, statistiche confrontabili con barre e differenze (`systems/ship/stats.ts`, `ui/shipStats.ts`).

**Da provare sull'iPhone:** al cantiere guarda la scheda "Possedute". Compra l'EH1 e apri la sua pagina prima di comprarla: si vede il confronto con l'Aurelia. Poi "Usa questa nave" sull'Aurelia e "Vendi" sull'EH1.

**Prossimo:** parte 4c (U-Boat), in Plan mode.

## Blocco 4b — Motoscafi e moto d'acqua (8 ottobre 2026) → v0.51.0

**Fatto:** EH2, Poseidon e Imperium comprabili, con le immagini (portelloni uno per volta e insieme, reattori del Poseidon, elica del sottomarino imperiale); un portellone per vano (`ship.hatches`); motoscafo e moto d'acqua (`systems/boat.ts`, `ship/boatBay.ts`, `data/boats.ts`) con fusti di carburante per la nave; salvataggio v19.

**Da provare sull'iPhone:**
1. Al cantiere compra l'EH2 (con lo strumento di prova "+5000 denti" più volte, o giocando). Apri i due portelloni uno alla volta.
2. Cala il motoscafo e corri al primo avamposto a est. Fermo al molo premi Porto → Carburante → "Carica i fusti".
3. Torna alla nave, fermati davanti al portellone aperto e premi Aggancia: il carburante della nave sale.
4. Prova anche Poseidon (reattori accesi col gas) e Imperium (moto d'acqua dalla poppa, sottomarino con l'elica che gira).

**Da sapere:** le scritte dipinte su EH2, Poseidon e i loro mezzi si leggono al contrario andando a est (immagini girate, come l'EH1). La moto d'acqua va da sola (il sub seduto arriverà con il suo sprite).

**Prossimo:** parte 4c (U-Boat Whale e Stormtrooper: si immergono), in Plan mode.

## Via l'onda di prua (8 ottobre 2026) → v0.50.4

**Fatto:** tolta l'onda di prua (al proprietario non piaceva: la schiuma deve essere il mare stesso, non puntini sopra). Da rifare più avanti, magari deformando la superficie del mare. Ghiaccio e schegge restano.

## Onda di prua e ghiaccio (8 ottobre 2026) → v0.50.3

**Fatto:** onda di prua che cresce con la velocità, schegge di ghiaccio entrando nella banchisa (senza onda nel ghiaccio), il ghiaccio si rompe dietro la prua (`SHIP.iceBehindBow`, `bowU` in `picture` di `data/fleet.ts`). Gli effetti stanno in `views/shipFx.ts`.

**Da provare sull'iPhone:** a tutto gas guarda l'onda davanti alla prua (più alta veloce, piccola piano); vai verso est fino al Mare di Ghiaccio: la lastra si rompe al passaggio della prua e volano le schegge.

**Per le altre navi:** quando arrivano le loro immagini di profilo, aggiungere in `data/fleet.ts` le ciminiere (`stacks`) e il punto della prua sull'acqua (`bowU`): fumo e onda arrivano da soli.

## Fumo a vapore e attracco (8 ottobre 2026) → v0.50.2

**Fatto:** fumo a nuvolette che restano nell'aria (view con stato, `SHIP.smoke`); attracco automatico a Porto Fango e alla fine del mare (`SHIP.approach`: la velocità segue la curva di frenata).

**Da provare sull'iPhone:** a tutto gas guarda la scia di fumo; torna a Porto Fango a tutta velocità: la nave rallenta da sola e si ferma al molo.

## Fumo dalle ciminiere (8 ottobre 2026) → v0.50.1

**Fatto:** fumo dalle ciminiere a motore acceso (dietro la nave, spinto indietro dal vento della corsa; posizioni in `stacks` di `data/fleet.ts`, numeri in `SHIP.smoke`); tolte le lucine dipinte a mano del sottomarino.

**Da provare sull'iPhone:** accendi il motore e guarda il fumo; dai gas e il fumo va indietro; spegni e si dissolve.

## Ritocchi alla flotta (8 ottobre 2026) → v0.50.0

**Fatto:** le richieste del proprietario dopo la prova dell'EH1 (dettagli nel CHANGELOG): grandezze di navi e sottomarini, sottomarino davanti al portellone, elica che gira e bolle solo quando spinge, suoni di accensione e spegnimento, cantiere con le cornici di rarità e la pagina della nave con la galleria.

**Da provare sull'iPhone (v0.50.0):**
1. Con l'EH1 apri il portellone: il sottomarino si vede nella stiva. Calalo: scende davanti alla nave.
2. Confronta le grandezze con l'Aurelia (puoi riprenderla al cantiere: la permuta ti dà la differenza).
3. Accendi il motore (suono), dai gas: l'elica gira e fa le bolle; togli il gas: la nave scivola, l'elica si ferma. Spegni: suono di spegnimento.
4. Cantiere: tocca una nave, scorri col dito tra le immagini.

**Prossimo:** parte 4b (secondo portellone e mezzi di superficie: Expedition Hunter 2, Poseidon, Imperium VI).

## Blocco 4a — La flotta, prima parte (8 ottobre 2026) → v0.49.0

**Fatto:** cantiere navale a Porto Fango (scheda Navi) con le 8 navi; le navi sono modelli con lunghezza vera, velocità, ripresa e frenata, serbatoio, sonar; Expedition Hunter 1 comprabile con il suo sottomarino squalo; carburante a 1 dente/L; via potenziamenti e sottomarini a parte (rimborsati, salvataggio v18); cockpit con le schede della nave; strumento di prova +5000 denti.

**Prossimo: parte 4b** — secondo portellone e mezzi di superficie (motoscafo, moto d'acqua): Expedition Hunter 2, Poseidon, Imperium VI. Serviranno le loro immagini di profilo (sono nelle cartelle del desktop: da riconoscere e copiare in `art-inbox/` come per l'EH1) e le posizioni sull'immagine (`picture` in `data/fleet.ts`). Poi 4c (U-Boat) e 4d (Ocean's Nightmare, con il sonar del blocco 5).

**Da provare sull'iPhone (v0.49.0):**
1. Prima di aggiornare, esporta il salvataggio. Dopo: se avevi comprato potenziamenti o sottomarini, ti sono tornati i denti; la nave è l'Aurelia col Batiscafo.
2. A Porto Fango, al timone accanto al molo, premi Porto → scheda **Navi**: le 8 card.
3. Con abbastanza denti (o con lo strumento di prova "+5000 denti"), compra l'Expedition Hunter 1: compare al molo, più lunga. Senti quanto è lenta a partire e a fermarsi.
4. Apri il portellone e cala lo Squalo d'acciaio: velocissimo, ma il serbatoio è piccolo.
5. Controlla il carburante dell'Aurelia: circa 30 km a tutto gas.

**Da sapere:** le scritte dipinte sullo scafo dell'EH1 ("EXPEDITION HUNTER") si leggono al contrario quando la nave va verso est (l'immagine è stata girata perché la prua guardasse a destra come le altre).

## Blocco 3 — Decisioni di design (8 ottobre 2026), solo documenti

**Fatto:** le risposte del proprietario alle 11 domande sono nel GDD, nella sezione "Decisioni di design (8 ottobre 2026)". Nel BACKLOG ogni blocco futuro ha la sua riga "Deciso l'8 ottobre". Corrette anche le parti superate del GDD (santuari, vecchio minigioco della domatura, ruoli). Nessuna modifica al gioco: la versione resta la 0.48.0.

**Prossimo: blocco 4, la flotta.** Prima si decidono con il proprietario le statistiche delle 7 navi, una alla volta: lunghezza, peso, velocità, serbatoio e consumi, sonar, portelloni e mezzi, vasca, abilità speciali, prezzo. Le immagini sono sul suo desktop, una cartella per nave. Poi il codice: concessionario a Porto Fango, potenziamenti attuali tolti, carburante da pianificare.

## Blocco 2 — Correzioni rapide (8 ottobre 2026) → v0.48.0

**Fatto:** tutte le correzioni del blocco 2 di `docs/BACKLOG.md` (dettagli nel CHANGELOG), ognuna con un test in `tests/block2.test.ts`. Prossimo: **blocco 3, decisioni di design** (le 11 domande nel BACKLOG: si discutono col proprietario e si scrivono nel GDD, niente codice).

**Da provare sull'iPhone (v0.48.0):**
1. Al timone: **Spegni motore / Accendi motore**. Spento il motore non si sente; acceso si sente il minimo. Tuffati e allontanati: il rumore cala fino a sparire. In pausa e in battaglia: silenzio.
2. Nel cockpit: "Spegni motore" accanto ad "Avanti adagio".
3. Nella Banchisa la nave va a tutta velocità rompendo il ghiaccio.
4. Nel sottomarino: alza il dito dalle leve, si fermano da sole. Sbatti contro una roccia, poi dai gas: riparte.
5. Riaggancia il sottomarino e risali al timone: niente giri strani. Con lo scafo danneggiato, rientrando viene riparato (paghi in denti).
6. In groppa a un capodoglio: scendi, poi risali in superficie, l'aria si ricarica.
7. A un avamposto: il pulsante Porto c'è da entrambi i lati della chiatta.
8. In battaglia, con "Info" (dettaglio della mossa): c'è il **Danno**.
9. Bestiario: Megalodonte e Livyatan tra le Leggende.
10. Sardine: la sacca si riempie a 30 ("Sacca piena"), al porto rendono la metà.

**Da sapere:** nel mare aperto non ci sono iceberg (tolti il 5 ottobre). Il rallentamento vicino agli iceberg c'è già nel codice e funzionerà se li rimettiamo.

## Blocco 2 — Correzioni rapide (8 ottobre 2026) → v0.48.0

**Fatto:** tutte le correzioni del blocco 2 di `docs/BACKLOG.md` (dettagli nel CHANGELOG), ognuna con un test in `tests/block2.test.ts`. Prossimo: **blocco 3, decisioni di design** (le 11 domande nel BACKLOG: si discutono col proprietario e si scrivono nel GDD, niente codice).

**Da provare sull'iPhone (v0.48.0):**
1. Al timone: **Spegni motore / Accendi motore**. Spento il motore non si sente; acceso si sente il minimo. Tuffati e allontanati: il rumore cala fino a sparire. In pausa e in battaglia: silenzio.
2. Nel cockpit: "Spegni motore" accanto ad "Avanti adagio".
3. Nella Banchisa la nave va a tutta velocità rompendo il ghiaccio.
4. Nel sottomarino: alza il dito dalle leve, si fermano da sole. Sbatti contro una roccia, poi dai gas: riparte.
5. Riaggancia il sottomarino e risali al timone: niente giri strani. Con lo scafo danneggiato, rientrando viene riparato (paghi in denti).
6. In groppa a un capodoglio: scendi, poi risali in superficie, l'aria si ricarica.
7. A un avamposto: il pulsante Porto c'è da entrambi i lati della chiatta.
8. In battaglia, con "Info" (dettaglio della mossa): c'è il **Danno**.
9. Bestiario: Megalodonte e Livyatan tra le Leggende.
10. Sardine: la sacca si riempie a 30 ("Sacca piena"), al porto rendono la metà.

**Da sapere:** nel mare aperto non ci sono iceberg (tolti il 5 ottobre). Il rallentamento vicino agli iceberg c'è già nel codice e funzionerà se li rimettiamo.

## Blocco 1 — Nuovo inizio senza storia (8 ottobre 2026) → v0.47.0

**Contesto:** il proprietario ha giocato più di 6 ore e ha raccolto molti feedback, ora in `docs/BACKLOG.md` divisi in 10 blocchi, nell'ordine concordato. **Ogni blocco si pianifica in Plan mode prima di scrivere codice.** Prossimo: **blocco 2, correzioni rapide** (elenco nel BACKLOG).

**Fatto:**
- tolti i capitoli 1–4 (la storia è in pausa fino al blocco 10);
- nuovo inizio: barca di Aurelio, starter, tutorial (nuota, 5 sardine, scatto, doma, molo), appuntamento a Porto Fango, dove arrivano nave e sottomarino nella stiva;
- costa senza superpredatori;
- Sfregiato, Re Corallo e Piovra segnati `storyOnly` e fuori dal gioco;
- tessera senza medaglie;
- salvataggio v17;
- limite dei test a 20 s.

**Da provare sull'iPhone (v0.47.0):**
1. **Prima di aggiornare, esporta il salvataggio** (Pausa → Esporta).
2. Dopo l'aggiornamento: la tua partita si carica, Piovra e Re Corallo non sono più in squadra (al loro posto quelle della riserva), nave e sottomarino sono dove li avevi lasciati.
3. Bestiario e Tessera: niente Piovra, Re Corallo, Sfregiato né medaglie.
4. Partita nuova (in Safari privato, oppure Pausa → Nuova partita dopo aver esportato: cancella quella in corso): barca di Aurelio, scelta del compagno, i cinque compiti del tutorial, il dialogo al molo, poi a nuoto fino a Porto Fango (sotto l'isola). Lì Aurelio ti dà la nave: sali a bordo e cala il sottomarino.
5. Nella Baia e nel Delta non devono comparire squali bianchi né coccodrilli marini.

**Da sapere:** il Calamaro colossale ora è una bestia normale, ma non ha immagini: non compare finché non le generi (blocco 8). Nel bestiario resta "???".

## Sessione cloud 1 — Stacco netto della telecamera (5 ottobre 2026) → v0.46.0

**Fatto:** vista del timone o tua, mai mescolate: il cambio è uno stacco con dissolvenza (`CAMERA.cutFadeMs`, `CameraRig.fadeCut`); misurato fotogramma per fotogramma: un solo salto, poi fermo. Barra dello zaino sotto la pausa.

**Da provare sull'iPhone (v0.46.0):** tuffati, risali, cala e aggancia il sottomarino: la scena cambia con un breve buio, senza scorrere. In acqua con oggetti nello zaino: la barra è sotto il pulsante di pausa.

## Sessione cloud 1 — Telecamera definitiva e schermo ordinato (5 ottobre 2026) → v0.45.0

**Fatto:** telecamera a distanza dalla nave (`systems/shipCamera.ts`, numeri in `SHIP.camera.near/fade`); timone a fasce fisse (`--side` in `ui.css`); sonar con la sua riga; Cockpit accanto alla pausa; nome della zona e messaggi che vanno a capo.

**Da provare sull'iPhone (v0.45.0):**
1. Sali, scendi, tuffati, cala e aggancia il sottomarino: la nave resta ferma sullo schermo.
2. Nuota lontano dalla nave: l'inquadratura torna piano quella del nuoto.
3. Al timone: niente si sovrappone; tocca la riga del sonar per accenderlo o spegnerlo; Cockpit è in alto a destra.

**Strumento per le prossime sessioni:** uno script Playwright (in questa sessione era in `/tmp`, da rifare se serve) che apre tutte le schermate su 667×375, 844×390 e 932×430 e segnala sovrapposizioni, scritte tagliate e pezzi fuori schermo.

## Sessione cloud 1 — Mare abitato (5 ottobre 2026) → v0.44.0

**Fatto:** popolazione fissa del mare aperto (`systems/beasts/residents.ts`, numeri in `ENDLESS.residents`), il sonar sente tutti gli animali, niente tuffo o uscita in movimento, passaggio graduale della telecamera.

**Da provare sull'iPhone (v0.44.0):**
1. In mare aperto, nave ferma o "Avanti adagio", sonar acceso: Cockpit → Sonar mostra molti puntini; al timone la riga dice quanti animali ci sono.
2. Cala il sottomarino vicino a dei puntini: le bestie compaiono dove il sonar le mostrava.
3. Prova a tuffarti con la nave in moto: compare "Ferma la nave prima di tuffarti".
4. Sali e scendi, cala e aggancia: il passaggio della telecamera è morbido.

**Da regolare se serve:** quanti abitanti (`perStretch`), a che distanza escono (`wakeRadius`), quanto tornano (`returnSeconds`) in `data/endless.ts`.

## Sessione cloud 1 — Cockpit dal vivo e correzioni (5 ottobre 2026) → v0.43.0

**Fatto:** cockpit senza pausa (sonar per primo, "Avanti adagio"/"Ferma i motori", velocità dal vivo; si chiude da solo se lasci il timone o inizia una lotta); aggancio con avvicinamento morbido; stacco della telecamera salendo o scendendo; luce soffusa sotto lo scafo al posto di finestre e faro; HUD a sinistra con soli cuori, ossigeno e denti; squadra centrata; nome della zona senza sovrapposizioni; velocità del cockpit arrotondata.

**Da provare sull'iPhone (v0.43.0):**
1. Al timone apri il Cockpit: si apre sul Sonar. Tocca "Avanti adagio": la nave va a 8 nodi e il sonar continua a sentire. "Ferma i motori" la ferma.
2. Cala il sottomarino, allontanati un po', torna sotto il portellone e premi Aggancia: deve scivolare fino alla rampa.
3. Sali e scendi dalla nave: l'inquadratura cambia di colpo, la nave non scorre.
4. Di notte o in profondità: la luce soffusa sotto lo scafo.

## Sessione cloud 1 — Correzioni e rifiniture della nave (5 ottobre 2026) → v0.42.0

**Fatto (lista del proprietario del 5 ottobre, tutti i punti):**
- nave che "saltava" (telecamera), riga in basso a sinistra (classe CSS in conflitto), Aggancia vicino al portellone, leve usabili insieme;
- Delta prima dell'isola, porto commerciale di Porto Fango, nave solo a est di Porto Fango e senza ostacoli (niente iceberg, niente corsia lontana);
- avamposti come chiatte (immagini del proprietario), rimorchiatore del razzo di soccorso;
- luci della nave, bolle dell'elica, suoni dei motori e del sonar;
- sonar accendibile, solo sotto 10 nodi, con schermo nel cockpit;
- cockpit ridisegnato (obiettivo, carta ±2 km, quadranti, meteo);
- diario a schede con "Segui" (salvato in `huntPinned`).

**Da provare sull'iPhone (v0.42.0):**
1. Sali e scendi dalla nave: la nave resta ferma.
2. Nel sottomarino tieni il gas e intanto Sali/Scendi con l'altra mano.
3. Cala il sottomarino e riagganciati appena sotto il portellone.
4. Al timone: pulsante **Sonar**, poi Cockpit → **Sonar** (sotto 10 nodi vedi il fondale e i puntini).
5. Cockpit → **Diario**: tocca una caccia, poi **Segui**; guarda la Plancia e la riga in alto a sinistra al timone.
6. Vai a Porto Fango: il nuovo porto; poi verso est fino al primo avamposto (chiatta).
7. Ascolta i motori con il gas; in superficie non devono esserci le bolle del nuoto.

**Da sistemare a occhio se serve:** posizione delle finestre illuminate (`SHIP.lights` in `data/ship.ts`) e altezza dei pezzi del porto (`HARBOUR_PIECES`, `OUTPOST_ART` in `data/economy.ts`).

## Sessione cloud 1 (fine) — Tappe 3–6 delle spedizioni (4 ottobre 2026) → v0.41.0

**Fatto:**
- oceano di 30 km in 5 regioni, con avamposti e la scogliera della fine;
- mappa con una scheda per regione;
- livelli dal pericolo di ogni specie e habitat veri;
- avviso di pericolo; profondità, mari e pericolo nella scheda di ogni bestia;
- cacce alle leggende (8 tane: voce, sonar, tracce, tempo giusto) e Diario di caccia;
- sonar al timone;
- relitti delle regioni, missioni di spedizione, pezzi per la nave;
- salvataggio v16.

**Da provare sull'iPhone (v0.41.0), la spedizione completa:**
1. Al porto apri la Bacheca: le voci (Avvistamenti) e le missioni "Spedizione".
2. Fai il pieno e naviga verso est: all'Avamposto del Corallo (4,2 km) compare il messaggio e il porto.
3. Cerca lo squalo martello preistorico (Barriera esterna, cielo sereno). Al timone guarda la riga del sonar: quando il tempo è giusto compare l'eco anomala. Ferma la nave, cala il sottomarino, scendi verso l'eco: tracce, poi la leggenda (livello 60–75: serve una squadra forte!).
4. Lungo la costa uno squalo bianco ha almeno livello 35 e compare l'avviso di pericolo.
5. Mappa (Pausa): una scheda per regione.

**Per provare in fretta:** il pannello di prova ha "Cambia il meteo" per arrivare al tempo giusto di una caccia.

**Non fatto (proposta per dopo):** un tempio per regione, pesci rari da vendere, capitolo 5.

## Sessione cloud 1 (fine) — Tappa 2 delle spedizioni: carburante e cockpit (4 ottobre 2026) → v0.40.0

**Fatto:**
- carburante di nave e sottomarino, mostrato negli strumenti con l'autonomia;
- rifornimento al porto (scheda Mute, in cima);
- cockpit con Plancia (travaso, razzo di soccorso), Recinto e Zaino;
- razzo di soccorso;
- santuari tolti; cure solo sulla nave e al porto; il sottomarino non cura più;
- salvataggio v15.

**Da provare sull'iPhone (v0.40.0):**
1. Al timone, gli strumenti in basso mostrano litri e km. Muovi il gas: i km cambiano (piano = più km).
2. Tocca **Cockpit**: Plancia con i due serbatoi; prova il travaso col sottomarino nella stiva.
3. In porto, scheda **Mute**: "Riempi" la nave e il sottomarino.
4. Nel sottomarino la squadra non guarisce più; salendo sulla nave sì.
5. Resta a secco (o usa il razzo dal cockpit): il rimorchiatore ti porta al porto più vicino.

**Da regolare giocando:** serbatoi e consumi (`SHIP.fuel`, `tank` e `perKm` in `SUB_MODELS`), prezzo (`FUEL.pricePerLitre`), costo del razzo (`RESCUE`).

**Prossima tappa (3):** l'oceano di 30 km in regioni, gli avamposti, la mappa con una scheda per regione.

## Sessione cloud 1 (fine) — Progetto delle spedizioni e tappa 1: la nave (4 ottobre 2026) → v0.39.0

**Progetto deciso col proprietario:** è scritto nel GDD, sezione "Spedizioni", con le 6 tappe nella Roadmap (punto 11).

**Fatto (tappa 1, v0.39.0):**
- nave da spedizione regalata a fine capitolo 4;
- guida con le leve (gas che resta, direzione), per nave e sottomarino;
- portellone, rampa, Cala sottomarino, Aggancia, Tuffati, A bordo;
- ghiaccio rotto che si richiude lontano;
- corsia lontana dietro isole e iceberg (la nave non si blocca mai: c'è un test fino a 30 km);
- fondale basso solo alla spiaggia;
- Porto dal timone; risveglio sulla nave; sottomarino rotto rimorchiato nella stiva;
- salvataggio v14.

Immagini: `art-inbox/nave_1.jpg` e `nave_1_aperta.jpg`.

**Da provare sull'iPhone (v0.39.0):**
1. Con un salvataggio dopo il capitolo 4: messaggio di Aurelio, nave vicina (Foresta Sommersa o porto). In superficie accanto allo scafo premi **A bordo**.
2. Leva del gas a sinistra: la nave parte piano e a tutta alza la prua. Lascia il gas a metà: resta lì. Prova ◀ ▶: rallenta e si gira.
3. Verso est: all'Isola delle Mangrovie la nave passa dietro (più piccola e scura) e poi torna davanti. Nella Banchisa rompe il ghiaccio e rallenta.
4. Ferma, **Apri portellone**, poi **Cala sottomarino**: scende lungo la rampa. Guida con le leve (Sali/Scendi a destra). Torna sotto il portellone: **Aggancia**.
5. Al porto (Portofosco o Porto Fango), da ferma: compare **Porto**.
6. **Tuffati** e poi **A bordo** dall'acqua.
7. Controlla che le leve non coprano altro sullo schermo dell'iPhone (in orizzontale).

**Prossime tappe:**
- tappa 2: carburante, cockpit, cure solo sulla nave, via i santuari, razzo di soccorso;
- poi le regioni dei 30 km, i livelli per pericolo, il sonar e il Diario di caccia.

**Da regolare guardando sul telefono:** linea d'acqua e portellone (`SHIP.picture`), velocità (`SHIP.maxSpeed`), quanto si allarga la vista (`SHIP.camera`).

## Sessione cloud 1 (seguito) — Feedback dopo la prova del 4 ottobre

Il proprietario ha provato il gioco e mandato 13 punti. Piano approvato, in 4 gruppi con una versione ciascuno:

1. **v0.32.0 — errori chiari (fatto):** Piovra invisibile (immagini dei Guardiani non caricate), "Sali" coperto da "Porto" col sottomarino al molo, luce del sottomarino fissa, lista del porto che torna in cima comprando, vignettatura fissa nello zoom d'ingresso della battaglia, pesca dal sottomarino tolta.
2. **v0.33.0 — sottomarino (fatto):** niente muro invisibile negli urti (scossa, fumo/bolle, danno, piccolo rimbalzo); barra della vita sopra il sottomarino quando prende danno, che poi sparisce.
3. **v0.34.0 — bestie grandi (fatto; la virata va guardata sull'iPhone):** virata con spessore ("il prosciutto tra due fette di pane": tra i due profili uno spessore dello stesso colore, scurito); la megattera mangia tutte le sardine che le entrano in bocca; collisioni lungo tutta la spina dorsale.
4. **v0.35.0 (fatto) e v0.36.0 — equilibrio (scelte del proprietario):** pressione, aria dei cetacei e scatto in v0.35.0; comparse in v0.36.0 (fatto). barra della **pressione** (sotto la profondità della muta o del sottomarino si svuota; a zero toglie vita finché non risali); lo **scatto consuma aria**; in groppa a un cetaceo la barra dell'aria è **la sua** (più grande e più lenta, ma deve risalire); comparse più varie (comuni e di basso livello molto più frequenti, delfini quasi ovunque, la stessa specie non subito di seguito).

**Da provare sull'iPhone (v0.32–v0.36):**

1. Piovra in squadra: chiamala e cavalcala, deve vedersi.
2. Sottomarino ormeggiato al molo: accanto compare "Sali". La luce si gira con lui.
3. Porto: compra un oggetto in fondo alla lista, la lista resta lì.
4. Battaglia con una bestia grande o rara: lo zoom d'ingresso senza riquadro scuro fisso.
5. Sbatti col sottomarino contro la roccia: scossa, fumo, barra dello scafo sopra di lui.
6. Fai girare uno squalo o una megattera: la virata deve avere spessore, non sembrare un foglio. **Questa non sono riuscito a guardarla bene nel cloud: dimmi com'è.**
7. Megattera in un banco di sardine: le mangia a bocconi interi.
8. Bestie grandi contro scogli e fondale: non devono entrarci.
9. Scendi oltre la muta: barra arancione della pressione, poi perdi cuori. In groppa a una megattera: barra dell'aria azzurra con la balena, che finisce.
10. Scatto: ogni scatto costa un po' d'aria.
11. Gira per la Baia: più varietà di bestie, più delfini.

**v0.37.0 (seconda prova, 4 ottobre):** virata a moneta spessa, coda verticale dei cetacei, aria in superficie in groppa, Piovra cavalcatura, compagni che seguono come animali veri, leggende 50–100, bestiario (vista solo da vicino, per rarità), immagine dello squalo volpe, urti del sottomarino lievi. Lo scatto del sub che "non funziona più" non si riproduce: chiedere al proprietario quando succede. Serve una vista di schiena dello squalo volpe (Gemini).

**Da sapere:** l'etichetta git `v0.31.0`…`v0.36.0` non si può creare dal cloud (permesso solo sul ramo della sessione): crearle dalla sessione del computer. Pesca dal sottomarino tolta: da ripensare.

## Sessione cloud 1 — Meteo dinamico e gabbiani (4 ottobre 2026) → v0.31.0

Prima sessione nel cloud (dal telefono del proprietario). Nel cloud non si vede il computer: le immagini che stanno solo in `asset animali ai/` (per esempio il varano albino) vanno allegate in chat o caricate in `art-inbox/`.

**Fatto**

- Meteo che cambia da solo, **solo aspetto** (scelta del proprietario): `data/weather.ts`, `systems/weather.ts`, `views/weatherView.ts`. Sereno, nuvoloso, pioggia, tempesta, nebbia; neve e bufera nel Mare di Ghiaccio e nella Banchisa; nuvole, pioggia con schizzi, onde più alte, lampi, nebbia; sott'acqua raggi più deboli e un po' più buio fino a 60 m.
- Stormi di gabbiani: `systems/birds.ts`, `views/birdsView.ts`; si tuffano sulle sardine vicine alla superficie, se ne vanno in tempesta.
- **v0.31.1** (dopo la prova del proprietario: "troppo spessi, compaiono e spariscono"): gabbiani dipinti su canvas in 9 pose del battito; ogni stormo vive sopra un banco di pesci come sardine e sgombri; arrivano e se ne vanno solo fuori dallo schermo (test che lo controlla); 2 stormi da 3–6.
- **v0.31.2** ("e sono pure troppi"): 1 stormo da 2–4, che arriva ogni tanto, resta 40–90 s e se ne va.
- Nessun cambio a salvataggi, battaglie o bestie. Pannello `?prove`: "Cambia il meteo".
- 14 test (`tests/weather.test.ts`). Visto nel browser: sereno, nuvoloso, pioggia, tempesta col lampo, nebbia, neve, gabbiani.

**Da provare sull'iPhone**

1. Risali in superficie e guarda il cielo per qualche minuto: il tempo cambia da solo (per provarlo subito: apri in Safari il link del gioco con `?prove` in fondo, poi Pausa → "Cambia il meteo").
2. Con pioggia o tempesta: gocce, schizzi sull'acqua, onde più alte, lampi. Scendi: sotto i 60 m non deve cambiare niente.
3. Vai nel Mare di Ghiaccio con la pioggia: deve nevicare.
4. Cerca i gabbiani sopra un banco di sardine vicino alla superficie: ogni tanto uno si tuffa. Nuota avanti e indietro: non devono mai comparire o sparire davanti a te.
5. Il gioco resta fluido quando piove?

**Da sapere / possibili problemi**

- I gabbiani sono dipinti dal codice: se vuoi, un'immagine fatta in Gemini (ali aperte, fondo verde) li renderebbe ancora più realistici.
- L'etichetta git `v0.31.0` / `v0.31.1` non si può creare dal cloud (permesso solo sul ramo della sessione): aggiungerla dalla sessione del computer (`git tag v0.31.1 <commit> && git push origin v0.31.1`).
- Il meteo riparte dal sereno a ogni apertura del gioco (non si salva).
- `WorldScene.ts` è a circa 330 righe: alla prossima pulizia si può spostare il collegamento di meteo e uccelli in un file a parte.

## Stato al 4 ottobre 2026 (v0.30.0) — leggere per primo

Il proprietario lavora qualche giorno con una sessione nel cloud e poi torna su quella del computer: regole per due sessioni in `docs/COME-LAVORIAMO.md`. Chi chiude una sessione aggiunge qui sopra una sezione "Sessione …" con fatto / mancante / cosa provare.

**Fatto di recente (3 ottobre, v0.21–v0.30):** battaglie come Pokémon in tutto: statistiche e danno (v0.21), PP, precisione, stati e statistiche ±6 (v0.22), esperienza e cattura (v0.23), mosse di Pokémon con i nostri nomi imparate per livello e via la schivata (v0.24), inquadratura come gen 5 (v0.25), schermate delle mosse (v0.26), livello massimo 100 (v0.27), scheda in 3 pagine ed evoluzione annullabile (v0.28), squadra e zaino con gli oggetti di Pokémon e stati che restano (v0.29), bestiario con filtri e tessera del cacciatore (v0.30).

**Da fare (in ordine; proporre il piano prima):**
1. Rifare in Gemini `squalo_martello_back` (troppo dritto) e l'alone scuro della schiena della megattera. Nel cloud: il proprietario genera le immagini e le allega.
2. Test delle evoluzioni vere (regole in COME-LAVORIAMO, "Lo stile"): una alla volta, senza immagine allegata. Primo: il varano in 3 stadi (l'ultimo uno spinosauro marino con la testa da varano).
3. Varano albino: mancano card e vista di schiena, poi si mette nel gioco.
4. Ripensare i 3 pulsanti delle mosse quando cavalchi (oggi usano le vecchie mosse del mare).
5. Altre cose di Pokémon proposte e non ancora scelte dal proprietario: nature, abilità, strumenti da tenere, meteo e correnti, cacciatori rivali, evoluzioni con oggetti.
6. Un'altra balena con evoluzione; le evoluzioni a 2 stadi; bestie evolute nelle zone di livello alto.
7. Capitolo 5, il Mare di Ghiaccio (la Vedova e la reliquia dei templi; anguilla elettrica, polpo gigante, lontra marina). Ora che il livello massimo è 100, le zone nuove possono andare oltre il livello 50.

## Sessione 12 — Correzioni dopo la prova e tappa 11: l'oceano infinito (2 ottobre 2026) → v0.9.7 … v0.10.0

**Fatto**

- v0.9.7–v0.9.10: correzioni dopo la prova del proprietario (vedi CHANGELOG): Sfondamento, livelli minimi, morso per taglia, squadra ordinabile, conchiglie limitate, esche, mappa, predatori fuori zona, branchi, scatto tenuto premuto, nuoto verticale e virata ad anello, il compagno che sente il buio.
- **Tappa 11 (v0.10.0):** `TileMap` con pezzi infiniti a est (`endless` + `chunks`, numerazione dei tile rotti compatibile: `tileIndex`/`tileOf`); `WORLD.rows` 560 (fosse), `handMadeBottom` per la costa; generatore `systems/world/endless.ts` (tratti da 1800 unità di 5 tipi in `data/endless.ts`, fondale che si raccorda e scende con la distanza, collinette, ghiaccio, fosse, sfiatatoi); nomi delle zone, coralli, alghe a pezzi (`kelpView`), ghiaccio dipinto solo nella Banchisa; 5 posti per bestie del mare aperto (`WILD_SPAWNS` con `endless`, `endlessLife.prepareEndlessSpawn`: specie della zona, livello base + 2 per km); 6 banchi di sardine che seguono il sub; sfiatatoi (`ventsOf`, `stepVents`, `views/ventView`); mute "traversata" e "bombole"; km dalla costa nell'HUD; zone del mare aperto nella mappa. 286 test.
- Visto nel browser: Fossa abissale e Mare aperto a 2 km, sardine che seguono e vengono mangiate, sfiatatoio che ricarica l'aria.
- Testi per Gemini delle 21 bestie senza immagini: `docs/PROMPT-BESTIE.md` (in ordine di priorità).
- **v0.10.1:** pareti e iceberg del proprietario (`asset animali ai/mondo/`): `npm run art` tipo "mondo" (public/world, maschera e linea dell'acqua degli iceberg in `ICEBERG_SHAPES`, striscia della linea tolta); `data/worldArt.ts`; `systems/world/icebergs.ts` (ghiaccio solido dal disegno, nel Mare di Ghiaccio e nei tratti di Banchisa); `views/worldArtView.ts` (pareti sui bordi dritti dei pozzi e delle fosse, iceberg). 288 test.

- **v0.10.2:** 13 bestie dalle immagini del proprietario (`asset animali ai/<bestia>/`): 9 nuove nei dati (`tonno`, `delfino`, `pesce_luna`, `scorfano`, `pesce_napoleone`, `pesce_spada`, `squalo_volpe`, `tricheco`, `elefante_marino`, con 27 mosse) e le immagini di `foca_leopardo`, `beluga`, `narvalo`, `coccodrillo_nilo`; comparse nella Baia, nel Delta, nel Mare di Ghiaccio e nelle zone del mare aperto. `npm run art`: profili con scontorno dal bordo e "solo l'animale" (`SIDE_FLOOD_SPECIES`, `keepLargest`), riprova automatica su fondo grigio con trama, `SIDE_ERASE`. 314 test.

- **v0.10.3:** `varano_nilo` (Varano del Nilo nero, Delta), 3 mosse, comparsa nel Delta. 316 test.

**Mancante / da sapere**

- Lontano dalla costa (oltre ~15 km) il fondale supera i 300 m: servono mute più profonde; gli sfiatatoi stanno nel punto meno profondo di ogni tratto.
- Se muori lontano rinasci all'ultimo santuario o porto: la traversata di ritorno è lunga. La barca (tappa 12) risolverà.
- Le bestie senza immagine di profilo non compaiono (foche, beluga, narvali, calamari…): arrivano con le immagini.

**Da provare sull'iPhone**

1. Compra la Muta da traversata, attraversa il Mare di Ghiaccio e continua a est: guarda i km dalla costa e i nomi delle zone.
2. Trova uno sfiatatoio (colonna di bolle) e respira.
3. Scendi in una Fossa abissale (attento all'aria e alla profondità della muta).
4. Apri la mappa: le zone del mare aperto visitate.
5. Il gioco resta fluido mentre nuoti lontano?

**Tappa 12 (v0.11.0), la barca:** `data/boat.ts`, `systems/boat.ts` (regalo a fine capitolo 1, Sali/Tuffati, navigazione in superficie, cure a bordo, risveglio a bordo dopo un KO o la morte, pesca con attesa e tocco al momento giusto, pesci per zona), `views/boatView.ts` (barca disegnata, lenza e galleggiante), `BeastState.aboard` (nessuna bestia ti raggiunge, nessuna si chiama), salvataggio v9 (`boat: {x} | null`), HUD con distanza della barca, mappa. Scelte del proprietario: si ottiene da Aurelio, si rinasce sulla barca, niente viaggio istantaneo. 324 test. Testo Gemini per una barca dipinta in `docs/PROMPT-MONDO.md`.

**Da provare (v0.11.0):** finisci il capitolo 1 (o usa una partita che l'ha già finito): trova la barca oltre il molo, Sali, naviga verso est, Pesca, Tuffati e controlla la freccia della barca nell'HUD; prova a perdere i sensi lontano.

**Tappa 13 (v0.12.0), le leggende:** `UNIQUE_VARIANTS` con `chance`, `where` (tipo di tratto, km minimi), `place`, `temper`, `surface`; `systems/beasts/legends.ts` (`LEGENDS`, `rollLegend`, `inLegendPlace`); `rollWildForm` con il punto e le leggende non disponibili (domate, sconfitte, già in acqua); sconfitta = sparisce per sempre (`BeastState.gone`, salvataggio v10 `legendsGone`); pagina Leggende nel bestiario; orca alfa = Orca matriarca (`alfaName`, `alfaArt`). Immagini del proprietario: squalo martello preistorico e tartaruga preistorica (`asset animali ai/`). 334 test.

**Da sapere:** le leggende hanno per ora lo sfondo di battaglia della loro regione; il proprietario vorrebbe per loro un piccolo ecosistema o uno sfondo proprio, e alcune in tane negli abissi (da progettare). In arrivo come leggende delle fosse: Megalodonte, Livyatan, Dunkleosteus, Kraken (servono le immagini).

**v0.12.1:** scelta del compagno (card alte uguali, pulsante in fondo, immagine inquadrata in alto), bestiario (non viste tutte uguali), nave dell'apertura (`stepShip`: va avanti durante dialogo e scelta, poi si allontana veloce e sparisce lontano dal sub). 335 test.

**Tappa 14 (v0.13.0), il primo tempio sommerso:**

- `data/temples.ts`: pianta a caratteri di 96×20 celle da 16 unità, ordine delle rune, finestra delle due leve, reliquie (`RELICS`) e testi.
- `systems/world/stretches.ts`: tipi dei tratti e fondale naturale, staccati da `endless.ts` per evitare un giro di import.
- `systems/world/templeSite.ts`:
  - dove sta: il centro del primo tratto "aperto" oltre 3 km, con `rise` di 9 celle sopra il fondale;
  - il fondale intorno si piega per incontrarlo;
  - i tile della pianta e gli sfiatatoi interni.
- Nuovi tile `TILE.temple` e `TILE.gate`: il pittore disegna blocchi sfalsati e porte a lastre.
- `systems/temple.ts`: leva, due leve, rune, mosaico, catene e reliquia. Le porte aperte si salvano tra i tile rotti con l'evento `gateOpened`.
- `views/templeView.ts`: disegna leve, rune, mosaico, catene e reliquia.
- Reliquie in `gear.relics` (campo nuovo: i vecchi salvataggi partono vuoti); riducono il consumo d'aria.
- Scelte del proprietario: "vedi tu" per i rompicapo; premio reliquia o leggenda.
- 343 test. Visto nel browser: tetto e catene dall'esterno, nome della zona all'ingresso, leva, pareti scolpite.

**Da provare (v0.13.0):**

1. Con la barca vai a est fino a circa 3,7 km nel Mare aperto (guarda l'HUD).
2. Cerca un edificio di blocchi sul fondale ed entra dall'apertura nel tetto.
3. Colpisci la leva, poi le due leve una dopo l'altra.
4. Guarda il mosaico e tocca le rune in ordine.
5. Segui il corridoio fino alla conchiglia d'oro.
6. Esci e controlla che l'aria cali più lentamente.
7. Chiudi e riapri il gioco: le porte devono restare aperte.

**Da sapere:**

- Il tempio è disegnato con forme semplici (blocchi, leve, rune). I testi per Gemini dei pezzi dipinti sono in `docs/PROMPT-MONDO.md` (sezione 5).
- La sala più bassa è a circa 145 m: basta la muta leggera, ma serve aria per arrivarci (barca o muta da traversata).

**Tappa 15 (v0.14.0), capitolo 3: la Barriera Rossa:**

- `data/chapter3.ts`: l'anfiteatro `ARENA` (conca a 4 gradoni a east(3000)), il re `CORAL_KING` (livello 20, scelto dal proprietario), le catene, i testi e i segni salvati (`CHAPTER3_MARKS`).
- `systems/world/arena.ts`: la forma della conca, scavata in `isOpen` come la tana.
- `systems/chapter3.ts`:
  - la Vedova parla vicino alla nave;
  - il re è una bestia selvatica a parte (id 901, `storyBoss`): si alza quando scendi nella conca, cammina di lato sul fondo, e se ti tocca parte la battaglia;
  - dopo la battaglia (`beaten`, scritto da `battleResult`): sfinito, oppure domato (le catene cedono da sole);
  - le catene si spezzano con le armi (`hitChain`) solo quando è sfinito;
  - premio da Guardiano una volta sola; si unisce alla squadra; la nave salpa.
- Lo stato si salva nella lista "seen" della storia (sfinito, premio, catene rotte). Passi nuovi: `freeKing`, `chapter3Done`.
- `views/beastView.ts`: le bestie senza profilo ma con immagine frontale di battaglia (il Re Corallo) si disegnano intere, di fronte, con un'oscillazione da granchio che cammina di lato.
- `views/chapter3View.ts`: coralli dei gradoni, argani, catene, il re incatenato o sfinito. La nave della Vedova (in `storyView`) è ancorata sopra la conca.
- Battaglia: lo sfondo "tana" solo per i Guardiani veri (`w.guardian`); i boss sfiniti non "fuggono".
- Card del Re Corallo (`public/art/re_corallo.webp`) dalla sua immagine in `asset animali ai/re corallo/`.
- 348 test.
- Visto nel browser: dialogo della Vedova, catene dalla nave e dagli argani, conca a gradoni con coralli, il re che si alza e viene verso il sub, battaglia (Re Corallo Lv. 20), il re sfinito con una catena rotta e l'obiettivo 1/3.

**Da provare (v0.14.0):**

1. Con una partita al capitolo 2 finito, vai alla Barriera Rossa (circa 1 km dalla costa) e nuota sotto la nave nera.
2. Leggi la Vedova, poi scendi nella conca di corallo.
3. Batti il Re Corallo: serve una squadra intorno al livello 20.
4. Spezza le tre catene: due argani sui gradoni e una a metà della catena che sale alla nave (c'è un anello).
5. Controlla che il Re Corallo sia in squadra e che la nave se ne vada.

**Da sapere:**

- Il Re Corallo nel mare è l'immagine frontale intera che si muove. L'animazione a pezzi (chele e zampe separate) arriverà quando ci saranno le immagini dei pezzi senza il corpo.
- La battaglia usa per ora lo sfondo della Baia: il testo per Gemini dell'anfiteatro è in `docs/PROMPT-BATTAGLIA.md` (sezione 5).
- Se chiudi il gioco durante lo scontro (prima di batterlo) lo scontro riparte; se è già sfinito, resta sfinito e le catene rotte restano rotte.

**v0.14.1 (correzioni dopo la prova del 3 ottobre):**

- Iceberg:
  - `ICEBERG_MAX_DRAFT` (190 unità): gli iceberg alti si rimpiccioliscono e non toccano il fondale;
  - niente ghiaccio a blocchi vicino agli iceberg dipinti (`nearIceberg`, `ICEBERG_CLEAR_MARGIN`);
  - il pittore del fondale non dipinge niente dentro il riquadro di un iceberg.
- Più vita: `WILD_RULES.maxPresent` 8, `ENDLESS.wildSlots` 8, 9 bestie piccole e medie in più in `WILD_SPAWNS`, 11 banchi in `OTHER_FISH_SCHOOLS`, `ENDLESS.schools` 9.
- `npm run art` riconosce il fondo verde (`onGreenScreen`) per profili, battaglia e pezzi del mondo. Nomi nuovi per i pezzi del mondo: `molo_<nome>`, `sottomarino_<n>`.
- Il molo dipinto del proprietario (`PIER_ART`) a Portofosco e Porto Fango.
- Lotto di immagini generate in Gemini: `docs/GEMINI-LOTTO-1.md` (da sistemare quando il proprietario le scarica).
- 352 test.

**Decisioni del proprietario (3 ottobre):**

- **Sottomarino al posto della barca:**
  - va sott'acqua, ogni modello ha una profondità massima;
  - è lento all'inizio; al porto se ne comprano di migliori;
  - dentro non si combatte: le bestie normali scappano, quelle enormi lo danneggiano;
  - resta dove lo lasci; dentro respiri, ti curi e peschi.
- **Inizio più graduale:** 3 o 4 missioni del porto prima dello Sfregiato.

**Tappa 16 (v0.15.0), il sottomarino:**

- `data/submarine.ts`: `SUB_MODELS` (3 modelli), `SUBMARINE` (ormeggio, corpo, urti, riparazione, pesca), `SUB_FISH`, `SUB_TEXT`.
- `systems/submarine.ts` (al posto di `boat.ts`):
  - Sali/Esci a qualsiasi profondità;
  - guida in 2D con collisioni (prua, centro, poppa) e profondità massima;
  - pesca;
  - `ramSub` (urti, rimorchio), `repairSub` (all'ingresso nel porto), `buySub`.
- `encounters.ts`: dentro il sottomarino le bestie aggressive di almeno 7 m lo urtano (`ramsSubmarine`, evento `subRammedBy`); le altre scappano (`RoamContext.scared`).
- `views/submarineView.ts`: l'immagine del proprietario, oblò accesi, bolle, lenza.
- `ui/portSubs.ts`: sottomarini nella scheda Mute.
- HUD: scafo, distanza dal sottomarino.
- Salvataggio v11: `sub` (posizione, modello, modelli, scafo). La barca dei vecchi salvataggi diventa il batiscafo.
- 352 test.
- Visto nel browser: il sottomarino ormeggiato oltre il molo dipinto, "Sali", dentro con "scafo 60/60" e il messaggio.

**Da provare (v0.15.0):**

1. Vicino al molo di Portofosco, Sali sul sottomarino e guida sott'acqua.
2. Passa sotto gli iceberg del Mare di Ghiaccio.
3. Prova a scendere oltre gli 80 m.
4. Avvicinati a uno squalo: deve scappare.
5. Avvicinati a un'orca: deve urtarti.
6. Al porto compra lo Squalo di ferro.

**Da sapere:** i tre modelli usano per ora la stessa immagine. Servono altre due immagini su fondo verde (testi in `docs/PROMPT-MONDO.md`, sezione 6).

**Tappa 17 (v0.16.0), i lavori di Aurelio:**

- `data/portJobs.ts`: 4 lavori, ricompense, testi.
- `systems/portJobs.ts`:
  - il passo di storia `portJobs` tra `tutorial` e `pier`;
  - i progressi vengono dagli eventi del gioco (pesci, battaglie vinte, domature) e dai livelli;
  - ogni lavoro si paga una volta (segni `lavoro:<id>` nella lista "seen");
  - finiti tutti, al molo si passa a `pier`.
- `StoryState.jobs`, salvati senza cambiare versione (campo facoltativo). Dialoghi `jobs` e `hintJobs`.
- 356 test.

**Da provare (v0.16.0):** una partita nuova (Pausa, Nuova partita, oppure un altro telefono):

1. Dopo la prima immersione compaiono i lavori.
2. Falli tutti.
3. Torna al molo: deve bruciare.

**v0.16.1:**

- Lotto Gemini 1 sistemato (`docs/GEMINI-LOTTO-1.md`).
- Sfondo di battaglia `barriera` (`BATTLE_STAGE.places`, `BATTLE_PALETTES.barriera`).
- Profili, battaglia e card di 10 bestie (ancora senza comparse nel mare).
- **Da sistemare prima di farle comparire:**
  - polpo gigante, calamaro gigante e isopode gigante hanno buchi neri tra i tentacoli e le zampe (fondo chiuso non tolto nei profili: serve lo stesso trattamento di `BATTLE_ENCLOSED`);
  - l'anguilla elettrica ha un alone scuro intorno ai fulmini.
- Mancano ancora (vedi `docs/PROMPT-BESTIE.md`, da fare su fondo verde): Kraken, Mosasauro, Calamaro colossale, Serpente di mare, Piovra, Leviatano, e le viste da dietro di Livyatan e Dunkleosteus.

**Tappa 18 (v0.17.0), capitolo 4: la Foresta Sommersa:**

- `data/chapter4.ts`: `WRECK`, `PIOVRA` (livello 25), `BELL`, `TENTACLES`, segni e testi.
- `systems/chapter4.ts`:
  - dialogo della Vedova sopra la foresta;
  - campana (`hitBell`, 3 colpi, salvata con il segno `piovra:campana`);
  - tentacoli a turno (giù, avviso, su), presa con trascinamento e aria che cala, liberazione con 5 tocchi di Scatto;
  - la Piovra (bestia della storia, id 902) vicino al galeone; dopo la battaglia premio e dialogo finale; si unisce, la nave salpa.
- `views/chapter4View.ts`: galeone, campana con onde del suono, tentacoli.
- Passi nuovi `freePiovra` e `chapter4Done`.
- Specie nuove nel mare: anguilla elettrica, polpo gigante, lontra marina (`WILD_SPAWNS` FOREST, `BIOMES` foresta, `BEAST_TEMPER`).
- Piovra: `artFrom: 'polpo_gigante'` finché non arrivano le sue immagini.
- Prima della tappa:
  - v0.16.2: grandezza in battaglia per forma dell'immagine (`BATTLE_ART_FLAT`), virata della cavalcatura, scontorno dello squalo bianco;
  - scontorno dei buchi chiusi nei profili di polpo, calamaro e isopode.
- 380 test.
- Visto nel browser: dialogo della Vedova, obiettivo della campana, galeone.

**Da provare (v0.17.0):**

1. Dopo il capitolo 3, vai alla Foresta Sommersa (circa 1,3 km) e nuota sotto la nave.
2. Spezza la campana con l'arpione: è appesa vicino alla superficie.
3. Prima di spezzarla, prova a farti prendere da un tentacolo, poi liberati con Scatto.
4. Batti la Piovra vicino al galeone.

**Da sapere:**

- Chrome (Claude in Chrome) non era collegato: le immagini della Piovra sono da generare. Testi su fondo verde in `docs/PROMPT-BESTIE.md`.
- La campana è a pochi metri sotto la superficie, sotto la nave: si colpisce anche dal basso.

**v0.17.1:**

- `pwa.ts`: controllo degli aggiornamenti a ogni ritorno sullo schermo e ogni 30 minuti.
- Versione e avviso di esportazione nel menu Pausa.
- `Mount.turn`/`turnFrom` al posto del giro per la verticale (`TEAM_RULES.turnSeconds` 0,6).

**v0.18.0, il mare vivo (richiesta del proprietario, 3 ottobre):**

- Lotto Gemini 2 (`docs/GEMINI-LOTTO-2.md`), tutto su fondo verde.
- 10 specie nuove in `species.ts` e 30 mosse in `moves.ts` (63 specie, 171 mosse).
- `WILD_SPAWNS`:
  - zone `BEACH_REEF`, `SHALLOW_BAY`, `SHALLOW_REEF`, `ABYSS_BAY`, `ABYSS_EAST`;
  - le specie del mare aperto anche nelle zone fatte a mano.
- `SPECIES_DEPTH`: nel mare aperto le specie compaiono solo alla loro profondità (`prepareEndlessSpawn`).
- Biomi del mare aperto con le specie nuove.
- `CORALS.patches`: barriere colorate in acqua bassa.
- Pesci nuovi `pesce_farfalla`, `pesce_angelo`; banchi più grandi; 8 banchi di sardine in superficie e 11 di pesci colorati.
- `SARDINE.simRange`: i pesci lontani seguono il banco senza collisioni (più fluido).
- 406 test.
- Visto nel browser: la barriera colorata davanti alla spiaggia con i banchi colorati, i banchi più grandi nella Baia.

**Non messi nel mare, di proposito (scelta del proprietario):** i compagni iniziali, la Piovra (Guardiano), megalodonte, Dunkleosteus e Livyatan (future leggende, da decidere).

**v0.18.2, grandezze in battaglia (richiesta del proprietario, 3 ottobre):**

- `battleSize` in `systems/battle/stage.ts`: la lunghezza vera su una scala logaritmica tra `BATTLE_STAGE.size.minM` (0,5 m) e `maxM` (30 m), portata tra `min` (0,4) e `max` (1,0) dell'altezza dello schermo; poi `fitSize` la rimpicciolisce se uscirebbe dallo schermo.
- `npm run art` scrive `BATTLE_ART_BOX` (dove ogni immagine di battaglia non è trasparente) al posto di `BATTLE_ART_FLAT`.
- Le grandezze non dipendono più dalla coppia: ogni bestia ha la sua.
- `tests/battleFraming.test.ts`: ogni forma, in tutti e due i ruoli, su iPhone e iPad, a livello 1 e al massimo.
- Per provare: `?battaglia&nemico=capodoglio&mio=pesce_leone` (nuovo `mio`).

**v0.19.0, prime evoluzioni e alfa (3 ottobre):**

- Lotto Gemini 3 (`docs/GEMINI-LOTTO-3.md`): le "evoluzioni" generate allegando la card base sono venute quasi uguali all'animale base. Il proprietario le ha scelte così:
  - `pesce_palla → istrice_gigante` (Lv 18) e `pesce_napoleone → napoleone_corazzato` (Lv 24) sono evoluzioni (`evolvesTo`, `movesFrom`); non compaiono ancora nel mare;
  - otto alfa con immagini proprie (`<id>_alfa_*`);
  - `beluga_spettro` è una bestia unica (`UNIQUE_VARIANTS`, come le leggende).
- Le bocche aperte le ha fatte il proprietario; dove mancano non si usano.
- Varano albino (`asset animali ai/varano del nilo nero/varano_nilo_albino_*`): mancano card e vista dietro, si mette nel gioco dopo.

**Menu come Pokémon (piano approvato il 3 ottobre; stati che restano dopo la battaglia: sì; annullare l'evoluzione: sì):** A mosse — fatto in v0.26.0 (impara mossa, dettagli e efficacia in battaglia, pannello livello). B scheda in 3 pagine ed evoluzione annullabile — fatto in v0.28.0; C squadra e D zaino come Pokémon, stati che restano — fatto in v0.29.0; E bestiario con i filtri e F tessera del cacciatore — fatto in v0.30.0. Tutto il piano dei menu come Pokémon è fatto. Livello massimo 100: fatto in v0.27.0 (forme finali al 100).

**Piano approvato il 3 ottobre ("Ok su tutto"):** (1) via la schivata e mosse di Pokémon — fatto in v0.24.0; (2) posizioni e grandezze come Pokémon gen 3–5 — fatto in v0.25.0 (la tua più grande e tagliata in basso, ingresso con telecamera da 5 m in su; la selvatica resta intera); (3) poi a scelta del proprietario: oggetti di cura, nature, abilità, strumenti, meteo, cacciatori rivali, evoluzioni con oggetti. Cavalcata: i 3 pulsanti in mare restano le mosse vecchie, da ripensare dopo.

**Battaglie come Pokémon (piano approvato dal proprietario, 3 ottobre):** fase 1 fatta (v0.21.0: statistiche, danno, tipi). Fase 3 fatta (v0.23.0: gruppi di crescita, esperienza Gen V, cattura Gen III–IV). Fase 2 fatta (v0.22.0): mosse con potenza, precisione, PP (al posto della ricarica), categoria fisica/speciale/stato, priorità, stati alterati (avvelenato, paralizzato, stordito=sonno, congelato, ferito=scottatura) e statistiche da −6 a +6. Fase 3: esperienza (gruppi di crescita, formula Gen V) e cattura (formula Gen V).

**Prossima sessione:**
0. Rifare in Gemini `squalo_martello_back` (è dritto, visto da dietro in pieno: owner, 3 ottobre) con la richiesta di schiena che funziona (coda vicina in basso a sinistra, testa lontana in alto a destra).
1. Test delle evoluzioni vere: richiesta **senza immagine allegata**, una trasformazione forte (regole in memoria "Stile delle evoluzioni"), una alla volta, decide il proprietario.
2. Il varano con tre stadi (l'ultimo quasi uno spinosauro marino).
3. Poi capitolo 5, il Mare di Ghiaccio. Proporre il piano prima. (la Vedova e la reliquia dei templi; bestie nuove dal lotto Gemini: anguilla elettrica, polpo gigante, lontra marina). Proporre il piano prima.

## Sessione 11 — Tappa 10: la Costa (1 ottobre 2026) → v0.9.0

**Fatto**

- Costa disegnata a mano (`LAYOUT` in `data/worldLayout.ts`): spiaggia lunga in pendenza dolce con uno scalino sotto il molo, Baia allargata ×1,6, Isola delle Mangrovie (scogliera sopra e sotto l'acqua, passaggio sotto), Porto Fango sulla sua riva est, Delta alla foce del fiume dell'isola, mare aperto spostato di 3372 unità. Il vecchio disegno è conservato con le trasformazioni `bay()`, `delta()`, `east()`.
- Porti: `PORTS` (Portofosco e Porto Fango, completo); si rinasce nell'ultimo porto visitato (`homePort`, salvato). Aurelio solo a Portofosco.
- Velocità: sub 42 u/s (7 m/s), scatto 105, squalo in sella ≈55 u/s (`rideSpeedMult` 0,48), inseguimento 2,9 U/s.
- Salvataggio v7: diver spostato, muro di ossa e botola della tana restano rotti, `homePort`.
- Test della costa (pendenza, isola, si arriva nuotando dalla spiaggia al Delta passando sotto l'isola, Porto Fango, conversione). 217 test.
- Visto nel browser: spiaggia e molo, Porto Fango con capanne e menu, scogliera dell'isola, Delta.

**Mancante / da sapere**

- La storia non dice ancora niente di Porto Fango: arriverà col capitolo 3.
- Il fondale della spiaggia è scuro come il resto: più avanti sabbia più chiara e qualche dettaglio da spiaggia.

**Da provare sull'iPhone**

1. Parti da Portofosco e nuota verso est: senti la spiaggia lunga prima della Baia? La velocità ti piace (a nuoto e in sella)?
2. Arriva all'isola: in superficie non passi, tuffati sotto.
3. Riemergi dall'altra parte, a Porto Fango: apri il porto, compra o vendi qualcosa.
4. Con `?prove` c'è "Portami a Porto Fango".

**Aggiunta (v0.9.1, dopo la tua prova):** scelta della prima bestia (Zanna, Guscio, Scintilla) appena finita l'apertura o al caricamento di una partita senza bestie; evoluzioni ai livelli 16 e 36; squadra tutta KO = perdi i sensi e ti risvegli curato (−10% denti). Visto nel browser: la schermata di scelta e "Scintilla entra nella tua squadra!". Immagini dei 9 stadi: prompt in `docs/PROMPT-INIZIALI.md`. 224 test.

**Aggiunta (v0.9.2):** immagini dei 9 stadi elaborate (45 file, `BATTLE_ENCLOSED` per i buchi chiusi di Scintilla e Folgore); animazione di evoluzione (`ui/evolutionShow.ts`, mette in pausa il mondo); linea evolutiva nella scheda; esperienza dai pesci (`XP_RULES.fishXp*`), curva più dolce (`12·L^1,5`) e premi più alti (`rewardBase` 18); mare pieno (`WILD_SPAWNS` con visitatori a livelli propri, `maxPresent` 5, 17 banchi di sardine). Vista l'animazione nel browser (Zanna → Squarcio). 244 test.

**Da provare (v0.9.2):** scegli l'iniziale, combatti e pesca sardine fino al 16: arriva in tempi giusti? Vedi l'animazione? Il mare è abbastanza pieno o troppo (troppe battaglie)?

**Aggiunta (v0.9.3):** ogni bestia della squadra si chiama dalla barra: le cavalcature (e le seconde forme con `rideSpeedMult`) ti portano in sella, le altre ti seguono (`Mount.state 'follow'`, `TEAM_RULES.follow`) e mangiano i pesci; Folgore 18 m con `girth` 1,6 (immagine allargata in verticale), Zannarossa 15 m, Archelon 8 m. Da fare se piace: il compagno che avvisa delle bestie vicine (promesso, non ancora fatto). 246 test.

**Correzione (v0.9.4):** le immagini di profilo si caricavano solo per le specie di `WILD_SPAWNS`: le linee iniziali erano invisibili nel mare. Ora `views/neededSprites.ts` include le linee iniziali; un test controlla che ogni bestia selvatica e ogni stadio iniziale abbia un profilo caricato. Pesce palla, murena e manta (solo immagini di battaglia) tolti dalle comparse. **v0.9.5:** profili e card di pesce palla (morso = versione gonfia), murena e manta presi da `asset animali ai/` (c’erano già); tornati nella Barriera.

**Suoni (v0.9.6):** primo passaggio, tutto sintetizzato con Web Audio (niente file): `src/audio/` (soundEngine nella Session, seaAmbience, battleMusic), numeri e note in `data/audio.ts`. Interruttore nel menu di pausa (localStorage). Da fare più avanti: suoni di colpi, mosse, domatura, porto, musiche per zona.

**v0.9.7 (correzioni dopo la prova, 2 ottobre):** Sfondamento (`ABILITIES.sfondamento`, `breaksBones`, avviso `bonesHint`); morso × taglia (`SIZE_BITE`, cavalcatura bite 2,6); livelli minimi (`WILD_LEVELS`, `minLevel` dello squalo bianco 15, fuori scala 5%); curva XP più lenta dopo il 20; KO → subito la bestia successiva (`BattleScene.replaceFainted`); `BATTLE_STAGE.pictureMult` (murena, manta); `restAtPort` e pulsante Riposa; tutte le bestie in acqua mangiano (`FEEDING.minReach`); lampada soffusa; conchiglia con raggi disegnati; script art: `SIDE_MOUTH` (bocca del martello). Testi per Gemini: `docs/PROMPT-MONDO.md` (pareti, iceberg). 263 test.

**v0.9.8 (piano B):** `moveInTeam`, `useItemOn`; conchiglie (`BATTLE.catch.shellItem`, `START_INVENTORY`, salvataggio v8 che ne regala 5); esche con `ItemDef.lure` e `BeastState.lure` (encounters ignora il limite di 5 per le specie attirate); `ROAM.chaseLeash`/`homeSeconds`/`fearRatio` e `RoamContext.riderLength`; branco cosmetico (`BEAST_TEMPER.school`, `views/beastsLayer`); mappa (`systems/seaMap.ts`, `ui/seaMapPanel.ts`, zone visitate in `seen` come `zona:<nome>`); `input.dashHeld` e `TEAM_RULES.rideSprintMult`. 271 test.

**v0.9.9:** inclinazione del sub (`DIVER.tilt`) e della cavalcatura (`TEAM_RULES.pitchMax` 1,25); virata ad anello della cavalcatura (`Mount.loop`, `TEAM_RULES.loopSeconds`; tolto il vecchio `turn`). Visto nel browser: tuffo a testa in giù e virata. 272 test.

**v0.9.10:** il compagno avvisa delle bestie nel buio (`stepSenses` in encounters.ts, `ROAM.senseRange`/`senseMin`, evento `beastSensed`). 273 test.

**Da fare (piano C):** Mare di Ghiaccio e pareti dipinte (quando arrivano le immagini, testi in `docs/PROMPT-MONDO.md`); battaglia contro un branco intero (per ora si combatte il capobranco).


## Sessione 10 — Battaglia più bella (1 ottobre 2026) → v0.8.0

**Fatto**

- 41 immagini a tre quarti dalla cartella "asset animali ai" smistate, orientate (`_flip`), scontornate e messe nel gioco (`npm run art`, scontorno nuovo che non buca le bestie scure). La tua bestia guarda sempre a destra, il nemico a sinistra (lo squalo bianco da dietro era girato: corretto).
- Grandezze relative come Pokémon, giganti sempre enormi (`systems/battle/stage.ts`, `BATTLE_STAGE`).
- I tuoi sfondi dipinti della Baia, la conchiglia e le 10 icone sono nel gioco. `npm run art` si arrangia anche se il verde di Gemini è solo parziale (primo piano solo con le rocce ai lati e in alto, pedana ritagliata a ellisse). Delta e tana usano i dipinti della Baia con la loro tinta, più radici e costole disegnate.
- Bestie animate, il nemico esce dal buio (i giganti fanno tremare il mare), le rare luccicano, effetti per tipo, conchiglia, numero del danno.
- Interfaccia stile Pokémon recenti con colori cupi da dark fantasy, carattere Baloo 2, nomi lunghi che scorrono, riquadri che brillano per le rare (argento) e i giganti (oro).
- Prova: `?battaglia&nemico=<id>&variante=albino|alfa&finale&unico=sfregiato&luogo=baia|delta|tana`.
- 160 test automatici.

**Mancante / da sapere**

- Sfondi dipinti propri del Delta e della tana: per ora prendono quelli della Baia con un'altra tinta.
- Il coccodrillo albino leggendario visto davanti ha un po' di pavimento grigio sotto (è nell'immagine originale): conviene rigenerarlo su fondo nero pulito.
- Manta (davanti e da dietro) e pesce palla da dietro: mancano, servono per il capitolo 3.
- Verificato nel pannello del browser: sfondo dipinto, grandezze, luccichio e nome che scorre. Verso la fine il pannello era nascosto e non ho potuto vedere a schermo l'ingresso dal buio e le scintille, né il formato iPhone: il gioco girava senza errori, ma va guardato sull'iPhone. Non l'ho provata nel gioco vero (al contatto con una bestia), solo con `?battaglia`: la parte nuova è la stessa.

**Da provare sull'iPhone**

1. `https://matteomango23-png.github.io/leviathan/?battaglia&nemico=squalo_bianco&variante=albino&finale`: il nemico esce dal buio, il mare trema, il riquadro brilla d'oro, il nome scorre.
2. `?battaglia&nemico=torpedine` (lo squalo deve essere molto più grande) e `?battaglia&nemico=tartaruga_marina`.
3. `?battaglia&nemico=squalo_bianco&unico=sfregiato&luogo=tana` e `?battaglia&nemico=coccodrillo_marino` (Delta).
4. Usa Lotta con mosse di tipi diversi, poi Doma: guarda gli effetti e la conchiglia dipinta.
5. Dimmi se va fluida (60 fps) e se il testo si legge bene.

**Dopo la tua prova (v0.8.1):** tua bestia più grande e non coperta, schivata più difficile, fuga in base alla forza, pinne tagliate sfumate. Coccodrillo marino rigenerato (davanti e da dietro). Manta e pesce palla da dietro aggiunti (erano già in "asset animali ai": li avevo scambiati per viste di lato). v0.8.2: sfondi dipinti di Delta e tana, pesce palla davanti nuovo (gli originali sono in "asset animali ai/sfondi battaglia" e nelle cartelle delle bestie). Manca solo il coccodrillo albino davanti su fondo nero pulito. v0.8.3: tolta la pinna-schizzo dello squalo bianco da dietro (`BATTLE_ERASE`), primi piani con il centro sempre libero (`clearCentre`), bordi senza scalini.

**Dopo (v0.8.3-v0.8.6):** macchia dello squalo bianco tolta, primi piani col centro libero, aggiornamento immediato all'apertura, impronta negli indirizzi delle immagini, test delle inquadrature (212 test). La battaglia è approvata dal proprietario.

**Prossima sessione:** prima l'esplorazione, poi la storia (scelte in DECISIONS, "Prima finire l'esplorazione"). Tappa 10 sul ramo `tappa-10-costa`: costa disegnata a mano (porto su spiaggia in pendenza, Baia, isola con passaggio sotto e secondo porto, Delta alla foce attaccato alla terraferma) e cavalcature più lente. Proporre il piano breve al proprietario prima di scrivere codice. Poi: oceano infinito con biomi e ossigeno lungo, barca, bestie uniche.

## Sessione 9 — La battaglia a turni entra nel gioco (1 ottobre 2026) → v0.7.0

**Fatto**

- Tolto tutto il combattimento in tempo reale (morsi in acqua, compagno che difende, minigioco della domatura in acqua, scontro nella tana con fasi e coda).
- Bestie visibili che nuotano piano (`beasts/roam.ts`), comparse e inizio della battaglia (`encounters.ts`), risultati nel gioco (`battleResult.ts`).
- Cavalcature chiamate dalla barra (`beasts/mount.ts`) con abilità (`abilities.ts`: Sfonda le ossa, respiro della megattera).
- Guardiano e coccodrillo della Vedova come battaglie senza fuga.
- Nuova schermata di battaglia (card sfumate come segnaposto delle immagini a tre quarti), SCHIVA con barra, testi al femminile.
- `npm run art` prepara le immagini `_front` e `_back` (elenco in `docs/ART.md`).
- 147 test automatici.

**Mancante / da sapere**

- Le immagini a tre quarti le stai generando tu: finché mancano, la battaglia usa le card.
- Da fare dopo (scelte già prese): "Potenzia" con i doppioni nella scheda; progressione per zone ribilanciata (livelli che salgono, boss di poco sopra); tipi forte/debole ben visibili in scheda e bestiario; storia con ritratti; mondo più grande e ambienti migliori.
- La schermata di battaglia nel pannello del browser non si vede intera (problema della mia anteprima, non del gioco): provala sull'iPhone.

**Da provare sull'iPhone**

1. Nuota nella Baia: le bestie compaiono piano nel buio. Lascia che uno squalo ti tocchi: parte la battaglia.
2. In battaglia prova Lotta, Squadra, Zaino, Doma e Fuggi. Prova SCHIVA (difficile apposta).
3. Colpisci col fucile una tartaruga alle spalle: deve partire la battaglia con "Attacco a sorpresa".
4. Tocca lo squalo nella barra in alto: arriva e ci sali. Vai alla botola di ossa al centro della Baia e premi "Sfonda".
5. Nella tana lo Sfregiato ti viene incontro: da questa battaglia non si fugge.

**Prossima sessione:** "Potenzia" con i doppioni e ribilanciamento della progressione per zone; poi tipi in scheda e bestiario. Il capitolo 3 aspetta le immagini.

## Sessione 8 — Svolta: correzioni e prova della battaglia a turni (1 ottobre 2026) → v0.6.1, v0.6.2

**Fatto**

- Il proprietario ha provato tutto e ha deciso la svolta (vedi DECISIONS, "Svolta dopo la prova completa"): tutto alla Pokémon, battaglia a turni 1 contro 1 con schivata difficile, "Potenzia" con i doppioni.
- v0.6.1: fucile subacqueo (solo dal pulsante, mai in sella), pulsanti mossa non sotto lo scatto, Doma/Apri prima di Cavalca, mai incastrati nel fondale, albini pallidi, Nuova partita e partita precedente.
- v0.6.2: prova della battaglia a turni col link `?battaglia` (il gioco normale non cambia).
- 159 test automatici.

**Da provare sull'iPhone**

1. Apri https://matteomango23-png.github.io/leviathan/?battaglia e fai qualche battaglia ("Nuova battaglia" alla fine).
2. Prova a schivare: tocca quando il cerchio rosso tocca la tua bestia. Dimmi se è troppo difficile o troppo facile.
3. Prova a domare: più è sfinita, più è facile; albini e alfa sono più difficili.
4. Dimmi cosa ti piace e cosa no (velocità dei messaggi, grandezza delle bestie, menu, schivata).

**Prossima sessione:** se la prova piace, nuovo design (battaglia nel gioco al contatto con le bestie, progressione per zone, cattura, Potenzia con i doppioni, tipi nelle schede), poi si riadattano Baia e Delta. Il capitolo 3 aspetta.

## Sessione 7 — Capitolo 2: il Delta delle Mangrovie (1 ottobre 2026) → v0.6.0

**Fatto**

- Il Delta tra Baia e Barriera (mondo allargato di 520 unità, tutto l'est spostato), bassa profondità, acqua torbida, mangrovie, cefali e pesci arciere.
- Coccodrilli marini che attaccano dalla superficie; coccodrillo albino leggendario raro (3%).
- La Vedova Nera con la megattera incatenata: dialogo, il suo coccodrillo alfa (livello 12) con la barra grande, 3 ancoraggi da spezzare, la megattera (livello 10) si unisce alla squadra, la nave fugge verso la Barriera.
- Salvataggio v6 con migrazione (ossa rotte e posizione nel mondo più largo).
- 144 test automatici.

**Mancante / da sapere**

- Visto nel browser: il Delta (acqua torbida, radici, pesci) e la balena incatenata sotto la nave con il dialogo della Vedova. Il coccodrillo in azione, la rottura degli ancoraggi e il finale sono provati dai test automatici, ma non li ho visti a schermo.
- Il coccodrillo del Nilo non c'è ancora (scelta tua: forse più avanti come coccodrillo comune).
- La Vedova Nera non ha un ritratto: parla dalla nave, nei dialoghi.

**Da provare sull'iPhone**

1. Se hai già finito il capitolo 1: l'obiettivo dice "Segui la nave della Compagnia a est". Nuota a est dalla Baia fino al Delta (oppure, con `?prove`, "Portami nel Delta").
2. Avvicinati alla nave nera: dialogo della Vedova, poi arriva il suo coccodrillo dalla superficie.
3. Spezza i tre ancoraggi (paletti di ferro con catene, un po' illuminati sul fondale): 8 colpi d'arpione ciascuno.
4. Liberata la balena: controlla che sia nella squadra e prova a cavalcarla.
5. Controlla che le ossa già rotte (muro di ossa, botola della tana) siano ancora rotte.

**Prossima sessione:** Sessione 8 — Capitolo 3: la Barriera Rossa, ramo `tappa-7-barriera` (già creato). **In attesa delle immagini del proprietario** (elenco in `docs/ART.md`, "Capitolo 3"): murena, manta, pesce palla e i pezzi del Re Corallo. Scelte già fatte (1 ottobre 2026): la Vedova Nera sta strappando il Re Corallo dalla Barriera con catene e argani; impazzito ti attacca; lo sfinisci, rompi le catene e lo domi; la Vedova fugge verso la Foresta Sommersa. Lo scontro è in un anfiteatro di corallo sul fondale: cammina sul fondo, si chiude nella corazza (i colpi rimbalzano), attacca con le chele da vicino, lancia schegge di corallo; si colpisce quando apre le chele o di lato. Dopo il capitolo 3 viene una sessione di pulizia (ogni 3 tappe).

## Sessione 6 — Storia del capitolo 1 (30 settembre 2026) → v0.5.0

**Fatto (tappa 5, capitolo 1)**

- Apertura giocabile sulla barca di Aurelio: la nave della Compagnia passa trascinando una megattera in catene col collare di ferro; dialogo; tuffo.
- Immersione guidata in 4 passi, con l'obiettivo sotto i cuori.
- Molo e case in fiamme al ritorno, collare spezzato, obiettivo "Trova lo squalo di Aurelio".
- Tre tracce sul fondale fino alla tana; suggerimento sulle ossa (serve la Carica); "è lui" quando appare lo Sfregiato; libero quando lo domi; finale con Aurelio e la nave verso est.
- Dialoghi (tocca per andare avanti, Salta), pulsante "Aurelio" al porto, "Rivedi l'inizio" nella pausa.
- Salvataggio v5; le partite vecchie riprendono dal punto giusto.
- 135 test automatici.

**Mancante / da sapere**

- Visto nel browser: l'apertura (nave, balena, Aurelio, dialogo, tuffo) e il molo in fiamme. Il finale e le tracce sono provati dai test automatici, ma non li ho visti a schermo.
- Aurelio e il sub sulla barca sono sagome semplici (come il sub segnaposto): si possono sostituire con immagini dipinte quando le avrai.
- Il capitolo 2 (Delta delle Mangrovie, coccodrilli, primo comandante della Compagnia) è la prossima tappa.

**Da provare sull'iPhone**

1. Per vedere l'inizio senza perdere la partita: Pausa → "Rivedi l'inizio".
2. Se hai già domato lo Sfregiato, l'obiettivo sotto i cuori deve dire "Capitolo 1 completato"; al porto prova il pulsante "Aurelio".
3. Per giocare la storia da capo: esporta prima il salvataggio (Pausa → Esporta), poi cancella i dati del sito da Safari.
4. Segui le tracce (piccole catene luminose sul fondale) fino alla tana; al primo scontro con lo Sfregiato deve comparire il dialogo "è lui".

**Prossima sessione:** Sessione 7 — Capitolo 2: il Delta delle Mangrovie (nuova regione, coccodrilli, comandante della Compagnia con una bestia incatenata). Serve prima un piano con le tue scelte.

## Sessione 5 — Pulizia (30 settembre 2026) → v0.4.1

**Fatto (nessuna funzione nuova, come da CLAUDE.md ogni 3 tappe)**

- Tolto il codice che nessuno usava; spostati nei dati gli ultimi numeri di gioco rimasti nel codice.
- Nuovo controllo automatico in `npm run check`: nessun file può importarne un altro che lo reimporta (dipendenze circolari). Oggi: nessuna.
- Documenti allineati: ARCHITECTURE elenca tutti i file, GDD con la roadmap aggiornata (tappe 1-4 fatte) e la decisione sulla morte contro i Guardiani.
- 123 test automatici, tutti verdi.

**Da provare sull'iPhone:** niente di nuovo; il gioco deve comportarsi esattamente come la 0.4.0.

**Prossima sessione:** Sessione 6 — Storia del capitolo 1 (tappa 5 della roadmap). Ramo consigliato: `tappa-5-storia`.

## Sessione 4 — Livelli, crescita e primo Guardiano (30 settembre 2026) → v0.4.0

**Fatto (tappa 4)**

- Esperienza dalle bestie sfinite (tutta a chi è in acqua, un quarto al resto della squadra), livelli fino al 50, mosse sbloccate al 7 e al 15 con un messaggio, statistiche e danno che crescono col livello.
- Crescita 31-50 con barra del cibo: la bestia grande mangia da sola, al porto c'è il pulsante "Nutri". Forme finali al 50 (Titano, Mega albino).
- Barre di esperienza e cibo in squadra e nella scheda (che già mostrava mosse, lucchetti e danno al prossimo livello).
- Lo Sfregiato nella sua tana sotto la Baia: due fasi, colpo di coda, scorta di due squali, 800 denti e Arpione mitico la prima volta, domabile; se scappa torna dopo la visita al porto.
- Salvataggio v4 con migrazione. Pannello di prova: "+5 livelli alla squadra", "Squalo bianco liv. 30", "Portami nella tana dello Sfregiato".
- 123 test automatici.

**Mancante / da sapere**

- Lo scontro è provato dai test automatici e l'ho visto nel browser (la tana, lo Sfregiato che gira e morde, la barra in alto), ma non l'ho giocato fino in fondo: la difficoltà va provata sull'iPhone.
- I numeri dell'esperienza sono un primo bilanciamento (`data/progression.ts`): dimmi se si sale troppo piano o troppo in fretta.
- Lo Sfregiato domato usa le mosse dello squalo bianco (non ha mosse sue).
- Nella tana non c'è ancora una scena di storia: arriverà con la Storia del capitolo 1 (tappa 5).

**Da provare sull'iPhone**

1. Doma uno squalo e combatti le bestie della Baia: guarda la barra dell'esperienza (Pausa → tocca la bestia) e il messaggio "Nuova mossa: Carica" al livello 7.
2. Cerca la tana: al centro della Baia, sul fondo (circa 55 m), compare la scritta "Tana dello Sfregiato" sopra una botola di ossa. Cavalca lo squalo e usa Carica per romperla.
3. Scendi e combatti lo Sfregiato: schiva gli affondi (fauci aperte = segnale), stai lontano dalla coda quando è furioso.
4. Sfinito, domalo. Se fallisci: torna al porto e poi di nuovo nella tana.
5. Con `?prove`: "Squalo bianco liv. 30", poi al porto nel Recinto "Nutri" con qualche pesce nella sacca; "+5 livelli" fino al 50 per vedere il Titano.

**Prossima sessione:** Sessione 5 — pulizia (CLAUDE.md: ogni 3 tappe una sessione senza nuove funzioni), poi la Storia del capitolo 1.

## Sessione 3b — Correzioni dopo la prova (30 settembre 2026) → v0.3.1

**Fatto (tutte le richieste del proprietario dopo la v0.3.0)**

- Costa ovest con terraferma e case; porto e partenza sulla riva.
- In sella più veloce, con scatto; affondo in avanti nei morsi (selvatiche, compagno, in sella).
- Virate che partono dalla testa (senza immagine di tre quarti, come deciso).
- Tartaruga gigante 2 m e lenta; torpedine più lenta. Barracuda, tartaruga e torpedine restano compagni, non cavalcature.
- Lo squalo in squadra mangia le sardine vicine: vanno nella sacca.
- Oltre la profondità della muta l'ossigeno scende più in fretta (niente muro invisibile).
- Scheda della bestia in stile carta con rarità, stelle e cornici speciali; bestiario dal menu di pausa.
- Menu del porto rifatto con icone e card.
- Fondale dipinto un po' alla volta (meno scatti con la lampada e nuotando veloce).
- 102 test automatici.

**Mancante / da sapere**

- Il gioco in movimento l'ho provato poco nel browser (il pannello era spesso nascosto): scheda, bestiario e porto sono stati controllati da soli, a misura di iPhone in orizzontale.
- La virata migliorata è fatta nel codice; se non basta, la soluzione vera resta un'immagine di tre quarti (da generare quando vuoi).
- Resta tutto quello elencato sotto per la sessione 3 (livelli, Guardiani, armi delle altre regioni).

**Da provare sull'iPhone**

1. All'avvio sei sulla riva ovest: guarda case, molo e la Baia che scende davanti.
2. Tocca "Porto": prova tutte le schede, compra, metti qualcosa nello zaino (tocca un posto, poi l'oggetto).
3. Doma uno squalo, cavalcalo: velocità, scatto in sella, affondo nei morsi, virate.
4. Con lo squalo in acqua passa vicino a un banco di sardine: la sacca deve salire.
5. Nuota veloce e muovi la lampada: deve restare fluido. Se scatta ancora, dimmi dove.
6. Scendi oltre i 150 m con la muta leggera: l'ossigeno deve calare in fretta.
7. Menu di pausa → Bestiario; tocca una bestia della squadra per aprire la sua scheda.

**Prossima sessione:** Sessione 4 — Livelli, crescita e primo Guardiano (`docs/PROMPT.md`). Ramo consigliato: `tappa-4-livelli`.

## Sessione 3 — Porto ed economia (30 settembre 2026) → v0.3.0

**Fatto (tappa 3 + altre bestie della Baia)**

- Portofosco al molo (Mercato, Mute, Zaino, Bacheca, Recinto), cura e rinascita al porto.
- Denti di squalo; sacca dei pesci e vendita; sgombri nella Baia.
- Mute con profondità massima, cuori, velocità e scatto; potenziamenti Apnea e lampade.
- Relitti e forzieri (fiocine nella Baia, rete nella Barriera, denti e oggetti).
- Zaino con 3 posti (armi, oggetti, sciami); oggetti: Bolla d'aria, Alga curativa, Esca, Krill dorato, Arpione mitico.
- 8 missioni semplici; sciame di sardine (legame dopo 10 catture, assorbe morsi).
- Barracuda, tartaruga marina e torpedine selvatici nella Baia, domabili, con mosse generali (morsi multipli, affondo, velocità doppia, scudo, cupola, scosse e stordimento ad area).
- Solo le cavalcature si cavalcano. Al massimo 2 bestie selvatiche insieme.
- Salvataggio v3 con migrazione. Regole di orche matriarche e leggendarie nel GDD; loro immagini pronte.
- 94 test automatici.

**Mancante / da sapere**

- Il menu del porto è stato provato nel browser (tutte le schede, vendita), ma non l'ho potuto vedere dentro il gioco in movimento: il pannello del browser era nascosto. Da provare bene sull'iPhone.
- Folgore e arpione runico, lampo sonar e nuoto controcorrente arrivano con le loro regioni.
- Skin delle bestie, barca e viaggio veloce: non in questa tappa.
- Le bestie domate non salgono ancora di livello (tappa 4): per ora il Krill dorato è l'unico modo.
- Alla torpedine manca ancora il profilo a bocca aperta (usa quello chiuso).

**Da provare sull'iPhone**

1. Risali in superficie vicino al molo e tocca "Porto": guarda le 5 schede.
2. Accetta 2-3 missioni in Bacheca, poi pesca sardine e sgombri; torna al porto, vendi e riscuoti.
3. Cerca il relitto della Baia (luce dorata sul fondo, a ovest a metà Baia): "Apri" → fiocine. Al porto, Zaino → mettile in un posto; in immersione tocca "Fiocine" in alto a destra.
4. Dopo 10 sardine metti lo "Sciame di sardine" nello zaino e chiamalo quando arriva uno squalo.
5. Compra la muta rinforzata (400 denti) e prova a scendere oltre i 150 m.
6. Con `?prove`: fai apparire barracuda, tartaruga e torpedine e prova a domarli; "+2000 denti" per provare il mercato.

## Sessione 2 — Solo lo squalo bianco (30 settembre 2026) → v0.2.0

**Fatto (tappa 2 ristretta allo squalo bianco)**

- `npm run art`: scontorno del fondo nero, profili 1000×460 con linea del corpo a y=250, card 2:3 640×960, `_left` per i profili a sinistra, mai sovrascrive senza `--force`. Le immagini della cartella "asset animali ai" sono in `art-inbox/` con i nomi standard; generati sprite e card mancanti di barracuda, torpedine, tartaruga marina, squalo martello, squalo tigre, megattera, orca, coccodrillo marino (gli sprite già approvati dello squalo non sono stati toccati).
- Squalo bianco selvatico nella Baia: sprite animato a strisce lungo la spina dorsale (Phaser 4 non ha Rope), bocca aperta nei morsi, regole di movimento delle bestie grandi (test automatico: non si gira mai in vista).
- Sei versioni con le taglie da `data/` (6 / 6,9 / 6 / 9 / 7,5 / 9 m). Alfa e albino compaiono in natura (4% e 8%).
- Combattimento: arpione, tipi e moltiplicatori, danni delle mosse, barre della vita con tacca di sfinimento, numeri dei danni.
- Domatura con minigioco legato alla differenza di livello; doppione comune che fugge.
- Squadra (5) + riserva, richiamo con ricarica, compagno che difende, cavalcatura con 3 pulsanti mossa (Morso, Carica che rompe le ossa, Frenesia), KO.
- Santuari con cura graduale (anche delle bestie KO) e rinascita.
- Salvataggio v2 con migrazione dalla v1. Pannello di prova con `?prove`.
- 72 test automatici.

**Mancante / da sapere**

- Le altre bestie della Baia (barracuda, tartaruga, torpedine) arrivano nella sessione 3: le loro immagini sono già pronte.
- Esperienza, livelli che salgono, crescita e forme finali: tappa 4. Per ora una bestia domata resta al suo livello (lo squalo selvatico è di livello 4–6, quindi ha solo Morso; per provare Carica e Frenesia usa il pannello di prova).
- Lo Sfregiato come Guardiano con i suoi attacchi: tappa 4. Titano e Mega albino si vedono solo col pannello di prova.
- Branco (tutta la squadra in acqua) e catena alimentare: non ancora.
- Da chiarire col proprietario: a quali bestie corrispondono le cartelle "orca matriarca", "orca madre delle madri (matriarca leggendaria)", "orca preistorica albina" e "coccodrillo albino leggendario" (non ancora copiate in `art-inbox/`). Controllare anche che per l'orca il profilo aperto/chiuso sia giusto (stabilito dall'ordine dei file).

**Da provare sull'iPhone**

1. Nuota verso ovest (sinistra) dalla partenza fino alla "Baia di Portofosco": dopo pochi secondi arriva lo squalo.
2. Colpiscilo con l'arpione; quando apre le fauci e rallenta, scatta in alto o in basso per schivare l'affondo.
3. Quando è sfinito (barra azzurra), avvicinati: tocca "Doma" e poi tocca lo schermo quando l'ago è nella fascia chiara.
4. In sella: prova Morso; scendi con "Scendi"; richiama e chiama lo squalo toccandolo nella barra in alto.
5. Trova il santuario della Baia (arco di pietra con la luce azzurra) e resta fermo dentro.
6. Apri `https://matteomango23-png.github.io/leviathan/?prove` → pausa → prova le sei versioni e lo squalo di livello 15 (Carica sul muro di ossa, a ovest in profondità; Frenesia).

**Prossima sessione:** Sessione 3 — Porto ed economia (`docs/PROMPT.md`), più le altre bestie della Baia. Ramo consigliato: `tappa-3-porto`.

## Sessione 1 — Fondamenta (30 settembre 2026) → v0.1.0

Progetto, mondo a tile con resa realistica, sub, arpione, sardine, luce, PWA offline, salvataggi con esporta/importa, pubblicazione su GitHub Pages. Vedi CHANGELOG.
