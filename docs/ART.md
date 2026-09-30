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
