// Pravidla hry: pohyb, zbraně, nepřátelé, krystaly zkušeností a vylepšení.
import { pouzijVylepseni } from './duse.js';
import { PORADI_SLOTU, ucinekVystroje, losujKus, zlatakyZaKus } from './vystroj.js';

// ikona = jméno spritu, který se ukáže na kartě vylepšení. popis = řádek za každou z úrovní 1–5.
// dal = jak zbraň roste nad 5. úrovní (bonusZaUroven): poradi = co přidá každá třetí úroveň (dokola) a která
// čísla ze statyZbrane to jsou. poskozeni a velikost se násobí, pocet je jedno číslo (+1 kus), nabiti se
// násobí (kratší nabíjení). maxPocet = nižší strop kusů než STROPY.pocet. texty = řádek na kartě.
// Krumpáče a zrcadla se netočí rychleji: při velké rychlosti by mezi dvěma snímky přeskočily nepřítele.
export const ZBRANE = {
  jiskra: {
    nazev: 'Jiskra', ikona: 'jiskra',
    popis: ['Střílí jiskry na nejbližšího nepřítele.', '+1 jiskra', 'Rychlejší střelba', '+1 jiskra', 'Větší poškození'],
    dal: {
      poradi: ['pocet', 'nabiti'], poskozeni: ['poskozeni'], pocet: 'pocet', nabiti: ['nabiti'],
      texty: { pocet: '+1 jiskra', nabiti: 'Rychlejší střelba' },
    },
  },
  lucerna: {
    nazev: 'Lucerna', ikona: 'lucerna',
    popis: ['Žár lucerny pálí nepřátele kolem tebe.', 'Větší dosah', 'Silnější žár', 'Větší dosah', 'Silnější žár'],
    dal: {
      poradi: ['velikost', 'nabiti'], poskozeni: ['zar'], nabiti: ['tik'], velikost: ['dosah'],
      texty: { velikost: 'Větší dosah', nabiti: 'Častější žár' },
    },
  },
  krumpace: {
    nazev: 'Krumpáče', ikona: 'krumpac',
    popis: ['Krumpáč krouží kolem tebe.', '+1 krumpáč', 'Rychlejší otáčení', '+1 krumpáč', 'Větší poškození'],
    dal: {
      poradi: ['pocet', 'velikost'], poskozeni: ['poskozeni'], pocet: 'pocet', velikost: ['polomer'],
      texty: { pocet: '+1 krumpáč', velikost: 'Širší kruh' },
    },
  },
  blesk: {
    nazev: 'Blesk', ikona: 'blesk',
    popis: ['Blesk udeří do nepřítele a přeskočí na další.', '+1 přeskok', 'Častější údery', '+2 přeskoky', 'Větší poškození'],
    dal: {
      poradi: ['pocet', 'nabiti', 'velikost'], poskozeni: ['poskozeni'], pocet: 'preskoky', nabiti: ['nabiti'], velikost: ['skok'],
      texty: { pocet: '+1 přeskok', nabiti: 'Častější údery', velikost: 'Delší přeskoky' },
    },
  },
  trny: {
    nazev: 'Trnová past', ikona: 'trny',
    popis: ['Pod nejbližším nepřítelem vyraší trny, které zraňují a zpomalí.', '+1 trs trnů', 'Větší trsy, vydrží déle', '+1 trs trnů', 'Ostřejší trny, zpomalí víc'],
    // Bez kratšího nabíjení: víc trsů naráz, než unese MAX_TRNU, by staré trsy mazalo dřív, než zalezou.
    dal: {
      poradi: ['pocet', 'velikost'], poskozeni: ['poskozeni'], pocet: 'pocet', velikost: ['polomer'], maxPocet: 8,
      texty: { pocet: '+1 trs trnů', velikost: 'Větší trsy' },
    },
  },
  zrcadlo: {
    nazev: 'Zrcadlový štít', ikona: 'zrcadlo',
    popis: ['Zrcadlo krouží těsně u tebe, vrací střely a odhodí, kdo se ho dotkne.', '+1 zrcadlo', 'Silnější odhození', '+1 zrcadlo', 'Větší zrcadla, víc poškození'],
    dal: {
      poradi: ['pocet', 'velikost'], poskozeni: ['poskozeni', 'odraz'], pocet: 'pocet', velikost: ['velikost'], maxPocet: 8,
      texty: { pocet: '+1 zrcadlo', velikost: 'Větší zrcadla' },
    },
  },
};

// Pasivy: na úrovních 1–5 dá každá úroveň plný díl (násobí vlastnost hrdiny o nasobek, Srdce přičte pricti),
// od 6. jen menší díl dal (přičítá se k násobku z 5. úrovně) a popisDal na kartě. Kde je strop (STROPY.pasivy),
// tam se pasiva po jeho dosažení promění v +3 % poškození všech zbraní za úroveň (SILA_ZA_PREBYTEK).
export const PASIVY = {
  srdce: {
    nazev: 'Srdce', ikona: 'srdce', popis: '+20 max. životů a doléčení', vlastnost: 'maxHp', pricti: 20,
    dal: 10, popisDal: '+10 max. životů a doléčení',
  },
  boty: {
    nazev: 'Boty', ikona: 'boty', popis: '+12 % rychlost pohybu', vlastnost: 'rychlost', nasobek: 0.12,
    dal: 0.03, popisDal: '+3 % rychlost pohybu',
  },
  magnet: {
    nazev: 'Magnet', ikona: 'magnet', popis: '+40 % dosah sběru krystalů', vlastnost: 'magnet', nasobek: 0.4,
    dal: 0.1, popisDal: '+10 % dosah sběru krystalů',
  },
  sila: {
    nazev: 'Síla', ikona: 'sila', popis: '+15 % poškození všech zbraní', vlastnost: 'sila', nasobek: 0.15,
    dal: 0.05, popisDal: '+5 % poškození všech zbraní',
  },
};

// Úrovně nemají strop. Úrovně 1–5 popisuje každá zbraň a pasiva sama (popis), od 6. dál dá každá úroveň menší
// díl: zbraň +8 % poškození (proti 5. úrovni, sčítá se) a každá třetí (8, 11, 14, …) navíc jednu věc z dal.poradi
// o kus, o 10 % kratší nabíjení (násobí se) nebo o 15 % větší dosah či velikost (sčítá se). Evoluce zbraní
// půjdou od ZAKLAD_UROVNI dál.
export const ZAKLAD_UROVNI = 5;
export const RUST_UROVNI = { poskozeni: 0.08, kazda: 3, nabiti: 0.9, velikost: 0.15 };
// Stropy jen tam, kde by se hra rozbila (všechno proti 5. úrovni zbraně). Když je zbraň na stropu všude, roste
// už jen poškození. pasivy = nejvyšší násobek vlastnosti od pasivy celkem: rychlejšímu hrdinovi by všechno
// uteklo a osminásobný magnet už sahá přes celou obrazovku.
export const STROPY = {
  pocet: 12,
  nabiti: 0.25,
  velikost: 2.5,
  pasivy: { boty: 2, magnet: 8 },
};
// Od těchto úrovní mění barvu rámeček v přehledu výbavy a čtverečky na kartě (stupenUrovne).
export const STUPNE_UROVNI = [5, 10, 15];

// Rarita karty při nové úrovni: kolik úrovní karta přidá a jaký bonus dá navíc.
// vaha = jak často padá na začátku hry; vzácnějších rarit časem přibývá (v 15. minutě 2×) a Štěstí je násobí dál.
// Úrovně nemají strop, takže karta přidá vždy celý počet úrovní své rarity.
// Váhy a bonusy jsou nízko schválně: s dvojnásobnými rozjel bot v simulaci sněhovou kouli a přežil přes 20 minut.
export const RARITY = {
  bezna: { nazev: 'Běžná', urovni: 1, sila: 0, doleceni: false, vaha: 100 },
  vzacna: { nazev: 'Vzácná', urovni: 2, sila: 0, doleceni: false, vaha: 12 },
  epicka: { nazev: 'Epická', urovni: 2, sila: 0.05, doleceni: false, vaha: 3.5 },
  legendarni: { nazev: 'Legendární', urovni: 3, sila: 0.1, doleceni: true, vaha: 1 },
};
export const PORADI_RARIT = Object.keys(RARITY);
// Úroveň pasivy, která už je na stropu, dá místo toho +3 % poškození všech zbraní.
export const SILA_ZA_PREBYTEK = 0.03;
export const CAS_PLNYCH_RARIT = 900;
export const LECENI_ODPOCINKU = 30;

