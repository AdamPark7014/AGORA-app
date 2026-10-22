"""Íconos de tienda a sangre, sin transparencia en el fondo.

    py -3 scripts/tienda/iconos-tienda.py [--verificar]

- `docs/tienda/graficos/icono-512.png`: Google Play (PNG de 32 bits, 512 × 512, alfa opaco en todo el lienzo).
- `docs/tienda/graficos/icono-1024.png`: App Store (PNG RGB de 1024 × 1024, sin canal alfa: ITMS-90717).

Salen del AppIcon de iOS que escribe `scripts/generar-icono.mjs` (la pirámide «Mono»).
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from marca import GRAFICOS, icono_cuadrado  # noqa: E402


def verificar() -> list[str]:
    fallas: list[str] = []
    play = Image.open(GRAFICOS / "icono-512.png")
    if play.size != (512, 512):
        fallas.append(f"icono-512.png mide {play.size}, no 512×512")
    if play.mode != "RGBA":
        fallas.append(f"icono-512.png es {play.mode}; Play pide PNG de 32 bits (RGBA)")
    elif play.getchannel("A").getextrema() != (255, 255):
        fallas.append("icono-512.png tiene píxeles transparentes; Play lo quiere a sangre")
    if (GRAFICOS / "icono-512.png").stat().st_size > 1024 * 1024:
        fallas.append("icono-512.png pesa más de 1 MB")
    ios = Image.open(GRAFICOS / "icono-1024.png")
    if ios.size != (1024, 1024):
        fallas.append(f"icono-1024.png mide {ios.size}, no 1024×1024")
    if ios.mode != "RGB":
        fallas.append(f"icono-1024.png es {ios.mode}; App Store exige PNG sin canal alfa (ITMS-90717)")
    return fallas


def main() -> None:
    if "--verificar" not in sys.argv:
        GRAFICOS.mkdir(parents=True, exist_ok=True)
        base = icono_cuadrado(1024)
        base.save(GRAFICOS / "icono-1024.png", optimize=True)
        base.resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA").save(GRAFICOS / "icono-512.png", optimize=True)
        print("escritos docs/tienda/graficos/icono-1024.png (RGB) e icono-512.png (RGBA opaco)")
    fallas = verificar()
    for f in fallas:
        print(f"FALLA: {f}")
    if fallas:
        sys.exit(1)
    print("íconos de tienda: ok (512 RGBA opaco, 1024 RGB sin alfa)")


if __name__ == "__main__":
    main()
