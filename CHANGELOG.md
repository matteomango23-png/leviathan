# Registro delle versioni

Cosa cambia per chi gioca, versione per versione. Ogni versione ha un'etichetta in git (`v0.1.0`, `v0.2.0`...) a cui si può sempre tornare.

## v0.8.1 — Ritocchi della battaglia (1 ottobre 2026)

- **La tua bestia è più grande e al centro**, e il suo riquadro è più piccolo: non la copre più.
- **Schivare è più difficile.**
- **Fuggire dipende dalla bestia:** facile da una comune del tuo livello, difficile da una più forte o rara, quasi impossibile da un leggendario (ma ogni tentativo aiuta un po').
- Le pinne che uscivano dall'immagine (squalo albino leggendario, coda del coccodrillo albino) ora sfumano invece di essere tagliate.
- **Coccodrillo marino nuovo** (davanti e da dietro), rigenerato con Gemini.

## v0.8.0 — Battaglia più bella (1 ottobre 2026)

- **Le bestie in battaglia sono le immagini vere a tre quarti**: davanti la selvatica, da dietro la tua. Ci sono quasi tutte: squali (anche albino, alfa, Sfregiato, Titano, albino leggendario), coccodrilli, orche, megattera, barracuda, tartaruga, torpedine, murena, Re Corallo.
- **Grandezze come in Pokémon**: la più grande delle due ha sempre una bella misura, l'altra in proporzione (squalo contro torpedine: lo squalo è più del doppio; due tartarughe: entrambe normali). **I giganti** (leggendari, forme finali, Guardiani, megattera) **sono sempre enormi**.
- **Le bestie guardano sempre verso il centro**: la tua verso destra, il nemico verso sinistra.
- **Il nemico esce dal buio** come una sagoma nera che prende colore; i giganti fanno tremare il mare. **Le rare luccicano**: scintille attorno e riquadro che brilla (argento, oro per i leggendari).
- **Il mare si muove**: raggi di luce che ondeggiano, foschia che scorre, riflessi sul fondale, neve marina, bolle, piante in primo piano, una lenta deriva della telecamera che dà profondità.
- **Sfondo dipinto** (fondale, rocce, primo piano, pedane di pietra) con luce e foschia che si muovono. Il Delta lo vede verde e torbido con le radici di mangrovia, la tana più buia con le costole di balena.
- **Le bestie sono vive**: respirano, ondeggiano (le grandi più lente e pesanti), prendono la rincorsa e si lanciano lasciando bolle, lampeggiano e rinculano quando vengono colpite, affondano quando svengono.
- **Ogni tipo ha il suo colpo**: graffi (Predatore), fulmini (Tempesta), schegge di ghiaccio (Glaciale), inchiostro con scintille (Abissale), onde d'urto e sassi (Corazzato). Sui colpi forti la telecamera si avvicina un attimo.
- **Nuovi comandi e riquadri** nello stile dei Pokémon recenti ma cupi, con un carattere arrotondato e le icone dipinte: Lotta grande, Zaino, Squadra, Doma, Fuggi; mosse del colore del tipo; barre della vita "PS"; i nomi lunghi scorrono.
- **La conchiglia di cattura** vola girando, si apre in un lampo, scuote e brilla d'oro se tiene.
- Per provare: `?battaglia&nemico=tartaruga_marina`, `&variante=albino`, `&finale`, `&unico=sfregiato`, `&luogo=tana`.

## v0.7.0 — Battaglie a turni nel gioco (1 ottobre 2026)

- **Niente più combattimento in tempo reale.** Le bestie si vedono mentre esplori: nuotano piano nel buio e la lampada le rivela. Si girano solo fuori dalla luce.
- **La battaglia parte quando una bestia ti tocca** (attacca prima lei) **o quando la colpisci col fucile** (se la prendi alle spalle è stordita e attacchi tu per primo).
- **Carattere:** squali, barracuda e coccodrilli ti puntano; la tartaruga ti ignora; la torpedine scivola via piano (la raggiungi). Le **rare** (albine, alfa, leggendarie) **brillano** nel buio, compare un messaggio e si allontanano piano: inseguile.
- **Battaglia come Pokémon**, 1 contro 1: Lotta (3 mosse con tipo, forza e ricarica), Zaino (i tuoi oggetti: Alga curativa, Arpione mitico), Squadra (cambio bestia), Doma (la conchiglia scuote 3 volte: più è rara la bestia, più è difficile), Fuggi. I livelli contano molto nei danni.
- **SCHIVA:** quando il nemico attacca compare un grande pulsante con una barra: tocca quando la lancetta passa sulla zona chiara. Spiegazione la prima volta. È difficile.
- **Nuova schermata di battaglia:** le bestie a tre quarti (per ora le illustrazioni delle card sfumate nel mare, la tua più vicina e di spalle), affondi, graffi, scintille del colore del tipo, conchiglia che vola ad arco.
- **Cavalcature:** tocca una bestia cavalcabile nella barra in alto: arriva dal buio e ci sali. In sella vai veloce e usi la sua abilità: lo **squalo bianco sfonda le ossa** (pulsante "Sfonda"), la megattera ti fa respirare. Le bestie non ti seguono più combattendo.
- **Lo Sfregiato** e il **coccodrillo della Vedova** sono battaglie da cui non si fugge.
- Senza bestie in grado di combattere, una bestia che ti tocca ti morde (un cuore) e se ne va.
- Lo sciame di sardine ora ti **nasconde**: per 8 secondi nessuna bestia ti viene incontro.

## v0.6.2 — Prova della battaglia a turni (1 ottobre 2026)

- **Prova della nuova battaglia a turni**, separata dal gioco: apri il link del gioco aggiungendo `?battaglia` (https://matteomango23-png.github.io/leviathan/?battaglia). Squalo bianco (liv. 8), tartaruga e torpedine contro una bestia a caso di Baia e Delta (a volte albina o alfa).
- Menu come Pokémon: Lotta (3 mosse con tipo, forza e ricarica), Zaino (Alga curativa, Arpione mitico), Squadra (cambio bestia), Doma (la conchiglia scuote 3 volte), Fuggi.
- Quando il nemico attacca, un cerchio rosso si chiude sulla tua bestia: tocca lo schermo nel momento esatto in cui la tocca per schivare. È difficile apposta, e a volte il cerchio si ferma per ingannarti.
- Il gioco normale non cambia.

## v0.6.1 — Correzioni dopo la prova completa (1 ottobre 2026)

- **Fucile subacqueo** al posto dell'arpione: colpo molto più veloce, la sagola torna subito. Si spara solo con il pulsante Fucile (trascinalo per mirare): toccare lo schermo non spara più.
- **In sella non si spara:** combatte la cavalcatura. Il pulsante Fucile sparisce e le 3 mosse non stanno più sotto lo Scatto.
- **Doma e Apri vengono prima di Cavalca:** vicino a una bestia sfinita o a uno scrigno il pulsante non ti fa più risalire in sella per sbaglio (e si può domare o aprire anche stando in sella).
- **Mai più incastrati nel fondale:** se il sub finisce dentro la roccia viene spostato nell'acqua libera più vicina.
- **Gli albini si riconoscono:** finché non hanno un'immagine propria sono disegnati pallidi, in acqua e nelle schede.
- **Nuova partita** e **Torna alla partita precedente** nel menu di pausa (sezione "Partite"); la partita lasciata resta da parte come copia.

## v0.6.0 — Capitolo 2: il Delta delle Mangrovie (1 ottobre 2026)

- **Nuova regione, il Delta delle Mangrovie**, a est della Baia: acqua bassa (circa 30 m) e torbida, si vede meno e la lampada arriva meno lontano; isolotti di mangrovie con le radici che scendono in acqua; cefali e pesci arciere. La Barriera Rossa e il resto del mondo ora sono più a est.
- **Coccodrilli marini** nel Delta: nuotano appena sotto la superficie e si tuffano su di te per mordere. Raro: il **coccodrillo albino leggendario** (livello 14).
- **La Vedova Nera:** la sua nave è all'ancora nel Delta, con la megattera dell'inizio incatenata sotto la chiglia. Avvicinati e parla lei; poi ti manda contro il suo coccodrillo (grande barra in alto).
- **Libera la balena:** spezza i 3 ancoraggi delle catene sul fondale con l'arpione (o le fiocine). Liberata, la megattera si unisce alla tua squadra e nuota con te; la Vedova fugge verso la Barriera Rossa.
- Aurelio al porto ha nuovi consigli; l'obiettivo sotto i cuori guida il capitolo.
- Pannello di prova: "Portami nel Delta".
- Il salvataggio si aggiorna da solo (versione 6): le ossa già rotte e la tua posizione restano giuste nel mondo più largo.

## v0.5.0 — La storia del capitolo 1 (30 settembre 2026)

- **Apertura sulla barca di Nonno Aurelio:** una nave nera della Compagnia dell'Olio Nero passa davanti al porto trascinando una megattera in catene. Aurelio ti dà l'arpione e la Conchiglia del domatore, poi ti tuffi.
- **Prima immersione guidata:** nuota, cattura una sardina, scatta, torna al molo. L'obiettivo è scritto sotto i cuori.
- **Il molo brucia:** mentre eri sott'acqua la Compagnia è passata da Portofosco. Aurelio ti consegna un collare spezzato: "Trovalo".
- **Le tracce:** tre segni sul fondale (catene arrugginite, olio nero, ossa) portano alla tana sotto la Baia.
- **Lo Sfregiato è lo squalo di Aurelio:** la Compagnia gli aveva messo il collare. Domandolo lo liberi; poi portalo da Aurelio al molo.
- **Finale del capitolo:** Aurelio lo riconosce, e in lontananza la nave della Compagnia salpa verso est, verso il Delta delle Mangrovie (capitolo 2).
- **Dialoghi** in basso: tocca per andare avanti, "Salta" per saltarli.
- **Aurelio al porto:** pulsante "Aurelio" in alto nel menu del porto, ti dice cosa fare.
- **"Rivedi l'inizio"** nel menu di pausa: rigioca l'apertura senza perdere i progressi.
- Chi ha già una partita riprende dal punto giusto: se hai già domato lo Sfregiato il capitolo risulta completato, altrimenti parti da "Trova lo squalo di Aurelio".
- Il salvataggio si aggiorna da solo (versione 5).

## v0.4.1 — Pulizia (30 settembre 2026)

- Nessun cambiamento nel gioco: codice più ordinato, numeri spostati nei dati, un controllo automatico in più. Se qualcosa si comporta diversamente dalla 0.4.0, è un errore: segnalalo.

## v0.4.0 — Livelli, crescita e Lo Sfregiato (30 settembre 2026)

- **Esperienza:** quando una bestia selvatica viene sfinita (o fugge perché ce l'hai già), la bestia che hai in acqua prende tutta l'esperienza, le altre della squadra un quarto. Bestie più forti, albine e alfa ne danno di più.
- **Livelli:** salendo di livello crescono vita, morso, difesa e velocità (e quindi il danno delle mosse). Al 7 si impara Carica, al 15 Frenesia: un messaggio te lo dice.
- **Crescita dal 31 al 50:** oltre all'esperienza serve la barra del cibo (8 pesci per livello). La bestia grande mangia da sola i pesci che attraversa; al porto, nel Recinto, il pulsante "Nutri" le dà un pesce della sacca. Cresce del 2% a livello.
- **Forma finale al 50:** lo squalo bianco diventa lo Squalo bianco Titano (9 m), l'albino il Mega albino. L'alfa non ha forma finale.
- **Barre di esperienza e cibo** nella squadra e nella scheda della bestia.
- **Lo Sfregiato, Guardiano della Baia (livello 8):** vive in una tana sotto il fondale della Baia, chiusa da ossa antiche (serve la Carica, livello 7). Entrando parte lo scontro, con una grande barra in alto. Sotto il 70% di vita morde a raffica e colpisce con la coda, sotto metà chiama due squali. Sfinito dà 800 denti e un nuovo Arpione mitico al mercato (solo la prima volta), e si può domare. Se muori o esci ricomincia a vita piena; se fallisci la domatura scappa e torna dopo la tua prossima visita al porto.
- Il salvataggio si aggiorna da solo (versione 4).

## v0.3.1 — Correzioni dopo la prova (30 settembre 2026)

- **Portofosco sulla costa:** a ovest della Baia ora c'è la terraferma con le case; il molo parte dalla riva e la partita inizia lì. La Baia comincia subito sotto il porto.
- **In sella:** la cavalcatura è molto più veloce e ha il suo **scatto** (stesso pulsante del sub).
- **Morsi con affondo:** quando una bestia morde (anche la tua, anche in sella) scatta in avanti.
- **Virate più belle:** la testa gira per prima e il corpo la segue fino alla coda, con un'ombra a metà; non sembra più un foglio di carta che si ribalta.
- **Tartaruga marina** più grande (2 m) e più lenta; la torpedine è un po' più lenta.
- **Le bestie grandi mangiano:** lo squalo in acqua con te acchiappa le sardine vicine e finiscono nella sacca.
- **Troppo profondo per la muta:** niente più muro invisibile; l'ossigeno scende molto più in fretta, con un avviso.
- **Scheda della bestia** in stile carta: illustrazione a sinistra, dati a destra, colore della rarità (grigio, verde, blu, viola, oro), stelle, cornici speciali per albini, alfa, varianti uniche e forme finali; mosse con il livello di sblocco e il danno.
- **Bestiario** (dal menu di pausa): tutte le bestie, quelle viste e quelle domate.
- **Menu del porto** rifatto a schermo intero, con icone e card; mentre sei al porto i comandi di immersione spariscono.
- **Più fluido:** il fondale si dipinge un po' alla volta, niente scatti quando nuoti veloce o muovi la lampada.
- Il carattere rovinato nel menu di pausa è corretto.

## v0.3.0 — Porto ed economia (30 settembre 2026)

- **Portofosco:** risali in superficie vicino al molo (sopra la partenza) e tocca "Porto". Il porto cura te e la squadra ed è il tuo punto di rinascita.
- **Denti di squalo**, la moneta del gioco: si guadagnano vendendo pesci, aprendo relitti e forzieri e completando missioni.
- **Mercato:** vendi i pesci della sacca e compra oggetti (Bolla d'aria, Alga curativa, Esca, Krill dorato, Arpione mitico).
- **Mute:** leggera, rinforzata, scafandro da palombaro, abissale. Ognuna ha la sua profondità massima, i suoi cuori e la sua velocità. Potenziamenti: Apnea, Lampada potenziata, Lampada abissale.
- **Relitti e forzieri** sul fondale, con una luce dorata: tocca "Apri". Nel relitto della Baia ci sono le **fiocine** (tre dardi a ventaglio), in quello della Barriera la **rete** (fino a 5 pesci per lancio, rallenta le bestie).
- **Zaino:** l'arpione è sempre con te, più 3 posti che scegli al porto (armi, oggetti, sciami). In immersione li trovi in alto a destra.
- **Bacheca:** 8 missioni semplici (pesca, vendi, sfianca, doma, relitti, profondità), fino a 3 alla volta; riscuoti al porto.
- **Sciame di sardine:** dopo 10 sardine catturate lo sciame ti segue. Chiamato dallo zaino, per 8 secondi assorbe fino a 6 morsi.
- **Nuove bestie nella Baia:** barracuda (morsi rapidi), tartaruga marina (scudo sul sub, cupola che dimezza i danni della squadra) e torpedine (scosse che stordiscono). Si domano come lo squalo e combattono al tuo fianco; solo le cavalcature si cavalcano.
- **Sgombri** nella Baia: valgono più delle sardine.
- Nuove immagini pronte: orca matriarca, Madre delle madri, orca preistorica albina, coccodrillo albino leggendario (per le prossime regioni).
- Il salvataggio si aggiorna da solo (versione 3).

## v0.2.0 — Lo squalo bianco (30 settembre 2026)

- Nella Baia di Portofosco (a ovest della partenza) vive lo squalo bianco: dipinto, lungo 6 m, con la coda che ondeggia lungo la spina dorsale.
- Si muove come una vera bestia grande: entra dal bordo e rallenta, ti passa vicino, accelera ed esce; non si gira mai davanti a te, torna dal lato da cui è uscito. Se lo segui o resta troppo, scappa più veloce di te.
- Attacca con un affondo: prima apre le fauci (è il segnale per schivare), poi accelera e morde. Colpito con l'arpione si arrabbia e attacca a ogni passaggio.
- Barre della vita con la tacca di sfinimento e numeri dei danni.
- Sfinito (sotto la tacca) diventa domabile: avvicinati e tocca "Doma". Minigioco: tre colpi a tempo, tre errori concessi; più la bestia è forte rispetto alla tua squadra, più è difficile.
- Squadra fino a 5 bestie (le altre in riserva, dal menu di pausa): toccale in alto per chiamarle o richiamarle, con un tempo di ricarica.
- Il compagno ti segue e ti difende. Tocca "Cavalca" per salirgli in groppa: in sella è più veloce e i morsi li prende lui. Tre pulsanti mossa: Morso, Carica (livello 7, sfonda il muro di ossa antiche), Frenesia (livello 15).
- Sei versioni dello squalo con le taglie giuste: normale, alfa (rara), albino (rara), Mega albino, Lo Sfregiato, Titano. Le ultime tre si vedono per ora solo col pannello di prova (link con `?prove`).
- Santuari: resta fermo dentro per curare cuori, ossigeno e squadra (anche le bestie KO); rinasci all'ultimo santuario raggiunto.
- Salvataggio aggiornato (versione 2): i salvataggi della versione 0.1.0 si convertono da soli.
- Nuovo comando `npm run art` che prepara le immagini generate: già pronte illustrazioni e sprite di barracuda, torpedine, tartaruga marina, squalo martello, squalo tigre, megattera, orca e coccodrillo marino per le prossime sessioni.

## v0.1.0 — Fondamenta (30 settembre 2026)

- Un unico oceano da esplorare: la Baia, la Barriera Rossa coi coralli, la Foresta Sommersa, il Mare di Ghiaccio, grotte, zona crepuscolare e abissi. Il nome della zona compare quando ci entri.
- Grafica realistica: fondali dipinti a strati che scorrono a velocità diverse, raggi di luce, neve marina, alghe che ondeggiano.
- Buio vero: più scendi più è buio, la lampada del sub illumina a cono davanti a te.
- Il sub nuota con il joystick (appare dove appoggi il pollice a sinistra) o con la tastiera (WASD/frecce), e scatta con il pulsante Scatto (Shift).
- Arpione: tieni premuto per sparare, trascina il pulsante per mirare, oppure tocca l'acqua per sparare in quel punto (spazio sulla tastiera).
- Sardine in banchi: scappano quando ti avvicini; catturarle ridà un cuore. Il contatore è sotto l'ossigeno.
- Ossigeno: cala sott'acqua (più in fretta in profondità), si ricarica in superficie. Senza aria perdi cuori; a zero cuori riparti dalla superficie.
- Salvataggio automatico. Menu di pausa (pulsante II) con Esporta e Importa salvataggio.
- Installabile sull'iPhone ("Aggiungi alla schermata Home") e giocabile senza connessione.
