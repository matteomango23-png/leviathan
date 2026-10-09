# Architettura

Mappa delle cartelle e dei sistemi. Si aggiorna ogni volta che cambia la struttura.

## Cartelle

| Cartella | Contenuto |
|---|---|
| `src/data/` | Tutti i numeri del gioco (fonte unica). File del kit (`rules`, `species`, `moves`, `world`) + `worldLayout.ts` (forma della costa e dell'oceano con `LAYOUT` e le trasformazioni `bay()`, `delta()`, `east()`, zone, banchi, alghe, coralli, santuari) + `diver.ts` (sub, arpione, sardine, telecamera, luce, colori del mare, salvataggi) + `beasts.ts` (movimento delle bestie grandi, combattimento, domatura, squadra, mosse, santuari, dove vivono) + `fleet.ts` (le 8 navi della flotta: numeri, mezzi, immagini) + `economy.ts` (porti Portofosco e Porto Fango, relitti, missioni, mercato, armi da pesca, sciami, altri pesci) + `progression.ts` (esperienza) + `story.ts` (l'inizio: dialoghi di Aurelio, immersione guidata, starter) + `scenery.ts` (grotta delle ossa, anfiteatro e galeone: luoghi della vecchia storia rimasti come scenario) + `temples.ts` (pianta dei templi, reliquie) + `cards.ts` (colori della rarità e cornici speciali delle schede) + `sprites.generated.ts` (scritto da `npm run art`). |
| `src/systems/` | Logica di gioco pura, senza Phaser: testabile con Vitest. |
| `src/views/` | Disegno con Phaser: fondali, rocce dipinte, luce, sub, pesci, alghe, effetti, telecamere. Nessuna regola di gioco. |
| `src/audio/` | Suoni sintetizzati con Web Audio: il mare (rombo e bollicine), i motori di nave e sottomarino e il ping del sonar (`engineSound.ts`), la musica di battaglia; il motore sta nella Session, i numeri in `data/audio.ts`. |
| `src/scenes/` | Scene Phaser: collegano sistemi, viste e input. |
| `src/ui/` | Interfaccia HTML sopra il gioco: HUD, controlli touch e tastiera, menu di pausa, esporta/importa. |
| `tests/` | Test automatici (Vitest). |
| `public/` | File serviti così come sono: sprite, illustrazioni, icone dell'app. |
| `scripts/` | Script di servizio: `make-icons.mjs` (icone), `art.ts` + `art/cutout.ts` (`npm run art`), `body-shapes.ts` (`npm run shapes`: forma dei corpi dai profili), `check-cycles.mjs` (controllo delle dipendenze circolari). |
| `prototype/` | Prototipi HTML di riferimento (non fanno parte del gioco). |
| `art-inbox/` | Immagini originali del proprietario con i nomi standard (`<id>_card`, `<id>_side`, `<id>_side_open`, `_left` se guarda a sinistra). `npm run art` le trasforma in `public/sprites/` e `public/art/`. |
| `docs/` | Design, decisioni, progressi, crediti. |

## Sistemi (`src/systems/`)

