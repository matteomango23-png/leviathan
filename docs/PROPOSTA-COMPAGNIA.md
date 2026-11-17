# Proposta: la Compagnia, nemici in mare e battaglie navali

**Stato:** in discussione con il proprietario. Bozza del 17 novembre 2026, scritta dopo il brainstorming. Niente codice finché non è approvata.

Sostituisce l'ipotesi del "Blocco 10" in `docs/BACKLOG.md` (storia nuova e villain) e la sviluppa.

## Perché

Il proprietario: il gioco "funziona abbastanza bene, ma dopo un po' non è entusiasmante, manca qualcosa di figo". Domare ed esplorare sono considerati finiti.

Ora servono:
- **nemici in acqua;**
- **una storia;**
- **battaglie tra navi in tempo reale;**
- **un motivo per andare in profondità** con i mezzi migliori. Oggi il sottomarino abissale non serve a molto.

## La storia in breve

**La Compagnia** è una flotta di cacciatori di bestie, con il tono di corsari e pirati dark fantasy, non di militari puliti. Per decenni ha ucciso balene, squali e grandi bestie per farne olio da motore. Le ha cacciate così tanto che molte si sono estinte.

**La de-estinzione.** Nei loro laboratori le hanno ricreate:
- i giganti scomparsi: megalodonte, Livyatan, mosasauro, dunkleosteus, plesiosauro, che sono già nel gioco;
- le specie decimate.

Le hanno modificate perché crescessero di più e dessero più olio. Generazione dopo generazione, la modifica è diventata ereditaria.

**Perché le bestie si evolvono.** Le forme finali, più grandi, preistoriche e con le rune, sono il risultato di quegli esperimenti, rimasto nel sangue. Resta coerente con lo stile delle evoluzioni: è sempre lo stesso animale, più grande e antico, mai una specie che diventa un'altra.

**La ribellione.** Molte bestie modificate sono fuggite e oggi vivono libere: sono quelle che peschiamo e domiamo. Altre sono ancora in gabbia, nelle navi e nelle basi della Compagnia.

**Il giocatore** affonda le navi, distrugge le basi e libera le bestie. Il finale è nell'Abisso: la base più profonda della Compagnia e il Leviatano, il loro esperimento più grande.

## Dove si trovano (bilanciamento per chi inizia)

Il problema: chi comincia ha l'Aurelia. Il primo U-Boot (Whale) costa 7.500 denti, l'Imperium 15.000. Il mare non può essere pieno di nemici fin da subito.

**Proposta: la Compagnia cresce con la distanza dalla costa**, come le bestie.

| Zona | Da dove | Cosa c'è |
|---|---|---|
| Costa e Barriera esterna | 0-6 km | **Nessuna nave nemica che attacca.** Solo un peschereccio della Compagnia, una volta, con una bestia nella rete: la liberi con le tue bestie. Presenta la storia senza rischi. |
| Mare blu | 6-12 km | **Baleniere:** piccole, con arpioni e reti contro le bestie, un cannoncino debole contro di te. Si affondano con l'arma base o con bestie medie. |
| Foresta e Banchisa | 12-18 km | **Navi da caccia** con cariche di profondità che scendono fino a una certa quota. Sotto quella quota sei al sicuro. |
| Grandi fosse | 18-26 km | **U-Boot della Compagnia** sotto i 60-80 m, con siluri e sonar. Basi nascoste nei cunicoli e nelle Gallerie. |
| Abisso del Leviatano | 26-30 km | La base principale, i laboratori, il finale. Ci arriva solo il sottomarino abissale. |

- Quando si arriva al Mare blu di solito si è già comprato l'EH1 o il Whale.
- Le zone sono quelle che il gioco ha già: si regolano lì, senza nuove mappe.
- **Il primo U-Boot diventa una svolta:** in superficie ti vedono, sott'acqua ti nascondi. Le baleniere non sanno cercarti sotto.

## Nascondersi: la modalità silenzio

Si riusa il pulsante del motore acceso e spento: diventa **Silenzio**.

**In silenzio:**
- le luci della nave si spengono e lo scafo si scurisce, come mimetizzato;
- il faro si spegne;
- si va solo piano, circa un terzo della velocità: per esempio su motori elettrici;
- i nemici non ti sentono, se vai piano.

**Cosa fa salire la barra di allerta dei nemici:**
- la distanza;
- le luci accese;
- il rumore, che cresce con la velocità;
- il giorno o la notte;
- la profondità;
- il riparo: alghe, grotte, banchisa.

**Fasi del nemico:**
1. **Tranquillo.**
2. **Sospetto:** si gira e cerca.
3. **Caccia:** ti insegue e spara.
4. **Ti perde:** dopo un po' che non ti vede.

Lo schermo avvisa sempre quando sale l'allerta, così ti puoi nascondere in tempo.

## Combattimento in tempo reale

