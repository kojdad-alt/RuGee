import { sprity } from './sprity.js';
import {
  staty, TRVANI_TRESU, VYCHOZI_TRIDA, TRVANI_ZABLESKU, ODHOZENI_PRI_OZIVENI, TRVANI_OBLAKU, NAFUKOVANI_OBLAKU,
  TRVANI_ZARU, TRVANI_VYBUCHU, bossBary, POLOMER_DUPNUTI, NAPRAH_DUPNUTI, LET_KAMENE, POLOMER_KAMENE,
  NABITI_BLUDICKY, ZJEVENI_BLUDICKY, POLOMER_STRELY_BOSSU, RUST_TRNU, VADNUTI_TRNU, DOZNIVANI_TRNU, TRVANI_ODLESKU,
  poziceZrcadla,
} from './hra.js';
import { dlazdiceLouky, ozdobyLouky } from './louka.js';

const MERITKO = 3;
const DLAZDICE = 48;
const SILA_TRESU = 5;
// Barvy úlomků podle toho, z čeho je nepřítel (stejné odstíny jako jeho sprite).
const BARVY_CASTIC = {
  netopyr: ['#6b4c8a', '#ff5a5a', '#3b2a4a'],
  slizak: ['#5fae4e', '#9be08a', '#5fae4e'],
  kostlivec: ['#e8e2d0', '#b9c2cc', '#e8e2d0'],
  strazce: ['#6e6577', '#8f86a0', '#ffb347'],
  matka: ['#3b2a4a', '#6b4c8a', '#ff5a5a'],
  obr: ['#8d9098', '#53565e', '#3f8a3c'],
  bludicka: ['#7f9cf0', '#dfe8ff', '#fff3b0'],
  pavoucek: ['#3b2a4a', '#6b4c8a', '#ff5a5a'],
  kamen: ['#8d9098', '#53565e', '#c9ccd2'],
  pavouk: ['#4a3530', '#a07e5c', '#ffb347'],
  duch: ['#e4f6f3', '#9fc8c6', '#e4f6f3'],
  houbak: ['#9b59c9', '#d6a9f2', '#f1d2a8'],
  vlk: ['#8d9098', '#53565e', '#c9ccd2'],
  bedna: ['#a07e5c', '#8a5a35', '#4a3530'],
  sud: ['#a07e5c', '#6e6577', '#8a5a35'],
  trny: ['#4a3530', '#3f8a3c', '#a07e5c'],
  zrcadlo: ['#dfe8ff', '#b9c2cc', '#7f9cf0'],
};
const BARVA_SITE = 'rgba(236,236,244,0.8)';
// Duch je i viditelný průsvitný, schovaný je jen tušený obrys. Mezi tím přechází plynule.
const PRUHLEDNOST_DUCHA = 0.62;
const PRUHLEDNOST_SCHOVANEHO = 0.1;
const PRECHOD_DUCHA = 0.25;
// Každý boss má svou barvu: pruh životů nahoře, malý pruh nad ním a šipka, když je mimo obrazovku.
// pruh = výplň, tmava = rámeček a podklad portrétu, text = jméno.
const BARVY_BOSSU = {
  strazce: { pruh: '#ffb347', tmava: '#7a4214', text: '#ffd27a' },
  matka: { pruh: '#e5484d', tmava: '#6e1f2b', text: '#ffc2c2' },
  obr: { pruh: '#7fc46a', tmava: '#2f5a2a', text: '#c8f0b0' },
  bludicka: { pruh: '#8fb4ff', tmava: '#2c3f7a', text: '#dfe8ff' },
};
// Pruhy bossů nahoře: začínají pod horní lištou (úroveň, čas), každý další o VYSKA_BARU níž.
const HORNI_BARY = 66;
const VYSKA_BARU = 48;
const PORTRET = 40;
// Úbytek životů v pruhu se chvíli drží světlý a pak doběhne (ať je vidět, kolik rána vzala).
const DRZENI_UBYTKU = 0.35;
const RYCHLOST_UBYTKU = 0.8;
// Výška oblouku, kterým letí kámen Kamenného obra.
const VYSKA_HODU = 90;
// Zrcadla za sebou nechávají dva bledé odlesky (o kolik radiánů zpátky a jak průhledné) a jednou za
// TREPOT_ZRCADEL sekund se každé krátce zablýskne.
const STOPY_ZRCADEL = [[0.3, 0.16], [0.15, 0.32]];
const TREPOT_ZRCADEL = 1.1;

// Světlo lucerny se kreslí po čtverečcích stejně velkých jako pixel spritu, ať nevypadá rozmazaně.
// Jednou za PULZ_LUCERNY sekund vyjde od hrdiny vlna světla, na okraji dosahu prstenec zjasní.
const PULZ_LUCERNY = 1.2;
const JISKER_LUCERNY = 14;
const BARVA_ZARU = '#ff9a3c';
// Jak moc nepřítel po zásahu žárem nejvýš zjasní (víc už by z něj byla jen oranžová skvrna).
const SILA_ZARU = 0.6;

function hash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function podlaha(ctx, kx, ky, sirka, vyska) {
  const x0 = Math.floor(kx / DLAZDICE) - 1;
  const y0 = Math.floor(ky / DLAZDICE) - 1;
  for (let ty = y0; ty < y0 + vyska / DLAZDICE + 3; ty++) {
    for (let tx = x0; tx < x0 + sirka / DLAZDICE + 3; tx++) {
      const px = Math.round(tx * DLAZDICE - kx);
      const py = Math.round(ty * DLAZDICE - ky);
      const h = hash(tx, ty);
      // Obyčejná tráva je nejčastější, květiny, kameny a hlína jen občas.
      const druh = h % 100 < 82 ? h % 6 : 6 + (h >>> 8) % (dlazdiceLouky.length - 6);
      ctx.drawImage(dlazdiceLouky[druh], px, py, DLAZDICE, DLAZDICE);
      if ((h >>> 16) % 100 < 3) {
        const ozd = ozdobyLouky[(h >>> 20) % ozdobyLouky.length];
        ctx.drawImage(ozd, px, py, DLAZDICE, DLAZDICE);
      }
    }
  }
}

