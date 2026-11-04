// Pravidla hry: pohyb, zbraně, nepřátelé, krystaly zkušeností a vylepšení.
import { pouzijVylepseni } from './duse.js';

// ikona = jméno spritu, který se ukáže na kartě vylepšení
export const ZBRANE = {
  jiskra: {
    nazev: 'Jiskra', ikona: 'jiskra',
    popis: ['Střílí jiskry na nejbližšího nepřítele.', '+1 jiskra', 'Rychlejší střelba', '+1 jiskra', 'Větší poškození'],
  },
  lucerna: {
    nazev: 'Lucerna', ikona: 'lucerna',
    popis: ['Žár lucerny pálí nepřátele kolem tebe.', 'Větší dosah', 'Silnější žár', 'Větší dosah', 'Silnější žár'],
  },
  krumpace: {
    nazev: 'Krumpáče', ikona: 'krumpac',
    popis: ['Krumpáč krouží kolem tebe.', '+1 krumpáč', 'Rychlejší otáčení', '+1 krumpáč', 'Větší poškození'],
  },
  blesk: {
    nazev: 'Blesk', ikona: 'blesk',
    popis: ['Blesk udeří do nepřítele a přeskočí na další.', '+1 přeskok', 'Častější údery', '+2 přeskoky', 'Větší poškození'],
  },
};

export const PASIVY = {
  srdce: { nazev: 'Srdce', ikona: 'srdce', popis: '+20 max. životů a doléčení' },
  boty: { nazev: 'Boty', ikona: 'boty', popis: '+12 % rychlost pohybu' },
  magnet: { nazev: 'Magnet', ikona: 'magnet', popis: '+40 % dosah sběru krystalů' },
  sila: { nazev: 'Síla', ikona: 'sila', popis: '+15 % poškození všech zbraní' },
};

// Rarita karty při nové úrovni: kolik úrovní karta přidá a jaký bonus dá navíc.
// vaha = jak často padá na začátku hry; vzácnějších rarit časem přibývá (v 15. minutě 2×) a Štěstí je násobí dál.
// Úroveň, která se do zbraně nebo pasivy už nevejde (je na maximu), se promění v +3 % poškození.
// Váhy a bonusy jsou nízko schválně: s dvojnásobnými rozjel bot v simulaci sněhovou kouli a přežil přes 20 minut.
export const RARITY = {
  bezna: { nazev: 'Běžná', urovni: 1, sila: 0, doleceni: false, vaha: 100 },
  vzacna: { nazev: 'Vzácná', urovni: 2, sila: 0, doleceni: false, vaha: 12 },
  epicka: { nazev: 'Epická', urovni: 2, sila: 0.05, doleceni: false, vaha: 3.5 },
  legendarni: { nazev: 'Legendární', urovni: 3, sila: 0.1, doleceni: true, vaha: 1 },
};
export const PORADI_RARIT = Object.keys(RARITY);
export const SILA_ZA_PREBYTEK = 0.03;
export const CAS_PLNYCH_RARIT = 900;
export const LECENI_ODPOCINKU = 30;

// Třídy hrdiny: každá začíná s jinou zbraní a má jednu výhodu. Výhoda násobí vlastnost hrdiny
// (nabijeni < 1 = zbraně se nabíjí rychleji). Sprite má stejné jméno jako třída.
export const TRIDY = {
  lovec: {
    nazev: 'Lovec', zbran: 'jiskra', vyhoda: '+15 % rychlost pohybu', nasobky: { rychlost: 1.15 },
    popis: 'Stopař z okraje lesa. Uteče skoro všemu.',
  },
  havir: {
    nazev: 'Havíř', zbran: 'krumpace', vyhoda: '+30 % životů', nasobky: { maxHp: 1.3 },
    popis: 'Zná každou štolu. Vydrží ránu jako skála.',
  },
  svetlonos: {
    nazev: 'Světlonoš', zbran: 'lucerna', vyhoda: '+50 % dosah sběru', nasobky: { magnet: 1.5 },
    popis: 'Nese světlo do tmy. Krystaly letí k němu samy.',
  },
  bourlivak: {
    nazev: 'Bouřlivák', zbran: 'blesk', vyhoda: '-20 % nabíjení zbraní', nasobky: { nabijeni: 0.8 },
    popis: 'Volá bouři z hlubin. Udeří dřív než ostatní.',
  },
};
export const VYCHOZI_TRIDA = 'lovec';

export function platnaTrida(id) {
  return typeof id === 'string' && Object.hasOwn(TRIDY, id) ? id : VYCHOZI_TRIDA;
}

