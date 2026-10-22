"""Gráfico de funciones de Google Play (1024 × 500).

    py -3 scripts/tienda/grafico-funciones.py [salida.png]

El degradado naranja del ícono, la pirámide a la izquierda, y a la derecha la marca y la frase de la landing
(«Tu red en el campus»). Sin capturas encimadas ni texto en la franja central inferior, donde Play pone el botón
de reproducir si hay video. Por omisión escribe `docs/tienda/graficos/grafico-funciones-1024x500.png`.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from marca import BLANCO, GRAFICOS, degradado, fuente, icono_redondeado, partir_lineas  # noqa: E402

ANCHO, ALTO = 1024, 500
FRASE = "Tu red en el campus"
NOMBRE = "Ágora"
PIE = "Solo con correo @udlap.mx"


def main() -> None:
    salida = Path(sys.argv[1]) if len(sys.argv) > 1 else GRAFICOS / "grafico-funciones-1024x500.png"
    lienzo = degradado(ANCHO, ALTO, diagonal=True).convert("RGBA")

    # Gradas suaves al fondo, a la derecha: eco de la pirámide sin competir con el ícono.
    capa = Image.new("RGBA", (ANCHO * 2, ALTO * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    base_y, alto_grada, centro = 1000, 96, 1660
    for i, ancho in enumerate([760, 600, 440, 280]):
        x0 = centro - ancho // 2
        y0 = base_y - alto_grada * (i + 1)
        d.rounded_rectangle((x0, y0, x0 + ancho, y0 + alto_grada), 16, fill=(255, 255, 255, 14))
    lienzo.alpha_composite(capa.resize((ANCHO, ALTO), Image.Resampling.LANCZOS))

    icono = icono_redondeado(248)
    margen = 76
    pos = (margen, (ALTO - icono.height) // 2)
    sombra = Image.new("RGBA", (ANCHO, ALTO), (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle(
        (pos[0] + 6, pos[1] + 18, pos[0] + icono.width - 6, pos[1] + icono.height + 10), 56, fill=(110, 30, 0, 120)
    )
    lienzo.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(18)))
    # Aro blanco fino: separa el ícono naranja del fondo naranja.
    aro = Image.new("RGBA", (ANCHO, ALTO), (0, 0, 0, 0))
    ImageDraw.Draw(aro).rounded_rectangle(
        (pos[0] - 3, pos[1] - 3, pos[0] + icono.width + 2, pos[1] + icono.height + 2), 60, outline=(255, 255, 255, 120), width=3
    )
    lienzo.alpha_composite(aro)
    lienzo.alpha_composite(icono, pos)

    dibujo = ImageDraw.Draw(lienzo)
    x = margen + icono.width + 58
    ancho_texto = ANCHO - x - margen
    marca = fuente(40, "Bold")
    titulo = fuente(76, "ExtraBold")
    pie = fuente(28, "Medium")
    lineas = partir_lineas(FRASE, titulo, ancho_texto)
    alto_linea = 86
    alto_bloque = 44 + 18 + alto_linea * len(lineas) + 22 + 30
    y = (ALTO - alto_bloque) // 2
    dibujo.text((x, y), NOMBRE, font=marca, fill=(*BLANCO, 235))
    y += 44 + 18
    for linea in lineas:
        dibujo.text((x, y), linea, font=titulo, fill=BLANCO)
        y += alto_linea
    y += 22
    dibujo.text((x, y), PIE, font=pie, fill=(*BLANCO, 215))

    salida.parent.mkdir(parents=True, exist_ok=True)
    lienzo.convert("RGB").save(salida, optimize=True)
    print(f"escrito {salida} ({ANCHO}×{ALTO}, {salida.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
