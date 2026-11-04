// Přidá ke skriptům a stylu v index.html otisk obsahu (?v=…), aby prohlížeč po nové verzi
// nevzal starý soubor z cache. Vnořené importy mezi moduly řeší import mapa.
// Spouštět po každé změně kódu: node nastroje/verze.mjs
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const otisk = (soubor) => createHash('sha1').update(readFileSync(soubor)).digest('hex').slice(0, 8);

const moduly = readdirSync('src').filter((f) => f.endsWith('.js')).sort();
const mapa = Object.fromEntries(moduly.map((f) => [`./src/${f}`, `./src/${f}?v=${otisk(`src/${f}`)}`]));
const blok = `<script type="importmap">\n${JSON.stringify({ imports: mapa }, null, 2)}\n</script>`;

let html = readFileSync('index.html', 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '');
html = html.replace('<script type="module"', `${blok}\n<script type="module"`);
html = html.replace(/src="src\/main\.js(\?v=[0-9a-f]+)?"/, `src="${mapa['./src/main.js'].slice(2)}"`);
html = html.replace(/href="style\.css(\?v=[0-9a-f]+)?"/, `href="style.css?v=${otisk('style.css')}"`);
writeFileSync('index.html', html);
console.log(`verze: ${moduly.length} modulů + style.css`);
