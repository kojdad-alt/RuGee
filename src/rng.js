// Generátor náhody se semínkem (mulberry32), aby šlo stejné patro vygenerovat znovu.
export function vytvorRng(seminko) {
  let stav = seminko >>> 0;
  const dalsi = () => {
    stav = (stav + 0x6d2b79f5) >>> 0;
    let t = stav;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    dalsi,
    cele: (min, max) => min + Math.floor(dalsi() * (max - min + 1)),
    vyber: (pole) => pole[Math.floor(dalsi() * pole.length)],
  };
}
