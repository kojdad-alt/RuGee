// Pravidla hry: pohyb, zbraně, nepřátelé, krystaly zkušeností a vylepšení.
import { pouzijVylepseni, navicHre, soucetEfektu, utraceno, CENA_STROMU } from './duse.js';
import { t, pripojTexty } from './texty.js';
import {
  PORADI_SLOTU, ucinekVystroje, losujKus, zlatakyZaKus, RARITY_VYBAVY, EFEKTY_VYBAVY, VYBAVA, PORADI_SAD, idKusu,
} from './vystroj.js';
import {
  PETY, platnyPet, pouzijPeta, silaPetu, intervalPetu, poskozeniPetu, mrazPetu, losZCisel, SANCE_VEJCE,
} from './pety.js';
import {
  MAPY, PORADI_MAP, VYCHOZI_MAPA, PRICHODY_MAP, platnaMapa, naPlose, odKdy, vytlacZPrekazek,
} from './mapy.js';

// ikona = jméno spritu, který se ukáže na kartě vylepšení. Jméno (nazev), popis (řádek za každou z úrovní 1–5)
// a texty (řádek na kartě nad 5. úrovní) jsou ve slovníku src/texty/cs.js (větev zbrane), pripojTexty je připojí.
// dal = jak zbraň roste nad 5. úrovní (bonusZaUroven): poradi = co přidá každá třetí úroveň (dokola) a která
// čísla ze statyZbrane to jsou. poskozeni a velikost se násobí, pocet je jedno číslo (+1 kus), nabiti se
// násobí (kratší nabíjení). maxPocet = nižší strop kusů než STROPY.pocet.
// Krumpáče a zrcadla se netočí rychleji: při velké rychlosti by mezi dvěma snímky přeskočily nepřítele.
// pasivy = co ze zbraně čtou pasivy hrdiny (pasivyDoZbrane): rozpeti = čísla, která Rozpětí násobí (velikost
// a dosah), vydrz = trvání, která Výdrž násobí, vydrzNavic = co Výdrž přičte za každý svůj díl nad 1 (u zbraní,
// které samy nic dlouho nedrží: dosvit lucerny, otřes po okamžitém zásahu), prival = číslo, kam Příval přidá
// kusy. Rychlé ruce zkrátí nabíjení přes hrdina.nabijeni (CISLA_ZBRANI), Kritický zásah platí v zasah() a Ozvěna
// přímo v kódu každé zbraně: u výstřelu (ozvi: jiskra, lucerna, blesk, trny, semínka, kořeny, prak), u zásahu
// (ozvenaZasahu: krumpáče, zrcadla, cep, stopa, uhlíky) nebo po svém (světluška zaútočí znovu, zvon přidá vlnu,
// ledová zóna se roztříští dvakrát).
export const ZBRANE = {
  jiskra: {
    ikona: 'jiskra',
    dal: { poradi: ['pocet', 'nabiti'], poskozeni: ['poskozeni'], pocet: 'pocet', nabiti: ['nabiti'] },
    pasivy: { rozpeti: ['velikost'], vydrz: ['zivot'], prival: 'pocet' },
  },
  lucerna: {
    ikona: 'lucerna',
    dal: { poradi: ['velikost', 'nabiti'], poskozeni: ['zar'], nabiti: ['tik'], velikost: ['dosah'] },
    pasivy: { rozpeti: ['dosah'], vydrzNavic: { dosvit: 1 }, prival: 'uhliky' },
  },
  krumpace: {
    ikona: 'krumpac',
    dal: { poradi: ['pocet', 'velikost'], poskozeni: ['poskozeni'], pocet: 'pocet', velikost: ['polomer'] },
    pasivy: { rozpeti: ['polomer', 'velikost'], vydrzNavic: { otres: 0.8 }, prival: 'pocet' },
  },
  blesk: {
    ikona: 'blesk',
    dal: {
      poradi: ['pocet', 'nabiti', 'velikost'], poskozeni: ['poskozeni'], pocet: 'preskoky', nabiti: ['nabiti'], velikost: ['skok'],
    },
    pasivy: { rozpeti: ['skok', 'dosah'], vydrzNavic: { otres: 1 }, prival: 'blesku' },
  },
  trny: {
    ikona: 'trny',
    // Bez kratšího nabíjení: víc trsů naráz, než unese MAX_TRNU, by staré trsy mazalo dřív, než zalezou.
    dal: {
      poradi: ['pocet', 'velikost'], poskozeni: ['poskozeni'], pocet: 'pocet', velikost: ['polomer'], maxPocet: 8,
    },
    pasivy: { rozpeti: ['polomer', 'dosah'], vydrz: ['trvani', 'doznivani'], prival: 'pocet' },
  },
  zrcadlo: {
    ikona: 'zrcadlo',
    dal: {
      poradi: ['pocet', 'velikost'], poskozeni: ['poskozeni', 'odraz'], pocet: 'pocet', velikost: ['velikost'], maxPocet: 8,
    },
    pasivy: { rozpeti: ['velikost', 'polomer'], vydrz: ['let'], prival: 'pocet' },
  },
  svetlusky: {
    ikona: 'svetlusky',
    dal: {
      poradi: ['pocet', 'nabiti', 'velikost'], poskozeni: ['poskozeni'], pocet: 'pocet', nabiti: ['nabiti'], velikost: ['dosah'],
    },
    pasivy: { rozpeti: ['dosah'], vydrzNavic: { otres: 0.8 }, prival: 'pocet' },
  },
  mraz: {
    ikona: 'mraz',
    // Kusů jen 8 jako u trnů: víc zón naráz by MAX_ZON nepustilo (nové krystaly by čekaly).
    dal: {
      poradi: ['pocet', 'velikost', 'nabiti'], poskozeni: ['poskozeni'], pocet: 'pocet', velikost: ['polomer'], nabiti: ['nabiti'], maxPocet: 8,
    },
    pasivy: { rozpeti: ['polomer', 'dosah'], vydrz: ['trvani', 'doznivani'], prival: 'pocet' },
  },
  zvon: {
    ikona: 'zvon',
    // Ozvěn nejvýš 4: další by doznívaly ještě v příštím zvonění.
    dal: {
      poradi: ['velikost', 'nabiti', 'pocet'], poskozeni: ['poskozeni'], pocet: 'pocet', nabiti: ['nabiti'], velikost: ['polomer'], maxPocet: 4,
    },
    pasivy: { rozpeti: ['polomer'], vydrz: ['omraceni', 'let'], prival: 'pocet' },
  },
  cep: {
    ikona: 'cep',
    // Rozmach se nezrychluje (koule by mezi snímky přeskočila nepřítele), roste řetěz i koule. Koulí nejvýš 4,
    // každá další má delší řetěz.
    dal: {
      poradi: ['velikost', 'pocet'], poskozeni: ['poskozeni'], pocet: 'pocet', velikost: ['retez', 'velikost'], maxPocet: 4,
    },
    pasivy: { rozpeti: ['retez', 'velikost'], vydrz: ['let'], prival: 'pocet' },
  },
  seminka: {
    ikona: 'seminka',
    // Bez kratšího nabíjení a nejvýš 6 semínek naráz: víc by MAX_SEMINEK nepustilo (staré keře by mizely dřív).
    dal: {
      poradi: ['pocet', 'velikost'], poskozeni: ['poskozeni', 'pichnuti'], pocet: 'pocet', velikost: ['polomer'], maxPocet: 6,
    },
    pasivy: { rozpeti: ['polomer'], vydrz: ['trvani'], prival: 'pocet' },
  },
  korene: {
    ikona: 'korene',
    // Kořenů nejvýš 8 jako trsů trnů: víc by drželo skoro celou louku.
    dal: {
      poradi: ['pocet', 'velikost', 'nabiti'], poskozeni: ['poskozeni', 'svirani'], pocet: 'pocet', velikost: ['polomer'], nabiti: ['nabiti'], maxPocet: 8,
    },
    pasivy: { rozpeti: ['polomer', 'dosah'], vydrz: ['trvani'], prival: 'pocet' },
  },
  stopa: {
    ikona: 'stopa',
    // Bez kusů: stopa je jedna. Širší plamen má i větší rozestup, takže plamenů naráz nepřibude.
    dal: { poradi: ['velikost', 'nabiti'], poskozeni: ['poskozeni', 'pali'], nabiti: ['tik'], velikost: ['polomer'] },
    pasivy: { rozpeti: ['polomer'], vydrz: ['trvani', 'hori'], prival: 'stop' },
  },
  prak: {
    ikona: 'prak',
    dal: {
      poradi: ['pocet', 'nabiti', 'velikost'], poskozeni: ['poskozeni'], pocet: 'odrazy', nabiti: ['nabiti'], velikost: ['skok'],
    },
    pasivy: { rozpeti: ['skok', 'dosah'], vydrz: ['zivot', 'volny'], prival: 'pocet' },
  },
};
pripojTexty(ZBRANE, 'zbrane');

// Pasivy: na úrovních 1–5 dá každá úroveň plný díl (násobí vlastnost hrdiny o nasobek, pricti přičte),
// od 6. jen menší díl dal (přičítá se k násobku z 5. úrovně) a popisDal na kartě. Kde je strop (STROPY.pasivy),
// tam se pasiva po jeho dosažení promění v +3 % poškození všech zbraní za úroveň (SILA_ZA_PREBYTEK). Záporný
// nasobek vlastnost zmenšuje (Rychlé ruce zkracují nabíjení) a strop je pak spodní mez.
// vaha = jak často se pasiva nabízí proti ostatním kartám (bez ní 1). procenta = přičtené číslo je podíl (šance),
// přehled v pauze ho ukáže v procentech (cisloPasivy).
// Pasivy pro všechny zbraně (co z které zbraně čtou, je u zbraně v ZBRANE.pasivy):
//   Kritický zásah – šance, že rána bolí dvakrát (zlaté číslo s vykřičníkem), hrdina.krit.
//   Rozpětí – větší oblasti, kruhy, zrcadla, kořeny i dosah zbraní, hrdina.rozpeti.
//   Ozvěna – šance, že zbraň po výstřelu za chvilku vystřelí ještě jednou (zbraně, které jen krouží nebo
//            hoří, zasáhnou podruhé), hrdina.ozvena.
//   Výdrž – oblasti a efekty (trny, keře, mráz, omráčení, držení, odhození, plameny) trvají déle, okamžité
//           zásahy nepřítele chvíli brzdí (otřes), hrdina.vydrz.
//   Rychlé ruce – kratší nabíjení všech zbraní (hrdina.nabijeni, stejné číslo jako u Bouřliváka a výbavy).
//   Příval – +1 kus všem zbraním (střela, krumpáč, kořen, keř, … lucerně uhlík a stopě další řada plamenů),
//            nejvýš 3 a nabízí se zřídka.
// Pasivy pro přežití:
//   Zbroj – každá úroveň ubere 1 z každé rány od nepřátel (dotyk, schopnosti bossů, jedový oblak po houbákovi),
//           aspoň 1 projde vždy. Láva a bahenní oblaky jsou mapa, ne nepřítel, ty bolí celé. hrdina.pancir.
//           Strop nemá: rány s hrozbou rostou čím dál rychleji, takže ji pozdě ve hře stejně přerostou.
//   Regenerace – životy samy přibývají (hrdina.regenerace za sekundu), nejvýš STROPY.pasivy.regenerace, ať se
//                nedá přežít donekonečna jen stáním.
//   Štěstí – větší šance, že nepřítel pustí srdce nebo magnet (hrdina.stestiKoristi násobí šanci spolu se
//            Štěstím z trvalých vylepšení, karty ani výbavu nemění), nejvýš STROPY.pasivy.stesti.
// Pasivy II:
//   Upíří zub – šance (hrdina.upiri), že zabití nepřítele vrátí ZIVOT_ZA_SANI. Od padlého doletí ke hrdinovi kapka
//               krve a nad ním je růžové +N. Nejvýš SANI_ZA_SEKUNDU za sekundu, ať v hustých vlnách nejde jen stát.
//   Trnová zbroj – kdo hrdinu zraní dotykem nebo schopností (boss i ranou z dálky), dostane zpátky podíl rány
//                  hrdina.trnovaZbroj (0,5 = půlka), počítaný z rány před Zbrojí, se Sílou a kritickým zásahem.
//                  Jedový oblak útočníka nemá. Strop nemá: hrdinu zraní nejvýš dvakrát za sekundu.
//   Štít – bublina kolem hrdiny zastaví celou jednu ránu od nepřátel (láva a bahno projdou, Trnová zbroj vrací
//          dál), pak se dobíjí hrdina.dobitiStitu sekund. První úroveň ho zapne na DOBITI_STITU, další zkracují.
//   Moudrost – víc zkušeností z krystalů (hrdina.zkusenosti, stejné číslo jako trvalé vylepšení Zkušenosti).
//   Chamtivost – víc duší na konci hry (hrdina.chamtivost násobí duše za hru, dusZaHru v duse.js).
// popisPrvni = řádek karty pro 1. úroveň, když nová pasiva dělá něco jiného, než co přidávají další úrovně.
// Texty pasiv (nazev, popis, popisDal, popisPrvni) jsou ve slovníku (větev pasivy), stejně jako jména a popisy
// rarit, tříd, schopností, bossů a zboží níž.
export const DOBITI_STITU = 20;
export const MIN_DOBITI_STITU = 8;
const UBYTEK_STITU = 1;
export const PASIVY = {
  srdce: {
    ikona: 'srdce', vlastnost: 'maxHp', pricti: 20, dal: 10,
  },
  boty: {
    ikona: 'boty', vlastnost: 'rychlost', nasobek: 0.12, dal: 0.03,
  },
  magnet: {
    ikona: 'magnet', vlastnost: 'magnet', nasobek: 0.4, dal: 0.1,
  },
  sila: {
    ikona: 'sila', vlastnost: 'sila', nasobek: 0.15, dal: 0.05,
  },
  krit: {
    ikona: 'krit', vlastnost: 'krit', pricti: 0.05, dal: 0.02, procenta: true,
  },
  rozpeti: {
    ikona: 'rozpeti', vlastnost: 'rozpeti', nasobek: 0.08, dal: 0.02,
  },
  ozvena: {
    ikona: 'ozvena', vlastnost: 'ozvena', pricti: 0.06, dal: 0.02, procenta: true,
  },
  vydrz: {
    ikona: 'vydrz', vlastnost: 'vydrz', nasobek: 0.1, dal: 0.03,
  },
  rychleRuce: {
    ikona: 'rychleRuce', vlastnost: 'nabijeni', nasobek: -0.06, dal: -0.015,
  },
  prival: {
    ikona: 'prival', vlastnost: 'prival', pricti: 1, dal: 1, vaha: 0.35,
  },
  zbroj: {
    ikona: 'zbroj', vlastnost: 'pancir', pricti: 1, dal: 1,
  },
  regenerace: {
    ikona: 'regenerace', vlastnost: 'regenerace', pricti: 0.4, dal: 0.4,
  },
  stesti: {
    ikona: 'stesti', vlastnost: 'stestiKoristi', pricti: 0.2, dal: 0.2, procenta: true,
  },
  upiriZub: {
    ikona: 'upiriZub', vlastnost: 'upiri', pricti: 0.04, dal: 0.01, procenta: true,
  },
  trnovaZbroj: {
    ikona: 'trnovaZbroj', vlastnost: 'trnovaZbroj', pricti: 0.5, dal: 0.15, procenta: true,
  },
  stit: {
    ikona: 'stit', vlastnost: 'dobitiStitu', pricti: -UBYTEK_STITU, dal: -0.25,
  },
  moudrost: {
    ikona: 'moudrost', vlastnost: 'zkusenosti', nasobek: 0.05, dal: 0.02,
  },
  chamtivost: {
    ikona: 'chamtivost', vlastnost: 'chamtivost', nasobek: 0.1, dal: 0.03,
  },
};
pripojTexty(PASIVY, 'pasivy', {
  'stit.popisPrvni': { s: DOBITI_STITU }, 'stit.popis': { s: UBYTEK_STITU },
});

// Úrovně nemají strop. Úrovně 1–5 popisuje každá zbraň a pasiva sama (popis), od 6. dál dá každá úroveň menší
// díl: zbraň +8 % poškození (proti 5. úrovni, sčítá se) a každá třetí (8, 11, 14, …) navíc jednu věc z dal.poradi
// o kus, o 10 % kratší nabíjení (násobí se) nebo o 15 % větší dosah či velikost (sčítá se). Evoluce zbraní
// půjdou od ZAKLAD_UROVNI dál.
export const ZAKLAD_UROVNI = 5;
export const RUST_UROVNI = { poskozeni: 0.08, kazda: 3, nabiti: 0.9, velikost: 0.15 };
// Stropy jen tam, kde by se hra rozbila (všechno proti 5. úrovni zbraně). Když je zbraň na stropu všude, roste
// už jen poškození. pasivy = nejvyšší násobek vlastnosti od pasivy celkem: rychlejšímu hrdinovi by všechno
// uteklo a osminásobný magnet už sahá přes celou obrazovku.
// Nové pasivy mají strop všechny: dvojnásobná rána nebo ozvěna u každé druhé rány, oblasti přes celou obrazovku
// a efekty, které nikdy nepovolí, by hru rozbily. Rychlé ruce nejvýš o 40 % (krumpáče a zrcadla se točí s nimi).
// Regenerace nejvýš 4 životy za sekundu (10 úrovní) a Štěstí nejvýš +200 % (10 úrovní): víc srdcí by doléčilo
// každou ránu (u pricti je strop to, co pasiva přidá celkem). Zbroj strop nemá, zastaví ji rána aspoň 1.
// Upíří zub nejvýš 30 % (15. úroveň), Štít se dobije nejrychleji za MIN_DOBITI_STITU (37. úroveň, u záporného
// pricti je strop spodní mez), Moudrost nejvýš 1,6× zkušeností a Chamtivost nejvýš 2× duší. Trnová zbroj
// strop nemá: vrací jen rány, které hrdina opravdu schytal. Štít a Moudrost jsou slabší, než by se chtělo,
// schválně: pozdě ve hře je každá zastavená rána život navíc a víc zkušeností víc úrovní všeho (s dobitím
// po 2 s a 2,5× zkušenostmi přežil plně vylepšený bot v simulaci přes 33 minut).
export const STROPY = {
  pocet: 12,
  nabiti: 0.25,
  velikost: 2.5,
  pasivy: {
    boty: 2, magnet: 8, krit: 0.5, rozpeti: 1.6, ozvena: 0.5, vydrz: 2, rychleRuce: 0.6, prival: 3, regenerace: 4, stesti: 2,
    upiriZub: 0.3, stit: MIN_DOBITI_STITU - DOBITI_STITU - UBYTEK_STITU, moudrost: 1.6, chamtivost: 2,
  },
};
// Od těchto úrovní mění barvu rámeček v přehledu výbavy a čtverečky na kartě (stupenUrovne).
export const STUPNE_UROVNI = [5, 10, 15];

// Rarita karty při nové úrovni: kolik úrovní karta přidá a jaký bonus dá navíc.
// vaha = jak často padá na začátku hry; vzácnějších rarit časem přibývá (v 15. minutě 2×) a Štěstí je násobí dál.
// Úrovně nemají strop, takže karta přidá vždy celý počet úrovní své rarity.
// Váhy a bonusy jsou nízko schválně: s dvojnásobnými rozjel bot v simulaci sněhovou kouli a přežil přes 20 minut.
export const RARITY = {
  bezna: { urovni: 1, sila: 0, doleceni: false, vaha: 100 },
  vzacna: { urovni: 2, sila: 0, doleceni: false, vaha: 12 },
  epicka: { urovni: 2, sila: 0.05, doleceni: false, vaha: 3.5 },
  legendarni: { urovni: 3, sila: 0.1, doleceni: true, vaha: 1 },
};
pripojTexty(RARITY, 'rarity');
export const PORADI_RARIT = Object.keys(RARITY);
// Úroveň pasivy, která už je na stropu, dá místo toho +3 % poškození všech zbraní.
export const SILA_ZA_PREBYTEK = 0.03;
export const CAS_PLNYCH_RARIT = 900;
export const LECENI_ODPOCINKU = 30;

// Třídy hrdiny: každá začíná s jinou zbraní a má jednu výhodu. Výhoda násobí vlastnost hrdiny
// (nabijeni < 1 = zbraně se nabíjí rychleji). Sprite má stejné jméno jako třída.
export const TRIDY = {
  lovec: { zbran: 'jiskra', nasobky: { rychlost: 1.15 } },
  havir: { zbran: 'krumpace', nasobky: { maxHp: 1.3 } },
  svetlonos: { zbran: 'lucerna', nasobky: { magnet: 1.5 } },
  bourlivak: { zbran: 'blesk', nasobky: { nabijeni: 0.8 } },
};
pripojTexty(TRIDY, 'tridy');
export const VYCHOZI_TRIDA = 'lovec';

export function platnaTrida(id) {
  return typeof id === 'string' && Object.hasOwn(TRIDY, id) ? id : VYCHOZI_TRIDA;
}

// Hrozba: hra nemá konec, nepřátelé s časem plynule sílí. min = minuty hry i se zlomky, nahoře se ukazuje
// Hrozba N = 1 + celé minuty (každou minutu +1 a krátké ohlášení). Celý vzorec je v téhle tabulce (silaHrozby):
//   životy     × (1 + zivoty · min) · narustZivotu ^ (min − narustOd) · narustPozde ^ (min − pozdeOd)   (exponenty jen nad svým od)
//   bossové    × (1 + bossZivoty · min + bossNavic · (min − castejiOd)) · stejný nárůst   (bossNavic až od castejiOd)
//   poškození  × (1 + poskozeni · min) · narustPoskozeni ^ (min − narustOd) · narustPozde ^ (min − pozdeOd)   (dotyk, útoky bossů i jedový oblak)
//   rychlost   × (1 + rychlost · min) · narustRychlosti ^ (min − narustOd), nanejvýš maxRychlost
//   vlna každých max(nejkratsiVlna, prvniVlna − zkraceniVlny · min) s, v ní 1 + celé(davka · min) nepřátel, nanejvýš maxDavka
//   na louce nejvýš maxNepratel + navicNepratel · min, nanejvýš stropNepratel
//   elita: od elitaOd šance elitaSance na každého z vlny, od castejiOd navíc + elitaRust · (min − castejiOd), nanejvýš elitaMax
// Exponenty od narustOd jsou pojistka, že nikdo nevydrží donekonečna: zbraně bez stropu úrovní by jinak lineární
// růst přerostly, rychlý hrdina by nepřátelům utíkal napořád a srdce ze zabitých by doléčila každou ránu.
// Od pozdeOd se životy i poškození (i bossů) násobí ještě narustPozde za minutu: zlaťáky (vylepšení od kupce,
// zamčené truhly), pasivy pro zbraně (krit, ozvěna, rychlé ruce, příval …) a Pasivy II (hlavně Štít a Moudrost)
// by jinak plně vylepšeného hrdinu držely nad vodou mnohem déle.
// Těžší hra (zadání 5. 11. 2026: „mobové jsou fakt slabí, postupně je zrychlovat, přidávat jim životy, sílu“):
// dřív nárůst začínal až v 8. minutě a pozdní v 18., bot bez vylepšení na Louce vydržel 15+ min a se všemi
// vylepšeními 28. Teď roste všechno (životy ×1,25, poškození ×1,1, rychlost +2 % a ×1,03 za minutu) už od 3.
// minuty a pozdní nárůst ×1,3 od 10., takže každá minuta je aspoň o 15 % těžší než předchozí (test to hlídá).
// Louka se plní pomaleji (maxNepratel 120 + 25 za minutu místo 350 + 5): slabý hrdina nepadne na zaplněné louce
// ve 3. minutě, ale na síle nepřátel. Cíl (medián Louky přes postavy, docs/BALANC.md, sekce Stání a vylepšení):
// hrající bot bez vylepšení 5–7 min, se všemi vylepšeními 12–16 min, stojící se všemi do 5 min. Stání trestá
// obklíčení (OBKLICENI), silného hrdinu přizpůsobení hrozby (PRIZPUSOBENI).
export const HROZBA = {
  zivoty: 0.1, narustOd: 3, narustZivotu: 1.25, bossZivoty: 0.2, bossNavic: 0.3, pozdeOd: 10, narustPozde: 1.3,
  poskozeni: 0.05, narustPoskozeni: 1.1,
  rychlost: 0.02, narustRychlosti: 1.03, maxRychlost: 3,
  prvniVlna: 1.2, zkraceniVlny: 1 / 3, nejkratsiVlna: 0.25, davka: 1, maxDavka: 40,
  maxNepratel: 120, navicNepratel: 25, stropNepratel: 450,
  elitaOd: 5, castejiOd: 10, elitaSance: 0.01, elitaRust: 0.01, elitaMax: 0.15,
};
// Elita je obyčejný nepřítel z vlny, jen o třetinu větší (kreslí se 4 px na pixel místo 3), s rudým obrysem
// a mnohem odolnější. Za to nechá velký krystal a hromádku zlaťáků (zlataky).
export const ELITA = { zivoty: 5, poskozeni: 1.5, velikost: 4 / 3, xp: 6, zlataky: 3 };
export const TRVANI_HLASENI_HROZBY = 2.2;

// Síla nepřátel v daném čase hry (sekundy) podle tabulky HROZBA.
export function silaHrozby(cas) {
  const h = HROZBA;
  const min = Math.max(0, Number(cas) || 0) / 60;
  const nad = Math.max(0, min - h.narustOd);
  const pozde = h.narustPozde ** Math.max(0, min - h.pozdeOd);
  const narust = h.narustZivotu ** nad * pozde;
  const casteji = Math.max(0, min - h.castejiOd);
  return {
    min,
    uroven: 1 + Math.floor(min),
    zivoty: (1 + h.zivoty * min) * narust,
    bossZivoty: (1 + h.bossZivoty * min + h.bossNavic * casteji) * narust,
    poskozeni: (1 + h.poskozeni * min) * h.narustPoskozeni ** nad * pozde,
    rychlost: Math.min(h.maxRychlost, (1 + h.rychlost * min) * h.narustRychlosti ** nad),
    vlna: Math.max(h.nejkratsiVlna, h.prvniVlna - h.zkraceniVlny * min),
    davka: Math.min(h.maxDavka, 1 + Math.floor(h.davka * min)),
    maxNepratel: Math.min(h.stropNepratel, Math.round(h.maxNepratel + h.navicNepratel * min)),
    elita: min < h.elitaOd ? 0 : Math.min(h.elitaMax, h.elitaSance + h.elitaRust * casteji),
  };
}

// Text ohlášení při nové úrovni hrozby. Na začátku častějších elit se řekne proč.
export function textHrozby(uroven) {
  if (uroven === HROZBA.castejiOd + 1) return t('hra.hrozba.casteji', { n: uroven });
  if (uroven === HROZBA.elitaOd + 1) return t('hra.hrozba.elity', { n: uroven });
  return t('hra.hrozba.sili', { n: uroven });
}

// Přizpůsobení hrozby síle hrdiny: silný hrdina má hrozbu o naskok minut dál, než by odpovídalo času (víc životů,
// poškození, rychlosti, větší vlny, víc elit a silnější bossové, všechno přes silaHrozby). Cíl naskoku se skládá ze
// tří dílů a hrozba k němu jde postupně (rust minut za sekundu nahoru, pokles dolů), nejvýš max minut:
//   vylepseni × podíl trvalých vylepšení (0 = žádné, 1 = všechna na maximu),
//   uroven × ln(úroveň / ocekavanaUroven) nad očekávanou úrovní (ta je z bota bez vylepšení),
//   dps × ln(převaha), když je převaha nad 1. Převaha = poškození zbraní za sekundu (i to, co přeteče přes životy:
//   kdo nepřátele kosí jednou ranou, má převahu velkou) proti tomu, kolik životů nepřátel za sekundu přichází
//   (vlna mapy podle hrozby). Průměr za posledních okno s.
// Slabší hrdina naskok nemá (nic se mu neulehčí). Do od s se nepočítá nic (začátek je pro všechny stejný).
export const PRIZPUSOBENI = {
  vylepseni: 3, uroven: 2, dps: 1.6, max: 7, rust: 1 / 30, pokles: 1 / 30, okno: 15, od: 180,
};
// Úroveň, kterou hrající bot bez vylepšení v průměru má v dané minutě (docs/BALANC.md): do 4. minuty 4 za minutu,
// pak 8,5 za minutu.
export function ocekavanaUroven(min) {
  const m = Math.max(0, Number(min) || 0);
  return m <= 4 ? 1 + 4 * m : 17 + 8.5 * (m - 4);
}
// Kolik životů nepřátel za sekundu přichází: vlna (davka za vlna s) × průměrné životy druhů, které už na mapě chodí
// (podle vah), × hrozba a obtížnost mapy.
export function prisunZivotu(hra) {
  const sila = silaHry(hra);
  const druhy = MAPY[hra.mapa].nepratele.filter((d) => d.od <= 0 || hra.cas > d.od);
  const vahy = druhy.reduce((a, d) => a + d.vaha, 0) || 1;
  const prumer = druhy.reduce((a, d) => a + NEPRATELE[d.druh].hp * d.vaha, 0) / vahy;
  return (sila.davka / sila.vlna) * prumer * sila.zivoty * obtiznostMapy(hra.mapa).zivoty;
}
// Převaha hrdiny: poškození za sekundu (průměr za okno) proti přísunu životů.
export function prevaha(hra) {
  const prisun = prisunZivotu(hra);
  return prisun > 0 ? (hra.soucetPoskozeni ?? 0) / PRIZPUSOBENI.okno / prisun : 0;
}
// Cíl naskoku (v minutách) podle síly hrdiny, rozpis po dílech kvůli přehledu a simulaci.
export function cilNaskoku(hra) {
  const p = PRIZPUSOBENI;
  if (!(hra.cas >= p.od)) return { vylepseni: 0, uroven: 0, dps: 0, celkem: 0 };
  const vylepseni = p.vylepseni * (hra.podilVylepseni ?? 0);
  const uroven = p.uroven * Math.max(0, Math.log(hra.hrdina.uroven / ocekavanaUroven(hra.cas / 60)));
  const dps = p.dps * Math.max(0, Math.log(prevaha(hra)));
  return { vylepseni, uroven, dps, celkem: Math.min(p.max, vylepseni + uroven + dps) };
}
// Kolik minut hrozby má hra opravdu (čas + naskok) a síla nepřátel podle toho.
export function casHrozby(hra) {
  return hra.cas + 60 * (hra.naskok ?? 0);
}
export function silaHry(hra) {
  return silaHrozby(casHrozby(hra));
}
// Celé stupně hrozby navíc za sílu hrdiny (ukáže se v liště jako „+N“).
export function hrozbaNavic(hra) {
  return Math.max(0, silaHry(hra).uroven - silaHrozby(hra.cas).uroven);
}
function prizpusobHrozbu(hra, dt) {
  const p = PRIZPUSOBENI;
  // Poškození za okno s: zasah() přičítá, každou sekundu ubude 1/okno (klouzavý průměr).
  hra.soucetPoskozeni *= Math.exp(-dt / p.okno);
  const cil = cilNaskoku(hra).celkem;
  if (cil > hra.naskok) hra.naskok = Math.min(cil, hra.naskok + p.rust * dt);
  else hra.naskok = Math.max(cil, hra.naskok - p.pokles * dt);
}

// Obklíčení: kdo stojí na místě (ujde míň než pohyb × své rychlosti), tomu po od s začne obklíčení růst a za naplno s
// je plné. Obklíčenému dávají nepřátelé větší rány (× 1 + rana), zbroj (pasiva) mu ubere jen (1 − zbroj) svého
// a chvíle bez zranění po ráně je o nezranitelnost kratší. Všechno podle toho, jak je obklíčení plné, a sílí to
// s časem: do silneOd. minuty nic, naplno od plnaOd. minuty (silaObkliceni). Plně obklíčeného hrdinu od kruhOd.
// minuty každých kruhKazdych s (první po kruhPrvni s) obklíčí kruh nepřátel z mixu mapy ve vzdálenosti
// kruhPolomer: kruhPocet + kruhNavic za každou minutu hrozby, nejvýš kruhMax. Pohyb obklíčení rozpustí za
// vyprchani s.
export const OBKLICENI = {
  od: 1.5, naplno: 3, pohyb: 0.3, vyprchani: 1.2, silneOd: 2, plnaOd: 6, rana: 2, ranaVylepseni: 8, drive: 2, zbroj: 0.75, nezranitelnost: 0.6,
  kruhOd: 3, kruhPrvni: 0.5, kruhKazdych: 5, kruhPolomer: 230, kruhPocet: 4, kruhNavic: 1.2, kruhMax: 30,
};
// Jak silné je obklíčení v tuhle chvíli hry: 0..1 podle minuty (od silneOd do plnaOd roste rovnoměrně). S trvalými
// vylepšeními začne a dojde naplno dřív, o drive minut × podíl vylepšení.
export function silaObkliceni(hra) {
  const o = OBKLICENI;
  const drive = o.drive * (hra.podilVylepseni ?? 0);
  return Math.max(0, Math.min(1, (hra.cas / 60 - o.silneOd + drive) / (o.plnaOd - o.silneOd)));
}
function obklicuj(hra, dt, ujito, sirka, vyska) {
  const { hrdina } = hra;
  const o = OBKLICENI;
  if (ujito < o.pohyb * hrdina.rychlost * dt) hrdina.stani += dt;
  else hrdina.stani = 0;
  const pred = hrdina.obkliceni;
  if (hrdina.stani > o.od) hrdina.obkliceni = Math.min(1, hrdina.obkliceni + dt / o.naplno);
  else hrdina.obkliceni = Math.max(0, hrdina.obkliceni - dt / o.vyprchani);
  hrdina.silaObkliceni = hrdina.obkliceni * silaObkliceni(hra);
  if (hrdina.obkliceni < 1 || hra.cas < o.kruhOd * 60) {
    hra.doKruhu = o.kruhPrvni;
    return;
  }
  if (pred < 1) {
    hra.obkliceno += 1;
    zvuk(hra, 'obkliceni');
    if (!hra.oznameni || hra.oznameni.zivot < 1) hra.oznameni = { text: t('hra.obkliceni'), zivot: 2 };
  }
  hra.doKruhu -= dt;
  if (hra.doKruhu > 0) return;
  hra.doKruhu = o.kruhKazdych;
  kruhNepratel(hra, sirka, vyska);
}
// Kruh nepřátel kolem hrdiny (obklíčení). Duchové ne (ti stejně proletí), přes strop louky jen o kruhMax. Nepřátelé
// z kruhu schopnosti nemají.
function kruhNepratel(hra, sirka, vyska) {
  const { hrdina, rng } = hra;
  const o = OBKLICENI;
  const sila = silaHry(hra);
  const volno = sila.maxNepratel + o.kruhMax - hra.nepratele.length;
  const pocet = Math.min(volno, o.kruhMax, o.kruhPocet + Math.floor(o.kruhNavic * sila.min));
  if (pocet <= 0) return;
  const druhy = MAPY[hra.mapa].nepratele.filter((d) => (d.od <= 0 || hra.cas > d.od) && !NEPRATELE[d.druh].duch);
  const celkem = druhy.reduce((soucet, d) => soucet + d.vaha, 0);
  const otoceni = rng.dalsi() * Math.PI * 2;
  for (let i = 0; i < pocet; i++) {
    const uhel = otoceni + (i / pocet) * Math.PI * 2;
    const misto = { x: hrdina.x + Math.cos(uhel) * o.kruhPolomer, y: hrdina.y + Math.sin(uhel) * o.kruhPolomer };
    vytlacZPrekazek(hra.mapa, misto, 12);
    const n = pridejNepritele(hra, druhy.length ? losujDruh(druhy, celkem, rng.dalsi()) : 'netopyr', misto.x, misto.y);
    // Kruh jen obkličuje: jde na hrdinu, kosti ani skoky nemá (ty patří vlnám).
    n.kruh = true;
    delete n.doSchopnosti;
    rozprsk(hra, misto.x, misto.y, 'stin', 4);
  }
  hra.kruhu += 1;
  hra.tres = Math.max(hra.tres, TRVANI_TRESU);
}
// Rána od nepřítele obklíčenému hrdinovi: větší podle obklíčení, a čím víc trvalých vylepšení, tím ještě větší
// (ranaVylepseni × podíl vylepšení navíc k rana): se stromem vylepšení by se jinak dalo zase jen stát.
function ranaObklicenemu(hra, kolik) {
  const { hrdina } = hra;
  return kolik * (1 + (OBKLICENI.rana + OBKLICENI.ranaVylepseni * (hra.podilVylepseni ?? 0)) * (hrdina.silaObkliceni ?? 0));
}

// Nadbíhání: obyčejný nepřítel nejde na místo, kde hrdina je, ale kam doběhne za čas, než k němu dojde (nejvýš
// predstih s), a z toho jen podil. Utíkajícímu hrdinovi tak nepřátelé nadbíhají a zavírají cestu, stojícímu nic.
// Vlny navíc od od s chodí častěji zepředu: díl zepredu nepřátel z vln vyleze v kuželu rozptyl (radiány) před
// běžícím hrdinou, ostatní kdekoli kolem (v kuželu je jich tak zepredu + (1 − zepredu) · rozptyl / 2π).
export const NADBIHANI = { predstih: 0.9, podil: 0.6, od: 40, zepredu: 0.1, rozptyl: 2.1 };
// Elita vede smečku: obyčejní nepřátelé do dosah px od elity jdou × rychlost.
export const VUDCE = { dosah: 130, rychlost: 1.25 };

// Bossové víc tlačí: pauza bossů mezi schopnostmi se s každou minutou hrozby po od. zkracuje o zaMinutu (nejvýš
// na min) a obklíčenému hrdinovi ještě na stani. Boss dál než dohani px od hrdiny jde rychleji (× dohaniRychlost).
export const TLAK_BOSSU = { od: 3, zaMinutu: 0.03, min: 0.5, stani: 0.6, dohani: 380, dohaniRychlost: 1.7 };

