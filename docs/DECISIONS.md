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

## 2026-10-02 — Tappa 11: come è fatto l'oceano infinito

- **Seme fisso:** il mare infinito è lo stesso per tutti (seme in `data/endless.ts`): niente da salvare, e la storia potrà mettere i suoi luoghi a distanze fisse.
- **Mappa a pezzi:** la parte fatta a mano resta un array (1207 colonne); oltre, la `TileMap` chiede al generatore pezzi da 64 colonne e li tiene. I tile rotti si numerano come prima nella parte a mano e dopo di essa colonna per colonna: i salvataggi non cambiano.
- **Più righe (560):** servono per le fosse; la costa fatta a mano sotto la sua vecchia profondità è roccia (controllo veloce `handMadeBottom`).
- **Tratti:** 5 tipi, 1800 unità (300 m) ciascuno, raccordati sul fondale; fosse e ghiaccio più frequenti lontano. Livello delle bestie = base del tipo + 2 per km (più i minimi per grandezza e rarità e i "fuori scala").
- **Bestie e sardine "che seguono":** pochi posti (5 bestie, 6 banchi) che si spostano vicino al sub invece di riempire un mondo infinito.
- **Ossigeno:** sfiatatoi nel punto meno profondo tra alcuni candidati di ogni tratto (un limite fisso di profondità lasciava i tratti lontani senza aria) e due mute da 4-5 minuti.

## 2026-10-02 — Pareti dipinte e iceberg

