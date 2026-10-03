// Leviatano — the battle moves, taken from Pokémon (owner, 3 ottobre 2026: "prendi la lista delle mosse e le loro
// statistiche, rinominale e inseriscile allo stesso modo"). Power, accuracy, PP, category, priority and side effects
// are the Pokémon ones (Gen IV–VII values); only the names are ours. Pokémon types go into our five:
//   Predatore  ← Normale, Buio, Lotta, Drago (bites, charges, claws)
//   Abissale   ← Veleno, Spettro, Psico, Buio speciale, Fuoco (the heat of the vents: it wounds, like a burn)
//   Glaciale   ← Ghiaccio, Acqua
//   Tempesta   ← Elettro, Volante
//   Corazzato  ← Roccia, Acciaio, Terra, the crab moves
// The comment after each move is the Pokémon move it copies. The moves of the open sea (riding) are in moves.ts.
import type { BattleMoveDef, MoveEffect, StageId, StatusId } from './moveBattle';
import type { MoveTypeId } from './rules';

const st = (status: StatusId, chance = 1): MoveEffect => ({ kind: 'status', status, chance });
const foe = (stat: StageId, by: number, chance = 1): MoveEffect => ({ kind: 'stage', stat, by, who: 'foe', chance });
const me = (stat: StageId, by: number, chance = 1): MoveEffect => ({ kind: 'stage', stat, by, who: 'self', chance });
const flinch = (chance: number): MoveEffect => ({ kind: 'flinch', chance });
const heal = (share = 0.5): MoveEffect => ({ kind: 'heal', share });
const drain = (share = 0.5): MoveEffect => ({ kind: 'drain', share });
const recoil = (share: number): MoveEffect => ({ kind: 'recoil', share });

type Extra = Partial<Pick<BattleMoveDef, 'priority' | 'hits' | 'highCrit'>>;
const F = 'fisico' as const;
const S = 'speciale' as const;
const X = 'stato' as const;
function m(
  id: string, name: string, type: MoveTypeId, category: BattleMoveDef['category'], power: number,
  accuracy: number | null, pp: number, text: string, effects: MoveEffect[] = [], extra: Extra = {},
): BattleMoveDef {
  return { id, name, type, category, power, accuracy, pp, priority: extra.priority ?? 0, effects, text, hits: extra.hits, highCrit: extra.highCrit };
}

