// Hlavní menu: pixelové logo, tlačítka a záložky. Jen DOM a vstup, pravidla hry sem nepatří.
// Novou záložku přidáš do ZALOZKY (nazev + vypln(panel)), tlačítko i ovládání šipkami se udělají samy.
// Tlačítka, která záložka do panelu přidá, jdou taky vybírat šipkami a Enterem.
import { sprity } from './sprity.js';
import { TRIDY, ZBRANE, BOSSOVE, platnaTrida, silaHrozby, obtiznostMapy, poradiBossu } from './hra.js';
import {
  nactiRekord, nactiTridu, ulozTridu, nactiDuse, ulozDuse, nactiNastaveni, ulozNastaveni, nactiSbirku, nactiMapu, ulozMapu,
  odemceneMapy, zajistiProfily, seznamProfilu, aktivniProfil, vytvorProfil, prejmenujProfil, prepniProfil, smazProfil,
  dataProfilu, importujProfil, prehledProfilu, prehledDat, MAX_PROFILU, MAX_JMENA,
} from './ulozeni.js';
import { kodProfilu, souborProfilu, nazevSouboru, prectiKod, PRIPONA_SOUBORU, MAX_DELKA_KODU } from './prenos.js';
import { MAPY, PORADI_MAP, ODEMKNUTI_MAPY, predchoziMapa } from './mapy.js';
import { nahledMapy, kresliPodlahu } from './louka.js';
import { VYLEPSENI, cenaVylepseni, kupVylepseni, vratDuse, utraceno } from './duse.js';
import {
  VYBAVA, PORADI_SAD, PORADI_SLOTU, SLOTY, VSECHNY_KUSY, RARITY_VYBAVY, EFEKTY_VYBAVY, idKusu, vytvorKus, radkyStatu,
  popisEfektu, popisSady,
} from './vystroj.js';
import { odemkniZvuk, zvukNakupu, zvukOdmitnuti, zvukHry, nastavZvuk, ukazkaHudby } from './zvuk.js';
import { nakresliText, STYL_LOGA, STYL_PERGAMEN, pixelovyNadpis, prizpusobNadpisy } from './pismo.js';

// Profily: při prvním spuštění se stará uložení převedou do prvního profilu (ulozeni.js), pak se načte zvolený.
zajistiProfily();

// Zvolená třída hrdiny: načte se z prohlížeče (ze zvoleného profilu) a mění se v záložce Postavy. Hra ji bere při startu.
let trida = nactiTridu();

export function zvolenaTrida() {
  return trida;
}

// Zvolená mapa: načte se z prohlížeče a mění se v záložce Mapy (jen na odemčenou). Hra ji bere při startu.
let mapa = nactiMapu();

export function zvolenaMapa() {
  return mapa;
}

// Nastavení (čísla poškození, hlasitost efektů a hudby, ztlumení): načte se z prohlížeče, mění ho Nastavení
// nebo pauza (a klávesa N). Hlasitosti se hned předají zvuku.
let nastaveni = nactiNastaveni();
nastavZvuk(nastaveni);

export function cislaPoskozeni() {
  return nastaveni.cislaPoskozeni;
}

export function formatCas(s) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

// Zvětšená kopie spritu jako obrázek do stránky (originál zůstává pro kreslení hry).
export function obrazekSpritu(jmeno, meritko = 4) {
  const zdroj = sprity[jmeno];
  const c = prvek('canvas', 'pixel');
  c.width = zdroj.width;
  c.height = zdroj.height;
  c.getContext('2d').drawImage(zdroj, 0, 0);
  c.style.width = `${zdroj.width * meritko}px`;
  c.style.height = `${zdroj.height * meritko}px`;
  return c;
}

// Ikona mapy do cedulky v menu: kousek podlahy té mapy 8×8 s tmavým obrysem, ve stejném měřítku jako sprity.
// Z podlahy 64×64 se vezme výřez s největším kontrastem (květina v trávě, láva ve skále, krystal v jeskyni),
// ať je mapa poznat i tam, kde je podlaha tmavá.
const ikonyMap = new Map();

function vyrezMapy(id) {
  if (ikonyMap.has(id)) return ikonyMap.get(id);
  const S = 64;
  const podlaha = document.createElement('canvas');
  podlaha.width = S;
  podlaha.height = S;
  const g = podlaha.getContext('2d');
  g.imageSmoothingEnabled = false;
  kresliPodlahu(g, id, 0, 0, S, S, 16);
  const data = g.getImageData(0, 0, S, S).data;
  const jas = (x, y) => {
    const i = (y * S + x) * 4;
    return 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
  };
  let nej = [0, 0, -1];
  for (let y = 0; y <= S - 8; y += 2) {
    for (let x = 0; x <= S - 8; x += 2) {
      let soucet = 0;
      let ctverce = 0;
      for (let dy = 0; dy < 8; dy++) {
        for (let dx = 0; dx < 8; dx++) {
          const j = jas(x + dx, y + dy);
          soucet += j;
          ctverce += j * j;
        }
      }
      const prumer = soucet / 64;
      const skore = Math.sqrt(Math.max(0, ctverce / 64 - prumer * prumer)) + prumer * 0.25;
      if (skore > nej[2]) nej = [x, y, skore];
    }
  }
  const vyrez = [podlaha, nej[0], nej[1]];
  ikonyMap.set(id, vyrez);
  return vyrez;
}

function ikonaMapy(id, meritko = 3) {
  const [podlaha, x, y] = vyrezMapy(id);
  const c = prvek('canvas', 'pixel');
  c.width = 10;
  c.height = 10;
  const o = c.getContext('2d');
  o.fillStyle = '#140c08';
  o.fillRect(0, 0, 10, 10);
  o.drawImage(podlaha, x, y, 8, 8, 1, 1, 8, 8);
  c.style.width = `${10 * meritko}px`;
  c.style.height = `${10 * meritko}px`;
  return c;
}

// Výklenek na kartě: sprite postavy stojí na prkně podlahy (Postavy, Profil).
function portret(jmeno, meritko = 5) {
  const vyklenek = prvek('span', 'trida-portret');
  vyklenek.append(obrazekSpritu(jmeno, meritko));
  return vyklenek;
}

// Karta třídy je tlačítko: klik (nebo Enter) třídu zvolí a uloží, zvolená karta má mosazné kování a cedulku.
function vyplnPostavy(panel) {
  const mrizka = prvek('div', 'mrizka-trid');
  const karty = Object.entries(TRIDY).map(([id, t]) => {
    const karta = prvek('button', 'trida');
    karta.type = 'button';
    karta.dataset.trida = id;
    const zbran = ZBRANE[t.zbran];
    const zacina = prvek('small', 'trida-zbran', 'Začíná: ');
    zacina.append(obrazekSpritu(zbran.ikona, 2), prvek('span', '', zbran.nazev));
    const text = prvek('span', 'trida-text');
    text.append(
      prvek('b', '', t.nazev),
      zacina,
      prvek('small', 'trida-vyhoda', t.vyhoda),
      prvek('small', '', t.popis),
    );
    karta.append(portret(id), text, prvek('span', 'trida-stitek', 'Zvoleno'));
    karta.addEventListener('click', () => {
      trida = platnaTrida(id);
      ulozTridu(trida);
      oznacZvolenou();
    });
    return karta;
  });
  function oznacZvolenou() {
    for (const k of karty) {
      const zvolena = k.dataset.trida === trida;
      k.classList.toggle('zvolena', zvolena);
      k.setAttribute('aria-pressed', String(zvolena));
    }
  }
  oznacZvolenou();
  mrizka.append(...karty);
  panel.append(prvek('p', 'podtitul', 'Vyber, za koho půjdeš do hlubin. Volba se zapamatuje.'), mrizka);
}

