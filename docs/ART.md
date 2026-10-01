# Illustrazioni delle card

Nel gioco le bestie sono sprite di profilo dipinti (sezione "Sprite di gioco"); le illustrazioni servono per card di squadra, bestiario e scheda della bestia. La descrizione di ogni bestia è il campo `artPrompt` in `data/species.ts` (e in `UNIQUE_VARIANTS` per Lo Sfregiato e La Regina bianca, in `SWARMS` di `data/world.ts` per i 4 sciami).

## Come generarle

1. Stesso strumento AI per tutte le bestie.
2. Prima lo squalo bianco col prompt completo sotto; se lo stile convince, usa quell'immagine come riferimento per tutte le altre.
3. Formato verticale (ChatGPT lo fa 2:3, va bene così), sfondo scuro e vuoto: la cornice la disegna il gioco. Nel gioco le immagini sono 640x960 in webp.
4. Salva i file come `public/art/<id>.webp` (es. `squalo_bianco.webp`, `squalo_bianco_albino.webp`).

## Prompt base

```
Dark fantasy creature card illustration, realistic digital painting, [CREATURE], full body in a dynamic three-quarter side view, swimming in the deep ocean, pitch-black water fading to deep teal, dramatic rim light from a single diver's lamp, drifting marine snow particles, [TYPE ACCENT], highly detailed skin texture and scars, ominous and majestic mood, centered composition with empty dark space around, no text, no border, no watermark, vertical 4:5
```

## Accento per tipo

| Tipo | [TYPE ACCENT] |
| --- | --- |
| Predatore | blood-red rim light |
| Abissale | cyan bioluminescent glow |
| Glaciale | pale icy-blue light and floating ice shards |
| Tempesta | violet and electric-yellow lightning arcs |
| Corazzato | bronze and amber highlights on armor plates |
| Leviatano | all five type colors together |

**Varianti:** albino → `albino, pale white skin, red eyes`; alfa → `alpha specimen, darker and larger, many scars, pale glowing eyes`; Guardiani e bestie della Compagnia → `wearing a rusted iron collar with broken chains`.

## Sprite di gioco (bestie in acqua)

Diversi dalle illustrazioni delle card: servono per animare la bestia nel gioco. Per ogni bestia:

1. **Profilo chiuso** → `public/sprites/<id>.webp`
2. **Profilo a bocca aperta** → `public/sprites/<id>_open.webp` (stessa posa, stessa dimensione)

Requisiti: vista laterale perfettamente piatta, rivolta a destra, corpo dritto e orizzontale, coda intera, sfondo trasparente (o nero pieno, che si scontorna). Nella stessa chat delle illustrazioni:

```
Same style and colors as the previous image. Now: the same [CREATURE] in a perfectly flat side profile view, facing right, body completely horizontal and straight, mouth closed, full body including the whole tail, no perspective, isolated on a transparent background, no text.
```

Poi: `Edit this image: same exact pose, size and position, but with the jaws wide open showing the teeth.`

## Nomi dei file

- Specie: `<id>` (es. `squalo_bianco`), bocca aperta `<id>_open`.
- Varianti: `<id>_albino`, `<id>_alfa` (+ `_open`).
- Forma finale: `<id>_finale` (+ `_open`).
- Forma finale di una variante: `<id>_<variante>_finale` (es. `squalo_bianco_albino_finale`). L'albino ha solo questa evoluzione, nessuna variante ulteriore.
- Varianti uniche dei Guardiani: il loro id (`sfregiato`, `regina_bianca`) (+ `_open`).
- Gli sprite sono tutti normalizzati sullo stesso riquadro 1000×460 px, muso a destra, linea del corpo a y=250: chiuso e aperto si scambiano senza scatti.
- Le differenze di dimensione (alfa più grande, Sfregiato, forma finale, crescita) non stanno nelle immagini: le applica il gioco con `lengthM` in `data/species.ts` e le regole `RENDER` e `FINAL_FORM_SIZE_MULT` in `data/rules.ts`.

## Stato dello squalo bianco

