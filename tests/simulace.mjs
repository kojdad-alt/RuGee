// Simulace hry bez prohlížeče: node tests/simulace.mjs [seminko] [sekund]
// Jednoduchý hráč utíká od nepřátel a sbírá krystaly, na úrovni bere nejdřív zbraně. Hlídá, že čísla zůstanou
// rozumná (žádné NaN, nepřátel nepřibývá donekonečna) a že se hra dá hrát a prohrát.
// Hlídá i ozdoby: úlomky po zabití a třes obrazovky po zásahu hrdiny.
// Pavouci: nesmí přijít před 4. minutou, jejich zásah zalepí hrdinu sítí a v síti chodí pomaleji.
// Rekord pro menu: výsledek se uloží jen když je delší, rozbitý záznam ani chybějící úložiště hru neshodí.
// Třídy: hlavní hra je za výchozí třídu, každá třída pak hraje krátce sama (svoje zbraň, svoje výhoda).
// Duše a trvalá vylepšení: hlavní hra je bez vylepšení (stejná jako před nimi), prázdná nebo rozbitá vylepšení
// hrají úplně stejně, každé vylepšení změní svou vlastnost, Oživení vrátí hrdinu jednou, obchod a úložiště sedí.
// Rarity karet: šance sedí s losováním, s časem a Štěstím přibývá vzácnějších, truhla nedá běžnou, karta nikdy
// nepřeleze maximální úroveň a dá přesně to, co slibuje (úrovně, poškození, doléčení).
// Noví nepřátelé: duch, houbák a vlk nepřijdou dřív, než mají. Schovaného ducha zbraně nezasáhnou a on nezraní,
// duch proletí skrz místo, kam mířil. Oblak po houbákovi se nejdřív nafoukne, pak pálí a za 3 s zmizí.
// Vlci chodí jen ve smečkách po 4–6 a jsou rychlejší než ostatní nepřátelé.
// Přehled výbavy v rohu: sedí s tím, co hrdina má (pořadí, úrovně, maximum, ikony se sprity) a po každém
// výběru zbraně nebo pasivy se změní, po Odpočinku ne.
// Žár lucerny: zasažený nepřítel v dosahu se krátce rozzáří (místo bílého bliknutí), za dosahem ne, a zase zhasne.
import { readFileSync } from 'node:fs';
import { vytvorRng } from '../src/rng.js';
import {
  novaHra, aktualizuj, vyber, staty, TRVANI_TRESU, OD_PAVOUKU, TRVANI_SITE, ZPOMALENI_SITI, TRIDY, VYCHOZI_TRIDA,
  ZIVOTY_PO_OZIVENI, NEZRANITELNY_PO_OZIVENI, ODHOZENI_PRI_OZIVENI,
  ZBRANE, RARITY, PORADI_RARIT, MAX_UROVEN, SILA_ZA_PREBYTEK, LECENI_ODPOCINKU, CAS_PLNYCH_RARIT, sanceRarit, nabidka, karta,
  OD_DUCHU, VIDITELNY_DUCH, SKRYTY_DUCH, OD_HOUBAKU, TRVANI_OBLAKU, NAFUKOVANI_OBLAKU, JED_OBLAKU,
  OD_VLKU, SMECKA_OD, SMECKA_DO, RYCHLOST_NEPRATEL, MAX_DUCHU, pridejNepritele, PASIVY, seznamVybavy, TRVANI_ZARU,
} from '../src/hra.js';
import {
  VYLEPSENI, DUSE_ZA, dusZaHru, cenaVylepseni, kupVylepseni, vratDuse, utraceno,
} from '../src/duse.js';
import {
  nactiRekord, zapisVysledek, nactiTridu, ulozTridu, nactiDuse, ulozDuse, pripisDuse,
} from '../src/ulozeni.js';

const seminko = Number(process.argv[2] ?? 1);
const delka = Number(process.argv[3] ?? 600);
const DT = 1 / 30;
const SIRKA = 1280;
const VYSKA = 720;

const hra = novaHra(vytvorRng(seminko));
let maxNepratel = 0;
let volby = 0;
let maxCastic = 0;
let zasahu = 0;
let tresu = 0;
let prvniPavouk = null;
let maxPavouku = 0;
let siti = 0;
let krokuVSiti = 0;
const nabidnuto = Object.fromEntries(PORADI_RARIT.map((id) => [id, 0]));
let truhel = 0;
const chybyRarit = [];
const chybyNepratel = [];
const videni = new WeakSet();
const prvni = { duch: null, houbak: null, vlk: null };
const smecky = [];
const videneOblaky = new WeakSet();
let oblaku = 0;
let zasahuOblakem = 0;
let duchuSchovanych = 0;
let maxDuchu = 0;
const chybyVybavy = [];
let zmenVybavy = 0;

