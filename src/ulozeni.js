// Co si hra pamatuje v tomhle prohlížeči: rekord, zvolenou třídu, duše s trvalými vylepšeními a nastavení.
// V anonymním okně nebo se zablokovaným úložištěm se nic neuloží a hra kvůli tomu nespadne.
import { platnaTrida } from './hra.js';
import { platnyStav } from './duse.js';

const KLIC_REKORDU = 'hlubiny.rekord';
const KLIC_TRIDY = 'hlubiny.trida';
const KLIC_DUSI = 'hlubiny.duse';
const KLIC_NASTAVENI = 'hlubiny.nastaveni';
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

// Rozbitý nebo cizí záznam se bere jako žádný rekord.
export function nactiRekord() {
  const rekord = nacti(KLIC_REKORDU);
  return rekord && Number.isFinite(rekord.cas) ? rekord : null;
}

// Uloží výsledek hry, když vydržel déle než dosavadní rekord.
// Vrací { novy, rekord }, kde rekord je ten, který platil před touto hrou.
export function zapisVysledek(vysledek) {
  const rekord = nactiRekord();
  const novy = !rekord || vysledek.cas > rekord.cas;
  if (novy) uloz(KLIC_REKORDU, vysledek);
  return { novy, rekord };
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
