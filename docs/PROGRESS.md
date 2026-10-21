# Progressi

## Dove siamo (aggiornato il 21 ottobre 2026, v0.94.1)

- **Gioco:** mare in tre zone (baia, Delta, mare aperto infinito), 34 bestie con albini, alfa, forme finali e uniche, battaglie a turni con mosse e domatura, flotta (navi, sottomarini, motoscafi), porti con bacheca, mercato, cantiere, riparazioni, sonar e cacce, meteo, suoni e musiche.
- **Salvataggi:** menu iniziale con più partite (`systems/save/slots.ts`); una partita illeggibile non si sovrascrive mai. Dire sempre al proprietario quando un lotto tocca i salvataggi.
- **Immagini:** quasi tutte le bestie hanno card, profili, fronte e retro. Mancano:
  - Kraken, Leviatano, calamaro colossale, serpente di mare (disegno provvisorio);
  - conchiglie (`docs/GEMINI-LOTTO-7.md`);
  - sfondo del menu iniziale (`art-inbox/menu_sfondo.jpg`).
- **Strumenti di prova da togliere più avanti** (il proprietario l'ha chiesto): 5 tocchi sulla versione in pausa, "+50.000 denti", Galleria di prova (`systems/gallery.ts`, `ui/galleryBar.ts`).
- **Immagini attese:** del lotto 8 (`docs/GEMINI-LOTTO-8.md`) mancano `squalo_balena_back` e i 6 dei coccodrilli; il Leviatano (le dà il proprietario: ricordarglielo); la grafica della schermata iniziale (`art-inbox/splash.jpg`).
- **Note del 21 ottobre sera** (`docs/BACKLOG.md`, in alto): AE schermo e musica ✅, AF salti e incastri ✅; poi AG schede, AH sub, AI bagliori, AD-4 poteri speciali.
- **Ruoli, tipi e compagni** (`docs/PROPOSTA-RUOLI.md`, confermata): AD-1 tipi chiari ✅, AD-2 cavalcature ✅, AD-3 il branco ✅; **prossimo AD-4 poteri speciali** (polpo, lontra, beluga, squalo martello, ossigeno).
- **Dopo AD-3 e AD-4:** correzioni del "Blocco 2" ancora aperte, Blocco 6 (cattura e combattimento, da progettare insieme), poi blocchi 7-10 (`docs/BACKLOG.md`).
- **Ultima pulizia:** v0.94.1 (21 ottobre), la prossima dopo altri 3 lotti. La galleria e gli strumenti di prova restano finché il proprietario prova.
- **Storia:** `docs/PROGRESS-ARCHIVIO.md` ha le sessioni fino al lotto AD-3 (v0.92.0); qui sotto le ultime.
- **Per vedere il gioco quando il pannello del browser è nascosto:** `renderer.snapshot` più `node scripts/snap-server.mjs <cartella>` (dettagli nella sessione del lotto AA, nell'archivio).

## Pulizia dopo i lotti AD-3, AE, AF (21 ottobre 2026) → v0.94.1

- Tolto `splashEntered` (mai usato). Non più esportate le funzioni usate solo nel loro file: `isLegendary`, `speedShareOf`, `mountProfile`, `nameSeenEchoes`, `RideNow`.
- Le sessioni dal lotto AB al lotto AD-3 sono passate in `PROGRESS-ARCHIVIO.md`.
- Tutti i file di codice sono sotto le 300 righe (sopra restano solo file di dati).
- Nessuna funzione nuova; i salvataggi non cambiano.

## Lotto AF, bestiario, salti e incastri (21 ottobre 2026) → v0.94.0

- **Immagini:** 13 del lotto 8 riconosciute dalla cartella del desktop e messe in `art-inbox/` (le vecchie sono `_vecchia_`/`_vecchia2_`).
  - Archelon: profilo, bocca aperta, fronte e retro.
  - Saetta: fronte e retro.
  - Un'immagine ciascuno per murena, squalo bianco albino, tartaruga liuto, manta, megattera.
  - Lontra: fronte (specchiato con `_flip`) e retro.
  - Tolto il taglio in basso della manta (la roccia non c'è più).
  - **Mancano:** `squalo_balena_back` e i 6 dei coccodrilli.
- **Bestiario:** `data/bestiaryOrder.ts` (famiglie in ordine); `bestiaryEntries` lo segue (`bestiaryOrder()`, campo `family`); titoli `.bestiary-family` nascosti se la famiglia è vuota nel filtro o con l'ordine per rarità.
- **Collisioni** (`COLLISION` in `worldLayout.ts`):
  - `moveBody` fa scivolare lungo l'ostacolo (in su o in giù fino a `slideSlope` × il passo);
  - incastrato anche con il centro, esce verso l'acqua libera (`nearestOpen(…, true)`, prima in basso, mai sopra la superficie).
- **Salto:**
  - `stepAirborne` muove con le collisioni;
  - atterrando su qualcosa fuori dall'acqua, `landOn` fa un saltino e scivola indietro (`RIDE_BREACH.landHop`, `slideSpeed`);
  - in volo lo scafo della nave spinge fuori lungo la sua forma;
  - "sotto la chiglia" solo per una bestia già sott'acqua.
- **Sardine:** il banco cambia meta se la strada entra nella roccia; i pesci lontani non entrano nella roccia.
- **Test:** `tests/lottoAF.test.ts`.
- **Nel browser:** salti dello squalo bianco contro la nave: atterra, scivola indietro, spostamento massimo per fotogramma 1,8 unità (prima 21); bestiario con 12 titoli.

**Da provare sull'iPhone:**
- saltare sulla nave, su un iceberg e su un'isoletta;
- nuotare con una bestia grande sotto gli iceberg;
- il bestiario.

## Lotto AE, schermo e musica (21 ottobre 2026) → v0.93.0

- **Schermata iniziale:**
  - `#splash` in `index.html` (stile in `style.css`), `ui/splash.ts` (`initSplash`, `splashReady` da `TitleScene`);
  - il tocco manda `leviatano-entered` e `main.ts` rimisura (subito, dopo 300 ms e dopo 900 ms);
  - immagine `public/ui/splash.webp` da `art-inbox/splash.jpg` (`npm run art`, tipo "screen"), caricata solo se esiste.
- **Perché la musica non si sentiva:** l'audio parte al primo tocco, e il primo tocco sceglieva già la partita, spegnendo la musica.
- **Misure e verticale:**
  - `ui/orientation.ts` (nuovo): `gameSize` prende la misura più grande fra `inner`, `visualViewport` e `clientWidth`, più lo schermo dalla Home; `isTurned`, `safeSides`;
  - `main.ts` mette `html.turned`, `--app-w`, `--app-h` e i `--safe-*` scambiati, e fa `scrollTo(0,0)`;
  - `style.css`: `body` fisso, almeno `100lvw`/`100lvh`; da girato `translateX(--app-h) rotate(90deg)`;
  - `safeBottomPx` legge `--safe-b`;
  - tolto il messaggio "Ruota il telefono".
  - Funziona perché tutti i comandi sono elementi della pagina (Phaser non riceve tocchi).
- **Musica:** `TITLE_MUSIC` riscritta, 16 battute in re minore a 52 bpm: voce di basso, coro, bordone, tamburo ogni 4 battute.
- **Test:** `tests/lottoAE.test.ts`.
- **Nel browser:**
  - schermata iniziale → tocco → menu;
  - emulazione verticale 375×812: pagina girata, Phaser 1624×750, il pulsante "Nuova partita" risponde nel punto giusto (`elementFromPoint`).
- **Limiti:**
  - la barra nera non si riproduce al computer: serve la prova sull'iPhone;
  - il verso della rotazione è fisso (orario): tenendo il telefono dall'altra parte il gioco appare capovolto.

**Da provare sull'iPhone:**
- aprire l'app dalla Home in orizzontale, poi in verticale (e con il blocco della rotazione attivo);
- ascoltare la musica del menu.