// Pruh postupu: zapuštěný, dílků je tolik, kolik je celkem (mapy po minutách, sbírka po kusech).
function pruhPostupu(trida, hodnota, celkem, dilku = celkem) {
  const pruh = prvek('span', `pruh-postupu ${trida}`.trim());
  pruh.style.setProperty('--dilku', String(Math.max(1, dilku)));
  const vypln = prvek('i');
  vypln.style.width = `${celkem > 0 ? Math.min(100, (hodnota / celkem) * 100) : 0}%`;
  pruh.append(vypln);
  return pruh;
}

// Řádek karty s pixelovou ikonou vlevo (boss, lebka obtížnosti, zámek).
function radekSIkonou(trida, ikona, ...obsah) {
  const r = prvek('small', `s-ikonou ${trida}`.trim());
  const misto = prvek('span', 'ikona-radku');
  misto.append(ikona);
  r.append(misto, ...obsah);
  return r;
}

// Karta mapy je tlačítko jako karta třídy: náhled podlahy s nepřáteli v dřevěném okénku, jméno v barvě mapy, popis,
// hlavní boss (s jeho spritem), o kolik je mapa těžší a rekord. Zamčená karta má přes náhled zámek, říká, co ji
// odemkne, a pruhem ukazuje, kolik z potřebného času už hráč na předchozí mapě vydržel. Klik na ni jen zatřese.
function vyplnMapy(panel) {
  const odemcene = odemceneMapy();
  const mrizka = prvek('div', 'mrizka-map');
  const karty = PORADI_MAP.map((id) => {
    const m = MAPY[id];
    const odemcena = odemcene.includes(id);
    const karta = prvek('button', odemcena ? 'trida mapa' : 'trida mapa zamcena');
    karta.type = 'button';
    karta.dataset.mapa = id;
    karta.style.setProperty('--mapa', m.barva);
    const okno = prvek('span', 'mapa-nahled');
    const nahled = nahledMapy(id);
    nahled.classList.add('pixel');
    okno.append(nahled);
    if (!odemcena) okno.append(obrazekSpritu('zamek', 4));
    const text = prvek('span', 'trida-text');
    text.append(prvek('b', '', m.nazev), prvek('small', 'mapa-popis', m.popis));
    const boss = poradiBossu(id)[0];
    const jmenoBosse = prvek('span', '', 'Hlavní boss: ');
    jmenoBosse.append(prvek('em', '', BOSSOVE[boss].nazev));
    text.append(radekSIkonou('mapa-boss', obrazekSpritu(boss, 1), jmenoBosse));
    const ob = obtiznostMapy(id);
    if (ob.zivoty > 1 || ob.poskozeni > 1) {
      // pevná mezera, ať se % neodtrhne od čísla
      const procent = (x) => `+${Math.round((x - 1) * 100)} %`;
      text.append(radekSIkonou('mapa-obtiznost', obrazekSpritu('lebka', 2),
        prvek('span', '', `Těžší: nepřátelé ${procent(ob.zivoty)} životů a ${procent(ob.poskozeni)} poškození`)));
    }
    const rekord = nactiRekord(id);
    if (odemcena) {
      const radek = prvek('small', 'mapa-rekord', rekord ? 'Rekord ' : 'Zatím bez rekordu');
      if (rekord) radek.append(prvek('em', '', formatCas(rekord.cas)));
      text.append(radek);
    } else {
      const pred = predchoziMapa(id);
      const nejlepe = nactiRekord(pred)?.cas ?? 0;
      text.append(radekSIkonou('mapa-zamek', obrazekSpritu('zamek', 2),
        prvek('span', '', `Zamčeno: přežij ${formatCas(ODEMKNUTI_MAPY)} na mapě ${MAPY[pred].nazev}`)));
      if (nejlepe > 0) {
        // Postup k odemčení: pruh rozdělený po minutách, vedle nejlepší čas na předchozí mapě.
        const postup = prvek('small', 'mapa-postup');
        const pruh = pruhPostupu('', nejlepe, ODEMKNUTI_MAPY, Math.round(ODEMKNUTI_MAPY / 60));
        postup.append(pruh, prvek('span', '', `zatím ${formatCas(nejlepe)} z ${formatCas(ODEMKNUTI_MAPY)}`));
        text.append(postup);
      }
    }
    karta.append(okno, text, prvek('span', 'trida-stitek', 'Zvoleno'));
    karta.setAttribute('aria-label', `${m.nazev}${odemcena ? '' : ', zamčeno'}`);
    karta.addEventListener('click', () => {
      if (!odemcena) {
        odemkniZvuk();
        zvukOdmitnuti();
        karta.classList.remove('zatrast');
        void karta.offsetWidth;
        karta.classList.add('zatrast');
        return;
      }
      mapa = id;
      ulozMapu(id);
      oznacZvolenou();
    });
    return karta;
  });
  function oznacZvolenou() {
    for (const k of karty) {
      const zvolena = k.dataset.mapa === mapa;
      k.classList.toggle('zvolena', zvolena);
      k.setAttribute('aria-pressed', String(zvolena));
    }
  }
  oznacZvolenou();
  mrizka.append(...karty);
  panel.append(
    prvek('p', 'podtitul', `Kde budeš přežívat. Další mapa se odemkne, když na té předchozí vydržíš ${formatCas(ODEMKNUTI_MAPY)}.`),
    mrizka,
  );
}

// 1–4 duše, jinak duší (0 duší, 5 duší).
export function pocetDusi(kolik) {
  return kolik >= 1 && kolik <= 4 ? 'duše' : 'duší';
}

