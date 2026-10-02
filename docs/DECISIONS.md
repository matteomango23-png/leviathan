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

## 2026-09-30 — Sessione 4: livelli, crescita e Lo Sfregiato

- **Chi prende l'esperienza** (scelta del proprietario): tutta alla bestia in acqua o cavalcata, un quarto alle altre della squadra (`XP_RULES` in `data/progression.ts`). Si prende quando una bestia selvatica viene sfinita, o fugge perché è un doppione; una sola volta per ogni sua apparizione, così non si può "farmare" la stessa bestia.
- **Ricompensa:** 12 × livello^1,5, ×1,5 per albini e alfa, ×4 per un Guardiano. La curva dei livelli è quella già scritta in `rules.ts` (`xpCurve`). Primo bilanciamento: circa 2-3 bestie del proprio livello per salire.
- **Salendo di livello** la vita persa resta la stessa (non si cura tutto). Il Krill dorato passa dallo stesso sistema: sblocca le mosse e dà la forma finale come un livello normale.
- **Crescita 31-50:** con l'esperienza piena la bestia aspetta la barra del cibo (8 pesci). Il cibo arriva da due parti: la bestia grande in acqua mangia i pesci che attraversa (quando ha fame il pesce va a lei invece che nella sacca) e al porto il pulsante "Nutri" le dà un pesce della sacca (quello di cui ne hai di più). Così crescono anche le bestie piccole, che non mangiano da sole.
- **Forma finale al 50** solo per le specie iconiche; l'albino ha la sua solo dove è definita (Mega albino), l'alfa e le varianti uniche nessuna.
- **Salvataggio versione 4:** ogni bestia ha `xp` e `food`; l'equipaggiamento ha `guardians` (Guardiani già sconfitti).
- **Tana dello Sfregiato** (scelta del proprietario): una grotta chiusa sotto il fondale della Baia (x 780, `LAIR` in `data/guardians.ts`), scavata esattamente e circondata da roccia piena, così nessun'altra grotta ci sbuca dentro. Si entra da un pozzo chiuso da due file di ossa antiche: serve la Carica (livello 7); lo Sfregiato è di livello 8.
- **Lo scontro:** dentro la grotta le bestie si girano contro le pareti (virata visibile ammessa da CLAUDE.md). Fase 1: giri e affondi, con le fauci aperte come segnale. Sotto il 70%: morsi a raffica (3) e colpo di coda se sei dietro. Sotto il 50%: due squali di livello 4 scendono dal pozzo, una volta per scontro. I suoi morsi tolgono un cuore in più. Durante lo scontro le altre bestie selvatiche non arrivano.
- **Dopo** (scelte del proprietario): sfinito dà 800 denti e rinnova l'Arpione mitico solo la prima volta, e si può domare. Morte o uscita dalla grotta durante lo scontro: riparte a vita piena, nessuna penalità. Domatura fallita (o uscita lasciandolo sfinito): scappa e torna nella tana dopo la prossima visita al porto. Domato: la tana resta vuota.
- **Barra del Guardiano** in alto al centro con la tacca di sfinimento; la barretta sopra la bestia per il Guardiano non si mostra.

## 2026-09-30 — Sessione 5: pulizia

- **Controllo delle dipendenze circolari** fatto con un piccolo script nostro (`scripts/check-cycles.mjs`, dentro `npm run lint` e quindi `npm run check`) invece di una libreria esterna: sono 50 righe e non aggiungono dipendenze. Conta anche gli import di soli tipi.
- **Tolto codice mai usato:** `pointHitsBody`, `sameForm`, `isVisibleWild`, `KRILL_LEVELS`, `paintChunk`. I file del kit in `src/data` restano come sono, anche dove qualcosa non è ancora usato (es. `speciesById`, `SKINS`): servirà nelle prossime tappe.
- **Numeri di gioco spostati nei dati:** invulnerabilità dopo la rinascita, distanza di ritorno dell'arpione, distanza di fuga delle sardine, taglia massima delle bestie intrappolate dalla rete, margine di colpo delle armi, intervallo dei morsi a raffica e attesa del primo attacco del Guardiano, proporzioni dello schermo usate nei test. Restano nel codice solo numeri di animazione e di forma (apertura delle fauci, posizioni del disegno).

