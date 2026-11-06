// Přehled buildu v pauze (jako v Megabonku). Nahoře tabulka zbraní seřazená podle DPS (poškození za sekundu za
// posledních OKNO_DPS s): ikona s úrovní, jméno s pruhem (kolik dává proti nejsilnější), DPS, průměr od chvíle, kdy
// zbraň přibyla, celkové poškození a zabití. Nejsilnější řádek má mosazný rámeček a cedulku. Mezi zbraněmi jsou
// i pet, Trnová zbroj a rázová vlna výbavy, jakmile někoho zasáhly. Pod tabulkou pasivy s tím, co dávají, a výbava
// bossů se staty a efekty sad. Jen DOM a jen při otevření pauzy (hra stojí), čísla dává hra.js (prehledPoskozeni,
// cisloPasivy).
import {
  prehledPoskozeni, seznamVybavy, seznamVystroje, cisloPasivy, pasivaNaStropu, stupenUrovne, kratkeCislo, OKNO_DPS,
} from './hra.js';
import { SLOTY, VYBAVA, EFEKTY_VYBAVY, RARITY_VYBAVY, PORADI_SAD, PORADI_SLOTU, radkyStatu, popisEfektu } from './vystroj.js';
import { policko, slotVystroje } from './vybava.js';
import { skupina } from './menu.js';
import { t, cislo } from './texty.js';

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

// DPS do sta s desetinou (25,5), pak celé, od deseti tisíc zkráceně (12k) jako čísla nad nepřáteli.
function cisloDps(x) {
  if (x >= 10000) return kratkeCislo(Math.round(x));
  return x >= 100 ? String(Math.round(x)) : cislo(x);
}

// Ikona zdroje: zbraň a pasiva s úrovní a rámečkem podle stupně, pet s úrovní peta, vlna výbavy bez čísla.
function ikonaZdroje(r) {
  const e = policko({ ikona: r.ikona, uroven: r.uroven ?? 0, stupen: r.druh === 'pet' || r.uroven == null ? 0 : stupenUrovne(r.uroven) });
  if (r.uroven == null) e.querySelector('.vybava-cislo')?.remove();
  return e;
}

function tabulkaZbrani(hra) {
  const radky = prehledPoskozeni(hra);
  const nej = radky[0]?.dps > 0 ? radky[0] : null;
  const tabulka = prvek('table', 'dps-tabulka');
  const hlavicka = prvek('tr');
  const sloupec = (text, mensi = null) => {
    const th = prvek('th', 'dps-cislo', text);
    th.scope = 'col';
    if (mensi) th.append(prvek('small', '', mensi));
    return th;
  };
  const prazdny = prvek('th');
  prazdny.colSpan = 2;
  hlavicka.append(
    prazdny,
    sloupec(t('pauza.prehled.dps'), t('pauza.prehled.okno', { s: OKNO_DPS })),
    sloupec(t('pauza.prehled.prumer')),
    sloupec(t('pauza.prehled.celkem')),
    sloupec(t('pauza.prehled.zabiti')),
  );
  const hlava = prvek('thead');
  hlava.append(hlavicka);
  const telo = prvek('tbody');
  for (const r of radky) {
    const tr = prvek('tr', r === nej ? 'nejsilnejsi' : '');
    const ikona = prvek('td', 'dps-ikona');
    ikona.append(ikonaZdroje(r));
    const jmeno = prvek('td', 'dps-jmeno');
    const nazev = prvek('span', 'dps-nazev');
    nazev.append(prvek('b', '', r.nazev));
    if (r === nej) nazev.append(prvek('i', 'dps-nej', t('pauza.prehled.nejsilnejsi')));
    const pruh = prvek('span', 'dps-pruh');
    const vypln = prvek('i');
    vypln.style.width = `${nej ? Math.round((r.dps / nej.dps) * 100) : 0}%`;
    pruh.append(vypln);
    jmeno.append(nazev, pruh);
    tr.append(
      ikona,
      jmeno,
      prvek('td', 'dps-cislo dps-hlavni', cisloDps(r.dps)),
      prvek('td', 'dps-cislo', cisloDps(r.prumer)),
      prvek('td', 'dps-cislo', kratkeCislo(Math.round(r.celkem))),
      prvek('td', 'dps-cislo', String(r.zabiti)),
    );
    telo.append(tr);
  }
  tabulka.append(hlava, telo);
  const sekce = skupina(t('pauza.prehled.zbrane'), 'prehled-zbrane');
  sekce.append(tabulka, prvek('p', 'prehled-poznamka', t('pauza.prehled.vysvetleni', { s: OKNO_DPS })));
  return sekce;
}

