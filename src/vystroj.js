// Výbava bossů: truhla po bossovi dá kromě karty i kus jeho výbavy. Sloty jsou čtyři: Hlava, Tělo, Amulet
// a Prsten. Každý boss má sadu čtyř kusů (do každého slotu jeden) s vlastním jménem, spritem a staty.
// Dokud má hrdina na sobě aspoň jeden kus sady, platí zvláštní efekt toho bosse. Dva kusy stejné sady efekt
// zesílí a přidají bonus sady, čtyři ho zesílí naplno a přidají další bonus. Výbava platí jen pro jednu hru,
// Sbírka v menu si pamatuje, co už hráč kdy našel. Jen data a pravidla bez DOM, co efekty dělají ve hře,
// je v hra.js (hledej efekty v ucinekVystroje). Nový kus nebo sadu stačí přidat do VYBAVA a nakreslit sprite
// se jménem id kusu (boss_slot) v sprity.js. Jména slotů, statů, rarit, efektů, sad a kusů jsou ve slovníku
// (src/texty/cs.js, větev vystroj).
import { t, tvar, pripojTexty, cislo, procenta as procentaTextu } from './texty.js';

export const SLOTY = {
  hlava: {},
  telo: {},
  amulet: {},
  prsten: {},
};
pripojTexty(SLOTY, 'vystroj.sloty');
export const PORADI_SLOTU = Object.keys(SLOTY);

// Staty kusů. pricti = přičte se k vlastnosti hrdiny (životy), ostatní jsou podíly (0,05 = 5 %) a sčítají se:
// dva kusy po +5 % poškození dají +10 %. Nabíjení zkracuje nabíjení všech zbraní, zbroj ubere z každé rány
// tolik procent. vaha = cena jednoho dílu pro bota, když porovnává dva kusy (hodnotaKusu).
export const STATY_VYBAVY = {
  maxHp: { pricti: true, vaha: 1 },
  zbroj: { vaha: 300 },
  sila: { vaha: 250 },
  nabijeni: { vaha: 250 },
  rychlost: { vaha: 150 },
  magnet: { vaha: 40 },
};
pripojTexty(STATY_VYBAVY, 'vystroj.staty');
// Víc už výbava nedá: zbroj nejvýš polovinu každé rány, nabíjení nejvýš o polovinu kratší.
export const STROPY_VYBAVY = { zbroj: 0.5, nabijeni: 0.5 };

// Rarity kusů mají stejná jména a barvy jako karty. nasobek = kolikrát silnější staty než u běžného kusu,
// zlataky = na kolik zlaťáků se kus rozloží, když si ho hráč nenechá. Vzácnější kusy přibývají s hrozbou:
// vaha se násobí (1 + rust · (hrozba − 1)) a Štěstím z trvalých vylepšení.
export const RARITY_VYBAVY = {
  bezna: { nasobek: 1, zlataky: 3, vaha: 60, rust: 0 },
  vzacna: { nasobek: 1.3, zlataky: 6, vaha: 30, rust: 0.1 },
  epicka: { nasobek: 1.6, zlataky: 10, vaha: 8, rust: 0.2 },
  legendarni: { nasobek: 2, zlataky: 16, vaha: 2, rust: 0.3 },
};
pripojTexty(RARITY_VYBAVY, 'vystroj.rarity');
export const PORADI_RARIT_VYBAVY = Object.keys(RARITY_VYBAVY);

