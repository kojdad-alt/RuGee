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
  l: '#3f8a3c', L: '#26552a',
  y: '#f2c94c', Y: '#fff3b0',
  e: '#b8443c', E: '#7a2b2e',
  u: '#7f9cf0', U: '#dfe8ff',
  a: '#e4f6f3', A: '#9fc8c6',
  G: '#8d9098', D: '#53565e', H: '#c9ccd2',
  i: '#9b59c9', I: '#d6a9f2', j: '#5e2f86',
};

const SPRITY = {
  // Třídy hrdiny, všechny koukají doprava (ve hře se zrcadlí podle směru pohybu).
  lovec: [
    '..LLLL..',
    '.LllllL.',
    '.lffffl.',
    'L.ffff..',
    '.llllllY',
    'l.lhhl.o',
    '..h..h..',
    '.NN..NN.',
  ],
  havir: [
    '..yyyy..',
    '.yyyyyY.',
    '.yyyyyyy',
    '..ffff..',
    '.hhhhhh.',
    'f.hNNh.f',
    '..B..B..',
    '.KK..KK.',
  ],
  svetlonos: [
    '..EEEE..',
    '.EeeeeE.',
    '.effffe.',
    '..ffff..',
    '.eeeeefh',
    'e.egge.h',
    '.eeeeeoY',
    '.EE..EYo',
  ],
  bourlivak: [
    '....vv..',
    '...vvvC.',
    '.vvvvvv.',
    '..ffff..',
    '.BBBBBBC',
    'B.BvvB.c',
    '..BBBB..',
    '.KK..KK.',
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
  // Duch: bledý závoj s dírami místo očí a roztřepeným lemem (ve hře je navíc průsvitný).
  duch: [
    '..aaaa..',
    '.aaaaaa.',
    'aaKaaKaA',
    'aaKaaKaA',
    'aaaaaaaA',
    'aaaKKaAA',
    'aaaaaaAA',
    'a.aA.aA.',
  ],
  // Houbák: fialová jedovatá houba s nožičkami, po smrti z ní vyletí jedový oblak stejné barvy.
  houbak: [
    '..iiii..',
    '.iIiiIi.',
    'iiiiiiIi',
    'iIiiiiij',
    'jjjjjjjj',
    '.fKffKf.',
    '.ffffff.',
    '.ff..ff.',
  ],
  // Vlk z boku, kouká doprava: vztyčené uši, žluté oko, světlé břicho.
  vlk: [
    '.....D.D',
    '.....GGG',
    'D...GGyG',
    '.DGGGGGK',
    '..GHHHG.',
    '..GG.GG.',
    '..D...D.',
    '.DD..DD.',
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
  // Duše: modrobílý plamínek s očima, měna za trvalá vylepšení.
  duse: [
    '....u...',
    '...uu...',
    '..uUu...',
    '..uUUu..',
    '.uUUUUu.',
    '.uKUUKu.',
    '.uUUUUu.',
    '..uuuu..',
  ],
  // Ikony na kartách vylepšení (zbraně a pasivy, které nemají vlastní sprite ve hře).
  jiskra: [
    '...y....',
    '...Y....',
    '..yYy...',
    'yYYYYYy.',
    '..yYy...',
    '...Y....',
    '...y..o.',
    '......o.',
  ],
  lucerna: [
    '...ss...',
    '..s..s..',
    '.SSSSSS.',
    '.soYYos.',
    '.syYYys.',
    '.soyyos.',
    '.SSSSSS.',
    '..ssss..',
  ],
  // Lucerna, která se vznáší vedle hrdiny, když má zbraň Lucerna (menší než 8×8). Dva snímky: plamen
  // uvnitř skla poskakuje nahoru a dolů.
  lucernaHrdiny: [
    '.s.',
    'SSS',
    'oYo',
    'oyo',
    'sSs',
  ],
  lucernaHrdiny2: [
    '.s.',
    'SSS',
    'oyo',
    'oYo',
    'sSs',
  ],
  blesk: [
    '....uUu.',
    '...uUu..',
    '..uUu...',
    '.uUUUUu.',
    '...uUu..',
    '..uUu...',
    '.uUu....',
    '.uu.....',
  ],
  boty: [
    '..NNNN..',
    'W.hhhh..',
    'WWhnhh..',
    '.Whnhh..',
    '..hhhhh.',
    '..hhhhhh',
    '..NNNNNN',
    '........',
  ],
  sila: [
    '.......W',
    '......Wp',
    '.....Wp.',
    '....Wp..',
    '.g.Wp...',
    '..g.....',
    '.h.g....',
    'g.......',
  ],
  odpocinek: [
    '....o...',
    '...oo...',
    '..ooYo..',
    '..oYYo..',
    '.ooYYoo.',
    '..hhhh..',
    '.hNhhNh.',
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
// Velikost je podle textu (skoro všechny jsou 8×8), obrázek je o 2 pixely větší kvůli obrysu.
function nakresli(radky) {
  const sirka = radky[0].length;
  const vyska = radky.length;
  const zaklad = document.createElement('canvas');
  zaklad.width = sirka;
  zaklad.height = vyska;
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
  c.width = sirka + 2;
  c.height = vyska + 2;
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
