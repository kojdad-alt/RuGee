// Vzory režimu pro barvoslepé na plátně (data a barvy jsou v barvy.js): šikmé pruhy varování bossů, puntíky jedu
// a vzory zvláštních ploch (láva, bahno, led). Pruhy a puntíky drží ke světu (s kamerou se neposouvají po zemi),
// pixel vzoru je stejný jako pixel spritů. Jen v prohlížeči (kreslí se do canvasu).
import { VZORY_PLOCH, BARVY_VZORU_PLOCH, KRESBY_ZNAKU, BARVY_ZNAKU, barvyVzoru, rezimBarev } from './barvy.js';

const PIXEL = 3;

function platno(sirka, vyska) {
  const c = document.createElement('canvas');
  c.width = sirka;
  c.height = vyska;
  return c;
}

// Kresba z textu (znak = barva z palety, tečka = průhledná) v pixelu k.
function kresba(radky, paleta, k = 1) {
  const c = platno(radky[0].length * k, radky.length * k);
  const g = c.getContext('2d');
  radky.forEach((radek, y) => [...radek].forEach((z, x) => {
    if (!paleta[z]) return;
    g.fillStyle = paleta[z];
    g.fillRect(x * k, y * k, k, k);
  }));
  return c;
}

// Vzor plochy 16×16 (láva, bahno, led), kreslí se přes dlaždici plochy ve stejném měřítku jako dlaždice.
const plochy = new Map();
export function vzorPlochy(druh) {
  if (!VZORY_PLOCH[druh]) return null;
  if (!plochy.has(druh)) plochy.set(druh, kresba(VZORY_PLOCH[druh], BARVY_VZORU_PLOCH[druh]));
  return plochy.get(druh);
}

// Dlaždice nebezpečí: pruhy = šikmé pruhy po dvou pixelech (světlý a tmavý), puntíky = tmavý puntík se světlým
// odleskem na šachovnici. Jedna dlaždice na režim.
const dlazdice = new Map();
function dlazdiceNebezpeci(druh) {
  const rezim = rezimBarev();
  const klic = `${druh}|${rezim}`;
  if (dlazdice.has(klic)) return dlazdice.get(klic);
  const { pruh, tma, jed } = barvyVzoru(rezim);
  let c;
  if (druh === 'pruhy') {
    const radky = Array.from({ length: 4 }, (_, y) => Array.from({ length: 4 }, (_, x) => ((x + y) % 4 < 2 ? 'S' : 'T')).join(''));
    c = kresba(radky, { S: pruh, T: tma }, PIXEL);
  } else {
    c = kresba([
      'TT....',
      'TS....',
      '......',
      '...TT.',
      '...TS.',
      '......',
    ], { T: tma, S: jed }, PIXEL);
  }
  dlazdice.set(klic, c);
  return c;
}

// Vzor pro fillStyle: posunutý o kameru (kx, ky), ať se pruhy hýbou se zemí.
export function vzorNebezpeci(ctx, druh, kx = 0, ky = 0) {
  const vzor = ctx.createPattern(dlazdiceNebezpeci(druh), 'repeat');
  const posun = dlazdiceNebezpeci(druh).width;
  vzor?.setTransform?.(new DOMMatrix([1, 0, 0, 1, -(((kx % posun) + posun) % posun), -(((ky % posun) + posun) % posun)]));
  return vzor;
}

// Značka rarity pro plátno (cedulka kusu z truhly) v pixelu k.
const znaky = new Map();
export function znakRarity(tvar, k = 2) {
  const klic = `${tvar}|${k}`;
  if (!KRESBY_ZNAKU[tvar]) return null;
  if (!znaky.has(klic)) znaky.set(klic, kresba(KRESBY_ZNAKU[tvar], BARVY_ZNAKU, k));
  return znaky.get(klic);
}

// Ukázka vzoru do Nastavení: dlaždice vzoru přes podklad v barvě, jakou má ve hře.
const PODKLADY = { varovani: '#4a7a3a', jed: '#5fae4e', lava: '#ff7a2f', bahno: '#5a4a2a', led: '#bfe3f2' };
export function ukazkaVzoru(druh, sirka = 48, vyska = 24) {
  const c = platno(sirka, vyska);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = PODKLADY[druh] ?? '#3d2717';
  g.fillRect(0, 0, sirka, vyska);
  if (druh === 'varovani' || druh === 'jed') {
    g.globalAlpha = druh === 'varovani' ? 0.75 : 0.85;
    g.fillStyle = g.createPattern(dlazdiceNebezpeci(druh === 'varovani' ? 'pruhy' : 'puntiky'), 'repeat');
    g.fillRect(0, 0, sirka, vyska);
  } else {
    const v = vzorPlochy(druh);
    for (let x = 0; x < sirka; x += 48) for (let y = 0; y < vyska; y += 48) g.drawImage(v, x, y, 48, 48);
  }
  return c;
}
