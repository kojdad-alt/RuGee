import { vytvorRng } from './rng.js';
import { novaHra, aktualizuj, vyber, rozhodniKus, TRIDY, kup, odejdiOdKupce, prehod, PORADI_ZBOZI } from './hra.js';
import { kresli, kresliMenu } from './kresleni.js';
import { dusZaHru, DUSE_ZA } from './duse.js';
import {
  vytvorMenu, ovladejTlacitka, vyberTlacitko, formatCas, zvolenaTrida, zvolenaMapa, obrazekSpritu, pocetDusi, cislaPoskozeni,
  prepinacNastaveni, ovladaniZvuku, prepniZtlumeni, skupina, ikonaMapy,
} from './menu.js';
import { pixelovyNadpis, prizpusobNadpisy, STYL_KREV } from './pismo.js';
import { zapisVysledek, nactiDuse, pripisDuse, zapisNalez, odemceneMapy, odemkniMapu } from './ulozeni.js';
import { MAPY, ODEMKNUTI_MAPY, dalsiMapa } from './mapy.js';
import {
  odemkniZvuk, zvukHry, hudba, zvukStartu, zvukVolby, zvukVyberu, zvukNakupu, zvukOdmitnuti, zvukPrehozeni,
} from './zvuk.js';
import { ukazVolby, ukazPorovnani } from './volba.js';
import { ukazObchod, zatresZbozim, textZlataku } from './obchod.js';
import { ukazVybavu } from './vybava.js';

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
  hra = novaHra(vytvorRng(seminko), zvolenaTrida(), nactiDuse().vylepseni, zvolenaMapa());
  const dalsi = dalsiMapa(hra.mapa);
  mapaKOdemceni = dalsi && !odemceneMapy().includes(dalsi) ? dalsi : null;
  odemcenaVHre = null;
  zapsanoNalezu = 0;
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

