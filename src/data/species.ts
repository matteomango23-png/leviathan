// Leviatano — all tameable beasts. Every creature in the game is collectible.
import { TypeId, PROGRESSION, VARIANT_RULES } from './rules';
import { RegionId } from './world';

export type Role = 'cavalcatura' | 'compagno' | 'supporto';
export type SizeClass = 'piccola' | 'media' | 'grande' | 'colossale';
export type Stars = 1 | 2 | 3 | 4 | 5;

/** Exploration abilities that open paths (checked by world systems). */
export type Ability = 'sfondaOssa' | 'spezzaGhiaccio' | 'vinceCorrenti' | 'staz_ossigeno' | 'rivelaNascosto' | 'apreGhiaccioSottile';

export interface SpeciesDef {
  id: string;
  name: string;                // Italian UI name
  type: TypeId | 'variabile';  // Leviatano changes type each phase
  role: Role;
  region: RegionId;
  wildLevel: [number, number];
  rarity: Stars;
  size: SizeClass;
  lengthM: number;             // standard adult length in metres (diver = 2 m): sprites are scaled from this at runtime
  trait: string;               // one-line description for the card
  abilities?: Ability[];
  guardian?: boolean;          // chapter boss; tameable after being defeated
  iconic?: boolean;            // reaches a final form at level 50
  finalFormName?: string;
  albinoFinalFormName?: string; // the albino variant has its own final form (only where defined); the alpha has none
  legendary?: boolean;
  tameableAfterStory?: boolean;
  artPrompt: string;           // [CREATURE] part of the illustration prompt (see docs/ART.md)
  // ---- starters and evolutions (owner's decision of 1 ottobre 2026, docs/PROMPT-INIZIALI.md)
  starter?: boolean;           // offered by Aurelio at the start (one of three; unique: only one in the game)
  evolvesTo?: string;          // the next stage of the line…
  evolveLevel?: number;        // …reached at this level, like Pokémon
  movesFrom?: string;          // the line keeps the moves of its first stage
  artFrom?: string;            // pictures to use until its own exist (a form key with pictures, e.g. squalo_bianco_finale)
  minLevel?: number;           // wild ones are never below this level (over the size + rarity floor, WILD_LEVELS)
  rideSpeedMult?: number;      // not a mount but you can ride it anyway, at this × its riding speed (second stages)
  girth?: number;              // the side picture drawn this much thicker (a thin serpent made massive)
  alfaName?: string;           // the alfa has its own name (and pictures, alfaArt): the orca's is the Matriarch
  alfaArt?: string;
}

