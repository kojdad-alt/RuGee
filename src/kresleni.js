import { sprity } from './sprity.js';
import {
  staty, TRVANI_TRESU, VYCHOZI_TRIDA, TRVANI_ZABLESKU, ODHOZENI_PRI_OZIVENI, TRVANI_OBLAKU, NAFUKOVANI_OBLAKU,
  TRVANI_ZARU, TRVANI_VYBUCHU, bossBary, TRVANI_DOPADU, ZJEVENI_BLUDICKY, POLOMER_STRELY_BOSSU,
  RUST_TRNU, VADNUTI_TRNU, DOZNIVANI_TRNU, TRVANI_ODLESKU, poziceZrcadla, TRVANI_HLASENI_HROZBY, TRVANI_OTEVRENI,
  KUPEC, CENA_ZAMCENE, POLOMER_ZAMCENE, zakladBosse, DOPAD_KRYSTALU, DOZNIVANI_MRAZU, TRVANI_TRISTENI,
  KYV_ZVONU, ZRANI_SEMINKA, POMER_KERE, RUST_KERE, VADNUTI_KERE, TRVANI_VYBUCHU_SEMINKA,
  VYRAZENI_KORENU, VZPLANUTI, DOHASINANI, PAD_KAMENE, TRVANI_DOZVUKU, poziceUhliku,
  LET_KAPKY, TRVANI_OSTNU, TRVANI_PRASKNUTI, maStit, dobitiStitu, PET,
} from './hra.js';
import { PETY } from './pety.js';
import { kresliPodlahu } from './louka.js';
import { MAPY, VYCHOZI_MAPA, hash } from './mapy.js';
import { nakresliText, STYL_PERGAMEN, STYL_NADPISU, STYL_KREV, PISMO_NADPISU } from './pismo.js';
// t ze slovníku je tu preklad (t je v kreslení skoro všude průběh animace 0..1)
import { t as preklad } from './texty.js';
import { barvoslepy, barvyRarity, ZNAKY_RARIT, PALETY_RARIT } from './barvy.js';
import { vzorNebezpeci, znakRarity } from './vzory.js';

// Kde je kamera (levý horní roh obrazovky ve světě) v tomhle snímku: vzory režimu pro barvoslepé drží ke světu.
const kamera = { x: 0, y: 0 };
// Režim pro barvoslepé: šikmé pruhy (varování bossů) nebo puntíky (jed) jako výplň, posunuté s kamerou.
function vzor(ctx, druh) {
  return vzorNebezpeci(ctx, druh, kamera.x, kamera.y);
}

const MERITKO = 3;
// Elita se kreslí po 4 px na pixel spritu (o třetinu větší, ale pořád ostrá) s rudým obrysem.
const MERITKO_ELITY = 4;
const OBRYS_ELITY = '#e5484d';
const SILA_TRESU = 5;
// Barvy úlomků podle toho, z čeho je nepřítel (stejné odstíny jako jeho sprite).
const BARVY_CASTIC = {
  netopyr: ['#6b4c8a', '#ff5a5a', '#3b2a4a'],
  slizak: ['#5fae4e', '#9be08a', '#5fae4e'],
  kostlivec: ['#e8e2d0', '#b9c2cc', '#e8e2d0'],
  strazce: ['#6e6577', '#8f86a0', '#ffb347'],
  matka: ['#3b2a4a', '#6b4c8a', '#ff5a5a'],
  obr: ['#8d9098', '#53565e', '#3f8a3c'],
  bludicka: ['#7f9cf0', '#dfe8ff', '#fff3b0'],
  pavoucek: ['#3b2a4a', '#6b4c8a', '#ff5a5a'],
  kamen: ['#8d9098', '#53565e', '#c9ccd2'],
  kokon: ['#e4f6f3', '#c9ccd2', '#9fc8c6'],
  // obláček, ze kterého vyleze nepřítel kruhu obklíčení
  stin: ['#1b1622', '#3b2a4a', '#5c5b70'],
  kost: ['#e8e2d0', '#b9c2cc', '#ffffff'],
  sliz: ['#5fae4e', '#9be08a', '#5fae4e'],
  pavouk: ['#4a3530', '#a07e5c', '#ffb347'],
  duch: ['#e4f6f3', '#9fc8c6', '#e4f6f3'],
  houbak: ['#9b59c9', '#d6a9f2', '#f1d2a8'],
  vlk: ['#8d9098', '#53565e', '#c9ccd2'],
  ledovy_duch: ['#dfe8ff', '#7f9cf0', '#b8fff5'],
  ohnivy_brouk: ['#7a2b2e', '#ffb347', '#b8443c'],
  zaba: ['#3f8a3c', '#9be08a', '#f2c94c'],
  vcela: ['#f2c94c', '#151318', '#e4f6f3'],
  kralik: ['#e8e2d0', '#b9c2cc', '#ffc2c2'],
  had: ['#3f8a3c', '#26552a', '#f2c94c'],
  strasak: ['#b07a1e', '#a07e5c', '#5f7fb8'],
  permonik: ['#3f8a3c', '#e8e2d0', '#ffb347'],
  krystalnik: ['#8d9098', '#4fd6c9', '#b8fff5'],
  macarat: ['#ffc2c2', '#ff5a5a', '#e8e2d0'],
  stonozka: ['#b8443c', '#7a2b2e', '#a07e5c'],
  stepek: ['#4fd6c9', '#b8fff5', '#9fc8c6'],
  vlocka: ['#dfe8ff', '#b8fff5', '#7f9cf0'],
  ledni_medved: ['#dfe8ff', '#b9c2cc', '#ffffff'],
  snehulak: ['#dfe8ff', '#b8443c', '#ffb347'],
  mroz: ['#a07e5c', '#f1d2a8', '#e8e2d0'],
  snezka: ['#dfe8ff', '#ffffff', '#7f9cf0'],
  ohniva_mura: ['#ffb347', '#7a2b2e', '#fff3b0'],
  salamandr: ['#b8443c', '#ffb347', '#f2c94c'],
  golem: ['#5c5b70', '#2e2d3a', '#ffb347'],
  certik: ['#b8443c', '#e8e2d0', '#7a2b2e'],
  komar: ['#53565e', '#ff5a5a', '#e4f6f3'],
  kajman: ['#3f8a3c', '#26552a', '#9be08a'],
  vodnik: ['#3f8a3c', '#9be08a', '#7f9cf0'],
  hrnicek: ['#dfe8ff', '#5f7fb8', '#e4f6f3'],
  blato: ['#4a3a26', '#7a6a48', '#5fae4e'],
  havran: ['#2e2d3a', '#5c5b70', '#ff5a5a'],
  ghul: ['#9fc8c6', '#53565e', '#e4f6f3'],
  hrobnik: ['#4a3530', '#a07e5c', '#ffb347'],
  hlina: ['#8a5a35', '#4a3530', '#a07e5c'],
  lavovy_obr: ['#2e2d3a', '#ffb347', '#151318'],
  bahenni_bludicka: ['#5fae4e', '#9be08a', '#fff3b0'],
  kosteny_kral: ['#e8e2d0', '#b9c2cc', '#4fd6c9'],
  osa: ['#f2c94c', '#151318', '#e74c3c'],
  srnec: ['#a07e5c', '#f1d2a8', '#6b3e24'],
  housenka: ['#9be08a', '#3f8a3c', '#f2c94c'],
  zahradnik: ['#b07a1e', '#e8e2d0', '#c0392b'],
  kuna: ['#6b3e24', '#f1d2a8', '#151318'],
  jablko: ['#c0392b', '#9be08a', '#f2c94c'],
  pan_sadu: ['#6b3e24', '#c0392b', '#f2c94c'],
  vrabec: ['#6b3e24', '#f1d2a8', '#f2c94c'],
  krysa: ['#8d9098', '#ffc2c2', '#151318'],
  snop: ['#f2c94c', '#e0a030', '#6b3e24'],
  mlynar: ['#e8e2d0', '#6b3e24', '#f2c94c'],
  lasicka: ['#e07a3d', '#f1d2a8', '#151318'],
  pytel: ['#c4b49a', '#6b3e24', '#e8e2d0'],
  slama: ['#f2c94c', '#e0a030', '#c4b49a'],
  mlynsky_obr: ['#8d9098', '#f2c94c', '#6b3e24'],
  magma: ['#b8443c', '#ffb347', '#7a2b2e'],
  lebka: ['#e8e2d0', '#b9c2cc', '#151318'],
  lava: ['#ff7a2f', '#ffd27a', '#a8321a'],
  bahno: ['#4a3a26', '#5fae4e', '#7a6a48'],
  bedna: ['#a07e5c', '#8a5a35', '#4a3530'],
  sud: ['#a07e5c', '#6e6577', '#8a5a35'],
  trny: ['#4a3530', '#3f8a3c', '#a07e5c'],
  zrcadlo: ['#dfe8ff', '#b9c2cc', '#7f9cf0'],
  led: ['#dfe8ff', '#b8fff5', '#7f9cf0'],
  svetluska: ['#fff3b0', '#d8f7b0', '#9be08a'],
  cep: ['#c9ccd2', '#8d9098', '#fff3b0'],
  seminko: ['#3f8a3c', '#a07e5c', '#9be08a'],
  korene: ['#8a5a35', '#4a3530', '#a07e5c'],
  oblazek: ['#c9ccd2', '#8d9098', '#53565e'],
  zamcena: ['#a07e5c', '#8a5a35', '#f2c94c'],
  stit: ['#b8fff5', '#dfe8ff', '#7fd8ff'],
  krunyr: ['#3f8a3c', '#9be08a', '#a07e5c'],
};
const BARVA_SITE = 'rgba(236,236,244,0.8)';
// Duch je i viditelný průsvitný, schovaný je jen tušený obrys. Mezi tím přechází plynule.
const PRUHLEDNOST_DUCHA = 0.62;
const PRUHLEDNOST_SCHOVANEHO = 0.1;
const PRECHOD_DUCHA = 0.25;
// Každý boss má svou barvu: pruh životů nahoře, malý pruh nad ním a šipka, když je mimo obrazovku.
// pruh = výplň, tmava = rámeček a podklad portrétu, text = jméno.
const BARVY_BOSSU = {
  strazce: { pruh: '#ffb347', tmava: '#7a4214', text: '#ffd27a' },
  matka: { pruh: '#e5484d', tmava: '#6e1f2b', text: '#ffc2c2' },
  obr: { pruh: '#7fc46a', tmava: '#2f5a2a', text: '#c8f0b0' },
  bludicka: { pruh: '#8fb4ff', tmava: '#2c3f7a', text: '#dfe8ff' },
  lavovy_obr: { pruh: '#ff7a2f', tmava: '#5a1c12', text: '#ffd27a' },
  bahenni_bludicka: { pruh: '#9be08a', tmava: '#26552a', text: '#d8f7b0' },
  kosteny_kral: { pruh: '#e8e2d0', tmava: '#4a4650', text: '#f3efe6' },
  pan_sadu: { pruh: '#e07a3d', tmava: '#6b3e24', text: '#ffd27a' },
  mlynsky_obr: { pruh: '#e0a030', tmava: '#53565e', text: '#fff3b0' },
};
// Barvy rarit výbavy (paleta bez režimu z barvy.js, stejná jako u karet v style.css): c = rámeček a paprsky,
// svetla = záře a nápis. Běžná má paprsky o kus světlejší než rámeček karty, jinak by na tmě zmizely.
const BARVY_RARIT = { ...PALETY_RARIT.vyp, bezna: { ...PALETY_RARIT.vyp.bezna, c: '#8f86a0' } };
// Otevírání truhly: prvních TRESENI_TRUHLY z celé doby se zavřená truhla třese, pak se otevře a kus vystoupá
// o VYSTUP_KUSU px nad ni. Truhla na zemi poskočí jednou za SKOK_TRUHLY s.
const TRESENI_TRUHLY = 0.3;
const VYSTUP_KUSU = 54;
const SKOK_TRUHLY = 1.6;
// Pruhy bossů nahoře: začínají pod horní lištou (úroveň, čas a pod ním hrozba), každý další o VYSKA_BARU níž.
// HORNI_BARY platí, dokud main.js nezměří skutečný spodek lišty (kresli(..., { horni })).
const HORNI_BARY = 76;
const VYSKA_BARU = 48;
const PORTRET = 40;
// Úbytek životů v pruhu se chvíli drží světlý a pak doběhne (ať je vidět, kolik rána vzala).
const DRZENI_UBYTKU = 0.35;
const RYCHLOST_UBYTKU = 0.8;
// Výška oblouku, kterým letí kameny z Hodu, a jak vysoko nad hlavou je boss při varování zvedá.
const VYSKA_HODU = 90;
const NAD_HLAVOU = 14;
// Barvy výbuchu po dopadu podle toho, co dopadlo: záře, prstenec, jádro.
const BARVY_DOPADU = {
  kamen: ['rgba(255,140,50,0.35)', '#ffb347', '#fff3b0'],
  kokon: ['rgba(228,246,243,0.35)', '#c9ccd2', '#ffffff'],
  kost: ['rgba(232,226,208,0.3)', '#e8e2d0', '#ffffff'],
  sliz: ['rgba(95,174,78,0.35)', '#5fae4e', '#9be08a'],
  stepek: ['rgba(79,214,201,0.35)', '#4fd6c9', '#b8fff5'],
  snezka: ['rgba(223,232,255,0.4)', '#dfe8ff', '#ffffff'],
  magma: ['rgba(255,110,40,0.4)', '#ff7a2f', '#ffd27a'],
  blato: ['rgba(110,90,50,0.4)', '#5c4a32', '#7d9a4a'],
  hrnicek: ['rgba(127,156,240,0.4)', '#7f9cf0', '#dfe8ff'],
  hlina: ['rgba(138,90,53,0.4)', '#8a5a35', '#a07e5c'],
};
// Skok slizáka (a permoníka): jak vysoko nad zemí je uprostřed letu (px).
const VYSKA_SKOKU = 30;
// Zuřící boss (pod polovinou životů) krátce rudne, pulz trvá PULZ_ZURIVOSTI s.
const PULZ_ZURIVOSTI = 0.6;
const BARVA_ZURIVOSTI = 'rgba(229,72,77,0.45)';
// Zrcadla za sebou nechávají dva bledé odlesky (o kolik radiánů zpátky a jak průhledné) a jednou za
// TREPOT_ZRCADEL sekund se každé krátce zablýskne.
const STOPY_ZRCADEL = [[0.3, 0.16], [0.15, 0.32]];
const TREPOT_ZRCADEL = 1.1;
// Nepřítel v mrazu se přebarví do modra, čím víc zpomalený, tím silněji (tři stupně, ať se přebarvené
// sprity dají uložit). Krystal padá z VYSKA_PADU px, posledních PRASKANI z mrznutí zóna praská.
const BARVY_MRAZU = ['rgba(160,210,255,0.3)', 'rgba(160,210,255,0.45)', 'rgba(180,225,255,0.6)'];
const VYSKA_PADU = 90;
const PRASKANI = 0.3;
// Světluška za sebou nechává tři tečky (o kolik sekund letu zpátky) a zadeček jí bliká jednou za BLIK_SVETLUSKY s.
const STOPA_SVETLUSKY = [0.018, 0.036, 0.054];
const BLIK_SVETLUSKY = 0.9;
// Zvuková vlna zvonu: tři prstence (od čela vlny dozadu) a kolik čárek má každý. Zvonek visí VYSKA_ZVONU px
// nad středem hrdiny.
const BARVY_ZVUKU = ['#e8fff9', '#4fd6c9', 'rgba(42,143,134,0.6)'];
const CARKY_ZVUKU = 10;
const VYSKA_ZVONU = 44;
// Koule cepu rychlejší než STOPA_CEPU px/s za sebou nechává dva obrysy (o kolik sekund letu zpátky, průhlednost).
const STOPA_CEPU = 170;
const STOPY_CEPU = [[0.05, 0.2], [0.025, 0.4]];
// Keř s poloměrem do KER_PRI_MERITKU px se kreslí po MERITKO px na pixel, větší keř po větších pixelech.
const KER_PRI_MERITKU = 22;
// Kořeny: prasklá zem za kořenem v zemi zmizí za MIZENI_PRASKLINY s po vyražení, posledních ZALEZANI_KORENU
// s držení kořeny zalézají. Držený nepřítel sebou škube (o pixel sem a tam) každých CUKANI s.
const MIZENI_PRASKLINY = 0.5;
const ZALEZANI_KORENU = 0.25;
const CUKANI = 0.06;
// Ohnivá stopa: plameny se střídají ve dvou snímcích (každý plamen jindy), snímek trvá SNIMEK_PLAMENE s.
const SNIMEK_PLAMENE = 0.12;
// Kámen praku letí VYSKA_KAMENE px nad svým stínem a za sebou nechává dvě tečky prachu (o kolik sekund zpátky).
const VYSKA_KAMENE = 8;
const STOPA_KAMENE = [0.03, 0.06];

// Světlo lucerny se kreslí po čtverečcích stejně velkých jako pixel spritu, ať nevypadá rozmazaně.
// Jednou za PULZ_LUCERNY sekund vyjde od hrdiny vlna světla, na okraji dosahu prstenec zjasní.
const PULZ_LUCERNY = 1.2;
const JISKER_LUCERNY = 14;
const BARVA_ZARU = '#ff9a3c';
// Jak moc nepřítel po zásahu žárem nejvýš zjasní (víc už by z něj byla jen oranžová skvrna).
const SILA_ZARU = 0.6;

// Tma v jeskyni: přes celou obrazovku tma (tma.sila) a kolem (x, y) kruh světla o poloměru polomer, k okraji
// po schůdcích tmavne. Kreslí se na malé plátno (pixel = pixel spritu) a zvětší bez vyhlazení, ať má okraj
// světla schody jako všechno ostatní. Poloměr se lehce chvěje jako plamen.
let platnoTmy = null;
const SCHODY_TMY = [[0.55, 1], [0.7, 0.78], [0.84, 0.5], [1, 0.22]];
function tmaKolem(ctx, tma, x, y, polomer, cas) {
  const m = MERITKO;
  const w = Math.ceil(ctx.canvas.width / m) + 1;
  const h = Math.ceil(ctx.canvas.height / m) + 1;
  if (!platnoTmy) platnoTmy = document.createElement('canvas');
  if (platnoTmy.width !== w || platnoTmy.height !== h) {
    platnoTmy.width = w;
    platnoTmy.height = h;
  }
  const g = platnoTmy.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, h);
  g.fillStyle = `rgba(${tma.barva},${tma.sila})`;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out';
  const r = (polomer / m) * (1 + 0.025 * Math.sin(cas * 7) + 0.015 * Math.sin(cas * 17.3));
  const sx = x / m;
  const sy = y / m;
  const prechod = g.createRadialGradient(sx, sy, 0, sx, sy, r);
  let od = 0;
  for (const [kde, svetlo] of SCHODY_TMY) {
    prechod.addColorStop(od, `rgba(0,0,0,${svetlo})`);
    prechod.addColorStop(kde, `rgba(0,0,0,${svetlo})`);
    od = kde;
  }
  prechod.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = prechod;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(platnoTmy, 0, 0, w * m, h * m);
  ctx.restore();
}

// Poloměr světla v jeskyni: základ, s lucernou o kus a celý její dosah víc.
export function polomerSvetla(hra, s = staty(hra)) {
  const { tma } = MAPY[hra.mapa];
  if (!tma) return Infinity;
  return tma.svetlo + (hra.zbrane.lucerna ? tma.lucerna + s.lucerna.dosah : 0);
}

