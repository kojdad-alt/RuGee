// Zvuk ze syntezátoru prohlížeče, bez jediného souboru: efekty i hudba se skládají z oscilátorů a šumu.
// Prohlížeč pustí zvuk až po kliknutí nebo klávese, proto ho odemyká klik na tlačítko a stisk klávesy (menu.js, main.js).
// Bez AudioContext (Node a simulace, starý prohlížeč) nebo když cokoli selže, se nestane nic a hra běží potichu.
//
// Cesta zvuku: hlas (oscilátor nebo šum → filtr → obálka) → sběrnice Efekty, nebo Hudba (přes plynulé ztišení
// nálady) → hlavní hlasitost (N ztlumí vše) → omezovač (DynamicsCompressor, ať nic neřve) → reproduktory.
// Ve hře padají stovky zásahů za sekundu, proto má každý efekt svou nejmenší mezeru (mezera v EFEKTY) a běžných
// efektů dohromady zazní nejvýš MAX_EFEKTU_ZA_SEKUNDU. Důležité (boss, varování, smrt, truhla) projdou vždy.
// Zvuky oken a menu (okno: true v EFEKTY) jsou krátké a tiché: najetí na tlačítko jen ťukne, klik, zpět, záložka,
// přepínač, výběr, nákup a odmítnutí. Pozastavený kontext (založený stiskem na ovladači, bez kliku) nehraje nic,
// ať se zvuky nenahromadí a nezazní všechny naráz, až ho prohlížeč pustí.

let kontext = null;
let vystup = null;
// Sdílený kus bílého šumu (1 s) pro rány, praskání a bicí.
let sum = null;

// Hlasitosti v procentech jako v nastavení (výchozí 60 % efekty a 40 % hudba), ztlumeno = klávesa N.
export const VYCHOZI_HLASITOST = { efekty: 60, hudba: 40, ztlumeno: false };
const hlasitost = { ...VYCHOZI_HLASITOST };
// Zesílení sběrnice na 100 %. Procenta jdou na druhou, ať se dá jemně ztišit. S 60 % má hra špičky kolem
// −20 dB a průměr kolem −35 dB (změřeno v Chromiu), omezovač nepustí nic nad zhruba −18 dB bez stlačení.
const ZISK = 2.4;

export const MAX_EFEKTU_ZA_SEKUNDU = 30;
const okno = [];
const naposledy = new Map();
// Počítadla pro kontrolu (test v Node i v prohlížeči): efektu = kolik zaznělo, zahozeno = kolik omezovač
// nepustil, uzlu = kolik uzlů WebAudio vzniklo (efekty i hudba), not = kolik not zahrála hudba, oken = kolikrát
// se okno nebo menu o zvuk řeklo (i potichu: ztlumeno, 0 %), zaznelo = jména posledních efektů, které zazněly.
const statistika = { efektu: 0, zahozeno: 0, uzlu: 0, not: 0, oken: 0 };
const zaznelo = [];
const MAX_ZAZNELO = 32;

export function statistikaZvuku() {
  return { ...statistika, zaznelo: [...zaznelo], odemceno: Boolean(vystup), stav: kontext?.state ?? null };
}

const omez = (x, od, do_) => Math.min(do_, Math.max(od, x));
const zisk = (procenta) => ZISK * (omez(procenta, 0, 100) / 100) ** 2;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// Malé náhodné rozladění, ať stejný zvuk stokrát za sebou nezní jako stroj (náhoda hry se tím neposune).
const kolisani = (o = 0.05) => 1 + (Math.random() * 2 - 1) * o;

export function odemkniZvuk() {
  try {
    const Kontext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!kontext && Kontext) {
      kontext = new Kontext();
      postavVystup();
    }
    if (kontext?.state === 'suspended') kontext.resume()?.catch?.(() => {});
  } catch {
    kontext = null;
    vystup = null;
  }
}

// Hraje zvuk? Prohlížeč ho pustí až po kliknutí, dotyku nebo klávese (stisk na ovladači se nepočítá), do té doby
// je kontext pozastavený nebo není (menu to hráči na ovladači řekne).
export function zvukBezi() {
  return kontext?.state === 'running';
}

// Kontext už je, ale prohlížeč ho pozastavil (založil ho stisk na ovladači): klik nebo klávesa ho pustí.
export function probudZvuk() {
  if (kontext?.state === 'suspended') odemkniZvuk();
}

function postavVystup() {
  const c = kontext;
  const omezovac = c.createDynamicsCompressor();
  omezovac.threshold.value = -18;
  omezovac.knee.value = 6;
  omezovac.ratio.value = 12;
  omezovac.attack.value = 0.002;
  omezovac.release.value = 0.2;
  const hlavni = c.createGain();
  const efekty = c.createGain();
  const hudba = c.createGain();
  const nalada = c.createGain();
  nalada.gain.value = 0;
  efekty.connect(hlavni);
  nalada.connect(hudba);
  hudba.connect(hlavni);
  hlavni.connect(omezovac);
  omezovac.connect(c.destination);
  const delka = Math.max(1, Math.floor(c.sampleRate || 44100));
  sum = c.createBuffer(1, delka, c.sampleRate || 44100);
  const data = sum.getChannelData(0);
  for (let i = 0; i < delka; i++) data[i] = Math.random() * 2 - 1;
  vystup = { omezovac, hlavni, efekty, hudba, nalada };
  statistika.uzlu += 5;
  pouzijHlasitost(true);
}

function pouzijHlasitost(hned = false) {
  if (!vystup) return;
  const t = kontext.currentTime;
  const nastav = (param, hodnota) => {
    param.cancelScheduledValues(t);
    if (hned) param.setValueAtTime(hodnota, t);
    else param.setTargetAtTime(hodnota, t, 0.04);
  };
  nastav(vystup.hlavni.gain, hlasitost.ztlumeno ? 0 : 1);
  nastav(vystup.efekty.gain, zisk(hlasitost.efekty));
  nastav(vystup.hudba.gain, zisk(hlasitost.hudba));
}

// Nové hlasitosti z nastavení (procenta 0–100, ztlumeno ano/ne). Co chybí nebo nedává smysl, zůstane.
export function nastavZvuk({ efekty, hudba, ztlumeno } = {}) {
  if (Number.isFinite(efekty)) hlasitost.efekty = omez(Math.round(efekty), 0, 100);
  if (Number.isFinite(hudba)) hlasitost.hudba = omez(Math.round(hudba), 0, 100);
  if (typeof ztlumeno === 'boolean') hlasitost.ztlumeno = ztlumeno;
  try {
    pouzijHlasitost();
  } catch {
    // zvuk nejde, nastavení se aspoň zapamatuje
  }
}

