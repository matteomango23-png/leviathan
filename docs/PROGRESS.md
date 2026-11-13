# Progressi

## Dove siamo (aggiornato il 13 novembre 2026, v0.124.0)

- **Gioco:** mare in tre zone (baia, Delta, mare aperto infinito), 34 bestie con albini, alfa, forme finali e uniche, battaglie a turni con mosse e domatura, flotta (navi, U-Boot, sottomarini, motoscafi, mezzi abissali), porti con bacheca (taglie, leggendari), mercato (richieste, Baratto), cantiere, riparazioni, sonar e cacce, Gallerie, meteo, suoni e musiche. Tutorial passo passo e consigli di Aurelio; fucile a raffica con munizioni; giorno e notte (30 minuti) con Dormi.
- **Salvataggi:** menu iniziale con più partite (`systems/save/slots.ts`); una partita illeggibile non si sovrascrive mai. Dire sempre al proprietario quando un lotto tocca i salvataggi.
- **Ultima pulizia:** v0.122.1 (12 novembre 2026); la prossima dopo altri 3 lotti. Tutti i file di codice sotto le 300 righe (i dati restano lunghi).
- **Prossimo:** N2 se il proprietario lo vuole (più sagome e bestie solo notturne), oppure M5 la Fossa Nera (M4 fatto: v0.123.0; i laghi di salamoia scartati dal proprietario). Idee horror rimandate in cima a `docs/BACKLOG.md`.
- **Strumenti di prova da togliere quando lo dice il proprietario:** 5 tocchi sulla versione in pausa, "+50.000 denti", Galleria di prova (`systems/gallery.ts`, `ui/galleryBar.ts`), "Salta all'ora dopo" nel pannello ?prove.
- **Immagini attese:** la luna (`art-inbox/luna.jpg`, tipo world: il codice la mostra appena c'è, `NIGHT.moonArt`); il Leviatano (ricordarglielo); lotto 8 (`docs/GEMINI-LOTTO-8.md`): `squalo_balena_back` e i 6 dei coccodrilli; Kraken, calamaro colossale, serpente di mare hanno ancora il disegno provvisorio; conchiglie (`docs/GEMINI-LOTTO-7.md`); sfondo del menu iniziale. **Blocco 8 (immagini) rimandato** finché il proprietario non lo dice.
- **Storia:** `docs/PROGRESS-ARCHIVIO.md` ha le sessioni fino al 23 ottobre; qui sotto le ultime.
- **Per vedere il gioco quando il pannello del browser è nascosto:** `renderer.snapshot` più `node scripts/snap-server.mjs <cartella>` (memoria browser-snapshot).

## Lotto N1, giorno e notte (13 novembre 2026) → v0.124.0

- Proprietario: ciclo di circa 30 minuti, 60/40 (18 luce, 12 buio), notte paurosa; alcune specie notturne ("non tutte"); Riposa separato da Dormi, Dormi è un time lapse fermabile.
- `data/daynight.ts` (`DAY`, `NIGHT`, `NIGHT_BEASTS`, `NIGHT_SPECIES`, `SLEEP`); `systems/dayNight.ts` (orologio puro: `nightness`, `clockText`, `stepDay`, `nightDim`, salvataggio `day.t`); `systems/sleep.ts` (`canSleep`: nave ferma al timone o porto; `stepClock` in `stepGame`; `lyingStill`; eventi `sleepStarted`, `wokeUp`, `cannotSleep`, `nightFalls`); `input.sleepCmd`. Il meteo corre alla velocità del sonno (`worldViews`).
- Vista: cielo notte e velo del tramonto (`backgroundView`), `views/nightSky.ts` (stelle e riflesso sul livello dei bagliori; la luna dipinta appena arriva l'immagine), raggi spenti, buio in più (`nightDim` nel `weatherDim` della luce), sagome (`NIGHT.silhouette` nel murk delle bestie), puntini luminosi più vivi (`seaLight`), musica più bassa (`NIGHT_MUSIC`, `SeaMusic.setLevel`).
- Bestie: `nightTemper` in `beasts/roam.ts` (aggressive: vista e velocità; calme: schive), `nightWeight` in `spawnDraw`, albini con `rollWildForm(id, rng, albinoMult)`; `BeastWorld.day`.
- UI: `ui/sleepOverlay.ts` (scelta, velo, orologio, Svegliati; `#ui.sleeping` nasconde il resto), pulsante Dormi al timone (`helm-sleep`) e al porto (`port-sleep`, al risveglio il menu si riapre), orologio nell'HUD, consiglio `tipNight`, riga sulla scheda. Test: `tests/lottoN1.test.ts`.
- Provato nel browser: giorno, tramonto, notte sott'acqua e in superficie (stelle), il sonno al porto (30 volte più veloce, sveglia alla sera, menu riaperto), la riga del porto a 844 px. Non provato: Dormi al timone (la Galleria di prova non ha la nave).
- Da provare sull'iPhone: quanto è buia la notte (`NIGHT.darkness` 0,66), il menu del porto con un pulsante in più, Dormi al timone.

## Lotto M4, il fondale vivo (12 novembre 2026) → v0.123.0

- Immagini generate da me nel Gemini del proprietario (modello Pro, riferimento `art-inbox/sfiato_aria.jpg`, fondo verde); il proprietario le scarica e me le manda. `fumatore_1` (fumo verdastro tolto a mano dalla copia in `public/`) e `fumatore_2`, ridotte a 520 e 760 px (3 MB di texture). Laghi di salamoia: scartati ("fa schifo").
- `systems/world/smokers.ts` (`smokersOf`, `inPlume`, `stepSmokers`: un cuore ogni `burnEvery` a nuoto), `ENDLESS.smokers`, `PROP_ART.smokers` (bocche), `SMOKER_LOOK`; `views/smokerView.ts` (piantati con `plant`, pennacchio di puntini morbidi in ADD sul livello dei bagliori, funghi luminosi della Cattedrale attorno). Banchi: `ENDLESS.schoolKinds` per regione in `stepEndlessSchools`; pesci `aringa`, `pesce_lanterna` (luce: `FISH_GLOW`). Luci dei moli: `PIER_UNDER.lights`, `pierLightSpots` (il gioco non ha notte: si vedono quando l'acqua è scura). Consiglio `tipSmokers`. Test: `tests/lottoM4.test.ts`.

## Pulizia (12 novembre 2026) → v0.122.1

- Tolte le esportazioni mai usate (`npx ts-prune`); commenti dell'"arpione" aggiornati al fucile.
- Divisi i file oltre 300 righe: `beasts/formShape.ts` (da `forms.ts`), `battleRequest.ts` (da `encounters.ts`), `views/beastEye.ts` (da `beastView.ts`), `views/shipLights.ts` (da `shipView.ts`), `ui/helmLevers.ts` (da `helmControls.ts`).
- Aggiornati ARCHITECTURE, DECISIONS, GDD (fucile e munizioni, Zaino, leggende); sessioni fino al 23 ottobre nell'archivio.

## Lotto U7, munizioni (12 novembre 2026) → v0.122.0

- `GUN` in `data/diver.ts`; `systems/gun.ts` (`pullTrigger`, `startReload`, `stepGun`); `gear.gunMag` salvato, scorta = `inventory.dardi` (oggetto `dardi` con `ammo: 20`, scaffale Sub); colpi a puntini (`TEX.dot`) in `diverView`; contatore sul pulsante (`controls.setGun`, nome in `.act-name`); consiglio `tipGun`. Tutorial che ripartiva: i segni "visto" di coach e dialoghi ora si salvano subito (`dialogueClosed`, `saveNow`). Test: `tests/lottoU7.test.ts`. Il proprietario chiede idee per un horror subacqueo più pauroso: proposte nel messaggio del 12 novembre.

## Lotto U6, fucile, archi, Zaino (12 novembre 2026) → v0.121.0

- `systems/harpoon.ts`: dardi `shots[]` senza ritorno (cadenza 0,15, danno 0,4 in `WEAPONS.arpione`), disegnati in `views/diverView.ts`; Grande Arco `solid: false`; `canEquip` e `gearSave` escludono i `battleOnly`; passo `pack` nel tutorial. Test: `tests/lottoU6.test.ts`. **Fine dei lotti U1-U6.** Da fare: foto dei dardi in volo sull'iPhone (nel browser non verificata a fondo); la pulizia (dovuta); poi M4 e M5.

## Lotto U5, le bestie (12 novembre 2026) → v0.120.0

- `BEAST_EYES_OPEN` in `data/beastEyes.ts` (cercate con `scripts/_eyesopen.tmp.mjs`, controllate con `_eyesopencheck.tmp.mjs`, 20 a mano con `_eyesgrid.tmp.mjs`; script temporanei non salvati in git), usate da `beastView.updateEye` a bocca aperta. `passOver` in `beasts/roam.ts` (`PACK_RULES.passBy`) per la caccia ai banchi e la luce della nave. Manta in battaglia: `BATTLE_STAGE.pictureMult.manta` 0,78 (era 1,3). Test: `tests/lottoU5.test.ts`. **Prossimo: U6** (da decidere col proprietario: armi, archi, posti 1-2-3 e conchiglie).

## Lotto U4, battaglia e cattura (12 novembre 2026) → v0.119.0

- A nuoto `requestBattle` al tocco (`encounters.ts`, `battlePause` solo in groppa); `weaponHitsBeast` senza il salto di `calm`; `systems/shotPath.ts` `hitAlong` (ogni `BEAST_BODY.hitStep`) per arpione e fiocine; `weaponHitMargin` 3; `serpentThickness` in `distanceToBody` (`BodyPose.form`); vasca: le scelte guarite escono (`shipPool.ts`); "Doma · N%" con `tameChance` (`ui/battleUi.ts`); consiglio `tipTaming` dopo la prima battaglia. Test: `tests/lottoU4.test.ts`. **Prossimo: U5** (branchi, occhio rosso a bocca aperta, la manta avversaria).

## Lotto U3, freccia e mezzi (12 novembre 2026) → v0.118.0

- `shipArrow`: sottomarino in acqua come meta; `pushOutOfHull(…, surfaceY)` ferma la spinta alla linea delle onde (solo il sub a nuoto); tolte le spinte dei mezzi su selvatiche, branco e cavalcatura (`pushOutOfVehicles` ora solo per te); `leversLock` in `ui/helmControls.ts` blocca Gas e Sali/Scendi; luci sotto lo scafo ruotate con `lean` (`views/shipView.ts`); creste a pixel interi con 2 px di sovrapposizione del fondo (`views/seaRidges.ts`). **Non riprodotto con certezza:** lo scatto delle montagne vicino al fondale (chiesto al proprietario di riprovare). Test: `tests/lottoU3.test.ts`. **Prossimo: U4** (battaglia e cattura).

## Lotto U2, leggendari e sonar (12 novembre 2026) → v0.117.0

- `HUNT_RULES.readyBelow` 15, `huntReady`/`huntReadyLevel` in `systems/hunts.ts` (voce in `hearRumours`, eco in `stepHunts`, schermo del sonar, radar); l'eco si sente entro `bigEchoRange` (quello che lo schermo mostra); Bacheca e scheda dicono "troppo forte" (si può smettere di seguire). Sonar: scritte delle echi e freccia sul bordo per la tana lontana. Radar nave: `cls` delle bestie e contatto `den`. Radar sottomarino: bestie su tutti i modelli, compagni in azzurro. `formStars`: bestie uniche 5 stelle. Test: `tests/lottoU2.test.ts`. **Prossimo: U3** (freccia e mezzi, il blocco B anche sul Gas).

## Lotto U1, inizio e tutorial (12 novembre 2026) → v0.116.0

- Feedback del 12 novembre in `docs/BACKLOG.md` (lotti U1-U6, ordine confermato). **Prossimo: U2** (leggendari e sonar), poi U3 (freccia e mezzi: il blocco B deve fermare anche il Gas), U4, U5, U6 da decidere insieme.
- `data/coach.ts` + `ui/coach.ts` (tutorial passo passo, `data-coach` sui pulsanti, giri in `story.seen`, "Rivedi" nella Guida); `COAST_LEVELS.firstBay` e `WildSpawnDef.levels`; `storyGoal` in `systems/shipPointer.ts`; `shipWaitsAtDock` (nave visibile prima del dono); consigli `tipPack`, `tipSell`, `tipBigBeasts` (`early`: anche nella prima immersione); banner in coda in `ui/hud.ts`; taglie aggiornate sul posto (`ui/bountyCards.ts`, `portBoard.ts`); `shipHint` `reconOut`. Test: `tests/lottoU1.test.ts`.
- v0.116.1: le "sardine che girano" erano lo Sciame di sardine (pulsante abilità): `views/gearFxView.ts` ora disegna una palla di sardine (orbite inclinate e ruotate, arrivo e dispersione, `SWARM_RULES` in `data/economy.ts`); salendo su un mezzo `decoy` si azzera (`systems/game.ts`).

## Lotto T2, richieste e Baratto (26 ottobre 2026) → v0.115.0

- `BEAST_REQUESTS`: `priceMult` [2, 3] a passi di 0,25, `rareChance` 0,01 (una richiesta rara per posto con quella probabilità); `requestsAt` restituisce `BeastRequest` con `mult`. `nearPath` condiviso.
- **Baratto:** `BARTER` (3 scambi, bestie da dare per stelle, +1 per l'alfa, `ahead` 40), `systems/economy/barter.ts` (`barterOffers`, `barterStock`, `barter`), `ui/barter.ts` nel Mercato, `gear.barterDone` salvato. Test: `tests/lottoT2.test.ts`.

## Immagini d'avvio (26 ottobre 2026) → v0.114.1

- `art-inbox/splash.jpg` (Gemini, nave abissale nella tempesta e Moby Dick) → `public/ui/splash.webp`; alone radiale dietro il titolo in `src/style.css`. `art-inbox/app_icon.jpg` (rigenerata dal proprietario: il sub e il Leviatano bianco) → `public/icons` (180, 192, 512, maskable) con il nuovo tipo `appicon` dello script.
- **Prossimo (chiesto dal proprietario):** richieste del mercato quasi tutte bestie comuni (99%), pagate da 2 a 3 volte; sezione **Baratto** nel Mercato (es. 5 squali bianchi comuni → 1 squalo bianco albino), con scambi più difficili per le versioni più rare. Prima "facciamo il punto".

## Lotto T1, taglie e Diario (26 ottobre 2026) → v0.114.0

- **Dati:** `data/bounties.ts` (`BOUNTY_RULES`: 10 visibili, seguite 5/2/1, prezzo da livello e stelle, rari ×2,5, leggendario 10.000; `BEAST_REQUESTS`; testi).
- **Logica:** `systems/economy/bountyPath.ts` (percorso per difficoltà da `wildLevelRange`/pericolo, dove e profondità da `WILD_SPAWNS` o biomi delle regioni con `SPECIES_DEPTH`), `bounties.ts` (seguite, chiuse, battute; `bountyBeaten` da `progress.ts` su `battleWon` e `tamed`; il leggendario seguito è `huntPinned`), `beastRequests.ts` (richieste per porto ed epoca di gioco, prezzo ×2, `sellAtPort`). Stato in `gear.bounties` e `gear.requestsMet` (salvati). Tolte le vecchie taglie dalle missioni.
- **Interfaccia:** `ui/bountyCards.ts`, `portBoard.ts` (tre file), `huntDiary.ts` (Diario solo card seguite), `ui/beastRequests.ts` nel Mercato, prezzo doppio anche nel Recinto.
- **Sonar:** `sonarReadout` salta i pezzi dei luoghi, 96 campioni.
- **Guida:** `tipBounties`, `tipRequests`, `tipPlaces`, `tipDiveLock` (un momento può aprire più consigli, uno per volta). Regola del proprietario: Guida aggiornata a ogni lotto (memoria tutorial-rule).
- **Immagini in arrivo:** schermata di caricamento (Gemini, nave abissale nella tempesta e Moby Dick) → `art-inbox/splash.jpg`; icona dell'app → `art-inbox/app_icon.jpg` (lo script ora fa 180/192/512/maskable). Il proprietario sceglie l'icona tra due (testa del Leviatano / bocca con il sub).
- Test: `tests/lottoT1.test.ts`.

## Suono gracchiante (26 ottobre 2026) → v0.113.4

- Il proprietario lo sentiva a 2,7 km (Barriera): era il crepitio dei gamberetti di `audio/regionSound.ts` (buffer di scatti di rumore, 14 al secondo, sempre acceso nella Barriera). Tolto, con `REGION_SOUND.reef`. Lo scricchiolio del ghiaccio (onda quadra a scatti) ora è un gemito con sinusoide e rampe. Misurato registrando l'uscita nel browser: 0 scatti al secondo nella Barriera.

## Memoria all'avvio (26 ottobre 2026) → v0.113.3

- Il proprietario non riusciva più ad aprire il gioco sull'iPhone (Safari: "A problem repeatedly occurred"). Misurate le texture caricate: 1.114 MB. `pier-poles-323` era 1400×29.857 (167 MB): `deepestFloor` in `views/pierUnder.ts` partiva dalla roccia della riva e trovava un fondo lontanissimo; ora salta i punti nella roccia, si ferma a `PIER_UNDER.pilesMaxDepthM` e i pali profondi sono una TileSprite di due copie della fascia (texture `pier-poles` condivisa). `WORLD_ART_SPARE` (`data/worldArt.ts`): immagini non caricate da Boot (vecchie pareti, iceberg non piazzati). Totale ora 867 MB: `world` 375, `beast` 325, `bgp` 107. **Prossimo passo se serve:** caricare solo le immagini delle navi in uso e delle bestie vicine.

## Lotto C6 (26 ottobre 2026) → v0.113.2

- **Bloccante:** `rescue` (`systems/fuel.ts`) spostava la nave senza farla riemergere. Ora `systems/ship/unstuck.ts`: `harbourShip` (molo a galla, portelloni chiusi, mezzi in stiva, aria piena), `vehiclesStuck`/`freeVehicles` (anche al caricamento in `createGame` e dal pulsante "Sono bloccato" della pausa).
- **Luoghi:** `BOTTOM_FADES` per `luogo_arco`, `luogo_galeone_1|2`, `luogo_balena` (via la sabbia dipinta) e `sink` più profondi in `data/landmarks.ts`; test che nessun luogo abbia sacche d'acqua dove entra un sub e che i residenti nascano in acqua libera.
- **Pareti:** `END_FADES` per `parete_*`; vicino alle Gallerie le pareti tornano (solo la parte piena deve stare fuori dal tunnel: `WALLS.endFade`).
- **Suono:** misurato nel browser (picco 0,18: non era la somma dei suoni); i riverberi delle musiche (`SeaMusic`, fino a 6 s, tre sempre attivi) ora si collegano solo mentre la musica suona e durano al massimo `MUSIC_ECHO_MAX` 2,5 s; limitatore `AUDIO.limiter`, `AUDIO.master` 0,55. Da confermare sull'iPhone.
- Test: `tests/lottoC6.test.ts`.

## Lotto C5 (26 ottobre 2026) → v0.113.1

- **Sfondi:** misurato che `followFloor` (media del fondale vicino, dal lotto C2) faceva salire e scendere le montagne di ~100 unità ogni 2 km; ora `SEA_RIDGE_SINK` (altezza fissa per aspetto, mediana misurata del fondale di ogni regione) sfumata con il mix degli aspetti; `SEA_RIDGE_SHADE`: le montagne si scuriscono da sole con la profondità, così la lampada non le illumina come se fossero vicine.
- **Fiamme:** `views/jetFlames.ts` (pool creato prima dello scafo, quindi dietro), `jets` in `data/fleet.ts` art e `data/submarine.ts`, numeri `JET_FLAME` in `data/ship.ts`.
- **Leva bloccabile:** pulsante `.helm-lock` "B" in `ui/helmControls.ts` (non salvato).
- **Ghiaccio:** `smashIce` in `systems/ship/uboat.ts` (rompe il ghiaccio sotto e attorno a ogni punto della sagoma), usato da `sail.ts` e `stepDive`.
- **Uscita dall'acqua:** `SUBMARINE.hop` (`s.leap`) e `SHIP.hop` (`stepHop`, `s.hop` disegnato da `shipView`), con gli eventi `breach`/`breachSplash`.
- Bolle a cerchio sostituite da `softBubble` (`views/bubbles.ts`) in shipWake, boatView, submarineView, battle/backdrop.
- **Caso simile da sistemare dopo:** i bagliori dipinti del Nightmare e del suo drone stanno nello strato sopra il buio (come gli occhi rossi prima): se una bestia passa davanti, il bagliore si vede sopra di lei.
- Test: `tests/lottoC5.test.ts`.

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

