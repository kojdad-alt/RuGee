// Duše a trvalá vylepšení: po každé hře přibudou duše a v menu Vylepšení se za ně kupují úrovně uzlů stromu,
// které platí od začátku každé další hry. Jen pravidla, bez DOM a bez úložiště (to je ulozeni.js).
//
// Strom: uprostřed jsou duše (STRED, nic nestojí), z něj vede šest větví (VETVE). Uzel jde koupit, až má aspoň
// jednu úroveň jeho rodič (od, uzel blíž středu), první uzel větve má od: null a jde koupit hned. Každá větev se
// po druhém uzlu rozdělí na dvě ramena a každé končí velkým klíčovým uzlem (klicovy), který dělá něco nového,
// ne jen +%. misto = [vzdálenost od středu, posun do strany] v dílcích stromu, okno z toho počítá polohu
// (poziceUzlu). Sedm uzlů má id a čísla původních vylepšení z doby před stromem (sila, zivoty, rychlost, magnet,
// stesti, zkusenosti, oziveni), takže koupené úrovně platí dál beze změny.
//
// efekty uzlu: { vlastnost, nasobek } = vlastnost hrdiny × (1 + nasobek × úroveň), { vlastnost, pricti } =
// vlastnost + pricti × úroveň, { hra, pricti } = pole hry na začátku (zlaťáky, klíče, přehození zdarma),
// trida = platí jen za tu postavu. procenta = číslo do popisu jako procenta (krit 0,02 → 2 %). Co která vlastnost
// dělá, je u hrdiny v novaHra (src/hra.js). Jméno a popis uzlu jsou ve slovníku (větev vylepseni), v popisu {n}
// a {m} = hodnota prvního a druhého efektu na dané úrovni (popisVylepseni).
// Nový uzel: řádek do VYLEPSENI (rodič musí být nad ním), texty do src/texty/cs.js i en.js a id na konec
// PORADI_V_KODU v src/prenos.js. Cena úrovně: cena × rust^úroveň, zaokrouhleno na pětky.

import { pripojTexty, t, desetinne } from './texty.js';

export const STRED = 'stred';
// Úhel větve ve stupních (0 = doprava, −90 = nahoru). Sousední větve spolu souvisí (útok vedle zbraní…).
export const VETVE = {
  utok: { uhel: -90, ikona: 'sila' },
  zbrane: { uhel: -30, ikona: 'rychleRuce' },
  korist: { uhel: 30, ikona: 'chamtivost' },
  vyprava: { uhel: 90, ikona: 'lovec' },
  pohyb: { uhel: 150, ikona: 'boty' },
  obrana: { uhel: 210, ikona: 'srdce' },
};
pripojTexty(VETVE, 'vetveVylepseni');

// Místa uzlů ve větvi: A první, B druhý, pak dvě ramena C–F a klíčový uzel K.
const MISTA = {
  A: [1.6, 0], B: [2.75, 0],
  C1: [3.8, -1], D1: [4.85, -1.45], E1: [5.9, -1.75], F1: [6.95, -1.95], K1: [8.15, -2.1],
  C2: [3.8, 1], D2: [4.85, 1.45], E2: [5.9, 1.75], F2: [6.95, 1.95], K2: [8.15, 2.1],
};

const nas = (vlastnost, nasobek, navic = {}) => ({ vlastnost, nasobek, ...navic });
const pri = (vlastnost, pricti, navic = {}) => ({ vlastnost, pricti, ...navic });
const hry = (pole, pricti) => ({ hra: pole, pricti });
const pct = { procenta: true };

// Uzly větve: [id, místo, rodič, ikona, max, cena, efekty, klicovy]. Rodič null = první uzel větve.
function vetev(id, uzly) {
  return uzly.map(([u, misto, od, ikona, max, cena, efekty, klicovy = false]) => [u, {
    vetev: id, misto: MISTA[misto], od, ikona, max, cena, efekty, ...(klicovy ? { klicovy } : {}),
  }]);
}

