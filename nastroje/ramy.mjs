// Rámy oken a dřevěná deska jako pixel art z textu (stejně jako sprity): každý znak je barva, tečka průhledná.
// Skript z nich udělá malé SVG obrázky a zapíše je do style.css jako proměnné --ram-* a --deska mezi značky
// „ramy: začátek“ a „ramy: konec“. Okno je pak 9-slice přes border-image (rohy zůstanou, hrany se opakují),
// takže se rám natáhne na libovolnou velikost a pixely zůstanou ostré při celých násobcích (--px).
// Spouštět po změně kresby: node nastroje/ramy.mjs (pak node nastroje/verze.mjs)
import { readFileSync, writeFileSync } from 'node:fs';

// Barvy jsou z palety spritů (src/sprity.js) a loga: tmavé dřevo důlní výdřevy, mosaz a téměř černý obrys.
const PALETA = {
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

const OBRAZKY = {
  'ram-drevo': RAM_DREVO,
  'ram-mosaz': RAM_MOSAZ,
  'ram-tenky': RAM_TENKY,
  'ram-karta-vybrana': KARTA_VYBRANA,
  'ram-karta-zvolena': KARTA_ZVOLENA,
  'ram-karta-zvolena-vybrana': KARTA_ZVOLENA_VYBRANA,
  deska: DESKA,
  sipka: SIPKA,
  vymena: VYMENA,
};

// Řádky téže barvy jdou do jedné cesty (úseky vedle sebe se spojí), ať je SVG malé.
export function svg(radky) {
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
        if (!PALETA[z]) throw new Error(`neznámá barva ${z}`);
        cesty[z] = (cesty[z] ?? '') + `M${x} ${y}h${delka}v1h-${delka}z`;
      }
      x += delka;
    }
  });
  const telo = Object.entries(cesty).map(([z, d]) => `<path fill='${PALETA[z]}' d='${d}'/>`).join('');
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${sirka}' height='${radky.length}' shape-rendering='crispEdges'>${telo}</svg>`;
}

const dataUrl = (s) => `url("data:image/svg+xml,${s.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`;

const ZACATEK = '/* ramy: začátek (generuje node nastroje/ramy.mjs, ručně neupravovat) */';
const KONEC = '/* ramy: konec */';

if (import.meta.url === `file://${process.argv[1]}`) {
  const blok = [ZACATEK, ':root {', ...Object.entries(OBRAZKY).map(([jmeno, radky]) => `  --${jmeno}: ${dataUrl(svg(radky))};`), '}', KONEC].join('\n');
  const css = readFileSync('style.css', 'utf8');
  const od = css.indexOf(ZACATEK);
  const po = css.indexOf(KONEC);
  if (od < 0 || po < 0) throw new Error('style.css nemá značky ramy: začátek / ramy: konec');
  writeFileSync('style.css', css.slice(0, od) + blok + css.slice(po + KONEC.length));
  console.log(`ramy: ${Object.keys(OBRAZKY).join(', ')}`);
}
