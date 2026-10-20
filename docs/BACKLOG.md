# Backlog — i feedback dopo 6 ore di gioco (8 ottobre 2026)

I feedback del proprietario, raccolti dopo più di 6 ore di gioco, divisi in blocchi. **Ordine concordato** (un blocco alla volta, ognuno pianificato in Plan mode prima di scrivere codice):

1. ✅ Nuovo inizio senza storia (v0.47.0)
2. ✅ Correzioni rapide (v0.48.0)
3. ✅ Decisioni di design (scritte nel GDD, sezione "Decisioni di design")
4. La flotta — 4a ✅ (v0.49.0: cantiere, modelli, EH1); 4b ✅ (v0.51.0: EH2, Poseidon, Imperium, motoscafi, moto d'acqua); 4c ✅ (v0.55.0: U-Boat Whale e Stormtrooper che si immergono); 4d ✅ (v0.57.0: Ocean's Nightmare con drone da ricognizione, bussola e sfera blocca-bestie)
5. Sonar e spedizioni
6. Cattura e combattimento
7. Ruoli delle bestie, nuoto, cavalcature (+ prova del megalodonte da video)
8. Immagini (scontorni, alfa, albini, evoluzioni)
9. Audio e atmosfera
10. Storia nuova e villain (ed eventuale equipaggio)

Ogni 3 blocchi: una sessione di pulizia (fatta dopo il blocco 4, v0.58.6; dopo il blocco 5 e i lotti A-K, v0.74.1).

## Feedback del 15 ottobre 2026, in lotti (uno alla volta, ognuno in Plan mode)

- **A. Bug e progressione** ✅ v0.65.0:
  - esperienza solo dai pesci mangiati, con tetto, e battaglie ×0,6;
  - la sconfitta non cura più;
  - vasca anche sull'Aurelia, mostrata al timone;
  - la stessa bestia resta la stessa (residenti, tracker);
  - chi combatti è "visto";
  - le leggende sconfitte tornano nella tana;
  - le immagini delle bestie delle cacce ora si caricano (il megalodonte invisibile);
  - mezzi rotti senza perdita di denti, riparati solo al porto;
  - specie rare più rare nel mare aperto.
- **B. Bestie in mare** ✅ v0.66.0 (squalo volpe: immagini nel lotto F, richieste in `docs/GEMINI-LOTTO-5.md`):
  - pattuglia per tutti i predatori (non sempre; a volte una virata in vista);
  - sardine che passano oltre invece di girarti intorno;
  - pesciolini strani da fermo;
  - arpione un po' più facile;
  - Folgore che ondeggia come un serpente senza storpiarsi;
  - ali della manta;
  - velocità realistiche delle cavalcature;
  - squalo volpe con l'immagine da compagno sbagliata;
  - nemici più forti a pari livello (simulazione).
- **C. Schermate e comandi** ✅ v0.67.0:
  - sonar che tremola e va a capo;
  - pulsanti del sonar che saltano con "Vai adagio";
  - finestra dei leggendari che copre la X;
  - missioni accettate nel cockpit;
  - resoconto del drone a tempo e come avviso;
  - mezzi propri su sonar e radar;
  - avamposti sulla carta anche ad alta velocità;
  - icona dell'avamposto storta;
  - audio (non parte subito, gracchia, si ferma al rientro);
  - scelta dello starter su Android;
  - bestiario con le versioni rare viste;
  - riordino della squadra trascinando le sfere.
- **D. Luci degli U-Boat** ✅ v0.68.0:
  - luce intorno mentre navigano sott'acqua (con la torbidità);
  - luci rosse che pulsano al buio;
  - drone e sfera visibili in profondità.
