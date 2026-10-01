# Progressi

## Sessione 11 — Tappa 10: la Costa (1 ottobre 2026) → v0.9.0

**Fatto**

- Costa disegnata a mano (`LAYOUT` in `data/worldLayout.ts`): spiaggia lunga in pendenza dolce con uno scalino sotto il molo, Baia allargata ×1,6, Isola delle Mangrovie (scogliera sopra e sotto l'acqua, passaggio sotto), Porto Fango sulla sua riva est, Delta alla foce del fiume dell'isola, mare aperto spostato di 3372 unità. Il vecchio disegno è conservato con le trasformazioni `bay()`, `delta()`, `east()`.
- Porti: `PORTS` (Portofosco e Porto Fango, completo); si rinasce nell'ultimo porto visitato (`homePort`, salvato). Aurelio solo a Portofosco.
- Velocità: sub 42 u/s (7 m/s), scatto 105, squalo in sella ≈55 u/s (`rideSpeedMult` 0,48), inseguimento 2,9 U/s.
- Salvataggio v7: diver spostato, muro di ossa e botola della tana restano rotti, `homePort`.
- Test della costa (pendenza, isola, si arriva nuotando dalla spiaggia al Delta passando sotto l'isola, Porto Fango, conversione). 217 test.
- Visto nel browser: spiaggia e molo, Porto Fango con capanne e menu, scogliera dell'isola, Delta.

**Mancante / da sapere**

- La storia non dice ancora niente di Porto Fango: arriverà col capitolo 3.
- Il fondale della spiaggia è scuro come il resto: più avanti sabbia più chiara e qualche dettaglio da spiaggia.

**Da provare sull'iPhone**

1. Parti da Portofosco e nuota verso est: senti la spiaggia lunga prima della Baia? La velocità ti piace (a nuoto e in sella)?
2. Arriva all'isola: in superficie non passi, tuffati sotto.
3. Riemergi dall'altra parte, a Porto Fango: apri il porto, compra o vendi qualcosa.
4. Con `?prove` c'è "Portami a Porto Fango".

**Aggiunta (v0.9.1, dopo la tua prova):** scelta della prima bestia (Zanna, Guscio, Scintilla) appena finita l'apertura o al caricamento di una partita senza bestie; evoluzioni ai livelli 16 e 36; squadra tutta KO = perdi i sensi e ti risvegli curato (−10% denti). Visto nel browser: la schermata di scelta e "Scintilla entra nella tua squadra!". Immagini dei 9 stadi: prompt in `docs/PROMPT-INIZIALI.md`. 224 test.

**Aggiunta (v0.9.2):** immagini dei 9 stadi elaborate (45 file, `BATTLE_ENCLOSED` per i buchi chiusi di Scintilla e Folgore); animazione di evoluzione (`ui/evolutionShow.ts`, mette in pausa il mondo); linea evolutiva nella scheda; esperienza dai pesci (`XP_RULES.fishXp*`), curva più dolce (`12·L^1,5`) e premi più alti (`rewardBase` 18); mare pieno (`WILD_SPAWNS` con visitatori a livelli propri, `maxPresent` 5, 17 banchi di sardine). Vista l'animazione nel browser (Zanna → Squarcio). 244 test.

**Da provare (v0.9.2):** scegli l'iniziale, combatti e pesca sardine fino al 16: arriva in tempi giusti? Vedi l'animazione? Il mare è abbastanza pieno o troppo (troppe battaglie)?

**Aggiunta (v0.9.3):** ogni bestia della squadra si chiama dalla barra: le cavalcature (e le seconde forme con `rideSpeedMult`) ti portano in sella, le altre ti seguono (`Mount.state 'follow'`, `TEAM_RULES.follow`) e mangiano i pesci; Folgore 18 m con `girth` 1,6 (immagine allargata in verticale), Zannarossa 15 m, Archelon 8 m. Da fare se piace: il compagno che avvisa delle bestie vicine (promesso, non ancora fatto). 246 test.

**Prossima sessione:** tappa 11, l'oceano infinito a destra (biomi generati, mute per immersioni lunghe e punti per l'ossigeno). Proporre il piano prima.

## Sessione 10 — Battaglia più bella (1 ottobre 2026) → v0.8.0

**Fatto**

- 41 immagini a tre quarti dalla cartella "asset animali ai" smistate, orientate (`_flip`), scontornate e messe nel gioco (`npm run art`, scontorno nuovo che non buca le bestie scure). La tua bestia guarda sempre a destra, il nemico a sinistra (lo squalo bianco da dietro era girato: corretto).
- Grandezze relative come Pokémon, giganti sempre enormi (`systems/battle/stage.ts`, `BATTLE_STAGE`).
- I tuoi sfondi dipinti della Baia, la conchiglia e le 10 icone sono nel gioco. `npm run art` si arrangia anche se il verde di Gemini è solo parziale (primo piano solo con le rocce ai lati e in alto, pedana ritagliata a ellisse). Delta e tana usano i dipinti della Baia con la loro tinta, più radici e costole disegnate.
- Bestie animate, il nemico esce dal buio (i giganti fanno tremare il mare), le rare luccicano, effetti per tipo, conchiglia, numero del danno.
- Interfaccia stile Pokémon recenti con colori cupi da dark fantasy, carattere Baloo 2, nomi lunghi che scorrono, riquadri che brillano per le rare (argento) e i giganti (oro).
- Prova: `?battaglia&nemico=<id>&variante=albino|alfa&finale&unico=sfregiato&luogo=baia|delta|tana`.
- 160 test automatici.

**Mancante / da sapere**

- Sfondi dipinti propri del Delta e della tana: per ora prendono quelli della Baia con un'altra tinta.
- Il coccodrillo albino leggendario visto davanti ha un po' di pavimento grigio sotto (è nell'immagine originale): conviene rigenerarlo su fondo nero pulito.
- Manta (davanti e da dietro) e pesce palla da dietro: mancano, servono per il capitolo 3.
- Verificato nel pannello del browser: sfondo dipinto, grandezze, luccichio e nome che scorre. Verso la fine il pannello era nascosto e non ho potuto vedere a schermo l'ingresso dal buio e le scintille, né il formato iPhone: il gioco girava senza errori, ma va guardato sull'iPhone. Non l'ho provata nel gioco vero (al contatto con una bestia), solo con `?battaglia`: la parte nuova è la stessa.