## 2026-09-30 — Sessione 6: storia del capitolo 1

- **Scelte del proprietario:** lo Sfregiato è lo squalo perduto di Nonno Aurelio (il collare di ferro lo collega alla trama); l'apertura è giocabile sulla barca con la nave della Compagnia che passa dal vivo; il capitolo finisce con Aurelio e la nave che salpa verso est; le partite già iniziate riprendono dal punto giusto.
- **Testi e scene nei dati** (`data/story.ts`): dialoghi, obiettivi, tracce, tempi e posizioni. La logica (`systems/story.ts`) è pura e testata; la vista (`views/storyView.ts`) disegna nave, balena, Aurelio, incendio e tracce; l'interfaccia (`ui/dialogueBox.ts`) mostra i dialoghi.
- **Il gioco si ferma durante un dialogo** (nessun pericolo mentre leggi). Gli eventi prodotti chiudendo un dialogo dall'interfaccia (es. il tuffo) aspettano in una piccola coda e partono al passo di gioco successivo.
- **La storia parte solo per una partita nuova vera** (nessun salvataggio). Le partite create senza salvataggio dai test o dagli strumenti hanno la storia spenta (`'off'`), così i test esistenti restano validi. Un salvataggio vecchio senza storia riprende da "Trova lo squalo di Aurelio", oppure da "Capitolo 1 completato" se lo Sfregiato è già in squadra.
- **Salvataggio versione 5:** `story` con il passo, l'indice dell'immersione guidata, le tracce trovate e i dialoghi già visti. Nave, dialogo aperto e tempi di scena non si salvano: un salvataggio fatto durante l'apertura la fa ripartire con la nave.
- **La balena della nave** usa lo sprite `megattera` (caricato all'avvio insieme alle bestie della Baia). Nel finale la nave non trascina la balena: partendo vicino al porto sarebbe finita sulla terraferma.

## 2026-10-01 — Sessione 7: capitolo 2, il Delta delle Mangrovie

- **Scelte del proprietario:** il cuore del capitolo è liberare la megattera dell'apertura; il Delta sta tra la Baia e la Barriera (il mondo si allarga); per ora solo il coccodrillo marino (e il raro coccodrillo albino leggendario), il coccodrillo del Nilo forse più avanti come coccodrillo comune; la comandante si chiama la Vedova Nera.
- **Il mondo si allarga di 520 unità (65 colonne) a x 1940:** tutto quello che stava a est (Barriera, Foresta, Ghiaccio, fosse, santuari, relitti, banchi) è stato spostato della stessa misura, una volta sola e con un controllo automatico (test su zone, relitto, ghiaccio).
- **Salvataggio versione 6:** le ossa rotte sono salvate come numero di casella (riga × colonne + colonna); con più colonne vanno rinumerate, e un sub salvato a est va spostato. La migrazione v5 → v6 lo fa; un test lo controlla.
- **Il Delta:** fondale a circa 30 m, isolotti di mangrovie sopra l'acqua (terra solida, radici solo disegnate), acqua torbida: più buio, tinta bruna e lampada più corta (`DELTA.murk`), con passaggio graduale ai bordi.
- **Coccodrilli marini:** seguono le regole delle bestie grandi, ma passano appena sotto la superficie e scendono solo per mordere (`BEAST_TEMPER.surface`). Il coccodrillo albino leggendario è una variante unica (livello 14) che compare al 3% al posto di un coccodrillo marino (`RARE_UNIQUES`).
- **La Vedova Nera:** la sua nave è all'ancora al centro del Delta con la balena incatenata a 3 ancoraggi sul fondale. Avvicinandoti parla lei; poi il coccodrillo del Delta diventa il suo (alfa, livello 12, barra grande in alto). Gli ancoraggi si rompono con le armi (8 colpi d'arpione ciascuno). Liberata, la megattera (livello 10) si unisce alla squadra e nuota con te; la nave salpa verso la Barriera Rossa e il coccodrillo la segue, a meno che tu non l'abbia domato.
- **Non si salva** lo stato degli ancoraggi: se ricarichi a metà, lo scontro nel Delta riparte (come per i Guardiani).
- **Due capitoli, un solo stato della storia:** `systems/story.ts` è il capitolo 1 e la parte comune; `systems/chapter2.ts` il capitolo 2; `systems/chapters.ts` li unisce (chiusura dei dialoghi, obiettivo) senza dipendenze circolari.

