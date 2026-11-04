// Travnatá louka: pár dlaždic 16×16 pixelů vygenerovaných se semínkem, aby vypadaly
// pořád stejně, a ozdoby (keř, kámen, houba), které se jen kreslí a ničemu nebrání.
import { vytvorRng } from './rng.js';

const P = 16;
const TRAVA = ['#3f7a3a', '#417c3b', '#3d7839'];
const STEBLA_SVETLA = '#5c9c4e';
const STEBLA_TMAVA = '#2f5e2d';

function platno() {
  const c = document.createElement('canvas');
  c.width = P;
  c.height = P;
  return c;
}

function trava(rng, odstin) {
  const c = platno();
  const g = c.getContext('2d');
  g.fillStyle = TRAVA[odstin % TRAVA.length];
  g.fillRect(0, 0, P, P);
  for (let i = 0; i < 14; i++) {
    const x = rng.cele(0, P - 1);
    const y = rng.cele(1, P - 1);
    g.fillStyle = rng.dalsi() < 0.6 ? STEBLA_SVETLA : STEBLA_TMAVA;
    g.fillRect(x, y - 1, 1, 2);
  }
  return { c, g };
}

function kvetiny(rng, barva) {
  const { c, g } = trava(rng, 0);
  for (let i = 0; i < rng.cele(2, 3); i++) {
    const x = rng.cele(2, P - 3);
    const y = rng.cele(2, P - 3);
    g.fillStyle = barva;
    g.fillRect(x - 1, y, 3, 1);
    g.fillRect(x, y - 1, 1, 3);
    g.fillStyle = '#f4d35e';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

function obleKameny(rng) {
  const { c, g } = trava(rng, 1);
  for (let i = 0; i < rng.cele(1, 2); i++) {
    const x = rng.cele(2, P - 4);
    const y = rng.cele(2, P - 4);
    g.fillStyle = '#2f5e2d';
    g.fillRect(x, y + 2, 3, 1);
    g.fillStyle = '#8d8b80';
    g.fillRect(x, y, 3, 2);
    g.fillStyle = '#b3b0a3';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

function hlina(rng) {
  const { c, g } = trava(rng, 2);
  const x = rng.cele(2, 6);
  const y = rng.cele(2, 6);
  g.fillStyle = '#6b5a3c';
  g.fillRect(x, y + 1, 8, 5);
  g.fillRect(x + 1, y, 6, 7);
  g.fillStyle = '#7d6a48';
  g.fillRect(x + 2, y + 2, 2, 1);
  g.fillRect(x + 5, y + 4, 1, 1);
  return c;
}

function ozdoba(radky, paleta) {
  const c = platno();
  const g = c.getContext('2d');
  radky.forEach((radek, y) => {
    [...radek].forEach((znak, x) => {
      if (znak === '.') return;
      g.fillStyle = paleta[znak];
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

const rng = vytvorRng(20261104);

export const dlazdiceLouky = [
  ...Array.from({ length: 6 }, (_, i) => trava(rng, i).c),
  kvetiny(rng, '#f2efe4'),
  kvetiny(rng, '#b48ad8'),
  obleKameny(rng),
  hlina(rng),
];

const PALETA_OZDOB = {
  k: '#0b0a0f', z: '#2d5a2a', Z: '#4f8f45', s: '#6f6d65', S: '#a19e92',
  h: '#c94a3a', H: '#f1e4c8', n: '#e8dcc0',
};

export const ozdobyLouky = [
  ozdoba([
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkzzZZzzkk...',
    '..kzzZZZZZZzzk..',
    '.kzzZZZzzZZZzzk.',
    '.kzZZzzzzzzZZzk.',
    'kzzZzzzzzzzzZzzk',
    'kzzzzzzzzzzzzzzk',
    '.kzzzzzzzzzzzzk.',
    '..kkzzzzzzzzkk..',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
  ], PALETA_OZDOB),
  ozdoba([
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
    '....kkSSSskk....',
    '...kSSSssssk....',
    '..ksSsssssssk...',
    '..kssssssssssk..',
    '..kssssssssssk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
    '................',
    '................',
  ], PALETA_OZDOB),
  ozdoba([
    '................',
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
    '.....khHhhk.....',
    '....khhhhHhk....',
    '....kkkkkkkk....',
    '......knnk......',
    '......knnk......',
    '......kkkk......',
    '................',
    '................',
    '................',
    '................',
  ], PALETA_OZDOB),
];
