// Podlaha map (soubor se jmenuje po louce, která byla první): z dat v mapy.js vygeneruje dlaždice 16×16 pixelů
// se semínkem, aby vypadaly pořád stejně, ozdoby (jen se kreslí a ničemu nebrání), překážky a zvláštní plochu
// (led, láva, bahno) s okrajem z okolní země. Kreslí podlahu do hry i malý náhled mapy do menu.
import { vytvorRng } from './rng.js';
import { MAPY, VELIKOST_DLAZDICE, hash, dlazdicePlochy, plochaMapy, prekazkaNaDlazdici } from './mapy.js';
import { sprity } from './sprity.js';
import { barvoslepy } from './barvy.js';
import { vzorPlochy } from './vzory.js';

const P = 16;

function platno(sirka = P, vyska = P) {
  const c = document.createElement('canvas');
  c.width = sirka;
  c.height = vyska;
  return c;
}

// Podklad dlaždice: jeden odstín a na něm nasypané tečky (na louce stébla, v jeskyni štěrk, na sněhu třpyt).
function podklad(rng, odstin, p) {
  const c = platno();
  const g = c.getContext('2d');
  g.fillStyle = p.podklad[odstin % p.podklad.length];
  g.fillRect(0, 0, P, P);
  const { pocet, sirka, vyska, svetla, tmava, svetlych } = p.tecky;
  for (let i = 0; i < pocet; i++) {
    const x = rng.cele(0, P - sirka);
    const y = rng.cele(vyska - 1, P - 1);
    g.fillStyle = rng.dalsi() < svetlych ? svetla : tmava;
    g.fillRect(x, y - (vyska - 1), sirka, vyska);
  }
  return { c, g };
}

// Kresby vzácných dlaždic: dostanou kontext dlaždice, náhodu a svůj záznam z dat (barvy).
const KRESBY = {
  kvetiny(g, rng, d) {
    for (let i = 0; i < rng.cele(2, 3); i++) {
      const x = rng.cele(2, P - 3);
      const y = rng.cele(2, P - 3);
      g.fillStyle = d.barva;
      g.fillRect(x - 1, y, 3, 1);
      g.fillRect(x, y - 1, 1, 3);
      g.fillStyle = d.stred;
      g.fillRect(x, y, 1, 1);
    }
  },
  kameny(g, rng, d) {
    const [stin, kamen, lesk] = d.barvy;
    for (let i = 0; i < rng.cele(1, 2); i++) {
      const x = rng.cele(2, P - 4);
      const y = rng.cele(2, P - 4);
      g.fillStyle = stin;
      g.fillRect(x, y + 2, 3, 1);
      g.fillStyle = kamen;
      g.fillRect(x, y, 3, 2);
      g.fillStyle = lesk;
      g.fillRect(x, y, 1, 1);
    }
  },
  hlina(g, rng, d) {
    const [tmava, svetla] = d.barvy;
    const x = rng.cele(2, 6);
    const y = rng.cele(2, 6);
    g.fillStyle = tmava;
    g.fillRect(x, y + 1, 8, 5);
    g.fillRect(x + 1, y, 6, 7);
    g.fillStyle = svetla;
    g.fillRect(x + 2, y + 2, 2, 1);
    g.fillRect(x + 5, y + 4, 1, 1);
  },
  // Lomená prasklina přes dlaždici, pod ní pixel lesku (hrana kamene nebo ledu).
  praskliny(g, rng, d) {
    let x = rng.cele(1, 4);
    let y = rng.cele(3, 12);
    for (let i = 0; i < 12 && x < P; i++) {
      g.fillStyle = d.barva;
      g.fillRect(x, y, 1, 1);
      g.fillStyle = d.lesk;
      g.fillRect(x, y + 1, 1, 1);
      x += 1;
      y = Math.max(1, Math.min(P - 3, y + rng.cele(-1, 1)));
    }
  },
  kaluz(g, rng, d) {
    const [tmava, voda, odlesk] = d.barvy;
    const x = rng.cele(2, 5);
    const y = rng.cele(3, 7);
    g.fillStyle = tmava;
    g.fillRect(x + 1, y, 8, 6);
    g.fillRect(x, y + 1, 10, 4);
    g.fillStyle = voda;
    g.fillRect(x + 1, y + 1, 8, 3);
    g.fillStyle = odlesk;
    g.fillRect(x + 2, y + 1, 3, 1);
    g.fillRect(x + 6, y + 3, 1, 1);
  },
  krystalky(g, rng, d) {
    const [tmava, krystal, svetla] = d.barvy;
    for (let i = 0; i < rng.cele(2, 3); i++) {
      const x = rng.cele(2, P - 3);
      const y = rng.cele(4, P - 2);
      const v = rng.cele(2, 3);
      g.fillStyle = tmava;
      g.fillRect(x - 1, y, 3, 1);
      g.fillStyle = krystal;
      g.fillRect(x, y - v, 1, v);
      g.fillStyle = svetla;
      g.fillRect(x, y - v, 1, 1);
    }
  },
  // Stopy ve sněhu: dvě řady otisků šikmo přes dlaždici.
  stopy(g, rng, d) {
    let x = rng.cele(1, 3);
    let y = rng.cele(10, 13);
    g.fillStyle = d.barva;
    for (let i = 0; i < 4; i++) {
      g.fillRect(x + (i % 2) * 2, y, 2, 1);
      x += 3;
      y -= 2 + rng.cele(0, 1);
      if (y < 1) break;
    }
  },
  travicky(g, rng, d) {
    for (let i = 0; i < rng.cele(2, 3); i++) {
      const x = rng.cele(2, P - 4);
      const y = rng.cele(4, P - 2);
      g.fillStyle = d.barvy[0];
      g.fillRect(x, y - 2, 1, 3);
      g.fillRect(x + 2, y - 1, 1, 2);
      g.fillStyle = d.barvy[1];
      g.fillRect(x + 1, y - 3, 1, 4);
    }
  },
  // Bublinky vzduchu zamrzlé v ledu: malé kroužky.
  bubliny(g, rng, d) {
    g.fillStyle = d.barva;
    for (let i = 0; i < rng.cele(3, 5); i++) {
      const x = rng.cele(2, P - 3);
      const y = rng.cele(2, P - 3);
      if (rng.dalsi() < 0.5) g.fillRect(x, y, 1, 1);
      else {
        g.fillRect(x, y - 1, 1, 1);
        g.fillRect(x - 1, y, 1, 1);
        g.fillRect(x + 1, y, 1, 1);
        g.fillRect(x, y + 1, 1, 1);
      }
    }
  },
  // Stín ryby pod ledem.
  ryba(g, rng, d) {
    const x = rng.cele(3, 8);
    const y = rng.cele(5, 10);
    g.fillStyle = d.barva;
    g.fillRect(x, y, 4, 2);
    g.fillRect(x + 1, y - 1, 2, 1);
    g.fillRect(x + 1, y + 2, 2, 1);
    g.fillRect(x + 4, y - 1, 1, 1);
    g.fillRect(x + 4, y + 2, 1, 1);
    g.fillRect(x + 5, y - 1, 1, 4);
  },
};

