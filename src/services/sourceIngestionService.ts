import {
  QueryConstraint,
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Company,
  IngestionResolutionType,
  IngestionReviewItem,
  IngestionReviewReason,
  IngestionReviewStatus,
  NormalizedTargetType,
  Person,
  SourceIngestionStatus,
  SourceMatchCandidate,
  SourceMatchConfidence,
  SourceSubmission,
  SourceSubmissionLane,
  SourceSubmissionMatchResult,
  SourceSystem,
  type SourcePayloadValue,
} from '../types';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';

type SourceSubmissionCreateInput = Omit<
  SourceSubmission,
  'id' | 'createdAt' | 'updatedAt' | 'normalizedTargets' | 'sourceHash' | 'matchConfidence' | 'ingestionStatus'
> & {
  sourceHash?: string;
  normalizedTargets?: SourceSubmission['normalizedTargets'];
  matchConfidence?: SourceMatchConfidence;
  ingestionStatus?: SourceIngestionStatus;
};

type IngestionReviewCreateInput = Omit<IngestionReviewItem, 'id' | 'createdAt' | 'updatedAt'>;

const stableStringify = (value: SourcePayloadValue | Record<string, SourcePayloadValue>): string => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, SourcePayloadValue>)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const buildSourceHash = (payload: Record<string, SourcePayloadValue>) => stableStringify(payload);

const normalizeName = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

const normalizeEmail = (value?: string | null) => (value || '').toLowerCase().trim();

const uniqueCandidates = (candidates: SourceMatchCandidate[]) => {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) {
      return false;
    }
    seen.add(candidate.id);
    return true;
  });
};

const confidenceRank: Record<SourceMatchConfidence, number> = {
  [SourceMatchConfidence.HIGH]: 3,
  [SourceMatchConfidence.MEDIUM]: 2,
  [SourceMatchConfidence.LOW]: 1,
  [SourceMatchConfidence.UNRESOLVED]: 0,
};

const sortCandidates = (candidates: SourceMatchCandidate[]) =>
  [...candidates].sort((left, right) => {
    const confidenceDelta = confidenceRank[right.confidence] - confidenceRank[left.confidence];
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }
    return left.label.localeCompare(right.label);
  });

const pickResolvedCandidate = (candidates: SourceMatchCandidate[]) => {
  const sorted = sortCandidates(candidates);
  if (sorted.length === 0) {
    return undefined;
  }

  if (sorted.length === 1) {
    return sorted[0];
  }

  const [top, second] = sorted;
  if (confidenceRank[top.confidence] > confidenceRank[second.confidence] && top.confidence !== SourceMatchConfidence.LOW) {
    return top;
  }

  return undefined;
};

const deriveCompanyCandidates = (
  submission: SourceSubmission,
  companies: Company[],
  people: Person[]
): SourceMatchCandidate[] => {
  const normalizedCompanyText = normalizeName(submission.sourceCompanyText);
  const normalizedFounderText = normalizeName(submission.sourceFounderText || submission.sourceSubmitterName);
  const normalizedSubmitterEmail = normalizeEmail(submission.sourceSubmitterEmail);

  const candidates = companies.flatMap((company) => {
    const candidateReasons: SourceMatchCandidate[] = [];
    const normalizedCompanyName = normalizeName(company.name);

    if (normalizedCompanyText && normalizedCompanyName === normalizedCompanyText) {
      candidateReasons.push({
        id: company.id,
        label: company.name,
        confidence: SourceMatchConfidence.HIGH,
        reason: 'Exact company-name match against Airtable-anchored company identity.',
      });
    } else if (
      normalizedCompanyText &&
      (normalizedCompanyName.includes(normalizedCompanyText) || normalizedCompanyText.includes(normalizedCompanyName))
    ) {
      candidateReasons.push({
        id: company.id,
        label: company.name,
        confidence: SourceMatchConfidence.LOW,
        reason: 'Partial company-name overlap needs staff review.',
      });
    }

    const founderLead = people.find((person) => person.id === company.founderLeadPersonId);
    if (founderLead) {
      const founderName = normalizeName(founderLead.fullName);
      const founderEmail = normalizeEmail(founderLead.primaryEmail);

      if (!normalizedCompanyText && normalizedFounderText && founderName === normalizedFounderText) {
        candidateReasons.push({
          id: company.id,
          label: company.name,
          confidence: SourceMatchConfidence.MEDIUM,
          reason: 'Founder name aligns to the founder lead for this company.',
        });
      }

      if (!normalizedCompanyText && normalizedSubmitterEmail && founderEmail === normalizedSubmitterEmail) {
        candidateReasons.push({
          id: company.id,
          label: company.name,
          confidence: SourceMatchConfidence.HIGH,
          reason: 'Submitter email matches the founder lead for this company.',
        });
      }
    }

    return candidateReasons;
  });

  return uniqueCandidates(sortCandidates(candidates));
};

