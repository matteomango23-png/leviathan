# Architettura

Mappa delle cartelle e dei sistemi. Si aggiorna ogni volta che cambia la struttura.

## Cartelle

| Cartella | Contenuto |
|---|---|
| `src/data/` | Tutti i numeri del gioco (fonte unica). File del kit (`rules`, `species`, `moves`, `world`) + `worldLayout.ts` (forma dell'oceano, zone, banchi, alghe, coralli) + `diver.ts` (sub, arpione, sardine, telecamera, luce, colori del mare, salvataggi). |
| `src/systems/` | Logica di gioco pura, senza Phaser: testabile con Vitest. |
| `src/views/` | Disegno con Phaser: fondali, rocce dipinte, luce, sub, pesci, alghe, effetti, telecamere. Nessuna regola di gioco. |
| `src/scenes/` | Scene Phaser: collegano sistemi, viste e input. |
| `src/ui/` | Interfaccia HTML sopra il gioco: HUD, controlli touch e tastiera, menu di pausa, esporta/importa. |
| `tests/` | Test automatici (Vitest). |
| `public/` | File serviti così come sono: sprite, illustrazioni, icone dell'app. |
| `scripts/` | Script di servizio (`make-icons.mjs`). |
| `prototype/` | Prototipi HTML di riferimento (non fanno parte del gioco). |
| `art-inbox/` | Immagini generate dal proprietario, da elaborare con `npm run art` (Sessione 2). |
| `docs/` | Design, decisioni, progressi, crediti. |

## Sistemi (`src/systems/`)

| File | Cosa fa |
|---|---|
| `world/worldGen.ts` | Genera la mappa a tile (720×200, tile da 8) dalle forme di `worldLayout.ts`. Sempre lo stesso mondo. |
| `world/tileMap.ts` | La mappa: tile, campo "roccia" smussato, collisioni rotonde, movimento dei corpi. |
| `world/zones.ts` | Nome della zona e profondità in metri. |
| `diver.ts` | Nuoto, scatto, ossigeno, cuori, morte e rinascita in superficie. |
| `harpoon.ts` | Arpione: va, aggancia un pesce o rimbalza sulla roccia, torna. |
| `fish.ts` | Banchi di sardine che vagano e scappano dal sub. |
| `game.ts` | Un passo di gioco completo + conversione da/verso il salvataggio. |
| `save/saveData.ts` | Formato del salvataggio con `version`, migrazioni, controllo di validità. |
| `save/storage.ts` | Lettura/scrittura nel browser, mai bloccante; copia di sicurezza se il salvataggio è rotto. |
| `input.ts`, `events.ts`, `math.ts` | Tipi di input ed eventi, rumore e numeri casuali ripetibili. |

## Scene (`src/scenes/`)

- **Boot**: dipinge le texture procedurali e avvia World + UI.
- **World**: fa girare il gioco e lo disegna con tre telecamere: sfondo (schermo), mondo (zoom, segue il sub), sovrapposizione (buio e luce).
- **UI**: HUD e controlli (HTML sopra il canvas, rispetta la safe area dell'iPhone).
- **Menus**: menu di pausa (esporta/importa). Più avanti squadra, bestiario, scheda bestia, porto, zaino.
- Le scene si passano un oggetto `Session` (stato, input, messaggi): niente variabili globali.

## Come si disegna il mare

1. **Sfondo** (`backgroundView`): colore dell'acqua per profondità, cielo, raggi di luce, creste lontane con parallasse, neve marina.
2. **Rocce** (`terrainView` + `terrainPainter`): pezzi da 256×256 unità dipinti al volo attorno alla telecamera (bordi morbidi, ombra all'interno, sedimento sui ripiani, coralli) e riciclati per risparmiare memoria.
3. **Mondo**: alghe, sardine, arpione, sub, bolle, linea della superficie; alcune alghe davanti al sub.
4. **Buio** (`lightView`): maschera a metà risoluzione, più scura con la profondità; la lampada (cono) e l'alone la "bucano"; bagliore caldo e vignettatura sopra.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia il gioco sul computer (http://localhost:5173). |
| `npm run dev:phone` | Come sopra, raggiungibile dall'iPhone sulla stessa rete Wi-Fi. |
| `npm run check` | Tutti i controlli: tipi, ESLint, Prettier, test, build. Obbligatorio prima di ogni commit. |
| `npm run build` | Crea la versione pubblicabile in `dist/` (con il service worker per l'offline). |
| `npm run icons` | Rigenera le icone dell'app da `public/art/squalo_bianco.webp`. |

## Pubblicazione

`.github/workflows/deploy.yml`: a ogni push su `main` GitHub esegue `npm run check` e pubblica `dist/` su GitHub Pages (https://matteomango23-png.github.io/leviathan/).
