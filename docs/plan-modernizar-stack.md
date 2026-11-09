# Plan: herramientas más profesionales para diseño y natividad (09-11-2026)

Pedido de Adam: «las herramientas que utilizamos para la app son muy básicas… utiliza las más duras y profesionales
que podamos usar para que mejoremos drásticamente el diseño y natividad».

## Diagnóstico

Los **lenguajes ya son los profesionales**: TypeScript estricto (`strict` + `noUncheckedIndexedAccess`) en todo el
monorepo, Next 15 + React 19 en la web, NestJS 11 + Prisma en la API, Turborepo, y apps 100 % nativas en Swift/SwiftUI
y Kotlin/Jetpack Compose (lo más nativo que existe). Cambiarlos no mejora el diseño. Lo básico está en otro lado:

1. **La web se dibuja a mano**: `globals.css` (3 947 líneas) + `diseno-d.css` (2 002) y 264 `style={{…}}` en 47
   archivos. Sin componentes base accesibles (diálogos, menús, pestañas, avisos) ni librería de animación.
2. **La paleta se copia a mano en tres lugares** y ya no coincide: `pnpm --filter @agora/design-tokens revisar`
   encontró 24 diferencias contra `docs/diseno-cholula.md` (13 en la web, que sigue en la D; varias entre Android e iOS).
3. **Dos apps móviles**: `apps/mobile` (Expo) es un prototipo que ya no es la app de producción.
4. **Sin pruebas visuales de la web**: solo las apps tienen capturas automáticas.

## Etapas

| # | Qué | Impacto visible | Costo | Riesgo |
|---|---|---|---|---|
| 1 | **Fuente única de colores** (`packages/design-tokens`): un archivo genera CSS, Kotlin y Swift, con prueba de contraste AA y reporte de diferencias. Después, conectar Android e iOS a lo generado. | Bajo (ordena la base) | 1 turno | Bajo |
| 2 | **Web con Tailwind CSS v4 + Radix UI + Motion**: componentes propios (estilo shadcn) sobre los tokens, pantalla por pantalla empezando por el feed y la publicación; `globals.css` se va encogiendo. La web pasa a la paleta Cholula de las apps. Capturas de Playwright por pantalla en claro y oscuro. | **Alto** | 1-2 semanas de turnos | Medio |
| 3 | **Web que se siente app**: Next 16, View Transitions entre páginas, PWA instalable con notificaciones web, TanStack Query para respuestas al instante (optimistic UI). | Alto | ~1 semana | Medio-bajo |
| 4 | **Nativas al día**: quitar el prototipo Expo, pruebas de captura (Paparazzi en Android, swift-snapshot-testing en iOS), Material 3 Expressive y Liquid Glass de iOS 26 donde encajen. | Medio | ~1 semana | Bajo |

**No se recomienda**: reescribir en React Native o Flutter (sería menos nativo que lo que ya hay) ni cambiar el backend.

## Estado

- Etapa 1, primera parte: hecha el 09-11 (`packages/design-tokens`, salida en `generado/`, sin tocar todavía las
  apps). La etapa 2 cambia cómo se ve la web: va con mockup y visto bueno de Adam.
