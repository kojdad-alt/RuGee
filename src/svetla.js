// Světla (osvětlení ve WebGL, kreslí ho osvetleni.js): co na obrazovce svítí a pojistka, která světla vypne, když
// s nimi hra zpomalí. Jen pravidla a čísla, bez DOM a bez WebGL, ať to jde i v simulaci.
//
// Světlo = kruh na obrazovce: střed (px), poloměr (px), barva krát síla (1 = naplno, přes 1 = přezáření, třeba
// výbuch) a jádro (do jaké části poloměru svítí naplno, pak k okraji slábne). sberSvetel() je zapíše za sebe do
// připraveného Float32Array po PRVKU_SVETLA číslech, nejdůležitější první, a nikdy jich nedá víc než MAX_SVETEL.
// Nic nealokuje (ani pole, ani objekty), běží v každém snímku.
import {
  DOHASINANI, TRVANI_VYBUCHU, TRVANI_ZABLESKU, TRVANI_DOPADU, TRVANI_VYBUCHU_SEMINKA, TRVANI_TRISTENI, TRVANI_ODLESKU,
  ODHOZENI_PRI_OZIVENI,
} from './hra.js';
import { MAPY, VYCHOZI_MAPA } from './mapy.js';

export const MAX_SVETEL = 128;
// Světla jedné skupiny, které by jinak zabraly všechno (krystaly zkušeností, láva, jiskry), mají vlastní strop.
export const MAX_LAVY = 40;
export const MAX_KRYSTALU = 40;
export const MAX_JISKER = 24;
export const MAX_SVITIVYCH = 24;
const PRAZDNE = Object.freeze([]);
// x, y, poloměr, r, g, b, jádro
export const PRVKU_SVETLA = 7;

// Barvy světel (0–1). Hrdina nese teplé bílé světlo, lucerna oranžové.
const B = {
  hrdina: [1, 0.93, 0.8],
  lucerna: [1, 0.74, 0.42],
  krystal: [0.31, 0.84, 0.79],
  plamen: [1, 0.55, 0.22],
  svetluska: [0.75, 0.95, 0.45],
  blesk: [0.56, 0.83, 1],
  jiskra: [1, 0.82, 0.48],
  vybuch: [1, 0.86, 0.62],
  oziveni: [0.5, 0.61, 0.94],
  seminko: [0.95, 0.79, 0.3],
  mraz: [0.62, 0.86, 1],
  odlesk: [0.9, 0.96, 1],
  lava: [1, 0.48, 0.18],
  uhlik: [1, 0.55, 0.23],
  varovani: [0.9, 0.28, 0.3],
  vlna: [1, 0.7, 0.28],
};
// Střely bossů (stejné barvy jako v kresleni.js) a co svítí, když dopadne kámen bosse.
const BARVY_STREL = { vejir: [0.5, 0.61, 0.94], bahno: [0.47, 0.78, 0.35], odrazena: [0.89, 0.96, 0.95] };
const BARVY_DOPADU = {
  kamen: [1, 0.55, 0.2], kokon: [0.89, 0.96, 0.95], magma: [1, 0.45, 0.15], lebka: [0.31, 0.84, 0.79], stepek: [0.31, 0.84, 0.79],
  snezka: [0.87, 0.91, 1], hrnicek: [0.5, 0.61, 0.94], prach: [0.7, 0.65, 0.55],
};
// Bossové a nepřátelé, kteří sami svítí: barva, poloměr (px) a síla.
const SVITI = {
  bludicka: { barva: [0.56, 0.71, 1], r: 120, sila: 0.9 },
  bahenni_bludicka: { barva: [0.61, 0.88, 0.54], r: 120, sila: 0.9 },
  lavovy_obr: { barva: [1, 0.48, 0.18], r: 100, sila: 0.75 },
  kosteny_kral: { barva: [0.55, 0.9, 0.85], r: 80, sila: 0.4 },
  ohnivy_brouk: { barva: [1, 0.6, 0.25], r: 44, sila: 0.55 },
  ledovy_duch: { barva: [0.62, 0.78, 1], r: 40, sila: 0.35 },
  // Jeskyně: krystaly krystalníka a lucerna permoníka.
  krystalnik: { barva: [0.31, 0.84, 0.79], r: 40, sila: 0.4 },
  permonik: { barva: [1, 0.7, 0.28], r: 36, sila: 0.4 },
  // Sopka: křídla ohnivé můry a plamenný hřbet salamandra.
  ohniva_mura: { barva: [1, 0.6, 0.25], r: 36, sila: 0.45 },
  salamandr: { barva: [1, 0.5, 0.2], r: 40, sila: 0.45 },
  // Hřbitov: lucerna hrobníka.
  hrobnik: { barva: [1, 0.7, 0.28], r: 40, sila: 0.45 },
};
// Kruhy vyvolání svítí barvou bosse (pruh bosse v kresleni.js).
const BARVY_BOSSU = {
  strazce: [1, 0.7, 0.28], matka: [0.9, 0.28, 0.3], obr: [0.5, 0.77, 0.42], bludicka: [0.56, 0.71, 1],
  lavovy_obr: [1, 0.48, 0.18], bahenni_bludicka: [0.61, 0.88, 0.54], kosteny_kral: [0.91, 0.89, 0.82],
  hradni_pan: [0.6, 0.64, 0.72],
};

