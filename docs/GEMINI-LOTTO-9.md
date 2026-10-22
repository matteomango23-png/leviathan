# Immagini da Gemini, lotto 9: i panorami del mare (22 ottobre 2026)

Primo lotto della proposta del mare (`docs/PROPOSTA-MARE.md`, M1). Ogni regione deve riconoscersi in un secondo: un panorama dipinto dietro il mare mentre nuoti, lo sfondo delle battaglie e le pareti di roccia tipiche della regione.

## Regole per tutte
- **Una chat per regione.** Genera prima il panorama lontano, poi gli altri strati nella stessa chat, così lo stile resta uguale.
- **Salvale in `art-inbox/lotto9/`** con il nome indicato. Se è più comodo, salvale come vengono in una cartella sul desktop: le riconosco e le rinomino io.
- **Niente bestie, persone o scritte** nelle immagini: le bestie le mette il gioco.
- **Fondo verde pieno (#00FF00)** dove è indicato: lo scontorno viene pulito.
- Se un'immagine viene con bordi verdi sulle rocce, rifalla con `flat pure white background` e dimmelo.

## Le regioni e la loro descrizione
Al posto di `[REGIONE]` incolla la descrizione della regione.

| Regione | Nome nei file | `[REGIONE]` |
|---|---|---|
| Barriera esterna | `barriera` | `a vast outer coral reef, walls and natural arches of red, orange and pink coral, sea fans, white sand channels between the reef walls, warm turquoise water, strong sun rays from above` |
| Mare blu e il Ciglio | `mareblu` | `the edge of the continental shelf in the open ocean: a sandy plateau that suddenly ends in a cliff dropping into an endless deep blue void, huge columns of sunlight, clouds of plankton, nothing but blue in the distance` |
| Foresta di alghe | `foresta` | `a towering giant kelp forest like a cathedral, kelp stalks rising from rocky boulders all the way up to the surface, green-gold light falling in bands between the stalks, narrow rocky canyons` |
| Banchisa | `banchisa` | `under the polar ice shelf: a ceiling of blue-white ice above with breathing holes letting light through, ice caves and hanging ice pillars, cold dark blue water, a few old whale bones on the grey seabed` |
| Grandi fosse | `fosse` | `the rim of deep abyssal trenches: black basalt cliffs, volcanic black smokers with dark plumes and a faint orange glow, pale tube worms and white crabs around them, very little light, faint bioluminescent specks` |
| La Fossa, crepuscolo | `fossa1` | `inside a colossal vertical ocean trench, the last faint blue light from far above, steep walls of dark rock with ledges and hanging sponges, marine snow falling slowly` |
| La Fossa, mezzanotte | `fossa2` | `the pitch-black midnight zone of a colossal ocean trench, walls only visible by bioluminescence: glowing blue and green specks, translucent jellyfish lights, glowing fungus on the ledges` |
| La Fossa, il fondo | `fossa3` | `the very bottom of the deepest ocean trench: ancient colossal ruins half buried in grey ooze, gigantic bones of an unknown creature, a cold pale glow, absolute stillness, marine snow` |

---

## 1. Panorama del mare (dietro di te mentre nuoti)
Due immagini per regione. Il gioco le fa scorrere lentamente: una è lontana, l'altra più vicina. Il colore dell'acqua lo mette il gioco, quindi qui servono solo le forme.

- **Lontano** → `mare_[regione]_lontano.jpg`
  ```
  Realistic dark fantasy underwater painting, a very wide panoramic strip (as wide as possible, 3:1 or wider), [REGIONE]. Only the far distant silhouettes of the landscape along the bottom and sides, soft and hazy, low contrast. The top half empty. The left and right edges must match seamlessly so the strip can repeat side by side. Isolated on a flat pure green background (#00FF00), no creatures, no text.
  ```
- **Medio** → `mare_[regione]_medio.jpg`
  ```
  Same style, same place. Now the closer middle-distance shapes of the landscape along the bottom: rocks, formations and vegetation of this place, more detailed and a little darker, with gaps between them. The top two thirds empty. Left and right edges matching seamlessly. Isolated on a flat pure green background (#00FF00), no creatures, no text.
  ```

## 2. Sfondi delle battaglie (4 strati per regione)
Come quelli della baia e della barriera che hai già fatto (`docs/PROMPT-BATTAGLIA.md`), formato 16:9.

| File | Prompt |
|---|---|
| `bg_[regione]_far.jpg` | `Realistic dark fantasy underwater painting, wide 16:9 landscape, [REGIONE]. Only the distant background: water fading into darkness, faint silhouettes of far shapes, soft light from above where there is any, floating particles. Nothing in the foreground, the center and the lower half are open water and soft seabed far away. Cinematic, high detail, no creatures, no people, no text.` |
| `bg_[regione]_mid.jpg` | `Same style, same place and lighting. Now only the middle-distance scenery on the left and right sides and a low seabed line at the bottom, the center left empty. Isolated on a flat pure green background (#00FF00), no creatures, no text.` |
| `bg_[regione]_front.jpg` | `Same style, same place. Now only big dark foreground elements very close to the camera that frame the scene: in the bottom corners and hanging from the top edges, slightly out of focus, the whole center empty. Isolated on a flat pure green background (#00FF00), no creatures, no text.` |
| `bg_[regione]_ground.jpg` | `Same style, same place. Now only one flat oval patch of seabed of this place seen from a low three-quarter angle, like a natural stage, wider than deep. Isolated on a flat pure green background (#00FF00), no creatures, no text.` |

Per la Fossa bastano gli sfondi di battaglia di `fossa2` e `fossa3`.

## 3. Pareti di roccia della regione
Formato verticale (9:16), nella stessa chat della regione. Servono per le pareti lunghe dei Ciglio, delle fosse e delle Gallerie.

`Realistic dark fantasy underwater painting, a tall narrow vertical wall of [MATERIALE], seen from the side like a cliff in a 2D side-scrolling game, filling the whole height of the picture, about one third of the picture wide, with an irregular natural outline on both left and right edges. Lit softly from the upper left by a diver's lamp, the rest falling into darkness. Isolated on a flat pure green background (#00FF00), no water haze on the green, no creatures, no text.`

| File | `[MATERIALE]` |
|---|---|
| `parete_corallo_2.jpg` | `living reef coral, red and orange, with sea fans and anemones` |
| `parete_ciglio.jpg` | `pale sandstone cliff dropping into the deep, with sponges and small holes` |
| `parete_alghe.jpg` | `dark rock covered in brown and green kelp holdfasts and short seaweed` |
| `parete_basalto.jpg` | `black volcanic basalt columns with cracks glowing faintly orange and white bacterial mats` |
| `parete_fossa.jpg` | `ancient dark trench rock with ledges, glass sponges and faint blue bioluminescent specks` |

---

**Totale:**
- 16 panorami (2 per 8 regioni);
- 26 strati di battaglia (4 per 5 regioni, più i 6 di `fossa2` e `fossa3`);
- 5 pareti.

Puoi mandarmele un po' alla volta, anche una regione per volta: comincerei da **mareblu** e **fosse**, che oggi sono le più spoglie. Ogni regione che arriva entra nel gioco appena la monto; finché manca, resta il disegno del codice con i colori della regione.

**Ancora da fare, a parte:**
- il **Leviatano**: le immagini me le dai tu;
- il **sottomarino della Fossa**: lo crei tu, più avanti;
- il **Blocco 8**: rimandato finché non me lo dici.
