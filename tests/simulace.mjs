// Simulace hry bez prohlížeče: node tests/simulace.mjs [seminko] [sekund]
// Jednoduchý hráč utíká od nepřátel a sbírá krystaly, na úrovni bere nejdřív zbraně. Hlídá, že čísla zůstanou
// rozumná (žádné NaN, nepřátel nepřibývá donekonečna) a že se hra dá hrát a prohrát.
// Hlídá i ozdoby: úlomky po zabití a třes obrazovky po zásahu hrdiny.
// Pavouci: nesmí přijít před 4. minutou, jejich zásah zalepí hrdinu sítí a v síti chodí pomaleji.
// Rekord pro menu: výsledek se uloží jen když je delší, rozbitý záznam ani chybějící úložiště hru neshodí.
// Třídy: hlavní hra je za výchozí třídu, každá třída pak hraje krátce sama (svoje zbraň, svoje výhoda).
// Duše a trvalá vylepšení: hlavní hra je bez vylepšení (stejná jako před nimi), prázdná nebo rozbitá vylepšení
// hrají úplně stejně, každé vylepšení změní svou vlastnost, Oživení vrátí hrdinu jednou, obchod a úložiště sedí.
// Rarity karet: šance sedí s losováním, s časem a Štěstím přibývá vzácnějších, truhla nedá běžnou, karta přidá
// vždy celý počet úrovní své rarity a dá přesně to, co slibuje (úrovně, poškození, doléčení).
// Úrovně bez stropu: 1–5 jako dřív, každá další +8 % poškození a každá třetí ještě kus, nabíjení nebo velikost,
// nic nepřeleze strop (12 kusů, čtvrtina nabíjení, 2,5× velikost), pasivy nad pátou dají menší díl a na stropu
// poškození, nabídka nikdy nedojde a zbraně na vysoké úrovni hru nerozbijí (žádné NaN, limity drží).
// Noví nepřátelé: duch, houbák a vlk nepřijdou dřív, než mají. Schovaného ducha zbraně nezasáhnou a on nezraní,
// duch proletí skrz místo, kam mířil. Oblak po houbákovi se nejdřív nafoukne, pak pálí a za 3 s zmizí.
// Vlci chodí jen ve smečkách po 4–6 a jsou rychlejší než ostatní nepřátelé.
// Přehled výbavy v rohu: sedí s tím, co hrdina má (pořadí, úrovně, stupeň rámečku, ikony se sprity) a po každém
// výběru zbraně nebo pasivy se změní, po Odpočinku ne.
// Žár lucerny: zasažený nepřítel v dosahu se krátce rozzáří (místo bílého bliknutí), za dosahem ne, a zase zhasne.
// Bedničky a sudy: objevují se jen mimo obrazovku, nejvýš 12 naráz, daleko za hrdinou mizí. Každá zbraň je rozbije,
// kořist padá podle šancí, zlaťák je po hře duše navíc a bomba složí nepřátele na obrazovce, ale ne Strážce
// ani schovaného ducha.
// Bossové: chodí po 3 minutách v pořadí Strážce, Matka, Obr, Bludička a pak znovu, každý s vlastním nápisem a
// spritem 16×16. Každý živý boss má svůj pruh (bossBary).
// Schopnosti bossů: každý má 2–3 (data v SCHOPNOSTI a BOSSOVE) a střídá je dokola, každá začne varováním kolem
// 0,8 s, při kterém boss stojí a nikomu neublíží. Dupnutí trefí jen v kruhu, odhodí a otřese obrazovkou; Hod hodí
// 3–5 kamenů (stojícího trefí, kdo po hodu uhne, toho minou) a po dopadu vybuchnou; Výpad míří, zamkne směr a
// proběhne rovně (kdo uhne kolmo, toho mine); Vyvolání přivolá 6–8 pomocníků do limitu; Vějíř Bludičky se přenese
// a vystřelí. Pod polovinou životů boss zuří a střídá schopnosti rychleji. Souboj s každým bossem zvlášť ukáže, jak
// dlouho trvá a kolik životů stojí s uhýbáním a bez něj (na vyvážení). Boss musí jít porazit a zároveň umí ublížit.
// Bot se schopnostem bossů vyhýbá jako člověk, který je vidí (stín dopadu, kruh dupnutí, čára výpadu, střely).
// Trnová past a Zrcadlový štít: trs vyraší pod nepřítelem (víc trsů každý jinde, za dosahem nic), než doroste,
// neškodí, pak zraňuje a zpomalí (bosse napůl), zpomalení po vylezení dozní a trs zmizí. Zrcadlo odhodí, koho se
// dotkne (bosse ne, schovaného ducha ani nevidí), a střelu bosse pošle zpátky, kde zraní nepřítele a ne hrdinu.
// Každá zbraň má 5 řádků popisu a ikonu se spritem.
// Hrozba: hra nekončí, každou minutu je hrozba o stupeň výš (s ohlášením) a noví nepřátelé mají životy, poškození
// a rychlost podle tabulky HROZBA. Elity nechodí před 5. minutou, od 10. přibývají, bossové nejsou nikdy elitou.
// Na vyvážení hraje plně vylepšený bot až do konce: musí padnout do 30 minut (nikdo nevydrží donekonečna).
// Čísla poškození: zásahy do stejného nepřítele se do SLUCOVANI_CISEL sečtou, jiný nepřítel má své číslo, silná rána
// zežloutne a obyčejná ne, naráz je nejvýš MAX_CISEL čísel (i se zbraněmi na 60. úrovni), každá rána hrdinovi
// má nad ním červené číslo, léčení zelené, a za TRVANI_CISLA číslo zmizí. Přepínač v nastavení se uloží.
import { readFileSync } from 'node:fs';
import { vytvorRng } from '../src/rng.js';
import {
  novaHra, aktualizuj, vyber, staty, TRVANI_TRESU, OD_PAVOUKU, TRVANI_SITE, ZPOMALENI_SITI, TRIDY, VYCHOZI_TRIDA,
  ZIVOTY_PO_OZIVENI, NEZRANITELNY_PO_OZIVENI, ODHOZENI_PRI_OZIVENI,
  ZBRANE, RARITY, PORADI_RARIT, ZAKLAD_UROVNI, SILA_ZA_PREBYTEK, LECENI_ODPOCINKU, CAS_PLNYCH_RARIT, sanceRarit, nabidka, karta,
  RUST_UROVNI, STROPY, STUPNE_UROVNI, bonusZaUroven, statyZbrane, stupenUrovne, hodnotaPasivy, popisUrovni,
  OD_DUCHU, VIDITELNY_DUCH, SKRYTY_DUCH, OD_HOUBAKU, TRVANI_OBLAKU, NAFUKOVANI_OBLAKU, JED_OBLAKU,
  OD_VLKU, SMECKA_OD, SMECKA_DO, RYCHLOST_NEPRATEL, MAX_DUCHU, pridejNepritele, PASIVY, seznamVybavy, TRVANI_ZARU,
  MAX_BEDEN, KORIST_BEDEN, losujKorist, xpZBedny, JISKRA_NA_BEDNU, TRVANI_VYBUCHU,
  PORADI_BOSSU, BOSSOVE, bossBary, MAX_PAVOUCKU, VYRAZENI_PAVOUCKU, RYCHLOST_VYRAZENI,
  SCHOPNOSTI, schopnostiBosse, ZURIVOST, ZRYCHLENI_ZURIVOSTI, PRVNI_SCHOPNOST, TRES_DUPNUTI, TRVANI_DOPADU,
  TRVANI_ODHOZENI_HRDINY,
  RUST_TRNU, VADNUTI_TRNU, DOZNIVANI_TRNU, MAX_TRNU, TRVANI_ODHOZENI, ZRYCHLENI_ODRAZU, poziceZrcadla,
  HROZBA, ELITA, silaHrozby, textHrozby, POLOMER_OBLAKU,
  zasah, kratkeCislo, TRVANI_CISLA, SLUCOVANI_CISEL, MAX_CISEL, NAD_PRAHEM,
} from '../src/hra.js';
import {
  VYLEPSENI, DUSE_ZA, dusZaHru, cenaVylepseni, kupVylepseni, vratDuse, utraceno,
} from '../src/duse.js';
import {
  nactiRekord, zapisVysledek, nactiTridu, ulozTridu, nactiDuse, ulozDuse, pripisDuse, nactiNastaveni, ulozNastaveni,
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
const chybyHrozby = [];
let ohlaseniHrozby = 0;
let prvniElita = null;
// Kolik nepřátel z vln (duch, vlci ze smečky a pavoučci od Matky elitou být nemůžou) a kolik z nich elit:
// před elitaOd, mezi elitaOd a castejiOd, po castejiOd.
const elityPodleCasu = { pred: [0, 0], stred: [0, 0], pozde: [0, 0] };
const muzeBytElitou = (n) => !n.boss && !['duch', 'vlk', 'pavoucek'].includes(n.druh);
let maxPavoucku = 0;
let maxTrsu = 0;
const videnaCisla = new Set();
let maxCisel = 0;
let cervenychCisel = 0;
const chybyCisel = [];
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
    if (p.uroven !== ma || !(p.uroven >= 1) || !Number.isInteger(p.uroven)) chybyVybavy.push(`${kdy}: ${p.id} v přehledu na ${p.uroven}, hrdina má ${ma}`);
    if (p.stupen !== STUPNE_UROVNI.filter((od) => p.uroven >= od).length) chybyVybavy.push(`${kdy}: ${p.id} na ${p.uroven} má stupeň ${p.stupen}`);
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
    if (v.druh === 'leceni') chybyRarit.push('nabídka došla, nabídla Odpočinek');
    if (v.druh !== 'leceni' && (v.uroven - v.od !== v.kroku || v.kroku !== RARITY[v.rarita]?.urovni)) {
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
  // Schopnosti bossů jsou vidět dopředu: stín dopadu kamene, rudý kruh dupnutí a čára výpadu.
  for (const k of hra.kameny) utec(k, k.polomer + 16, 4);
  for (const n of hra.nepratele) {
    const sch = n.schopnost;
    if (!n.boss || !sch) continue;
    if (sch.id === 'dupnuti' && sch.faze === 'varovani') utec(n, sch.s.polomer + 30, 5);
    if (sch.id === 'vypad') {
      // Z čáry výpadu uhne kolmo na tu stranu, kde už je (za bossem je v bezpečí).
      const vx = hrdina.x - n.x;
      const vy = hrdina.y - n.y;
      const bok = vx * -sch.uy + vy * sch.ux;
      const pas = n.polomer + 50;
      if (vx * sch.ux + vy * sch.uy < -n.polomer || Math.abs(bok) > pas) continue;
      const strana = bok >= 0 ? 1 : -1;
      dx += -sch.uy * strana * (pas - Math.abs(bok)) * 8;
      dy += sch.ux * strana * (pas - Math.abs(bok)) * 8;
    }
  }
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

// Na úrovni bere nejdřív novou nebo vylepšenou zbraň pod 5. úrovní, pak pasivu pod pátou, pak zbraň, pak cokoli
// (do 5. úrovně stejně jako dřív, než měly úrovně strop).
function zvol(volby) {
  const pod = (v) => v.od < ZAKLAD_UROVNI;
  return volby.find((v) => v.druh === 'zbran' && pod(v)) ?? volby.find((v) => v.druh === 'pasiva' && pod(v))
    ?? volby.find((v) => v.druh === 'zbran') ?? volby[0];
}

for (let t = 0; t < delka && !hra.konec; t += DT) {
  const hpPred = hra.hrdina.hp;
  const sitPred = hra.hrdina.sit;
  const odhozenPred = hra.hrdina.odhozen;
  const { x: xPred, y: yPred } = hra.hrdina;
  const schovani = hra.nepratele.filter((n) => n.skryty).map((n) => [n, n.hp]);
  const hrozbaPred = hra.hrozba;
  aktualizuj(hra, DT, rozhodni(hra, t), SIRKA, VYSKA);
  // Hrozba = 1 + celé minuty, každé zvýšení s ohlášením.
  if (hra.hrozba !== 1 + Math.floor(hra.cas / 60)) chybyHrozby.push(`hrozba ${hra.hrozba} v čase ${hra.cas.toFixed(1)} s`);
  if (hra.hrozba > hrozbaPred) {
    ohlaseniHrozby += 1;
    if (hra.hrozba !== hrozbaPred + 1 || hra.hlaseniHrozby?.uroven !== hra.hrozba || !hra.hlaseniHrozby.text.startsWith(`Hrozba ${hra.hrozba}`)) {
      chybyHrozby.push(`hrozba ${hrozbaPred} → ${hra.hrozba} bez ohlášení (${hra.hlaseniHrozby?.text})`);
    }
  }
  // Schovaného ducha (před krokem i po něm) nesmí nic zasáhnout.
  for (const [n, hp] of schovani) {
    if (!n.skryty) continue;
    duchuSchovanych += 1;
    if (n.hp !== hp || !hra.nepratele.includes(n)) chybyNepratel.push(`schovaný duch dostal zásah v čase ${t.toFixed(1)} s`);
  }
  // Duchové od Bludičky mají svůj limit (vyvolání), sem se nepočítají.
  maxDuchu = Math.max(maxDuchu, hra.nepratele.filter((n) => n.duch && !n.pan).length);
  const noviVlci = [];
  for (const n of hra.nepratele) {
    if (videni.has(n)) continue;
    videni.add(n);
    if (n.druh in prvni && prvni[n.druh] === null) prvni[n.druh] = hra.cas;
    if (n.elita && prvniElita === null) prvniElita = hra.cas;
    if (n.elita && !muzeBytElitou(n)) chybyHrozby.push(`elitou se stal ${n.druh}`);
    if (muzeBytElitou(n)) {
      const min = hra.cas / 60;
      const kos = elityPodleCasu[min < HROZBA.elitaOd ? 'pred' : min < HROZBA.castejiOd ? 'stred' : 'pozde'];
      kos[0] += 1;
      if (n.elita) kos[1] += 1;
    }
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
  maxTrsu = Math.max(maxTrsu, hra.trny.length);
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
  maxCisel = Math.max(maxCisel, hra.cisla.length);
  for (const c of hra.cisla) {
    if (videnaCisla.has(c)) continue;
    videnaCisla.add(c);
    if (!(c.hodnota > 0) || c.text !== (c.barva === 'zraneni' || c.barva === 'jed' ? `-${c.hodnota}` : c.barva === 'leceni' || c.barva === 'zlato' ? `+${c.hodnota}` : kratkeCislo(c.hodnota))) {
      chybyCisel.push(`číslo ${c.text} (${c.hodnota}, ${c.barva}) v čase ${t.toFixed(1)} s`);
    }
  }
  if (hra.hrdina.hp < hpPred) {
    zasahu += 1;
    if (hra.cisla.some((c) => (c.barva === 'zraneni' || c.barva === 'jed') && c.od === hra.cas && c.hodnota === hpPred - hra.hrdina.hp)) cervenychCisel += 1;
    if (hra.tres === TRVANI_TRESU) tresu += 1;
    if (hra.hrdina.sit === TRVANI_SITE && !hra.konec) siti += 1;
  }
  const pavouci = hra.nepratele.filter((n) => n.druh === 'pavouk').length;
  if (pavouci && prvniPavouk === null) prvniPavouk = hra.cas;
  maxPavouku = Math.max(maxPavouku, pavouci);
  // Odhozený hrdina letí, i když je v síti (rána ho posune, ne nohy).
  if (sitPred > 0) {
    krokuVSiti += 1;
    const ujito = Math.hypot(hra.hrdina.x - xPred, hra.hrdina.y - yPred);
    if (!(odhozenPred > 0) && ujito > hra.hrdina.rychlost * ZPOMALENI_SITI * DT + 1e-6) {
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
  && sB.lucerna.tik < sO.lucerna.tik && sB.krumpace.rychlost > sO.krumpace.rychlost
  && sB.trny.nabiti < sO.trny.nabiti && sB.zrcadlo.rychlost > sO.zrcadlo.rychlost)) {
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
// Přes 5. úroveň: legendární karta Jiskry ze 4. dá 5. úroveň z popisu a dvě další po +8 % poškození, bez přebytku.
k.zbrane.jiskra.uroven = ZAKLAD_UROVNI - 1;
const pres = karta(k, 'zbran', 'jiskra', 'legendarni');
if (pres.kroku !== 3 || pres.uroven !== ZAKLAD_UROVNI + 2 || !blizko(pres.bonus.sila, RARITY.legendarni.sila)
  || pres.popis.join('|') !== `${ZBRANE.jiskra.popis[ZAKLAD_UROVNI - 1]}|+16 % poškození`) chybyRarit.push(`legendární karta přes 5. úroveň: ${pres.uroven}, ${pres.popis}`);
vyber(k, pres);
if (k.zbrane.jiskra.uroven !== ZAKLAD_UROVNI + 2) chybyRarit.push(`jiskra po legendární kartě na ${k.zbrane.jiskra.uroven}`);
// Z 7. na 8. přijde k poškození i první kus navíc.
const osma = karta(k, 'zbran', 'jiskra', 'bezna');
if (osma.uroven !== 8 || osma.popis.join('|') !== '+8 % poškození|+1 jiskra') chybyRarit.push(`karta Jiskry na 8. úroveň: ${osma.popis}`);
const silaPred = k.hrdina.sila;
const rychlostPred = k.hrdina.rychlost;
vyber(k, karta(k, 'pasiva', 'boty', 'vzacna'));
if (k.pasivy.boty !== 2 || !blizko(k.hrdina.rychlost, rychlostPred * 1.12 ** 2) || k.hrdina.sila !== silaPred) chybyRarit.push('vzácné boty nedaly 2 úrovně');
const maxHpPred = k.hrdina.maxHp;
vyber(k, karta(k, 'pasiva', 'srdce', 'epicka'));
if (k.pasivy.srdce !== 2 || k.hrdina.maxHp !== maxHpPred + 40 || !blizko(k.hrdina.sila, silaPred * (1 + RARITY.epicka.sila))) chybyRarit.push('epické srdce nesedí');
k.pasivy.magnet = ZAKLAD_UROVNI;
const magnetDal = karta(k, 'pasiva', 'magnet', 'vzacna');
if (magnetDal.kroku !== 2 || magnetDal.uroven !== ZAKLAD_UROVNI + 2 || magnetDal.popis.join() !== `2× ${PASIVY.magnet.popisDal}`) chybyRarit.push(`pasiva na 5. úrovni dál: ${magnetDal.popis}`);
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
// Noví nepřátelé zblízka. Hrdina stojí v (0, 0), nepřátelé z okraje jsou daleko a nevadí.
const hraj = (h, sekund, kazdyKrok = () => {}) => {
  for (let t = 0; t < sekund - 1e-9; t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    kazdyKrok(h);
  }
};
const vsechnyZbrane = () => Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: ZAKLAD_UROVNI, nabiti: 0 }]));
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
const kdeBedna = {
  jiskra: [150, 0], lucerna: [dosahLucerny1 - 10, 0], krumpace: [64, 0], blesk: [200, 0], trny: [150, 0], zrcadlo: [34, 0],
};
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
// Boss zblízka, který hned v příštím snímku začne danou schopnost (pořadí se nastaví na ni).
const sSchopnosti = (druh, id, x, y) => {
  const [h, b] = bossZblizka(druh, x, y);
  b.dalsiSchopnost = schopnostiBosse(druh).findIndex((s) => s.id === id);
  b.doSchopnosti = DT / 2;
  return [h, b, schopnostiBosse(druh)[b.dalsiSchopnost]];
};
// Hraje, dokud boss nezačne (a pak neskončí) schopnost. Vrací, kolik s to trvalo.
const dokudVaruje = (h, b, kazdyKrok = () => {}) => {
  let t = 0;
  for (; t < 5 && !(b.schopnost?.faze === 'provadi') && (b.schopnost || t < DT * 2); t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (b.schopnost?.faze === 'varovani') kazdyKrok(h);
  }
  return t;
};
const schopnostiPokusy = {};
// Data: každý boss má 2–3 známé schopnosti, každá s varováním kolem 0,8 s. Všechny čtyři hlavní schopnosti
// (dupnutí, hod, výpad, vyvolání) má aspoň jeden boss, hozené věci mají sprite a pomocníci jsou známí nepřátelé.
for (const id of PORADI_BOSSU) {
  const seznam = schopnostiBosse(id);
  if (seznam.length < 2 || seznam.length > 3) chybyBossu.push(`${id} má ${seznam.length} schopností`);
  if (!(BOSSOVE[id].pauza > 0)) chybyBossu.push(`${id} nemá pauzu mezi schopnostmi`);
  for (const s of seznam) {
    if (!Object.hasOwn(SCHOPNOSTI, s.id)) chybyBossu.push(`${id} má neznámou schopnost ${s.id}`);
    if (!(s.varovani >= 0.7 && s.varovani <= 1)) chybyBossu.push(`${id}: ${s.id} varuje ${s.varovani} s`);
    if (s.id === 'hod' && !jmenaSpritu.has(s.strela)) chybyBossu.push(`${id} hází ${s.strela} bez spritu`);
    if (s.id === 'vyvolani' && (!Object.hasOwn(RYCHLOST_NEPRATEL, s.druh) || s.max < s.pocet[1])) chybyBossu.push(`${id} vyvolá ${s.druh}`);
  }
}
for (const id of ['dupnuti', 'hod', 'vypad', 'vyvolani']) {
  if (!PORADI_BOSSU.some((b) => schopnostiBosse(b).some((s) => s.id === id))) chybyBossu.push(`schopnost ${id} nemá žádný boss`);
}
// Dupnutí (Strážce i Obr): při varování boss stojí a nic se neděje, pak vlna. Kdo je v kruhu, dostane ránu jednou,
// odletí o odhození a obrazovka se otřese víc než po obyčejném zásahu. Kousek za kruhem vlna netrefí.
for (const druh of ['strazce', 'obr']) {
  for (const uvnitr of [true, false]) {
    const s0 = schopnostiBosse(druh).find((s) => s.id === 'dupnuti');
    const [h, b, s] = sSchopnosti(druh, 'dupnuti', uvnitr ? 100 : s0.polomer + 40, 0);
    const kde = { x: b.x, y: b.y };
    let vlnaPriVarovani = false;
    const varovani = dokudVaruje(h, b, () => { if (h.vlny.length || h.hrdina.hp < h.hrdina.maxHp) vlnaPriVarovani = true; });
    if (vlnaPriVarovani || b.x !== kde.x || b.y !== kde.y) chybyBossu.push(`${druh}: dupnutí při varování`);
    if (Math.abs(varovani - s.varovani) > 2 * DT) chybyBossu.push(`${druh}: dupnutí varovalo ${varovani.toFixed(2)} s`);
    if (h.vlny.length !== 1 || !(h.tres > TRVANI_TRESU)) chybyBossu.push(`${druh}: po dupnutí ${h.vlny.length} vln, třes ${h.tres}`);
    hraj(h, 1.2);
    const odstup = Math.hypot(h.hrdina.x - b.x, h.hrdina.y - b.y);
    if (uvnitr) {
      if (h.zasahyBossu.dupnuti !== 1 || h.hrdina.hp !== h.hrdina.maxHp - s.poskozeni) chybyBossu.push(`${druh}: dupnutí v kruhu ${h.hrdina.hp} životů`);
      if (Math.abs(odstup - (100 + s.odhozeni)) > 1) chybyBossu.push(`${druh}: dupnutí odhodilo na ${odstup.toFixed(1)} px`);
      schopnostiPokusy[`${druh}_dupnuti`] = { varovani_s: +varovani.toFixed(2), rana: s.poskozeni, odhozen_na_px: Math.round(odstup) };
    } else if (h.hrdina.hp !== h.hrdina.maxHp) chybyBossu.push(`${druh}: dupnutí trefilo hrdinu za kruhem`);
  }
}
// Hod (Obr kameny, Matka kokony): po varování 3–5 kusů kolem hrdiny, stín je vidět celý let. Stojícího trefí jen
// jednou (po zásahu chvíle bez zranění), po dopadu vybuchnou. Kokon zalepí sítí. Kdo po hodu uteče, toho minou.
for (const druh of ['obr', 'matka']) {
  for (const utece of [false, true]) {
    const [h, b, s] = sSchopnosti(druh, 'hod', 300, 0);
    dokudVaruje(h, b);
    const kameny = [...h.kameny];
    const daleko = Math.max(...kameny.map((k) => Math.hypot(k.x - h.hrdina.x, k.y - h.hrdina.y)));
    if (kameny.length < s.pocet[0] || kameny.length > s.pocet[1] || daleko > s.rozptyl + 1) chybyBossu.push(`${druh}: hod ${kameny.length} kusů až ${daleko.toFixed(0)} px od hrdiny`);
    if (kameny.some((k) => k.druh !== s.strela || k.trvani !== s.let)) chybyBossu.push(`${druh}: hod hází něco jiného`);
    let dopadu = 0;
    const videne = new WeakSet();
    for (let t = 0; t < s.let + 0.6; t += DT) {
      aktualizuj(h, DT, utece ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }, SIRKA, VYSKA);
      for (const d of h.dopady) if (!videne.has(d)) { videne.add(d); dopadu += 1; }
      if (h.hrdina.sit === TRVANI_SITE && !s.sit) chybyBossu.push(`${druh}: kámen zalepil sítí`);
    }
    if (dopadu !== kameny.length || h.kameny.length) chybyBossu.push(`${druh}: dopadlo ${dopadu} z ${kameny.length}`);
    const zasahu = h.zasahyBossu.hod;
    if (zasahu !== (utece ? 0 : 1)) chybyBossu.push(`${druh}: hod do hrdiny, který ${utece ? 'uteče' : 'stojí'}: ${zasahu} zásahů`);
    if (!utece && (h.hrdina.hp !== h.hrdina.maxHp - s.poskozeni || (s.sit && !(h.hrdina.sit > 0)))) chybyBossu.push(`${druh}: hod vzal ${h.hrdina.maxHp - h.hrdina.hp}`);
    if (!utece) schopnostiPokusy[`${druh}_hod`] = { kusu: kameny.length, rana: s.poskozeni, sit: s.sit };
  }
}
// Kámen míří tam, kam hrdina běží (stojícímu pod nohy).
{
  const [h, b] = sSchopnosti('obr', 'hod', 300, 0);
  for (let t = 0; t < 2 && !h.kameny.length; t += DT) aktualizuj(h, DT, { dx: 0, dy: 1 }, SIRKA, VYSKA);
  if (!(h.kameny[0]?.y > h.hrdina.y + 30)) chybyBossu.push('hod nemíří tam, kam hrdina běží');
  if (b.schopnost) chybyBossu.push('hod po vyhození neskončil');
}
// Výpad (Strážce, Matka): při varování boss stojí a míří na hrdinu, posledních zamek s už ne. Pak proběhne rovně
// celou délku a stojícího trefí jednou a odhodí stranou. Kdo po zamčení uhne kolmo, toho mine.
for (const druh of ['strazce', 'matka']) {
  for (const uhne of [false, true]) {
    const [h, b, s] = sSchopnosti(druh, 'vypad', 300, 0);
    const kde = { x: b.x, y: b.y };
    let t = 0;
    let smerPredZamcenim = null;
    for (; t < 3 && b.schopnost?.faze !== 'provadi'; t += DT) {
      const zamceno = b.schopnost && b.schopnost.zbyva <= s.zamek;
      // Před zamčením hrdina kousek ustoupí nahoru (míření ho musí sledovat), po zamčení stojí nebo uhýbá dolů.
      aktualizuj(h, DT, zamceno ? (uhne ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }) : { dx: 0, dy: b.schopnost ? -1 : 0 }, SIRKA, VYSKA);
      if (b.schopnost && b.schopnost.zbyva > s.zamek) smerPredZamcenim = { ux: b.schopnost.ux, uy: b.schopnost.uy };
      if (b.schopnost?.faze === 'varovani' && (b.x !== kde.x || b.y !== kde.y || h.hrdina.hp < h.hrdina.maxHp)) chybyBossu.push(`${druh}: výpad při varování`);
    }
    const sch = b.schopnost;
    if (!sch || !smerPredZamcenim) {
      chybyBossu.push(`${druh}: výpad nezačal`);
      continue;
    }
    if (!(smerPredZamcenim.uy < 0)) chybyBossu.push(`${druh}: výpad nesleduje hrdinu`);
    const dalsi = { ux: sch.ux, uy: sch.uy };
    for (let k = 0; k < 3 && b.schopnost; k++) aktualizuj(h, DT, uhne ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }, SIRKA, VYSKA);
    for (let k = 0; k < 2 / DT && b.schopnost; k++) aktualizuj(h, DT, uhne ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }, SIRKA, VYSKA);
    const ujel = Math.hypot(b.x - kde.x, b.y - kde.y);
    if (Math.abs(ujel - s.delka) > 1 || b.schopnost) chybyBossu.push(`${druh}: výpad ujel ${ujel.toFixed(0)} px`);
    if (Math.abs(dalsi.ux - smerPredZamcenim.ux) > 0.2) chybyBossu.push(`${druh}: výpad divně zamířil`);
    if (h.zasahyBossu.vypad !== (uhne ? 0 : 1)) chybyBossu.push(`${druh}: výpad do hrdiny, který ${uhne ? 'uhne' : 'stojí'}: ${h.zasahyBossu.vypad}`);
    if (!uhne) {
      if (h.hrdina.hp !== h.hrdina.maxHp - s.poskozeni) chybyBossu.push(`${druh}: výpad vzal ${h.hrdina.maxHp - h.hrdina.hp}`);
      schopnostiPokusy[`${druh}_vypad`] = { rana: s.poskozeni, ujel_px: Math.round(ujel), odhozen_stranou_px: Math.round(Math.abs(h.hrdina.y)) };
    }
  }
}
// Vyvolání (Strážce kostlivci, Matka pavoučci, Bludička duchové): při varování kruhy, ale nikdo nový. Po něm
// tolik pomocníků, kolik bylo kruhů (6–8), na jejich místech. Nikdy jich nežije víc než max a s plnou loukou boss
// vezme jinou schopnost.
for (const druh of ['strazce', 'matka', 'bludicka']) {
  const [h, b, s] = sSchopnosti(druh, 'vyvolani', 150, 0);
  h.hrdina.nezranitelny = Infinity;
  const pomocnici = () => h.nepratele.filter((n) => n.pan === b);
  let behem = false;
  let mista = [];
  dokudVaruje(h, b, () => {
    if (pomocnici().length) behem = true;
    mista = b.schopnost.mista;
  });
  if (behem) chybyBossu.push(`${druh}: pomocníci před koncem varování`);
  if (mista.length < s.pocet[0] || mista.length > s.pocet[1]) chybyBossu.push(`${druh}: ${mista.length} kruhů vyvolání`);
  const prvni = pomocnici();
  if (prvni.length !== mista.length || prvni.some((n) => n.druh !== s.druh) || !mista.every((m) => prvni.some((n) => Math.hypot(n.x - m.x, n.y - m.y) < 30))) {
    chybyBossu.push(`${druh}: vyvolal ${prvni.length} (${prvni.map((n) => n.druh)})`);
  }
  if (s.vyrazi && !prvni.every((n) => n.vyrazi > 0)) chybyBossu.push(`${druh}: pomocníci nevyrazili`);
  let nejvic = 0;
  const pred = { ...h.schopnostiPouzito };
  hraj(h, 60, () => { nejvic = Math.max(nejvic, h.nepratele.filter((n) => n.pan && n.druh === s.druh).length); });
  if (nejvic > s.max) chybyBossu.push(`${druh}: pomocníků naráz ${nejvic} (max ${s.max})`);
  const jine = schopnostiBosse(druh).filter((x) => x.id !== 'vyvolani').every((x) => h.schopnostiPouzito[x.id] > (pred[x.id] ?? 0));
  if (!jine) chybyBossu.push(`${druh}: s plnou loukou nepoužil jiné schopnosti`);
  schopnostiPokusy[`${druh}_vyvolani`] = { druh: s.druh, poprve: prvni.length, nejvic_naraz: nejvic };
}
// Matka: pavoučci po vylezení vyrazí rychleji a za chvíli zpomalí.
{
  const [h, b] = sSchopnosti('matka', 'vyvolani', 150, 0);
  h.hrdina.nezranitelny = Infinity;
  for (let t = 0; t < 3 && !h.nepratele.some((n) => n.pan === b); t += DT) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  hraj(h, VYRAZENI_PAVOUCKU + DT);
  if (h.nepratele.some((n) => n.pan === b && n.vyrazi > 0) || !(RYCHLOST_VYRAZENI > 1)) chybyBossu.push('pavoučci nepřestali vyrážet');
}
// Bludička: Vějíř ji přenese k hrdinovi, chvíli se nabíjí (stojí), vystřelí vějíř a za chvíli druhý, prostřední
// střela stojícího trefí.
{
  const [h, b, s] = sSchopnosti('bludicka', 'vejir', 500, 0);
  b.rychlost = 40;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const d = Math.hypot(b.x - h.hrdina.x, b.y - h.hrdina.y);
  if (!(d >= 120 && d <= 221) || b.schopnost?.faze !== 'varovani') chybyBossu.push(`Bludička se přenesla na ${d.toFixed(0)} px`);
  const kde = { x: b.x, y: b.y };
  hraj(h, s.varovani - 3 * DT);
  if (b.x !== kde.x || b.y !== kde.y || h.strelyBossu.length) chybyBossu.push('Bludička se při nabíjení hýbe nebo střílí');
  hraj(h, 3 * DT);
  if (h.strelyBossu.length !== s.strel) chybyBossu.push(`Bludička vystřelila ${h.strelyBossu.length} střel`);
  hraj(h, s.mezi);
  if (h.strelyBossu.length !== s.strel * s.salv || b.schopnost) chybyBossu.push(`Bludička po salvách: ${h.strelyBossu.length} střel`);
  hraj(h, 1.6);
  if (h.zasahyBossu.vejir < 1 || (h.hrdina.maxHp - h.hrdina.hp) % s.poskozeni !== 0) chybyBossu.push(`střely Bludičky: ${h.zasahyBossu.vejir} zásahů, ${h.hrdina.hp} životů`);
}
// Střídání: první schopnost chvíli po příchodu, pak dokola v pořadí. Pod polovinou životů boss zuří (jednou
// ohlásí) a mezi schopnostmi čeká kratší pauzu, takže jich stihne víc.
for (const druh of PORADI_BOSSU) {
  const pokus = (podil) => {
    const [h, b] = bossZblizka(druh, 120, 0);
    h.hrdina.nezranitelny = Infinity;
    b.hp = Math.round(b.maxHp * podil);
    const zacatky = [];
    const pauzy = [];
    let byla = null;
    let zuri = 0;
    hraj(h, 40, () => {
      if (b.schopnost && b.schopnost !== byla) zacatky.push({ id: b.schopnost.id, s: h.cas });
      if (byla && !b.schopnost) pauzy.push(b.doSchopnosti);
      byla = b.schopnost;
      if (h.oznameni?.text?.endsWith('zuří')) zuri += 1;
      // Pomocníci by louku zaplnili a vyvolání by se přeskakovalo, tak hned zmizí. Hrdina i boss (mimo schopnost)
      // zůstávají na svých místech, ať je každá schopnost v dosahu.
      h.nepratele = h.nepratele.filter((n) => !n.pan);
      Object.assign(h.hrdina, { x: 0, y: 0, odhozen: 0 });
      if (!b.schopnost) Object.assign(b, { x: 120, y: 0 });
    });
    return { zacatky, pauzy, zuri, b };
  };
  const plny = pokus(1);
  const zrany = pokus(ZURIVOST - 0.1);
  const seznam = schopnostiBosse(druh).map((s) => s.id);
  const poradi = plny.zacatky.slice(0, seznam.length * 2).map((z) => z.id);
  if (Math.abs((plny.zacatky[0]?.s ?? 0) - PRVNI_SCHOPNOST) > 2 * DT) chybyBossu.push(`${druh}: první schopnost v ${plny.zacatky[0]?.s}`);
  if (poradi.join() !== [...seznam, ...seznam].slice(0, poradi.length).join() || poradi.length < seznam.length * 2) chybyBossu.push(`${druh} střídá ${poradi}`);
  if (plny.pauzy.some((p) => Math.abs(p - BOSSOVE[druh].pauza) > 1e-9) || plny.b.zuri || plny.zuri) chybyBossu.push(`${druh}: pauzy s plnými životy ${plny.pauzy}`);
  if (zrany.pauzy.some((p) => Math.abs(p - BOSSOVE[druh].pauza * ZRYCHLENI_ZURIVOSTI) > 1e-9) || !zrany.b.zuri) chybyBossu.push(`${druh}: zuřící pauzy ${zrany.pauzy}`);
  if (!(zrany.zacatky.length > plny.zacatky.length)) chybyBossu.push(`${druh}: zuřící ${zrany.zacatky.length} schopností, klidný ${plny.zacatky.length}`);
  schopnostiPokusy[`${druh}_za_40_s`] = { klidny: plny.zacatky.length, zurici: zrany.zacatky.length };
}
// Boss umí ublížit: hrdina bez zbraní stojí 150 px od bosse, který nechodí, a schopnosti ho za 30 s trefí.
for (const druh of PORADI_BOSSU) {
  const [h] = bossZblizka(druh, 150, 0);
  hraj(h, 30);
  const zasahu = Object.values(h.zasahyBossu).reduce((a, c) => a + c, 0);
  if (!(zasahu > 0) || !(h.hrdina.hp < h.hrdina.maxHp)) chybyBossu.push(`${druh} stojícího hrdinu za 30 s netrefil`);
  schopnostiPokusy[`${druh}_stojici_30_s`] = { zasahu, ztraceno: Math.round(h.hrdina.maxHp - Math.max(0, h.hrdina.hp)), padl: h.konec };
}
// Zuřivost se ohlásí jednou, až životy klesnou pod polovinu.
{
  const [h, b] = bossZblizka('obr', 400, 0);
  h.hrdina.nezranitelny = Infinity;
  hraj(h, 1);
  if (b.zuri) chybyBossu.push('obr zuří s plnými životy');
  b.hp = Math.floor(b.maxHp * ZURIVOST) - 1;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (!b.zuri || h.oznameni?.text !== `${BOSSOVE.obr.nazev} zuří`) chybyBossu.push(`zuřivost bez ohlášení (${h.oznameni?.text})`);
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
// Sám na sám s uhýbáním: musí ho porazit do 90 s a přežít (boss je porazitelný). Sám na sám bez uhýbání: schopnosti
// ho trefí víckrát než uhýbajícího. Uprostřed vln, 60 s s uhýbáním
// a bez něj: kolikrát ho schopnosti trefí a kolik životů hrdina ztratí (na vyvážení). Ve vlnách i sám na sám musí
// schopnosti všech bossů dohromady trefit neuhýbajícího víckrát než uhýbajícího.
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
  let zurilOd = null;
  for (let t = 0; t < sekund && (vlny || h.nepratele.includes(b)) && !h.konec; t += DT) {
    aktualizuj(h, DT, rozhodni(h, t, uhyba), SIRKA, VYSKA);
    if (h.volby) vyber(h, zvol(h.volby));
    if (b.zuri && zurilOd === null) zurilOd = Math.round(h.cas - 180);
  }
  const zasahy = Object.fromEntries(Object.entries(h.zasahyBossu).filter(([, v]) => v));
  return {
    porazen: !h.nepratele.includes(b), konec: h.konec, zbyva: b.hp, za_s: Math.round(h.cas - 180), zuril_od_s: zurilOd,
    ztraceno: Math.round(h.hrdina.maxHp - Math.max(0, h.hrdina.hp)), utokem: Object.values(h.zasahyBossu).reduce((a, c) => a + c, 0),
    zasahy, pouzil: { ...h.schopnostiPouzito },
  };
};
const soucet = { samUhyba: 0, samNeuhyba: 0, vlnyUhyba: 0, vlnyNeuhyba: 0 };
for (const druh of PORADI_BOSSU) {
  const sam = souboj(druh);
  const samNe = souboj(druh, { uhyba: false });
  const uhyba = souboj(druh, { vlny: true, sekund: 60 });
  const neuhyba = souboj(druh, { vlny: true, sekund: 60, uhyba: false });
  soucet.samUhyba += sam.utokem;
  soucet.samNeuhyba += samNe.utokem;
  soucet.vlnyUhyba += uhyba.utokem;
  soucet.vlnyNeuhyba += neuhyba.utokem;
  const shrn = (v) => ({ porazen: v.porazen, za_s: v.za_s, padl: v.konec, ztraceno_zivotu: v.ztraceno, zasahu_schopnostmi: v.utokem, zasahy: v.zasahy });
  souboje[druh] = {
    sam_porazen_za_s: sam.porazen ? sam.za_s : null,
    sam_uhyba: { ...shrn(sam), zuril_od_s: sam.zuril_od_s, pouzil: sam.pouzil },
    sam_neuhyba: shrn(samNe),
    ve_vlnach_60_s: { uhyba: shrn(uhyba), neuhyba: shrn(neuhyba) },
  };
  if (!sam.porazen || sam.konec) chybyBossu.push(`${druh} se sám na sám nedal porazit za 90 s (${sam.konec ? 'hrdina padl' : `zbývá ${sam.zbyva}`})`);
}
if (!(soucet.samNeuhyba > soucet.samUhyba)) chybyBossu.push(`sám na sám schopnosti trefí neuhýbajícího ${soucet.samNeuhyba}×, uhýbajícího ${soucet.samUhyba}×`);
if (!(soucet.vlnyNeuhyba > soucet.vlnyUhyba)) chybyBossu.push(`ve vlnách schopnosti trefí neuhýbajícího ${soucet.vlnyNeuhyba}×, uhýbajícího ${soucet.vlnyUhyba}×`);

