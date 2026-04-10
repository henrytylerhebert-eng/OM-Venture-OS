# OM Venture OS Ground Truth Contract

This document defines which system owns which truth in OM Venture OS.

Use it to prevent:

- duplicate truth
- label drift
- unsafe overwrite behavior
- source sync that mutates the wrong layer

## System roles

| System | Role | What it owns | Write direction |
| --- | --- | --- | --- |
| Airtable | identity and operating anchor | company identity, people identity, membership operations, mentor operations context, reporting context from exact Airtable tables | Airtable -> Firestore |
| Jotform | raw intake | raw founder-submitted Builder inputs and notes before review | Jotform -> Firestore raw only |
| Miro | working board surface | live workshop boards, Lean Canvas board work, session artifacts, visual Builder homework | Miro -> Firestore by link or explicit structured copy only |
| Firestore | runtime source of truth | canonical runtime records, raw intake queue, normalized evidence, readiness reviews, unlock access, founder runtime inputs | Firestore internal runtime only |
| GitHub | build and contract source | code, schema, rules, docs, operational contracts, migration logic | GitHub -> runtime behavior through deploys, never direct data writes |

## Layer rule

Every record in OM Venture OS must be treated as one of these:

- `raw`: exact upstream capture with provenance, not yet trusted as canonical
- `canonical`: identity-linked runtime truth used by product workflows
- `derived`: computed summaries, recommendations, or views that can be rebuilt from canonical records

Never let a `derived` record overwrite `canonical`.
Never let a `canonical` record overwrite `raw`.

## Write gate

Before any new sync or importer writes to Firestore, answer all four:

1. Is this raw, canonical, or derived?
2. Which single system owns it?
3. Is the write direction allowed here?
4. Is provenance preserved on the written record?

If any answer is unclear, do not ship the write path yet.

## Concept ownership

| Concept | Owner | Runtime handling |
| --- | --- | --- |
| membership status | Airtable | mirror into Firestore only as anchored operating context |
| venture stage | Firestore | derived from Builder evidence and progress, never from membership status alone |
| readiness | Firestore | explicit OM review record only |
| unlock eligibility | Firestore derived logic | computed from canonical evidence; eligibility is not activation |
| unlock activation | Firestore | persistent access record only |
| investor visibility | Firestore | OM-controlled access only, separate from readiness and unlock eligibility |
| company identity | Airtable | Firestore uses Airtable-anchored company records |
| person identity | Airtable | Firestore uses Airtable-anchored person records |
| raw discovery intake | Jotform | lands in Firestore as `sourceSubmissions` |
| Builder board artifacts | Miro | Firestore stores links or structured extracts, not board truth |
| runtime schema and sync rules | GitHub | implemented in code, rules, and docs |

## Sync direction and overwrite rules

- Airtable -> Firestore for identity and operating context.
- Jotform -> Firestore for raw intake only.
- Miro -> Firestore by reference or structured founder-entered copy only.
- GitHub -> Firestore never. GitHub changes code and contracts, not live records.

Overwrite rules:

- Airtable-origin identity fields can update anchored Firestore identity fields.
- Jotform never overwrites company or person identity.
- Raw source records never overwrite canonical evidence directly.
- Normalization creates canonical records; it does not mutate the raw payload into canonical shape.
- Derived insight can recommend readiness or unlock action, but only explicit Firestore review/access records can persist it.

## Provenance requirements

Required whenever data comes from outside Firestore:

- exact source system
- exact source object title or form title
- source record or submission id
- ingest timestamp
- matched canonical company id if resolved
- matched canonical person id if resolved

Required whenever Firestore creates canonical evidence from raw input:

- link back to the raw source record
- record who normalized it
- record when normalization happened
- preserve exact Airtable table names and exact Jotform form titles where provenance matters

## Conflict resolution rules

Use this order:

1. GitHub contract decides the intended model and allowed sync direction.
2. Airtable wins for identity and membership operations.
3. Jotform wins for raw submitted content only.
4. Firestore wins for canonical evidence, readiness, unlocks, and runtime state.
5. Miro wins only for board-local workshop content until it is intentionally copied or normalized into Firestore.

If two systems disagree:

- do not auto-merge across layers
- preserve both values with provenance
- send identity conflicts to manual review
- prefer no write over a destructive write

## Enforceable implementation rule

If a proposed integration write would:

- overwrite data owned by another system
- skip the raw layer for Jotform-origin content
- infer readiness or investor visibility from membership status
- treat unlock eligibility as unlocked access

stop and resolve the contract conflict before implementation.
