# Progressi

## Dove siamo (aggiornato il 25 ottobre 2026, v0.113.0)

- **Gioco:** mare in tre zone (baia, Delta, mare aperto infinito), 34 bestie con albini, alfa, forme finali e uniche, battaglie a turni con mosse e domatura, flotta (navi, sottomarini, motoscafi), porti con bacheca, mercato, cantiere, riparazioni, sonar e cacce, meteo, suoni e musiche.
- **Salvataggi:** menu iniziale con più partite (`systems/save/slots.ts`); una partita illeggibile non si sovrascrive mai. Dire sempre al proprietario quando un lotto tocca i salvataggi.
- **Immagini:** quasi tutte le bestie hanno card, profili, fronte e retro. Mancano:
  - Kraken, Leviatano, calamaro colossale, serpente di mare (disegno provvisorio);
  - conchiglie (`docs/GEMINI-LOTTO-7.md`);
  - sfondo del menu iniziale (`art-inbox/menu_sfondo.jpg`).
- **Strumenti di prova da togliere più avanti** (il proprietario l'ha chiesto): 5 tocchi sulla versione in pausa, "+50.000 denti", Galleria di prova (`systems/gallery.ts`, `ui/galleryBar.ts`).
- **Immagini attese:** del lotto 8 (`docs/GEMINI-LOTTO-8.md`) mancano `squalo_balena_back` e i 6 dei coccodrilli; il Leviatano (le dà il proprietario: ricordarglielo); la grafica della schermata iniziale (`art-inbox/splash.jpg`).
- **Note del 21 ottobre sera** (`docs/BACKLOG.md`, in alto): AE schermo e musica ✅, AF salti e incastri ✅, AG schede ✅, AH sub ✅, AI bagliori ✅; AD-4 poteri speciali ✅ (v0.99.0). Blocco 2 già fatto; **Blocco 6 in corso**: BA arpione e morsi ✅, BB vasca e costa ✅, BC mosse animate ✅, BD correzioni ✅, BE caccia ✅. **Proposta del mare in corso** (`docs/PROPOSTA-MARE.md`): M1 aspetto delle regioni ✅ (v0.105.0), panorami dipinti di 5 regioni ✅ (v0.105.1), sfondi di battaglia di 5 regioni ✅ (v0.105.2, completati con `bg_foresta_front` in v0.105.4; mancano pareti e Fossa del lotto 9); M2 punti di riferimento ✅ (v0.107.0), P1 porti, avamposti, laguna e ghiaccio dipinti ✅ (v0.108.0); prossimi M3 Gallerie, poi il lotto dei mezzi abissali (visione notturna), M4 fondale vivo, M5 la Fossa Nera. Immagini attese: `docs/GEMINI-LOTTO-9.md` (il proprietario le sta generando). Poi: la proposta del mare (`docs/PROPOSTA-MARE.md`: fondali, porti, avamposti, abissi a labirinto, la Fossa più profonda con il Leviatano, asset da Gemini), poi la storia e i personaggi. La pulizia quando c'è un momento. **Blocco 8 (immagini) rimandato** finché il proprietario non lo dice (ricordarglielo).
- **Ruoli, tipi e compagni** (`docs/PROPOSTA-RUOLI.md`, confermata): AD-1 tipi chiari ✅, AD-2 cavalcature ✅, AD-3 il branco ✅, AD-4 poteri speciali ✅ (v0.99.0): proposta completata.
- **Dopo AD-3 e AD-4:** correzioni del "Blocco 2" ancora aperte, Blocco 6 (cattura e combattimento, da progettare insieme), poi blocchi 7-10 (`docs/BACKLOG.md`).
- **Ultima pulizia:** v0.94.1 (21 ottobre), la prossima dopo altri 3 lotti. La galleria e gli strumenti di prova restano finché il proprietario prova.
- **Storia:** `docs/PROGRESS-ARCHIVIO.md` ha le sessioni fino al lotto AD-3 (v0.92.0); qui sotto le ultime.
- **Per vedere il gioco quando il pannello del browser è nascosto:** `renderer.snapshot` più `node scripts/snap-server.mjs <cartella>` (dettagli nella sessione del lotto AA, nell'archivio).

## Note del 24 ottobre: lotti C1-C4 (piano in `C:Usersmatte.claudeplanszippy-beaming-peacock.md`)

Il proprietario ha mandato una lista lunga dopo la v0.108.0 e chiede iniziativa: per ogni problema controllare tutti i casi simili. Ordine: **C1** correzioni rapide ✅ (v0.108.1); **C2** ✅ (v0.109.0), **C3** ✅ (v0.110.0), **C4** ✅ (v0.111.0); **M3 Gallerie** ✅ (v0.112.0). Mezzi abissali ✅ (v0.113.0). Prossimo: M4, poi M5. (Vecchie note:) Portofosco (la nave entra nella terra, il molo non poggia, stacco di `molo_fondo` che ha i bordi tagliati dritti), la sagoma intera dell'U-Boot per le collisioni, il passaggio degli sfondi tra baia e mangrovie (e tutti gli altri confini), il radar del sottomarino con fondale e ostacoli; **C3** immagini Gemini per tutto ciò che è ancora disegnato col codice (veliero della Foresta e relitti con l'arma, barriere d'ossa, cerchi d'aria, forzieri); **C4** lo scontro in acqua riprogettato (niente "Affronta", chi colpisce per primo parte nella battaglia, bestia ferita al rosso che fugge, morso della cavalcatura sempre visibile). Poi M3.

## Lotto dei mezzi abissali (25 ottobre 2026) → v0.113.0

- **Dati:** `data/abyss.ts` (`ABYSS_PARTS` dove stanno, `ABYSS_BUILD` 80.000 denti, `NIGHT_VISION`); nave `abissale` in `data/fleet.ts` (38 nodi, freno 24, planata propria `plane`, 300 m, tema `abissale`); `sottomarino_abissale` in `data/submarine.ts` (1000 m, 1800 s d'aria, `diveSpeed` 200, `beam` 2,2, `nightVision`, `cockpit`).
- **Pezzi:** ricompensa `part` dei relitti `relitto_grandi_fosse_3`, `relitto_abisso_1`, `relitto_abisso_3`; forzieri delle Gallerie da `systems/world/galleryChests.ts` (piano, lontano da colonne e sacche, davanti al terreno in `placesView`). `gear.abyssParts` salvato; `systems/ship/abyssParts.ts`, `buyShip` li chiede e li consuma; la nave non si vende. Consiglio di Aurelio `tipAbyss` al primo pezzo.
- **Sottomarino:** `systems/nightVision.ts` (comando `night`), `views/nightVisionView.ts`, `lightView` con `night`; cockpit dal sottomarino (`ui/cockpit.ts` `subCockpit`, `renderSubSonar`, carta centrata sul sottomarino in `chart.ts`); bussola in km in `subScope`.
- **Immagini:** `nave_abissale(_aperta)` già scontornate (lo script ora tiene le immagini trasparenti così come sono, `transparentBorder`), `sottomarino_abissale` dal verde, card.
- Test: `tests/lottoAbissali.test.ts`; aggiornati `fleet` (10 navi, la più veloce) e `subAir` (eccezione voluta).
- **Da provare sull'iPhone:** menu segreto → "Nave abissale subito" (o "Tutti i pezzi abissali" e costruirla al cantiere); andare a tutta velocità (planata), immergersi, calare il sottomarino, scendere in una fossa, accendere la visione notturna, aprire il cockpit dal sottomarino.

## Occhi rossi (25 ottobre 2026) → v0.112.2

- Il proprietario ha chiesto di togliere i pallini dell'umore (cerchi di codice, contro la regola ferrea) e di mettere occhi rossi quando cacciano. Tolto `moodMark` da `views/beastsLayer.ts`; `BeastSprite` ha un bagliore rosso morbido (ADD, nello strato `glow` sopra il buio) sull'occhio dipinto, che segue il pezzo della testa (`updateEye` in `views/beastView.ts`). Posizioni degli occhi lette a mano da ogni profilo: `data/beastEyes.ts` (85 immagini; manca il calamaro, occhio non in vista). Test: `tests/beastEyes.test.ts`.
- v0.112.3: il bagliore stava nello strato sopra il buio e si vedeva attraverso i corpi davanti (il proprietario l'ha visto nelle foto: "me ne devo accorgere io"). Ora è un pezzo della bestia (nel suo container) e il buio lo lascia vedere con un piccolo punto di luce (`eyeSpots` in `beastsLayer.ts`, `EYE_GLOW.light`).
- Il proprietario deve ancora provare bene lo scontro in acqua (C4).

## Gallerie senza stacchi (25 ottobre 2026) → v0.112.1

- Il proprietario ha visto i cerchi sotto le bolle e ha ribadito la **regola ferrea**: niente immagini incollate, niente bordi dritti, tutto piantato e sfumato (memoria no-seams-rule). Controllo da vicino, schiarito e al buio, di tutti gli imbocchi, caverne e Cattedrale.
- **Trovato e corretto:** dischi sotto le bolle (già tolti prima della v0.112.0, si vedevano solo nelle foto); parete delle grotte che usciva nell'acqua della fossa e finiva con un taglio (`caveWall` in `terrainPainter.ts`: sfuma dall'imbocco verso dentro con bordo irregolare, `GALLERY_ART.wallFade`; una seconda copia spostata di mezza immagine copre le linee dello specchio); arco a metà nell'acqua (`GALLERY_ART.mouthInRock`, lato verso la fossa sfumato con `SIDE_FADES`); colonne con le estremità piatte (`END_FADES` in `scripts/art/landmarkCuts.ts`); pannelli dipinti delle pareti della fossa (`parete_corallo`) sopra o sotto gli imbocchi (`WALLS.galleryMargin`, `overGallery` in `worldArtView.ts`); coralli dipinti nel riquadro vicino ai tunnel (`coralPainter.ts`).
- Accanto agli imbocchi ora si vede la parete normale della fossa (senza pannello dipinto): è la stessa roccia sfumata del resto del fondale.

## Lotto M3, le Gallerie (25 ottobre 2026) → v0.112.0

- **Immagini** (Gemini Pro, stile della pescheria): `ingresso_galleria` (il buco nero tolto da `clearDarkMiddle` in `scripts/art/landmarkCuts.ts`, solo dentro l'ellisse del buco), `colonna_cattedrale_1|2` (maschera solida come i luoghi, prefisso `colonna_`), `funghi_luminosi_1…3` (gruppi divisi, originali in `art-inbox/gruppi/`), `trama_basalto` (trama).
- **Dati:** `data/galleries.ts` (`GALLERIES`, `CATHEDRAL`, `GALLERY_ART`).
- **Logica:** `systems/world/galleries.ts` (una galleria per fossa delle Grandi fosse: imbocco a metà parete, tunnel a pendenza dolce sotto il fondale con un tetto di roccia, si accorcia finché la caverna sta nella roccia; un ramo ogni tre; sacche d'aria; correnti; la Cattedrale nella fossa più vicina ai 24 km); `galleryShape.ts` (`galleryOpenAt` scavato da `endlessTile`, `galleryBottomAt` in `generateChunk`, `galleryVentAt` in `ventAt`, `galleryCurrentAt`, colonne solide dalla maschera); `currents.ts` (sub e sottomarino); sottomarino ricarica l'aria alle sacche (`GALLERIES.subRefill`); bestie oltre `maxBeastM` respinte all'imbocco (`roam.ts`); `cathedral.ts` (scoperta, mappa in `seaMap.ts`).
- **Disegno:** `views/galleryView.ts` (arco, colonne, funghi con luce, scie delle correnti); parete delle grotte dipinta dal `terrainPainter` (`caveWall`, a specchio, ombreggiata); bolle delle sacche in `ventView` senza roccia né disco; gocce in `regionSound`.
- Test: `tests/lottoM3.test.ts` (percorso libero per sub e sottomarino più grande in tutte le gallerie, nessuna che sbuca, U-Boot bloccato, squalo bianco fuori, aria del sottomarino, Cattedrale e mappa).
- **Da provare sull'iPhone:** serve una muta o un sottomarino da 350-400 m. Entrare in una galleria dall'arco, nuotare contro una corrente, respirare a una sacca, arrivare alla Cattedrale.

## Lotto C4 (25 ottobre 2026) → v0.111.0

- **Contatto = battaglia:** `touchOutcome` (`systems/swimFight.ts`) decide chi comincia: in groppa la cavalcatura morde sempre (`mountBite`; una carica senza scatto morde prima lei, `stalkBite`), `you` se scattavi, se l'avevi colpita prima (`struckFirst`) o se non cacciava; a piedi un cacciatore morde (`swimBite`/`stalkBite`) e comincia lui salvo `struckFirst`; calme, timide o sfiancate raggiunte: `you`; senza squadra niente battaglia. In `encounters.ts` la battaglia parte dopo `SWIM_BITE.battlePause` (`w.battleIn`), così i morsi si vedono.
- **Sfiancate:** `isWorn` (`wildState.ts`): niente caccia, `mood` flee a `HARPOON_WEAKEN.wornSpeed` della tua velocità (`roam.ts`).
- **Tolto "Affronta"** da `playerActions.ts` (resta il tocco su una tua bestia per sceglierla, `faceHunter`). Messaggi aggiornati.
- **Umore:** `moodMark` in `views/beastsLayer.ts` (rosso che pulsa: ti caccia; giallo: all'erta o ferita).
- Test: `tests/lottoC4.test.ts`; aggiornati `sea` e `lottoBE`.

## Lotto C3 (25 ottobre 2026) → v0.110.0

- **Immagini** (Gemini Pro con la pescheria come riferimento di stile): `sfiato_aria`, `relitto_arma`, `forziere`, `forziere_incrostato`, `forziere_sepolto`, `corallo_1…5`, `alga_1…4` (i gruppi originali in `art-inbox/gruppi/`, divisi per forme collegate), `trama_ossa` (nuovo tipo `texture` dello script: solo ridimensionata).
- **Dati:** `PROP_ART` e `SCENERY_ART` in `data/worldArt.ts`.
- **Piantati:** `views/plant.ts` (fondo al punto più profondo sotto l'80% della larghezza, al massimo il 45% affondato, altrimenti più piccolo); sfiati, forzieri, relitti, veliero, coralli dell'anfiteatro e alghe dietro stanno nel contenitore `under` dietro il terreno. I coralli dei pezzi di fondale (`views/coralPainter.ts`, nuovo) sono disegnati sotto la roccia del pezzo e sul punto più basso sotto la base, mai su pendii troppo ripidi.
- **Altro:** bolle morbide (`views/bubbles.ts`) per sfiati e templi; alghe dipinte a fette che ondeggiano (`kelpView`); muri d'ossa con la trama ripetuta a specchio (`terrainPainter`).
- **Schede:** `bayStats.ts` ha le righe vere della Sfera blocca-bestie; test che nessuna card dei mezzi dica "in arrivo". Memoria aggiornata: ogni cambiamento aggiorna tutti i testi e le card.
- Test: `tests/lottoC3.test.ts`.

## Lotto C2 (25 ottobre 2026) → v0.109.0

- **Nave nella terra:** l'U-Boot passato sotto il molo di Porto Fango navigava a ovest senza limiti. Ora `hullAground` (`ship/uboat.ts`) ferma a galla ogni nave quando la chiglia tocca roccia (non il ghiaccio, che rompe), evento `shipAground`.
- **Sagoma intera:** `SHIP_SHAPES` (maschera 64 colonne di ogni `nave_*.webp`, scritta da `npm run art`); `hullBlocked` sott'acqua controlla le celle del bordo della sagoma.
- **Sotto i moli:** `views/pierUnder.ts` disegna pali e fondo in un contenitore dietro il terreno (`under` in `worldViews.ts`): i pali arrivano al fondo più profondo sotto il molo, la fascia bassa ripetuta capovolta a ogni copia in una texture sua (niente stiramento); `molo_fondo` sfumato ai lati e in basso (`SIDE_FADES`, `BOTTOM_FADES`), `floorSink` 0,5 m.
- **Sfondi:** `lookAt` (`systems/seaLook.ts`) ora conta quanta parte della finestra intorno occupa ogni aspetto (regioni 2400, Foresta/Banchisa 600, Delta a parte con 420): continuo a ogni confine (test che scorre tutto il mare). I panorami poggiano sul fondale vero della costa (`floorAt` dalla mappa in `seaRidges`) e salgono sui fondali bassi (`SEA_RIDGE_FLOOR.maxRaise`); tolto `ridgeLift`.
- **Sonar:** `systems/subSonar.ts` `sonarEdges` (bordi di roccia e ghiaccio su una griglia), disegnati in `ui/subScope.ts` su tutti i sottomarini.
- Controllati anche: il molo di Porto Fango, tutti i confini del mare, il bordo del galeone (`SIDE_FADES` a destra).
- Test: `tests/lottoC2.test.ts`; aggiornati `uboat` (sotto il ghiaccio più a fondo, a ovest si ferma sui bassi) e `lottoM1`.

## Lotto C1 (24 ottobre 2026) → v0.108.1

- **Musica:** `VOICE_TONE` in `data/music.ts` (onde triangolari, formanti larghe, passa-basso) per voci e bordone di mare, porto e menu.
- **Pressione:** a bordo di un mezzo `stepPressure(d, 0)` la ricarica (`game.ts`).
- **Pulsante:** "affronta" dopo mezzi e porto in `currentAction`.
- **Aria:** sottomarini 300-480 s (in ordine di lunghezza), U-Boot 600/900/1200 s. `chokeAboard` (`diver.ts`): un cuore ogni `hurtEvery` s senz'aria o con lo scafo rotto sott'acqua; morto, il sub viene rimorchiato (`towSub` senza spostarti), l'U-Boot vuoto risale da solo. Nuovo evento `subFlooded` al posto dell'affondamento.
- **Immagini:** `BOTTOM_FADES` ora sfuma ogni colonna a un'altezza diversa e il ritaglio tiene tutta la sfumatura; gli avamposti stanno in un contenitore davanti alla fascia della superficie (`afloat` in `worldViews.ts`).
- **Lag:** `TERRAIN.leadFrames` dipinge i pezzi di fondale dove va la telecamera; la telecamera segue con `1 - exp(-dt·k)`.
- Controllati anche: tutte le immagini del mondo con bordi tagliati (trovati `molo_fondo` e un lato di `luogo_galeone_dentro`, per C2), tutti gli avamposti sopra e sotto l'acqua, gli isolotti.
- Test: `tests/lottoC1.test.ts`, aggiornati `uboat`, `submarine`, `subAir`.

## Lotto P1, porti, avamposti, laguna e ghiaccio (23 ottobre 2026) → v0.108.0

- **Immagini** (Gemini, Pro, una chat per immagine): `paese_portofosco`, `paese_fango`, `avamposto_corallo|gelo|orlo`, `delta_isola_1|2`, `mare_delta_lontano|medio`, `ghiaccio_soffitto`, `ghiaccio_pilastro_1`. L'Avamposto della Corrente rifatto non si riusciva a scaricare pulito: tiene `avamposto_medio` (scartata in `art-inbox/_scartata_avamposto_corrente.jpg`).
- **Script:** nomi `paese_`, `delta_isola_`, `ghiaccio_`; i `ghiaccio_*` hanno la maschera fine come i luoghi; `BOTTOM_FADES` in `scripts/art/landmarkCuts.ts` sfuma il fondo di Orlo, Corallo e isolotti.
- **Dati:** `data/placeArt.ts` (nuovo: `VILLAGES`, `OUTPOST_ART` per regione con `OUTPOST_FALLBACK`, `DELTA_ISLETS`); `ICE_ART` in `data/worldArt.ts`; aspetto `delta` e suono `swamp` in `data/seaLooks.ts` (`ridgeLift` alza i panorami sopra il fondale basso).
- **Ghiaccio:** `systems/world/iceSheet.ts` (lastre tra i buchi, copie sfumate e capovolte a caso, bordi frastagliati, pilastri; `iceArtSolidAt` usato da `endless.ts` e `worldGen.ts`; `widenIceBreak` rompe colonne intere e pilastri interi, usato dalla nave e dal Rompighiaccio); `views/iceArtView.ts` disegna le lastre in strisce larghe una casella (si nascondono dove il ghiaccio è rotto). `seaSurfaceView` e `terrainPainter` non disegnano più il ghiaccio vecchio quando ci sono le immagini.
- Test: `tests/lottoP1.test.ts`; `tests/submarine.test.ts` controlla tutto il tratto sotto il ghiaccio (i ghiaccioli pendono in modo irregolare).
- **Da provare sull'iPhone:** Portofosco e Porto Fango, gli avamposti del Corallo, del Gelo e dell'Orlo, la laguna sopra e sotto l'acqua, il ghiaccio con la nave (il canale si apre a colonne) e nuotando nei buchi.

## Lotto M2, i punti di riferimento (23 ottobre 2026) → v0.107.0

- **Immagini** (lotto 10 di Gemini, `art-inbox/lotto10/`): `luogo_arco`, `luogo_galeone_1`, `luogo_galeone_2`, `luogo_galeone_dentro`, `luogo_balena`, `molo_pali`, `molo_fondo`. Lo script dà ai `luogo_*` una maschera solida 120 colonne (in `ICEBERG_SHAPES`) e taglia la falla e le porte del galeone (`scripts/art/landmarkCuts.ts`).
- **Dati:** `data/landmarks.ts` (posti, pezzi, residenti fissi, forziere, `PIER_UNDER`).
- **Logica:** `systems/world/landmarks.ts` (`landmarkSites`, `landmarkSolidAt` letto da `endlessTile`, `floorNearLandmark` in `endlessFloor`, `landmarkChests` in `placeWrecks`, `discoverLandmarks` con `seen` `luogo:<id>`); residenti `r<k>.L<n>` con giro stretto (`tight`, `ENDLESS.residents.landmarkRoam`); il forziere è nei relitti salvati (`gearSave.ts`).
- **Disegno:** i pezzi in `views/worldArtView.ts`; `terrainPainter` non dipinge roccia sopra le parti solide; `views/pierUnder.ts` (nuovo) per i moli; sardine sotto i moli in `SARDINE_SCHOOLS`.
- **Mappa:** `regionsMap` ha `landmarks`, `seaMapPanel` li elenca.
- **Non fatto:** il cono di luce dei lampioni di notte (rimandato a M4 con le bioluminescenze).
- Test: `tests/lottoM2.test.ts` (collisione vera del sub nel galeone fino al forziere).

## Resto del lotto 9 (23 ottobre 2026), immagini pronte, non ancora nel gioco

- **Pareti** (`public/world/`): `parete_corallo_2`, `parete_ciglio`, `parete_alghe`, `parete_basalto`, `parete_fossa`: da collegare in M3 (Gallerie) e M4/M5 (in `data/worldArt.ts` oggi ci sono solo roccia, corallo, ghiaccio).
- **Fossa** (M5): panorami `mare_fossa1|2|3_lontano|medio`, battaglie `bg_fossa2_*` e `bg_fossa3_*` (luoghi da aggiungere a `BATTLE_STAGE.places` in M5).
- **Card dei mezzi abissali** (generate con le foto del proprietario come riferimento): `art-inbox/abissali/nave_abissale_card.jpg`, `sottomarino_abissale_card.jpg`, per il loro lotto.
- Script: `bg_<luogo>` ora accetta anche cifre (`fossa2`).
- **Gemini:** per caricare un'immagine di riferimento, aprire il menu "+", rendere visibile l'`input[type=file]` con accept image/* via JavaScript e usare file_upload.

## Fix menu iniziale e cantiere (23 ottobre 2026) → v0.106.0

- **Apertura:** il click dopo il tocco sulla schermata iniziale passava al pulsante sotto (`#splash.gone` aveva `pointer-events: none`). Ora la schermata trattiene il click e il menu ignora i tocchi per `SPLASH.guardMs` (`ui/splash.ts` `splashGuard`).
- **Cantiere:** `ShipCategory` = spedizione, uboat, abissale (vuota, con la scritta `empty`); il Poseidon è "spedizione".
- **Scheda nave:** `systems/ship/pageTabs.ts` (nuovo) dà una linguetta per foto con righe e confronto (nave con nave in uso, mezzo con quello della stessa famiglia: sottomarino, barca e moto d'acqua insieme); `ui/shipStats.ts` disegna una linguetta.
- **Immagini del proprietario** della nave abissale (chiusa, aperta) e del sottomarino abissale in `art-inbox/abissali/`: si usano nel loro lotto, dopo M2, quando il proprietario dice le sue idee (nave veloce, frenata pesante, plana a pelo d'acqua, scende a circa 300 m; sottomarino 30 min, profondità massima, sale e scende veloce, laterale medio; si costruiscono con pezzi trovati).
- Test: `tests/fixMenuCantiere.test.ts`.

## Passaggi tra regioni (23 ottobre 2026) → v0.105.3

- `views/seaRidges.ts`: dissolvenza incrociata (il nuovo aspetto sale nella prima metà, il vecchio scende nella seconda), fondo delle strisce comune a tutti gli aspetti (`rowBottom`), panorami caricati tutti all'avvio.
- Tolto il canto di balena (`whale` non c'è più in `SeaSound`). Il proprietario: "fastidiosissimo".
- Nel browser: attraversamento barriera→mare blu e foresta/banchisa a passi di 15 unità; nessuna striscia sparisce, la copertura resta piena.

## Sfondi di battaglia del lotto 9 (23 ottobre 2026) → v0.105.2

- 19 strati `bg_<mareblu|foresta|banchisa|fosse|abisso>_<far|mid|front|ground>` (manca `bg_foresta_front`: in battaglia nella foresta il primo piano è ancora quello disegnato dal codice).
- **Lezione su Gemini:** una correzione chiesta nella stessa chat mostra un'anteprima pulita, ma il file scaricato contiene pezzi della scena precedente (sfondi dietro le pedane, aloni verdi). Ogni correzione va fatta in una **chat nuova**, con un testo che si regge da solo.
- Il canto di balena (`audio/regionSound.ts`, `REGION_SOUND.whale`) è un'onda sinusoidale con vibrato, ogni 35-70 s; prima era a dente di sega e gracchiava.
- Nel browser: battaglia di prova (`?battaglia&luogo=<regione>`) in tutte e 5 le regioni, nessuna bestia coperta.

## Panorami del lotto 9 (22 ottobre 2026) → v0.105.1

- **Immagini:** generate da me nel Gemini del proprietario (modello Pro, non Flash-Lite che le fa scadenti), scaricate da lui. Testi usati: la descrizione della regione con "FLAT PURE GREEN sopra", e per il medio "NOT repeat the far layer, ONLY nearby rocks". Le alghe vanno chieste color oro/bruno (le verdi spariscono con lo scontorno). Le scartate sono in `art-inbox/lotto9/scartate/`.
- **Script** (`scripts/art/extras.ts`): `panoramaBottom` (taglia la fascia verde sotto), `fadeTop`, `fadeBottom` (il fondo e i varchi sfumano nel colore medio del bordo), `seamless` (le estremità si fondono).
- **Gioco** (`views/seaRidges.ts`): le creste seguono il fondale della zona (`SEA_RIDGE_FLOOR`), il buio sotto prende il colore del bordo del dipinto; tra foresta e banchisa la mescolanza è di 100 m (`SEA_LOOK_BLEND_STRETCH`).
- **Da fare del lotto 9:** sfondi di battaglia (`bg_<regione>_*`), pareti, i panorami della Fossa (servono in M5).

## Lotto M1, ogni regione del mare ha il suo aspetto (22 ottobre 2026) → v0.105.0

- **Dati:** `data/seaLooks.ts` (nuovo): 7 aspetti (costa, barriera, mareblu, foresta, banchisa, fosse, abisso) con tinta dell'acqua, colori e forma delle creste (`RidgeStyle`), raggi, neve, bioluminescenze, suono; `SEA_LOOK_BLEND`, `SEA_SNOW`, `REGION_SOUND`. `SEA.far`/`SEA.mid` tengono solo quota e parallasse.
- **Logica:** `systems/seaLook.ts` (nuovo): `lookIdAt`, `lookAt` (mescolanza al confine), `waterTint`, `lookNumber`, `snowShare`, `battlePlaceAt`.
- **Disegno:**
  - `views/seaRidges.ts` (nuovo, le creste tolte da `backgroundView.ts`): due serie per fila che si mescolano, in memoria solo quelle in vista; usa `public/bg/mare_<aspetto>_lontano|medio.webp` quando esistono;
  - `views/seaRidgeArt.ts` (nuovo): le forme hills, reef, plateau, kelp, ice, spires, trench;
  - `backgroundView.ts`: l'acqua tinta dall'aspetto;
  - `seaLight.ts`: raggi × aspetto, neve più fitta con la profondità, bioluminescenze nello strato `glow` (sopra il buio).
- **Suono:** `audio/regionSound.ts` (nuovo), dentro `seaAmbience.ts` (`SeaMoment.look`).
- **Battaglie:** luoghi `mareblu`, `foresta`, `banchisa`, `fosse`, `abisso` in `BATTLE_STAGE.places` e `BATTLE_PALETTES` (`prop: 'none'` per mare blu e fosse); `battleSetup` usa `battlePlaceAt(w.x, …)`.
- **Immagini:** `npm run art` riconosce `mare_<aspetto>_lontano|medio.jpg` (verde tolto, 2400 px) → `public/bg/`. Le immagini di `art-inbox/lotto9/` vanno prima smistate nella cartella `art-inbox/`.
- **Test:** `tests/lottoM1.test.ts`.
- **Nel browser:** foto a costa, barriera, mare blu, foresta, banchisa, fosse, abisso e al confine; battaglie in mare blu e nelle fosse; `lookAt` costa 0,003 ms al confine; in memoria restano solo le creste dell'aspetto in vista.

**Da provare sull'iPhone:**
- nuotare (o andare in nave) dalla barriera al mare blu e oltre: colori, sfondo e suoni cambiano piano;
- scendere nelle fosse: puntini luminosi e neve marina;
- una battaglia in mare aperto: lo sfondo del posto.

## Lotto BE, la caccia che fa paura (22 ottobre 2026) → v0.104.0

- **Alfa:** `ENDLESS.residents.plainFirstStretches` (7 tratti, circa 2 km) dà residenti solo comuni (`residentForm`). Il residente `r0.3` era uno squalo bianco alfa di livello 56.
- **Caccia:**
  - `systems/beasts/stalk.ts` (nuovo) con le fasi away, wait, warn, charge, pass; `Stalk` sta in `wildState.ts`;
  - `roam.ts` lo muove (con `STALK.burst` sulla carica);
  - `encounters.ts` non lo toglie dal mare mentre caccia e manda `chargeWarn`;
  - il morso è `stalkBite` in `swimFight.ts`: a nuoto un cuore, in groppa la vita della cavalcatura, con lo scontro se scatti;
  - via `provokePatrol` e `rageMult`.
- **Morso della cavalcatura:** `mountBite` (`MOUNT_BITE`) quando sei in groppa, scatti e la bestia non è ancora sfiancata del tutto. Sfiancata del tutto, lo scatto apre la battaglia con l'Assalto.
- **Affronta:** `hunterAfterYou` vale anche in groppa per chi ti dà la caccia.
- **Suono e schermo:**
  - `sound.chargeWarn` (`STALK_TOLL`) e `sound.stalkTension` (la musica di battaglia mentre caccia);
  - freccia rossa `.danger-arrow` in `hud.ts`.
- **Test:** `tests/lottoBE.test.ts` (fasi, avviso, morso, schivata con scatto, seconda carica, stanchezza, morso sulla cavalcatura, morso della cavalcatura, niente alfa).
- **Nel browser:** squalo bianco colpito: fuori schermo in un secondo, attesa, avviso con freccia, carica fino a 65 u/s in due decimi di secondo, morso; foto della carica a bocca aperta.

**Da provare sull'iPhone:**
- arpionare uno squalo e schivare con lo scatto;
- in groppa, scattare addosso a una bestia;
- farsi caricare in groppa;
- "Affronta".

## Lotto BD, correzioni (22 ottobre 2026, sera) → v0.103.0

- **Arpione:**
  - `HARPOON_WEAKEN` (`base`, `perLevel`, `provokedSeconds`, `rageMult`, `fleeMult`, `fleeOver`); `woundPerHit(level)` in `swimFight.ts`;
  - `w.provoked` (non salvato); `provokePatrol` in `patrol.ts` (passaggio forzato in fuga, poi carica);
  - in `roam.ts` velocità moltiplicate mentre è provocata, e di nuovo alla carica dopo la tregua.
- **Schermo:**
  - via la rotazione con il CSS: `orientation.ts` ora ha `isUpright` e `gameSize` senza scambio;
  - `ui/rotateHint.ts` (nuovo) e `main.ts` fanno dormire e risvegliare il ciclo di Phaser;
  - `--safe-*` fissi in `:root`;
  - barra di stato `black`; `min-height: 100lvh` in `display-mode: standalone`.
- **Audio:** sblocco solo su `pointerup`, `touchend`, `click`, `keydown`; `audioSession` prima del contesto; volume generale da 0 in `AUDIO.unlockFade` alla partenza e al ritorno nell'app.
- **Compagni:**
  - colore `.team-slot:not(.rideable)` azzurro abisso;
  - `PACK.alongsideDepth`, `alongsideMin`, `alongsideSpeed` e il `cap` di `stepMount` per il compagno a bordo.
- **Test:** `tests/lottoBD.test.ts`; `lottoAE` e `lottoBA` aggiornati.
- **Nel browser:**
  - in emulazione verticale compare "Gira il telefono"; girando, il gioco riprende a 1624×750;
  - colori della barra: oro per la cavalcatura, azzurro per i compagni.
- **Ricerca (fonti in `DECISIONS.md`):**
  - iOS non permette di bloccare l'orientamento a una web app;
  - la barra nera viene da black-translucent insieme a viewport-fit=cover;
  - l'audio va sbloccato alla fine del tocco.
- **Limiti:** barra nera e audio vanno verificati sull'iPhone. Per l'audio dalla Home c'è una segnalazione aperta ad Apple (iOS 26.0.1).

**Da provare sull'iPhone:**
- aprire dalla Home in orizzontale (barra nera?);
- girare il telefono;
- il primo tocco e la musica del menu;
- arpionare una bestia bassa e una alta;
- salire a bordo con un compagno.

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
