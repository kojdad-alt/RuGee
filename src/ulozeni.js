// Co si hra pamatuje v tomhle prohlížeči. Skoro všechno patří profilu: rekordy (každá mapa svůj), zvolená třída
// a mapa, odemčené mapy, duše s trvalými vylepšeními a sbírka nalezené výbavy bossů. Nastavení (zvuk, čísla
// poškození) je společné pro všechny profily. V anonymním okně nebo se zablokovaným úložištěm se nic neuloží
// a hra kvůli tomu nespadne.
//
// Profily jsou sloty 1 až MAX_PROFILU. Slot 1 má původní klíče (hlubiny.rekord, hlubiny.duse…), takže uložení
// z doby před profily jsou rovnou první profil „Hráč“: nic se nekopíruje ani nemaže. Slot 2 má klíče
// hlubiny.p2.rekord, hlubiny.p2.duse… a tak dál. Profil existuje, když má zapsané jméno (klíč jmeno), zvolený slot
// je v hlubiny.profil. Každé okno si zvolený profil drží u sebe, takže hra v jiné záložce nepíše do cizího profilu.
// Přenos profilu mezi zařízeními (kód uložení a soubor .rugee) je v prenos.js.
import { platnaTrida, TRIDY } from './hra.js';
import { PORADI_MAP, VYCHOZI_MAPA, ODEMKNUTI_MAPY, platnaMapa, predchoziMapa } from './mapy.js';
import { platnyStav } from './duse.js';
import { platnaSbirka, pridejDoSbirky } from './vystroj.js';
import { t, JAZYKY } from './texty.js';

export const MAX_PROFILU = 5;
export const MAX_JMENA = 16;
// Jméno prvního profilu a profilu bez jména (ve zvoleném jazyce, česky Hráč).
export const vychoziJmeno = () => t('profil.vychoziJmeno');
const SLOTY = Array.from({ length: MAX_PROFILU }, (_, i) => i + 1);

// Společné klíče, bez profilu.
const KLIC_NASTAVENI = 'hlubiny.nastaveni';
const KLIC_PROFILU = 'hlubiny.profil';
// Klíče profilu, píšou se za předponu slotu. Nesmí mezi nimi být „nastaveni“ ani „profil“ (slot 1 by přepsal
// společné klíče).
const JMENO = 'jmeno';
const REKORD = 'rekord';
const TRIDA = 'trida';
const DUSE = 'duse';
const SBIRKA = 'sbirka';
const MAPA = 'mapa';
const MAPY = 'mapy';

// Nastavení z menu a pauzy: přepínače ano/ne, hlasitosti zvuku v procentech (efekty 60 %, hudba 40 %,
// ztlumeno = klávesa N) a volby z výčtu (MOZNOSTI_NASTAVENI: světla auto / zap / vyp, jazyk cs / en). Co v záznamu
// chybí nebo má špatný druh, platí výchozí, procenta se zaokrouhlí do 0–100. Jazyk '' = ještě nezvolený, menu ho při
// prvním spuštění vezme z prohlížeče a uloží.
export const VYCHOZI_NASTAVENI = { cislaPoskozeni: true, efekty: 60, hudba: 40, ztlumeno: false, svetla: 'auto', jazyk: '' };
export const MOZNOSTI_NASTAVENI = { svetla: ['auto', 'zap', 'vyp'], jazyk: JAZYKY };
// Kdy pojistka světel naposledy zjistila, že s nimi hra zpomalila (ms). Auto pak POMALA_SVETLA_PLATI ms nesvítí.
const KLIC_POMALA_SVETLA = 'hlubiny.pomalaSvetla';
export const POMALA_SVETLA_PLATI = 14 * 24 * 3600 * 1000;

function surove(klic) {
  try {
    return globalThis.localStorage.getItem(klic);
  } catch {
    return null;
  }
}

function nacti(klic) {
  try {
    return JSON.parse(globalThis.localStorage.getItem(klic)) ?? null;
  } catch {
    return null;
  }
}

// Vrací, jestli se zápis povedl (zablokované nebo plné úložiště = ne).
function uloz(klic, hodnota) {
  try {
    globalThis.localStorage.setItem(klic, JSON.stringify(hodnota));
    return true;
  } catch {
    return false;
  }
}

function smaz(klic) {
  try {
    const uloziste = globalThis.localStorage;
    if (typeof uloziste.removeItem === 'function') uloziste.removeItem(klic);
    else uloziste.setItem(klic, 'null');
  } catch {
    // úložiště nejde, nic se nesmaže
  }
}

