// Simulace hry bez prohlížeče: node tests/simulace.mjs [seminko] [sekund]
// Jednoduchý hráč utíká od nepřátel a sbírá krystaly, na úrovni bere nejdřív zbraně. Hlídá, že čísla zůstanou
// rozumná (žádné NaN, nepřátel nepřibývá donekonečna) a že se hra dá hrát a prohrát.
// Hlídá i ozdoby: úlomky po zabití a třes obrazovky po zásahu hrdiny.
// Pavouci: nesmí přijít před 4. minutou, jejich zásah zalepí hrdinu sítí a v síti chodí pomaleji.
// Rekord pro menu: výsledek se uloží jen když je delší, rozbitý záznam ani chybějící úložiště hru neshodí.
// Třídy: hlavní hra je za výchozí třídu, každá třída pak hraje krátce sama (svoje zbraň, svoje výhoda).
import { vytvorRng } from '../src/rng.js';
import {
  novaHra, aktualizuj, vyber, staty, TRVANI_TRESU, OD_PAVOUKU, TRVANI_SITE, ZPOMALENI_SITI, TRIDY, VYCHOZI_TRIDA,
} from '../src/hra.js';
import { nactiRekord, zapisVysledek, nactiTridu, ulozTridu } from '../src/ulozeni.js';

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

// Jednoduchý hráč: utíká od nepřátel v blízkosti a jinak jde pro nejbližší krystal.
// Bez zbraně na dálku (jen krumpáče nebo lucerna) pustí nepřátele blíž, jinak by je nikdy nezasáhl.
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
  aktualizuj(hra, DT, rozhodni(hra, t), SIRKA, VYSKA);
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
    vyber(hra, zvol(hra.volby));
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
  tridy_3_minuty: tridy,
};
console.log(JSON.stringify(vysledek, null, 2));

const chyby = [...chybyTrid];
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
nahradUloziste({ getItem() { throw new Error('zakázáno'); }, setItem() { throw new Error('zakázáno'); } });
if (nactiRekord() !== null || !zapisVysledek(vysledekHry).novy) chyby.push('zakázané úložiště se nechová jako prázdné');
ulozTridu('lovec');
if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push('zakázané úložiště nevrátilo výchozí třídu');
if (chyby.length) {
  console.error('CHYBA:', chyby.join('; '));
  process.exit(1);
}