const MAX_KRYSTALU = 300;
// Srdce a magnet z nepřátel: dřív 1,2 % a 0,3 %, padalo jich moc (Daliik 5. 11.). Teď zhruba srdce za minutu
// a magnet za 3–4 minuty při ~300 zabitích za minutu; Štěstí šanci dál násobí.
const SANCE_SRDCE = 0.004;
const SANCE_MAGNET = 0.001;
const LECENI_SRDCE = 25;
const BOSS_KAZDYCH = 180;
const MAX_CASTIC = 400;
const ZIVOT_CASTICE = 0.45;
export const TRVANI_TRESU = 0.15;
// Čísla nad hlavami: zásah nepřítele, rána hrdinovi, léčení a zlaťák. Zásahy do stejného nepřítele během
// SLUCOVANI_CISEL se sečtou do jednoho čísla a naráz jich je nejvýš MAX_CISEL (nejstarší zmizí první).
export const TRVANI_CISLA = 0.6;
export const TRVANI_CISLA_LECENI = 0.8;
export const SLUCOVANI_CISEL = 0.15;
export const MAX_CISEL = 80;
// Silný zásah (žluté větší číslo): aspoň NAD_PRAHEM× víc, než dá obvyklá silná rána. Obvyklou silnou ránu si hra
// průběžně odhaduje jako hranici horních PODIL_SILNYCH všech ran, takže s lepšími zbraněmi roste i ona.
export const PODIL_SILNYCH = 0.12;
export const NAD_PRAHEM = 1.25;
export const PRAH_NA_ZACATKU = 12;
const UCENI_PRAHU = 0.005;
// Koho spálí žár lucerny, ten se na chvíli rozzáří teplým světlem (místo bílého bliknutí jako u ostatních zbraní).
export const TRVANI_ZARU = 0.2;
// Pasivy zbraní. Kritický zásah bolí NASOBEK_KRITU× a ukáže vlastní zlaté číslo. Ozvěna vystřelí (nebo zasáhne)
// znovu za ZPOZDENI_OZVENY s, na místě se rozběhne kroužek (TRVANI_DOZVUKU s). Zásahů čekajících na ozvěnu je
// nejvýš MAX_OZVEN_ZASAHU (lucerna pálí desítky naráz). Otřes (Výdrž u okamžitých zásahů) zpomalí nepřítele na
// ZPOMALENI_OTRESU (bosse napůl tolik). Uhlíky (Příval u lucerny) krouží po okraji světla OTACENI_UHLIKU rad/s,
// stejného nepřítele pálí nejdřív za ZASAH_UHLIKEM s ranou RANA_UHLIKU žáru lucerny. Další řady Ohnivé stopy
// hoří vedle hlavní, ROZESTUP_RAD poloměru plamene od sebe.
export const NASOBEK_KRITU = 2;
export const ZPOZDENI_OZVENY = 0.15;
export const TRVANI_DOZVUKU = 0.3;
export const MAX_OZVEN_ZASAHU = 200;
const MAX_DOZVUKU = 40;
export const ZPOMALENI_OTRESU = 0.5;
export const OTACENI_UHLIKU = 1.8;
export const ZASAH_UHLIKEM = 0.5;
export const RANA_UHLIKU = 0.6;
export const ROZESTUP_RAD = 1.7;
// Pavouk zalepí hrdinu sítí: na chvíli zpomalí. Opakovaný zásah síť obnoví, nesčítá se.
// Kdy který druh přijde, je v datech mapy (mapy.js), OD_* jsou časy na Louce.
export const OD_PAVOUKU = odKdy(VYCHOZI_MAPA, 'pavouk');
export const TRVANI_SITE = 1.5;
export const ZPOMALENI_SITI = 0.6;
// Oživení (trvalé vylepšení): hrdina vstane s půlkou životů, chvíli je nezranitelný a duše odhodí nepřátele kolem.
export const ZIVOTY_PO_OZIVENI = 0.5;
export const NEZRANITELNY_PO_OZIVENI = 2;
export const ODHOZENI_PRI_OZIVENI = 160;
export const TRVANI_ZABLESKU = 0.8;
// Duch letí rovně tam, kde hrdina zrovna byl, a proletí skrz. Pak na chvíli zmizí: neublíží, zbraně ho
// nevidí a dál letí stejným směrem. Až se zase ukáže, zamíří znovu.
export const OD_DUCHU = odKdy(VYCHOZI_MAPA, 'duch');
export const VIDITELNY_DUCH = 2.6;
export const SKRYTY_DUCH = 0.9;
// Duchy (i ledové) jde těžko trefit, takže by se jich jinak nahromadilo plno. Nad tenhle počet místo nich přiletí
// netopýr, a kde netopýři nechodí, první druh mapy, který není duch (NAHRADA_DUCHA, na jezeře vločka).
export const MAX_DUCHU = 24;
// Houbák je pomalý, ale po smrti nechá na 3 s jedový oblak, který zraňuje hrdinu, dokud v něm stojí.
// Prvních pár desetin sekundy se oblak teprve nafukuje a nepálí, ať má hráč čas uhnout.
export const OD_HOUBAKU = odKdy(VYCHOZI_MAPA, 'houbak');
export const TRVANI_OBLAKU = 3;
export const NAFUKOVANI_OBLAKU = 0.4;
export const POLOMER_OBLAKU = 36;
export const JED_OBLAKU = 4;
const MAX_OBLAKU = 40;
// Vlci chodí na Louce jen ve smečkách, které se vynoří na jednom místě okraje (kdy a jak často, je v datech mapy).
// První smečka přijde chvíli po prvním Strážci, ať se jejich ohlášení nepřekryjí. Na jezeře chodí i sami.
export const OD_VLKU = 180;
export const SMECKA_OD = 4;
export const SMECKA_DO = 6;
// Žába skáče: SKOK_ZABY.pauza s sedí, pak SKOK_ZABY.skok s letí SKOK_ZABY.rychlost× rychleji (v průměru jde zhruba
// svou rychlostí). Kdy v cyklu je, se počítá z času jejího příchodu, ne z rng.
export const SKOK_ZABY = { pauza: 0.5, skok: 0.32, rychlost: 2.6 };
// Hrdina je pro překážky kruh o tomhle poloměru (stejně daleko od něj ho nepřítel kousne, viz polomer + 8).
export const POLOMER_HRDINY = 9;
// Bedny, zamčené truhly a vůz kupce stojí aspoň tak daleko od překážek (aby šly sebrat a nestály v kameni).
const ODSTUP_OD_PREKAZEK = { bedna: 16, vuz: 26 };
// Bedničky a sudy po louce: rozbije je jakýkoli zásah zbraní a vypadne z nich jedna věc. Objevují se jen mimo
// obrazovku (kousek za jejím okrajem), nejvýš MAX_BEDEN naráz. Které zůstaly moc daleko za hrdinou, zmizí,
// ať se nové objevují tam, kam hrdina zrovna jde.
export const MAX_BEDEN = 12;
export const BEDNA_KAZDYCH = 2.5;
const PRVNI_BEDNA = 1.5;
export const POLOMER_BEDNY = 12;
// Nejbližší bedna je OKRAJ_BEDEN px za okrajem obrazovky (sprite má 30 px, celá je tedy mimo), nejdál o PASMO_BEDEN víc.
export const OKRAJ_BEDEN = 30;
const PASMO_BEDEN = 220;
// Jiskra míří na bednu, jen když je blíž než všichni nepřátelé a nanejvýš takhle daleko.
export const JISKRA_NA_BEDNU = 260;
// Co z bedny vypadne a jak často (součet 1). Zlaťáky se utrácí u kupce (níž). Bomba je vzácná: složí všechny
// nepřátele na obrazovce kromě bossů (a schovaného ducha, toho nevidí nic).
export const KORIST_BEDEN = { krystal: 0.42, zlatak: 0.3, srdce: 0.15, magnet: 0.08, bomba: 0.05 };
export const TRVANI_VYBUCHU = 0.6;

// Schopnosti bossů. Každá začne varováním (varovani s): boss se zastaví a je vidět, co přijde (rudý kruh pod
// ním, kameny nad hlavou, čára výpadu, kruhy vyvolání, záře). Teprve pak se provede. dosah = jak blízko musí
// hrdina být, jinak boss vezme další schopnost v pořadí. Co která dělá, je v PRUBEH_SCHOPNOSTI, jak vypadá,
// v kresleni.js podle id. Novou schopnost stačí přidat sem a do PRUBEH_SCHOPNOSTI a dát ji bossovi v BOSSOVE.
export const VAROVANI = 0.8;
export const SCHOPNOSTI = {
  // Dupnutí: pod bossem roste rudý kruh, pak od něj vyběhne rázová vlna (RYCHLOST_VLNY) a obrazovka se otřese.
  // Kdo je v kruhu, když jím vlna projde, dostane ránu a odletí od bosse o odhozeni px. Kruh je tak velký, aby
  // z něj hrdina, který hned po varování vyrazí ven, vlně utekl (kromě toho, kdo se bosse skoro dotýká).
  dupnuti: { varovani: VAROVANI, dosah: 250, polomer: 170, poskozeni: 16, odhozeni: 90 },
  // Hod: boss zvedne kameny nad hlavu a hodí je obloukem. První dopadne tam, kam hrdina běží (stojícímu pod
  // nohy), ostatní kolem do rozptylu. Stín na zemi ukazuje dopad celý let, po dopadu malý výbuch (polomer).
  // strela = sprite letící věci, sit = zásah zalepí hrdinu sítí.
  hod: {
    varovani: VAROVANI, dosah: 560, strela: 'kamen', pocet: [3, 5], let: 0.9, polomer: 30, poskozeni: 14,
    rozptyl: 72, predstih: 1, sit: false,
  },
  // Výpad: boss míří (čára na zemi), posledních zamek s už směr nemění, pak proběhne rovně delka px rychlostí
  // rychlost. Koho cestou trefí, ten dostane ránu a odletí stranou od dráhy.
  vypad: { varovani: VAROVANI, dosah: 420, zamek: 0.3, rychlost: 520, delka: 520, poskozeni: 16, odhozeni: 70 },
  // Vyvolání: kolem bosse se rozzáří kruhy a z nich vylezou pomocníci (druh). Živých pomocníků toho druhu od
  // všech bossů je nejvýš max, když je plno, boss vezme jinou schopnost. vyrazi = hned po vylezení běží rychleji.
  vyvolani: { varovani: VAROVANI, dosah: 640, druh: 'netopyr', pocet: [6, 8], max: 16, vzdalenost: 50, vyrazi: false },
  // Vějíř: boss se přenese kousek od hrdiny (na obrazovku), nabije se a vystřelí salv vějířů po strel střelách,
  // každý znovu namířený na hrdinu.
  vejir: { varovani: VAROVANI, strel: 5, salv: 2, mezi: 0.4, rozestup: 0.22, poskozeni: 8, rychlost: 160 },
  // Skok: nepřítel se přikrčí a zamíří na místo, kde hrdina je (kruh dopadu je vidět od začátku), pak přeletí
  // obloukem (let s, ve vzduchu nekouše) a dopadne. Kdo je v kruhu, dostane ránu. Hrdinovi do blizko px neskáče.
  // Dopad je vidět jako výbuch druhu dopad (bez něj zelený sliz, permoník jiskří krumpáčem jako kámen).
  skok: { varovani: 0.55, dosah: 240, blizko: 50, let: 0.5, polomer: 36, poskozeni: 3 },
};
pripojTexty(SCHOPNOSTI, 'schopnosti');
// Pod ZURIVOST životů boss zuří: mezi schopnostmi čeká jen ZRYCHLENI_ZURIVOSTI své pauzy.
export const ZURIVOST = 0.5;
export const ZRYCHLENI_ZURIVOSTI = 0.55;
// První schopnost přijde chvíli po příchodu, ať si hráč bosse stihne všimnout.
export const PRVNI_SCHOPNOST = 2.5;
export const RYCHLOST_VLNY = 320;
// Dupnutí otřese obrazovkou víc než obyčejný zásah (třes slábne z TRES_DUPNUTI k nule).
export const TRES_DUPNUTI = 0.35;
// Kameny z jednoho hodu dopadají kousek po sobě, výbuch po dopadu trvá TRVANI_DOPADU.
const ROZESTUP_HODU = 0.06;
export const TRVANI_DOPADU = 0.3;
// Odhozený hrdina letí tak dlouho a mezitím nejde řídit.
export const TRVANI_ODHOZENI_HRDINY = 0.2;
// Pavoučci od Matky: hned po vylezení chvíli běží mnohem rychleji (vyrazí k hrdinovi) a kousnutím ho zalepí
// sítí jako pavouk. Naráz jich žije nejvýš MAX_PAVOUCKU.
export const VYRAZENI_PAVOUCKU = 0.6;
export const RYCHLOST_VYRAZENI = 2.4;
export const MAX_PAVOUCKU = 24;
export const ZJEVENI_BLUDICKY = 0.3;
const ZIVOT_STREL_BOSSU = 3.5;
export const POLOMER_STRELY_BOSSU = 5;

// Bossové: každé 3 minuty přijde další v tomhle pořadí, po posledním zase první. Každý má vlastní nápis při
// příchodu, nahoře na obrazovce svůj pruh životů (víc bossů naráz = víc pruhů, bossBary) a 2–3 schopnosti,
// které střídá dokola. pauza = kolik s po jedné schopnosti čeká na další. U schopnosti je jen id ze SCHOPNOSTI
// a to, co má tenhle boss jinak.
export const PORADI_BOSSU = ['strazce', 'matka', 'obr', 'bludicka'];
export const BOSSOVE = {
  strazce: {
    pauza: 3,
    schopnosti: [{ id: 'dupnuti' }, { id: 'vypad' }, { id: 'vyvolani', druh: 'kostlivec', pocet: [6, 6], max: 12, vzdalenost: 60 }],
  },
  matka: {
    pauza: 2.8,
    schopnosti: [
      { id: 'vyvolani', druh: 'pavoucek', pocet: [6, 8], max: MAX_PAVOUCKU, vzdalenost: 6, vyrazi: true },
      { id: 'hod', strela: 'kokon', pocet: [3, 3], poskozeni: 8, polomer: 34, rozptyl: 64, sit: true },
      { id: 'vypad', rychlost: 600, delka: 440, poskozeni: 12, odhozeni: 50 },
    ],
  },
  obr: {
    pauza: 2.6,
    schopnosti: [{ id: 'hod' }, { id: 'dupnuti', polomer: 200, dosah: 280, poskozeni: 20, odhozeni: 120 }],
  },
  bludicka: {
    pauza: 3,
    schopnosti: [{ id: 'vejir' }, { id: 'vyvolani', druh: 'duch', pocet: [6, 6], max: 8, vzdalenost: 40 }],
  },
  // Hlavní bossové map (boss v mapy.js) vycházejí z jednoho ze čtyř (zaklad): jiné barvy, jméno a schopnosti,
  // stejné chování a truhla dá kus sady toho, z koho vycházejí. strely = barva střel vějíře (null = modré).
  lavovy_obr: {
    pauza: 2.6,
    zaklad: 'obr',
    schopnosti: [
      { id: 'hod', strela: 'magma', poskozeni: 16 },
      { id: 'dupnuti', polomer: 200, dosah: 280, poskozeni: 20, odhozeni: 120 },
      { id: 'vyvolani', druh: 'ohnivy_brouk', pocet: [6, 8], max: 16, vzdalenost: 50 },
    ],
  },
  bahenni_bludicka: {
    pauza: 3,
    zaklad: 'bludicka', strely: 'bahno',
    schopnosti: [{ id: 'vejir', poskozeni: 9 }, { id: 'vyvolani', druh: 'zaba', pocet: [6, 8], max: 14, vzdalenost: 40 }],
  },
  kosteny_kral: {
    pauza: 2.8,
    zaklad: 'strazce',
    schopnosti: [
      { id: 'vypad', poskozeni: 18 },
      { id: 'hod', strela: 'lebka', pocet: [3, 4], poskozeni: 12, polomer: 28 },
      { id: 'vyvolani', druh: 'kostlivec', pocet: [6, 6], max: 12, vzdalenost: 60 },
    ],
  },
};
pripojTexty(BOSSOVE, 'bossove');
// Ze kterého ze čtyř bossů tenhle vychází (u čtyř základních on sám). Podle toho se kreslí a co dá truhla.
export function zakladBosse(druh) {
  return BOSSOVE[druh]?.zaklad ?? druh;
}
// Pořadí bossů na mapě: první přijde hlavní boss mapy a nahradí v kole toho, ze kterého vychází. Na Louce je to
// Strážce, takže pořadí je pořád PORADI_BOSSU.
const PORADI_BOSSU_MAP = Object.fromEntries(PORADI_MAP.map((id) => {
  const hlavni = Object.hasOwn(BOSSOVE, MAPY[id].boss) ? MAPY[id].boss : PORADI_BOSSU[0];
  return [id, [hlavni, ...PORADI_BOSSU.filter((d) => d !== zakladBosse(hlavni))]];
}));
export function poradiBossu(mapa) {
  return PORADI_BOSSU_MAP[mapa] ?? PORADI_BOSSU;
}
// Schopnosti jednoho bosse v pořadí, jak je střídá: data ze SCHOPNOSTI a přes ně to, co má boss jinak.
// Jméno schopnosti zůstane getter ze SCHOPNOSTI (rozbalení by ho zkopírovalo v jazyce, který platil při načtení).
function schopnostSeJmenem(data, id) {
  return Object.defineProperty(data, 'nazev', { get: () => SCHOPNOSTI[id].nazev, enumerable: true, configurable: true });
}
const SEZNAM_SCHOPNOSTI = Object.fromEntries(Object.entries(BOSSOVE).map(([druh, b]) => [
  druh, b.schopnosti.map((s) => schopnostSeJmenem({ ...SCHOPNOSTI[s.id], ...s }, s.id)),
]));
export function schopnostiBosse(druh) {
  return SEZNAM_SCHOPNOSTI[druh] ?? [];
}

// Trnová past: trsy trnů vyraší pod nejbližšími nepřáteli (každý pod jiným, ne dva na sobě), chvíli rostou
// (RUST_TRNU, ještě neškodí), pak zraňují každého, kdo v nich stojí, a zpomalí ho. Zpomalení chvíli doznívá
// i po vylezení. Bosse zpomalí jen napůl. Na konci trsy zase zalezou do země (VADNUTI_TRNU, už neškodí).
// Volné trsy, na které nezbyl nepřítel, vyraší pod bednou v dosahu.
export const RUST_TRNU = 0.25;
export const VADNUTI_TRNU = 0.35;
export const DOZNIVANI_TRNU = 0.4;
// Limity trsů, semínek a plamenů jsou s rezervou pro Příval a Výdrž (víc kusů, které déle vydrží).
export const MAX_TRNU = 90;
// Zrcadlový štít: zrcadla krouží těsně u hrdiny. Střelu bosse, která do zrcadla narazí, pošle zpátky
// (rychleji a zraní nepřátele, ne hrdinu). Nepřítel, který se zrcadla dotkne, dostane ránu a odletí od hrdiny
// (bossové jsou moc těžcí, ti jen dostanou ránu).
export const TRVANI_ODHOZENI = 0.2;
export const ZRYCHLENI_ODRAZU = 1.3;
const ZIVOT_ODRAZU = 2;
export const TRVANI_ODLESKU = 0.25;
// Světlušky: roj se vznáší kolem hrdiny. Odpočatá světluška si vybere nepřítele v dosahu (nejdřív toho, na
// koho ještě žádná neletí), vyletí ven a zatáčí k němu (OTACENI_SVETLUSKY, s každou chvílí letu ostřeji, ať
// nekrouží kolem cíle), po zásahu se vrátí a odpočívá. Když cíl zmizí, vezme nejbližšího jiného, jinak se
// vrátí. Nejdéle letí MAX_LETU s. Bez nepřátel letí na bednu v dosahu.
export const OTACENI_SVETLUSKY = 6;
export const MAX_LETU = 3;
export const NAVRAT_SVETLUSKY = 1.3;
// Mrazivý krystal: dopadne (DOPAD_KRYSTALU s, ještě nic nedělá) doprostřed největšího hloučku v dosahu, pak
// zóna mrzne: kdo v ní stojí, jde čím dál pomaleji (bossové napůl), zpomalení po vylezení chvíli dozní.
// Na konci se zóna roztříští: rána všem uvnitř a obyčejného nepřítele (ne bosse), kterému zbude nanejvýš
// PRAH_ROZTRISTENI životů, roztříští rovnou. Nová zóna nedopadne do jiné, která ještě mrzne. Nepřátelé jdou
// za hrdinou, a tak krystal dopadne o PREDSTIH_ZONY poloměru blíž k němu: hlouček do zóny teprve vejde.
export const DOPAD_KRYSTALU = 0.3;
export const PREDSTIH_ZONY = 0.5;
export const DOZNIVANI_MRAZU = 0.5;
export const PRAH_ROZTRISTENI = 0.15;
export const TRVANI_TRISTENI = 0.35;
export const MAX_ZON = 30;
const KANDIDATU_ZONY = 40;
// Zvon hlubin: zvoní nad hrdinou, z místa, kde zrovna stojí, se rozběhne zvuková vlna (RYCHLOST_ZVUKU px/s)
// a každého, přes koho přejde, zasáhne jednou, odhodí ho a omráčí. Omráčený stojí a nekouše (boss jde napůl
// a kouše dál). Po omráčení je nepřítel ještě IMUNITA_OMRACENI s odolný: vlna ho jen zraní (neodhodí ani
// neomráčí), ať ho zvon s ozvěnami nedrží pořád omráčeného a za hradbou vln. Ozvěny jdou po OZVENA_ZVONU s
// a další zvonění počká, až doznějí.
export const RYCHLOST_ZVUKU = 300;
export const OZVENA_ZVONU = 0.35;
export const IMUNITA_OMRACENI = 1.2;
export const ZPOMALENI_OMRACENEHO_BOSSE = 0.5;
export const KYV_ZVONU = 0.6;
// Cep na řetězu: koule (bod s rychlostí) je přivázaná řetězem k hrdinovi. Když hrdina jde, koule se za ním táhne
// a na zatáčkách se kývá (řetěz nepustí kouli dál než na svou délku a ubere jí rychlost od hrdiny, ta do strany
// zůstane). Když hrdina stojí, roztáčí ji kolem sebe. Rána roste s rychlostí koule (ranaCepu), pomalá koule
// (pod MIN_RYCHLOST_CEPU) nebolí. Stejného nepřítele trefí nejdřív za ZASAH_CEPEM s. Každá další koule má
// řetěz o RETEZ_DALSI delší.
export const TRENI_CEPU = 1.5;
export const MIN_RYCHLOST_CEPU = 60;
export const RYCHLOST_RANY_CEPU = 160;
export const MAX_RYCHLOST_CEPU = 700;
export const ZASAH_CEPEM = 0.4;
export const RETEZ_DALSI = 0.25;
const ROZTOCENI_CEPU = 3;
// Semínkové bomby: hrdina upustí semínka za sebe (stojí-li, kolem nohou), po ZRANI_SEMINKA s semínko vybuchne:
// rána všem v poloměru a na místě vyroste trnitý keř (POMER_KERE poloměru výbuchu), který píchá každého, kdo
// v něm stojí, a po trvani zvadne. Semínek a keřů je naráz nejvýš MAX_SEMINEK (nejstarší keř zmizí dřív).
export const ZRANI_SEMINKA = 1;
export const POMER_KERE = 0.6;
export const RUST_KERE = 0.15;
export const VADNUTI_KERE = 0.3;
export const TRVANI_VYBUCHU_SEMINKA = 0.3;
export const MAX_SEMINEK = 120;
const ROZESTUP_SEMINEK = 24;
// Kořeny: kořen vyběhne od hrdiny pod zemí (RYCHLOST_KORENE px/s) za svým nepřítelem a pod ním vyrazí: rána
// všem v poloměru a kdo tam stojí, toho kořeny drží (stojí, boss jde ZPOMALENI_DRZENEHO_BOSSE) a každých
// TIK_KORENU s svírají. Odhození s drženým nehne. Po puštění je nepřítel IMUNITA_KORENU s odolný (kořeny ho
// nechytí), ať ho nedrží pořád. Když cíl cestou zmizí, kořen si najde jiný, a když žádný není, vyrazí tam, kde je
// (nejpozději po MAX_BEHU_KORENE s). Kořenů v zemi i vyražených je naráz nejvýš MAX_KORENU. Ze země vyrůstají
// VYRAZENI_KORENU s (jen na pohled, drží hned).
export const RYCHLOST_KORENE = 260;
export const MAX_BEHU_KORENE = 1.6;
export const IMUNITA_KORENU = 1.5;
export const ZPOMALENI_DRZENEHO_BOSSE = 0.5;
export const VYRAZENI_KORENU = 0.25;
export const TIK_KORENU = 0.4;
export const MAX_KORENU = 80;
const STOPA_KORENE = 12;
// Ohnivá stopa: pod nohama hrdiny vzplane plamen, kdykoli od posledního ujde ROZESTUP_STOPY jeho poloměru
// (když stojí, plamen pod ním nedohasne). Plamen hoří trvani s a kdo v něm stojí, toho každý tik spálí (stojí-li
// v několika plamenech naráz, pálí ho jen jednou). Od 4. úrovně ho oheň zapálí: po vylezení ještě hori s hoří
// a každý tik ho pálí slabší pali. Plamenů je naráz nejvýš MAX_PLAMENU (nejstarší zhasne dřív).
export const ROZESTUP_STOPY = 0.8;
export const VZPLANUTI = 0.15;
export const DOHASINANI = 0.4;
export const MAX_PLAMENU = 240;
// Odrazný kámen: prak vystřelí kámen (RYCHLOST_KAMENE px/s) na nejbližší nepřátele, každý kámen na jiného.
// Kámen svůj cíl dohoní, po zásahu se odrazí na nejbližšího dosud nezasaženého do skok px a každým odrazem
// zrychlí (ZRYCHLENI_KAMENE, nanejvýš MAX_RYCHLOST_KAMENE) a víc bolí (RUST_RANY_KAMENE za odraz). Když už
// nemá na koho, odletí od posledního pryč a do VOLNY_LET s spadne. Od skály (překážky mapy) se odrazí zadarmo
// a BEZ_CILE_PO_SKALE s si nevybírá cíl, ať do ní nenaráží pořád. Bedny, přes které letí, rozbije.
export const RYCHLOST_KAMENE = 380;
export const ZRYCHLENI_KAMENE = 1.08;
export const MAX_RYCHLOST_KAMENE = 700;
export const RUST_RANY_KAMENE = 0.15;
export const POLOMER_KAMENE = 5;
export const VOLNY_LET = 0.4;
export const BEZ_CILE_PO_SKALE = 0.2;
export const ZIVOT_KAMENE = 3;
export const PAD_KAMENE = 0.35;
export const MAX_KAMENU = 30;

// Výbava bossů (data a staty v vystroj.js). Truhla bosse se po dotyku TRVANI_OTEVRENI s otevírá a svět mezitím
// stojí, pak dá kus výbavy a kartu. Efekty sad: rázová vlna běží RYCHLOST_VLNY_HRDINY px/s a první vyběhne
// PRVNI_VLNA_HRDINY s po nasazení. Zapředený nepřítel stojí, boss v síti jde ZPOMALENI_SITE_BOSSE.
export const TRVANI_OTEVRENI = 1;
export const RYCHLOST_VLNY_HRDINY = 420;
export const PRVNI_VLNA_HRDINY = 1;
export const ZPOMALENI_SITE_BOSSE = 0.5;

// Zlaťáky padají z bedniček (KORIST_BEDEN), z elity (hromádka ELITA.zlataky), občas z obyčejného nepřítele
// (SANCE_ZLATAKU, ze stejného losu jako srdce a magnet, ať se náhoda vln neposune) a z rozloženého kusu výbavy.
// Zlaťák v dosahu magnetu letí k hrdinovi jako krystal. Utrácí se u kupce, za přehození karet a za zamčené
// truhly. Co po hře zbude, promění se v duše (DUSE_ZA v duse.js).
export const SANCE_ZLATAKU = 0.02;
// Měšec: nepřátelé (i elity) pustí nejvýš tolik zlaťáků, kolik v něm zrovna je. Plní se MESEC.zaMinutu za minutu,
// nejvýš do MESEC.strop, a na začátku je plný. Bez něj by v pozdní hře, kdy padají stovky elit za minutu, bylo
// zlaťáků tolik, že by u kupce nic nestálo za nic (bot s plnými vylepšeními pak přežil přes 30 minut).
export const MESEC = { zaMinutu: 20, strop: 15 };
// Kupec: od KUPEC.prvni s každých KUPEC.kazdych s přijede na louku vůz, kousek za okraj obrazovky (okraj až
// okraj + pasmo px), a stojí tam KUPEC.trvani s. Když zrovna žije boss nebo by boss přišel dřív, než kupec
// odjede, počká. Dotyk vozu (dosah) otevře obchod a svět mezitím stojí. Znovu se obchod otevře, až hrdina
// odejde dál než odchod px a vrátí se.
export const KUPEC = { prvni: 125, kazdych: 180, trvani: 45, dosah: 34, odchod: 70, okraj: 60, pasmo: 160 };
// Zboží kupce: cena = základ × (1 + RUST_CEN) ^ (hrozba − 1), tedy s každým stupněm hrozby o 12 % víc a pořád
// rychleji (rust: false = cena se nemění), zasoba = kolik kusů má kupec na jednu návštěvu. Co které zboží udělá,
// je v POUZITI_ZBOZI.
export const RUST_CEN = 0.12;
export const ZBOZI = {
  lektvar: { ikona: 'lektvar', cena: 4, zasoba: 2 },
  prehozeni: { ikona: 'prehozeni', cena: 3, zasoba: 2, kolik: 2 },
  vylepseni: { ikona: 'tajemno', cena: 10, zasoba: 1 },
  kus: { ikona: 'truhla_strazce', cena: 40, zasoba: 1 },
  klic: { ikona: 'klic', cena: 8, zasoba: 1, rust: false },
};
pripojTexty(ZBOZI, 'zbozi');
export const PORADI_ZBOZI = Object.keys(ZBOZI);
export const LECENI_LEKTVARU = 0.5;
// Přehodit karty v okně výběru: první přehození za zlaťáky stojí PREHOZENI.cena, každé další o PREHOZENI.rust
// víc. Přehození zdarma od kupce se bere první a cenu nezvedá.
export const PREHOZENI = { cena: 2, rust: 2 };
// Zamčené truhly po louce: objevují se jako bedničky mimo obrazovku (první v PRVNI_ZAMCENA s, pak každých
// ZAMCENA_KAZDYCH s, nejvýš MAX_ZAMCENYCH naráz) a daleko za hrdinou zmizí. Zbraně je nerozbijí. Při dotyku je
// odemkne Klíč, a když žádný není, zaplatí se CENA_ZAMCENE zlaťáků. Uvnitř je volba karty aspoň vzácné.
export const MAX_ZAMCENYCH = 2;
export const ZAMCENA_KAZDYCH = 90;
export const PRVNI_ZAMCENA = 40;
export const CENA_ZAMCENE = 15;
export const POLOMER_ZAMCENE = 14;

const NEPRATELE = {
  netopyr: { hp: 10, rychlost: 72, poskozeni: 5, xp: 1, polomer: 10 },
  slizak: { hp: 32, rychlost: 42, poskozeni: 10, xp: 2, polomer: 12 },
  kostlivec: { hp: 60, rychlost: 58, poskozeni: 14, xp: 3, polomer: 11 },
  pavouk: { hp: 8, rychlost: 100, poskozeni: 4, xp: 2, polomer: 9, sit: true },
  duch: { hp: 18, rychlost: 80, poskozeni: 7, xp: 2, polomer: 10, duch: true },
  houbak: { hp: 32, rychlost: 30, poskozeni: 8, xp: 3, polomer: 12, jed: true },
  vlk: { hp: 16, rychlost: 104, poskozeni: 6, xp: 2, polomer: 10 },
  ledovy_duch: { hp: 24, rychlost: 70, poskozeni: 8, xp: 2, polomer: 10, duch: true },
  // Ohnivý brouk (Sopka): rychlý a slabý, jeho kousnutí pálí (oranžové číslo). Žába (Bažina) skáče (SKOK_ZABY).
  ohnivy_brouk: { hp: 12, rychlost: 78, poskozeni: 6, xp: 1, polomer: 9, ohen: true },
  zaba: { hp: 14, rychlost: 72, poskozeni: 6, xp: 2, polomer: 9, skace: true },
  // Louka: včela slabá a rychlá, králík skáče, had po smrti nechá jedový oblak, strašák je pomalý, tuhý a hází kameny.
  vcela: { hp: 8, rychlost: 80, poskozeni: 4, xp: 1, polomer: 8 },
  kralik: { hp: 16, rychlost: 64, poskozeni: 6, xp: 2, polomer: 9, skace: true },
  had: { hp: 28, rychlost: 46, poskozeni: 8, xp: 3, polomer: 11, jed: true },
  strasak: { hp: 64, rychlost: 46, poskozeni: 12, xp: 3, polomer: 12 },
  // Jeskyně: permoník skáče s krumpáčem, krystalník je tuhý a hází krystalové střepy, macarát je rychlý a slabý,
  // jedová stonožka po smrti nechá jedový oblak.
  permonik: { hp: 30, rychlost: 46, poskozeni: 10, xp: 2, polomer: 11 },
  krystalnik: { hp: 60, rychlost: 54, poskozeni: 14, xp: 3, polomer: 12 },
  macarat: { hp: 20, rychlost: 78, poskozeni: 7, xp: 2, polomer: 10 },
  stonozka: { hp: 30, rychlost: 40, poskozeni: 8, xp: 3, polomer: 11, jed: true },
  // Zamrzlé jezero: vločka je drobná a rychlá, lední medvěd skáče, sněhulák hází sněhové koule, mrož je pomalý
  // a tuhý.
  vlocka: { hp: 10, rychlost: 72, poskozeni: 5, xp: 1, polomer: 10 },
  ledni_medved: { hp: 32, rychlost: 44, poskozeni: 10, xp: 2, polomer: 12 },
  snehulak: { hp: 60, rychlost: 56, poskozeni: 14, xp: 3, polomer: 12 },
  mroz: { hp: 44, rychlost: 40, poskozeni: 12, xp: 3, polomer: 13 },
  // Sopka: ohnivá můra je drobná a rychlá, salamandr skáče, čedičový golem hází magma, čertík je rychlý a křehký.
  // Všichni pálí (oranžové číslo).
  ohniva_mura: { hp: 10, rychlost: 72, poskozeni: 5, xp: 1, polomer: 10, ohen: true },
  salamandr: { hp: 32, rychlost: 42, poskozeni: 10, xp: 2, polomer: 12, ohen: true },
  golem: { hp: 60, rychlost: 56, poskozeni: 14, xp: 3, polomer: 11, ohen: true },
  certik: { hp: 10, rychlost: 100, poskozeni: 5, xp: 2, polomer: 9, ohen: true },
  // Bažina: komár je drobný a rychlý, kajman skáče z bahna, vodník je tuhý a hází hrnečky s dušičkami.
  komar: { hp: 10, rychlost: 72, poskozeni: 5, xp: 1, polomer: 10 },
  kajman: { hp: 32, rychlost: 42, poskozeni: 10, xp: 2, polomer: 12 },
  vodnik: { hp: 48, rychlost: 52, poskozeni: 12, xp: 3, polomer: 12 },
  pavoucek: { hp: 8, rychlost: 92, poskozeni: 3, xp: 1, polomer: 7, sit: true },
  strazce: { hp: 320, rychlost: 48, poskozeni: 22, xp: 25, polomer: 22, boss: true },
  matka: { hp: 280, rychlost: 54, poskozeni: 16, xp: 25, polomer: 22, boss: true },
  obr: { hp: 420, rychlost: 34, poskozeni: 26, xp: 30, polomer: 24, boss: true },
  bludicka: { hp: 240, rychlost: 40, poskozeni: 12, xp: 25, polomer: 18, boss: true },
  lavovy_obr: { hp: 440, rychlost: 34, poskozeni: 28, xp: 30, polomer: 24, boss: true },
  bahenni_bludicka: { hp: 250, rychlost: 42, poskozeni: 12, xp: 25, polomer: 18, boss: true },
  kosteny_kral: { hp: 340, rychlost: 48, poskozeni: 22, xp: 25, polomer: 22, boss: true },
};
export const RYCHLOST_NEPRATEL = Object.fromEntries(Object.entries(NEPRATELE).map(([id, v]) => [id, v.rychlost]));
// Kdo na mapě přiletí místo ducha nad MAX_DUCHU (netopýr, když na mapě chodí, jinak první druh, který není duch).
export const NAHRADA_DUCHA = Object.fromEntries(PORADI_MAP.map((id) => {
  const druhy = MAPY[id].nepratele.map((d) => d.druh).filter((d) => !NEPRATELE[d].duch);
  return [id, druhy.includes('netopyr') ? 'netopyr' : druhy[0] ?? 'netopyr'];
}));