### Le tue armi
Il proprietario: "quasi tutte le navi dovrebbero essere armate, più potenti e meno potenti". Proposta:
- **ogni nave madre ha un'arma**, anche l'Aurelia, che ha un cannoncino-arpione a prua, debole ma sufficiente per le baleniere;
- **navi di superficie:** cannone, e più avanti le cariche di profondità contro gli U-Boot nemici;
- **U-Boot:** siluri, puntati e lanciati dal timone, con la scia visibile;
- **migliori armi sulle navi più care;** potenziamenti al cantiere da decidere;
- **sottomarini, motoscafi e moto d'acqua mai armati.**

### Le armi dei nemici
- **Arpioni e reti:** contro le tue bestie. Non le catturano, ma le feriscono e le rallentano.
- **Cannone:** contro lo scafo.
- **Cariche di profondità:** cadono e scoppiano a una quota. Le vedi scendere e le schivi.
- **Siluri:** dagli U-Boot. Sono lenti e si vedono arrivare.

### Le bestie contro le navi
- La tua bestia attacca la nave che indichi, come si fa già col branco.
- **Una bestia può spaccare lo scafo solo se è grande rispetto alla nave.** Il confronto è tra la sua lunghezza (`lengthM`, già nei dati) e quella della nave:
  - **molto più piccola:** solo sabotaggi (blocca l'elica, strappa una rete, apre una gabbia);
  - **simile:** danni allo scafo;
  - **molto più grande** (un megalodonte contro una baleniera): **spezza la nave in due** con un colpo.
- **La nave che affonda si spezza a metà**, la nostra come quelle nemiche. Si fa nel codice tagliando l'immagine che c'è già lungo una linea frastagliata. Le due metà si inclinano e affondano, con bolle, rottami, olio nero e la scia di fumo. **Non servono immagini nuove.**

### Se ti affondano
Il proprietario: ti uccidono, perdi denti, la nave si può distruggere, ma da calibrare per non "uccidere il gioco". Proposta:
- **perdi una parte dei denti**, come oggi quando muori;
- **la nave non si perde mai:** il rimorchiatore, che c'è già, la riporta al porto spezzata, e la ripari pagando;
- prima di affondare c'è sempre una via di fuga: avvisi, scafo che cala, e immersione o silenzio per sparire.

### I sub nemici e i domatori
Due tipi di nemici a nuoto:
- **sub della Compagnia:** a nuoto, armati di fucile. Si combattono in tempo reale col fucile ad arpione, come oggi con le bestie;
- **domatori della Compagnia:** in groppa a bestie modificate, con una squadra. **Battaglia a turni**, come gli allenatori dei Pokémon. Se vinci, liberi le loro bestie: una diventa tua, oppure la ritrovi in mare.

## Le immagini (Gemini)

**Le navi che abbiamo non si rifanno.** Le armi sono piccole immagini separate (torrette, tubi lanciasiluri) montate su punti dello scafo, come i fari e i getti. Esplosioni, scie dei siluri, rottami e spezzatura sono nel codice.

Immagini nuove, quando la prova è approvata:
- 3 navi della Compagnia: peschereccio-baleniera, nave da caccia, ammiraglia;
- 1-2 U-Boot della Compagnia;
- il sub nemico;
- 2-3 domatori, con illustrazione per la battaglia;
- gabbie e pezzi delle basi: piattaforma, laboratorio sommerso;
- le armi: cannoncino, cannone, tubo lanciasiluri, carica di profondità, siluro;
- più avanti: le bestie modificate della Compagnia, con cicatrici, placche e catene.

Una volta approvata la prova, preparo i prompt in un lotto (`docs/GEMINI-LOTTO-10.md`).

## Come lo costruiamo, a tappe

1. **Arena di prova** (separata dal gioco, come la Galleria):
   - scegli la tua nave, una bestia e un nemico;
   - si provano nascondino, Silenzio, armi, bestie contro navi e spezzatura;
   - immagini segnaposto: le nostre navi scurite al posto di quelle nemiche;
   - si decide qui se è divertente.
2. **Immagini** con Gemini.
3. **Nel mare vero:** pattuglie per zona, il primo peschereccio, armi al cantiere.
4. **Domatori e battaglie a turni** contro le loro squadre.
5. **Basi nei cunicoli e nell'Abisso**, storia e finale col Leviatano.

## Decisioni del proprietario (17 novembre 2026)

- Nome: Compagnia dell'Olio Nero. Zone: i km della tabella. Silenzio a un terzo della velocità. Se ti affondano perdi i denti come quando muori, e rimettere a posto la nave è la parte punitiva.

## Da decidere (risposto)

- Il nome: "Compagnia" basta, oppure un nome proprio? Era già stata usata "Compagnia dell'Olio Nero".
- Le zone della tabella: vanno bene i chilometri?
- Silenzio: un terzo della velocità va bene?
- Quanti denti si perdono se ti affondano, e quanto costa la riparazione.