export const SPECIES: SpeciesDef[] = [
  // ---- Baia di Portofosco (1-5)
  { id: 'barracuda', name: 'Barracuda', type: 'predatore', role: 'compagno', region: 'baia', wildLevel: [1, 3], rarity: 1, size: 'piccola', lengthM: 1.8, trait: 'Morsi rapidi, caccia in coppia',
    artPrompt: 'a lean silver barracuda with a jutting lower jaw full of needle teeth and a cold yellow eye' },
  { id: 'tartaruga_marina', name: 'Tartaruga marina', type: 'corazzato', role: 'supporto', region: 'baia', wildLevel: [2, 4], rarity: 2, size: 'media', lengthM: 2, trait: 'Scudo che assorbe un colpo',
    artPrompt: 'an ancient loggerhead sea turtle with a barnacle-crusted shell like a stone shield and wise heavy eyes' },
  { id: 'torpedine', name: 'Torpedine', type: 'tempesta', role: 'compagno', region: 'baia', wildLevel: [3, 5], rarity: 2, size: 'piccola', lengthM: 1.5, trait: 'Scarica che stordisce i vicini',
    artPrompt: 'a round dark torpedo ray with electric veins crackling across its disc' },
  { id: 'squalo_bianco', name: 'Squalo bianco', type: 'predatore', role: 'cavalcatura', region: 'baia', wildLevel: [4, 6], rarity: 3, size: 'grande', lengthM: 6, minLevel: 15, trait: 'Carica che sfonda le ossa antiche',
    abilities: ['sfondaOssa'], iconic: true, finalFormName: 'Squalo bianco Titano', albinoFinalFormName: 'Squalo bianco Mega albino',
    artPrompt: 'a massive scarred great white shark with jaws half open showing rows of serrated teeth and a black lifeless eye' },

  // ---- The three starters (unique, never met in the wild while you have one): 3 stages each, evolving at Lv 16 and 36.
// All three fight as 'compagno' (Guscio was 'supporto' and did half of Zanna's damage: owner, 3 ottobre 2026).
  { id: 'zanna', name: 'Zanna', type: 'predatore', role: 'compagno', region: 'baia', wildLevel: [5, 5], rarity: 4, size: 'piccola', lengthM: 1.5, trait: 'Cucciolo di squalo preistorico: morde più forte di quanto sembri',
    starter: true, evolvesTo: 'squarcio', evolveLevel: 16, artFrom: 'squalo_bianco',
    artPrompt: 'a young prehistoric shark pup, about 1.5 metres long, slender and agile, oversized jagged teeth for its size, dark grey back with faint red scars, curious fierce eyes' },
  { id: 'squarcio', name: 'Squarcio', type: 'predatore', role: 'compagno', region: 'baia', wildLevel: [16, 16], rarity: 4, size: 'grande', lengthM: 4, rideSpeedMult: 0.75, trait: 'Giovane squalo preistorico dalle zanne enormi',
    evolvesTo: 'zannarossa', evolveLevel: 36, movesFrom: 'zanna', artFrom: 'squalo_bianco',
    artPrompt: 'a juvenile prehistoric predator shark, 4 metres long, muscular, huge serrated teeth jutting out of the jaw, battle scars, dark grey and blood-red marks along the gills' },
  { id: 'zannarossa', name: 'Zannarossa', type: 'predatore', role: 'cavalcatura', region: 'baia', wildLevel: [36, 36], rarity: 5, size: 'colossale', lengthM: 15, trait: 'Squalo preistorico colossale, una leggenda viva',
    abilities: ['sfondaOssa'], movesFrom: 'zanna', artFrom: 'squalo_bianco_finale', legendary: true,
    artPrompt: 'a colossal prehistoric shark, 12 metres long, a living legend, massive armoured head, rows of enormous serrated teeth, ancient scars, deep red markings like war paint, terrifying and majestic' },
  { id: 'guscio', name: 'Guscio', type: 'corazzato', role: 'compagno', region: 'baia', wildLevel: [5, 5], rarity: 4, size: 'piccola', lengthM: 1, trait: 'Tartarughina antica dal guscio di pietra',
    starter: true, evolvesTo: 'rocciaguscio', evolveLevel: 16, artFrom: 'tartaruga_marina',
    artPrompt: 'a small ancient sea turtle hatchling, about 1 metre long, its shell made of dark stone plates with bronze veins, big wise eyes, stubby strong flippers' },
  { id: 'rocciaguscio', name: 'Rocciaguscio', type: 'corazzato', role: 'compagno', region: 'baia', wildLevel: [16, 16], rarity: 4, size: 'media', lengthM: 3, rideSpeedMult: 0.75, trait: 'Tartaruga corazzata coperta di spuntoni',
    evolvesTo: 'archelon', evolveLevel: 36, movesFrom: 'guscio', artFrom: 'tartaruga_marina',
    artPrompt: 'a young armoured prehistoric sea turtle, 3 metres long, its stone shell covered in sharp bronze spikes and barnacles, a hooked beak, heavy and stubborn' },
  { id: 'archelon', name: 'Archelon', type: 'corazzato', role: 'cavalcatura', region: 'baia', wildLevel: [36, 36], rarity: 5, size: 'colossale', lengthM: 8, trait: 'Tartaruga titanica preistorica, una fortezza viva',
    movesFrom: 'guscio', artFrom: 'tartaruga_marina', legendary: true,
    artPrompt: 'a titanic prehistoric sea turtle (Archelon), 6 metres long, an ancient living fortress, a shell like a cliff of stone and bronze with spikes and coral growing on it, a massive hooked beak, slow and unstoppable' },
  { id: 'scintilla', name: 'Scintilla', type: 'tempesta', role: 'compagno', region: 'baia', wildLevel: [5, 5], rarity: 4, size: 'piccola', lengthM: 1, trait: 'Anguillina che crepita di scintille',
    starter: true, evolvesTo: 'saetta', evolveLevel: 16, artFrom: 'torpedine',
    artPrompt: 'a small glowing eel, about 1 metre long, translucent dark-violet skin with tiny crackling sparks along its body, big luminous eyes, playful' },
  { id: 'saetta', name: 'Saetta', type: 'tempesta', role: 'compagno', region: 'baia', wildLevel: [16, 16], rarity: 4, size: 'media', lengthM: 5, rideSpeedMult: 0.75, trait: 'Anguilla elettrica dalle pinne fulminanti',
    evolvesTo: 'folgore', evolveLevel: 36, movesFrom: 'scintilla', artFrom: 'torpedine',
    artPrompt: 'a long electric sea eel, 5 metres long, dark violet body with glowing yellow stripes, lightning crackling along its fins, sharp needle teeth' },
  { id: 'folgore', name: 'Folgore', type: 'tempesta', role: 'cavalcatura', region: 'baia', wildLevel: [36, 36], rarity: 5, size: 'colossale', lengthM: 18, girth: 1.6, trait: 'Serpente marino della tempesta',
    movesFrom: 'scintilla', artFrom: 'torpedine', legendary: true,
    artPrompt: 'a gigantic prehistoric sea serpent of the storm, 14 metres long, coiling body with dark violet scales and glowing yellow runes, a crown of fin-spikes, lightning storms crackling around it' },

  // ---- Delta delle Mangrovie (6-12): brackish river mouth
  { id: 'coccodrillo_nilo', name: 'Coccodrillo del Nilo', type: 'corazzato', role: 'compagno', region: 'delta', wildLevel: [7, 9], rarity: 3, size: 'grande', lengthM: 5, trait: 'Agguato dalla riva: sparisce sotto la superficie e colpisce di sorpresa',
    artPrompt: 'a Nile crocodile with olive-bronze armored scales lurking half-submerged among mangrove roots, cold eyes glinting just above the waterline' },
  { id: 'coccodrillo_marino', name: 'Coccodrillo marino', type: 'predatore', role: 'cavalcatura', region: 'delta', wildLevel: [9, 12], rarity: 2, size: 'grande', lengthM: 7, trait: 'Il più grande rettile vivente; rotolo della morte',
    iconic: true, finalFormName: 'Coccodrillo marino Colosso',
    artPrompt: 'a colossal saltwater crocodile with a ridged armored back and jagged interlocking teeth, gliding through murky mangrove water' },

  // ---- Barriera Rossa (5-10)
  { id: 'pesce_palla', name: 'Pesce palla', type: 'corazzato', role: 'supporto', region: 'barriera', wildLevel: [5, 7], rarity: 1, size: 'piccola', lengthM: 0.6, trait: 'Si gonfia e respinge chi ti circonda',
    evolvesTo: 'istrice_gigante', evolveLevel: 18,
    artPrompt: 'a spiny pufferfish inflated into a thorny sphere with armored skin plates' },
  // its evolution (owner, 3 ottobre 2026): not met in the wild yet, keeps the moves of the pufferfish (tuning)
  { id: 'istrice_gigante', name: 'Istrice gigante', type: 'corazzato', role: 'supporto', region: 'barriera', wildLevel: [18, 20], rarity: 2, size: 'media', lengthM: 1.2, trait: 'Corazza di bronzo irta di spine: chi lo morde si ferisce',
    movesFrom: 'pesce_palla',
    artPrompt: 'a giant porcupinefish, bronze armored skin plates with long sharp spines, half inflated, big beak-like teeth, battle scars' },
  { id: 'murena', name: 'Murena', type: 'abissale', role: 'compagno', region: 'barriera', wildLevel: [6, 8], rarity: 2, size: 'media', lengthM: 3, trait: 'Agguato dalle crepe, morso che trattiene',
    artPrompt: 'a green-black moray eel emerging from a coral crevice, gaping mouth with backward teeth, pale glowing spots' },
  { id: 'squalo_martello', name: 'Squalo martello', type: 'tempesta', role: 'cavalcatura', region: 'barriera', wildLevel: [7, 9], rarity: 3, size: 'grande', lengthM: 6, trait: 'Senso elettrico: rivela creature e relitti nascosti',
    abilities: ['rivelaNascosto'], iconic: true, finalFormName: 'Squalo martello del Tuono',
    artPrompt: 'a great hammerhead shark with a wide hammer-shaped head, electric sparks tracing its sensory pores' },
  { id: 'manta', name: 'Manta', type: 'tempesta', role: 'cavalcatura', region: 'barriera', wildLevel: [8, 10], rarity: 3, size: 'grande', lengthM: 7, trait: 'La più veloce, vince le correnti forti',
    abilities: ['vinceCorrenti'], iconic: true, finalFormName: 'Manta Oscura',
    artPrompt: 'a giant oceanic manta ray gliding on enormous wings, lightning flowing along its wing tips' },
  // ---- The open sea (tappa 11, the owner's pictures of 2 ottobre 2026): mostly common beasts of the endless sea
  { id: 'varano_nilo', name: 'Varano del Nilo nero', type: 'predatore', role: 'compagno', region: 'delta', wildLevel: [8, 11], rarity: 3, size: 'media', lengthM: 2.5, trait: 'Nuota tra le radici a pelo d’acqua, morso velenoso',
    artPrompt: 'a black Nile monitor lizard, long muscular tail, scaly dark armor with faint pale bands, forked tongue, swimming' },
  // more life (owner, 3 ottobre 2026: "riempire il mare di animali medi e piccoli"; pictures: lotto Gemini 2)
  { id: 'cernia', name: 'Cernia bruna', type: 'corazzato', role: 'compagno', region: 'baia', wildLevel: [3, 6], rarity: 1, size: 'media', lengthM: 1.5, trait: 'Bocca enorme: risucchia la preda',
    artPrompt: 'a giant dusky grouper, mottled brown and olive body with pale blotches, a huge mouth with thick lips' },
  { id: 'pastinaca', name: 'Pastinaca', type: 'tempesta', role: 'supporto', region: 'baia', wildLevel: [3, 6], rarity: 1, size: 'media', lengthM: 1.8, trait: 'Si nasconde nella sabbia, aculeo velenoso',
    artPrompt: 'a large stingray, flat diamond-shaped dark grey-brown body with pale spots, a long whip tail with a venomous barb' },
  { id: 'pesce_leone', name: 'Pesce leone', type: 'abissale', role: 'supporto', region: 'barriera', wildLevel: [5, 8], rarity: 2, size: 'piccola', lengthM: 0.5, trait: 'Pinne a ventaglio piene di veleno',
    artPrompt: 'a red lionfish, red and white stripes, long venomous fin spines spread like feathers' },
  { id: 'squalo_nutrice', name: 'Squalo nutrice', type: 'predatore', role: 'compagno', region: 'baia', wildLevel: [4, 7], rarity: 1, size: 'media', lengthM: 3, trait: 'Tranquillo sul fondo, morso che non molla',
    artPrompt: 'a nurse shark, tan-brown smooth skin, small barbels under the snout, rounded fins and a long tail' },
  { id: 'medusa_gigante', name: 'Medusa criniera di leone', type: 'tempesta', role: 'supporto', region: 'barriera', wildLevel: [5, 8], rarity: 2, size: 'media', lengthM: 2, trait: 'Tentacoli lunghissimi e urticanti',
    artPrompt: 'a giant lion\u2019s mane jellyfish, a glowing translucent red-orange bell and a mass of very long trailing tentacles' },
  { id: 'pesce_vela', name: 'Pesce vela', type: 'tempesta', role: 'cavalcatura', region: 'baia', wildLevel: [7, 10], rarity: 2, size: 'media', lengthM: 3, trait: 'Il più veloce del mare aperto',
    artPrompt: 'a sailfish, a huge blue sail-like dorsal fin, a long sharp bill, silver-blue body with dark vertical bars' },
  { id: 'chimera', name: 'Chimera', type: 'abissale', role: 'supporto', region: 'fossa', wildLevel: [18, 21], rarity: 1, size: 'media', lengthM: 1.5, trait: 'Occhi enormi che vedono nel buio',
    artPrompt: 'a ghost shark chimaera, pale silvery pearly skin, huge reflective green eyes, wing-like pectoral fins, a long thin whip tail' },
  { id: 'squalo_capopiatto', name: 'Squalo capopiatto', type: 'predatore', role: 'cavalcatura', region: 'fossa', wildLevel: [20, 23], rarity: 2, size: 'grande', lengthM: 5, trait: 'Antico predatore delle fosse, sei branchie',
    artPrompt: 'a bluntnose sixgill shark, dark grey-brown skin, six gill slits, a blunt rounded snout and glowing green eyes' },
  { id: 'dragone_nero', name: 'Dragone nero', type: 'abissale', role: 'compagno', region: 'fossa', wildLevel: [19, 22], rarity: 2, size: 'piccola', lengthM: 0.6, trait: 'Zanne di vetro e luci lungo il corpo',
    artPrompt: 'a black dragonfish, a slender black deep-sea fish with fang-like teeth, a glowing chin barbel and blue light organs' },
  { id: 'granchio_ragno', name: 'Granchio ragno gigante', type: 'corazzato', role: 'compagno', region: 'fossa', wildLevel: [18, 21], rarity: 1, size: 'media', lengthM: 3.7, trait: 'Zampe lunghissime, corazza spinosa',
    artPrompt: 'a giant spider crab with long spindly legs, orange shell with white spots and small spines' },
  { id: 'tonno', name: 'Tonno rosso', type: 'predatore', role: 'compagno', region: 'baia', wildLevel: [4, 7], rarity: 1, size: 'media', lengthM: 2.5, trait: 'Velocissimo, caccia in branco',
    artPrompt: 'a muscular bluefin tuna, steel-blue back and silver flanks, sharp finlets' },
  { id: 'delfino', name: 'Delfino', type: 'tempesta', role: 'compagno', region: 'baia', wildLevel: [5, 8], rarity: 2, size: 'media', lengthM: 2.5, trait: 'Intelligente e veloce, stordisce col sonar',
    artPrompt: 'a sleek dark bottlenose dolphin with scarred skin, curious eyes' },
  { id: 'pesce_luna', name: 'Pesce luna', type: 'corazzato', role: 'supporto', region: 'barriera', wildLevel: [7, 10], rarity: 2, size: 'grande', lengthM: 3, trait: 'Enorme e lento, pelle dura come cuoio',
    artPrompt: 'a giant ocean sunfish, round flat body, rough grey skin covered in parasites, tall fins' },
  { id: 'scorfano', name: 'Scorfano gigante', type: 'abissale', role: 'supporto', region: 'barriera', wildLevel: [6, 9], rarity: 2, size: 'media', lengthM: 1.5, trait: 'Immobile tra le rocce, spine velenose',
    artPrompt: 'a giant scorpionfish camouflaged like a mossy rock, venomous dorsal spines, wide mouth' },
  { id: 'pesce_napoleone', name: 'Pesce napoleone', type: 'corazzato', role: 'supporto', region: 'barriera', wildLevel: [9, 12], rarity: 3, size: 'grande', lengthM: 2.3, trait: 'Fronte gibbosa, morde i coralli',
    evolvesTo: 'napoleone_corazzato', evolveLevel: 24,
    artPrompt: 'a giant humphead wrasse with a big bulging forehead, green and violet scales, thick lips' },
  // its evolution (owner, 3 ottobre 2026: "il pesce pappagallo può essere un'evoluzione, deve essere più grande")
  { id: 'napoleone_corazzato', name: 'Napoleone corazzato', type: 'corazzato', role: 'supporto', region: 'barriera', wildLevel: [24, 26], rarity: 4, size: 'grande', lengthM: 3.5, trait: 'Elmo d\u2019osso sulla fronte: sfonda coralli e corazze',
    movesFrom: 'pesce_napoleone',
    artPrompt: 'a giant ancient humphead wrasse, its bulging forehead turned into a massive bony bronze helmet, green and violet scales hardened into armor plates' },
  { id: 'pesce_spada', name: 'Pesce spada', type: 'predatore', role: 'compagno', region: 'barriera', wildLevel: [10, 13], rarity: 3, size: 'grande', lengthM: 4, trait: 'Trafigge con la spada a tutta velocità',
    artPrompt: 'a swordfish with a long flat bill like a blade, dark blue back, powerful crescent tail' },
  { id: 'squalo_volpe', name: 'Squalo volpe', type: 'tempesta', role: 'compagno', region: 'barriera', wildLevel: [10, 13], rarity: 3, size: 'grande', lengthM: 5, trait: 'Stordisce le prede con la coda lunghissima',
    artPrompt: 'a thresher shark with an enormously long whip-like upper tail lobe, big dark eyes' },
  { id: 'tricheco', name: 'Tricheco', type: 'glaciale', role: 'supporto', region: 'ghiaccio', wildLevel: [15, 18], rarity: 2, size: 'grande', lengthM: 3.5, trait: 'Zanne lunghe, pelle spessa contro il gelo',
    artPrompt: 'a massive walrus with long ivory tusks, thick wrinkled skin, bristly whiskers' },
  { id: 'elefante_marino', name: 'Elefante marino', type: 'glaciale', role: 'compagno', region: 'ghiaccio', wildLevel: [15, 18], rarity: 2, size: 'grande', lengthM: 5, trait: 'Proboscide e ruggito che fa tremare l\u2019acqua',
    artPrompt: 'a huge southern elephant seal bull with an inflatable trunk-like nose, scarred thick neck' },
  { id: 'megattera', name: 'Megattera', type: 'glaciale', role: 'cavalcatura', region: 'barriera', wildLevel: [9, 14], rarity: 4, size: 'colossale', lengthM: 16, trait: 'Il suo canto cura la squadra; con lei non consumi ossigeno',
    abilities: ['staz_ossigeno'], iconic: true, finalFormName: 'Megattera Cantore',
    artPrompt: 'a colossal humpback whale with long white pectoral fins and a knobby head, singing, icy bubbles' },
  { id: 're_corallo', name: 'Re Corallo', type: 'corazzato', role: 'compagno', region: 'barriera', wildLevel: [20, 20], rarity: 4, size: 'grande', lengthM: 5, trait: 'Incassa per tutta la squadra', guardian: true,
    artPrompt: 'a colossal ancient crab whose shell is a living red coral reef, one claw locked in a rusted iron collar' },

  // ---- Foresta Sommersa (10-15)
  { id: 'lontra_marina', name: 'Lontra marina', type: 'glaciale', role: 'supporto', region: 'foresta', wildLevel: [10, 12], rarity: 2, size: 'piccola', lengthM: 1.4, trait: 'Cura lenta, trova più denti nei relitti',
    artPrompt: 'a sly sea otter with frost-tipped fur swimming through dark kelp, clutching a glowing pearl' },
  { id: 'anguilla_elettrica', name: 'Anguilla elettrica gigante', type: 'tempesta', role: 'compagno', region: 'foresta', wildLevel: [11, 13], rarity: 3, size: 'media', lengthM: 3, trait: 'Scarica a catena tra i nemici',
    artPrompt: 'a giant electric eel coiling through kelp, its body crackling with violet lightning' },
  { id: 'squalo_tigre', name: 'Squalo tigre', type: 'predatore', role: 'compagno', region: 'foresta', wildLevel: [12, 14], rarity: 3, size: 'grande', lengthM: 5.5, trait: 'Mangia tutto e si cura divorando',
    iconic: true, finalFormName: 'Squalo tigre Divoratore',
    artPrompt: 'a heavy tiger shark with dark stripes and stained jaws, fish bones drifting around it' },
  { id: 'polpo_gigante', name: 'Polpo gigante', type: 'abissale', role: 'supporto', region: 'foresta', wildLevel: [13, 15], rarity: 3, size: 'media', lengthM: 6, trait: 'Nube d\u2019inchiostro: i nemici perdono le tue tracce',
    artPrompt: 'a giant red-brown octopus releasing a cloud of black ink, eyes glinting with cyan light' },
  { id: 'piovra', name: 'La Piovra', type: 'abissale', role: 'compagno', region: 'foresta', wildLevel: [25, 25], rarity: 4, size: 'colossale', lengthM: 15, trait: 'Afferra e immobilizza', guardian: true,
    artPrompt: 'a monstrous ancient octopus with scarred tentacles wrapped around a shipwreck, rusted iron collar and broken chains' },

  // ---- Mare di Ghiaccio (15-20)
  { id: 'foca_leopardo', name: 'Foca leopardo', type: 'glaciale', role: 'compagno', region: 'ghiaccio', wildLevel: [15, 17], rarity: 2, size: 'media', lengthM: 3.5, trait: 'Morde e trascina',
    artPrompt: 'a spotted leopard seal with a reptilian head and a wide grin of teeth, lunging through icy water' },
  { id: 'beluga', name: 'Beluga', type: 'glaciale', role: 'supporto', region: 'ghiaccio', wildLevel: [16, 18], rarity: 3, size: 'media', lengthM: 5, trait: 'Canto sonar: mostra la mappa, rallenta i nemici',
    artPrompt: 'a pale beluga whale with a rounded forehead emitting visible sonar ripples' },
  { id: 'narvalo', name: 'Narvalo', type: 'glaciale', role: 'cavalcatura', region: 'ghiaccio', wildLevel: [17, 19], rarity: 3, size: 'grande', lengthM: 5.5, trait: 'Carica col corno che trapassa più nemici',
    abilities: ['apreGhiaccioSottile'],
    artPrompt: 'a narwhal with a long spiral tusk like a lance, frost crystals along the tusk' },
  { id: 'orca', name: 'Orca', type: 'glaciale', role: 'cavalcatura', region: 'ghiaccio', wildLevel: [18, 20], rarity: 4, size: 'grande', lengthM: 8, alfaName: 'Orca matriarca', alfaArt: 'orca_matriarca', trait: 'Spezza il ghiaccio antico',
    abilities: ['spezzaGhiaccio'], iconic: true, finalFormName: 'Orca Imperatrice',
    artPrompt: 'a powerful orca with sharp black and white markings and a tall dorsal fin, bursting through ice' },

  // ---- Fossa del Capodoglio (20-28)
  { id: 'rana_pescatrice', name: 'Rana pescatrice', type: 'abissale', role: 'supporto', region: 'fossa', wildLevel: [20, 22], rarity: 2, size: 'piccola', lengthM: 1.2, trait: 'Lampada viva: più luce, attira i pesci',
    artPrompt: 'a deep-sea anglerfish with a glowing lure hanging before a mouth of glass-like fangs' },
  { id: 'squalo_goblin', name: 'Squalo goblin', type: 'predatore', role: 'compagno', region: 'fossa', wildLevel: [21, 23], rarity: 3, size: 'media', lengthM: 5, trait: 'Mascella che scatta e colpisce da lontano',
    artPrompt: 'a pink goblin shark with its jaw violently extended forward and a long blade-like snout' },
  { id: 'calamaro_gigante', name: 'Calamaro gigante', type: 'abissale', role: 'compagno', region: 'fossa', wildLevel: [23, 25], rarity: 3, size: 'grande', lengthM: 13, trait: 'Tentacoli che bloccano una bestia per 3 s',
    iconic: true, finalFormName: 'Calamaro gigante degli Abissi',
    artPrompt: 'a giant squid with enormous eyes and long feeding tentacles with hooked suckers' },
  { id: 'capodoglio', name: 'Capodoglio', type: 'abissale', role: 'cavalcatura', region: 'fossa', wildLevel: [25, 27], rarity: 4, size: 'colossale', lengthM: 18, trait: 'Apnea ed ecolocalizzazione',
    abilities: ['staz_ossigeno'], iconic: true, finalFormName: 'Capodoglio Bianco dei Mari',
    artPrompt: 'a colossal sperm whale with a massive square head covered in circular sucker scars' },
  { id: 'calamaro_colossale', name: 'Calamaro colossale', type: 'abissale', role: 'compagno', region: 'fossa', wildLevel: [30, 30], rarity: 4, size: 'colossale', lengthM: 20, trait: 'Stritola e oscura con l\u2019inchiostro', guardian: true,
    artPrompt: 'a nightmarish colossal squid with rotating hooks on its tentacles and one huge glowing eye, dragging broken iron chains' },

  // ---- Abisso del Tempio (28-35)
  { id: 'isopode_gigante', name: 'Isopode gigante', type: 'corazzato', role: 'supporto', region: 'abisso', wildLevel: [28, 30], rarity: 2, size: 'media', lengthM: 1.5, trait: 'Carapace che ripara la squadra',
    artPrompt: 'a giant deep-sea isopod with overlapping pale armor plates, curling like a shield' },
  { id: 'serpente_di_mare', name: 'Serpente di mare', type: 'tempesta', role: 'compagno', region: 'abisso', wildLevel: [30, 32], rarity: 4, size: 'grande', lengthM: 25, trait: 'Scatena tempeste sottomarine',
    artPrompt: 'a mythical sea serpent with a long coiling body and a crest of fins, inside an underwater storm' },
  { id: 'mosasauro', name: 'Mosasauro', type: 'corazzato', role: 'cavalcatura', region: 'abisso', wildLevel: [32, 34], rarity: 4, size: 'colossale', lengthM: 17, trait: 'Non si stordisce, frantuma le corazze',
    iconic: true, finalFormName: 'Mosasauro Tiranno',
    artPrompt: 'a prehistoric mosasaur with crocodile-like jaws, armored scales and a shark-like tail' },
  { id: 'megalodonte', name: 'Megalodonte', type: 'predatore', role: 'cavalcatura', region: 'abisso', wildLevel: [34, 36], rarity: 5, size: 'colossale', lengthM: 18, trait: 'Terrore: paralizza tutto intorno',
    abilities: ['sfondaOssa'], iconic: true, finalFormName: 'Megalodonte Primordiale',
    artPrompt: 'a gigantic megalodon dwarfing a tiny diver, ancient scars, jaws wide open with enormous teeth, red glowing eye' },

  // ---- Fossa Nera (post-game)
  { id: 'kraken', name: 'Kraken', type: 'abissale', role: 'compagno', region: 'fossaNera', wildLevel: [40, 45], rarity: 5, size: 'colossale', lengthM: 40, trait: 'Leggendario', legendary: true, iconic: true, finalFormName: 'Kraken Ancestrale',
    artPrompt: 'the legendary Kraken, a titanic cephalopod rising from an abyssal trench, tentacles around a sunken galleon' },
  { id: 'dunkleosteus', name: 'Dunkleosteus', type: 'corazzato', role: 'compagno', region: 'fossaNera', wildLevel: [40, 45], rarity: 5, size: 'grande', lengthM: 9, trait: 'Il morso più forte del gioco', legendary: true, iconic: true, finalFormName: 'Dunkleosteus Corazza di Ferro',
    artPrompt: 'a Dunkleosteus, a prehistoric armored fish with a bony plated head and blade-like jaw plates' },
  { id: 'livyatan', name: 'Livyatan', type: 'predatore', role: 'cavalcatura', region: 'fossaNera', wildLevel: [42, 47], rarity: 5, size: 'colossale', lengthM: 17, trait: 'Capodoglio preistorico predatore', legendary: true,
    abilities: ['staz_ossigeno'], iconic: true, finalFormName: 'Livyatan Re dei Mari',
    artPrompt: 'a Livyatan melvillei, a prehistoric raptorial sperm whale with huge interlocking teeth' },
  { id: 'leviatano', name: 'Leviatano', type: 'variabile', role: 'cavalcatura', region: 'fossaNera', wildLevel: [50, 50], rarity: 5, size: 'colossale', lengthM: 120, trait: 'Finale della storia; domabile solo dopo il finale', legendary: true, tameableAfterStory: true,
    artPrompt: 'the Leviathan, an ancient serpentine sea god larger than a temple, eyes like molten amber, scales shimmering red, cyan, icy blue, violet and bronze' },
];

