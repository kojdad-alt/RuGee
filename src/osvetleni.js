// Osvětlení ve WebGL. Hra se dál kreslí do plátna 2D jako vždycky, světla jsou jedna vrstva navíc:
// 1. sberSvetel (svetla.js) vybere, co na obrazovce svítí (hrdina, lucerna, krystaly, láva, oheň, světlušky,
//    výbuchy, schopnosti bossů…), nejvýš MAX_SVETEL.
// 2. Světla se nakreslí jako čtverce do světelné mapy (textura), která je MERITKO_SVETEL× menší než obrazovka
//    (pixel mapy = pixel spritu), a sečtou se (shadery svetla-vrchol.glsl a svetla-pixel.glsl).
// 3. Jeden průchod přes obrazovku (obraz-vrchol.glsl, obraz-pixel.glsl) z mapy udělá tmu s vinětou (levá polovina
//    plátna WebGL) a záři (pravá polovina).
// 4. Obě poloviny se položí na hotový obraz hry v plátně 2D: tma s 'multiply', záře s 'lighter', zvětšené bez
//    vyhlazení. Všechna pole a buffery jsou připravené dopředu, v každém snímku se nic nealokuje.
//
// Shadery jsou samostatné soubory .glsl ve src/shadery, načtou se fetch (adresa s otiskem z import mapy, kterou
// zapisuje nastroje/verze.mjs, takže je má i service worker pro hraní bez internetu). Když se nenačtou, nepřeloží,
// prohlížeč WebGL neumí nebo by ho kreslil bez grafické karty, hra kreslí tmu jako dřív (kresleni.js).
//
// Řízení (režim z nastavení a pojistka): nastavRezimSvetel('auto' | 'zap' | 'vyp'), svetlaProSnimek() v každém
// snímku vrátí, čím kreslit (nebo null = tma bez světel), stavSvetel() a priZmeneSvetel() pro Nastavení.
import { MAX_SVETEL, PRVKU_SVETLA, REZIMY_SVETEL, sberSvetel, osvetleniMapy, vytvorPojistku } from './svetla.js';
import { pomalaSvetla, zapisPomalaSvetla } from './ulozeni.js';

export const MERITKO_SVETEL = 3;
export const SHADERY = ['svetla-vrchol', 'svetla-pixel', 'obraz-vrchol', 'obraz-pixel'];
// Atributy a uniformy, které kód plní (test hlídá, že je shadery opravdu mají).
export const ATRIBUTY = { svetla: ['aRoh', 'aSvetlo', 'aBarva'], obraz: ['aPoz'] };
export const UNIFORMY = {
  svetla: ['uObrazovka'],
  obraz: ['uSvetla', 'uMapa', 'uObrazovka', 'uStred', 'uTma', 'uBarvaTmy', 'uSchody', 'uZare', 'uPrezar', 'uVineta', 'uVinetaOd'],
};
// Na kolik schodů se světlo zaokrouhlí (jako tma bez světel) a kolik ze světla nad 1 se přičte jako přezáření.
const SCHODY = 4;
const PREZAR = 0.35;
// Vrchol světla: roh (2), střed a poloměr (3), barva a jádro (4). Světlo = 2 trojúhelníky = 6 vrcholů.
const FLOATU_VRCHOLU = 9;
const ROHY = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1];

// Adresa shaderu s otiskem (?v=…) z import mapy v index.html, bez ní obyčejná cesta.
function adresaShaderu(jmeno) {
  const cesta = `./src/shadery/${jmeno}.glsl`;
  try {
    const mapa = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent ?? '{}');
    return mapa.imports?.[cesta] ?? cesta;
  } catch {
    return cesta;
  }
}

let zdrojeShaderu = null;
function nactiShadery() {
  zdrojeShaderu ??= Promise.all(SHADERY.map(async (jmeno) => {
    const odpoved = await fetch(adresaShaderu(jmeno));
    if (!odpoved.ok) throw new Error(`${jmeno}.glsl: HTTP ${odpoved.status}`);
    return [jmeno, await odpoved.text()];
  })).then(Object.fromEntries).catch((chyba) => {
    zdrojeShaderu = null;
    throw chyba;
  });
  return zdrojeShaderu;
}

const NASTAVENI_KONTEXTU = {
  alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false,
};

