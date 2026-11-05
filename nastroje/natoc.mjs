// Natočí hru v prohlížeči pro nastroje/ukazky.py: Playwright (Chromium bez okna) otevře hru a jednoduchý bot ji hraje
// (utíká od nepřátel, sbírá krystaly, bere karty, od kupce hned odejde, po prohře dá Znovu).
//   node nastroje/natoc.mjs --url http://127.0.0.1:8000/?seed=1 --vystup slozka [--sekund 230] [--ffmpeg cesta]
// Do složky dá video.mkv (celá obrazovka), stred.mkv (střed obrazovky bez ztráty kvality, z něj je GIF),
// menu.png, uroven.png, boj-NN.png a osa.json (časy v sekundách od začátku videa).
//
// Video se nebere z vestavěného nahrávání Playwrightu (to ho stlačí na 1 Mbit/s a pixely se rozmažou), ale ze
// snímků obrazovky Chromia v PNG (CDP screencast), které jdou rovnou do ffmpeg. Celá obrazovka se uloží v H.264
// (na prohlížení), střed kolem hrdiny bezeztrátově: pixel art má jen pár desítek barev a GIF z něj vyjde ostrý a malý.
//
// Bot potřebuje vidět, kde jsou nepřátelé a krystaly. Do natáčené kopie src/main.js se proto na konec připíše
// jeden řádek, který stav hry půjčí botovi (soubor v repu se nemění). Kdyby háček nefungoval, bot chodí v kruhu.
// Playwright se v repu neinstaluje: vezme se balíček „playwright“ z okolí, nebo ten z proměnné PLAYWRIGHT_MODUL
// (cesta ke složce balíčku, např. …/node_modules/playwright).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const volba = (jmeno, vychozi) => {
  const i = process.argv.indexOf(`--${jmeno}`);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : vychozi;
};
const URL_HRY = volba('url', 'http://127.0.0.1:8000/?seed=1');
const VYSTUP = resolve(volba('vystup', join(tmpdir(), 'rugee-natoceni')));
// Výchozích 230 s stihne i prvního bosse (přijde ve 3:00 herního času, okna úrovní hru zdrží).
const SEKUND = Number(volba('sekund', 230));
const FFMPEG = volba('ffmpeg', process.env.FFMPEG || 'ffmpeg');
// Hra kreslí 60 snímků za sekundu, natáčí se každý druhý.
const FPS_VIDEA = 30;
const SIRKA = Number(volba('sirka', 1280));
const VYSKA = Number(volba('vyska', 720));
// Bezeztrátový střed obrazovky (šířka × výška), ze kterého ukazky.py vyřízne GIF.
const [STRED_W, STRED_H] = volba('stred', '640x400').split('x').map((c) => Math.min(Number(c), 4096) & ~1);
// Okno úrovně se vyfotí první, které přijde po tolika sekundách hry (dřív je výbava skoro prázdná).
const UROVEN_OD = Number(volba('uroven-od', 40));
// Jak často se vyfotí boj (ukazky.py pak vezme snímek z nejakčnější chvíle).
const BOJ_KAZDYCH = Number(volba('boj-kazdych', 5));
const HACEK = '\n;globalThis.__natoc = { hra: () => hra };\n';

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

const cekej = (ms) => new Promise((hotovo) => { setTimeout(hotovo, ms); });