export function hlasitostZvuku() {
  return { ...hlasitost };
}

// Obálka: rychle nahoru na h, případně drží, pak doznívá do ticha (exponenciálně, ať to necvaká).
function obalka(param, t, h, utok, drzeni, delka) {
  const vrchol = Math.max(0.0002, h);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(vrchol, t + utok);
  if (drzeni > 0) param.setValueAtTime(vrchol, t + utok + drzeni);
  param.exponentialRampToValueAtTime(0.0001, t + Math.max(delka, utok + drzeni + 0.01));
}

function filtr(t, delka, { typ = 'lowpass', f = 1000, f2 = null, q = 0.8 }) {
  const fl = kontext.createBiquadFilter();
  fl.type = typ;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (f2 && f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t + delka);
  return fl;
}

// Jeden tón: vlna s frekvencí f (s f2 během délky sjede nebo vyjede), volitelně přes filtr fl, na sběrnici cil.
function hlas(cil, t, { f, f2 = null, delka = 0.08, h = 0.03, vlna = 'square', utok = 0.003, drzeni = 0, fl = null }) {
  const osc = kontext.createOscillator();
  const g = kontext.createGain();
  osc.type = vlna;
  osc.frequency.setValueAtTime(f, t);
  if (f2 && f2 !== f) osc.frequency.exponentialRampToValueAtTime(f2, t + delka);
  obalka(g.gain, t, h, utok, drzeni, delka);
  if (fl) {
    const filtrNode = filtr(t, delka, fl);
    osc.connect(filtrNode);
    filtrNode.connect(g);
    statistika.uzlu += 1;
  } else osc.connect(g);
  g.connect(cil);
  osc.start(t);
  osc.stop(t + delka + 0.03);
  statistika.uzlu += 2;
}

// Šum přes filtr (rány, praskání, vítr, bicí).
function sumik(cil, t, { delka = 0.1, h = 0.02, utok = 0.002, drzeni = 0, fl = { typ: 'bandpass', f: 1000, q: 1 } }) {
  const zdroj = kontext.createBufferSource();
  zdroj.buffer = sum;
  zdroj.loop = true;
  const filtrNode = filtr(t, delka, fl);
  const g = kontext.createGain();
  obalka(g.gain, t, h, utok, drzeni, delka);
  zdroj.connect(filtrNode);
  filtrNode.connect(g);
  g.connect(cil);
  zdroj.start(t, Math.random() * 0.5);
  zdroj.stop(t + delka + 0.03);
  statistika.uzlu += 3;
}

// Smí efekt id zaznít? Od posledního stejného musí uplynout jeho mezera a běžných efektů za poslední sekundu
// smí být nejvýš MAX_EFEKTU_ZA_SEKUNDU (důležité se nepočítají a projdou vždy). Vrací čas začátku, nebo null.
// Pozastavený kontext hraje, jen když právě běží klik nebo klávesa (prohlížeč ho v ní pouští, stav se přepne až
// za chvíli). Prohlížeč bez navigator.userActivation hraje jako dřív.
function smiHrat() {
  if (kontext.state === 'running') return true;
  return globalThis.navigator?.userActivation?.isActive ?? true;
}

function muze(id, mezera, dulezity) {
  if (!vystup || hlasitost.ztlumeno || hlasitost.efekty <= 0 || !smiHrat()) return null;
  const t = kontext.currentTime;
  const pred = naposledy.get(id);
  if (pred !== undefined && t - pred < mezera) {
    statistika.zahozeno += 1;
    return null;
  }
  while (okno.length && t - okno[0] >= 1) okno.shift();
  if (!dulezity && okno.length >= MAX_EFEKTU_ZA_SEKUNDU) {
    statistika.zahozeno += 1;
    return null;
  }
  if (!dulezity) okno.push(t);
  naposledy.set(id, t);
  statistika.efektu += 1;
  return t + 0.005;
}

// Sbírání krystalů rychle za sebou: každý další o tón výš (pentatonika), po chvilce klidu zase od začátku.
const TONY_KRYSTALU = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const radaKrystalu = { cas: -10, stupen: 0 };