const derivePersonCandidates = (
  submission: SourceSubmission,
  people: Person[],
  matchedCompanyId?: string,
  companies: Company[] = []
): SourceMatchCandidate[] => {
  const normalizedFounderText = normalizeName(submission.sourceFounderText || submission.sourceSubmitterName);
  const normalizedSubmitterEmail = normalizeEmail(submission.sourceSubmitterEmail);
  const matchedCompany = matchedCompanyId ? companies.find((company) => company.id === matchedCompanyId) : undefined;

  const candidates = people.flatMap((person) => {
    const personCandidates: SourceMatchCandidate[] = [];
    const normalizedFullName = normalizeName(person.fullName);
    const normalizedPrimaryEmail = normalizeEmail(person.primaryEmail);

    if (normalizedSubmitterEmail && normalizedPrimaryEmail === normalizedSubmitterEmail) {
      personCandidates.push({
        id: person.id,
        label: person.fullName,
        confidence: matchedCompany?.founderLeadPersonId === person.id ? SourceMatchConfidence.HIGH : SourceMatchConfidence.MEDIUM,
        reason:
          matchedCompany?.founderLeadPersonId === person.id
            ? 'Exact email match and founder lead alignment.'
            : 'Exact email match against Airtable-anchored Personnel.',
      });
    } else if (normalizedFounderText && normalizedFullName === normalizedFounderText) {
      personCandidates.push({
        id: person.id,
        label: person.fullName,
        confidence:
          matchedCompany?.founderLeadPersonId === person.id || matchedCompany?.organizationId === person.organizationId
            ? SourceMatchConfidence.MEDIUM
            : SourceMatchConfidence.LOW,
        reason:
          matchedCompany?.founderLeadPersonId === person.id || matchedCompany?.organizationId === person.organizationId
            ? 'Exact founder-name match with company context.'
            : 'Exact founder-name match without strong company context.',
      });
    }

    return personCandidates;
  });

  return uniqueCandidates(sortCandidates(candidates));
};

const normalizeSourceSubmission = (
  data: Partial<SourceSubmission> & { id: string }
): SourceSubmission => ({
  id: data.id,
  sourceSystem: data.sourceSystem === SourceSystem.AIRTABLE ? SourceSystem.AIRTABLE : SourceSystem.JOTFORM,
  sourceLane:
    data.sourceLane === SourceSubmissionLane.DISCOVERY_PLAN
      ? SourceSubmissionLane.DISCOVERY_PLAN
      : SourceSubmissionLane.MEETING_NOTES,
  sourceFormId: typeof data.sourceFormId === 'string' ? data.sourceFormId : '',
  sourceFormTitle: typeof data.sourceFormTitle === 'string' ? data.sourceFormTitle : '',
  sourceSubmissionId: typeof data.sourceSubmissionId === 'string' ? data.sourceSubmissionId : '',
  sourceSubmittedAt: typeof data.sourceSubmittedAt === 'string' ? data.sourceSubmittedAt : undefined,
  sourceUpdatedAt: typeof data.sourceUpdatedAt === 'string' ? data.sourceUpdatedAt : undefined,
  sourceSubmitterName: typeof data.sourceSubmitterName === 'string' ? data.sourceSubmitterName : undefined,
  sourceSubmitterEmail: typeof data.sourceSubmitterEmail === 'string' ? data.sourceSubmitterEmail : undefined,
  sourceCompanyText: typeof data.sourceCompanyText === 'string' ? data.sourceCompanyText : undefined,
  sourceFounderText: typeof data.sourceFounderText === 'string' ? data.sourceFounderText : undefined,
  sourceMeetingDate: typeof data.sourceMeetingDate === 'string' ? data.sourceMeetingDate : undefined,
  sourceTopicText: typeof data.sourceTopicText === 'string' ? data.sourceTopicText : undefined,
  sourceQuestionSetType: typeof data.sourceQuestionSetType === 'string' ? data.sourceQuestionSetType : undefined,
  rawPayload:
    data.rawPayload && typeof data.rawPayload === 'object' && !Array.isArray(data.rawPayload)
      ? (data.rawPayload as Record<string, SourcePayloadValue>)
      : {},
  sourceHash:
    typeof data.sourceHash === 'string' && data.sourceHash.trim()
      ? data.sourceHash
      : buildSourceHash(
          data.rawPayload && typeof data.rawPayload === 'object' && !Array.isArray(data.rawPayload)
            ? (data.rawPayload as Record<string, SourcePayloadValue>)
            : {}
        ),
  matchedCompanyId: typeof data.matchedCompanyId === 'string' ? data.matchedCompanyId : undefined,
  matchedPersonId: typeof data.matchedPersonId === 'string' ? data.matchedPersonId : undefined,
  matchConfidence:
    Object.values(SourceMatchConfidence).includes(data.matchConfidence as SourceMatchConfidence)
      ? (data.matchConfidence as SourceMatchConfidence)
      : SourceMatchConfidence.UNRESOLVED,
  ingestionStatus:
    Object.values(SourceIngestionStatus).includes(data.ingestionStatus as SourceIngestionStatus)
      ? (data.ingestionStatus as SourceIngestionStatus)
      : SourceIngestionStatus.RECEIVED,
  ingestionNotes: typeof data.ingestionNotes === 'string' ? data.ingestionNotes : undefined,
  normalizedTargets: Array.isArray(data.normalizedTargets) ? data.normalizedTargets : [],
  matchedByPersonId: typeof data.matchedByPersonId === 'string' ? data.matchedByPersonId : undefined,
  matchedAt: typeof data.matchedAt === 'string' ? data.matchedAt : undefined,
  normalizedAt: typeof data.normalizedAt === 'string' ? data.normalizedAt : undefined,
  createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : typeof data.createdAt === 'string' ? data.createdAt : '',
});

