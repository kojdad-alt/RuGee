// Okno kupce: zboží jako karty (ikona, jméno, co udělá, cena se zlaťákem, kolik má kupec ještě na voze).
// Jen DOM: co zboží stojí a co udělá, je v hra.js (nabidkaKupce, kup). Vzhled karet je stejný jako u karet
// vylepšení, jen s mosazným rámečkem a cenovkou místo rarity (style.css, .zbozi). Nadpis je pixelovým písmem.
import { nabidkaKupce } from './hra.js';
import { obrazekSpritu, vyberTlacitko } from './menu.js';
import { pixelovyNadpis, prizpusobNadpisy } from './pismo.js';

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

// 1 zlaťák, 2–4 zlaťáky, 5 zlaťáků
export function textZlataku(kolik) {
  if (kolik === 1) return '1 zlaťák';
  return `${kolik} ${kolik >= 2 && kolik <= 4 ? 'zlaťáky' : 'zlaťáků'}`;
}

// Cena se zlaťákem: ikona mince a číslo.
export function cenaSMinci(kolik, meritko = 2) {
  const cena = prvek('span', 'cena-zlato');
  cena.append(obrazekSpritu('zlatak', meritko), prvek('b', '', String(kolik)));
  return cena;
}

function kartaZbozi(z, i) {
  const karta = prvek('button', `karta zbozi${z.prekazka ? ' nejde' : ''}`);
  karta.type = 'button';
  karta.dataset.id = z.id;
  karta.style.setProperty('--poradi', String(i));
  const pruh = prvek('span', 'karta-rarita');
  pruh.append(cenaSMinci(z.cena));
  const ikona = prvek('span', 'karta-ikona');
  ikona.append(obrazekSpritu(z.ikona, 6));
  const text = prvek('span', 'karta-text');
  const zasoba = prvek('span', `zbozi-zasoba${z.zbyva > 0 ? '' : ' vyprodano'}`, z.zbyva > 0 ? 'Na voze: ' : 'Vyprodáno');
  if (z.zbyva > 0) zasoba.append(prvek('b', '', String(z.zbyva)));
  text.append(prvek('b', 'karta-nazev', z.nazev), prvek('span', 'karta-popis', null));
  text.querySelector('.karta-popis').append(prvek('small', '', z.popis));
  if (z.prekazka && z.zbyva > 0) text.append(prvek('span', 'zbozi-prekazka', z.prekazka));
  text.append(zasoba);
  karta.append(pruh, ikona, text, prvek('kbd', 'karta-klavesa', String(i + 1)));
  karta.setAttribute('aria-label', `${i + 1}. ${z.nazev} za ${textZlataku(z.cena)}. ${z.popis}.${z.prekazka ? ` ${z.prekazka}.` : ''}`);
  return karta;
}

// Vyplní a ukáže okno obchodu. kup(id) se zavolá po kliku na zboží (i na to, které koupit nejde: okno pak
// zatřese kartou), vybrat = id zboží, které má zůstat vybrané (po nákupu).
export function ukazObchod(okno, hra, kup, vybrat = null) {
  const k = hra.kupec;
  okno.querySelector('#obchod-stitek').textContent = `Kupec tu bude ještě ${Math.ceil(k?.zbyva ?? 0)} s`;
  const penize = okno.querySelector('#obchod-penize');
  penize.replaceChildren(prvek('span', '', 'Máš'), cenaSMinci(hra.zlataky, 3));
  if (hra.klice > 0) {
    const klice = prvek('span', 'obchod-klice');
    klice.append(obrazekSpritu('klic', 3), prvek('b', '', String(hra.klice)));
    penize.append(klice);
  }
  if (hra.prehozeniZdarma > 0) penize.append(prvek('small', '', `přehození zdarma: ${hra.prehozeniZdarma}`));
  const nakup = okno.querySelector('#obchod-nakup');
  nakup.textContent = hra.posledniNakup ? `Koupeno: ${hra.posledniNakup.text}` : '';
  const karty = nabidkaKupce(hra).map((z, i) => {
    const karta = kartaZbozi(z, i);
    karta.addEventListener('click', () => kup(z.id));
    karta.addEventListener('pointerover', () => { if (!karta.classList.contains('vybrano')) vyberTlacitko(karta); });
    return karta;
  });
  const zbozi = okno.querySelector('#zbozi');
  // Po nákupu se karty jen překreslí (bez animace příchodu), ať okno neposkakuje.
  zbozi.classList.toggle('bez-prichodu', !okno.hidden);
  zbozi.replaceChildren(...karty);
  pixelovyNadpis(okno.querySelector('#obchod-nadpis'), 'Vůz kupce', { min: 2, max: 4 });
  okno.hidden = false;
  prizpusobNadpisy(okno);
  const vybrana = karty.find((karta) => karta.dataset.id === vybrat);
  if (vybrana) vyberTlacitko(vybrana);
}

// Karta zboží, které koupit nejde, se zatřese.
export function zatresZbozim(okno, id) {
  const karta = okno.querySelector(`.zbozi[data-id="${id}"]`);
  if (!karta) return;
  karta.classList.remove('zatrast');
  void karta.offsetWidth;
  karta.classList.add('zatrast');
}
