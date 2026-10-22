# Proposta: ruoli delle bestie, tipi, compagni (lotto AD, 21 ottobre 2026)

Da leggere e correggere prima di scrivere codice. Nasce dalle note del 21 ottobre:
- scegliere una cavalcatura deve avere senso (velocità, resistenza, quante sardine mangia, attaccare per primi, leggendari che fanno paura);
- deve essere chiaro cosa batte cosa, con una logica senza eccezioni;
- i compagni che non si cavalcano oggi in acqua non servono a nulla.

## Cosa c'è oggi
- **75 bestie:**
  - 20 **cavalcature**;
  - 37 **compagni** (combattono);
  - 18 **supporti** (dovevano avere "un potere in mare ciascuno", deciso l'8 ottobre, mai fatto).
- **Poteri in mare:** l'unico che funziona davvero è "sfonda le ossa antiche" (squalo bianco e simili). Gli altri sono nomi nei dati senza effetto.
- **In acqua un compagno** ti segue e mangia i pesci. Basta.
- **I tipi** sono 5 e la tabella è già equilibrata: ognuno batte 2 tipi e perde con 2 (moltiplicatore ×2 e ×0,5). Il problema è che nel gioco non si vede, e alcune spiegazioni sono deboli.

---

## 1. Le cavalcature: perché sceglierne una invece di un'altra

### Quattro numeri, visibili sulla scheda
Ogni cavalcatura ha **quattro valori da 1 a 5**, calcolati dai dati (lunghezza, velocità reale, tipo), senza tabelle a mano:

| Valore | Cosa vuol dire | Da dove viene |
|---|---|---|
| **Velocità** | quanto va veloce e quanto è forte il suo scatto | velocità reale (`RIDE_KMH`) |
| **Resistenza** | quanti scatti regge prima di sfinirsi (lotto AC) | grandezza e velocità |
| **Boccone** | quante sardine mangia in un colpo (e quanti denti ti fa guadagnare) | grandezza della bocca: lunghezza; i filtratori (squalo balena, squalo elefante, megattera, manta) il doppio |
| **Profondità** | quanto in giù ti porta senza che la pressione ti faccia male | tipo e grandezza (gli abissali più giù di tutti) |

Esempi (indicativi):
- **squalo mako:** velocità 5, resistenza 1, boccone 2, profondità 2;
- **squalo balena:** velocità 1, resistenza 5, boccone 5, profondità 3;
- **capodoglio:** velocità 3, resistenza 4, boccone 4, profondità 5.

### Un talento in mare per tipo (tutte le cavalcature di quel tipo)
| Tipo | Talento in groppa |
|---|---|
| **Predatore** (squali, coccodrillo, megalodonte) | **Assalto:** se tocchi una bestia selvatica con lo scatto, la battaglia comincia con il **tuo attacco gratis** (attacchi per primo). |
| **Corazzato** (tartarughe, squalo balena, mosasauro, Archelon) | **Ariete:** sfonda ossa antiche e rocce fragili; i colpi delle bestie selvatiche in mare ti fanno meno male. |
| **Tempesta** (Folgore, manta, squalo martello) | **Scarica:** lo scatto stordisce le bestie piccole intorno, che scappano. Virate più strette. |
| **Glaciale** (orca, megattera, narvalo, squalo elefante) | **Rompighiaccio:** spacca il ghiaccio della banchisa. Aria dei cetacei (c'è già): resti sotto più a lungo. |
| **Abissale** (capodoglio, plesiosauro) | **Occhi del buio:** la luce intorno a te si allarga molto: vedi più lontano in profondità. |

### Superpredatori: la paura (risposta del proprietario, 21 ottobre)
- **Chi fa paura:** un **superpredatore**, leggendario o no (le cavalcature Predatore di rarità 3 o più: squalo bianco, Zannarossa, megalodonte, Livyatan… e l'orca), quando ha **almeno 30 livelli in più** della bestia selvatica.
- **In acqua:** la bestia selvatica gli sta lontana; non ti viene incontro.
- **In battaglia:** la bestia selvatica cerca di **fuggire**, **una o al massimo due volte**. Se ci riesce la battaglia finisce, ma non la catturi.
- **Paralizzata dalla paura per un turno:** solo se la tua cavalcatura è un **predatore leggendario** con **almeno 10 livelli in più**.

### Sulla scheda
- Le quattro barre e il talento si vedono sulla scheda della bestia e nel cantiere della squadra.
- Così la scelta è chiara: "il mako è un fulmine ma si stanca subito, lo squalo balena è lento ma ti riempie la sacca".

---

## 2. I tipi: chi batte chi, sempre con la stessa logica

### Cosa vuol dire ogni tipo (la regola per decidere il tipo di una bestia)
- **Predatore:** cacciatori a denti e velocità (squali, coccodrilli, barracuda, tonni).
- **Corazzato:** guscio, scaglie dure o mole enorme e lenta (tartarughe, pesci palla, squalo balena, mosasauro).
- **Tempesta:** elettricità e velocità fulminea (torpedini, anguille, manta, pesci vela, squalo martello che "sente" le scariche).
- **Glaciale:** mari freddi, mammiferi con grasso (foche, trichechi, orche, balene, narvalo).
- **Abissale:** corpi molli, veleni, luce propria, profondità (polpi, calamari, murene, rane pescatrici, capodoglio).

### La ruota (già nei dati, non cambia)
Ogni tipo batte quello **subito dopo** di lui nella ruota e quello **tre posti dopo** (cioè due posti prima): ognuno batte 2 tipi e perde con 2.

Predatore → Abissale → Glaciale → Tempesta → Corazzato → Predatore

| Attacca | è superefficace (×2) su | perché, in una frase |
|---|---|---|
| **Predatore** | Abissale, Tempesta | i denti strappano i corpi molli; un cacciatore non teme chi vive di scariche |
| **Abissale** | Glaciale, Corazzato | il calore degli abissi scioglie il ghiaccio; la pressione schiaccia i gusci |
| **Glaciale** | Tempesta, Predatore | il gelo spegne le scariche e intorpidisce i cacciatori a sangue freddo |
| **Tempesta** | Corazzato, Abissale | la scarica passa attraverso il guscio e illumina il buio |
| **Corazzato** | Predatore, Glaciale | i denti si spezzano sul guscio; il guscio frantuma il ghiaccio |

Al contrario, chi è battuto fa metà danno (×0,5). Contro lo stesso tipo o contro i due "neutri" il danno è normale.

### Renderlo chiaro nel gioco
1. **In battaglia:**
   - sui pulsanti delle mosse una scritta "**Superefficace**" (verde) o "**Poco efficace**" (rossa) contro il nemico di adesso;
   - dopo il colpo, il messaggio "È superefficace!" come nei Pokémon.
2. **Nella scheda:** sotto il tipo, "**Forte contro:** … / **Debole contro:** …" con le icone.
3. **Nel bestiario:** una pagina "**Tipi**" con la ruota disegnata (cinque icone in cerchio, frecce) e le frasi qui sopra.

### Tre bestie controllate con la regola
- **Delfino:** diventa **Glaciale** (deciso il 21 ottobre: mammifero come foche, orche e balene).
- **Squalo balena** oggi è Corazzato: va bene (mole enorme e lenta).
- **Pesce leone** oggi è Abissale: va bene (veleno).

---

## 3. I compagni e i supporti in acqua (le 55 bestie che non si cavalcano)

### Il branco (risposta del proprietario, 21 ottobre)
- In mare: **una cavalcatura più al massimo due compagni** che ti nuotano accanto.
- **Cacciano per te** sardine e pesci, ma **solo quelli che vedi sullo schermo**: non partono a destra e a sinistra come un drone. Quello che prendono va nella sacca.
- **Il branco tiene lontani i piccoli:** le bestie piccole e i piccoli predatori (in base al livello, rispetto al branco) **cambiano strada**. Non scappano di colpo: girano al largo.

### Un potere per tipo, solo con quello che esiste davvero in mare
In acqua non si combatte: le bestie selvatiche che ti toccano ti portano in battaglia, la pressione ti fa male se scendi troppo, il buio limita quello che vedi. I poteri lavorano su queste cose:

| Tipo del compagno | Potere in mare | Cosa cambia per te |
|---|---|---|
| **Predatore** | **Caccia** | prende più pesci e più in fretta (gli altri tipi ne prendono meno) |
| **Corazzato** | **Guscio** | la **pressione** ti fa meno male: puoi scendere un po' più giù del limite della tua muta |
| **Tempesta** | **Scarica** | i piccoli predatori stanno ancora più lontani e non ti portano in battaglia per sorpresa |
| **Glaciale** | **Eco** | le bestie nascoste nel buio vicino a te compaiono sul radar, anche senza nave |
| **Abissale** | **Lanterna** | la luce intorno a te si allarga: vedi più lontano in profondità |

**Deve essere chiaro.** Sulla scheda di ogni compagno ci saranno il potere con un'icona e una frase ("Guscio: con lui la pressione ti fa meno male"). In mare, accanto al compagno, compare la sua icona quando il potere lavora.

### Poteri speciali di alcune specie (in più)
- **Polpo gigante:** apre i forzieri chiusi senza chiave.
- **Lontra marina:** raccoglie da sola gli oggetti e le conchiglie vicine.
- **Beluga:** eco più lunga (il doppio del radar).
- **Squalo martello** (anche da cavalcatura): rivela i passaggi nascosti; il potere "rivelaNascosto" è già nei dati.
- **Pesce luna, foca, tricheco:** "stazione d'ossigeno", cioè ti ricaricano un po' d'aria quando stai fermo vicino a loro (già nei dati come `staz_ossigeno`).

### Crescita
Il potere si rinforza con il livello del compagno (raggio, quantità), così vale la pena far crescere anche le bestie che non si cavalcano.

## 4. Ordine di lavoro proposto (lotti piccoli)
1. **AD-1 Tipi chiari:** scritte superefficace e poco efficace sulle mosse, "Forte contro / Debole contro" nella scheda, pagina della ruota. Nessuna regola cambia.
2. **AD-2 Cavalcature:** le quattro barre sulla scheda, il boccone, la profondità per cavalcatura, i talenti per tipo, l'iniziativa dei superpredatori, il terrore dei leggendari.
3. **AD-3 Il branco in acqua:** cavalcatura e due compagni insieme, la caccia dei pesci in vista, i piccoli che girano al largo, i cinque poteri per tipo spiegati sulla scheda.
4. **AD-4 Poteri speciali:** polpo, lontra, beluga, squalo martello, ossigeno. ✅ v0.99.0 (squalo martello: forzieri sepolti; lontra: più denti e portata più lunga).

Ogni lotto con il suo piano e i suoi test, come sempre.
