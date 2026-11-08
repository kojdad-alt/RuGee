// Okno Pety (záložka v menu): nahoře líheň s vejci, pod ní sbírka petů. Jen DOM a ovládání: šance, duplikáty
// a cena vejce jsou v pety.js, uložení v ulozeni.js.
// Líheň: velké vejce ve výklenku, kolik vajec máš a za kolik vajec nejpozději přijde epický pet (pojistka), tlačítka
// Otevřít vejce a Koupit vejce (za duše). Otevření je krátká animace: vejce se třikrát zatřese, každé ťuknutí
// silněji, a skořápkou roste prasklina (podruhé a potřetí už prosvítá barvou rarity, když je aspoň neobvyklá),
// pak se skořápka rozletí na dvě půlky a střepy a vyskočí pet s cedulkou (jméno, rarita, co se stalo: nový pet,
// úroveň výš, vzácnější rarita, nebo duše za duplikát na maximu). Výsledek se uloží hned při stisku, takže
// zavřené okno uprostřed animace o nic nepřipraví. Další stisk Otevřít nebo klik na vejce animaci přeskočí.
// Sbírka: dlaždice všech petů v pořadí PORADI_PETU (neobjevený je stín a ???). Klik (Enter) zvolí aktivního peta,
// klik na aktivního ho nechá doma (hraje se bez peta). Aktivní má mosaznou cedulku.
import {
  PETY, PORADI_PETU, MAX_UROVEN, CENA_VEJCE, kupVejce, otevriVejce, zvolPeta, popisPetu, doPojistky, prehledPetu,
} from './pety.js';
import { RARITY, PORADI_RARIT } from './hra.js';
import { nactiPety, ulozPety, nactiDuse, ulozDuse } from './ulozeni.js';
import { obrazekSpritu, vyberTlacitko } from './menu.js';
import { odemkniZvuk, zvukHry, zvukNakupu, zvukOdmitnuti } from './zvuk.js';
import { t } from './texty.js';

// Animace otevření (ms): tři zatřesení po TRES (každé silnější, roste prasklina), pak skořápka odletí, za chvíli vyskočí pet.
const TRES = 420;
const PRASKNUTI = 3 * TRES;
const VYLIHNUTI = PRASKNUTI + 380;
const MERITKO_VEJCE = 8;

// Běžící animace (časovače a dokončení), null = nic neběží.
let animace = null;

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

function tlacitko(text, trida = '') {
  const b = prvek('button', `menu-tlacitko ${trida}`.trim(), text);
  b.type = 'button';
  return b;
}

function zatres(cil) {
  cil.classList.remove('zatrast');
  void cil.offsetWidth;
  cil.classList.add('zatrast');
}

function odmitni(cil) {
  odemkniZvuk();
  zvukOdmitnuti();
  zatres(cil);
}

// Dílky úrovní peta (plné do úrovně, prázdné do MAX_UROVEN).
function dilkyUrovne(uroven) {
  const d = prvek('span', 'pet-dilky');
  d.setAttribute('aria-hidden', 'true');
  for (let i = 1; i <= MAX_UROVEN; i++) d.append(prvek('i', i <= uroven ? 'plny' : ''));
  return d;
}

// Co se stalo při otevření (řádek na cedulce výsledku).
function textVysledku(v) {
  const rarita = RARITY[v.raritaPeta].nazev;
  if (v.zmena === 'novy') return t('menu.pety.vysledek.novy');
  if (v.zmena === 'rarita') return t('menu.pety.vysledek.rarita', { rarita });
  if (v.zmena === 'uroven') return t('menu.pety.vysledek.uroven', { uroven: v.uroven });
  return t('menu.pety.vysledek.duse', { n: v.duse });
}

function zastavAnimaci() {
  if (!animace) return;
  for (const c of animace.casovace) clearTimeout(c);
  const hotovo = animace.hotovo;
  animace = null;
  hotovo();
}

