// Rámy oken a dřevěná deska jako pixel art z textu (stejně jako sprity): každý znak je barva, tečka průhledná.
// Skript z nich udělá malé SVG obrázky a zapíše je do style.css jako proměnné --ram-* a --deska mezi značky
// „ramy: začátek“ a „ramy: konec“. Okno je pak 9-slice přes border-image (rohy zůstanou, hrany se opakují),
// takže se rám natáhne na libovolnou velikost a pixely zůstanou ostré při celých násobcích (--px).
// Spouštět po změně kresby: node nastroje/ramy.mjs (pak node nastroje/verze.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
import {
  KRESBY_ZNAKU, BARVY_ZNAKU, ZNAKY_RARIT, PALETY_RARIT, BARVY_STAVU, REZIMY_BAREV,
} from '../src/barvy.js';

// Barvy jsou z palety spritů (src/sprity.js) a loga: tmavé dřevo důlní výdřevy, mosaz a téměř černý obrys.
export const PALETA = {
  K: '#140c08', // obrys
  h: '#b98250', // světlá hrana trámu
  w: '#8a5a35', // dřevo (jako násada krumpáče)
  v: '#704629', // léta ve dřevě
  d: '#4f3019', // stín trámu
  D: '#2b1c12', // tmavé dřevo desky
  Y: '#fff1c4', // mosaz – odlesk
  g: '#e9c46a', // mosaz (zlatá z loga)
  o: '#b07428', // mosaz ve stínu
  O: '#6b3f1d', // hloubka mosazi (jako hloubka loga)
  n: '#2a170b', // hlavička hřebu
  a: '#2b1c12', // deska
  b: '#27190f', // léta desky
  s: '#1f140c', // spára mezi prkny
  c: '#33221a', // horní hrana prkna
};

// Dřevěný rám: trámy 6 px (obrys, světlá hrana, dvě řady dřeva s léty, stín, vnitřní obrys) a v rozích mosazné
// plíšky s hřebem. Hrana mezi rohy je 8 px dlouhá a opakuje se.
const RAM_DREVO = [
  'KKKKKKKKKKKKKKKKKKKK',
  'KYYYgKhhhhhhhhKYYYgK',
  'KYggoKwwwvvvwwKYggoK',
  'KYgnoKvvwwwwwvKYgnoK',
  'KgoooKddddddddKgoooK',
  'KKKKKKKKKKKKKKKKKKKK',
  'KhwvdK........KhwvdK',
  'KhwvdK........KhwvdK',
  'KhwwdK........KhwwdK',
  'KhvwdK........KhvwdK',
  'KhvwdK........KhvwdK',
  'KhvwdK........KhvwdK',
  'KhwwdK........KhwwdK',
  'KhwvdK........KhwvdK',
  'KKKKKKKKKKKKKKKKKKKK',
  'KYYYgKhhhhhhhhKYYYgK',
  'KYggoKwwwvvvwwKYggoK',
  'KYgnoKvvwwwwwvKYgnoK',
  'KgoooKddddddddKgoooK',
  'KKKKKKKKKKKKKKKKKKKK',
];

// Mosazný rám pro vzácná okna (truhla, kupec): mosazné pásy s nýtem a tmavé dřevěné rohy s mosazným hřebem.
const RAM_MOSAZ = [
  'KKKKKKKKKKKKKKKKKKKK',
  'KhwwvKYYYYYYYYKhwwvK',
  'KwYgdKggggggggKwYgdK',
  'KwgOdKgggOgggoKwgOdK',
  'KvddDKooooooooKvddDK',
  'KKKKKKKKKKKKKKKKKKKK',
  'KYggoK........KYggoK',
  'KYggoK........KYggoK',
  'KYggoK........KYggoK',
  'KYgOoK........KYgOoK',
  'KYggoK........KYggoK',
  'KYggoK........KYggoK',
  'KYggoK........KYggoK',
  'KYgooK........KYgooK',
  'KKKKKKKKKKKKKKKKKKKK',
  'KhwwvKYYYYYYYYKhwwvK',
  'KwYgdKggggggggKwYgdK',
  'KwgOdKgggOgggoKwgOdK',
  'KvddDKooooooooKvddDK',
  'KKKKKKKKKKKKKKKKKKKK',
];

// Tenký rám 2 px pro menší rámečky uvnitř okna (sekce, cedulky): obrys se zkosenými rohy a hrana světlá
// nahoře a vlevo, tmavá dole a vpravo.
const RAM_TENKY = [
  '.KKK.',
  'KhhhK',
  'Kh.dK',
  'KhddK',
  '.KKK.',
];

// Rámečky karet (postavy, mapy, profily): stejně tenké jako RAM_TENKY. Vybraná karta (šipky, myš, dotyk) má obrys
// z mosazi, zvolená (za koho nebo kde se hraje) mosazné kování: mosaz nahoře a vlevo, stinná mosaz dole a vpravo.
// Zvolená a zároveň vybraná má navíc obrys z mosazného lesku.
const KARTA_VYBRANA = [
  '.ggg.',
  'ghhhg',
  'gh.dg',
  'ghddg',
  '.ggg.',
];

