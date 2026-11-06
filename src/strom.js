// Okno stromu trvalých vylepšení (záložka Vylepšení v menu): uprostřed duše, z nich šest větví uzlů propojených
// čarami. Jen DOM a ovládání: co uzel stojí, co dá a kdy jde koupit, je v duse.js, uložení v ulozeni.js.
// Ovládání: tažení myší nebo prstem strom posouvá, kolečko, štípnutí a tlačítka − a + přibližují, Střed vrátí
// pohled doprostřed. Najetí myší vybere uzel a klik ho koupí, na dotyk první klepnutí vybere a druhé koupí (nebo
// tlačítko Koupit v popisu). Šipky (WASD, páčka) skáčou na nejbližší uzel tím směrem, Enter (A) koupí, + a − přiblíží;
// nad horním okrajem stromu je lišta s tlačítky. Popis pod stromem ukáže, co uzel dává teď a co přidá další úroveň.
// Stavy uzlů: zamčený (tmavý, šedá ikona, čára čárkovaná), dostupný (dřevo, zelený roh = na něj máš), rozkoupaný
// (mosazný rám a dílky úrovní) a hotový (mosazný rám, teplé dřevo). Klíčové uzly mají velký mosazný rám.
import {
  VYLEPSENI, VETVE, STRED, poziceUzlu, stavUzlu, cenaVylepseni, kupVylepseni, vratDuse, utraceno, popisVylepseni,
  prehledStromu,
} from './duse.js';
import { nactiDuse, ulozDuse } from './ulozeni.js';
import { obrazekSpritu, vyberTlacitko, najedi, najetiMysi, pocetDusi } from './menu.js';
import { odemkniZvuk, zvukHry, zvukNakupu, zvukOdmitnuti } from './zvuk.js';
import { mysVybira, vyplnZnackami } from './ovladac.js';
import { t } from './texty.js';

// Jeden dílek stromu (vzdálenost v datech) v pixelech při přiblížení 1, meze přiblížení.
const DILEK = 64;
const PRIBLIZENI = { min: 0.4, max: 1.8, krok: 1.25 };
// Posun, od kterého je stisk tažením (ne klik), a okraj, za který se při výběru klávesnicí pohled posune.
const PRAH_TAHU = 6;
const OKRAJ = 70;
const IDS = Object.keys(VYLEPSENI);
const VSECHNY = [STRED, ...IDS];
// Kde naposledy byl pohled (pamatuje se, dokud je stránka otevřená).
let pohled = null;
// Otevřený strom (klávesy z menu jdou do něj), null = zavřený.
let otevreny = null;

const MIN_VYSKA_OKNA = 180;

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

// Nejbližší uzel ve směru (x, y) na obrazovce: v kuželu ±60°, bližší a přímější vyhraje.
export function dalsiUzel(od, smer) {
  const a = poziceUzlu(od);
  let nej = null;
  let nejSkore = Infinity;
  for (const id of VSECHNY) {
    if (id === od) continue;
    const b = poziceUzlu(id);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const cos = (dx * smer.x + dy * smer.y) / d;
    if (!(cos > 0.5)) continue;
    const skore = d * (1 + 2 * (1 - cos));
    if (skore < nejSkore) {
      nej = id;
      nejSkore = skore;
    }
  }
  return nej;
}

const SMERY = {
  arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
};

// Klávesa z menu, když je otevřená záložka Vylepšení. Vrací true, když ji strom zpracoval.
export function klavesaStromu(e) {
  return otevreny ? otevreny.klavesa(e) : false;
}