| Versione | Card (`public/art/`) | Sprite chiuso | Sprite aperto |
| --- | --- | --- | --- |
| Normale | fatto | fatto | fatto |
| Lo Sfregiato (Guardiano) | fatto | fatto | fatto |
| Forma finale (Titano) | fatto | fatto | fatto |
| Albino | fatto | fatto | fatto (pelle troppo liscia: da rifare) |
| Albino, forma finale (Mega albino) | fatto | fatto | fatto |
| Alfa | fatto | fatto | fatto (più chiaro della card: da rifare, opzionale) |

L'alfa non ha forma finale; l'albino ha solo la sua (Mega albino). Per le altre specie non è ancora deciso.

## Altre bestie già pronte (npm run art, 30 settembre 2026)

Card e sprite (chiuso + aperto) generati da `art-inbox/`: barracuda (card già presente), tartaruga marina, squalo martello, squalo tigre, megattera, orca, coccodrillo marino. Torpedine: card già presente + solo profilo chiuso (manca il profilo a bocca aperta).

## Come aggiungere immagini nuove

1. Salva le immagini in `art-inbox/` con i nomi `<id>_card.jpg`, `<id>_side.jpg`, `<id>_side_open.jpg` (se il profilo guarda a sinistra: `<id>_side_left.jpg`).
2. Chiedi a Claude Code di eseguire `npm run art` (i file già presenti non vengono toccati; con `--force` si rifanno).

Per polpo, calamari, Piovra, Kraken, granchio, lontra, foca e coccodrilli (zampe) servono pezzi separati: da definire quando si arriva a loro.

## Capitolo 3, la Barriera Rossa: immagini da generare (1 ottobre 2026)

Servono prima di iniziare il capitolo 3. Salva tutto in `art-inbox/`, poi chiedi `npm run art`.

**Bestie che nuotano** (come lo squalo: card + profilo chiuso + profilo a bocca aperta, fondo nero, muso a destra):