**Da provare sull'iPhone**

1. `https://matteomango23-png.github.io/leviathan/?battaglia&nemico=squalo_bianco&variante=albino&finale`: il nemico esce dal buio, il mare trema, il riquadro brilla d'oro, il nome scorre.
2. `?battaglia&nemico=torpedine` (lo squalo deve essere molto più grande) e `?battaglia&nemico=tartaruga_marina`.
3. `?battaglia&nemico=squalo_bianco&unico=sfregiato&luogo=tana` e `?battaglia&nemico=coccodrillo_marino` (Delta).
4. Usa Lotta con mosse di tipi diversi, poi Doma: guarda gli effetti e la conchiglia dipinta.
5. Dimmi se va fluida (60 fps) e se il testo si legge bene.

**Dopo la tua prova (v0.8.1):** tua bestia più grande e non coperta, schivata più difficile, fuga in base alla forza, pinne tagliate sfumate. Coccodrillo marino rigenerato (davanti e da dietro). Manta e pesce palla da dietro aggiunti (erano già in "asset animali ai": li avevo scambiati per viste di lato). v0.8.2: sfondi dipinti di Delta e tana, pesce palla davanti nuovo (gli originali sono in "asset animali ai/sfondi battaglia" e nelle cartelle delle bestie). Manca solo il coccodrillo albino davanti su fondo nero pulito. v0.8.3: tolta la pinna-schizzo dello squalo bianco da dietro (`BATTLE_ERASE`), primi piani con il centro sempre libero (`clearCentre`), bordi senza scalini.

**Dopo (v0.8.3-v0.8.6):** macchia dello squalo bianco tolta, primi piani col centro libero, aggiornamento immediato all'apertura, impronta negli indirizzi delle immagini, test delle inquadrature (212 test). La battaglia è approvata dal proprietario.

**Prossima sessione:** prima l'esplorazione, poi la storia (scelte in DECISIONS, "Prima finire l'esplorazione"). Tappa 10 sul ramo `tappa-10-costa`: costa disegnata a mano (porto su spiaggia in pendenza, Baia, isola con passaggio sotto e secondo porto, Delta alla foce attaccato alla terraferma) e cavalcature più lente. Proporre il piano breve al proprietario prima di scrivere codice. Poi: oceano infinito con biomi e ossigeno lungo, barca, bestie uniche.

## Sessione 9 — La battaglia a turni entra nel gioco (1 ottobre 2026) → v0.7.0

**Fatto**