// Co ve tmě svítí: krystaly ve skále (ozdoby se září) a krystaly zkušeností na zemi, obojí jen napůl
// a s pomalým mihotáním, ať se dá ve tmě aspoň trochu vyznat.
function svetlaVeTme(ctx, zare, hra, naObrazovce) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [i, z] of zare.entries()) {
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(hra.cas * 2 + i * 1.7);
    ctx.drawImage(z.obr, z.x, z.y, z.velikost, z.velikost);
  }
  ctx.globalAlpha = 0.45;
  for (const kr of hra.krystaly) {
    const p = naObrazovce(kr);
    ctx.drawImage(sprity.krystal, Math.round(p.x - 10), Math.round(p.y - 10), 20, 20);
  }
  // Světlušky ve tmě svítí jako malé lucerny.
  ctx.globalAlpha = 1;
  for (const l of hra.svetlusky ?? []) {
    const p = naObrazovce(l);
    zareSvetlusky(ctx, Math.round(p.x), Math.round(p.y) + 3, false);
  }
  // Ohnivá stopa ve tmě svítí do oranžova (dohasínající plamen slabě).
  for (const pl of hra.plameny ?? []) {
    const p = naObrazovce(pl);
    const zhasina = Math.min(1, pl.zivot / DOHASINANI);
    ctx.fillStyle = `rgba(255,140,60,${(0.08 * zhasina).toFixed(3)})`;
    kruhNaZemi(ctx, p.x, p.y, pl.polomer * 1.6, true);
    ctx.fillStyle = `rgba(255,200,120,${(0.12 * zhasina).toFixed(3)})`;
    kruhNaZemi(ctx, p.x, p.y, pl.polomer * 0.6, true);
  }
  ctx.restore();
}

// Se světly: krystaly ve skále mají vlastní světlo (svetla.js), tady se přes tmu jen přičtou jejich svítící pixely,
// ať je krystal sám jasný a ostrý.
function zareVeTme(ctx, zare, hra) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < zare.length; i++) {
    const z = zare[i];
    ctx.globalAlpha = 0.3 + 0.1 * Math.sin(hra.cas * 2 + i * 1.7);
    ctx.drawImage(z.obr, z.x, z.y, z.velikost, z.velikost);
  }
  ctx.restore();
}

// Sněžení na jezeře: vločky padají a vítr je pomalu nosí stranou. Posouvají se jen napůl se světem (jsou ve
// vzduchu nad ním), takže při běhu je vidět, že hrdina jde. Jen podle času, nic se neukládá.
function snezeni(ctx, pocet, kx, ky, sirka, vyska, cas) {
  const mod = (a, b) => ((a % b) + b) % b;
  ctx.save();
  ctx.fillStyle = '#f4f8ff';
  for (let i = 0; i < pocet; i++) {
    const h = hash(i, 9173);
    const pad = 26 + (h % 34);
    const vitr = Math.sin(cas * 0.6 + i) * 14 + cas * 12;
    const x = mod(((h >>> 8) % 997) / 997 * (sirka + 40) - kx * 0.5 + vitr, sirka + 40) - 20;
    const y = mod(((h >>> 18) % 991) / 991 * (vyska + 40) - ky * 0.5 + cas * pad, vyska + 40) - 20;
    const velikost = h & 1 ? MERITKO : 2;
    ctx.globalAlpha = 0.45 + ((h >>> 4) % 5) * 0.1;
    ctx.fillRect(Math.round(x), Math.round(y), velikost, velikost);
  }
  ctx.restore();
}

// Žhavé jiskry na sopce: stoupají vzhůru, vítr je nosí stranou a mihotají se. Ve vzduchu jsou blíž než podlaha,
// takže se posouvají o kus pomaleji než svět. Jako sněžení jen podle času, nic se neukládá.
function jiskry(ctx, pocet, kx, ky, sirka, vyska, cas) {
  const mod = (a, b) => ((a % b) + b) % b;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pocet; i++) {
    const h = hash(i, 4219);
    const stoupani = 24 + (h % 40);
    const vitr = Math.sin(cas * 0.8 + i * 1.3) * 20 + cas * 7;
    const x = mod(((h >>> 8) % 997) / 997 * (sirka + 40) - kx * 0.6 + vitr, sirka + 40) - 20;
    const y = mod(((h >>> 18) % 991) / 991 * (vyska + 40) - ky * 0.6 - cas * stoupani, vyska + 40) - 20;
    const velikost = h & 1 ? MERITKO : 2;
    ctx.globalAlpha = 0.3 + 0.45 * Math.abs(Math.sin(cas * (3 + (h % 4)) + i));
    ctx.fillStyle = h & 2 ? '#ffb347' : '#ff7a2f';
    ctx.fillRect(Math.round(x), Math.round(y), velikost, velikost);
  }
  ctx.restore();
}

// Mlha na hřbitově: velké ploché chuchvalce, které se pomalu sunou stranou (a napůl se světem). Skládají se
// z pruhů po pixelech spritu, ať mají zubaté okraje jako všechno ostatní. Uprostřed jsou hustší.
function mlha(ctx, m, kx, ky, sirka, vyska, cas) {
  const mod = (a, b) => ((a % b) + b) % b;
  const krok = MERITKO * 2;
  ctx.save();
  for (let i = 0; i < m.pocet; i++) {
    const h = hash(i, 7717);
    const sirkaM = 240 + (h % 180);
    const vyskaM = 54 + ((h >>> 9) % 48);
    const x = mod((h >>> 3) % 2003 - kx * 0.75 + cas * (6 + (h % 7)), sirka + sirkaM * 2) - sirkaM;
    const y = mod((h >>> 13) % 1511 - ky * 0.75, vyska + vyskaM * 2) - vyskaM;
    for (const [podil, sila] of [[1, m.sila], [0.6, m.sila * 0.8]]) {
      ctx.fillStyle = `rgba(${m.barva},${sila.toFixed(3)})`;
      const pv = (vyskaM / 2) * podil;
      for (let r = -pv; r < pv; r += krok) {
        const t = (r + krok / 2) / pv;
        const w = Math.round(((sirkaM / 2) * podil * Math.sqrt(Math.max(0, 1 - t * t))) / MERITKO) * MERITKO;
        if (w > 0) ctx.fillRect(Math.round((x - w) / MERITKO) * MERITKO, Math.round((y + r) / MERITKO) * MERITKO, 2 * w, krok);
      }
    }
  }
  ctx.restore();
}

// Jedová bublina v bahně: na zemi roste zelený kruh, kam dosáhne oblak, uprostřed se nafukuje bublina a kolem
// stoupají malé bublinky. Ke konci varování kruh zhoustne, pak bublina praskne (oblak kreslí oblak()).
function bublina(ctx, x, y, b, cas) {
  const t = Math.max(0, Math.min(1, 1 - b.zivot / b.varovani));
  ctx.save();
  ctx.globalAlpha = 0.18 + 0.3 * t;
  ctx.fillStyle = '#5fae4e';
  kruhNaZemi(ctx, x, y, b.polomer * (0.5 + 0.5 * t), true);
  ctx.globalAlpha = 0.5 + 0.5 * t;
  ctx.fillStyle = '#9be08a';
  kruhNaZemi(ctx, x, y, b.polomer * (0.5 + 0.5 * t));
  // pro barvoslepé: kam dosáhne oblak, jsou puntíky (jed) a okraj celého dosahu je vidět hned
  if (barvoslepy()) {
    ctx.globalAlpha = 0.45 + 0.4 * t;
    ctx.fillStyle = vzor(ctx, 'puntiky');
    kruhNaZemi(ctx, x, y, b.polomer * (0.5 + 0.5 * t), true);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#140c08';
    kruhNaZemi(ctx, x, y, b.polomer + 3);
    ctx.fillStyle = '#f3efe6';
    kruhNaZemi(ctx, x, y, b.polomer);
  }
  ctx.restore();
  // bublina uprostřed: tmavý obrys, zelená výplň a lesk vlevo nahoře
  const r = Math.round(1 + t * 3);
  ctx.fillStyle = '#0b0a0f';
  kruhNaZemi(ctx, x, y - 4, (r + 1) * MERITKO, true);
  ctx.fillStyle = '#7fc46a';
  kruhNaZemi(ctx, x, y - 4, r * MERITKO, true);
  ctx.fillStyle = '#d8f7b0';
  ctx.fillRect(Math.round(x) - Math.floor(MERITKO / 2) - Math.max(1, r - 1) * MERITKO, Math.round(y - 4) - Math.floor(MERITKO / 2) - Math.max(1, r - 1) * MERITKO, MERITKO, MERITKO);
  for (let i = 0; i < 3; i++) {
    const faze = (cas * 1.4 + i * 0.33 + b.x * 0.01) % 1;
    const bx = Math.round(x + Math.sin(i * 2.1 + b.y) * b.polomer * 0.6);
    const by = Math.round(y - faze * 22);
    ctx.globalAlpha = 1 - faze;
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(bx - 1, by - 1, 5, 5);
    ctx.fillStyle = '#b8e8a0';
    ctx.fillRect(bx, by, 3, 3);
  }
  ctx.globalAlpha = 1;
}

// Přebarvená kopie spritu (jen jeho pixely, ne celý čtverec). Každá kombinace se kreslí jednou.
const prebarvene = new WeakMap();
function prebarvi(obr, barva) {
  if (!prebarvene.has(obr)) prebarvene.set(obr, new Map());
  const podleBarvy = prebarvene.get(obr);
  if (!podleBarvy.has(barva)) {
    const kopie = document.createElement('canvas');
    kopie.width = obr.width;
    kopie.height = obr.height;
    const g = kopie.getContext('2d');
    g.drawImage(obr, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = barva;
    g.fillRect(0, 0, obr.width, obr.height);
    podleBarvy.set(barva, kopie);
  }
  return podleBarvy.get(barva);
}

// prekryv: barva, kterou se sprite přebarví (bílá po zásahu, bledá v síti), jinak nic
function sprite(ctx, obr, x, y, otoceny = 1, prekryv = null, velikost = obr.width * MERITKO) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (otoceny < 0) ctx.scale(-1, 1);
  ctx.drawImage(prekryv ? prebarvi(obr, prekryv) : obr, -velikost / 2, -velikost / 2, velikost, velikost);
  ctx.restore();
}

