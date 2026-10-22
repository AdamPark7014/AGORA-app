#!/usr/bin/env python3
"""API falsa para las pruebas de interfaz de iOS (ios.yml → pruebas-ui).

Responde como la API de Ágora en lo que usa la puerta de entrada, sin base de
datos ni correos: así XCUITest prueba que cada botón dispara su petición y que
la pantalla muestra lo que contesta el servidor. Cada petición queda en el log
(una línea "METODO /ruta") para que el flujo compruebe que llegaron.

Uso: python3 api-falsa.py [puerto]   (8765 por omisión)
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ENVIO = "2d1b6a1e-6a3e-4c2b-9b1e-1f2a3b4c5d6e"
ENTRADA_INVALIDA = (
    "Correo o contraseña incorrectos. Si es tu primera vez o aún no tienes "
    "contraseña, entra con un código a tu correo."
)


class Manejador(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _responder(self, estado, cuerpo=None, cabeceras=None):
        datos = b"" if cuerpo is None else json.dumps(cuerpo).encode("utf-8")
        self.send_response(estado)
        for k, v in (cabeceras or {}).items():
            self.send_header(k, v)
        if cuerpo is not None:
            self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        if datos:
            self.wfile.write(datos)

    def _leer(self):
        largo = int(self.headers.get("Content-Length") or 0)
        crudo = self.rfile.read(largo) if largo else b""
        try:
            return json.loads(crudo or b"{}")
        except ValueError:
            return {}

    def log_message(self, formato, *args):  # silencio el log por defecto
        pass

    def do_GET(self):
        print(f"GET {self.path}", flush=True)
        if self.path.startswith("/api/auth/otp/entrega/"):
            return self._responder(200, {"estado": "entregado"})
        return self._responder(404, {"mensaje": "No existe en la API falsa."})

    def do_POST(self):
        cuerpo = self._leer()
        print(f"POST {self.path} {sorted(cuerpo.keys())}", flush=True)
        if self.path in ("/api/auth/otp/solicitar", "/api/auth/otp/personal/solicitar"):
            return self._responder(204, None, {"X-Envio-Id": ENVIO})
        if self.path in ("/api/auth/otp/verificar", "/api/auth/otp/personal/verificar"):
            return self._responder(401, {"mensaje": "Codigo invalido o vencido."})
        if self.path == "/api/auth/entrar":
            return self._responder(401, {"mensaje": ENTRADA_INVALIDA})
        return self._responder(404, {"mensaje": "No existe en la API falsa."})


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"API falsa en 127.0.0.1:{puerto}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", puerto), Manejador).serve_forever()