// Obchod s trvalými vylepšeními. Karta je tlačítko: klik (nebo Enter) koupí další úroveň, když jsou duše.
// Nahoře zapuštěná pokladnička s dušemi, karta má ikonu (sprite jako ve hře), úrovně jako dílky a dole cenovku;
// když duše nestačí, cenovka řekne, kolik chybí. Vrátit duše chce dva stisky, první se jen zeptá.
// Po každé změně se panel překreslí a výběr zůstane na místě.
function vyplnVylepseni(panel) {
  const stav = nactiDuse();
  const hlava = prvek('div', 'duse-stav');
  hlava.append(obrazekSpritu('duse', 3), prvek('span', 'duse-stav-text', 'Máš '));
  hlava.lastChild.append(prvek('b', '', String(stav.duse)), ` ${pocetDusi(stav.duse)}`);
  const mrizka = prvek('div', 'mrizka-vylepseni');
  const prekresli = (vybrat) => {
    panel.replaceChildren();
    vyplnVylepseni(panel);
    vyberTlacitko(panel.querySelector(`${vybrat}:not(:disabled)`) ?? panel.querySelector('button'));
  };
  for (const [id, v] of Object.entries(VYLEPSENI)) {
    const uroven = stav.vylepseni[id] ?? 0;
    const cena = cenaVylepseni(id, uroven);
    const karta = prvek('button', 'vylepseni');
    karta.type = 'button';
    karta.dataset.vylepseni = id;
    if (v.max === 1) karta.classList.add('jednou');
    if (cena === null) karta.classList.add('hotovo');
    else if (cena > stav.duse) karta.classList.add('drahe');
    const ikona = prvek('span', 'vylepseni-ikona');
    ikona.append(obrazekSpritu(v.ikona, 3));
    const nazev = prvek('span', 'vylepseni-hlava');
    nazev.append(prvek('b', '', v.nazev), prvek('span', 'vylepseni-uroven', `${uroven}/${v.max}`));
    const ctverecky = prvek('span', 'ctverecky');
    for (let i = 0; i < v.max; i++) ctverecky.append(prvek('i', i < uroven ? 'plny' : ''));
    const cenovka = prvek('span', 'cena');
    if (cena === null) cenovka.textContent = 'Hotovo';
    else {
      cenovka.append(obrazekSpritu('duse', 2), prvek('b', '', String(cena)));
      if (cena > stav.duse) cenovka.append(prvek('small', 'cena-chybi', `chybí ${cena - stav.duse}`));
    }
    karta.append(ikona, nazev, ctverecky, prvek('small', 'vylepseni-popis', v.popis), cenovka);
    karta.setAttribute('aria-label', `${v.nazev}, úroveň ${uroven} z ${v.max}, ${cena === null ? 'hotovo' : `cena ${cena} ${pocetDusi(cena)}${cena > stav.duse ? `, chybí ${cena - stav.duse}` : ''}`}`);
    karta.addEventListener('click', () => {
      odemkniZvuk();
      const novy = kupVylepseni(nactiDuse(), id);
      if (!novy) {
        zvukOdmitnuti();
        karta.classList.remove('zatrast');
        void karta.offsetWidth;
        karta.classList.add('zatrast');
        return;
      }
      ulozDuse(novy);
      zvukNakupu();
      prekresli(`[data-vylepseni="${id}"]`);
    });
    mrizka.append(karta);
  }
  const vratit = utraceno(stav.vylepseni);
  const tlacitkoVratit = prvek('button', 'menu-tlacitko vratit', vratit ? `Vrátit duše (${vratit})` : 'Není co vracet');
  tlacitkoVratit.type = 'button';
  tlacitkoVratit.disabled = !vratit;
  tlacitkoVratit.dataset.vylepseni = 'vratit';
  tlacitkoVratit.addEventListener('click', () => {
    if (!vratit) return;
    if (!tlacitkoVratit.classList.contains('potvrdit')) {
      tlacitkoVratit.classList.add('potvrdit');
      tlacitkoVratit.textContent = `Opravdu? Vrátí se ${vratit} ${pocetDusi(vratit)}`;
      return;
    }
    ulozDuse(vratDuse(nactiDuse()));
    prekresli('[data-vylepseni="vratit"]');
  });
  const radek = prvek('div', 'radek-tlacitek vratit-radek');
  radek.append(tlacitkoVratit);
  panel.append(
    prvek('p', 'podtitul', 'Za duše z každé výpravy si kup trvalou sílu. Platí od začátku každé hry.'),
    hlava,
    mrizka,
    radek,
  );
}

// Sbírka výbavy bossů: co hráč kdy našel (v nejlepší raritě), sada po sadě. Nahoře pruh, kolik je objeveno.
// Sada je destička v tenkém rámu s truhlou bosse, čtyři kusy jsou 2×2 jako sloty výbavy ve hře, rámeček kusu
// má barvu nejlepší nalezené rarity. Neobjevený kus je jen stín a ???. Dole bonusy za 2 a 4 kusy se štítky.
function vyplnSbirku(panel) {
  const sbirka = nactiSbirku();
  // pevná mezera před %, ať se procenta neodtrhnou od čísla (+6,5 % zbroj)
  const pevne = (text) => text.replace(/ %/g, ' %');
  const objeveno = Object.keys(sbirka).length;
  const stav = prvek('div', 'sbirka-stav');
  const text = prvek('span', '', 'Objeveno ');
  text.append(prvek('b', '', String(objeveno)), ` z ${VSECHNY_KUSY.length}`);
  stav.append(text, pruhPostupu('sbirka-pruh', objeveno, VSECHNY_KUSY.length));
  panel.append(
    prvek('p', 'podtitul', 'Výbava z truhel bossů platí jen v jedné hře. Tady je všechno, co jsi kdy našel, v nejlepší raritě.'),
    stav,
  );
  for (const boss of PORADI_SAD) {
    const sada = VYBAVA[boss];
    const nalezeno = PORADI_SLOTU.filter((slot) => sbirka[idKusu(boss, slot)]).length;
    const blok = prvek('section', `sbirka-sada${nalezeno === PORADI_SLOTU.length ? ' cela' : ''}`);
    const hlava = prvek('div', 'sbirka-hlava');
    const truhla = obrazekSpritu(sprity[`truhla_${boss}`] ? `truhla_${boss}` : 'truhla', 2);
    hlava.append(truhla, prvek('b', '', sada.sada), prvek('span', 'sbirka-pocet', `${nalezeno}/${PORADI_SLOTU.length}`));
    const efekt = prvek('small', 'sbirka-efekt');
    efekt.append(prvek('b', '', `${EFEKTY_VYBAVY[sada.efekt].nazev}: `), pevne(popisEfektu(boss, 1)));
    blok.append(hlava, efekt);
    const mrizka = prvek('div', 'sbirka-mrizka');
    for (const slot of PORADI_SLOTU) {
      const id = idKusu(boss, slot);
      const rarita = sbirka[id];
      const kus = rarita ? vytvorKus(boss, slot, rarita) : null;
      const dlazdice = prvek('div', `sbirka-kus ${kus ? `rarita-${rarita}` : 'neznamy'}`);
      const vyklenek = prvek('span', 'sbirka-vyklenek');
      const obr = obrazekSpritu(id, 4);
      if (!kus) obr.classList.add('stin');
      vyklenek.append(obr);
      const popis = prvek('span', 'sbirka-text');
      popis.append(prvek('b', '', kus ? kus.nazev : '???'), prvek('small', '', kus ? `${SLOTY[slot].nazev} · ${RARITY_VYBAVY[rarita].nazev}` : SLOTY[slot].nazev));
      if (kus) popis.append(prvek('small', 'sbirka-staty', pevne(radkyStatu(kus.staty).join(', '))));
      dlazdice.append(vyklenek, popis);
      mrizka.append(dlazdice);
    }
    const bonusy = prvek('div', 'sbirka-bonusy');
    for (const radek of popisSady(boss)) {
      const dvojtecka = radek.indexOf(':');
      const b = prvek('small', 'sbirka-bonus');
      b.append(prvek('span', 'sbirka-bonus-stitek', radek.slice(0, dvojtecka)), pevne(radek.slice(dvojtecka + 1).trim()));
      bonusy.append(b);
    }
    blok.append(mrizka, bonusy);
    panel.append(blok);
  }
}

// Rekordy: každá mapa má svou destičku. Hlavička: ikona mapy (kousek její podlahy), jméno v barvě mapy a kdy.
// Vlevo nejdelší přežití velkým pixelovým písmem jako nadpisy, vpravo postava (se spritem), hrozba, úroveň
// a zabití. Mapa bez rekordu to jen řekne, zamčená má šedou ikonu, zámek a co ji odemkne.
function vyplnRekordy(panel) {
  const odemcene = odemceneMapy();
  panel.append(prvek('p', 'podtitul', `Nejlepší výpravy profilu ${aktivniProfil().jmeno}, každá mapa zvlášť`));
  for (const id of PORADI_MAP) {
    const odemcena = odemcene.includes(id);
    const rekord = odemcena ? nactiRekord(id) : null;
    const blok = prvek('section', `rekord-mapy${odemcena ? '' : ' zamcena'}${rekord ? '' : ' prazdna'}`);
    blok.style.setProperty('--mapa', MAPY[id].barva);
    const hlava = prvek('div', 'rekord-hlava');
    hlava.append(ikonaMapy(id, 3), prvek('h3', '', MAPY[id].nazev));
    const kdy = rekord?.datum ? new Date(rekord.datum) : null;
    if (kdy && !Number.isNaN(kdy.getTime())) hlava.append(prvek('span', 'rekord-kdy', kdy.toLocaleDateString('cs-CZ')));
    if (!odemcena) hlava.append(obrazekSpritu('zamek', 2));
    blok.append(hlava);
    if (!odemcena) blok.append(prvek('p', 'rekord-prazdny', `Zamčeno: přežij ${formatCas(ODEMKNUTI_MAPY)} na mapě ${MAPY[predchoziMapa(id)].nazev}`));
    else if (!rekord) blok.append(prvek('p', 'rekord-prazdny', 'Zatím žádný rekord. Dej Hrát a vydrž co nejdéle.'));
    else blok.append(teloRekordu(rekord));
    panel.append(blok);
  }
}