export const MAX_UROVEN = 5;
const MAX_NEPRATEL = 350;
const MAX_KRYSTALU = 300;
const SANCE_SRDCE = 0.012;
const SANCE_MAGNET = 0.003;
const LECENI_SRDCE = 25;
const BOSS_KAZDYCH = 180;
const MAX_CASTIC = 400;
const ZIVOT_CASTICE = 0.45;
export const TRVANI_TRESU = 0.15;
// Pavouk zalepí hrdinu sítí: na chvíli zpomalí. Opakovaný zásah síť obnoví, nesčítá se.
export const OD_PAVOUKU = 240;
export const TRVANI_SITE = 1.5;
export const ZPOMALENI_SITI = 0.6;
// Oživení (trvalé vylepšení): hrdina vstane s půlkou životů, chvíli je nezranitelný a duše odhodí nepřátele kolem.
export const ZIVOTY_PO_OZIVENI = 0.5;
export const NEZRANITELNY_PO_OZIVENI = 2;
export const ODHOZENI_PRI_OZIVENI = 160;
export const TRVANI_ZABLESKU = 0.8;
// Duch letí rovně tam, kde hrdina zrovna byl, a proletí skrz. Pak na chvíli zmizí: neublíží, zbraně ho
// nevidí a dál letí stejným směrem. Až se zase ukáže, zamíří znovu.
export const OD_DUCHU = 90;
export const VIDITELNY_DUCH = 2.6;
export const SKRYTY_DUCH = 0.9;
// Duchy jde těžko trefit, takže by se jich jinak nahromadilo plno. Nad tenhle počet místo nich přiletí netopýr.
export const MAX_DUCHU = 24;
// Houbák je pomalý, ale po smrti nechá na 3 s jedový oblak, který zraňuje hrdinu, dokud v něm stojí.
// Prvních pár desetin sekundy se oblak teprve nafukuje a nepálí, ať má hráč čas uhnout.
export const OD_HOUBAKU = 120;
export const TRVANI_OBLAKU = 3;
export const NAFUKOVANI_OBLAKU = 0.4;
export const POLOMER_OBLAKU = 36;
export const JED_OBLAKU = 4;
const MAX_OBLAKU = 40;
// Vlci chodí jen ve smečkách, které se vynoří na jednom místě okraje. První smečka přijde chvíli
// po prvním Strážci, ať se jejich ohlášení nepřekryjí.
export const OD_VLKU = 180;
export const SMECKA_OD = 4;
export const SMECKA_DO = 6;
const PRVNI_SMECKA = OD_VLKU + 10;
const SMECKA_KAZDYCH = 24;

const NEPRATELE = {
  netopyr: { hp: 10, rychlost: 72, poskozeni: 5, xp: 1, polomer: 10 },
  slizak: { hp: 32, rychlost: 42, poskozeni: 10, xp: 2, polomer: 12 },
  kostlivec: { hp: 60, rychlost: 58, poskozeni: 14, xp: 3, polomer: 11 },
  pavouk: { hp: 8, rychlost: 100, poskozeni: 4, xp: 2, polomer: 9, sit: true },
  duch: { hp: 18, rychlost: 80, poskozeni: 7, xp: 2, polomer: 10, duch: true },
  houbak: { hp: 32, rychlost: 30, poskozeni: 8, xp: 3, polomer: 12, jed: true },
  vlk: { hp: 16, rychlost: 104, poskozeni: 6, xp: 2, polomer: 10 },
  strazce: { hp: 320, rychlost: 48, poskozeni: 22, xp: 25, polomer: 22, boss: true },
};
export const RYCHLOST_NEPRATEL = Object.fromEntries(Object.entries(NEPRATELE).map(([id, v]) => [id, v.rychlost]));

// Kdy se ohlásí nový druh nepřátel (podle času, seřazené).
const PRICHODY = [
  { od: OD_DUCHU, text: 'Hlubinami bloudí duchové' },
  { od: OD_HOUBAKU, text: 'Na louce vyrašili houbáci' },
  { od: PRVNI_SMECKA, text: 'Ze tmy vyje smečka vlků' },
  { od: OD_PAVOUKU, text: 'Z hlubin lezou pavouci' },
];

