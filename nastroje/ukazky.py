#!/usr/bin/env python3
"""Ukázky RuGee: GIF ze hry a 3 screenshoty do docs/ukazky.

Spustí hru na lokálním serveru a nechá ji natočit nastroje/natoc.mjs (Node + Playwright, jednoduchý bot hraje).
Z videa vybere nejakčnější úsek podle změn mezi snímky (mimo okna úrovní, obchodu a konce hry) a udělá z něj
GIF kolem hrdiny bez horní lišty a přehledu výbavy, nanejvýš 4 MB. K tomu uloží 3 screenshoty: menu, boj
(ten z nejakčnější chvíle) a okno nové úrovně.

  python3 nastroje/ukazky.py                              # natočí 230 s, výstup do docs/ukazky
  python3 nastroje/ukazky.py --sekund 120 --delka 5
  python3 nastroje/ukazky.py --prace /tmp/natoceni        # natočení (video, osa.json, fotky) si nechá
  python3 nastroje/ukazky.py --z-natoceni /tmp/natoceni   # nenatáčí, jen znovu vybere úsek a udělá výstup

Potřebuje Python 3.9+ s Pillow, Node 18+, ffmpeg a Playwright s Chromiem. Když Playwright není nainstalovaný
v okolí repa, nastav PLAYWRIGHT_MODUL na složku jeho balíčku (…/node_modules/playwright).
"""
from __future__ import annotations

import argparse
import contextlib
import functools
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:  # pragma: no cover - jen hláška pro člověka
    sys.exit("Chybí Pillow: python3 -m pip install Pillow")

# Pillow 9.1+ má výčty, starší jen konstanty.
RYCHLY_OKTALOVY = getattr(getattr(Image, "Quantize", Image), "FASTOCTREE", 2)
BEZ_ROZPTYLU = getattr(getattr(Image, "Dither", Image), "NONE", 0)

KOREN = Path(__file__).resolve().parent.parent
NATOC = KOREN / "nastroje" / "natoc.mjs"
# Rozbor pohybu jde po každém snímku videa (natoc.mjs točí 30 za sekundu), v obraze kolikrát menším.
FPS_ROZBORU = 30
ZMENSENI = 4
# Změna jasu (0–255), od které se pixel počítá jako „něco se pohnulo“. Tráva při posunu kamery mění jas málo,
# nepřátelé, střely a čísla poškození hodně.
PRAH_ZMENY = 40
# Kolik sekund kolem otevřeného okna se do GIFu nebere (okno se zavírá s animací, hra se po něm rozbíhá).
OKRAJ_PRED = 0.6
OKRAJ_PO = 1.0
# Pokusy o GIF od nejhezčího: (snímků za sekundu, barev, díl délky). Bere se první, který se vejde do limitu.
POKUSY_GIF = [
    (15, 128, 1.0), (15, 96, 1.0), (12, 96, 1.0), (12, 64, 1.0),
    (12, 64, 0.8), (10, 64, 0.8), (10, 48, 0.7), (8, 48, 0.6),
]


# ---------------------------------------------------------------------------------------------
# Natáčení


class TichyServer(SimpleHTTPRequestHandler):
    """Statický server repa bez výpisu každého požadavku."""

    def log_message(self, *args):  # noqa: D401 - tichý server
        pass


@contextlib.contextmanager
def lokalni_server(koren: Path):
    """Pustí hru na volném portu 127.0.0.1 (vlákno na pozadí) a vrátí adresu."""
    obsluha = functools.partial(TichyServer, directory=str(koren))
    server = ThreadingHTTPServer(("127.0.0.1", 0), obsluha)
    vlakno = threading.Thread(target=server.serve_forever, daemon=True)
    vlakno.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/"
    finally:
        server.shutdown()
        server.server_close()