## 2026-10-01 — Svolta dopo la prova completa del proprietario

Dopo 25 minuti di gioco il proprietario ha finito tutti i contenuti: livellare era lento, il combattimento in tempo reale poco divertente (le bestie a immagine piatta non possono girarsi, quindi passano e scappano e non si possono inseguire), i compagni inutili, le missioni senza peso. Decisioni:

- **Tutto quello che non è il combattimento copia Pokémon:** progressione per zone con livelli crescenti e boss di poco sopra, cattura più difficile per le bestie rare, squadra sempre accessibile, zaino con gli oggetti, schermate e flusso alla Pokémon.
- **Combattimento a turni 1 contro 1, come Pokémon**, aperto quando tocchi o colpisci una bestia durante l'esplorazione (che resta in tempo reale). In più: quando il nemico attacca, un tocco al momento giusto fa schivare, **e deve essere difficile**.
- **Doppioni:** nella scheda della bestia un pulsante "Potenzia" (solo se hai doppioni di quella specie) apre un sottomenu dove scegli i doppioni da sacrificare e vedi quanta esperienza guadagna.
- **Tipi sempre visibili** su scheda e bestiario, con forte contro / debole contro.
- **Arma:** fucile subacqueo; si mira e si spara solo con lo stick destro (un tocco sullo schermo non spara più); quando cavalchi non spari.
- **Ordine dei lavori:** 1) correzioni veloci (salvataggi e nuova partita, fucile, pulsanti, albini riconoscibili, sub incastrato nel fondale, pulsante contestuale); 2) prova di una battaglia a turni da provare sull'iPhone; 3) se piace, nuovo design di battaglia, cattura, progressione e doppioni, e si riadattano Baia e Delta; 4) storia con ritratti, mondo più grande, grafica degli ambienti. Il capitolo 3 aspetta.

## 2026-10-01 — Prova della battaglia a turni (link con `?battaglia`)

- **Una scena vera, non una pagina usa e getta:** `scenes/BattleScene.ts` (turni), `views/battleView.ts` (disegno), `ui/battleUi.ts` + `battle.css` (riquadri e menu), regole pure in `systems/battle/` (`fighter.ts`, `battle.ts`, `dodge.ts`), numeri in `data/battle.ts`, testi in `data/battleText.ts`. Per ora parte solo col link `?battaglia` (squadra di prova contro una bestia a caso di Baia e Delta); il gioco normale non cambia finché il proprietario non approva.
- **Come Pokémon:** turno per turno, ordine per velocità (lo scatto passa prima, le mosse lente dopo; cambiare bestia, usare un oggetto, domare e fuggire vengono sempre prima). Tre mosse per bestia dai dati, sbloccate ai livelli 1/7/15; le mosse forti si ricaricano per qualche turno (ricarica in secondi dei dati ÷ 4). Danno = formula già esistente (morso × potenza × tipo × difesa) × differenza di livello (8% per livello, tra metà e il doppio) × un po' di caso, colpi critici 1/16.
- **Effetti delle mosse:** più colpi, danno doppio sui feriti, colpo di grazia, stordimento (perde il turno), cura, scudo (metà danno per 2 colpi), presa (la tua può stordire; quella nemica non si può schivare).
- **Schivata difficile:** un anello si chiude sulla tua bestia in 0,55-1,05 s, a volte si ferma un attimo (finta). Tocco entro ±0,09 s = nessun danno, entro ±0,2 s = metà, altrimenti colpo pieno.
- **Domare come una Poké Ball:** probabilità per stelle (85% → 12%), × 0,6 per albini e alfa, × 0,35 per varianti uniche, cresce quando la bestia è sfinita, cala di 15% per ogni livello sopra la tua bestia più forte. Tre scosse della conchiglia. Arpione mitico = tentativo ×3.

