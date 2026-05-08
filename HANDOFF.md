# Designer Client Handoff

## Current State

The MVP now generates a focused mobile asset package:

- approved light and dark palette sheets
- master/background source image
- light screen derived directly from the master/source image
- dark screen generated as a controlled model edit
- light and dark button sheets
- one canonical app-specific utility icon sheet
- downloadable zip package and gallery buckets

The old splash output, light/dark screen example sheets, controls showcase, and separate local light/dark icon sheets have been removed from the new generation flow. Deprecated old asset kinds are hidden from the project gallery.

Verified before handoff:

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

## Where To Resume

Next important task: make generated button sheets render the exact selected fonts, not just declare selected font-family names.

Right now `src/lib/generation/fonts.ts` parses the client-selected typography roles and `src/lib/generation/derivatives.ts` uses those names in the SVG button sheet. That is directionally correct, but the PNG renderer can only draw the exact typeface if the font is available to the server rendering path.

## Recommended Font Plan

Do not wait for a live Supabase project for curated fonts. Bundle/embed the curated font files with the app so local, staging, and production render the same button PNGs.

Recommended approach:

1. Add a repo-local font asset layer for the open-source fonts in the dropdowns.
2. Map dropdown font names to actual `.woff2` files and licensing notes.
3. During server-side SVG generation, embed the selected display/body/utility fonts with `@font-face` or otherwise make them available to the SVG-to-PNG renderer.
4. Add a render test proving selected fonts affect the generated button PNG output.
5. Keep premium/licensed fonts such as Sohne, Tiempos, Recoleta, Neue Haas, etc. as selectable names only unless properly licensed files are supplied.

Supabase should only enter the font story later if clients can upload their own font files. In that future version, store uploaded font binaries in Supabase Storage and store metadata/license/name mappings in Postgres. For the current curated dropdown list, font files belong in the app/deployment artifact, not in Supabase.

## Files To Check First

- `src/lib/generation/fonts.ts`
- `src/lib/generation/derivatives.ts`
- `src/components/briefs/brief-form.tsx`
- `tests/generation/asset-package.test.ts`

## Practical Caveat

The current renderer uses SVG-to-PNG generation through `sharp`. Before committing to a specific embedding method, verify that the renderer actually honors embedded `@font-face` for local `.woff2` or base64 data URLs. If it does not, use a renderer path that supports deterministic font loading, or install/register the bundled fonts in the runtime image.
