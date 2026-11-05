// Service worker RuGee: hra jde hrát i bez internetu a po nasazení nové verze nezůstane viset ve staré.
// VERZE a SOUBORY mezi značkami zapisuje node nastroje/verze.mjs (otisky obsahu jako ?v= v index.html), ručně je
// neměň. Každá změna kódu, stylu, stránky, manifestu nebo ikon tak změní i tenhle soubor a prohlížeč pozná novou
// verzi (sw.js si stahuje vždy ze sítě, aplikace.js ho registruje s updateViaCache: 'none').
// - Instalace stáhne celou verzi do keše rugee-<VERZE> (stránku i soubory naráz, ať k sobě vždycky pasují)
//   a hned se aktivuje. Aktivace smaže keše starých verzí a převezme otevřené stránky.
// - Stránka hry jde vždycky nejdřív ze sítě (a mimo HTTP keš prohlížeče), takže po nasazení je nová verze hned
//   při dalším načtení. Keš ji jen záloží: bez sítě, nebo když síť do CEKANI_NA_SIT ms neodpoví, se vezme z keše.
// - Skripty a styl mají v adrese otisk (?v=…), takže jsou neměnné a berou se z keše. Co v keši není (nová verze
//   stránky, ke které se nový worker ještě instaluje), jde ze sítě.
// verze: začátek (generuje node nastroje/verze.mjs, ručně neupravovat)
const VERZE = '1d23db68';
const SOUBORY = [
  './',
  './style.css?v=bcdae370',
  './src/aplikace.js?v=b374be02',
  './src/barvy.js?v=a3bd8c32',
  './src/duse.js?v=15fc9cc1',
  './src/hra.js?v=6eb7aea6',
  './src/kresleni.js?v=c2a4b742',
  './src/louka.js?v=fd24061d',
  './src/main.js?v=1ad06855',
  './src/mapy.js?v=bfd99277',
  './src/menu.js?v=d3387d2e',
  './src/obchod.js?v=c39b438d',
  './src/osvetleni.js?v=5f86fef8',
  './src/ovladac.js?v=2ac9ac15',
  './src/pismo.js?v=910d689d',
  './src/prenos.js?v=f429ab74',
  './src/rng.js?v=60bdabbe',
  './src/sprity.js?v=a240a176',
  './src/strom.js?v=0a80ba9d',
  './src/svetla.js?v=ceb602f8',
  './src/texty.js?v=fa3abc7b',
  './src/ulozeni.js?v=fdd362a6',
  './src/volba.js?v=43d750a5',
  './src/vybava.js?v=a3e26c7d',
  './src/vystroj.js?v=c932169c',
  './src/vzory.js?v=a74be1f5',
  './src/zvuk.js?v=ac9e1080',
  './src/texty/cs.js?v=6da4c926',
  './src/texty/en.js?v=6c08306e',
  './src/shadery/obraz-pixel.glsl?v=ccac4bd3',
  './src/shadery/obraz-vrchol.glsl?v=e885302b',
  './src/shadery/svetla-pixel.glsl?v=64aeaa2c',
  './src/shadery/svetla-vrchol.glsl?v=ac4901ae',
  './manifest.webmanifest',
  './ikony/ikona-192.png',
  './ikony/ikona-32.png',
  './ikony/ikona-512.png',
  './ikony/ikona-apple-180.png',
  './ikony/ikona-maska-512.png'
];
// verze: konec

const KES = `rugee-${VERZE}`;
const CEKANI_NA_SIT = 4000;
const adresa = (u) => new URL(u, self.location.href).href;
const STRANKA = adresa('./');
const ZNAME = new Set(SOUBORY.map(adresa));
const STRANKY_HRY = new Set([STRANKA, adresa('./index.html')]);

self.addEventListener('install', (udalost) => {
  udalost.waitUntil((async () => {
    const kes = await caches.open(KES);
    // cache: 'reload' = mimo HTTP keš prohlížeče, ať se do nové verze nedostane starý soubor.
    await kes.addAll(SOUBORY.map((u) => new Request(adresa(u), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (udalost) => {
  udalost.waitUntil((async () => {
    for (const klic of await caches.keys()) {
      if (klic.startsWith('rugee-') && klic !== KES) await caches.delete(klic);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (udalost) => {
  const { request } = udalost;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    url.search = '';
    url.hash = '';
    if (STRANKY_HRY.has(url.href)) udalost.respondWith(stranka(request));
    return;
  }
  if (ZNAME.has(request.url)) udalost.respondWith(soubor(request));
});

// Stránka ze sítě (bez HTTP keše, jen ověří ETag), záloha z keše. Do keše se z navigace nic nezapisuje: stránka
// v keši musí pasovat k souborům v téže keši, a ty přinese až instalace nové verze. Navigaci nejde poslat dál
// s jinými volbami (prohlížeč to odmítne), proto se stahuje adresa.
async function stranka(request) {
  const zeSite = fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' });
  zeSite.catch(() => {});
  const zaloha = () => caches.match(STRANKA, { cacheName: KES });
  let casovac;
  const pozde = new Promise((hotovo) => { casovac = setTimeout(hotovo, CEKANI_NA_SIT, 'pozde'); });
  try {
    const prvni = await Promise.race([zeSite, pozde]);
    if (prvni !== 'pozde') return prvni;
    // Síť je pomalá: když je verze v keši, hraje se z ní, jinak se na síť počká.
    return (await zaloha()) ?? (await zeSite);
  } catch {
    return (await zaloha()) ?? Response.error();
  } finally {
    clearTimeout(casovac);
  }
}

// Soubory hry z keše téhle verze, a když tam nejsou (třeba se ještě instalují), ze sítě. Jen match s cacheName:
// caches.open by keš, kterou mezitím smazala aktivace nové verze, založil znovu (prázdnou).
async function soubor(request) {
  return (await caches.match(request, { cacheName: KES })) ?? fetch(request);
}