// Trnová past a Zrcadlový štít zblízka. Hrdina stojí sám (bez vln, beden a bossů).
const chybyZbrani = [];
for (const [id, z] of Object.entries(ZBRANE)) {
  if (z.popis.length !== ZAKLAD_UROVNI || !z.popis.every((r) => typeof r === 'string' && r)) chybyZbrani.push(`${id} nemá ${ZAKLAD_UROVNI} řádků popisu`);
  if (!jmenaSpritu.has(z.ikona)) chybyZbrani.push(`${id} nemá sprite ikony ${z.ikona}`);
}
const samotny = (zbrane) => {
  const h = tichaHra(zbrane);
  h.dalsiBoss = Infinity;
  h.dalsiSmecka = Infinity;
  h.dalsiPrichod = Infinity;
  return h;
};
const krok = (h) => {
  const x = h.nepratele.map((n) => [n, n.x, n.y]);
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  return new Map(x.map(([n, x0, y0]) => [n, Math.hypot(n.x - x0, n.y - y0)]));
};
const trnovePokusy = {};
// Kostlivec jde k hrdinovi: trs vyraší pod ním, roste (nezraní), pak zraňuje a zpomalí, mimo trs zpomalení dozní.
{
  const h = samotny({ trny: { uroven: 1, nabiti: 0 } });
  const st = staty(h).trny;
  const kost = pridejNepritele(h, 'kostlivec', 150, 0);
  krok(h);
  const trs = h.trny[0];
  if (h.trny.length !== 1 || trs.x !== kost.x || trs.y !== kost.y) chybyZbrani.push(`trs nevyrašil pod nepřítelem (${h.trny.length} trsů)`);
  hraj(h, RUST_TRNU - 2 * DT);
  if (kost.hp !== kost.maxHp || kost.trny > 0) chybyZbrani.push('trs zraňuje nebo zpomaluje, i když teprve roste');
  hraj(h, 3 * DT);
  if (!(kost.hp < kost.maxHp) || !(kost.trny > 0)) chybyZbrani.push(`dorostlý trs nezranil nebo nezpomalil (${kost.hp}/${kost.maxHp})`);
  const vTrni = krok(h).get(kost);
  if (Math.abs(vTrni - kost.rychlost * st.zpomaleni * DT) > 1e-6) chybyZbrani.push(`v trní ušel ${vTrni.toFixed(3)} px místo ${(kost.rychlost * st.zpomaleni * DT).toFixed(3)}`);
  let venku = null;
  for (let t = 0; t < 2 && venku === null; t += DT) {
    krok(h);
    if (Math.hypot(kost.x - trs.x, kost.y - trs.y) >= trs.polomer + kost.polomer / 2) venku = h.cas;
  }
  hraj(h, DOZNIVANI_TRNU - 2 * DT);
  if (!(kost.trny > 0)) chybyZbrani.push('zpomalení po vylezení z trní nedoznělo');
  hraj(h, 3 * DT);
  const mimo = krok(h).get(kost);
  if (kost.trny !== 0 || Math.abs(mimo - kost.rychlost * DT) > 1e-6) chybyZbrani.push(`mimo trní kostlivec pořád pomalý (${mimo.toFixed(3)} px)`);
  hraj(h, st.trvani);
  if (h.trny.includes(trs)) chybyZbrani.push('trs nezmizel');
  trnovePokusy.kostlivec = { zraneni: kost.maxHp - kost.hp, vylezl_za_s: venku === null ? null : Math.round(venku * 100) / 100 };
}
// Na 4. úrovni tři trsy pod třemi nejbližšími, ale ne dva na sobě. Nepřítel za dosahem nic nespustí,
// a zbraň zůstane nabitá, dokud někdo nepřijde.
{
  const h = samotny({ trny: { uroven: 4, nabiti: 0 } });
  const st = staty(h).trny;
  const cile = [[100, 0], [110, 0], [0, 120], [-140, 0], [0, -200]].map(([x, y]) => pridejNepritele(h, 'slizak', x, y));
  for (const n of cile) n.rychlost = 0;
  krok(h);
  const mista = h.trny.map((p) => `${p.x},${p.y}`).join(' ');
  if (st.pocet !== 3 || mista !== '100,0 0,120 -140,0') chybyZbrani.push(`3 trsy vyrašily na ${mista}`);
  const daleko = samotny({ trny: { uroven: 1, nabiti: 0 } });
  const dalekyNepritel = pridejNepritele(daleko, 'slizak', staty(daleko).trny.dosah + 50, 0);
  dalekyNepritel.rychlost = 0;
  hraj(daleko, 1);
  if (daleko.trny.length) chybyZbrani.push('trny vyrašily pod nepřítelem za dosahem');
  dalekyNepritel.x = 200;
  krok(daleko);
  if (daleko.trny.length !== 1) chybyZbrani.push('nabité trny nevyrašily, když nepřítel přišel do dosahu');
  // Schovaný duch trsy nespustí ani v nich nic nedostane.
  const tma = samotny({ trny: { uroven: 5, nabiti: 0 } });
  const duch = pridejNepritele(tma, 'duch', 80, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  tma.trny.push({ x: 80, y: 0, polomer: 34, trvani: 3, zivot: 3 - RUST_TRNU, tik: 0, poskozeni: 9, zpomaleni: 0.35 });
  hraj(tma, 1);
  if (duch.hp !== duch.maxHp || duch.trny > 0 || tma.trny.length !== 1) chybyZbrani.push('trny našly schovaného ducha');
}
// Boss v trní zpomalí jen napůl. Po celou dobu trsu se nikam nenahromadí (nejvýš MAX_TRNU).
{
  const h = samotny({ trny: { uroven: 5, nabiti: 0 } });
  const st = staty(h).trny;
  const obr = pridejNepritele(h, 'obr', 200, 0);
  hraj(h, RUST_TRNU + 2 * DT);
  const ujito = krok(h).get(obr);
  const ocekavano = obr.rychlost * (1 - (1 - st.zpomaleni) / 2) * DT;
  if (Math.abs(ujito - ocekavano) > 1e-6) chybyZbrani.push(`boss v trní ušel ${ujito.toFixed(3)} px místo ${ocekavano.toFixed(3)}`);
  if (MAX_TRNU < st.pocet * Math.ceil(st.trvani / st.nabiti)) chybyZbrani.push('limit trsů je menší, než kolik jich může růst naráz');
}
// Zrcadlo: slizák u zrcadla dostane ránu a odletí, boss jen ránu, schovaného ducha zrcadlo nevidí.
const zrcadlovePokusy = {};
{
  const h = samotny({ zrcadlo: { uroven: 1, nabiti: 0 } });
  const z = staty(h).zrcadlo;
  const p0 = poziceZrcadla(h, 0);
  if (Math.abs(p0.x - z.polomer) > 1e-9 || p0.y !== 0) chybyZbrani.push('zrcadlo nezačíná vpravo od hrdiny');
  const sliz = pridejNepritele(h, 'slizak', z.polomer + 4, 0);
  sliz.rychlost = 0;
  krok(h);
  if (!(sliz.hp < sliz.maxHp) || !(sliz.odhozen > 0) || h.odhozeno !== 1) chybyZbrani.push('zrcadlo neodhodilo slizáka');
  hraj(h, TRVANI_ODHOZENI + DT);
  const odstup = Math.hypot(sliz.x, sliz.y);
  if (!(odstup >= z.polomer + 4 + z.odhozeni - 1) || sliz.odhozen !== 0) chybyZbrani.push(`odhozený slizák je ${odstup.toFixed(1)} px od hrdiny`);
  zrcadlovePokusy.odhozeni_px = Math.round(odstup - z.polomer - 4);
  if (h.hrdina.hp !== h.hrdina.maxHp) chybyZbrani.push('slizák u zrcadla zranil hrdinu');

  const b = samotny({ zrcadlo: { uroven: 1, nabiti: 0 } });
  const boss = pridejNepritele(b, 'strazce', z.polomer + 16, 0);
  boss.rychlost = 0;
  const duch = pridejNepritele(b, 'duch', 0, -z.polomer);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(b, 3);
  if (!(boss.hp < boss.maxHp) || boss.x !== z.polomer + 16 || boss.y !== 0) chybyZbrani.push('zrcadlo s bossem pohnulo nebo ho nezranilo');
  if (duch.hp !== duch.maxHp || duch.x !== 0 || duch.y !== -z.polomer) chybyZbrani.push('zrcadlo zasáhlo schovaného ducha');
}
// Střela bosse do zrcadla: vrátí se zpátky rychleji, hrdinu netrefí a zraní slizáka, který stojí za ní.
// Bez zrcadla stejná střela trefí hrdinu.
for (const se of [true, false]) {
  const h = samotny(se ? { zrcadlo: { uroven: 1, nabiti: 0 } } : {});
  const z = staty(h).zrcadlo;
  const cil = pridejNepritele(h, 'slizak', 150, 0);
  cil.rychlost = 0;
  const strela = { x: z.polomer + 6, y: 0, vx: -160, vy: 0, zivot: 3.5 };
  h.strelyBossu.push(strela);
  krok(h);
  if (se && (!strela.odrazena || !(Math.abs(strela.vx - 160 * ZRYCHLENI_ODRAZU) < 1e-9) || h.odrazeno !== 1)) chybyZbrani.push('zrcadlo střelu nevrátilo');
  hraj(h, 1.2);
  if (se && (h.hrdina.hp !== h.hrdina.maxHp || cil.hp !== cil.maxHp - z.odraz)) chybyZbrani.push(`vrácená střela: hrdina ${h.hrdina.hp}, slizák ${cil.hp}/${cil.maxHp}`);
  if (!se && h.zasahyBossu.vejir !== 1) chybyZbrani.push('střela bez zrcadla netrefila hrdinu');
}
// Bludička 20 s střílí na hrdinu, který stojí a nic jiného nemá: se třemi zrcadly (4. úroveň) jí část střel
// vrátí (zraní ji) a hrdinu trefí méně střel než bez nich. Aby se počítala každá střela, která doletí,
// hrdina má po zásahu hned zase nulovou ochranu a životů dost.
{
  const pokus = (zbrane) => {
    const [h, b] = bossZblizka('bludicka', 300, 0);
    h.zbrane = zbrane;
    h.hrdina.hp = 1e6;
    h.hrdina.maxHp = 1e6;
    hraj(h, 20, () => { h.hrdina.nezranitelny = 0; });
    return { zasahu_strelou: h.zasahyBossu.vejir, vraceno: h.odrazeno, bludicka_ztratila: b.maxHp - b.hp };
  };
  const bez = pokus({});
  const se = pokus({ zrcadlo: { uroven: 4, nabiti: 0 } });
  zrcadlovePokusy.bludicka_20_s = { bez_zrcadel: bez, se_zrcadly: se };
  if (!(se.vraceno > 0) || !(se.zasahu_strelou < bez.zasahu_strelou) || !(se.bludicka_ztratila > 0)) {
    chybyZbrani.push(`zrcadla proti Bludičce: vráceno ${se.vraceno}, zásahů ${se.zasahu_strelou} (bez nich ${bez.zasahu_strelou})`);
  }
}

// Úrovně bez stropu. Každá zbraň až do 200. úrovně: do 5. bez bonusu (stejně jako dřív), pak každá úroveň víc
// poškození, každá třetí ještě kus, nabíjení nebo velikost, dokud to jde, a nic přes strop. Řádky karty sedí s tím,
// co úroveň opravdu přidala. Data růstu (poradi, čísla, texty) musí k sobě pasovat.
const chybyUrovni = [];
const rostlyDo = {};
const relBlizko = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
for (const [id, z] of Object.entries(ZBRANE)) {
  const { dal } = z;
  const pet = statyZbrane(id, ZAKLAD_UROVNI);
  const pole = { nabiti: dal.nabiti ?? [], velikost: dal.velikost ?? [] };
  for (const co of dal.poradi) {
    const ma = co === 'pocet' ? Boolean(dal.pocet) : pole[co]?.length > 0;
    if (!ma || !dal.texty?.[co]) chybyUrovni.push(`${id}: ${co} v poradi bez čísel nebo textu`);
  }
  if (!dal.poskozeni?.length) chybyUrovni.push(`${id} nemá poškození, které by rostlo`);
  for (let u = 0; u <= ZAKLAD_UROVNI; u++) {
    const b = bonusZaUroven(id, u);
    if (b.poskozeni !== 1 || b.pocet !== 0 || b.nabiti !== 1 || b.velikost !== 1) chybyUrovni.push(`${id} má bonus už na ${u}. úrovni`);
  }
  let pred = pet;
  let posledni = ZAKLAD_UROVNI;
  const vynechane = [];
  for (let u = ZAKLAD_UROVNI + 1; u <= 200; u++) {
    const st = statyZbrane(id, u);
    if (!Object.values(st).every(Number.isFinite)) chybyUrovni.push(`${id} na ${u}. úrovni: ${JSON.stringify(st)}`);
    for (const p of dal.poskozeni) if (!(st[p] > pred[p])) chybyUrovni.push(`${id} na ${u}. úrovni: ${p} nevzrostlo`);
    for (const p of dal.poskozeni) if (!relBlizko(st[p], pet[p] * (1 + RUST_UROVNI.poskozeni * (u - ZAKLAD_UROVNI)))) chybyUrovni.push(`${id} na ${u}: ${p} ${st[p]}`);
    if (dal.pocet && st[dal.pocet] > (dal.maxPocet ?? STROPY.pocet)) chybyUrovni.push(`${id} na ${u}. úrovni má ${st[dal.pocet]} kusů`);
    for (const p of pole.nabiti) if (st[p] < pet[p] * STROPY.nabiti - 1e-9) chybyUrovni.push(`${id} na ${u}: ${p} pod stropem`);
    for (const p of pole.velikost) if (st[p] > pet[p] * STROPY.velikost + 1e-9) chybyUrovni.push(`${id} na ${u}: ${p} přes strop`);
    const zmena = (dal.pocet && st[dal.pocet] !== pred[dal.pocet]) || [...pole.nabiti, ...pole.velikost].some((p) => st[p] !== pred[p]);
    const treti = (u - ZAKLAD_UROVNI) % RUST_UROVNI.kazda === 0;
    if (zmena && !treti) chybyUrovni.push(`${id} na ${u}. úrovni přidal víc než poškození`);
    if (!zmena && treti) vynechane.push(u);
    if (zmena) posledni = u;
    const popis = popisUrovni('zbran', id, u - 1, u);
    if (popis[0] !== `+${Math.round(RUST_UROVNI.poskozeni * 100)} % poškození` || popis.length !== (zmena ? 2 : 1)) chybyUrovni.push(`${id} na ${u}: karta „${popis}“`);
    pred = st;
  }
  if (vynechane.some((u) => u < posledni)) chybyUrovni.push(`${id} vynechal růst na ${vynechane.filter((u) => u < posledni)}, i když ještě mohl`);
  // Na 200. úrovni je na stropu všechno, co zbraň umí zvětšovat.
  const st = statyZbrane(id, 200);
  if (dal.poradi.includes('pocet') && st[dal.pocet] !== (dal.maxPocet ?? STROPY.pocet)) chybyUrovni.push(`${id} na 200: ${st[dal.pocet]} kusů`);
  for (const co of ['nabiti', 'velikost']) {
    if (!dal.poradi.includes(co)) continue;
    for (const p of pole[co]) if (!relBlizko(st[p], pet[p] * STROPY[co])) chybyUrovni.push(`${id} na 200: ${p} ${st[p]} není na stropu`);
  }
  rostlyDo[id] = posledni;
}
// Stupně rámečku.
for (const [u, stupen] of [[1, 0], [4, 0], [5, 1], [9, 1], [10, 2], [14, 2], [15, 3], [99, 3]]) {
  if (stupenUrovne(u) !== stupen) chybyUrovni.push(`úroveň ${u} má stupeň ${stupenUrovne(u)}`);
}
// Pasivy: 60 běžných karet. Do 5. úrovně plný díl jako dřív, dál menší díl až po strop, na stropu poškození.
const pasivy60 = {};
for (const [id, p] of Object.entries(PASIVY)) {
  const h = novaHra(vytvorRng(seminko));
  const zaklad = h.hrdina[p.vlastnost];
  const sila0 = h.hrdina.sila;
  let predHodnota = zaklad;
  let predSila = sila0;
  for (let u = 1; u <= 60; u++) {
    const v = karta(h, 'pasiva', id, 'bezna');
    if (v.uroven !== u || v.popis.length !== 1) chybyUrovni.push(`${id}: karta na ${u}. úroveň ${v.uroven} „${v.popis}“`);
    vyber(h, v);
    const ted = h.hrdina[p.vlastnost];
    const ocekavano = p.pricti ? zaklad + hodnotaPasivy(id, u) : zaklad * hodnotaPasivy(id, u);
    if (!relBlizko(ted, ocekavano)) chybyUrovni.push(`${id} na ${u}: ${p.vlastnost} ${ted} místo ${ocekavano}`);
    if (u === ZAKLAD_UROVNI && !relBlizko(ted, p.pricti ? zaklad + p.pricti * u : zaklad * (1 + p.nasobek) ** u)) chybyUrovni.push(`${id}: 5. úroveň jinak než dřív`);
    if (!(ted > predHodnota) && !(h.hrdina.sila > predSila)) chybyUrovni.push(`${id} na ${u}. úrovni nic nepřidal`);
    if (u > ZAKLAD_UROVNI && ted > predHodnota && !p.pricti && !(ted / predHodnota < 1 + p.nasobek)) chybyUrovni.push(`${id} na ${u}. úrovni nepřidal menší díl`);
    predHodnota = ted;
    predSila = h.hrdina.sila;
  }
  const nasobek = p.pricti ? null : h.hrdina[p.vlastnost] / zaklad;
  const strop = STROPY.pasivy[id];
  if (strop && !relBlizko(nasobek, strop)) chybyUrovni.push(`${id} na 60. úrovni ${nasobek}× místo stropu ${strop}×`);
  if (strop && !(h.hrdina.sila > sila0)) chybyUrovni.push(`${id} na stropu nepřidává poškození`);
  if (!strop && id !== 'sila' && h.hrdina.sila !== sila0) chybyUrovni.push(`${id} bez stropu změnil poškození`);
  if (strop && popisUrovni('pasiva', id, 59, 60)[0] !== `+${Math.round(SILA_ZA_PREBYTEK * 100)} % poškození všech zbraní`) chybyUrovni.push(`${id}: karta na stropu`);
  pasivy60[id] = p.pricti ? `+${h.hrdina[p.vlastnost] - zaklad}` : `${Math.round(nasobek * 100) / 100}×`;
}
// Nabídka nikdy nedojde: se vším na 50. úrovni jsou pořád tři různé karty na další úrovně.
{
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: 50, nabiti: 0 }]));
  h.pasivy = Object.fromEntries(Object.keys(PASIVY).map((id) => [id, 50]));
  for (let i = 0; i < 50; i++) {
    const v = nabidka(h);
    if (v.length !== 3 || v.some((k) => k.druh === 'leceni' || k.od !== 50 || k.uroven <= 50) || new Set(v.map((k) => k.id)).size !== 3) {
      chybyUrovni.push(`nabídka se vším na 50: ${v.map((k) => `${k.id} ${k.od}→${k.uroven}`)}`);
      break;
    }
  }
}
// Všechny zbraně na 60. úrovni 30 s v plné hře (od 10. minuty): nic se nerozbije a limity drží.
const silna = novaHra(vytvorRng(seminko));
silna.zbrane = Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: 60, nabiti: 0 }]));
silna.cas = 600;
silna.dalsiBoss = 600 + 5;
silna.dalsiSmecka = 600 + 2;
silna.dalsiPrichod = 4;
let silnaMaxStrel = 0;
let silnaMaxTrsu = 0;
let silnaMaxCisel = 0;
for (let t = 0; t < 30 && !silna.konec; t += DT) {
  aktualizuj(silna, DT, rozhodni(silna, t), SIRKA, VYSKA);
  silnaMaxCisel = Math.max(silnaMaxCisel, silna.cisla.length);
  if (silna.volby) vyber(silna, zvol(silna.volby));
  silnaMaxStrel = Math.max(silnaMaxStrel, silna.strely.length);
  silnaMaxTrsu = Math.max(silnaMaxTrsu, silna.trny.length);
  if (![silna.hrdina.x, silna.hrdina.y, silna.hrdina.hp].every(Number.isFinite) || silna.nepratele.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.hp))) {
    throw new Error(`NaN se zbraněmi na 60. úrovni v čase ${t.toFixed(1)} s`);
  }
}
if (silna.zabito === 0) chybyUrovni.push('zbraně na 60. úrovni nikoho nezabily');
// Ani na stropu trnů (s nejkratším nabíjením tříd) jich nevyraší víc, než unese MAX_TRNU.
for (const n of [1, ...Object.values(TRIDY).map((t) => t.nasobky.nabijeni ?? 1)]) {
  const st = statyZbrane('trny', 200, n);
  if (MAX_TRNU < st.pocet * Math.ceil(st.trvani / st.nabiti)) chybyUrovni.push(`na stropu trnů (nabíjení ${n}) víc trsů, než unese MAX_TRNU`);
}
const silnaStaty = staty(silna);