// Efekty: mezera = nejkratší odstup dvou stejných (s), dulezity = projde i přes plný limit za sekundu.
// hraj(t, e, sila) zahraje efekt od času t na sběrnici e (sila = číslo z hry, třeba kolikátý odraz kamene).
const EFEKTY = {
  // Zbraně: potichu a krátce, každá svůj charakter.
  jiskra: {
    mezera: 0.07,
    hraj(t, e) {
      hlas(e, t, { f: 1500 * kolisani(), f2: 2500, delka: 0.045, h: 0.011, fl: { f: 3800 } });
    },
  },
  lucerna: {
    mezera: 0.3,
    hraj(t, e) {
      sumik(e, t, { delka: 0.16, h: 0.016, fl: { typ: 'lowpass', f: 700, f2: 220 } });
      hlas(e, t, { f: 196 * kolisani(0.03), f2: 165, delka: 0.14, h: 0.012, vlna: 'sine', utok: 0.02 });
    },
  },
  krumpace: {
    mezera: 0.08,
    hraj(t, e) {
      const f = 1100 * kolisani(0.08);
      hlas(e, t, { f, f2: f * 0.8, delka: 0.06, h: 0.014, vlna: 'triangle' });
      sumik(e, t, { delka: 0.03, h: 0.008, fl: { typ: 'highpass', f: 3200 } });
    },
  },
  blesk: {
    mezera: 0.12,
    hraj(t, e) {
      sumik(e, t, { delka: 0.15, h: 0.026, fl: { typ: 'bandpass', f: 2600, f2: 900, q: 0.7 } });
      hlas(e, t, { f: 1800, f2: 140, delka: 0.11, h: 0.009, vlna: 'sawtooth', fl: { f: 4000 } });
    },
  },
  trny: {
    mezera: 0.14,
    hraj(t, e) {
      sumik(e, t, { delka: 0.1, h: 0.018, fl: { typ: 'bandpass', f: 900, f2: 380, q: 1.2 } });
      hlas(e, t, { f: 260 * kolisani(), f2: 120, delka: 0.08, h: 0.011, vlna: 'triangle' });
    },
  },
  zrcadlo: {
    mezera: 0.09,
    hraj(t, e, sila) {
      const f = sila ? 2637 : 2093;
      hlas(e, t, { f, delka: 0.13, h: 0.011, vlna: 'sine' });
      hlas(e, t, { f: f * 1.5, delka: 0.08, h: 0.005, vlna: 'sine' });
    },
  },
  svetlusky: {
    mezera: 0.07,
    hraj(t, e) {
      const f = 2300 * kolisani(0.1);
      hlas(e, t, { f, f2: f * 1.35, delka: 0.045, h: 0.009, vlna: 'sine' });
    },
  },
  mraz: {
    mezera: 0.16,
    hraj(t, e) {
      hlas(e, t, { f: 1760, f2: 1320, delka: 0.12, h: 0.012, vlna: 'triangle' });
      hlas(e, t + 0.03, { f: 2637, delka: 0.16, h: 0.006, vlna: 'sine' });
    },
  },
  trist: {
    mezera: 0.12,
    hraj(t, e) {
      sumik(e, t, { delka: 0.2, h: 0.022, fl: { typ: 'highpass', f: 3800 } });
      hlas(e, t, { f: 2093 * kolisani(), f2: 1200, delka: 0.07, h: 0.01, vlna: 'triangle' });
    },
  },
  // Zvon hlubin: hluboký úder a nad ním tichý alikvot, oba dlouho doznívají (ozvěna je tišší).
  zvon: {
    mezera: 0.12,
    hraj(t, e, ozvena) {
      const h = ozvena ? 0.018 : 0.032;
      hlas(e, t, { f: 196, delka: 0.55, h, vlna: 'triangle' });
      hlas(e, t, { f: 494, delka: 0.35, h: h * 0.4, vlna: 'sine' });
    },
  },
  cep: {
    mezera: 0.1,
    hraj(t, e) {
      hlas(e, t, { f: 140 * kolisani(), f2: 55, delka: 0.13, h: 0.04, vlna: 'sine' });
      sumik(e, t, { delka: 0.08, h: 0.018, fl: { typ: 'lowpass', f: 320 } });
    },
  },
  seminka: {
    mezera: 0.09,
    hraj(t, e) {
      sumik(e, t, { delka: 0.17, h: 0.026, fl: { typ: 'lowpass', f: 900, f2: 200 } });
      hlas(e, t, { f: 220 * kolisani(), f2: 70, delka: 0.12, h: 0.024, vlna: 'sine' });
    },
  },
  korene: {
    mezera: 0.12,
    hraj(t, e) {
      hlas(e, t, { f: 110 * kolisani(), f2: 55, delka: 0.15, h: 0.018, vlna: 'sawtooth', fl: { f: 420 } });
      sumik(e, t, { delka: 0.1, h: 0.014, fl: { typ: 'bandpass', f: 300, q: 1.4 } });
    },
  },
  stopa: {
    mezera: 0.35,
    hraj(t, e) {
      sumik(e, t, { delka: 0.22, h: 0.012, utok: 0.04, fl: { typ: 'bandpass', f: 700, f2: 1500, q: 0.9 } });
    },
  },
  // Odrazný kámen: krátké ťuknutí, s každým dalším odrazem o kus výš (nejvýš o oktávu).
  kamen: {
    mezera: 0.09,
    hraj(t, e, odraz) {
      hlas(e, t, { f: 620 * Math.min(2, 1 + (Math.max(1, odraz) - 1) * 0.12), delka: 0.035, h: 0.016 });
    },
  },

  // Zásahy, smrt nepřátel a bedny.
  zasah: {
    mezera: 0.06,
    hraj(t, e) {
      sumik(e, t, { delka: 0.035, h: 0.01, fl: { typ: 'bandpass', f: 1300 * kolisani(0.15), q: 1.3 } });
    },
  },
  smrt: {
    mezera: 0.05,
    hraj(t, e) {
      const f = 520 * kolisani(0.12);
      hlas(e, t, { f, f2: f * 0.35, delka: 0.07, h: 0.013, fl: { f: 2200 } });
      sumik(e, t, { delka: 0.05, h: 0.008, fl: { typ: 'lowpass', f: 1600 } });
    },
  },
  elitaPadla: {
    mezera: 0.15,
    hraj(t, e) {
      hlas(e, t, { f: 330, f2: 110, delka: 0.22, h: 0.022, vlna: 'sawtooth', fl: { f: 1400 } });
      sumik(e, t, { delka: 0.15, h: 0.016, fl: { typ: 'lowpass', f: 900 } });
    },
  },
  bedna: {
    mezera: 0.07,
    hraj(t, e) {
      sumik(e, t, { delka: 0.07, h: 0.018, fl: { typ: 'bandpass', f: 1500, f2: 600, q: 1.1 } });
      hlas(e, t, { f: 180 * kolisani(), f2: 90, delka: 0.05, h: 0.008, fl: { f: 800 } });
    },
  },
  // Dráček (pet) plivne oheň: krátké tiché zasyčení.
  petOhen: {
    mezera: 0.25,
    hraj(t, e) {
      sumik(e, t, { delka: 0.1, h: 0.01, fl: { typ: 'lowpass', f: 2400, f2: 600 } });
    },
  },
  bomba: {
    mezera: 0.3,
    dulezity: true,
    hraj(t, e) {
      sumik(e, t, { delka: 0.7, h: 0.07, fl: { typ: 'lowpass', f: 1400, f2: 80 } });
      hlas(e, t, { f: 90, f2: 32, delka: 0.55, h: 0.06, vlna: 'sine' });
    },
  },

  // Sbírání: krystal (výš a výš za sebou), zlaťák, srdce, magnet.
  krystal: {
    mezera: 0.035,
    hraj(t, e) {
      radaKrystalu.stupen = t - radaKrystalu.cas < 0.45 ? Math.min(radaKrystalu.stupen + 1, TONY_KRYSTALU.length - 1) : 0;
      radaKrystalu.cas = t;
      const f = 659 * 2 ** (TONY_KRYSTALU[radaKrystalu.stupen] / 12);
      hlas(e, t, { f, delka: 0.07, h: 0.014, vlna: 'sine' });
      hlas(e, t, { f: f * 2, delka: 0.04, h: 0.004, vlna: 'triangle' });
    },
  },
  zlatak: {
    mezera: 0.07,
    hraj(t, e) {
      hlas(e, t, { f: 1568, delka: 0.05, h: 0.018 });
      hlas(e, t + 0.04, { f: 2093, delka: 0.09, h: 0.018 });
    },
  },
  srdce: {
    mezera: 0.12,
    dulezity: true,
    hraj(t, e) {
      [523, 659, 784].forEach((f, i) => hlas(e, t + i * 0.06, { f, delka: 0.16, h: 0.022, vlna: 'triangle' }));
    },
  },
  // Vejce peta z bosse: dva měkké tóny a stoupající třetí, jako když se v něm něco pohne.
  vejce: {
    mezera: 0.3,
    dulezity: true,
    hraj(t, e) {
      [587, 494, 880].forEach((f, i) => hlas(e, t + i * 0.09, { f, delka: i === 2 ? 0.22 : 0.09, h: 0.022, vlna: 'triangle' }));
    },
  },
  magnet: {
    mezera: 0.2,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 300, f2: 1500, delka: 0.38, h: 0.02, vlna: 'sine', utok: 0.03 });
      hlas(e, t, { f: 600, f2: 3000, delka: 0.38, h: 0.006, vlna: 'triangle', utok: 0.03 });
    },
  },

  // Hrdina: zranění, štít, oživení, smrt.
  zraneni: {
    mezera: 0.2,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 220, f2: 100, delka: 0.13, h: 0.03, fl: { f: 1100 } });
      sumik(e, t, { delka: 0.08, h: 0.018, fl: { typ: 'lowpass', f: 800 } });
    },
  },
  stit: {
    mezera: 0.15,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 1568, delka: 0.16, h: 0.02, vlna: 'sine' });
      hlas(e, t, { f: 2093, delka: 0.12, h: 0.012, vlna: 'sine' });
    },
  },
  oziveni: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      [392, 523, 659, 784, 1047].forEach((f, i) => hlas(e, t + i * 0.08, { f, delka: 0.4, h: 0.022, vlna: 'triangle' }));
      sumik(e, t, { delka: 0.6, h: 0.008, utok: 0.2, fl: { typ: 'highpass', f: 5000 } });
    },
  },
  smrtHrdiny: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      [392, 330, 262, 196].forEach((f, i) => {
        hlas(e, t + i * 0.24, { f, delka: i === 3 ? 1 : 0.3, h: 0.03, vlna: 'sawtooth', fl: { f: 1300 } });
      });
      sumik(e, t, { delka: 0.5, h: 0.02, fl: { typ: 'lowpass', f: 400, f2: 80 } });
    },
  },

  // Bossové: příchod, varování před schopností (každá jiná), provedení, zuřivost, pád a truhla.
  boss: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 73, delka: 1.5, h: 0.05, vlna: 'sawtooth', utok: 0.12, drzeni: 0.6, fl: { f: 300, f2: 1200 } });
      hlas(e, t, { f: 110, delka: 1.5, h: 0.035, vlna: 'sawtooth', utok: 0.12, drzeni: 0.6, fl: { f: 300, f2: 1100 } });
      for (const k of [0, 0.4, 0.8]) hlas(e, t + k, { f: 70, f2: 30, delka: 0.3, h: 0.07, vlna: 'sine' });
    },
  },
  // Dupnutí: hluboké stoupající dunění (jako by se zvedala zem).
  dupnuti: {
    mezera: 0.3,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 45, f2: 95, delka: 0.75, h: 0.06, vlna: 'sine', utok: 0.1 });
      sumik(e, t, { delka: 0.75, h: 0.03, utok: 0.2, fl: { typ: 'lowpass', f: 150, f2: 420 } });
    },
  },
  // Hod: skřípění kamene a stoupající hvizd.
  hod: {
    mezera: 0.3,
    dulezity: true,
    hraj(t, e) {
      sumik(e, t, { delka: 0.3, h: 0.022, fl: { typ: 'bandpass', f: 350, q: 2 } });
      hlas(e, t + 0.1, { f: 440, f2: 990, delka: 0.5, h: 0.018, vlna: 'triangle', utok: 0.05 });
    },
  },
  // Výpad: vrčení, které se roztáčí čím dál výš.
  vypad: {
    mezera: 0.3,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 120, f2: 520, delka: 0.7, h: 0.026, vlna: 'sawtooth', utok: 0.05, fl: { f: 600, f2: 2200 } });
      hlas(e, t, { f: 60, f2: 130, delka: 0.7, h: 0.02, utok: 0.05, fl: { f: 400 } });
    },
  },
  // Vyvolání: tajemný rozklad akordu, který se chvěje.
  vyvolani: {
    mezera: 0.3,
    dulezity: true,
    hraj(t, e) {
      [440, 523, 622, 740].forEach((f, i) => {
        hlas(e, t + i * 0.13, { f, delka: 0.35, h: 0.014, vlna: 'sine' });
        hlas(e, t + i * 0.13, { f: f * 1.012, delka: 0.35, h: 0.01, vlna: 'sine' });
      });
    },
  },
  // Vějíř: kouzelné nabíjení, tři zatřpytění nahoru.
  vejir: {
    mezera: 0.3,
    dulezity: true,
    hraj(t, e) {
      [1319, 1568, 1976].forEach((f, i) => hlas(e, t + i * 0.12, { f, f2: f * 1.06, delka: 0.12, h: 0.014, vlna: 'sine' }));
      sumik(e, t, { delka: 0.5, h: 0.008, utok: 0.3, fl: { typ: 'highpass', f: 3000, f2: 7000 } });
    },
  },
  uder: {
    mezera: 0.2,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 85, f2: 30, delka: 0.45, h: 0.08, vlna: 'sine' });
      sumik(e, t, { delka: 0.4, h: 0.04, fl: { typ: 'lowpass', f: 600, f2: 90 } });
    },
  },
  dopad: {
    mezera: 0.08,
    hraj(t, e) {
      sumik(e, t, { delka: 0.14, h: 0.028, fl: { typ: 'lowpass', f: 900, f2: 160 } });
      hlas(e, t, { f: 120, f2: 50, delka: 0.12, h: 0.03, vlna: 'sine' });
    },
  },
  vypadBezi: {
    mezera: 0.3,
    hraj(t, e) {
      sumik(e, t, { delka: 0.35, h: 0.022, utok: 0.03, fl: { typ: 'bandpass', f: 500, f2: 1600, q: 0.8 } });
    },
  },
  strelaBosse: {
    mezera: 0.12,
    hraj(t, e) {
      hlas(e, t, { f: 880, f2: 440, delka: 0.1, h: 0.012, vlna: 'triangle' });
    },
  },
  zurivost: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 70, delka: 0.8, h: 0.04, vlna: 'sawtooth', utok: 0.05, drzeni: 0.3, fl: { f: 500 } });
      hlas(e, t, { f: 74, delka: 0.8, h: 0.03, vlna: 'sawtooth', utok: 0.05, drzeni: 0.3, fl: { f: 500 } });
      hlas(e, t, { f: 147, f2: 110, delka: 0.6, h: 0.016, fl: { f: 900 } });
    },
  },
  bossPadl: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      sumik(e, t, { delka: 0.9, h: 0.06, fl: { typ: 'lowpass', f: 700, f2: 90 } });
      hlas(e, t, { f: 110, f2: 38, delka: 0.8, h: 0.04, vlna: 'sawtooth', fl: { f: 600 } });
      [523, 659, 784, 1047].forEach((f, i) => hlas(e, t + 0.5 + i * 0.1, { f, delka: i === 3 ? 0.5 : 0.14, h: 0.022, vlna: 'triangle' }));
    },
  },
  truhla: {
    mezera: 0.5,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 160, f2: 250, delka: 0.32, h: 0.014, vlna: 'sawtooth', fl: { f: 900, q: 3 } });
      [1047, 1319, 1568, 2093].forEach((f, i) => hlas(e, t + 0.4 + i * 0.08, { f, delka: i === 3 ? 0.4 : 0.12, h: 0.016, vlna: 'triangle' }));
    },
  },
  zamcena: {
    mezera: 0.5,
    dulezity: true,
    hraj(t, e, klicem) {
      sumik(e, t, { delka: 0.03, h: 0.03, fl: { typ: 'highpass', f: 3000 } });
      hlas(e, t, { f: 600, f2: 300, delka: 0.05, h: 0.012 });
      const tony = klicem ? [784, 988, 1175, 1568] : [784, 988, 1175];
      tony.forEach((f, i) => hlas(e, t + 0.12 + i * 0.07, { f, delka: 0.13, h: 0.016, vlna: 'triangle' }));
    },
  },
  kupec: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      [1319, 1568, 1319, 1760].forEach((f, i) => {
        hlas(e, t + i * 0.12, { f, delka: 0.22, h: 0.016, vlna: 'triangle' });
        hlas(e, t + i * 0.12, { f: f * 2.7, delka: 0.1, h: 0.003, vlna: 'sine' });
      });
    },
  },
  hrozba: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 110, delka: 0.7, h: 0.03, vlna: 'triangle', utok: 0.04 });
      hlas(e, t + 0.05, { f: 116.5, delka: 0.65, h: 0.024, vlna: 'triangle', utok: 0.04 });
      hlas(e, t, { f: 70, f2: 35, delka: 0.4, h: 0.045, vlna: 'sine' });
    },
  },
  // Obyčejní nepřátelé se schopností: tišší a kratší než bossové, ať jich může být víc.
  // Kostlivec napřahuje kost: krátké hvízdnutí nahoru.
  hodKosti: {
    mezera: 0.25,
    hraj(t, e) {
      sumik(e, t, { delka: 0.12, h: 0.01, fl: { typ: 'bandpass', f: 900, q: 3 } });
      hlas(e, t + 0.03, { f: 660, f2: 1180, delka: 0.16, h: 0.007, vlna: 'triangle', utok: 0.02 });
    },
  },
  // Slizák se odráží ke skoku: mlasknutí, které vyletí nahoru.
  skok: {
    mezera: 0.2,
    hraj(t, e) {
      hlas(e, t, { f: 180, f2: 420, delka: 0.14, h: 0.012, vlna: 'sine', utok: 0.01 });
      sumik(e, t, { delka: 0.08, h: 0.008, fl: { typ: 'lowpass', f: 700 } });
    },
  },
  // Nápor elity: krátké zavrčení.
  napor: {
    mezera: 0.35,
    hraj(t, e) {
      hlas(e, t, { f: 90, f2: 240, delka: 0.4, h: 0.016, vlna: 'sawtooth', utok: 0.04, fl: { f: 500, f2: 1400 } });
    },
  },
  // Obklíčení: dva nízké údery bubnu a tmavý akord, ať hráč ví, že má utéct.
  obkliceni: {
    mezera: 1.5,
    dulezity: true,
    hraj(t, e) {
      hlas(e, t, { f: 82, f2: 55, delka: 0.25, h: 0.04, vlna: 'sine' });
      hlas(e, t + 0.18, { f: 82, f2: 55, delka: 0.25, h: 0.04, vlna: 'sine' });
      hlas(e, t + 0.05, { f: 147, delka: 0.6, h: 0.014, vlna: 'triangle', utok: 0.05 });
      hlas(e, t + 0.05, { f: 156, delka: 0.6, h: 0.011, vlna: 'triangle', utok: 0.05 });
    },
  },
  elita: {
    mezera: 0.6,
    hraj(t, e) {
      hlas(e, t, { f: 98, f2: 92, delka: 0.35, h: 0.024, vlna: 'sawtooth', fl: { f: 700 } });
      hlas(e, t, { f: 196, delka: 0.2, h: 0.007 });
    },
  },
  odemceni: {
    mezera: 1,
    dulezity: true,
    hraj(t, e) {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => hlas(e, t + i * 0.1, { f, delka: i === 5 ? 0.45 : 0.12, h: 0.02, vlna: 'triangle' }));
    },
  },

  // Okna a menu (okno: true). Hlasitost h je vrchol obálky před sběrnicí Efekty: najetí 0,005 (sotva slyšet),
  // klik a přepínač kolem 0,02, okna a nákup kolem 0,03.
  start: {
    mezera: 0.2,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 523, delka: 0.08, h: 0.035 });
      hlas(e, t + 0.08, { f: 659, delka: 0.08, h: 0.035 });
      hlas(e, t + 0.16, { f: 784, delka: 0.14, h: 0.035 });
    },
  },
  // Najetí myší nebo přesun výběru šipkami a páčkou: jen tiché ťuknutí. Nejvýš jednou za mezeru a jako běžný
  // efekt (při plném limitu za sekundu se zahodí), držený směr na ovladači tak ťuká nejvýš 11× za sekundu.
  najeti: {
    mezera: 0.09,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 1760 * kolisani(0.02), delka: 0.028, h: 0.005, vlna: 'triangle', utok: 0.002 });
    },
  },
  // Klik nebo Enter na tlačítko bez vlastního zvuku: dřevěné ťuk s mosazným cinknutím.
  klik: {
    mezera: 0.05,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 1047 * kolisani(0.02), f2: 784, delka: 0.045, h: 0.02, vlna: 'triangle' });
      sumik(e, t, { delka: 0.018, h: 0.007, fl: { typ: 'bandpass', f: 2600, q: 1.5 } });
    },
  },
  // Zpět, zavření okna, pokračování z pauzy, odchod od kupce: dva tóny dolů.
  zpet: {
    mezera: 0.08,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 784, delka: 0.05, h: 0.018, vlna: 'triangle' });
      hlas(e, t + 0.05, { f: 587, delka: 0.09, h: 0.016, vlna: 'triangle' });
    },
  },
  // Otevřená záložka menu nebo pauza: šustnutí a dva tóny nahoru. Strom vylepšení (stupen 1): dřevěné ťuknutí
  // a čtyři tóny nahoru, jako když větve vyrostou.
  zalozka: {
    mezera: 0.12,
    dulezity: true,
    okno: true,
    hraj(t, e, stupen) {
      sumik(e, t, { delka: 0.07, h: 0.008, fl: { typ: 'bandpass', f: 1400, f2: 3200, q: 0.9 } });
      if (stupen === 1) {
        hlas(e, t, { f: 196, f2: 160, delka: 0.09, h: 0.022, vlna: 'sine' });
        [392, 494, 587, 784].forEach((f, i) => hlas(e, t + 0.05 + i * 0.06, { f, delka: i === 3 ? 0.18 : 0.07, h: 0.014, vlna: 'triangle' }));
        return;
      }
      hlas(e, t, { f: 523, delka: 0.05, h: 0.018, vlna: 'triangle' });
      hlas(e, t + 0.045, { f: 784, delka: 0.09, h: 0.018, vlna: 'triangle' });
    },
  },
  // Přepínač v Nastavení a pauze, sbalení výbavy, jazyk a barvy: cvak a tón nahoru (zapnuto, stupen 1) nebo dolů.
  prepinac: {
    mezera: 0.06,
    dulezity: true,
    okno: true,
    hraj(t, e, zapnuto) {
      sumik(e, t, { delka: 0.015, h: 0.006, fl: { typ: 'highpass', f: 2500 } });
      hlas(e, t, { f: 880, delka: 0.035, h: 0.016, vlna: 'triangle' });
      hlas(e, t + 0.035, { f: zapnuto ? 1319 : 659, delka: 0.06, h: 0.016, vlna: 'triangle' });
    },
  },
  // Okno nové úrovně: stoupající znělka, čím vzácnější nejlepší karta (0 běžná … 6 božská), tím delší. Neobvyklá
  // zní jako Běžná, od Vzácné je o tón delší, Mýtická a Božská mají navrch tichý třpyt (Božská delší).
  volba: {
    mezera: 0.15,
    dulezity: true,
    okno: true,
    hraj(t, e, stupen) {
      const s = omez(Math.round(stupen) || 0, 0, 6);
      const tony = [523, 659, 784, 1047, 1319, 1568, 2093];
      const kolik = 2 + Math.max(0, s - 1);
      for (let i = 0; i < kolik; i++) hlas(e, t + i * 0.07, { f: tony[i], delka: i === kolik - 1 ? 0.18 + 0.04 * Math.max(0, s - 4) : 0.08, h: 0.03 });
      if (s >= 5) for (let i = 0; i < (s === 6 ? 6 : 3); i++) hlas(e, t + 0.12 + i * 0.06, { f: 2637 + 260 * i, delka: 0.05, h: 0.007, vlna: 'sine' });
    },
  },
  // Karta, postava, mapa, profil nebo pet vybrán: krátké cinknutí.
  vyber: {
    mezera: 0.08,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 988, delka: 0.06, h: 0.03 });
      hlas(e, t + 0.05, { f: 1319, delka: 0.1, h: 0.03 });
    },
  },
  // Nákup (strom, vejce, kupec): tři měkké tóny nahoru jako cinknutí mincí a třpyt navrch.
  nakup: {
    mezera: 0.08,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 784, delka: 0.07, h: 0.03, vlna: 'triangle' });
      hlas(e, t + 0.06, { f: 1047, delka: 0.08, h: 0.03, vlna: 'triangle' });
      hlas(e, t + 0.12, { f: 1568, delka: 0.2, h: 0.024, vlna: 'triangle' });
      hlas(e, t + 0.12, { f: 3136, delka: 0.12, h: 0.004, vlna: 'sine' });
    },
  },
  // Chybí duše nebo zlaťáky, zamčená mapa nebo uzel, špatné jméno: tlumené „ne-ne“ (dva hluboké tóny přes filtr).
  odmitnuti: {
    mezera: 0.1,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 156, f2: 139, delka: 0.09, h: 0.03, fl: { f: 650 } });
      hlas(e, t + 0.1, { f: 131, f2: 117, delka: 0.13, h: 0.028, fl: { f: 520 } });
    },
  },
  // Přehozené karty: rychlé zamíchání (tři tóny nahoru a dolů).
  prehozeni: {
    mezera: 0.08,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 659, delka: 0.05, h: 0.03 });
      hlas(e, t + 0.05, { f: 880, delka: 0.05, h: 0.03 });
      hlas(e, t + 0.1, { f: 740, delka: 0.08, h: 0.03 });
    },
  },
  // Okno Pety: vejce se zatřese (ťuknutí, každé o kus výš), praskne a vylíhne se pet. Znělka líhnutí je tím delší
  // a jasnější, čím vzácnější rarita padla (stupen 0 běžná … 6 božská, Neobvyklá zní jako Běžná).
  tukVejce: {
    mezera: 0.1,
    dulezity: true,
    okno: true,
    hraj(t, e, stupen) {
      const f = 392 * 2 ** ((omez(Math.round(stupen) || 0, 0, 2) * 2) / 12);
      hlas(e, t, { f, f2: f * 0.8, delka: 0.07, h: 0.03, vlna: 'triangle' });
      sumik(e, t, { delka: 0.04, h: 0.012, fl: { typ: 'lowpass', f: 1200 } });
    },
  },
  praskVejce: {
    mezera: 0.2,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      sumik(e, t, { delka: 0.12, h: 0.03, fl: { typ: 'highpass', f: 1800 } });
      hlas(e, t, { f: 880, f2: 330, delka: 0.12, h: 0.02, vlna: 'square', fl: { f: 2200 } });
    },
  },
  vylihnuti: {
    mezera: 0.3,
    dulezity: true,
    okno: true,
    hraj(t, e, stupen) {
      const r = omez(Math.round(stupen) || 0, 0, 6);
      const s = Math.max(0, r - 1);
      const tony = [523, 659, 784, 1047, 1319, 1568, 2093, 2637];
      const kolik = 3 + s;
      for (let i = 0; i < kolik; i++) hlas(e, t + i * 0.08, { f: tony[i], delka: i === kolik - 1 ? 0.3 + 0.1 * Math.min(s, 3) : 0.09, h: 0.03, vlna: 'triangle' });
      if (s >= 2) for (let i = 0; i < (r === 6 ? 8 : 4); i++) hlas(e, t + 0.1 + i * 0.06, { f: 2093 + 300 * i, delka: 0.05, h: 0.008, vlna: 'sine' });
    },
  },
  // Ukázka při změně hlasitosti efektů v nastavení.
  ukazka: {
    mezera: 0.05,
    dulezity: true,
    okno: true,
    hraj(t, e) {
      hlas(e, t, { f: 784, delka: 0.08, h: 0.03, vlna: 'triangle' });
      hlas(e, t + 0.07, { f: 1175, delka: 0.12, h: 0.03, vlna: 'triangle' });
    },
  },
};

