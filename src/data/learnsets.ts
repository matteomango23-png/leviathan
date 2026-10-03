// Leviatano — the moves each species learns by level, like Pokémon's learnsets (owner, 3 ottobre 2026). Each one
// follows the Pokémon it resembles (the comment), squeezed into our 50 levels. "1 a, 5 b": move a at level 1, b at 5;
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

const SHARK = ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 guizzo, 13 muso_terrore, 17 morsi_raffica, 21 zanna_lunga, 25 fendente, 29 stritolamorso, 33 frenesia, 37 zanna_lacerante, 41 testata_cieca, 45 carica_preistorica, 49 carica_suicida'); // Sharpedo, Garchomp
const ZANNA = ls('1 spinta, 1 ringhio, 5 guizzo, 9 azzannata, 13 sguardo_feroce, 17 fendente, 21 muso_terrore, 25 zanna_lacerante, 29 stritolamorso, 33 frenesia, 37 testata_cieca, 41 artiglio_antico, 45 danza_predatore, 49 carica_preistorica'); // Charmander line
const GUSCIO = ls('1 spinta, 1 ritirata, 5 sassi, 9 azzannata, 13 indurimento, 17 tomba_sassi, 21 smottamento, 25 siesta, 29 frana, 33 corazza_ferro, 37 testata_acciaio, 41 potere_antico, 45 scossa_fondale, 49 testata_roccia'); // Turtwig, Tirtouga lines
const SCINTILLA = ls('1 spinta, 1 ringhio, 5 scossa, 9 onda_paralizzante, 13 guizzo, 17 carica_elettrica, 21 raggio_carico, 25 scatto_corrente, 29 scarica, 33 accumulo, 37 fulmine, 41 lama_vento, 45 tuono, 49 carica_fulminea'); // Pikachu, Chinchou
const POLPO = ls('1 stretta, 1 getto_acqua, 5 nube_inchiostro, 9 pulsazione, 13 lambita, 17 assorbimento, 21 ipnosi, 25 getto_inchiostro, 29 calma, 33 succhiavita, 37 sfera_ombra, 41 rigenerazione, 45 onda_mentale'); // Octillery
const KRAKEN = ls('1 stretta, 1 nube_inchiostro, 5 lambita, 9 getto_inchiostro, 13 ipnosi, 17 succhiavita, 21 artiglio_ombra, 25 sfera_ombra, 29 trama_oscura, 33 impulso_oscuro, 37 bomba_melma, 41 rigenerazione, 45 onda_mentale, 49 fango_nero'); // Malamar, Dragalge
const CALAMARO = ls('1 stretta, 1 nube_inchiostro, 5 lambita, 9 pulsazione, 13 getto_inchiostro, 17 ipnosi, 21 succhiavita, 25 impulso_oscuro, 29 sfera_ombra, 33 trama_oscura, 37 onda_mentale, 41 stritolamorso, 45 bomba_melma, 49 fango_nero'); // Malamar
const NAPOLEONE = ls('1 spinta, 1 bollicine, 5 indurimento, 10 azzannata, 15 getto_acqua, 20 capocciata, 24 siesta, 28 gemma_corallo, 32 corazza_ferro, 36 testata_acciaio, 40 maremoto, 45 scossa_fondale'); // Bibarel, Relicanth
const PALLA = ls('1 spinta, 1 aculeo, 5 indurimento, 9 bollicine, 13 aculei, 17 morso_velenoso, 21 corazza_ferro, 25 pungiglione, 29 veleno_profondo, 33 siesta, 37 bomba_melma, 41 testata_acciaio, 45 fango_nero'); // Qwilfish

