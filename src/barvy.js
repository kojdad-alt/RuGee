// Režim pro barvoslepé (Nastavení → Barvy): vyp, deuteranopie, protanopie, tritanopie. Nic ve hře se pak neliší
// jen barvou: rarity karet a výbavy mají značku (kruh, čtverec, kosočtverec, trojúhelník, hvězda, koruna, slunce)
// a barvy, které daný
// druh barvosleposti rozezná, varování bossů jsou šikmé pruhy, láva klikaté praskliny, bahno vlnky, jed puntíky
// a led jiskry. Bez režimu (vyp) vypadá všechno jako dřív.
// Jen data a funkce bez DOM (test je načte v Node). CSS (značky, palety rarit) z nich zapisuje nastroje/ramy.mjs do
// style.css, kreslení na plátno (kresleni.js, louka.js) je čte přímo. Body stránky dostane data-barvy (main.js).
// Palety jsou spočítané simulací barvosleposti (nastroje/barvoslepost.mjs): v daném režimu je mezi každou dvojicí
// rarit rozdíl aspoň ΔE00 25, test to hlídá. Se sedmi raritami je to těsné, barvy hledal optimalizátor (běžná
// zůstala šedá, nové rarity co nejblíž barvám bez režimu), značka ale raritu pozná vždycky i bez barvy.

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
export const ZNAKY_RARIT = {
  bezna: 'kruh', neobvykla: 'ctverec', vzacna: 'kosoctverec', epicka: 'trojuhelnik', legendarni: 'hvezda', myticka: 'koruna', bozska: 'slunce',
};
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
  ctverec: [
    'KKKKKKKKK',
    'KWWWWWWWK',
    'KWWWWWWWK',
    'KWWWWWWWK',
    'KWWWWWWWK',
    'KWWWWWWQK',
    'KWWWWWQQK',
    'KWWQQQQQK',
    'KKKKKKKKK',
  ],
  koruna: [
    'K...K...K',
    'KK.KWK.KK',
    'KWKWWWKWK',
    'KWWWWWWWK',
    'KWWWWWWQK',
    'KWWWWWQQK',
    'KKKKKKKKK',
    '.KWWWQQK.',
    '.KKKKKKK.',
  ],
  slunce: [
    'KK..K..KK',
    'KWK.K.KWK',
    '.KKKWKKK.',
    '..KWWWK..',
    'KKWWWWWKK',
    '..KWWQK..',
    '.KKKQKKK.',
    'KQK.K.KQK',
    'KK..K..KK',
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

// Palety rarit. vyp = bez režimu (style.css .rarita-*): šedá, zelená, modrá, fialová, oranžová, karmínová a perleťová
// (Božská má v CSS navíc pomalou duhovou záři). Ostatní najde v daném režimu každá dvojice rarit.
export const PALETY_RARIT = {
  vyp: {
    bezna: { c: '#6e6577', svetla: '#f3efe6', pozadi: '#2b1c12', zar: 'rgba(0, 0, 0, 0)' },
    neobvykla: { c: '#4fa83d', svetla: '#a6e29a', pozadi: '#16261a', zar: 'rgba(110, 200, 90, 0.35)' },
    vzacna: { c: '#3d7fd9', svetla: '#9fd0ff', pozadi: '#172236', zar: 'rgba(80, 160, 255, 0.4)' },
    epicka: { c: '#9a4fd8', svetla: '#dcb0ff', pozadi: '#241835', zar: 'rgba(185, 100, 255, 0.5)' },
    legendarni: { c: '#e8962a', svetla: '#ffd27a', pozadi: '#33230d', zar: 'rgba(255, 180, 60, 0.6)' },
    myticka: { c: '#d8423a', svetla: '#ff9e8c', pozadi: '#361311', zar: 'rgba(255, 90, 70, 0.6)' },
    bozska: { c: '#ece8f8', svetla: '#ffffff', pozadi: '#26232f', zar: 'rgba(240, 235, 255, 0.7)' },
  },
  // zelená a červená splývají: tyrkysová, modrá, světle růžová, oranžová, rezavá a smetanová se liší odstínem i jasem
  deuteranopie: {
    bezna: { ...rarita('#605f62', 0), svetla: '#ececec' },
    neobvykla: rarita('#2cb994', 0.35),
    vzacna: rarita('#3185f6', 0.4),
    epicka: rarita('#efb3ff', 0.5),
    legendarni: rarita('#f28800', 0.6),
    myticka: rarita('#a83b18', 0.6),
    bozska: rarita('#ffffce', 0.7),
  },
  // červená tmavne a splývá se zelenou: jasně zelená, světle modrá, sytě fialová, oranžová, rudá a smetanová
  protanopie: {
    bezna: { ...rarita('#737373', 0), svetla: '#c8c8c8' },
    neobvykla: rarita('#5bfe3b', 0.35),
    vzacna: rarita('#95caf3', 0.4),
    epicka: rarita('#9c2af9', 0.5),
    legendarni: rarita('#d68309', 0.6),
    myticka: rarita('#c2170c', 0.6),
    bozska: rarita('#ffffeb', 0.7),
  },
  // modrá splývá se zelenou a žlutá s růžovou: zelená, modrá, purpurová, světle zlatá, rudá a světle žlutá
  tritanopie: {
    bezna: { ...rarita('#625d71', 0), svetla: '#b9b9b9' },
    neobvykla: rarita('#06e72d', 0.35),
    vzacna: rarita('#3574f8', 0.4),
    epicka: rarita('#d409ff', 0.5),
    legendarni: rarita('#efc059', 0.6),
    myticka: rarita('#e71a2a', 0.6),
    bozska: rarita('#f5ffd1', 0.7),
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
