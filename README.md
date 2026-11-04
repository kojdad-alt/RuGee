# Hlubiny

## ▶ [Hrát v prohlížeči](https://kojdad-alt.github.io/hlubiny/)

Survivors hra v prohlížeči: ty se jen pohybuješ, zbraně střílí samy a na louku se valí hordy. Z krystalů roste úroveň a na každé si vybereš vylepšení. Každé 3 minuty přijde boss, pokaždé jiný: Strážce hlubin dupne a od něj vyběhne vlna (dokud se napřahuje, je na zemi vidět kruh, odkud utéct), Matka pavouků klade pavoučky, Kamenný obr hází kameny tam, kam běžíš (místo dopadu je vidět), a Bludička se přenáší kolem tebe a střílí vějíř střel. Pak to jde zase od Strážce. Každý živý boss má nahoře svůj pruh životů. Od 1,5 minuty bloudí průsvitní duchové, kteří letí rovně skrz tebe a občas na chvíli zmizí (schovaného ducha zbraně netrefí, ale ani on tebe). Od 2. minuty lezou pomalí houbáci, po kterých zůstane na 3 s fialový jedový oblak, ze kterého je lepší hned vylézt. Od 3. minuty chodí smečky 4–6 rychlých vlků a od 4. minuty pavouci, jejichž síť tě na chvíli zpomalí.

Stačí kliknout na odkaz výš, nic se neinstaluje. Jde to i na mobilu (tah prstem).

Zbraně: Jiskra, Lucerna, Krumpáče, Blesk, Trnová past a Zrcadlový štít. Trnová past nechá pod nejbližšími nepřáteli vyrašit trsy trnů, které zraňují a zpomalí každého, kdo v nich stojí (bosse jen napůl). Zrcadlový štít krouží těsně kolem tebe: kdo se ho dotkne, dostane ránu a odletí, a střelu bosse pošle zpátky na toho, kdo ji vystřelil.

Karty vylepšení mají raritu: Běžná (+1 úroveň), Vzácná (+2 úrovně), Epická (+2 úrovně a +5 % poškození) a Legendární (+3 úrovně, +10 % poškození a doléčení všech životů). Vzácnějších karet přibývá s časem a se Štěstím, truhla po bossovi dá vždy aspoň Vzácnou. Okno výběru ukazuje, jaká je zrovna šance na kterou raritu. Karty se vybírají klávesami 1–3, šipkami a Enterem, klikem nebo klepnutím.

Úrovně zbraní a pasiv nemají strop. Prvních 5 úrovní má každá zbraň vlastní (víc střel, rychlejší nabíjení…), každá další přidá +8 % poškození a každá třetí (8., 11., 14., …) ještě kus navíc, kratší nabíjení nebo větší dosah podle zbraně. Strop je jen tam, kde by se hra rozbila: nejvýš 12 kusů naráz (trsů trnů a zrcadel 8), nabíjení nejvýš na čtvrtinu a dosah nejvýš 2,5× toho, co má zbraň na 5. úrovni. Pak roste už jen poškození. Pasivy od 6. úrovně přidávají menší díl (Srdce +10 životů, Boty +3 %, Magnet +10 %, Síla +5 %), Boty nejvýš 2× a Magnet nejvýš 8×, nad stropem dají +3 % poškození všech zbraní. V přehledu výbavy vlevo dole je úroveň číslo v rohu ikony a rámeček zezlátne od 5. úrovně, od 10. je tyrkysový a od 15. rubínový.

Hra začíná v hlavním menu (Hrát, Postavy, Vylepšení, Rekordy, Ovládání), vybírá se šipkami a Enterem, klikem nebo dotykem. Rekordy ukazují nejdelší přežití v tomhle prohlížeči.

V Postavách si vybereš třídu a hra si ji zapamatuje: Lovec (Jiskra, rychlejší pohyb), Havíř (Krumpáče, víc životů), Světlonoš (Lucerna, větší dosah sběru) a Bouřlivák (Blesk, rychlejší nabíjení zbraní).

