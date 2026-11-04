import { vytvorRng } from './rng.js';
import { novaHra, aktualizuj, vyber, rozhodniKus, TRIDY } from './hra.js';
import { kresli, kresliMenu } from './kresleni.js';
import { dusZaHru } from './duse.js';
import {
  vytvorMenu, ovladejTlacitka, vyberTlacitko, formatCas, zvolenaTrida, obrazekSpritu, pocetDusi, cislaPoskozeni, prepinacNastaveni,
} from './menu.js';
import { zapisVysledek, nactiDuse, pripisDuse, zapisNalez } from './ulozeni.js';
import { odemkniZvuk, zvukStartu, zvukVolby, zvukVyberu } from './zvuk.js';
import { ukazVolby, ukazPorovnani } from './volba.js';
import { ukazVybavu } from './vybava.js';

const platno = document.getElementById('platno');
const ctx = platno.getContext('2d');
const el = (id) => document.getElementById(id);
const vybava = el('vybava');

const stisknute = new Set();
let hra = null;
let vMenu = true;
let posledni = 0;
// Kdy se otevřelo okno výběru. Chvíli potom se nevybírá, ať klik nebo klávesa z běhu nic nevybere náhodou.
let volbyOd = 0;
let porovnaniOd = 0;
const POJISTKA_VOLBY = 300;
// Kolik kusů výbavy z téhle hry už je zapsaných ve Sbírce (zapisuje se hned po nálezu).
let zapsanoNalezu = 0;

function zmenVelikost() {
  platno.width = innerWidth;
  platno.height = innerHeight;
}

function start() {
  // ?seed=123 v adrese dá pořád stejné vlny (hodí se na hledání chyb).
  const seminko = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() >>> 0);
  hra = novaHra(vytvorRng(seminko), zvolenaTrida(), nactiDuse().vylepseni);
  zapsanoNalezu = 0;
  vMenu = false;
  menu.skryj();
  document.body.classList.remove('v-menu');
  el('konec').hidden = true;
  el('volba').hidden = true;
  el('porovnani').hidden = true;
  el('pauza').hidden = true;
  // Zaměřené tlačítko schovaného okna by jinak Enterem spustilo něco uprostřed hry.
  document.activeElement?.blur?.();
}

function doMenu() {
  vMenu = true;
  el('konec').hidden = true;
  el('volba').hidden = true;
  el('porovnani').hidden = true;
  el('pauza').hidden = true;
  document.body.classList.add('v-menu');
  stisknute.clear();
  dotyk.aktivni = false;
  menu.ukaz();
}

// Hra začne až po Hrát. Stisk tlačítka zároveň odemkne zvuk (prohlížeč ho jinak nepustí).
const menu = vytvorMenu({
  hrat() {
    odemkniZvuk();
    zvukStartu();
    start();
  },
});