// Všechny dlaždice jedné podlahy (nejdřív obyčejné, pak vzácné), každá podlaha má svou náhodu.
function dlazdice(p) {
  const rng = vytvorRng(p.seminko);
  return [
    ...Array.from({ length: p.obycejnych }, (_, i) => podklad(rng, i, p).c),
    ...p.vzacne.map((d) => {
      const { c, g } = podklad(rng, d.odstin ?? 0, p);
      KRESBY[d.kresba](g, rng, d);
      return c;
    }),
  ];
}

// Ozdoba z textu. Znaky v zari se navíc nakreslí zvlášť (s bledou září kolem), ať je jde ukázat i ve tmě.
function ozdoba(kus, paleta) {
  const c = platno();
  const g = c.getContext('2d');
  const svetla = [];
  kus.radky.forEach((radek, y) => {
    [...radek].forEach((znak, x) => {
      if (znak === '.') return;
      g.fillStyle = paleta[znak];
      g.fillRect(x, y, 1, 1);
      if (kus.zari?.includes(znak)) svetla.push([x, y, paleta[znak]]);
    });
  });
  let zare = null;
  // barva = průměrná barva svítících pixelů (0–1), tou svítí ozdoba ve světlech (osvetleni.js)
  let barva = null;
  if (svetla.length) {
    barva = [0, 0, 0];
    for (const [, , hex] of svetla) {
      for (let k = 0; k < 3; k++) barva[k] += parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16) / 255 / svetla.length;
    }
    zare = platno();
    const z = zare.getContext('2d');
    z.globalAlpha = 0.35;
    for (const [x, y, barva] of svetla) {
      z.fillStyle = barva;
      z.fillRect(x - 1, y - 1, 3, 3);
    }
    z.globalAlpha = 1;
    for (const [x, y, barva] of svetla) {
      z.fillStyle = barva;
      z.fillRect(x, y, 1, 1);
    }
  }
  return { obr: c, zare, barva, kde: kus.kde ?? null };
}

