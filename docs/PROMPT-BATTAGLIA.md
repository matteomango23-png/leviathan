# Immagini per la schermata di battaglia

Salvale in `art-inbox/` con questi nomi esatti; poi ci penso io (`npm run art`).
Genera **prima lo sfondo lontano**, poi gli altri strati **nella stessa chat**, così lo stile resta uguale.
Formato orizzontale 16:9 (il più grande che Gemini permette).

## 1. Sfondi a strati (uno per luogo)

Luoghi, in quest'ordine: `baia` (Baia di Portofosco), `delta` (Delta delle Mangrovie), `tana` (la tana dello Sfregiato).
Al posto di `[LUOGO]` incolla la descrizione:

- **baia:** `a temperate rocky bay seabed, 20 m deep, kelp, boulders, sand, old broken stone arches`
- **delta:** `a murky mangrove delta, brown-green water, tangled mangrove roots coming down from above, mud and fallen logs`
- **tana:** `a dark underwater cave lair, walls covered in ancient whale bones and ribs, a faint shaft of light from a crack above`

| File | Cos'è | Prompt |
|---|---|---|
| `bg_[luogo]_far.jpg` | Fondo lontano (immagine intera) | `Realistic dark fantasy underwater painting, wide 16:9 landscape, [LUOGO]. Only the distant background: deep blue-teal water fading into darkness, faint silhouettes of far rocks, soft sun rays from the surface above, floating particles. Nothing in the foreground, the center and the lower half are open water and soft seabed far away. Cinematic, high detail, no creatures, no people, no text.` |
| `bg_[luogo]_mid.jpg` | Rocce a metà distanza | `Same style, same place and lighting. Now only the middle-distance scenery: rocks, ruins and vegetation on the left and right sides and a low seabed line at the bottom, the center left empty. Isolated on a flat pure green background (#00FF00), no water haze on the green, no creatures, no text.` |
| `bg_[luogo]_front.jpg` | Primo piano che incornicia | `Same style, same place. Now only big dark foreground elements very close to the camera that frame the scene: large rocks and plants in the bottom-left and bottom-right corners and some hanging from the top edges, slightly out of focus, the whole center empty. Isolated on a flat pure green background (#00FF00), no creatures, no text.` |
| `bg_[luogo]_ground.jpg` | Pedana dove sta la bestia | `Same style, same place. Now only one flat oval patch of seabed seen from a low three-quarter angle, like a natural stage: flat rock with sand, a few small shells and pebbles, wider than deep. Isolated on a flat pure green background (#00FF00), no creatures, no text.` |

Se il verde viene male (bordi verdi sulle rocce), rifalla con `flat pure white background` e dimmelo.

## 2. Conchiglia di cattura (la "Pokéball")

| File | Prompt |
|---|---|
| `conchiglia.jpg` | `Realistic dark fantasy game item: a magical capture seashell, closed, spiral nautilus-like shell with ancient bronze bands and glowing teal runes, size of a hand, three-quarter view, centered, isolated on a pure black background, no text.` |
| `conchiglia_aperta.jpg` | `Edit this image: the same shell, same position, now opening, a bright teal light pouring out of the opening.` |

## 3. Icone dei pulsanti e dei tipi

Tutte con lo stesso inizio, cambia solo l'oggetto: `Simple bold game icon, a single white silhouette of [OGGETTO], thick clean shapes, centered, flat, no shading, on a pure black background, no text.`

| File | `[OGGETTO]` |
|---|---|
| `icona_lotta.jpg` | `a shark jaw with sharp teeth` |
| `icona_squadra.jpg` | `three fins side by side` |
| `icona_zaino.jpg` | `a diver's bag with a buckle` |
| `icona_doma.jpg` | `a spiral seashell` |
| `icona_fuggi.jpg` | `a diver's fin with motion lines` |
| `tipo_predatore.jpg` | `a big tooth` |
| `tipo_abissale.jpg` | `an anglerfish lure glowing, a small orb on a curved stalk` |
| `tipo_glaciale.jpg` | `an ice crystal` |
| `tipo_tempesta.jpg` | `a lightning bolt inside a wave` |
| `tipo_corazzato.jpg` | `a turtle shell seen from above` |

Le icone le colora il gioco (bianco → colore del tipo). Finché mancano, uso le mie disegnate.
