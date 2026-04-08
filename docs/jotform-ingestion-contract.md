# Jotform Ingestion Contract

This document defines the first disciplined Jotform-to-OM Venture OS ingestion contract for founder customer discovery data.

It exists to keep three truths separate:

- Airtable is the identity and operating anchor for Opportunity Machine.
- Jotform is the live source intake layer for customer discovery and Builder-related note capture.
- OM Venture OS should become the canonical evidence vault.

## Source-of-truth rule

Use the repo, the live Airtable structure, the live Jotform structure, and [live-airtable-source-contract.md](/Users/tylerhebert/Documents/OM%20Venture%20OS/docs/live-airtable-source-contract.md) as product truth.

When provenance, ingestion, matching, reconciliation, or sync logic is involved:

- preserve exact Airtable table titles
- preserve exact Jotform form titles
- do not rename Airtable-origin or Jotform-origin concepts in raw ingestion layers
- use internal canonical names only for implementation clarity
- keep Builder workflow language when describing how evidence is captured and reviewed

## System roles

### Airtable

Role:

- identity and operating anchor
- source of company, founder, staff, membership, and operating context

Primary tables for matching and review:

- `Member Companies`
- `Personnel`
- `Internal Application Review`
- `Customer Discovery`

### Jotform

Role:

- upstream source intake for customer discovery and Builder-related note capture

Representative live forms discovered:

- `UL Lafayette - Customer Discovery Questions`
- `Builder Notes - Template`
- `Builder 2.0 Template`
- `2.0 - Nestor Meeting Notes`

### OM Venture OS

Role:

- canonical evidence vault
- destination for normalized, identity-linked, source-aware evidence objects
- system that separates raw source capture from canonical venture evidence

## First ingestion lanes

The first Jotform ingestion contract should explicitly separate at least two lanes.

### Lane 1: discovery-plan / question-set forms

Meaning:

- structured question sets
- interview planning sheets
- discovery prompts or interview guides

Representative live form:

- `UL Lafayette - Customer Discovery Questions`

Likely source characteristics:

- founder or student submitter name
- team name / company text
- question prompts and answers
- planning or interview-prep content rather than one meeting record

Canonical OM destination candidates:

- `sourceSubmissions`
- `discoveryPlans`
- `interviewGuides`
- `evidenceArtifacts`
- `ingestionReviewQueue`

### Lane 2: meeting-level notes / builder-notes forms

Meaning:

- meeting notes
- Builder progress notes
- founder/mentor/staff feedback after a real interaction
- goal-tracker style updates tied to a founder or company

Representative live forms:

- `Builder Notes - Template`
- `Builder 2.0 Template`
- `2.0 - Nestor Meeting Notes`

Observed field examples from live forms:

- `Who did you meet?`
- `Your Name`
- `Meeting date`
- `Meeting Topic`
- `Meeting Notes`
- `Feedback to Share With Company`
- `Feedback to share with OM Staff:`
- `Date this meeting occurred`
- `List below the STARTUP TEAM MEMBERS that participated in the meeting`

Canonical OM destination candidates:

- `sourceSubmissions`
- `interviews`
- `evidenceArtifacts`
- `linkedNotes`
- `ingestionReviewQueue`

## Raw ingestion layer

All incoming Jotform material should land in a raw ingestion layer before it becomes canonical evidence.

### Required raw fields

| Field | Meaning |
| --- | --- |
| `sourceSystem` | Source platform, initially `jotform` |
| `sourceFormId` | Exact Jotform form id |
| `sourceFormTitle` | Exact Jotform form title |
| `sourceSubmissionId` | Exact Jotform submission id |
| `rawPayload` | Full raw response payload as received from Jotform |
| `sourceCompanyText` | Company/team text as written in the source submission |
| `sourceFounderText` | Founder/submitter text as written in the source submission |
| `matchedCompanyId` | OM Venture OS company id candidate, if matched |
| `matchedPersonId` | OM Venture OS person id candidate, if matched |
| `matchConfidence` | Derived confidence score or bucket for the current proposed match |
| `ingestionStatus` | Current ingestion state such as `received`, `matched`, `needs_review`, `normalized`, `ignored` |
| `ingestionNotes` | Staff or system notes about matching, ambiguity, or normalization decisions |

### Recommended additional raw fields

- `sourceSubmittedAt`
- `sourceUpdatedAt`
- `sourceSubmitterEmail`
- `sourceSubmitterName`
- `sourceMeetingDate`
- `sourceTopicText`
- `sourceQuestionSetType`
- `sourceHash`
- `matchedBy`
- `matchedAt`
- `normalizedAt`
- `normalizedTargets`

## Canonical OM Venture OS targets