// Přehled výbavy proti skutečnému stavu hrdiny. Sprity se v node kreslit nedají, jejich jména jsou v sprity.js.
const jmenaSpritu = new Set([...readFileSync(new URL('../src/sprity.js', import.meta.url), 'utf8').matchAll(/^ {2}(\w+): \[/gm)].map((m) => m[1]));
const podpisVybavy = (h) => JSON.stringify(seznamVybavy(h));
function zkontrolujVybavu(h, kdy) {
  const { zbrane, pasivy } = seznamVybavy(h);
  if (zbrane.map((p) => p.id).join() !== Object.keys(h.zbrane).join()) chybyVybavy.push(`${kdy}: zbraně v přehledu ${zbrane.map((p) => p.id)}`);
  if (pasivy.map((p) => p.id).join() !== Object.keys(h.pasivy).join()) chybyVybavy.push(`${kdy}: pasivy v přehledu ${pasivy.map((p) => p.id)}`);
  for (const p of [...zbrane, ...pasivy]) {
    const vzor = (p.druh === 'zbran' ? ZBRANE : PASIVY)[p.id];
    const ma = p.druh === 'zbran' ? h.zbrane[p.id].uroven : h.pasivy[p.id];
    if (p.uroven !== ma || p.uroven < 1 || p.uroven > MAX_UROVEN) chybyVybavy.push(`${kdy}: ${p.id} v přehledu na ${p.uroven}, hrdina má ${ma}`);
    if (p.max !== (p.uroven === MAX_UROVEN)) chybyVybavy.push(`${kdy}: ${p.id} na ${p.uroven} ${p.max ? 'je' : 'není'} jako maximum`);
    if (p.ikona !== vzor.ikona || !jmenaSpritu.has(p.ikona) || p.nazev !== vzor.nazev) chybyVybavy.push(`${kdy}: ${p.id} má ikonu ${p.ikona}`);
  }
}
for (const id of Object.keys(TRIDY)) {
  const h = novaHra(vytvorRng(seminko), id);
  zkontrolujVybavu(h, `start ${id}`);
  const { zbrane, pasivy } = seznamVybavy(h);
  if (zbrane.length !== 1 || zbrane[0].id !== TRIDY[id].zbran || zbrane[0].uroven !== 1 || pasivy.length) chybyVybavy.push(`${id} nezačíná jen se svou zbraní`);
}

// Každá nabídnutá karta: známá rarita, úrovně v mezích, popis a ikona.
function zkontrolujKarty(h) {
  for (const v of h.volby) {
    if (!Object.hasOwn(RARITY, v.rarita)) chybyRarit.push(`karta s neznámou raritou ${v.rarita}`);
    else nabidnuto[v.rarita] += 1;
    if (v.druh !== 'leceni' && (v.uroven > MAX_UROVEN || v.uroven - v.od !== v.kroku || v.kroku < 1 || v.kroku > RARITY[v.rarita]?.urovni)) {
      chybyRarit.push(`karta ${v.id} ${v.rarita} má úrovně ${v.od} → ${v.uroven}`);
    }
    if (!v.popis?.length || !v.popis.every((r) => typeof r === 'string' && r) || typeof v.ikona !== 'string') chybyRarit.push(`karta ${v.id} bez popisu nebo ikony`);
  }
  if (h.zTruhly) {
    truhel += 1;
    if (h.volby.some((v) => v.rarita === 'bezna')) chybyRarit.push('truhla nabídla běžnou kartu');
  }
}

// Jednoduchý hráč: utíká od nepřátel v blízkosti a jinak jde pro nejbližší krystal.
// Bez zbraně na dálku (jen krumpáče nebo lucerna) pustí nepřátele blíž, jinak by je nikdy nezasáhl.
// Jedovým oblakům se vyhýbá víc než nepřátelům (oblak je vidět, člověk z něj taky uteče).
function rozhodni(hra, t) {
  const { hrdina } = hra;
  const odstup = hra.zbrane.jiskra || hra.zbrane.blesk ? 160 : 50;
  let dx = 0;
  let dy = 0;
  for (const n of hra.nepratele) {
    const vx = hrdina.x - n.x;
    const vy = hrdina.y - n.y;
    const d = Math.hypot(vx, vy);
    if (d < odstup && d > 0) {
      dx += (vx / d) * (odstup - d);
      dy += (vy / d) * (odstup - d);
    }
  }
  for (const o of hra.oblaky) {
    const vx = hrdina.x - o.x;
    const vy = hrdina.y - o.y;
    const d = Math.hypot(vx, vy);
    const odOblaku = o.polomer + 20;
    if (d < odOblaku && d > 0) {
      dx += (vx / d) * (odOblaku - d) * 4;
      dy += (vy / d) * (odOblaku - d) * 4;
    }
  }
  if (Math.hypot(dx, dy) < 1) {
    let nej = null;
    let nejD = Infinity;
    for (const k of hra.krystaly) {
      const d = Math.hypot(k.x - hrdina.x, k.y - hrdina.y);
      if (d < nejD) { nej = k; nejD = d; }
    }
    if (nej) return { dx: nej.x - hrdina.x, dy: nej.y - hrdina.y };
    return { dx: Math.cos(t * 0.6), dy: Math.sin(t * 0.6) };
  }
  return { dx, dy };
}

// Na úrovni bere nejdřív novou nebo vylepšenou zbraň, pak cokoli.
function zvol(volby) {
  return volby.find((v) => v.druh === 'zbran') ?? volby[0];
}

for (let t = 0; t < delka && !hra.konec; t += DT) {
  const hpPred = hra.hrdina.hp;
  const sitPred = hra.hrdina.sit;
  const { x: xPred, y: yPred } = hra.hrdina;
  const schovani = hra.nepratele.filter((n) => n.skryty).map((n) => [n, n.hp]);
  aktualizuj(hra, DT, rozhodni(hra, t), SIRKA, VYSKA);
  // Schovaného ducha (před krokem i po něm) nesmí nic zasáhnout.
  for (const [n, hp] of schovani) {
    if (!n.skryty) continue;
    duchuSchovanych += 1;
    if (n.hp !== hp || !hra.nepratele.includes(n)) chybyNepratel.push(`schovaný duch dostal zásah v čase ${t.toFixed(1)} s`);
  }
  maxDuchu = Math.max(maxDuchu, hra.nepratele.filter((n) => n.duch).length);
  const noviVlci = [];
  for (const n of hra.nepratele) {
    if (videni.has(n)) continue;
    videni.add(n);
    if (n.druh in prvni && prvni[n.druh] === null) prvni[n.druh] = hra.cas;
    if (n.druh === 'vlk') noviVlci.push(n);
  }
  if (noviVlci.length) {
    const rozptyl = Math.max(...noviVlci.map((n) => Math.hypot(n.x - noviVlci[0].x, n.y - noviVlci[0].y)));
    smecky.push(noviVlci.length);
    if (noviVlci.length < SMECKA_OD || noviVlci.length > SMECKA_DO) chybyNepratel.push(`smečka ${noviVlci.length} vlků`);
    if (rozptyl > 30) chybyNepratel.push(`smečka rozházená na ${rozptyl.toFixed(0)} px`);
  }
  for (const o of hra.oblaky) {
    if (!videneOblaky.has(o)) { videneOblaky.add(o); oblaku += 1; }
  }
  if (hra.cisla.some((c) => c.barva === 'jed' && c.zivot > 0.6 - DT * 1.5)) zasahuOblakem += 1;
  if (hra.hrdina.hp < hpPred) {
    zasahu += 1;
    if (hra.tres === TRVANI_TRESU) tresu += 1;
    if (hra.hrdina.sit === TRVANI_SITE) siti += 1;
  }
  const pavouci = hra.nepratele.filter((n) => n.druh === 'pavouk').length;
  if (pavouci && prvniPavouk === null) prvniPavouk = hra.cas;
  maxPavouku = Math.max(maxPavouku, pavouci);
  if (sitPred > 0) {
    krokuVSiti += 1;
    const ujito = Math.hypot(hra.hrdina.x - xPred, hra.hrdina.y - yPred);
    if (ujito > hra.hrdina.rychlost * ZPOMALENI_SITI * DT + 1e-6) {
      throw new Error(`hrdina v síti nezpomalil v čase ${t.toFixed(1)} s (${ujito.toFixed(2)} px za krok)`);
    }
  }
  maxCastic = Math.max(maxCastic, hra.castice.length);
  if (hra.castice.some((c) => !Number.isFinite(c.x) || !Number.isFinite(c.y))) {
    throw new Error(`NaN u úlomku v čase ${t.toFixed(1)} s`);
  }
  if (hra.volby) {
    volby += 1;
    zkontrolujKarty(hra);
    const vzata = zvol(hra.volby);
    const predVyberem = podpisVybavy(hra);
    vyber(hra, vzata);
    zkontrolujVybavu(hra, `výběr v ${t.toFixed(1)} s`);
    const zmena = podpisVybavy(hra) !== predVyberem;
    if (zmena) zmenVybavy += 1;
    if (zmena !== (vzata.druh !== 'leceni')) chybyVybavy.push(`výběr ${vzata.id} v ${t.toFixed(1)} s ${zmena ? 'změnil' : 'nezměnil'} přehled výbavy`);
    if (hra.zTruhly) chybyRarit.push('po výběru zůstala truhla otevřená');
  }
  maxNepratel = Math.max(maxNepratel, hra.nepratele.length);
  const { x, y, hp } = hra.hrdina;
  if (![x, y, hp].every(Number.isFinite)) throw new Error(`NaN u hrdiny v čase ${t.toFixed(1)} s`);
  if (hra.nepratele.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.hp))) {
    throw new Error(`NaN u nepřítele v čase ${t.toFixed(1)} s`);
  }
}