function teloRekordu(rekord) {
  const telo = prvek('div', 'rekord-telo');
  const cas = prvek('div', 'rekord-cas');
  const cislo = prvek('span', 'rekord-cas-cislo');
  pixelovyNadpis(cislo, formatCas(rekord.cas), { min: 3, max: 4 });
  cas.append(prvek('small', '', 'Nejdelší přežití'), cislo);
  const staty = prvek('dl', 'rekord-staty');
  const pridej = (nazev, hodnota, ikona = null) => {
    const dd = prvek('dd');
    if (ikona) dd.append(ikona);
    dd.append(String(hodnota));
    staty.append(prvek('dt', '', nazev), dd);
  };
  if (Object.hasOwn(TRIDY, rekord.trida ?? '')) pridej('Postava', TRIDY[rekord.trida].nazev, obrazekSpritu(rekord.trida, 2));
  // Starší rekordy hrozbu nemají, ta se dopočítá z času (každá minuta +1).
  pridej('Hrozba', Number.isInteger(rekord.hrozba) ? rekord.hrozba : silaHrozby(rekord.cas).uroven);
  pridej('Úroveň', rekord.uroven ?? '–');
  pridej('Zabito', rekord.zabito ?? '–');
  telo.append(cas, staty);
  return telo;
}

// Ovládání po skupinách: [nadpis, řádky [klávesy, co dělají]].
const OVLADANI = [
  ['Pohyb', [
    [['W', 'A', 'S', 'D'], 'pohyb'],
    [['šipky'], 'pohyb'],
    [['tah prstem'], 'pohyb na mobilu'],
  ]],
  ['Ve hře', [
    [['1', '2', '3'], 'výběr vylepšení (nebo klik, šipky a Enter)'],
    [['1', '2'], 'výbava z truhly: vzít nový kus, nebo nechat nasazený'],
    [['R'], 'přehodit karty za zlaťáky (nebo zdarma od kupce)'],
    [['1–5'], 'u kupce koupit zboží (Esc nebo Q odejít)'],
    [['P', 'Esc'], 'pauza'],
    [['N'], 'ztlumit nebo zapnout zvuk (hlasitost je v Nastavení)'],
  ]],
  ['Menu a konec hry', [
    [['↑', '↓', 'Enter'], 'výběr v menu'],
    [['Esc'], 'zpět v menu'],
    [['R'], 'znovu po prohře'],
    [['M'], 'menu po prohře'],
  ]],
];

// Skupina v Ovládání, Nastavení a pauze: destička v tenkém rámu s nadpisem světlým pixelovým písmem.
export function skupina(nazev, trida = '') {
  const sekce = prvek('section', `skupina ${trida}`.trim());
  const nadpis = prvek('h3', 'skupina-nadpis');
  pixelovyNadpis(nadpis, nazev, { styl: STYL_PERGAMEN, min: 2, max: 2 });
  sekce.append(nadpis);
  return sekce;
}

// Přepínač je tlačítko: klik (nebo Enter) volbu otočí a hned uloží. Stejný je v Nastavení i v pauze.
export function prepinacNastaveni(klic, nazev) {
  const b = prvek('button', 'menu-tlacitko prepinac');
  b.type = 'button';
  b.dataset.nastaveni = klic;
  const stav = prvek('span', 'prepinac-stav');
  b.append(prvek('span', '', `${nazev}: `), stav);
  const ukaz = () => {
    const zapnuto = nastaveni[klic];
    stav.textContent = zapnuto ? 'zapnuto' : 'vypnuto';
    b.classList.toggle('vypnuto', !zapnuto);
    b.setAttribute('aria-pressed', String(zapnuto));
  };
  b.addEventListener('click', () => {
    nastaveni = { ...nastaveni, [klic]: !nastaveni[klic] };
    ulozNastaveni(nastaveni);
    ukaz();
  });
  ukaz();
  return b;
}

function zmenNastaveni(zmena) {
  nastaveni = { ...nastaveni, ...zmena };
  ulozNastaveni(nastaveni);
  nastavZvuk(nastaveni);
  for (const prvekZvuku of document.querySelectorAll('[data-zvuk]')) obnovy.get(prvekZvuku)?.();
}

// Jak se ovládání zvuku překreslí, když se nastavení změní jinde (klávesa N, druhé okno s ovládáním).
const obnovy = new WeakMap();
const KROK_HLASITOSTI = 10;
let ukazkaOd = 0;

// Řádek hlasitosti: název, −, pruh (klik nebo tah prstem ho nastaví po 5 %), procenta, +. Tlačítka mění o 10 %
// a jdou vybírat šipkami a Enterem. Změna se hned uloží a je slyšet krátká ukázka (hudba nejvýš 4× za sekundu).
function radekHlasitosti(klic, nazev) {
  const radek = prvek('div', 'hlasitost');
  radek.dataset.zvuk = klic;
  const minus = prvek('button', 'menu-tlacitko hlasitost-krok', '−');
  const plus = prvek('button', 'menu-tlacitko hlasitost-krok', '+');
  minus.type = 'button';
  plus.type = 'button';
  minus.setAttribute('aria-label', `${nazev} tišeji`);
  plus.setAttribute('aria-label', `${nazev} hlasitěji`);
  const pruh = prvek('span', 'hlasitost-pruh');
  pruh.setAttribute('role', 'slider');
  pruh.setAttribute('aria-label', `Hlasitost: ${nazev}`);
  pruh.setAttribute('aria-valuemin', '0');
  pruh.setAttribute('aria-valuemax', '100');
  const vypln = prvek('i');
  pruh.append(vypln);
  const cislo = prvek('b', 'hlasitost-cislo');
  const ukaz = () => {
    const v = nastaveni[klic];
    vypln.style.width = `${v}%`;
    cislo.textContent = v > 0 ? `${v} %` : 'vypnuto';
    pruh.setAttribute('aria-valuenow', String(v));
    radek.classList.toggle('nula', v === 0);
  };
  const nastav = (v, krok) => {
    const nova = Math.min(100, Math.max(0, Math.round(v / krok) * krok));
    if (nova === nastaveni[klic]) return;
    odemkniZvuk();
    zmenNastaveni({ [klic]: nova });
    if (klic === 'efekty') zvukHry('ukazka');
    else if (performance.now() - ukazkaOd > 250) {
      ukazkaOd = performance.now();
      ukazkaHudby();
    }
  };
  minus.addEventListener('click', () => nastav(nastaveni[klic] - KROK_HLASITOSTI, KROK_HLASITOSTI));
  plus.addEventListener('click', () => nastav(nastaveni[klic] + KROK_HLASITOSTI, KROK_HLASITOSTI));
  const podlePrstu = (e) => {
    const r = pruh.getBoundingClientRect();
    if (r.width > 0) nastav(((e.clientX - r.left) / r.width) * 100, 5);
  };
  pruh.addEventListener('pointerdown', (e) => {
    pruh.setPointerCapture?.(e.pointerId);
    podlePrstu(e);
  });
  pruh.addEventListener('pointermove', (e) => {
    if (e.buttons) podlePrstu(e);
  });
  obnovy.set(radek, ukaz);
  ukaz();
  radek.append(prvek('span', 'hlasitost-nazev', nazev), minus, pruh, cislo, plus);
  return radek;
}