Po každé hře dostaneš duše: 1 za každých 20 s přežití, 1 za každých 20 zabitých a 10 za každého bosse. Ve Vylepšeních si za ně kupuješ trvalá vylepšení, která platí od začátku každé další hry: Síla, Životy, Rychlost, Magnet, Štěstí (častěji padá srdce, magnet a vzácnější karty), Zkušenosti a Oživení (jednou za hru tě vrátí s půlkou životů). Každá další úroveň stojí víc. Vrátit duše zruší všechna vylepšení a duše ti vrátí, ať je můžeš rozdělit jinak. Duše i vylepšení se pamatují jen v tomhle prohlížeči.

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

Jednoduchý hráč utíká od nepřátel, sbírá krystaly a na úrovni bere nejdřív zbraně do 5. úrovně, pak pasivy do 5. úrovně a pak zase zbraně. Test spadne, když se objeví NaN, nikdo nezemře, nepřátel přibývá bez konce, po zabití nevyletí úlomky, po zásahu hrdiny se neotřese obrazovka, pavouk přijde před 4. minutou, hrdina v síti nezpomalí, se špatně ukládá rekord nebo zvolená třída (kratší hra rekord přepíše, rozbitý záznam nebo zakázané úložiště spadne) nebo když některá třída nezačne se svou zbraní a výhodou. Hlavní hra je za výchozí třídu (Lovec) bez trvalých vylepšení, každá třída pak ještě 3 minuty hraje sama. Hlídá i duše: hra s prázdnými nebo rozbitými vylepšeními musí dopadnout úplně stejně jako bez nich, každé vylepšení změní svou vlastnost, Oživení vrátí hrdinu jen jednou, obchod nepustí nákup bez duší ani nad maximum, Vrátit duše vrátí přesně utracené a rozbitý záznam duší hru neshodí. U nových nepřátel hlídá, že duch, houbák ani vlk nepřijdou dřív, schovaného ducha nic nezasáhne a on nezraní, duch proletí skrz, oblak se nejdřív nafoukne, pak pálí a za 3 s zmizí, vlci chodí jen ve smečkách po 4–6 a jsou nejrychlejší. Bot se jedovým oblakům vyhýbá. U rarit hlídá, že losování sedí se šancemi, s časem a Štěstím přibývá vzácnějších karet, truhla nedá běžnou, karta přidá vždy celý počet úrovní své rarity a dá přesně slíbené úrovně, poškození a doléčení. U úrovní bez stropu hlídá každou zbraň až do 200. úrovně (každá úroveň víc poškození, každá třetí ještě něco, dokud to jde, nic přes strop, karta píše, co úroveň opravdu přidala), pasivy do 60. úrovně, že nabídka nikdy nedojde a že se všemi zbraněmi na 60. úrovni hra 30 s běží bez chyby. U bossů hlídá, že chodí po 3 minutách ve správném pořadí a každý se svým nápisem a spritem aspoň 16×16, že každý živý boss má svůj pruh, že každý útok funguje (dupnutí trefí jen uvnitř kruhu a až po napřahování, pavoučků nepřibude přes limit, kámen mine toho, kdo po hodu zahne, Bludička se přenese a vystřelí dva vějíře) a že každého jde porazit. U Trnové pasti hlídá, že trs vyraší pod nepřítelem (víc trsů každý jinde, za dosahem nic), než doroste, neškodí, pak zraňuje a zpomalí a zpomalení po vylezení dozní. U Zrcadlového štítu, že odhodí, koho se dotkne (bosse ne, schovaného ducha vůbec), a že vrácená střela zraní nepřítele, ne hrdinu, a proti Bludičce hrdinu trefí méně střel. Výsledek ukazuje i souboje s každým bossem uprostřed vln, s uhýbáním a bez něj.

## Nová verze

Po každé změně kódu spusť `node nastroje/verze.mjs`. Do `index.html` zapíše otisky souborů (`?v=…`), aby hráči po nasazení nedostali z cache starý modul.
