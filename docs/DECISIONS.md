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
