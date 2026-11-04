// Přehled výbavy vlevo dole: nahoře políčka se zbraněmi, pod nimi pasivy, v pořadí, jak je hrdina dostal.
// Úroveň ukazují čtverečky pod spritem, na maximu políčko zezlátne. Prázdná políčka ukazují, kolik toho
// ještě jde získat. Jen DOM: co hrdina má, říká seznamVybavy v hra.js. Překreslí se jen při změně, takže se
// dá volat každý snímek. Políčko, které právě přibylo nebo stouplo, krátce blikne (vzhled je v style.css).
import { seznamVybavy, ZBRANE, PASIVY, MAX_UROVEN } from './hra.js';
import { obrazekSpritu } from './menu.js';

// Pro každý kontejner: pro kterou hru a jaké úrovně se kreslilo naposledy.
const minule = new WeakMap();

function prvek(znacka, trida = '') {
  const e = document.createElement(znacka);
  if (trida) e.className = trida;
  return e;
}

const klic = (p) => `${p.druh}:${p.id}`;

function policko(p, novy) {
  const e = prvek('div', `vybava-policko${p.max ? ' max' : ''}${novy ? ' nove' : ''}`);
  const obr = obrazekSpritu(p.ikona);
  // Velikost dává style.css (na mobilu menší), ne pevné pixely z obrazekSpritu.
  obr.removeAttribute('style');
  const urovne = prvek('span', 'vybava-urovne');
  for (let u = 0; u < MAX_UROVEN; u++) urovne.append(prvek('i', u < p.uroven ? 'plna' : ''));
  e.append(obr, urovne);
  return e;
}

function radek(polozky, mist, predtim) {
  const r = prvek('div', 'vybava-radek');
  for (const p of polozky) r.append(policko(p, predtim && (predtim.get(klic(p)) ?? 0) < p.uroven));
  for (let i = polozky.length; i < mist; i++) r.append(prvek('div', 'vybava-policko prazdne'));
  return r;
}

export function ukazVybavu(kontejner, hra) {
  const { zbrane, pasivy } = seznamVybavy(hra);
  const vse = [...zbrane, ...pasivy];
  const podpis = vse.map((p) => `${klic(p)}:${p.uroven}`).join(',');
  const stare = minule.get(kontejner);
  if (stare?.hra === hra && stare.podpis === podpis) return false;
  // Na začátku nové hry nic nebliká, jen při vylepšení během ní.
  const predtim = stare?.hra === hra ? stare.urovne : null;
  kontejner.replaceChildren(
    radek(zbrane, Object.keys(ZBRANE).length, predtim),
    radek(pasivy, Object.keys(PASIVY).length, predtim),
  );
  minule.set(kontejner, { hra, podpis, urovne: new Map(vse.map((p) => [klic(p), p.uroven])) });
  return true;
}
