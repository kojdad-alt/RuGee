// Režim pro barvoslepé (Nastavení → Barvy): vyp, deuteranopie, protanopie, tritanopie. Nic ve hře se pak neliší
// jen barvou: rarity karet a výbavy mají značku (kruh, kosočtverec, trojúhelník, hvězda) a barvy, které daný
// druh barvosleposti rozezná, varování bossů jsou šikmé pruhy, láva klikaté praskliny, bahno vlnky, jed puntíky
// a led jiskry. Bez režimu (vyp) vypadá všechno jako dřív.
// Jen data a funkce bez DOM (test je načte v Node). CSS (značky, palety rarit) z nich zapisuje nastroje/ramy.mjs do
// style.css, kreslení na plátno (kresleni.js, louka.js) je čte přímo. Body stránky dostane data-barvy (main.js).
// Palety jsou spočítané simulací barvosleposti (nastroje/barvoslepost.mjs): v daném režimu je mezi každou dvojicí
// rarit rozdíl aspoň ΔE00 25, test to hlídá.

export const REZIMY_BAREV = ['vyp', 'deuteranopie', 'protanopie', 'tritanopie'];

let rezim = 'vyp';
const posluchaci = new Set();

export function rezimBarev() {
  return rezim;
}

export function barvoslepy() {
  return rezim !== 'vyp';
}

// Přepne režim (neznámý = vyp). Vrací, jestli se změnil, a dá vědět posluchačům.
export function nastavBarvy(novy) {
  const r = REZIMY_BAREV.includes(novy) ? novy : 'vyp';
  if (r === rezim) return false;
  rezim = r;
  for (const p of [...posluchaci]) p(r);
  return true;
}

export function priZmeneBarev(posluchac) {
  posluchaci.add(posluchac);
  return () => posluchaci.delete(posluchac);
}

// Značka rarity a její kresba 9×9 (K = obrys, W = výplň, Q = stín). Každá má jiný obrys, takže se pozná i malá.
export const ZNAKY_RARIT = { bezna: 'kruh', vzacna: 'kosoctverec', epicka: 'trojuhelnik', legendarni: 'hvezda' };
export const KRESBY_ZNAKU = {
  kruh: [
    '..KKKKK..',
    '.KWWWWWK.',
    'KWWWWWWWK',
    'KWWWWWWWK',
    'KWWWWWWWK',
    'KWWWWWWQK',
    'KWWWWWQQK',
    '.KWQQQQK.',
    '..KKKKK..',
  ],
  kosoctverec: [
    '....K....',
    '...KWK...',
    '..KWWWK..',
    '.KWWWWWK.',
    'KWWWWWWWK',
    '.KWWWWQK.',
    '..KWWQK..',
    '...KQK...',
    '....K....',
  ],
  trojuhelnik: [
    '....K....',
    '...KWK...',
    '...KWK...',
    '..KWWWK..',
    '..KWWWK..',
    '.KWWWWWK.',
    '.KWWWWQK.',
    'KWWWWQQQK',
    'KKKKKKKKK',
  ],
  hvezda: [
    '....K....',
    '...KWK...',
    '...KWK...',
    'KKKWWWKKK',
    'KWWWWWWWK',
    '.KWWWWQK.',
    '..KWWQK..',
    '.KWWKQQK.',
    '.KKK.KKK.',
  ],
};
export const BARVY_ZNAKU = { K: '#140c08', W: '#f3efe6', Q: '#a59bb4' };

