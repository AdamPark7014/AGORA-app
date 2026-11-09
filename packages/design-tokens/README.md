# @agora/design-tokens

Fuente única de los colores de Ágora (B «Cholula», `docs/diseno-cholula.md`). Se edita `src/tokens.ts` y nada más.

- `pnpm --filter @agora/design-tokens generar` escribe `generado/tokens.css`, `AgoraTokens.kt` y `AgoraTokens.swift`.
- `pnpm --filter @agora/design-tokens revisar` lista dónde la web, Android o iOS se apartan de los tokens.
- `pnpm --filter @agora/design-tokens test` comprueba contraste AA en claro y oscuro y que `generado/` esté al día.

Plan completo: `docs/plan-modernizar-stack.md`.
