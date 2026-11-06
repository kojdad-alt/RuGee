import { vytvorRng } from './rng.js';
import { novaHra, aktualizuj, vyber, rozhodniKus, TRIDY, kup, odejdiOdKupce, prehod, PORADI_ZBOZI, hrozbaNavic } from './hra.js';
import { kresli, kresliMenu } from './kresleni.js';
import { dusZaHru, DUSE_ZA } from './duse.js';
import {
  vytvorMenu, ovladejTlacitka, vyberTlacitko, formatCas, zvolenaTrida, zvolenaMapa, obrazekSpritu, cislaPoskozeni,
  prepinacNastaveni, prepinacSvetel, ovladaniZvuku, prepniZtlumeni, skupina, ikonaMapy,
} from './menu.js';
import { pixelovyNadpis, prizpusobNadpisy, STYL_KREV } from './pismo.js';
import { zapisVysledek, nactiDuse, pripisDuse, zapisNalez, odemceneMapy, odemkniMapu, nactiPety, pripisVejce } from './ulozeni.js';
import { petDoHry } from './pety.js';
import { MAPY, ODEMKNUTI_MAPY, dalsiMapa } from './mapy.js';
import {
  odemkniZvuk, zvukHry, hudba, zvukStartu, zvukVolby, zvukVyberu, zvukNakupu, zvukOdmitnuti, zvukPrehozeni, zvukBezi, probudZvuk,
} from './zvuk.js';
import { ukazVolby, ukazPorovnani } from './volba.js';
import { ukazObchod, zatresZbozim, textZlataku } from './obchod.js';
import { ukazVybavu } from './vybava.js';
import { registruj as registrujAplikaci, novaVerze, priZmene as priZmeneAplikace } from './aplikace.js';
import { svetlaProSnimek } from './osvetleni.js';
import { t, prelozStranku, priZmeneJazyka } from './texty.js';
import { vytvorCtecku, stavOvladace, nastavOvladac, priZmeneOvladace, vyplnNapovedy, jenOvladac } from './ovladac.js';
import { rezimBarev, priZmeneBarev } from './barvy.js';

const platno = document.getElementById('platno');
const ctx = platno.getContext('2d');
const el = (id) => document.getElementById(id);
const vybava = el('vybava');

const stisknute = new Set();
let hra = null;
let vMenu = true;
let posledni = 0;
// Kdy se otevřelo okno výběru. Chvíli potom se nevybírá, ať klik nebo klávesa z běhu nic nevybere náhodou.
let volbyOd = 0;
let porovnaniOd = 0;
const POJISTKA_VOLBY = 300;
// Kolik kusů výbavy z téhle hry už je zapsaných ve Sbírce (zapisuje se hned po nálezu).
let zapsanoNalezu = 0;
// Kolik vajec peta z téhle hry už je připsaných do profilu (taky hned po sebrání).
let zapsanoVajec = 0;
// Kolik zlaťáků ukazovala horní lišta minule (přibyly = počet poskočí, cinknutí je ve zvucích hry).
let ukazaneZlato = 0;
// Mapa, která se v téhle hře odemkne po ODEMKNUTI_MAPY s (null = další není nebo už je odemčená),
// a která se v ní opravdu odemkla (ukáže se na konci).
let mapaKOdemceni = null;
let odemcenaVHre = null;
// Čas v horní liště se kreslí pixelovým písmem jen při změně (jednou za sekundu). Pruhy bossů začínají pod lištou:
// horniOkraj = spodek lišty v px (měří se při změně času, dokud není změřený, platí výchozí z kresleni.js).
let ukazanyCas = '';
let horniOkraj;

function zmenVelikost() {
  platno.width = innerWidth;
  platno.height = innerHeight;
  // velikost času v liště a spodek lišty se po otočení telefonu přepočítají
  ukazanyCas = '';
}

function start() {
  // ?seed=123 v adrese dá pořád stejné vlny (hodí se na hledání chyb).
  const seminko = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() >>> 0);
  hra = novaHra(vytvorRng(seminko), zvolenaTrida(), nactiDuse().vylepseni, zvolenaMapa(), petDoHry(nactiPety()));
  const dalsi = dalsiMapa(hra.mapa);
  mapaKOdemceni = dalsi && !odemceneMapy().includes(dalsi) ? dalsi : null;
  odemcenaVHre = null;
  zapsanoNalezu = 0;
  zapsanoVajec = 0;
  ukazaneZlato = 0;
  ukazanyCas = '';
  vMenu = false;
  menu.skryj();
  document.body.classList.remove('v-menu');
  el('konec').hidden = true;
  el('volba').hidden = true;
  el('porovnani').hidden = true;
  el('obchod').hidden = true;
  el('pauza').hidden = true;
  // Zaměřené tlačítko schovaného okna by jinak Enterem spustilo něco uprostřed hry.
  document.activeElement?.blur?.();
}