const normalizeReviewItem = (
  data: Partial<IngestionReviewItem> & { id: string }
): IngestionReviewItem => ({
  id: data.id,
  sourceSubmissionId: typeof data.sourceSubmissionId === 'string' ? data.sourceSubmissionId : '',
  status:
    data.status === IngestionReviewStatus.RESOLVED ? IngestionReviewStatus.RESOLVED : IngestionReviewStatus.OPEN,
  reviewReason:
    Object.values(IngestionReviewReason).includes(data.reviewReason as IngestionReviewReason)
      ? (data.reviewReason as IngestionReviewReason)
      : IngestionReviewReason.MALFORMED_SUBMISSION,
  actionNeeded: typeof data.actionNeeded === 'string' ? data.actionNeeded : '',
  proposedCompanyId: typeof data.proposedCompanyId === 'string' ? data.proposedCompanyId : undefined,
  proposedPersonId: typeof data.proposedPersonId === 'string' ? data.proposedPersonId : undefined,
  proposedConfidence:
    Object.values(SourceMatchConfidence).includes(data.proposedConfidence as SourceMatchConfidence)
      ? (data.proposedConfidence as SourceMatchConfidence)
      : SourceMatchConfidence.UNRESOLVED,
  reviewedByPersonId: typeof data.reviewedByPersonId === 'string' ? data.reviewedByPersonId : undefined,
  reviewedAt: typeof data.reviewedAt === 'string' ? data.reviewedAt : undefined,
  resolutionType:
    Object.values(IngestionResolutionType).includes(data.resolutionType as IngestionResolutionType)
      ? (data.resolutionType as IngestionResolutionType)
      : undefined,
  resolutionNotes: typeof data.resolutionNotes === 'string' ? data.resolutionNotes : undefined,
  createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : typeof data.createdAt === 'string' ? data.createdAt : '',
});

const getExistingReviewItem = async (sourceSubmissionId: string) => {
  const snapshot = await getDocs(
    query(collection(db, 'ingestionReviewQueue'), where('sourceSubmissionId', '==', sourceSubmissionId))
  );

  const docSnap = snapshot.docs[0];
  return docSnap ? normalizeReviewItem({ id: docSnap.id, ...docSnap.data() } as IngestionReviewItem) : null;
};

const appendIngestionNotes = (existingNotes: string | undefined, nextNote: string | undefined) => {
  if (!nextNote?.trim()) {
    return existingNotes;
  }

  return existingNotes?.trim() ? `${existingNotes.trim()}\n${nextNote.trim()}` : nextNote.trim();
};