// Běží ve stránce: co je na obrazovce a kam má bot jít. Stejná pravidla jako bot v tests/simulace.mjs, jen kratší:
// utíká od nepřátel do 160 px, kamenům a jedu se vyhne, jinak jde pro truhlu, krystal nebo zlaťák, a když nic
// není, chodí v kruhu. Na úrovni bere novou zbraň, pak pasivu pod 5. úrovní, pak cokoli.
function botVeStrance(t) {
  const videt = (id) => {
    const e = document.getElementById(id);
    return Boolean(e) && !e.hidden;
  };
  let okno = null;
  if (document.body.classList.contains('v-menu')) okno = 'menu';
  else if (videt('konec')) okno = 'konec';
  else if (videt('porovnani')) okno = 'porovnani';
  else if (videt('volba')) okno = 'volba';
  else if (videt('obchod')) okno = 'obchod';
  else if (videt('pauza')) okno = 'pauza';
  const stav = {
    okno,
    cas: document.getElementById('cas')?.textContent ?? '',
    uroven: Number(document.getElementById('uroven')?.textContent) || 0,
    zabito: Number(document.getElementById('zabito')?.textContent) || 0,
    dx: Math.cos(t * 0.8),
    dy: Math.sin(t * 0.8),
    karta: Math.floor(Math.random() * 3),
    hacek: false,
  };
  let hra = null;
  try {
    hra = globalThis.__natoc?.hra();
  } catch {
    hra = null;
  }
  if (!hra?.hrdina) return stav;
  stav.hacek = true;
  stav.nepratel = hra.nepratele.length;
  stav.boss = hra.nepratele.some((n) => n.boss);
  if (hra.volby?.length) {
    const pod = (v) => v.od < 5;
    const v = hra.volby;
    const karta = v.find((k) => k.druh === 'zbran' && pod(k)) ?? v.find((k) => k.druh === 'pasiva' && pod(k)) ?? v[0];
    stav.karta = Math.max(0, v.indexOf(karta));
  }
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
  for (const n of hra.nepratele) utec(n, n.boss ? 220 : 160, n.boss ? 2 : 1);
  for (const o of hra.oblaky ?? []) utec(o, o.polomer + 20, 4);
  for (const b of hra.bubliny ?? []) utec(b, b.polomer + 24, 4);
  for (const k of hra.kameny ?? []) utec(k, k.polomer + 16, 4);
  const blizko = (seznam, dosah) => {
    let nej = null;
    let nejD = dosah;
    for (const p of seznam) {
      const d = Math.hypot(p.x - hrdina.x, p.y - hrdina.y);
      if (d < nejD) { nej = p; nejD = d; }
    }
    return nej;
  };
  const truhly = (hra.predmety ?? []).filter((p) => p.druh === 'truhla');
  const truhla = blizko(truhly, 220);
  if (truhla) {
    const d = Math.hypot(truhla.x - hrdina.x, truhla.y - hrdina.y) || 1;
    dx += ((truhla.x - hrdina.x) / d) * 400;
    dy += ((truhla.y - hrdina.y) / d) * 400;
  }
  if (Math.hypot(dx, dy) < 1) {
    const cil = blizko(truhly, 900)
      ?? blizko([...(hra.krystaly ?? []), ...(hra.predmety ?? []).filter((p) => p.druh === 'zlatak')], Infinity);
    if (cil) {
      dx = cil.x - hrdina.x;
      dy = cil.y - hrdina.y;
    } else {
      dx = stav.dx;
      dy = stav.dy;
    }
  }
  stav.dx = dx;
  stav.dy = dy;
  return stav;
}