// Nová verze hry (aplikace.js) převzala stránku, která běží se starou: načte se znovu, ale jen v hlavním menu
// (ne uprostřed hry, v záložce ani při psaní jména), ať hráč o nic nepřijde. Jinak počká na návrat do menu.
function nactiNovouVerzi() {
  if (novaVerze() && vMenu && el('menu-zalozka').hidden && !document.activeElement?.matches?.('input, textarea')) location.reload();
}

function doMenu() {
  vMenu = true;
  el('konec').hidden = true;
  el('volba').hidden = true;
  el('porovnani').hidden = true;
  el('obchod').hidden = true;
  el('pauza').hidden = true;
  document.body.classList.add('v-menu');
  stisknute.clear();
  dotyk.aktivni = false;
  menu.ukaz();
  nactiNovouVerzi();
}

// Hra začne až po Hrát. Stisk tlačítka zároveň odemkne zvuk (prohlížeč ho jinak nepustí).
const menu = vytvorMenu({
  hrat() {
    odemkniZvuk();
    zvukStartu();
    start();
  },
});

// Dotyk: kde prst dosedne, tam je střed joysticku; tah od středu = směr pohybu.
const dotyk = { aktivni: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
const POLOMER_JOYSTICKU = 50;

// Ovladač (ovladac.js): čtečka se ptá prohlížeče jednou za snímek, pohyb páčky platí místo kláves.
const ctecka = vytvorCtecku();
let pohybOvladace = { dx: 0, dy: 0 };

function vstup() {
  if (dotyk.aktivni) {
    const dx = dotyk.x - dotyk.sx;
    const dy = dotyk.y - dotyk.sy;
    const d = Math.hypot(dx, dy);
    if (d < 8) return { dx: 0, dy: 0 };
    const sila = Math.min(1, d / POLOMER_JOYSTICKU);
    return { dx: (dx / d) * sila, dy: (dy / d) * sila };
  }
  if (pohybOvladace.dx || pohybOvladace.dy) return pohybOvladace;
  const drzi = (...klavesy) => klavesy.some((k) => stisknute.has(k));
  return {
    dx: (drzi('d', 'arrowright') ? 1 : 0) - (drzi('a', 'arrowleft') ? 1 : 0),
    dy: (drzi('s', 'arrowdown') ? 1 : 0) - (drzi('w', 'arrowup') ? 1 : 0),
  };
}

function kresliJoystick() {
  if (!dotyk.aktivni) return;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#f3e6c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(dotyk.sx, dotyk.sy, POLOMER_JOYSTICKU, 0, Math.PI * 2);
  ctx.stroke();
  const dx = dotyk.x - dotyk.sx;
  const dy = dotyk.y - dotyk.sy;
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(d, POLOMER_JOYSTICKU) / d;
  ctx.fillStyle = '#e9c46a';
  ctx.beginPath();
  ctx.arc(dotyk.sx + dx * k, dotyk.sy + dy * k, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Přehled výbavy leží nad plátnem. Když prst s joystickem dosedne k němu, přehled zprůhlední, ať je joystick vidět.
function vybavaUJoysticku() {
  let blizko = false;
  if (dotyk.aktivni) {
    const r = vybava.getBoundingClientRect();
    const okraj = POLOMER_JOYSTICKU + 18;
    blizko = dotyk.sx > r.left - okraj && dotyk.sx < r.right + okraj && dotyk.sy > r.top - okraj && dotyk.sy < r.bottom + okraj;
  }
  vybava.classList.toggle('u-joysticku', blizko);
}

// Pauza (P nebo Esc): hra stojí a okno z trámů nabídne Pokračovat a pod ním skupiny jako v Nastavení: Hra (čísla
// poškození, světla) a Zvuk (hlasitost, ztlumení). Pořadí šipek je stejné jako dřív. Volby se staví pokaždé znovu, ať
// ukazují, co je zrovna uložené (mohlo se změnit v menu).
function nastavPauzu(zapnout) {
  hra.pauza = zapnout;
  el('pauza').hidden = !zapnout;
  if (!zapnout) {
    document.activeElement?.blur?.();
    return;
  }
  const pokracovat = textovyPrvek('button', t('pauza.pokracovat'));
  pokracovat.append(jenKlavesnice(' (P)'), jenOvladac('start'));
  pokracovat.className = 'menu-tlacitko hlavni';
  pokracovat.type = 'button';
  pokracovat.addEventListener('click', () => { if (hra?.pauza) nastavPauzu(false); });
  // Ukončit hru (Daliik 5. 11.) jde kdykoli. Od ODEMKNUTI_MAPY s (kdy se odemyká další mapa) běh skončí jako po
  // smrti: rekord, duše a obrazovka konce. Dřív bez odměny – žádné duše ani rekord, rovnou do menu. Co se zapsalo
  // už během hry (nálezy výbavy), zůstává.
  const sOdmenou = hra.cas >= ODEMKNUTI_MAPY;
  const ukoncit = textovyPrvek('button', t('pauza.ukoncit'));
  ukoncit.append(' ', textovyPrvek('small', sOdmenou ? t('pauza.sOdmenou') : t('pauza.bezOdmeny', { cas: formatCas(ODEMKNUTI_MAPY) })));
  ukoncit.className = 'menu-tlacitko pauza-ukoncit';
  ukoncit.type = 'button';
  ukoncit.addEventListener('click', () => {
    if (!hra?.pauza || hra.konec) return;
    if (hra.cas >= ODEMKNUTI_MAPY) {
      hra.ukonceno = true;
      hra.konec = true;
      nastavPauzu(false);
    } else {
      hra.pauza = false;
      doMenu();
    }
  });
  const volbyHry = skupina(t('menu.nastaveni.hra'));
  volbyHry.append(prepinacNastaveni('cislaPoskozeni', t('menu.nastaveni.cislaPoskozeni')), prepinacSvetel());
  const zvuk = skupina(t('menu.nastaveni.zvuk'));
  zvuk.append(ovladaniZvuku());
  el('pauza-volby').replaceChildren(pokracovat, ukoncit, volbyHry, zvuk);
  pixelovyNadpis(el('pauza-nadpis'), t('pauza.nadpis'), { min: 3, max: 4 });
  vyberTlacitko(pokracovat);
}

function otevriVolby() {
  const stupen = ukazVolby(el('volba'), hra, zvol);
  volbyOd = performance.now();
  zvukVolby(stupen);
}

function zvol(i) {
  if (!hra?.volby?.[i] || hra.porovnani || performance.now() - volbyOd < POJISTKA_VOLBY) return;
  vyber(hra, hra.volby[i]);
  zvukVyberu();
  el('volba').hidden = true;
  document.activeElement?.blur?.();
}

// Přehodit karty (tlačítko nebo R): nové karty přijedou znovu s animací, na chybějící zlaťáky jen zabzučí.
function prehodKarty() {
  if (!hra?.volby || hra.porovnani || performance.now() - volbyOd < POJISTKA_VOLBY) return;
  if (!prehod(hra)) {
    zvukOdmitnuti();
    const tlacitko = el('prehodit');
    tlacitko.classList.remove('zatrast');
    void tlacitko.offsetWidth;
    tlacitko.classList.add('zatrast');
    return;
  }
  zvukPrehozeni();
  ukazVolby(el('volba'), hra, zvol);
  volbyOd = performance.now();
}

// Obchod kupce: okno se otevře, když hrdina dojde k vozu, a zavře Odejít nebo Esc.
let obchodOd = 0;
function otevriObchod() {
  ukazObchod(el('obchod'), hra, nakup);
  obchodOd = performance.now();
  zvukVolby(0);
  vyberTlacitko(el('zbozi').querySelector('.zbozi:not(.nejde)') ?? el('odejit'));
}

function nakup(id) {
  if (!hra?.obchod || hra.porovnani || hra.volby || performance.now() - obchodOd < POJISTKA_VOLBY) return;
  if (!kup(hra, id)) {
    zvukOdmitnuti();
    zatresZbozim(el('obchod'), id);
    return;
  }
  zvukNakupu();
  // Kus výbavy do obsazeného slotu: obchod se schová, přijde porovnání a pak se obchod zase ukáže.
  if (hra.porovnani) {
    el('obchod').hidden = true;
    return;
  }
  ukazObchod(el('obchod'), hra, nakup, id);
}

function odejdi() {
  if (!hra?.obchod || performance.now() - obchodOd < POJISTKA_VOLBY) return;
  odejdiOdKupce(hra);
  el('obchod').hidden = true;
  document.activeElement?.blur?.();
}

// Nový kus výbavy do obsazeného slotu: okno porovnání. Po rozhodnutí přijde okno karet z truhly.
function otevriPorovnani() {
  const stupen = ukazPorovnani(el('porovnani'), hra, rozhodniVybavu);
  porovnaniOd = performance.now();
  zvukVolby(stupen);
}

function rozhodniVybavu(vzit) {
  if (!hra?.porovnani || performance.now() - porovnaniOd < POJISTKA_VOLBY) return;
  rozhodniKus(hra, vzit);
  zvukVyberu();
  el('porovnani').hidden = true;
  document.activeElement?.blur?.();
}

// Každý nový kus výbavy se hned zapíše do Sbírky v menu.
function zapisNalezy() {
  while (zapsanoNalezu < hra.nalezy.length) zapisNalez(hra.nalezy[zapsanoNalezu++]);
  // Sebraná vejce peta se připíšou do profilu hned (otevírají se v menu Pety).
  if (hra.vajec > zapsanoVajec) {
    pripisVejce(hra.vajec - zapsanoVajec);
    zapsanoVajec = hra.vajec;
  }
}

// Přežil na mapě ODEMKNUTI_MAPY s: další mapa se hned zapíše jako odemčená (i kdyby hra skončila zavřením okna)
// a ohlásí se nápisem.
function hlidejOdemceni() {
  if (!mapaKOdemceni || hra.cas < ODEMKNUTI_MAPY) return;
  odemkniMapu(mapaKOdemceni);
  hra.oznameni = { text: t('hra.odemcenaMapa', { mapa: MAPY[mapaKOdemceni].nazev }), zivot: 3 };
  zvukHry('odemceni');
  odemcenaVHre = mapaKOdemceni;
  mapaKOdemceni = null;
}

// Rekordy se drží jen v tomhle prohlížeči (ulozeni.js), každá mapa svůj. V menu je ukazuje záložka Rekordy.
// Obrazovka konce: nad nadpisem štítek s rekordem (nový mosazně), nadpis krvavým pixelovým písmem, pod ním přehled
// běhu: vlevo čas velkým pixelovým písmem, vpravo postava, mapa, hrozba, úroveň, zabití, bossové a výbava,
// pod tím poznámky (oživení, odemčená mapa) a pokladnička s dušemi za hru.
function zapisKonec() {
  const vysledek = {
    cas: Math.floor(hra.cas), uroven: hra.hrdina.uroven, zabito: hra.zabito, hrozba: hra.hrozba, trida: hra.trida, mapa: hra.mapa,
    datum: new Date().toISOString(),
  };
  const { novy, rekord } = zapisVysledek(vysledek, hra.mapa);
  const stitek = el('konec-stitek');
  stitek.textContent = novy ? t('konec.novyRekord') : t('konec.rekord', { cas: formatCas(rekord.cas), uroven: rekord.uroven, zabito: rekord.zabito });
  stitek.classList.toggle('novy', novy);
  pixelovyNadpis(el('konec-nadpis'), t(hra.ukonceno ? 'konec.nadpisUkonceno' : 'konec.nadpis'), { styl: STYL_KREV, min: 2, max: 4 });

  const cas = textovyPrvek('div', '');
  cas.className = 'konec-cas';
  const cislo = textovyPrvek('span', '');
  pixelovyNadpis(cislo, formatCas(hra.cas), { min: 4, max: 5 });
  cas.append(textovyPrvek('small', t('konec.prezil', { trida: TRIDY[hra.trida].nazev })), cislo);
  const udaje = document.createElement('dl');
  udaje.className = 'konec-udaje';
  const pridej = (nazev, hodnota, ikona = null, trida = '') => {
    const dd = textovyPrvek('dd', '');
    if (trida) dd.className = trida;
    if (ikona) dd.append(ikona);
    dd.append(String(hodnota));
    udaje.append(textovyPrvek('dt', nazev), dd);
  };
  const kusu = hra.nalezy.length;
  pridej(t('udaje.postava'), TRIDY[hra.trida].nazev, obrazekSpritu(hra.trida, 2));
  pridej(t('udaje.mapa'), MAPY[hra.mapa].nazev, ikonaMapy(hra.mapa, 2), 'konec-mapa');
  udaje.lastElementChild.style.setProperty('--mapa', MAPY[hra.mapa].barva);
  pridej(t('udaje.hrozba'), hra.hrozba);
  pridej(t('udaje.uroven'), hra.hrdina.uroven);
  pridej(t('udaje.zabito'), hra.zabito);
  pridej(t('udaje.bossove'), hra.zabitoBossu);
  pridej(t('udaje.vybava'), t('tvary.kusy', { n: kusu }));
  const poznamky = [];
  if (hra.oziveno) poznamky.push(textovyPrvek('p', t('konec.oziven')));
  if (hra.vajec > 0) {
    const p = textovyPrvek('p', t('konec.vejce', { n: hra.vajec }));
    p.className = 'ok';
    poznamky.push(p);
  }
  if (odemcenaVHre) {
    const p = textovyPrvek('p', t('konec.odemcena', { mapa: MAPY[odemcenaVHre].nazev }));
    p.className = 'ok';
    poznamky.push(p);
  }
  const poznamka = textovyPrvek('div', '');
  poznamka.className = 'konec-poznamky';
  poznamka.append(...poznamky);
  el('konec-text').replaceChildren(cas, udaje, ...(poznamky.length ? [poznamka] : []));

  // Duše za hru se připíšou hned, utratit se dají v menu Vylepšení.
  const duse = dusZaHru(hra);
  const { duse: celkem } = pripisDuse(duse.celkem);
  const chamtivost = duse.chamtivost > 0 ? t('konec.chamtivost', { n: duse.chamtivost }) : '';
  const rozpis = textovyPrvek('small', t('konec.rozpis', {
    cas: duse.cas, zabiti: duse.zabiti, bossove: duse.strazci, zlataky: duse.zlataky, chamtivost, celkem,
  }));
  // Nevyužité zlaťáky se mění v duše (DUSE_ZA.zlataku za jednu), zbytek propadne.
  const utraceno = Object.values(hra.utraceno).reduce((a, b) => a + b, 0);
  const zlato = textovyPrvek('small', '');
  zlato.className = 'konec-zlato';
  zlato.append(
    obrazekSpritu('zlatak', 2),
    t('konec.zlataky', { zlataky: textZlataku(hra.zlataky), n: duse.zlataky, za: DUSE_ZA.zlataku }),
    utraceno ? t('konec.utraceno', { n: utraceno }) : '',
  );
  el('konec-duse').replaceChildren(
    obrazekSpritu('duse', 3),
    textovyPrvek('b', t('konec.duse', { n: duse.celkem })),
    zlato,
    rozpis,
  );
}

function textovyPrvek(znacka, text) {
  const e = document.createElement(znacka);
  e.textContent = text;
  return e;
}

// Klávesová zkratka v popisku tlačítka, třeba „ (P)“: na dotykovém displeji se schová (CSS .jen-klavesnice).
function jenKlavesnice(text) {
  const e = textovyPrvek('span', text);
  e.className = 'jen-klavesnice';
  return e;
}

// Hrozba pod časem: číslo se mění jednou za minutu a štítek přitom krátce poskočí (CSS animace .roste). Za ním
// „+N“, o kolik stupňů je hrozba výš kvůli síle hrdiny (přizpůsobení hrozby).
let ukazanaHrozba = null;
let ukazanaNavic = null;
function ukazHrozbu(uroven, navic) {
  if (uroven === ukazanaHrozba && navic === ukazanaNavic) return;
  const stitek = el('hrozba');
  el('hrozba-cislo').textContent = uroven;
  const plus = el('hrozba-navic');
  plus.hidden = !(navic > 0);
  plus.textContent = navic > 0 ? `+${navic}` : '';
  if (navic > 0) stitek.title = t('hud.hrozbaNavic', { n: navic });
  else stitek.removeAttribute('title');
  stitek.classList.remove('roste');
  if (ukazanaHrozba !== null && (uroven > ukazanaHrozba || navic > ukazanaNavic)) {
    void stitek.offsetWidth;
    stitek.classList.add('roste');
  }
  ukazanaHrozba = uroven;
  ukazanaNavic = navic;
}

// Pruh životů dole: šířka výplně, číslo a pod 30 % blikání; mění DOM jen při změně životů.
let ukazaneZivoty = '';
function zivotyHrdiny(hrdina) {
  const hp = Math.max(0, Math.ceil(hrdina.hp));
  const max = Math.max(1, Math.round(hrdina.maxHp));
  const klic = hp + '/' + max;
  if (klic === ukazaneZivoty) return;
  ukazaneZivoty = klic;
  const procent = Math.min(100, (hp / max) * 100);
  el('zivoty-vypln').style.width = procent + '%';
  el('zivoty-cislo').textContent = hp + ' / ' + max;
  const pruh = el('zivoty-hrdiny');
  pruh.setAttribute('aria-valuenow', String(Math.round(procent)));
  pruh.classList.toggle('malo', procent < 30);
}

function hud() {
  const { hrdina } = hra;
  el('uroven').textContent = hrdina.uroven;
  zivotyHrdiny(hrdina);
  el('zabito').textContent = hra.zabito;
  el('zlataky').textContent = hra.zlataky;
  // Přibyly zlaťáky: počet poskočí.
  if (hra.zlataky > ukazaneZlato) {
    const stitek = el('hud-zlato');
    stitek.classList.remove('roste');
    void stitek.offsetWidth;
    stitek.classList.add('roste');
  }
  ukazaneZlato = hra.zlataky;
  el('hud-klice').hidden = !(hra.klice > 0);
  el('klice').textContent = hra.klice;
  const cas = formatCas(hra.cas);
  if (cas !== ukazanyCas) {
    // na telefonu a nízké obrazovce dvojnásobek pixelu, jinak trojnásobek (text zůstane v prvku pro čtečky)
    const meritko = innerWidth <= 600 || innerHeight <= 500 ? 2 : 3;
    pixelovyNadpis(el('cas'), cas, { min: meritko, max: meritko });
    ukazanyCas = cas;
    horniOkraj = Math.round(document.querySelector('.hud').getBoundingClientRect().bottom) + 10;
  }
  ukazHrozbu(hra.hrozba, hrozbaNavic(hra));
  el('xp-pruh').style.width = `${Math.min(100, (hrdina.xp / hrdina.potreba) * 100)}%`;
  // Překreslí se jen když se výbava změnila (po výběru vylepšení nebo v nové hře).
  ukazVybavu(vybava, hra, el('zivoty-sloty'));
}

// Zvuky ze hry (hra.zvuky, zapisuje je hra.js): každý druh jednou za snímek, omezovač v zvuk.js pohlídá, ať
// stovky zásahů nedrnčí. Pak hudba: nálada mapy, s bossem rychlejší, v okně nebo pauze tišší, po prohře ticho.
function zvukyAHudba() {
  for (const [id, z] of Object.entries(hra.zvuky)) zvukHry(id, z.sila);
  hra.zvuky = {};
  const okno = hra.pauza || hra.volby || hra.porovnani || hra.obchod;
  hudba(hra.konec ? null : hra.mapa, { boss: hra.nepratele.some((n) => n.boss), tlumit: Boolean(okno) });
}

// Klávesa N (i v menu): ztlumí nebo zapne všechen zvuk a krátce to ukáže dole.
let hlaseniZvuku = 0;
function prepniZvuk() {
  odemkniZvuk();
  const ztlumeno = prepniZtlumeni();
  const hlaseni = el('zvuk-hlaseni');
  hlaseni.textContent = ztlumeno ? t('hra.zvukVypnuty') : t('hra.zvukZapnuty');
  hlaseni.hidden = false;
  clearTimeout(hlaseniZvuku);
  hlaseniZvuku = setTimeout(() => { hlaseni.hidden = true; }, 1400);
}

// Okno nad hrou (konec, pauza, karty, porovnání, kupec): ovladač v něm vybírá místo pohybu.
function oknoHry() {
  return Boolean(hra && (hra.konec || hra.pauza || hra.volby || hra.porovnani || hra.obchod));
}

// Ovladač jednou za snímek: pohyb pro hru, stisky jako klávesy. Hraje-li hráč na ovladači (body.ovladac), ukazují
// nápovědy jeho tlačítka; dokud prohlížeč nepustil zvuk (stisk na ovladači nestačí), menu to řekne.
let zamcenyZvuk = null;
function ctiOvladac() {
  let pady = [];
  try {
    pady = navigator.getGamepads?.() ?? [];
  } catch {
    pady = [];
  }
  const ui = vMenu || oknoHry();
  const bylAktivni = stavOvladace().aktivni;
  const r = ctecka.precti(pady, performance.now() / 1000, ui);
  nastavOvladac({ pripojeno: r.pripojeno, rodina: r.rodina, aktivni: r.aktivita ? true : undefined });
  pohybOvladace = r.pohyb;
  for (const u of r.udalosti) akceOvladace(u, bylAktivni);
  const zamceno = stavOvladace().aktivni && !zvukBezi();
  if (zamceno !== zamcenyZvuk) {
    el('pata-zvuk').hidden = !zamceno;
    zamcenyZvuk = zamceno;
  }
}

const SMER_KLAVESY = { nahoru: 'ArrowUp', dolu: 'ArrowDown', vlevo: 'ArrowLeft', vpravo: 'ArrowRight' };
const umelaKlavesa = (key) => ({ key, repeat: false, zOvladace: true, preventDefault() {} });

// Co stisk na ovladači udělá: v menu jako šipky a Enter (menu.js), ve hře podle okna. A potvrdí, B zpět
// (pauza pokračuje, kupec odejde, po prohře menu), X přehodí karty, Start pauza, Back zvuk. Odpojený ovladač
// uprostřed hry ji zastaví (hráč by jinak nemohl řídit).
function akceOvladace(u, bylAktivni) {
  if (u === 'zpet') return prepniZvuk();
  if (u === 'odpojen') {
    if (!vMenu && hra && !oknoHry() && bylAktivni) nastavPauzu(true);
    return;
  }
  if (vMenu) return menu.ovladac(u);
  if (!hra) return;
  const smer = SMER_KLAVESY[u];
  const tlacitka = (kontejner) => ovladejTlacitka(kontejner, umelaKlavesa(smer ?? 'Enter'));
  // Karty a porovnání: A bez vybrané karty jen vybere první, naslepo nic nevezme (jako Enter).
  const karty = (kontejner) => ovladejTlacitka(kontejner, umelaKlavesa(smer ?? (kontejner.querySelector('.vybrano') ? 'Enter' : 'ArrowRight')));
  const vyber = smer || u === 'a';
  if (hra.konec) {
    if (u === 'b') doMenu();
    else if (vyber) tlacitka(el('konec'));
  } else if (hra.porovnani) {
    if (vyber) karty(el('porovnani-kusy'));
  } else if (hra.volby) {
    if (u === 'x') prehodKarty();
    else if (vyber) karty(el('karty'));
  } else if (hra.obchod) {
    if (u === 'b') odejdi();
    else if (vyber) tlacitka(el('obchod'));
  } else if (hra.pauza) {
    if (u === 'b' || u === 'start') nastavPauzu(false);
    else if (vyber) tlacitka(el('pauza'));
  } else if (u === 'start') nastavPauzu(true);
}

const omezenyPohyb = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

function smycka(t) {
  // Skutečný odstup snímků (pojistka světel podle něj měří FPS), hra počítá nejvýš s 0,05 s.
  const odstup = (t - posledni) / 1000 || 0;
  const dt = Math.min(0.05, odstup);
  posledni = t;
  ctiOvladac();
  if (vMenu) {
    hudba(null);
    // Kdo má v systému omezený pohyb, tomu pozadí menu stojí (hrdina uprostřed honičky, mapa neujíždí).
    kresliMenu(ctx, omezenyPohyb?.matches ? 6 : t / 1000, zvolenaTrida(), zvolenaMapa());
    requestAnimationFrame(smycka);
    return;
  }
  aktualizuj(hra, dt, vstup(), platno.width, platno.height);
  hlidejOdemceni();
  zvukyAHudba();
  // Po truhle nejdřív porovnání výbavy (když je slot obsazený), pak karty, nakonec obchod kupce. Okno se otevře,
  // jakmile na něj přijde řada, a zavře ho až volba (obchod se mezitím schová a pak zase ukáže).
  if (hra.porovnani && el('porovnani').hidden) {
    el('obchod').hidden = true;
    otevriPorovnani();
  } else if (hra.volby && !hra.porovnani && el('volba').hidden) {
    el('obchod').hidden = true;
    otevriVolby();
  } else if (hra.obchod && !hra.volby && !hra.porovnani && el('obchod').hidden) otevriObchod();
  zapisNalezy();
  if (hra.konec && el('konec').hidden) {
    zapisKonec();
    el('konec').hidden = false;
    prizpusobNadpisy(el('konec'));
    vyberTlacitko(el('znovu'));
  }
  kresli(ctx, hra, { cislaPoskozeni: cislaPoskozeni(), horni: horniOkraj, svetla: svetlaProSnimek(odstup, document.visibilityState === 'visible') });
  kresliJoystick();
  vybavaUJoysticku();
  hud();
  requestAnimationFrame(smycka);
}

// Klávesa, myš nebo dotyk vrátí nápovědy na klávesnici (dotyk) a pustí zvuk pozastavený od ovladače.
const bezOvladace = () => {
  nastavOvladac({ aktivni: false });
  probudZvuk();
};
addEventListener('pointerdown', bezOvladace, true);
// Pohnutá myš taky (stojící myš dostane od Chrome po změně stránky pohyb bez posunu, ten se nepočítá).
addEventListener('pointermove', (e) => {
  if (stavOvladace().aktivni && (e.movementX || e.movementY)) nastavOvladac({ aktivni: false });
}, true);
addEventListener('keydown', (e) => {
  bezOvladace();
  // Psaní do pole v menu (jméno profilu, kód uložení): klávesy patří poli. N by jinak ztlumil zvuk, WASD posouvaly
  // výběr a Backspace zavřel záložku. Enter a Esc si pole obslouží samo.
  if (e.target instanceof Element && e.target.matches('input, textarea')) return;
  const k = e.key.toLowerCase();
  if (k === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (!e.repeat) prepniZvuk();
    return;
  }
  if (vMenu) {
    menu.klavesa(e);
    return;
  }
  stisknute.add(k);
  // Po prohře: R znovu, M nebo Esc do menu, šipky a Enter mezi tlačítky Znovu a Menu.
  if (hra.konec) {
    if (k === 'r') start();
    else if (k === 'm' || k === 'escape') doMenu();
    else ovladejTlacitka(el('konec'), e);
    return;
  }
  // Obchod: 1–5 koupí zboží, Esc (nebo Q) odejde, šipky a Enter vybírají.
  if (hra.obchod && !hra.volby && !hra.porovnani) {
    const i = Number(k) - 1;
    if (Number.isInteger(i) && i >= 0 && i < PORADI_ZBOZI.length) {
      if (!e.repeat) nakup(PORADI_ZBOZI[i]);
    } else if (k === 'escape' || k === 'q') odejdi();
    else ovladejTlacitka(el('obchod'), e);
    return;
  }
  if ((k === 'p' || k === 'escape') && !hra.volby && !hra.porovnani) {
    if (!e.repeat) nastavPauzu(!hra.pauza);
    return;
  }
  if (hra.pauza) {
    ovladejTlacitka(el('pauza'), e);
    return;
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  // Porovnání výbavy: 1 vezme nový kus, 2 nechá nasazený, šipky a Enter jako u karet.
  if (hra.porovnani) {
    if (k === '1' || k === '2') rozhodniVybavu(k === '1');
    else if (!['enter', ' '].includes(k) || el('porovnani-kusy').querySelector('.vybrano')) ovladejTlacitka(el('porovnani-kusy'), e);
    return;
  }
  if (hra.volby && ['1', '2', '3'].includes(k)) zvol(Number(k) - 1);
  else if (hra.volby && k === 'r') {
    if (!e.repeat) prehodKarty();
  }
  // Šipky vybírají kartu, Enter nebo mezerník ji vezme (jen když už je nějaká vybraná, ne naslepo první).
  else if (hra.volby && (!['enter', ' '].includes(k) || el('karty').querySelector('.vybrano'))) ovladejTlacitka(el('karty'), e);
});
addEventListener('keyup', (e) => stisknute.delete(e.key.toLowerCase()));
platno.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (dotyk.aktivni) return;
  const t = e.changedTouches[0];
  Object.assign(dotyk, { aktivni: true, id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY });
}, { passive: false });
platno.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === dotyk.id) Object.assign(dotyk, { x: t.clientX, y: t.clientY });
  }
}, { passive: false });
const pustDotyk = (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === dotyk.id) dotyk.aktivni = false;
  }
};
platno.addEventListener('touchend', pustDotyk);
platno.addEventListener('touchcancel', pustDotyk);
addEventListener('blur', () => stisknute.clear());
addEventListener('resize', zmenVelikost);
el('znovu').addEventListener('click', () => { if (hra?.konec) start(); });
el('do-menu').addEventListener('click', () => { if (hra?.konec) doMenu(); });
el('prehodit').addEventListener('click', prehodKarty);
// Pauza na dotyk: tlačítko vlevo v liště (CSS ho ukáže jen na dotykovém displeji). Funguje jako P, takže ne v okně
// karet, výbavy, kupce ani po prohře; v pauze ji klepnutí zase pustí.
el('hud-pauza').addEventListener('click', () => {
  if (!vMenu && hra && !hra.konec && !hra.volby && !hra.porovnani && !hra.obchod) nastavPauzu(!hra.pauza);
});
el('odejit').addEventListener('click', odejdi);