export const BATTLE_MOVES: BattleMoveDef[] = [
  // ——— Predatore ———
  m('spinta', 'Spinta', 'predatore', F, 40, 100, 35, 'Si lancia contro il nemico.'), // Tackle
  m('graffio', 'Graffio di pinna', 'predatore', F, 40, 100, 35, 'Graffia con le pinne ruvide.'), // Scratch
  m('guizzo', 'Guizzo', 'predatore', F, 40, 100, 30, 'Uno scatto così rapido che colpisce per primo.', [], { priority: 1 }), // Quick Attack
  m('azzannata', 'Azzannata', 'predatore', F, 60, 100, 25, 'Morde con forza. Può far tentennare.', [flinch(0.3)]), // Bite
  m('stritolamorso', 'Stritolamorso', 'predatore', F, 80, 100, 15, 'Stringe le mascelle. Può abbassare la Difesa.', [foe('def', -1, 0.2)]), // Crunch
  m('zanna_lunga', 'Zanna lunga', 'predatore', F, 80, 90, 15, 'Affonda i denti più lunghi. Può far tentennare.', [flinch(0.1)]), // Hyper Fang
  m('capocciata', 'Capocciata', 'predatore', F, 70, 100, 15, 'Colpisce di testa. Può far tentennare.', [flinch(0.3)]), // Headbutt
  m('schiacciata', 'Schiacciata', 'predatore', F, 85, 100, 15, 'Gli piomba addosso con tutto il corpo. Può paralizzare.', [st('paralizzato', 0.3)]), // Body Slam
  m('testata_cieca', 'Testata cieca', 'predatore', F, 90, 85, 20, 'Una carica furiosa: si fa male anche lui.', [recoil(1 / 4)]), // Take Down
  m('carica_suicida', 'Carica suicida', 'predatore', F, 120, 100, 15, 'Tutto il suo peso in un colpo: si fa molto male anche lui.', [recoil(1 / 3)]), // Double-Edge
  m('fendente', 'Fendente', 'predatore', F, 70, 100, 20, 'Un taglio preciso: colpisce spesso nel punto debole.', [], { highCrit: true }), // Slash
  m('taglio_buio', 'Taglio nel buio', 'predatore', F, 70, 100, 15, 'Colpisce dall’ombra, spesso nel punto debole.', [], { highCrit: true }), // Night Slash
  m('morsi_raffica', 'Morsi a raffica', 'predatore', F, 15, 85, 20, 'Morde da 2 a 5 volte di fila.', [], { hits: [2, 5] }), // Fury Attack
  m('finta', 'Finta', 'predatore', F, 60, null, 20, 'Finge di andarsene e colpisce: non sbaglia mai.'), // Feint Attack
  m('agguato', 'Agguato', 'predatore', F, 70, 100, 5, 'Scatta per primo dal nascondiglio.', [], { priority: 1 }), // Sucker Punch
  m('zanna_lacerante', 'Zanna lacerante', 'predatore', F, 65, 95, 15, 'Strappa la carne: può ferire o far tentennare.', [st('ferito', 0.1), flinch(0.1)]), // Fire Fang
  m('artigliata', 'Artigliata lacerante', 'predatore', F, 75, 100, 15, 'Lacera con un colpo: può lasciare una ferita.', [st('ferito', 0.1)]), // Fire Punch
  m('sangue', 'Sangue nell’acqua', 'predatore', X, 0, 85, 15, 'Ferisce il nemico: perde vita e morde più piano.', [st('ferito')]), // Will-O-Wisp
  m('colpo_coda', 'Colpo di coda', 'predatore', F, 75, 100, 15, 'Una sferzata della coda possente.'), // Brick Break
  m('artiglio_antico', 'Artiglio antico', 'predatore', F, 80, 100, 15, 'Un colpo da predatore preistorico.'), // Dragon Claw
  m('carica_preistorica', 'Carica preistorica', 'predatore', F, 100, 75, 10, 'Una carica tremenda. Può far tentennare.', [flinch(0.2)]), // Dragon Rush
  m('assalto', 'Assalto totale', 'predatore', F, 120, 100, 5, 'Attacca senza difendersi: poi Difese più basse.', [me('def', -1), me('spd', -1)]), // Close Combat
  m('forza_bruta', 'Forza bruta', 'predatore', F, 120, 100, 5, 'Tutta la forza in un colpo: poi Attacco e Difesa più bassi.', [me('atk', -1), me('def', -1)]), // Superpower
  m('sguardo_feroce', 'Sguardo feroce', 'predatore', X, 0, 100, 30, 'Lo fissa: abbassa la Difesa.', [foe('def', -1)]), // Leer
  m('ringhio', 'Ringhio sordo', 'predatore', X, 0, 100, 40, 'Un ringhio che spaventa: abbassa l’Attacco.', [foe('atk', -1)]), // Growl
  m('muso_terrore', 'Muso di terrore', 'predatore', X, 0, 100, 10, 'Mostra i denti: abbassa molto la Velocità.', [foe('spe', -2)]), // Scary Face
  m('frenesia', 'Frenesia di sangue', 'predatore', X, 0, null, 20, 'Sente il sangue: alza molto l’Attacco.', [me('atk', 2)]), // Swords Dance
  m('danza_predatore', 'Danza del predatore', 'predatore', X, 0, null, 20, 'Gira intorno alla preda: alza Attacco e Velocità.', [me('atk', 1), me('spe', 1)]), // Dragon Dance
  // ——— Abissale ———
  m('aculeo', 'Aculeo velenoso', 'abissale', F, 15, 100, 35, 'Punge con un aculeo. Può avvelenare.', [st('avvelenato', 0.3)]), // Poison Sting
  m('bava_acida', 'Bava acida', 'abissale', S, 40, 100, 30, 'Sputa acido. Può abbassare la Difesa Speciale.', [foe('spd', -1, 0.1)]), // Acid
  m('nube_tossica', 'Nube tossica', 'abissale', S, 30, 70, 20, 'Una nube velenosa. Può avvelenare.', [st('avvelenato', 0.4)]), // Smog
  m('morso_velenoso', 'Morso velenoso', 'abissale', F, 50, 100, 15, 'Morde e inietta veleno: spesso avvelena.', [st('avvelenato', 0.5)]), // Poison Fang
  m('pungiglione', 'Pungiglione', 'abissale', F, 80, 100, 20, 'Trafigge con un pungiglione. Può avvelenare.', [st('avvelenato', 0.3)]), // Poison Jab
  m('bomba_melma', 'Bomba di melma', 'abissale', S, 90, 100, 10, 'Scaglia melma velenosa. Può avvelenare.', [st('avvelenato', 0.3)]), // Sludge Bomb
  m('fango_nero', 'Getto di fango nero', 'abissale', F, 120, 80, 5, 'Fango tossico dal fondo. Può avvelenare.', [st('avvelenato', 0.3)]), // Gunk Shot
  m('veleno_profondo', 'Veleno profondo', 'abissale', X, 0, 90, 10, 'Avvelena il nemico.', [st('avvelenato')]), // Toxic
  m('spore', 'Spore tossiche', 'abissale', X, 0, 75, 35, 'Una nuvola di spore: avvelena.', [st('avvelenato')]), // Poison Powder
  m('lambita', 'Lambita spettrale', 'abissale', F, 30, 100, 30, 'Un tocco gelido dall’abisso. Può paralizzare.', [st('paralizzato', 0.3)]), // Lick
  m('ombra_furtiva', 'Ombra furtiva', 'abissale', F, 40, 100, 30, 'Scivola nell’ombra e colpisce per primo.', [], { priority: 1 }), // Shadow Sneak
  m('artiglio_ombra', 'Artiglio d’ombra', 'abissale', F, 70, 100, 15, 'Un artiglio d’ombra: spesso nel punto debole.', [], { highCrit: true }), // Shadow Claw
  m('sfera_ombra', 'Sfera d’ombra', 'abissale', S, 80, 100, 15, 'Una sfera di buio. Può abbassare la Difesa Speciale.', [foe('spd', -1, 0.2)]), // Shadow Ball
  m('impulso_oscuro', 'Impulso oscuro', 'abissale', S, 80, 100, 15, 'Un’onda di buio. Può far tentennare.', [flinch(0.2)]), // Dark Pulse
  m('getto_inchiostro', 'Getto d’inchiostro', 'abissale', S, 65, 85, 10, 'Spruzza inchiostro. Può abbassare la Precisione.', [foe('acc', -1, 0.5)]), // Octazooka
  m('nube_inchiostro', 'Nube d’inchiostro', 'abissale', X, 0, 100, 20, 'Una nube nera: abbassa la Precisione.', [foe('acc', -1)]), // Smokescreen
  m('lampo', 'Lampo abissale', 'abissale', X, 0, 100, 20, 'Una luce accecante nel buio: abbassa la Precisione.', [foe('acc', -1)]), // Flash
  m('pulsazione', 'Pulsazione', 'abissale', S, 50, 100, 25, 'Un’onda della mente.'), // Confusion
  m('onda_mentale', 'Onda mentale', 'abissale', S, 90, 100, 10, 'Un’onda della mente fortissima. Può abbassare la Difesa Speciale.', [foe('spd', -1, 0.1)]), // Psychic
  m('ipnosi', 'Ipnosi abissale', 'abissale', X, 0, 60, 20, 'Luci che ondeggiano: fa addormentare.', [st('stordito')]), // Hypnosis
  m('bolla_bollente', 'Bolla bollente', 'abissale', S, 40, 100, 25, 'Acqua delle bocche calde. Può ferire.', [st('ferito', 0.1)]), // Ember
  m('getto_bollente', 'Getto bollente', 'abissale', S, 80, 100, 15, 'Un getto d’acqua bollente. Può ferire.', [st('ferito', 0.3)]), // Scald
  m('getto_idrotermale', 'Getto idrotermale', 'abissale', S, 90, 100, 15, 'Il calore del fondo. Può ferire.', [st('ferito', 0.1)]), // Flamethrower
  m('assorbimento', 'Assorbimento', 'abissale', S, 20, 100, 25, 'Ruba energia: recupera metà del danno.', [drain()]), // Absorb
  m('succhiavita', 'Succhiavita', 'abissale', S, 75, 100, 10, 'Succhia la forza: recupera metà del danno.', [drain()]), // Giga Drain
  m('sanguisuga', 'Sanguisuga', 'abissale', F, 80, 100, 10, 'Morde e beve: recupera metà del danno.', [drain()]), // Leech Life
  m('stretta', 'Stretta dei tentacoli', 'abissale', F, 10, 100, 35, 'Lo avvolge. Può abbassare la Velocità.', [foe('spe', -1, 0.1)]), // Constrict
  m('rigenerazione', 'Rigenerazione', 'abissale', X, 0, null, 10, 'Ricostruisce il corpo: recupera metà della vita.', [heal()]), // Recover
  m('mente_vuota', 'Mente vuota', 'abissale', X, 0, null, 20, 'Svuota la mente: alza molto la Difesa Speciale.', [me('spd', 2)]), // Amnesia
  m('calma', 'Calma degli abissi', 'abissale', X, 0, null, 20, 'Si concentra: alza Attacco e Difesa Speciali.', [me('spa', 1), me('spd', 1)]), // Calm Mind
  m('trama_oscura', 'Trama oscura', 'abissale', X, 0, null, 20, 'Trama nel buio: alza molto l’Attacco Speciale.', [me('spa', 2)]), // Nasty Plot
  // ——— Glaciale ———
  m('getto_acqua', 'Getto d’acqua', 'glaciale', S, 40, 100, 25, 'Spruzza acqua con forza.'), // Water Gun
  m('bollicine', 'Bollicine', 'glaciale', S, 40, 100, 30, 'Una scia di bolle. Può abbassare la Velocità.', [foe('spe', -1, 0.1)]), // Bubble
  m('raggio_bolle', 'Raggio di bolle', 'glaciale', S, 65, 100, 20, 'Un raggio di bolle. Può abbassare la Velocità.', [foe('spe', -1, 0.1)]), // Bubble Beam
  m('onda_marina', 'Onda d’urto marina', 'glaciale', S, 60, 100, 20, 'Un’onda d’acqua che stordisce.'), // Water Pulse
  m('maremoto', 'Maremoto', 'glaciale', S, 90, 100, 15, 'Un’onda enorme travolge il nemico.'), // Surf
  m('idrogetto', 'Idrogetto', 'glaciale', S, 110, 80, 5, 'Un getto d’acqua potentissimo.'), // Hydro Pump
  m('scatto_acqua', 'Scatto d’acqua', 'glaciale', F, 40, 100, 20, 'Fende l’acqua e colpisce per primo.', [], { priority: 1 }), // Aqua Jet
  m('risalita', 'Risalita', 'glaciale', F, 80, 100, 15, 'Risale come una cascata. Può far tentennare.', [flinch(0.2)]), // Waterfall
  m('codata', 'Codata', 'glaciale', F, 90, 90, 10, 'Una frustata della coda bagnata.'), // Aqua Tail
  m('scheggia', 'Scheggia di ghiaccio', 'glaciale', F, 40, 100, 30, 'Lancia una scheggia: colpisce per primo.', [], { priority: 1 }), // Ice Shard
  m('neve', 'Neve polverosa', 'glaciale', S, 40, 100, 25, 'Neve gelida. Può congelare.', [st('congelato', 0.1)]), // Powder Snow
  m('raggio_gelido', 'Raggio gelido', 'glaciale', S, 90, 100, 10, 'Un raggio di gelo. Può congelare.', [st('congelato', 0.1)]), // Ice Beam
  m('bufera', 'Bufera polare', 'glaciale', S, 110, 70, 5, 'Una bufera di ghiaccio. Può congelare.', [st('congelato', 0.1)]), // Blizzard
  m('zanna_gelo', 'Zanna di gelo', 'glaciale', F, 65, 95, 15, 'Un morso gelido: può congelare o far tentennare.', [st('congelato', 0.1), flinch(0.1)]), // Ice Fang
  m('aurora', 'Aurora', 'glaciale', S, 65, 100, 20, 'Una luce fredda. Può abbassare l’Attacco.', [foe('atk', -1, 0.1)]), // Aurora Beam
  m('vento_polare', 'Vento polare', 'glaciale', S, 55, 95, 15, 'Vento gelido: abbassa la Velocità.', [foe('spe', -1)]), // Icy Wind
  m('stalattite', 'Stalattite', 'glaciale', F, 85, 90, 10, 'Fa cadere ghiaccio. Può far tentennare.', [flinch(0.3)]), // Icicle Crash
  m('ghiaccioli', 'Ghiaccioli', 'glaciale', F, 25, 100, 30, 'Lancia da 2 a 5 ghiaccioli.', [], { hits: [2, 5] }), // Icicle Spear
  m('acqua_ferma', 'Acqua ferma', 'glaciale', X, 0, null, 30, 'Calma l’acqua: tutte le statistiche tornano normali.', [{ kind: 'haze' }]), // Haze
  m('letargo', 'Letargo', 'glaciale', X, 0, null, 10, 'Dorme due turni e torna in piena salute.', [{ kind: 'rest' }]), // Rest
  m('canto', 'Canto della balena', 'glaciale', X, 0, 55, 15, 'Un canto lento e profondo: fa addormentare.', [st('stordito')]), // Sing
  // ——— Tempesta ———
  m('scossa', 'Scossa', 'tempesta', S, 40, 100, 30, 'Una piccola scarica. Può paralizzare.', [st('paralizzato', 0.1)]), // Thunder Shock
  m('carica_elettrica', 'Carica elettrica', 'tempesta', F, 65, 100, 20, 'Lo tocca carico di corrente. Può paralizzare.', [st('paralizzato', 0.3)]), // Spark
  m('fulmine', 'Fulmine', 'tempesta', S, 90, 100, 15, 'Una scarica potente. Può paralizzare.', [st('paralizzato', 0.1)]), // Thunderbolt
  m('tuono', 'Tuono degli abissi', 'tempesta', S, 110, 70, 10, 'Un fulmine enorme. Può paralizzare.', [st('paralizzato', 0.3)]), // Thunder
  m('scarica', 'Scarica', 'tempesta', S, 80, 100, 15, 'Scarica tutta la corrente intorno. Può paralizzare.', [st('paralizzato', 0.3)]), // Discharge
  m('onda_paralizzante', 'Onda paralizzante', 'tempesta', X, 0, 90, 20, 'Un’onda elettrica: paralizza.', [st('paralizzato')]), // Thunder Wave
  m('raggio_carico', 'Raggio carico', 'tempesta', S, 50, 90, 10, 'Un raggio che lo carica: spesso alza l’Attacco Speciale.', [me('spa', 1, 0.7)]), // Charge Beam
  m('onda_urto', 'Onda d’urto', 'tempesta', S, 60, null, 20, 'Una scarica veloce: non sbaglia mai.'), // Shock Wave
  m('zanna_elettrica', 'Zanna elettrica', 'tempesta', F, 65, 95, 15, 'Un morso elettrico: può paralizzare o far tentennare.', [st('paralizzato', 0.1), flinch(0.1)]), // Thunder Fang
  m('carica_fulminea', 'Carica fulminea', 'tempesta', F, 120, 100, 15, 'Si getta avvolto dai fulmini: si fa male anche lui.', [recoil(1 / 3), st('paralizzato', 0.1)]), // Volt Tackle
  m('cannone_elettrico', 'Cannone elettrico', 'tempesta', S, 120, 50, 5, 'Un colpo difficile da prendere: se colpisce, paralizza.', [st('paralizzato')]), // Zap Cannon
  m('accumulo', 'Accumulo', 'tempesta', X, 0, null, 20, 'Accumula corrente: alza la Difesa Speciale.', [me('spd', 1)]), // Charge
  m('scatto_corrente', 'Scatto di corrente', 'tempesta', X, 0, null, 30, 'Si fa leggero: alza molto la Velocità.', [me('spe', 2)]), // Agility
  m('impulso_disturbante', 'Impulso disturbante', 'tempesta', X, 0, 100, 15, 'Un impulso elettrico: abbassa molto l’Attacco Speciale.', [foe('spa', -2)]), // Eerie Impulse
  m('raffica', 'Raffica', 'tempesta', S, 40, 100, 35, 'Solleva una corrente violenta.'), // Gust
  m('colpo_ala', 'Colpo d’ala', 'tempesta', F, 60, 100, 35, 'Colpisce con le pinne come ali.'), // Wing Attack
  m('picchiata', 'Picchiata', 'tempesta', F, 60, null, 20, 'Piomba dall’alto: non sbaglia mai.'), // Aerial Ace
  m('lama_vento', 'Lama di corrente', 'tempesta', S, 75, 95, 15, 'Una corrente tagliente. Può far tentennare.', [flinch(0.3)]), // Air Slash
  m('tuffo', 'Tuffo audace', 'tempesta', F, 120, 100, 15, 'Si tuffa a tutta velocità: si fa male anche lui.', [recoil(1 / 3)]), // Brave Bird
  m('uragano', 'Uragano', 'tempesta', S, 110, 70, 10, 'Una tempesta che travolge tutto.'), // Hurricane
  m('planata', 'Planata', 'tempesta', X, 0, null, 10, 'Si lascia portare dalla corrente: recupera metà della vita.', [heal()]), // Roost
  m('pinne_danzanti', 'Pinne danzanti', 'tempesta', X, 0, 100, 15, 'Una danza ipnotica: abbassa molto l’Attacco.', [foe('atk', -2)]), // Feather Dance
  m('saette', 'Saette rapide', 'tempesta', S, 60, null, 20, 'Piccole saette che non sbagliano mai.'), // Swift
  // ——— Corazzato ———
  m('ritirata', 'Ritirata nel guscio', 'corazzato', X, 0, null, 40, 'Si chiude nel guscio: alza la Difesa.', [me('def', 1)]), // Withdraw
  m('indurimento', 'Indurimento', 'corazzato', X, 0, null, 30, 'Indurisce il corpo: alza la Difesa.', [me('def', 1)]), // Harden
  m('corazza_ferro', 'Corazza di ferro', 'corazzato', X, 0, null, 15, 'Una corazza durissima: alza molto la Difesa.', [me('def', 2)]), // Iron Defense
  m('levigatura', 'Levigatura', 'corazzato', X, 0, null, 20, 'Leviga il guscio: alza molto la Velocità.', [me('spe', 2)]), // Rock Polish
  m('guscio_spezzato', 'Guscio spezzato', 'corazzato', X, 0, null, 15, 'Rompe il guscio: alza molto Attacchi e Velocità, abbassa le Difese.', [me('atk', 2), me('spa', 2), me('spe', 2), me('def', -1), me('spd', -1)]), // Shell Smash
  m('siesta', 'Siesta sul fondo', 'corazzato', X, 0, null, 10, 'Si posa sul fondo: recupera metà della vita.', [heal()]), // Slack Off
  m('sabbia', 'Sabbia negli occhi', 'corazzato', X, 0, 100, 15, 'Solleva sabbia: abbassa la Precisione.', [foe('acc', -1)]), // Sand Attack
  m('sassi', 'Lancio di sassi', 'corazzato', F, 50, 90, 15, 'Scaglia sassi dal fondo.'), // Rock Throw
  m('tomba_sassi', 'Tomba di sassi', 'corazzato', F, 60, 95, 15, 'Lo blocca con i massi: abbassa la Velocità.', [foe('spe', -1)]), // Rock Tomb
  m('frana', 'Frana', 'corazzato', F, 75, 90, 10, 'Fa franare le rocce. Può far tentennare.', [flinch(0.3)]), // Rock Slide
  m('lama_pietra', 'Lama di pietra', 'corazzato', F, 100, 80, 5, 'Spuntoni di pietra: spesso nel punto debole.', [], { highCrit: true }), // Stone Edge
  m('potere_antico', 'Potere antico', 'corazzato', S, 60, 100, 5, 'Una forza antica. A volte alza tutte le statistiche.', [{ kind: 'boostAll', chance: 0.1 }]), // Ancient Power
  m('gemma_corallo', 'Gemma di corallo', 'corazzato', S, 80, 100, 20, 'Una luce di corallo tagliente.'), // Power Gem
  m('testata_roccia', 'Testata di roccia', 'corazzato', F, 150, 80, 5, 'Una testata devastante: si fa molto male anche lui.', [recoil(1 / 2)]), // Head Smash
  m('pinza', 'Pinza', 'corazzato', F, 55, 100, 30, 'Lo afferra con una chela.'), // Vice Grip
  m('chela_acciaio', 'Chela d’acciaio', 'corazzato', F, 50, 95, 35, 'Una chela dura come metallo. Può alzare l’Attacco.', [me('atk', 1, 0.1)]), // Metal Claw
  m('martello_chela', 'Martello di chela', 'corazzato', F, 100, 90, 10, 'Una martellata di chela: spesso nel punto debole.', [], { highCrit: true }), // Crabhammer
  m('coda_acciaio', 'Coda d’acciaio', 'corazzato', F, 100, 75, 15, 'Una coda durissima. Può abbassare la Difesa.', [foe('def', -1, 0.3)]), // Iron Tail
  m('testata_acciaio', 'Testata d’acciaio', 'corazzato', F, 80, 100, 15, 'Una testata corazzata. Può far tentennare.', [flinch(0.3)]), // Iron Head
  m('lampo_acciaio', 'Lampo d’acciaio', 'corazzato', S, 80, 100, 10, 'Un lampo dal guscio. Può abbassare la Difesa Speciale.', [foe('spd', -1, 0.1)]), // Flash Cannon
  m('aculei', 'Aculei', 'corazzato', F, 20, 100, 15, 'Spara da 2 a 5 aculei.', [], { hits: [2, 5] }), // Spike Cannon
  m('schizzo_fango', 'Schizzo di fango', 'corazzato', S, 20, 100, 10, 'Fango negli occhi: abbassa la Precisione.', [foe('acc', -1)]), // Mud-Slap
  m('colpo_fango', 'Colpo di fango', 'corazzato', S, 55, 95, 15, 'Una palla di fango: abbassa la Velocità.', [foe('spe', -1)]), // Mud Shot
  m('smottamento', 'Smottamento', 'corazzato', F, 60, 100, 20, 'Scuote il fondo: abbassa la Velocità.', [foe('spe', -1)]), // Bulldoze
  m('scossa_fondale', 'Scossa del fondale', 'corazzato', F, 100, 100, 10, 'Il fondo del mare trema.'), // Earthquake
  m('eruzione', 'Eruzione del fondo', 'corazzato', S, 90, 100, 10, 'Il fondo esplode. Può abbassare la Difesa Speciale.', [foe('spd', -1, 0.1)]), // Earth Power
  // ——— Variabile (il Leviatano: prende il tipo che batte il nemico) ———
  m('ira_leviatano', 'Ira del Leviatano', 'variabile', S, 100, 100, 10, 'Diventa ciò che il nemico teme di più.'), // Judgment
  m('abisso_primordiale', 'Abisso primordiale', 'variabile', F, 150, 90, 5, 'Il mare intero si chiude sul nemico.'), // Giga Impact (no recharge)
];

export const BATTLE_MOVE_BY_ID: Record<string, BattleMoveDef> = Object.fromEntries(BATTLE_MOVES.map((x) => [x.id, x]));