// Jak mapa svítí. tma = síla tmy (0 = žádná), barvaTmy = do čeho tmavne, zare = kolik ze světla se přičte navíc
// (záře, na světlých mapách jen ta), vineta = okraje obrazovky (barva a síla jako ztmavení okrajů v kresleni.js),
// svetla = jestli se vůbec sbírají světla (Louka má jen vinětu), hrdina = jestli svítí hrdina a lucerna (jen ve tmě),
// pricitat = jestli je co přičíst i bez světel.
const osvetleni = new Map();
export function osvetleniMapy(id) {
  if (!osvetleni.has(id)) {
    const mapa = MAPY[id] ?? MAPY[VYCHOZI_MAPA];
    const s = mapa.svetla ?? {};
    const tma = mapa.tma ? mapa.tma.sila : 0;
    const barvaTmy = mapa.tma ? mapa.tma.barva.split(',').map((c) => Number(c) / 255) : [0, 0, 0];
    const okraje = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(mapa.okraje ?? 'rgba(0,0,0,0.45)');
    const vineta = { barva: okraje.slice(1, 4).map((c) => Number(c) / 255), sila: Number(okraje[4]) };
    osvetleni.set(id, {
      tma,
      barvaTmy,
      zare: s.zare ?? 0,
      vineta,
      svetla: (s.zare ?? 0) > 0 || tma > 0,
      hrdina: tma > 0,
      // je co přičíst i bez světel (barva tmy nebo okrajů není černá)? Louka ne.
      pricitat: (tma > 0 && barvaTmy.some((c) => c > 0)) || vineta.barva.some((c) => c > 0),
    });
  }
  return osvetleni.get(id);
}

// Kam sberSvetel zrovna zapisuje (stav na úrovni modulu, ať se v každém snímku nevytváří nová funkce).
let cil = null;
let pocet = 0;
let sirkaObrazovky = 0;
let vyskaObrazovky = 0;

// Přidá světlo, když je aspoň kouskem na obrazovce a ještě je místo. Souřadnice jsou už na obrazovce.
function pridej(x, y, r, barva, sila, jadro) {
  if (pocet >= MAX_SVETEL || !(r > 0) || !(sila > 0)) return false;
  if (x + r < 0 || y + r < 0 || x - r > sirkaObrazovky || y - r > vyskaObrazovky) return false;
  const i = pocet * PRVKU_SVETLA;
  cil[i] = x;
  cil[i + 1] = y;
  cil[i + 2] = r;
  cil[i + 3] = barva[0] * sila;
  cil[i + 4] = barva[1] * sila;
  cil[i + 5] = barva[2] * sila;
  cil[i + 6] = jadro;
  pocet += 1;
  return true;
}

