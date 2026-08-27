import next from '@next/eslint-plugin-next';
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Un solo linter para todo el monorepo.
 *
 * Antes no habia ninguno: `ci:verify` corria una tarea `lint` que era
 * `next lint` sin configuracion, o sea que preguntaba de forma interactiva y
 * fallaba siempre. Nunca habia pasado.
 *
 * El criterio de que reglas entran: **solo las que encuentran errores**. El
 * formato ya lo resuelve Prettier, y una regla de estilo que discute con
 * Prettier solo produce ruido que la gente aprende a ignorar — y un linter que
 * se ignora no sirve de nada.
 *
 * La que de verdad justifica todo esto es `react-hooks/exhaustive-deps`: en
 * una app con casi cien componentes, una dependencia que falta en un
 * `useEffect` produce datos viejos en pantalla sin ningun sintoma visible al
 * escribir el codigo.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.expo/**',
      // Generado por Next en cada arranque.
      '**/next-env.d.ts',
      // Salida de Prisma y compilados: no son codigo nuestro.
      'packages/db/generated/**',
      // Las apps nativas son Kotlin y Swift; aqui no hay nada que mirar.
      'apps/mobile-native/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // El guion bajo es la forma acordada de decir "ya se que no lo uso".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // `any` aparece a proposito en los adaptadores de Prisma, donde el tipo
      // generado es inmanejable. Se avisa, no se bloquea.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Errores de verdad, no de estilo.
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
      // `*` permitido: `1 * DIA_MS` junto a `7 * DIA_MS` y `90 * DIA_MS` se lee
      // como una tabla de politica de retencion. La simetria vale mas que
      // ahorrar una multiplicacion por uno.
      'no-implicit-coercion': ['error', { boolean: false, allow: ['*'] }],
      // Un `await` dentro de un bucle suele ser una consulta por elemento.
      'no-return-await': 'error',
    },
  },

  // React solo donde hay React.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Accesibilidad: el mismo criterio que el resto: solo lo que rompe algo
      // para alguien de verdad, no avisos de estilo.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'error',
    },
  },

  // Las dos apps de Next. El plugin oficial hace falta aunque solo sea para
  // que ESLint reconozca los `eslint-disable` que ya hay en el codigo.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}'],
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      // Es una app de App Router y el linter corre desde la raiz del
      // monorepo, asi que esta regla busca un `pages/` que no existe y suelta
      // un aviso en cada ejecucion. No aplica.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },

  // Configuracion de herramientas que corre en Node y es CommonJS a proposito:
  // Metro no entiende ESM en su archivo de configuracion.
  {
    files: ['**/*.js', '**/*.cjs', '**/metro.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Las pruebas usan aserciones y valores a medio construir; exigirles el
  // mismo rigor de tipos que al codigo de produccion solo estorba.
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
