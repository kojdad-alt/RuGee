// Pety z vajec: vejce se kupují v menu Pety za duše a občas padnou z bosse. Z vejce se vylíhne náhodný pet
// náhodné rarity, jeden pet je aktivní, běží nebo letí za hrdinou a dává jeden malý bonus podle druhu. Jen
// pravidla a data, bez DOM a bez úložiště (to je ulozeni.js), co pet dělá ve hře, je v hra.js (petHrdiny).
//
// Síla peta = síla rarity × (1 + RUST_UROVNE × (úroveň − 1)), úroveň 1 až MAX_UROVEN. Duplikát: vzácnější rarita
// přepíše horší (úroveň zůstane), jinak je pet o úroveň výš, a na maximu se z něj stanou duše (DUSE_ZA_DUPLIKAT).
// Pojistka: nejpozději každé POJISTKA_PETU. vejce je aspoň epické (odEpicke = kolik vajec za sebou epické nebylo).
//
// bonus = trvalá vlastnost hrdiny na začátku hry: { vlastnost, nasobek } = × (1 + nasobek × síla),
// { vlastnost, pricti } = + pricti × síla. akce = pet něco dělá každých kazdych / √síla s (hra.js, AKCE_PETU).
// leta = pet letí nad zemí (jinak běží). Jméno a popis jsou ve slovníku (pety.<id>), v popisu {n} = hodnota bonusu,
// {s} = sekundy mezi akcemi, {d} = poškození. Sprite peta se jmenuje pet_<id> (src/sprity.js), ikona je sprite bonusu.
// Nový pet: řádek do PETY (na konec, pořadí je i v kódu uložení), sprite pet_<id> a texty do src/texty/cs.js i en.js.
import { pripojTexty, t, desetinne } from './texty.js';

export const PETY = {
  sovicka: { ikona: 'moudrost', leta: true, bonus: { vlastnost: 'zkusenosti', nasobek: 0.01 } },
  straka: { ikona: 'magnet', leta: true, bonus: { vlastnost: 'magnet', nasobek: 0.04 }, akce: { kazdych: 6, dosah: 320 } },
  beruska: { ikona: 'srdce', leta: true, bonus: { vlastnost: 'stestiKoristi', pricti: 0.08 } },
  dracek: { ikona: 'plamen', leta: true, akce: { kazdych: 2.5, dosah: 260, poskozeni: 6 } },
  zelvicka: { ikona: 'stit', akce: { kazdych: 45 } },
  krecek: { ikona: 'zlatak', akce: { kazdych: 60 } },
  houbicka: { ikona: 'regenerace', bonus: { vlastnost: 'regenerace', pricti: 0.05 } },
  liska: { ikona: 'boty', bonus: { vlastnost: 'rychlost', nasobek: 0.015 } },
  kocour: { ikona: 'krit', bonus: { vlastnost: 'krit', pricti: 0.01, procenta: true } },
  medvidek: { ikona: 'sila', bonus: { vlastnost: 'sila', nasobek: 0.015 } },
  jezek: { ikona: 'trnovaZbroj', bonus: { vlastnost: 'trnovaZbroj', pricti: 0.05, procenta: true } },
  havran: { ikona: 'chamtivost', leta: true, bonus: { vlastnost: 'chamtivost', nasobek: 0.03 } },
  tucnak: { ikona: 'mraz', akce: { kazdych: 9, dosah: 110, otres: 1 } },
  veverka: { ikona: 'magnet', bonus: { vlastnost: 'magnet', nasobek: 0.02 } },
  motyl: { ikona: 'moudrost', leta: true, bonus: { vlastnost: 'zkusenosti', nasobek: 0.006 } },
  krtek: { ikona: 'regenerace', bonus: { vlastnost: 'regenerace', pricti: 0.03 } },
};
pripojTexty(PETY, 'pety');
export const PORADI_PETU = Object.keys(PETY);

// Rarity petů mají stejné klíče, jména a barvy jako rarity karet (RARITY v hra.js, barvy.js). sance = jak často se
// vylíhne (pevně, Štěstí ze hry ani ze stromu vejce nemění). Mýtická (1 %) a Božská (0,2 %) jsou velmi vzácné
// a mají nejsilnější bonus.
export const RARITY_PETU = {
  bezna: { sila: 1, sance: 0.45 },
  neobvykla: { sila: 1.2, sance: 0.25 },
  vzacna: { sila: 1.4, sance: 0.18 },
  epicka: { sila: 1.9, sance: 0.088 },
  legendarni: { sila: 2.6, sance: 0.02 },
  myticka: { sila: 3.3, sance: 0.01 },
  bozska: { sila: 4.2, sance: 0.002 },
};
export const PORADI_RARIT_PETU = Object.keys(RARITY_PETU);
export const MAX_UROVEN = 5;
export const RUST_UROVNE = 0.2;
export const POJISTKA_PETU = 10;
export const CENA_VEJCE = 100;
export const DUSE_ZA_DUPLIKAT = 20;
// Šance, že zabitý boss nechá vejce (los bez rng, ať se náhoda vln neposune: losZCisel).
export const SANCE_VEJCE = 0.3;
const MAX_VAJEC = 999;
const MAX_CISLA = 1e9;