The first contract should assume these destination objects.

### `sourceSubmissions`

Purpose:

- raw immutable source capture with provenance
- never treated as canonical founder evidence on its own

### `ingestionReviewQueue`

Purpose:

- explicit unresolved-review surface for staff
- tracks ambiguous matches, weak source quality, and normalization readiness

### `interviews`

Purpose:

- canonical customer discovery meeting record
- only created when a meeting-level note submission is confidently matched and grounded enough

### `discoveryPlans` or `interviewGuides`

Purpose:

- canonical planning-layer artifacts for question-set or interview-guide forms
- should stay separate from actual interview records

### `evidenceArtifacts`

Purpose:

- structured home for source-backed notes, attachments, summaries, and supporting materials that do not cleanly become interviews, assumptions, experiments, or signals

## Matching hierarchy

Matching should be identity-first and Airtable-anchored.

### Company matching order

1. Explicit OM company id or Airtable-origin linked id if it exists in source payload.
2. Exact company match against `Member Companies`.
3. Exact linked company context from `Customer Discovery` if present.
4. Exact company/application linkage through `Internal Application Review` if the form is membership- or Builder-linked.
5. High-confidence normalized name match against known company aliases from Airtable-derived records.
6. If more than one plausible company remains, send to manual review.

### Person matching order

1. Exact email match against `Personnel`.
2. Exact person id or Airtable-origin linked id if present in source payload.
3. Exact full-name match against `Personnel` scoped to the matched company when possible.
4. Exact founder/team-member match from `Internal Application Review` or company-linked `Personnel`.
5. If the submitter could map to multiple people, send to manual review.

### Submission confidence buckets

- `high`: exact id or exact email and clear company alignment
- `medium`: exact company plus plausible name match, or exact person plus plausible company match
- `low`: fuzzy name/company inference only
- `unresolved`: no safe match or multiple plausible matches

## Dedupe rules

### Raw source dedupe

The raw source record should be unique on:

- `sourceSystem`
- `sourceFormId`
- `sourceSubmissionId`

Never create two `sourceSubmissions` for the same Jotform submission id.

### Payload-level duplicate protection

Also store a `sourceHash` so duplicate re-imports or replayed exports can be identified even if the same payload is encountered through different ingestion runs.

### Normalization dedupe

For canonical evidence:

- a single raw submission can normalize to multiple canonical targets only when that split is explicit and intentional
- every normalized record should retain `sourceSubmissionId`
- if a canonical target already exists for the same source submission and same target type, do not create another

### Meeting-note dedupe guidance

Treat the following as a likely duplicate fingerprint:

- same matched company
- same source form title
- same source meeting date or submission date
- same submitter
- substantially identical note body or source hash

### Discovery-plan dedupe guidance

Treat the following as a likely duplicate fingerprint:

- same matched company
- same source form title
- same submitter
- same question-set answer payload or source hash

## Unresolved-review workflow

Ambiguous source evidence should not silently normalize.

### `ingestionStatus` states

- `received`
- `matched`
- `needs_review`
- `ready_to_normalize`
- `normalized`
- `ignored`

### Manual review triggers

Send a source submission to manual review when:

- no company match is confident enough
- no person match is confident enough
- company and person match disagree
- the same source submission appears to collide with an existing canonical record
- the form content is too weak or too malformed to normalize safely
- the submission belongs to a legacy Builder program context that needs explicit staff interpretation

### Manual review actions

Staff should be able to:

- accept the proposed company match
- accept the proposed person match
- override either match
- mark the submission as `ready_to_normalize`
- mark the submission as `ignored`
- add review notes explaining why

## Proposed schema additions

The first contract implies these additions.

### Raw-layer additions

- `SourceSubmission`
- `IngestionReviewItem`

### Canonical-layer additions

- `DiscoveryPlan` or `InterviewGuide`
- `EvidenceArtifact`

### Provenance additions on normalized records

- `sourceSystem`
- `sourceFormId`
- `sourceFormTitle`
- `sourceSubmissionId`
- `normalizedFromSourceSubmissionId`

## Recommended implementation order

1. Add source-contract docs and evidence-vault model docs.
2. Implement raw `sourceSubmissions` and `ingestionReviewQueue`.
3. Build a staff-only evidence intake review surface inside the OM staff console.
4. Normalize meeting-level notes into canonical evidence first.
5. Normalize discovery-plan / question-set forms after the meeting-note lane is stable.
6. Add live Jotform pull only after raw ingestion, review, and normalization are trustworthy.

## Explicit non-goals for this phase

- no live Jotform sync yet
- no live Airtable sync yet
- no investor workflow
- no generic CRM intake abstractions
- no automatic normalization of ambiguous source evidence
