# Leviatano — Documento di design

Aggiornato al 29 settembre 2026. La copia viva e commentabile è il Claude Doc "Leviatano — Documento di design" (schede: principale, Prompt illustrazioni, Mosse). Tutte le tabelle numeriche (bestie, mosse, regioni, mute, armi, oggetti, skin) vivono nei file di `data/`: sono la fonte unica, questo documento spiega le regole.

## Visione

Gioco di esplorazione e collezione di bestie marine, dark fantasy, 2D con grafica realistica dipinta: Pokémon incontra Monster Hunter sott'acqua. Sei l'ultimo domatore di Portofosco: domi squali, cetacei e mostri preistorici, li cavalchi e li schieri in squadra per fermare la Compagnia dell'Olio Nero prima che dissangui il Leviatano.

- **Collezione:** 34 bestie, tutte domabili, più varianti rare; ogni bestia sale di livello e impara mosse.
- **Caccia:** le bestie grandi si affrontano leggendo i loro attacchi e usando le mosse del tipo giusto.
- **Esplorazione continua:** un unico oceano senza caricamenti, che si apre con mute migliori e abilità delle bestie.
- **Atmosfera:** buio vero, la lampada come unica luce.
- **Obiettivo:** finire la storia, poi completare il bestiario. Durata: prima bestia in 15 minuti, finale in 8-10 ore, bestiario oltre 20 ore.
- **Piattaforma:** prima iPhone, anche offline (PWA); poi PC e Steam.

## Mondo

- Un unico oceano continuo: da ovest a est cambiano i biomi, dall'alto in basso cresce il pericolo. Regioni in `data/world.ts`.
- **Profondità:** la muta indossata fissa la profondità massima; per scendere oltre serve una muta migliore.
- **Delta delle Mangrovie:** piccola zona tra la Baia e la Barriera Rossa, dove un fiume sfocia nel mare: acqua salmastra, bassa e torbida, radici di mangrovie e rive. Ci vivono i due coccodrilli, che attaccano dalla superficie.
- **Abilità delle bestie:** alcuni passaggi si aprono solo con certe bestie (sfondare ossa, spezzare il ghiaccio, vincere le correnti).
- **Porto di Portofosco:** unica base. Mercato, recinto (riserva), bacheca missioni, santuario.
- **Sottomarino** (dal 3 ottobre 2026, al posto della barca):
  - va sott'acqua, anche sotto gli iceberg, ogni modello fino alla sua profondità;
  - il primo è lento; al porto se ne comprano di migliori;
  - è un santuario mobile: dentro respiri, ti curi e peschi;
  - dentro non si combatte: le bestie normali scappano, quelle grandi e aggressive lo urtano;
  - rotto, viene rimorchiato al porto, dove si ripara;
  - resta dove lo lasci.
- **Santuari:** cura graduale di giocatore e squadra (circa 5 s fermi per riempire vita e ossigeno); punto di rinascita.
- **Guardiani:** chiudono ogni capitolo; sconfitti danno molti denti e diventano domabili come variante unica.
- **Sessioni:** immersioni di 10-15 minuti, poi ritorno in porto.

## Storia

Storia leggera con pochi personaggi, mistero raccontato dall'ambiente.

