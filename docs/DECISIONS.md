# Decisioni tecniche

Ogni scelta tecnica importante: data, decisione, motivo. Le più recenti in fondo.

## 2026-09-30 — Phaser 4.2.1 (ultima stabile)

**Decisione:** Phaser 4.2.1 + TypeScript strict + Vite, come da `CLAUDE.md` ("ultima versione stabile").
**Motivo:** Phaser 4 ha il nuovo renderer WebGL, più veloce e mantenuto. Phaser 3 è in sola manutenzione.
**Conseguenza:** in Phaser 4 gli oggetti `Rope` e `Mesh` citati in `CLAUDE.md` non esistono più. L'animazione a spina dorsale delle bestie (Sessione 2) si farà come in `prototype/prova-realistica.html`: l'immagine di profilo viene tagliata in strisce verticali che seguono la spina dorsale, ognuna ruotata e accorciata. Stesso risultato visivo, nessuna libreria in più.

## 2026-09-30 — Dati del kit lasciati intatti

**Decisione:** `src/data/` (rules, species, moves, world) è stato spostato senza modificare nulla ed è escluso dalla formattazione automatica (Prettier).
**Motivo:** `CLAUDE.md` chiede di usarli "così come sono". Passano già il controllo dei tipi strict e ESLint. I test in `tests/data.test.ts` verificano che siano coerenti (34 bestie, 102 mosse, riferimenti validi).

## 2026-09-30 — Strumenti di controllo

**Decisione:** `npm run check` = TypeScript (`tsc --noEmit`) + ESLint + Prettier + Vitest + build di Vite. Va eseguito prima di ogni commit.
**Dipendenze di sviluppo:** `typescript`, `vite`, `vitest`, `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-config-prettier` + `globals`, `prettier`. Sono gli strumenti standard per ciascun controllo; nessuno finisce dentro il gioco.

## 2026-09-30 — Unità del mondo e telecamera

**Decisione:** le coordinate del mondo sono i "pixel" del prototipo (unità). Il sub è lungo 12 unità = 2 m, quindi 6 unità = 1 m. La telecamera mostra 160 unità in altezza (`CAMERA.viewHeightUnits`), come la vista del prototipo e la "telecamera lontana" della prova realistica.
**Motivo:** si porta il generatore del mondo del prototipo senza cambiare forme e velocità, già provate giocando.

## 2026-09-30 — Rocce: tile per la logica, disegno smussato

**Decisione:** il mondo resta una mappa a tile (come nel prototipo). Collisioni e disegno usano però un campo smussato tra i centri dei tile, così le rocce sono morbide e il contorno che si vede è esattamente quello contro cui si sbatte. Le rocce sono dipinte al volo a pezzi di 256 unità (3 pixel per unità) e riciclate (14 pezzi in memoria).
**Motivo:** grafica dipinta senza scalini e poca memoria sull'iPhone.

## 2026-09-30 — Interfaccia in HTML sopra il gioco

**Decisione:** HUD, joystick, pulsanti e menu sono elementi HTML sopra il canvas di Phaser.
**Motivo:** testo nitido a ogni risoluzione, safe area dell'iPhone con `env(safe-area-inset-*)`, selezione file per l'importazione dei salvataggi.

## 2026-09-30 — PWA con vite-plugin-pwa

**Decisione:** `vite-plugin-pwa` (Workbox) genera il manifest e il service worker con la copia di tutti i file del gioco (codice, sprite, illustrazioni, icone).
**Motivo:** è lo strumento standard per Vite; scriverlo a mano sarebbe più fragile.
**Aggiornamenti:** una nuova versione non interrompe mai un'immersione. Viene applicata quando l'app va in secondo piano (dopo il salvataggio automatico).

## 2026-09-30 — sharp per le immagini

**Decisione:** `sharp` (solo strumento di sviluppo) crea le icone dell'app dall'illustrazione dello squalo. Servirà anche per `npm run art` (Sessione 2).

## 2026-09-30 — Salvataggi

**Decisione:** salvataggio in `localStorage` con `game`, `version`, posizione, pesci catturati, bestiario e tempo di gioco. Si salva ogni 10 s, a ogni cattura e quando l'app va in secondo piano. Le migrazioni passano da una versione alla successiva, una alla volta. Un salvataggio rotto non viene mai sovrascritto senza una copia (`leviatano-save-rotto-<data>`). Esporta: foglio di condivisione dell'iPhone ("Salva in File"), altrove un download. Importa: scelta del file, controllo di validità, conferma.

## 2026-09-30 — Direzione grafica realistica

**Decisione:** confermata dal proprietario la grafica realistica dark fantasy di `CLAUDE.md` e `prototype/prova-realistica.html`. Le frasi sulla "pixel art" in `docs/GDD.md` e `docs/ART.md` sono state allineate.

## 2026-09-30 — Sessione 2: animazione a strisce al posto di Rope/Mesh