// vylepseni: trvalá vylepšení z menu ({ id: úroveň }), bez nich je hra stejná jako dřív.
export function novaHra(rng, idTridy = VYCHOZI_TRIDA, vylepseni = {}) {
  const trida = platnaTrida(idTridy);
  const hrdina = {
    x: 0, y: 0, hp: 100, maxHp: 100, rychlost: 110, magnet: 64, nabijeni: 1,
    sila: 1, uroven: 1, xp: 0, potreba: potrebaNaUroven(1), nezranitelny: 0, otoceny: 1, sit: 0,
    stesti: 1, zkusenosti: 1, oziveni: 0,
  };
  for (const [vlastnost, nasobek] of Object.entries(TRIDY[trida].nasobky)) hrdina[vlastnost] *= nasobek;
  pouzijVylepseni(hrdina, vylepseni);
  hrdina.hp = hrdina.maxHp;
  return {
    rng,
    trida,
    cas: 0,
    zabito: 0,
    zabitoBossu: 0,
    oziveno: 0,
    zablesk: 0,
    konec: false,
    volby: null,
    zTruhly: false,
    hrdina,
    zbrane: { [TRIDY[trida].zbran]: { uroven: 1, nabiti: 0 } },
    pasivy: {},
    nepratele: [],
    strely: [],
    krystaly: [],
    predmety: [],
    cisla: [],
    blesky: [],
    castice: [],
    oblaky: [],
    tres: 0,
    uhelKrumpacu: 0,
    doSpawnu: 0,
    dalsiBoss: BOSS_KAZDYCH,
    dalsiSmecka: PRVNI_SMECKA,
    smecek: 0,
    dalsiPrichod: 0,
    oznameni: null,
  };
}

// Prvních pár úrovní přijde rychle, ať má hráč brzy víc zbraní; pak křivka zvolna roste.
export function potrebaNaUroven(uroven) {
  return Math.round(3 + uroven * 1.5 + (uroven * uroven) / 12);
}

function vzdalenost(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function zasah(hra, n, kolik) {
  const poskozeni = Math.round(kolik * hra.hrdina.sila);
  n.hp -= poskozeni;
  n.zasazen = 0.1;
  hra.cisla.push({ x: n.x, y: n.y - 10, text: String(poskozeni), zivot: 0.6 });
}

// Pár pixelových úlomků rozletí od zabitého nepřítele. Směry se počítají z pořadí zabití, ne z rng,
// aby ozdoby neposunuly náhodu vln (stejné semínko = stejná hra).
function rozlet(hra, n) {
  const pocet = n.boss ? 16 : 6;
  const posun = hra.zabito * 2.39;
  for (let i = 0; i < pocet; i++) {
    const uhel = posun + (i / pocet) * Math.PI * 2;
    const rychlost = (100 + ((i * 37 + hra.zabito * 11) % 80)) * (n.boss ? 1.6 : 1);
    hra.castice.push({
      x: n.x, y: n.y, vx: Math.cos(uhel) * rychlost, vy: Math.sin(uhel) * rychlost,
      zivot: ZIVOT_CASTICE, druh: n.druh, odstin: i,
    });
  }
  if (hra.castice.length > MAX_CASTIC) hra.castice.splice(0, hra.castice.length - MAX_CASTIC);
}

// Duše vrátí hrdinu do hry: půlka životů, chvíle bez zranění a nepřátelé kolem odletí kus dál.
function oziv(hra) {
  const { hrdina } = hra;
  hrdina.oziveni -= 1;
  hra.oziveno += 1;
  hrdina.hp = Math.round(hrdina.maxHp * ZIVOTY_PO_OZIVENI);
  hrdina.nezranitelny = NEZRANITELNY_PO_OZIVENI;
  hrdina.sit = 0;
  hra.zablesk = TRVANI_ZABLESKU;
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hrdina);
    if (d >= ODHOZENI_PRI_OZIVENI) continue;
    const uhel = d > 0 ? Math.atan2(n.y - hrdina.y, n.x - hrdina.x) : 0;
    n.x = hrdina.x + Math.cos(uhel) * ODHOZENI_PRI_OZIVENI;
    n.y = hrdina.y + Math.sin(uhel) * ODHOZENI_PRI_OZIVENI;
  }
  hra.oznameni = { text: 'Duše tě vrátily z hlubin', zivot: 3 };
}

// Zranění hrdiny (dotyk nepřítele nebo jedový oblak): chvíle bez zranění, třes, případně konec nebo Oživení.
function zran(hra, kolik) {
  const { hrdina } = hra;
  hrdina.hp -= kolik;
  hrdina.nezranitelny = 0.5;
  hra.tres = TRVANI_TRESU;
  if (hrdina.hp <= 0) {
    if (hrdina.oziveni > 0) oziv(hra);
    else hra.konec = true;
  }
}

function polomerSpawnu(sirka, vyska) {
  return Math.hypot(sirka, vyska) / 2 + 40;
}

function naOkraji(hra, sirka, vyska) {
  const uhel = hra.rng.dalsi() * Math.PI * 2;
  const r = polomerSpawnu(sirka, vyska);
  return { x: hra.hrdina.x + Math.cos(uhel) * r, y: hra.hrdina.y + Math.sin(uhel) * r };
}

// Duch si vezme směr k místu, kde hrdina je teď, a tím směrem pak letí rovně.
function zamir(n, hrdina) {
  const d = vzdalenost(n, hrdina) || 1;
  n.smerX = (hrdina.x - n.x) / d;
  n.smerY = (hrdina.y - n.y) / d;
}

