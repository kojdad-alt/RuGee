# Pravidla pro úpravy

- `README.md` je krátká vizitka hry (do 40 řádků). Nové funkce do něj nepiš, nanejvýš jednu odrážku v „Co tě čeká“.
- Podrobný popis nových věcí (zbraně, bossové, mapy, testy) patří do `docs/PODROBNOSTI.md`.
- Texty pro hráče nepiš do kódu: patří do slovníku `src/texty/cs.js` (a do všech dalších jazyků ve `src/texty/`), kód je bere přes `t('klíč')` ze `src/texty.js`.
- Po každé změně kódu spusť `node nastroje/verze.mjs` a test `node tests/simulace.mjs 1 600`.
