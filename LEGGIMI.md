# Kit Leviatano — versione del 29 settembre 2026

Questa è la versione completa e aggiornata da dare a Claude Code. Se hai altri zip più vecchi, usa solo questo.

## Contenuto

- `CLAUDE.md` — istruzioni permanenti per Claude Code (le legge da solo a ogni sessione)
- `docs/GDD.md` — documento di design: tutte le regole del gioco
- `docs/PROMPT.md` — i prompt da incollare, una sessione alla volta
- `docs/PROMPT-IMMAGINI.md` — prompt generici e lista completa delle bestie, per generare le immagini con Gemini
- `docs/ART.md` — come generare e salvare le illustrazioni delle card
- `docs/PROGRESS.md` — lo aggiorna Claude Code a fine sessione
- `data/rules.ts` — tipi, debolezze, livelli, sblocco mosse, crescita, domatura, varianti
- `data/species.ts` — le 34 bestie, varianti uniche dei Guardiani, statistiche
- `data/moves.ts` — le 102 mosse, con animazioni delle mosse firma
- `data/world.ts` — regioni, pesci, mute, armi, zaino, oggetti, skin, 4 sciami
- `public/art/` — illustrazioni pronte: squalo bianco (normale, alfa, albino, Mega albino, Sfregiato, Titano), barracuda, torpedine
- `public/sprites/` — sprite di gioco pronti: squalo bianco normale, alfa, albino, Sfregiato, Titano e Mega albino (tutti a bocca chiusa e aperta)
- `prototype/leviatano.html` — il prototipo giocabile: riferimento per le meccaniche
- `prototype/prova-realistica.html` — riferimento per la grafica approvata e il movimento dello squalo

## Immagini

Salva le immagini generate nella cartella `art-inbox/` del progetto, con i nomi indicati in `docs/PROMPT-IMMAGINI.md`. Claude Code le elabora da solo con `npm run art`.

## Come partire

1. Estrai lo zip in una cartella sul computer.
2. Apri un terminale in quella cartella e scrivi `claude`.
3. Incolla il prompt della Sessione 1 da `docs/PROMPT.md`.