// Sprite, který není čtvercový (vůz, zamčená truhla), se středem v (x, y) a se svým poměrem stran.
function celySprite(ctx, obr, x, y, meritko = MERITKO) {
  const w = obr.width * meritko;
  const h = obr.height * meritko;
  ctx.drawImage(obr, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
}

// Rudý obrys elity: přebarvený sprite posunutý o pixel na všechny čtyři strany, pod ním pulzující záře.
function obrysElity(ctx, obr, x, y, otoceny, velikost, cas) {
  const krok = velikost / obr.width;
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.2 * Math.sin(cas * 6);
  ctx.fillStyle = OBRYS_ELITY;
  kruhNaZemi(ctx, x, y + velikost * 0.35, velikost * 0.45, true);
  ctx.restore();
  for (const [dx, dy] of [[-krok, 0], [krok, 0], [0, -krok], [0, krok]]) sprite(ctx, obr, x + dx, y + dy, otoceny, OBRYS_ELITY, velikost);
}

// Pet z vajec (hra.js, petHrdiny): sprite 8×8 ve dvojnásobku (menší než hrdina, ať se s ním neplete). Letící pet
// se vznáší, běžící při chůzi hrdiny poskakuje, pod ním je stín. Nad ním na chvíli vyskočí ikona bonusu
// (pet.zablesk), Dráčkův oheň letí jako ohnivý čtvereček, mráz Tučňáka je ledový kruh kolem hrdiny, který se
// rozběhne do dosahu, a hotový krunýř Želvičky je zelený přerušovaný kruh kolem hrdiny.
const MERITKO_PETA = 2;
function kresliPeta(ctx, hra, naObrazovce, stred) {
  const p = hra.pet;
  const obr = p && sprity[`pet_${p.druh}`];
  if (!obr) return;
  const druh = PETY[p.druh];
  for (const k of p.kruhy) {
    const q = naObrazovce(k);
    const t = 1 - k.zivot / PET.kruh;
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - t);
    ctx.strokeStyle = '#b8fff5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(Math.round(q.x), Math.round(q.y), 18 + t * ((druh.akce?.dosah ?? 100) - 18), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (p.stitHotov) {
    ctx.save();
    ctx.globalAlpha = 0.75 + 0.2 * Math.sin(hra.cas * 4);
    ctx.strokeStyle = '#9be08a';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -hra.cas * 8;
    ctx.beginPath();
    ctx.arc(Math.round(stred.x) + 0.5, Math.round(stred.y) + 0.5, 21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const q = naObrazovce(p);
  const bezi = Math.hypot(hra.hrdina.vx, hra.hrdina.vy) > 1 || Boolean(p.let);
  const posun = druh.leta ? Math.round(Math.sin(hra.cas * 5 + 1) * 2) : bezi ? -Math.abs(Math.round(Math.sin(hra.cas * 14) * 2)) : 0;
  ctx.fillStyle = 'rgba(11,10,15,0.28)';
  ctx.fillRect(Math.round(q.x - 6), Math.round(q.y + (druh.leta ? 16 : 9)), 12, 3);
  sprite(ctx, obr, q.x, q.y + posun, p.otoceny, null, obr.width * MERITKO_PETA);
  if (p.zablesk > 0) {
    const ikona = sprity[druh.ikona];
    const t = 1 - p.zablesk / PET.zablesk;
    ctx.globalAlpha = Math.min(1, p.zablesk / 0.3);
    ctx.drawImage(ikona, Math.round(q.x - ikona.width), Math.round(q.y - 30 - t * 8 + posun), ikona.width * 2, ikona.height * 2);
    ctx.globalAlpha = 1;
  }
  for (const o of p.ohne) {
    const r = naObrazovce(o);
    const x = Math.round(r.x);
    const y = Math.round(r.y);
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = '#ff7a2f';
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}

// Pavoučí síť přes hrdinu (nebo zapředeného nepřítele): paprsky a dva kruhy, s koncem sítě bledne.
// polomer = jak daleko sahají paprsky, kruhy jsou úměrně menší.
function sit(ctx, x, y, zbyva, polomer = 17) {
  ctx.save();
  ctx.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);
  ctx.globalAlpha *= Math.min(1, zbyva * 2);
  ctx.strokeStyle = BARVA_SITE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const uhel = (i / 8) * Math.PI * 2 + 0.3;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.round(Math.cos(uhel) * polomer), Math.round(Math.sin(uhel) * polomer));
  }
  for (const r of [Math.round(polomer * 0.41), Math.round(polomer * 0.76)]) {
    for (let i = 0; i <= 8; i++) {
      const uhel = (i / 8) * Math.PI * 2 + 0.3;
      const bx = Math.round(Math.cos(uhel) * r);
      const by = Math.round(Math.sin(uhel) * r);
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Pixelový kruh o poloměru r čtverečků (Bresenhamův kruh). Pro každý řádek vrací, jak daleko od středu
// kruh sahá, a seznam políček obvodu. Počítá se jednou pro každý poloměr.
const kruhy = new Map();
function pixelovyKruh(r) {
  if (!kruhy.has(r)) {
    const obvod = new Map();
    let x = r;
    let y = 0;
    let chyba = 1 - r;
    while (x >= y) {
      for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) obvod.set(`${a},${b}`, [a, b]);
      y += 1;
      if (chyba < 0) chyba += 2 * y + 1;
      else {
        x -= 1;
        chyba += 2 * (y - x) + 1;
      }
    }
    const radky = new Map();
    for (const [a, b] of obvod.values()) radky.set(b, Math.max(radky.get(b) ?? 0, Math.abs(a)));
    kruhy.set(r, { obvod: [...obvod.values()], radky: [...radky] });
  }
  return kruhy.get(r);
}

// Kolem (x, y) na zem: teplý pixelový kruh přes celý dosah, vlna od středu, jasný prstenec na okraji dosahu
// (pulzuje) a jiskry, které na okraji vyskočí a zhasnou. Všechno je jen podle času, nic se neukládá.
function svetloLucerny(ctx, x, y, dosah, cas) {
  const m = MERITKO;
  const cx = Math.round(x) - Math.floor(m / 2);
  const cy = Math.round(y) - Math.floor(m / 2);
  const r = Math.max(2, Math.round(dosah / m));
  const t = (cas % PULZ_LUCERNY) / PULZ_LUCERNY;
  const policka = (kruh) => {
    for (const [a, b] of kruh.obvod) ctx.fillRect(cx + a * m, cy + b * m, m, m);
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,170,70,0.07)';
  for (const [b, sirka] of pixelovyKruh(r).radky) ctx.fillRect(cx - sirka * m, cy + b * m, (2 * sirka + 1) * m, m);
  ctx.fillStyle = `rgba(255,190,90,${(0.2 * (1 - t)).toFixed(3)})`;
  policka(pixelovyKruh(Math.max(1, Math.round(r * (0.2 + 0.8 * t)))));
  const jas = 0.5 + 0.35 * (1 - t) ** 2;
  ctx.fillStyle = `rgba(255,150,60,${(jas * 0.45).toFixed(3)})`;
  policka(pixelovyKruh(r - 1));
  ctx.fillStyle = `rgba(255,214,120,${jas.toFixed(3)})`;
  policka(pixelovyKruh(r));
  for (let i = 0; i < JISKER_LUCERNY; i++) {
    const beh = cas * 0.8 + i * 0.618;
    const faze = beh % 1;
    const uhel = i * 2.4 + Math.floor(beh) * 1.7 + faze * 0.25;
    const vzdal = r * m + (faze - 0.3) * 10;
    const velikost = i % 3 === 0 ? m : 2;
    ctx.globalAlpha = Math.sin(faze * Math.PI);
    ctx.fillStyle = i % 2 ? '#fff3b0' : '#ffb347';
    ctx.fillRect(Math.round(x + Math.cos(uhel) * vzdal - velikost / 2), Math.round(y + Math.sin(uhel) * vzdal - velikost / 2), velikost, velikost);
  }
  ctx.restore();
}

// Kde se vedle hrdiny vznáší lucerna: za zády (na opačné straně, než kouká), ve výšce ramen, a pomalu
// se pohupuje. Vrací střed skla.
function poziceLucerny(hra, stred) {
  return {
    x: Math.round(stred.x - hra.hrdina.otoceny * 21),
    y: Math.round(stred.y - 3 + Math.sin(hra.cas * 2.5) * 2),
  };
}

// Kdo dostal žár, krátce se rozzáří: přes sprite se přičte teplé světlo a pomalu zhasne.
function rozzar(ctx, obr, x, y, otoceny, velikost, sila) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= sila * SILA_ZARU;
  sprite(ctx, obr, x, y, otoceny, BARVA_ZARU, velikost);
  ctx.restore();
}

// Průhlednost ducha podle toho, kolik mu zbývá do změny: před zmizením bledne, před vynořením sílí.
function pruhlednostDucha(n) {
  const t = Math.min(1, n.duchCas / PRECHOD_DUCHA);
  const [ted, potom] = n.skryty ? [PRUHLEDNOST_SCHOVANEHO, PRUHLEDNOST_DUCHA] : [PRUHLEDNOST_DUCHA, PRUHLEDNOST_SCHOVANEHO];
  return potom + (ted - potom) * t;
}

// Jedový oblak po houbákovi: chuchvalec fialových obláčků, které se pomalu točí, a pár bublinek.
// Nejdřív se nafukuje (bledší), na konci se rozplyne. Oblak z bubliny v bahně je zelený.
const BARVY_OBLAKU = {
  houbak: { stin: 'rgba(48,18,70,0.5)', mrak: 'rgba(170,96,220,0.42)', bublinka: '#e2b8ff' },
  bahno: { stin: 'rgba(20,46,18,0.5)', mrak: 'rgba(120,190,80,0.42)', bublinka: '#d8f7b0' },
};
function oblak(ctx, x, y, o, cas) {
  const barvy = BARVY_OBLAKU[o.druh] ?? BARVY_OBLAKU.houbak;
  const stari = TRVANI_OBLAKU - o.zivot;
  const nafouknuti = Math.min(1, stari / NAFUKOVANI_OBLAKU);
  const r = o.polomer * (0.45 + 0.55 * nafouknuti);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.globalAlpha = Math.min(1, o.zivot * 2) * (nafouknuti < 1 ? 0.55 : 1);
  const chuchvalce = [[0, 0, 0.62]];
  for (let i = 0; i < 6; i++) {
    const uhel = (i / 6) * Math.PI * 2 + cas * 0.6 + o.x * 0.01;
    chuchvalce.push([Math.cos(uhel) * r * 0.5, Math.sin(uhel) * r * 0.42, 0.42 + 0.06 * Math.sin(cas * 3 + i)]);
  }
  for (const [barva, navic] of [[barvy.stin, 2], [barvy.mrak, 0]]) {
    ctx.fillStyle = barva;
    for (const [cx, cy, velikost] of chuchvalce) {
      ctx.beginPath();
      ctx.arc(Math.round(cx), Math.round(cy), r * velikost + navic, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // pro barvoslepé: jed jsou puntíky přes celý oblak
  if (barvoslepy()) {
    ctx.globalAlpha = Math.min(1, o.zivot * 2) * (nafouknuti < 1 ? 0.45 : 0.8);
    ctx.fillStyle = vzorNebezpeci(ctx, 'puntiky');
    for (const [cx, cy, velikost] of chuchvalce) {
      ctx.beginPath();
      ctx.arc(Math.round(cx), Math.round(cy), r * velikost, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // bublinky stoupají a mizí, každá s vlastním zpožděním
  for (let i = 0; i < 4; i++) {
    const faze = (cas * 0.9 + i * 0.27 + o.y * 0.003) % 1;
    const bx = Math.round(Math.sin(i * 2.4 + o.x) * r * 0.55);
    const by = Math.round(r * 0.35 - faze * r * 1.1);
    ctx.globalAlpha = Math.min(1, o.zivot * 2) * (1 - faze);
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(bx - 1, by - 1, 5, 5);
    ctx.fillStyle = barvy.bublinka;
    ctx.fillRect(bx, by, 3, 3);
  }
  ctx.restore();
}

// Pixelový kruh o poloměru r (v pixelech obrazovky) kolem (x, y): jen obvod, nebo plný (radky).
function kruhNaZemi(ctx, x, y, r, plny = false) {
  const m = MERITKO;
  const cx = Math.round(x) - Math.floor(m / 2);
  const cy = Math.round(y) - Math.floor(m / 2);
  const kruh = pixelovyKruh(Math.max(1, Math.round(r / m)));
  if (plny) for (const [b, sirka] of kruh.radky) ctx.fillRect(cx - sirka * m, cy + b * m, (2 * sirka + 1) * m, m);
  else for (const [a, b] of kruh.obvod) ctx.fillRect(cx + a * m, cy + b * m, m, m);
}

// Trs trnů na zemi: tmavá rozrytá hlína v dosahu a v ní ostny. Ostny nejdřív vyrůstají ze země (špičky
// první), na konci zase zalezou. Kde který osten stojí, je dané místem trsu, ať neposkakují.
function trsTrnu(ctx, p, x, y) {
  const stari = p.trvani - p.zivot;
  const rust = Math.min(1, stari / RUST_TRNU);
  const venku = Math.max(0, Math.min(rust, p.zivot / VADNUTI_TRNU));
  ctx.save();
  ctx.globalAlpha = Math.min(1, p.zivot / VADNUTI_TRNU);
  const r = p.polomer * (0.55 + 0.45 * rust);
  ctx.fillStyle = 'rgba(46,30,22,0.42)';
  kruhNaZemi(ctx, x, y, r, true);
  ctx.fillStyle = 'rgba(38,85,42,0.75)';
  kruhNaZemi(ctx, x, y, r);
  ctx.restore();
  const obr = sprity.trs;
  const radku = Math.ceil(obr.height * venku);
  if (radku <= 0) return;
  const zaklad = hash(Math.round(p.x), Math.round(p.y));
  const pocet = p.polomer > 30 ? 7 : 5;
  const ostny = [];
  for (let i = 0; i < pocet; i++) {
    const uhel = i * 2.4 + (zaklad % 628) / 100;
    const vzdal = i === 0 ? 0 : p.polomer * (i % 2 ? 0.66 : 0.4);
    ostny.push({ x: x + Math.cos(uhel) * vzdal, y: y + Math.sin(uhel) * vzdal * 0.8, otoceny: (zaklad >>> i) & 1 });
  }
  // zadní ostny dřív, ať je přední překryjí
  ostny.sort((a, b) => a.y - b.y);
  const w = obr.width * MERITKO;
  const v = radku * MERITKO;
  for (const o of ostny) {
    ctx.save();
    ctx.translate(Math.round(o.x), Math.round(o.y + (obr.height * MERITKO) / 2));
    if (o.otoceny) ctx.scale(-1, 1);
    ctx.drawImage(obr, 0, 0, obr.width, radku, -w / 2, -v, w, v);
    ctx.restore();
  }
}

// Nepříteli v trní se kolem nohou omotají šlahouny (bossovi dva), po vylezení vyblednou.
function sponaTrnu(ctx, n, x, y, velikost) {
  const obr = sprity.spona;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  ctx.save();
  ctx.globalAlpha = Math.min(1, n.trny / DOZNIVANI_TRNU);
  const dole = Math.round(y + velikost / 2 - v + 2);
  for (const posun of n.boss ? [-w / 2 + 2, w / 2 - 2] : [0]) ctx.drawImage(obr, Math.round(x + posun - w / 2), dole, w, v);
  ctx.restore();
}

// Zrcadlový štít: bledý kruh dráhy, za každým zrcadlem dva odlesky a samo zrcadlo natočené po dráze.
// Občas se zablýskne. Větší zrcadla (5. úroveň) se kreslí o pixel spritu větší.
function zrcadlaHrdiny(ctx, hra, s, stred) {
  const z = s.zrcadlo;
  const obr = sprity.strep;
  // Na 5. úrovni (velikost 14) o pixel větší, nad ní roste s velikostí (celé násobky, ať zůstane ostrý).
  const m = z.velikost > 10 ? Math.max(MERITKO + 1, Math.round(((MERITKO + 1) * z.velikost) / 14)) : MERITKO;
  ctx.save();
  ctx.fillStyle = 'rgba(223,232,255,0.12)';
  kruhNaZemi(ctx, stred.x, stred.y, z.polomer);
  ctx.restore();
  const kresli1 = (uhel, prekryv, pruhlednost) => {
    ctx.save();
    ctx.globalAlpha = pruhlednost;
    ctx.translate(Math.round(stred.x + Math.cos(uhel) * z.polomer), Math.round(stred.y + Math.sin(uhel) * z.polomer));
    ctx.rotate(uhel);
    ctx.drawImage(prekryv ? prebarvi(obr, prekryv) : obr, (-obr.width * m) / 2, (-obr.height * m) / 2, obr.width * m, obr.height * m);
    ctx.restore();
  };
  const smer = Math.sign(z.rychlost) || 1;
  for (let i = 0; i < z.pocet; i++) {
    const { uhel } = poziceZrcadla(hra, i, s);
    for (const [zpet, pruhlednost] of STOPY_ZRCADEL) kresli1(uhel - zpet * smer, '#dfe8ff', pruhlednost);
    kresli1(uhel, null, 1);
    const faze = (hra.cas / TREPOT_ZRCADEL + i * 0.37) % 1;
    if (faze < 0.12) kresli1(uhel, '#ffffff', 0.7 * Math.sin((faze / 0.12) * Math.PI));
  }
}

// Uhlíky lucerny (Příval): žhavé čtverečky na okraji světla, za každým krátký ohon, občas vyšlehne jiskra.
function uhlikyLucerny(ctx, hra, s, naObrazovce) {
  ctx.save();
  for (let i = 0; i < s.lucerna.uhliky; i++) {
    const u = poziceUhliku(hra, i, s);
    const p = naObrazovce(u);
    const blik = Math.sin(hra.cas * 9 + i * 2.1) > 0.6;
    // ohon za uhlíkem: kde byl před chvílí (krouží proti směru hodinových ručiček)
    for (let k = 1; k <= 3; k++) {
      const zpet = u.uhel + k * 0.09;
      const o = naObrazovce({ x: hra.hrdina.x + Math.cos(zpet) * s.lucerna.dosah, y: hra.hrdina.y + Math.sin(zpet) * s.lucerna.dosah });
      ctx.globalAlpha = 0.5 - k * 0.13;
      ctx.fillStyle = '#e0662a';
      ctx.fillRect(Math.round(o.x - 2), Math.round(o.y - 2), 4, 4);
    }
    // záře, tmavý obrys, žhavé tělo a světlé jádro
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = blik ? 0.45 : 0.3;
    ctx.fillStyle = '#ff8c3a';
    ctx.fillRect(Math.round(p.x - 8), Math.round(p.y - 8), 16, 16);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(Math.round(p.x - 5), Math.round(p.y - 5), 10, 10);
    ctx.fillStyle = '#e0662a';
    ctx.fillRect(Math.round(p.x - 4), Math.round(p.y - 4), 8, 8);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 3), 5, 5);
    ctx.fillStyle = blik ? '#ffffff' : '#fff3b0';
    ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 2, 2);
  }
  ctx.restore();
}

// Dozvuk ozvěny: fialový pixelový kroužek, který se rozběhne a zhasne (u hrdiny větší, u nepřítele menší).
function dozvuky(ctx, hra, naObrazovce) {
  if (!hra.dozvuky?.length) return;
  ctx.save();
  for (const d of hra.dozvuky) {
    const t = 1 - d.zivot / TRVANI_DOZVUKU;
    const p = naObrazovce(d);
    const r = Math.round((d.velky ? 12 : 6) + t * (d.velky ? 26 : 14));
    ctx.globalAlpha = Math.max(0, 1 - t) * 0.8;
    const { obvod } = pixelovyKruh(Math.max(1, Math.round(r / MERITKO)));
    for (const [barva, posun] of [['#5e2f86', 1], ['#d6a9f2', 0]]) {
      ctx.fillStyle = barva;
      for (const [a, b] of obvod) ctx.fillRect(Math.round(p.x + a * MERITKO - 1 + posun), Math.round(p.y + b * MERITKO - 1 + posun), MERITKO, MERITKO);
    }
  }
  ctx.restore();
}

// Odlesk po odražené střele nebo odhození: čtyřcípá jiskra, roste a zhasíná.
function odlesk(ctx, x, y, o) {
  const t = 1 - o.zivot / TRVANI_ODLESKU;
  const delka = Math.round(4 + 10 * t);
  const cx = Math.round(x);
  const cy = Math.round(y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = '#7f9cf0';
  ctx.fillRect(cx - delka, cy - 1, delka * 2, 3);
  ctx.fillRect(cx - 1, cy - delka, 3, delka * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - Math.round(delka / 2), cy, delka, 1);
  ctx.fillRect(cx, cy - Math.round(delka / 2), 1, delka);
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
  ctx.restore();
}

// Jak moc je nepřítel zamrzlý: 0 = vůbec, víc = víc zpomalený. Po vylezení ze zóny mráz bledne, jak dozní.
function silaMrazu(n) {
  if (!(n.mraz > 0)) return 0;
  return (1 - (n.zpomaleniMrazem ?? 1)) * Math.min(1, n.mraz / DOZNIVANI_MRAZU);
}

// Barva přebarvení zamrzlého nepřítele (null = není zamrzlý).
function barvaMrazu(n) {
  const sila = silaMrazu(n);
  return sila > 0 ? BARVY_MRAZU[Math.min(BARVY_MRAZU.length - 1, Math.floor(sila * 4))] : null;
}

// Ledová zóna na zemi. Než krystal dopadne, roste na zemi jeho stín. Pak se od krystalu rychle rozleze
// jinovatka (bledě modrý pixelový kruh s jasným okrajem) a vyrůstají z ní ledové jehličky, každá až tam, kam
// mráz došel. Krystal trčí uprostřed. Před roztříštěním zóna praská: od krystalu vybíhají bílé praskliny
// a okraj s krystalem blikají.
function ledovaZona(ctx, z, x, y, cas) {
  ctx.save();
  if (z.stari < DOPAD_KRYSTALU) {
    const t = z.stari / DOPAD_KRYSTALU;
    ctx.fillStyle = `rgba(20,40,70,${(0.15 + 0.25 * t).toFixed(3)})`;
    kruhNaZemi(ctx, x, y, 6 + 8 * t, true);
    ctx.restore();
    return;
  }
  const t = Math.min(1, (z.stari - DOPAD_KRYSTALU) / z.trvani);
  const r = z.polomer * Math.min(1, 0.35 + 2 * t);
  const zbyva = (1 - t) * z.trvani;
  const praska = zbyva < PRASKANI ? 1 - zbyva / PRASKANI : 0;
  const blika = praska > 0 && Math.floor(cas * 20) % 2 === 0;
  ctx.fillStyle = `rgba(150,200,255,${(0.16 + 0.12 * t).toFixed(3)})`;
  kruhNaZemi(ctx, x, y, r, true);
  ctx.fillStyle = 'rgba(200,235,255,0.3)';
  kruhNaZemi(ctx, x, y, Math.max(MERITKO, r - MERITKO));
  ctx.fillStyle = blika ? '#ffffff' : 'rgba(223,240,255,0.85)';
  kruhNaZemi(ctx, x, y, r);
  // dva šikmé odlesky na ledu (schůdky pixelů)
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (const [od, delka] of [[-0.45, 0.5], [-0.15, 0.3]]) {
    for (let k = 0; k < delka * r; k += MERITKO) {
      ctx.fillRect(Math.round(x + od * r + k - delka * r * 0.3), Math.round(y - od * r * 0.4 - k * 0.8 + delka * r * 0.2), MERITKO, MERITKO);
    }
  }
  const zaklad = hash(Math.round(z.x), Math.round(z.y));
  const jehlic = Math.round(z.polomer / 5);
  for (let i = 0; i < jehlic; i++) {
    const h = hash(zaklad, i);
    const vzdal = (0.2 + 0.65 * ((h % 1000) / 1000)) * z.polomer;
    if (vzdal > r - 4) continue;
    const uhel = ((h >>> 10) % 628) / 100;
    const jx = Math.round(x + Math.cos(uhel) * vzdal);
    const jy = Math.round(y + Math.sin(uhel) * vzdal * 0.85);
    const vyska = MERITKO * (1 + ((h >>> 20) % 3));
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(jx - 1, jy - vyska - 1, MERITKO + 2, vyska + 2);
    ctx.fillStyle = '#b8fff5';
    ctx.fillRect(jx, jy - vyska, MERITKO, vyska);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(jx, jy - vyska, MERITKO, MERITKO);
  }
  if (praska > 0) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const uhel = i * 1.26 + (zaklad % 100) / 50;
      for (let d = 6; d < r * praska; d += MERITKO) {
        const kl = Math.sin(d * 0.35 + i * 2) * 3;
        const px = x + Math.cos(uhel) * d - Math.sin(uhel) * kl;
        const py = y + (Math.sin(uhel) * d + Math.cos(uhel) * kl) * 0.85;
        ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, MERITKO - 1, MERITKO - 1);
      }
    }
  }
  const obr = sprity.ledovyKrystal;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  ctx.drawImage(blika ? prebarvi(obr, 'rgba(255,255,255,0.6)') : obr, Math.round(x - w / 2), Math.round(y - v + 6), w, v);
  ctx.restore();
}

// Ve vzduchu: krystal, který právě padá (zrychluje, za sebou dva bledé obrysy), a roztříštěné zóny: od středu
// se rozběhne bílý prstenec s osmi střepy a bledne.
function krystalyVeVzduchu(ctx, hra, naObrazovce) {
  const obr = sprity.ledovyKrystal;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  for (const z of hra.ledoveZony ?? []) {
    if (z.stari >= DOPAD_KRYSTALU) continue;
    const p = naObrazovce(z);
    const t = z.stari / DOPAD_KRYSTALU;
    const nad = (k) => Math.round(VYSKA_PADU * (1 - k * k));
    ctx.save();
    for (const [zpet, pruhlednost] of [[0.3, 0.2], [0.15, 0.4]]) {
      ctx.globalAlpha = pruhlednost;
      ctx.drawImage(prebarvi(obr, '#dfe8ff'), Math.round(p.x - w / 2), Math.round(p.y - v + 6 - nad(Math.max(0, t - zpet))), w, v);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(obr, Math.round(p.x - w / 2), Math.round(p.y - v + 6 - nad(t)), w, v);
    ctx.restore();
  }
  for (const r of hra.roztristeni ?? []) {
    const p = naObrazovce(r);
    const t = 1 - r.zivot / TRVANI_TRISTENI;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    // na začátku zóna zbělá, pak se rozběhne prstenec
    ctx.fillStyle = `rgba(220,240,255,${(0.25 + 0.45 * Math.max(0, 1 - 3 * t)).toFixed(3)})`;
    kruhNaZemi(ctx, p.x, p.y, r.polomer * (0.9 + 0.3 * t), true);
    ctx.fillStyle = '#ffffff';
    kruhNaZemi(ctx, p.x, p.y, r.polomer * (0.7 + 0.6 * t));
    kruhNaZemi(ctx, p.x, p.y, r.polomer * (0.7 + 0.6 * t) - MERITKO);
    const zaklad = hash(Math.round(r.x), Math.round(r.y));
    for (let i = 0; i < 8; i++) {
      const uhel = i * 0.785 + (zaklad % 100) / 100;
      const d = r.polomer * (0.25 + 0.9 * t);
      const sx = Math.round(p.x + Math.cos(uhel) * d);
      const sy = Math.round(p.y + Math.sin(uhel) * d * 0.85 - 10 * Math.sin(t * Math.PI));
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(sx - 1, sy - 1, MERITKO + 2, MERITKO * 2 + 2);
      ctx.fillStyle = i % 2 ? '#b8fff5' : '#ffffff';
      ctx.fillRect(sx, sy, MERITKO, MERITKO * 2);
    }
    ctx.restore();
  }
}

// Žlutozelená záře kolem zadečku světlušky (sčítá světlo). Při bliknutí je větší a jasnější.
function zareSvetlusky(ctx, x, y, blik) {
  ctx.fillStyle = `rgba(190,235,110,${blik ? 0.3 : 0.16})`;
  kruhNaZemi(ctx, x, y, blik ? 15 : 11, true);
  ctx.fillStyle = `rgba(235,255,180,${blik ? 0.45 : 0.25})`;
  kruhNaZemi(ctx, x, y, 5, true);
}

// Světlušky: každá žlutozeleně svítí, letící za sebou nechává tečky a kouká, kam letí. Zadeček jí jednou za
// BLIK_SVETLUSKY s jasně blikne (každé jindy). vpredu = kreslí ty před hrdinou (letící a odpočívající pod ním),
// jinak ty, které odpočívají za ním (výš než on), ať roj kolem hrdiny krouží dokola.
function svetluskyRoje(ctx, hra, naObrazovce, vpredu) {
  const obr = sprity.svetluska;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  (hra.svetlusky ?? []).forEach((l, i) => {
    const zaHrdinou = l.stav === 'kolem' && l.y < hra.hrdina.y - 6;
    if (zaHrdinou === vpredu) return;
    const p = naObrazovce(l);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const blik = ((hra.cas + i * 0.37) % BLIK_SVETLUSKY) / BLIK_SVETLUSKY < 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    zareSvetlusky(ctx, x, y + 3, blik);
    if (l.vx || l.vy) {
      STOPA_SVETLUSKY.forEach((zpet, k) => {
        const velikost = k === 0 ? MERITKO : 2;
        ctx.globalAlpha = 0.6 - k * 0.18;
        ctx.fillStyle = '#d8f7b0';
        ctx.fillRect(Math.round(x - l.vx * zpet - velikost / 2), Math.round(y + 3 - l.vy * zpet - velikost / 2), velikost, velikost);
      });
    }
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    if (l.vx < 0) ctx.scale(-1, 1);
    ctx.drawImage(blik ? prebarvi(obr, 'rgba(235,255,180,0.35)') : obr, -w / 2, -v / 2, w, v);
    ctx.restore();
  });
}

// Zvukové vlny zvonu: tři tenké přerušované prstence za sebou (vpředu nejjasnější), čárky se pomalu točí, ať
// vlna vypadá jako zvuk, a ne jako rázová vlna. Ozvěna je bledší. Jak vlna dobíhá, bledne.
function vlnyZvonu(ctx, hra, naObrazovce) {
  const m = MERITKO;
  for (const v of hra.vlnyZvonu ?? []) {
    const p = naObrazovce(v);
    const t = v.r / v.max;
    const cx = Math.round(p.x) - Math.floor(m / 2);
    const cy = Math.round(p.y) - Math.floor(m / 2);
    ctx.save();
    ctx.globalAlpha = (1 - t * t * 0.75) * (v.ozvena ? 0.6 : 1);
    BARVY_ZVUKU.forEach((barva, k) => {
      const r = Math.round((v.r - k * 2 * m) / m);
      if (r < 2) return;
      ctx.fillStyle = barva;
      const posun = hra.cas * 1.5 + k * 0.4;
      for (const [a, b] of pixelovyKruh(r).obvod) {
        const uhel = Math.atan2(b, a) + Math.PI + posun;
        if (Math.floor(uhel / (Math.PI / CARKY_ZVUKU)) % 2) continue;
        ctx.fillRect(cx + a * m, cy + b * m, m, m);
      }
    });
    ctx.restore();
  }
}

// Zvonek nad hlavou hrdiny se pomalu pohupuje. Po úderu se rozhoupe (kyv dozní za KYV_ZVONU s), na chvilku
// zbělá a po stranách z něj odletí čárky zvuku.
function zvonNadHrdinou(ctx, hra, stred) {
  const obr = sprity.zvonek;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  const kyv = (hra.kyvZvonu ?? 0) / KYV_ZVONU;
  const x = Math.round(stred.x);
  const y = Math.round(stred.y - VYSKA_ZVONU + Math.sin(hra.cas * 2) * 1.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin((1 - kyv) * Math.PI * 4) * 0.45 * kyv);
  ctx.drawImage(kyv > 0.8 ? prebarvi(obr, 'rgba(255,255,255,0.55)') : obr, -w / 2, 0, w, v);
  ctx.restore();
  if (kyv <= 0.3) return;
  ctx.save();
  ctx.globalAlpha = (kyv - 0.3) / 0.7;
  const od = Math.round((1 - kyv) * 12);
  for (const strana of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const vyska = 6 + i * 4;
      const cx = x + strana * (w / 2 + 3 + od + i * 5);
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(cx - 1, y + v / 2 - vyska / 2 - 1, 4, vyska + 2);
      ctx.fillStyle = '#b8fff5';
      ctx.fillRect(cx, y + v / 2 - vyska / 2, 2, vyska);
    }
  }
  ctx.restore();
}

// Omráčenému nepříteli krouží nad hlavou tři žluté hvězdičky, s koncem omráčení blednou.
function hvezdickyOmraceni(ctx, n, x, y, velikost, cas) {
  ctx.save();
  ctx.globalAlpha *= Math.min(1, n.omracen * 4);
  const nad = y - velikost / 2 - 4;
  for (let i = 0; i < 3; i++) {
    const uhel = cas * 6 + i * 2.094 + n.maxHp;
    const hx = Math.round(x + Math.cos(uhel) * velikost * 0.32);
    const hy = Math.round(nad + Math.sin(uhel) * 3);
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(hx - 3, hy - 1, 7, 3);
    ctx.fillRect(hx - 1, hy - 3, 3, 7);
    ctx.fillStyle = i ? '#fff3b0' : '#f2c94c';
    ctx.fillRect(hx - 2, hy, 5, 1);
    ctx.fillRect(hx, hy - 2, 1, 5);
  }
  ctx.restore();
}

// Cep: řetěz z článků od ruky hrdiny ke kouli (články se střídají naležato a nastojato), pod koulí stín. Koule
// se valí (natočení podle toho, kde zrovna je), větší koule se kreslí po větších pixelech a rychlá koule za
// sebou nechává dva bledé obrysy.
function cepHrdiny(ctx, hra, s, stred, naObrazovce) {
  const obr = sprity.koule;
  const m = Math.max(MERITKO, Math.round((MERITKO * s.cep.velikost) / 9));
  const w = obr.width * m;
  const ruka = { x: stred.x + hra.hrdina.otoceny * 7, y: stred.y + 3 };
  for (const k of hra.koule ?? []) {
    const p = naObrazovce(k);
    const dx = p.x - ruka.x;
    const dy = p.y - ruka.y;
    const clanku = Math.max(1, Math.floor(Math.hypot(dx, dy) / 6));
    for (let i = 1; i < clanku; i++) {
      const cx = Math.round(ruka.x + (dx * i) / clanku);
      const cy = Math.round(ruka.y + (dy * i) / clanku);
      const [sw, sv] = i % 2 ? [4, 2] : [2, 4];
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(cx - sw / 2 - 1, cy - sv / 2 - 1, sw + 2, sv + 2);
      ctx.fillStyle = '#8d9098';
      ctx.fillRect(cx - sw / 2, cy - sv / 2, sw, sv);
      ctx.fillStyle = '#c9ccd2';
      ctx.fillRect(cx - sw / 2, cy - sv / 2, 1, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(Math.round(p.x - w * 0.35), Math.round(p.y + w * 0.38), Math.round(w * 0.7), MERITKO);
    const kresli1 = (x, y, prekryv, pruhlednost) => {
      ctx.save();
      ctx.globalAlpha = pruhlednost;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate((k.x + k.y) / 14);
      ctx.drawImage(prekryv ? prebarvi(obr, prekryv) : obr, -w / 2, -w / 2, w, w);
      ctx.restore();
    };
    if (k.rychlost > STOPA_CEPU) {
      for (const [zpet, pruhlednost] of STOPY_CEPU) kresli1(p.x - k.vx * zpet, p.y - k.vy * zpet, '#c9ccd2', pruhlednost);
    }
    kresli1(p.x, p.y, null, 1);
  }
}

// Semínko na zemi: stín, semínko po dopadu poskočí a s blížícím se výbuchem bliká čím dál rychleji, kolem
// něj roste bledý kruh, kam až výbuch dosáhne. Z vybuchlého semínka vyroste keř (po pixelech roste, na konci
// zvadne a zmizí, větší keř má větší pixely) a pod ním je tmavší kruh, kde píchá.
function seminkaNaZemi(ctx, hra, naObrazovce, sirka, vyska) {
  for (const p of hra.seminka ?? []) {
    const q = naObrazovce(p);
    if (q.x < -p.polomer - 20 || q.y < -p.polomer - 40 || q.x > sirka + p.polomer + 20 || q.y > vyska + p.polomer + 20) continue;
    if (p.stari < ZRANI_SEMINKA) {
      const t = p.stari / ZRANI_SEMINKA;
      ctx.save();
      ctx.fillStyle = `rgba(155,224,138,${(0.1 + 0.25 * t).toFixed(3)})`;
      kruhNaZemi(ctx, q.x, q.y, p.polomer * (0.4 + 0.6 * t));
      ctx.restore();
      const obr = sprity.seminko;
      const w = obr.width * MERITKO;
      const v = obr.height * MERITKO;
      const perioda = 0.3 - 0.24 * t;
      const blik = t > 0.4 && p.stari % perioda < perioda / 2;
      const skok = p.stari < 0.25 ? Math.round(Math.sin((p.stari / 0.25) * Math.PI) * 6) : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(Math.round(q.x - w * 0.35), Math.round(q.y + v / 2 - 2), Math.round(w * 0.7), MERITKO);
      ctx.drawImage(blik ? prebarvi(obr, 'rgba(255,90,90,0.65)') : obr, Math.round(q.x - w / 2), Math.round(q.y - v / 2 - skok), w, v);
      continue;
    }
    const zbyva = ZRANI_SEMINKA + p.trvani - p.stari;
    const rust = Math.min(1, (p.stari - ZRANI_SEMINKA) / RUST_KERE);
    const vadne = Math.max(0, Math.min(1, zbyva / VADNUTI_KERE));
    const r = p.polomer * POMER_KERE;
    ctx.save();
    ctx.globalAlpha = vadne;
    ctx.fillStyle = 'rgba(38,85,42,0.35)';
    kruhNaZemi(ctx, q.x, q.y, r, true);
    ctx.fillStyle = 'rgba(63,138,60,0.6)';
    kruhNaZemi(ctx, q.x, q.y, r);
    const obr = sprity.ker;
    const plna = Math.max(MERITKO, Math.round((MERITKO * r) / KER_PRI_MERITKU));
    const m = Math.max(1, Math.round(plna * rust * (0.5 + 0.5 * vadne)));
    const w = obr.width * m;
    const kyv = Math.round(Math.sin(hra.cas * 3 + p.x * 0.1) * 1.2);
    ctx.drawImage(obr, Math.round(q.x - w / 2) + kyv, Math.round(q.y - w * 0.6), w, w);
    ctx.restore();
  }
}

// Výbuch semínka: žlutý záblesk, zelený prstenec, který se rozběhne do poloměru výbuchu, a osm trnů, které
// vyletí do stran.
function vybuchySeminek(ctx, hra, naObrazovce) {
  for (const vb of hra.vybuchySeminek ?? []) {
    const p = naObrazovce(vb);
    const t = 1 - vb.zivot / TRVANI_VYBUCHU_SEMINKA;
    const r = vb.polomer * (0.4 + 0.6 * t);
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.8;
    if (t < 0.35) {
      ctx.fillStyle = 'rgba(242,201,76,0.45)';
      kruhNaZemi(ctx, p.x, p.y, vb.polomer * (0.3 + t), true);
    }
    ctx.fillStyle = '#3f8a3c';
    kruhNaZemi(ctx, p.x, p.y, Math.max(MERITKO, r - MERITKO));
    ctx.fillStyle = '#9be08a';
    kruhNaZemi(ctx, p.x, p.y, r);
    const zaklad = hash(Math.round(vb.x), Math.round(vb.y));
    for (let i = 0; i < 8; i++) {
      const uhel = i * 0.785 + (zaklad % 100) / 100;
      const d = vb.polomer * (0.3 + 0.8 * t);
      const tx = Math.round(p.x + Math.cos(uhel) * d);
      const ty = Math.round(p.y + Math.sin(uhel) * d * 0.85 - 8 * Math.sin(t * Math.PI));
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(tx - 1, ty - 1, MERITKO + 2, MERITKO + 2);
      ctx.fillStyle = i % 2 ? '#e8e2d0' : '#3f8a3c';
      ctx.fillRect(tx, ty, MERITKO, MERITKO);
    }
    ctx.restore();
  }
}

// Kořeny: kořen v zemi táhne za sebou prasklou zem (tmavé pixely po své cestě) a na špičce hrbolek hlíny, ze
// kterého odskakují hroudy. Vyražený kořen: rozrytá zem v poloměru a z ní trčí kořeny (rostou ze země, špičky
// první, kývou se a na konci zase zalezou), prasklina za ním zmizí.
function koreny(ctx, hra, naObrazovce, sirka, vyska) {
  const m = MERITKO;
  for (const k of hra.korene ?? []) {
    const p = naObrazovce(k);
    const drzi = k.faze === 'drzi';
    const stari = drzi ? k.trvani - k.zivot : 0;
    const prasklina = drzi ? 1 - stari / MIZENI_PRASKLINY : 1;
    if (prasklina > 0) {
      ctx.save();
      ctx.globalAlpha = prasklina * 0.85;
      const body = [...k.cesta, ...(drzi ? [] : [k])];
      const zaklad = hash(Math.round(k.cesta[0].x), Math.round(k.cesta[0].y));
      for (let i = 1; i < body.length; i++) {
        const a = naObrazovce(body[i - 1]);
        const b = naObrazovce(body[i]);
        const kusu = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / m));
        for (let j = 0; j < kusu; j++) {
          const t = j / kusu;
          const cik = ((zaklad >>> ((i + j) % 24)) & 1) ? 1 : -1;
          const x = Math.round((a.x + (b.x - a.x) * t) / m) * m;
          const y = Math.round((a.y + (b.y - a.y) * t) / m) * m + (j % 3 === 0 ? cik * m : 0);
          ctx.fillStyle = '#2e1e16';
          ctx.fillRect(x - 1, y - 1, m + 2, m + 2);
          ctx.fillStyle = j % 4 === 1 ? '#a07e5c' : '#4a3530';
          ctx.fillRect(x, y, m, m);
        }
      }
      ctx.restore();
    }
    if (p.x < -k.polomer - 30 || p.y < -k.polomer - 40 || p.x > sirka + k.polomer + 30 || p.y > vyska + k.polomer + 30) continue;
    if (!drzi) {
      // hrbolek hlíny na špičce poskakuje a odskakují z něj dvě hroudy
      const obr = sprity.hrbolek;
      const skok = Math.floor(hra.cas * 14 + k.cesta[0].x) % 2;
      ctx.drawImage(obr, Math.round(p.x - (obr.width * m) / 2), Math.round(p.y - obr.height * m + 4 - skok), obr.width * m, obr.height * m);
      for (let i = 0; i < 2; i++) {
        const f = (hra.cas * 3 + i * 0.5) % 1;
        const hx = Math.round(p.x + (i ? 1 : -1) * (4 + f * 8));
        const hy = Math.round(p.y - 6 - Math.sin(f * Math.PI) * 10);
        ctx.fillStyle = '#0b0a0f';
        ctx.fillRect(hx - 1, hy - 1, m + 2, m + 2);
        ctx.fillStyle = '#8a5a35';
        ctx.fillRect(hx, hy, m, m);
      }
      continue;
    }
    const rust = Math.min(1, stari / VYRAZENI_KORENU);
    const venku = Math.max(0, Math.min(rust, k.zivot / ZALEZANI_KORENU));
    ctx.save();
    ctx.globalAlpha = Math.min(1, k.zivot / ZALEZANI_KORENU + 0.3);
    ctx.fillStyle = 'rgba(46,30,22,0.45)';
    kruhNaZemi(ctx, p.x, p.y, k.polomer * (0.5 + 0.4 * rust), true);
    ctx.fillStyle = 'rgba(74,53,48,0.8)';
    kruhNaZemi(ctx, p.x, p.y, k.polomer * (0.5 + 0.4 * rust));
    ctx.restore();
    const obr = sprity.koren;
    const radku = Math.ceil(obr.height * venku);
    if (radku <= 0) continue;
    const zaklad = hash(Math.round(k.x), Math.round(k.y));
    const pocet = k.polomer > 26 ? 6 : 4;
    const kusy = [];
    for (let i = 0; i < pocet; i++) {
      const uhel = i * 2.4 + (zaklad % 628) / 100;
      const vzdal = k.polomer * (i % 2 ? 0.75 : 0.45);
      kusy.push({ x: p.x + Math.cos(uhel) * vzdal, y: p.y + Math.sin(uhel) * vzdal * 0.7, otoceny: Math.cos(uhel) < 0, i });
    }
    kusy.sort((a, b) => a.y - b.y);
    const w = obr.width * m;
    const v = radku * m;
    for (const o of kusy) {
      const kyv = Math.round(Math.sin(hra.cas * 5 + o.i * 1.3) * 1.2);
      ctx.save();
      ctx.translate(Math.round(o.x) + kyv, Math.round(o.y + (obr.height * m) / 2));
      if (o.otoceny) ctx.scale(-1, 1);
      ctx.drawImage(obr, 0, 0, obr.width, radku, -w / 2, -v, w, v);
      ctx.restore();
    }
  }
}

// Drženému nepříteli se kolem nohou omotají kořeny (bossovi dvoje), na konci držení vyblednou.
function uponkyKorenu(ctx, n, x, y, velikost) {
  const obr = sprity.uponka;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  ctx.save();
  ctx.globalAlpha = Math.min(1, n.drzen / ZALEZANI_KORENU);
  const dole = Math.round(y + velikost / 2 - v + 3);
  for (const posun of n.boss ? [-w / 2 + 2, w / 2 - 2] : [0]) ctx.drawImage(obr, Math.round(x + posun - w / 2), dole, w, v);
  ctx.restore();
}

// Plameny Ohnivé stopy. Nejdřív pod všemi spálená zem (tmavý kruh, s dohasínáním bledne), pak teplá záře a nad
// tím plameny: v každém dva (ve větším tři), každý jinde podle pořadí plamene, střídají se ve dvou snímcích
// a mihotají. Nový plamen vyšlehne ze země (špička první), dohasínající se zmenšuje do žhavých uhlíků.
function plamenyStopy(ctx, hra, naObrazovce, sirka, vyska) {
  const plameny = (hra.plameny ?? []).filter((pl) => {
    const p = naObrazovce(pl);
    return p.x > -pl.polomer - 20 && p.y > -pl.polomer - 40 && p.x < sirka + pl.polomer + 20 && p.y < vyska + pl.polomer + 20;
  });
  if (!plameny.length) return;
  for (const pl of plameny) {
    const p = naObrazovce(pl);
    ctx.save();
    ctx.globalAlpha = Math.min(1, pl.zivot / DOHASINANI) * 0.5;
    ctx.fillStyle = '#1e1414';
    kruhNaZemi(ctx, p.x, p.y + 4, pl.polomer * 0.8, true);
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const pl of plameny) {
    const p = naObrazovce(pl);
    const zhasina = Math.min(1, pl.zivot / DOHASINANI);
    ctx.fillStyle = `rgba(255,120,40,${(0.12 * zhasina).toFixed(3)})`;
    kruhNaZemi(ctx, p.x, p.y + 4, pl.polomer * (0.6 + 0.08 * Math.sin(hra.cas * 9 + pl.poradi)), true);
  }
  ctx.restore();
  const ohne = [];
  for (const pl of plameny) {
    const p = naObrazovce(pl);
    const vzplanuti = Math.min(1, pl.stari / VZPLANUTI);
    const zhasina = Math.min(1, pl.zivot / DOHASINANI);
    const pocet = pl.polomer > 24 ? 3 : 2;
    for (let i = 0; i < pocet; i++) {
      const uhel = (pl.poradi * 2.4 + i * 2.1) % (Math.PI * 2);
      const vzdal = pl.polomer * (i ? 0.45 : 0.15);
      ohne.push({
        x: p.x + Math.cos(uhel) * vzdal, y: p.y + 4 + Math.sin(uhel) * vzdal * 0.6, vyska: Math.min(vzplanuti, zhasina),
        snimek: Math.floor(hra.cas / SNIMEK_PLAMENE + pl.poradi + i) % 2, otoceny: (pl.poradi + i) % 2, zhasina,
      });
    }
  }
  ohne.sort((a, b) => a.y - b.y);
  for (const o of ohne) {
    const obr = o.snimek ? sprity.plamen2 : sprity.plamen;
    const radku = Math.ceil(obr.height * o.vyska);
    if (radku <= 0) continue;
    const w = obr.width * MERITKO;
    const v = radku * MERITKO;
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * o.zhasina;
    ctx.translate(Math.round(o.x), Math.round(o.y));
    if (o.otoceny) ctx.scale(-1, 1);
    ctx.drawImage(o.zhasina < 0.6 ? prebarvi(obr, 'rgba(184,68,60,0.55)') : obr, 0, 0, obr.width, radku, -w / 2, -v, w, v);
    ctx.restore();
  }
}

// Zapálenému nepříteli (stojí v ohni nebo ještě hoří) plápolají nad hlavou a na boku plamínky, s koncem hoření
// se zmenšují.
function plaminkyNaNepriteli(ctx, n, x, y, velikost, cas) {
  const obr = sprity.plaminek;
  const sila = n.vOhni ? 1 : Math.min(1, n.hori * 2);
  if (sila <= 0) return;
  const w = obr.width * MERITKO;
  const v = obr.height * MERITKO;
  const mista = n.vOhni ? [[0.2, 0.15]] : [[-0.22, -0.25], [0.25, 0.05]];
  mista.forEach(([dx, dy], i) => {
    const mih = Math.floor(cas / SNIMEK_PLAMENE + i + n.maxHp) % 2;
    const radku = Math.max(1, Math.ceil(obr.height * sila));
    ctx.save();
    ctx.translate(Math.round(x + dx * velikost), Math.round(y + dy * velikost + v / 2));
    if (mih) ctx.scale(-1, 1);
    ctx.drawImage(obr, 0, 0, obr.width, radku, -w / 2, -radku * MERITKO, w, radku * MERITKO);
    ctx.restore();
  });
}

// Kameny praku: stín na zemi, nad ním kámen (točí se podle toho, kolik uletěl) a za ním dvě tečky prachu.
// Dopadlý kámen spadne k zemi, jednou odskočí a zmizí.
function kamenyPraku(ctx, hra, naObrazovce) {
  const obr = sprity.oblazek;
  const w = obr.width * MERITKO;
  const kresli1 = (x, y, ulet) => {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(Math.floor(ulet / 10) * (Math.PI / 2));
    ctx.drawImage(obr, -w / 2, -w / 2, w, w);
    ctx.restore();
  };
  for (const k of hra.oblazky ?? []) {
    const p = naObrazovce(k);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(Math.round(p.x - w * 0.35), Math.round(p.y + 3), Math.round(w * 0.7), MERITKO);
    STOPA_KAMENE.forEach((zpet, i) => {
      ctx.fillStyle = i ? 'rgba(201,204,210,0.35)' : 'rgba(201,204,210,0.6)';
      const r = i ? 2 : MERITKO;
      ctx.fillRect(Math.round(p.x - k.vx * zpet - r / 2), Math.round(p.y - VYSKA_KAMENE - k.vy * zpet - r / 2), r, r);
    });
    kresli1(p.x, p.y - VYSKA_KAMENE, k.ulet);
    if (k.zasahu > 1) {
      // rozjetý kámen (po odrazech) má bílý záblesk na boku
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - VYSKA_KAMENE - w / 2 - 1), 2, 2);
    }
  }
  for (const pd of hra.padleKameny ?? []) {
    const p = naObrazovce(pd);
    const t = 1 - pd.zivot / PAD_KAMENE;
    const nad = t < 0.6 ? VYSKA_KAMENE * (1 - t / 0.6) : Math.sin(((t - 0.6) / 0.4) * Math.PI) * 3;
    ctx.save();
    ctx.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(Math.round(p.x - w * 0.35), Math.round(p.y + 3), Math.round(w * 0.7), MERITKO);
    kresli1(p.x, p.y - nad, pd.ulet);
    ctx.restore();
  }
}

