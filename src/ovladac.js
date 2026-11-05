// Ovladač (Gamepad API): levá páčka nebo kříž = pohyb a výběr v menu a oknech, A potvrdí, B zpět (v pauze
// pokračuje, u kupce odejde, po prohře do menu), X přehodí karty, Start pauza (v hlavním menu Hrát), Back ztlumí
// zvuk. Prohlížeč ovladač ukáže až po prvním stisku tlačítka na něm (ochrana soukromí), do té doby getGamepads()
// nic nevrací.
// Čtení je bez DOM (test ho pustí v Node): vytvorCtecku().precti(gamepady, cas, ui) vrátí pohyb hrdiny a stisky
// (hrana, ne držení). Co stisk udělá, rozhoduje main.js (menu.js v menu). Stisk, kterým se ovladač ohlásil, jen
// přepne nápovědy, nic nespustí (v Ovládání by jinak A hned stisklo Zpět). Dole jsou značky tlačítek pro nápovědy:
// stejné pozice tlačítek, jiné nápisy podle ovladače (Xbox a ostatní A/B/X/Y, PlayStation křížek/kolečko/čtverec,
// Nintendo B/A/Y/X). Obrázky značek kreslí nastroje/ramy.mjs do style.css (--tl-*).
import { t } from './texty.js';

// Páčka pod čtvrtinou výchylky stojí (staré ovladače se samy trochu kloní), nad ní jde hrdina plnou rychlostí
// (hra.js směr normalizuje), jen směrem páčky.
export const MRTVA_ZONA = 0.25;
// Výběr v menu páčkou: směr se chytí nad PRAH_VYBERU a pustí až pod PRAH_PUSTENI, ať na hraně necuká.
export const PRAH_VYBERU = 0.55;
export const PRAH_PUSTENI = 0.35;
// Držený směr v menu opakuje výběr: poprvé po PRVNI_OPAKOVANI s, pak každých OPAKOVANI s.
export const PRVNI_OPAKOVANI = 0.4;
export const OPAKOVANI = 0.12;

// Standardní rozložení (mapping 'standard'): spodní, pravé, levé a horní tlačítko, ramena, Back/Select, Start
// a kříž. Ovladače bez standardního rozložení mají tlačítka většinou stejně.
export const TLACITKA = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, zpet: 8, start: 9, nahoru: 12, dolu: 13, vlevo: 14, vpravo: 15 };
export const STISKY = ['a', 'b', 'x', 'y', 'lb', 'rb', 'zpet', 'start'];
export const SMERY = ['nahoru', 'dolu', 'vlevo', 'vpravo'];
export const RODINY = ['xbox', 'playstation', 'nintendo'];

// Druh ovladače podle id (Chrome: „… Vendor: 054c …“, Firefox: „054c-09cc-…“). Neznámý = Xbox (A dole, B vpravo),
// tak je popsaná většina ovladačů pro počítač i Steam Deck.
export function rodina(id = '') {
  const s = String(id ?? '').toLowerCase();
  if (/054c|playstation|dualshock|dualsense/.test(s)) return 'playstation';
  if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'nintendo';
  return 'xbox';
}

// Pohyb z páčky: pod mrtvou zónou nic, nad ní směr s velikostí 0–1 (nic nepřeleze 1, NaN = stojí).
export function pohybPacky(x, y) {
  const d = Math.hypot(x, y);
  if (!(d > MRTVA_ZONA) || !Number.isFinite(d)) return { dx: 0, dy: 0 };
  const sila = Math.min(1, (d - MRTVA_ZONA) / (1 - MRTVA_ZONA));
  return { dx: (x / d) * sila, dy: (y / d) * sila };
}

// Směr páčky pro výběr v menu (převažující osa) s hysterezí: držený směr platí, dokud jeho osa neklesne pod
// PRAH_PUSTENI, nový se chytí až nad PRAH_VYBERU.
export function smerPacky(x, y, predchozi = null) {
  const ax = Math.abs(x) || 0;
  const ay = Math.abs(y) || 0;
  if (predchozi) {
    const osa = predchozi === 'vlevo' || predchozi === 'vpravo' ? x : y;
    const znamenko = predchozi === 'vpravo' || predchozi === 'dolu' ? 1 : -1;
    if (osa * znamenko >= PRAH_PUSTENI) return predchozi;
  }
  if (Math.max(ax, ay) < PRAH_VYBERU) return null;
  if (ax >= ay) return x > 0 ? 'vpravo' : 'vlevo';
  return y > 0 ? 'dolu' : 'nahoru';
}

function stisknuto(pad, i) {
  const b = pad.buttons?.[i];
  if (b === undefined || b === null) return false;
  if (typeof b === 'object') return Boolean(b.pressed) || Number(b.value) > 0.5;
  return Number(b) > 0.5;
}