// Klávesa N a přepínač Zvuk: ztlumí všechno (efekty i hudbu), hlasitosti zůstanou. Vrací, jestli je teď ztlumeno.
export function prepniZtlumeni() {
  zmenNastaveni({ ztlumeno: !nastaveni.ztlumeno });
  return nastaveni.ztlumeno;
}

// Ovládání zvuku pro Nastavení i pauzu: Efekty, Hudba a přepínač Zvuk (N).
export function ovladaniZvuku() {
  const box = prvek('div', 'zvuk-nastaveni');
  box.dataset.zvuk = 'vse';
  const prepinac = prvek('button', 'menu-tlacitko prepinac');
  prepinac.type = 'button';
  const stav = prvek('span', 'prepinac-stav');
  prepinac.append(prvek('span', '', 'Zvuk (N): '), stav);
  const ukaz = () => {
    const zapnuto = !nastaveni.ztlumeno;
    stav.textContent = zapnuto ? 'zapnutý' : 'vypnutý';
    prepinac.classList.toggle('vypnuto', !zapnuto);
    prepinac.setAttribute('aria-pressed', String(zapnuto));
    box.classList.toggle('ztlumeno', !zapnuto);
  };
  prepinac.addEventListener('click', () => {
    odemkniZvuk();
    prepniZtlumeni();
    if (!nastaveni.ztlumeno) zvukHry('ukazka');
  });
  obnovy.set(box, ukaz);
  ukaz();
  box.append(radekHlasitosti('efekty', 'Efekty'), radekHlasitosti('hudba', 'Hudba'), prepinac);
  return box;
}

// Ovládání: skupiny Pohyb, Ve hře a Menu pod sebou. Řádek = dřevěné klávesy vpravo zarovnané, vedle co dělají.
function vyplnOvladani(panel) {
  const mrizka = prvek('div', 'ovladani');
  for (const [nazev, radky] of OVLADANI) {
    const sekce = skupina(nazev);
    for (const [klavesy, co] of radky) {
      const radek = prvek('div', 'ovladani-radek');
      const kde = prvek('span', 'klavesy');
      kde.append(...klavesy.map((k) => prvek('kbd', '', k)));
      radek.append(kde, prvek('span', '', co));
      sekce.append(radek);
    }
    mrizka.append(sekce);
  }
  panel.append(
    prvek('p', 'podtitul', 'Zbraně střílí samy, ty jen uhýbáš a sbíráš krystaly.'), mrizka,
    prvek('p', 'podtitul ovladani-pata', 'Hlasitost a čísla poškození najdeš v Nastavení.'),
  );
}

// Nastavení: zvuk (hlasitost efektů a hudby, ztlumení N) a čísla poškození, každé ve své skupině.
// Všechno se hned uloží.
function vyplnNastaveni(panel) {
  const zvuk = skupina('Zvuk');
  zvuk.append(ovladaniZvuku());
  const hra = skupina('Hra');
  const radek = prvek('div', 'radek-tlacitek nastaveni-radek');
  radek.append(prepinacNastaveni('cislaPoskozeni', 'Čísla poškození'));
  hra.append(radek);
  panel.append(
    prvek('p', 'podtitul', 'Volby se hned uloží v tomhle prohlížeči a platí pro všechny profily. Stejné najdeš i v pauze.'),
    zvuk, hra,
  );
}

// Profil: každý profil má svoje duše, vylepšení, rekordy, sbírku a mapy (ulozeni.js), nastavení je společné.
// Karta profilu je tlačítko: klik (nebo Enter) na ni profil zvolí. Tlačítka pod kartami pracují se zvoleným
// profilem. Nový profil, přejmenování, export a import se otevřou ve stejném panelu ve skupině s pixelovým
// nadpisem, Esc nebo Zpět vrátí seznam. Smazat a přepsat chtějí dva stisky, první se jen zeptá (u smazání hlášení
// napíše, co všechno zmizí). Nic se neposílá na server (prenos.js).
const TEXTY_CHYB = {
  jmeno: 'Napiš jméno (aspoň jeden znak).',
  obsazene: 'Tohle jméno už má jiný profil.',
  plno: `Víc než ${MAX_PROFILU} profilů nejde. Nějaký smaž nebo přepiš.`,
  uloziste: 'Prohlížeč nedovolí ukládat (anonymní okno?), profil se neuloží.',
  neni: 'Ten profil už neexistuje.',
  prazdny: `Vlož kód uložení, nebo vyber soubor ${PRIPONA_SOUBORU}.`,
  format: 'Tohle není kód uložení RuGee.',
  neuplny: 'Kód je useknutý, chybí mu konec. Zkopíruj ho celý znovu.',
  soucet: 'Kód je poškozený nebo neúplný (nesedí kontrolní součet). Zkopíruj ho celý znovu.',
  verze: 'Kód je z jiné verze hry. Obnov stránku a zkus to znovu.',
  obsah: 'Kód je poškozený, data v něm nejdou přečíst.',
  soubor: 'Soubor nejde přečíst.',
};

// Panel záložky Profil, jestli je v něm otevřené podokno a z kterého tlačítka (po Zpět se na něj vrátí výběr).
let panelProfilu = null;
let podokno = null;