function klic(slot, nazev) {
  return `${slot === 1 ? 'hlubiny.' : `hlubiny.p${slot}.`}${nazev}`;
}

// Rekord Louky má pořád starý klíč (rekordy z doby před mapami tak patří jí), ostatní mapy mají klíč s jménem mapy.
function klicRekordu(mapa) {
  const id = platnaMapa(mapa);
  return id === VYCHOZI_MAPA ? REKORD : `${REKORD}.${id}`;
}

function kliceProfilu() {
  return [JMENO, TRIDA, DUSE, SBIRKA, MAPA, MAPY, ...PORADI_MAP.map((id) => klicRekordu(id))];
}

// ---------- Profily ----------

// Profil existuje, když má jméno. Rozbité jméno se počítá taky (data profilu se tak neztratí), ukáže se jako „Profil 2“.
function existuje(slot) {
  const jmeno = surove(klic(slot, JMENO));
  return jmeno !== null && jmeno !== 'null';
}

// Jméno profilu: bez řídicích znaků, mezery sloučené, nejvýš MAX_JMENA znaků. Prázdné nebo jiný druh = ''.
export function platneJmeno(text) {
  if (typeof text !== 'string') return '';
  const cisty = text.replace(/\p{C}/gu, '').replace(/\s+/g, ' ').trim();
  return [...cisty].slice(0, MAX_JMENA).join('').trim();
}

function jmenoProfilu(slot) {
  return platneJmeno(nacti(klic(slot, JMENO))) || t('profil.cislo', { n: slot });
}

// Zvolený profil tohoto okna (null = ještě nenačtený z úložiště).
let aktivni = null;

function ulozenyAktivni() {
  const slot = nacti(KLIC_PROFILU);
  if (SLOTY.includes(slot) && existuje(slot)) return slot;
  return SLOTY.find(existuje) ?? 1;
}

export function aktivniSlot() {
  aktivni ??= ulozenyAktivni();
  return aktivni;
}

// Při prvním spuštění s profily (žádný profil nemá jméno) dostane slot 1 jméno Hráč. Jeho data jsou stará
// uložení pod původními klíči, takže se tím celá převedou do prvního profilu.
function zalozPrvni() {
  if (!SLOTY.some(existuje)) uloz(klic(1, JMENO), vychoziJmeno());
}

// Volá se při startu hry (a v testech po výměně úložiště): převede stará uložení a načte zvolený profil.
export function zajistiProfily() {
  zalozPrvni();
  aktivni = ulozenyAktivni();
  return seznamProfilu();
}

// Profily v pořadí slotů: { slot, jmeno, aktivni }. Se zablokovaným úložištěm je tu aspoň jeden (nic se neuloží).
export function seznamProfilu() {
  const zvoleny = aktivniSlot();
  const seznam = SLOTY.filter(existuje).map((slot) => ({ slot, jmeno: jmenoProfilu(slot), aktivni: slot === zvoleny }));
  return seznam.length ? seznam : [{ slot: zvoleny, jmeno: vychoziJmeno(), aktivni: true }];
}

export function aktivniProfil() {
  const slot = aktivniSlot();
  return { slot, jmeno: existuje(slot) ? jmenoProfilu(slot) : vychoziJmeno() };
}

function jmenoObsazene(jmeno, kromeSlotu = null) {
  const hledane = jmeno.toLocaleLowerCase('cs');
  return SLOTY.some((s) => s !== kromeSlotu && existuje(s) && jmenoProfilu(s).toLocaleLowerCase('cs') === hledane);
}

// Jméno, které ještě žádný jiný profil nemá: Hráč, Hráč 2, Hráč 3…
function volneJmeno(jmeno, kromeSlotu = null) {
  const zaklad = platneJmeno(jmeno) || vychoziJmeno();
  if (!jmenoObsazene(zaklad, kromeSlotu)) return zaklad;
  for (let n = 2; ; n++) {
    const pripona = ` ${n}`;
    const kandidat = `${[...zaklad].slice(0, MAX_JMENA - pripona.length).join('').trim()}${pripona}`;
    if (!jmenoObsazene(kandidat, kromeSlotu)) return kandidat;
  }
}

