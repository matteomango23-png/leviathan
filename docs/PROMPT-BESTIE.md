# Prompt delle bestie che mancano (tappa 11)

> **Dal 3 ottobre 2026:** nei prompt sostituisci `pure flat black background` (o `pure black background`) con `flat pure green background (#00FF00)`: lo scontorno viene più pulito.

**Già fatte (2 ottobre):** foca leopardo, beluga, narvalo, coccodrillo del Nilo, più 9 bestie nuove (tonno, delfino, pesce luna, scorfano, pesce napoleone, pesce spada, squalo volpe, tricheco, elefante marino).

Queste bestie esistono nei dati del gioco ma non hanno ancora immagini: finché manca il **profilo** non possono comparire nel mare (sarebbero invisibili). Salva le immagini dove vuoi: le riconosco e le sistemo io.

**Come lavorare in Gemini:** una chat per bestia. Nella stessa chat: prima la card, poi le 4 viste (A profilo, B profilo a bocca aperta, C davanti, D da dietro) con i **prompt comuni** di `docs/PROMPT-INIZIALI.md` (sezione "Prompt comuni"). Al posto di `[CREATURE]` incolla la descrizione qui sotto; per `[ACCENT]` va bene `cold blue-green bioluminescent highlights`.

**Priorità:** prima il **profilo (A e B)**, che serve per vederle nuotare; poi davanti e dietro (battaglia); la card per ultima. Vai nell'ordine della lista: le prime servono subito nelle zone nuove del mare aperto.

## Foresta di alghe

| # | Bestia | Lunghezza | [CREATURE] |
|---|---|---|---|
| 4 | **Anguilla elettrica gigante** (`anguilla_elettrica`) | 3 m | `a giant electric eel coiling through kelp, its body crackling with violet lightning` |
| 5 | **Polpo gigante** (`polpo_gigante`) | 6 m | `a giant red-brown octopus releasing a cloud of black ink, eyes glinting with cyan light` |
| 6 | **Lontra marina** (`lontra_marina`) | 1,4 m | `a sly sea otter with frost-tipped fur swimming through dark kelp, clutching a glowing pearl` |

## Fosse abissali

| # | Bestia | Lunghezza | [CREATURE] |
|---|---|---|---|
| 7 | **Squalo goblin** (`squalo_goblin`) | 5 m | `a pink goblin shark with its jaw violently extended forward and a long blade-like snout` |
| 8 | **Rana pescatrice** (`rana_pescatrice`) | 1,2 m | `a deep-sea anglerfish with a glowing lure hanging before a mouth of glass-like fangs` |
| 9 | **Calamaro gigante** (`calamaro_gigante`) | 13 m | `a giant squid with enormous eyes and long feeding tentacles with hooked suckers` |
| 10 | **Isopode gigante** (`isopode_gigante`) | 1,5 m | `a giant deep-sea isopod with overlapping pale armor plates, curling like a shield` |

## Giganti del mare profondo

| # | Bestia | Lunghezza | [CREATURE] |
|---|---|---|---|
| 11 | **Megalodonte** (`megalodonte`) | 18 m | `a gigantic megalodon dwarfing a tiny diver, ancient scars, jaws wide open with enormous teeth, red glowing eye` |
| 12 | **Mosasauro** (`mosasauro`) | 17 m | `a prehistoric mosasaur with crocodile-like jaws, armored scales and a shark-like tail` |
| 13 | **Calamaro colossale** (`calamaro_colossale`) | 20 m | `a nightmarish colossal squid with rotating hooks on its tentacles and one huge glowing eye, dragging broken iron chains` |
| 14 | **Serpente di mare** (`serpente_di_mare`) | 25 m | `a mythical sea serpent with a long coiling body and a crest of fins, inside an underwater storm` |
| 15 | **Dunkleosteus** (`dunkleosteus`) | 9 m | `a Dunkleosteus, a prehistoric armored fish with a bony plated head and blade-like jaw plates` |
| 16 | **Livyatan** (`livyatan`) | 17 m | `a Livyatan melvillei, a prehistoric raptorial sperm whale with huge interlocking teeth` |
| 17 | **Kraken** (`kraken`) | 40 m | `the legendary Kraken, a titanic cephalopod rising from an abyssal trench, tentacles around a sunken galleon` |

## Guardiani e altri

| # | Bestia | Lunghezza | [CREATURE] |
|---|---|---|---|
| 18 | **La Piovra** (`piovra`) | 15 m | `a monstrous ancient octopus with scarred tentacles wrapped around a shipwreck, rusted iron collar and broken chains` |
| 19 | **Re Corallo** (`re_corallo`) | 5 m | `a colossal ancient crab whose shell is a living red coral reef, one claw locked in a rusted iron collar` |
| 21 | **Leviatano** (`leviatano`) | 120 m | `the Leviathan, an ancient serpentine sea god larger than a temple, eyes like molten amber, scales shimmering red, cyan, icy blue, violet and bronze` |

Note: per **cefalopodi** (polpo, calamari, Piovra, Kraken) nel profilo chiedi `tentacles trailing straight behind the body`, così il gioco può animarli. Per il **Re Corallo** mancano solo profilo e card (fronte e retro ci sono già).

## La Piovra (capitolo 4) — la più urgente

Usa i prompt comuni di `docs/PROMPT-INIZIALI.md`, ma con il **fondo verde**.

`[CREATURE]` = `a monstrous ancient octopus 15 metres long, dark red-brown skin with old scars, a rusted iron collar of the Company around its mantle with broken chain links, pale suckers, tentacles trailing straight behind the body`

Per le viste di profilo, davanti e dietro, sostituisci `isolated on a pure flat black background` con `isolated on a flat pure green background (#00FF00)`.

Salva le immagini come `piovra_card`, `piovra_side`, `piovra_side_open` (i tentacoli che si aprono), `piovra_front`, `piovra_back`.