// Míchání barev #rrggbb (podil = kolik z druhé barvy).
function michej(a, b, podil) {
  const c = (x, i) => parseInt(x.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(c(a, i) * (1 - podil) + c(b, i) * podil).toString(16).padStart(2, '0')).join('')}`;
}

function rgba(barva, alfa) {
  const c = (i) => parseInt(barva.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `rgba(${c(0)}, ${c(1)}, ${c(2)}, ${alfa})`;
}

// Z barvy rarity (c = rámeček a pruh) odvodí ostatní: světlou (nápis, záře; jen trochu zesvětlenou, ať se nápisy
// rarit od sebe liší i pro barvoslepé), tmavý líc karty a záři.
function rarita(c, zar = 0.45) {
  return { c, svetla: michej(c, '#ffffff', 0.25), pozadi: michej(c, '#140c10', 0.82), zar: rgba(c, zar) };
}

// Palety rarit. vyp = jako dřív (style.css .rarita-*), ostatní najde v daném režimu každá dvojice rarit.
export const PALETY_RARIT = {
  vyp: {
    bezna: { c: '#6e6577', svetla: '#f3efe6', pozadi: '#2b1c12', zar: 'rgba(0, 0, 0, 0)' },
    vzacna: { c: '#3d7fd9', svetla: '#9fd0ff', pozadi: '#172236', zar: 'rgba(80, 160, 255, 0.4)' },
    epicka: { c: '#9a4fd8', svetla: '#dcb0ff', pozadi: '#241835', zar: 'rgba(185, 100, 255, 0.5)' },
    legendarni: { c: '#e8962a', svetla: '#ffd27a', pozadi: '#33230d', zar: 'rgba(255, 180, 60, 0.6)' },
  },
  // zelená a červená splývají: modrá, růžová a oranžová se liší odstínem i jasem
  deuteranopie: {
    bezna: { ...rarita('#605f62', 0), svetla: '#f3efe6' },
    vzacna: rarita('#2e85fa', 0.4),
    epicka: rarita('#ec92ba', 0.5),
    legendarni: rarita('#eb9200', 0.6),
  },
  // červená tmavne a splývá se zelenou: světle modrá, sytě fialová a oranžová
  protanopie: {
    bezna: { ...rarita('#605f60', 0), svetla: '#f3efe6' },
    vzacna: rarita('#9fc7e4', 0.4),
    epicka: rarita('#9c2bf9', 0.5),
    legendarni: rarita('#e79528', 0.6),
  },
  // modrá splývá se zelenou a žlutá s růžovou: modrá, purpurová a světle zlatá
  tritanopie: {
    bezna: { ...rarita('#625d71', 0), svetla: '#bdb6c6' },
    vzacna: rarita('#2189f8', 0.4),
    epicka: rarita('#dc09f9', 0.5),
    legendarni: rarita('#ffd787', 0.6),
  },
};

export function barvyRarity(id, r = rezim) {
  const paleta = PALETY_RARIT[r] ?? PALETY_RARIT.vyp;
  return paleta[id] ?? paleta.bezna;
}

// Zapnuto/hotovo a vypnuto/chyba (kontrolky, hlášení, lepší a horší staty): pro červenozelenou slepotu modrá
// a oranžová. Vedle barvy je vždycky text nebo šipka ▲ ▼.
export const BARVY_STAVU = {
  vyp: { ok: '#7cf08a', chyba: '#f08a8d' },
  deuteranopie: { ok: '#7cc4ff', chyba: '#ffb04a' },
  protanopie: { ok: '#7cc4ff', chyba: '#ffb04a' },
  tritanopie: { ok: '#7cf08a', chyba: '#ff7a9a' },
};

// Vzory nebezpečí na plátně: varování bossů šikmé pruhy (světlé a tmavé), jed puntíky. Světlá barva pruhů
// podle režimu: žlutá je pro červenozelenou slepotu nejvýraznější, při tritanopii vypadá jako bledě růžová,
// tam jsou pruhy rudé (červenou tritanop vidí dobře).
export const BARVY_VZORU = {
  deuteranopie: { pruh: '#ffd23f', tma: '#140c08', jed: '#f3efe6' },
  protanopie: { pruh: '#ffd23f', tma: '#140c08', jed: '#f3efe6' },
  tritanopie: { pruh: '#ff4d6d', tma: '#140c08', jed: '#f3efe6' },
};

export function barvyVzoru(r = rezim) {
  return BARVY_VZORU[r] ?? BARVY_VZORU.deuteranopie;
}

// Vzory zvláštních ploch (16×16 jako dlaždice, přes ni): K = tmavá čára, W = světlá, tečka = průhledné.
// Láva: klikatá prasklina se světlým okrajem, bahno: dvě vlnky, led: jiskry. Navazují na sousední dlaždice.
export const VZORY_PLOCH = {
  lava: [
    '................',
    '................',
    'K.......K.......',
    'WK.....KWK.....K',
    '.WK...KW.WK...KW',
    '..WK.KW...WK.KW.',
    '...WKW.....WKW..',
    '....W.......W...',
    '................',
    '................',
    'K.......K.......',
    'WK.....KWK.....K',
    '.WK...KW.WK...KW',
    '..WK.KW...WK.KW.',
    '...WKW.....WKW..',
    '....W.......W...',
  ],
  bahno: [
    '................',
    '................',
    '..WW........WW..',
    '.W..W......W..W.',
    'W....W....W....W',
    '......WWWW......',
    '................',
    '................',
    '................',
    '................',
    '..WW........WW..',
    '.W..W......W..W.',
    'W....W....W....W',
    '......WWWW......',
    '................',
    '................',
  ],
  led: [
    '................',
    '...W............',
    '..WWW...........',
    '...W............',
    '................',
    '..........W.....',
    '..........W.....',
    '........WWWWW...',
    '..........W.....',
    '..........W.....',
    '................',
    '................',
    '....W...........',
    '...WWW..........',
    '....W...........',
    '................',
  ],
};
export const BARVY_VZORU_PLOCH = {
  lava: { K: 'rgba(20, 12, 8, 0.85)', W: 'rgba(255, 241, 196, 0.9)' },
  bahno: { K: 'rgba(20, 12, 8, 0.6)', W: 'rgba(232, 220, 192, 0.75)' },
  led: { K: 'rgba(20, 12, 8, 0.5)', W: 'rgba(255, 255, 255, 0.95)' },
};
