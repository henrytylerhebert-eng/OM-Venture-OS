# BUILD_EVIDENCE_SYNTHESIS

## Objective

Build the next evidence-synthesis layer for OM Venture OS in the correct order:

1. Patterns
2. `company_evidence_context`
3. selective wiring into existing staff/readiness surfaces
4. hardening pass

This sequence follows the current repo state:

- Phase 1 hardening is complete.
- Discovery Interviews is the completed evidence foundation.
- Patterns is the next confirmed product module.
- `company_evidence_context` belongs in Evidence Synthesis after source sync/entity resolution and before readiness or unlock scoring.

This document is the handoff spec for the next implementation run.

## Product Truth

OM Venture OS is not a generic startup CRM.

Evidence must progress through this chain:

1. interviews create raw customer truth
2. patterns summarize repeated truth
3. assumptions rank what is still risky
4. experiments test the biggest unknowns
5. signals show whether anything moved
6. readiness reviews and unlock decisions consume synthesis, not raw notes alone

`company_evidence_context` is the operating synthesis layer that sits between raw evidence and downstream staff judgment.

## Existing Repo Seams

### Existing models and services

- `Interview` already exists in `src/types.ts`
- `Pattern` already exists in `src/types.ts`
- `patterns` Firestore CRUD already exists in `src/services/evidenceService.ts`
- readiness review CRUD already exists in `src/services/progressService.ts`
- existing Firestore rules already cover:
  - `interviews`
  - `patterns`
  - `assumptions`
  - `experiments`
  - `signals`
  - `readinessReviews`

### Existing UI surfaces

- Discovery Interviews: `src/pages/DiscoveryInterviews.tsx`
- Patterns: `src/pages/Patterns.tsx`
- Founder home: `src/pages/FounderDashboard.tsx`
- Staff console: `src/pages/AdminDashboard.tsx`
- Staff readiness surface: `src/pages/ReadinessQueue.tsx`

### Existing derived logic

- `src/lib/companyInsights.ts` already computes downstream operational summaries, proof gaps, unlock guidance, and staff attention logic.

This means:

- Patterns should build on the current `Pattern` model and service boundary.
- `company_evidence_context` should be introduced as a synthesis boundary, not as a second competing dashboard-only abstraction.

## Build Order

Run prompts in this order:

1. master implementation prompt
2. Patterns prompt
3. `company_evidence_context` prompt
4. hardening prompt

Do not skip the order.

## Module A: Patterns

### Purpose

Turn interview records into repeated truth that can shape assumptions, narrowing, pivot decisions, and later testing.

### Required behavior

- use the existing `patterns` collection and `Pattern` type unless a verified gap requires an additive change
- allow founders and OM staff to create and edit patterns
- keep mentor access read-only and scoped
- support these fields:
  - `companyId`
  - `problemTheme`
  - `numberOfMentions`
  - `averagePainIntensity`
  - `unpromptedMentions`
  - `representativeQuote`
  - `confidence`
  - `status`
- connect pattern creation to interview data rather than making founders retype everything from scratch
- surface:
  - strongest pattern
  - number of strong patterns
  - pivot candidates
- support both:
  - founder synthesis view
  - OM staff review table

### Acceptance criteria

- a founder can synthesize a pattern from discovery interview themes
- OM staff can review strongest and weakest patterns without leaving the pattern surface
- the page warns when discovery data quality is weak enough to make synthesis unreliable
- RBAC stays aligned with current Phase 1 rules
- no generic CRUD dashboard treatment

### Expected files

- `src/pages/Patterns.tsx`
- possibly `src/types.ts`
- possibly `src/services/evidenceService.ts`
- only if required:
  - `firestore.rules`
  - `firebase-blueprint.json`

## Module B: company_evidence_context

### Purpose

Create a synthesis-layer object that summarizes the state of evidence for one company without collapsing provenance.

`company_evidence_context` is not a replacement for interviews, patterns, assumptions, experiments, or signals.
It is the internal operating summary derived from them.