// Nový nepřítel na daném místě. Životy rostou s časem (bossové pomaleji). Exportované kvůli simulaci.
export function pridejNepritele(hra, druh, x, y) {
  const vzor = NEPRATELE[druh];
  const hp = Math.round(vzor.hp * (1 + hra.cas / (vzor.boss ? 300 : 150)));
  const n = { druh, ...vzor, hp, maxHp: hp, zasazen: 0, zasahKrumpacem: 0, x, y };
  if (n.duch) {
    n.skryty = false;
    n.duchCas = VIDITELNY_DUCH;
    zamir(n, hra.hrdina);
  }
  hra.nepratele.push(n);
  return n;
}

function spawn(hra, sirka, vyska) {
  const { rng, cas } = hra;
  if (hra.nepratele.length >= MAX_NEPRATEL) return;
  const druhy = ['netopyr'];
  if (cas > 60) druhy.push('slizak');
  if (cas > OD_DUCHU) druhy.push('duch');
  if (cas > OD_HOUBAKU) druhy.push('houbak');
  if (cas > 150) druhy.push('kostlivec');
  if (cas > OD_PAVOUKU) druhy.push('pavouk');
  const davka = 1 + Math.floor(cas / 60);
  let duchu = hra.nepratele.filter((n) => n.duch).length;
  for (let i = 0; i < davka; i++) {
    let druh = rng.vyber(druhy);
    if (druh === 'duch' && duchu >= MAX_DUCHU) druh = 'netopyr';
    if (druh === 'duch') duchu += 1;
    const { x, y } = naOkraji(hra, sirka, vyska);
    pridejNepritele(hra, druh, x, y);
  }
}

// Smečka vlků vyleze pohromadě na jednom místě okraje, v kroužku kolem vůdce. Přijde i při plné
// louce (obyčejné vlny ji drží na maximu), jen o pár smeček víc už ne.
function smecka(hra, sirka, vyska) {
  if (hra.nepratele.length >= MAX_NEPRATEL + SMECKA_DO * 3) return;
  const pocet = hra.rng.cele(SMECKA_OD, SMECKA_DO);
  const { x, y } = naOkraji(hra, sirka, vyska);
  pridejNepritele(hra, 'vlk', x, y);
  for (let i = 1; i < pocet; i++) {
    const uhel = (i / (pocet - 1)) * Math.PI * 2;
    pridejNepritele(hra, 'vlk', x + Math.cos(uhel) * 22, y + Math.sin(uhel) * 22);
  }
  hra.smecek += 1;
}

// Zbraně neví o duchovi, který je zrovna schovaný.
function viditelny(n) {
  return !n.skryty;
}

function nejblizsi(hra) {
  let nej = null;
  let nejD = Infinity;
  for (const n of hra.nepratele) {
    if (!viditelny(n)) continue;
    const d = vzdalenost(n, hra.hrdina);
    if (d < nejD) { nej = n; nejD = d; }
  }
  return nej;
}

export function staty(hra) {
  const u = (id) => hra.zbrane[id]?.uroven ?? 0;
  const j = u('jiskra');
  const l = u('lucerna');
  const k = u('krumpace');
  const b = u('blesk');
  // Kratší nabíjení zrychlí všechny zbraně: střelbu, údery, žár lucerny i otáčení krumpáčů.
  const n = hra.hrdina.nabijeni ?? 1;
  return {
    jiskra: { pocet: 1 + (j >= 2) + (j >= 4), nabiti: (j >= 3 ? 0.5 : 0.7) * n, poskozeni: j >= 5 ? 16 : 11 },
    lucerna: { dosah: 56 + 22 * ((l >= 2) + (l >= 4)), zar: 14 + 9 * ((l >= 3) + (l >= 5)), tik: 0.3 * n },
    krumpace: { pocet: 1 + (k >= 2) + (k >= 4), rychlost: (k >= 3 ? 4.5 : 3) / n, poskozeni: k >= 5 ? 18 : 12, polomer: 64 },
    blesk: { preskoky: 2 + (b >= 2) + 2 * (b >= 4), nabiti: (b >= 3 ? 1.5 : 2.2) * n, poskozeni: b >= 5 ? 30 : 20, dosah: 320, skok: 110 },
  };
}

