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
const VERZE = 'ecf858d3';
const SOUBORY = [
  './',
  './style.css?v=d1405916',
  './src/aplikace.js?v=b374be02',
  './src/barvy.js?v=17c49c1b',
  './src/duse.js?v=15fc9cc1',
  './src/hra.js?v=8ff21272',
  './src/kresleni.js?v=90889a00',
  './src/lihen.js?v=289e6a45',
  './src/louka.js?v=fd24061d',
  './src/main.js?v=8f262269',
  './src/mapy.js?v=e88eec9e',
  './src/menu.js?v=ea37f73a',
  './src/obchod.js?v=9adaeef4',
  './src/osvetleni.js?v=5f86fef8',
  './src/ovladac.js?v=2ac9ac15',
  './src/pety.js?v=1eed6e20',
  './src/pismo.js?v=68bc7495',
  './src/prehled.js?v=4ae4d820',
  './src/prenos.js?v=f5449eae',
  './src/rng.js?v=60bdabbe',
  './src/sprity.js?v=4cc5256c',
  './src/strom.js?v=df6de417',
  './src/svetla.js?v=a9a0dec5',
  './src/texty.js?v=0ecc95e2',
  './src/ulozeni.js?v=30311597',
  './src/volba.js?v=086a55cd',
  './src/vybava.js?v=4e378301',
  './src/vystroj.js?v=217eae86',
  './src/vzory.js?v=a74be1f5',
  './src/zvuk.js?v=c2e231d6',
  './src/texty/cs.js?v=8f6fc3ca',
  './src/texty/en.js?v=7ab6fc51',
  './src/texty/ru.js?v=244ed762',
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
