// Duše a trvalá vylepšení: po každé hře přibudou duše, v menu Vylepšení se za ně kupují úrovně,
// které platí od začátku každé další hry. Jen pravidla, bez DOM a bez úložiště (to je ulozeni.js).
// Nové vylepšení přidáš do VYLEPSENI: vlastnost hrdiny, o kolik se mění za úroveň, počet úrovní a základní cena.
// nasobek: vlastnost × (1 + nasobek × úroveň), pricti: vlastnost + pricti × úroveň.

export const VYLEPSENI = {
  sila: { nazev: 'Síla', popis: '+5 % poškození všech zbraní', vlastnost: 'sila', nasobek: 0.05, max: 5, cena: 30 },
  zivoty: { nazev: 'Životy', popis: '+10 max. životů', vlastnost: 'maxHp', pricti: 10, max: 5, cena: 25 },
  rychlost: { nazev: 'Rychlost', popis: '+4 % rychlost pohybu', vlastnost: 'rychlost', nasobek: 0.04, max: 5, cena: 25 },
  magnet: { nazev: 'Magnet', popis: '+10 % dosah sběru krystalů', vlastnost: 'magnet', nasobek: 0.1, max: 5, cena: 20 },
  stesti: { nazev: 'Štěstí', popis: '+20 % šance, že padne srdce nebo magnet', vlastnost: 'stesti', nasobek: 0.2, max: 5, cena: 30 },
  zkusenosti: { nazev: 'Zkušenosti', popis: '+5 % zkušeností z krystalů', vlastnost: 'zkusenosti', nasobek: 0.05, max: 5, cena: 35 },
  oziveni: { nazev: 'Oživení', popis: 'Jednou za hru tě duše vrátí s půlkou životů', vlastnost: 'oziveni', pricti: 1, max: 1, cena: 150 },
};

// Za kolik se hra promění v duše: čas, zabití a Strážci hlubin.
export const DUSE_ZA = { sekund: 20, zabitych: 20, strazce: 10 };

export function dusZaHru(hra) {
  const cas = Math.floor(Math.max(0, hra.cas) / DUSE_ZA.sekund);
  const zabiti = Math.floor(Math.max(0, hra.zabito) / DUSE_ZA.zabitych);
  const strazci = Math.max(0, hra.zabitoBossu) * DUSE_ZA.strazce;
  return { cas, zabiti, strazci, celkem: cas + zabiti + strazci };
}

// Každá další úroveň stojí o polovinu víc než předchozí, zaokrouhleno na pětky.
export function cenaVylepseni(id, uroven) {
  const v = VYLEPSENI[id];
  if (!v || uroven >= v.max) return null;
  return Math.round((v.cena * 1.5 ** uroven) / 5) * 5;
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

export function platnyStav(stav) {
  const duse = Number.isFinite(stav?.duse) ? Math.max(0, Math.floor(stav.duse)) : 0;
  return { duse, vylepseni: platnaVylepseni(stav?.vylepseni) };
}

// Kolik duší je v koupených úrovních (to vrátí tlačítko Vrátit duše).
export function utraceno(vylepseni) {
  let soucet = 0;
  for (const [id, uroven] of Object.entries(platnaVylepseni(vylepseni))) {
    for (let u = 0; u < uroven; u++) soucet += cenaVylepseni(id, u);
  }
  return soucet;
}

// Nákup další úrovně. Vrací nový stav, nebo null, když je vylepšení na maximu nebo chybí duše.
export function kupVylepseni(stav, id) {
  const { duse, vylepseni } = platnyStav(stav);
  const cena = cenaVylepseni(id, vylepseni[id] ?? 0);
  if (cena === null || cena > duse) return null;
  return { duse: duse - cena, vylepseni: { ...vylepseni, [id]: (vylepseni[id] ?? 0) + 1 } };
}

export function vratDuse(stav) {
  const { duse, vylepseni } = platnyStav(stav);
  return { duse: duse + utraceno(vylepseni), vylepseni: {} };
}

// Promítne koupené úrovně do vlastností hrdiny na začátku hry.
export function pouzijVylepseni(hrdina, vylepseni) {
  for (const [id, uroven] of Object.entries(platnaVylepseni(vylepseni))) {
    const v = VYLEPSENI[id];
    if (v.nasobek) hrdina[v.vlastnost] *= 1 + v.nasobek * uroven;
    if (v.pricti) hrdina[v.vlastnost] += v.pricti * uroven;
  }
}
