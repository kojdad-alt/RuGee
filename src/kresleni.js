import { sprity } from './sprity.js';
import { staty } from './hra.js';
import { dlazdiceLouky, ozdobyLouky } from './louka.js';

const MERITKO = 3;
const DLAZDICE = 48;

function hash(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function podlaha(ctx, kx, ky, sirka, vyska) {
  const x0 = Math.floor(kx / DLAZDICE) - 1;
  const y0 = Math.floor(ky / DLAZDICE) - 1;
  for (let ty = y0; ty < y0 + vyska / DLAZDICE + 3; ty++) {
    for (let tx = x0; tx < x0 + sirka / DLAZDICE + 3; tx++) {
      const px = Math.round(tx * DLAZDICE - kx);
      const py = Math.round(ty * DLAZDICE - ky);
      const h = hash(tx, ty);
      // Obyčejná tráva je nejčastější, květiny, kameny a hlína jen občas.
      const druh = h % 100 < 82 ? h % 6 : 6 + (h >>> 8) % (dlazdiceLouky.length - 6);
      ctx.drawImage(dlazdiceLouky[druh], px, py, DLAZDICE, DLAZDICE);
      if ((h >>> 16) % 100 < 3) {
        const ozd = ozdobyLouky[(h >>> 20) % ozdobyLouky.length];
        ctx.drawImage(ozd, px, py, DLAZDICE, DLAZDICE);
      }
    }
  }
}

function sprite(ctx, obr, x, y, otoceny = 1, bila = false, velikost = obr.width * MERITKO) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (otoceny < 0) ctx.scale(-1, 1);
  ctx.drawImage(obr, -velikost / 2, -velikost / 2, velikost, velikost);
  if (bila) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(-velikost / 2, -velikost / 2, velikost, velikost);
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
    ctx.drawImage(sprity.krystal, Math.round(p.x - 10), Math.round(p.y - 10), 20, 20);
  }

  for (const pr of hra.predmety) {
    const p = naObrazovce(pr);
    const houpani = Math.sin(hra.cas * 4 + pr.x) * 2;
    ctx.drawImage(sprity[pr.druh], Math.round(p.x - 13), Math.round(p.y - 13 + houpani), 26, 26);
  }

  for (const n of hra.nepratele) {
    const p = naObrazovce(n);
    if (p.x < -40 || p.y < -40 || p.x > sirka + 40 || p.y > vyska + 40) continue;
    const obr = sprity[n.druh];
    const velikost = obr.width * MERITKO * (n.boss ? 2 : 1);
    sprite(ctx, obr, p.x, p.y, n.x > hrdina.x ? -1 : 1, n.zasazen > 0, velikost);
    if (n.boss) {
      ctx.fillStyle = '#2a0f14';
      ctx.fillRect(Math.round(p.x - 24), Math.round(p.y - 34), 48, 5);
      ctx.fillStyle = '#e9c46a';
      ctx.fillRect(Math.round(p.x - 24), Math.round(p.y - 34), Math.round(48 * Math.max(0, n.hp) / n.maxHp), 5);
    }
  }

  ctx.fillStyle = '#ffd27a';
  for (const st of hra.strely) {
    const p = naObrazovce(st);
    ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 3), 6, 6);
  }

  // blesky: lomená čára mezi zasaženými, náhodné zuby se mění každý snímek
  for (const bl of hra.blesky) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, bl.zivot / 0.18);
    for (const [barva, sirkaCary] of [['rgba(143,211,255,0.5)', 6], ['#e8f7ff', 2]]) {
      ctx.strokeStyle = barva;
      ctx.lineWidth = sirkaCary;
      ctx.beginPath();
      bl.body.forEach((bod, i) => {
        const p = naObrazovce(bod);
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
          return;
        }
        const pred = naObrazovce(bl.body[i - 1]);
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          ctx.lineTo(pred.x + (p.x - pred.x) * t + (Math.random() - 0.5) * 14, pred.y + (p.y - pred.y) * t + (Math.random() - 0.5) * 14);
        }
        ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  if (hra.zbrane.krumpace) {
    for (let i = 0; i < s.krumpace.pocet; i++) {
      const uhel = hra.uhelKrumpacu + (i / s.krumpace.pocet) * Math.PI * 2;
      ctx.save();
      ctx.translate(stred.x + Math.cos(uhel) * s.krumpace.polomer, stred.y + Math.sin(uhel) * s.krumpace.polomer);
      ctx.rotate(uhel * 2);
      const v = sprity.krumpac.width * MERITKO;
      ctx.drawImage(sprity.krumpac, -v / 2, -v / 2, v, v);
      ctx.restore();
    }
  }

  const blika = hrdina.nezranitelny > 0 && Math.floor(hrdina.nezranitelny * 20) % 2 === 0;
  if (!blika) sprite(ctx, sprity.hrdina, stred.x, stred.y, hrdina.otoceny);

  // životy pod hrdinou
  ctx.fillStyle = '#2a0f14';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 18), 28, 4);
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(Math.round(stred.x - 14), Math.round(stred.y + 18), Math.round(28 * Math.max(0, hrdina.hp) / hrdina.maxHp), 4);

  ctx.font = 'bold 12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  for (const c of hra.cisla) {
    const p = naObrazovce(c);
    const pruhlednost = Math.min(1, c.zivot * 2);
    ctx.fillStyle = c.barva === 'leceni' ? `rgba(120,230,140,${pruhlednost})` : `rgba(255,240,200,${pruhlednost})`;
    ctx.fillText(c.text, p.x, p.y);
  }

  // šipka k bossovi, když je mimo obrazovku
  for (const n of hra.nepratele) {
    if (!n.boss) continue;
    const p = naObrazovce(n);
    if (p.x > 0 && p.y > 0 && p.x < sirka && p.y < vyska) continue;
    const uhel = Math.atan2(p.y - vyska / 2, p.x - sirka / 2);
    const r = Math.min(sirka, vyska) / 2 - 40;
    ctx.save();
    ctx.translate(sirka / 2 + Math.cos(uhel) * r, vyska / 2 + Math.sin(uhel) * r);
    ctx.rotate(uhel);
    ctx.fillStyle = '#e9c46a';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ztmavení u okrajů, ať je hrdina uprostřed vidět nejlíp
  const tma = ctx.createRadialGradient(sirka / 2, vyska / 2, Math.min(sirka, vyska) * 0.4, sirka / 2, vyska / 2, Math.max(sirka, vyska) * 0.8);
  tma.addColorStop(0, 'rgba(0,0,0,0)');
  tma.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = tma;
  ctx.fillRect(0, 0, sirka, vyska);

  if (hra.oznameni) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, hra.oznameni.zivot);
    ctx.font = 'bold 22px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(hra.oznameni.text, sirka / 2 + 2, 92);
    ctx.fillStyle = '#e9c46a';
    ctx.fillText(hra.oznameni.text, sirka / 2, 90);
    ctx.restore();
  }
}
