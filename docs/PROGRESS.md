# Progressi

## Dove siamo (aggiornato il 20 ottobre 2026, v0.82.0)

- **Gioco:** mare in tre zone (baia, Delta, mare aperto infinito), 34 bestie con albini, alfa, forme finali e uniche, battaglie a turni con mosse e domatura, flotta (navi, sottomarini, motoscafi), porti con bacheca, mercato, cantiere, riparazioni, sonar e cacce, meteo, suoni e musiche.
- **Salvataggi:** menu iniziale con più partite (`systems/save/slots.ts`); una partita illeggibile non si sovrascrive mai. Dire sempre al proprietario quando un lotto tocca i salvataggi.
- **Immagini:** quasi tutte le bestie hanno card, profili, fronte e retro. Mancano:
  - Kraken, Leviatano, calamaro colossale, serpente di mare (disegno provvisorio);
  - conchiglie (`docs/GEMINI-LOTTO-7.md`);
  - sfondo del menu iniziale (`art-inbox/menu_sfondo.jpg`).
- **Strumenti di prova da togliere più avanti** (il proprietario l'ha chiesto): 5 tocchi sulla versione in pausa, "+50.000 denti", Galleria di prova (`systems/gallery.ts`, `ui/galleryBar.ts`).
- **Feedback del 20 ottobre** (prova di tutte le bestie): lotti S ✅, T ✅, U ✅, V ✅, poi W timone e recinto, X mare, Y immagini (`docs/BACKLOG.md`).
- **Prossimi passi possibili:** correzioni del "Blocco 2" ancora aperte, Blocco 6 (cattura e combattimento, da progettare insieme), poi blocchi 7-10 (`docs/BACKLOG.md`).
- **Ultima pulizia:** v0.78.3 (19 ottobre), la prossima dopo altri 3 lotti.
- **Storia:** `docs/PROGRESS-ARCHIVIO.md` ha le sessioni fino all'11 ottobre; qui sotto il dettaglio dal 15 ottobre in poi.

## Lotto V, sonar, drone e cacce (20 ottobre 2026) → v0.82.0

- **Leggenda a riposo:** `WildBeast.resting`, messo da `finishBattle` per una bestia di caccia battuta e tolto da `spawnWild`. `sonarReadout` salta l'eco anomala della sua tana.
- **Echi sconosciuti:** `sonarScan.unknown` (chiave → specie), riempito da `stepScan` quando la specie non è vista. `nameSeenEchoes` (a ogni passo) mette il nome appena `seen` la contiene; `echoKnown` dice se un'eco è già riconosciuta.
- **Drone:** `startRecon(g, events, known)` ordina il giro (sconosciute, più lunghe, più vicine) prima di prendere le `RECON.maxBeasts`; `game.ts` passa `echoKnown`.
- Test `tests/lottoV.test.ts`. Nel browser non provato: serve una caccia avanzata con nave e sonar.

**Da provare sull'iPhone:** batti una leggenda di una caccia e guarda il sonar; analizza un'eco sconosciuta, poi vedi o cattura la specie; manda il drone dove il sonar ha un'eco grande sconosciuta.

## Correzione: nemico fino a poco sopra il menu (20 ottobre 2026) → v0.81.3

- **`stage.ts foeFloor(h, safeBottom)`:** il pavimento del nemico è l'altezza dello schermo meno area sicura, menu (`fit.menuPx` 172, misurato) e spazio (`fit.menuGapPx` 14).
- **Passaggio dei dati:** `BattleScene` lo calcola (`safeBottomPx` in `ui/dom.ts` misura la barra dell'iPhone con un elemento di prova) e lo passa alla vista (`BattleView.floor`). Da lì va a `battleSizes`, `battleSize`, `seenPresence`, `placePicture` e `fitSize` (parametro `floor`).
- `fit.foeLowest` (0,5) resta solo quando lo schermo non si misura.
- **Test:** `battleFraming` controlla il bordo basso del nemico ≤ altezza − menu − spazio per ogni schermo; i giri di `battleSizes` portati a 40.
- **Provato a 932×430:** Moby Dick contro Titano, il nemico più in basso e grande, con spazio sopra il menu.

## Correzione: giganti grandi sopra il menu (20 ottobre 2026) → v0.81.2

- **Il proprietario non voleva la v0.81.1:** i giganti erano stati rimpiccioliti. Voleva le grandezze della v0.81.0, solo spostate più su.
- **Ora il nemico:**
  - non scende mai sotto `fit.foeLowest` (0,54);
  - se è troppo alto esce **in alto**, tenendo `fit.foeKeepH` (0,68) in vista (`fitSize` divide per `foeKeepH`), e a destra con `foeKeepW`.
- `battleSizes` fa fino a 12 giri (con il taglio in alto la riduzione non è proporzionale).
- **Test `battleFraming`:** il nemico sopra `foeLowest`, almeno `foeKeepH` in vista; il bordo alto vale solo per la tua bestia.
- Provato a 932 e 667: Moby Dick contro Moby Dick (grandi, coda fuori in alto a destra), Orca Imperatrice di fronte (pinna tagliata in alto, muso intero).

## Correzione: nemico dietro al menu (20 ottobre 2026) → v0.81.1

- Il proprietario ha mandato una schermata: Moby Dick nemico coperto dal menu dei comandi. Lo permetteva il taglio in basso del lotto T (`foeKeepH`), che ho tolto: ora il nemico non scende mai sotto `fit.foeLowest` (0,52). Il menu comincia a 0,54 dell'altezza sul telefono più piccolo e a 0,60 sul più grande (misurato).
- **`ui/battle.css`:** comandi (36 px, Lotta 42) e mosse (48) più bassi.
- `battleFraming` controlla che il nemico finisca sopra `foeLowest`.

## Lotto U, in groppa (20 ottobre 2026) → v0.81.0

- **Dorso:** `scripts/body-shapes.ts` scrive `BODY_BACKS`, la linea del dorso per punto. Per ogni punto prende la cima delle colonne in una fascia di ±130 px al 75° percentile, così la pinna sottile resta fuori. `riderSeat` la usa (`backOfForm` in `beasts/forms.ts`, `beastsLayer.riderPose`).
- **Folgore:** `girth` applicato a ogni striscia (`beastView.update`), radice con scala uniforme: prima la scala non uniforme della radice deformava le strisce ruotate.
- **Profili:** foglio di tutti e 99. Lo squalo elefante aveva la testa a sinistra: `_flip` sui due profili in `art-inbox`. Elenco `PROFILE_FACING_CHECKED` in `data/battleFacing.ts`, imposto da `tests/lottoU.test.ts`.
- **Cavalcature:** `RIDEABLE_FORMS` in `data/beasts.ts` (`varano_nilo_albino_finale`, `pesce_spada_finale`, `tartaruga_preistorica`); `canRide` lo guarda. Pesce vela da "cavalcatura" a "compagno"; il polpo era già "supporto".
- **Grandezze:** `archelon.lengthM` 14, `tartaruga_liuto` 3, `SpeciesDef.finalSizeMult` (varano_nilo 3,5 → 8,75 m).
- **Battaglia:** `size.maxSeenRatio` 3 (prima cresce la piccola fino al suo spazio, poi cala la grande) e `minSeen` 0,22.
- Provato nel browser (galleria): Re Alfa con il sub alla base della pinna, Folgore che si curva in immersione senza deformarsi, Varano d'osso grande e cavalcabile con "Compagno".

**Da provare sull'iPhone:** in groppa agli squali e alle orche (dove sta il sub), Folgore su e giù, squalo elefante, le tre cavalcature nuove, una battaglia Moby Dick contro un pesce piccolo.

## Lotto T, battaglia (20 ottobre 2026) → v0.80.0

- **`systems/battle/stage.ts`:**
  - `placePicture('you')`: la cima tra `fit.youTop` (0,27, sotto la barra del nemico) e `fit.youBoxTop - youShowAbove × altezza` (0,83 e 0,6), così testa e dorso stanno sopra la barra;
  - il nemico può uscire a destra e in basso tenendo `fit.foeKeepW`/`foeKeepH` (0,72) in vista, sia in `fitSize` sia in `placePicture`.
- **`battleSizes`:**
  - confronta `seenPresence`, cioè la radice dell'area in vista, la tua sopra la barra (tolto `presence`);
  - rapporto = (lunghezza nemico / tua)^`size.lengthExponent` (0,6) × pictureMult;
  - il nemico ≤ tua × rapporto × `foeVsYours` (1); la tua ≤ nemico / rapporto × `smallerYours`;
  - mai sotto `minSeen` (0,16); qualche giro perché chi esce dallo schermo non si riduce in proporzione.
- `BATTLE_STAGE.framePictureMult` per immagine (`squalo_tigre_front: 0.8`).
- **CSS:** `.binfo.you` più piccola e più in basso.
- **Prototipo:** `?battaglia&nemico=…&mio=…&miofinale&miovariante=…&miounico=…`.
- **Versi:**
  - fogli di tutti i fronti e i retri; girati con `_flip` i fronti di folgore, megattera, megattera_finale, rana_pescatrice, orca_matriarca_finale, orca_preistorica_albina;
  - `data/battleFacing.ts` (199 chiavi) e il test che lo impone; procedura in `docs/ART.md`.
- **Scheda:** `evolutionOf` in `beasts/sheet.ts` aggiunge la forma finale (nome e `finalFormLevelOf`).
- **Test:** `battleFraming` riscritto alle regole nuove (nemico con la testa nella sua metà e al massimo un po' fuori; tua sopra la barra); `tests/lottoT.test.ts` (stessa forma, più lunga = più grande, nessuna sovrapposizione, versi, scheda).
- **Provato nel browser** a 844 e 667: bianco/bianco, Titano/bianco, mosasauro/pesce palla, Moby Dick/Moby Dick, Folgore/Saetta, dragone/dragone, Guscio/megalodonte, tigre/Orca Imperatrice.

**Da provare sull'iPhone:** battaglie con bestie di grandezze diverse, la tua bestia grande sopra la barra, i giganti nemici.

## Lotto S, correzioni rapide (20 ottobre 2026) → v0.79.0

- **Forme finali:** `PROGRESSION.finalFormOverWild: 18` al posto di `finalFormLevel`; `finalFormLevelOf(speciesId)` (`beasts/forms.ts`) = massimo selvatico della forma comune + 18, mai oltre 100. La usano `finalFormAt`, la crescita della grandezza (cresce fino al livello prima della forma finale, mai sotto 1) e la galleria.
- **Pausa:**
  - tolti "Rivedi l'inizio" (`replayIntro` e `story.resume`), Esporta e Importa (`importSave`, `onImport`, `exportSave`, `exportFileName`);
  - nel menu iniziale "Importa partita" (`importSlot` in `slots.ts`; `pickSaveFile` dà anche il nome del file).
- Tolto il tic (`SoundEngine.tap`, `AUDIO.tap`).
- **Leva del gas:** la corsa è letta dalla leva vera (`travel` in `helmGauges.ts`); era fissa a 150 px da quando nel lotto O la leva è diventata alta 128.
- **Scheda:** la riga delle evoluzioni ha la sua classe `.sheet-evo-line` (prendeva lo stile assoluto dei pallini `.sheet-evo`).
- **Carta nautica:** tolti i segni `den` e `target` (`systems/chart.ts`, `ui/instruments.ts`).
- **Galleria:**
  - fuga sempre riuscita;
  - `TitleScene.openGallery` carica tutte le immagini di profilo prima di partire;
  - fuori le specie senza immagini (98 forme). In mare quelle specie già non uscivano: le zone usano solo bestie con immagini, c'è un test.
- Test `tests/lottoS.test.ts` e import in `tests/slots.test.ts`. Provato nel browser: pausa, Importa, scheda di Zanna, Dunkleosteus in mare con la sua immagine, fuga, leva (corsa 128 px).
- Il browser di prova aveva perso tutte le partite per conto suo (cancellata anche l'impostazione delle prove, che il gioco non tocca): non è il gioco.

**Da provare sull'iPhone:** pausa; Carica partita → Importa partita con un file esportato prima; leva del gas al massimo; scheda di una bestia con evoluzioni; carta nautica in plancia; galleria con fuga e Dunkleosteus.

## Pulizia (19 ottobre 2026) → v0.78.3

- Tolto `export` da 128 nomi usati solo nel loro file (`systems/`, `ui/`, `views/`, `scenes/`; `data/` intatto).
- Tolti da `ui/ui.css` gli stili morti: vecchio minigioco di domatura, barra del boss, riga delle mosse, vecchie statistiche della scheda.
- `ui/helmControls.ts` a 300 righe: riga degli strumenti ed etichetta della luce in `ui/helmGauges.ts` (test `tests/helmGauges.test.ts`).
- **Documenti:**
  - `PROGRESS.md` con "Dove siamo" in cima; le sessioni fino all'11 ottobre in `PROGRESS-ARCHIVIO.md` (citato in `CLAUDE.md`);
  - `ARCHITECTURE.md` aggiornato (audio del porto, `helmGauges`);
  - `BACKLOG.md`: 4 voci del Blocco 2 verificate nel codice e segnate fatte.
- `package-lock.json` riallineato alla versione (era fermo a 0.64.3).

## Lotto Q, compagno in battaglia nella galleria (19 ottobre 2026) → v0.78.2

- `gallery.ts` `fightWithIt`: la forma entra in squadra per prima (è lei che scende in campo) e affronta una selvatica della stessa forma; pulsante "In battaglia". Provato col tricheco a 667 px: retro del tuo, fronte del selvatico, barra a 6 pulsanti dentro lo schermo.

## Lotto Q, in groppa nella galleria (19 ottobre 2026) → v0.78.1

- `gallery.ts` `rideIt`: come Compagno ma con `callMount(..., true)`, quindi si cavalca anche una bestia col ruolo compagno. Pulsante "In groppa" in `galleryBar.ts`. Provato sul pesce spada.

## Lotto Q, galleria di prova (19 ottobre 2026) → v0.78.0

- **`systems/gallery.ts`:**
  - `galleryForms()`: bestiario + alfa con immagini + uniche con sprite, 102 forme;
  - `galleryLevel`: forma finale al livello della forma finale, le altre al massimo dei livelli selvatici;
  - `setUpGallery`: in acqua nella baia, Titano liv. 100, niente storia;
  - `showInSea` (calma `GALLERY.calmSeconds`), `fightIt` (`requestBattle`), `makeCompanion` (al posto del compagno precedente, chiamato con `input.summon`: arriva già cavalcato).
- **`session.gallery`:**
  - `TitleScene` la avvia senza partita (`slotId` vuoto: `WorldScene.save` non scrive);
  - `UIScene` monta `ui/galleryBar.ts`;
  - `WorldScene` riceve `gallery` e cura la squadra a fine battaglia.
- Numeri in `GALLERY` (`data/beasts.ts`). Da togliere con gli altri strumenti di prova.
- Provato nel browser: orca matriarca in mare (col suo branco) e in battaglia, orca come compagno cavalcata, Esci, elenco delle partite identico.

**Da provare sull'iPhone:** menu iniziale → Galleria di prova (le prove devono essere attive); scorrere le bestie, provare i tre pulsanti.

## Lotto R, immagini dall'orca in giù (19 ottobre 2026) → v0.77.1

- 78 immagini nuove da `asset animali ai/` (solo quelle del 19 ottobre, riconosciute per data e una per una) copiate in `art-inbox/` coi nomi del gioco; le 78 sostituite restano come `_vecchia_…`.
- Stessi versi delle vecchie (`_flip` dove c'era). Controllate su fogli di confronto: nemico in battaglia rivolto a sinistra, retro verso destra, bocca aperta e chiusa sovrapponibili.
- **`scripts/art.ts`:**
  - tolte le correzioni fatte per le immagini vecchie (cancellature dello squalo bianco e del volpe, gola del martello, vignetta del martello preistorico), che avrebbero tagliato le nuove;
  - `orca_side`: cancellato il fantasma sfocato di una seconda pinna, seguendo il bordo della pinna vera;
  - `eraseRects` accetta un quinto numero (soglia di trasparenza).
- Restano le immagini vecchie per: albino (profili e retro), rana pescatrice alfa (fronte e profili), card di tutte.
- Il fronte dello squalo bianco nuovo è più chiaro (grigio sabbia) dei suoi profili: da guardare in battaglia.

## Lotto R, menu iniziale e partite (19 ottobre 2026) → v0.77.0

- **Perché:** il proprietario ha trovato i salvataggi spariti senza avviso. Col vecchio sistema c'era una partita sola più una copia: due "Nuova partita" di fila cancellavano la vera. Un salvataggio illeggibile finiva in una copia nascosta e veniva sovrascritto da una partita nuova. Il codice dei salvataggi non era cambiato nei lotti recenti: la causa esatta non è certa.
- **`systems/save/slots.ts`:** elenco `leviatano-partite` + una chiave `leviatano-partita-<id>` per partita. `migrateLegacySaves` sposta una volta `leviatano-save`, `-precedente` e `-rotto-*`, togliendo le vecchie chiavi solo dopo la copia. `markBroken`: non si scrive mai sopra. Tolto `storage.ts`.
- **`TitleScene` + `ui/titleMenu.ts`:** Boot apre il menu; World legge `session.startSave` e salva su `session.slotId`; la pausa ha "Menu iniziale" (`toTitle`: salva e ricarica la pagina).
- **Sfondo:** `art-inbox/menu_sfondo.jpg` → `npm run art` → `public/ui/menu_sfondo.webp` (intero, 1920); finché manca, `bg/tana_far.webp`.
- **Fucile:** `DiverState.faceHold` (`DIVER.aimHoldSeconds` 0,6 s): dopo uno sparo, o mentre si mira tenendo il pulsante, il joystick non rigira il sub.
- **Orizzontale:** `main.ts` nell'app dalla Home misura lo schermo intero (`screen`) e mette `--app-h` sui livelli a schermo intero (`style.css`). Non provato su iPhone vero.
- Test `tests/slots.test.ts`, `tests/lottoR.test.ts`. Provato nel browser: spostamento del vecchio salvataggio, nuova partita che non tocca l'altra, partita rotta non aperta e non sovrascritta, pausa con "Menu iniziale", elenco a 667 e 844 pixel.

**Da provare sull'iPhone:** aprire il gioco già in orizzontale; vedere "Partita 1" nell'elenco; nuova partita e ritorno alla prima; rinomina; sparare all'indietro nuotando.

**Prossimo:** immagini dall'orca in giù (v0.77.1), poi lotto Q.

## Lotto P, suoni (19 ottobre 2026) → v0.76.0

- **`audio/seaMusic.ts`:** lo stesso motore suona due brani: `SEA_MUSIC` (mare aperto) e il nuovo `PORT_MUSIC` (`data/music.ts`, fa maggiore, senza tamburo, eco corta).
- **`SoundEngine.menus('pause'|'port'|null)`:** motori e pioggia sfumano, il mare scende a `AUDIO.menuSea`, al porto parte la sua musica; `UIScene` lo chiama aprendo e chiudendo i menu (prima c'era `silence()`).
- **`SoundEngine.tap()`:** tic per ogni `button` premuto (ascolto su tutto il documento in `UIScene`), esclusi `.act` e le frecce del timone.
- **Numeri:** `AUDIO.menuSea/menuFade/tap`, ping del sonar 0,07, bip del radar 1500 Hz e 0,045, `SHIP.radar` beepFar 1,4 e beepNear 0,3. Il radar taceva già sotto i 4 nodi.
- Test `tests/lottoP.test.ts`. Provato nel browser: porto e pausa cambiano lo stato del suono, il tic parte sui pulsanti dei menu e non su Scatto.

**Da provare sull'iPhone (con l'audio acceso):** aprire e chiudere pausa e porto, ascoltare la musica del porto, toccare i pulsanti dei menu, avvicinarsi a un molo con la nave.

**Prossimo:** lotto Q (galleria di prova delle bestie).

## Lotto O, comandi (19 ottobre 2026) → v0.75.1

- **`ui/helm.css`:**
  - leve 38×128, frecce 46, pulsanti 11 px su una riga, motore e Cockpit 30 px, barre in alto 96 px;
  - `.helm-buttons` parte a 70 px (sotto il sonar), sempre 3 per colonna (tolta la regola dei 5);
  - il sonar è una riga sola larga al massimo 320 px; la riga del timone sta su una linea con i puntini se è lunga.
- **`helmControls.ts`:** tolto "scafo" dalla riga centrale (c'è la barra con la chiave).
- **`battleUi.ts`:** "Doma" senza il numero.
- Provato nel browser a 667 e 844 pixel col Nightmare a portelloni aperti e sonar acceso.

**Da provare sull'iPhone:** il timone di ogni nave, soprattutto Nightmare e U-Boat, con portelloni aperti e sonar acceso.

**Prossimo:** lotto P (suoni).

## Lotto L, acqua e salto (19 ottobre 2026) → v0.75.0

- **Superficie** (`systems/breach.ts`):
  - `surfaceWater`: una molla e un freno tra la riga di nuoto e il pelo dell'acqua;
  - `upPushShare`: la spinta verso l'alto cala al 50% in superficie;
  - `leaveWater`: esce oltre il pelo dell'acqua, con la velocità limitata a `maxLeapSpeed`;
  - `stepAirborne`: in aria, gravità e nessun comando.
  - Numeri in `RIDE_BREACH`: molla 7, freno 1,2, gravità 130, spruzzo da 45.
  - Tolta la soglia dell'110% e il "muro" di `rideTop`.
  - `moveBody(..., surface = false)` per la bestia cavalcata (`tileMap.ts`).
- **Scafo** (`hull.ts`):
  - `HullPart.link`: i cerchi della nave formano una capsula liscia (`ship/geometry.ts`);
  - con `under` (solo la bestia cavalcata) chi è dentro lo scafo esce sotto la chiglia;
  - in volo niente spinta della nave (`game.ts`).
- **Ricaduta:** spruzzo proporzionato, niente `rig.shake` (`worldEvents.ts`).
- **Test:**
  - `tests/lottoL.test.ts`: altezze per piano, velocità normale, sprint e scatto; la quiete in superficie; scafo liscio; uscita sotto la chiglia;
  - `lottoJ` aggiornato.

**Da provare sull'iPhone:**
- in groppa salire piano, a velocità normale, con sprint e con scatto;
- saltare accanto alla nave e sopra la nave;
- una bestia enorme spinta contro la chiglia.

**Prossimo:** lotto O (comandi).

## Lotti M+N, bestiario e immagini (19 ottobre 2026) → v0.74.2

- **Alfa:** `hasAlfaArt` e `withOwnArt` (`beasts/forms.ts`).
  - `rollWildForm` e `luredForm` danno un alfa solo con immagini proprie.
  - `convert.ts` riporta a comuni gli alfa e gli albini senza immagini.
  - `rareAlphas` usa `hasAlfaArt`.
- **Bestiario:** la casella mostra l'immagine di `artKeysOf` (anche quella presa in prestito da un'evoluzione).
- **Manta finale:** `WING_FRAME_FORMS` (`data/beasts.ts`): in `beastView` le due immagini si alternano col nuoto.
- **Immagini** (`art-inbox`; le scartate sono `_scartata_*`):
  - manta di prima;
  - `delfino_front_flip`;
  - card del coccodrillo albino di prima;
  - `megattera_finale_side_open` dal proprietario;
  - scorfano: `SIDE_ERASE` nuovo; con zone cancellate lo script tiene solo il pezzo più grande (soglia 90).
- **Test:** `lottoI` (alfa), `lottoG` (esca pregiata).

**Da provare sull'iPhone:**
- la manta e la manta finale in acqua;
- il delfino in battaglia;
- lo scorfano;
- il bestiario (Rocciaguscio);
- lo squalo martello alfa diventato normale.

**Prossimo:** lotto L (acqua e salto).

## Pulizia dopo i lotti A-K (19 ottobre 2026) → v0.74.1

- **Codice morto tolto:**
  - `MOVE_RULES`, `MOVE_POWER`, `SEA_END_KM`, `TAMING` (il vecchio minigioco), `Rect`, `clarityZone`, `isBigClass`;
  - `useItemOn` e il suo parametro `uid` in `useItem` (le cure su una bestia scelta passano da `useOnBeast`).
- **Doppioni uniti:**
  - `speciesStages` (`beasts/bestiaryEntries.ts`) fa da base all'`evolutionLine` delle icone e a `stageLine` (`sheet.ts`, prima anch'esso `evolutionLine`);
  - `seaMovesOf(form, level)` (`team.ts`) sostituisce `movesFor` ed è usata dalla scheda.
- **File divisi** (solo spostamenti, nessun cambio di comportamento):

  | Prima | Ora |
  |---|---|
  | `WorldScene` 457 righe | `WorldScene` 228 + `worldViews` + `worldEvents` |
  | `ship.ts` | `ship.ts` + `sail.ts` |
  | `shipView` | `shipView` + `shipWake` |
  | `eventMessages` | `eventMessages` + `vehicleMessages` |
  | `battle.ts` | `battle.ts` + `tameFlee.ts` |
  | `saveData` | `saveData` + `vehicleSave` |
  | `game.ts` | `game.ts` + `playerActions` |
  | `ship/stats` | `stats` + `bayStats` + `statRow` |

  Restano tra 302 e 316 righe: `helmControls`, `gadgets`, `birds`, `battleView`, `battleUi`.
- **`docs/ARCHITECTURE.md`:** aggiornato con tutti i file nuovi dei lotti e della pulizia.
- **Controlli:** `npm run check` verde, 1493 test come prima. Prova nel browser (avvio, porto con tutte le schede, battaglia con la Conchiglia del Re) senza errori.

**Prossimo:**
- il blocco 6 (cattura e combattimento);
- le immagini dall'orca in giù, quando ci sono;
- gli strumenti di prova da togliere più avanti.

## Lotto K, i consigli di Aurelio (19 ottobre 2026) → v0.74.0

- **Dati** (`data/story.ts`): 9 dialoghi `tip*` in `DIALOGUES`, e `TIPS` (titolo + evento che li apre) con `TIPS_OFF`.
- **Logica:** `systems/tips.ts`:
  - `stepTips`, dopo `stepStory` in `game.ts`: un consiglio la prima volta, solo da `toPortoFango` in poi, mai con un altro dialogo aperto;
  - `setTipsOn` / `tipsOn`.
  - Le partite senza salvataggio (test, strumenti) partono coi consigli spenti; `startNewGame` li riaccende.
- **Guida:** `ui/guide.ts`, pulsante nel menu di pausa, CSS in `screens.css`.
- **Test:** `tests/lottoK.test.ts`.

**Da provare sull'iPhone:**
- la Guida nel menu di pausa;
- salire sulla nave, sentire una voce in un porto, calare il sottomarino: compare il consiglio, una volta sola.

**Fatti tutti i lotti del 16 ottobre (G-K).** Prossimo: la sessione di pulizia (rimasta indietro), poi il blocco 6 e il resto delle immagini (dall'orca in giù).

## Lotto J, salto fuori dall'acqua (19 ottobre 2026) → v0.73.0

- **Salto:** `systems/breach.ts`:
  - `tryBreach` alla superficie in `stepDiver`, con la soglia `RIDE_BREACH.minUpShare` 1,1, cioè solo con sprint o scatto;
  - `stepAirborne`: gravità, nessun comando;
  - `DiverState.airborne`, non salvato.
- **Dati:** `RIDE_BREACH` in `data/beasts.ts`.
- **Eventi:** `breach`, `breachSplash`, `birdEaten`, con gli spruzzi in `WorldScene.handleEvents`.
- **Gabbiani:** `eatBirdsNear` (`systems/birds.ts`), chiamata da `WorldScene` in volo; `mountAteBird` (`beastPlay.ts`) cura la bestia dell'8%.
- **Telecamera:** in volo `cameraAim` alza `minY` e guarda un po' sopra la bestia.
- **Test:** `tests/lottoJ.test.ts`.

**Da provare sull'iPhone:**
- in groppa a uno squalo, tenere lo sprint verso l'alto fino alla superficie, poi provare anche con lo scatto;
- vicino a uno stormo di gabbiani (sopra i banchi di pesce, col bel tempo), prenderne uno al volo.

**Prossimo:** lotto K (tutorial).

## Lotto I, bestiario e squadra (19 ottobre 2026) → v0.72.0

- **Bestiario:** `systems/beasts/bestiaryEntries.ts`.
  - `bestiaryEntries`: specie + albino + forme finali con immagini proprie, in fila.
  - `entryState` e `countsFor`, per forma.
  - `rareAlphas`: solo alfa con immagini (`<id>_alfa` o `alfaArt`).
  - `evolutionLine` e `knowsForm`.
  - `ui/bestiary.ts` le usa; `rareVersions.ts` resta per gli alfa.
- **Scheda:** `evolutionIcons` in `ui/beastSheet.ts` (`SheetExtra.known`), CSS `.sheet-evo`.
- **Niente alone:** tolti l'ellisse, le scintille e `glowSpots` delle bestie (`views/beastsLayer.ts`, `WorldScene.ts`).
- **Stiva:**
  - `ShipModelDef.hold` (`data/fleet.ts`, nella card del cantiere);
  - `TeamBeast.aboard` (salvato);
  - `systems/beasts/hold.ts` (`placeOf`, `holdRoom`, `reachable`, `cannotMove`, `moveBeast`);
  - `addTamed(all, b, holdRoom)`;
  - `renderTeamPanel(…, 'dive' | 'ship' | 'port')`;
  - tolto `toggleInTeam`.
  - Nei salvataggi vecchi la riserva è al Recinto.
- **Test:** `tests/lottoI.test.ts`; aggiornati beasts, lottoC, lottoF2.

**Da provare sull'iPhone:**
- il bestiario (squalo, albino, Titano in fila);
- una scheda con le icone delle evoluzioni;
- il menu in acqua (solo la squadra);
- la plancia (squadra e stiva);
- il Recinto al porto;
- una bestia rara in acqua, senza alone.

**Prossimo:** lotto J (salto fuori dall'acqua cavalcando, uccelli), poi K (tutorial).

## Lotto G+H, porto a schede e bacheca nuova (16 ottobre 2026) → v0.71.0

- **Schede** (`ui/portMenu.ts`):
  - Bacheca → `ui/portBoard.ts` (Ricercati da `rumoursAt`, ombre per le cacce lontane non sentite, taglie con `setArt`, incarichi);
  - Mercato col listino;
  - Conchiglie, Cure, Esche, Sub → `ui/portShop.ts` (scaffali in `SHOP`, `data/economy.ts`);
  - Mezzi → `ui/portVehicles.ts` (carburante + `buyFuelAll`, riparazioni `systems/economy/repair.ts`, ricambi e cantiere a Porto Fango);
  - Zaino;
  - Recinto.
  - `portSubs.ts` tolto.
- **Conchiglie:** `ItemDef.shell`, `maxOwned` e `tint`; `SHELL_ITEMS` e `shellsOwned` in `economy/items.ts`; `Action.tame.shell`, con la scelta della conchiglia in `battleUi.ts`.
  - L'arpione mitico e `mythicStock` sono tolti; nel salvataggio diventano una `conchiglia_re` (`harpoonToShell` in `gearSave.ts`).
  - Tolto anche il vecchio `tameMult`.
- **Esche:** `BAIT_GROUPS` e `FINE_BAIT` (`data/world.ts`); `ItemDef.lure` è ora il gruppo, `rare` la probabilità; `beasts/lure.ts` `luredForm` in `encounters.ts`.
- **Test:** `tests/lottoG.test.ts`; aggiornati economy, items e hull5c.
- **Immagini delle conchiglie:** `docs/GEMINI-LOTTO-7.md`.

**Da provare sull'iPhone:**
- ogni scheda del porto;
- una card dei Ricercati e una in ombra;
- una taglia;
- in battaglia, la scelta della conchiglia;
- un'esca pregiata in acqua;
- la riparazione del sottomarino o della barca.

**Prossimo:** lotto I (bestiario e squadra), poi J (salto fuori dall'acqua), K (tutorial). Vedi `docs/BACKLOG.md`, "Feedback del 16 ottobre".

## Varano albino (15 ottobre 2026) → v0.70.2

- Immagini complete del varano albino (profilo, bocca aperta, fronte, retro, card) dal proprietario: compare in mare e cresce nel Varano d'osso. Il lotto Gemini 6 è fatto.
- Le immagini vecchie sono in `art-inbox/_vecchia_varano_nilo_albino_*`.

## Correzioni al lotto F (15 ottobre 2026) → v0.70.1

- **Squalo mako:** `squalo_pinna_nera` diventa `squalo_mako`.
  - I salvataggi lo convertono (`RENAMED_SPECIES` in `save/saveData.ts`).
- **Forme finali di alfa e albini** (`hasFinalForm` in `beasts/forms.ts`):
  - nuovo campo `alfaFinalFormName`: lo squalo bianco ha il "Re Alfa" (`squalo_bianco_alfa_finale`, lo squalo scuro corazzato);
  - il Titano (`squalo_bianco_finale`) ha di nuovo le immagini di prima;
  - `albinoFinalFormName` vale anche per una specie non iconica: il varano albino diventa il "Varano d'osso" (`varano_nilo_albino_finale`, il coccodrillo d'osso).
  - Il bestiario mostra il Varano d'osso solo quando il varano albino è in mare.
- **Capodoglio finale:** "Moby Dick". Il Leviatano si decide quando riprende la storia.
- **Varano albino:** profilo, bocca aperta e fronte sono in `art-inbox`. Card e retro da generare: `docs/GEMINI-LOTTO-6.md`.
- **Script delle immagini:**
  - basta metà del bordo verde per riconoscere il fondo verde;
  - `SIDE_ERASE` toglie il fondale scuro sotto il varano albino.
- **Test:** `tests/lottoF2.test.ts`.

## Lotto F, prima parte: immagini e bestie nuove (15 ottobre 2026) → v0.70.0

- **Immagini rifatte su fondo verde** (`asset animali ai/`, dall'alto fino all'orca esclusa): 17 bestie.
  - Le immagini vecchie sono in `art-inbox/_vecchia_*`.
- **Bestie nuove dal Desktop "nuovi animali"** (gli originali restano lì):
  - 9 specie comuni (lampuga, pesce_sega, tartaruga_liuto, squalo_balena, squalo_elefante, squalo_pinna_nera, squalo_toro, squalo_leuca, foca_comune) e il plesiosauro;
  - per ognuna: dati, mosse, mosse da imparare, comparse (`WILD_SPAWNS`, `BIOMES`), pericolo, profondità, carattere, velocità in groppa.
- **Squali:**
  - squalo toro = sand tiger (bruno, denti in fuori);
  - squalo leuca = bull shark (grigio, tozzo);
  - squalo pinna nera = quello snello.
- **Cacce nuove:** `caccia_plesiosauro` (Mare blu, nebbia, 120 m) e `caccia_mosasauro` (Grandi fosse, tempesta, 180 m).
- **Forme finali** (`<id>_finale`): megattera, capodoglio, coccodrillo marino, manta, squalo martello, pesce spada (`iconic` nuovo).
  - `squalo_bianco_finale` = lo squalo scuro corazzato.
  - Il megalodonte = lo squalo bianco d'osso della prova dei video.
- **Script delle immagini:** `cutGreenScreen` (`scripts/art/cutout.ts`) toglie anche il verde spento e la striscia sul bordo di alcune immagini.
- **Test:** `tests/lottoF.test.ts`.

**Da provare sull'iPhone:**
- il bestiario e le card nuove;
- squali nuovi nella Baia, nella Barriera e nel Delta;
- lo squalo balena e lo squalo elefante in groppa;
- le cacce del plesiosauro e del mosasauro (le voci nei porti).

**Resto del lotto F:** il proprietario rifà le immagini dall'orca in giù.

## Lotto E, soldi ed economia (15 ottobre 2026) → v0.69.0

- **Mercato:**
  - `economy/market.ts` (`MARKET_RULES` saturazione 120, minimo 0,3, recupero 4 al minuto in tempo reale; `gear.market` salvato);
  - via `BAG` e l'evento `bagFull`;
  - sardina 2.
- **Missioni:**
  - ricompense alzate, `repeat` (tornano in bacheca);
  - `BOUNTIES` per specie (obiettivo `exhaust`, cioè battaglia vinta);
  - `MAX_ACTIVE_MISSIONS` 4.
- **Vendita delle bestie:** `economy/beastSale.ts` (`BEAST_SALE`) e pulsante "Vendi" nel Recinto del porto (`renderTeamPanel(..., atPort)`).
- **Tesori:** `REGION_CHESTS.teethBase` 400, forzieri della costa ×3.
- **Test:** `tests/lottoE.test.ts`; aggiornati block2 ed economy.

**Da provare sull'iPhone:**
- una pesca lunga, poi la vendita (due volte di fila: la seconda paga meno);
- la bacheca (taglie dopo le spedizioni);
- la vendita di una bestia in riserva.

**Lotto F** (immagini nuove): quando il proprietario avrà tutte le immagini.

## Lotto D, luci degli U-Boat (15 ottobre 2026) → v0.68.0

- **Livello luminoso:** `cameraRig.layers.glow` con la sua telecamera (`glowCam`), disegnato dopo la maschera del buio. Ci vanno le immagini `_glow` (`ShipPictures`, `SubmarineView`) e i bagliori di drone e sfera (`NightmareView`).
- **Fari:**
  - `floodlightM` nei modelli (nave e sottomarino);
  - `systems/ship/floodlight.ts`: `floodSpots` (tre punti lungo lo scafo), `subFloodSpots`;
  - ridotti dalla torbidità (`FLOOD_MURK` 0,6).
- **Luci della nave:** `shipView.glowSpots` non si spengono più con l'immersione.
- **Drone e sfera:** raggio di luce 70 e 1,8 × la sfera.
- **Manta:** tolto `FLAP` e `flapScale`.
- **Test:** `tests/floodlight.test.ts`. Nel browser, a 300 m col Nightmare, la luminosità media intorno alla nave passa da 14 (senza fari) a 31.

**Da provare sull'iPhone:**
- Nightmare a 100 e 300 m, fermo e in moto;
- le rune rosse al buio;
- drone e sfera fuori;
- il sottomarino imperiale.

**Prossimo:** lotto E (soldi ed economia).

## Lotto C, schermate e comandi (15 ottobre 2026) → v0.67.0

- **Sonar e cockpit:**
  - `.helm-sonar` e `.sonar-status` a due righe fisse;
  - pulsanti del motore corti e `nowrap`;
  - `.port-top` non va a capo.
- **Diario e missioni:**
  - `huntDiary.openSheet` dentro `#ui`, `.diary-sheet` tra le eccezioni di `#ui.in-port`, testata appiccicata in alto;
  - `ui/missionList.ts` (Diario del cockpit e pausa).
- **Drone:** `recon.reportAge` + `RECON.reportSeconds` (180); `ui/reconPopup.ts` su `reconDone` (in `UIScene`).
- **Mezzi e carta:**
  - `ship/ownMarks.ts` (mezzi propri), disegnati in `sonarScreen`;
  - `chart` con `boat`; icone della carta allineate (`instruments.chartStrip`).
- **Avamposti:** `OUTPOST_SIGHT` 3000.
- **Audio:** sblocco su tutti i tocchi con buffer muto, ripresa su `visibilitychange`/`pageshow`/`focus`, `latencyHint: 'playback'`, `navigator.audioSession.type = 'playback'`.
- **Starter:** `100dvh`, media `max-height: 430px`, scelta anche su `pointerup`; `chooseStarter` rifiuta la seconda scelta.
- **Bestiario e squadra:**
  - `beasts/rareVersions.ts`;
  - `swapInTeam` e trascinamento in `beastUi.dragSlot`.
- **Test:** `tests/lottoC.test.ts`.

**Da provare sull'iPhone:**
- l'audio all'avvio e dopo essere uscito e rientrato;
- il sonar mentre cambiano gli echi;
- "Adagio";
- una leggenda nel Diario;
- le missioni nel cockpit;
- la ricognizione del Nightmare;
- i mezzi sul sonar;
- la carta nautica;
- il trascinamento delle sfere.

**Su Android:** la scelta dello starter.

**Prossimo:** lotto D (luci degli U-Boat).

## Lotto B, bestie in mare (15 ottobre 2026) → v0.66.0

- **Pattuglia** (`beasts/patrol.ts`, dati `PATROL`):
  - `startPatrol` alla vista (aggressivi grandi o colossali, probabilità 0,65, 1–3 passaggi);
  - `stepPatrol` (pass/wait/bolt, uscita accelerata, attesa 1–2 s, rientro dallo stesso lato, virata in vista 0,25);
  - poi `charging` (carica ×1,4);
  - `roam.ts` riceve `view`; durante la pattuglia non perde la bestia e non c'è contatto.
- **Sardine** (`fish.ts`):
  - schivata di lato rispetto alla direzione del banco, isteresi `calmFactor`;
  - il banco fermo su di te riparte oltre, mete preferite davanti;
  - `Threat.r` (sottomarino, cavalcatura).
- **Arpione:** controllo sul tratto (`toSegment`), `catchRadius` 9, `assistAim` (6°).
- **Movimento del corpo** (`views/swimPose.ts`, logica pura usata da `beastView`):
  - serpenti (`SERPENTS`, `serpentWave`);
  - ali battenti (`FLAP.manta`, `flapScale`);
  - `swimLook(form)` in `forms.ts`.
- **Cavalcature:** `RIDE_KMH` per specie, velocità = squalo bianco × √(km/h ÷ 40), mai sotto quella del sub (`beastPlay.mountSpeed`).
- **Bilanciamento:**
  - `tests/balance.test.ts`: 200 battaglie per 5 specie, specchio, intorno al 50%;
  - l'imboscata (`ambush` in `encounters.ts`) solo alle spalle.
- **Immagini:** squalo volpe da rifare, `docs/GEMINI-LOTTO-5.md`.

**Da provare sull'iPhone:**
- uno squalo bianco o tigre nella Baia;
- un banco di sardine da fermo e col sottomarino;
- l'arpione sui pesci;
- Folgore in acqua e in groppa;
- una manta;
- le velocità a cavallo.

**Prossimo:** lotto C (schermate e comandi).

## Lotto A, bug e progressione (15 ottobre 2026) → v0.65.0

Il feedback del 15 ottobre è diviso in lotti A–F in `docs/BACKLOG.md`.

**Fatto in questo lotto:**
- **Esperienza:** `XP_RULES.fishYield` 6, `fishPerMinute` 2 (budget in `timers.fishXp`), `battleMult` 0,6 (in `xpReward`). I pesci presi non danno più esperienza (`game.ts`).
- **Sconfitta e vasca:**
  - `blackout`: KO → 1 PV, nessuna cura;
  - Aurelia `pool` 1;
  - `HelmInfo.pool` ("vasca: …") e testo nel Recinto.
- **Stessa bestia:**
  - `residentForm(r)` (versione e livello dal seme dell'id) usato in `wakeResident`, nel sonar e nel tracking;
  - `WildBeast.serial` con `wildTarget`/`isTarget` (`tracking.ts`), usati da tracker, drone, cacce e sonar (`targetKey` con il serial).
- **Battaglie:** `battleResult` segna come viste le bestie combattute.
- **Tane:** leggende sconfitte e bestie delle cacce restano nella tana `HUNT_RULES.legendReturnSeconds` (1200 s). `legendsGone` dei vecchi salvataggi viene ignorato.
- **Immagini:** `neededSpriteKeys` include le specie delle cacce.
- **Mezzi rotti:**
  - via `wreckTeethLoss`;
  - niente riparazione nella stiva (`hatch.ts`, `vehicles.ts`);
  - `repairPerPoint` sottomarino 5, motoscafo 4.
- **Rarità:** `ENDLESS.residents.rarityWeight` per stelle.
- **Test:** `tests/lottoA.test.ts`; aggiornati starter, pokemonGrowth, block2, legends, krill, sonar5a, submarine, fixes11.

**Da provare sull'iPhone:**
- nuova partita: lo starter dopo un po' di gioco;
- perdi una battaglia, poi la vasca;
- il tracker su una bestia rara;
- la tana del megalodonte;
- un mezzo rotto e il porto.

**Prossimo:** lotto B (bestie in mare), in Plan mode.