// Po přepnutí, smazání nebo importu profilu se načte jeho postava a mapa.
function obnovProfil() {
  trida = nactiTridu();
  mapa = nactiMapu();
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

function hlaseniProfilu(text = '', chyba = false) {
  const p = prvek('p', 'profil-hlaseni');
  p.setAttribute('role', 'status');
  ukazHlaseni(p, text, chyba);
  return p;
}

// Hlášení pod kartami a v podoknech: zelená kontrolka = hotovo, rudá = chyba, mosazná = varování (smazání).
function ukazHlaseni(p, text, chyba = false) {
  p.textContent = text;
  p.classList.toggle('chyba', chyba === true);
  p.classList.toggle('varovani', chyba === 'varovani');
}

function radekTlacitek(...tlacitka) {
  const radek = prvek('div', 'radek-tlacitek profil-radek');
  radek.append(...tlacitka);
  return radek;
}

// Do textového pole se píše, takže výběr šipkami z tlačítek zmizí (klávesy patří poli, viz main.js).
function zamerPole(pole) {
  for (const b of document.querySelectorAll('.vybrano')) b.classList.remove('vybrano');
  pole.focus();
}

// Obsah karty profilu (i náhledu importu): postava profilu ve výklenku jako v Postavách, jméno, duše (s ikonou)
// a postava, mapy, sbírka a nejdelší přežití.
function obsahKarty(karta, prehled, jmeno, stitek) {
  const text = prvek('span', 'trida-text');
  const duse = prvek('small', 'profil-duse');
  duse.append(obrazekSpritu('duse', 2), prvek('span', '', `${prehled.duse} ${pocetDusi(prehled.duse)} · ${TRIDY[prehled.trida].nazev}`));
  const rekord = prvek('small', 'profil-rekord', prehled.rekord ? 'Nejdelší přežití ' : 'Zatím bez rekordu');
  if (prehled.rekord) rekord.append(prvek('em', '', formatCas(prehled.rekord)));
  text.append(
    prvek('b', 'profil-jmeno', jmeno),
    duse,
    prvek('small', '', `Mapy ${prehled.mapy}/${PORADI_MAP.length} · sbírka ${prehled.sbirka}/${VSECHNY_KUSY.length}`),
    rekord,
  );
  karta.append(portret(prehled.trida, 4), text, prvek('span', 'trida-stitek', stitek));
}

function nahledDat(data) {
  const nahled = prvek('div', 'trida profil nahled zvolena');
  const prehled = prehledDat(data);
  obsahKarty(nahled, prehled, prehled.jmeno, 'V kódu');
  return nahled;
}

function vyplnProfil(panel, zprava = '', chyba = false) {
  panelProfilu = panel;
  podokno = null;
  panel.replaceChildren();
  const profily = seznamProfilu();
  const zvoleny = profily.find((p) => p.aktivni) ?? profily[0];
  const mrizka = prvek('div', 'mrizka-profilu');
  for (const p of profily) {
    const karta = prvek('button', 'trida profil');
    karta.type = 'button';
    karta.dataset.profil = String(p.slot);
    obsahKarty(karta, prehledProfilu(p.slot), p.jmeno, 'Hraješ');
    karta.classList.toggle('zvolena', p.aktivni);
    karta.setAttribute('aria-pressed', String(p.aktivni));
    karta.addEventListener('click', () => {
      if (p.aktivni) return;
      if (!prepniProfil(p.slot)) {
        vyplnProfil(panel, TEXTY_CHYB.neni, true);
        vyberTlacitko(panel.querySelector('.zvolena'));
        return;
      }
      obnovProfil();
      vyplnProfil(panel, `Hraješ za profil ${p.jmeno}.`);
      vyberTlacitko(panel.querySelector(`[data-profil="${p.slot}"]`));
    });
    mrizka.append(karta);
  }
  const hlaseni = hlaseniProfilu(zprava, chyba);
  const plno = profily.length >= MAX_PROFILU;
  const novy = tlacitko(plno ? `Plno (${MAX_PROFILU}/${MAX_PROFILU})` : 'Nový profil');
  novy.disabled = plno;
  novy.addEventListener('click', () => podoknoJmena(panel, null));
  const prejmenovat = tlacitko('Přejmenovat');
  prejmenovat.addEventListener('click', () => podoknoJmena(panel, zvoleny));
  const smazat = tlacitko('Smazat');
  smazat.disabled = profily.length < 2;
  if (smazat.disabled) smazat.title = 'Poslední profil smazat nejde';
  smazat.addEventListener('click', () => {
    if (!smazat.classList.contains('potvrdit')) {
      smazat.classList.add('potvrdit');
      smazat.textContent = `Opravdu smazat ${zvoleny.jmeno}?`;
      ukazHlaseni(hlaseni, `Smazáním zmizí duše, vylepšení, rekordy, sbírka i mapy profilu ${zvoleny.jmeno}. Stiskni znovu, nebo dej Zpět.`, 'varovani');
      return;
    }
    if (!smazProfil(zvoleny.slot)) {
      vyplnProfil(panel, 'Profil nejde smazat.', true);
    } else {
      obnovProfil();
      vyplnProfil(panel, `Profil ${zvoleny.jmeno} je smazaný. Hraješ za ${aktivniProfil().jmeno}.`);
    }
    vyberTlacitko(panel.querySelector('.zvolena'));
  });
  const exportovat = tlacitko('Exportovat');
  exportovat.addEventListener('click', () => podoknoExportu(panel));
  const importovat = tlacitko('Importovat');
  importovat.addEventListener('click', () => podoknoImportu(panel));
  const akce = prvek('div', 'profil-akce profil-akce-seznam');
  for (const [id, b] of Object.entries({ novy, prejmenovat, smazat, exportovat, importovat })) {
    b.dataset.akce = id;
    akce.append(b);
  }
  panel.append(
    prvek('p', 'podtitul', 'Každý profil má vlastní duše, vylepšení, rekordy, sbírku a mapy. Nastavení zvuku je společné.'),
    mrizka,
    hlaseni,
    akce,
    prvek('p', 'podtitul profil-pata', `Exportovat dá kód uložení a soubor ${PRIPONA_SOUBORU}, Importovat je nahraje v jiném prohlížeči nebo zařízení. Nic se neposílá na server.`),
  );
}

function otevriPodokno(panel, odkud) {
  podokno = odkud;
  panel.replaceChildren();
}

// Esc nebo Zpět v podokně: zpátky na seznam profilů, výběr na tlačítku, které podokno otevřelo.
function zpetZProfilu() {
  if (!podokno || !panelProfilu) return false;
  const odkud = podokno;
  vyplnProfil(panelProfilu);
  vyberTlacitko(panelProfilu.querySelector(`[data-akce="${odkud}"]:not(:disabled)`) ?? panelProfilu.querySelector('.zvolena'));
  return true;
}

// V textovém poli: Esc = zpět (klávesy z pole hra ani menu nedostanou).
function escZpet(pole) {
  pole.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      zpetZProfilu();
    }
  });
}

// Nový profil (profil = null) nebo přejmenování. Enter v poli potvrdí, i na mobilní klávesnici.
function podoknoJmena(panel, profil) {
  otevriPodokno(panel, profil ? 'prejmenovat' : 'novy');
  const formular = prvek('form', 'profil-formular');
  formular.noValidate = true;
  const pole = prvek('input', 'profil-pole');
  Object.assign(pole, {
    type: 'text', maxLength: MAX_JMENA, value: profil?.jmeno ?? '', placeholder: 'Jméno profilu', autocomplete: 'off', spellcheck: false,
  });
  pole.setAttribute('aria-label', 'Jméno profilu');
  pole.setAttribute('enterkeyhint', 'done');
  const hlaseni = hlaseniProfilu();
  const potvrdit = prvek('button', 'menu-tlacitko hlavni', profil ? 'Uložit jméno' : 'Založit profil');
  potvrdit.type = 'submit';
  formular.addEventListener('submit', (e) => {
    e.preventDefault();
    const vysledek = profil ? prejmenujProfil(profil.slot, pole.value) : vytvorProfil(pole.value);
    if (vysledek.chyba) {
      ukazHlaseni(hlaseni, TEXTY_CHYB[vysledek.chyba], true);
      odmitni(pole);
      zamerPole(pole);
      return;
    }
    if (!profil) {
      prepniProfil(vysledek.slot);
      obnovProfil();
    }
    vyplnProfil(panel, profil ? `Profil se teď jmenuje ${vysledek.jmeno}.` : `Profil ${vysledek.jmeno} je založený a hraješ za něj.`);
    vyberTlacitko(panel.querySelector('.zvolena'));
  });
  escZpet(pole);
  pole.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      vyberTlacitko(potvrdit);
    }
  });
  formular.append(pole, hlaseni, radekTlacitek(potvrdit));
  const sekce = skupina(profil ? 'Přejmenovat' : 'Nový profil', 'profil-sekce');
  sekce.append(formular);
  panel.append(
    prvek('p', 'podtitul', profil
      ? `Nové jméno pro profil ${profil.jmeno}, nejvýš ${MAX_JMENA} znaků.`
      : `Nový profil začne od nuly: bez duší, vylepšení, rekordů a sbírky. Jméno má nejvýš ${MAX_JMENA} znaků.`),
    sekce,
  );
  zamerPole(pole);
  pole.select();
}

async function zkopiruj(text, pole) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      pole.focus();
      pole.select();
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
}