export const VYLEPSENI = Object.fromEntries([
  ...vetev('utok', [
    ['sila', 'A', null, 'sila', 5, 30, [nas('sila', 0.05)]],
    ['ostri', 'B', 'sila', 'sila', 5, 40, [nas('sila', 0.01)]],
    ['oko', 'C1', 'ostri', 'krit', 5, 45, [pri('krit', 0.01, pct)]],
    ['tezkaRuka', 'D1', 'oko', 'sila', 3, 60, [nas('sila', 0.01)]],
    ['presnost', 'E1', 'tezkaRuka', 'krit', 3, 80, [pri('krit', 0.01, pct)]],
    ['rozhodnost', 'F1', 'presnost', 'sila', 3, 110, [nas('sila', 0.01)]],
    ['krvaveOstri', 'K1', 'rozhodnost', 'krit', 1, 450, [pri('kritNavic', 0.5)], true],
    ['rozmach', 'C2', 'ostri', 'rozpeti', 5, 45, [nas('rozpeti', 0.01)]],
    ['vytrvalost', 'D2', 'rozmach', 'vydrz', 3, 60, [nas('vydrz', 0.02)]],
    ['ozvena', 'E2', 'vytrvalost', 'ozvena', 3, 80, [pri('ozvena', 0.01, pct)]],
    ['zlost', 'F2', 'ozvena', 'sila', 3, 110, [nas('sila', 0.01)]],
    ['popravci', 'K2', 'zlost', 'lebka', 1, 500, [pri('popravci', 0.05, pct)], true],
  ]),
  ...vetev('zbrane', [
    ['hbitost', 'A', null, 'rychleRuce', 5, 35, [nas('nabijeni', -0.01)]],
    ['zasoba', 'B', 'hbitost', 'prehozeni', 3, 40, [hry('prehozeniZdarma', 1)]],
    ['zrucnost', 'C1', 'zasoba', 'rychleRuce', 3, 50, [nas('nabijeni', -0.01)]],
    ['dosah', 'D1', 'zrucnost', 'rozpeti', 3, 65, [nas('rozpeti', 0.01)]],
    ['kovar', 'E1', 'dosah', 'krumpac', 2, 90, [pri('startUrovne', 1)]],
    ['mistrovstvi', 'F1', 'kovar', 'rychleRuce', 3, 120, [nas('nabijeni', -0.01)]],
    ['prival', 'K1', 'mistrovstvi', 'prival', 1, 550, [pri('prival', 1)], true],
    ['vybiravost', 'C2', 'zasoba', 'tajemno', 5, 45, [nas('stestiKaret', 0.08)]],
    ['druhyPohled', 'D2', 'vybiravost', 'prehozeni', 2, 65, [hry('prehozeniZdarma', 1)]],
    ['vzacnost', 'E2', 'druhyPohled', 'tajemno', 3, 90, [nas('stestiKaret', 0.08)]],
    ['dozvuk', 'F2', 'vzacnost', 'ozvena', 3, 120, [pri('ozvena', 0.01, pct)]],
    ['arzenal', 'K2', 'dozvuk', 'cep', 1, 600, [pri('arzenal', 1)], true],
  ]),
  ...vetev('korist', [
    ['magnet', 'A', null, 'magnet', 5, 20, [nas('magnet', 0.1)]],
    ['stesti', 'B', 'magnet', 'stesti', 5, 30, [nas('stesti', 0.2)]],
    ['mesec', 'C1', 'stesti', 'zlatak', 3, 45, [hry('zlataky', 5)]],
    ['smlouvani', 'D1', 'mesec', 'vuz', 3, 60, [pri('sleva', 0.04, pct)]],
    ['klicnik', 'E1', 'smlouvani', 'klic', 2, 90, [hry('klice', 1)]],
    ['sberatel', 'F1', 'klicnik', 'chamtivost', 3, 120, [nas('chamtivost', 0.04)]],
    ['sklizen', 'K1', 'sberatel', 'duse', 1, 600, [nas('chamtivost', 0.2)], true],
    ['pritazlivost', 'C2', 'stesti', 'magnet', 3, 45, [nas('magnet', 0.05)]],
    ['leciva', 'D2', 'pritazlivost', 'srdce', 3, 60, [nas('leceniSrdce', 0.2)]],
    ['lakota', 'E2', 'leciva', 'chamtivost', 3, 90, [nas('chamtivost', 0.04)]],
    ['hutne', 'F2', 'lakota', 'krystal', 3, 120, [nas('zkusenosti', 0.02)]],
    ['bourka', 'K2', 'hutne', 'magnet', 1, 550, [pri('bourka', 60)], true],
  ]),
  ...vetev('vyprava', [
    ['zkusenosti', 'A', null, 'moudrost', 5, 35, [nas('zkusenosti', 0.05)]],
    ['vycvik', 'B', 'zkusenosti', 'moudrost', 3, 45, [nas('zkusenosti', 0.01)]],
    ['stezka', 'C1', 'vycvik', 'lovec', 3, 50, [nas('rychlost', 0.02, { trida: 'lovec' }), nas('sila', 0.02, { trida: 'lovec' })]],
    ['drina', 'D1', 'stezka', 'havir', 3, 60, [pri('maxHp', 5, { trida: 'havir' }), nas('sila', 0.02, { trida: 'havir' })]],
    ['lampa', 'E1', 'drina', 'svetlonos', 3, 70, [nas('magnet', 0.05, { trida: 'svetlonos' }), nas('sila', 0.02, { trida: 'svetlonos' })]],
    ['hnev', 'F1', 'lampa', 'bourlivak', 3, 80, [nas('nabijeni', -0.01, { trida: 'bourlivak' }), nas('sila', 0.02, { trida: 'bourlivak' })]],
    ['mistr', 'K1', 'hnev', 'stesti', 1, 600, [pri('mistrPostavy', 0.5, pct)], true],
    ['lovecBossu', 'C2', 'vycvik', 'strazce_hlava', 3, 50, [nas('silaNaBosse', 0.03)]],
    ['lovecElit', 'D2', 'lovecBossu', 'kost', 3, 65, [nas('silaNaElity', 0.03)]],
    ['premozitel', 'E2', 'lovecElit', 'strazce_hlava', 3, 90, [nas('silaNaBosse', 0.03)]],
    ['postrach', 'F2', 'premozitel', 'kost', 3, 120, [nas('silaNaElity', 0.03)]],
    ['trofeje', 'K2', 'postrach', 'truhla', 1, 550, [pri('trofeje', 0.03, pct)], true],
  ]),
  ...vetev('pohyb', [
    ['rychlost', 'A', null, 'boty', 5, 25, [nas('rychlost', 0.04)]],
    ['lehkost', 'B', 'rychlost', 'boty', 3, 40, [nas('rychlost', 0.01)]],
    ['brodeni', 'C1', 'lehkost', 'slizak', 3, 45, [pri('brodeni', 0.15, pct)]],
    ['ostruhy', 'D1', 'brodeni', 'ledovyKrystal', 3, 60, [pri('ostruhy', 0.15, pct)]],
    ['otuzilost', 'E1', 'ostruhy', 'plamen', 3, 80, [pri('odolnostLave', 0.1, pct)]],
    ['cistyDech', 'F1', 'otuzilost', 'houbak', 3, 110, [pri('odolnostJedu', 0.1, pct)]],
    ['poutnik', 'K1', 'cistyDech', 'stopa', 1, 500, [pri('poutnik', 1)], true],
    ['unik', 'C2', 'lehkost', 'vydrz', 3, 45, [nas('poRane', 0.05)]],
    ['zvedavost', 'D2', 'unik', 'magnet', 3, 60, [nas('magnet', 0.05)]],
    ['vitr', 'E2', 'zvedavost', 'boty', 3, 85, [nas('rychlost', 0.01)]],
    ['klickovani', 'F2', 'vitr', 'vydrz', 3, 115, [nas('poRane', 0.05)]],
    ['bludnyKrok', 'K2', 'klickovani', 'duch', 1, 600, [pri('bludnyKrok', 1)], true],
  ]),
  ...vetev('obrana', [
    ['zivoty', 'A', null, 'srdce', 5, 25, [pri('maxHp', 10)]],
    ['odolnost', 'B', 'zivoty', 'srdce', 5, 40, [pri('maxHp', 3)]],
    ['oziveni', 'C1', 'odolnost', 'duse', 1, 150, [pri('oziveni', 1)]],
    ['hojeni', 'D1', 'oziveni', 'regenerace', 5, 60, [pri('regenerace', 0.05)]],
    ['houzevnatost', 'E1', 'hojeni', 'srdce', 3, 85, [pri('maxHp', 5)]],
    ['obnova', 'F1', 'houzevnatost', 'regenerace', 3, 115, [pri('regenerace', 0.05)]],
    ['posledniVzdor', 'K1', 'obnova', 'duse', 1, 700, [pri('posledniVzdor', 1)], true],
    ['pancir', 'C2', 'odolnost', 'zbroj', 1, 60, [pri('pancir', 1)]],
    ['trny', 'D2', 'pancir', 'trnovaZbroj', 3, 65, [pri('trnovaZbroj', 0.05, pct)]],
    ['upir', 'E2', 'trny', 'upiriZub', 3, 90, [pri('upiri', 0.01, pct)]],
    ['dobiti', 'F2', 'upir', 'stit', 3, 115, [pri('dobitiStitu', -0.5)]],
    ['bublina', 'K2', 'dobiti', 'stit', 1, 600, [pri('bublina', 1)], true],
  ]),
]);
pripojTexty(VYLEPSENI, 'vylepseni');

