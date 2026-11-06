// Náhledy RuGee pro sdílení: obrázek, který chat nebo sociální síť ukáže u odkazu na hru (og:image v index.html),
// a sociální náhled repa na GitHubu. Je to skutečná scéna ze hry, nic se nekreslí navíc: Chromium bez okna
// (Playwright) spustí hru se semínkem, nechá ji hrát jednoduchého bota (utíká od nepřátel, sbírá krystaly, bere
// zbraně), vykreslí jeden snímek přes kresli() ze src/kresleni.js a přes něj dá logo a podtitul pixelovým písmem
// hry (src/pismo.js). Nakonec se obrázek převede na paletu 256 barev (Pillow, pokud je), ať je malý: WhatsApp
// a další chaty velké obrázky u odkazu neukážou. Stejné semínko a stejný kód dají stejný obrázek.
//   node nastroje/nahled.mjs                       # docs/ukazky/nahled.png (1200×630), socialni-nahled.png (1280×640)
//                                                  # a logo.png (logo do hlavičky README, průhledné pozadí)
//   node nastroje/nahled.mjs --seminko 3 --mapa louka --sekund 230 --trida lovec --pet dracek:epicka:3 --zvetseni 3
//   node nastroje/nahled.mjs --jen nahled --slozka /tmp/zkouska   # jen jeden z obrázků, jinam (na zkoušení scén)
// Potřebuje Node 18+ a Playwright s Chromiem, Python 3 s Pillow je jen na zmenšení. Playwright se v repu
// neinstaluje: vezme se balíček „playwright“ z okolí, nebo ten z proměnné PLAYWRIGHT_MODUL (cesta ke složce
// balíčku), stejně jako u nastroje/natoc.mjs.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('../', import.meta.url));
const volba = (jmeno, vychozi) => {
  const i = process.argv.indexOf(`--${jmeno}`);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : vychozi;
};

// Výchozí scéna: Louka s vlastními tvory (včely, králíci, hadi, strašáci), Lovec s dráčkem a hromadou zbraní
// ve 3:20, kdy už je kolem hustá horda. Scéna se zvětší dvakrát (zvetseni), ať jsou pixely vidět i na malém
// náhledu v chatu a horda se pořád vejde.
const SCENA = {
  seminko: Number(volba('seminko', 1)),
  mapa: volba('mapa', 'louka'),
  trida: volba('trida', 'lovec'),
  sekund: Number(volba('sekund', 200)),
  pet: volba('pet', 'dracek:epicka:3'),
  zvetseni: Number(volba('zvetseni', 2)),
};
// Obrázky: og:image má poměr 1,91 : 1 (1200×630 bere Facebook, Discord, X i WhatsApp), GitHub chce 1280×640
// a okraj 40 px, který může oříznout. logo a podtitul = násobek pixelu písma, horni = horní hrana loga v px,
// hrdina = kde na výšku stojí hrdina (0 nahoře, 1 dole).
const OBRAZKY = {
  nahled: { soubor: 'docs/ukazky/nahled.png', sirka: 1200, vyska: 630, logo: 10, podtitul: 4, horni: 54, hrdina: 0.62 },
  'socialni-nahled': { soubor: 'docs/ukazky/socialni-nahled.png', sirka: 1280, vyska: 640, logo: 10, podtitul: 4, horni: 64, hrdina: 0.62 },
};
const PODTITUL = volba('podtitul', 'SURVIVORS HRA V PROHLÍŽEČI');
// Logo do hlavičky README: stejné písmo a stín jako v menu, pixel loga = 20 px. README ho ukáže poloviční
// (380 px), takže zůstane ostré i na displeji s dvojnásobnou hustotou pixelů.
const LOGO = { soubor: 'docs/ukazky/logo.png', meritko: 20 };

const TYPY = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.glsl': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
};

