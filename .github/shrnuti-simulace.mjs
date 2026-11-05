// Shrnutí simulace pro GitHub Actions: chyby jako poznámky u PR, tabulka map do souhrnu běhu a celý výstup
// do sbaleného bloku v logu. Nikdy neshodí běh, i když soubory chybí (to už ohlásil předchozí krok).
// node .github/shrnuti-simulace.mjs simulace.json chyby.txt
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const [souborVysledku = 'simulace.json', souborChyb = 'chyby.txt'] = process.argv.slice(2);
const precti = (soubor) => (existsSync(soubor) ? readFileSync(soubor, 'utf8') : '');
const poznamka = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const bunka = (hodnota) => (hodnota === undefined || hodnota === null ? '–' : String(hodnota).replace(/\|/g, '\\|'));

const chyby = precti(souborChyb)
  .split('\n')
  .filter((radek) => radek.startsWith('CHYBA:'))
  .flatMap((radek) => radek.slice('CHYBA:'.length).split('; '))
  .map((chyba) => chyba.trim())
  .filter(Boolean);
for (const chyba of chyby) console.log(`::error title=Simulace::${poznamka(chyba)}`);

let vysledek = null;
const text = precti(souborVysledku);
try {
  vysledek = text ? JSON.parse(text) : null;
} catch {
  console.log('::warning title=Simulace::Výstup simulace není platný JSON.');
}
if (text) console.log(`::group::Výstup simulace\n${text.trimEnd()}\n::endgroup::`);

const radky = ['## Simulace RuGee', ''];
if (chyby.length) radky.push(`**Chyby (${chyby.length}):**`, '', ...chyby.map((chyba) => `- ${chyba}`), '');
else if (vysledek) radky.push('Bez chyb.', '');
if (vysledek?.mapy) {
  radky.push(`Semínko ${bunka(vysledek.seminko)}`, '', '| Mapa | Přežití (s) | Úroveň | Zabito | Bossů |', '|---|---:|---:|---:|---:|');
  for (const [mapa, data] of Object.entries(vysledek.mapy)) {
    if (data?.preziti_s === undefined) continue;
    radky.push(`| ${bunka(mapa)} | ${bunka(data.preziti_s)} | ${bunka(data.uroven)} | ${bunka(data.zabito)} | ${bunka(data.zabito_bossu)} |`);
  }
  radky.push('');
}
if (!chyby.length && !vysledek) radky.push('Simulace nedoběhla (viz log předchozích kroků).', '');

const souhrn = radky.join('\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${souhrn}\n`);
else console.log(souhrn);
