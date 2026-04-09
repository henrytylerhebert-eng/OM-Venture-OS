# Source To Runtime Mapping

This document maps upstream source objects into OM Venture OS runtime layers.

Keep it operational:

- one source owner per concept
- one runtime landing zone per layer
- no direct source-to-derived shortcuts

## Mapping model

| Source system | Source object | Layer in Firestore | Runtime owner | Notes |
| --- | --- | --- | --- | --- |
| Airtable | `Member Companies` | canonical operating context | Airtable | anchor company identity and program-company context |
| Airtable | `Personnel` | canonical operating context | Airtable | anchor founder, staff, and person identity |
| Airtable | `Internal Application Review` | canonical operating context | Airtable | membership intake context, not readiness |
| Airtable | `Customer Discovery` | source-aware operating context | Airtable | source context for discovery tracking, not pattern truth |
| Airtable | `Meeting Requests` | canonical operations context | Airtable | mentor ops context, not readiness |
| Airtable | `Feedback` | canonical operations context | Airtable | mentor meeting feedback context |
| Airtable | `News Tracker` | source-aware reporting context | Airtable | reporting lane, not canonical traction by default |
| Jotform | exact form submission | raw | Jotform | land first in `sourceSubmissions` |
| Miro | board or canvas | external working artifact | Miro | store link or structured extract only |
| Firestore | `sourceSubmissions` | raw | Firestore | immutable raw intake landing zone |
| Firestore | `ingestionReviewQueue` | review | Firestore | staff-only resolution lane |
| Firestore | `interviews` | canonical | Firestore | normalized customer discovery evidence |
| Firestore | `patterns` | canonical | Firestore | repeated truth synthesized from interviews |
| Firestore | `assumptions` | canonical | Firestore | ranked risks still needing proof |
| Firestore | `experiments` | canonical | Firestore | tests beyond discovery |
| Firestore | `signals` | canonical | Firestore | measured market movement |
| Firestore | `readinessReviews` | canonical decision | Firestore | explicit OM review only |
| Firestore | `companyResourceAccess` | canonical access | Firestore | explicit unlock activation only |
| Firestore | `builderFoundations` | canonical founder input | Firestore | structured Builder setup before interviews |

## Raw vs canonical vs derived

| Layer | Allowed objects | Rules |
| --- | --- | --- |
| raw | `sourceSubmissions` | preserve exact upstream naming and payload |
| canonical | `builderFoundations`, `interviews`, `patterns`, `assumptions`, `experiments`, `signals`, `readinessReviews`, `companyResourceAccess` | must be company-linked and runtime-safe |
| derived | `company_evidence_context`, operating insights, unlock eligibility views | recompute from canonical; do not write back as source truth |

## Concept separation

| Concept | Owner | Runtime rule |
| --- | --- | --- |
| membership status | Airtable | mirror only; never infer from Builder activity |
| venture stage | Firestore | derived from Builder progression and evidence |
| readiness | Firestore | staff review record only |
| unlock eligibility | Firestore derived logic | may recommend support, but does not activate it |
| investor visibility | Firestore | separate future OM-controlled access path |

## Sync and normalization path

### Airtable

- sync direction: Airtable -> Firestore
- use for identity anchors and operating context
- never let Airtable overwrite readiness, unlock access, or canonical evidence synthesis

### Jotform

- sync direction: Jotform -> `sourceSubmissions`
- then `sourceSubmissions` -> `ingestionReviewQueue` if needed
- then reviewed raw submissions -> canonical evidence by normalization

### Miro

- sync direction: none by default
- current safe pattern is link/reference storage or founder-entered structured copy
- do not treat board text as canonical runtime truth unless an explicit normalization path is added later

## Overwrite rules

- identity anchor fields: Airtable may overwrite anchored Firestore context
- raw submission fields: append-only or upsert on exact source submission id
- canonical evidence: may only be created or edited through Firestore runtime logic
- derived views: never overwrite canonical records

## Conflict rules

- identity conflict: hold both values with provenance and send to human review
- raw duplicate: dedupe by exact source submission id and source hash
- normalization collision: do not auto-merge into canonical evidence without a deterministic target
- label conflict: preserve exact Airtable/Jotform names in provenance layers, use internal labels only in runtime/UI layers

## Human decisions still needed

- whether Miro remains the long-term owner of live Lean Canvas board truth or whether Firestore should eventually own structured revision history
- whether `News Tracker` should stay source-aware reporting context or normalize into more runtime reporting objects
- whether mentor meeting notes and Builder meeting notes should share one canonical artifact shape or remain lane-specific

## Integration rule for future work

When building Airtable or Jotform sync:

1. land upstream data in the right layer first
2. preserve exact source provenance
3. normalize only after identity is resolved
4. keep membership, venture stage, readiness, unlock eligibility, and investor visibility separate
5. if a write crosses ownership boundaries, stop and document it first
