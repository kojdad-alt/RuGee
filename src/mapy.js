// Mapy: kde se hraje. Všechno o mapě je tady jako data: jméno a popis do menu, barva, dlaždice podlahy, ozdoby,
// překážky, kdo tam chodí (mix nepřátel a smečky), hlavní boss a zvláštnosti (tma v jeskyni a na hřbitově, led
// na jezeře, láva na sopce, bahno a jedové bubliny v bažině, sníh, jiskry, mlha). Pravidla (hra.js) i kreslení
// (louka.js, kresleni.js) berou mapu odsud. Bez DOM, ať to jde i v simulaci.
// Novou mapu přidáš do MAPY (pořadí klíčů je pořadí map). Odemkne se přežitím ODEMKNUTI_MAPY s na mapě před ní.
// Jméno, popis a ohlášení příchodů jsou ve slovníku (src/texty/cs.js, větve mapy a prichody).
import { textem, hodnota, pripojTexty, VYCHOZI_JAZYK } from './texty.js';

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
// (znak = barva z palety, tečka = průhledná), zari = znaky, které ve tmě svítí, kde = jen na zvláštní 'plocha'
// (led, láva, bahno) nebo jen 'mimo' ni.
// Překážky (prekazky, všude kromě Louky) jsou kameny, stromy a náhrobky, přes které hrdina ani nepřátelé neprojdou
// (nepřátelé je obejdou). Duchové jimi proletí (nemají tělo) a střely přes ně přeletí (letí vzduchem, překážky jsou
// nízké). hustota = kolik promile dlaždic ji dostane, než se vyřadí sousedky, kusy = obrázky 16×16 jako ozdoby
// (stejná paleta) a kruh = [x, y, poloměr] kolize v pixelech obrázku (pixel obrázku jsou 3 px světa).
// Světla (svetla, kreslí je osvetleni.js ve WebGL): zare = kolik ze světla se přičte navíc jako záře (výbuchy, oheň,
// láva, blesky). Ve tmě (tma) svítí i hrdina, lucerna, krystaly ve skále a na zemi. Bez svetla jen viněta (Louka).
// Zvláštní plocha (led, lava nebo bahno, nejvýš jedna na mapě): bunka = jak velké plochy jsou, prah = čím vyšší,
// tím jich je míň, sul = jiná mřížka šumu (každá mapa má plochy jinde), volnoUStartu = kolem startu hrdiny není.
// Dlaždice plochy jsou v podlahaPlochy (okraj = hrana okolní země přes okraj plochy a čára pod ní).
// nepratele: druh, od kolikáté sekundy chodí, vaha = jak často ho vlna vylosuje, text = ohlášení při příchodu.
// smecky: druh, kdy přijde první, po kolika sekundách další a ohlášení (null = žádné smečky).
// boss: hlavní boss mapy (klíč z BOSSOVE v hra.js). Přijde jako první a v dalších kolech nahradí bosse, ze kterého
// vychází. obtiznost: o kolik mají nepřátelé (i bossové a jejich útoky) víc životů a poškození než na Louce.
export const MAPY = {
  louka: {
    barva: '#7fc46a',
    boss: 'strazce',
    nepratele: [
      { druh: 'netopyr', od: 0, vaha: 1 },
      { druh: 'slizak', od: 60, vaha: 1 },
      { druh: 'duch', od: 90, vaha: 1 },
      { druh: 'houbak', od: 120, vaha: 1 },
      { druh: 'kostlivec', od: 150, vaha: 1 },
      { druh: 'pavouk', od: 240, vaha: 1 },
    ],
    smecky: { druh: 'vlk', od: 190, kazdych: 24 },
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

  // Jeskyně: tmavá kamenná podlaha, krápníky a krystaly ve skále (obojí překáží). Kolem hrdiny je tma
  // (tma.svetlo = poloměr světla v px, s lucernou o tma.lucerna + dosah lucerny víc) a lucerna má o dosahLucerny
  // větší dosah. Víc netopýrů a pavouci už od začátku, vlci sem nechodí. Hlavní boss je Matka pavouků.
  jeskyne: {
    barva: '#6fc3ff',
    boss: 'matka',
    nepratele: [
      { druh: 'netopyr', od: 0, vaha: 3 },
      { druh: 'pavouk', od: 45, vaha: 2 },
      { druh: 'slizak', od: 70, vaha: 1 },
      { druh: 'kostlivec', od: 100, vaha: 2 },
      { druh: 'duch', od: 160, vaha: 1 },
      { druh: 'houbak', od: 220, vaha: 1 },
    ],
    smecky: null,
    obtiznost: { zivoty: 1.35, poskozeni: 1.3 },
    tma: { sila: 0.84, svetlo: 170, lucerna: 70, barva: '6,5,14' },
    svetla: { zare: 0.08 },
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
      hustota: 5,
      paleta: {
        k: '#0b0a0f', s: '#3b3746', S: '#565063', t: '#7c7590',
        c: '#4fd6c9', C: '#b8fff5', p: '#9a6ad8', P: '#e3c8ff', w: '#d8d0bc', W: '#a39a86',
      },
      kusy: [
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
    prekazky: {
      hustota: 30,
      kusy: [
        // dva krápníky
        { kruh: [7, 9, 6], radky: [
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
        { zari: 'cC', kruh: [8, 9.5, 6], radky: [
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
      ],
    },
  },

  // Jezero: sníh, a kde ho šum (led.bunka, led.prah) udělá, led. Na ledu hrdina klouže: rychlost se k řízení
  // přibližuje jen o led.prilnavost za sekundu, takže se rozjíždí i brzdí pomalu. Vlci a ledoví duchové, na sněhu
  // smrky a kameny (překážky). Hlavní boss je Bludička, co bloudí v mlze nad ledem.
  jezero: {
    barva: '#bfe6ff',
    boss: 'bludicka',
    nepratele: [
      { druh: 'netopyr', od: 0, vaha: 2 },
      { druh: 'vlk', od: 40, vaha: 1 },
      { druh: 'ledovy_duch', od: 75, vaha: 2 },
      { druh: 'slizak', od: 110, vaha: 1 },
      { druh: 'kostlivec', od: 170, vaha: 1 },
    ],
    smecky: { druh: 'vlk', od: 130, kazdych: 18 },
    obtiznost: { zivoty: 1.4, poskozeni: 1.3 },
    led: { bunka: 7, prah: 0.56, prilnavost: 2.6 },
    snezeni: 70,
    svetla: { zare: 0.25 },
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
    podlahaPlochy: {
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
      okraj: { hrana: '#e2eaf2', stin: '#7fb3d0' },
    },
    ozdoby: {
      hustota: 3,
      paleta: {
        k: '#0b0a0f', n: '#f4f8fc', N: '#c3d1df', z: '#24493d', Z: '#3a6b58', h: '#5a4030',
        s: '#6d7580', S: '#a3abb5', i: '#bfe6ff', I: '#f2fbff', j: '#7fb8e0',
      },
      kusy: [
        // závěj
        { kde: 'mimo', radky: [
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
        // kra ledu trčící z jezera
        { kde: 'plocha', radky: [
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
    prekazky: {
      hustota: 28,
      kusy: [
        // zasněžený smrček
        { kruh: [8, 8.5, 5.5], radky: [
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
        // kámen se sněhovou čepicí
        { kruh: [8, 8.5, 5], radky: [
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
      ],
    },
  },

  // Sopka: černá čedičová skála a lávové tůně (lava), které hrdinu pálí, dokud v nich stojí (lava.poskozeni
  // za ránu, mezi ranami chvíle klidu jako u jedu). Vzduchem letí žhavé jiskry, nejčastěji chodí ohniví brouci.
  // Hlavní boss je Lávový obr.
  sopka: {
    barva: '#ff7a2f',
    boss: 'lavovy_obr',
    nepratele: [
      { druh: 'ohnivy_brouk', od: 0, vaha: 4 },
      { druh: 'netopyr', od: 0, vaha: 1 },
      { druh: 'slizak', od: 80, vaha: 1 },
      { druh: 'kostlivec', od: 120, vaha: 1 },
      { druh: 'pavouk', od: 200, vaha: 1 },
    ],
    smecky: null,
    obtiznost: { zivoty: 1.4, poskozeni: 1.3 },
    lava: { bunka: 6, prah: 0.63, sul: 5, poskozeni: 3, zhave: true, volnoUStartu: true },
    jiskry: 48,
    svetla: { zare: 0.35 },
    okraje: 'rgba(40,6,0,0.45)',
    menuTma: 0.45,
    podlaha: {
      seminko: 20261108,
      podklad: ['#2a2426', '#2c2628', '#282224'],
      tecky: { pocet: 16, sirka: 2, vyska: 1, svetla: '#3d3436', tmava: '#1a1517', svetlych: 0.5 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'praskliny', odstin: 0, barva: '#120e0f', lesk: '#ff7a2f' },
        { kresba: 'kameny', odstin: 1, barvy: ['#120e0f', '#4a4042', '#6b5f60'] },
        { kresba: 'hlina', odstin: 2, barvy: ['#4a4446', '#5e5759'] },
        { kresba: 'praskliny', odstin: 1, barva: '#120e0f', lesk: '#4a4042' },
      ],
      vzacnych: 16,
    },
    podlahaPlochy: {
      seminko: 20261109,
      podklad: ['#e0541f', '#e35a22', '#dc4f1c'],
      tecky: { pocet: 10, sirka: 2, vyska: 1, svetla: '#ffb347', tmava: '#a8321a', svetlych: 0.6 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'bubliny', odstin: 0, barva: '#ffd27a' },
        { kresba: 'praskliny', odstin: 1, barva: '#7a2412', lesk: '#ff9a3c' },
      ],
      vzacnych: 18,
      okraj: { hrana: '#2c2628', stin: '#ffd27a' },
    },
    ozdoby: {
      hustota: 4,
      paleta: {
        k: '#0b0a0f', s: '#2f2729', S: '#4a4042', t: '#6b5f60', o: '#ff7a2f', O: '#ffd27a', e: '#a8321a',
        a: '#5e5759', A: '#857b7d', b: '#2e2440', B: '#6a5a8a',
      },
      kusy: [
        // hromádka popela
        { kde: 'mimo', radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '.........kk.....',
          '....kkk.kAak....',
          '...kAaak.kk.....',
          '..kAaaaak.......',
          '..kkkkkkk.kk....',
          '..........kSk...',
          '...........k....',
          '................',
          '................',
        ] },
        // žhavý kamínek
        { kde: 'mimo', zari: 'oO', radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '.......kkk......',
          '......kSosk.....',
          '.....kSsOosk....',
          '.....ksoossk....',
          '......kkkkk.....',
          '................',
          '................',
          '................',
          '................',
          '................',
        ] },
        // střepy obsidiánu
        { kde: 'mimo', radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '....k......k....',
          '...kBk....kBk...',
          '...kbk.k..kbk...',
          '....k.kBk..k....',
          '.......k........',
          '................',
          '................',
          '................',
          '................',
        ] },
      ],
    },
    prekazky: {
      hustota: 32,
      kusy: [
        // čedičová skála se žhavou puklinou
        { zari: 'oO', kruh: [8, 9, 6], radky: [
          '................',
          '................',
          '......kkkk......',
          '....kktSSskk....',
          '...ktSSsossk....',
          '..ktSSssoOsskk..',
          '..kSSsssoossssk.',
          '.ktSsssoossssk..',
          '.kSssssosssssssk',
          '.kSsssoOssssssk.',
          '.ksssssosssssssk',
          'kssssssoosssssk.',
          '.ksssssssossssk.',
          '..kkkkkkkkkkkk..',
          '................',
          '................',
        ] },
        // sopečný balvan
        { kruh: [8, 9, 6], radky: [
          '................',
          '................',
          '................',
          '......kkkkk.....',
          '....kktSSSskk...',
          '...ktSSSSssssk..',
          '..ktSSSsssssssk.',
          '..kSSssssssssssk',
          '.ktSssssssssesk.',
          '.kSsssssssseesk.',
          '.kSssssssssseek.',
          '.ksssssssssssek.',
          '..ksssssssssskk.',
          '...kkkkkkkkkkk..',
          '................',
          '................',
        ] },
        // obsidiánové hroty
        { kruh: [8, 9.5, 5.5], radky: [
          '................',
          '.......k........',
          '......kBk.......',
          '......kBbk......',
          '..k...kBbk......',
          '.kBk..kBbbk.k...',
          '.kBbk.kBbbkkBk..',
          '.kBbk.kBbbkkBbk.',
          '.kBbbkkBbbkkBbk.',
          'kBBbbkBBbbbkBbbk',
          'kBbbbkBbbbbkbbbk',
          'kbbbbkbbbbbkbbk.',
          '.kkkkkkkkkkkkkk.',
          '................',
          '................',
          '................',
        ] },
      ],
    },
  },

  // Bažina: tráva a bahno (bahno.zpomaleni = jak rychle v něm hrdina jde). Z bahna stoupají jedové bubliny:
  // každých bubliny.kazdych s jedna vyroste někde v bahně do bubliny.dosah px od hrdiny, bubliny.varovani s je
  // vidět (kruh na zemi), pak praskne v jedový oblak jako po houbákovi. Houbáci a skákající žáby.
  // Hlavní boss je Bahenní bludička.
  bazina: {
    barva: '#9be08a',
    boss: 'bahenni_bludicka',
    nepratele: [
      { druh: 'zaba', od: 0, vaha: 3 },
      { druh: 'netopyr', od: 0, vaha: 1 },
      { druh: 'houbak', od: 35, vaha: 2 },
      { druh: 'slizak', od: 70, vaha: 2 },
      { druh: 'duch', od: 150, vaha: 1 },
    ],
    smecky: null,
    obtiznost: { zivoty: 1.5, poskozeni: 1.4 },
    bahno: { bunka: 6, prah: 0.575, sul: 9, zpomaleni: 0.6, volnoUStartu: true },
    bubliny: { kazdych: 1.6, dosah: 320, varovani: 1, polomer: 30, jed: 4 },
    svetla: { zare: 0.3 },
    okraje: 'rgba(10,30,10,0.45)',
    podlaha: {
      seminko: 20261110,
      podklad: ['#33402a', '#35422b', '#313e28'],
      tecky: { pocet: 14, sirka: 1, vyska: 2, svetla: '#4e5e36', tmava: '#232c1c', svetlych: 0.55 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'travicky', odstin: 0, barvy: ['#4d6b34', '#7d9a4a'] },
        { kresba: 'kaluz', odstin: 1, barvy: ['#1e2a1c', '#2f4a3a', '#7fae8a'] },
        { kresba: 'hlina', odstin: 2, barvy: ['#4a3a28', '#5c4a32'] },
        { kresba: 'kvetiny', odstin: 0, barva: '#e8dcc0', stred: '#f2c94c' },
      ],
      vzacnych: 18,
    },
    podlahaPlochy: {
      seminko: 20261111,
      podklad: ['#4a3a26', '#4c3c28', '#483824'],
      tecky: { pocet: 12, sirka: 2, vyska: 1, svetla: '#5e4a30', tmava: '#33281a', svetlych: 0.5 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'bubliny', odstin: 0, barva: '#7a6a48' },
        { kresba: 'kaluz', odstin: 1, barvy: ['#2e2418', '#3e5a3a', '#8ab88a'] },
      ],
      vzacnych: 14,
      okraj: { hrana: '#3e4c30', stin: '#2a2216' },
    },
    ozdoby: {
      hustota: 4,
      paleta: {
        k: '#0b0a0f', z: '#26331f', Z: '#3e5a2e', r: '#7d9a4a', R: '#4d6b34', h: '#3a2a1c', H: '#5c4430',
        j: '#7a5c40', f: '#d8c8a0', F: '#b0563a', s: '#4e524c', S: '#6e7468',
      },
      kusy: [
        // rákosí
        { kde: 'mimo', radky: [
          '................',
          '................',
          '.....kk...kk....',
          '....khhk.khhk...',
          '....khhk.khhk...',
          '....khhk.khhk...',
          '.....kk...kk....',
          '......r....r....',
          '..k...r....r.k..',
          '..rk..r...rkr...',
          '...r..R..rR.....',
          '...rR.R.rR......',
          '....kkkkkk......',
          '................',
          '................',
          '................',
        ] },
        // houbičky
        { kde: 'mimo', radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '.........kkk....',
          '...kkk..kFFFk...',
          '..kFfFk.kFfFk...',
          '..kkfkk..kfk....',
          '...kfk...kfk....',
          '...kkk...kkk....',
          '................',
          '................',
          '................',
          '................',
        ] },
      ],
    },
    prekazky: {
      hustota: 30,
      kusy: [
        // mrtvý strom
        { kruh: [8, 10.5, 3.5], radky: [
          '................',
          '..kk.......kk...',
          '.kHjk.....kjHk..',
          '..kHjk...kjHk...',
          '...kHjk.kjHk....',
          '....kHjkjHk.....',
          '.....kHjjHk.....',
          '.....khHjHk.....',
          '.....khHjHk.....',
          '.....khHHHk.....',
          '.....khhHHk.....',
          '....kkhhHHkk....',
          '...kZkhhhHkZk...',
          '..kZZZkkkkZZZk..',
          '...kkk....kkk...',
          '................',
        ] },
        // pařez s houbou
        { kruh: [8, 9, 5], radky: [
          '................',
          '................',
          '................',
          '................',
          '.....kkkkkk.....',
          '....kjjjjjjk....',
          '...kjHHHHHHjk...',
          '...kjHjjjjHjk.kk',
          '...kHjjjjjjHkkFk',
          '...khHHHHHHhkFfk',
          '...khhkhhkhhk.k.',
          '..kZhhkhhkhhZk..',
          '..kZZkkkkkkZZk..',
          '...kk......kk...',
          '................',
          '................',
        ] },
        // balvan s mechem
        { kruh: [8, 8.5, 6], radky: [
          '................',
          '................',
          '................',
          '.....kkkkkk.....',
          '...kkZZrZZZkk...',
          '..kZZrrZZZZZZk..',
          '..kSZZZZZsZSsk..',
          '.kSSsZZsssssssk.',
          '.kSsssssssssssk.',
          '.kSsssssssssssk.',
          '.kssssssssssssk.',
          '..kssssssssssk..',
          '...kkkkkkkkkk...',
          '................',
          '................',
          '................',
        ] },
      ],
    },
  },

  // Hřbitov za noci: tma jako v jeskyni, jen slabší (svítí měsíc), přes hroby se plazí mlha (mlha.pocet chuchvalců,
  // mlha.sila = jak hustá). Náhrobky a kříže překážejí, chodí kostlivci a duchové. Hlavní boss je Kostěný král.
  hrbitov: {
    barva: '#c9ccd2',
    boss: 'kosteny_kral',
    nepratele: [
      { druh: 'netopyr', od: 0, vaha: 2 },
      { druh: 'kostlivec', od: 25, vaha: 3 },
      { druh: 'duch', od: 50, vaha: 2 },
      { druh: 'slizak', od: 110, vaha: 1 },
      { druh: 'pavouk', od: 200, vaha: 1 },
    ],
    smecky: { druh: 'vlk', od: 230, kazdych: 30 },
    obtiznost: { zivoty: 1.6, poskozeni: 1.45 },
    tma: { sila: 0.62, svetlo: 240, lucerna: 60, barva: '8,10,26' },
    mlha: { pocet: 9, barva: '196,206,226', sila: 0.12 },
    svetla: { zare: 0.1 },
    okraje: 'rgba(8,10,26,0.35)',
    podlaha: {
      seminko: 20261112,
      podklad: ['#25302f', '#27322f', '#232e2d'],
      tecky: { pocet: 14, sirka: 1, vyska: 2, svetla: '#36463f', tmava: '#1a2322', svetlych: 0.5 },
      obycejnych: 6,
      vzacne: [
        { kresba: 'kameny', odstin: 0, barvy: ['#1a2322', '#5a6068', '#7a8088'] },
        { kresba: 'hlina', odstin: 1, barvy: ['#3a2e26', '#4a3c30'] },
        { kresba: 'travicky', odstin: 2, barvy: ['#2f4a3a', '#45604e'] },
        { kresba: 'kvetiny', odstin: 0, barva: '#8a7aa8', stred: '#d8d0bc' },
      ],
      vzacnych: 18,
    },
    ozdoby: {
      hustota: 4,
      paleta: {
        k: '#0b0a0f', s: '#6b7078', S: '#9aa0a8', t: '#3e4248', z: '#2a2e2c', Z: '#3e3a30', g: '#3f5a3e', G: '#5e7e52',
        w: '#d8d0bc', W: '#a39a86', c: '#fff3b0', C: '#ffb347', r: '#b8443c',
      },
      kusy: [
        // svíčka
        { zari: 'cC', radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '.......kk.......',
          '......kcCk......',
          '......kCck......',
          '......kkkk......',
          '......kwwk......',
          '......kwWk......',
          '......kwWk......',
          '.....kkkkkk.....',
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
        // věnec
        { radky: [
          '................',
          '................',
          '................',
          '................',
          '................',
          '................',
          '.....kkkkkk.....',
          '....kgGGGGgk....',
          '...kgGkkkkGgk...',
          '...kGk....kGk...',
          '...kgGkkkkGgk...',
          '....kgGrrGgk....',
          '.....kkrrkk.....',
          '......krrk......',
          '................',
          '................',
        ] },
      ],
    },
    prekazky: {
      hustota: 34,
      kusy: [
        // náhrobek
        { kruh: [8, 9.5, 5], radky: [
          '................',
          '.....kkkkkk.....',
          '....kSSSSSSk....',
          '...kSSssssssk...',
          '...kSsttttssk...',
          '...kSsssssssk...',
          '...kSsttttssk...',
          '...kSsssssssk...',
          '...kSsstttssk...',
          '...kSsssssssk...',
          '...kSsssssssk...',
          '...kssssssstk...',
          '..kzzzzzzzzzzk..',
          '.kzZZzzzzzZZzzk.',
          '..kkkkkkkkkkkk..',
          '................',
        ] },
        // kříž
        { kruh: [8, 11, 3.5], radky: [
          '.....kkkkkk.....',
          '.....kSsssk.....',
          '.....kSsssk.....',
          '.kkkkkSssskkkkk.',
          '.kSSSSSSssssssk.',
          '.ksssssssssttsk.',
          '.kkkkkSssskkkkk.',
          '.....kSsssk.....',
          '.....kSsssk.....',
          '.....kSsstk.....',
          '.....kSsssk.....',
          '.....kSsstk.....',
          '..kzzzZZZZzzzk..',
          '.kzzZZZZZZZZzzk.',
          '..kkkkkkkkkkkk..',
          '................',
        ] },
        // velký náhrobek s mechem
        { kruh: [8, 8.5, 6], radky: [
          '................',
          '................',
          '..kkkkkkkkkkkk..',
          '.kGgSSSSSSSSSsk.',
          '.kgSssssssssssk.',
          '.kSsttttttttssk.',
          '.kSsssssssssssk.',
          '.kSsttttttssssk.',
          '.kSssssssssssgk.',
          '.kSsssssssssgGk.',
          '.kssssssssssGGk.',
          'kzzzzzzzzzzzzzzk',
          'kzZZzzzzzzzzZZzk',
          '.kkkkkkkkkkkkkk.',
          '................',
          '................',
        ] },
      ],
    },
  },
};

pripojTexty(MAPY, 'mapy');
// Ohlášení příchodu druhu (slovník prichody.<mapa>.<druh>): text mají jen druhy, které se ohlašují.
for (const [id, m] of Object.entries(MAPY)) {
  for (const d of m.nepratele) {
    const klic = `prichody.${id}.${d.druh}`;
    if (hodnota(klic, VYCHOZI_JAZYK) !== undefined) textem(d, 'text', klic);
  }
}
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
  // text zůstane getter (ohlášení je v jazyce, který platí, když druh přijde)
  const prichody = m.nepratele.filter((d) => d.text).map((d) => ({ od: d.od, get text() { return d.text; } }));
  if (m.smecky?.text) prichody.push({ od: m.smecky.od, get text() { return m.smecky.text; } });
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

// Kolem startu hrdiny (do VOLNO_U_STARTU dlaždic) nestojí překážky, a když má plocha volnoUStartu, ani ona
// (ať hrdina nezačne v lávě nebo v bahně).
export const VOLNO_U_STARTU = 3;
const uStartu = (tx, ty) => Math.abs(tx) <= VOLNO_U_STARTU && Math.abs(ty) <= VOLNO_U_STARTU;

// Je dlaždice (tx, ty) na zvláštní ploše p (led, láva, bahno)? Velké plochy z hrubého šumu, okraje rozbité
// jemnějším. Stejné pro pravidla i kreslení.
export function dlazdicePlochy(tx, ty, p) {
  if (p.volnoUStartu && uStartu(tx, ty)) return false;
  const sul = p.sul ?? 1;
  const jemna = p.bunka / 2.6;
  return 0.65 * sum(tx / p.bunka, ty / p.bunka, sul) + 0.35 * sum(tx / jemna, ty / jemna, sul + 1) > p.prah;
}

// Led je zvláštní plocha jezera (jméno zůstalo z doby, kdy byla jediná).
export function ledovaDlazdice(tx, ty, led) {
  return dlazdicePlochy(tx, ty, led);
}

// Zvláštní plocha každé mapy: { druh: 'led' | 'lava' | 'bahno', data } nebo null.
export const DRUHY_PLOCH = ['led', 'lava', 'bahno'];
const PLOCHY = Object.fromEntries(PORADI_MAP.map((id) => {
  const druh = DRUHY_PLOCH.find((d) => MAPY[id][d]);
  return [id, druh ? { druh, data: MAPY[id][druh] } : null];
}));

export function plochaMapy(mapa) {
  return PLOCHY[mapa] ?? null;
}

// Na jaké zvláštní ploše stojí bod (x, y): 'led', 'lava', 'bahno', nebo null.
export function naPlose(mapa, x, y) {
  const p = PLOCHY[mapa];
  return p && dlazdicePlochy(Math.floor(x / VELIKOST_DLAZDICE), Math.floor(y / VELIKOST_DLAZDICE), p.data) ? p.druh : null;
}

// Stojí bod (x, y) na mapě na ledu?
export function naLedu(mapa, x, y) {
  return naPlose(mapa, x, y) === 'led';
}

// Překážky. Dlaždice ji dostane podle hashe (hustota promile), jen když ji nemá žádná sousední dlaždice vlevo,
// nahoře ani úhlopříčně nad ní (takže dvě překážky nikdy nestojí vedle sebe a mezi nimi jde vždycky projít),
// když není na zvláštní ploše a když není do VOLNO_U_STARTU dlaždic od startu hrdiny.
const PIXEL_OBRAZKU = VELIKOST_DLAZDICE / 16;

function zakladPrekazky(p, tx, ty) {
  return hash(tx + 7331, ty - 1913) % 1000 < p.hustota;
}

// Která překážka stojí na dlaždici (index v prekazky.kusy), -1 = žádná.
export function prekazkaNaDlazdici(mapa, tx, ty) {
  const p = MAPY[mapa]?.prekazky;
  if (!p || uStartu(tx, ty) || !zakladPrekazky(p, tx, ty)) return -1;
  if (zakladPrekazky(p, tx - 1, ty) || zakladPrekazky(p, tx - 1, ty - 1) || zakladPrekazky(p, tx, ty - 1) || zakladPrekazky(p, tx + 1, ty - 1)) return -1;
  const plocha = PLOCHY[mapa];
  if (plocha && dlazdicePlochy(tx, ty, plocha.data)) return -1;
  return (hash(tx - 4049, ty + 2671) >>> 8) % p.kusy.length;
}

// Kolizní kruh překážky na dlaždici ve světě ({ x, y, r, kus }), nebo null.
export function kruhPrekazky(mapa, tx, ty) {
  const kus = prekazkaNaDlazdici(mapa, tx, ty);
  if (kus < 0) return null;
  const [x, y, r] = MAPY[mapa].prekazky.kusy[kus].kruh;
  return { x: tx * VELIKOST_DLAZDICE + x * PIXEL_OBRAZKU, y: ty * VELIKOST_DLAZDICE + y * PIXEL_OBRAZKU, r: r * PIXEL_OBRAZKU, kus };
}

// Překážky, kterých by se mohl dotknout kruh o poloměru polomer kolem (x, y).
export function prekazkyKolem(mapa, x, y, polomer) {
  if (!MAPY[mapa]?.prekazky) return [];
  const kruhy = [];
  const tx1 = Math.floor((x + polomer) / VELIKOST_DLAZDICE) + 1;
  const ty1 = Math.floor((y + polomer) / VELIKOST_DLAZDICE) + 1;
  for (let ty = Math.floor((y - polomer) / VELIKOST_DLAZDICE) - 1; ty <= ty1; ty++) {
    for (let tx = Math.floor((x - polomer) / VELIKOST_DLAZDICE) - 1; tx <= tx1; tx++) {
      const k = kruhPrekazky(mapa, tx, ty);
      if (k) kruhy.push(k);
    }
  }
  return kruhy;
}

// Vytlačí kruh (o.x, o.y, polomer) ven z překážek (o.x a o.y se změní). Vrací směr od překážky, do které vjel
// ({ x, y }, délka 1), nebo null, když do žádné nevjel.
export function vytlacZPrekazek(mapa, o, polomer) {
  let normala = null;
  for (const k of prekazkyKolem(mapa, o.x, o.y, polomer)) {
    let dx = o.x - k.x;
    let dy = o.y - k.y;
    let d = Math.hypot(dx, dy);
    const min = k.r + polomer;
    if (d >= min) continue;
    if (d < 1e-6) {
      dx = 1;
      dy = 0;
      d = 1;
    }
    o.x = k.x + (dx / d) * min;
    o.y = k.y + (dy / d) * min;
    normala = { x: dx / d, y: dy / d };
  }
  return normala;
}

// Jak hluboko je kruh (x, y, polomer) v nějaké překážce (0 = nikde). Jen pro kontrolu v simulaci.
export function hloubkaVPrekazce(mapa, x, y, polomer) {
  let nejvic = 0;
  for (const k of prekazkyKolem(mapa, x, y, polomer)) nejvic = Math.max(nejvic, k.r + polomer - Math.hypot(x - k.x, y - k.y));
  return nejvic;
}
