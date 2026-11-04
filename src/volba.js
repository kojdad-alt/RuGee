// Okno výběru vylepšení při nové úrovni a z truhly bosse. Karta má raritu (barevný pixelový rámeček,
// u vyšších záře), ikonu zbraně nebo pasivy, úrovně jako čtverečky a bonus rarity. Jen DOM:
// co karta dá a jak často která rarita padá, je v hra.js. Animace příchodu karet je v style.css.
// Tady je i okno porovnání výbavy bossů (nový kus do obsazeného slotu: Vzít / Nechat), karty kusů vypadají
// stejně jako karty vylepšení. Co kusy dávají, je v vystroj.js. Pod kartami je tlačítko Přehodit (za zlaťáky
// nebo zdarma od kupce, cena v hra.js).
import { RARITY, PORADI_RARIT, ZAKLAD_UROVNI, sanceRarit, stupenUrovne, BOSSOVE, cenaPrehozeni, CENA_ZAMCENE } from './hra.js';
import {
  RARITY_VYBAVY, PORADI_RARIT_VYBAVY, SLOTY, VYBAVA, EFEKTY_VYBAVY, PORADI_SLOTU, radkyStatu, rozdilStatu, popisEfektu,
  zlatakyZaKus,
} from './vystroj.js';
import { obrazekSpritu, vyberTlacitko } from './menu.js';
import { cenaSMinci } from './obchod.js';

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
    // Úrovně nemají strop: čtverečky ukazují pětici, do které nová úroveň padne (1–5, 6–10, …), v barvě
    // jejího stupně jako rámeček v přehledu výbavy.
    const blok = Math.floor((volba.uroven - 1) / ZAKLAD_UROVNI) * ZAKLAD_UROVNI;
    const ctverecky = prvek('span', `karta-ctverecky stupen-${stupenUrovne(blok + 1)}`);
    for (let u = blok + 1; u <= blok + ZAKLAD_UROVNI; u++) ctverecky.append(prvek('i', u <= volba.od ? 'plny' : u <= volba.uroven ? 'novy' : ''));
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

// 1 zlaťák, 2–4 zlaťáky, 5 zlaťáků
function zlataky(kolik) {
  if (kolik === 1) return '1 zlaťák';
  return `${kolik} ${kolik >= 2 && kolik <= 4 ? 'zlaťáky' : 'zlaťáků'}`;
}

// Řádek pod nadpisem okna karet z truhly: kus, který se rovnou nasadil (sprite, jméno, rarita, staty).
function radekKusu(prvekRadku, kus) {
  prvekRadku.hidden = !kus;
  if (!kus) return;
  prvekRadku.className = `volba-kus rarita-${kus.rarita}`;
  const text = prvek('span', 'volba-kus-text');
  text.append(
    prvek('b', '', `Nasazeno: ${kus.nazev}`),
    prvek('small', '', `${SLOTY[kus.slot].nazev} · ${RARITY_VYBAVY[kus.rarita].nazev} · ${radkyStatu(kus.staty).join(', ')}`),
  );
  prvekRadku.replaceChildren(obrazekSpritu(kus.id, 3), text);
}

// Tlačítko Přehodit: zdarma (od kupce), nebo cena se zlaťákem. Na co zlaťáky nestačí, je šedé.
export function ukazPrehozeni(tlacitko, hra) {
  const cena = cenaPrehozeni(hra);
  tlacitko.classList.toggle('nejde', cena > hra.zlataky);
  tlacitko.replaceChildren(prvek('span', '', 'Přehodit karty'), prvek('kbd', '', 'R'));
  if (cena === 0) tlacitko.append(prvek('b', 'prehodit-zdarma', `zdarma ×${hra.prehozeniZdarma}`));
  else tlacitko.append(cenaSMinci(cena));
  tlacitko.setAttribute('aria-label', cena === 0 ? `Přehodit karty zdarma, zbývá ${hra.prehozeniZdarma}` : `Přehodit karty za ${cena} zlaťáků`);
}