// Nový prázdný profil (nepřepne na něj). Vrací { slot, jmeno }, nebo { chyba }: jmeno (prázdné), obsazene,
// plno (už je MAX_PROFILU profilů), uloziste (zablokované úložiště).
export function vytvorProfil(jmeno) {
  zalozPrvni();
  const cisty = platneJmeno(jmeno);
  if (!cisty) return { chyba: 'jmeno' };
  if (jmenoObsazene(cisty)) return { chyba: 'obsazene' };
  const slot = SLOTY.find((s) => !existuje(s));
  if (!slot) return { chyba: 'plno' };
  for (const k of kliceProfilu()) smaz(klic(slot, k));
  if (!uloz(klic(slot, JMENO), cisty)) return { chyba: 'uloziste' };
  return { slot, jmeno: cisty };
}

export function prejmenujProfil(slot, jmeno) {
  if (!existuje(slot)) return { chyba: 'neni' };
  const cisty = platneJmeno(jmeno);
  if (!cisty) return { chyba: 'jmeno' };
  if (jmenoObsazene(cisty, slot)) return { chyba: 'obsazene' };
  return uloz(klic(slot, JMENO), cisty) ? { slot, jmeno: cisty } : { chyba: 'uloziste' };
}

export function prepniProfil(slot) {
  if (!existuje(slot)) return false;
  aktivni = slot;
  uloz(KLIC_PROFILU, slot);
  return true;
}

// Smaže profil se všemi daty. Poslední profil smazat nejde. Smazaný zvolený profil přepne na první zbylý.
export function smazProfil(slot) {
  const zbyle = SLOTY.filter((s) => s !== slot && existuje(s));
  if (!existuje(slot) || !zbyle.length) return false;
  for (const k of kliceProfilu()) {
    if (k !== JMENO) smaz(klic(slot, k));
  }
  smaz(klic(slot, JMENO));
  if (existuje(slot)) return false;
  if (aktivniSlot() === slot) prepniProfil(zbyle[0]);
  return true;
}

// ---------- Data zvoleného profilu (nebo profilu ve slotu, když je zadaný) ----------

// Rekord jedné mapy. Rozbitý nebo cizí záznam se bere jako žádný rekord.
export function nactiRekord(mapa = VYCHOZI_MAPA, slot = aktivniSlot()) {
  const rekord = nacti(klic(slot, klicRekordu(mapa)));
  return rekord && Number.isFinite(rekord.cas) ? rekord : null;
}

// Uloží výsledek hry na mapě, když vydržel déle než dosavadní rekord té mapy.
// Vrací { novy, rekord }, kde rekord je ten, který platil před touto hrou.
export function zapisVysledek(vysledek, mapa = VYCHOZI_MAPA) {
  const rekord = nactiRekord(mapa);
  const novy = !rekord || vysledek.cas > rekord.cas;
  if (novy) uloz(klic(aktivniSlot(), klicRekordu(mapa)), vysledek);
  return { novy, rekord };
}

// Odemčené mapy v pořadí PORADI_MAP. První je odemčená vždy, další, když je zapsaná jako odemčená (hráč na té
// předchozí přežil ODEMKNUTI_MAPY s), nebo když rekord předchozí mapy je aspoň tak dlouhý (staré rekordy Louky).
export function odemceneMapy(slot = aktivniSlot()) {
  const zapsane = nacti(klic(slot, MAPY));
  const seznam = Array.isArray(zapsane) ? zapsane : [];
  return PORADI_MAP.filter((id) => {
    const pred = predchoziMapa(id);
    return !pred || seznam.includes(id) || (nactiRekord(pred, slot)?.cas ?? 0) >= ODEMKNUTI_MAPY;
  });
}

export function odemkniMapu(id) {
  const k = klic(aktivniSlot(), MAPY);
  const zapsane = nacti(k);
  const seznam = Array.isArray(zapsane) ? zapsane.filter((m) => PORADI_MAP.includes(m)) : [];
  if (PORADI_MAP.includes(id) && !seznam.includes(id)) uloz(k, [...seznam, id]);
}

// Zvolená mapa. Neznámá nebo zamčená (třeba po smazání rekordů) je Louka.
export function nactiMapu(slot = aktivniSlot()) {
  const id = platnaMapa(nacti(klic(slot, MAPA)));
  return odemceneMapy(slot).includes(id) ? id : VYCHOZI_MAPA;
}

export function ulozMapu(id) {
  uloz(klic(aktivniSlot(), MAPA), platnaMapa(id));
}

// Neznámá nebo chybějící třída (třeba po přejmenování) se vrátí jako výchozí.
export function nactiTridu(slot = aktivniSlot()) {
  return platnaTrida(nacti(klic(slot, TRIDA)));
}

