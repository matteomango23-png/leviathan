# Progressi

## Sessione 1 — Fondamenta (30 settembre 2026) → v0.1.0

**Fatto (tappa 1 della roadmap)**

- Ordine del progetto: git + GitHub (`matteomango23-png/leviathan`), `npm run check` (tipi strict, ESLint, Prettier, Vitest, build), CHANGELOG, ARCHITECTURE, DECISIONS, CREDITS.
- Phaser 4.2.1 + TypeScript + Vite; `data/` spostata in `src/data/` senza modifiche. Nuovi dati: `src/data/worldLayout.ts`, `src/data/diver.ts`.
- Mondo a tile portato dal prototipo (stesse forme), disegnato con la resa della prova realistica: rocce dipinte a pezzi, parallasse, raggi, neve marina, alghe, coralli, buio con lampada a cono.
- Sub segnaposto vettoriale animato a pezzi; nuoto, scatto, ossigeno, cuori, morte e rinascita in superficie.
- Arpione con mira a doppio joystick (trascinando il pulsante) e tocco sull'acqua; sardine in banchi che fuggono; cattura = cuore + conteggio + bestiario.
- Salvataggi versionati con migrazioni, esporta/importa, copia di sicurezza dei salvataggi rotti.
- PWA installabile e offline; pubblicazione automatica su GitHub Pages; icona provvisoria dallo squalo bianco.
- 41 test automatici (dati del kit, mondo, collisioni, sub, arpione, sardine, salvataggi, migrazioni).
- Documenti allineati sulla grafica realistica (GDD, ART, CLAUDE.md).

**Mancante / da sapere**

- Phaser 4 non ha Rope/Mesh: l'animazione a spina dorsale dello squalo (Sessione 2) si farà a strisce, come nella prova realistica (vedi DECISIONS).
- Il muro di ossa e il ghiaccio ci sono ma non si rompono ancora (servono le bestie, tappa 2+).
- Nessun suono ancora (non richiesto nella tappa 1).
- Il legame con lo sciame di sardine (10 catture) è della tappa 3: per ora si contano soltanto.
- L'offline non si può provare nel browser integrato di Claude (non permette i service worker): va provato sull'iPhone.

**Da provare sull'iPhone**

1. Apri https://matteomango23-png.github.io/leviathan/ in Safari → Condividi → Aggiungi alla schermata Home → apri dall'icona.
2. In orizzontale: joystick a sinistra, Arpione (tieni premuto, trascina per mirare), Scatto, tocco sull'acqua per sparare.
3. Cattura qualche sardina, scendi in profondità (buio, ossigeno), risali.
4. Chiudi l'app e riaprila: devi ripartire da dove eri.
5. Modalità aereo, riapri dall'icona: deve funzionare.
6. Pausa (II) → Esporta salvataggio → Salva in File.

**Prossima sessione:** Sessione 2 — Solo lo squalo bianco (`docs/PROMPT.md`). Ramo consigliato: `tappa-2-squalo`.