// Každá třída krátce sama: začíná se svou zbraní, má svou výhodu a zabíjí.
// Základ vlastnosti se bere z třídy, která ji nemění.
const zaklad = (vlastnost) => {
  const jina = Object.keys(TRIDY).find((id) => !(vlastnost in TRIDY[id].nasobky));
  return novaHra(vytvorRng(seminko), jina).hrdina[vlastnost];
};
const chybyTrid = [];
const tridy = {};
for (const [id, t] of Object.entries(TRIDY)) {
  const h = novaHra(vytvorRng(seminko), id);
  const zbrane = Object.keys(h.zbrane);
  if (zbrane.length !== 1 || zbrane[0] !== t.zbran) chybyTrid.push(`${id} nezačíná jen s ${t.zbran} (${zbrane})`);
  for (const [vlastnost, nasobek] of Object.entries(t.nasobky)) {
    if (Math.abs(h.hrdina[vlastnost] - zaklad(vlastnost) * nasobek) > 1e-9) chybyTrid.push(`${id}: ${vlastnost} bez výhody`);
  }
  if (h.hrdina.hp !== h.hrdina.maxHp) chybyTrid.push(`${id} nezačíná s plnými životy`);
  for (let t2 = 0; t2 < 180 && !h.konec; t2 += DT) {
    aktualizuj(h, DT, rozhodni(h, t2), SIRKA, VYSKA);
    if (h.volby) vyber(h, zvol(h.volby));
    if (![h.hrdina.x, h.hrdina.y, h.hrdina.hp].every(Number.isFinite)) throw new Error(`NaN u třídy ${id}`);
  }
  if (h.zabito === 0 || h.hrdina.uroven < 3) chybyTrid.push(`${id} za 3 minuty skoro nic (úroveň ${h.hrdina.uroven}, zabito ${h.zabito})`);
  tridy[id] = { preziti_s: Math.round(h.cas), uroven: h.hrdina.uroven, zabito: h.zabito };
}
// Kratší nabíjení se musí projevit u všech zbraní.
const bourka = novaHra(vytvorRng(seminko), 'bourlivak');
const obycejna = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA);
const sB = staty(bourka);
const sO = staty(obycejna);
if (!(sB.jiskra.nabiti < sO.jiskra.nabiti && sB.blesk.nabiti < sO.blesk.nabiti
  && sB.lucerna.tik < sO.lucerna.tik && sB.krumpace.rychlost > sO.krumpace.rychlost)) {
  chybyTrid.push('kratší nabíjení Bouřliváka nezrychlilo všechny zbraně');
}