function stahniSoubor(nazev, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
    const odkaz = prvek('a');
    odkaz.href = url;
    odkaz.download = nazev;
    odkaz.hidden = true;
    document.body.append(odkaz);
    odkaz.click();
    odkaz.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    return false;
  }
}

// Export zvoleného profilu: kód v poli (klepnutí ho celý označí), Kopírovat a Stáhnout soubor.
function podoknoExportu(panel) {
  otevriPodokno(panel, 'exportovat');
  const data = dataProfilu();
  const kod = kodProfilu(data);
  const pole = prvek('textarea', 'profil-kod');
  Object.assign(pole, { readOnly: true, rows: 5, value: kod, spellcheck: false });
  pole.setAttribute('aria-label', 'Kód uložení');
  pole.addEventListener('focus', () => pole.select());
  escZpet(pole);
  const hlaseni = hlaseniProfilu();
  const kopirovat = tlacitko('Kopírovat kód', 'hlavni');
  kopirovat.dataset.export = 'kopirovat';
  kopirovat.addEventListener('click', async () => {
    const povedlo = await zkopiruj(kod, pole);
    ukazHlaseni(hlaseni, povedlo
      ? 'Kód je ve schránce. V jiném zařízení ho vlož do Profil → Importovat.'
      : 'Zkopírovat nejde. Označ kód v poli a zkopíruj ho sám.', !povedlo);
    vyberTlacitko(kopirovat);
  });
  const soubor = nazevSouboru(data.jmeno);
  const stahnout = tlacitko(`Stáhnout ${PRIPONA_SOUBORU}`);
  stahnout.dataset.export = 'stahnout';
  stahnout.addEventListener('click', () => {
    const povedlo = stahniSoubor(soubor, souborProfilu(data));
    ukazHlaseni(hlaseni, povedlo ? `Stahuje se soubor ${soubor}.` : 'Stáhnout nejde, zkopíruj kód.', !povedlo);
  });
  const sekce = skupina('Export', 'profil-sekce');
  sekce.append(nahledDat(data), pole, hlaseni, radekTlacitek(kopirovat, stahnout));
  panel.append(
    prvek('p', 'podtitul', 'Tenhle kód přenese profil do jiného prohlížeče nebo zařízení: tam dej Profil → Importovat a kód vlož, nebo vyber stažený soubor. Nic se neposílá na server.'),
    sekce,
  );
  // Pole je vysoké přesně na celý kód (nejvýš 240 px, pak se v něm posouvá).
  pole.style.height = `${Math.min(240, pole.scrollHeight + 6)}px`;
  vyberTlacitko(kopirovat);
}

// Import: kód vložený do pole nebo soubor .rugee. Nejdřív se ukáže, co v kódu je, a pak se vybere, kam ho nahrát:
// jako nový profil, nebo přes existující (dva stisky).
function podoknoImportu(panel) {
  otevriPodokno(panel, 'importovat');
  const pole = prvek('textarea', 'profil-kod');
  Object.assign(pole, { rows: 4, placeholder: 'Sem vlož kód uložení (RUGEE1.…)', spellcheck: false });
  for (const [nazev, hodnota] of [['aria-label', 'Kód uložení'], ['autocomplete', 'off'], ['autocapitalize', 'off'], ['autocorrect', 'off']]) {
    pole.setAttribute(nazev, hodnota);
  }
  const hlaseni = hlaseniProfilu();
  const cile = prvek('div', 'profil-import');
  const precti = (text) => {
    const { data, chyba } = prectiKod(text);
    cile.replaceChildren();
    if (chyba) {
      ukazHlaseni(hlaseni, TEXTY_CHYB[chyba], true);
      odmitni(pole);
      return;
    }
    ukazHlaseni(hlaseni, 'Kód je v pořádku. Kam ho nahrát?');
    ukazCileImportu(panel, cile, data);
  };
  const nacist = tlacitko('Načíst kód', 'hlavni');
  nacist.dataset.import = 'nacist';
  nacist.addEventListener('click', () => precti(pole.value));
  const vstup = prvek('input');
  vstup.type = 'file';
  vstup.hidden = true;
  const vybrat = tlacitko(`Vybrat soubor ${PRIPONA_SOUBORU}`);
  vybrat.dataset.import = 'soubor';
  vybrat.addEventListener('click', () => vstup.click());
  vstup.addEventListener('change', async () => {
    const soubor = vstup.files?.[0];
    vstup.value = '';
    if (!soubor) return;
    try {
      if (soubor.size > MAX_DELKA_KODU * 4) throw new Error('soubor je moc velký');
      const text = await soubor.text();
      pole.value = text.trim();
      precti(text);
    } catch {
      cile.replaceChildren();
      ukazHlaseni(hlaseni, TEXTY_CHYB.soubor, true);
    }
  });
  escZpet(pole);
  pole.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      precti(pole.value);
    }
  });
  const sekce = skupina('Import', 'profil-sekce');
  sekce.append(pole, hlaseni, radekTlacitek(nacist, vybrat), vstup, cile);
  panel.append(
    prvek('p', 'podtitul', `Vlož kód uložení z jiného zařízení, nebo vyber stažený soubor ${PRIPONA_SOUBORU}. Než se cokoli přepíše, uvidíš, co v kódu je.`),
    sekce,
  );
  // S myší se rovnou dá vložit (Ctrl+V), na dotykovém displeji by vyskočila klávesnice přes tlačítko souboru.
  if (globalThis.matchMedia?.('(pointer: fine)').matches) zamerPole(pole);
  else vyberTlacitko(nacist);
}

function ukazCileImportu(panel, cile, data) {
  const profily = seznamProfilu();
  const plno = profily.length >= MAX_PROFILU;
  const tlacitka = prvek('div', 'profil-akce');
  const novy = tlacitko(plno ? `Plno (${MAX_PROFILU}/${MAX_PROFILU})` : 'Jako nový profil', 'hlavni');
  novy.disabled = plno;
  novy.dataset.cil = 'novy';
  novy.addEventListener('click', () => dokonciImport(panel, data, null));
  tlacitka.append(novy);
  for (const p of profily) {
    const prepsat = tlacitko(`Přepsat ${p.jmeno}`);
    prepsat.dataset.cil = String(p.slot);
    prepsat.addEventListener('click', () => {
      if (!prepsat.classList.contains('potvrdit')) {
        prepsat.classList.add('potvrdit');
        prepsat.textContent = `Opravdu přepsat ${p.jmeno}?`;
        return;
      }
      dokonciImport(panel, data, p.slot);
    });
    tlacitka.append(prepsat);
  }
  cile.append(nahledDat(data), tlacitka);
  vyberTlacitko(tlacitka.querySelector('button:not(:disabled)'), true);
}

function dokonciImport(panel, data, slot) {
  const vysledek = importujProfil(data, slot);
  if (vysledek.chyba) {
    vyplnProfil(panel, TEXTY_CHYB[vysledek.chyba], true);
  } else {
    prepniProfil(vysledek.slot);
    obnovProfil();
    vyplnProfil(panel, `Nahráno do profilu ${vysledek.jmeno}. Hraješ za něj.`);
  }
  vyberTlacitko(panel.querySelector('.zvolena'));
}

export const ZALOZKY = {
  postavy: { nazev: 'Postavy', vypln: vyplnPostavy },
  mapy: { nazev: 'Mapy', vypln: vyplnMapy },
  vylepseni: { nazev: 'Vylepšení', vypln: vyplnVylepseni },
  sbirka: { nazev: 'Sbírka', vypln: vyplnSbirku },
  rekordy: { nazev: 'Rekordy', vypln: vyplnRekordy },
  ovladani: { nazev: 'Ovládání', vypln: vyplnOvladani },
  nastaveni: { nazev: 'Nastavení', vypln: vyplnNastaveni },
  // zpet: Esc nebo Zpět v podokně záložky vrátí její hlavní obsah (vrací true), jinak se záložka zavře.
  profil: { nazev: 'Profil', vypln: (panel) => vyplnProfil(panel), zpet: zpetZProfilu },
};