// Třídy hrdiny: každá začíná s jinou zbraní a má jednu výhodu. Výhoda násobí vlastnost hrdiny
// (nabijeni < 1 = zbraně se nabíjí rychleji). Sprite má stejné jméno jako třída.
export const TRIDY = {
  lovec: {
    nazev: 'Lovec', zbran: 'jiskra', vyhoda: '+15 % rychlost pohybu', nasobky: { rychlost: 1.15 },
    popis: 'Stopař z okraje lesa. Uteče skoro všemu.',
  },
  havir: {
    nazev: 'Havíř', zbran: 'krumpace', vyhoda: '+30 % životů', nasobky: { maxHp: 1.3 },
    popis: 'Zná každou štolu. Vydrží ránu jako skála.',
  },
  svetlonos: {
    nazev: 'Světlonoš', zbran: 'lucerna', vyhoda: '+50 % dosah sběru', nasobky: { magnet: 1.5 },
    popis: 'Nese světlo do tmy. Krystaly letí k němu samy.',
  },
  bourlivak: {
    nazev: 'Bouřlivák', zbran: 'blesk', vyhoda: '-20 % nabíjení zbraní', nasobky: { nabijeni: 0.8 },
    popis: 'Volá bouři z hlubin. Udeří dřív než ostatní.',
  },
};
export const VYCHOZI_TRIDA = 'lovec';

export function platnaTrida(id) {
  return typeof id === 'string' && Object.hasOwn(TRIDY, id) ? id : VYCHOZI_TRIDA;
}

// Hrozba: hra nemá konec, nepřátelé s časem plynule sílí. min = minuty hry i se zlomky, nahoře se ukazuje
// Hrozba N = 1 + celé minuty (každou minutu +1 a krátké ohlášení). Celý vzorec je v téhle tabulce (silaHrozby):
//   životy     × (1 + zivoty · min) · narustZivotu ^ (min − narustOd)   (exponent jen nad narustOd)
//   bossové    × (1 + bossZivoty · min + bossNavic · (min − castejiOd)) · stejný nárůst   (bossNavic až od castejiOd)
//   poškození  × (1 + poskozeni · min) · narustPoskozeni ^ (min − narustOd)   (dotyk, útoky bossů i jedový oblak)
//   rychlost   × (1 + rychlost · min) · narustRychlosti ^ (min − narustOd), nanejvýš maxRychlost
//   vlna každých max(nejkratsiVlna, prvniVlna − zkraceniVlny · min) s, v ní 1 + celé(davka · min) nepřátel, nanejvýš maxDavka
//   na louce nejvýš maxNepratel + navicNepratel · min, nanejvýš stropNepratel
//   elita: od elitaOd šance elitaSance na každého z vlny, od castejiOd navíc + elitaRust · (min − castejiOd), nanejvýš elitaMax
// Exponenty od narustOd jsou pojistka, že nikdo nevydrží donekonečna: zbraně bez stropu úrovní by jinak lineární
// růst přerostly, rychlý hrdina by nepřátelům utíkal napořád a srdce ze zabitých by doléčila každou ránu.
// Vyváženo simulací (tests/simulace.mjs, hrozba.preziti_min): bot bez trvalých vylepšení vydrží zhruba 4–15 min,
// se všemi na maximu (a s výbavou bossů z truhel) 19–21 min. Brzký růst rychlosti je citlivý: už 0,015 místo 0,01 složí slabého bota v 6. minutě.
export const HROZBA = {
  zivoty: 0.1, narustOd: 8, narustZivotu: 1.25, bossZivoty: 0.2, bossNavic: 0.3,
  poskozeni: 0.05, narustPoskozeni: 1.1,
  rychlost: 0.01, narustRychlosti: 1.08, maxRychlost: 3,
  prvniVlna: 1.2, zkraceniVlny: 1 / 3, nejkratsiVlna: 0.25, davka: 1, maxDavka: 40,
  maxNepratel: 350, navicNepratel: 5, stropNepratel: 450,
  elitaOd: 5, castejiOd: 10, elitaSance: 0.01, elitaRust: 0.01, elitaMax: 0.15,
};
// Elita je obyčejný nepřítel z vlny, jen o třetinu větší (kreslí se 4 px na pixel místo 3), s rudým obrysem
// a mnohem odolnější. Za to nechá velký krystal.
export const ELITA = { zivoty: 5, poskozeni: 1.5, velikost: 4 / 3, xp: 6 };
export const TRVANI_HLASENI_HROZBY = 2.2;

// Síla nepřátel v daném čase hry (sekundy) podle tabulky HROZBA.
export function silaHrozby(cas) {
  const h = HROZBA;
  const min = Math.max(0, Number(cas) || 0) / 60;
  const nad = Math.max(0, min - h.narustOd);
  const narust = h.narustZivotu ** nad;
  const casteji = Math.max(0, min - h.castejiOd);
  return {
    min,
    uroven: 1 + Math.floor(min),
    zivoty: (1 + h.zivoty * min) * narust,
    bossZivoty: (1 + h.bossZivoty * min + h.bossNavic * casteji) * narust,
    poskozeni: (1 + h.poskozeni * min) * h.narustPoskozeni ** nad,
    rychlost: Math.min(h.maxRychlost, (1 + h.rychlost * min) * h.narustRychlosti ** nad),
    vlna: Math.max(h.nejkratsiVlna, h.prvniVlna - h.zkraceniVlny * min),
    davka: Math.min(h.maxDavka, 1 + Math.floor(h.davka * min)),
    maxNepratel: Math.min(h.stropNepratel, Math.round(h.maxNepratel + h.navicNepratel * min)),
    elita: min < h.elitaOd ? 0 : Math.min(h.elitaMax, h.elitaSance + h.elitaRust * casteji),
  };
}

// Text ohlášení při nové úrovni hrozby. Na začátku častějších elit se řekne proč.
export function textHrozby(uroven) {
  if (uroven === HROZBA.castejiOd + 1) return `Hrozba ${uroven}: víc elit, silnější bossové`;
  if (uroven === HROZBA.elitaOd + 1) return `Hrozba ${uroven}: přicházejí elity`;
  return `Hrozba ${uroven}: nepřátelé sílí`;
}