| Bestia | File |
| --- | --- |
| Murena (3 m) | `murena_card.jpg`, `murena_side.jpg`, `murena_side_open.jpg` |
| Manta (7 m) | `manta_card.jpg`, `manta_side.jpg`, `manta_side_open.jpg` (vista di lato, ali un po' abbassate) |
| Pesce palla (0,6 m) | `pesce_palla_card.jpg`, `pesce_palla_side.jpg`, `pesce_palla_side_open.jpg` (per lui "aperto" = gonfio, con gli aculei) |

**Re Corallo** (granchio-corallo gigante, 5 m, Guardiano, tipo Corazzato): cammina sul fondale e si anima a pezzi, quindi servono parti separate, tutte **di profilo, rivolte a destra, su fondo nero, stessa luce**:

| Pezzo | File | Come |
| --- | --- | --- |
| Card | `re_corallo_card.jpg` | come le altre card |
| Corpo | `re_corallo_body.jpg` | solo il carapace (guscio con coralli e incrostazioni), **senza zampe e senza chele** |
| Chela chiusa | `re_corallo_claw.jpg` | una sola chela grande, staccata, che punta a destra, chiusa |
| Chela aperta | `re_corallo_claw_open.jpg` | la stessa chela, stessa posizione, aperta |
| Zampa | `re_corallo_leg.jpg` | una sola zampa, staccata, dritta, verticale (il gioco la ripete e la muove) |

Prompt suggerito per i pezzi (dopo la card, nella stessa chat): `Same style and colors as the previous image. Now only the [PEZZO] of the same creature, isolated on a pure black background, flat side view facing right, no perspective, no other parts, no text.`

## Immagini per la battaglia a turni (1 ottobre 2026) — priorità

La battaglia usa immagini **a tre quarti**: davanti per la bestia selvatica, da dietro per la tua (come Pokémon). Finché mancano, il gioco usa la card sfumata (e specchiata per la tua). Salva in `art-inbox/`, poi `npm run art`: il fondo nero viene tolto e la bestia messa al centro di un quadrato 800×800.

| File | Cosa | Prompt (nella chat della card, per avere lo stesso stile) |
|---|---|---|
| `<id>_front.jpg` | Tre quarti davanti (il nemico) | `Same creature, same style and colors. Three-quarter front view, facing the viewer and slightly to the left, whole body including the tail, centered, isolated on a pure black background, no text.` |
| `<id>_front_open.jpg` | Lo stesso, fauci aperte | `Edit this image: same exact pose and position, jaws wide open showing the teeth.` |
| `<id>_back.jpg` | Tre quarti da dietro (la tua): schiena, pinna dorsale, muso girato verso il nemico | `Same creature, same style and colors. Three-quarter rear view from slightly above, swimming away from the viewer toward the upper right, back and dorsal fin visible, head slightly turned, whole body, isolated on a pure black background, no text.` |
| `<id>_back_open.jpg` | Lo stesso da dietro, fauci aperte | come sopra, `jaws wide open` |

Ordine: `squalo_bianco`, `barracuda`, `tartaruga_marina` (aperta = becco aperto), `torpedine`, `coccodrillo_marino`, `megattera`; poi `sfregiato`, `squalo_bianco_albino`, `squalo_bianco_alfa`, `coccodrillo_marino_leggendario`.

**Stato (1 ottobre 2026):** nel gioco ci sono già le viste davanti e da dietro di:
- barracuda;
- coccodrillo marino e coccodrillo leggendario;
- megattera e murena;
- orca, con matriarca, madre delle madri e preistorica albina;
- Re Corallo;
- squalo bianco, con albino, albino leggendario, alfa, Sfregiato e Titano;
- squalo martello, squalo tigre, tartaruga marina e torpedine.

Del pesce palla c'è solo la vista davanti. Mancano la manta (davanti e dietro), il pesce palla da dietro e tutte le versioni a fauci aperte (facoltative).

**Orientamento e scontorno li gestisce lo script.** Il nemico guarda a sinistra, la tua bestia va verso destra; se un'immagine guarda dall'altra parte, il file si chiama `<id>_front_flip.jpg` (o `_back_flip`) e viene specchiato. Lo scontorno:
- legge il colore del fondo dai bordi, quindi va bene anche il blu scuro degli screenshot;
- toglie una cornice sottile;
- non buca le bestie scure nelle zone d'ombra.

Due immagini con il fondo difficile hanno soglie proprie in `scripts/art.ts` (`BATTLE_CUTOUT_LOOSE`).

**Grandezza:** la applica il gioco, relativa tra le due bestie (`BATTLE_STAGE` in `data/battle.ts`): la più grande ha la misura standard, l'altra in proporzione; i giganti (leggendari, forme finali, Guardiani, specie colossali) sono sempre enormi.

## Sfondi a strati, conchiglia e icone della battaglia

I prompt pronti sono in `docs/PROMPT-BATTAGLIA.md`. Salva i file in `art-inbox/` con questi nomi, poi lancia `npm run art`:

| File | Diventa |
|---|---|
| `bg_<luogo>_far.jpg` (`baia`, `delta`, `tana`) | `public/bg/<luogo>_far.webp`: lo sfondo intero (acqua e rocce lontane) |
| `bg_<luogo>_mid.jpg`, `bg_<luogo>_front.jpg` | rocce a metà distanza e primo piano, senza il fondo verde |
| `bg_<luogo>_ground.jpg` | la pedana sotto ogni bestia, ritagliata |
| `conchiglia.jpg`, `conchiglia_aperta.jpg` | `public/items/`: la conchiglia di cattura, senza il fondo nero |
| `icona_<comando>.jpg`, `tipo_<tipo>.jpg` | `public/ui/`: icone bianche che il gioco colora |

Gemini di solito colora di verde solo l'acqua aperta: lo script se la cava lo stesso (dal primo piano tiene le rocce ai lati e quelle che pendono dall'alto, la pedana la ritaglia a ellisse). Un file che inizia con `_` (es. `_scarto_bg_baia_front_alternativo.jpg`) viene ignorato.

Un luogo senza i suoi dipinti usa quelli della Baia con la sua tinta. Finché uno strato manca anche lì, lo disegna il codice (`views/battle/backdropArt.ts`) con i colori del luogo (`BATTLE_PALETTES` in `data/battle.ts`); appena arriva quello dipinto, il gioco usa quello.

I ritratti per i dialoghi (`ritratto_aurelio.jpg`, `ritratto_vedova.jpg`, `ritratto_mercante.jpg`) non sono ancora collegati.