**Decisione:** `src/views/beastView.ts` taglia il profilo (1000×460) in 26 strisce verticali. Ogni striscia segue un tratto della spina dorsale: è ruotata e accorciata come nella prova realistica (coda che ondeggia, testa quasi ferma). Le strisce si sovrappongono del 7% per non mostrare fessure. Per la bocca aperta si cambia immagine (`<id>_open`).
**Motivo:** Phaser 4 non ha Rope/Mesh. Costa poco (26 immagini per bestia) e il risultato è uguale alla prova.

## 2026-09-30 — Regole del combattimento delle bestie

- **Danno di una mossa** = morso della bestia (`statsAt`, che cresce già del 4% per livello) × `POWER_MULT` della mossa × moltiplicatore di tipo × bonus (`x2vsWounded`) × (1 − difesa del bersaglio). La crescita del 4% non viene applicata due volte.
- **Lo squalo selvatico** attacca con un affondo durante un passaggio: prima apre le fauci e rallenta (il segnale per schivare), poi accelera e morde. Dopo il morso prosegue ed esce: non si gira mai in vista. Da calmo attacca nel 35% dei passaggi; se l'hai colpito, a ogni passaggio per 30 s.
- **Sfinimento:** sotto il 25% della vita (`TAMING.exhaustionThresholdFraction`) diventa domabile per 20 s. Un doppione della versione comune invece fugge (GDD).
- **Domatura:** "tre errori concessi" = tre errori sono perdonati, il quarto fa fallire. Senza squadra la differenza di livello si misura da `TAMING_FLOW.levelWithoutTeam` (1).
- **In sella** i morsi li prende la bestia (GDD). Il compagno che morde un selvatico ne riceve metà del danno in cambio.
- **Il compagno può girarsi in vista** con un'animazione di virata: la regola "non si girano mai in vista" vale per le bestie selvatiche.

## 2026-09-30 — Dove vive lo squalo bianco

**Decisione:** `WILD_SPAWNS` in `src/data/beasts.ts`: lo squalo compare quando sei nella Baia di Portofosco (x 80–1900, fino a circa 60 m). Nella Baia c'è anche un santuario (`SANCTUARIES`).
**Motivo:** nel prototipo lo squalo stava nelle grotte crepuscolari, oltre i 90 m, troppo profonde per l'ossigeno della muta leggera; la Baia (0–60 m in `REGIONS`) è la sua regione nei dati.

## 2026-09-30 — Pannello di prova

**Decisione:** aprendo il gioco con `?prove` in fondo al link, nel menu di pausa compare un pannello per far apparire una qualsiasi delle sei versioni dello squalo, avere uno squalo di livello 15 (tutte e 3 le mosse) e curarsi.
**Motivo:** Titano, Mega albino e lo Sfregiato arrivano normalmente con la crescita (tappa 4) e il Guardiano (tappa 4). Senza pannello non si potrebbero vedere adesso. Il gioco normale non cambia.

## 2026-09-30 — npm run art e cartella del proprietario

**Decisione:** `scripts/art.ts` (TypeScript eseguito direttamente da Node 24) + `scripts/art/cutout.ts` (funzioni pure, testate). Non sovrascrive mai i file già pronti senza `--force`. Il suffisso `_left` specchia i profili rivolti a sinistra (torpedine). Le immagini della cartella "asset animali ai" sono state copiate in `art-inbox/` con i nomi standard; la cartella originale resta sul computer ed è esclusa da git (sarebbe un doppione).
**Dipendenza aggiunta:** `@types/node` (solo per controllare i tipi degli script; separato dal codice del gioco con `tsconfig.scripts.json`).

## 2026-09-30 — Salvataggio versione 2

**Decisione:** aggiunti `team` (bestie domate: forma, livello, vita, KO, squadra o riserva), `sanctuary` (dove rinasci) e `brokenTiles` (ossa rotte). Prima migrazione reale: v1 → v2 aggiunge i campi vuoti. Una bestia sconosciuta nel file di importazione blocca l'importazione con un messaggio chiaro.

## 2026-09-30 — Sessione 3: porto ed economia