export function vyplnPety(panel) {
  zastavAnimaci();
  const pety = nactiPety();
  const { duse } = nactiDuse();
  panel.append(prvek('p', 'podtitul', t('menu.pety.podtitul')));

  // ---------- Líheň ----------
  const lihen = prvek('section', 'lihen');
  const vyklenek = prvek('div', 'lihen-vyklenek');
  vyklenek.setAttribute('aria-hidden', 'true');
  const vejce = obrazekSpritu('vejce', MERITKO_VEJCE);
  vejce.classList.add('lihen-vejce');
  if (!pety.vejce) vejce.classList.add('stin');
  vyklenek.append(vejce);
  const info = prvek('div', 'lihen-info');
  const pocet = prvek('p', 'lihen-pocet');
  pocet.append(t('menu.pety.vajec'), prvek('b', '', String(pety.vejce)));
  const pojistka = prvek('small', 'lihen-pojistka', t('menu.pety.pojistka', { n: doPojistky(pety) }));
  const pokladna = prvek('small', 'lihen-duse');
  pokladna.append(obrazekSpritu('duse', 2), t('menu.duse', { n: duse }));
  const otevrit = tlacitko(t('menu.pety.otevrit'), 'lihen-otevrit');
  const koupit = tlacitko('', 'lihen-koupit');
  koupit.append(t('menu.pety.koupit'), prvek('span', 'lihen-cena'));
  koupit.lastChild.append(obrazekSpritu('duse', 2), String(CENA_VEJCE));
  if (duse < CENA_VEJCE) koupit.classList.add('nejde');
  if (!pety.vejce) otevrit.classList.add('nejde');
  const tlacitka = prvek('div', 'radek-tlacitek lihen-tlacitka');
  tlacitka.append(otevrit, koupit);
  info.append(pocet, pojistka, pokladna, tlacitka);
  const vysledek = prvek('div', 'lihen-vysledek');
  vysledek.setAttribute('role', 'status');
  vysledek.hidden = true;
  lihen.append(vyklenek, info, vysledek);
  panel.append(lihen);

  // ---------- Sbírka ----------
  const { druhu, celkem } = prehledPetu(pety);
  const stav = prvek('div', 'sbirka-stav');
  const text = prvek('span', '', t('menu.sbirka.objeveno'));
  text.append(prvek('b', '', String(druhu)), t('menu.sbirka.zCelkem', { n: celkem }));
  const pruh = prvek('span', 'pruh-postupu sbirka-pruh');
  pruh.style.setProperty('--dilku', String(celkem));
  const vypln = prvek('i');
  vypln.style.width = `${(druhu / celkem) * 100}%`;
  pruh.append(vypln);
  stav.append(text, pruh);
  const mrizka = prvek('div', 'pety-mrizka');
  for (const id of PORADI_PETU) {
    const mam = pety.sbirka[id];
    const kus = prvek('button', `pet-kus ${mam ? `rarita-${mam.rarita}` : 'neznamy'}${pety.aktivni === id ? ' zvolena' : ''}`);
    kus.type = 'button';
    kus.dataset.pet = id;
    const misto = prvek('span', 'pet-vyklenek');
    const obr = obrazekSpritu(`pet_${id}`, 4);
    if (!mam) obr.classList.add('stin');
    misto.append(obr);
    const popis = prvek('span', 'pet-text');
    if (mam) {
      const radek = prvek('small', 'pet-rarita', `${RARITY[mam.rarita].nazev} · ${t('menu.pety.uroven', { n: mam.uroven })}`);
      popis.append(prvek('b', '', PETY[id].nazev), radek, dilkyUrovne(mam.uroven), prvek('small', 'pet-bonus', popisPetu(id, mam.rarita, mam.uroven)));
    } else {
      popis.append(prvek('b', '', '???'), prvek('small', 'pet-bonus', t('menu.pety.neznamy')));
    }
    kus.append(misto, popis);
    if (pety.aktivni === id) kus.append(prvek('span', 'pet-aktivni', t('menu.pety.aktivni')));
    kus.addEventListener('click', () => {
      if (!mam) return odmitni(kus);
      odemkniZvuk();
      const novy = zvolPeta(nactiPety(), nactiPety().aktivni === id ? null : id);
      ulozPety(novy);
      zvukHry('vyber');
      prekresli(panel, `[data-pet="${id}"]`);
    });
    mrizka.append(kus);
  }
  panel.append(stav, mrizka, prvek('p', 'pety-napoveda', t(pety.aktivni ? 'menu.pety.napovedaAktivni' : 'menu.pety.napoveda')));

  // ---------- Nákup a otevření ----------
  koupit.addEventListener('click', () => {
    zastavAnimaci();
    const nakup = kupVejce(nactiPety(), nactiDuse().duse);
    if (!nakup) return odmitni(koupit);
    odemkniZvuk();
    ulozDuse({ ...nactiDuse(), duse: nakup.duse });
    ulozPety(nakup.pety);
    zvukNakupu();
    prekresli(panel, '.lihen-koupit');
  });

  otevrit.addEventListener('click', () => {
    if (animace) return zastavAnimaci();
    const otevreni = otevriVejce(nactiPety(), Math.random(), Math.random());
    if (!otevreni) return odmitni(otevrit);
    odemkniZvuk();
    const { pety: novy, vysledek: v } = otevreni;
    ulozPety(novy);
    if (v.duse) ulozDuse({ ...nactiDuse(), duse: nactiDuse().duse + v.duse });
    const stupen = PORADI_RARIT.indexOf(v.rarita);
    const casovace = [];
    animace = {
      casovace,
      hotovo() {
        // Po animaci (nebo přeskočení) se okno překreslí s novou sbírkou a vylíhnutým petem ve výklenku. Když už je
        // v menu jiná záložka (stejný panel), nic se nekreslí.
        if (!lihen.isConnected) return;
        prekresli(panel, '.lihen-otevrit');
        ukazVylihnuti(panel, v, false);
      },
    };
    vysledek.hidden = true;
    vyklenek.className = 'lihen-vyklenek dycha';
    vejce.classList.remove('stin', 'houpe-1', 'houpe-2', 'houpe-3');
    const prasklina = prvek('i', 'lihen-prask');
    vyklenek.replaceChildren(vejce, prasklina);
    const kdyz = (fn) => () => { if (lihen.isConnected) fn(); };
    for (let i = 0; i < 3; i++) {
      casovace.push(setTimeout(kdyz(() => {
        vyklenek.className = `lihen-vyklenek${i > 0 && stupen > 0 ? ` prosvita rarita-${v.rarita}${i > 1 ? ' silne' : ''}` : ' dycha'} prask-${i + 1}`;
        vejce.classList.remove('houpe-1', 'houpe-2', 'houpe-3');
        vejce.classList.add(`houpe-${i + 1}`);
        zatres(vejce);
        zvukHry('tukVejce', i);
      }), i * TRES));
    }
    casovace.push(setTimeout(kdyz(() => {
      const scena = prvek('span', 'lihen-scena');
      const leva = obrazekSpritu('vejce_praskle', MERITKO_VEJCE);
      const prava = obrazekSpritu('vejce_praskle', MERITKO_VEJCE);
      leva.className = 'pixel lihen-vejce skorapka leva';
      prava.className = 'pixel lihen-vejce skorapka prava';
      scena.append(leva, prava);
      // Střepy vyletí do stran (světlá skořápka a zlatá skvrna). Čísla jsou pixely, ne náhoda ze hry.
      for (const [x, y, tmavy] of [[-22, -18, 0], [20, -22, 1], [-16, 10, 0], [18, 8, 1], [-4, -26, 0], [6, -6, 1]]) {
        const s = prvek('i', tmavy ? 'lihen-strep tmavy' : 'lihen-strep');
        s.style.setProperty('--x', `${x}px`);
        s.style.setProperty('--y', `${y}px`);
        scena.append(s);
      }
      vyklenek.classList.remove('dycha');
      vyklenek.classList.add('prasklo');
      vyklenek.replaceChildren(scena);
      zvukHry('praskVejce');
    }), PRASKNUTI));
    casovace.push(setTimeout(kdyz(() => {
      ukazVylihnuti(panel, v, true);
      zvukHry('vylihnuti', stupen);
    }), VYLIHNUTI));
    casovace.push(setTimeout(() => {
      const a = animace;
      animace = null;
      if (a) a.hotovo();
    }, VYLIHNUTI + 900));
  });
  // Klik na vejce během animace ji přeskočí.
  vyklenek.addEventListener('click', () => { if (animace) zastavAnimaci(); });
}