export function vyplnStrom(panel) {
  otevreny?.zrus();
  const lista = prvek('div', 'strom-lista');
  const pokladna = prvek('div', 'duse-stav');
  const pocet = prvek('b');
  const slovo = prvek('span');
  const textDusi = prvek('span', 'duse-stav-text', t('menu.vylepseni.mas'));
  textDusi.append(pocet, slovo);
  pokladna.append(obrazekSpritu('duse', 3), textDusi);
  const postup = prvek('span', 'strom-postup');
  const tlacitko = (trida, text, aria) => {
    const b = prvek('button', `menu-tlacitko strom-ovladani ${trida}`, text);
    b.type = 'button';
    if (aria) b.setAttribute('aria-label', aria);
    return b;
  };
  const oddalit = tlacitko('oddalit', '−', t('menu.vylepseni.oddalit'));
  const priblizit = tlacitko('priblizit', '+', t('menu.vylepseni.priblizit'));
  const naStred = tlacitko('na-stred', t('menu.vylepseni.stred'));
  const vratit = tlacitko('vratit', '');
  const ovladani = prvek('span', 'strom-tlacitka');
  ovladani.append(oddalit, priblizit, naStred, vratit);
  lista.append(pokladna, postup, ovladani);

  const okno = prvek('div', 'strom-okno');
  const platno = prvek('div', 'strom-platno');
  okno.append(platno);

  // Čáry od rodiče (nebo od středu) k uzlu: tmavý obrys a pod ním barva podle stavu.
  const polomer = Math.ceil(Math.max(...IDS.map((id) => Math.hypot(poziceUzlu(id).x, poziceUzlu(id).y))) + 2) * DILEK;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'strom-cary');
  svg.setAttribute('viewBox', `${-polomer} ${-polomer} ${2 * polomer} ${2 * polomer}`);
  svg.setAttribute('aria-hidden', 'true');
  Object.assign(svg.style, { left: `${-polomer}px`, top: `${-polomer}px`, width: `${2 * polomer}px`, height: `${2 * polomer}px` });
  const cara = (trida, a, b) => {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('class', trida);
    for (const [k, v] of [['x1', a.x], ['y1', a.y], ['x2', b.x], ['y2', b.y]]) l.setAttribute(k, String(Math.round(v * DILEK)));
    return l;
  };
  const kruh = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  kruh.setAttribute('class', 'strom-kruh');
  kruh.setAttribute('r', String(1.6 * DILEK));
  svg.append(kruh);
  const cary = new Map();
  const obrysy = [];
  for (const id of IDS) {
    const a = poziceUzlu(VYLEPSENI[id].od ?? STRED);
    const b = poziceUzlu(id);
    obrysy.push(cara('obrys', a, b));
    cary.set(id, cara('cara', a, b));
  }
  svg.append(...obrysy, ...cary.values());
  platno.append(svg);

  // Jména větví za konci ramen.
  for (const [id, v] of Object.entries(VETVE)) {
    const u = (v.uhel * Math.PI) / 180;
    const stitek = prvek('span', 'strom-vetev', v.nazev);
    stitek.style.left = `${Math.round(Math.cos(u) * 9.5 * DILEK)}px`;
    stitek.style.top = `${Math.round(Math.sin(u) * 9.5 * DILEK)}px`;
    platno.append(stitek);
  }

  // Uzly.
  const uzly = new Map();
  for (const id of VSECHNY) {
    const p = poziceUzlu(id);
    const v = VYLEPSENI[id];
    const b = prvek('button', `uzel${id === STRED ? ' stred zvolena' : ''}${v?.klicovy ? ' klicovy' : ''}`);
    b.type = 'button';
    b.dataset.uzel = id;
    b.style.left = `${Math.round(p.x * DILEK)}px`;
    b.style.top = `${Math.round(p.y * DILEK)}px`;
    b.append(obrazekSpritu(id === STRED ? 'duse' : v.ikona, v?.klicovy ? 4 : 3));
    if (id === STRED) b.append(prvek('b', 'uzel-duse'));
    else if (v.max > 1) b.append(prvek('span', 'uzel-urovne'));
    uzly.set(id, b);
    platno.append(b);
  }

  // Popis vybraného uzlu pod stromem a nápověda.
  const popis = prvek('div', 'strom-popis');
  popis.setAttribute('aria-live', 'polite');
  const popisIkona = prvek('span', 'strom-popis-ikona');
  const popisText = prvek('div', 'strom-popis-text');
  const koupit = prvek('button', 'menu-tlacitko strom-koupit');
  koupit.type = 'button';
  popis.append(popisIkona, popisText, koupit);
  const napoveda = prvek('p', 'strom-napoveda');
  const naOvladaci = prvek('span', 'jen-ovladac');
  vyplnZnackami(naOvladaci, t('menu.vylepseni.napovedaOvladac'));
  napoveda.append(
    prvek('span', 'jen-klavesnice', t('menu.vylepseni.napovedaKlavesnice')),
    prvek('span', 'jen-dotyk', t('menu.vylepseni.napovedaDotyk')),
    naOvladaci,
  );
  panel.append(lista, okno, popis, napoveda);

  // ---------- Pohled: posun a přiblížení ----------
  let { x: posunX, y: posunY, z } = pohled ?? { x: 0, y: 0, z: 0 };
  const omez = (x) => Math.min(PRIBLIZENI.max, Math.max(PRIBLIZENI.min, x));
  const rozmer = () => ({ w: okno.clientWidth, h: okno.clientHeight });
  function prekresli(plynule = false) {
    const { w, h } = rozmer();
    // Okno ještě není vidět (záložka se otevírá): pohled se nastaví, až bude mít rozměr.
    if (!w || !h) return;
    if (!z) {
      naStredPohled(false);
      return;
    }
    // Strom nesmí utéct celý z okna: střed zůstane nejvýš o poloměr stromu od kraje.
    const mez = (polomer - 2 * DILEK) * z;
    posunX = Math.max(-mez, Math.min(mez, posunX));
    posunY = Math.max(-mez, Math.min(mez, posunY));
    platno.classList.toggle('plynule', plynule);
    platno.style.transform = `translate(${Math.round(w / 2 + posunX)}px, ${Math.round(h / 2 + posunY)}px) scale(${z})`;
    pohled = { x: posunX, y: posunY, z };
  }
  // Přiblížení kolem bodu (bx, by) v okně (bez bodu kolem středu okna).
  function priblizK(nove, bx = null, by = null) {
    const { w, h } = rozmer();
    const sx = (bx ?? w / 2) - w / 2;
    const sy = (by ?? h / 2) - h / 2;
    const n = omez(nove);
    posunX = sx - ((sx - posunX) / z) * n;
    posunY = sy - ((sy - posunY) / z) * n;
    z = n;
    prekresli(bx === null);
  }
  function naStredPohled(plynule = true) {
    const { w, h } = rozmer();
    if (!w || !h) return;
    posunX = 0;
    posunY = 0;
    z = omez(Math.min(1, Math.min(w, h) / (2 * 4.2 * DILEK)));
    prekresli(plynule);
  }
  // Vybraný uzel musí být vidět (jen při výběru klávesnicí nebo ovladačem).
  function ukaz(id) {
    const { w, h } = rozmer();
    const p = poziceUzlu(id);
    const x = w / 2 + posunX + p.x * DILEK * z;
    const y = h / 2 + posunY + p.y * DILEK * z;
    const okraj = Math.min(OKRAJ, w / 4, h / 4);
    if (x >= okraj && x <= w - okraj && y >= okraj && y <= h - okraj) return;
    posunX = -p.x * DILEK * z;
    posunY = -p.y * DILEK * z;
    prekresli(true);
  }

  // ---------- Stav a popis ----------
  let vybrany = null;
  let stav = nactiDuse();
  const pocetText = (n) => `${n} ${pocetDusi(n)}`;
  function popisUzlu(id) {
    const tlacitkoZpet = (text, vypnout) => {
      koupit.replaceChildren(text);
      koupit.disabled = vypnout;
    };
    popisIkona.replaceChildren(obrazekSpritu(id === STRED ? 'duse' : VYLEPSENI[id].ikona, 4));
    if (id === STRED) {
      const p = prehledStromu(stav.vylepseni);
      popisText.replaceChildren(
        prvek('b', 'strom-popis-nazev', t('menu.vylepseni.stredNazev')),
        prvek('span', 'strom-popis-radek', t('menu.vylepseni.stredMas', { n: stav.duse })),
        prvek('span', 'strom-popis-radek tlumeny', t('menu.vylepseni.stredPostup', { u: p.urovni, vse: p.vse, n: p.uzlu, uzlu: p.uzluCelkem })),
      );
      koupit.hidden = true;
      return;
    }
    const v = VYLEPSENI[id];
    const uroven = stav.vylepseni[id] ?? 0;
    const s = stavUzlu(stav.vylepseni, id);
    const cena = cenaVylepseni(id, uroven);
    const hlava = prvek('span', 'strom-popis-hlava');
    hlava.append(
      prvek('b', 'strom-popis-nazev', v.nazev),
      prvek('span', 'strom-popis-vetev', v.klicovy ? t('menu.vylepseni.klicovy', { vetev: VETVE[v.vetev].nazev })
        : t('menu.vylepseni.uroven', { vetev: VETVE[v.vetev].nazev, u: uroven, max: v.max })),
    );
    const radky = [hlava];
    if (v.klicovy || v.max === 1) radky.push(prvek('span', 'strom-popis-radek', popisVylepseni(id, 1)));
    else {
      if (uroven > 0) radky.push(prvek('span', 'strom-popis-radek', t('menu.vylepseni.ted', { text: popisVylepseni(id, uroven) })));
      if (cena !== null) radky.push(prvek('span', `strom-popis-radek${uroven > 0 ? ' dalsi' : ''}`, t(uroven > 0 ? 'menu.vylepseni.dalsi' : 'menu.vylepseni.prvni', { text: popisVylepseni(id, uroven + 1) })));
    }
    if (s === 'zamceny') radky.push(prvek('span', 'strom-popis-radek zamceno', t('menu.vylepseni.zamceno', { nazev: VYLEPSENI[v.od].nazev })));
    popisText.replaceChildren(...radky);
    koupit.hidden = false;
    if (cena === null) tlacitkoZpet(t('menu.vylepseni.hotovo'), true);
    else if (s === 'zamceny') tlacitkoZpet(t('menu.vylepseni.zamcenoTlacitko'), true);
    else {
      koupit.replaceChildren(t('menu.vylepseni.koupit'), obrazekSpritu('duse', 2), prvek('b', '', String(cena)));
      koupit.disabled = false;
      koupit.classList.toggle('drahe', cena > stav.duse);
      if (cena > stav.duse) koupit.append(prvek('small', 'cena-chybi', t('menu.vylepseni.chybi', { n: cena - stav.duse })));
    }
  }
  function ariaUzlu(id) {
    if (id === STRED) return `${t('menu.vylepseni.stredNazev')}, ${t('menu.vylepseni.stredMas', { n: stav.duse })}`;
    const v = VYLEPSENI[id];
    const uroven = stav.vylepseni[id] ?? 0;
    const s = stavUzlu(stav.vylepseni, id);
    const cena = cenaVylepseni(id, uroven);
    const kolik = cena === null ? '' : `, ${t('menu.vylepseni.ariaCena', { n: cena })}${cena > stav.duse ? t('menu.vylepseni.ariaChybi', { n: cena - stav.duse }) : ''}`;
    return t('menu.vylepseni.ariaUzel', { nazev: v.nazev, stav: t(`menu.vylepseni.stavy.${s}`), uroven, max: v.max, cena: kolik, popis: popisVylepseni(id, Math.max(1, uroven)) });
  }
  function obnov() {
    stav = nactiDuse();
    pocet.textContent = String(stav.duse);
    slovo.textContent = ` ${pocetDusi(stav.duse)}`;
    const p = prehledStromu(stav.vylepseni);
    postup.textContent = t('menu.vylepseni.postup', { u: p.urovni, vse: p.vse });
    for (const [id, b] of uzly) {
      if (id === STRED) {
        b.querySelector('.uzel-duse').textContent = String(stav.duse);
        b.setAttribute('aria-label', ariaUzlu(id));
        continue;
      }
      const v = VYLEPSENI[id];
      const uroven = stav.vylepseni[id] ?? 0;
      const s = stavUzlu(stav.vylepseni, id);
      const cena = cenaVylepseni(id, uroven);
      for (const jiny of ['zamceny', 'dostupny', 'rozkoupany', 'koupeny']) b.classList.toggle(jiny, jiny === s);
      b.classList.toggle('na-to-mas', s !== 'zamceny' && cena !== null && cena <= stav.duse);
      const dilky = b.querySelector('.uzel-urovne');
      if (dilky) dilky.replaceChildren(...Array.from({ length: v.max }, (_, i) => prvek('i', i < uroven ? 'plny' : '')));
      b.setAttribute('aria-label', ariaUzlu(id));
      const c = cary.get(id);
      c.setAttribute('class', `cara ${uroven > 0 ? 'koupena' : s === 'dostupny' ? 'dostupna' : 'zamcena'}`);
    }
    const kVraceni = utraceno(stav.vylepseni);
    vratit.classList.remove('potvrdit');
    vratit.textContent = kVraceni ? t('menu.vylepseni.vratit', { n: kVraceni }) : t('menu.vylepseni.nicKVraceni');
    vratit.disabled = !kVraceni;
    if (vybrany) popisUzlu(vybrany);
  }
  // zvuk = výběr přesunul hráč (myš, šipky, páčka): tiché ťuknutí, jen když se výběr opravdu pohnul.
  function vyber(id, posunout = false, zvuk = false) {
    const jiny = id !== vybrany || !uzly.get(id)?.classList.contains('vybrano');
    vybrany = id;
    vyberTlacitko(uzly.get(id));
    popisUzlu(id);
    if (posunout) ukaz(id);
    if (zvuk && jiny) zvukHry('najeti');
  }
  function zatres(e) {
    e.classList.remove('zatrast');
    void e.offsetWidth;
    e.classList.add('zatrast');
  }
  function kup(id) {
    if (!id || id === STRED) return;
    odemkniZvuk();
    const novy = kupVylepseni(nactiDuse(), id);
    const b = uzly.get(id);
    if (!novy) {
      zvukOdmitnuti();
      zatres(b);
      return;
    }
    ulozDuse(novy);
    zvukNakupu();
    b.classList.remove('koupeno-ted');
    void b.offsetWidth;
    b.classList.add('koupeno-ted');
    obnov();
  }

  // ---------- Myš, prst, kolečko ----------
  const ukazatele = new Map();
  let tah = null;
  let stipnuti = null;
  let tahnuto = false;
  let posledniUkazatel = 'mouse';
  const vOkne = (e) => {
    const r = okno.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const zacniStipnuti = () => {
    const [a, b] = [...ukazatele.values()];
    stipnuti = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z, posunX, posunY, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  okno.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    posledniUkazatel = e.pointerType;
    tahnuto = false;
    const m = vOkne(e);
    ukazatele.set(e.pointerId, m);
    if (ukazatele.size === 1) tah = { x: m.x, y: m.y, posunX, posunY, pohnul: false };
    else if (ukazatele.size === 2) {
      zacniStipnuti();
      tahnuto = true;
    }
  });
  okno.addEventListener('pointermove', (e) => {
    if (!ukazatele.has(e.pointerId)) return;
    const m = vOkne(e);
    ukazatele.set(e.pointerId, m);
    if (ukazatele.size >= 2 && stipnuti) {
      const [a, b] = [...ukazatele.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const { w, h } = rozmer();
      // Bod mezi prsty zůstane pod prsty: přiblížení kolem začátku štípnutí a posun o to, kam se prsty posunuly.
      const n = omez(stipnuti.z * (d / stipnuti.d));
      const sx = stipnuti.x - w / 2;
      const sy = stipnuti.y - h / 2;
      z = n;
      posunX = sx - ((sx - stipnuti.posunX) / stipnuti.z) * n + ((a.x + b.x) / 2 - stipnuti.x);
      posunY = sy - ((sy - stipnuti.posunY) / stipnuti.z) * n + ((a.y + b.y) / 2 - stipnuti.y);
      prekresli();
      return;
    }
    if (!tah) return;
    const dx = m.x - tah.x;
    const dy = m.y - tah.y;
    if (!tah.pohnul && Math.hypot(dx, dy) > PRAH_TAHU) {
      tah.pohnul = true;
      tahnuto = true;
      okno.setPointerCapture?.(e.pointerId);
      okno.classList.add('tahne');
    }
    if (!tah.pohnul) return;
    posunX = tah.posunX + dx;
    posunY = tah.posunY + dy;
    prekresli();
  });
  const pusteni = (e) => {
    if (!ukazatele.delete(e.pointerId)) return;
    if (ukazatele.size < 2) stipnuti = null;
    if (ukazatele.size === 1) {
      const [m] = ukazatele.values();
      tah = { x: m.x, y: m.y, posunX, posunY, pohnul: true };
    } else if (!ukazatele.size) {
      tah = null;
      okno.classList.remove('tahne');
    }
  };
  okno.addEventListener('pointerup', pusteni);
  okno.addEventListener('pointercancel', pusteni);
  okno.addEventListener('wheel', (e) => {
    e.preventDefault();
    const m = vOkne(e);
    const kolik = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    priblizK(z * Math.exp(-kolik * 0.0015), m.x, m.y);
  }, { passive: false });

  for (const [id, b] of uzly) {
    b.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'mouse' && mysVybira() && !tah?.pohnul && vybrany !== id) vyber(id, false, najetiMysi(e));
    });
    b.addEventListener('focus', () => {
      if (vybrany !== id) popisUzlu(id);
    });
    b.addEventListener('click', (e) => {
      // Puštěný tah (posun stromu) není klik: preventDefault = bez zvuku kliku (menu.js).
      if (tahnuto) return e.preventDefault();
      // Na dotyk první klepnutí uzel jen vybere (a ukáže popis), druhé koupí. Myš a Enter kupují rovnou.
      if (vybrany !== id && (posledniUkazatel !== 'mouse' || e.detail === 0)) {
        vyber(id);
        return;
      }
      vybrany = id;
      kup(id);
    });
  }
  koupit.addEventListener('click', () => kup(vybrany));
  oddalit.addEventListener('click', () => priblizK(z / PRIBLIZENI.krok));
  priblizit.addEventListener('click', () => priblizK(z * PRIBLIZENI.krok));
  naStred.addEventListener('click', () => naStredPohled());
  vratit.addEventListener('click', () => {
    const kVraceni = utraceno(nactiDuse().vylepseni);
    if (!kVraceni) return;
    if (!vratit.classList.contains('potvrdit')) {
      vratit.classList.add('potvrdit');
      vratit.textContent = t('menu.vylepseni.potvrdit', { n: kVraceni });
      return;
    }
    ulozDuse(vratDuse(nactiDuse()));
    obnov();
  });

  // Změna velikosti okna (i první zobrazení záložky) pohled překreslí. Časovač navíc pro případ, kdy prohlížeč
  // nekreslí (stránka v pozadí) a ResizeObserver mlčí.
  const pozorovatel = new ResizeObserver(() => prekresli());
  pozorovatel.observe(okno);
  setTimeout(() => prekresli(), 0);

  // Celá záložka se vejde na obrazovku bez posouvání stránky (Daliik 6. 11.): okno stromu dostane jen tolik výšky,
  // kolik v menu zbude, nejméně MIN_VYSKA_OKNA px. Logo a pata se ve stromu schovají (style.css). Po zavření
  // záložky se posluchač sám odhlásí.
  const vejdiSe = () => {
    if (!okno.isConnected) {
      removeEventListener('resize', vejdiSe);
      return;
    }
    const menu = okno.closest('.menu');
    if (!menu || !okno.getClientRects().length) return;
    okno.style.height = '';
    const prebytek = menu.scrollHeight - menu.clientHeight;
    if (prebytek > 0) okno.style.height = `${Math.max(MIN_VYSKA_OKNA, Math.floor(okno.getBoundingClientRect().height - prebytek))}px`;
  };
  addEventListener('resize', vejdiSe);
  setTimeout(vejdiSe, 0);

  // ---------- Klávesnice a ovladač ----------
  const tlacitkaListy = () => [...lista.querySelectorAll('button'), document.getElementById('menu-zpet')].filter((b) => b && !b.disabled && b.getClientRects().length);
  function klavesa(e) {
    const k = e.key.toLowerCase();
    if (k === '+' || k === '=') {
      e.preventDefault();
      priblizK(z * PRIBLIZENI.krok);
      return true;
    }
    if (k === '-' || k === '_') {
      e.preventDefault();
      priblizK(z / PRIBLIZENI.krok);
      return true;
    }
    const naListe = tlacitkaListy().includes(document.activeElement) && !uzly.has(document.activeElement?.dataset?.uzel);
    const smer = SMERY[k];
    if (smer) {
      e.preventDefault();
      // Držená šipka chodí po uzlech dál, ale ťukne jen první stisk (žádné drnčení).
      const zvuk = !e.repeat;
      if (naListe) {
        if (smer.y > 0) vyber(vybrany ?? STRED, true, zvuk);
        else if (smer.x) {
          const tl = tlacitkaListy();
          const i = tl.indexOf(document.activeElement);
          najedi(tl[(i + smer.x + tl.length) % tl.length], false, zvuk);
        }
        return true;
      }
      const dalsi = dalsiUzel(vybrany ?? STRED, smer);
      if (dalsi) vyber(dalsi, true, zvuk);
      else if (smer.y < 0) najedi(tlacitkaListy()[0], false, zvuk);
      return true;
    }
    if (k === 'enter' || k === ' ') {
      if (naListe) return false;
      if (e.repeat) {
        e.preventDefault();
        return true;
      }
      // Zaměřený uzel stiskne prohlížeč sám (klik bez myši kupuje vybraný uzel), ovladač ne.
      if (!e.zOvladace && document.activeElement?.dataset?.uzel === vybrany) return true;
      e.preventDefault();
      if (vybrany && vybrany !== STRED) kup(vybrany);
      else vyber(vybrany ?? STRED, true);
      return true;
    }
    return false;
  }

  otevreny = {
    klavesa,
    zrus() {
      pozorovatel.disconnect();
      otevreny = null;
    },
  };
  obnov();
  prekresli();
  vybrany = STRED;
  popisUzlu(STRED);
}