def natoc(args, prace: Path, ffmpeg: str):
    with lokalni_server(KOREN) as adresa:
        prikaz = [
            args.node, str(NATOC), "--url", f"{adresa}?seed={args.seed}", "--vystup", str(prace),
            "--sekund", str(args.sekund), "--ffmpeg", ffmpeg,
        ]
        print(f"Natáčím {args.sekund} s hry (semínko {args.seed}) …", flush=True)
        beh = subprocess.run(prikaz, cwd=KOREN)
        if beh.returncode != 0:
            sys.exit(f"natoc.mjs skončil s kódem {beh.returncode}")


# ---------------------------------------------------------------------------------------------
# Výběr úseku


def orez_kolem_hrdiny(osa: dict, max_sirka: int, pomer: float) -> tuple[int, int, int, int]:
    """Největší výřez se středem na hrdinovi (střed obrazovky), který nezasahuje do lišty, výbavy ani nápovědy
    a vejde se do bezeztrátově natočeného středu. Souřadnice jsou v celé obrazovce."""
    sirka, vyska = osa["sirka"], osa["vyska"]
    stred = osa.get("stred") or {"x": 0, "y": 0, "w": sirka, "h": vyska}
    prekazky = [(o["x"] - 6, o["y"] - 6, o["x"] + o["w"] + 6, o["y"] + o["h"] + 6) for o in osa.get("oblasti", {}).values()]
    for w in range(min(max_sirka, stred["w"]) // 8 * 8, 159, -8):
        h = int(round(w / pomer / 2)) * 2
        x, y = sirka // 2 - w // 2, vyska // 2 - h // 2
        if x < stred["x"] or y < stred["y"] or x + w > stred["x"] + stred["w"] or y + h > stred["y"] + stred["h"]:
            continue
        if all(x + w <= p[0] or x >= p[2] or y + h <= p[1] or y >= p[3] for p in prekazky):
            return x, y, w, h
    sys.exit("Kolem hrdiny není místo bez lišty a výbavy (zkus větší okno, --sirka/--vyska v natoc.mjs).")


def zmeny_mezi_snimky(ffmpeg: str, video: Path, orez) -> tuple[list[float], list[bool]]:
    """Pro každý snímek videa podíl pixelů výřezu, které se proti minulému výrazně změnily, a jestli je snímek
    stejný jako minulý (prohlížeč chvíli nekreslil, v GIFu by to cuklo)."""
    x, y, w, h = orez
    mw, mh = w // ZMENSENI, h // ZMENSENI
    prikaz = [
        ffmpeg, "-v", "error", "-i", str(video),
        "-vf", f"crop={w}:{h}:{x}:{y},fps={FPS_ROZBORU},scale={mw}:{mh}:flags=area,format=gray",
        "-f", "rawvideo", "pipe:1",
    ]
    data = subprocess.run(prikaz, capture_output=True, check=True).stdout
    velikost = mw * mh
    snimky = [Image.frombytes("L", (mw, mh), data[i:i + velikost]) for i in range(0, len(data) - velikost + 1, velikost)]
    skore, stejny = [0.0], [False]
    for minuly, snimek in zip(snimky, snimky[1:]):
        histogram = ImageChops.difference(minuly, snimek).histogram()
        skore.append(sum(histogram[PRAH_ZMENY + 1:]) / velikost)
        stejny.append(histogram[0] == velikost)
    return skore, stejny


def spatne_useky(osa: dict) -> list[tuple[float, float]]:
    """Časy videa, které do GIFu nepatří: menu, okna (úroveň, výbava, kupec, pauza, konec) a chvíle kolem nich."""
    useky = []
    vzorky = osa["vzorky"]
    for i, (t, okno, *_zbytek) in enumerate(vzorky):
        if okno is None:
            continue
        dalsi = vzorky[i + 1][0] if i + 1 < len(vzorky) else osa.get("konec", t)
        useky.append((t - OKRAJ_PRED, dalsi + OKRAJ_PO))
    start = next((u["t"] for u in osa["udalosti"] if u["typ"] == "start"), 0.0)
    useky.append((-1.0, start + OKRAJ_PO))
    useky.append((osa.get("konec", vzorky[-1][0] if vzorky else 0.0), float("inf")))
    sloucene = []
    for od, do in sorted(useky):
        if sloucene and od <= sloucene[-1][1]:
            sloucene[-1] = (sloucene[-1][0], max(sloucene[-1][1], do))
        else:
            sloucene.append((od, do))
    return sloucene


def vyber_usek(skore: list[float], stejny: list[bool], spatne, delka: float) -> tuple[float, float]:
    """Začátek úseku dlouhého delka s, kde se nejvíc děje, není v něm žádné okno a hra v něm necukne (dva a víc
    stejných snímků po sobě). Když takový není, cuknutí se připustí. Vrátí (začátek, průměrné skóre)."""
    platny = [not any(od <= i / FPS_ROZBORU <= do for od, do in spatne) for i in range(len(skore))]
    cuk = [stejny[i] and (stejny[i - 1] or (i + 1 < len(stejny) and stejny[i + 1])) for i in range(len(stejny))]
    usek = nejlepsi_okno(skore, [p and not c for p, c in zip(platny, cuk)], delka)
    if usek is None:
        usek = nejlepsi_okno(skore, platny, delka)
        if usek is None:
            sys.exit(f"Ve videu není {delka} s hry bez oken (natoč déle, --sekund).")
        print("Pozor: každý úsek bez oken má cuknutí (prohlížeč chvíli nekreslil), GIF jedno mít bude.", file=sys.stderr)
    return usek


def nejlepsi_okno(skore: list[float], platny: list[bool], delka: float):
    n = int(round(delka * FPS_ROZBORU))
    nejlepsi, nej_soucet = None, -1.0
    soucet, spatnych = 0.0, 0
    for i in range(len(skore)):
        soucet += skore[i]
        spatnych += not platny[i]
        if i >= n:
            soucet -= skore[i - n]
            spatnych -= not platny[i - n]
        if i >= n - 1 and spatnych == 0 and soucet > nej_soucet:
            nejlepsi, nej_soucet = i - n + 1, soucet
    return None if nejlepsi is None else (nejlepsi / FPS_ROZBORU, nej_soucet / n)


def akce_kolem(skore: list[float], t: float) -> float:
    """Průměrná změna mezi snímky 1,5 s před fotkou a půl sekundy po ní."""
    od = max(0, int((t - 1.5) * FPS_ROZBORU))
    do = min(len(skore), int((t + 0.5) * FPS_ROZBORU) + 1)
    return sum(skore[od:do]) / max(1, do - od)


# ---------------------------------------------------------------------------------------------
# Výstup


def udelej_gif(ffmpeg: str, video: Path, zacatek: float, delka: float, orez, cil: Path, limit: int, prace: Path) -> dict:
    """GIF z úseku videa: výřez kolem hrdiny, vlastní paleta, bez rozptylu barev (pixel art zůstane ostrý)."""
    x, y, w, h = orez
    pokus = prace / "pokus.gif"
    for fps, barev, dil in POKUSY_GIF:
        trvani = round(delka * dil, 2)
        filtr = (
            f"crop={w}:{h}:{x}:{y},fps={fps},split[a][b];"
            f"[a]palettegen=max_colors={barev}:stats_mode=diff[p];"
            f"[b][p]paletteuse=dither=none:diff_mode=rectangle"
        )
        prikaz = [ffmpeg, "-v", "error", "-y", "-ss", f"{zacatek:.2f}", "-t", f"{trvani:.2f}", "-i", str(video),
                  "-filter_complex", filtr, "-loop", "0", str(pokus)]
        subprocess.run(prikaz, check=True)
        bajtu = pokus.stat().st_size
        print(f"  GIF {w}×{h}, {fps} fps, {barev} barev, {trvani} s: {bajtu / 1e6:.2f} MB", flush=True)
        if bajtu <= limit:
            shutil.move(str(pokus), cil)
            return {"sirka": w, "vyska": h, "fps": fps, "barev": barev, "sekund": trvani, "bajtu": bajtu}
    sys.exit(f"GIF se nevešel do {limit / 1e6:.1f} MB ani v nejmenší variantě (zkus kratší --delka).")


def uloz_png(zdroj: Path, cil: Path) -> dict:
    """Screenshot jako optimalizované PNG. Když 256 barev bez rozptylu vypadá skoro stejně, uloží paletové."""
    obr = Image.open(zdroj).convert("RGB")
    paleta = obr.quantize(colors=256, method=RYCHLY_OKTALOVY, dither=BEZ_ROZPTYLU)
    rozdil = ImageChops.difference(obr, paleta.convert("RGB")).convert("L")
    odchylka = sum(i * n for i, n in enumerate(rozdil.histogram())) / (obr.width * obr.height)
    vysledek = paleta if odchylka < 2.0 else obr
    vysledek.save(cil, optimize=True)
    return {"sirka": obr.width, "vyska": obr.height, "bajtu": cil.stat().st_size, "paleta": vysledek is paleta}


def otisk_kodu() -> str:
    """Otisk kódu hry, ze kterého ukázky jsou (src/*.js, style.css a index.html)."""
    h = hashlib.sha1()
    for soubor in sorted((KOREN / "src").glob("*.js")) + [KOREN / "style.css", KOREN / "index.html"]:
        h.update(soubor.name.encode())
        h.update(soubor.read_bytes())
    return h.hexdigest()[:8]


def zpracuj(args, natoceni: Path, ffmpeg: str):
    osa = json.loads((natoceni / "osa.json").read_text(encoding="utf-8"))
    if not osa.get("hacek"):
        print("Pozor: bot neviděl stav hry (háček v main.js nezabral), chodil jen v kruhu.", file=sys.stderr)
    if osa.get("chyby"):
        print(f"Pozor: stránka hlásila {len(osa['chyby'])} chyb, první: {osa['chyby'][0]}", file=sys.stderr)

    orez = orez_kolem_hrdiny(osa, args.max_sirka, args.pomer)
    print(f"Výřez kolem hrdiny: {orez[2]}×{orez[3]} (x {orez[0]}, y {orez[1]}). Počítám změny mezi snímky …", flush=True)
    # GIF i rozbor jdou z bezeztrátového středu (stred.mkv), výřez se do něj jen posune.
    video = natoceni / "stred.mkv"
    if video.exists() and osa.get("stred"):
        orez_videa = (orez[0] - osa["stred"]["x"], orez[1] - osa["stred"]["y"], orez[2], orez[3])
    else:
        video, orez_videa = natoceni / "video.mkv", orez
    skore, stejny = zmeny_mezi_snimky(ffmpeg, video, orez_videa)
    spatne = spatne_useky(osa)
    zacatek, prumer = vyber_usek(skore, stejny, spatne, args.delka)
    print(f"Nejakčnější úsek: {zacatek:.1f}–{zacatek + args.delka:.1f} s videa (změna {prumer:.1%} výřezu za snímek).")

    vystup = args.vystup
    vystup.mkdir(parents=True, exist_ok=True)
    limit = int(args.max_mb * 1_000_000)
    gif = udelej_gif(ffmpeg, video, zacatek, args.delka, orez_videa, vystup / "hra.gif", limit, natoceni)

    fotky = {}
    menu = natoceni / "menu.png"
    if menu.exists():
        fotky["menu"] = uloz_png(menu, vystup / "menu.png")
    boje = [s for s in osa["snimky"] if s["druh"] == "boj" and not any(od <= s["t"] <= do for od, do in spatne)]
    if boje:
        nej = max(boje, key=lambda s: akce_kolem(skore, s["t"]))
        fotky["boj"] = uloz_png(natoceni / nej["soubor"], vystup / "boj.png")
        fotky["boj"]["cas_hry"] = nej.get("cas")
    uroven = next((s for s in osa["snimky"] if s["druh"] == "uroven"), None)
    if uroven:
        fotky["uroven"] = uloz_png(natoceni / uroven["soubor"], vystup / "uroven.png")
        fotky["uroven"]["uroven"] = uroven.get("uroven")
    for chybi in {"menu", "boj", "uroven"} - fotky.keys():
        print(f"Pozor: fotka {chybi} nevznikla, ve {vystup} zůstává stará.", file=sys.stderr)

    cas_hry = [v[2] for v in osa["vzorky"] if zacatek <= v[0] <= zacatek + args.delka]
    info = {
        "otisk_kodu": otisk_kodu(),
        "seminko": args.seed,
        "natoceno_s": round(osa.get("delkaVidea", osa.get("konec", 0)), 1),
        "her": osa.get("her", 1),
        "usek_videa_s": [round(zacatek, 1), round(zacatek + gif["sekund"], 1)],
        "cas_hry": [cas_hry[0], cas_hry[-1]] if cas_hry else None,
        "zmena_za_snimek": round(prumer, 4),
        "orez": dict(zip(("x", "y", "sirka", "vyska"), orez)),
        "gif": gif,
        "fotky": fotky,
    }
    (vystup / "ukazky.json").write_text(json.dumps(info, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Hotovo: {vystup / 'hra.gif'} ({gif['bajtu'] / 1e6:.2f} MB), "
          + ", ".join(f"{k}.png {v['bajtu'] / 1e3:.0f} kB" for k, v in sorted(fotky.items())))


def main():
    parser = argparse.ArgumentParser(description="Ukázky RuGee: natočí hru botem a udělá GIF a screenshoty do docs/ukazky.")
    parser.add_argument("--sekund", type=int, default=230, help="jak dlouho bot hraje (230 s stihne prvního bosse)")
    parser.add_argument("--seed", type=int, default=1, help="semínko vln (?seed= v adrese hry, 1)")
    parser.add_argument("--delka", type=float, default=6.0, help="délka GIFu v sekundách (6)")
    parser.add_argument("--max-mb", type=float, default=4.0, dest="max_mb", help="nejvyšší velikost GIFu v MB (4)")
    parser.add_argument("--max-sirka", type=int, default=560, dest="max_sirka", help="nejširší výřez GIFu v px (560)")
    parser.add_argument("--pomer", type=float, default=1.6, help="poměr stran výřezu (1.6 = 16:10)")
    parser.add_argument("--vystup", type=Path, default=KOREN / "docs" / "ukazky", help="kam uložit (docs/ukazky)")
    parser.add_argument("--prace", type=Path, help="složka pro natočení, která zůstane (jinak dočasná)")
    parser.add_argument("--z-natoceni", type=Path, dest="z_natoceni", help="nenatáčet, vzít video a fotky z této složky")
    parser.add_argument("--node", default=os.environ.get("NODE", "node"), help="příkaz pro Node (node)")
    parser.add_argument("--ffmpeg", default=os.environ.get("FFMPEG", "ffmpeg"), help="příkaz pro ffmpeg (ffmpeg)")
    args = parser.parse_args()

    ffmpeg = shutil.which(args.ffmpeg)
    if not ffmpeg:
        sys.exit(f"Nenašel jsem ffmpeg ({args.ffmpeg}). Nainstaluj ho nebo dej cestu přes --ffmpeg.")
    if args.z_natoceni:
        zpracuj(args, args.z_natoceni, ffmpeg)
        return
    if not shutil.which(args.node):
        sys.exit(f"Nenašel jsem Node ({args.node}).")
    if args.prace:
        args.prace.mkdir(parents=True, exist_ok=True)
        natoc(args, args.prace.resolve(), ffmpeg)
        zpracuj(args, args.prace.resolve(), ffmpeg)
        return
    with tempfile.TemporaryDirectory(prefix="rugee-ukazky-") as docasna:
        natoc(args, Path(docasna), ffmpeg)
        zpracuj(args, Path(docasna), ffmpeg)


if __name__ == "__main__":
    main()