- Tolto tutto il combattimento in tempo reale (morsi in acqua, compagno che difende, minigioco della domatura in acqua, scontro nella tana con fasi e coda).
- Bestie visibili che nuotano piano (`beasts/roam.ts`), comparse e inizio della battaglia (`encounters.ts`), risultati nel gioco (`battleResult.ts`).
- Cavalcature chiamate dalla barra (`beasts/mount.ts`) con abilità (`abilities.ts`: Sfonda le ossa, respiro della megattera).
- Guardiano e coccodrillo della Vedova come battaglie senza fuga.
- Nuova schermata di battaglia (card sfumate come segnaposto delle immagini a tre quarti), SCHIVA con barra, testi al femminile.
- `npm run art` prepara le immagini `_front` e `_back` (elenco in `docs/ART.md`).
- 147 test automatici.

**Mancante / da sapere**

- Le immagini a tre quarti le stai generando tu: finché mancano, la battaglia usa le card.
- Da fare dopo (scelte già prese): "Potenzia" con i doppioni nella scheda; progressione per zone ribilanciata (livelli che salgono, boss di poco sopra); tipi forte/debole ben visibili in scheda e bestiario; storia con ritratti; mondo più grande e ambienti migliori.
- La schermata di battaglia nel pannello del browser non si vede intera (problema della mia anteprima, non del gioco): provala sull'iPhone.

**Da provare sull'iPhone**

1. Nuota nella Baia: le bestie compaiono piano nel buio. Lascia che uno squalo ti tocchi: parte la battaglia.
2. In battaglia prova Lotta, Squadra, Zaino, Doma e Fuggi. Prova SCHIVA (difficile apposta).
3. Colpisci col fucile una tartaruga alle spalle: deve partire la battaglia con "Attacco a sorpresa".
4. Tocca lo squalo nella barra in alto: arriva e ci sali. Vai alla botola di ossa al centro della Baia e premi "Sfonda".
5. Nella tana lo Sfregiato ti viene incontro: da questa battaglia non si fugge.

**Prossima sessione:** "Potenzia" con i doppioni e ribilanciamento della progressione per zone; poi tipi in scheda e bestiario. Il capitolo 3 aspetta le immagini.

## Sessione 8 — Svolta: correzioni e prova della battaglia a turni (1 ottobre 2026) → v0.6.1, v0.6.2

**Fatto**

- Il proprietario ha provato tutto e ha deciso la svolta (vedi DECISIONS, "Svolta dopo la prova completa"): tutto alla Pokémon, battaglia a turni 1 contro 1 con schivata difficile, "Potenzia" con i doppioni.
- v0.6.1: fucile subacqueo (solo dal pulsante, mai in sella), pulsanti mossa non sotto lo scatto, Doma/Apri prima di Cavalca, mai incastrati nel fondale, albini pallidi, Nuova partita e partita precedente.
- v0.6.2: prova della battaglia a turni col link `?battaglia` (il gioco normale non cambia).
- 159 test automatici.

**Da provare sull'iPhone**

1. Apri https://matteomango23-png.github.io/leviathan/?battaglia e fai qualche battaglia ("Nuova battaglia" alla fine).
2. Prova a schivare: tocca quando il cerchio rosso tocca la tua bestia. Dimmi se è troppo difficile o troppo facile.
3. Prova a domare: più è sfinita, più è facile; albini e alfa sono più difficili.
4. Dimmi cosa ti piace e cosa no (velocità dei messaggi, grandezza delle bestie, menu, schivata).

**Prossima sessione:** se la prova piace, nuovo design (battaglia nel gioco al contatto con le bestie, progressione per zone, cattura, Potenzia con i doppioni, tipi nelle schede), poi si riadattano Baia e Delta. Il capitolo 3 aspetta.

## Sessione 7 — Capitolo 2: il Delta delle Mangrovie (1 ottobre 2026) → v0.6.0

**Fatto**