// Poloha uzlu v dílcích stromu (střed = 0, 0; y dolů jako na obrazovce).
export function poziceUzlu(id) {
  if (id === STRED || !VYLEPSENI[id]) return { x: 0, y: 0 };
  const v = VYLEPSENI[id];
  const [d, s] = v.misto;
  const u = (VETVE[v.vetev].uhel * Math.PI) / 180;
  return { x: d * Math.cos(u) - s * Math.sin(u), y: d * Math.sin(u) + s * Math.cos(u) };
}

// Za kolik se hra promění v duše: 1 duše za každých sekund přežití, za každých zabitych zabitých, strazce duší
// za každého bosse (klíč strazce zůstal z doby, kdy byl boss jen jeden) a 1 duše za každých zlataku zlaťáků,
// které hrdina neutratil (zbytek pod zlataku propadne). Pasiva Chamtivost (hrdina.chamtivost) pak součet násobí,
// navíc jsou jen celé duše (chamtivost v rozpisu).
export const DUSE_ZA = { sekund: 20, zabitych: 20, strazce: 10, zlataku: 5 };

export function dusZaHru(hra) {
  const cas = Math.floor(Math.max(0, hra.cas) / DUSE_ZA.sekund);
  const zabiti = Math.floor(Math.max(0, hra.zabito) / DUSE_ZA.zabitych);
  const strazci = Math.max(0, hra.zabitoBossu) * DUSE_ZA.strazce;
  const zlataky = Math.floor(Math.max(0, Math.floor(hra.zlataky || 0)) / DUSE_ZA.zlataku);
  const zaklad = cas + zabiti + strazci + zlataky;
  const nasobek = hra.hrdina?.chamtivost;
  const chamtivost = Number.isFinite(nasobek) && nasobek > 1 ? Math.floor(zaklad * (nasobek - 1) + 1e-9) : 0;
  return { cas, zabiti, strazci, zlataky, chamtivost, celkem: zaklad + chamtivost };
}

