// Leviatano — the moves each species learns by level, like Pokémon's learnsets (owner, 3 ottobre 2026). Each one
// follows the Pokémon it resembles (the comment): up to 16 like the start of a Pokémon list, then spread up to about
// level 65 of 100 (owner, 3 ottobre: level cap 100). "1 a, 5 b": move a at level 1, b at 5;
// level 0 = learned when it evolves into this species. A beast knows at most 4 moves (moveBattle.ts MOVE_SLOTS): a
// wild or new beast knows the last 4 it learned by its level, a tamed one chooses what to forget.
export interface LearnEntry {
  level: number;
  move: string;
}

const ls = (text: string): LearnEntry[] =>
  text.split(',').map((p) => {
    const [level, move] = p.trim().split(/\s+/);
    return { level: Number(level), move: move! };
  });

const SHARK = ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 guizzo, 13 muso_terrore, 18 morsi_raffica, 24 zanna_lunga, 30 fendente, 36 stritolamorso, 42 frenesia, 48 zanna_lacerante, 54 testata_cieca, 60 carica_preistorica, 66 carica_suicida'); // Sharpedo, Garchomp
const ZANNA = ls('1 spinta, 1 ringhio, 5 guizzo, 9 azzannata, 13 sguardo_feroce, 18 fendente, 24 muso_terrore, 30 zanna_lacerante, 36 stritolamorso, 42 frenesia, 48 testata_cieca, 54 artiglio_antico, 60 danza_predatore, 66 carica_preistorica'); // Charmander line
const GUSCIO = ls('1 spinta, 1 ritirata, 5 sassi, 9 azzannata, 13 indurimento, 18 tomba_sassi, 24 smottamento, 30 siesta, 36 frana, 42 corazza_ferro, 48 testata_acciaio, 54 potere_antico, 60 scossa_fondale, 66 testata_roccia'); // Turtwig, Tirtouga lines
const SCINTILLA = ls('1 spinta, 1 ringhio, 5 scossa, 9 onda_paralizzante, 13 guizzo, 18 carica_elettrica, 24 raggio_carico, 30 scatto_corrente, 36 scarica, 42 accumulo, 48 fulmine, 54 lama_vento, 60 tuono, 66 carica_fulminea'); // Pikachu, Chinchou
const POLPO = ls('1 stretta, 1 getto_acqua, 5 nube_inchiostro, 9 pulsazione, 13 lambita, 18 assorbimento, 24 ipnosi, 30 getto_inchiostro, 36 calma, 42 succhiavita, 48 sfera_ombra, 54 rigenerazione, 60 onda_mentale'); // Octillery
const KRAKEN = ls('1 stretta, 1 nube_inchiostro, 5 lambita, 9 getto_inchiostro, 13 ipnosi, 18 succhiavita, 24 artiglio_ombra, 30 sfera_ombra, 36 trama_oscura, 42 impulso_oscuro, 48 bomba_melma, 54 rigenerazione, 60 onda_mentale, 66 fango_nero'); // Malamar, Dragalge
const CALAMARO = ls('1 stretta, 1 nube_inchiostro, 5 lambita, 9 pulsazione, 13 getto_inchiostro, 18 ipnosi, 24 succhiavita, 30 impulso_oscuro, 36 sfera_ombra, 42 trama_oscura, 48 onda_mentale, 54 stritolamorso, 60 bomba_melma, 66 fango_nero'); // Malamar
const NAPOLEONE = ls('1 spinta, 1 bollicine, 5 indurimento, 10 azzannata, 15 getto_acqua, 22 capocciata, 28 siesta, 34 gemma_corallo, 40 corazza_ferro, 46 testata_acciaio, 52 maremoto, 60 scossa_fondale'); // Bibarel, Relicanth
const PALLA = ls('1 spinta, 1 aculeo, 5 indurimento, 9 bollicine, 13 aculei, 18 morso_velenoso, 24 corazza_ferro, 30 pungiglione, 36 veleno_profondo, 42 siesta, 48 bomba_melma, 54 testata_acciaio, 60 fango_nero'); // Qwilfish

