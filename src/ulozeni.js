// Co si hra pamatuje v tomhle prohlížeči: rekordy (každá mapa svůj), zvolenou třídu a mapu, odemčené mapy, duše
// s trvalými vylepšeními, nastavení a sbírku nalezené výbavy bossů. V anonymním okně nebo se zablokovaným
// úložištěm se nic neuloží a hra kvůli tomu nespadne.
import { platnaTrida } from './hra.js';
import { PORADI_MAP, VYCHOZI_MAPA, ODEMKNUTI_MAPY, platnaMapa, predchoziMapa } from './mapy.js';
import { platnyStav } from './duse.js';
import { platnaSbirka, pridejDoSbirky } from './vystroj.js';

const KLIC_REKORDU = 'hlubiny.rekord';
const KLIC_TRIDY = 'hlubiny.trida';
const KLIC_DUSI = 'hlubiny.duse';
const KLIC_NASTAVENI = 'hlubiny.nastaveni';
const KLIC_SBIRKY = 'hlubiny.sbirka';
const KLIC_MAPY = 'hlubiny.mapa';
const KLIC_ODEMCENYCH = 'hlubiny.mapy';
// Přepínače v Ovládání a v pauze. Co v záznamu chybí nebo není ano/ne, platí výchozí.
export const VYCHOZI_NASTAVENI = { cislaPoskozeni: true };

function nacti(klic) {
  try {
    return JSON.parse(globalThis.localStorage.getItem(klic)) ?? null;
  } catch {
    return null;
  }
}

function uloz(klic, hodnota) {
  try {
    globalThis.localStorage.setItem(klic, JSON.stringify(hodnota));
  } catch {
    // úložiště nejde, nic se neuloží
  }
}

// Rekord Louky má pořád starý klíč (rekordy z doby před mapami tak patří jí), ostatní mapy mají klíč s jménem mapy.
function klicRekordu(mapa) {
  const id = platnaMapa(mapa);
  return id === VYCHOZI_MAPA ? KLIC_REKORDU : `${KLIC_REKORDU}.${id}`;
}

// Rekord jedné mapy. Rozbitý nebo cizí záznam se bere jako žádný rekord.
export function nactiRekord(mapa = VYCHOZI_MAPA) {
  const rekord = nacti(klicRekordu(mapa));
  return rekord && Number.isFinite(rekord.cas) ? rekord : null;
}

// Uloží výsledek hry na mapě, když vydržel déle než dosavadní rekord té mapy.
// Vrací { novy, rekord }, kde rekord je ten, který platil před touto hrou.
export function zapisVysledek(vysledek, mapa = VYCHOZI_MAPA) {
  const rekord = nactiRekord(mapa);
  const novy = !rekord || vysledek.cas > rekord.cas;
  if (novy) uloz(klicRekordu(mapa), vysledek);
  return { novy, rekord };
}

// Odemčené mapy v pořadí PORADI_MAP. První je odemčená vždy, další, když je zapsaná jako odemčená (hráč na té
// předchozí přežil ODEMKNUTI_MAPY s), nebo když rekord předchozí mapy je aspoň tak dlouhý (staré rekordy Louky).
export function odemceneMapy() {
  const zapsane = nacti(KLIC_ODEMCENYCH);
  const seznam = Array.isArray(zapsane) ? zapsane : [];
  return PORADI_MAP.filter((id) => {
    const pred = predchoziMapa(id);
    return !pred || seznam.includes(id) || (nactiRekord(pred)?.cas ?? 0) >= ODEMKNUTI_MAPY;
  });
}

export function odemkniMapu(id) {
  const zapsane = nacti(KLIC_ODEMCENYCH);
  const seznam = Array.isArray(zapsane) ? zapsane.filter((m) => PORADI_MAP.includes(m)) : [];
  if (PORADI_MAP.includes(id) && !seznam.includes(id)) uloz(KLIC_ODEMCENYCH, [...seznam, id]);
}

// Zvolená mapa. Neznámá nebo zamčená (třeba po smazání rekordů) je Louka.
export function nactiMapu() {
  const id = platnaMapa(nacti(KLIC_MAPY));
  return odemceneMapy().includes(id) ? id : VYCHOZI_MAPA;
}

export function ulozMapu(id) {
  uloz(KLIC_MAPY, platnaMapa(id));
}

// Neznámá nebo chybějící třída (třeba po přejmenování) se vrátí jako výchozí.
export function nactiTridu() {
  return platnaTrida(nacti(KLIC_TRIDY));
}

export function ulozTridu(id) {
  uloz(KLIC_TRIDY, platnaTrida(id));
}

// Duše a koupená vylepšení: { duse, vylepseni: { id: úroveň } }. Rozbitý záznam = nic nekoupeno.
export function nactiDuse() {
  return platnyStav(nacti(KLIC_DUSI));
}

export function ulozDuse(stav) {
  uloz(KLIC_DUSI, platnyStav(stav));
}

function platnaNastaveni(zaznam) {
  const nastaveni = { ...VYCHOZI_NASTAVENI };
  if (!zaznam || typeof zaznam !== 'object') return nastaveni;
  for (const klic of Object.keys(VYCHOZI_NASTAVENI)) {
    if (typeof zaznam[klic] === 'boolean') nastaveni[klic] = zaznam[klic];
  }
  return nastaveni;
}

export function nactiNastaveni() {
  return platnaNastaveni(nacti(KLIC_NASTAVENI));
}

export function ulozNastaveni(nastaveni) {
  uloz(KLIC_NASTAVENI, platnaNastaveni(nastaveni));
}

// Připíše duše z dohrané hry a vrátí nový stav.
export function pripisDuse(kolik) {
  const stav = nactiDuse();
  const novy = { ...stav, duse: stav.duse + Math.max(0, Math.floor(kolik) || 0) };
  ulozDuse(novy);
  return novy;
}

// Sbírka výbavy: { id kusu: nejlepší nalezená rarita }. Rozbitý záznam = nic nenalezeno.
export function nactiSbirku() {
  return platnaSbirka(nacti(KLIC_SBIRKY));
}

// Zapíše kus nalezený ve hře (lepší rarita přepíše horší, horší nic nezmění). Vrací novou sbírku.
export function zapisNalez(kus) {
  const sbirka = pridejDoSbirky(nactiSbirku(), kus);
  uloz(KLIC_SBIRKY, sbirka);
  return sbirka;
}