// Vylíhnutý pet ve výklenku (s zablesk záblesk v barvě rarity) a cedulka v barvě rarity peta: štítek rarity, jméno,
// co se stalo a bonus.
function ukazVylihnuti(panel, v, zablesk) {
  const vyklenek = panel.querySelector('.lihen-vyklenek');
  const vysledek = panel.querySelector('.lihen-vysledek');
  if (!vyklenek || !vysledek) return;
  vyklenek.className = `lihen-vyklenek vylihnuto rarita-${v.raritaPeta}${zablesk ? ' zablesk' : ''}`;
  const obr = obrazekSpritu(`pet_${v.druh}`, MERITKO_VEJCE);
  if (zablesk) obr.classList.add('vykoukne');
  vyklenek.replaceChildren(obr);
  vysledek.className = `lihen-vysledek rarita-${v.raritaPeta}${zablesk ? ' prilet' : ''}`;
  vysledek.replaceChildren(
    prvek('span', 'lihen-stitek', RARITY[v.raritaPeta].nazev),
    prvek('b', '', PETY[v.druh].nazev),
    prvek('small', 'lihen-zmena', textVysledku(v)),
    prvek('small', 'pet-bonus', popisPetu(v.druh, v.raritaPeta, v.uroven)),
  );
  vysledek.hidden = false;
}

// Překreslí okno a vybere stejné tlačítko jako před tím.
function prekresli(panel, vyber) {
  panel.replaceChildren();
  vyplnPety(panel);
  vyberTlacitko(panel.querySelector(vyber) ?? panel.querySelector('button'));
}