### Placement

It belongs:

- after source sync and entity resolution
- after raw evidence exists
- before readiness scoring
- before unlock scoring
- before content-readiness or staff decision surfaces make stronger judgments

### What it should contain

The exact field set must be checked against the repo during implementation, but the object should likely summarize:

- company identity reference
- evidence counts by type
- strongest repeated themes
- strongest quotes or representative evidence references
- evidence coverage gaps
- synthesis quality notes
- confidence or maturity of current evidence picture
- unresolved contradictions or thin areas
- pattern-backed next synthesis questions

It should remain internal and operational.

It must not:

- invent traction
- rewrite source evidence
- turn internal synthesis into public-facing claims
- become a duplicate source of truth for raw interviews or patterns

### Architectural preference

Default to a derived module first.

Preferred shape:

- additive type in `src/types.ts`
- synthesis builder in a new service/lib boundary near `src/lib/companyInsights.ts`
- current staff/founder/readiness surfaces consume the derived context

Persist to Firestore only if there is a clear repo-grounded need for manual review, snapshot history, or staff-authored synthesis state that cannot remain derived.

### Acceptance criteria

- the repo has one clear synthesis-layer object for evidence context
- provenance stays attached to underlying evidence records
- readiness and unlock logic can consume the context without recomputing ad hoc UI summaries everywhere
- the context is not exposed as marketing language or public claims

### Expected files

- `src/types.ts`
- a new synthesis-layer file near `src/lib/companyInsights.ts`
- possibly `src/lib/companyInsights.ts`
- selective consumers:
  - `src/pages/AdminDashboard.tsx`
  - `src/pages/FounderDashboard.tsx`
  - `src/pages/ReadinessQueue.tsx`

Only if persistence is required:

- `src/services/evidenceService.ts` or a new adjacent service
- `firestore.rules`
- `firebase-blueprint.json`

## Integration Rules

After both modules exist, wire synthesis outputs only into places that already make sense in the repo:

- founder dashboard summary
- staff operating console
- readiness queue / staff decision surface

Do not add new routes just to show the context object.

Do not wire directly into investor flows yet.

## Hardening Pass

After Patterns and `company_evidence_context`, run a hardening pass focused on:

- type safety
- enum consistency
- RBAC consistency
- Firestore rule alignment if schema changed
- blueprint alignment if schema changed
- dead UI cleanup
- label drift cleanup
- validation commands

### Validation

At minimum run:

- `npm run lint`
- `npm run build`

If a schema or rules change happens, explicitly call that out.

## Guardrails

- inspect the repo first before editing
- respect existing enums and service boundaries
- preserve Firestore hardening
- do not invent fields without checking repo seams
- do not overbuild charts
- do not weaken evidence provenance
- do not turn internal notes into public claims
- keep language operational and plain
- do not add generic admin CRUD
- do not let `company_evidence_context` compete with the raw evidence model

## Out Of Scope For This Sequence

Wait on:

- live Airtable sync
- live Jotform sync
- investor output layer
- broad design polish
- broad mentor workspace rebuild
- new investor routes or investor visibility logic

## Recommended Prompt Sequence

### Prompt 1

Master implementation prompt:

- restate the repo truth
- require repo inspection first
- require a short implementation plan
- require small coherent steps
- require validation and a concise summary

### Prompt 2

Patterns prompt:

- build or finalize the Patterns module on the existing evidence model
- connect it directly to Discovery Interviews
- keep founder and staff views distinct

### Prompt 3

`company_evidence_context` prompt:

- add the synthesis boundary
- keep it internal, typed, and provenance-safe
- integrate only where the repo already has a clean seam

### Prompt 4

Hardening prompt:

- clean up types, labels, rules, dead UI, and validation

## Final Note

The build should move forward as:

Discovery Interviews -> Patterns -> `company_evidence_context` -> Assumptions -> Experiments -> Signals -> Readiness

That is the evidence spine.
