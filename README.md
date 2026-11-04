# Hlubiny

Tahová roguelike hra v prohlížeči. Sestupuješ do Hlubin, každé patro je vygenerované znovu.

Hraje se na GitHub Pages, nic se neinstaluje. Čistý HTML, CSS a JavaScript bez build kroku.

## Spuštění u sebe

```bash
python3 -m http.server 8000
```

Pak otevři http://localhost:8000.

## Test

Simulace hry bez prohlížeče (Node 18+):

```bash
node tests/simulace.mjs 1 600
```

Jednoduchý hráč utíká od nepřátel, sbírá krystaly a na úrovni bere nejdřív zbraně. Test spadne, když se objeví NaN, nikdo nezemře nebo nepřátel přibývá bez konce.