const resolveReviewQueueItem = async (
  sourceSubmissionId: string,
  reviewedByPersonId: string | undefined,
  resolutionType: IngestionResolutionType,
  resolutionNotes?: string
) => {
  const existing = await getExistingReviewItem(sourceSubmissionId);
  if (!existing) {
    return;
  }

    await updateDoc(doc(db, 'ingestionReviewQueue', existing.id), sanitizeData({
    status: IngestionReviewStatus.RESOLVED,
    reviewedByPersonId,
    reviewedAt: new Date().toISOString(),
    resolutionType,
    resolutionNotes: appendIngestionNotes(existing.resolutionNotes, resolutionNotes),
    updatedAt: new Date().toISOString(),
  }));
};

export const getSourceSubmissions = (
  callback: (submissions: SourceSubmission[]) => void,
  constraints: QueryConstraint[] = []
) => {
  const q = query(collection(db, 'sourceSubmissions'), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const submissions = snapshot.docs.map((docSnap) =>
        normalizeSourceSubmission({ id: docSnap.id, ...docSnap.data() } as SourceSubmission)
      );
      callback(submissions);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'sourceSubmissions')
  );
};

export const getIngestionReviewQueue = (
  callback: (items: IngestionReviewItem[]) => void,
  constraints: QueryConstraint[] = []
) => {
  const q = query(collection(db, 'ingestionReviewQueue'), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) =>
        normalizeReviewItem({ id: docSnap.id, ...docSnap.data() } as IngestionReviewItem)
      );
      callback(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'ingestionReviewQueue')
  );
};

export const createSourceSubmission = async (submission: SourceSubmissionCreateInput): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const rawPayload = submission.rawPayload || {};
    const payload = normalizeSourceSubmission({
      id: 'pending',
      ...submission,
      rawPayload,
      sourceHash: submission.sourceHash || buildSourceHash(rawPayload),
      matchConfidence: submission.matchConfidence || SourceMatchConfidence.UNRESOLVED,
      ingestionStatus: submission.ingestionStatus || SourceIngestionStatus.RECEIVED,
      normalizedTargets: submission.normalizedTargets || [],
      createdAt: now,
      updatedAt: now,
    });

    const { id: _ignoredId, ...writePayload } = payload;
    const docRef = await addDoc(collection(db, 'sourceSubmissions'), sanitizeData(writePayload));
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, 'sourceSubmissions');
  }
};

export const createIngestionReviewItem = async (reviewItem: IngestionReviewCreateInput): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const payload = normalizeReviewItem({
      id: 'pending',
      ...reviewItem,
      createdAt: now,
      updatedAt: now,
    });

    const { id: _ignoredId, ...writePayload } = payload;
    const docRef = await addDoc(collection(db, 'ingestionReviewQueue'), sanitizeData(writePayload));
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, 'ingestionReviewQueue');
  }
};