export const RUST_CENY = 1.5;

// Cena další úrovně: každá stojí o polovinu víc než předchozí, zaokrouhleno na pětky. null = na maximu.
export function cenaVylepseni(id, uroven) {
  const v = VYLEPSENI[id];
  if (!v || uroven >= v.max) return null;
  return Math.round((v.cena * (v.rust ?? RUST_CENY) ** uroven) / 5) * 5;
}

// Jen známá vylepšení s celou úrovní 1..max; cokoli jiného (rozbitý záznam, staré id) se zahodí.
export function platnaVylepseni(vylepseni) {
  const vysledek = {};
  if (!vylepseni || typeof vylepseni !== 'object') return vysledek;
  for (const [id, v] of Object.entries(VYLEPSENI)) {
    if (!Object.hasOwn(vylepseni, id)) continue;
    const uroven = vylepseni[id];
    if (Number.isInteger(uroven) && uroven > 0) vysledek[id] = Math.min(uroven, v.max);
  }
  return vysledek;
}

// Cesta ke středu: každý koupený uzel musí mít koupené všechny uzly mezi sebou a středem. Kde chybí, doplní se
// úroveň 1 zadarmo. To převede uložení z doby před stromem (Oživení bez nového uzlu Odolnost před ním, Štěstí bez
// Magnetu) a ze stejného stavu nikdy nic neubere. Vrací nový objekt, pořadí klíčů je pořadí VYLEPSENI.
export function doplnCestu(vylepseni) {
  const mam = platnaVylepseni(vylepseni);
  for (const id of Object.keys(mam)) {
    for (let od = VYLEPSENI[id].od; od && !(mam[od] > 0); od = VYLEPSENI[od].od) mam[od] = 1;
  }
  return platnaVylepseni(mam);
}

export function platnyStav(stav) {
  const duse = Number.isFinite(stav?.duse) ? Math.max(0, Math.floor(stav.duse)) : 0;
  return { duse, vylepseni: doplnCestu(stav?.vylepseni) };
}

// Uzel jde koupit (bez ohledu na duše): je to první uzel větve nebo má koupeného rodiče, a není na maximu.
export function dostupne(vylepseni, id) {
  const v = VYLEPSENI[id];
  if (!v) return false;
  const mam = platnaVylepseni(vylepseni);
  return (mam[id] ?? 0) < v.max && (!v.od || (mam[v.od] ?? 0) > 0);
}

// Stav uzlu pro okno: koupeny (na maximu), rozkoupany, dostupny, zamceny.
export function stavUzlu(vylepseni, id) {
  const v = VYLEPSENI[id];
  const uroven = platnaVylepseni(vylepseni)[id] ?? 0;
  if (uroven >= v.max) return 'koupeny';
  if (uroven > 0) return 'rozkoupany';
  return dostupne(vylepseni, id) ? 'dostupny' : 'zamceny';
}