function vstup() {
  if (dotyk.aktivni) {
    const dx = dotyk.x - dotyk.sx;
    const dy = dotyk.y - dotyk.sy;
    const d = Math.hypot(dx, dy);
    if (d < 8) return { dx: 0, dy: 0 };
    const sila = Math.min(1, d / POLOMER_JOYSTICKU);
    return { dx: (dx / d) * sila, dy: (dy / d) * sila };
  }
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
// poškození) a Zvuk (hlasitost, ztlumení). Pořadí šipek je stejné jako dřív. Volby se staví pokaždé znovu, ať
// ukazují, co je zrovna uložené (mohlo se změnit v menu).
function nastavPauzu(zapnout) {
  hra.pauza = zapnout;
  el('pauza').hidden = !zapnout;
  if (!zapnout) {
    document.activeElement?.blur?.();
    return;
  }
  const pokracovat = textovyPrvek('button', 'Pokračovat');
  pokracovat.append(jenKlavesnice(' (P)'));
  pokracovat.className = 'menu-tlacitko hlavni';
  pokracovat.type = 'button';
  pokracovat.addEventListener('click', () => { if (hra?.pauza) nastavPauzu(false); });
  const volbyHry = skupina('Hra');
  volbyHry.append(prepinacNastaveni('cislaPoskozeni', 'Čísla poškození'));
  const zvuk = skupina('Zvuk');
  zvuk.append(ovladaniZvuku());
  el('pauza-volby').replaceChildren(pokracovat, volbyHry, zvuk);
  pixelovyNadpis(el('pauza-nadpis'), 'Pauza', { min: 3, max: 4 });
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
}

// Přežil na mapě ODEMKNUTI_MAPY s: další mapa se hned zapíše jako odemčená (i kdyby hra skončila zavřením okna)
// a ohlásí se nápisem.
function hlidejOdemceni() {
  if (!mapaKOdemceni || hra.cas < ODEMKNUTI_MAPY) return;
  odemkniMapu(mapaKOdemceni);
  hra.oznameni = { text: `Odemčena mapa: ${MAPY[mapaKOdemceni].nazev}`, zivot: 3 };
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
  stitek.textContent = novy ? 'Nový rekord!' : `Rekord mapy ${formatCas(rekord.cas)} · úroveň ${rekord.uroven} · zabito ${rekord.zabito}`;
  stitek.classList.toggle('novy', novy);
  pixelovyNadpis(el('konec-nadpis'), 'Horda tě pohltila', { styl: STYL_KREV, min: 2, max: 4 });

  const cas = textovyPrvek('div', '');
  cas.className = 'konec-cas';
  const cislo = textovyPrvek('span', '');
  pixelovyNadpis(cislo, formatCas(hra.cas), { min: 4, max: 5 });
  cas.append(textovyPrvek('small', `${TRIDY[hra.trida].nazev} přežil`), cislo);
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
  pridej('Postava', TRIDY[hra.trida].nazev, obrazekSpritu(hra.trida, 2));
  pridej('Mapa', MAPY[hra.mapa].nazev, ikonaMapy(hra.mapa, 2), 'konec-mapa');
  udaje.lastElementChild.style.setProperty('--mapa', MAPY[hra.mapa].barva);
  pridej('Hrozba', hra.hrozba);
  pridej('Úroveň', hra.hrdina.uroven);
  pridej('Zabito', hra.zabito);
  pridej('Bossové', hra.zabitoBossu);
  pridej('Výbava bossů', `${kusu} ${kusu === 1 ? 'kus' : kusu >= 2 && kusu <= 4 ? 'kusy' : 'kusů'}`);
  const poznamky = [];
  if (hra.oziveno) poznamky.push(textovyPrvek('p', 'Duše tě jednou vrátily.'));
  if (odemcenaVHre) {
    const p = textovyPrvek('p', `Odemčena nová mapa: ${MAPY[odemcenaVHre].nazev}!`);
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
  const chamtivost = duse.chamtivost > 0 ? ` · chamtivost ${duse.chamtivost}` : '';
  const rozpis = textovyPrvek('small', `čas ${duse.cas} · zabití ${duse.zabiti} · bossové ${duse.strazci} · zlaťáky ${duse.zlataky}${chamtivost} · celkem ${celkem}`);
  // Nevyužité zlaťáky se mění v duše (DUSE_ZA.zlataku za jednu), zbytek propadne.
  const utraceno = Object.values(hra.utraceno).reduce((a, b) => a + b, 0);
  const zlato = textovyPrvek('small', '');
  zlato.className = 'konec-zlato';
  zlato.append(
    obrazekSpritu('zlatak', 2),
    ` ${textZlataku(hra.zlataky)} nevyužito → ${duse.zlataky} ${pocetDusi(duse.zlataky)} (${DUSE_ZA.zlataku} zl = 1 duše)`,
    utraceno ? ` · utraceno ${utraceno}` : '',
  );
  el('konec-duse').replaceChildren(
    obrazekSpritu('duse', 3),
    textovyPrvek('b', `+${duse.celkem} ${pocetDusi(duse.celkem)}`),
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

// Hrozba pod časem: číslo se mění jednou za minutu a štítek přitom krátce poskočí (CSS animace .roste).
let ukazanaHrozba = null;
function ukazHrozbu(uroven) {
  if (uroven === ukazanaHrozba) return;
  const stitek = el('hrozba');
  el('hrozba-cislo').textContent = uroven;
  stitek.classList.remove('roste');
  if (ukazanaHrozba !== null && uroven > ukazanaHrozba) {
    void stitek.offsetWidth;
    stitek.classList.add('roste');
  }
  ukazanaHrozba = uroven;
}

function hud() {
  const { hrdina } = hra;
  el('uroven').textContent = hrdina.uroven;
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
  ukazHrozbu(hra.hrozba);
  el('xp-pruh').style.width = `${Math.min(100, (hrdina.xp / hrdina.potreba) * 100)}%`;
  // Překreslí se jen když se výbava změnila (po výběru vylepšení nebo v nové hře).
  ukazVybavu(vybava, hra);
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
  hlaseni.textContent = ztlumeno ? 'Zvuk vypnutý (N)' : 'Zvuk zapnutý (N)';
  hlaseni.hidden = false;
  clearTimeout(hlaseniZvuku);
  hlaseniZvuku = setTimeout(() => { hlaseni.hidden = true; }, 1400);
}

const omezenyPohyb = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

function smycka(t) {
  const dt = Math.min(0.05, (t - posledni) / 1000 || 0);
  posledni = t;
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
  kresli(ctx, hra, { cislaPoskozeni: cislaPoskozeni(), horni: horniOkraj });
  kresliJoystick();
  vybavaUJoysticku();
  hud();
  requestAnimationFrame(smycka);
}

addEventListener('keydown', (e) => {
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
zmenVelikost();
doMenu();
requestAnimationFrame(smycka);