// Trvalá vylepšení. Krátká hra s danými vylepšeními a řidičem (bot nebo kamikaze).
function hrajKratce(vylepseni, sekund, ridic = rozhodni, kazdyKrok = () => {}) {
  const h = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, vylepseni);
  for (let t = 0; t < sekund && !h.konec; t += DT) {
    aktualizuj(h, DT, ridic(h, t), SIRKA, VYSKA);
    if (h.volby) vyber(h, zvol(h.volby));
    if (![h.hrdina.x, h.hrdina.y, h.hrdina.hp, h.hrdina.xp].every(Number.isFinite)) throw new Error('NaN ve hře s vylepšeními');
    kazdyKrok(h);
  }
  return h;
}
const otiskHry = (h) => JSON.stringify({ cas: h.cas, zabito: h.zabito, hrdina: h.hrdina, nepratel: h.nepratele.length, krystalu: h.krystaly.length });
const chybyDusi = [];
// Bez vylepšení, s prázdnými, nulovými nebo rozbitými musí hra dopadnout úplně stejně.
const bezVylepseni = otiskHry(hrajKratce(undefined, 150));
const nuly = Object.fromEntries(Object.keys(VYLEPSENI).map((id) => [id, 0]));
for (const [popis, nic] of [['{}', {}], ['nuly', nuly], ['null', null], ['rozbitá', { drak: 5, sila: 'hodně', zivoty: -2, rychlost: 1.5 }]]) {
  if (otiskHry(hrajKratce(nic, 150)) !== bezVylepseni) chybyDusi.push(`vylepšení ${popis} změnila hru`);
}
if (hra.oziveno !== 0) chybyDusi.push('hra bez vylepšení oživila hrdinu');
// Každé vylepšení na maximu změní svou vlastnost přesně o to, co slibuje.
const plna = Object.fromEntries(Object.entries(VYLEPSENI).map(([id, v]) => [id, v.max]));
const slaby = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA).hrdina;
const silny = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, plna).hrdina;
for (const [id, v] of Object.entries(VYLEPSENI)) {
  const ocekavano = v.nasobek ? slaby[v.vlastnost] * (1 + v.nasobek * v.max) : slaby[v.vlastnost] + v.pricti * v.max;
  if (!(Math.abs(silny[v.vlastnost] - ocekavano) < 1e-9) || silny[v.vlastnost] === slaby[v.vlastnost]) {
    chybyDusi.push(`vylepšení ${id} nezměnilo ${v.vlastnost} (${silny[v.vlastnost]})`);
  }
}
if (silny.hp !== silny.maxHp) chybyDusi.push('s vylepšenými životy hrdina nezačíná naplno');
// Zkušenosti: krystal pod nohama dá víc.
const zk = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, { zkusenosti: VYLEPSENI.zkusenosti.max });
zk.krystaly.push({ x: 0, y: 0, xp: 2 });
aktualizuj(zk, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (Math.abs(zk.hrdina.xp - 2 * zk.hrdina.zkusenosti) > 1e-9 || zk.hrdina.zkusenosti <= 1) chybyDusi.push(`zkušenosti z krystalu nesedí (${zk.hrdina.xp})`);
// Štěstí: stejné losy z rng, víc srdcí a magnetů. 3000 nepřátel padne naráz u nezranitelného hrdiny.
const padlo = (vylepseni) => {
  const h = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, vylepseni);
  h.hrdina.nezranitelny = 10;
  for (let i = 0; i < 3000; i++) h.nepratele.push({ druh: 'netopyr', x: 30, y: 0, hp: 0, maxHp: 1, rychlost: 0, poskozeni: 0, xp: 0, polomer: 1, zasazen: 0, zasahKrumpacem: 0 });
  aktualizuj(h, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  return h.predmety.filter((p) => p.druh === 'srdce' || p.druh === 'magnet').length;
};
const padloBez = padlo({});
const padloSeStestim = padlo({ stesti: VYLEPSENI.stesti.max });
if (!(padloSeStestim > padloBez && padloBez > 0)) chybyDusi.push(`štěstí nepřidalo srdce a magnety (${padloBez} → ${padloSeStestim})`);
// Plně vylepšený hrdina 3 minuty s botem: nic nespadne a nevydrží méně.
const vylepsena = hrajKratce(plna, 180);
// Oživení: hrdina běží rovnou do nepřátel. Po první smrti vstane s půlkou životů, nepřátelé odletí, po druhé je konec.
const kamikaze = (h) => {
  let nej = null;
  let nejD = Infinity;
  for (const n of h.nepratele) {
    const d = Math.hypot(n.x - h.hrdina.x, n.y - h.hrdina.y);
    if (d < nejD) { nej = n; nejD = d; }
  }
  return nej ? { dx: nej.x - h.hrdina.x, dy: nej.y - h.hrdina.y } : { dx: 0, dy: 0 };
};
let oziveni = null;
const sOzivenim = hrajKratce({ oziveni: 1 }, 1200, kamikaze, (h) => {
  if (h.oziveno && !oziveni) {
    const nejblizsi = Math.min(...h.nepratele.map((n) => Math.hypot(n.x - h.hrdina.x, n.y - h.hrdina.y)));
    oziveni = { cas: h.cas, hp: h.hrdina.hp, nezranitelny: h.hrdina.nezranitelny, nejblizsi };
  }
});
const bezOziveni = hrajKratce({}, 1200, kamikaze);
if (!oziveni) chybyDusi.push('Oživení hrdinu nevrátilo');
else {
  if (oziveni.hp !== Math.round(sOzivenim.hrdina.maxHp * ZIVOTY_PO_OZIVENI)) chybyDusi.push(`po oživení ${oziveni.hp} životů`);
  if (oziveni.nezranitelny !== NEZRANITELNY_PO_OZIVENI) chybyDusi.push('po oživení hrdina není nezranitelný');
  if (oziveni.nejblizsi < ODHOZENI_PRI_OZIVENI - 4) chybyDusi.push(`po oživení zůstal nepřítel ${oziveni.nejblizsi.toFixed(1)} px od hrdiny`);
  if (!sOzivenim.konec || sOzivenim.oziveno !== 1) chybyDusi.push('Oživení platí víc než jednou za hru');
  if (!bezOziveni.konec || bezOziveni.oziveno !== 0 || bezOziveni.cas > oziveni.cas + 1e-9) chybyDusi.push('bez Oživení hrdina vstal nebo přežil déle');
}
// Duše za hru podle času, zabití a Strážců.
const duseHry = dusZaHru(hra);
const ocekavaneDuse = Math.floor(hra.cas / DUSE_ZA.sekund) + Math.floor(hra.zabito / DUSE_ZA.zabitych) + hra.zabitoBossu * DUSE_ZA.strazce;
if (duseHry.celkem !== ocekavaneDuse || duseHry.celkem !== duseHry.cas + duseHry.zabiti + duseHry.strazci) chybyDusi.push('duše za hru nesedí');
if (dusZaHru(novaHra(vytvorRng(1))).celkem !== 0) chybyDusi.push('nová hra má mít 0 duší');
if (dusZaHru({ cas: 0, zabito: 0, zabitoBossu: 2 }).celkem !== 2 * DUSE_ZA.strazce) chybyDusi.push('Strážci nedávají duše');
// Obchod: ceny rostou, bez duší ani nad maximum se nekoupí, Vrátit duše vrátí přesně utracené.
let obchod = { duse: 100000, vylepseni: {} };
let zaplaceno = 0;
for (const [id, v] of Object.entries(VYLEPSENI)) {
  for (let u = 1; u < v.max; u++) {
    if (!(cenaVylepseni(id, u) > cenaVylepseni(id, u - 1))) chybyDusi.push(`cena ${id} neroste`);
  }
  for (let u = 0; u < v.max; u++) {
    const cena = cenaVylepseni(id, u);
    const dalsi = kupVylepseni(obchod, id);
    if (!dalsi || dalsi.duse !== obchod.duse - cena || dalsi.vylepseni[id] !== u + 1) chybyDusi.push(`nákup ${id} ${u + 1} nesedí`);
    obchod = dalsi ?? obchod;
    zaplaceno += cena;
  }
  if (cenaVylepseni(id, v.max) !== null || kupVylepseni(obchod, id) !== null) chybyDusi.push(`${id} jde koupit nad maximum`);
}
if (utraceno(obchod.vylepseni) !== zaplaceno || obchod.duse !== 100000 - zaplaceno) chybyDusi.push('utracené duše nesedí');
const vraceno = vratDuse(obchod);
if (vraceno.duse !== 100000 || Object.keys(vraceno.vylepseni).length) chybyDusi.push('Vrátit duše nevrátilo všechno');
if (kupVylepseni({ duse: cenaVylepseni('sila', 0) - 1, vylepseni: {} }, 'sila') !== null) chybyDusi.push('nákup bez dost duší prošel');
if (kupVylepseni({ duse: 999, vylepseni: {} }, 'drak') !== null) chybyDusi.push('koupilo se neznámé vylepšení');

// Rarity: šance dávají dohromady 1, s časem a se Štěstím je vzácnějších víc, truhla nedá běžnou.
const naZacatku = novaHra(vytvorRng(seminko));
const pozde = novaHra(vytvorRng(seminko));
pozde.cas = CAS_PLNYCH_RARIT;
const stastny = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, { stesti: VYLEPSENI.stesti.max });
const sZacatek = sanceRarit(naZacatku);
const sPozde = sanceRarit(pozde);
const sStesti = sanceRarit(stastny);
const sTruhla = sanceRarit(naZacatku, 'vzacna');
const vzacnejsi = (s) => 1 - s.bezna;
for (const [popis, s] of [['začátek', sZacatek], ['15. minuta', sPozde], ['Štěstí', sStesti], ['truhla', sTruhla]]) {
  const soucet = Object.values(s).reduce((a, b) => a + b, 0);
  if (Math.abs(soucet - 1) > 1e-9 || Object.values(s).some((p) => !(p >= 0))) chybyRarit.push(`šance rarit (${popis}) nedávají 1`);
}
if (!PORADI_RARIT.every((id, i) => i === 0 || sZacatek[id] < sZacatek[PORADI_RARIT[i - 1]])) chybyRarit.push('vzácnější rarita není vzácnější');
if (!(vzacnejsi(sPozde) > vzacnejsi(sZacatek))) chybyRarit.push('s časem nepřibylo vzácnějších karet');
if (!(vzacnejsi(sStesti) > vzacnejsi(sZacatek))) chybyRarit.push('Štěstí nepřidalo vzácnější karty');
if (sTruhla.bezna !== 0) chybyRarit.push('truhla má šanci na běžnou kartu');
// Losování sedí se šancemi: 3000 nabídek po 3 kartách na začátku hry.
const losovano = Object.fromEntries(PORADI_RARIT.map((id) => [id, 0]));
let karet = 0;
for (let i = 0; i < 3000; i++) {
  for (const v of nabidka(naZacatku)) { losovano[v.rarita] += 1; karet += 1; }
}
for (const id of PORADI_RARIT) {
  if (Math.abs(losovano[id] / karet - sZacatek[id]) > 0.02) chybyRarit.push(`${id} padá ${(losovano[id] / karet).toFixed(3)} místo ${sZacatek[id].toFixed(3)}`);
}
for (let i = 0; i < 500; i++) {
  if (nabidka(naZacatku, 'vzacna').some((v) => v.rarita === 'bezna')) { chybyRarit.push('nabídka s minimem vzácná dala běžnou'); break; }
}
if (JSON.stringify(nabidka(novaHra(vytvorRng(seminko)))) !== JSON.stringify(nabidka(novaHra(vytvorRng(seminko))))) chybyRarit.push('stejné semínko dalo jiné karty');
// Karty podle rarity dají přesně to, co slibují. Lovec začíná s Jiskrou na 1.
const k = novaHra(vytvorRng(seminko));
const blizko = (a, b) => Math.abs(a - b) < 1e-9;
const legBlesk = karta(k, 'zbran', 'blesk', 'legendarni');
if (legBlesk.od !== 0 || legBlesk.uroven !== 3 || legBlesk.popis.length !== 3 || legBlesk.popis[0] !== ZBRANE.blesk.popis[0]) chybyRarit.push('legendární nová zbraň nemá 3 úrovně');
k.hrdina.hp = 10;
vyber(k, legBlesk);
if (k.zbrane.blesk?.uroven !== 3 || !blizko(k.hrdina.sila, 1 + RARITY.legendarni.sila) || k.hrdina.hp !== k.hrdina.maxHp) chybyRarit.push('legendární karta nedala úrovně, poškození nebo doléčení');
k.zbrane.jiskra.uroven = MAX_UROVEN - 1;
const prebytek = karta(k, 'zbran', 'jiskra', 'legendarni');
if (prebytek.kroku !== 1 || prebytek.uroven !== MAX_UROVEN || !blizko(prebytek.bonus.sila, RARITY.legendarni.sila + 2 * SILA_ZA_PREBYTEK)) chybyRarit.push('přebytek úrovní se nepromění v poškození');
vyber(k, prebytek);
if (k.zbrane.jiskra.uroven !== MAX_UROVEN) chybyRarit.push(`jiskra po legendární kartě na ${k.zbrane.jiskra.uroven}`);
const silaPred = k.hrdina.sila;
const rychlostPred = k.hrdina.rychlost;
vyber(k, karta(k, 'pasiva', 'boty', 'vzacna'));
if (k.pasivy.boty !== 2 || !blizko(k.hrdina.rychlost, rychlostPred * 1.12 ** 2) || k.hrdina.sila !== silaPred) chybyRarit.push('vzácné boty nedaly 2 úrovně');
const maxHpPred = k.hrdina.maxHp;
vyber(k, karta(k, 'pasiva', 'srdce', 'epicka'));
if (k.pasivy.srdce !== 2 || k.hrdina.maxHp !== maxHpPred + 40 || !blizko(k.hrdina.sila, silaPred * (1 + RARITY.epicka.sila))) chybyRarit.push('epické srdce nesedí');
k.pasivy.magnet = MAX_UROVEN;
if (karta(k, 'pasiva', 'magnet', 'vzacna').kroku !== 0) chybyRarit.push('pasiva na maximu jde ještě zvýšit');
for (const id of PORADI_RARIT) {
  const odpocinek = karta(k, 'leceni', 'leceni', id);
  if (odpocinek.bonus.sila !== 0) chybyRarit.push(`odpočinek ${id} přidává poškození`);
}
k.hrdina.hp = 1;
vyber(k, karta(k, 'leceni', 'leceni', 'vzacna'));
if (k.hrdina.hp !== 1 + 2 * LECENI_ODPOCINKU) chybyRarit.push(`vzácný odpočinek doléčil na ${k.hrdina.hp}`);
if (karta(k, 'zbran', 'lucerna', 'drak').rarita !== 'bezna') chybyRarit.push('neznámá rarita není běžná');
// Truhla a nová úroveň ve stejném snímku: nejdřív truhla, úroveň počká na další snímek.
const tr = novaHra(vytvorRng(seminko));
tr.predmety.push({ druh: 'truhla', x: 0, y: 0 });
tr.krystaly.push({ x: 0, y: 0, xp: 100 });
aktualizuj(tr, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (!tr.zTruhly || !tr.volby || tr.hrdina.uroven !== 1) chybyRarit.push('truhla se přepsala novou úrovní');
else {
  vyber(tr, tr.volby[0]);
  aktualizuj(tr, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (tr.hrdina.uroven !== 2 || !tr.volby || tr.zTruhly) chybyRarit.push('úroveň po truhle nepřišla');
}
for (const [id, z] of Object.entries(hra.zbrane)) if (z.uroven > MAX_UROVEN) chybyRarit.push(`${id} přes maximum`);
for (const [id, u] of Object.entries(hra.pasivy)) if (u > MAX_UROVEN) chybyRarit.push(`${id} přes maximum`);
// Noví nepřátelé zblízka. Hrdina stojí v (0, 0), nepřátelé z okraje jsou daleko a nevadí.
const hraj = (h, sekund, kazdyKrok = () => {}) => {
  for (let t = 0; t < sekund - 1e-9; t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    kazdyKrok(h);
  }
};
const vsechnyZbrane = () => Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: MAX_UROVEN, nabiti: 0 }]));
// Schovaný duch na hrdinovi: zbraně na maximu ho nezasáhnou a on hrdinu nezraní. Viditelný ano.
for (const skryty of [true, false]) {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = vsechnyZbrane();
  const duch = pridejNepritele(h, 'duch', 6, 0);
  duch.rychlost = 0;
  Object.assign(duch, { skryty, duchCas: skryty ? SKRYTY_DUCH : VIDITELNY_DUCH });
  hraj(h, 0.5);
  const zasazen = duch.hp < duch.maxHp || !h.nepratele.includes(duch);
  if (skryty && (zasazen || h.hrdina.hp !== h.hrdina.maxHp)) chybyNepratel.push('schovaný duch dostal zásah nebo zranil');
  if (!skryty && (!zasazen || h.hrdina.hp === h.hrdina.maxHp)) chybyNepratel.push('viditelný duch se nedá zasáhnout nebo nezraní');
}
// Duch proletí skrz: zamíří na hrdinu, letí rovně dál, zmizí a po vynoření zamíří zpátky.
const prolet = novaHra(vytvorRng(seminko));
prolet.zbrane = {};
prolet.hrdina.nezranitelny = 1000;
const letec = pridejNepritele(prolet, 'duch', -200, 0);
let nejdal = -Infinity;
let bylSchovany = false;
hraj(prolet, VIDITELNY_DUCH + SKRYTY_DUCH - 0.1, () => { nejdal = Math.max(nejdal, letec.x); bylSchovany ||= letec.skryty; });
if (!(nejdal > 40) || Math.abs(letec.y) > 1e-6) chybyNepratel.push(`duch neproletěl skrz (nejdál x ${nejdal.toFixed(1)})`);
if (!bylSchovany) chybyNepratel.push('duch nezmizel');
hraj(prolet, 0.2);
if (letec.skryty || !(letec.smerX < 0)) chybyNepratel.push('duch se po zmizení neukázal nebo nezamířil zpátky');
// Houbák padne vedle hrdiny: oblak se nafoukne (nepálí), pak pálí, po 3 s zmizí. Mimo oblak nic.
const jed = novaHra(vytvorRng(seminko));
jed.zbrane = {};
const houbak = pridejNepritele(jed, 'houbak', 25, 0);
houbak.hp = 0;
hraj(jed, DT);
if (jed.oblaky.length !== 1) chybyNepratel.push(`po houbákovi ${jed.oblaky.length} oblaků`);
hraj(jed, NAFUKOVANI_OBLAKU - 2 * DT);
if (jed.hrdina.hp !== jed.hrdina.maxHp) chybyNepratel.push('oblak pálí, i když se teprve nafukuje');
hraj(jed, 0.6);
const poJedu = jed.hrdina.hp;
if (!(poJedu < jed.hrdina.maxHp) || (jed.hrdina.maxHp - poJedu) % JED_OBLAKU !== 0) chybyNepratel.push(`oblak nepálí (${poJedu} životů)`);
hraj(jed, TRVANI_OBLAKU);
if (jed.oblaky.length) chybyNepratel.push('oblak nezmizel po 3 s');
const poOblaku = jed.hrdina.hp;
jed.oblaky.push({ x: 200, y: 0, zivot: TRVANI_OBLAKU, polomer: 36 });
hraj(jed, 1);
if (jed.hrdina.hp !== poOblaku) chybyNepratel.push('vzdálený oblak zranil hrdinu');
// Oblak hrdinu zabije jen jako cokoli jiného: s Oživením vstane.
const smrtVJedu = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, { oziveni: 1 });
smrtVJedu.zbrane = {};
smrtVJedu.hrdina.hp = 1;
smrtVJedu.oblaky.push({ x: 0, y: 0, zivot: TRVANI_OBLAKU - NAFUKOVANI_OBLAKU - 0.1, polomer: 36 });
hraj(smrtVJedu, DT);
if (smrtVJedu.oziveno !== 1 || smrtVJedu.konec) chybyNepratel.push('smrt v oblaku neoživila hrdinu');
// Vlci jsou nejrychlejší z obyčejných nepřátel.
const rychlostiOstatnich = Object.entries(RYCHLOST_NEPRATEL).filter(([id]) => id !== 'vlk').map(([, r]) => r);
if (!(RYCHLOST_NEPRATEL.vlk > Math.max(...rychlostiOstatnich))) chybyNepratel.push('vlk není rychlejší než ostatní');
// Kdy přišli v hlavní hře.
for (const [druh, od] of [['duch', OD_DUCHU], ['houbak', OD_HOUBAKU], ['vlk', OD_VLKU]]) {
  if (prvni[druh] !== null && prvni[druh] < od) chybyNepratel.push(`${druh} přišel moc brzy (${prvni[druh].toFixed(1)} s)`);
  if (prvni[druh] === null && hra.cas > od + 40) chybyNepratel.push(`po ${od} s nepřišel žádný ${druh}`);
}
if (maxDuchu > MAX_DUCHU) chybyNepratel.push(`duchů najednou ${maxDuchu}`);
if (smecky.length !== hra.smecek) chybyNepratel.push(`smeček ${smecky.length}, hra jich hlásí ${hra.smecek}`);
if (prvni.houbak !== null && hra.cas > OD_HOUBAKU + 120 && oblaku === 0) chybyNepratel.push('houbáci umírali, ale žádný oblak');

