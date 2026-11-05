// Hra jako aplikace (PWA): service worker sw.js ji uloží pro hraní bez internetu a tlačítko Přidat na plochu ji
// nainstaluje s ikonou. Bez service workeru (soubor otevřený z disku, starý prohlížeč) hra běží jako dřív.
// - registruj(): zaregistruje sw.js (updateViaCache: 'none' = sw.js vždycky ze sítě, ať se nová verze pozná)
//   a na novou verzi se zeptá hned po načtení (prohlížeč sám to po navigaci dělá s odkladem) a po každém
//   návratu do hry (aplikace na pozadí třeba celý den).
// - Když nová verze převezme stránku, která běží se starými soubory (ne při první instalaci a ne stránku, která
//   už novou verzi stáhla ze sítě), novaVerze() vrátí true a main.js stránku obnoví, až to nikoho nevyruší
//   (v menu, ne uprostřed hry).
// - Přidat na plochu: Chrome a Edge (Android i počítač) pošlou beforeinstallprompt, ten se schová pro tlačítko.
//   Safari na iPhonu nic takového nemá, tam se jen napíše, kde to v Safari je (Sdílet → Přidat na plochu).
const nav = globalThis.navigator;
const okno = globalThis.window;
let nabidka = null;
let nainstalovano = false;
let novaVerzeCeka = false;
let pripraveno = false;
const posluchaci = new Set();
const ohlas = () => { for (const f of posluchaci) f(); };

// Zavolá f po každé změně stavu (nabídka instalace přišla, hra se nainstalovala, uložila pro offline…).
// Vrátí funkci, která posluchače zase odebere.
export function priZmene(f) {
  posluchaci.add(f);
  return () => posluchaci.delete(f);
}

// Běží hra z plochy (nainstalovaná aplikace), ne v okně prohlížeče?
export function zPlochy() {
  if (!okno) return false;
  return nainstalovano || nav?.standalone === true
    || ['standalone', 'fullscreen', 'minimal-ui'].some((rezim) => okno.matchMedia?.(`(display-mode: ${rezim})`).matches);
}

// iPhone nebo iPad (i iPad, který se hlásí jako Mac, pozná se podle dotyku).
function apple() {
  if (!nav) return false;
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

// Co jde s instalací udělat: 'plocha' (už běží z plochy), 'nabidka' (prohlížeč nabízí instalaci, tlačítko ji
// otevře), 'ios' (Safari: Sdílet → Přidat na plochu), 'prohlizec' (jiný prohlížeč, hledej v jeho nabídce).
// offline = hra je uložená v zařízení a jde hrát bez internetu.
export function stav() {
  const kde = zPlochy() ? 'plocha' : nabidka ? 'nabidka' : apple() ? 'ios' : 'prohlizec';
  return { kde, offline: pripraveno };
}

// Otevře nabídku instalace prohlížeče. Vrátí true, když ji hráč potvrdil.
export async function pridejNaPlochu() {
  if (!nabidka) return false;
  const n = nabidka;
  nabidka = null;
  await n.prompt();
  const { outcome } = await n.userChoice;
  if (outcome === 'accepted') nainstalovano = true;
  ohlas();
  return outcome === 'accepted';
}

// Nová verze hry už převzala stránku, která běží se starou (main.js ji obnoví v menu).
export function novaVerze() {
  return novaVerzeCeka;
}

// Až se nový worker dokončí aktivaci (stránku převezme už na začátku aktivace, keše starých verzí smaže až v ní).
function aktivovany(worker) {
  return new Promise((hotovo) => {
    const hotov = () => ['activated', 'redundant'].includes(worker?.state ?? 'activated');
    if (hotov()) hotovo();
    else worker.addEventListener('statechange', () => { if (hotov()) hotovo(); });
  });
}

// Běží stránka se starými soubory? Moduly z import mapy a styl stránky (adresy s otiskem) musí být v keši nové
// verze (keše starých verzí jsou po aktivaci smazané).
async function staraStranka() {
  const mapa = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || '{}').imports ?? {};
  const styl = document.querySelector('link[rel="stylesheet"]')?.href;
  for (const adresa of [...Object.values(mapa).map((u) => new URL(u, location.href).href), styl]) {
    if (adresa && !(await caches.match(adresa))) return true;
  }
  return false;
}

export function registruj() {
  if (!okno) return;
  okno.addEventListener('beforeinstallprompt', (udalost) => {
    udalost.preventDefault();
    nabidka = udalost;
    ohlas();
  });
  okno.addEventListener('appinstalled', () => {
    nabidka = null;
    nainstalovano = true;
    ohlas();
  });
  const sw = nav?.serviceWorker;
  if (!sw || !okno.isSecureContext) return;
  // Na vlastním počítači (python3 -m http.server) by worker dával moduly z keše a změna bez verze.mjs by nebyla
  // vidět: tam se registruje jen s ?offline v adrese, jinak se starý worker odregistruje.
  const mistni = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (mistni && !new URLSearchParams(location.search).has('offline')) {
    sw.getRegistrations?.().then((r) => r.forEach((x) => x.unregister())).catch(() => {});
    return;
  }
  // Při první instalaci stránku nikdo neovládal: převzetí pak není nová verze.
  const meloOvladac = Boolean(sw.controller);
  sw.addEventListener('controllerchange', async () => {
    if (meloOvladac) {
      await aktivovany(sw.controller);
      if (await staraStranka().catch(() => false)) novaVerzeCeka = true;
    }
    ohlas();
  });
  sw.register('./sw.js', { updateViaCache: 'none' }).then((registrace) => {
    sw.ready.then(() => { pripraveno = true; ohlas(); });
    if (meloOvladac) registrace.update().catch(() => {});
    // Aplikace na telefonu běží klidně dny: po návratu z pozadí se zeptá na novou verzi.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registrace.update().catch(() => {});
    });
  }).catch(() => {});
}
