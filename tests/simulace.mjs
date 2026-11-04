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
// Bedničky a sudy: objevují se jen mimo obrazovku, nejvýš 12 naráz, daleko za hrdinou mizí. Každá zbraň je rozbije,
// kořist padá podle šancí, zlaťák je po hře duše navíc a bomba složí nepřátele na obrazovce, ale ne Strážce
// ani schovaného ducha.
// Bossové: chodí po 3 minutách v pořadí Strážce, Matka, Obr, Bludička a pak znovu, každý s vlastním nápisem a
// spritem 16×16. Každý živý boss má svůj pruh (bossBary). Každý útok zblízka: dupnutí trefí jen uvnitř kruhu a až po
// napřahování, Matka pouští pavoučky (vyrazí rychleji) do limitu, kámen trefí toho, kdo stojí nebo běží rovně, a mine toho, kdo po hodu
// změní směr, Bludička se přenese a vystřelí dva vějíře. Souboj s každým bossem zvlášť ukáže, jak dlouho trvá a kolik
// životů stojí s uhýbáním a bez něj (na vyvážení).
// Bot se útokům bossů vyhýbá jako člověk, který je vidí (místo dopadu, kruh dupnutí, letící střely).
import { readFileSync } from 'node:fs';
import { vytvorRng } from '../src/rng.js';
import {
  novaHra, aktualizuj, vyber, staty, TRVANI_TRESU, OD_PAVOUKU, TRVANI_SITE, ZPOMALENI_SITI, TRIDY, VYCHOZI_TRIDA,
  ZIVOTY_PO_OZIVENI, NEZRANITELNY_PO_OZIVENI, ODHOZENI_PRI_OZIVENI,
  ZBRANE, RARITY, PORADI_RARIT, MAX_UROVEN, SILA_ZA_PREBYTEK, LECENI_ODPOCINKU, CAS_PLNYCH_RARIT, sanceRarit, nabidka, karta,
  OD_DUCHU, VIDITELNY_DUCH, SKRYTY_DUCH, OD_HOUBAKU, TRVANI_OBLAKU, NAFUKOVANI_OBLAKU, JED_OBLAKU,
  OD_VLKU, SMECKA_OD, SMECKA_DO, RYCHLOST_NEPRATEL, MAX_DUCHU, pridejNepritele, PASIVY, seznamVybavy, TRVANI_ZARU,
  MAX_BEDEN, KORIST_BEDEN, losujKorist, xpZBedny, JISKRA_NA_BEDNU, TRVANI_VYBUCHU,
  PORADI_BOSSU, BOSSOVE, bossBary, POLOMER_DUPNUTI, NAPRAH_DUPNUTI, DUPNUTI, SNUSKA, MAX_PAVOUCKU, LET_KAMENE,
  POLOMER_KAMENE, KAMEN, NABITI_BLUDICKY, STREL_BLUDICKY, STRELA_BLUDICKY, SALV_BLUDICKY, MEZI_SALVAMI,
  VYRAZENI_PAVOUCKU, RYCHLOST_VYRAZENI,
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
const chybyBeden = [];
const videneBedny = new WeakSet();
let maxBeden = 0;
const prisliBossove = [];
const chybyBossu = [];
let maxPavoucku = 0;
// Bedna je celá mimo obrazovku, když její sprite (30 px) nezasahuje do výřezu kolem hrdiny.
const mimoObrazovku = (b, h) => Math.abs(b.x - h.x) > SIRKA / 2 + 15 || Math.abs(b.y - h.y) > VYSKA / 2 + 15;

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
// uhyba = false: útoky bossů nevidí (jen na porovnání v soubojích, kolik uhýbání ušetří).
function rozhodni(hra, t, uhyba = true) {
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
  const utec = (o, polomer, vaha) => {
    const vx = hrdina.x - o.x;
    const vy = hrdina.y - o.y;
    const d = Math.hypot(vx, vy);
    if (d < polomer && d > 0) {
      dx += (vx / d) * (polomer - d) * vaha;
      dy += (vy / d) * (polomer - d) * vaha;
    }
  };
  for (const o of hra.oblaky) utec(o, o.polomer + 20, 4);
  if (!uhyba) return smer(hra, t, dx, dy);
  // Útoky bossů jsou vidět dopředu: místo dopadu kamene a kruh, kam Strážce dupne.
  for (const k of hra.kameny) utec(k, POLOMER_KAMENE + 16, 4);
  for (const n of hra.nepratele) if (n.naprah > 0) utec(n, POLOMER_DUPNUTI + 20, 2);
  // Střele Bludičky uhne stranou (utíkat před ní nejde, je rychlejší).
  for (const st of hra.strelyBossu) {
    const vx = hrdina.x - st.x;
    const vy = hrdina.y - st.y;
    const d = Math.hypot(vx, vy);
    const rychlost = Math.hypot(st.vx, st.vy) || 1;
    if (d > 140 || vx * st.vx + vy * st.vy <= 0) continue;
    let kx = -st.vy / rychlost;
    let ky = st.vx / rychlost;
    if (kx * vx + ky * vy < 0) { kx = -kx; ky = -ky; }
    dx += kx * (140 - d) * 3;
    dy += ky * (140 - d) * 3;
  }
  return smer(hra, t, dx, dy);
}

// Když nemá před čím utíkat, jde pro nejbližší krystal, a když žádný není, chodí v kruhu.
function smer(hra, t, dx, dy) {
  const { hrdina } = hra;
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
    if (n.boss) {
      prisliBossove.push({ druh: n.druh, s: Math.round(hra.cas) });
      if (hra.oznameni?.text !== BOSSOVE[n.druh]?.prichod) chybyBossu.push(`${n.druh} přišel s nápisem ${hra.oznameni?.text}`);
    }
  }
  // Pruh pro každého živého bosse, v pořadí příchodu.
  const bary = bossBary(hra);
  const zivi = hra.nepratele.filter((n) => n.boss);
  if (bary.length !== zivi.length || bary.some((b, i) => b.nepritel !== zivi[i] || !(b.hp >= 0 && b.hp <= b.maxHp) || b.nazev !== BOSSOVE[b.druh]?.nazev)) {
    chybyBossu.push(`pruhy bossů nesedí v čase ${t.toFixed(1)} s`);
  }
  maxPavoucku = Math.max(maxPavoucku, hra.nepratele.filter((n) => n.druh === 'pavoucek').length);
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
  maxBeden = Math.max(maxBeden, hra.bedny.length);
  for (const b of hra.bedny) {
    if (videneBedny.has(b)) continue;
    videneBedny.add(b);
    if (!mimoObrazovku(b, hra.hrdina)) chybyBeden.push(`bedna se objevila na obrazovce v čase ${t.toFixed(1)} s`);
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
const ocekavaneDuse = Math.floor(hra.cas / DUSE_ZA.sekund) + Math.floor(hra.zabito / DUSE_ZA.zabitych) + hra.zabitoBossu * DUSE_ZA.strazce
  + hra.zlataky * DUSE_ZA.zlatak;
if (duseHry.celkem !== ocekavaneDuse || duseHry.celkem !== duseHry.cas + duseHry.zabiti + duseHry.strazci + duseHry.zlataky) chybyDusi.push('duše za hru nesedí');
if (dusZaHru({ cas: 0, zabito: 0, zabitoBossu: 0, zlataky: 7 }).celkem !== 7 * DUSE_ZA.zlatak) chybyDusi.push('zlaťáky nedávají duše');
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

// Bedničky. Kořist padá podle šancí (rovnoměrné losy 0..1 dají přesně ty podíly).
const sanceKoristi = Object.values(KORIST_BEDEN).reduce((a, b) => a + b, 0);
if (Math.abs(sanceKoristi - 1) > 1e-9) chybyBeden.push(`šance kořisti dávají ${sanceKoristi}`);
const losovanaKorist = Object.fromEntries(Object.keys(KORIST_BEDEN).map((id) => [id, 0]));
for (let i = 0; i < 10000; i++) losovanaKorist[losujKorist((i + 0.5) / 10000)] += 1;
for (const [id, sance] of Object.entries(KORIST_BEDEN)) {
  if (Math.abs(losovanaKorist[id] / 10000 - sance) > 0.001) chybyBeden.push(`${id} z bedny padá ${losovanaKorist[id] / 10000} místo ${sance}`);
}
if (!(KORIST_BEDEN.bomba < Math.min(...Object.entries(KORIST_BEDEN).filter(([id]) => id !== 'bomba').map(([, p]) => p)))) chybyBeden.push('bomba není nejvzácnější');
// Hrdina stojí sám (bez vln a nových beden) a bedny mu postavíme kolem.
const tichaHra = (zbrane) => {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = zbrane;
  h.doSpawnu = Infinity;
  h.doBedny = Infinity;
  return h;
};
const bedna = (h, x, y, druh = 'bedna') => {
  const b = { druh, x, y, rozbita: false };
  h.bedny.push(b);
  return b;
};
const korist = (h) => Object.values(h.zBeden).reduce((a, b) => a + b, 0);
// Každá zbraň rozbije bednu, na kterou dosáhne. Bedna daleko (500 px) zůstane celá.
const dosahLucerny1 = staty(novaHra(vytvorRng(seminko), 'svetlonos')).lucerna.dosah;
const kdeBedna = { jiskra: [150, 0], lucerna: [dosahLucerny1 - 10, 0], krumpace: [64, 0], blesk: [200, 0] };
const rozbiteZbrani = {};
for (const id of Object.keys(ZBRANE)) {
  const h = tichaHra({ [id]: { uroven: 1, nabiti: 0 } });
  const blizka = bedna(h, ...kdeBedna[id]);
  const daleka = bedna(h, 0, 500, 'sud');
  let za = null;
  for (let t = 0; t < 3 && za === null; t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (blizka.rozbita) za = h.cas;
  }
  rozbiteZbrani[id] = za === null ? null : Math.round(za * 100) / 100;
  if (!blizka.rozbita || h.bedny.includes(blizka)) chybyBeden.push(`${id} nerozbila bednu`);
  if (daleka.rozbita || !h.bedny.includes(daleka)) chybyBeden.push(`${id} rozbila bednu 500 px daleko`);
  if (h.rozbitoBeden !== 1 || korist(h) !== 1) chybyBeden.push(`${id}: rozbito ${h.rozbitoBeden}, kořisti ${korist(h)}`);
  const naZemi = h.krystaly.length + h.predmety.length + (h.hrdina.xp > 0 || h.hrdina.uroven > 1 ? 1 : 0);
  if (naZemi < 1) chybyBeden.push(`${id}: z bedny nic nevypadlo`);
  if (!h.castice.length) chybyBeden.push(`${id}: bedna se rozbila bez třísek`);
}
// Jiskra míří na bednu, jen když není blíž nepřítel: nepřítel blíž než bedna dostane ránu první.
const prednost = tichaHra({ jiskra: { uroven: 1, nabiti: 0 } });
const zaNepritelem = bedna(prednost, 200, 0);
const blizkyNepritel = pridejNepritele(prednost, 'kostlivec', 0, 120);
blizkyNepritel.rychlost = 0;
aktualizuj(prednost, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (!(prednost.strely[0]?.vy > 0) || zaNepritelem.rozbita) chybyBeden.push('jiskra střílí na bednu, i když je nepřítel blíž');
const mimoDosah = tichaHra({ jiskra: { uroven: 1, nabiti: 0 } });
bedna(mimoDosah, JISKRA_NA_BEDNU + 40, 0);
aktualizuj(mimoDosah, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (mimoDosah.strely.length) chybyBeden.push('jiskra střílí na bednu za dosahem');
// Krystal z bedny je bohatší než z netopýra.
if (!(xpZBedny(novaHra(vytvorRng(seminko))) > 1)) chybyBeden.push('krystal z bedny nedá víc než netopýr');
// Bomba pod nohama: nepřátelé na obrazovce padnou hned (s krystaly), Strážce, schovaný duch a nepřítel
// za okrajem obrazovky zůstanou.
const bum = tichaHra({});
bum.hrdina.nezranitelny = 10;
const naObrazovce = [pridejNepritele(bum, 'netopyr', 300, 100), pridejNepritele(bum, 'kostlivec', -500, -300)];
const strazce = pridejNepritele(bum, 'strazce', -200, 0);
const schovany = pridejNepritele(bum, 'duch', 250, -150);
Object.assign(schovany, { skryty: true, duchCas: SKRYTY_DUCH });
const zaOkrajem = pridejNepritele(bum, 'netopyr', SIRKA / 2 + 100, 0);
for (const n of bum.nepratele) n.rychlost = 0;
bum.predmety.push({ druh: 'bomba', x: 0, y: 0 });
aktualizuj(bum, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (naObrazovce.some((n) => bum.nepratele.includes(n)) || bum.zabito !== 2) chybyBeden.push(`bomba nesložila nepřátele na obrazovce (zabito ${bum.zabito})`);
if (bum.krystaly.length < 2) chybyBeden.push('z nepřátel po bombě nevypadly krystaly');
if (!bum.nepratele.includes(strazce) || strazce.hp !== strazce.maxHp) chybyBeden.push('bomba ublížila Strážci');
if (!bum.nepratele.includes(schovany) || schovany.hp !== schovany.maxHp) chybyBeden.push('bomba našla schovaného ducha');
if (!bum.nepratele.includes(zaOkrajem)) chybyBeden.push('bomba zabila nepřítele mimo obrazovku');
if (bum.bomb !== 1 || !(bum.vybuch > 0 && bum.vybuch <= TRVANI_VYBUCHU) || bum.predmety.some((p) => p.druh === 'bomba')) chybyBeden.push('bomba nevybuchla jednou');
for (let t = 0; t < TRVANI_VYBUCHU + 0.1; t += DT) aktualizuj(bum, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (bum.vybuch !== 0) chybyBeden.push('výbuch na obrazovce nezhasl');
// Zlaťák pod nohama: přičte se a po hře je z něj duše.
const zlato = tichaHra({});
zlato.predmety.push({ druh: 'zlatak', x: 0, y: 0 }, { druh: 'zlatak', x: 5, y: 0 });
aktualizuj(zlato, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (zlato.zlataky !== 2 || zlato.predmety.length || dusZaHru(zlato).zlataky !== 2 * DUSE_ZA.zlatak) chybyBeden.push(`zlaťáky: ${zlato.zlataky}`);
// Hrdina stojí minutu bez nepřátel: bedny přibývají jen mimo obrazovku až do 12. Po skoku daleko staré zmizí.
const louka = tichaHra({});
louka.doBedny = 0;
let nejvic = 0;
for (let t = 0; t < 60; t += DT) {
  aktualizuj(louka, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  nejvic = Math.max(nejvic, louka.bedny.length);
  if (louka.bedny.some((b) => !mimoObrazovku(b, louka.hrdina))) { chybyBeden.push('bedna na obrazovce u stojícího hrdiny'); break; }
}
if (nejvic !== MAX_BEDEN || louka.bedny.length !== MAX_BEDEN) chybyBeden.push(`u stojícího hrdiny ${louka.bedny.length} beden (nejvíc ${nejvic})`);
const stare = [...louka.bedny];
louka.hrdina.x += 5000;
aktualizuj(louka, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (stare.some((b) => louka.bedny.includes(b))) chybyBeden.push('bedny daleko za hrdinou nezmizely');
// Hlavní hra: bedny se objevovaly, rozbíjely a kořist sedí s počtem rozbitých.
if (maxBeden > MAX_BEDEN) chybyBeden.push(`beden naráz ${maxBeden}`);
if (hra.beden === 0 || (hra.cas > 120 && hra.rozbitoBeden === 0)) chybyBeden.push(`v hlavní hře objeveno ${hra.beden} beden, rozbito ${hra.rozbitoBeden}`);
if (korist(hra) !== hra.rozbitoBeden) chybyBeden.push(`kořisti ${korist(hra)}, rozbito ${hra.rozbitoBeden}`);

// Bossové. Přišli v hlavní hře ve správném pořadí a čase (po 3 minutách)?
prisliBossove.forEach((b, i) => {
  if (b.druh !== PORADI_BOSSU[i % PORADI_BOSSU.length] || Math.abs(b.s - (i + 1) * 180) > 1) chybyBossu.push(`${i + 1}. boss ${b.druh} v ${b.s} s`);
});
if (prisliBossove.length !== Math.floor(hra.cas / 180)) chybyBossu.push(`za ${Math.round(hra.cas)} s přišlo ${prisliBossove.length} bossů`);
if (maxPavoucku > MAX_PAVOUCKU) chybyBossu.push(`pavoučků naráz ${maxPavoucku}`);
// Každý má jiný nápis a vlastní sprite aspoň 16×16 (čtverec).
const prichody = PORADI_BOSSU.map((id) => BOSSOVE[id].prichod);
if (new Set(prichody).size !== PORADI_BOSSU.length) chybyBossu.push('dva bossové mají stejný nápis');
const textSpritu = readFileSync(new URL('../src/sprity.js', import.meta.url), 'utf8');
for (const id of [...PORADI_BOSSU, 'pavoucek', 'kamen']) {
  const blok = textSpritu.match(new RegExp(`^ {2}${id}: \\[\\n([\\s\\S]*?)\\n {2}\\],`, 'm'));
  const radky = blok ? [...blok[1].matchAll(/'([^']*)'/g)].map((m) => m[1]) : [];
  const ctverec = radky.length > 0 && radky.every((r) => r.length === radky.length);
  if (!ctverec || (PORADI_BOSSU.includes(id) && radky.length < 16)) chybyBossu.push(`sprite ${id} je ${radky[0]?.length}×${radky.length}`);
}
// Bossové zblízka: hrdina stojí sám bez zbraní (žádné vlny, bedny ani další bossové), boss se nehýbe.
const bossZblizka = (druh, x, y) => {
  const h = tichaHra({});
  h.dalsiBoss = Infinity;
  h.dalsiSmecka = Infinity;
  const b = pridejNepritele(h, druh, x, y);
  b.rychlost = 0;
  return [h, b];
};
// Strážce: kousek od hrdiny se napřáhne, a až pak vlna trefí (jednou). Kousek za kruhem dupne taky, ale netrefí.
for (const [vzdal, ma] of [[100, true], [POLOMER_DUPNUTI + 40, false]]) {
  const [h, b] = bossZblizka('strazce', vzdal, 0);
  let naprahOd = null;
  let zasahV = null;
  let vln = 0;
  const videneVlny = new WeakSet();
  hraj(h, 4, () => {
    if (b.naprah > 0 && naprahOd === null) naprahOd = h.cas;
    for (const v of h.vlny) if (!videneVlny.has(v)) { videneVlny.add(v); vln += 1; }
    if (h.hrdina.hp < h.hrdina.maxHp && zasahV === null) zasahV = h.cas;
  });
  if (!vln || naprahOd === null) chybyBossu.push(`Strážce ${vzdal} px od hrdiny nedupl`);
  if (ma && (h.zasahyBossu.dupnuti !== 1 || h.hrdina.hp !== h.hrdina.maxHp - DUPNUTI)) chybyBossu.push(`dupnutí 100 px od Strážce: ${h.hrdina.hp} životů`);
  if (ma && zasahV !== null && zasahV - naprahOd < NAPRAH_DUPNUTI - 1e-9) chybyBossu.push('dupnutí trefilo dřív, než se Strážce napřáhl');
  if (!ma && h.hrdina.hp !== h.hrdina.maxHp) chybyBossu.push('dupnutí trefilo hrdinu za kruhem');
}
// Matka: první snůška kolem ní, pak přibývá jen do limitu.
{
  const [h, b] = bossZblizka('matka', 150, 0);
  h.hrdina.nezranitelny = Infinity;
  const pavoucci = () => h.nepratele.filter((n) => n.druh === 'pavoucek');
  for (let t = 0; t < 3 && !pavoucci().length; t += DT) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (pavoucci().length !== SNUSKA || pavoucci().some((n) => Math.hypot(n.x - b.x, n.y - b.y) > b.polomer + 20)) chybyBossu.push(`první snůška ${pavoucci().length} pavoučků`);
  // čerstvě vypuštění vyrazí rychleji, po chvíli zpomalí na svou rychlost
  if (!pavoucci().every((n) => n.vyrazi > 0) || !(RYCHLOST_VYRAZENI > 1)) chybyBossu.push('pavoučci po vypuštění nevyrazili');
  hraj(h, VYRAZENI_PAVOUCKU + DT);
  if (pavoucci().some((n) => n.vyrazi > 0)) chybyBossu.push('pavoučci nepřestali vyrážet');
  let nejvic = 0;
  hraj(h, 60, () => { nejvic = Math.max(nejvic, pavoucci().length); });
  if (nejvic !== MAX_PAVOUCKU) chybyBossu.push(`Matka nakladla nejvýš ${nejvic} pavoučků`);
}
// Obr: stojícího hrdinu kámen trefí (až po letu), toho, kdo běží rovně, taky (míří mu do cesty). Kdo po hodu
// zahne, toho mine.
{
  const [h] = bossZblizka('obr', 300, 0);
  hraj(h, 2.4 + LET_KAMENE + 0.3);
  if (h.zasahyBossu.kamen !== 1 || h.hrdina.hp !== h.hrdina.maxHp - KAMEN) chybyBossu.push(`kámen do stojícího hrdiny: ${h.zasahyBossu.kamen} zásahů`);
  for (const zahne of [false, true]) {
    const [b2] = bossZblizka('obr', 300, 0);
    let hozeno = 0;
    let predHrdinou = true;
    const videne = new WeakSet();
    for (let t = 0; t < 4.5; t += DT) {
      aktualizuj(b2, DT, zahne && hozeno ? { dx: 1, dy: 0 } : { dx: 0, dy: 1 }, SIRKA, VYSKA);
      for (const k of b2.kameny) {
        if (videne.has(k)) continue;
        videne.add(k);
        hozeno += 1;
        if (!(k.y > b2.hrdina.y + 30)) predHrdinou = false;
      }
    }
    if (hozeno !== 1 || b2.zasahyBossu.kamen !== (zahne ? 0 : 1)) chybyBossu.push(`hrdina, který ${zahne ? 'zahne' : 'běží rovně'}: hozeno ${hozeno}, trefeno ${b2.zasahyBossu.kamen}`);
    if (!predHrdinou) chybyBossu.push('obr nehází kámen tam, kam hrdina běží');
  }
}
// Bludička: přenese se k hrdinovi, chvíli se nabíjí (stojí), vystřelí vějíř a prostřední střela stojícího trefí.
{
  const [h, b] = bossZblizka('bludicka', 500, 0);
  b.rychlost = 40;
  hraj(h, 2.5 + DT);
  const d = Math.hypot(b.x - h.hrdina.x, b.y - h.hrdina.y);
  if (!(d >= 120 && d <= 221) || !(b.nabiji > 0)) chybyBossu.push(`Bludička se přenesla na ${d.toFixed(0)} px`);
  const kde = { x: b.x, y: b.y };
  hraj(h, NABITI_BLUDICKY - 2 * DT);
  if (b.x !== kde.x || b.y !== kde.y || h.strelyBossu.length) chybyBossu.push('Bludička se při nabíjení hýbe nebo střílí');
  hraj(h, 3 * DT);
  if (h.strelyBossu.length !== STREL_BLUDICKY) chybyBossu.push(`Bludička vystřelila ${h.strelyBossu.length} střel`);
  hraj(h, MEZI_SALVAMI);
  if (h.strelyBossu.length !== STREL_BLUDICKY * SALV_BLUDICKY) chybyBossu.push(`Bludička po salvách: ${h.strelyBossu.length} střel`);
  hraj(h, 1.6);
  if (h.zasahyBossu.strela < 1 || (h.hrdina.maxHp - h.hrdina.hp) % STRELA_BLUDICKY !== 0) chybyBossu.push(`střely Bludičky: ${h.zasahyBossu.strela} zásahů, ${h.hrdina.hp} životů`);
}
// Dvě kola bossů: pořadí a nápisy, osm pruhů. Po zabití druhého pruh zmizí a truhla ví, od koho je.
{
  const h = tichaHra({});
  h.hrdina.nezranitelny = Infinity;
  h.dalsiSmecka = Infinity;
  h.dalsiPrichod = Infinity;
  const druhy = [];
  for (let i = 0; i < PORADI_BOSSU.length * 2; i++) {
    h.cas = h.dalsiBoss - DT / 2;
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    const novy = h.nepratele.filter((n) => n.boss).at(-1);
    druhy.push(novy?.druh);
    if (h.oznameni?.text !== BOSSOVE[novy?.druh]?.prichod) chybyBossu.push(`${novy?.druh} bez svého nápisu`);
  }
  if (druhy.join() !== [...PORADI_BOSSU, ...PORADI_BOSSU].join()) chybyBossu.push(`bossové šli v pořadí ${druhy}`);
  const bary = bossBary(h);
  if (bary.map((b) => b.druh).join() !== druhy.join()) chybyBossu.push(`pruhů ${bary.length}: ${bary.map((b) => b.druh)}`);
  const druhy2 = h.nepratele.filter((n) => n.boss)[1];
  druhy2.hp = 0;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (bossBary(h).length !== druhy.length - 1 || bossBary(h).some((b) => b.nepritel === druhy2)) chybyBossu.push('pruh zabitého bosse nezmizel');
  const truhla = h.predmety.find((p) => p.druh === 'truhla');
  if (truhla?.od !== druhy2.druh) chybyBossu.push(`truhla po ${druhy2.druh} je od ${truhla?.od}`);
  Object.assign(truhla ?? {}, { x: h.hrdina.x, y: h.hrdina.y });
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (!h.zTruhly || h.truhlaOd !== druhy2.druh || h.volby?.some((v) => v.rarita === 'bezna')) chybyBossu.push('truhla bosse neotevřela výběr');
  if (h.zabitoBossu !== 1 || dusZaHru(h).strazci !== DUSE_ZA.strazce) chybyBossu.push('zabitý boss nedal duše');
}
// Bomba žádnému bossovi neublíží.
{
  const h = tichaHra({});
  h.hrdina.nezranitelny = 10;
  const bossove = PORADI_BOSSU.map((id, i) => pridejNepritele(h, id, 120 * Math.cos(i * 1.6) + 200, 120 * Math.sin(i * 1.6)));
  h.predmety.push({ druh: 'bomba', x: 0, y: 0 });
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (bossove.some((b) => !h.nepratele.includes(b) || b.hp !== b.maxHp)) chybyBossu.push('bomba ublížila bossovi');
}
// Souboj s každým bossem zvlášť, hrdina ve 3. minutě (Jiskra 3, Blesk 2, Krumpáče 2) a bot hraje jako vždycky.
// Sám na sám: za kolik ho porazí (musí do 90 s). Uprostřed vln, 60 s s uhýbáním a bez něj: kolikrát ho útok
// bosse trefí a kolik životů hrdina ztratí (na vyvážení). Útoky všech bossů dohromady musí hrdinu, který
// neuhýbá, trefit víckrát než toho, který uhýbá.
const souboje = {};
const souboj = (druh, { uhyba = true, vlny = false, sekund = 90 } = {}) => {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = { jiskra: { uroven: 3, nabiti: 0 }, blesk: { uroven: 2, nabiti: 0 }, krumpace: { uroven: 2, nabiti: 0 } };
  h.cas = 180;
  h.dalsiBoss = Infinity;
  h.dalsiSmecka = Infinity;
  h.dalsiPrichod = Infinity;
  if (!vlny) { h.doSpawnu = Infinity; h.doBedny = Infinity; }
  const b = pridejNepritele(h, druh, 320, 0);
  for (let t = 0; t < sekund && (vlny || h.nepratele.includes(b)) && !h.konec; t += DT) {
    aktualizuj(h, DT, rozhodni(h, t, uhyba), SIRKA, VYSKA);
    if (h.volby) vyber(h, zvol(h.volby));
  }
  return {
    porazen: !h.nepratele.includes(b), konec: h.konec, zbyva: b.hp, za_s: Math.round(h.cas - 180),
    ztraceno: h.hrdina.maxHp - Math.max(0, h.hrdina.hp), utokem: Object.values(h.zasahyBossu).reduce((a, c) => a + c, 0),
  };
};
let utokemUhyba = 0;
let utokemNeuhyba = 0;
for (const druh of PORADI_BOSSU) {
  const sam = souboj(druh);
  const uhyba = souboj(druh, { vlny: true, sekund: 60 });
  const neuhyba = souboj(druh, { vlny: true, sekund: 60, uhyba: false });
  utokemUhyba += uhyba.utokem;
  utokemNeuhyba += neuhyba.utokem;
  souboje[druh] = {
    sam_porazen_za_s: sam.porazen ? sam.za_s : null,
    ve_vlnach_60_s: {
      uhyba: { zasahu_utokem: uhyba.utokem, ztraceno_zivotu: uhyba.ztraceno, porazen: uhyba.porazen, padl: uhyba.konec },
      neuhyba: { zasahu_utokem: neuhyba.utokem, ztraceno_zivotu: neuhyba.ztraceno, porazen: neuhyba.porazen, padl: neuhyba.konec },
    },
  };
  if (!sam.porazen) chybyBossu.push(`${druh} se sám na sám nedal porazit za 90 s (${sam.konec ? 'hrdina padl' : `zbývá ${sam.zbyva}`})`);
}
if (!(utokemNeuhyba > utokemUhyba)) chybyBossu.push(`útoky bossů trefí neuhýbajícího ${utokemNeuhyba}×, uhýbajícího ${utokemUhyba}×`);

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
  bedny: {
    objevilo: hra.beden, rozbito: hra.rozbitoBeden, max_naraz: maxBeden, korist: hra.zBeden, zlataku: hra.zlataky, bomb: hra.bomb,
    rozbila_zbran_za_s: rozbiteZbrani,
  },
  bossove: {
    prisli: prisliBossove, zabito: hra.zabitoBossu, zasahy_hrdiny: hra.zasahyBossu, max_pavoucku: maxPavoucku, souboje,
  },
};
console.log(JSON.stringify(vysledek, null, 2));

const chyby = [
  ...chybyTrid, ...chybyDusi, ...chybyRarit, ...new Set(chybyNepratel), ...chybyVybavy, ...chybyLucerny, ...new Set(chybyBeden),
  ...new Set(chybyBossu),
];
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
