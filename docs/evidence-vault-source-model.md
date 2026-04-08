# Evidence Vault Source Model

This document defines the first source model for turning Airtable-anchored identity and Jotform-origin evidence into a canonical OM Venture OS evidence vault.

## Core system boundary

OM Venture OS should treat upstream systems as follows:

- Airtable = identity and operating anchor
- Jotform = source intake for customer discovery evidence
- OM Venture OS = canonical evidence vault

That means:

- company and founder identity should anchor to Airtable-derived records first
- Jotform should not directly mutate canonical company or person records
- raw source material should land first, then be matched, reviewed, and normalized

## Identity anchor model

### Airtable identity anchor objects

The first source-aware evidence model should treat these Airtable-origin objects as identity anchors:

- `Member Companies`
- `Personnel`
- `Internal Application Review`
- `Customer Discovery`

These tables provide the operating context that tells us:

- which company the submission likely belongs to
- which founder or team member it likely belongs to
- whether the submission lives inside Builder / OM program operations rather than generic external intake

## Source-aware layers

The model should stay layered.

### Layer 1: raw source capture

Objects:

- `sourceSubmissions`

Purpose:

- immutable source payload store
- exact provenance from Jotform
- match candidates but no claim yet that the record is canonical venture evidence

### Layer 2: review and resolution

Objects:

- `ingestionReviewQueue`

Purpose:

- staff-only resolution lane for weak matches, collisions, malformed records, and normalization decisions

### Layer 3: canonical evidence vault

Objects:

- `interviews`
- `discoveryPlans` or `interviewGuides`
- `evidenceArtifacts`

Purpose:

- normalized, identity-linked, source-aware evidence that founders, staff, mentors, copilot flows, and unlock logic can trust

## Proposed schema additions

### `SourceSubmission`

Purpose:

- raw source payload with exact upstream provenance

Recommended fields:

- `id`
- `sourceSystem`
- `sourceFormId`
- `sourceFormTitle`
- `sourceSubmissionId`
- `sourceSubmittedAt`
- `sourceUpdatedAt`
- `sourceSubmitterName`
- `sourceSubmitterEmail`
- `sourceCompanyText`
- `sourceFounderText`
- `rawPayload`
- `sourceHash`
- `matchedCompanyId`
- `matchedPersonId`
- `matchConfidence`
- `ingestionStatus`
- `ingestionNotes`
- `normalizedTargets`
- `createdAt`
- `updatedAt`

### `IngestionReviewItem`

Purpose:

- explicit staff review record for source submissions that are unresolved, ambiguous, or awaiting normalization judgment

Recommended fields:

- `id`
- `sourceSubmissionId`
- `status`
- `reviewReason`
- `proposedCompanyId`
- `proposedPersonId`
- `proposedConfidence`
- `reviewedByPersonId`
- `reviewedAt`
- `resolutionType`
- `resolutionNotes`
- `createdAt`
- `updatedAt`

### `DiscoveryPlan`

Purpose:

- canonical destination for question-set or interview-guide forms that do not yet represent a real customer interview

Recommended fields:

- `id`
- `companyId`
- `personId`
- `title`
- `sourceSummary`
- `questionSet`
- `status`
- `sourceSystem`
- `sourceFormId`
- `sourceFormTitle`
- `sourceSubmissionId`
- `createdAt`
- `updatedAt`

### `EvidenceArtifact`

Purpose:

- source-backed notes and artifacts that should remain attached to the company evidence spine without pretending to be an interview, assumption, or signal

Recommended fields:

- `id`
- `companyId`
- `personId`
- `artifactType`
- `title`
- `body`
- `meetingDate`
- `tags`
- `sourceSystem`
- `sourceFormId`
- `sourceFormTitle`
- `sourceSubmissionId`
- `createdAt`
- `updatedAt`

## Normalization model by source lane

### Question-set / discovery-plan lane

Source examples:

- `UL Lafayette - Customer Discovery Questions`

Normalize toward:

- `DiscoveryPlan`
- `EvidenceArtifact`

Do not assume:

- a real interview occurred
- assumptions were validated
- signals exist

### Meeting-notes / Builder-notes lane

Source examples:

- `Builder Notes - Template`
- `Builder 2.0 Template`
- `2.0 - Nestor Meeting Notes`

Normalize toward:

- `Interview` when a real customer or mentor/founder interaction is clearly described
- `EvidenceArtifact` for source-backed notes that should remain attached but not over-interpreted

Do not force:

- experiments
- traction signals
- assumptions

unless the source structure and content truly support them.

## Provenance rules for canonical evidence

Every normalized record produced from Jotform should keep provenance fields that point back to the raw source.

Minimum provenance fields:

- `sourceSystem`
- `sourceFormId`
- `sourceFormTitle`
- `sourceSubmissionId`

This lets OM Venture OS be the canonical vault without losing trust in where the evidence came from.

## Matching and review policy

### Strong match path

If company and person matches are high-confidence and the source lane is clear:

- create or update `SourceSubmission`
- mark it `ready_to_normalize`
- normalize to the appropriate canonical evidence object
- retain source provenance

### Ambiguous match path

If either company or person match is weak:

- create or update `SourceSubmission`
- open an `IngestionReviewItem`
- mark the raw submission `needs_review`
- do not normalize until staff resolves the match

### Ignored path

If the form is operational noise or irrelevant to the evidence vault:

- preserve the raw submission
- mark it `ignored`
- keep the audit trail

## Dedupe model

The evidence vault should dedupe in two places.

### Raw dedupe

Uniqueness:

- `sourceSystem + sourceFormId + sourceSubmissionId`

### Canonical dedupe

Uniqueness should also check:

- normalized target type
- source submission id
- matched company id
- matched person id when available

If a canonical record for the same source and target already exists:

- update or no-op
- do not silently create duplicates

## Workflow impact

Once this model exists:

- OM staff gets a source-aware evidence intake review lane
- founders can eventually see canonical evidence without seeing raw ingestion complexity
- mentors can later inherit better company context from normalized evidence rather than generic notes
- unlock logic can rely on canonical evidence instead of brittle upstream interpretation

## Recommended implementation order

1. Add the raw source layer: `SourceSubmission`.
2. Add the unresolved-review layer: `IngestionReviewItem`.
3. Build the staff evidence intake review surface.
4. Normalize meeting-note submissions first.
5. Add `DiscoveryPlan` / `InterviewGuide` support next.
6. Rebuild founder surfaces around canonical evidence and unlock state after normalization is working.