// Čtečka drží stav mezi snímky (co bylo stisknuté, držený směr, opakování). precti(gamepady, cas, ui):
// gamepady = navigator.getGamepads() (i s null), cas v s, ui = je otevřené menu nebo okno (jen tam se posílají
// směry). Vrací { pohyb, udalosti, pripojeno, rodina, aktivita }: udalosti jsou směry a stisky ('a', 'start'…)
// a 'odpojen', když ovladač zmizel. Směr držený ve hře se v okně, které se mezitím otevřelo, nepočítá, dokud ho
// hráč nepustí (jinak by držená páčka hned posunula výběr karet).
export function vytvorCtecku() {
  let drzene = new Set();
  let smer = null;
  let smerZPacky = null;
  let blokovany = null;
  let dalsiOpakovani = 0;
  let pripojeno = 0;
  let posledniRodina = 'xbox';
  return {
    precti(gamepady, cas, ui = true) {
      const pady = Array.from(gamepady ?? []).filter((p) => p && p.connected !== false);
      const ted = new Set();
      let px = 0;
      let py = 0;
      let aktivita = false;
      for (const pad of pady) {
        let tenhle = false;
        for (const jmeno of [...STISKY, ...SMERY]) {
          if (stisknuto(pad, TLACITKA[jmeno])) {
            ted.add(jmeno);
            tenhle = true;
          }
        }
        const x = Number(pad.axes?.[0]) || 0;
        const y = Number(pad.axes?.[1]) || 0;
        if (Math.hypot(x, y) > MRTVA_ZONA) tenhle = true;
        if (Math.hypot(x, y) > Math.hypot(px, py)) {
          px = x;
          py = y;
        }
        // Značky v nápovědě podle ovladače, na kterém hráč zrovna hraje.
        if (tenhle || pady.length === 1) posledniRodina = rodina(pad.id);
        aktivita ||= tenhle;
      }

      let pohyb = pohybPacky(px, py);
      const kx = (ted.has('vpravo') ? 1 : 0) - (ted.has('vlevo') ? 1 : 0);
      const ky = (ted.has('dolu') ? 1 : 0) - (ted.has('nahoru') ? 1 : 0);
      if (!pohyb.dx && !pohyb.dy && (kx || ky)) {
        const d = Math.hypot(kx, ky);
        pohyb = { dx: kx / d, dy: ky / d };
      }

      // Směr pro výběr: nově stisknutý kříž má přednost, pak držený směr, pak cokoli drženého.
      smerZPacky = smerPacky(px, py, smerZPacky);
      const aktivni = SMERY.filter((s) => ted.has(s));
      if (smerZPacky && !aktivni.includes(smerZPacky)) aktivni.push(smerZPacky);
      const novy = SMERY.find((s) => ted.has(s) && !drzene.has(s)) ?? (aktivni.includes(smer) ? smer : aktivni[0] ?? null);
      const udalosti = [];
      // Nový ovladač (ohlásil se stiskem): co drží, se bere jako držené od dřív, směr až po puštění.
      const novyOvladac = pady.length > pripojeno;
      if (novyOvladac) drzene = new Set([...drzene, ...ted]);
      if (!ui || novyOvladac) blokovany = novy;
      else if (novy !== blokovany) blokovany = null;
      if (ui && novy && novy !== blokovany) {
        if (novy !== smer) {
          udalosti.push(novy);
          dalsiOpakovani = cas + PRVNI_OPAKOVANI;
        } else if (cas >= dalsiOpakovani) {
          udalosti.push(novy);
          // podle plánu, ne od snímku (opakování se neposouvá), po zaseknutí stránky ale nedohání
          dalsiOpakovani += OPAKOVANI;
          if (dalsiOpakovani <= cas) dalsiOpakovani = cas + OPAKOVANI;
        }
      }
      smer = novy;

      for (const jmeno of STISKY) if (ted.has(jmeno) && !drzene.has(jmeno)) udalosti.push(jmeno);
      if (pady.length < pripojeno) udalosti.push('odpojen');
      pripojeno = pady.length;
      drzene = ted;
      return { pohyb, udalosti, pripojeno, rodina: posledniRodina, aktivita };
    },
  };
}

// Nápověda se značkami: text ze slovníku, ve kterém {a}, {b}, {x}, {y}, {start}, {zpet}, {packa} a {kriz} jsou
// tlačítka ovladače. Vrací kousky [{ text }, { tlacitko }] (bez DOM).
export const ZNACKY = ['a', 'b', 'x', 'y', 'start', 'zpet', 'packa', 'kriz'];
const VZOR_ZNACKY = new RegExp(`\\{(${ZNACKY.join('|')})\\}`, 'g');

