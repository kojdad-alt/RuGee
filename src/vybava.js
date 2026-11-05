// Přehled výbavy vlevo dole: nahoře políčka se zbraněmi, pod nimi pasivy, v pořadí, jak je hrdina dostal.
// Úroveň je číslo v rohu ikony (strop nemá), rámeček mění barvu od 5., 10. a 15. úrovně (stupen ze
// seznamVybavy). Prázdná políčka ukazují, co ještě jde získat. Vedle jsou 2×2 sloty výbavy bossů (Hlava, Tělo,
// Amulet, Prsten) s rámečkem v barvě rarity kusu, prázdný slot ukazuje stín kusu, který do něj patří.
// Jen DOM: co hrdina má, říká seznamVybavy a seznamVystroje v hra.js. Překreslí se jen při změně, takže se dá
// volat každý snímek. Políčko, které právě přibylo nebo stouplo, krátce blikne (vzhled je v style.css).
import { seznamVybavy, seznamVystroje, ZBRANE, PASIVY } from './hra.js';
import { idKusu, PORADI_SAD } from './vystroj.js';
import { obrazekSpritu } from './menu.js';

// Pro každý kontejner: pro kterou hru a jaké úrovně se kreslilo naposledy.
const minule = new WeakMap();

function prvek(znacka, trida = '', text = null) {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  if (text !== null) e.textContent = text;
  return e;
}

const klic = (p) => `${p.druh}:${p.id}`;

function policko(p, novy) {
  const e = prvek('div', `vybava-policko stupen-${p.stupen}${novy ? ' nove' : ''}`);
  const obr = obrazekSpritu(p.ikona);
  // Velikost dává style.css (na mobilu menší), ne pevné pixely z obrazekSpritu.
  obr.removeAttribute('style');
  // Trojmístné číslo by se do rohu nevešlo, od 100 je tam 99+.
  e.append(obr, prvek('b', 'vybava-cislo', p.uroven > 99 ? '99+' : String(p.uroven)));
  return e;
}

// Slot výbavy bosse: sprite kusu v rámečku jeho rarity, prázdný slot jen stín.
function slotVystroje(p, novy) {
  const e = prvek('div', `vybava-policko vystroj-policko ${p.kus ? `rarita-${p.kus.rarita}` : 'prazdne'}${novy ? ' nove' : ''}`);
  const obr = obrazekSpritu(p.kus ? p.kus.id : idKusu(PORADI_SAD[0], p.slot));
  obr.removeAttribute('style');
  if (!p.kus) obr.classList.add('stin');
  e.append(obr);
  return e;
}

const otiskKusu = (p) => (p.kus ? `${p.kus.id}:${p.kus.rarita}` : '');

function radek(polozky, mist, predtim) {
  const r = prvek('div', 'vybava-radek');
  for (const p of polozky) r.append(policko(p, predtim && (predtim.get(klic(p)) ?? 0) < p.uroven));
  for (let i = polozky.length; i < mist; i++) r.append(prvek('div', 'vybava-policko prazdne'));
  return r;
}

// kontejnerVystroje: kam dát sloty výbavy bossů (ve hře vpravo od pruhu životů dole); bez něj jdou vedle zbraní.
export function ukazVybavu(kontejner, hra, kontejnerVystroje = null) {
  const { zbrane, pasivy } = seznamVybavy(hra);
  const sloty = seznamVystroje(hra);
  const vse = [...zbrane, ...pasivy];
  const podpis = [...vse.map((p) => `${klic(p)}:${p.uroven}`), ...sloty.map(otiskKusu)].join(',');
  const stare = minule.get(kontejner);
  if (stare?.hra === hra && stare.podpis === podpis) return false;
  // Na začátku nové hry nic nebliká, jen při vylepšení během ní.
  const predtim = stare?.hra === hra ? stare.urovne : null;
  const levy = prvek('div', 'vybava-zbrane');
  levy.append(radek(zbrane, Object.keys(ZBRANE).length, predtim), radek(pasivy, Object.keys(PASIVY).length, predtim));
  const vystroj = prvek('div', 'vybava-vystroj');
  vystroj.append(...sloty.map((p) => slotVystroje(p, predtim && p.kus && predtim.get(`vystroj:${p.slot}`) !== otiskKusu(p))));
  if (kontejnerVystroje) {
    kontejner.replaceChildren(levy);
    kontejnerVystroje.replaceChildren(vystroj);
  } else {
    kontejner.replaceChildren(levy, vystroj);
  }
  const urovne = new Map(vse.map((p) => [klic(p), p.uroven]));
  for (const p of sloty) urovne.set(`vystroj:${p.slot}`, otiskKusu(p));
  minule.set(kontejner, { hra, podpis, urovne });
  return true;
}
