"""Imágenes y clip de bienvenida de la cuenta oficial @agora (opción b de Adam, 28-10-2026).

Se dibujan por código con la marca: sin personas ni fotos de terceros, y el clip ya sale a
1080×1920, así que no hay nada que reescalar. Correr una vez y commitear el resultado:

    python scripts/bienvenida/generar.py

Requiere Pillow, numpy y ffmpeg en el PATH. Lo publica `publicar.py`.
"""
import pathlib
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = pathlib.Path(__file__).parent
RAIZ = AQUI.parent.parent
SALIDA = AQUI / 'media'
FUENTES = RAIZ / 'apps' / 'mobile-native' / 'android' / 'app' / 'src' / 'main' / 'res' / 'font'
ICONO = RAIZ / 'docs' / 'tienda' / 'graficos' / 'icono-1024.png'

# Tokens del diseño D (docs/diseno-d.md §2).
NARANJA = (227, 82, 5)
NARANJA_OSCURO = (196, 68, 4)
NARANJA_SUAVE = (253, 232, 220)
NARANJA_TINTA = (154, 53, 3)
FONDO = (244, 242, 239)
SUPERFICIE = (255, 255, 255)
TINTA = (20, 17, 15)
TINTA_MEDIA = (107, 98, 91)
BORDE = (230, 225, 219)
OSCURO = (20, 17, 15)


def fuente(nombre, tam):
    return ImageFont.truetype(str(FUENTES / f'{nombre}.ttf'), tam)


def degradado(ancho, alto, arriba, abajo):
    t = np.linspace(0, 1, alto)[:, None, None]
    capa = np.array(arriba, float)[None, None, :] * (1 - t) + np.array(abajo, float)[None, None, :] * t
    return Image.fromarray(np.repeat(capa, ancho, axis=1).astype(np.uint8))


def icono(tam):
    img = Image.open(ICONO).convert('RGBA').resize((tam, tam), Image.LANCZOS)
    mascara = Image.new('L', (tam, tam), 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, tam - 1, tam - 1), radius=int(tam * 0.23), fill=255)
    img.putalpha(mascara)
    return img


def con_sombra(base, capa, pos, desenfoque=24, opacidad=70):
    sombra = Image.new('RGBA', base.size, (0, 0, 0, 0))
    alfa = capa.split()[3].point(lambda a: a * opacidad // 255)
    negra = Image.new('RGBA', capa.size, (0, 0, 0, 255))
    negra.putalpha(alfa)
    sombra.paste(negra, (pos[0], pos[1] + 18), negra)
    base.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(desenfoque)))
    base.alpha_composite(capa, pos)


def texto_ajustado(d, xy, texto, letra, color, ancho_max, interlinea=1.18):
    """Escribe en varias líneas sin pasarse de `ancho_max`; devuelve la y donde terminó."""
    x, y = xy
    palabras, linea, lineas = texto.split(), '', []
    for p in palabras:
        prueba = f'{linea} {p}'.strip()
        if d.textlength(prueba, font=letra) <= ancho_max:
            linea = prueba
        else:
            lineas.append(linea)
            linea = p
    if linea:
        lineas.append(linea)
    alto = int(letra.size * interlinea)
    for l in lineas:
        d.text((x, y), l, font=letra, fill=color)
        y += alto
    return y


# --- Fotos (1080×1350, 4:5) -------------------------------------------------------------------

ANCHO, ALTO = 1080, 1350
MARGEN = 96


