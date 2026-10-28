"""Publica el contenido de bienvenida con la cuenta oficial @agora (opción b de Adam, 28-10-2026).

Va por la API como cualquier persona (moderación incluida): foto de perfil, cinco publicaciones
(reglas, qué hay en Ágora, una encuesta, un clip y la bienvenida, que queda arriba) y el evento
«Semana de bienvenida en Ágora». Si @agora ya publicó algo, no repite nada.

    python scripts/bienvenida/publicar.py --api https://udlagora.com/api --cuenta <archivo de secretos>

El archivo de la cuenta lleva `CORREO: …` y `CONTRASEÑA: …` (vive en la carpeta de secretos,
nunca en el repo). Solo usa la biblioteca estándar de Python.
"""
import argparse
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request
import uuid

AQUI = pathlib.Path(__file__).parent
MEDIA = AQUI / 'media'
PLAZA = 'universidad:udlap'
HANDLE = 'agora'

# De la más vieja a la más nueva: la bienvenida queda hasta arriba del inicio.
PUBLICACIONES = [
    {
        'clave': 'reglas',
        'fotos': ['reglas.jpg'],
        'texto': (
            'Ágora tiene cinco líneas rojas: contenido íntimo sin permiso, datos personales de otros, '
            'amenazas, acoso dirigido y hacerte pasar por alguien. Criticar, quejarte del tráfico de la '
            'Recta o de un examen se vale.\n\n'
            'Un filtro automático revisa cada publicación y una persona revisa lo dudoso. Las reglas '
            'completas están en udlagora.com/reglas. #reglas'
        ),
    },
    {
        'clave': 'que-hay',
        'fotos': ['que-hay-1.jpg', 'que-hay-2.jpg', 'que-hay-3.jpg'],
        'texto': (
            'Qué hay en Ágora, en tres fotos: tu gente (tu carrera, tu generación y tu colegio), el '
            'mercado y los aventones, y lo que pasa hoy (eventos, clips y la pregunta del día). Para '
            'entrar hace falta un correo @udlap.mx.'
        ),
    },
    {
        'clave': 'encuesta',
        'fotos': [],
        'texto': 'Una pregunta para arrancar.',
        'encuesta': {
            'pregunta': '¿Qué vas a usar primero en Ágora?',
            'opciones': ['El mercado', 'Los aventones', 'Los eventos', 'Los clips'],
        },
    },
    {
        'clave': 'clip',
        'fotos': ['clip-bienvenida.mp4'],
        'texto': 'Así se ve un clip en Ágora: video vertical, de borde a borde. El tuyo lo subes desde Publicar. #clips',
    },
    {
        'clave': 'bienvenida',
        'fotos': ['bienvenida.jpg'],
        'texto': (
            'Esta es la cuenta del equipo de Ágora. Ágora es la red del campus para quien tiene correo '
            '@udlap.mx: aquí ves lo que pasa en tu carrera, en tu generación y en tu colegio, y lo que '
            'publicas lo ve la UDLAP.\n\n'
            'Para empezar: revisa que tu perfil tenga tu carrera y tu generación, contesta la pregunta '
            'del día y sube tu primer clip desde Publicar.\n\n'
            'Si algo no funciona o se te ocurre algo, escríbelo en los comentarios de esta publicación: '
            'el equipo los lee.\n\n'
            'Ágora no está afiliada a la Universidad de las Américas Puebla. #bienvenida'
        ),
    },
]

EVENTO = {
    'titulo': 'Semana de bienvenida en Ágora',
    'descripcion': (
        'Del 29 de octubre al 7 de noviembre. Estrena Ágora: revisa que tu perfil tenga tu carrera y tu '
        'generación, contesta la pregunta del día y sube tu primer clip. Si algo falla, avísanos en los '
        'comentarios de la publicación de bienvenida de @agora. Es en la app: no hay que ir a ningún lado.'
    ),
    'tipo': 'ORGANIZACION',
    'lugar': 'En Ágora (en línea)',
    # Hora del centro de México (UTC-6, sin horario de verano).
    'inicioAt': '2026-10-29T09:00:00-06:00',
    'finAt': '2026-11-07T20:00:00-06:00',
    'costoMxn': 0,
}

MIME = {'.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4'}


