// Ikony aplikace (plocha telefonu, instalace PWA, záložka prohlížeče) jako pixel art, stejně jako sprity a rámy:
// Havíř ze src/sprity.js s obrysem jako ve hře na tmavých prknech a v dřevěném rámu okna z nastroje/ramy.mjs.
// Skript je zapíše jako PNG do ikony/ vlastním malým kodérem (node:zlib, žádná knihovna) a každý pixel kresby je
// celý čtverec, takže ikona zůstane ostrá. Spouštět po změně kresby: node nastroje/ikony.mjs (pak verze.mjs)
//   ikona-192.png, ikona-512.png   obyčejné ikony (rám okna, prkna, Havíř)
//   ikona-maska-512.png            „maskable“: prkna přes celý čtverec, Havíř v bezpečném kruhu (telefon ořízne)
//   ikona-apple-180.png            plocha iPhonu (iOS si rohy zaoblí sám, průhlednost nebere)
//   ikona-32.png                   záložka prohlížeče (jen Havíř s obrysem, průhledné pozadí)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { OBRAZKY, PALETA as PALETA_RAMU } from './ramy.mjs';

// src/sprity.js kreslí na canvas, takže se v Node načíst nedá: paleta a řádky spritu se přečtou z textu.
const zdroj = readFileSync(new URL('../src/sprity.js', import.meta.url), 'utf8');
const PALETA_SPRITU = Object.fromEntries(
  [...zdroj.match(/const PALETA = \{([\s\S]*?)\};/)[1].matchAll(/(\w): '(#[0-9a-f]{6})'/gi)].map((m) => [m[1], m[2]]),
);
const OBRYS_SPRITU = '#0b0a0f'; // stejný obrys jako sprity ve hře (sprity.js, nakresli)

export function radkySpritu(jmeno) {
  const m = zdroj.match(new RegExp(`^ {2}${jmeno}: \\[\\n([\\s\\S]*?)\\n {2}\\],`, 'm'));
  if (!m) throw new Error(`sprite ${jmeno} v src/sprity.js není`);
  return [...m[1].matchAll(/'([^']*)'/g)].map((r) => r[1]);
}

// Plátno = čtverec n×n barev (null = průhledná).
const platno = (n) => Array.from({ length: n }, () => Array(n).fill(null));

// Prkna z desky oken (DESKA se opakuje), posunutá, ať spára nevede přes střed.
function prkna(p, posunX = 0, posunY = 0) {
  const deska = OBRAZKY.deska;
  p.forEach((radek, y) => radek.forEach((_, x) => {
    const r = deska[(y + posunY) % deska.length];
    radek[x] = PALETA_RAMU[r[(x + posunX) % r.length]];
  }));
}

// Rám okna (RAM_DREVO) roztažený jako 9-slice: rohy 6×6 s mosazným plíškem zůstanou, hrany se opakují.
function ram(p) {
  const r = OBRAZKY['ram-drevo'];
  const n = p.length;
  const roh = 6;
  const hrana = r.length - 2 * roh;
  const zdrojovy = (i) => (i < roh ? i : i >= n - roh ? r.length - (n - i) : roh + ((i - roh) % hrana));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const z = r[zdrojovy(y)][zdrojovy(x)];
      if (z !== '.') p[y][x] = PALETA_RAMU[z];
    }
  }
}

// Světlo lucerny za Havířem: dva stupně světlejšího dřeva v kruhu po celých bodech (žádná rozmazaná záře).
const SVETLO = ['#3d2717', '#4a2f1a'];
function svetlo(p, cx, cy, polomer) {
  for (let y = 0; y < p.length; y++) {
    for (let x = 0; x < p.length; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < polomer) p[y][x] = SVETLO[d < polomer * 0.72 ? 1 : 0];
    }
  }
}

// Sprite s obrysem (4 sousedé jako ve hře), každý pixel spritu = meritko × meritko bodů, levý horní roh obrysu
// v (x0, y0).
function nakresliSprite(p, radky, x0, y0, meritko) {
  const plne = new Set();
  radky.forEach((r, y) => [...r].forEach((z, x) => { if (z !== '.') plne.add(`${x},${y}`); }));
  const bod = (sx, sy, barva) => {
    for (let dy = 0; dy < meritko; dy++) {
      for (let dx = 0; dx < meritko; dx++) p[y0 + (sy + 1) * meritko + dy][x0 + (sx + 1) * meritko + dx] = barva;
    }
  };
  for (const b of plne) {
    const [x, y] = b.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!plne.has(`${x + dx},${y + dy}`)) bod(x + dx, y + dy, OBRYS_SPRITU);
  }
  radky.forEach((r, y) => [...r].forEach((z, x) => { if (z !== '.') bod(x, y, PALETA_SPRITU[z]); }));
}

