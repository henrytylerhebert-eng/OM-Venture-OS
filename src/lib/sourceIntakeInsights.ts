import {
  Company,
  IngestionReviewItem,
  IngestionReviewReason,
  Person,
  SourceIngestionStatus,
  SourceMatchConfidence,
  SourceSubmission,
  SourceSubmissionLane,
  type SourcePayloadValue,
} from '../types';

export type SourceEvidenceUsefulness =
  | 'useful_evidence'
  | 'weak_evidence'
  | 'likely_duplicate_noise';

export type SourceReviewDisplayState =
  | 'raw_source_evidence'
  | 'unresolved'
  | 'likely_duplicate'
  | 'weak_evidence'
  | 'ready_to_normalize'
  | 'normalized'
  | 'ignored';

export interface SourceIntakeReviewRow {
  id: string;
  sourceFormTitle: string;
  sourceSubmittedAt?: string;
  sourceFounderText?: string;
  sourceCompanyText?: string;
  sourceSubmissionDateLabel: string;
  proposedCompanyMatch?: string;
  proposedFounderMatch?: string;
  matchConfidence: SourceMatchConfidence;
  submissionType: SourceSubmissionLane;
  submissionTypeLabel: string;
  evidenceUsefulness: SourceEvidenceUsefulness;
  currentIngestionStatus: SourceIngestionStatus;
  displayState: SourceReviewDisplayState;
  statusLabel: string;
  staffNotes?: string;
  nextAction: string;
  actionNeeded?: string;
  isLikelyDuplicate: boolean;
  reviewReason?: IngestionReviewReason;
  payloadPreview: Array<{ key: string; value: string }>;
}

export interface SourceIntakeReviewSummary {
  total: number;
  unresolved: number;
  likelyDuplicate: number;
  weakEvidence: number;
  readyToNormalize: number;
  normalized: number;
}

const formatPayloadValue = (value: SourcePayloadValue): string => {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatPayloadValue(entry))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .slice(0, 3)
      .map(([key, nestedValue]) => `${key}: ${formatPayloadValue(nestedValue)}`)
      .join(' | ');
  }
  return String(value);
};

const buildPayloadPreview = (payload: Record<string, SourcePayloadValue>) =>
  Object.entries(payload)
    .filter(([, value]) => {
      if (value === null) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object') {
        return Object.keys(value).length > 0;
      }
      return true;
    })
    .slice(0, 6)
    .map(([key, value]) => ({
      key,
      value: formatPayloadValue(value),
    }));

const meaningfulPayloadFieldCount = (payload: Record<string, SourcePayloadValue>) =>
  buildPayloadPreview(payload).length;

const submissionTypeLabelMap: Record<SourceSubmissionLane, string> = {
  [SourceSubmissionLane.DISCOVERY_PLAN]: 'Discovery Plan / Question Set',
  [SourceSubmissionLane.MEETING_NOTES]: 'Meeting-Level Notes / Builder Notes',
};

const buildUsefulness = ({
  submission,
  reviewItem,
  isLikelyDuplicate,
}: {
  submission: SourceSubmission;
  reviewItem?: IngestionReviewItem;
  isLikelyDuplicate: boolean;
}): SourceEvidenceUsefulness => {
  if (isLikelyDuplicate || reviewItem?.reviewReason === IngestionReviewReason.CANONICAL_COLLISION) {
    return 'likely_duplicate_noise';
  }

  const payloadStrength = meaningfulPayloadFieldCount(submission.rawPayload);
  const hasIdentityText = Boolean(submission.sourceCompanyText?.trim() && submission.sourceFounderText?.trim());
  const hasMeetingContext = Boolean(submission.sourceMeetingDate || submission.sourceTopicText);

  if (payloadStrength < 3 || (!hasIdentityText && !hasMeetingContext)) {
    return 'weak_evidence';
  }

  return 'useful_evidence';
};

const buildDisplayState = ({
  submission,
  usefulness,
  isLikelyDuplicate,
}: {
  submission: SourceSubmission;
  usefulness: SourceEvidenceUsefulness;
  isLikelyDuplicate: boolean;
}): SourceReviewDisplayState => {
  if (submission.ingestionStatus === SourceIngestionStatus.IGNORED) {
    return 'ignored';
  }
  if (submission.ingestionStatus === SourceIngestionStatus.NORMALIZED) {
    return 'normalized';
  }
  if (submission.ingestionStatus === SourceIngestionStatus.READY_TO_NORMALIZE) {
    return 'ready_to_normalize';
  }
  if (isLikelyDuplicate) {
    return 'likely_duplicate';
  }
  if (usefulness === 'weak_evidence') {
    return 'weak_evidence';
  }
  if (
    submission.ingestionStatus === SourceIngestionStatus.NEEDS_REVIEW ||
    submission.matchConfidence === SourceMatchConfidence.UNRESOLVED
  ) {
    return 'unresolved';
  }
  return 'raw_source_evidence';
};

const statusLabelMap: Record<SourceReviewDisplayState, string> = {
  raw_source_evidence: 'Raw Source Evidence',
  unresolved: 'Unresolved',
  likely_duplicate: 'Likely Duplicate',
  weak_evidence: 'Weak Evidence',
  ready_to_normalize: 'Ready to Normalize',
  normalized: 'Normalized',
  ignored: 'Ignored',
};