## 2026-10-01 — La battaglia a turni entra nel gioco (dopo la prova del proprietario)

- **Il combattimento in tempo reale si elimina del tutto.** Resta solo la battaglia a turni, da migliorare molto (immagini, animazioni, interfaccia).
- **Innesco: bestie visibili**, come nei Pokémon recenti. Nuotano lente nel buio come sagome che la lampada illumina, si girano solo fuori dal cono di luce; se ti toccano attaccano per prime; se le colpisci col fucile alle spalle parti tu con vantaggio. Ognuna ha un carattere (chi ti ignora, chi ti punta, chi si allontana piano ma senza mai sparire di colpo). Le rare e leggendarie brillano, hanno un suono e vanno raggiunte. Guardiani e comandanti fissi nelle tane e sulle navi.
- **Schivata:** quando il nemico attacca compare un grande pulsante SCHIVA con una barra che scorre; si tocca quando passa nella zona stretta. Rallentatore e spiegazione la prima volta. Difficile ma chiaro.
- **Cavalcature fuori dalla battaglia: viaggio e abilità** della specie (sfondare ossa, respirare senza ossigeno, vincere correnti, rompere ghiaccio) per aprire zone; niente più compagno che ti segue combattendo.
- **Immagini per la battaglia** (le genera il proprietario con Gemini): per ogni bestia tre quarti davanti (`<id>_front`, il nemico) e tre quarti da dietro (`<id>_back`, la tua), più le versioni a fauci aperte; sfondi di battaglia per regione, ritratti dei personaggi, la Conchiglia del domatore. Finché mancano, le card ritagliate fanno da segnaposto. Effetti degli attacchi da asset gratuiti con licenza libera.

## 2026-10-01 — Battaglia più bella (prima di continuare la storia, scelta del proprietario)

