# Designer Client Handoff

## Stop Point

Paused after reorganizing the project workflow and pulling generated button sheets out of the active product flow.

Current intended user flow:

```text
Palette -> Source backgrounds -> Expand backgrounds -> App imagery -> Fonts -> Optional icons
```

## Product Decisions

- Backgrounds are textless visual plates for developers to code UI over.
- App imagery is a separate optional/standalone generation stage for hero images, card art, empty states, success states, etc.
- Fonts are a handoff/configuration step only right now.
- Optional icons happen after fonts.
- Button/component sheets should not be generated yet. They are not part of the current flow.

## Current Implementation

- Project page now has a top step rail showing the full flow and status: `Ready`, `Done`, `Locked`, or `Optional`.
- Post-source-background work is grouped into one tabbed workflow component instead of separate sections dumped down the page.
- New App Imagery stage exists:
  - `src/components/generation/generate-app-imagery-form.tsx`
  - `generateAppImageryAssets` in `src/app/projects/[projectId]/generate/actions.ts`
  - `buildAppImageryPrompt` in `src/lib/generation/prompt.ts`
  - `app_image` asset kind and migration `20260509000400_add_app_image_asset_kind.sql`
- Expanded backgrounds, fonts, and optional icons are wired into the grouped post-background workflow:
  - `src/components/generation/post-background-workflow.tsx`
  - `src/components/generation/generate-backgrounds-form.tsx`
  - `src/components/generation/typography-form.tsx`
  - `src/components/generation/generate-icons-form.tsx`
- Button generation was removed from active generation:
  - `createAssetPackage` no longer adds `buttons_light` / `buttons_dark`.
  - Saving fonts no longer regenerates button sheets.
  - Button assets are hidden from the gallery via deprecated asset kinds.

## Button Caveat

Legacy button types/helpers still exist:

- `buttons_light` / `buttons_dark` remain in asset-kind enums and Supabase types.
- `createButtonSheet` / `createButtonSheetSvg` still exist in `src/lib/generation/derivatives.ts`.
- `style_specs.buttons_json` still exists and is now written as `{}` because the DB schema requires it.

This is intentional for now. Clean deletion should be a later migration/refactor, not mixed into the current workflow cleanup. Existing old ZIPs/files may still contain button sheets; new packages should not.

## Prompt/COPY Notes

Cleaned stale copy that said typography belonged in background generation. Current prompt contract says:

- model-generated imagery must not contain text, fake UI, labels, nav bars, buttons, charts, etc.
- fonts are handled by the separate Fonts step and not rendered into model imagery.
- reference analysis is still injected as style direction, without raw URLs.

## Local State

- Local Supabase migrations have been applied through:
  - `20260509000100_add_design_brief_icon_subjects.sql`
  - `20260509000200_clean_skipped_reference_summaries.sql`
  - `20260509000300_add_background_plate_asset_kinds.sql`
  - `20260509000400_add_app_image_asset_kind.sql`
- Local Next server was responding at `http://localhost:3001`.
- No commit has been made.
- Worktree is intentionally dirty with many related edits and new files.

## Last Verification

Passed:

```bash
npm run typecheck
npm run lint
npm run test -- tests/generation/asset-package.test.ts --testTimeout=20000
npm run test -- tests/generation/prompt.test.ts
```

Also verified:

```bash
curl -I http://127.0.0.1:3001/login
```

returned `200 OK`.

## Suggested Next Pass

1. Open the app in-browser and review the step rail and post-background workflow visually.
2. Run one mock generation path and confirm new packages do not include buttons.
3. With real OpenAI env vars, test:
   - source backgrounds
   - expanded backgrounds
   - app imagery
   - fonts save
   - optional icons
4. Decide whether old generated button files should be purged from storage/DB or simply hidden forever.
5. Later, if a UI/components step is added, reintroduce controls/buttons deliberately as their own stage.

## Files To Check First

- `src/app/projects/[projectId]/page.tsx`
- `src/components/generation/post-background-workflow.tsx`
- `src/app/projects/[projectId]/generate/actions.ts`
- `src/lib/generation/derivatives.ts`
- `src/lib/generation/prompt.ts`
- `tests/generation/asset-package.test.ts`