export function aktualizuj(hra, dt, vstup, sirka, vyska) {
  if (hra.konec || hra.volby || hra.pauza) return;
  const { hrdina } = hra;
  hra.cas += dt;

  // pohyb hrdiny
  let { dx, dy } = vstup;
  const delka = Math.hypot(dx, dy);
  if (delka > 0) {
    dx /= delka;
    dy /= delka;
    const rychlost = hrdina.rychlost * (hrdina.sit > 0 ? ZPOMALENI_SITI : 1);
    hrdina.x += dx * rychlost * dt;
    hrdina.y += dy * rychlost * dt;
    if (dx !== 0) hrdina.otoceny = Math.sign(dx);
  }
  hrdina.nezranitelny = Math.max(0, hrdina.nezranitelny - dt);
  hrdina.sit = Math.max(0, hrdina.sit - dt);
  hra.tres = Math.max(0, hra.tres - dt);
  hra.zablesk = Math.max(0, hra.zablesk - dt);

  // nepřátelé
  hra.doSpawnu -= dt;
  if (hra.doSpawnu <= 0) {
    spawn(hra, sirka, vyska);
    hra.doSpawnu = Math.max(0.25, 1.2 - hra.cas / 180);
  }
  // Kdo zůstal daleko za hrdinou, vrátí se na okraj obrazovky, aby se nepřátelé nehromadili mimo dohled.
  const daleko = polomerSpawnu(sirka, vyska) * 1.5;
  for (const n of hra.nepratele) {
    if (vzdalenost(n, hrdina) > daleko) {
      Object.assign(n, naOkraji(hra, sirka, vyska));
      if (n.duch) zamir(n, hrdina);
    }
  }
  if (hra.cas >= hra.dalsiBoss) {
    const { x, y } = naOkraji(hra, sirka, vyska);
    pridejNepritele(hra, 'strazce', x, y);
    hra.dalsiBoss += BOSS_KAZDYCH;
    hra.oznameni = { text: 'Přichází Strážce hlubin', zivot: 3 };
  }
  if (hra.cas >= hra.dalsiSmecka) {
    smecka(hra, sirka, vyska);
    hra.dalsiSmecka += SMECKA_KAZDYCH;
  }
  const prichod = PRICHODY[hra.dalsiPrichod];
  if (prichod && hra.cas > prichod.od) {
    hra.dalsiPrichod += 1;
    hra.oznameni = { text: prichod.text, zivot: 3 };
  }
  if (hra.oznameni) {
    hra.oznameni.zivot -= dt;
    if (hra.oznameni.zivot <= 0) hra.oznameni = null;
  }
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hrdina) || 1;
    if (n.duch) {
      // Duch letí pořád rovně. Střídá se: chvíli vidět, chvíli schovaný, po vynoření zamíří znovu.
      n.duchCas -= dt;
      if (n.duchCas <= 0) {
        n.skryty = !n.skryty;
        n.duchCas = n.skryty ? SKRYTY_DUCH : VIDITELNY_DUCH;
        if (!n.skryty) zamir(n, hrdina);
      }
      n.x += n.smerX * n.rychlost * dt;
      n.y += n.smerY * n.rychlost * dt;
    } else {
      n.x += ((hrdina.x - n.x) / d) * n.rychlost * dt;
      n.y += ((hrdina.y - n.y) / d) * n.rychlost * dt;
    }
    n.zasazen = Math.max(0, n.zasazen - dt);
    n.zasahKrumpacem = Math.max(0, n.zasahKrumpacem - dt);
    if (d < n.polomer + 8 && hrdina.nezranitelny <= 0 && viditelny(n)) {
      if (n.sit) hrdina.sit = TRVANI_SITE;
      zran(hra, n.poskozeni);
    }
  }
  // Jedový oblak po houbákovi pálí hrdinu, dokud v něm stojí (stejně jako dotyk, po zásahu chvíle klidu).
  for (const o of hra.oblaky) {
    const pali = TRVANI_OBLAKU - o.zivot >= NAFUKOVANI_OBLAKU;
    if (pali && hrdina.nezranitelny <= 0 && !hra.konec && vzdalenost(o, hrdina) < o.polomer) {
      zran(hra, JED_OBLAKU);
      hra.cisla.push({ x: hrdina.x, y: hrdina.y - 18, text: `-${JED_OBLAKU}`, zivot: 0.6, barva: 'jed' });
    }
  }

  const s = staty(hra);

  // Jiskra
  const jiskra = hra.zbrane.jiskra;
  if (jiskra) {
    jiskra.nabiti -= dt;
    const cil = nejblizsi(hra);
    if (jiskra.nabiti <= 0 && cil) {
      const zaklad = Math.atan2(cil.y - hrdina.y, cil.x - hrdina.x);
      for (let i = 0; i < s.jiskra.pocet; i++) {
        const uhel = zaklad + (i - (s.jiskra.pocet - 1) / 2) * 0.18;
        hra.strely.push({ x: hrdina.x, y: hrdina.y, vx: Math.cos(uhel) * 340, vy: Math.sin(uhel) * 340, zivot: 1.2, poskozeni: s.jiskra.poskozeni });
      }
      jiskra.nabiti = s.jiskra.nabiti;
    }
  }
  for (const st of hra.strely) {
    st.x += st.vx * dt;
    st.y += st.vy * dt;
    st.zivot -= dt;
    for (const n of hra.nepratele) {
      if (n.hp > 0 && viditelny(n) && vzdalenost(st, n) < n.polomer + 4) {
        zasah(hra, n, st.poskozeni);
        st.zivot = 0;
        break;
      }
    }
  }
  hra.strely = hra.strely.filter((st) => st.zivot > 0);

  // Lucerna
  if (hra.zbrane.lucerna) {
    const luc = hra.zbrane.lucerna;
    luc.tik = (luc.tik ?? 0) - dt;
    if (luc.tik <= 0) {
      for (const n of hra.nepratele) {
        if (viditelny(n) && vzdalenost(n, hrdina) < s.lucerna.dosah) zasah(hra, n, s.lucerna.zar * 0.3);
      }
      luc.tik = s.lucerna.tik;
    }
  }

  // Krumpáče
  if (hra.zbrane.krumpace) {
    hra.uhelKrumpacu += s.krumpace.rychlost * dt;
    for (let i = 0; i < s.krumpace.pocet; i++) {
      const uhel = hra.uhelKrumpacu + (i / s.krumpace.pocet) * Math.PI * 2;
      const kx = hrdina.x + Math.cos(uhel) * s.krumpace.polomer;
      const ky = hrdina.y + Math.sin(uhel) * s.krumpace.polomer;
      for (const n of hra.nepratele) {
        if (n.zasahKrumpacem <= 0 && viditelny(n) && Math.hypot(n.x - kx, n.y - ky) < n.polomer + 10) {
          zasah(hra, n, s.krumpace.poskozeni);
          n.zasahKrumpacem = 0.4;
        }
      }
    }
  }

  // Blesk: udeří do náhodného nepřítele v dosahu a přeskakuje na nejbližší dosud nezasažené.
  if (hra.zbrane.blesk) {
    const bl = hra.zbrane.blesk;
    bl.nabiti = (bl.nabiti ?? 0) - dt;
    const vDosahu = hra.nepratele.filter((n) => n.hp > 0 && viditelny(n) && vzdalenost(n, hrdina) < s.blesk.dosah);
    if (bl.nabiti <= 0 && vDosahu.length) {
      let cil = hra.rng.vyber(vDosahu);
      const zasazeni = new Set();
      const body = [{ x: hrdina.x, y: hrdina.y }];
      for (let i = 0; i <= s.blesk.preskoky && cil; i++) {
        zasah(hra, cil, s.blesk.poskozeni);
        zasazeni.add(cil);
        body.push({ x: cil.x, y: cil.y });
        let dalsi = null;
        let nejD = s.blesk.skok;
        for (const n of hra.nepratele) {
          if (zasazeni.has(n) || n.hp <= 0 || !viditelny(n)) continue;
          const d = vzdalenost(n, cil);
          if (d < nejD) { dalsi = n; nejD = d; }
        }
        cil = dalsi;
      }
      hra.blesky.push({ body, zivot: 0.18 });
      bl.nabiti = s.blesk.nabiti;
    }
  }
  for (const b of hra.blesky) b.zivot -= dt;
  hra.blesky = hra.blesky.filter((b) => b.zivot > 0);

  // smrt nepřátel → krystaly
  for (const n of hra.nepratele) {
    if (n.hp <= 0) {
      hra.zabito += 1;
      rozlet(hra, n);
      hra.krystaly.push({ x: n.x, y: n.y, xp: n.xp });
      if (n.jed) {
        hra.oblaky.push({ x: n.x, y: n.y, zivot: TRVANI_OBLAKU, polomer: POLOMER_OBLAKU });
        if (hra.oblaky.length > MAX_OBLAKU) hra.oblaky.splice(0, hra.oblaky.length - MAX_OBLAKU);
      }
      if (n.boss) {
        hra.zabitoBossu += 1;
        hra.predmety.push({ druh: 'truhla', x: n.x, y: n.y });
        continue;
      }
      // Štěstí z trvalých vylepšení zvětší obě šance, los z rng je pořád jeden (náhoda vln se neposune).
      const los = hra.rng.dalsi();
      const stesti = hrdina.stesti;
      if (los < SANCE_MAGNET * stesti) hra.predmety.push({ druh: 'magnet', x: n.x, y: n.y });
      else if (los < (SANCE_MAGNET + SANCE_SRDCE) * stesti) hra.predmety.push({ druh: 'srdce', x: n.x, y: n.y });
    }
  }
  hra.nepratele = hra.nepratele.filter((n) => n.hp > 0);

  // srdce a magnet se seberou dotykem
  for (const p of hra.predmety) {
    if (vzdalenost(p, hrdina) < 16) {
      p.sebran = true;
      if (p.druh === 'truhla') {
        // Truhla Strážce dá aspoň vzácnou kartu.
        hra.volby = nabidka(hra, 'vzacna');
        hra.zTruhly = true;
        hra.oznameni = { text: 'Truhla Strážce: vylepšení zdarma', zivot: 2 };
      } else if (p.druh === 'srdce') {
        const pred = hrdina.hp;
        hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + LECENI_SRDCE);
        hra.cisla.push({ x: hrdina.x, y: hrdina.y - 18, text: `+${Math.round(hrdina.hp - pred)}`, zivot: 0.8, barva: 'leceni' });
      } else {
        for (const kr of hra.krystaly) kr.pritahovan = true;
      }
    }
  }
  hra.predmety = hra.predmety.filter((p) => !p.sebran);

  // sběr krystalů
  for (const kr of hra.krystaly) {
    const d = vzdalenost(kr, hrdina) || 1;
    if (kr.pritahovan || d < hrdina.magnet) {
      const rychlost = kr.pritahovan ? 520 : 260;
      kr.x += ((hrdina.x - kr.x) / d) * rychlost * dt;
      kr.y += ((hrdina.y - kr.y) / d) * rychlost * dt;
    }
    if (d < 12) {
      kr.sebran = true;
      hrdina.xp += kr.xp * hrdina.zkusenosti;
    }
  }
  hra.krystaly = hra.krystaly.filter((kr) => !kr.sebran);
  // Moc krystalů na zemi: dva nejstarší se slijí do jednoho, zkušenosti se neztratí.
  while (hra.krystaly.length > MAX_KRYSTALU) {
    const [a, b] = hra.krystaly.splice(0, 2);
    hra.krystaly.push({ x: b.x, y: b.y, xp: a.xp + b.xp });
  }
  // Když je zrovna otevřená truhla, nová úroveň počká na další snímek (jinak by truhlu přepsala).
  if (hrdina.xp >= hrdina.potreba && !hra.volby) {
    hrdina.xp -= hrdina.potreba;
    hrdina.uroven += 1;
    hrdina.potreba = potrebaNaUroven(hrdina.uroven);
    hra.volby = nabidka(hra);
  }

  // úlomky zpomalují a mizí
  const brzda = Math.exp(-5 * dt);
  for (const c of hra.castice) {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vx *= brzda;
    c.vy *= brzda;
    c.zivot -= dt;
  }
  hra.castice = hra.castice.filter((c) => c.zivot > 0);

  for (const o of hra.oblaky) o.zivot -= dt;
  hra.oblaky = hra.oblaky.filter((o) => o.zivot > 0);

  for (const c of hra.cisla) {
    c.y -= 30 * dt;
    c.zivot -= dt;
  }
  hra.cisla = hra.cisla.filter((c) => c.zivot > 0);
}