// Zapíše světla na obrazovce do pole (Float32Array aspoň MAX_SVETEL * PRVKU_SVETLA). Vrací, kolik jich je.
// pohled: kx, ky = levý horní roh obrazovky ve světě, sirka, vyska, s = staty(hra), polomer = poloměr světla hrdiny
// (bez lucerny), dosvit = poloměr světla lucerny, lucerna = jestli ji hrdina má, lucernaX/Y = kde visí na obrazovce,
// zare = svítící ozdoby z kresliPodlahu ({ x, y, velikost, barva }, zare.zhave = žhavé dlaždice [px, py, h],
// zare.dlazdice = velikost dlaždice).
export function sberSvetel(pole, hra, pohled) {
  const o = osvetleniMapy(hra.mapa);
  if (!o.svetla) return 0;
  cil = pole;
  pocet = 0;
  sirkaObrazovky = pohled.sirka;
  vyskaObrazovky = pohled.vyska;
  const { kx, ky } = pohled;
  const cas = hra.cas;
  const hx = hra.hrdina.x - kx;
  const hy = hra.hrdina.y - ky;

  // 1. Hrdina a lucerna (jen ve tmě). Poloměr se chvěje jako plamen (stejně jako tma bez světel).
  if (o.hrdina) {
    const chveni = 1 + 0.025 * Math.sin(cas * 7) + 0.015 * Math.sin(cas * 17.3);
    pridej(hx, hy, pohled.polomer * chveni, B.hrdina, 0.9, 0.55);
    if (pohled.lucerna) pridej(pohled.lucernaX, pohled.lucernaY, pohled.dosvit * chveni, B.lucerna, 0.7, 0.5);
  }
  // 2. Výbuchy: bomba rozsvítí celou obrazovku, Oživení modrý kruh.
  if (hra.vybuch > 0) {
    const t = 1 - hra.vybuch / TRVANI_VYBUCHU;
    pridej(hx, hy, 100 + t * Math.hypot(sirkaObrazovky, vyskaObrazovky) / 2, B.vybuch, 1.8 * (1 - t), 0.6);
  }
  if (hra.zablesk > 0) {
    const t = 1 - hra.zablesk / TRVANI_ZABLESKU;
    pridej(hx, hy, 40 + t * ODHOZENI_PRI_OZIVENI, B.oziveni, 1.2 * (1 - t), 0.7);
  }
  // 3. Bossové a jejich schopnosti: kdo sám svítí, varování na zemi, vlny dupnutí, dopady kamenů a střely.
  const nepratele = hra.nepratele;
  for (let i = 0; i < nepratele.length; i++) {
    const nep = nepratele[i];
    if (!nep.boss) continue;
    const x = nep.x - kx;
    const y = nep.y - ky;
    const sviti = SVITI[nep.druh];
    if (sviti) pridej(x, y, sviti.r, sviti.barva, sviti.sila * (0.85 + 0.15 * Math.sin(cas * 5)), 0.3);
    const sch = nep.schopnost;
    if (!sch || sch.faze !== 'varovani') continue;
    const t = Math.max(0, Math.min(1, 1 - sch.zbyva / sch.s.varovani));
    if (sch.id === 'dupnuti') pridej(x, y, Math.max(24, sch.s.polomer * t) + 20, B.varovani, 0.35 + 0.35 * t, 0.7);
    else if (sch.id === 'vypad') {
      for (let k = 1; k <= 3; k++) pridej(x + sch.ux * sch.s.delka * (k / 3), y + sch.uy * sch.s.delka * (k / 3), 60, B.varovani, 0.5, 0.3);
    } else if (sch.id === 'vyvolani') {
      for (let k = 0; k < sch.mista.length; k++) {
        pridej(sch.mista[k].x - kx, sch.mista[k].y - ky, 30 + 20 * t, BARVY_BOSSU[nep.druh] ?? B.varovani, 0.5 + 0.4 * t, 0.3);
      }
    }
  }
  for (let i = 0; i < hra.vlny.length; i++) {
    const v = hra.vlny[i];
    const t = v.r / v.max;
    pridej(v.x - kx, v.y - ky, v.r + 24, B.vlna, 0.6 * (1 - t * t * 0.7), 0.85);
  }
  const dopady = hra.dopady ?? PRAZDNE;
  for (let i = 0; i < dopady.length; i++) {
    const d = dopady[i];
    const t = 1 - d.zivot / TRVANI_DOPADU;
    pridej(d.x - kx, d.y - ky, d.polomer * 2.2, BARVY_DOPADU[d.druh] ?? BARVY_DOPADU.kamen, 1.4 * (1 - t), 0.3);
  }
  for (let i = 0; i < hra.kameny.length; i++) {
    const k = hra.kameny[i];
    if (k.druh !== 'magma' || k.let < 0) continue;
    // magma svítí v letu: mezi startem a dopadem po oblouku (výška oblouku odhadem, stačí na záři)
    const t = Math.min(1, k.let / k.trvani);
    pridej(k.odX + (k.x - k.odX) * t - kx, k.odY + (k.y - k.odY) * t - ky - Math.sin(Math.PI * t) * 60, 50, B.lava, 0.8, 0.2);
  }
  for (let i = 0; i < hra.strelyBossu.length; i++) {
    const st = hra.strelyBossu[i];
    pridej(st.x - kx, st.y - ky, 40, st.odrazena ? BARVY_STREL.odrazena : BARVY_STREL[st.barva] ?? BARVY_STREL.vejir, 0.9, 0.2);
  }
  // 4. Zbraně: blesky, výbuchy semínek, roztříštěný mráz, odlesky zrcadel, Ohnivá stopa, světlušky a uhlíky.
  for (let i = 0; i < hra.blesky.length; i++) {
    const bl = hra.blesky[i];
    const sila = Math.min(1, bl.zivot / 0.18) * 1.3;
    for (let k = 0; k < bl.body.length; k++) pridej(bl.body[k].x - kx, bl.body[k].y - ky, 70, B.blesk, sila, 0.2);
  }
  const vybuchy = hra.vybuchySeminek ?? PRAZDNE;
  for (let i = 0; i < vybuchy.length; i++) {
    const vb = vybuchy[i];
    const t = 1 - vb.zivot / TRVANI_VYBUCHU_SEMINKA;
    pridej(vb.x - kx, vb.y - ky, vb.polomer * 1.8, B.seminko, 1.3 * (1 - t), 0.3);
  }
  const roztristeni = hra.roztristeni ?? PRAZDNE;
  for (let i = 0; i < roztristeni.length; i++) {
    const r = roztristeni[i];
    const t = 1 - r.zivot / TRVANI_TRISTENI;
    pridej(r.x - kx, r.y - ky, r.polomer * 1.6, B.mraz, 1.2 * (1 - t), 0.4);
  }
  const odlesky = hra.odlesky ?? PRAZDNE;
  for (let i = 0; i < odlesky.length; i++) pridej(odlesky[i].x - kx, odlesky[i].y - ky, 36, B.odlesk, odlesky[i].zivot / TRVANI_ODLESKU, 0.2);
  const plameny = hra.plameny ?? PRAZDNE;
  for (let i = 0; i < plameny.length; i++) {
    const pl = plameny[i];
    const zhasina = Math.min(1, pl.zivot / DOHASINANI);
    const mihot = 0.85 + 0.15 * Math.sin(cas * 13 + pl.x * 0.07 + pl.y * 0.05);
    pridej(pl.x - kx, pl.y - ky, pl.polomer * 2.2, B.plamen, 0.5 * zhasina * mihot, 0.25);
  }
  const svetlusky = hra.svetlusky ?? PRAZDNE;
  for (let i = 0; i < svetlusky.length; i++) pridej(svetlusky[i].x - kx, svetlusky[i].y - ky, 42, B.svetluska, 0.7, 0.2);
  const s = pohled.s;
  if (hra.zbrane.lucerna && s?.lucerna?.uhliky > 0) {
    for (let i = 0; i < s.lucerna.uhliky; i++) {
      const uhel = -hra.uhelUhliku + (i / s.lucerna.uhliky) * Math.PI * 2;
      pridej(hx + Math.cos(uhel) * s.lucerna.dosah, hy + Math.sin(uhel) * s.lucerna.dosah, 34, B.uhlik, 0.8, 0.2);
    }
  }
  const zony = hra.ledoveZony ?? PRAZDNE;
  for (let i = 0; i < zony.length; i++) pridej(zony[i].x - kx, zony[i].y - ky, zony[i].polomer * 1.2, B.mraz, 0.35, 0.5);
  let jisker = 0;
  for (let i = 0; i < hra.strely.length && jisker < MAX_JISKER; i++) {
    if (pridej(hra.strely[i].x - kx, hra.strely[i].y - ky, 26, B.jiskra, 0.6, 0.2)) jisker += 1;
  }
  // 5. Nepřátelé, kteří sami svítí (ohniví brouci, ledoví duchové), mají svůj strop, ať nesežerou lávu.
  let svitivych = 0;
  for (let i = 0; i < nepratele.length && svitivych < MAX_SVITIVYCH; i++) {
    const nep = nepratele[i];
    const sviti = SVITI[nep.druh];
    if (!sviti || nep.boss || nep.skryty) continue;
    if (pridej(nep.x - kx, nep.y - ky, sviti.r, sviti.barva, sviti.sila, 0.3)) svitivych += 1;
  }
  // 6. Svítící ozdoby ve skále (krystaly), jen ve tmě, pomalu se mihotají.
  const zare = pohled.zare;
  if (o.hrdina && zare) {
    for (let i = 0; i < zare.length; i++) {
      const z = zare[i];
      if (z.barva) pridej(z.x + z.velikost / 2, z.y + z.velikost / 2, z.velikost * 0.95, z.barva, 0.45 + 0.12 * Math.sin(cas * 2 + i * 1.7), 0.15);
    }
  }
  // 7. Láva: každá žhavá dlaždice (když jich je moc, jen každá k-tá s větším poloměrem, ať je záře pořád souvislá).
  const zhave = zare?.zhave;
  if (zhave?.length) {
    const krok = Math.ceil(zhave.length / MAX_LAVY);
    const d = zare.dlazdice ?? 48;
    const r = d * (0.95 + 0.35 * Math.sqrt(krok));
    for (let i = 0; i < zhave.length; i += krok) {
      const z = zhave[i];
      pridej(z[0] + d / 2, z[1] + d / 2, r, B.lava, 0.45 + 0.15 * Math.sin(cas * 1.8 + (z[2] % 17) * 0.6), 0.2);
    }
  }
  // 8. Krystaly zkušeností na zemi svítí jen ve tmě (na světle by z nich byla rozmazaná skvrna).
  if (o.hrdina) {
    let krystalu = 0;
    for (let i = 0; i < hra.krystaly.length && krystalu < MAX_KRYSTALU; i++) {
      const kr = hra.krystaly[i];
      if (pridej(kr.x - kx, kr.y - ky, kr.velky ? 42 : 26, B.krystal, kr.velky ? 0.9 : 0.6, 0.2)) krystalu += 1;
    }
  }
  cil = null;
  return pocet;
}

