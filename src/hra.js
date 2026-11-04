// Pravidla hry: pohyb, zbraně, nepřátelé, krystaly zkušeností a vylepšení.

export const ZBRANE = {
  jiskra: {
    nazev: 'Jiskra',
    popis: ['Střílí jiskry na nejbližšího nepřítele.', '+1 jiskra', 'Rychlejší střelba', '+1 jiskra', 'Větší poškození'],
  },
  lucerna: {
    nazev: 'Lucerna',
    popis: ['Žár lucerny pálí nepřátele kolem tebe.', 'Větší dosah', 'Silnější žár', 'Větší dosah', 'Silnější žár'],
  },
  krumpace: {
    nazev: 'Krumpáče',
    popis: ['Krumpáč krouží kolem tebe.', '+1 krumpáč', 'Rychlejší otáčení', '+1 krumpáč', 'Větší poškození'],
  },
};

export const PASIVY = {
  srdce: { nazev: 'Srdce', popis: '+20 max. životů a doléčení' },
  boty: { nazev: 'Boty', popis: '+12 % rychlost pohybu' },
  magnet: { nazev: 'Magnet', popis: '+40 % dosah sběru krystalů' },
  sila: { nazev: 'Síla', popis: '+15 % poškození všech zbraní' },
};

const MAX_UROVEN = 5;
const MAX_NEPRATEL = 350;
const MAX_KRYSTALU = 300;
const SANCE_SRDCE = 0.012;
const SANCE_MAGNET = 0.003;
const LECENI_SRDCE = 25;

const NEPRATELE = {
  netopyr: { hp: 10, rychlost: 72, poskozeni: 5, xp: 1, polomer: 10 },
  slizak: { hp: 32, rychlost: 42, poskozeni: 10, xp: 2, polomer: 12 },
  kostlivec: { hp: 60, rychlost: 58, poskozeni: 14, xp: 3, polomer: 11 },
};

export function novaHra(rng) {
  return {
    rng,
    cas: 0,
    zabito: 0,
    konec: false,
    volby: null,
    hrdina: {
      x: 0, y: 0, hp: 100, maxHp: 100, rychlost: 110, magnet: 64,
      sila: 1, uroven: 1, xp: 0, potreba: potrebaNaUroven(1), nezranitelny: 0, otoceny: 1,
    },
    zbrane: { jiskra: { uroven: 1, nabiti: 0 } },
    pasivy: {},
    nepratele: [],
    strely: [],
    krystaly: [],
    predmety: [],
    cisla: [],
    uhelKrumpacu: 0,
    doSpawnu: 0,
  };
}

// Prvních pár úrovní přijde rychle, ať má hráč brzy víc zbraní; pak křivka zvolna roste.
export function potrebaNaUroven(uroven) {
  return Math.round(3 + uroven * 1.5 + (uroven * uroven) / 12);
}

function vzdalenost(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function zasah(hra, n, kolik) {
  const poskozeni = Math.round(kolik * hra.hrdina.sila);
  n.hp -= poskozeni;
  n.zasazen = 0.1;
  hra.cisla.push({ x: n.x, y: n.y - 10, text: String(poskozeni), zivot: 0.6 });
}

function polomerSpawnu(sirka, vyska) {
  return Math.hypot(sirka, vyska) / 2 + 40;
}

function naOkraji(hra, sirka, vyska) {
  const uhel = hra.rng.dalsi() * Math.PI * 2;
  const r = polomerSpawnu(sirka, vyska);
  return { x: hra.hrdina.x + Math.cos(uhel) * r, y: hra.hrdina.y + Math.sin(uhel) * r };
}

function spawn(hra, sirka, vyska) {
  const { rng, cas } = hra;
  if (hra.nepratele.length >= MAX_NEPRATEL) return;
  const druhy = ['netopyr'];
  if (cas > 60) druhy.push('slizak');
  if (cas > 150) druhy.push('kostlivec');
  const davka = 1 + Math.floor(cas / 60);
  for (let i = 0; i < davka; i++) {
    const druh = rng.vyber(druhy);
    const vzor = NEPRATELE[druh];
    const hp = Math.round(vzor.hp * (1 + cas / 150));
    hra.nepratele.push({ druh, ...vzor, hp, maxHp: hp, zasazen: 0, zasahKrumpacem: 0, ...naOkraji(hra, sirka, vyska) });
  }
}

function nejblizsi(hra) {
  let nej = null;
  let nejD = Infinity;
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hra.hrdina);
    if (d < nejD) { nej = n; nejD = d; }
  }
  return nej;
}

