# NichiGo branding assets (cropped from supplied identity sheet)

These files are pixel-preserving crops of the supplied composite PNG, not recreated vector assets.

- `logo-primary.png` — large horizontal primary logo
- `symbol-primary.png` — red sun/torii/book symbol
- `icon-large.png`, `icon-medium.png`, `icon-small.png` — square icons shown on the identity sheet
- `logo-horizontal.png` — compact horizontal logo near center-right
- `logo-card-dark.png` — dark background logo banner
- `logo-card-light.png` — light background logo banner
- `logo-card-monochrome.png` — black/white banner

All files retain the source alpha transparency where present. The supplied identity sheet has visible compositing artifacts around some elements, so these crops should be visually checked before production use; for perfectly clean transparency use individually exported logos from the original design file.

Suggested destination: `nichigo_frontend/public/branding/`. In Next.js, reference as `/branding/logo-primary.png`, etc.