// Okraj dlaždice zvláštní plochy ze strany, kde sousedí s obyčejnou zemí: zubatý pruh okolní země (sníh u ledu,
// skála u lávy, tráva u bahna) a pod ním čára (stín na ledu, žár lávy). Kreslí se pro horní stranu a otáčí na
// ostatní (pořadí: nahoře, vpravo, dole, vlevo).
function okrajePlochy(okraj, seminko) {
  const rng = vytvorRng(seminko);
  const horni = platno();
  const g = horni.getContext('2d');
  for (let x = 0; x < P; x++) {
    const hloubka = 1 + rng.cele(0, 2);
    g.fillStyle = okraj.hrana;
    g.fillRect(x, 0, 1, hloubka);
    g.fillStyle = okraj.stin;
    g.fillRect(x, hloubka, 1, 1);
  }
  return [0, 1, 2, 3].map((otoceni) => {
    const c = platno();
    const o = c.getContext('2d');
    o.translate(P / 2, P / 2);
    o.rotate((otoceni * Math.PI) / 2);
    o.drawImage(horni, -P / 2, -P / 2);
    return c;
  });
}

// Vzhled mapy se vygeneruje při prvním kreslení a pak se jen bere.
const vzhledy = new Map();
function vzhled(mapa) {
  if (!vzhledy.has(mapa)) {
    const m = MAPY[mapa];
    const sada = (p) => ({ dlazdice: dlazdice(p), obycejnych: p.obycejnych, vzacnych: p.vzacnych });
    const p = m.podlahaPlochy;
    const plocha = p ? { ...sada(p), okraje: okrajePlochy(p.okraj, p.seminko + 1) } : null;
    vzhledy.set(mapa, {
      ...sada(m.podlaha),
      plocha,
      hustota: m.ozdoby.hustota,
      ozdoby: m.ozdoby.kusy.map((kus) => ozdoba(kus, m.ozdoby.paleta)),
      prekazky: (m.prekazky?.kusy ?? []).map((kus) => ozdoba(kus, m.ozdoby.paleta)),
    });
  }
  return vzhledy.get(mapa);
}

const SOUSEDE = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Podlaha mapy od bodu (kx, ky) přes celé plátno, dlaždice velké velikost px. Nejdřív všechny dlaždice, pak
// ozdoby a překážky (ať je nepřekryje dlaždice vedle). Žhavá plocha (láva) pomalu pulzuje podle času cas.
// Vrací svítící ozdoby a překážky na obrazovce ({ obr, x, y, velikost, barva }), které se ve tmě kreslí ještě jednou
// přes ni. K poli jsou připsané žhavé dlaždice na obrazovce (zare.zhave = [px, py, h], zare.dlazdice = velikost),
// ze kterých svítí láva (svetla.js).
export function kresliPodlahu(ctx, mapa, kx, ky, sirka, vyska, velikost = VELIKOST_DLAZDICE, cas = 0) {
  const v = vzhled(mapa);
  const plocha = plochaMapy(mapa);
  const x0 = Math.floor(kx / velikost) - 1;
  const y0 = Math.floor(ky / velikost) - 1;
  const x1 = x0 + sirka / velikost + 3;
  const y1 = y0 + vyska / velikost + 3;
  const jePlocha = (tx, ty) => Boolean(plocha) && dlazdicePlochy(tx, ty, plocha.data);
  const naObrazovce = (tx, ty) => [Math.round(tx * velikost - kx), Math.round(ty * velikost - ky)];
  const zhave = [];
  // Režim pro barvoslepé: přes každou dlaždici plochy její vzor (láva praskliny, bahno vlnky, led jiskry).
  const vzor = plocha && barvoslepy() ? vzorPlochy(plocha.druh) : null;
  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const [px, py] = naObrazovce(tx, ty);
      const h = hash(tx, ty);
      const naPlose = jePlocha(tx, ty);
      const s = naPlose ? v.plocha : v;
      // Obyčejné dlaždice jsou nejčastější, vzácné (s kresbou) jen občas.
      const druh = h % 100 < 100 - s.vzacnych ? h % s.obycejnych : s.obycejnych + (h >>> 8) % (s.dlazdice.length - s.obycejnych);
      ctx.drawImage(s.dlazdice[druh], px, py, velikost, velikost);
      if (naPlose) {
        SOUSEDE.forEach(([dx, dy], strana) => {
          if (!jePlocha(tx + dx, ty + dy)) ctx.drawImage(v.plocha.okraje[strana], px, py, velikost, velikost);
        });
        if (plocha.data.zhave) zhave.push([px, py, h]);
        if (vzor) ctx.drawImage(vzor, px, py, velikost, velikost);
      }
    }
  }
  if (zhave.length) {
    // láva dýchá: každá dlaždice se pomalu rozjasňuje a tmavne ve svém rytmu
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [px, py, h] of zhave) {
      ctx.fillStyle = `rgba(255,150,60,${(0.07 + 0.07 * Math.sin(cas * 1.8 + (h % 17) * 0.6)).toFixed(3)})`;
      ctx.fillRect(px, py, velikost, velikost);
    }
    ctx.restore();
  }
  const zare = [];
  zare.zhave = zhave;
  zare.dlazdice = velikost;
  const meritko = velikost / P;
  const nakresli = (ozd, px, py) => {
    const w = ozd.obr.width * meritko;
    ctx.drawImage(ozd.obr, px, py, w, ozd.obr.height * meritko);
    if (ozd.zare) zare.push({ obr: ozd.zare, x: px, y: py, velikost: w, barva: ozd.barva });
  };
  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const [px, py] = naObrazovce(tx, ty);
      const prekazka = prekazkaNaDlazdici(mapa, tx, ty);
      if (prekazka >= 0) {
        nakresli(v.prekazky[prekazka], px, py);
        continue;
      }
      const h = hash(tx, ty);
      if ((h >>> 16) % 100 >= v.hustota) continue;
      const ozd = v.ozdoby[(h >>> 20) % v.ozdoby.length];
      if (ozd.kde && ozd.kde !== (jePlocha(tx, ty) ? 'plocha' : 'mimo')) continue;
      nakresli(ozd, px, py);
    }
  }
  return zare;
}

