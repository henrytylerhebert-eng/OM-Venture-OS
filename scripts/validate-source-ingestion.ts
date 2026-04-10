import assert from 'node:assert/strict';
import { buildSourceIntakeReviewRows, summarizeSourceIntakeReviewRows } from '../src/lib/sourceIntakeInsights';
import {
  buildSourceSubmissionDocumentId,
  matchSourceSubmissionCandidates,
  prepareSourceSubmissionWrite,
} from '../src/services/sourceIngestionService';
import {
  Company,
  IngestionReviewItem,
  IngestionReviewReason,
  IngestionReviewStatus,
  MembershipStatus,
  NormalizedTargetType,
  Person,
  RoleType,
  SourceIngestionStatus,
  SourceMatchConfidence,
  SourceSubmission,
  SourceSubmissionLane,
  SourceSystem,
} from '../src/types';

const now = '2026-04-08T12:00:00.000Z';

const companies: Company[] = [
  {
    id: 'company-1',
    name: 'Acme Health',
    organizationId: 'org-1',
    founderLeadPersonId: 'person-1',
    membershipStatus: MembershipStatus.ACTIVE,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

const people: Person[] = [
  {
    id: 'person-1',
    firstName: 'Taylor',
    lastName: 'Founder',
    fullName: 'Taylor Founder',
    primaryEmail: 'taylor@acmehealth.com',
    organizationId: 'org-1',
    roleType: RoleType.FOUNDER,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

const makeSubmission = (overrides: Partial<SourceSubmission>): SourceSubmission => ({
  id: overrides.id || crypto.randomUUID(),
  sourceSystem: overrides.sourceSystem || SourceSystem.JOTFORM,
  sourceLane: overrides.sourceLane || SourceSubmissionLane.MEETING_NOTES,
  sourceFormId: overrides.sourceFormId || 'form-1',
  sourceFormTitle: overrides.sourceFormTitle || 'Builder Notes - Template',
  sourceSubmissionId: overrides.sourceSubmissionId || crypto.randomUUID(),
  sourceSubmittedAt: overrides.sourceSubmittedAt || now,
  sourceUpdatedAt: overrides.sourceUpdatedAt,
  sourceSubmitterName: overrides.sourceSubmitterName || 'Taylor Founder',
  sourceSubmitterEmail: overrides.sourceSubmitterEmail || 'taylor@acmehealth.com',
  sourceCompanyText: overrides.sourceCompanyText || 'Acme Health',
  sourceFounderText: overrides.sourceFounderText || 'Taylor Founder',
  sourceMeetingDate: overrides.sourceMeetingDate || now,
  sourceTopicText: overrides.sourceTopicText || 'Customer discovery debrief',
  sourceQuestionSetType: overrides.sourceQuestionSetType,
  rawPayload: overrides.rawPayload || {
    meetingTopic: 'Customer discovery debrief',
    meetingNotes: 'Founder summarized three customer pain points and one repeated objection.',
    company: 'Acme Health',
    founder: 'Taylor Founder',
  },
  sourceHash: overrides.sourceHash || 'hash-1',
  matchedCompanyId: overrides.matchedCompanyId,
  matchedPersonId: overrides.matchedPersonId,
  matchConfidence: overrides.matchConfidence || SourceMatchConfidence.UNRESOLVED,
  ingestionStatus: overrides.ingestionStatus || SourceIngestionStatus.RECEIVED,
  ingestionNotes: overrides.ingestionNotes,
  normalizedTargets: overrides.normalizedTargets || [],
  matchedByPersonId: overrides.matchedByPersonId,
  matchedAt: overrides.matchedAt,
  normalizedAt: overrides.normalizedAt,
  createdAt: overrides.createdAt || now,
  updatedAt: overrides.updatedAt || now,
});

const exactMatchResult = matchSourceSubmissionCandidates(makeSubmission({}), companies, people);
assert.equal(exactMatchResult.ingestionStatus, SourceIngestionStatus.READY_TO_NORMALIZE);
assert.equal(exactMatchResult.matchConfidence, SourceMatchConfidence.HIGH);
assert.equal(exactMatchResult.matchedCompanyId, 'company-1');
assert.equal(exactMatchResult.matchedPersonId, 'person-1');

const deterministicDocId = buildSourceSubmissionDocumentId(SourceSystem.JOTFORM, 'form-1', 'submission-1');
assert.equal(deterministicDocId, 'jotform__form-1__submission-1');

const preservedReviewState = prepareSourceSubmissionWrite({
  submission: {
    sourceSystem: SourceSystem.JOTFORM,
    sourceLane: SourceSubmissionLane.MEETING_NOTES,
    sourceImportPath: 'jotform_raw_intake',
    sourceFormId: 'form-1',
    sourceFormTitle: 'Builder Notes - Template',
    sourceSubmissionId: 'submission-1',
    sourceSubmittedAt: now,
    sourceSubmitterName: 'Taylor Founder',
    sourceSubmitterEmail: 'taylor@acmehealth.com',
    sourceCompanyText: 'Acme Health',
    sourceFounderText: 'Taylor Founder',
    sourceMeetingDate: now,
    sourceTopicText: 'Customer discovery debrief',
    rawPayload: {
      meetingTopic: 'Updated notes',
      meetingNotes: 'Updated notes body',
      company: 'Acme Health',
    },
  },
  existing: makeSubmission({
    id: 'existing-source-doc',
    sourceSystem: SourceSystem.JOTFORM,
    sourceLane: SourceSubmissionLane.MEETING_NOTES,
    sourceFormId: 'form-1',
    sourceFormTitle: 'Builder Notes - Template',
    sourceSubmissionId: 'submission-1',
    sourceHash: 'older-hash',
    matchConfidence: SourceMatchConfidence.HIGH,
    ingestionStatus: SourceIngestionStatus.READY_TO_NORMALIZE,
    matchedCompanyId: 'company-1',
    matchedPersonId: 'person-1',
    ingestionNotes: 'Staff reviewed already.',
    normalizedTargets: [],
  }),
  now,
});
assert.equal(preservedReviewState.id, 'jotform__form-1__submission-1');
assert.equal(preservedReviewState.sourceImportPath, 'jotform_raw_intake');
assert.equal(preservedReviewState.ingestionStatus, SourceIngestionStatus.READY_TO_NORMALIZE);
assert.equal(preservedReviewState.matchConfidence, SourceMatchConfidence.HIGH);
assert.equal(preservedReviewState.matchedCompanyId, 'company-1');
assert.equal(preservedReviewState.matchedPersonId, 'person-1');

const unresolvedResult = matchSourceSubmissionCandidates(
  makeSubmission({
    sourceSubmitterName: 'Unknown Founder',
    sourceSubmitterEmail: 'unknown@example.com',
    sourceCompanyText: 'Unknown Company',
    sourceFounderText: 'Unknown Founder',
    rawPayload: { note: 'Too little context' },
    sourceHash: 'hash-2',
  }),
  companies,
  people
);
assert.equal(unresolvedResult.ingestionStatus, SourceIngestionStatus.NEEDS_REVIEW);
assert.equal(unresolvedResult.matchConfidence, SourceMatchConfidence.UNRESOLVED);

const submissions = [
  makeSubmission({
    id: 'submission-ready',
    matchedCompanyId: 'company-1',
    matchedPersonId: 'person-1',
    matchConfidence: SourceMatchConfidence.HIGH,
    ingestionStatus: SourceIngestionStatus.READY_TO_NORMALIZE,
  }),
  makeSubmission({
    id: 'submission-duplicate-a',
    sourceHash: 'dup-hash',
    sourceSubmissionId: 'dup-a',
  }),
  makeSubmission({
    id: 'submission-duplicate-b',
    sourceHash: 'dup-hash',
    sourceSubmissionId: 'dup-b',
    sourceSubmitterEmail: 'another@acmehealth.com',
  }),
  makeSubmission({
    id: 'submission-weak',
    sourceHash: 'hash-weak',
    sourceCompanyText: '',
    sourceFounderText: '',
    sourceSubmitterName: '',
    sourceSubmitterEmail: '',
    sourceTopicText: '',
    rawPayload: { note: 'thin' },
  }),
  makeSubmission({
    id: 'submission-normalized',
    sourceHash: 'hash-normalized',
    ingestionStatus: SourceIngestionStatus.NORMALIZED,
    normalizedTargets: [{ targetType: NormalizedTargetType.INTERVIEW, targetId: 'interview-1', normalizedAt: now }],
  }),
];

const reviewItems: IngestionReviewItem[] = [
  {
    id: 'review-duplicate',
    sourceSubmissionId: 'submission-duplicate-a',
    status: IngestionReviewStatus.OPEN,
    reviewReason: IngestionReviewReason.CANONICAL_COLLISION,
    actionNeeded: 'Check likely duplicate before normalization.',
    proposedCompanyId: 'company-1',
    proposedPersonId: 'person-1',
    proposedConfidence: SourceMatchConfidence.MEDIUM,
    createdAt: now,
    updatedAt: now,
  },
];

const rows = buildSourceIntakeReviewRows({
  submissions,
  reviewItems,
  companies,
  people,
});

assert(rows.some((row) => row.id === 'submission-ready' && row.displayState === 'ready_to_normalize'));
assert(rows.some((row) => row.id === 'submission-duplicate-a' && row.displayState === 'likely_duplicate'));
assert(rows.some((row) => row.id === 'submission-weak' && row.displayState === 'weak_evidence'));
assert(rows.some((row) => row.id === 'submission-normalized' && row.displayState === 'normalized'));

const summary = summarizeSourceIntakeReviewRows(rows);
assert.equal(summary.readyToNormalize, 1);
assert.equal(summary.likelyDuplicate, 2);
assert.equal(summary.weakEvidence, 1);
assert.equal(summary.normalized, 1);

console.log('source ingestion validation scenarios passed');
