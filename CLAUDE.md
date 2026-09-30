# Leviatano — istruzioni per Claude Code

Gioco 2D pixel art dark fantasy di esplorazione subacquea e collezione di bestie (Pokémon + Monster Hunter sott'acqua). Leggi all'inizio di ogni sessione: `docs/GDD.md` (regole di design), `docs/PROGRESS.md` (dove siamo). Riferimenti: `prototype/leviatano.html` (prototipo giocabile: meccaniche, generatore del mondo, luce, IA, domatura, squadra; la sua grafica pixel NON è la direzione finale), `prototype/prova-realistica.html` (la direzione grafica approvata: fondali dipinti a strati, luce, bestia animata a spina dorsale, regole di movimento dello squalo) e `docs/ART.md` (illustrazioni e sprite).

## Risparmio di contesto

- I prototipi sono file lunghi: non leggerli tutti. Cerca con grep le funzioni che servono alla tappa in corso (es. `genWorld`, `bakeTerrain`, `genSharkK`, `updateWild1`, `tameAttempt`, `render`) e leggi solo quelle.
- Non rileggere i file di `data/` interi se non servono: importali e usa i tipi.
- `docs/PROGRESS.md` è la memoria tra una sessione e l'altra: aggiornalo bene, così la sessione successiva può partire pulita.

## Dati: fonte unica

I file in `data/` (rules.ts, species.ts, moves.ts, world.ts) sono già scritti e verificati: 34 bestie, 102 mosse, 4 sciami, tipi, regioni, pesci, mute, armi, oggetti, skin, costanti di progressione. Spostali in `src/data/` all'inizio del progetto e usali così come sono.
- Nessun numero di gioco scritto a mano nei sistemi: tutto viene da `src/data`.
- Se serve un campo nuovo, aggiungilo ai dati e al tipo TypeScript, non nel codice di gioco.
- I valori segnati "tuning" sono un primo bilanciamento: si cambiano lì.

## Stack

- Phaser (ultima versione stabile) + TypeScript strict + Vite.
- PWA installabile e giocabile offline (service worker con precache di tutti gli asset), iPhone in orizzontale.
- Deploy su GitHub Pages con GitHub Actions a ogni push su `main`.

## Architettura

- `src/scenes/`: Boot, World (gioco), UI (HUD e controlli touch), Menus (squadra, bestiario, scheda bestia, pausa, porto, zaino).
- `src/systems/`: mondo, luce e buio, fisica e collisioni, bestie (IA selvatica, compagno, branco, catena alimentare), mosse e tipi, domatura, combattimento e armi, crescita e livelli, economia e negozio, salvataggi.
- Salvataggi versionati (campo `version` + migrazioni) con esporta/importa.

## Direzione grafica (approvata dopo le prove)

- **Realistica in alta risoluzione, telecamera lontana:** il sub è piccolo, il mare grande. Niente pixel art.
- **Fondali dipinti a strati** con parallasse (rocce lontane, medie, fondale in primo piano, alghe che ondeggiano, raggi di luce, particelle), come in `prototype/prova-realistica.html`; più avanti sostituibili con arte dipinta.
- **Buio vero con maschera di luce** in alta risoluzione: lampada a cono del sub, alone, bioluminescenze; più buio con la profondità.
- **Dimensioni:** ogni bestia ha `lengthM` (lunghezza reale, sub = 2 m) in `data/species.ts`; varianti, forma finale e crescita la moltiplicano (`RENDER`, `FINAL_FORM_SIZE_MULT`, `VARIANT_RULES`, `UNIQUE_VARIANTS` in `data/`). Esempio: squalo bianco 6 m, alfa 6,9 m, Sfregiato 7,5 m, forma finale 9 m, megalodonte 18 m. Le immagini hanno tutte lo stesso riquadro: la dimensione la applica il gioco.
- **Bestie grandi:** un'immagine di profilo dipinta (`public/sprites/<id>.webp`, sfondo trasparente) animata con una mesh lungo la spina dorsale (in Phaser: Rope/Mesh). Squali e pesci: nuoto laterale, la coda si accorcia e si allunga in prospettiva, testa quasi ferma. Cetacei (orca, capodoglio, megattera, beluga, narvalo, Livyatan): onda verticale. Bocca aperta: seconda immagine `<id>_open.webp` alternata nei morsi. Tentacoli e arti (polpo, calamari, Piovra, Kraken, granchio, lontra, foca): animazione a pezzi separati.
- **Sub:** sprite dipinto, animato a pezzi (braccia, gambe, pinne); finché manca, segnaposto vettoriale come nella prova.
- **Pesci piccoli:** piccoli e realistici, argentati con riflessi, in banchi.
- **Illustrazioni delle card** (`public/art/<id>.webp`, verticali): solo in squadra, bestiario e scheda. In orizzontale l'illustrazione sta a sinistra intera, i dati a destra.

## Regole di movimento delle bestie grandi

- Non si girano mai in vista: virano solo fuori inquadratura, dietro un elemento del fondale in primo piano, o contro una parete (lì la virata visibile è accettabile).
- Pattugliamento: entrano dal bordo e rallentano, incrociano lente vicino al sub seguendo la sua profondità, verso il bordo opposto accelerano fino a uscire; fuori schermo aspettano 1-2 s, si girano e rientrano dallo stesso lato da cui sono uscite.
- Se il sub le segue per circa 1 s, o restano in vista più di circa 9 s senza attaccare, scattano via più veloci del sub (anche del suo scatto).
- Se restano indietro fuori schermo mentre sono rivolte verso lo schermo, recuperano accelerando.
- Quando attaccano accelerano. La logica di riferimento è in `prototype/prova-realistica.html` (funzione `update`, blocco dello squalo).

## Controlli

- Risoluzione piena del dispositivo (con limite di densità 2x), safe area dell'iPhone, obiettivo 60 fps.
- Touch: joystick dinamico a sinistra; a destra pulsante arma che è anche joystick di mira, scatto/carica, azione contestuale, 3 pulsanti mossa quando cavalchi, branco. Tastiera per test su PC.

## Qualità del codice e ordine (obbligatorio, in autonomia)

Il proprietario non è uno sviluppatore: il codice deve restare ordinato, correggibile e reversibile senza che lui debba chiederlo.

- **Git:** repository inizializzato dalla prima sessione, collegato a GitHub come backup. Un ramo per ogni tappa (`tappa-2-squalo`), unito in `main` solo quando la tappa funziona. Commit piccoli con messaggi chiari in italiano (`feat: ...`, `fix: ...`, `refactor: ...`).
- **Versioni:** a ogni build giocabile un'etichetta git (`v0.1.0`, `v0.2.0`...) e una voce in `CHANGELOG.md` con cosa è cambiato per il giocatore. Deve sempre essere possibile tornare all'ultima versione funzionante.
- **Controlli prima di ogni commit:** `npm run check` esegue controllo dei tipi (TypeScript strict), ESLint, Prettier, test (Vitest) e build. Se qualcosa fallisce, si corregge prima di salvare. Configurali nella sessione 1.
- **Test automatici** sui sistemi con regole: tipi e danni, sblocco mosse, domatura, crescita, economia, salvataggi e migrazioni. Ogni bug corretto aggiunge un test che lo avrebbe trovato.
- **Architettura:** file piccoli con una responsabilità sola (indicativamente sotto le 300 righe); le scene disegnano e ricevono input, la logica sta nei sistemi, i numeri nei dati. Niente dipendenze circolari, niente variabili globali condivise.
- **Documentazione viva:** `docs/ARCHITECTURE.md` (mappa di cartelle e sistemi, aggiornata quando cambia la struttura), `docs/DECISIONS.md` (ogni scelta tecnica importante: data, decisione, motivo), `docs/PROGRESS.md` (a fine sessione).
- **Autorevisione:** prima di chiudere una sessione rileggi il diff e scrivi al proprietario, in italiano e senza gergo, cosa hai cambiato, cosa provare sull'iPhone e cosa potrebbe essersi rotto.
- **Pulizia:** ogni 3 tappe una sessione dedicata a rimuovere codice morto, semplificare e aggiornare i documenti, senza nuove funzioni.
- **Dipendenze:** il minimo indispensabile; ogni nuova libreria va motivata in `docs/DECISIONS.md`.

## Immagini in arrivo

Il proprietario genera le immagini con un'AI e le salva in `art-inbox/` con questi nomi: `<id>_card.jpg` (illustrazione verticale), `<id>_side.jpg` (profilo, bocca chiusa, fondo nero), `<id>_side_open.jpg` (bocca aperta). Gli `id` sono quelli di `data/species.ts`; per varianti e forme finali: `<id>_albino_...`, `<id>_alfa_...`, `<id>_finale_...`.
- Crea uno script `npm run art` che le elabora: scontorna il fondo nero (riempimento dal bordo, soglia bassa, bordo morbido), ritaglia, porta i profili sul riquadro standard 1000×460 con la linea del corpo a y=250 (vedi `docs/ART.md`), taglia le card a 2:3 e le salva in webp in `public/sprites/` e `public/art/`.
- Le immagini già pronte in `public/` sono il riferimento del risultato atteso.
- Non cancellare mai i file originali in `art-inbox/`.

## Come lavorare

- Una tappa della roadmap alla volta (`docs/GDD.md`, "Roadmap"); niente funzioni fuori dalla tappa in corso.
- Prima di scrivere codice proponi un piano breve e aspetta conferma.
- Commit piccoli e descrittivi; prima di dichiarare finito: `npm run build` e controllo dei tipi senza errori.
- A fine sessione aggiorna `docs/PROGRESS.md`: fatto, mancante, cosa provare sull'iPhone.
- Non cambiare decisioni di design senza chiedere; segnala i problemi.
- Codice e commenti in inglese; testi del gioco in italiano.
- Asset esterni solo con licenza libera (preferibilmente CC0), con fonte e licenza in `docs/CREDITS.md`.