- **Premessa:** il Leviatano si è svegliato, le bestie impazziscono. La Compagnia dell'Olio Nero le caccia, le incatena con collari di ferro e ne estrae l'olio; il piano finale è dissanguare il Leviatano.
- **I lavori di Aurelio** (dal 3 ottobre 2026): dopo la prima immersione, prima che il molo bruci, quattro piccoli lavori del porto. Pescare 5 sardine, vincere 2 battaglie contro i barracuda, domare una bestia, portare il compagno al livello 9. Pagano denti e fanno crescere la squadra.
- **Apertura:** sulla barca di Nonno Aurelio passa una nave della Compagnia che trascina una balena in catene. Aurelio ti dà l'arpione e la Conchiglia del domatore: "Scendi, prendi confidenza col mare". Risalito, il molo brucia; Aurelio ti consegna un collare spezzato: "Uno di questi l'avevano messo al mio squalo. Trovalo".
- **Capitolo 1 (deciso il 30 settembre 2026):** lo Sfregiato è lo squalo di Aurelio, impazzito per il collare della Compagnia; domarlo lo libera. Il capitolo si chiude con la nave della Compagnia che salpa verso il Delta delle Mangrovie.
- **Capitolo 2 (deciso il 1 ottobre 2026):** nel Delta delle Mangrovie la nave della Vedova Nera (prima comandante della Compagnia) tiene incatenata la megattera dell'apertura. Spezzi i tre ancoraggi mentre il suo coccodrillo ti attacca; la balena liberata si unisce a te e la Vedova fugge verso la Barriera Rossa.
- **Capitolo 3 (deciso il 1 ottobre 2026, fatto in v0.14.0):** nella Barriera Rossa la Vedova Nera sta strappando il Re Corallo con catene e argani; impazzito dal dolore ti attacca in un anfiteatro di corallo sul fondale. Sfinito, rompi le catene e lo domi; la Vedova fugge verso la Foresta Sommersa.
- **Capitolo 4 (deciso il 3 ottobre 2026, fatto in v0.17.0):**
  - la Vedova ha trovato il primo pezzo della reliquia, il **Corno delle Catene**: il suono passa da una campana di bronzo sotto la sua nave e lega **la Piovra** (livello 25) a un galeone affondato nella Foresta Sommersa;
  - mentre il suono dura, i tentacoli escono dalle alghe e ti afferrano: ti liberi premendo più volte Scatto, intanto perdi aria;
  - spezzi la campana con tre colpi, affronti la Piovra vicino al galeone e, battuta, il collare si spezza e lei si unisce a te;
  - la Vedova fugge verso il Mare di Ghiaccio, dalla Regina bianca.
- **Capitoli successivi (proposta, 3 ottobre 2026):** 5 Mare di Ghiaccio (Regina bianca), 6 Fossa del Capodoglio (Calamaro colossale), 7 Abisso del Tempio (il Leviatano, finale). Dopo il finale la Fossa Nera con le leggende. Dal capitolo 5 le zone sono lontane e profonde: servono i sottomarini migliori.
- **Personaggi:** Nonno Aurelio (mentore), il mercante di denti, la Compagnia (un comandante per regione con una bestia incatenata da liberare), il Leviatano (finale).
- **Dopo il finale:** Fossa Nera coi leggendari; il Leviatano diventa domabile.

## Bestie