def bienvenida():
    base = degradado(ANCHO, ALTO, (240, 99, 26), NARANJA_OSCURO).convert('RGBA')
    # Pirámide grande y tenue de fondo, como la del ícono.
    capa = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    # Abajo a la derecha, lejos del texto.
    for i, ancho in enumerate([640, 500, 360, 220]):
        y = ALTO - 40 - (i + 1) * 96
        d.rectangle(((ANCHO - ancho) // 2 + 300, y, (ANCHO + ancho) // 2 + 300, y + 88), fill=(255, 255, 255, 26))
    base.alpha_composite(capa)
    con_sombra(base, icono(260), (MARGEN, 150))
    d = ImageDraw.Draw(base)
    y = texto_ajustado(d, (MARGEN, 500), 'Bienvenida a Ágora', fuente('bricolage_extrabold', 112), (255, 255, 255), ANCHO - 2 * MARGEN, 1.02)
    y = texto_ajustado(d, (MARGEN, y + 36), 'La red del campus, solo con correo @udlap.mx.', fuente('outfit_medium', 50), (255, 231, 214), ANCHO - 2 * MARGEN, 1.25)
    d.text((MARGEN, ALTO - 120), 'udlagora.com', font=fuente('outfit_semibold', 36), fill=(255, 214, 190))
    return base.convert('RGB')


def tarjeta_funciones(numero, titulo, filas):
    base = Image.new('RGBA', (ANCHO, ALTO), FONDO + (255,))
    d = ImageDraw.Draw(base)
    d.text((MARGEN, 110), f'QUÉ HAY EN ÁGORA · {numero}/3', font=fuente('outfit_bold', 32), fill=NARANJA_OSCURO)
    y = texto_ajustado(d, (MARGEN, 168), titulo, fuente('bricolage_extrabold', 92), TINTA, ANCHO - 2 * MARGEN, 1.04)
    y += 46
    alto_fila = 250
    for i, (nombre, nota) in enumerate(filas):
        caja = (MARGEN - 16, y, ANCHO - MARGEN + 16, y + alto_fila - 26)
        d.rounded_rectangle(caja, radius=36, fill=SUPERFICIE, outline=BORDE, width=3)
        cx, cy = caja[0] + 104, (caja[1] + caja[3]) // 2
        d.ellipse((cx - 56, cy - 56, cx + 56, cy + 56), fill=NARANJA_SUAVE)
        num = str(i + 1)
        letra = fuente('bricolage_extrabold', 60)
        d.text((cx - d.textlength(num, font=letra) / 2, cy - 40), num, font=letra, fill=NARANJA_TINTA)
        tx = cx + 100
        d.text((tx, caja[1] + 44), nombre, font=fuente('outfit_semibold', 48), fill=TINTA)
        texto_ajustado(d, (tx, caja[1] + 110), nota, fuente('outfit_regular', 36), TINTA_MEDIA, caja[2] - tx - 40, 1.2)
        y += alto_fila
    return base.convert('RGB')


def reglas():
    base = Image.new('RGBA', (ANCHO, ALTO), OSCURO + (255,))
    d = ImageDraw.Draw(base)
    d.text((MARGEN, 110), 'LAS REGLAS', font=fuente('outfit_bold', 32), fill=(255, 179, 133))
    y = texto_ajustado(d, (MARGEN, 168), 'Cinco líneas rojas', fuente('bricolage_extrabold', 104), (255, 255, 255), ANCHO - 2 * MARGEN, 1.02)
    y += 50
    lineas = [
        'Contenido íntimo sin permiso',
        'Datos personales de otros',
        'Amenazas de violencia',
        'Acoso dirigido',
        'Hacerte pasar por alguien',
    ]
    for i, linea in enumerate(lineas):
        d.rounded_rectangle((MARGEN, y + 8, MARGEN + 76, y + 84), radius=22, fill=NARANJA)
        num = str(i + 1)
        letra = fuente('bricolage_extrabold', 48)
        d.text((MARGEN + 38 - d.textlength(num, font=letra) / 2, y + 18), num, font=letra, fill=(255, 255, 255))
        d.text((MARGEN + 112, y + 16), linea, font=fuente('outfit_semibold', 48), fill=(244, 242, 239))
        y += 124
    y += 20
    texto_ajustado(d, (MARGEN, y), 'Todo lo demás se vale. Las reglas completas están en udlagora.com/reglas.',
                   fuente('outfit_regular', 38), (179, 170, 161), ANCHO - 2 * MARGEN, 1.3)
    return base.convert('RGB')


# --- Clip (1080×1920, 9 s) ---------------------------------------------------------------------

CLIP_ANCHO, CLIP_ALTO, FPS, SEGUNDOS = 1080, 1920, 30, 9
PASOS = ['Revisa tu perfil', 'Contesta la pregunta del día', 'Sube tu primer clip']


def suave(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def clip(destino):
    fondo = degradado(CLIP_ANCHO, CLIP_ALTO, (240, 99, 26), (176, 58, 3)).convert('RGBA')
    ico = icono(300)
    # Zona segura: en Clips el video llena una pantalla más alargada (se recortan ~110 px por lado) y a
    # la derecha van los botones; abajo, el nombre y el texto. Todo va en x 170–830 y y < 1300.
    letra_titulo = fuente('bricolage_extrabold', 112)
    letra_paso = fuente('outfit_semibold', 40)
    letra_num = fuente('bricolage_extrabold', 42)
    proc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{CLIP_ANCHO}x{CLIP_ALTO}',
         '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
         '-movflags', '+faststart', str(destino)],
        stdin=subprocess.PIPE,
    )
    for n in range(FPS * SEGUNDOS):
        t = n / FPS
        cuadro = fondo.copy()
        # Ícono y título ya están en el primer cuadro: la portada que saca el servidor (0.5 s) los lleva.
        escala = 1 + 0.04 * np.sin(t * 1.4)
        tam = int(300 * escala)
        con_sombra(cuadro, ico.resize((tam, tam), Image.LANCZOS), ((CLIP_ANCHO - tam) // 2, 210 - (tam - 300) // 2))
        d = ImageDraw.Draw(cuadro)
        for i, linea in enumerate(['Bienvenida', 'a Ágora']):
            ancho = d.textlength(linea, font=letra_titulo)
            d.text(((CLIP_ANCHO - ancho) / 2, 580 + i * 120), linea, font=letra_titulo, fill=(255, 255, 255))
        for i, paso in enumerate(PASOS):
            a = suave((t - 2.2 - i * 1.4) / 0.6)
            if a <= 0:
                continue
            capa = Image.new('RGBA', cuadro.size, (0, 0, 0, 0))
            dc = ImageDraw.Draw(capa)
            y = 900 + i * 128 + int((1 - a) * 40)
            alfa = int(255 * a)
            dc.rounded_rectangle((170, y, 830, y + 104), radius=36, fill=(255, 255, 255, int(46 * a)))
            dc.ellipse((192, y + 18, 260, y + 86), fill=(255, 255, 255, alfa))
            num = str(i + 1)
            dc.text((226 - dc.textlength(num, font=letra_num) / 2, y + 24), num, font=letra_num, fill=NARANJA_OSCURO + (alfa,))
            dc.text((284, y + 26), paso, font=letra_paso, fill=(255, 255, 255, alfa))
            cuadro.alpha_composite(capa)
        if t > 6.8:
            a = suave((t - 6.8) / 0.6)
            ancho = d.textlength('udlagora.com', font=fuente('outfit_semibold', 42))
            capa = Image.new('RGBA', cuadro.size, (0, 0, 0, 0))
            ImageDraw.Draw(capa).text(((CLIP_ANCHO - ancho) / 2, 1300), 'udlagora.com', font=fuente('outfit_semibold', 42),
                                      fill=(255, 225, 205, int(255 * a)))
            cuadro.alpha_composite(capa)
        proc.stdin.write(cuadro.convert('RGB').tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('ffmpeg falló')


def main():
    SALIDA.mkdir(exist_ok=True)
    bienvenida().save(SALIDA / 'bienvenida.jpg', quality=90, optimize=True)
    tarjeta_funciones(1, 'Tu gente', [
        ('Tu carrera', 'Lo que pasa en tu carrera, primero.'),
        ('Tu generación', 'La gente que entró contigo.'),
        ('Tu colegio', 'Planes y avisos de tu residencia.'),
    ]).save(SALIDA / 'que-hay-1.jpg', quality=90, optimize=True)
    tarjeta_funciones(2, 'Compra, vende y muévete', [
        ('Mercado', 'Libros, muebles y lo que ya no usas.'),
        ('Aventones', 'Comparte coche a Cholula y a Puebla.'),
        ('Directorio', 'Encuentra a alguien de tu carrera.'),
    ]).save(SALIDA / 'que-hay-2.jpg', quality=90, optimize=True)
    tarjeta_funciones(3, 'Lo que pasa hoy', [
        ('Eventos', 'Fiestas, torneos y pláticas del campus.'),
        ('Clips', 'Videos verticales de lo que está pasando.'),
        ('Pregunta del día', 'Contesta a tiempo y compara con tu carrera.'),
    ]).save(SALIDA / 'que-hay-3.jpg', quality=90, optimize=True)
    reglas().save(SALIDA / 'reglas.jpg', quality=90, optimize=True)
    # Foto de perfil: el ícono entero, sin esquinas; las apps la recortan en círculo.
    Image.open(ICONO).convert('RGB').resize((512, 512), Image.LANCZOS).save(SALIDA / 'avatar.jpg', quality=92)
    clip(SALIDA / 'clip-bienvenida.mp4')
    for f in sorted(SALIDA.iterdir()):
        print(f.name, f.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