// Schopnosti obyčejných nepřátel: stejná pravidla jako u bossů (varování, pak provedení, pauza s mezi nimi), jen
// menší. Kostlivec hází kost (Hod): dopadne kousek před hrdinu tam, kam běží (predstih), stojícímu přesně pod nohy,
// takže stojícího trefí vždy a kdo kličkuje, ten uteče. Slizák skáče (Skok): přikrčí se, zamíří na místo, kde hrdina je, a dopadne tam (kruh na zemi je
// vidět celou dobu). Elita k tomu dostane nápor (výpad elity) a svoje schopnosti silnější (ELITNI): víc kostí do
// rozptylu, větší dopad skoku, kratší pauza. Kdo je omráčený, držený, zapředený nebo odhozený, nic nezačne
// (a rozběhnuté varování se mu přeruší). Schopnosti zkoušejí až od OBYCEJNE.od s hry (začátek je na rozkoukání)
// a všichni dohromady jen tolik, kolik dovolí příděl: kostí za sekundu kosti + kostiRust za každou minutu, skoků
// skoky + skokyRust (s časem útočí čím dál víc), našetřit se dá nejvýš zasoba. Víc by člověk nestihl sledovat.
export const SCHOPNOSTI_NEPRATEL = {
  kostlivec: {
    pauza: 3.2,
    schopnosti: [{ id: 'hod', zvuk: 'hodKosti', varovani: 0.45, dosah: 330, strela: 'kost', pocet: [1, 1], let: 0.8, polomer: 22, poskozeni: 3, rozptyl: 0, predstih: 0.7 }],
  },
  slizak: {
    pauza: 3.6,
    schopnosti: [{ id: 'skok', varovani: 0.55, dosah: 240 }],
  },
  // Strašák (Louka) hází kameny jako kostlivec kosti: kdo stojí na místě, toho trefí.
  strasak: {
    pauza: 3.6,
    schopnosti: [{ id: 'hod', zvuk: 'hodKosti', varovani: 0.5, dosah: 330, strela: 'kamen', pocet: [1, 1], let: 0.8, polomer: 22, poskozeni: 3, rozptyl: 0, predstih: 0.7 }],
  },
  // Jeskyně: permoník skočí jako slizák a krumpáč při dopadu zajiskří (dopad), krystalník hází střepy jako
  // kostlivec kosti.
  permonik: {
    pauza: 3.6,
    schopnosti: [{ id: 'skok', varovani: 0.55, dosah: 240, dopad: 'kamen' }],
  },
  krystalnik: {
    pauza: 3.4,
    schopnosti: [{ id: 'hod', zvuk: 'hodKosti', varovani: 0.45, dosah: 330, strela: 'stepek', pocet: [1, 1], let: 0.8, polomer: 22, poskozeni: 3, rozptyl: 0, predstih: 0.7 }],
  },
  // Zamrzlé jezero: lední medvěd skočí jako slizák a dopadne do sněhu, sněhulák hází sněhové koule.
  ledni_medved: {
    pauza: 3.6,
    schopnosti: [{ id: 'skok', varovani: 0.55, dosah: 240, dopad: 'snezka' }],
  },
  snehulak: {
    pauza: 3.4,
    schopnosti: [{ id: 'hod', zvuk: 'hodKosti', varovani: 0.45, dosah: 330, strela: 'snezka', pocet: [1, 1], let: 0.8, polomer: 22, poskozeni: 3, rozptyl: 0, predstih: 0.7 }],
  },
  // Sopka: salamandr skočí jako slizák a dopadne v gejzíru magmatu, golem hází hroudy magmatu jako kostlivec kosti.
  salamandr: {
    pauza: 3.6,
    schopnosti: [{ id: 'skok', varovani: 0.55, dosah: 240, dopad: 'magma' }],
  },
  golem: {
    pauza: 3.4,
    schopnosti: [{ id: 'hod', zvuk: 'hodKosti', varovani: 0.45, dosah: 330, strela: 'magma', pocet: [1, 1], let: 0.8, polomer: 22, poskozeni: 3, rozptyl: 0, predstih: 0.7 }],
  },
  // Bažina: kajman skočí jako slizák a dopadne do bahna, vodník hází hrnečky jako kostlivec kosti.
  kajman: {
    pauza: 3.6,
    schopnosti: [{ id: 'skok', varovani: 0.55, dosah: 240, dopad: 'blato' }],
  },
  vodnik: {
    pauza: 3.4,
    schopnosti: [{ id: 'hod', zvuk: 'hodKosti', varovani: 0.45, dosah: 330, strela: 'hrnicek', pocet: [1, 1], let: 0.8, polomer: 22, poskozeni: 3, rozptyl: 0, predstih: 0.7 }],
  },
};
export const NAPOR_ELITY = { id: 'vypad', zvuk: 'napor', varovani: 0.7, zamek: 0.25, dosah: 340, rychlost: 430, delka: 320, poskozeni: 12, odhozeni: 50 };
export const ELITNI = { pauza: 0.75, pauzaBezSchopnosti: 3.6, kosti: [3, 3], rozptylKosti: 44, skok: 1.4 };
export const PRVNI_SCHOPNOST_NEPRATEL = 1.2;
export const OBYCEJNE = { od: 120, kosti: 0.04, kostiRust: 0.045, skoky: 0.04, skokyRust: 0.05, zasoba: 2 };
// Schopnosti nepřítele daného druhu (elita = jako elita), data ze SCHOPNOSTI a přes ně co má nepřítel jinak.
const SCHOPNOSTI_NEPRATEL_CACHE = new Map();
export function schopnostiNepritele(druh, elita = false) {
  const klic = `${druh}${elita ? '*' : ''}`;
  if (SCHOPNOSTI_NEPRATEL_CACHE.has(klic)) return SCHOPNOSTI_NEPRATEL_CACHE.get(klic);
  const vlastni = SCHOPNOSTI_NEPRATEL[druh]?.schopnosti ?? [];
  const seznam = [...vlastni.map((s) => {
    const elitni = !elita ? {} : s.id === 'hod' ? { pocet: ELITNI.kosti, rozptyl: ELITNI.rozptylKosti }
      : s.id === 'skok' ? { polomer: SCHOPNOSTI.skok.polomer * ELITNI.skok } : {};
    return schopnostSeJmenem({ ...SCHOPNOSTI[s.id], ...s, ...elitni }, s.id);
  }), ...(elita ? [schopnostSeJmenem({ ...SCHOPNOSTI.vypad, ...NAPOR_ELITY }, 'vypad')] : [])];
  SCHOPNOSTI_NEPRATEL_CACHE.set(klic, seznam);
  return seznam;
}
export function pauzaNepritele(n) {
  const vlastni = SCHOPNOSTI_NEPRATEL[n.druh]?.pauza;
  if (!n.elita) return vlastni ?? 3.5;
  return vlastni ? vlastni * ELITNI.pauza : ELITNI.pauzaBezSchopnosti;
}
// Příděl kostí a skoků obyčejných nepřátel (OBYCEJNE): každou sekundu přibude podle minuty hry.
const PRIDEL = { hod: ['kosti', 'kostiRust'], skok: ['skoky', 'skokyRust'] };
function pridelSchopnosti(hra, dt) {
  const o = OBYCEJNE;
  const min = hra.cas / 60;
  for (const [id, [zaklad, rust]] of Object.entries(PRIDEL)) {
    hra.pridel[id] = Math.min(o.zasoba, hra.pridel[id] + (o[zaklad] + o[rust] * min) * dt);
  }
}

// Podíl trvalých vylepšení: duše v koupených úrovních / cena celého stromu (0 = žádné, 1 = všechno na maximu).
// Podle duší, ne podle počtu úrovní: klíčový uzel na konci větve je jedna úroveň, ale stojí a dává jako deset.
export function podilTrvalych(vylepseni) {
  return CENA_STROMU > 0 ? utraceno(vylepseni) / CENA_STROMU : 0;
}

// Klíčové uzly stromu (src/duse.js) s vlastním pravidlem. Bludný krok: po ráně hrdina na trvani s zmizí (jako
// s Bludným plamenem z výbavy, ten má přednost), nejvýš jednou za pauza s. Arzenál: druhá zbraň na začátku je
// zbraň další postavy v pořadí TRIDY. Poutník: bahno nezpomalí, led neklouže a láva pálí × lava.
export const BLUDNY_KROK = { trvani: 1, pauza: 10 };
// Bublina: Štít bez pasivy se dobije za dobiti s (Rychlé dobití ho zkrátí), s pasivou platí dobíjení pasivy.
export const BUBLINA = { dobiti: 30 };
// Poslední vzdor: Oživení vrátí hrdinu s plnými životy a na nezranitelny s nezranitelného.
export const POSLEDNI_VZDOR = { nezranitelny: 5 };
export const POUTNIK = { lava: 0.5 };
export function zbranArzenalu(trida) {
  const poradi = Object.keys(TRIDY);
  return TRIDY[poradi[(poradi.indexOf(trida) + 1) % poradi.length]].zbran;
}
// Štít je kolem hrdiny s pasivou Štít nebo s trvalou Bublinou.
export function maStit(hra) {
  return hra.pasivy?.stit > 0 || hra.hrdina?.bublina > 0;
}
// Za kolik sekund se štít dobije: s pasivou podle dobitiStitu, jen s Bublinou za BUBLINA.dobiti (o to, co ubere
// Rychlé dobití, dřív), nikdy rychleji než MIN_DOBITI_STITU.
export function dobitiStitu(hra) {
  const { hrdina } = hra;
  const dobiti = hra.pasivy?.stit > 0 ? hrdina.dobitiStitu : BUBLINA.dobiti + hrdina.dobitiStitu - (DOBITI_STITU + UBYTEK_STITU);
  return Math.max(MIN_DOBITI_STITU, dobiti);
}

// vylepseni: trvalá vylepšení z menu ({ id: úroveň }), bez nich je hra stejná jako dřív.
// idMapy: kde se hraje (mapy.js), neznámá mapa = Louka.
// pet: aktivní pet z vajec ({ druh, rarita, uroven }, pety.js), bez něj (null) je hra stejná jako dřív.
export function novaHra(rng, idTridy = VYCHOZI_TRIDA, vylepseni = {}, idMapy = VYCHOZI_MAPA, pet = null) {
  const trida = platnaTrida(idTridy);
  const mapa = platnaMapa(idMapy);
  const hrdina = {
    x: 0, y: 0, hp: 100, maxHp: 100, rychlost: 110, magnet: 64, nabijeni: 1,
    sila: 1, uroven: 1, xp: 0, potreba: potrebaNaUroven(1), nezranitelny: 0, otoceny: 1, sit: 0,
    stesti: 1, zkusenosti: 1, oziveni: 0, vx: 0, vy: 0, odhozen: 0, odhozVx: 0, odhozVy: 0,
    // zbroj = kolik ubere z každé rány (jen z výbavy), neviditelny = jak dlouho ještě je zmizelý (Bludný plamen),
    // doZmizeni = za jak dlouho může zmizet znovu, zmizelX/Y = kde ho nepřátelé viděli naposledy,
    // naLedu = stojí teď na ledu (klouže), plocha = na jaké zvláštní ploše stojí ('led', 'lava', 'bahno', null),
    // strana = kudy naposledy obcházel překážku (1 / −1)
    zbroj: 0, neviditelny: 0, doZmizeni: 0, zmizelX: 0, zmizelY: 0, naLedu: false, plocha: null, strana: 1,
    // Pasivy pro zbraně: krit a ozvena = šance (0–1), rozpeti a vydrz = násobky, prival = kusů navíc.
    krit: 0, rozpeti: 1, ozvena: 0, vydrz: 1, prival: 0,
    // Pasivy pro přežití: pancir = kolik ubere Zbroj z každé rány nepřátel, regenerace = životů za sekundu,
    // stestiKoristi = násobek šance na srdce a magnet ze Štěstí (pasiva), naRegeneraci = vyléčeno, ale ještě
    // neukázáno číslem, doCislaRegenerace = za jak dlouho vyskočí další zelené číslo.
    pancir: 0, regenerace: 0, stestiKoristi: 1, naRegeneraci: 0, doCislaRegenerace: 0,
    // Pasivy II: upiri = šance na život za zabití, doSani = za jak dlouho smí Upíří zub léčit znovu,
    // trnovaZbroj = kolik rány se vrátí útočníkovi (1 = celá), dobitiStitu = za kolik sekund se štít dobije (bez
    // pasivy o úroveň víc, první úroveň ho zapne přesně na DOBITI_STITU), doStitu = za jak dlouho bude hotový,
    // stitHotov = bublina je kolem hrdiny, chamtivost = násobek duší za hru.
    upiri: 0, doSani: 0, trnovaZbroj: 0, dobitiStitu: DOBITI_STITU + UBYTEK_STITU, doStitu: 0, stitHotov: false, chamtivost: 1,
    // Obklíčení: stani = jak dlouho už stojí na místě, obkliceni = 0..1 (OBKLICENI).
    // silaObkliceni = obklíčení × jak silné je v tuhle chvíli hry (silaObkliceni), podle toho rostou rány.
    stani: 0, obkliceni: 0, silaObkliceni: 0,
    // Ze stromu trvalých vylepšení (src/duse.js), bez nich nic nemění: kritNavic = o kolik víc bolí kritický
    // zásah (k NASOBEK_KRITU), popravci = pod jakým podílem životů obyčejný nepřítel po zásahu padne, stestiKaret =
    // násobek šance na vzácnější karty (jen karty, ne srdce), startUrovne = o kolik úrovní výš začíná startovní
    // zbraň, arzenal = začne i se zbraní další postavy, poRane = násobek chvíle bez zranění po ráně, brodeni /
    // ostruhy = o kolik méně zpomalí bahno / klouže led (0–1), odolnostLave / odolnostJedu = o kolik méně pálí láva /
    // jedové oblaky, poutnik = klíčový uzel Poutník, bludnyKrok = Bludný krok, bublina = Štít bez pasivy, posledniVzdor =
    // Poslední vzdor (Oživení s plnými životy),
    // leceniSrdce = násobek léčení ze srdce, sleva = o kolik levněji prodává kupec, bourka = po kolika sekundách se
    // slétnou všechny krystaly (0 = nikdy), mistrPostavy = o kolik je výhoda postavy větší, silaNaBosse /
    // silaNaElity = násobek poškození bossům / elitám, trofeje = o kolik zesílí každý zabitý boss.
    kritNavic: 0, popravci: 0, stestiKaret: 1, startUrovne: 0, arzenal: 0, poRane: 1, brodeni: 0, ostruhy: 0,
    odolnostLave: 0, odolnostJedu: 0, poutnik: 0, bludnyKrok: 0, bublina: 0, posledniVzdor: 0, leceniSrdce: 1, sleva: 0, bourka: 0,
    mistrPostavy: 0, silaNaBosse: 1, silaNaElity: 1, trofeje: 0,
  };
  // Výhoda postavy (s Mistrem postavy o jeho díl větší), pak trvalá vylepšení.
  const mistr = soucetEfektu(vylepseni, 'mistrPostavy');
  for (const [vlastnost, nasobek] of Object.entries(TRIDY[trida].nasobky)) {
    hrdina[vlastnost] *= mistr > 0 ? 1 + (nasobek - 1) * (1 + mistr) : nasobek;
  }
  pouzijVylepseni(hrdina, vylepseni, trida);
  const zvire = platnyPet(pet);
  if (zvire) pouzijPeta(hrdina, zvire);
  hrdina.hp = hrdina.maxHp;
  const podilVylepseni = podilTrvalych(vylepseni);
  const navic = navicHre(vylepseni);
  const zbrane = { [TRIDY[trida].zbran]: { uroven: 1 + Math.max(0, Math.floor(hrdina.startUrovne)), nabiti: 0 } };
  if (hrdina.arzenal > 0) zbrane[zbranArzenalu(trida)] ??= { uroven: 1, nabiti: 0 };
  return {
    rng,
    trida,
    mapa,
    cas: 0,
    zabito: 0,
    zabitoBossu: 0,
    oziveno: 0,
    zablesk: 0,
    konec: false,
    volby: null,
    zTruhly: false,
    truhlaOd: null,
    hrdina,
    zbrane,
    pasivy: {},
    nepratele: [],
    strely: [],
    krystaly: [],
    predmety: [],
    cisla: [],
    prahSilneho: PRAH_NA_ZACATKU,
    blesky: [],
    castice: [],
    oblaky: [],
    // Jedové bubliny v bahně (bažina): rostou varovani s, pak prasknou v oblak. popaleno = kolikrát pálila láva.
    bubliny: [],
    doBubliny: MAPY[mapa].bubliny?.kazdych ?? null,
    bublin: 0,
    popaleno: 0,
    vlny: [],
    kameny: [],
    strelyBossu: [],
    dopady: [],
    // kolikrát hrdinu trefila která schopnost bossů (pomocnik = dotyk vyvolaného pomocníka) a kolikrát která začala
    zasahyBossu: { dupnuti: 0, hod: 0, vypad: 0, vejir: 0, pomocnik: 0 },
    schopnostiPouzito: {},
    bedny: [],
    doBedny: PRVNI_BEDNA,
    beden: 0,
    rozbitoBeden: 0,
    zBeden: Object.fromEntries(Object.keys(KORIST_BEDEN).map((id) => [id, 0])),
    zlataky: navic.zlataky ?? 0,
    bomb: 0,
    vybuch: 0,
    tres: 0,
    uhelKrumpacu: 0,
    uhelZrcadel: 0,
    trny: [],
    odlesky: [],
    odrazeno: 0,
    odhozeno: 0,
    // Světlušky (roj) a ledové zóny Mrazivého krystalu, roztristeni = prstence po roztříštění zóny.
    // zasahuSvetluskami, zon a roztristeno jsou počítadla pro simulaci.
    svetlusky: [],
    ledoveZony: [],
    roztristeni: [],
    zasahuSvetluskami: 0,
    zon: 0,
    roztristeno: 0,
    // Zvon hlubin: vlnyZvonu = běžící zvukové vlny, zvoneni = kolik je za sebou zvonění (pro zvuk a kyv zvonu),
    // kyvZvonu = jak dlouho se ještě zvon kývá. Cep: koule na řetězech. Semínka: semínka a z nich keře,
    // vybuchySeminek = záblesky výbuchů. omraceno, zasahuCepem a vybuchlo jsou počítadla pro simulaci.
    vlnyZvonu: [],
    zvoneni: 0,
    kyvZvonu: 0,
    omraceno: 0,
    koule: [],
    zasahuCepem: 0,
    seminka: [],
    vybuchySeminek: [],
    vybuchlo: 0,
    zaseto: 0,
    // Kořeny (běžící pod zemí i vyražené), plameny Ohnivé stopy (posledniPlamen = ten pod nohama, od kterého se
    // měří rozestup), kameny praku v letu a padleKameny = kameny, které právě dopadají na zem. drzeno, zapaleno,
    // plamenu, vystreleno, zasahuKamenem, odrazu a odSkal jsou počítadla pro simulaci.
    korene: [],
    drzeno: 0,
    plameny: [],
    posledniPlamen: null,
    smerStopy: null,
    plamenu: 0,
    zapaleno: 0,
    paleniStopou: 0,
    oblazky: [],
    padleKameny: [],
    vystreleno: 0,
    zasahuKamenem: 0,
    odrazu: 0,
    odSkal: 0,
    // Pasivy: losuPasiv = počítadlo losů kritických zásahů a ozvěn (losPasiv), ozvenyZasahu = zásahy, které
    // ještě jednou dopadnou, dozvuky = kroužky na místě ozvěny (jen na pohled), uhelUhliku = kde krouží uhlíky
    // lucerny. kritu, zasahuUhliky, ozvenVystrelu, ozvenZasahu a otreseno jsou počítadla pro simulaci.
    losuPasiv: 0,
    ozvenyZasahu: [],
    dozvuky: [],
    uhelUhliku: 0,
    kritu: 0,
    zasahuUhliky: 0,
    ozvenVystrelu: 0,
    ozvenZasahu: 0,
    otreseno: 0,
    // Pasivy pro přežití (počítadla pro simulaci): ubranoZbroji = kolik poškození Zbroj zastavila,
    // zbrojiZasahu = kolik ran zmenšila, vylecenoRegeneraci = kolik životů vrátila Regenerace.
    ubranoZbroji: 0,
    zbrojiZasahu: 0,
    vylecenoRegeneraci: 0,
    // Pasivy II: kapky = krev, která letí od padlého ke hrdinovi (Upíří zub), cisloSani = růžové číslo, ke kterému
    // se sání přičítá, ostny = jak dlouho ještě trčí z hrdiny trny (Trnová zbroj vrátila ránu), prasklStit = jak
    // dlouho se ještě rozbíhá prasklá bublina (jen na pohled). Počítadla pro simulaci: sani a vylecenoSanim (kolikrát
    // a kolik vrátil Upíří zub), odvetTrnu a vracenoTrny (kolikrát a kolik vrátila Trnová zbroj), zablokovano
    // a ubranoStitem (kolik ran a jak velkých zastavil Štít), stituDobito (kolikrát se bublina dobila).
    kapky: [],
    cisloSani: null,
    ostny: 0,
    prasklStit: 0,
    sani: 0,
    vylecenoSanim: 0,
    odvetTrnu: 0,
    vracenoTrny: 0,
    zablokovano: 0,
    ubranoStitem: 0,
    stituDobito: 0,
    doSpawnu: 0,
    dalsiBoss: BOSS_KAZDYCH,
    bossu: 0,
    rozprsku: 0,
    // null = na téhle mapě smečky nechodí
    dalsiSmecka: MAPY[mapa].smecky?.od ?? null,
    smecek: 0,
    dalsiPrichod: 0,
    oznameni: null,
    // hrozba = úroveň nahoře, hlaseniHrozby = krátké ohlášení po zvýšení, doElity = kolik už se našetřilo
    // šance na elitu (při 1 přijde elita, bez losu z rng, ať se náhoda vln neposune)
    hrozba: 1,
    hlaseniHrozby: null,
    doElity: 0,
    elit: 0,
    // Přizpůsobení hrozby (PRIZPUSOBENI): naskok = o kolik minut je hrozba dál než čas, podilVylepseni = 0..1 ze
    // trvalých vylepšení, soucetPoskozeni = poškození zbraní za poslední okno s (pro převahu).
    podilVylepseni,
    naskok: 0,
    soucetPoskozeni: 0,
    // Přehled poškození v pauze: rany = zdroj → { celkem, zabiti, od, kose, sekundy } (pripisRanu), ziskano = kdy
    // hrdina dostal kterou zbraň (startovní chybí = od 0).
    rany: {},
    ziskano: {},
    // Obklíčení: doKruhu = za jak dlouho obklíčí plně obklíčeného hrdinu další kruh, kruhu a obkliceno = počítadla.
    doKruhu: OBKLICENI.kruhPrvni,
    kruhu: 0,
    obkliceno: 0,
    // Schopnosti obyčejných nepřátel: kolikrát která začala a kolikrát hrdinu trefila.
    schopnostiNepratel: {},
    zasahyNepratel: { hod: 0, skok: 0, vypad: 0 },
    // příděl kostí a skoků obyčejných nepřátel (OBYCEJNE), kolik jich teď smí začít
    pridel: { hod: 0, skok: 0 },
    // Kolik životů hrdinovi ubralo co (dotyk, schopnost obyčejných nepřátel, boss, jed, láva), pro simulaci.
    ranyZ: { dotyk: 0, schopnost: 0, boss: 0, jed: 0, lava: 0 },
    // Výbava bossů: vystroj = co má hrdina v kterém slotu, ucinekVystroje = co mu to právě dává (už promítnuté
    // do vlastností hrdiny), nalezy = kusy z truhel v pořadí nálezu, otevira = truhla, která se právě otevírá,
    // porovnani = nový kus do obsazeného slotu čeká na Vzít / Nechat, truhlaKus = kus z poslední truhly, který
    // se rovnou nasadil (ukáže ho okno karet). vlnyHrdiny a doSite patří efektům sad.
    vystroj: Object.fromEntries(PORADI_SLOTU.map((slot) => [slot, null])),
    ucinekVystroje: ucinekVystroje({}),
    nalezy: [],
    otevira: null,
    porovnani: null,
    truhlaKus: null,
    rozlozeno: 0,
    zlatakyZVybavy: 0,
    vlnyHrdiny: [],
    doVlnyHrdiny: 0,
    doSite: 0,
    efektyPouzito: { vlna: 0, sit: 0, kuze: 0, zmizeni: 0 },
    // Zlaťáky: zlatakyZ = odkud přišly (sebrané), mesec = kolik jich ještě můžou pustit nepřátelé (MESEC),
    // utraceno = za co šly, nakupy = kolik čeho koupil u kupce.
    // klice = klíče na zamčené truhly, prehozeniZdarma = přehození karet od kupce, prehozeno = kolikrát přehodil
    // za zlaťáky (podle toho roste cena). kupec = vůz na louce (null = není), obchod = okno obchodu je otevřené
    // (svět stojí), posledniNakup = co dal poslední nákup (ukáže okno obchodu).
    zlatakyZ: { bedny: 0, nepratele: 0, elity: 0, vybava: 0, pet: 0 },
    mesec: MESEC.strop,
    utraceno: { kupec: 0, prehozeni: 0, zamcene: 0 },
    nakupy: Object.fromEntries(PORADI_ZBOZI.map((id) => [id, 0])),
    klice: navic.klice ?? 0,
    prehozeniZdarma: navic.prehozeniZdarma ?? 0,
    prehozeno: 0,
    prehozeniCelkem: 0,
    kupec: null,
    dalsiKupec: KUPEC.prvni,
    kupcu: 0,
    obchod: false,
    posledniNakup: null,
    // Zamčené truhly na louce, odemceno = čím se otevřela ta, z které je právě volba karet ('klic' / 'zlato').
    zamcene: [],
    doZamcene: PRVNI_ZAMCENA,
    zamcenych: 0,
    otevrenoZamcenych: { klic: 0, zlato: 0 },
    odemceno: null,
    // Klíčové uzly stromu: doBourky = za jak dlouho se slétnou krystaly (Magnetická bouře), počítadla pro
    // simulaci: popraveno (Popravčí), bourek, trofeji (zabití bossové s Trofejemi), bludnychKroku.
    doBourky: hrdina.bourka,
    popraveno: 0,
    bourek: 0,
    trofeji: 0,
    bludnychKroku: 0,
    // Pet z vajec (petHrdiny, null = bez peta). vajec = vejce sebraná v téhle hře (menu je připíše do profilu),
    // vajecPadlo = kolik jich nechali bossové, padloSrdci = kolik srdcí pustili nepřátelé (Beruška tím bliká).
    pet: zvire ? novyPet(zvire) : null,
    vajec: 0,
    vajecPadlo: 0,
    padloSrdci: 0,
    // Zvuky pro prohlížeč: co se od posledního snímku stalo (id → { pocet, sila }), viz zvuk().
    zvuky: {},
  };
}

// ---------- Pet z vajec (src/pety.js) ----------
// Pet běží (letící pet letí) kousek za hrdinou, na straně, kam se hrdina nedívá: odstup px za ním a letící nad px
// výš. Dohání ho plynule (rychlost = jak rychle se rozdíl zmenší), a kdo zůstal dál než skok px (odhození, útěk),
// skočí rovnou k hrdinovi. Pety s akcí (PETY[].akce) něco dělají každých intervalPetu s (AKCE_PETU), když to zrovna
// nejde (žádný nepřítel v dosahu), čekají nabití. Ostatní dávají trvalý bonus (pouzijPeta v novaHra) a nad hlavou
// jim na zablesk s vyskočí ikona bonusu, když bonus zrovna zabral (SPOUSTECE_PETU), nejvýš jednou za mezera s.
// Dráčkův oheň letí rychlostí ohen px/s za cílem, Straka letí pro krystal rychlostí let px/s, mrazivý kruh
// Tučňáka je vidět kruh s.
export const PET = { odstup: 24, nad: 14, rychlost: 7, skok: 420, let: 460, ohen: 340, zablesk: 0.9, mezera: 2.5, kruh: 0.45 };

function novyPet(zvire) {
  const sila = silaPetu(zvire.rarita, zvire.uroven);
  const interval = intervalPetu(zvire.druh, sila);
  return {
    ...zvire, sila, interval, x: -PET.odstup, y: -PET.nad, otoceny: 1,
    // doAkce = za jak dlouho pet zase něco udělá (Želvička začíná s hotovým krunýřem), let = krystal, pro který
    // Straka letí, stitHotov = krunýř Želvičky je připravený, ohne = Dráčkův oheň v letu, kruhy = mráz Tučňáka,
    // zablesk = jak dlouho ještě svítí ikona nad petem, posledni = poslední stav spouštěče (SPOUSTECE_PETU).
    doAkce: zvire.druh === 'zelvicka' ? 0 : interval ?? 0,
    let: null,
    stitHotov: false,
    ohne: [],
    kruhy: [],
    zablesk: 0,
    doZablesku: 0,
    posledni: null,
    // Počítadla pro simulaci: akci = kolikrát něco udělal, zasahu a poskozeni (Dráček), doneseno (Straka),
    // zablokovano (Želvička), zlataku (Křeček), zchlazeno (Tučňák, kolik nepřátel zpomalil).
    akci: 0,
    zasahu: 0,
    poskozeni: 0,
    doneseno: 0,
    zablokovano: 0,
    zlataku: 0,
    zchlazeno: 0,
  };
}

// Co dělají pety s akcí. Vrací true, když akce proběhla (jinak pet čeká nabitý).
const AKCE_PETU = {
  // Straka letí pro nejbližší krystal za dosahem magnetu (ale do dosahu akce) a pošle ho hrdinovi.
  straka(hra, p) {
    const { hrdina } = hra;
    let nej = null;
    let nejD = Infinity;
    for (const kr of hra.krystaly) {
      if (kr.pritahovan) continue;
      const d = vzdalenost(kr, hrdina);
      if (d <= hrdina.magnet || d > PETY.straka.akce.dosah) continue;
      const odPeta = vzdalenost(kr, p);
      if (odPeta < nejD) {
        nej = kr;
        nejD = odPeta;
      }
    }
    if (!nej) return false;
    p.let = nej;
    return true;
  },
  // Dráček plivne oheň do nejbližšího viditelného nepřítele v dosahu.
  dracek(hra, p) {
    const n = nejblizsi(hra);
    if (!n || vzdalenost(n, hra.hrdina) > PETY.dracek.akce.dosah) return false;
    p.ohne.push({ x: p.x, y: p.y, cil: n, poskozeni: poskozeniPetu('dracek', p.sila), zivot: 1.5 });
    zvuk(hra, 'petOhen');
    return true;
  },
  // Želvička připraví krunýř, ten zastaví další ránu (krunyrPeta v zran). Interval běží až po ráně.
  zelvicka(hra, p) {
    p.stitHotov = true;
    return true;
  },
  // Křeček najde zlaťák, ten hned letí k hrdinovi.
  krecek(hra, p) {
    hra.predmety.push({ druh: 'zlatak', x: p.x, y: p.y, hodnota: 1, z: 'pet', pritahovan: true });
    p.zlataku += 1;
    return true;
  },
  // Tučňák zchladí (otřese) nepřátele kolem hrdiny, bosse napůl jako každý otřes. Bez nikoho v dosahu čeká.
  tucnak(hra, p) {
    const { hrdina } = hra;
    const trvani = mrazPetu('tucnak', p.sila);
    let kolik = 0;
    for (const n of hra.nepratele) {
      if (n.hp <= 0 || !viditelny(n) || vzdalenost(n, hrdina) > PETY.tucnak.akce.dosah) continue;
      otres(hra, n, trvani);
      kolik += 1;
    }
    if (!kolik) return false;
    p.zchlazeno += kolik;
    p.kruhy.push({ x: hrdina.x, y: hrdina.y, zivot: PET.kruh });
    zvuk(hra, 'mraz');
    return true;
  },
};

// Kdy bonus peta bez akce „zabral“ (ikona nad ním): číslo, které roste, když se to stalo.
const SPOUSTECE_PETU = {
  sovicka: (hra) => hra.hrdina.uroven,
  beruska: (hra) => hra.padloSrdci,
  houbicka: (hra) => Math.floor(hra.vylecenoRegeneraci / 10),
  liska: (hra) => (Math.hypot(hra.hrdina.vx, hra.hrdina.vy) > 1 ? Math.floor(hra.cas / 4) : -1),
  kocour: (hra) => hra.kritu,
  medvidek: (hra) => Math.floor(hra.zabito / 100),
  jezek: (hra) => hra.odvetTrnu,
  havran: (hra) => hra.zabitoBossu + Math.floor(hra.zabito / 200),
};

function petHrdiny(hra, dt) {
  const p = hra.pet;
  if (!p) return;
  const { hrdina } = hra;
  const druh = PETY[p.druh];
  p.zablesk = Math.max(0, p.zablesk - dt);
  p.doZablesku = Math.max(0, p.doZablesku - dt);
  if (p.let && (p.let.sebran || p.let.pritahovan)) p.let = null;
  if (p.let) {
    // Straka letí pro krystal a pošle ho hrdinovi.
    const kr = p.let;
    const d = vzdalenost(kr, p) || 1;
    const krok = Math.min(d, PET.let * dt);
    p.x += ((kr.x - p.x) / d) * krok;
    p.y += ((kr.y - p.y) / d) * krok;
    p.otoceny = kr.x >= p.x ? 1 : -1;
    if (d - krok < 10) {
      kr.pritahovan = true;
      p.doneseno += 1;
      p.let = null;
    }
  } else {
    const cilX = hrdina.x - hrdina.otoceny * PET.odstup;
    const cilY = hrdina.y - (druh.leta ? PET.nad : -4);
    if (Math.hypot(cilX - p.x, cilY - p.y) > PET.skok) {
      p.x = cilX;
      p.y = cilY;
    }
    const k = 1 - Math.exp(-PET.rychlost * dt);
    const dx = (cilX - p.x) * k;
    p.x += dx;
    p.y += (cilY - p.y) * k;
    p.otoceny = Math.abs(dx) > 30 * dt ? Math.sign(dx) : hrdina.otoceny;
  }
  if (druh.akce && !(p.druh === 'zelvicka' && p.stitHotov)) {
    p.doAkce -= dt;
    if (p.doAkce <= 0) {
      if (AKCE_PETU[p.druh](hra, p)) {
        p.doAkce = p.interval;
        p.akci += 1;
        if (p.druh !== 'zelvicka') p.zablesk = PET.zablesk;
      } else {
        p.doAkce = 0;
      }
    }
  }
  const spoustec = SPOUSTECE_PETU[p.druh];
  if (spoustec) {
    const stav = spoustec(hra);
    if (p.posledni !== null && stav > p.posledni && p.doZablesku <= 0) {
      p.zablesk = PET.zablesk;
      p.doZablesku = PET.mezera;
    }
    p.posledni = stav;
  }
  // Dráčkův oheň letí za cílem, při dotyku zasáhne (Síla a kritický zásah platí). Když cíl padne nebo se schová,
  // oheň zhasne.
  for (const o of p.ohne) {
    const n = o.cil;
    o.zivot -= dt;
    if (!(n.hp > 0) || !viditelny(n)) {
      o.zivot = 0;
      continue;
    }
    const d = vzdalenost(o, n) || 1;
    const krok = PET.ohen * dt;
    if (d <= krok + (n.polomer ?? 8)) {
      const pred = n.hp;
      zasah(hra, n, o.poskozeni, false, 'pet');
      p.zasahu += 1;
      p.poskozeni += Math.max(0, pred - n.hp);
      rozprsk(hra, n.x, n.y, 'lava', 5);
      o.zivot = 0;
    } else {
      o.x += ((n.x - o.x) / d) * krok;
      o.y += ((n.y - o.y) / d) * krok;
    }
  }
  p.ohne = p.ohne.filter((o) => o.zivot > 0);
  for (const kruh of p.kruhy) kruh.zivot -= dt;
  p.kruhy = p.kruhy.filter((kruh) => kruh.zivot > 0);
}

// Krunýř Želvičky zastaví ránu jako Štít (modré 0, chvíle bez zranění), pak se začne znovu nabíjet.
function krunyrPeta(hra, kolik) {
  const p = hra.pet;
  const { hrdina } = hra;
  p.stitHotov = false;
  p.doAkce = p.interval;
  p.zablokovano += 1;
  p.zablesk = PET.zablesk;
  hrdina.nezranitelny = 0.5;
  pridejCislo(hra, { x: hrdina.x, y: hrdina.y - 18, text: '0', hodnota: kolik, barva: 'stit' });
  zvuk(hra, 'stit');
  rozprsk(hra, hrdina.x, hrdina.y, 'krunyr', 8);
}

// Prvních pár úrovní přijde rychle, ať má hráč brzy víc zbraní; pak křivka zvolna roste.
export function potrebaNaUroven(uroven) {
  return Math.round(3 + uroven * 1.5 + (uroven * uroven) / 12);
}

