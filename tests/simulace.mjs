// Simulace hry bez prohlížeče: node tests/simulace.mjs [seminko] [sekund]
// Jednoduchý hráč utíká od nepřátel a sbírá krystaly, na úrovni bere nejdřív zbraně. Hlídá, že čísla zůstanou
// rozumná (žádné NaN, nepřátel nepřibývá donekonečna) a že se hra dá hrát a prohrát.
// Hlídá i ozdoby: úlomky po zabití a třes obrazovky po zásahu hrdiny.
// Pavouci: nesmí přijít před 4. minutou, jejich zásah zalepí hrdinu sítí a v síti chodí pomaleji.
// Rekord pro menu: výsledek se uloží jen když je delší, rozbitý záznam ani chybějící úložiště hru neshodí.
// Třídy: hlavní hra je za výchozí třídu, každá třída pak hraje krátce sama (svoje zbraň, svoje výhoda).
// Duše a trvalá vylepšení: hlavní hra je bez vylepšení (stejná jako před nimi), prázdná nebo rozbitá vylepšení
// hrají úplně stejně, každé vylepšení změní svou vlastnost, Oživení vrátí hrdinu jednou, obchod a úložiště sedí.
// Rarity karet: šance sedí s losováním, s časem a Štěstím přibývá vzácnějších, truhla nedá běžnou, karta přidá
// vždy celý počet úrovní své rarity a dá přesně to, co slibuje (úrovně, poškození, doléčení).
// Úrovně bez stropu: 1–5 jako dřív, každá další +8 % poškození a každá třetí ještě kus, nabíjení nebo velikost,
// nic nepřeleze strop (12 kusů, čtvrtina nabíjení, 2,5× velikost), pasivy nad pátou dají menší díl a na stropu
// poškození, nabídka nikdy nedojde a zbraně na vysoké úrovni hru nerozbijí (žádné NaN, limity drží).
// Noví nepřátelé: duch, houbák a vlk nepřijdou dřív, než mají. Schovaného ducha zbraně nezasáhnou a on nezraní,
// duch proletí skrz místo, kam mířil. Oblak po houbákovi se nejdřív nafoukne, pak pálí a za 3 s zmizí.
// Vlci chodí jen ve smečkách po 4–6 a jsou rychlejší než ostatní nepřátelé.
// Přehled výbavy v rohu: sedí s tím, co hrdina má (pořadí, úrovně, stupeň rámečku, ikony se sprity) a po každém
// výběru zbraně nebo pasivy se změní, po Odpočinku ne.
// Žár lucerny: zasažený nepřítel v dosahu se krátce rozzáří (místo bílého bliknutí), za dosahem ne, a zase zhasne.
// Bedničky a sudy: objevují se jen mimo obrazovku, nejvýš 12 naráz, daleko za hrdinou mizí. Každá zbraň je rozbije,
// kořist padá podle šancí, zlaťák je po hře duše navíc a bomba složí nepřátele na obrazovce, ale ne Strážce
// ani schovaného ducha.
// Bossové: chodí po 3 minutách v pořadí Strážce, Matka, Obr, Bludička a pak znovu, každý s vlastním nápisem a
// spritem 16×16. Každý živý boss má svůj pruh (bossBary).
// Schopnosti bossů: každý má 2–3 (data v SCHOPNOSTI a BOSSOVE) a střídá je dokola, každá začne varováním kolem
// 0,8 s, při kterém boss stojí a nikomu neublíží. Dupnutí trefí jen v kruhu, odhodí a otřese obrazovkou; Hod hodí
// 3–5 kamenů (stojícího trefí, kdo po hodu uhne, toho minou) a po dopadu vybuchnou; Výpad míří, zamkne směr a
// proběhne rovně (kdo uhne kolmo, toho mine); Vyvolání přivolá 6–8 pomocníků do limitu; Vějíř Bludičky se přenese
// a vystřelí. Pod polovinou životů boss zuří a střídá schopnosti rychleji. Souboj s každým bossem zvlášť ukáže, jak
// dlouho trvá a kolik životů stojí s uhýbáním a bez něj (na vyvážení). Boss musí jít porazit a zároveň umí ublížit.
// Bot se schopnostem bossů vyhýbá jako člověk, který je vidí (stín dopadu, kruh dupnutí, čára výpadu, střely).
// Trnová past a Zrcadlový štít: trs vyraší pod nepřítelem (víc trsů každý jinde, za dosahem nic), než doroste,
// neškodí, pak zraňuje a zpomalí (bosse napůl), zpomalení po vylezení dozní a trs zmizí. Zrcadlo odhodí, koho se
// dotkne (bosse ne, schovaného ducha ani nevidí), a střelu bosse pošle zpátky, kde zraní nepřítele a ne hrdinu.
// Každá zbraň má 5 řádků popisu a ikonu se spritem.
// Světlušky: roj má počet podle úrovně, světlušky létají na nepřátele (každá na jiného) a zpátky, za dosah ani na
// schovaného ducha nevyletí a běžícího hrdinu neztratí. Mrazivý krystal: dopadne do hloučku, při pádu nic nedělá,
// pak zpomalí (bosse napůl), mráz dozní, roztříštění složí hlouček a slabého nepřítele roztříští rovnou (bosse ne),
// víc krystalů padne každý jinam a zón nikdy není víc než MAX_ZON.
// Zvon hlubin: vlna vyběhne od hrdiny, zasáhne jen v dosahu (každého jednou), odhodí a omráčí (omráčený stojí
// a nekouše, boss jde napůl a kouše), po omráčení je nepřítel chvíli odolný, ozvěna přijde po první vlně
// a schovaného ducha vlna mine. Cep: vestoje koule krouží kolem hrdiny na délku řetězu, za chůze se táhne za
// ním a nikdy není dál než řetěz, rána roste s rychlostí, víc koulí má každá jiný řetěz. Semínka: padnou za
// hrdinu, do vteřiny nic nedělají, pak vybuchnou (rána jen v poloměru) a keř píchá, dokud nezvadne, víc
// semínek padne vedle sebe a semínek s keři nikdy není víc než MAX_SEMINEK.
// Kořeny: kořen běží pod zemí za nepřítelem v dosahu (za dosahem nic), pod ním vyrazí, zraní ho a drží (stojí,
// odhození s ním nehne, boss jde napůl), každý tik ho sevře a po puštění je chvíli odolný. Víc kořenů míří každý
// na jiného, když cíl cestou zmizí, kořen vezme jiného, a schovaného ducha nechytí. Ohnivá stopa: za běžícím
// hrdinou zůstávají plameny s rozestupem, vestoje hoří jeden pod nohama, kdo v ohni stojí, toho pálí jednou za tik
// (i v několika plamenech), od 4. úrovně ho zapálí a hoří ještě po vylezení, plameny dohoří a schovaného ducha
// nepálí. Odrazný kámen: kámen se odráží od nepřítele k nepříteli (každého zasáhne jednou, s každým odrazem víc
// bolí a letí rychleji), za skok dál nedoletí, bez dalšího cíle spadne, víc kamenů letí na různé nepřátele,
// schovaného ducha mine a od skály se odrazí.
// Hrozba: hra nekončí, každou minutu je hrozba o stupeň výš (s ohlášením) a noví nepřátelé mají životy, poškození
// a rychlost podle tabulky HROZBA. Elity nechodí před 5. minutou, od 10. přibývají, bossové nejsou nikdy elitou.
// Na vyvážení hraje plně vylepšený bot až do konce: musí padnout do 30 minut (nikdo nevydrží donekonečna).
// Čísla poškození: zásahy do stejného nepřítele se do SLUCOVANI_CISEL sečtou, jiný nepřítel má své číslo, silná rána
// zežloutne a obyčejná ne, naráz je nejvýš MAX_CISEL čísel (i se zbraněmi na 60. úrovni), každá rána hrdinovi
// má nad ním červené číslo, léčení zelené, a za TRVANI_CISLA číslo zmizí. Přepínač v nastavení se uloží.
// Výbava bossů: každý boss má sadu 4 kusů (Hlava, Tělo, Amulet, Prsten) se jménem, spritem 8×8 a staty, truhla
// má sprite podle bosse. Truhla se 1 s otevírá a svět mezitím stojí, pak dá kus od toho bosse (do volného slotu
// ho rovnou nasadí, u obsazeného čeká porovnání Vzít / Nechat a nechaný kus dá zlaťáky) a kartu aspoň vzácnou.
// Staty sedí s raritou, sundaný kus vrátí hrdinu přesně zpátky, bonusy sad platí od 2 a 4 kusů a každý efekt
// dělá, co slibuje (rázová vlna, síť, kamenná kůže, zmizení). Sbírka v úložišti drží nejlepší raritu každého kusu.
// Bot jde pro truhlu a z porovnání bere kus s lepšími staty.
// Zlaťáky: padají z elit (vždy hromádka), občas z nepřátel (stejný los jako srdce a magnet) a magnet je přitáhne.
// Kupec přijede v KUPEC.prvni a pak každé 3 minuty, nikdy s živým bossem ani těsně před ním, stojí za okrajem
// obrazovky KUPEC.trvani s a odjede. U vozu se otevře obchod (svět stojí), ceny rostou s hrozbou (klíč ne),
// zásoba dojde, každé zboží dělá, co slibuje. Přehodit karty stojí čím dál víc, zdarma od kupce se bere první.
// Zamčenou truhlu otevře klíč nebo 15 zlaťáků a dá karty aspoň vzácné, zbraně ji nerozbijí. Po hře je z každých
// 5 nevyužitých zlaťáků duše. Bot sbírá zlaťáky, chodí ke kupci, když má na něco peníze (lektvar jen zraněný,
// pak kus výbavy, vylepšení, klíč, když na louce čeká zamčená truhla), otevírá zamčené truhly a přehazuje karty,
// když v nabídce není nic pro něj a přehození je levné.
// Mapy: hlavní hra je na Louce (stejná jako před mapami), každá další mapa se dohraje celá stejným botem. Chodí jen
// druhy z mixu mapy (a bossové s pomocníky), každý až od svého času, smečky jen kde jsou. Na Zamrzlém jezeře hrdina
// na ledu klouže (rozjíždí se pomalu a po puštění jede dál) a na sněhu ne, led tvoří plochy a ne šachovnici,
// v Jeskyni má lucerna větší dosah. Rekordy jsou pro každou mapu zvlášť, další mapa se odemkne 5 minutami na
// předchozí (i starým rekordem Louky) a zvolená zamčená mapa se načte jako Louka.
// Mapy II: Sopka (láva pálí, ohniví brouci), Bažina (bahno zpomalí, jedové bubliny prasknou v oblak, žáby skáčou)
// a Hřbitov za noci (tma, mlha, kostlivci a duchové). Překážky na všech mapách kromě Louky: nikdy u startu, na
// zvláštní ploše ani vedle sebe, hrdina ani nepřátelé v nich nikdy neskončí, nepřítel za překážkou ji obejde
// a dojde k hrdinovi, duch proletí, střela přeletí. Každá mapa má hlavního bosse, který přijde první (na Louce
// pořád Strážce, pořadí beze změny) a jeho truhla dá kus sady bosse, ze kterého vychází. Bot se lávě
// a bublinám vyhýbá.
// Zvuk: bez AudioContext (Node) nic nedělá a nic nespadne. S náhradním AudioContextem, který jen počítá uzly,
// omezovač pustí stejný efekt nejvýš jednou za jeho mezeru a běžných efektů nejvýš MAX_EFEKTU_ZA_SEKUNDU za sekundu
// (důležité projdou vždy), ani zbraně na 60. úrovni nevytvoří moc uzlů za sekundu, hudba po pauze nedohání,
// ztlumení a 0 % nic nevytvoří, každá mapa má hudbu a hlasitosti se uloží do nastavení. Hra hlásí zvuky jen
// známými jmény a hlavní události (zásah, smrt, krystal, hrozba, boss, konec) se opravdu ozvou.
// Pasivy II: Upíří zub vrací život za zabití (s šancí, nejvýš SANI_ZA_SEKUNDU za sekundu, náhodu vln neposune),
// Trnová zbroj vrací útočníkovi podíl rány, Štít zastaví jednu ránu a dobíjí se, Moudrost dá víc zkušeností
// a Chamtivost víc duší. Všechny mají ikonu, popis a úrovně bez stropu (kde je strop, dají pak poškození).
import { readFileSync } from 'node:fs';
import { vytvorRng } from '../src/rng.js';
import * as zvuk from '../src/zvuk.js';
import {
  novaHra, aktualizuj, vyber, staty, TRVANI_TRESU, OD_PAVOUKU, TRVANI_SITE, ZPOMALENI_SITI, TRIDY, VYCHOZI_TRIDA,
  ZIVOTY_PO_OZIVENI, NEZRANITELNY_PO_OZIVENI, ODHOZENI_PRI_OZIVENI,
  ZBRANE, RARITY, PORADI_RARIT, ZAKLAD_UROVNI, SILA_ZA_PREBYTEK, LECENI_ODPOCINKU, CAS_PLNYCH_RARIT, sanceRarit, nabidka, karta,
  RUST_UROVNI, STROPY, STUPNE_UROVNI, bonusZaUroven, statyZbrane, stupenUrovne, hodnotaPasivy, popisUrovni,
  OD_DUCHU, VIDITELNY_DUCH, SKRYTY_DUCH, OD_HOUBAKU, TRVANI_OBLAKU, NAFUKOVANI_OBLAKU, JED_OBLAKU,
  OD_VLKU, SMECKA_OD, SMECKA_DO, RYCHLOST_NEPRATEL, MAX_DUCHU, pridejNepritele, PASIVY, seznamVybavy, TRVANI_ZARU,
  MAX_BEDEN, KORIST_BEDEN, losujKorist, xpZBedny, JISKRA_NA_BEDNU, TRVANI_VYBUCHU,
  PORADI_BOSSU, BOSSOVE, bossBary, MAX_PAVOUCKU, VYRAZENI_PAVOUCKU, RYCHLOST_VYRAZENI,
  SCHOPNOSTI, schopnostiBosse, ZURIVOST, ZRYCHLENI_ZURIVOSTI, PRVNI_SCHOPNOST, TRES_DUPNUTI, TRVANI_DOPADU,
  TRVANI_ODHOZENI_HRDINY,
  RUST_TRNU, VADNUTI_TRNU, DOZNIVANI_TRNU, MAX_TRNU, TRVANI_ODHOZENI, ZRYCHLENI_ODRAZU, poziceZrcadla,
  DOPAD_KRYSTALU, DOZNIVANI_MRAZU, PRAH_ROZTRISTENI, MAX_ZON,
  RYCHLOST_ZVUKU, OZVENA_ZVONU, IMUNITA_OMRACENI, ZPOMALENI_OMRACENEHO_BOSSE, nekouse,
  MIN_RYCHLOST_CEPU, RYCHLOST_RANY_CEPU, ranaCepu, delkaRetezu, ZRANI_SEMINKA, POMER_KERE, MAX_SEMINEK,
  RYCHLOST_KORENE, MAX_BEHU_KORENE, IMUNITA_KORENU, ZPOMALENI_DRZENEHO_BOSSE, TIK_KORENU, MAX_KORENU,
  ROZESTUP_STOPY, MAX_PLAMENU, RYCHLOST_KAMENE, ZRYCHLENI_KAMENE, MAX_RYCHLOST_KAMENE, RUST_RANY_KAMENE, POLOMER_KAMENE,
  VOLNY_LET, ZIVOT_KAMENE, MAX_KAMENU,
  HROZBA, ELITA, silaHrozby, textHrozby, POLOMER_OBLAKU,
  zasah, kratkeCislo, TRVANI_CISLA, SLUCOVANI_CISEL, MAX_CISEL, NAD_PRAHEM,
  TRVANI_OTEVRENI, PRVNI_VLNA_HRDINY, ZPOMALENI_SITE_BOSSE, nasadKus, sundejKus, ziskejKus, rozhodniKus, seznamVystroje,
  SANCE_ZLATAKU, MESEC, KUPEC, ZBOZI, PORADI_ZBOZI, RUST_CEN, LECENI_LEKTVARU, PREHOZENI, MAX_ZAMCENYCH, PRVNI_ZAMCENA, CENA_ZAMCENE,
  POLOMER_ZAMCENE, cenaZbozi, prekazkaNakupu, nabidkaKupce, kup, odejdiOdKupce, cenaPrehozeni, prehod,
  POLOMER_HRDINY, SKOK_ZABY, poradiBossu, zakladBosse,
  pasivyDoZbrane, NASOBEK_KRITU, CISLO_REGENERACE,
  DOBITI_STITU, MIN_DOBITI_STITU, ZIVOT_ZA_SANI, SANI_ZA_SEKUNDU, LET_KAPKY,
} from '../src/hra.js';
import {
  VYBAVA, PORADI_SLOTU, VSECHNY_KUSY, RARITY_VYBAVY, PORADI_RARIT_VYBAVY, EFEKTY_VYBAVY, STATY_VYBAVY, STROPY_VYBAVY,
  sanceRaritVybavy, rarituKusuZLosu, vytvorKus, zlatakyZaKus, hodnotaKusu, ucinekVystroje, popisEfektu, popisSady,
  radkyStatu, rozdilStatu, platnaSbirka,
} from '../src/vystroj.js';
import {
  VYLEPSENI, DUSE_ZA, dusZaHru, cenaVylepseni, kupVylepseni, vratDuse, utraceno,
} from '../src/duse.js';
import {
  nactiRekord, zapisVysledek, nactiTridu, ulozTridu, nactiDuse, ulozDuse, pripisDuse, nactiNastaveni, ulozNastaveni,
  nactiSbirku, zapisNalez, nactiMapu, ulozMapu, odemceneMapy, odemkniMapu,
} from '../src/ulozeni.js';
import {
  MAPY, PORADI_MAP, VYCHOZI_MAPA, ODEMKNUTI_MAPY, VELIKOST_DLAZDICE, PRICHODY_MAP, naLedu, ledovaDlazdice, odKdy, platnaMapa,
  plochaMapy, dlazdicePlochy, naPlose, prekazkaNaDlazdici, kruhPrekazky, hloubkaVPrekazce, VOLNO_U_STARTU,
} from '../src/mapy.js';

const seminko = Number(process.argv[2] ?? 1);
const delka = Number(process.argv[3] ?? 600);
const DT = 1 / 30;
const SIRKA = 1280;
const VYSKA = 720;

const hra = novaHra(vytvorRng(seminko));
let maxNepratel = 0;
let volby = 0;
let maxCastic = 0;
let zasahu = 0;
let tresu = 0;
let prvniPavouk = null;
let maxPavouku = 0;
let siti = 0;
let krokuVSiti = 0;
const nabidnuto = Object.fromEntries(PORADI_RARIT.map((id) => [id, 0]));
let truhel = 0;
const chybyRarit = [];
const chybyNepratel = [];
const videni = new WeakSet();
const prvni = { duch: null, houbak: null, vlk: null };
const smecky = [];
const videneOblaky = new WeakSet();
let oblaku = 0;
let zasahuOblakem = 0;
let duchuSchovanych = 0;
let maxDuchu = 0;
const chybyVybavy = [];
let zmenVybavy = 0;
const chybyBeden = [];
const videneBedny = new WeakSet();
let maxBeden = 0;
const prisliBossove = [];
const chybyBossu = [];
const chybyHrozby = [];
let ohlaseniHrozby = 0;
let prvniElita = null;
// Kolik nepřátel z vln (duch, vlci ze smečky a pavoučci od Matky elitou být nemůžou) a kolik z nich elit:
// před elitaOd, mezi elitaOd a castejiOd, po castejiOd.
const elityPodleCasu = { pred: [0, 0], stred: [0, 0], pozde: [0, 0] };
const muzeBytElitou = (n) => !n.boss && !['duch', 'vlk', 'pavoucek'].includes(n.druh);
let maxPavoucku = 0;
let maxTrsu = 0;
let maxZon = 0;
const videnaCisla = new Set();
let maxCisel = 0;
let cervenychCisel = 0;
const chybyCisel = [];
const chybyVystroje = [];
let snimkuOtevirani = 0;
let otevrenoTruhel = 0;
const rozhodnuti = [];
const chybyZlata = [];
const prijezdyKupce = [];
let otevrenoObchodu = 0;
let prehozeniHlavni = 0;
// Bedna je celá mimo obrazovku, když její sprite (30 px) nezasahuje do výřezu kolem hrdiny.
const mimoObrazovku = (b, h) => Math.abs(b.x - h.x) > SIRKA / 2 + 15 || Math.abs(b.y - h.y) > VYSKA / 2 + 15;

// Přehled výbavy proti skutečnému stavu hrdiny. Sprity se v node kreslit nedají, jejich jména jsou v sprity.js.
const jmenaSpritu = new Set([...readFileSync(new URL('../src/sprity.js', import.meta.url), 'utf8').matchAll(/^ {2}(\w+): \[/gm)].map((m) => m[1]));
const podpisVybavy = (h) => JSON.stringify(seznamVybavy(h));
function zkontrolujVybavu(h, kdy) {
  const { zbrane, pasivy } = seznamVybavy(h);
  if (zbrane.map((p) => p.id).join() !== Object.keys(h.zbrane).join()) chybyVybavy.push(`${kdy}: zbraně v přehledu ${zbrane.map((p) => p.id)}`);
  if (pasivy.map((p) => p.id).join() !== Object.keys(h.pasivy).join()) chybyVybavy.push(`${kdy}: pasivy v přehledu ${pasivy.map((p) => p.id)}`);
  for (const p of [...zbrane, ...pasivy]) {
    const vzor = (p.druh === 'zbran' ? ZBRANE : PASIVY)[p.id];
    const ma = p.druh === 'zbran' ? h.zbrane[p.id].uroven : h.pasivy[p.id];
    if (p.uroven !== ma || !(p.uroven >= 1) || !Number.isInteger(p.uroven)) chybyVybavy.push(`${kdy}: ${p.id} v přehledu na ${p.uroven}, hrdina má ${ma}`);
    if (p.stupen !== STUPNE_UROVNI.filter((od) => p.uroven >= od).length) chybyVybavy.push(`${kdy}: ${p.id} na ${p.uroven} má stupeň ${p.stupen}`);
    if (p.ikona !== vzor.ikona || !jmenaSpritu.has(p.ikona) || p.nazev !== vzor.nazev) chybyVybavy.push(`${kdy}: ${p.id} má ikonu ${p.ikona}`);
  }
}
for (const id of Object.keys(TRIDY)) {
  const h = novaHra(vytvorRng(seminko), id);
  zkontrolujVybavu(h, `start ${id}`);
  const { zbrane, pasivy } = seznamVybavy(h);
  if (zbrane.length !== 1 || zbrane[0].id !== TRIDY[id].zbran || zbrane[0].uroven !== 1 || pasivy.length) chybyVybavy.push(`${id} nezačíná jen se svou zbraní`);
}

// Každá nabídnutá karta: známá rarita, úrovně v mezích, popis a ikona.
function zkontrolujKarty(h) {
  for (const v of h.volby) {
    if (!Object.hasOwn(RARITY, v.rarita)) chybyRarit.push(`karta s neznámou raritou ${v.rarita}`);
    else nabidnuto[v.rarita] += 1;
    if (v.druh === 'leceni') chybyRarit.push('nabídka došla, nabídla Odpočinek');
    if (v.druh !== 'leceni' && (v.uroven - v.od !== v.kroku || v.kroku !== RARITY[v.rarita]?.urovni)) {
      chybyRarit.push(`karta ${v.id} ${v.rarita} má úrovně ${v.od} → ${v.uroven}`);
    }
    if (!v.popis?.length || !v.popis.every((r) => typeof r === 'string' && r) || typeof v.ikona !== 'string') chybyRarit.push(`karta ${v.id} bez popisu nebo ikony`);
  }
  if (h.zTruhly) {
    truhel += 1;
    if (h.volby.some((v) => v.rarita === 'bezna')) chybyRarit.push('truhla nabídla běžnou kartu');
  }
}

// Jednoduchý hráč: utíká od nepřátel v blízkosti a jinak jde pro nejbližší krystal.
// Bez zbraně na dálku (jen krumpáče nebo lucerna) pustí nepřátele blíž, jinak by je nikdy nezasáhl.
// Jedovým oblakům se vyhýbá víc než nepřátelům (oblak je vidět, člověk z něj taky uteče).
// uhyba = false: útoky bossů nevidí (jen na porovnání v soubojích, kolik uhýbání ušetří).
function rozhodni(hra, t, uhyba = true) {
  const { hrdina } = hra;
  const odstup = hra.zbrane.jiskra || hra.zbrane.blesk ? 160 : 50;
  let dx = 0;
  let dy = 0;
  for (const n of hra.nepratele) {
    const vx = hrdina.x - n.x;
    const vy = hrdina.y - n.y;
    const d = Math.hypot(vx, vy);
    if (d < odstup && d > 0) {
      dx += (vx / d) * (odstup - d);
      dy += (vy / d) * (odstup - d);
    }
  }
  const utec = (o, polomer, vaha) => {
    const vx = hrdina.x - o.x;
    const vy = hrdina.y - o.y;
    const d = Math.hypot(vx, vy);
    if (d < polomer && d > 0) {
      dx += (vx / d) * (polomer - d) * vaha;
      dy += (vy / d) * (polomer - d) * vaha;
    }
  };
  for (const o of hra.oblaky) utec(o, o.polomer + 20, 4);
  // Jedové bubliny a lávu je vidět, bot se jim vyhne jako oblakům (lávě slaběji, přes kus se dá přeběhnout).
  for (const b of hra.bubliny ?? []) utec(b, b.polomer + 24, 4);
  const plocha = plochaMapy(hra.mapa);
  if (plocha?.druh === 'lava') {
    const tx0 = Math.floor(hrdina.x / VELIKOST_DLAZDICE);
    const ty0 = Math.floor(hrdina.y / VELIKOST_DLAZDICE);
    for (let ty = ty0 - 2; ty <= ty0 + 2; ty++) {
      for (let tx = tx0 - 2; tx <= tx0 + 2; tx++) {
        if (dlazdicePlochy(tx, ty, plocha.data)) utec({ x: (tx + 0.5) * VELIKOST_DLAZDICE, y: (ty + 0.5) * VELIKOST_DLAZDICE }, VELIKOST_DLAZDICE * 1.3, 4);
      }
    }
  }
  // Truhla bosse kousek od něj: skočí pro ni, i když kolem někdo je (jako člověk). Vzdálenou sebere, až bude klid.
  const truhla = nejblizsiTruhla(hra, 220);
  if (truhla) {
    const d = Math.hypot(truhla.x - hrdina.x, truhla.y - hrdina.y) || 1;
    dx += ((truhla.x - hrdina.x) / d) * 400;
    dy += ((truhla.y - hrdina.y) / d) * 400;
  }
  // Ke kupci jde, když má na něco zlaťáky, k zamčené truhle, když ji umí otevřít (jako člověk, co vidí šipku).
  for (const [cil, sila] of [[chceKupce(hra) ? hra.kupec : null, 300], [zamcenaProBota(hra, 500), 250]]) {
    if (!cil) continue;
    const d = Math.hypot(cil.x - hrdina.x, cil.y - hrdina.y) || 1;
    dx += ((cil.x - hrdina.x) / d) * sila;
    dy += ((cil.y - hrdina.y) / d) * sila;
  }
  if (!uhyba) return smer(hra, t, dx, dy);
  // Schopnosti bossů jsou vidět dopředu: stín dopadu kamene, rudý kruh dupnutí a čára výpadu.
  for (const k of hra.kameny) utec(k, k.polomer + 16, 4);
  for (const n of hra.nepratele) {
    const sch = n.schopnost;
    if (!n.boss || !sch) continue;
    if (sch.id === 'dupnuti' && sch.faze === 'varovani') utec(n, sch.s.polomer + 30, 5);
    if (sch.id === 'vypad') {
      // Z čáry výpadu uhne kolmo na tu stranu, kde už je (za bossem je v bezpečí).
      const vx = hrdina.x - n.x;
      const vy = hrdina.y - n.y;
      const bok = vx * -sch.uy + vy * sch.ux;
      const pas = n.polomer + 50;
      if (vx * sch.ux + vy * sch.uy < -n.polomer || Math.abs(bok) > pas) continue;
      const strana = bok >= 0 ? 1 : -1;
      dx += -sch.uy * strana * (pas - Math.abs(bok)) * 8;
      dy += sch.ux * strana * (pas - Math.abs(bok)) * 8;
    }
  }
  // Střele Bludičky uhne stranou (utíkat před ní nejde, je rychlejší).
  for (const st of hra.strelyBossu) {
    const vx = hrdina.x - st.x;
    const vy = hrdina.y - st.y;
    const d = Math.hypot(vx, vy);
    const rychlost = Math.hypot(st.vx, st.vy) || 1;
    if (d > 140 || vx * st.vx + vy * st.vy <= 0) continue;
    let kx = -st.vy / rychlost;
    let ky = st.vx / rychlost;
    if (kx * vx + ky * vy < 0) { kx = -kx; ky = -ky; }
    dx += kx * (140 - d) * 3;
    dy += ky * (140 - d) * 3;
  }
  return smer(hra, t, dx, dy);
}

function nejblizsiTruhla(hra, dosah) {
  let nej = null;
  let nejD = dosah;
  for (const p of hra.predmety) {
    const d = Math.hypot(p.x - hra.hrdina.x, p.y - hra.hrdina.y);
    if (p.druh === 'truhla' && d < nejD) { nej = p; nejD = d; }
  }
  return nej;
}

// Kupec má zboží, které bot chce a na které má (nakupBota), a vůz se dá otevřít (bot od něj už neodešel).
function chceKupce(h) {
  const k = h.kupec;
  if (!k || k.zavreno) return false;
  return nakupBota(h).some((id) => k.zasoba[id] > 0 && cenaZbozi(h, id) <= h.zlataky);
}

// Co bot u kupce kupuje, v pořadí: lektvar jen pod 60 % životů, pak kus výbavy, vylepšení a klíč, když na
// louce čeká zamčená truhla a klíč nemá. Přehození nekupuje.
function nakupBota(h) {
  return [
    ...(h.hrdina.hp < h.hrdina.maxHp * 0.6 ? ['lektvar'] : []),
    'kus', 'vylepseni',
    ...(h.zamcene.length && !h.klice ? ['klic'] : []),
  ];
}

// Zamčená truhla do dosahu, kterou bot umí otevřít (má klíč nebo dost zlaťáků).
function zamcenaProBota(h, dosah) {
  if (!(h.klice > 0 || h.zlataky >= CENA_ZAMCENE)) return null;
  let nej = null;
  let nejD = dosah;
  for (const z of h.zamcene) {
    const d = Math.hypot(z.x - h.hrdina.x, z.y - h.hrdina.y);
    if (d < nejD) { nej = z; nejD = d; }
  }
  return nej;
}

// U kupce: kupuje podle nakupBota, dokud na něco má (kus do obsazeného slotu hned porovná), pak odejde.
// kontrola(id, pred) se zavolá po každém nákupu (hlavní hra tím hlídá cenu a zásobu).
function nakupujBot(h, kontrola = () => {}) {
  for (let koupil = true; koupil;) {
    koupil = false;
    for (const id of nakupBota(h)) {
      const pred = { zlataky: h.zlataky, zasoba: h.kupec.zasoba[id], cena: cenaZbozi(h, id), hrozba: h.hrozba };
      if (!kup(h, id)) continue;
      kontrola(id, pred);
      if (h.porovnani) rozhodniKus(h, lepsiKus(h.porovnani));
      koupil = true;
      break;
    }
  }
  odejdiOdKupce(h);
}

// Přehodit karty: když v nabídce není žádná zbraň ani pasiva pod 5. úrovní a přehození je zdarma nebo stojí nejvýš
// čtvrtinu zlaťáků (nejvýš dvakrát na jedno okno).
function chcePrehodit(h, kolikrat) {
  if (kolikrat >= 2 || h.volby.some((v) => v.druh === 'zbran' || v.od < ZAKLAD_UROVNI)) return false;
  const cena = cenaPrehozeni(h);
  return cena === 0 || cena <= h.zlataky / 4;
}

// Když nemá před čím utíkat, jde pro truhlu, ke kupci, k zamčené truhle, pro nejbližší krystal nebo zlaťák,
// a když nic z toho není, chodí v kruhu.
function smer(hra, t, dx, dy) {
  const { hrdina } = hra;
  if (Math.hypot(dx, dy) < 1) {
    const truhla = nejblizsiTruhla(hra, 900) ?? (chceKupce(hra) ? hra.kupec : null) ?? zamcenaProBota(hra, 900);
    if (truhla) return { dx: truhla.x - hrdina.x, dy: truhla.y - hrdina.y };
    let nej = null;
    let nejD = Infinity;
    for (const k of [...hra.krystaly, ...hra.predmety.filter((p) => p.druh === 'zlatak')]) {
      const d = Math.hypot(k.x - hrdina.x, k.y - hrdina.y);
      if (d < nejD) { nej = k; nejD = d; }
    }
    if (nej) return { dx: nej.x - hrdina.x, dy: nej.y - hrdina.y };
    return { dx: Math.cos(t * 0.6), dy: Math.sin(t * 0.6) };
  }
  return { dx, dy };
}

// Na úrovni bere nejdřív novou nebo vylepšenou zbraň pod 5. úrovní, pak pasivu pod pátou, pak zbraň, pak cokoli
// (do 5. úrovně stejně jako dřív, než měly úrovně strop).
function zvol(volby) {
  const pod = (v) => v.od < ZAKLAD_UROVNI;
  return volby.find((v) => v.druh === 'zbran' && pod(v)) ?? volby.find((v) => v.druh === 'pasiva' && pod(v))
    ?? volby.find((v) => v.druh === 'zbran') ?? volby[0];
}

// Z porovnání kusů bere ten s lepšími staty (hodnotaKusu), při shodě nechá nasazený.
const lepsiKus = (p) => hodnotaKusu(p.novy) > hodnotaKusu(p.nasazeny);

// Okna po truhle a nové úrovni jako ve hře: nejdřív porovnání kusů, pak karty (případně přehodí), pak obchod.
function obsluz(h) {
  if (h.porovnani) rozhodniKus(h, lepsiKus(h.porovnani));
  if (h.volby) {
    for (let i = 0; chcePrehodit(h, i) && prehod(h); i++);
    vyber(h, zvol(h.volby));
  }
  if (h.obchod) nakupujBot(h);
}

// Strojový výstup pro nastroje/balanc.py. Jen s --json, bez něj test běží úplně stejně jako dřív.
//   node tests/simulace.mjs <seminko> <sekund> --json [--trida id] [--mapa id] [--vylepseni max]
// Odehraje jednu hru stejným botem jako hry na mapách (rozhodni + obsluz), nic nekontroluje a vypíše jeden řádek
// JSON: výsledek, průběh po minutách (zabití, úroveň, nepřátelé naráz, elity, rány) a příchod a pád každého bosse.
// S --seznam místo hry vypíše třídy, mapy, jména bossů a sílu hrozby po minutách (silaHrozby).
if (process.argv.includes('--json')) {
  const volba = (jmeno, vychozi) => {
    const i = process.argv.indexOf(jmeno);
    return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : vychozi;
  };
  const zaokr = (x, mist = 2) => Math.round(x * 10 ** mist) / 10 ** mist;
  let vystup;
  if (process.argv.includes('--seznam')) {
    vystup = {
      tridy: Object.fromEntries(Object.entries(TRIDY).map(([id, t]) => [id, t.nazev])),
      mapy: Object.fromEntries(PORADI_MAP.map((id) => [id, MAPY[id].nazev])),
      bossove: Object.fromEntries(Object.entries(BOSSOVE).map(([id, b]) => [id, b.nazev])),
      elity_od_min: HROZBA.elitaOd,
      casteji_od_min: HROZBA.castejiOd,
      narust_od_min: HROZBA.narustOd,
      pozde_od_min: HROZBA.pozdeOd,
      hrozba: Array.from({ length: Math.ceil(delka / 60) + 1 }, (_, min) => {
        const s = silaHrozby(min * 60);
        return {
          min, zivoty: zaokr(s.zivoty), boss_zivoty: zaokr(s.bossZivoty), poskozeni: zaokr(s.poskozeni),
          rychlost: zaokr(s.rychlost), elita: zaokr(s.elita, 3), davka: s.davka, vlna_s: zaokr(s.vlna),
        };
      }),
    };
  } else {
    const idTridy = volba('--trida', VYCHOZI_TRIDA);
    const idMapy = volba('--mapa', VYCHOZI_MAPA);
    const vylepseni = volba('--vylepseni', '') === 'max' ? Object.fromEntries(Object.entries(VYLEPSENI).map(([id, v]) => [id, v.max])) : {};
    if (!Object.hasOwn(TRIDY, idTridy) || !PORADI_MAP.includes(idMapy) || !Number.isFinite(seminko) || !(delka > 0)) {
      console.error(`CHYBA: neznámá třída, mapa, semínko nebo délka (${idTridy}, ${idMapy}, ${seminko}, ${delka})`);
      process.exit(2);
    }
    const h = novaHra(vytvorRng(seminko), idTridy, vylepseni, idMapy);
    const minuty = [];
    const bossove = [];
    const sledovani = new Map(); // elita nebo boss → záznam bosse (u elity null), dokud nepadne
    const videno = new WeakSet();
    let prvniElita = null;
    let zabitoPred = 0;
    for (let t = 0; t < delka && !h.konec; t += DT) {
      const hpPred = h.hrdina.hp;
      aktualizuj(h, DT, rozhodni(h, t), SIRKA, VYSKA);
      obsluz(h);
      const min = Math.floor(h.cas / 60);
      while (minuty.length <= min) minuty.push({ zabito: 0, elit: 0, elit_padlo: 0, nepratel: 0, snimku: 0, uroven: h.hrdina.uroven, zivoty_min: 1, rany: 0 });
      const m = minuty[min];
      m.zabito += h.zabito - zabitoPred;
      zabitoPred = h.zabito;
      m.nepratel += h.nepratele.length;
      m.snimku += 1;
      m.uroven = h.hrdina.uroven;
      m.zivoty_min = Math.min(m.zivoty_min, Math.max(0, h.hrdina.hp) / h.hrdina.maxHp);
      if (h.hrdina.hp < hpPred) m.rany += hpPred - h.hrdina.hp;
      for (const n of h.nepratele) {
        if (videno.has(n)) continue;
        videno.add(n);
        if (n.boss) {
          const zaznam = { druh: n.druh, prisel_s: zaokr(h.cas, 1), padl_s: null };
          bossove.push(zaznam);
          sledovani.set(n, zaznam);
        } else if (n.elita) {
          m.elit += 1;
          if (prvniElita === null) prvniElita = zaokr(h.cas, 1);
          sledovani.set(n, null);
        }
      }
      for (const [n, zaznam] of sledovani) {
        if (n.hp > 0) continue;
        if (zaznam) zaznam.padl_s = zaokr(h.cas, 1);
        else m.elit_padlo += 1;
        sledovani.delete(n);
      }
    }
    vystup = {
      seminko, sekund: delka, trida: idTridy, mapa: idMapy, vylepseni: Object.keys(vylepseni).length ? 'max' : 'zadna',
      prezil: !h.konec, preziti_s: zaokr(h.cas, 1), uroven: h.hrdina.uroven, zabito: h.zabito, zabito_bossu: h.zabitoBossu,
      oziveno: h.oziveno, prvni_elita_s: prvniElita,
      zbrane: Object.fromEntries(Object.entries(h.zbrane).map(([id, z]) => [id, z.uroven])),
      pasivy: { ...h.pasivy },
      bossove,
      minuty: minuty.map(({ snimku, nepratel, zivoty_min, rany, ...m }) => ({
        ...m, nepratel: Math.round(nepratel / snimku), zivoty_min: zaokr(zivoty_min), rany: Math.round(rany),
      })),
    };
  }
  // Výpis do roury je v Node na macOS asynchronní: počká se na něj, ať process.exit nic neusekne.
  await new Promise((hotovo) => process.stdout.write(`${JSON.stringify(vystup)}\n`, hotovo));
  process.exit(0);
}

for (let t = 0; t < delka && !hra.konec; t += DT) {
  const hpPred = hra.hrdina.hp;
  const regenPred = hra.vylecenoRegeneraci;
  const saniPred = hra.vylecenoSanim;
  const sitPred = hra.hrdina.sit;
  const odhozenPred = hra.hrdina.odhozen;
  const { x: xPred, y: yPred } = hra.hrdina;
  const schovani = hra.nepratele.filter((n) => n.skryty).map((n) => [n, n.hp]);
  const hrozbaPred = hra.hrozba;
  const casPred = hra.cas;
  const oteviraPred = hra.otevira;
  const polohyPred = oteviraPred ? hra.nepratele.map((n) => [n, n.x, n.y, n.hp]) : null;
  const kupecPred = hra.kupec;
  aktualizuj(hra, DT, rozhodni(hra, t), SIRKA, VYSKA);
  // Kupec: přijede za okraj obrazovky s ohlášením, ne dřív než v KUPEC.prvni, nikdy s živým bossem ani těsně
  // před příchodem dalšího a za KUPEC.trvani s odjede.
  if (hra.kupec && hra.kupec !== kupecPred) {
    const k = hra.kupec;
    prijezdyKupce.push({ s: Math.round(hra.cas), hrozba: hra.hrozba, zlataky: hra.zlataky });
    if (hra.cas < KUPEC.prvni || hra.nepratele.some((n) => n.boss) || hra.dalsiBoss - hra.cas < KUPEC.trvani) chybyZlata.push(`kupec přijel v ${hra.cas.toFixed(1)} s, i když neměl`);
    if (!(Math.abs(k.x - hra.hrdina.x) > SIRKA / 2 + 20 || Math.abs(k.y - hra.hrdina.y) > VYSKA / 2 + 20)) chybyZlata.push('kupec přijel na obrazovku');
    if (!hra.oznameni?.text.startsWith('Přijel kupec')) chybyZlata.push('kupec přijel bez ohlášení');
    if (PORADI_ZBOZI.some((id) => k.zasoba[id] !== ZBOZI[id].zasoba)) chybyZlata.push('kupec nepřivezl celou zásobu');
  }
  if (kupecPred && !hra.kupec) {
    const stal = hra.cas - kupecPred.prijel;
    if (Math.abs(stal - KUPEC.trvani) > DT * 1.5) chybyZlata.push(`kupec stál ${stal.toFixed(2)} s`);
    prijezdyKupce.at(-1).stal_s = Math.round(stal);
  }
  if (hra.kupec && hra.nepratele.some((n) => n.boss)) chybyZlata.push(`kupec a boss naráz v ${hra.cas.toFixed(1)} s`);
  // Otevírání truhly: svět stojí (čas, nepřátelé i hrdina), na konci kus od toho bosse, který truhlu nechal.
  if (oteviraPred) {
    snimkuOtevirani += 1;
    // (Životy se smí změnit jen v posledním snímku, kdy se nasadí kus se životy.)
    if (hra.cas !== casPred || (hra.otevira && hra.hrdina.hp !== hpPred) || polohyPred.some(([n, nx, ny, nhp]) => n.x !== nx || n.y !== ny || n.hp !== nhp)) {
      chybyVystroje.push(`při otevírání truhly se hrálo dál v čase ${hra.cas.toFixed(1)} s`);
    }
    if (!hra.otevira) {
      otevrenoTruhel += 1;
      const kus = hra.nalezy.at(-1);
      if (kus !== oteviraPred.kus || kus.boss !== oteviraPred.od || !hra.zTruhly || hra.truhlaOd !== kus.boss || !hra.volby) chybyVystroje.push('otevřená truhla nedala kus a kartu');
      if (!hra.porovnani && hra.vystroj[kus.slot] !== kus) chybyVystroje.push(`kus ${kus.id} do volného slotu se nenasadil`);
    }
  }
  // Hrozba = 1 + celé minuty, každé zvýšení s ohlášením.
  if (hra.hrozba !== 1 + Math.floor(hra.cas / 60)) chybyHrozby.push(`hrozba ${hra.hrozba} v čase ${hra.cas.toFixed(1)} s`);
  if (hra.hrozba > hrozbaPred) {
    ohlaseniHrozby += 1;
    if (hra.hrozba !== hrozbaPred + 1 || hra.hlaseniHrozby?.uroven !== hra.hrozba || !hra.hlaseniHrozby.text.startsWith(`Hrozba ${hra.hrozba}`)) {
      chybyHrozby.push(`hrozba ${hrozbaPred} → ${hra.hrozba} bez ohlášení (${hra.hlaseniHrozby?.text})`);
    }
  }
  // Schovaného ducha (před krokem i po něm) nesmí nic zasáhnout.
  for (const [n, hp] of schovani) {
    if (!n.skryty) continue;
    duchuSchovanych += 1;
    if (n.hp !== hp || !hra.nepratele.includes(n)) chybyNepratel.push(`schovaný duch dostal zásah v čase ${t.toFixed(1)} s`);
  }
  // Duchové od Bludičky mají svůj limit (vyvolání), sem se nepočítají.
  maxDuchu = Math.max(maxDuchu, hra.nepratele.filter((n) => n.duch && !n.pan).length);
  const noviVlci = [];
  for (const n of hra.nepratele) {
    if (videni.has(n)) continue;
    videni.add(n);
    if (n.druh in prvni && prvni[n.druh] === null) prvni[n.druh] = hra.cas;
    if (n.elita && prvniElita === null) prvniElita = hra.cas;
    if (n.elita && !muzeBytElitou(n)) chybyHrozby.push(`elitou se stal ${n.druh}`);
    if (muzeBytElitou(n)) {
      const min = hra.cas / 60;
      const kos = elityPodleCasu[min < HROZBA.elitaOd ? 'pred' : min < HROZBA.castejiOd ? 'stred' : 'pozde'];
      kos[0] += 1;
      if (n.elita) kos[1] += 1;
    }
    if (n.druh === 'vlk') noviVlci.push(n);
    if (n.boss) {
      prisliBossove.push({ druh: n.druh, s: Math.round(hra.cas) });
      if (hra.oznameni?.text !== BOSSOVE[n.druh]?.prichod) chybyBossu.push(`${n.druh} přišel s nápisem ${hra.oznameni?.text}`);
    }
  }
  // Pruh pro každého živého bosse, v pořadí příchodu.
  const bary = bossBary(hra);
  const zivi = hra.nepratele.filter((n) => n.boss);
  if (bary.length !== zivi.length || bary.some((b, i) => b.nepritel !== zivi[i] || !(b.hp >= 0 && b.hp <= b.maxHp) || b.nazev !== BOSSOVE[b.druh]?.nazev)) {
    chybyBossu.push(`pruhy bossů nesedí v čase ${t.toFixed(1)} s`);
  }
  maxPavoucku = Math.max(maxPavoucku, hra.nepratele.filter((n) => n.druh === 'pavoucek').length);
  maxTrsu = Math.max(maxTrsu, hra.trny.length);
  maxZon = Math.max(maxZon, hra.ledoveZony.length);
  if (noviVlci.length) {
    const rozptyl = Math.max(...noviVlci.map((n) => Math.hypot(n.x - noviVlci[0].x, n.y - noviVlci[0].y)));
    smecky.push(noviVlci.length);
    if (noviVlci.length < SMECKA_OD || noviVlci.length > SMECKA_DO) chybyNepratel.push(`smečka ${noviVlci.length} vlků`);
    if (rozptyl > 30) chybyNepratel.push(`smečka rozházená na ${rozptyl.toFixed(0)} px`);
  }
  for (const o of hra.oblaky) {
    if (!videneOblaky.has(o)) { videneOblaky.add(o); oblaku += 1; }
  }
  if (hra.cisla.some((c) => c.barva === 'jed' && c.zivot > 0.6 - DT * 1.5)) zasahuOblakem += 1;
  maxCisel = Math.max(maxCisel, hra.cisla.length);
  for (const c of hra.cisla) {
    if (videnaCisla.has(c)) continue;
    videnaCisla.add(c);
    const text = ['zraneni', 'jed', 'utrata'].includes(c.barva) ? `-${c.hodnota}` : ['leceni', 'zlato', 'sani'].includes(c.barva) ? `+${c.hodnota}`
      : c.barva === 'krit' ? `${kratkeCislo(c.hodnota)}!` : c.barva === 'stit' ? '0' : kratkeCislo(c.hodnota);
    if (!(c.hodnota > 0) || c.text !== text) {
      chybyCisel.push(`číslo ${c.text} (${c.hodnota}, ${c.barva}) v čase ${t.toFixed(1)} s`);
    }
  }
  if (hra.hrdina.hp < hpPred) {
    zasahu += 1;
    // Když ve stejném snímku sebral srdce, ubylo o ránu méně léčení (obojí má své číslo). Regenerace léčí
    // plynule a její zelené číslo ukazuje minulou chvíli, takže se počítá to, co vrátila v tomhle snímku.
    // Stejně Upíří zub (jeho růžové číslo se sčítá s dřívějším sáním).
    const tedCisla = hra.cisla.filter((c) => c.od === hra.cas);
    const leceniTed = tedCisla.filter((c) => c.barva === 'leceni' && !c.regenerace).reduce((a, c) => a + c.hodnota, 0);
    const regenTed = hra.vylecenoRegeneraci - regenPred;
    const saniTed = hra.vylecenoSanim - saniPred;
    if (tedCisla.some((c) => (c.barva === 'zraneni' || c.barva === 'jed') && Math.abs(c.hodnota - leceniTed - regenTed - saniTed - (hpPred - hra.hrdina.hp)) < 1e-6)) cervenychCisel += 1;
    if (hra.tres === TRVANI_TRESU) tresu += 1;
    if (hra.hrdina.sit === TRVANI_SITE && !hra.konec) siti += 1;
  }
  const pavouci = hra.nepratele.filter((n) => n.druh === 'pavouk').length;
  if (pavouci && prvniPavouk === null) prvniPavouk = hra.cas;
  maxPavouku = Math.max(maxPavouku, pavouci);
  // Odhozený hrdina letí, i když je v síti (rána ho posune, ne nohy).
  if (sitPred > 0) {
    krokuVSiti += 1;
    const ujito = Math.hypot(hra.hrdina.x - xPred, hra.hrdina.y - yPred);
    if (!(odhozenPred > 0) && ujito > hra.hrdina.rychlost * ZPOMALENI_SITI * DT + 1e-6) {
      throw new Error(`hrdina v síti nezpomalil v čase ${t.toFixed(1)} s (${ujito.toFixed(2)} px za krok)`);
    }
  }
  maxBeden = Math.max(maxBeden, hra.bedny.length);
  for (const b of hra.bedny) {
    if (videneBedny.has(b)) continue;
    videneBedny.add(b);
    if (!mimoObrazovku(b, hra.hrdina)) chybyBeden.push(`bedna se objevila na obrazovce v čase ${t.toFixed(1)} s`);
  }
  maxCastic = Math.max(maxCastic, hra.castice.length);
  if (hra.castice.some((c) => !Number.isFinite(c.x) || !Number.isFinite(c.y))) {
    throw new Error(`NaN u úlomku v čase ${t.toFixed(1)} s`);
  }
  if (hra.porovnani) {
    const { novy, nasazeny } = hra.porovnani;
    const vzit = lepsiKus(hra.porovnani);
    const zlatoPred = hra.zlataky;
    if (novy.slot !== nasazeny.slot || hra.vystroj[novy.slot] !== nasazeny) chybyVystroje.push(`porovnání ${novy.id} nesedí se slotem`);
    rozhodniKus(hra, vzit);
    if (hra.porovnani || hra.vystroj[novy.slot] !== (vzit ? novy : nasazeny) || hra.zlataky - zlatoPred !== zlatakyZaKus(vzit ? nasazeny : novy)) {
      chybyVystroje.push(`rozhodnutí o ${novy.id} nesedí`);
    }
    rozhodnuti.push(`${vzit ? 'vzal' : 'nechal'} ${novy.nazev} (${novy.rarita}) za ${nasazeny.nazev} (${nasazeny.rarita})`);
  }
  if (hra.volby) {
    volby += 1;
    zkontrolujKarty(hra);
    // Přehození: nové karty, zaplatí přesně cenu a další přehození za zlaťáky je o PREHOZENI.rust dražší.
    for (let i = 0; chcePrehodit(hra, i); i++) {
      const pred = { zlataky: hra.zlataky, cena: cenaPrehozeni(hra), volby: hra.volby, zdarma: hra.prehozeniZdarma };
      if (!prehod(hra)) {
        if (pred.cena <= pred.zlataky) chybyZlata.push('přehození, na které bylo, neprošlo');
        break;
      }
      prehozeniHlavni += 1;
      zkontrolujKarty(hra);
      if (hra.volby === pred.volby || hra.zlataky !== pred.zlataky - pred.cena) chybyZlata.push('přehození nedalo nové karty nebo nesedí cena');
      if (pred.cena > 0 && cenaPrehozeni(hra) !== pred.cena + PREHOZENI.rust) chybyZlata.push('cena přehození nevzrostla');
    }
    const vzata = zvol(hra.volby);
    const predVyberem = podpisVybavy(hra);
    vyber(hra, vzata);
    zkontrolujVybavu(hra, `výběr v ${t.toFixed(1)} s`);
    const zmena = podpisVybavy(hra) !== predVyberem;
    if (zmena) zmenVybavy += 1;
    if (zmena !== (vzata.druh !== 'leceni')) chybyVybavy.push(`výběr ${vzata.id} v ${t.toFixed(1)} s ${zmena ? 'změnil' : 'nezměnil'} přehled výbavy`);
    if (hra.zTruhly) chybyRarit.push('po výběru zůstala truhla otevřená');
  }
  // Obchod: otevře se jen u vozu, bot nakupuje, každý nákup stojí přesně cenu podle hrozby a ubere ze zásoby.
  if (hra.obchod && !hra.volby && !hra.porovnani) {
    otevrenoObchodu += 1;
    if (!hra.kupec || Math.hypot(hra.kupec.x - hra.hrdina.x, hra.kupec.y - hra.hrdina.y) >= KUPEC.dosah) chybyZlata.push('obchod se otevřel daleko od vozu');
    nakupujBot(hra, (id, pred) => {
      const ocekavana = ZBOZI[id].rust === false ? ZBOZI[id].cena : Math.round(ZBOZI[id].cena * (1 + RUST_CEN) ** (pred.hrozba - 1));
      if (pred.cena !== ocekavana || hra.zlataky !== pred.zlataky - pred.cena || hra.kupec.zasoba[id] !== pred.zasoba - 1) {
        chybyZlata.push(`nákup ${id} za ${pred.cena} nesedí`);
      }
    });
    if (hra.obchod) chybyZlata.push('obchod po odchodu zůstal otevřený');
  }
  maxNepratel = Math.max(maxNepratel, hra.nepratele.length);
  const { x, y, hp } = hra.hrdina;
  if (![x, y, hp].every(Number.isFinite)) throw new Error(`NaN u hrdiny v čase ${t.toFixed(1)} s`);
  if (hra.nepratele.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.hp))) {
    throw new Error(`NaN u nepřítele v čase ${t.toFixed(1)} s`);
  }
}

// Každá třída krátce sama: začíná se svou zbraní, má svou výhodu a zabíjí.
// Základ vlastnosti se bere z třídy, která ji nemění.
const zaklad = (vlastnost) => {
  const jina = Object.keys(TRIDY).find((id) => !(vlastnost in TRIDY[id].nasobky));
  return novaHra(vytvorRng(seminko), jina).hrdina[vlastnost];
};
const chybyTrid = [];
const tridy = {};
for (const [id, t] of Object.entries(TRIDY)) {
  const h = novaHra(vytvorRng(seminko), id);
  const zbrane = Object.keys(h.zbrane);
  if (zbrane.length !== 1 || zbrane[0] !== t.zbran) chybyTrid.push(`${id} nezačíná jen s ${t.zbran} (${zbrane})`);
  for (const [vlastnost, nasobek] of Object.entries(t.nasobky)) {
    if (Math.abs(h.hrdina[vlastnost] - zaklad(vlastnost) * nasobek) > 1e-9) chybyTrid.push(`${id}: ${vlastnost} bez výhody`);
  }
  if (h.hrdina.hp !== h.hrdina.maxHp) chybyTrid.push(`${id} nezačíná s plnými životy`);
  for (let t2 = 0; t2 < 180 && !h.konec; t2 += DT) {
    aktualizuj(h, DT, rozhodni(h, t2), SIRKA, VYSKA);
    obsluz(h);
    if (![h.hrdina.x, h.hrdina.y, h.hrdina.hp].every(Number.isFinite)) throw new Error(`NaN u třídy ${id}`);
  }
  if (h.zabito === 0 || h.hrdina.uroven < 3) chybyTrid.push(`${id} za 3 minuty skoro nic (úroveň ${h.hrdina.uroven}, zabito ${h.zabito})`);
  tridy[id] = { preziti_s: Math.round(h.cas), uroven: h.hrdina.uroven, zabito: h.zabito };
}
// Kratší nabíjení se musí projevit u všech zbraní.
const bourka = novaHra(vytvorRng(seminko), 'bourlivak');
const obycejna = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA);
const sB = staty(bourka);
const sO = staty(obycejna);
if (!(sB.jiskra.nabiti < sO.jiskra.nabiti && sB.blesk.nabiti < sO.blesk.nabiti
  && sB.lucerna.tik < sO.lucerna.tik && sB.krumpace.rychlost > sO.krumpace.rychlost
  && sB.trny.nabiti < sO.trny.nabiti && sB.zrcadlo.rychlost > sO.zrcadlo.rychlost
  && sB.svetlusky.nabiti < sO.svetlusky.nabiti && sB.mraz.nabiti < sO.mraz.nabiti
  && sB.zvon.nabiti < sO.zvon.nabiti && sB.cep.rozmach > sO.cep.rozmach && sB.seminka.nabiti < sO.seminka.nabiti
  && sB.korene.nabiti < sO.korene.nabiti && sB.stopa.tik < sO.stopa.tik && sB.prak.nabiti < sO.prak.nabiti)) {
  chybyTrid.push('kratší nabíjení Bouřliváka nezrychlilo všechny zbraně');
}

// Trvalá vylepšení. Krátká hra s danými vylepšeními a řidičem (bot nebo kamikaze).
function hrajKratce(vylepseni, sekund, ridic = rozhodni, kazdyKrok = () => {}) {
  const h = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, vylepseni);
  for (let t = 0; t < sekund && !h.konec; t += DT) {
    aktualizuj(h, DT, ridic(h, t), SIRKA, VYSKA);
    obsluz(h);
    if (![h.hrdina.x, h.hrdina.y, h.hrdina.hp, h.hrdina.xp].every(Number.isFinite)) throw new Error('NaN ve hře s vylepšeními');
    kazdyKrok(h);
  }
  return h;
}
const otiskHry = (h) => JSON.stringify({ cas: h.cas, zabito: h.zabito, hrdina: h.hrdina, nepratel: h.nepratele.length, krystalu: h.krystaly.length });
const chybyDusi = [];
// Bez vylepšení, s prázdnými, nulovými nebo rozbitými musí hra dopadnout úplně stejně.
const bezVylepseni = otiskHry(hrajKratce(undefined, 150));
const nuly = Object.fromEntries(Object.keys(VYLEPSENI).map((id) => [id, 0]));
for (const [popis, nic] of [['{}', {}], ['nuly', nuly], ['null', null], ['rozbitá', { drak: 5, sila: 'hodně', zivoty: -2, rychlost: 1.5 }]]) {
  if (otiskHry(hrajKratce(nic, 150)) !== bezVylepseni) chybyDusi.push(`vylepšení ${popis} změnila hru`);
}
if (hra.oziveno !== 0) chybyDusi.push('hra bez vylepšení oživila hrdinu');
// Každé vylepšení na maximu změní svou vlastnost přesně o to, co slibuje.
const plna = Object.fromEntries(Object.entries(VYLEPSENI).map(([id, v]) => [id, v.max]));
const slaby = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA).hrdina;
const silny = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, plna).hrdina;
for (const [id, v] of Object.entries(VYLEPSENI)) {
  const ocekavano = v.nasobek ? slaby[v.vlastnost] * (1 + v.nasobek * v.max) : slaby[v.vlastnost] + v.pricti * v.max;
  if (!(Math.abs(silny[v.vlastnost] - ocekavano) < 1e-9) || silny[v.vlastnost] === slaby[v.vlastnost]) {
    chybyDusi.push(`vylepšení ${id} nezměnilo ${v.vlastnost} (${silny[v.vlastnost]})`);
  }
}
if (silny.hp !== silny.maxHp) chybyDusi.push('s vylepšenými životy hrdina nezačíná naplno');
// Zkušenosti: krystal pod nohama dá víc.
const zk = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, { zkusenosti: VYLEPSENI.zkusenosti.max });
zk.krystaly.push({ x: 0, y: 0, xp: 2 });
aktualizuj(zk, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (Math.abs(zk.hrdina.xp - 2 * zk.hrdina.zkusenosti) > 1e-9 || zk.hrdina.zkusenosti <= 1) chybyDusi.push(`zkušenosti z krystalu nesedí (${zk.hrdina.xp})`);
// Štěstí: stejné losy z rng, víc srdcí a magnetů. 3000 nepřátel padne naráz u nezranitelného hrdiny.
const padlo = (vylepseni) => {
  const h = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, vylepseni);
  h.hrdina.nezranitelny = 10;
  for (let i = 0; i < 3000; i++) h.nepratele.push({ druh: 'netopyr', x: 30, y: 0, hp: 0, maxHp: 1, rychlost: 0, poskozeni: 0, xp: 0, polomer: 1, zasazen: 0, zasahKrumpacem: 0 });
  aktualizuj(h, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  return h.predmety.filter((p) => p.druh === 'srdce' || p.druh === 'magnet').length;
};
const padloBez = padlo({});
const padloSeStestim = padlo({ stesti: VYLEPSENI.stesti.max });
if (!(padloSeStestim > padloBez && padloBez > 0)) chybyDusi.push(`štěstí nepřidalo srdce a magnety (${padloBez} → ${padloSeStestim})`);
// Plně vylepšený hrdina 3 minuty s botem: nic nespadne a nevydrží méně.
const vylepsena = hrajKratce(plna, 180);
// Oživení: hrdina běží rovnou do nepřátel. Po první smrti vstane s půlkou životů, nepřátelé odletí, po druhé je konec.
const kamikaze = (h) => {
  let nej = null;
  let nejD = Infinity;
  for (const n of h.nepratele) {
    const d = Math.hypot(n.x - h.hrdina.x, n.y - h.hrdina.y);
    if (d < nejD) { nej = n; nejD = d; }
  }
  return nej ? { dx: nej.x - h.hrdina.x, dy: nej.y - h.hrdina.y } : { dx: 0, dy: 0 };
};
let oziveni = null;
const sOzivenim = hrajKratce({ oziveni: 1 }, 1200, kamikaze, (h) => {
  if (h.oziveno && !oziveni) {
    const nejblizsi = Math.min(...h.nepratele.map((n) => Math.hypot(n.x - h.hrdina.x, n.y - h.hrdina.y)));
    oziveni = { cas: h.cas, hp: h.hrdina.hp, maxHp: h.hrdina.maxHp, nezranitelny: h.hrdina.nezranitelny, nejblizsi };
  }
});
const bezOziveni = hrajKratce({}, 1200, kamikaze);
if (!oziveni) chybyDusi.push('Oživení hrdinu nevrátilo');
else {
  // (maxHp z chvíle oživení: karta Srdce po něm by ho změnila)
  if (oziveni.hp !== Math.round(oziveni.maxHp * ZIVOTY_PO_OZIVENI)) chybyDusi.push(`po oživení ${oziveni.hp} životů`);
  if (oziveni.nezranitelny !== NEZRANITELNY_PO_OZIVENI) chybyDusi.push('po oživení hrdina není nezranitelný');
  if (oziveni.nejblizsi < ODHOZENI_PRI_OZIVENI - 4) chybyDusi.push(`po oživení zůstal nepřítel ${oziveni.nejblizsi.toFixed(1)} px od hrdiny`);
  if (!sOzivenim.konec || sOzivenim.oziveno !== 1) chybyDusi.push('Oživení platí víc než jednou za hru');
  if (!bezOziveni.konec || bezOziveni.oziveno !== 0 || bezOziveni.cas > oziveni.cas + 1e-9) chybyDusi.push('bez Oživení hrdina vstal nebo přežil déle');
}
// Duše za hru podle času, zabití a Strážců (a s Chamtivostí o její násobek víc, jen celé duše).
const duseHry = dusZaHru(hra);
const zakladDusi = Math.floor(hra.cas / DUSE_ZA.sekund) + Math.floor(hra.zabito / DUSE_ZA.zabitych) + hra.zabitoBossu * DUSE_ZA.strazce
  + Math.floor(hra.zlataky / DUSE_ZA.zlataku);
const ocekavaneDuse = zakladDusi + Math.floor(zakladDusi * (hra.hrdina.chamtivost - 1) + 1e-9);
if (duseHry.celkem !== ocekavaneDuse || duseHry.celkem !== duseHry.cas + duseHry.zabiti + duseHry.strazci + duseHry.zlataky + duseHry.chamtivost) chybyDusi.push('duše za hru nesedí');
// Z každých DUSE_ZA.zlataku nevyužitých zlaťáků je duše, zbytek propadne.
if (dusZaHru({ cas: 0, zabito: 0, zabitoBossu: 0, zlataky: 3 * DUSE_ZA.zlataku + 2 }).celkem !== 3) chybyDusi.push('zlaťáky nedávají duše');
if (dusZaHru({ cas: 0, zabito: 0, zabitoBossu: 0, zlataky: DUSE_ZA.zlataku - 1 }).celkem !== 0) chybyDusi.push('pár zlaťáků dalo celou duši');
if (dusZaHru(novaHra(vytvorRng(1))).celkem !== 0) chybyDusi.push('nová hra má mít 0 duší');
if (dusZaHru({ cas: 0, zabito: 0, zabitoBossu: 2 }).celkem !== 2 * DUSE_ZA.strazce) chybyDusi.push('Strážci nedávají duše');
// Obchod: ceny rostou, bez duší ani nad maximum se nekoupí, Vrátit duše vrátí přesně utracené.
let obchod = { duse: 100000, vylepseni: {} };
let zaplaceno = 0;
for (const [id, v] of Object.entries(VYLEPSENI)) {
  for (let u = 1; u < v.max; u++) {
    if (!(cenaVylepseni(id, u) > cenaVylepseni(id, u - 1))) chybyDusi.push(`cena ${id} neroste`);
  }
  for (let u = 0; u < v.max; u++) {
    const cena = cenaVylepseni(id, u);
    const dalsi = kupVylepseni(obchod, id);
    if (!dalsi || dalsi.duse !== obchod.duse - cena || dalsi.vylepseni[id] !== u + 1) chybyDusi.push(`nákup ${id} ${u + 1} nesedí`);
    obchod = dalsi ?? obchod;
    zaplaceno += cena;
  }
  if (cenaVylepseni(id, v.max) !== null || kupVylepseni(obchod, id) !== null) chybyDusi.push(`${id} jde koupit nad maximum`);
}
if (utraceno(obchod.vylepseni) !== zaplaceno || obchod.duse !== 100000 - zaplaceno) chybyDusi.push('utracené duše nesedí');
const vraceno = vratDuse(obchod);
if (vraceno.duse !== 100000 || Object.keys(vraceno.vylepseni).length) chybyDusi.push('Vrátit duše nevrátilo všechno');
if (kupVylepseni({ duse: cenaVylepseni('sila', 0) - 1, vylepseni: {} }, 'sila') !== null) chybyDusi.push('nákup bez dost duší prošel');
if (kupVylepseni({ duse: 999, vylepseni: {} }, 'drak') !== null) chybyDusi.push('koupilo se neznámé vylepšení');

// Rarity: šance dávají dohromady 1, s časem a se Štěstím je vzácnějších víc, truhla nedá běžnou.
const naZacatku = novaHra(vytvorRng(seminko));
const pozde = novaHra(vytvorRng(seminko));
pozde.cas = CAS_PLNYCH_RARIT;
const stastny = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, { stesti: VYLEPSENI.stesti.max });
const sZacatek = sanceRarit(naZacatku);
const sPozde = sanceRarit(pozde);
const sStesti = sanceRarit(stastny);
const sTruhla = sanceRarit(naZacatku, 'vzacna');
const vzacnejsi = (s) => 1 - s.bezna;
for (const [popis, s] of [['začátek', sZacatek], ['15. minuta', sPozde], ['Štěstí', sStesti], ['truhla', sTruhla]]) {
  const soucet = Object.values(s).reduce((a, b) => a + b, 0);
  if (Math.abs(soucet - 1) > 1e-9 || Object.values(s).some((p) => !(p >= 0))) chybyRarit.push(`šance rarit (${popis}) nedávají 1`);
}
if (!PORADI_RARIT.every((id, i) => i === 0 || sZacatek[id] < sZacatek[PORADI_RARIT[i - 1]])) chybyRarit.push('vzácnější rarita není vzácnější');
if (!(vzacnejsi(sPozde) > vzacnejsi(sZacatek))) chybyRarit.push('s časem nepřibylo vzácnějších karet');
if (!(vzacnejsi(sStesti) > vzacnejsi(sZacatek))) chybyRarit.push('Štěstí nepřidalo vzácnější karty');
if (sTruhla.bezna !== 0) chybyRarit.push('truhla má šanci na běžnou kartu');
// Losování sedí se šancemi: 3000 nabídek po 3 kartách na začátku hry.
const losovano = Object.fromEntries(PORADI_RARIT.map((id) => [id, 0]));
let karet = 0;
for (let i = 0; i < 3000; i++) {
  for (const v of nabidka(naZacatku)) { losovano[v.rarita] += 1; karet += 1; }
}
for (const id of PORADI_RARIT) {
  if (Math.abs(losovano[id] / karet - sZacatek[id]) > 0.02) chybyRarit.push(`${id} padá ${(losovano[id] / karet).toFixed(3)} místo ${sZacatek[id].toFixed(3)}`);
}
for (let i = 0; i < 500; i++) {
  if (nabidka(naZacatku, 'vzacna').some((v) => v.rarita === 'bezna')) { chybyRarit.push('nabídka s minimem vzácná dala běžnou'); break; }
}
if (JSON.stringify(nabidka(novaHra(vytvorRng(seminko)))) !== JSON.stringify(nabidka(novaHra(vytvorRng(seminko))))) chybyRarit.push('stejné semínko dalo jiné karty');
// Karty podle rarity dají přesně to, co slibují. Lovec začíná s Jiskrou na 1.
const k = novaHra(vytvorRng(seminko));
const blizko = (a, b) => Math.abs(a - b) < 1e-9;
const legBlesk = karta(k, 'zbran', 'blesk', 'legendarni');
if (legBlesk.od !== 0 || legBlesk.uroven !== 3 || legBlesk.popis.length !== 3 || legBlesk.popis[0] !== ZBRANE.blesk.popis[0]) chybyRarit.push('legendární nová zbraň nemá 3 úrovně');
k.hrdina.hp = 10;
vyber(k, legBlesk);
if (k.zbrane.blesk?.uroven !== 3 || !blizko(k.hrdina.sila, 1 + RARITY.legendarni.sila) || k.hrdina.hp !== k.hrdina.maxHp) chybyRarit.push('legendární karta nedala úrovně, poškození nebo doléčení');
// Přes 5. úroveň: legendární karta Jiskry ze 4. dá 5. úroveň z popisu a dvě další po +8 % poškození, bez přebytku.
k.zbrane.jiskra.uroven = ZAKLAD_UROVNI - 1;
const pres = karta(k, 'zbran', 'jiskra', 'legendarni');
if (pres.kroku !== 3 || pres.uroven !== ZAKLAD_UROVNI + 2 || !blizko(pres.bonus.sila, RARITY.legendarni.sila)
  || pres.popis.join('|') !== `${ZBRANE.jiskra.popis[ZAKLAD_UROVNI - 1]}|+16 % poškození`) chybyRarit.push(`legendární karta přes 5. úroveň: ${pres.uroven}, ${pres.popis}`);
vyber(k, pres);
if (k.zbrane.jiskra.uroven !== ZAKLAD_UROVNI + 2) chybyRarit.push(`jiskra po legendární kartě na ${k.zbrane.jiskra.uroven}`);
// Z 7. na 8. přijde k poškození i první kus navíc.
const osma = karta(k, 'zbran', 'jiskra', 'bezna');
if (osma.uroven !== 8 || osma.popis.join('|') !== '+8 % poškození|+1 jiskra') chybyRarit.push(`karta Jiskry na 8. úroveň: ${osma.popis}`);
const silaPred = k.hrdina.sila;
const rychlostPred = k.hrdina.rychlost;
vyber(k, karta(k, 'pasiva', 'boty', 'vzacna'));
if (k.pasivy.boty !== 2 || !blizko(k.hrdina.rychlost, rychlostPred * 1.12 ** 2) || k.hrdina.sila !== silaPred) chybyRarit.push('vzácné boty nedaly 2 úrovně');
const maxHpPred = k.hrdina.maxHp;
vyber(k, karta(k, 'pasiva', 'srdce', 'epicka'));
if (k.pasivy.srdce !== 2 || k.hrdina.maxHp !== maxHpPred + 40 || !blizko(k.hrdina.sila, silaPred * (1 + RARITY.epicka.sila))) chybyRarit.push('epické srdce nesedí');
k.pasivy.magnet = ZAKLAD_UROVNI;
const magnetDal = karta(k, 'pasiva', 'magnet', 'vzacna');
if (magnetDal.kroku !== 2 || magnetDal.uroven !== ZAKLAD_UROVNI + 2 || magnetDal.popis.join() !== `2× ${PASIVY.magnet.popisDal}`) chybyRarit.push(`pasiva na 5. úrovni dál: ${magnetDal.popis}`);
for (const id of PORADI_RARIT) {
  const odpocinek = karta(k, 'leceni', 'leceni', id);
  if (odpocinek.bonus.sila !== 0) chybyRarit.push(`odpočinek ${id} přidává poškození`);
}
k.hrdina.hp = 1;
vyber(k, karta(k, 'leceni', 'leceni', 'vzacna'));
if (k.hrdina.hp !== 1 + 2 * LECENI_ODPOCINKU) chybyRarit.push(`vzácný odpočinek doléčil na ${k.hrdina.hp}`);
if (karta(k, 'zbran', 'lucerna', 'drak').rarita !== 'bezna') chybyRarit.push('neznámá rarita není běžná');
// Truhla a nová úroveň ve stejném snímku: nejdřív se otevře truhla, úroveň počká, až bude vybraná.
const tr = novaHra(vytvorRng(seminko));
tr.predmety.push({ druh: 'truhla', x: 0, y: 0 });
tr.krystaly.push({ x: 0, y: 0, xp: 100 });
aktualizuj(tr, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (!tr.otevira || tr.volby) chybyRarit.push('truhla se po dotyku neotevírá');
for (let t = 0; t < TRVANI_OTEVRENI + 0.1 && tr.otevira; t += DT) aktualizuj(tr, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (!tr.zTruhly || !tr.volby || tr.hrdina.uroven !== 1) chybyRarit.push('truhla se přepsala novou úrovní');
else {
  vyber(tr, tr.volby[0]);
  aktualizuj(tr, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (tr.hrdina.uroven !== 2 || !tr.volby || tr.zTruhly) chybyRarit.push('úroveň po truhle nepřišla');
}
// Noví nepřátelé zblízka. Hrdina stojí v (0, 0), nepřátelé z okraje jsou daleko a nevadí.
const hraj = (h, sekund, kazdyKrok = () => {}) => {
  for (let t = 0; t < sekund - 1e-9; t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    kazdyKrok(h);
  }
};
const vsechnyZbrane = () => Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: ZAKLAD_UROVNI, nabiti: 0 }]));
// Schovaný duch na hrdinovi: zbraně na maximu ho nezasáhnou a on hrdinu nezraní. Viditelný ano.
for (const skryty of [true, false]) {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = vsechnyZbrane();
  const duch = pridejNepritele(h, 'duch', 6, 0);
  duch.rychlost = 0;
  Object.assign(duch, { skryty, duchCas: skryty ? SKRYTY_DUCH : VIDITELNY_DUCH });
  hraj(h, 0.5);
  const zasazen = duch.hp < duch.maxHp || !h.nepratele.includes(duch);
  if (skryty && (zasazen || h.hrdina.hp !== h.hrdina.maxHp)) chybyNepratel.push('schovaný duch dostal zásah nebo zranil');
  if (!skryty && (!zasazen || h.hrdina.hp === h.hrdina.maxHp)) chybyNepratel.push('viditelný duch se nedá zasáhnout nebo nezraní');
}
// Duch proletí skrz: zamíří na hrdinu, letí rovně dál, zmizí a po vynoření zamíří zpátky.
const prolet = novaHra(vytvorRng(seminko));
prolet.zbrane = {};
prolet.hrdina.nezranitelny = 1000;
const letec = pridejNepritele(prolet, 'duch', -200, 0);
let nejdal = -Infinity;
let bylSchovany = false;
hraj(prolet, VIDITELNY_DUCH + SKRYTY_DUCH - 0.1, () => { nejdal = Math.max(nejdal, letec.x); bylSchovany ||= letec.skryty; });
if (!(nejdal > 40) || Math.abs(letec.y) > 1e-6) chybyNepratel.push(`duch neproletěl skrz (nejdál x ${nejdal.toFixed(1)})`);
if (!bylSchovany) chybyNepratel.push('duch nezmizel');
hraj(prolet, 0.2);
if (letec.skryty || !(letec.smerX < 0)) chybyNepratel.push('duch se po zmizení neukázal nebo nezamířil zpátky');
// Houbák padne vedle hrdiny: oblak se nafoukne (nepálí), pak pálí, po 3 s zmizí. Mimo oblak nic.
const jed = novaHra(vytvorRng(seminko));
jed.zbrane = {};
const houbak = pridejNepritele(jed, 'houbak', 25, 0);
houbak.hp = 0;
hraj(jed, DT);
if (jed.oblaky.length !== 1) chybyNepratel.push(`po houbákovi ${jed.oblaky.length} oblaků`);
hraj(jed, NAFUKOVANI_OBLAKU - 2 * DT);
if (jed.hrdina.hp !== jed.hrdina.maxHp) chybyNepratel.push('oblak pálí, i když se teprve nafukuje');
hraj(jed, 0.6);
const poJedu = jed.hrdina.hp;
if (!(poJedu < jed.hrdina.maxHp) || (jed.hrdina.maxHp - poJedu) % JED_OBLAKU !== 0) chybyNepratel.push(`oblak nepálí (${poJedu} životů)`);
hraj(jed, TRVANI_OBLAKU);
if (jed.oblaky.length) chybyNepratel.push('oblak nezmizel po 3 s');
const poOblaku = jed.hrdina.hp;
jed.oblaky.push({ x: 200, y: 0, zivot: TRVANI_OBLAKU, polomer: 36 });
hraj(jed, 1);
if (jed.hrdina.hp !== poOblaku) chybyNepratel.push('vzdálený oblak zranil hrdinu');
// Oblak hrdinu zabije jen jako cokoli jiného: s Oživením vstane.
const smrtVJedu = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, { oziveni: 1 });
smrtVJedu.zbrane = {};
smrtVJedu.hrdina.hp = 1;
smrtVJedu.oblaky.push({ x: 0, y: 0, zivot: TRVANI_OBLAKU - NAFUKOVANI_OBLAKU - 0.1, polomer: 36 });
hraj(smrtVJedu, DT);
if (smrtVJedu.oziveno !== 1 || smrtVJedu.konec) chybyNepratel.push('smrt v oblaku neoživila hrdinu');
// Vlci jsou nejrychlejší z obyčejných nepřátel.
const rychlostiOstatnich = Object.entries(RYCHLOST_NEPRATEL).filter(([id]) => id !== 'vlk').map(([, r]) => r);
if (!(RYCHLOST_NEPRATEL.vlk > Math.max(...rychlostiOstatnich))) chybyNepratel.push('vlk není rychlejší než ostatní');
// Kdy přišli v hlavní hře.
for (const [druh, od] of [['duch', OD_DUCHU], ['houbak', OD_HOUBAKU], ['vlk', OD_VLKU]]) {
  if (prvni[druh] !== null && prvni[druh] < od) chybyNepratel.push(`${druh} přišel moc brzy (${prvni[druh].toFixed(1)} s)`);
  if (prvni[druh] === null && hra.cas > od + 40) chybyNepratel.push(`po ${od} s nepřišel žádný ${druh}`);
}
if (maxDuchu > MAX_DUCHU) chybyNepratel.push(`duchů najednou ${maxDuchu}`);
if (smecky.length !== hra.smecek) chybyNepratel.push(`smeček ${smecky.length}, hra jich hlásí ${hra.smecek}`);
if (prvni.houbak !== null && hra.cas > OD_HOUBAKU + 120 && oblaku === 0) chybyNepratel.push('houbáci umírali, ale žádný oblak');

// Žár lucerny: Světlonoš stojí, jeden slizák je kousek uvnitř dosahu, druhý kousek za ním.
const chybyLucerny = [];
const luc = novaHra(vytvorRng(seminko), 'svetlonos');
luc.doSpawnu = Infinity;
const dosahLucerny = staty(luc).lucerna.dosah;
const vDosahu = pridejNepritele(luc, 'slizak', dosahLucerny - 10, 0);
const zaDosahem = pridejNepritele(luc, 'slizak', -(dosahLucerny + 30), 0);
vDosahu.rychlost = 0;
zaDosahem.rychlost = 0;
aktualizuj(luc, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (!(vDosahu.hp < vDosahu.maxHp) || vDosahu.zar !== TRVANI_ZARU) chybyLucerny.push(`žár nerozzářil nepřítele v dosahu (zar ${vDosahu.zar})`);
if (vDosahu.zasazen !== 0) chybyLucerny.push('po žáru nepřítel zbělal jako od jiné zbraně');
if (zaDosahem.zar !== 0 || zaDosahem.hp !== zaDosahem.maxHp) chybyLucerny.push('žár zasáhl nepřítele za dosahem');
// další žár přijde až po 0,3 s, rozzáření (0,2 s) do té doby zhasne
for (let t = 0; t < TRVANI_ZARU + 0.05; t += DT) aktualizuj(luc, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (vDosahu.zar !== 0) chybyLucerny.push(`rozzáření nezhaslo (zar ${vDosahu.zar})`);

// Bedničky. Kořist padá podle šancí (rovnoměrné losy 0..1 dají přesně ty podíly).
const sanceKoristi = Object.values(KORIST_BEDEN).reduce((a, b) => a + b, 0);
if (Math.abs(sanceKoristi - 1) > 1e-9) chybyBeden.push(`šance kořisti dávají ${sanceKoristi}`);
const losovanaKorist = Object.fromEntries(Object.keys(KORIST_BEDEN).map((id) => [id, 0]));
for (let i = 0; i < 10000; i++) losovanaKorist[losujKorist((i + 0.5) / 10000)] += 1;
for (const [id, sance] of Object.entries(KORIST_BEDEN)) {
  if (Math.abs(losovanaKorist[id] / 10000 - sance) > 0.001) chybyBeden.push(`${id} z bedny padá ${losovanaKorist[id] / 10000} místo ${sance}`);
}
if (!(KORIST_BEDEN.bomba < Math.min(...Object.entries(KORIST_BEDEN).filter(([id]) => id !== 'bomba').map(([, p]) => p)))) chybyBeden.push('bomba není nejvzácnější');
// Hrdina stojí sám (bez vln a nových beden) a bedny mu postavíme kolem.
const tichaHra = (zbrane) => {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = zbrane;
  h.doSpawnu = Infinity;
  h.doBedny = Infinity;
  return h;
};
const bedna = (h, x, y, druh = 'bedna') => {
  const b = { druh, x, y, rozbita: false };
  h.bedny.push(b);
  return b;
};
const korist = (h) => Object.values(h.zBeden).reduce((a, b) => a + b, 0);
// Každá zbraň rozbije bednu, na kterou dosáhne. Bedna daleko (500 px) zůstane celá.
const dosahLucerny1 = staty(novaHra(vytvorRng(seminko), 'svetlonos')).lucerna.dosah;
const kdeBedna = {
  jiskra: [150, 0], lucerna: [dosahLucerny1 - 10, 0], krumpace: [64, 0], blesk: [200, 0], trny: [150, 0], zrcadlo: [34, 0],
  svetlusky: [150, 0], mraz: [150, 0], zvon: [80, 0], cep: [52, 0], seminka: [40, 0], korene: [150, 0], stopa: [16, 0],
  prak: [150, 0],
};
const rozbiteZbrani = {};
for (const id of Object.keys(ZBRANE)) {
  const h = tichaHra({ [id]: { uroven: 1, nabiti: 0 } });
  const blizka = bedna(h, ...kdeBedna[id]);
  const daleka = bedna(h, 0, 500, 'sud');
  let za = null;
  for (let t = 0; t < 3 && za === null; t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (blizka.rozbita) za = h.cas;
  }
  rozbiteZbrani[id] = za === null ? null : Math.round(za * 100) / 100;
  if (!blizka.rozbita || h.bedny.includes(blizka)) chybyBeden.push(`${id} nerozbila bednu`);
  if (daleka.rozbita || !h.bedny.includes(daleka)) chybyBeden.push(`${id} rozbila bednu 500 px daleko`);
  if (h.rozbitoBeden !== 1 || korist(h) !== 1) chybyBeden.push(`${id}: rozbito ${h.rozbitoBeden}, kořisti ${korist(h)}`);
  // Co padlo hrdinovi pod nohy (Ohnivá stopa), to sebral rovnou: krystal, zlaťák.
  const naZemi = h.krystaly.length + h.predmety.length + (h.hrdina.xp > 0 || h.hrdina.uroven > 1 || h.zlataky > 0 ? 1 : 0);
  if (naZemi < 1) chybyBeden.push(`${id}: z bedny nic nevypadlo`);
  if (!h.castice.length) chybyBeden.push(`${id}: bedna se rozbila bez třísek`);
}
// Jiskra míří na bednu, jen když není blíž nepřítel: nepřítel blíž než bedna dostane ránu první.
const prednost = tichaHra({ jiskra: { uroven: 1, nabiti: 0 } });
const zaNepritelem = bedna(prednost, 200, 0);
const blizkyNepritel = pridejNepritele(prednost, 'kostlivec', 0, 120);
blizkyNepritel.rychlost = 0;
aktualizuj(prednost, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (!(prednost.strely[0]?.vy > 0) || zaNepritelem.rozbita) chybyBeden.push('jiskra střílí na bednu, i když je nepřítel blíž');
const mimoDosah = tichaHra({ jiskra: { uroven: 1, nabiti: 0 } });
bedna(mimoDosah, JISKRA_NA_BEDNU + 40, 0);
aktualizuj(mimoDosah, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (mimoDosah.strely.length) chybyBeden.push('jiskra střílí na bednu za dosahem');
// Krystal z bedny je bohatší než z netopýra.
if (!(xpZBedny(novaHra(vytvorRng(seminko))) > 1)) chybyBeden.push('krystal z bedny nedá víc než netopýr');
// Bomba pod nohama: nepřátelé na obrazovce padnou hned (s krystaly), Strážce, schovaný duch a nepřítel
// za okrajem obrazovky zůstanou.
const bum = tichaHra({});
bum.hrdina.nezranitelny = 10;
const naObrazovce = [pridejNepritele(bum, 'netopyr', 300, 100), pridejNepritele(bum, 'kostlivec', -500, -300)];
const strazce = pridejNepritele(bum, 'strazce', -200, 0);
const schovany = pridejNepritele(bum, 'duch', 250, -150);
Object.assign(schovany, { skryty: true, duchCas: SKRYTY_DUCH });
const zaOkrajem = pridejNepritele(bum, 'netopyr', SIRKA / 2 + 100, 0);
for (const n of bum.nepratele) n.rychlost = 0;
bum.predmety.push({ druh: 'bomba', x: 0, y: 0 });
aktualizuj(bum, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (naObrazovce.some((n) => bum.nepratele.includes(n)) || bum.zabito !== 2) chybyBeden.push(`bomba nesložila nepřátele na obrazovce (zabito ${bum.zabito})`);
if (bum.krystaly.length < 2) chybyBeden.push('z nepřátel po bombě nevypadly krystaly');
if (!bum.nepratele.includes(strazce) || strazce.hp !== strazce.maxHp) chybyBeden.push('bomba ublížila Strážci');
if (!bum.nepratele.includes(schovany) || schovany.hp !== schovany.maxHp) chybyBeden.push('bomba našla schovaného ducha');
if (!bum.nepratele.includes(zaOkrajem)) chybyBeden.push('bomba zabila nepřítele mimo obrazovku');
if (bum.bomb !== 1 || !(bum.vybuch > 0 && bum.vybuch <= TRVANI_VYBUCHU) || bum.predmety.some((p) => p.druh === 'bomba')) chybyBeden.push('bomba nevybuchla jednou');
for (let t = 0; t < TRVANI_VYBUCHU + 0.1; t += DT) aktualizuj(bum, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (bum.vybuch !== 0) chybyBeden.push('výbuch na obrazovce nezhasl');
// Zlaťák pod nohama (i hromádka z elity) se přičte a zapíše, odkud je. Po hře je z každých 5 duše.
const zlato = tichaHra({});
zlato.predmety.push({ druh: 'zlatak', x: 0, y: 0 }, { druh: 'zlatak', x: 5, y: 0, hodnota: ELITA.zlataky, z: 'elity' });
aktualizuj(zlato, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (zlato.zlataky !== 1 + ELITA.zlataky || zlato.predmety.length || zlato.zlatakyZ.elity !== ELITA.zlataky || zlato.zlatakyZ.bedny !== 1
  || dusZaHru(zlato).zlataky !== Math.floor((1 + ELITA.zlataky) / DUSE_ZA.zlataku)) chybyBeden.push(`zlaťáky: ${zlato.zlataky}`);
// Hrdina stojí minutu bez nepřátel: bedny přibývají jen mimo obrazovku až do 12. Po skoku daleko staré zmizí.
const louka = tichaHra({});
louka.doBedny = 0;
let nejvic = 0;
for (let t = 0; t < 60; t += DT) {
  aktualizuj(louka, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  nejvic = Math.max(nejvic, louka.bedny.length);
  if (louka.bedny.some((b) => !mimoObrazovku(b, louka.hrdina))) { chybyBeden.push('bedna na obrazovce u stojícího hrdiny'); break; }
}
if (nejvic !== MAX_BEDEN || louka.bedny.length !== MAX_BEDEN) chybyBeden.push(`u stojícího hrdiny ${louka.bedny.length} beden (nejvíc ${nejvic})`);
const stare = [...louka.bedny];
louka.hrdina.x += 5000;
aktualizuj(louka, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
if (stare.some((b) => louka.bedny.includes(b))) chybyBeden.push('bedny daleko za hrdinou nezmizely');
// Hlavní hra: bedny se objevovaly, rozbíjely a kořist sedí s počtem rozbitých.
if (maxBeden > MAX_BEDEN) chybyBeden.push(`beden naráz ${maxBeden}`);
if (hra.beden === 0 || (hra.cas > 120 && hra.rozbitoBeden === 0)) chybyBeden.push(`v hlavní hře objeveno ${hra.beden} beden, rozbito ${hra.rozbitoBeden}`);
if (korist(hra) !== hra.rozbitoBeden) chybyBeden.push(`kořisti ${korist(hra)}, rozbito ${hra.rozbitoBeden}`);

// Bossové. Přišli v hlavní hře ve správném pořadí a čase (po 3 minutách)?
prisliBossove.forEach((b, i) => {
  if (b.druh !== PORADI_BOSSU[i % PORADI_BOSSU.length] || Math.abs(b.s - (i + 1) * 180) > 1) chybyBossu.push(`${i + 1}. boss ${b.druh} v ${b.s} s`);
});
if (prisliBossove.length !== Math.floor(hra.cas / 180)) chybyBossu.push(`za ${Math.round(hra.cas)} s přišlo ${prisliBossove.length} bossů`);
if (maxPavoucku > MAX_PAVOUCKU) chybyBossu.push(`pavoučků naráz ${maxPavoucku}`);
// Každý má jiný nápis a vlastní sprite aspoň 16×16 (čtverec).
const prichody = PORADI_BOSSU.map((id) => BOSSOVE[id].prichod);
if (new Set(prichody).size !== PORADI_BOSSU.length) chybyBossu.push('dva bossové mají stejný nápis');
const textSpritu = readFileSync(new URL('../src/sprity.js', import.meta.url), 'utf8');
for (const id of [...PORADI_BOSSU, 'pavoucek', 'kamen']) {
  const blok = textSpritu.match(new RegExp(`^ {2}${id}: \\[\\n([\\s\\S]*?)\\n {2}\\],`, 'm'));
  const radky = blok ? [...blok[1].matchAll(/'([^']*)'/g)].map((m) => m[1]) : [];
  const ctverec = radky.length > 0 && radky.every((r) => r.length === radky.length);
  if (!ctverec || (PORADI_BOSSU.includes(id) && radky.length < 16)) chybyBossu.push(`sprite ${id} je ${radky[0]?.length}×${radky.length}`);
}
// Bossové zblízka: hrdina stojí sám bez zbraní (žádné vlny, bedny ani další bossové), boss se nehýbe.
const bossZblizka = (druh, x, y) => {
  const h = tichaHra({});
  h.dalsiBoss = Infinity;
  h.dalsiSmecka = Infinity;
  const b = pridejNepritele(h, druh, x, y);
  b.rychlost = 0;
  return [h, b];
};
// Boss zblízka, který hned v příštím snímku začne danou schopnost (pořadí se nastaví na ni).
const sSchopnosti = (druh, id, x, y) => {
  const [h, b] = bossZblizka(druh, x, y);
  b.dalsiSchopnost = schopnostiBosse(druh).findIndex((s) => s.id === id);
  b.doSchopnosti = DT / 2;
  return [h, b, schopnostiBosse(druh)[b.dalsiSchopnost]];
};
// Hraje, dokud boss nezačne (a pak neskončí) schopnost. Vrací, kolik s to trvalo.
const dokudVaruje = (h, b, kazdyKrok = () => {}) => {
  let t = 0;
  for (; t < 5 && !(b.schopnost?.faze === 'provadi') && (b.schopnost || t < DT * 2); t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (b.schopnost?.faze === 'varovani') kazdyKrok(h);
  }
  return t;
};
const schopnostiPokusy = {};
// Data: každý boss má 2–3 známé schopnosti, každá s varováním kolem 0,8 s. Všechny čtyři hlavní schopnosti
// (dupnutí, hod, výpad, vyvolání) má aspoň jeden boss, hozené věci mají sprite a pomocníci jsou známí nepřátelé.
for (const id of PORADI_BOSSU) {
  const seznam = schopnostiBosse(id);
  if (seznam.length < 2 || seznam.length > 3) chybyBossu.push(`${id} má ${seznam.length} schopností`);
  if (!(BOSSOVE[id].pauza > 0)) chybyBossu.push(`${id} nemá pauzu mezi schopnostmi`);
  for (const s of seznam) {
    if (!Object.hasOwn(SCHOPNOSTI, s.id)) chybyBossu.push(`${id} má neznámou schopnost ${s.id}`);
    if (!(s.varovani >= 0.7 && s.varovani <= 1)) chybyBossu.push(`${id}: ${s.id} varuje ${s.varovani} s`);
    if (s.id === 'hod' && !jmenaSpritu.has(s.strela)) chybyBossu.push(`${id} hází ${s.strela} bez spritu`);
    if (s.id === 'vyvolani' && (!Object.hasOwn(RYCHLOST_NEPRATEL, s.druh) || s.max < s.pocet[1])) chybyBossu.push(`${id} vyvolá ${s.druh}`);
  }
}
for (const id of ['dupnuti', 'hod', 'vypad', 'vyvolani']) {
  if (!PORADI_BOSSU.some((b) => schopnostiBosse(b).some((s) => s.id === id))) chybyBossu.push(`schopnost ${id} nemá žádný boss`);
}
// Dupnutí (Strážce i Obr): při varování boss stojí a nic se neděje, pak vlna. Kdo je v kruhu, dostane ránu jednou,
// odletí o odhození a obrazovka se otřese víc než po obyčejném zásahu. Kousek za kruhem vlna netrefí.
for (const druh of ['strazce', 'obr']) {
  for (const uvnitr of [true, false]) {
    const s0 = schopnostiBosse(druh).find((s) => s.id === 'dupnuti');
    const [h, b, s] = sSchopnosti(druh, 'dupnuti', uvnitr ? 100 : s0.polomer + 40, 0);
    const kde = { x: b.x, y: b.y };
    let vlnaPriVarovani = false;
    const varovani = dokudVaruje(h, b, () => { if (h.vlny.length || h.hrdina.hp < h.hrdina.maxHp) vlnaPriVarovani = true; });
    if (vlnaPriVarovani || b.x !== kde.x || b.y !== kde.y) chybyBossu.push(`${druh}: dupnutí při varování`);
    if (Math.abs(varovani - s.varovani) > 2 * DT) chybyBossu.push(`${druh}: dupnutí varovalo ${varovani.toFixed(2)} s`);
    if (h.vlny.length !== 1 || !(h.tres > TRVANI_TRESU)) chybyBossu.push(`${druh}: po dupnutí ${h.vlny.length} vln, třes ${h.tres}`);
    hraj(h, 1.2);
    const odstup = Math.hypot(h.hrdina.x - b.x, h.hrdina.y - b.y);
    if (uvnitr) {
      if (h.zasahyBossu.dupnuti !== 1 || h.hrdina.hp !== h.hrdina.maxHp - s.poskozeni) chybyBossu.push(`${druh}: dupnutí v kruhu ${h.hrdina.hp} životů`);
      if (Math.abs(odstup - (100 + s.odhozeni)) > 1) chybyBossu.push(`${druh}: dupnutí odhodilo na ${odstup.toFixed(1)} px`);
      schopnostiPokusy[`${druh}_dupnuti`] = { varovani_s: +varovani.toFixed(2), rana: s.poskozeni, odhozen_na_px: Math.round(odstup) };
    } else if (h.hrdina.hp !== h.hrdina.maxHp) chybyBossu.push(`${druh}: dupnutí trefilo hrdinu za kruhem`);
  }
}
// Hod (Obr kameny, Matka kokony): po varování 3–5 kusů kolem hrdiny, stín je vidět celý let. Stojícího trefí jen
// jednou (po zásahu chvíle bez zranění), po dopadu vybuchnou. Kokon zalepí sítí. Kdo po hodu uteče, toho minou.
for (const druh of ['obr', 'matka']) {
  for (const utece of [false, true]) {
    const [h, b, s] = sSchopnosti(druh, 'hod', 300, 0);
    dokudVaruje(h, b);
    const kameny = [...h.kameny];
    const daleko = Math.max(...kameny.map((k) => Math.hypot(k.x - h.hrdina.x, k.y - h.hrdina.y)));
    if (kameny.length < s.pocet[0] || kameny.length > s.pocet[1] || daleko > s.rozptyl + 1) chybyBossu.push(`${druh}: hod ${kameny.length} kusů až ${daleko.toFixed(0)} px od hrdiny`);
    if (kameny.some((k) => k.druh !== s.strela || k.trvani !== s.let)) chybyBossu.push(`${druh}: hod hází něco jiného`);
    let dopadu = 0;
    const videne = new WeakSet();
    for (let t = 0; t < s.let + 0.6; t += DT) {
      aktualizuj(h, DT, utece ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }, SIRKA, VYSKA);
      for (const d of h.dopady) if (!videne.has(d)) { videne.add(d); dopadu += 1; }
      if (h.hrdina.sit === TRVANI_SITE && !s.sit) chybyBossu.push(`${druh}: kámen zalepil sítí`);
    }
    if (dopadu !== kameny.length || h.kameny.length) chybyBossu.push(`${druh}: dopadlo ${dopadu} z ${kameny.length}`);
    const zasahu = h.zasahyBossu.hod;
    if (zasahu !== (utece ? 0 : 1)) chybyBossu.push(`${druh}: hod do hrdiny, který ${utece ? 'uteče' : 'stojí'}: ${zasahu} zásahů`);
    if (!utece && (h.hrdina.hp !== h.hrdina.maxHp - s.poskozeni || (s.sit && !(h.hrdina.sit > 0)))) chybyBossu.push(`${druh}: hod vzal ${h.hrdina.maxHp - h.hrdina.hp}`);
    if (!utece) schopnostiPokusy[`${druh}_hod`] = { kusu: kameny.length, rana: s.poskozeni, sit: s.sit };
  }
}
// Kámen míří tam, kam hrdina běží (stojícímu pod nohy).
{
  const [h, b] = sSchopnosti('obr', 'hod', 300, 0);
  for (let t = 0; t < 2 && !h.kameny.length; t += DT) aktualizuj(h, DT, { dx: 0, dy: 1 }, SIRKA, VYSKA);
  if (!(h.kameny[0]?.y > h.hrdina.y + 30)) chybyBossu.push('hod nemíří tam, kam hrdina běží');
  if (b.schopnost) chybyBossu.push('hod po vyhození neskončil');
}
// Výpad (Strážce, Matka): při varování boss stojí a míří na hrdinu, posledních zamek s už ne. Pak proběhne rovně
// celou délku a stojícího trefí jednou a odhodí stranou. Kdo po zamčení uhne kolmo, toho mine.
for (const druh of ['strazce', 'matka']) {
  for (const uhne of [false, true]) {
    const [h, b, s] = sSchopnosti(druh, 'vypad', 300, 0);
    const kde = { x: b.x, y: b.y };
    let t = 0;
    let smerPredZamcenim = null;
    for (; t < 3 && b.schopnost?.faze !== 'provadi'; t += DT) {
      const zamceno = b.schopnost && b.schopnost.zbyva <= s.zamek;
      // Před zamčením hrdina kousek ustoupí nahoru (míření ho musí sledovat), po zamčení stojí nebo uhýbá dolů.
      aktualizuj(h, DT, zamceno ? (uhne ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }) : { dx: 0, dy: b.schopnost ? -1 : 0 }, SIRKA, VYSKA);
      if (b.schopnost && b.schopnost.zbyva > s.zamek) smerPredZamcenim = { ux: b.schopnost.ux, uy: b.schopnost.uy };
      if (b.schopnost?.faze === 'varovani' && (b.x !== kde.x || b.y !== kde.y || h.hrdina.hp < h.hrdina.maxHp)) chybyBossu.push(`${druh}: výpad při varování`);
    }
    const sch = b.schopnost;
    if (!sch || !smerPredZamcenim) {
      chybyBossu.push(`${druh}: výpad nezačal`);
      continue;
    }
    if (!(smerPredZamcenim.uy < 0)) chybyBossu.push(`${druh}: výpad nesleduje hrdinu`);
    const dalsi = { ux: sch.ux, uy: sch.uy };
    for (let k = 0; k < 3 && b.schopnost; k++) aktualizuj(h, DT, uhne ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }, SIRKA, VYSKA);
    for (let k = 0; k < 2 / DT && b.schopnost; k++) aktualizuj(h, DT, uhne ? { dx: 0, dy: 1 } : { dx: 0, dy: 0 }, SIRKA, VYSKA);
    const ujel = Math.hypot(b.x - kde.x, b.y - kde.y);
    if (Math.abs(ujel - s.delka) > 1 || b.schopnost) chybyBossu.push(`${druh}: výpad ujel ${ujel.toFixed(0)} px`);
    if (Math.abs(dalsi.ux - smerPredZamcenim.ux) > 0.2) chybyBossu.push(`${druh}: výpad divně zamířil`);
    if (h.zasahyBossu.vypad !== (uhne ? 0 : 1)) chybyBossu.push(`${druh}: výpad do hrdiny, který ${uhne ? 'uhne' : 'stojí'}: ${h.zasahyBossu.vypad}`);
    if (!uhne) {
      if (h.hrdina.hp !== h.hrdina.maxHp - s.poskozeni) chybyBossu.push(`${druh}: výpad vzal ${h.hrdina.maxHp - h.hrdina.hp}`);
      schopnostiPokusy[`${druh}_vypad`] = { rana: s.poskozeni, ujel_px: Math.round(ujel), odhozen_stranou_px: Math.round(Math.abs(h.hrdina.y)) };
    }
  }
}
// Vyvolání (Strážce kostlivci, Matka pavoučci, Bludička duchové): při varování kruhy, ale nikdo nový. Po něm
// tolik pomocníků, kolik bylo kruhů (6–8), na jejich místech. Nikdy jich nežije víc než max a s plnou loukou boss
// vezme jinou schopnost.
for (const druh of ['strazce', 'matka', 'bludicka']) {
  const [h, b, s] = sSchopnosti(druh, 'vyvolani', 150, 0);
  h.hrdina.nezranitelny = Infinity;
  const pomocnici = () => h.nepratele.filter((n) => n.pan === b);
  let behem = false;
  let mista = [];
  dokudVaruje(h, b, () => {
    if (pomocnici().length) behem = true;
    mista = b.schopnost.mista;
  });
  if (behem) chybyBossu.push(`${druh}: pomocníci před koncem varování`);
  if (mista.length < s.pocet[0] || mista.length > s.pocet[1]) chybyBossu.push(`${druh}: ${mista.length} kruhů vyvolání`);
  const prvni = pomocnici();
  if (prvni.length !== mista.length || prvni.some((n) => n.druh !== s.druh) || !mista.every((m) => prvni.some((n) => Math.hypot(n.x - m.x, n.y - m.y) < 30))) {
    chybyBossu.push(`${druh}: vyvolal ${prvni.length} (${prvni.map((n) => n.druh)})`);
  }
  if (s.vyrazi && !prvni.every((n) => n.vyrazi > 0)) chybyBossu.push(`${druh}: pomocníci nevyrazili`);
  let nejvic = 0;
  const pred = { ...h.schopnostiPouzito };
  hraj(h, 60, () => { nejvic = Math.max(nejvic, h.nepratele.filter((n) => n.pan && n.druh === s.druh).length); });
  if (nejvic > s.max) chybyBossu.push(`${druh}: pomocníků naráz ${nejvic} (max ${s.max})`);
  const jine = schopnostiBosse(druh).filter((x) => x.id !== 'vyvolani').every((x) => h.schopnostiPouzito[x.id] > (pred[x.id] ?? 0));
  if (!jine) chybyBossu.push(`${druh}: s plnou loukou nepoužil jiné schopnosti`);
  schopnostiPokusy[`${druh}_vyvolani`] = { druh: s.druh, poprve: prvni.length, nejvic_naraz: nejvic };
}
// Matka: pavoučci po vylezení vyrazí rychleji a za chvíli zpomalí.
{
  const [h, b] = sSchopnosti('matka', 'vyvolani', 150, 0);
  h.hrdina.nezranitelny = Infinity;
  for (let t = 0; t < 3 && !h.nepratele.some((n) => n.pan === b); t += DT) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  hraj(h, VYRAZENI_PAVOUCKU + DT);
  if (h.nepratele.some((n) => n.pan === b && n.vyrazi > 0) || !(RYCHLOST_VYRAZENI > 1)) chybyBossu.push('pavoučci nepřestali vyrážet');
}
// Bludička: Vějíř ji přenese k hrdinovi, chvíli se nabíjí (stojí), vystřelí vějíř a za chvíli druhý, prostřední
// střela stojícího trefí.
{
  const [h, b, s] = sSchopnosti('bludicka', 'vejir', 500, 0);
  b.rychlost = 40;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const d = Math.hypot(b.x - h.hrdina.x, b.y - h.hrdina.y);
  if (!(d >= 120 && d <= 221) || b.schopnost?.faze !== 'varovani') chybyBossu.push(`Bludička se přenesla na ${d.toFixed(0)} px`);
  const kde = { x: b.x, y: b.y };
  hraj(h, s.varovani - 3 * DT);
  if (b.x !== kde.x || b.y !== kde.y || h.strelyBossu.length) chybyBossu.push('Bludička se při nabíjení hýbe nebo střílí');
  hraj(h, 3 * DT);
  if (h.strelyBossu.length !== s.strel) chybyBossu.push(`Bludička vystřelila ${h.strelyBossu.length} střel`);
  hraj(h, s.mezi);
  if (h.strelyBossu.length !== s.strel * s.salv || b.schopnost) chybyBossu.push(`Bludička po salvách: ${h.strelyBossu.length} střel`);
  hraj(h, 1.6);
  if (h.zasahyBossu.vejir < 1 || (h.hrdina.maxHp - h.hrdina.hp) % s.poskozeni !== 0) chybyBossu.push(`střely Bludičky: ${h.zasahyBossu.vejir} zásahů, ${h.hrdina.hp} životů`);
}
// Střídání: první schopnost chvíli po příchodu, pak dokola v pořadí. Pod polovinou životů boss zuří (jednou
// ohlásí) a mezi schopnostmi čeká kratší pauzu, takže jich stihne víc.
for (const druh of PORADI_BOSSU) {
  const pokus = (podil) => {
    const [h, b] = bossZblizka(druh, 120, 0);
    h.hrdina.nezranitelny = Infinity;
    b.hp = Math.round(b.maxHp * podil);
    const zacatky = [];
    const pauzy = [];
    let byla = null;
    let zuri = 0;
    hraj(h, 40, () => {
      if (b.schopnost && b.schopnost !== byla) zacatky.push({ id: b.schopnost.id, s: h.cas });
      if (byla && !b.schopnost) pauzy.push(b.doSchopnosti);
      byla = b.schopnost;
      if (h.oznameni?.text?.endsWith('zuří')) zuri += 1;
      // Pomocníci by louku zaplnili a vyvolání by se přeskakovalo, tak hned zmizí. Hrdina i boss (mimo schopnost)
      // zůstávají na svých místech, ať je každá schopnost v dosahu.
      h.nepratele = h.nepratele.filter((n) => !n.pan);
      Object.assign(h.hrdina, { x: 0, y: 0, odhozen: 0 });
      if (!b.schopnost) Object.assign(b, { x: 120, y: 0 });
    });
    return { zacatky, pauzy, zuri, b };
  };
  const plny = pokus(1);
  const zrany = pokus(ZURIVOST - 0.1);
  const seznam = schopnostiBosse(druh).map((s) => s.id);
  const poradi = plny.zacatky.slice(0, seznam.length * 2).map((z) => z.id);
  if (Math.abs((plny.zacatky[0]?.s ?? 0) - PRVNI_SCHOPNOST) > 2 * DT) chybyBossu.push(`${druh}: první schopnost v ${plny.zacatky[0]?.s}`);
  if (poradi.join() !== [...seznam, ...seznam].slice(0, poradi.length).join() || poradi.length < seznam.length * 2) chybyBossu.push(`${druh} střídá ${poradi}`);
  if (plny.pauzy.some((p) => Math.abs(p - BOSSOVE[druh].pauza) > 1e-9) || plny.b.zuri || plny.zuri) chybyBossu.push(`${druh}: pauzy s plnými životy ${plny.pauzy}`);
  if (zrany.pauzy.some((p) => Math.abs(p - BOSSOVE[druh].pauza * ZRYCHLENI_ZURIVOSTI) > 1e-9) || !zrany.b.zuri) chybyBossu.push(`${druh}: zuřící pauzy ${zrany.pauzy}`);
  if (!(zrany.zacatky.length > plny.zacatky.length)) chybyBossu.push(`${druh}: zuřící ${zrany.zacatky.length} schopností, klidný ${plny.zacatky.length}`);
  schopnostiPokusy[`${druh}_za_40_s`] = { klidny: plny.zacatky.length, zurici: zrany.zacatky.length };
}
// Boss umí ublížit: hrdina bez zbraní stojí 150 px od bosse, který nechodí, a schopnosti ho za 30 s trefí.
for (const druh of PORADI_BOSSU) {
  const [h] = bossZblizka(druh, 150, 0);
  hraj(h, 30);
  const zasahu = Object.values(h.zasahyBossu).reduce((a, c) => a + c, 0);
  if (!(zasahu > 0) || !(h.hrdina.hp < h.hrdina.maxHp)) chybyBossu.push(`${druh} stojícího hrdinu za 30 s netrefil`);
  schopnostiPokusy[`${druh}_stojici_30_s`] = { zasahu, ztraceno: Math.round(h.hrdina.maxHp - Math.max(0, h.hrdina.hp)), padl: h.konec };
}
// Zuřivost se ohlásí jednou, až životy klesnou pod polovinu.
{
  const [h, b] = bossZblizka('obr', 400, 0);
  h.hrdina.nezranitelny = Infinity;
  hraj(h, 1);
  if (b.zuri) chybyBossu.push('obr zuří s plnými životy');
  b.hp = Math.floor(b.maxHp * ZURIVOST) - 1;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (!b.zuri || h.oznameni?.text !== `${BOSSOVE.obr.nazev} zuří`) chybyBossu.push(`zuřivost bez ohlášení (${h.oznameni?.text})`);
}
// Dvě kola bossů: pořadí a nápisy, osm pruhů. Po zabití druhého pruh zmizí a truhla ví, od koho je.
{
  const h = tichaHra({});
  h.hrdina.nezranitelny = Infinity;
  h.dalsiSmecka = Infinity;
  h.dalsiPrichod = Infinity;
  const druhy = [];
  for (let i = 0; i < PORADI_BOSSU.length * 2; i++) {
    h.cas = h.dalsiBoss - DT / 2;
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    const novy = h.nepratele.filter((n) => n.boss).at(-1);
    druhy.push(novy?.druh);
    if (h.oznameni?.text !== BOSSOVE[novy?.druh]?.prichod) chybyBossu.push(`${novy?.druh} bez svého nápisu`);
  }
  if (druhy.join() !== [...PORADI_BOSSU, ...PORADI_BOSSU].join()) chybyBossu.push(`bossové šli v pořadí ${druhy}`);
  const bary = bossBary(h);
  if (bary.map((b) => b.druh).join() !== druhy.join()) chybyBossu.push(`pruhů ${bary.length}: ${bary.map((b) => b.druh)}`);
  const druhy2 = h.nepratele.filter((n) => n.boss)[1];
  druhy2.hp = 0;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (bossBary(h).length !== druhy.length - 1 || bossBary(h).some((b) => b.nepritel === druhy2)) chybyBossu.push('pruh zabitého bosse nezmizel');
  const truhla = h.predmety.find((p) => p.druh === 'truhla');
  if (truhla?.od !== druhy2.druh) chybyBossu.push(`truhla po ${druhy2.druh} je od ${truhla?.od}`);
  Object.assign(truhla ?? {}, { x: h.hrdina.x, y: h.hrdina.y });
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  for (let t = 0; t < TRVANI_OTEVRENI + 0.1 && h.otevira; t += DT) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.nalezy.at(-1)?.boss !== druhy2.druh) chybyBossu.push(`truhla po ${druhy2.druh} dala kus od ${h.nalezy.at(-1)?.boss}`);
  if (!h.zTruhly || h.truhlaOd !== druhy2.druh || h.volby?.some((v) => v.rarita === 'bezna')) chybyBossu.push('truhla bosse neotevřela výběr');
  if (h.zabitoBossu !== 1 || dusZaHru(h).strazci !== DUSE_ZA.strazce) chybyBossu.push('zabitý boss nedal duše');
}
// Bomba žádnému bossovi neublíží.
{
  const h = tichaHra({});
  h.hrdina.nezranitelny = 10;
  const bossove = PORADI_BOSSU.map((id, i) => pridejNepritele(h, id, 120 * Math.cos(i * 1.6) + 200, 120 * Math.sin(i * 1.6)));
  h.predmety.push({ druh: 'bomba', x: 0, y: 0 });
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (bossove.some((b) => !h.nepratele.includes(b) || b.hp !== b.maxHp)) chybyBossu.push('bomba ublížila bossovi');
}
// Souboj s každým bossem zvlášť, hrdina ve 3. minutě (Jiskra 3, Blesk 2, Krumpáče 2) a bot hraje jako vždycky.
// Sám na sám s uhýbáním: musí ho porazit do 90 s a přežít (boss je porazitelný). Sám na sám bez uhýbání: schopnosti
// ho trefí víckrát než uhýbajícího. Uprostřed vln, 60 s s uhýbáním
// a bez něj: kolikrát ho schopnosti trefí a kolik životů hrdina ztratí (na vyvážení). Ve vlnách i sám na sám musí
// schopnosti všech bossů dohromady trefit neuhýbajícího víckrát než uhýbajícího.
const souboje = {};
const souboj = (druh, { uhyba = true, vlny = false, sekund = 90 } = {}) => {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = { jiskra: { uroven: 3, nabiti: 0 }, blesk: { uroven: 2, nabiti: 0 }, krumpace: { uroven: 2, nabiti: 0 } };
  h.cas = 180;
  h.dalsiBoss = Infinity;
  h.dalsiSmecka = Infinity;
  h.dalsiPrichod = Infinity;
  if (!vlny) { h.doSpawnu = Infinity; h.doBedny = Infinity; }
  const b = pridejNepritele(h, druh, 320, 0);
  let zurilOd = null;
  for (let t = 0; t < sekund && (vlny || h.nepratele.includes(b)) && !h.konec; t += DT) {
    aktualizuj(h, DT, rozhodni(h, t, uhyba), SIRKA, VYSKA);
    obsluz(h);
    if (b.zuri && zurilOd === null) zurilOd = Math.round(h.cas - 180);
  }
  const zasahy = Object.fromEntries(Object.entries(h.zasahyBossu).filter(([, v]) => v));
  return {
    porazen: !h.nepratele.includes(b), konec: h.konec, zbyva: b.hp, za_s: Math.round(h.cas - 180), zuril_od_s: zurilOd,
    ztraceno: Math.round(h.hrdina.maxHp - Math.max(0, h.hrdina.hp)), utokem: Object.values(h.zasahyBossu).reduce((a, c) => a + c, 0),
    zasahy, pouzil: { ...h.schopnostiPouzito },
  };
};
const soucet = { samUhyba: 0, samNeuhyba: 0, vlnyUhyba: 0, vlnyNeuhyba: 0, samUhybaS: 0, samNeuhybaS: 0, vlnyUhybaS: 0, vlnyNeuhybaS: 0 };
for (const druh of PORADI_BOSSU) {
  const sam = souboj(druh);
  const samNe = souboj(druh, { uhyba: false });
  const uhyba = souboj(druh, { vlny: true, sekund: 60 });
  const neuhyba = souboj(druh, { vlny: true, sekund: 60, uhyba: false });
  soucet.samUhyba += sam.utokem;
  soucet.samNeuhyba += samNe.utokem;
  soucet.vlnyUhyba += uhyba.utokem;
  soucet.vlnyNeuhyba += neuhyba.utokem;
  soucet.samUhybaS += Math.max(1, sam.za_s);
  soucet.samNeuhybaS += Math.max(1, samNe.za_s);
  soucet.vlnyUhybaS += Math.max(1, uhyba.za_s);
  soucet.vlnyNeuhybaS += Math.max(1, neuhyba.za_s);
  const shrn = (v) => ({ porazen: v.porazen, za_s: v.za_s, padl: v.konec, ztraceno_zivotu: v.ztraceno, zasahu_schopnostmi: v.utokem, zasahy: v.zasahy });
  souboje[druh] = {
    sam_porazen_za_s: sam.porazen ? sam.za_s : null,
    sam_uhyba: { ...shrn(sam), zuril_od_s: sam.zuril_od_s, pouzil: sam.pouzil },
    sam_neuhyba: shrn(samNe),
    ve_vlnach_60_s: { uhyba: shrn(uhyba), neuhyba: shrn(neuhyba) },
  };
  if (!sam.porazen || sam.konec) chybyBossu.push(`${druh} se sám na sám nedal porazit za 90 s (${sam.konec ? 'hrdina padl' : `zbývá ${sam.zbyva}`})`);
}
// Porovnávají se zásahy za sekundu souboje: kdo neuhýbá, padne nebo bosse složí dřív a na další zásahy už nezbude
// čas (ve vlnách to při malých počtech přehodilo i jiné složení karet).
const zaSekundu = (zasahu, sekund) => zasahu / Math.max(1, sekund);
if (!(zaSekundu(soucet.samNeuhyba, soucet.samNeuhybaS) > zaSekundu(soucet.samUhyba, soucet.samUhybaS))) chybyBossu.push(`sám na sám schopnosti trefí neuhýbajícího ${soucet.samNeuhyba}× za ${soucet.samNeuhybaS} s, uhýbajícího ${soucet.samUhyba}× za ${soucet.samUhybaS} s`);
if (!(zaSekundu(soucet.vlnyNeuhyba, soucet.vlnyNeuhybaS) > zaSekundu(soucet.vlnyUhyba, soucet.vlnyUhybaS))) chybyBossu.push(`ve vlnách schopnosti trefí neuhýbajícího ${soucet.vlnyNeuhyba}× za ${soucet.vlnyNeuhybaS} s, uhýbajícího ${soucet.vlnyUhyba}× za ${soucet.vlnyUhybaS} s`);

// Trnová past a Zrcadlový štít zblízka. Hrdina stojí sám (bez vln, beden a bossů).
const chybyZbrani = [];
for (const [id, z] of Object.entries(ZBRANE)) {
  if (z.popis.length !== ZAKLAD_UROVNI || !z.popis.every((r) => typeof r === 'string' && r)) chybyZbrani.push(`${id} nemá ${ZAKLAD_UROVNI} řádků popisu`);
  if (!jmenaSpritu.has(z.ikona)) chybyZbrani.push(`${id} nemá sprite ikony ${z.ikona}`);
}
const samotny = (zbrane) => {
  const h = tichaHra(zbrane);
  h.dalsiBoss = Infinity;
  h.dalsiSmecka = Infinity;
  h.dalsiPrichod = Infinity;
  return h;
};
const krok = (h) => {
  const x = h.nepratele.map((n) => [n, n.x, n.y]);
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  return new Map(x.map(([n, x0, y0]) => [n, Math.hypot(n.x - x0, n.y - y0)]));
};
const trnovePokusy = {};
// Kostlivec jde k hrdinovi: trs vyraší pod ním, roste (nezraní), pak zraňuje a zpomalí, mimo trs zpomalení dozní.
{
  const h = samotny({ trny: { uroven: 1, nabiti: 0 } });
  const st = staty(h).trny;
  const kost = pridejNepritele(h, 'kostlivec', 150, 0);
  krok(h);
  const trs = h.trny[0];
  if (h.trny.length !== 1 || trs.x !== kost.x || trs.y !== kost.y) chybyZbrani.push(`trs nevyrašil pod nepřítelem (${h.trny.length} trsů)`);
  hraj(h, RUST_TRNU - 2 * DT);
  if (kost.hp !== kost.maxHp || kost.trny > 0) chybyZbrani.push('trs zraňuje nebo zpomaluje, i když teprve roste');
  hraj(h, 3 * DT);
  if (!(kost.hp < kost.maxHp) || !(kost.trny > 0)) chybyZbrani.push(`dorostlý trs nezranil nebo nezpomalil (${kost.hp}/${kost.maxHp})`);
  const vTrni = krok(h).get(kost);
  if (Math.abs(vTrni - kost.rychlost * st.zpomaleni * DT) > 1e-6) chybyZbrani.push(`v trní ušel ${vTrni.toFixed(3)} px místo ${(kost.rychlost * st.zpomaleni * DT).toFixed(3)}`);
  let venku = null;
  for (let t = 0; t < 2 && venku === null; t += DT) {
    krok(h);
    if (Math.hypot(kost.x - trs.x, kost.y - trs.y) >= trs.polomer + kost.polomer / 2) venku = h.cas;
  }
  hraj(h, DOZNIVANI_TRNU - 2 * DT);
  if (!(kost.trny > 0)) chybyZbrani.push('zpomalení po vylezení z trní nedoznělo');
  hraj(h, 3 * DT);
  const mimo = krok(h).get(kost);
  if (kost.trny !== 0 || Math.abs(mimo - kost.rychlost * DT) > 1e-6) chybyZbrani.push(`mimo trní kostlivec pořád pomalý (${mimo.toFixed(3)} px)`);
  hraj(h, st.trvani);
  if (h.trny.includes(trs)) chybyZbrani.push('trs nezmizel');
  trnovePokusy.kostlivec = { zraneni: kost.maxHp - kost.hp, vylezl_za_s: venku === null ? null : Math.round(venku * 100) / 100 };
}
// Na 4. úrovni tři trsy pod třemi nejbližšími, ale ne dva na sobě. Nepřítel za dosahem nic nespustí,
// a zbraň zůstane nabitá, dokud někdo nepřijde.
{
  const h = samotny({ trny: { uroven: 4, nabiti: 0 } });
  const st = staty(h).trny;
  const cile = [[100, 0], [110, 0], [0, 120], [-140, 0], [0, -200]].map(([x, y]) => pridejNepritele(h, 'slizak', x, y));
  for (const n of cile) n.rychlost = 0;
  krok(h);
  const mista = h.trny.map((p) => `${p.x},${p.y}`).join(' ');
  if (st.pocet !== 3 || mista !== '100,0 0,120 -140,0') chybyZbrani.push(`3 trsy vyrašily na ${mista}`);
  const daleko = samotny({ trny: { uroven: 1, nabiti: 0 } });
  const dalekyNepritel = pridejNepritele(daleko, 'slizak', staty(daleko).trny.dosah + 50, 0);
  dalekyNepritel.rychlost = 0;
  hraj(daleko, 1);
  if (daleko.trny.length) chybyZbrani.push('trny vyrašily pod nepřítelem za dosahem');
  dalekyNepritel.x = 200;
  krok(daleko);
  if (daleko.trny.length !== 1) chybyZbrani.push('nabité trny nevyrašily, když nepřítel přišel do dosahu');
  // Schovaný duch trsy nespustí ani v nich nic nedostane.
  const tma = samotny({ trny: { uroven: 5, nabiti: 0 } });
  const duch = pridejNepritele(tma, 'duch', 80, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  tma.trny.push({ x: 80, y: 0, polomer: 34, trvani: 3, zivot: 3 - RUST_TRNU, tik: 0, poskozeni: 9, zpomaleni: 0.35 });
  hraj(tma, 1);
  if (duch.hp !== duch.maxHp || duch.trny > 0 || tma.trny.length !== 1) chybyZbrani.push('trny našly schovaného ducha');
}
// Boss v trní zpomalí jen napůl. Po celou dobu trsu se nikam nenahromadí (nejvýš MAX_TRNU).
{
  const h = samotny({ trny: { uroven: 5, nabiti: 0 } });
  const st = staty(h).trny;
  const obr = pridejNepritele(h, 'obr', 200, 0);
  hraj(h, RUST_TRNU + 2 * DT);
  const ujito = krok(h).get(obr);
  const ocekavano = obr.rychlost * (1 - (1 - st.zpomaleni) / 2) * DT;
  if (Math.abs(ujito - ocekavano) > 1e-6) chybyZbrani.push(`boss v trní ušel ${ujito.toFixed(3)} px místo ${ocekavano.toFixed(3)}`);
  if (MAX_TRNU < st.pocet * Math.ceil(st.trvani / st.nabiti)) chybyZbrani.push('limit trsů je menší, než kolik jich může růst naráz');
}
// Zrcadlo: slizák u zrcadla dostane ránu a odletí, boss jen ránu, schovaného ducha zrcadlo nevidí.
const zrcadlovePokusy = {};
{
  const h = samotny({ zrcadlo: { uroven: 1, nabiti: 0 } });
  const z = staty(h).zrcadlo;
  const p0 = poziceZrcadla(h, 0);
  if (Math.abs(p0.x - z.polomer) > 1e-9 || p0.y !== 0) chybyZbrani.push('zrcadlo nezačíná vpravo od hrdiny');
  const sliz = pridejNepritele(h, 'slizak', z.polomer + 4, 0);
  sliz.rychlost = 0;
  krok(h);
  if (!(sliz.hp < sliz.maxHp) || !(sliz.odhozen > 0) || h.odhozeno !== 1) chybyZbrani.push('zrcadlo neodhodilo slizáka');
  hraj(h, TRVANI_ODHOZENI + DT);
  const odstup = Math.hypot(sliz.x, sliz.y);
  if (!(odstup >= z.polomer + 4 + z.odhozeni - 1) || sliz.odhozen !== 0) chybyZbrani.push(`odhozený slizák je ${odstup.toFixed(1)} px od hrdiny`);
  zrcadlovePokusy.odhozeni_px = Math.round(odstup - z.polomer - 4);
  if (h.hrdina.hp !== h.hrdina.maxHp) chybyZbrani.push('slizák u zrcadla zranil hrdinu');

  const b = samotny({ zrcadlo: { uroven: 1, nabiti: 0 } });
  const boss = pridejNepritele(b, 'strazce', z.polomer + 16, 0);
  boss.rychlost = 0;
  const duch = pridejNepritele(b, 'duch', 0, -z.polomer);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(b, 3);
  if (!(boss.hp < boss.maxHp) || boss.x !== z.polomer + 16 || boss.y !== 0) chybyZbrani.push('zrcadlo s bossem pohnulo nebo ho nezranilo');
  if (duch.hp !== duch.maxHp || duch.x !== 0 || duch.y !== -z.polomer) chybyZbrani.push('zrcadlo zasáhlo schovaného ducha');
}
// Střela bosse do zrcadla: vrátí se zpátky rychleji, hrdinu netrefí a zraní slizáka, který stojí za ní.
// Bez zrcadla stejná střela trefí hrdinu.
for (const se of [true, false]) {
  const h = samotny(se ? { zrcadlo: { uroven: 1, nabiti: 0 } } : {});
  const z = staty(h).zrcadlo;
  const cil = pridejNepritele(h, 'slizak', 150, 0);
  cil.rychlost = 0;
  const strela = { x: z.polomer + 6, y: 0, vx: -160, vy: 0, zivot: 3.5 };
  h.strelyBossu.push(strela);
  krok(h);
  if (se && (!strela.odrazena || !(Math.abs(strela.vx - 160 * ZRYCHLENI_ODRAZU) < 1e-9) || h.odrazeno !== 1)) chybyZbrani.push('zrcadlo střelu nevrátilo');
  hraj(h, 1.2);
  if (se && (h.hrdina.hp !== h.hrdina.maxHp || cil.hp !== cil.maxHp - z.odraz)) chybyZbrani.push(`vrácená střela: hrdina ${h.hrdina.hp}, slizák ${cil.hp}/${cil.maxHp}`);
  if (!se && h.zasahyBossu.vejir !== 1) chybyZbrani.push('střela bez zrcadla netrefila hrdinu');
}
// Bludička 20 s střílí na hrdinu, který stojí a nic jiného nemá: se třemi zrcadly (4. úroveň) jí část střel
// vrátí (zraní ji) a hrdinu trefí méně střel než bez nich. Aby se počítala každá střela, která doletí,
// hrdina má po zásahu hned zase nulovou ochranu a životů dost.
{
  const pokus = (zbrane) => {
    const [h, b] = bossZblizka('bludicka', 300, 0);
    h.zbrane = zbrane;
    h.hrdina.hp = 1e6;
    h.hrdina.maxHp = 1e6;
    hraj(h, 20, () => { h.hrdina.nezranitelny = 0; });
    return { zasahu_strelou: h.zasahyBossu.vejir, vraceno: h.odrazeno, bludicka_ztratila: b.maxHp - b.hp };
  };
  const bez = pokus({});
  const se = pokus({ zrcadlo: { uroven: 4, nabiti: 0 } });
  zrcadlovePokusy.bludicka_20_s = { bez_zrcadel: bez, se_zrcadly: se };
  if (!(se.vraceno > 0) || !(se.zasahu_strelou < bez.zasahu_strelou) || !(se.bludicka_ztratila > 0)) {
    chybyZbrani.push(`zrcadla proti Bludičce: vráceno ${se.vraceno}, zásahů ${se.zasahu_strelou} (bez nich ${bez.zasahu_strelou})`);
  }
}

// Světlušky zblízka. Roj má tolik světlušek, kolik slibuje úroveň. Odpočatá světluška vyletí na nepřítele
// v dosahu (víc světlušek každá na jiného, dokud je na koho), zasáhne ho a vrátí se k hrdinovi. Za dosahem
// ani na schovaného ducha nevyletí. Když hrdina běží, roj se drží u něj.
const svetluskovePokusy = {};
{
  const h = samotny({ svetlusky: { uroven: 4, nabiti: 0 } });
  krok(h);
  if (h.svetlusky.length !== staty(h).svetlusky.pocet || h.svetlusky.length !== 5) chybyZbrani.push(`na 4. úrovni ${h.svetlusky.length} světlušek`);
}
{
  const h = samotny({ svetlusky: { uroven: 1, nabiti: 0 } });
  const st = staty(h).svetlusky;
  const kost = pridejNepritele(h, 'kostlivec', 150, 0);
  kost.rychlost = 0;
  kost.hp = kost.maxHp = 1e6;
  let prvniZasah = null;
  let zpet = false;
  hraj(h, 3, (g) => {
    if (prvniZasah === null && g.zasahuSvetluskami > 0) prvniZasah = g.cas;
    zpet ||= g.svetlusky.some((l) => l.stav === 'zpet');
  });
  svetluskovePokusy.kostlivec_150_px = { prvni_zasah_s: prvniZasah === null ? null : Math.round(prvniZasah * 100) / 100, zasahu_za_3_s: h.zasahuSvetluskami };
  if (prvniZasah === null || kost.maxHp - kost.hp !== h.zasahuSvetluskami * st.poskozeni) chybyZbrani.push(`světlušky nezasáhly kostlivce (${h.zasahuSvetluskami} zásahů, ${kost.maxHp - kost.hp} poškození)`);
  if (!(h.zasahuSvetluskami >= st.pocet) || !zpet) chybyZbrani.push(`světlušky nelétají tam a zpátky (${h.zasahuSvetluskami} zásahů za 3 s)`);
  // Bez cíle se do 2 s všechny vrátí k hrdinovi a odpočívají.
  kost.hp = 0;
  hraj(h, 2);
  const daleko = Math.max(...h.svetlusky.map((l) => Math.hypot(l.x - h.hrdina.x, l.y - h.hrdina.y)));
  if (h.svetlusky.some((l) => l.stav !== 'kolem') || daleko > 40) chybyZbrani.push(`světlušky se nevrátily (nejdál ${daleko.toFixed(0)} px)`);
}
{
  // Tři nepřátelé, tři světlušky: každá letí na jiného.
  const h = samotny({ svetlusky: { uroven: 1, nabiti: 0 } });
  for (const [x, y] of [[120, 0], [-120, 0], [0, 140]]) pridejNepritele(h, 'kostlivec', x, y).rychlost = 0;
  hraj(h, 0.35);
  const cile = new Set(h.svetlusky.filter((l) => l.stav === 'leti').map((l) => l.cil));
  if (cile.size !== 3) chybyZbrani.push(`tři světlušky letí na ${cile.size} různé nepřátele`);
  // Za dosahem nic, schovaný duch nic.
  const pusto = samotny({ svetlusky: { uroven: 1, nabiti: 0 } });
  const st = staty(pusto).svetlusky;
  pridejNepritele(pusto, 'slizak', st.dosah + 50, 0).rychlost = 0;
  const duch = pridejNepritele(pusto, 'duch', 80, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(pusto, 1);
  if (pusto.svetlusky.some((l) => l.stav !== 'kolem') || duch.hp !== duch.maxHp) chybyZbrani.push('světlušky vyletěly za dosah nebo na schovaného ducha');
  // Hrdina 2 s běží doprava: roj zůstane u něj.
  const beh = samotny({ svetlusky: { uroven: 1, nabiti: 0 } });
  let nejdal = 0;
  for (let t = 0; t < 2; t += DT) {
    aktualizuj(beh, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
    nejdal = Math.max(nejdal, ...beh.svetlusky.map((l) => Math.hypot(l.x - beh.hrdina.x, l.y - beh.hrdina.y)));
  }
  svetluskovePokusy.nejdal_od_hrdiny_v_behu_px = Math.round(nejdal);
  if (nejdal > 50) chybyZbrani.push(`roj zůstal za běžícím hrdinou (${nejdal.toFixed(0)} px)`);
}

// Mrazivý krystal zblízka. Krystal dopadne do největšího hloučku (ne na osamělého nepřítele), během dopadu nic
// nedělá, pak zóna zpomalí, kdo v ní stojí (bosse napůl), a na konci je roztříští. Obyčejný nepřítel s malým
// zbytkem životů se roztříští rovnou, boss ne. Za dosahem nic, schovaný duch nic, víc krystalů každý jinde.
const mrazivePokusy = {};
{
  const h = samotny({ mraz: { uroven: 1, nabiti: 0 } });
  const st = staty(h).mraz;
  const hloucek = [[150, 0], [160, 10], [160, -10], [170, 0], [145, 12]].map(([x, y]) => pridejNepritele(h, 'slizak', x, y));
  const osamely = pridejNepritele(h, 'netopyr', -140, 0);
  osamely.rychlost = 0;
  krok(h);
  const z = h.ledoveZony[0];
  if (h.ledoveZony.length !== 1 || !(Math.hypot(z.x - 157, z.y) < st.polomer) || z.x < 0) chybyZbrani.push(`krystal nedopadl do hloučku (${h.ledoveZony.map((o) => `${o.x.toFixed(0)},${o.y.toFixed(0)}`)})`);
  if (!(z.x < 157)) chybyZbrani.push('zóna nedopadla blíž k hrdinovi než hlouček');
  hraj(h, DOPAD_KRYSTALU - 3 * DT);
  if (hloucek.some((n) => n.mraz > 0)) chybyZbrani.push('zóna mrazí, i když krystal ještě padá');
  hraj(h, 0.5);
  if (!hloucek.every((n) => n.mraz > 0 && n.zpomaleniMrazem < 1)) chybyZbrani.push('zóna nezpomalila hlouček');
  hraj(h, st.trvani);
  mrazivePokusy.hloucek_5_slizaku = { zabito: hloucek.filter((n) => !h.nepratele.includes(n)).length, zon: h.zon };
  if (h.ledoveZony.length || !hloucek.every((n) => !h.nepratele.includes(n)) || !h.nepratele.includes(osamely)) chybyZbrani.push(`roztříštění nesložilo hlouček (${mrazivePokusy.hloucek_5_slizaku.zabito} z 5)`);
}
{
  // Kostlivec jde k hrdinovi skrz zónu: po dopadu jde pomaleji, na konci mrznutí na zpomaleni, mimo zónu
  // zpomalení dozní. Boss v zóně jde napůl.
  const ujde = (druh, x) => {
    const h = samotny({});
    const n = pridejNepritele(h, druh, x, 0);
    if (n.boss) n.doSchopnosti = Infinity;
    const st = statyZbrane('mraz', 1);
    h.ledoveZony.push({ x, y: 0, polomer: 200, trvani: st.trvani, stari: DOPAD_KRYSTALU + st.trvani * 0.9, poskozeni: 0, zpomaleni: st.zpomaleni });
    // V prvním snímku zóna nepřítele teprve zmrazí (jde až po pohybu), změří se druhý.
    krok(h);
    return [krok(h).get(n) / (n.rychlost * DT), h, n];
  };
  const [kost, h, n] = ujde('kostlivec', 300);
  const [boss] = ujde('obr', 300);
  const zpomaleni = statyZbrane('mraz', 1).zpomaleni;
  mrazivePokusy.krok_v_mrazu = { kostlivec: Math.round(kost * 100) / 100, boss: Math.round(boss * 100) / 100 };
  if (Math.abs(kost - zpomaleni) > 1e-6) chybyZbrani.push(`kostlivec v mrazu jde ${kost.toFixed(3)}× místo ${zpomaleni}×`);
  if (Math.abs(boss - (1 - (1 - zpomaleni) / 2)) > 1e-6) chybyZbrani.push(`boss v mrazu jde ${boss.toFixed(3)}×`);
  hraj(h, 0.2);
  if (h.ledoveZony.length || !(n.mraz > 0)) chybyZbrani.push('zóna nezmizela nebo mráz nedozněl');
  hraj(h, DOZNIVANI_MRAZU);
  if (n.mraz !== 0 || Math.abs(krok(h).get(n) - n.rychlost * DT) > 1e-6) chybyZbrani.push('po doznění mrazu kostlivec pořád pomalý');
}
{
  // Roztříštění: kostlivci zbude po ráně málo životů a roztříští se, bossovi stejně málo a vydrží.
  const h = samotny({});
  const st = statyZbrane('mraz', 1);
  const kost = pridejNepritele(h, 'kostlivec', 100, 0);
  const boss = pridejNepritele(h, 'obr', -100, 0);
  for (const n of [kost, boss]) {
    n.rychlost = 0;
    n.doSchopnosti = Infinity;
    n.hp = st.poskozeni + Math.floor(n.maxHp * PRAH_ROZTRISTENI) - 1;
    h.ledoveZony.push({ x: n.x, y: 0, polomer: st.polomer, trvani: st.trvani, stari: DOPAD_KRYSTALU + st.trvani - DT / 2, poskozeni: st.poskozeni, zpomaleni: st.zpomaleni });
  }
  krok(h);
  if (h.nepratele.includes(kost) || h.roztristeno !== 1) chybyZbrani.push('kostlivec s malým zbytkem životů se neroztříštil');
  if (!h.nepratele.includes(boss) || boss.hp !== Math.floor(boss.maxHp * PRAH_ROZTRISTENI) - 1) chybyZbrani.push(`boss se roztříštil nebo dostal jinou ránu (${boss.hp})`);
  if (h.roztristeni.length !== 2) chybyZbrani.push(`po roztříštění ${h.roztristeni.length} prstenců`);
}
{
  // Na 4. úrovni tři krystaly do tří hloučků, s jedním hloučkem jen jeden. Za dosahem ani na ducha nic.
  const h = samotny({ mraz: { uroven: 4, nabiti: 0 } });
  const st = staty(h).mraz;
  for (const [x, y] of [[150, 0], [-150, 0], [0, 160]]) {
    for (const [dx, dy] of [[0, 0], [10, 8], [-8, 10]]) pridejNepritele(h, 'slizak', x + dx, y + dy).rychlost = 0;
  }
  krok(h);
  const z = h.ledoveZony;
  const odstup = Math.min(...z.flatMap((a, i) => z.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
  if (st.pocet !== 3 || z.length !== 3 || !(odstup >= st.polomer)) chybyZbrani.push(`3 krystaly: ${z.length} zón, nejbližší ${odstup.toFixed(0)} px`);
  const jeden = samotny({ mraz: { uroven: 4, nabiti: 0 } });
  for (const [dx, dy] of [[0, 0], [10, 8], [-8, 10], [5, -9]]) pridejNepritele(jeden, 'slizak', 150 + dx, dy).rychlost = 0;
  krok(jeden);
  if (jeden.ledoveZony.length !== 1) chybyZbrani.push(`do jednoho hloučku ${jeden.ledoveZony.length} krystaly`);
  const pusto = samotny({ mraz: { uroven: 1, nabiti: 0 } });
  pridejNepritele(pusto, 'slizak', staty(pusto).mraz.dosah + 60, 0).rychlost = 0;
  const duch = pridejNepritele(pusto, 'duch', 100, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(pusto, 1);
  if (pusto.zon) chybyZbrani.push('krystal dopadl za dosah nebo na schovaného ducha');
  pusto.ledoveZony.push({ x: 100, y: 0, polomer: 44, trvani: 1, stari: DOPAD_KRYSTALU + 1 - DT / 2, poskozeni: 34, zpomaleni: 0.45 });
  krok(pusto);
  if (duch.hp !== duch.maxHp || duch.mraz > 0) chybyZbrani.push('mráz našel schovaného ducha');
}

// Zvon hlubin zblízka. Vlna vyběhne od hrdiny, kostlivce v dosahu zasáhne jednou, odhodí ho a omráčí: stojí
// a nekouše, pak jde zase dál. Slizáka za dosahem nechá být. Omráčený boss jde napůl a kouše dál. Ozvěna
// zasáhne podruhé, ale neomráčí (nepřítel je odolný), další zvonění už zase ano. Schovaného ducha vlna mine.
const zvonovePokusy = {};
{
  const h = samotny({ zvon: { uroven: 1, nabiti: 0 } });
  const st = staty(h).zvon;
  const kost = pridejNepritele(h, 'kostlivec', 60, 0);
  const daleko = pridejNepritele(h, 'slizak', st.polomer + 40, 0);
  daleko.rychlost = 0;
  let zasazen = null;
  let odZasahu = null;
  for (let t = 0; t < 1 && zasazen === null; t += DT) {
    const x0 = kost.x;
    krok(h);
    if (kost.omracen > 0) {
      zasazen = h.cas;
      odZasahu = x0;
    }
  }
  if (zasazen === null || kost.maxHp - kost.hp !== st.poskozeni || h.zvoneni !== 1) chybyZbrani.push(`zvon nezasáhl kostlivce (${kost.maxHp - kost.hp} poškození, ${h.zvoneni} zvonění)`);
  hraj(h, TRVANI_ODHOZENI + DT);
  const odhozen = kost.x - odZasahu;
  const stoji = krok(h).get(kost);
  zvonovePokusy.kostlivec_60_px = { zasazen_s: zasazen === null ? null : Math.round(zasazen * 100) / 100, odhozen_px: Math.round(odhozen), krok_omraceneho: stoji };
  if (!(odhozen >= st.odhozeni * 0.9) || stoji !== 0) chybyZbrani.push(`zvon kostlivce neodhodil nebo neomráčil (${odhozen.toFixed(0)} px, krok ${stoji})`);
  hraj(h, st.omraceni);
  if (kost.omracen !== 0 || !(krok(h).get(kost) > 0)) chybyZbrani.push('kostlivec po omráčení nejde dál');
  if (daleko.hp !== daleko.maxHp || daleko.omracen > 0) chybyZbrani.push('zvon zasáhl slizáka za dosahem');
}
{
  // Omráčený kostlivec na hrdinovi nekouše, omráčený boss kouše a jde napůl.
  const h = samotny({});
  const kost = pridejNepritele(h, 'kostlivec', 4, 0);
  kost.omracen = 1;
  krok(h);
  const kostKousl = h.hrdina.hp !== h.hrdina.maxHp;
  if (kostKousl || !nekouse(kost)) chybyZbrani.push('omráčený kostlivec kouše');
  const b = samotny({});
  const obr = pridejNepritele(b, 'obr', 4, 0);
  obr.doSchopnosti = Infinity;
  obr.omracen = 1;
  krok(b);
  if (b.hrdina.hp === b.hrdina.maxHp || nekouse(obr)) chybyZbrani.push('omráčený boss nekouše');
  const c = samotny({});
  const daleky = pridejNepritele(c, 'obr', 300, 0);
  daleky.doSchopnosti = Infinity;
  daleky.omracen = 1;
  const krokBosse = krok(c).get(daleky) / (daleky.rychlost * DT);
  zvonovePokusy.krok_omraceneho_bosse = Math.round(krokBosse * 100) / 100;
  if (Math.abs(krokBosse - ZPOMALENI_OMRACENEHO_BOSSE) > 1e-6) chybyZbrani.push(`omráčený boss jde ${krokBosse.toFixed(3)}×`);
}
{
  // 4. úroveň: první vlna a po OZVENA_ZVONU ozvěna. Kostlivec dostane dvě rány, omráčí ho jen první.
  const h = samotny({ zvon: { uroven: 4, nabiti: 0 } });
  const st = staty(h).zvon;
  const kost = pridejNepritele(h, 'kostlivec', 30, 0);
  kost.rychlost = 0;
  hraj(h, OZVENA_ZVONU + 0.5);
  zvonovePokusy.ozvena = { zvoneni: h.zvoneni, poskozeni: kost.maxHp - kost.hp, omraceno: h.omraceno };
  if (st.pocet !== 2 || h.zvoneni !== 2 || kost.maxHp - kost.hp !== 2 * st.poskozeni) chybyZbrani.push(`ozvěna: ${h.zvoneni} vlny, ${kost.maxHp - kost.hp} poškození`);
  if (h.omraceno !== 1 || !(kost.odolny > 0)) chybyZbrani.push('ozvěna omráčila odolného kostlivce');
  if (!(IMUNITA_OMRACENI + st.omraceni < st.nabiti)) chybyZbrani.push('odolnost trvá déle než do dalšího zvonění');
  // Před dalším zvoněním kostlivce vrátíme k hrdinovi: odolnost mezitím vyprchala a zvon ho omráčí znovu.
  hraj(h, st.nabiti - h.cas - 0.1);
  Object.assign(kost, { x: 30, y: 0 });
  hraj(h, 0.4);
  if (h.omraceno !== 2) chybyZbrani.push(`další zvonění kostlivce neomráčilo (${h.omraceno})`);
  // Schovaného ducha vlna mine.
  const d = samotny({ zvon: { uroven: 1, nabiti: 0 } });
  const duch = pridejNepritele(d, 'duch', 50, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(d, 0.5);
  if (duch.hp !== duch.maxHp || duch.omracen > 0 || d.zvoneni !== 1) chybyZbrani.push('zvon našel schovaného ducha');
}

// Cep na řetězu zblízka. Vestoje koule krouží kolem hrdiny na délku řetězu rychlostí rozmachu a trefí, co
// potká. Za chůze se táhne za hrdinou, nikdy dál než řetěz, a zraní, přes koho se převalí. Rána roste
// s rychlostí koule, víc koulí má každá vlastní řetěz. Schovaného ducha koule mine.
const cepovePokusy = {};
{
  const h = samotny({ cep: { uroven: 1, nabiti: 0 } });
  const st = staty(h).cep;
  const L = delkaRetezu(st, 0);
  const vysece = new Set();
  hraj(h, 1);
  hraj(h, 2, (g) => {
    const k = g.koule[0];
    vysece.add(Math.floor((Math.atan2(k.y - g.hrdina.y, k.x - g.hrdina.x) + Math.PI) / (Math.PI / 4)) % 8);
  });
  const k = h.koule[0];
  const d = Math.hypot(k.x - h.hrdina.x, k.y - h.hrdina.y);
  cepovePokusy.vestoje = { od_hrdiny_px: Math.round(d), rychlost: Math.round(k.rychlost), po_kruhu: Math.round(st.rozmach * L) };
  if (h.koule.length !== 1 || Math.abs(d - L) > 2 || Math.abs(k.rychlost - st.rozmach * L) > st.rozmach * L * 0.1 || vysece.size !== 8) {
    chybyZbrani.push(`koule vestoje nekrouží (${d.toFixed(1)} px, ${k.rychlost.toFixed(0)} px/s, ${vysece.size} výsečí)`);
  }
  // Kostlivec na délku řetězu dostane ránu podle rychlosti koule.
  const kost = pridejNepritele(h, 'kostlivec', L, 0);
  kost.rychlost = 0;
  kost.hp = kost.maxHp = 1e6;
  let prvni = null;
  hraj(h, 2, (g) => { if (prvni === null && g.zasahuCepem > 0) prvni = kost.maxHp - kost.hp; });
  if (prvni === null || Math.abs(prvni - ranaCepu(st.poskozeni, k.rychlost)) > 1) chybyZbrani.push(`koule vestoje nezasáhla kostlivce na délku řetězu (${prvni})`);
  cepovePokusy.vestoje.rana = prvni;
}
{
  // Hrdina 2 s běží doprava: koule nikdy dál než řetěz a skončí za ním. Pak proběhne řadou kostlivců
  // (sám je nezranitelný) a koule je zraní taky.
  const h = samotny({ cep: { uroven: 1, nabiti: 0 } });
  const st = staty(h).cep;
  const L = delkaRetezu(st, 0);
  let nejdal = 0;
  for (let t = 0; t < 2; t += DT) {
    aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
    nejdal = Math.max(nejdal, Math.hypot(h.koule[0].x - h.hrdina.x, h.koule[0].y - h.hrdina.y));
  }
  const k = h.koule[0];
  cepovePokusy.v_behu = { nejdal_px: Math.round(nejdal * 10) / 10, za_hrdinou_px: Math.round(h.hrdina.x - k.x), rychlost: Math.round(k.rychlost) };
  if (nejdal > L + 1e-6 || !(h.hrdina.x - k.x > L * 0.8) || !(k.rychlost > MIN_RYCHLOST_CEPU)) chybyZbrani.push(`koule se netáhne za hrdinou (${nejdal.toFixed(1)} px, za ním ${(h.hrdina.x - k.x).toFixed(0)} px)`);
  h.hrdina.nezranitelny = 100;
  const rada = [1, 2, 3, 4, 5].map((i) => {
    const n = pridejNepritele(h, 'kostlivec', h.hrdina.x + 60 * i, 0);
    n.rychlost = 0;
    return n;
  });
  for (let t = 0; t < 4; t += DT) aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
  const zraneno = rada.filter((n) => n.hp < n.maxHp || !h.nepratele.includes(n)).length;
  cepovePokusy.v_behu.zraneno_z_rady = zraneno;
  if (zraneno < 4) chybyZbrani.push(`koule za běžícím hrdinou zranila jen ${zraneno} z 5`);
}
{
  // Rána podle rychlosti, víc koulí na různých řetězech, schovaného ducha mine.
  const r = (v) => ranaCepu(10, v);
  if (r(MIN_RYCHLOST_CEPU - 1) !== 0 || r(MIN_RYCHLOST_CEPU) !== 5 || r(RYCHLOST_RANY_CEPU) !== 10 || r(1e5) !== 20 || !(r(RYCHLOST_RANY_CEPU * 1.5) > r(RYCHLOST_RANY_CEPU))) {
    chybyZbrani.push('rána cepu neroste s rychlostí');
  }
  const h = samotny({ cep: { uroven: 4, nabiti: 0 } });
  const st = staty(h).cep;
  hraj(h, 2);
  const vzdal = h.koule.map((k) => Math.hypot(k.x - h.hrdina.x, k.y - h.hrdina.y));
  cepovePokusy.dve_koule_px = vzdal.map(Math.round);
  if (st.pocet !== 2 || h.koule.length !== 2 || vzdal.some((d, i) => Math.abs(d - delkaRetezu(st, i)) > 2) || !(delkaRetezu(st, 1) > delkaRetezu(st, 0))) {
    chybyZbrani.push(`na 4. úrovni ${h.koule.length} koule (${vzdal.map((d) => d.toFixed(0))} px)`);
  }
  // Na 200. úrovni (4 koule, nejdelší řetězy) koule krouží, drží se řetězu a trefí kostlivce na délku řetězu.
  const vys = samotny({ cep: { uroven: 200, nabiti: 0 } });
  const stVys = staty(vys).cep;
  const kostVys = pridejNepritele(vys, 'kostlivec', delkaRetezu(stVys, 3), 0);
  Object.assign(kostVys, { rychlost: 0, hp: 1e9, maxHp: 1e9 });
  let nejdalVys = 0;
  hraj(vys, 3, (g) => g.koule.forEach((k, i) => { nejdalVys = Math.max(nejdalVys, Math.hypot(k.x, k.y) - delkaRetezu(stVys, i)); }));
  cepovePokusy.na_200_urovni = { koulí: vys.koule.length, zasahu: vys.zasahuCepem, rychlost_posledni: Math.round(vys.koule[3]?.rychlost ?? 0) };
  if (vys.koule.length !== 4 || !(vys.zasahuCepem > 0) || nejdalVys > 1e-6 || !vys.koule.every((k) => Number.isFinite(k.x) && Number.isFinite(k.rychlost))) {
    chybyZbrani.push(`cep na 200. úrovni: ${vys.koule.length} koulí, ${vys.zasahuCepem} zásahů, přes řetěz o ${nejdalVys.toFixed(2)} px`);
  }
  const d = samotny({ cep: { uroven: 1, nabiti: 0 } });
  const duch = pridejNepritele(d, 'duch', delkaRetezu(staty(d).cep, 0), 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(d, 3);
  if (duch.hp !== duch.maxHp || d.zasahuCepem) chybyZbrani.push('koule našla schovaného ducha');
}

// Semínkové bomby zblízka. Běžící hrdina upustí semínko za sebe, do vteřiny nic nedělá, pak vybuchne: rána
// kostlivci vedle, slizák za poloměrem nic. Z výbuchu vyroste keř, píchá každý tik a zvadne. Vestoje padají
// semínka kolem nohou každé jinde, víc semínek naráz leží vedle sebe. Schovaného ducha výbuch mine.
const seminkovePokusy = {};
{
  const h = samotny({ seminka: { uroven: 1, nabiti: 0 } });
  const st = staty(h).seminka;
  aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
  const p = h.seminka[0];
  if (h.seminka.length !== 1 || !(p.x < h.hrdina.x - 5) || Math.abs(p.y) > 1e-9) chybyZbrani.push(`semínko nepadlo za hrdinu (${h.seminka.length}, ${p?.x.toFixed(1)} vs ${h.hrdina.x.toFixed(1)})`);
  // Další semínka už ne (ať se nepletou) a hrdina odejde, aby kostlivec nekousal.
  h.zbrane = {};
  h.hrdina.x = 500;
  const kost = pridejNepritele(h, 'kostlivec', p.x + 10, p.y);
  const daleko = pridejNepritele(h, 'slizak', p.x + st.polomer + 20, p.y);
  for (const n of [kost, daleko]) {
    n.rychlost = 0;
    n.hp = n.maxHp = 1e6;
  }
  hraj(h, ZRANI_SEMINKA - 2 * DT);
  if (kost.hp !== kost.maxHp || p.vybuchlo) chybyZbrani.push('semínko škodí, i když ještě nevybuchlo');
  hraj(h, 3 * DT);
  const poVybuchu = kost.maxHp - kost.hp;
  if (!p.vybuchlo || poVybuchu !== st.poskozeni || daleko.hp !== daleko.maxHp || h.vybuchlo !== 1) chybyZbrani.push(`výbuch semínka: ${poVybuchu} poškození, slizák ${daleko.maxHp - daleko.hp}`);
  hraj(h, st.trvani + 0.2);
  const pichnuti = (kost.maxHp - kost.hp - poVybuchu) / st.pichnuti;
  seminkovePokusy.kostlivec_vedle = { vybuch: poVybuchu, pichnuti_kere: pichnuti, keru_po_zvadnuti: h.seminka.length };
  if (!Number.isInteger(pichnuti) || pichnuti < Math.floor(st.trvani / st.tik) - 1 || pichnuti > Math.ceil(st.trvani / st.tik)) chybyZbrani.push(`keř píchl ${pichnuti}× za ${st.trvani} s`);
  if (h.seminka.length || daleko.hp !== daleko.maxHp) chybyZbrani.push('keř nezvadl nebo píchl slizáka za poloměrem');
  if (!(st.polomer * POMER_KERE < st.polomer)) chybyZbrani.push('keř není menší než výbuch');
}
{
  // Vestoje: tři zasetí, každé jinde kolem nohou. 4. úroveň za běhu: tři semínka vedle sebe napříč.
  const h = samotny({ seminka: { uroven: 1, nabiti: 0 } });
  hraj(h, staty(h).seminka.nabiti * 2 + 0.1);
  const mista = h.seminka.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`);
  const blizko = h.seminka.every((p) => Math.hypot(p.x, p.y) < 20);
  if (h.seminka.length !== 3 || new Set(mista).size !== 3 || !blizko) chybyZbrani.push(`vestoje semínka ${mista}`);
  const b = samotny({ seminka: { uroven: 4, nabiti: 0 } });
  aktualizuj(b, DT, { dx: 0, dy: 1 }, SIRKA, VYSKA);
  const xs = b.seminka.map((p) => p.x).sort((a, c) => a - c);
  seminkovePokusy.ctvrta_uroven_napric = xs.map((x) => Math.round(x));
  if (staty(b).seminka.pocet !== 3 || b.seminka.length !== 3 || !b.seminka.every((p) => p.y < b.hrdina.y) || !(xs[1] - xs[0] > 10 && xs[2] - xs[1] > 10)) {
    chybyZbrani.push(`na 4. úrovni ${b.seminka.length} semínek (${xs.map((x) => x.toFixed(0))})`);
  }
  // Schovaný duch u semínka.
  const d = samotny({ seminka: { uroven: 1, nabiti: 0 } });
  const duch = pridejNepritele(d, 'duch', 14, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(d, ZRANI_SEMINKA + 1);
  if (duch.hp !== duch.maxHp || !d.vybuchlo) chybyZbrani.push('výbuch semínka našel schovaného ducha');
}

// Kořeny zblízka. Kostlivec jde k hrdinovi: kořen k němu běží pod zemí (zatím ho nedrží), pod ním vyrazí, zraní ho
// a drží: kostlivec stojí, odhození s ním nehne a každý tik ho kořeny sevřou. Po puštění jde dál a chvíli ho nové
// kořeny nechytí. Slizák za dosahem zůstane celý.
const korenovePokusy = {};
{
  const h = samotny({ korene: { uroven: 1, nabiti: 0 } });
  const st = staty(h).korene;
  const kost = pridejNepritele(h, 'kostlivec', 150, 0);
  const daleko = pridejNepritele(h, 'slizak', -(st.dosah + 40), 0);
  daleko.rychlost = 0;
  let behu = 0;
  let chycen = null;
  for (let t = 0; t < 2 && chycen === null; t += DT) {
    krok(h);
    if (h.korene.some((k) => k.faze === 'bezi')) behu += 1;
    if (kost.drzen > 0) chycen = { cas: h.cas, x: kost.x, rana: kost.maxHp - kost.hp };
  }
  korenovePokusy.kostlivec_150_px = { chycen_s: chycen && Math.round(chycen.cas * 100) / 100, snimku_pod_zemi: behu, rana: chycen?.rana };
  if (!chycen || chycen.rana !== st.poskozeni || behu < 3 || h.drzeno !== 1) chybyZbrani.push(`kořen kostlivce nechytil (${JSON.stringify(korenovePokusy.kostlivec_150_px)})`);
  else if (Math.abs(chycen.cas - chycen.x / RYCHLOST_KORENE) > 0.15) chybyZbrani.push(`kořen běžel ${chycen.cas.toFixed(2)} s na ${chycen.x.toFixed(0)} px`);
  // Držený stojí, i když ho něco odhodí.
  const x0 = kost.x;
  Object.assign(kost, { odhozen: TRVANI_ODHOZENI, odhozVx: 600, odhozVy: 0 });
  const stoji = krok(h).get(kost);
  if (stoji !== 0 || kost.x !== x0) chybyZbrani.push(`držený kostlivec se hnul o ${stoji} px`);
  hraj(h, st.trvani);
  const sevreni = (kost.maxHp - kost.hp - st.poskozeni) / st.svirani;
  korenovePokusy.kostlivec_150_px.sevreni = sevreni;
  if (!Number.isInteger(sevreni) || sevreni < Math.floor(st.trvani / TIK_KORENU) - 1 || sevreni > Math.ceil(st.trvani / TIK_KORENU)) chybyZbrani.push(`kořeny sevřely ${sevreni}× za ${st.trvani} s`);
  if (kost.drzen !== 0 || !(krok(h).get(kost) > 0)) chybyZbrani.push('kostlivec po puštění nejde dál');
  // Odolný: další kořeny ho nechytí, dokud odolnost nevyprší (kořen bez cíle čeká nabitý).
  h.hrdina.nezranitelny = 100;
  const drzenoPred = h.drzeno;
  Object.assign(kost, { x: 120, y: 0, rychlost: 0 });
  hraj(h, IMUNITA_KORENU - 0.3);
  if (h.drzeno !== drzenoPred) chybyZbrani.push('kořeny chytily odolného kostlivce');
  hraj(h, 0.3 + 120 / RYCHLOST_KORENE + 0.3);
  if (h.drzeno !== drzenoPred + 1) chybyZbrani.push('kořeny po odolnosti kostlivce znovu nechytily');
  if (daleko.hp !== daleko.maxHp || daleko.drzen > 0) chybyZbrani.push('kořen chytil slizáka za dosahem');
}
{
  // Držený boss jde napůl, kořeny ho zraní a sevřou taky.
  const b = samotny({});
  const obr = pridejNepritele(b, 'obr', 300, 0);
  obr.doSchopnosti = Infinity;
  obr.drzen = 1;
  obr.vyrvan = 2;
  const krokBosse = krok(b).get(obr) / (obr.rychlost * DT);
  korenovePokusy.krok_drzeneho_bosse = Math.round(krokBosse * 100) / 100;
  if (Math.abs(krokBosse - ZPOMALENI_DRZENEHO_BOSSE) > 1e-6) chybyZbrani.push(`držený boss jde ${krokBosse.toFixed(3)}×`);
  // 4. úroveň: tři kořeny na tři různé kostlivce (ne na dva vedle sebe), schovaný duch zůstane.
  const h = samotny({ korene: { uroven: 4, nabiti: 0 } });
  const st = staty(h).korene;
  h.hrdina.nezranitelny = 100;
  const kosti = [[100, 0], [104, 6], [0, 110], [-110, 0]].map(([x, y]) => {
    const n = pridejNepritele(h, 'kostlivec', x, y);
    n.rychlost = 0;
    return n;
  });
  const duch = pridejNepritele(h, 'duch', 60, -60);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  krok(h);
  const cile = new Set(h.korene.map((k) => k.cil));
  hraj(h, 1);
  korenovePokusy.ctvrta_uroven = { korenu: h.korene.length, drzeno: h.drzeno };
  if (st.pocet !== 3 || cile.size !== 3 || cile.has(kosti[1]) || h.drzeno < 3 || ![kosti[0], kosti[2], kosti[3]].every((n) => n.vyrvan > 0)) {
    chybyZbrani.push(`na 4. úrovni kořeny na ${cile.size} cílů, drženo ${h.drzeno}`);
  }
  if (duch.hp !== duch.maxHp || duch.drzen > 0) chybyZbrani.push('kořen našel schovaného ducha');
  // Cíl cestou padne: kořen vezme jiného kostlivce.
  const z = samotny({ korene: { uroven: 1, nabiti: 0 } });
  z.hrdina.nezranitelny = 100;
  const prvni = pridejNepritele(z, 'kostlivec', 160, 0);
  const druhy = pridejNepritele(z, 'kostlivec', 170, 60);
  for (const n of [prvni, druhy]) n.rychlost = 0;
  krok(z);
  prvni.hp = 0;
  hraj(z, 1.2);
  if (druhy.vyrvan === 0 || z.drzeno !== 1) chybyZbrani.push('kořen si po padlém cíli nevzal jiného');
}

// Ohnivá stopa zblízka. Hrdina běží doprava: za ním plameny s rozestupem, vestoje jen jeden pod nohama. Kostlivec
// v ohni dostane ránu jednou za tik, i když stojí ve dvou plamenech naráz. Na 4. úrovni ho oheň zapálí a hoří
// ještě po vylezení, pak zhasne. Plameny dohoří, schovaného ducha nepálí.
const stopovePokusy = {};
{
  const h = samotny({ stopa: { uroven: 1, nabiti: 0 } });
  const st = staty(h).stopa;
  const rozestup = st.polomer * ROZESTUP_STOPY;
  for (let t = 0; t < 1; t += DT) aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
  const xs = h.plameny.map((p) => p.x);
  const mezery = xs.slice(1).map((x, i) => x - xs[i]);
  const krokHrdiny = h.hrdina.rychlost * DT;
  stopovePokusy.za_behu = { plamenu: h.plameny.length, ujito_px: Math.round(h.hrdina.x), mezery_px: [Math.min(...mezery), Math.max(...mezery)].map((m) => Math.round(m * 10) / 10) };
  if (h.plameny.length < 4 || !h.plameny.every((p) => Math.abs(p.y) < 1e-9 && p.x <= h.hrdina.x) || !mezery.every((m) => m >= rozestup - 1e-9 && m < rozestup + krokHrdiny + 1e-9)) {
    chybyZbrani.push(`stopa za běžícím hrdinou: ${JSON.stringify(stopovePokusy.za_behu)}`);
  }
  // Vestoje 3 s: plamenů nepřibude (poslední, pod nohama, hoří dál), staré za hrdinou dohoří.
  const pod = h.plamenu;
  hraj(h, 3);
  stopovePokusy.vestoje = { plamenu: h.plameny.length, pribylo: h.plamenu - pod };
  if (h.plamenu !== pod || h.plameny.length !== 1 || !(Math.hypot(h.plameny[0].x - h.hrdina.x, h.plameny[0].y - h.hrdina.y) < rozestup)) {
    chybyZbrani.push(`vestoje ${h.plameny.length} plamenů (přibylo ${h.plamenu - pod})`);
  }
}
{
  // Kostlivec stojí ve dvou plamenech: pálí ho jednou za tik. Pak hrdina odejde (bez zbraně) a oheň dohoří.
  const h = samotny({ stopa: { uroven: 1, nabiti: 0 } });
  const st = staty(h).stopa;
  h.hrdina.nezranitelny = 100;
  for (let t = 0; t < 0.4; t += DT) aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
  const kost = pridejNepritele(h, 'kostlivec', h.plameny[1].x, 0);
  Object.assign(kost, { rychlost: 0, hp: 1e6, maxHp: 1e6 });
  const vKolika = h.plameny.filter((p) => Math.hypot(p.x - kost.x, p.y - kost.y) < p.polomer + kost.polomer / 2).length;
  h.zbrane = {};
  h.hrdina.x = -400;
  const T = 1;
  hraj(h, T);
  const ran = (kost.maxHp - kost.hp) / st.poskozeni;
  stopovePokusy.kostlivec_v_ohni = { plamenu_kolem: vKolika, ran_za_1_s: ran, tik_s: st.tik };
  if (vKolika < 2 || !Number.isInteger(ran) || ran < Math.floor(T / st.tik) || ran > Math.ceil(T / st.tik) + 1) chybyZbrani.push(`oheň pálil ${ran}× za ${T} s (plamenů kolem ${vKolika})`);
  hraj(h, st.trvani);
  const poDohoreni = kost.hp;
  hraj(h, 1);
  if (h.plameny.length || kost.hp !== poDohoreni || kost.hori > 0) chybyZbrani.push('stopa nedohořela nebo pálí i potom (bez zapálení)');
}
{
  // 4. úroveň: kostlivec vyleze z ohně a hoří ještě hori s (slabší ranou), pak zhasne.
  const h = samotny({ stopa: { uroven: 4, nabiti: 0 } });
  const st = staty(h).stopa;
  h.hrdina.nezranitelny = 100;
  const kost = pridejNepritele(h, 'kostlivec', 0, 0);
  Object.assign(kost, { rychlost: 0, hp: 1e6, maxHp: 1e6 });
  krok(h);
  h.zbrane = {};
  h.hrdina.x = -400;
  if (!(kost.hori > 0) || h.zapaleno !== 1) chybyZbrani.push('oheň na 4. úrovni nezapálil');
  Object.assign(kost, { x: 300, y: 0 });
  const pred = kost.hp;
  hraj(h, st.hori + 0.2);
  const pali = (pred - kost.hp) / st.pali;
  stopovePokusy.zapaleny = { hori_s: st.hori, ran_po_vylezeni: pali };
  if (!Number.isInteger(pali) || pali < Math.floor(st.hori / st.tik) - 1 || pali > Math.ceil(st.hori / st.tik) + 1 || kost.hori !== 0) chybyZbrani.push(`zapálený hořel ${pali}× (hori ${kost.hori})`);
  const zhasl = kost.hp;
  hraj(h, 1);
  if (kost.hp !== zhasl) chybyZbrani.push('zapálený hoří i po zhasnutí');
  // Schovaný duch v ohni.
  const d = samotny({ stopa: { uroven: 4, nabiti: 0 } });
  const duch = pridejNepritele(d, 'duch', 4, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  hraj(d, 1);
  if (duch.hp !== duch.maxHp || duch.hori > 0) chybyZbrani.push('oheň pálil schovaného ducha');
}

// Odrazný kámen zblízka. Řada kostlivců: kámen zasáhne prvního a odráží se na další, každého jednou, s každým
// odrazem rychleji a s větší ranou. Na dalšího za skok už nedoletí a bez cíle spadne. Na 4. úrovni letí dva
// kameny na dva různé nepřátele. Schovaného ducha mine.
const prakovePokusy = {};
{
  const h = samotny({ prak: { uroven: 2, nabiti: 0 } });
  const st = staty(h).prak;
  h.hrdina.nezranitelny = 100;
  const rada = [1, 2, 3, 4, 5, 6].map((i) => {
    const n = pridejNepritele(h, 'kostlivec', 80 * i, 20 * (i % 2));
    Object.assign(n, { rychlost: 0, hp: 1e6, maxHp: 1e6 });
    return n;
  });
  let nejrychleji = 0;
  hraj(h, 0.1, (g) => { for (const k of g.oblazky) nejrychleji = Math.max(nejrychleji, Math.hypot(k.vx, k.vy)); });
  h.zbrane = {};
  hraj(h, 2, (g) => { for (const k of g.oblazky) nejrychleji = Math.max(nejrychleji, Math.hypot(k.vx, k.vy)); });
  const rany = rada.map((n) => n.maxHp - n.hp);
  const ocekavane = rada.map((_, i) => (i <= st.odrazy ? Math.round(st.poskozeni * (1 + RUST_RANY_KAMENE * i)) : 0));
  prakovePokusy.rada_kostlivcu = { rany, odrazu: h.odrazu, nejrychleji: Math.round(nejrychleji), spadlo: h.oblazky.length === 0 };
  if (st.odrazy !== 4 || rany.join() !== ocekavane.join() || h.odrazu !== st.odrazy || h.oblazky.length) chybyZbrani.push(`kámen v řadě: ${rany} místo ${ocekavane}, ${h.odrazu} odrazů`);
  const cekane = Math.min(MAX_RYCHLOST_KAMENE, RYCHLOST_KAMENE * ZRYCHLENI_KAMENE ** st.odrazy);
  if (Math.abs(nejrychleji - cekane) > 1e-6) chybyZbrani.push(`kámen po odrazech letí ${nejrychleji.toFixed(1)} místo ${cekane.toFixed(1)} px/s`);
}
{
  // Druhý kostlivec je za skok od prvního: kámen se od prvního odrazí pryč a spadne, druhého nezasáhne.
  const h = samotny({ prak: { uroven: 1, nabiti: 0 } });
  const st = staty(h).prak;
  h.hrdina.nezranitelny = 100;
  const blizko = pridejNepritele(h, 'kostlivec', 100, 0);
  const zaSkokem = pridejNepritele(h, 'kostlivec', 100 + st.skok + 40, 0);
  for (const n of [blizko, zaSkokem]) Object.assign(n, { rychlost: 0, hp: 1e6, maxHp: 1e6 });
  krok(h);
  h.zbrane = {};
  let spadl = null;
  hraj(h, 1.5, (g) => { if (spadl === null && g.cas > 0.1 && !g.oblazky.length) spadl = g.cas; });
  prakovePokusy.za_skokem = { blizko: blizko.maxHp - blizko.hp, za_skokem: zaSkokem.maxHp - zaSkokem.hp, spadl_s: spadl && Math.round(spadl * 100) / 100 };
  if (blizko.maxHp - blizko.hp !== st.poskozeni || zaSkokem.hp !== zaSkokem.maxHp || spadl === null || spadl > 100 / RYCHLOST_KAMENE + VOLNY_LET + 0.2) {
    chybyZbrani.push(`kámen bez dalšího cíle: ${JSON.stringify(prakovePokusy.za_skokem)}`);
  }
  // 4. úroveň: dva kameny, každý na jiného. Schovaný duch blíž než oni: ten zůstane.
  const d = samotny({ prak: { uroven: 4, nabiti: 0 } });
  d.hrdina.nezranitelny = 100;
  const duch = pridejNepritele(d, 'duch', 40, 0);
  Object.assign(duch, { rychlost: 0, skryty: true, duchCas: 100 });
  const a = pridejNepritele(d, 'kostlivec', 120, 0);
  const b = pridejNepritele(d, 'kostlivec', -130, 0);
  for (const n of [a, b]) Object.assign(n, { rychlost: 0, hp: 1e6, maxHp: 1e6 });
  krok(d);
  const cile = d.oblazky.map((k) => k.cil);
  hraj(d, 1);
  prakovePokusy.ctvrta_uroven = { kamenu: cile.length, ruzne_cile: new Set(cile).size };
  if (staty(d).prak.pocet !== 2 || cile.length !== 2 || new Set(cile).size !== 2 || cile.includes(duch)) chybyZbrani.push(`na 4. úrovni ${cile.length} kameny na ${new Set(cile).size} cílů`);
  if (duch.hp !== duch.maxHp || a.hp === a.maxHp || b.hp === b.maxHp) chybyZbrani.push('kameny našly schovaného ducha nebo minuly');
}

// Pasivy pro zbraně (Kritický zásah, Rozpětí, Ozvěna, Výdrž, Rychlé ruce, Příval). Data: každá pasiva má ikonu se
// spritem a každá zbraň říká, co z ní která pasiva čte (čísla, která opravdu má). Bez pasiv jsou čísla zbraní
// stejná jako dřív a los pasiv se nehne. Rozpětí, Výdrž a Příval změní přesně ta čísla, Rychlé ruce zrychlí každou
// zbraň, kritický zásah bolí dvakrát se zlatým číslem a padá s danou šancí, Příval se nabízí zřídka a nejvýš 3.
// Pak každá zbraň sama 15 s v plné hře od 10. minuty se všemi pasivami: ozvěna, kritické zásahy i delší efekty
// musí být opravdu vidět (ve hře, ne jen v číslech) a nic se nerozbije.
const chybyPasiv = [];
const pasivyZbrani = { zbrane: {} };
{
  const NOVE = ['krit', 'rozpeti', 'ozvena', 'vydrz', 'rychleRuce', 'prival'];
  for (const id of NOVE) {
    const p = PASIVY[id];
    if (!p || !jmenaSpritu.has(p.ikona) || !p.popis || !p.popisDal || STROPY.pasivy[id] === undefined) chybyPasiv.push(`pasiva ${id}: chybí data, ikona nebo strop`);
  }
  for (const p of Object.values(PASIVY)) if (!jmenaSpritu.has(p.ikona)) chybyPasiv.push(`pasiva ${p.nazev} nemá sprite ikony`);
  const bez = novaHra(vytvorRng(seminko));
  bez.zbrane = Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: ZAKLAD_UROVNI, nabiti: 0 }]));
  const sBez = staty(bez);
  const ciste = (id, u = ZAKLAD_UROVNI, n = 1) => statyZbrane(id, u, n);
  for (const [id, z] of Object.entries(ZBRANE)) {
    const p = z.pasivy;
    const c = ciste(id);
    const pole = [...(p?.rozpeti ?? []), ...(p?.vydrz ?? []), ...Object.keys(p?.vydrzNavic ?? {}), p?.prival];
    if (!p?.rozpeti?.length || !(p.vydrz?.length || Object.keys(p.vydrzNavic ?? {}).length) || !p.prival) chybyPasiv.push(`${id}: některou pasivu nečte`);
    for (const f of pole) if (typeof c[f] !== 'number') chybyPasiv.push(`${id}: pasiva čte ${f}, které zbraň nemá`);
    if (JSON.stringify(sBez[id]) !== JSON.stringify(c)) chybyPasiv.push(`${id}: bez pasiv jiná čísla než dřív`);
    // Rozpětí 1,5, Výdrž 2 a Příval 2 změní přesně svá čísla.
    const s2 = pasivyDoZbrane(id, ciste(id), { rozpeti: 1.5, vydrz: 2, prival: 2 });
    for (const [f, v] of Object.entries(c)) {
      let cekam = v;
      if (p.rozpeti.includes(f)) cekam *= 1.5;
      if (p.vydrz?.includes(f)) cekam *= 2;
      if (p.vydrzNavic?.[f]) cekam += p.vydrzNavic[f];
      if (p.prival === f) cekam += 2;
      if (!(Math.abs(s2[f] - cekam) <= 1e-9 * Math.max(1, Math.abs(cekam)))) chybyPasiv.push(`${id}: ${f} s pasivami ${s2[f]} místo ${cekam}`);
    }
    // Rychlé ruce: kratší nabíjení zbraň opravdu zrychlí (něco z jejích čísel se změní správným směrem).
    const rychle = ciste(id, ZAKLAD_UROVNI, 0.7);
    const rychlejsi = Object.keys(c).some((f) => rychle[f] !== c[f]);
    // Co zbraň nabíjí: nabiti (střelba, trsy, semínka …), u lucerny a stopy tik, u krumpáčů, zrcadel a cepu točení.
    const cadence = 'nabiti' in c ? 'nabiti' : 'tik' in c ? 'tik' : null;
    const spatne = (cadence && !(rychle[cadence] < c[cadence])) || ['rychlost', 'rozmach'].some((f) => f in c && id !== 'svetlusky' && !(rychle[f] > c[f]));
    if (!rychlejsi || spatne) chybyPasiv.push(`${id}: Rychlé ruce zbraň nezrychlí`);
  }
  if (bez.losuPasiv !== 0) chybyPasiv.push('los pasiv se pohnul bez pasiv');

  // Kritický zásah: s šancí 1 dvojnásobek a zlaté číslo s vykřičníkem, bez něj obyčejná rána, s 0,3 asi každá třetí.
  const k = novaHra(vytvorRng(seminko));
  const terc = pridejNepritele(k, 'slizak', 300, 0);
  terc.hp = terc.maxHp = 1e9;
  zasah(k, terc, 10);
  const obycejna = 1e9 - terc.hp;
  k.hrdina.krit = 1;
  const pred = terc.hp;
  zasah(k, terc, 10);
  const kriticka = pred - terc.hp;
  const zlate = k.cisla.filter((c) => c.barva === 'krit');
  if (obycejna !== 10 || kriticka !== 10 * NASOBEK_KRITU || zlate.length !== 1 || zlate[0].text !== `${10 * NASOBEK_KRITU}!` || k.kritu !== 1) {
    chybyPasiv.push(`kritický zásah: ${obycejna} → ${kriticka}, čísla ${JSON.stringify(zlate.map((c) => c.text))}`);
  }
  k.hrdina.krit = 0.3;
  const krituPred = k.kritu;
  for (let i = 0; i < 5000; i++) zasah(k, terc, 10);
  const podilKritu = (k.kritu - krituPred) / 5000;
  if (Math.abs(podilKritu - 0.3) > 0.03) chybyPasiv.push(`kritický zásah s šancí 0,3 padl v ${podilKritu}`);
  pasivyZbrani.podil_kritu_pri_sanci_30 = Math.round(podilKritu * 1000) / 1000;

  // Příval se nabízí zřídka: proti průměrné jiné pasivě zhruba v poměru jeho váhy.
  const nab = novaHra(vytvorRng(seminko));
  const kolikrat = Object.fromEntries(Object.keys(PASIVY).map((id) => [id, 0]));
  for (let i = 0; i < 4000; i++) for (const v of nabidka(nab)) if (v.druh === 'pasiva') kolikrat[v.id] += 1;
  const jine = Object.entries(kolikrat).filter(([id]) => id !== 'prival').map(([, n]) => n);
  const pomer = kolikrat.prival / (jine.reduce((a, b) => a + b, 0) / jine.length);
  if (!(pomer > PASIVY.prival.vaha * 0.6 && pomer < PASIVY.prival.vaha * 1.4)) chybyPasiv.push(`Příval se nabízí v poměru ${pomer}`);
  pasivyZbrani.privalu_proti_jine_pasive = Math.round(pomer * 100) / 100;

  // Výdrž u lucerny: kdo ze světla vyjde, toho žár ještě chvíli pálí, bez Výdrže ne.
  for (const vydrz of [1, 2]) {
    const l = novaHra(vytvorRng(seminko));
    l.zbrane = { lucerna: { uroven: 1, nabiti: 0 } };
    l.hrdina.vydrz = vydrz;
    Object.assign(l, { doSpawnu: 999, doBedny: 999, doZamcene: 999 });
    const n = pridejNepritele(l, 'slizak', 30, 0);
    n.hp = n.maxHp = 1e6;
    n.rychlost = 0;
    aktualizuj(l, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    n.x = 400;
    const venku = n.hp;
    for (let t = 0; t < 0.5; t += DT) aktualizuj(l, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if ((n.hp < venku) !== (vydrz > 1)) chybyPasiv.push(`lucerna s Výdrží ${vydrz}: mimo světlo ${venku - n.hp} poškození`);
  }

  // Každá zbraň sama se všemi pasivami.
  const VSE = { krit: 0.25, rozpeti: 1.3, ozvena: 0.5, vydrz: 2, prival: 2 };
  const zaklad5 = (id) => ciste(id);
  for (const id of Object.keys(ZBRANE)) {
    const h = novaHra(vytvorRng(seminko));
    h.zbrane = { [id]: { uroven: ZAKLAD_UROVNI, nabiti: 0 } };
    Object.assign(h, { cas: 600, dalsiBoss: 1e9, dalsiSmecka: null, dalsiPrichod: 4 });
    Object.assign(h.hrdina, VSE);
    const st = staty(h)[id];
    const z5 = zaklad5(id);
    const nejvic = { odhozen: 0, otres: 0, dosvit: 0, drzen: 0, omracen: 0, mraz: 0, hori: 0, blesku: 0, strel: 0, kamen: 0, trs: 0, zona: 0, seminko: 0, plamen: 0, bocnich: 0 };
    for (let t = 0; t < 15; t += DT) {
      h.hrdina.nezranitelny = 1;
      aktualizuj(h, DT, rozhodni(h, t), SIRKA, VYSKA);
      if (h.porovnani) rozhodniKus(h, false);
      if (h.volby) vyber(h, { druh: 'leceni', kroku: 1 });
      if (h.obchod) odejdiOdKupce(h);
      for (const n of h.nepratele) for (const co of ['odhozen', 'otres', 'dosvit', 'drzen', 'omracen', 'mraz', 'hori']) nejvic[co] = Math.max(nejvic[co], n[co] || 0);
      nejvic.blesku = Math.max(nejvic.blesku, h.blesky.length);
      for (const [co, pole, f] of [['strel', 'strely', 'zivot'], ['kamen', 'oblazky', 'zivot'], ['trs', 'trny', 'trvani'], ['zona', 'ledoveZony', 'trvani'], ['seminko', 'seminka', 'trvani'], ['plamen', 'plameny', 'trvani']]) {
        for (const o of h[pole]) nejvic[co] = Math.max(nejvic[co], o[f]);
      }
      for (const pl of h.plameny) nejvic.bocnich = Math.max(nejvic.bocnich, pl.bocni?.length ?? 0);
      if (id === 'svetlusky' && h.svetlusky.length !== st.pocet) chybyPasiv.push(`světlušek ${h.svetlusky.length} místo ${st.pocet}`);
      if (id === 'cep' && h.koule.length !== st.pocet) chybyPasiv.push(`koulí ${h.koule.length} místo ${st.pocet}`);
      if (!Number.isFinite(h.hrdina.x) || h.nepratele.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.hp))) throw new Error(`NaN se zbraní ${id} a pasivami`);
    }
    const ozvena = h.ozvenVystrelu + h.ozvenZasahu;
    // Co má Výdrž u které zbraně prodloužit (a o kolik nejméně, než bez ní).
    const delsi = {
      jiskra: nejvic.strel > z5.zivot, lucerna: nejvic.dosvit > 0, krumpace: h.otreseno > 0, blesk: h.otreseno > 0,
      trny: nejvic.trs > z5.trvani * 1.5, zrcadlo: nejvic.odhozen > TRVANI_ODHOZENI * 1.5, svetlusky: h.otreseno > 0,
      mraz: nejvic.zona > z5.trvani * 1.5 && nejvic.mraz > DOZNIVANI_MRAZU, zvon: nejvic.omracen > z5.omraceni * 1.5 && nejvic.odhozen > TRVANI_ODHOZENI * 1.5,
      cep: nejvic.odhozen > TRVANI_ODHOZENI * 1.5, seminka: nejvic.seminko > z5.trvani * 1.5, korene: nejvic.drzen > z5.trvani * 1.5,
      stopa: nejvic.plamen > z5.trvani * 1.5 && nejvic.hori > z5.hori * 1.5, prak: nejvic.kamen > ZIVOT_KAMENE,
    }[id];
    // Co má Příval u které zbraně přidat i ve hře (u ostatních stačí čísla: kusy čtou přímo ze staty).
    const vic = { blesk: nejvic.blesku >= 2, lucerna: h.zasahuUhliky > 0, stopa: nejvic.bocnich === VSE.prival }[id] ?? st[ZBRANE[id].pasivy.prival] === z5[ZBRANE[id].pasivy.prival] + VSE.prival;
    pasivyZbrani.zbrane[id] = { zabito: h.zabito, kritu: h.kritu, ozven: ozvena, otreseno: h.otreseno, uhliky: h.zasahuUhliky, vydrz: delsi, prival: vic };
    if (!(h.zabito > 0) || !(h.kritu > 0) || !(ozvena > 0) || !delsi || !vic) chybyPasiv.push(`${id} se všemi pasivami: ${JSON.stringify(pasivyZbrani.zbrane[id])}`);
    if ((id === 'krumpace' || id === 'blesk' || id === 'svetlusky') !== (h.otreseno > 0)) chybyPasiv.push(`${id}: otřes ${h.otreseno}× (má jen u okamžitých zásahů)`);
  }
}

// Pasivy pro přežití (Zbroj, Regenerace, Štěstí). Data a ikony sedí, Zbroj strop nemá a ostatní ano. Zbroj ubere
// z dotyku i z jedového oblaku po houbákovi svůj počet (aspoň 1 projde, červené číslo ukáže zmenšenou ránu),
// z bahenního oblaku nic (to je mapa, láva se hlídá u Sopky). Regenerace léčí přesně svůj počet za sekundu až po
// plné životy, zelené číslo vyskočí nejvýš jednou za CISLO_REGENERACE. Štěstí ze stejných losů dá víc srdcí
// a magnetů, nad stropem už ne, s trvalým Štěstím se násobí a šance na rarity karet nemění.
const pasivyPreziti = {};
const relBlizkoP = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
{
  for (const id of ['zbroj', 'regenerace', 'stesti']) {
    const p = PASIVY[id];
    if (!p || !jmenaSpritu.has(p.ikona) || !p.popis || !p.popisDal || !(p.pricti > 0)) chybyPasiv.push(`pasiva ${id}: chybí data nebo ikona`);
  }
  if (STROPY.pasivy.zbroj !== undefined || !(STROPY.pasivy.regenerace > 0) || !(STROPY.pasivy.stesti > 0)) chybyPasiv.push('Zbroj má mít min. ránu 1, Regenerace a Štěstí strop');
  const ticha = () => {
    const h = novaHra(vytvorRng(seminko));
    h.zbrane = {};
    Object.assign(h, { doSpawnu: Infinity, doBedny: Infinity, doZamcene: Infinity, dalsiBoss: Infinity, dalsiSmecka: null, dalsiKupec: Infinity });
    return h;
  };
  const sUrovni = (h, id, urovni) => {
    for (let u = 0; u < urovni; u++) vyber(h, karta(h, 'pasiva', id, 'bezna'));
    return h;
  };
  // Zbroj: jedna rána kostlivce nebo oblaku, hrdina bez chvíle klidu.
  const rana = (urovni, zdroj) => {
    const h = sUrovni(ticha(), 'zbroj', urovni);
    h.hrdina.nezranitelny = 0;
    if (zdroj === 'kostlivec') pridejNepritele(h, 'kostlivec', 5, 0).rychlost = 0;
    else h.oblaky.push({ x: 0, y: 0, zivot: TRVANI_OBLAKU - NAFUKOVANI_OBLAKU - 0.1, polomer: 36, ...(zdroj === 'bahno' ? { druh: 'bahno', jed: 9 } : {}) });
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    const ubylo = h.hrdina.maxHp - h.hrdina.hp;
    const cislo = h.cisla.find((c) => c.barva === 'zraneni' || c.barva === 'jed');
    if (!cislo || cislo.hodnota !== ubylo) chybyPasiv.push(`Zbroj ${urovni} (${zdroj}): ubylo ${ubylo}, číslo ${cislo?.text}`);
    return ubylo;
  };
  const rany = {};
  for (const zdroj of ['kostlivec', 'houbak', 'bahno']) {
    const plna = rana(0, zdroj);
    rany[zdroj] = [plna, rana(3, zdroj), rana(99, zdroj)];
    const cekam = zdroj === 'bahno' ? [plna, plna, plna] : [plna, Math.max(1, plna - 3), 1];
    if (!(plna > 3) || rany[zdroj].join() !== cekam.join()) chybyPasiv.push(`Zbroj u ${zdroj}: rány ${rany[zdroj]} místo ${cekam}`);
  }
  pasivyPreziti.zbroj_rany_0_3_99 = rany;
  // Regenerace: 5 úrovní = 2 životy za sekundu, ze 40 životů za 3 s na 46, pak po plné a dál nic.
  const r = sUrovni(ticha(), 'regenerace', 5);
  r.hrdina.nezranitelny = 1e9;
  if (!relBlizkoP(r.hrdina.regenerace, PASIVY.regenerace.pricti * 5)) chybyPasiv.push(`Regenerace na 5. úrovni ${r.hrdina.regenerace}/s`);
  r.hrdina.hp = 40;
  const videnaZelena = new Set();
  hraj(r, 3, (g) => { for (const c of g.cisla) if (c.barva === 'leceni' && c.regenerace) videnaZelena.add(c); });
  const zelena = [...videnaZelena];
  const odstupy = zelena.slice(1).map((c, i) => c.od - zelena[i].od);
  if (Math.abs(r.hrdina.hp - (40 + r.hrdina.regenerace * 3)) > 1e-6) chybyPasiv.push(`Regenerace za 3 s: ${r.hrdina.hp} životů`);
  if (zelena.length < 2 || zelena.length > 3 || odstupy.some((d) => d < CISLO_REGENERACE - 1e-6) || zelena.some((c) => !(c.hodnota >= 1))) {
    chybyPasiv.push(`Regenerace: zelená čísla ${zelena.map((c) => `${c.text} v ${c.od.toFixed(2)}`)}`);
  }
  r.hrdina.hp = r.hrdina.maxHp - 0.5;
  hraj(r, 2);
  if (r.hrdina.hp !== r.hrdina.maxHp) chybyPasiv.push(`Regenerace přelezla plné životy (${r.hrdina.hp} z ${r.hrdina.maxHp})`);
  const naStropu = sUrovni(ticha(), 'regenerace', 40).hrdina.regenerace;
  if (!relBlizkoP(naStropu, STROPY.pasivy.regenerace)) chybyPasiv.push(`Regenerace na 40. úrovni ${naStropu}/s`);
  pasivyPreziti.regenerace = { za_3_s_z_40: Math.round(r.vylecenoRegeneraci * 100) / 100, zelenych_cisel: zelena.length, na_40_urovni: naStropu };
  // Štěstí: 3000 nepřátel padne naráz, stejné losy z rng.
  const padloS = (urovni, vylepseni = {}) => {
    const h = sUrovni(novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, vylepseni), 'stesti', urovni);
    h.hrdina.nezranitelny = 10;
    for (let i = 0; i < 3000; i++) h.nepratele.push({ druh: 'netopyr', x: 30, y: 0, hp: 0, maxHp: 1, rychlost: 0, poskozeni: 0, xp: 0, polomer: 1, zasazen: 0, zasahKrumpacem: 0 });
    aktualizuj(h, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    return h.predmety.filter((p) => p.druh === 'srdce' || p.druh === 'magnet').length;
  };
  const urovniNaStrop = Math.round(STROPY.pasivy.stesti / PASIVY.stesti.pricti);
  const padloP = { 0: padloS(0), 5: padloS(5), [urovniNaStrop]: padloS(urovniNaStrop), 30: padloS(30) };
  const sTrvalym = padloS(5, { stesti: VYLEPSENI.stesti.max });
  if (!(padloP[0] > 0 && padloP[5] > padloP[0] * 1.4 && padloP[5] < padloP[0] * 2.6)) chybyPasiv.push(`Štěstí 5: ${padloP[0]} → ${padloP[5]} srdcí a magnetů`);
  if (!(padloP[urovniNaStrop] > padloP[5]) || padloP[30] !== padloP[urovniNaStrop]) chybyPasiv.push(`Štěstí nad stropem: ${JSON.stringify(padloP)}`);
  if (!(sTrvalym > padloP[5])) chybyPasiv.push(`Štěstí s trvalým Štěstím ${sTrvalym} (bez ${padloP[5]})`);
  const stastna = sUrovni(ticha(), 'stesti', 30);
  if (JSON.stringify(sanceRarit(stastna)) !== JSON.stringify(sanceRarit(ticha()))) chybyPasiv.push('pasiva Štěstí změnila rarity karet');
  pasivyPreziti.stesti_srdce_a_magnety = { ...padloP, s_trvalym_max_a_5: sTrvalym };
}

// Pasivy II. Upíří zub: zabití s šancí vrátí přesně ZIVOT_ZA_SANI (jen když tolik chybí), nejvýš SANI_ZA_SEKUNDU
// za sekundu, kapka krve doletí a zmizí, růžová čísla se sčítají a náhoda vln (rng) se neposune. Trnová zbroj: kdo
// hrdinu kousne nebo zasáhne schopností (i ranou z dálky), dostane zpátky přesně podíl rány (z rány před Zbrojí, se
// Sílou), jedový oblak nikoho. Štít: hned po vybrání je bublina, zastaví celou ránu od nepřátel (modrá 0, žádný
// úbytek, Trnová zbroj vrací dál), pak se dobíjí přesně dobitiStitu s, další úrovně zkracují dobití až po
// MIN_DOBITI_STITU (i rozběhnuté), láva ani bahno ji nespotřebují. Moudrost: krystal dá přesně o násobek víc
// zkušeností (s trvalými Zkušenostmi ještě víc). Chamtivost: duše za hru vzrostou o násobek (jen celé), bez ní nic.
// Nakonec se všemi pěti ve hře od 10. minuty: sání, odplata trnů i zastavené rány opravdu nastanou.
const pasivyII = {};
{
  for (const id of ['upiriZub', 'trnovaZbroj', 'stit', 'moudrost', 'chamtivost']) {
    const p = PASIVY[id];
    if (!p || !jmenaSpritu.has(p.ikona) || !p.popis || !p.popisDal) chybyPasiv.push(`pasiva ${id}: chybí data nebo ikona`);
  }
  if (!PASIVY.stit?.popisPrvni?.includes(`${DOBITI_STITU} s`) || popisUrovni('pasiva', 'stit', 0, 2).join('|') !== `${PASIVY.stit.popisPrvni}|${PASIVY.stit.popis}`) {
    chybyPasiv.push(`Štít: karta prvních úrovní „${popisUrovni('pasiva', 'stit', 0, 2)}“`);
  }
  if (STROPY.pasivy.trnovaZbroj !== undefined || !(STROPY.pasivy.upiriZub > 0) || !(STROPY.pasivy.moudrost > 1) || !(STROPY.pasivy.chamtivost > 1)) chybyPasiv.push('stropy Pasiv II nesedí');
  const ticha = () => {
    const h = novaHra(vytvorRng(seminko));
    h.zbrane = {};
    Object.assign(h, { doSpawnu: Infinity, doBedny: Infinity, doZamcene: Infinity, dalsiBoss: Infinity, dalsiSmecka: null, dalsiKupec: Infinity });
    return h;
  };
  const sUrovni = (h, id, urovni) => {
    for (let u = 0; u < urovni; u++) vyber(h, karta(h, 'pasiva', id, 'bezna'));
    return h;
  };
  const krok = (h, dt = DT) => aktualizuj(h, dt, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const padly = (h, x = 300, y = 0) => {
    const n = pridejNepritele(h, 'netopyr', x, y);
    n.hp = 0;
    return n;
  };

  // Upíří zub: šance na 5. úrovni, 2000 zabití po jednom (pauza sání vždy vypršela), zraněný hrdina.
  const z = sUrovni(ticha(), 'upiriZub', 5);
  z.hrdina.nezranitelny = 1e9;
  if (!relBlizkoP(z.hrdina.upiri, PASIVY.upiriZub.pricti * 5)) chybyPasiv.push(`Upíří zub na 5. úrovni ${z.hrdina.upiri}`);
  for (let i = 0; i < 2000; i++) {
    z.hrdina.hp = 10;
    z.hrdina.doSani = 0;
    padly(z);
    krok(z, 0.0001);
  }
  const podilSani = z.sani / 2000;
  if (Math.abs(podilSani - z.hrdina.upiri) > 0.03) chybyPasiv.push(`Upíří zub léčil u ${(podilSani * 100).toFixed(1)} % zabití místo ${z.hrdina.upiri * 100} %`);
  // Jistá šance a zabití každý snímek: nejvýš SANI_ZA_SEKUNDU za sekundu, každé přesně ZIVOT_ZA_SANI, kapky a čísla.
  const j = ticha();
  j.hrdina.upiri = 1;
  j.hrdina.nezranitelny = 1e9;
  j.hrdina.hp = 10;
  const kdySal = [];
  const ruzova = new Set();
  let maxKapek = 0;
  for (let t = 0; t < 3 - 1e-9; t += DT) {
    const pred = j.sani;
    padly(j);
    krok(j);
    if (j.sani > pred) kdySal.push(j.cas);
    maxKapek = Math.max(maxKapek, j.kapky.length);
    for (const c of j.cisla) if (c.barva === 'sani') ruzova.add(c);
  }
  const odstupySani = kdySal.slice(1).map((c, i) => c - kdySal[i]);
  if (kdySal.length < 3 * SANI_ZA_SEKUNDU - 1 || kdySal.length > 3 * SANI_ZA_SEKUNDU + 1 || odstupySani.some((d) => d < 1 / SANI_ZA_SEKUNDU - 1e-6)) {
    chybyPasiv.push(`Upíří zub sál ${kdySal.length}× za 3 s (odstupy ${odstupySani.map((d) => d.toFixed(2))})`);
  }
  if (Math.abs(j.hrdina.hp - (10 + j.sani * ZIVOT_ZA_SANI)) > 1e-9 || j.vylecenoSanim !== j.sani * ZIVOT_ZA_SANI) chybyPasiv.push(`Upíří zub vrátil ${j.hrdina.hp - 10} životů za ${j.sani} sání`);
  const souctem = [...ruzova].reduce((a, c) => a + c.hodnota, 0);
  if (souctem !== j.vylecenoSanim || !(ruzova.size < j.sani) || [...ruzova].some((c) => c.text !== `+${c.hodnota}`)) chybyPasiv.push(`Upíří zub: růžová čísla ${[...ruzova].map((c) => c.text)} za ${j.sani} sání`);
  if (!(maxKapek >= 1)) chybyPasiv.push('Upíří zub: žádná kapka krve');
  hraj(j, LET_KAPKY + DT);
  if (j.kapky.length) chybyPasiv.push('kapka krve nezmizela');
  // Plné životy (chybí míň než ZIVOT_ZA_SANI): nic.
  j.hrdina.hp = j.hrdina.maxHp - ZIVOT_ZA_SANI / 2;
  j.hrdina.doSani = 0;
  const saniPlne = j.sani;
  padly(j);
  krok(j);
  if (j.sani !== saniPlne || j.hrdina.hp !== j.hrdina.maxHp - ZIVOT_ZA_SANI / 2) chybyPasiv.push('Upíří zub léčil skoro plného hrdinu');
  // Náhoda vln: stejná zabití se Zubem i bez něj, rng potom dá stejné číslo.
  const bezZubu = ticha();
  const seZubem = ticha();
  seZubem.hrdina.upiri = 1;
  for (const h of [bezZubu, seZubem]) {
    h.hrdina.nezranitelny = 1e9;
    h.hrdina.hp = 10;
    for (let i = 0; i < 60; i++) {
      padly(h, 300 + i, 0);
      krok(h);
    }
  }
  if (!(seZubem.sani > 0) || bezZubu.rng.dalsi() !== seZubem.rng.dalsi()) chybyPasiv.push('Upíří zub posunul náhodu vln');
  pasivyII.upiri_zub = {
    sance_5_uroven: z.hrdina.upiri, leceno_z_2000: z.sani, za_3_s_jista_sance: kdySal.length, ruzovych_cisel: ruzova.size,
    strop: hodnotaPasivy('upiriZub', 60),
  };

  // Trnová zbroj: kostlivec na dotek (stojí, nepadne), jedna rána.
  const trny = (urovni, { sila = 1, zbroj = 0, stit = 0 } = {}) => {
    const h = sUrovni(sUrovni(sUrovni(ticha(), 'trnovaZbroj', urovni), 'zbroj', zbroj), 'stit', stit);
    h.hrdina.sila = sila;
    h.hrdina.krit = 0;
    if (stit) krok(h);
    const n = pridejNepritele(h, 'kostlivec', 5, 0);
    Object.assign(n, { rychlost: 0, hp: 1e6, maxHp: 1e6 });
    h.hrdina.nezranitelny = 0;
    krok(h);
    return { h, ztratil: h.hrdina.maxHp - h.hrdina.hp, vratil: 1e6 - n.hp, rana: n.poskozeni, n };
  };
  const t0 = trny(0);
  const t1 = trny(1);
  const t5 = trny(5, { sila: 2 });
  const tZ = trny(1, { zbroj: 3 });
  const tS = trny(1, { stit: 1 });
  if (t0.vratil !== 0 || t0.h.odvetTrnu !== 0) chybyPasiv.push(`bez Trnové zbroje dostal kostlivec ${t0.vratil}`);
  if (t1.ztratil !== t1.rana || t1.vratil !== Math.round(t1.rana * PASIVY.trnovaZbroj.pricti) || t1.h.odvetTrnu !== 1 || !(t1.h.ostny > 0)) {
    chybyPasiv.push(`Trnová zbroj 1: rána ${t1.rana}, vrátila ${t1.vratil}`);
  }
  if (!t1.h.cisla.some((c) => c.hodnota === t1.vratil && c.barva !== 'zraneni')) chybyPasiv.push('Trnová zbroj: nad kostlivcem chybí číslo');
  if (t5.vratil !== Math.round(t5.rana * PASIVY.trnovaZbroj.pricti * 5 * 2)) chybyPasiv.push(`Trnová zbroj 5 se Silou 2: vrátila ${t5.vratil} z rány ${t5.rana}`);
  if (tZ.ztratil !== Math.max(1, tZ.rana - 3) || tZ.vratil !== t1.vratil) chybyPasiv.push(`Trnová zbroj se Zbrojí: ztratil ${tZ.ztratil}, vrátila ${tZ.vratil}`);
  if (tS.ztratil !== 0 || tS.vratil !== t1.vratil || tS.h.zablokovano !== 1) chybyPasiv.push(`Trnová zbroj se Štítem: ztratil ${tS.ztratil}, vrátila ${tS.vratil}`);
  // Rázová vlna bosse (rána z dálky) se vrátí bossovi, jedový oblak nikomu.
  const tb = sUrovni(ticha(), 'trnovaZbroj', 1);
  tb.hrdina.sila = 1;
  tb.hrdina.krit = 0;
  const boss = pridejNepritele(tb, 'strazce', 400, 0);
  Object.assign(boss, { rychlost: 0, hp: 1e6, maxHp: 1e6 });
  tb.vlny.push({ x: 0, y: 0, r: 0, max: 60, poskozeni: 12, odhozeni: 0, zasahla: false, zdroj: boss });
  tb.hrdina.nezranitelny = 0;
  krok(tb);
  const ranaVlnou = tb.hrdina.maxHp - tb.hrdina.hp;
  if (!(ranaVlnou > 0) || 1e6 - boss.hp !== Math.round(ranaVlnou * PASIVY.trnovaZbroj.pricti)) chybyPasiv.push(`Trnová zbroj: vlna ${ranaVlnou}, boss dostal ${1e6 - boss.hp}`);
  const to = sUrovni(ticha(), 'trnovaZbroj', 5);
  to.oblaky.push({ x: 0, y: 0, zivot: TRVANI_OBLAKU - NAFUKOVANI_OBLAKU - 0.1, polomer: 36 });
  to.hrdina.nezranitelny = 0;
  krok(to);
  if (!(to.hrdina.hp < to.hrdina.maxHp) || to.odvetTrnu !== 0) chybyPasiv.push('Trnová zbroj vrátila ránu jedového oblaku');
  pasivyII.trnova_zbroj = { rana: t1.rana, vratila_1: t1.vratil, vratila_5_se_silou_2: t5.vratil, se_zbroji_3: { ztratil: tZ.ztratil, vratila: tZ.vratil }, boss_z_vlny: 1e6 - boss.hp };

  // Štít: hned po vybrání bublina, rána kostlivce se zastaví celá, další projde, dobití přesně dobitiStitu.
  const s1 = sUrovni(ticha(), 'stit', 1);
  if (s1.hrdina.dobitiStitu !== DOBITI_STITU || s1.hrdina.stitHotov) chybyPasiv.push(`Štít na 1. úrovni: dobití ${s1.hrdina.dobitiStitu} s`);
  krok(s1);
  if (!s1.hrdina.stitHotov) chybyPasiv.push('Štít není hned po vybrání hotový');
  const kost = pridejNepritele(s1, 'kostlivec', 5, 0);
  kost.rychlost = 0;
  s1.hrdina.nezranitelny = 0;
  krok(s1);
  const nula = s1.cisla.find((c) => c.barva === 'stit');
  if (s1.hrdina.hp !== s1.hrdina.maxHp || s1.hrdina.stitHotov || s1.zablokovano !== 1 || !nula || nula.text !== '0' || nula.hodnota !== kost.poskozeni || s1.cisla.some((c) => c.barva === 'zraneni')) {
    chybyPasiv.push(`Štít nezastavil ránu (${s1.hrdina.hp}/${s1.hrdina.maxHp}, číslo ${nula?.text})`);
  }
  if (!(s1.prasklStit > 0) || !(s1.hrdina.nezranitelny > 0)) chybyPasiv.push('Štít: po zastavení chybí prasknutí nebo chvíle klidu');
  s1.hrdina.nezranitelny = 0;
  krok(s1);
  if (s1.hrdina.hp !== s1.hrdina.maxHp - kost.poskozeni) chybyPasiv.push('rána po prasknutí štítu neprošla');
  s1.nepratele = [];
  let dobitoZa = null;
  const odPrasknuti = s1.cas - DT;
  for (let t = 0; t < DOBITI_STITU + 1 && dobitoZa === null; t += DT) {
    s1.hrdina.nezranitelny = 1e9;
    krok(s1);
    if (s1.hrdina.stitHotov) dobitoZa = s1.cas - odPrasknuti;
  }
  if (dobitoZa === null || Math.abs(dobitoZa - DOBITI_STITU) > 2 * DT) chybyPasiv.push(`Štít se dobil za ${dobitoZa} s místo ${DOBITI_STITU}`);
  // Úrovně zkracují dobití až po MIN_DOBITI_STITU, nová úroveň zkrátí i rozběhnuté dobíjení.
  const naMinimu = 1 + Array.from({ length: 200 }, (_, i) => i + 1).findIndex((u) => hodnotaPasivy('stit', u) === STROPY.pasivy.stit);
  const dobiti = Object.fromEntries([1, 5, 10, naMinimu - 1, naMinimu, 60].map((u) => [u, sUrovni(ticha(), 'stit', u).hrdina.dobitiStitu]));
  if (dobiti[5] !== DOBITI_STITU - 4 * -PASIVY.stit.pricti || !(dobiti[10] < dobiti[5]) || !(dobiti[naMinimu - 1] > MIN_DOBITI_STITU)
    || dobiti[naMinimu] !== MIN_DOBITI_STITU || dobiti[60] !== MIN_DOBITI_STITU) chybyPasiv.push(`Štít: dobití podle úrovní ${JSON.stringify(dobiti)}`);
  const zkrat = sUrovni(ticha(), 'stit', 1);
  krok(zkrat);
  zkrat.hrdina.stitHotov = false;
  zkrat.hrdina.doStitu = DOBITI_STITU;
  sUrovni(zkrat, 'stit', 4);
  krok(zkrat);
  if (!(zkrat.hrdina.doStitu <= dobiti[5])) chybyPasiv.push(`Štít: po nové úrovni zbývá dobíjet ${zkrat.hrdina.doStitu} s`);
  // Bahno ani láva bublinu nespotřebují, jedový oblak po houbákovi ano.
  const oblakSeStitem = (druh) => {
    const h = sUrovni(ticha(), 'stit', 1);
    krok(h);
    h.oblaky.push({ x: 0, y: 0, zivot: TRVANI_OBLAKU - NAFUKOVANI_OBLAKU - 0.1, polomer: 36, ...(druh === 'bahno' ? { druh: 'bahno', jed: 9 } : {}) });
    h.hrdina.nezranitelny = 0;
    krok(h);
    return { zraneno: h.hrdina.hp < h.hrdina.maxHp, stit: h.hrdina.stitHotov };
  };
  const bahno = oblakSeStitem('bahno');
  const houbak = oblakSeStitem('houbak');
  if (!bahno.zraneno || !bahno.stit) chybyPasiv.push('Štít zastavil bahenní oblak');
  if (houbak.zraneno || houbak.stit) chybyPasiv.push('Štít nezastavil jedový oblak');
  pasivyII.stit = { dobiti_podle_urovne_s: dobiti, dobil_se_za_s: dobitoZa && Math.round(dobitoZa * 100) / 100, zastavena_rana: nula?.hodnota };

  // Moudrost: krystal za 1 zkušenost.
  const zkus = (h) => {
    h.krystaly.push({ x: 0, y: 0, xp: 1 });
    krok(h);
    return h.hrdina.xp;
  };
  const xp0 = zkus(ticha());
  const xp5 = zkus(sUrovni(ticha(), 'moudrost', 5));
  const sTrvalymi = (() => {
    const h = sUrovni(novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, { zkusenosti: VYLEPSENI.zkusenosti.max }), 'moudrost', 5);
    h.zbrane = {};
    Object.assign(h, { doSpawnu: Infinity, doBedny: Infinity, doZamcene: Infinity, dalsiBoss: Infinity, dalsiSmecka: null, dalsiKupec: Infinity });
    return zkus(h);
  })();
  if (!relBlizkoP(xp5, xp0 * (1 + PASIVY.moudrost.nasobek) ** 5)) chybyPasiv.push(`Moudrost 5: krystal dal ${xp5} místo ${xp0 * 1.1 ** 5}`);
  if (!relBlizkoP(sTrvalymi, xp5 * (1 + VYLEPSENI.zkusenosti.nasobek * VYLEPSENI.zkusenosti.max))) chybyPasiv.push(`Moudrost s trvalými Zkušenostmi: ${sTrvalymi}`);
  const moudrost60 = sUrovni(ticha(), 'moudrost', 60).hrdina.zkusenosti;
  if (!relBlizkoP(moudrost60, STROPY.pasivy.moudrost)) chybyPasiv.push(`Moudrost na 60. úrovni ${moudrost60}`);
  pasivyII.moudrost = { krystal_1: xp0, s_5_urovnemi: Math.round(xp5 * 1000) / 1000, i_s_trvalymi: Math.round(sTrvalymi * 1000) / 1000, na_60_urovni: moudrost60 };

  // Chamtivost: duše za hru, jen celé, bez pasivy nebo s rozbitým číslem nic navíc.
  const hraDusi = { cas: 400, zabito: 100, zabitoBossu: 1, zlataky: 10 };
  const zaklad = dusZaHru(hraDusi).celkem;
  const nasobek5 = sUrovni(ticha(), 'chamtivost', 5).hrdina.chamtivost;
  const s5 = dusZaHru({ ...hraDusi, hrdina: { chamtivost: nasobek5 } });
  if (zaklad !== 37 || dusZaHru(hraDusi).chamtivost !== 0) chybyPasiv.push(`duše bez Chamtivosti ${zaklad}`);
  if (!relBlizkoP(nasobek5, (1 + PASIVY.chamtivost.nasobek) ** 5) || s5.chamtivost !== Math.floor(37 * (nasobek5 - 1)) || s5.celkem !== 37 + s5.chamtivost) chybyPasiv.push(`Chamtivost 5: ${JSON.stringify(s5)}`);
  for (const spatna of [NaN, 0.5, -3, 'hodně', Infinity]) {
    if (dusZaHru({ ...hraDusi, hrdina: { chamtivost: spatna } }).celkem !== 37) chybyPasiv.push(`Chamtivost ${spatna} změnila duše`);
  }
  const chamtivost60 = sUrovni(ticha(), 'chamtivost', 60).hrdina.chamtivost;
  if (!relBlizkoP(chamtivost60, STROPY.pasivy.chamtivost)) chybyPasiv.push(`Chamtivost na 60. úrovni ${chamtivost60}`);
  pasivyII.chamtivost = { duse_bez: zaklad, s_5_urovnemi: s5.celkem, nasobek_60: chamtivost60 };

  // Ve hře: jiskra a krumpáče na 5., všech pět pasiv na 8. úrovni, od 10. minuty 40 s vestoje (ať na hrdinu
  // nepřátelé dosáhnou), s milionem životů.
  const v = novaHra(vytvorRng(seminko));
  v.zbrane = { jiskra: { uroven: ZAKLAD_UROVNI, nabiti: 0 }, krumpace: { uroven: ZAKLAD_UROVNI, nabiti: 0 } };
  Object.assign(v, { cas: 600, dalsiBoss: 1e9, dalsiSmecka: null, dalsiPrichod: 4 });
  for (const id of ['upiriZub', 'trnovaZbroj', 'stit', 'moudrost', 'chamtivost']) sUrovni(v, id, 8);
  v.hrdina.maxHp = v.hrdina.hp = 1e6;
  for (let t = 0; t < 40 && !v.konec; t += DT) {
    aktualizuj(v, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (v.porovnani) rozhodniKus(v, false);
    if (v.volby) vyber(v, { druh: 'leceni', kroku: 1 });
    if (v.obchod) odejdiOdKupce(v);
    if (!Number.isFinite(v.hrdina.hp) || v.kapky.length > 24) throw new Error('Pasivy II ve hře: NaN nebo moc kapek');
  }
  pasivyII.ve_hre_od_10_min = {
    sani: v.sani, odvet_trnu: v.odvetTrnu, vraceno_trny: Math.round(v.vracenoTrny), zastaveno_ran: v.zablokovano, stitu_dobito: v.stituDobito, zabito: v.zabito,
  };
  if (!(v.sani > 0) || !(v.odvetTrnu > 0) || !(v.zablokovano > 1) || !(v.stituDobito > 1)) chybyPasiv.push(`Pasivy II ve hře: ${JSON.stringify(pasivyII.ve_hre_od_10_min)}`);
}

// Úrovně bez stropu. Každá zbraň až do 200. úrovně: do 5. bez bonusu (stejně jako dřív), pak každá úroveň víc
// poškození, každá třetí ještě kus, nabíjení nebo velikost, dokud to jde, a nic přes strop. Řádky karty sedí s tím,
// co úroveň opravdu přidala. Data růstu (poradi, čísla, texty) musí k sobě pasovat.
const chybyUrovni = [];
const rostlyDo = {};
const relBlizko = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
for (const [id, z] of Object.entries(ZBRANE)) {
  const { dal } = z;
  const pet = statyZbrane(id, ZAKLAD_UROVNI);
  const pole = { nabiti: dal.nabiti ?? [], velikost: dal.velikost ?? [] };
  for (const co of dal.poradi) {
    const ma = co === 'pocet' ? Boolean(dal.pocet) : pole[co]?.length > 0;
    if (!ma || !dal.texty?.[co]) chybyUrovni.push(`${id}: ${co} v poradi bez čísel nebo textu`);
  }
  if (!dal.poskozeni?.length) chybyUrovni.push(`${id} nemá poškození, které by rostlo`);
  for (let u = 0; u <= ZAKLAD_UROVNI; u++) {
    const b = bonusZaUroven(id, u);
    if (b.poskozeni !== 1 || b.pocet !== 0 || b.nabiti !== 1 || b.velikost !== 1) chybyUrovni.push(`${id} má bonus už na ${u}. úrovni`);
  }
  let pred = pet;
  let posledni = ZAKLAD_UROVNI;
  const vynechane = [];
  for (let u = ZAKLAD_UROVNI + 1; u <= 200; u++) {
    const st = statyZbrane(id, u);
    if (!Object.values(st).every(Number.isFinite)) chybyUrovni.push(`${id} na ${u}. úrovni: ${JSON.stringify(st)}`);
    for (const p of dal.poskozeni) if (!(st[p] > pred[p])) chybyUrovni.push(`${id} na ${u}. úrovni: ${p} nevzrostlo`);
    for (const p of dal.poskozeni) if (!relBlizko(st[p], pet[p] * (1 + RUST_UROVNI.poskozeni * (u - ZAKLAD_UROVNI)))) chybyUrovni.push(`${id} na ${u}: ${p} ${st[p]}`);
    if (dal.pocet && st[dal.pocet] > (dal.maxPocet ?? STROPY.pocet)) chybyUrovni.push(`${id} na ${u}. úrovni má ${st[dal.pocet]} kusů`);
    for (const p of pole.nabiti) if (st[p] < pet[p] * STROPY.nabiti - 1e-9) chybyUrovni.push(`${id} na ${u}: ${p} pod stropem`);
    for (const p of pole.velikost) if (st[p] > pet[p] * STROPY.velikost + 1e-9) chybyUrovni.push(`${id} na ${u}: ${p} přes strop`);
    const zmena = (dal.pocet && st[dal.pocet] !== pred[dal.pocet]) || [...pole.nabiti, ...pole.velikost].some((p) => st[p] !== pred[p]);
    const treti = (u - ZAKLAD_UROVNI) % RUST_UROVNI.kazda === 0;
    if (zmena && !treti) chybyUrovni.push(`${id} na ${u}. úrovni přidal víc než poškození`);
    if (!zmena && treti) vynechane.push(u);
    if (zmena) posledni = u;
    const popis = popisUrovni('zbran', id, u - 1, u);
    if (popis[0] !== `+${Math.round(RUST_UROVNI.poskozeni * 100)} % poškození` || popis.length !== (zmena ? 2 : 1)) chybyUrovni.push(`${id} na ${u}: karta „${popis}“`);
    pred = st;
  }
  if (vynechane.some((u) => u < posledni)) chybyUrovni.push(`${id} vynechal růst na ${vynechane.filter((u) => u < posledni)}, i když ještě mohl`);
  // Na 200. úrovni je na stropu všechno, co zbraň umí zvětšovat.
  const st = statyZbrane(id, 200);
  if (dal.poradi.includes('pocet') && st[dal.pocet] !== (dal.maxPocet ?? STROPY.pocet)) chybyUrovni.push(`${id} na 200: ${st[dal.pocet]} kusů`);
  for (const co of ['nabiti', 'velikost']) {
    if (!dal.poradi.includes(co)) continue;
    for (const p of pole[co]) if (!relBlizko(st[p], pet[p] * STROPY[co])) chybyUrovni.push(`${id} na 200: ${p} ${st[p]} není na stropu`);
  }
  rostlyDo[id] = posledni;
}
// Stupně rámečku.
for (const [u, stupen] of [[1, 0], [4, 0], [5, 1], [9, 1], [10, 2], [14, 2], [15, 3], [99, 3]]) {
  if (stupenUrovne(u) !== stupen) chybyUrovni.push(`úroveň ${u} má stupeň ${stupenUrovne(u)}`);
}
// Pasivy: 60 běžných karet. Do 5. úrovně plný díl jako dřív, dál menší díl až po strop, na stropu poškození.
const pasivy60 = {};
for (const [id, p] of Object.entries(PASIVY)) {
  const h = novaHra(vytvorRng(seminko));
  const zaklad = h.hrdina[p.vlastnost];
  const sila0 = h.hrdina.sila;
  let predHodnota = zaklad;
  let predSila = sila0;
  // Záporný nasobek (Rychlé ruce) vlastnost zmenšuje, „přidat“ je pak zmenšit.
  const roste = (p.pricti ?? p.nasobek) > 0;
  const pridal = (ted, pred) => (roste ? ted > pred : ted < pred);
  // Příval má strop už na 3. úrovni, karta pak dá poškození i pod 5. úrovní.
  const naStropuOd = Array.from({ length: 60 }, (_, i) => i + 1).find((u) => hodnotaPasivy(id, u) === hodnotaPasivy(id, u - 1)) ?? Infinity;
  for (let u = 1; u <= 60; u++) {
    const v = karta(h, 'pasiva', id, 'bezna');
    if (v.uroven !== u || v.popis.length !== 1) chybyUrovni.push(`${id}: karta na ${u}. úroveň ${v.uroven} „${v.popis}“`);
    if (u < naStropuOd && u <= ZAKLAD_UROVNI && v.popis[0] !== (u === 1 && p.popisPrvni ? p.popisPrvni : p.popis)) chybyUrovni.push(`${id}: karta na ${u}. úroveň „${v.popis}“`);
    vyber(h, v);
    const ted = h.hrdina[p.vlastnost];
    const ocekavano = p.pricti ? zaklad + hodnotaPasivy(id, u) : zaklad * hodnotaPasivy(id, u);
    if (!relBlizko(ted, ocekavano)) chybyUrovni.push(`${id} na ${u}: ${p.vlastnost} ${ted} místo ${ocekavano}`);
    if (u === Math.min(ZAKLAD_UROVNI, naStropuOd - 1) && !relBlizko(ted, p.pricti ? zaklad + p.pricti * u : zaklad * (1 + p.nasobek) ** u)) chybyUrovni.push(`${id}: ${u}. úroveň jinak než dřív`);
    if (!pridal(ted, predHodnota) && !(h.hrdina.sila > predSila)) chybyUrovni.push(`${id} na ${u}. úrovni nic nepřidal`);
    if (u >= naStropuOd && !(h.hrdina.sila > predSila)) chybyUrovni.push(`${id} na ${u}. úrovni na stropu nepřidal poškození`);
    if (u > ZAKLAD_UROVNI && pridal(ted, predHodnota) && !p.pricti && !(Math.abs(ted / predHodnota - 1) < Math.abs(p.nasobek))) chybyUrovni.push(`${id} na ${u}. úrovni nepřidal menší díl`);
    predHodnota = ted;
    predSila = h.hrdina.sila;
  }
  const nasobek = p.pricti ? null : h.hrdina[p.vlastnost] / zaklad;
  const strop = STROPY.pasivy[id];
  const naKonci = p.pricti ? h.hrdina[p.vlastnost] - zaklad : nasobek;
  if (strop && !relBlizko(naKonci, strop)) chybyUrovni.push(`${id} na 60. úrovni ${naKonci} místo stropu ${strop}`);
  if (strop && !(h.hrdina.sila > sila0)) chybyUrovni.push(`${id} na stropu nepřidává poškození`);
  if (!strop && id !== 'sila' && h.hrdina.sila !== sila0) chybyUrovni.push(`${id} bez stropu změnil poškození`);
  if (strop && popisUrovni('pasiva', id, 59, 60)[0] !== `+${Math.round(SILA_ZA_PREBYTEK * 100)} % poškození všech zbraní`) chybyUrovni.push(`${id}: karta na stropu`);
  pasivy60[id] = p.pricti ? `+${Math.round((h.hrdina[p.vlastnost] - zaklad) * 1000) / 1000}` : `${Math.round(nasobek * 100) / 100}×`;
}
// Nabídka nikdy nedojde: se vším na 50. úrovni jsou pořád tři různé karty na další úrovně.
{
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: 50, nabiti: 0 }]));
  h.pasivy = Object.fromEntries(Object.keys(PASIVY).map((id) => [id, 50]));
  for (let i = 0; i < 50; i++) {
    const v = nabidka(h);
    if (v.length !== 3 || v.some((k) => k.druh === 'leceni' || k.od !== 50 || k.uroven <= 50) || new Set(v.map((k) => k.id)).size !== 3) {
      chybyUrovni.push(`nabídka se vším na 50: ${v.map((k) => `${k.id} ${k.od}→${k.uroven}`)}`);
      break;
    }
  }
}
// Všechny zbraně na 60. úrovni 30 s v plné hře (od 10. minuty): nic se nerozbije a limity drží.
const silna = novaHra(vytvorRng(seminko));
silna.zbrane = Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: 60, nabiti: 0 }]));
silna.cas = 600;
silna.dalsiBoss = 600 + 5;
silna.dalsiSmecka = 600 + 2;
silna.dalsiPrichod = 4;
let silnaMaxStrel = 0;
let silnaMaxTrsu = 0;
let silnaMaxZon = 0;
let silnaMaxCisel = 0;
let silnaMaxSeminek = 0;
let silnaMaxVlnZvonu = 0;
let silnaMaxKorenu = 0;
let silnaMaxPlamenu = 0;
let silnaMaxKamenu = 0;
for (let t = 0; t < 30 && !silna.konec; t += DT) {
  aktualizuj(silna, DT, rozhodni(silna, t), SIRKA, VYSKA);
  silnaMaxCisel = Math.max(silnaMaxCisel, silna.cisla.length);
  // Koule cepu před výběrem karty (Příval nebo Rozpětí z karty platí až od dalšího snímku).
  const stCepu = staty(silna).cep;
  if (silna.koule.length !== stCepu.pocet || silna.koule.some((k, i) => Math.hypot(k.x - silna.hrdina.x, k.y - silna.hrdina.y) > delkaRetezu(stCepu, i) + 1e-6)) {
    chybyUrovni.push(`na 60. úrovni ${silna.koule.length} koulí cepu nebo koule dál než řetěz`);
  }
  obsluz(silna);
  silnaMaxStrel = Math.max(silnaMaxStrel, silna.strely.length);
  silnaMaxTrsu = Math.max(silnaMaxTrsu, silna.trny.length);
  silnaMaxZon = Math.max(silnaMaxZon, silna.ledoveZony.length);
  if (silna.svetlusky.length > STROPY.pocet + silna.hrdina.prival) chybyUrovni.push(`na 60. úrovni ${silna.svetlusky.length} světlušek`);
  silnaMaxSeminek = Math.max(silnaMaxSeminek, silna.seminka.length);
  silnaMaxVlnZvonu = Math.max(silnaMaxVlnZvonu, silna.vlnyZvonu.length);
  silnaMaxKorenu = Math.max(silnaMaxKorenu, silna.korene.length);
  silnaMaxPlamenu = Math.max(silnaMaxPlamenu, silna.plameny.length);
  silnaMaxKamenu = Math.max(silnaMaxKamenu, silna.oblazky.length);
  if (![silna.hrdina.x, silna.hrdina.y, silna.hrdina.hp].every(Number.isFinite) || silna.nepratele.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.hp))) {
    throw new Error(`NaN se zbraněmi na 60. úrovni v čase ${t.toFixed(1)} s`);
  }
}
if (silna.zabito === 0) chybyUrovni.push('zbraně na 60. úrovni nikoho nezabily');
if (silnaMaxZon > MAX_ZON || !(silna.zon > 0) || !(silna.zasahuSvetluskami > 0)) chybyUrovni.push(`na 60. úrovni ${silna.zon} zón (naráz ${silnaMaxZon}), ${silna.zasahuSvetluskami} zásahů světluškami`);
if (silnaMaxSeminek > MAX_SEMINEK || !(silna.vybuchlo > 0) || !(silna.omraceno > 0)) {
  chybyUrovni.push(`na 60. úrovni ${silna.vybuchlo} výbuchů semínek (naráz ${silnaMaxSeminek}), ${silna.zasahuCepem} zásahů cepem, ${silna.omraceno} omráčení`);
}
if (silnaMaxKorenu > MAX_KORENU || silnaMaxPlamenu > MAX_PLAMENU || silnaMaxKamenu > MAX_KAMENU) {
  chybyUrovni.push(`na 60. úrovni kořenů naráz ${silnaMaxKorenu}, plamenů ${silnaMaxPlamenu}, kamenů ${silnaMaxKamenu}`);
}
// Se vším na 60. úrovni padne každý dřív, než dojde ke kořenům nebo do ohně (lucerna sahá skoro stejně daleko).
// Kořeny, stopa a prak proto ještě každý sám na 60. úrovni 20 s v plné hře od 10. minuty (hrdina nezraněný,
// bot běhá, jinou zbraň nedostane): pracují, drží se limitů a nic nerozbijí.
const sami60 = {};
const zvukySamych = {};
for (const id of ['korene', 'stopa', 'prak']) {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = { [id]: { uroven: 60, nabiti: 0 } };
  Object.assign(h, { cas: 600, dalsiBoss: 605, dalsiSmecka: 602, dalsiPrichod: 4 });
  const nejvic = { korene: 0, plameny: 0, oblazky: 0 };
  for (let t = 0; t < 20; t += DT) {
    h.hrdina.nezranitelny = 1;
    aktualizuj(h, DT, rozhodni(h, t), SIRKA, VYSKA);
    // Jen ta jedna zbraň: karty se nahradí Odpočinkem, kus z truhly se nechá a od kupce odejde.
    if (h.porovnani) rozhodniKus(h, false);
    if (h.volby) vyber(h, { druh: 'leceni', kroku: 1 });
    if (h.obchod) odejdiOdKupce(h);
    for (const co of Object.keys(nejvic)) nejvic[co] = Math.max(nejvic[co], h[co].length);
    if (!Number.isFinite(h.hrdina.x) || h.nepratele.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.hp))) throw new Error(`NaN se samotnou zbraní ${id} na 60. úrovni`);
  }
  const prace = { korene: h.drzeno, stopa: h.paleniStopou, prak: h.odrazu }[id];
  zvukySamych[id] = h.zvuky;
  sami60[id] = { prace, zapaleno: h.zapaleno, zabito: h.zabito, naraz: nejvic };
  if (!(prace > 0) || !(h.zabito > 0) || nejvic.korene > MAX_KORENU || nejvic.plameny > MAX_PLAMENU || nejvic.oblazky > MAX_KAMENU) chybyUrovni.push(`${id} sám na 60. úrovni: ${JSON.stringify(sami60[id])}`);
}
if (!(sami60.stopa.zapaleno > 0)) chybyUrovni.push('stopa na 60. úrovni nikoho nezapálila');
// Ani na stropu trnů (s nejkratším nabíjením tříd) jich nevyraší víc, než unese MAX_TRNU.
for (const n of [1, ...Object.values(TRIDY).map((t) => t.nasobky.nabijeni ?? 1)]) {
  const st = statyZbrane('trny', 200, n);
  if (MAX_TRNU < st.pocet * Math.ceil(st.trvani / st.nabiti)) chybyUrovni.push(`na stropu trnů (nabíjení ${n}) víc trsů, než unese MAX_TRNU`);
  const m = statyZbrane('mraz', 200, n);
  if (MAX_ZON < m.pocet * Math.ceil((DOPAD_KRYSTALU + m.trvani) / m.nabiti)) chybyUrovni.push(`na stropu krystalů (nabíjení ${n}) víc zón, než unese MAX_ZON`);
  const se = statyZbrane('seminka', 200, n);
  if (MAX_SEMINEK < se.pocet * Math.ceil((ZRANI_SEMINKA + se.trvani) / se.nabiti)) chybyUrovni.push(`na stropu semínek (nabíjení ${n}) víc keřů, než unese MAX_SEMINEK`);
  // Koule cepu na stropu nepřeskočí nepřítele: za snímek uletí míň, než je koule a nejmenší nepřítel dohromady.
  const ce = statyZbrane('cep', 200, n);
  if (!(ce.rozmach * delkaRetezu(ce, ce.pocet - 1) * DT < 2 * (ce.velikost + 8))) chybyUrovni.push(`koule cepu na stropu (nabíjení ${n}) přeskočí nepřítele`);
  // Kořeny v zemi i vyražené a kameny v letu se na stropu vejdou do svých limitů.
  const ko = statyZbrane('korene', 200, n);
  if (MAX_KORENU < ko.pocet * Math.ceil((MAX_BEHU_KORENE + ko.trvani) / ko.nabiti)) chybyUrovni.push(`na stropu kořenů (nabíjení ${n}) víc kořenů, než unese MAX_KORENU`);
  const pr = statyZbrane('prak', 200, n);
  if (MAX_KAMENU < pr.pocet * Math.ceil(ZIVOT_KAMENE / pr.nabiti)) chybyUrovni.push(`na stropu praku (nabíjení ${n}) víc kamenů, než unese MAX_KAMENU`);
}
// Plameny se na žádné úrovni nevejdou do MAX_PLAMENU až za hrdinou, který běží 400 px/s (rychleji neběhá ani
// s Botami na stropu).
{
  for (let u = 1; u <= 200; u++) {
    const st = statyZbrane('stopa', u);
    if (MAX_PLAMENU < Math.ceil((400 * st.trvani) / (st.polomer * ROZESTUP_STOPY)) + 1) {
      chybyUrovni.push(`na ${u}. úrovni nechá rychlý hrdina víc plamenů, než unese MAX_PLAMENU`);
      break;
    }
  }
  // Kámen na nejvyšší rychlosti za snímek nepřeskočí nejmenšího nepřítele (svůj cíl nepřeletí nikdy, letí
  // nanejvýš k jeho středu).
  if (!(MAX_RYCHLOST_KAMENE * DT < 2 * (POLOMER_KAMENE + 8))) chybyUrovni.push('kámen na nejvyšší rychlosti přeskočí nepřítele');
}
const silnaStaty = staty(silna);

// Hrozba v tabulce: na začátku nic nezesílí, nic neubývá, vlna se nezrychlí pod nejkratší a čísla zůstanou konečná.
const nula = silaHrozby(0);
if (nula.uroven !== 1 || nula.zivoty !== 1 || nula.bossZivoty !== 1 || nula.poskozeni !== 1 || nula.rychlost !== 1 || nula.elita !== 0) {
  chybyHrozby.push(`hrozba na začátku něco mění: ${JSON.stringify(nula)}`);
}
const rostou = ['zivoty', 'bossZivoty', 'poskozeni', 'rychlost', 'davka', 'maxNepratel', 'elita', 'uroven'];
let predHrozba = nula;
for (let min = 0.25; min <= 120; min += 0.25) {
  const h = silaHrozby(min * 60);
  for (const co of rostou) if (!(h[co] >= predHrozba[co]) || !Number.isFinite(h[co])) chybyHrozby.push(`hrozba: ${co} v ${min}. min ubyla nebo není číslo`);
  if (!(h.vlna <= predHrozba.vlna) || h.vlna < HROZBA.nejkratsiVlna) chybyHrozby.push(`hrozba: vlna v ${min}. min ${h.vlna}`);
  if (h.rychlost > HROZBA.maxRychlost || h.elita > HROZBA.elitaMax || h.maxNepratel > HROZBA.stropNepratel || h.davka > HROZBA.maxDavka) chybyHrozby.push(`hrozba v ${min}. min přes strop`);
  if (h.uroven !== 1 + Math.floor(min)) chybyHrozby.push(`hrozba v ${min}. min má úroveň ${h.uroven}`);
  predHrozba = h;
}
if (silaHrozby(HROZBA.castejiOd * 60 + 600).elita <= silaHrozby(HROZBA.castejiOd * 60 - 1).elita) chybyHrozby.push('po castejiOd elit nepřibývá');
if (!textHrozby(7).startsWith('Hrozba 7') || !textHrozby(HROZBA.castejiOd + 1).includes('bossové')) chybyHrozby.push('texty hrozby nesedí');
// Noví nepřátelé dostanou životy, poškození a rychlost podle hrozby, elita víc, boss elitou nebude.
const pozdni = novaHra(vytvorRng(seminko));
pozdni.cas = 15 * 60;
const sila15 = silaHrozby(pozdni.cas);
const kost = pridejNepritele(pozdni, 'kostlivec', 9000, 0);
const elitniKost = pridejNepritele(pozdni, 'kostlivec', 9000, 50, true);
const elitniBoss = pridejNepritele(pozdni, 'obr', 9000, 100, true);
const zakladKostlivce = pridejNepritele(novaHra(vytvorRng(seminko)), 'kostlivec', 0, 0);
if (kost.hp !== Math.round(zakladKostlivce.hp * sila15.zivoty) || kost.poskozeni !== Math.round(zakladKostlivce.poskozeni * sila15.poskozeni)
  || Math.abs(kost.rychlost - RYCHLOST_NEPRATEL.kostlivec * sila15.rychlost) > 1e-9 || kost.elita) {
  chybyHrozby.push(`kostlivec v 15. min: ${kost.hp} životů, ${kost.poskozeni} poškození, rychlost ${kost.rychlost}`);
}
if (!elitniKost.elita || elitniKost.hp !== Math.round(zakladKostlivce.hp * sila15.zivoty * ELITA.zivoty) || elitniKost.xp !== zakladKostlivce.xp * ELITA.xp
  || !(elitniKost.polomer > kost.polomer) || !(elitniKost.poskozeni > kost.poskozeni)) {
  chybyHrozby.push('elita nemá víc životů, poškození, velikosti a zkušeností');
}
if (elitniBoss.elita || elitniBoss.maxHp !== Math.round(420 * sila15.bossZivoty)) chybyHrozby.push(`boss jako elita nebo se špatnými životy (${elitniBoss.maxHp})`);
// Jedový oblak v 20. minutě pálí víc (stejně jako dotyk).
const pozdniJed = novaHra(vytvorRng(seminko));
pozdniJed.cas = 20 * 60;
pozdniJed.hrozba = silaHrozby(pozdniJed.cas).uroven;
pozdniJed.oblaky.push({ x: 0, y: 0, zivot: TRVANI_OBLAKU - NAFUKOVANI_OBLAKU - 0.1, polomer: POLOMER_OBLAKU });
aktualizuj(pozdniJed, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
const ocekavanyJed = Math.round(JED_OBLAKU * silaHrozby(pozdniJed.cas).poskozeni);
if (pozdniJed.hrdina.maxHp - pozdniJed.hrdina.hp !== ocekavanyJed || !(ocekavanyJed > JED_OBLAKU)) chybyHrozby.push(`oblak ve 20. min ubral ${pozdniJed.hrdina.maxHp - pozdniJed.hrdina.hp}, má ${ocekavanyJed}`);
// Hra nekončí po pevném čase: nezranitelný hrdina v 60. minutě hraje dál, hrozba 61, čísla nepřátel jsou konečná.
// Bossové a smečky se posunou za 60. minutu, jinak by se všechny zmeškané vyvalily naráz.
const hodina = novaHra(vytvorRng(seminko));
hodina.cas = 3600;
hodina.dalsiBoss = 3600 + 60;
hodina.dalsiSmecka = 3600 + 5;
let maxNaHodine = 0;
let hlaseniNaHodine = null;
for (let t = 0; t < 10; t += DT) {
  hodina.hrdina.nezranitelny = 1;
  aktualizuj(hodina, DT, rozhodni(hodina, t), SIRKA, VYSKA);
  obsluz(hodina);
  hlaseniNaHodine ??= hodina.hlaseniHrozby?.text ?? null;
  maxNaHodine = Math.max(maxNaHodine, hodina.nepratele.length);
}
if (hodina.konec || hodina.hrozba !== 61 || !hlaseniNaHodine?.startsWith('Hrozba 61')) chybyHrozby.push(`hodina hry: konec ${hodina.konec}, hrozba ${hodina.hrozba}, ohlášení ${hlaseniNaHodine}`);
if (!hodina.nepratele.length || hodina.nepratele.some((n) => !Number.isFinite(n.hp) || !(n.hp > 0) || !Number.isFinite(n.poskozeni) || !Number.isFinite(n.rychlost))) chybyHrozby.push('v 60. minutě nepřátelé bez konečných čísel');
const vyvolaniNaraz = Math.max(...PORADI_BOSSU.flatMap((id) => schopnostiBosse(id).filter((x) => x.id === 'vyvolani').map((x) => x.pocet[1])));
if (maxNaHodine > HROZBA.stropNepratel + SMECKA_DO * 3 + vyvolaniNaraz * 4) chybyHrozby.push(`v 60. minutě ${maxNaHodine} nepřátel naráz`);
// Elity v hlavní hře: před elitaOd žádná, mezi elitaOd a castejiOd zhruba elitaSance, potom víc.
const podil = ([kolik, elit]) => (kolik ? elit / kolik : null);
if (elityPodleCasu.pred[1]) chybyHrozby.push(`${elityPodleCasu.pred[1]} elit před ${HROZBA.elitaOd}. minutou`);
if (elityPodleCasu.stred[0] > 500 && Math.abs(podil(elityPodleCasu.stred) - HROZBA.elitaSance) > HROZBA.elitaSance / 2) chybyHrozby.push(`podíl elit před ${HROZBA.castejiOd}. min ${podil(elityPodleCasu.stred)}`);
if (elityPodleCasu.pozde[0] > 500 && !(podil(elityPodleCasu.pozde) > podil(elityPodleCasu.stred))) chybyHrozby.push('po 10. minutě elit nepřibylo');
// Vyvážení: plně vylepšený bot hraje až do konce, nejvýš 30 minut. Bez vylepšení je to hlavní hra (nejvýš delka).
const vydrz = hrajKratce(plna, 1800);
if (!vydrz.konec) chybyHrozby.push('plně vylepšený bot přežil 30 minut, hrozba neroste dost');

// Čísla poškození zblízka: hrdina bez zbraní a bez vln (ať do toho nic nestřílí) a nepřátelé, kteří nepadnou.
const hraBezZbrani = () => {
  const h = tichaHra({});
  h.hrdina.sila = 1;
  return h;
};
const vydrzi = (h, x, y) => {
  const n = pridejNepritele(h, 'kostlivec', x, y);
  n.hp = n.maxHp = 1e9;
  return n;
};
{
  const h = hraBezZbrani();
  const a = vydrzi(h, 300, 0);
  const b = vydrzi(h, -300, 0);
  zasah(h, a, 10);
  zasah(h, a, 5);
  if (h.cisla.length !== 1 || h.cisla[0].hodnota !== 15 || h.cisla[0].text !== '15') chybyCisel.push(`dvě rány naráz nedaly jedno číslo 15 (${h.cisla.map((c) => c.text)})`);
  if (!(h.cisla[0].y < a.y)) chybyCisel.push('číslo zásahu není nad nepřítelem');
  zasah(h, b, 7);
  if (h.cisla.length !== 2 || h.cisla[1].hodnota !== 7) chybyCisel.push('rána jinému nepříteli se přičetla k cizímu číslu');
  h.cas += SLUCOVANI_CISEL + 0.01;
  zasah(h, a, 3);
  if (h.cisla.length !== 3 || h.cisla[0].hodnota !== 15 || h.cisla[2].hodnota !== 3) chybyCisel.push('rána po SLUCOVANI_CISEL se přičetla ke starému číslu');
  // Obyčejné rány po 10: práh silné rány se usadí u nich, deset zůstane bílé a trojnásobek zežloutne.
  for (let i = 0; i < 1000; i++) {
    h.cas += 1;
    zasah(h, a, 10);
  }
  h.cas += 1;
  zasah(h, a, 10);
  if (h.cisla.at(-1).barva !== null) chybyCisel.push(`obyčejná rána 10 je ${h.cisla.at(-1).barva} (práh ${h.prahSilneho.toFixed(1)})`);
  h.cas += 1;
  zasah(h, a, 30);
  if (h.cisla.at(-1).barva !== 'silny') chybyCisel.push(`trojnásobná rána není silná (práh ${h.prahSilneho.toFixed(1)}, ×${NAD_PRAHEM})`);
  // Rána 1000× silnější posune práh jen o kousek.
  h.cas += 1;
  zasah(h, a, 10000);
  h.cas += 1;
  zasah(h, a, 10);
  if (h.cisla.at(-1).barva !== null) chybyCisel.push('jedna obří rána zvedla práh tak, že další obyčejné nejsou bílé');
  if (h.cisla.at(-2).text !== '10k') chybyCisel.push(`rána 10000 je ${h.cisla.at(-2).text}, má být 10k`);
  // Strop: dvě stě nepřátel zasažených naráz dá jen MAX_CISEL čísel, vyřazená už nežijí.
  const vsechna = [];
  for (let i = 0; i < 200; i++) {
    zasah(h, vydrzi(h, i * 3, 400), 5);
    vsechna.push(h.cisla.at(-1));
  }
  if (h.cisla.length !== MAX_CISEL) chybyCisel.push(`po 200 zásazích ${h.cisla.length} čísel, má být ${MAX_CISEL}`);
  if (vsechna.some((c) => !h.cisla.includes(c) && c.zivot > 0)) chybyCisel.push('vyřazené číslo dál žije');
  // Za TRVANI_CISLA všechna čísla zmizí.
  h.nepratele = [];
  for (let t = 0; t < TRVANI_CISLA + DT; t += DT) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.cisla.some((c) => vsechna.includes(c))) chybyCisel.push(`čísla nezmizela za ${TRVANI_CISLA} s`);
}
{
  // Nepřítel na hrdinovi: rána je červené -N nad hrdinou. Odpočinek léčí zeleným +N.
  const h = hraBezZbrani();
  const n = vydrzi(h, 0, 0);
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const rana = h.cisla.find((c) => c.barva === 'zraneni');
  if (!rana || rana.text !== `-${n.poskozeni}` || h.hrdina.hp !== h.hrdina.maxHp - n.poskozeni || !(rana.y < h.hrdina.y)) chybyCisel.push(`rána hrdinovi bez červeného čísla (${rana?.text})`);
  h.nepratele = [];
  h.hrdina.hp = 40;
  vyber(h, karta(h, 'leceni', 'leceni'));
  const leceni = h.cisla.find((c) => c.barva === 'leceni');
  if (!leceni || leceni.text !== `+${h.hrdina.hp - 40}`) chybyCisel.push(`odpočinek bez zeleného čísla (${leceni?.text})`);
}
for (const [h, ocekavany] of [[9999, '9999'], [12345, '12k'], [999999, '999k'], [2500000, '2M']]) {
  if (kratkeCislo(h) !== ocekavany) chybyCisel.push(`kratkeCislo(${h}) = ${kratkeCislo(h)}`);
}
if (maxCisel > MAX_CISEL || silnaMaxCisel > MAX_CISEL) chybyCisel.push(`naráz ${Math.max(maxCisel, silnaMaxCisel)} čísel`);
if (cervenychCisel !== zasahu) chybyCisel.push(`červené číslo jen u ${cervenychCisel} z ${zasahu} ran hrdinovi`);
const cislaHry = [...videnaCisla];
const zasahyHry = cislaHry.filter((c) => c.barva === null || c.barva === 'silny');
const podilSilnych = zasahyHry.length ? zasahyHry.filter((c) => c.barva === 'silny').length / zasahyHry.length : 0;
if (zasahyHry.length > 1000 && (podilSilnych < 0.01 || podilSilnych > 0.35)) chybyCisel.push(`silných zásahů ${(podilSilnych * 100).toFixed(1)} %`);

// Výbava bossů. Data: každý boss má sadu se 4 kusy (jméno, kladné staty, sprite 8×8), vlastní efekt a truhlu
// ve svých barvách. Jména kusů a efekty se neopakují.
const kusyPodleId = new Map(VSECHNY_KUSY.map((k) => [k.id, k]));
for (const boss of PORADI_BOSSU) {
  const sada = VYBAVA[boss];
  if (!sada || !EFEKTY_VYBAVY[sada.efekt]) {
    chybyVystroje.push(`boss ${boss} nemá sadu s efektem`);
    continue;
  }
  if (popisSady(boss).length !== 2 || !popisEfektu(boss, 1) || popisEfektu(boss, 1) === popisEfektu(boss, 4)) chybyVystroje.push(`sada ${boss} bez popisu`);
  for (const slot of PORADI_SLOTU) {
    const id = `${boss}_${slot}`;
    const kus = sada.kusy[slot];
    if (!kus?.nazev || !kusyPodleId.has(id)) {
      chybyVystroje.push(`${boss} nemá kus do slotu ${slot}`);
      continue;
    }
    const staty = Object.entries(kus.staty);
    if (!staty.length || staty.some(([st, h]) => !Object.hasOwn(STATY_VYBAVY, st) || !(h > 0))) chybyVystroje.push(`kus ${id} má divné staty`);
    if (radkyStatu(kus.staty).length !== staty.length) chybyVystroje.push(`kus ${id} nemá řádek u každého statu`);
    const blok = textSpritu.match(new RegExp(`^ {2}${id}: \\[\\n([\\s\\S]*?)\\n {2}\\],`, 'm'));
    const radky = blok ? [...blok[1].matchAll(/'([^']*)'/g)].map((m) => m[1]) : [];
    if (radky.length !== 8 || radky.some((r) => r.length !== 8)) chybyVystroje.push(`sprite ${id} není 8×8`);
  }
  if (!new RegExp(`^ {2}${boss}: \\{ T: `, 'm').test(textSpritu)) chybyVystroje.push(`truhla ${boss} nemá své barvy`);
}
if (VSECHNY_KUSY.length !== PORADI_BOSSU.length * PORADI_SLOTU.length) chybyVystroje.push(`kusů je ${VSECHNY_KUSY.length}`);
if (new Set(VSECHNY_KUSY.map((k) => k.nazev)).size !== VSECHNY_KUSY.length) chybyVystroje.push('dva kusy mají stejné jméno');
if (new Set(PORADI_BOSSU.map((b) => VYBAVA[b]?.efekt)).size !== PORADI_BOSSU.length) chybyVystroje.push('dvě sady mají stejný efekt');
// Rarity kusů: šance dají 1, s hrozbou a se Štěstím je vzácnějších víc, los sedí se šancemi, staty a zlaťáky
// rostou s raritou a běžný kus má přesně staty z tabulky.
for (const [hrozba, stesti] of [[1, 1], [4, 1], [20, 1], [4, 2]]) {
  const sance = sanceRaritVybavy(hrozba, stesti);
  if (Math.abs(Object.values(sance).reduce((a, b) => a + b, 0) - 1) > 1e-9) chybyVystroje.push(`šance rarit kusů při hrozbě ${hrozba} nedají 1`);
}
const vzacnejsiKusy = (sance) => 1 - sance.bezna;
if (!(vzacnejsiKusy(sanceRaritVybavy(20)) > vzacnejsiKusy(sanceRaritVybavy(4)) && vzacnejsiKusy(sanceRaritVybavy(4, 2)) > vzacnejsiKusy(sanceRaritVybavy(4)))) {
  chybyVystroje.push('s hrozbou ani Štěstím nepřibývá vzácnějších kusů');
}
const losovaneKusy = Object.fromEntries(PORADI_RARIT_VYBAVY.map((id) => [id, 0]));
for (let i = 0; i < 10000; i++) losovaneKusy[rarituKusuZLosu((i + 0.5) / 10000, 8)] += 1;
for (const [id, p] of Object.entries(sanceRaritVybavy(8))) {
  if (Math.abs(losovaneKusy[id] / 10000 - p) > 0.001) chybyVystroje.push(`rarita kusu ${id} padá ${losovaneKusy[id] / 10000} místo ${p}`);
}
for (const k of VSECHNY_KUSY) {
  const bezny = vytvorKus(k.boss, k.slot, 'bezna');
  const leg = vytvorKus(k.boss, k.slot, 'legendarni');
  if (bezny.id !== k.id || bezny.nazev !== k.nazev || JSON.stringify(bezny.staty) !== JSON.stringify(k.staty)) chybyVystroje.push(`běžný ${k.id} nemá staty z tabulky`);
  if (Object.keys(k.staty).some((st) => !(leg.staty[st] > bezny.staty[st])) || !(zlatakyZaKus(leg) > zlatakyZaKus(bezny))) chybyVystroje.push(`legendární ${k.id} není lepší`);
}
// Staty na hrdinovi: kus přidá přesně svoje (přibyté životy i doléčí), a když se všechno postupně navleče přes
// sebe a zase sundá, je hrdina přesně jako předtím. Čtyři kusy jedné sady dají oba bonusy a nejvyšší efekt.
{
  const h = novaHra(vytvorRng(seminko));
  const vlastnosti = ['maxHp', 'sila', 'nabijeni', 'rychlost', 'magnet', 'zbroj'];
  const pred = Object.fromEntries(vlastnosti.map((v) => [v, h.hrdina[v]]));
  const hledi = vytvorKus('strazce', 'hlava', 'vzacna');
  h.hrdina.hp = 50;
  nasadKus(h, hledi);
  if (h.hrdina.maxHp !== pred.maxHp + hledi.staty.maxHp || h.hrdina.hp !== 50 + hledi.staty.maxHp || h.hrdina.zbroj !== hledi.staty.zbroj) chybyVystroje.push('hledí nepřidalo životy a zbroj');
  const oko = vytvorKus('obr', 'amulet', 'epicka');
  nasadKus(h, oko);
  if (Math.abs(h.hrdina.sila - pred.sila * (1 + oko.staty.sila)) > 1e-9) chybyVystroje.push('oko nepřidalo poškození');
  VSECHNY_KUSY.forEach((k, i) => nasadKus(h, vytvorKus(k.boss, k.slot, PORADI_RARIT_VYBAVY[i % PORADI_RARIT_VYBAVY.length])));
  const u = h.ucinekVystroje;
  const posledni = PORADI_BOSSU.at(-1);
  const soucet = (st) => PORADI_SLOTU.reduce((a, slot) => a + (h.vystroj[slot].staty[st] ?? 0), 0) + (VYBAVA[posledni].bonus2[st] ?? 0) + (VYBAVA[posledni].bonus4[st] ?? 0);
  if (u.sady[posledni] !== 4 || u.efekty[VYBAVA[posledni].efekt]?.stupen !== 3 || Object.keys(u.efekty).length !== 1) chybyVystroje.push('celá sada nedala nejvyšší efekt');
  if (Object.keys(STATY_VYBAVY).some((st) => Math.abs(u.staty[st] - soucet(st)) > 1e-9)) chybyVystroje.push('celá sada nedala bonusy');
  if (Math.abs(h.hrdina.rychlost - pred.rychlost * u.nasobky.rychlost) > 1e-9 || Math.abs(h.hrdina.nabijeni - pred.nabijeni * u.nasobky.nabijeni) > 1e-9) chybyVystroje.push('sada nesedí s rychlostí nebo nabíjením');
  for (const slot of PORADI_SLOTU) sundejKus(h, slot);
  if (vlastnosti.some((v) => Math.abs(h.hrdina[v] - pred[v]) > 1e-9) || h.hrdina.hp > h.hrdina.maxHp) chybyVystroje.push('po sundání výbavy hrdina není jako dřív');
}
// Sady: 1 kus = stupeň 1, 2–3 kusy = 2 a bonus za dva, 4 kusy = 3 a oba bonusy. Čtyři kusy čtyř sad = čtyři efekty
// na stupni 1 bez bonusů. Zbroj má strop.
{
  const sada = (pocet) => Object.fromEntries(PORADI_SLOTU.slice(0, pocet).map((slot) => [slot, vytvorKus('strazce', slot)]));
  const zivoty = (pocet) => PORADI_SLOTU.slice(0, pocet).reduce((a, slot) => a + (VYBAVA.strazce.kusy[slot].staty.maxHp ?? 0), 0);
  for (const [pocet, stupen] of [[1, 1], [2, 2], [3, 2], [4, 3]]) {
    const u = ucinekVystroje(sada(pocet));
    const bonus = (pocet >= 2 ? VYBAVA.strazce.bonus2.maxHp ?? 0 : 0) + (pocet >= 4 ? VYBAVA.strazce.bonus4.maxHp ?? 0 : 0);
    if (u.efekty.vlna?.stupen !== stupen || u.staty.maxHp !== zivoty(pocet) + bonus || u.sady.strazce !== pocet) chybyVystroje.push(`${pocet} kusy Strážce: stupeň ${u.efekty.vlna?.stupen}, životy ${u.staty.maxHp}`);
  }
  const mix = Object.fromEntries(PORADI_SLOTU.map((slot, i) => [slot, vytvorKus(PORADI_BOSSU[i], slot)]));
  const u = ucinekVystroje(mix);
  if (Object.keys(u.efekty).length !== PORADI_BOSSU.length || Object.values(u.efekty).some((e) => e.stupen !== 1)) chybyVystroje.push('kusy čtyř sad nedaly čtyři efekty');
  const tank = ucinekVystroje(Object.fromEntries(PORADI_SLOTU.map((slot) => [slot, { ...vytvorKus('obr', slot, 'legendarni'), staty: { zbroj: 0.5 } }])));
  if (tank.nasobky.zbroj !== STROPY_VYBAVY.zbroj) chybyVystroje.push(`zbroj přes strop (${tank.nasobky.zbroj})`);
  if (rozdilStatu(vytvorKus('strazce', 'hlava', 'vzacna'), vytvorKus('strazce', 'hlava')).some((r) => !(r.rozdil > 0))) chybyVystroje.push('rozdíl vzácného a běžného kusu není kladný');
}
// Truhla po bossovi: dotyk ji otevře, svět TRVANI_OTEVRENI stojí, pak kus od toho bosse do volného slotu a karta.
// Druhý kus do stejného slotu čeká na porovnání (hra stojí), Vzít vymění a starý dá zlaťáky, Nechat nechá starý.
const tichaVybava = () => {
  const h = tichaHra({});
  Object.assign(h, { dalsiBoss: Infinity, dalsiSmecka: Infinity, dalsiPrichod: Infinity });
  return h;
};
{
  const h = tichaVybava();
  h.hrdina.nezranitelny = Infinity;
  const b = pridejNepritele(h, 'matka', 300, 0);
  b.hp = 0;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const truhla = h.predmety.find((p) => p.druh === 'truhla');
  if (truhla?.od !== 'matka') chybyVystroje.push('po Matce nezůstala její truhla');
  const n = pridejNepritele(h, 'netopyr', 200, 0);
  Object.assign(truhla ?? {}, { x: 5, y: 0 });
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const kus = h.otevira?.kus;
  if (!kus || kus.boss !== 'matka' || h.volby || h.predmety.some((p) => p.druh === 'truhla')) chybyVystroje.push('truhla se po dotyku neotevírá s kusem Matky');
  const [cas0, nx] = [h.cas, n.x];
  let snimku = 0;
  while (h.otevira && snimku < 200) {
    aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
    snimku += 1;
  }
  if (h.cas !== cas0 || n.x !== nx || h.hrdina.x !== 0) chybyVystroje.push('při otevírání truhly se hrálo dál');
  if (Math.abs(snimku * DT - TRVANI_OTEVRENI) > DT * 1.5) chybyVystroje.push(`truhla se otevírala ${(snimku * DT).toFixed(2)} s`);
  if (!kus || h.vystroj[kus.slot] !== kus || h.truhlaKus !== kus || h.porovnani || !h.zTruhly || h.truhlaOd !== 'matka' || !h.volby || h.volby.some((v) => v.rarita === 'bezna')) {
    chybyVystroje.push('otevřená truhla nenasadila kus nebo nedala kartu');
  }
  if (h.volby) vyber(h, h.volby[0]);
  if (kus) {
    const lepsi = vytvorKus('strazce', kus.slot, 'legendarni');
    ziskejKus(h, lepsi);
    if (h.porovnani?.novy !== lepsi || h.porovnani.nasazeny !== kus || h.vystroj[kus.slot] !== kus || h.truhlaKus) chybyVystroje.push('kus do obsazeného slotu nečeká na porovnání');
    const cas1 = h.cas;
    aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
    if (h.cas !== cas1) chybyVystroje.push('při porovnání se hrálo dál');
    let zlato = h.zlataky;
    rozhodniKus(h, true);
    if (h.vystroj[kus.slot] !== lepsi || h.zlataky !== zlato + zlatakyZaKus(kus) || h.porovnani) chybyVystroje.push('Vzít nevyměnilo kus nebo nedalo zlaťáky za starý');
    if (!h.cisla.some((c) => c.barva === 'zlato' && c.hodnota === zlatakyZaKus(kus))) chybyVystroje.push('rozložený kus bez zlatého čísla');
    const horsi = vytvorKus('obr', kus.slot, 'bezna');
    ziskejKus(h, horsi);
    zlato = h.zlataky;
    rozhodniKus(h, false);
    if (h.vystroj[kus.slot] !== lepsi || h.zlataky !== zlato + zlatakyZaKus(horsi)) chybyVystroje.push('Nechat nenechalo starý kus nebo nedalo zlaťáky za nový');
    if (h.nalezy.length !== 3 || h.rozlozeno !== 2 || h.zlatakyZVybavy !== zlatakyZaKus(kus) + zlatakyZaKus(horsi)) chybyVystroje.push('nálezy nebo rozložené kusy nesedí');
    const sloty = seznamVystroje(h);
    if (sloty.map((p) => p.slot).join() !== PORADI_SLOTU.join() || sloty.find((p) => p.slot === kus.slot).kus !== lepsi || sloty.filter((p) => p.kus).length !== 1) chybyVystroje.push('sloty pro HUD nesedí');
    if (!lepsiKus({ novy: lepsi, nasazeny: kus }) || lepsiKus({ novy: kus, nasazeny: lepsi })) chybyVystroje.push('bot nepozná lepší kus');
  }
}
// Rázová vlna (Strážce): první chvíli po nasazení, pak každých kazdych s. Zasáhne každého v dosahu jednou,
// odhodí ho (bosse jen zraní), dál nedosáhne.
const pokusyVystroje = {};
{
  const h = tichaVybava();
  h.hrdina.nezranitelny = Infinity;
  const tvrdy = (druh, x, y) => {
    const n = pridejNepritele(h, druh, x, y);
    Object.assign(n, { hp: 1e6, maxHp: 1e6, rychlost: 0, doSchopnosti: Infinity });
    return n;
  };
  const kolem = [0, 1, 2, 3, 4, 5].map((i) => tvrdy('kostlivec', Math.cos(i) * 80, Math.sin(i) * 80));
  const daleko = tvrdy('kostlivec', 400, 0);
  const boss = tvrdy('strazce', 0, -95);
  nasadKus(h, vytvorKus('strazce', 'hlava'));
  const vlna = EFEKTY_VYBAVY.vlna.stupne[0];
  hraj(h, PRVNI_VLNA_HRDINY - 0.1);
  if (h.efektyPouzito.vlna !== 0 || kolem.some((n) => n.hp < n.maxHp)) chybyVystroje.push('rázová vlna vyběhla moc brzy');
  hraj(h, 0.5);
  if (h.efektyPouzito.vlna !== 1 || kolem.some((n) => n.maxHp - n.hp !== Math.round(vlna.poskozeni * h.hrdina.sila)) || daleko.hp < daleko.maxHp) chybyVystroje.push('rázová vlna nezasáhla, kdo je blízko, nebo zasáhla daleko');
  if (kolem.some((n) => Math.hypot(n.x, n.y) < 80 + vlna.odhozeni - 1)) chybyVystroje.push('rázová vlna neodhodila');
  if (!(boss.hp < boss.maxHp) || boss.x !== 0 || boss.y !== -95) chybyVystroje.push('rázová vlna bosse nezranila nebo odhodila');
  hraj(h, 30);
  const vln = 1 + Math.floor((PRVNI_VLNA_HRDINY - 0.1 + 0.5 + 30 - PRVNI_VLNA_HRDINY) / vlna.kazdych);
  if (h.efektyPouzito.vlna !== vln) chybyVystroje.push(`za 31 s vyběhlo ${h.efektyPouzito.vlna} vln místo ${vln}`);
  pokusyVystroje.vlna = { vln: h.efektyPouzito.vlna, poskozeni: vlna.poskozeni, dosah: vlna.polomer };
}
// Pavučina (Matka): ze sta zásahů zapřede zhruba sance · 100 nepřátel, zapředený stojí, boss v síti jde napůl
// a za trvani s síť povolí.
{
  const h = tichaVybava();
  h.hrdina.nezranitelny = Infinity;
  nasadKus(h, vytvorKus('matka', 'hlava'));
  const sit = EFEKTY_VYBAVY.sit.stupne[0];
  const terce = Array.from({ length: 100 }, (_, i) => {
    const n = pridejNepritele(h, 'netopyr', 300 + i * 30, 0);
    Object.assign(n, { hp: 1e6, maxHp: 1e6 });
    return n;
  });
  for (const n of terce) zasah(h, n, 1);
  const zapredeni = terce.filter((n) => n.zapreden > 0);
  if (Math.abs(zapredeni.length - 100 * sit.sance) > 1 || zapredeni.some((n) => n.zapreden !== sit.trvani)) chybyVystroje.push(`ze 100 zásahů zapředeno ${zapredeni.length}`);
  const stoji = zapredeni[0];
  const volny = terce.find((n) => !(n.zapreden > 0));
  const b = pridejNepritele(h, 'obr', -300, 0);
  Object.assign(b, { doSchopnosti: Infinity, zapreden: sit.trvani });
  const pred = [stoji?.x, volny?.x, b.x];
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (!stoji || stoji.x !== pred[0] || !(volny.x < pred[1]) || Math.abs(b.x - pred[2] - b.rychlost * DT * ZPOMALENI_SITE_BOSSE) > 1e-6) chybyVystroje.push('zapředený nestojí nebo boss v síti nejde napůl');
  hraj(h, sit.trvani + 0.1);
  if (!stoji || stoji.zapreden > 0 || stoji.x === pred[0]) chybyVystroje.push('síť nepovolila');
  pokusyVystroje.sit = { ze_100_zasahu: zapredeni.length, trvani_s: sit.trvani };
}
// Kamenná kůže (Obr) a zbroj: dotyk bolí o snizeni méně (a pak ještě zbroj), nepřítel odletí, boss ne.
{
  const dotyk = (kusy, druh = 'kostlivec') => {
    const h = tichaVybava();
    for (const k of kusy) nasadKus(h, k);
    const n = pridejNepritele(h, druh, 10, 0);
    Object.assign(n, { hp: 1e6, maxHp: 1e6, rychlost: 0, doSchopnosti: Infinity });
    const hp = h.hrdina.hp;
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    const ztrata = hp - h.hrdina.hp;
    hraj(h, TRVANI_ODHOZENI + DT);
    return { h, n, ztrata };
  };
  const kuze = EFEKTY_VYBAVY.kuze.stupne[0];
  const helma = vytvorKus('obr', 'hlava');
  const krunyr = vytvorKus('strazce', 'telo');
  const bez = dotyk([]);
  const sKuzi = dotyk([helma]);
  const sKrunyrem = dotyk([krunyr]);
  const rana = bez.n.poskozeni;
  const ocekavano = Math.max(1, Math.round(Math.max(1, Math.round(rana * (1 - kuze.snizeni))) * (1 - helma.staty.zbroj)));
  if (bez.ztrata !== rana || sKuzi.ztrata !== ocekavano || sKrunyrem.ztrata !== Math.round(rana * (1 - krunyr.staty.zbroj))) {
    chybyVystroje.push(`dotyk za ${rana}: bez výbavy ${bez.ztrata}, s kůží ${sKuzi.ztrata} (má ${ocekavano}), s krunýřem ${sKrunyrem.ztrata}`);
  }
  if (Math.hypot(sKuzi.n.x, sKuzi.n.y) < 10 + kuze.odhozeni - 1 || bez.n.x !== 10 || sKuzi.h.efektyPouzito.kuze !== 1) chybyVystroje.push('kamenná kůže neodhodila nepřítele');
  const boss = dotyk([helma], 'obr');
  if (boss.n.x !== 10 || !(boss.ztrata < boss.n.poskozeni)) chybyVystroje.push('kamenná kůže odhodila bosse nebo mu nevzala sílu');
  pokusyVystroje.kuze = { rana_bez: bez.ztrata, rana_s_kuzi: sKuzi.ztrata, rana_s_krunyrem: sKrunyrem.ztrata };
}
// Bludný plamen (Bludička): po ráně hrdina zmizí, nic mu neublíží a nepřátelé jdou tam, kde zmizel. Pak ho zase
// vidí. Další rána do konce pauzy už zmizení nespustí.
{
  const h = tichaVybava();
  nasadKus(h, vytvorKus('bludicka', 'telo'));
  const z = EFEKTY_VYBAVY.zmizeni.stupne[0];
  const utocnik = pridejNepritele(h, 'kostlivec', 10, 0);
  Object.assign(utocnik, { hp: 1e6, maxHp: 1e6, rychlost: 0 });
  const lovec = pridejNepritele(h, 'netopyr', 0, 150);
  Object.assign(lovec, { hp: 1e6, maxHp: 1e6 });
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (!(h.hrdina.neviditelny > z.trvani - DT * 1.5) || h.hrdina.nezranitelny < h.hrdina.neviditelny || h.efektyPouzito.zmizeni !== 1) chybyVystroje.push('hrdina po ráně nezmizel');
  for (let t = 0; t < 0.6; t += DT) aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
  if (Math.abs(lovec.x) > 1e-6 || !(lovec.y < 150) || !(h.hrdina.x > 50)) chybyVystroje.push(`nepřítel šel za zmizelým hrdinou (${lovec.x.toFixed(1)}, ${lovec.y.toFixed(1)})`);
  for (let t = 0; t < z.trvani && h.hrdina.neviditelny > 0; t += DT) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const xPred = lovec.x;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.hrdina.neviditelny > 0 || !(lovec.x > xPred)) chybyVystroje.push('po zmizení hrdinu nepřátelé zase nevidí');
  Object.assign(utocnik, { x: h.hrdina.x + 5, y: h.hrdina.y });
  h.hrdina.nezranitelny = 0;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.efektyPouzito.zmizeni !== 1 || h.hrdina.neviditelny > 0 || !(h.hrdina.hp < h.hrdina.maxHp - utocnik.poskozeni)) chybyVystroje.push('zmizení přišlo dřív než po pauze');
  pokusyVystroje.zmizeni = { trvani_s: z.trvani, pauza_s: z.pauza };
}

// Zlaťáky zblízka: kupec, obchod, přehození, zamčené truhly, drop z nepřátel a magnet.
const pokusyZlata = {};
const stojici = (zbrane = {}) => {
  const h = tichaHra(zbrane);
  h.hrdina.nezranitelny = 1e9;
  h.doZamcene = Infinity;
  return h;
};
// Kupec přijede v KUPEC.prvni (ne dřív) a po KUPEC.trvani s odjede. K stojícímu hrdinovi nedojde, obchod se neotevře.
{
  const h = stojici();
  let prijel = null;
  let odjel = null;
  for (let t = 0; t < KUPEC.prvni + KUPEC.trvani + 1; t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (h.kupec && prijel === null) prijel = h.cas;
    if (!h.kupec && prijel !== null && odjel === null) odjel = h.cas;
  }
  if (prijel === null || prijel < KUPEC.prvni || prijel > KUPEC.prvni + DT * 1.5) chybyZlata.push(`kupec přijel v ${prijel} s`);
  if (odjel === null || Math.abs(odjel - prijel - KUPEC.trvani) > DT * 1.5) chybyZlata.push(`kupec odjel v ${odjel} s`);
  if (h.obchod || h.oznameni?.text !== 'Kupec odjel') chybyZlata.push('obchod se otevřel bez vozu nebo kupec odjel bez ohlášení');
  pokusyZlata.kupec = { prijel_s: prijel && Math.round(prijel), odjel_s: odjel && Math.round(odjel) };
}
// S živým bossem kupec čeká, po jeho smrti přijede. Těsně před příchodem bosse nepřijede.
{
  const h = stojici();
  const boss = pridejNepritele(h, 'strazce', 600, 0);
  Object.assign(boss, { rychlost: 0, doSchopnosti: Infinity });
  h.cas = KUPEC.prvni + 5;
  for (let i = 0; i < 30; i++) aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.kupec) chybyZlata.push('kupec přijel k živému bossovi');
  boss.hp = 0;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (!h.kupec) chybyZlata.push('po bossovi kupec nepřijel');
  const h2 = stojici();
  h2.cas = h2.dalsiBoss - KUPEC.trvani + 1;
  aktualizuj(h2, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h2.kupec) chybyZlata.push('kupec přijel těsně před bossem');
}
// Obchod: dotyk vozu ho otevře a svět stojí. Bez zlaťáků nic, každé zboží dělá, co slibuje, zásoba dojde.
// Po odchodu se znovu otevře, až hrdina odejde kus dál a vrátí se.
{
  const h = stojici({ jiskra: { uroven: 1, nabiti: 0 } });
  h.cas = KUPEC.prvni;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const k = h.kupec;
  if (!k) chybyZlata.push('kupec nepřijel');
  else {
    Object.assign(h.hrdina, { x: k.x + 10, y: k.y });
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (!h.obchod) chybyZlata.push('u vozu se obchod neotevřel');
    const cas = h.cas;
    const zbyva = k.zbyva;
    aktualizuj(h, 1, { dx: 1, dy: 0 }, SIRKA, VYSKA);
    if (h.cas !== cas || k.zbyva !== zbyva || h.hrdina.x !== k.x + 10) chybyZlata.push('s otevřeným obchodem svět běží');
    if (kup(h, 'klic') || prekazkaNakupu(h, 'klic') !== 'Málo zlaťáků') chybyZlata.push('nákup bez zlaťáků prošel');
    h.zlataky = 1000;
    if (kup(h, 'lektvar') || prekazkaNakupu(h, 'lektvar') !== 'Máš plné životy') chybyZlata.push('lektvar se dal koupit s plnými životy');
    h.hrdina.hp = 10;
    let zlato = h.zlataky;
    if (!kup(h, 'lektvar') || h.hrdina.hp !== Math.min(h.hrdina.maxHp, 10 + Math.round(h.hrdina.maxHp * LECENI_LEKTVARU)) || h.zlataky !== zlato - cenaZbozi(h, 'lektvar')) chybyZlata.push('lektvar nedoléčil nebo nesedí cena');
    if (!h.posledniNakup?.text.startsWith('+')) chybyZlata.push('lektvar bez textu nákupu');
    if (!kup(h, 'prehozeni') || h.prehozeniZdarma !== ZBOZI.prehozeni.kolik) chybyZlata.push('přehození od kupce nepřibylo');
    const urovenPred = h.zbrane.jiskra.uroven;
    if (!kup(h, 'vylepseni') || !(h.zbrane.jiskra.uroven >= urovenPred + 2)) chybyZlata.push(`náhodné vylepšení dalo jiskru ${urovenPred} → ${h.zbrane.jiskra.uroven}`);
    if (!kup(h, 'kus') || h.nalezy.length !== 1 || !PORADI_BOSSU.includes(h.nalezy[0].boss)) chybyZlata.push('kus výbavy od kupce nepřibyl');
    if (kup(h, 'kus') || prekazkaNakupu(h, 'kus') !== 'Vyprodáno') chybyZlata.push('kus výbavy se dal koupit dvakrát');
    zlato = h.zlataky;
    for (let i = 0; i < ZBOZI.klic.zasoba; i++) if (!kup(h, 'klic')) chybyZlata.push('klíč ze zásoby se nedal koupit');
    if (kup(h, 'klic') || h.klice !== ZBOZI.klic.zasoba || h.zlataky !== zlato - ZBOZI.klic.zasoba * ZBOZI.klic.cena) chybyZlata.push(`klíče: ${h.klice}`);
    if (PORADI_ZBOZI.some((id) => nabidkaKupce(h).find((z) => z.id === id).zbyva !== k.zasoba[id])) chybyZlata.push('nabídka nesedí se zásobou');
    odejdiOdKupce(h);
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (h.obchod) chybyZlata.push('obchod se hned znovu otevřel');
    Object.assign(h.hrdina, { x: k.x + KUPEC.odchod + 20, y: k.y });
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    Object.assign(h.hrdina, { x: k.x + 10, y: k.y });
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (!h.obchod || k.navstev !== 2) chybyZlata.push('po návratu k vozu se obchod neotevřel');
  }
  // Ceny rostou s hrozbou, klíč ne.
  const ceny = (hrozba) => Object.fromEntries(PORADI_ZBOZI.map((id) => [id, cenaZbozi({ hrozba }, id)]));
  const c1 = ceny(1);
  const c10 = ceny(10);
  if (PORADI_ZBOZI.some((id) => (ZBOZI[id].rust === false ? c10[id] !== c1[id] : !(c10[id] > c1[id])))) chybyZlata.push('ceny nerostou s hrozbou');
  if (PORADI_ZBOZI.some((id) => c1[id] !== ZBOZI[id].cena)) chybyZlata.push('ceny na začátku nejsou základní');
  pokusyZlata.ceny = { hrozba_1: c1, hrozba_5: ceny(5), hrozba_10: c10, hrozba_15: ceny(15) };
}
// Přehodit karty: bez zlaťáků ne, cena roste po každém přehození za zlaťáky, zdarma se bere první a cenu nezvedá.
// Z truhly zůstanou karty aspoň vzácné.
{
  const h = novaHra(vytvorRng(seminko));
  h.volby = nabidka(h);
  const prvni = h.volby;
  if (prehod(h) || h.volby !== prvni) chybyZlata.push('přehození bez zlaťáků prošlo');
  h.zlataky = 20;
  const ceny = [];
  for (let i = 0; i < 3; i++) {
    const cena = cenaPrehozeni(h);
    const pred = h.volby;
    if (!prehod(h) || h.volby === pred || h.volby.length !== 3) chybyZlata.push('přehození nedalo nové karty');
    ceny.push(cena);
  }
  if (ceny.join() !== [0, 1, 2].map((i) => PREHOZENI.cena + PREHOZENI.rust * i).join() || h.zlataky !== 20 - ceny.reduce((a, b) => a + b, 0)) chybyZlata.push(`ceny přehození ${ceny}`);
  h.prehozeniZdarma = 1;
  const zlato = h.zlataky;
  const dalsi = PREHOZENI.cena + PREHOZENI.rust * 3;
  if (cenaPrehozeni(h) !== 0 || !prehod(h) || h.zlataky !== zlato || h.prehozeniZdarma !== 0 || cenaPrehozeni(h) !== dalsi) chybyZlata.push('přehození zdarma stálo zlaťáky nebo zvedlo cenu');
  h.zTruhly = true;
  h.volby = nabidka(h, 'vzacna');
  for (let i = 0; i < 100; i++) {
    h.prehozeniZdarma = 1;
    prehod(h);
    if (h.volby.some((v) => v.rarita === 'bezna')) { chybyZlata.push('přehozená truhla dala běžnou kartu'); break; }
  }
  pokusyZlata.prehozeni = { ceny_prvnich_tri: ceny };
}
// Zamčená truhla pod nohama: bez klíče a zlaťáků zůstane zavřená (krumpáče ji nerozbijí), s 15 zlaťáky se otevře
// a dá karty aspoň vzácné, klíč má přednost před zlaťáky.
{
  const zamcena = (h) => {
    const z = { x: 0, y: 0, otevrena: false, blizko: false };
    h.zamcene.push(z);
    return z;
  };
  const h = stojici({ krumpace: { uroven: ZAKLAD_UROVNI, nabiti: 0 } });
  const z = zamcena(h);
  hraj(h, 0.5);
  if (!h.zamcene.includes(z) || h.volby || !z.blizko) chybyZlata.push('zamčená truhla se otevřela bez klíče a zlaťáků (nebo ji rozbila zbraň)');
  h.zlataky = CENA_ZAMCENE + 3;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.zamcene.includes(z) || !h.volby || !h.zTruhly || h.truhlaOd !== 'zamcena' || h.odemceno !== 'zlato' || h.zlataky !== 3 || h.utraceno.zamcene !== CENA_ZAMCENE) {
    chybyZlata.push('zamčená truhla se za zlaťáky neotevřela');
  }
  if (h.volby?.some((v) => v.rarita === 'bezna')) chybyZlata.push('zamčená truhla dala běžnou kartu');
  if (!h.cisla.some((c) => c.barva === 'utrata' && c.hodnota === CENA_ZAMCENE)) chybyZlata.push('zaplacená truhla bez čísla -15');
  vyber(h, h.volby[0]);
  if (h.odemceno || h.zTruhly) chybyZlata.push('po výběru z truhly zůstal stav truhly');
  h.klice = 1;
  h.zlataky = 100;
  zamcena(h);
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (h.klice !== 0 || h.zlataky !== 100 || h.odemceno !== 'klic' || h.otevrenoZamcenych.klic !== 1 || h.otevrenoZamcenych.zlato !== 1) chybyZlata.push('klíč neotevřel truhlu nebo se platilo zlaťáky');
}
// Zamčené truhly se objevují jen mimo obrazovku, první v PRVNI_ZAMCENA, nejvýš MAX_ZAMCENYCH naráz.
{
  const h = stojici();
  h.doZamcene = PRVNI_ZAMCENA;
  h.dalsiKupec = Infinity;
  const videne = new WeakSet();
  let prvniZamcena = null;
  let nejvic = 0;
  for (let t = 0; t < 170; t += DT) {
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    nejvic = Math.max(nejvic, h.zamcene.length);
    for (const z of h.zamcene) {
      if (videne.has(z)) continue;
      videne.add(z);
      if (prvniZamcena === null) prvniZamcena = h.cas;
      if (!mimoObrazovku(z, h.hrdina)) chybyZlata.push('zamčená truhla se objevila na obrazovce');
    }
  }
  if (prvniZamcena === null || prvniZamcena < PRVNI_ZAMCENA - DT || nejvic > MAX_ZAMCENYCH) chybyZlata.push(`zamčené truhly: první ${prvniZamcena}, naráz ${nejvic}`);
  pokusyZlata.zamcene = { prvni_s: prvniZamcena && Math.round(prvniZamcena), naraz: nejvic };
}
// Drop: 3000 netopýrů padne naráz, zlaťák z nich padá zhruba se SANCE_ZLATAKU. Elita nechá hromádku. Měšec je
// přitom bezedný, s obyčejným padne nanejvýš tolik, kolik v něm je, a pak se zase plní MESEC.zaMinutu za minutu.
{
  const h = novaHra(vytvorRng(seminko));
  h.hrdina.nezranitelny = 10;
  const strop = MESEC.strop;
  MESEC.strop = Infinity;
  h.mesec = Infinity;
  const mrtvy = (elita) => ({ druh: 'netopyr', x: 30, y: 0, hp: 0, maxHp: 1, rychlost: 0, poskozeni: 0, xp: 0, polomer: 1, zasazen: 0, zasahKrumpacem: 0, elita });
  for (let i = 0; i < 3000; i++) h.nepratele.push(mrtvy(false));
  h.nepratele.push(mrtvy(true));
  aktualizuj(h, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  MESEC.strop = strop;
  const zl = h.predmety.filter((p) => p.druh === 'zlatak');
  const zNepratel = zl.filter((p) => p.z === 'nepratele').length / 3000;
  const zElit = zl.filter((p) => p.z === 'elity');
  if (Math.abs(zNepratel - SANCE_ZLATAKU) > SANCE_ZLATAKU / 2) chybyZlata.push(`zlaťák z nepřátel padá ${zNepratel}`);
  if (zElit.length !== 1 || zElit[0].hodnota !== ELITA.zlataky) chybyZlata.push('elita nenechala hromádku zlaťáků');
  pokusyZlata.drop = { z_nepratel_procenta: Math.round(zNepratel * 1000) / 10, z_elity: ELITA.zlataky };
  const m = novaHra(vytvorRng(seminko));
  m.hrdina.nezranitelny = 10;
  if (m.mesec !== MESEC.strop) chybyZlata.push('měšec není na začátku plný');
  for (let i = 0; i < 100; i++) m.nepratele.push(mrtvy(true));
  for (let i = 0; i < 3000; i++) m.nepratele.push(mrtvy(false));
  aktualizuj(m, 0.001, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const padlo = m.predmety.filter((p) => p.druh === 'zlatak').reduce((a, p) => a + p.hodnota, 0);
  if (padlo > MESEC.strop + 1 || padlo < MESEC.strop - 1 || m.mesec < 0) chybyZlata.push(`z plného měšce padlo ${padlo} zlaťáků`);
  const pred = m.mesec;
  m.nepratele = [];
  aktualizuj(m, 60, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  if (Math.abs(m.mesec - Math.min(MESEC.strop, pred + MESEC.zaMinutu)) > 1e-9) chybyZlata.push(`měšec se za minutu naplnil na ${m.mesec}`);
}
// Magnet: zlaťák v dosahu přiletí, za dosahem leží, po sebraném magnetu přiletí i ten.
{
  const h = stojici();
  const dosah = h.hrdina.magnet;
  h.predmety.push({ druh: 'zlatak', x: dosah - 5, y: 0, hodnota: 1, z: 'nepratele' }, { druh: 'zlatak', x: dosah + 60, y: 0, hodnota: 1, z: 'nepratele' });
  hraj(h, 1);
  if (h.zlataky !== 1 || h.predmety.length !== 1 || h.predmety[0].x !== dosah + 60) chybyZlata.push('magnet nepřitáhl zlaťák v dosahu (nebo i ten za ním)');
  h.predmety.push({ druh: 'magnet', x: 0, y: 0 });
  hraj(h, 1);
  if (h.zlataky !== 2 || h.predmety.length) chybyZlata.push('sebraný magnet nepřitáhl zlaťák');
}
if (hra.cas > KUPEC.prvni + 1 && !prijezdyKupce.length) chybyZlata.push('v hlavní hře kupec nepřijel');

// Mapy. Louka je hlavní hra výše, ostatní mapy se tu dohrají celé (stejné semínko, třída i bot).
const chybyMap = [];
if (hra.mapa !== VYCHOZI_MAPA || novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, {}, 'drak').mapa !== VYCHOZI_MAPA) chybyMap.push('neznámá mapa není Louka');
for (const [druh, od] of [['pavouk', OD_PAVOUKU], ['duch', OD_DUCHU], ['houbak', OD_HOUBAKU]]) {
  if (odKdy(VYCHOZI_MAPA, druh) !== od) chybyMap.push(`OD_* u ${druh} nesedí s daty Louky`);
}
const vysledkyMap = { [VYCHOZI_MAPA]: { preziti_s: Math.round(hra.cas), uroven: hra.hrdina.uroven, zabito: hra.zabito } };
for (const id of PORADI_MAP) {
  const m = MAPY[id];
  if (!m.nazev || !m.popis || !/^#[0-9a-f]{6}$/i.test(m.barva) || !m.nepratele.length || !m.ozdoby.kusy.length) chybyMap.push(`mapa ${id} nemá jméno, popis, barvu, nepřátele nebo ozdoby`);
  if (!(m.podlaha.vzacne.length && m.podlaha.obycejnych > 0 && m.podlaha.vzacnych >= 0 && m.podlaha.vzacnych < 100)) chybyMap.push(`podlaha mapy ${id} nesedí`);
  for (const d of m.nepratele) {
    if (!(d.druh in RYCHLOST_NEPRATEL) || !(d.vaha > 0) || !(d.od >= 0)) chybyMap.push(`mapa ${id}: špatný druh ${d.druh}`);
    if (!jmenaSpritu.has(d.druh)) chybyMap.push(`druh ${d.druh} nemá sprite`);
  }
  if (m.nepratele[0].od !== 0) chybyMap.push(`na mapě ${id} nechodí nikdo od začátku`);
  for (const [i, kus] of m.ozdoby.kusy.entries()) {
    if (kus.radky.length !== 16 || kus.radky.some((r) => r.length !== 16 || [...r].some((z) => z !== '.' && !m.ozdoby.paleta[z]))) chybyMap.push(`ozdoba ${i} mapy ${id} není 16×16 z palety`);
  }
  if (id === VYCHOZI_MAPA) continue;
  const povolene = new Set([...m.nepratele.map((d) => d.druh), ...(m.smecky ? [m.smecky.druh] : [])]);
  const h = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, {}, id);
  const vide = new WeakSet();
  const prvniDruhu = {};
  const ohlaseno = [];
  const pohyb = { naLedu: 0, klouze: 0, naSnehu: 0, smyk: 0, vBahne: 0, uPrekazky: 0 };
  const vPrekazce = { hrdina: 0, nepratele: 0, nejhloub: 0 };
  let prvniBoss = null;
  let lavy = 0;
  for (let t = 0; t < delka && !h.konec; t += DT) {
    const vstupBota = rozhodni(h, t);
    const plochaPred = naPlose(id, h.hrdina.x, h.hrdina.y);
    const pred = { x: h.hrdina.x, y: h.hrdina.y, odhozen: h.hrdina.odhozen, sit: h.hrdina.sit, led: plochaPred === 'led', oznameni: h.oznameni };
    const bezi = !(h.konec || h.volby || h.porovnani || h.pauza || h.obchod || h.otevira);
    aktualizuj(h, DT, vstupBota, SIRKA, VYSKA);
    // Kam by hrdinu poslal vstup bez klouzání (stejně jako na Louce, v bahně pomaleji). Kroky u překážky se
    // nepočítají (tam ho zastaví a sklouzne), ty hlídá zvlášť kontrola překážek.
    if (bezi && !(pred.odhozen > 0)) {
      const d = Math.hypot(vstupBota.dx, vstupBota.dy);
      const vBahne = plochaPred === 'bahno' ? m.bahno.zpomaleni : 1;
      const rychlost = h.hrdina.rychlost * (pred.sit > 0 ? ZPOMALENI_SITI : 1) * vBahne;
      const ox = d > 0 ? pred.x + (vstupBota.dx / d) * rychlost * DT : pred.x;
      const oy = d > 0 ? pred.y + (vstupBota.dy / d) * rychlost * DT : pred.y;
      const odchylka = Math.hypot(h.hrdina.x - ox, h.hrdina.y - oy);
      const uPrekazky = hloubkaVPrekazce(id, ox, oy, POLOMER_HRDINY + 0.5) > 0 || hloubkaVPrekazce(id, pred.x, pred.y, POLOMER_HRDINY + 0.5) > 0;
      if (plochaPred === 'bahno' && d > 0) pohyb.vBahne += 1;
      if (uPrekazky) pohyb.uPrekazky += 1;
      else if (pred.led) {
        pohyb.naLedu += 1;
        if (odchylka > 0.3) pohyb.klouze += 1;
      } else {
        pohyb.naSnehu += 1;
        if (odchylka > 1e-6) pohyb.smyk += 1;
      }
    }
    // Hrdina ani nepřátelé (kromě duchů) nikdy nezůstanou v překážce.
    const hloubka = hloubkaVPrekazce(id, h.hrdina.x, h.hrdina.y, POLOMER_HRDINY);
    if (hloubka > 0.01) vPrekazce.hrdina += 1;
    vPrekazce.nejhloub = Math.max(vPrekazce.nejhloub, hloubka);
    for (const n of h.nepratele) {
      if (n.duch) continue;
      const hn = hloubkaVPrekazce(id, n.x, n.y, n.polomer);
      if (hn > 0.5) vPrekazce.nepratele += 1;
    }
    if (!prvniBoss) prvniBoss = h.nepratele.find((n) => n.boss)?.druh ?? null;
    if (naPlose(id, h.hrdina.x, h.hrdina.y) === 'lava') lavy += 1;
    if (h.oznameni && h.oznameni !== pred.oznameni) ohlaseno.push(h.oznameni.text);
    obsluz(h);
    for (const n of h.nepratele) {
      if (vide.has(n)) continue;
      vide.add(n);
      if (n.boss || n.pan) continue;
      if (!povolene.has(n.druh)) chybyMap.push(`na mapě ${id} se objevil ${n.druh}`);
      if (!(n.druh in prvniDruhu)) prvniDruhu[n.druh] = Math.round(h.cas * 10) / 10;
    }
    if (![h.hrdina.x, h.hrdina.y, h.hrdina.hp, h.hrdina.vx, h.hrdina.vy].every(Number.isFinite) || h.nepratele.some((n) => !Number.isFinite(n.x) || !Number.isFinite(n.hp))) {
      throw new Error(`NaN na mapě ${id} v čase ${h.cas.toFixed(1)} s`);
    }
  }
  // Každý druh až od svého času a do 40 s po něm (když hra trvala dost dlouho), smečky jen kde jsou.
  for (const d of m.nepratele) {
    const od = odKdy(id, d.druh);
    if (prvniDruhu[d.druh] !== undefined && prvniDruhu[d.druh] < od) chybyMap.push(`${d.druh} na mapě ${id} přišel moc brzy (${prvniDruhu[d.druh]} s)`);
    if (prvniDruhu[d.druh] === undefined && h.cas > od + 40) chybyMap.push(`na mapě ${id} po ${od} s nepřišel žádný ${d.druh}`);
  }
  if (!m.smecky && h.smecek) chybyMap.push(`na mapě ${id} přišla smečka`);
  if (m.smecky && h.cas > m.smecky.od + 1 && !h.smecek) chybyMap.push(`na mapě ${id} nepřišla smečka`);
  for (const p of PRICHODY_MAP[id]) {
    if (h.cas > p.od + 1 && !ohlaseno.includes(p.text)) chybyMap.push(`na mapě ${id} chybí ohlášení „${p.text}“`);
  }
  if (h.zabito === 0 || h.hrdina.uroven < 3) chybyMap.push(`na mapě ${id} se skoro nehrálo (zabito ${h.zabito}, úroveň ${h.hrdina.uroven})`);
  if (vPrekazce.hrdina || vPrekazce.nepratele) chybyMap.push(`na mapě ${id} stál v překážce hrdina ${vPrekazce.hrdina}× a nepřítel ${vPrekazce.nepratele}×`);
  if (h.cas > 181 && prvniBoss !== poradiBossu(id)[0]) chybyMap.push(`na mapě ${id} přišel první ${prvniBoss}, ne hlavní boss ${poradiBossu(id)[0]}`);
  if (m.bubliny && h.cas > 20 && !h.bublin) chybyMap.push(`v bažině ${id} nevyrostla žádná bublina`);
  if (m.bahno && !pohyb.vBahne) chybyMap.push(`na mapě ${id} hrdina nikdy nešel bahnem`);
  if (m.led) {
    if (!pohyb.naLedu || pohyb.klouze < pohyb.naLedu * 0.3) chybyMap.push(`na ledu mapy ${id} hrdina neklouže (${pohyb.klouze} z ${pohyb.naLedu} kroků)`);
  } else if (pohyb.naLedu) chybyMap.push(`na mapě ${id} bez ledu je led`);
  if (pohyb.smyk) chybyMap.push(`na mapě ${id} klouže i mimo led (${pohyb.smyk} kroků)`);
  vysledkyMap[id] = {
    preziti_s: Math.round(h.cas), uroven: h.hrdina.uroven, zabito: h.zabito, zabito_bossu: h.zabitoBossu,
    prvni_druhu_s: prvniDruhu, smecek: h.smecek, prvni_boss: prvniBoss,
    ...(m.prekazky ? { kroku_u_prekazky: pohyb.uPrekazky } : {}),
    ...(m.lava ? { popaleno: h.popaleno, snimku_na_lave: lavy } : {}),
    ...(m.bahno ? { kroku_v_bahne: pohyb.vBahne, bublin: h.bublin } : {}),
    ...(m.led ? { na_ledu_procent: Math.round((pohyb.naLedu / Math.max(1, pohyb.naLedu + pohyb.naSnehu)) * 100), klouzani_kroku: pohyb.klouze } : {}),
  };
}
// Led: plochy kolem 25–50 % jezera, souvislé (soused ledu je skoro vždy zase led) a stejné pro pravidla i kreslení.
{
  const { led } = MAPY.jezero;
  let ledu = 0;
  let sousedu = 0;
  let sousedniLed = 0;
  for (let ty = -120; ty < 120; ty++) {
    for (let tx = -120; tx < 120; tx++) {
      if (!ledovaDlazdice(tx, ty, led)) continue;
      ledu += 1;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        sousedu += 1;
        if (ledovaDlazdice(tx + dx, ty + dy, led)) sousedniLed += 1;
      }
    }
  }
  const podil = ledu / 240 ** 2;
  if (podil < 0.25 || podil > 0.5) chybyMap.push(`ledu je ${Math.round(podil * 100)} % jezera`);
  if (sousedniLed / sousedu < 0.8) chybyMap.push('led je rozházený po dlaždicích, ne v plochách');
  vysledkyMap.jezero.ledu_procent = Math.round(podil * 100);
  if (naLedu(VYCHOZI_MAPA, 0, 0) || naLedu('jeskyne', 0, 0)) chybyMap.push('led mimo jezero');
  // Hrdina na velké ploše ledu: z klidu se rozjíždí pomalu, po puštění jede dál a pomalu zastaví. Na sněhu stojí hned.
  const plocha = (chciLed) => {
    for (let r = 0; r < 60; r++) {
      for (let tx = -r; tx <= r; tx++) {
        for (const ty of [-r, r]) {
          let vse = true;
          for (let dy = -3; dy <= 3 && vse; dy++) for (let dx = -3; dx <= 3 && vse; dx++) vse = ledovaDlazdice(tx + dx, ty + dy, led) === chciLed;
          if (vse) return { x: (tx + 0.5) * VELIKOST_DLAZDICE, y: (ty + 0.5) * VELIKOST_DLAZDICE };
        }
      }
    }
    return null;
  };
  const klouzej = (misto, vstupy) => {
    const h = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, {}, 'jezero');
    Object.assign(h.hrdina, misto);
    h.doSpawnu = 1e9;
    h.doBedny = 1e9;
    h.doZamcene = 1e9;
    const drahy = [];
    for (const vstup of vstupy) {
      const x = h.hrdina.x;
      aktualizuj(h, DT, vstup, SIRKA, VYSKA);
      drahy.push(h.hrdina.x - x);
    }
    return drahy;
  };
  const naLedeMisto = plocha(true);
  const naSnehuMisto = plocha(false);
  if (!naLedeMisto || !naSnehuMisto) chybyMap.push('na jezeře chybí velká plocha ledu nebo sněhu');
  else {
    const krok = novaHra(vytvorRng(seminko)).hrdina.rychlost * DT;
    const plyn = Array(15).fill({ dx: 1, dy: 0 });
    const pust = Array(6).fill({ dx: 0, dy: 0 });
    const led1 = klouzej(naLedeMisto, [...plyn, ...pust]);
    const snih1 = klouzej(naSnehuMisto, [...plyn, ...pust]);
    if (!(led1[0] > 0 && led1[0] < krok * 0.2)) chybyMap.push(`na ledu se hrdina rozjel hned (${led1[0].toFixed(2)} px)`);
    if (!(led1[14] > led1[0] && led1[14] < krok)) chybyMap.push('na ledu hrdina nenabral rychlost');
    if (!(led1[15] > 0 && led1[20] > 0 && led1[20] < led1[15])) chybyMap.push('na ledu hrdina po puštění nedoklouzal');
    if (Math.abs(snih1[0] - krok) > 1e-9 || snih1[15] !== 0) chybyMap.push('na sněhu se hrdina nepohybuje jako na Louce');
    vysledkyMap.jezero.klouzani_px = { rozjezd: Math.round(led1[0] * 100) / 100, po_pul_s: Math.round(led1[14] * 100) / 100, po_pusteni: Math.round(led1[15] * 100) / 100, plny_krok: Math.round(krok * 100) / 100 };
  }
}
// Jeskyně: lucerna svítí dál (pravidla i světlo), na Louce ne.
{
  const louka = staty(novaHra(vytvorRng(seminko), 'svetlonos')).lucerna.dosah;
  const jeskyne = staty(novaHra(vytvorRng(seminko), 'svetlonos', {}, 'jeskyne')).lucerna.dosah;
  if (Math.abs(louka - dosahLucerny1) > 1e-9 || Math.abs(jeskyne - louka * MAPY.jeskyne.dosahLucerny) > 1e-9) chybyMap.push(`dosah lucerny v jeskyni ${jeskyne} (na louce ${louka})`);
}
// Ledový duch je duch: schovaný a zase vidět, zbraně ho schovaného nevidí.
if (!pridejNepritele(novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, {}, 'jezero'), 'ledovy_duch', 300, 0).duch) chybyMap.push('ledový duch není duch');

// Mapy II. Hrdina stojí sám (bez vln, beden, bossů, smeček, kupce a bublin), kde ho test postaví.
const tichaMapa = (id) => {
  const h = novaHra(vytvorRng(seminko), VYCHOZI_TRIDA, {}, id);
  h.zbrane = {};
  Object.assign(h, { doSpawnu: Infinity, doBedny: Infinity, doZamcene: Infinity, dalsiBoss: Infinity, dalsiSmecka: null, dalsiKupec: Infinity, doBubliny: Infinity });
  h.hrdina.nezranitelny = 1e9;
  return h;
};
// Střed nejbližšího čtverce 3×3 dlaždic, kde je všude (nebo nikde) zvláštní plocha mapy a žádná překážka.
const ctverec = (id, naPlose) => {
  const p = plochaMapy(id);
  for (let r = 0; r < 80; r++) {
    for (let ty = -r; ty <= r; ty++) {
      for (let tx = -r; tx <= r; tx++) {
        if (Math.max(Math.abs(tx), Math.abs(ty)) !== r) continue;
        let vse = true;
        for (let dy = -1; dy <= 1 && vse; dy++) {
          for (let dx = -1; dx <= 1 && vse; dx++) {
            vse = Boolean(p && dlazdicePlochy(tx + dx, ty + dy, p.data)) === naPlose && prekazkaNaDlazdici(id, tx + dx, ty + dy) < 0;
          }
        }
        if (vse) return { x: (tx + 0.5) * VELIKOST_DLAZDICE, y: (ty + 0.5) * VELIKOST_DLAZDICE };
      }
    }
  }
  return null;
};
// Překážky: na všech mapách kromě Louky, u startu žádná, na zvláštní ploše ani vedle sebe (ani úhlopříčně),
// obrázek 16×16 z palety ozdob a kolizní kruh uvnitř něj.
for (const id of PORADI_MAP) {
  const m = MAPY[id];
  const p = plochaMapy(id);
  if (id === VYCHOZI_MAPA ? m.prekazky : !m.prekazky?.kusy.length) chybyMap.push(id === VYCHOZI_MAPA ? 'na Louce jsou překážky' : `mapa ${id} nemá překážky`);
  if (!m.prekazky) continue;
  for (const [i, kus] of m.prekazky.kusy.entries()) {
    if (kus.radky.length !== 16 || kus.radky.some((r) => r.length !== 16 || [...r].some((z) => z !== '.' && !m.ozdoby.paleta[z]))) chybyMap.push(`překážka ${i} mapy ${id} není 16×16 z palety`);
    const [x, y, r] = kus.kruh ?? [];
    if (!(r > 2 && x - r >= 0 && x + r <= 16 && y - r >= 0 && y + r <= 16)) chybyMap.push(`překážka ${i} mapy ${id} má kruh mimo obrázek`);
  }
  let pocet = 0;
  const N = 80;
  for (let ty = -N; ty < N; ty++) {
    for (let tx = -N; tx < N; tx++) {
      if (prekazkaNaDlazdici(id, tx, ty) < 0) continue;
      pocet += 1;
      if (Math.abs(tx) <= VOLNO_U_STARTU && Math.abs(ty) <= VOLNO_U_STARTU) chybyMap.push(`překážka u startu na mapě ${id}`);
      if (p && dlazdicePlochy(tx, ty, p.data)) chybyMap.push(`překážka na ploše ${p.druh} mapy ${id}`);
      for (const [dx, dy] of [[1, 0], [1, 1], [0, 1], [-1, 1]]) {
        if (prekazkaNaDlazdici(id, tx + dx, ty + dy) >= 0) chybyMap.push(`dvě překážky vedle sebe na mapě ${id}`);
      }
    }
  }
  const procent = (pocet / (2 * N) ** 2) * 100;
  if (procent < 1 || procent > 5) chybyMap.push(`překážek na mapě ${id} je ${procent.toFixed(1)} %`);
  vysledkyMap[id].prekazek_procent = Math.round(procent * 10) / 10;
}
// U první překážky vpravo od startu: nepřítel přímo za ní (na čáře s hrdinou) ji obejde a dojde k hrdinovi a nikdy
// v ní nestojí, duch jí proletí, hrdina se o ni zastaví a sklouzne kolem a střela hrdiny i bosse přes ni přeletí.
const prvniPrekazka = (id) => {
  for (let tx = VOLNO_U_STARTU + 1; tx < 300; tx++) {
    for (let ty = -2; ty <= 2; ty++) {
      const k = kruhPrekazky(id, tx, ty);
      if (k) return k;
    }
  }
  return null;
};
const pokusyPrekazek = {};
for (const id of PORADI_MAP.filter((m) => MAPY[m].prekazky)) {
  const k = prvniPrekazka(id);
  if (!k) {
    chybyMap.push(`na mapě ${id} není překážka`);
    continue;
  }
  const zaPrekazkou = (druh) => {
    const h = tichaMapa(id);
    Object.assign(h.hrdina, { x: k.x + k.r + 30, y: k.y });
    const n = pridejNepritele(h, druh, k.x - k.r - 30, k.y);
    let doslo = null;
    let hloubka = 0;
    for (let t = 0; t < 8 && doslo === null; t += DT) {
      aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
      hloubka = Math.max(hloubka, k.r + n.polomer - Math.hypot(n.x - k.x, n.y - k.y));
      if (Math.hypot(n.x - h.hrdina.x, n.y - h.hrdina.y) < n.polomer + 8) doslo = Math.round(t * 100) / 100;
    }
    return { doslo, hloubka };
  };
  const kost = zaPrekazkou('kostlivec');
  if (kost.doslo === null || kost.hloubka > 0.5) chybyMap.push(`na mapě ${id} kostlivec překážku neobešel (došel ${kost.doslo}, v ní ${kost.hloubka.toFixed(1)} px)`);
  const duch = zaPrekazkou('duch');
  if (duch.doslo === null || duch.hloubka < 5) chybyMap.push(`na mapě ${id} duch překážkou neproletěl`);
  // hrdina jde rovně na střed překážky
  const h = tichaMapa(id);
  Object.assign(h.hrdina, { x: k.x - k.r - 30, y: k.y });
  let hloubka = 0;
  for (let t = 0; t < 4; t += DT) {
    aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
    hloubka = Math.max(hloubka, hloubkaVPrekazce(id, h.hrdina.x, h.hrdina.y, POLOMER_HRDINY));
  }
  if (hloubka > 0.01 || h.hrdina.x < k.x + k.r) chybyMap.push(`na mapě ${id} hrdina překážku neobešel (x ${Math.round(h.hrdina.x - k.x)} od ní, v ní ${hloubka.toFixed(2)} px)`);
  // střela hrdiny a střela bosse letí přes ni
  const hs = tichaMapa(id);
  Object.assign(hs.hrdina, { x: k.x - 260, y: k.y });
  hs.strely.push({ x: k.x - k.r - 30, y: k.y, vx: 340, vy: 0, zivot: 1.2, poskozeni: 1 });
  hs.strelyBossu.push({ x: k.x - k.r - 30, y: k.y, vx: 160, vy: 0, zivot: 3.5, rana: 5 });
  hraj(hs, 0.6);
  if (hs.strely.length !== 1 || hs.strely[0].x < k.x + k.r || hs.strelyBossu.length !== 1 || hs.strelyBossu[0].x < k.x + k.r) chybyMap.push(`na mapě ${id} střela nepřeletěla překážku`);
  // kámen praku na kostlivce za překážkou se od ní odrazí zpátky a nikdy v ní není
  const hk = tichaMapa(id);
  hk.zbrane = { prak: { uroven: 1, nabiti: 0 } };
  Object.assign(hk.hrdina, { x: k.x - k.r - 60, y: k.y });
  const zaSkalou = pridejNepritele(hk, 'kostlivec', k.x + k.r + 20, k.y);
  zaSkalou.rychlost = 0;
  let vSkale = 0;
  let zpet = false;
  hraj(hk, 0.6, (g) => {
    for (const kam of g.oblazky) {
      vSkale = Math.max(vSkale, hloubkaVPrekazce(id, kam.x, kam.y, POLOMER_KAMENE));
      if (kam.vx < 0) zpet = true;
    }
  });
  if (!(hk.odSkal > 0) || !zpet || vSkale > 1e-6) chybyMap.push(`na mapě ${id} se kámen od překážky neodrazil (${hk.odSkal}×, v ní ${vSkale.toFixed(2)} px)`);
  pokusyPrekazek[id] = { kostlivec_dosel_s: kost.doslo, duch_dosel_s: duch.doslo, kamen_od_skaly: hk.odSkal };
}
// Láva pálí, dokud v ní hrdina stojí: každou půlsekundu rána ranaHrozby(lava.poskozeni) s oranžovým číslem.
// Kousek vedle na skále se nic neděje.
{
  const id = 'sopka';
  const lava = ctverec(id, true);
  const skala = ctverec(id, false);
  if (!lava || !skala) chybyMap.push('na sopce chybí láva nebo skála 3×3');
  else {
    const h = tichaMapa(id);
    h.hrdina.nezranitelny = 0;
    Object.assign(h.hrdina, lava);
    let oranzovych = 0;
    hraj(h, 2, (x) => { oranzovych = Math.max(oranzovych, x.cisla.filter((c) => c.barva === 'ohen').length); });
    const rana = Math.round(MAPY[id].lava.poskozeni * silaHrozby(0).poskozeni * MAPY[id].obtiznost.poskozeni);
    if (h.popaleno < 3 || h.popaleno > 5 || h.hrdina.hp !== h.hrdina.maxHp - rana * h.popaleno || !oranzovych) chybyMap.push(`láva pálila ${h.popaleno}× (životů ${h.hrdina.hp}, rána ${rana})`);
    const hs = tichaMapa(id);
    hs.hrdina.nezranitelny = 0;
    Object.assign(hs.hrdina, skala);
    hraj(hs, 2);
    if (hs.popaleno || hs.hrdina.hp !== hs.hrdina.maxHp) chybyMap.push('skála vedle lávy pálí');
    // Zbroj (pasiva) z lávy nic neubere, láva není nepřítel.
    const hz = tichaMapa(id);
    hz.hrdina.nezranitelny = 0;
    hz.hrdina.pancir = 50;
    Object.assign(hz.hrdina, lava);
    hraj(hz, 2);
    if (!hz.popaleno || hz.hrdina.hp !== hz.hrdina.maxHp - rana * hz.popaleno || hz.ubranoZbroji) chybyMap.push(`Zbroj ubrala z lávy (${hz.hrdina.hp} životů)`);
    if (naPlose(id, 0, 0) || plochaMapy(id).druh !== 'lava') chybyMap.push('hrdina na sopce začíná v lávě');
    vysledkyMap[id].lava = { ran_za_2_s: h.popaleno, rana };
  }
}
// Bahno: hrdina v něm jde rychlostí × bahno.zpomaleni, na trávě normálně. Bubliny rostou v bahně do dosahu,
// po varování prasknou v zelený jedový oblak, který nejdřív nepálí a pak ano.
{
  const id = 'bazina';
  const { bahno, bubliny } = MAPY[id];
  const vBahne = ctverec(id, true);
  const trava = ctverec(id, false);
  if (!vBahne || !trava) chybyMap.push('v bažině chybí bahno nebo tráva 3×3');
  else {
    const krok = (misto) => {
      const h = tichaMapa(id);
      Object.assign(h.hrdina, misto);
      aktualizuj(h, DT, { dx: 1, dy: 0 }, SIRKA, VYSKA);
      return h.hrdina.x - misto.x;
    };
    const plny = novaHra(vytvorRng(seminko)).hrdina.rychlost * DT;
    if (Math.abs(krok(vBahne) - plny * bahno.zpomaleni) > 1e-9 || Math.abs(krok(trava) - plny) > 1e-9) chybyMap.push(`v bahně krok ${krok(vBahne)}, na trávě ${krok(trava)} (plný ${plny})`);
    if (naPlose(id, 0, 0)) chybyMap.push('hrdina v bažině začíná v bahně');
    // bubliny kolem stojícího hrdiny
    const h = tichaMapa(id);
    Object.assign(h.hrdina, vBahne);
    h.doBubliny = bubliny.kazdych;
    const videne = new WeakSet();
    const cekaji = [];
    let prasklo = 0;
    hraj(h, 20, (x) => {
      for (const b of x.bubliny) {
        if (videne.has(b)) continue;
        videne.add(b);
        const d = Math.hypot(b.x - x.hrdina.x, b.y - x.hrdina.y);
        if (naPlose(id, b.x, b.y) !== 'bahno' || d > bubliny.dosah + 1e-6 || d < 40 - 1e-6) chybyMap.push(`bublina mimo bahno nebo dosah (${Math.round(d)} px)`);
        cekaji.push({ b, kdy: x.cas });
      }
      for (const c of cekaji.filter((c) => !c.hotovo && x.cas - c.kdy >= bubliny.varovani + DT)) {
        c.hotovo = true;
        if (x.oblaky.some((o) => o.druh === 'bahno' && o.x === c.b.x && o.y === c.b.y)) prasklo += 1;
      }
    });
    if (h.bublin < 5 || prasklo < cekaji.filter((c) => c.hotovo).length || !prasklo) chybyMap.push(`bublin ${h.bublin}, prasklo v oblak ${prasklo}`);
    // bublina přímo pod hrdinou: varování a nafukování nepálí, pak jed
    const hj = tichaMapa(id);
    Object.assign(hj.hrdina, vBahne);
    hj.hrdina.nezranitelny = 0;
    hj.bubliny.push({ x: vBahne.x, y: vBahne.y, zivot: bubliny.varovani, varovani: bubliny.varovani, polomer: bubliny.polomer });
    hraj(hj, bubliny.varovani + NAFUKOVANI_OBLAKU - 2 * DT);
    const pred = hj.hrdina.hp;
    let jedu = 0;
    hraj(hj, 0.3, (x) => { jedu = Math.max(jedu, x.cisla.filter((c) => c.barva === 'jed').length); });
    const rana = Math.round(bubliny.jed * silaHrozby(0).poskozeni * MAPY[id].obtiznost.poskozeni);
    if (pred !== hj.hrdina.maxHp || hj.hrdina.hp !== pred - rana || !jedu) chybyMap.push(`bublina pálila při varování nebo nepálila potom (${pred} → ${hj.hrdina.hp})`);
    vysledkyMap[id].bubliny = { za_20_s: h.bublin, prasklo, rana };
  }
}
// Žába skáče: chvíli sedí, chvíli letí víc než dvakrát rychleji, v průměru jde zhruba svou rychlostí.
{
  const h = tichaMapa('bazina');
  const z = pridejNepritele(h, 'zaba', 180, 0);
  let sedi = 0;
  let skace = 0;
  let ujde = 0;
  let nejrychleji = 0;
  let predX = z.x;
  let predY = z.y;
  hraj(h, 1.5, () => {
    const d = Math.hypot(z.x - predX, z.y - predY);
    predX = z.x;
    predY = z.y;
    ujde += d;
    if (d < 1e-9) sedi += 1;
    else skace += 1;
    nejrychleji = Math.max(nejrychleji, d / DT);
  });
  const prumer = ujde / 1.5;
  if (!sedi || !skace || nejrychleji < z.rychlost * 2 || prumer < z.rychlost * 0.7 || prumer > z.rychlost * 1.3) chybyMap.push(`žába neskáče (sedí ${sedi}, skáče ${skace}, nejrychleji ${Math.round(nejrychleji)}, průměr ${Math.round(prumer)})`);
  vysledkyMap.bazina.zaba = { snimku_sedi: sedi, snimku_skace: skace, prumer_px_s: Math.round(prumer), skok_px_s: Math.round(nejrychleji) };
  if (!(SKOK_ZABY.pauza > 0 && SKOK_ZABY.skok > 0)) chybyMap.push('SKOK_ZABY nesedí');
}
// Hlavní bossové map: na Louce pořadí beze změny, na každé mapě první její hlavní boss a pak zbylí tři základní
// (každý jen jednou). Noví bossové vychází ze známého bosse, mají 2–3 schopnosti s varováním, vlastní jméno, nápis
// a sprite aspoň 16×16. Ve hře přijde první opravdu hlavní boss a jeho truhla dá kus sady toho, z koho vychází.
if (poradiBossu(VYCHOZI_MAPA).join() !== PORADI_BOSSU.join()) chybyMap.push('pořadí bossů na Louce se změnilo');
const hlavniBossove = [...new Set(PORADI_MAP.map((id) => MAPY[id].boss))].filter((b) => !PORADI_BOSSU.includes(b));
if (hlavniBossove.length < 3) chybyMap.push(`nových hlavních bossů je ${hlavniBossove.length}`);
for (const druh of hlavniBossove) {
  const b = BOSSOVE[druh];
  const seznam = schopnostiBosse(druh);
  if (!b || !PORADI_BOSSU.includes(b.zaklad) || !VYBAVA[b.zaklad] || zakladBosse(druh) !== b.zaklad) {
    chybyMap.push(`${druh} nevychází ze známého bosse`);
    continue;
  }
  if (seznam.length < 2 || seznam.length > 3 || seznam.some((x) => !Object.hasOwn(SCHOPNOSTI, x.id) || !(x.varovani >= 0.7 && x.varovani <= 1))) chybyMap.push(`${druh} má špatné schopnosti`);
  for (const x of seznam) {
    if (x.id === 'hod' && !jmenaSpritu.has(x.strela)) chybyMap.push(`${druh} hází ${x.strela} bez spritu`);
    if (x.id === 'vyvolani' && (!Object.hasOwn(RYCHLOST_NEPRATEL, x.druh) || x.max < x.pocet[1])) chybyMap.push(`${druh} vyvolá ${x.druh}`);
  }
  if (Object.values(BOSSOVE).filter((o) => o.prichod === b.prichod || o.nazev === b.nazev).length !== 1) chybyMap.push(`${druh} má stejný nápis nebo jméno jako jiný boss`);
  const sprite = textSpritu.match(new RegExp(`^ {2}${druh}: \\[\\n([\\s\\S]*?)\\n {2}\\],`, 'm'));
  const radky = sprite ? [...sprite[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [];
  if (radky.length < 16 || radky.some((r) => r.length !== radky.length)) chybyMap.push(`sprite ${druh} není aspoň 16×16`);
  if (!(druh in RYCHLOST_NEPRATEL)) chybyMap.push(`${druh} nemá staty`);
}
const truhlyMap = {};
for (const id of PORADI_MAP) {
  const poradi = poradiBossu(id);
  if (poradi[0] !== MAPY[id].boss || !Object.hasOwn(BOSSOVE, poradi[0])) chybyMap.push(`mapa ${id} nemá hlavního bosse (${MAPY[id].boss})`);
  if (poradi.length !== PORADI_BOSSU.length || new Set(poradi.map(zakladBosse)).size !== PORADI_BOSSU.length) chybyMap.push(`bossové na mapě ${id}: ${poradi}`);
  const h = tichaMapa(id);
  h.dalsiBoss = DT / 2;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const boss = h.nepratele.find((n) => n.boss);
  if (boss?.druh !== poradi[0] || h.oznameni?.text !== BOSSOVE[poradi[0]].prichod) {
    chybyMap.push(`na mapě ${id} nepřišel první hlavní boss (${boss?.druh})`);
    continue;
  }
  h.dalsiBoss = Infinity;
  boss.hp = 0;
  aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
  const truhla = h.predmety.find((p) => p.druh === 'truhla');
  if (!truhla) {
    chybyMap.push(`hlavní boss mapy ${id} nenechal truhlu`);
    continue;
  }
  Object.assign(h.hrdina, { x: truhla.x, y: truhla.y });
  hraj(h, TRVANI_OTEVRENI + 0.2);
  const kus = h.nalezy[0];
  if (!kus || kus.boss !== zakladBosse(boss.druh) || h.truhlaOd !== boss.druh || !h.volby) chybyMap.push(`truhla hlavního bosse mapy ${id} dala ${kus?.boss} (od ${h.truhlaOd})`);
  truhlyMap[id] = { boss: boss.druh, kus: kus ? `${kus.nazev} (${kus.boss})` : null };
}

const soucetHodnot = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const zaokrouhli = (s) => Object.fromEntries(Object.entries(s).map(([id, p]) => [id, Math.round(p * 1000) / 10]));

const vysledek = {
  seminko,
  mapy: { ...vysledkyMap, prekazky: pokusyPrekazek, truhly_hlavnich_bossu: truhlyMap },
  trida: hra.trida,
  preziti_s: Math.round(hra.cas),
  konec: hra.konec,
  uroven: hra.hrdina.uroven,
  zabito: hra.zabito,
  zabito_bossu: hra.zabitoBossu,
  vyber_vylepseni: volby,
  max_nepratel_najednou: maxNepratel,
  max_ulomku_najednou: maxCastic,
  zasahu_hrdiny: zasahu,
  tresu_obrazovky: tresu,
  prvni_pavouk_s: prvniPavouk === null ? null : Math.round(prvniPavouk),
  max_pavouku_najednou: maxPavouku,
  zasahu_siti: siti,
  sekund_v_siti: Math.round(krokuVSiti * DT),
  zbrane: Object.fromEntries(Object.entries(hra.zbrane).map(([id, z]) => [id, z.uroven])),
  pasivy: hra.pasivy,
  zmen_prehledu_vybavy: zmenVybavy,
  tridy_3_minuty: tridy,
  duse_za_hru: duseHry,
  vse_vylepsene_3_minuty: { preziti_s: Math.round(vylepsena.cas), uroven: vylepsena.hrdina.uroven, zabito: vylepsena.zabito },
  stesti_srdce_a_magnety: { bez: padloBez, max: padloSeStestim },
  oziveni_kamikaze: {
    ozivil_v_s: oziveni && Math.round(oziveni.cas), konec_s: Math.round(sOzivenim.cas), bez_oziveni_konec_s: Math.round(bezOziveni.cas),
  },
  cena_vseho: zaplaceno,
  rarity_nabidnutych: nabidnuto,
  truhel,
  sance_rarit_procenta: { zacatek: zaokrouhli(sZacatek), minuta_15: zaokrouhli(sPozde), stesti_max: zaokrouhli(sStesti) },
  prvni_s: Object.fromEntries(Object.entries(prvni).map(([id, c]) => [id, c === null ? null : Math.round(c)])),
  smecky_vlku: smecky,
  jedovych_oblaku: oblaku,
  zasahu_oblakem: zasahuOblakem,
  max_duchu_najednou: maxDuchu,
  prumer_schovanych_duchu: Math.round((duchuSchovanych / Math.max(1, hra.cas / DT)) * 10) / 10,
  bedny: {
    objevilo: hra.beden, rozbito: hra.rozbitoBeden, max_naraz: maxBeden, korist: hra.zBeden, zlataku: hra.zlataky, bomb: hra.bomb,
    rozbila_zbran_za_s: rozbiteZbrani,
  },
  bossove: {
    prisli: prisliBossove, zabito: hra.zabitoBossu, zasahy_hrdiny: hra.zasahyBossu, schopnosti_pouzil: hra.schopnostiPouzito,
    max_pavoucku: maxPavoucku, souboje, zasahu_schopnostmi_celkem: soucet, schopnosti_zblizka: schopnostiPokusy,
  },
  urovne_bez_stropu: {
    zbrane_hlavni_hry: Object.fromEntries(Object.entries(hra.zbrane).map(([id, z]) => [id, z.uroven])),
    nejvyssi_zbran: Math.max(...Object.values(hra.zbrane).map((z) => z.uroven)),
    pasivy_hlavni_hry: hra.pasivy,
    posledni_rust_zbrane_na_urovni: rostlyDo,
    pasivy_na_60: pasivy60,
    vse_na_60_za_30_s: {
      zabito: silna.zabito, zivy: !silna.konec, max_strel: silnaMaxStrel, max_trsu: silnaMaxTrsu,
      jisker: silnaStaty.jiskra.pocet, krumpacu: silnaStaty.krumpace.pocet, preskoku: silnaStaty.blesk.preskoky,
      dosah_lucerny: Math.round(silnaStaty.lucerna.dosah), poskozeni_jiskry: Math.round(silnaStaty.jiskra.poskozeni),
    },
  },
  hrozba: {
    konecna: hra.hrozba,
    ohlaseni: ohlaseniHrozby,
    prvni_elita_s: prvniElita === null ? null : Math.round(prvniElita),
    elit: hra.elit,
    podil_elit_procenta: Object.fromEntries(Object.entries(elityPodleCasu).map(([k, v]) => [k, v[0] ? Math.round(podil(v) * 1000) / 10 : null])),
    preziti_min: {
      bez_vylepseni: hra.konec ? Math.round(hra.cas / 6) / 10 : `přes ${Math.round(delka / 6) / 10}`,
      vse_vylepsene: vydrz.konec ? Math.round(vydrz.cas / 6) / 10 : 'přes 30',
      vse_vylepsene_uroven: vydrz.hrdina.uroven,
    },
    tabulka: Object.fromEntries([0, 5, 10, 15, 20, 25].map((min) => {
      const h = silaHrozby(min * 60);
      return [`${min}_min`, { zivoty: +h.zivoty.toFixed(2), bossove: +h.bossZivoty.toFixed(2), poskozeni: +h.poskozeni.toFixed(2), rychlost: +h.rychlost.toFixed(2), naraz: h.maxNepratel, elita_procent: +(h.elita * 100).toFixed(1) }];
    })),
  },
  cisla_poskozeni: {
    cisel: cislaHry.length,
    max_naraz: maxCisel,
    max_naraz_na_60: silnaMaxCisel,
    silnych_procenta: Math.round(podilSilnych * 1000) / 10,
    cervenych: cervenychCisel,
    zelenych: cislaHry.filter((c) => c.barva === 'leceni').length,
    kritickych: cislaHry.filter((c) => c.barva === 'krit').length,
    prah_silneho_na_konci: Math.round(hra.prahSilneho * 10) / 10,
  },
  trny_a_zrcadlo: {
    hlavni_hra: { max_trsu_naraz: maxTrsu, odrazeno_strel: hra.odrazeno, odhozeno_nepratel: hra.odhozeno },
    trny: trnovePokusy, zrcadlo: zrcadlovePokusy,
  },
  svetlusky_a_mraz: {
    hlavni_hra: {
      urovne: { svetlusky: hra.zbrane.svetlusky?.uroven ?? 0, mraz: hra.zbrane.mraz?.uroven ?? 0 },
      zasahu_svetluskami: hra.zasahuSvetluskami, zon: hra.zon, max_zon_naraz: maxZon, roztristeno: hra.roztristeno,
    },
    na_60_urovni: { zasahu_svetluskami: silna.zasahuSvetluskami, zon: silna.zon, max_zon_naraz: silnaMaxZon, roztristeno: silna.roztristeno },
    svetlusky: svetluskovePokusy, mraz: mrazivePokusy,
  },
  zvon_cep_seminka: {
    hlavni_hra: {
      urovne: { zvon: hra.zbrane.zvon?.uroven ?? 0, cep: hra.zbrane.cep?.uroven ?? 0, seminka: hra.zbrane.seminka?.uroven ?? 0 },
      zvoneni: hra.zvoneni, omraceno: hra.omraceno, zasahu_cepem: hra.zasahuCepem, vybuchlo_seminek: hra.vybuchlo,
    },
    na_60_urovni: {
      zvoneni: silna.zvoneni, omraceno: silna.omraceno, max_vln_naraz: silnaMaxVlnZvonu, zasahu_cepem: silna.zasahuCepem,
      vybuchlo_seminek: silna.vybuchlo, max_seminek_naraz: silnaMaxSeminek,
    },
    zvon: zvonovePokusy, cep: cepovePokusy, seminka: seminkovePokusy,
  },
  korene_stopa_prak: {
    hlavni_hra: {
      urovne: { korene: hra.zbrane.korene?.uroven ?? 0, stopa: hra.zbrane.stopa?.uroven ?? 0, prak: hra.zbrane.prak?.uroven ?? 0 },
      drzeno: hra.drzeno, plamenu: hra.plamenu, paleni: hra.paleniStopou, zapaleno: hra.zapaleno, vystreleno: hra.vystreleno,
      zasahu_kamenem: hra.zasahuKamenem, odrazu: hra.odrazu,
    },
    se_vsim_na_60_urovni: { max_korenu_naraz: silnaMaxKorenu, max_plamenu_naraz: silnaMaxPlamenu, max_kamenu_naraz: silnaMaxKamenu },
    sami_na_60_urovni: sami60,
    korene: korenovePokusy, stopa: stopovePokusy, prak: prakovePokusy,
  },
  pasivy_zbrani: {
    hlavni_hra: {
      pasivy: Object.fromEntries(['krit', 'rozpeti', 'ozvena', 'vydrz', 'rychleRuce', 'prival'].map((id) => [id, hra.pasivy[id] ?? 0])),
      kritu: hra.kritu, ozven_vystrelu: hra.ozvenVystrelu, ozven_zasahu: hra.ozvenZasahu, otreseno: hra.otreseno, zasahu_uhliky: hra.zasahuUhliky,
    },
    ...pasivyZbrani,
  },
  pasivy_preziti: {
    hlavni_hra: {
      pasivy: Object.fromEntries(['zbroj', 'regenerace', 'stesti'].map((id) => [id, hra.pasivy[id] ?? 0])),
      ubrano_zbroji: hra.ubranoZbroji, zmenseno_ran: hra.zbrojiZasahu, vyleceno_regeneraci: Math.round(hra.vylecenoRegeneraci),
    },
    vse_vylepsene: {
      pasivy: Object.fromEntries(['zbroj', 'regenerace', 'stesti'].map((id) => [id, vydrz.pasivy[id] ?? 0])),
      ubrano_zbroji: vydrz.ubranoZbroji, zmenseno_ran: vydrz.zbrojiZasahu, vyleceno_regeneraci: Math.round(vydrz.vylecenoRegeneraci),
    },
    ...pasivyPreziti,
  },
  pasivy_ii: {
    hlavni_hra: {
      pasivy: Object.fromEntries(['upiriZub', 'trnovaZbroj', 'stit', 'moudrost', 'chamtivost'].map((id) => [id, hra.pasivy[id] ?? 0])),
      sani: hra.sani, vraceno_trny: Math.round(hra.vracenoTrny), zastaveno_ran: hra.zablokovano, duse_chamtivosti: duseHry.chamtivost,
    },
    vse_vylepsene: {
      pasivy: Object.fromEntries(['upiriZub', 'trnovaZbroj', 'stit', 'moudrost', 'chamtivost'].map((id) => [id, vydrz.pasivy[id] ?? 0])),
      sani: vydrz.sani, vraceno_trny: Math.round(vydrz.vracenoTrny), zastaveno_ran: vydrz.zablokovano, duse_chamtivosti: dusZaHru(vydrz).chamtivost,
    },
    ...pasivyII,
  },
  vybava_bossu: {
    otevreno_truhel: otevrenoTruhel,
    snimku_otevirani: snimkuOtevirani,
    nalezy: hra.nalezy.map((k) => `${k.nazev} (${RARITY_VYBAVY[k.rarita].nazev})`),
    rozhodnuti,
    nasazeno: Object.fromEntries(seznamVystroje(hra).map(({ slot, kus }) => [slot, kus ? `${kus.nazev} (${RARITY_VYBAVY[kus.rarita].nazev})` : null])),
    sady: hra.ucinekVystroje.sady,
    staty: Object.fromEntries(Object.entries(hra.ucinekVystroje.staty).filter(([, h]) => h).map(([id, h]) => [id, Math.round(h * 1000) / 1000])),
    efekty_pouzito: hra.efektyPouzito,
    zlataky_z_vybavy: hra.zlatakyZVybavy,
    vse_vylepsene: {
      preziti_min: Math.round(vydrz.cas / 6) / 10,
      nalezy: vydrz.nalezy.map((k) => `${k.nazev} (${RARITY_VYBAVY[k.rarita].nazev})`),
      sady: vydrz.ucinekVystroje.sady,
      efekty_pouzito: vydrz.efektyPouzito,
    },
    sance_rarit_procenta: { hrozba_4: zaokrouhli(sanceRaritVybavy(4)), hrozba_16: zaokrouhli(sanceRaritVybavy(16)) },
    efekty: pokusyVystroje,
  },
  zlataky: {
    ziskano: { ...hra.zlatakyZ, celkem: soucetHodnot(hra.zlatakyZ) },
    utraceno: { ...hra.utraceno, celkem: soucetHodnot(hra.utraceno) },
    nakupy: hra.nakupy,
    kupec: { prijezdy: prijezdyKupce, otevreno_obchodu: otevrenoObchodu },
    prehozeni: { celkem: hra.prehozeniCelkem, za_zlataky: hra.prehozeno, v_hlavni_hre: prehozeniHlavni },
    zamcene: { objevilo: hra.zamcenych, otevreno: hra.otevrenoZamcenych },
    zbylo: hra.zlataky,
    duse_ze_zlata: duseHry.zlataky,
    vse_vylepsene: {
      ziskano: soucetHodnot(vydrz.zlatakyZ), utraceno: { ...vydrz.utraceno, celkem: soucetHodnot(vydrz.utraceno) }, nakupy: vydrz.nakupy,
      kupcu: vydrz.kupcu, zamcene_otevreno: vydrz.otevrenoZamcenych, zbylo: vydrz.zlataky,
    },
    pokusy: pokusyZlata,
  },
};
// Zvuk. Nejdřív bez AudioContext: všechno potichu projde a nevznikne ani jeden uzel.
const chybyZvuku = [];
try {
  zvuk.odemkniZvuk();
  for (const id of zvuk.ID_EFEKTU) zvuk.zvukHry(id, 3);
  zvuk.zvukHry('neznamy');
  for (const id of PORADI_MAP) {
    zvuk.hudba(id);
    zvuk.hudba(id, { boss: true, tlumit: true });
  }
  zvuk.hudba(null);
  zvuk.ukazkaHudby();
  zvuk.nastavZvuk({ efekty: 'hodně', hudba: NaN });
  zvuk.zvukStartu();
  zvuk.zvukVolby(3);
  zvuk.zvukZvonu(true);
  zvuk.zvukKamene(4);
} catch (e) {
  chybyZvuku.push(`zvuk bez AudioContext spadl: ${e.message}`);
}
const bezKontextu = zvuk.statistikaZvuku();
if (bezKontextu.odemceno || bezKontextu.uzlu || bezKontextu.efektu) chybyZvuku.push(`zvuk bez AudioContext něco hrál: ${JSON.stringify(bezKontextu)}`);
if (JSON.stringify(zvuk.hlasitostZvuku()) !== JSON.stringify(zvuk.VYCHOZI_HLASITOST)) chybyZvuku.push(`špatná hlasitost změnila nastavení zvuku: ${JSON.stringify(zvuk.hlasitostZvuku())}`);
if (PORADI_MAP.some((id) => !zvuk.NALADY[id])) chybyZvuku.push('některá mapa nemá hudbu');

// Náhradní AudioContext: uzly jen počítá a hlídá, že dostávají rozumná čísla (jako by je hlídal prohlížeč).
let spatnychHodnot = 0;
const hlidej = (v, t) => {
  if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) spatnychHodnot += 1;
};
class FalesnyParam {
  constructor(v) { this.value = v; }
  setValueAtTime(v, t) { hlidej(v, t); }
  linearRampToValueAtTime(v, t) { hlidej(v, t); }
  exponentialRampToValueAtTime(v, t) {
    hlidej(v, t);
    if (!(v > 0)) spatnychHodnot += 1;
  }
  setTargetAtTime(v, t, k) { hlidej(v, t); if (!(k > 0)) spatnychHodnot += 1; }
  cancelScheduledValues(t) { hlidej(0, t); }
}
class FalesnyUzel {
  constructor(c, druh) {
    c.uzlu += 1;
    c.druhy[druh] = (c.druhy[druh] ?? 0) + 1;
    this.kontext = c;
    for (const p of ['gain', 'frequency', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[p] = new FalesnyParam(1);
  }
  connect(cil) {
    if (!(cil instanceof FalesnyUzel)) spatnychHodnot += 1;
    return cil;
  }
  disconnect() {}
  start(t = 0) {
    hlidej(0, t);
    this.kontext.zacatky.push(t - this.kontext.currentTime);
  }
  stop(t = 0) { hlidej(0, t); }
}
class FalesnyKontext {
  constructor() {
    Object.assign(this, { currentTime: 0, sampleRate: 8000, state: 'running', uzlu: 0, druhy: {}, zacatky: [] });
    this.destination = new FalesnyUzel(this, 'reproduktor');
    FalesnyKontext.posledni = this;
  }
  createGain() { return new FalesnyUzel(this, 'gain'); }
  createOscillator() { return new FalesnyUzel(this, 'oscilator'); }
  createBiquadFilter() { return new FalesnyUzel(this, 'filtr'); }
  createBufferSource() { return new FalesnyUzel(this, 'sum'); }
  createDynamicsCompressor() { return new FalesnyUzel(this, 'omezovac'); }
  createBuffer(kanalu, delka) { return { getChannelData: () => new Float32Array(delka) }; }
  resume() { return Promise.resolve(); }
}
globalThis.AudioContext = FalesnyKontext;
zvuk.odemkniZvuk();
const kontextZvuku = FalesnyKontext.posledni;
if (!kontextZvuku || !zvuk.statistikaZvuku().odemceno || !kontextZvuku.druhy.omezovac) chybyZvuku.push('zvuk se s AudioContext neodemkl nebo nemá omezovač');
const bezne = zvuk.ID_EFEKTU.filter((id) => !zvuk.POPIS_EFEKTU[id].dulezity);
const efektu = () => zvuk.statistikaZvuku().efektu;
let vysledekZvuku = {};
if (kontextZvuku) {
  // Stejný efekt 500× v jednom okamžiku zazní jednou.
  kontextZvuku.currentTime = 10;
  let pred = efektu();
  for (let i = 0; i < 500; i++) zvuk.zvukHry('zasah');
  if (efektu() - pred !== 1) chybyZvuku.push(`500 zásahů naráz zaznělo ${efektu() - pred}×`);
  // Tisíc běžných efektů během 2 s: v žádné sekundě jich nezazní víc než MAX_EFEKTU_ZA_SEKUNDU.
  const zaznelo = [];
  for (let i = 0; i < 2000; i++) {
    kontextZvuku.currentTime = 20 + i / 1000;
    if (zvuk.zvukHry(bezne[i % bezne.length])) zaznelo.push(kontextZvuku.currentTime);
  }
  const nejvicZaSekundu = Math.max(...zaznelo.map((t) => zaznelo.filter((u) => u <= t && u > t - 1).length));
  if (nejvicZaSekundu > zvuk.MAX_EFEKTU_ZA_SEKUNDU || zaznelo.length < zvuk.MAX_EFEKTU_ZA_SEKUNDU) chybyZvuku.push(`omezovač pustil ${nejvicZaSekundu} běžných efektů za sekundu (celkem ${zaznelo.length})`);
  // Při plném limitu projde důležitý efekt (boss) a mezera stejného efektu platí dál.
  if (!zvuk.zvukHry('boss') || zvuk.zvukHry('boss')) chybyZvuku.push('boss při plném limitu nezazněl, nebo zazněl dvakrát hned po sobě');
  // Ztlumeno (N) nebo efekty na 0 %: žádný nový uzel, hudba na 0 % taky ne.
  kontextZvuku.currentTime = 40;
  zvuk.nastavZvuk({ ztlumeno: true });
  let uzlu = kontextZvuku.uzlu;
  zvuk.zvukHry('boss');
  zvuk.zvukHry('zasah');
  zvuk.hudba('louka', { boss: true });
  zvuk.ukazkaHudby();
  if (kontextZvuku.uzlu !== uzlu) chybyZvuku.push(`ztlumený zvuk vytvořil ${kontextZvuku.uzlu - uzlu} uzlů`);
  zvuk.nastavZvuk({ ztlumeno: false, efekty: 0, hudba: 0 });
  kontextZvuku.currentTime = 42;
  uzlu = kontextZvuku.uzlu;
  zvuk.zvukHry('boss');
  for (let k = 0; k < 60; k++) {
    kontextZvuku.currentTime += 1 / 60;
    zvuk.hudba('jeskyne');
  }
  if (kontextZvuku.uzlu !== uzlu) chybyZvuku.push(`efekty a hudba na 0 % vytvořily ${kontextZvuku.uzlu - uzlu} uzlů`);
  zvuk.nastavZvuk({ ...zvuk.VYCHOZI_HLASITOST });
  // Hudba: každá mapa i s bossem hraje noty, plánuje jen kousek dopředu a po pauze (schovaný panel) nedohání.
  const hudbaMap = {};
  for (const id of PORADI_MAP) {
    for (const boss of [false, true]) {
      const notPred = zvuk.statistikaZvuku().not;
      kontextZvuku.zacatky = [];
      for (let k = 0; k < 600; k++) {
        kontextZvuku.currentTime += 1 / 60;
        zvuk.hudba(id, { boss });
      }
      const not = zvuk.statistikaZvuku().not - notPred;
      hudbaMap[`${id}${boss ? '_boss' : ''}`] = not;
      if (!(not > 0) || Math.max(...kontextZvuku.zacatky) > 2) chybyZvuku.push(`hudba ${id}${boss ? ' s bossem' : ''}: ${not} not za 10 s, nejdál dopředu ${Math.max(...kontextZvuku.zacatky).toFixed(2)} s`);
    }
    if (!(hudbaMap[`${id}_boss`] > hudbaMap[id])) chybyZvuku.push(`hudba s bossem na mapě ${id} není hustší (${hudbaMap[`${id}_boss`]} proti ${hudbaMap[id]} notám)`);
  }
  zvuk.hudba('louka');
  kontextZvuku.currentTime += 30;
  uzlu = kontextZvuku.uzlu;
  zvuk.hudba('louka');
  if (kontextZvuku.uzlu - uzlu > 40) chybyZvuku.push(`hudba po pauze dohání (${kontextZvuku.uzlu - uzlu} uzlů naráz)`);
  zvuk.hudba(null);

  // Zbraně na 60. úrovni s plnou loukou: zvuky ze hry snímek po snímku jako v main.js. Uzlů za sekundu musí
  // zůstat málo, běžných efektů nejvýš MAX_EFEKTU_ZA_SEKUNDU.
  const hlucna = novaHra(vytvorRng(seminko));
  hlucna.zbrane = Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, { uroven: 60, nabiti: 0 }]));
  Object.assign(hlucna, { cas: 600, dalsiBoss: 603, dalsiSmecka: 602, dalsiPrichod: 4 });
  const zacatek = kontextZvuku.currentTime;
  const uzlyPodleSekund = [];
  const efektyPodleSekund = [];
  let pocetUdalosti = 0;
  for (let t = 0; t < 20 && !hlucna.konec; t += DT) {
    hlucna.hrdina.nezranitelny = 1;
    aktualizuj(hlucna, DT, rozhodni(hlucna, t), SIRKA, VYSKA);
    obsluz(hlucna);
    kontextZvuku.currentTime = zacatek + t;
    const s = Math.floor(t);
    const uzluPred = kontextZvuku.uzlu;
    const efektuPred = efektu();
    for (const [id, z] of Object.entries(hlucna.zvuky)) {
      pocetUdalosti += z.pocet;
      zvuk.zvukHry(id, z.sila);
    }
    hlucna.zvuky = {};
    zvuk.hudba(hlucna.mapa, { boss: hlucna.nepratele.some((n) => n.boss) });
    uzlyPodleSekund[s] = (uzlyPodleSekund[s] ?? 0) + kontextZvuku.uzlu - uzluPred;
    efektyPodleSekund[s] = (efektyPodleSekund[s] ?? 0) + efektu() - efektuPred;
  }
  const nejvicUzlu = Math.max(...uzlyPodleSekund);
  if (nejvicUzlu > 400 || !(pocetUdalosti > 1000)) chybyZvuku.push(`zbraně na 60. úrovni: ${nejvicUzlu} uzlů za sekundu z ${pocetUdalosti} událostí`);
  if (spatnychHodnot) chybyZvuku.push(`zvuk dal AudioContextu ${spatnychHodnot}× špatné číslo`);
  vysledekZvuku = {
    max_efektu_za_sekundu: zvuk.MAX_EFEKTU_ZA_SEKUNDU, omezovac_nejvic_za_sekundu: nejvicZaSekundu, hudba_not_za_10_s: hudbaMap,
    zbrane_na_60: { udalosti_za_20_s: pocetUdalosti, nejvic_uzlu_za_sekundu: nejvicUzlu, nejvic_efektu_za_sekundu: Math.max(...efektyPodleSekund) },
    zahozeno: zvuk.statistikaZvuku().zahozeno,
  };
}
delete globalThis.AudioContext;
// Hra hlásí zvuky jen známými jmény, hlavní události v hlavní hře se ozvou a každá zbraň má svůj zvuk.
const zvukyVHrach = {};
for (const z of [hra.zvuky, silna.zvuky, ...Object.values(zvukySamych)]) {
  for (const [id, { pocet }] of Object.entries(z)) zvukyVHrach[id] = (zvukyVHrach[id] ?? 0) + pocet;
}
const neznameZvuky = Object.keys(zvukyVHrach).filter((id) => !zvuk.ID_EFEKTU.includes(id));
if (neznameZvuky.length) chybyZvuku.push(`hra hlásí neznámé zvuky: ${neznameZvuky.join(', ')}`);
const hlavniZvuky = ['zasah', 'smrt', 'krystal', 'hrozba', 'zraneni', ...(hra.bossu > 0 ? ['boss'] : []), ...(hra.konec ? ['smrtHrdiny'] : [])];
const chybiZvuky = hlavniZvuky.filter((id) => !hra.zvuky[id]);
if (chybiZvuky.length) chybyZvuku.push(`v hlavní hře se neozvalo: ${chybiZvuky.join(', ')}`);
const zvukZbrane = (id) => (id === 'prak' ? 'kamen' : id);
// Zbraň, kterou žádná z her nepoužila (nebo se k ní nikdo nedostal), zkusí krátkou hru sama.
for (const id of Object.keys(ZBRANE).filter((z) => !zvukyVHrach[zvukZbrane(z)])) {
  const h = novaHra(vytvorRng(seminko));
  h.zbrane = { [id]: { uroven: 60, nabiti: 0 } };
  Object.assign(h, { cas: 600, dalsiBoss: 900, dalsiSmecka: 602, dalsiPrichod: 4 });
  for (let t = 0; t < 15 && !h.zvuky[zvukZbrane(id)]; t += DT) {
    h.hrdina.nezranitelny = 1;
    aktualizuj(h, DT, { dx: 0, dy: 0 }, SIRKA, VYSKA);
    if (h.porovnani) rozhodniKus(h, false);
    if (h.volby) vyber(h, { druh: 'leceni', kroku: 1 });
    if (h.obchod) odejdiOdKupce(h);
  }
  zvukyVHrach[zvukZbrane(id)] = h.zvuky[zvukZbrane(id)]?.pocet ?? 0;
}
const ticheZbrane = Object.keys(ZBRANE).filter((id) => !zvukyVHrach[zvukZbrane(id)]);
if (ticheZbrane.length) chybyZvuku.push(`zbraně bez zvuku: ${ticheZbrane.join(', ')}`);
vysledek.zvuk = { ...vysledekZvuku, udalosti_v_hrach: zvukyVHrach };
console.log(JSON.stringify(vysledek, null, 2));

const chyby = [
  ...chybyTrid, ...chybyDusi, ...chybyRarit, ...new Set(chybyNepratel), ...chybyVybavy, ...chybyLucerny, ...new Set(chybyBeden),
  ...new Set(chybyBossu), ...chybyZbrani, ...new Set(chybyUrovni), ...new Set(chybyHrozby), ...new Set(chybyCisel),
  ...new Set(chybyVystroje), ...new Set(chybyZlata), ...new Set(chybyMap), ...new Set(chybyPasiv), ...chybyZvuku,
];
if (maxTrsu > MAX_TRNU) chyby.push(`trsů trnů naráz ${maxTrsu}`);
if (hra.trida !== VYCHOZI_TRIDA) chyby.push(`simulace nehraje za výchozí třídu (${hra.trida})`);
if (hra.zabito === 0) chyby.push('nikdo nezemřel, zbraně asi nestřílí');
if (hra.hrdina.uroven < 3) chyby.push('hrdina skoro nepostoupil, krystaly se asi nesbírají');
if (maxNepratel > 1500) chyby.push(`příliš mnoho nepřátel najednou (${maxNepratel})`);
if (hra.zabito > 0 && maxCastic === 0) chyby.push('po zabití nevyletěly žádné úlomky');
if (maxCastic > 400) chyby.push(`příliš mnoho úlomků najednou (${maxCastic})`);
if (tresu !== zasahu) chyby.push(`třes obrazovky jen u ${tresu} z ${zasahu} zásahů hrdiny`);
if (prvniPavouk !== null && prvniPavouk < OD_PAVOUKU) chyby.push(`pavouk přišel moc brzy (${prvniPavouk.toFixed(1)} s)`);
if (hra.cas > OD_PAVOUKU + 30 && prvniPavouk === null) chyby.push('po 4. minutě nepřišel žádný pavouk');
if (siti > 0 && krokuVSiti === 0) chyby.push('síť zásahem vznikla, ale hrdina nikdy nebyl zpomalen');

// Rekord: úložiště prohlížeče tu nahrazuje obyčejná mapa.
function nahradUloziste(uloziste) {
  Object.defineProperty(globalThis, 'localStorage', { value: uloziste, configurable: true, writable: true });
}
const mapa = new Map();
nahradUloziste({ getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => mapa.set(k, String(v)) });
const vysledekHry = { cas: Math.floor(hra.cas), uroven: hra.hrdina.uroven, zabito: hra.zabito, hrozba: hra.hrozba };
if (nactiRekord() !== null) chyby.push('prázdné úložiště má mít žádný rekord');
if (!zapisVysledek(vysledekHry).novy) chyby.push('první hra nebyla rekord');
if (nactiRekord()?.cas !== vysledekHry.cas || nactiRekord()?.hrozba !== hra.hrozba) chyby.push('rekord se neuložil i s hrozbou');
if (zapisVysledek({ ...vysledekHry, cas: vysledekHry.cas - 1 }).novy) chyby.push('kratší hra přepsala rekord');
if (!zapisVysledek({ ...vysledekHry, cas: vysledekHry.cas + 1 }).novy) chyby.push('delší hra nebyla nový rekord');
mapa.set('hlubiny.rekord', '{rozbité');
if (nactiRekord() !== null) chyby.push('rozbitý rekord se nenačetl jako žádný');
// Zvolená třída: bez záznamu výchozí, uložená se načte, rozbitá nebo cizí je zase výchozí.
if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push('bez uložené třídy má být výchozí');
ulozTridu('havir');
if (nactiTridu() !== 'havir') chyby.push('zvolená třída se neuložila');
for (const spatna of ['{rozbité', '"toString"', '"drak"', '42']) {
  mapa.set('hlubiny.trida', spatna);
  if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push(`špatná třída ${spatna} se nenačetla jako výchozí`);
}
// Duše v úložišti: prázdné = 0 a nic koupeno, připsání a nákup se uloží, rozbitý záznam nic nedá.
if (JSON.stringify(nactiDuse()) !== '{"duse":0,"vylepseni":{}}') chyby.push('prázdné úložiště má mít 0 duší');
pripisDuse(40);
if (pripisDuse(15).duse !== 55 || nactiDuse().duse !== 55) chyby.push('duše se nepřipsaly');
if (pripisDuse(-5).duse !== 55 || pripisDuse(NaN).duse !== 55) chyby.push('záporné nebo NaN duše něco změnily');
ulozDuse(kupVylepseni(nactiDuse(), 'sila'));
if (nactiDuse().vylepseni.sila !== 1 || nactiDuse().duse !== 55 - cenaVylepseni('sila', 0)) chyby.push('nákup se neuložil');
ulozDuse(vratDuse(nactiDuse()));
if (nactiDuse().duse !== 55 || Object.keys(nactiDuse().vylepseni).length) chyby.push('vrácení se neuložilo');
for (const spatne of ['{rozbité', '42', '"duse"', '{"duse":"hodně","vylepseni":{"sila":99,"drak":3,"toString":1}}', '{"duse":-7,"vylepseni":[1,2]}']) {
  mapa.set('hlubiny.duse', spatne);
  const st = nactiDuse();
  const id = Object.keys(st.vylepseni);
  if (!Number.isInteger(st.duse) || st.duse < 0 || id.some((k) => !Object.hasOwn(VYLEPSENI, k) || st.vylepseni[k] > VYLEPSENI[k].max)) {
    chyby.push(`rozbité duše ${spatne} se načetly jako ${JSON.stringify(st)}`);
  }
}
// Nastavení: bez záznamu čísla poškození zapnutá, vypnutí se uloží, rozbitý záznam = výchozí.
if (nactiNastaveni().cislaPoskozeni !== true) chyby.push('bez uloženého nastavení mají být čísla poškození zapnutá');
ulozNastaveni({ cislaPoskozeni: false });
if (nactiNastaveni().cislaPoskozeni !== false) chyby.push('vypnutá čísla poškození se neuložila');
for (const spatne of ['{rozbité', '42', '"ne"', '{"cislaPoskozeni":"ne"}', 'null']) {
  mapa.set('hlubiny.nastaveni', spatne);
  if (nactiNastaveni().cislaPoskozeni !== true) chyby.push(`rozbité nastavení ${spatne} nevrátilo výchozí`);
}
// Hlasitost: bez záznamu 60 % efekty a 40 % hudba, neztlumeno. Uložená se načte, procenta se zaokrouhlí do 0–100,
// špatný druh hodnoty je výchozí a staré nastavení (jen čísla poškození) dostane výchozí hlasitosti.
const hlasitostZ = (n) => JSON.stringify([n.efekty, n.hudba, n.ztlumeno]);
mapa.delete('hlubiny.nastaveni');
if (hlasitostZ(nactiNastaveni()) !== '[60,40,false]') chyby.push(`výchozí hlasitost je ${hlasitostZ(nactiNastaveni())}`);
ulozNastaveni({ ...nactiNastaveni(), efekty: 35, hudba: 0, ztlumeno: true });
if (hlasitostZ(nactiNastaveni()) !== '[35,0,true]' || nactiNastaveni().cislaPoskozeni !== true) chyby.push(`hlasitost se neuložila: ${mapa.get('hlubiny.nastaveni')}`);
for (const [zaznam, cekam] of [
  ['{"efekty":"hodně","hudba":-20,"ztlumeno":"ano"}', '[60,0,false]'], ['{"efekty":250.6,"hudba":33.4}', '[100,33,false]'],
  ['{"cislaPoskozeni":false}', '[60,40,false]'], ['{"efekty":null,"hudba":[50],"ztlumeno":1}', '[60,40,false]'],
]) {
  mapa.set('hlubiny.nastaveni', zaznam);
  if (hlasitostZ(nactiNastaveni()) !== cekam) chyby.push(`nastavení ${zaznam} dalo hlasitost ${hlasitostZ(nactiNastaveni())}, čekal jsem ${cekam}`);
}
// Sbírka výbavy: prázdná = nic, nález se zapíše s raritou, horší rarita lepší nepřepíše, rozbitý záznam dá jen
// známé kusy se známou raritou.
if (Object.keys(nactiSbirku()).length) chyby.push('prázdná sbírka není prázdná');
zapisNalez(vytvorKus('obr', 'prsten', 'vzacna'));
zapisNalez(vytvorKus('obr', 'prsten', 'bezna'));
if (nactiSbirku().obr_prsten !== 'vzacna') chyby.push('horší rarita přepsala ve sbírce lepší');
zapisNalez(vytvorKus('obr', 'prsten', 'legendarni'));
zapisNalez(vytvorKus('matka', 'telo'));
if (JSON.stringify(nactiSbirku()) !== '{"matka_telo":"bezna","obr_prsten":"legendarni"}') chyby.push(`sbírka se neuložila: ${JSON.stringify(nactiSbirku())}`);
for (const spatne of ['{rozbité', '42', '[1,2]', 'null', '{"obr_prsten":"zlatá","drak_hlava":"bezna","matka_telo":"epicka","toString":"bezna"}']) {
  mapa.set('hlubiny.sbirka', spatne);
  const sb = nactiSbirku();
  if (Object.keys(sb).some((id) => !kusyPodleId.has(id) || !Object.hasOwn(RARITY_VYBAVY, sb[id]))) chyby.push(`rozbitá sbírka ${spatne} se načetla jako ${JSON.stringify(sb)}`);
}
if (JSON.stringify(nactiSbirku()) !== '{"matka_telo":"epicka"}') chyby.push(`ze smíšené sbírky zůstalo ${JSON.stringify(nactiSbirku())}`);
if (JSON.stringify(platnaSbirka({ strazce_hlava: 'bezna', strazce_hlava2: 'bezna' })) !== '{"strazce_hlava":"bezna"}') chyby.push('platnaSbirka pustila neznámý kus');
// Mapy v úložišti: každá mapa má svůj rekord (Louka starý klíč), další mapa se odemkne 5 minutami na předchozí
// nebo zápisem, zvolená mapa se pamatuje, jen když je odemčená.
mapa.clear();
if (JSON.stringify(odemceneMapy()) !== JSON.stringify([VYCHOZI_MAPA]) || nactiMapu() !== VYCHOZI_MAPA) chyby.push('bez záznamu má být odemčená jen Louka');
zapisVysledek({ cas: 120 }, 'jeskyne');
if (nactiRekord('jeskyne')?.cas !== 120 || nactiRekord() !== null || !mapa.has('hlubiny.rekord.jeskyne')) chyby.push('rekord jeskyně se uložil jinam');
if (!zapisVysledek({ cas: 90 }).novy || zapisVysledek({ cas: 100 }, 'jeskyne').novy || nactiRekord('jeskyne').cas !== 120) chyby.push('rekordy map se pletou');
zapisVysledek({ cas: ODEMKNUTI_MAPY - 1 });
ulozMapu('jeskyne');
if (odemceneMapy().includes('jeskyne') || nactiMapu() !== VYCHOZI_MAPA) chyby.push(`jeskyně se odemkla před ${ODEMKNUTI_MAPY} s`);
zapisVysledek({ cas: ODEMKNUTI_MAPY });
if (JSON.stringify(odemceneMapy()) !== '["louka","jeskyne"]' || nactiMapu() !== 'jeskyne') chyby.push('rekord 5 minut na Louce neodemkl jeskyni');
odemkniMapu('jezero');
odemkniMapu('jezero');
odemkniMapu('drak');
if (mapa.get('hlubiny.mapy') !== '["jezero"]' || !odemceneMapy().includes('jezero')) chyby.push(`odemknutí jezera se neuložilo (${mapa.get('hlubiny.mapy')})`);
for (const spatne of ['{rozbité', '42', '"jezero"', '{"0":"jezero"}', 'null']) {
  mapa.set('hlubiny.mapy', spatne);
  if (odemceneMapy().includes('jezero')) chyby.push(`rozbité odemknutí ${spatne} odemklo jezero`);
}
for (const spatne of ['{rozbité', '42', '"drak"', '"toString"', 'null']) {
  mapa.set('hlubiny.mapa', spatne);
  if (nactiMapu() !== VYCHOZI_MAPA) chyby.push(`rozbitá mapa ${spatne} se nenačetla jako Louka`);
}
if (platnaMapa('toString') !== VYCHOZI_MAPA || platnaMapa('jezero') !== 'jezero') chyby.push('platnaMapa pouští neznámé mapy');
nahradUloziste({ getItem() { throw new Error('zakázáno'); }, setItem() { throw new Error('zakázáno'); } });
ulozMapu('jezero');
odemkniMapu('jezero');
if (nactiMapu() !== VYCHOZI_MAPA || JSON.stringify(odemceneMapy()) !== JSON.stringify([VYCHOZI_MAPA]) || nactiRekord('jezero') !== null) chyby.push('zakázané úložiště u map nefunguje jako prázdné');
if (Object.keys(nactiSbirku()).length || Object.keys(zapisNalez(vytvorKus('obr', 'hlava'))).length !== 1) chyby.push('zakázané úložiště u sbírky nefunguje jako prázdné');
ulozNastaveni({ cislaPoskozeni: false });
if (nactiNastaveni().cislaPoskozeni !== true) chyby.push('zakázané úložiště nevrátilo výchozí nastavení');
if (nactiDuse().duse !== 0 || pripisDuse(10).duse !== 10) chyby.push('zakázané úložiště u duší nefunguje jako prázdné');
ulozDuse({ duse: 5, vylepseni: { sila: 1 } });
if (nactiRekord() !== null || !zapisVysledek(vysledekHry).novy) chyby.push('zakázané úložiště se nechová jako prázdné');
ulozTridu('lovec');
if (nactiTridu() !== VYCHOZI_TRIDA) chyby.push('zakázané úložiště nevrátilo výchozí třídu');
if (chyby.length) {
  console.error('CHYBA:', chyby.join('; '));
  process.exit(1);
}