// Žár lucerny: Světlonoš stojí, jeden slizák je kousek uvnitř dosahu, druhý kousek za ním.
const chybyLucerny = [];
const luc = novaHra(vytvorRng(seminko), 'svetlonos');
luc.doSpawnu = Infinity;
const dosahLucerny = staty(luc).lucerna.dosah;
const vDosahu = pridejNepritele(luc, 'slizak', dosahLucerny - 10, 0);
const zaDosahem = pridejNepritele(luc, 'slizak', -(dosahLucerny + 30), 0);
vDosahu.rychlost = 0;
zaDosahem.rychlost = 0;
aktualizuj(luc, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (!(vDosahu.hp < vDosahu.maxHp) || vDosahu.zar !== TRVANI_ZARU) chybyLucerny.push(`žár nerozzářil nepřítele v dosahu (zar ${vDosahu.zar})`);
if (vDosahu.zasazen !== 0) chybyLucerny.push('po žáru nepřítel zbělal jako od jiné zbraně');
if (zaDosahem.zar !== 0 || zaDosahem.hp !== zaDosahem.maxHp) chybyLucerny.push('žár zasáhl nepřítele za dosahem');
// další žár přijde až po 0,3 s, rozzáření (0,2 s) do té doby zhasne
for (let t = 0; t < TRVANI_ZARU + 0.05; t += DT) aktualizuj(luc, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (vDosahu.zar !== 0) chybyLucerny.push(`rozzáření nezhaslo (zar ${vDosahu.zar})`);

const zaokrouhli = (s) => Object.fromEntries(Object.entries(s).map(([id, p]) => [id, Math.round(p * 1000) / 10]));

const vysledek = {
  seminko,
  trida: hra.trida,
  preziti_s: Math.round(hra.cas),
  konec: hra.konec,
  uroven: hra.hrdina.uroven,
  zabito: hra.zabito,
  zabito_bossu: hra.zabitoBossu,
  vyber_vylepseni: volby,
  max_nepratel_najednou: maxNepratel,
  max_ulomku_najednou: maxCastic,
  zasahu_hrdiny: zasahu,
  tresu_obrazovky: tresu,
  prvni_pavouk_s: prvniPavouk === null ? null : Math.round(prvniPavouk),
  max_pavouku_najednou: maxPavouku,
  zasahu_siti: siti,
  sekund_v_siti: Math.round(krokuVSiti * DT),
  zbrane: Object.fromEntries(Object.entries(hra.zbrane).map(([id, z]) => [id, z.uroven])),
  pasivy: hra.pasivy,
  zmen_prehledu_vybavy: zmenVybavy,
  tridy_3_minuty: tridy,
  duse_za_hru: duseHry,
  vse_vylepsene_3_minuty: { preziti_s: Math.round(vylepsena.cas), uroven: vylepsena.hrdina.uroven, zabito: vylepsena.zabito },
  stesti_srdce_a_magnety: { bez: padloBez, max: padloSeStestim },
  oziveni_kamikaze: {
    ozivil_v_s: oziveni && Math.round(oziveni.cas), konec_s: Math.round(sOzivenim.cas), bez_oziveni_konec_s: Math.round(bezOziveni.cas),
  },
  cena_vseho: zaplaceno,
  rarity_nabidnutych: nabidnuto,
  truhel,
  sance_rarit_procenta: { zacatek: zaokrouhli(sZacatek), minuta_15: zaokrouhli(sPozde), stesti_max: zaokrouhli(sStesti) },
  prvni_s: Object.fromEntries(Object.entries(prvni).map(([id, c]) => [id, c === null ? null : Math.round(c)])),
  smecky_vlku: smecky,
  jedovych_oblaku: oblaku,
  zasahu_oblakem: zasahuOblakem,
  max_duchu_najednou: maxDuchu,
  prumer_schovanych_duchu: Math.round((duchuSchovanych / Math.max(1, hra.cas / DT)) * 10) / 10,
};
console.log(JSON.stringify(vysledek, null, 2));

const chyby = [...chybyTrid, ...chybyDusi, ...chybyRarit, ...new Set(chybyNepratel), ...chybyVybavy, ...chybyLucerny];
if (hra.trida !== VYCHOZI_TRIDA) chyby.push(`simulace nehraje za výchozí třídu (${hra.trida})`);
if (hra.zabito === 0) chyby.push('nikdo nezemřel, zbraně asi nestřílí');
if (hra.hrdina.uroven < 3) chyby.push('hrdina skoro nepostoupil, krystaly se asi nesbírají');
if (maxNepratel > 1500) chyby.push(`příliš mnoho nepřátel najednou (${maxNepratel})`);
if (hra.zabito > 0 && maxCastic === 0) chyby.push('po zabití nevyletěly žádné úlomky');
if (maxCastic > 400) chyby.push(`příliš mnoho úlomků najednou (${maxCastic})`);
if (tresu !== zasahu) chyby.push(`třes obrazovky jen u ${tresu} z ${zasahu} zásahů hrdiny`);
if (prvniPavouk !== null && prvniPavouk < OD_PAVOUKU) chyby.push(`pavouk přišel moc brzy (${prvniPavouk.toFixed(1)} s)`);
if (hra.cas > OD_PAVOUKU + 30 && prvniPavouk === null) chyby.push('po 4. minutě nepřišel žádný pavouk');
if (siti > 0 && krokuVSiti === 0) chyby.push('síť zásahem vznikla, ale hrdina nikdy nebyl zpomalen');

// Rekord: úložiště prohlížeče tu nahrazuje obyčejná mapa.
function nahradUloziste(uloziste) {
  Object.defineProperty(globalThis, 'localStorage', { value: uloziste, configurable: true, writable: true });
}
const mapa = new Map();
nahradUloziste({ getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => mapa.set(k, String(v)) });
const vysledekHry = { cas: Math.floor(hra.cas), uroven: hra.hrdina.uroven, zabito: hra.zabito };
if (nactiRekord() !== null) chyby.push('prázdné úložiště má mít žádný rekord');
if (!zapisVysledek(vysledekHry).novy) chyby.push('první hra nebyla rekord');
if (nactiRekord()?.cas !== vysledekHry.cas) chyby.push('rekord se neuložil');
if (zapisVysledek({ ...vysledekHry, cas: vysledekHry.cas - 1 }).novy) chyby.push('kratší hra přepsala rekord');
if (!zapisVysledek({ ...vysledekHry, cas: vysledekHry.cas + 1 }).novy) chyby.push('delší hra nebyla nový rekord');
mapa.set('hlubiny.rekord', '{rozbité');
if (nactiRekord() !== null) chyby.push('rozbitý rekord se nenačetl jako žádný');
// Zvolená třída: bez záznamu výchozí, uložená se načte, rozbitá nebo cizí je zase výchozí.
if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push('bez uložené třídy má být výchozí');
ulozTridu('havir');
if (nactiTridu() !== 'havir') chyby.push('zvolená třída se neuložila');
for (const spatna of ['{rozbité', '"toString"', '"drak"', '42']) {
  mapa.set('hlubiny.trida', spatna);
  if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push(`špatná třída ${spatna} se nenačetla jako výchozí`);
}
// Duše v úložišti: prázdné = 0 a nic koupeno, připsání a nákup se uloží, rozbitý záznam nic nedá.
if (JSON.stringify(nactiDuse()) !== '{"duse":0,"vylepseni":{}}') chyby.push('prázdné úložiště má mít 0 duší');
pripisDuse(40);
if (pripisDuse(15).duse !== 55 || nactiDuse().duse !== 55) chyby.push('duše se nepřipsaly');
if (pripisDuse(-5).duse !== 55 || pripisDuse(NaN).duse !== 55) chyby.push('záporné nebo NaN duše něco změnily');
ulozDuse(kupVylepseni(nactiDuse(), 'sila'));
if (nactiDuse().vylepseni.sila !== 1 || nactiDuse().duse !== 55 - cenaVylepseni('sila', 0)) chyby.push('nákup se neuložil');
ulozDuse(vratDuse(nactiDuse()));
if (nactiDuse().duse !== 55 || Object.keys(nactiDuse().vylepseni).length) chyby.push('vrácení se neuložilo');
for (const spatne of ['{rozbité', '42', '"duse"', '{"duse":"hodně","vylepseni":{"sila":99,"drak":3,"toString":1}}', '{"duse":-7,"vylepseni":[1,2]}']) {
  mapa.set('hlubiny.duse', spatne);
  const st = nactiDuse();
  const id = Object.keys(st.vylepseni);
  if (!Number.isInteger(st.duse) || st.duse < 0 || id.some((k) => !Object.hasOwn(VYLEPSENI, k) || st.vylepseni[k] > VYLEPSENI[k].max)) {
    chyby.push(`rozbité duše ${spatne} se načetly jako ${JSON.stringify(st)}`);
  }
}
nahradUloziste({ getItem() { throw new Error('zakázáno'); }, setItem() { throw new Error('zakázáno'); } });
if (nactiDuse().duse !== 0 || pripisDuse(10).duse !== 10) chyby.push('zakázané úložiště u duší nefunguje jako prázdné');
ulozDuse({ duse: 5, vylepseni: { sila: 1 } });
if (nactiRekord() !== null || !zapisVysledek(vysledekHry).novy) chyby.push('zakázané úložiště se nechová jako prázdné');
ulozTridu('lovec');
if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push('zakázané úložiště nevrátilo výchozí třídu');
if (chyby.length) {
  console.error('CHYBA:', chyby.join('; '));
  process.exit(1);
}