function vzdalenost(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Velká čísla se zkrátí, ať se vejdou nad nepřítele: 12k, 3M.
export function kratkeCislo(h) {
  if (h < 10000) return String(h);
  if (h < 1e6) return `${Math.floor(h / 1000)}k`;
  return `${Math.floor(h / 1e6)}M`;
}

// Nové číslo nad hlavou. barva: null = zásah (bílé), 'silny', 'zraneni', 'jed', 'leceni', 'zlato', 'utrata'.
// Kreslení si z vek (trvani − zivot) spočítá, jak vysoko je a jak průhledné, smer je mírný úlet do strany.
// Zvuk pro prohlížeč: zapíše, že se ve hře stalo id (sila = číslo pro zvuk, třeba kolikátý odraz kamene).
// main.js po každém snímku zapsané přehraje (zvuk.js) a vynuluje. Nic nelosuje a na průběh hry nemá vliv,
// v simulaci jen přibývají počty.
function zvuk(hra, id, sila = 0) {
  const zvuky = hra.zvuky ?? (hra.zvuky = {});
  const z = zvuky[id];
  if (!z) zvuky[id] = { pocet: 1, sila };
  else {
    z.pocet += 1;
    if (sila > z.sila) z.sila = sila;
  }
}

function pridejCislo(hra, cislo) {
  const trvani = cislo.zivot ?? TRVANI_CISLA;
  const c = { barva: null, ...cislo, zivot: trvani, trvani, od: hra.cas, pridano: 0, smer: (hra.cisla.length % 3) - 1 };
  hra.cisla.push(c);
  while (hra.cisla.length > MAX_CISEL) hra.cisla.shift().zivot = 0;
  return c;
}

// Číslo zásahu: do stejného nepřítele se během SLUCOVANI_CISEL přičítá, pak vznikne nové.
// Každá rána posune odhad obvyklé silné rány (prahSilneho) kousek nahoru nebo dolů.
// Kritický zásah má vždy své zlaté číslo s vykřičníkem (nepřičítá se a další rány se k němu nepřičtou).
function cisloZasahu(hra, n, poskozeni, krit = false) {
  const prah = hra.prahSilneho;
  hra.prahSilneho = prah * (poskozeni > prah ? 1 + UCENI_PRAHU * (1 - PODIL_SILNYCH) : 1 - UCENI_PRAHU * PODIL_SILNYCH);
  if (krit) {
    pridejCislo(hra, { x: n.x, y: n.y - n.polomer - 4, hodnota: poskozeni, text: `${kratkeCislo(poskozeni)}!`, barva: 'krit' });
    return;
  }
  let c = n.cislo;
  if (c && c.zivot > 0 && hra.cas - c.od < SLUCOVANI_CISEL) {
    c.hodnota += poskozeni;
    c.pridano = c.trvani - c.zivot;
  } else {
    c = pridejCislo(hra, { x: n.x, y: n.y - n.polomer - 4, hodnota: poskozeni });
    n.cislo = c;
  }
  c.text = kratkeCislo(c.hodnota);
  if (c.hodnota >= hra.prahSilneho * NAD_PRAHEM) c.barva = 'silny';
}

// ---------- Poškození po zbraních (přehled v pauze, prehledPoskozeni) ----------
// Každý zásah zbraně (a peta, Trnové zbroje a rázové vlny výbavy) se připíše svému zdroji v hra.rany: celé
// poškození do živého nepřítele (stejné číslo, jaké nad ním vyskočí), zabití (rána, po které padl) a koš té
// sekundy hry. Košů je OKNO_DPS dokola, z nich je DPS za posledních OKNO_DPS s. Jen sčítání, smyčku to nezdrží.
export const OKNO_DPS = 10;
function pripisRanu(hra, zdroj, poskozeni, zabil) {
  const rany = hra.rany ?? (hra.rany = {});
  let r = rany[zdroj];
  if (!r) {
    r = { celkem: 0, zabiti: 0, od: hra.cas, kose: new Array(OKNO_DPS).fill(0), sekundy: new Array(OKNO_DPS).fill(-1) };
    rany[zdroj] = r;
  }
  const s = Math.floor(hra.cas);
  const i = s % OKNO_DPS;
  if (r.sekundy[i] !== s) {
    r.sekundy[i] = s;
    r.kose[i] = 0;
  }
  r.kose[i] += poskozeni;
  r.celkem += poskozeni;
  if (zabil) r.zabiti += 1;
}

// DPS zdroje r v čase cas: za posledních OKNO_DPS s (od = kdy hrdina zdroj dostal, kratší okno se nepočítá
// za celé) a průměr od té doby. Aspoň 1 s, ať první zásah hned po startu nedá obří číslo.
export function dpsZdroje(r, cas, od = r?.od ?? 0) {
  if (!r) return { dps: 0, prumer: 0 };
  const s = Math.floor(cas);
  let soucet = 0;
  for (let i = 0; i < OKNO_DPS; i++) if (r.sekundy[i] > s - OKNO_DPS && r.sekundy[i] <= s) soucet += r.kose[i];
  const okno = Math.max(1, cas - Math.max(s - OKNO_DPS + 1, od, 0));
  return { dps: soucet / okno, prumer: r.celkem / Math.max(1, cas - Math.max(0, od)) };
}

// Přehled poškození pro pauzu: řádek za každou zbraň, kterou hrdina má (i když ještě nic neudělala), a za pet,
// Trnovou zbroj a rázovou vlnu výbavy, když už někoho zasáhly. Seřazené podle DPS za posledních OKNO_DPS s
// (stejné DPS podle celkového poškození). Jen data, kreslí to main.js.
export function prehledPoskozeni(hra) {
  const rany = hra.rany ?? {};
  const radky = [];
  const pridej = (zdroj, druh, ikona, nazev, uroven, od) => {
    const r = rany[zdroj];
    radky.push({ zdroj, druh, ikona, nazev, uroven, ...dpsZdroje(r, hra.cas, od ?? r?.od ?? 0), celkem: r?.celkem ?? 0, zabiti: r?.zabiti ?? 0 });
  };
  for (const [id, z] of Object.entries(hra.zbrane)) {
    if (Object.hasOwn(ZBRANE, id) && z?.uroven > 0) pridej(id, 'zbran', ZBRANE[id].ikona, ZBRANE[id].nazev, z.uroven, hra.ziskano?.[id] ?? 0);
  }
  if (rany.pet && hra.pet) pridej('pet', 'pet', `pet_${hra.pet.druh}`, PETY[hra.pet.druh].nazev, hra.pet.uroven);
  if (rany.trnovaZbroj) pridej('trnovaZbroj', 'pasiva', PASIVY.trnovaZbroj.ikona, PASIVY.trnovaZbroj.nazev, hra.pasivy.trnovaZbroj ?? 0);
  if (rany.vlna) {
    const sada = PORADI_SAD.find((boss) => VYBAVA[boss].efekt === 'vlna');
    pridej('vlna', 'vystroj', idKusu(sada, 'telo'), EFEKTY_VYBAVY.vlna.nazev, null);
  }
  radky.sort((a, b) => b.dps - a.dps || b.celkem - a.celkem);
  return radky;
}

// zar = zásah žárem lucerny: nepřítel se rozzáří, jinak krátce zbělá.
// S Pavučinou (výbava Matky) se šance ze zásahů sčítá a zásah, na který připadne celá, nepřítele zapřede
// (bez losu z rng, ať se náhoda vln neposune). Kdo už v síti je, šanci nebere.
// Kritický zásah (pasiva) ránu zdvojnásobí, los je z losPasiv.
// zdroj = čí to byla rána (id zbraně, 'pet', 'trnovaZbroj', 'vlna'), připíše se do přehledu v pauze (pripisRanu).
export function zasah(hra, n, kolik, zar = false, zdroj = null) {
  const h = hra.hrdina;
  const krit = h.krit > 0 && kolik > 0 && losPasiv(hra) < h.krit;
  const proti = n.boss ? h.silaNaBosse : n.elita ? h.silaNaElity : 1;
  const poskozeni = Math.round(kolik * h.sila * (krit ? NASOBEK_KRITU + h.kritNavic : 1) * proti);
  const zil = n.hp > 0;
  // Pro převahu (přizpůsobení hrozby) se počítá celá rána, i co přeteče přes životy, jen do živého nepřítele.
  if (zil && poskozeni > 0) hra.soucetPoskozeni += poskozeni;
  n.hp -= poskozeni;
  // Popravčí (strom): obyčejný nepřítel nebo elita, kterému po zásahu zbyde málo životů, padne hned.
  if (h.popravci > 0 && poskozeni > 0 && n.hp > 0 && !n.boss && n.hp <= n.maxHp * h.popravci) {
    n.hp = 0;
    hra.popraveno += 1;
  }
  if (zdroj && zil && poskozeni > 0) pripisRanu(hra, zdroj, poskozeni, n.hp <= 0);
  if (zar) n.zar = TRVANI_ZARU;
  else n.zasazen = 0.1;
  if (krit) hra.kritu += 1;
  if (poskozeni > 0) {
    cisloZasahu(hra, n, poskozeni, krit);
    zvuk(hra, 'zasah');
  }
  const sit = hra.ucinekVystroje?.efekty.sit;
  if (sit && poskozeni > 0 && n.hp > 0 && !(n.zapreden > 0)) {
    hra.doSite += sit.sance;
    if (hra.doSite >= 1) {
      hra.doSite -= 1;
      n.zapreden = sit.trvani;
      hra.efektyPouzito.sit += 1;
    }
  }
}

// Los pro kritické zásahy a ozvěny (0 až 1): vlastní řada z počítadla, ne z rng, ať pasivy neposunou náhodu vln
// (stejné semínko = stejné vlny, ať hrdina zasahuje jakkoli). Promíchání bitů jako ve splitmix32.
function losPasiv(hra) {
  hra.losuPasiv = (hra.losuPasiv + 1) | 0;
  let t = Math.imul(hra.losuPasiv, 0x9e3779b9);
  t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
  t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
  return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
}

// Kroužek ozvěny na místě (jen na pohled).
function dozvuk(hra, x, y, velky = false) {
  hra.dozvuky.push({ x, y, velky, zivot: TRVANI_DOZVUKU });
  if (hra.dozvuky.length > MAX_DOZVUKU) hra.dozvuky.splice(0, hra.dozvuky.length - MAX_DOZVUKU);
}

// Ozvěna u výstřelu: zbraň (z = hra.zbrane[id]) s šancí hrdina.ozvena vystřelí za ZPOZDENI_OZVENY ještě jednou.
// Volá se po každém opravdovém výstřelu, ne po ozvěně (ozvěna další ozvěnu nemá).
function ozvi(hra, z) {
  const sance = hra.hrdina.ozvena;
  if (sance > 0 && !(z.ozvena > 0) && losPasiv(hra) < sance) z.ozvena = ZPOZDENI_OZVENY;
}

// Doběhne čekající ozvěna zbraně z: vystrel() vystřelí znovu (bez nabíjení) a vrátí, jestli měl na co.
function ozvenaVystrelu(hra, z, dt, vystrel) {
  if (!z || !(z.ozvena > 0)) return;
  z.ozvena -= dt;
  if (z.ozvena > 0) return;
  z.ozvena = 0;
  if (vystrel()) {
    hra.ozvenVystrelu += 1;
    dozvuk(hra, hra.hrdina.x, hra.hrdina.y, true);
  }
}

// Ozvěna u zbraní, které nestřílí (krouží, kývají se, hoří): zásah s šancí hrdina.ozvena za ZPOZDENI_OZVENY
// dopadne ještě jednou stejnou ranou.
function ozvenaZasahu(hra, n, kolik, zar = false, zdroj = null) {
  const sance = hra.hrdina.ozvena;
  if (!(sance > 0) || !(kolik > 0) || losPasiv(hra) >= sance) return;
  hra.ozvenyZasahu.push({ n, kolik, zar, zdroj, za: ZPOZDENI_OZVENY });
  if (hra.ozvenyZasahu.length > MAX_OZVEN_ZASAHU) hra.ozvenyZasahu.splice(0, hra.ozvenyZasahu.length - MAX_OZVEN_ZASAHU);
}

// Čekající ozvěny zásahů dopadnou (na živého a viditelného nepřítele), kroužky dozvuků doznívají.
function ozvenyAZvuky(hra, dt) {
  for (const o of hra.ozvenyZasahu) {
    o.za -= dt;
    if (o.za > 0) continue;
    if (o.n.hp > 0 && viditelny(o.n)) {
      zasah(hra, o.n, o.kolik, o.zar, o.zdroj);
      hra.ozvenZasahu += 1;
      dozvuk(hra, o.n.x, o.n.y);
    }
  }
  hra.ozvenyZasahu = hra.ozvenyZasahu.filter((o) => o.za > 0);
  for (const d of hra.dozvuky) d.zivot -= dt;
  hra.dozvuky = hra.dozvuky.filter((d) => d.zivot > 0);
}

// Otřes po okamžitém zásahu (Výdrž u krumpáčů, blesku a světlušek): zasažený na trvani s zpomalí.
function otres(hra, n, trvani) {
  if (!(trvani > 0) || n.hp <= 0) return;
  if (!(n.otres > 0)) hra.otreseno += 1;
  n.otres = Math.max(n.otres || 0, trvani);
}

// O kolik otřes zpomalí (bosse napůl tolik). 1 = vůbec.
function brzdaOtresu(n) {
  if (!(n.otres > 0)) return 1;
  return n.boss ? 1 - (1 - ZPOMALENI_OTRESU) / 2 : ZPOMALENI_OTRESU;
}

// Zelené +N nad hrdinou, když se opravdu léčil.
// regenerace = číslo ukazuje, co Regenerace vrátila za poslední chvíli (ne léčení v tomhle snímku).
function cisloLeceni(hra, kolik, regenerace = false) {
  const k = Math.round(kolik);
  if (k > 0) pridejCislo(hra, { x: hra.hrdina.x, y: hra.hrdina.y - 18, text: `+${k}`, hodnota: k, zivot: TRVANI_CISLA_LECENI, barva: 'leceni', regenerace });
}

// Sebrané zlaťáky: přičtou se, zapíše se odkud jsou (zlatakyZ) a nad hrdinou vyskočí zlaté +N.
function pridejZlataky(hra, kolik, odkud) {
  if (!(kolik > 0)) return;
  hra.zlataky += kolik;
  zvuk(hra, 'zlatak');
  if (Object.hasOwn(hra.zlatakyZ, odkud)) hra.zlatakyZ[odkud] += kolik;
  pridejCislo(hra, { x: hra.hrdina.x, y: hra.hrdina.y - 18, text: `+${kolik}`, hodnota: kolik, zivot: TRVANI_CISLA_LECENI, barva: 'zlato' });
}

// Utracené zlaťáky: odečtou se a zapíšou do utraceno pod za (kupec, prehozeni, zamcene). Nad hrdinou -N, jen
// když se platí přímo na louce (okna obchodu a karet ukazují cenu samy).
function zaplat(hra, kolik, za, cislo = false) {
  hra.zlataky -= kolik;
  hra.utraceno[za] += kolik;
  if (cislo && kolik > 0) pridejCislo(hra, { x: hra.hrdina.x, y: hra.hrdina.y - 18, text: `-${kolik}`, hodnota: kolik, zivot: TRVANI_CISLA_LECENI, barva: 'utrata' });
}

// Pár pixelových úlomků rozletí od zabitého nepřítele. Směry se počítají z pořadí zabití, ne z rng,
// aby ozdoby neposunuly náhodu vln (stejné semínko = stejná hra).
function rozlet(hra, n) {
  const pocet = n.boss ? 16 : 6;
  const posun = hra.zabito * 2.39;
  for (let i = 0; i < pocet; i++) {
    const uhel = posun + (i / pocet) * Math.PI * 2;
    const rychlost = (100 + ((i * 37 + hra.zabito * 11) % 80)) * (n.boss ? 1.6 : 1);
    hra.castice.push({
      x: n.x, y: n.y, vx: Math.cos(uhel) * rychlost, vy: Math.sin(uhel) * rychlost,
      zivot: ZIVOT_CASTICE, druh: n.druh, odstin: i,
    });
  }
  if (hra.castice.length > MAX_CASTIC) hra.castice.splice(0, hra.castice.length - MAX_CASTIC);
}

// Duše vrátí hrdinu do hry: půlka životů, chvíle bez zranění a nepřátelé kolem odletí kus dál.
function oziv(hra) {
  const { hrdina } = hra;
  hrdina.oziveni -= 1;
  hra.oziveno += 1;
  // Poslední vzdor (strom): s plnými životy a déle nezranitelný.
  const vzdor = hrdina.posledniVzdor > 0;
  hrdina.hp = Math.round(hrdina.maxHp * (vzdor ? 1 : ZIVOTY_PO_OZIVENI));
  hrdina.nezranitelny = vzdor ? POSLEDNI_VZDOR.nezranitelny : NEZRANITELNY_PO_OZIVENI;
  hrdina.sit = 0;
  hra.zablesk = TRVANI_ZABLESKU;
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hrdina);
    if (d >= ODHOZENI_PRI_OZIVENI) continue;
    const uhel = d > 0 ? Math.atan2(n.y - hrdina.y, n.x - hrdina.x) : 0;
    n.x = hrdina.x + Math.cos(uhel) * ODHOZENI_PRI_OZIVENI;
    n.y = hrdina.y + Math.sin(uhel) * ODHOZENI_PRI_OZIVENI;
  }
  hra.oznameni = { text: t('hra.oziveni'), zivot: 3 };
  zvuk(hra, 'oziveni');
  cisloLeceni(hra, hrdina.hp);
}

// Chvíle bez zranění po ráně (obklíčenému kratší, OBKLICENI.nezranitelnost).
export const NEZRANITELNY_PO_RANE = 0.5;
// Zranění hrdiny (dotyk nepřítele, útok bosse nebo jedový oblak): červené číslo nad ním, chvíle bez zranění,
// třes, případně konec nebo Oživení. barva 'jed' = rána z oblaku (kreslí se stejně, jen se pozná).
// Zbroj z výbavy ubere z rány svůj díl (aspoň 1 projde vždy). S Bludným plamenem hrdina po ráně zmizí.
// Zbroj (pasiva) pak ubere ještě svůj počet, jen z ran od nepřátel (odNepritele = false: láva, bahenní oblak),
// a i tak projde aspoň 1 (menší rána zůstane, jak byla).
// utocnik = kdo ránu dal (nepřítel při dotyku, boss u schopnosti), tomu Trnová zbroj vrátí podíl celé rány. Hotový
// Štít pak ránu od nepřátel zastaví celou (bez červeného čísla, třesu i Bludného plamene).
// zdroj = za co rána je (pro rozpis ranyZ v simulaci): dotyk, schopnost (obyčejných nepřátel), boss, jed, lava.
function zran(hra, kolik, barva = 'zraneni', odNepritele = true, utocnik = null, zdroj = 'dotyk') {
  const { hrdina } = hra;
  const hpPred = hrdina.hp;
  if (odNepritele && kolik > 0) {
    odvetaTrnu(hra, utocnik, kolik);
    if (hrdina.stitHotov) {
      zablokuj(hra, kolik);
      return;
    }
    if (hra.pet?.stitHotov) {
      krunyrPeta(hra, kolik);
      return;
    }
  }
  if (odNepritele && kolik > 0 && hrdina.silaObkliceni > 0) kolik = Math.round(ranaObklicenemu(hra, kolik));
  if (hrdina.zbroj > 0 && kolik > 0) kolik = Math.max(1, Math.round(kolik * (1 - hrdina.zbroj)));
  if (odNepritele && hrdina.pancir > 0 && kolik > 1) {
    const pancir = hrdina.pancir * (1 - OBKLICENI.zbroj * hrdina.silaObkliceni);
    const zbude = Math.max(1, Math.round(kolik - pancir));
    hra.ubranoZbroji += kolik - zbude;
    hra.zbrojiZasahu += 1;
    kolik = zbude;
  }
  if (kolik > 0) {
    pridejCislo(hra, { x: hrdina.x, y: hrdina.y - 18, text: `-${kolik}`, hodnota: kolik, barva });
    zvuk(hra, 'zraneni');
  }
  hrdina.hp -= kolik;
  hrdina.nezranitelny = NEZRANITELNY_PO_RANE * hrdina.poRane * (1 - OBKLICENI.nezranitelnost * hrdina.silaObkliceni);
  hra.tres = TRVANI_TRESU;
  if (hrdina.hp <= 0) {
    if (hrdina.oziveni > 0) oziv(hra);
    else {
      hra.konec = true;
      zvuk(hra, 'smrtHrdiny');
    }
  }
  const zVystroje = hra.ucinekVystroje?.efekty.zmizeni;
  const zmizeni = zVystroje ?? (hrdina.bludnyKrok > 0 ? BLUDNY_KROK : null);
  if (zmizeni && !hra.konec && hrdina.doZmizeni <= 0) {
    hrdina.neviditelny = zmizeni.trvani;
    hrdina.nezranitelny = Math.max(hrdina.nezranitelny, zmizeni.trvani);
    hrdina.doZmizeni = zmizeni.pauza;
    hrdina.zmizelX = hrdina.x;
    hrdina.zmizelY = hrdina.y;
    if (zVystroje) hra.efektyPouzito.zmizeni += 1;
    else hra.bludnychKroku += 1;
    rozprsk(hra, hrdina.x, hrdina.y, 'bludicka', 8);
  }
  if (hra.ranyZ) hra.ranyZ[zdroj] = (hra.ranyZ[zdroj] ?? 0) + Math.max(0, hpPred - Math.max(0, hrdina.hp));
}
// Za co je rána od schopnosti: od bosse (i jeho pomocníka) 'boss', od obyčejného nepřítele 'schopnost'.
function zdrojRany(n) {
  return !n || n.boss || n.pan ? 'boss' : 'schopnost';
}

// Trnová zbroj (pasiva): útočník dostane zpátky podíl rány jako zásah zbraní (Síla, kritický zásah, číslo nad ním),
// z hrdiny na chvíli vyrazí trny. Schovaného ducha ani padlého nepřítele nic nezasáhne.
export const TRVANI_OSTNU = 0.25;
function odvetaTrnu(hra, n, kolik) {
  const podil = hra.hrdina.trnovaZbroj;
  if (!(podil > 0) || !n || !(n.hp > 0) || !viditelny(n)) return;
  const pred = n.hp;
  zasah(hra, n, kolik * podil, false, 'trnovaZbroj');
  hra.odvetTrnu += 1;
  hra.vracenoTrny += pred - n.hp;
  hra.ostny = TRVANI_OSTNU;
  rozprsk(hra, n.x, n.y, 'trny', 5);
}

// Štít (pasiva) zastaví ránu: bublina praskne, nad hrdinou je modré 0 a chvíle bez zranění jako po ráně (ať ho
// dav nepřátel neprorazí hned v dalším snímku). Pak se začne dobíjet.
export const TRVANI_PRASKNUTI = 0.35;
function zablokuj(hra, kolik) {
  const { hrdina } = hra;
  hrdina.stitHotov = false;
  hrdina.doStitu = dobitiStitu(hra);
  hrdina.nezranitelny = 0.5;
  hra.zablokovano += 1;
  hra.ubranoStitem += kolik;
  hra.prasklStit = TRVANI_PRASKNUTI;
  pridejCislo(hra, { x: hrdina.x, y: hrdina.y - 18, text: '0', hodnota: kolik, barva: 'stit' });
  zvuk(hra, 'stit');
  rozprsk(hra, hrdina.x, hrdina.y, 'stit', 10);
}

// Dobíjení štítu: jen s pasivou (nebo trvalou Bublinou), bublina se nafoukne, až doběhne dobitiStitu (další
// úroveň zkrátí i rozběhnuté dobíjení), nejrychleji za MIN_DOBITI_STITU. Hned po vybrání první úrovně (a na
// začátku hry s Bublinou) je hotový.
function dobijStit(hra, dt) {
  const { hrdina } = hra;
  hra.prasklStit = Math.max(0, hra.prasklStit - dt);
  if (!maStit(hra) || hrdina.stitHotov) return;
  hrdina.doStitu = Math.min(hrdina.doStitu, dobitiStitu(hra)) - dt;
  if (hrdina.doStitu > 0) return;
  hrdina.doStitu = 0;
  hrdina.stitHotov = true;
  hra.stituDobito += 1;
}

// Upíří zub (pasiva): po zabití s šancí hrdina.upiri vrátí ZIVOT_ZA_SANI, jen když tolik chybí, a nejvýš
// SANI_ZA_SEKUNDU za sekundu. Los z losPasiv (náhoda vln se neposune). Od padlého letí kapka ke hrdinovi
// a růžové +N se do SLUCOVANI_SANI sčítá.
export const ZIVOT_ZA_SANI = 1;
export const SANI_ZA_SEKUNDU = 3;
export const LET_KAPKY = 0.35;
export const SLUCOVANI_SANI = 0.5;
const MAX_KAPEK = 24;
function sajKrev(hra, n) {
  const { hrdina } = hra;
  if (!(hrdina.upiri > 0) || hra.konec || hrdina.doSani > 0 || hrdina.hp > hrdina.maxHp - ZIVOT_ZA_SANI) return;
  if (losPasiv(hra) >= hrdina.upiri) return;
  hrdina.hp += ZIVOT_ZA_SANI;
  hrdina.doSani = 1 / SANI_ZA_SEKUNDU;
  hra.sani += 1;
  hra.vylecenoSanim += ZIVOT_ZA_SANI;
  hra.kapky.push({ odX: n.x, odY: n.y, zivot: LET_KAPKY });
  if (hra.kapky.length > MAX_KAPEK) hra.kapky.splice(0, hra.kapky.length - MAX_KAPEK);
  const c = hra.cisloSani;
  if (c && c.zivot > 0 && hra.cas - c.od < SLUCOVANI_SANI) {
    c.hodnota += ZIVOT_ZA_SANI;
    c.text = `+${c.hodnota}`;
    c.pridano = c.trvani - c.zivot;
  } else {
    hra.cisloSani = pridejCislo(hra, { x: hrdina.x, y: hrdina.y - 18, text: `+${ZIVOT_ZA_SANI}`, hodnota: ZIVOT_ZA_SANI, zivot: TRVANI_CISLA_LECENI, barva: 'sani' });
  }
}

// Regenerace (pasiva): životy přibývají plynule, zelené číslo vyskočí nejvýš jednou za CISLO_REGENERACE s
// (jinak by se nad hrdinou míhaly drobky). Na plných životech ani po konci hry nic.
export const CISLO_REGENERACE = 1.5;
function regeneruj(hra, dt) {
  const { hrdina } = hra;
  hrdina.doCislaRegenerace = Math.max(0, hrdina.doCislaRegenerace - dt);
  if (!(hrdina.regenerace > 0) || hra.konec || hrdina.hp >= hrdina.maxHp) return;
  const pred = hrdina.hp;
  hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + hrdina.regenerace * dt);
  hra.vylecenoRegeneraci += hrdina.hp - pred;
  hrdina.naRegeneraci += hrdina.hp - pred;
  if (hrdina.doCislaRegenerace <= 0 && hrdina.naRegeneraci >= 1) {
    const cele = Math.floor(hrdina.naRegeneraci);
    cisloLeceni(hra, cele, true);
    hrdina.naRegeneraci -= cele;
    hrdina.doCislaRegenerace = CISLO_REGENERACE;
  }
}

// O kolik jsou nepřátelé na mapě silnější (obtiznost v mapy.js, na Louce nic).
export function obtiznostMapy(mapa) {
  const o = MAPY[mapa]?.obtiznost;
  return { zivoty: o?.zivoty ?? 1, poskozeni: o?.poskozeni ?? 1 };
}

// Rána útokem bosse nebo jedem roste s hrozbou (i s naskokem za sílu hrdiny) a obtížností mapy stejně jako dotyk
// nepřítele.
function ranaHrozby(hra, kolik) {
  return Math.round(kolik * silaHry(hra).poskozeni * obtiznostMapy(hra.mapa).poskozeni);
}

function polomerSpawnu(sirka, vyska) {
  return Math.hypot(sirka, vyska) / 2 + 40;
}

// Místo na okraji v náhodném směru (jeden los z rng). zepredu: běžícímu hrdinovi vyleze díl NADBIHANI.zepredu
// v kuželu před ním, ostatní kdekoli (stejný los, jen jinak rozložený, ať se náhoda vln neposune).
function naOkraji(hra, sirka, vyska, zepredu = false) {
  const los = hra.rng.dalsi();
  let uhel = los * Math.PI * 2;
  const { hrdina } = hra;
  const n = NADBIHANI;
  if (zepredu && hra.cas >= n.od && Math.hypot(hrdina.vx, hrdina.vy) > hrdina.rychlost * 0.3) {
    const kam = Math.atan2(hrdina.vy, hrdina.vx);
    uhel = los < n.zepredu ? kam + (los / n.zepredu - 0.5) * n.rozptyl : ((los - n.zepredu) / (1 - n.zepredu)) * Math.PI * 2;
  }
  const r = polomerSpawnu(sirka, vyska);
  return { x: hra.hrdina.x + Math.cos(uhel) * r, y: hra.hrdina.y + Math.sin(uhel) * r };
}

// Duch si vezme směr k místu, kde hrdina je teď, a tím směrem pak letí rovně.
function zamir(n, hrdina) {
  const d = vzdalenost(n, hrdina) || 1;
  n.smerX = (hrdina.x - n.x) / d;
  n.smerY = (hrdina.y - n.y) / d;
}

// Nový nepřítel na daném místě. Životy, poškození a rychlost rostou s hrozbou (silaHrozby), elita (jen z vlny)
// má navíc ELITA a těžší mapa přidá svou obtížnost. Exportované kvůli simulaci.
export function pridejNepritele(hra, druh, x, y, elita = false) {
  const vzor = NEPRATELE[druh];
  const sila = silaHry(hra);
  const e = elita && !vzor.boss ? ELITA : null;
  const ob = obtiznostMapy(hra.mapa);
  const hp = Math.round(vzor.hp * (vzor.boss ? sila.bossZivoty : sila.zivoty) * (e ? e.zivoty : 1) * ob.zivoty);
  // trny = jak dlouho ještě je zpomalený trny, zpomaleni = na kolik, odhozen = ještě letí od zrcadla,
  // mraz a zpomaleniMrazem totéž od ledové zóny Mrazivého krystalu, omracen = jak dlouho ještě je omráčený
  // zvonem, odolny = jak dlouho ho zvon znovu neomráčí, zasahCepem = kdy ho koule cepu smí trefit znovu,
  // drzen = jak dlouho ho ještě drží kořeny (svirani = rána za tik, tikKorenu = do dalšího sevření),
  // vyrvan = jak dlouho ho kořeny znovu nechytí, hori = jak dlouho ještě hoří po vylezení z Ohnivé stopy
  // (pali = rána za tik), tikOhne = do další rány ohněm, vOhni = právě stojí v plameni (pro kreslení)
  const n = {
    druh, ...vzor, hp, maxHp: hp, zasazen: 0, zar: 0, zasahKrumpacem: 0, zasahZrcadlem: 0, trny: 0, zpomaleni: 1, odhozen: 0, x, y,
    mraz: 0, zpomaleniMrazem: 1, omracen: 0, odolny: 0, zasahCepem: 0,
    drzen: 0, svirani: 0, tikKorenu: 0, vyrvan: 0, hori: 0, pali: 0, tikOhne: 0, vOhni: false,
    poskozeni: Math.round(vzor.poskozeni * sila.poskozeni * (e ? e.poskozeni : 1) * ob.poskozeni),
    rychlost: vzor.rychlost * sila.rychlost,
  };
  if (e) Object.assign(n, { elita: true, polomer: Math.round(vzor.polomer * e.velikost), xp: vzor.xp * e.xp });
  if (n.duch) {
    n.skryty = false;
    n.duchCas = VIDITELNY_DUCH;
    zamir(n, hra.hrdina);
  }
  // Žáby nevyskočí všechny naráz: každá začne v jiném místě cyklu (podle času a počtu nepřátel).
  if (n.skace) {
    n.skokCas = (hra.cas * 1.7 + hra.nepratele.length * 0.37) % (SKOK_ZABY.pauza + SKOK_ZABY.skok);
    n.vyskok = 0;
  }
  // doSchopnosti = kolik zbývá do další schopnosti, dalsiSchopnost = kterou v pořadí zkusí, schopnost = co právě
  // dělá (null = chodí), zuri = má pod ZURIVOST životů, zjeveni = Bludička se právě objevila jinde (pro kreslení).
  if (n.boss) Object.assign(n, { doSchopnosti: PRVNI_SCHOPNOST, dalsiSchopnost: 0, schopnost: null, zuri: false, zjeveni: 0 });
  // Obyčejný nepřítel se schopností (kostlivec, slizák, každá elita) začne chvíli po příchodu, každý jindy (podle
  // počtu nepřátel, bez losu z rng).
  else if (schopnostiNepritele(druh, n.elita).length) {
    Object.assign(n, { doSchopnosti: PRVNI_SCHOPNOST_NEPRATEL + (hra.nepratele.length % 9) * 0.25, dalsiSchopnost: 0, schopnost: null });
  }
  hra.nepratele.push(n);
  return n;
}

// Druh z nabídky podle vah pro los 0..1 (stejné váhy = stejná šance pro každého, jako dřív rng.vyber).
function losujDruh(druhy, celkem, los) {
  let zbyva = los * celkem;
  for (const d of druhy) {
    zbyva -= d.vaha;
    if (zbyva < 0) return d.druh;
  }
  return druhy.at(-1).druh;
}

// Vlna z okraje: druhy podle mixu mapy, každý až od svého času. Elitou se stane ten, na koho připadne
// našetřená šance (duch ne, toho jde i tak těžko trefit).
function spawn(hra, sirka, vyska) {
  const { rng, cas } = hra;
  const sila = silaHry(hra);
  if (hra.nepratele.length >= sila.maxNepratel) return;
  const druhy = MAPY[hra.mapa].nepratele.filter((d) => d.od <= 0 || cas > d.od);
  const celkem = druhy.reduce((soucet, d) => soucet + d.vaha, 0);
  let duchu = hra.nepratele.filter((n) => n.duch).length;
  for (let i = 0; i < sila.davka; i++) {
    let druh = losujDruh(druhy, celkem, rng.dalsi());
    if (NEPRATELE[druh].duch && duchu >= MAX_DUCHU) druh = NAHRADA_DUCHA[hra.mapa] ?? 'netopyr';
    if (NEPRATELE[druh].duch) duchu += 1;
    const { x, y } = naOkraji(hra, sirka, vyska, true);
    let elita = false;
    if (!NEPRATELE[druh].duch && sila.elita > 0) {
      hra.doElity += sila.elita;
      if (hra.doElity >= 1) {
        hra.doElity -= 1;
        hra.elit += 1;
        elita = true;
        zvuk(hra, 'elita');
      }
    }
    pridejNepritele(hra, druh, x, y, elita);
  }
}

// Smečka (vlků) vyleze pohromadě na jednom místě okraje, v kroužku kolem vůdce. Přijde i při plné
// louce (obyčejné vlny ji drží na maximu), jen o pár smeček víc už ne.
function smecka(hra, sirka, vyska) {
  if (hra.nepratele.length >= silaHry(hra).maxNepratel + SMECKA_DO * 3) return;
  const { druh } = MAPY[hra.mapa].smecky;
  const pocet = hra.rng.cele(SMECKA_OD, SMECKA_DO);
  const { x, y } = naOkraji(hra, sirka, vyska);
  pridejNepritele(hra, druh, x, y);
  for (let i = 1; i < pocet; i++) {
    const uhel = (i / (pocet - 1)) * Math.PI * 2;
    pridejNepritele(hra, druh, x + Math.cos(uhel) * 22, y + Math.sin(uhel) * 22);
  }
  hra.smecek += 1;
}

// Nová bedna kousek za okrajem obrazovky v náhodném směru. Každá třetí je sud (jen jiný vzhled).
// Na místě, kde už nějaká stojí, se nová neobjeví (zkusí to zase příště).
function pridejBednu(hra, sirka, vyska) {
  const { x, y } = mimoPrekazky(hra, zaOkrajem(hra, sirka, vyska, OKRAJ_BEDEN, PASMO_BEDEN), ODSTUP_OD_PREKAZEK.bedna);
  if (hra.bedny.some((b) => Math.hypot(b.x - x, b.y - y) < POLOMER_BEDNY * 3)) return;
  hra.bedny.push({ druh: hra.beden % 3 === 2 ? 'sud' : 'bedna', x, y, rozbita: false });
  hra.beden += 1;
}

// Místo v náhodném směru od hrdiny, okraj až okraj + pasmo px za okrajem obrazovky (dva losy z rng).
function zaOkrajem(hra, sirka, vyska, okraj, pasmo) {
  const { hrdina, rng } = hra;
  const uhel = rng.dalsi() * Math.PI * 2;
  const cos = Math.cos(uhel);
  const sin = Math.sin(uhel);
  // jak daleko je to od hrdiny (středu obrazovky) k okraji obrazovky v tomhle směru
  const kOkraji = Math.min(sirka / 2 / Math.max(Math.abs(cos), 1e-9), vyska / 2 / Math.max(Math.abs(sin), 1e-9));
  const r = kOkraji + okraj + rng.dalsi() * pasmo;
  return { x: hrdina.x + cos * r, y: hrdina.y + sin * r };
}

// Místo, které by bylo v překážce, se posune kousek vedle ní (bez losu z rng, ať se náhoda nepohne).
function mimoPrekazky(hra, misto, odstup) {
  vytlacZPrekazek(hra.mapa, misto, odstup);
  return misto;
}

// Kdo vjel do překážky, vrátí se na její okraj a kus cesty, o který tím přišel, ujde podél ní, takže ji obejde.
// Na kterou stranu, podle toho, kam šel. Kdo šel přímo na střed, jde na stranu, kterou obcházel naposledy.
// Vrací směr od překážky (nebo null, když do žádné nevjel).
function obejdi(hra, o, polomer, predX, predY) {
  const pohybX = o.x - predX;
  const pohybY = o.y - predY;
  const normala = vytlacZPrekazek(hra.mapa, o, polomer);
  if (!normala) return null;
  const tlak = -(pohybX * normala.x + pohybY * normala.y);
  if (tlak > 0) {
    const tx = -normala.y;
    const ty = normala.x;
    const podel = pohybX * tx + pohybY * ty;
    if (Math.abs(podel) > tlak * 0.05) o.strana = podel > 0 ? 1 : -1;
    const strana = o.strana ?? 1;
    o.x += tx * strana * tlak;
    o.y += ty * strana * tlak;
    vytlacZPrekazek(hra.mapa, o, polomer);
  }
  return normala;
}

// Jedové bubliny v bahně: každých bubliny.kazdych s se zkusí najít místo v bahně do dosahu od hrdiny (pár losů
// z rng), tam bublina roste a po varovani s praskne v jedový oblak (nejdřív se nafukuje a nepálí jako po houbákovi).
function bublinyBahna(hra, dt) {
  const b = MAPY[hra.mapa].bubliny;
  if (!b) return;
  hra.doBubliny -= dt;
  if (hra.doBubliny <= 0) {
    hra.doBubliny += b.kazdych;
    for (let pokus = 0; pokus < 4; pokus++) {
      const uhel = hra.rng.dalsi() * Math.PI * 2;
      const r = 40 + hra.rng.dalsi() * (b.dosah - 40);
      const x = hra.hrdina.x + Math.cos(uhel) * r;
      const y = hra.hrdina.y + Math.sin(uhel) * r;
      if (naPlose(hra.mapa, x, y) !== 'bahno') continue;
      hra.bubliny.push({ x, y, zivot: b.varovani, varovani: b.varovani, polomer: b.polomer });
      hra.bublin += 1;
      break;
    }
  }
  for (const bu of hra.bubliny) {
    bu.zivot -= dt;
    if (bu.zivot > 0) continue;
    hra.oblaky.push({ x: bu.x, y: bu.y, zivot: TRVANI_OBLAKU, polomer: bu.polomer, jed: b.jed, druh: 'bahno' });
    if (hra.oblaky.length > MAX_OBLAKU) hra.oblaky.splice(0, hra.oblaky.length - MAX_OBLAKU);
    rozprsk(hra, bu.x, bu.y, 'bahno', 6);
  }
  hra.bubliny = hra.bubliny.filter((bu) => bu.zivot > 0);
}