// Logo se zvětšuje jen celými násobky, aby pixely zůstaly ostré. Na nízké obrazovce (telefon na šířku, malý
// notebook) je menší, ať se pod něj vejde deska s tlačítky.
function upravLogo(platno) {
  const podleSirky = Math.floor(Math.min(560, innerWidth - 32) / platno.width);
  const podleVysky = Math.floor((innerHeight * 0.16) / platno.height);
  const meritko = Math.max(3, Math.min(9, podleSirky, podleVysky));
  platno.style.width = `${platno.width * meritko}px`;
  platno.style.height = `${platno.height * meritko}px`;
}

export function vyberTlacitko(tlacitko, posunout = false) {
  if (!tlacitko) return;
  for (const b of document.querySelectorAll('.vybrano')) b.classList.remove('vybrano');
  tlacitko.classList.add('vybrano');
  tlacitko.focus({ preventScroll: !posunout });
}

const DALSI = ['arrowdown', 'arrowright', 's', 'd'];
const PREDCHOZI = ['arrowup', 'arrowleft', 'w', 'a'];

// Šipky (i WASD) posouvají výběr mezi viditelnými tlačítky v kontejneru, Enter nebo mezerník ho stiskne.
// Když je tlačítko zaměřené, stiskne ho prohlížeč sám, takže se nic nespustí dvakrát.
export function ovladejTlacitka(kontejner, e) {
  const k = e.key.toLowerCase();
  const tlacitka = [...kontejner.querySelectorAll('button')].filter((b) => !b.disabled && b.getClientRects().length);
  if (!tlacitka.length) return false;
  const zamerene = tlacitka.indexOf(document.activeElement);
  const i = zamerene >= 0 ? zamerene : tlacitka.findIndex((b) => b.classList.contains('vybrano'));
  const smer = DALSI.includes(k) ? 1 : PREDCHOZI.includes(k) ? -1 : 0;
  if (smer) {
    e.preventDefault();
    if (e.repeat) return true;
    const dalsi = i < 0 ? (smer > 0 ? 0 : tlacitka.length - 1) : (i + smer + tlacitka.length) % tlacitka.length;
    vyberTlacitko(tlacitka[dalsi], true);
    return true;
  }
  if (k === 'enter' || k === ' ') {
    // Držený Enter by jinak klikal pořád dokola (záložka by se otevírala a zavírala).
    if (e.repeat) {
      e.preventDefault();
      return true;
    }
    if (zamerene >= 0) return true;
    e.preventDefault();
    (tlacitka[i] ?? tlacitka[0]).click();
    return true;
  }
  return false;
}

export function vytvorMenu({ hrat }) {
  const koren = document.getElementById('menu');
  const volby = document.getElementById('menu-volby');
  const zalozka = document.getElementById('menu-zalozka');
  const logo = document.getElementById('logo');
  let otevrena = null;

  nakresliText(logo, 'RuGee', STYL_LOGA);
  upravLogo(logo);
  addEventListener('resize', () => upravLogo(logo));

  const polozky = [
    { id: 'hrat', nazev: 'Hrát', hlavni: true, akce: hrat },
    ...Object.entries(ZALOZKY).map(([id, z]) => ({ id, nazev: z.nazev, akce: () => otevri(id) })),
  ];
  // Cedulka pod Hrát: zvolený profil a s čím se půjde hrát (postava, mapa, duše), každé s pixelovou ikonou.
  const radekPostavy = prvek('div', 'menu-postava ram-tenky');
  const udaj = (ikona, text, trida = '') => {
    const u = prvek('span', `menu-udaj ${trida}`.trim());
    u.append(ikona, prvek('span', '', text));
    return u;
  };
  const ukazPostavu = () => {
    const { duse } = nactiDuse();
    const profil = prvek('span', 'menu-profil', 'Profil: ');
    profil.append(prvek('b', '', aktivniProfil().jmeno));
    const udaje = prvek('span', 'menu-udaje');
    const naMape = udaj(ikonaMapy(mapa), MAPY[mapa].nazev, 'menu-mapa');
    naMape.style.setProperty('--mapa', MAPY[mapa].barva);
    udaje.append(
      udaj(obrazekSpritu(trida, 3), TRIDY[trida].nazev, 'menu-trida'),
      naMape,
      udaj(obrazekSpritu('duse', 3), `${duse} ${pocetDusi(duse)}`, 'menu-duse'),
    );
    radekPostavy.replaceChildren(profil, udaje);
  };
  ukazPostavu();
  const tlacitkoMenu = (p) => {
    const b = prvek('button', p.hlavni ? 'menu-tlacitko hlavni' : 'menu-tlacitko', p.nazev);
    b.type = 'button';
    b.dataset.id = p.id;
    // Tlačítko schovaného menu (zaměřené z dřívějška) nesmí spustit nic uprostřed hry.
    b.addEventListener('click', () => { if (!koren.hidden) p.akce(); });
    return b;
  };
  // Záložky jsou ve dvou sloupcích po sobě (šipky jdou dolů prvním sloupcem a pak druhým, pořadí se nemění).
  const mrizka = prvek('div', 'menu-mrizka');
  mrizka.style.setProperty('--radku', String(Math.ceil((polozky.length - 1) / 2)));
  mrizka.append(...polozky.slice(1).map(tlacitkoMenu));
  volby.replaceChildren(tlacitkoMenu(polozky[0]), radekPostavy, mrizka);
  document.getElementById('menu-zpet').addEventListener('click', () => zpet());
  // Najetí myší vybere tlačítko, jen ne když se píše do pole (jméno profilu, kód), to by mu vzalo klávesnici.
  koren.addEventListener('pointerover', (e) => {
    const b = e.target.closest('button');
    if (b && !b.disabled && !b.classList.contains('vybrano') && !document.activeElement?.matches?.('input, textarea')) vyberTlacitko(b);
  });

  function otevri(id) {
    const z = ZALOZKY[id];
    otevrena = id;
    pixelovyNadpis(document.getElementById('menu-nadpis'), z.nazev, { max: innerWidth > 600 ? 4 : 3 });
    const panel = document.getElementById('menu-panel');
    panel.replaceChildren();
    z.vypln(panel);
    volby.hidden = true;
    zalozka.hidden = false;
    prizpusobNadpisy(zalozka);
    vyberTlacitko(zalozka.querySelector('.zvolena') ?? zalozka.querySelector('button'));
  }

  function zpet() {
    if (!ZALOZKY[otevrena]?.zpet?.()) zavri();
  }

  function zavri() {
    const id = otevrena;
    otevrena = null;
    zalozka.hidden = true;
    ukazPostavu();
    volby.hidden = false;
    vyberTlacitko(volby.querySelector(`[data-id="${id}"]`) ?? volby.querySelector('button'));
  }

  return {
    otevri,
    ukaz() {
      koren.hidden = false;
      upravLogo(logo);
      ukazPostavu();
      if (otevrena) zavri();
      else vyberTlacitko(volby.querySelector('button'));
    },
    skryj() {
      koren.hidden = true;
    },
    klavesa(e) {
      const k = e.key.toLowerCase();
      if (otevrena && (k === 'escape' || k === 'backspace')) {
        e.preventDefault();
        zpet();
        return;
      }
      ovladejTlacitka(koren, e);
    },
  };
}