class Api:
    def __init__(self, base):
        self.base = base.rstrip('/')
        self.token = None

    def pedir(self, metodo, ruta, cuerpo=None, tipo='application/json'):
        datos = None
        cabeceras = {'User-Agent': 'AgoraBienvenida/1'}
        if cuerpo is not None:
            datos = cuerpo if isinstance(cuerpo, bytes) else json.dumps(cuerpo).encode()
            cabeceras['Content-Type'] = tipo
        if self.token:
            cabeceras['Authorization'] = f'Bearer {self.token}'
        req = urllib.request.Request(f'{self.base}/{ruta}', data=datos, method=metodo, headers=cabeceras)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                crudo = r.read()
                return json.loads(crudo) if crudo.strip() else None
        except urllib.error.HTTPError as e:
            raise SystemExit(f'{metodo} {ruta} → HTTP {e.code}: {e.read().decode(errors="replace")[:300]}')

    def subir(self, archivo):
        limite = uuid.uuid4().hex
        cuerpo = (
            f'--{limite}\r\nContent-Disposition: form-data; name="archivo"; filename="{archivo.name}"\r\n'
            f'Content-Type: {MIME[archivo.suffix]}\r\n\r\n'
        ).encode() + archivo.read_bytes() + f'\r\n--{limite}--\r\n'.encode()
        return self.pedir('POST', 'media', cuerpo, f'multipart/form-data; boundary={limite}')


def leer_cuenta(ruta):
    datos = {}
    for linea in pathlib.Path(ruta).read_text(encoding='utf-8').splitlines():
        if ':' in linea:
            k, v = linea.split(':', 1)
            datos[k.strip().upper()] = v.strip()
    correo = datos.get('CORREO')
    clave = next((v for k, v in datos.items() if k.startswith('CONTRASE')), None)
    if not correo or not clave:
        raise SystemExit('El archivo de la cuenta necesita CORREO y CONTRASEÑA.')
    return correo, clave


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--api', required=True)
    p.add_argument('--cuenta', required=True)
    p.add_argument('--salida', help='JSON con los ids de lo publicado')
    p.add_argument('--espera-clip', type=int, default=180,
                   help='segundos para esperar la portada del clip (en CI sin ffmpeg no llega)')
    args = p.parse_args()

    api = Api(args.api)
    correo, clave = leer_cuenta(args.cuenta)
    api.token = api.pedir('POST', 'auth/entrar', {'email': correo, 'contrasena': clave, 'modo': 'token', 'recordarme': False})['token']
    print(f'entró como @{HANDLE}')

    previas = api.pedir('GET', f'perfil/{HANDLE}/publicaciones')
    if (previas or {}).get('publicaciones'):
        print(f'@{HANDLE} ya tiene {len(previas["publicaciones"])} publicaciones: no se repite nada.')
        return

    foto = api.subir(MEDIA / 'avatar.jpg')
    api.pedir('PATCH', 'perfil', {'fotoMediaId': foto['id']})
    print('foto de perfil puesta')

    hecho = {'publicaciones': {}, 'evento': None}
    for pub in PUBLICACIONES:
        ids = [api.subir(MEDIA / nombre)['id'] for nombre in pub['fotos']]
        cuerpo = {'comunidadSlug': PLAZA, 'texto': pub['texto'], 'mediaIds': ids}
        if 'encuesta' in pub:
            cuerpo['encuesta'] = pub['encuesta']
        creada = api.pedir('POST', 'posts', cuerpo)
        hecho['publicaciones'][pub['clave']] = creada['id']
        print(f'publicada: {pub["clave"]} ({creada["id"]}, {creada.get("estado", "?")})')
        time.sleep(1.2)  # orden estable por fecha en el feed

    evento = api.pedir('POST', 'eventos', EVENTO)
    hecho['evento'] = evento['id']
    print(f'evento creado ({evento["id"]})')

    # El clip se re-codifica en segundo plano: se espera a que tenga MP4 y portada.
    id_clip = hecho['publicaciones']['clip']
    for _ in range(max(1, args.espera_clip // 3)):
        detalle = api.pedir('GET', f'posts/{id_clip}')
        m = ((detalle.get('media') or detalle.get('publicacion', {}).get('media')) or [{}])[0]
        if m.get('mime') == 'video/mp4' and m.get('thumbUrl'):
            print(f'clip listo: {m.get("ancho")}×{m.get("alto")} con portada')
            break
        time.sleep(3)
    else:
        print('el clip todavía no tiene portada: revisar la cola de video', file=sys.stderr)

    if args.salida:
        pathlib.Path(args.salida).write_text(json.dumps(hecho, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
