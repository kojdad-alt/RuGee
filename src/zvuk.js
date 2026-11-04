// Zvuk ze syntezátoru prohlížeče, bez souborů. Prohlížeč pustí zvuk až po kliknutí nebo klávese,
// proto ho odemyká tlačítko Hrát. Další zvuky (zásahy, krystaly) půjdou přes ton().
let kontext = null;

export function odemkniZvuk() {
  try {
    const Kontext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!kontext && Kontext) kontext = new Kontext();
    if (kontext?.state === 'suspended') kontext.resume().catch(() => {});
  } catch {
    kontext = null;
  }
}

// Krátký tón čtvercovou vlnou: frekvence v Hz, začátek a délka v sekundách od teď.
// Bez odemčeného zvuku se nestane nic.
export function ton(frekvence, zacatek = 0, delka = 0.08, hlasitost = 0.035) {
  if (!kontext) return;
  try {
    const t = kontext.currentTime + zacatek;
    const osc = kontext.createOscillator();
    const zesileni = kontext.createGain();
    osc.type = 'square';
    osc.frequency.value = frekvence;
    zesileni.gain.setValueAtTime(hlasitost, t);
    zesileni.gain.exponentialRampToValueAtTime(0.0001, t + delka);
    osc.connect(zesileni).connect(kontext.destination);
    osc.start(t);
    osc.stop(t + delka);
  } catch {
    // zvuk nejde, hra běží dál potichu
  }
}

// Tři stoupající tóny po stisku Hrát.
export function zvukStartu() {
  ton(523, 0);
  ton(659, 0.08);
  ton(784, 0.16, 0.14);
}

// Nákup v obchodě: dva rychlé jasné tóny.
export function zvukNakupu() {
  ton(784, 0);
  ton(1047, 0.06, 0.12);
}

// Na nákup chybí duše: krátké hluboké zabzučení.
export function zvukOdmitnuti() {
  ton(147, 0, 0.12, 0.03);
}

// Okno nové úrovně: stoupající znělka, čím vzácnější nejlepší karta (0 běžná … 3 legendární), tím delší.
export function zvukVolby(stupen = 0) {
  const tony = [523, 659, 784, 1047, 1319];
  const kolik = 2 + Math.max(0, Math.min(3, stupen));
  for (let i = 0; i < kolik; i++) ton(tony[i], i * 0.07, i === kolik - 1 ? 0.18 : 0.08, 0.03);
}

// Karta vybrána: krátké cinknutí.
export function zvukVyberu() {
  ton(988, 0, 0.06, 0.03);
  ton(1319, 0.05, 0.1, 0.03);
}

// Sebraný zlaťák: krátké vysoké cinknutí mince.
export function zvukZlataku() {
  ton(1568, 0, 0.05, 0.02);
  ton(2093, 0.04, 0.09, 0.02);
}

// Přehozené karty: rychlé zamíchání (tři tóny nahoru a dolů).
export function zvukPrehozeni() {
  ton(659, 0, 0.05, 0.03);
  ton(880, 0.05, 0.05, 0.03);
  ton(740, 0.1, 0.08, 0.03);
}
