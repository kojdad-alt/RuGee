// Překlady: všechny texty hry jsou ve slovníku src/texty/<jazyk>.js, kód je bere přes t('klíč', {parametry}).
// Klíč je cesta ve slovníku ('menu.zpet', 'bossove.strazce.prichod'). V textu {jmeno} dosadí parametr a {n|a|b|c}
// vybere tvar slova podle čísla n (čeština: 1 | 2–4 | jinak, třeba „{n} {n|duše|duše|duší}“).
// Texty dat (zbraně, pasivy, bossové, mapy, výbava…) data sama nemají: pripojTexty jim podle větve slovníku přidá
// gettery, takže kód čte dál ZBRANE.jiskra.nazev a po přepnutí jazyka hned dostane nový text.
// Statické texty v index.html mají atribut data-t (první text v prvku), data-t-html (celý obsah se značkami
// <kbd>) nebo data-t-aria-label / data-t-title / data-t-content a přeloží je prelozStranku().
// Jen data a funkce bez DOM (kromě prelozStranku), test je načte i v Node.
import cs from './texty/cs.js';

export const SLOVNIKY = { cs };
export const JAZYKY = Object.keys(SLOVNIKY);
export const VYCHOZI_JAZYK = 'cs';

let jazyk = VYCHOZI_JAZYK;
const posluchaci = new Set();

export function aktualniJazyk() {
  return jazyk;
}

// Přepne jazyk (neznámý = výchozí). Vrací true, když se změnil, a dá vědět všem, kdo poslouchají (priZmeneJazyka).
export function nastavJazyk(novy) {
  const j = JAZYKY.includes(novy) ? novy : VYCHOZI_JAZYK;
  if (j === jazyk) return false;
  jazyk = j;
  for (const posluchac of [...posluchaci]) posluchac(j);
  return true;
}

// posluchac(jazyk) se zavolá po každé změně jazyka. Vrací funkci, která poslouchání zruší.
export function priZmeneJazyka(posluchac) {
  posluchaci.add(posluchac);
  return () => posluchaci.delete(posluchac);
}

// Hodnota ve slovníku podle cesty (text, seznam textů nebo celá větev), undefined když chybí.
export function hodnota(klic, j = jazyk) {
  let v = SLOVNIKY[j];
  for (const cast of klic.split('.')) {
    if (v === null || typeof v !== 'object' || !Object.hasOwn(v, cast)) return undefined;
    v = v[cast];
  }
  return v;
}

// Tvar slova podle čísla: tvary jsou za svislítky v {n|…}.
const TVARY = {
  cs: (n) => (n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2),
};

export function tvar(n, tvary, j = jazyk) {
  const i = (TVARY[j] ?? TVARY.cs)(Math.abs(Number(n)));
  return tvary[Math.min(i, tvary.length - 1)];
}

// Dosadí parametry do textu: {jmeno} = hodnota, {n|a|b|c} = tvar podle čísla n. Chybějící parametr zůstane, jak je.
export function dosad(text, parametry = {}, j = jazyk) {
  return text.replace(/\{(\w+)((?:\|[^{}|]*)+)?\}/g, (cele, jmeno, tvary) => {
    if (!Object.hasOwn(parametry, jmeno)) return cele;
    return tvary ? tvar(parametry[jmeno], tvary.slice(1).split('|'), j) : String(parametry[jmeno]);
  });
}

// Text v aktuálním jazyce. Co jazyk nemá, vezme se z výchozího, co nemá ani ten, vrátí se klíč (test hlídá,
// že se to nestane).
export function t(klic, parametry) {
  let v = hodnota(klic);
  if (v === undefined && jazyk !== VYCHOZI_JAZYK) v = hodnota(klic, VYCHOZI_JAZYK);
  if (v === undefined) return klic;
  return typeof v === 'string' && parametry ? dosad(v, parametry) : v;
}

// Desetinné číslo v textu podle jazyka: '1.5' → '1,5' (čárka nebo tečka je ve slovníku, format.desetinna).
export function desetinne(text) {
  return String(text).replace('.', t('format.desetinna'));
}

// 1,5 · 8 · 6,5: zaokrouhlí na desetiny a vynechá zbytečné nuly.
export function cislo(x) {
  return desetinne(String(Math.round(x * 10) / 10));
}

// Číslo se znakem procent: „5 %“ (v češtině s mezerou).
export function procenta(n) {
  return t('format.procenta', { n });
}

// Datum rekordu: 5. 11. 2026.
export function datum(d) {
  const { locale, volby } = t('format.datum');
  return d.toLocaleDateString(locale, volby);
}

// Jeden getter: objekt.pole vrací text klíče v aktuálním jazyce (s parametry).
export function textem(objekt, pole, klic, parametry) {
  Object.defineProperty(objekt, pole, { get: () => t(klic, parametry), enumerable: true, configurable: true });
  return objekt;
}

// Připojí k datům texty ze slovníku. Větev slovníku (klic) se projde podle výchozího jazyka: vnořený objekt
// odpovídá objektu v datech (chybějící se v hlubších úrovních založí, třeba dal.texty u zbraně), text nebo seznam
// textů dostane v datech getter. Na první úrovni (id zbraně, bosse…) musí položka v datech už být, slovník nesmí
// přidat novou. parametry = { 'cesta.ve.vetvi': { jmeno: hodnota } } pro texty s {jmeno}.
export function pripojTexty(data, klic, parametry = {}) {
  const vetev = hodnota(klic, VYCHOZI_JAZYK);
  if (!vetev || typeof vetev !== 'object') throw new Error(`slovník nemá větev ${klic}`);
  const projdi = (cil, slovnik, cesta, hloubka) => {
    for (const [k, v] of Object.entries(slovnik)) {
      const plna = `${cesta}.${k}`;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!cil[k] || typeof cil[k] !== 'object') {
          if (hloubka === 0) throw new Error(`slovník má ${plna}, data ne`);
          cil[k] = {};
        }
        projdi(cil[k], v, plna, hloubka + 1);
      } else {
        textem(cil, k, plna, parametry[plna.slice(klic.length + 1)]);
      }
    }
  };
  projdi(data, vetev, klic, 0);
  return data;
}

// Přeloží statické texty stránky (index.html) do aktuálního jazyka. data-t mění jen první text v prvku, ať zůstanou
// vnořené prvky (klávesa „ (Esc)“, číslo hrozby). Bez textu v prvku a bez vnořených prvků se text doplní.
export function prelozStranku(koren = document) {
  if (koren.documentElement) koren.documentElement.lang = jazyk;
  for (const e of koren.querySelectorAll('[data-t]')) {
    const text = t(e.dataset.t);
    const uzel = [...e.childNodes].find((u) => u.nodeType === 3 && u.data.trim());
    if (uzel) {
      const [, pred, , po] = /^(\s*)([\s\S]*?)(\s*)$/.exec(uzel.data);
      uzel.data = `${pred}${text}${po}`;
    } else if (!e.children.length) e.textContent = text;
  }
  for (const e of koren.querySelectorAll('[data-t-html]')) e.innerHTML = t(e.dataset.tHtml);
  for (const atribut of ['aria-label', 'title', 'content', 'placeholder']) {
    for (const e of koren.querySelectorAll(`[data-t-${atribut}]`)) e.setAttribute(atribut, t(e.getAttribute(`data-t-${atribut}`)));
  }
}