- **Grandezze relative, come Pokémon** (corretto dopo la prima prova del proprietario): la più grande delle due bestie ha la misura standard (58% dell'altezza dello schermo), l'altra in proporzione (rapporto reale ^ 0,73, mai sotto il 26%). Due tartarughe sono entrambe di misura normale; squalo contro torpedine: lo squalo è più del doppio. **I giganti sono sempre enormi** (almeno 82%): leggendari, forme finali, Guardiani e bestie con un nome, specie colossali. La bestia selvatica × 0,82 perché più lontana; se è più alta di metà schermo sta un po' più in basso, così la testa resta dentro. Numeri in `BATTLE_STAGE`, regola in `systems/battle/stage.ts` con test.
- **Sfondo a strati che si muove**, scelto dal proprietario: li genera lui con Gemini, a strati (lontano, medio, primo piano, pedana). Gemini colora di verde solo l'acqua aperta e dipinge il resto, quindi lo script ricava il primo piano tenendo solo le rocce ai lati e quelle scure che pendono dall'alto (`frameMask`), e la pedana ritagliandola a ellisse (`fitStage`). Un luogo senza dipinti propri usa quelli della Baia con la sua tinta (Delta verde torbido, tana più buia) e sopra i suoi elementi disegnati (radici, costole). Finché mancano, li disegna il codice con i colori del luogo; sopra ci sono sempre le parti animate (raggi che ondeggiano, foschia che scorre, riflessi sulle pedane, neve marina, bolle, piante, deriva lenta della telecamera).
- **Luogo della battaglia:** la tana se la bestia è di un Guardiano, altrimenti la regione della sua specie (Baia o Delta; le altre usano la Baia finché non hanno il loro sfondo).
- **Interfaccia nello stile dei Pokémon recenti**, scelta del proprietario ("non da gioco cheap alla Elden Ring"): pannelli di vetro scuro inclinati, comandi in un blocco in basso a destra (Lotta grande sopra, gli altri in coppie, ognuno col suo colore e un'icona tonda), mosse del colore del tipo, messaggi in basso solo quando non si sceglie. Carattere **Baloo 2** (arrotondato, scelta del proprietario). Colori cupi da dark fantasy (cremisi, bronzo, verde bosco, verde acqua, blu ardesia) con bordi bronzo, dopo che i primi erano "troppo accesi". Nomi lunghi che scorrono invece dei puntini. Le bestie rare hanno il riquadro che luccica d'argento, i giganti d'oro; brillano di scintille ed escono dal buio come sagome nere (i giganti fanno tremare il mare).
- **Nuova dipendenza `@fontsource/baloo-2`** (SIL Open Font License): il carattere è dentro il gioco, quindi funziona offline. Si caricano solo le lettere latine nei pesi 600, 700 e 800 (`ui/fonts.ts`).
- **Effetti per tipo disegnati dal codice** (graffi, fulmini, ghiaccio, inchiostro, onde d'urto), senza librerie né file esterni: leggeri sull'iPhone e coerenti coi colori dei tipi.
- **Immagini a tre quarti scontornate dallo script**: il colore del fondo si legge dai bordi, si toglie una cornice sottile, e lo sfondo arriva solo attraverso zone scure *larghe*, così le ombre del corpo di uno squalo scuro non vengono bucate. Il suffisso `_flip` specchia un'immagine rivolta dalla parte sbagliata.

## 2026-10-01 — Ritocchi dopo la prova della v0.8.0 sull'iPhone

- **La tua bestia è più grande e più al centro** (× 1,22, è vicina alla telecamera; pedana al bordo in basso, come in Pokémon) e il suo riquadro è compatto (senza la riga del tipo), così non la copre più.
- **Schivata più difficile:** finestra perfetta ±0,065 s (era 0,09), mezzo danno ±0,15 s (era 0,2), anello più rapido (0,45-0,95 s) e finte più frequenti (45%).
- **Fuga in base alla forza della bestia:** 60% di base, +20% se sei più veloce, +10% a ogni tentativo, −6% per ogni livello sopra il tuo, −8% per ogni stella di rarità oltre la prima, −25% contro un gigante; sempre tra 5% e 95% (`fleeChance` con test).
- **Pinne tagliate dal bordo dell'immagine:** lo script sfuma la bestia dove tocca il bordo, invece di lasciare un taglio dritto (`fadeCutEdges`).

## 2026-10-01 — Aggiornamento all'apertura

- Una versione nuova trovata nei primi 8 secondi dopo l'apertura (schermata iniziale, nessuna immersione in corso) si applica subito, con un ricaricamento. Le altre come prima: quando l'app va in secondo piano. Motivo: il proprietario riapriva i link di prova e vedeva ancora le immagini vecchie.

- **Impronta nell'indirizzo delle immagini** (`?h=` + 8 caratteri dell'MD5, scritti da `npm run art` in `ASSET_HASHES`, usati da `data/assets.ts`): anche dopo l'aggiornamento, il browser dentro l'app del telefono mostrava ancora una vecchia immagine dello squalo bianco con lo stesso nome. La copia offline ignora il parametro `h`, quindi funziona anche senza rete. Un test controlla che le impronte corrispondano ai file.

- **Inquadratura controllata da un test** (`tests/battleFraming.test.ts`, richiesta del proprietario): ogni immagine di battaglia, come tua e come selvatica, alla misura più grande possibile su un iPhone in orizzontale (844×390): almeno l'85% della bestia sullo schermo e non più del 12% della sua altezza tagliato in alto. La posizione è una regola pura (`placePicture`) usata sia dal gioco sia dal test. I giganti selvatici scendono di 0,9 × quanto superano metà schermo.

## 2026-10-01 — Prima finire l'esplorazione, poi la storia (scelte del proprietario)

- **Mondo:** costa disegnata a mano a sinistra (porto su una spiaggia in pendenza, Baia, isola che esce dall'acqua con un passaggio sotto e un secondo porto, Delta attaccato alla terraferma alla foce di un fiume) + **oceano aperto infinito a destra**, generato a pezzi da un seme, con biomi (barriera, foresta, ghiaccio, fosse, tunnel) più rari man mano che ti allontani; i luoghi della storia a distanze fisse dalla costa. Si salvano solo seme e modifiche.
- **Bestie uniche** (es. squalo albino leggendario): una sola nel mondo; se scappa la ritrovi con l'1% ogni volta che compare la sua specie; **se la sconfiggi sparisce per sempre**. Varianti rare comuni intorno al 5% delle comparse della specie.
- **Ordine delle tappe:** 1) costa vera + cavalcature più lente; 2) oceano infinito con biomi, mute per immersioni di 4-5 minuti e punti di ricarica dell'ossigeno; 3) barca propria (viaggi in superficie, pesca dalla barca, indicatore "metri dalla costa"); 4) bestie uniche. Poi templi con percorso e rompicapo, e la storia (capitolo 3).

## 2026-10-01 — Tappa 10: come è fatta la costa

- Il disegno a mano già esistente (Baia, Delta, mare aperto) non è stato riscritto: i dati lo usano attraverso tre trasformazioni (`bay()` allarga ×1,6 da x 1700, `delta()` ×1,6 da x 5000, `east()` sposta di 3372), così le posizioni restano leggibili e la conversione dei salvataggi usa la stessa regola (scritta con numeri fissi, come le altre migrazioni). La tana dello Sfregiato si sposta ma non si allarga (la sua grotta è precisa).
- La spiaggia ha uno scalino sotto il molo (6 m in 43 unità) e poi una pendenza di 4,6 unità per unità di profondità (circa 12°): con la sola pendenza dolce il sub toccava la sabbia sotto il molo.
- L'isola è roccia sopra e sotto l'acqua fino a ~27 m; la terra emersa e la roccia hanno la stessa larghezza (altrimenti la roccia veniva tagliata dal bordo della zona e diventava un muro dritto).
- Porto Fango è un porto completo (scelta del proprietario); si rinasce nell'ultimo porto in cui si è entrati.
- Velocità (scelta del proprietario): sub 7 m/s, squalo in sella circa 1,3 volte il sub.

## 2026-10-01 — La prima bestia, le evoluzioni, il KO (dopo la prova della v0.9.0)

- **Problema:** con le battaglie a turni senza bestie non si poteva né combattere né domare, e il capitolo 1 (lo Sfregiato) era bloccato.
- **Tre bestie iniziali uniche** (scelta del proprietario: cuccioli leggendari di tre tipi): Zanna (Predatore), Guscio (Corazzato), Scintilla (Tempesta), livello 5. Con il cerchio dei cinque tipi un triangolo perfetto non esiste: Corazzato batte Predatore, Tempesta batte Corazzato, Predatore e Tempesta sono pari. La scelta compare dopo l'apertura, o al caricamento di una partita senza bestie; il gioco aspetta (`systems/starter.ts`, salvata come `starter` in `story.seen`).
- **Evoluzioni** ai livelli 16 e 36 (`evolvesTo`, `evolveLevel` in `species.ts`): la bestia cambia specie e tiene le mosse del primo stadio (`movesFrom`). Immagini provvisorie da una bestia simile (`artFrom`) finché arrivano quelle del proprietario (`docs/PROMPT-INIZIALI.md`). Gli altri due iniziali torneranno come bestie uniche rare, adulte, nell'oceano (tappa delle bestie uniche).
- **Squadra tutta KO:** come Pokémon, se una bestia selvatica ti tocca perdi i sensi e ti risvegli al santuario o al porto di casa con tutti curati, perdendo il 10% dei denti (`BLACKOUT`).

## 2026-10-01 — Esperienza e mare pieno (v0.9.2)

- **Decisione:** ogni pesce catturato o mangiato dà `3 + livello` XP alla bestia in acqua (o alla prima della squadra); curva `12·L^1,5`, premio di battaglia `18·L^1,5`. Le comparse possono essere "visitatrici" fuori dalla loro regione con un campo `level` proprio (squalo martello 5-7 e tigre 6-8 nella Baia).
- **Motivo:** il proprietario vuole un ritmo Pokémon (prima evoluzione presto, seconda un po' dopo, 50 lungo) e un mare pieno di bestie comuni con qualche squalo; i livelli propri evitano che uno squalo tigre di livello 12 distrugga un iniziale di livello 5. Un test controlla il ritmo (meno di 30 combattimenti al 16, meno di 60 dal 16 al 36).

## 2026-10-01 — Compagni che seguono, seconde forme cavalcabili (v0.9.3, scelta del proprietario)

- **Decisione:** ogni bestia si chiama dalla barra; chi non è cavalcatura nuota dietro al sub e mangia i pesci (stesso oggetto `Mount` con stato `follow`). Le seconde forme delle linee iniziali hanno `rideSpeedMult` 0,75: si cavalcano più lente. Nuovo campo `girth` (spessore dell'immagine di profilo) per Folgore, il cui disegno è un serpente sottile.
- **Motivo:** con un iniziale piccolo il proprietario non vedeva mai la sua bestia nel mare fino al livello 36; le forme finali devono essere mastodontiche rispetto agli squali (bianco 6 m, megalodonte 18 m).

## 2026-10-01 — Suoni sintetizzati nel codice (v0.9.6)

- **Decisione:** primi suoni generati con Web Audio (rumore filtrato, oscillatori, batteria sintetica), note e volumi in `data/audio.ts`; nessuna libreria e nessun file audio. Il motore vive nella `Session` e si sblocca al primo tocco (obbligo di iOS).
- **Motivo:** il proprietario vuole "un minimo" di suono subito; così niente licenze, niente peso in più per l’app offline, e si potrà sostituire con musiche vere più avanti.

## 2026-10-02 — Sfondamento, livelli minimi, morso per taglia (scelte del proprietario)

- **Sfondamento:** le ossa antiche le rompe ogni Predatore o Corazzato dal livello 16 (o una bestia nata con `sfondaOssa`), cavalcato o che ti segue; vicino alle ossa un avviso spiega cosa serve. Il proprietario: "almeno devi grindare un minimo".
- **Livelli minimi:** pavimento = grandezza (piccola 0, media 2, grande 6, colossale 12) + rarità (1★ 0 … 5★ 14), albino +3, alfa +5; lo squalo bianco ha `minLevel` 15 (raro di suo). 5% di esemplari "fuori scala" (+5…10). La distanza dalla costa arriverà con l'oceano infinito. Il livello degli animali non segue quello della squadra (si perderebbe la sensazione di crescere).
- **Morso:** × taglia (piccola 0,75 … colossale 1,45); cavalcature con morso base 2,6 (era 2) perché le forme finali degli iniziali mordevano meno della seconda.
- **Conchiglia aperta:** l'immagine dipinta aveva il fascio di luce tagliato dal bordo; ora si usa la conchiglia chiusa e la luce (raggi sfumati) la disegna il gioco.

## 2026-10-02 — Piano B: conchiglie, esche, mappa, branchi (approvato dal proprietario)

- **Conchiglie:** una per tentativo; 5 all'inizio (salvataggio v8 le regala alle partite esistenti, numero scritto nella migrazione perché i dati possono cambiare); non vanno nello zaino rapido (`battleOnly`).
- **Esche:** per gruppi di specie, non per singola specie, perché le zone hanno poche voci di comparsa; le specie attirate superano il limite di bestie presenti.
- **Zone visitate:** salvate nell'elenco `seen` come `zona:<nome>` invece di un campo nuovo del salvataggio (nessuna migrazione, il bestiario conta solo gli id delle specie).
- **Branchi:** per ora solo grafici (il capobranco è l'unico che combatte); la battaglia contro più bestie è da decidere con il proprietario.
- **Predatori fuori zona:** inseguono fino a `chaseLeash` oltre la loro zona, poi si calmano per `homeSeconds` e tornano; per la regola "mai girarsi in vista" si girano solo fuori dalla luce.

## 2026-10-02 — Virata ad anello della cavalcatura

- **Decisione:** la bestia che cavalchi (o che ti segue) si gira passando per la verticale (muso in su, o in giù se si stava tuffando) e cambia lato in cima, dove le due facce si somigliano; il sub e la cavalcatura si inclinano fino a ~70° nella direzione del nuoto.
- **Motivo:** il proprietario trovava brutta la virata piatta (la sagoma che si stringe) e lo scivolare orizzontale in discesa. Le bestie selvatiche restano come prima: per regola si girano solo fuori dalla luce.