export const LEARNSETS: Record<string, LearnEntry[]> = {
  zanna: ZANNA,
  squarcio: [...ls('0 zanna_lunga'), ...ZANNA],
  zannarossa: [...ls('0 zanna_lunga, 0 taglio_buio, 63 assalto'), ...ZANNA],
  guscio: GUSCIO,
  rocciaguscio: [...ls('0 coda_acciaio'), ...GUSCIO],
  archelon: [...ls('0 coda_acciaio, 0 lama_pietra'), ...GUSCIO],
  scintilla: SCINTILLA,
  saetta: [...ls('0 zanna_elettrica'), ...SCINTILLA],
  folgore: [...ls('0 zanna_elettrica, 0 cannone_elettrico'), ...SCINTILLA],
  barracuda: ls('1 spinta, 1 sguardo_feroce, 4 guizzo, 8 azzannata, 12 morsi_raffica, 16 fendente, 22 muso_terrore, 28 zanna_lunga, 34 agguato, 40 stritolamorso, 46 frenesia, 52 taglio_buio, 60 carica_suicida'), // Carvanha
  tartaruga_marina: ls('1 spinta, 1 ritirata, 5 bollicine, 9 azzannata, 13 getto_acqua, 18 indurimento, 24 raggio_bolle, 30 siesta, 36 codata, 42 corazza_ferro, 48 maremoto, 54 testata_acciaio, 60 idrogetto'), // Squirtle
  torpedine: ls('1 bollicine, 1 onda_paralizzante, 5 scossa, 9 lampo, 13 getto_acqua, 18 carica_elettrica, 24 raggio_carico, 30 onda_urto, 36 scarica, 42 accumulo, 48 fulmine, 55 tuono, 63 cannone_elettrico'), // Chinchou
  squalo_bianco: SHARK,
  squalo_tigre: SHARK,
  squalo_capopiatto: SHARK,
  megalodonte: SHARK,
  squalo_nutrice: ls('1 spinta, 1 ringhio, 5 azzannata, 10 sabbia, 15 capocciata, 22 schiacciata, 30 siesta, 37 stritolamorso, 45 frenesia, 52 testata_cieca, 60 forza_bruta'), // Snorlax-like bottom dweller
  squalo_goblin: ls('1 spinta, 1 sguardo_feroce, 6 azzannata, 11 ombra_furtiva, 16 lampo, 24 zanna_lunga, 31 agguato, 39 stritolamorso, 46 artiglio_ombra, 54 frenesia, 61 taglio_buio'), // Sharpedo, dark
  livyatan: ls('1 spinta, 1 ringhio, 5 azzannata, 10 schiacciata, 15 muso_terrore, 22 stritolamorso, 30 capocciata, 37 frenesia, 45 zanna_lunga, 52 carica_preistorica, 60 forza_bruta, 67 carica_suicida'), // Gyarados
  coccodrillo_nilo: ls('1 graffio, 1 sguardo_feroce, 6 azzannata, 11 sabbia, 16 schizzo_fango, 24 stritolamorso, 31 smottamento, 39 frenesia, 46 coda_acciaio, 54 scossa_fondale, 61 forza_bruta'), // Krookodile
  coccodrillo_marino: ls('1 graffio, 1 sguardo_feroce, 6 azzannata, 11 scatto_acqua, 16 muso_terrore, 24 stritolamorso, 31 fendente, 39 frenesia, 46 codata, 54 schiacciata, 61 assalto'), // Feraligatr
  varano_nilo: ls('1 graffio, 1 sguardo_feroce, 6 azzannata, 11 guizzo, 16 morso_velenoso, 24 fendente, 31 muso_terrore, 39 stritolamorso, 46 danza_predatore, 54 artiglio_antico, 61 carica_preistorica'), // Komodo: Garchomp, Salazzle
  pesce_palla: PALLA,
  istrice_gigante: [...ls('0 lama_pietra'), ...PALLA],
  murena: ls('1 stretta, 1 sguardo_feroce, 5 azzannata, 9 ombra_furtiva, 13 morso_velenoso, 18 agguato, 24 stritolamorso, 30 artiglio_ombra, 36 sfera_ombra, 42 trama_oscura, 48 impulso_oscuro, 54 pungiglione, 60 fango_nero'), // Seviper, Ekans
  squalo_martello: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 scossa, 13 guizzo, 18 zanna_elettrica, 24 onda_urto, 30 scatto_corrente, 36 stritolamorso, 42 scarica, 48 fulmine, 54 testata_cieca, 60 tuono, 66 carica_fulminea'), // Sharpedo + electric sense
  manta: ls('1 spinta, 1 bollicine, 6 raffica, 11 raggio_bolle, 16 capocciata, 24 scatto_corrente, 31 colpo_ala, 39 onda_marina, 46 testata_cieca, 54 lama_vento, 61 idrogetto, 67 uragano'), // Mantine
  cernia: ls('1 spinta, 1 bollicine, 6 azzannata, 11 indurimento, 16 capocciata, 24 schiacciata, 31 siesta, 39 testata_acciaio, 46 corazza_ferro, 54 risalita, 61 scossa_fondale'), // Relicanth
  pesce_napoleone: NAPOLEONE,
  napoleone_corazzato: [...ls('0 testata_roccia'), ...NAPOLEONE],
  pastinaca: ls('1 sabbia, 1 aculeo, 5 scossa, 9 schizzo_fango, 13 onda_paralizzante, 18 pungiglione, 24 carica_elettrica, 30 colpo_fango, 36 scarica, 42 veleno_profondo, 48 fulmine, 55 bomba_melma, 61 tuono'), // Stunfisk, Gligar
  pesce_leone: ls('1 aculeo, 1 sguardo_feroce, 5 spore, 9 bava_acida, 13 morso_velenoso, 18 pinne_danzanti, 24 pungiglione, 30 veleno_profondo, 36 sfera_ombra, 42 bomba_melma, 49 trama_oscura, 57 fango_nero'), // Qwilfish, Toxapex
  medusa_gigante: ls('1 aculeo, 1 stretta, 5 bava_acida, 9 scossa, 13 onda_paralizzante, 18 raggio_bolle, 24 pungiglione, 30 scarica, 36 veleno_profondo, 42 acqua_ferma, 48 fulmine, 54 bomba_melma, 60 idrogetto'), // Tentacruel
  pesce_vela: ls('1 spinta, 1 guizzo, 5 bollicine, 9 colpo_ala, 13 scatto_corrente, 18 scatto_acqua, 24 picchiata, 30 fendente, 36 lama_vento, 42 risalita, 48 codata, 54 tuffo, 61 uragano'), // Swellow, Basculin
  chimera: ls('1 spinta, 1 lampo, 5 lambita, 9 pulsazione, 13 ipnosi, 18 ombra_furtiva, 24 rigenerazione, 30 calma, 36 sfera_ombra, 42 mente_vuota, 48 onda_mentale, 55 impulso_oscuro'), // Misdreavus, Slowpoke
  dragone_nero: ls('1 azzannata, 1 lampo, 5 ombra_furtiva, 9 lambita, 13 zanna_lunga, 18 artiglio_ombra, 24 nube_inchiostro, 30 sfera_ombra, 36 stritolamorso, 42 trama_oscura, 48 impulso_oscuro, 55 taglio_buio'), // Lanturn, Sableye
  granchio_ragno: ls('1 pinza, 1 sguardo_feroce, 5 bollicine, 9 indurimento, 13 schizzo_fango, 18 chela_acciaio, 24 tomba_sassi, 30 fendente, 36 corazza_ferro, 42 martello_chela, 48 guscio_spezzato, 54 testata_acciaio, 60 scossa_fondale'), // Kingler
  tonno: ls('1 spinta, 1 guizzo, 5 bollicine, 9 azzannata, 13 scatto_acqua, 18 capocciata, 24 scatto_corrente, 30 risalita, 36 testata_cieca, 42 danza_predatore, 48 codata, 55 carica_suicida'), // Basculin
  delfino: ls('1 spinta, 1 getto_acqua, 5 guizzo, 9 raffica, 13 onda_marina, 18 onda_urto, 24 scatto_acqua, 30 picchiata, 36 risalita, 42 scatto_corrente, 48 lama_vento, 54 maremoto, 60 uragano'), // Palafin
  pesce_luna: ls('1 spinta, 1 bollicine, 5 indurimento, 10 schiacciata, 15 siesta, 22 getto_acqua, 30 corazza_ferro, 37 gemma_corallo, 45 letargo, 52 maremoto, 60 lampo_acciaio'), // Alomomola
  scorfano: ls('1 aculeo, 1 sabbia, 5 schizzo_fango, 9 morso_velenoso, 13 indurimento, 18 agguato, 24 pungiglione, 30 veleno_profondo, 36 colpo_fango, 42 bomba_melma, 49 rigenerazione, 57 fango_nero'), // Stunfisk, Qwilfish
  pesce_spada: ls('1 spinta, 1 sguardo_feroce, 5 guizzo, 9 morsi_raffica, 13 scatto_acqua, 18 fendente, 24 frenesia, 30 taglio_buio, 36 risalita, 42 codata, 48 testata_cieca, 55 assalto, 63 carica_suicida'), // Seaking, Sirfetch'd
  squalo_volpe: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 raffica, 13 colpo_coda, 18 guizzo, 24 lama_vento, 30 zanna_elettrica, 36 scatto_corrente, 42 codata, 48 scarica, 54 uragano, 60 tuffo'), // Sharpedo + tail
  tricheco: ls('1 spinta, 1 neve, 5 ringhio, 9 getto_acqua, 13 schiacciata, 18 scheggia, 24 zanna_gelo, 30 letargo, 36 vento_polare, 42 stritolamorso, 48 raggio_gelido, 54 maremoto, 61 bufera'), // Walrein
  elefante_marino: ls('1 spinta, 1 ringhio, 5 neve, 9 getto_acqua, 13 capocciata, 18 schiacciata, 24 scheggia, 30 zanna_gelo, 36 letargo, 42 stalattite, 48 raggio_gelido, 54 testata_cieca, 61 bufera'), // Sealeo, Walrein
  megattera: ls('1 spinta, 1 getto_acqua, 5 canto, 9 bollicine, 13 schiacciata, 18 onda_marina, 24 letargo, 30 aurora, 36 acqua_ferma, 42 maremoto, 48 raggio_gelido, 54 testata_cieca, 60 idrogetto, 66 bufera'), // Wailord
  re_corallo: ls('1 spinta, 1 indurimento, 5 bollicine, 9 sassi, 13 siesta, 18 raggio_bolle, 24 tomba_sassi, 30 gemma_corallo, 36 potere_antico, 42 corazza_ferro, 48 lampo_acciaio, 54 eruzione, 60 lama_pietra'), // Corsola
  lontra_marina: ls('1 graffio, 1 getto_acqua, 5 guizzo, 9 sassi, 13 neve, 18 scatto_acqua, 24 zanna_gelo, 30 aurora, 36 vento_polare, 42 letargo, 48 raggio_gelido, 54 codata, 60 maremoto'), // Oshawott, Buizel
  anguilla_elettrica: ls('1 stretta, 1 scossa, 5 azzannata, 9 onda_paralizzante, 13 carica_elettrica, 18 zanna_elettrica, 24 raggio_carico, 30 accumulo, 36 scarica, 42 stritolamorso, 48 fulmine, 55 tuono, 63 cannone_elettrico'), // Eelektross
  polpo_gigante: POLPO,
  piovra: KRAKEN,
  kraken: KRAKEN,
  calamaro_gigante: CALAMARO,
  calamaro_colossale: CALAMARO,
  foca_leopardo: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 neve, 13 scatto_acqua, 18 zanna_gelo, 24 scheggia, 30 stritolamorso, 36 vento_polare, 42 frenesia, 48 stalattite, 54 raggio_gelido, 60 bufera'), // Dewgong, Sharpedo
  beluga: ls('1 spinta, 1 getto_acqua, 5 canto, 9 neve, 13 onda_marina, 18 pulsazione, 24 aurora, 30 letargo, 36 acqua_ferma, 42 raggio_gelido, 48 calma, 54 maremoto, 60 bufera'), // Lapras
  narvalo: ls('1 spinta, 1 neve, 5 guizzo, 9 getto_acqua, 13 scheggia, 18 ghiaccioli, 24 aurora, 30 stalattite, 36 vento_polare, 42 frenesia, 48 raggio_gelido, 54 codata, 60 bufera'), // Dewgong, Cetitan
  orca: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 getto_acqua, 13 scatto_acqua, 18 zanna_gelo, 24 stritolamorso, 30 risalita, 36 frenesia, 42 raggio_gelido, 48 codata, 54 maremoto, 60 bufera, 66 carica_suicida'), // Wailord + Sharpedo
  rana_pescatrice: ls('1 lampo, 1 azzannata, 5 lambita, 9 ipnosi, 13 agguato, 18 ombra_furtiva, 24 stritolamorso, 30 sfera_ombra, 36 trama_oscura, 42 succhiavita, 48 impulso_oscuro, 54 rigenerazione, 60 onda_mentale'), // Lanturn
  capodoglio: ls('1 spinta, 1 getto_acqua, 5 pulsazione, 9 schiacciata, 13 azzannata, 18 onda_marina, 24 sfera_ombra, 30 letargo, 36 stritolamorso, 42 onda_mentale, 48 maremoto, 54 impulso_oscuro, 60 testata_cieca, 66 idrogetto'), // Wailord
  isopode_gigante: ls('1 spinta, 1 indurimento, 5 sabbia, 9 assorbimento, 13 ritirata, 18 tomba_sassi, 24 siesta, 30 sanguisuga, 36 corazza_ferro, 42 frana, 48 testata_acciaio, 54 scossa_fondale'), // Golisopod
  serpente_di_mare: ls('1 stretta, 1 sguardo_feroce, 5 scossa, 9 azzannata, 13 onda_paralizzante, 18 carica_elettrica, 24 muso_terrore, 30 lama_vento, 36 danza_predatore, 42 fulmine, 48 codata, 54 uragano, 60 tuono'), // Dragonair, Gyarados
  mosasauro: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 schizzo_fango, 13 muso_terrore, 18 tomba_sassi, 24 stritolamorso, 30 codata, 36 frana, 42 danza_predatore, 48 coda_acciaio, 54 lama_pietra, 60 carica_preistorica, 66 testata_roccia'), // Tyrantrum
  dunkleosteus: ls('1 azzannata, 1 indurimento, 5 sguardo_feroce, 9 tomba_sassi, 13 stritolamorso, 18 testata_acciaio, 24 corazza_ferro, 30 zanna_lunga, 36 frana, 42 frenesia, 48 coda_acciaio, 54 lama_pietra, 60 carica_preistorica, 66 testata_roccia'), // Tyrantrum, Arctovish
  leviatano: ls('1 maremoto, 1 stritolamorso, 1 muso_terrore, 1 ira_leviatano, 37 frenesia, 52 idrogetto, 67 abisso_primordiale'), // Arceus, Kyogre
};

/**
 * What a species learns up to this level, in the order it learned them; evolution moves count as learned at
 * `evolvedAt` (the level its line evolves into it).
 */
export function learnedBy(speciesId: string, level: number, evolvedAt = 0): string[] {
  const at = (e: LearnEntry): number => (e.level === 0 ? evolvedAt : e.level);
  const list = (LEARNSETS[speciesId] ?? []).filter((e) => at(e) <= level);
  const seen = new Set<string>();
  return [...list]
    .sort((a, b) => at(a) - at(b))
    .map((e) => e.move)
    .filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}

/** The moves a species learns exactly at this level (0: on evolving into it). */
export const learnedAt = (speciesId: string, level: number): string[] =>
  (LEARNSETS[speciesId] ?? []).filter((e) => e.level === level).map((e) => e.move);