| File | Cosa fa |
|---|---|
| `world/worldGen.ts` | Genera la mappa a tile (1207×560, tile da 8) dalle forme di `worldLayout.ts`: costa con spiaggia, Baia, Isola delle Mangrovie (terra e roccia), Delta, mare aperto. Sempre lo stesso mondo. |
| `world/stretches.ts` | Le regioni dei 30 km (`regionAt`) e i tratti: di che tipo è ciascuno (dai pesi della regione) e il fondale naturale. |
| `world/templeSite.ts` | Dove stanno i templi sommersi e di cosa sono fatti (pianta in `data/temples.ts`), il fondale che li incontra, gli sfiatatoi interni. |
| `temple.ts` | I rompicapo dei templi: leva, due leve, rune nell'ordine del mosaico, reliquia; le porte aperte si salvano tra i tile rotti. |
| `world/endless.ts` | Il mare infinito a est della costa: tratti di 5 tipi (`data/endless.ts`) scelti da un seme fisso, fondale, collinette, ghiaccio, fosse, sfiatatoi; la mappa a tile gli chiede i pezzi quando servono. |
| `world/icebergs.ts` | Gli iceberg: dove galleggiano e quali punti sono ghiaccio solido (dalla maschera del disegno). |
| `beasts/legends.ts` | Le leggende: quali sono, dove vivono, quando una compare al posto di una bestia della sua specie. |
| `submarine.ts` | Il tuo sottomarino (al posto della barca): regalo a fine capitolo 1, Sali/Esci a qualsiasi profondità, guida con le leve fino alla profondità del modello, cure e risveglio accanto, urti delle bestie grandi, rimorchio e riparazione al porto, modelli in vendita (`data/submarine.ts`). |
| `helm.ts` | Le leve di nave e sottomarino: gas che resta, direzione (con la leva al contrario frena e da fermo si gira), Sali/Scendi; nodi mostrati. |
| `ship/ship.ts` | La nave da spedizione: regalo di Aurelio a Porto Fango, navigazione (inerzia, ghiaccio, corsia lontana, fondale basso), salvataggio (`data/ship.ts`). |
| `ship/hatch.ts` | Portelloni (uno per vano), rampa del sottomarino (cala e aggancia), A bordo e Tuffati. |
| `ship/boatBay.ts` | Il vano del motoscafo o della moto d'acqua: cala sull'acqua, Aggancia, travaso dei fusti nella nave all'aggancio. |
| `ship/uboat.ts` | Gli U-Boat: immersione con la leva fino alla profondità del modello, scafo che urta le rocce, aria (avviso, risalita automatica, ricarica a galla), passaggio sotto il ghiaccio. |
| `ship/geometry.ts` | Dove stanno nel mondo le parti dell'immagine della nave del modello (linea d'acqua, portellone, rampa, timone, scafo). |
| `ship/model.ts` | La nave che hai (`data/fleet.ts`): lunghezza vera, velocità, ripresa e frenata, serbatoio, sonar, immagine. |
| `ship/shipyard.ts` | Il cantiere navale di Porto Fango: più navi possedute (`g.fleet`, ormeggiate col loro carburante e i loro mezzi), comprare (col pieno), cambiare nave, vendere a metà prezzo. |
| `ship/stats.ts` | I numeri confrontabili di una nave e dei suoi mezzi (ripresa in secondi, autonomia in km, sonar in metri), barre e differenze con la nave in uso. |
| `ship/surface.ts` | Cosa incontra la nave in superficie: terra, iceberg, scogli, spiaggia; rompe il ghiaccio e lo fa richiudere lontano. |
| `vehicles.ts` | Nave, sottomarino e motoscafo insieme per `game.ts`: pulsanti del timone, scafi solidi, azioni (A bordo, Aggancia), porto dal timone o dal motoscafo, risveglio sulla nave. |
| `boat.ts` | Il motoscafo o la moto d'acqua (`data/boats.ts`): guida in superficie con le leve, fermo davanti al ghiaccio, riserva a secco, fusti, salvataggio. |
| `fuel.ts`, `fuelBurn.ts` | Carburante di nave e sottomarino: consumo e autonomia, travaso, rifornimento al porto, razzo di soccorso. |
| `hunts.ts` | Le cacce alle leggende: tane, voci nei porti, eco anomala col sonar, tracce, comparsa col tempo giusto; lettura del sonar al timone. |
| `beasts/residents.ts` | Gli abitanti fissi del mare aperto: chi vive in ogni tratto, dove si trova, chi è uscito o è stato preso. |
| `shipCamera.ts` | Dove guarda la telecamera: vista del timone a bordo, la tua altrimenti (il cambio è uno stacco con dissolvenza). |
| `chart.ts` | La carta nautica del cockpit: porti trovati, confini delle regioni, tane con l'eco, sottomarino, a ±2 km dalla nave. |
| `hull.ts` | Scafi solidi: spinge fuori i corpi che li toccano. |
| `endlessLife.ts` | La vita del mare infinito: sardine che seguono il sub, aria degli sfiatatoi (le bestie sono in `beasts/residents.ts`). |
| `world/tileMap.ts` | La mappa: tile, campo "roccia" smussato, collisioni rotonde, movimento dei corpi. |
| `world/zones.ts` | Nome della zona e profondità in metri. |
| `diver.ts` | Nuoto, scatto (costa aria), ossigeno, cuori, morte e rinascita in superficie. |
| `breath.ts` | Barra della pressione (sub e sottomarino) e serbatoi d'aria. |
| `rideAir.ts` | L'aria del cetaceo che cavalchi e le barre mostrate nell'HUD. |
| `harpoon.ts` | Arpione: va, aggancia un pesce o rimbalza sulla roccia, torna. |
| `fish.ts` | Banchi di sardine che vagano e scappano dal sub. |
| `weather.ts` | Il meteo (solo aspetto, non salvato): sereno, nuvoloso, pioggia, tempesta, nebbia; cambia da solo e sfuma piano; neve nei mari freddi (`coldAt`); lampi in tempesta. Numeri in `data/weather.ts`. |
| `birds.ts` | Stormi di gabbiani (solo aspetto, non salvati): ognuno vive sopra un banco di pesci vicino alla superficie, fa avanti e indietro e si tuffa; arrivano e se ne vanno solo fuori dallo schermo; col brutto tempo se ne vanno. |
| `game.ts` | Un passo di gioco completo + conversione da/verso il salvataggio. |
| `save/saveData.ts` | Formato del salvataggio con `version`, migrazioni, controllo di validità. |
| `save/storage.ts` | Lettura/scrittura nel browser, mai bloccante; copia di sicurezza se il salvataggio è rotto. |
| `input.ts`, `events.ts`, `math.ts` | Tipi di input ed eventi, rumore e numeri casuali ripetibili. |
| `beasts/forms.ts` | Versione di una bestia (comune, albino, alfa, variante unica, forma finale): nome, sprite, taglia, statistiche, stelle. |
| `beasts/roam.ts` | Bestie selvatiche in esplorazione: nuotano piano nel buio, si girano solo fuori dalla luce; ti puntano, ti ignorano o scivolano via secondo il carattere. |
| `encounters.ts` | Comparse delle bestie selvatiche e inizio della battaglia (al tocco, o al colpo di fucile: alle spalle attacchi tu per primo). |
| `beasts/spawnDraw.ts` | Chi compare quando c'è posto: estrazione pesata per rarità, meno per chi è già in acqua o appena visto; quote della mappa. |
| `beasts/wildState.ts` | Stato delle bestie selvatiche, comparsa e uscita. |
| `beastState.ts` | Stato condiviso delle bestie: selvatiche, squadra, cavalcatura, battaglia richiesta. |
| `battleResult.ts` | Prepara la battaglia dal gioco e ne applica il risultato (vita, esperienza, domate, sconfitta, Guardiano). |
| `abilities.ts` | Abilità delle cavalcature: lo squalo bianco sfonda le ossa, la megattera fa respirare. |
| `economy/gear.ts` | Denti, sacca dei pesci, mute e potenziamenti, armi, oggetti, zaino. |
| `economy/backpack.ts` | Uso dello zaino in immersione: armi, oggetti, sciami; legame con lo sciame di sardine. |
| `economy/missions.ts` | Bacheca: accettare, avanzare, riscuotere. |
| `economy/places.ts` | Molo di Portofosco, relitti e forzieri. |
| `weapons.ts` | Fiocine e rete. |
| `save/convert.ts`, `save/gearSave.ts` | Da partita a salvataggio e ritorno; controllo dell'equipaggiamento. |
| `beasts/combat.ts` | Danno delle mosse (tipi e moltiplicatori) e forma del corpo per i colpi. |
| `beasts/team.ts` | Squadra e riserva, sblocco delle mosse, KO, ricarica del richiamo. |
| `beasts/mount.ts` | La cavalcatura: chiamata dalla barra, arriva dal buio, ti porta, se ne va quando scendi. |
| `beastPlay.ts` | Collega tutto quello che riguarda le bestie in un passo di gioco (azione contestuale, domatura, morsi). |
| `feeding.ts` | Le bestie grandi in acqua mangiano i pesci vicini (nella sacca, o per crescere); al porto "Nutri" dalla sacca. |
| `beasts/growth.ts` | Esperienza, livelli, barra del cibo (31-50), forme finali. |
| `world/arena.ts` | La forma dell'anfiteatro di corallo (conca a gradoni scavata nel fondale; scenario, `data/scenery.ts`). |
| `story.ts` | L'inizio (la storia è in pausa dall'8 ottobre 2026): apertura sulla barca di Aurelio, immersione guidata, appuntamento a Porto Fango dove regala nave e sottomarino; obiettivo sotto i cuori; apre i dialoghi (il gioco si ferma). |
| `catching.ts` | Pesci catturati: cuore, ossigeno o sacca; nuove creature nel bestiario. |
| `save/storySave.ts` | Controllo della storia salvata. |
| `progress.ts` | Dopo ogni passo: esperienza alla squadra, missioni, profondità massima. |
| `world/lair.ts` | Forma della grotta delle ossa della Baia: grotta, pozzo, guscio di roccia (scenario, `data/scenery.ts`). |
| `beasts/sheet.ts` | Dati della scheda di una bestia: rarità, ruolo, statistiche, mosse di battaglia (e le prossime), mosse in mare. |
| `testTools.ts` | Strumenti del pannello di prova (`?prove`). |