// Vyplní a ukáže okno. zvol(i) se zavolá po kliku na kartu. Vrací stupeň nejvzácnější karty (0 běžná … 3 legendární).
// Zamčená truhla (truhlaOd = 'zamcena') má vlastní nadpis a štítek, čím se odemkla.
export function ukazVolby(okno, hra, zvol) {
  const truhla = hra.zTruhly;
  const zamcena = truhla && hra.truhlaOd === 'zamcena';
  okno.classList.toggle('z-truhly', truhla);
  const porazen = BOSSOVE[hra.truhlaOd]?.porazen ?? 'Boss poražen';
  const odemceno = hra.odemceno === 'klic' ? 'Odemčeno klíčem' : `Odemčeno za ${CENA_ZAMCENE} zlaťáků`;
  okno.querySelector('#volba-stitek').textContent = zamcena ? odemceno : truhla ? porazen : `Úroveň ${hra.hrdina.uroven}`;
  okno.querySelector('#volba-nadpis').textContent = zamcena ? 'Zamčená truhla' : truhla ? 'Truhla bosse' : 'Nová úroveň';
  const kus = okno.querySelector('#volba-kus');
  if (kus) radekKusu(kus, truhla ? hra.truhlaKus : null);

  const karty = hra.volby.map((v, i) => {
    const karta = vytvorKartu(v, i);
    karta.addEventListener('click', () => zvol(i));
    karta.addEventListener('pointerover', () => { if (!karta.classList.contains('vybrano')) vyberTlacitko(karta); });
    return karta;
  });
  okno.querySelector('#karty').replaceChildren(...karty);

  // Šance na vzácnější karty právě teď: roste s časem a se Štěstím, truhla dává aspoň vzácnou.
  const sance = sanceRarit(hra, truhla ? 'vzacna' : 'bezna');
  const prehodit = okno.querySelector('#prehodit');
  if (prehodit) ukazPrehozeni(prehodit, hra);
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

// Kolik kusů sady bosse by hrdina měl na sobě, kdyby v slotu měl tenhle kus.
function kusuSady(hra, kus) {
  return PORADI_SLOTU.filter((slot) => (slot === kus.slot ? kus : hra.vystroj[slot])?.boss === kus.boss).length;
}

// Karta kusu výbavy: rarita, sprite, jméno, slot a sada, staty, efekt sady (s tím, kolik kusů sady by hrdina
// měl) a co tlačítko udělá. rozdil = řádky, čím je nový kus lepší (zeleně) nebo horší (červeně) než nasazený.
export function vytvorKartuKusu(kus, { stitek, akce, klavesa, rozdil = [], sada = 1 }) {
  const rarita = RARITY_VYBAVY[kus.rarita] ?? RARITY_VYBAVY.bezna;
  const karta = prvek('button', `karta kus rarita-${kus.rarita}`);
  karta.type = 'button';
  karta.style.setProperty('--poradi', String(klavesa - 1));
  const ikona = prvek('span', 'karta-ikona');
  ikona.append(obrazekSpritu(kus.id, 6));
  const text = prvek('span', 'karta-text');
  text.append(prvek('b', 'karta-nazev', kus.nazev), prvek('span', 'karta-uroven', `${SLOTY[kus.slot].nazev} · ${VYBAVA[kus.boss].sada}`));
  const popis = prvek('span', 'karta-popis');
  popis.append(...radkyStatu(kus.staty).map((radek) => prvek('small', 'kus-stat', radek)));
  text.append(popis);
  if (rozdil.length) {
    const r = prvek('span', 'kus-rozdil');
    r.append(...rozdil.map((x) => prvek('small', x.rozdil > 0 ? 'lepsi' : 'horsi', x.text)));
    text.append(r);
  }
  const efekt = EFEKTY_VYBAVY[VYBAVA[kus.boss].efekt];
  const bonus = prvek('span', 'karta-bonus');
  bonus.append(prvek('small', '', `${efekt.nazev} (${sada}/${PORADI_SLOTU.length}): ${popisEfektu(kus.boss, sada)}`));
  text.append(bonus, prvek('span', 'kus-akce', akce));
  karta.append(prvek('span', 'karta-rarita', `${stitek} · ${rarita.nazev}`), ikona, text, prvek('kbd', 'karta-klavesa', String(klavesa)));
  karta.setAttribute('aria-label', `${klavesa}. ${akce}: ${kus.nazev}, ${rarita.nazev}. ${radkyStatu(kus.staty).join('. ')}`);
  return karta;
}

// Okno porovnání: vlevo nový kus (Vzít), vpravo nasazený (Nechat). rozhodni(vzit) se zavolá po kliku.
// Vrací stupeň rarity nového kusu (0 běžná … 3 legendární) pro znělku.
export function ukazPorovnani(okno, hra, rozhodni) {
  const { novy, nasazeny } = hra.porovnani;
  // Kus koupený u kupce nepřišel z poraženého bosse.
  okno.querySelector('#porovnani-stitek').textContent = hra.obchod ? 'Koupeno u kupce' : BOSSOVE[novy.boss]?.porazen ?? 'Boss poražen';
  okno.querySelector('#porovnani-podtitul').textContent = `Slot ${SLOTY[novy.slot].nazev} už je obsazený. Kus, který si nenecháš, se rozloží na zlaťáky.`;
  const karty = [
    vytvorKartuKusu(novy, {
      stitek: 'Nový', akce: `Vzít · starý dá ${zlataky(zlatakyZaKus(nasazeny))}`, klavesa: 1,
      rozdil: rozdilStatu(novy, nasazeny), sada: kusuSady(hra, novy),
    }),
    vytvorKartuKusu(nasazeny, {
      stitek: 'Nasazený', akce: `Nechat · nový dá ${zlataky(zlatakyZaKus(novy))}`, klavesa: 2, sada: kusuSady(hra, nasazeny),
    }),
  ];
  karty.forEach((karta, i) => {
    karta.addEventListener('click', () => rozhodni(i === 0));
    karta.addEventListener('pointerover', () => { if (!karta.classList.contains('vybrano')) vyberTlacitko(karta); });
  });
  okno.querySelector('#porovnani-kusy').replaceChildren(...karty);
  okno.hidden = false;
  return Math.max(0, PORADI_RARIT_VYBAVY.indexOf(novy.rarita));
}
