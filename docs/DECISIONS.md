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

## 2026-09-30 — Direzione grafica realistica

**Decisione:** confermata dal proprietario la grafica realistica dark fantasy di `CLAUDE.md` e `prototype/prova-realistica.html`. Le frasi sulla "pixel art" in `docs/GDD.md` e `docs/ART.md` sono state allineate.
