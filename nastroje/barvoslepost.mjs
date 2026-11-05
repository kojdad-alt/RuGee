// Jak barvy vidí barvoslepý: simulace Machado, Oliveira a Fernandes (2009) pro úplnou protanopii, deuteranopii
// a tritanopii (matice 3×3 v lineárním RGB) a rozdíl barev CIEDE2000 (ΔE00). Test podle toho hlídá, že palety
// režimu pro barvoslepé (src/barvy.js) jdou v daném režimu rozeznat a že bez režimu by rozeznat nešly. Stejné
// matice použije ověření v prohlížeči jako filtr (feColorMatrix v linearRGB) na fotky „jak to vidí barvoslepý“.
// node nastroje/barvoslepost.mjs vypíše rozdíly rarit pro každou paletu a každý druh barvosleposti.

export const MATICE = {
  protanopie: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopie: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopie: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

const naLinearni = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const zLinearni = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

export function hex(barva) {
  return `#${barva.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

// Barva (#rrggbb), jak ji vidí člověk s daným druhem barvosleposti ('vyp' = beze změny).
export function simuluj(barva, druh) {
  const m = MATICE[druh];
  if (!m) return barva;
  const [r, g, b] = rgb(barva).map(naLinearni);
  return hex([0, 3, 6].map((i) => zLinearni(m[i] * r + m[i + 1] * g + m[i + 2] * b)));
}

export function lab(barva) {
  const [r, g, b] = rgb(barva).map(naLinearni);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

// CIEDE2000 mezi dvěma barvami v Lab (Sharma, Wu, Dalal 2005).
export function deltaE00Lab([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cs = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cs ** 7 / (Cs ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const uhel = (b, a) => (b === 0 && a === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
  const h1p = uhel(b1, a1p);
  const h2p = uhel(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lsp = (L1 + L2) / 2;
  const Csp = (C1p + C2p) / 2;
  let hsp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hsp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    else hsp = (h1p + h2p) / 2;
  }
  const T = 1 - 0.17 * Math.cos((hsp - 30) * rad) + 0.24 * Math.cos(2 * hsp * rad) + 0.32 * Math.cos((3 * hsp + 6) * rad) - 0.2 * Math.cos((4 * hsp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hsp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Csp ** 7 / (Csp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lsp - 50) ** 2) / Math.sqrt(20 + (Lsp - 50) ** 2);
  const Sc = 1 + 0.045 * Csp;
  const Sh = 1 + 0.015 * Csp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

export function deltaE(barva1, barva2) {
  return deltaE00Lab(lab(barva1), lab(barva2));
}

// Nejmenší rozdíl mezi dvojicemi barev, jak je vidí daný druh barvosleposti: { rozdil, dvojice }.
export function nejmensiRozdil(barvy, druh) {
  const seznam = Object.entries(barvy);
  let nej = { rozdil: Infinity, dvojice: null };
  for (let i = 0; i < seznam.length; i++) {
    for (let j = i + 1; j < seznam.length; j++) {
      const d = deltaE(simuluj(seznam[i][1], druh), simuluj(seznam[j][1], druh));
      if (d < nej.rozdil) nej = { rozdil: d, dvojice: [seznam[i][0], seznam[j][0]] };
    }
  }
  return nej;
}

// Kontrast dvou barev podle WCAG (1–21).
export function kontrast(barva1, barva2) {
  const jas = (b) => {
    const [r, g, bb] = rgb(b).map(naLinearni);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bb;
  };
  const [a, b] = [jas(barva1), jas(barva2)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { PALETY_RARIT } = await import('../src/barvy.js');
  for (const [paleta, rarity] of Object.entries(PALETY_RARIT)) {
    const radky = ['vyp', ...Object.keys(MATICE)].map((druh) => {
      const c = nejmensiRozdil(Object.fromEntries(Object.entries(rarity).map(([id, r]) => [id, r.c])), druh);
      const s = nejmensiRozdil(Object.fromEntries(Object.entries(rarity).map(([id, r]) => [id, r.svetla])), druh);
      return `${druh.padEnd(13)} rámeček ${c.rozdil.toFixed(1).padStart(5)} (${c.dvojice})  nápis ${s.rozdil.toFixed(1).padStart(5)} (${s.dvojice})`;
    });
    console.log(`paleta ${paleta}\n  ${radky.join('\n  ')}`);
  }
}