// Hrozba v tabulce: na začátku nic nezesílí, nic neubývá, vlna se nezrychlí pod nejkratší a čísla zůstanou konečná.
const nula = silaHrozby(0);
if (nula.uroven !== 1 || nula.zivoty !== 1 || nula.bossZivoty !== 1 || nula.poskozeni !== 1 || nula.rychlost !== 1 || nula.elita !== 0) {
  chybyHrozby.push(`hrozba na začátku něco mění: ${JSON.stringify(nula)}`);
}
const rostou = ['zivoty', 'bossZivoty', 'poskozeni', 'rychlost', 'davka', 'maxNepratel', 'elita', 'uroven'];
let predHrozba = nula;
for (let min = 0.25; min <= 120; min += 0.25) {
  const h = silaHrozby(min * 60);
  for (const co of rostou) if (!(h[co] >= predHrozba[co]) || !Number.isFinite(h[co])) chybyHrozby.push(`hrozba: ${co} v ${min}. min ubyla nebo není číslo`);
  if (!(h.vlna <= predHrozba.vlna) || h.vlna < HROZBA.nejkratsiVlna) chybyHrozby.push(`hrozba: vlna v ${min}. min ${h.vlna}`);
  if (h.rychlost > HROZBA.maxRychlost || h.elita > HROZBA.elitaMax || h.maxNepratel > HROZBA.stropNepratel || h.davka > HROZBA.maxDavka) chybyHrozby.push(`hrozba v ${min}. min přes strop`);
  if (h.uroven !== 1 + Math.floor(min)) chybyHrozby.push(`hrozba v ${min}. min má úroveň ${h.uroven}`);
  predHrozba = h;
}
if (silaHrozby(HROZBA.castejiOd * 60 + 600).elita <= silaHrozby(HROZBA.castejiOd * 60 - 1).elita) chybyHrozby.push('po castejiOd elit nepřibývá');
if (!textHrozby(7).startsWith('Hrozba 7') || !textHrozby(HROZBA.castejiOd + 1).includes('bossové')) chybyHrozby.push('texty hrozby nesedí');
// Noví nepřátelé dostanou životy, poškození a rychlost podle hrozby, elita víc, boss elitou nebude.
const pozdni = novaHra(vytvorRng(seminko));
pozdni.cas = 15 * 60;
const sila15 = silaHrozby(pozdni.cas);
const kost = pridejNepritele(pozdni, 'kostlivec', 9000, 0);
const elitniKost = pridejNepritele(pozdni, 'kostlivec', 9000, 50, true);
const elitniBoss = pridejNepritele(pozdni, 'obr', 9000, 100, true);
const zakladKostlivce = pridejNepritele(novaHra(vytvorRng(seminko)), 'kostlivec', 0, 0);
if (kost.hp !== Math.round(zakladKostlivce.hp * sila15.zivoty) || kost.poskozeni !== Math.round(zakladKostlivce.poskozeni * sila15.poskozeni)
  || Math.abs(kost.rychlost - RYCHLOST_NEPRATEL.kostlivec * sila15.rychlost) > 1e-9 || kost.elita) {
  chybyHrozby.push(`kostlivec v 15. min: ${kost.hp} životů, ${kost.poskozeni} poškození, rychlost ${kost.rychlost}`);
}
if (!elitniKost.elita || elitniKost.hp !== Math.round(zakladKostlivce.hp * sila15.zivoty * ELITA.zivoty) || elitniKost.xp !== zakladKostlivce.xp * ELITA.xp
  || !(elitniKost.polomer > kost.polomer) || !(elitniKost.poskozeni > kost.poskozeni)) {
  chybyHrozby.push('elita nemá víc životů, poškození, velikosti a zkušeností');
}
if (elitniBoss.elita || elitniBoss.maxHp !== Math.round(420 * sila15.bossZivoty)) chybyHrozby.push(`boss jako elita nebo se špatnými životy (${elitniBoss.maxHp})`);
// Jedový oblak v 20. minutě pálí víc (stejně jako dotyk).
const pozdniJed = novaHra(vytvorRng(seminko));
pozdniJed.cas = 20 * 60;
pozdniJed.hrozba = silaHrozby(pozdniJed.cas).uroven;
pozdniJed.oblaky.push({ x: 0, y: 0, zivot: TRVANI_OBLAKU - NAFUKOVANI_OBLAKU - 0.1, polomer: POLOMER_OBLAKU });
aktualizuj(pozdniJed, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
const ocekavanyJed = Math.round(JED_OBLAKU * silaHrozby(pozdniJed.cas).poskozeni);
if (pozdniJed.hrdina.maxHp - pozdniJed.hrdina.hp !== ocekavanyJed || !(ocekavanyJed > JED_OBLAKU)) chybyHrozby.push(`oblak ve 20. min ubral ${pozdniJed.hrdina.maxHp - pozdniJed.hrdina.hp}, má ${ocekavanyJed}`);
// Hra nekončí po pevném čase: nezranitelný hrdina v 60. minutě hraje dál, hrozba 61, čísla nepřátel jsou konečná.
// Bossové a smečky se posunou za 60. minutu, jinak by se všechny zmeškané vyvalily naráz.
const hodina = novaHra(vytvorRng(seminko));
hodina.cas = 3600;
hodina.dalsiBoss = 3600 + 60;
hodina.dalsiSmecka = 3600 + 5;
let maxNaHodine = 0;
let hlaseniNaHodine = null;
for (let t = 0; t < 10; t += DT) {
  hodina.hrdina.nezranitelny = 1;
  aktualizuj(hodina, DT, rozhodni(hodina, t), SIRKA, VYSKA);
  if (hodina.volby) vyber(hodina, zvol(hodina.volby));
  hlaseniNaHodine ??= hodina.hlaseniHrozby?.text ?? null;
  maxNaHodine = Math.max(maxNaHodine, hodina.nepratele.length);
}
if (hodina.konec || hodina.hrozba !== 61 || !hlaseniNaHodine?.startsWith('Hrozba 61')) chybyHrozby.push(`hodina hry: konec ${hodina.konec}, hrozba ${hodina.hrozba}, ohlášení ${hlaseniNaHodine}`);
if (!hodina.nepratele.length || hodina.nepratele.some((n) => !Number.isFinite(n.hp) || !(n.hp > 0) || !Number.isFinite(n.poskozeni) || !Number.isFinite(n.rychlost))) chybyHrozby.push('v 60. minutě nepřátelé bez konečných čísel');
const vyvolaniNaraz = Math.max(...PORADI_BOSSU.flatMap((id) => schopnostiBosse(id).filter((x) => x.id === 'vyvolani').map((x) => x.pocet[1])));
if (maxNaHodine > HROZBA.stropNepratel + SMECKA_DO * 3 + vyvolaniNaraz * 4) chybyHrozby.push(`v 60. minutě ${maxNaHodine} nepřátel naráz`);
// Elity v hlavní hře: před elitaOd žádná, mezi elitaOd a castejiOd zhruba elitaSance, potom víc.
const podil = ([kolik, elit]) => (kolik ? elit / kolik : null);
if (elityPodleCasu.pred[1]) chybyHrozby.push(`${elityPodleCasu.pred[1]} elit před ${HROZBA.elitaOd}. minutou`);
if (elityPodleCasu.stred[0] > 500 && Math.abs(podil(elityPodleCasu.stred) - HROZBA.elitaSance) > HROZBA.elitaSance / 2) chybyHrozby.push(`podíl elit před ${HROZBA.castejiOd}. min ${podil(elityPodleCasu.stred)}`);
if (elityPodleCasu.pozde[0] > 500 && !(podil(elityPodleCasu.pozde) > podil(elityPodleCasu.stred))) chybyHrozby.push('po 10. minutě elit nepřibylo');
// Vyvážení: plně vylepšený bot hraje až do konce, nejvýš 30 minut. Bez vylepšení je to hlavní hra (nejvýš delka).
const vydrz = hrajKratce(plna, 1800);
if (!vydrz.konec) chybyHrozby.push('plně vylepšený bot přežil 30 minut, hrozba neroste dost');

// Čísla poškození zblízka: hrdina bez zbraní a bez vln (ať do toho nic nestřílí) a nepřátelé, kteří nepadnou.
const hraBezZbrani = () => {
  const h = tichaHra({});
  h.hrdina.sila = 1;
  return h;
};
const vydrzi = (h, x, y) => {
  const n = pridejNepritele(h, 'kostlivec', x, y);
  n.hp = n.maxHp = 1e9;
  return n;
};
{
  const h = hraBezZbrani();
  const a = vydrzi(h, 300, 0);
  const b = vydrzi(h, -300, 0);
  zasah(h, a, 10);
  zasah(h, a, 5);
  if (h.cisla.length !== 1 || h.cisla[0].hodnota !== 15 || h.cisla[0].text !== '15') chybyCisel.push(`dvě rány naráz nedaly jedno číslo 15 (${h.cisla.map((c) => c.text)})`);
  if (!(h.cisla[0].y < a.y)) chybyCisel.push('číslo zásahu není nad nepřítelem');
  zasah(h, b, 7);
  if (h.cisla.length !== 2 || h.cisla[1].hodnota !== 7) chybyCisel.push('rána jinému nepříteli se přičetla k cizímu číslu');
  h.cas += SLUCOVANI_CISEL + 0.01;
  zasah(h, a, 3);
  if (h.cisla.length !== 3 || h.cisla[0].hodnota !== 15 || h.cisla[2].hodnota !== 3) chybyCisel.push('rána po SLUCOVANI_CISEL se přičetla ke starému číslu');
  // Obyčejné rány po 10: práh silné rány se usadí u nich, deset zůstane bílé a trojnásobek zežloutne.
  for (let i = 0; i < 1000; i++) {
    h.cas += 1;
    zasah(h, a, 10);
  }
  h.cas += 1;
  zasah(h, a, 10);
  if (h.cisla.at(-1).barva !== null) chybyCisel.push(`obyčejná rána 10 je ${h.cisla.at(-1).barva} (práh ${h.prahSilneho.toFixed(1)})`);
  h.cas += 1;
  zasah(h, a, 30);
  if (h.cisla.at(-1).barva !== 'silny') chybyCisel.push(`trojnásobná rána není silná (práh ${h.prahSilneho.toFixed(1)}, ×${NAD_PRAHEM})`);
  // Rána 1000× silnější posune práh jen o kousek.
  h.cas += 1;
  zasah(h, a, 10000);
  h.cas += 1;
  zasah(h, a, 10);
  if (h.cisla.at(-1).barva !== null) chybyCisel.push('jedna obří rána zvedla práh tak, že další obyčejné nejsou bílé');
  if (h.cisla.at(-2).text !== '10k') chybyCisel.push(`rána 10000 je ${h.cisla.at(-2).text}, má být 10k`);
  // Strop: dvě stě nepřátel zasažených naráz dá jen MAX_CISEL čísel, vyřazená už nežijí.
  const vsechna = [];
  for (let i = 0; i < 200; i++) {
    zasah(h, vydrzi(h, i * 3, 400), 5);
    vsechna.push(h.cisla.at(-1));
  }
  if (h.cisla.length !== MAX_CISEL) chybyCisel.push(`po 200 zásazích ${h.cisla.length} čísel, má být ${MAX_CISEL}`);
  if (vsechna.some((c) => !h.cisla.includes(c) && c.zivot > 0)) chybyCisel.push('vyřazené číslo dál žije');
  // Za TRVANI_CISLA všechna čísla zmizí.
  h.nepratele = [];
  for (let t = 0; t < TRVANI_CISLA + DT; t += DT) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.cisla.some((c) => vsechna.includes(c))) chybyCisel.push(`čísla nezmizela za ${TRVANI_CISLA} s`);
}
{
  // Nepřítel na hrdinovi: rána je červené -N nad hrdinou. Odpočinek léčí zeleným +N.
  const h = hraBezZbrani();
  const n = vydrzi(h, 0, 0);
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const rana = h.cisla.find((c) => c.barva === 'zraneni');
  if (!rana || rana.text !== `-${n.poskozeni}` || h.hrdina.hp !== h.hrdina.maxHp - n.poskozeni || !(rana.y < h.hrdina.y)) chybyCisel.push(`rána hrdinovi bez červeného čísla (${rana?.text})`);
  h.nepratele = [];
  h.hrdina.hp = 40;
  vyber(h, karta(h, 'leceni', 'leceni'));
  const leceni = h.cisla.find((c) => c.barva === 'leceni');
  if (!leceni || leceni.text !== `+${h.hrdina.hp - 40}`) chybyCisel.push(`odpočinek bez zeleného čísla (${leceni?.text})`);
}
for (const [h, ocekavany] of [[9999, '9999'], [12345, '12k'], [999999, '999k'], [2500000, '2M']]) {
  if (kratkeCislo(h) !== ocekavany) chybyCisel.push(`kratkeCislo(${h}) = ${kratkeCislo(h)}`);
}
if (maxCisel > MAX_CISEL || silnaMaxCisel > MAX_CISEL) chybyCisel.push(`naráz ${Math.max(maxCisel, silnaMaxCisel)} čísel`);
if (cervenychCisel !== zasahu) chybyCisel.push(`červené číslo jen u ${cervenychCisel} z ${zasahu} ran hrdinovi`);
const cislaHry = [...videnaCisla];
const zasahyHry = cislaHry.filter((c) => c.barva === null || c.barva === 'silny');
const podilSilnych = zasahyHry.length ? zasahyHry.filter((c) => c.barva === 'silny').length / zasahyHry.length : 0;
if (zasahyHry.length > 1000 && (podilSilnych < 0.01 || podilSilnych > 0.35)) chybyCisel.push(`silných zásahů ${(podilSilnych * 100).toFixed(1)} %`);

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
    prisli: prisliBossove, zabito: hra.zabitoBossu, zasahy_hrdiny: hra.zasahyBossu, schopnosti_pouzil: hra.schopnostiPouzito,
    max_pavoucku: maxPavoucku, souboje, zasahu_schopnostmi_celkem: soucet, schopnosti_zblizka: schopnostiPokusy,
  },
  urovne_bez_stropu: {
    zbrane_hlavni_hry: Object.fromEntries(Object.entries(hra.zbrane).map(([id, z]) => [id, z.uroven])),
    nejvyssi_zbran: Math.max(...Object.values(hra.zbrane).map((z) => z.uroven)),
    pasivy_hlavni_hry: hra.pasivy,
    posledni_rust_zbrane_na_urovni: rostlyDo,
    pasivy_na_60: pasivy60,
    vse_na_60_za_30_s: {
      zabito: silna.zabito, zivy: !silna.konec, max_strel: silnaMaxStrel, max_trsu: silnaMaxTrsu,
      jisker: silnaStaty.jiskra.pocet, krumpacu: silnaStaty.krumpace.pocet, preskoku: silnaStaty.blesk.preskoky,
      dosah_lucerny: Math.round(silnaStaty.lucerna.dosah), poskozeni_jiskry: Math.round(silnaStaty.jiskra.poskozeni),
    },
  },
  hrozba: {
    konecna: hra.hrozba,
    ohlaseni: ohlaseniHrozby,
    prvni_elita_s: prvniElita === null ? null : Math.round(prvniElita),
    elit: hra.elit,
    podil_elit_procenta: Object.fromEntries(Object.entries(elityPodleCasu).map(([k, v]) => [k, v[0] ? Math.round(podil(v) * 1000) / 10 : null])),
    preziti_min: {
      bez_vylepseni: hra.konec ? Math.round(hra.cas / 6) / 10 : `přes ${Math.round(delka / 6) / 10}`,
      vse_vylepsene: vydrz.konec ? Math.round(vydrz.cas / 6) / 10 : 'přes 30',
      vse_vylepsene_uroven: vydrz.hrdina.uroven,
    },
    tabulka: Object.fromEntries([0, 5, 10, 15, 20, 25].map((min) => {
      const h = silaHrozby(min * 60);
      return [`${min}_min`, { zivoty: +h.zivoty.toFixed(2), bossove: +h.bossZivoty.toFixed(2), poskozeni: +h.poskozeni.toFixed(2), rychlost: +h.rychlost.toFixed(2), naraz: h.maxNepratel, elita_procent: +(h.elita * 100).toFixed(1) }];
    })),
  },
  cisla_poskozeni: {
    cisel: cislaHry.length,
    max_naraz: maxCisel,
    max_naraz_na_60: silnaMaxCisel,
    silnych_procenta: Math.round(podilSilnych * 1000) / 10,
    cervenych: cervenychCisel,
    zelenych: cislaHry.filter((c) => c.barva === 'leceni').length,
    prah_silneho_na_konci: Math.round(hra.prahSilneho * 10) / 10,
  },
  trny_a_zrcadlo: {
    hlavni_hra: { max_trsu_naraz: maxTrsu, odrazeno_strel: hra.odrazeno, odhozeno_nepratel: hra.odhozeno },
    trny: trnovePokusy, zrcadlo: zrcadlovePokusy,
  },
};
console.log(JSON.stringify(vysledek, null, 2));

