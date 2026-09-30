# Progressi

## Sessione 5 — Pulizia (30 settembre 2026) → v0.4.1

**Fatto (nessuna funzione nuova, come da CLAUDE.md ogni 3 tappe)**

- Tolto il codice che nessuno usava; spostati nei dati gli ultimi numeri di gioco rimasti nel codice.
- Nuovo controllo automatico in `npm run check`: nessun file può importarne un altro che lo reimporta (dipendenze circolari). Oggi: nessuna.
- Documenti allineati: ARCHITECTURE elenca tutti i file, GDD con la roadmap aggiornata (tappe 1-4 fatte) e la decisione sulla morte contro i Guardiani.
- 123 test automatici, tutti verdi.

**Da provare sull'iPhone:** niente di nuovo; il gioco deve comportarsi esattamente come la 0.4.0.

**Prossima sessione:** Sessione 6 — Storia del capitolo 1 (tappa 5 della roadmap). Ramo consigliato: `tappa-5-storia`.

## Sessione 4 — Livelli, crescita e primo Guardiano (30 settembre 2026) → v0.4.0

**Fatto (tappa 4)**

- Esperienza dalle bestie sfinite (tutta a chi è in acqua, un quarto al resto della squadra), livelli fino al 50, mosse sbloccate al 7 e al 15 con un messaggio, statistiche e danno che crescono col livello.
- Crescita 31-50 con barra del cibo: la bestia grande mangia da sola, al porto c'è il pulsante "Nutri". Forme finali al 50 (Titano, Mega albino).
- Barre di esperienza e cibo in squadra e nella scheda (che già mostrava mosse, lucchetti e danno al prossimo livello).
- Lo Sfregiato nella sua tana sotto la Baia: due fasi, colpo di coda, scorta di due squali, 800 denti e Arpione mitico la prima volta, domabile; se scappa torna dopo la visita al porto.
- Salvataggio v4 con migrazione. Pannello di prova: "+5 livelli alla squadra", "Squalo bianco liv. 30", "Portami nella tana dello Sfregiato".
- 123 test automatici.

**Mancante / da sapere**

- Lo scontro è provato dai test automatici e l'ho visto nel browser (la tana, lo Sfregiato che gira e morde, la barra in alto), ma non l'ho giocato fino in fondo: la difficoltà va provata sull'iPhone.
- I numeri dell'esperienza sono un primo bilanciamento (`data/progression.ts`): dimmi se si sale troppo piano o troppo in fretta.
- Lo Sfregiato domato usa le mosse dello squalo bianco (non ha mosse sue).
- Nella tana non c'è ancora una scena di storia: arriverà con la Storia del capitolo 1 (tappa 5).

**Da provare sull'iPhone**

1. Doma uno squalo e combatti le bestie della Baia: guarda la barra dell'esperienza (Pausa → tocca la bestia) e il messaggio "Nuova mossa: Carica" al livello 7.
2. Cerca la tana: al centro della Baia, sul fondo (circa 55 m), compare la scritta "Tana dello Sfregiato" sopra una botola di ossa. Cavalca lo squalo e usa Carica per romperla.
3. Scendi e combatti lo Sfregiato: schiva gli affondi (fauci aperte = segnale), stai lontano dalla coda quando è furioso.
4. Sfinito, domalo. Se fallisci: torna al porto e poi di nuovo nella tana.
5. Con `?prove`: "Squalo bianco liv. 30", poi al porto nel Recinto "Nutri" con qualche pesce nella sacca; "+5 livelli" fino al 50 per vedere il Titano.

**Prossima sessione:** Sessione 5 — pulizia (CLAUDE.md: ogni 3 tappe una sessione senza nuove funzioni), poi la Storia del capitolo 1.

## Sessione 3b — Correzioni dopo la prova (30 settembre 2026) → v0.3.1

**Fatto (tutte le richieste del proprietario dopo la v0.3.0)**

- Costa ovest con terraferma e case; porto e partenza sulla riva.
- In sella più veloce, con scatto; affondo in avanti nei morsi (selvatiche, compagno, in sella).
- Virate che partono dalla testa (senza immagine di tre quarti, come deciso).
- Tartaruga gigante 2 m e lenta; torpedine più lenta. Barracuda, tartaruga e torpedine restano compagni, non cavalcature.
- Lo squalo in squadra mangia le sardine vicine: vanno nella sacca.
- Oltre la profondità della muta l'ossigeno scende più in fretta (niente muro invisibile).
- Scheda della bestia in stile carta con rarità, stelle e cornici speciali; bestiario dal menu di pausa.
- Menu del porto rifatto con icone e card.
- Fondale dipinto un po' alla volta (meno scatti con la lampada e nuotando veloce).
- 102 test automatici.

