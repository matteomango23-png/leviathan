# Architettura

Mappa delle cartelle e dei sistemi. Si aggiorna ogni volta che cambia la struttura.

## Cartelle

| Cartella | Contenuto |
|---|---|
| `src/data/` | Tutti i numeri del gioco (fonte unica). File del kit + file aggiunti per le nuove tappe. |
| `src/scenes/` | Scene Phaser: disegnano e ricevono input, nessuna regola di gioco. |
| `src/systems/` | Logica di gioco pura (niente Phaser dove possibile), testabile. |
| `tests/` | Test automatici (Vitest). |
| `public/` | File serviti così come sono: sprite, illustrazioni, icone. |
| `prototype/` | Prototipi HTML di riferimento (non fanno parte del gioco). |
| `art-inbox/` | Immagini generate dal proprietario, da elaborare con `npm run art` (Sessione 2). |
| `docs/` | Design, decisioni, progressi, crediti. |

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il gioco sul computer (http://localhost:5173). |
| `npm run dev:phone` | Come sopra, raggiungibile dall'iPhone sulla stessa rete Wi-Fi. |
| `npm run check` | Tutti i controlli: tipi, ESLint, Prettier, test, build. Obbligatorio prima di ogni commit. |
| `npm run build` | Crea la versione pubblicabile in `dist/`. |
