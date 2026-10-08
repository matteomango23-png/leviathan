# Blocco 4a — lavoro a metà (8 ottobre 2026), ramo `blocco-4a-flotta`

Il piano approvato è in PROGRESS/BACKLOG (blocco 4) e nella tabella delle navi di `src/data/fleet.ts`.

**Fatto (compila, test NON ancora aggiornati):**
- `src/data/fleet.ts`: le 8 navi (Aurelia ed EH1 `ready`), `TRADE_IN_SHARE`.
- `systems/ship/model.ts` (shipModel, shipLength, shipTopSpeed, shipTank, shipRates, sonarRange, sonarMaxKnots); geometria, nave, telecamera (vista più larga per navi lunghe), vista della nave, sonar e cockpit leggono il modello.
- `systems/ship/shipyard.ts`: `buyShip` (permuta, carburante, sottomarino nuovo nella stiva).
- Sottomarini: Batiscafo + Squalo d'acciaio (EH1); tolta la vendita dei sottomarini e dei potenziamenti.
- Salvataggio v18 con rimborsi (`migrateTo18`); carburante a 1 dente al litro.
- Immagini copiate in `art-inbox/` (nave_eh1, nave_eh1_aperta, sottomarino_eh1 girate a destra; card di tutte le navi e dei mezzi); script art esteso ai nuovi nomi.

**Da fare:**
1. `npm run art` (genera public/world/nave_eh1*.webp, sottomarino_eh1, public/art/nave_*.webp ecc.).
2. UI concessionario `ui/shipyard.ts`: scheda "Navi" a Porto Fango con card (immagine nave + sottomarino, statistiche, "In cantiere", Compra con prezzo meno permuta).
3. Cockpit: mostrare solo le schede `shipModel(ship).cockpit`.
4. Strumento di prova: "+2000 denti" → "+5000 denti" (`ui/testPanel.ts`).
5. Aggiornare i test (fuel, ship, submarine: SHIP.maxSpeed/length/fuel, SUB_MODELS.price) e aggiungerne per fleet, buyShip, v18.
6. Controllare nel browser: misure del disegno EH1 (`picture` in fleet.ts) e lunghezza 47 m.
7. Documenti (CHANGELOG v0.49.0, DECISIONS, ARCHITECTURE, PROGRESS), PR, etichetta.
