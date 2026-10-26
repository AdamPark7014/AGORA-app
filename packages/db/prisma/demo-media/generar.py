"""Fotos y clips de la demo (seed local y capturas de CI). Se dibujan por código: sin personas
reales ni fotos de terceros. Correr una vez y commitear el resultado:

    python packages/db/prisma/demo-media/generar.py

Requiere Pillow, numpy y ffmpeg en el PATH.
"""
import math
import pathlib
import random
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

AQUI = pathlib.Path(__file__).parent
ANCHO, ALTO = 1080, 1350
random.seed(7)


def degradado(ancho, alto, arriba, abajo):
    t = np.linspace(0, 1, alto)[:, None, None]
    a = np.array(arriba, dtype=float)[None, None, :]
    b = np.array(abajo, dtype=float)[None, None, :]
    capa = a * (1 - t) + b * t
    return np.repeat(capa, ancho, axis=1)


def grano(img, fuerza=6):
    arr = np.asarray(img).astype(np.int16)
    ruido = np.random.default_rng(3).integers(-fuerza, fuerza + 1, arr.shape)
    return Image.fromarray(np.clip(arr + ruido, 0, 255).astype(np.uint8))


def sombra(base, caja, radio=30, desplazar=(18, 26), opacidad=90):
    capa = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    x0, y0, x1, y1 = caja
    d.rounded_rectangle((x0 + desplazar[0], y0 + desplazar[1], x1 + desplazar[0], y1 + desplazar[1]), radius=12,
                        fill=(0, 0, 0, opacidad))
    capa = capa.filter(ImageFilter.GaussianBlur(radio))
    base.alpha_composite(capa)