// Kresby ikon v bodech kresby. Havíř má 8×8, s obrysem 10×10.
const HRDINA = 'havir';
export const KRESBY = {
  // Okno: rám 6 bodů, uvnitř prkna a Havíř dvakrát zvětšený (20×20) přesně do vnitřku rámu.
  okno() {
    const p = platno(32);
    prkna(p, 5, 3);
    svetlo(p, 16, 16, 11);
    ram(p);
    nakresliSprite(p, radkySpritu(HRDINA), 6, 5, 2);
    return p;
  },
  // Maskovatelná: prkna do krajů, Havíř 20×20 uprostřed (bezpečný kruh má poloměr 40 % = 12,8 bodu).
  maska() {
    const p = platno(32);
    prkna(p, 5, 3);
    svetlo(p, 16, 15, 12.5);
    nakresliSprite(p, radkySpritu(HRDINA), 6, 5, 2);
    return p;
  },
  // iPhone: jako maskovatelná, jen s větším okrajem (rohy si zaoblí sám).
  apple() {
    const p = platno(36);
    prkna(p, 3, 1);
    svetlo(p, 18, 17, 13);
    nakresliSprite(p, radkySpritu(HRDINA), 8, 7, 2);
    return p;
  },
  // Záložka: jen Havíř s obrysem, 10×10 bodů po 3 px = 30 px uprostřed 32 px.
  zalozka() {
    const p = platno(10);
    nakresliSprite(p, radkySpritu(HRDINA), 0, 0, 1);
    return p;
  },
};

export const IKONY = [
  { soubor: 'ikona-192.png', kresba: 'okno', velikost: 192 },
  { soubor: 'ikona-512.png', kresba: 'okno', velikost: 512 },
  { soubor: 'ikona-maska-512.png', kresba: 'maska', velikost: 512 },
  { soubor: 'ikona-apple-180.png', kresba: 'apple', velikost: 180 },
  { soubor: 'ikona-32.png', kresba: 'zalozka', velikost: 32 },
];

// Kresba zvětšená celým násobkem (nejvíc, kolik se vejde) a vycentrovaná v čtverci velikost × velikost.
export function obrazek(kresba, velikost) {
  const n = kresba.length;
  const meritko = Math.floor(velikost / n);
  if (meritko < 1) throw new Error(`kresba ${n}×${n} se do ${velikost} px nevejde`);
  const okraj = Math.floor((velikost - n * meritko) / 2);
  const data = Buffer.alloc(velikost * velikost * 4);
  for (let y = 0; y < n * meritko; y++) {
    for (let x = 0; x < n * meritko; x++) {
      const barva = kresba[Math.floor(y / meritko)][Math.floor(x / meritko)];
      if (!barva) continue;
      const i = ((y + okraj) * velikost + x + okraj) * 4;
      data.writeUInt32BE((parseInt(barva.slice(1), 16) << 8 | 0xff) >>> 0, i);
    }
  }
  return data;
}

// PNG: podpis, IHDR (RGBA 8 bitů), IDAT (každý řádek s filtrem 0, zlib) a IEND, každý blok s CRC.
export function png(rgba, sirka, vyska) {
  const blok = (typ, obsah) => {
    const delka = Buffer.alloc(4);
    delka.writeUInt32BE(obsah.length);
    const typObsah = Buffer.concat([Buffer.from(typ, 'ascii'), obsah]);
    const soucet = Buffer.alloc(4);
    soucet.writeUInt32BE(crc32(typObsah));
    return Buffer.concat([delka, typObsah, soucet]);
  };
  const hlavicka = Buffer.alloc(13);
  hlavicka.writeUInt32BE(sirka, 0);
  hlavicka.writeUInt32BE(vyska, 4);
  hlavicka.set([8, 6, 0, 0, 0], 8);
  const radky = Buffer.alloc((sirka * 4 + 1) * vyska);
  for (let y = 0; y < vyska; y++) rgba.copy(radky, y * (sirka * 4 + 1) + 1, y * sirka * 4, (y + 1) * sirka * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blok('IHDR', hlavicka), blok('IDAT', deflateSync(radky, { level: 9 })), blok('IEND', Buffer.alloc(0)),
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync('ikony', { recursive: true });
  for (const { soubor, kresba, velikost } of IKONY) {
    writeFileSync(`ikony/${soubor}`, png(obrazek(KRESBY[kresba](), velikost), velikost, velikost));
  }
  console.log(`ikony: ${IKONY.map((i) => i.soubor).join(', ')}`);
}