// Kolik duší je v koupených úrovních (to vrátí tlačítko Vrátit duše).
export function utraceno(vylepseni) {
  let soucet = 0;
  for (const [id, uroven] of Object.entries(platnaVylepseni(vylepseni))) {
    for (let u = 0; u < uroven; u++) soucet += cenaVylepseni(id, u);
  }
  return soucet;
}

// Kolik stojí celý strom (všechno na maximu).
export const CENA_STROMU = utraceno(Object.fromEntries(Object.entries(VYLEPSENI).map(([id, v]) => [id, v.max])));

// Nákup další úrovně. Vrací nový stav, nebo null, když je uzel zamčený, na maximu nebo chybí duše.
export function kupVylepseni(stav, id) {
  const { duse, vylepseni } = platnyStav(stav);
  if (!dostupne(vylepseni, id)) return null;
  const cena = cenaVylepseni(id, vylepseni[id] ?? 0);
  if (cena === null || cena > duse) return null;
  return { duse: duse - cena, vylepseni: platnaVylepseni({ ...vylepseni, [id]: (vylepseni[id] ?? 0) + 1 }) };
}

export function vratDuse(stav) {
  const { duse, vylepseni } = platnyStav(stav);
  return { duse: duse + utraceno(vylepseni), vylepseni: {} };
}

// Promítne koupené úrovně do vlastností hrdiny na začátku hry. Efekt s trida platí jen za tu postavu.
export function pouzijVylepseni(hrdina, vylepseni, trida = null) {
  for (const [id, uroven] of Object.entries(platnaVylepseni(vylepseni))) {
    for (const e of VYLEPSENI[id].efekty) {
      if (!e.vlastnost || (e.trida && e.trida !== trida)) continue;
      if (e.nasobek) hrdina[e.vlastnost] *= 1 + e.nasobek * uroven;
      if (e.pricti) hrdina[e.vlastnost] += e.pricti * uroven;
    }
  }
}

// Součet přičtených efektů na jednu vlastnost (Mistr postavy se musí znát dřív, než se výhoda postavy použije).
export function soucetEfektu(vylepseni, vlastnost) {
  let soucet = 0;
  for (const [id, uroven] of Object.entries(platnaVylepseni(vylepseni))) {
    for (const e of VYLEPSENI[id].efekty) if (e.vlastnost === vlastnost && e.pricti) soucet += e.pricti * uroven;
  }
  return soucet;
}

// Co vylepšení přidají hře na začátku (zlaťáky, klíče, přehození zdarma): { pole: kolik }.
export function navicHre(vylepseni) {
  const navic = {};
  for (const [id, uroven] of Object.entries(platnaVylepseni(vylepseni))) {
    for (const e of VYLEPSENI[id].efekty) if (e.hra) navic[e.hra] = (navic[e.hra] ?? 0) + e.pricti * uroven;
  }
  return navic;
}

// Hodnota efektu na úrovni do popisu: procenta bez znaménka (nasobek nebo pricti s procenta), jinak číslo. Na setiny
// (0,05 života za sekundu), zbytečné nuly pryč, desetinná čárka podle jazyka.
const kratce = (x) => desetinne(String(Math.round(x * 100) / 100));
function hodnotaEfektu(e, uroven) {
  const kolik = Math.abs((e.nasobek ?? e.pricti) * uroven);
  return kratce(e.nasobek || e.procenta ? kolik * 100 : kolik);
}

// Popis uzlu na dané úrovni ({n}, {m} = hodnoty efektů). Na úrovni 0 popisuje první úroveň (co uzel dá).
export function popisVylepseni(id, uroven) {
  const v = VYLEPSENI[id];
  const u = Math.max(1, Math.min(v.max, uroven));
  const [n, m] = v.efekty.map((e) => hodnotaEfektu(e, u));
  return t(`vylepseni.${id}.popis`, { n, m });
}

// Přehled pro okno: koupené úrovně, všechny úrovně a podíl utracených duší z ceny celého stromu (0–1).
export function prehledStromu(vylepseni) {
  const mam = platnaVylepseni(vylepseni);
  const urovni = Object.values(mam).reduce((a, b) => a + b, 0);
  const vse = Object.values(VYLEPSENI).reduce((a, v) => a + v.max, 0);
  return { urovni, vse, uzlu: Object.keys(mam).length, uzluCelkem: Object.keys(VYLEPSENI).length, utraceno: utraceno(mam), cena: CENA_STROMU };
}