// Dotyk: kde prst dosedne, tam je střed joysticku; tah od středu = směr pohybu.
const dotyk = { aktivni: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
const POLOMER_JOYSTICKU = 50;

function vstup() {
  if (dotyk.aktivni) {
    const dx = dotyk.x - dotyk.sx;
    const dy = dotyk.y - dotyk.sy;
    const d = Math.hypot(dx, dy);
    if (d < 8) return { dx: 0, dy: 0 };
    const sila = Math.min(1, d / POLOMER_JOYSTICKU);
    return { dx: (dx / d) * sila, dy: (dy / d) * sila };
  }
  const drzi = (...klavesy) => klavesy.some((k) => stisknute.has(k));
  return {
    dx: (drzi('d', 'arrowright') ? 1 : 0) - (drzi('a', 'arrowleft') ? 1 : 0),
    dy: (drzi('s', 'arrowdown') ? 1 : 0) - (drzi('w', 'arrowup') ? 1 : 0),
  };
}

function kresliJoystick() {
  if (!dotyk.aktivni) return;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ece6da';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(dotyk.sx, dotyk.sy, POLOMER_JOYSTICKU, 0, Math.PI * 2);
  ctx.stroke();
  const dx = dotyk.x - dotyk.sx;
  const dy = dotyk.y - dotyk.sy;
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(d, POLOMER_JOYSTICKU) / d;
  ctx.fillStyle = '#e9c46a';
  ctx.beginPath();
  ctx.arc(dotyk.sx + dx * k, dotyk.sy + dy * k, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Přehled výbavy leží nad plátnem. Když prst s joystickem dosedne k němu, přehled zprůhlední, ať je joystick vidět.
function vybavaUJoysticku() {
  let blizko = false;
  if (dotyk.aktivni) {
    const r = vybava.getBoundingClientRect();
    const okraj = POLOMER_JOYSTICKU + 18;
    blizko = dotyk.sx > r.left - okraj && dotyk.sx < r.right + okraj && dotyk.sy > r.top - okraj && dotyk.sy < r.bottom + okraj;
  }
  vybava.classList.toggle('u-joysticku', blizko);
}

// Pauza (P nebo Esc): hra stojí a okno nabídne přepínač čísel poškození a Pokračovat.
// Přepínač se staví pokaždé znovu, ať ukazuje, co je zrovna uložené (mohlo se změnit v menu).
function nastavPauzu(zapnout) {
  hra.pauza = zapnout;
  el('pauza').hidden = !zapnout;
  if (!zapnout) {
    document.activeElement?.blur?.();
    return;
  }
  const pokracovat = textovyPrvek('button', 'Pokračovat (P)');
  pokracovat.className = 'menu-tlacitko hlavni';
  pokracovat.type = 'button';
  pokracovat.addEventListener('click', () => { if (hra?.pauza) nastavPauzu(false); });
  el('pauza-volby').replaceChildren(pokracovat, prepinacNastaveni('cislaPoskozeni', 'Čísla poškození'));
  vyberTlacitko(pokracovat);
}

function otevriVolby() {
  const stupen = ukazVolby(el('volba'), hra, zvol);
  volbyOd = performance.now();
  zvukVolby(stupen);
}

function zvol(i) {
  if (!hra?.volby?.[i] || hra.porovnani || performance.now() - volbyOd < POJISTKA_VOLBY) return;
  vyber(hra, hra.volby[i]);
  zvukVyberu();
  el('volba').hidden = true;
  document.activeElement?.blur?.();
}

// Nový kus výbavy do obsazeného slotu: okno porovnání. Po rozhodnutí přijde okno karet z truhly.
function otevriPorovnani() {
  const stupen = ukazPorovnani(el('porovnani'), hra, rozhodniVybavu);
  porovnaniOd = performance.now();
  zvukVolby(stupen);
}

function rozhodniVybavu(vzit) {
  if (!hra?.porovnani || performance.now() - porovnaniOd < POJISTKA_VOLBY) return;
  rozhodniKus(hra, vzit);
  zvukVyberu();
  el('porovnani').hidden = true;
  document.activeElement?.blur?.();
}

// Každý nový kus výbavy se hned zapíše do Sbírky v menu.
function zapisNalezy() {
  while (zapsanoNalezu < hra.nalezy.length) zapisNalez(hra.nalezy[zapsanoNalezu++]);
}

// Rekord se drží jen v tomhle prohlížeči (ulozeni.js), v menu ho ukazuje záložka Rekordy.
function zapisKonec() {
  const vysledek = {
    cas: Math.floor(hra.cas), uroven: hra.hrdina.uroven, zabito: hra.zabito, hrozba: hra.hrozba, trida: hra.trida, datum: new Date().toISOString(),
  };
  const { novy, rekord } = zapisVysledek(vysledek);
  const text = `${TRIDY[hra.trida].nazev} přežil ${formatCas(hra.cas)} (hrozba ${hra.hrozba}), úroveň ${hra.hrdina.uroven}, zabito ${hra.zabito}, bossů ${hra.zabitoBossu}.`;
  const radekRekordu = novy
    ? 'Nový rekord!'
    : `Rekord: ${formatCas(rekord.cas)}, úroveň ${rekord.uroven}, zabito ${rekord.zabito}.`;
  const oziveni = hra.oziveno ? ' Duše tě jednou vrátily.' : '';
  const kusu = hra.nalezy.length;
  const vystroj = kusu ? ` Výbava bossů: ${kusu} ${kusu === 1 ? 'kus' : kusu <= 4 ? 'kusy' : 'kusů'}.` : '';
  el('konec-text').textContent = `${text}${oziveni}${vystroj} ${radekRekordu}`;

  // Duše za hru se připíšou hned, utratit se dají v menu Vylepšení.
  const duse = dusZaHru(hra);
  const { duse: celkem } = pripisDuse(duse.celkem);
  const rozpis = textovyPrvek('small', `čas ${duse.cas} · zabití ${duse.zabiti} · bossové ${duse.strazci} · zlaťáky ${duse.zlataky} · celkem ${celkem}`);
  el('konec-duse').replaceChildren(
    obrazekSpritu('duse', 3),
    textovyPrvek('b', `+${duse.celkem} ${pocetDusi(duse.celkem)}`),
    rozpis,
  );
}

function textovyPrvek(znacka, text) {
  const e = document.createElement(znacka);
  e.textContent = text;
  return e;
}

// Hrozba pod časem: číslo se mění jednou za minutu a štítek přitom krátce poskočí (CSS animace .roste).
let ukazanaHrozba = null;
function ukazHrozbu(uroven) {
  if (uroven === ukazanaHrozba) return;
  const stitek = el('hrozba');
  el('hrozba-cislo').textContent = uroven;
  stitek.classList.remove('roste');
  if (ukazanaHrozba !== null && uroven > ukazanaHrozba) {
    void stitek.offsetWidth;
    stitek.classList.add('roste');
  }
  ukazanaHrozba = uroven;
}

function hud() {
  const { hrdina } = hra;
  el('uroven').textContent = hrdina.uroven;
  el('zabito').textContent = hra.zabito;
  el('zlataky').textContent = hra.zlataky;
  el('cas').textContent = formatCas(hra.cas);
  ukazHrozbu(hra.hrozba);
  el('xp-pruh').style.width = `${Math.min(100, (hrdina.xp / hrdina.potreba) * 100)}%`;
  // Překreslí se jen když se výbava změnila (po výběru vylepšení nebo v nové hře).
  ukazVybavu(vybava, hra);
}

function smycka(t) {
  const dt = Math.min(0.05, (t - posledni) / 1000 || 0);
  posledni = t;
  if (vMenu) {
    kresliMenu(ctx, t / 1000, zvolenaTrida());
    requestAnimationFrame(smycka);
    return;
  }
  aktualizuj(hra, dt, vstup(), platno.width, platno.height);
  // Po truhle nejdřív porovnání výbavy (když je slot obsazený), pak karty. Okno se otevře, jakmile na něj
  // přijde řada, a zavře ho až volba.
  if (hra.porovnani && el('porovnani').hidden) otevriPorovnani();
  else if (hra.volby && !hra.porovnani && el('volba').hidden) otevriVolby();
  zapisNalezy();
  if (hra.konec && el('konec').hidden) {
    zapisKonec();
    el('konec').hidden = false;
    vyberTlacitko(el('znovu'));
  }
  kresli(ctx, hra, { cislaPoskozeni: cislaPoskozeni() });
  kresliJoystick();
  vybavaUJoysticku();
  hud();
  requestAnimationFrame(smycka);
}

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (vMenu) {
    menu.klavesa(e);
    return;
  }
  stisknute.add(k);
  // Po prohře: R znovu, M nebo Esc do menu, šipky a Enter mezi tlačítky Znovu a Menu.
  if (hra.konec) {
    if (k === 'r') start();
    else if (k === 'm' || k === 'escape') doMenu();
    else ovladejTlacitka(el('konec'), e);
    return;
  }
  if ((k === 'p' || k === 'escape') && !hra.volby && !hra.porovnani) {
    if (!e.repeat) nastavPauzu(!hra.pauza);
    return;
  }
  if (hra.pauza) {
    ovladejTlacitka(el('pauza'), e);
    return;
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  // Porovnání výbavy: 1 vezme nový kus, 2 nechá nasazený, šipky a Enter jako u karet.
  if (hra.porovnani) {
    if (k === '1' || k === '2') rozhodniVybavu(k === '1');
    else if (!['enter', ' '].includes(k) || el('porovnani-kusy').querySelector('.vybrano')) ovladejTlacitka(el('porovnani-kusy'), e);
    return;
  }
  if (hra.volby && ['1', '2', '3'].includes(k)) zvol(Number(k) - 1);
  // Šipky vybírají kartu, Enter nebo mezerník ji vezme (jen když už je nějaká vybraná, ne naslepo první).
  else if (hra.volby && (!['enter', ' '].includes(k) || el('karty').querySelector('.vybrano'))) ovladejTlacitka(el('karty'), e);
});
addEventListener('keyup', (e) => stisknute.delete(e.key.toLowerCase()));
platno.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (dotyk.aktivni) return;
  const t = e.changedTouches[0];
  Object.assign(dotyk, { aktivni: true, id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY });
}, { passive: false });
platno.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === dotyk.id) Object.assign(dotyk, { x: t.clientX, y: t.clientY });
  }
}, { passive: false });
const pustDotyk = (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === dotyk.id) dotyk.aktivni = false;
  }
};
platno.addEventListener('touchend', pustDotyk);
platno.addEventListener('touchcancel', pustDotyk);
addEventListener('blur', () => stisknute.clear());
addEventListener('resize', zmenVelikost);
el('znovu').addEventListener('click', () => { if (hra?.konec) start(); });
el('do-menu').addEventListener('click', () => { if (hra?.konec) doMenu(); });

// Ikonka zlaťáku v horní liště (sprite z sprity.js, stejný jako na louce).
el('zlato-ikona').replaceWith(obrazekSpritu('zlatak', 2));
zmenVelikost();
doMenu();
requestAnimationFrame(smycka);