export const matchSourceSubmissionCandidates = (
  submission: SourceSubmission,
  companies: Company[],
  people: Person[]
): SourceSubmissionMatchResult => {
  const companyCandidates = deriveCompanyCandidates(submission, companies, people);
  const resolvedCompany = pickResolvedCandidate(companyCandidates);
  const personCandidates = derivePersonCandidates(submission, people, resolvedCompany?.id, companies);
  const resolvedPerson = pickResolvedCandidate(personCandidates);

  if (companyCandidates.length === 0 && personCandidates.length === 0) {
    return {
      sourceSubmissionId: submission.id,
      companyCandidates,
      personCandidates,
      matchConfidence: SourceMatchConfidence.UNRESOLVED,
      ingestionStatus: SourceIngestionStatus.NEEDS_REVIEW,
      actionNeeded: 'No safe company or founder match was found. Staff review is required.',
      reviewReason: IngestionReviewReason.AMBIGUOUS_COMPANY_MATCH,
    };
  }

  if (resolvedCompany && resolvedPerson) {
    const matchedPerson = people.find((person) => person.id === resolvedPerson.id);
    const matchedCompany = companies.find((company) => company.id === resolvedCompany.id);
    const companyPersonConflict =
      matchedCompany &&
      matchedPerson &&
      matchedCompany.founderLeadPersonId &&
      matchedCompany.founderLeadPersonId !== matchedPerson.id &&
      matchedCompany.organizationId !== matchedPerson.organizationId;

    if (companyPersonConflict) {
      return {
        sourceSubmissionId: submission.id,
        companyCandidates,
        personCandidates,
        matchedCompanyId: resolvedCompany.id,
        matchedPersonId: resolvedPerson.id,
        matchConfidence: SourceMatchConfidence.LOW,
        ingestionStatus: SourceIngestionStatus.NEEDS_REVIEW,
        actionNeeded: 'Company and founder matches disagree. Staff needs to resolve the identity conflict.',
        reviewReason: IngestionReviewReason.MATCH_CONFLICT,
      };
    }

    const overallConfidence =
      resolvedCompany.confidence === SourceMatchConfidence.HIGH && resolvedPerson.confidence === SourceMatchConfidence.HIGH
        ? SourceMatchConfidence.HIGH
        : SourceMatchConfidence.MEDIUM;

    return {
      sourceSubmissionId: submission.id,
      companyCandidates,
      personCandidates,
      matchedCompanyId: resolvedCompany.id,
      matchedPersonId: resolvedPerson.id,
      matchConfidence: overallConfidence,
      ingestionStatus: SourceIngestionStatus.READY_TO_NORMALIZE,
      actionNeeded: 'Identity anchors are strong enough for staff to decide whether this should normalize into canonical evidence.',
    };
  }

  if (resolvedCompany || resolvedPerson) {
    return {
      sourceSubmissionId: submission.id,
      companyCandidates,
      personCandidates,
      matchedCompanyId: resolvedCompany?.id,
      matchedPersonId: resolvedPerson?.id,
      matchConfidence: resolvedCompany?.confidence || resolvedPerson?.confidence || SourceMatchConfidence.LOW,
      ingestionStatus: SourceIngestionStatus.MATCHED,
      actionNeeded: 'One side of the match is promising, but staff still needs to confirm the missing identity anchor.',
      reviewReason: resolvedCompany
        ? IngestionReviewReason.AMBIGUOUS_PERSON_MATCH
        : IngestionReviewReason.AMBIGUOUS_COMPANY_MATCH,
    };
  }

  return {
    sourceSubmissionId: submission.id,
    companyCandidates,
    personCandidates,
    matchConfidence: SourceMatchConfidence.UNRESOLVED,
    ingestionStatus: SourceIngestionStatus.NEEDS_REVIEW,
    actionNeeded: 'Matches are ambiguous. Staff review is required before normalization.',
    reviewReason: IngestionReviewReason.AMBIGUOUS_COMPANY_MATCH,
  };
};

export const applySourceSubmissionMatch = async (
  submissionId: string,
  matchResult: SourceSubmissionMatchResult,
  matchedByPersonId?: string,
  ingestionNotes?: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'sourceSubmissions', submissionId), sanitizeData({
      matchedCompanyId: matchResult.matchedCompanyId || null,
      matchedPersonId: matchResult.matchedPersonId || null,
      matchConfidence: matchResult.matchConfidence,
      ingestionStatus: matchResult.ingestionStatus,
      ingestionNotes,
      matchedByPersonId: matchedByPersonId || null,
      matchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sourceSubmissions/${submissionId}`);
  }
};

export const flagSourceSubmissionForManualReview = async ({
  sourceSubmission,
  matchResult,
  staffNotes,
  reviewedByPersonId,
}: {
  sourceSubmission: SourceSubmission;
  matchResult: SourceSubmissionMatchResult;
  staffNotes?: string;
  reviewedByPersonId?: string;
}): Promise<void> => {
  try {
    await updateDoc(doc(db, 'sourceSubmissions', sourceSubmission.id), sanitizeData({
      matchedCompanyId: matchResult.matchedCompanyId || null,
      matchedPersonId: matchResult.matchedPersonId || null,
      matchConfidence: matchResult.matchConfidence,
      ingestionStatus: SourceIngestionStatus.NEEDS_REVIEW,
      ingestionNotes: appendIngestionNotes(sourceSubmission.ingestionNotes, staffNotes),
      matchedByPersonId: reviewedByPersonId || sourceSubmission.matchedByPersonId || null,
      matchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const existing = await getExistingReviewItem(sourceSubmission.id);
    const reviewPayload = {
      sourceSubmissionId: sourceSubmission.id,
      status: IngestionReviewStatus.OPEN,
      reviewReason: matchResult.reviewReason || IngestionReviewReason.WEAK_CONTENT,
      actionNeeded: matchResult.actionNeeded,
      proposedCompanyId: matchResult.matchedCompanyId,
      proposedPersonId: matchResult.matchedPersonId,
      proposedConfidence: matchResult.matchConfidence,
      reviewedByPersonId,
      reviewedAt: reviewedByPersonId ? new Date().toISOString() : undefined,
      resolutionType: undefined,
      resolutionNotes: undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await updateDoc(doc(db, 'ingestionReviewQueue', existing.id), sanitizeData({
        status: IngestionReviewStatus.OPEN,
        reviewReason: reviewPayload.reviewReason,
        actionNeeded: reviewPayload.actionNeeded,
        proposedCompanyId: reviewPayload.proposedCompanyId || null,
        proposedPersonId: reviewPayload.proposedPersonId || null,
        proposedConfidence: reviewPayload.proposedConfidence,
        reviewedByPersonId: reviewPayload.reviewedByPersonId || null,
        reviewedAt: reviewPayload.reviewedAt || null,
        resolutionType: null,
        resolutionNotes: null,
        updatedAt: reviewPayload.updatedAt,
      }));
    } else {
      const { createdAt, updatedAt, ...newReview } = reviewPayload;
      await addDoc(collection(db, 'ingestionReviewQueue'), sanitizeData({
        ...newReview,
        createdAt,
        updatedAt,
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sourceSubmissions/${sourceSubmission.id}`);
  }
};

