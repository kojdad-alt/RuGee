// Hlavní menu: pixelové logo, tlačítka a záložky. Jen DOM a vstup, pravidla hry sem nepatří.
// Novou záložku přidáš do ZALOZKY (nazev + vypln(panel)), tlačítko i ovládání šipkami se udělají samy.
// Tlačítka, která záložka do panelu přidá, jdou taky vybírat šipkami a Enterem.
import { sprity } from './sprity.js';
import { TRIDY, ZBRANE, platnaTrida } from './hra.js';
import { nactiRekord, nactiTridu, ulozTridu, nactiDuse, ulozDuse } from './ulozeni.js';
import { VYLEPSENI, cenaVylepseni, kupVylepseni, vratDuse, utraceno } from './duse.js';
import { odemkniZvuk, zvukNakupu, zvukOdmitnuti } from './zvuk.js';

// Zvolená třída hrdiny: načte se z prohlížeče a mění se v záložce Postavy. Hra ji bere při startu.
let trida = nactiTridu();

export function zvolenaTrida() {
  return trida;
}

export function formatCas(s) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

// Zvětšená kopie spritu jako obrázek do stránky (originál zůstává pro kreslení hry).
export function obrazekSpritu(jmeno, meritko = 4) {
  const zdroj = sprity[jmeno];
  const c = prvek('canvas', 'pixel');
  c.width = zdroj.width;
  c.height = zdroj.height;
  c.getContext('2d').drawImage(zdroj, 0, 0);
  c.style.width = `${zdroj.width * meritko}px`;
  c.style.height = `${zdroj.height * meritko}px`;
  return c;
}

// Karta třídy je tlačítko: klik (nebo Enter) třídu zvolí a uloží, zvolená karta svítí zlatě.
function vyplnPostavy(panel) {
  const mrizka = prvek('div', 'mrizka-trid');
  const karty = Object.entries(TRIDY).map(([id, t]) => {
    const karta = prvek('button', 'trida');
    karta.type = 'button';
    karta.dataset.trida = id;
    const text = prvek('span', 'trida-text');
    text.append(
      prvek('b', '', t.nazev),
      prvek('small', 'trida-zbran', `Začíná: ${ZBRANE[t.zbran].nazev}`),
      prvek('small', 'trida-vyhoda', t.vyhoda),
      prvek('small', '', t.popis),
    );
    karta.append(obrazekSpritu(id, 5), text, prvek('span', 'trida-stitek', 'Zvoleno'));
    karta.addEventListener('click', () => {
      trida = platnaTrida(id);
      ulozTridu(trida);
      oznacZvolenou();
    });
    return karta;
  });
  function oznacZvolenou() {
    for (const k of karty) {
      const zvolena = k.dataset.trida === trida;
      k.classList.toggle('zvolena', zvolena);
      k.setAttribute('aria-pressed', String(zvolena));
    }
  }
  oznacZvolenou();
  mrizka.append(...karty);
  panel.append(prvek('p', 'podtitul', 'Vyber, za koho půjdeš do hlubin. Volba se zapamatuje.'), mrizka);
}

// 1–4 duše, jinak duší (0 duší, 5 duší).
export function pocetDusi(kolik) {
  return kolik >= 1 && kolik <= 4 ? 'duše' : 'duší';
}

