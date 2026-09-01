# Le Menu — Design system « Balance »

A precision instrument, kept warm. The app weighs food to the gram, so the
**number is the hero**; a deep chard green and a turmeric signal keep it from
ever reading like a lab. Everything here is driven by tokens in
[`style/main.css`](./style/main.css) and the Nuxt UI colour map in
[`app.config.ts`](../../app.config.ts) — change those two and the whole app
follows.

## Brand

- **Archetype**: Sage + Caregiver — precise, trustworthy, nourishing.
- **Feeling**: appetising, exact, calm.
- **North star**: legible before it is pretty. It is read at arm's length,
  offline, under supermarket light.
- **Mark**: the three-wedge plate (protein · carbs · fat), shared by the
  favicon/PWA icons ([`asset/utils/icon.ts`](../asset/utils/icon.ts)) and the
  in-app macro donut ([`MenuMacroPlate`](../../domain/menu/components/MacroPlate.vue)).

## Colour

Palettes are declared once as `@theme static` scales (so Nuxt UI's dark shades
survive Tailwind's tree-shaking), then mapped to semantic roles.

| Role      | Palette                                | Light `--ui-*` | Dark `--ui-*` |
| --------- | -------------------------------------- | -------------- | ------------- |
| `primary` | **forest** (deep chard green)          | 700 `#235030`  | 400 `#4f9d63` |
| `neutral` | **sage** (warm grey, faint green bias) | —              | —             |
| `warning` | **turmeric** (warm signal)             | 600            | 400           |
| `success` | forest                                 | 600            | 400           |

- **Canvas vs surface**: the page ground is a tinted porcelain (`--canvas`
  `#eaeee3` light / `#0f1208` dark), a shade off the white/near-black surfaces
  Nuxt UI paints cards on — so cards read as raised without a heavy shadow.
  `--canvas` lives on `body`; the `AppShell` is transparent. Nuxt UI cards,
  inputs and popovers keep `--ui-bg` (the surface).
- **Contrast**: `primary` is shade 700 on light / 400 on dark, both measured
  ≥ 4.5:1 for text; `warning`/`success` borrow shade 600 on light for the same
  reason. Graphic fills (bars, wedges) target ≥ 3:1.

### Macro colours

The three macros carry their own **stable** colours so a glance down a day reads
which nutrient runs short. They are CSS variables, not Nuxt UI roles, remapped
per mode, and always paired with a text label or dot (never colour alone —
WCAG 1.4.1).

| Macro   | `--macro-*` light  | dark      |
| ------- | ------------------ | --------- |
| protein | `#2b683c` (green)  | `#6cb27f` |
| carbs   | `#9a7212` (wheat)  | `#d9b657` |
| fat     | `#a84e2b` (copper) | `#db8560` |
| fibre   | `#6b7256` (sage)   | `#a7ad97` |

## Typography

Self-hosted by `@nuxt/fonts` (bundled with Nuxt UI) so they work offline and
same-origin under the CSP — configured in
[`infrastructure/ui/nuxt.config.ts`](./nuxt.config.ts).

- **`--font-serif` — Instrument Serif** (400 + italic): editorial titles — the
  page/hero titles and the day names. Set at its natural weight, never bolded
  (it carries presence by shape). The serif/sans contrast is the signature.
- **`--font-sans` — Instrument Sans** (400–700): everything else, and every
  number. Digits read as data → `tabular-nums` wherever they line up (macros,
  grams, prices, kcal).

## Motion

CSS-only, no runtime animation dependency; every effect is gated behind
`prefers-reduced-motion`.

- `.rise` / `.pop` — content settles in rather than fades (see `main.css`).
- The macro donut draws its wedges in on mount (`stroke-dasharray`, staggered).
- Macro bars grow their width with a 700 ms ease.

## Accessibility

Follows the project a11y checklist (WCAG 2.2 / RGAA 4): skip link, visible
`:focus-visible` outline in `--ui-primary`, one `h1` per page, macro meaning
never carried by colour alone, decorative SVG `aria-hidden`, dark mode as a
first-class theme. Verify contrast and keyboard order before each release.

## Visual regression

Playwright baselines encode this design. After an intentional visual change,
regenerate them with `pnpm --dir front test:visual:update` and review the diff.