// Zamčená truhla kousek za okrajem obrazovky (ne na bedně ani na jiné zamčené truhle, to zkusí příště).
function pridejZamcenou(hra, sirka, vyska) {
  const { x, y } = mimoPrekazky(hra, zaOkrajem(hra, sirka, vyska, OKRAJ_BEDEN, PASMO_BEDEN), ODSTUP_OD_PREKAZEK.bedna);
  if ([...hra.bedny, ...hra.zamcene].some((b) => Math.hypot(b.x - x, b.y - y) < POLOMER_BEDNY * 3)) return;
  hra.zamcene.push({ x, y, otevrena: false, blizko: false });
  hra.zamcenych += 1;
}

// Co z bedny vypadne pro los 0..1 (podle KORIST_BEDEN). Exportované kvůli simulaci.
export function losujKorist(los) {
  for (const [id, sance] of Object.entries(KORIST_BEDEN)) {
    los -= sance;
    if (los < 0) return id;
  }
  return 'krystal';
}

// Krystal z bedny je bohatší než z nepřítele a s časem roste.
export function xpZBedny(hra) {
  return Math.round(4 + hra.cas / 60);
}

// Třísky z rozbité bedny: stejné úlomky jako po nepřátelích, jen dřevěné. Směry z počítadla, ne z rng.
function trisky(hra, b) {
  const posun = hra.rozbitoBeden * 1.7;
  for (let i = 0; i < 8; i++) {
    const uhel = posun + (i / 8) * Math.PI * 2;
    const rychlost = 70 + ((i * 29 + hra.rozbitoBeden * 13) % 70);
    hra.castice.push({
      x: b.x, y: b.y, vx: Math.cos(uhel) * rychlost, vy: Math.sin(uhel) * rychlost,
      zivot: ZIVOT_CASTICE, druh: b.druh, odstin: i,
    });
  }
  if (hra.castice.length > MAX_CASTIC) hra.castice.splice(0, hra.castice.length - MAX_CASTIC);
}

// Pár úlomků bez zabití (Bludička se přenese, kámen dopadne). Směry z počítadla, ne z rng.
function rozprsk(hra, x, y, druh, pocet = 8) {
  hra.rozprsku += 1;
  const posun = hra.rozprsku * 1.3;
  for (let i = 0; i < pocet; i++) {
    const uhel = posun + (i / pocet) * Math.PI * 2;
    const rychlost = 60 + ((i * 31 + hra.rozprsku * 17) % 70);
    hra.castice.push({ x, y, vx: Math.cos(uhel) * rychlost, vy: Math.sin(uhel) * rychlost, zivot: ZIVOT_CASTICE, druh, odstin: i });
  }
  if (hra.castice.length > MAX_CASTIC) hra.castice.splice(0, hra.castice.length - MAX_CASTIC);
}

// Zásah zbraní bednu rozbije: rozletí se na třísky a na jejím místě zůstane jedna věc.
function rozbij(hra, b) {
  if (b.rozbita) return;
  b.rozbita = true;
  hra.rozbitoBeden += 1;
  zvuk(hra, 'bedna');
  trisky(hra, b);
  const vec = losujKorist(hra.rng.dalsi());
  hra.zBeden[vec] += 1;
  if (vec === 'krystal') hra.krystaly.push({ x: b.x, y: b.y, xp: xpZBedny(hra) });
  else if (vec === 'zlatak') hra.predmety.push({ druh: vec, x: b.x, y: b.y, hodnota: 1, z: 'bedny' });
  else hra.predmety.push({ druh: vec, x: b.x, y: b.y });
}

function nejblizsiBedna(hra, dosah) {
  let nej = null;
  let nejD = dosah;
  for (const b of hra.bedny) {
    const d = vzdalenost(b, hra.hrdina);
    if (!b.rozbita && d < nejD) { nej = b; nejD = d; }
  }
  return nej;
}

// Bomba: všichni viditelní nepřátelé na obrazovce padnou naráz (krystaly z nich vypadnou jako jindy).
// Bossové vydrží a schovaného ducha bomba nenajde.
function vybuch(hra, sirka, vyska) {
  const { hrdina } = hra;
  for (const n of hra.nepratele) {
    if (n.boss || !viditelny(n)) continue;
    if (Math.abs(n.x - hrdina.x) <= sirka / 2 + n.polomer && Math.abs(n.y - hrdina.y) <= vyska / 2 + n.polomer) n.hp = 0;
  }
  hra.bomb += 1;
  zvuk(hra, 'bomba');
  hra.vybuch = TRVANI_VYBUCHU;
  hra.tres = TRVANI_TRESU;
  hra.oznameni = { text: t('hra.bomba'), zivot: 1.2 };
}

// Zbraně neví o duchovi, který je zrovna schovaný.
function viditelny(n) {
  return !n.skryty;
}

function nejblizsi(hra) {
  let nej = null;
  let nejD = Infinity;
  for (const n of hra.nepratele) {
    if (!viditelny(n)) continue;
    const d = vzdalenost(n, hra.hrdina);
    if (d < nejD) { nej = n; nejD = d; }
  }
  return nej;
}

// Nejbližší dosud nezasažený viditelný nepřítel od místa úderu blesku (nanejvýš skok daleko).
function dalsiCilBlesku(hra, od, skok, zasazeni) {
  let dalsi = null;
  let nejD = skok;
  for (const n of hra.nepratele) {
    if (zasazeni.has(n) || n.hp <= 0 || !viditelny(n)) continue;
    const d = vzdalenost(n, od);
    if (d < nejD) { dalsi = n; nejD = d; }
  }
  return dalsi;
}

// Hrdina odletí směrem (ux, uy) o kolik px, chvíli ho nejde řídit.
function odhodHrdinu(hra, ux, uy, kolik) {
  const { hrdina } = hra;
  hrdina.odhozen = TRVANI_ODHOZENI_HRDINY;
  hrdina.odhozVx = (ux * kolik) / TRVANI_ODHOZENI_HRDINY;
  hrdina.odhozVy = (uy * kolik) / TRVANI_ODHOZENI_HRDINY;
}

// Kolik pomocníků toho druhu ještě může přibýt (počítají se živí od všech bossů).
function volnoPomocniku(hra, s) {
  return s.max - hra.nepratele.filter((p) => p.pan && p.druh === s.druh && p.hp > 0).length;
}

// Výpad míří na místo, kde hrdina zrovna je.
function zamirVypad(n, sch, hrdina) {
  const d = vzdalenost(n, hrdina);
  sch.ux = d > 0 ? (hrdina.x - n.x) / d : 1;
  sch.uy = d > 0 ? (hrdina.y - n.y) / d : 0;
}

// Jeden vějíř střel z bosse na hrdinu.
function vystrelVejir(hra, n, s) {
  zvuk(hra, 'strelaBosse');
  const zaklad = Math.atan2(hra.hrdina.y - n.y, hra.hrdina.x - n.x);
  for (let i = 0; i < s.strel; i++) {
    const uhel = zaklad + (i - (s.strel - 1) / 2) * s.rozestup;
    hra.strelyBossu.push({
      x: n.x, y: n.y, vx: Math.cos(uhel) * s.rychlost, vy: Math.sin(uhel) * s.rychlost, zivot: ZIVOT_STREL_BOSSU, rana: s.poskozeni,
      barva: BOSSOVE[n.druh]?.strely ?? null, zdroj: n,
    });
  }
}

// Co schopnost dělá. muze = jestli ji teď jde použít (jinak boss vezme další), zacni = na začátku varování,
// miri = každý snímek varování, proved = po varování, dal = každý další snímek, dokud nevrátí true (bez dal
// je schopnost hotová hned po proved). sch = rozběhnutá schopnost na bossovi (sch.s jsou její čísla).
// Pomocníky proved jen přidá do nove, do hry přijdou až po projití všech bossů.
const PRUBEH_SCHOPNOSTI = {
  dupnuti: {
    proved(hra, n, sch) {
      const { s } = sch;
      hra.vlny.push({ x: n.x, y: n.y, r: 0, max: s.polomer, poskozeni: s.poskozeni, odhozeni: s.odhozeni, zasahla: false, zdroj: n });
      hra.tres = Math.max(hra.tres, TRES_DUPNUTI);
      rozprsk(hra, n.x, n.y + n.polomer / 2, 'kamen', 10);
      zvuk(hra, 'uder');
    },
  },
  hod: {
    proved(hra, n, sch) {
      const { hrdina, rng } = hra;
      const { s } = sch;
      const pocet = rng.cele(s.pocet[0], s.pocet[1]);
      const cilX = hrdina.x + hrdina.vx * s.let * s.predstih;
      const cilY = hrdina.y + hrdina.vy * s.let * s.predstih;
      const otoceni = rng.dalsi() * Math.PI * 2;
      for (let i = 0; i < pocet; i++) {
        const uhel = otoceni + (i / Math.max(1, pocet - 1)) * Math.PI * 2;
        const r = i === 0 ? 0 : s.rozptyl * (0.7 + 0.3 * rng.dalsi());
        hra.kameny.push({
          odX: n.x, odY: n.y - n.polomer, x: cilX + Math.cos(uhel) * r, y: cilY + Math.sin(uhel) * r, let: -i * ROZESTUP_HODU,
          trvani: s.let, polomer: s.polomer, poskozeni: s.poskozeni, sit: s.sit, druh: s.strela, zdroj: n,
        });
      }
    },
  },
  vypad: {
    zacni(hra, n, sch) {
      zamirVypad(n, sch, hra.hrdina);
    },
    miri(hra, n, sch) {
      if (sch.zbyva > sch.s.zamek) zamirVypad(n, sch, hra.hrdina);
    },
    proved(hra, n, sch) {
      sch.ujde = 0;
      sch.trefil = false;
      zvuk(hra, 'vypadBezi');
    },
    dal(hra, n, sch, dt) {
      const { hrdina } = hra;
      const { s } = sch;
      const krok = Math.min(s.rychlost * dt, s.delka - sch.ujde);
      n.x += sch.ux * krok;
      n.y += sch.uy * krok;
      sch.ujde += krok;
      if (!sch.trefil && vzdalenost(n, hrdina) < n.polomer + 10 && hrdina.nezranitelny <= 0 && !hra.konec) {
        sch.trefil = true;
        pocitejZasah(hra, 'vypad', n);
        // Odletí kolmo od dráhy na tu stranu, kde stojí (kdo je přesně na ní, doprava od směru výpadu).
        const strana = (hrdina.x - n.x) * -sch.uy + (hrdina.y - n.y) * sch.ux >= 0 ? 1 : -1;
        zran(hra, ranaHrozby(hra, s.poskozeni), 'zraneni', true, n, zdrojRany(n));
        odhodHrdinu(hra, -sch.uy * strana, sch.ux * strana, s.odhozeni);
      }
      if (sch.ujde < s.delka - 1e-9) return false;
      rozprsk(hra, n.x, n.y + n.polomer / 2, 'kamen', 6);
      return true;
    },
  },
  vyvolani: {
    muze: (hra, n, s) => volnoPomocniku(hra, s) > 0,
    zacni(hra, n, sch) {
      const { s } = sch;
      const kolik = Math.min(hra.rng.cele(s.pocet[0], s.pocet[1]), volnoPomocniku(hra, s));
      const r = n.polomer + s.vzdalenost;
      sch.mista = Array.from({ length: kolik }, (_, i) => {
        const uhel = (i / kolik) * Math.PI * 2 + hra.cas;
        return { x: n.x + Math.cos(uhel) * r, y: n.y + Math.sin(uhel) * r };
      });
    },
    // Kdyby se louka mezitím zaplnila (jiný boss vyvolal stejné pomocníky), vylezou jen ti, co se vejdou.
    proved(hra, n, sch, nove) {
      const vejde = volnoPomocniku(hra, sch.s) - nove.filter((p) => p.druh === sch.s.druh).length;
      for (const m of sch.mista.slice(0, Math.max(0, vejde))) {
        nove.push({ druh: sch.s.druh, x: m.x, y: m.y, pan: n, vyrazi: sch.s.vyrazi });
        rozprsk(hra, m.x, m.y, n.druh, 5);
      }
    },
  },
  vejir: {
    // Přenese se na náhodné místo kolem hrdiny, na menší obrazovce blíž.
    zacni(hra, n, sch, sirka, vyska) {
      const { hrdina } = hra;
      rozprsk(hra, n.x, n.y, n.druh);
      const uhel = hra.rng.dalsi() * Math.PI * 2;
      const r = Math.max(120, Math.min(220, Math.min(sirka, vyska) / 2 - 40));
      n.x = hrdina.x + Math.cos(uhel) * r;
      n.y = hrdina.y + Math.sin(uhel) * r;
      rozprsk(hra, n.x, n.y, n.druh);
      n.zjeveni = ZJEVENI_BLUDICKY;
    },
    proved(hra, n, sch) {
      vystrelVejir(hra, n, sch.s);
      sch.salv = sch.s.salv - 1;
      sch.dalsi = sch.s.mezi;
    },
    dal(hra, n, sch, dt) {
      if (sch.salv <= 0) return true;
      sch.dalsi -= dt;
      if (sch.dalsi > 1e-9) return false;
      vystrelVejir(hra, n, sch.s);
      sch.salv -= 1;
      sch.dalsi = sch.s.mezi;
      return sch.salv <= 0;
    },
  },
  skok: {
    muze: (hra, n, s) => vzdalenost(n, hra.hrdina) > s.blizko,
    // Cíl se zamkne hned na začátku: kam hrdina stojí teď, tam dopadne.
    zacni(hra, n, sch) {
      sch.cilX = hra.hrdina.x;
      sch.cilY = hra.hrdina.y;
    },
    proved(hra, n, sch) {
      sch.odX = n.x;
      sch.odY = n.y;
      sch.ulet = 0;
      zvuk(hra, 'skok');
    },
    dal(hra, n, sch, dt) {
      const { hrdina } = hra;
      const { s } = sch;
      sch.ulet = Math.min(s.let, sch.ulet + dt);
      const t = sch.ulet / s.let;
      n.x = sch.odX + (sch.cilX - sch.odX) * t;
      n.y = sch.odY + (sch.cilY - sch.odY) * t;
      if (t < 1) return false;
      hra.dopady.push({ x: n.x, y: n.y, polomer: s.polomer, druh: s.dopad ?? 'sliz', zivot: TRVANI_DOPADU });
      rozprsk(hra, n.x, n.y, n.druh, 6);
      zvuk(hra, 'dopad');
      if (vzdalenost(n, hrdina) < s.polomer + POLOMER_HRDINY && hrdina.nezranitelny <= 0 && !hra.konec) {
        pocitejZasah(hra, 'skok', n);
        zran(hra, ranaHrozby(hra, s.poskozeni), 'zraneni', true, n, zdrojRany(n));
      }
      return true;
    },
  },
};

// Kdo hrdinu trefil schopností: bossové a jejich pomocníci do zasahyBossu (jako dřív), obyčejní nepřátelé do
// zasahyNepratel.
function pocitejZasah(hra, id, zdroj) {
  if (zdroj && !zdroj.boss && !zdroj.pan) hra.zasahyNepratel[id] = (hra.zasahyNepratel[id] ?? 0) + 1;
  else hra.zasahyBossu[id] += 1;
}

// Boss vezme další schopnost v pořadí, kterou teď může použít (hrdina je v dosahu, pomocníci nejsou na maximu).
// Když nejde žádná, zkusí to v dalším snímku.
function seznamSchopnosti(n) {
  return n.boss ? schopnostiBosse(n.druh) : schopnostiNepritele(n.druh, n.elita);
}

function zacniSchopnost(hra, n, sirka, vyska) {
  const seznam = seznamSchopnosti(n);
  const d = vzdalenost(n, hra.hrdina);
  for (let k = 0; k < seznam.length; k++) {
    const i = (n.dalsiSchopnost + k) % seznam.length;
    const s = seznam[i];
    const prubeh = PRUBEH_SCHOPNOSTI[s.id];
    if ((s.dosah !== undefined && d >= s.dosah) || prubeh.muze?.(hra, n, s) === false) continue;
    // Kosti a skoky obyčejných nepřátel berou z přídělu (PRIDEL), nápor elity ne.
    if (!n.boss && PRIDEL[s.id]) {
      if (hra.pridel[s.id] < 1) continue;
      hra.pridel[s.id] -= 1;
    }
    n.dalsiSchopnost = (i + 1) % seznam.length;
    n.schopnost = { id: s.id, s, faze: 'varovani', zbyva: s.varovani };
    const pouzito = n.boss ? hra.schopnostiPouzito : hra.schopnostiNepratel;
    pouzito[s.id] = (pouzito[s.id] ?? 0) + 1;
    // Varování má každá schopnost svým zvukem (dupnutí duní, hod hvízdá, výpad vrčí, vyvolání se chvěje …),
    // obyčejní nepřátelé svým tišším (s.zvuk).
    zvuk(hra, s.zvuk ?? s.id);
    prubeh.zacni?.(hra, n, n.schopnost, sirka, vyska);
    return;
  }
}

// Pauza po schopnosti. Bossové víc tlačí: od TLAK_BOSSU.od. minuty hrozby se pauza zkracuje, obklíčenému hrdinovi
// ještě víc (TLAK_BOSSU).
export function pauzaBosse(hra, n) {
  const t = TLAK_BOSSU;
  const hrozba = Math.max(t.min, 1 - t.zaMinutu * Math.max(0, silaHry(hra).min - t.od));
  const stani = hra.hrdina.obkliceni >= 1 ? t.stani : 1;
  return (BOSSOVE[n.druh]?.pauza ?? 2.5) * (n.zuri ? ZRYCHLENI_ZURIVOSTI : 1) * hrozba * stani;
}

function dokonciSchopnost(hra, n) {
  n.schopnost = null;
  n.doSchopnosti = n.boss ? pauzaBosse(hra, n) : pauzaNepritele(n);
}

// Obyčejný nepřítel nic nezačne (a rozběhnuté varování se mu přeruší), když je omráčený, držený kořeny, zapředený
// nebo odhozený.
function nemuzeNic(n) {
  return !n.boss && (nekouse(n) || n.drzen > 0 || n.zapreden > 0 || n.odhozen > 0 || n.skryty);
}

// Schopnosti bossů i obyčejných nepřátel: odpočet, varování, provedení. Pod ZURIVOST životů boss zuří (jednou se
// to ohlásí, když zrovna neběží jiné čerstvé ohlášení) a střídá schopnosti rychleji.
function schopnostiBossu(hra, dt, sirka, vyska) {
  const nove = [];
  if (hra.cas >= OBYCEJNE.od) pridelSchopnosti(hra, dt);
  for (const n of hra.nepratele) {
    if (n.hp <= 0 || n.doSchopnosti === undefined) continue;
    if (n.boss) {
      n.zjeveni = Math.max(0, n.zjeveni - dt);
      if (!n.zuri && n.hp <= n.maxHp * ZURIVOST) {
        n.zuri = true;
        zvuk(hra, 'zurivost');
        if (!hra.oznameni || hra.oznameni.zivot < 1) hra.oznameni = { text: t('hra.zuri', { boss: BOSSOVE[n.druh]?.nazev ?? n.druh }), zivot: 2 };
      }
    } else if (nemuzeNic(n) || hra.cas < OBYCEJNE.od) {
      if (n.schopnost?.faze === 'varovani') dokonciSchopnost(hra, n);
      continue;
    }
    const sch = n.schopnost;
    if (!sch) {
      n.doSchopnosti -= dt;
      if (n.doSchopnosti <= 0) zacniSchopnost(hra, n, sirka, vyska);
      continue;
    }
    const prubeh = PRUBEH_SCHOPNOSTI[sch.id];
    if (sch.faze === 'varovani') {
      sch.zbyva -= dt;
      if (sch.zbyva > 1e-9) {
        prubeh.miri?.(hra, n, sch);
        continue;
      }
      sch.zbyva = 0;
      sch.faze = 'provadi';
      prubeh.proved(hra, n, sch, nove);
      if (!prubeh.dal) dokonciSchopnost(hra, n);
    } else if (prubeh.dal(hra, n, sch, dt)) {
      dokonciSchopnost(hra, n);
    }
  }
  for (const p of nove) {
    const m = pridejNepritele(hra, p.druh, p.x, p.y);
    m.pan = p.pan;
    if (p.vyrazi) m.vyrazi = VYRAZENI_PAVOUCKU;
  }
}

// Vlny dupnutí, padající kameny a střely Bludičky: pohyb a zásah hrdiny.
function strelyBossu(hra, dt) {
  const { hrdina } = hra;
  const muzeDostat = () => hrdina.nezranitelny <= 0 && !hra.konec;
  for (const v of hra.vlny) {
    const pred = v.r;
    v.r = Math.min(v.max, v.r + RYCHLOST_VLNY * dt);
    const d = vzdalenost(v, hrdina);
    if (!v.zasahla && d >= pred - 10 && d <= v.r + 10 && muzeDostat()) {
      v.zasahla = true;
      hra.zasahyBossu.dupnuti += 1;
      zran(hra, ranaHrozby(hra, v.poskozeni), 'zraneni', true, v.zdroj, zdrojRany(v.zdroj));
      odhodHrdinu(hra, d > 0 ? (hrdina.x - v.x) / d : 1, d > 0 ? (hrdina.y - v.y) / d : 0, v.odhozeni);
    }
    if (v.r >= v.max) v.konec = true;
  }
  hra.vlny = hra.vlny.filter((v) => !v.konec);
  for (const k of hra.kameny) {
    k.let += dt;
    if (k.let < k.trvani) continue;
    k.dopadl = true;
    zvuk(hra, 'dopad');
    rozprsk(hra, k.x, k.y, k.druh, 6);
    hra.dopady.push({ x: k.x, y: k.y, polomer: k.polomer, druh: k.druh, zivot: TRVANI_DOPADU });
    if (vzdalenost(k, hrdina) < k.polomer && muzeDostat()) {
      pocitejZasah(hra, 'hod', k.zdroj);
      zran(hra, ranaHrozby(hra, k.poskozeni), 'zraneni', true, k.zdroj, zdrojRany(k.zdroj));
      if (k.sit) hrdina.sit = TRVANI_SITE;
    }
  }
  hra.kameny = hra.kameny.filter((k) => !k.dopadl);
  for (const d of hra.dopady) d.zivot -= dt;
  hra.dopady = hra.dopady.filter((d) => d.zivot > 0);
  for (const st of hra.strelyBossu) {
    st.x += st.vx * dt;
    st.y += st.vy * dt;
    st.zivot -= dt;
    if (st.odrazena) {
      // Střela vrácená zrcadlem už hrdinovi neublíží, zraní prvního nepřítele, do kterého vletí.
      for (const n of hra.nepratele) {
        if (n.hp > 0 && viditelny(n) && vzdalenost(st, n) < n.polomer + POLOMER_STRELY_BOSSU) {
          zasah(hra, n, st.poskozeni, false, 'zrcadlo');
          st.zivot = 0;
          break;
        }
      }
      continue;
    }
    if (vzdalenost(st, hrdina) < POLOMER_STRELY_BOSSU + 8) {
      st.zivot = 0;
      if (muzeDostat()) {
        hra.zasahyBossu.vejir += 1;
        zran(hra, ranaHrozby(hra, st.rana ?? SCHOPNOSTI.vejir.poskozeni), 'zraneni', true, st.zdroj, 'boss');
      }
    }
  }
  hra.strelyBossu = hra.strelyBossu.filter((st) => st.zivot > 0);
}

// Pruhy životů nahoře na obrazovce: jeden za každého živého bosse, v pořadí, jak přišli. Kreslí je kresleni.js.
export function bossBary(hra) {
  return hra.nepratele
    .filter((n) => n.boss)
    .map((n) => ({ druh: n.druh, nazev: BOSSOVE[n.druh]?.nazev ?? n.druh, hp: Math.max(0, n.hp), maxHp: n.maxHp, nepritel: n }));
}

// Čísla zbraní na úrovních 1–5: u = úroveň (nad pátou platí čísla páté, růst přidá statyZbrane),
// n = násobek nabíjení hrdiny. Kratší nabíjení zrychlí všechny zbraně: střelbu, údery, žár lucerny, trny,
// otáčení krumpáčů a zrcadel, odpočinek světlušek, krystaly, zvonění, rozmach cepu, semínka, kořeny, pálení
// ohnivé stopy i prak.
const CISLA_ZBRANI = {
  // jiskra: velikost = o kolik px dál než okraj nepřítele jiskra zasáhne (kreslí se 1,5× tak velká), zivot = jak
  // dlouho letí (s)
  jiskra: (j, n) => ({ pocet: 1 + (j >= 2) + (j >= 4), nabiti: (j >= 3 ? 0.5 : 0.7) * n, poskozeni: j >= 5 ? 16 : 11, velikost: 4, zivot: 1.2 }),
  // lucerna: dosvit = jak dlouho žár pálí i nepřítele, který ze světla vyšel (bez Výdrže 0), uhliky = uhlíky
  // na okraji světla (jen s Přívalem)
  lucerna: (l, n) => ({ dosah: 56 + 22 * ((l >= 2) + (l >= 4)), zar: 14 + 9 * ((l >= 3) + (l >= 5)), tik: 0.3 * n, dosvit: 0, uhliky: 0 }),
  // krumpace: velikost = o kolik px dál než okraj nepřítele krumpáč zasáhne (podle ní se i kreslí), otres = jak
  // dlouho zasažený zpomalí (bez Výdrže 0)
  krumpace: (k, n) => ({ pocet: 1 + (k >= 2) + (k >= 4), rychlost: (k >= 3 ? 4.5 : 3) / n, poskozeni: k >= 5 ? 18 : 12, polomer: 64, velikost: 10, otres: 0 }),
  // blesk: blesku = kolik blesků udeří naráz (každý do jiného nepřítele, další jen s Přívalem)
  blesk: (b, n) => ({
    preskoky: 2 + (b >= 2) + 2 * (b >= 4), nabiti: (b >= 3 ? 1.5 : 2.2) * n, poskozeni: b >= 5 ? 30 : 20, dosah: 320, skok: 110, otres: 0, blesku: 1,
  }),
  // trny: pocet trsů naráz, poškození za každý tik, zpomaleni = násobek rychlosti nepřítele v trní
  trny: (t, n) => ({
    pocet: 1 + (t >= 2) + (t >= 4), nabiti: 2 * n, dosah: 300, polomer: t >= 3 ? 34 : 26, trvani: t >= 3 ? 3.4 : 2.4,
    tik: 0.5, poskozeni: t >= 5 ? 9 : 6, zpomaleni: t >= 5 ? 0.35 : 0.55, doznivani: DOZNIVANI_TRNU,
  }),
  // zrcadlo: polomer = jak daleko od hrdiny krouží, velikost = kam až zrcadlo sahá, odhozeni = o kolik px odhodí,
  // let = jak dlouho odhozený letí (stejnou rychlostí, takže s Výdrží doletí dál)
  zrcadlo: (z, n) => ({
    pocet: 1 + (z >= 2) + (z >= 4), rychlost: 2.4 / n, polomer: 34, velikost: z >= 5 ? 14 : 10,
    poskozeni: z >= 5 ? 12 : 7, odhozeni: z >= 3 ? 110 : 70, odraz: z >= 5 ? 30 : 20, let: TRVANI_ODHOZENI,
  }),
  // svetlusky: pocet v roji, nabiti = odpočinek u hrdiny po návratu, rychlost letu (px/s), dosah = jak daleko
  // od hrdiny si hledá cíl
  svetlusky: (v, n) => ({
    pocet: 3 + (v >= 2) + (v >= 4), nabiti: (v >= 3 ? 0.5 : 0.8) * n, rychlost: v >= 3 ? 300 : 240, poskozeni: v >= 5 ? 16 : 10, dosah: 260,
    otres: 0,
  }),
  // mraz: pocet zón naráz, trvani = jak dlouho zóna mrzne před roztříštěním, zpomaleni = násobek rychlosti
  // nepřítele na konci mrznutí, poskozeni = rána při roztříštění
  mraz: (m, n) => ({
    pocet: 1 + (m >= 2) + (m >= 4), nabiti: 3.5 * n, dosah: 300, polomer: m >= 3 ? 56 : 44, trvani: m >= 3 ? 1.5 : 1.8,
    poskozeni: m >= 5 ? 52 : 34, zpomaleni: m >= 5 ? 0.25 : 0.45, doznivani: DOZNIVANI_MRAZU,
  }),
  // zvon: pocet = vln v jednom zvonění (první + ozvěny), polomer = kam až vlna doběhne, odhozeni (px),
  // omraceni = jak dlouho omráčený stojí (s)
  zvon: (z, n) => ({
    pocet: 1 + (z >= 4), nabiti: 2.6 * n, polomer: z >= 2 ? 160 : 130, poskozeni: z >= 5 ? 28 : 18,
    odhozeni: z >= 3 ? 80 : 55, omraceni: z >= 3 ? 1.1 : 0.8, let: TRVANI_ODHOZENI,
  }),
  // cep: pocet koulí, retez = délka řetězu první koule (px), velikost = poloměr koule, poskozeni = rána při
  // RYCHLOST_RANY_CEPU, rozmach = jak rychle ji hrdina vestoje roztáčí (rad/s), odhozeni (px)
  cep: (c, n) => ({
    pocet: 1 + (c >= 4), retez: c >= 2 ? 76 : 60, velikost: c >= 5 ? 12 : 9, poskozeni: 18 + 6 * (c >= 3) + 6 * (c >= 5),
    rozmach: (c >= 3 ? 4 : 3.2) / n, odhozeni: 40, let: TRVANI_ODHOZENI,
  }),
  // seminka: pocet semínek naráz, polomer = výbuchu (keř má POMER_KERE z něj), poskozeni = rána výbuchem,
  // trvani = jak dlouho keř stojí, pichnuti = rána od trnů keře za každý tik
  seminka: (s, n) => ({
    pocet: 1 + (s >= 2) + (s >= 4), nabiti: 1.2 * n, polomer: s >= 3 ? 40 : 32, poskozeni: s >= 5 ? 34 : 24,
    trvani: s >= 3 ? 3 : 2.2, tik: 0.5, pichnuti: s >= 5 ? 6 : 4,
  }),
  // korene: pocet kořenů naráz (každý na jiného nepřítele), dosah = jak daleko od hrdiny si hledá cíl,
  // polomer = koho kolem cíle při vyražení chytí, trvani = jak dlouho drží, poskozeni = rána při vyražení,
  // svirani = rána za každý tik držení
  korene: (k, n) => ({
    pocet: 1 + (k >= 2) + (k >= 4), nabiti: 2.4 * n, dosah: 260, polomer: k >= 3 ? 30 : 22, trvani: k >= 3 ? 1.6 : 1.2,
    poskozeni: k >= 5 ? 22 : 14, svirani: k >= 5 ? 6 : 4,
  }),
  // stopa: polomer jednoho plamene, trvani = jak dlouho hoří, tik = jak často pálí, poskozeni = rána v plameni,
  // hori = jak dlouho zapálený nepřítel hoří po vylezení (0 = nezapálí), pali = rána za tik, když hoří,
  // stop = kolik řad plamenů hoří vedle sebe (další jen s Přívalem)
  stopa: (o, n) => ({
    polomer: o >= 2 ? 20 : 16, trvani: o >= 3 ? 2.6 : 1.8, tik: 0.4 * n, poskozeni: o >= 5 ? 9 : 6,
    hori: o >= 4 ? 1.6 : 0, pali: o >= 5 ? 5 : 3, stop: 1,
  }),
  // prak: pocet kamenů v jedné ráně, odrazy = na kolik dalších nepřátel se kámen odrazí, dosah = na koho vystřelí,
  // skok = jak daleko od zásahu hledá dalšího, poskozeni = rána prvního zásahu (každý odraz o RUST_RANY_KAMENE víc),
  // zivot = jak dlouho kámen nejvýš letí, volny = jak dlouho letí bez cíle, než spadne
  prak: (p, n) => ({
    pocet: 1 + (p >= 4), odrazy: 2 + 2 * (p >= 2), nabiti: (p >= 3 ? 1.1 : 1.5) * n, poskozeni: p >= 5 ? 20 : 13, dosah: 300, skok: 150,
    zivot: ZIVOT_KAMENE, volny: VOLNY_LET,
  }),
};

// Co přidají úrovně nad pátou: poskozeni a velikost jsou násobky, pocet kusů navíc, nabiti násobek nabíjení.
// Každá třetí úroveň vezme další věc z dal.poradi (dokola). Co je už na stropu, přeskočí, a když je na stropu
// všechno, přidá už jen poškození. Pod 6. úrovní nepřidá nic.
export function bonusZaUroven(id, uroven) {
  const nad = Math.max(0, Math.floor(uroven) - ZAKLAD_UROVNI);
  const b = { poskozeni: 1 + RUST_UROVNI.poskozeni * nad, pocet: 0, nabiti: 1, velikost: 1 };
  const dal = ZBRANE[id]?.dal;
  if (!dal || nad < RUST_UROVNI.kazda) return b;
  // Kroky se počítají celými čísly, ať strop nepřeskočí zaokrouhlovací chyba.
  const kusu = dal.pocet ? CISLA_ZBRANI[id](ZAKLAD_UROVNI, 1)[dal.pocet] : 0;
  const kroky = { pocet: 0, nabiti: 0, velikost: 0 };
  const volno = {
    pocet: () => Boolean(dal.pocet) && kusu + kroky.pocet < (dal.maxPocet ?? STROPY.pocet),
    nabiti: () => RUST_UROVNI.nabiti ** kroky.nabiti > STROPY.nabiti,
    velikost: () => 1 + RUST_UROVNI.velikost * kroky.velikost < STROPY.velikost - 1e-9,
  };
  let i = 0;
  for (let krok = 0; krok < Math.floor(nad / RUST_UROVNI.kazda); krok++) {
    for (let pokus = 0; pokus < dal.poradi.length; pokus++) {
      const co = dal.poradi[i++ % dal.poradi.length];
      if (volno[co]?.()) {
        kroky[co] += 1;
        break;
      }
    }
  }
  b.pocet = kroky.pocet;
  b.nabiti = Math.max(STROPY.nabiti, RUST_UROVNI.nabiti ** kroky.nabiti);
  b.velikost = Math.min(STROPY.velikost, 1 + RUST_UROVNI.velikost * kroky.velikost);
  return b;
}

// Čísla jedné zbraně na dané úrovni i nad pátou.
export function statyZbrane(id, uroven, n = 1) {
  const cisla = CISLA_ZBRANI[id](uroven, n);
  if (uroven <= ZAKLAD_UROVNI) return cisla;
  const { dal } = ZBRANE[id];
  const b = bonusZaUroven(id, uroven);
  for (const pole of dal.poskozeni ?? []) cisla[pole] *= b.poskozeni;
  if (dal.pocet) cisla[dal.pocet] += b.pocet;
  for (const pole of dal.nabiti ?? []) cisla[pole] *= b.nabiti;
  for (const pole of dal.velikost ?? []) cisla[pole] *= b.velikost;
  return cisla;
}

// Pasivy hrdiny (h) v číslech jedné zbraně (podle ZBRANE[id].pasivy): Rozpětí násobí velikost a dosah, Výdrž
// násobí trvání a přičte, co zbraň má ve vydrzNavic, Příval přidá kusy. Mění a vrací cisla.
export function pasivyDoZbrane(id, cisla, h) {
  const p = ZBRANE[id].pasivy;
  const rozpeti = h?.rozpeti ?? 1;
  const vydrz = h?.vydrz ?? 1;
  for (const pole of p.rozpeti ?? []) cisla[pole] *= rozpeti;
  for (const pole of p.vydrz ?? []) cisla[pole] *= vydrz;
  for (const [pole, za] of Object.entries(p.vydrzNavic ?? {})) cisla[pole] += za * (vydrz - 1);
  if (p.prival) cisla[p.prival] += Math.max(0, Math.floor(h?.prival ?? 0));
  return cisla;
}

// Čísla všech zbraní hrdiny i s pasivami. Na mapě s dosahLucerny (jeskyně) svítí lucerna dál.
export function staty(hra) {
  const n = hra.hrdina.nabijeni ?? 1;
  const s = Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, pasivyDoZbrane(id, statyZbrane(id, hra.zbrane[id]?.uroven ?? 0, n), hra.hrdina)]));
  s.lucerna.dosah *= MAPY[hra.mapa]?.dosahLucerny ?? 1;
  return s;
}

// Stupeň úrovně pro barvu rámečku: 0 do 4. úrovně, 1 od 5., 2 od 10., 3 od 15.
export function stupenUrovne(uroven) {
  return STUPNE_UROVNI.filter((od) => uroven >= od).length;
}

// Kde je i-té zrcadlo (pro pravidla i kreslení).
export function poziceZrcadla(hra, i, s = staty(hra)) {
  const uhel = hra.uhelZrcadel + (i / s.zrcadlo.pocet) * Math.PI * 2;
  return { x: hra.hrdina.x + Math.cos(uhel) * s.zrcadlo.polomer, y: hra.hrdina.y + Math.sin(uhel) * s.zrcadlo.polomer, uhel };
}

// O kolik trny zpomalí nepřítele (bosse jen napůl). 1 = vůbec.
function brzdaTrnu(n) {
  if (!(n.trny > 0)) return 1;
  return n.boss ? 1 - (1 - n.zpomaleni) / 2 : n.zpomaleni;
}