// Kontext WebGL na novém plátně. vynutit = vzít ho, i když by prohlížeč kreslil bez grafické karty (jen režim Zap).
// Vrací { platno, gl } nebo { chyba: 'webgl' | 'pomale' }.
function kontext(vynutit) {
  const platno = document.createElement('canvas');
  const gl = platno.getContext('webgl', { ...NASTAVENI_KONTEXTU, failIfMajorPerformanceCaveat: !vynutit });
  if (gl) return { platno, gl };
  if (vynutit) return { chyba: 'webgl' };
  // Bez grafické karty by to šlo? Pak je WebGL jen pomalé (software), jinak ho prohlížeč neumí vůbec.
  const zkouska = document.createElement('canvas').getContext('webgl', NASTAVENI_KONTEXTU);
  zkouska?.getExtension('WEBGL_lose_context')?.loseContext();
  return { chyba: zkouska ? 'pomale' : 'webgl' };
}

function program(gl, vrchol, pixel, atributy) {
  const shader = (druh, zdroj) => {
    const s = gl.createShader(druh);
    gl.shaderSource(s, zdroj);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl.VERTEX_SHADER, vrchol));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, pixel));
  atributy.forEach((jmeno, i) => gl.bindAttribLocation(p, i, jmeno));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) || 'program');
  return p;
}

// Kreslič světel pro jeden kontext WebGL. Vyhodí chybu, když se programy nepřeloží nebo neprojde kontrola.
function vytvorKreslic(platno, gl, zdroje) {
  const svetla = program(gl, zdroje['svetla-vrchol'], zdroje['svetla-pixel'], ATRIBUTY.svetla);
  const obraz = program(gl, zdroje['obraz-vrchol'], zdroje['obraz-pixel'], ATRIBUTY.obraz);
  const u = (p, jmena) => Object.fromEntries(jmena.map((j) => [j, gl.getUniformLocation(p, j)]));
  const uS = u(svetla, UNIFORMY.svetla);
  const uO = u(obraz, UNIFORMY.obraz);

  const dataSvetel = new Float32Array(MAX_SVETEL * PRVKU_SVETLA);
  const vrcholy = new Float32Array(MAX_SVETEL * 6 * FLOATU_VRCHOLU);
  // Pohledy na začátek pole vrcholů podle počtu světel (vznikají jen poprvé, pak se berou znovu).
  const pohledy = [];
  const bufferSvetel = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferSvetel);
  gl.bufferData(gl.ARRAY_BUFFER, vrcholy.byteLength, gl.DYNAMIC_DRAW);
  const bufferObrazu = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferObrazu);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const textura = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textura);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const ramec = gl.createFramebuffer();
  let w = 0;
  let h = 0;

  // Velikost světelné mapy podle obrazovky (mění se jen po otočení telefonu nebo změně okna).
  function velikost(sirka, vyska) {
    const nw = Math.max(1, Math.ceil(sirka / MERITKO_SVETEL));
    const nh = Math.max(1, Math.ceil(vyska / MERITKO_SVETEL));
    if (nw === w && nh === h) return true;
    w = nw;
    h = nh;
    platno.width = 2 * w;
    platno.height = h;
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ramec);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textura, 0);
    const hotovo = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return hotovo;
  }

  // Kontrola, že obraz z WebGL jde opravdu položit na plátno 2D s 'multiply' (kdyby prohlížeč dal místo něj
  // prázdné nebo černé plátno, byla by celá hra černá): známá barva přes bílou musí vyjít zase ona.
  platno.width = 2;
  platno.height = 2;
  gl.viewport(0, 0, 2, 2);
  gl.clearColor(0.2, 0.6, 0.4, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const zkouska = document.createElement('canvas');
  zkouska.width = 2;
  zkouska.height = 2;
  const z = zkouska.getContext('2d', { willReadFrequently: true });
  z.fillStyle = '#ffffff';
  z.fillRect(0, 0, 2, 2);
  z.globalCompositeOperation = 'multiply';
  z.drawImage(platno, 0, 0);
  const [r, g, b] = z.getImageData(1, 1, 1, 1).data;
  if (Math.abs(r - 51) > 6 || Math.abs(g - 153) > 6 || Math.abs(b - 102) > 6) throw new Error(`kontrola: obraz WebGL na plátně vyšel ${r},${g},${b}`);

  return {
    platno,
    gl,
    pocet: 0,
    // Položí světla na obraz v ctx. Vrací false, když to nejde (ztracený kontext), pak se kreslí tma bez světel.
    kresli(ctx, hra, pohled) {
      if (gl.isContextLost()) return false;
      const sirka = ctx.canvas.width;
      const vyska = ctx.canvas.height;
      if (!velikost(sirka, vyska)) return false;
      const o = osvetleniMapy(hra.mapa);
      const n = sberSvetel(dataSvetel, hra, pohled);
      this.pocet = n;
      const pokryto = MERITKO_SVETEL;

      // 1. světla do mapy
      gl.bindFramebuffer(gl.FRAMEBUFFER, ramec);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (n > 0) {
        let k = 0;
        for (let i = 0; i < n; i++) {
          const b = i * PRVKU_SVETLA;
          for (let r = 0; r < 12; r += 2) {
            vrcholy[k] = ROHY[r];
            vrcholy[k + 1] = ROHY[r + 1];
            vrcholy[k + 2] = dataSvetel[b];
            vrcholy[k + 3] = dataSvetel[b + 1];
            vrcholy[k + 4] = dataSvetel[b + 2];
            vrcholy[k + 5] = dataSvetel[b + 3];
            vrcholy[k + 6] = dataSvetel[b + 4];
            vrcholy[k + 7] = dataSvetel[b + 5];
            vrcholy[k + 8] = dataSvetel[b + 6];
            k += FLOATU_VRCHOLU;
          }
        }
        pohledy[n] ??= vrcholy.subarray(0, n * 6 * FLOATU_VRCHOLU);
        gl.useProgram(svetla);
        gl.uniform2f(uS.uObrazovka, w * pokryto, h * pokryto);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferSvetel);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, pohledy[n]);
        const krok = FLOATU_VRCHOLU * 4;
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, krok, 0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, krok, 8);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, krok, 20);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawArrays(gl.TRIANGLES, 0, n * 6);
        gl.disable(gl.BLEND);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);
      }

      // 2. jeden průchod přes obrazovku: vlevo tma s vinětou, vpravo záře
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, 2 * w, h);
      gl.useProgram(obraz);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.uniform1i(uO.uSvetla, 0);
      gl.uniform2f(uO.uMapa, w, h);
      gl.uniform2f(uO.uObrazovka, w * pokryto, h * pokryto);
      gl.uniform2f(uO.uStred, sirka / 2, h * pokryto - vyska / 2);
      gl.uniform1f(uO.uTma, o.tma);
      gl.uniform3f(uO.uBarvaTmy, o.barvaTmy[0], o.barvaTmy[1], o.barvaTmy[2]);
      gl.uniform1f(uO.uSchody, SCHODY);
      gl.uniform1f(uO.uZare, o.zare);
      gl.uniform1f(uO.uPrezar, PREZAR);
      gl.uniform4f(uO.uVineta, o.vineta.barva[0], o.vineta.barva[1], o.vineta.barva[2], o.vineta.sila);
      gl.uniform2f(uO.uVinetaOd, Math.min(sirka, vyska) * 0.4, Math.max(sirka, vyska) * 0.8);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferObrazu);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 3. na obraz hry: tma násobí, záře přičítá (na Louce bez světel a s černými okraji není co přičíst)
      const pricist = n > 0 || o.pricitat;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(platno, 0, 0, w, h, 0, 0, w * pokryto, h * pokryto);
      if (pricist) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(platno, w, 0, w, h, 0, 0, w * pokryto, h * pokryto);
      }
      ctx.restore();
      return true;
    },
    uvolni() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// ---------- Řízení: režim, příprava a pojistka ----------
