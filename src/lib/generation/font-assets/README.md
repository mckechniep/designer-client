# Generation Font Assets

These fonts are bundled for deterministic server-side SVG-to-PNG rendering in
the mobile asset package generator. Sharp/librsvg does not honor embedded SVG
`@font-face` data URLs in this environment, so the renderer registers these TTF
files through Fontconfig before generating PNG assets.

Included fonts:

- `inter.ttf` - Inter variable font, SIL Open Font License 1.1.
- `instrument-serif.ttf` - Instrument Serif regular, SIL Open Font License 1.1.
- `jetbrains-mono.ttf` - JetBrains Mono variable font, SIL Open Font License 1.1.

Sources:

- `https://github.com/google/fonts/tree/main/ofl/inter`
- `https://github.com/google/fonts/tree/main/ofl/instrumentserif`
- `https://github.com/google/fonts/tree/main/ofl/jetbrainsmono`

Premium or client-licensed font names in the brief UI stay selectable as design
direction notes only until proper font files and license records are supplied.
