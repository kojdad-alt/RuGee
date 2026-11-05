// Pixelové písmo RuGee: logo (tlusté tahy 2 px, 8 řádků) a nadpisy oken (5×7, velká písmena s českou
// diakritikou, číslice a běžná interpunkce). Text se kreslí do <canvas> po pixelech: řádky mají barvy od světlé
// nahoře po tmavší dole, pod písmenem je hnědá hloubka a kolem tmavý obrys jako u spritů. Zvětšuje se jen celými
// násobky, aby pixely zůstaly ostré. Nic se nestahuje, písmo je celé tady.

// Logo: X je plný pixel, tahy široké 2 pixely. Malá písmena sedí na stejné spodní čáře, nahoře mají prázdné řádky.
export const PISMENA_LOGA = {
  H: ['XX...XX', 'XX...XX', 'XX...XX', 'XXXXXXX', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX'],
  L: ['XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XXXXXX', 'XXXXXX'],
  U: ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  B: ['XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.'],
  I: ['XX', 'XX', 'XX', 'XX', 'XX', 'XX', 'XX', 'XX'],
  N: ['XX...XX', 'XXX..XX', 'XXXX.XX', 'XX.XXXX', 'XX..XXX', 'XX...XX', 'XX...XX', 'XX...XX'],
  Y: ['XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '..XX..', '..XX..', '..XX..', '..XX..'],
  R: ['XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXX..', 'XX.XXX.', 'XX..XXX', 'XX...XX'],
  G: ['.XXXXX.', 'XXXXXXX', 'XX.....', 'XX.....', 'XX..XXX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  u: ['......', '......', '......', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', '.XXXXX'],
  e: ['......', '......', '......', '.XXXX.', 'XX..XX', 'XXXXXX', 'XX....', '.XXXXX'],
};

// Nadpisy: velká písmena 5×7 (I, interpunkce a mezera užší). Nad písmenem jsou 3 řádky na diakritiku.
const ZAKLAD = {
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  C: ['.XXX.', 'X...X', 'X....', 'X....', 'X....', 'X...X', '.XXX.'],
  D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
  F: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....'],
  G: ['.XXX.', 'X...X', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXXX'],
  H: ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  I: ['XXX', '.X.', '.X.', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..XXX', '...X.', '...X.', '...X.', 'X..X.', 'X..X.', '.XX..'],
  K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
  N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  Q: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..X.', '.XX.X'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  S: ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  V: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  W: ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'],
  X: ['X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'],
  Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  Z: ['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'],
  0: ['.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.'],
  1: ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
  2: ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX'],
  3: ['XXXX.', '....X', '....X', '.XXX.', '....X', '....X', 'XXXX.'],
  4: ['...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.'],
  5: ['XXXXX', 'X....', 'XXXX.', '....X', '....X', 'X...X', '.XXX.'],
  6: ['.XXX.', 'X....', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.'],
  7: ['XXXXX', '....X', '...X.', '..X..', '..X..', '..X..', '..X..'],
  8: ['.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', '.XXX.'],
  9: ['.XXX.', 'X...X', 'X...X', '.XXXX', '....X', '....X', '.XXX.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '.': ['.', '.', '.', '.', '.', '.', 'X'],
  ',': ['..', '..', '..', '..', '..', '.X', 'X.'],
  ':': ['.', '.', 'X', '.', '.', 'X', '.'],
  '!': ['X', 'X', 'X', 'X', 'X', '.', 'X'],
  '?': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'],
  '-': ['...', '...', '...', 'XXX', '...', '...', '...'],
  '(': ['.X', 'X.', 'X.', 'X.', 'X.', 'X.', '.X'],
  ')': ['X.', '.X', '.X', '.X', '.X', '.X', 'X.'],
  '/': ['..X', '..X', '.X.', '.X.', '.X.', 'X..', 'X..'],
  '%': ['XX..X', 'XX..X', '...X.', '..X..', '.X...', 'X..XX', 'X..XX'],
  '+': ['...', '...', '.X.', 'XXX', '.X.', '...', '...'],
  '×': ['...', '...', 'X.X', '.X.', 'X.X', '...', '...'],
  '·': ['.', '.', '.', 'X', '.', '.', '.'],
  "'": ['X', 'X', '.', '.', '.', '.', '.'],
};
ZAKLAD['–'] = ZAKLAD['-'];

// Diakritika nad písmenem (čárka je posunutá doprava, kroužek má 3 řádky).
const ZNAMENKA = {
  carka: { radky: ['.X', 'X.'], posun: 1 },
  hacek: { radky: ['X.X', '.X.'], posun: 0 },
  krouzek: { radky: ['.X.', 'X.X', '.X.'], posun: 0 },
};
const SLOZENE = {
  Á: ['A', 'carka'], Č: ['C', 'hacek'], Ď: ['D', 'hacek'], É: ['E', 'carka'], Ě: ['E', 'hacek'],
  Í: ['I', 'carka'], Ň: ['N', 'hacek'], Ó: ['O', 'carka'], Ř: ['R', 'hacek'], Š: ['S', 'hacek'],
  Ť: ['T', 'hacek'], Ú: ['U', 'carka'], Ů: ['U', 'krouzek'], Ý: ['Y', 'carka'], Ž: ['Z', 'hacek'],
};
const NAD = 3;

function sestavPismo() {
  const pismo = {};
  const prazdne = (sirka) => '.'.repeat(sirka);
  for (const [znak, radky] of Object.entries(ZAKLAD)) {
    pismo[znak] = [...Array.from({ length: NAD }, () => prazdne(radky[0].length)), ...radky];
  }
  for (const [znak, [zaklad, jmeno]] of Object.entries(SLOZENE)) {
    const glyf = pismo[zaklad].map((r) => [...r]);
    const { radky, posun } = ZNAMENKA[jmeno];
    const x0 = Math.floor((glyf[0].length - radky[0].length) / 2) + posun;
    radky.forEach((r, y) => [...r].forEach((c, dx) => { if (c === 'X') glyf[y][x0 + dx] = 'X'; }));
    pismo[znak] = glyf.map((r) => r.join(''));
  }
  return pismo;
}

export const PISMO_NADPISU = sestavPismo();

// Styly: barvy řádků odshora (diakritika bere první), barva a výška hloubky pod písmem, obrys.
export const STYL_LOGA = {
  pismo: PISMENA_LOGA,
  barvy: ['#fff1c4', '#ffe08a', '#f4cf6e', '#e9c46a', '#e0b155', '#d39a3e', '#c4862f', '#b07428'],
  hloubka: 2,
  barvaHloubky: '#6b3f1d',
  obrys: '#0b0a0f',
};

export const STYL_NADPISU = {
  pismo: PISMO_NADPISU,
  barvy: ['#fff1c4', '#ffe08a', '#f4cf6e', '#e9c46a', '#e0b155', '#d39a3e', '#c4862f'],
  hloubka: 1,
  barvaHloubky: '#6b3f1d',
  obrys: '#140c08',
};

// Světlý pergamenový nápis (štítky, menší nadpisy), stejný tvar jako zlatý.
export const STYL_PERGAMEN = {
  ...STYL_NADPISU,
  barvy: ['#fffaf0', '#f8efd9', '#f3e6c8', '#efdfbd', '#e8d5ae', '#dfc99f', '#d4bb8e'],
  barvaHloubky: '#4f3019',
};

// Krvavě rudý nápis (konec hry), stejný tvar jako zlatý, hloubka tmavá vínová.
export const STYL_KREV = {
  ...STYL_NADPISU,
  barvy: ['#ffe3dc', '#ffb4a8', '#ff8a7a', '#f2665a', '#dc4a42', '#c23a34', '#a42c28'],
  barvaHloubky: '#4a120c',
};

// Nakreslí text do plátna v jednotkách pixelů písma (plátno má přesně velikost nápisu i s obrysem).
// Znak, který písmo nemá, se nakreslí jako otazník. Prázdné řádky nahoře (bez diakritiky) se oříznou.
export function nakresliText(platno, text, styl = STYL_NADPISU) {
  const { pismo, barvy, hloubka, barvaHloubky, obrys } = styl;
  const vyska = Object.values(pismo)[0].length;
  const posunBarev = vyska - barvy.length;
  const body = new Map();
  let x = 0;
  for (const znak of text) {
    const glyf = pismo[znak] ?? pismo[znak.toLocaleUpperCase('cs')] ?? pismo['?'];
    glyf.forEach((radek, y) => {
      [...radek].forEach((c, dx) => {
        if (c === 'X') body.set(`${x + dx},${y}`, barvy[Math.max(0, y - posunBarev)]);
      });
    });
    x += glyf[0].length + 1;
  }
  let horni = vyska;
  for (const bod of body.keys()) horni = Math.min(horni, Number(bod.split(',')[1]));
  if (horni === vyska) horni = 0;
  const pismoBody = new Map([...body].map(([bod, barva]) => {
    const [px, py] = bod.split(',').map(Number);
    return [`${px},${py - horni}`, barva];
  }));
  const hloubkaBody = new Set();
  for (const bod of pismoBody.keys()) {
    const [px, py] = bod.split(',').map(Number);
    for (let d = 1; d <= hloubka; d++) {
      if (!pismoBody.has(`${px},${py + d}`)) hloubkaBody.add(`${px},${py + d}`);
    }
  }
  const vse = new Set([...pismoBody.keys(), ...hloubkaBody]);
  platno.width = Math.max(1, x - 1 + 2);
  platno.height = vyska - horni + hloubka + 2;
  const g = platno.getContext('2d');
  g.clearRect(0, 0, platno.width, platno.height);
  const tecka = (bod, barva, posun = [0, 0]) => {
    const [px, py] = bod.split(',').map(Number);
    g.fillStyle = barva;
    g.fillRect(px + posun[0] + 1, py + posun[1] + 1, 1, 1);
  };
  for (const bod of vse) {
    const [px, py] = bod.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!vse.has(`${px + dx},${py + dy}`)) tecka(bod, obrys, [dx, dy]);
    }
  }
  for (const bod of hloubkaBody) tecka(bod, barvaHloubky);
  for (const [bod, barva] of pismoBody) tecka(bod, barva);
  return platno;
}

// Zvětší plátno nápisu celým násobkem tak, aby se vešlo do šířky (min..max). Šířka 0 = prvek je schovaný,
// pak se odhadne z okna; po zobrazení nebo změně velikosti okna se zavolá znovu (prizpusobNadpisy).
export function prizpusobMeritko(platno, sirka, min = 2, max = 3) {
  const misto = sirka > 0 ? sirka : innerWidth - 96;
  const meritko = Math.max(min, Math.min(max, Math.floor(misto / platno.width)));
  platno.style.width = `${platno.width * meritko}px`;
  platno.style.height = `${platno.height * meritko}px`;
  return meritko;
}

// Nadpis okna pixelovým písmem: text zůstane v prvku pro čtečky obrazovky (schovaný), vidět je plátno.
// Volby: styl (STYL_NADPISU, STYL_PERGAMEN), min a max násobek pixelu.
export function pixelovyNadpis(prvek, text, { styl = STYL_NADPISU, min = 2, max = 3 } = {}) {
  const platno = document.createElement('canvas');
  platno.className = 'pixel';
  platno.setAttribute('aria-hidden', 'true');
  platno.dataset.min = String(min);
  platno.dataset.max = String(max);
  nakresliText(platno, text.toLocaleUpperCase('cs'), styl);
  const proCtecky = document.createElement('span');
  proCtecky.className = 'jen-ctecka';
  proCtecky.textContent = text;
  prvek.classList.add('nadpis-pixel');
  prvek.replaceChildren(proCtecky, platno);
  prizpusobMeritko(platno, prvek.clientWidth, min, max);
  return platno;
}

// Přepočítá násobky všech pixelových nadpisů na stránce (po změně velikosti okna nebo zobrazení okna).
export function prizpusobNadpisy(koren = document) {
  for (const platno of koren.querySelectorAll('.nadpis-pixel > canvas')) {
    prizpusobMeritko(platno, platno.parentElement.clientWidth, Number(platno.dataset.min), Number(platno.dataset.max));
  }
}

if (typeof addEventListener === 'function') addEventListener('resize', () => prizpusobNadpisy());