const buildNextAction = ({
  displayState,
  reviewItem,
}: {
  displayState: SourceReviewDisplayState;
  reviewItem?: IngestionReviewItem;
}) => {
  if (reviewItem?.actionNeeded?.trim()) {
    return reviewItem.actionNeeded;
  }

  switch (displayState) {
    case 'ready_to_normalize':
      return 'Confirm the identity anchors and move this source evidence into canonical interviews or evidence artifacts.';
    case 'likely_duplicate':
      return 'Check the duplicate collision before normalizing or ignoring the weaker record.';
    case 'weak_evidence':
      return 'Decide whether this source note is too thin to normalize or still useful as a linked artifact.';
    case 'unresolved':
      return 'Resolve the founder/company match before any normalization decision is made.';
    case 'normalized':
      return 'Normalization is complete. Review the canonical record instead of reworking the raw submission.';
    case 'ignored':
      return 'Ignored submissions stay in the audit trail but should not re-enter canonical evidence without a new review.';
    default:
      return 'Review the raw source evidence and decide whether it is useful, weak, duplicate, or ready to normalize.';
  }
};

export const buildSourceIntakeReviewRows = ({
  submissions,
  reviewItems,
  companies,
  people,
}: {
  submissions: SourceSubmission[];
  reviewItems: IngestionReviewItem[];
  companies: Company[];
  people: Person[];
}): SourceIntakeReviewRow[] => {
  const hashCounts = submissions.reduce<Record<string, number>>((acc, submission) => {
    if (submission.sourceHash) {
      acc[submission.sourceHash] = (acc[submission.sourceHash] || 0) + 1;
    }
    return acc;
  }, {});

  return submissions
    .map((submission) => {
      const reviewItem = reviewItems.find((item) => item.sourceSubmissionId === submission.id);
      const matchedCompany = companies.find((company) => company.id === (reviewItem?.proposedCompanyId || submission.matchedCompanyId));
      const matchedPerson = people.find((person) => person.id === (reviewItem?.proposedPersonId || submission.matchedPersonId));
      const isLikelyDuplicate =
        Boolean(submission.sourceHash && hashCounts[submission.sourceHash] > 1) ||
        reviewItem?.reviewReason === IngestionReviewReason.CANONICAL_COLLISION;
      const usefulness = buildUsefulness({ submission, reviewItem, isLikelyDuplicate });
      const displayState = buildDisplayState({ submission, usefulness, isLikelyDuplicate });

      return {
        id: submission.id,
        sourceFormTitle: submission.sourceFormTitle,
        sourceSubmittedAt: submission.sourceSubmittedAt,
        sourceFounderText: submission.sourceFounderText || submission.sourceSubmitterName,
        sourceCompanyText: submission.sourceCompanyText,
        sourceSubmissionDateLabel: submission.sourceSubmittedAt || submission.sourceMeetingDate || 'Date unavailable',
        proposedCompanyMatch: matchedCompany?.name,
        proposedFounderMatch: matchedPerson?.fullName,
        matchConfidence: reviewItem?.proposedConfidence || submission.matchConfidence,
        submissionType: submission.sourceLane,
        submissionTypeLabel: submissionTypeLabelMap[submission.sourceLane],
        evidenceUsefulness: usefulness,
        currentIngestionStatus: submission.ingestionStatus,
        displayState,
        statusLabel: statusLabelMap[displayState],
        staffNotes: submission.ingestionNotes || reviewItem?.resolutionNotes,
        nextAction: buildNextAction({ displayState, reviewItem }),
        actionNeeded: reviewItem?.actionNeeded,
        isLikelyDuplicate,
        reviewReason: reviewItem?.reviewReason,
        payloadPreview: buildPayloadPreview(submission.rawPayload),
      };
    })
    .sort((left, right) => {
      const priority: Record<SourceReviewDisplayState, number> = {
        unresolved: 0,
        likely_duplicate: 1,
        weak_evidence: 2,
        ready_to_normalize: 3,
        raw_source_evidence: 4,
        normalized: 5,
        ignored: 6,
      };

      const stateDelta = priority[left.displayState] - priority[right.displayState];
      if (stateDelta !== 0) {
        return stateDelta;
      }

      const leftDate = left.sourceSubmittedAt ? new Date(left.sourceSubmittedAt).getTime() : 0;
      const rightDate = right.sourceSubmittedAt ? new Date(right.sourceSubmittedAt).getTime() : 0;
      return rightDate - leftDate;
    });
};

export const summarizeSourceIntakeReviewRows = (rows: SourceIntakeReviewRow[]): SourceIntakeReviewSummary => ({
  total: rows.length,
  unresolved: rows.filter((row) => row.displayState === 'unresolved').length,
  likelyDuplicate: rows.filter((row) => row.displayState === 'likely_duplicate').length,
  weakEvidence: rows.filter((row) => row.displayState === 'weak_evidence').length,
  readyToNormalize: rows.filter((row) => row.displayState === 'ready_to_normalize').length,
  normalized: rows.filter((row) => row.displayState === 'normalized').length,
});