// Řádek pasivy: číslo z cisloPasivy do textu pauza.prehled.hodnoty (Příval celé kusy, jinak na desetiny).
function textPasivy(hra, id) {
  const n = cisloPasivy(hra, id);
  return t(`pauza.prehled.hodnoty.${id}`, { n: id === 'prival' ? Math.round(n) : cislo(n) });
}

function seznamPasiv(hra) {
  const { pasivy } = seznamVybavy(hra);
  const sekce = skupina(t('pauza.prehled.pasivy'), 'prehled-pasivy');
  if (!pasivy.length) {
    sekce.append(prvek('p', 'prehled-poznamka', t('pauza.prehled.zadnePasivy')));
    return sekce;
  }
  const seznam = prvek('ul', 'prehled-mrizka');
  for (const p of pasivy) {
    const li = prvek('li', 'prehled-polozka');
    const text = prvek('span', 'prehled-text');
    text.append(prvek('b', '', p.nazev));
    const hodnota = prvek('small', '', textPasivy(hra, p.id));
    // Další úroveň by nic nepřidala (dá jen poškození všem zbraním): pasiva je na stropu.
    if (pasivaNaStropu(p.id, p.uroven + 1)) hodnota.append(' ', prvek('i', 'prehled-strop', t('pauza.prehled.strop')));
    text.append(hodnota);
    li.append(policko(p), text);
    seznam.append(li);
  }
  sekce.append(seznam);
  return sekce;
}

function seznamVystrojeSEfekty(hra) {
  const sekce = skupina(t('pauza.prehled.vybava'), 'prehled-vybava');
  const seznam = prvek('ul', 'prehled-mrizka');
  for (const s of seznamVystroje(hra)) {
    const li = prvek('li', 'prehled-polozka');
    const text = prvek('span', 'prehled-text');
    if (s.kus) {
      // Rarita je vidět na rámečku slotu (i se značkou pro barvoslepé), tady jen jménem.
      text.append(prvek('b', '', s.kus.nazev), prvek('small', '', [RARITY_VYBAVY[s.kus.rarita]?.nazev, ...radkyStatu(s.kus.staty)].filter(Boolean).join(', ')));
    } else {
      text.append(prvek('b', 'prazdne', SLOTY[s.slot].nazev), prvek('small', '', t('pauza.prehled.prazdnySlot')));
    }
    li.append(slotVystroje(s), text);
    seznam.append(li);
  }
  sekce.append(seznam);
  // Efekty sad, které právě platí (počet kusů sady a co efekt dělá).
  const sady = hra.ucinekVystroje?.sady ?? {};
  for (const boss of PORADI_SAD) {
    const pocet = sady[boss] ?? 0;
    if (!(pocet > 0)) continue;
    const efekt = EFEKTY_VYBAVY[VYBAVA[boss].efekt];
    sekce.append(prvek('p', 'prehled-efekt', `${efekt.nazev} (${pocet}/${PORADI_SLOTU.length}): ${popisEfektu(boss, pocet)}`));
  }
  return sekce;
}

export function ukazPrehled(kontejner, hra) {
  kontejner.replaceChildren(tabulkaZbrani(hra), seznamPasiv(hra), seznamVystrojeSEfekty(hra));
}