// Ikonka lebky, zlaťáku a klíče v horní liště (sprity z sprity.js, stejné jako ve hře).
el('lebka-ikona').replaceWith(obrazekSpritu('lebka', 2));
el('zlato-ikona').replaceWith(obrazekSpritu('zlatak', 2));
el('klic-ikona').replaceWith(obrazekSpritu('klic', 2));
// Statické texty stránky (data-t v index.html) ve zvoleném jazyce, nápovědy pro ovladač se značkami tlačítek.
prelozStranku();
vyplnNapovedy();
priZmeneJazyka(() => vyplnNapovedy());
// Režim pro barvoslepé (Nastavení → Barvy): stránka dostane data-barvy, CSS podle něj přidá značky a palety.
const ukazBarvy = (rezim) => {
  if (rezim === 'vyp') delete document.body.dataset.barvy;
  else document.body.dataset.barvy = rezim;
};
ukazBarvy(rezimBarev());
priZmeneBarev(ukazBarvy);
priZmeneOvladace((zmena, stav) => {
  if ('rodina' in zmena) vyplnNapovedy();
  document.body.classList.toggle('ovladac', stav.aktivni);
});
zmenVelikost();
doMenu();
registrujAplikaci();
priZmeneAplikace(nactiNovouVerzi);
requestAnimationFrame(smycka);
