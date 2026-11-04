#!/usr/bin/env python3
"""Analýza balancu RuGee.

Pustí simulaci hry (tests/simulace.mjs --json) za každou postavu na každé mapě s několika semínky
naráz, posbírá výsledky a vygeneruje grafy docs/balanc/*.svg, data docs/balanc/souhrn.json
a stručné čtení docs/BALANC.md. Hraje stejný bot jako test. Jen standardní knihovna Pythonu 3.9+.

  python3 nastroje/balanc.py                          # 6 semínek, 15 min, všechny postavy a mapy
  python3 nastroje/balanc.py --seminek 3 --sekund 600 --procesu 4
  python3 nastroje/balanc.py --tridy lovec,havir --mapy louka,sopka --vystup /tmp/balanc
  python3 nastroje/balanc.py --vylepseni max          # bot se všemi trvalými vylepšeními na maximu
  python3 nastroje/balanc.py --z-dat docs/balanc/souhrn.json   # jen překreslí grafy a BALANC.md

Když už souhrn.json ve výstupu je a parametry sedí, vypíše, jak se přežití změnilo proti minulému běhu.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shlex
import statistics
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from xml.sax.saxutils import escape

KOREN = Path(__file__).resolve().parent.parent
SIMULACE = KOREN / "tests" / "simulace.mjs"
NBSP = chr(160)
VERZE_SOUHRNU = 1


# ---------------------------------------------------------------------------------------------
# Simulace


def simulace(node, seminko, sekund, *volby):
    """Jedna hra (nebo --seznam): vrátí JSON z posledního řádku výstupu simulace."""
    prikaz = [node, str(SIMULACE), str(seminko), str(sekund), "--json", *volby]
    beh = subprocess.run(prikaz, cwd=KOREN, capture_output=True, text=True, encoding="utf-8",
                         timeout=max(600, sekund * 2))
    if beh.returncode != 0:
        raise RuntimeError(f"simulace {' '.join(prikaz[2:])} skončila {beh.returncode}: {beh.stderr.strip()}")
    return json.loads(beh.stdout.strip().splitlines()[-1])


def otisk_kodu():
    """Otisk kódu, který data měří (src/*.js a bot v tests/simulace.mjs)."""
    h = hashlib.sha1()
    for soubor in sorted((KOREN / "src").glob("*.js")) + [SIMULACE]:
        h.update(soubor.name.encode())
        h.update(soubor.read_bytes())
    return h.hexdigest()[:8]


def odehraj(arg, katalog):
    tridy = vyber_ids(arg.tridy, katalog["tridy"], "třída")
    mapy = vyber_ids(arg.mapy, katalog["mapy"], "mapa")
    seminka = list(range(arg.od, arg.od + arg.seminek))
    ulohy = [(t, m, s) for t in tridy for m in mapy for s in seminka]
    volby_vylepseni = ["--vylepseni", "max"] if arg.vylepseni == "max" else []
    print(f"balanc: {len(ulohy)} her ({len(tridy)} postav × {len(mapy)} map × {len(seminka)} semínek), "
          f"{arg.sekund} s, {arg.procesu} naráz", file=sys.stderr)
    hry = []
    zacatek = time.time()
    hlaseno = 0
    with ThreadPoolExecutor(max_workers=arg.procesu) as bazen:
        budouci = [bazen.submit(simulace, arg.node, s, arg.sekund, "--trida", t, "--mapa", m, *volby_vylepseni)
                   for t, m, s in ulohy]
        for hotovo in as_completed(budouci):
            hry.append(hotovo.result())
            procent = len(hry) * 100 // len(ulohy)
            if procent >= hlaseno + 10 or len(hry) == len(ulohy):
                hlaseno = procent - procent % 10
                print(f"  {len(hry)}/{len(ulohy)} her, {time.time() - zacatek:.0f} s", file=sys.stderr)
    hry.sort(key=lambda h: (tridy.index(h["trida"]), mapy.index(h["mapa"]), h["seminko"]))
    parametry = {
        "sekund": arg.sekund, "seminka": seminka, "vylepseni": arg.vylepseni, "tridy": tridy, "mapy": mapy,
        "otisk_kodu": otisk_kodu(), "prikaz": prikaz_pro_md(arg),
    }
    return souhrn_her(hry, katalog, parametry)


def vyber_ids(text, katalog, co):
    if not text:
        return list(katalog)
    ids = [x.strip() for x in text.split(",") if x.strip()]
    nezname = [x for x in ids if x not in katalog]
    if nezname:
        sys.exit(f"balanc: neznámá {co} {', '.join(nezname)} (známé: {', '.join(katalog)})")
    return ids


def prikaz_pro_md(arg):
    casti = ["python3", "nastroje/balanc.py", "--seminek", str(arg.seminek), "--sekund", str(arg.sekund)]
    if arg.od != 1:
        casti += ["--od", str(arg.od)]
    if arg.tridy:
        casti += ["--tridy", arg.tridy]
    if arg.mapy:
        casti += ["--mapy", arg.mapy]
    if arg.vylepseni != "zadna":
        casti += ["--vylepseni", arg.vylepseni]
    return " ".join(shlex.quote(c) for c in casti)


# ---------------------------------------------------------------------------------------------
# Souhrn


def median(hodnoty):
    hodnoty = [h for h in hodnoty if h is not None]
    return statistics.median(hodnoty) if hodnoty else None


def prumer(hodnoty):
    hodnoty = [h for h in hodnoty if h is not None]
    return sum(hodnoty) / len(hodnoty) if hodnoty else None


def zaokr(x, mist=1):
    return None if x is None else round(x, mist)


def doba(hra, limit):
    """Doba přežití pro statistiku: kdo došel do limitu, má celý limit (pauzy u truhel se nepočítají)."""
    return float(limit) if hra["prezil"] else hra["preziti_s"]


def prubeh(hry, limit, klic, za_minutu):
    """Průměr hodnoty v každé minutě přes hry, které v ní ještě běžely aspoň 10 s.

    za_minutu: hodnota se přepočte na celou minutu (poslední minuta hry bývá kratší)."""
    vysledek = []
    for m in range(math.ceil(limit / 60)):
        hodnoty = []
        for h in hry:
            odehrano = min(60.0, h["preziti_s"] - 60 * m)
            if odehrano < 10 or m >= len(h["minuty"]):
                continue
            v = h["minuty"][m][klic]
            hodnoty.append(v * 60 / odehrano if za_minutu else v)
        vysledek.append(zaokr(prumer(hodnoty)))
    return vysledek


def vlny_bossu(hry):
    """Bossové podle pořadí příchodu: kolikrát přišel, kolikrát padl, kdy a jak dlouho trval souboj."""
    vlny = []
    for i in range(max((len(h["bossove"]) for h in hry), default=0)):
        zaznamy = [(h, h["bossove"][i]) for h in hry if len(h["bossove"]) > i]
        padle = [b for _, b in zaznamy if b["padl_s"] is not None]
        nepadle = [h for h, b in zaznamy if b["padl_s"] is None]
        vlny.append({
            "druh": zaznamy[0][1]["druh"],
            "prislo": len(zaznamy),
            "padlo": len(padle),
            "prisel_s": zaokr(median([b["prisel_s"] for _, b in zaznamy])),
            "padl_s": zaokr(median([b["padl_s"] for b in padle])),
            "souboj_s": zaokr(median([b["padl_s"] - b["prisel_s"] for b in padle])),
            "konec_nepadlych_s": zaokr(median([h["preziti_s"] for h in nepadle])),
        })
    return vlny


def souhrn_skupiny(hry, limit, elity_od_min):
    doby = [doba(h, limit) for h in hry]
    s_elitou = [h["prvni_elita_s"] for h in hry if h["prvni_elita_s"] is not None]
    elit = sum(m["elit"] for h in hry for m in h["minuty"])
    elit_padlo = sum(m["elit_padlo"] for h in hry for m in h["minuty"])
    return {
        "her": len(hry),
        "prezilo": sum(h["prezil"] for h in hry),
        "median_s": zaokr(median(doby)),
        "min_s": zaokr(min(doby)) if doby else None,
        "max_s": zaokr(max(doby)) if doby else None,
        "uroven_median": median([h["uroven"] for h in hry]),
        "zabito_median": median([h["zabito"] for h in hry]),
        "bossu_median": median([h["zabito_bossu"] for h in hry]),
        "prvni_elita_s": zaokr(median(s_elitou)),
        "her_s_elitou": len(s_elitou),
        "her_po_elitach": sum(doba(h, limit) > elity_od_min * 60 for h in hry),
        "elit": elit,
        "elit_padlo": elit_padlo,
        "zabiti_za_min": prubeh(hry, limit, "zabito", True),
        "nepratel_za_min": prubeh(hry, limit, "nepratel", False),
        "elit_za_min": prubeh(hry, limit, "elit", True),
        "uroven_za_min": prubeh(hry, limit, "uroven", False),
        "bossove": vlny_bossu(hry),
    }


def souhrn_her(hry, katalog, parametry):
    limit = parametry["sekund"]
    elity_od = katalog["elity_od_min"]
    skupina = lambda podminka: souhrn_skupiny([h for h in hry if podminka(h)], limit, elity_od)  # noqa: E731
    return {
        "verze": VERZE_SOUHRNU,
        "parametry": parametry,
        "nazvy": {k: katalog[k] for k in ("tridy", "mapy", "bossove")},
        "hrozba": katalog["hrozba"],
        "meze": {k: katalog[k] for k in ("elity_od_min", "casteji_od_min", "narust_od_min", "pozde_od_min")},
        "vse": skupina(lambda h: True),
        "kombinace": {f"{t}/{m}": skupina(lambda h, t=t, m=m: h["trida"] == t and h["mapa"] == m)
                      for t in parametry["tridy"] for m in parametry["mapy"]},
        "tridy": {t: skupina(lambda h, t=t: h["trida"] == t) for t in parametry["tridy"]},
        "mapy": {m: skupina(lambda h, m=m: h["mapa"] == m) for m in parametry["mapy"]},
        "hry": [{k: h[k] for k in ("trida", "mapa", "seminko", "prezil", "preziti_s", "uroven", "zabito",
                                   "zabito_bossu", "prvni_elita_s")} for h in hry],
    }


def porovnej(stary, novy):
    """Vypíše, jak se medián přežití změnil proti minulému souhrnu se stejnými parametry."""
    klice = ("sekund", "seminka", "vylepseni")
    if any(stary.get("parametry", {}).get(k) != novy["parametry"][k] for k in klice):
        print("balanc: minulý souhrn má jiné parametry, neporovnávám", file=sys.stderr)
        return
    zmeny = []
    for klic, nove in novy["kombinace"].items():
        stare = stary.get("kombinace", {}).get(klic)
        if stare and stare["median_s"] != nove["median_s"]:
            zmeny.append(f"  {klic}: {cas(stare['median_s'])} → {cas(nove['median_s'])} "
                         f"(do konce {stare['prezilo']} → {nove['prezilo']} z {nove['her']})")
    if stary.get("parametry", {}).get("otisk_kodu") == novy["parametry"]["otisk_kodu"]:
        print("balanc: kód se od minulého běhu nezměnil", file=sys.stderr)
    print("balanc: proti minulému běhu " + ("beze změny přežití" if not zmeny else "se změnil medián přežití:"),
          file=sys.stderr)
    for radek in zmeny:
        print(radek, file=sys.stderr)


# ---------------------------------------------------------------------------------------------
# Čísla česky


def cislo(x, mist=0):
    if x is None:
        return "–"
    text = f"{x:,.{mist}f}"
    return text.replace(",", NBSP).replace(".", ",")


def cas(sekundy):
    if sekundy is None:
        return "–"
    s = int(round(sekundy))
    return f"{s // 60}:{s % 60:02d}"


def tvar(n, jedna, dve_az_ctyri, pet):
    return jedna if n == 1 else dve_az_ctyri if 2 <= n <= 4 else pet


def her(n):
    return f"{n} {tvar(n, 'hra', 'hry', 'her')}"


def rozsah_seminek(seminka):
    return f"{seminka[0]}–{seminka[-1]}" if len(seminka) > 1 else str(seminka[0])


# ---------------------------------------------------------------------------------------------
# SVG: vlastní karta se světlým i tmavým vzhledem (prefers-color-scheme), barvy podle role


SLOTY = {
    "light": ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
    "dark": ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
}
RAMPA = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]
TMAVY_TEXT_NA_RAMPE = 3  # na prvních třech (světlých) krocích rampy je tmavý text, dál bílý


def styl():
    radky = [
        'text{font-family:system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;fill:#0b0b0b}',
        ".pozadi{fill:#fcfcfb}.ramec{fill:none;stroke:#0b0b0b;stroke-opacity:.1}",
        ".t2{fill:#52514e}.t3{fill:#898781}.cisla{font-variant-numeric:tabular-nums}",
        ".mrizka{stroke:#e1e0d9}.osa{stroke:#c3c2b7}.mez{stroke:#898781;stroke-opacity:.6}",
        ".ring{stroke:#fcfcfb}.neutral{fill:#f0efec}.stopa{fill:#e1e0d9}.inkoust{fill:#0b0b0b}",
        ".f7svetla{fill:#d6d1f6}",  # světlý krok fialové (slot 7) pro bosse, který nepadl
    ]
    tmave = [
        "text{fill:#f0efec}.pozadi{fill:#1a1a19}.ramec{stroke:#fff}",
        ".t2{fill:#c3c2b7}.mrizka{stroke:#2c2c2a}.osa{stroke:#383835}",
        ".ring{stroke:#1a1a19}.neutral{fill:#2c2c2a}.stopa{fill:#383835}.inkoust{fill:#f0efec}",
        ".f7svetla{fill:#3d3770}",
    ]
    for i, (svetla, tmava) in enumerate(zip(SLOTY["light"], SLOTY["dark"]), start=1):
        radky.append(f".s{i}{{stroke:{svetla}}}.f{i}{{fill:{svetla}}}")
        tmave.append(f".s{i}{{stroke:{tmava}}}.f{i}{{fill:{tmava}}}")
    for i, barva in enumerate(RAMPA):
        radky.append(f".h{i}{{fill:{barva}}}.ht{i}{{fill:{'#0b0b0b' if i < TMAVY_TEXT_NA_RAMPE else '#ffffff'}}}")
        # Ve tmě je rampa obrácená: málo = tmavá barva blízko pozadí, hodně = světlá.
        j = len(RAMPA) - 1 - i
        tmave.append(f".h{i}{{fill:{RAMPA[j]}}}.ht{i}{{fill:{'#0b0b0b' if j < TMAVY_TEXT_NA_RAMPE else '#ffffff'}}}")
    return "".join(radky) + "@media (prefers-color-scheme:dark){" + "".join(tmave) + "}"


class Svg:
    def __init__(self, sirka, vyska, nadpis, popis):
        self.sirka = sirka
        self.vyska = vyska
        self.nadpis = nadpis
        self.popis = popis
        self.casti = []

    def pridej(self, kus):
        self.casti.append(kus)

    def text(self, x, y, obsah, velikost=12, trida="", kotva="start", tucne=False, titulek=None):
        atributy = f' class="{trida}"' if trida else ""
        if kotva != "start":
            atributy += f' text-anchor="{kotva}"'
        if tucne:
            atributy += ' font-weight="600"'
        vnitrek = escape(str(obsah))
        if titulek:
            vnitrek += f"<title>{escape(titulek)}</title>"
        self.pridej(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{velikost}"{atributy}>{vnitrek}</text>')

    def cara(self, x1, y1, x2, y2, trida="mrizka", sirka=1):
        self.pridej(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" class="{trida}" stroke-width="{sirka}"/>')

    def obdelnik(self, x, y, w, h, trida, zaobleni=4, pruhlednost=None, titulek=None):
        extra = f' fill-opacity="{pruhlednost}"' if pruhlednost is not None else ""
        konec = f"><title>{escape(titulek)}</title></rect>" if titulek else "/>"
        self.pridej(f'<rect x="{x:.1f}" y="{y:.1f}" width="{max(0, w):.1f}" height="{max(0, h):.1f}" rx="{zaobleni}" class="{trida}"{extra}{konec}')

    def lomena(self, body, trida):
        if len(body) < 2:
            return
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in body)
        self.pridej(f'<path d="{d}" class="{trida}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')

    def tecka(self, x, y, slot, titulek=None):
        konec = f"><title>{escape(titulek)}</title></circle>" if titulek else "/>"
        self.pridej(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" class="f{slot} ring" stroke-width="2"{konec}')

    def kosoctverec(self, x, y, r=6, titulek=None):
        konec = f"><title>{escape(titulek)}</title></path>" if titulek else "/>"
        self.pridej(f'<path d="M{x:.1f},{y - r:.1f} L{x + r:.1f},{y:.1f} L{x:.1f},{y + r:.1f} L{x - r:.1f},{y:.1f} Z" class="inkoust ring" stroke-width="2"{konec}')

    def hlavicka(self, podnadpis):
        self.text(24, 34, self.nadpis, 18, tucne=True)
        self.text(24, 56, podnadpis, 13, "t2")

    def __str__(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.sirka} {self.vyska}" '
                f'width="{self.sirka}" height="{self.vyska}" role="img" aria-labelledby="nadpis popis">'
                f'<title id="nadpis">{escape(self.nadpis)}</title><desc id="popis">{escape(self.popis)}</desc>'
                f"<style>{styl()}</style>"
                f'<rect x="0.5" y="0.5" width="{self.sirka - 1}" height="{self.vyska - 1}" rx="10" class="pozadi"/>'
                f'<rect x="0.5" y="0.5" width="{self.sirka - 1}" height="{self.vyska - 1}" rx="10" class="ramec"/>'
                + "".join(self.casti) + "</svg>\n")


def pekny_krok(maximum, pocet=4):
    if maximum <= 0:
        return 1
    hruby = maximum / pocet
    rad = 10 ** math.floor(math.log10(hruby))
    for nasobek in (1, 2, 2.5, 5, 10):
        if nasobek * rad >= hruby:
            return nasobek * rad
    return 10 * rad


def osa_y(svg, x0, x1, y_od, y_do, maximum, format_cisla, minimum=0, pocet=4):
    """Vodorovné mřížky s popisky vlevo, vrátí funkci hodnota → y. format_cisla(hodnota, desetinných míst)."""
    krok = pekny_krok(maximum - minimum, pocet)
    horni = minimum + krok * math.ceil((maximum - minimum) / krok - 1e-9)
    horni = max(horni, minimum + krok)
    mist = 0
    while mist < 3 and abs(krok * 10 ** mist - round(krok * 10 ** mist)) > 1e-9:
        mist += 1
    na_y = lambda v: y_do - (v - minimum) / (horni - minimum) * (y_do - y_od)  # noqa: E731
    for i in range(round((horni - minimum) / krok) + 1):
        v = minimum + i * krok
        y = na_y(v)
        svg.cara(x0, y, x1, y, "osa" if i == 0 else "mrizka")
        svg.text(x0 - 6, y + 4, format_cisla(v, mist), 11, "t3 cisla", "end")
    return na_y


def osa_x_minuty(svg, x0, x1, y, limit_min, krok=None):
    krok = krok or (5 if limit_min > 12 else 2 if limit_min > 4 else 1)
    na_x = lambda m: x0 + m / limit_min * (x1 - x0)  # noqa: E731
    m = 0
    while m <= limit_min + 1e-9:
        svg.cara(na_x(m), y, na_x(m), y + 4, "osa")
        svg.text(na_x(m), y + 17, f"{m:g}", 11, "t3 cisla", "middle")
        m += krok
    return na_x


def popisky_na_konci(svg, popisky, x, y_min, y_max, mezera=13):
    """Popisky na konci čar: seřazené podle y a odsunuté, aby se nepřekrývaly."""
    popisky = sorted(popisky, key=lambda p: p[0])
    for i in range(1, len(popisky)):
        if popisky[i][0] - popisky[i - 1][0] < mezera:
            popisky[i] = (popisky[i - 1][0] + mezera, popisky[i][1])
    preteceni = (popisky[-1][0] - y_max) if popisky else 0
    if preteceni > 0:
        popisky = [(y - preteceni, t) for y, t in popisky]
    for y, text in popisky:
        svg.text(x, max(y_min, y) + 4, text, 11, "t2")


def legenda(svg, x, y, polozky):
    """Legenda v řadě: (slot, text). Vrátí x za poslední položkou."""
    for slot, text in polozky:
        svg.pridej(f'<line x1="{x:.1f}" y1="{y - 4:.1f}" x2="{x + 16:.1f}" y2="{y - 4:.1f}" class="s{slot}" stroke-width="2" stroke-linecap="round"/>')
        svg.text(x + 22, y, text, 12, "t2")
        x += 22 + 6.6 * len(text) + 16
    return x


def slot_tridy(souhrn, trida):
    """Barva patří postavě (pořadí v TRIDY), ne pořadí ve výběru: --tridy nepřebarví zbylé."""
    i = list(souhrn["nazvy"]["tridy"]).index(trida)
    return i + 1 if i < 8 else None


def zalom(text, max_znaku):
    if len(text) <= max_znaku or " " not in text:
        return [text]
    mezery = [i for i, z in enumerate(text) if z == " "]
    i = min(mezery, key=lambda m: abs(m - len(text) / 2))
    return [text[:i], text[i + 1:]]


# ---------------------------------------------------------------------------------------------
# Grafy


def graf_preziti(souhrn):
    p = souhrn["parametry"]
    limit = p["sekund"]
    tridy, mapy = p["tridy"], p["mapy"]
    nazvy = souhrn["nazvy"]
    sirka = 860
    levy = 130
    sloupce = len(mapy) + 1
    sirka_bunky = min(110, (sirka - 24 - levy - 24) / sloupce)
    vyska_bunky = 54
    horni = 112
    vyska = horni + (len(tridy) + 1) * vyska_bunky + 96
    svg = Svg(sirka, vyska, "Přežití podle postavy a mapy",
              "Medián doby přežití bota pro každou postavu a mapu a kolik her došlo do limitu.")
    svg.hlavicka(f"Medián přežití, {her(len(p['seminka']))} na buňku (semínka {rozsah_seminek(p['seminka'])}), "
                 f"limit {cas(limit)} min · pod ním kolik her došlo do limitu")
    for j, mapa in enumerate(mapy + [None]):
        x = levy + 24 + j * sirka_bunky + sirka_bunky / 2
        radky = zalom(nazvy["mapy"][mapa], 12) if mapa else ["Všechny mapy"]
        for k, radek in enumerate(radky):
            svg.text(x, horni - 12 - (len(radky) - 1 - k) * 14, radek, 12, "t2" if mapa else "t3", "middle",
                     tucne=bool(mapa))

    def bunka(x, y, skupina, popis, neutralni):
        median_s = skupina["median_s"]
        if neutralni:
            pozadi, text1, text2 = "neutral", "", "t2"
        else:
            krok = min(len(RAMPA) - 1, int(median_s / limit * len(RAMPA))) if median_s is not None else 0
            pozadi, text1, text2 = f"h{krok}", f"ht{krok}", f"ht{krok}"
        hodnota = cas(median_s) + ("+" if median_s is not None and median_s >= limit else "")
        titulek = (f"{popis}: medián {hodnota} min, nejkratší {cas(skupina['min_s'])}, nejdelší "
                   f"{cas(skupina['max_s'])}, do limitu došlo {skupina['prezilo']}/{skupina['her']}")
        svg.obdelnik(x + 1, y + 1, sirka_bunky - 2, vyska_bunky - 2, pozadi, titulek=titulek)
        svg.text(x + sirka_bunky / 2, y + 24, hodnota, 15, f"{text1} cisla".strip(), "middle", tucne=True)
        svg.text(x + sirka_bunky / 2, y + 41, f"{skupina['prezilo']}/{skupina['her']} do konce", 11,
                 f"{text2} cisla", "middle")

    for i, trida in enumerate(tridy + [None]):
        y = horni + i * vyska_bunky
        popis_radku = nazvy["tridy"][trida] if trida else "Všechny postavy"
        svg.text(24, y + vyska_bunky / 2 + 4, popis_radku, 13, "" if trida else "t3", tucne=bool(trida))
        for j, mapa in enumerate(mapy + [None]):
            x = levy + 24 + j * sirka_bunky
            if trida and mapa:
                skupina, neutralni = souhrn["kombinace"][f"{trida}/{mapa}"], False
            elif trida:
                skupina, neutralni = souhrn["tridy"][trida], True
            elif mapa:
                skupina, neutralni = souhrn["mapy"][mapa], True
            else:
                skupina, neutralni = souhrn["vse"], True
            popis = " – ".join(x for x in (nazvy["tridy"].get(trida), nazvy["mapy"].get(mapa)) if x) or "Všechno"
            bunka(x, y, skupina, popis, neutralni)
    # Stupnice rampy
    y = horni + (len(tridy) + 1) * vyska_bunky + 34
    x = levy + 24
    sirka_kroku = 46
    svg.text(24, y + 12, "Medián přežití", 12, "t2")
    for i in range(len(RAMPA)):
        svg.obdelnik(x + i * sirka_kroku + 1, y, sirka_kroku - 2, 16, f"h{i}", zaobleni=3)
    for podil in (0, 0.5, 1):
        svg.text(x + podil * len(RAMPA) * sirka_kroku, y + 32, cas(limit * podil), 11, "t3 cisla", "middle")
    svg.text(x + len(RAMPA) * sirka_kroku + 24, y + 12, "Šedé buňky: všechny hry řádku nebo sloupce dohromady",
             12, "t3")
    return str(svg)


def graf_hrozba(souhrn):
    p = souhrn["parametry"]
    limit_min = p["sekund"] / 60
    meze = souhrn["meze"]
    sirka, vyska = 860, 450
    svg = Svg(sirka, vyska, "Růst Hrozby",
              "Vlevo jak sílí noví nepřátelé s časem, vpravo kolik her bota ještě běží.")
    svg.hlavicka("Vlevo síla nových nepřátel (násobek začátku hry), vpravo kolik her ještě běží")
    y_od, y_do = 154, 394
    mezni = [(meze["elity_od_min"], "elity"), (meze["narust_od_min"], "nárůst"), (meze["casteji_od_min"], "víc elit")]

    def meze_svisle(na_x):
        for k, (m, text) in enumerate(mezni):
            if m < limit_min:
                svg.cara(na_x(m), y_od, na_x(m), y_do, "mez")
                svg.text(na_x(m), y_od - 8 - (k % 2) * 12, f"{m}. {text}", 10, "t3", "middle")

    # Vlevo: násobky z tabulky HROZBA.
    x0, x1 = 64, 330
    rady = [("boss_zivoty", "Životy bossů", 7), ("zivoty", "Životy", 8), ("poskozeni", "Poškození", 6),
            ("rychlost", "Rychlost", 5)]
    svg.text(24, 90, "Noví nepřátelé, násobek", 13, tucne=True)
    legenda(svg, 24, 114, [(slot, nazev) for _, nazev, slot in rady])
    hrozba = [h for h in souhrn["hrozba"] if h["min"] <= limit_min + 1e-9]
    maximum = max(h[k] for h in hrozba for k, _, _ in rady)
    na_y = osa_y(svg, x0, x1, y_od, y_do, maximum, lambda v, mist: f"×{cislo(v, mist)}", minimum=0)
    na_x = osa_x_minuty(svg, x0, x1, y_do, limit_min)
    meze_svisle(na_x)
    popisky = []
    for klic, nazev, slot in rady:
        body = [(na_x(h["min"]), na_y(h[klic])) for h in hrozba]
        svg.lomena(body, f"s{slot}")
        posledni = hrozba[-1]
        svg.tecka(*body[-1], slot, titulek=f"{nazev} v {posledni['min']}. min: ×{cislo(posledni[klic], 2)}")
        popisky.append((body[-1][1], f"{nazev} ×{cislo(posledni[klic], 1)}"))
    popisky_na_konci(svg, popisky, x1 + 10, y_od, y_do)
    svg.text((x0 + x1) / 2, y_do + 36, "minuta hry", 11, "t3", "middle")

    # Vpravo: kolik her ještě běží, po postavách (všechny mapy dohromady).
    x0, x1 = 520, 740
    svg.text(476, 90, "Hry, které ještě běží (všechny mapy)", 13, tucne=True)
    legenda(svg, 476, 114, [(slot_tridy(souhrn, t), souhrn["nazvy"]["tridy"][t]) for t in p["tridy"]
                            if slot_tridy(souhrn, t)])
    na_y = osa_y(svg, x0, x1, y_od, y_do, 100, lambda v, mist: f"{cislo(v, mist)} %", minimum=0, pocet=4)
    na_x = osa_x_minuty(svg, x0, x1, y_do, limit_min)
    meze_svisle(na_x)
    popisky = []
    krok_s = 10
    for trida in p["tridy"]:
        hry = [h for h in souhrn["hry"] if h["trida"] == trida]
        slot = slot_tridy(souhrn, trida)
        body = []
        t = 0.0
        while t <= p["sekund"] + 1e-9:
            zive = sum(1 for h in hry if h["prezil"] or h["preziti_s"] > t)
            body.append((na_x(t / 60), na_y(100 * zive / len(hry))))
            t += krok_s
        konec = 100 * sum(h["prezil"] for h in hry) / len(hry)
        nazev = souhrn["nazvy"]["tridy"][trida]
        if slot:
            svg.lomena(body, f"s{slot}")
            svg.tecka(*body[-1], slot, titulek=f"{nazev}: do limitu {cislo(konec)} % her")
        popisky.append((body[-1][1], f"{nazev} {cislo(konec)} %"))
    popisky_na_konci(svg, popisky, x1 + 10, y_od, y_do)
    svg.text((x0 + x1) / 2, y_do + 36, "minuta hry", 11, "t3", "middle")
    return str(svg)


def graf_zabiti(souhrn):
    p = souhrn["parametry"]
    limit_min = p["sekund"] / 60
    mapy = p["mapy"]
    sloupcu = min(3, len(mapy))
    radku = math.ceil(len(mapy) / sloupcu)
    sirka = 860
    sirka_panelu = (sirka - 24 * 2 - 24 * (sloupcu - 1)) / sloupcu
    vyska_panelu = 190
    horni = 104
    vyska = horni + radku * (vyska_panelu + 26) + 16
    svg = Svg(sirka, vyska, "Zabití za minutu",
              "Kolik nepřátel bot zabije za minutu na každé mapě, průměr her, které v té minutě ještě běží.")
    svg.hlavicka("Průměr her, které v té minutě ještě běží · stejná stupnice ve všech mapách")
    legenda(svg, 24, 84, [(slot_tridy(souhrn, t), souhrn["nazvy"]["tridy"][t]) for t in p["tridy"]
                          if slot_tridy(souhrn, t)])
    maximum = max((v for k in souhrn["kombinace"].values() for v in k["zabiti_za_min"] if v is not None), default=1)
    for i, mapa in enumerate(mapy):
        sx = 24 + (i % sloupcu) * (sirka_panelu + 24)
        sy = horni + (i // sloupcu) * (vyska_panelu + 26)
        x0, x1 = sx + 44, sx + sirka_panelu - 8
        y_od, y_do = sy + 26, sy + vyska_panelu - 24
        svg.text(sx, sy + 10, souhrn["nazvy"]["mapy"][mapa], 13, tucne=True)
        na_y = osa_y(svg, x0, x1, y_od, y_do, maximum, cislo, pocet=3)
        na_x = osa_x_minuty(svg, x0, x1, y_do, limit_min)
        for trida in p["tridy"]:
            slot = slot_tridy(souhrn, trida)
            rada = souhrn["kombinace"][f"{trida}/{mapa}"]["zabiti_za_min"]
            body = [(na_x(m + 0.5), na_y(v)) for m, v in enumerate(rada) if v is not None]
            if not slot or not body:
                continue
            svg.lomena(body, f"s{slot}")
            posledni = max(m for m, v in enumerate(rada) if v is not None)
            svg.tecka(*body[-1], slot, titulek=f"{souhrn['nazvy']['tridy'][trida]}, {souhrn['nazvy']['mapy'][mapa]}: "
                                               f"{cislo(rada[posledni])} zabití v {posledni + 1}. minutě")
    return str(svg)


def graf_elity_bossove(souhrn):
    p = souhrn["parametry"]
    limit_min = p["sekund"] / 60
    mapy = p["mapy"]
    nazvy = souhrn["nazvy"]
    sirka = 860
    levy = 150
    vyska_radku = 76
    horni = 120
    vyska = horni + len(mapy) * vyska_radku + 44
    svg = Svg(sirka, vyska, "Kdy přicházejí elity a bossové",
              "Pro každou mapu příchod a pád každého bosse, první elita a jak dlouho hrdina žije (mediány).")
    her_na_mapu = len(p["tridy"]) * len(p["seminka"])
    svg.hlavicka(f"Mediány, {her(her_na_mapu)} na mapu (všechny postavy) · pod bossem kolikrát padl / přišel a jak dlouho trval souboj")
    x0, x1 = levy + 24, sirka - 28
    na_x = lambda m: x0 + m / limit_min * (x1 - x0)  # noqa: E731
    # Legenda
    y = 88
    svg.obdelnik(24, y - 9, 26, 10, "f7")
    svg.text(56, y, "boss od příchodu do pádu", 12, "t2")
    svg.obdelnik(222, y - 9, 26, 10, "f7svetla")
    svg.text(254, y, "boss nepadl (do konce hry)", 12, "t2")
    svg.kosoctverec(442, y - 4, 5)
    svg.text(454, y, "první elita", 12, "t2")
    svg.obdelnik(540, y - 7, 26, 6, "stopa", zaobleni=3)
    svg.text(572, y, "hrdina ještě žije", 12, "t2")
    # Svislá mřížka po 3 minutách (bossové chodí po 3 minutách) a osa
    y_osy = horni + len(mapy) * vyska_radku
    m = 0
    while m <= limit_min + 1e-9:
        svg.cara(na_x(m), horni - 6, na_x(m), y_osy, "mrizka")
        svg.text(na_x(m), y_osy + 18, f"{m:g}", 11, "t3 cisla", "middle")
        m += 3
    svg.text((x0 + x1) / 2, y_osy + 36, "minuta hry", 11, "t3", "middle")
    for i, mapa in enumerate(mapy):
        skupina = souhrn["mapy"][mapa]
        stred = horni + i * vyska_radku + vyska_radku / 2
        svg.text(24, stred + 4, nazvy["mapy"][mapa], 13, tucne=True)
        svg.text(24, stred + 20, f"přežití {cas_limitu(skupina['median_s'], p['sekund'])}", 11, "t3 cisla")
        svg.obdelnik(x0, stred - 3, na_x(skupina["median_s"] / 60) - x0, 6, "stopa", zaobleni=3,
                     titulek=f"{nazvy['mapy'][mapa]}: medián přežití {cas(skupina['median_s'])} min")
        mezera_vln = (x1 - x0) / limit_min * 3
        for vlna in skupina["bossove"]:
            jmeno = nazvy["bossove"].get(vlna["druh"], vlna["druh"])
            if mezera_vln < 120:
                jmeno = jmeno.split(" ")[0]
            xa = na_x(vlna["prisel_s"] / 60)
            titulek = (f"{jmeno}: přišel {vlna['prislo']}×, padl {vlna['padlo']}×"
                       + (f", souboj {cislo(vlna['souboj_s'])} s (medián)" if vlna["padlo"] else ""))
            if vlna["padlo"] < vlna["prislo"] and vlna["konec_nepadlych_s"] is not None:
                svg.obdelnik(xa, stred - 7, na_x(vlna["konec_nepadlych_s"] / 60) - xa, 14, "f7svetla", titulek=titulek)
            if vlna["padlo"]:
                svg.obdelnik(xa, stred - 7, max(4, na_x(vlna["padl_s"] / 60) - xa), 14, "f7", titulek=titulek)
            svg.text(xa, stred - 13, jmeno, 11, "t2")
            souboj = f" · {cislo(vlna['souboj_s'])} s" if vlna["padlo"] else ""
            svg.text(xa, stred + 22, f"{vlna['padlo']}/{vlna['prislo']}{souboj}", 11, "t3 cisla")
        if skupina["prvni_elita_s"] is not None:
            svg.kosoctverec(na_x(skupina["prvni_elita_s"] / 60), stred, 6,
                            titulek=f"první elita {cas(skupina['prvni_elita_s'])} (medián, her s elitou: {skupina['her_s_elitou']})")
    return str(svg)


# ---------------------------------------------------------------------------------------------
# BALANC.md


def tabulka(hlavicka, radky):
    vystup = ["| " + " | ".join(hlavicka) + " |", "|" + "|".join(["---"] + ["--:"] * (len(hlavicka) - 1)) + "|"]
    vystup += ["| " + " | ".join(str(b) for b in r) + " |" for r in radky]
    return "\n".join(vystup)


def cas_limitu(sekundy, limit):
    """Čas přežití, u celého limitu s plusem (hra by mohla trvat dál)."""
    return cas(sekundy) + ("+" if sekundy is not None and sekundy >= limit else "")


def bunka_preziti(skupina, limit):
    return f"{cas_limitu(skupina['median_s'], limit)} ({skupina['prezilo']}/{skupina['her']})"


def popis_preziti(skupina, limit):
    return f"{cas_limitu(skupina['median_s'], limit)}, do konce {skupina['prezilo']}/{skupina['her']}"


def konce_her(souhrn):
    """Kdy hry končí: počty her podle doby přežití a seznam velmi krátkých her (se semínkem k zopakování)."""
    p = souhrn["parametry"]
    limit = p["sekund"]
    nazvy = souhrn["nazvy"]
    hry = souhrn["hry"]
    hranice = sorted({b for b in (180, 300, 600) if b < limit})
    useky = []
    od = 0
    for do in hranice + [limit]:
        pocet = sum(1 for h in hry if not h["prezil"] and od <= h["preziti_s"] < do)
        useky.append(f"{cas(od)}–{cas(do)} {pocet}")
        od = do
    radky = [f"- Konec hry (všech {len(hry)}): smrt v " + ", ".join(useky)
             + f", došlo do limitu {sum(h['prezil'] for h in hry)}."]
    kratke = [h for h in hry if not h["prezil"] and h["preziti_s"] < 90]
    if kratke:
        ukazka = kratke[0]
        radky.append("- Hry kratší než 1:30: " + ", ".join(
            f"{nazvy['tridy'][h['trida']]} – {nazvy['mapy'][h['mapa']]} semínko {h['seminko']} {cas(h['preziti_s'])}"
            for h in kratke) + f". Zopakuje je třeba `node tests/simulace.mjs {ukazka['seminko']} {limit} --json "
            f"--trida {ukazka['trida']} --mapa {ukazka['mapa']}`.")
    return radky


def fakta(souhrn):
    p = souhrn["parametry"]
    limit = p["sekund"]
    nazvy = souhrn["nazvy"]
    meze = souhrn["meze"]
    jmeno = lambda klic: " – ".join((nazvy["tridy"][klic.split("/")[0]], nazvy["mapy"][klic.split("/")[1]]))  # noqa: E731
    komb = souhrn["kombinace"]
    radky = []
    lehke = [k for k, s in komb.items() if s["prezilo"] == s["her"]]
    tezke = [k for k, s in komb.items() if s["median_s"] is not None and s["median_s"] < meze["elity_od_min"] * 60]
    if lehke:
        radky.append(f"- **Moc lehké pro bota** (všechny hry došly do limitu {cas(limit)}): "
                     + ", ".join(jmeno(k) for k in lehke) + ".")
    else:
        radky.append(f"- Žádná kombinace postavy a mapy nedošla do limitu {cas(limit)} ve všech hrách.")
    if tezke:
        radky.append(f"- **Moc těžké pro bota** (medián přežití pod {meze['elity_od_min']} min, tedy dřív, než přijdou "
                     "elity): " + ", ".join(f"{jmeno(k)} {cas(komb[k]['median_s'])}" for k in tezke) + ".")
    serazene = sorted(komb, key=lambda k: (komb[k]["median_s"], komb[k]["prezilo"]))
    radky.append(f"- Nejkratší medián má {jmeno(serazene[0])} ({popis_preziti(komb[serazene[0]], limit)}), nejdelší "
                 f"{jmeno(serazene[-1])} ({popis_preziti(komb[serazene[-1]], limit)}).")
    mapy = sorted(p["mapy"], key=lambda m: souhrn["mapy"][m]["median_s"])
    if len(mapy) > 1:
        radky.append("- Mapy od nejtěžší (medián všech postav): "
                     + ", ".join(f"{nazvy['mapy'][m]} {cas_limitu(souhrn['mapy'][m]['median_s'], limit)}" for m in mapy) + ".")
    tridy = sorted(p["tridy"], key=lambda t: souhrn["tridy"][t]["median_s"])
    if len(tridy) > 1:
        radky.append("- Postavy od nejslabší (medián všech map): "
                     + ", ".join(f"{nazvy['tridy'][t]} {cas_limitu(souhrn['tridy'][t]['median_s'], limit)}" for t in tridy) + ".")
        rozdily = []
        for m in p["mapy"]:
            hodnoty = sorted(((komb[f"{t}/{m}"]["median_s"], t) for t in p["tridy"]))
            rozdily.append((hodnoty[-1][0] - hodnoty[0][0], m, hodnoty[0], hodnoty[-1]))
        rozdil, m, nejhorsi, nejlepsi = max(rozdily)
        radky.append(f"- Největší rozdíl mezi postavami je na mapě {nazvy['mapy'][m]}: {nazvy['tridy'][nejlepsi[1]]} "
                     f"{cas_limitu(nejlepsi[0], limit)} proti {nazvy['tridy'][nejhorsi[1]]} {cas(nejhorsi[0])} "
                     f"(o {cas(rozdil)} min).")
    radky += konce_her(souhrn)
    return "\n".join(radky)


def fakta_hrozba(souhrn):
    p = souhrn["parametry"]
    limit_min = p["sekund"] // 60
    hrozba = {h["min"]: h for h in souhrn["hrozba"]}
    radky = []
    for m in sorted({5, 10, limit_min} & set(hrozba)):
        h = hrozba[m]
        radky.append(f"- V {m}. minutě mají noví nepřátelé ×{cislo(h['zivoty'], 1)} životů, ×{cislo(h['poskozeni'], 2)} "
                     f"poškození a ×{cislo(h['rychlost'], 2)} rychlosti, bossové ×{cislo(h['boss_zivoty'], 1)} životů; "
                     f"vlna každých {cislo(h['vlna_s'], 2)} s po {h['davka']}.")
    for m in sorted({5, 10} & set(range(1, limit_min))) + [limit_min]:
        casti = []
        for t in p["tridy"]:
            hry = [h for h in souhrn["hry"] if h["trida"] == t]
            zive = sum(1 for h in hry if h["prezil"] or h["preziti_s"] > m * 60)
            casti.append(f"{souhrn['nazvy']['tridy'][t]} {cislo(100 * zive / len(hry))} %")
        radky.append(f"- Po {m}. minutě ještě běží: " + ", ".join(casti) + ".")
    return "\n".join(radky)


def fakta_zabiti(souhrn):
    p = souhrn["parametry"]
    radky = []
    for m in p["mapy"]:
        nejvic = None
        for t in p["tridy"]:
            for minuta, v in enumerate(souhrn["kombinace"][f"{t}/{m}"]["zabiti_za_min"]):
                if v is not None and (nejvic is None or v > nejvic[0]):
                    nejvic = (v, t, minuta)
        if nejvic:
            prvni = [souhrn["kombinace"][f"{t}/{m}"]["zabiti_za_min"][0] for t in p["tridy"]]
            radky.append(f"- {souhrn['nazvy']['mapy'][m]}: v 1. minutě {cislo(min(prvni))}–{cislo(max(prvni))} "
                         f"zabití, nejvíc {cislo(nejvic[0])} za minutu ({souhrn['nazvy']['tridy'][nejvic[1]]}, "
                         f"{nejvic[2] + 1}. minuta).")
    return "\n".join(radky)


def tabulka_bossu(souhrn):
    """Každý boss přes všechny mapy a postavy: kolikrát přišel, padl a jak dlouho trval souboj."""
    nazvy = souhrn["nazvy"]
    podle_bosse = {}
    for m in souhrn["parametry"]["mapy"]:
        for vlna in souhrn["mapy"][m]["bossove"]:
            podle_bosse.setdefault(vlna["druh"], []).append((m, vlna))
    radky = []
    for druh, vlny in podle_bosse.items():
        for m, vlna in vlny:
            podil = 100 * vlna["padlo"] / vlna["prislo"]
            radky.append((nazvy["bossove"].get(druh, druh), nazvy["mapy"][m], cas(vlna["prisel_s"]),
                          f"{vlna['padlo']}/{vlna['prislo']} ({cislo(podil)} %)",
                          f"{cislo(vlna['souboj_s'])} s" if vlna["padlo"] else "–"))
    return tabulka(["Boss", "Mapa", "Přichází", "Padl / přišel", "Souboj (medián)"], radky)


def fakta_elity(souhrn):
    p = souhrn["parametry"]
    meze = souhrn["meze"]
    nazvy = souhrn["nazvy"]
    radky = []
    vse = souhrn["vse"]
    if vse["her_s_elitou"]:
        radky.append(f"- Hry, které přežily {meze['elity_od_min']}. minutu: {vse['her_po_elitach']}, z toho s elitou "
                     f"{vse['her_s_elitou']}. První elita přišla v mediánu v {cas(vse['prvni_elita_s'])}. "
                     f"Zabitých elit: {vse['elit_padlo']}/{vse['elit']} ({cislo(100 * vse['elit_padlo'] / max(1, vse['elit']))} %).")
    else:
        radky.append(f"- Žádná elita nepřišla (elity chodí od {meze['elity_od_min']}. minuty).")
    nikdy = []
    vzdy = []
    for m in p["mapy"]:
        for vlna in souhrn["mapy"][m]["bossove"]:
            jmeno = (f"{nazvy['bossove'].get(vlna['druh'], vlna['druh'])} ({nazvy['mapy'][m]}, {cas(vlna['prisel_s'])}, "
                     f"{vlna['padlo']}/{vlna['prislo']})")
            if vlna["padlo"] == 0:
                nikdy.append(jmeno)
            elif vlna["padlo"] == vlna["prislo"]:
                vzdy.append(jmeno)
    if nikdy:
        radky.append("- Nepadl ani jednou: " + ", ".join(nikdy) + ".")
    if vzdy:
        radky.append("- Padl pokaždé, když přišel: " + ", ".join(vzdy) + ".")
    prvni = [(souhrn["mapy"][m]["bossove"][0], m) for m in p["mapy"] if souhrn["mapy"][m]["bossove"]]
    if prvni:
        radky.append("- První boss mapy padl: " + ", ".join(
            f"{nazvy['mapy'][m]} {v['padlo']}/{v['prislo']}" for v, m in prvni) + ".")
    return "\n".join(radky)


def balanc_md(souhrn):
    p = souhrn["parametry"]
    limit = p["sekund"]
    nazvy = souhrn["nazvy"]
    vylepseni = "se všemi trvalými vylepšeními na maximu" if p["vylepseni"] == "max" else "bez trvalých vylepšení"
    radky_preziti = []
    for t in p["tridy"]:
        radky_preziti.append([f"**{nazvy['tridy'][t]}**"]
                             + [bunka_preziti(souhrn["kombinace"][f"{t}/{m}"], limit) for m in p["mapy"]]
                             + [bunka_preziti(souhrn["tridy"][t], limit)])
    radky_preziti.append(["Všechny postavy"] + [bunka_preziti(souhrn["mapy"][m], limit) for m in p["mapy"]]
                         + [bunka_preziti(souhrn["vse"], limit)])
    radky_dalsi = []
    for t in p["tridy"]:
        for m in p["mapy"]:
            s = souhrn["kombinace"][f"{t}/{m}"]
            radky_dalsi.append([nazvy["tridy"][t], nazvy["mapy"][m], cas(s["min_s"]), cas(s["max_s"]),
                                cislo(s["uroven_median"]), cislo(s["zabito_median"]), cislo(s["bossu_median"]),
                                cas(s["prvni_elita_s"])])
    return f"""<!-- Vygenerováno nástrojem nastroje/balanc.py, ručně neupravovat (přepíše se). -->
# Balanc RuGee

Stejný bot jako v testu (`tests/simulace.mjs`) hraje {vylepseni} za každou postavu na každé mapě,
{her(len(p['seminka']))} na kombinaci (semínka {rozsah_seminek(p['seminka'])}), nejdéle {cas(limit)} min. Bot není člověk:
utíká, sbírá krystaly a bere nejdřív zbraně. Čísla proto ukazují poměry mezi postavami a mapami, ne přesně,
jak dlouho vydrží hráč. Níž jsou jen fakta z dat, „lehké“ a „těžké“ se počítá podle pravidel v závorkách.

{her(len(souhrn['hry']))} · otisk kódu `{p['otisk_kodu']}` · znovu: `{p['prikaz']}` (podrobnosti v
[PODROBNOSTI.md](PODROBNOSTI.md#balanc))

## Přežití

![Přežití podle postavy a mapy](balanc/preziti.svg)

{fakta(souhrn)}

Medián přežití (v závorce kolik her došlo do limitu), `+` = medián je celý limit:

{tabulka(["Postava"] + [nazvy["mapy"][m] for m in p["mapy"]] + ["Všechny mapy"], radky_preziti)}

## Hrozba

![Růst Hrozby](balanc/hrozba.svg)

{fakta_hrozba(souhrn)}

## Zabití za minutu

![Zabití za minutu](balanc/zabiti.svg)

{fakta_zabiti(souhrn)}

## Elity a bossové

![Kdy přicházejí elity a bossové](balanc/elity-bossove.svg)

{fakta_elity(souhrn)}

{tabulka_bossu(souhrn)}

## Všechny kombinace

{tabulka(["Postava", "Mapa", "Nejkratší", "Nejdelší", "Úroveň", "Zabito", "Bossů", "1. elita"], radky_dalsi)}

Úroveň, zabití a bossové jsou mediány na konci hry, 1. elita je medián her, kde nějaká přišla.
Data všech grafů jsou v [balanc/souhrn.json](balanc/souhrn.json).
"""


def zapis(souhrn, vystup):
    slozka = vystup / "balanc"
    slozka.mkdir(parents=True, exist_ok=True)
    soubory = {
        slozka / "preziti.svg": graf_preziti(souhrn),
        slozka / "hrozba.svg": graf_hrozba(souhrn),
        slozka / "zabiti.svg": graf_zabiti(souhrn),
        slozka / "elity-bossove.svg": graf_elity_bossove(souhrn),
        slozka / "souhrn.json": json.dumps(souhrn, ensure_ascii=False, indent=1) + "\n",
        vystup / "BALANC.md": balanc_md(souhrn),
    }
    for cesta, obsah in soubory.items():
        cesta.write_text(obsah, encoding="utf-8")
        print(f"  {cesta.relative_to(vystup.parent) if vystup.parent in cesta.parents else cesta}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Analýza balancu RuGee: simulace všech postav a map, grafy a BALANC.md.")
    parser.add_argument("--seminek", type=int, default=6, help="kolik semínek na každou postavu a mapu (6)")
    parser.add_argument("--od", type=int, default=1, help="první semínko (1)")
    parser.add_argument("--sekund", type=int, default=900, help="nejdelší hra v sekundách (900 = 15 min)")
    parser.add_argument("--tridy", help="jen tyto postavy, čárkou (lovec,havir,…)")
    parser.add_argument("--mapy", help="jen tyto mapy, čárkou (louka,sopka,…)")
    parser.add_argument("--vylepseni", choices=["zadna", "max"], default="zadna",
                        help="trvalá vylepšení bota: zadna (jako nový hráč) nebo max")
    parser.add_argument("--procesu", type=int, default=max(1, (os.cpu_count() or 2) - 1),
                        help="kolik her naráz (počet jader − 1)")
    parser.add_argument("--vystup", type=Path, default=KOREN / "docs",
                        help="kam zapsat BALANC.md a složku balanc/ (docs)")
    parser.add_argument("--z-dat", type=Path, dest="z_dat", help="nesimulovat, jen překreslit ze souhrn.json")
    parser.add_argument("--node", default=os.environ.get("NODE", "node"), help="příkaz pro Node (node)")
    arg = parser.parse_args()
    if arg.seminek < 1 or arg.sekund < 60 or arg.procesu < 1:
        parser.error("--seminek a --procesu musí být aspoň 1, --sekund aspoň 60")
    vystup = arg.vystup.resolve()
    if arg.z_dat:
        souhrn = json.loads(arg.z_dat.read_text(encoding="utf-8"))
        if souhrn.get("verze") != VERZE_SOUHRNU:
            sys.exit(f"balanc: {arg.z_dat} má jinou verzi souhrnu ({souhrn.get('verze')}), pusť simulaci znovu")
    else:
        katalog = simulace(arg.node, 1, arg.sekund, "--seznam")
        souhrn = odehraj(arg, katalog)
        stary = vystup / "balanc" / "souhrn.json"
        if stary.exists():
            try:
                porovnej(json.loads(stary.read_text(encoding="utf-8")), souhrn)
            except (ValueError, KeyError, TypeError) as chyba:
                print(f"balanc: minulý souhrn nejde přečíst ({chyba})", file=sys.stderr)
    zapis(souhrn, vystup)


if __name__ == "__main__":
    main()
