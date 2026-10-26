## Git: SOLO `main` (regla dura, va antes que todo lo demás)

Adam es el único programador. Este repo tiene **una sola rama: `main`**, para Claude, Cursor (editor, CLI y
Cloud/Background Agents), Grok y cualquier otro agente.

- Flujo: `git pull --rebase origin main` → cambios pequeños → **verificaciones en verde** (`pnpm run lint && pnpm run format:check && pnpm run check-types && pnpm run test`) → commit con la
  línea `Agente: <quién>` → `git pull --rebase origin main` → `git push origin main`.
- **Nunca**: ramas (`git branch X`, `git checkout -b`, `git switch -c`), worktrees, PRs (`gh pr create` o el PR
  automático de los Cloud Agents), push a otra rama ni `--force`.
- **Cloud/Background Agents de Cursor:** si la plataforma te pone en una rama `cursor/…`, no abras PR. Al terminar:
  `git fetch origin main && git rebase origin/main`, verificaciones, `git push origin HEAD:main` y borra tu rama remota.
  Si no puedes llegar a `main`, detente y deja un resumen; no dejes la rama ni el PR vivos.
- Si aparece otra rama: si sirve y pasa las verificaciones, fusiónala a `main` y bórrala (local y remota) en el mismo turno.
- Cambios visuales notables: mockup y visto bueno de Adam primero. Un cambio de texto no cambia lógica ni esconde
  errores del servidor. Nada de datos personales ni secretos en el repo.
- Deploy solo desde `main`, con verificaciones en verde. Única excepción: Adam pide una rama por su nombre.
- **Apps a TestFlight o Play (regla de Adam, 26-10-2026):** antes de subir, mira las capturas reales de la app
  con sesión iniciada del mismo commit (`ios-capturas.yml`: feed, evento, mercado, mensajes y perfil, en claro
  y en oscuro; en Android, las del emulador). «Compila» y «pasan las pruebas» no es «se ve bien»: la 1.0.0 (5)
  de iOS salió con la barra de pestañas tapando toda la pantalla y ese flujo ya estaba en rojo. Un flujo en
  rojo nunca se ignora. `ios-testflight.yml` se niega a subir si las capturas no están en verde.
- Tema claro por omisión en web, iOS y Android; oscuro solo si la persona lo elige.

Regla completa: `.cursor/rules/git-solo-main.mdc` y `C:\dev\scripts\ai-os\GIT-SOLO-MAIN.md`.

# Antes de nada: protocolo de relevo

Este repo se trabaja con **Claude Code y Cursor sobre la misma rama**, en turnos
alternos. El agente que entra tiene prohibido reescribir archivos desde su
memoria: el disco y `git log` son la verdad.

**Arranque obligatorio, antes de leer codigo y antes de escribir:**

```
pwsh -File C:\dev\scripts\relevo\relevo.ps1 estado
```

Si hay archivos sin commitear son del turno anterior: `relevo.ps1 salvar` antes
de tocar nada.

**Cierre obligatorio:** actualiza `.ai/RELEVO.md` y ejecuta
`relevo.ps1 cerrar -Mensaje "..."`.

Reglas completas: `C:\dev\scripts\relevo\PROTOCOLO-RELEVO.md`
Estado vivo del proyecto: `.ai/RELEVO.md`
<!-- RELEVO:FIN -->