// Šance na každou raritu (součet 1). minimum: horší rarity než tahle nepadnou (truhla Strážce).
export function sanceRarit(hra, minimum = 'bezna') {
  const cas = Math.min(Math.max(0, hra.cas), CAS_PLNYCH_RARIT);
  const nasobek = (1 + cas / CAS_PLNYCH_RARIT) * Math.max(1, hra.hrdina.stesti ?? 1);
  const od = Math.max(0, PORADI_RARIT.indexOf(minimum));
  const vahy = PORADI_RARIT.map((id, i) => (i < od ? 0 : RARITY[id].vaha * (i > 0 ? nasobek : 1)));
  const soucet = vahy.reduce((a, b) => a + b, 0);
  return Object.fromEntries(PORADI_RARIT.map((id, i) => [id, vahy[i] / soucet]));
}

// Jeden los z rng na kartu, ať je počet losů pořád stejný (Štěstí nesmí posunout náhodu vln).
function losujRaritu(hra, minimum) {
  const sance = sanceRarit(hra, minimum);
  let los = hra.rng.dalsi();
  for (const id of PORADI_RARIT) {
    los -= sance[id];
    if (los < 0) return id;
  }
  return PORADI_RARIT[PORADI_RARIT.length - 1];
}

// Karta vylepšení pro současný stav: od které úrovně, na kterou (kroku = kolik úrovní přidá),
// řádky popisu za každou novou úroveň a bonus rarity (poškození navíc, doléčení).
export function karta(hra, druh, id, rarita = 'bezna') {
  if (!Object.hasOwn(RARITY, rarita)) rarita = 'bezna';
  const r = RARITY[rarita];
  const bonusy = (kroku) => {
    const sila = r.sila + (r.urovni - kroku) * SILA_ZA_PREBYTEK;
    const radky = [];
    if (sila > 0) radky.push(`+${Math.round(sila * 100)} % poškození všech zbraní`);
    if (r.doleceni) radky.push('Doléčí všechny životy');
    return { bonus: { sila, doleceni: r.doleceni }, bonusy: radky };
  };
  if (druh === 'zbran' || druh === 'pasiva') {
    const vzor = druh === 'zbran' ? ZBRANE[id] : PASIVY[id];
    const od = (druh === 'zbran' ? hra.zbrane[id]?.uroven : hra.pasivy[id]) ?? 0;
    const kroku = Math.max(0, Math.min(r.urovni, MAX_UROVEN - od));
    // U nové zbraně je první řádek, co zbraň dělá (že je nová, ukáže karta u úrovní).
    const popis = druh === 'zbran' ? vzor.popis.slice(od, od + kroku) : [kroku > 1 ? `${kroku}× ${vzor.popis}` : vzor.popis];
    return { druh, id, nazev: vzor.nazev, ikona: vzor.ikona, rarita, od, uroven: od + kroku, kroku, popis, ...bonusy(kroku) };
  }
  // Všechno na maximu: odpočinek jen léčí, čím vzácnější, tím víc. Poškození nepřidá, jinak by po
  // vylepšení všeho rostlo bez konce a pozdní hra by přestala být těžká.
  const kroku = r.urovni;
  return {
    druh: 'leceni', id: 'leceni', nazev: 'Odpočinek', ikona: 'odpocinek', rarita, od: 0, uroven: 0, kroku,
    popis: [r.doleceni ? 'Doléčí všechny životy' : `Doléčí ${LECENI_ODPOCINKU * kroku} životů`],
    bonus: { sila: 0, doleceni: r.doleceni }, bonusy: [],
  };
}