export function staty(hra) {
  const u = (id) => hra.zbrane[id]?.uroven ?? 0;
  const j = u('jiskra');
  const l = u('lucerna');
  const k = u('krumpace');
  return {
    jiskra: { pocet: 1 + (j >= 2) + (j >= 4), nabiti: j >= 3 ? 0.5 : 0.7, poskozeni: j >= 5 ? 16 : 11 },
    lucerna: { dosah: 56 + 22 * ((l >= 2) + (l >= 4)), zar: 14 + 9 * ((l >= 3) + (l >= 5)) },
    krumpace: { pocet: 1 + (k >= 2) + (k >= 4), rychlost: k >= 3 ? 4.5 : 3, poskozeni: k >= 5 ? 18 : 12, polomer: 64 },
  };
}

export function aktualizuj(hra, dt, vstup, sirka, vyska) {
  if (hra.konec || hra.volby || hra.pauza) return;
  const { hrdina } = hra;
  hra.cas += dt;

  // pohyb hrdiny
  let { dx, dy } = vstup;
  const delka = Math.hypot(dx, dy);
  if (delka > 0) {
    dx /= delka;
    dy /= delka;
    hrdina.x += dx * hrdina.rychlost * dt;
    hrdina.y += dy * hrdina.rychlost * dt;
    if (dx !== 0) hrdina.otoceny = Math.sign(dx);
  }
  hrdina.nezranitelny = Math.max(0, hrdina.nezranitelny - dt);

  // nepřátelé
  hra.doSpawnu -= dt;
  if (hra.doSpawnu <= 0) {
    spawn(hra, sirka, vyska);
    hra.doSpawnu = Math.max(0.25, 1.2 - hra.cas / 180);
  }
  // Kdo zůstal daleko za hrdinou, vrátí se na okraj obrazovky, aby se nepřátelé nehromadili mimo dohled.
  const daleko = polomerSpawnu(sirka, vyska) * 1.5;
  for (const n of hra.nepratele) {
    if (vzdalenost(n, hrdina) > daleko) Object.assign(n, naOkraji(hra, sirka, vyska));
  }
  for (const n of hra.nepratele) {
    const d = vzdalenost(n, hrdina) || 1;
    n.x += ((hrdina.x - n.x) / d) * n.rychlost * dt;
    n.y += ((hrdina.y - n.y) / d) * n.rychlost * dt;
    n.zasazen = Math.max(0, n.zasazen - dt);
    n.zasahKrumpacem = Math.max(0, n.zasahKrumpacem - dt);
    if (d < n.polomer + 8 && hrdina.nezranitelny <= 0) {
      hrdina.hp -= n.poskozeni;
      hrdina.nezranitelny = 0.5;
      if (hrdina.hp <= 0) hra.konec = true;
    }
  }

  const s = staty(hra);

  // Jiskra
  const jiskra = hra.zbrane.jiskra;
  if (jiskra) {
    jiskra.nabiti -= dt;
    const cil = nejblizsi(hra);
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
      if (n.hp > 0 && vzdalenost(st, n) < n.polomer + 4) {
        zasah(hra, n, st.poskozeni);
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
        if (vzdalenost(n, hrdina) < s.lucerna.dosah) zasah(hra, n, s.lucerna.zar * 0.3);
      }
      luc.tik = 0.3;
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
        if (n.zasahKrumpacem <= 0 && Math.hypot(n.x - kx, n.y - ky) < n.polomer + 10) {
          zasah(hra, n, s.krumpace.poskozeni);
          n.zasahKrumpacem = 0.4;
        }
      }
    }
  }

  // smrt nepřátel → krystaly
  for (const n of hra.nepratele) {
    if (n.hp <= 0) {
      hra.zabito += 1;
      hra.krystaly.push({ x: n.x, y: n.y, xp: n.xp });
      const los = hra.rng.dalsi();
      if (los < SANCE_MAGNET) hra.predmety.push({ druh: 'magnet', x: n.x, y: n.y });
      else if (los < SANCE_MAGNET + SANCE_SRDCE) hra.predmety.push({ druh: 'srdce', x: n.x, y: n.y });
    }
  }
  hra.nepratele = hra.nepratele.filter((n) => n.hp > 0);

  // srdce a magnet se seberou dotykem
  for (const p of hra.predmety) {
    if (vzdalenost(p, hrdina) < 16) {
      p.sebran = true;
      if (p.druh === 'srdce') {
        const pred = hrdina.hp;
        hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + LECENI_SRDCE);
        hra.cisla.push({ x: hrdina.x, y: hrdina.y - 18, text: `+${Math.round(hrdina.hp - pred)}`, zivot: 0.8, barva: 'leceni' });
      } else {
        for (const kr of hra.krystaly) kr.pritahovan = true;
      }
    }
  }
  hra.predmety = hra.predmety.filter((p) => !p.sebran);

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
      hrdina.xp += kr.xp;
    }
  }
  hra.krystaly = hra.krystaly.filter((kr) => !kr.sebran);
  // Moc krystalů na zemi: dva nejstarší se slijí do jednoho, zkušenosti se neztratí.
  while (hra.krystaly.length > MAX_KRYSTALU) {
    const [a, b] = hra.krystaly.splice(0, 2);
    hra.krystaly.push({ x: b.x, y: b.y, xp: a.xp + b.xp });
  }
  if (hrdina.xp >= hrdina.potreba) {
    hrdina.xp -= hrdina.potreba;
    hrdina.uroven += 1;
    hrdina.potreba = potrebaNaUroven(hrdina.uroven);
    hra.volby = nabidka(hra);
  }

  for (const c of hra.cisla) {
    c.y -= 30 * dt;
    c.zivot -= dt;
  }
  hra.cisla = hra.cisla.filter((c) => c.zivot > 0);
}