export const ID_EFEKTU = Object.keys(EFEKTY);
// Mezera, důležitost a jestli je to zvuk okna (pro test omezovače a zvuků menu).
export const POPIS_EFEKTU = Object.fromEntries(Object.entries(EFEKTY).map(([id, e]) => [id, { mezera: e.mezera, dulezity: Boolean(e.dulezity), okno: Boolean(e.okno) }]));
export const ZVUKY_OKEN = ID_EFEKTU.filter((id) => EFEKTY[id].okno);

// Zahraje efekt podle jména (zvuky ze hry i z oken). Neznámé jméno, vypnutý zvuk nebo plný limit = ticho.
export function zvukHry(id, sila = 0) {
  const efekt = EFEKTY[id];
  if (!efekt) return false;
  if (efekt.okno) statistika.oken += 1;
  const t = muze(id, efekt.mezera ?? 0.05, efekt.dulezity);
  if (t === null) return false;
  try {
    efekt.hraj(t, vystup.efekty, sila);
    zaznelo.push(id);
    if (zaznelo.length > MAX_ZAZNELO) zaznelo.shift();
    return true;
  } catch {
    return false;
  }
}

// Kolikrát se okno nebo menu o zvuk řeklo (menu.js podle toho pozná, že tlačítko už svůj zvuk má).
export const zadostiOken = () => statistika.oken;