const KARTA_ZVOLENA = [
  '.KKK.',
  'KgggK',
  'Kg.oK',
  'KgooK',
  '.KKK.',
];

const KARTA_ZVOLENA_VYBRANA = [
  '.YYY.',
  'YgggY',
  'Yg.oY',
  'YgooY',
  '.YYY.',
];

// Deska: tmavá prkna přes celé okno, spáry a léta jen o kousek tmavší, ať text zůstane čitelný.
const DESKA = [
  'ccccccccccccccccccccccccccccccccccccccccccccsccccccccccccccccccc',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaasaaaaaaaaaaaaaaaaaaa',
  'aaabbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaasaaaaabbbbbbbaaaaaaa',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbaaaaaaaaaasaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaabbbbbbbbbaaaaaaaaaaaaaaaaasaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaasaaaaaaaaaaaaabbbbbb',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaasaaaaaaaaaaaaaaaaaaa',
  'ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss',
  'ccccccccccccccsccccccccccccccccccccccccccccccccccccccccccccccccc',
  'aaaaaaaaaaaaaasaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaabbbaaaaasaaaaaaabbbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaasaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbaaa',
  'bbbbbaaaaaaaaasaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaasaaaaaaaaaaaaaaaaaaaaabbbbbbbbbaaaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaasaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss',
];

// Šipka u vybraného tlačítka: mosazný trojúhelník s obrysem, světlý nahoře, stín dole.
const SIPKA = [
  'KK....',
  'KYK...',
  'KYgK..',
  'KYggK.',
  'KYgggK',
  'KggoK.',
  'KgoK..',
  'KoK...',
  'KK....',
];

// Výměna (porovnání výbavy): dvě mosazné šipky proti sobě, nový kus za nasazený. Na telefonu se otočí o 90°.
const VYMENA = [
  '.......K....',
  '.......KK...',
  '.......KYK..',
  'KKKKKKKKYgK.',
  'KYYYYYYYYggK',
  'KoooooooggoK',
  'KKKKKKKKgoK.',
  '....K..KoK..',
  '...KK..KK...',
  '..KYK..K....',
  '.KgYKKKKKKKK',
  'KggYYYYYYYYK',
  'KoggoooooooK',
  '.KogKKKKKKKK',
  '..KoK.......',
  '...KK.......',
  '....K.......',
];

// Značky tlačítek ovladače (nápovědy, Ovládání): kulaté tmavé dřevěné tlačítko 11×11 s obrysem, světlou hranou
// vlevo nahoře a stínem vpravo dole, na něm mosazné písmeno 5×7 (A, B, X, Y) nebo symbol 5×5 (PlayStation).
const TLACITKO = [
  '...KKKKK...',
  '.KKwwwwwKK.',
  '.KwdddddDK.',
  'KwddddddddK',
  'KwddddddddK',
  'KwddddddddK',
  'KwddddddddK',
  'KwddddddDDK',
  '.KdddddDDK.',
  '.KKDDDDDKK.',
  '...KKKKK...',
];
const ZNAKY_TLACITEK = {
  a: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  b: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  x: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'ps-krizek': ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  'ps-kolecko': ['.###.', '#...#', '#...#', '#...#', '.###.'],
  'ps-ctverec': ['#####', '#...#', '#...#', '#...#', '#####'],
  'ps-trojuhelnik': ['..#..', '.#.#.', '.#.#.', '#...#', '#####'],
};
function tlacitkoSeZnakem(znak) {
  const radky = TLACITKO.map((r) => [...r]);
  const shora = znak.length === 7 ? 2 : 3;
  znak.forEach((r, y) => [...r].forEach((z, x) => { if (z === '#') radky[shora + y][3 + x] = 'g'; }));
  return radky.map((r) => r.join(''));
}
// Kříž (směrové tlačítko) s mosaznými šipkami a páčka s mosaznou hlavou v tmavé jamce.
const TL_KRIZ = [
  '...KKKKK...',
  '...KwgwK...',
  '...KwwdK...',
  'KKKKwwdKKKK',
  'KwwwwwwwwdK',
  'KgwwwDwwwgK',
  'KwddddddddK',
  'KKKKwwdKKKK',
  '...KwwdK...',
  '...KdgdK...',
  '...KKKKK...',
];
const TL_PACKA = [
  '...KKKKK...',
  '.KKDDDDDKK.',
  '.KDKKKKKDK.',
  'KDKDYggDKDK',
  'KDKYgggoKDK',
  'KDKggggoKDK',
  'KDKgggooKDK',
  'KDKDoooDKDK',
  '.KDKKKKKDK.',
  '.KKDDDDDKK.',
  '...KKKKK...',
];