// ---------- Pojistka ----------
// Světla jsou hezčí, ale nesmí hru zpomalit. Pojistka měří snímky za hry (po oknech o POJISTKA.okno s). Když je
// FPS se světly POJISTKA.pomalych oken za sebou pod prahem, světla na jedno okno vypne a změří, jestli je bez nich
// hra rychlejší. Když ano (aspoň o POJISTKA.zlepseni a 5 FPS), vypne je nadobro (do dalšího spuštění, main.js si to
// i zapamatuje). Když ne (zařízení je pomalé samo, třeba úsporný režim na 30 FPS), světla zase zapne a práh sníží
// pod to, co namířila, ať se zkouška neopakuje dokola. Pauza a záložka na pozadí (snímek delší než 0,25 s)
// měření jen přeruší.
export const POJISTKA = { okno: 2, prah: 45, pomalych: 2, zlepseni: 1.2, usazeni: 0.5, klid: 20 };

export function vytvorPojistku(p = POJISTKA) {
  const s = { faze: 'meri', snimku: 0, cas: 0, pomalych: 0, prah: p.prah, cekat: 0, fpsSeSvetly: 0, fpsBez: 0, zkousek: 0, posledniFps: 0 };
  return {
    stav: s,
    // Mají teď svítit světla? (při zkoušce a po vypnutí ne)
    get svitit() {
      return s.faze === 'meri';
    },
    get vypnuto() {
      return s.faze === 'vypnuto';
    },
    snimek(dt) {
      if (s.faze === 'vypnuto') return;
      if (!(dt > 0) || dt > 0.25) {
        s.snimku = 0;
        s.cas = 0;
        return;
      }
      if (s.cekat > 0) {
        s.cekat -= dt;
        return;
      }
      s.snimku += 1;
      s.cas += dt;
      if (s.cas < p.okno) return;
      const fps = s.snimku / s.cas;
      s.posledniFps = fps;
      s.snimku = 0;
      s.cas = 0;
      if (s.faze === 'meri') {
        s.pomalych = fps < s.prah ? s.pomalych + 1 : 0;
        if (s.pomalych >= p.pomalych) {
          s.faze = 'zkouska';
          s.fpsSeSvetly = fps;
          s.pomalych = 0;
          s.zkousek += 1;
          s.cekat = p.usazeni;
        }
      } else if (s.faze === 'zkouska') {
        s.fpsBez = fps;
        if (fps >= s.fpsSeSvetly * p.zlepseni && fps - s.fpsSeSvetly >= 5) s.faze = 'vypnuto';
        else {
          s.faze = 'meri';
          s.prah = Math.min(s.prah, s.fpsSeSvetly * 0.8);
          s.cekat = p.klid;
        }
      }
    },
  };
}

// Režim světel v nastavení: auto (svítí, dokud to zařízení zvládá), zap (svítí vždycky, když to prohlížeč umí),
// vyp (dnešní tma bez WebGL).
export const REZIMY_SVETEL = ['auto', 'zap', 'vyp'];
