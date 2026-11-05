// Přidá ke skriptům a stylu v index.html otisk obsahu (?v=…), aby prohlížeč po nové verzi
// nevzal starý soubor z cache. Vnořené importy mezi moduly řeší import mapa.
// Do sw.js zapíše seznam souborů hry (stejné adresy s otisky) a VERZI = otisk všeho dohromady (stránka, styl,
// moduly, manifest, ikony). Každá změna tak změní i sw.js, prohlížeč pozná novou verzi a stáhne ji do nové keše.
// Spouštět po každé změně kódu: node nastroje/verze.mjs (test pak hlídá, že sw.js sedí)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

// Cesty jsou od kořene repa (skript i test ho volají odkudkoli).
const KOREN = new URL('../', import.meta.url);
const cti = (soubor) => readFileSync(new URL(soubor, KOREN));
const otisk = (soubor) => createHash('sha1').update(cti(soubor)).digest('hex').slice(0, 8);

export const ZACATEK_SW = '// verze: začátek (generuje node nastroje/verze.mjs, ručně neupravovat)';
export const KONEC_SW = '// verze: konec';

// Import mapa modulů: './src/x.js' → './src/x.js?v=otisk'.
export function mapaModulu() {
  const moduly = readdirSync(new URL('src/', KOREN)).filter((f) => f.endsWith('.js')).sort();
  return Object.fromEntries(moduly.map((f) => [`./src/${f}`, `./src/${f}?v=${otisk(`src/${f}`)}`]));
}

// index.html s aktuální import mapou a otisky u main.js a style.css.
export function strankaSOtisky(html = cti('index.html').toString()) {
  const mapa = mapaModulu();
  const blok = `<script type="importmap">\n${JSON.stringify({ imports: mapa }, null, 2)}\n</script>`;
  return html
    .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
    .replace('<script type="module"', `${blok}\n<script type="module"`)
    .replace(/src="src\/main\.js(\?v=[0-9a-f]+)?"/, `src="${mapa['./src/main.js'].slice(2)}"`)
    .replace(/href="style\.css(\?v=[0-9a-f]+)?"/, `href="style.css?v=${otisk('style.css')}"`);
}

// Co si service worker uloží pro hraní bez internetu (adresy přesně jak je stránka chce) a otisk verze.
export function verzeHry(html = strankaSOtisky()) {
  const mapa = mapaModulu();
  const ikony = readdirSync(new URL('ikony/', KOREN)).filter((f) => f.endsWith('.png')).sort();
  const soubory = [
    './', `./style.css?v=${otisk('style.css')}`, ...Object.values(mapa), './manifest.webmanifest',
    ...ikony.map((f) => `./ikony/${f}`),
  ];
  const h = createHash('sha1').update(html);
  for (const s of ['style.css', ...Object.keys(mapa), 'manifest.webmanifest', ...ikony.map((f) => `ikony/${f}`)]) {
    h.update(s).update(cti(s.replace(/^\.\//, '')));
  }
  return { verze: h.digest('hex').slice(0, 8), soubory };
}

// Blok mezi značkami v sw.js.
export function blokSw({ verze, soubory }) {
  return [ZACATEK_SW, `const VERZE = '${verze}';`, `const SOUBORY = ${JSON.stringify(soubory, null, 2).replace(/"/g, "'")};`, KONEC_SW].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const html = strankaSOtisky();
  writeFileSync(new URL('index.html', KOREN), html);
  const hra = verzeHry(html);
  const sw = cti('sw.js').toString();
  const od = sw.indexOf(ZACATEK_SW);
  const po = sw.indexOf(KONEC_SW);
  if (od < 0 || po < 0) throw new Error('sw.js nemá značky verze: začátek / verze: konec');
  writeFileSync(new URL('sw.js', KOREN), sw.slice(0, od) + blokSw(hra) + sw.slice(po + KONEC_SW.length));
  console.log(`verze: ${Object.keys(mapaModulu()).length} modulů + style.css, sw.js ${hra.verze} (${hra.soubory.length} souborů)`);
}
