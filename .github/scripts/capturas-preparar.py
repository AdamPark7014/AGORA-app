#!/usr/bin/env python3
"""Deja lista la cuenta de demo para las capturas de iOS (ios-capturas.yml).

Corre contra la API local del CI, nunca contra produccion: entra con el
codigo maestro de desarrollo, le pone una contrasena de un solo uso a la
cuenta de demo (la prueba de interfaz entra con ella) y busca los ids que
necesitan los enlaces profundos (el evento y la conversacion del seed).
Escribe las variables en $GITHUB_ENV con el prefijo TEST_RUNNER_, que
xcodebuild pasa al proceso de las pruebas.
"""

from __future__ import annotations

import json
import os
import secrets
import sys
import urllib.error
import urllib.request

API = os.environ.get("API_LOCAL", "http://127.0.0.1:4200/api")
CORREO = os.environ.get("DEMO_CORREO", "prueba.uno@udlap.mx")
MAESTRO = os.environ["DEV_OTP_MAESTRO"]
EVENTO = os.environ.get("DEMO_EVENTO", "Fiesta de fin de parciales")
PERFIL = os.environ.get("DEMO_PERFIL", "diego.tr")

if not API.startswith("http://127.0.0.1") and not API.startswith("http://localhost"):
    sys.exit("Solo contra la API local del CI.")


def pedir(metodo: str, ruta: str, cuerpo: dict | None = None, token: str | None = None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(API + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            crudo = resp.read().decode()
    except urllib.error.HTTPError as exc:
        sys.exit(f"{metodo} {ruta} -> HTTP {exc.code}: {exc.read().decode(errors='replace')[:300]}")
    return json.loads(crudo) if crudo.strip() else None


def objetos(nodo):
    """Todos los diccionarios del JSON, en orden de aparicion."""
    if isinstance(nodo, dict):
        yield nodo
        for valor in nodo.values():
            yield from objetos(valor)
    elif isinstance(nodo, list):
        for valor in nodo:
            yield from objetos(valor)


pedir("POST", "/auth/otp/solicitar", {"email": CORREO})
sesion = pedir("POST", "/auth/otp/verificar", {"email": CORREO, "codigo": MAESTRO, "modo": "token"})
token = sesion["token"]
if not sesion.get("tienePerfil"):
    sys.exit(f"{CORREO} no tiene perfil: ¿corrió el seed de demo?")

contrasena = "Capturas-" + secrets.token_urlsafe(12)
print(f"::add-mask::{contrasena}")
pedir("POST", "/auth/contrasena", {"contrasena": contrasena}, token)

eventos = pedir("GET", "/eventos", token=token)
evento_id = next((o["id"] for o in objetos(eventos) if o.get("titulo") == EVENTO and "id" in o), None)
if not evento_id:
    evento_id = next((o["id"] for o in objetos(eventos) if "titulo" in o and "id" in o), None)
bandeja = pedir("GET", "/mensajes", token=token)
conversacion_id = next((o["id"] for o in objetos(bandeja) if "id" in o), None)
if not evento_id or not conversacion_id:
    sys.exit(f"Faltan datos del seed: evento={evento_id} conversacion={conversacion_id}")

variables = {
    "TEST_RUNNER_AGORA_DEMO_CORREO": CORREO,
    "TEST_RUNNER_AGORA_DEMO_CONTRASENA": contrasena,
    "TEST_RUNNER_AGORA_DEMO_EVENTO": evento_id,
    "TEST_RUNNER_AGORA_DEMO_CONVERSACION": conversacion_id,
    "TEST_RUNNER_AGORA_DEMO_PERFIL": PERFIL,
}
with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as salida:
    for nombre, valor in variables.items():
        salida.write(f"{nombre}={valor}\n")
print(f"Cuenta demo {CORREO} lista; evento {evento_id}, conversación {conversacion_id}, perfil @{PERFIL}")