const cele = (x, max = MAX_CISLA) => (Number.isFinite(x) ? Math.min(max, Math.max(0, Math.floor(x))) : 0);
const objekt = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

export function silaPetu(rarita, uroven = 1) {
  const r = RARITY_PETU[rarita] ?? RARITY_PETU.bezna;
  const u = Math.min(MAX_UROVEN, Math.max(1, Math.floor(uroven) || 1));
  return r.sila * (1 + RUST_UROVNE * (u - 1));
}
export const MAX_SILA = silaPetu(PORADI_RARIT_PETU.at(-1), MAX_UROVEN);

// Za kolik sekund pet zopakuje svou akci (silnější pet častěji).
export function intervalPetu(druh, sila) {
  const a = PETY[druh]?.akce;
  return a ? a.kazdych / Math.sqrt(Math.max(1, sila)) : null;
}

// Poškození Dráčka na jeden plivanec (ještě se násobí Sílou hrdiny jako každý zásah).
export function poskozeniPetu(druh, sila) {
  return (PETY[druh]?.akce?.poskozeni ?? 0) * sila;
}

// Jak dlouho Tučňák zpomalí nepřátele kolem hrdiny.
export function mrazPetu(druh, sila) {
  return (PETY[druh]?.akce?.otres ?? 0) * Math.sqrt(Math.max(1, sila));
}

// Pet do hry: { druh, rarita, uroven } se správnými hodnotami, nebo null (bez peta / neznámý druh).
export function platnyPet(pet) {
  if (!pet || typeof pet !== 'object' || !Object.hasOwn(PETY, pet.druh)) return null;
  const rarita = Object.hasOwn(RARITY_PETU, pet.rarita) ? pet.rarita : 'bezna';
  const uroven = Number.isInteger(pet.uroven) ? Math.min(MAX_UROVEN, Math.max(1, pet.uroven)) : 1;
  return { druh: pet.druh, rarita, uroven };
}

// Bonus peta do vlastností hrdiny na začátku hry.
export function pouzijPeta(hrdina, pet) {
  const p = platnyPet(pet);
  const b = p && PETY[p.druh].bonus;
  if (!b) return;
  const sila = silaPetu(p.rarita, p.uroven);
  if (b.nasobek) hrdina[b.vlastnost] *= 1 + b.nasobek * sila;
  if (b.pricti) hrdina[b.vlastnost] += b.pricti * sila;
}

// Čísla do popisu: n = bonus v procentech (nebo životy za sekundu), s = sekundy mezi akcemi, d = poškození.
const kratce = (x) => desetinne(String(Math.round(x * 10) / 10));
export function hodnotyPetu(druh, rarita, uroven) {
  const d = PETY[druh];
  const sila = silaPetu(rarita, uroven);
  const b = d.bonus;
  const n = b ? (b.nasobek ? b.nasobek * sila * 100 : b.pricti * sila * (b.procenta || b.vlastnost === 'stestiKoristi' ? 100 : 1)) : 0;
  return {
    // Životy za sekundu jsou malá čísla, ty na setiny (0,05), procenta na desetiny.
    n: b?.vlastnost === 'regenerace' ? desetinne(String(Math.round(n * 100) / 100)) : kratce(n),
    s: d.akce ? kratce(intervalPetu(druh, sila)) : '',
    d: d.akce?.poskozeni ? String(Math.round(poskozeniPetu(druh, sila))) : '',
  };
}

export function popisPetu(druh, rarita = 'bezna', uroven = 1) {
  return t(`pety.${druh}.popis`, hodnotyPetu(druh, rarita, uroven));
}

// ---------- Sbírka petů v profilu ----------

// Stav v profilu: vejce = neotevřená vejce, aktivni = id peta, který jde do hry (null = žádný), sbirka = { id:
// { rarita, uroven } }, otevreno = kolik vajec už hráč otevřel, odEpicke = kolik vajec za sebou nebylo aspoň epické.
// Cokoli rozbitého se zahodí, aktivní pet musí být ve sbírce.
export function platnePety(zaznam) {
  const d = objekt(zaznam);
  const zdroj = objekt(d.sbirka);
  const sbirka = {};
  for (const id of PORADI_PETU) {
    if (!Object.hasOwn(zdroj, id)) continue;
    const p = objekt(zdroj[id]);
    if (!Object.hasOwn(RARITY_PETU, p.rarita)) continue;
    sbirka[id] = { rarita: p.rarita, uroven: Number.isInteger(p.uroven) ? Math.min(MAX_UROVEN, Math.max(1, p.uroven)) : 1 };
  }
  return {
    vejce: cele(d.vejce, MAX_VAJEC),
    aktivni: typeof d.aktivni === 'string' && Object.hasOwn(sbirka, d.aktivni) ? d.aktivni : null,
    sbirka,
    otevreno: cele(d.otevreno),
    odEpicke: cele(d.odEpicke, POJISTKA_PETU - 1),
  };
}