export function ulozTridu(id) {
  uloz(klic(aktivniSlot(), TRIDA), platnaTrida(id));
}

// Duše a koupená vylepšení: { duse, vylepseni: { id: úroveň } }. Rozbitý záznam = nic nekoupeno.
export function nactiDuse(slot = aktivniSlot()) {
  return platnyStav(nacti(klic(slot, DUSE)));
}

export function ulozDuse(stav) {
  uloz(klic(aktivniSlot(), DUSE), platnyStav(stav));
}

// Připíše duše z dohrané hry a vrátí nový stav.
export function pripisDuse(kolik) {
  const stav = nactiDuse();
  const novy = { ...stav, duse: stav.duse + Math.max(0, Math.floor(kolik) || 0) };
  ulozDuse(novy);
  return novy;
}

// Sbírka výbavy: { id kusu: nejlepší nalezená rarita }. Rozbitý záznam = nic nenalezeno.
export function nactiSbirku(slot = aktivniSlot()) {
  return platnaSbirka(nacti(klic(slot, SBIRKA)));
}

// Zapíše kus nalezený ve hře (lepší rarita přepíše horší, horší nic nezmění). Vrací novou sbírku.
export function zapisNalez(kus) {
  const sbirka = pridejDoSbirky(nactiSbirku(), kus);
  uloz(klic(aktivniSlot(), SBIRKA), sbirka);
  return sbirka;
}

// ---------- Nastavení (společné všem profilům) ----------

function platnaNastaveni(zaznam) {
  const nastaveni = { ...VYCHOZI_NASTAVENI };
  if (!zaznam || typeof zaznam !== 'object') return nastaveni;
  for (const [nazev, vychozi] of Object.entries(VYCHOZI_NASTAVENI)) {
    const hodnota = zaznam[nazev];
    if (typeof vychozi === 'boolean' && typeof hodnota === 'boolean') nastaveni[nazev] = hodnota;
    else if (typeof vychozi === 'number' && Number.isFinite(hodnota)) nastaveni[nazev] = Math.min(100, Math.max(0, Math.round(hodnota)));
    else if (MOZNOSTI_NASTAVENI[nazev]?.includes(hodnota)) nastaveni[nazev] = hodnota;
  }
  return nastaveni;
}

export function nactiNastaveni() {
  return platnaNastaveni(nacti(KLIC_NASTAVENI));
}

export function ulozNastaveni(nastaveni) {
  uloz(KLIC_NASTAVENI, platnaNastaveni(nastaveni));
}

// Zpomalila hra se světly v posledních POMALA_SVETLA_PLATI ms? (ted = teď v ms, kvůli testu)
export function pomalaSvetla(ted = Date.now()) {
  const kdy = nacti(KLIC_POMALA_SVETLA);
  return Number.isFinite(kdy) && kdy <= ted && ted - kdy < POMALA_SVETLA_PLATI;
}

// Zapamatuje si, že hra se světly zpomalila (kdy v ms), nebo to zapomene (null).
export function zapisPomalaSvetla(kdy) {
  if (kdy === null) smaz(KLIC_POMALA_SVETLA);
  else uloz(KLIC_POMALA_SVETLA, kdy);
}

// ---------- Celý profil naráz (export, import, přehled) ----------

const MAX_CISLA = 1e9;
const cele = (x) => Math.min(MAX_CISLA, Math.max(0, Math.floor(x)));

// Rekord jen se známými poli správného druhu. Bez času to rekord není.
export function platnyRekord(zaznam, mapa = VYCHOZI_MAPA) {
  if (!zaznam || typeof zaznam !== 'object' || !Number.isFinite(zaznam.cas)) return null;
  const rekord = { cas: cele(zaznam.cas) };
  for (const pole of ['uroven', 'zabito', 'hrozba']) {
    if (Number.isFinite(zaznam[pole])) rekord[pole] = cele(zaznam[pole]);
  }
  if (typeof zaznam.trida === 'string' && Object.hasOwn(TRIDY, zaznam.trida)) rekord.trida = zaznam.trida;
  rekord.mapa = platnaMapa(mapa);
  const kdy = typeof zaznam.datum === 'string' || Number.isFinite(zaznam.datum) ? new Date(zaznam.datum) : null;
  if (kdy && Number.isFinite(kdy.getTime())) rekord.datum = kdy.toISOString();
  return rekord;
}

