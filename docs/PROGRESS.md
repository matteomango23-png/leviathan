# Progressi

## Sessione 2 — Solo lo squalo bianco (30 settembre 2026) → v0.2.0

**Fatto (tappa 2 ristretta allo squalo bianco)**

- `npm run art`: scontorno del fondo nero, profili 1000×460 con linea del corpo a y=250, card 2:3 640×960, `_left` per i profili a sinistra, mai sovrascrive senza `--force`. Le immagini della cartella "asset animali ai" sono in `art-inbox/` con i nomi standard; generati sprite e card mancanti di barracuda, torpedine, tartaruga marina, squalo martello, squalo tigre, megattera, orca, coccodrillo marino (gli sprite già approvati dello squalo non sono stati toccati).
- Squalo bianco selvatico nella Baia: sprite animato a strisce lungo la spina dorsale (Phaser 4 non ha Rope), bocca aperta nei morsi, regole di movimento delle bestie grandi (test automatico: non si gira mai in vista).
- Sei versioni con le taglie da `data/` (6 / 6,9 / 6 / 9 / 7,5 / 9 m). Alfa e albino compaiono in natura (4% e 8%).
- Combattimento: arpione, tipi e moltiplicatori, danni delle mosse, barre della vita con tacca di sfinimento, numeri dei danni.
- Domatura con minigioco legato alla differenza di livello; doppione comune che fugge.
- Squadra (5) + riserva, richiamo con ricarica, compagno che difende, cavalcatura con 3 pulsanti mossa (Morso, Carica che rompe le ossa, Frenesia), KO.
- Santuari con cura graduale (anche delle bestie KO) e rinascita.
- Salvataggio v2 con migrazione dalla v1. Pannello di prova con `?prove`.
- 72 test automatici.

**Mancante / da sapere**

- Le altre bestie della Baia (barracuda, tartaruga, torpedine) arrivano nella sessione 3: le loro immagini sono già pronte.
- Esperienza, livelli che salgono, crescita e forme finali: tappa 4. Per ora una bestia domata resta al suo livello (lo squalo selvatico è di livello 4–6, quindi ha solo Morso; per provare Carica e Frenesia usa il pannello di prova).
- Lo Sfregiato come Guardiano con i suoi attacchi: tappa 4. Titano e Mega albino si vedono solo col pannello di prova.
- Branco (tutta la squadra in acqua) e catena alimentare: non ancora.
- Da chiarire col proprietario: a quali bestie corrispondono le cartelle "orca matriarca", "orca madre delle madri (matriarca leggendaria)", "orca preistorica albina" e "coccodrillo albino leggendario" (non ancora copiate in `art-inbox/`). Controllare anche che per l'orca il profilo aperto/chiuso sia giusto (stabilito dall'ordine dei file).

**Da provare sull'iPhone**

1. Nuota verso ovest (sinistra) dalla partenza fino alla "Baia di Portofosco": dopo pochi secondi arriva lo squalo.
2. Colpiscilo con l'arpione; quando apre le fauci e rallenta, scatta in alto o in basso per schivare l'affondo.
3. Quando è sfinito (barra azzurra), avvicinati: tocca "Doma" e poi tocca lo schermo quando l'ago è nella fascia chiara.
4. In sella: prova Morso; scendi con "Scendi"; richiama e chiama lo squalo toccandolo nella barra in alto.
5. Trova il santuario della Baia (arco di pietra con la luce azzurra) e resta fermo dentro.
6. Apri `https://matteomango23-png.github.io/leviathan/?prove` → pausa → prova le sei versioni e lo squalo di livello 15 (Carica sul muro di ossa, a ovest in profondità; Frenesia).

**Prossima sessione:** Sessione 3 — Porto ed economia (`docs/PROMPT.md`), più le altre bestie della Baia. Ramo consigliato: `tappa-3-porto`.

## Sessione 1 — Fondamenta (30 settembre 2026) → v0.1.0

Progetto, mondo a tile con resa realistica, sub, arpione, sardine, luce, PWA offline, salvataggi con esporta/importa, pubblicazione su GitHub Pages. Vedi CHANGELOG.