const stav = {
  rezim: 'auto',
  kreslic: null,
  // s jakým kontextem je kreslič (true = vynucený, i bez grafické karty)
  vynuceny: false,
  priprava: null,
  // proč světla nesvítí: '' (svítí), 'nacita', 'webgl', 'pomale', 'shadery', 'kontrola', 'fps', 'ztraceno', 'vypnuto'
  duvod: 'nacita',
  pojistka: vytvorPojistku(),
  // Auto si pamatuje, že hra se světly zpomalila (i z minula, ulozeni.js)
  pomale: false,
};
const posluchaci = new Set();
const ohlas = () => { for (const f of posluchaci) f(); };

// Zavolá f po každé změně stavu světel (načetla se, nejdou, pojistka je vypnula). Vrací odhlášení.
export function priZmeneSvetel(f) {
  posluchaci.add(f);
  return () => posluchaci.delete(f);
}

export function stavSvetel() {
  const p = stav.pojistka.stav;
  return {
    rezim: stav.rezim,
    svitit: stav.duvod === '' && Boolean(stav.kreslic),
    duvod: stav.duvod,
    pocet: stav.kreslic?.pocet ?? 0,
    pojistka: { faze: p.faze, fps: Math.round(p.posledniFps), zkousek: p.zkousek, fpsSeSvetly: Math.round(p.fpsSeSvetly), fpsBez: Math.round(p.fpsBez) },
  };
}