export const OBRAZKY = {
  'ram-drevo': RAM_DREVO,
  'ram-mosaz': RAM_MOSAZ,
  'ram-tenky': RAM_TENKY,
  'ram-karta-vybrana': KARTA_VYBRANA,
  'ram-karta-zvolena': KARTA_ZVOLENA,
  'ram-karta-zvolena-vybrana': KARTA_ZVOLENA_VYBRANA,
  deska: DESKA,
  sipka: SIPKA,
  vymena: VYMENA,
  ...Object.fromEntries(Object.entries(ZNAKY_TLACITEK).map(([id, znak]) => [`tl-${id}`, tlacitkoSeZnakem(znak)])),
  'tl-kriz': TL_KRIZ,
  'tl-packa': TL_PACKA,
};
// Značky rarit pro režim pro barvoslepé (kresby a barvy jsou v src/barvy.js, plátno je kreslí z nich taky).
export const ZNAKY = Object.fromEntries(Object.entries(KRESBY_ZNAKU).map(([id, radky]) => [`znak-${id}`, radky]));

// Řádky téže barvy jdou do jedné cesty (úseky vedle sebe se spojí), ať je SVG malé.
export function svg(radky, paleta = PALETA) {
  const sirka = radky[0].length;
  const cesty = {};
  radky.forEach((radek, y) => {
    if (radek.length !== sirka) throw new Error(`řádek ${y} má ${radek.length} znaků místo ${sirka}`);
    let x = 0;
    while (x < sirka) {
      const z = radek[x];
      let delka = 1;
      while (radek[x + delka] === z) delka++;
      if (z !== '.') {
        if (!paleta[z]) throw new Error(`neznámá barva ${z}`);
        cesty[z] = (cesty[z] ?? '') + `M${x} ${y}h${delka}v1h-${delka}z`;
      }
      x += delka;
    }
  });
  const telo = Object.entries(cesty).map(([z, d]) => `<path fill='${paleta[z]}' d='${d}'/>`).join('');
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${sirka}' height='${radky.length}' shape-rendering='crispEdges'>${telo}</svg>`;
}

const dataUrl = (s) => `url("data:image/svg+xml,${s.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`;

const ZACATEK = '/* ramy: začátek (generuje node nastroje/ramy.mjs, ručně neupravovat) */';
const KONEC = '/* ramy: konec */';
const ZACATEK_BAREV = '/* barvy: začátek (generuje node nastroje/ramy.mjs ze src/barvy.js, ručně neupravovat) */';
const KONEC_BAREV = '/* barvy: konec */';

// Text na pruhu rarity: tmavý, nebo světlý, kde má víc kontrastu.
function jas(barva) {
  const l = (i) => {
    const c = parseInt(barva.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * l(0) + 0.7152 * l(1) + 0.0722 * l(2);
}
export function textNaPruhu(barva) {
  const j = jas(barva);
  return (j + 0.05) / (jas('#140c08') + 0.05) >= (jas('#fffaf0') + 0.05) / (j + 0.05) ? 'var(--noc)' : '#fffaf0';
}

// Blok CSS režimu pro barvoslepé: značka každé rarity (--znak) a v každém režimu palety rarit a barvy stavů.
// :where() drží sílu selektoru jako u .rarita-*, takže stavy karty (vybraná, najetí) dál přebarví rámeček.
export function blokBarev() {
  const radky = [ZACATEK_BAREV];
  for (const [id, znak] of Object.entries(ZNAKY_RARIT)) radky.push(`.rarita-${id} { --znak: var(--znak-${znak}); }`);
  for (const r of REZIMY_BAREV.filter((x) => x !== 'vyp')) {
    radky.push(`:where(body[data-barvy="${r}"]) { --ok: ${BARVY_STAVU[r].ok}; --chyba: ${BARVY_STAVU[r].chyba}; }`);
    for (const [id, b] of Object.entries(PALETY_RARIT[r])) {
      radky.push(`:where(body[data-barvy="${r}"]) .rarita-${id} { --c: ${b.c}; --c-svetla: ${b.svetla}; --c-pozadi: ${b.pozadi}; --c-zar: ${b.zar}; --c-pas: ${textNaPruhu(b.c)}; }`);
    }
  }
  radky.push(KONEC_BAREV);
  return radky.join('\n');
}

function nahradBlok(css, zacatek, konec, blok) {
  const od = css.indexOf(zacatek);
  const po = css.indexOf(konec);
  if (od < 0 || po < 0) throw new Error(`style.css nemá značky ${zacatek} / ${konec}`);
  return css.slice(0, od) + blok + css.slice(po + konec.length);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const blok = [
    ZACATEK, ':root {',
    ...Object.entries(OBRAZKY).map(([jmeno, radky]) => `  --${jmeno}: ${dataUrl(svg(radky))};`),
    ...Object.entries(ZNAKY).map(([jmeno, radky]) => `  --${jmeno}: ${dataUrl(svg(radky, BARVY_ZNAKU))};`),
    '}', KONEC,
  ].join('\n');
  let css = readFileSync('style.css', 'utf8');
  css = nahradBlok(css, ZACATEK, KONEC, blok);
  css = nahradBlok(css, ZACATEK_BAREV, KONEC_BAREV, blokBarev());
  writeFileSync('style.css', css);
  console.log(`ramy: ${[...Object.keys(OBRAZKY), ...Object.keys(ZNAKY)].join(', ')}, barvy: ${REZIMY_BAREV.join(', ')}`);
}