// Jak daleko je varování schopnosti: 0 na začátku, 1 těsně před provedením.
function prubehVarovani(sch) {
  return Math.max(0, Math.min(1, 1 - sch.zbyva / sch.s.varovani));
}

// Pixelová čára z (x, y) směrem (ux, uy) dlouhá delka: čtverečky po MERITKO px, s tmavým okrajem.
function caraNaZemi(ctx, x, y, ux, uy, delka, tloustka) {
  const m = MERITKO;
  for (let d = 0; d <= delka; d += m) {
    ctx.fillRect(Math.round(x + ux * d - tloustka / 2), Math.round(y + uy * d - tloustka / 2), tloustka, tloustka);
  }
}

// Pro barvoslepé: varování jako pruhovaná plocha (šikmé pruhy, sílí s průběhem) s pruhovaným okrajem v tmavém
// lemu, ať se pozná na každé zemi a bez barvy.
function pruhovanyKruh(ctx, x, y, okraj, vypln, sila) {
  ctx.save();
  ctx.globalAlpha = sila;
  ctx.fillStyle = vzor(ctx, 'pruhy');
  kruhNaZemi(ctx, x, y, vypln, true);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#140c08';
  kruhNaZemi(ctx, x, y, okraj + MERITKO * 2);
  kruhNaZemi(ctx, x, y, okraj - MERITKO * 2);
  ctx.fillStyle = vzor(ctx, 'pruhy');
  kruhNaZemi(ctx, x, y, okraj);
  kruhNaZemi(ctx, x, y, okraj + MERITKO);
  kruhNaZemi(ctx, x, y, okraj - MERITKO);
  ctx.restore();
}

