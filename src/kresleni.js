import { sprity } from './sprity.js';
import { staty } from './hra.js';

const VELIKOST = 24;
const DLAZDICE = 48;

function hash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function podlaha(ctx, kx, ky, sirka, vyska) {
  ctx.fillStyle = '#14121a';
  ctx.fillRect(0, 0, sirka, vyska);
  const x0 = Math.floor(kx / DLAZDICE) - 1;
  const y0 = Math.floor(ky / DLAZDICE) - 1;
  for (let ty = y0; ty < y0 + vyska / DLAZDICE + 3; ty++) {
    for (let tx = x0; tx < x0 + sirka / DLAZDICE + 3; tx++) {
      const px = Math.round(tx * DLAZDICE - kx);
      const py = Math.round(ty * DLAZDICE - ky);
      const h = hash(tx, ty);
      ctx.fillStyle = h % 5 === 0 ? '#1a1721' : '#16141c';
      ctx.fillRect(px + 1, py + 1, DLAZDICE - 2, DLAZDICE - 2);
      ctx.fillStyle = '#211d29';
      ctx.fillRect(px + 6 + (h % 30), py + 8 + ((h >>> 5) % 28), 3, 3);
      if (h % 4 === 0) ctx.fillRect(px + 10 + ((h >>> 9) % 26), py + 6 + ((h >>> 13) % 30), 3, 3);
    }
  }
}

function sprite(ctx, obr, x, y, otoceny = 1, bila = false) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (otoceny < 0) ctx.scale(-1, 1);
  ctx.drawImage(obr, -VELIKOST / 2, -VELIKOST / 2, VELIKOST, VELIKOST);
  if (bila) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(-VELIKOST / 2, -VELIKOST / 2, VELIKOST, VELIKOST);
  }
  ctx.restore();
}

export function kresli(ctx, hra) {
  const { width: sirka, height: vyska } = ctx.canvas;
  const { hrdina } = hra;
  const kx = hrdina.x - sirka / 2;
  const ky = hrdina.y - vyska / 2;
  const naObrazovce = (o) => ({ x: o.x - kx, y: o.y - ky });
  const s = staty(hra);

  ctx.imageSmoothingEnabled = false;
  podlaha(ctx, kx, ky, sirka, vyska);

  const stred = naObrazovce(hrdina);
  if (hra.zbrane.lucerna) {
    const zar = ctx.createRadialGradient(stred.x, stred.y, 8, stred.x, stred.y, s.lucerna.dosah);
    zar.addColorStop(0, 'rgba(255,179,71,0.28)');
    zar.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = zar;
    ctx.beginPath();
    ctx.arc(stred.x, stred.y, s.lucerna.dosah, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const kr of hra.krystaly) {
    const p = naObrazovce(kr);
    ctx.drawImage(sprity.krystal, Math.round(p.x - 8), Math.round(p.y - 8), 16, 16);
  }

  for (const n of hra.nepratele) {
    const p = naObrazovce(n);
    if (p.x < -40 || p.y < -40 || p.x > sirka + 40 || p.y > vyska + 40) continue;
    sprite(ctx, sprity[n.druh], p.x, p.y, n.x > hrdina.x ? -1 : 1, n.zasazen > 0);
  }

  ctx.fillStyle = '#ffd27a';
  for (const st of hra.strely) {
    const p = naObrazovce(st);
    ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 3), 6, 6);
  }

  if (hra.zbrane.krumpace) {
    for (let i = 0; i < s.krumpace.pocet; i++) {
      const uhel = hra.uhelKrumpacu + (i / s.krumpace.pocet) * Math.PI * 2;
      ctx.save();
      ctx.translate(stred.x + Math.cos(uhel) * s.krumpace.polomer, stred.y + Math.sin(uhel) * s.krumpace.polomer);
      ctx.rotate(uhel * 2);
      ctx.drawImage(sprity.krumpac, -VELIKOST / 2, -VELIKOST / 2, VELIKOST, VELIKOST);
      ctx.restore();
    }
  }

  const blika = hrdina.nezranitelny > 0 && Math.floor(hrdina.nezranitelny * 20) % 2 === 0;
  if (!blika) sprite(ctx, sprity.hrdina, stred.x, stred.y, hrdina.otoceny);

  // životy pod hrdinou
  ctx.fillStyle = '#2a0f14';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 16), 28, 4);
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 16), Math.round(28 * Math.max(0, hrdina.hp) / hrdina.maxHp), 4);

  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  for (const c of hra.cisla) {
    const p = naObrazovce(c);
    ctx.fillStyle = `rgba(255,240,200,${Math.min(1, c.zivot * 2)})`;
    ctx.fillText(c.text, p.x, p.y);
  }

  // tma okolo, jako v jeskyni
  const tma = ctx.createRadialGradient(sirka / 2, vyska / 2, Math.min(sirka, vyska) * 0.3, sirka / 2, vyska / 2, Math.max(sirka, vyska) * 0.75);
  tma.addColorStop(0, 'rgba(0,0,0,0)');
  tma.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = tma;
  ctx.fillRect(0, 0, sirka, vyska);
}
