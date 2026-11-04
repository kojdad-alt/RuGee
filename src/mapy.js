// Mapy: kde se hraje. Všechno o mapě je tady jako data: jméno a popis do menu, barva, dlaždice podlahy, ozdoby,
// kdo tam chodí (mix nepřátel a smečky) a zvláštnosti (tma v jeskyni, led na jezeře). Pravidla (hra.js) i kreslení
// (louka.js, kresleni.js) berou mapu odsud. Bez DOM, ať to jde i v simulaci.
// Novou mapu přidáš do MAPY a PORADI_MAP. Odemkne se přežitím ODEMKNUTI_MAPY s na mapě před ní.

export const VELIKOST_DLAZDICE = 48;
export const ODEMKNUTI_MAPY = 300;
export const VYCHOZI_MAPA = 'louka';

// Číslo z dvojice celých čísel, pořád stejné (podle něj se vybírá dlaždice, ozdoba i led).
export function hash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// Popis podlahy:
//   podklad = odstíny podkladu (každá obyčejná dlaždice jeden), tecky = co se na podklad nasype (pocet teček
//   sirka × vyska pixelů, svetlych = podíl světlých), obycejnych = kolik obyčejných variant, vzacne = dlaždice
//   s kresbou navíc (kresba je jméno kreslíře v louka.js, ostatní pole jsou jeho barvy), vzacnych = kolik procent
//   dlaždic je vzácných, seminko = náhoda kreseb (stejné semínko = pořád stejné dlaždice).
// Ozdoby se jen kreslí a ničemu nebrání: hustota = kolik procent dlaždic nějakou má, kusy = obrázky 16×16 z textu
// (znak = barva z palety, tečka = průhledná), zari = znaky, které ve tmě svítí, kde = jen na 'led' nebo 'snih'.
// nepratele: druh, od kolikáté sekundy chodí, vaha = jak často ho vlna vylosuje, text = ohlášení při příchodu.
// smecky: druh, kdy přijde první, po kolika sekundách další a ohlášení (null = žádné smečky).
// obtiznost: o kolik mají nepřátelé (i bossové a jejich útoky) víc životů a poškození než na Louce.
export const MAPY = {
  louka: {
    nazev: 'Louka',
    popis: 'Tráva, květiny a staré kameny. Tady každá výprava začíná.',
    barva: '#7fc46a',
    nepratele: [
      { druh: 'netopyr', od: 0, vaha: 1 },
      { druh: 'slizak', od: 60, vaha: 1 },
      { druh: 'duch', od: 90, vaha: 1, text: 'Hlubinami bloudí duchové' },
      { druh: 'houbak', od: 120, vaha: 1, text: 'Na louce vyrašili houbáci' },
      { druh: 'kostlivec', od: 150, vaha: 1 },
      { druh: 'pavouk', od: 240, vaha: 1, text: 'Z hlubin lezou pavouci' },
    ],
    smecky: { druh: 'vlk', od: 190, kazdych: 24, text: 'Ze tmy vyje smečka vlků' },
    okraje: 'rgba(0,0,0,0.45)',
    podlaha: {
      seminko: 20261104,
      podklad: ['#3f7a3a', '#417c3b', '#3d7839'],
      tecky: { pocet: 14, sirka: 1, vyska: 2, svetla: '#5c9c4e', tmava: '#2f5e2d', svetlych: 0.6 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'kvetiny', odstin: 0, barva: '#f2efe4', stred: '#f4d35e' },
        { kresba: 'kvetiny', odstin: 0, barva: '#b48ad8', stred: '#f4d35e' },
        { kresba: 'kameny', odstin: 1, barvy: ['#2f5e2d', '#8d8b80', '#b3b0a3'] },
        { kresba: 'hlina', odstin: 2, barvy: ['#6b5a3c', '#7d6a48'] },
      ],
      vzacnych: 18,
    },
    ozdoby: {
      hustota: 3,
      paleta: {
        k: '#0b0a0f', z: '#2d5a2a', Z: '#4f8f45', s: '#6f6d65', S: '#a19e92',
        h: '#c94a3a', H: '#f1e4c8', n: '#e8dcc0',
      },
      kusy: [
        { radky: [
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
        ] },
        { radky: [
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
        ] },
        { radky: [
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
        ] },
      ],
    },
  },

  // Jeskyně: tmavá kamenná podlaha, krápníky a krystaly ve skále. Kolem hrdiny je tma (tma.svetlo = poloměr
  // světla v px, s lucernou o tma.lucerna + dosah lucerny víc) a lucerna má o dosahLucerny větší dosah.
  // Víc netopýrů a pavouci už od začátku, vlci sem nechodí.
  jeskyne: {
    nazev: 'Jeskyně hlubin',
    popis: 'Tma, krápníky a krystaly ve skále. Lucerna tu svítí dál, ze stropu se spouštějí pavouci.',
    barva: '#6fc3ff',
    nepratele: [
      { druh: 'netopyr', od: 0, vaha: 3 },
      { druh: 'pavouk', od: 45, vaha: 2, text: 'Ze stropu se spouštějí pavouci' },
      { druh: 'slizak', od: 70, vaha: 1 },
      { druh: 'kostlivec', od: 100, vaha: 2, text: 'V kostnici se pohnuly kosti' },
      { druh: 'duch', od: 160, vaha: 1, text: 'Ve tmě bloudí duchové' },
      { druh: 'houbak', od: 220, vaha: 1, text: 'Ve vlhku vyrašili houbáci' },
    ],
    smecky: null,
    obtiznost: { zivoty: 1.35, poskozeni: 1.3 },
    tma: { sila: 0.84, svetlo: 170, lucerna: 70, barva: '6,5,14' },
    dosahLucerny: 1.3,
    okraje: 'rgba(0,0,0,0.3)',
    podlaha: {
      seminko: 20261105,
      podklad: ['#2b2833', '#2d2a36', '#29262f'],
      tecky: { pocet: 18, sirka: 2, vyska: 1, svetla: '#3c3847', tmava: '#1d1b23', svetlych: 0.5 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'praskliny', odstin: 0, barva: '#17151c', lesk: '#45404f' },
        { kresba: 'kaluz', odstin: 1, barvy: ['#16252f', '#25404d', '#6fa7b8'] },
        { kresba: 'krystalky', odstin: 2, barvy: ['#2c8f88', '#4fd6c9', '#b8fff5'] },
        { kresba: 'kameny', odstin: 0, barvy: ['#17151c', '#4a4655', '#6b6578'] },
      ],
      vzacnych: 20,
    },
    ozdoby: {
      hustota: 6,
      paleta: {
        k: '#0b0a0f', s: '#3b3746', S: '#565063', t: '#7c7590',
        c: '#4fd6c9', C: '#b8fff5', p: '#9a6ad8', P: '#e3c8ff', w: '#d8d0bc', W: '#a39a86',
      },
      kusy: [
        // dva krápníky
        { radky: [
          '................',
          '....kk..........',
          '...ktsk.........',
          '...kSsk.........',
          '..ktSsk.........',
          '..kSSssk........',
          '..kSSssk...kk...',
          '.ktSSsssk.ktsk..',
          '.kSSSsssk.kSsk..',
          '.kSSSsssk.kSsk..',
          'ktSSSssssktSssk.',
          'kSSSSsssskSSssk.',
          'kSSSSsssskSSssk.',
          '.kkkkkkkk.kkkk..',
          '................',
          '................',
        ] },
        // skála, ze které rostou krystaly
        { zari: 'cC', radky: [
          '................',
          '................',
          '........kk......',
          '.......kCck.....',
          '...kk..kCck.....',
          '..kCk..kcck.kk..',
          '..kck.kkcckkCk..',
          '..kckktSSckkck..',
          '.kkcktSSSSSkckk.',
          '.ktSSSSSSSSssSk.',
          'ktSSSSSSSSsssssk',
          'kSSSSsSSSsssssk.',
          'kSSSsssSsssssk..',
          '.kkkkkkkkkkkk...',
          '................',
          '................',
        ] },
        // fialové krystaly na zemi
        { zari: 'pP', radky: [
          '................',
          '................',
          '................',
          '................',
          '......kk........',
          '.....kPpk.......',
          '.....kPpk..kk...',
          '..kk.kPpk.kPpk..',
          '.kPpkkPppkkPpk..',
          '.kPpkkPppkkPpk..',
          '.kPppkPppkkppk..',
          '..kppkkppkkpk...',
          '...kkkkkkkkkk...',
          '................',
          '................',
          '................',
        ] },
        // kosti
        { radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '.....kkkk.......',
          '....kwwwwk......',
          '....kwkwkwk.....',
          '....kwwwwwk.....',
          '.....kwkwk..kk..',
          '..kk..kkk..kwk..',
          '.kwwkkkkkkkwk...',
          '..kWwwwwwwwk....',
          '...kkkkkkkk.....',
          '................',
          '................',
        ] },
      ],
    },
  },

  // Jezero: sníh, a kde ho šum (led.bunka, led.prah) udělá, led. Na ledu hrdina klouže: rychlost se k řízení
  // přibližuje jen o led.prilnavost za sekundu, takže se rozjíždí i brzdí pomalu. Vlci a ledoví duchové.
  jezero: {
    nazev: 'Zamrzlé jezero',
    popis: 'Sníh a led. Na ledu hrdina klouže a těžko brzdí, z mlhy vyjí vlci a krouží ledoví duchové.',
    barva: '#bfe6ff',
    nepratele: [
      { druh: 'netopyr', od: 0, vaha: 2 },
      { druh: 'vlk', od: 40, vaha: 1, text: 'Po sněhu se plíží vlci' },
      { druh: 'ledovy_duch', od: 75, vaha: 2, text: 'Nad ledem krouží ledoví duchové' },
      { druh: 'slizak', od: 110, vaha: 1 },
      { druh: 'kostlivec', od: 170, vaha: 1 },
    ],
    smecky: { druh: 'vlk', od: 130, kazdych: 18, text: 'Z mlhy vyje smečka vlků' },
    obtiznost: { zivoty: 1.4, poskozeni: 1.3 },
    led: { bunka: 7, prah: 0.56, prilnavost: 2.6 },
    snezeni: 70,
    okraje: 'rgba(20,40,70,0.4)',
    menuTma: 0.5,
    podlaha: {
      seminko: 20261106,
      podklad: ['#dfe8f0', '#e1e9f1', '#dde6ef'],
      tecky: { pocet: 12, sirka: 1, vyska: 1, svetla: '#f8fbff', tmava: '#c3d1df', svetlych: 0.5 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'stopy', odstin: 0, barva: '#b3c4d6' },
        { kresba: 'travicky', odstin: 1, barvy: ['#6f8a7c', '#93ab9c'] },
        { kresba: 'kameny', odstin: 2, barvy: ['#b3c4d6', '#7d8590', '#f8fbff'] },
      ],
      vzacnych: 12,
    },
    podlahaLedu: {
      seminko: 20261107,
      podklad: ['#a0d4ec', '#a3d6ed', '#9dd1ea'],
      tecky: { pocet: 7, sirka: 3, vyska: 1, svetla: '#e8f7ff', tmava: '#84c0df', svetlych: 0.7 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'praskliny', odstin: 0, barva: '#eefaff', lesk: '#7fb8da' },
        { kresba: 'bubliny', odstin: 1, barva: '#e8f7ff' },
        { kresba: 'ryba', odstin: 2, barva: '#5d8fb0' },
      ],
      vzacnych: 14,
      okraj: { snih: '#e2eaf2', stin: '#7fb3d0' },
    },
    ozdoby: {
      hustota: 4,
      paleta: {
        k: '#0b0a0f', n: '#f4f8fc', N: '#c3d1df', z: '#24493d', Z: '#3a6b58', h: '#5a4030',
        s: '#6d7580', S: '#a3abb5', i: '#bfe6ff', I: '#f2fbff', j: '#7fb8e0',
      },
      kusy: [
        // zasněžený smrček
        { kde: 'snih', radky: [
          '.......kk.......',
          '......knnk......',
          '.....knNzzk.....',
          '....knnnNzzk....',
          '....kzzZZzzk....',
          '...knnnZzNnnk...',
          '..knnNzzZzzNnk..',
          '..kzzZZZzzzzzk..',
          '.knnnNzzZZNnnnk.',
          'knnNNzzzzzzNNnnk',
          'kzzzzZZzzzZzzzzk',
          '.kkkkkkhhkkkkkk.',
          '......khhk......',
          '.....kNNNNk.....',
          '......kkkk......',
          '................',
        ] },
        // závěj
        { kde: 'snih', radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '.......kkkk.....',
          '.....kknnnnkk...',
          '...kknnnnnnnnk..',
          '..knnnnnnnnnNNk.',
          '.knnnnnnnnNNNNk.',
          'knnnnnnnNNNNNNNk',
          '.kkkkkkkkkkkkkk.',
          '................',
          '................',
          '................',
        ] },
        // kámen se sněhovou čepicí
        { kde: 'snih', radky: [
          '................',
          '................',
          '................',
          '................',
          '.....kkkkk......',
          '....knnnnnkk....',
          '...knnnnnnnnk...',
          '..kSnnnnNNnnsk..',
          '..kSSsNNssNssk..',
          '..kSsssssssssk..',
          '..ksssssssssk...',
          '...kkkkkkkkk....',
          '................',
          '................',
          '................',
          '................',
        ] },
        // kra ledu trčící z jezera
        { kde: 'led', radky: [
          '................',
          '................',
          '................',
          '.......k........',
          '......kIk.......',
          '......kIik......',
          '.....kIiik..k...',
          '.....kIiijkkIk..',
          '....kIiiijkIik..',
          '....kIiiijkIjk..',
          '...kIiiijjkijk..',
          '...kkkkkkkkkk...',
          '................',
          '................',
          '................',
          '................',
        ] },
      ],
    },
  },
};