// Kde leží věci nad plátnem (horní lišta, přehled výbavy, nápověda), ať je ukazky.py z GIFu vyřízne.
function oblastiStranky() {
  const oblasti = {};
  for (const [nazev, vyber] of [['hud', '.hud'], ['vybava', '#vybava'], ['napoveda', '.napoveda']]) {
    const e = document.querySelector(vyber);
    if (!e) continue;
    const r = e.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) oblasti[nazev] = { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  return oblasti;
}

// Směr na klávesy WASD (osm směrů, malé složky se zanedbají).
function klavesySmeru(dx, dy) {
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return [];
  const k = [];
  if (dx / d > 0.38) k.push('d');
  if (dx / d < -0.38) k.push('a');
  if (dy / d > 0.38) k.push('s');
  if (dy / d < -0.38) k.push('w');
  return k;
}

// Nahrávání: Chromium posílá snímek (PNG) pokaždé, když hra překreslí obrazovku (každý druhý). Do ffmpeg jde stálých
// FPS_VIDEA snímků za sekundu (když nový nepřišel, zopakuje se poslední), takže čas ve videu sedí s hodinami.
async function nahravej(stranka, kontext, stred) {
  const ffmpeg = spawn(FFMPEG, [
    '-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(FPS_VIDEA), '-i', '-',
    '-filter_complex', `[0:v]split[cele][s];[s]crop=${stred.w}:${stred.h}:${stred.x}:${stred.y}[stred]`,
    '-map', '[cele]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv444p', join(VYSTUP, 'video.mkv'),
    '-map', '[stred]', '-c:v', 'libx264rgb', '-preset', 'ultrafast', '-qp', '0', join(VYSTUP, 'stred.mkv'),
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const konecFfmpeg = new Promise((hotovo, chyba) => {
    ffmpeg.on('error', chyba);
    ffmpeg.on('close', (kod) => (kod === 0 ? hotovo() : chyba(new Error(`ffmpeg skončil s kódem ${kod}`))));
  });
  konecFfmpeg.catch(() => {});
  let skoncil = false;
  ffmpeg.on('close', () => { skoncil = true; });
  ffmpeg.stdin.on('error', () => {});
  const cdp = await kontext.newCDPSession(stranka);
  let posledni = null;
  let posledniCas = null;
  let zapsano = 0;
  let od = null;
  const dopis = (az) => {
    while (posledni && zapsano < az) {
      ffmpeg.stdin.write(posledni);
      zapsano += 1;
    }
  };
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    const t = metadata.timestamp ?? Date.now() / 1000;
    od ??= t;
    dopis(Math.floor((t - od) * FPS_VIDEA));
    posledni = Buffer.from(data, 'base64');
    posledniCas = t;
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 2 });
  return {
    // Začátek videa na hodinách (s od 1970), ať jdou časy bota převést na čas ve videu.
    zacatek: () => od,
    bezi: () => !skoncil,
    // Poslední snímek z nahrávání jako PNG (fotka bez zastavení hry, page.screenshot by video na chvíli zasekl).
    // Vrátí jeho čas ve videu.
    ulozSnimek(cesta) {
      if (!posledni) return null;
      writeFileSync(cesta, posledni);
      return posledniCas - od;
    },
    async zastav() {
      await cdp.send('Page.stopScreencast').catch(() => {});
      dopis(Math.floor((Date.now() / 1000 - od) * FPS_VIDEA));
      ffmpeg.stdin.end();
      await konecFfmpeg;
      return zapsano / FPS_VIDEA;
    },
  };
}

async function main() {
  mkdirSync(VYSTUP, { recursive: true });
  const { chromium } = nactiPlaywright();
  const prohlizec = await chromium.launch();
  // locale: hra si při prvním spuštění vezme jazyk z prohlížeče, ukázky v README jsou česky
  const kontext = await prohlizec.newContext({ viewport: { width: SIRKA, height: VYSKA }, deviceScaleFactor: 1, locale: 'cs-CZ' });
  // Háček jen pro natáčení: na konec modulu main.js se připíše řádek, který botovi ukáže proměnnou hra.
  await kontext.route(/\/src\/main\.js(\?.*)?$/, async (cesta) => {
    const odpoved = await cesta.fetch();
    await cesta.fulfill({ response: odpoved, body: (await odpoved.text()) + HACEK });
  });
  const stranka = await kontext.newPage();
  const chyby = [];
  stranka.on('pageerror', (e) => chyby.push(String(e)));
  await stranka.goto(URL_HRY, { waitUntil: 'load' });
  await stranka.waitForSelector('#menu-volby button');
  const stred = { x: ((SIRKA - STRED_W) / 2) & ~1, y: ((VYSKA - STRED_H) / 2) & ~1, w: STRED_W, h: STRED_H };
  const video = await nahravej(stranka, kontext, stred);
  for (let i = 0; video.zacatek() === null; i++) {
    if (!video.bezi() || i > 250) throw new Error('nahrávání se nerozběhlo (ffmpeg nebo screencast)');
    await cekej(20);
  }
  const ted = () => Date.now() / 1000 - video.zacatek();
  const osa = {
    url: URL_HRY, sirka: SIRKA, vyska: VYSKA, fpsVidea: FPS_VIDEA, stred, vzorky: [], snimky: [], oblasti: {}, udalosti: [], chyby,
  };
  const udalost = (typ, data = {}) => osa.udalosti.push({ t: ted(), typ, ...data });
  await cekej(1500);
  await stranka.screenshot({ path: join(VYSTUP, 'menu.png') });
  osa.snimky.push({ soubor: 'menu.png', druh: 'menu', t: ted() });

  // Hrát: tlačítko z menu (když by se jmenovalo jinak, Enter vezme první volbu).
  const hrat = stranka.locator('#menu-volby button[data-id="hrat"]');
  if (await hrat.count()) await hrat.click();
  else await stranka.keyboard.press('Enter');
  await stranka.waitForFunction(() => !document.body.classList.contains('v-menu'), null, { timeout: 5000 });
  udalost('start');
  const zacatek = ted();

  let drzene = new Set();
  let oknoOd = 0;
  let uroven = false;
  let dalsiBoj = zacatek + BOJ_KAZDYCH;
  let dalsiMereni = 0;
  let snimkuBoje = 0;
  let her = 1;
  let posledniOkno = null;
  let hacek = false;

  async function drz(klavesy) {
    const nove = new Set(klavesy);
    for (const k of drzene) if (!nove.has(k)) await stranka.keyboard.up(k);
    for (const k of nove) if (!drzene.has(k)) await stranka.keyboard.down(k);
    drzene = nove;
  }

  while (ted() - zacatek < SEKUND) {
    if (!video.bezi()) throw new Error('ffmpeg přestal nahrávat');
    const stav = await stranka.evaluate(botVeStrance, ted());
    const t = ted();
    hacek ||= stav.hacek;
    osa.vzorky.push([Math.round(t * 1000) / 1000, stav.okno, stav.cas, stav.uroven, stav.zabito, stav.nepratel ?? null, stav.boss ? 1 : 0]);
    if (stav.okno !== posledniOkno) {
      udalost(stav.okno ? `okno-${stav.okno}` : 'hra', { cas: stav.cas, uroven: stav.uroven });
      oknoOd = t;
      posledniOkno = stav.okno;
    }

    if (!stav.okno) {
      await drz(klavesySmeru(stav.dx, stav.dy));
      if (t >= dalsiBoj) {
        const soubor = `boj-${String(++snimkuBoje).padStart(2, '0')}.png`;
        const kdy = video.ulozSnimek(join(VYSTUP, soubor));
        if (kdy !== null) osa.snimky.push({ soubor, druh: 'boj', t: kdy, cas: stav.cas, zabito: stav.zabito, nepratel: stav.nepratel ?? null });
        dalsiBoj = ted() + BOJ_KAZDYCH;
      }
      // Oblasti nad plátnem se sčítají přes celé natáčení (přehled výbavy s novými zbraněmi roste).
      if (t >= dalsiMereni) {
        for (const [nazev, r] of Object.entries(await stranka.evaluate(oblastiStranky))) {
          const o = osa.oblasti[nazev] ?? r;
          const x = Math.min(o.x, r.x);
          const y = Math.min(o.y, r.y);
          osa.oblasti[nazev] = { x, y, w: Math.max(o.x + o.w, r.x + r.w) - x, h: Math.max(o.y + o.h, r.y + r.h) - y };
        }
        dalsiMereni = t + 2;
      }
    } else {
      await drz([]);
      // Okno se nechá chvíli otevřené (hra má pojistku 300 ms a karty přijíždějí s animací).
      if (t - oknoOd >= 0.8) {
        if (stav.okno === 'volba') {
          if (!uroven && t - zacatek >= UROVEN_OD) {
            await stranka.screenshot({ path: join(VYSTUP, 'uroven.png') });
            osa.snimky.push({ soubor: 'uroven.png', druh: 'uroven', t: ted(), uroven: stav.uroven });
            uroven = true;
          }
          await stranka.keyboard.press(String(stav.karta + 1));
        } else if (stav.okno === 'porovnani') await stranka.keyboard.press('1');
        else if (stav.okno === 'obchod') await stranka.keyboard.press('Escape');
        else if (stav.okno === 'pauza') await stranka.keyboard.press('p');
        else if (stav.okno === 'konec') {
          udalost('smrt', { cas: stav.cas });
          her += 1;
          await stranka.keyboard.press('r');
        }
        // Kdyby okno nezmizelo (klávesa nic nevybrala), zkusí to bot znovu za půl sekundy.
        oknoOd = t - 0.3;
      }
    }
    await cekej(40);
  }
  await drz([]);
  osa.her = her;
  osa.hacek = hacek;
  osa.konec = ted();
  // Kolik snímků za sekundu prohlížeč kreslil (bez okna jede Chromium bez grafické karty).
  osa.fps = await stranka.evaluate(() => new Promise((hotovo) => {
    let n = 0;
    const od = performance.now();
    const krok = (t) => { n += 1; if (t - od < 1000) requestAnimationFrame(krok); else hotovo(n / ((t - od) / 1000)); };
    requestAnimationFrame(krok);
  }));
  osa.delkaVidea = await video.zastav();
  await kontext.close();
  await prohlizec.close();
  writeFileSync(join(VYSTUP, 'osa.json'), JSON.stringify(osa));
  const posledni = osa.vzorky.at(-1) ?? [];
  console.log(`natočeno ${Math.round(osa.konec)} s, her ${her}, hra ${posledni[2]}, úroveň ${posledni[3]}, zabito ${posledni[4]}, `
    + `${osa.snimky.length} fotek, prohlížeč ${Math.round(osa.fps)} fps, bot ${hacek ? 'vidí hru' : 'chodí v kruhu'}, chyb ${chyby.length}`);
}

main().catch((chyba) => {
  console.error(chyba);
  process.exit(1);
});