// Nové trsy trnů: pod nejbližšími viditelnými nepřáteli v dosahu, ale každý jinde (kdo stojí v kruhu už
// vybraného trsu, ten se přeskočí). Na co nezbyl nepřítel, to vyraší pod nejbližší bednou v dosahu.
// Ozvěna (ozvena = true) vynechá i místa, kde trsy z minulého výstřelu ještě rostou.
function zasadTrny(hra, st, ozvena = false) {
  const { hrdina } = hra;
  const mista = ozvena ? hra.trny.map((p) => ({ x: p.x, y: p.y, stary: true })) : [];
  const volno = (o) => mista.every((m) => vzdalenost(m, o) >= st.polomer);
  const kandidati = hra.nepratele
    .filter((n) => n.hp > 0 && viditelny(n) && vzdalenost(n, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina));
  const stare = mista.length;
  for (const n of kandidati) {
    if (mista.length - stare >= st.pocet) break;
    if (volno(n)) mista.push({ x: n.x, y: n.y });
  }
  const bedny = hra.bedny
    .filter((b) => !b.rozbita && vzdalenost(b, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina));
  for (const b of bedny) {
    if (mista.length - stare >= st.pocet) break;
    if (volno(b)) mista.push({ x: b.x, y: b.y });
  }
  const nove = mista.slice(stare);
  for (const m of nove) {
    hra.trny.push({
      x: m.x, y: m.y, polomer: st.polomer, trvani: st.trvani, zivot: st.trvani, tik: 0,
      poskozeni: st.poskozeni, zpomaleni: st.zpomaleni, doznivani: st.doznivani,
    });
    rozprsk(hra, m.x, m.y, 'trny', 5);
  }
  if (hra.trny.length > MAX_TRNU) hra.trny.splice(0, hra.trny.length - MAX_TRNU);
  if (nove.length) zvuk(hra, 'trny');
  return nove.length;
}

// Trsy rostou, zraňují a zpomalí, kdo v nich stojí, rozbijí bedny a nakonec zalezou.
function rostouTrny(hra, dt, s) {
  for (const p of hra.trny) {
    p.zivot -= dt;
    const stari = p.trvani - p.zivot;
    const ostre = stari >= RUST_TRNU && p.zivot > VADNUTI_TRNU;
    if (!ostre) continue;
    p.tik -= dt;
    const tikne = p.tik <= 0;
    if (tikne) p.tik = s.trny.tik;
    for (const n of hra.nepratele) {
      if (n.hp <= 0 || !viditelny(n) || vzdalenost(n, p) >= p.polomer + n.polomer / 2) continue;
      n.zpomaleni = Math.min(n.trny > 0 ? n.zpomaleni : 1, p.zpomaleni);
      n.trny = Math.max(n.trny || 0, p.doznivani ?? DOZNIVANI_TRNU);
      if (tikne) zasah(hra, n, p.poskozeni, false, 'trny');
    }
    if (tikne) {
      for (const b of hra.bedny) {
        if (vzdalenost(b, p) < p.polomer + POLOMER_BEDNY / 2) rozbij(hra, b);
      }
    }
  }
  hra.trny = hra.trny.filter((p) => p.zivot > 0);
}

// Zrcadla: točí se, vrací střely bossů a odhazují nepřátele, kterých se dotknou. Rozbijí i bednu.
function zrcadla(hra, s) {
  const { hrdina } = hra;
  const z = s.zrcadlo;
  for (let i = 0; i < z.pocet; i++) {
    const p = poziceZrcadla(hra, i, s);
    for (const st of hra.strelyBossu) {
      if (st.odrazena || vzdalenost(st, p) >= z.velikost + POLOMER_STRELY_BOSSU) continue;
      // Pošle ji zpátky tam, odkud přiletěla (rychleji), ať trefí toho, kdo ji vystřelil.
      st.odrazena = true;
      st.vx *= -ZRYCHLENI_ODRAZU;
      st.vy *= -ZRYCHLENI_ODRAZU;
      st.zivot = ZIVOT_ODRAZU;
      st.poskozeni = z.odraz;
      hra.odrazeno += 1;
      zvuk(hra, 'zrcadlo', 1);
      hra.odlesky.push({ x: st.x, y: st.y, zivot: TRVANI_ODLESKU });
    }
    for (const n of hra.nepratele) {
      if (n.zasahZrcadlem > 0 || n.hp <= 0 || !viditelny(n) || vzdalenost(n, p) >= n.polomer + z.velikost) continue;
      zasah(hra, n, z.poskozeni, false, 'zrcadlo');
      n.zasahZrcadlem = 0.5;
      zvuk(hra, 'zrcadlo');
      ozvenaZasahu(hra, n, z.poskozeni, false, 'zrcadlo');
      hra.odlesky.push({ x: (n.x + p.x) / 2, y: (n.y + p.y) / 2, zivot: TRVANI_ODLESKU });
      if (n.boss) continue;
      // Odletí od hrdiny (kdo stojí přímo na něm, tím směrem, kde je zrcadlo). S Výdrží letí déle (z.let)
      // stejnou rychlostí, takže doletí dál.
      const d = vzdalenost(n, hrdina);
      const ux = d > 0 ? (n.x - hrdina.x) / d : Math.cos(p.uhel);
      const uy = d > 0 ? (n.y - hrdina.y) / d : Math.sin(p.uhel);
      n.odhozen = z.let ?? TRVANI_ODHOZENI;
      n.odhozVx = (ux * z.odhozeni) / TRVANI_ODHOZENI;
      n.odhozVy = (uy * z.odhozeni) / TRVANI_ODHOZENI;
      hra.odhozeno += 1;
    }
    for (const b of hra.bedny) {
      if (vzdalenost(b, p) < POLOMER_BEDNY + z.velikost) rozbij(hra, b);
    }
  }
  if (hra.odlesky.length > 40) hra.odlesky.splice(0, hra.odlesky.length - 40);
}

// Kde se i-tá z pocet světlušek vznáší, když odpočívá: v kroužku kolem hrdiny (kousek nad ním), kroužek se
// pomalu točí a každá světluška se k tomu sama pohupuje.
export function mistoSvetlusky(hra, i, pocet) {
  const uhel = (i / pocet) * Math.PI * 2 + hra.cas * 1.6;
  const r = 30 + 5 * Math.sin(hra.cas * 2.3 + i * 1.7);
  return { x: hra.hrdina.x + Math.cos(uhel) * r, y: hra.hrdina.y - 4 + Math.sin(uhel) * r * 0.7 };
}

// Cíl pro světlušku z místa od: nejbližší viditelný nepřítel v dosahu hrdiny, na kterého ještě žádná neletí
// (letí-li už na všechny, tak nejbližší vůbec). Bez nepřátel bedna v dosahu. null = není na co letět.
function cilSvetlusky(hra, st, od, obsazene) {
  const { hrdina } = hra;
  let volny = null;
  let volnyD = Infinity;
  let jakykoli = null;
  let jakykoliD = Infinity;
  for (const n of hra.nepratele) {
    if (n.hp <= 0 || !viditelny(n) || vzdalenost(n, hrdina) > st.dosah) continue;
    const d = vzdalenost(n, od);
    if (d < jakykoliD) { jakykoli = n; jakykoliD = d; }
    if (!obsazene.has(n) && d < volnyD) { volny = n; volnyD = d; }
  }
  if (volny ?? jakykoli) return { cil: volny ?? jakykoli, bedna: false };
  let bedna = null;
  let bednaD = Infinity;
  for (const b of hra.bedny) {
    if (b.rozbita || vzdalenost(b, hrdina) > st.dosah) continue;
    const d = vzdalenost(b, od) + (obsazene.has(b) ? 1e6 : 0);
    if (d < bednaD) { bedna = b; bednaD = d; }
  }
  return bedna ? { cil: bedna, bedna: true } : null;
}

// Roj světlušek: doplní se na počet podle úrovně, odpočaté vyletí, letící zatáčí k cíli a po zásahu se vrátí.
// Zpátky letí aspoň o polovinu rychleji než hrdina, ať ho vždycky doženou.
function rojSvetlusek(hra, dt, s) {
  const roj = hra.svetlusky;
  if (!hra.zbrane.svetlusky) {
    roj.length = 0;
    return;
  }
  const st = s.svetlusky;
  const { hrdina } = hra;
  // Nová světluška vylétne z hrdiny a první let si dá o chvilku později než ta před ní (ne všechny naráz).
  while (roj.length < st.pocet) {
    roj.push({ x: hrdina.x, y: hrdina.y, vx: 0, vy: 0, stav: 'kolem', cil: null, bedna: false, nabiti: 0.15 * roj.length, let: 0 });
  }
  if (roj.length > st.pocet) roj.length = st.pocet;
  const obsazene = new Set(roj.filter((l) => l.stav === 'leti').map((l) => l.cil));
  const platny = (l) => (l.bedna ? !l.cil.rozbita : l.cil.hp > 0 && viditelny(l.cil)) && vzdalenost(l.cil, hrdina) <= st.dosah * 1.5;
  roj.forEach((l, i) => {
    const doma = mistoSvetlusky(hra, i, roj.length);
    if (l.stav === 'kolem') {
      const k = Math.min(1, 14 * dt);
      l.x += (doma.x - l.x) * k;
      l.y += (doma.y - l.y) * k;
      l.nabiti -= dt;
      if (l.nabiti > 0) return;
      const vyber = cilSvetlusky(hra, st, l, obsazene);
      if (!vyber) return;
      Object.assign(l, { stav: 'leti', cil: vyber.cil, bedna: vyber.bedna, let: 0 });
      obsazene.add(vyber.cil);
      // Vyletí ven z roje (od hrdiny) a k cíli teprve zatočí.
      const d = vzdalenost(l, hrdina);
      l.vx = (d > 0 ? (l.x - hrdina.x) / d : 1) * st.rychlost;
      l.vy = (d > 0 ? (l.y - hrdina.y) / d : 0) * st.rychlost;
      return;
    }
    if (l.stav === 'leti') {
      l.let += dt;
      if (!platny(l)) {
        const novy = cilSvetlusky(hra, st, l, obsazene);
        if (novy) {
          Object.assign(l, { cil: novy.cil, bedna: novy.bedna });
          obsazene.add(novy.cil);
        } else l.stav = 'zpet';
      }
      if (l.let > MAX_LETU) l.stav = 'zpet';
    }
    if (l.stav === 'leti') {
      const c = l.cil;
      const dx = c.x - l.x;
      const dy = c.y - l.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dt * (OTACENI_SVETLUSKY + 30 * l.let));
      l.vx += ((dx / d) * st.rychlost - l.vx) * k;
      l.vy += ((dy / d) * st.rychlost - l.vy) * k;
      const v = Math.hypot(l.vx, l.vy) || 1;
      const kus = Math.min(st.rychlost * dt, d);
      l.x += (l.vx / v) * kus;
      l.y += (l.vy / v) * kus;
      if (vzdalenost(l, c) < (l.bedna ? POLOMER_BEDNY : c.polomer) + 5) {
        if (l.bedna) rozbij(hra, c);
        else {
          zasah(hra, c, st.poskozeni, false, 'svetlusky');
          otres(hra, c, st.otres);
          hra.zasahuSvetluskami += 1;
          zvuk(hra, 'svetlusky');
        }
        rozprsk(hra, l.x, l.y, 'svetluska', 3);
        // Ozvěna: světluška se nevrátí a hned se vrhne na dalšího nepřítele (jednou, pak už letí domů).
        const dalsi = !l.bedna && !l.ozvenou && hra.hrdina.ozvena > 0 && losPasiv(hra) < hra.hrdina.ozvena
          ? cilSvetlusky(hra, st, l, new Set([...obsazene, c])) : null;
        if (dalsi && !dalsi.bedna && dalsi.cil !== c) {
          Object.assign(l, { cil: dalsi.cil, bedna: false, let: 0, ozvenou: true });
          obsazene.add(dalsi.cil);
          hra.ozvenVystrelu += 1;
          dozvuk(hra, l.x, l.y);
        } else Object.assign(l, { stav: 'zpet', cil: null, bedna: false, ozvenou: false });
      }
      return;
    }
    // Návrat k místu v roji, pak odpočinek.
    const d = vzdalenost(l, doma);
    const kus = Math.max(st.rychlost * NAVRAT_SVETLUSKY, Math.hypot(hrdina.vx, hrdina.vy) * 1.5) * dt;
    if (d <= kus) {
      Object.assign(l, { x: doma.x, y: doma.y, vx: 0, vy: 0, stav: 'kolem', cil: null, bedna: false, nabiti: st.nabiti });
      return;
    }
    l.vx = ((doma.x - l.x) / d) * (kus / dt);
    l.vy = ((doma.y - l.y) / d) * (kus / dt);
    l.x += l.vx * dt;
    l.y += l.vy * dt;
  });
}

// O kolik mráz zpomalí nepřítele (bosse jen napůl). 1 = vůbec.
function brzdaMrazu(n) {
  if (!(n.mraz > 0)) return 1;
  return n.boss ? 1 - (1 - n.zpomaleniMrazem) / 2 : n.zpomaleniMrazem;
}

// Kam dopadnou nové krystaly: doprostřed největších hloučků viditelných nepřátel v dosahu (každý hlouček jinde
// a ne do zóny, která ještě mrzne). Hlouček se hledá kolem KANDIDATU_ZONY nejbližších nepřátel. Na co nezbyl
// hlouček, to dopadne na bednu v dosahu. Víc než MAX_ZON zón naráz nebude. Vrací, kolik krystalů dopadlo.
function hodKrystaly(hra, st) {
  const { hrdina } = hra;
  const volno = Math.min(st.pocet, MAX_ZON - hra.ledoveZony.length);
  if (volno <= 0) return 0;
  const obsazeno = hra.ledoveZony.map((z) => ({ x: z.x, y: z.y, polomer: z.polomer }));
  const mimo = (o) => obsazeno.every((z) => vzdalenost(z, o) >= Math.max(z.polomer, st.polomer));
  const blizko = hra.nepratele.filter((n) => n.hp > 0 && viditelny(n) && vzdalenost(n, hrdina) < st.dosah + st.polomer);
  const kandidati = blizko
    .filter((n) => vzdalenost(n, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina))
    .slice(0, KANDIDATU_ZONY);
  const mista = [];
  const pridej = (m) => {
    const misto = { x: m.x, y: m.y, polomer: st.polomer };
    mista.push(misto);
    obsazeno.push(misto);
  };
  while (mista.length < volno) {
    let hloucek = null;
    let kde = null;
    for (const k of kandidati) {
      if (!mimo(k)) continue;
      const kolem = blizko.filter((n) => vzdalenost(n, k) < st.polomer);
      if (!hloucek || kolem.length > hloucek.length) { hloucek = kolem; kde = k; }
    }
    if (!hloucek) break;
    // Střed hloučku posunutý k hrdinovi, a když by padl do jiné zóny, tak přímo na nepřítele, kolem kterého
    // se hledalo.
    const stred = {
      x: hloucek.reduce((a, n) => a + n.x, 0) / hloucek.length,
      y: hloucek.reduce((a, n) => a + n.y, 0) / hloucek.length,
    };
    const d = vzdalenost(stred, hrdina);
    const posun = d > 0 ? Math.min(st.polomer * PREDSTIH_ZONY, d / 2) / d : 0;
    stred.x -= (stred.x - hrdina.x) * posun;
    stred.y -= (stred.y - hrdina.y) * posun;
    pridej(mimo(stred) ? stred : kde);
  }
  const bedny = hra.bedny
    .filter((b) => !b.rozbita && vzdalenost(b, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina));
  for (const b of bedny) {
    if (mista.length >= volno) break;
    if (mimo(b)) pridej(b);
  }
  for (const m of mista) {
    hra.ledoveZony.push({
      x: m.x, y: m.y, polomer: st.polomer, trvani: st.trvani, stari: 0, poskozeni: st.poskozeni, zpomaleni: st.zpomaleni, doznivani: st.doznivani,
    });
    hra.zon += 1;
  }
  if (mista.length) zvuk(hra, 'mraz');
  return mista.length;
}

// Roztříštění: rána nepříteli v zóně. Obyčejný nepřítel, kterému zbude nanejvýš PRAH_ROZTRISTENI životů, se
// roztříští rovnou (číslo ukáže celou ránu) a rozletí se na ledové střepy.
function roztrist(hra, n, z) {
  zasah(hra, n, z.poskozeni, false, 'mraz');
  if (n.boss || n.hp <= 0 || n.hp > n.maxHp * PRAH_ROZTRISTENI) return;
  const zbytek = Math.ceil(n.hp);
  n.hp = 0;
  cisloZasahu(hra, n, zbytek);
  pripisRanu(hra, 'mraz', zbytek, true);
  hra.roztristeno += 1;
  rozprsk(hra, n.x, n.y, 'led', 4);
}

// Ledové zóny: krystal dopadne (ještě nic nedělá), zóna mrzne a zpomalí, kdo v ní stojí, čím dál víc
// (hned 60 % zpomalení, plné od 40 % mrznutí). Na konci se roztříští, rozbije i bednu a zmizí. S Ozvěnou se
// občas roztříští dvakrát (nový krystal by do hloučku v zóně stejně nedopadl).
function mrznouZony(hra, dt) {
  for (const z of hra.ledoveZony) {
    z.stari += dt;
    if (z.stari < DOPAD_KRYSTALU) continue;
    const t = Math.min(1, (z.stari - DOPAD_KRYSTALU) / z.trvani);
    const konec = z.stari >= DOPAD_KRYSTALU + z.trvani;
    const brzda = 1 - (1 - z.zpomaleni) * Math.min(1, 0.6 + t);
    for (const n of hra.nepratele) {
      if (n.hp <= 0 || !viditelny(n) || vzdalenost(n, z) >= z.polomer + n.polomer / 2) continue;
      n.zpomaleniMrazem = Math.min(n.mraz > 0 ? n.zpomaleniMrazem : 1, brzda);
      n.mraz = Math.max(n.mraz || 0, z.doznivani ?? DOZNIVANI_MRAZU);
      if (konec) roztrist(hra, n, z);
    }
    if (!konec) continue;
    for (const b of hra.bedny) {
      if (vzdalenost(b, z) < z.polomer + POLOMER_BEDNY / 2) rozbij(hra, b);
    }
    hra.roztristeni.push({ x: z.x, y: z.y, polomer: z.polomer, zivot: TRVANI_TRISTENI });
    zvuk(hra, 'trist');
    rozprsk(hra, z.x, z.y, 'led', 10);
    // Ozvěna (pasiva): zóna za ZPOZDENI_OZVENY zamrzne a roztříští se ještě jednou (podruhé už bez ozvěny).
    if (!z.ozvenou && hra.hrdina.ozvena > 0 && losPasiv(hra) < hra.hrdina.ozvena) {
      z.ozvenou = true;
      z.stari = DOPAD_KRYSTALU + z.trvani - ZPOZDENI_OZVENY;
      hra.ozvenVystrelu += 1;
      dozvuk(hra, z.x, z.y, true);
      continue;
    }
    z.hotovo = true;
  }
  hra.ledoveZony = hra.ledoveZony.filter((z) => !z.hotovo);
  for (const r of hra.roztristeni) r.zivot -= dt;
  hra.roztristeni = hra.roztristeni.filter((r) => r.zivot > 0);
}

// O kolik omráčení zpomalí: omráčený nepřítel stojí, boss jde napůl. 1 = není omráčený.
function brzdaZvonu(n) {
  if (!(n.omracen > 0)) return 1;
  return n.boss ? ZPOMALENI_OMRACENEHO_BOSSE : 0;
}

// Omráčený obyčejný nepřítel nekouše (boss ano, toho zvon jen zbrzdí).
export function nekouse(n) {
  return n.omracen > 0 && !n.boss;
}

// Zvon hlubin: zazvoní, když je nabitý a nedoznívají ozvěny minulého zvonění (zvoní pravidelně, i když kolem
// nikdo není). Každá vlna vyběhne z místa, kde hrdina při úderu stojí, a přes koho přejde, toho jednou zasáhne,
// odhodí a omráčí (je-li zrovna odolný, jen zasáhne). Rozbije i bedny, přes které přejde.
function zvon(hra, dt, s) {
  const zv = hra.zbrane.zvon;
  const { hrdina } = hra;
  hra.kyvZvonu = Math.max(0, hra.kyvZvonu - dt);
  if (zv) {
    const st = s.zvon;
    const uder = () => {
      hra.vlnyZvonu.push({
        x: hrdina.x, y: hrdina.y, r: 0, max: st.polomer, poskozeni: st.poskozeni, odhozeni: st.odhozeni, let: st.let,
        omraceni: st.omraceni, zasazeni: new Set(), ozvena: zv.ozveny > 0,
      });
      hra.zvoneni += 1;
      zvuk(hra, 'zvon', zv.ozveny > 0 ? 1 : 0);
      hra.kyvZvonu = KYV_ZVONU;
    };
    zv.nabiti = (zv.nabiti ?? 0) - dt;
    if (zv.ozveny > 0) {
      zv.doOzveny -= dt;
      if (zv.doOzveny <= 0) {
        uder();
        zv.ozveny -= 1;
        zv.doOzveny = OZVENA_ZVONU;
      }
    } else if (zv.nabiti <= 0) {
      zv.ozveny = 0;
      uder();
      zv.ozveny = st.pocet - 1;
      // Ozvěna (pasiva) přidá zvonění jednu vlnu navíc.
      if (hra.hrdina.ozvena > 0 && losPasiv(hra) < hra.hrdina.ozvena) {
        zv.ozveny += 1;
        hra.ozvenVystrelu += 1;
        dozvuk(hra, hrdina.x, hrdina.y, true);
      }
      zv.doOzveny = OZVENA_ZVONU;
      zv.nabiti = st.nabiti;
    }
  }
  for (const v of hra.vlnyZvonu) {
    const pred = v.r;
    v.r = Math.min(v.max, v.r + RYCHLOST_ZVUKU * dt);
    for (const n of hra.nepratele) {
      if (n.hp <= 0 || !viditelny(n) || v.zasazeni.has(n)) continue;
      const d = vzdalenost(n, v);
      if (d > v.r + n.polomer || d < pred - n.polomer) continue;
      v.zasazeni.add(n);
      zasah(hra, n, v.poskozeni, false, 'zvon');
      if (!(n.odolny > 0)) {
        odhodNepritele(n, v, v.odhozeni, v.let);
        n.omracen = v.omraceni;
        n.odolny = v.omraceni + IMUNITA_OMRACENI;
        hra.omraceno += 1;
      }
    }
    for (const b of hra.bedny) {
      if (!b.rozbita && vzdalenost(b, v) <= v.r + POLOMER_BEDNY) rozbij(hra, b);
    }
    if (v.r >= v.max) v.konec = true;
  }
  hra.vlnyZvonu = hra.vlnyZvonu.filter((v) => !v.konec);
}

// Rána koulí cepu podle její rychlosti (px/s): při RYCHLOST_RANY_CEPU plné poškození, rychlejší až dvojnásob,
// pomalejší nejméně polovina, pod MIN_RYCHLOST_CEPU nic.
export function ranaCepu(poskozeni, rychlost) {
  if (!(rychlost >= MIN_RYCHLOST_CEPU)) return 0;
  return poskozeni * Math.min(2, Math.max(0.5, rychlost / RYCHLOST_RANY_CEPU));
}

// Délka řetězu i-té koule (každá další je o RETEZ_DALSI delší, ať se koule nepletou).
export function delkaRetezu(st, i) {
  return st.retez * (1 + RETEZ_DALSI * i);
}

// Cep na řetězu: koule se doplní na počet podle úrovně (nová spadne za hrdinu), pak se hýbe sama: vestoje ji
// hrdina roztáčí kolem sebe (rychlost se blíží rychlosti po kruhu a řetěz se napne), za chůze se jen kutálí
// a brzdí (TRENI_CEPU) a řetěz ji táhne za hrdinou. Řetěz ji nepustí dál než na svou délku a ubere jí rychlost
// od hrdiny, rychlost do strany zůstane, a tak se na zatáčkách kývá. Kousek nad MIN_RYCHLOST_CEPU zraňuje,
// odhodí, kam letí (bosse ne), a rozbije bednu.
function cep(hra, dt, s) {
  const koule = hra.koule;
  if (!hra.zbrane.cep) {
    koule.length = 0;
    return;
  }
  const st = s.cep;
  const { hrdina } = hra;
  while (koule.length < st.pocet) {
    const i = koule.length;
    const uhel = (hrdina.otoceny > 0 ? Math.PI : 0) + i * 2.4;
    const L = delkaRetezu(st, i);
    koule.push({ x: hrdina.x + Math.cos(uhel) * L, y: hrdina.y + Math.sin(uhel) * L, vx: 0, vy: 0, rychlost: 0 });
  }
  if (koule.length > st.pocet) koule.length = st.pocet;
  const stoji = Math.hypot(hrdina.vx, hrdina.vy) < 1;
  koule.forEach((k, i) => {
    const L = delkaRetezu(st, i);
    if (stoji) {
      const dx = k.x - hrdina.x;
      const dy = k.y - hrdina.y;
      const d = Math.hypot(dx, dy);
      const ux = d > 0.5 ? dx / d : -hrdina.otoceny;
      const uy = d > 0.5 ? dy / d : 0;
      const kruh = st.rozmach * L;
      const napni = (L - d) * ROZTOCENI_CEPU;
      const k1 = Math.min(1, ROZTOCENI_CEPU * dt);
      k.vx += (-uy * kruh + ux * napni - k.vx) * k1;
      k.vy += (ux * kruh + uy * napni - k.vy) * k1;
    } else {
      const brzda = Math.exp(-TRENI_CEPU * dt);
      k.vx *= brzda;
      k.vy *= brzda;
    }
    const v = Math.hypot(k.vx, k.vy);
    if (v > MAX_RYCHLOST_CEPU) {
      k.vx *= MAX_RYCHLOST_CEPU / v;
      k.vy *= MAX_RYCHLOST_CEPU / v;
    }
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    const dx = k.x - hrdina.x;
    const dy = k.y - hrdina.y;
    const d = Math.hypot(dx, dy);
    if (d > L) {
      const ux = dx / d;
      const uy = dy / d;
      k.x = hrdina.x + ux * L;
      k.y = hrdina.y + uy * L;
      const od = (k.vx - hrdina.vx) * ux + (k.vy - hrdina.vy) * uy;
      if (od > 0) {
        k.vx -= od * ux;
        k.vy -= od * uy;
      }
    }
    k.rychlost = Math.hypot(k.vx, k.vy);
    const rana = ranaCepu(st.poskozeni, k.rychlost);
    if (!(rana > 0)) return;
    const smerX = k.vx / k.rychlost;
    const smerY = k.vy / k.rychlost;
    for (const n of hra.nepratele) {
      if (n.zasahCepem > 0 || n.hp <= 0 || !viditelny(n) || vzdalenost(n, k) >= n.polomer + st.velikost) continue;
      zasah(hra, n, rana, false, 'cep');
      n.zasahCepem = ZASAH_CEPEM;
      zvuk(hra, 'cep');
      hra.zasahuCepem += 1;
      ozvenaZasahu(hra, n, rana, false, 'cep');
      odhodNepritele(n, { x: n.x - smerX * 10, y: n.y - smerY * 10 }, st.odhozeni, st.let);
      rozprsk(hra, (n.x + k.x) / 2, (n.y + k.y) / 2, 'cep', 3);
    }
    for (const b of hra.bedny) {
      if (!b.rozbita && vzdalenost(b, k) < POLOMER_BEDNY + st.velikost) rozbij(hra, b);
    }
  });
}

// Nová semínka padnou za hrdinu (proti směru, kterým jde), víc semínek vedle sebe napříč. Vestoje padnou kolem
// nohou, každé zasetí jinde po kruhu (o zlatý úhel dál), ať keře nerostou jeden v druhém.
function zasejSeminka(hra, st) {
  const { hrdina } = hra;
  const v = Math.hypot(hrdina.vx, hrdina.vy);
  const uhel = hra.zaseto * 2.4;
  const ux = v >= 1 ? -hrdina.vx / v : Math.cos(uhel);
  const uy = v >= 1 ? -hrdina.vy / v : Math.sin(uhel);
  const za = v >= 1 ? 10 : 14;
  hra.zaseto += 1;
  for (let i = 0; i < st.pocet; i++) {
    const bok = (i - (st.pocet - 1) / 2) * ROZESTUP_SEMINEK;
    hra.seminka.push({
      x: hrdina.x + ux * za - uy * bok, y: hrdina.y + uy * za + ux * bok, stari: 0, vybuchlo: false, tik: 0,
      polomer: st.polomer, poskozeni: st.poskozeni, trvani: st.trvani, pichnuti: st.pichnuti, kazdych: st.tik,
    });
  }
  if (hra.seminka.length > MAX_SEMINEK) hra.seminka.splice(0, hra.seminka.length - MAX_SEMINEK);
}

// Semínka zrají, po ZRANI_SEMINKA vybuchnou (rána všem v poloměru, rozbije bedny) a vyroste z nich keř. Keř
// každý tik píchne každého, kdo v něm stojí, a po trvani zvadne.
function rostouSeminka(hra, dt, s) {
  const sm = hra.zbrane.seminka;
  if (sm) {
    sm.nabiti = (sm.nabiti ?? 0) - dt;
    if (sm.nabiti <= 0) {
      zasejSeminka(hra, s.seminka);
      sm.nabiti = s.seminka.nabiti;
      ozvi(hra, sm);
    }
    ozvenaVystrelu(hra, sm, dt, () => {
      zasejSeminka(hra, s.seminka);
      return true;
    });
  }
  for (const p of hra.seminka) {
    p.stari += dt;
    if (p.stari < ZRANI_SEMINKA) continue;
    if (!p.vybuchlo) {
      p.vybuchlo = true;
      p.tik = p.kazdych;
      hra.vybuchlo += 1;
      zvuk(hra, 'seminka');
      for (const n of hra.nepratele) {
        if (n.hp > 0 && viditelny(n) && vzdalenost(n, p) < p.polomer + n.polomer / 2) zasah(hra, n, p.poskozeni, false, 'seminka');
      }
      for (const b of hra.bedny) {
        if (!b.rozbita && vzdalenost(b, p) < p.polomer + POLOMER_BEDNY / 2) rozbij(hra, b);
      }
      hra.vybuchySeminek.push({ x: p.x, y: p.y, polomer: p.polomer, zivot: TRVANI_VYBUCHU_SEMINKA });
      rozprsk(hra, p.x, p.y, 'seminko', 8);
      continue;
    }
    p.tik -= dt;
    if (p.tik > 0) continue;
    p.tik = p.kazdych;
    const r = p.polomer * POMER_KERE;
    for (const n of hra.nepratele) {
      if (n.hp > 0 && viditelny(n) && vzdalenost(n, p) < r + n.polomer / 2) zasah(hra, n, p.pichnuti, false, 'seminka');
    }
  }
  hra.seminka = hra.seminka.filter((p) => p.stari < ZRANI_SEMINKA + p.trvani);
  for (const v of hra.vybuchySeminek) v.zivot -= dt;
  hra.vybuchySeminek = hra.vybuchySeminek.filter((v) => v.zivot > 0);
}

// O kolik kořeny zpomalí: držený nepřítel stojí, boss jde napůl. 1 = nedrží ho.
function brzdaKorenu(n) {
  if (!(n.drzen > 0)) return 1;
  return n.boss ? ZPOMALENI_DRZENEHO_BOSSE : 0;
}

// Koho kořen smí chytit: viditelného živého nepřítele, kterého zrovna nic nedrží a není po puštění odolný.
function chytitelny(n) {
  return n.hp > 0 && viditelny(n) && !(n.drzen > 0) && !(n.vyrvan > 0);
}

// Cíle nových kořenů: nejbližší chytitelní nepřátelé v dosahu, na které už neběží jiný kořen, každý jinde (kdo
// stojí v poloměru už vybraného, ten se přeskočí). Na co nezbyl nepřítel, to běží pod nejbližší bednu v dosahu.
function cileKorenu(hra, st) {
  const { hrdina } = hra;
  const obsazene = new Set(hra.korene.filter((k) => k.faze === 'bezi').map((k) => k.cil));
  const cile = [];
  const volno = (o) => !obsazene.has(o) && cile.every((c) => vzdalenost(c, o) >= st.polomer);
  const kandidati = hra.nepratele
    .filter((n) => chytitelny(n) && vzdalenost(n, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina));
  for (const n of kandidati) {
    if (cile.length >= st.pocet) break;
    if (volno(n)) cile.push(n);
  }
  const bedny = hra.bedny
    .filter((b) => !b.rozbita && vzdalenost(b, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina));
  for (const b of bedny) {
    if (cile.length >= st.pocet) break;
    if (volno(b)) cile.push(b);
  }
  return cile;
}

// Nové kořeny vyběhnou od hrdiny, každý za svým cílem. Vrací, kolik jich vyběhlo (bez cíle čeká nabitý).
function vypustKoreny(hra, st) {
  const { hrdina } = hra;
  const cile = cileKorenu(hra, st);
  for (const cil of cile) {
    hra.korene.push({
      x: hrdina.x, y: hrdina.y, cil, naBednu: hra.bedny.includes(cil), faze: 'bezi', beh: 0, zivot: 0, cesta: [{ x: hrdina.x, y: hrdina.y }],
      dosah: st.dosah, polomer: st.polomer, trvani: st.trvani, poskozeni: st.poskozeni, svirani: st.svirani,
    });
  }
  if (hra.korene.length > MAX_KORENU) hra.korene.splice(0, hra.korene.length - MAX_KORENU);
  return cile.length;
}

// Nejbližší chytitelný nepřítel od špičky kořene (v dosahu od hrdiny), když mu původní cíl zmizel.
function novyCilKorene(hra, k) {
  let nej = null;
  let nejD = Infinity;
  for (const n of hra.nepratele) {
    if (!chytitelny(n) || vzdalenost(n, hra.hrdina) >= k.dosah) continue;
    const d = vzdalenost(n, k);
    if (d < nejD) { nej = n; nejD = d; }
  }
  return nej;
}

// Kořen vyrazí ze země: rána všem v poloměru a koho smí chytit, toho drží (a odhození s ním přestane hýbat).
// Rozbije bedny v poloměru.
function vyrazKoren(hra, k) {
  zvuk(hra, 'korene');
  k.faze = 'drzi';
  k.zivot = k.trvani;
  k.cil = null;
  for (const n of hra.nepratele) {
    if (n.hp <= 0 || !viditelny(n) || vzdalenost(n, k) >= k.polomer + n.polomer / 2) continue;
    const chytit = chytitelny(n);
    zasah(hra, n, k.poskozeni, false, 'korene');
    if (!chytit) continue;
    n.drzen = k.trvani;
    n.vyrvan = k.trvani + IMUNITA_KORENU;
    n.svirani = k.svirani;
    n.tikKorenu = TIK_KORENU;
    n.odhozen = 0;
    hra.drzeno += 1;
  }
  for (const b of hra.bedny) {
    if (!b.rozbita && vzdalenost(b, k) < k.polomer + POLOMER_BEDNY / 2) rozbij(hra, b);
  }
  rozprsk(hra, k.x, k.y, 'korene', 7);
}

// Kořeny: nabité vyběhnou za cíli, v zemi běží za svým cílem (když zmizí nebo ho chytil jiný kořen, vezmou
// nejbližší jiný) a za sebou nechávají prasklou zem (cesta). U cíle, bez cíle nebo po MAX_BEHU_KORENE s
// vyrazí. Vyražené kořeny stojí, dokud drží. Koho drží, toho každý tik sevřou (schovaného ducha ne).
function rostouKoreny(hra, dt, s) {
  const kr = hra.zbrane.korene;
  if (kr) {
    kr.nabiti = (kr.nabiti ?? 0) - dt;
    if (kr.nabiti <= 0 && vypustKoreny(hra, s.korene)) {
      kr.nabiti = s.korene.nabiti;
      ozvi(hra, kr);
    }
    ozvenaVystrelu(hra, kr, dt, () => vypustKoreny(hra, s.korene));
  }
  const krok = RYCHLOST_KORENE * dt;
  for (const k of hra.korene) {
    if (k.faze === 'drzi') {
      k.zivot -= dt;
      continue;
    }
    k.beh += dt;
    const platny = k.cil && (k.naBednu ? !k.cil.rozbita : chytitelny(k.cil));
    if (!platny) {
      k.cil = novyCilKorene(hra, k);
      k.naBednu = false;
    }
    if (k.cil) {
      const d = vzdalenost(k, k.cil);
      if (d <= krok) {
        k.x = k.cil.x;
        k.y = k.cil.y;
        vyrazKoren(hra, k);
        continue;
      }
      k.x += ((k.cil.x - k.x) / d) * krok;
      k.y += ((k.cil.y - k.y) / d) * krok;
    }
    if (!k.cil || k.beh >= MAX_BEHU_KORENE) {
      vyrazKoren(hra, k);
      continue;
    }
    if (vzdalenost(k.cesta[k.cesta.length - 1], k) >= STOPA_KORENE) k.cesta.push({ x: k.x, y: k.y });
  }
  hra.korene = hra.korene.filter((k) => k.faze === 'bezi' || k.zivot > 0);
  for (const n of hra.nepratele) {
    if (!(n.drzen > 0) || n.hp <= 0) continue;
    n.tikKorenu -= dt;
    if (n.tikKorenu > 0) continue;
    n.tikKorenu += TIK_KORENU;
    if (viditelny(n)) zasah(hra, n, n.svirani, false, 'korene');
  }
}

