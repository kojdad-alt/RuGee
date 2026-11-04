// Co si hra pamatuje v tomhle prohlížeči: rekord a zvolenou třídu, později trvalá vylepšení.
// V anonymním okně nebo se zablokovaným úložištěm se nic neuloží a hra kvůli tomu nespadne.
import { platnaTrida } from './hra.js';

const KLIC_REKORDU = 'hlubiny.rekord';
const KLIC_TRIDY = 'hlubiny.trida';

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