// Zvláštní efekty sad. stupne[0] platí s jedním kusem sady, [1] se dvěma nebo třemi, [2] se všemi čtyřmi.
// vlna: každých kazdych s od hrdiny vyběhne rázová vlna do polomer px, zraní a odhodí (bosse jen zraní).
// sit: tolik zásahů zbraní (sance, rozložených rovnoměrně) zapřede nepřítele na trvani s, zapředený stojí
// (boss jde napůl). kuze: dotyk nepřítele ubere o snizeni méně a odhodí ho o odhozeni px (bosse ne).
// zmizeni: po ráně hrdina na trvani s zmizí, nepřátelé (kromě bossů) jdou tam, kde ho viděli naposledy,
// a nic mu neublíží; znovu to jde až po pauza s.
export const EFEKTY_VYBAVY = {
  vlna: {
    stupne: [
      { kazdych: 8, polomer: 110, poskozeni: 25, odhozeni: 40 },
      { kazdych: 6.5, polomer: 135, poskozeni: 35, odhozeni: 50 },
      { kazdych: 5, polomer: 160, poskozeni: 50, odhozeni: 60 },
    ],
    popis: (e) => t('vystroj.popisEfektu.vlna', { kazdych: cislo(e.kazdych), poskozeni: e.poskozeni }),
  },
  sit: {
    stupne: [{ sance: 0.06, trvani: 1.5 }, { sance: 0.1, trvani: 2 }, { sance: 0.15, trvani: 2.5 }],
    popis: (e) => t('vystroj.popisEfektu.sit', { sance: procenta(e.sance), trvani: cislo(e.trvani) }),
  },
  kuze: {
    stupne: [{ snizeni: 0.25, odhozeni: 60 }, { snizeni: 0.35, odhozeni: 80 }, { snizeni: 0.45, odhozeni: 110 }],
    popis: (e) => t('vystroj.popisEfektu.kuze', { snizeni: procenta(e.snizeni) }),
  },
  zmizeni: {
    stupne: [{ trvani: 0.8, pauza: 10 }, { trvani: 1.1, pauza: 8 }, { trvani: 1.5, pauza: 6 }],
    popis: (e) => t('vystroj.popisEfektu.zmizeni', { trvani: cislo(e.trvani), pauza: cislo(e.pauza) }),
  },
};
pripojTexty(EFEKTY_VYBAVY, 'vystroj.efekty');

// Sady bossů (klíče jako v BOSSOVE v hra.js). Staty kusů jsou pro běžnou raritu, vzácnější je násobí.
// bonus2 platí od dvou kusů sady, bonus4 navíc se všemi čtyřmi.
export const VYBAVA = {
  strazce: {
    efekt: 'vlna',
    bonus2: { maxHp: 20 }, bonus4: { zbroj: 0.05, sila: 0.05 },
    kusy: {
      hlava: { staty: { maxHp: 15, zbroj: 0.04 } },
      telo: { staty: { maxHp: 25, zbroj: 0.05 } },
      amulet: { staty: { sila: 0.06, maxHp: 10 } },
      prsten: { staty: { zbroj: 0.03, nabijeni: 0.03 } },
    },
  },
  matka: {
    efekt: 'sit',
    bonus2: { nabijeni: 0.04 }, bonus4: { rychlost: 0.05, sila: 0.05 },
    kusy: {
      hlava: { staty: { nabijeni: 0.05, magnet: 0.1 } },
      telo: { staty: { rychlost: 0.06, maxHp: 10 } },
      amulet: { staty: { nabijeni: 0.06 } },
      prsten: { staty: { sila: 0.04, rychlost: 0.03 } },
    },
  },
  obr: {
    efekt: 'kuze',
    bonus2: { sila: 0.05 }, bonus4: { maxHp: 40, zbroj: 0.04 },
    kusy: {
      hlava: { staty: { maxHp: 20, zbroj: 0.03 } },
      telo: { staty: { zbroj: 0.06, maxHp: 15 } },
      amulet: { staty: { sila: 0.08 } },
      prsten: { staty: { sila: 0.04, maxHp: 15 } },
    },
  },
  bludicka: {
    efekt: 'zmizeni',
    bonus2: { magnet: 0.2 }, bonus4: { nabijeni: 0.05, rychlost: 0.05 },
    kusy: {
      hlava: { staty: { magnet: 0.15, rychlost: 0.03 } },
      telo: { staty: { rychlost: 0.05, zbroj: 0.02 } },
      amulet: { staty: { sila: 0.05, magnet: 0.1 } },
      prsten: { staty: { nabijeni: 0.05, rychlost: 0.02 } },
    },
  },
};
pripojTexty(VYBAVA, 'vystroj.sady');
export const PORADI_SAD = Object.keys(VYBAVA);
// Všechny kusy za sebou (sada po sadě, sloty v pořadí): id kusu = boss_slot, stejné jméno má i sprite. Jméno je
// getter jako v VYBAVA, ať platí jazyk, který je zrovna zvolený.
export const VSECHNY_KUSY = PORADI_SAD.flatMap((boss) => PORADI_SLOTU.map((slot) => {
  const vzor = VYBAVA[boss].kusy[slot];
  return { id: idKusu(boss, slot), boss, slot, get nazev() { return vzor.nazev; }, staty: vzor.staty };
}));

export function idKusu(boss, slot) {
  return `${boss}_${slot}`;
}

// Podíl jako procenta: 0,056 → „5,6 %“ (čísla a znak procent podle jazyka, texty.js).
function procenta(x) {
  return procentaTextu(cislo(x * 100));
}