// Ohnivá stopa: pod nohama vzplane nový plamen, když je hrdina od posledního aspoň rozestup daleko (nebo poslední
// už dohořel), jinak plamen pod nohama hoří dál od začátku. Plamen rozbije bednu, které se dotkne. Kdo stojí
// v ohni, toho každý tik spálí (jednou, ať stojí v kolika plamenech chce), a od 4. úrovně ho oheň zapálí: po
// vylezení ještě hori s hoří a každý tik ho pálí slabší pali. Zásah ohněm nepřítele rozžhaví (jako žár lucerny).
function ohnivaStopa(hra, dt, s) {
  const { hrdina } = hra;
  if (hra.zbrane.stopa) {
    const st = s.stopa;
    const posledni = hra.posledniPlamen;
    const cisla = { trvani: st.trvani, polomer: st.polomer, poskozeni: st.poskozeni, pali: st.pali, hori: st.hori };
    // Kudy hrdina naposledy šel (podle toho leží další řady plamenů z Přívalu napříč).
    const v = Math.hypot(hrdina.vx, hrdina.vy);
    if (v >= 1) hra.smerStopy = { x: hrdina.vx / v, y: hrdina.vy / v };
    if (posledni && posledni.zivot > 0 && vzdalenost(posledni, hrdina) < st.polomer * ROZESTUP_STOPY) {
      Object.assign(posledni, cisla, { zivot: st.trvani });
      for (const b of posledni.bocni ?? []) Object.assign(b, cisla, { zivot: st.trvani });
    } else {
      const novy = { x: hrdina.x, y: hrdina.y, stari: 0, zivot: st.trvani, poradi: hra.plamenu, ...cisla };
      hra.plameny.push(novy);
      hra.posledniPlamen = novy;
      hra.plamenu += 1;
      // Příval: další řady hoří vedle hlavní, střídavě vpravo a vlevo (1., −1., 2. řada …).
      const smer = hra.smerStopy ?? { x: 1, y: 0 };
      novy.bocni = [];
      for (let i = 1; i < st.stop; i++) {
        const posun = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * st.polomer * ROZESTUP_RAD;
        const bocni = { x: hrdina.x - smer.y * posun, y: hrdina.y + smer.x * posun, stari: 0, zivot: st.trvani, poradi: hra.plamenu, ...cisla };
        hra.plameny.push(bocni);
        novy.bocni.push(bocni);
        hra.plamenu += 1;
      }
      if (hra.plameny.length > MAX_PLAMENU) hra.plameny.splice(0, hra.plameny.length - MAX_PLAMENU);
    }
  }
  for (const p of hra.plameny) {
    p.zivot -= dt;
    p.stari += dt;
  }
  hra.plameny = hra.plameny.filter((p) => p.zivot > 0);
  if (hra.posledniPlamen && !(hra.posledniPlamen.zivot > 0)) hra.posledniPlamen = null;
  // Kdo je mimo obdélník kolem všech plamenů, ten v žádném nestojí (ať se nemusí měřit ke každému).
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let r = 0;
  for (const p of hra.plameny) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
    r = Math.max(r, p.polomer);
    for (const b of hra.bedny) {
      if (!b.rozbita && vzdalenost(b, p) < p.polomer + POLOMER_BEDNY / 2) rozbij(hra, b);
    }
  }
  const tik = s.stopa.tik;
  for (const n of hra.nepratele) {
    if (n.hp <= 0 || !viditelny(n)) continue;
    let plamen = null;
    const okraj = r + n.polomer;
    if (n.x > x0 - okraj && n.x < x1 + okraj && n.y > y0 - okraj && n.y < y1 + okraj) {
      for (const p of hra.plameny) {
        const dosah = p.polomer + n.polomer / 2;
        const dx = n.x - p.x;
        const dy = n.y - p.y;
        if (dx * dx + dy * dy < dosah * dosah) {
          plamen = p;
          break;
        }
      }
    }
    n.vOhni = Boolean(plamen);
    if (plamen && plamen.hori > 0) {
      if (!(n.hori > 0)) hra.zapaleno += 1;
      n.hori = Math.max(n.hori, plamen.hori);
      n.pali = plamen.pali;
    }
    if ((!plamen && !(n.hori > 0)) || n.tikOhne > 0) continue;
    n.tikOhne = tik;
    const rana = plamen ? plamen.poskozeni : n.pali;
    zasah(hra, n, rana, true, 'stopa');
    ozvenaZasahu(hra, n, rana, true, 'stopa');
    hra.paleniStopou += 1;
    zvuk(hra, 'stopa');
  }
}

// Nejbližší viditelný živý nepřítel, kterého kámen ještě nezasáhl, nanejvýš doKolika px od kamene.
function dalsiCilKamene(hra, k, doKolika) {
  let nej = null;
  let nejD = doKolika;
  for (const n of hra.nepratele) {
    if (n.hp <= 0 || !viditelny(n) || k.zasazeni.has(n)) continue;
    const d = vzdalenost(n, k);
    if (d < nejD) { nej = n; nejD = d; }
  }
  return nej;
}

// Prak vystřelí na nejbližší nepřátele v dosahu (každý kámen na jiného), a když žádný není, jedním kamenem na
// nejbližší bednu. Vrací, kolik kamenů vyletělo (bez cíle čeká nabitý).
function vystrelKameny(hra, st) {
  const { hrdina } = hra;
  const cile = hra.nepratele
    .filter((n) => n.hp > 0 && viditelny(n) && vzdalenost(n, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina))
    .slice(0, st.pocet);
  const bedna = cile.length ? null : nejblizsiBedna(hra, st.dosah);
  if (bedna) cile.push(bedna);
  for (const cil of cile) {
    const d = vzdalenost(cil, hrdina) || 1;
    hra.oblazky.push({
      x: hrdina.x, y: hrdina.y, vx: ((cil.x - hrdina.x) / d) * RYCHLOST_KAMENE, vy: ((cil.y - hrdina.y) / d) * RYCHLOST_KAMENE,
      cil, naBednu: cil === bedna, zasazeni: new Set(), zasahu: 0, zbyva: 1 + st.odrazy, poskozeni: st.poskozeni, skok: st.skok,
      zivot: st.zivot ?? ZIVOT_KAMENE, volny: st.volny ?? VOLNY_LET, volnyLet: st.volny ?? VOLNY_LET, bezCile: 0, ulet: 0, konec: false,
    });
    hra.vystreleno += 1;
  }
  if (hra.oblazky.length > MAX_KAMENU) hra.oblazky.splice(0, hra.oblazky.length - MAX_KAMENU);
  return cile.length;
}

// Kámen zasáhl nepřítele: rána roste s každým odrazem. Když má ještě odrazy, zrychlí a vezme nejbližšího
// nezasaženého do skok px, a když žádný není, odletí od zasaženého pryč. Poslední zásah ho shodí.
function zasahKamenem(hra, k, n) {
  zasah(hra, n, k.poskozeni * (1 + RUST_RANY_KAMENE * k.zasahu), false, 'prak');
  k.zasazeni.add(n);
  k.zasahu += 1;
  k.zbyva -= 1;
  hra.zasahuKamenem += 1;
  zvuk(hra, 'kamen', k.zasahu);
  if (k.zasahu > 1) hra.odrazu += 1;
  rozprsk(hra, k.x, k.y, 'oblazek', 4);
  if (k.zbyva <= 0) {
    k.konec = true;
    return;
  }
  const rychlost = Math.min(MAX_RYCHLOST_KAMENE, Math.hypot(k.vx, k.vy) * ZRYCHLENI_KAMENE);
  k.cil = dalsiCilKamene(hra, k, k.skok);
  k.naBednu = false;
  k.volny = k.volnyLet ?? VOLNY_LET;
  // Bez dalšího cíle se odrazí od zasaženého pryč (kdo stojí přesně na něm, letí dál, kam letěl).
  const od = vzdalenost(k, n);
  const [dx, dy] = k.cil ? [k.cil.x - k.x, k.cil.y - k.y] : od > 1e-6 ? [k.x - n.x, k.y - n.y] : [k.vx, k.vy];
  const d = Math.hypot(dx, dy) || 1;
  k.vx = (dx / d) * rychlost;
  k.vy = (dy / d) * rychlost;
}

// Prak a kameny v letu. Kámen míří za svým cílem (zmizí-li, vezme nejbližšího nezasaženého do skok px), bez cíle
// letí rovně a do VOLNY_LET s spadne. Narazí do prvního nezasaženého nepřítele, kterého potká (svůj cíl má
// přednost), bednu po cestě rozbije, od skály se odrazí. Dopadlé kameny chvíli padají na zem (jen na pohled).
function letiKameny(hra, dt, s) {
  const pr = hra.zbrane.prak;
  if (pr) {
    pr.nabiti = (pr.nabiti ?? 0) - dt;
    if (pr.nabiti <= 0 && vystrelKameny(hra, s.prak)) {
      pr.nabiti = s.prak.nabiti;
      ozvi(hra, pr);
    }
    ozvenaVystrelu(hra, pr, dt, () => vystrelKameny(hra, s.prak));
  }
  for (const k of hra.oblazky) {
    k.zivot -= dt;
    k.bezCile -= dt;
    const platny = k.cil && (k.naBednu ? !k.cil.rozbita : k.cil.hp > 0 && viditelny(k.cil) && !k.zasazeni.has(k.cil));
    if (!platny) k.cil = null;
    if (!k.cil && k.bezCile <= 0) {
      k.cil = dalsiCilKamene(hra, k, k.skok);
      k.naBednu = false;
    }
    // Za svým cílem letí nanejvýš k jeho středu (při dlouhém snímku by ho jinak přeletěl a kmital kolem něj).
    const v = Math.hypot(k.vx, k.vy) || RYCHLOST_KAMENE;
    let krok = v * dt;
    if (k.cil) {
      const d = vzdalenost(k, k.cil) || 1;
      k.vx = ((k.cil.x - k.x) / d) * v;
      k.vy = ((k.cil.y - k.y) / d) * v;
      krok = Math.min(krok, d);
    } else {
      k.volny -= dt;
    }
    k.x += (k.vx / v) * krok;
    k.y += (k.vy / v) * krok;
    k.ulet += krok;
    const narazil = (n) => n.hp > 0 && viditelny(n) && !k.zasazeni.has(n) && vzdalenost(n, k) < n.polomer + POLOMER_KAMENE;
    const zasazen = k.cil && !k.naBednu && narazil(k.cil) ? k.cil : hra.nepratele.find(narazil);
    if (zasazen) zasahKamenem(hra, k, zasazen);
    for (const b of hra.bedny) {
      if (b.rozbita || vzdalenost(b, k) >= POLOMER_BEDNY + POLOMER_KAMENE) continue;
      rozbij(hra, b);
      if (k.cil === b) k.cil = null;
    }
    const skala = vytlacZPrekazek(hra.mapa, k, POLOMER_KAMENE);
    if (skala) {
      const doSkaly = k.vx * skala.x + k.vy * skala.y;
      if (doSkaly < 0) {
        k.vx -= 2 * doSkaly * skala.x;
        k.vy -= 2 * doSkaly * skala.y;
        hra.odSkal += 1;
        rozprsk(hra, k.x, k.y, 'oblazek', 3);
      }
      k.cil = null;
      k.bezCile = BEZ_CILE_PO_SKALE;
    }
    if (k.konec || k.zivot <= 0 || k.volny <= 0) {
      k.konec = true;
      hra.padleKameny.push({ x: k.x, y: k.y, vx: k.vx * 0.2, vy: k.vy * 0.2, zivot: PAD_KAMENE, ulet: k.ulet });
    }
  }
  hra.oblazky = hra.oblazky.filter((k) => !k.konec);
  for (const p of hra.padleKameny) {
    p.zivot -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  hra.padleKameny = hra.padleKameny.filter((p) => p.zivot > 0);
  if (hra.padleKameny.length > MAX_KAMENU) hra.padleKameny.splice(0, hra.padleKameny.length - MAX_KAMENU);
}

// Výbava bossů. Po každé změně výbavy se spočítá znovu, co celá dává (ucinekVystroje), a do vlastností hrdiny
// se promítne jen rozdíl proti minulému stavu: životy přičíst (přibyté i doléčí), násobky vydělit starým
// a vynásobit novým, zbroj nastavit. Sundaný kus tak vrátí hrdinu přesně tam, kde byl.
function prepocitejVystroj(hra) {
  const { hrdina } = hra;
  const stary = hra.ucinekVystroje;
  const novy = ucinekVystroje(hra.vystroj);
  const navic = novy.nasobky.maxHp - stary.nasobky.maxHp;
  hrdina.maxHp += navic;
  hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + Math.max(0, navic));
  for (const vlastnost of ['sila', 'nabijeni', 'rychlost', 'magnet']) {
    hrdina[vlastnost] *= novy.nasobky[vlastnost] / stary.nasobky[vlastnost];
  }
  hrdina.zbroj = novy.nasobky.zbroj;
  // Rázová vlna vyběhne poprvé hned po nasazení, ať je vidět, co kus umí.
  if (novy.efekty.vlna && !stary.efekty.vlna) hra.doVlnyHrdiny = PRVNI_VLNA_HRDINY;
  hra.ucinekVystroje = novy;
}

// Kus do slotu (co tam bylo, zmizí). Exportované kvůli simulaci.
export function nasadKus(hra, kus) {
  hra.vystroj[kus.slot] = kus;
  prepocitejVystroj(hra);
}

export function sundejKus(hra, slot) {
  hra.vystroj[slot] = null;
  prepocitejVystroj(hra);
}

// Kus z truhly: do volného slotu se rovnou nasadí, u obsazeného čeká na rozhodnutí (rozhodniKus).
export function ziskejKus(hra, kus) {
  hra.nalezy.push(kus);
  const nasazeny = hra.vystroj[kus.slot];
  if (!nasazeny) {
    nasadKus(hra, kus);
    hra.truhlaKus = kus;
    return;
  }
  hra.truhlaKus = null;
  hra.porovnani = { novy: kus, nasazeny };
}

// Vzít (vzit = true) nasadí nový kus, Nechat nechá ten starý. Kus, který hrdina nenechal, se rozloží na zlaťáky.
export function rozhodniKus(hra, vzit) {
  const p = hra.porovnani;
  if (!p) return;
  const nechany = vzit ? p.nasazeny : p.novy;
  if (vzit) nasadKus(hra, p.novy);
  const zlata = zlatakyZaKus(nechany);
  pridejZlataky(hra, zlata, 'vybava');
  hra.zlatakyZVybavy += zlata;
  hra.rozlozeno += 1;
  hra.porovnani = null;
}

// Dotyk truhly: kus se vylosuje hned (animace otevření ho ukáže), svět stojí, dokud se truhla neotevře.
// Kus je ze sady bosse, u hlavního bosse mapy ze sady toho, z koho vychází (Lávový obr dá kus Kamenného obra).
function otevriTruhlu(hra, p) {
  const od = Object.hasOwn(BOSSOVE, p.od) ? p.od : 'strazce';
  const kus = losujKus(zakladBosse(od), hra.rng.dalsi(), hra.rng.dalsi(), hra.hrozba, hra.hrdina.stesti);
  hra.otevira = { x: p.x, y: p.y, od, kus, cas: 0 };
  zvuk(hra, 'truhla');
}

// Truhla je otevřená: kus výbavy (nasadí se, nebo čeká na porovnání) a k tomu karta aspoň vzácná jako dřív.
function dokonciTruhlu(hra) {
  const { od, kus } = hra.otevira;
  hra.otevira = null;
  ziskejKus(hra, kus);
  hra.volby = nabidka(hra, 'vzacna');
  hra.zTruhly = true;
  hra.truhlaOd = od;
  hra.oznameni = { text: t('hra.vybavaBosse', { kus: kus.nazev }), zivot: 2 };
}

// Odhodí nepřítele od bodu (x, y) o kolik px (bosse ne, ti jsou moc těžcí).
// Odhození od místa od o kolik px. trvani = jak dlouho letí (rychlost je pořád kolik / TRVANI_ODHOZENI, takže
// s delším trváním z Výdrže doletí dál).
function odhodNepritele(n, od, kolik, trvani = TRVANI_ODHOZENI) {
  if (n.boss) return;
  const d = vzdalenost(n, od);
  const ux = d > 0 ? (n.x - od.x) / d : 1;
  const uy = d > 0 ? (n.y - od.y) / d : 0;
  n.odhozen = trvani;
  n.odhozVx = (ux * kolik) / TRVANI_ODHOZENI;
  n.odhozVy = (uy * kolik) / TRVANI_ODHOZENI;
}

// Rázová vlna (výbava Strážce): každých pár sekund vyběhne od hrdiny kruh, každého zasáhne jednou, odhodí ho
// a rozbije bedny, přes které přejde.
function razoveVlny(hra, dt) {
  const { hrdina } = hra;
  const vlna = hra.ucinekVystroje.efekty.vlna;
  if (vlna) {
    hra.doVlnyHrdiny -= dt;
    if (hra.doVlnyHrdiny <= 0) {
      hra.vlnyHrdiny.push({ x: hrdina.x, y: hrdina.y, r: 0, max: vlna.polomer, poskozeni: vlna.poskozeni, odhozeni: vlna.odhozeni, zasazeni: new Set() });
      hra.doVlnyHrdiny = vlna.kazdych;
      hra.efektyPouzito.vlna += 1;
      hra.tres = Math.max(hra.tres, TRVANI_TRESU / 2);
    }
  }
  for (const v of hra.vlnyHrdiny) {
    const pred = v.r;
    v.r = Math.min(v.max, v.r + RYCHLOST_VLNY_HRDINY * dt);
    for (const n of hra.nepratele) {
      if (n.hp <= 0 || !viditelny(n) || v.zasazeni.has(n)) continue;
      const d = vzdalenost(n, v);
      if (d > v.r + n.polomer || d < pred - n.polomer) continue;
      v.zasazeni.add(n);
      zasah(hra, n, v.poskozeni, false, 'vlna');
      odhodNepritele(n, v, v.odhozeni);
    }
    for (const b of hra.bedny) {
      if (vzdalenost(b, v) <= v.r + POLOMER_BEDNY) rozbij(hra, b);
    }
    if (v.r >= v.max) v.konec = true;
  }
  hra.vlnyHrdiny = hra.vlnyHrdiny.filter((v) => !v.konec);
}

// Kamenná kůže (výbava Obra): dotyk nepřítele bolí míň a nepřítel odletí (boss jen bolí míň).
function ranaDotykem(hra, n) {
  const kuze = hra.ucinekVystroje.efekty.kuze;
  if (!kuze) return n.poskozeni;
  hra.efektyPouzito.kuze += 1;
  if (!n.boss) {
    odhodNepritele(n, hra.hrdina, kuze.odhozeni);
    rozprsk(hra, (n.x + hra.hrdina.x) / 2, (n.y + hra.hrdina.y) / 2, 'kamen', 4);
  }
  return Math.max(1, Math.round(n.poskozeni * (1 - kuze.snizeni)));
}

// Zapředený nepřítel stojí, boss v síti jde napůl. 1 = bez sítě.
function brzdaSite(n) {
  if (!(n.zapreden > 0)) return 1;
  return n.boss ? ZPOMALENI_SITE_BOSSE : 0;
}

// Sloty výbavy pro HUD a menu: v pořadí slotů, prázdný slot je null.
export function seznamVystroje(hra) {
  return PORADI_SLOTU.map((slot) => ({ slot, kus: hra.vystroj?.[slot] ?? null }));
}

// Kupec: přijede, když je čas a žádný boss nežije ani nepřijde dřív, než by kupec odjel. Na louce stojí
// KUPEC.trvani s (odpočet běží jen ve hře, ne v otevřeném obchodě). Dotyk vozu otevře obchod.
function jedeKupec(hra, dt, sirka, vyska) {
  const { hrdina } = hra;
  const k = hra.kupec;
  if (k) {
    k.zbyva -= dt;
    if (k.zbyva <= 0) {
      hra.kupec = null;
      hra.oznameni = { text: t('hra.kupec.odjel'), zivot: 2 };
      return;
    }
    const d = vzdalenost(k, hrdina);
    if (d > KUPEC.odchod) k.zavreno = false;
    else if (d < KUPEC.dosah && !k.zavreno) {
      k.zavreno = true;
      k.navstev += 1;
      hra.obchod = true;
      hra.posledniNakup = null;
    }
    return;
  }
  if (hra.cas < hra.dalsiKupec || hra.nepratele.some((n) => n.boss) || hra.dalsiBoss - hra.cas < KUPEC.trvani) return;
  const { x, y } = mimoPrekazky(hra, zaOkrajem(hra, sirka, vyska, KUPEC.okraj, KUPEC.pasmo), ODSTUP_OD_PREKAZEK.vuz);
  hra.kupec = {
    x, y, zbyva: KUPEC.trvani, prijel: hra.cas, zavreno: false, navstev: 0,
    zasoba: Object.fromEntries(PORADI_ZBOZI.map((id) => [id, ZBOZI[id].zasoba])),
  };
  hra.kupcu += 1;
  zvuk(hra, 'kupec');
  hra.dalsiKupec = hra.cas + KUPEC.kazdych;
  hra.oznameni = { text: t('hra.kupec.prijel'), zivot: 3 };
}

// Cena zboží teď (roste s hrozbou, klíč ne).
export function cenaZbozi(hra, id) {
  const z = ZBOZI[id];
  if (!z) return null;
  const cena = z.rust === false ? z.cena : Math.round(z.cena * (1 + RUST_CEN) ** (Math.max(1, hra.hrozba) - 1));
  // Smlouvání (strom) zlevní všechno zboží, aspoň za 1 zlaťák.
  const sleva = Math.min(0.9, hra.hrdina?.sleva ?? 0);
  return sleva > 0 ? Math.max(1, Math.round(cena * (1 - sleva))) : cena;
}

// Proč zboží teď koupit nejde, nebo null, když jde.
export function prekazkaNakupu(hra, id) {
  const k = hra.kupec;
  if (!k || !hra.obchod || !Object.hasOwn(ZBOZI, id)) return t('hra.kupec.neni');
  if (!(k.zasoba[id] > 0)) return t('hra.kupec.vyprodano');
  if (id === 'lektvar' && hra.hrdina.hp >= hra.hrdina.maxHp) return t('hra.kupec.plneZivoty');
  if (hra.zlataky < cenaZbozi(hra, id)) return t('hra.kupec.maloZlataku');
  return null;
}

// Zboží v obchodě pro okno kupce: co to je, za kolik, kolik zbývá a jestli jde koupit.
export function nabidkaKupce(hra) {
  return PORADI_ZBOZI.map((id) => ({
    id, ...ZBOZI[id], cena: cenaZbozi(hra, id), zbyva: hra.kupec?.zasoba[id] ?? 0, prekazka: prekazkaNakupu(hra, id),
  }));
}

// Zbraně a pasivy, které hrdina má (z nich vybírá Náhodné vylepšení).
function mojeVylepseni(hra) {
  return [
    ...Object.keys(hra.zbrane).filter((id) => Object.hasOwn(ZBRANE, id)).map((id) => ['zbran', id]),
    ...Object.keys(hra.pasivy).filter((id) => Object.hasOwn(PASIVY, id)).map((id) => ['pasiva', id]),
  ];
}

// Co které zboží udělá. Vrací text pro okno obchodu (co přesně hrdina dostal).
const POUZITI_ZBOZI = {
  lektvar(hra) {
    const { hrdina } = hra;
    const pred = hrdina.hp;
    hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + Math.round(hrdina.maxHp * LECENI_LEKTVARU));
    cisloLeceni(hra, hrdina.hp - pred);
    return t('hra.koupeno.lektvar', { n: Math.round(hrdina.hp - pred) });
  },
  prehozeni(hra) {
    hra.prehozeniZdarma += ZBOZI.prehozeni.kolik;
    return t('hra.koupeno.prehozeni', { n: hra.prehozeniZdarma });
  },
  vylepseni(hra) {
    const moje = mojeVylepseni(hra);
    const [druh, id] = moje[Math.min(moje.length - 1, Math.floor(hra.rng.dalsi() * moje.length))];
    const k = karta(hra, druh, id, losujRaritu(hra, 'vzacna'));
    pouzijKartu(hra, k);
    return t('hra.koupeno.vylepseni', { nazev: k.nazev, od: k.od, uroven: k.uroven, rarita: RARITY[k.rarita].nazev });
  },
  kus(hra) {
    const boss = PORADI_BOSSU[Math.min(PORADI_BOSSU.length - 1, Math.floor(hra.rng.dalsi() * PORADI_BOSSU.length))];
    const kus = losujKus(boss, hra.rng.dalsi(), hra.rng.dalsi(), hra.hrozba, hra.hrdina.stesti);
    ziskejKus(hra, kus);
    hra.truhlaKus = null;
    return t('hra.koupeno.kus', { kus: kus.nazev, rarita: RARITY_VYBAVY[kus.rarita].nazev });
  },
  klic(hra) {
    hra.klice += 1;
    return t('hra.koupeno.klic', { n: hra.klice });
  },
};

// Nákup u kupce: zaplatí, ubere ze zásoby a použije zboží. Vrací, jestli se koupilo.
export function kup(hra, id) {
  if (prekazkaNakupu(hra, id)) return false;
  zaplat(hra, cenaZbozi(hra, id), 'kupec');
  hra.nakupy[id] += 1;
  hra.kupec.zasoba[id] -= 1;
  hra.posledniNakup = { id, text: POUZITI_ZBOZI[id](hra) };
  return true;
}

// Odejít od kupce: okno se zavře, vůz zůstane (znovu se otevře, až hrdina odejde a vrátí se).
export function odejdiOdKupce(hra) {
  hra.obchod = false;
  hra.posledniNakup = null;
}

// Kolik teď stojí přehodit karty (0 = zdarma od kupce).
export function cenaPrehozeni(hra) {
  return hra.prehozeniZdarma > 0 ? 0 : PREHOZENI.cena + PREHOZENI.rust * hra.prehozeno;
}

// Přehodit karty v okně výběru: nové tři karty (z truhly zase aspoň vzácné). Nejdřív přehození zdarma, pak
// za zlaťáky. Vrací, jestli se přehodilo.
export function prehod(hra) {
  if (!hra.volby) return false;
  if (hra.prehozeniZdarma > 0) hra.prehozeniZdarma -= 1;
  else {
    const cena = cenaPrehozeni(hra);
    if (hra.zlataky < cena) return false;
    zaplat(hra, cena, 'prehozeni');
    hra.prehozeno += 1;
  }
  hra.prehozeniCelkem += 1;
  hra.volby = nabidka(hra, hra.zTruhly ? 'vzacna' : 'bezna');
  return true;
}

// Zamčená truhla pod nohama: klíč, jinak zlaťáky, jinak zůstane zavřená (kreslení ukáže cenu).
// Otevřená dá volbu karty aspoň vzácné jako truhla bosse.
function zamceneTruhly(hra) {
  const { hrdina } = hra;
  for (const z of hra.zamcene) {
    const d = vzdalenost(z, hrdina);
    z.blizko = d < POLOMER_ZAMCENE + 60;
    if (d >= POLOMER_ZAMCENE + 8 || hra.volby || hra.otevira || hra.obchod) continue;
    let cim = null;
    if (hra.klice > 0) {
      hra.klice -= 1;
      cim = 'klic';
    } else if (hra.zlataky >= CENA_ZAMCENE) {
      zaplat(hra, CENA_ZAMCENE, 'zamcene', true);
      cim = 'zlato';
    }
    if (!cim) continue;
    z.otevrena = true;
    hra.otevrenoZamcenych[cim] += 1;
    zvuk(hra, 'zamcena', cim === 'klic' ? 1 : 0);
    rozprsk(hra, z.x, z.y, 'zamcena', 10);
    hra.volby = nabidka(hra, 'vzacna');
    hra.zTruhly = true;
    hra.truhlaOd = 'zamcena';
    hra.truhlaKus = null;
    hra.odemceno = cim;
  }
  hra.zamcene = hra.zamcene.filter((z) => !z.otevrena);
}

// Kam jde obyčejný nepřítel (NADBIHANI): utíkajícímu hrdinovi nadbíhá, stojícímu jde přímo na něj. Zblízka
// (do dvou poloměrů) jde vždy přímo.
function nadbehni(hra, n, d, rychlost) {
  const { hrdina } = hra;
  if (n.boss || hra.cas < NADBIHANI.od || d < n.polomer * 2 || !(rychlost > 0)) return hrdina;
  const predstih = Math.min(NADBIHANI.predstih, d / rychlost) * NADBIHANI.podil;
  if (!(predstih > 0) || (hrdina.vx === 0 && hrdina.vy === 0)) return hrdina;
  return { x: hrdina.x + hrdina.vx * predstih, y: hrdina.y + hrdina.vy * predstih };
}

// Žába sedí a skáče (SKOK_ZABY): násobek rychlosti pro tenhle snímek. vyskok = jak daleko je ve skoku 0..1
// (0 = sedí), podle toho ji kreslení zvedne nad zem. Ostatní nepřátelé jdou pořád stejně (1).
function skokZaby(n, dt) {
  if (!n.skace) return 1;
  n.skokCas = (n.skokCas + dt) % (SKOK_ZABY.pauza + SKOK_ZABY.skok);
  n.vyskok = n.skokCas >= SKOK_ZABY.pauza ? (n.skokCas - SKOK_ZABY.pauza) / SKOK_ZABY.skok : 0;
  return n.vyskok > 0 ? SKOK_ZABY.rychlost : 0;
}