// Celý profil jako jeden objekt s pevným pořadím klíčů: { jmeno, trida, mapa, mapy, duse, sbirka, rekordy }.
// Cokoli chybí nebo je rozbité, dostane výchozí hodnotu, neznámé věci se zahodí. mapy = odemčené mapy (stejně
// jako odemceneMapy), mapa = zvolená, jen když je odemčená.
export function platnaDataProfilu(data) {
  const d = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const zdroj = d.rekordy && typeof d.rekordy === 'object' && !Array.isArray(d.rekordy) ? d.rekordy : {};
  const rekordy = {};
  for (const id of PORADI_MAP) {
    const rekord = Object.hasOwn(zdroj, id) ? platnyRekord(zdroj[id], id) : null;
    if (rekord) rekordy[id] = rekord;
  }
  const zapsane = Array.isArray(d.mapy) ? d.mapy : [];
  const mapy = PORADI_MAP.filter((id) => {
    const pred = predchoziMapa(id);
    return !pred || zapsane.includes(id) || (rekordy[pred]?.cas ?? 0) >= ODEMKNUTI_MAPY;
  });
  const mapa = platnaMapa(d.mapa);
  const duse = platnyStav(d.duse);
  return {
    jmeno: platneJmeno(d.jmeno) || vychoziJmeno(),
    trida: platnaTrida(d.trida),
    mapa: mapy.includes(mapa) ? mapa : VYCHOZI_MAPA,
    mapy,
    duse: { duse: Math.min(MAX_CISLA, duse.duse), vylepseni: duse.vylepseni },
    sbirka: platnaSbirka(d.sbirka),
    rekordy,
  };
}

// Všechna data profilu ve slotu (výchozí je zvolený profil).
export function dataProfilu(slot = aktivniSlot()) {
  const rekordy = {};
  for (const id of PORADI_MAP) rekordy[id] = nactiRekord(id, slot);
  return platnaDataProfilu({
    jmeno: existuje(slot) ? jmenoProfilu(slot) : vychoziJmeno(),
    trida: nactiTridu(slot),
    mapa: nactiMapu(slot),
    mapy: odemceneMapy(slot),
    duse: nactiDuse(slot),
    sbirka: nactiSbirku(slot),
    rekordy,
  });
}

// Zapíše data do slotu přes stará (nikdy nejdřív nemaže, ať se při chybě úložiště profil neztratí). Rekordy map,
// které data nemají, smaže.
function zapisDataProfilu(slot, data) {
  const d = platnaDataProfilu(data);
  let povedlo = [[JMENO, d.jmeno], [TRIDA, d.trida], [MAPA, d.mapa], [MAPY, d.mapy], [DUSE, d.duse], [SBIRKA, d.sbirka]]
    .every(([nazev, hodnota]) => uloz(klic(slot, nazev), hodnota));
  for (const id of PORADI_MAP) {
    if (d.rekordy[id]) povedlo = uloz(klic(slot, klicRekordu(id)), d.rekordy[id]) && povedlo;
    else smaz(klic(slot, klicRekordu(id)));
  }
  return povedlo;
}

// Nahraje data (z kódu uložení) do nového profilu (slot null) nebo přes existující profil. Jméno se vezme z dat,
// a když ho už má jiný profil, dostane číslo (Hráč 2). Nepřepne na něj. Vrací { slot, jmeno } nebo { chyba }:
// plno, neni, uloziste.
export function importujProfil(data, slot = null) {
  zalozPrvni();
  if (slot !== null && !existuje(slot)) return { chyba: 'neni' };
  const cil = slot ?? SLOTY.find((s) => !existuje(s));
  if (!cil) return { chyba: 'plno' };
  const jmeno = volneJmeno(platnaDataProfilu(data).jmeno, cil);
  if (slot === null) {
    for (const k of kliceProfilu()) smaz(klic(cil, k));
  }
  if (!zapisDataProfilu(cil, { ...data, jmeno })) return { chyba: 'uloziste' };
  return { slot: cil, jmeno };
}

// Krátký přehled pro kartu profilu a náhled importu: postava, duše, odemčené mapy, nalezené kusy, nejdelší rekord.
export function prehledDat(data) {
  const d = platnaDataProfilu(data);
  return {
    jmeno: d.jmeno,
    trida: d.trida,
    duse: d.duse.duse,
    mapy: d.mapy.length,
    sbirka: Object.keys(d.sbirka).length,
    rekord: Math.max(0, ...Object.values(d.rekordy).map((r) => r.cas)),
  };
}

export function prehledProfilu(slot = aktivniSlot()) {
  return prehledDat(dataProfilu(slot));
}