// Řádek statu na kartě: „+21 životů“, „+2 životy“, „+5,6 % zbroj“.
export function textStatu(id, hodnota) {
  const s = STATY_VYBAVY[id];
  if (!s) return '';
  const znamenko = hodnota < 0 ? '−' : '+';
  const kolik = Math.abs(hodnota);
  if (!s.pricti) return `${znamenko}${procenta(kolik)} ${s.nazev}`;
  const cele = Math.round(kolik);
  return `${znamenko}${cele} ${s.tvary ? tvar(cele, s.tvary) : s.nazev}`;
}

export function radkyStatu(staty) {
  return Object.entries(staty ?? {}).filter(([id, h]) => Object.hasOwn(STATY_VYBAVY, id) && h).map(([id, h]) => textStatu(id, h));
}

// Rozdíl dvou kusů stat po statu (nový minus nasazený), jen co se liší: [{ id, rozdil, text }].
export function rozdilStatu(novy, nasazeny) {
  const ids = Object.keys(STATY_VYBAVY).filter((id) => (novy?.staty?.[id] ?? 0) || (nasazeny?.staty?.[id] ?? 0));
  return ids
    .map((id) => ({ id, rozdil: zaokrouhliStat(id, (novy?.staty?.[id] ?? 0) - (nasazeny?.staty?.[id] ?? 0)) }))
    .filter((r) => r.rozdil !== 0)
    .map((r) => ({ ...r, text: textStatu(r.id, r.rozdil) }));
}

function zaokrouhliStat(id, hodnota) {
  return STATY_VYBAVY[id]?.pricti ? Math.round(hodnota) : Math.round(hodnota * 1000) / 1000;
}

// Šance na každou raritu kusu (součet 1) při dané hrozbě a Štěstí.
export function sanceRaritVybavy(hrozba = 1, stesti = 1) {
  const h = Math.max(1, Number(hrozba) || 1);
  const stestiNasobek = Math.max(1, Number(stesti) || 1);
  const vahy = PORADI_RARIT_VYBAVY.map((id, i) => {
    const r = RARITY_VYBAVY[id];
    return r.vaha * (1 + r.rust * (h - 1)) * (i > 0 ? stestiNasobek : 1);
  });
  const soucet = vahy.reduce((a, b) => a + b, 0);
  return Object.fromEntries(PORADI_RARIT_VYBAVY.map((id, i) => [id, vahy[i] / soucet]));
}

// Rarita pro los 0..1 podle šancí.
export function rarituKusuZLosu(los, hrozba = 1, stesti = 1) {
  const sance = sanceRaritVybavy(hrozba, stesti);
  let zbyva = los;
  for (const id of PORADI_RARIT_VYBAVY) {
    zbyva -= sance[id];
    if (zbyva < 0) return id;
  }
  return PORADI_RARIT_VYBAVY[PORADI_RARIT_VYBAVY.length - 1];
}

// Kus dané sady, slotu a rarity se staty už vynásobenými raritou (životy na celé, procenta na desetiny).
// Neznámý boss je Strážce, neznámý slot Hlava, neznámá rarita Běžná.
export function vytvorKus(boss, slot, rarita = 'bezna') {
  const b = Object.hasOwn(VYBAVA, boss) ? boss : PORADI_SAD[0];
  const s = Object.hasOwn(SLOTY, slot) ? slot : PORADI_SLOTU[0];
  const r = Object.hasOwn(RARITY_VYBAVY, rarita) ? rarita : 'bezna';
  const vzor = VYBAVA[b].kusy[s];
  const nasobek = RARITY_VYBAVY[r].nasobek;
  const staty = Object.fromEntries(Object.entries(vzor.staty).map(([id, h]) => [id, zaokrouhliStat(id, h * nasobek)]));
  return { id: idKusu(b, s), boss: b, slot: s, rarita: r, get nazev() { return vzor.nazev; }, staty };
}

// Kus z truhly bosse: dva losy 0..1 (slot a rarita), ať truhla bere z náhody vždy stejně.
export function losujKus(boss, losSlotu, losRarity, hrozba, stesti) {
  const slot = PORADI_SLOTU[Math.min(PORADI_SLOTU.length - 1, Math.floor(losSlotu * PORADI_SLOTU.length))];
  return vytvorKus(boss, slot, rarituKusuZLosu(losRarity, hrozba, stesti));
}

export function zlatakyZaKus(kus) {
  return RARITY_VYBAVY[kus?.rarita]?.zlataky ?? 0;
}

// Jak dobrý kus je pro bota: součet statů krát jejich vaha.
export function hodnotaKusu(kus) {
  return Object.entries(kus?.staty ?? {}).reduce((soucet, [id, h]) => soucet + h * (STATY_VYBAVY[id]?.vaha ?? 0), 0);
}