const chyby = [
  ...chybyTrid, ...chybyDusi, ...chybyRarit, ...new Set(chybyNepratel), ...chybyVybavy, ...chybyLucerny, ...new Set(chybyBeden),
  ...new Set(chybyBossu), ...chybyZbrani, ...new Set(chybyUrovni), ...new Set(chybyHrozby), ...new Set(chybyCisel),
];
if (maxTrsu > MAX_TRNU) chyby.push(`trsů trnů naráz ${maxTrsu}`);
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
const vysledekHry = { cas: Math.floor(hra.cas), uroven: hra.hrdina.uroven, zabito: hra.zabito, hrozba: hra.hrozba };
if (nactiRekord() !== null) chyby.push('prázdné úložiště má mít žádný rekord');
if (!zapisVysledek(vysledekHry).novy) chyby.push('první hra nebyla rekord');
if (nactiRekord()?.cas !== vysledekHry.cas || nactiRekord()?.hrozba !== hra.hrozba) chyby.push('rekord se neuložil i s hrozbou');
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
// Nastavení: bez záznamu čísla poškození zapnutá, vypnutí se uloží, rozbitý záznam = výchozí.
if (nactiNastaveni().cislaPoskozeni !== true) chyby.push('bez uloženého nastavení mají být čísla poškození zapnutá');
ulozNastaveni({ cislaPoskozeni: false });
if (nactiNastaveni().cislaPoskozeni !== false) chyby.push('vypnutá čísla poškození se neuložila');
for (const spatne of ['{rozbité', '42', '"ne"', '{"cislaPoskozeni":"ne"}', 'null']) {
  mapa.set('hlubiny.nastaveni', spatne);
  if (nactiNastaveni().cislaPoskozeni !== true) chyby.push(`rozbité nastavení ${spatne} nevrátilo výchozí`);
}
nahradUloziste({ getItem() { throw new Error('zakázáno'); }, setItem() { throw new Error('zakázáno'); } });
ulozNastaveni({ cislaPoskozeni: false });
if (nactiNastaveni().cislaPoskozeni !== true) chyby.push('zakázané úložiště nevrátilo výchozí nastavení');
if (nactiDuse().duse !== 0 || pripisDuse(10).duse !== 10) chyby.push('zakázané úložiště u duší nefunguje jako prázdné');
ulozDuse({ duse: 5, vylepseni: { sila: 1 } });
if (nactiRekord() !== null || !zapisVysledek(vysledekHry).novy) chyby.push('zakázané úložiště se nechová jako prázdné');
ulozTridu('lovec');
if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push('zakázané úložiště nevrátilo výchozí třídu');
if (chyby.length) {
  console.error('CHYBA:', chyby.join('; '));
  process.exit(1);
}