// Přebarvená kopie spritu (jen jeho pixely, ne celý čtverec). Každá kombinace se kreslí jednou.
const prebarvene = new WeakMap();
function prebarvi(obr, barva) {
  if (!prebarvene.has(obr)) prebarvene.set(obr, new Map());
  const podleBarvy = prebarvene.get(obr);
  if (!podleBarvy.has(barva)) {
    const kopie = document.createElement('canvas');
    kopie.width = obr.width;
    kopie.height = obr.height;
    const g = kopie.getContext('2d');
    g.drawImage(obr, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = barva;
    g.fillRect(0, 0, obr.width, obr.height);
    podleBarvy.set(barva, kopie);
  }
  return podleBarvy.get(barva);
}

// prekryv: barva, kterou se sprite přebarví (bílá po zásahu, bledá v síti), jinak nic
function sprite(ctx, obr, x, y, otoceny = 1, prekryv = null, velikost = obr.width * MERITKO) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (otoceny < 0) ctx.scale(-1, 1);
  ctx.drawImage(prekryv ? prebarvi(obr, prekryv) : obr, -velikost / 2, -velikost / 2, velikost, velikost);
  ctx.restore();
}

// Pavoučí síť přes hrdinu: paprsky a dva kruhy, s koncem sítě bledne.
function sit(ctx, x, y, zbyva) {
  ctx.save();
  ctx.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);
  ctx.globalAlpha = Math.min(1, zbyva * 2);
  ctx.strokeStyle = BARVA_SITE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const uhel = (i / 8) * Math.PI * 2 + 0.3;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.round(Math.cos(uhel) * 17), Math.round(Math.sin(uhel) * 17));
  }
  for (const r of [7, 13]) {
    for (let i = 0; i <= 8; i++) {
      const uhel = (i / 8) * Math.PI * 2 + 0.3;
      const bx = Math.round(Math.cos(uhel) * r);
      const by = Math.round(Math.sin(uhel) * r);
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Pixelový kruh o poloměru r čtverečků (Bresenhamův kruh). Pro každý řádek vrací, jak daleko od středu
// kruh sahá, a seznam políček obvodu. Počítá se jednou pro každý poloměr.
const kruhy = new Map();
function pixelovyKruh(r) {
  if (!kruhy.has(r)) {
    const obvod = new Map();
    let x = r;
    let y = 0;
    let chyba = 1 - r;
    while (x >= y) {
      for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) obvod.set(`${a},${b}`, [a, b]);
      y += 1;
      if (chyba < 0) chyba += 2 * y + 1;
      else {
        x -= 1;
        chyba += 2 * (y - x) + 1;
      }
    }
    const radky = new Map();
    for (const [a, b] of obvod.values()) radky.set(b, Math.max(radky.get(b) ?? 0, Math.abs(a)));
    kruhy.set(r, { obvod: [...obvod.values()], radky: [...radky] });
  }
  return kruhy.get(r);
}

// Kolem (x, y) na zem: teplý pixelový kruh přes celý dosah, vlna od středu, jasný prstenec na okraji dosahu
// (pulzuje) a jiskry, které na okraji vyskočí a zhasnou. Všechno je jen podle času, nic se neukládá.
function svetloLucerny(ctx, x, y, dosah, cas) {
  const m = MERITKO;
  const cx = Math.round(x) - Math.floor(m / 2);
  const cy = Math.round(y) - Math.floor(m / 2);
  const r = Math.max(2, Math.round(dosah / m));
  const t = (cas % PULZ_LUCERNY) / PULZ_LUCERNY;
  const policka = (kruh) => {
    for (const [a, b] of kruh.obvod) ctx.fillRect(cx + a * m, cy + b * m, m, m);
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,170,70,0.07)';
  for (const [b, sirka] of pixelovyKruh(r).radky) ctx.fillRect(cx - sirka * m, cy + b * m, (2 * sirka + 1) * m, m);
  ctx.fillStyle = `rgba(255,190,90,${(0.2 * (1 - t)).toFixed(3)})`;
  policka(pixelovyKruh(Math.max(1, Math.round(r * (0.2 + 0.8 * t)))));
  const jas = 0.5 + 0.35 * (1 - t) ** 2;
  ctx.fillStyle = `rgba(255,150,60,${(jas * 0.45).toFixed(3)})`;
  policka(pixelovyKruh(r - 1));
  ctx.fillStyle = `rgba(255,214,120,${jas.toFixed(3)})`;
  policka(pixelovyKruh(r));
  for (let i = 0; i < JISKER_LUCERNY; i++) {
    const beh = cas * 0.8 + i * 0.618;
    const faze = beh % 1;
    const uhel = i * 2.4 + Math.floor(beh) * 1.7 + faze * 0.25;
    const vzdal = r * m + (faze - 0.3) * 10;
    const velikost = i % 3 === 0 ? m : 2;
    ctx.globalAlpha = Math.sin(faze * Math.PI);
    ctx.fillStyle = i % 2 ? '#fff3b0' : '#ffb347';
    ctx.fillRect(Math.round(x + Math.cos(uhel) * vzdal - velikost / 2), Math.round(y + Math.sin(uhel) * vzdal - velikost / 2), velikost, velikost);
  }
  ctx.restore();
}

// Kde se vedle hrdiny vznáší lucerna: za zády (na opačné straně, než kouká), ve výšce ramen, a pomalu
// se pohupuje. Vrací střed skla.
function poziceLucerny(hra, stred) {
  return {
    x: Math.round(stred.x - hra.hrdina.otoceny * 21),
    y: Math.round(stred.y - 3 + Math.sin(hra.cas * 2.5) * 2),
  };
}

// Kdo dostal žár, krátce se rozzáří: přes sprite se přičte teplé světlo a pomalu zhasne.
function rozzar(ctx, obr, x, y, otoceny, velikost, sila) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= sila * SILA_ZARU;
  sprite(ctx, obr, x, y, otoceny, BARVA_ZARU, velikost);
  ctx.restore();
}