const MAX_KRYSTALU = 300;
const SANCE_SRDCE = 0.012;
const SANCE_MAGNET = 0.003;
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
// Pavouk zalepí hrdinu sítí: na chvíli zpomalí. Opakovaný zásah síť obnoví, nesčítá se.
export const OD_PAVOUKU = 240;
export const TRVANI_SITE = 1.5;
export const ZPOMALENI_SITI = 0.6;
// Oživení (trvalé vylepšení): hrdina vstane s půlkou životů, chvíli je nezranitelný a duše odhodí nepřátele kolem.
export const ZIVOTY_PO_OZIVENI = 0.5;
export const NEZRANITELNY_PO_OZIVENI = 2;
export const ODHOZENI_PRI_OZIVENI = 160;
export const TRVANI_ZABLESKU = 0.8;
// Duch letí rovně tam, kde hrdina zrovna byl, a proletí skrz. Pak na chvíli zmizí: neublíží, zbraně ho
// nevidí a dál letí stejným směrem. Až se zase ukáže, zamíří znovu.
export const OD_DUCHU = 90;
export const VIDITELNY_DUCH = 2.6;
export const SKRYTY_DUCH = 0.9;
// Duchy jde těžko trefit, takže by se jich jinak nahromadilo plno. Nad tenhle počet místo nich přiletí netopýr.
export const MAX_DUCHU = 24;
// Houbák je pomalý, ale po smrti nechá na 3 s jedový oblak, který zraňuje hrdinu, dokud v něm stojí.
// Prvních pár desetin sekundy se oblak teprve nafukuje a nepálí, ať má hráč čas uhnout.
export const OD_HOUBAKU = 120;
export const TRVANI_OBLAKU = 3;
export const NAFUKOVANI_OBLAKU = 0.4;
export const POLOMER_OBLAKU = 36;
export const JED_OBLAKU = 4;
const MAX_OBLAKU = 40;
// Vlci chodí jen ve smečkách, které se vynoří na jednom místě okraje. První smečka přijde chvíli
// po prvním Strážci, ať se jejich ohlášení nepřekryjí.
export const OD_VLKU = 180;
export const SMECKA_OD = 4;
export const SMECKA_DO = 6;
const PRVNI_SMECKA = OD_VLKU + 10;
const SMECKA_KAZDYCH = 24;
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
// Co z bedny vypadne a jak často (součet 1). Zlaťák je po hře duše navíc. Bomba je vzácná: složí všechny
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
  dupnuti: { nazev: 'Dupnutí', varovani: VAROVANI, dosah: 250, polomer: 170, poskozeni: 16, odhozeni: 90 },
  // Hod: boss zvedne kameny nad hlavu a hodí je obloukem. První dopadne tam, kam hrdina běží (stojícímu pod
  // nohy), ostatní kolem do rozptylu. Stín na zemi ukazuje dopad celý let, po dopadu malý výbuch (polomer).
  // strela = sprite letící věci, sit = zásah zalepí hrdinu sítí.
  hod: {
    nazev: 'Hod', varovani: VAROVANI, dosah: 560, strela: 'kamen', pocet: [3, 5], let: 0.9, polomer: 30, poskozeni: 14,
    rozptyl: 72, predstih: 1, sit: false,
  },
  // Výpad: boss míří (čára na zemi), posledních zamek s už směr nemění, pak proběhne rovně delka px rychlostí
  // rychlost. Koho cestou trefí, ten dostane ránu a odletí stranou od dráhy.
  vypad: { nazev: 'Výpad', varovani: VAROVANI, dosah: 420, zamek: 0.3, rychlost: 520, delka: 520, poskozeni: 16, odhozeni: 70 },
  // Vyvolání: kolem bosse se rozzáří kruhy a z nich vylezou pomocníci (druh). Živých pomocníků toho druhu od
  // všech bossů je nejvýš max, když je plno, boss vezme jinou schopnost. vyrazi = hned po vylezení běží rychleji.
  vyvolani: { nazev: 'Vyvolání', varovani: VAROVANI, dosah: 640, druh: 'netopyr', pocet: [6, 8], max: 16, vzdalenost: 50, vyrazi: false },
  // Vějíř: boss se přenese kousek od hrdiny (na obrazovku), nabije se a vystřelí salv vějířů po strel střelách,
  // každý znovu namířený na hrdinu.
  vejir: { nazev: 'Vějíř', varovani: VAROVANI, strel: 5, salv: 2, mezi: 0.4, rozestup: 0.22, poskozeni: 8, rychlost: 160 },
};
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
    nazev: 'Strážce hlubin', prichod: 'Země se třese, přichází Strážce hlubin', porazen: 'Strážce hlubin poražen', pauza: 3,
    schopnosti: [{ id: 'dupnuti' }, { id: 'vypad' }, { id: 'vyvolani', druh: 'kostlivec', pocet: [6, 6], max: 12, vzdalenost: 60 }],
  },
  matka: {
    nazev: 'Matka pavouků', prichod: 'Ze tmy se spouští Matka pavouků', porazen: 'Matka pavouků poražena', pauza: 2.8,
    schopnosti: [
      { id: 'vyvolani', druh: 'pavoucek', pocet: [6, 8], max: MAX_PAVOUCKU, vzdalenost: 6, vyrazi: true },
      { id: 'hod', strela: 'kokon', pocet: [3, 3], poskozeni: 8, polomer: 34, rozptyl: 64, sit: true },
      { id: 'vypad', rychlost: 600, delka: 440, poskozeni: 12, odhozeni: 50 },
    ],
  },
  obr: {
    nazev: 'Kamenný obr', prichod: 'Louka duní pod kroky Kamenného obra', porazen: 'Kamenný obr poražen', pauza: 2.6,
    schopnosti: [{ id: 'hod' }, { id: 'dupnuti', polomer: 200, dosah: 280, poskozeni: 20, odhozeni: 120 }],
  },
  bludicka: {
    nazev: 'Bludička', prichod: 'Ve tmě bliká Bludička. Nechoď za ní', porazen: 'Bludička poražena', pauza: 3,
    schopnosti: [{ id: 'vejir' }, { id: 'vyvolani', druh: 'duch', pocet: [6, 6], max: 8, vzdalenost: 40 }],
  },
};
// Schopnosti jednoho bosse v pořadí, jak je střídá: data ze SCHOPNOSTI a přes ně to, co má boss jinak.
const SEZNAM_SCHOPNOSTI = Object.fromEntries(Object.entries(BOSSOVE).map(([druh, b]) => [
  druh, b.schopnosti.map((s) => ({ ...SCHOPNOSTI[s.id], ...s })),
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
export const MAX_TRNU = 30;
// Zrcadlový štít: zrcadla krouží těsně u hrdiny. Střelu bosse, která do zrcadla narazí, pošle zpátky
// (rychleji a zraní nepřátele, ne hrdinu). Nepřítel, který se zrcadla dotkne, dostane ránu a odletí od hrdiny
// (bossové jsou moc těžcí, ti jen dostanou ránu).
export const TRVANI_ODHOZENI = 0.2;
export const ZRYCHLENI_ODRAZU = 1.3;
const ZIVOT_ODRAZU = 2;
export const TRVANI_ODLESKU = 0.25;

// Výbava bossů (data a staty v vystroj.js). Truhla bosse se po dotyku TRVANI_OTEVRENI s otevírá a svět mezitím
// stojí, pak dá kus výbavy a kartu. Efekty sad: rázová vlna běží RYCHLOST_VLNY_HRDINY px/s a první vyběhne
// PRVNI_VLNA_HRDINY s po nasazení. Zapředený nepřítel stojí, boss v síti jde ZPOMALENI_SITE_BOSSE.
export const TRVANI_OTEVRENI = 1;
export const RYCHLOST_VLNY_HRDINY = 420;
export const PRVNI_VLNA_HRDINY = 1;
export const ZPOMALENI_SITE_BOSSE = 0.5;

const NEPRATELE = {
  netopyr: { hp: 10, rychlost: 72, poskozeni: 5, xp: 1, polomer: 10 },
  slizak: { hp: 32, rychlost: 42, poskozeni: 10, xp: 2, polomer: 12 },
  kostlivec: { hp: 60, rychlost: 58, poskozeni: 14, xp: 3, polomer: 11 },
  pavouk: { hp: 8, rychlost: 100, poskozeni: 4, xp: 2, polomer: 9, sit: true },
  duch: { hp: 18, rychlost: 80, poskozeni: 7, xp: 2, polomer: 10, duch: true },
  houbak: { hp: 32, rychlost: 30, poskozeni: 8, xp: 3, polomer: 12, jed: true },
  vlk: { hp: 16, rychlost: 104, poskozeni: 6, xp: 2, polomer: 10 },
  pavoucek: { hp: 8, rychlost: 92, poskozeni: 3, xp: 1, polomer: 7, sit: true },
  strazce: { hp: 320, rychlost: 48, poskozeni: 22, xp: 25, polomer: 22, boss: true },
  matka: { hp: 280, rychlost: 54, poskozeni: 16, xp: 25, polomer: 22, boss: true },
  obr: { hp: 420, rychlost: 34, poskozeni: 26, xp: 30, polomer: 24, boss: true },
  bludicka: { hp: 240, rychlost: 40, poskozeni: 12, xp: 25, polomer: 18, boss: true },
};
export const RYCHLOST_NEPRATEL = Object.fromEntries(Object.entries(NEPRATELE).map(([id, v]) => [id, v.rychlost]));

// Kdy se ohlásí nový druh nepřátel (podle času, seřazené).
const PRICHODY = [
  { od: OD_DUCHU, text: 'Hlubinami bloudí duchové' },
  { od: OD_HOUBAKU, text: 'Na louce vyrašili houbáci' },
  { od: PRVNI_SMECKA, text: 'Ze tmy vyje smečka vlků' },
  { od: OD_PAVOUKU, text: 'Z hlubin lezou pavouci' },
];

// vylepseni: trvalá vylepšení z menu ({ id: úroveň }), bez nich je hra stejná jako dřív.
export function novaHra(rng, idTridy = VYCHOZI_TRIDA, vylepseni = {}) {
  const trida = platnaTrida(idTridy);
  const hrdina = {
    x: 0, y: 0, hp: 100, maxHp: 100, rychlost: 110, magnet: 64, nabijeni: 1,
    sila: 1, uroven: 1, xp: 0, potreba: potrebaNaUroven(1), nezranitelny: 0, otoceny: 1, sit: 0,
    stesti: 1, zkusenosti: 1, oziveni: 0, vx: 0, vy: 0, odhozen: 0, odhozVx: 0, odhozVy: 0,
    // zbroj = kolik ubere z každé rány (jen z výbavy), neviditelny = jak dlouho ještě je zmizelý (Bludný plamen),
    // doZmizeni = za jak dlouho může zmizet znovu, zmizelX/Y = kde ho nepřátelé viděli naposledy
    zbroj: 0, neviditelny: 0, doZmizeni: 0, zmizelX: 0, zmizelY: 0,
  };
  for (const [vlastnost, nasobek] of Object.entries(TRIDY[trida].nasobky)) hrdina[vlastnost] *= nasobek;
  pouzijVylepseni(hrdina, vylepseni);
  hrdina.hp = hrdina.maxHp;
  return {
    rng,
    trida,
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
    zbrane: { [TRIDY[trida].zbran]: { uroven: 1, nabiti: 0 } },
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
    zlataky: 0,
    bomb: 0,
    vybuch: 0,
    tres: 0,
    uhelKrumpacu: 0,
    uhelZrcadel: 0,
    trny: [],
    odlesky: [],
    odrazeno: 0,
    odhozeno: 0,
    doSpawnu: 0,
    dalsiBoss: BOSS_KAZDYCH,
    bossu: 0,
    rozprsku: 0,
    dalsiSmecka: PRVNI_SMECKA,
    smecek: 0,
    dalsiPrichod: 0,
    oznameni: null,
    // hrozba = úroveň nahoře, hlaseniHrozby = krátké ohlášení po zvýšení, doElity = kolik už se našetřilo
    // šance na elitu (při 1 přijde elita, bez losu z rng, ať se náhoda vln neposune)
    hrozba: 1,
    hlaseniHrozby: null,
    doElity: 0,
    elit: 0,
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
  };
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

// Nové číslo nad hlavou. barva: null = zásah (bílé), 'silny', 'zraneni', 'jed', 'leceni', 'zlato'.
// Kreslení si z vek (trvani − zivot) spočítá, jak vysoko je a jak průhledné, smer je mírný úlet do strany.
function pridejCislo(hra, cislo) {
  const trvani = cislo.zivot ?? TRVANI_CISLA;
  const c = { barva: null, ...cislo, zivot: trvani, trvani, od: hra.cas, pridano: 0, smer: (hra.cisla.length % 3) - 1 };
  hra.cisla.push(c);
  while (hra.cisla.length > MAX_CISEL) hra.cisla.shift().zivot = 0;
  return c;
}

// Číslo zásahu: do stejného nepřítele se během SLUCOVANI_CISEL přičítá, pak vznikne nové.
// Každá rána posune odhad obvyklé silné rány (prahSilneho) kousek nahoru nebo dolů.
function cisloZasahu(hra, n, poskozeni) {
  const prah = hra.prahSilneho;
  hra.prahSilneho = prah * (poskozeni > prah ? 1 + UCENI_PRAHU * (1 - PODIL_SILNYCH) : 1 - UCENI_PRAHU * PODIL_SILNYCH);
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

// zar = zásah žárem lucerny: nepřítel se rozzáří, jinak krátce zbělá.
// S Pavučinou (výbava Matky) se šance ze zásahů sčítá a zásah, na který připadne celá, nepřítele zapřede
// (bez losu z rng, ať se náhoda vln neposune). Kdo už v síti je, šanci nebere.
export function zasah(hra, n, kolik, zar = false) {
  const poskozeni = Math.round(kolik * hra.hrdina.sila);
  n.hp -= poskozeni;
  if (zar) n.zar = TRVANI_ZARU;
  else n.zasazen = 0.1;
  if (poskozeni > 0) cisloZasahu(hra, n, poskozeni);
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

// Zelené +N nad hrdinou, když se opravdu léčil.
function cisloLeceni(hra, kolik) {
  const k = Math.round(kolik);
  if (k > 0) pridejCislo(hra, { x: hra.hrdina.x, y: hra.hrdina.y - 18, text: `+${k}`, hodnota: k, zivot: TRVANI_CISLA_LECENI, barva: 'leceni' });
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
  hrdina.hp = Math.round(hrdina.maxHp * ZIVOTY_PO_OZIVENI);
  hrdina.nezranitelny = NEZRANITELNY_PO_OZIVENI;
  hrdina.sit = 0;
  hra.zablesk = TRVANI_ZABLESKU;
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hrdina);
    if (d >= ODHOZENI_PRI_OZIVENI) continue;
    const uhel = d > 0 ? Math.atan2(n.y - hrdina.y, n.x - hrdina.x) : 0;
    n.x = hrdina.x + Math.cos(uhel) * ODHOZENI_PRI_OZIVENI;
    n.y = hrdina.y + Math.sin(uhel) * ODHOZENI_PRI_OZIVENI;
  }
  hra.oznameni = { text: 'Duše tě vrátily z hlubin', zivot: 3 };
  cisloLeceni(hra, hrdina.hp);
}

// Zranění hrdiny (dotyk nepřítele, útok bosse nebo jedový oblak): červené číslo nad ním, chvíle bez zranění,
// třes, případně konec nebo Oživení. barva 'jed' = rána z oblaku (kreslí se stejně, jen se pozná).
// Zbroj z výbavy ubere z rány svůj díl (aspoň 1 projde vždy). S Bludným plamenem hrdina po ráně zmizí.
function zran(hra, kolik, barva = 'zraneni') {
  const { hrdina } = hra;
  if (hrdina.zbroj > 0 && kolik > 0) kolik = Math.max(1, Math.round(kolik * (1 - hrdina.zbroj)));
  if (kolik > 0) pridejCislo(hra, { x: hrdina.x, y: hrdina.y - 18, text: `-${kolik}`, hodnota: kolik, barva });
  hrdina.hp -= kolik;
  hrdina.nezranitelny = 0.5;
  hra.tres = TRVANI_TRESU;
  if (hrdina.hp <= 0) {
    if (hrdina.oziveni > 0) oziv(hra);
    else hra.konec = true;
  }
  const zmizeni = hra.ucinekVystroje?.efekty.zmizeni;
  if (zmizeni && !hra.konec && hrdina.doZmizeni <= 0) {
    hrdina.neviditelny = zmizeni.trvani;
    hrdina.nezranitelny = Math.max(hrdina.nezranitelny, zmizeni.trvani);
    hrdina.doZmizeni = zmizeni.pauza;
    hrdina.zmizelX = hrdina.x;
    hrdina.zmizelY = hrdina.y;
    hra.efektyPouzito.zmizeni += 1;
    rozprsk(hra, hrdina.x, hrdina.y, 'bludicka', 8);
  }
}

// Rána útokem bosse nebo jedem roste s hrozbou stejně jako dotyk nepřítele.
function ranaHrozby(hra, kolik) {
  return Math.round(kolik * silaHrozby(hra.cas).poskozeni);
}

function polomerSpawnu(sirka, vyska) {
  return Math.hypot(sirka, vyska) / 2 + 40;
}

function naOkraji(hra, sirka, vyska) {
  const uhel = hra.rng.dalsi() * Math.PI * 2;
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
// má navíc ELITA. Exportované kvůli simulaci.
export function pridejNepritele(hra, druh, x, y, elita = false) {
  const vzor = NEPRATELE[druh];
  const sila = silaHrozby(hra.cas);
  const e = elita && !vzor.boss ? ELITA : null;
  const hp = Math.round(vzor.hp * (vzor.boss ? sila.bossZivoty : sila.zivoty) * (e ? e.zivoty : 1));
  // trny = jak dlouho ještě je zpomalený trny, zpomaleni = na kolik, odhozen = ještě letí od zrcadla
  const n = {
    druh, ...vzor, hp, maxHp: hp, zasazen: 0, zar: 0, zasahKrumpacem: 0, zasahZrcadlem: 0, trny: 0, zpomaleni: 1, odhozen: 0, x, y,
    poskozeni: Math.round(vzor.poskozeni * sila.poskozeni * (e ? e.poskozeni : 1)),
    rychlost: vzor.rychlost * sila.rychlost,
  };
  if (e) Object.assign(n, { elita: true, polomer: Math.round(vzor.polomer * e.velikost), xp: vzor.xp * e.xp });
  if (n.duch) {
    n.skryty = false;
    n.duchCas = VIDITELNY_DUCH;
    zamir(n, hra.hrdina);
  }
  // doSchopnosti = kolik zbývá do další schopnosti, dalsiSchopnost = kterou v pořadí zkusí, schopnost = co právě
  // dělá (null = chodí), zuri = má pod ZURIVOST životů, zjeveni = Bludička se právě objevila jinde (pro kreslení).
  if (n.boss) Object.assign(n, { doSchopnosti: PRVNI_SCHOPNOST, dalsiSchopnost: 0, schopnost: null, zuri: false, zjeveni: 0 });
  hra.nepratele.push(n);
  return n;
}

// Vlna z okraje. Elitou se stane ten, na koho připadne našetřená šance (duch ne, toho jde i tak těžko trefit).
function spawn(hra, sirka, vyska) {
  const { rng, cas } = hra;
  const sila = silaHrozby(cas);
  if (hra.nepratele.length >= sila.maxNepratel) return;
  const druhy = ['netopyr'];
  if (cas > 60) druhy.push('slizak');
  if (cas > OD_DUCHU) druhy.push('duch');
  if (cas > OD_HOUBAKU) druhy.push('houbak');
  if (cas > 150) druhy.push('kostlivec');
  if (cas > OD_PAVOUKU) druhy.push('pavouk');
  let duchu = hra.nepratele.filter((n) => n.duch).length;
  for (let i = 0; i < sila.davka; i++) {
    let druh = rng.vyber(druhy);
    if (druh === 'duch' && duchu >= MAX_DUCHU) druh = 'netopyr';
    if (druh === 'duch') duchu += 1;
    const { x, y } = naOkraji(hra, sirka, vyska);
    let elita = false;
    if (druh !== 'duch' && sila.elita > 0) {
      hra.doElity += sila.elita;
      if (hra.doElity >= 1) {
        hra.doElity -= 1;
        hra.elit += 1;
        elita = true;
      }
    }
    pridejNepritele(hra, druh, x, y, elita);
  }
}

// Smečka vlků vyleze pohromadě na jednom místě okraje, v kroužku kolem vůdce. Přijde i při plné
// louce (obyčejné vlny ji drží na maximu), jen o pár smeček víc už ne.
function smecka(hra, sirka, vyska) {
  if (hra.nepratele.length >= silaHrozby(hra.cas).maxNepratel + SMECKA_DO * 3) return;
  const pocet = hra.rng.cele(SMECKA_OD, SMECKA_DO);
  const { x, y } = naOkraji(hra, sirka, vyska);
  pridejNepritele(hra, 'vlk', x, y);
  for (let i = 1; i < pocet; i++) {
    const uhel = (i / (pocet - 1)) * Math.PI * 2;
    pridejNepritele(hra, 'vlk', x + Math.cos(uhel) * 22, y + Math.sin(uhel) * 22);
  }
  hra.smecek += 1;
}

// Nová bedna kousek za okrajem obrazovky v náhodném směru. Každá třetí je sud (jen jiný vzhled).
// Na místě, kde už nějaká stojí, se nová neobjeví (zkusí to zase příště).
function pridejBednu(hra, sirka, vyska) {
  const { hrdina, rng } = hra;
  const uhel = rng.dalsi() * Math.PI * 2;
  const cos = Math.cos(uhel);
  const sin = Math.sin(uhel);
  // jak daleko je to od hrdiny (středu obrazovky) k okraji obrazovky v tomhle směru
  const kOkraji = Math.min(sirka / 2 / Math.max(Math.abs(cos), 1e-9), vyska / 2 / Math.max(Math.abs(sin), 1e-9));
  const r = kOkraji + OKRAJ_BEDEN + rng.dalsi() * PASMO_BEDEN;
  const x = hrdina.x + cos * r;
  const y = hrdina.y + sin * r;
  if (hra.bedny.some((b) => Math.hypot(b.x - x, b.y - y) < POLOMER_BEDNY * 3)) return;
  hra.bedny.push({ druh: hra.beden % 3 === 2 ? 'sud' : 'bedna', x, y, rozbita: false });
  hra.beden += 1;
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
  trisky(hra, b);
  const vec = losujKorist(hra.rng.dalsi());
  hra.zBeden[vec] += 1;
  if (vec === 'krystal') hra.krystaly.push({ x: b.x, y: b.y, xp: xpZBedny(hra) });
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
  hra.vybuch = TRVANI_VYBUCHU;
  hra.tres = TRVANI_TRESU;
  hra.oznameni = { text: 'Bomba!', zivot: 1.2 };
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
  const zaklad = Math.atan2(hra.hrdina.y - n.y, hra.hrdina.x - n.x);
  for (let i = 0; i < s.strel; i++) {
    const uhel = zaklad + (i - (s.strel - 1) / 2) * s.rozestup;
    hra.strelyBossu.push({ x: n.x, y: n.y, vx: Math.cos(uhel) * s.rychlost, vy: Math.sin(uhel) * s.rychlost, zivot: ZIVOT_STREL_BOSSU, rana: s.poskozeni });
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
      hra.vlny.push({ x: n.x, y: n.y, r: 0, max: s.polomer, poskozeni: s.poskozeni, odhozeni: s.odhozeni, zasahla: false });
      hra.tres = Math.max(hra.tres, TRES_DUPNUTI);
      rozprsk(hra, n.x, n.y + n.polomer / 2, 'kamen', 10);
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
          trvani: s.let, polomer: s.polomer, poskozeni: s.poskozeni, sit: s.sit, druh: s.strela,
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
        hra.zasahyBossu.vypad += 1;
        // Odletí kolmo od dráhy na tu stranu, kde stojí (kdo je přesně na ní, doprava od směru výpadu).
        const strana = (hrdina.x - n.x) * -sch.uy + (hrdina.y - n.y) * sch.ux >= 0 ? 1 : -1;
        zran(hra, ranaHrozby(hra, s.poskozeni));
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
};

// Boss vezme další schopnost v pořadí, kterou teď může použít (hrdina je v dosahu, pomocníci nejsou na maximu).
// Když nejde žádná, zkusí to v dalším snímku.
function zacniSchopnost(hra, n, sirka, vyska) {
  const seznam = schopnostiBosse(n.druh);
  const d = vzdalenost(n, hra.hrdina);
  for (let k = 0; k < seznam.length; k++) {
    const i = (n.dalsiSchopnost + k) % seznam.length;
    const s = seznam[i];
    const prubeh = PRUBEH_SCHOPNOSTI[s.id];
    if ((s.dosah !== undefined && d >= s.dosah) || prubeh.muze?.(hra, n, s) === false) continue;
    n.dalsiSchopnost = (i + 1) % seznam.length;
    n.schopnost = { id: s.id, s, faze: 'varovani', zbyva: s.varovani };
    hra.schopnostiPouzito[s.id] = (hra.schopnostiPouzito[s.id] ?? 0) + 1;
    prubeh.zacni?.(hra, n, n.schopnost, sirka, vyska);
    return;
  }
}

function dokonciSchopnost(n) {
  n.schopnost = null;
  n.doSchopnosti = (BOSSOVE[n.druh]?.pauza ?? 2.5) * (n.zuri ? ZRYCHLENI_ZURIVOSTI : 1);
}

// Schopnosti bossů: odpočet, varování, provedení. Pod ZURIVOST životů boss zuří (jednou se to ohlásí, když
// zrovna neběží jiné čerstvé ohlášení) a střídá schopnosti rychleji.
function schopnostiBossu(hra, dt, sirka, vyska) {
  const nove = [];
  for (const n of hra.nepratele) {
    if (!n.boss || n.hp <= 0) continue;
    n.zjeveni = Math.max(0, n.zjeveni - dt);
    if (!n.zuri && n.hp <= n.maxHp * ZURIVOST) {
      n.zuri = true;
      if (!hra.oznameni || hra.oznameni.zivot < 1) hra.oznameni = { text: `${BOSSOVE[n.druh]?.nazev ?? n.druh} zuří`, zivot: 2 };
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
      if (!prubeh.dal) dokonciSchopnost(n);
    } else if (prubeh.dal(hra, n, sch, dt)) {
      dokonciSchopnost(n);
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
      zran(hra, ranaHrozby(hra, v.poskozeni));
      odhodHrdinu(hra, d > 0 ? (hrdina.x - v.x) / d : 1, d > 0 ? (hrdina.y - v.y) / d : 0, v.odhozeni);
    }
    if (v.r >= v.max) v.konec = true;
  }
  hra.vlny = hra.vlny.filter((v) => !v.konec);
  for (const k of hra.kameny) {
    k.let += dt;
    if (k.let < k.trvani) continue;
    k.dopadl = true;
    rozprsk(hra, k.x, k.y, k.druh, 6);
    hra.dopady.push({ x: k.x, y: k.y, polomer: k.polomer, druh: k.druh, zivot: TRVANI_DOPADU });
    if (vzdalenost(k, hrdina) < k.polomer && muzeDostat()) {
      hra.zasahyBossu.hod += 1;
      zran(hra, ranaHrozby(hra, k.poskozeni));
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
          zasah(hra, n, st.poskozeni);
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
        zran(hra, ranaHrozby(hra, st.rana ?? SCHOPNOSTI.vejir.poskozeni));
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
// n = násobek nabíjení hrdiny. Kratší nabíjení zrychlí všechny zbraně: střelbu, údery, žár lucerny, trny
// i otáčení krumpáčů a zrcadel.
const CISLA_ZBRANI = {
  jiskra: (j, n) => ({ pocet: 1 + (j >= 2) + (j >= 4), nabiti: (j >= 3 ? 0.5 : 0.7) * n, poskozeni: j >= 5 ? 16 : 11 }),
  lucerna: (l, n) => ({ dosah: 56 + 22 * ((l >= 2) + (l >= 4)), zar: 14 + 9 * ((l >= 3) + (l >= 5)), tik: 0.3 * n }),
  krumpace: (k, n) => ({ pocet: 1 + (k >= 2) + (k >= 4), rychlost: (k >= 3 ? 4.5 : 3) / n, poskozeni: k >= 5 ? 18 : 12, polomer: 64 }),
  blesk: (b, n) => ({ preskoky: 2 + (b >= 2) + 2 * (b >= 4), nabiti: (b >= 3 ? 1.5 : 2.2) * n, poskozeni: b >= 5 ? 30 : 20, dosah: 320, skok: 110 }),
  // trny: pocet trsů naráz, poškození za každý tik, zpomaleni = násobek rychlosti nepřítele v trní
  trny: (t, n) => ({
    pocet: 1 + (t >= 2) + (t >= 4), nabiti: 2 * n, dosah: 300, polomer: t >= 3 ? 34 : 26, trvani: t >= 3 ? 3.4 : 2.4,
    tik: 0.5, poskozeni: t >= 5 ? 9 : 6, zpomaleni: t >= 5 ? 0.35 : 0.55,
  }),
  // zrcadlo: polomer = jak daleko od hrdiny krouží, velikost = kam až zrcadlo sahá, odhozeni = o kolik px odhodí
  zrcadlo: (z, n) => ({
    pocet: 1 + (z >= 2) + (z >= 4), rychlost: 2.4 / n, polomer: 34, velikost: z >= 5 ? 14 : 10,
    poskozeni: z >= 5 ? 12 : 7, odhozeni: z >= 3 ? 110 : 70, odraz: z >= 5 ? 30 : 20,
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

export function staty(hra) {
  const n = hra.hrdina.nabijeni ?? 1;
  return Object.fromEntries(Object.keys(ZBRANE).map((id) => [id, statyZbrane(id, hra.zbrane[id]?.uroven ?? 0, n)]));
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
function zasadTrny(hra, st) {
  const { hrdina } = hra;
  const mista = [];
  const volno = (o) => mista.every((m) => vzdalenost(m, o) >= st.polomer);
  const kandidati = hra.nepratele
    .filter((n) => n.hp > 0 && viditelny(n) && vzdalenost(n, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina));
  for (const n of kandidati) {
    if (mista.length >= st.pocet) break;
    if (volno(n)) mista.push({ x: n.x, y: n.y });
  }
  const bedny = hra.bedny
    .filter((b) => !b.rozbita && vzdalenost(b, hrdina) < st.dosah)
    .sort((a, b) => vzdalenost(a, hrdina) - vzdalenost(b, hrdina));
  for (const b of bedny) {
    if (mista.length >= st.pocet) break;
    if (volno(b)) mista.push({ x: b.x, y: b.y });
  }
  for (const m of mista) {
    hra.trny.push({
      x: m.x, y: m.y, polomer: st.polomer, trvani: st.trvani, zivot: st.trvani, tik: 0,
      poskozeni: st.poskozeni, zpomaleni: st.zpomaleni,
    });
    rozprsk(hra, m.x, m.y, 'trny', 5);
  }
  if (hra.trny.length > MAX_TRNU) hra.trny.splice(0, hra.trny.length - MAX_TRNU);
  return mista.length;
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
      n.trny = DOZNIVANI_TRNU;
      if (tikne) zasah(hra, n, p.poskozeni);
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
      hra.odlesky.push({ x: st.x, y: st.y, zivot: TRVANI_ODLESKU });
    }
    for (const n of hra.nepratele) {
      if (n.zasahZrcadlem > 0 || n.hp <= 0 || !viditelny(n) || vzdalenost(n, p) >= n.polomer + z.velikost) continue;
      zasah(hra, n, z.poskozeni);
      n.zasahZrcadlem = 0.5;
      hra.odlesky.push({ x: (n.x + p.x) / 2, y: (n.y + p.y) / 2, zivot: TRVANI_ODLESKU });
      if (n.boss) continue;
      // Odletí od hrdiny (kdo stojí přímo na něm, tím směrem, kde je zrcadlo).
      const d = vzdalenost(n, hrdina);
      const ux = d > 0 ? (n.x - hrdina.x) / d : Math.cos(p.uhel);
      const uy = d > 0 ? (n.y - hrdina.y) / d : Math.sin(p.uhel);
      n.odhozen = TRVANI_ODHOZENI;
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
  hra.zlataky += zlata;
  hra.zlatakyZVybavy += zlata;
  hra.rozlozeno += 1;
  if (zlata > 0) pridejCislo(hra, { x: hra.hrdina.x, y: hra.hrdina.y - 18, text: `+${zlata}`, hodnota: zlata, zivot: TRVANI_CISLA_LECENI, barva: 'zlato' });
  hra.porovnani = null;
}

// Dotyk truhly: kus se vylosuje hned (animace otevření ho ukáže), svět stojí, dokud se truhla neotevře.
function otevriTruhlu(hra, p) {
  const od = Object.hasOwn(BOSSOVE, p.od) ? p.od : 'strazce';
  const kus = losujKus(od, hra.rng.dalsi(), hra.rng.dalsi(), hra.hrozba, hra.hrdina.stesti);
  hra.otevira = { x: p.x, y: p.y, od, kus, cas: 0 };
}

// Truhla je otevřená: kus výbavy (nasadí se, nebo čeká na porovnání) a k tomu karta aspoň vzácná jako dřív.
function dokonciTruhlu(hra) {
  const { od, kus } = hra.otevira;
  hra.otevira = null;
  ziskejKus(hra, kus);
  hra.volby = nabidka(hra, 'vzacna');
  hra.zTruhly = true;
  hra.truhlaOd = od;
  hra.oznameni = { text: `Výbava bosse: ${kus.nazev}`, zivot: 2 };
}

// Odhodí nepřítele od bodu (x, y) o kolik px (bosse ne, ti jsou moc těžcí).
function odhodNepritele(n, od, kolik) {
  if (n.boss) return;
  const d = vzdalenost(n, od);
  const ux = d > 0 ? (n.x - od.x) / d : 1;
  const uy = d > 0 ? (n.y - od.y) / d : 0;
  n.odhozen = TRVANI_ODHOZENI;
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
      zasah(hra, n, v.poskozeni);
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

export function aktualizuj(hra, dt, vstup, sirka, vyska) {
  if (hra.konec || hra.volby || hra.porovnani || hra.pauza) return;
  // Otevírání truhly: svět stojí, běží jen animace.
  if (hra.otevira) {
    hra.otevira.cas += dt;
    if (hra.otevira.cas >= TRVANI_OTEVRENI) dokonciTruhlu(hra);
    return;
  }
  const { hrdina } = hra;
  hra.cas += dt;

  // pohyb hrdiny (odhozený hrdina letí, kam ho rána poslala, a řídit nejde)
  let { dx, dy } = vstup;
  const delka = Math.hypot(dx, dy);
  if (hrdina.odhozen > 0) {
    const kus = Math.min(dt, hrdina.odhozen);
    hrdina.x += hrdina.odhozVx * kus;
    hrdina.y += hrdina.odhozVy * kus;
    hrdina.odhozen -= kus;
    hrdina.vx = hrdina.odhozVx;
    hrdina.vy = hrdina.odhozVy;
  } else if (delka > 0) {
    dx /= delka;
    dy /= delka;
    const rychlost = hrdina.rychlost * (hrdina.sit > 0 ? ZPOMALENI_SITI : 1);
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
  hrdina.nezranitelny = Math.max(0, hrdina.nezranitelny - dt);
  hrdina.neviditelny = Math.max(0, hrdina.neviditelny - dt);
  hrdina.doZmizeni = Math.max(0, hrdina.doZmizeni - dt);
  hrdina.sit = Math.max(0, hrdina.sit - dt);
  hra.tres = Math.max(0, hra.tres - dt);
  hra.zablesk = Math.max(0, hra.zablesk - dt);
  hra.vybuch = Math.max(0, hra.vybuch - dt);

  // nepřátelé
  hra.doSpawnu -= dt;
  if (hra.doSpawnu <= 0) {
    spawn(hra, sirka, vyska);
    hra.doSpawnu = silaHrozby(hra.cas).vlna;
  }
  // Každou minutu hrozba o stupeň výš a krátké ohlášení (vlastní řádek, nepřepíše příchod bosse).
  const hrozba = silaHrozby(hra.cas).uroven;
  if (hrozba > hra.hrozba) {
    hra.hrozba = hrozba;
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
  if (hra.cas >= hra.dalsiBoss) {
    const druh = PORADI_BOSSU[hra.bossu % PORADI_BOSSU.length];
    const { x, y } = naOkraji(hra, sirka, vyska);
    pridejNepritele(hra, druh, x, y);
    hra.bossu += 1;
    hra.dalsiBoss += BOSS_KAZDYCH;
    hra.oznameni = { text: BOSSOVE[druh].prichod, zivot: 3 };
  }
  if (hra.cas >= hra.dalsiSmecka) {
    smecka(hra, sirka, vyska);
    hra.dalsiSmecka += SMECKA_KAZDYCH;
  }
  const prichod = PRICHODY[hra.dalsiPrichod];
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
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hrdina) || 1;
    const brzda = brzdaTrnu(n) * brzdaSite(n);
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
      const rychlost = n.rychlost * brzda * (n.vyrazi > 0 ? RYCHLOST_VYRAZENI : 1);
      const cil = zmizel && !n.boss ? naposledy : hrdina;
      const k = cil === hrdina ? d : vzdalenost(n, cil);
      // U místa, kde hrdina zmizel, nepřítel zůstane stát (jinak by kolem něj poskakoval).
      if (cil === hrdina || k > rychlost * dt) {
        n.x += ((cil.x - n.x) / k) * rychlost * dt;
        n.y += ((cil.y - n.y) / k) * rychlost * dt;
      }
      if (n.vyrazi > 0) n.vyrazi -= dt;
    }
    n.zapreden = Math.max(0, (n.zapreden || 0) - dt);
    n.zasazen = Math.max(0, n.zasazen - dt);
    n.zar = Math.max(0, (n.zar || 0) - dt);
    n.zasahKrumpacem = Math.max(0, n.zasahKrumpacem - dt);
    n.zasahZrcadlem = Math.max(0, (n.zasahZrcadlem || 0) - dt);
    n.trny = Math.max(0, (n.trny || 0) - dt);
    if (d < n.polomer + 8 && hrdina.nezranitelny <= 0 && viditelny(n)) {
      if (n.sit) hrdina.sit = TRVANI_SITE;
      if (n.pan) hra.zasahyBossu.pomocnik += 1;
      zran(hra, ranaDotykem(hra, n));
    }
  }
  strelyBossu(hra, dt);
  // Jedový oblak po houbákovi pálí hrdinu, dokud v něm stojí (stejně jako dotyk, po zásahu chvíle klidu).
  for (const o of hra.oblaky) {
    const pali = TRVANI_OBLAKU - o.zivot >= NAFUKOVANI_OBLAKU;
    if (pali && hrdina.nezranitelny <= 0 && !hra.konec && vzdalenost(o, hrdina) < o.polomer) {
      zran(hra, ranaHrozby(hra, JED_OBLAKU), 'jed');
    }
  }

  const s = staty(hra);

  // Jiskra
  const jiskra = hra.zbrane.jiskra;
  if (jiskra) {
    jiskra.nabiti -= dt;
    // Na bednu míří, jen když je blíž než nejbližší nepřítel (a nanejvýš JISKRA_NA_BEDNU daleko).
    const nepritel = nejblizsi(hra);
    const bedna = nejblizsiBedna(hra, nepritel ? Math.min(JISKRA_NA_BEDNU, vzdalenost(nepritel, hrdina)) : JISKRA_NA_BEDNU);
    const cil = bedna ?? nepritel;
    if (jiskra.nabiti <= 0 && cil) {
      const zaklad = Math.atan2(cil.y - hrdina.y, cil.x - hrdina.x);
      for (let i = 0; i < s.jiskra.pocet; i++) {
        const uhel = zaklad + (i - (s.jiskra.pocet - 1) / 2) * 0.18;
        hra.strely.push({ x: hrdina.x, y: hrdina.y, vx: Math.cos(uhel) * 340, vy: Math.sin(uhel) * 340, zivot: 1.2, poskozeni: s.jiskra.poskozeni });
      }
      jiskra.nabiti = s.jiskra.nabiti;
    }
  }
  for (const st of hra.strely) {
    st.x += st.vx * dt;
    st.y += st.vy * dt;
    st.zivot -= dt;
    for (const n of hra.nepratele) {
      if (n.hp > 0 && viditelny(n) && vzdalenost(st, n) < n.polomer + 4) {
        zasah(hra, n, st.poskozeni);
        st.zivot = 0;
        break;
      }
    }
    if (st.zivot <= 0) continue;
    for (const b of hra.bedny) {
      if (!b.rozbita && vzdalenost(st, b) < POLOMER_BEDNY + 4) {
        rozbij(hra, b);
        st.zivot = 0;
        break;
      }
    }
  }
  hra.strely = hra.strely.filter((st) => st.zivot > 0);

  // Lucerna
  if (hra.zbrane.lucerna) {
    const luc = hra.zbrane.lucerna;
    luc.tik = (luc.tik ?? 0) - dt;
    if (luc.tik <= 0) {
      for (const n of hra.nepratele) {
        if (viditelny(n) && vzdalenost(n, hrdina) < s.lucerna.dosah) zasah(hra, n, s.lucerna.zar * 0.3, true);
      }
      for (const b of hra.bedny) {
        if (vzdalenost(b, hrdina) < s.lucerna.dosah) rozbij(hra, b);
      }
      luc.tik = s.lucerna.tik;
    }
  }

  // Krumpáče
  if (hra.zbrane.krumpace) {
    hra.uhelKrumpacu += s.krumpace.rychlost * dt;
    for (let i = 0; i < s.krumpace.pocet; i++) {
      const uhel = hra.uhelKrumpacu + (i / s.krumpace.pocet) * Math.PI * 2;
      const kx = hrdina.x + Math.cos(uhel) * s.krumpace.polomer;
      const ky = hrdina.y + Math.sin(uhel) * s.krumpace.polomer;
      for (const n of hra.nepratele) {
        if (n.zasahKrumpacem <= 0 && viditelny(n) && Math.hypot(n.x - kx, n.y - ky) < n.polomer + 10) {
          zasah(hra, n, s.krumpace.poskozeni);
          n.zasahKrumpacem = 0.4;
        }
      }
      for (const b of hra.bedny) {
        if (Math.hypot(b.x - kx, b.y - ky) < POLOMER_BEDNY + 10) rozbij(hra, b);
      }
    }
  }

  // Blesk: udeří do náhodného nepřítele (nebo bedny) v dosahu a přeskakuje na nejbližší dosud nezasažené.
  if (hra.zbrane.blesk) {
    const bl = hra.zbrane.blesk;
    bl.nabiti = (bl.nabiti ?? 0) - dt;
    const vDosahu = hra.nepratele.filter((n) => n.hp > 0 && viditelny(n) && vzdalenost(n, hrdina) < s.blesk.dosah);
    const bednyVDosahu = hra.bedny.filter((b) => !b.rozbita && vzdalenost(b, hrdina) < s.blesk.dosah);
    const cile = bednyVDosahu.length ? [...vDosahu, ...bednyVDosahu] : vDosahu;
    if (bl.nabiti <= 0 && cile.length) {
      let cil = hra.rng.vyber(cile);
      const zasazeni = new Set();
      const body = [{ x: hrdina.x, y: hrdina.y }];
      let preskoku = s.blesk.preskoky;
      // Bedna je první zásah: rozbije se a blesk skočí dál na nejbližšího nepřítele.
      if (bednyVDosahu.includes(cil)) {
        rozbij(hra, cil);
        body.push({ x: cil.x, y: cil.y });
        cil = dalsiCilBlesku(hra, cil, s.blesk.skok, zasazeni);
        preskoku -= 1;
      }
      for (let i = 0; i <= preskoku && cil; i++) {
        zasah(hra, cil, s.blesk.poskozeni);
        zasazeni.add(cil);
        body.push({ x: cil.x, y: cil.y });
        cil = dalsiCilBlesku(hra, cil, s.blesk.skok, zasazeni);
      }
      hra.blesky.push({ body, zivot: 0.18 });
      bl.nabiti = s.blesk.nabiti;
    }
  }
  for (const b of hra.blesky) b.zivot -= dt;
  hra.blesky = hra.blesky.filter((b) => b.zivot > 0);

  // Trnová past: když je nabitá a má pod co trny zasadit, zasadí je. Bez cíle čeká nabitá.
  const trn = hra.zbrane.trny;
  if (trn) {
    trn.nabiti = (trn.nabiti ?? 0) - dt;
    if (trn.nabiti <= 0 && zasadTrny(hra, s.trny)) trn.nabiti = s.trny.nabiti;
  }
  rostouTrny(hra, dt, s);

  // Zrcadlový štít
  if (hra.zbrane.zrcadlo) {
    hra.uhelZrcadel += s.zrcadlo.rychlost * dt;
    zrcadla(hra, s);
  }
  for (const o of hra.odlesky) o.zivot -= dt;
  hra.odlesky = hra.odlesky.filter((o) => o.zivot > 0);
  // Rázová vlna z výbavy Strážce
  razoveVlny(hra, dt);
  hra.bedny = hra.bedny.filter((b) => !b.rozbita);

  pohrbi(hra);

  // srdce, magnet, zlaťák a bomba se seberou dotykem, truhla bosse se začne otevírat (jen jedna naráz,
  // další se otevře hned po ní)
  let bouchlo = false;
  for (const p of hra.predmety) {
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
        hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + LECENI_SRDCE);
        cisloLeceni(hra, hrdina.hp - pred);
      } else if (p.druh === 'zlatak') {
        hra.zlataky += 1;
        pridejCislo(hra, { x: hrdina.x, y: hrdina.y - 18, text: '+1', hodnota: 1, zivot: TRVANI_CISLA_LECENI, barva: 'zlato' });
      } else if (p.druh === 'bomba') {
        vybuch(hra, sirka, vyska);
        bouchlo = true;
      } else {
        for (const kr of hra.krystaly) kr.pritahovan = true;
      }
    }
  }
  hra.predmety = hra.predmety.filter((p) => !p.sebran);
  // Kdo padl bombou, umře hned v tomhle snímku (jinak by ještě stihl hrdinu kousnout).
  if (bouchlo) pohrbi(hra);

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

// Smrt nepřátel → krystaly, oblaky po houbácích, truhla po bossovi a občas srdce nebo magnet.
function pohrbi(hra) {
  const { hrdina } = hra;
  for (const n of hra.nepratele) {
    if (n.hp <= 0) {
      hra.zabito += 1;
      rozlet(hra, n);
      hra.krystaly.push({ x: n.x, y: n.y, xp: n.xp });
      if (n.jed) {
        hra.oblaky.push({ x: n.x, y: n.y, zivot: TRVANI_OBLAKU, polomer: POLOMER_OBLAKU });
        if (hra.oblaky.length > MAX_OBLAKU) hra.oblaky.splice(0, hra.oblaky.length - MAX_OBLAKU);
      }
      if (n.boss) {
        hra.zabitoBossu += 1;
        hra.predmety.push({ druh: 'truhla', x: n.x, y: n.y, od: n.druh });
        continue;
      }
      // Štěstí z trvalých vylepšení zvětší obě šance, los z rng je pořád jeden (náhoda vln se neposune).
      const los = hra.rng.dalsi();
      const stesti = hrdina.stesti;
      if (los < SANCE_MAGNET * stesti) hra.predmety.push({ druh: 'magnet', x: n.x, y: n.y });
      else if (los < (SANCE_MAGNET + SANCE_SRDCE) * stesti) hra.predmety.push({ druh: 'srdce', x: n.x, y: n.y });
    }
  }
  hra.nepratele = hra.nepratele.filter((n) => n.hp > 0);
}

// Šance na každou raritu (součet 1). minimum: horší rarity než tahle nepadnou (truhla bosse).
export function sanceRarit(hra, minimum = 'bezna') {
  const cas = Math.min(Math.max(0, hra.cas), CAS_PLNYCH_RARIT);
  const nasobek = (1 + cas / CAS_PLNYCH_RARIT) * Math.max(1, hra.hrdina.stesti ?? 1);
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

// Kolik dá pasiva celkem na úrovni u: násobek vlastnosti (u Srdce přičtené životy). Úrovně 1–5 se násobí
// jako dřív, další jen přičtou dal k násobku z 5. úrovně, nanejvýš po strop.
export function hodnotaPasivy(id, uroven) {
  const p = PASIVY[id];
  const u = Math.max(0, Math.floor(uroven));
  const pod = Math.min(u, ZAKLAD_UROVNI);
  const nad = u - pod;
  if (p.pricti) return p.pricti * pod + p.dal * nad;
  return Math.min((1 + p.nasobek) ** pod * (1 + p.dal * nad), STROPY.pasivy[id] ?? Infinity);
}

// Na úrovni u (z u - 1) už pasiva nic nepřidá a mění se v poškození.
function pasivaNaStropu(id, u) {
  return u > ZAKLAD_UROVNI && hodnotaPasivy(id, u) <= hodnotaPasivy(id, u - 1);
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
  return vysledek.map(({ radek, kolik }) => (kolik > 1 ? `${kolik}× ${radek}` : radek));
}

// Řádky karty pro úrovně od + 1 až do. Do 5. úrovně řádky z popisu zbraně, nad ní součet poškození a co
// přidala třetí úroveň (víc kusů, nabíjení, velikost). Pasiva má řádek za každou úroveň.
export function popisUrovni(druh, id, od, uroven) {
  if (druh === 'pasiva') {
    const p = PASIVY[id];
    const radky = [];
    for (let u = od + 1; u <= uroven; u++) {
      if (u <= ZAKLAD_UROVNI) radky.push(p.popis);
      else if (pasivaNaStropu(id, u)) radky.push(`+${procent(SILA_ZA_PREBYTEK)} % poškození všech zbraní`);
      else radky.push(p.popisDal);
    }
    return slij(radky);
  }
  const vzor = ZBRANE[id];
  const radky = vzor.popis.slice(od, Math.min(uroven, ZAKLAD_UROVNI));
  if (uroven > ZAKLAD_UROVNI) {
    const pred = bonusZaUroven(id, Math.max(od, ZAKLAD_UROVNI));
    const po = bonusZaUroven(id, uroven);
    radky.push(`+${procent(po.poskozeni - pred.poskozeni)} % poškození`);
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
  if (r.sila > 0) radky.push(`+${procent(r.sila)} % poškození všech zbraní`);
  if (r.doleceni) radky.push('Doléčí všechny životy');
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
    druh: 'leceni', id: 'leceni', nazev: 'Odpočinek', ikona: 'odpocinek', rarita, od: 0, uroven: 0, kroku,
    popis: [r.doleceni ? 'Doléčí všechny životy' : `Doléčí ${LECENI_ODPOCINKU * kroku} životů`],
    bonus: { sila: 0, doleceni: r.doleceni }, bonusy: [],
  };
}

// Tři různé karty ze všech zbraní a pasiv (úrovně nemají strop, takže nabídka nikdy nedojde).
export function nabidka(hra, minimum = 'bezna') {
  const moznosti = [
    ...Object.keys(ZBRANE).map((id) => ['zbran', id]),
    ...Object.keys(PASIVY).map((id) => ['pasiva', id]),
  ];
  const vybrane = [];
  while (vybrane.length < 3 && moznosti.length) {
    const [druh, id] = moznosti.splice(Math.floor(hra.rng.dalsi() * moznosti.length), 1)[0];
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

// Použije kartu: zbraň nebo pasiva vyskočí o kroku úrovní, pak bonus rarity.
export function vyber(hra, volba) {
  const { hrdina } = hra;
  const predLecenim = hrdina.hp;
  const cil = Math.max(0, Math.floor(volba.uroven ?? 0));
  if (volba.druh === 'zbran') {
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
  hra.volby = null;
  hra.zTruhly = false;
  hra.truhlaKus = null;
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