function nabidka(hra) {
  const moznosti = [];
  for (const [id, z] of Object.entries(ZBRANE)) {
    const uroven = hra.zbrane[id]?.uroven ?? 0;
    if (uroven < MAX_UROVEN) {
      moznosti.push({ druh: 'zbran', id, nazev: z.nazev, popis: z.popis[uroven], uroven: uroven + 1 });
    }
  }
  for (const [id, p] of Object.entries(PASIVY)) {
    const uroven = hra.pasivy[id] ?? 0;
    if (uroven < MAX_UROVEN) {
      moznosti.push({ druh: 'pasiva', id, nazev: p.nazev, popis: p.popis, uroven: uroven + 1 });
    }
  }
  const vybrane = [];
  while (vybrane.length < 3 && moznosti.length) {
    vybrane.push(moznosti.splice(Math.floor(hra.rng.dalsi() * moznosti.length), 1)[0]);
  }
  if (!vybrane.length) vybrane.push({ druh: 'leceni', id: 'leceni', nazev: 'Odpočinek', popis: 'Doléčí 30 životů', uroven: 0 });
  return vybrane;
}

export function vyber(hra, volba) {
  const { hrdina } = hra;
  if (volba.druh === 'zbran') {
    hra.zbrane[volba.id] = { ...(hra.zbrane[volba.id] ?? { nabiti: 0 }), uroven: volba.uroven };
  } else if (volba.druh === 'pasiva') {
    hra.pasivy[volba.id] = volba.uroven;
    if (volba.id === 'srdce') { hrdina.maxHp += 20; hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + 20); }
    if (volba.id === 'boty') hrdina.rychlost *= 1.12;
    if (volba.id === 'magnet') hrdina.magnet *= 1.4;
    if (volba.id === 'sila') hrdina.sila *= 1.15;
  } else {
    hrdina.hp = Math.min(hrdina.maxHp, hrdina.hp + 30);
  }
  hra.volby = null;
}