export function aktualizuj(hra, dt, vstup, sirka, vyska) {
  if (hra.konec || hra.volby || hra.porovnani || hra.pauza || hra.obchod) return;
  // Otevírání truhly: svět stojí, běží jen animace.
  if (hra.otevira) {
    hra.otevira.cas += dt;
    if (hra.otevira.cas >= TRVANI_OTEVRENI) dokonciTruhlu(hra);
    return;
  }
  const { hrdina } = hra;
  hra.cas += dt;
  hra.mesec = Math.min(MESEC.strop, hra.mesec + (MESEC.zaMinutu / 60) * dt);

  // pohyb hrdiny (odhozený hrdina letí, kam ho rána poslala, a řídit nejde). V bahně jde pomaleji.
  let { dx, dy } = vstup;
  const delka = Math.hypot(dx, dy);
  const mapa = MAPY[hra.mapa];
  hrdina.plocha = naPlose(hra.mapa, hrdina.x, hrdina.y);
  hrdina.naLedu = hrdina.plocha === 'led';
  // Brodění a Poutník (strom) zpomalení bahnem zmenší, Ostruhy a Poutník klouzání po ledu.
  let vBahne = hrdina.plocha === 'bahno' ? mapa.bahno.zpomaleni : 1;
  if (vBahne < 1 && (hrdina.brodeni > 0 || hrdina.poutnik > 0)) vBahne = hrdina.poutnik > 0 ? 1 : 1 - (1 - vBahne) * (1 - Math.min(1, hrdina.brodeni));
  const klouze = hrdina.naLedu && !(hrdina.poutnik > 0);
  const predX = hrdina.x;
  const predY = hrdina.y;
  if (hrdina.odhozen > 0) {
    const kus = Math.min(dt, hrdina.odhozen);
    hrdina.x += hrdina.odhozVx * kus;
    hrdina.y += hrdina.odhozVy * kus;
    hrdina.odhozen -= kus;
    hrdina.vx = hrdina.odhozVx;
    hrdina.vy = hrdina.odhozVy;
  } else if (klouze) {
    // Na ledu se rychlost k řízení jen přibližuje (o led.prilnavost za sekundu): hrdina se rozjíždí pomalu,
    // po puštění dál klouže a zatáčí obloukem. Po odhození klouže dál směrem rány.
    const rychlost = hrdina.rychlost * (hrdina.sit > 0 ? ZPOMALENI_SITI : 1);
    const cilX = delka > 0 ? (dx / delka) * rychlost : 0;
    const cilY = delka > 0 ? (dy / delka) * rychlost : 0;
    const k = 1 - Math.exp(-(mapa.led.prilnavost / (1 - Math.min(0.9, hrdina.ostruhy))) * dt);
    hrdina.vx += (cilX - hrdina.vx) * k;
    hrdina.vy += (cilY - hrdina.vy) * k;
    hrdina.x += hrdina.vx * dt;
    hrdina.y += hrdina.vy * dt;
    if (cilX !== 0) hrdina.otoceny = Math.sign(cilX);
  } else if (delka > 0) {
    dx /= delka;
    dy /= delka;
    const rychlost = hrdina.rychlost * (hrdina.sit > 0 ? ZPOMALENI_SITI : 1) * vBahne;
    hrdina.x += dx * rychlost * dt;
    hrdina.y += dy * rychlost * dt;
    if (dx !== 0) hrdina.otoceny = Math.sign(dx);
    // Kam a jak rychle hrdina běží (podle toho míří Hod bossů).
    hrdina.vx = dx * rychlost;
    hrdina.vy = dy * rychlost;
  } else {
    hrdina.vx = 0;
    hrdina.vy = 0;
  }
  // Překážka hrdinu zastaví a nechá ho sklouznout podél ní. Na ledu (i po odhození) se ztratí rychlost do ní.
  const oPrekazku = obejdi(hra, hrdina, POLOMER_HRDINY, predX, predY);
  if (oPrekazku) {
    const doNi = hrdina.vx * oPrekazku.x + hrdina.vy * oPrekazku.y;
    if (doNi < 0) {
      hrdina.vx -= doNi * oPrekazku.x;
      hrdina.vy -= doNi * oPrekazku.y;
    }
    const odhozDoNi = hrdina.odhozVx * oPrekazku.x + hrdina.odhozVy * oPrekazku.y;
    if (hrdina.odhozen > 0 && odhozDoNi < 0) {
      hrdina.odhozVx -= odhozDoNi * oPrekazku.x;
      hrdina.odhozVy -= odhozDoNi * oPrekazku.y;
    }
  }
  // Kdo stojí na místě, toho nepřátelé obkličují (OBKLICENI). Hrozba se přizpůsobí síle hrdiny (PRIZPUSOBENI).
  obklicuj(hra, dt, Math.hypot(hrdina.x - predX, hrdina.y - predY), sirka, vyska);
  prizpusobHrozbu(hra, dt);
  hrdina.nezranitelny = Math.max(0, hrdina.nezranitelny - dt);
  hrdina.neviditelny = Math.max(0, hrdina.neviditelny - dt);
  hrdina.doZmizeni = Math.max(0, hrdina.doZmizeni - dt);
  hrdina.sit = Math.max(0, hrdina.sit - dt);
  hra.tres = Math.max(0, hra.tres - dt);
  hra.zablesk = Math.max(0, hra.zablesk - dt);
  hra.vybuch = Math.max(0, hra.vybuch - dt);
  regeneruj(hra, dt);
  dobijStit(hra, dt);
  hrdina.doSani = Math.max(0, hrdina.doSani - dt);
  hra.ostny = Math.max(0, hra.ostny - dt);
  for (const k of hra.kapky) k.zivot -= dt;
  hra.kapky = hra.kapky.filter((k) => k.zivot > 0);
  // Láva pálí, dokud v ní hrdina stojí (po každé ráně chvíle klidu jako u jedu), rána roste s hrozbou.
  if (mapa.lava && naPlose(hra.mapa, hrdina.x, hrdina.y) === 'lava' && hrdina.nezranitelny <= 0 && !hra.konec) {
    hra.popaleno += 1;
    const odolnost = (1 - Math.min(0.9, hrdina.odolnostLave)) * (hrdina.poutnik > 0 ? POUTNIK.lava : 1);
    const rana = ranaHrozby(hra, mapa.lava.poskozeni);
    zran(hra, odolnost < 1 ? Math.max(1, Math.round(rana * odolnost)) : rana, 'ohen', false, null, 'lava');
    rozprsk(hra, hrdina.x, hrdina.y + 8, 'lava', 5);
  }
  bublinyBahna(hra, dt);

  // nepřátelé
  hra.doSpawnu -= dt;
  if (hra.doSpawnu <= 0) {
    spawn(hra, sirka, vyska);
    hra.doSpawnu = silaHry(hra).vlna;
  }
  // Každou minutu hrozba o stupeň výš a krátké ohlášení (vlastní řádek, nepřepíše příchod bosse).
  const hrozba = silaHrozby(hra.cas).uroven;
  if (hrozba > hra.hrozba) {
    hra.hrozba = hrozba;
    zvuk(hra, 'hrozba');
    hra.hlaseniHrozby = { uroven: hrozba, text: textHrozby(hrozba), zivot: TRVANI_HLASENI_HROZBY };
  }
  if (hra.hlaseniHrozby) {
    hra.hlaseniHrozby.zivot -= dt;
    if (hra.hlaseniHrozby.zivot <= 0) hra.hlaseniHrozby = null;
  }
  // Kdo zůstal daleko za hrdinou, vrátí se na okraj obrazovky, aby se nepřátelé nehromadili mimo dohled.
  const daleko = polomerSpawnu(sirka, vyska) * 1.5;
  for (const n of hra.nepratele) {
    if (vzdalenost(n, hrdina) > daleko) {
      Object.assign(n, naOkraji(hra, sirka, vyska));
      if (n.duch) zamir(n, hrdina);
    }
  }
  // Bedny moc daleko za hrdinou zmizí, nové přibývají mimo obrazovku, dokud jich není MAX_BEDEN.
  const dalekoBedny = polomerSpawnu(sirka, vyska) * 2;
  hra.bedny = hra.bedny.filter((b) => vzdalenost(b, hrdina) < dalekoBedny);
  hra.doBedny -= dt;
  if (hra.doBedny <= 0) {
    if (hra.bedny.length < MAX_BEDEN) pridejBednu(hra, sirka, vyska);
    hra.doBedny = BEDNA_KAZDYCH;
  }
  // Zamčené truhly stejně: daleko za hrdinou zmizí, nové přibývají mimo obrazovku.
  hra.zamcene = hra.zamcene.filter((z) => vzdalenost(z, hrdina) < dalekoBedny);
  hra.doZamcene -= dt;
  if (hra.doZamcene <= 0) {
    if (hra.zamcene.length < MAX_ZAMCENYCH) pridejZamcenou(hra, sirka, vyska);
    hra.doZamcene = ZAMCENA_KAZDYCH;
  }
  if (hra.cas >= hra.dalsiBoss) {
    const poradi = poradiBossu(hra.mapa);
    const druh = poradi[hra.bossu % poradi.length];
    const { x, y } = naOkraji(hra, sirka, vyska);
    pridejNepritele(hra, druh, x, y);
    hra.bossu += 1;
    hra.dalsiBoss += BOSS_KAZDYCH;
    hra.oznameni = { text: BOSSOVE[druh].prichod, zivot: 3 };
    zvuk(hra, 'boss');
  }
  jedeKupec(hra, dt, sirka, vyska);
  if (hra.dalsiSmecka !== null && hra.cas >= hra.dalsiSmecka) {
    smecka(hra, sirka, vyska);
    hra.dalsiSmecka += mapa.smecky.kazdych;
  }
  const prichod = PRICHODY_MAP[hra.mapa][hra.dalsiPrichod];
  if (prichod && hra.cas > prichod.od) {
    hra.dalsiPrichod += 1;
    hra.oznameni = { text: prichod.text, zivot: 3 };
  }
  if (hra.oznameni) {
    hra.oznameni.zivot -= dt;
    if (hra.oznameni.zivot <= 0) hra.oznameni = null;
  }
  schopnostiBossu(hra, dt, sirka, vyska);
  // Zmizelého hrdinu (Bludný plamen) nepřátelé nevidí a jdou tam, kde ho viděli naposledy. Bossové ho najdou.
  const zmizel = hrdina.neviditelny > 0;
  const naposledy = { x: hrdina.zmizelX, y: hrdina.zmizelY };
  const elity = hra.nepratele.filter((n) => n.elita);
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hrdina) || 1;
    const brzda = brzdaTrnu(n) * brzdaSite(n) * brzdaMrazu(n) * brzdaZvonu(n) * brzdaKorenu(n) * brzdaOtresu(n);
    const nPredX = n.x;
    const nPredY = n.y;
    // Koho drží kořeny, s tím ani odhození nehne (bosse kořeny jen brzdí).
    if (n.drzen > 0 && !n.boss) n.odhozen = 0;
    if (n.odhozen > 0) {
      // Odhozený zrcadlem letí od hrdiny a mezitím po něm nejde (uletí přesně o odhození, ne o kus víc).
      const kus = Math.min(dt, n.odhozen);
      n.x += n.odhozVx * kus;
      n.y += n.odhozVy * kus;
      n.odhozen -= kus;
    } else if (n.schopnost) {
      // Boss při schopnosti stojí na místě (výpad ho vede sám).
    } else if (n.duch) {
      // Duch letí pořád rovně. Střídá se: chvíli vidět, chvíli schovaný, po vynoření zamíří znovu.
      n.duchCas -= dt;
      if (n.duchCas <= 0) {
        n.skryty = !n.skryty;
        n.duchCas = n.skryty ? SKRYTY_DUCH : VIDITELNY_DUCH;
        if (!n.skryty) zamir(n, hrdina);
      }
      n.x += n.smerX * n.rychlost * brzda * dt;
      n.y += n.smerY * n.rychlost * brzda * dt;
    } else {
      // Boss daleko za hrdinou dohání (TLAK_BOSSU).
      const dohani = n.boss && d > TLAK_BOSSU.dohani ? TLAK_BOSSU.dohaniRychlost : 1;
      n.vedeny = !n.boss && !n.elita && elity.some((e) => Math.abs(e.x - n.x) < VUDCE.dosah && Math.abs(e.y - n.y) < VUDCE.dosah && vzdalenost(e, n) < VUDCE.dosah);
      const vudce = n.vedeny ? VUDCE.rychlost : 1;
      const rychlost = n.rychlost * brzda * dohani * vudce * (n.vyrazi > 0 ? RYCHLOST_VYRAZENI : 1) * skokZaby(n, dt);
      const cil = zmizel && !n.boss ? naposledy : nadbehni(hra, n, d, rychlost);
      const k = cil === hrdina ? d : vzdalenost(n, cil);
      // U místa, kde hrdina zmizel, nepřítel zůstane stát (jinak by kolem něj poskakoval).
      if (cil !== naposledy || k > rychlost * dt) {
        n.x += ((cil.x - n.x) / (k || 1)) * rychlost * dt;
        n.y += ((cil.y - n.y) / (k || 1)) * rychlost * dt;
      }
      if (n.vyrazi > 0) n.vyrazi -= dt;
    }
    // Překážky obchází každý kromě duchů (proletí jimi), i boss a odhozený nepřítel.
    if (!n.duch) obejdi(hra, n, n.polomer, nPredX, nPredY);
    n.zapreden = Math.max(0, (n.zapreden || 0) - dt);
    n.zasazen = Math.max(0, n.zasazen - dt);
    n.zar = Math.max(0, (n.zar || 0) - dt);
    n.zasahKrumpacem = Math.max(0, n.zasahKrumpacem - dt);
    n.zasahZrcadlem = Math.max(0, (n.zasahZrcadlem || 0) - dt);
    n.trny = Math.max(0, (n.trny || 0) - dt);
    n.mraz = Math.max(0, (n.mraz || 0) - dt);
    n.omracen = Math.max(0, (n.omracen || 0) - dt);
    n.odolny = Math.max(0, (n.odolny || 0) - dt);
    n.zasahCepem = Math.max(0, (n.zasahCepem || 0) - dt);
    n.drzen = Math.max(0, (n.drzen || 0) - dt);
    n.vyrvan = Math.max(0, (n.vyrvan || 0) - dt);
    n.hori = Math.max(0, (n.hori || 0) - dt);
    n.tikOhne = Math.max(0, (n.tikOhne || 0) - dt);
    n.otres = Math.max(0, (n.otres || 0) - dt);
    n.dosvit = Math.max(0, (n.dosvit || 0) - dt);
    n.zasahUhlikem = Math.max(0, (n.zasahUhlikem || 0) - dt);
    const veVzduchu = n.schopnost?.id === 'skok' && n.schopnost.faze === 'provadi';
    if (d < n.polomer + 8 && hrdina.nezranitelny <= 0 && viditelny(n) && !nekouse(n) && !veVzduchu) {
      if (n.sit) hrdina.sit = TRVANI_SITE;
      if (n.pan) hra.zasahyBossu.pomocnik += 1;
      zran(hra, ranaDotykem(hra, n), n.ohen ? 'ohen' : 'zraneni', true, n, n.boss || n.pan ? 'boss' : 'dotyk');
    }
  }
  strelyBossu(hra, dt);
  // Jedový oblak po houbákovi pálí hrdinu, dokud v něm stojí (stejně jako dotyk, po zásahu chvíle klidu).
  for (const o of hra.oblaky) {
    const pali = TRVANI_OBLAKU - o.zivot >= NAFUKOVANI_OBLAKU;
    if (pali && hrdina.nezranitelny <= 0 && !hra.konec && vzdalenost(o, hrdina) < o.polomer) {
      const rana = ranaHrozby(hra, o.jed ?? JED_OBLAKU);
      const odolnost = 1 - Math.min(0.9, hrdina.odolnostJedu);
      zran(hra, odolnost < 1 ? Math.max(1, Math.round(rana * odolnost)) : rana, 'jed', o.druh !== 'bahno', null, 'jed');
    }
  }

  const s = staty(hra);

  // Jiskra
  const jiskra = hra.zbrane.jiskra;
  if (jiskra) {
    jiskra.nabiti -= dt;
    if (jiskra.nabiti <= 0 && vystrelJiskry(hra, s.jiskra)) {
      jiskra.nabiti = s.jiskra.nabiti;
      ozvi(hra, jiskra);
    }
    ozvenaVystrelu(hra, jiskra, dt, () => vystrelJiskry(hra, s.jiskra));
  }
  for (const st of hra.strely) {
    st.x += st.vx * dt;
    st.y += st.vy * dt;
    st.zivot -= dt;
    const velikost = st.velikost ?? 4;
    for (const n of hra.nepratele) {
      if (n.hp > 0 && viditelny(n) && vzdalenost(st, n) < n.polomer + velikost) {
        zasah(hra, n, st.poskozeni, false, 'jiskra');
        st.zivot = 0;
        break;
      }
    }
    if (st.zivot <= 0) continue;
    for (const b of hra.bedny) {
      if (!b.rozbita && vzdalenost(st, b) < POLOMER_BEDNY + velikost) {
        rozbij(hra, b);
        st.zivot = 0;
        break;
      }
    }
  }
  hra.strely = hra.strely.filter((st) => st.zivot > 0);

  // Lucerna (s Ozvěnou žár občas tikne ještě jednou, s Přívalem kolem světla krouží uhlíky)
  if (hra.zbrane.lucerna) {
    const luc = hra.zbrane.lucerna;
    luc.tik = (luc.tik ?? 0) - dt;
    if (luc.tik <= 0) {
      zarLucerny(hra, s.lucerna);
      luc.tik = s.lucerna.tik;
      ozvi(hra, luc);
    }
    ozvenaVystrelu(hra, luc, dt, () => zarLucerny(hra, s.lucerna));
    uhlikyLucerny(hra, dt, s);
  }

  // Krumpáče (s Ozvěnou zásah občas dopadne ještě jednou, s Výdrží zasaženého otřesou)
  if (hra.zbrane.krumpace) {
    const st = s.krumpace;
    hra.uhelKrumpacu += st.rychlost * dt;
    for (let i = 0; i < st.pocet; i++) {
      const uhel = hra.uhelKrumpacu + (i / st.pocet) * Math.PI * 2;
      const kx = hrdina.x + Math.cos(uhel) * st.polomer;
      const ky = hrdina.y + Math.sin(uhel) * st.polomer;
      for (const n of hra.nepratele) {
        if (n.zasahKrumpacem <= 0 && viditelny(n) && Math.hypot(n.x - kx, n.y - ky) < n.polomer + st.velikost) {
          zasah(hra, n, st.poskozeni, false, 'krumpace');
          n.zasahKrumpacem = 0.4;
          zvuk(hra, 'krumpace');
          otres(hra, n, st.otres);
          ozvenaZasahu(hra, n, st.poskozeni, false, 'krumpace');
        }
      }
      for (const b of hra.bedny) {
        if (Math.hypot(b.x - kx, b.y - ky) < POLOMER_BEDNY + st.velikost) rozbij(hra, b);
      }
    }
  }

  // Blesk: udeří do náhodného nepřítele (nebo bedny) v dosahu a přeskakuje na nejbližší dosud nezasažené.
  if (hra.zbrane.blesk) {
    const bl = hra.zbrane.blesk;
    bl.nabiti = (bl.nabiti ?? 0) - dt;
    if (bl.nabiti <= 0 && uderBlesk(hra, s.blesk)) {
      bl.nabiti = s.blesk.nabiti;
      ozvi(hra, bl);
    }
    ozvenaVystrelu(hra, bl, dt, () => uderBlesk(hra, s.blesk, true));
  }
  for (const b of hra.blesky) b.zivot -= dt;
  hra.blesky = hra.blesky.filter((b) => b.zivot > 0);

  // Trnová past: když je nabitá a má pod co trny zasadit, zasadí je. Bez cíle čeká nabitá.
  const trn = hra.zbrane.trny;
  if (trn) {
    trn.nabiti = (trn.nabiti ?? 0) - dt;
    if (trn.nabiti <= 0 && zasadTrny(hra, s.trny)) {
      trn.nabiti = s.trny.nabiti;
      ozvi(hra, trn);
    }
    ozvenaVystrelu(hra, trn, dt, () => zasadTrny(hra, s.trny, true));
  }
  rostouTrny(hra, dt, s);

  // Zrcadlový štít
  if (hra.zbrane.zrcadlo) {
    hra.uhelZrcadel += s.zrcadlo.rychlost * dt;
    zrcadla(hra, s);
  }
  for (const o of hra.odlesky) o.zivot -= dt;
  hra.odlesky = hra.odlesky.filter((o) => o.zivot > 0);

  // Světlušky
  rojSvetlusek(hra, dt, s);

  // Mrazivý krystal: když je nabitý a má kam dopadnout, dopadne. Bez cíle čeká nabitý.
  const mr = hra.zbrane.mraz;
  if (mr) {
    mr.nabiti = (mr.nabiti ?? 0) - dt;
    if (mr.nabiti <= 0 && hodKrystaly(hra, s.mraz)) mr.nabiti = s.mraz.nabiti;
  }
  mrznouZony(hra, dt);
  // Zvon hlubin, Cep na řetězu a Semínkové bomby
  zvon(hra, dt, s);
  cep(hra, dt, s);
  rostouSeminka(hra, dt, s);
  // Kořeny, Ohnivá stopa a Odrazný kámen
  rostouKoreny(hra, dt, s);
  ohnivaStopa(hra, dt, s);
  letiKameny(hra, dt, s);
  // Rázová vlna z výbavy Strážce
  razoveVlny(hra, dt);
  // Ozvěny zásahů (pasiva Ozvěna)
  ozvenyAZvuky(hra, dt);
  hra.bedny = hra.bedny.filter((b) => !b.rozbita);
  // Pet z vajec (jde za hrdinou a dělá, co umí)
  petHrdiny(hra, dt);

  pohrbi(hra);

  // srdce, magnet, zlaťák, vejce a bomba se seberou dotykem, truhla bosse se začne otevírat (jen jedna naráz,
  // další se otevře hned po ní). Zlaťák a vejce v dosahu magnetu (zlaťák i po sebraném magnetu) letí k hrdinovi.
  let bouchlo = false;
  for (const p of hra.predmety) {
    if (p.druh === 'zlatak' || p.druh === 'vejce') {
      const d = vzdalenost(p, hrdina) || 1;
      if (p.pritahovan || d < hrdina.magnet) {
        const kus = Math.min(d, (p.pritahovan ? 520 : 260) * dt);
        p.x += ((hrdina.x - p.x) / d) * kus;
        p.y += ((hrdina.y - p.y) / d) * kus;
      }
    }
    if (vzdalenost(p, hrdina) < 16) {
      if (p.druh === 'truhla') {
        if (hra.otevira) continue;
        p.sebran = true;
        otevriTruhlu(hra, p);
        continue;
      }
      p.sebran = true;
      if (p.druh === 'srdce') {
        const pred = hrdina.hp;
        hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + LECENI_SRDCE * hrdina.leceniSrdce);
        cisloLeceni(hra, hrdina.hp - pred);
        zvuk(hra, 'srdce');
      } else if (p.druh === 'zlatak') {
        pridejZlataky(hra, p.hodnota ?? 1, p.z ?? 'bedny');
      } else if (p.druh === 'vejce') {
        hra.vajec += 1;
        zvuk(hra, 'vejce');
        hra.oznameni = { text: t('hra.vejce'), zivot: 2 };
      } else if (p.druh === 'bomba') {
        vybuch(hra, sirka, vyska);
        bouchlo = true;
      } else {
        zvuk(hra, 'magnet');
        for (const kr of hra.krystaly) kr.pritahovan = true;
        for (const q of hra.predmety) if (q.druh === 'zlatak') q.pritahovan = true;
      }
    }
  }
  hra.predmety = hra.predmety.filter((p) => !p.sebran);
  // Magnetická bouře (strom): každých bourka s se k hrdinovi slétnou všechny krystaly a zlaťáky jako po magnetu.
  if (hrdina.bourka > 0) {
    hra.doBourky -= dt;
    if (hra.doBourky <= 0) {
      hra.doBourky += hrdina.bourka;
      hra.bourek += 1;
      zvuk(hra, 'magnet');
      for (const kr of hra.krystaly) kr.pritahovan = true;
      for (const q of hra.predmety) if (q.druh === 'zlatak') q.pritahovan = true;
    }
  }
  // Kdo padl bombou, umře hned v tomhle snímku (jinak by ještě stihl hrdinu kousnout).
  if (bouchlo) pohrbi(hra);
  zamceneTruhly(hra);

  // sběr krystalů
  for (const kr of hra.krystaly) {
    const d = vzdalenost(kr, hrdina) || 1;
    if (kr.pritahovan || d < hrdina.magnet) {
      const rychlost = kr.pritahovan ? 520 : 260;
      kr.x += ((hrdina.x - kr.x) / d) * rychlost * dt;
      kr.y += ((hrdina.y - kr.y) / d) * rychlost * dt;
    }
    if (d < 12) {
      kr.sebran = true;
      hrdina.xp += kr.xp * hrdina.zkusenosti;
      zvuk(hra, 'krystal');
    }
  }
  hra.krystaly = hra.krystaly.filter((kr) => !kr.sebran);
  // Moc krystalů na zemi: dva nejstarší se slijí do jednoho, zkušenosti se neztratí.
  while (hra.krystaly.length > MAX_KRYSTALU) {
    const [a, b] = hra.krystaly.splice(0, 2);
    hra.krystaly.push({ x: b.x, y: b.y, xp: a.xp + b.xp });
  }
  // Když se zrovna otevírá truhla, nová úroveň počká, až bude otevřená a vybraná (jinak by truhlu přepsala).
  if (hrdina.xp >= hrdina.potreba && !hra.volby && !hra.otevira) {
    hrdina.xp -= hrdina.potreba;
    hrdina.uroven += 1;
    hrdina.potreba = potrebaNaUroven(hrdina.uroven);
    hra.volby = nabidka(hra);
  }

  // úlomky zpomalují a mizí
  const brzda = Math.exp(-5 * dt);
  for (const c of hra.castice) {
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vx *= brzda;
    c.vy *= brzda;
    c.zivot -= dt;
  }
  hra.castice = hra.castice.filter((c) => c.zivot > 0);

  for (const o of hra.oblaky) o.zivot -= dt;
  hra.oblaky = hra.oblaky.filter((o) => o.zivot > 0);

  for (const c of hra.cisla) c.zivot -= dt;
  hra.cisla = hra.cisla.filter((c) => c.zivot > 0);
}

// Žár lucerny: zasáhne každého v dosahu a rozbije bedny. Kdo ze světla vyšel, toho ještě dosvit s pálí
// (jen s Výdrží). Vrací true (lucerna pálí, i když kolem nikdo není).
function zarLucerny(hra, st) {
  const { hrdina } = hra;
  let palila = false;
  for (const n of hra.nepratele) {
    if (!viditelny(n)) continue;
    if (vzdalenost(n, hrdina) < st.dosah) {
      zasah(hra, n, st.zar * 0.3, true, 'lucerna');
      if (st.dosvit > 0) n.dosvit = st.dosvit;
      palila = true;
    } else if (n.dosvit > 0) {
      zasah(hra, n, st.zar * 0.3, true, 'lucerna');
      palila = true;
    }
  }
  if (palila) zvuk(hra, 'lucerna');
  for (const b of hra.bedny) {
    if (vzdalenost(b, hrdina) < st.dosah) rozbij(hra, b);
  }
  return true;
}

// Kde je i-tý z pocet uhlíků lucerny: na okraji jejího světla, krouží pomalu proti směru krumpáčů.
export function poziceUhliku(hra, i, s = staty(hra)) {
  const uhel = -hra.uhelUhliku + (i / s.lucerna.uhliky) * Math.PI * 2;
  return { x: hra.hrdina.x + Math.cos(uhel) * s.lucerna.dosah, y: hra.hrdina.y + Math.sin(uhel) * s.lucerna.dosah, uhel };
}

// Uhlíky lucerny (Příval): krouží po okraji světla, koho se dotknou, toho spálí (stejného nejdřív za
// ZASAH_UHLIKEM s) a rozbijí bednu. Rychlé ruce je točí rychleji, Ozvěna jim přidá druhý zásah.
function uhlikyLucerny(hra, dt, s) {
  const st = s.lucerna;
  if (!(st.uhliky > 0)) return;
  hra.uhelUhliku += (OTACENI_UHLIKU / (hra.hrdina.nabijeni || 1)) * dt;
  const rana = st.zar * RANA_UHLIKU;
  for (let i = 0; i < st.uhliky; i++) {
    const u = poziceUhliku(hra, i, s);
    for (const n of hra.nepratele) {
      if (n.zasahUhlikem > 0 || n.hp <= 0 || !viditelny(n) || vzdalenost(n, u) >= n.polomer + 6) continue;
      zasah(hra, n, rana, true, 'lucerna');
      n.zasahUhlikem = ZASAH_UHLIKEM;
      zvuk(hra, 'lucerna');
      hra.zasahuUhliky += 1;
      ozvenaZasahu(hra, n, rana, true, 'lucerna');
    }
    for (const b of hra.bedny) {
      if (!b.rozbita && vzdalenost(b, u) < POLOMER_BEDNY + 6) rozbij(hra, b);
    }
  }
}

// Blesk (blesku = kolik naráz, s Přívalem víc): první udeří do náhodného cíle v dosahu a přeskakuje na nejbližší
// dosud nezasažené, každý další začne v jiném, ještě nezasaženém. Bedna je první zásah: rozbije se a blesk skočí
// dál na nejbližšího nepřítele. S Výdrží zasažené otřese. Losy prvního blesku jsou z rng (jako vždycky), další
// blesky a ozvěna (ozvena = true) losují z losPasiv, ať pasivy neposunou náhodu vln. Vrací, jestli udeřil.
function uderBlesk(hra, st, ozvena = false) {
  const { hrdina } = hra;
  const vDosahu = hra.nepratele.filter((n) => n.hp > 0 && viditelny(n) && vzdalenost(n, hrdina) < st.dosah);
  const bednyVDosahu = hra.bedny.filter((b) => !b.rozbita && vzdalenost(b, hrdina) < st.dosah);
  let cile = bednyVDosahu.length ? [...vDosahu, ...bednyVDosahu] : vDosahu;
  if (!cile.length) return false;
  const zasazeni = new Set();
  for (let k = 0; k < st.blesku && cile.length; k++) {
    let cil = k === 0 && !ozvena ? hra.rng.vyber(cile) : cile[Math.floor(losPasiv(hra) * cile.length)];
    const body = [{ x: hrdina.x, y: hrdina.y }];
    let preskoku = st.preskoky;
    if (bednyVDosahu.includes(cil)) {
      rozbij(hra, cil);
      body.push({ x: cil.x, y: cil.y });
      cil = dalsiCilBlesku(hra, cil, st.skok, zasazeni);
      preskoku -= 1;
    }
    for (let i = 0; i <= preskoku && cil; i++) {
      zasah(hra, cil, st.poskozeni, false, 'blesk');
      otres(hra, cil, st.otres);
      zasazeni.add(cil);
      body.push({ x: cil.x, y: cil.y });
      cil = dalsiCilBlesku(hra, cil, st.skok, zasazeni);
    }
    hra.blesky.push({ body, zivot: 0.18 });
    cile = cile.filter((c) => !zasazeni.has(c) && !c.rozbita);
  }
  zvuk(hra, 'blesk');
  return true;
}

// Jiskry vějířem na nejbližší cíl. Na bednu míří, jen když je blíž než nejbližší nepřítel (a nanejvýš
// JISKRA_NA_BEDNU daleko). Vrací, jestli bylo na co střílet.
function vystrelJiskry(hra, st) {
  const { hrdina } = hra;
  const nepritel = nejblizsi(hra);
  const bedna = nejblizsiBedna(hra, nepritel ? Math.min(JISKRA_NA_BEDNU, vzdalenost(nepritel, hrdina)) : JISKRA_NA_BEDNU);
  const cil = bedna ?? nepritel;
  if (!cil) return false;
  const zaklad = Math.atan2(cil.y - hrdina.y, cil.x - hrdina.x);
  for (let i = 0; i < st.pocet; i++) {
    const uhel = zaklad + (i - (st.pocet - 1) / 2) * 0.18;
    hra.strely.push({
      x: hrdina.x, y: hrdina.y, vx: Math.cos(uhel) * 340, vy: Math.sin(uhel) * 340, zivot: st.zivot, poskozeni: st.poskozeni, velikost: st.velikost,
    });
  }
  zvuk(hra, 'jiskra');
  return true;
}

// Smrt nepřátel → krystaly, oblaky po houbácích, truhla po bossovi, zlaťáky po elitě a občas srdce, magnet
// nebo zlaťák.
function pohrbi(hra) {
  const { hrdina } = hra;
  for (const n of hra.nepratele) {
    if (n.hp <= 0) {
      hra.zabito += 1;
      zvuk(hra, n.boss ? 'bossPadl' : n.elita ? 'elitaPadla' : 'smrt');
      rozlet(hra, n);
      sajKrev(hra, n);
      hra.krystaly.push({ x: n.x, y: n.y, xp: n.xp });
      if (n.jed) {
        hra.oblaky.push({ x: n.x, y: n.y, zivot: TRVANI_OBLAKU, polomer: POLOMER_OBLAKU });
        if (hra.oblaky.length > MAX_OBLAKU) hra.oblaky.splice(0, hra.oblaky.length - MAX_OBLAKU);
      }
      if (n.boss) {
        hra.zabitoBossu += 1;
        // Trofeje (strom): každý zabitý boss přidá poškození do konce hry.
        if (hrdina.trofeje > 0) {
          hrdina.sila *= 1 + hrdina.trofeje;
          hra.trofeji += 1;
        }
        hra.predmety.push({ druh: 'truhla', x: n.x, y: n.y, od: n.druh });
        // Vejce peta: s šancí SANCE_VEJCE leží vedle truhly (los z čísel hry, ne z rng: náhoda vln se neposune).
        if (losZCisel(hra.zabito, hra.zabitoBossu, n.maxHp) < SANCE_VEJCE) {
          hra.vajecPadlo += 1;
          hra.predmety.push({ druh: 'vejce', x: n.x + 20, y: n.y + 8 });
        }
        continue;
      }
      // Elita nechá hromádku zlaťáků (bez losu), když je v měšci (jinak menší, nebo nic).
      const hromadka = n.elita ? Math.min(ELITA.zlataky, Math.floor(hra.mesec)) : 0;
      if (hromadka > 0) {
        hra.mesec -= hromadka;
        hra.predmety.push({ druh: 'zlatak', x: n.x, y: n.y, hodnota: hromadka, z: 'elity' });
      }
      // Štěstí z trvalých vylepšení i pasiva Štěstí zvětší šanci na srdce a magnet, los z rng je pořád jeden
      // (náhoda vln se neposune). Zlaťák se bere ze stejného losu hned za nimi.
      const los = hra.rng.dalsi();
      const stesti = hrdina.stesti * (hrdina.stestiKoristi ?? 1);
      if (los < SANCE_MAGNET * stesti) hra.predmety.push({ druh: 'magnet', x: n.x, y: n.y });
      else if (los < (SANCE_MAGNET + SANCE_SRDCE) * stesti) {
        hra.predmety.push({ druh: 'srdce', x: n.x, y: n.y });
        hra.padloSrdci += 1;
      }
      else if (!n.elita && los < (SANCE_MAGNET + SANCE_SRDCE) * stesti + SANCE_ZLATAKU && hra.mesec >= 1) {
        hra.mesec -= 1;
        hra.predmety.push({ druh: 'zlatak', x: n.x, y: n.y, hodnota: 1, z: 'nepratele' });
      }
    }
  }
  hra.nepratele = hra.nepratele.filter((n) => n.hp > 0);
}

// Šance na každou raritu (součet 1). minimum: horší rarity než tahle nepadnou (truhla bosse).
export function sanceRarit(hra, minimum = 'bezna') {
  const cas = Math.min(Math.max(0, hra.cas), CAS_PLNYCH_RARIT);
  const nasobek = (1 + cas / CAS_PLNYCH_RARIT) * Math.max(1, (hra.hrdina.stesti ?? 1) * (hra.hrdina.stestiKaret ?? 1));
  const od = Math.max(0, PORADI_RARIT.indexOf(minimum));
  const vahy = PORADI_RARIT.map((id, i) => (i < od ? 0 : RARITY[id].vaha * (i > 0 ? nasobek : 1)));
  const soucet = vahy.reduce((a, b) => a + b, 0);
  return Object.fromEntries(PORADI_RARIT.map((id, i) => [id, vahy[i] / soucet]));
}

// Jeden los z rng na kartu, ať je počet losů pořád stejný (Štěstí nesmí posunout náhodu vln).
function losujRaritu(hra, minimum) {
  const sance = sanceRarit(hra, minimum);
  let los = hra.rng.dalsi();
  for (const id of PORADI_RARIT) {
    los -= sance[id];
    if (los < 0) return id;
  }
  return PORADI_RARIT[PORADI_RARIT.length - 1];
}

// Kolik dá pasiva celkem na úrovni u: násobek vlastnosti (u pricti přičtené číslo). Úrovně 1–5 se násobí
// jako dřív, další jen přičtou dal k násobku z 5. úrovně, nanejvýš po strop (u záporného nasobku nebo pricti
// nejníž po něj).
export function hodnotaPasivy(id, uroven) {
  const p = PASIVY[id];
  const u = Math.max(0, Math.floor(uroven));
  const pod = Math.min(u, ZAKLAD_UROVNI);
  const nad = u - pod;
  const strop = STROPY.pasivy[id];
  if (p.pricti) {
    const soucet = p.pricti * pod + p.dal * nad;
    if (strop === undefined) return soucet;
    return p.pricti < 0 ? Math.max(soucet, strop) : Math.min(soucet, strop);
  }
  const hodnota = (1 + p.nasobek) ** pod * (1 + p.dal * nad);
  if (strop === undefined) return hodnota;
  return p.nasobek < 0 ? Math.max(hodnota, strop) : Math.min(hodnota, strop);
}

// Na úrovni u (z u - 1) už pasiva nic nepřidá a mění se v poškození (Příval už od 4. úrovně).
export function pasivaNaStropu(id, u) {
  return u > 0 && !(Math.abs(hodnotaPasivy(id, u) - hodnotaPasivy(id, u - 1)) > 1e-12);
}

// Číslo do řádku pasivy v přehledu v pauze (texty pauza.prehled.hodnoty): co pasiva sama dává na své úrovni.
// Násobky jako procenta navíc (Rychlé ruce o kolik kratší nabíjení), podíly (procenta v PASIVY) v procentech,
// ostatní jak jsou (životy, zbroj, kusy). Štít ukáže, za kolik sekund se bublina opravdu dobije.
export function cisloPasivy(hra, id) {
  const p = PASIVY[id];
  if (!p) return 0;
  if (id === 'stit') return dobitiStitu(hra);
  const h = hodnotaPasivy(id, hra.pasivy?.[id] ?? 0);
  if (p.pricti) return p.procenta ? h * 100 : h;
  return Math.abs(h - 1) * 100;
}

const procent = (x) => Math.round(x * 100);

// Stejné řádky za sebou se slijí: „2× +3 % rychlost pohybu“.
function slij(radky) {
  const vysledek = [];
  for (const radek of radky) {
    const posledni = vysledek[vysledek.length - 1];
    if (posledni?.radek === radek) posledni.kolik += 1;
    else vysledek.push({ radek, kolik: 1 });
  }
  return vysledek.map(({ radek, kolik }) => (kolik > 1 ? t('karta.vickrat', { n: kolik, radek }) : radek));
}

// Řádky karty pro úrovně od + 1 až do. Do 5. úrovně řádky z popisu zbraně, nad ní součet poškození a co
// přidala třetí úroveň (víc kusů, nabíjení, velikost). Pasiva má řádek za každou úroveň.
export function popisUrovni(druh, id, od, uroven) {
  if (druh === 'pasiva') {
    const p = PASIVY[id];
    const radky = [];
    for (let u = od + 1; u <= uroven; u++) {
      if (pasivaNaStropu(id, u)) radky.push(t('karta.silaVsech', { n: procent(SILA_ZA_PREBYTEK) }));
      else if (u === 1 && p.popisPrvni) radky.push(p.popisPrvni);
      else if (u <= ZAKLAD_UROVNI) radky.push(p.popis);
      else radky.push(p.popisDal);
    }
    return slij(radky);
  }
  const vzor = ZBRANE[id];
  const radky = vzor.popis.slice(od, Math.min(uroven, ZAKLAD_UROVNI));
  if (uroven > ZAKLAD_UROVNI) {
    const pred = bonusZaUroven(id, Math.max(od, ZAKLAD_UROVNI));
    const po = bonusZaUroven(id, uroven);
    radky.push(t('karta.poskozeni', { n: procent(po.poskozeni - pred.poskozeni) }));
    for (const co of ['pocet', 'nabiti', 'velikost']) {
      if (po[co] !== pred[co]) radky.push(vzor.dal.texty[co]);
    }
  }
  return radky;
}

// Karta vylepšení pro současný stav: od které úrovně, na kterou (kroku = kolik úrovní přidá, vždy celá
// rarita, strop není), řádky popisu za nové úrovně a bonus rarity (poškození navíc, doléčení).
export function karta(hra, druh, id, rarita = 'bezna') {
  if (!Object.hasOwn(RARITY, rarita)) rarita = 'bezna';
  const r = RARITY[rarita];
  const radky = [];
  if (r.sila > 0) radky.push(t('karta.silaVsech', { n: procent(r.sila) }));
  if (r.doleceni) radky.push(t('karta.doleciVse'));
  const bonusy = { bonus: { sila: r.sila, doleceni: r.doleceni }, bonusy: radky };
  if (druh === 'zbran' || druh === 'pasiva') {
    const vzor = druh === 'zbran' ? ZBRANE[id] : PASIVY[id];
    const od = (druh === 'zbran' ? hra.zbrane[id]?.uroven : hra.pasivy[id]) ?? 0;
    const kroku = r.urovni;
    // U nové zbraně je první řádek, co zbraň dělá (že je nová, ukáže karta u úrovní).
    const popis = popisUrovni(druh, id, od, od + kroku);
    return { druh, id, nazev: vzor.nazev, ikona: vzor.ikona, rarita, od, uroven: od + kroku, kroku, popis, ...bonusy };
  }
  // Odpočinek jen léčí, čím vzácnější, tím víc. Poškození nepřidá. Úrovně nemají strop, takže se nabídne,
  // jen kdyby nebylo co vylepšit (pojistka).
  const kroku = r.urovni;
  return {
    druh: 'leceni', id: 'leceni', nazev: t('karta.odpocinek'), ikona: 'odpocinek', rarita, od: 0, uroven: 0, kroku,
    popis: [r.doleceni ? t('karta.doleciVse') : t('karta.doleci', { n: LECENI_ODPOCINKU * kroku })],
    bonus: { sila: 0, doleceni: r.doleceni }, bonusy: [],
  };
}

// Tři různé karty ze všech zbraní a pasiv (úrovně nemají strop, takže nabídka nikdy nedojde). Každá možnost má
// váhu (pasiva vaha, jinak 1) a na kartu padne jeden los z rng jako dřív (se stejnými vahami vyjde stejná karta).
export function nabidka(hra, minimum = 'bezna') {
  const moznosti = [
    ...Object.keys(ZBRANE).map((id) => ['zbran', id]),
    ...Object.keys(PASIVY).map((id) => ['pasiva', id]),
  ];
  const vaha = ([druh, id]) => (druh === 'pasiva' ? PASIVY[id].vaha ?? 1 : 1);
  const vybrane = [];
  while (vybrane.length < 3 && moznosti.length) {
    let los = hra.rng.dalsi() * moznosti.reduce((a, m) => a + vaha(m), 0);
    let i = 0;
    while (i < moznosti.length - 1 && (los -= vaha(moznosti[i])) >= 0) i++;
    const [druh, id] = moznosti.splice(i, 1)[0];
    vybrane.push(karta(hra, druh, id, losujRaritu(hra, minimum)));
  }
  if (!vybrane.length) vybrane.push(karta(hra, 'leceni', 'leceni', losujRaritu(hra, minimum)));
  return vybrane;
}

// Pasiva z úrovně u - 1 na u. Úrovně 1–5 násobí přesně jako dřív (stejná hra se stejným semínkem),
// další o poměr hodnot. Na stropu přidá poškození všech zbraní.
function pridejPasivu(hrdina, id, u) {
  const p = PASIVY[id];
  if (pasivaNaStropu(id, u)) {
    hrdina.sila *= 1 + SILA_ZA_PREBYTEK;
    return;
  }
  const pred = hodnotaPasivy(id, u - 1);
  const ted = hodnotaPasivy(id, u);
  if (p.pricti) {
    hrdina[p.vlastnost] += ted - pred;
    if (p.vlastnost === 'maxHp') hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + ted - pred);
  } else {
    hrdina[p.vlastnost] *= u <= ZAKLAD_UROVNI ? 1 + p.nasobek : ted / pred;
  }
}

// Použije kartu: zbraň nebo pasiva vyskočí o kroku úrovní, pak bonus rarity. Okno karet zavře.
export function vyber(hra, volba) {
  pouzijKartu(hra, volba);
  hra.volby = null;
  hra.zTruhly = false;
  hra.truhlaKus = null;
  hra.odemceno = null;
}

// Co karta dá (i bez okna karet: Náhodné vylepšení od kupce).
function pouzijKartu(hra, volba) {
  const { hrdina } = hra;
  const predLecenim = hrdina.hp;
  const cil = Math.max(0, Math.floor(volba.uroven ?? 0));
  if (volba.druh === 'zbran') {
    // Kdy hrdina zbraň dostal (průměr DPS v pauze se počítá od té doby, startovní zbraně od 0).
    if (!hra.zbrane[volba.id]) (hra.ziskano ??= {})[volba.id] = hra.cas;
    hra.zbrane[volba.id] = { ...(hra.zbrane[volba.id] ?? { nabiti: 0 }), uroven: Math.max(cil, hra.zbrane[volba.id]?.uroven ?? 0) };
  } else if (volba.druh === 'pasiva') {
    for (let u = (hra.pasivy[volba.id] ?? 0) + 1; u <= cil; u++) pridejPasivu(hrdina, volba.id, u);
    hra.pasivy[volba.id] = Math.max(cil, hra.pasivy[volba.id] ?? 0);
  } else {
    hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + LECENI_ODPOCINKU * (volba.kroku ?? 1));
  }
  if (volba.bonus?.sila > 0) hrdina.sila *= 1 + volba.bonus.sila;
  if (volba.bonus?.doleceni) hrdina.hp = hrdina.maxHp;
  if (volba.druh === 'leceni' || volba.bonus?.doleceni) cisloLeceni(hra, hrdina.hp - predLecenim);
}

// Co hrdina právě má, v pořadí, jak to dostal (zbraně, pak pasivy): pro přehled výbavy v rohu obrazovky.
// stupen = barva rámečku podle úrovně (stupenUrovne). Kreslí to vybava.js, tady jsou jen data.
export function seznamVybavy(hra) {
  const polozka = (druh, id, vzor, uroven) => ({ druh, id, nazev: vzor.nazev, ikona: vzor.ikona, uroven, stupen: stupenUrovne(uroven) });
  return {
    zbrane: Object.entries(hra.zbrane)
      .filter(([id, z]) => Object.hasOwn(ZBRANE, id) && z?.uroven > 0)
      .map(([id, z]) => polozka('zbran', id, ZBRANE[id], z.uroven)),
    pasivy: Object.entries(hra.pasivy)
      .filter(([id, u]) => Object.hasOwn(PASIVY, id) && u > 0)
      .map(([id, u]) => polozka('pasiva', id, PASIVY[id], u)),
  };
}
