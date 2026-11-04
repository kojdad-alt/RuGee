// Okno výběru vylepšení při nové úrovni a z truhly Strážce. Karta má raritu (barevný pixelový rámeček,
// u vyšších záře), ikonu zbraně nebo pasivy, úrovně jako čtverečky a bonus rarity. Jen DOM:
// co karta dá a jak často která rarita padá, je v hra.js. Animace příchodu karet je v style.css.
import { RARITY, PORADI_RARIT, MAX_UROVEN, sanceRarit } from './hra.js';
import { obrazekSpritu, vyberTlacitko } from './menu.js';

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

// 0,9 % · 4,6 % · 17 % (pod deset procent s jedním desetinným místem)
function procenta(p) {
  const x = p * 100;
  return `${x < 10 ? x.toFixed(1).replace('.', ',') : Math.round(x)} %`;
}

export function vytvorKartu(volba, i) {
  const rarita = RARITY[volba.rarita] ?? RARITY.bezna;
  const karta = prvek('button', `karta rarita-${volba.rarita}`);
  karta.type = 'button';
  karta.dataset.rarita = volba.rarita;
  karta.style.setProperty('--poradi', String(i));

  const ikona = prvek('span', 'karta-ikona');
  ikona.append(obrazekSpritu(volba.ikona, 6));

  const text = prvek('span', 'karta-text');
  text.append(prvek('b', 'karta-nazev', volba.nazev));
  if (volba.druh !== 'leceni') {
    const nova = volba.druh === 'zbran' ? 'Nová zbraň' : 'Nové';
    const kam = volba.od === 0 ? `${nova}${volba.uroven > 1 ? ` · úr. ${volba.uroven}` : ''}` : `Úroveň ${volba.od} → ${volba.uroven}`;
    text.append(prvek('span', 'karta-uroven', kam));
    const ctverecky = prvek('span', 'karta-ctverecky');
    for (let u = 0; u < MAX_UROVEN; u++) ctverecky.append(prvek('i', u < volba.od ? 'plny' : u < volba.uroven ? 'novy' : ''));
    text.append(ctverecky);
  }
  const popis = prvek('span', 'karta-popis');
  popis.append(...volba.popis.map((radek) => prvek('small', '', radek)));
  text.append(popis);
  if (volba.bonusy.length) {
    const bonus = prvek('span', 'karta-bonus');
    bonus.append(...volba.bonusy.map((radek) => prvek('small', '', radek)));
    text.append(bonus);
  }

  karta.append(prvek('span', 'karta-rarita', rarita.nazev), ikona, text, prvek('kbd', 'karta-klavesa', String(i + 1)));
  karta.setAttribute('aria-label', `${i + 1}. ${rarita.nazev}: ${volba.nazev}. ${[...volba.popis, ...volba.bonusy].join('. ')}`);
  return karta;
}

// Vyplní a ukáže okno. zvol(i) se zavolá po kliku na kartu. Vrací stupeň nejvzácnější karty (0 běžná … 3 legendární).
export function ukazVolby(okno, hra, zvol) {
  const truhla = hra.zTruhly;
  okno.classList.toggle('z-truhly', truhla);
  okno.querySelector('#volba-stitek').textContent = truhla ? 'Strážce poražen' : `Úroveň ${hra.hrdina.uroven}`;
  okno.querySelector('#volba-nadpis').textContent = truhla ? 'Truhla Strážce' : 'Nová úroveň';

  const karty = hra.volby.map((v, i) => {
    const karta = vytvorKartu(v, i);
    karta.addEventListener('click', () => zvol(i));
    karta.addEventListener('pointerover', () => { if (!karta.classList.contains('vybrano')) vyberTlacitko(karta); });
    return karta;
  });
  okno.querySelector('#karty').replaceChildren(...karty);

  // Šance na vzácnější karty právě teď: roste s časem a se Štěstím, truhla dává aspoň vzácnou.
  const sance = sanceRarit(hra, truhla ? 'vzacna' : 'bezna');
  const radek = okno.querySelector('#volba-sance');
  radek.replaceChildren(prvek('span', '', truhla ? 'Truhla dává aspoň vzácnou kartu:' : 'Šance na kartu:'));
  for (const id of PORADI_RARIT.slice(1)) {
    const polozka = prvek('span', `sance rarita-${id}`);
    polozka.append(prvek('i'), `${RARITY[id].nazev} ${procenta(sance[id])}`);
    radek.append(polozka);
  }

  okno.hidden = false;
  return Math.max(0, ...hra.volby.map((v) => PORADI_RARIT.indexOf(v.rarita)));
}