## Scene (`src/scenes/`)

- **Boot** (`BootScene.ts`): carica gli sprite delle bestie (e li taglia in strisce), dipinge le texture procedurali e avvia World + UI.
- **World** (`WorldScene.ts`): fa girare il gioco e lo disegna con tre telecamere: sfondo (schermo), mondo (zoom, segue il sub), sovrapposizione (buio e luce).
- **UI** (`UIScene.ts`): HUD, controlli, barra della squadra, pulsante contestuale, pulsanti mossa, minigioco della domatura (HTML sopra il canvas, rispetta la safe area dell'iPhone).
- **Menus** (`MenusScene.ts`): menu di pausa (squadra in sola lettura, esporta/importa, pannello di prova con `?prove`) e porto di Portofosco (Mercato, Mute, Zaino, Bacheca, Recinto). Bestiario e scheda della bestia (stile carta).
- Le scene si passano un oggetto `Session` (`session.ts`: stato, input, messaggi): niente variabili globali.
- Fuori dalle scene: `main.ts` crea il gioco a piena risoluzione (massimo 2×), `pwa.ts` registra il service worker per giocare offline.

## Interfaccia (`src/ui/`)

| File | Cosa fa |
|---|---|
| `hud.ts` | Cuori, ossigeno, profondità, denti, messaggi, nome della zona. |
| `controls.ts` | Joystick, pulsanti touch e tastiera → comandi del gioco. |
| `huntDiary.ts` | Il Diario di caccia (cockpit) e gli Avvistamenti della bacheca: schede, scheda completa, "Segui". |
| `cockpit.ts`, `cockpit.css` | Il cockpit della nave: Plancia, Sonar, Diario, Recinto e Zaino. |
| `bridgePanel.ts`, `instruments.ts` | La plancia: obiettivo seguito, carta nautica ±2 km, quadranti (carburante, velocità), meteo, travaso, razzo. |
| `sonarScreen.ts` | Lo schermo sonar del cockpit (canvas animato). |
| `helmControls.ts`, `helmInfo.ts` | Le leve al timone della nave e nel sottomarino (gas, direzione, Sali/Scendi), gli strumenti (nodi, gas, profondità) e i pulsanti della nave (portellone, cala, tuffati). |
| `beastUi.ts` | Squadra in alto (chiama/richiama), pulsante contestuale, pulsanti mossa, minigioco della domatura. |
| `backpackBar.ts` | I tre posti dello zaino durante l'immersione. |
| `saveTransfer.ts` | Esporta e importa il salvataggio come file. |
| `testPanel.ts` | Pannello di prova (link con `?prove`). |
| `dom.ts` | Piccolo aiuto per creare gli elementi della pagina. |
| `icons.ts` | Icone SVG disegnate per il gioco. |
| `art.ts` | Indirizzo dell'illustrazione di una bestia. |
| `beastSheet.ts`, `bestiary.ts` | Scheda della bestia e bestiario. |
| `portMenu.ts`, `portTabs.ts`, `portCard.ts` | Porto a schermo intero: schede, card, zaino e bacheca. |
| `teamPanel.ts`, `pauseMenu.ts` | Squadra (con "Nutri" al porto) e menu di pausa. |
| `dialogueBox.ts` | Dialoghi della storia in basso (tocca per andare avanti, Salta). |
| `growthBars.ts` | Barre di esperienza e cibo. |
| `eventMessages.ts` | Il messaggio breve per ogni evento del gioco. |
| `hunterCardView.ts` (con `systems/hunterCard.ts`) | La tessera del cacciatore: numeri del viaggio e medaglie dei Guardiani battuti. |
| `bagScreen.ts`, `battleBag.ts` | Lo zaino a tasche come Pokémon, dal menu e in battaglia (su chi usare una cura, su quale mossa un Muschio). |
| `sheetPages.ts`, `evolutionScreen.ts` | Le 3 pagine della scheda di una bestia (Info, Statistiche, Mosse) e la schermata di evoluzione annullabile. |
| `movePanel.ts`, `levelUpPanel.ts`, `afterBattle.ts`, `screens.css` | Schermate come Pokémon: dettagli di una mossa, "impara mossa" (le 4 conosciute e la nuova), Ricordamosse, pannello della salita di livello, e il loro ordine a fine battaglia. |
| `huntView.ts` (views) | Le tracce vicino alle tane (carcassa, sangue nell'acqua) dopo l'eco anomala. |
| `shipView.ts` (views) | La nave dipinta: linea d'acqua, parte sommersa più blu, portellone che si apre, beccheggio, planata, scia, corsia lontana dietro le rocce. |
| `shipFx.ts` (views) | Effetti intorno alla nave: fumo delle ciminiere (dietro la nave), schegge di ghiaccio. Solo aspetto. |
| `boatView.ts` (views) | Il motoscafo o la moto d'acqua: immagine sulla linea d'acqua, beccheggio, immagine "accesa" col gas, scia e bolle. |
| `worldArtView.ts` (views) | Le pareti dipinte sui bordi dritti di pozzi e fosse e gli iceberg, solo vicino alla telecamera. |
| `seaMapPanel.ts` | La mappa del mare nel menu di pausa (zone esplorate, bestie e rarità); i dati li calcola `systems/seaMap.ts`. |

## Battaglia a turni (parte al contatto con una bestia; prova separata col link `?battaglia`)

| File | Cosa fa |
|---|---|
| `data/battle.ts`, `data/battleText.ts` | Numeri della battaglia (danni, stati, domatura, fuga, oggetti, squadra di prova) e testi. |
| `data/battleMoves.ts`, `data/moveBattle.ts`, `data/learnsets.ts` | Le mosse di battaglia prese da Pokémon con i nostri nomi (potenza, precisione, PP, effetti), come funzionano, e quali impara ogni specie a che livello. |
| `systems/beasts/battleMoves.ts` | Le mosse che una bestia conosce (al massimo 4): quelle di partenza, quelle nuove a ogni livello, dimenticare e ricordare. |
| `systems/battle/battleItems.ts`, `systems/economy/items.ts` | Cosa fa ogni oggetto (vita, rianimare, stati, PP, X) a una bestia, fuori e dentro la battaglia. |
| `systems/battle/fighter.ts` | Una bestia in battaglia: vita, mosse con i loro PP, stato e statistiche alzate o abbassate, danno di un colpo. |
| `systems/battle/status.ts` | Gli stati alterati (avvelenato, ferito, paralizzato, stordito, congelato) e le statistiche da −6 a +6. |
| `systems/battle/battle.ts` | Le regole: ordine dei turni, mosse ed effetti, scelta del nemico, domare, fuggire, cambiare bestia, fine. |
| `scenes/BattleScene.ts` | Fa scorrere i turni: chiede l'azione, mostra i passi; a fine battaglia chiede quale mossa dimenticare. |
| `systems/battle/stage.ts` | Quanto è grande ogni bestia (dalla lunghezza vera, tra un minimo e un massimo, sempre tutta nello schermo), quanto è rara una bestia (luccichio) e quale sfondo usa la battaglia. |
| `views/battleView.ts` | Le due bestie: grandezza, respiro e ondeggio, rincorsa e affondo, colpi, svenimenti, ombra e luce dietro; mette insieme sfondo, effetti e conchiglia. |
| `views/battle/backdrop.ts` | Lo sfondo a strati che si muove (acqua, rocce lontane, raggi, foschia, rocce medie, pedane con riflessi, neve marina e bolle, piante in primo piano, vignetta); usa gli strati dipinti quando ci sono. |
| `views/battle/backdropArt.ts`, `paint.ts` | I pezzi dello sfondo disegnati dal codice (in attesa di quelli dipinti) e i loro aiuti (colori, creste, grana). |
| `views/battle/typeFx.ts` | Gli effetti dei colpi per tipo: graffi, fulmini, schegge di ghiaccio, inchiostro, onde d'urto e sassi. |
| `views/battle/tameShell.ts`, `damageNumber.ts` | La conchiglia di cattura (dipinta o disegnata) e il numero del danno. |
| `views/battle/pose.ts`, `tween.ts` | La posa di una bestia (spostamenti, luce, buio, aura) e le animazioni come promesse. |
| `views/battle/beastArt.ts`, `battleAssets.ts` | Quale immagine usa ogni bestia e cosa si carica prima della battaglia. |
| `data/assets.ts` | Indirizzi delle immagini con la loro impronta, così il telefono non mostra copie vecchie. |
| `ui/battleUi.ts`, `ui/battle.css`, `ui/battleIcons.ts`, `ui/fonts.ts` | Riquadri, messaggi, comandi e mosse nello stile dei Pokémon recenti; icone dei comandi e dei tipi; il carattere Baloo 2. |

## Come si disegna il mare

1. **Sfondo** (`backgroundView`): colore dell'acqua per profondità, cielo (più scuro sotto le nuvole), raggi di luce (più deboli col cielo coperto), creste lontane con parallasse, neve marina; le nuvole del meteo (`weatherView`).
2. **Rocce** (`terrainView` + `terrainPainter`): pezzi da 128×128 unità dipinti un po' alla volta (massimo 4 ms per fotogramma, prima i visibili) attorno alla telecamera (bordi morbidi, ombra all'interno, sedimento sui ripiani, coralli) e riciclati per risparmiare memoria.
3. **Mondo**: la nave (`shipView`), molo e case di Portofosco, relitti e forzieri (`placesView`), alghe (`kelpView`), pesci (`fishView`), dardi, rete, sciame e scudo (`gearFxView`), bestie (`beastView` a strisce lungo la spina dorsale, `beastsLayer`), arpione e sub anche in groppa (`diverView`), gabbiani (`birdsView`), bolle e linea della superficie, più mossa col brutto tempo (`effectsView`); alcune alghe davanti al sub. Aurelio sul molo durante l'inizio è in `storyView`, coralli dell'anfiteatro e galeone in `sceneryView`; le mangrovie del Delta in `deltaView` (l'acqua torbida la fa `lightView` con `murkAt` di `world/zones.ts`). Le texture disegnate all'avvio sono in `textures.ts`, le tre telecamere in `cameraRig.ts`.
4. **Buio** (`lightView`): maschera a metà risoluzione, più scura con la profondità; la lampada (cono), l'alone e i santuari la "bucano"; bagliore caldo e vignettatura sopra. Il cielo coperto scurisce un po' vicino alla superficie.
4b. **Meteo** (`weatherView`, sopra il buio): pioggia o neve fino alla superficie, nebbia sull'acqua, lampi; tutto sparisce scendendo (`weatherReach`, 60 m).
5. Le bestie rare brillano un poco nel buio (`beastsLayer`). La vita e i danni si vedono solo in battaglia.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il gioco sul computer (http://localhost:5173). |
| `npm run dev:phone` | Come sopra, raggiungibile dall'iPhone sulla stessa rete Wi-Fi. |
| `npm run check` | Tutti i controlli: tipi, ESLint, dipendenze circolari (`scripts/check-cycles.mjs`), Prettier, test, build. Obbligatorio prima di ogni commit. |
| `npm run build` | Crea la versione pubblicabile in `dist/` (con il service worker per l'offline). |
| `npm run icons` | Rigenera le icone dell'app da `public/art/squalo_bianco.webp`. |
| `npm run art` | Elabora le immagini nuove di `art-inbox/` (`-- --force` per rifare anche quelle già presenti, `-- --only=<id>` per una sola bestia). |

## Pubblicazione

`.github/workflows/deploy.yml`: a ogni push su `main` GitHub esegue `npm run check` e pubblica `dist/` su GitHub Pages (https://matteomango23-png.github.io/leviathan/).