// Zkratky pro okna a menu (dřívější jména).
export const zvukStartu = () => zvukHry('start');
export const zvukNakupu = () => zvukHry('nakup');
export const zvukOdmitnuti = () => zvukHry('odmitnuti');
export const zvukVolby = (stupen = 0) => zvukHry('volba', stupen);
export const zvukVyberu = () => zvukHry('vyber');
export const zvukZlataku = () => zvukHry('zlatak');
export const zvukPrehozeni = () => zvukHry('prehozeni');
export const zvukZvonu = (ozvena = false) => zvukHry('zvon', ozvena ? 1 : 0);
export const zvukKamene = (odraz = 1) => zvukHry('kamen', odraz);

// Hudba: jemná smyčka ze syntezátoru, každá mapa má svou náladu. Takt má 8 osmin, smyčka 4 takty (akordy).
// Na každý takt zazní podklad (akord), basa na 1. a 5. osminu a melodie podle rytmu (x = nota), tóny melodie
// se vybírají ze stupnice a akordu (každá smyčka trochu jinak, ale pořád stejně pro stejné kolo).
// tempo = doby za minutu, koren = MIDI číslo základního tónu, akordy = půltóny od kořene, oktava = melodie výš,
// ozvena = melodie má tichou ozvěnu, puls = osminy s tichým bubnem, jas = filtr podkladu (Hz).
// Při bossovi hraje stejná nálada rychleji, basa jede v osminách a přidají se bicí.
export const NALADY = {
  louka: {
    tempo: 92, koren: 62, vlna: 'triangle', jas: 1500, oktava: 0, rytmus: 'x..x.x..',
    akordy: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], stupnice: [0, 2, 4, 7, 9, 12, 14, 16],
  },
  jeskyne: {
    tempo: 64, koren: 57, vlna: 'sine', jas: 900, oktava: 12, ozvena: true, rytmus: 'x.....x.',
    akordy: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -2, 2]], stupnice: [0, 3, 5, 7, 10, 12, 15, 17],
  },
  jezero: {
    tempo: 70, koren: 64, vlna: 'sine', jas: 2000, oktava: 12, ozvena: true, rytmus: 'x...x.x.',
    akordy: [[0, 4, 7, 11], [2, 6, 9], [-3, 0, 4, 7], [-5, -1, 2, 6]], stupnice: [0, 2, 4, 6, 7, 11, 12, 14],
  },
  sopka: {
    tempo: 104, koren: 52, vlna: 'sawtooth', jas: 1000, oktava: 12, puls: [0, 3, 4], rytmus: 'x.xx..x.',
    akordy: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]], stupnice: [0, 1, 3, 5, 7, 8, 10, 12],
  },
  bazina: {
    tempo: 82, koren: 55, vlna: 'square', jas: 750, oktava: 0, puls: [0, 4], rytmus: '.x..x.x.',
    akordy: [[0, 3, 7], [5, 9, 12], [0, 3, 7], [-2, 2, 5]], stupnice: [0, 2, 3, 5, 7, 9, 10, 12],
  },
  hrbitov: {
    tempo: 68, koren: 62, vlna: 'triangle', jas: 950, oktava: 0, ozvena: true, rytmus: 'x..x..x.',
    akordy: [[0, 3, 7], [5, 8, 12], [-5, -1, 2], [0, 3, 7]], stupnice: [0, 2, 3, 5, 7, 8, 11, 12],
  },
  sad: {
    tempo: 88, koren: 60, vlna: 'triangle', jas: 1300, oktava: 0, rytmus: 'x.x..x..',
    akordy: [[0, 4, 7], [5, 9, 12], [-5, -1, 2], [-3, 0, 4]], stupnice: [0, 2, 4, 5, 7, 9, 12, 14],
  },
};
const RYTMUS_BOSSE = 'x.x.xx.x';
const ZRYCHLENI_BOSSE = 1.25;
// Jak daleko dopředu se noty plánují (s). Hudba se plánuje z hlavní smyčky každým snímkem.
const PREDSTIH = 0.25;
const hudbaStav = { nalada: null, krok: 0, dalsi: 0, cil: 0 };

