// Pixelové sprity 8×8 kreslené z textu. Každý znak je barva z palety, tečka je průhledná.
const PALETA = {
  g: '#e9c46a', f: '#f1d2a8', b: '#5f7fb8', B: '#3e5684', o: '#ffb347',
  k: '#3b2a4a', v: '#6b4c8a', r: '#ff5a5a', R: '#ffc2c2',
  m: '#5fae4e', M: '#9be08a', w: '#10200c',
  W: '#e8e2d0', K: '#151318',
  c: '#4fd6c9', C: '#b8fff5',
  p: '#b9c2cc', h: '#8a5a35',
  s: '#6e6577', S: '#8f86a0',
  n: '#a07e5c', N: '#4a3530',
};

const SPRITY = {
  hrdina: [
    '..gggg..',
    '.gggggg.',
    '.gffffg.',
    '..ffff..',
    '.bbbbbbo',
    'b.bBBb.o',
    '..b..b..',
    '.BB..BB.',
  ],
  netopyr: [
    '........',
    'k......k',
    'kk.vv.kk',
    'kkvvvvkk',
    '.kvrrvk.',
    '..vvvv..',
    '...vv...',
    '........',
  ],
  slizak: [
    '........',
    '..mmmm..',
    '.mmMmmm.',
    'mmmmmmmm',
    'mmwmmwmm',
    'mmmmmmmm',
    '.mmmmmm.',
    '........',
  ],
  kostlivec: [
    '..WWWW..',
    '.WKWWKW.',
    '..WWWW..',
    '...WW...',
    '.WWWWWW.',
    '...WW...',
    '..W..W..',
    '.WW..WW.',
  ],
  pavouk: [
    'n......n',
    '.n.NN.n.',
    'nnNrrNnn',
    '..NNNN..',
    'nnNooNnn',
    '..NNNN..',
    '.n.NN.n.',
    'n......n',
  ],
  krystal: [
    '........',
    '...c....',
    '..cCc...',
    '.cCCCc..',
    '..cCc...',
    '...c....',
    '........',
    '........',
  ],
  srdce: [
    '........',
    '.rr..rr.',
    'rRrrrrrr',
    'rrrrrrrr',
    '.rrrrrr.',
    '..rrrr..',
    '...rr...',
    '........',
  ],
  magnet: [
    'rr....pp',
    'rr....pp',
    'rr....pp',
    'rr....pp',
    'rrr..ppp',
    '.rrrppp.',
    '..rrpp..',
    '........',
  ],
  strazce: [
    '..ssss..',
    '.sSSSSs.',
    '.soSSos.',
    'ssssssss',
    'sSssssSs',
    '.ssssss.',
    '.ss..ss.',
    'ss....ss',
  ],
  truhla: [
    '........',
    '.hhhhhh.',
    'hhhhhhhh',
    'hgggoggh',
    'hhhhhhhh',
    'hhhhhhhh',
    '.hhhhhh.',
    '........',
  ],
  krumpac: [
    '.ppppp..',
    'p..h..p.',
    '...h....',
    '...h....',
    '...h....',
    '...h....',
    '........',
    '........',
  ],
};

// Kolem každého spritu přidá tmavý obrys 1 pixel, aby postavy byly vidět i na trávě.
function nakresli(radky) {
  const zaklad = document.createElement('canvas');
  zaklad.width = 8;
  zaklad.height = 8;
  const g = zaklad.getContext('2d');
  const plne = new Set();
  radky.forEach((radek, y) => {
    [...radek].forEach((znak, x) => {
      if (znak === '.') return;
      g.fillStyle = PALETA[znak];
      g.fillRect(x, y, 1, 1);
      plne.add(`${x},${y}`);
    });
  });
  const c = document.createElement('canvas');
  c.width = 10;
  c.height = 10;
  const o = c.getContext('2d');
  o.fillStyle = '#0b0a0f';
  for (const bod of plne) {
    const [x, y] = bod.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!plne.has(`${x + dx},${y + dy}`)) o.fillRect(x + dx + 1, y + dy + 1, 1, 1);
    }
  }
  o.drawImage(zaklad, 1, 1);
  return c;
}

export const sprity = Object.fromEntries(
  Object.entries(SPRITY).map(([jmeno, radky]) => [jmeno, nakresli(radky)]),
);
