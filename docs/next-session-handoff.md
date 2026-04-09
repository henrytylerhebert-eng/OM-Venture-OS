# Next Session Handoff

## What Landed Tonight

- Rebuilt the mentor workspace into a scoped support surface for assigned companies only.
- Rebuilt founder home into a Builder journey workspace with honest sparse states.
- Added persistent unlock/access records v1:
  - `resourceCatalog`
  - `unlockRules`
  - `companyResourceAccess`
- Wired staff unlock activation into the readiness decision surface.
- Updated Firestore rules and Firebase blueprint support for unlock access records.
- Kept founder, mentor, and staff surfaces aligned around the same evidence and unlock model.

## Intentionally Still Missing

- Staff revoke / expire UI for unlock access records.
- Founder-side deeper assumptions-to-live-test handoff polish.
- Investor-facing access or investor-visible product surfaces.
- Live Airtable sync.
- Live Jotform sync.
- Design polish beyond tonight's product-logic pass.

## Known RBAC / Schema Follow-Ups

- Mentor evidence scoping is still stronger in the app layer than in Firestore rules.
- Full mentor rule enforcement needs a more deterministic company-to-mentor access path in schema or rule-checkable lineage.
- `companyResourceAccess` is founder-readable for the founder lead and staff-readable, but revoke / expire is still service-only and not yet exposed in staff UI.
- Founder-visible unlocks intentionally exclude investor-facing resources for now.

## Recommended Next Build Order

1. Add staff revoke / expire controls for persistent unlock access.
2. Tighten founder handoff from Patterns & Assumptions into live-test execution.
3. Add the minimum schema assist needed for stronger mentor Firestore rule enforcement.
4. Resume source-sync work only after the mentor/founder/unlock model is stable:
   - Airtable sync
   - Jotform sync

## Validation Status At Close

- `npm run lint`
- `npm run build`
- `npm run validate:patterns`
- `npm run validate:evidence-context`

All passed at the end of tonight's slice. Existing Firestore dynamic-import and Vite large-chunk warnings remain unchanged.
