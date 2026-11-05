<!-- Vygenerováno nástrojem nastroje/balanc.py, ručně neupravovat (přepíše se). -->
# Balanc RuGee

Stejný bot jako v testu (`tests/simulace.mjs`) hraje bez trvalých vylepšení za každou postavu na každé mapě,
6 her na kombinaci (semínka 1–6), nejdéle 15:00 min. Bot není člověk:
utíká, sbírá krystaly a bere nejdřív zbraně. Čísla proto ukazují poměry mezi postavami a mapami, ne přesně,
jak dlouho vydrží hráč. Níž jsou jen fakta z dat, „lehké“ a „těžké“ se počítá podle pravidel v závorkách.

144 her · otisk kódu `dcd72a9a` · znovu: `python3 nastroje/balanc.py --seminek 6 --sekund 900` (podrobnosti v
[PODROBNOSTI.md](PODROBNOSTI.md#balanc))

## Přežití

![Přežití podle postavy a mapy](balanc/preziti.svg)

- **Moc lehké pro bota** (všechny hry došly do limitu 15:00): Světlonoš – Zamrzlé jezero.
- **Moc těžké pro bota** (medián přežití pod 5 min, tedy dřív, než přijdou elity): Lovec – Zamrzlé jezero 4:05, Lovec – Sopka 3:03, Lovec – Bažina 4:29, Lovec – Hřbitov za noci 4:37, Havíř – Bažina 4:40, Světlonoš – Sopka 3:00, Světlonoš – Hřbitov za noci 3:57, Bouřlivák – Sopka 3:33, Bouřlivák – Hřbitov za noci 4:08.
- Nejkratší medián má Světlonoš – Sopka (3:00, do konce 0/6), nejdelší Světlonoš – Zamrzlé jezero (15:00+, do konce 6/6).
- Mapy od nejtěžší (medián všech postav): Sopka 3:26, Hřbitov za noci 4:22, Bažina 5:29, Zamrzlé jezero 5:52, Jeskyně hlubin 10:45, Louka 15:00+.
- Postavy od nejslabší (medián všech map): Lovec 4:22, Bouřlivák 4:23, Havíř 6:54, Světlonoš 14:40.
- Největší rozdíl mezi postavami je na mapě Zamrzlé jezero: Světlonoš 15:00+ proti Lovec 4:05 (o 10:55 min).
- Konec hry (všech 144): smrt v 0:00–3:00 16, 3:00–5:00 57, 5:00–10:00 14, 10:00–15:00 8, došlo do limitu 49.

Medián přežití (v závorce kolik her došlo do limitu), `+` = medián je celý limit:

| Postava | Louka | Jeskyně hlubin | Zamrzlé jezero | Sopka | Bažina | Hřbitov za noci | Všechny mapy |
|---|--:|--:|--:|--:|--:|--:|--:|
| **Lovec** | 15:00+ (5/6) | 5:52 (1/6) | 4:05 (0/6) | 3:03 (0/6) | 4:29 (0/6) | 4:37 (1/6) | 4:22 (7/36) |
| **Havíř** | 13:20 (3/6) | 15:00+ (4/6) | 5:42 (2/6) | 6:54 (2/6) | 4:40 (1/6) | 6:51 (1/6) | 6:54 (13/36) |
| **Světlonoš** | 15:00+ (5/6) | 10:45 (2/6) | 15:00+ (6/6) | 3:00 (0/6) | 15:00+ (4/6) | 3:57 (1/6) | 14:40 (18/36) |
| **Bouřlivák** | 7:59 (2/6) | 11:00 (3/6) | 5:31 (2/6) | 3:33 (0/6) | 15:00+ (4/6) | 4:08 (0/6) | 4:23 (11/36) |
| Všechny postavy | 15:00+ (15/24) | 10:45 (10/24) | 5:52 (10/24) | 3:26 (2/24) | 5:29 (9/24) | 4:22 (3/24) | 4:57 (49/144) |

## Hrozba

![Růst Hrozby](balanc/hrozba.svg)

- V 5. minutě mají noví nepřátelé ×1,5 životů, ×1,25 poškození a ×1,05 rychlosti, bossové ×2,0 životů; vlna každých 0,25 s po 6.
- V 10. minutě mají noví nepřátelé ×3,1 životů, ×1,82 poškození a ×1,28 rychlosti, bossové ×4,7 životů; vlna každých 0,25 s po 11.
- V 15. minutě mají noví nepřátelé ×11,9 životů, ×3,41 poškození a ×1,97 rychlosti, bossové ×26,2 životů; vlna každých 0,25 s po 16.
- Po 5. minutě ještě běží: Lovec 36 %, Havíř 58 %, Světlonoš 61 %, Bouřlivák 42 %.
- Po 10. minutě ještě běží: Lovec 22 %, Havíř 42 %, Světlonoš 58 %, Bouřlivák 36 %.
- Po 15. minutě ještě běží: Lovec 19 %, Havíř 36 %, Světlonoš 50 %, Bouřlivák 31 %.

## Zabití za minutu

![Zabití za minutu](balanc/zabiti.svg)

- Louka: v 1. minutě 46–49 zabití, nejvíc 3 368 za minutu (Bouřlivák, 15. minuta).
- Jeskyně hlubin: v 1. minutě 40–48 zabití, nejvíc 3 389 za minutu (Lovec, 15. minuta).
- Zamrzlé jezero: v 1. minutě 41–48 zabití, nejvíc 3 259 za minutu (Světlonoš, 15. minuta).
- Sopka: v 1. minutě 40–49 zabití, nejvíc 2 987 za minutu (Havíř, 15. minuta).
- Bažina: v 1. minutě 39–44 zabití, nejvíc 3 159 za minutu (Havíř, 15. minuta).
- Hřbitov za noci: v 1. minutě 33–38 zabití, nejvíc 2 810 za minutu (Světlonoš, 14. minuta).

## Elity a bossové

![Kdy přicházejí elity a bossové](balanc/elity-bossove.svg)

- Hry, které přežily 5. minutu: 71, z toho s elitou 70. První elita přišla v mediánu v 5:06. Zabitých elit: 24643/26485 (93 %).
- Padl pokaždé, když přišel: Matka pavouků (Louka, 6:00, 18/18), Matka pavouků (Zamrzlé jezero, 9:00, 10/10), Kamenný obr (Zamrzlé jezero, 12:00, 10/10), Strážce hlubin (Sopka, 6:00, 3/3), Matka pavouků (Sopka, 9:00, 3/3), Bludička (Sopka, 12:00, 2/2), Matka pavouků (Bažina, 9:00, 9/9), Kamenný obr (Bažina, 12:00, 9/9), Bludička (Hřbitov za noci, 12:00, 3/3).
- První boss mapy padl: Louka 19/24, Jeskyně hlubin 14/22, Zamrzlé jezero 13/22, Sopka 3/15, Bažina 15/22, Hřbitov za noci 7/23.

| Boss | Mapa | Přichází | Padl / přišel | Souboj (medián) |
|---|--:|--:|--:|--:|
| Strážce hlubin | Louka | 3:00 | 19/24 (79 %) | 50 s |
| Strážce hlubin | Jeskyně hlubin | 6:00 | 13/15 (87 %) | 20 s |
| Strážce hlubin | Zamrzlé jezero | 6:00 | 10/12 (83 %) | 24 s |
| Strážce hlubin | Sopka | 6:00 | 3/3 (100 %) | 19 s |
| Strážce hlubin | Bažina | 6:00 | 10/11 (91 %) | 19 s |
| Matka pavouků | Louka | 6:00 | 18/18 (100 %) | 22 s |
| Matka pavouků | Jeskyně hlubin | 3:00 | 14/22 (64 %) | 62 s |
| Matka pavouků | Zamrzlé jezero | 9:00 | 10/10 (100 %) | 15 s |
| Matka pavouků | Sopka | 9:00 | 3/3 (100 %) | 14 s |
| Matka pavouků | Bažina | 9:00 | 9/9 (100 %) | 17 s |
| Matka pavouků | Hřbitov za noci | 6:00 | 5/8 (62 %) | 62 s |
| Kamenný obr | Louka | 9:00 | 15/18 (83 %) | 29 s |
| Kamenný obr | Jeskyně hlubin | 9:00 | 10/13 (77 %) | 31 s |
| Kamenný obr | Zamrzlé jezero | 12:00 | 10/10 (100 %) | 33 s |
| Kamenný obr | Bažina | 12:00 | 9/9 (100 %) | 26 s |
| Kamenný obr | Hřbitov za noci | 9:00 | 3/6 (50 %) | 34 s |
| Bludička | Louka | 12:00 | 15/16 (94 %) | 15 s |
| Bludička | Jeskyně hlubin | 12:00 | 10/11 (91 %) | 15 s |
| Bludička | Zamrzlé jezero | 3:00 | 13/22 (59 %) | 72 s |
| Bludička | Sopka | 12:00 | 2/2 (100 %) | 16 s |
| Bludička | Hřbitov za noci | 12:00 | 3/3 (100 %) | 28 s |
| Lávový obr | Sopka | 3:00 | 3/15 (20 %) | 80 s |
| Bahenní bludička | Bažina | 3:00 | 15/22 (68 %) | 57 s |
| Kostěný král | Hřbitov za noci | 3:00 | 7/23 (30 %) | 181 s |

## Všechny kombinace

| Postava | Mapa | Nejkratší | Nejdelší | Úroveň | Zabito | Bossů | 1. elita |
|---|--:|--:|--:|--:|--:|--:|--:|
| Lovec | Louka | 4:10 | 15:00 | 122 | 23 986 | 4 | 5:08 |
| Lovec | Jeskyně hlubin | 3:33 | 15:00 | 16 | 1 328 | 0 | 5:38 |
| Lovec | Zamrzlé jezero | 2:57 | 4:38 | 12 | 740 | 0 | – |
| Lovec | Sopka | 2:41 | 4:16 | 8 | 388 | 0 | – |
| Lovec | Bažina | 3:25 | 7:54 | 22 | 1 415 | 0 | 5:13 |
| Lovec | Hřbitov za noci | 3:33 | 15:00 | 8 | 432 | 0 | 5:32 |
| Havíř | Louka | 4:53 | 15:00 | 79 | 15 058 | 3 | 5:13 |
| Havíř | Jeskyně hlubin | 4:24 | 15:00 | 120 | 25 091 | 4 | 5:05 |
| Havíř | Zamrzlé jezero | 3:11 | 15:00 | 24 | 2 244 | 1 | 5:09 |
| Havíř | Sopka | 2:46 | 15:00 | 46 | 5 820 | 2 | 5:04 |
| Havíř | Bažina | 3:25 | 15:00 | 24 | 1 264 | 0 | 5:12 |
| Havíř | Hřbitov za noci | 3:20 | 15:00 | 12 | 766 | 0 | 5:59 |
| Světlonoš | Louka | 14:19 | 15:00 | 124 | 24 779 | 4 | 5:07 |
| Světlonoš | Jeskyně hlubin | 3:30 | 15:00 | 41 | 5 672 | 2 | 5:08 |
| Světlonoš | Zamrzlé jezero | 15:00 | 15:00 | 112 | 25 538 | 4 | 5:05 |
| Světlonoš | Sopka | 2:43 | 4:47 | 15 | 495 | 0 | – |
| Světlonoš | Bažina | 3:45 | 15:00 | 121 | 22 696 | 4 | 5:05 |
| Světlonoš | Hřbitov za noci | 2:46 | 15:00 | 12 | 584 | 0 | 5:34 |
| Bouřlivák | Louka | 3:37 | 15:00 | 21 | 2 542 | 1 | 5:14 |
| Bouřlivák | Jeskyně hlubin | 2:36 | 15:00 | 72 | 12 769 | 2 | 5:07 |
| Bouřlivák | Zamrzlé jezero | 2:52 | 15:00 | 16 | 1 632 | 0 | 5:22 |
| Bouřlivák | Sopka | 2:36 | 4:54 | 12 | 711 | 0 | – |
| Bouřlivák | Bažina | 1:47 | 15:00 | 114 | 21 162 | 4 | 5:05 |
| Bouřlivák | Hřbitov za noci | 3:20 | 10:42 | 8 | 435 | 0 | 6:34 |

Úroveň, zabití a bossové jsou mediány na konci hry, 1. elita je medián her, kde nějaká přišla.
Data všech grafů jsou v [balanc/souhrn.json](balanc/souhrn.json).