- **Portofosco** è al molo sopra il punto di partenza (x 2400): arrivando in superficie vicino al molo compare "Porto". Il porto ha il suo santuario: cura sub e squadra e diventa il punto di rinascita. Le scorte del mercato si rinnovano a ogni visita.
- **Pesci:** se ti manca un cuore la sardina ti cura, altrimenti il pesce va nella sacca e si vende al mercato (`sellPrice` in world.ts). Aggiunti gli sgombri nella Baia.
- **Mute:** la muta fissa la profondità massima: oltre, il sub viene spinto su con un avviso (cambiato in v0.3.1: l'ossigeno scende più in fretta). Il muro di ossa (circa 163 m) richiede la muta rinforzata (500 m).
- **Potenziamenti:** in vendita solo quelli con effetto già nel gioco (apnea, lampada potenziata, lampada abissale); lampo sonar e nuoto controcorrente sono visibili ma "in arrivo".
- **Armi:** le fiocine sono nel relitto della Baia, la rete nel relitto della Barriera. Folgore e arpione runico arriveranno con le loro regioni.
- **Zaino:** 3 posti scelti al porto. In immersione si toccano: un'arma diventa quella del pulsante arpione (ritoccandola si torna all'arpione), un oggetto si usa, uno sciame si chiama.
- **Arpione mitico:** una sola scorta finché non cade un Guardiano (tappa 4). Usato, il prossimo colpo entro 20 s porta subito al minigioco.
- **Missioni:** 8 missioni semplici sulla bacheca (massimo 3 attive); il progresso conta dopo averle accettate; i denti si riscuotono al porto.
- **Sciame di sardine:** si lega dopo 10 sardine catturate in totale (anche quelle prima della versione 0.3.0). Nello zaino assorbe fino a 6 morsi per 8 s.
- **Bestie della Baia:** barracuda, tartaruga marina e torpedine usano le stesse regole di movimento dello squalo. Al massimo 2 bestie selvatiche intorno a te nello stesso momento (`WILD_RULES.maxPresent`). La tartaruga non attacca se non la colpisci.
- **Solo le cavalcature si cavalcano** (ruolo "cavalcatura" in species.ts): barracuda e torpedine (compagni) e tartaruga (supporto) combattono e usano le mosse da soli.
- **Varianti senza immagine** (es. barracuda alfa): usano lo sprite e l'illustrazione della specie. `npm run art` scrive `src/data/sprites.generated.ts` con le immagini disponibili, così il gioco non chiede mai file mancanti.
- **Salvataggio versione 3** con l'equipaggiamento (`gear`). Migrazione v2 → v3. Gli id sconosciuti in un file importato vengono scartati.

## 2026-09-30 — Orche e bestie leggendarie

Decisioni del proprietario sulle orche matriarche, la Madre delle madri, l'orca preistorica albina e il coccodrillo albino leggendario: vedi `docs/GDD.md`. Sprite e illustrazioni pronti (`orca_matriarca`, `orca_matriarca_finale`, `orca_preistorica_albina`, `coccodrillo_marino_leggendario`). Il comportamento arriva con le loro regioni.

## 2026-09-30 — Correzioni v0.3.1 (dopo la prova del proprietario)

- **Costa ovest e porto:** a ovest della Baia c'è la terraferma (`COAST` in `worldLayout.ts`); il molo è a x 160, la partenza (`START`) è accanto al molo. Sopra la superficie a ovest della riva la mappa è roccia (terra), sotto la riva scende in pendenza fino a `COAST.maxY`.
- **Tartaruga marina 2 m** (scelta del proprietario, "tartaruga gigante"). Le bestie hanno `speedMult` in `BEAST_TEMPER` (tartaruga 0,4, torpedine 0,65).
- **Velocità in sella:** l'accelerazione ora tiene conto dell'attrito dell'acqua, altrimenti la velocità massima in sella non si raggiungeva mai (trovato con un test). In sella `rideSpeedMult` 1,6 e scatto proprio (`TEAM_RULES.rideDash`).
- **Affondo nei morsi:** ogni morso dà una spinta in avanti (`MOVE_RULES.biteLunge`); in sella la spinta va al sub.
- **Le bestie grandi mangiano** (`FEEDING` in `beasts.ts`, `systems/feeding.ts`): solo taglia grande o colossale; il pesce va nella sacca come se l'avesse pescato il sub.
- **Oltre la profondità della muta** l'ossigeno scende più in fretta (`SUIT_RULES`) invece di spingere su il sub: più naturale e lascia la scelta al giocatore.
- **Virata a partire dalla testa** (il proprietario non vuole per ora un'immagine di tre quarti): ogni striscia si gira con un ritardo che cresce verso la coda, a metà passa di taglio, si scurisce e il corpo si inarca. Vale per le bestie domate e per le selvatiche contro una parete (`TEAM_RULES.turnSeconds`).
- **Fondale dipinto un po' alla volta:** `ChunkPaintJob` divide il lavoro di ogni pezzo e ne fa al massimo 4 ms per fotogramma; i pezzi visibili si dipingono subito, quelli vicini in anticipo. Pezzi più piccoli (128 unità) e meno pixel (2,5 per unità) per non bloccare l'iPhone.
- **Rarità come le carte:** 1 grigio, 2 verde, 3 blu, 4 viola, 5 oro (`data/cards.ts`); cornici speciali per albino, alfa, varianti uniche e forme finali.
- **Scheda e bestiario:** i dati li prepara `systems/beasts/sheet.ts` (niente calcoli nell'interfaccia). Icone disegnate a mano in SVG (`ui/icons.ts`), nessuna libreria nuova.
- **Menu del porto a schermo intero** con schede a sinistra e card a destra; l'HUD si nasconde (classe `in-port`) per non sovrapporsi.