def guardar(img, nombre):
    grano(img.convert('RGB')).save(AQUI / nombre, quality=82, optimize=True, progressive=True)
    print(nombre, (AQUI / nombre).stat().st_size // 1024, 'KB')


def maqueta(nombre, cielo, piso, luz):
    img = Image.fromarray(degradado(ANCHO, ALTO, cielo, piso).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    # Base de cartón de la maqueta.
    d.polygon([(90, 1010), (990, 1010), (1060, 1240), (20, 1240)], fill=(196, 170, 132))
    d.polygon([(20, 1240), (1060, 1240), (1060, 1270), (20, 1270)], fill=(150, 124, 92))
    bloques = [(160, 560, 380, 1040), (400, 720, 560, 1040), (590, 470, 800, 1040), (820, 800, 960, 1040)]
    for x0, y0, x1, y1 in bloques:
        sombra(img, (x0, y0, x1, y1))
        d = ImageDraw.Draw(img)
        d.rectangle((x0, y0, x1, y1), fill=(245, 242, 236))
        d.polygon([(x1, y0), (x1 + 40, y0 - 30), (x1 + 40, y1 - 30), (x1, y1)], fill=(214, 208, 198))
        d.polygon([(x0, y0), (x0 + 40, y0 - 30), (x1 + 40, y0 - 30), (x1, y0)], fill=(255, 253, 248))
        for fy in range(y0 + 40, y1 - 30, 70):
            for fx in range(x0 + 25, x1 - 30, 55):
                d.rectangle((fx, fy, fx + 28, fy + 38), fill=luz)
    # Árboles de esponja.
    for cx in (120, 470, 860, 1000):
        d.ellipse((cx - 36, 960, cx + 36, 1032), fill=(96, 138, 84))
    guardar(img, nombre)


def apuntes():
    img = Image.fromarray(degradado(ANCHO, ALTO, (120, 86, 60), (92, 64, 44)).astype(np.uint8)).convert('RGBA')
    sombra(img, (150, 180, 860, 1120), radio=34)
    d = ImageDraw.Draw(img)
    d.rectangle((150, 180, 860, 1120), fill=(250, 248, 240))
    for y in range(260, 1100, 46):
        d.line((180, y, 830, y), fill=(178, 196, 222), width=2)
    d.line((240, 200, 240, 1110), fill=(226, 130, 130), width=3)
    for i, y in enumerate(range(270, 900, 46)):
        largo = random.randint(260, 560)
        d.line((262, y + 18, 262 + largo, y + 18), fill=(40, 52, 88), width=5)
    # Taza y pluma.
    sombra(img, (780, 900, 1020, 1140), radio=26)
    d = ImageDraw.Draw(img)
    d.ellipse((780, 900, 1020, 1140), fill=(238, 236, 232))
    d.ellipse((805, 925, 995, 1115), fill=(92, 58, 34))
    d.line((120, 1220, 600, 1150), fill=(20, 20, 24), width=18)
    d.line((600, 1150, 640, 1144), fill=(196, 160, 60), width=18)
    guardar(img, 'apuntes.jpg')


def biblioteca():
    img = Image.fromarray(degradado(ANCHO, ALTO, (70, 50, 36), (40, 28, 20)).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    colores = [(150, 42, 38), (36, 72, 120), (198, 152, 60), (52, 104, 74), (120, 70, 120), (222, 214, 196),
               (70, 70, 74), (190, 96, 50)]
    for estante in range(5):
        y1 = 300 + estante * 240
        d.rectangle((40, y1, 1040, y1 + 22), fill=(120, 84, 54))
        x = 60
        while x < 1010:
            ancho = random.randint(26, 58)
            alto = random.randint(150, 205)
            d.rectangle((x, y1 - alto, x + ancho, y1), fill=random.choice(colores))
            d.line((x + 6, y1 - alto + 24, x + ancho - 6, y1 - alto + 24), fill=(235, 220, 180), width=3)
            x += ancho + random.randint(2, 6)
    luz = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(luz).ellipse((260, -300, 1180, 600), fill=(255, 220, 160, 70))
    img.alpha_composite(luz.filter(ImageFilter.GaussianBlur(120)))
    guardar(img, 'biblioteca.jpg')


def objeto(nombre, fondo, dibujar):
    img = Image.fromarray(degradado(ANCHO, ALTO, fondo[0], fondo[1]).astype(np.uint8)).convert('RGBA')
    dibujar(img)
    guardar(img, nombre)


def laptop(img):
    sombra(img, (170, 620, 910, 1060), radio=40)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((230, 300, 850, 700), radius=24, fill=(40, 42, 48))
    d.rectangle((262, 332, 818, 668), fill=(64, 112, 168))
    d.polygon([(170, 720), (910, 720), (980, 860), (100, 860)], fill=(196, 198, 204))
    for fila in range(4):
        for col in range(12):
            x = 210 + col * 56 + fila * 10
            y = 742 + fila * 26
            d.rounded_rectangle((x, y, x + 44, y + 18), radius=4, fill=(150, 152, 160))


def escritorio(img):
    d = ImageDraw.Draw(img)
    d.rectangle((0, 1000, ANCHO, ALTO), fill=(186, 168, 146))
    sombra(img, (140, 560, 940, 1080), radio=40)
    d = ImageDraw.Draw(img)
    d.rectangle((120, 560, 960, 610), fill=(214, 182, 140))
    d.rectangle((150, 610, 190, 1060), fill=(176, 146, 108))
    d.rectangle((890, 610, 930, 1060), fill=(176, 146, 108))
    d.rectangle((600, 610, 880, 860), fill=(198, 168, 128))
    d.line((620, 735, 860, 735), fill=(150, 120, 86), width=4)
    d.ellipse((728, 680, 752, 704), fill=(90, 70, 50))
    d.ellipse((728, 790, 752, 814), fill=(90, 70, 50))
    d.rectangle((300, 380, 330, 560), fill=(60, 60, 64))
    d.polygon([(250, 300), (420, 300), (380, 380), (290, 380)], fill=(236, 210, 120))


# --------------------------------------------------------------------------- videos

def video(nombre, cuadro, segundos=5, fps=30, ancho=720, alto=1280):
    ruta = AQUI / nombre
    proceso = subprocess.Popen(
        ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{ancho}x{alto}',
         '-r', str(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p',
         '-movflags', '+faststart', '-an', str(ruta)],
        stdin=subprocess.PIPE,
    )
    total = segundos * fps
    for i in range(total):
        img = cuadro(i / total, ancho, alto).convert('RGB')
        proceso.stdin.write(img.tobytes())
    proceso.stdin.close()
    proceso.wait()
    print(nombre, ruta.stat().st_size // 1024, 'KB')


def cuadro_amanecer(t, ancho, alto):
    cielo = degradado(ancho, alto, (36, 40, 92), (250, 150, 90))
    img = Image.fromarray(cielo.astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    sol_y = 760 - t * 160
    brillo = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(brillo).ellipse((ancho / 2 - 260, sol_y - 260, ancho / 2 + 260, sol_y + 260), fill=(255, 200, 120, 120))
    img.alpha_composite(brillo.filter(ImageFilter.GaussianBlur(60)))
    d = ImageDraw.Draw(img)
    d.ellipse((ancho / 2 - 90, sol_y - 90, ancho / 2 + 90, sol_y + 90), fill=(255, 226, 160))
    # Volcán al fondo y la recta.
    d.polygon([(0, 820), (200, 760), (330, 640), (420, 640), (560, 760), (ancho, 800), (ancho, alto), (0, alto)],
              fill=(52, 46, 70))
    d.polygon([(ancho / 2 - 18, 820), (ancho / 2 + 18, 820), (ancho, alto), (0, alto)], fill=(46, 44, 50))
    for k in range(8):
        f = ((k / 8) + t) % 1
        y = 830 + (f ** 2) * (alto - 830)
        largo = 8 + f * 90
        grosor = 2 + f * 14
        d.line((ancho / 2, y, ancho / 2, y + largo), fill=(240, 220, 150), width=int(grosor))
    # Árboles a los lados que se acercan.
    for k in range(6):
        f = ((k / 6) + t * 1.2) % 1
        y = 820 + (f ** 2) * (alto - 700)
        escala = 0.2 + f * 2.2
        for lado in (-1, 1):
            x = ancho / 2 + lado * (60 + f * 520)
            d.polygon([(x, y - 160 * escala), (x - 50 * escala, y), (x + 50 * escala, y)], fill=(28, 36, 34))
    return img


def cuadro_cancha(t, ancho, alto):
    img = Image.fromarray(degradado(ancho, alto, (58, 128, 66), (36, 96, 48)).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    for k in range(8):
        if k % 2:
            d.rectangle((0, k * alto / 8, ancho, (k + 1) * alto / 8), fill=(64, 136, 72))
    d.rectangle((60, 120, ancho - 60, alto - 120), outline=(240, 245, 236), width=8)
    d.line((60, alto / 2, ancho - 60, alto / 2), fill=(240, 245, 236), width=8)
    d.ellipse((ancho / 2 - 130, alto / 2 - 130, ancho / 2 + 130, alto / 2 + 130), outline=(240, 245, 236), width=8)
    d.rectangle((ancho / 2 - 170, 120, ancho / 2 + 170, 300), outline=(240, 245, 236), width=8)
    d.rectangle((ancho / 2 - 90, 70, ancho / 2 + 90, 120), outline=(255, 255, 255), width=10)
    # Balón que va hacia la portería.
    x = ancho / 2 + math.sin(t * math.pi * 2) * 160
    y = alto - 260 - t * (alto - 520)
    r = 30 - t * 10
    sombra_balon = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra_balon).ellipse((x - r + 14, y - r * 0.4 + 30, x + r + 14, y + r * 0.4 + 30), fill=(0, 0, 0, 90))
    img.alpha_composite(sombra_balon.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(img)
    d.ellipse((x - r, y - r, x + r, y + r), fill=(250, 250, 248), outline=(30, 30, 30), width=3)
    d.regular_polygon((x, y, r * 0.42), 5, rotation=t * 720, fill=(30, 30, 30))
    return img


def cuadro_robot(t, ancho, alto):
    img = Image.fromarray(degradado(ancho, alto, (26, 30, 38), (12, 14, 18)).astype(np.uint8)).convert('RGBA')
    luz = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(luz).ellipse((80, 300, 640, 900), fill=(90, 140, 220, 60))
    img.alpha_composite(luz.filter(ImageFilter.GaussianBlur(90)))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 1000, ancho, alto), fill=(40, 42, 48))
    base = (ancho / 2, 980)
    d.rounded_rectangle((base[0] - 110, 960, base[0] + 110, 1020), radius=18, fill=(70, 74, 84))
    a1 = -math.pi / 2 + math.sin(t * math.pi * 2) * 0.5
    a2 = a1 + 0.9 + math.sin(t * math.pi * 4) * 0.4
    a3 = a2 - 0.8 + math.cos(t * math.pi * 2) * 0.5
    puntos = [base]
    for ang, largo in ((a1, 300), (a2, 240), (a3, 140)):
        x0, y0 = puntos[-1]
        puntos.append((x0 + math.cos(ang) * largo, y0 + math.sin(ang) * largo))
    for (x0, y0), (x1, y1) in zip(puntos, puntos[1:]):
        d.line((x0, y0, x1, y1), fill=(232, 120, 40), width=46)
        d.line((x0, y0, x1, y1), fill=(250, 160, 90), width=14)
    for x, y in puntos[:-1]:
        d.ellipse((x - 34, y - 34, x + 34, y + 34), fill=(60, 64, 74), outline=(150, 156, 170), width=6)
    x, y = puntos[-1]
    abre = 18 + math.sin(t * math.pi * 6) * 12
    d.line((x, y, x + 30, y - abre), fill=(190, 196, 206), width=12)
    d.line((x, y, x + 30, y + abre), fill=(190, 196, 206), width=12)
    return img


if __name__ == '__main__':
    maqueta('maqueta.jpg', (196, 214, 232), (238, 232, 222), (120, 160, 200))
    maqueta('maqueta-detalle.jpg', (232, 220, 204), (226, 214, 196), (226, 170, 90))
    maqueta('maqueta-noche.jpg', (24, 30, 58), (62, 58, 70), (255, 214, 120))
    apuntes()
    biblioteca()
    objeto('laptop.jpg', ((236, 232, 226), (210, 204, 196)), laptop)
    objeto('escritorio.jpg', ((232, 226, 216), (214, 206, 194)), escritorio)
    video('clip-amanecer.mp4', cuadro_amanecer)
    video('clip-cancha.mp4', cuadro_cancha)
    video('clip-robot.mp4', cuadro_robot)