export function nabidka(hra, minimum = 'bezna') {
  const moznosti = [];
  for (const id of Object.keys(ZBRANE)) {
    if ((hra.zbrane[id]?.uroven ?? 0) < MAX_UROVEN) moznosti.push(['zbran', id]);
  }
  for (const id of Object.keys(PASIVY)) {
    if ((hra.pasivy[id] ?? 0) < MAX_UROVEN) moznosti.push(['pasiva', id]);
  }
  const vybrane = [];
  while (vybrane.length < 3 && moznosti.length) {
    const [druh, id] = moznosti.splice(Math.floor(hra.rng.dalsi() * moznosti.length), 1)[0];
    vybrane.push(karta(hra, druh, id, losujRaritu(hra, minimum)));
  }
  if (!vybrane.length) vybrane.push(karta(hra, 'leceni', 'leceni', losujRaritu(hra, minimum)));
  return vybrane;
}

function pridejPasivu(hrdina, id) {
  if (id === 'srdce') { hrdina.maxHp += 20; hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + 20); }
  if (id === 'boty') hrdina.rychlost *= 1.12;
  if (id === 'magnet') hrdina.magnet *= 1.4;
  if (id === 'sila') hrdina.sila *= 1.15;
}

// Použije kartu: zbraň nebo pasiva vyskočí o kroku úrovní (nikdy přes maximum), pak bonus rarity.
export function vyber(hra, volba) {
  const { hrdina } = hra;
  const cil = Math.min(MAX_UROVEN, volba.uroven ?? 0);
  if (volba.druh === 'zbran') {
    hra.zbrane[volba.id] = { ...(hra.zbrane[volba.id] ?? { nabiti: 0 }), uroven: Math.max(cil, hra.zbrane[volba.id]?.uroven ?? 0) };
  } else if (volba.druh === 'pasiva') {
    for (let u = hra.pasivy[volba.id] ?? 0; u < cil; u++) pridejPasivu(hrdina, volba.id);
    hra.pasivy[volba.id] = Math.max(cil, hra.pasivy[volba.id] ?? 0);
  } else {
    hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + LECENI_ODPOCINKU * (volba.kroku ?? 1));
  }
  if (volba.bonus?.sila > 0) hrdina.sila *= 1 + volba.bonus.sila;
  if (volba.bonus?.doleceni) hrdina.hp = hrdina.maxHp;
  hra.volby = null;
  hra.zTruhly = false;
}

// Co hrdina právě má, v pořadí, jak to dostal (zbraně, pak pasivy): pro přehled výbavy v rohu obrazovky.
// max = úroveň je na maximu, dál už nejde. Kreslí to vybava.js, tady jsou jen data.
export function seznamVybavy(hra) {
  const polozka = (druh, id, vzor, uroven) => ({ druh, id, nazev: vzor.nazev, ikona: vzor.ikona, uroven, max: uroven >= MAX_UROVEN });
  return {
    zbrane: Object.entries(hra.zbrane)
      .filter(([id, z]) => Object.hasOwn(ZBRANE, id) && z?.uroven > 0)
      .map(([id, z]) => polozka('zbran', id, ZBRANE[id], z.uroven)),
    pasivy: Object.entries(hra.pasivy)
      .filter(([id, u]) => Object.hasOwn(PASIVY, id) && u > 0)
      .map(([id, u]) => polozka('pasiva', id, PASIVY[id], u)),
  };
}