/** Unique Guardian variants of existing species (tameable after the chapter boss fight). */
export interface UniqueVariantDef { id: string; speciesId: string; name: string; level: number; statMult: number; sizeMult: number; // sizeMult × species lengthM
  region: RegionId; artPrompt: string;
  // ---- legends (tappa 13, owner's decisions of 2 ottobre 2026): one in the whole world; each time its species
  // comes, in its place only, it may come instead; tamed it is yours, defeated it is gone forever
  chance?: number;             // share of its species' comings (in its place) that are the legend instead
  where?: { biome?: string; minKm?: number }; // its place: a kind of stretch of the endless sea, and/or a distance from the coast
  place?: string;              // where it lives, for the bestiary
  temper?: 'aggressive' | 'calm' | 'shy'; // its own temperament (otherwise rare beasts are shy)
  surface?: boolean;           // it floats at the surface
}
export const UNIQUE_VARIANTS: UniqueVariantDef[] = [
  { id: 'sfregiato', speciesId: 'squalo_bianco', name: 'Lo Sfregiato', level: 8, statMult: 1.35, sizeMult: 1.25, region: 'baia',
    artPrompt: 'a colossal great white shark covered in deep scars, a rusted iron collar embedded in its neck, broken chains trailing' },
  { id: 'coccodrillo_marino_leggendario', speciesId: 'coccodrillo_marino', name: 'Coccodrillo albino leggendario', level: 14, statMult: 1.5, sizeMult: 1.3, region: 'delta',
    chance: 0.03, place: 'Delta delle Mangrovie, tra i coccodrilli', // not as rare as the others (owner)
    artPrompt: 'a legendary albino saltwater crocodile, pale white scales, red eyes, ancient and enormous' },
  // the legends of the open sea (the owner's pictures)
  { id: 'orca_preistorica_albina', speciesId: 'orca', name: 'Orca preistorica albina', level: 45, statMult: 1.7, sizeMult: 1.6, region: 'ghiaccio',
    chance: 0.004, where: { biome: 'ghiaccio', minKm: 8 }, place: 'Banchisa lontana, oltre 8 km dalla costa', temper: 'aggressive',
    artPrompt: 'a colossal prehistoric albino orca, pale scarred hide, ancient and terrifying' },
  { id: 'orca_matriarca_finale', speciesId: 'orca', name: 'Madre delle madri', level: 36, statMult: 1.5, sizeMult: 1.45, region: 'ghiaccio',
    chance: 0.01, where: { biome: 'ghiaccio', minKm: 3 }, place: 'Banchisa, oltre 3 km dalla costa', temper: 'aggressive',
    artPrompt: 'the oldest orca matriarch, enormous, covered in scars, mother of every pod' },
  { id: 'beluga_spettro', speciesId: 'beluga', name: 'Beluga spettro', level: 24, statMult: 1.4, sizeMult: 1.3, region: 'ghiaccio',
    chance: 0.02, where: { biome: 'ghiaccio', minKm: 2 }, place: 'Mare di Ghiaccio, oltre 2 km dalla costa', // owner, 3 ottobre: "una sorta di albino, un one off"
    artPrompt: 'a ghostly beluga whale, pale translucent skin showing faint bones, a glowing rounded forehead' },
  { id: 'squalo_martello_preistorico', speciesId: 'squalo_martello', name: 'Squalo martello preistorico', level: 30, statMult: 1.5, sizeMult: 1.7, region: 'barriera',
    chance: 0.01, where: { biome: 'barriera', minKm: 3 }, place: 'Barriera lontana, oltre 3 km dalla costa', temper: 'aggressive',
    artPrompt: 'a prehistoric hammerhead shark covered in armored plates and ridges, red glow under its belly' },
  { id: 'tartaruga_preistorica', speciesId: 'tartaruga_marina', name: 'Tartaruga preistorica', level: 32, statMult: 1.6, sizeMult: 7, region: 'barriera',
    chance: 0.01, where: { biome: 'aperto', minKm: 4 }, place: 'Mare aperto, oltre 4 km: a pelo d\u2019acqua sembra un\u2019isoletta', temper: 'calm', surface: true,
    artPrompt: 'a gigantic prehistoric sea turtle carrying a whole reef on its shell: ammonites, corals, crabs and jellyfish' },
  { id: 'regina_bianca', speciesId: 'orca', name: 'La Regina bianca', level: 22, statMult: 1.35, sizeMult: 1.2, region: 'ghiaccio',
    artPrompt: 'a pure white orca queen with pale glowing eyes and a crown of frost on her head' },
];

