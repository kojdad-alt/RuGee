// Co si hra pamatuje v tomhle prohlížeči: zatím rekord, později odemčené postavy a trvalá vylepšení.
// V anonymním okně nebo se zablokovaným úložištěm se nic neuloží a hra kvůli tomu nespadne.
const KLIC_REKORDU = 'hlubiny.rekord';

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