export const PORADI_MAP = Object.keys(MAPY);

export function platnaMapa(id) {
  return typeof id === 'string' && Object.hasOwn(MAPY, id) ? id : VYCHOZI_MAPA;
}

// Mapa, která se odemkne přežitím na téhle (null = žádná další není).
export function dalsiMapa(id) {
  return PORADI_MAP[PORADI_MAP.indexOf(id) + 1] ?? null;
}

// Mapa, na které se tahle odemyká (null = první mapa, je odemčená vždy).
export function predchoziMapa(id) {
  const i = PORADI_MAP.indexOf(id);
  return i > 0 ? PORADI_MAP[i - 1] : null;
}

// Od kolikáté sekundy na mapě chodí daný druh (null = nechodí tam).
export function odKdy(mapa, druh) {
  const m = MAPY[mapa];
  if (m.smecky?.druh === druh) return Math.min(m.smecky.od, m.nepratele.find((d) => d.druh === druh)?.od ?? Infinity);
  return m.nepratele.find((d) => d.druh === druh)?.od ?? null;
}

// Ohlášení na mapě seřazená podle času: příchody druhů s textem a první smečka.
export const PRICHODY_MAP = Object.fromEntries(PORADI_MAP.map((id) => {
  const m = MAPY[id];
  const prichody = m.nepratele.filter((d) => d.text).map(({ od, text }) => ({ od, text }));
  if (m.smecky?.text) prichody.push({ od: m.smecky.od, text: m.smecky.text });
  return [id, prichody.sort((a, b) => a.od - b.od)];
}));

// Hodnotový šum 0..1: náhodná čísla v uzlech mřížky a plynulý přechod mezi nimi (sul = jiná mřížka).
function sum(gx, gy, sul) {
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const v = (x, y) => hash(x + sul * 7919, y - sul * 104729) / 4294967296;
  const horni = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * sx;
  const dolni = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * sx;
  return horni + (dolni - horni) * sy;
}

// Je dlaždice (tx, ty) ledová? Velké plochy z hrubého šumu, okraje rozbité jemnějším. Stejné pro pravidla i kreslení.
export function ledovaDlazdice(tx, ty, led) {
  const jemna = led.bunka / 2.6;
  return 0.65 * sum(tx / led.bunka, ty / led.bunka, 1) + 0.35 * sum(tx / jemna, ty / jemna, 2) > led.prah;
}

// Stojí bod (x, y) na mapě na ledu?
export function naLedu(mapa, x, y) {
  const led = MAPY[mapa]?.led;
  return Boolean(led) && ledovaDlazdice(Math.floor(x / VELIKOST_DLAZDICE), Math.floor(y / VELIKOST_DLAZDICE), led);
}