- **Squadra:** 5 bestie, una in acqua alla volta; riserva al recinto senza limite.
- **Ruoli:** cavalcatura (grande, carica, spesso chiave di un passaggio), compagno (combatte con te), supporto (cura, luce, scudo, inchiostro). Nel mare ogni bestia si chiama dalla barra: le cavalcature ti portano in sella, le altre ti seguono e mangiano i pesci. Le seconde forme delle linee iniziali si cavalcano già, più lente.
- **Tipi:** cinque in cerchio, ognuno batte il successivo: Predatore → Abissale → Glaciale → Tempesta → Corazzato → Predatore. Come Pokémon (dal 3 ottobre 2026): ogni tipo batte il successivo e il terzo dopo nel cerchio, danno ×2 contro chi batti e ×½ contro chi ti batte. Anche mosse, alcune armi e Guardiani hanno un tipo.
- **Livelli:** 1-100 come Pokémon (dal 3 ottobre 2026; prima 1-50), esperienza combattendo; le statistiche crescono col livello. Le bestie selvatiche hanno livelli legati alla zona.
- **Mosse:** 3 per bestia, sbloccate ai livelli 1, 7 e 15 (una bestia domata oltre il 15 le ha tutte). Il danno delle mosse cresce del 4% per livello. In sella stanno su 3 pulsanti; compagno e branco le usano da soli. Le mosse firma hanno un'animazione dedicata (`anim` in `data/moves.ts`).
- **Dimensioni:** ogni specie ha una lunghezza di riferimento (squalo bianco 6 m, orca 8 m, capodoglio 18 m, megalodonte 18 m, Leviatano 120 m). L'alfa è il 15% più grande, gli Sfregiati dei Guardiani il 25%, la forma finale il 50%: lo Squalo bianco Titano arriva a 9 m, sempre la metà di un megalodonte.
- **Crescita e forma finale:** dimensione standard fino al 50; dal 51 al 100 circa +0,8% di dimensione per livello, e servono esperienza più una barra di nutrimento (pesci mangiati). Al 100 le specie iconiche raggiungono la forma finale (stessa specie portata all'estremo, es. Squalo bianco Titano; il Megalodonte Primordiale resta il più grande).
- **Forme finali delle varianti:** l'albino ha una propria forma finale (per lo squalo bianco il Mega albino, 1,5 volte la taglia standard); l'alfa non ne ha. Per le altre specie non è ancora deciso.
- **Varianti:** ogni specie ha albino (+10%, 8% degli incontri) e alfa (+20%, più grande, 4%); i Guardiani hanno varianti uniche. Una stella in più.
- **Scheda della bestia:** illustrazione, stelle, tipo, ruolo, statistiche, le tre mosse con livello di sblocco, lucchetto, danno attuale e al prossimo livello, habitat, varianti, storia.
- **Layout della scheda in orizzontale** (il gioco si usa in orizzontale): illustrazione a sinistra a tutta altezza, sempre intera; a destra nome, stelle, tipo, statistiche e mosse, scorrevoli. In verticale: illustrazione sopra, dati sotto. L'illustrazione non va mai tagliata. Tocco sull'illustrazione: passa al modello animato del gioco.
- **Ossigeno:** capodoglio, megattera e Livyatan sono stazioni d'ossigeno: mentre li cavalchi l'ossigeno non cala.
- **Vita e KO:** in sella i colpi li prende la bestia; a zero va KO e si cura in un santuario.
- **Catena alimentare:** i predatori, tuoi e selvatici, mangiano le creature più piccole.
- **Sciami:** le creature che vivono in branco non si domano una a una: catturandone abbastanza (es. 10 sardine) si lega a sé l'intero sciame, che entra nel bestiario e va nello zaino come richiamo con durata e ricarica. Quattro sciami: sardine (muro-esca che distrae i predatori), meduse spettrali (barriera che stordisce), pesci lanterna (luce), krill (cura lenta della squadra). Dati in `SWARMS` (`data/world.ts`).
- **Bestiario:** 34 bestie, 4 sciami, 12 pesci da cattura.
- **Branco:** indicatore che si riempie combattendo; quando è pieno tutta la squadra esce per 20 s.

## Orche e bestie leggendarie (deciso il 30 settembre 2026)

- **Orche:** si muovono e attaccano in gruppo, sono intelligenti e sociali.
- **Orca matriarca** (`orca_matriarca`): la capa del gruppo. Un'orca, a un certo livello, si evolve in matriarca, ma c'è una sola matriarca per gruppo. Se hai una matriarca e altre orche domate, quando schieri la matriarca ti seguono al massimo altre 2 orche, che la difendono attivamente. Le orche di scorta occupano posti della squadra (e devi averle domate prima). Se hai una matriarca, le orche selvatiche non ti attaccano spontaneamente, solo se attaccate.
- **Madre delle madri** (`orca_matriarca_finale`, matriarca leggendaria): forma finale della matriarca a livello molto alto. Porta con sé una squadra di 3 orche più una matriarca.
- **Orca preistorica albina** (`orca_preistorica_albina`): leggendaria, ancora più rara della Madre delle madri. Solitaria, malvagia, più forte di tutte le altre orche.
- **Coccodrillo albino leggendario** (`coccodrillo_marino_leggendario`): raro e leggendario, più raro e più forte del coccodrillo marino normale.
- Da decidere: livello dell'evoluzione in matriarca e in Madre delle madri, probabilità di incontro, statistiche (si fissano quando si arriva al Mare di Ghiaccio e al Delta).

## Domatura

Nessun limite artificiale: si può provare con qualsiasi bestia, ma la differenza di livello rende quasi impossibile domarne una molto più forte della tua squadra.

1. **Sfiancare:** portare la vita sotto la soglia di sfinimento (tacca sulla barra), leggendo i pattern d'attacco. Le mosse del tipo giusto sfiancano prima.
2. **Conchiglia del domatore:** lo strumento con cui si doma; senza gradi né potenziamenti.
3. **Minigioco:** tre colpi a tempo, tre errori concessi; fasce più strette e indicatore più veloce quanto più il livello della bestia supera quello della tua bestia più forte (`TAMING` in `data/rules.ts`).
4. **Doppioni:** un doppione della versione comune, sfiancato, fugge.
5. **Arpione mitico:** oggetto monouso che stordisce all'istante e porta dritto al minigioco (il minigioco resta).

## Progressione ed economia

Due binari: le bestie salgono di livello combattendo; il sub cresce con mute, armi e oggetti comprati coi **denti di squalo**. Le bestie non si comprano: l'unica scorciatoia è l'Arpione mitico, carissimo e con scorte limitate che si riforniscono dopo ogni Guardiano.

- **Denti da:** missioni e taglie, vendita dei pesci, relitti e forzieri. Abbattere nemici dà esperienza, non denti.
- **Denti per:** mute e potenziamenti (profondità, ossigeno, abilità del sub, lampada), armi, oggetti dello zaino, skin.
- **Mute:** leggera, rinforzata, scafandro da palombaro, abissale; ognuna con pro e contro. Il sub non ha un livello proprio.
- **Zaino:** arpione base sempre equipaggiato + 3 posti scelti prima di ogni immersione, tra armi, sciami e oggetti (Krill dorato, Alga curativa, Bolla d'aria, Esca, Arpione mitico).
- **Skin:** per bestie già domate, con un piccolo bonus (+5% a una statistica), una attiva per bestia.

## Combattimento

- Tempo reale. Doppio joystick: sinistra per nuotare, il pulsante dell'arma si trascina per mirare e sparare a raffica.
- Armi: arpione, fiocine, rete, lancia folgore (Tempesta), arpione runico. Le armi servono a sopravvivere e sfiancare; si potenziano coi denti.
- Feedback: barre vita sopra nemici e bestie, numeri di danno, tacca di sfinimento.

## Piattaforma tecnica

Phaser + TypeScript + Vite, PWA installabile e giocabile offline, deploy su GitHub Pages. Dati separati dal codice (`data/`). Salvataggi versionati con esporta/importa. Grafica realistica in alta risoluzione con telecamera lontana (sub piccolo, mare grande): fondali dipinti a strati, bestie da immagini di profilo animate a spina dorsale, illustrazioni AI nelle card (`docs/ART.md`). Regole di movimento delle bestie grandi in `CLAUDE.md`.

## Spedizioni (deciso il 4 ottobre 2026)

Il mare deve avere uno scopo: spedizioni vere per trovare e catturare bestie rare e temibili, con paura e preparazione, non chilometri vuoti.

- **Oceano finito di circa 30 km:**
  - la costa fatta a mano (fino a ~1,6 km);
  - poi 5 regioni progettate, in ordine di difficoltà:
    1. Barriera esterna 2–6 km;
    2. Mare blu 6–12;
    3. Foresta e Banchisa 12–18;
    4. Grandi fosse 18–26;
    5. Abisso del Leviatano 26–30.
  - Ogni regione ha uno strato vicino alla superficie e uno profondo.
  - La mappa ha una scheda per regione.
- **Livelli dal pericolo, non dalla distanza.** Ogni specie ha un grado:
  1. innocui 2–12;
  2. piccoli predatori 8–20;
  3. predatori seri 20–35;
  4. superpredatori 35–55, come squalo bianco, orca, coccodrillo marino, capodoglio;
  5. giganti preistorici 55–75;
  - leggende 50–100.

  Alfa +10/15, albini +8. Regione e profondità spostano il livello solo di pochi punti. Lo squalo bianco può comparire anche vicino a riva, ma sempre a livello alto: con una squadra a 10–20 affrontarlo è un rischio vero.
- **Habitat veri:** ogni specie ha profondità minima e massima e le sue regioni. Lo squalo bianco non vive negli abissi; negli abissi vivono gli animali degli abissi. Il bestiario mostra profondità e regioni.
- **Paura:** quando compare una bestia molto più forte della squadra, un avviso ("Pericolo: Squalo bianco Lv 41") e un suono cupo. Scappare o evitarla è una scelta.
- **La nave da spedizione, la tua casa** (arriva a fine capitolo 4):
  - in superficie, veloce ma non esagerata; rompe il ghiaccio; non si blocca mai (quello che esce dall'acqua lo gira intorno);
  - si guida con le leve: gas che resta a sinistra, direzione a destra; si gira di colpo da ferma;
  - il portellone si apre solo a nave ferma, e aperto la nave non si muove. Il sottomarino scende lungo la rampa fino a mezz'acqua sotto la nave e si riaggancia solo davanti al portellone;
  - nel cockpit: carburante e autonomia in km, sonar, mappa, Diario di caccia, recinto della squadra, riposo e salvataggio, deposito.
- **Sonar solo sulla nave:** è la chiave dell'esplorazione. Mostra profondità ed echi delle bestie grandi; i potenziamenti riconoscono il tipo di eco e le echi anomale.
- **Le leggende si cacciano in 4 passi, chiari e segnati nel Diario di caccia:**
  1. una voce al porto o agli avamposti (bacheca "Avvistamenti") dice la regione;
  2. una condizione (solo con la nebbia, in tempesta, di notte…);
  3. l'eco anomala col sonar, solo abbastanza vicino, nel momento giusto e con il sonar adatto alla profondità;
  4. le tracce col sottomarino (carcasse, graffi, sangue).

  La bestia non sta ferma. Alfa e albini normali possono comparire anche a caso, ma raramente e solo nel loro habitat.
- **Carburante e scorte:**
  - nave e sottomarino hanno serbatoi propri, che si riempiono ai porti e agli avamposti;
  - nel cockpit vedi l'autonomia e puoi travasare carburante tra i due;
  - finito il carburante si torna a nuoto o in groppa; da lontano c'è il razzo di soccorso (un rimorchiatore ti riporta al porto a caro prezzo).
- **Cure solo sulla nave e al porto:** il sottomarino non cura più, e i santuari in mare vengono tolti.
- **I tre mezzi hanno ruoli diversi:**
  - la nave per il viaggio, il sonar e la casa;
  - il sottomarino per scendere al sicuro nel buio;
  - la bestia cavalcata per grotte, templi e combattimento: non consuma carburante, ma non guarisce fuori dalla nave.
- **Avamposti:** uno per regione, da scoprire: attracco, cure e negozio.
- **Ricompense** scalate per regione e profondità: relitti più ricchi, un tempio per regione, pezzi per nave e sottomarino, pesci rari, missioni di spedizione.

## Roadmap

1. ✅ **Fondamenta (v0.1.0):** progetto, mondo, luce, sub, arpione, PWA offline, salvataggi, deploy.
2. ✅ **Bestie e combattimento (v0.2.0):** tipi, mosse, squadra, compagno, cavalcatura, domatura, santuari.
3. ✅ **Porto ed economia (v0.3.0):** mercato, mute, zaino, missioni, denti.
4. ✅ **Livelli e crescita (v0.4.0):** esperienza, sblocco mosse, crescita 31-50, forme finali, Lo Sfregiato come primo Guardiano.
5. ✅ **Storia del capitolo 1 (v0.5.0):** apertura, collare spezzato, lo Sfregiato è lo squalo di Aurelio, finale verso il Delta.
6. ✅ **Capitolo 2 (v0.6.0):** il Delta delle Mangrovie, i coccodrilli, la Vedova Nera e la megattera liberata.
7. ✅ **La Costa (v0.9.0):** spiaggia, Baia più grande, Isola delle Mangrovie con Porto Fango, Delta alla foce, velocità più realistiche.
8. ✅ **Oceano aperto infinito (v0.10.0):** tratti generati (mare aperto, barriera, foresta, banchisa, fosse), mute per immersioni lunghe, sfiatatoi per l'ossigeno, livelli che crescono con la distanza.
8b. ✅ **La barca (v0.11.0),** diventata **il sottomarino (v0.15.0):** regalo di Aurelio, sott'acqua fino alla profondità del modello, santuario mobile, pesca, modelli migliori al porto; niente viaggio istantaneo.
8c. ✅ **Le leggende (v0.12.0):** una sola nel mondo, solo nel suo posto, rara; domata è tua, sconfitta sparisce per sempre.
8d. ✅ **Il primo tempio sommerso (v0.13.0):** nel mare aperto a quasi 4 km, mezzo sepolto nel fondale. Quattro sale: una leva, due leve da colpire una subito dopo l'altra, quattro rune nell'ordine del mosaico, un corridoio lungo con sfiatatoi. In fondo una reliquia (Respiro degli Antichi: l'aria dura circa il 50% in più, per sempre). La Compagnia è già passata di lì: la Vedova Nera cerca nei templi una reliquia che piega le bestie (gancio per il capitolo 3). Altri templi: altri rompicapo, con reliquie o leggende come premio.
9. ✅ **Capitolo 3 (v0.14.0):** la Barriera Rossa. Sopra un anfiteatro di corallo a gradoni la nave della Vedova tiene il Re Corallo (livello 20) con tre catene. Il re ti attacca; battuto resta sfinito, spezzi le catene e si unisce a te. La Vedova cerca nei templi una reliquia che piega le bestie e fugge verso la Foresta Sommersa.
10. ✅ **Capitolo 4 (v0.17.0):** la Foresta Sommersa, il Corno delle Catene, la campana, i tentacoli, la Piovra.
11. **Spedizioni** (progetto del 4 ottobre 2026, sopra):
    1. ✅ la nave e le leve (v0.39.0);
    2. ✅ carburante, cockpit e cure solo sulla nave, via i santuari, razzo di soccorso (v0.40.0);
    3. ✅ l'oceano di 30 km in regioni, avamposti, mappa per regione (v0.41.0);
    4. ✅ livelli per pericolo e habitat veri, avviso di pericolo, profondità nel bestiario (v0.41.0);
    5. ✅ sonar e Diario di caccia (bacheca Avvistamenti, condizioni, echi, tracce, leggende) (v0.41.0);
    6. ✅ ricompense per regione: relitti, missioni di spedizione, pezzi per la nave (v0.41.0). Da fare: un tempio per regione, pesci rari.
12. **Capitolo 5 e seguenti:** una regione alla volta (prossimo: il Mare di Ghiaccio e la Regina bianca).

## Decisioni aperte

- Nomi definitivi dei comandanti dei capitoli successivi (il primo è la Vedova Nera).
- Prezzi, curva di esperienza, valori di danno (primo passaggio in `data/`, da bilanciare giocando).
- Penalità alla morte: per ora nessuna (si rinasce al santuario o al porto); contro i Guardiani il proprietario ha scelto "solo rinascita".
- Guardiano della Fossa: Abissale o Tempesta (ora due Guardiani Abissali).