// Varování schopností bossů na zemi (pod nepřáteli): rudý kruh dupnutí roste, čára výpadu míří (po zamčení
// svítí naplno a hrot ukazuje, kam až doběhne), kruhy vyvolání se rozzáří.
function varovaniNaZemi(ctx, hra, naObrazovce) {
  for (const n of hra.nepratele) {
    const sch = n.schopnost;
    if (!sch) continue;
    const p = naObrazovce(n);
    const t = prubehVarovani(sch);
    const barva = n.boss ? (BARVY_BOSSU[n.druh] ?? BARVY_BOSSU.strazce).pruh : OBRYS_ELITY;
    ctx.save();
    if (sch.id === 'skok') {
      // Kam slizák dopadne: kruh je vidět od přikrčení, stín roste, jak letí.
      const q = naObrazovce({ x: sch.cilX, y: sch.cilY });
      const let_ = sch.faze === 'provadi' ? Math.min(1, sch.ulet / sch.s.let) : 0;
      ctx.fillStyle = `rgba(11,10,15,${(0.12 + 0.12 * t + 0.25 * let_).toFixed(3)})`;
      kruhNaZemi(ctx, q.x, q.y, Math.max(6, sch.s.polomer * (0.3 + 0.7 * let_)), true);
      ctx.globalAlpha = 0.45 + 0.5 * Math.max(t, let_);
      ctx.fillStyle = '#e5484d';
      kruhNaZemi(ctx, q.x, q.y, sch.s.polomer);
      if (barvoslepy()) pruhovanyKruh(ctx, q.x, q.y, sch.s.polomer, Math.max(6, sch.s.polomer * (0.3 + 0.7 * let_)), 0.3 + 0.4 * Math.max(t, let_));
    } else if (sch.id === 'dupnuti' && sch.faze === 'varovani') {
      ctx.fillStyle = `rgba(229,72,77,${(0.1 + 0.18 * t).toFixed(3)})`;
      kruhNaZemi(ctx, p.x, p.y, Math.max(6, sch.s.polomer * t), true);
      ctx.globalAlpha = Math.floor(hra.cas * (6 + 14 * t)) % 2 ? 0.5 : 0.95;
      ctx.fillStyle = '#e5484d';
      kruhNaZemi(ctx, p.x, p.y, sch.s.polomer);
      if (barvoslepy()) pruhovanyKruh(ctx, p.x, p.y, sch.s.polomer, Math.max(6, sch.s.polomer * t), 0.35 + 0.4 * t);
    } else if (sch.id === 'vypad' && sch.faze === 'varovani') {
      const zamceno = sch.zbyva <= sch.s.zamek;
      const od = n.polomer;
      ctx.globalAlpha = zamceno ? 0.95 : (Math.floor(hra.cas * 12) % 2 ? 0.35 : 0.6);
      ctx.fillStyle = '#0b0a0f';
      caraNaZemi(ctx, p.x + sch.ux * od, p.y + sch.uy * od, sch.ux, sch.uy, sch.s.delka - od, zamceno ? 8 : 6);
      ctx.fillStyle = zamceno ? '#ff5a5a' : '#e5484d';
      caraNaZemi(ctx, p.x + sch.ux * od, p.y + sch.uy * od, sch.ux, sch.uy, sch.s.delka - od, zamceno ? 4 : 3);
      // pro barvoslepé: dráha výpadu je pruhovaný pás (tmavý okraj a v něm pruhy)
      if (barvoslepy()) {
        ctx.fillStyle = '#140c08';
        caraNaZemi(ctx, p.x + sch.ux * od, p.y + sch.uy * od, sch.ux, sch.uy, sch.s.delka - od, zamceno ? 18 : 14);
        ctx.fillStyle = vzor(ctx, 'pruhy');
        caraNaZemi(ctx, p.x + sch.ux * od, p.y + sch.uy * od, sch.ux, sch.uy, sch.s.delka - od, zamceno ? 12 : 9);
        ctx.fillStyle = zamceno ? '#ff5a5a' : '#e5484d';
      }
      // hrot na konci dráhy
      const kx = p.x + sch.ux * sch.s.delka;
      const ky = p.y + sch.uy * sch.s.delka;
      for (let i = 1; i <= 4; i++) {
        const z = i * MERITKO * 1.5;
        for (const strana of [-1, 1]) {
          ctx.fillRect(Math.round(kx - sch.ux * z - sch.uy * z * strana * 0.8) - 2, Math.round(ky - sch.uy * z + sch.ux * z * strana * 0.8) - 2, 4, 4);
        }
      }
    } else if (sch.id === 'vyvolani' && sch.faze === 'varovani') {
      for (const m of sch.mista) {
        const q = naObrazovce(m);
        ctx.globalAlpha = 0.25 + 0.25 * t;
        ctx.fillStyle = '#0b0a0f';
        kruhNaZemi(ctx, q.x, q.y, 6 + 10 * t, true);
        ctx.globalAlpha = Math.floor(hra.cas * (8 + 12 * t)) % 2 ? 0.6 : 1;
        ctx.fillStyle = barva;
        kruhNaZemi(ctx, q.x, q.y, 6 + 10 * t);
        if (barvoslepy()) {
          pruhovanyKruh(ctx, q.x, q.y, 6 + 10 * t, 6 + 10 * t, 0.8);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#fff3b0';
        const jiskra = Math.round(((hra.cas * 40 + m.x) % 18));
        ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y - jiskra) - 1, 3, 3);
      }
    }
    ctx.restore();
  }
}

// Obklíčení: kolem stojícího hrdiny se stahuje kruh tmavých hrotů (od 2,5násobku k 1,2násobku jeho velikosti),
// plně obklíčenému pulzují rudě. Tvar je stejný v každém režimu barev, pozná se i bez barvy.
const HROTY_OBKLICENI = 12;
function obkliceniHrdiny(ctx, hra, stred) {
  const o = hra.hrdina.obkliceni ?? 0;
  if (!(o > 0)) return;
  const plne = o >= 1;
  const r = 14 * MERITKO * (1.2 + 1.3 * (1 - o));
  const otoceni = hra.cas * 0.6;
  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.25 + 0.75 * o) * (plne && Math.floor(hra.cas * 6) % 2 ? 0.75 : 1);
  for (let i = 0; i < HROTY_OBKLICENI; i++) {
    const uhel = otoceni + (i / HROTY_OBKLICENI) * Math.PI * 2;
    const ux = Math.cos(uhel);
    const uy = Math.sin(uhel);
    // hrot míří dovnitř: tři čtverečky od kraje ke středu, každý menší
    for (let k = 0; k < 3; k++) {
      const v = MERITKO * (3 - k);
      const x = Math.round(stred.x + ux * (r - k * MERITKO * 1.6) - v / 2);
      const y = Math.round(stred.y + uy * (r - k * MERITKO * 1.6) - v / 2);
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(x - 1, y - 1, v + 2, v + 2);
      ctx.fillStyle = plne ? '#e5484d' : '#5c5b70';
      ctx.fillRect(x, y, v, v);
    }
  }
  ctx.restore();
}

// Útoky bossů na zemi (pod nepřáteli): varování schopností, vlny dupnutí a kam dopadnou kameny.
function utokyNaZemi(ctx, hra, naObrazovce) {
  varovaniNaZemi(ctx, hra, naObrazovce);
  for (const v of hra.vlny) {
    const p = naObrazovce(v);
    const t = v.r / v.max;
    ctx.save();
    ctx.globalAlpha = 1 - t * t * 0.7;
    ctx.fillStyle = '#7a4214';
    kruhNaZemi(ctx, p.x, p.y, Math.max(3, v.r - 3));
    ctx.fillStyle = '#ffb347';
    kruhNaZemi(ctx, p.x, p.y, v.r);
    ctx.fillStyle = '#fff3b0';
    kruhNaZemi(ctx, p.x, p.y, v.r + 3);
    ctx.restore();
  }
  for (const k of hra.kameny) {
    // Místo dopadu: stín roste, jak kámen padá, a rudý kroužek kolem.
    const p = naObrazovce(k);
    const t = Math.max(0, Math.min(1, k.let / k.trvani));
    ctx.save();
    ctx.fillStyle = `rgba(11,10,15,${(0.15 + 0.3 * t).toFixed(3)})`;
    kruhNaZemi(ctx, p.x, p.y, 6 + (k.polomer - 10) * t, true);
    ctx.globalAlpha = 0.5 + 0.5 * t;
    ctx.fillStyle = k.sit ? '#c9ccd2' : '#e5484d';
    kruhNaZemi(ctx, p.x, p.y, k.polomer);
    if (barvoslepy()) pruhovanyKruh(ctx, p.x, p.y, k.polomer, 6 + (k.polomer - 10) * t, 0.3 + 0.5 * t);
    ctx.restore();
  }
}

// Malý výbuch po dopadu kamene: záblesk a prstenec, který se rozběhne do poloměru zásahu a zbledne.
function dopad(ctx, x, y, d) {
  const t = 1 - d.zivot / TRVANI_DOPADU;
  const [zar, prsten, jadro] = BARVY_DOPADU[d.druh] ?? BARVY_DOPADU.kamen;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = zar;
  kruhNaZemi(ctx, x, y, d.polomer * (0.5 + 0.5 * t), true);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = prsten;
  kruhNaZemi(ctx, x, y, d.polomer * (0.4 + 0.6 * t));
  if (t < 0.4) {
    ctx.fillStyle = jadro;
    kruhNaZemi(ctx, x, y, 6 + 6 * t, true);
  }
  ctx.restore();
}

// Vykřičník nad bossem, dokud varuje: hráč hned ví, že něco přijde.
function vykricnik(ctx, x, y, barva, cas) {
  const bx = Math.round(x) - 3;
  const by = Math.round(y + (Math.floor(cas * 8) % 2 ? -1 : 0));
  ctx.fillStyle = '#0b0a0f';
  ctx.fillRect(bx - 2, by - 2, 10, 17);
  ctx.fillRect(bx - 2, by + 17, 10, 8);
  ctx.fillStyle = barva;
  ctx.fillRect(bx, by, 6, 13);
  ctx.fillRect(bx, by + 19, 6, 4);
}

// Barvy střel bossů: vějíř Bludičky, vějíř Bahenní bludičky a střela vrácená zrcadlem.
const BARVY_STREL = {
  vejir: { zar: 'rgba(127,156,240,0.25)', telo: '#7f9cf0', jadro: '#dfe8ff' },
  bahno: { zar: 'rgba(120,200,90,0.25)', telo: '#5fae4e', jadro: '#d8f7b0' },
  odrazena: { zar: 'rgba(228,246,243,0.3)', telo: '#c9ccd2', jadro: '#ffffff' },
};

// Kameny v letu (nad nepřáteli, po oblouku), výbuchy po dopadu, kameny nad hlavou bosse, který se chystá
// hodit, a střely Bludičky.
function utokyVeVzduchu(ctx, hra, naObrazovce) {
  for (const d of hra.dopady ?? []) {
    const p = naObrazovce(d);
    dopad(ctx, p.x, p.y, d);
  }
  for (const n of hra.nepratele) {
    const sch = n.schopnost;
    if (sch?.id !== 'hod' || sch.faze !== 'varovani') continue;
    // tři kameny stoupají nad hlavu a třesou se (kostlivec zvedá jednu kost, elita tři)
    const p = naObrazovce(n);
    const t = prubehVarovani(sch);
    const obr = sprity[sch.s.strela] ?? sprity.kamen;
    const vyska = n.polomer + (n.boss ? NAD_HLAVOU : NAD_HLAVOU / 2) * (0.4 + 0.6 * t);
    const kolem = n.boss || sch.s.pocet[1] > 1 ? 1 : 0;
    for (let i = -kolem; i <= kolem; i++) {
      const chvej = Math.floor(hra.cas * 24 + i) % 2 ? 1 : -1;
      sprite(ctx, obr, p.x + i * 14 + chvej, p.y - vyska + Math.abs(i) * 4);
    }
  }
  for (const k of hra.kameny) {
    if (k.let < 0) continue;
    const t = Math.min(1, k.let / k.trvani);
    const od = naObrazovce({ x: k.odX, y: k.odY });
    const kam = naObrazovce(k);
    const x = od.x + (kam.x - od.x) * t;
    const y = od.y + (kam.y - od.y) * t - Math.sin(Math.PI * t) * VYSKA_HODU;
    sprite(ctx, sprity[k.druh] ?? sprity.kamen, x, y);
  }
  for (const st of hra.strelyBossu) {
    const p = naObrazovce(st);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const r = POLOMER_STRELY_BOSSU;
    // Střela vrácená zrcadlem je stříbrná a táhne za sebou dva menší odlesky.
    const barvy = st.odrazena ? BARVY_STREL.odrazena : BARVY_STREL[st.barva] ?? BARVY_STREL.vejir;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = barvy.zar;
    ctx.fillRect(x - r - 4, y - r - 4, 2 * r + 8, 2 * r + 8);
    if (st.odrazena) {
      const rychlost = Math.hypot(st.vx, st.vy) || 1;
      for (const [zpet, velikost] of [[9, 3], [17, 2]]) {
        ctx.fillRect(Math.round(x - (st.vx / rychlost) * zpet - velikost), Math.round(y - (st.vy / rychlost) * zpet - velikost), velikost * 2, velikost * 2);
      }
    }
    ctx.restore();
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2);
    ctx.fillStyle = barvy.telo;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = barvy.jadro;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
}

// Kolik životů ukazuje světlý úbytek v pruhu bosse. Počítá se z času hry, takže v pauze stojí.
const ubytky = new WeakMap();
function ubytek(n, cas) {
  let u = ubytky.get(n);
  if (!u) {
    u = { hp: n.hp, posledni: n.hp, zasah: cas, cas };
    ubytky.set(n, u);
  }
  const hp = Math.max(0, n.hp);
  if (hp < u.posledni) u.zasah = cas;
  u.posledni = hp;
  if (hp > u.hp) u.hp = hp;
  else if (cas - u.zasah > DRZENI_UBYTKU) u.hp = Math.max(hp, u.hp - n.maxHp * RYCHLOST_UBYTKU * Math.max(0, cas - u.cas));
  u.cas = cas;
  return u.hp;
}

