import { vytvorRng } from './rng.js';
import { novaHra, aktualizuj, vyber } from './hra.js';
import { kresli } from './kresleni.js';

const platno = document.getElementById('platno');
const ctx = platno.getContext('2d');
const el = (id) => document.getElementById(id);

const stisknute = new Set();
let hra;
let posledni = 0;

function zmenVelikost() {
  platno.width = innerWidth;
  platno.height = innerHeight;
}

function start() {
  // ?seed=123 v adrese dá pořád stejné vlny (hodí se na hledání chyb).
  const seminko = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() >>> 0);
  hra = novaHra(vytvorRng(seminko));
  el('konec').hidden = true;
  el('volba').hidden = true;
}

function vstup() {
  const drzi = (...klavesy) => klavesy.some((k) => stisknute.has(k));
  return {
    dx: (drzi('d', 'arrowright') ? 1 : 0) - (drzi('a', 'arrowleft') ? 1 : 0),
    dy: (drzi('s', 'arrowdown') ? 1 : 0) - (drzi('w', 'arrowup') ? 1 : 0),
  };
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

function formatCas(s) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
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
  const melVolby = Boolean(hra.volby);
  aktualizuj(hra, dt, vstup(), platno.width, platno.height);
  if (!melVolby && hra.volby) ukazVolby();
  if (hra.konec && el('konec').hidden) {
    el('konec-text').textContent = `Přežil jsi ${formatCas(hra.cas)}, úroveň ${hra.hrdina.uroven}, zabito ${hra.zabito}.`;
    el('konec').hidden = false;
  }
  kresli(ctx, hra);
  hud();
  requestAnimationFrame(smycka);
}

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  stisknute.add(k);
  if (hra.volby && ['1', '2', '3'].includes(k)) zvol(Number(k) - 1);
  if (k === 'p' && !hra.konec && !hra.volby) hra.pauza = !hra.pauza;
  if (k === 'r' && hra.konec) start();
});
addEventListener('keyup', (e) => stisknute.delete(e.key.toLowerCase()));
addEventListener('blur', () => stisknute.clear());
addEventListener('resize', zmenVelikost);
el('znovu').addEventListener('click', start);

zmenVelikost();
start();
requestAnimationFrame(smycka);