// Statický server repa na volném portu 127.0.0.1 (jen pro tenhle běh).
function server() {
  const s = createServer(async (pozadavek, odpoved) => {
    const cesta = normalize(decodeURIComponent(new URL(pozadavek.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (cesta.startsWith('..')) { odpoved.writeHead(403).end(); return; }
    try {
      const data = await readFile(join(KOREN, cesta || 'index.html'));
      odpoved.writeHead(200, { 'content-type': TYPY[extname(cesta)] ?? 'application/octet-stream' }).end(data);
    } catch {
      odpoved.writeHead(404).end();
    }
  });
  return new Promise((hotovo) => { s.listen(0, '127.0.0.1', () => hotovo(s)); });
}

// Převede PNG na paletu (nejvýš 256 barev, bez rozptylu, ať pixely zůstanou čisté). Scéna má kvůli průhledným
// oblakům, světlu a ztmavení tisíce odstínů a plnobarevné PNG z Chromia má 800 kB, s paletou kolem 200 kB a okem
// rozdíl není. Bez Pythonu nebo Pillow zůstane plnobarevné. Vrátí počet barev před převodem, nebo null.
const PALETA_PY = `
import sys
from PIL import Image
cesta = sys.argv[1]
obr = Image.open(cesta).convert('RGB')
barev = len(obr.getcolors(1 << 24))
metoda = getattr(getattr(Image, 'Quantize', Image), 'MEDIANCUT', 0)
bez_rozptylu = getattr(getattr(Image, 'Dither', Image), 'NONE', 0)
obr.quantize(min(256, barev), method=metoda, dither=bez_rozptylu).save(cesta, optimize=True)
print(barev)
`;
function naPaletu(cesta) {
  const beh = spawnSync(process.env.PYTHON || 'python3', ['-c', PALETA_PY, cesta], { encoding: 'utf8' });
  return beh.status === 0 ? Number(beh.stdout.trim()) : null;
}

function nactiPlaywright() {
  const pozadavek = createRequire(import.meta.url);
  const kde = process.env.PLAYWRIGHT_MODUL || 'playwright';
  try {
    return pozadavek(kde);
  } catch (chyba) {
    console.error(`Playwright nenalezen (${kde}). Nainstaluj ho (npm i playwright && npx playwright install chromium)`);
    console.error('nebo nastav PLAYWRIGHT_MODUL na složku balíčku playwright.');
    throw chyba;
  }
}

// Běží ve stránce: logo RuGee pixelovým písmem hry se stínem jako .logo v menu, průhledné pozadí, PNG v base64.
async function logoVeStrance({ meritko }) {
  const { nakresliText, STYL_LOGA } = await import('/src/pismo.js');
  const maly = nakresliText(document.createElement('canvas'), 'RuGee', STYL_LOGA);
  const posun = 2;
  const platno = document.createElement('canvas');
  platno.width = maly.width * meritko;
  platno.height = (maly.height + posun) * meritko;
  const g = platno.getContext('2d');
  g.imageSmoothingEnabled = false;
  const stin = document.createElement('canvas');
  stin.width = maly.width;
  stin.height = maly.height;
  const gs = stin.getContext('2d');
  gs.drawImage(maly, 0, 0);
  gs.globalCompositeOperation = 'source-in';
  gs.fillStyle = 'rgba(20,12,8,0.4)';
  gs.fillRect(0, 0, stin.width, stin.height);
  g.drawImage(stin, 0, posun * meritko, platno.width, maly.height * meritko);
  g.drawImage(maly, 0, 0, platno.width, maly.height * meritko);
  return { png: platno.toDataURL('image/png').split(',')[1], sirka: platno.width, vyska: platno.height };
}

// Běží ve stránce: odehraje scénu, nakreslí obrázek a vrátí ho jako PNG v base64.
async function nakresliVeStrance({ scena, obrazek, podtitul }) {
  const { vytvorRng } = await import('/src/rng.js');
  const hraModul = await import('/src/hra.js');
  const { novaHra, aktualizuj, vyber, rozhodniKus, odejdiOdKupce, ZAKLAD_UROVNI } = hraModul;
  const { kresli } = await import('/src/kresleni.js');
  const { nakresliText, STYL_LOGA, STYL_PERGAMEN } = await import('/src/pismo.js');

  const [druh, rarita, uroven] = scena.pet ? scena.pet.split(':') : [];
  const pet = druh ? { druh, rarita: rarita || 'bezna', uroven: Number(uroven) || 1 } : null;
  const hra = novaHra(vytvorRng(scena.seminko), scena.trida, {}, scena.mapa, pet);

  // Scéna v rozlišení zmenšeném o zvetseni. Hrdina je vždy uprostřed plátna, takže plátno je vyšší a do obrázku
  // jde jen jeho horní kus: hrdina pak stojí níž a nad ním je místo na logo.
  const w = Math.ceil(obrazek.sirka / scena.zvetseni);
  const h = Math.ceil(obrazek.vyska / scena.zvetseni);
  const vyskaPlatna = Math.round(2 * obrazek.hrdina * h);

  // Bot jako v nastroje/natoc.mjs: utíká od nepřátel (od bosse dál), jinak jde pro truhlu, krystal nebo zlaťák.
  const pod = (v) => v.od < ZAKLAD_UROVNI;
  const smer = (t) => {
    const { hrdina } = hra;
    let dx = 0;
    let dy = 0;
    const utec = (o, polomer, vaha) => {
      const vx = hrdina.x - o.x;
      const vy = hrdina.y - o.y;
      const d = Math.hypot(vx, vy);
      if (d < polomer && d > 0) {
        dx += (vx / d) * (polomer - d) * vaha;
        dy += (vy / d) * (polomer - d) * vaha;
      }
    };
    for (const n of hra.nepratele) utec(n, n.boss ? 220 : 120, n.boss ? 2 : 1);
    for (const o of [...(hra.oblaky ?? []), ...(hra.kameny ?? [])]) utec(o, (o.polomer ?? 20) + 20, 4);
    if (Math.hypot(dx, dy) >= 1) return { dx, dy };
    let cil = null;
    let nejD = Infinity;
    for (const p of [...(hra.krystaly ?? []), ...(hra.predmety ?? [])]) {
      const d = Math.hypot(p.x - hrdina.x, p.y - hrdina.y);
      if (d < nejD) { cil = p; nejD = d; }
    }
    return cil ? { dx: cil.x - hrdina.x, dy: cil.y - hrdina.y } : { dx: Math.cos(t * 0.6), dy: Math.sin(t * 0.6) };
  };
  const dt = 1 / 60;
  for (let i = 0; hra.cas < scena.sekund && i < scena.sekund * 120; i++) {
    if (hra.konec) throw new Error(`hrdina padl v ${Math.round(hra.cas)} s, zkus jiné semínko nebo kratší --sekund`);
    if (hra.porovnani) rozhodniKus(hra, true);
    if (hra.volby) {
      const v = hra.volby;
      vyber(hra, v.find((k) => k.druh === 'zbran' && pod(k)) ?? v.find((k) => k.druh === 'pasiva' && pod(k)) ?? v[0]);
    }
    if (hra.obchod) odejdiOdKupce(hra);
    const s = smer(hra.cas);
    const d = Math.hypot(s.dx, s.dy) || 1;
    aktualizuj(hra, dt, { dx: s.dx / d, dy: s.dy / d }, w, vyskaPlatna);
  }
  hra.tres = 0;

  const scenaPlatno = document.createElement('canvas');
  scenaPlatno.width = w;
  scenaPlatno.height = vyskaPlatna;
  // Pruhy bossů a ohlášení patří pod horní lištu hry, tady by zakryly logo: horni je posune mimo plátno.
  kresli(scenaPlatno.getContext('2d'), hra, { cislaPoskozeni: false, horni: -10000 });

  const platno = document.createElement('canvas');
  platno.width = obrazek.sirka;
  platno.height = obrazek.vyska;
  const g = platno.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(scenaPlatno, 0, 0, w, h, 0, 0, w * scena.zvetseni, h * scena.zvetseni);
  // Ztmavení do teplé hnědé jako pod hlavním menu (barva obrysu rámů), ať logo vynikne a scéna nebije do očí.
  g.fillStyle = 'rgba(20,12,8,0.3)';
  g.fillRect(0, 0, obrazek.sirka, obrazek.vyska);
  const tma = g.createRadialGradient(obrazek.sirka / 2, obrazek.vyska * 0.45, obrazek.vyska * 0.3, obrazek.sirka / 2, obrazek.vyska / 2, obrazek.sirka * 0.62);
  tma.addColorStop(0, 'rgba(20,12,8,0)');
  tma.addColorStop(1, 'rgba(20,12,8,0.55)');
  g.fillStyle = tma;
  g.fillRect(0, 0, obrazek.sirka, obrazek.vyska);

  // Nápis zvětšený celým násobkem se stínem dole (jako .logo v menu: drop-shadow 0 4px tmavě hnědá).
  const napis = (text, styl, meritko, y) => {
    const maly = nakresliText(document.createElement('canvas'), text, styl);
    const sw = maly.width * meritko;
    const sh = maly.height * meritko;
    const x = Math.round((obrazek.sirka - sw) / 2);
    const stin = document.createElement('canvas');
    stin.width = maly.width;
    stin.height = maly.height;
    const gs = stin.getContext('2d');
    gs.drawImage(maly, 0, 0);
    gs.globalCompositeOperation = 'source-in';
    gs.fillStyle = 'rgba(20,12,8,0.7)';
    gs.fillRect(0, 0, stin.width, stin.height);
    g.drawImage(stin, x, y + Math.max(4, meritko), sw, sh);
    g.drawImage(maly, x, y, sw, sh);
    return y + sh;
  };
  const podLogem = napis('RuGee', STYL_LOGA, obrazek.logo, obrazek.horni);
  napis(podtitul, STYL_PERGAMEN, obrazek.podtitul, podLogem + obrazek.podtitul * 5);

  return {
    png: platno.toDataURL('image/png').split(',')[1],
    cas: hra.cas,
    uroven: hra.hrdina.uroven,
    nepratel: hra.nepratele.length,
    druhy: [...new Set(hra.nepratele.map((n) => n.druh))],
    zbrane: Object.keys(hra.zbrane),
  };
}

async function main() {
  const jen = volba('jen', null);
  const slozka = volba('slozka', null);
  if (slozka) await mkdir(slozka, { recursive: true });
  const vybrane = Object.entries(OBRAZKY).filter(([id]) => !jen || id === jen);
  const sLogem = !jen || jen === 'logo';
  if (!vybrane.length && !sLogem) throw new Error(`neznámý obrázek --jen ${jen} (je ${Object.keys(OBRAZKY).join(', ')}, logo)`);
  const s = await server();
  const adresa = `http://127.0.0.1:${s.address().port}/`;
  const { chromium } = nactiPlaywright();
  const prohlizec = await chromium.launch();
  try {
    // locale: jazyk hry se při prvním spuštění vezme z prohlížeče, náhled je česky
    const kontext = await prohlizec.newContext({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 1, locale: 'cs-CZ' });
    const stranka = await kontext.newPage();
    const chyby = [];
    stranka.on('pageerror', (e) => chyby.push(String(e)));
    // Prázdná stránka na adrese hry, ať jdou moduly načíst (index.html by pustil celou hru a menu).
    await kontext.route(`${adresa}nahled.html`, (cesta) => cesta.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><body></body>' }));
    await stranka.goto(`${adresa}nahled.html`);
    for (const [id, obrazek] of vybrane) {
      const vysledek = await stranka.evaluate(nakresliVeStrance, { scena: SCENA, obrazek, podtitul: PODTITUL });
      const data = Buffer.from(vysledek.png, 'base64');
      const cil = slozka ? join(slozka, basename(obrazek.soubor)) : join(KOREN, obrazek.soubor);
      await writeFile(cil, data);
      const barev = naPaletu(cil);
      const velikost = (await stat(cil)).size;
      const m = Math.floor(vysledek.cas / 60);
      const sec = String(Math.floor(vysledek.cas % 60)).padStart(2, '0');
      const paleta = barev ? `paleta z ${barev} barev` : 'bez palety (chybí python3 s Pillow)';
      console.log(`${cil}: ${obrazek.sirka}×${obrazek.vyska}, ${Math.round(velikost / 1024)} kB (${paleta}), hra ${m}:${sec}, `
        + `úroveň ${vysledek.uroven}, nepřátel ${vysledek.nepratel} (${vysledek.druhy.join(', ')}), zbraně ${vysledek.zbrane.join(', ')} [${id}]`);
    }
    if (sLogem) {
      const logo = await stranka.evaluate(logoVeStrance, { meritko: LOGO.meritko });
      const cil = slozka ? join(slozka, basename(LOGO.soubor)) : join(KOREN, LOGO.soubor);
      await writeFile(cil, Buffer.from(logo.png, 'base64'));
      console.log(`${cil}: ${logo.sirka}×${logo.vyska}, ${Math.round((await stat(cil)).size / 1024)} kB [logo]`);
    }
    if (chyby.length) throw new Error(`chyby ve stránce: ${chyby.join('; ')}`);
  } finally {
    await prohlizec.close();
    s.close();
  }
}

main().catch((chyba) => {
  console.error(chyba);
  process.exit(1);
});
