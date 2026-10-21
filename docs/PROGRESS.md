# Progressi

## Dove siamo (aggiornato il 21 ottobre 2026, v0.88.0)

- **Gioco:** mare in tre zone (baia, Delta, mare aperto infinito), 34 bestie con albini, alfa, forme finali e uniche, battaglie a turni con mosse e domatura, flotta (navi, sottomarini, motoscafi), porti con bacheca, mercato, cantiere, riparazioni, sonar e cacce, meteo, suoni e musiche.
- **Salvataggi:** menu iniziale con più partite (`systems/save/slots.ts`); una partita illeggibile non si sovrascrive mai. Dire sempre al proprietario quando un lotto tocca i salvataggi.
- **Immagini:** quasi tutte le bestie hanno card, profili, fronte e retro. Mancano:
  - Kraken, Leviatano, calamaro colossale, serpente di mare (disegno provvisorio);
  - conchiglie (`docs/GEMINI-LOTTO-7.md`);
  - sfondo del menu iniziale (`art-inbox/menu_sfondo.jpg`).
- **Strumenti di prova da togliere più avanti** (il proprietario l'ha chiesto): 5 tocchi sulla versione in pausa, "+50.000 denti", Galleria di prova (`systems/gallery.ts`, `ui/galleryBar.ts`).
- **Feedback del 20 ottobre** (prova di tutte le bestie): fatto tutto, lotti S–Z e Y. Aspetto le immagini di `docs/GEMINI-LOTTO-8.md` (19 da rifare) e quelle del Leviatano (le dà il proprietario: ricordarglielo).
- **Prossimi passi possibili:** correzioni del "Blocco 2" ancora aperte, Blocco 6 (cattura e combattimento, da progettare insieme), poi blocchi 7-10 (`docs/BACKLOG.md`).
- **Ultima pulizia:** v0.86.1 (20 ottobre), la prossima dopo altri 3 lotti. La galleria e gli strumenti di prova restano finché il proprietario prova.
- **Storia:** `docs/PROGRESS-ARCHIVIO.md` ha le sessioni fino al 19 ottobre; qui sotto il dettaglio del 20 ottobre.

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

## Lotto AA, acqua sulle bestie, gabbiani, giganti più lenti (20 ottobre 2026) → v0.87.0

- **Linea dell'acqua:** `views/surfaceOver.ts` (nuovo), in `worldViews` davanti alle bestie e al sub.
  - Per la bestia cavalcata e per le selvatiche vicine alla superficie prende le colonne del corpo (`bodyCircles`).
  - Sotto la linea delle onde (`seaHeight`) stende un velo del colore dell'acqua a quella profondità; sulla linea traccia una riga chiara.
  - Il velo cresce man mano che il corpo esce dall'acqua (`fadeOut`).
  - I numeri sono in `SEA.bodyWater`.
  - **Nuovo modo di provare:** `renderer.snapshot` più un piccolo server locale che riceve l'immagine (`node scripts/snap-server.mjs <cartella>`). Così si vedono le foto anche con il pannello del browser nascosto.
  - Provato in groppa al megalodonte con il mare calmo e in tempesta.
- **Gabbiani:**
  - `mountAteBird` apre la bocca (`RIDE_BREACH.birdJawSeconds`) e mette il gabbiano in sacca e nelle catture;
  - `snapGulls` apre la bocca già quando un uccello è vicino (`birdNear`);
  - `FISH` ha `gabbiano` (30 denti, `bird: true`).
- **Giganti in battaglia:**
  - `giantDrift` diventa `{ farShare: 0.55, period: 18 }`;
  - `foeCut` considera il gigante fermo sulla sua piattaforma, con l'immagine che rimpicciolisce attorno al punto d'appoggio;
  - in `battleView` la piattaforma usa la grandezza piena;
  - provato con una foto: da lontano Moby Dick si vede tutto.
- **Test:** `tests/lottoAA.test.ts` e `tests/lottoZ.test.ts` aggiornato (i giganti interi, coda compresa).

**Da provare sull'iPhone:**
- in groppa a una bestia grande in superficie;
- saltare sui gabbiani e poi venderli al porto;
- una battaglia contro Moby Dick.

## Pulizia dopo i lotti S–Z (20 ottobre 2026) → v0.86.1

- Nessun codice morto: ogni funzione esportata è usata dal gioco o dai test (controllo con uno script).
- Tolto lo stile della vecchia riga del timone (`.helm-gauges`); sistemati due commenti (`beastView`, `shipView`).
- **File sotto le 300 righe:**
  - `ship/gadgets.ts` è diviso in `gadgetsState.ts` (stato, `glide`) e `sphere.ts`; `gadgets.ts` li riesporta;
  - il disegno di ogni bestia in battaglia è in `views/battle/drawBeast.ts`;
  - il riquadro delle bestie è in `ui/battleInfoBox.ts`;
  - i testi di fine battaglia sono in `ui/battleResultText.ts`;
  - la cattura degli uccelli è in `systems/birdsCatch.ts`.
- **Documenti:** le sessioni dal 15 al 19 ottobre sono passate nell'archivio; aggiunte le decisioni dei lotti S–Z.

## Lotto Y, immagini (20 ottobre 2026) → v0.86.0

- **Card:**
  - in `scripts/art.ts`, `makeCard` mette le illustrazioni non 2:3 (4:5 e 9:16, 69 bestie) **intere** nella card, su sé stesse sfocate e scurite, con il bordo sfumato da una maschera SVG;
  - quelle quasi 2:3 (scarto 2%) e la flotta si ritagliano ancora;
  - opzione nuova `--cards`, che rifà solo le card delle bestie, sopra le vecchie;
  - le sottocartelle di `art-inbox/` vengono ignorate.
- **Lista per Gemini:** `docs/GEMINI-LOTTO-8.md`, 19 immagini su fondo verde (Saetta, murena, squalo bianco albino, manta, lontra, tartaruga liuto, squalo balena, tre coccodrilli, megattera, Archelon in groppa). Il proprietario le salva in `art-inbox/lotto8/`; io le metto al posto delle vecchie, che diventano `_vecchia_…`.
- **Galleria di prova e strumenti di prova:** restano, il proprietario li usa ancora per provare.

**Da provare sull'iPhone:** bestiario, squadra e scheda di una bestia (per esempio beluga, archelon, capodoglio).

## Lotto Z, battaglia, luce della nave, suoni, sottomarino (20 ottobre 2026) → v0.85.0

- **Giganti:**
  - `foeSway` (`battle/stage.ts`): se il nemico è tagliato dallo schermo, rimpicciolisce piano fino alla grandezza in cui è intero (non sotto `giantDrift.farShare` 0,75) e torna, ogni `period` 9 s;
  - `battleView.seen()` lo usa per il disegno e per il fondale; il pavimento non cambia;
  - misurato nel browser a 667×375: Moby Dick scende fino a circa l'85% della grandezza e il fondo dell'immagine resta sopra il menu.
- **Fondale:** `groundK` in `battleView` riparte da 0 a ogni `setFighter`; `backdrop.setGroundAlpha` (`BATTLE_STAGE.groundFade`).
- **Luce della nave:** il fascio è in una grafica `beam` sotto i quadri della nave. Il cerchio nel buio (`glowSpots`) segue `lift` e sta sotto la chiglia (`SHIP.underLight.spotBelow`).
- **Audio:**
  - `SoundEngine.hush` (volume a zero e `suspend`) quando la pagina si nasconde; al ritorno riparte;
  - in pausa la musica del mare aperto si ferma subito;
  - `TITLE_MUSIC` (`data/music.ts`) e `titleMusic(on)`, chiamata da `TitleScene`.
- **Sottomarino:** `wakeOnShip` lo rimette nella stiva (`subRecovered`); senza nave lo riporta a `SUBMARINE.mooredX`.
- **Test:** `tests/lottoZ.test.ts`.

**Da provare sull'iPhone:**
- battaglia contro Moby Dick e il megalodonte (galleria);
- cambiare bestia in battaglia da una grande a una piccola;
- accendere la luce sotto la nave ferma con i portelloni aperti, anche con il mare mosso;
- uscire dall'app durante la musica (anche in battaglia) e rientrare;
- il menu iniziale;
- morire con il sottomarino in fondo al mare.

## Lotto X, il mare (20 ottobre 2026) → v0.84.0

- **Branchi:** `PackTrail.at` (`views/packFormation.ts`) fonde i due punti della scia attorno al momento cercato. Prima prendeva il punto più vicino: i compagni stavano fermi qualche fotogramma e poi saltavano.
- **Sub in superficie:**
  - `systems/floatSurface.ts` (nuovo): `floatPushShare`, `floatWater`, `keepInWater`, `floating`, con i numeri in `DIVER.float`;
  - `stepDiver` riceve `waterLine`, che `game.ts` calcola con `seaHeight`, le stesse onde della vista;
  - `moveBody` non blocca più il sub sulla linea piatta;
  - anche `breach.ts` (in groppa) usa la linea delle onde.
- **Tentacoli:** `CEPHALOPODS` e `BEAST_SPRITE.cephalopodWave`. `spineOf` ha il ramo cefalopode e restituisce `tall` (altezza di ogni pezzo); `beastView` la applica. `swimLook` dà `cephalopod` e `walker`.
- **Granchio:** in `roam.ts`, `floorNear` dà il fondale un po' più avanti; le bestie `floor` lo seguono (`ROAM.floorHug`) e se sono sopra il fondo ci scendono (`ROAM.floorSink`). Il corpo resta rigido, con un piccolo passo (`walkerStep`).
- **Test:** `tests/lottoX.test.ts`.
- **Nel browser:** il granchio messo a mezz'acqua dalla galleria scende al fondo in circa 8 s e poi resta a 4-10 unità dal fondale. Polpo, calamaro e Piovra si muovono in mare senza errori. Il pannello del browser era nascosto: niente immagini, quindi l'aspetto va guardato sull'iPhone.

**Da provare sull'iPhone:**
- un branco di barracuda o di delfini;
- risalire in superficie, con il mare calmo e in tempesta;
- polpo, calamaro e Piovra nella galleria ("In mare" e, per la Piovra, "In groppa");
- il granchio ragno.

## Lotto W, timone e recinto (20 ottobre 2026) → v0.83.0

- **Quadranti:** `ui/helmDials.ts` (nuovo) disegna in SVG i quadranti quadrati: tacche, icona, lancetta e numero. I valori sono calcolati in `helmGauges.ts` da `dialValues` (velocità, autonomia, carburante con i fusti, profondità se c'è) e testati. `HelmInfo` ha in più `topKnots` e `fullRangeKm`. La grandezza e l'arco della lancetta stanno in `HELM.dials` (`data/ship.ts`). Non esistono più `gaugeLine` e `poolLine`.
- **Vasca:** `HelmInfo.poolCount`, mostrato come segno "≈N" sul pulsante Cockpit (`helmControls.ts`).
- **Dai oggetto:** `itemsForBeast` (`economy/items.ts`) filtra gli oggetti utili a una bestia. `teamPanel.ts` spegne il pulsante se non ce ne sono e apre la sacca dentro `.port` o `.menu`, davanti alla finestra.
- **Misure nel browser:** a 667×375 e 932×430 i quadranti, il sonar, le barre e i pulsanti in alto non si sovrappongono.

**Da provare sull'iPhone:**
- al timone di nave, motoscafo e sottomarino: guarda i quadranti mentre acceleri e consumi carburante;
- con bestie nella vasca, guarda il segno sul pulsante Cockpit;
- nel cockpit apri "Dai oggetto" con una cura nella sacca.

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