- Il Delta tra Baia e Barriera (mondo allargato di 520 unità, tutto l'est spostato), bassa profondità, acqua torbida, mangrovie, cefali e pesci arciere.
- Coccodrilli marini che attaccano dalla superficie; coccodrillo albino leggendario raro (3%).
- La Vedova Nera con la megattera incatenata: dialogo, il suo coccodrillo alfa (livello 12) con la barra grande, 3 ancoraggi da spezzare, la megattera (livello 10) si unisce alla squadra, la nave fugge verso la Barriera.
- Salvataggio v6 con migrazione (ossa rotte e posizione nel mondo più largo).
- 144 test automatici.

**Mancante / da sapere**

- Visto nel browser: il Delta (acqua torbida, radici, pesci) e la balena incatenata sotto la nave con il dialogo della Vedova. Il coccodrillo in azione, la rottura degli ancoraggi e il finale sono provati dai test automatici, ma non li ho visti a schermo.
- Il coccodrillo del Nilo non c'è ancora (scelta tua: forse più avanti come coccodrillo comune).
- La Vedova Nera non ha un ritratto: parla dalla nave, nei dialoghi.

**Da provare sull'iPhone**

1. Se hai già finito il capitolo 1: l'obiettivo dice "Segui la nave della Compagnia a est". Nuota a est dalla Baia fino al Delta (oppure, con `?prove`, "Portami nel Delta").
2. Avvicinati alla nave nera: dialogo della Vedova, poi arriva il suo coccodrillo dalla superficie.
3. Spezza i tre ancoraggi (paletti di ferro con catene, un po' illuminati sul fondale): 8 colpi d'arpione ciascuno.
4. Liberata la balena: controlla che sia nella squadra e prova a cavalcarla.
5. Controlla che le ossa già rotte (muro di ossa, botola della tana) siano ancora rotte.

**Prossima sessione:** Sessione 8 — Capitolo 3: la Barriera Rossa, ramo `tappa-7-barriera` (già creato). **In attesa delle immagini del proprietario** (elenco in `docs/ART.md`, "Capitolo 3"): murena, manta, pesce palla e i pezzi del Re Corallo. Scelte già fatte (1 ottobre 2026): la Vedova Nera sta strappando il Re Corallo dalla Barriera con catene e argani; impazzito ti attacca; lo sfinisci, rompi le catene e lo domi; la Vedova fugge verso la Foresta Sommersa. Lo scontro è in un anfiteatro di corallo sul fondale: cammina sul fondo, si chiude nella corazza (i colpi rimbalzano), attacca con le chele da vicino, lancia schegge di corallo; si colpisce quando apre le chele o di lato. Dopo il capitolo 3 viene una sessione di pulizia (ogni 3 tappe).

## Sessione 6 — Storia del capitolo 1 (30 settembre 2026) → v0.5.0

**Fatto (tappa 5, capitolo 1)**

- Apertura giocabile sulla barca di Aurelio: la nave della Compagnia passa trascinando una megattera in catene col collare di ferro; dialogo; tuffo.
- Immersione guidata in 4 passi, con l'obiettivo sotto i cuori.
- Molo e case in fiamme al ritorno, collare spezzato, obiettivo "Trova lo squalo di Aurelio".
- Tre tracce sul fondale fino alla tana; suggerimento sulle ossa (serve la Carica); "è lui" quando appare lo Sfregiato; libero quando lo domi; finale con Aurelio e la nave verso est.
- Dialoghi (tocca per andare avanti, Salta), pulsante "Aurelio" al porto, "Rivedi l'inizio" nella pausa.
- Salvataggio v5; le partite vecchie riprendono dal punto giusto.
- 135 test automatici.

**Mancante / da sapere**

- Visto nel browser: l'apertura (nave, balena, Aurelio, dialogo, tuffo) e il molo in fiamme. Il finale e le tracce sono provati dai test automatici, ma non li ho visti a schermo.
- Aurelio e il sub sulla barca sono sagome semplici (come il sub segnaposto): si possono sostituire con immagini dipinte quando le avrai.
- Il capitolo 2 (Delta delle Mangrovie, coccodrilli, primo comandante della Compagnia) è la prossima tappa.

**Da provare sull'iPhone**

1. Per vedere l'inizio senza perdere la partita: Pausa → "Rivedi l'inizio".
2. Se hai già domato lo Sfregiato, l'obiettivo sotto i cuori deve dire "Capitolo 1 completato"; al porto prova il pulsante "Aurelio".
3. Per giocare la storia da capo: esporta prima il salvataggio (Pausa → Esporta), poi cancella i dati del sito da Safari.
4. Segui le tracce (piccole catene luminose sul fondale) fino alla tana; al primo scontro con lo Sfregiato deve comparire il dialogo "è lui".

**Prossima sessione:** Sessione 7 — Capitolo 2: il Delta delle Mangrovie (nuova regione, coccodrilli, comandante della Compagnia con una bestia incatenata). Serve prima un piano con le tue scelte.

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
