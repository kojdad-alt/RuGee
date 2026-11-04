import { vytvorRng } from './rng.js';
import { novaHra, aktualizuj, vyber } from './hra.js';
import { kresli, kresliMenu } from './kresleni.js';
import { vytvorMenu, ovladejTlacitka, vyberTlacitko, formatCas } from './menu.js';
import { zapisVysledek } from './ulozeni.js';
import { odemkniZvuk, zvukStartu } from './zvuk.js';

const platno = document.getElementById('platno');
const ctx = platno.getContext('2d');
const el = (id) => document.getElementById(id);

const stisknute = new Set();
let hra = null;
let vMenu = true;
let posledni = 0;

function zmenVelikost() {
  platno.width = innerWidth;
  platno.height = innerHeight;
}

function start() {
  // ?seed=123 v adrese dá pořád stejné vlny (hodí se na hledání chyb).
  const seminko = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() >>> 0);
  hra = novaHra(vytvorRng(seminko));
  vMenu = false;
  menu.skryj();
  document.body.classList.remove('v-menu');
  el('konec').hidden = true;
  el('volba').hidden = true;
  // Zaměřené tlačítko schovaného okna by jinak Enterem spustilo něco uprostřed hry.
  document.activeElement?.blur?.();
}

function doMenu() {
  vMenu = true;
  el('konec').hidden = true;
  el('volba').hidden = true;
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

function ukazVolby() {
  el('karty').replaceChildren(...hra.volby.map((v, i) => {
    const karta = document.createElement('button');
    karta.type = 'button';
    karta.className = 'karta';
    const nazev = document.createElement('b');
    nazev.textContent = `${i + 1}. ${v.nazev}${v.uroven > 1 ? ` ${v.uroven}` : ''}`;
    const popis = document.createElement('small');
    popis.textContent = v.uroven === 1 && v.druh === 'zbran' ? `Nová zbraň: ${v.popis}` : v.popis;
    karta.append(nazev, popis);
    karta.addEventListener('click', () => zvol(i));
    return karta;
  }));
  el('volba').hidden = false;
}

function zvol(i) {
  if (!hra.volby?.[i]) return;
  vyber(hra, hra.volby[i]);
  el('volba').hidden = true;
}

// Rekord se drží jen v tomhle prohlížeči (ulozeni.js), v menu ho ukazuje záložka Rekordy.
function zapisKonec() {
  const vysledek = { cas: Math.floor(hra.cas), uroven: hra.hrdina.uroven, zabito: hra.zabito, datum: new Date().toISOString() };
  const { novy, rekord } = zapisVysledek(vysledek);
  const text = `Přežil jsi ${formatCas(hra.cas)}, úroveň ${hra.hrdina.uroven}, zabito ${hra.zabito}, Strážců ${hra.zabitoBossu}.`;
  const radekRekordu = novy
    ? 'Nový rekord!'
    : `Rekord: ${formatCas(rekord.cas)}, úroveň ${rekord.uroven}, zabito ${rekord.zabito}.`;
  el('konec-text').textContent = `${text} ${radekRekordu}`;
}

function hud() {
  const { hrdina } = hra;
  el('uroven').textContent = hrdina.uroven;
  el('zabito').textContent = hra.zabito;
  el('cas').textContent = formatCas(hra.cas);
  el('xp-pruh').style.width = `${Math.min(100, (hrdina.xp / hrdina.potreba) * 100)}%`;
}

function smycka(t) {
  const dt = Math.min(0.05, (t - posledni) / 1000 || 0);
  posledni = t;
  if (vMenu) {
    kresliMenu(ctx, t / 1000);
    requestAnimationFrame(smycka);
    return;
  }
  const melVolby = Boolean(hra.volby);
  aktualizuj(hra, dt, vstup(), platno.width, platno.height);
  if (!melVolby && hra.volby) ukazVolby();
  if (hra.konec && el('konec').hidden) {
    zapisKonec();
    el('konec').hidden = false;
    vyberTlacitko(el('znovu'));
  }
  kresli(ctx, hra);
  kresliJoystick();
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
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (hra.volby && ['1', '2', '3'].includes(k)) zvol(Number(k) - 1);
  if (k === 'p' && !hra.volby) hra.pauza = !hra.pauza;
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

zmenVelikost();
doMenu();
requestAnimationFrame(smycka);
