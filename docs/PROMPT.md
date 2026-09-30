# Prompt per le sessioni con Claude Code

Incolla un prompt alla volta a inizio sessione. Aspetta il piano, confermalo, poi lascialo lavorare. A fine sessione prova il gioco sull'iPhone dal link di GitHub Pages.

## Sessione 1 — Fondamenta

Prima di tutto imposta l'ordine descritto in CLAUDE.md, sezione "Qualità del codice e ordine": git con collegamento a GitHub, `npm run check` (tipi, ESLint, Prettier, Vitest, build), CHANGELOG, docs/ARCHITECTURE.md e docs/DECISIONS.md.

Leggi CLAUDE.md, docs/GDD.md e prototype/leviatano.html. Obiettivo: tappa 1 della roadmap.
1. Crea il progetto Phaser + TypeScript + Vite con la struttura di CLAUDE.md e sposta `data/` in `src/data/`.
2. Porta dal prototipo la generazione del mondo a tile e le meccaniche del sub (joystick touch e tastiera, arpione con mira a doppio joystick, sardine da catturare), ma con la resa di prototype/prova-realistica.html: alta risoluzione, telecamera lontana, fondali dipinti a strati, buio con la lampada, pesci piccoli realistici, sub segnaposto vettoriale.
3. PWA installabile e giocabile offline; salvataggi versionati con esporta/importa; deploy su GitHub Pages.
Prima di scrivere codice proponimi il piano e dimmi cosa devo fare io su GitHub.

## Sessione 2 — Solo lo squalo bianco

Tappa 2 ristretta a una sola bestia: lo squalo bianco, fatto bene e completo, prima di aggiungere le altre.
1. Script `npm run art` per le immagini di `art-inbox/` (CLAUDE.md, "Immagini in arrivo").
2. Squalo bianco selvatico da sprite di profilo animato a spina dorsale, bocca aperta nei morsi, regole di movimento delle bestie grandi (CLAUDE.md e prototype/prova-realistica.html).
3. Le sue sei versioni: normale, alfa, albino, Mega albino, Sfregiato, Titano, con le dimensioni da `data/`.
4. Domatura col minigioco legato alla differenza di livello, squadra con richiamo e ricarica, compagno che difende, cavalcatura con 3 pulsanti mossa, tipi e moltiplicatori, barre vita e numeri di danno, santuari con cura graduale, KO.
Le altre bestie della Baia arrivano nella sessione successiva. Proponi il piano prima di iniziare.

## Sessione 3 — Porto ed economia

Tappa 3: Portofosco con mercato, recinto e bacheca; denti di squalo; vendita pesci, relitti, missioni semplici; mute e potenziamenti; zaino con 3 posti; oggetti; sciami (legame dopo N catture, richiamo dallo zaino). Proponi prima il piano.

## Sessione 4 — Livelli, crescita e primo Guardiano

Tappa 4: esperienza e livelli delle bestie, sblocco mosse ai livelli 1/7/15, danno che cresce col livello, crescita 31-50 con barra di nutrimento, schede bestia con mosse e lucchetti, Lo Sfregiato come primo Guardiano con pattern d'attacco. Proponi prima il piano.
