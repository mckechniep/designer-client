# Master Asset Studio Design

Date: 2026-05-05

## Summary

Master Asset Studio is a client portal for generating static, high-resolution visual assets for mobile app projects. Clients log in, create a project, complete a guided design brief, generate professional design directions, refine them with freeform feedback, and download master assets without waiting for manual approval.

The product is not a prototype builder. It does not create clickable screens. Its job is to produce source-quality visual assets and implementation specs that can be cropped, resized, converted, or translated into app UI by the developer.

## Product Goals

- Let clients participate in visual direction without creating unusable design output.
- Produce high-resolution master images for mobile backgrounds, splash screens, onboarding art, hero/header crops, and related static surfaces.
- Produce button and control styling specs that can be implemented in code.
- Preserve iteration history so the developer can inspect what the client generated and downloaded.
- Keep v1 small enough to build quickly while still being useful in real client work.

## Non-Goals

- No clickable prototypes.
- No full screen-by-screen app builder.
- No Figma replacement.
- No manual approval gate before download.
- No billing, subscriptions, or paid generation packs in v1.
- No full website asset workflow in v1, though the design should not block adding it later.

## Roles

### Client

The client creates and iterates on project assets. They can generate, refine, view history, and download final files without developer approval.

### Admin

The admin can see all clients, projects, generated versions, download history, and generation counts. The admin can reset caps, raise caps, or mark a client as unlimited.

## V1 User Flow

1. Client logs in.
2. Client creates a project for a mobile app.
3. Client fills out a guided brief:
   - app name
   - app category
   - audience
   - desired mood
   - colors they like
   - colors they dislike
   - font preferences
   - reference images or links
   - visual dislikes
   - notes about brand personality
4. The app generates 2-4 design directions.
5. Client chooses one direction to refine.
6. Client enters freeform feedback.
7. The app translates the feedback into structured design changes before generating the next version.
8. Client downloads master assets and style specs.
9. Admin can inspect the project and assets later.

## Asset Outputs

### Master Background Asset

Each selected direction can generate a portrait master source image intended to be reused across several mobile app surfaces.

Requirements:

- Large enough to crop down into multiple mobile screen sizes.
- Recommended default: 4096 x 8192 PNG master, with WebP derivatives for practical use.
- No critical UI text baked into the image by default.
- Strong center and edge composition so it survives different phone aspect ratios.
- Safe visual zones for status bars, navigation bars, and overlay UI.
- Usage notes describing recommended crops and overlays.

Example uses:

- splash screen
- onboarding background
- auth background
- empty state background
- home header
- hero/header image

### Splash Asset

Splash outputs may use the same master visual direction but should be exported as a dedicated static image when needed.

Requirements:

- Minimal visual clutter.
- Strong central brand or mood anchor.
- Safe top and bottom areas.
- Light and dark variants when the selected direction supports both.

### Button And Control Specs

Buttons should not rely only on static images. The app should output implementation-ready style specs.

Required states:

- normal
- pressed
- disabled
- optional focused/selected state

Required values:

- background color
- text color
- border color
- border width
- radius
- shadow
- pressed transform or shadow change
- disabled opacity or color shift
- CSS snippet where practical

Static PNG button previews are useful for client review, but code specs are the developer-facing source of truth.

### Theme Notes

Each direction should include a compact design system summary:

- primary colors
- accent colors
- background colors
- text colors
- font pairing
- spacing feel
- radius style
- shadow/elevation style
- light mode notes
- dark mode notes

## Freeform Refinement

Clients can write natural feedback such as "make it more futuristic but less dark."

The app must not send raw feedback directly into image generation without interpretation. It should first convert feedback into a structured refinement summary:

- what will change
- what will stay the same
- which approved constraints remain locked
- any risky or unclear instruction that needs simplification

Example:

Client feedback: "Make it more futuristic but less dark."

Structured interpretation:

- Increase futuristic styling through sharper light accents and cleaner tech-inspired forms.
- Lighten the overall image while preserving readability.
- Keep the selected color family.
- Keep typography direction unchanged.
- Keep mobile safe zones unchanged.

The client can generate from that interpretation. This keeps feedback flexible without letting vague language destroy the design system.

## Design Guardrails

Generation should enforce professional UI/UX constraints:

- adequate contrast for overlay UI
- safe crop zones
- no tiny unreadable text in master images
- no random fake UI chrome unless explicitly requested
- no inconsistent font pairings
- no light/dark variants that feel like unrelated brands
- no decorative clutter that makes mobile UI overlays hard to read
- no overuse of trendy effects when they reduce usefulness

The app should guide clients through constrained choices, but still allow freeform explanation.

## Generation Limits

V1 uses simple generation limits:

- internal/test accounts: unlimited
- client accounts: 50 generations per client by default
- admin can reset, raise, or remove a client's limit

A generation is any action that produces new image assets.

The following do not count as generations:

- editing a brief
- writing feedback
- viewing history
- downloading files
- exporting style specs

Client UI should show a simple counter such as `32 / 50 generations used`.

## Project History

Each project should keep a versioned history:

- original guided brief
- selected design direction
- freeform feedback
- structured interpretation of feedback
- generation prompt metadata
- generated master image
- thumbnail
- exported derivatives
- style specs
- download events
- generation count impact

Previous versions should remain visible so clients can go back if an iteration gets worse.

## Download Package

The download package should include:

- master PNG image
- practical WebP derivative
- preview thumbnail
- optional splash export
- button preview PNGs if generated
- `theme.json`
- `buttons.json`
- `README.md` with usage notes

The package should be understandable without opening the portal.

## Admin View

Admin v1 should include:

- client list
- project list
- project detail view
- generation count
- cap status
- generated asset history
- download history
- direct asset download
- cap reset/override controls

No approval workflow is required in v1.

## Data Model

The implementation can evolve, but v1 needs these core entities:

- User
- ClientProfile
- Project
- DesignBrief
- DesignDirection
- AssetGeneration
- AssetFile
- StyleSpec
- DownloadEvent
- GenerationLimit

Important relationships:

- A user owns or belongs to a client profile.
- A client profile has many projects.
- A project has one current brief and many generated directions.
- A design direction has many generations.
- A generation has many asset files and one or more style specs.
- Download events belong to generated files and users.
- Generation limits apply at the client profile level.

## Architecture

V1 should be built as a web portal with:

- authenticated client and admin areas
- server-side generation requests
- file storage for master assets and exports
- database records for briefs, projects, generation history, and limits
- background job support or queued status for long image generations
- a provider adapter around the image generation service so the generation backend can be changed later

The UI should be a real app surface, not a marketing landing page. The first screen after login should show projects and generation status.

## Error Handling

The app should handle:

- failed image generation
- slow generation
- file upload failure
- download package creation failure
- exceeded generation limit
- invalid or unsafe uploaded reference files
- unavailable generation provider

Failed generations should not count against the client cap unless usable image files were produced.

## Testing And Verification

V1 should include focused coverage for:

- client project creation
- guided brief save/update
- generation count rules
- internal unlimited account behavior
- 50-generation client cap
- freeform feedback interpretation records
- asset download package contents
- admin cap override

Before launch, manually verify:

- generated master images display at expected quality
- downloads contain the expected files
- client cannot access another client's project
- normal client cannot access admin views
- failed generations do not create broken asset records

## Deferred Until Later

- Website asset generation.
- Team accounts with multiple client users.
- Billing and paid generation packs.
- Figma export.
- Direct code generation for full app screens.
- In-browser image editing tools.
- Advanced brand kit management.
- Approval workflows.