// ---- Base stats (tuning). Stat at level L = base * (1 + statGrowthPerLevel * (L-1)) * variant mult.
export interface Stats { hp: number; bite: number; charge: number; defense: number; speed: number; }
// Health and bite are ×10 since 3 ottobre 2026 (owner: "un livello 1 mi toglie 1/5 di vita"): with 10 health at
// level 11 the smallest hit (1) was a fifth of it; now, like Pokémon, a scratch is 1 of ~100 (save v12 migrates).
// A support bites 1.8 (was 1): its moves did almost nothing (owner, Guscio).
const ROLE_BASE: Record<Role, Stats> = {
  cavalcatura: { hp: 100, bite: 26, charge: 3, defense: 0.10, speed: 120 }, // bite 2.6 (was 2): a final form bites harder than its second stage
  compagno:    { hp: 80,  bite: 30, charge: 2, defense: 0.10, speed: 105 },
  supporto:    { hp: 80,  bite: 18, charge: 1, defense: 0.18, speed: 95 },
};
const RARITY_MULT: Record<Stars, number> = { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.15, 5: 1.35 };
const SIZE_HP: Record<SizeClass, number> = { piccola: 0.8, media: 1.0, grande: 1.3, colossale: 1.7 };
// the bigger the beast, the harder it bites (owner, 2 ottobre: a barracuda bit harder than a white shark)
const SIZE_BITE: Record<SizeClass, number> = { piccola: 0.75, media: 0.95, grande: 1.2, colossale: 1.45 };
const SIZE_SPEED: Record<SizeClass, number> = { piccola: 1.05, media: 1.0, grande: 0.95, colossale: 0.85 };

export function statsAt(species: SpeciesDef, level: number, variant: 'comune' | 'albino' | 'alfa' = 'comune', uniqueMult = 1): Stats {
  const b = ROLE_BASE[species.role], r = RARITY_MULT[species.rarity];
  const lv = 1 + PROGRESSION.statGrowthPerLevel * (level - 1);
  const v = (variant === 'comune' ? 1 : VARIANT_RULES[variant].statMult) * uniqueMult;
  return {
    hp: Math.round(b.hp * r * SIZE_HP[species.size] * lv * v),
    bite: +(b.bite * r * SIZE_BITE[species.size] * lv * v).toFixed(1),
    charge: +(b.charge * r * lv * v).toFixed(1),
    defense: Math.min(0.5, b.defense * (variant === 'comune' ? 1 : 1.2)),
    speed: Math.round(b.speed * SIZE_SPEED[species.size] * (variant === 'albino' ? 1.1 : 1)),
  };
}

export const speciesById = (id: string) => SPECIES.find((s) => s.id === id);