// Pevný los z čísel (pro výběr tónů melodie): stejné kolo smyčky zahraje stejnou melodii.
function losHudby(a, b) {
  let x = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function naplanujKrok(n, krok, t, osmina, boss) {
  const h = vystup.nalada;
  const vTaktu = krok % 8;
  const takt = Math.floor(krok / 8) % n.akordy.length;
  const kolo = Math.floor(krok / (8 * n.akordy.length));
  const akord = n.akordy[takt];
  const delkaTaktu = osmina * 8;
  if (vTaktu === 0) {
    for (const x of akord) {
      hlas(h, t, {
        f: midi(n.koren - 12 + x), delka: delkaTaktu + 0.5, h: boss ? 0.016 : 0.02, vlna: boss ? 'sawtooth' : 'triangle',
        utok: Math.min(0.4, delkaTaktu * 0.3), drzeni: delkaTaktu * 0.55, fl: { f: boss ? n.jas * 0.8 : n.jas },
      });
    }
  }
  if (boss) {
    const f = midi(n.koren - 24 + akord[0] + (vTaktu % 2 ? 12 : 0));
    hlas(h, t, { f, delka: osmina * 0.9, h: 0.04, vlna: 'triangle' });
    if (vTaktu % 2 === 0) hlas(h, t, { f: 120, f2: 42, delka: 0.18, h: 0.08, vlna: 'sine' });
    else sumik(h, t, { delka: 0.04, h: 0.01, fl: { typ: 'highpass', f: 6000 } });
    if (vTaktu === 2 || vTaktu === 6) sumik(h, t, { delka: 0.12, h: 0.022, fl: { typ: 'bandpass', f: 1800, q: 0.9 } });
  } else {
    if (vTaktu === 0 || vTaktu === 4) hlas(h, t, { f: midi(n.koren - 24 + akord[0]), delka: osmina * 3.5, h: 0.05, vlna: 'triangle' });
    if (n.puls?.includes(vTaktu)) hlas(h, t, { f: 95, f2: 45, delka: 0.16, h: 0.035, vlna: 'sine' });
  }
  // Melodie: každý čtvrtý takt odpočívá (kromě bosse), tón z akordu (častěji) nebo ze stupnice.
  const rytmus = boss ? RYTMUS_BOSSE : n.rytmus;
  if (rytmus[vTaktu] !== 'x' || (!boss && (takt + kolo) % 4 === 3)) return;
  const los = losHudby(kolo % 4, krok % 32);
  const tony = los < 0.65 ? akord.map((x) => ((x % 12) + 12) % 12) : n.stupnice;
  const ton = tony[Math.floor(losHudby(krok % 32, kolo % 4 + 11) * tony.length)];
  const f = midi(n.koren + n.oktava + ton);
  const melodie = { f, delka: boss ? 0.22 : 0.5, h: n.vlna === 'sine' ? 0.035 : 0.026, vlna: n.vlna, utok: 0.006, fl: { f: n.jas * 2.2 } };
  hlas(h, t, melodie);
  if (n.ozvena && !boss) hlas(h, t + osmina * 3, { ...melodie, h: melodie.h * 0.3 });
  statistika.not += 1;
}

// Volá se každým snímkem: mapa = čí nálada hraje (null = ticho, hudba se plynule ztiší), boss = živý boss,
// tlumit = otevřené okno nebo pauza (hudba hraje dál, jen tišeji). Bez zvuku nebo s hudbou na 0 % nic.
export function hudba(mapa, { boss = false, tlumit = false } = {}) {
  if (!vystup) return;
  try {
    const t = kontext.currentTime;
    const n = mapa ? NALADY[mapa] ?? NALADY.louka : null;
    const cil = !n ? 0 : tlumit ? 0.45 : 1;
    if (cil !== hudbaStav.cil) {
      hudbaStav.cil = cil;
      vystup.nalada.gain.cancelScheduledValues(t);
      vystup.nalada.gain.setTargetAtTime(cil, t, cil ? 0.4 : 0.25);
    }
    if (!n) {
      hudbaStav.nalada = null;
      return;
    }
    if (hlasitost.ztlumeno || hlasitost.hudba <= 0 || kontext.state !== 'running') return;
    if (mapa !== hudbaStav.nalada) {
      hudbaStav.nalada = mapa;
      hudbaStav.krok = 0;
      hudbaStav.dalsi = t + 0.15;
    }
    // Po delší pauze (schovaný panel, ztlumeno) se nedohání, hraje se dál od teď.
    if (hudbaStav.dalsi < t - 0.1) hudbaStav.dalsi = t + 0.05;
    const osmina = 60 / (n.tempo * (boss ? ZRYCHLENI_BOSSE : 1)) / 2;
    while (hudbaStav.dalsi < t + PREDSTIH) {
      naplanujKrok(n, hudbaStav.krok, hudbaStav.dalsi, osmina, boss);
      hudbaStav.dalsi += osmina;
      hudbaStav.krok += 1;
    }
  } catch {
    // hudba nejde, hra běží dál
  }
}

// Ukázka hudby při změně její hlasitosti v nastavení: jeden měkký akord Louky (i v menu, kde hudba nehraje).
export function ukazkaHudby() {
  statistika.oken += 1;
  if (!vystup || hlasitost.ztlumeno || hlasitost.hudba <= 0 || !smiHrat()) return;
  try {
    const t = kontext.currentTime + 0.01;
    const n = NALADY.louka;
    for (const x of n.akordy[0]) hlas(vystup.hudba, t, { f: midi(n.koren - 12 + x), delka: 0.9, h: 0.02, vlna: 'triangle', utok: 0.08, drzeni: 0.3, fl: { f: n.jas } });
    hlas(vystup.hudba, t, { f: midi(n.koren - 24), delka: 0.8, h: 0.05, vlna: 'triangle' });
  } catch {
    // bez zvuku
  }
}
