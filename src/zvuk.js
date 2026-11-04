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