export const markSourceSubmissionAsReadyToNormalize = async (
  sourceSubmission: SourceSubmission,
  reviewedByPersonId?: string,
  staffNotes?: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'sourceSubmissions', sourceSubmission.id), sanitizeData({
      ingestionStatus: SourceIngestionStatus.READY_TO_NORMALIZE,
      ingestionNotes: appendIngestionNotes(sourceSubmission.ingestionNotes, staffNotes),
      matchedByPersonId: reviewedByPersonId || sourceSubmission.matchedByPersonId || null,
      matchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await resolveReviewQueueItem(
      sourceSubmission.id,
      reviewedByPersonId,
      IngestionResolutionType.READY_TO_NORMALIZE,
      staffNotes
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sourceSubmissions/${sourceSubmission.id}`);
  }
};

export const markSourceSubmissionAsNormalized = async (
  sourceSubmission: SourceSubmission,
  normalizedTargets: SourceSubmission['normalizedTargets'],
  reviewedByPersonId?: string,
  staffNotes?: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'sourceSubmissions', sourceSubmission.id), sanitizeData({
      ingestionStatus: SourceIngestionStatus.NORMALIZED,
      normalizedTargets,
      normalizedAt: new Date().toISOString(),
      ingestionNotes: appendIngestionNotes(sourceSubmission.ingestionNotes, staffNotes),
      updatedAt: new Date().toISOString(),
    }));

    await resolveReviewQueueItem(
      sourceSubmission.id,
      reviewedByPersonId,
      IngestionResolutionType.READY_TO_NORMALIZE,
      staffNotes
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sourceSubmissions/${sourceSubmission.id}`);
  }
};

export const markSourceSubmissionAsUnresolved = async (
  sourceSubmission: SourceSubmission,
  reviewedByPersonId?: string,
  staffNotes?: string,
  reviewReason: IngestionReviewReason = IngestionReviewReason.WEAK_CONTENT
): Promise<void> => {
  const matchResult: SourceSubmissionMatchResult = {
    sourceSubmissionId: sourceSubmission.id,
    companyCandidates: [],
    personCandidates: [],
    matchedCompanyId: sourceSubmission.matchedCompanyId,
    matchedPersonId: sourceSubmission.matchedPersonId,
    matchConfidence: SourceMatchConfidence.UNRESOLVED,
    ingestionStatus: SourceIngestionStatus.NEEDS_REVIEW,
    actionNeeded: 'Staff review is still required before this source evidence can normalize.',
    reviewReason,
  };

  await flagSourceSubmissionForManualReview({
    sourceSubmission,
    matchResult,
    staffNotes,
    reviewedByPersonId,
  });
};

export const markSourceSubmissionAsIgnored = async (
  sourceSubmission: SourceSubmission,
  reviewedByPersonId?: string,
  staffNotes?: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'sourceSubmissions', sourceSubmission.id), sanitizeData({
      ingestionStatus: SourceIngestionStatus.IGNORED,
      ingestionNotes: appendIngestionNotes(sourceSubmission.ingestionNotes, staffNotes),
      updatedAt: new Date().toISOString(),
    }));

    await resolveReviewQueueItem(sourceSubmission.id, reviewedByPersonId, IngestionResolutionType.IGNORE, staffNotes);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sourceSubmissions/${sourceSubmission.id}`);
  }
};

export const createNormalizedTargetReference = (targetType: NormalizedTargetType, targetId: string) => ({
  targetType,
  targetId,
  normalizedAt: new Date().toISOString(),
});