**Mancante / da sapere**

- Il gioco in movimento l'ho provato poco nel browser (il pannello era spesso nascosto): scheda, bestiario e porto sono stati controllati da soli, a misura di iPhone in orizzontale.
- La virata migliorata è fatta nel codice; se non basta, la soluzione vera resta un'immagine di tre quarti (da generare quando vuoi).
- Resta tutto quello elencato sotto per la sessione 3 (livelli, Guardiani, armi delle altre regioni).

**Da provare sull'iPhone**

1. All'avvio sei sulla riva ovest: guarda case, molo e la Baia che scende davanti.
2. Tocca "Porto": prova tutte le schede, compra, metti qualcosa nello zaino (tocca un posto, poi l'oggetto).
3. Doma uno squalo, cavalcalo: velocità, scatto in sella, affondo nei morsi, virate.
4. Con lo squalo in acqua passa vicino a un banco di sardine: la sacca deve salire.
5. Nuota veloce e muovi la lampada: deve restare fluido. Se scatta ancora, dimmi dove.
6. Scendi oltre i 150 m con la muta leggera: l'ossigeno deve calare in fretta.
7. Menu di pausa → Bestiario; tocca una bestia della squadra per aprire la sua scheda.

**Prossima sessione:** Sessione 4 — Livelli, crescita e primo Guardiano (`docs/PROMPT.md`). Ramo consigliato: `tappa-4-livelli`.

## Sessione 3 — Porto ed economia (30 settembre 2026) → v0.3.0

**Fatto (tappa 3 + altre bestie della Baia)**

- Portofosco al molo (Mercato, Mute, Zaino, Bacheca, Recinto), cura e rinascita al porto.
- Denti di squalo; sacca dei pesci e vendita; sgombri nella Baia.
- Mute con profondità massima, cuori, velocità e scatto; potenziamenti Apnea e lampade.
- Relitti e forzieri (fiocine nella Baia, rete nella Barriera, denti e oggetti).
- Zaino con 3 posti (armi, oggetti, sciami); oggetti: Bolla d'aria, Alga curativa, Esca, Krill dorato, Arpione mitico.
- 8 missioni semplici; sciame di sardine (legame dopo 10 catture, assorbe morsi).
- Barracuda, tartaruga marina e torpedine selvatici nella Baia, domabili, con mosse generali (morsi multipli, affondo, velocità doppia, scudo, cupola, scosse e stordimento ad area).
- Solo le cavalcature si cavalcano. Al massimo 2 bestie selvatiche insieme.
- Salvataggio v3 con migrazione. Regole di orche matriarche e leggendarie nel GDD; loro immagini pronte.
- 94 test automatici.

**Mancante / da sapere**

- Il menu del porto è stato provato nel browser (tutte le schede, vendita), ma non l'ho potuto vedere dentro il gioco in movimento: il pannello del browser era nascosto. Da provare bene sull'iPhone.
- Folgore e arpione runico, lampo sonar e nuoto controcorrente arrivano con le loro regioni.
- Skin delle bestie, barca e viaggio veloce: non in questa tappa.
- Le bestie domate non salgono ancora di livello (tappa 4): per ora il Krill dorato è l'unico modo.
- Alla torpedine manca ancora il profilo a bocca aperta (usa quello chiuso).

**Da provare sull'iPhone**

1. Risali in superficie vicino al molo e tocca "Porto": guarda le 5 schede.
2. Accetta 2-3 missioni in Bacheca, poi pesca sardine e sgombri; torna al porto, vendi e riscuoti.
3. Cerca il relitto della Baia (luce dorata sul fondo, a ovest a metà Baia): "Apri" → fiocine. Al porto, Zaino → mettile in un posto; in immersione tocca "Fiocine" in alto a destra.
4. Dopo 10 sardine metti lo "Sciame di sardine" nello zaino e chiamalo quando arriva uno squalo.
5. Compra la muta rinforzata (400 denti) e prova a scendere oltre i 150 m.
6. Con `?prove`: fai apparire barracuda, tartaruga e torpedine e prova a domarli; "+2000 denti" per provare il mercato.

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
