// Přenos profilu do jiného prohlížeče nebo zařízení bez serveru. Kód uložení je jeden řádek textu
// RUGEE1.<data>.<součet>: data jsou zkrácený JSON profilu v base64url (jde zkopírovat i poslat zprávou), součet je
// CRC-32 v hex a pozná překlep nebo useknutý kód. Soubor .rugee je řádek s popisem a pod ním stejný kód.
// Kód není šifrovaný ani podepsaný, slouží jen k přenosu (hra je pro jednoho hráče). Nic se neposílá na server.
// Jen pravidla, bez DOM a bez úložiště (to je ulozeni.js).
import { platnaDataProfilu } from './ulozeni.js';
import { VSECHNY_KUSY } from './vystroj.js';
import { t } from './texty.js';

export const VERZE_KODU = 1;
const PREDPONA = 'RUGEE';
export const PRIPONA_SOUBORU = '.rugee';
// Delší text se ani nezkoumá (celý profil má kolem 300–900 znaků).
export const MAX_DELKA_KODU = 20000;
// Ve sbírce je kus zapsaný dvěma písmeny: slot a rarita. Písmena jsou napevno, nikdy je neměň (staré kódy by se
// přečetly špatně), nový slot nebo raritu přidej s novým písmenem. Co tu chybí, jde do kódu celým jménem (s2).
const PISMENO_SLOTU = { hlava: 'h', telo: 't', amulet: 'a', prsten: 'p' };
const PISMENO_RARITY = { bezna: 'b', vzacna: 'v', epicka: 'e', legendarni: 'l' };
const SLOT_PISMENA = Object.fromEntries(Object.entries(PISMENO_SLOTU).map(([slot, p]) => [p, slot]));
const RARITA_PISMENA = Object.fromEntries(Object.entries(PISMENO_RARITY).map(([rarita, p]) => [p, rarita]));
const KUSY = new Map(VSECHNY_KUSY.map((kus) => [kus.id, kus]));

const TABULKA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

// CRC-32 (stejný jako u zipu) z textu v UTF-8, jako 8 hex znaků.
export function crc32(text) {
  let c = 0xffffffff;
  for (const bajt of new TextEncoder().encode(text)) c = TABULKA_CRC[(c ^ bajt) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

function doBase64(text) {
  let binarni = '';
  for (const bajt of new TextEncoder().encode(text)) binarni += String.fromCharCode(bajt);
  return btoa(binarni).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function zBase64(b64) {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binarni = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binarni, (z) => z.charCodeAt(0)));
}

// Profil do krátkého tvaru: krátké klíče, rekord jako pole [čas, úroveň, zabito, hrozba, třída, datum v ms]
// a sbírka po bossech jako písmena.
function zkrat(d) {
  const s = {};
  const s2 = {};
  for (const [id, rarita] of Object.entries(d.sbirka)) {
    const kus = KUSY.get(id);
    if (kus && PISMENO_SLOTU[kus.slot] && PISMENO_RARITY[rarita]) s[kus.boss] = (s[kus.boss] ?? '') + PISMENO_SLOTU[kus.slot] + PISMENO_RARITY[rarita];
    else s2[id] = rarita;
  }
  const r = {};
  for (const [mapa, z] of Object.entries(d.rekordy)) {
    r[mapa] = [z.cas, z.uroven ?? null, z.zabito ?? null, z.hrozba ?? null, z.trida ?? null, z.datum ? Date.parse(z.datum) : null];
  }
  return {
    v: VERZE_KODU, j: d.jmeno, t: d.trida, m: d.mapa, o: d.mapy, d: d.duse.duse, u: d.duse.vylepseni, s,
    ...(Object.keys(s2).length ? { s2 } : {}), r,
  };
}

// Opak zkrat. Nic nekontroluje, to udělá platnaDataProfilu (rozbité nebo cizí hodnoty zahodí).
function rozbal(z) {
  const objekt = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const sbirka = { ...objekt(z.s2) };
  for (const [boss, pismena] of Object.entries(objekt(z.s))) {
    if (typeof pismena !== 'string') continue;
    for (let i = 0; i + 1 < pismena.length; i += 2) {
      const slot = SLOT_PISMENA[pismena[i]];
      const rarita = RARITA_PISMENA[pismena[i + 1]];
      if (slot && rarita) sbirka[`${boss}_${slot}`] = rarita;
    }
  }
  const rekordy = {};
  for (const [mapa, p] of Object.entries(objekt(z.r))) {
    if (!Array.isArray(p)) continue;
    rekordy[mapa] = { cas: p[0], uroven: p[1], zabito: p[2], hrozba: p[3], trida: p[4], datum: p[5] };
  }
  return { jmeno: z.j, trida: z.t, mapa: z.m, mapy: z.o, duse: { duse: z.d, vylepseni: z.u }, sbirka, rekordy };
}

// Kód uložení z dat profilu (ulozeni.dataProfilu).
export function kodProfilu(data) {
  const zaklad = `${PREDPONA}${VERZE_KODU}.${doBase64(JSON.stringify(zkrat(platnaDataProfilu(data))))}`;
  return `${zaklad}.${crc32(zaklad)}`;
}

// Obsah souboru .rugee: popis pro člověka a kód (import ho v textu najde sám).
export function souborProfilu(data) {
  const d = platnaDataProfilu(data);
  return `${t('prenos.hlavicka', { jmeno: d.jmeno })}\n${kodProfilu(d)}\n`;
}

// Jméno souboru bez diakritiky a mezer: RuGee-Hrac.rugee
export function nazevSouboru(jmeno) {
  const ascii = String(jmeno ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `RuGee-${ascii || t('prenos.bezJmena')}${PRIPONA_SOUBORU}`;
}

// Přečte kód uložení z textu (vložený kód, celý soubor .rugee, klidně s mezerami, zalomením nebo textem okolo).
// Vrací { data } (už zkontrolovaná jako z úložiště), nebo { chyba }: prazdny, format (žádný kód), neuplny (začátek
// RUGEE1. tam je, ale chybí konec se součtem = useknutý kód), soucet (nesedí kontrolní součet = poškozený kód),
// verze (kód z jiné verze hry), obsah (data nejdou přečíst).
export function prectiKod(text) {
  if (typeof text !== 'string' || !text.trim()) return { chyba: 'prazdny' };
  if (text.length > MAX_DELKA_KODU) return { chyba: 'format' };
  const bezMezer = text.replace(/\s+/g, '');
  const nalezy = [...bezMezer.matchAll(/RUGEE(\d{1,3})\.([A-Za-z0-9_-]+)\.([0-9a-fA-F]{8})/g)];
  if (!nalezy.length) return { chyba: /RUGEE\d{1,3}\./.test(bezMezer) ? 'neuplny' : 'format' };
  const platny = nalezy.find(([, verze, telo, soucet]) => crc32(`${PREDPONA}${verze}.${telo}`) === soucet.toLowerCase());
  if (!platny) return { chyba: 'soucet' };
  const [, verze, telo] = platny;
  if (Number(verze) !== VERZE_KODU) return { chyba: 'verze' };
  try {
    const z = JSON.parse(zBase64(telo));
    if (!z || typeof z !== 'object' || Array.isArray(z) || z.v !== VERZE_KODU) return { chyba: 'obsah' };
    return { data: platnaDataProfilu(rozbal(z)) };
  } catch {
    return { chyba: 'obsah' };
  }
}