// Obchod s trvalými vylepšeními. Karta je tlačítko: klik (nebo Enter) koupí další úroveň, když jsou duše.
// Vrátit duše chce dva stisky, první se jen zeptá. Po každé změně se panel překreslí a výběr zůstane na místě.
function vyplnVylepseni(panel) {
  const stav = nactiDuse();
  const hlava = prvek('div', 'duse-stav');
  hlava.append(obrazekSpritu('duse', 3), prvek('b', '', String(stav.duse)), prvek('span', '', pocetDusi(stav.duse)));
  const mrizka = prvek('div', 'mrizka-vylepseni');
  const prekresli = (vybrat) => {
    panel.replaceChildren();
    vyplnVylepseni(panel);
    vyberTlacitko(panel.querySelector(vybrat) ?? panel.querySelector('button'));
  };
  for (const [id, v] of Object.entries(VYLEPSENI)) {
    const uroven = stav.vylepseni[id] ?? 0;
    const cena = cenaVylepseni(id, uroven);
    const karta = prvek('button', 'vylepseni');
    karta.type = 'button';
    karta.dataset.vylepseni = id;
    if (v.max === 1) karta.classList.add('jednou');
    if (cena === null) karta.classList.add('hotovo');
    else if (cena > stav.duse) karta.classList.add('drahe');
    const nazev = prvek('span', 'vylepseni-hlava');
    nazev.append(prvek('b', '', v.nazev), prvek('span', 'vylepseni-uroven', `${uroven}/${v.max}`));
    const ctverecky = prvek('span', 'ctverecky');
    for (let i = 0; i < v.max; i++) ctverecky.append(prvek('i', i < uroven ? 'plny' : ''));
    const cenovka = prvek('span', 'cena');
    if (cena === null) cenovka.textContent = 'Hotovo';
    else cenovka.append(obrazekSpritu('duse', 2), prvek('span', '', String(cena)));
    karta.append(nazev, ctverecky, prvek('small', '', v.popis), cenovka);
    karta.setAttribute('aria-label', `${v.nazev}, úroveň ${uroven} z ${v.max}, ${cena === null ? 'hotovo' : `cena ${cena} ${pocetDusi(cena)}`}`);
    karta.addEventListener('click', () => {
      odemkniZvuk();
      const novy = kupVylepseni(nactiDuse(), id);
      if (!novy) {
        zvukOdmitnuti();
        karta.classList.remove('zatrast');
        void karta.offsetWidth;
        karta.classList.add('zatrast');
        return;
      }
      ulozDuse(novy);
      zvukNakupu();
      prekresli(`[data-vylepseni="${id}"]`);
    });
    mrizka.append(karta);
  }
  const vratit = utraceno(stav.vylepseni);
  const tlacitkoVratit = prvek('button', 'menu-tlacitko vratit', vratit ? 'Vrátit duše' : 'Není co vracet');
  tlacitkoVratit.type = 'button';
  tlacitkoVratit.dataset.vylepseni = 'vratit';
  tlacitkoVratit.addEventListener('click', () => {
    if (!vratit) return;
    if (!tlacitkoVratit.classList.contains('potvrdit')) {
      tlacitkoVratit.classList.add('potvrdit');
      tlacitkoVratit.textContent = `Opravdu? Vrátí se ${vratit} ${pocetDusi(vratit)}`;
      return;
    }
    ulozDuse(vratDuse(nactiDuse()));
    prekresli('[data-vylepseni="vratit"]');
  });
  const radek = prvek('div', 'radek-tlacitek vratit-radek');
  radek.append(tlacitkoVratit);
  panel.append(
    prvek('p', 'podtitul', 'Za duše z každé výpravy si kup trvalou sílu. Platí od začátku každé hry.'),
    hlava,
    mrizka,
    radek,
  );
}

function vyplnRekordy(panel) {
  const rekord = nactiRekord();
  if (!rekord) {
    panel.append(prvek('p', 'podtitul', 'Zatím žádný rekord. Dej Hrát a vydrž co nejdéle.'));
    return;
  }
  const radky = [
    ['Nejdelší přežití', formatCas(rekord.cas)],
    ...(Object.hasOwn(TRIDY, rekord.trida ?? '') ? [['Postava', TRIDY[rekord.trida].nazev]] : []),
    ['Úroveň', rekord.uroven ?? '–'],
    ['Zabito', rekord.zabito ?? '–'],
  ];
  const kdy = new Date(rekord.datum);
  if (rekord.datum && !Number.isNaN(kdy.getTime())) radky.push(['Kdy', kdy.toLocaleDateString('cs-CZ')]);
  const tabulka = prvek('dl', 'tabulka');
  for (const [nazev, hodnota] of radky) tabulka.append(prvek('dt', '', nazev), prvek('dd', '', String(hodnota)));
  panel.append(prvek('p', 'podtitul', 'Tvoje nejlepší výprava v tomhle prohlížeči'), tabulka);
}

const OVLADANI = [
  [['W', 'A', 'S', 'D'], 'pohyb'],
  [['šipky'], 'pohyb'],
  [['tah prstem'], 'pohyb na mobilu'],
  [['1', '2', '3'], 'výběr vylepšení (nebo klik, šipky a Enter)'],
  [['P'], 'pauza'],
  [['R'], 'znovu po prohře'],
  [['M'], 'menu po prohře'],
  [['↑', '↓', 'Enter'], 'výběr v menu'],
  [['Esc'], 'zpět v menu'],
];

function vyplnOvladani(panel) {
  const seznam = prvek('div', 'ovladani');
  for (const [klavesy, co] of OVLADANI) {
    const radek = prvek('div', 'ovladani-radek');
    const kde = prvek('span', 'klavesy');
    kde.append(...klavesy.map((k) => prvek('kbd', '', k)));
    radek.append(kde, prvek('span', '', co));
    seznam.append(radek);
  }
  panel.append(prvek('p', 'podtitul', 'Zbraně střílí samy, ty jen uhýbáš a sbíráš krystaly.'), seznam);
}

