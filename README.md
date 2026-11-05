# Learn Docker · Interactive

An interactive, static website for learning Docker: animated concept simulators plus live
Dockerfile / Compose / `docker run` builders whose output updates as you flip options.

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + build → dist/index.html (single self-contained file)
```

`dist/index.html` has all JS/CSS inlined, so it works on any static host (GitHub Pages, Netlify…)
or simply by opening the file in a browser.

## Adding a language

1. Copy `src/i18n/locales/en.ts` to `src/i18n/locales/<code>.ts` and translate it
   (type it as `Messages`, or `DeepPartial<Messages>` — missing keys fall back to English).
2. Add one entry to `LOCALES` in `src/i18n/registry.ts`.

The browser language is detected automatically; the user's choice is saved in `localStorage`.

## Structure

- `src/components/ui/` – custom controls (ripple button, switch, listbox select, slider, stepper, tabs, toast)
- `src/sections/concepts/` – the six animated simulators
- `src/sections/playground/` – the three builders
- `src/lib/gen*.ts` – file generators (each line is tagged so hovering an option highlights its lines)
- `src/lib/diff.ts` – line diff used to make changed lines glow
