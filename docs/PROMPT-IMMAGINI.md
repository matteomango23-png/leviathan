# Prompt per le immagini (Gemini)

Per ogni bestia servono tre immagini: la **card** (illustrazione verticale), il **profilo** a bocca chiusa e il **profilo a bocca aperta**. Salvale nella cartella `art-inbox/` del progetto con i nomi indicati sotto: Claude Code le scontorna, le allinea e le mette al posto giusto da solo (`npm run art`).

## Come si fa, per ogni bestia

1. **Card.** Nuova chat di Gemini. Allega la card dello squalo bianco (la prima, quella con il sub e la lampada in alto a destra) e incolla il prompt della bestia che trovi nella lista. Salva come `<id>_card.jpg`.
2. **Profilo.** Nella stessa chat allega due immagini: prima il profilo dello squalo bianco a bocca chiusa (serve solo per l'inquadratura), poi la card appena fatta. Incolla il prompt generico del profilo. Salva come `<id>_side.jpg`.
3. **Bocca aperta.** Allega il profilo appena fatto e incolla il prompt generico della bocca aperta. Salva come `<id>_side_open.jpg`.

Se una bestia esce con proporzioni strane nel profilo, ripeti il passo 2: conta più che sia coerente con la card che perfetta.

## Prompt generico del profilo

```
I am giving you two images. Image 1 is a flat side-profile of a shark: use it ONLY for framing (perfectly flat side view facing right, body straight and horizontal, the whole body and tail visible and filling a wide 3:1 landscape frame, pure black background). Image 2 is the creature I want. Draw the creature from image 2 in the framing of image 1, keeping the photorealistic detail, colors and markings of image 2. If it has legs, flippers or tentacles, keep them tucked close along the body. Mouth closed, no perspective, no text, pure black background.
```

## Prompt generico della bocca aperta

```
Edit this image. Keep the exact same creature, same pose, same size, same position and the same pure black background. Only change: the jaws are wide open, showing the teeth and the dark red inside of the mouth. No text.
```

Per polpo, calamari, Piovra, Kraken e isopode la bocca aperta non serve: bastano card e profilo.

## Ordine consigliato

Prima le cavalcature, che servono per giocare: orca, capodoglio, megalodonte, squalo martello, manta, megattera, narvalo, coccodrillo marino, mosasauro. Poi compagni e supporti, regione per regione. Lo squalo bianco è già completo.

## Lista delle bestie

Già fatti e da saltare: squalo bianco (tutte le versioni), card di barracuda e torpedine.

### Baia di Portofosco

**Barracuda** (Predatore): `barracuda_card.jpg`, `barracuda_side.jpg`, `barracuda_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a lean silver barracuda with a jutting lower jaw full of needle teeth and a cold yellow eye, full body in a dynamic three-quarter view, blood-red rim light, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Tartaruga marina** (Corazzato): `tartaruga_marina_card.jpg`, `tartaruga_marina_side.jpg`, `tartaruga_marina_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: an ancient loggerhead sea turtle with a barnacle-crusted shell like a stone shield and wise heavy eyes, full body in a dynamic three-quarter view, bronze and amber highlights on armor plates, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Torpedine** (Tempesta): `torpedine_card.jpg`, `torpedine_side.jpg`, `torpedine_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a round dark torpedo ray with electric veins crackling across its disc, full body in a dynamic three-quarter view, violet and electric-yellow lightning arcs, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Delta delle Mangrovie

**Coccodrillo del Nilo** (Corazzato): `coccodrillo_nilo_card.jpg`, `coccodrillo_nilo_side.jpg`, `coccodrillo_nilo_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a Nile crocodile with olive-bronze armored scales lurking half-submerged among mangrove roots, cold eyes glinting just above the waterline, full body in a dynamic three-quarter view, bronze and amber highlights on armor plates, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Coccodrillo marino** (Predatore): `coccodrillo_marino_card.jpg`, `coccodrillo_marino_side.jpg`, `coccodrillo_marino_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a colossal saltwater crocodile with a ridged armored back and jagged interlocking teeth, gliding through murky mangrove water, full body in a dynamic three-quarter view, blood-red rim light, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Barriera Rossa

**Pesce palla** (Corazzato): `pesce_palla_card.jpg`, `pesce_palla_side.jpg`, `pesce_palla_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a spiny pufferfish inflated into a thorny sphere with armored skin plates, full body in a dynamic three-quarter view, bronze and amber highlights on armor plates, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Murena** (Abissale): `murena_card.jpg`, `murena_side.jpg`, `murena_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a green-black moray eel emerging from a coral crevice, gaping mouth with backward teeth, pale glowing spots, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Squalo martello** (Tempesta): `squalo_martello_card.jpg`, `squalo_martello_side.jpg`, `squalo_martello_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a great hammerhead shark with a wide hammer-shaped head, electric sparks tracing its sensory pores, full body in a dynamic three-quarter view, violet and electric-yellow lightning arcs, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Manta** (Tempesta): `manta_card.jpg`, `manta_side.jpg`, `manta_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a giant oceanic manta ray gliding on enormous wings, lightning flowing along its wing tips, full body in a dynamic three-quarter view, violet and electric-yellow lightning arcs, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Megattera** (Glaciale): `megattera_card.jpg`, `megattera_side.jpg`, `megattera_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a colossal humpback whale with long white pectoral fins and a knobby head, singing, icy bubbles, full body in a dynamic three-quarter view, pale icy-blue light and floating ice shards, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Re Corallo** (Corazzato): `re_corallo_card.jpg`, `re_corallo_side.jpg`, `re_corallo_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a colossal ancient crab whose shell is a living red coral reef, one claw locked in a rusted iron collar, full body in a dynamic three-quarter view, bronze and amber highlights on armor plates, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Foresta Sommersa

**Lontra marina** (Glaciale): `lontra_marina_card.jpg`, `lontra_marina_side.jpg`, `lontra_marina_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a sly sea otter with frost-tipped fur swimming through dark kelp, clutching a glowing pearl, full body in a dynamic three-quarter view, pale icy-blue light and floating ice shards, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Anguilla elettrica gigante** (Tempesta): `anguilla_elettrica_card.jpg`, `anguilla_elettrica_side.jpg`, `anguilla_elettrica_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a giant electric eel coiling through kelp, its body crackling with violet lightning, full body in a dynamic three-quarter view, violet and electric-yellow lightning arcs, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Squalo tigre** (Predatore): `squalo_tigre_card.jpg`, `squalo_tigre_side.jpg`, `squalo_tigre_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a heavy tiger shark with dark stripes and stained jaws, fish bones drifting around it, full body in a dynamic three-quarter view, blood-red rim light, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Polpo gigante** (Abissale): `polpo_gigante_card.jpg`, `polpo_gigante_side.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a giant red-brown octopus releasing a cloud of black ink, eyes glinting with cyan light, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**La Piovra** (Abissale): `piovra_card.jpg`, `piovra_side.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a monstrous ancient octopus with scarred tentacles wrapped around a shipwreck, rusted iron collar and broken chains, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Mare di Ghiaccio

**Foca leopardo** (Glaciale): `foca_leopardo_card.jpg`, `foca_leopardo_side.jpg`, `foca_leopardo_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a spotted leopard seal with a reptilian head and a wide grin of teeth, lunging through icy water, full body in a dynamic three-quarter view, pale icy-blue light and floating ice shards, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Beluga** (Glaciale): `beluga_card.jpg`, `beluga_side.jpg`, `beluga_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a pale beluga whale with a rounded forehead emitting visible sonar ripples, full body in a dynamic three-quarter view, pale icy-blue light and floating ice shards, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Narvalo** (Glaciale): `narvalo_card.jpg`, `narvalo_side.jpg`, `narvalo_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a narwhal with a long spiral tusk like a lance, frost crystals along the tusk, full body in a dynamic three-quarter view, pale icy-blue light and floating ice shards, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Orca** (Glaciale): `orca_card.jpg`, `orca_side.jpg`, `orca_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a powerful orca with sharp black and white markings and a tall dorsal fin, bursting through ice, full body in a dynamic three-quarter view, pale icy-blue light and floating ice shards, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Fossa del Capodoglio

**Rana pescatrice** (Abissale): `rana_pescatrice_card.jpg`, `rana_pescatrice_side.jpg`, `rana_pescatrice_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a deep-sea anglerfish with a glowing lure hanging before a mouth of glass-like fangs, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Squalo goblin** (Predatore): `squalo_goblin_card.jpg`, `squalo_goblin_side.jpg`, `squalo_goblin_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a pink goblin shark with its jaw violently extended forward and a long blade-like snout, full body in a dynamic three-quarter view, blood-red rim light, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Calamaro gigante** (Abissale): `calamaro_gigante_card.jpg`, `calamaro_gigante_side.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a giant squid with enormous eyes and long feeding tentacles with hooked suckers, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Capodoglio** (Abissale): `capodoglio_card.jpg`, `capodoglio_side.jpg`, `capodoglio_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a colossal sperm whale with a massive square head covered in circular sucker scars, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Calamaro colossale** (Abissale): `calamaro_colossale_card.jpg`, `calamaro_colossale_side.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a nightmarish colossal squid with rotating hooks on its tentacles and one huge glowing eye, dragging broken iron chains, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Abisso del Tempio

**Isopode gigante** (Corazzato): `isopode_gigante_card.jpg`, `isopode_gigante_side.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a giant deep-sea isopod with overlapping pale armor plates, curling like a shield, full body in a dynamic three-quarter view, bronze and amber highlights on armor plates, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Serpente di mare** (Tempesta): `serpente_di_mare_card.jpg`, `serpente_di_mare_side.jpg`, `serpente_di_mare_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a mythical sea serpent with a long coiling body and a crest of fins, inside an underwater storm, full body in a dynamic three-quarter view, violet and electric-yellow lightning arcs, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Mosasauro** (Corazzato): `mosasauro_card.jpg`, `mosasauro_side.jpg`, `mosasauro_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a prehistoric mosasaur with crocodile-like jaws, armored scales and a shark-like tail, full body in a dynamic three-quarter view, bronze and amber highlights on armor plates, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Megalodonte** (Predatore): `megalodonte_card.jpg`, `megalodonte_side.jpg`, `megalodonte_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a gigantic megalodon dwarfing a tiny diver, ancient scars, jaws wide open with enormous teeth, red glowing eye, full body in a dynamic three-quarter view, blood-red rim light, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Fossa Nera

**Kraken** (Abissale): `kraken_card.jpg`, `kraken_side.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: the legendary Kraken, a titanic cephalopod rising from an abyssal trench, tentacles around a sunken galleon, full body in a dynamic three-quarter view, cyan bioluminescent glow, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Dunkleosteus** (Corazzato): `dunkleosteus_card.jpg`, `dunkleosteus_side.jpg`, `dunkleosteus_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a Dunkleosteus, a prehistoric armored fish with a bony plated head and blade-like jaw plates, full body in a dynamic three-quarter view, bronze and amber highlights on armor plates, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Livyatan** (Predatore): `livyatan_card.jpg`, `livyatan_side.jpg`, `livyatan_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a Livyatan melvillei, a prehistoric raptorial sperm whale with huge interlocking teeth, full body in a dynamic three-quarter view, blood-red rim light, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Leviatano** (Tutti i tipi): `leviatano_card.jpg`, `leviatano_side.jpg`, `leviatano_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: the Leviathan, an ancient serpentine sea god larger than a temple, eyes like molten amber, scales shimmering red, cyan, icy blue, violet and bronze, full body in a dynamic three-quarter view, glowing accents in blood red, cyan, icy blue, violet and bronze, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Varianti uniche dei Guardiani

**La Regina bianca** (Glaciale): `regina_bianca_card.jpg`, `regina_bianca_side.jpg`, `regina_bianca_side_open.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a pure white orca queen with pale glowing eyes and a crown of frost on her head, full body in a dynamic three-quarter view, pale icy-blue light and floating ice shards, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

### Sciami (solo card)

**Sciame di sardine**: `sciame_sardine_card.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a dense silver school of sardines swirling into a protective sphere around a small diver, full body in a dynamic three-quarter view, soft light from the diver's lamp, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Sciame di meduse spettrali**: `sciame_meduse_card.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a drifting swarm of ghostly translucent violet jellyfish with long glowing tentacles, full body in a dynamic three-quarter view, soft light from the diver's lamp, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Sciame di pesci lanterna**: `sciame_lanterne_card.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a glittering cloud of small bioluminescent lanternfish lighting up the abyss, full body in a dynamic three-quarter view, soft light from the diver's lamp, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

**Sciame di krill**: `sciame_krill_card.jpg`

```
Using the attached image ONLY as a style reference (same lighting, colors, dark deep-ocean water, marine snow, the small diver with a lamp at the top right, same composition and framing), create a new dark fantasy creature card illustration: a vast pink-orange cloud of krill glowing faintly in icy dark water, full body in a dynamic three-quarter view, soft light from the diver's lamp, realistic digital painting, highly detailed skin texture, ominous and majestic mood. Vertical 2:3 format, no text, no border.
```

## Varianti e forme finali (più avanti)

Albino, alfa e forme finali si fanno dopo, modificando le immagini della versione comune come per lo squalo (i prompt di modifica sono in `docs/ART.md`). Nomi: `<id>_albino_card.jpg`, `<id>_alfa_side.jpg`, `<id>_finale_side_open.jpg` e così via.