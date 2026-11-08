// Tři lektvary do výpravy. Kupují se ve Vylepšení za duše (ne u kupce za zlaťáky) a pijí se ve hře
// klávesami ě š č nebo klepnutím na pás vpravo. Zásoba je na profilu, do náhody vln nepatří.
// leceni vrátí díl životů, sila na chvíli znásobí rány (v zasah, ne natrvalo na hrdinovi), stit zastaví
// jednu ránu od nepřítele přes hrdina.stitHotov. strop = kolik jich jde mít u sebe.

export const PORADI_LEKTVARU = ['leceni', 'sila', 'stit'];

export const LEKTVARY = {
  leceni: { klavesa: 'ě', cena: 20, strop: 12, lecba: 0.4, ikona: 'srdce' },
  sila: { klavesa: 'š', cena: 30, strop: 12, sila: 0.4, trvani: 12, ikona: 'sila' },
  stit: { klavesa: 'č', cena: 25, strop: 12, ikona: 'stit' },
};

export const KLAVESA_LEKTVARU = Object.fromEntries(PORADI_LEKTVARU.map((id) => [LEKTVARY[id].klavesa, id]));

// Zásoba jen se známými lektvary, celé číslo od 0 do stropu. Rozbité nebo chybějící = 0.
export function platneLektvary(z) {
  const o = z && typeof z === 'object' && !Array.isArray(z) ? z : {};
  const ven = {};
  for (const id of PORADI_LEKTVARU) {
    const n = Number(o[id]);
    ven[id] = Number.isFinite(n) ? Math.min(LEKTVARY[id].strop, Math.max(0, Math.floor(n))) : 0;
  }
  return ven;
}
