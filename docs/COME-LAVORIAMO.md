# Come lavoriamo (per ogni sessione di Claude, sul computer o nel cloud)

Questo file raccoglie quello che una sessione nuova non può sapere dal codice: chi è il proprietario, come parlargli,
come si pubblica, come arrivano le immagini, cosa ha deciso. Leggilo all'inizio insieme a `docs/PROGRESS.md`.
Scritto il 4 ottobre 2026, alla fine della v0.30.0, prima di passare per qualche giorno al cloud.

## Il proprietario

- Non è uno sviluppatore. Rispondi **sempre in italiano semplice**, senza gergo; spiega i passi che deve fare lui (GitHub, iPhone) uno alla volta.
- Ha dato il permesso di scaricare gli strumenti necessari da fonti ufficiali.
- Prima di cambiare il design proponi un piano breve e aspetta il suo "ok" (CLAUDE.md). Quando dice "ok su tutto" o "finisci tutte le fasi end to end", vai avanti da solo fase per fase, pubblicando una versione dopo ogni fase.
- A fine lavoro scrivigli: cosa è cambiato per chi gioca, cosa provare sull'iPhone, cosa potrebbe essersi rotto.

## Come gioca: l'iPhone dalla Home

- Gioca dall'icona sulla Home dell'iPhone (Safari → Aggiungi alla Home), non da una scheda di Safari. Quell'app ha salvataggi suoi: cancellarla cancella la partita.
- Dopo ogni pubblicazione digli: **chiudi il gioco dalla schermata delle app aperte, riaprilo e controlla in Pausa che ci sia scritto "Versione x.y.z"**.
- Se dovesse reinstallare: prima Pausa → Esporta salvataggio, poi Importa.
- Link del gioco: https://matteomango23-png.github.io/leviathan/

## Pubblicare una versione (sempre così)

1. Un ramo per ogni lavoro (`git checkout -b nome-lavoro`), mai su `main` direttamente.
2. `npm run check` deve passare tutto (tipi, ESLint, Prettier, test, build). Controlla che non ci sia "FAIL" e che ci sia "built in".
3. CHANGELOG.md (cosa cambia per chi gioca), docs/DECISIONS.md, docs/PROGRESS.md, docs/ARCHITECTURE.md se cambiano i file; versione in package.json (`npm install --package-lock-only`).
4. Commit in italiano (`feat: …`, `fix: …`) che finisce con la riga `Co-Authored-By:` del modello in uso.
5. `gh pr create` (descrizione che finisce con "🤖 Generated with [Claude Code](https://claude.com/claude-code)") → `gh pr merge --merge` → `git checkout main && git pull` → `git tag vX.Y.Z` → `git push origin vX.Y.Z`. GitHub Actions pubblica da solo.
6. **Lezione del 3 ottobre:** concatena i passi con `&&`, mai con `;`. Una volta uno script è fallito ma con `;` la pubblicazione è andata avanti lo stesso, senza documenti e con il numero di versione sbagliato.

## Due sessioni sullo stesso progetto (computer e cloud)

- La "memoria" condivisa è **il progetto su GitHub**: codice, CLAUDE.md, questo file, docs/PROGRESS.md, CHANGELOG.md. Le note private di una sessione non passano all'altra.
- Mai due sessioni al lavoro nello stesso momento.
- **All'inizio:** `git checkout main && git pull`, poi leggi PROGRESS e CHANGELOG per sapere cosa ha fatto l'altra sessione.
- **Alla fine:** tutto unito in `main`, e una sezione nuova in PROGRESS con cosa è stato fatto e cosa manca, così l'altra sessione riparte pulita.

## Le immagini

- Le genera il proprietario con Gemini (oppure, sul computer, le genero io nel suo Gemini con Claude in Chrome: una chat, una richiesta alla volta, circa 40 secondi l'una, dopo circa 60 immagini Gemini si ferma per il giorno). L'ordine di ogni lotto si scrive in `docs/GEMINI-LOTTO-N.md` per riconoscere i file scaricati.
- **Nel cloud non si può usare il suo Gemini né vedere il suo computer:** le immagini te le allega in chat o le carica su GitHub in `art-inbox/`.
- Le riconosci guardandole tu: **non chiedergli mai di rinominarle**. Prima di dire che un'immagine manca, apri tutti i file della sua cartella (spesso ci sono card, profilo, bocca aperta, davanti e dietro con nomi a caso).
- Gli originali vanno in `asset animali ai/<cartella>/` con il nome finale (sul computer; la cartella non è su GitHub), le copie in `art-inbox/` con i nomi standard, poi `npm run art`. Mai cancellare gli originali. Fondo verde per lo scontorno. `_flip` / `_left` nel nome = immagine specchiata.
- Le viste "di schiena" (per la tua bestia in battaglia) vengono spesso male: controllale e rifalle se sono deformate.

## Lo stile (decisioni del proprietario)

- **Grafica realistica dark fantasy**, non pixel art.
- **Evoluzioni:** forme nuove dello stesso animale, **molto diverse** a colpo d'occhio (più grosse, preistoriche, corazze, cicatrici, rune, pinne in più, scariche elettriche, bioluminescenza): "un ibrido tra un animale e un Pokémon", non ridicolo. Mai una specie che diventa un'altra (no "varano → coccodrillo"). Niente fuoco dalla bocca. Le richieste a Gemini **senza allegare la card di base** (allegandola, Gemini ridisegna lo stesso animale). Una prova alla volta, decide lui. Il varano avrà 3 stadi, l'ultimo uno "spinosauro marino" con la testa da varano. Leggende e starter non hanno nuove evoluzioni.
- Riferimenti che gli piacciono: la tartaruga con un ecosistema sul guscio, lo squalo albino con l'arpione nella spalla, l'orca albina gigante con tre pinne dorsali.
- **Battaglie:** "copia esattamente Pokémon", rinominando: statistiche, danno, tipi ×2/×½, mosse con PP, stati, esperienza, cattura, livello 100, scheda, zaino, evoluzione annullabile. I nostri 5 tipi restano. Le mosse in mare (quando cavalchi) sono separate da quelle di battaglia e restano le vecchie, da ripensare.

## Dove siamo

Lo stato aggiornato e la lista di cosa fare dopo sono in `docs/PROGRESS.md` (in alto); cosa è cambiato versione per versione in `CHANGELOG.md`.
