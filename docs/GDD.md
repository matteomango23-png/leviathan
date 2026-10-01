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
- **Barca:** viaggio veloce in superficie; è anche santuario mobile.
- **Santuari:** cura graduale di giocatore e squadra (circa 5 s fermi per riempire vita e ossigeno); punto di rinascita.
- **Guardiani:** chiudono ogni capitolo; sconfitti danno molti denti e diventano domabili come variante unica.
- **Sessioni:** immersioni di 10-15 minuti, poi ritorno in porto.

## Storia

Storia leggera con pochi personaggi, mistero raccontato dall'ambiente.

- **Premessa:** il Leviatano si è svegliato, le bestie impazziscono. La Compagnia dell'Olio Nero le caccia, le incatena con collari di ferro e ne estrae l'olio; il piano finale è dissanguare il Leviatano.
- **Apertura:** sulla barca di Nonno Aurelio passa una nave della Compagnia che trascina una balena in catene. Aurelio ti dà l'arpione e la Conchiglia del domatore: "Scendi, prendi confidenza col mare". Risalito, il molo brucia; Aurelio ti consegna un collare spezzato: "Uno di questi l'avevano messo al mio squalo. Trovalo".
- **Capitolo 1 (deciso il 30 settembre 2026):** lo Sfregiato è lo squalo di Aurelio, impazzito per il collare della Compagnia; domarlo lo libera. Il capitolo si chiude con la nave della Compagnia che salpa verso il Delta delle Mangrovie.
- **Capitolo 2 (deciso il 1 ottobre 2026):** nel Delta delle Mangrovie la nave della Vedova Nera (prima comandante della Compagnia) tiene incatenata la megattera dell'apertura. Spezzi i tre ancoraggi mentre il suo coccodrillo ti attacca; la balena liberata si unisce a te e la Vedova fugge verso la Barriera Rossa.
- **Capitolo 3 (deciso il 1 ottobre 2026, da fare):** nella Barriera Rossa la Vedova Nera sta strappando il Re Corallo con catene e argani; impazzito dal dolore ti attacca in un anfiteatro di corallo sul fondale. Sfinito, rompi le catene e lo domi; la Vedova fugge verso la Foresta Sommersa.
- **Personaggi:** Nonno Aurelio (mentore), il mercante di denti, la Compagnia (un comandante per regione con una bestia incatenata da liberare), il Leviatano (finale).
- **Dopo il finale:** Fossa Nera coi leggendari; il Leviatano diventa domabile.

## Bestie

- **Squadra:** 5 bestie, una in acqua alla volta; riserva al recinto senza limite.
- **Ruoli:** cavalcatura (grande, carica, spesso chiave di un passaggio), compagno (combatte con te), supporto (cura, luce, scudo, inchiostro).
- **Tipi:** cinque in cerchio, ognuno batte il successivo: Predatore → Abissale → Glaciale → Tempesta → Corazzato → Predatore. +50% di danno contro chi batti, un terzo in meno contro chi ti batte. Anche mosse, alcune armi e Guardiani hanno un tipo.
- **Livelli:** 1-50, esperienza combattendo; le statistiche crescono col livello. Le bestie selvatiche hanno livelli legati alla zona.
- **Mosse:** 3 per bestia, sbloccate ai livelli 1, 7 e 15 (una bestia domata oltre il 15 le ha tutte). Il danno delle mosse cresce del 4% per livello. In sella stanno su 3 pulsanti; compagno e branco le usano da soli. Le mosse firma hanno un'animazione dedicata (`anim` in `data/moves.ts`).
- **Dimensioni:** ogni specie ha una lunghezza di riferimento (squalo bianco 6 m, orca 8 m, capodoglio 18 m, megalodonte 18 m, Leviatano 120 m). L'alfa è il 15% più grande, gli Sfregiati dei Guardiani il 25%, la forma finale il 50%: lo Squalo bianco Titano arriva a 9 m, sempre la metà di un megalodonte.
- **Crescita e forma finale:** dimensione standard fino al 30; dal 31 al 50 circa +2% di dimensione per livello, e servono esperienza più una barra di nutrimento (pesci mangiati). Al 50 le specie iconiche raggiungono la forma finale (stessa specie portata all'estremo, es. Squalo bianco Titano; il Megalodonte Primordiale resta il più grande).
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

## Roadmap

1. ✅ **Fondamenta (v0.1.0):** progetto, mondo, luce, sub, arpione, PWA offline, salvataggi, deploy.
2. ✅ **Bestie e combattimento (v0.2.0):** tipi, mosse, squadra, compagno, cavalcatura, domatura, santuari.
3. ✅ **Porto ed economia (v0.3.0):** mercato, mute, zaino, missioni, denti.
4. ✅ **Livelli e crescita (v0.4.0):** esperienza, sblocco mosse, crescita 31-50, forme finali, Lo Sfregiato come primo Guardiano.
5. ✅ **Storia del capitolo 1 (v0.5.0):** apertura, collare spezzato, lo Sfregiato è lo squalo di Aurelio, finale verso il Delta.
6. ✅ **Capitolo 2 (v0.6.0):** il Delta delle Mangrovie, i coccodrilli, la Vedova Nera e la megattera liberata.
7. **Capitolo 3 e seguenti:** una regione alla volta (prossimo: la Barriera Rossa).

## Decisioni aperte

- Nomi definitivi dei comandanti dei capitoli successivi (il primo è la Vedova Nera).
- Prezzi, curva di esperienza, valori di danno (primo passaggio in `data/`, da bilanciare giocando).
- Penalità alla morte: per ora nessuna (si rinasce al santuario o al porto); contro i Guardiani il proprietario ha scelto "solo rinascita".
- Guardiano della Fossa: Abissale o Tempesta (ora due Guardiani Abissali).
