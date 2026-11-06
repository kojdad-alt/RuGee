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
const VERZE = '04dbaaed';
const SOUBORY = [
  './',
  './style.css?v=407d575d',
  './src/aplikace.js?v=b374be02',
  './src/barvy.js?v=a3bd8c32',
  './src/duse.js?v=15fc9cc1',
  './src/hra.js?v=a374fddc',
  './src/kresleni.js?v=544e1993',
  './src/lihen.js?v=289e6a45',
  './src/louka.js?v=fd24061d',
  './src/main.js?v=8f262269',
  './src/mapy.js?v=e88eec9e',
  './src/menu.js?v=31288226',
  './src/obchod.js?v=9adaeef4',
  './src/osvetleni.js?v=5f86fef8',
  './src/ovladac.js?v=2ac9ac15',
  './src/pety.js?v=254d3283',
  './src/pismo.js?v=910d689d',
  './src/prehled.js?v=e2a9c1ff',
  './src/prenos.js?v=032462ed',
  './src/rng.js?v=60bdabbe',
  './src/sprity.js?v=4cc5256c',
  './src/strom.js?v=5ee5941d',
  './src/svetla.js?v=a9a0dec5',
  './src/texty.js?v=fa3abc7b',
  './src/ulozeni.js?v=3bc82cae',
  './src/volba.js?v=8bb141bb',
  './src/vybava.js?v=4e378301',
  './src/vystroj.js?v=c932169c',
  './src/vzory.js?v=a74be1f5',
  './src/zvuk.js?v=3b29f7fb',
  './src/texty/cs.js?v=9cfaa39f',
  './src/texty/en.js?v=5abf59ac',
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
