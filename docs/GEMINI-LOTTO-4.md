# Immagini generate in Gemini, lotto 4: il cockpit a vapore (8 ottobre 2026)

Il cockpit dell'Expedition Hunter 1 e 2 deve sembrare **dipinto come i tuoi concept**, non disegnato col codice. Le scritte e i numeri però devono restare veri: cambiano mentre giochi (carburante, nodi, denti). Per questo non uso i concept interi, ma **pezzi separati senza scritte**, che il gioco monta come un puzzle e su cui scrive lui.

## Come si chiede
- **Una sola chat** per tutto il lotto, così lo stile resta uguale.
- Nel **primo messaggio allega i tuoi concept del cockpit** (quelli con la Plancia e il Diario) e scrivi:
  ```
  These are concept screens of a steampunk ship cockpit for my game. I need the separate ASSETS to rebuild it, one per image, in exactly this style: realistic painted rendering, dark iron plates with orange rust patches, rivets, brass and copper details, soft warm light from the top left. Every asset: perfectly frontal flat view (no perspective, no tilt), NO text, NO letters, NO numbers, NO logos, NO icons. Ready?
  ```
- Poi un messaggio per ogni pezzo qui sotto. Se un'immagine ha delle scritte, chiedi: `Same image without any text or numbers`.
- **Salvali in `art-inbox/`** con il nome indicato, in `.jpg`. Se è più comodo, salvali come vengono in una cartella sul desktop: li riconosco e li rinomino io.

## I pezzi

### 1. Muro di fondo → `cockpit_vapore_sfondo.jpg`
```
The background WALL of the cockpit only: rusted riveted iron wall panels, copper pipes running along the left edge and across the top with a couple of valve wheels and pressure joints, a few vent grilles at the far right edge. The large central area is plain darker riveted metal with nothing on it (panels and buttons will be placed on top). No dials, no screens, no buttons, no text. Wide 16:9 image.
```

### 2. Pannello grande → `cockpit_vapore_pannello.jpg`
```
One large empty rectangular PANEL plate: thick dark iron frame with rivets all around and reinforced corners, the inside is a flat plain darker rusty metal surface with NO details, NO objects and NO scratches in the middle (it will be stretched to different sizes). Isolated on a flat pure green background (#00FF00), no shadow outside the plate. Wide 16:9 image.
```

### 3. Card del diario → `cockpit_vapore_card.jpg`
```
One small rectangular CARD plate: rusted iron with four metal corner brackets and a rivet in each corner, the middle plain and flat with no details. Isolated on a flat pure green background (#00FF00), no shadow. Wide 3:2 image.
```

### 4. Placche dei pulsanti (tre immagini)
- `cockpit_vapore_targa.jpg` (normale):
  ```
  One horizontal BUTTON plate: rusted dark iron rectangle with rounded corners, a rivet in each corner, slightly raised, the middle plain and flat. Isolated on a flat pure green background (#00FF00). Wide 3:1 image.
  ```
- `cockpit_vapore_targa_ottone.jpg`, la stessa in **ottone lucido** (è il pulsante "Al timone" e la scheda accesa):
  ```
  The same button plate in polished warm BRASS, glowing slightly. Same shape and rivets. Flat pure green background (#00FF00). Wide 3:1 image.
  ```
- `cockpit_vapore_targa_rossa.jpg`, il razzo di soccorso:
  ```
  The same button plate as a raised glossy dark RED emergency button with a brass rim. Flat pure green background (#00FF00). Wide 3:1 image.
  ```

### 5. Schede a sinistra (due immagini)
- `cockpit_vapore_scheda.jpg`:
  ```
  One SQUARE tab plate: rusted iron, rounded corners, a rivet in each corner, the middle plain. Flat pure green background (#00FF00). Square image.
  ```
- `cockpit_vapore_scheda_ottone.jpg`:
  ```
  The same square tab plate in polished glowing BRASS. Flat pure green background (#00FF00). Square image.
  ```

### 6. Strumento rotondo → `cockpit_vapore_quadrante.jpg`
```
One round GAUGE without needle: thick polished brass bezel with small screws, an aged cream/ivory dial face with tick marks around a 270-degree arc and a small red zone at the start of the arc, NO numbers, NO letters, NO needle, an empty centre. Isolated on a flat pure green background (#00FF00). Square image.
```

### 7. Lancetta → `cockpit_vapore_lancetta.jpg`
```
One gauge NEEDLE alone: a thin dark red pointer with a small brass hub at its base, pointing straight UP, the hub exactly at the bottom centre of the picture. Flat pure green background (#00FF00). Tall 1:3 image.
```

### 8. Quadrante del meteo → `cockpit_vapore_meteo.jpg`
```
One round instrument with a thick COPPER ring and an aged cream face, completely empty in the middle (the weather icon will be placed there), two small engraved arrows on the ring. No text. Flat pure green background (#00FF00). Square image.
```

### 9. Cornice dello schermo → `cockpit_vapore_schermo.jpg`
```
One thick riveted iron FRAME around a screen: the screen inside is pure flat black (#000000) with no reflections and nothing drawn on it, the frame is heavy dark metal with rivets and a small brass plate at the bottom centre (blank). Flat pure green background (#00FF00) outside the frame. Wide 16:9 image.
```

### 10. Leva → `cockpit_vapore_leva.jpg`
```
One brass and iron LEVER in a vertical slot plate, the handle in the middle position. Flat pure green background (#00FF00). Tall 1:2 image.
```

### 11. Valvola → `cockpit_vapore_valvola.jpg`
```
One copper VALVE wheel with four spokes, seen from the front. Flat pure green background (#00FF00). Square image.
```

### 12. Drago inciso (facoltativo) → `cockpit_vapore_drago.jpg`
```
One engraved DRAGON relief ornament in dark iron and brass, like the ones on the concept panels, facing LEFT, curling tail. Flat pure green background (#00FF00). Wide 3:2 image.
```

## Cosa faccio io quando arrivano
- Le passo con `npm run art`:
  - tolgo il verde;
  - i pannelli e le placche si allungano senza deformare gli angoli, così vanno bene per ogni misura;
  - le lancette ruotano davvero sul numero.
- Il cockpit dell'EH1 e dell'EH2 viene montato con questi pezzi, le scritte restano vere e lo stile sarà quello dei concept.
- **Per le altre navi** basterà un lotto uguale con un'altra descrizione: ad esempio "marmo nero e oro romano" per l'Imperium, "bronzo antico e rune" per il Poseidon.