// Pixelové písmo čísel nad hlavami: X = pixel, znaky 3×5 (M je širší). Kreslí se s tmavým obrysem 1 pixel
// (do stran, nahoru a dolů jako u spritů) a spodní dva řádky jsou o odstín tmavší.
const PISMO_CISEL = {
  0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  1: ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  2: ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  3: ['XXX', '..X', '.XX', '..X', 'XXX'],
  4: ['X.X', 'X.X', 'XXX', '..X', '..X'],
  5: ['XXX', 'X..', 'XXX', '..X', 'XXX'],
  6: ['XXX', 'X..', 'XXX', 'X.X', 'XXX'],
  7: ['XXX', '..X', '..X', '.X.', '.X.'],
  8: ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  9: ['XXX', 'X.X', 'XXX', '..X', 'XXX'],
  '+': ['...', '.X.', 'XXX', '.X.', '...'],
  '!': ['X', 'X', 'X', '.', 'X'],
  '-': ['...', '...', 'XXX', '...', '...'],
  k: ['X..', 'X.X', 'XX.', 'X.X', 'X.X'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'],
  // srdce (léčení) a mince (zlaťáky) za číslem v režimu pro barvoslepé
  '♥': ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  '¤': ['.XXX.', 'X.X.X', 'X.X.X', 'X.X.X', '.XXX.'],
};
// Režim pro barvoslepé: čísla nad hrdinou, která se liší jen barvou (+ léčení a + zlaťáky, − rána a − útrata),
// dostanou za číslem srdce nebo minci.
const ZNACKY_CISEL = { leceni: '♥', sani: '♥', zlato: '¤', utrata: '¤' };
const OBRYS_CISEL = '#0b0a0f';
// [výplň, spodek] podle druhu čísla, null = obyčejný zásah.
const BARVY_CISEL = {
  zasah: ['#ffffff', '#cfc9dc'],
  silny: ['#ffe14d', '#f0a830'],
  krit: ['#ffe98a', '#ff6b1a'],
  zraneni: ['#ff5a5a', '#c8323e'],
  jed: ['#ff5a5a', '#c8323e'],
  ohen: ['#ffb347', '#e0662a'],
  leceni: ['#7cf08a', '#3fb557'],
  zlato: ['#f2c94c', '#c4862f'],
  utrata: ['#c4862f', '#8a5a35'],
  sani: ['#ff9db0', '#d0405e'],
  stit: ['#b8fff5', '#4fd6c9'],
};
// Násobek velikosti podle druhu (silný zásah je větší, čísla nad hrdinou o kus větší než zásahy).
const VELIKOST_CISEL = {
  krit: 1.75, silny: 1.5, zraneni: 1.25, jed: 1.25, ohen: 1.25, leceni: 1.25, zlato: 1.25, utrata: 1.25, sani: 1.25, stit: 1.5,
};
// Čísla nad hrdinou se kreslí vždy navrchu. Se zhasnutými čísly poškození zůstane léčení (i sání Upířího zubu),
// zlaťáky a modrá 0 po ráně, kterou zastavil Štít.
const NAD_HRDINOU = new Set(['zraneni', 'jed', 'ohen', 'leceni', 'zlato', 'utrata', 'sani', 'stit']);
const POSKOZENI = new Set([null, 'silny', 'krit', 'zraneni', 'jed', 'ohen']);
// Číslo nejdřív krátce poskočí (i po přičtení další rány), vyletí o VYSKOK pixelů písma a na konci zprůhlední.
const POSKOK_CISLA = 0.08;
const VYSKOK_CISLA = 9;
const UNIK_CISLA = 0.2;

// Obrázek celého čísla v jednom pixelu písma (kreslí se zvětšený bez vyhlazení). Každá kombinace jednou.
const obrazkyCisel = new Map();
function obrazekCisla(text, druh) {
  const klic = `${druh}|${text}`;
  const hotovy = obrazkyCisel.get(klic);
  if (hotovy) return hotovy;
  const body = [];
  let x = 1;
  for (const znak of text) {
    const glyf = PISMO_CISEL[znak];
    if (!glyf) {
      x += 2;
      continue;
    }
    glyf.forEach((radek, y) => {
      [...radek].forEach((c, dx) => { if (c === 'X') body.push([x + dx, y + 1]); });
    });
    x += glyf[0].length + 1;
  }
  const obr = document.createElement('canvas');
  obr.width = Math.max(1, x);
  obr.height = 7;
  const g = obr.getContext('2d');
  g.fillStyle = OBRYS_CISEL;
  for (const [bx, by] of body) {
    g.fillRect(bx - 1, by, 3, 1);
    g.fillRect(bx, by - 1, 1, 3);
  }
  const [vypln, spodek] = BARVY_CISEL[druh] ?? BARVY_CISEL.zasah;
  for (const [bx, by] of body) {
    g.fillStyle = by >= 4 ? spodek : vypln;
    g.fillRect(bx, by, 1, 1);
  }
  if (obrazkyCisel.size > 400) obrazkyCisel.clear();
  obrazkyCisel.set(klic, obr);
  return obr;
}

// Velikost pixelu písma podle menší strany obrazovky: na mobilu 3, v 720p 4, ve Full HD 5 a víc.
export function pixelCisel(sirka, vyska) {
  return Math.max(3, Math.round(Math.min(sirka, vyska) / 200));
}

// Štít (pasiva nebo trvalá Bublina): hotová bublina kolem hrdiny mírně pulzuje a má odlesk, při dobíjení je kolem tenký oblouk, kolik
// už je dobito, a prasklá bublina se ještě chvíli rozbíhá a bledne.
const POLOMER_BUBLINY = 17;
function stitHrdiny(ctx, hra, stred) {
  const { hrdina } = hra;
  const stit = maStit(hra);
  if (!stit && !(hra.prasklStit > 0)) return;
  const kruh = (r, barva, sirkaCary, od = 0, kam = Math.PI * 2) => {
    ctx.strokeStyle = barva;
    ctx.lineWidth = sirkaCary;
    ctx.beginPath();
    ctx.arc(stred.x, stred.y, r, od, kam);
    ctx.stroke();
  };
  ctx.save();
  if (stit && hrdina.stitHotov) {
    const r = POLOMER_BUBLINY + Math.sin(hra.cas * 4);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#7fd8ff';
    ctx.beginPath();
    ctx.arc(stred.x, stred.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    kruh(r, '#0b0a0f', 4);
    ctx.globalAlpha = 0.9;
    kruh(r, '#b8fff5', 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(stred.x - r * 0.6), Math.round(stred.y - r * 0.7), 4, 2);
    ctx.fillRect(Math.round(stred.x - r * 0.75), Math.round(stred.y - r * 0.5), 2, 3);
  } else if (stit && hrdina.dobitiStitu > 0) {
    const dobiti = dobitiStitu(hra);
    const podil = Math.max(0, Math.min(1, 1 - hrdina.doStitu / dobiti));
    ctx.globalAlpha = 0.4;
    kruh(POLOMER_BUBLINY, '#7fd8ff', 2, -Math.PI / 2, -Math.PI / 2 + podil * Math.PI * 2);
  }
  if (hra.prasklStit > 0) {
    const t = 1 - hra.prasklStit / TRVANI_PRASKNUTI;
    ctx.globalAlpha = 1 - t;
    kruh(POLOMER_BUBLINY + t * 26, '#dfe8ff', 3);
  }
  ctx.restore();
}

// Upíří zub: kapka krve letí od padlého nepřítele ke hrdinovi po mírném oblouku (míří za ním, i když běží).
function kapkyKrve(ctx, hra, naObrazovce, stred) {
  for (const k of hra.kapky ?? []) {
    const t = Math.max(0, Math.min(1, 1 - k.zivot / LET_KAPKY));
    const od = naObrazovce({ x: k.odX, y: k.odY });
    const x = Math.round(od.x + (stred.x - od.x) * t - MERITKO / 2);
    const y = Math.round(od.y + (stred.y - od.y) * t - Math.sin(t * Math.PI) * 18 - MERITKO / 2);
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(x - 1, y - 1, MERITKO + 2, MERITKO + 3);
    ctx.fillStyle = '#e5484d';
    ctx.fillRect(x, y, MERITKO, MERITKO + 1);
    ctx.fillStyle = '#ffc2c2';
    ctx.fillRect(x, y, 1, 1);
  }
}

// Trnová zbroj vrátila ránu: z hrdiny na chvíli vyrazí kruh trnů a zase zalezou.
function ostnyHrdiny(ctx, hra, stred) {
  if (!(hra.ostny > 0)) return;
  const t = 1 - hra.ostny / TRVANI_OSTNU;
  const delka = 4 + Math.sin(t * Math.PI) * 14;
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const uhel = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const ux = Math.cos(uhel);
    const uy = Math.sin(uhel);
    const r = 11;
    ctx.beginPath();
    ctx.moveTo(stred.x + ux * r - uy * 3.5, stred.y + uy * r + ux * 3.5);
    ctx.lineTo(stred.x + ux * (r + delka), stred.y + uy * (r + delka));
    ctx.lineTo(stred.x + ux * r + uy * 3.5, stred.y + uy * r - ux * 3.5);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#5fae4e' : '#a07e5c';
    ctx.strokeStyle = '#0b0a0f';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function cisloNadHlavou(ctx, c, p, pixel) {
  const vek = c.trvani - c.zivot;
  const t = Math.min(1, vek / c.trvani);
  const poskok = vek - c.pridano < POSKOK_CISLA ? 1.3 : 1;
  const velikost = Math.max(1, Math.round(pixel * (VELIKOST_CISEL[c.barva] ?? 1) * poskok));
  const obr = obrazekCisla(barvoslepy() && ZNACKY_CISEL[c.barva] ? `${c.text}${ZNACKY_CISEL[c.barva]}` : c.text, c.barva ?? 'zasah');
  const x = p.x + c.smer * pixel * 3 * t;
  const y = p.y - pixel * VYSKOK_CISLA * (1 - (1 - t) ** 2);
  ctx.globalAlpha = Math.max(0, Math.min(1, c.zivot / UNIK_CISLA));
  ctx.drawImage(obr, Math.round(x - (obr.width * velikost) / 2), Math.round(y - obr.height * velikost), obr.width * velikost, obr.height * velikost);
}

// Čísla nad hlavami: nejdřív zásahy nepřátel, navrch to, co se týká hrdiny.
function cislaNadHlavami(ctx, hra, naObrazovce, pixel, poskozeni) {
  const vidim = (c) => poskozeni || !POSKOZENI.has(c.barva ?? null);
  ctx.save();
  for (const c of hra.cisla) if (!NAD_HRDINOU.has(c.barva) && vidim(c)) cisloNadHlavou(ctx, c, naObrazovce(c), pixel);
  for (const c of hra.cisla) if (NAD_HRDINOU.has(c.barva) && vidim(c)) cisloNadHlavou(ctx, c, naObrazovce(c), pixel);
  ctx.restore();
}

// Truhla bosse na zemi: pod ní pulzuje kruh v barvě bosse, nad ní stoupá slabý sloup světla a jednou za chvíli
// poskočí, ať ji hráč na louce najde.
function truhlaNaZemi(ctx, pr, p, cas) {
  const barva = (BARVY_BOSSU[pr.od] ?? BARVY_BOSSU.strazce).pruh;
  const obr = sprity[`truhla_${pr.od}`] ?? sprity.truhla;
  const pulz = (cas % 1.2) / 1.2;
  ctx.save();
  ctx.globalAlpha = 0.5 * (1 - pulz);
  ctx.fillStyle = barva;
  kruhNaZemi(ctx, p.x, p.y + 10, 14 + 22 * pulz);
  ctx.globalAlpha = 0.12;
  ctx.fillRect(Math.round(p.x) - 9, Math.round(p.y) - 70, 18, 70);
  ctx.globalAlpha = 0.18;
  ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 90, 6, 90);
  ctx.restore();
  const faze = (cas + pr.x * 0.01) % SKOK_TRUHLY;
  const skok = faze < 0.25 ? Math.round(Math.sin((faze / 0.25) * Math.PI) * 6) : 0;
  sprite(ctx, obr, p.x, p.y - skok);
}

// Zamčená truhla na zemi: pod ní slabě pulzuje zlatá záře. Když u ní hrdina stojí, nad ní je, čím se otevře
// (klíč nebo cena), a když nemá čím, cena zčervená.
function zamcenaNaZemi(ctx, z, p, hra) {
  const pulz = (hra.cas % 1.6) / 1.6;
  ctx.save();
  ctx.globalAlpha = 0.35 * (1 - pulz);
  ctx.fillStyle = '#f2c94c';
  kruhNaZemi(ctx, p.x, p.y + 8, 10 + 18 * pulz);
  ctx.restore();
  celySprite(ctx, sprity.zamcena, p.x, p.y);
  if (!z.blizko) return;
  const muze = hra.klice > 0 || hra.zlataky >= CENA_ZAMCENE;
  const text = hra.klice > 0 ? preklad('kresleni.otevreKlic') : muze ? preklad('kresleni.otevrit', { n: CENA_ZAMCENE }) : preklad('kresleni.zamceno', { n: CENA_ZAMCENE });
  ctx.save();
  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  napis(ctx, text, p.x, Math.round(p.y - POLOMER_ZAMCENE - 12), muze ? '#ffe08a' : '#f08a8d');
  ctx.restore();
}

// Vůz kupce: pod ním pulzuje zlatý kruh (kam dojít pro obchod), nad ním nápis a pruh, kolik času kupci zbývá.
// Posledních pár sekund vůz bliká, že odjíždí.
function vuzKupce(ctx, k, p, cas) {
  const pulz = (cas % 1.2) / 1.2;
  ctx.save();
  ctx.globalAlpha = 0.45 * (1 - pulz);
  ctx.fillStyle = '#f2c94c';
  kruhNaZemi(ctx, p.x, p.y + 12, KUPEC.dosah + 12 * pulz);
  ctx.globalAlpha = 0.12;
  ctx.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 110, 8, 90);
  ctx.restore();
  if (k.zbyva < 5 && Math.floor(cas * 6) % 2) ctx.globalAlpha = 0.5;
  celySprite(ctx, sprity.vuz, p.x, p.y);
  ctx.globalAlpha = 1;
  const sirka = 48;
  const y = Math.round(p.y - 32);
  const x = Math.round(p.x - sirka / 2);
  ctx.fillStyle = '#0b0a0f';
  ctx.fillRect(x - 2, y - 2, sirka + 4, 8);
  ctx.fillStyle = '#4a3530';
  ctx.fillRect(x, y, sirka, 4);
  ctx.fillStyle = '#e9c46a';
  ctx.fillRect(x, y, Math.round((sirka * Math.max(0, k.zbyva)) / KUPEC.trvani), 4);
  ctx.save();
  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  napis(ctx, 'KUPEC', p.x, y - 6, '#ffe08a');
  ctx.restore();
}

// Šipka na okraji obrazovky k věci mimo ni: ikona a malý hrot ve směru věci. r = jak daleko od středu.
function sipkaKOkraji(ctx, p, sirka, vyska, obr, barva, odsazeni, velikost = 24) {
  const uhel = Math.atan2(p.y - vyska / 2, p.x - sirka / 2);
  const r = Math.min(sirka, vyska) / 2 - odsazeni;
  const x = Math.round(sirka / 2 + Math.cos(uhel) * r);
  const y = Math.round(vyska / 2 + Math.sin(uhel) * r);
  const w = Math.round((velikost * obr.width) / Math.max(obr.width, obr.height));
  const h = Math.round((velikost * obr.height) / Math.max(obr.width, obr.height));
  ctx.save();
  ctx.translate(x, y);
  ctx.drawImage(obr, -Math.round(w / 2), -Math.round(h / 2), w, h);
  ctx.rotate(uhel);
  ctx.fillStyle = barva;
  ctx.fillRect(Math.round(velikost / 2) + 4, -3, 6, 6);
  ctx.fillRect(Math.round(velikost / 2) + 10, -1, 3, 2);
  ctx.restore();
  return { x, y };
}

// Jméno kusu z truhly: pixelové písmo oken (pismo.js) v barvách rarity na tmavé dřevěné cedulce se zkosenými
// rohy, světlou horní hranou a spodní lištou v barvě rarity. Nápis se kreslí jen jednou (podle jména a rarity).
const CEDULKY = new Map();
const PIXEL_CEDULKY = 2;
function cedulkaKusu(nazev, barvy, znak = null) {
  const klic = `${nazev}|${barvy.c}|${znak}`;
  if (CEDULKY.has(klic)) return CEDULKY.get(klic);
  const styl = { ...STYL_PERGAMEN, barvy: ['#fffaf0', barvy.svetla, barvy.svetla, barvy.svetla, barvy.svetla, barvy.svetla, barvy.c], barvaHloubky: '#2a170b' };
  const text = nakresliText(document.createElement('canvas'), nazev.toLocaleUpperCase('cs'), styl);
  const k = PIXEL_CEDULKY;
  // pro barvoslepé značka rarity před jménem (9×9 pixelů cedulky)
  const obrZnaku = znak ? znakRarity(znak, k) : null;
  const odsazeni = obrZnaku ? 13 * k : 0;
  const w = text.width * k + 16 * k + odsazeni;
  const h = Math.max(text.height, 9) * k + 8 * k;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const obdelnik = (barva, x, y, sw, sh) => { g.fillStyle = barva; g.fillRect(x, y, sw, sh); };
  // obrys bez rohů, deska, světlá hrana nahoře, lišta rarity dole
  obdelnik('#140c08', k, 0, w - 2 * k, h);
  obdelnik('#140c08', 0, k, w, h - 2 * k);
  obdelnik('#2b1c12', k, k, w - 2 * k, h - 2 * k);
  obdelnik('#5a3a22', k, k, w - 2 * k, k);
  obdelnik(barvy.c, k, h - 3 * k, w - 2 * k, 2 * k);
  if (obrZnaku) g.drawImage(obrZnaku, 7 * k, Math.round((h - 2 * k - obrZnaku.height) / 2));
  g.drawImage(text, 8 * k + odsazeni, 3 * k, text.width * k, text.height * k);
  CEDULKY.set(klic, c);
  return c;
}

// Otevírání truhly (svět stojí): okolí ztmavne do teplé hnědé, truhla se zatřese a otevře, z ní vyrazí paprsky
// v barvě rarity kusu (u Božské každý jiného odstínu, duha se pomalu otáčí; v režimu pro barvoslepé barvou
// palety), kus vystoupá nad ni a nad ním se objeví cedulka s jeho jménem.
function otevirani(ctx, hra, naObrazovce, sirka, vyska) {
  const o = hra.otevira;
  const t = Math.min(1, o.cas / TRVANI_OTEVRENI);
  const p = naObrazovce(o);
  const barvy = barvoslepy() ? barvyRarity(o.kus.rarita) : BARVY_RARIT[o.kus.rarita] ?? BARVY_RARIT.bezna;
  ctx.save();
  ctx.fillStyle = `rgba(20,12,8,${(0.5 * Math.min(1, t * 4)).toFixed(3)})`;
  ctx.fillRect(0, 0, sirka, vyska);
  const otevrena = t >= TRESENI_TRUHLY;
  const x = Math.round(p.x + (otevrena ? 0 : (Math.floor(o.cas * 40) % 2 ? 2 : -2)));
  const y = Math.round(p.y);
  if (otevrena) {
    // paprsky: osm světlých klínů z truhly, pomalu se točí a rostou
    const u = (t - TRESENI_TRUHLY) / (1 - TRESENI_TRUHLY);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = barvy.c;
    ctx.globalAlpha = 0.35;
    const duha = o.kus.rarita === 'bozska' && !barvoslepy();
    for (let i = 0; i < 8; i++) {
      if (duha) ctx.fillStyle = `hsl(${Math.round((i * 45 + o.cas * 90) % 360)}, 85%, 74%)`;
      const uhel = (i / 8) * Math.PI * 2 + o.cas * 0.8;
      const delka = 40 + 90 * u;
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x + Math.cos(uhel - 0.09) * delka, y - 6 + Math.sin(uhel - 0.09) * delka);
      ctx.lineTo(x + Math.cos(uhel + 0.09) * delka, y - 6 + Math.sin(uhel + 0.09) * delka);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = barvy.svetla;
    kruhNaZemi(ctx, x, y - 6, 10 + 14 * u, true);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  sprite(ctx, sprity[`truhla_${o.od}${otevrena ? '_otevrena' : ''}`] ?? sprity.truhla, x, y);
  if (otevrena) {
    const u = Math.min(1, (t - TRESENI_TRUHLY) / 0.45);
    const vystup = Math.round(VYSTUP_KUSU * (1 - (1 - u) ** 3));
    const obr = sprity[o.kus.id];
    const velikost = obr.width * (MERITKO + 1);
    // jiskry kolem stoupajícího kusu
    ctx.fillStyle = barvy.svetla;
    for (let i = 0; i < 10; i++) {
      const uhel = (i / 10) * Math.PI * 2 + o.cas * 3;
      const r = 20 + 10 * Math.sin(o.cas * 6 + i);
      ctx.fillRect(Math.round(x + Math.cos(uhel) * r) - 1, Math.round(y - vystup + Math.sin(uhel) * r * 0.6) - 1, 3, 3);
    }
    if (obr) sprite(ctx, obr, x, y - vystup, 1, null, velikost);
    if (u >= 1) {
      // cedulka nad kusem, na úzké obrazovce posunutá tak, aby nepřečnívala
      const cedulka = cedulkaKusu(o.kus.nazev, barvy, barvoslepy() ? ZNAKY_RARIT[o.kus.rarita] ?? ZNAKY_RARIT.bezna : null);
      const cx = Math.max(4, Math.min(sirka - cedulka.width - 4, Math.round(x - cedulka.width / 2)));
      ctx.drawImage(cedulka, cx, Math.round(y - vystup - velikost / 2 - 10 - cedulka.height));
    }
  }
  ctx.restore();
}

// Rázové vlny z výbavy Strážce: zlatobílý prstenec (bossova vlna je oranžová a zraňuje hrdinu, tahle pomáhá).
function vlnyHrdiny(ctx, hra, naObrazovce) {
  for (const v of hra.vlnyHrdiny ?? []) {
    const p = naObrazovce(v);
    const t = v.r / v.max;
    ctx.save();
    ctx.globalAlpha = 1 - t * t * 0.8;
    ctx.fillStyle = '#c4862f';
    kruhNaZemi(ctx, p.x, p.y, Math.max(3, v.r - 3));
    ctx.fillStyle = '#ffe08a';
    kruhNaZemi(ctx, p.x, p.y, v.r);
    ctx.fillStyle = '#fff8e0';
    kruhNaZemi(ctx, p.x, p.y, v.r + 3);
    ctx.restore();
  }
}

// Text se stínem pod sebou (jako nápisy při příchodu), stín v barvě obrysu kitu.
function napis(ctx, text, x, y, barva) {
  ctx.fillStyle = '#140c08';
  ctx.fillText(text, x + 1, y + 2);
  ctx.fillStyle = barva;
  ctx.fillText(text, x, y);
}

// Nápis pixelovým písmem oken (pismo.js): nakreslí se jednou a schová (podle textu a stylu, nejvýš 80 různých).
// Vrátí plátno a celý násobek pixelu, který se vejde do šířky (nejvýš max). Když písmo nemá některý znak nebo by
// nápis nešel aspoň ve dvojnásobku, vrátí null a kreslí se obyčejným písmem jako dřív.
const PIXELOVE_NAPISY = new Map();
function pixelovyNapis(text, styl, sirka, max = 3) {
  const velke = text.toLocaleUpperCase('cs');
  if ([...velke].some((z) => !PISMO_NADPISU[z])) return null;
  const klic = `${velke}|${styl.barvy.join()}`;
  let platno = PIXELOVE_NAPISY.get(klic);
  if (!platno) {
    platno = nakresliText(document.createElement('canvas'), velke, styl);
    PIXELOVE_NAPISY.set(klic, platno);
    if (PIXELOVE_NAPISY.size > 80) PIXELOVE_NAPISY.delete(PIXELOVE_NAPISY.keys().next().value);
  }
  const k = Math.min(max, Math.floor(sirka / platno.width));
  return k >= 2 ? { platno, k, w: platno.width * k, h: platno.height * k } : null;
}

// Jméno bosse nad pruhem: pixelové písmo v barvě bosse s hloubkou v jeho tmavé barvě.
const stylBosse = (barvy) => ({ ...STYL_NADPISU, barvy: ['#fffaf0', barvy.text, barvy.text, barvy.text, barvy.text, barvy.text, barvy.pruh], barvaHloubky: barvy.tmava });

// Velký pruh bosse: vlevo portrét se spritem v rámečku barvy bosse s mosaznými nýty v rozích, nad pruhem jméno
// (na širší obrazovce pixelovým písmem v barvě bosse) a životy, pruh zapuštěný s dílky po desetinách.
function bossBar(ctx, bar, x, y, sirka, cas) {
  const barvy = BARVY_BOSSU[bar.druh] ?? BARVY_BOSSU.strazce;
  // portrét: tmavý obrys, rámeček v barvě bosse, uvnitř zapuštěné dřevo a sprite dvakrát zvětšený
  ctx.fillStyle = '#140c08';
  ctx.fillRect(x, y, PORTRET, PORTRET);
  ctx.fillStyle = barvy.tmava;
  ctx.fillRect(x + 2, y + 2, PORTRET - 4, PORTRET - 4);
  ctx.fillStyle = '#1f140d';
  ctx.fillRect(x + 4, y + 4, PORTRET - 8, PORTRET - 8);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x + 4, y + 4, PORTRET - 8, 3);
  ctx.fillStyle = '#e9c46a';
  for (const [nx, ny] of [[2, 2], [PORTRET - 4, 2], [2, PORTRET - 4], [PORTRET - 4, PORTRET - 4]]) ctx.fillRect(x + nx, y + ny, 2, 2);
  const obr = sprity[bar.druh] ?? sprity.strazce;
  const v = Math.min(PORTRET - 6, obr.width * 2);
  ctx.drawImage(obr, Math.round(x + (PORTRET - v) / 2), Math.round(y + (PORTRET - v) / 2), v, v);

  const px = x + PORTRET + 8;
  const ps = sirka - PORTRET - 8;
  const nazev = bar.nazev.toUpperCase();
  const zuri = bar.nepritel?.zuri && Math.floor(cas * 3) % 2 === 0;
  // pixelové jméno jen tam, kde se vejde i se ZUŘÍ a životy (na telefonu obyčejné písmo)
  const pixel = ps >= 420 ? pixelovyNapis(nazev, stylBosse(barvy), ps, 2) : null;
  if (pixel) {
    ctx.drawImage(pixel.platno, px, y + 15 - pixel.h, pixel.w, pixel.h);
    const krev = zuri ? pixelovyNapis(preklad('kresleni.zuri'), STYL_KREV, ps, 2) : null;
    if (krev) ctx.drawImage(krev.platno, px + pixel.w + 8, y + 15 - krev.h, krev.w, krev.h);
  } else {
    ctx.font = 'bold 14px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    napis(ctx, nazev, px, y + 13, barvy.text);
    if (zuri) napis(ctx, preklad('kresleni.zuri').toLocaleUpperCase('cs'), px + ctx.measureText(nazev).width + 10, y + 13, '#ff5a5a');
  }
  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  napis(ctx, `${Math.ceil(bar.hp)} / ${bar.maxHp}`, x + sirka, y + 13, '#f3e6c8');

  const py = y + 20;
  const pv = 18;
  ctx.fillStyle = '#140c08';
  ctx.fillRect(px, py, ps, pv);
  ctx.fillStyle = barvy.tmava;
  ctx.fillRect(px + 2, py + 2, ps - 4, pv - 4);
  ctx.fillStyle = '#1f140d';
  ctx.fillRect(px + 4, py + 4, ps - 8, pv - 8);
  const vnitrek = ps - 8;
  const zbyva = Math.round(vnitrek * Math.max(0, Math.min(1, bar.hp / bar.maxHp)));
  const drzi = Math.round(vnitrek * Math.max(0, Math.min(1, ubytek(bar.nepritel, cas) / bar.maxHp)));
  if (drzi > zbyva) {
    ctx.fillStyle = '#fff1c4';
    ctx.fillRect(px + 4 + zbyva, py + 4, drzi - zbyva, pv - 8);
  }
  ctx.fillStyle = barvy.pruh;
  ctx.fillRect(px + 4, py + 4, zbyva, pv - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(px + 4, py + 4, zbyva, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(px + 4, py + pv - 6, zbyva, 2);
  ctx.fillStyle = 'rgba(20,12,8,0.5)';
  for (let i = 1; i < 10; i++) ctx.fillRect(px + 4 + Math.round((vnitrek * i) / 10), py + 4, 1, pv - 8);
}

// Co kreslič světel (osvetleni.js) potřebuje vědět o snímku. Jeden objekt na celou hru, v každém snímku se jen přepíše.
const POHLED = {
  kx: 0, ky: 0, sirka: 0, vyska: 0, s: null, polomer: 0, dosvit: 0, lucerna: false, lucernaX: 0, lucernaY: 0, zare: null,
};

// nastaveni.cislaPoskozeni = false schová čísla zásahů a ran (léčení a zlaťáky zůstanou). svetla = kreslič světel
// z osvetleni.js (null = tma a ztmavení okrajů jako dřív, bez WebGL).
export function kresli(ctx, hra, { cislaPoskozeni = true, horni = HORNI_BARY, svetla = null } = {}) {
  const { width: sirka, height: vyska } = ctx.canvas;
  const { hrdina } = hra;
  // Po zásahu hrdiny se celý svět krátce otřese, slábne k nule. V pauze a ve volbě stojí.
  const bezi = !hra.pauza && !hra.volby && !hra.konec && !hra.otevira && !hra.porovnani && !hra.obchod;
  const tres = bezi ? (hra.tres / TRVANI_TRESU) * SILA_TRESU : 0;
  const kx = hrdina.x - sirka / 2 + (tres ? Math.round((Math.random() * 2 - 1) * tres) : 0);
  const ky = hrdina.y - vyska / 2 + (tres ? Math.round((Math.random() * 2 - 1) * tres) : 0);
  const naObrazovce = (o) => ({ x: o.x - kx, y: o.y - ky });
  kamera.x = kx;
  kamera.y = ky;
  const s = staty(hra);

  ctx.imageSmoothingEnabled = false;
  const mapa = MAPY[hra.mapa] ?? MAPY[VYCHOZI_MAPA];
  const zare = kresliPodlahu(ctx, hra.mapa ?? VYCHOZI_MAPA, kx, ky, sirka, vyska, undefined, hra.cas);

  const stred = naObrazovce(hrdina);
  const lucerna = hra.zbrane.lucerna ? poziceLucerny(hra, stred) : null;
  if (lucerna) {
    svetloLucerny(ctx, stred.x, stred.y, s.lucerna.dosah, hra.cas);
    // malá záře kolem samotné lucerny
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,170,70,0.12)';
    for (const r of [4, 2]) {
      for (const [b, sirka] of pixelovyKruh(r).radky) ctx.fillRect(lucerna.x - 1 - sirka * MERITKO, lucerna.y - 1 + b * MERITKO, (2 * sirka + 1) * MERITKO, MERITKO);
    }
    ctx.restore();
  }

  // bedny a sudy stojí na zemi pod krystaly, které z nich vypadnou
  for (const b of hra.bedny ?? []) {
    const p = naObrazovce(b);
    if (p.x < -30 || p.y < -30 || p.x > sirka + 30 || p.y > vyska + 30) continue;
    sprite(ctx, sprity[b.druh], p.x, p.y);
  }
  for (const z of hra.zamcene ?? []) {
    const p = naObrazovce(z);
    if (p.x < -40 || p.y < -40 || p.x > sirka + 40 || p.y > vyska + 40) continue;
    zamcenaNaZemi(ctx, z, p, hra);
  }
  if (hra.kupec) {
    const p = naObrazovce(hra.kupec);
    if (p.x > -60 && p.y > -120 && p.x < sirka + 60 && p.y < vyska + 60) vuzKupce(ctx, hra.kupec, p, hra.cas);
  }

  for (const kr of hra.krystaly) {
    const p = naObrazovce(kr);
    ctx.drawImage(sprity.krystal, Math.round(p.x - 10), Math.round(p.y - 10), 20, 20);
  }

  for (const pr of hra.predmety) {
    const p = naObrazovce(pr);
    if (pr.druh === 'truhla') {
      if (p.x > -60 && p.y > -100 && p.x < sirka + 60 && p.y < vyska + 60) truhlaNaZemi(ctx, pr, p, hra.cas);
      continue;
    }
    const houpani = pr.pritahovan ? 0 : Math.sin(hra.cas * 4 + pr.x) * 2;
    // Hromádka zlaťáků z elity: tři mince přes sebe.
    const kde = pr.druh === 'zlatak' && pr.hodnota > 1 ? [[-6, 3], [6, 3], [0, -3]] : [[0, 0]];
    for (const [dx, dy] of kde) ctx.drawImage(sprity[pr.druh], Math.round(p.x - 13 + dx), Math.round(p.y - 13 + dy + houpani), 26, 26);
  }

  for (const b of hra.bubliny ?? []) {
    const p = naObrazovce(b);
    if (p.x < -60 || p.y < -60 || p.x > sirka + 60 || p.y > vyska + 60) continue;
    bublina(ctx, p.x, p.y, b, hra.cas);
  }
  for (const o of hra.oblaky) {
    const p = naObrazovce(o);
    if (p.x < -60 || p.y < -60 || p.x > sirka + 60 || p.y > vyska + 60) continue;
    oblak(ctx, p.x, p.y, o, hra.cas);
  }
  for (const t of hra.trny ?? []) {
    const p = naObrazovce(t);
    if (p.x < -60 || p.y < -60 || p.x > sirka + 60 || p.y > vyska + 60) continue;
    trsTrnu(ctx, t, p.x, p.y);
  }
  for (const z of hra.ledoveZony ?? []) {
    const p = naObrazovce(z);
    if (p.x < -z.polomer - 20 || p.y < -z.polomer - 40 || p.x > sirka + z.polomer + 20 || p.y > vyska + z.polomer + 20) continue;
    ledovaZona(ctx, z, p.x, p.y, hra.cas);
  }
  seminkaNaZemi(ctx, hra, naObrazovce, sirka, vyska);
  plamenyStopy(ctx, hra, naObrazovce, sirka, vyska);
  koreny(ctx, hra, naObrazovce, sirka, vyska);
  utokyNaZemi(ctx, hra, naObrazovce);
  vlnyHrdiny(ctx, hra, naObrazovce);
  vlnyZvonu(ctx, hra, naObrazovce);

  for (const n of hra.nepratele) {
    const p = naObrazovce(n);
    if (p.x < -40 || p.y < -40 || p.x > sirka + 40 || p.y > vyska + 40) continue;
    const obr = sprity[n.druh];
    const velikost = obr.width * (n.elita ? MERITKO_ELITY : MERITKO);
    if (n.duch) {
      // duch se vznáší a kouká tam, kam letí (ne na hrdinu, letí kolem něj)
      ctx.globalAlpha = pruhlednostDucha(n);
      const vy = p.y + Math.sin(hra.cas * 4 + n.maxHp + n.x * 0.01) * 2;
      sprite(ctx, obr, p.x, vy, n.smerX < 0 ? -1 : 1, n.zasazen > 0 ? 'rgba(255,255,255,0.7)' : barvaMrazu(n), velikost);
      if (n.zar > 0) rozzar(ctx, obr, p.x, vy, n.smerX < 0 ? -1 : 1, velikost, n.zar / TRVANI_ZARU);
      ctx.globalAlpha = 1;
      if (n.trny > 0 && !n.skryty) sponaTrnu(ctx, n, p.x, vy, velikost);
      if (n.zapreden > 0 && !n.skryty) sit(ctx, p.x, vy, n.zapreden, velikost * 0.6);
      if (n.omracen > 0 && !n.skryty) hvezdickyOmraceni(ctx, n, p.x, vy, velikost, hra.cas);
      if (n.drzen > 0 && !n.skryty) uponkyKorenu(ctx, n, p.x, vy, velikost);
      if ((n.hori > 0 || n.vOhni) && !n.skryty) plaminkyNaNepriteli(ctx, n, p.x, vy, velikost, hra.cas);
      continue;
    }
    let { x, y } = p;
    const sch = n.schopnost;
    // Boss (i nepřítel se schopností) se při varování třese. Při výpadu za sebou nechává dva bledé obrysy.
    const vznasiSe = n.boss && zakladBosse(n.druh) === 'bludicka';
    if (sch?.faze === 'varovani' && !vznasiSe) x += Math.floor(hra.cas * 30) % 2 ? (n.boss ? 2 : 1) : (n.boss ? -2 : -1);
    if (sch?.id === 'skok') {
      if (sch.faze === 'varovani') {
        // přikrčí se (o pixel spritu níž)
        y += MERITKO;
      } else {
        // letí obloukem nad stínem
        const t = Math.min(1, sch.ulet / sch.s.let);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(Math.round(x - velikost * 0.3), Math.round(y + velikost * 0.36), Math.round(velikost * 0.6), MERITKO);
        y -= Math.round(Math.sin(Math.PI * t) * VYSKA_SKOKU);
      }
    }
    // Koho drží kořeny, ten sebou škube.
    if (n.drzen > 0 && !n.boss) x += Math.floor(hra.cas / CUKANI + n.maxHp) % 2 ? 1 : -1;
    if (sch?.id === 'vypad' && sch.faze === 'provadi') {
      for (const [zpet, pruhlednost] of [[30, 0.2], [15, 0.4]]) {
        ctx.globalAlpha = pruhlednost;
        sprite(ctx, obr, x - sch.ux * zpet, y - sch.uy * zpet, sch.ux < 0 ? -1 : 1, n.boss ? (BARVY_BOSSU[n.druh] ?? BARVY_BOSSU.strazce).pruh : OBRYS_ELITY, velikost);
      }
      ctx.globalAlpha = 1;
    }
    if (vznasiSe) {
      // Bludička se vznáší, mihotá a po přenesení se teprve zhmotní. Při nabíjení kolem ní roste záře.
      y += Math.round(Math.sin(hra.cas * 3) * 3);
      ctx.globalAlpha = (0.82 + 0.18 * Math.sin(hra.cas * 17)) * (1 - n.zjeveni / ZJEVENI_BLUDICKY);
      if (sch?.id === 'vejir' && sch.faze === 'varovani') {
        const t = prubehVarovani(sch);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(${n.druh === 'bludicka' ? '127,156,240' : '127,200,110'},${(0.12 + 0.25 * t).toFixed(3)})`;
        kruhNaZemi(ctx, x, y, 18 + 16 * t, true);
        ctx.restore();
      }
    }
    if (n.vyskok > 0) {
      // skákající žába: stín zůstane na zemi, žába letí obloukem nad ním
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(Math.round(x - velikost * 0.3), Math.round(y + velikost * 0.36), Math.round(velikost * 0.6), MERITKO);
      y -= Math.round(Math.sin(Math.PI * n.vyskok) * 9);
    }
    if (n.elita) obrysElity(ctx, obr, x, y, n.x > hrdina.x ? -1 : 1, velikost, hra.cas);
    const rudne = n.zuri && (hra.cas % PULZ_ZURIVOSTI) < PULZ_ZURIVOSTI / 3;
    const prekryv = n.zasazen > 0 ? 'rgba(255,255,255,0.7)' : rudne ? BARVA_ZURIVOSTI : barvaMrazu(n);
    sprite(ctx, obr, x, y, n.x > hrdina.x ? -1 : 1, prekryv, velikost);
    if (n.zar > 0) rozzar(ctx, obr, x, y, n.x > hrdina.x ? -1 : 1, velikost, n.zar / TRVANI_ZARU);
    ctx.globalAlpha = 1;
    if (n.trny > 0) sponaTrnu(ctx, n, x, y, velikost);
    if (n.zapreden > 0) sit(ctx, x, y, n.zapreden, velikost * 0.6);
    if (n.omracen > 0) hvezdickyOmraceni(ctx, n, x, y, velikost, hra.cas);
    if (n.drzen > 0) uponkyKorenu(ctx, n, x, y, velikost);
    if (n.hori > 0 || n.vOhni) plaminkyNaNepriteli(ctx, n, x, y, velikost, hra.cas);
    if (n.elita && n.hp < n.maxHp) {
      // malý pruh životů nad zraněnou elitou
      const nad = Math.round(y - velikost / 2 - 5);
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(Math.round(x - 15), nad - 1, 30, 5);
      ctx.fillStyle = OBRYS_ELITY;
      ctx.fillRect(Math.round(x - 14), nad, Math.round(28 * Math.max(0, n.hp) / n.maxHp), 3);
    }
    if (n.boss) {
      const nad = Math.round(y - velikost / 2 - 7);
      ctx.fillStyle = '#0b0a0f';
      ctx.fillRect(Math.round(x - 25), nad - 1, 50, 7);
      ctx.fillStyle = '#2a0f14';
      ctx.fillRect(Math.round(x - 24), nad, 48, 5);
      ctx.fillStyle = (BARVY_BOSSU[n.druh] ?? BARVY_BOSSU.strazce).pruh;
      ctx.fillRect(Math.round(x - 24), nad, Math.round(48 * Math.max(0, n.hp) / n.maxHp), 5);
      if (sch?.faze === 'varovani') vykricnik(ctx, x, nad - 32, (BARVY_BOSSU[n.druh] ?? BARVY_BOSSU.strazce).pruh, hra.cas);
    }
  }

  // úlomky zabitých nepřátel: čtvereček o velikosti pixelu spritu s tmavým obrysem
  for (const c of hra.castice) {
    const p = naObrazovce(c);
    if (p.x < -10 || p.y < -10 || p.x > sirka + 10 || p.y > vyska + 10) continue;
    const barvy = BARVY_CASTIC[c.druh] ?? BARVY_CASTIC.netopyr;
    const x = Math.round(p.x - MERITKO / 2);
    const y = Math.round(p.y - MERITKO / 2);
    ctx.globalAlpha = Math.min(1, c.zivot * 5);
    ctx.fillStyle = '#0b0a0f';
    ctx.fillRect(x - 1, y - 1, MERITKO + 2, MERITKO + 2);
    ctx.fillStyle = barvy[c.odstin % barvy.length];
    ctx.fillRect(x, y, MERITKO, MERITKO);
  }
  ctx.globalAlpha = 1;

  utokyVeVzduchu(ctx, hra, naObrazovce);
  krystalyVeVzduchu(ctx, hra, naObrazovce);
  vybuchySeminek(ctx, hra, naObrazovce);
  kamenyPraku(ctx, hra, naObrazovce);

  // Jiskry: čtvereček 1,5× tak velký, kam až zasáhnou (s Rozpětím větší).
  ctx.fillStyle = '#ffd27a';
  for (const st of hra.strely) {
    const p = naObrazovce(st);
    const v = Math.max(6, Math.round((st.velikost ?? 4) * 1.5));
    ctx.fillRect(Math.round(p.x - v / 2), Math.round(p.y - v / 2), v, v);
  }

  // blesky: lomená čára mezi zasaženými, náhodné zuby se mění každý snímek
  for (const bl of hra.blesky) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, bl.zivot / 0.18);
    for (const [barva, sirkaCary] of [['rgba(143,211,255,0.5)', 6], ['#e8f7ff', 2]]) {
      ctx.strokeStyle = barva;
      ctx.lineWidth = sirkaCary;
      ctx.beginPath();
      bl.body.forEach((bod, i) => {
        const p = naObrazovce(bod);
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
          return;
        }
        const pred = naObrazovce(bl.body[i - 1]);
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          ctx.lineTo(pred.x + (p.x - pred.x) * t + (Math.random() - 0.5) * 14, pred.y + (p.y - pred.y) * t + (Math.random() - 0.5) * 14);
        }
        ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  if (hra.zbrane.krumpace) {
    for (let i = 0; i < s.krumpace.pocet; i++) {
      const uhel = hra.uhelKrumpacu + (i / s.krumpace.pocet) * Math.PI * 2;
      ctx.save();
      ctx.translate(stred.x + Math.cos(uhel) * s.krumpace.polomer, stred.y + Math.sin(uhel) * s.krumpace.polomer);
      ctx.rotate(uhel * 2);
      // S Rozpětím sahá krumpáč dál, a tak je i větší (celé násobky pixelu, ať zůstane ostrý).
      const m = Math.max(MERITKO, Math.round((MERITKO * s.krumpace.velikost) / 10));
      const v = sprity.krumpac.width * m;
      ctx.drawImage(sprity.krumpac, -v / 2, -v / 2, v, v);
      ctx.restore();
    }
  }
  if (hra.zbrane.zrcadlo) zrcadlaHrdiny(ctx, hra, s, stred);
  if (hra.zbrane.lucerna && s.lucerna.uhliky > 0) uhlikyLucerny(ctx, hra, s, naObrazovce);
  dozvuky(ctx, hra, naObrazovce);
  for (const o of hra.odlesky ?? []) {
    const p = naObrazovce(o);
    odlesk(ctx, p.x, p.y, o);
  }

  // Oživení: od hrdiny se rozběhne modrobílý kruh duší a bledne.
  if (hra.zablesk > 0) {
    const t = 1 - hra.zablesk / TRVANI_ZABLESKU;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    for (const [barva, sirkaCary] of [['rgba(127,156,240,0.6)', 8], ['#dfe8ff', 3]]) {
      ctx.strokeStyle = barva;
      ctx.lineWidth = sirkaCary;
      ctx.beginPath();
      ctx.arc(stred.x, stred.y, 16 + t * ODHOZENI_PRI_OZIVENI, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Bomba: od hrdiny se přes celou obrazovku rozběhne ohnivý kruh a všechno krátce zbělá.
  if (hra.vybuch > 0) {
    const t = 1 - hra.vybuch / TRVANI_VYBUCHU;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = 'rgba(255,240,200,0.35)';
    ctx.fillRect(0, 0, sirka, vyska);
    for (const [barva, sirkaCary] of [['rgba(255,140,50,0.55)', 14], ['#fff3b0', 4]]) {
      ctx.strokeStyle = barva;
      ctx.lineWidth = sirkaCary;
      ctx.beginPath();
      ctx.arc(stred.x, stred.y, 20 + t * Math.hypot(sirka, vyska) / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  obkliceniHrdiny(ctx, hra, stred);
  svetluskyRoje(ctx, hra, naObrazovce, false);
  if (hra.zbrane.cep) cepHrdiny(ctx, hra, s, stred, naObrazovce);
  ostnyHrdiny(ctx, hra, stred);
  kresliPeta(ctx, hra, naObrazovce, stred);
  // Zmizelý hrdina (Bludný plamen) nebliká, je průsvitný a modře se mihotá.
  const zmizel = hrdina.neviditelny > 0;
  const blika = !zmizel && hrdina.nezranitelny > 0 && Math.floor(hrdina.nezranitelny * 20) % 2 === 0;
  const obrHrdiny = sprity[hra.trida] ?? sprity[VYCHOZI_TRIDA];
  if (zmizel) ctx.globalAlpha = 0.45 + 0.12 * Math.sin(hra.cas * 18);
  if (!blika) sprite(ctx, obrHrdiny, stred.x, stred.y, hrdina.otoceny, zmizel ? 'rgba(127,156,240,0.55)' : hrdina.sit > 0 ? 'rgba(215,222,236,0.5)' : null);
  ctx.globalAlpha = 1;
  if (lucerna && !blika) {
    // plamen v lucerně nepravidelně poskakuje (dva snímky)
    const obr = (Math.floor(hra.cas * 7) * 5) % 3 === 0 ? sprity.lucernaHrdiny2 : sprity.lucernaHrdiny;
    ctx.drawImage(obr, lucerna.x - Math.round(obr.width * MERITKO / 2), lucerna.y - Math.round(obr.height * MERITKO / 2), obr.width * MERITKO, obr.height * MERITKO);
  }
  if (hrdina.sit > 0) sit(ctx, stred.x, stred.y, hrdina.sit);
  stitHrdiny(ctx, hra, stred);
  kapkyKrve(ctx, hra, naObrazovce, stred);
  svetluskyRoje(ctx, hra, naObrazovce, true);
  if (hra.zbrane.zvon) zvonNadHrdinou(ctx, hra, stred);

  // životy pod hrdinou
  ctx.fillStyle = '#2a0f14';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 18), 28, 4);
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 18), Math.round(28 * Math.max(0, hrdina.hp) / hrdina.maxHp), 4);

  if (mapa.snezeni) snezeni(ctx, mapa.snezeni, kx, ky, sirka, vyska, hra.cas);
  if (mapa.jiskry) jiskry(ctx, mapa.jiskry, kx, ky, sirka, vyska, hra.cas);
  if (mapa.mlha) mlha(ctx, mapa.mlha, kx, ky, sirka, vyska, hra.cas);
  // Tma jeskyně (a se světly i viněta) je pod šipkami k bossům a kupci, ať jsou pořád vidět. Se světly (WebGL)
  // svítí hrdina, lucerna, krystaly, oheň, výbuchy a schopnosti bossů. Když kreslič světel není nebo nejde,
  // kreslí se tma jako dřív.
  let osvetleno = false;
  if (svetla) {
    POHLED.kx = kx;
    POHLED.ky = ky;
    POHLED.sirka = sirka;
    POHLED.vyska = vyska;
    POHLED.s = s;
    POHLED.zare = zare;
    POHLED.polomer = mapa.tma ? mapa.tma.svetlo : 0;
    POHLED.dosvit = lucerna ? polomerSvetla(hra, s) : 0;
    POHLED.lucerna = Boolean(lucerna);
    POHLED.lucernaX = lucerna ? lucerna.x : 0;
    POHLED.lucernaY = lucerna ? lucerna.y : 0;
    osvetleno = svetla.kresli(ctx, hra, POHLED);
  }
  if (osvetleno) {
    if (mapa.tma) zareVeTme(ctx, zare, hra);
  } else if (mapa.tma) {
    tmaKolem(ctx, mapa.tma, stred.x, stred.y, polomerSvetla(hra, s), hra.cas);
    svetlaVeTme(ctx, zare, hra, naObrazovce);
  }

  // šipka k bossovi, když je mimo obrazovku
  for (const n of hra.nepratele) {
    if (!n.boss) continue;
    const p = naObrazovce(n);
    if (p.x > 0 && p.y > 0 && p.x < sirka && p.y < vyska) continue;
    const uhel = Math.atan2(p.y - vyska / 2, p.x - sirka / 2);
    const r = Math.min(sirka, vyska) / 2 - 40;
    ctx.save();
    ctx.translate(sirka / 2 + Math.cos(uhel) * r, vyska / 2 + Math.sin(uhel) * r);
    ctx.rotate(uhel);
    ctx.fillStyle = (BARVY_BOSSU[n.druh] ?? BARVY_BOSSU.strazce).pruh;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // malá šipka k truhle bosse, která zůstala mimo obrazovku (v barvě bosse, s tečkou místo hrotu)
  for (const pr of hra.predmety) {
    if (pr.druh !== 'truhla') continue;
    const p = naObrazovce(pr);
    if (p.x > 0 && p.y > 0 && p.x < sirka && p.y < vyska) continue;
    const uhel = Math.atan2(p.y - vyska / 2, p.x - sirka / 2);
    const r = Math.min(sirka, vyska) / 2 - 64;
    ctx.save();
    ctx.translate(Math.round(sirka / 2 + Math.cos(uhel) * r), Math.round(vyska / 2 + Math.sin(uhel) * r));
    ctx.drawImage(sprity[`truhla_${pr.od}`] ?? sprity.truhla, -12, -12, 24, 24);
    ctx.rotate(uhel);
    ctx.fillStyle = (BARVY_BOSSU[pr.od] ?? BARVY_BOSSU.strazce).pruh;
    ctx.fillRect(16, -3, 6, 6);
    ctx.fillRect(22, -1, 3, 2);
    ctx.restore();
  }

  // zamčené truhly mimo obrazovku: malá průsvitná ikona na okraji
  for (const z of hra.zamcene ?? []) {
    const p = naObrazovce(z);
    if (p.x > 0 && p.y > 0 && p.x < sirka && p.y < vyska) continue;
    ctx.save();
    ctx.globalAlpha = 0.7;
    sipkaKOkraji(ctx, p, sirka, vyska, sprity.zamcena, '#c9ccd2', 64, 20);
    ctx.restore();
  }
  // kupec mimo obrazovku: zlatá šipka s vozem a s tím, kolik sekund ještě zůstane
  if (hra.kupec) {
    const p = naObrazovce(hra.kupec);
    if (!(p.x > 0 && p.y > 0 && p.x < sirka && p.y < vyska)) {
      const kde = sipkaKOkraji(ctx, p, sirka, vyska, sprity.vuz, '#f2c94c', 52, 40);
      ctx.save();
      ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      napis(ctx, preklad('kresleni.sekundy', { n: Math.ceil(hra.kupec.zbyva) }), kde.x, kde.y + 28, hra.kupec.zbyva < 10 ? '#f08a8d' : '#ffe08a');
      ctx.restore();
    }
  }

  if (hra.otevira) otevirani(ctx, hra, naObrazovce, sirka, vyska);

  // ztmavení u okrajů (barva podle mapy), ať je hrdina uprostřed vidět nejlíp (se světly je to viněta v nich)
  if (!osvetleno) {
    const tma = ctx.createRadialGradient(sirka / 2, vyska / 2, Math.min(sirka, vyska) * 0.4, sirka / 2, vyska / 2, Math.max(sirka, vyska) * 0.8);
    tma.addColorStop(0, 'rgba(0,0,0,0)');
    tma.addColorStop(1, mapa.okraje ?? 'rgba(0,0,0,0.45)');
    ctx.fillStyle = tma;
    ctx.fillRect(0, 0, sirka, vyska);
  }

  // čísla až nad ztmavením, ať jsou čitelná i u okraje
  cislaNadHlavami(ctx, hra, naObrazovce, pixelCisel(sirka, vyska), cislaPoskozeni);

  // pruhy bossů nahoře, pod sebou v pořadí, jak přišli
  const bary = bossBary(hra);
  const sirkaBaru = Math.min(640, sirka - 32);
  bary.forEach((bar, i) => bossBar(ctx, bar, Math.round((sirka - sirkaBaru) / 2), horni + i * VYSKA_BARU, sirkaBaru, hra.cas));

  // nápis je pod pruhy bossů, ať je nepřekryje (zlaté pixelové písmo oken, dlouhý nápis na úzké obrazovce
  // obyčejným písmem)
  const yNapisu = Math.max(horni + 14, horni + bary.length * VYSKA_BARU + 26);
  let pod = yNapisu;
  if (hra.oznameni) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, hra.oznameni.zivot);
    const pixel = pixelovyNapis(hra.oznameni.text, STYL_NADPISU, sirka - 24, 3);
    if (pixel) {
      ctx.drawImage(pixel.platno, Math.round((sirka - pixel.w) / 2), yNapisu + 6 - pixel.h, pixel.w, pixel.h);
      pod = yNapisu + 6;
    } else {
      // na úzké obrazovce se písmo zmenší, ať se nápis vejde celý
      ctx.font = 'bold 22px ui-monospace, Menlo, monospace';
      const sirkaNapisu = ctx.measureText(hra.oznameni.text).width;
      if (sirkaNapisu > sirka - 24) ctx.font = `bold ${Math.max(11, Math.floor((22 * (sirka - 24)) / sirkaNapisu))}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#140c08';
      ctx.fillText(hra.oznameni.text, sirka / 2 + 2, yNapisu + 2);
      ctx.fillStyle = '#e9c46a';
      ctx.fillText(hra.oznameni.text, sirka / 2, yNapisu);
    }
    ctx.restore();
  }
  if (hra.hlaseniHrozby) hlaseniHrozby(ctx, hra, sirka, (hra.oznameni ? pod + 34 : yNapisu));
}

// Krátké ohlášení vyšší hrozby: menší rudý nápis pod hlavním (příchod bosse ani nového druhu nepřepíše), krvavým
// pixelovým písmem na tmavé dřevěné liště. Na začátku krátce poskočí a ke konci zprůhlední.
function hlaseniHrozby(ctx, hra, sirka, y) {
  const { text, zivot } = hra.hlaseniHrozby;
  const stari = TRVANI_HLASENI_HROZBY - zivot;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, zivot * 2, stari * 6));
  const yNapisu = Math.round(y - 6 * Math.max(0, 1 - stari * 5));
  const pixel = pixelovyNapis(text, STYL_KREV, sirka - 48, 2);
  if (pixel) {
    // tmavá lišta pod nápisem s obrysem, ať je čitelný i přes nepřátele
    const w = Math.min(sirka, pixel.w + 24);
    const lx = Math.round((sirka - w) / 2);
    const ly = yNapisu - pixel.h + 2;
    ctx.fillStyle = 'rgba(20,12,8,0.85)';
    ctx.fillRect(lx, ly - 4, w, pixel.h + 8);
    ctx.fillStyle = '#5a1f1a';
    ctx.fillRect(lx, ly + pixel.h + 2, w, 2);
    ctx.drawImage(pixel.platno, Math.round((sirka - pixel.w) / 2), ly, pixel.w, pixel.h);
  } else {
    ctx.font = 'bold 16px ui-monospace, Menlo, monospace';
    const sirkaNapisu = ctx.measureText(text).width;
    if (sirkaNapisu > sirka - 24) ctx.font = `bold ${Math.max(10, Math.floor((16 * (sirka - 24)) / sirkaNapisu))}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = 'center';
    const pruh = Math.min(sirka, ctx.measureText(text).width + 24);
    ctx.fillStyle = 'rgba(20,12,8,0.75)';
    ctx.fillRect(Math.round((sirka - pruh) / 2), yNapisu - 17, Math.round(pruh), 24);
    napis(ctx, text, sirka / 2, yNapisu, '#f08a8d');
  }
  ctx.restore();
}

// Pozadí hlavního menu: zvolená mapa pomalu ujíždí, dole přes ni utíká hrdina (zvolená třída) před hloučkem
// nepřátel a nahoře přelétají netopýři. V jeskyni a na hřbitově svítí jen kolem hrdiny, na jezeře sněží, na sopce
// létají jiskry a na hřbitově se plazí mlha.
// Všechno je jen podle času, nic se nepočítá ani neukládá.
const HONICKA = ['vlk', 'netopyr', 'slizak', 'vlk', 'pavouk', 'houbak', 'kostlivec', 'netopyr'];

export function kresliMenu(ctx, cas, postava = VYCHOZI_TRIDA, idMapy = VYCHOZI_MAPA) {
  const { width: sirka, height: vyska } = ctx.canvas;
  const mapa = MAPY[idMapy] ?? MAPY[VYCHOZI_MAPA];
  ctx.imageSmoothingEnabled = false;
  kresliPodlahu(ctx, MAPY[idMapy] ? idMapy : VYCHOZI_MAPA, cas * 12, 0, sirka, vyska, undefined, cas);

  const draha = sirka + 600;
  const hx = ((cas * 64) % draha) - 100;
  const y = vyska * 0.82;
  sprite(ctx, sprity[postava] ?? sprity[VYCHOZI_TRIDA], hx, y + Math.round(Math.sin(cas * 12) * 1.5), 1);
  HONICKA.forEach((druh, i) => {
    const letec = druh === 'netopyr';
    const vlna = Math.sin(cas * (letec ? 9 : 5) + i * 1.7) * (letec ? 6 : 2);
    sprite(ctx, sprity[druh], hx - 70 - i * 42, y + (i % 2 ? -14 : 12) + vlna, 1);
  });
  for (let i = 0; i < 4; i++) {
    const x = sirka + 60 - ((cas * (50 + i * 9) + i * 330) % (sirka + 120));
    sprite(ctx, sprity.netopyr, x, vyska * (0.1 + i * 0.07) + Math.sin(cas * 7 + i) * 8, -1);
  }
  if (mapa.snezeni) snezeni(ctx, mapa.snezeni, cas * 12, 0, sirka, vyska, cas);
  if (mapa.jiskry) jiskry(ctx, mapa.jiskry, cas * 12, 0, sirka, vyska, cas);
  if (mapa.mlha) mlha(ctx, mapa.mlha, cas * 12, 0, sirka, vyska, cas);
  if (mapa.tma) tmaKolem(ctx, { ...mapa.tma, sila: Math.min(mapa.tma.sila, 0.55) }, hx, y, 220, cas);

  // ztmavení do teplé hnědé (barva obrysu rámů), ať jsou logo a deska s tlačítky dobře čitelné a mapa
  // nebije do očí; k okrajům ještě tmavší
  ctx.fillStyle = `rgba(20,12,8,${mapa.menuTma ?? 0.35})`;
  ctx.fillRect(0, 0, sirka, vyska);
  const tma = ctx.createRadialGradient(sirka / 2, vyska / 2, Math.min(sirka, vyska) * 0.3, sirka / 2, vyska / 2, Math.max(sirka, vyska) * 0.75);
  tma.addColorStop(0, 'rgba(20,12,8,0)');
  tma.addColorStop(1, 'rgba(20,12,8,0.6)');
  ctx.fillStyle = tma;
  ctx.fillRect(0, 0, sirka, vyska);
}