- **Pareti:** decorazione sopra la roccia che c'è già (le collisioni restano quelle dei tile), solo sui bordi verticali lunghi dei pozzi fatti a mano e delle fosse del mare aperto, per tre quarti dentro la roccia. Materiale secondo il posto (roccia, corallo, ghiaccio).
- **Iceberg:** il ghiaccio solido viene dal disegno stesso (`npm run art` scrive una maschera 40 colonne e la linea dell'acqua), così si urta il ghiaccio che si vede. La linea dell'acqua disegnata da Gemini viene tolta (ogni striscia orizzontale sottile).

## 2026-10-02 — Bestie nuove dalle immagini del proprietario

- Il proprietario ha generato bestie non previste dal kit (tonno, delfino, pesce luna, scorfano, pesce napoleone, pesce spada, squalo volpe, tricheco, elefante marino): aggiunte ai dati con statistiche e mosse coerenti con il loro tipo e ruolo (comuni o non comuni, bestie del mare aperto). Il coccodrillo della serie è il coccodrillo del Nilo (Delta).
- I loro profili hanno fondi scuri con particelle e bagliori: per loro lo scontorno parte dal bordo e tiene solo il pezzo più grande; dove una vista ha due animali sovrapposti si usa l'altra (pesce spada e beluga senza bocca aperta per ora).

## 2026-10-02 — Tappa 12: la barca (scelte del proprietario)

- **Si ottiene** da Aurelio alla fine del capitolo 1 (le partite che l'hanno già finito la ricevono al primo passo di gioco); **si rinasce sulla barca** dopo un KO di tutta la squadra o la morte (stessa perdita di denti di prima); **niente viaggio istantaneo**, si naviga sempre.
- A bordo il sub non nuota: la barca lo porta in superficie (aria piena, nessuna bestia selvatica lo raggiunge, nessuna bestia si chiama). Il pulsante dell'arma diventa "Pesca": attesa casuale, poi una finestra di 0,9 s per toccare.
- **Salvataggio v9:** `boat: { x } | null`. Se si salva a bordo, si riparte in acqua accanto alla barca.
- Ormeggio a PORT.x + 110, fuori dalla portata del molo: altrimenti il pulsante mostrava "Porto" invece di "Sali".

## 2026-10-02 — Tappa 13: le leggende (scelte del proprietario)

- **Leggende** = unici con `chance` in `UNIQUE_VARIANTS`: compaiono solo nel loro posto (tipo di tratto del mare aperto e distanza minima, o dove vive la loro specie), al posto di una bestia della specie. Non compaiono se sono già tue, già in acqua o sconfitte (salvataggio v10). Sfregiato e Regina bianca restano guardiani ("palestre" della storia) e non sono leggende.
- **Lista:** coccodrillo albino (Delta, 3%: "non così raro"), squalo martello preistorico e tartaruga preistorica (create dal proprietario, 1%), Madre delle madri (1%), orca preistorica albina (0,4%, livello 45: "uno dei più fighi e tosti"). Lo squalo albino leggendario resta l'evoluzione dello squalo albino. L'Orca matriarca è l'alfa dell'orca.
- La tartaruga preistorica è lunga 14 m, tranquilla e galleggia in superficie ("quasi un'isoletta").

## 2026-10-02 — Tappa 14: il primo tempio sommerso

- **Pianta scritta a caratteri nei dati** (`data/temples.ts`), una cella = 16 unità (2 tile).
  - Si legge e si modifica senza toccare il codice.
  - Il generatore del mare infinito chiede prima al tempio (`templeTileAt`), poi fa il resto.
  - Il tempio sta nel centro del primo tratto del suo tipo oltre la distanza minima: è sempre nello stesso posto senza doverlo salvare.
- **Rompicapo scelti per un telefono in orizzontale:** usano solo azioni che il gioco ha già, cioè sparare e nuotare.
  - Una leva da colpire.
  - Due leve da colpire entro 6 s.
  - Rune da toccare nuotando, nell'ordine del mosaico.
  - Un corridoio con sfiatatoi.
  - Scartate le piastre da tenere premute con il compagno: il compagno segue il sub e non resta fermo dove serve.
- **Porte salvate come tile rotti**, come le ossa di Sfondamento. Hanno un tipo di tile proprio (`TILE.gate`), così non si apre per sbaglio altro. Il rompicapo a metà non si salva: riparte da capo.
- **Reliquie nell'equipaggiamento** (`gear.relics`).
  - I vecchi salvataggi non hanno il campo e partono vuoti, quindi non serve una nuova versione del salvataggio.
  - La prima reliquia porta il consumo d'aria a 0,65.
- **`world/stretches.ts` staccato da `endless.ts`:** il tempio deve conoscere i tratti per trovare il suo posto, e `endless.ts` deve conoscere il tempio per i tile. Senza separarli ci sarebbe un giro di import.

## 2026-10-02 — Tappa 15: capitolo 3, la Barriera Rossa

- **Re Corallo al livello 20** (scelta del proprietario: "anche livello 20"); `wildLevel` del Re Corallo portato a [20, 20].
- **Battuto non sparisce:** una bestia della storia (`storyBoss`) dopo la battaglia resta lì e decide la storia (`beaten` scritto da `finishBattle`). Così "sfinito, rompi le catene e lo domi" del GDD diventa: battaglia, poi catene, poi si unisce. Se lo domi in battaglia le catene cedono da sole, per non chiedere due volte la stessa cosa.
- **Catene solo a re sfinito:** prima rimbalzano ("prima calmalo"), così l'ordine della storia è chiaro.
- **Salvataggio senza nuova versione:** lo stato del capitolo sta nella lista "seen" della storia (`CHAPTER3_MARKS`, accettati da `storySave`).
- **Granchio di fronte:** in mancanza di un profilo, un granchio visto di fronte che cammina di lato è proprio come si muove un granchio. `BeastSprite` usa l'immagine frontale di battaglia se manca il profilo; l'animazione a pezzi aspetta i pezzi separati.
- **Lo sfondo "tana"** in battaglia solo per i Guardiani nelle tane (`w.guardian`), non per ogni bestia della storia.

## 2026-10-03 — Iceberg, vita, fondo verde

- **Iceberg mai fino al fondale:** invece di tagliare il disegno, quelli troppo profondi si rimpiccioliscono (`ICEBERG_MAX_DRAFT`). Il disegno resta intero e sotto c'è sempre spazio.
- **Il disegno è il ghiaccio:** dentro il riquadro di un iceberg il pittore del fondale non dipinge, e il vecchio ghiaccio procedurale lì vicino non c'è. La collisione resta la maschera dell'immagine.
- **Fondo verde:** da ora le immagini si chiedono su verde #00FF00 (proposta del proprietario). Lo script riconosce il bordo verde e usa lo scontorno a chiave; il fondo nero resta supportato.

## 2026-10-03 — Tappa 16: il sottomarino al posto della barca (proposta del proprietario)

- **Perché:** con la barca si raggiungevano subito le zone lontane, che hanno livelli alti, e gli iceberg la bloccavano. Il sottomarino va sotto gli iceberg ed è limitato da velocità e profondità del modello: le zone lontane si raggiungono quando hai i denti per un modello migliore.
- **Dentro non si combatte:** le bestie normali scappano. Quelle aggressive di almeno 7 m (`SUBMARINE.giantLengthM`) lo urtano invece di aprire una battaglia.
- **Rotto:** viene rimorchiato a Portofosco, con la stessa perdita di denti del KO. Si ripara a pagamento entrando in un porto. Uno scafo a zero non si muove finché non è riparato.
- **Resta dove lo lasci** e ti risvegli accanto a lui (come con la barca).
- **Salvataggio v11:** `sub` sostituisce `boat`. La barca diventa il batiscafo nello stesso punto, appena sotto la superficie.

## 2026-10-03 — Tappa 17: i lavori di Aurelio (proposta del proprietario)

- **Un passo di storia, non missioni della bacheca:** i lavori guidano l'inizio uno alla volta (obiettivo in alto) e si chiudono al molo. Le missioni della bacheca restano facoltative.
- **Lavori scelti per insegnare** pesca, battaglia, domatura e crescita, così il giocatore arriva alle ossa dello Sfregiato con una squadra. Il livello 9 è un primo valore, da regolare giocando.
- **Salvataggio:** i progressi in `story.jobs` (facoltativo, i vecchi salvataggi partono da zero) e i lavori pagati nella lista "seen". Nessuna nuova versione.

## 2026-10-03 — Grandezza in battaglia secondo la forma dell'immagine

- Le immagini di battaglia stanno in un quadrato con il lato più lungo fisso. Così una bestia larga e bassa (tartaruga da dietro) o alta e stretta sembrava molto più piccola di quanto è.
- `npm run art` misura ogni immagine e scrive `BATTLE_ART_FLAT`: il lato lungo diviso la radice di larghezza × altezza. In battaglia la grandezza si moltiplica per quel valore elevato a 0,8, al massimo ×1,55 (`BATTLE_STAGE.flat`).
- Nella virata della cavalcatura il corpo resta dritto: la piega calcolata dalla velocità di rotazione, sommata alla verticale, girava la coda sottosopra.

## 2026-10-03 — Tappa 18: capitolo 4, la Foresta Sommersa

- **Il Corno delle Catene** è il primo pezzo della reliquia. Lega la Piovra col suono, non con un collare nuovo: così la reliquia "che piega le bestie" si vede in azione.
- **Due meccaniche nuove**, confermate dal proprietario:
  - la **campana** da spezzare, un bersaglio come gli ancoraggi del Delta ma sopra di te, vicino alla superficie;
  - i **tentacoli** che si annunciano (alghe che si muovono, bolle) prima di alzarsi; se ti prendono ti liberi con lo Scatto.
- **Piovra livello 25** (proprietario). Battuta resta e si unisce, come il Re Corallo, senza catene da spezzare dopo: il collare si spezza da solo.
- **Immagini provvisorie** con `artFrom` (il polpo gigante), come per i compagni iniziali in attesa delle loro.

## 2026-10-03 — Aggiornamenti della PWA su iPhone; virata di lato

- **iPhone:** un'app aggiunta alla Home viene quasi sempre ripresa dallo sfondo, non riaperta. Il service worker cerca la versione nuova solo al caricamento della pagina, quindi gli aggiornamenti non arrivavano e il proprietario eliminava l'app, perdendo il salvataggio. Ora `pwa.ts` chiama `registration.update()` a ogni ritorno sullo schermo e ogni 30 minuti. Una versione trovata entro 8 s dal ritorno si applica subito (salvataggio, poi ricarica); una trovata dopo, all'uscita dall'app.
- **Versione nel menu Pausa** e avviso di esportare prima di eliminare l'app: lo spazio dell'app sulla Home è separato da Safari e si cancella con lei.
- **Virata delle cavalcature di lato** (scelta del proprietario tra tre opzioni). Il giro per la verticale sembrava una capriola completa.

## 2026-10-03 — Il mare vivo

- **Profondità per specie nel mare aperto** (`SPECIES_DEPTH`): una bestia degli abissi a pelo d'acqua rompeva l'atmosfera, e la superficie era povera. Ogni specie ha una profondità minima o massima; il punto di comparsa sta dentro quella fascia.
- **Barriere coralline in acqua bassa:** dove il fondale è davvero tra 10 e 30 m (la spiaggia di Portofosco, due punti della Barriera Rossa), non dove sembrava sulla mappa. La Baia è profonda circa 50 m.
- **Solo i pesci vicini si simulano:** con banchi più grandi (circa 900 pesci) le collisioni di tutti costavano troppo. Quelli a più di 420 unità dal sub seguono il banco senza collisioni; tanto non si vedono.
- **Rarità:** come prima, è data dalle stelle della specie, dal tempo di ricomparsa e dal peso nei biomi del mare aperto. Le specie rare hanno tempi lunghi (calamaro gigante, capodoglio, megattera, orca).

## 2026-10-03 — Grandezze in battaglia su uno spettro fisso

- **Prima** la grandezza dipendeva dalla coppia (la più grande alla misura standard, i giganti almeno all'82%): la stessa bestia cambiava grandezza da una battaglia all'altra e i giganti a volte uscivano dallo schermo.
- **Ora** ogni bestia ha la sua grandezza: la lunghezza vera su scala logaritmica tra 0,5 e 30 m, portata tra il 40% e il 100% dell'altezza dello schermo (`BATTLE_STAGE.size`). Scala logaritmica perché il proprietario vuole che 25 e 30 m, o 2 e 5 m, sembrino simili, ma il piccolo resti ben visibile.
- **Sempre dentro lo schermo:** `npm run art` misura dove ogni immagine non è trasparente (`BATTLE_ART_BOX`); `fitSize` calcola la grandezza massima che ci sta (con un margine per il dondolio). La selvatica troppo alta scende fino al 97% dello schermo prima di rimpicciolirsi.
- Restano: la tua più vicina (×1,22), la selvatica più lontana (×0,82), le immagini piatte un po' più grandi, murena e manta corrette a mano.

## 2026-10-03 — Evoluzioni: niente immagine di riferimento

- Allegare a Gemini la card dell'animale base fa uscire lo stesso animale con piccole modifiche, non un'evoluzione. Le evoluzioni si chiedono **solo a parole**, descrivendo una trasformazione forte (più grande, preistorica, spine, colori, scariche), poi decide il proprietario.
- Le immagini del lotto 3 non sono andate perse: sono diventate gli **alfa** delle loro specie (`<id>_alfa_*`, già previsti dal gioco), una bestia unica (Beluga spettro) e due evoluzioni vere (Istrice gigante, Napoleone corazzato).
- Le evoluzioni nuove tengono le mosse della prima forma (`movesFrom`), come i compagni iniziali; la quarta mossa si decide più avanti.

## 2026-10-03 — Vita e morso ×10, livelli più pesanti

- Con 10 di vita a livello 11 il danno minimo (1) era un quinto della vita: un livello 1 faceva paura a un livello 11. Vita e morso di base sono ×10 (`ROLE_BASE`), il salvataggio passa alla v12 moltiplicando la vita delle bestie.
- `BATTLE.levelEdgeClamp` scende a 0,3: chi è molto più basso fa al massimo 0,3 del danno.
- Il supporto morde 1,8 (era 1); la Corazza viva di Guscio fa danno basso oltre allo scudo.
- In battaglia come Pokémon (`BATTLE_STAGE.fit`): la selvatica intera a destra di `foeLeft`, non sotto il 62% dello schermo; la tua con il bordo destro (la testa, vista da dietro) entro `youRight` e la cima sotto `youTop`, il resto può uscire in basso e a sinistra. Una regola sola per tutti gli animali, niente categorie a mano.
- Nel mare ogni bestia è disegnata lunga almeno `RENDER.minLengthM` (1,3 m).

## 2026-10-03 — Albini solo con immagini proprie, proporzioni tra le due bestie

- Un albino senza immagini sue era la specie schiarita: il proprietario non lo vuole. `hasAlbinoArt` (card, profilo, davanti e dietro) decide se un albino può comparire; al caricamento quelli senza immagini tornano comuni.
- Le grandezze in battaglia restano per bestia, ma `battleSizes` confronta le due: se la tua è più corta, la sua presenza (radice dell'area disegnata) non supera `smallerYours` × quella della selvatica × il rapporto delle loro lunghezze.
- I tre compagni iniziali combattono tutti come "compagno".

## 2026-10-03 — Le regole di battaglia di Pokémon (fase 1 di 3)

- Il proprietario vuole le stesse dinamiche di Pokémon, con i nomi nostri. Fase 1: statistiche, danno e tipi.
- **Statistiche** (`data/stats.ts`): sei, formula Gen III+ senza EV e nature; valori individuali 0–31 da un seme (`BeastForm.seed`: dato all'incontro, tenuto alla domatura; le bestie vecchie lo prendono dal loro uid). Le basi si calcolano da rarità (totale come Pokémon: 330–580), ruolo, grandezza e tipo; una specie può avere le sue (`base`).
- **Fisico/speciale per tipo**, come Pokémon fino alla 3ª generazione: Predatore e Corazzato fisici, gli altri speciali. Nella fase 2 ogni mossa avrà la sua categoria.
- **Danno** (`combat.ts baseDamage`, `fighter.ts hitDamage`): formula Gen V+, STAB 1,5, critico 1/24 ×1,5, casuale 0,85–1; via il vecchio vantaggio di livello. Potenze per classe: 40, 60, 90, 120 (fase 2: per mossa).
- **Tipi**: ×2 / ×½, ognuno forte contro due e debole contro due (il successivo e il terzo dopo nel cerchio).
- Salvataggio v13: le bestie tornano in piena salute (la vecchia vita non vale più).
- La velocità di nuoto quando cavalchi resta a parte (`swimSpeedOf`).
- Fonti: Bulbapedia (Damage, Stat), Smogon, Pokémon Wiki.

## 2026-10-03 — Le mosse di Pokémon (fase 2 di 3)

- **Regole di ogni mossa** in `data/moveBattle.ts` (`moveBattleOf`): potenza, precisione, PP, categoria, priorità ed effetti si ricavano dalla classe di potenza e dai suoi `fx` (quelli del mare aperto), pensando alla mossa Pokémon simile; si possono fissare a mano in `MOVE_OVERRIDES`. Così le 102+ mosse non vanno riscritte una per una.
- **PP al posto della ricarica a turni**, salvati sulla bestia (`TeamBeast.ppUsed`, facoltativo nel salvataggio: niente nuova versione). Tornano pieni con la guarigione completa, come al Centro Pokémon.
- **Stati** (`systems/battle/status.ts`): i 5 di Pokémon con nomi di mare; ferito = scottatura. Immunità: Glaciale al congelamento, Tempesta alla paralisi, Abissale al veleno. Stadi −6…+6 con le formule di Pokémon; un colpo critico ignora gli stadi sfavorevoli.
- **Categoria**: per ogni mossa (danno: fisica se il tipo è Predatore o Corazzato, altrimenti speciale; senza danno: di stato). Una mossa "variabile" usa la statistica d'attacco più alta.
- **Lotta disperata**: potenza 50, chi la usa perde un quarto della sua vita.
- Fonti: Bulbapedia (Status condition, Stat modifier, PP, Priority).

## 2026-10-03 — Oggetti e stati come Pokémon

- Gli stati restano dopo la battaglia (`TeamBeast.status`, `sleepTurns`, salvati); spariscono con la guarigione completa e quando la bestia è sfinita. Niente danno da veleno fuori dalla battaglia (come Pokémon dalla 5ª generazione).
- Oggetti (`ItemDef.use` in `data/world.ts`, regole in `systems/economy/items.ts`): quelli di Pokémon con nomi di mare e prezzi circa 0,3 × quelli di Pokémon. Le regole di Pokémon: una pozione non serve a una bestia sfinita o in piena salute, il revitalizzante solo a una sfinita, una cura solo al suo stato. Gli X alzano di 2 (dalla 7ª generazione) e solo in battaglia.
- L'Alga curativa diventa una Pozione (20 PS) e non rianima più.
- Tasche dello zaino (`ItemDef.pocket`): Cure, Battaglia, Esche, Varie.

## 2026-10-03 — Scheda in 3 pagine ed evoluzione annullabile

- Scheda come il Riassunto di Pokémon (`ui/sheetPages.ts`): Info, Statistiche, Mosse. Ordine delle mosse modificabile (`swapMoves`: i PP seguono la mossa). Punti esperienza totali = curva del gruppo al livello + resto (`totalXp`).
- Evoluzione: al livello giusto la bestia diventa `evolveReady`; evolve a fine battaglia con la schermata (o dalla scheda, se è salita fuori dalla battaglia). Annullata, ci riprova al livello dopo (come il tasto B di Pokémon). Salvate `evolveReady` e `met` (dove l'hai domata: le acque di casa della specie).

## 2026-10-03 — Livello massimo 100

- Il proprietario: "100". La formula delle statistiche (livello / 100), le curve di esperienza e le evoluzioni al 16 e al 36 sono quelle di Pokémon, pensate per 100.
- Forme finali al 100 (al livello massimo, come prima al 50). Crescita col cibo dal 51, +0,8% a livello (circa +40% in tutto, come prima), 3 pesci a livello.
- Liste delle mosse: fino al 16 invariate, oltre allungate ×1,5 (finiscono verso il 65, come in Pokémon).
- I livelli delle bestie nel mondo non cambiano: i capitoli fatti arrivano verso il 27; quelli futuri useranno i livelli oltre il 50.

## 2026-10-03 — Inquadratura della battaglia come Pokémon gen 5

- Pokémon gen 3–5: ogni Pokémon sta in un riquadro fisso (96×96 in gen 5), la grandezza è "schiacciata" e non realistica (Wailord riempie il riquadro, Pikachu un terzo): come la nostra scala logaritmica, che resta. Il tuo è visto da dietro e ingrandito (×2 in gen 5), tagliato dal bordo basso; il nemico sta intero sulla pedana in alto a destra.
- Da noi: la tua bestia ×1,45 (era 1,22), fino a 1,8 altezze di schermo e 2,4 sotto youTop; larghezza al massimo 1,3 × lo spazio a sinistra (un pesce lungo e sottile restava troppo fuori). La selvatica resta intera (richiesta del proprietario del 3 ottobre).
- Maestosità: ingresso con la telecamera (`BATTLE_STAGE.intro`): da 5 m in su parte vicina sulla bestia (×1,4, giganti ×1,6), si ferma 0,45 s e si allarga in 1,2 s; i giganti fanno tremare il mare.

## 2026-10-03 — Mosse di Pokémon e niente schivata

- Il proprietario: "facciamo uguale a Pokémon e togliamo la schivata; prendi la lista delle mosse e le loro statistiche, rinominale e inseriscile allo stesso modo".
- **Mosse di battaglia separate da quelle del mare**: `data/battleMoves.ts` (circa 135 mosse Pokémon, valori Gen IV–VII, nomi nostri; il commento dice quale mossa copiano). Le mosse di `data/moves.ts` restano per la cavalcata in mare aperto (i 3 pulsanti), da ripensare più avanti.
- **Tipi**: restano i nostri 5 (decisione del proprietario). Predatore ← Normale, Buio, Lotta, Drago; Abissale ← Veleno, Spettro, Psico, Fuoco (le bocche idrotermali: ferisce come la scottatura); Glaciale ← Ghiaccio, Acqua; Tempesta ← Elettro, Volante; Corazzato ← Roccia, Acciaio, Terra e le chele.
- **Categoria per mossa** (non più per tipo), come Pokémon dalla 4ª generazione.
- **Liste per livello** (`data/learnsets.ts`): ogni specie segue il Pokémon a cui somiglia, compressa in 50 livelli; livello 0 = mossa imparata evolvendosi. Selvatiche e nuove: le ultime 4 imparate. Al massimo 4 mosse; la quinta aspetta in `pendingMoves` e si sceglie a fine battaglia o dalla scheda. Ricordamosse al porto.
- **Salvataggio**: `known` e `pendingMoves` facoltativi (niente nuova versione); un salvataggio vecchio riceve le mosse del livello e PP pieni (i vecchi PP erano delle mosse del mare).
- Effetti nuovi: rinculo, colpi multipli 2–5 (35/35/15/15%), critico alto 1/8, Letargo, Acqua ferma, Potere antico. Niente confusione, mosse a due turni, KO in un colpo, protezione (per ora).
- Tolte la schivata (`dodge.ts`, `dodgeBar.ts`) e la derivazione automatica delle regole dalle fx.

## 2026-10-03 — Esperienza e cattura di Pokémon (fase 3 di 3)

- **Gruppi di crescita** (`data/progression.ts`): Veloce, Medio, Medio-lento, Lento con le curve di Pokémon; per stelle (1 veloce, 2–3 medio, 4 medio-lento come gli starter, 5 lento), o `growth` sulla specie. `TeamBeast.xp` resta l'esperienza verso il livello dopo; al caricamento si ferma al massimo del livello (le curve nuove sono vicine alle vecchie).
- **Esperienza Gen V scalata**: resa × L / 5 × ((2L+10)/(L+Lp+10))^2,5 + 1, calcolata per ogni bestia col suo livello. Rese per stelle 60–270; alfa e albini ×1,5; Guardiani ×1,5 (come gli allenatori). Panchina 50% (Condividi Esp. moderno). Un pesce vale una bestia di resa 10 del livello di chi lo mangia.
- **Cattura Gen III–IV**: a = (3·PSmax − 2·PS) × tasso × bonus conchiglia / (3·PSmax) × stato; riesce con probabilità a/255 (le 3 scosse la dividono). Tassi 190/120/75/45/25 per stelle, leggende e Guardiani 15 (in Pokémon 3–45: un po' più gentile perché le conchiglie si consumano). Stato: sonno e congelamento ×2,5, gli altri ×1,5. Resta la penalità se la bestia è sopra la tua più forte (come le medaglie di Spada e Scudo).
- Si sale più lentamente di prima: è voluto (come Pokémon). Se è troppo, si cambiano le rese in `XP_RULES.yieldByStars`.
- Fonti: Bulbapedia (Experience, Catch rate).

## 2026-10-04 — Meteo dinamico e gabbiani (solo aspetto)

- **Scelta del proprietario: solo aspetto.** Il meteo non tocca battaglie, bestie, aria, soldi né salvataggi. Il meteo in battaglia (come Pokémon) resta un'idea per dopo.
- **Stato fuori dal gioco**: meteo e uccelli vivono nella scena del mondo (`WorldScene`), non in `GameState`, e non si salvano: niente nuova versione del salvataggio. Ogni sessione parte col sereno.
- **Meteo** (`systems/weather.ts`, numeri in `data/weather.ts`): 5 tipi con durata in minuti e un "aspetto" (nuvole, pioggia, nebbia, vento, onde, lampi, raggi, buio, uccelli); il tipo dopo si sceglie coi pesi di `WEATHER_NEXT` (mai tempesta dal sereno) e sfuma in 25 s. Nei mari freddi (Mare di Ghiaccio e Banchisa, `coldAt` sfumato su 240 unità) la pioggia è neve.
- **Profondità**: il meteo si sente fino a 60 m (`WEATHER.dimDepthM`): raggi più deboli, un po' di buio in più, lampi attenuati. Sotto, niente.
- **Gabbiani** (`systems/birds.ts`): fino a 3 stormi intorno alla telecamera, a V larga, ogni uccello tenuto al suo posto da una molla smorzata (niente boids completi: costa poco e resta compatto). Si tuffano sulle sardine entro 40 unità sotto la superficie. Disegnati con linee (grigio chiaro, punte nere: si vedono sul cielo scuro) finché non arriva un disegno dipinto.
- **Prova**: nel pannello `?prove` c'è "Cambia il meteo" (evento `skipWeather` della Session).

## 2026-10-04 — Gabbiani più naturali (dopo la prova del proprietario)

- **Problemi visti sull'iPhone:** linee troppo spesse (si vedevano i rettangoli) e stormi che comparivano e sparivano in vista andando avanti e indietro (venivano rimessi a 120 unità dal centro, dentro lo schermo).
- **Disegno:** 9 pose del battito d'ala + una ad ali chiuse, dipinte una volta all'avvio su canvas con curve e sfumature (`views/birdsView.ts`); ogni uccello è un'immagine che sceglie la posa.
- **Comportamento come i banchi di pesci** (richiesta del proprietario): ogni stormo ha per casa un banco a meno di 170 unità sotto la superficie e a meno di 700 dalla telecamera; fa avanti e indietro sopra di lui (70–140 unità) virando con accelerazione limitata. Arriva, cambia casa e si ferma solo quando tutto lo stormo è fuori dallo schermo (`offScreen`, la scena passa la mezza larghezza vista). Un test fa nuotare la telecamera avanti e indietro per 10 minuti e controlla che nessun uccello compaia, sparisca o salti in vista.
- **Meno uccelli:** 2 stormi da 3–6.

## 2026-10-04 — Meno gabbiani ("e sono pure troppi")

- Al massimo 1 stormo da 2–4 (`BIRDS.flocks`, `perFlock`). Non sempre presente: arriva con probabilità 0,03 al secondo (in media dopo ~30 s), resta 40–90 s (`staySeconds`), poi vola via fuori dallo schermo. Test: in 20 minuti gli stormi vanno e vengono e ci sono tra il 30% e l'85% del tempo.

## 2026-10-04 — Correzioni dopo la prova (v0.32.0)

- **Immagini caricate all'avvio** (`views/neededSprites.ts`): anche i Guardiani (domabili: la Piovra era invisibile come compagno) e, per ogni specie caricata, la sua evoluzione (`evolvesTo`) e le immagini prese in prestito (`artFrom`).
- **Azione contestuale:** "Sali" vince su "Porto" quando il sottomarino è a portata (26 unità; il molo ne copre 60).
- **Lampada:** `lampAim` in `systems/submarine.ts`: dentro il sottomarino punta dove guarda il muso.
- **Porto:** il ridisegno conserva lo scorrimento della lista; si azzera solo cambiando scheda.
- **Battaglia:** la vignettatura copre la vista della telecamera (scala 1/zoom, centrata sullo scroll), così resta ai bordi durante zoom e ritorno.
- **Pesca dal sottomarino tolta** (scelta del proprietario: "poi ci pensiamo"): via `fish`, `subFishAt`, `SUB_FISH`, `SUBMARINE.fishing`, gli eventi della lenza e il pulsante "Pesca". Il salvataggio non cambia.

## 2026-10-04 — Urti del sottomarino (v0.33.0)

- **Forma:** 5 cerchi lungo lo scafo (`SUBMARINE.body`), più stretti a prua e a poppa, al posto di 3 cerchi da 9 unità che lo fermavano prima del contatto.
- **Roccia:** rimbalzo (35% della velocità all'indietro); sopra 25 unità/s danno = 0,15 × (velocità − 25), minimo 2, al massimo uno ogni 0,8 s. Stesso evento delle speronate (`subRammed` con `by: 'rock' | 'beast'`, e il punto) e stessa rottura (`damageHull`).
- **Speronate:** spinta di 60 unità/s lontano dalla bestia.
- **Si vede:** scossa dello schermo, bolle e fumo all'urto; barra dello scafo sopra il sottomarino per 3 s dopo ogni danno; fumo continuo sotto il 30%.
- Il fondo massimo del modello resta un limite per ora: diventa la barra della pressione nel gruppo 4.

## 2026-10-04 — Bestie grandi più vere (v0.34.0)

- **Virata ("il prosciutto tra due fette di pane", proposta del proprietario):** nel disegno a strisce, la striscia più di taglio durante la virata si allarga fino allo spessore del corpo (`BEAST_SPRITE.turnBreadth` 0,13 della lunghezza, più sottile verso muso e coda) con i suoi colori un po' scuriti. Si allarga solo quella: allargarle tutte faceva un effetto a tapparella. Da giudicare sull'iPhone: nel browser del cloud non si riesce a fotografare bene la virata.
- **Mangiare:** `beastEats` restituisce tutti i pesci nel raggio della bocca (che cresce con la lunghezza) in un morso; da 3 in su (`FEEDING.gulpFrom`) la bocca si apre molto ed esce una nuvola di scaglie e bolle (evento `beastGulp`).
- **Collisioni:** `bodyCircles` (5 cerchi lungo la spina, `BEAST_BODY.collideAlong`) per le bestie selvatiche, per quella che cavalchi (`stepDiver` con `body`) e per quella che ti segue (oltre 3 lunghezze di distanza ti raggiunge dritta, per non restare incastrata). `TileMap.moveBody` accetta un cerchio o la forma intera; se la bestia è già nella roccia conta solo il centro, così può uscirne.

## 2026-10-04 — Pressione, aria dei cetacei e scatto (v0.35.0)

- **Pressione** (`systems/breath.ts`, `PRESSURE` in `data/diver.ts`): oltre la profondità della muta (anche in groppa) la barra (0–1) scende di 0,08/s + 0,006/s per metro oltre; vuota toglie un cuore ogni 2 s; entro il limite risale di 0,25/s. Sostituisce l'aria consumata più in fretta (`SUIT_RULES.overDepthDrain*` tolti). Il sottomarino: niente più fondo invisibile; stessa barra, vuota toglie 6 di scafo ogni 2 s (`damageHull` con `by: 'pressure'`).
- **Aria dei cetacei** (`RIDE_AIR` in `data/beasts.ts`, `systems/rideAir.ts`): in groppa a megattera ×5, capodoglio ×7, Livyatan ×8, orca ×3, beluga e narvalo ×2,5 la tua aria; il sub respira dal cetaceo finché ne ha, poi dalla sua (messaggio `rideAirOut`). In superficie si riempiono tutte e due; lontano da te il cetaceo si ricarica (5% al secondo). Non salvata. Tolta la vecchia regola "in groppa alla megattera non consumi aria" (`rideO2Mult`, `staz_ossigeno.o2DrainMult`): era il trucco per scendere ovunque.
- **Scatto:** 3 di aria per ogni scatto, 1,5/s di sprint tenuto premuto in groppa (`DIVER.dashAir`, `sprintAirPerSec`).
- **HUD:** barra dell'aria azzurra con 🐋 quando è quella del cetaceo; barra della pressione arancione, visibile solo quando non è piena.

## 2026-10-04 — Bestie più varie (v0.36.0)

- **Causa:** quando c'era posto (`WILD_RULES.maxPresent`), `stepWildSpawns` faceva comparire la prima bestia pronta nell'ordine di `WILD_SPAWNS`: barracuda e tartarughe, in cima e con tempi brevi, vincevano quasi sempre.
- **Ora** (`systems/beasts/spawnDraw.ts`): le bestie pronte delle acque fatte a mano si raccolgono e si estrae a sorte; peso per stelle (1: 10, 2: 6, 3: 3, 4: 1,2, 5: 0,5), ×0,35 se la specie è già in acqua, ×0,3 se è tra le ultime 5 comparse (`BeastState.recent`, non salvato); le esche ×20 come prima. Il mare infinito sceglie ancora con i pesi dei tratti (`BIOMES`).
- **Delfini** in 5 zone in più. **Mappa:** quota = peso della rarità × quanto torna presto (30 s / tempo medio, minimo 0,15).
- **Test:** 20 minuti nella Baia con le bestie che se ne vanno una alla volta: nessuna specie sopra il 20% (prima il barracuda era il 25%).

## 2026-10-04 — Correzioni dopo la seconda prova (v0.37.0)

- **Virata:** ogni striscia ha facing = segno × max(|cos|, spessore); spessore 0,2 della lunghezza (cetacei 0,28), quindi in proporzione all'animale. Tutto il corpo gira insieme (la testa anticipa appena, `TURN_LEAD` 1,2) con ombra uniforme: le strisce a stadi diversi, e quelle specchiate in mezzo alle altre, facevano le righe ("si sgrana"). Tolta la fetta di prosciutto singola della v0.34.
- **Cetacei** (`CETACEANS`): coda su e giù, piegando solo l'ultimo 40% del corpo (`whaleWave`). Ruotare o spostare in verticale ogni pezzo apriva fessure tra le strisce: il davanti, alto, resta intero.
- **Superficie:** in `moveBody` per una forma lunga conta solo il cerchio centrale (testa e coda possono uscire): col muso in su la testa teneva il sub sotto la fascia in cui si respira.
- **Compagno:** segue la direzione di viaggio media (1,5 s), non la faccia; da fermo resta dal suo lato e vaga un poco; si gira solo sopra 1,5 lunghezze di sub al secondo (`TEAM_RULES.follow`).
- **Piovra:** `rideSpeedMult` 0,9, quindi si cavalca.
- **Leggende:** `wildLevel` per ogni leggenda casuale, da [50, 65] a [85, 100]; le bestie uniche della storia tengono il loro livello.
- **Bestiario:** vista solo entro 90 unità (`WILD_RULES.seenRadius`); ordinamento per rarità.
- **Squalo volpe:** la sua immagine "di fronte" era di un altro squalo. Ora usa quella buona (`squalo_volpe_back.jpg`, specchiata); l'originale è in `art-inbox/_squalo_volpe_front_sbagliata.jpg`. Serve una vera vista di schiena.
- **Sottomarino:** scossa 0,2 (roccia) o 0,45 (bestie) di quella del sub, meno bolle.
- **Scatto del sub:** non riprodotto. Nel codice, nel browser col tasto e col pulsante passa da 46 a ~115 di velocità. Da capire col proprietario in che situazione non funziona.

## 2026-10-04 — Avversari rivolti a sinistra (v0.37.1)

- **Regola del proprietario:** in battaglia ogni immagine `_front` (l'avversario) ha la testa verso sinistra, cioè verso il centro dello schermo e il difensore. Il gioco non specchia le immagini in battaglia: la direzione si decide nei file di `art-inbox` col suffisso `_flip`.
- Controllate tutte le 81 immagini `_front`. Rinominate in `_front_flip` quelle che guardavano a destra (anguilla_elettrica, folgore, livyatan, lontra_marina, pesce_leone, regina_bianca, squalo_capopiatto); a `pesce_luna_front_flip` tolto il `_flip`. Rielaborate con `npm run art -- --force --only=<id>`. Nessun file cancellato.
- **Per le immagini nuove:** se l'avversario guarda a destra, chiamare il file `<id>_front_flip.jpg`.

## 2026-10-04 — Virata con il corpo pieno (v0.37.2)

- **Il proprietario:** in v0.37.0 le virate di megattera e Piovra sembravano ancora un foglio di carta.
- **Ora** (`views/beastView.ts`): durante la virata le strisce non cambiano. Si stringe tutta l'immagine in orizzontale (cos dell'angolo, mai sotto il 12%), come un animale che si volta visto di lato. Stringere ogni striscia per conto suo, inclinata, faceva i gradini.
- **Il corpo** (il "prosciutto"): dietro il profilo, a ogni pezzo della spina, un'ellisse alta quanto il corpo in quel punto (letta una volta dall'alfa dell'immagine) e profonda quanto lo spessore (`turnBreadth` 0,2 della lunghezza, cetacei 0,28) × quanto ha girato; più sottile a muso e coda. Colore: la media dell'immagine lungo la spina. Insieme fanno un corpo tondo, di taglio visto di fronte.
- Tolta l'inarcatura durante la virata: inclinava i pezzi e apriva fessure.
- Visto nel browser con la virata rallentata a 4 s (solo per la prova).

## 2026-10-04 — Via lo zoom d'ingresso in battaglia (v0.37.3)

- Il proprietario: lo zoom iniziale sulle bestie grandi mostrava ancora i bordi del riquadro anche dopo la correzione della vignettatura (v0.32.0). Tolto del tutto (`emerge` in `views/battleView.ts`); resta solo la scossa delle gigantesche (`BATTLE_STAGE.intro.giantShake`).

## 2026-10-04 — Niente più virate animate (v0.37.4)

- **Scelta del proprietario:** dopo tre tentativi (pezzo per pezzo, moneta spessa, sandwich con il corpo pieno) le virate restavano brutte, quindi niente animazione. In `views/beastView.ts` la bestia si disegna subito verso `face`: tolti il disegno della virata, lo spessore, le ellissi e `turnBreadth`.
- La logica (`turn` in `roam.ts` e `mount.ts`) resta com'era: le selvatiche si girano solo fuori dalla luce o contro una parete, e durante il `turn` il beccheggio si appiattisce. Cambia solo il disegno.
- Onda della coda dei cetacei un po' più bassa (`whaleWave.amp` 0,3): toglie i fili sottili vicino alla coda.
- **Per riprovare un giorno:** servirebbero immagini dipinte apposta per le pose intermedie (di fronte e di tre quarti) da alternare durante la virata.

## 2026-10-04 — Corpi solidi (v0.38.0)

- **Forma vera:** `npm run shapes` (`scripts/body-shapes.ts`, con sharp) misura dai profili 1000×460, in 9 punti dalla testa alla coda, quanto il corpo arriva sopra e sotto la spina (`src/data/bodyShapes.generated.ts`). `bodyCircles` mette un cerchio per punto, centrato nel mezzo del corpo e con raggio pari all'85% della mezza altezza (`BEAST_BODY.shapeFill`). Selvatiche (`spawnWild`) e cavalcature (`callMount`) ricevono la `shape` della loro immagine (`shapeOfForm`); senza forma restano i vecchi cerchi.
- **Battaglia in groppa:** `stepRoam` dà il tocco anche quando i corpi della selvatica e della tua cavalcatura si toccano (`bodiesTouch`, margine `ROAM.bodyContact` 2 unità).
- **Sottomarino solido:** `pushOutOfSub` spinge fuori dallo scafo e toglie la velocità verso l'interno. Vale per il sub (o la cavalcatura su cui sei), per le selvatiche in acqua e per la bestia che ti segue. Per salire basta avvicinarsi come prima.
- **Sella:** `riderSeat` mette il sub sopra la schiena vera nel punto in cui siede; la Piovra ha `riderForward` 0,3 (sulla testa).
- **Scatto:** `canDashNow`: il pulsante sparisce nel sottomarino o con una muta senza scatto, se non cavalchi. Era il motivo dello "scatto che non funziona": il proprietario indossava lo Scafandro da palombaro.

## 2026-10-04 — La nave da spedizione e le leve (v0.39.0)

- **Progetto approvato dal proprietario** (vedi GDD, "Spedizioni"): oceano di 30 km, livelli per pericolo e habitat veri, nave come casa, sonar solo sulla nave, caccia alle leggende tracciabile, carburante e cure solo sulla nave. Questa è la tappa 1: la nave e le leve.
- **Nave** (`data/ship.ts`, `systems/ship/`):
  - `ship.ts`: stato, `sailShip` (gas, inerzia, giro di colpo da ferma, ghiaccio, corsia lontana, fondale basso), `giftShip` a `chapter4Done`;
  - `hatch.ts`: portellone, rampa, aggancio, A bordo e Tuffati;
  - `geometry.ts`: punti dell'immagine nel mondo (linea d'acqua, portellone, rampa, timone, scafo);
  - `surface.ts`: cosa incontra in superficie, rottura e ricongelamento del ghiaccio;
  - `systems/vehicles.ts` mette insieme nave e sottomarino per `game.ts` (azioni, scafi solidi, porto dal timone, risveglio sulla nave).
- **Non si blocca mai:**
  - terra o iceberg sopra l'acqua, o roccia sotto lo scafo a est della spiaggia: la nave passa sulla **corsia lontana** (`lane`), più piccola e scura, disegnata dietro il terreno (un contenitore aggiunto prima di `TerrainView`). Lì non urta niente, non rompe ghiaccio e non apre il portellone;
  - solo sulla spiaggia di Portofosco il fondale basso la ferma;
  - un test naviga a tutta da Portofosco a 30 km;
  - correzione collegata: `icebergsNear` contava gli iceberg di tutti i tratti del mare infinito, non solo della Banchisa.
- **Ghiaccio:**
  - la prua rompe le caselle di ghiaccio fino alla chiglia e la nave rallenta (`iceMult`, `iceBite`);
  - le caselle si richiudono dopo `refreezeSeconds`, solo lontano da te e dalla nave;
  - non si salvano: al riavvio la lastra è intera;
  - evento `tilesChanged` per ridisegnarle.
- **Leve** (`systems/helm.ts`, `ui/helmControls.ts`, `ui/helmInfo.ts`):
  - `InputState.helm` (gas, direzione, Sali/Scendi) resta tra un fotogramma e l'altro;
  - `helmCmd` per i pulsanti del timone;
  - `stepHeading` è la stessa per nave e sottomarino: con la leva al contrario frena, e sotto `turnBelow` si gira di colpo (scelta del proprietario, niente virata animata);
  - il sottomarino non usa più il joystick;
  - i nodi mostrati hanno un fattore unico (`HELM.knotsPerUnit`): la nave a tutta fa circa 24 nodi.
- **Immagini:**
  - `nave_1.jpg` (fondo verde) e `nave_1_aperta.jpg` (fondo bianco) diventano `public/world/nave_1*.webp`;
  - lo scontorno è apposta per la nave: per il verde conta quanto il pixel è più verde che rosso e blu, per gli altri colori la distanza;
  - non si ritagliano, così le due immagini combaciano.
  - Nel gioco la parte sotto la linea d'acqua è tinta di blu.
- **Vista:** al timone la telecamera si allarga dolcemente (`CameraRig.setView`, `SHIP.camera`).
- **Salvataggio v14:** `ship` (x, direzione, portellone, dove sta il sottomarino, al timone).
- **Scafi solidi:** `pushOutOfSub` è diventato `pushOutOfHull` (`systems/hull.ts`), usato per sottomarino e nave.

## 2026-10-04 — Carburante, cockpit, cure solo sulla nave (v0.40.0)

- **Tappa 2 delle spedizioni.** Risposte del proprietario: prima della nave si guarisce solo ai porti; il razzo di soccorso è un pulsante (cockpit e sottomarino a secco), non un oggetto.
- **Carburante:**
  - `systems/fuelBurn.ts`: il consumo `litresFor` è proporzionale alla distanza percorsa e vale `perKm × (idleShare + (1 − idleShare) × gas)`, zero a motore spento; `autonomyKm` dà l'autonomia;
  - `systems/fuel.ts`: travaso (solo con `bay === 'docked'`), rifornimento (`canRefuel`: la nave entro `dockReachPort` dal suo ormeggio; il sottomarino nella stiva lì o entro `FUEL.portReach` dal molo), razzo di soccorso (`rescue`);
  - `fuelBurn.ts` è separato perché nave e sottomarino lo usano senza creare un giro di import con `fuel.ts`;
  - a secco `top = 0`: il mezzo scivola fino a fermarsi; l'evento `fuelOut` arriva una volta sola finché non torna carburante.
- **Santuari tolti del tutto:** `systems/sanctuary.ts`, `views/sanctuaryView.ts`, `SANCTUARIES`, `SANCTUARY_RULES` e `PROGRESSION.sanctuaryHealSeconds`.
  - Il punto di risveglio è la nave o il porto (`homePort`).
  - Il sottomarino non cura più (`board` riempie solo l'aria).
  - `restAboard` resta in `submarine.ts`, ma la usa solo la nave (salire a bordo, aggancio, risveglio).
- **Cockpit:** `ui/cockpit.ts`, con lo stesso stile del porto, aperto dall'evento di sessione `openCockpit` (`MenusScene` in modo `'cockpit'`). Il razzo lanciato da lì mette il suo messaggio in `story.pending`.
- **Salvataggio v15:** `fuel` per nave e sottomarino (se manca, serbatoio pieno); il campo `sanctuary` viene tolto.

## 2026-10-04 — Spedizioni complete: tappe 3–6 (v0.41.0)

- **Regioni** (`data/regions.ts`):
  - `biomeOf` sceglie i tipi di tratto dai pesi della regione (via `weight` e `weightPerKm` dei biomi);
  - `ENDLESS.maxX` = 30 km, con una scogliera (`endWall`);
  - la nave si ferma a `SEA_END_X` (evento `seaEnd`) e non passa sulla corsia lontana per la scogliera;
  - `zoneAt` in mare aperto: "Regione · Tratto"; la scheda della regione si sblocca entrando.
- **Avamposti:** `OUTPOSTS` in `data/economy.ts`, porti a tutti gli effetti (`PortDef.outpost`, `shipDock` per ogni porto al posto di `SHIP.dock`); `discoverOutposts` li segna come trovati (`avamposto:<id>` in `seen`, niente cambio al salvataggio).
- **Pericolo:**
  - `SPECIES_DANGER` + `DANGER_LEVELS` sostituiscono `WILD_LEVELS` e i `level` dei punti di comparsa;
  - `rollWildLevel(form, rng, band)`: la fascia del pericolo; `band` (0 = costa) viene dalla regione (`bandAt`) e dalla profondità;
  - scelta: barracuda, torpedine e pesce palla tra gli innocui, per non rendere impossibile la Baia all'inizio;
  - avviso quando la bestia supera di `warnGap` la tua migliore.
- **Habitat:** `SPECIES_DEPTH` esteso con i limiti veri; la scheda mostra profondità, mari (dai biomi delle regioni) e pericolo.
- **Cacce** (`data/hunts.ts`, `systems/hunts.ts`):
  - le leggende non vengono più tirate a sorte (`rollLegend` tolto; `LEGENDS` = unici con una caccia);
  - ogni caccia ha una tana (`placeDens`, sopra il fondale vero) e uno slot selvatico (`WildSpawnDef.hunt`/`form`), trattenuto finché voce, eco e tracce non sono fatte e il tempo non è quello giusto;
  - il meteo è passato in `GameState` (`g.weather`, non salvato) perché le cacce lo leggono;
  - salvataggio v16: `hunts`.
- **Ricompense:**
  - `REGION_CHESTS`: 3 relitti per regione, come i relitti della costa;
  - missioni `reachKm` e `hunt`;
  - `SHIP_UPGRADES` (serbatoio, sonar, motori) salvati in `ship.upgrades`.
- **Non fatto:** un tempio per regione (resta solo il tempio del Mare aperto) e pesci rari da vendere. Proposti per una prossima tappa.

## 5 ottobre 2026 — La nave vive solo a est di Porto Fango (v0.42.0)

- **Decisione:** via la "corsia lontana" e gli iceberg. Il Delta va prima dell'isola; sulla riva est dell'isola c'è il porto commerciale di Porto Fango; la nave si ferma a `SHIP_WEST_X` (evento `shipWest`) e da lì a est non trova nulla (`ENDLESS.clearTop`: niente roccia sotto la superficie in mare aperto, il ghiaccio resta e si rompe).
- **Motivo:** il proprietario trovava la corsia lontana "terribile". Il razzo di soccorso porta la nave al porto più vicino *raggiungibile*.
- **Telecamera al timone:** lo sguardo avanti cresce con la velocità, così salire o scendere non sposta l'inquadratura.
- **Leve:** un tocco per dito (`Map` dei puntatori), così gas e Sali/Scendi funzionano insieme.
- **Sonar:** `ship.sonarOn` (non salvato) e `sonarActive` (sotto `SHIP.sonar.maxKnots`); le eco della caccia si trovano solo a sonar attivo. Lo schermo del cockpit (`ui/sonarScreen.ts`) disegna su canvas e suona un ping a ogni passata.
- **Cockpit:** `ui/bridgePanel.ts` (plancia), `ui/instruments.ts` (quadranti e carta in SVG), `systems/chart.ts` (cosa c'è a ±2 km, logica pura), `ui/cockpit.css`.
- **Caccia seguita:** `huntPinned` nel salvataggio, campo facoltativo (niente nuova versione: un salvataggio vecchio parte senza).
- **Motori:** `audio/engineSound.ts` con Web Audio, numeri in `ENGINE_SOUND` (`data/audio.ts`).

## 5 ottobre 2026 — Il cockpit non ferma il mare (v0.43.0)

- **Decisione:** aprendo il cockpit la scena del mare non va in pausa (`session.inCockpit` al posto di `session.paused`); il cockpit imposta direttamente la leva del gas (`input.helm.throttle`) con "Avanti adagio" (`SHIP.sonar.cruiseKnots`) e si chiude da solo se non sei più al timone o inizia una lotta.
- **Motivo:** il proprietario vuole navigare piano guardando il sonar.
- **Telecamera:** quando cambia `ship.aboard` la vista salta subito (`snap`) invece di scorrere: lo scorrimento con lo zoom faceva sembrare che la nave si spostasse.
- **Aggancio:** `ship.dockFrom`: prima il sottomarino scivola (`SHIP.dockGlide` unità/s) fino al punto più vicino della rampa, poi la risale.

## 5 ottobre 2026 — Il mare aperto ha abitanti fissi (v0.44.0)

- **Decisione (scelta del proprietario):** le bestie del mare aperto non nascono più a caso intorno al sub. Ogni tratto ha i suoi abitanti, generati dal seme del mare (specie dal tipo di mare, casa alla profondità della specie, giro lento intorno alla casa calcolato dal tempo, senza simulazione). Gli "slot" selvatici del mare aperto fanno uscire l'abitante più vicino a te (entro `wakeRadius`), dove si trova; lontano torna virtuale. Catturato o sconfitto, il posto resta vuoto per `returnSeconds` (non salvato).
- **Motivo:** dalla nave il sonar non vedeva nulla: le bestie esistevano solo intorno al sub e alla sua profondità.
- **Tolto:** `prepareEndlessSpawn` (la vecchia scelta a caso).
- **Sonar:** sente tutti gli animali (non solo i grandi), compresi gli abitanti non usciti.
- **Telecamera:** un unico passaggio morbido (`CAMERA.boardBlend`) che porta zoom e posizione insieme sulla stessa curva, al posto dello stacco netto della v0.43.

## 5 ottobre 2026 — La telecamera segue la distanza dalla nave (v0.45.0)

- **Decisione:** la vista non dipende più da `ship.aboard` ma da `helmShare` (`systems/shipCamera.ts`): 1 vicino alla nave, 0 lontano, sfumata con la distanza laterale dallo scafo e la profondità. Salire o scendere non cambia la distanza, quindi la vista resta identica. Tolti lo stacco (v0.43) e la transizione a tempo (v0.44).
- **Motivo:** cambiare zoom attorno a un punto che non è il centro della nave la fa sembrare spostarsi, comunque si faccia la transizione.
- **Timone a fasce:** `--side` (`clamp(176px, 26vw, 260px)`) è la larghezza delle fasce laterali; strumenti, nome della zona e messaggi stanno nella fascia centrale e vanno a capo.

## 5 ottobre 2026 — Stacco netto con dissolvenza (v0.46.0)

- **Decisione:** tra la vista del timone e la tua non c'è più nessuna transizione di zoom o di posizione: al cambio la telecamera salta subito e tutte e tre le telecamere ripartono dal buio (`fadeIn` di Phaser, `CAMERA.cutFadeMs`).
- **Motivo:** il proprietario non vuole mai vedere scorrere la vista; la vista a distanza dalla nave (v0.45) teneva la nave al centro troppo a lungo. Lo stacco senza effetti (v0.43) funzionava ma era brusco: la dissolvenza lo addolcisce.

## 8 ottobre 2026 — La storia in pausa, il nuovo inizio (v0.47.0)

- **Decisione:** tolti i capitoli 1–4 (sistemi, dati, viste e test: `chapter2/3/4`, `chapters`, `guardian`, `portJobs`). Restano i luoghi come scenario (`data/scenery.ts`: grotta delle ossa, anfiteatro, galeone; disegnati da `views/sceneryView.ts`). La storia ha cinque passi: `off`, `intro`, `tutorial`, `toPortoFango`, `free`. Nave e sottomarino si ricevono chiudendo il dialogo di Aurelio a Porto Fango (`giftSub` e poi `giftShip`, chiamati da `story.ts`), non più per indice di capitolo.
- **Motivo:** al proprietario la storia non piaceva; sarà ripensata da capo nel blocco 10 (`docs/BACKLOG.md`). Intanto il gioco deve partire semplice e portare subito alla nave.
- **Bestie della storia:** campo `storyOnly` in `SpeciesDef` e `UniqueVariantDef` (Re Corallo, Piovra, Sfregiato) invece di cancellarle: dati, mosse e immagini restano per la storia nuova, ma fuori da mare, bestiario (`GAME_SPECIES`), tessera e immagini caricate. Il campo `guardian` è sparito; il Calamaro colossale è una bestia normale ma non compare finché non ha le immagini.
- **Salvataggio v17:** toglie dalla squadra le bestie della storia (la riserva prende il loro posto), porta la storia a `free` se la nave c'è già, altrimenti a `toPortoFango`; un tutorial a metà resta allo stesso compito (il nuovo compito "doma" sta prima di "torna al molo"). Tolto `gear.guardians`.
- **Zona protetta:** dalla costa (Baia e Delta) tolti squalo bianco e coccodrillo marino; un test controlla che lì non ci siano specie con pericolo 4 o 5.
- **Test:** il limite di tempo di Vitest passa a 20 s: alcuni test simulano minuti di gioco e con tutti i file in parallelo superavano i 5 s su questo PC.

## 8 ottobre 2026 — Correzioni del blocco 2 (v0.48.0)

- **Motore acceso o spento:** `ship.engineOn` (salvato come campo facoltativo, senza nuova versione del salvataggio). Il gas lo accende; acceso consuma `SHIP.fuel.idlePerMinute` anche da fermo; il pulsante (comando `engine`) lo spegne e azzera il gas.
- **Suono:** `engineHeard` (sistema puro) dà intensità e vicinanza; `SoundEngine.silence()` alla pausa e all'inizio di una battaglia. La pulsazione del diesel ora modula un nodo a valle del volume: prima si sommava al volume e si sentiva anche a volume zero.
- **Leve dei mezzi:** a ogni salita (nave, sottomarino, aggancio, traino) le leve ripartono da `freshHelm(direzione del mezzo)` nella logica (`vehicles.ts`), non più solo nell'interfaccia un fotogramma dopo.
- **Rimbalzo del sottomarino:** sotto `SUBMARINE.bounceStop` finisce (il decadimento esponenziale non arrivava mai a zero).
- **Aria in groppa:** la superficie si misura dal punto più alto del corpo della bestia (`topOffset` in `updateOxygen`).
- **Economia:** sacca da `BAG.capacity` pesci; sardina 1 dente; esperienza per boccone limitata da `XP_RULES.fishPerBiteMax`.
- **Avamposti:** `shipAlongside` (in `economy/places.ts`) vale per il pulsante Porto e per il rifornimento.
- **Evoluzione:** tolta `EvolutionShow` (la seconda animazione con le card); lo stile dello schermo rimasto è in `screens.css`.
- **Ghiaccio:** rallenta solo `icebergAcross` (iceberg dipinti); per ora nel mare aperto non ce ne sono (`ICEBERGS_PER_STRETCH = 0`).

## 8 ottobre 2026 — La flotta, parte 4a (v0.49.0)

- **Decisione:** le navi sono modelli (`data/fleet.ts`, `SHIP_MODELS`) con i numeri della tabella corretta dal proprietario; `ship.model` è salvato. Tutto ciò che prima leggeva `SHIP.length/picture/maxSpeed/fuel/art` passa da `systems/ship/model.ts` (`shipModel`, `shipLength`, `shipTopSpeed`, `shipRates`, `shipTank`, `sonarRange`, `sonarMaxKnots`); `data/ship.ts` tiene solo le regole comuni. La geometria (`ship/geometry.ts`) è fatta di funzioni del modello al posto delle costanti.
- **Lunghezze vere:** metri × `WORLD.unitsPerMetre`; la vista del timone cresce con la lunghezza (`SHIP.camera.refLength`, fino a `maxScale`).
- **Cantiere:** `systems/ship/shipyard.ts`. Una nave alla volta; la vecchia vale `TRADE_IN_SHARE` del prezzo (se vale più della nuova, la differenza torna a te); il carburante passa nella nuova; il sottomarino della nave arriva nuovo nella stiva. Solo le navi `ready` si comprano (Aurelia, EH1): le altre aspettano le parti 4b–4d.
- **Tolti** potenziamenti e sottomarini venduti a parte; **salvataggio v18** li rimborsa ai prezzi della v0.48.0.
- **Immagini:** le navi sul fondo verde passano da `npm run art` (nomi `nave_<id>`, `nave_<id>_aperta`, `sottomarino_<id>`, card `<nome>_card`); le immagini con la prua a sinistra si girano copiandole in `art-inbox/`. Effetto noto: le scritte dipinte sullo scafo si leggono al contrario quando la nave va verso est.

## 8 ottobre 2026 — Ritocchi alla flotta (v0.50.0)

- **Vista del timone:** cresce come (lunghezza / 180) ^ `SHIP.camera.growth` (0,4): crescendo quanto la nave, tutte le navi apparivano grandi uguali.
- **Sottomarini:** `lengthM` per modello; collisioni e disegno scalati da `SUBMARINE.body` (`subLength`, `subBody`).
- **Ordine di disegno:** le immagini di tutte le navi si creano nel costruttore di `ShipView`, prima del sottomarino (create dopo, finivano sopra di lui).
- **Elica:** `ship.prop` (0…1, non salvato) segue la spinta del motore; immagine `art.moving` (facoltativa) e bolle dell'elica dipendono da essa, la scia dalla velocità.
- **Accensione e spegnimento:** eventi `engineStarted` / `engineStopped`, suono sintetizzato (`ENGINE_SOUND.startStop`).
- **Cantiere:** `tier` 1–5 per nave (colori di `RARITY`); pagina della nave in `ui/shipPage.ts` con galleria a scorrimento.

## 8 ottobre 2026 — Onda di prua e ghiaccio (v0.50.3)

- **Prua sull'acqua:** `picture.bowU` dice dove la prua tocca l'acqua (la parte sopra l'acqua sporge, es. la mascella dell'EH1); onda, schegge e rottura del ghiaccio partono da lì.
- **Ghiaccio rotto dietro la prua** (`SHIP.iceBehindBow`, da 8 a 40 unità dietro): prima si rompeva 10 unità davanti, e la lastra spariva prima del contatto.
- **Schegge:** `ship.iceT` (non salvato) resta acceso `SHIP.iceCrackSeconds` dopo ogni rottura; la vista lancia le schegge e intanto non disegna l'onda di prua.
- **`views/shipFx.ts`:** fumo, onda e schegge separati da `shipView.ts`, che superava le 300 righe.

## 8 ottobre 2026 — Via l'onda di prua (v0.50.4)

- Tolta l'onda di prua disegnata sopra il mare (cerchi di schiuma e gocce): al proprietario sembrava un layer di puntini. Se torna, dovrà essere la superficie del mare a deformarsi e schiumare. `bowU` resta per il ghiaccio.

## 8 ottobre 2026 — Blocco 4b: secondo portellone e mezzi di superficie (v0.51.0)

- **Un portellone per vano:** `ship.hatches: {t, open}[]` (stesso ordine di `bays` in `data/fleet.ts`) al posto di `hatch/hatchOpen`; la posizione di ogni portellone sta nel suo vano (`BayDef.hatch`), non più nel `picture`. La nave spinge solo con tutti chiusi.
- **Immagini dei portelloni:** con due vani ogni vano ha la sua immagine "solo lui aperto" (`BayDef.open`) e `art.open` è "tutti aperti"; la vista sfuma ciascuna con il suo portellone e quella con tutti aperti col prodotto.
- **Motoscafo e moto d'acqua = un solo sistema** (`systems/boat.ts`, dati in `data/boats.ts`): cambiano solo i numeri e l'immagine. Stato a parte (`g.boat`), come il sottomarino; usa le leve del timone e `stepHeading`.
- **Fusti (scelta del proprietario):** il carburante comprato nei fusti si travasa nella nave in automatico all'aggancio, e il serbatoio del motoscafo si riempie dalla nave. Niente tuffi dal motoscafo (si esplora dalla nave).
- **A secco** il motoscafo va al 15% della velocità (`BOAT.dryCrawl`): niente razzo di soccorso, non resta mai bloccato. Svenendo, l'equipaggio lo riporta nella stiva.
- **Aggancio e porto** sotto ~3 nodi (`BOAT.stillBelow`): la leva del gas raramente sta esattamente a zero.
- **Suono:** il motore del motoscafo usa la voce del sottomarino (più acuta), senza codice audio nuovo.
- **Immagini:** `npm run art` accetta `nave_<id>_aperta_1/_2`, `motoscafo_*`, `moto_*` (non ritagliati, come le navi) e `sottomarino_<id>_moto` (ritagliato con lo stesso riquadro del sottomarino fermo). Le immagini della stessa nave sono state portate alla stessa larghezza prima dello scontorno.
- **Salvataggio v19:** `hatches` e `boat`.

## 8 ottobre 2026 — Più navi e statistiche confrontabili (v0.52.0)

- **Flotta (scelte del proprietario):** più navi; quella in uso vive in `g.ship`/`g.sub`/`g.boat` come prima, le altre in `g.fleet` (`MooredShip`: modello, carburante, scafo e serbatoio del sottomarino, serbatoio e fusti del motoscafo), sempre a Porto Fango. Cambiare nave scambia i due stati. Si fa solo col sottomarino e il motoscafo nella stiva.
- **Niente permuta:** la nave nuova costa il prezzo pieno e arriva col pieno. Si vende a metà prezzo (`SELL_SHARE`); l'Aurelia mai (`KEEP_FOREVER`), così c'è sempre una nave.
- **Categorie:** `category` per nave (`SHIP_CATEGORIES`); il cantiere apre sulla scheda "Possedute".
- **Statistiche:** calcolate in `systems/ship/stats.ts` dai dati, mai a mano. Ripresa = velocità / accelerazione, frenata = velocità / frenata, sonar in metri (`HUNT_RULES.bigEchoRange` e `sonarRange` × la portata). La barra è rispetto alla nave migliore di quella riga; la differenza è con la nave in uso (per i mezzi, con il mezzo dello stesso tipo). Il nome del sonar ("buono") non si mostra più.
- **Salvataggio v20:** `fleet`.

## 8 ottobre 2026 — Cockpit a vapore (v0.53.0)

- **Uno stile di cockpit per nave** (`cockpitStyle` in `data/fleet.ts`, classe `style-<nome>` sul cockpit): EH1 ed EH2 hanno "vapore", dai concept di Gemini del proprietario.
- **Solo CSS e SVG** (`ui/cockpitSteam.css`): la ruggine è rumore SVG (`feTurbulence`) in un data URI, i rivetti sono sfumature radiali agli angoli, ottone e rame sono sfumature lineari, la leva e i tubi sono pseudo-elementi o div decorativi. Niente immagini nuove: è leggero, si adatta a ogni schermo e i testi restano veri. Lasciati fuori i draghi incisi dei concept: servirebbero immagini (eventualmente da Gemini, senza testo).

## 9 ottobre 2026 — Ritocchi al motoscafo (v0.53.2)

- **Vista:** nel motoscafo la telecamera è come quella del sub e del sottomarino (`BOAT.camera`), non quella del timone. Salendo sul motoscafo la vista cambia con la dissolvenza, come tra nave e sottomarino.
- **Faro:** `lampAim` usa il verso del motoscafo; parte dalla prua e gira subito, senza la rotazione morbida della lampada del sub.
- **Stiva:** `boatAfloat` tiene il mezzo mai sotto la superficie; nella stiva sale con l'apertura del suo portellone.

## 9 ottobre 2026 — Dissolvenza dei pulsanti del timone (v0.53.6)

- Sull'iPhone (Safari) sfumare l'opacità di singoli pulsanti sopra il canvas del gioco lasciava pezzi disegnati a metà. I pulsanti che funzionano solo a nave ferma stanno in un gruppo (`.helm-still`) con un suo livello (`will-change`, `translateZ(0)`), sfumato intero e poi nascosto con `visibility` a fine transizione.

## 9 ottobre 2026 — Il cockpit dipinto (v0.54.0)

- Le quattro schermate di Gemini (stessa cornice) fanno da **palco 16:9** (`.steam-stage`, container query: misure in `cqh`), adattato allo schermo; le fasce laterali mostrano il muro coi draghi sfocato.
- **Posizioni misurate una volta** in percentuale delle immagini (`data/cockpitSteam.ts`); `ui/steamStage.ts` mette gli elementi sugli spazi (`place`) e incolla ritagli delle immagini (`crop`): placca accesa/spenta sulle schede, targa d'ottone su "Al timone", qualunque sia l'immagine sotto.
- **Plancia:** una finestra che scorre su due parti dipinte (schermata con la carta, poi i pannelli di travaso ed emergenza dell'altra schermata). Le lancette sono div ruotati da -135° a +135° sulle tacche dipinte.
- Le regole del palco sono prefissate con `#ui`: `#ui button { font-size: inherit }` vinceva sulle classi.

## 9 ottobre 2026 — Gli U-Boat (v0.55.0)

- **La nave si immerge** (scelta del proprietario: niente sottomarino a bordo). `ship.dive` (unità sotto la linea di galleggiamento) entra in `shipTop`/`shipHull`: timone, scafo solido, vista, punto di risveglio e sonar seguono la nave senza codice a parte.
- **Collisioni:** sott'acqua i cerchi dello scafo contro le piastrelle (`hullBlocked`); a galla la nave resta nelle sue corsie come prima. Il ghiaccio è solido: immerso ci passa sotto, solo la risalita d'emergenza lo rompe.
- **Aria (scelte del proprietario):** avviso a 30 s, poi risalita automatica. A galla si ricarica; per rimmergersi ne servono `SHIP.dive.minAir` secondi, sennò dopo l'emergenza si poteva subito tornare giù.
- **Faro:** immerso, l'U-Boat accende la luce dalla prua (al timone in superficie no).
- **Salvataggio:** `dive` e `air` facoltativi in `SavedShip`, senza cambiare versione.

## 9 ottobre 2026 — Ritocchi agli U-Boat (v0.55.1)

- **Linea dell'acqua mobile:** le immagini della nave si tagliano ogni fotogramma dove passa la superficie (`place(..., water)`), non più alla linea di galleggiamento fissa: un U-Boat che scende si scurisce solo sotto il pelo dell'acqua.
- **`diveShare`** (0 a galla … 1 tutta sotto) attenua gradualmente dondolio e assetto, la luce sotto lo scafo e fa crescere il faro di prua.
- **Reattori:** le immagini "accese" col fuoco (Poseidon, motoscafo EH2) non piacevano. Sono tolte dal gioco (originali in `art-inbox/_*`); al loro posto il fumo dai reattori (`ShipStack.reactor`, `BoatModel.reactors`), solo mentre il motore spinge e solo sopra l'acqua. Il Whale tiene la sua immagine coi reattori accesi, anche sott'acqua.
- **Fumo generico:** `ShipFx.puff(sorgenti, spinta, scala)`, usato da navi e motoscafi.
- **Leva della profondità** all'estrema destra (`order: 2`) e pulsante contestuale spostato sopra le frecce (`.helm-diving`).

## 9 ottobre 2026 — Musiche originali sintetizzate (v0.56.0)

- **Il proprietario** voleva per il mare aperto qualcosa come "Hoist the Colours" e per le battaglie qualcosa che ricordi lo Squalo. Per il copyright sono **composizioni nostre**: stesso carattere, note e ritmo diversi. Nessuna melodia né parola copiata, nessun file audio, nessuna licenza.
- **Mare aperto:** canto lento in re minore e in 3/4. Coro fatto con dente di sega e tre filtri a formante (vocale "u" per il coro, "a" per la voce solista), vibrato lento e piccoli ritardi tra le voci. Eco con un `ConvolverNode` e una risposta di rumore che si spegne in 4,5 s, generata al volo.
- **Soglia:** il proprietario ha detto "circa 1 km", ma Porto Fango è proprio a 1,03 km. Allora la musica entra a 1,25 km ed esce sotto 1,15 km (isteresi, niente accendi/spegni sul confine).
- **Battaglia:** ostinato di due note a mezzo tono (fa2 e fa#2) con un'ottava sotto, ottoni con filtro che si apre, timpani, tremolo acuto; un'introduzione che si fa più fitta, poi il giro.
- **Le bestie non sentono lo scafo della nave:** con gli U-Boat che salgono e scendono, la spinta le schiacciava contro le rocce. Ora navi e U-Boat ci passano attraverso. Il sottomarino resta solido per tutti, la nave per il sub.

## 9 ottobre 2026 — Il meteo si salva e parte a caso (v0.56.1)

- **Problema:** il meteo ripartiva sempre dal sereno con lo stesso seme. Sul PC, aperto a lungo, arrivavano pioggia e nebbia; sull'iPhone, che ricarica spesso, quasi solo sereno.
- **Ora:** l'inizio è a caso, pesato e mai in tempesta, con un seme nuovo per ogni sessione. Lo stato (`from`, `to`, `blend`, `left`) va nel salvataggio come campo facoltativo: i salvataggi vecchi partono a caso. Il generatore non si salva: dopo il tempo in corso la sequenza è nuova.

## 9 ottobre 2026 — Ocean's Nightmare: drone, sfera, bussola (v0.57.0)

- **Il drone è il sottomarino della nave** (vano `kind: 'sub'`, modello con `recon`): calarlo, guidarlo e riagganciarlo usano il codice già esistente. La ricognizione funziona solo con il drone nella stiva. Mentre è fuori, il drone è disegnato da `nightmareView` e non può essere calato.
- **Il drone passa attraverso le rocce:** va in linea retta, perché è quasi sempre fuori schermo e il viaggio deve durare poco (circa 10 s).
- **Bersaglio per identità:** per i residenti del mare aperto si usa l'id (`r<tratto>.<n>`), così è lo stesso animale sia "addormentato" sia uscito davvero; per le bestie della costa si usa posto e specie. Se l'animale viene catturato, sconfitto o sparisce, compare "Traccia persa". Si salvano solo i bersagli residenti.
- **Blocco:** `BeastState.held` (uno alla volta). La bestia bloccata non nuota e non attacca, ma si può combattere o domare. Un residente non ancora uscito resta fermo dove l'ha preso la sfera.
- **Ricarica della sfera:** 3 minuti, aggiunta perché senza sarebbe troppo forte. Il proprietario non l'aveva chiesta: si cambia in `SPHERE.cooldownSeconds`.

## 9 ottobre 2026 — Ocean's Nightmare: tutto passa dai portelloni (v0.57.1)

- **Su richiesta del proprietario,** drone e sfera non aprono più i portelloni da soli: li apri tu, dai il comando ("Ricognizione", "Cala drone", "Invia sfera") e li richiudi quando sono tornati. Mentre sono fuori il pulsante "Chiudi" non compare.
- **Il resoconto è una scheda del cockpit** e non più un pannello sopra il gioco.
- **I pulsanti del timone sono in una griglia** di 3 per colonna, con le colonne da destra a sinistra (`direction: rtl`), perché un'unica colonna lunga copriva le frecce e la leva.

## 9 ottobre 2026 — Aria a tempo nei mezzi (v0.58.0)

- **Il proprietario:** le immersioni lunghe sono il vantaggio di sottomarini e U-Boat. Sottomarini 120-170 s (più grandi, più aria), U-Boat 300-600 s. I cetacei non prestano più aria: `RIDE_AIR.bySpecies` è vuoto ma il meccanismo resta. Le mute danno solo un po' d'aria in più (`o2Mult` 0,7-0,85).
- **Il sottomarino** ricarica l'aria in superficie (sopra `restY + underBelow`) o nella stiva. A zero risale da solo: la sua velocità verticale va verso l'alto, ma avanti e indietro restano comandabili.
- **La luce delle rune** è un'immagine a parte, estratta dai pixel rosso acceso del dipinto, disegnata in ADD. Così ogni nave può avere le sue luci senza ridipingere niente.

## 9 ottobre 2026 — Colori del cockpit per nave (v0.58.3)

- **`cockpitTheme`** nel modello della nave: stessa struttura, colori diversi. Il CSS lavora sulle variabili del cockpit (`--steel`, `--amber`, `--phosphor`, `--lamp`, `--line`) più pochi colori scritti a mano; il sonar, disegnato su canvas, prende la sua tavolozza da `ui/cockpitTheme.ts`. Per un'altra nave basta un nuovo tema.

## 9 ottobre 2026 — Pulizia dopo il blocco 4 (v0.58.6)

- **Cockpit a vapore tolto** su richiesta del proprietario: resta nella storia di git (fino a v0.58.5). Gli originali in `art-inbox` sono rinominati con `_`, così `npm run art` li salta e non li cancella.
- **I file grandi sono divisi per responsabilità.** `game.ts` e `submarine.ts` riesportano le parti spostate, così chi li importa non cambia. Il CSS del timone è in `helm.css`, importato subito dopo `ui.css`, quindi l'ordine delle regole resta identico.

## 9 ottobre 2026 — Il mare vivo (v0.59.0)

- **Niente simulazione dell'acqua:** due treni d'onde sinusoidali, la cui altezza cresce col quadrato delle onde del meteo. Ogni mezzo legge l'onda a prua, al centro e a poppa: il su e giù è la media, l'inclinazione la differenza sulla lunghezza. Così un mezzo corto segue ogni onda e uno lungo le media, come nella realtà, con poco calcolo. Il video di riferimento del proprietario non è arrivato; si ritocca se lo manda.
- **Le onde si disegnano dietro i mezzi** (`seaSurfaceView`): sopra la linea di riposo il mare, sotto il cielo. La linea della superficie non passa più sopra gli scafi.
- **La torbidità riusa il "murk" del Delta** (lampada più corta, acqua più scura e verdastra): il Delta resta il massimo. Le bestie lontane diventano sagome con una tinta quasi nera.
- **Una partita nuova parte col sereno;** i salvataggi tengono il loro meteo. In questo modo i test, che creano partite nuove, non dipendono dal meteo a caso.

## 9 ottobre 2026 — Galleggiamento su due punti (v0.59.1)

- **Il proprietario:** "non è un binario", con i suoi video (barca lanciata da un'onda, petroliera che sfonda le onde, onde orbitali Nortek).
- **Modello:** ogni scafo galleggia su due punti, prua e poppa, con una forza d'acqua proporzionale all'immersione e uno smorzamento sulla velocità relativa all'acqua. La velocità comprende il correre contro l'onda: una barca veloce viene lanciata da una cresta. Per il resto c'è solo la gravità.
  - Rigidità e smorzamento passano da "moto d'acqua" a "nave di 90 m" secondo la lunghezza: le barche leggere possono superare l'inclinazione limite e si ribaltano, le navi no.
  - Passi piccoli (1/120 s) per la stabilità.
- **La superficie non ha più bordi dritti:** lo sfondo dipinto ferma il mare al cavo più profondo possibile per il meteo, il resto lo disegna la vista delle onde.

## 10 ottobre 2026 — Blocco 5c: radar, scafo e ricambi, sonar dei sottomarini (v0.63.0)

- **Risposte del proprietario:** radar solo per navi e U-Boat, di prossimità (30 m oltre prua e poppa), con bip "da sensori di parcheggio" quando vai veloce verso un ostacolo, non invadente. Danni dagli urti dell'U-Boat, dalla tempesta a tutta velocità, dalle bestie giganti. Nave in avaria: ricambi da Porto Fango con un mezzo secondario o rimorchiatore; si ripara solo a Porto Fango. Sonar a cerchio sul vetro e freccia verso la nave.
- **Il radar vede il mondo di lato:** in un gioco 2D le distanze sono "avanti/dietro" e "sopra/sotto", così lo schermo rotondo mette i contatti in quelle due direzioni. I bip sono l'unica cosa fuori dal cockpit: niente messaggi né disegni.
- **I ricambi seguono lo schema dei fusti di carburante:** si caricano sul mezzo a Porto Fango e si scaricano rientrando nella stiva. Così motoscafo e sottomarino diventano utili quando la nave è ferma rotta.
- **Le speronate del sottomarino valgono solo se ci sei dentro:** prima una bestia che toccava il sub sulla nave danneggiava il sottomarino nella stiva.

## 10 ottobre 2026 — Niente annunci degli animali (v0.62.1)

- **Il proprietario:** i messaggi che dicono quali animali ci sono "non servono". Tolti gli annunci di bestie pericolose, rare, leggendarie e quelli del compagno che le sente. Le bestie si scoprono col sonar, con la luce e guardando. I messaggi restano per comandi e azioni, e al timone stanno in alto per non coprire leve e pulsanti.

## 9 ottobre 2026 — Blocco 5b: luce e branchi (v0.62.0)

- **Risposte del proprietario:** luce con interruttore a nave ferma che consuma carburante; prima i curiosi, poi i predatori; branchi che combattono insieme, si muovono insieme e cacciano.
- **La luce resta accesa quando ti tuffi o cali il sottomarino** (serve proprio a quello) e si spegne solo se la nave riparte o resta a secco. Le bestie chiamate possono uscire dalle loro acque e non vengono mandate nel buio finché la luce le chiama. Le residenti del mare aperto si svegliano fino alla portata del sonar, sempre fuori dall'inquadratura.
- **Il branco è ancora una bestia sola nel gioco** (la guida) con un numero di compagni (`pack`): solo in battaglia diventano combattenti veri (`BattleState.reserve`). Così niente cambia nei salvataggi e nell'IA, e la formazione è solo grafica (`packFormation.ts`). Solo i branchi aggressivi combattono insieme; esperienza per ognuno battuto, anche se poi fuggi.
- **Nessuna bestia ne mangia un'altra:** l'orca insegue e la preda scappa, ma nessuno sparisce, per non perdere bestie da catturare. I branchi mangiano solo le sardine.

## 9 ottobre 2026 — Blocco 5a: il sonar al centro della caccia (v0.61.0)

- **Risposte del proprietario:** 5 in tre parti; echi da identificare (analisi); tracker di circa 30 minuti di gioco; indizi nel Diario di caccia.
- **Le grandezze dipendono dalla nave** (`sonar.classes`, da 2 a 5): il sonar debole dell'Aurelia resta "piccola/grande" come prima; quelli migliori distinguono di più, l'Ocean's Nightmare anche le leggende. Una classe non distinta si unisce alla più vicina più piccola.
- **L'analisi è nel cockpit** (si tocca l'eco sullo schermo) e vuole la nave lenta col sonar acceso: rende il sonar il centro della ricerca senza dare tutto subito. Gli avvistamenti si salvano per specie (`sonarNotes`, facoltativo nel salvataggio, senza cambiare versione): mostrano solo quello che hai scoperto, non una lista da spuntare.
- **Il tracker usa la bussola già fatta per il drone** (`g.gadgets.target`) con un tempo (`trackLeft`); per ora non costa nulla ed è uno alla volta. Per le bestie della costa non si salva (come il bersaglio del drone): solo le residenti del mare aperto.

## 9 ottobre 2026 — U-Boat a galla a ovest di Porto Fango (v0.60.5)

- **La regola "la nave non va a ovest del porto" vale a est del molo:** un U-Boat che ci passa sotto e risale dall'altra parte naviga libero in superficie (il proprietario lo vuole portare verso Portofosco). Il molo resta un muro a galla in entrambe le direzioni.

## 9 ottobre 2026 — Linea d'acqua dell'U-Boat lungo le onde (v0.60.1)

- **Strisce invece di una maschera:** il taglio rettangolare (crop) è sempre dritto. Una maschera di Phaser 4 ridisegnerebbe ogni fotogramma una texture grande quanto la nave, troppo pesante sull'iPhone. Così ogni dipinto ha 40 copie colorate "sott'acqua", ognuna ritagliata su una striscia verticale all'altezza dell'onda: stessa texture, quindi poco costo.

## 9 ottobre 2026 — Onde realistiche e colonne d'acqua (v0.60.0)

- **Perché sembravano un fantasma:** poche sinusoidi uguali scorrono rigide e si ripetono. Il mare vero è una somma di molte onde con velocità diverse (dispersione del mare profondo, ω = √(g·k)), che forma gruppi. Ora: 8 treni di Gerstner con lunghezze da 34 a 420 unità, altezza ∝ lunghezza^0,75, ripidità dal meteo. Fonti: CREST (crest.readthedocs.io, wave conditions), Wave Generator di ziszle (itch.io).
- **Il mare che risponde agli scafi:** fila di colonne a molle (Michael Hoffman, "Make a Splash with Dynamic 2D Water Effects", Tuts+; Water2D-Unity di MemoryLeakHub; Tessendorf, "Interactive Water Surfaces") sommata alle onde di fondo. Solo 700 colonne attorno alla telecamera: costo piccolo. L'onda di prua cresce con velocità e peso, come negli studi sul "green water" e sullo slamming delle navi (studio KCS sull'angolo di prua, SJTU; modello di slamming UCL).
- **Gli scafi galleggiano solo sulle onde del mare aperto, non sulle colonne:** leggendo anche l'acqua che spingevano, rimbalzavano sulla loro stessa onda di prua e scendevano nel cavo dietro (il "trampolino" visto dal proprietario). Le colonne restano solo da vedere, con un'altezza massima (`COLUMNS.maxHeight`). Il "correre contro l'onda" lancia in aria le barche leggere ma non le navi pesanti (`ride.follow`).
- **Torbidità sullo schermo** pesata da quanto l'inquadratura è sott'acqua: durante il varo la telecamera scende un attimo sotto la superficie e prima lo schermo cambiava colore di colpo.
- **Niente contorni disegnati:** la riga sottile era il contorno della superficie. Il mare è un riempimento pieno fino al cavo più profondo possibile per il meteo.