// Malý náhled mapy do menu: kus podlahy 6×3 dlaždic po 16 px a na něm pár nepřátel, kteří tam chodí.
// Hledá se místo, kde je vidět zvláštní plocha i obyčejná zem a aspoň jedna překážka (mimo místa nepřátel).
const SIRKA_NAHLEDU = 6;
const VYSKA_NAHLEDU = 3;
const MISTA_NEPRATEL = [[20, 26], [52, 14], [78, 30]];
function mistoNahledu(mapa) {
  const plocha = plochaMapy(mapa);
  const prekazky = Boolean(MAPY[mapa].prekazky);
  if (!plocha && !prekazky) return [0, 0];
  const podNepritelem = new Set(MISTA_NEPRATEL.map(([x, y]) => `${Math.floor(x / P)},${Math.floor(y / P)}`));
  for (let pokus = 0; pokus < 400; pokus++) {
    const tx = (pokus % 20) * 5 - 50;
    const ty = Math.floor(pokus / 20) * 4 - 40;
    let naPlose = 0;
    let prekazek = 0;
    let zakryta = false;
    for (let y = 0; y < VYSKA_NAHLEDU; y++) {
      for (let x = 0; x < SIRKA_NAHLEDU; x++) {
        if (plocha && dlazdicePlochy(tx + x, ty + y, plocha.data)) naPlose += 1;
        if (prekazkaNaDlazdici(mapa, tx + x, ty + y) >= 0) {
          prekazek += 1;
          if (podNepritelem.has(`${x},${y}`)) zakryta = true;
        }
      }
    }
    if ((!plocha || (naPlose >= 6 && naPlose <= 10)) && (!prekazky || (prekazek >= 1 && !zakryta))) return [tx, ty];
  }
  return [0, 0];
}

export function nahledMapy(mapa) {
  const c = platno(SIRKA_NAHLEDU * P, VYSKA_NAHLEDU * P);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const [tx, ty] = mistoNahledu(mapa);
  const zare = kresliPodlahu(g, mapa, tx * P, ty * P, c.width, c.height, P);
  const druhy = MAPY[mapa].nepratele.slice().sort((a, b) => b.vaha - a.vaha || a.od - b.od).map((d) => d.druh);
  MISTA_NEPRATEL.forEach(([x, y], i) => {
    const obr = sprity[druhy[i % druhy.length]];
    if (obr) g.drawImage(obr, x - obr.width / 2, y - obr.height / 2);
  });
  if (MAPY[mapa].tma) {
    // ve tmě je vidět jen kolem světla uprostřed a krystaly ve skále
    const tma = g.createRadialGradient(c.width / 2, c.height / 2, 8, c.width / 2, c.height / 2, c.width * 0.6);
    tma.addColorStop(0, 'rgba(6,5,14,0)');
    tma.addColorStop(1, 'rgba(6,5,14,0.75)');
    g.fillStyle = tma;
    g.fillRect(0, 0, c.width, c.height);
    for (const z of zare) g.drawImage(z.obr, z.x, z.y, z.velikost, z.velikost);
  }
  return c;
}