export function rozdelNapovedu(text) {
  const kusy = [];
  let od = 0;
  for (const m of String(text).matchAll(VZOR_ZNACKY)) {
    if (m.index > od) kusy.push({ text: text.slice(od, m.index) });
    kusy.push({ tlacitko: m[1] });
    od = m.index + m[0].length;
  }
  if (od < text.length) kusy.push({ text: text.slice(od) });
  return kusy;
}

// Obrázek značky (--tl-<obrazek> ve style.css) podle druhu ovladače. Start a Back jsou nápis (slovník
// ovladac.znaky.<rodina>), páčka a kříž jsou na všech ovladačích stejné.
export const OBRAZKY_ZNACEK = {
  xbox: { a: 'a', b: 'b', x: 'x', y: 'y' },
  playstation: { a: 'ps-krizek', b: 'ps-kolecko', x: 'ps-ctverec', y: 'ps-trojuhelnik' },
  nintendo: { a: 'b', b: 'a', x: 'y', y: 'x' },
};
const OBRAZKY_VSUDE = { packa: 'packa', kriz: 'kriz' };

export function obrazekZnacky(tlacitko, r = 'xbox') {
  return OBRAZKY_VSUDE[tlacitko] ?? OBRAZKY_ZNACEK[r]?.[tlacitko] ?? null;
}

// Stav ovladače pro menu a nápovědy: kolik je připojených, jaký druh a jestli hráč naposledy hrál na něm
// (aktivni; klávesa, myš nebo dotyk ho vrátí na klávesnici). Posluchači dostanou, co se změnilo.
const stav = { pripojeno: 0, rodina: 'xbox', aktivni: false };
const posluchaci = new Set();

export function stavOvladace() {
  return stav;
}

export function nastavOvladac(zmena) {
  const zmeneno = {};
  for (const [k, v] of Object.entries(zmena)) {
    if (v === undefined || stav[k] === v) continue;
    stav[k] = v;
    zmeneno[k] = v;
  }
  if (stav.pripojeno === 0 && stav.aktivni) {
    stav.aktivni = false;
    zmeneno.aktivni = false;
  }
  if (Object.keys(zmeneno).length) for (const p of [...posluchaci]) p(zmeneno, stav);
  return zmeneno;
}

// Najetí myší vybírá tlačítka, jen když hráč nehraje na ovladači: Chrome po změně stránky pošle najetí i myši,
// která stojí (karty se otevřou pod kurzorem), a ta by ovladači brala výběr.
export function mysVybira() {
  return !stav.aktivni;
}

export function priZmeneOvladace(posluchac) {
  posluchaci.add(posluchac);
  return () => posluchaci.delete(posluchac);
}

// --- DOM (jen v prohlížeči) ---

// Značka tlačítka: pixelový obrázek (A/B/X/Y, symboly PlayStation, páčka, kříž), nebo dřevěná klávesa s nápisem
// (Start, Back, Options). Čtečka dostane jméno tlačítka.
export function znackaTlacitka(tlacitko, r = stav.rodina) {
  const nazev = t(`ovladac.znaky.${r}.${tlacitko}`);
  const obrazek = obrazekZnacky(tlacitko, r);
  if (!obrazek) {
    const k = document.createElement('kbd');
    k.className = 'tl-text';
    k.textContent = nazev;
    return k;
  }
  const e = document.createElement('i');
  e.className = 'tl-ovladace';
  e.dataset.znak = obrazek;
  e.setAttribute('role', 'img');
  e.setAttribute('aria-label', nazev);
  return e;
}

// Text se značkami do prvku (nahradí obsah).
export function vyplnZnackami(prvek, text, r = stav.rodina) {
  prvek.replaceChildren(...rozdelNapovedu(text).map((k) => (k.text !== undefined ? k.text : znackaTlacitka(k.tlacitko, r))));
  return prvek;
}

// Přípona tlačítka „ (B)“ jako „ (Esc)“ u klávesnice: ukáže se, jen když hráč hraje na ovladači (.jen-ovladac).
export function jenOvladac(tlacitko) {
  const e = document.createElement('span');
  e.className = 'jen-ovladac';
  e.dataset.tl = tlacitko;
  return vyplnZnackyPrvku(e);
}

function vyplnZnackyPrvku(e) {
  if (e.dataset.tOvladac) return vyplnZnackami(e, t(e.dataset.tOvladac));
  e.replaceChildren(' (', znackaTlacitka(e.dataset.tl), ')');
  return e;
}

// Všechny nápovědy stránky pro ovladač (data-t-ovladac = klíč slovníku, data-tl = přípona tlačítka) znovu:
// po startu, po přepnutí jazyka a po změně druhu ovladače.
export function vyplnNapovedy(koren = document) {
  for (const e of koren.querySelectorAll('[data-t-ovladac], .jen-ovladac[data-tl]')) vyplnZnackyPrvku(e);
}