// Průhlednost ducha podle toho, kolik mu zbývá do změny: před zmizením bledne, před vynořením sílí.
function pruhlednostDucha(n) {
  const t = Math.min(1, n.duchCas / PRECHOD_DUCHA);
  const [ted, potom] = n.skryty ? [PRUHLEDNOST_SCHOVANEHO, PRUHLEDNOST_DUCHA] : [PRUHLEDNOST_DUCHA, PRUHLEDNOST_SCHOVANEHO];
  return potom + (ted - potom) * t;
}

// Jedový oblak po houbákovi: chuchvalec fialových obláčků, které se pomalu točí, a pár bublinek.
// Nejdřív se nafukuje (bledší), na konci se rozplyne.
function oblak(ctx, x, y, o, cas) {
  const stari = TRVANI_OBLAKU - o.zivot;
  const nafouknuti = Math.min(1, stari / NAFUKOVANI_OBLAKU);
  const r = o.polomer * (0.45 + 0.55 * nafouknuti);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.globalAlpha = Math.min(1, o.zivot * 2) * (nafouknuti < 1 ? 0.55 : 1);
  const chuchvalce = [[0, 0, 0.62]];
  for (let i = 0; i < 6; i++) {
    const uhel = (i / 6) * Math.PI * 2 + cas * 0.6 + o.x * 0.01;
    chuchvalce.push([Math.cos(uhel) * r * 0.5, Math.sin(uhel) * r * 0.42, 0.42 + 0.06 * Math.sin(cas * 3 + i)]);
  }
  for (const [barva, navic] of [['rgba(48,18,70,0.5)', 2], ['rgba(170,96,220,0.42)', 0]]) {
    ctx.fillStyle = barva;
    for (const [cx, cy, velikost] of chuchvalce) {
      ctx.beginPath();
      ctx.arc(Math.round(cx), Math.round(cy), r * velikost + navic, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // bublinky stoupají a mizí, každá s vlastním zpožděním
  for (let i = 0; i < 4; i++) {
    const faze = (cas * 0.9 + i * 0.27 + o.y * 0.003) % 1;
    const bx = Math.round(Math.sin(i * 2.4 + o.x) * r * 0.55);
    const by = Math.round(r * 0.35 - faze * r * 1.1);
    ctx.globalAlpha = Math.min(1, o.zivot * 2) * (1 - faze);
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(bx - 1, by - 1, 5, 5);
    ctx.fillStyle = '#e2b8ff';
    ctx.fillRect(bx, by, 3, 3);
  }
  ctx.restore();
}

// Pixelový kruh o poloměru r (v pixelech obrazovky) kolem (x, y): jen obvod, nebo plný (radky).
function kruhNaZemi(ctx, x, y, r, plny = false) {
  const m = MERITKO;
  const cx = Math.round(x) - Math.floor(m / 2);
  const cy = Math.round(y) - Math.floor(m / 2);
  const kruh = pixelovyKruh(Math.max(1, Math.round(r / m)));
  if (plny) for (const [b, sirka] of kruh.radky) ctx.fillRect(cx - sirka * m, cy + b * m, (2 * sirka + 1) * m, m);
  else for (const [a, b] of kruh.obvod) ctx.fillRect(cx + a * m, cy + b * m, m, m);
}

// Trs trnů na zemi: tmavá rozrytá hlína v dosahu a v ní ostny. Ostny nejdřív vyrůstají ze země (špičky
// první), na konci zase zalezou. Kde který osten stojí, je dané místem trsu, ať neposkakují.
function trsTrnu(ctx, p, x, y) {
  const stari = p.trvani - p.zivot;
  const rust = Math.min(1, stari / RUST_TRNU);
  const venku = Math.max(0, Math.min(rust, p.zivot / VADNUTI_TRNU));
  ctx.save();
  ctx.globalAlpha = Math.min(1, p.zivot / VADNUTI_TRNU);
  const r = p.polomer * (0.55 + 0.45 * rust);
  ctx.fillStyle = 'rgba(46,30,22,0.42)';
  kruhNaZemi(ctx, x, y, r, true);
  ctx.fillStyle = 'rgba(38,85,42,0.75)';
  kruhNaZemi(ctx, x, y, r);
  ctx.restore();
  const obr = sprity.trs;
  const radku = Math.ceil(obr.height * venku);
  if (radku <= 0) return;
  const zaklad = hash(Math.round(p.x), Math.round(p.y));
  const pocet = p.polomer > 30 ? 7 : 5;
  const ostny = [];
  for (let i = 0; i < pocet; i++) {
    const uhel = i * 2.4 + (zaklad % 628) / 100;
    const vzdal = i === 0 ? 0 : p.polomer * (i % 2 ? 0.66 : 0.4);
    ostny.push({ x: x + Math.cos(uhel) * vzdal, y: y + Math.sin(uhel) * vzdal * 0.8, otoceny: (zaklad >>> i) & 1 });
  }
  // zadní ostny dřív, ať je přední překryjí
  ostny.sort((a, b) => a.y - b.y);
  const w = obr.width * MERITKO;
  const v = radku * MERITKO;
  for (const o of ostny) {
    ctx.save();
    ctx.translate(Math.round(o.x), Math.round(o.y + (obr.height * MERITKO) / 2));
    if (o.otoceny) ctx.scale(-1, 1);
    ctx.drawImage(obr, 0, 0, obr.width, radku, -w / 2, -v, w, v);
    ctx.restore();
  }
}

// Nepříteli v trní se kolem nohou omotají šlahouny (bossovi dva), po vylezení vyblednou.
function sponaTrnu(ctx, n, x, y, velikost) {
  const obr = sprity.spona;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  ctx.save();
  ctx.globalAlpha = Math.min(1, n.trny / DOZNIVANI_TRNU);
  const dole = Math.round(y + velikost / 2 - v + 2);
  for (const posun of n.boss ? [-w / 2 + 2, w / 2 - 2] : [0]) ctx.drawImage(obr, Math.round(x + posun - w / 2), dole, w, v);
  ctx.restore();
}

// Zrcadlový štít: bledý kruh dráhy, za každým zrcadlem dva odlesky a samo zrcadlo natočené po dráze.
// Občas se zablýskne. Větší zrcadla (5. úroveň) se kreslí o pixel spritu větší.
function zrcadlaHrdiny(ctx, hra, s, stred) {
  const z = s.zrcadlo;
  const obr = sprity.strep;
  const m = z.velikost > 10 ? MERITKO + 1 : MERITKO;
  ctx.save();
  ctx.fillStyle = 'rgba(223,232,255,0.12)';
  kruhNaZemi(ctx, stred.x, stred.y, z.polomer);
  ctx.restore();
  const kresli1 = (uhel, prekryv, pruhlednost) => {
    ctx.save();
    ctx.globalAlpha = pruhlednost;
    ctx.translate(Math.round(stred.x + Math.cos(uhel) * z.polomer), Math.round(stred.y + Math.sin(uhel) * z.polomer));
    ctx.rotate(uhel);
    ctx.drawImage(prekryv ? prebarvi(obr, prekryv) : obr, (-obr.width * m) / 2, (-obr.height * m) / 2, obr.width * m, obr.height * m);
    ctx.restore();
  };
  const smer = Math.sign(z.rychlost) || 1;
  for (let i = 0; i < z.pocet; i++) {
    const { uhel } = poziceZrcadla(hra, i, s);
    for (const [zpet, pruhlednost] of STOPY_ZRCADEL) kresli1(uhel - zpet * smer, '#dfe8ff', pruhlednost);
    kresli1(uhel, null, 1);
    const faze = (hra.cas / TREPOT_ZRCADEL + i * 0.37) % 1;
    if (faze < 0.12) kresli1(uhel, '#ffffff', 0.7 * Math.sin((faze / 0.12) * Math.PI));
  }
}

// Odlesk po odražené střele nebo odhození: čtyřcípá jiskra, roste a zhasíná.
function odlesk(ctx, x, y, o) {
  const t = 1 - o.zivot / TRVANI_ODLESKU;
  const delka = Math.round(4 + 10 * t);
  const cx = Math.round(x);
  const cy = Math.round(y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = '#7f9cf0';
  ctx.fillRect(cx - delka, cy - 1, delka * 2, 3);
  ctx.fillRect(cx - 1, cy - delka, 3, delka * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - Math.round(delka / 2), cy, delka, 1);
  ctx.fillRect(cx, cy - Math.round(delka / 2), 1, delka);
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
  ctx.restore();
}

// Útoky bossů na zemi (pod nepřáteli): kam Strážce dupne, vlny dupnutí a kam dopadne kámen.
function utokyNaZemi(ctx, hra, naObrazovce) {
  for (const n of hra.nepratele) {
    if (n.druh !== 'strazce' || !(n.naprah > 0)) continue;
    // Napřahování: kruh dosahu na zemi rudne a bliká čím dál rychleji.
    const p = naObrazovce(n);
    const t = 1 - n.naprah / NAPRAH_DUPNUTI;
    ctx.save();
    ctx.fillStyle = `rgba(229,72,77,${(0.06 + 0.12 * t).toFixed(3)})`;
    kruhNaZemi(ctx, p.x, p.y, POLOMER_DUPNUTI, true);
    ctx.globalAlpha = Math.floor(hra.cas * (6 + 14 * t)) % 2 ? 0.55 : 0.95;
    ctx.fillStyle = '#e5484d';
    kruhNaZemi(ctx, p.x, p.y, POLOMER_DUPNUTI);
    ctx.restore();
  }
  for (const v of hra.vlny) {
    const p = naObrazovce(v);
    const t = v.r / v.max;
    ctx.save();
    ctx.globalAlpha = 1 - t * t * 0.7;
    ctx.fillStyle = '#7a4214';
    kruhNaZemi(ctx, p.x, p.y, Math.max(3, v.r - 3));
    ctx.fillStyle = '#ffb347';
    kruhNaZemi(ctx, p.x, p.y, v.r);
    ctx.fillStyle = '#fff3b0';
    kruhNaZemi(ctx, p.x, p.y, v.r + 3);
    ctx.restore();
  }
  for (const k of hra.kameny) {
    // Místo dopadu: stín roste, jak kámen padá, a rudý kroužek kolem.
    const p = naObrazovce(k);
    const t = Math.min(1, k.let / LET_KAMENE);
    ctx.save();
    ctx.fillStyle = `rgba(11,10,15,${(0.15 + 0.3 * t).toFixed(3)})`;
    kruhNaZemi(ctx, p.x, p.y, 6 + (POLOMER_KAMENE - 10) * t, true);
    ctx.globalAlpha = 0.5 + 0.5 * t;
    ctx.fillStyle = '#e5484d';
    kruhNaZemi(ctx, p.x, p.y, POLOMER_KAMENE);
    ctx.restore();
  }
}

// Kameny v letu (nad nepřáteli, po oblouku) a střely Bludičky.
function utokyVeVzduchu(ctx, hra, naObrazovce) {
  for (const k of hra.kameny) {
    const t = Math.min(1, k.let / LET_KAMENE);
    const od = naObrazovce({ x: k.odX, y: k.odY });
    const kam = naObrazovce(k);
    const x = od.x + (kam.x - od.x) * t;
    const y = od.y + (kam.y - od.y) * t - Math.sin(Math.PI * t) * VYSKA_HODU;
    sprite(ctx, sprity.kamen, x, y);
  }
  for (const st of hra.strelyBossu) {
    const p = naObrazovce(st);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const r = POLOMER_STRELY_BOSSU;
    // Střela vrácená zrcadlem je stříbrná a táhne za sebou dva menší odlesky.
    const barvy = st.odrazena
      ? { zar: 'rgba(228,246,243,0.3)', telo: '#c9ccd2', jadro: '#ffffff' }
      : { zar: 'rgba(127,156,240,0.25)', telo: '#7f9cf0', jadro: '#dfe8ff' };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = barvy.zar;
    ctx.fillRect(x - r - 4, y - r - 4, 2 * r + 8, 2 * r + 8);
    if (st.odrazena) {
      const rychlost = Math.hypot(st.vx, st.vy) || 1;
      for (const [zpet, velikost] of [[9, 3], [17, 2]]) {
        ctx.fillRect(Math.round(x - (st.vx / rychlost) * zpet - velikost), Math.round(y - (st.vy / rychlost) * zpet - velikost), velikost * 2, velikost * 2);
      }
    }
    ctx.restore();
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2);
    ctx.fillStyle = barvy.telo;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = barvy.jadro;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
}

// Kolik životů ukazuje světlý úbytek v pruhu bosse. Počítá se z času hry, takže v pauze stojí.
const ubytky = new WeakMap();
function ubytek(n, cas) {
  let u = ubytky.get(n);
  if (!u) {
    u = { hp: n.hp, posledni: n.hp, zasah: cas, cas };
    ubytky.set(n, u);
  }
  const hp = Math.max(0, n.hp);
  if (hp < u.posledni) u.zasah = cas;
  u.posledni = hp;
  if (hp > u.hp) u.hp = hp;
  else if (cas - u.zasah > DRZENI_UBYTKU) u.hp = Math.max(hp, u.hp - n.maxHp * RYCHLOST_UBYTKU * Math.max(0, cas - u.cas));
  u.cas = cas;
  return u.hp;
}

// Text se stínem pod sebou (jako nápisy při příchodu).
function napis(ctx, text, x, y, barva) {
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + 1, y + 2);
  ctx.fillStyle = barva;
  ctx.fillText(text, x, y);
}

// Velký pruh bosse: vlevo portrét se spritem, nad pruhem jméno a životy, pruh s dílky po desetinách.
function bossBar(ctx, bar, x, y, sirka, cas) {
  const barvy = BARVY_BOSSU[bar.druh] ?? BARVY_BOSSU.strazce;
  // portrét: tmavý obrys, rámeček v barvě bosse, uvnitř sprite dvakrát zvětšený
  ctx.fillStyle = '#0b0a0f';
  ctx.fillRect(x, y, PORTRET, PORTRET);
  ctx.fillStyle = barvy.tmava;
  ctx.fillRect(x + 2, y + 2, PORTRET - 4, PORTRET - 4);
  ctx.fillStyle = '#17151d';
  ctx.fillRect(x + 4, y + 4, PORTRET - 8, PORTRET - 8);
  const obr = sprity[bar.druh] ?? sprity.strazce;
  const v = Math.min(PORTRET - 6, obr.width * 2);
  ctx.drawImage(obr, Math.round(x + (PORTRET - v) / 2), Math.round(y + (PORTRET - v) / 2), v, v);

  const px = x + PORTRET + 8;
  const ps = sirka - PORTRET - 8;
  ctx.font = 'bold 14px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  napis(ctx, bar.nazev.toUpperCase(), px, y + 13, barvy.text);
  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  napis(ctx, `${Math.ceil(bar.hp)} / ${bar.maxHp}`, x + sirka, y + 13, '#ece6da');

  const py = y + 20;
  const pv = 18;
  ctx.fillStyle = '#0b0a0f';
  ctx.fillRect(px, py, ps, pv);
  ctx.fillStyle = barvy.tmava;
  ctx.fillRect(px + 2, py + 2, ps - 4, pv - 4);
  ctx.fillStyle = '#1d1b24';
  ctx.fillRect(px + 4, py + 4, ps - 8, pv - 8);
  const vnitrek = ps - 8;
  const zbyva = Math.round(vnitrek * Math.max(0, Math.min(1, bar.hp / bar.maxHp)));
  const drzi = Math.round(vnitrek * Math.max(0, Math.min(1, ubytek(bar.nepritel, cas) / bar.maxHp)));
  if (drzi > zbyva) {
    ctx.fillStyle = '#f3efe6';
    ctx.fillRect(px + 4 + zbyva, py + 4, drzi - zbyva, pv - 8);
  }
  ctx.fillStyle = barvy.pruh;
  ctx.fillRect(px + 4, py + 4, zbyva, pv - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(px + 4, py + 4, zbyva, 3);
  ctx.fillStyle = 'rgba(11,10,15,0.45)';
  for (let i = 1; i < 10; i++) ctx.fillRect(px + 4 + Math.round((vnitrek * i) / 10), py + 4, 1, pv - 8);
}

export function kresli(ctx, hra) {
  const { width: sirka, height: vyska } = ctx.canvas;
  const { hrdina } = hra;
  // Po zásahu hrdiny se celý svět krátce otřese, slábne k nule. V pauze a ve volbě stojí.
  const bezi = !hra.pauza && !hra.volby && !hra.konec;
  const tres = bezi ? (hra.tres / TRVANI_TRESU) * SILA_TRESU : 0;
  const kx = hrdina.x - sirka / 2 + (tres ? Math.round((Math.random() * 2 - 1) * tres) : 0);
  const ky = hrdina.y - vyska / 2 + (tres ? Math.round((Math.random() * 2 - 1) * tres) : 0);
  const naObrazovce = (o) => ({ x: o.x - kx, y: o.y - ky });
  const s = staty(hra);

  ctx.imageSmoothingEnabled = false;
  podlaha(ctx, kx, ky, sirka, vyska);

  const stred = naObrazovce(hrdina);
  const lucerna = hra.zbrane.lucerna ? poziceLucerny(hra, stred) : null;
  if (lucerna) {
    svetloLucerny(ctx, stred.x, stred.y, s.lucerna.dosah, hra.cas);
    // malá záře kolem samotné lucerny
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,170,70,0.12)';
    for (const r of [4, 2]) {
      for (const [b, sirka] of pixelovyKruh(r).radky) ctx.fillRect(lucerna.x - 1 - sirka * MERITKO, lucerna.y - 1 + b * MERITKO, (2 * sirka + 1) * MERITKO, MERITKO);
    }
    ctx.restore();
  }

  // bedny a sudy stojí na zemi pod krystaly, které z nich vypadnou
  for (const b of hra.bedny ?? []) {
    const p = naObrazovce(b);
    if (p.x < -30 || p.y < -30 || p.x > sirka + 30 || p.y > vyska + 30) continue;
    sprite(ctx, sprity[b.druh], p.x, p.y);
  }

  for (const kr of hra.krystaly) {
    const p = naObrazovce(kr);
    ctx.drawImage(sprity.krystal, Math.round(p.x - 10), Math.round(p.y - 10), 20, 20);
  }

  for (const pr of hra.predmety) {
    const p = naObrazovce(pr);
    const houpani = Math.sin(hra.cas * 4 + pr.x) * 2;
    ctx.drawImage(sprity[pr.druh], Math.round(p.x - 13), Math.round(p.y - 13 + houpani), 26, 26);
  }

  for (const o of hra.oblaky) {
    const p = naObrazovce(o);
    if (p.x < -60 || p.y < -60 || p.x > sirka + 60 || p.y > vyska + 60) continue;
    oblak(ctx, p.x, p.y, o, hra.cas);
  }
  for (const t of hra.trny ?? []) {
    const p = naObrazovce(t);
    if (p.x < -60 || p.y < -60 || p.x > sirka + 60 || p.y > vyska + 60) continue;
    trsTrnu(ctx, t, p.x, p.y);
  }
  utokyNaZemi(ctx, hra, naObrazovce);

  for (const n of hra.nepratele) {
    const p = naObrazovce(n);
    if (p.x < -40 || p.y < -40 || p.x > sirka + 40 || p.y > vyska + 40) continue;
    const obr = sprity[n.druh];
    const velikost = obr.width * MERITKO;
    if (n.duch) {
      // duch se vznáší a kouká tam, kam letí (ne na hrdinu, letí kolem něj)
      ctx.globalAlpha = pruhlednostDucha(n);
      const vy = p.y + Math.sin(hra.cas * 4 + n.maxHp + n.x * 0.01) * 2;
      sprite(ctx, obr, p.x, vy, n.smerX < 0 ? -1 : 1, n.zasazen > 0 ? 'rgba(255,255,255,0.7)' : null, velikost);
      if (n.zar > 0) rozzar(ctx, obr, p.x, vy, n.smerX < 0 ? -1 : 1, velikost, n.zar / TRVANI_ZARU);
      ctx.globalAlpha = 1;
      if (n.trny > 0 && !n.skryty) sponaTrnu(ctx, n, p.x, vy, velikost);
      continue;
    }
    let { x, y } = p;
    if (n.druh === 'strazce' && n.naprah > 0) x += Math.floor(hra.cas * 30) % 2 ? 1 : -1;
    if (n.druh === 'bludicka') {
      // Bludička se vznáší, mihotá a po přenesení se teprve zhmotní. Při nabíjení kolem ní roste záře.
      y += Math.round(Math.sin(hra.cas * 3) * 3);
      ctx.globalAlpha = (0.82 + 0.18 * Math.sin(hra.cas * 17)) * (1 - n.zjeveni / ZJEVENI_BLUDICKY);
      if (n.nabiji > 0) {
        const t = 1 - n.nabiji / NABITI_BLUDICKY;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(127,156,240,${(0.12 + 0.25 * t).toFixed(3)})`;
        kruhNaZemi(ctx, x, y, 18 + 16 * t, true);
        ctx.restore();
      }
    }
    sprite(ctx, obr, x, y, n.x > hrdina.x ? -1 : 1, n.zasazen > 0 ? 'rgba(255,255,255,0.7)' : null, velikost);
    if (n.zar > 0) rozzar(ctx, obr, x, y, n.x > hrdina.x ? -1 : 1, velikost, n.zar / TRVANI_ZARU);
    ctx.globalAlpha = 1;
    if (n.trny > 0) sponaTrnu(ctx, n, x, y, velikost);
    if (n.boss) {
      const nad = Math.round(y - velikost / 2 - 7);
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(Math.round(x - 25), nad - 1, 50, 7);
      ctx.fillStyle = '#2a0f14';
      ctx.fillRect(Math.round(x - 24), nad, 48, 5);
      ctx.fillStyle = (BARVY_BOSSU[n.druh] ?? BARVY_BOSSU.strazce).pruh;
      ctx.fillRect(Math.round(x - 24), nad, Math.round(48 * Math.max(0, n.hp) / n.maxHp), 5);
    }
  }

  // úlomky zabitých nepřátel: čtvereček o velikosti pixelu spritu s tmavým obrysem
  for (const c of hra.castice) {
    const p = naObrazovce(c);
    if (p.x < -10 || p.y < -10 || p.x > sirka + 10 || p.y > vyska + 10) continue;
    const barvy = BARVY_CASTIC[c.druh] ?? BARVY_CASTIC.netopyr;
    const x = Math.round(p.x - MERITKO / 2);
    const y = Math.round(p.y - MERITKO / 2);
    ctx.globalAlpha = Math.min(1, c.zivot * 5);
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(x - 1, y - 1, MERITKO + 2, MERITKO + 2);
    ctx.fillStyle = barvy[c.odstin % barvy.length];
    ctx.fillRect(x, y, MERITKO, MERITKO);
  }
  ctx.globalAlpha = 1;

  utokyVeVzduchu(ctx, hra, naObrazovce);

  ctx.fillStyle = '#ffd27a';
  for (const st of hra.strely) {
    const p = naObrazovce(st);
    ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 3), 6, 6);
  }

  // blesky: lomená čára mezi zasaženými, náhodné zuby se mění každý snímek
  for (const bl of hra.blesky) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, bl.zivot / 0.18);
    for (const [barva, sirkaCary] of [['rgba(143,211,255,0.5)', 6], ['#e8f7ff', 2]]) {
      ctx.strokeStyle = barva;
      ctx.lineWidth = sirkaCary;
      ctx.beginPath();
      bl.body.forEach((bod, i) => {
        const p = naObrazovce(bod);
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
          return;
        }
        const pred = naObrazovce(bl.body[i - 1]);
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          ctx.lineTo(pred.x + (p.x - pred.x) * t + (Math.random() - 0.5) * 14, pred.y + (p.y - pred.y) * t + (Math.random() - 0.5) * 14);
        }
        ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  if (hra.zbrane.krumpace) {
    for (let i = 0; i < s.krumpace.pocet; i++) {
      const uhel = hra.uhelKrumpacu + (i / s.krumpace.pocet) * Math.PI * 2;
      ctx.save();
      ctx.translate(stred.x + Math.cos(uhel) * s.krumpace.polomer, stred.y + Math.sin(uhel) * s.krumpace.polomer);
      ctx.rotate(uhel * 2);
      const v = sprity.krumpac.width * MERITKO;
      ctx.drawImage(sprity.krumpac, -v / 2, -v / 2, v, v);
      ctx.restore();
    }
  }
  if (hra.zbrane.zrcadlo) zrcadlaHrdiny(ctx, hra, s, stred);
  for (const o of hra.odlesky ?? []) {
    const p = naObrazovce(o);
    odlesk(ctx, p.x, p.y, o);
  }

  // Oživení: od hrdiny se rozběhne modrobílý kruh duší a bledne.
  if (hra.zablesk > 0) {
    const t = 1 - hra.zablesk / TRVANI_ZABLESKU;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    for (const [barva, sirkaCary] of [['rgba(127,156,240,0.6)', 8], ['#dfe8ff', 3]]) {
      ctx.strokeStyle = barva;
      ctx.lineWidth = sirkaCary;
      ctx.beginPath();
      ctx.arc(stred.x, stred.y, 16 + t * ODHOZENI_PRI_OZIVENI, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Bomba: od hrdiny se přes celou obrazovku rozběhne ohnivý kruh a všechno krátce zbělá.
  if (hra.vybuch > 0) {
    const t = 1 - hra.vybuch / TRVANI_VYBUCHU;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = 'rgba(255,240,200,0.35)';
    ctx.fillRect(0, 0, sirka, vyska);
    for (const [barva, sirkaCary] of [['rgba(255,140,50,0.55)', 14], ['#fff3b0', 4]]) {
      ctx.strokeStyle = barva;
      ctx.lineWidth = sirkaCary;
      ctx.beginPath();
      ctx.arc(stred.x, stred.y, 20 + t * Math.hypot(sirka, vyska) / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const blika = hrdina.nezranitelny > 0 && Math.floor(hrdina.nezranitelny * 20) % 2 === 0;
  const obrHrdiny = sprity[hra.trida] ?? sprity[VYCHOZI_TRIDA];
  if (!blika) sprite(ctx, obrHrdiny, stred.x, stred.y, hrdina.otoceny, hrdina.sit > 0 ? 'rgba(215,222,236,0.5)' : null);
  if (lucerna && !blika) {
    // plamen v lucerně nepravidelně poskakuje (dva snímky)
    const obr = (Math.floor(hra.cas * 7) * 5) % 3 === 0 ? sprity.lucernaHrdiny2 : sprity.lucernaHrdiny;
    ctx.drawImage(obr, lucerna.x - Math.round(obr.width * MERITKO / 2), lucerna.y - Math.round(obr.height * MERITKO / 2), obr.width * MERITKO, obr.height * MERITKO);
  }
  if (hrdina.sit > 0) sit(ctx, stred.x, stred.y, hrdina.sit);

  // životy pod hrdinou
  ctx.fillStyle = '#2a0f14';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 18), 28, 4);
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 18), Math.round(28 * Math.max(0, hrdina.hp) / hrdina.maxHp), 4);

  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  for (const c of hra.cisla) {
    const p = naObrazovce(c);
    const pruhlednost = Math.min(1, c.zivot * 2);
    const barva = { leceni: '120,230,140', jed: '214,169,242', zlato: '242,201,76' }[c.barva] ?? '255,240,200';
    ctx.fillStyle = `rgba(${barva},${pruhlednost})`;
    ctx.fillText(c.text, p.x, p.y);
  }

  // šipka k bossovi, když je mimo obrazovku
  for (const n of hra.nepratele) {
    if (!n.boss) continue;
    const p = naObrazovce(n);
    if (p.x > 0 && p.y > 0 && p.x < sirka && p.y < vyska) continue;
    const uhel = Math.atan2(p.y - vyska / 2, p.x - sirka / 2);
    const r = Math.min(sirka, vyska) / 2 - 40;
    ctx.save();
    ctx.translate(sirka / 2 + Math.cos(uhel) * r, vyska / 2 + Math.sin(uhel) * r);
    ctx.rotate(uhel);
    ctx.fillStyle = (BARVY_BOSSU[n.druh] ?? BARVY_BOSSU.strazce).pruh;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ztmavení u okrajů, ať je hrdina uprostřed vidět nejlíp
  const tma = ctx.createRadialGradient(sirka / 2, vyska / 2, Math.min(sirka, vyska) * 0.4, sirka / 2, vyska / 2, Math.max(sirka, vyska) * 0.8);
  tma.addColorStop(0, 'rgba(0,0,0,0)');
  tma.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = tma;
  ctx.fillRect(0, 0, sirka, vyska);

  // pruhy bossů nahoře, pod sebou v pořadí, jak přišli
  const bary = bossBary(hra);
  const sirkaBaru = Math.min(640, sirka - 32);
  bary.forEach((bar, i) => bossBar(ctx, bar, Math.round((sirka - sirkaBaru) / 2), HORNI_BARY + i * VYSKA_BARU, sirkaBaru, hra.cas));

  if (hra.oznameni) {
    // nápis je pod pruhy bossů, ať je nepřekryje
    const yNapisu = Math.max(90, HORNI_BARY + bary.length * VYSKA_BARU + 26);
    ctx.save();
    ctx.globalAlpha = Math.min(1, hra.oznameni.zivot);
    // na úzké obrazovce se písmo zmenší, ať se nápis vejde celý
    ctx.font = 'bold 22px ui-monospace, Menlo, monospace';
    const sirkaNapisu = ctx.measureText(hra.oznameni.text).width;
    if (sirkaNapisu > sirka - 24) ctx.font = `bold ${Math.max(11, Math.floor((22 * (sirka - 24)) / sirkaNapisu))}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(hra.oznameni.text, sirka / 2 + 2, yNapisu + 2);
    ctx.fillStyle = '#e9c46a';
    ctx.fillText(hra.oznameni.text, sirka / 2, yNapisu);
    ctx.restore();
  }
}

// Pozadí hlavního menu: louka pomalu ujíždí, dole přes ni utíká hrdina (zvolená třída) před hloučkem
// nepřátel a nahoře přelétají netopýři. Všechno je jen podle času, nic se nepočítá ani neukládá.
const HONICKA = ['vlk', 'netopyr', 'slizak', 'vlk', 'pavouk', 'houbak', 'kostlivec', 'netopyr'];

export function kresliMenu(ctx, cas, postava = VYCHOZI_TRIDA) {
  const { width: sirka, height: vyska } = ctx.canvas;
  ctx.imageSmoothingEnabled = false;
  podlaha(ctx, cas * 12, 0, sirka, vyska);

  const draha = sirka + 600;
  const hx = ((cas * 64) % draha) - 100;
  const y = vyska * 0.82;
  sprite(ctx, sprity[postava] ?? sprity[VYCHOZI_TRIDA], hx, y + Math.round(Math.sin(cas * 12) * 1.5), 1);
  HONICKA.forEach((druh, i) => {
    const letec = druh === 'netopyr';
    const vlna = Math.sin(cas * (letec ? 9 : 5) + i * 1.7) * (letec ? 6 : 2);
    sprite(ctx, sprity[druh], hx - 70 - i * 42, y + (i % 2 ? -14 : 12) + vlna, 1);
  });
  for (let i = 0; i < 4; i++) {
    const x = sirka + 60 - ((cas * (50 + i * 9) + i * 330) % (sirka + 120));
    sprite(ctx, sprity.netopyr, x, vyska * (0.1 + i * 0.07) + Math.sin(cas * 7 + i) * 8, -1);
  }

  // ztmavení, ať jsou logo a tlačítka dobře čitelné
  ctx.fillStyle = 'rgba(11,10,15,0.35)';
  ctx.fillRect(0, 0, sirka, vyska);
  const tma = ctx.createRadialGradient(sirka / 2, vyska / 2, Math.min(sirka, vyska) * 0.3, sirka / 2, vyska / 2, Math.max(sirka, vyska) * 0.75);
  tma.addColorStop(0, 'rgba(0,0,0,0)');
  tma.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = tma;
  ctx.fillRect(0, 0, sirka, vyska);
}