// Pet, se kterým se půjde hrát (null = žádný).
export function petDoHry(stav) {
  const s = platnePety(stav);
  return s.aktivni ? { druh: s.aktivni, ...s.sbirka[s.aktivni] } : null;
}

export function zvolPeta(stav, id) {
  const s = platnePety(stav);
  return { ...s, aktivni: id && Object.hasOwn(s.sbirka, id) ? id : null };
}

export function pridejVejce(stav, kolik = 1) {
  const s = platnePety(stav);
  return { ...s, vejce: cele(s.vejce + Math.max(0, Math.floor(kolik) || 0), MAX_VAJEC) };
}

// Nákup vejce za duše: vrací { pety, duse } (duše, které zbydou), nebo null, když duše nestačí.
export function kupVejce(stav, duse) {
  const s = platnePety(stav);
  if (!(duse >= CENA_VEJCE) || s.vejce >= MAX_VAJEC) return null;
  return { pety: { ...s, vejce: s.vejce + 1 }, duse: duse - CENA_VEJCE };
}

// Šance na každou raritu při otevření (součet 1). S pojistkou (poslední vejce před POJISTKA_PETU) jen epická a lepší.
export function sanceRaritPetu(odEpicke = 0) {
  const pojistka = odEpicke >= POJISTKA_PETU - 1;
  const vahy = Object.fromEntries(PORADI_RARIT_PETU.map((id) => [id, pojistka && RARITY_PETU[id].sila < RARITY_PETU.epicka.sila ? 0 : RARITY_PETU[id].sance]));
  const soucet = Object.values(vahy).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(vahy).map(([id, v]) => [id, v / soucet]));
}

export function rarituZLosu(los, odEpicke = 0) {
  let zbyva = Math.min(Math.max(Number(los) || 0, 0), 1 - 1e-12);
  for (const [id, sance] of Object.entries(sanceRaritPetu(odEpicke))) {
    if (zbyva < sance) return id;
    zbyva -= sance;
  }
  return PORADI_RARIT_PETU.at(-1);
}

const PORADI = Object.fromEntries(PORADI_RARIT_PETU.map((id, i) => [id, i]));

// Otevře jedno vejce (losDruhu a losRarity jsou čísla 0 až 1, v menu z Math.random, v testu pevná). Vrací
// { pety, vysledek } nebo null, když vejce nejsou. vysledek = { druh, rarita (vylíhnutá), raritaPeta a uroven (pet
// po otevření), zmena: 'novy' | 'rarita' | 'uroven' | 'duse', predtim (pet před otevřením nebo null), duse (duše
// za duplikát) }.
// První vylíhnutý pet se rovnou zvolí jako aktivní.
export function otevriVejce(stav, losDruhu, losRarity) {
  const s = platnePety(stav);
  if (s.vejce < 1) return null;
  const rarita = rarituZLosu(losRarity, s.odEpicke);
  const druh = PORADI_PETU[Math.min(PORADI_PETU.length - 1, Math.max(0, Math.floor((Number(losDruhu) || 0) * PORADI_PETU.length)))];
  const predtim = s.sbirka[druh] ?? null;
  let novy;
  let zmena;
  let duse = 0;
  if (!predtim) {
    novy = { rarita, uroven: 1 };
    zmena = 'novy';
  } else if (PORADI[rarita] > PORADI[predtim.rarita]) {
    novy = { rarita, uroven: predtim.uroven };
    zmena = 'rarita';
  } else if (predtim.uroven < MAX_UROVEN) {
    novy = { rarita: predtim.rarita, uroven: predtim.uroven + 1 };
    zmena = 'uroven';
  } else {
    novy = predtim;
    zmena = 'duse';
    duse = DUSE_ZA_DUPLIKAT;
  }
  const sbirka = platnePety({ sbirka: { ...s.sbirka, [druh]: novy } }).sbirka;
  const pety = {
    vejce: s.vejce - 1,
    aktivni: s.aktivni ?? druh,
    sbirka,
    otevreno: Math.min(MAX_CISLA, s.otevreno + 1),
    odEpicke: PORADI[rarita] >= PORADI.epicka ? 0 : Math.min(POJISTKA_PETU - 1, s.odEpicke + 1),
  };
  return { pety, vysledek: { druh, rarita, uroven: novy.uroven, raritaPeta: novy.rarita, zmena, predtim, duse } };
}

// Za kolik vajec nejpozději přijde aspoň epický pet (pro okno).
export function doPojistky(stav) {
  return POJISTKA_PETU - platnePety(stav).odEpicke;
}

// Los 0 až 1 z několika celých čísel (promíchání bitů jako ve splitmix32), bez rng: na vejce z bosse.
export function losZCisel(...cisla) {
  let h = 0x6b43a9b5;
  for (const c of cisla) {
    h = Math.imul(h ^ (Math.floor(c) | 0), 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
    h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

// Přehled sbírky: kolik druhů je objeveno, kolik jich je celkem a součet úrovní.
export function prehledPetu(stav) {
  const s = platnePety(stav);
  return { druhu: Object.keys(s.sbirka).length, celkem: PORADI_PETU.length, vejce: s.vejce, otevreno: s.otevreno };
}