export const ZALOZKY = {
  postavy: { nazev: 'Postavy', vypln: vyplnPostavy },
  vylepseni: { nazev: 'Vylepšení', vypln: vyplnVylepseni },
  rekordy: { nazev: 'Rekordy', vypln: vyplnRekordy },
  ovladani: { nazev: 'Ovládání', vypln: vyplnOvladani },
};

// Pixelové písmo loga: X je plný pixel, tahy široké 2 pixely.
const PISMENA = {
  H: ['XX...XX', 'XX...XX', 'XX...XX', 'XXXXXXX', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX'],
  L: ['XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XXXXXX', 'XXXXXX'],
  U: ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  B: ['XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.'],
  I: ['XX', 'XX', 'XX', 'XX', 'XX', 'XX', 'XX', 'XX'],
  N: ['XX...XX', 'XXX..XX', 'XXXX.XX', 'XX.XXXX', 'XX..XXX', 'XX...XX', 'XX...XX', 'XX...XX'],
  Y: ['XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '..XX..', '..XX..', '..XX..', '..XX..'],
  R: ['XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXX..', 'XX.XXX.', 'XX..XXX', 'XX...XX'],
  G: ['.XXXXX.', 'XXXXXXX', 'XX.....', 'XX.....', 'XX..XXX', 'XX...XX', 'XXXXXXX', '.XXXXX.'],
  // Malá písmena sedí na stejné spodní čáře, nahoře mají prázdné řádky.
  u: ['......', '......', '......', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', '.XXXXX'],
  e: ['......', '......', '......', '.XXXX.', 'XX..XX', 'XXXXXX', 'XX....', '.XXXXX'],
};
// Zlato světlé nahoře a tmavší dolů, pod písmeny hnědá hloubka a kolem tmavý obrys jako u spritů.
const BARVY_RADKU = ['#fff1c4', '#ffe08a', '#f4cf6e', '#e9c46a', '#e0b155', '#d39a3e', '#c4862f', '#b07428'];
const BARVA_HLOUBKY = '#6b3f1d';
const HLOUBKA = 2;

function nakresliLogo(platno, text) {
  const pismo = new Map();
  let x = 0;
  for (const znak of text) {
    const glyf = PISMENA[znak];
    glyf.forEach((radek, y) => {
      [...radek].forEach((c, dx) => {
        if (c === 'X') pismo.set(`${x + dx},${y}`, BARVY_RADKU[y]);
      });
    });
    x += glyf[0].length + 1;
  }
  const hloubka = new Set();
  for (const bod of pismo.keys()) {
    const [px, py] = bod.split(',').map(Number);
    for (let d = 1; d <= HLOUBKA; d++) {
      if (!pismo.has(`${px},${py + d}`)) hloubka.add(`${px},${py + d}`);
    }
  }
  const vse = new Set([...pismo.keys(), ...hloubka]);
  platno.width = x - 1 + 2;
  platno.height = BARVY_RADKU.length + HLOUBKA + 2;
  const g = platno.getContext('2d');
  const tecka = (bod, barva, posun = [0, 0]) => {
    const [px, py] = bod.split(',').map(Number);
    g.fillStyle = barva;
    g.fillRect(px + posun[0] + 1, py + posun[1] + 1, 1, 1);
  };
  for (const bod of vse) {
    const [px, py] = bod.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!vse.has(`${px + dx},${py + dy}`)) tecka(bod, '#0b0a0f', [dx, dy]);
    }
  }
  for (const bod of hloubka) tecka(bod, BARVA_HLOUBKY);
  for (const [bod, barva] of pismo) tecka(bod, barva);
}

// Logo se zvětšuje jen celými násobky, aby pixely zůstaly ostré.
function upravLogo(platno) {
  const meritko = Math.max(3, Math.min(9, Math.floor(Math.min(560, innerWidth - 32) / platno.width)));
  platno.style.width = `${platno.width * meritko}px`;
  platno.style.height = `${platno.height * meritko}px`;
}

export function vyberTlacitko(tlacitko, posunout = false) {
  if (!tlacitko) return;
  for (const b of document.querySelectorAll('.vybrano')) b.classList.remove('vybrano');
  tlacitko.classList.add('vybrano');
  tlacitko.focus({ preventScroll: !posunout });
}

const DALSI = ['arrowdown', 'arrowright', 's', 'd'];
const PREDCHOZI = ['arrowup', 'arrowleft', 'w', 'a'];

// Šipky (i WASD) posouvají výběr mezi viditelnými tlačítky v kontejneru, Enter nebo mezerník ho stiskne.
// Když je tlačítko zaměřené, stiskne ho prohlížeč sám, takže se nic nespustí dvakrát.
export function ovladejTlacitka(kontejner, e) {
  const k = e.key.toLowerCase();
  const tlacitka = [...kontejner.querySelectorAll('button')].filter((b) => !b.disabled && b.getClientRects().length);
  if (!tlacitka.length) return false;
  const zamerene = tlacitka.indexOf(document.activeElement);
  const i = zamerene >= 0 ? zamerene : tlacitka.findIndex((b) => b.classList.contains('vybrano'));
  const smer = DALSI.includes(k) ? 1 : PREDCHOZI.includes(k) ? -1 : 0;
  if (smer) {
    e.preventDefault();
    if (e.repeat) return true;
    const dalsi = i < 0 ? (smer > 0 ? 0 : tlacitka.length - 1) : (i + smer + tlacitka.length) % tlacitka.length;
    vyberTlacitko(tlacitka[dalsi], true);
    return true;
  }
  if (k === 'enter' || k === ' ') {
    // Držený Enter by jinak klikal pořád dokola (záložka by se otevírala a zavírala).
    if (e.repeat) {
      e.preventDefault();
      return true;
    }
    if (zamerene >= 0) return true;
    e.preventDefault();
    (tlacitka[i] ?? tlacitka[0]).click();
    return true;
  }
  return false;
}

export function vytvorMenu({ hrat }) {
  const koren = document.getElementById('menu');
  const volby = document.getElementById('menu-volby');
  const zalozka = document.getElementById('menu-zalozka');
  const logo = document.getElementById('logo');
  let otevrena = null;

  nakresliLogo(logo, 'RuGee');
  upravLogo(logo);
  addEventListener('resize', () => upravLogo(logo));

  const polozky = [
    { id: 'hrat', nazev: 'Hrát', hlavni: true, akce: hrat },
    ...Object.entries(ZALOZKY).map(([id, z]) => ({ id, nazev: z.nazev, akce: () => otevri(id) })),
  ];
  const radekPostavy = prvek('p', 'menu-postava');
  const ukazPostavu = () => {
    const { duse } = nactiDuse();
    radekPostavy.textContent = `Hraješ za: ${TRIDY[trida].nazev} · ${duse} ${pocetDusi(duse)}`;
  };
  ukazPostavu();
  volby.replaceChildren(...polozky.map((p) => {
    const b = prvek('button', p.hlavni ? 'menu-tlacitko hlavni' : 'menu-tlacitko', p.nazev);
    b.type = 'button';
    b.dataset.id = p.id;
    // Tlačítko schovaného menu (zaměřené z dřívějška) nesmí spustit nic uprostřed hry.
    b.addEventListener('click', () => { if (!koren.hidden) p.akce(); });
    return b;
  }));
  volby.firstChild.after(radekPostavy);
  document.getElementById('menu-zpet').addEventListener('click', () => zavri());
  koren.addEventListener('pointerover', (e) => {
    const b = e.target.closest('button');
    if (b && !b.classList.contains('vybrano')) vyberTlacitko(b);
  });

  function otevri(id) {
    const z = ZALOZKY[id];
    otevrena = id;
    document.getElementById('menu-nadpis').textContent = z.nazev;
    const panel = document.getElementById('menu-panel');
    panel.replaceChildren();
    z.vypln(panel);
    volby.hidden = true;
    zalozka.hidden = false;
    vyberTlacitko(zalozka.querySelector('.zvolena') ?? zalozka.querySelector('button'));
  }

  function zavri() {
    const id = otevrena;
    otevrena = null;
    zalozka.hidden = true;
    ukazPostavu();
    volby.hidden = false;
    vyberTlacitko(volby.querySelector(`[data-id="${id}"]`) ?? volby.querySelector('button'));
  }

  return {
    otevri,
    ukaz() {
      koren.hidden = false;
      upravLogo(logo);
      ukazPostavu();
      if (otevrena) zavri();
      else vyberTlacitko(volby.querySelector('button'));
    },
    skryj() {
      koren.hidden = true;
    },
    klavesa(e) {
      const k = e.key.toLowerCase();
      if (otevrena && (k === 'escape' || k === 'backspace')) {
        e.preventDefault();
        zavri();
        return;
      }
      ovladejTlacitka(koren, e);
    },
  };
}