// Stupeň efektu sady podle počtu nasazených kusů: 0 nic, 1 jeden kus, 2 dva nebo tři, 3 všechny čtyři.
export function stupenSady(pocet) {
  if (pocet >= PORADI_SLOTU.length) return 3;
  if (pocet >= 2) return 2;
  return pocet >= 1 ? 1 : 0;
}

export function popisEfektu(boss, pocet = 1) {
  const sada = VYBAVA[boss];
  const efekt = EFEKTY_VYBAVY[sada?.efekt];
  const stupen = stupenSady(pocet);
  if (!efekt || !stupen) return '';
  return efekt.popis(efekt.stupne[stupen - 1]);
}

// Co dá sada: řádky bonusů za 2 a za 4 kusy.
export function popisSady(boss) {
  const sada = VYBAVA[boss];
  if (!sada) return [];
  const efekt = EFEKTY_VYBAVY[sada.efekt].nazev.toLowerCase();
  return [
    t('vystroj.bonusSady', { n: 2, bonusy: [...radkyStatu(sada.bonus2), t('vystroj.silnejsi', { efekt })].join(', ') }),
    t('vystroj.bonusSady', { n: 4, bonusy: [...radkyStatu(sada.bonus4), t('vystroj.nejsilnejsi', { efekt })].join(', ') }),
  ];
}

// Co všechno nasazená výbava dává. vystroj = { slot: kus | null }. staty = součty statů i s bonusy sad,
// nasobky = jak se mění vlastnosti hrdiny (maxHp přičíst, zbroj nastavit, ostatní násobit), sady = kolik
// kusů které sady, efekty = { id efektu: čísla jeho stupně a stupen }.
export function ucinekVystroje(vystroj = {}) {
  const staty = Object.fromEntries(Object.keys(STATY_VYBAVY).map((id) => [id, 0]));
  const pricti = (zdroj) => {
    for (const [id, h] of Object.entries(zdroj ?? {})) if (Object.hasOwn(staty, id)) staty[id] += h;
  };
  const sady = {};
  for (const slot of PORADI_SLOTU) {
    const kus = vystroj?.[slot];
    if (!kus || !Object.hasOwn(VYBAVA, kus.boss)) continue;
    pricti(kus.staty);
    sady[kus.boss] = (sady[kus.boss] ?? 0) + 1;
  }
  const efekty = {};
  for (const [boss, pocet] of Object.entries(sady)) {
    const sada = VYBAVA[boss];
    if (pocet >= 2) pricti(sada.bonus2);
    if (pocet >= PORADI_SLOTU.length) pricti(sada.bonus4);
    const stupen = stupenSady(pocet);
    efekty[sada.efekt] = { ...EFEKTY_VYBAVY[sada.efekt].stupne[stupen - 1], stupen, boss };
  }
  const nasobky = {
    maxHp: Math.round(staty.maxHp),
    zbroj: Math.min(STROPY_VYBAVY.zbroj, staty.zbroj),
    sila: 1 + staty.sila,
    nabijeni: Math.max(1 - STROPY_VYBAVY.nabijeni, 1 - staty.nabijeni),
    rychlost: 1 + staty.rychlost,
    magnet: 1 + staty.magnet,
  };
  return { staty, nasobky, sady, efekty };
}

// Sbírka: { id kusu: nejlepší nalezená rarita }. Co není známý kus se známou raritou, se zahodí.
export function platnaSbirka(zaznam) {
  const sbirka = {};
  if (!zaznam || typeof zaznam !== 'object' || Array.isArray(zaznam)) return sbirka;
  for (const { id } of VSECHNY_KUSY) {
    if (Object.hasOwn(zaznam, id) && typeof zaznam[id] === 'string' && Object.hasOwn(RARITY_VYBAVY, zaznam[id])) sbirka[id] = zaznam[id];
  }
  return sbirka;
}

// Zapíše nalezený kus do sbírky (horší rarita lepší nepřepíše). Vrací novou sbírku.
export function pridejDoSbirky(sbirka, kus) {
  const platna = platnaSbirka(sbirka);
  if (!kus || !VSECHNY_KUSY.some((k) => k.id === kus.id) || !Object.hasOwn(RARITY_VYBAVY, kus.rarita)) return platna;
  const pred = PORADI_RARIT_VYBAVY.indexOf(platna[kus.id]);
  if (PORADI_RARIT_VYBAVY.indexOf(kus.rarita) > pred) platna[kus.id] = kus.rarita;
  return platna;
}
