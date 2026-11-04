# Hlubiny

## ▶ [Hrát v prohlížeči](https://kojdad-alt.github.io/hlubiny/)

Survivors hra v prohlížeči: ty se jen pohybuješ, zbraně střílí samy a na louku se valí hordy. Z krystalů roste úroveň a na každé si vybereš vylepšení. Každé 3 minuty přijde Strážce hlubin, od 4. minuty lezou rychlí pavouci, jejichž síť tě na chvíli zpomalí.

Stačí kliknout na odkaz výš, nic se neinstaluje. Jde to i na mobilu (tah prstem).

Hra začíná v hlavním menu (Hrát, Postavy, Vylepšení, Rekordy, Ovládání), vybírá se šipkami a Enterem, klikem nebo dotykem. Rekordy ukazují nejdelší přežití v tomhle prohlížeči.

V Postavách si vybereš třídu a hra si ji zapamatuje: Lovec (Jiskra, rychlejší pohyb), Havíř (Krumpáče, víc životů), Světlonoš (Lucerna, větší dosah sběru) a Bouřlivák (Blesk, rychlejší nabíjení zbraní).

Ovládání: WASD nebo šipky, na mobilu tah prstem. P pauza, po prohře R znovu a M menu.

## Pro vývoj

Čistý HTML, CSS a JavaScript bez build kroku. Spuštění u sebe:

```bash
python3 -m http.server 8000
```

Pak otevři http://localhost:8000.

## Test

Simulace hry bez prohlížeče (Node 18+):

```bash
node tests/simulace.mjs 1 600
```

Jednoduchý hráč utíká od nepřátel, sbírá krystaly a na úrovni bere nejdřív zbraně. Test spadne, když se objeví NaN, nikdo nezemře, nepřátel přibývá bez konce, po zabití nevyletí úlomky, po zásahu hrdiny se neotřese obrazovka, pavouk přijde před 4. minutou, hrdina v síti nezpomalí, se špatně ukládá rekord nebo zvolená třída (kratší hra rekord přepíše, rozbitý záznam nebo zakázané úložiště spadne) nebo když některá třída nezačne se svou zbraní a výhodou. Hlavní hra je za výchozí třídu (Lovec), každá třída pak ještě 3 minuty hraje sama.

## Nová verze

Po každé změně kódu spusť `node nastroje/verze.mjs`. Do `index.html` zapíše otisky souborů (`?v=…`), aby hráči po nasazení nedostali z cache starý modul.