- **E. Soldi ed economia** ✅ v0.69.0 (il baratto in posti speciali resta un'idea per più avanti):
  - sacca senza tetto e prezzo delle sardine;
  - missioni e commissioni che pagano;
  - tesori più ricchi, taglie, mercato e baratto di bestie;
  - vendere pesci domati;
  - comprare una nave nuova deve essere raggiungibile.
- **F. Immagini nuove dal fondo verde** (prima parte ✅ v0.70.0: dall'alto fino all'orca, 10 bestie nuove, forme finali; resta dall'orca in giù):
  - opponente con la testa a sinistra, compagno, bocca aperta e chiusa delle cavalcature;
  - nuovi animali.
- **In ghiaccio:** virata e morso del megalodonte dai video (`public/prove/squalo/`); il proprietario non è soddisfatto, troppe cose da risolvere prima.
- **Leviatano:** è la bestia del finale della storia (oggi in pausa), per questo non si trova in mare. Torna col blocco 10.

## Feedback del 16 ottobre 2026 (menu, bacheca, bestiario), in lotti

Il primo tester ha trovato lo squalo bianco ma non ha capito che esistono i leggendari: i menu devono essere chiari e invitanti, e lasciare un po' di mistero.

- **G. Porto diviso in schede monotematiche** ✅ v0.71.0 (insieme a H):
  - Mercato: solo la vendita del pescato, con il listino;
  - Conchiglie: 4 livelli come le Poké Ball; l'ultima, la Conchiglia del Re, cattura sempre, se ne compra una sola e prende il posto dell'arpione mitico;
  - Cure divise in gruppi: PS, rianimare, stati, PP, potenziamenti da battaglia;
  - Esche: una per gruppo di animali, quelle care con una piccola probabilità di alfa o albino;
  - Sub: mute, potenziamenti, lampade, ossigeno;
  - Mezzi: carburante (un tipo solo, "pieno a tutti"), riparazione mezzo per mezzo, cantiere;
  - Bacheca;
  - Recinto (resta).
- **H. Bacheca nuova** ✅ v0.71.0:
  - in ogni porto e avamposto 3-4 Ricercati (leggendari e giganti di quel mare) con la card grande;
  - prima della voce si vede solo la sagoma scura con un indizio, dopo la card intera;
  - taglie con le card;
  - missioni ordinate meglio.
- **I. Bestiario e squadra** ✅ v0.72.0:
  - gli albini sono voci separate;
  - le versioni rare mostrano solo quelle con immagini proprie;
  - le evoluzioni stanno una accanto all'altra, con le icone delle evoluzioni sulla card;
  - via l'alone chiaro delle bestie rare in acqua (`views/beastsLayer.ts`);
  - nei menu solo la squadra (max 5);
  - sulla nave una stiva di bestie che dipende dalla nave (barca piccola 0, navi grandi 5-10), le altre al Recinto.
- **J. Salto fuori dall'acqua cavalcando** ✅ v0.73.0 (tipo Angry Shark), mangiando anche gli uccelli.
- **K. Tutorial** ✅ v0.74.0 (i consigli di Aurelio e la Guida): spiegazioni brevi la prima volta (barca, sonar, voci, trovare un leggendario).

## Feedback del 19 ottobre 2026, in lotti (ordine scelto dal proprietario: M+N, L, O, P, Q)

Già fatti prima: gli aloni sulle bestie rare (v0.72.0); il conteggio e la scheda dello squalo martello nel bestiario (v0.72.0).

- **M. Bestiario e versioni** ✅ v0.74.2:
  - un'evoluzione senza immagine propria (Rocciaguscio) mostra quella che usa, non la zampa;
  - un alfa senza immagini proprie è una bestia normale: non nasce più, e quelli già domati tornano normali.
- **N. Immagini** ✅ v0.74.2:
  - torna la manta di prima (si toglieva solo l'animazione delle ali);
  - il delfino avversario era girato al contrario;
  - la manta finale batte le ali con le sue due immagini invece di mordere;
  - lo scorfano gigante va scontornato meglio;
  - torna la card di prima del coccodrillo albino;
  - la bocca aperta della megattera finale (immagine mandata dal proprietario).
- **L. Acqua e salto** ✅ v0.75.0:
  - superficie morbida: la bestia emerge un po' e fa un saltino, niente muro;
  - salto proporzionato alla velocità;
  - ricaduta senza scossa dello schermo;
  - vicino alla nave non si blocca a galla;
  - le bestie enormi contro lo scafo non fanno su e giù.
- **O. Comandi** ✅ v0.75.1:
  - pulsanti di navigazione meno ingombranti;
  - il sonar non copre i minuti d'aria dell'U-Boat;
  - luce e sonar non si sovrappongono con tutti i portelloni aperti;
  - "Doma" senza il numero di conchiglie.
- **P. Suoni** ✅ v0.76.0:
  - nei menu e al porto niente silenzio di colpo, ma una sfumatura;
  - suoni morbidi ai tocchi;
  - niente suoni troppo forti o ripetuti;
  - una musica del porto.
- **Q. Galleria di prova** ✅ v0.78.0: provare ogni bestia in fila (in acqua, come avversario, come compagno) senza doverla catturare.

---

## Feedback del 20 ottobre 2026 (prova di tutte le bestie nella galleria), in lotti

**Ordine scelto (20 ottobre):** S correzioni rapide ✅ v0.79.0 (pausa, tic, gas, evoluzioni, tane in plancia, forme finali, Megattera Titanica, galleria), T battaglia ✅ v0.80.0 (posizione della tua bestia, grandezze, giganti, versi, forma finale nella scheda), U in groppa ✅ v0.81.0 (sub sul dorso, Folgore, squalo elefante, cavalcature, grandezze, limite in battaglia), V sonar/drone/cacce ✅ v0.82.0 (leggenda a riposo, echi riconosciuti, drone), W timone e recinto ✅ v0.83.0 (quadranti, vasca sul Cockpit, Dai oggetto), X mare, Y immagini.
**Decisioni:**
- forma finale circa 15-20 livelli sopra i livelli selvatici di ogni specie, non più 100 per tutte;
- cavalcabili: sì a Varano d'osso, pesce spada Corazzato e tartaruga preistorica; no a pesce vela e polpo gigante;
- la megattera finale si chiama "Megattera Titanica".

Il proprietario manderà altre note; poi si sceglie l'ordine. Raggruppati per tipo:

- **Menu di pausa:** togliere "Rivedi l'inizio"; Esporta/Importa salvataggio spostati in un sottomenu del menu iniziale.
- **Branchi in mare:** i pesci dietro la guida fanno piccoli scatti (barracuda, delfini, tutti i branchi).
- **Battaglia, la tua bestia (il problema più diffuso):**
  - le bestie medio-grandi stanno troppo in basso e la barra col nome copre corpo e testa;
  - casi segnalati: squalo bianco e tutte le sue forme, Zanna, Squarcio, Zannarossa, martello del Tuono, pesce leone, pastinaca, pesce vela (anche alfa), chimera (meno), granchio, tonno, pesce luna, scorfano, napoleone e corazzato, pesce spada, squalo tigre, orca, rana pescatrice (anche alfa), squalo goblin, capodoglio, megalodonte, squalo volpe alfa;
  - il dragone nero ha il problema opposto: è troppo avanti;
  - tartarughe e Guscio sono già giuste.
  - Da studiare bene per non far tornare le sovrapposizioni tra le due bestie.
- **Battaglia, grandezze:**
  - il nemico sembra più grosso della tua bestia della stessa forma o più grande: squalo bianco contro Titano, Saetta contro Folgore, coccodrillo albino leggendario contro se stesso;
  - i giganti non sembrano giganti: Moby Dick, mosasauro (uguale a un pesce palla), megattera cantore, orca preistorica albina, Madre delle madri. Va bene tagliare la coda fuori dallo schermo pur di mostrarne la stazza.
- **Battaglia, verso sbagliato del nemico** (la testa deve guardare il centro): Folgore, megattera, megattera cantore, rana pescatrice, orca preistorica albina, Madre delle madri. Da controllare su tutte, sempre.
- **In groppa, il sub sopra la pinna dorsale** (deve stare sul dorso, all'attaccatura della pinna): Re Alfa, Zannarossa, squalo bianco alfa, orca matriarca, Madre delle madri, martello preistorico, squalo elefante, megattera cantore.
- **In groppa, altro:**
  - Folgore si allunga e si accorcia salendo e scendendo (problema vecchio, da risolvere);
  - lo squalo elefante è mappato al contrario (testa che si muove come la coda);
  - Archelon: i neri dell'immagine in groppa sono rovinati.
- **Chi si cavalca:**
  - **da aggiungere:** Varano d'osso, pesce spada Corazzato, tartaruga preistorica;
  - **da togliere:** pesce vela, polpo gigante;
  - **da confermare:** nel gioco normale non si cavalcano tartarughe, pesce palla, murena, ecc. Oggi si cavalcano solo le cavalcature; il pulsante "In groppa" della galleria le forza tutte.
- **Grandezze in mare:** Archelon, tartaruga liuto e Varano d'osso troppo piccoli (le terze forme devono essere mastodontiche).
- **Immagini da rifare o sistemare:**
  - Saetta (fronte e retro, scontorno);
  - squalo bianco albino (retro, alone nero);
  - murena (retro, cerchio nero in faccia);
  - manta (fronte, bocca scontornata male);
  - lontra marina (alone della sfera di luce: o tutto o niente);
  - tartaruga liuto (retro inutilizzabile);
  - squalo balena (retro: ingrandito dalla pinna dorsale in su);
  - coccodrilli in battaglia (non convincono);
  - megattera (fronte, non convince);
  - Archelon in groppa.
- **Movimento:** polpo gigante e calamaro gigante (come la Piovra) troppo statici, non muovono i tentacoli; il granchio non può fluttuare come un pesce.
- **Immagini mancanti:**
  - calamaro colossale, serpente di mare, Kraken, Leviatano (non devono comparire in mare né nella galleria finché mancano);
  - il Leviatano doveva usare altre immagini (chiarire con il proprietario);
  - lo Sfregiato in groppa;
  - il Dunkleosteus in mare: la galleria non carica le immagini delle bestie che non vivono ancora nelle zone del gioco.
- **Galleria:** si deve poter sempre fuggire.
- **Regole:**
  - forme finali al livello 100 irraggiungibili: proposta del proprietario, livello 70;
  - i compagni in acqua non servono a nulla, da ripensare (blocco 7);
  - nome "Megattera cantore" da cambiare.
- **Sub e superficie:** muro invisibile salendo; deve galleggiare come le bestie (senza saltare fuori); in tempesta sembra fluttuare tra un'onda e l'altra.

- **Altre note del 20 ottobre (partita normale):**
  - **Sonar e cacce:**
    - un leggendario appena battuto resta sul sonar;
    - le tane dei leggendari si vedono in plancia (da togliere);
    - una specie già vista e catturata risulta "specie sconosciuta" al sonar;
    - il drone della Ocean's Nightmare non trova la bestia "sconosciuta di 9 m" che il sonar vede (non sincronizzati).
  - **Timone:**
    - la barra gialla del gas va oltre il massimo;
    - in alto l'indicatore della vasca si sovrappone al pulsante per spegnere il motore. La barra in alto va ridotta a 3 quadranti quadrati stile anni '70, solo icone e niente scritte: velocità, autonomia, litri di carburante.
  - **Recinto:** il pulsante dell'oggetto non fa nulla subito; uscendo dal cockpit compare "nessun oggetto disponibile" o simile. Chiarire a cosa serve.
  - **Card e bestiario:**
    - la scritta delle evoluzioni esce dal riquadro in tutte le card con evoluzioni;
    - molte illustrazioni del bestiario sono tagliate (es. il naso): tutto il corpo dentro, centrato.
  - **Suoni:** togliere il tic dei tocchi (v0.76.0), è fastidioso.
  - **Battaglia:**
    - balena (squalo balena o megattera, da capire) come nemico orientata male;
    - squalo tigre nemico sempre enorme, anche contro bestie molto più grandi.


## Blocco 1 — Nuovo inizio senza storia
- La storia attuale (Compagnia dell'Olio Nero, Vedova Nera, capitoli 1–4) va ripensata del tutto: **in pausa** fino al blocco 10.
- Fuori dal gioco le bestie solo della storia: Sfregiato, Re Corallo, Piovra (tolte anche dalla partita del proprietario). Il Calamaro colossale diventa una bestia normale.
- I templi sommersi restano, senza riferimenti alla storia.
- Inizio: tutorial breve a Portofosco (nuota, prendi le sardine, doma la prima bestia; lo starter resta), poi Aurelio: "ci vediamo a Porto Fango". A Porto Fango ti dà la nave e il sottomarino ("tocca questo pulsante per calare il sottomarino").
- Zona protetta: la costa fino a Porto Fango non ha superpredatori (niente squalo bianco né coccodrillo marino); restano innocui e mediamente pericolosi. Le bestie pericolose hanno sempre livelli alti.

## Blocco 2 — Correzioni rapide
- ✅ Suono del motore della nave: non in battaglia, non lontano dalla nave, non in pausa. (verificato nel codice il 19 ottobre: silenzio in battaglia, sfumato nei menu, sentito solo vicino alla nave)
- ✅ Pulsante **Spegni motore** (cockpit e vista del timone): in folle oggi consuma carburante. (verificato nel codice il 19 ottobre: pulsante ⏻ al timone)
- Ghiaccio: il limite di 10 nodi solo attraversando gli iceberg, non entrando nella zona.
- Sottomarino: le leve tornano al centro quando non le tocchi; dopo un urto il gas può bloccarsi (bisogna uscire e rientrare); quando è rotto non si capisce come ripararlo.
- Danni delle mosse incoerenti: una mossa mostra 60, dopo averne imparata un'altra mostra un valore diverso.
- ✅ **Aria dei cetacei**: in groppa, scendendo in profondità l'aria cala, ma risalendo in superficie non si ricarica (risposta del proprietario, 8 ottobre). (verificato nel codice il 19 ottobre: si ricarica in superficie contando dal dorso della bestia, diver.ts)
- **Avamposto**: il pulsante Porto compare solo stando a destra con la nave; deve comparire in tutta la zona intorno (destra, sinistra, sopra).
- Megalodonte assente tra le Leggende nel bestiario; verificare la categoria delle leggende.
- Sardine → denti: troppi denti troppo in fretta (migliaia in 2 minuti); restare soddisfacente.
- Megattera che guadagna livelli a manciate; controllare la curva XP.
- ✅ Orca preistorica albina: coda da squalo (di lato), non da cetaceo. (verificato nel codice il 19 ottobre: SIDE_TAIL_UNIQUES in data/beasts.ts)
- Granchi: stanno sul fondale, non nuotano come pesci.
- Salendo sulla nave il personaggio entra/gira dal lato sbagliato.
- Evoluzione del Roccaguscio: due animazioni; tenere quella sull'immagine della bestia (non quella con le card) per tutte le evoluzioni.

## Blocco 3 — Decisioni di design ✅ (risposte dell'8 ottobre nel GDD, "Decisioni di design")
1. Funzione delle cavalcature.
2. Funzione del nuoto (zone strette, raccolta, superficie, furtività, interazioni?) — vera modalità o transizione?
3. Funzione delle bestie di supporto (oggi sembrano inutili): ruoli cavalcatura / compagno / supporto / solo battaglia? Non tutte cavalcabili.
4. Serve la pesca / l'arpione?
5. Come funziona la cattura (combattimento, sfiancamento, arpione, domatura)?
6. Serve il cibo (per le bestie, per il giocatore)? Cosa fa "Nutri"?
7. Serve l'equipaggio? Solo se ha funzioni forti (sonarista +portata, motorista −consumi, biologo +informazioni, meccanico riparazioni, cacciatore +cattura).
8. A cosa serve la vita del sottomarino?
9. Navigazione oltre A → B (onde e velocità, pesca a strascico, attività durante la rotta).
10. Squadra cambiabile solo al porto? Le cure in nave richiedono tempo?
11. Chi modifica le bestie: il villain o anche noi? (vedi blocco 10)

## Blocco 4 — La flotta

- **Deciso l'8 ottobre:** ogni nave ha una **vasca** (posti per scambiare la squadra in mare; le navi grandi ne hanno di più); i sottomarini migliori hanno scafi più resistenti; le cure in nave richiedono qualche decina di secondi.
- Al porto principale (Porto Fango) un **concessionario**: card delle navi con le statistiche, più card dei sottomarini e dei motoscafi (venduti a parte o in dotazione).
- Ogni nave si compra con il suo equipaggiamento dentro (portelloni con sottomarino, motoscafo, moto d'acqua, drone…).
- Statistiche: grandezza, peso, motori e consumi, autonomia, sonar, abilità speciali; distacco netto tra navi base e premium. **Lunghezze reali** visibili in gioco (la maestosità delle navi grandi).
- Carburante da pianificare: costa di più, la nave base ha meno serbatoio e non fa comodamente tutto l'oceano andata e ritorno.
- Per ora **togliere i potenziamenti** attuali (verranno rifatti su misura per ogni mezzo).
- Le navi (immagini sul desktop, una cartella per nave, con card e, per alcune, motori accesi/spenti):
  - **Aurelia** (base, quella di oggi): lenta, pesante, sonar debole; sottomarino senza sonar.
  - **Expedition Hunter 1**: pesante, non veloce, un portellone; sottomarino a forma di squalo tra i più veloci del gioco, ma consuma molto, serbatoio piccolo, niente sonar.
  - **Expedition Hunter 2**: modello più sofisticato, enorme, due portelloni, consuma tanto ma serbatoi grandi, rompighiaccio formidabile, molto tecnologica e costosa; sottomarino con sonar (non il migliore, non velocissimo) e un **motoscafo da gara** (serbatoio piccolo, velocissimo: per esempio andare a prendere carburante o conchiglie all'avamposto più vicino).
  - **U-Boat Whale Exploration**: piccolo U-Boat a forma di balena, quasi sempre in superficie ma si immerge; sonar di prossimità; piccolo e maneggevole, serbatoio piccolo: il tuttofare d'ingresso.
  - **U-Boat Stormtrooper**: U-Boat grosso e lento, buon sonar (anche a 360°); immergersi non è comodo (deve risalire dopo un po'), troppo lungo per i passaggi stretti.
  - **Ocean's Nightmare**: la più costosa, U-Boat enorme (grande come l'Expedition 2), due portelloni, si immerge; un **drone sottomarino** (pilotato dal cockpit? routine di ricognizione da solo? da pensare) e una **sfera** calata sotto la nave che blocca tutte le bestie e le segnala per un po' (molto forte: tempo di ricarica). La migliore per le spedizioni, non la più veloce.
  - **Poseidon Yacht**: media, la nave più veloce (tre reattori); nel portellone il motoscafo più veloce del gioco. Da capire a cosa serve la velocità oltre agli spostamenti.
  - **Imperium Explorer VI**: ispirata all'impero romano, grande e alta (poco meno di Expedition 2 e Ocean's Nightmare), due vani: sottomarino e moto d'acqua veloce; ottimo compromesso tra velocità, serbatoio, consumi e tecnologia (ottimo sonar anche sul sottomarino).
  - L'ordine non è una classifica: prezzi e prestazioni da calibrare insieme, una nave alla volta.
- U-Boat: navigano mezzi immersi, a pelo d'acqua.
- Suono del motore diverso per ogni nave.

## Blocco 5 — Sonar e spedizioni

- **Diviso in 3 parti (9 ottobre).** 5a ✅ v0.61.0: echi in 2–5 grandezze secondo il sonar della nave, analisi di un'eco (specie se vista, indizi se nuova), avvistamenti nel Diario, tracker dal sottomarino per 30 minuti. 5b ✅ v0.62.0: luce sotto la nave ferma (curiosi subito, predatori dopo 45 s), branchi aggressivi che combattono uno dopo l'altro, branchi che nuotano insieme e cacciano sardine, orche che inseguono bestie piccole. 5c ✅ v0.63.0: radar di prossimità nel cockpit con bip, scafo delle navi (urti dell'U-Boat, tempesta, speronate), avaria con ricambi da Porto Fango o rimorchiatore, sonar a 360° sul vetro dei sottomarini col sonar, freccia verso la nave.

- **Deciso l'8 ottobre:** navigazione a due andature (trasferimento veloce e sordo, ricerca lenta col sonar); col mare mosso a tutta velocità consuma di più e rovina lo scafo; il tracker si mette a nuoto o dal sottomarino; lo scafo del sottomarino è il rischio della caccia (speronate).
- La ricerca col sonar è una delle cose più belle, ma da sola è poco: renderla il centro della ricerca delle bestie (brainstorming).
- Sonar più dettagliato (oggi piccolo / grande / leggendario): più classi di dimensione su alcune navi e sottomarini.
- Aiutare a capire cosa si cerca (es. un capodoglio: habitat, profondità, zona); le percentuali della mappa più utili senza diventare una lista da spuntare.
- Scan dal sottomarino; **tracker** sparato dal sottomarino o dal drone: la bestia resta rintracciabile per alcune ore (anche se il tempo cambia), così torni alla base e riparti.
- Sonar di prossimità a 360° sui sottomarini premium (es. per il coccodrillo albino dove la nave non arriva).
- Luce sotto la nave ferma che attira bestie curiose; bestie che si avvicinano alla nave invece di comparire.
- Branchi: quali bestie, quando, perché, come reagiscono al giocatore.
- Orientamento col sottomarino (ci si perde): sottomarini premium.

## Blocco 6 — Cattura e combattimento

- **Deciso l'8 ottobre:** arpione in mare che indebolisce fino a metà vita (la bestia si arrabbia o scappa); conchiglie di qualità diverse; pastura sì, pesca con la canna rimandata; Nutri dà un piccolo vantaggio per un po'; squadra cambiabile al porto e nella vasca della nave.
- Pastura; pesca dalla nave (tieni premuto e rilascia); arpioni; arpionare e sfiancare le bestie per combatterle con meno vita e favorire la cattura (o rende il ciclo troppo macchinoso? da provare prima).
- Più tipi di Conchiglia del domatore (come le Poké Ball).
- Animazioni diverse per le mosse (oggi tutte uguali).
- Squadra solo al porto? (il porto diventa la preparazione della spedizione).
- Zona iniziale: bestie fino a circa livello 30 per imparare e far crescere le bestie basse.

- **Vasca (fatto in parte, v0.64.3):** oggi a bordo si curano piano le più ferite, quanti i posti della vasca. Da fare qui: scegliere chi va in vasca e cambiare la squadra dalla vasca.
- **Da pensare (proprietario, 11 ottobre):** catturare uno dopo l'altro i megapredatori di livello alto stando sotto la nave (che aiuta), senza mai far crescere le proprie bestie. Serve un freno (es. la nave non aiuta in battaglia, livello massimo domabile legato alla squadra, conchiglie adatte).

## Blocco 7 — Ruoli delle bestie, nuoto, cavalcature

- **Deciso l'8 ottobre:** cavalcature = mezzo per esplorare (solo le specie che rendono bene in groppa); nuoto = modalità di dettaglio (posti stretti, raccolta, silenzio); supporto = un potere in mare ciascuna.
- Cosa si può fare a nuoto, in groppa, col motoscafo, col sottomarino.
- Posizione del sub sulle bestie grandi (brutta su alcune, da vedere una per una).
- Megalodonte cavalcabile: manca l'immagine. Sul desktop c'è un nuovo squalo preistorico (immagini e video di nuoto e virata) come possibile sostituto: **prova della virata da video** su una pagina separata (link) prima di metterlo nel gioco. Su iPhone: fotogrammi scontornati della sola virata, non il video intero.
- Raccogliere sardine è divertente: altre attività con le bestie?

## Blocco 8 — Immagini
- Rifare gli scontorni sbagliati (molte immagini fatte senza green screen).
- Varianti alfa e albine: le genera il proprietario (mai lo stesso disegno con un alone chiaro).
- Evoluzioni per ogni animale.
- Nuove navi, sottomarini, mute.

## Blocco 9 — Audio e atmosfera
- Sound design generale, sott'acqua, bestie, eventi; motore diverso per ogni nave.
- Sostituire le scritte tipo "Megattera si agita", "Torpedine a sinistra" con segnali audio e visivi nel mondo.
- Acqua torbida (nasconde le bestie "incollate" sul livello vicino), giorno e notte, meteo più visibile, bestie più vive (abitudini, branchi).

## Blocco 10 — Storia nuova e villain
- Ipotesi: un pescatore/baleniere industriale cattura le bestie da anni, le rinchiude, le modifica, le fa combattere; quelle che muoiono diventano olio per motori. Fabbriche, flotta, uomini in groppa a bestie modificate, basi sottomarine.
- Il giocatore scopre navi, strutture, bestie imprigionate, esperimenti, mutanti, combattimenti, produzione di olio; le bestie domate servono a sabotare l'impero (affondare navi, distruggere strutture e laboratori, liberare bestie, battere i suoi cacciatori).
- Decisione morale: A) noi buoni, evoluzione naturale; B) anche noi modifichiamo (DNA, reperti, reliquie abissali). Proposta di Claude: una via di mezzo, il villain con la chimica e noi con le reliquie abissali (le stesse forze, usate diversamente), coerente con lo stile delle evoluzioni (forme preistoriche, rune).
- Equipaggio: solo se ha funzioni forti; forse come sistema dei potenziamenti.

## Avamposti (proprietario, 11 ottobre 2026; fase futura)

- Meno avamposti, ognuno con uno scopo suo e diverso. Esempio: in uno si dorme per cambiare il tempo, con una ricarica lunga. Poche cose per avamposto, per non barare.

## Esperienza e personalizzazione (quando c'è spazio)
- All'inizio: nome del giocatore, piccola personalizzazione, colori del sottomarino.
- Menu del porto da riorganizzare (schede per nave, sottomarino, potenziamenti, squadra, equipaggiamento).
- Più chiaro dove trovare le bestie; sonar più leggibile.
- Ciclo giorno/notte.

## Idee del proprietario (10 ottobre 2026), con l'ordine proposto

Subito, in un pacchetto di rifiniture (✅ fatte in v0.63.2):
- La banchisa di ghiaccio non si vede con le onde.
- Ocean's Nightmare: dopo la ricognizione del drone, sul sonar i nomi degli animali compaiono da soli (li ha già analizzati il drone).
- Nel cockpit: indicatore del vento, della qualità dell'acqua (torbidità) e della visibilità.
- Card dei mezzi (cantiere, scheda nave/barca) da aggiornare con le novità (radar, scafo, sonar, ricambi); da ora in poi aggiornarle a ogni modifica dei mezzi.

Quando arrivano gli asset:
- Una nuova nave (asset pronti dal proprietario).

Con il blocco 6 (cattura e combattimento):
- Contratti per catturare bestie specifiche (al porto, con ricompensa).
- Squadra tutta KO: niente più ritorno automatico; i predatori possono attaccarti e mangiarti, i cuori contano davvero; a zero cuori muori e riappari (con la perdita di denti).

Blocco "mezzi e mare" (dopo il 6):
- Dare un senso al motoscafo: reti da calare in mare che si riempiono di sardine in qualche ora di gioco (minuti reali), mentre la nave va oltre; si torna a prenderle. Resa a fortuna e zona, massimo per rete.
- Correnti con una direzione: contro corrente consumi alle stelle e più lento, a favore più veloce e consumi meno (oggi c'è solo il rallentamento della tempesta).

Grande, da progettare bene (insieme al blocco 10, storia):
- Nuovo inizio lungo un fiume di circa 10 km dentro una giungla fitta, prima di Portofosco: acqua bassa, solo motoscafi e gommoni, rocce che rovinano lo scafo, animali di fiume piccoli e predatori (coccodrilli); si arriva gradualmente al mare, dove ti danno la barca. Asset della giungla generati dal proprietario con Gemini.

## Krill Hunter (deciso il 10 ottobre 2026) — ✅ v0.64.0
- Nave ipertecnologica (non U-Boat), 40.000 denti, tra l'EH2 e l'Ocean's Nightmare. Immagini in `art-inbox/` (`nave_lanterna*`, `motoscafo_lanterna*`, `sottomarino_lanterna*`: nome di file provvisorio "lanterna").
- Due portelloni: il drone con le braccia (guidabile come sottomarino, col sonar sul vetro) e il motoscafo a balena.
- Drone da remoto: tracker a distanza. Tocchi un'eco sul sonar, il drone parte da solo, raggiunge la bestia, le pianta il tracker e torna. Meno forte della ricognizione del Nightmare.
- Al posto della luce: "Apri bocca", la luce esce dalla bocca della balena, attira le sardine e le mangia (nella sacca), con un tetto (proposta: 1 minuto, al massimo 25 sardine, poi 10 minuti di ricarica); attira anche le bestie curiose. Bocca e portelloni uno alla volta.
- Luci azzurre estratte dalle immagini e pulsanti, come le rune del Nightmare.

## Battaglie a nuoto (proposta di Claude, da decidere nel blocco 6)
- In groppa: come oggi, la cavalcatura ti difende e la battaglia parte subito.
- A nuoto da solo: il predatore prima morde (un cuore, spinta), poi o lo affronti (tocchi la bestia o una delle tue nella barra della squadra) o scappi; continua a inseguire e mordere finché non lo semini.
- Colpirlo per primo con l'arma: battaglia in vantaggio, come oggi.
- Squadra tutta KO: niente battaglia, solo morsi; a zero cuori muori e riappari (con denti persi).
- Calme e timide non mordono. Tregua dopo ogni morso; inizio del gioco facile.