function zmenDuvod(duvod) {
  if (stav.duvod === duvod) return;
  stav.duvod = duvod;
  ohlas();
}

function zahod() {
  stav.kreslic?.uvolni();
  stav.kreslic = null;
}

// Hodí se kreslič pro režim? Vynucený kontext (možná bez grafické karty) jen pro Zap, obyčejný pro Auto i Zap.
const hodiSe = (rezim) => Boolean(stav.kreslic) && (rezim === 'zap' || !stav.vynuceny);

// Připraví kreslič pro režim (asynchronně, shadery se načítají). Volá se při změně režimu a po ztrátě kontextu.
function priprav() {
  if (stav.rezim === 'vyp' || stav.priprava || typeof document === 'undefined' || hodiSe(stav.rezim)) return;
  const vynutit = stav.rezim === 'zap';
  zahod();
  zmenDuvod('nacita');
  stav.priprava = (async () => {
    const k = kontext(vynutit);
    if (k.chyba) return zmenDuvod(k.chyba);
    let kreslic;
    try {
      kreslic = vytvorKreslic(k.platno, k.gl, await nactiShadery());
    } catch (chyba) {
      const kontrola = String(chyba?.message).startsWith('kontrola');
      console.warn(kontrola ? 'Světla: obraz z WebGL nejde položit na hru, kreslí se tma bez světel.' : 'Světla: shadery se nenačetly nebo nepřeložily, kreslí se tma bez světel.', chyba);
      k.gl.getExtension('WEBGL_lose_context')?.loseContext();
      return zmenDuvod(kontrola ? 'kontrola' : 'shadery');
    }
    k.platno.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (stav.kreslic !== kreslic) return;
      stav.kreslic = null;
      zmenDuvod('ztraceno');
      // grafika se restartovala (ovladač, moc karet v prohlížeči): za chvíli nový kontext
      setTimeout(priprav, 1000);
    });
    // Mezitím se režim mohl změnit (Vyp, nebo Auto po vynuceném kontextu): tenhle kreslič se zahodí.
    if (stav.rezim === 'vyp' || (stav.rezim === 'auto' && vynutit)) {
      kreslic.uvolni();
      return;
    }
    stav.kreslic = kreslic;
    stav.vynuceny = vynutit;
    zmenDuvod(stav.rezim === 'auto' && stav.pomale ? 'fps' : '');
  })().finally(() => {
    stav.priprava = null;
    // režim se změnil na takový, pro který se právě nechystalo: ještě jednou
    if (stav.rezim !== 'vyp' && !hodiSe(stav.rezim) && (stav.rezim === 'zap') !== vynutit) priprav();
  });
}

// Režim z nastavení. znovu = hráč Auto právě vybral: pojistka začne znovu (zapomene, že hra minule zpomalila).
export function nastavRezimSvetel(rezim, { znovu = false } = {}) {
  const novy = REZIMY_SVETEL.includes(rezim) ? rezim : 'auto';
  if (novy === 'auto' && znovu) {
    zapisPomalaSvetla(null);
    stav.pojistka = vytvorPojistku();
    stav.pomale = false;
  } else if (novy === 'auto') stav.pomale ||= pomalaSvetla();
  stav.rezim = novy;
  if (novy === 'vyp') {
    zahod();
    zmenDuvod('vypnuto');
  } else if (novy === 'auto' && stav.pomale) zmenDuvod('fps');
  else if (hodiSe(novy)) zmenDuvod('');
  else priprav();
}

// V každém snímku: čím kreslit světla (kreslič), nebo null = tma bez světel. dt = skutečný odstup od minulého
// snímku v s, merit = jestli se snímek počítá pojistce (jen za hry, menu ne).
export function svetlaProSnimek(dt, merit) {
  const k = stav.kreslic;
  if (!k || stav.rezim === 'vyp') return null;
  if (stav.rezim === 'zap') return k;
  if (stav.pomale) return null;
  if (merit) stav.pojistka.snimek(dt);
  if (stav.pojistka.vypnuto) {
    stav.pomale = true;
    zapisPomalaSvetla(Date.now());
    zmenDuvod('fps');
    return null;
  }
  return stav.pojistka.svitit ? k : null;
}