export const LEARNSETS: Record<string, LearnEntry[]> = {
  zanna: ZANNA,
  squarcio: [...ls('0 zanna_lunga'), ...ZANNA],
  zannarossa: [...ls('0 zanna_lunga, 0 taglio_buio, 47 assalto'), ...ZANNA],
  guscio: GUSCIO,
  rocciaguscio: [...ls('0 coda_acciaio'), ...GUSCIO],
  archelon: [...ls('0 coda_acciaio, 0 lama_pietra'), ...GUSCIO],
  scintilla: SCINTILLA,
  saetta: [...ls('0 zanna_elettrica'), ...SCINTILLA],
  folgore: [...ls('0 zanna_elettrica, 0 cannone_elettrico'), ...SCINTILLA],
  barracuda: ls('1 spinta, 1 sguardo_feroce, 4 guizzo, 8 azzannata, 12 morsi_raffica, 16 fendente, 20 muso_terrore, 24 zanna_lunga, 28 agguato, 32 stritolamorso, 36 frenesia, 40 taglio_buio, 45 carica_suicida'), // Carvanha
  tartaruga_marina: ls('1 spinta, 1 ritirata, 5 bollicine, 9 azzannata, 13 getto_acqua, 17 indurimento, 21 raggio_bolle, 25 siesta, 29 codata, 33 corazza_ferro, 37 maremoto, 41 testata_acciaio, 45 idrogetto'), // Squirtle
  torpedine: ls('1 bollicine, 1 onda_paralizzante, 5 scossa, 9 lampo, 13 getto_acqua, 17 carica_elettrica, 21 raggio_carico, 25 onda_urto, 29 scarica, 33 accumulo, 37 fulmine, 42 tuono, 47 cannone_elettrico'), // Chinchou
  squalo_bianco: SHARK,
  squalo_tigre: SHARK,
  squalo_capopiatto: SHARK,
  megalodonte: SHARK,
  squalo_nutrice: ls('1 spinta, 1 ringhio, 5 azzannata, 10 sabbia, 15 capocciata, 20 schiacciata, 25 siesta, 30 stritolamorso, 35 frenesia, 40 testata_cieca, 45 forza_bruta'), // Snorlax-like bottom dweller
  squalo_goblin: ls('1 spinta, 1 sguardo_feroce, 6 azzannata, 11 ombra_furtiva, 16 lampo, 21 zanna_lunga, 26 agguato, 31 stritolamorso, 36 artiglio_ombra, 41 frenesia, 46 taglio_buio'), // Sharpedo, dark
  livyatan: ls('1 spinta, 1 ringhio, 5 azzannata, 10 schiacciata, 15 muso_terrore, 20 stritolamorso, 25 capocciata, 30 frenesia, 35 zanna_lunga, 40 carica_preistorica, 45 forza_bruta, 50 carica_suicida'), // Gyarados
  coccodrillo_nilo: ls('1 graffio, 1 sguardo_feroce, 6 azzannata, 11 sabbia, 16 schizzo_fango, 21 stritolamorso, 26 smottamento, 31 frenesia, 36 coda_acciaio, 41 scossa_fondale, 46 forza_bruta'), // Krookodile
  coccodrillo_marino: ls('1 graffio, 1 sguardo_feroce, 6 azzannata, 11 scatto_acqua, 16 muso_terrore, 21 stritolamorso, 26 fendente, 31 frenesia, 36 codata, 41 schiacciata, 46 assalto'), // Feraligatr
  varano_nilo: ls('1 graffio, 1 sguardo_feroce, 6 azzannata, 11 guizzo, 16 morso_velenoso, 21 fendente, 26 muso_terrore, 31 stritolamorso, 36 danza_predatore, 41 artiglio_antico, 46 carica_preistorica'), // Komodo: Garchomp, Salazzle
  pesce_palla: PALLA,
  istrice_gigante: [...ls('0 lama_pietra'), ...PALLA],
  murena: ls('1 stretta, 1 sguardo_feroce, 5 azzannata, 9 ombra_furtiva, 13 morso_velenoso, 17 agguato, 21 stritolamorso, 25 artiglio_ombra, 29 sfera_ombra, 33 trama_oscura, 37 impulso_oscuro, 41 pungiglione, 45 fango_nero'), // Seviper, Ekans
  squalo_martello: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 scossa, 13 guizzo, 17 zanna_elettrica, 21 onda_urto, 25 scatto_corrente, 29 stritolamorso, 33 scarica, 37 fulmine, 41 testata_cieca, 45 tuono, 49 carica_fulminea'), // Sharpedo + electric sense
  manta: ls('1 spinta, 1 bollicine, 6 raffica, 11 raggio_bolle, 16 capocciata, 21 scatto_corrente, 26 colpo_ala, 31 onda_marina, 36 testata_cieca, 41 lama_vento, 46 idrogetto, 50 uragano'), // Mantine
  cernia: ls('1 spinta, 1 bollicine, 6 azzannata, 11 indurimento, 16 capocciata, 21 schiacciata, 26 siesta, 31 testata_acciaio, 36 corazza_ferro, 41 risalita, 46 scossa_fondale'), // Relicanth
  pesce_napoleone: NAPOLEONE,
  napoleone_corazzato: [...ls('0 testata_roccia'), ...NAPOLEONE],
  pastinaca: ls('1 sabbia, 1 aculeo, 5 scossa, 9 schizzo_fango, 13 onda_paralizzante, 17 pungiglione, 21 carica_elettrica, 25 colpo_fango, 29 scarica, 33 veleno_profondo, 37 fulmine, 42 bomba_melma, 46 tuono'), // Stunfisk, Gligar
  pesce_leone: ls('1 aculeo, 1 sguardo_feroce, 5 spore, 9 bava_acida, 13 morso_velenoso, 17 pinne_danzanti, 21 pungiglione, 25 veleno_profondo, 29 sfera_ombra, 33 bomba_melma, 38 trama_oscura, 43 fango_nero'), // Qwilfish, Toxapex
  medusa_gigante: ls('1 aculeo, 1 stretta, 5 bava_acida, 9 scossa, 13 onda_paralizzante, 17 raggio_bolle, 21 pungiglione, 25 scarica, 29 veleno_profondo, 33 acqua_ferma, 37 fulmine, 41 bomba_melma, 45 idrogetto'), // Tentacruel
  pesce_vela: ls('1 spinta, 1 guizzo, 5 bollicine, 9 colpo_ala, 13 scatto_corrente, 17 scatto_acqua, 21 picchiata, 25 fendente, 29 lama_vento, 33 risalita, 37 codata, 41 tuffo, 46 uragano'), // Swellow, Basculin
  chimera: ls('1 spinta, 1 lampo, 5 lambita, 9 pulsazione, 13 ipnosi, 17 ombra_furtiva, 21 rigenerazione, 25 calma, 29 sfera_ombra, 33 mente_vuota, 37 onda_mentale, 42 impulso_oscuro'), // Misdreavus, Slowpoke
  dragone_nero: ls('1 azzannata, 1 lampo, 5 ombra_furtiva, 9 lambita, 13 zanna_lunga, 17 artiglio_ombra, 21 nube_inchiostro, 25 sfera_ombra, 29 stritolamorso, 33 trama_oscura, 37 impulso_oscuro, 42 taglio_buio'), // Lanturn, Sableye
  granchio_ragno: ls('1 pinza, 1 sguardo_feroce, 5 bollicine, 9 indurimento, 13 schizzo_fango, 17 chela_acciaio, 21 tomba_sassi, 25 fendente, 29 corazza_ferro, 33 martello_chela, 37 guscio_spezzato, 41 testata_acciaio, 45 scossa_fondale'), // Kingler
  tonno: ls('1 spinta, 1 guizzo, 5 bollicine, 9 azzannata, 13 scatto_acqua, 17 capocciata, 21 scatto_corrente, 25 risalita, 29 testata_cieca, 33 danza_predatore, 37 codata, 42 carica_suicida'), // Basculin
  delfino: ls('1 spinta, 1 getto_acqua, 5 guizzo, 9 raffica, 13 onda_marina, 17 onda_urto, 21 scatto_acqua, 25 picchiata, 29 risalita, 33 scatto_corrente, 37 lama_vento, 41 maremoto, 45 uragano'), // Palafin
  pesce_luna: ls('1 spinta, 1 bollicine, 5 indurimento, 10 schiacciata, 15 siesta, 20 getto_acqua, 25 corazza_ferro, 30 gemma_corallo, 35 letargo, 40 maremoto, 45 lampo_acciaio'), // Alomomola
  scorfano: ls('1 aculeo, 1 sabbia, 5 schizzo_fango, 9 morso_velenoso, 13 indurimento, 17 agguato, 21 pungiglione, 25 veleno_profondo, 29 colpo_fango, 33 bomba_melma, 38 rigenerazione, 43 fango_nero'), // Stunfisk, Qwilfish
  pesce_spada: ls('1 spinta, 1 sguardo_feroce, 5 guizzo, 9 morsi_raffica, 13 scatto_acqua, 17 fendente, 21 frenesia, 25 taglio_buio, 29 risalita, 33 codata, 37 testata_cieca, 42 assalto, 47 carica_suicida'), // Seaking, Sirfetch'd
  squalo_volpe: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 raffica, 13 colpo_coda, 17 guizzo, 21 lama_vento, 25 zanna_elettrica, 29 scatto_corrente, 33 codata, 37 scarica, 41 uragano, 45 tuffo'), // Sharpedo + tail
  tricheco: ls('1 spinta, 1 neve, 5 ringhio, 9 getto_acqua, 13 schiacciata, 17 scheggia, 21 zanna_gelo, 25 letargo, 29 vento_polare, 33 stritolamorso, 37 raggio_gelido, 41 maremoto, 46 bufera'), // Walrein
  elefante_marino: ls('1 spinta, 1 ringhio, 5 neve, 9 getto_acqua, 13 capocciata, 17 schiacciata, 21 scheggia, 25 zanna_gelo, 29 letargo, 33 stalattite, 37 raggio_gelido, 41 testata_cieca, 46 bufera'), // Sealeo, Walrein
  megattera: ls('1 spinta, 1 getto_acqua, 5 canto, 9 bollicine, 13 schiacciata, 17 onda_marina, 21 letargo, 25 aurora, 29 acqua_ferma, 33 maremoto, 37 raggio_gelido, 41 testata_cieca, 45 idrogetto, 49 bufera'), // Wailord
  re_corallo: ls('1 spinta, 1 indurimento, 5 bollicine, 9 sassi, 13 siesta, 17 raggio_bolle, 21 tomba_sassi, 25 gemma_corallo, 29 potere_antico, 33 corazza_ferro, 37 lampo_acciaio, 41 eruzione, 45 lama_pietra'), // Corsola
  lontra_marina: ls('1 graffio, 1 getto_acqua, 5 guizzo, 9 sassi, 13 neve, 17 scatto_acqua, 21 zanna_gelo, 25 aurora, 29 vento_polare, 33 letargo, 37 raggio_gelido, 41 codata, 45 maremoto'), // Oshawott, Buizel
  anguilla_elettrica: ls('1 stretta, 1 scossa, 5 azzannata, 9 onda_paralizzante, 13 carica_elettrica, 17 zanna_elettrica, 21 raggio_carico, 25 accumulo, 29 scarica, 33 stritolamorso, 37 fulmine, 42 tuono, 47 cannone_elettrico'), // Eelektross
  polpo_gigante: POLPO,
  piovra: KRAKEN,
  kraken: KRAKEN,
  calamaro_gigante: CALAMARO,
  calamaro_colossale: CALAMARO,
  foca_leopardo: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 neve, 13 scatto_acqua, 17 zanna_gelo, 21 scheggia, 25 stritolamorso, 29 vento_polare, 33 frenesia, 37 stalattite, 41 raggio_gelido, 45 bufera'), // Dewgong, Sharpedo
  beluga: ls('1 spinta, 1 getto_acqua, 5 canto, 9 neve, 13 onda_marina, 17 pulsazione, 21 aurora, 25 letargo, 29 acqua_ferma, 33 raggio_gelido, 37 calma, 41 maremoto, 45 bufera'), // Lapras
  narvalo: ls('1 spinta, 1 neve, 5 guizzo, 9 getto_acqua, 13 scheggia, 17 ghiaccioli, 21 aurora, 25 stalattite, 29 vento_polare, 33 frenesia, 37 raggio_gelido, 41 codata, 45 bufera'), // Dewgong, Cetitan
  orca: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 getto_acqua, 13 scatto_acqua, 17 zanna_gelo, 21 stritolamorso, 25 risalita, 29 frenesia, 33 raggio_gelido, 37 codata, 41 maremoto, 45 bufera, 49 carica_suicida'), // Wailord + Sharpedo
  rana_pescatrice: ls('1 lampo, 1 azzannata, 5 lambita, 9 ipnosi, 13 agguato, 17 ombra_furtiva, 21 stritolamorso, 25 sfera_ombra, 29 trama_oscura, 33 succhiavita, 37 impulso_oscuro, 41 rigenerazione, 45 onda_mentale'), // Lanturn
  capodoglio: ls('1 spinta, 1 getto_acqua, 5 pulsazione, 9 schiacciata, 13 azzannata, 17 onda_marina, 21 sfera_ombra, 25 letargo, 29 stritolamorso, 33 onda_mentale, 37 maremoto, 41 impulso_oscuro, 45 testata_cieca, 49 idrogetto'), // Wailord
  isopode_gigante: ls('1 spinta, 1 indurimento, 5 sabbia, 9 assorbimento, 13 ritirata, 17 tomba_sassi, 21 siesta, 25 sanguisuga, 29 corazza_ferro, 33 frana, 37 testata_acciaio, 41 scossa_fondale'), // Golisopod
  serpente_di_mare: ls('1 stretta, 1 sguardo_feroce, 5 scossa, 9 azzannata, 13 onda_paralizzante, 17 carica_elettrica, 21 muso_terrore, 25 lama_vento, 29 danza_predatore, 33 fulmine, 37 codata, 41 uragano, 45 tuono'), // Dragonair, Gyarados
  mosasauro: ls('1 spinta, 1 sguardo_feroce, 5 azzannata, 9 schizzo_fango, 13 muso_terrore, 17 tomba_sassi, 21 stritolamorso, 25 codata, 29 frana, 33 danza_predatore, 37 coda_acciaio, 41 lama_pietra, 45 carica_preistorica, 49 testata_roccia'), // Tyrantrum
  dunkleosteus: ls('1 azzannata, 1 indurimento, 5 sguardo_feroce, 9 tomba_sassi, 13 stritolamorso, 17 testata_acciaio, 21 corazza_ferro, 25 zanna_lunga, 29 frana, 33 frenesia, 37 coda_acciaio, 41 lama_pietra, 45 carica_preistorica, 49 testata_roccia'), // Tyrantrum, Arctovish
  leviatano: ls('1 maremoto, 1 stritolamorso, 1 muso_terrore, 1 ira_leviatano, 30 frenesia, 40 idrogetto, 50 abisso_primordiale'), // Arceus, Kyogre
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
