# Ágora Android Design System

Brief guide for the native Android (Jetpack Compose) design system used in the UDLAP campus social app.

## Brand

| Token | Value | Usage |
|-------|-------|-------|
| `AgoraColors.Naranja` | `#E35205` | Primary actions, selected states, brand accents |
| `AgoraColors.NaranjaSuave` | `#FFF0E8` | Selected tab indicator, chip backgrounds |
| `AgoraColors.Fondo` | `#F7F5F2` | App background — warm off-white |
| `AgoraColors.Superficie` | `#FFFFFF` | Cards, nav bar, inputs |
| `AgoraColors.SurfaceElevated` | `#FFFCFA` | Elevated cards with subtle warmth |

## Semantic Colors

```kotlin
AgoraColors.Success / SuccessSuave   // confirmations, positive states
AgoraColors.Danger / DangerSuave     // errors, destructive actions
AgoraColors.TextMuted                // secondary copy, hints
AgoraColors.ChipSelected             // filter chip selected background
```

## Typography

`AgoraTypography` is wired into `AgoraTheme` via Material 3. Uses system default (Roboto) for a native, zero-overhead feel.

| Style | Use |
|-------|-----|
| `headlineLarge` | Screen titles (e.g. login "Ágora") |
| `titleMedium` | Card headings, empty state titles |
| `bodyMedium` | Body copy, subtitles |
| `labelLarge` | Button labels, chip text |

## Spacing (4pt grid)

```kotlin
AgoraSpacing.Xxs = 4.dp
AgoraSpacing.Xs  = 8.dp
AgoraSpacing.Sm  = 12.dp
AgoraSpacing.Md  = 16.dp
AgoraSpacing.Lg  = 24.dp
```

## Shapes

| Token | Radius | Use |
|-------|--------|-----|
| `AgoraCardShape` | 16dp | Cards, skeleton blocks |
| `AgoraButtonShape` | 12dp | Primary & outlined buttons |
| `AgoraChipShape` | 999dp | Filter chips (pill) |

## Components

### `AgoraCard`
Elevated card with 1dp elevation and subtle border (`BordeSutil`). Optional `onClick`.

### `AgoraPrimaryButton` / `AgoraOutlinedButton`
48dp min-height tactile buttons. Primary supports `loading` state with inline spinner.

### `AgoraChipRow`
Horizontal scrollable filter chips with animated color transitions. Pass `List<AgoraChipItem>` + `selectedId`.

### `AgoraSkeleton` / `AgoraFeedSkeleton`
Shimmer placeholders for loading states. `AgoraFeedSkeleton` renders 3 post-card skeletons.

### `AgoraEmptyState`
Emoji + title + subtitle + optional CTA button. Used when lists have no content.

### `AgoraErrorState`
Friendly error with retry button. Used for network/API failures.

## Usage

```kotlin
@Composable
fun MyScreen() {
    AgoraTheme {
        AgoraPrimaryButton(text = "Continuar", onClick = { })
    }
}
```

## Migrated Screens (Wave 3)

- **FeedScreen** — skeleton loading, `AgoraChipRow` filters, empty & error states
- **LoginScreen** — branded typography, `AgoraPrimaryButton`, themed text fields
- **MainShell** — orange selected tab indicator, filled/outlined icon pairs, badge styling

## Tone

Premium university app — warm, clear, accessible. Not corporate cold. Orange accent on warm neutrals with sufficient contrast for body text (`#1A1A1A` on `#F7F5F2`).
