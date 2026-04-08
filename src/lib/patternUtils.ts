import { Pattern, PatternStatus, StageConfidence } from '../types';

export interface PatternWidgetSummary {
  strongestPattern: Pattern | null;
  strongPatterns: Pattern[];
  strongestPatterns: Pattern[];
  weakestPatterns: Pattern[];
  lowConfidencePatterns: Pattern[];
  pivotCandidates: Pattern[];
  strongPatternCount: number;
  pivotCandidateCount: number;
}

interface PatternWriteValidationOptions {
  validInterviewIds?: string[];
}

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const toFiniteInteger = (value: unknown, fallback = 0) => Math.max(0, Math.round(toFiniteNumber(value, fallback)));

const normalizeConfidence = (value: unknown): StageConfidence =>
  typeof value === 'string' && Object.values(StageConfidence).includes(value as StageConfidence)
    ? (value as StageConfidence)
    : StageConfidence.LOW;

const normalizeStatus = (value: unknown): PatternStatus =>
  typeof value === 'string' && Object.values(PatternStatus).includes(value as PatternStatus)
    ? (value as PatternStatus)
    : PatternStatus.KEEP;

const normalizeSourceInterviewIds = (sourceInterviewIds: unknown) =>
  Array.from(
    new Set(
      Array.isArray(sourceInterviewIds)
        ? sourceInterviewIds
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean)
        : []
    )
  );

export const normalizePatternRecord = (pattern: Partial<Pattern> & { id: string }): Pattern => {
  const numberOfMentions = toFiniteInteger(pattern.numberOfMentions);
  const averagePainIntensity = clampNumber(toFiniteNumber(pattern.averagePainIntensity), 0, 5);
  const sourceInterviewIds = normalizeSourceInterviewIds(pattern.sourceInterviewIds);

  return {
    id: pattern.id,
    companyId: typeof pattern.companyId === 'string' ? pattern.companyId : '',
    cohortParticipationId:
      typeof pattern.cohortParticipationId === 'string' && pattern.cohortParticipationId.trim()
        ? pattern.cohortParticipationId
        : undefined,
    problemTheme: typeof pattern.problemTheme === 'string' ? pattern.problemTheme.trim() : '',
    numberOfMentions,
    averagePainIntensity,
    unpromptedMentions: clampNumber(toFiniteInteger(pattern.unpromptedMentions), 0, numberOfMentions),
    representativeQuote: typeof pattern.representativeQuote === 'string' ? pattern.representativeQuote.trim() : '',
    confidence: normalizeConfidence(pattern.confidence),
    status: normalizeStatus(pattern.status),
    sourceInterviewIds,
    notes: typeof pattern.notes === 'string' ? pattern.notes.trim() : '',
    createdAt: typeof pattern.createdAt === 'string' ? pattern.createdAt : '',
    updatedAt:
      typeof pattern.updatedAt === 'string'
        ? pattern.updatedAt
        : typeof pattern.createdAt === 'string'
          ? pattern.createdAt
          : '',
    createdByPersonId: typeof pattern.createdByPersonId === 'string' ? pattern.createdByPersonId : '',
  };
};

export const preparePatternWritePayload = (
  pattern: Omit<Pattern, 'id'>,
  options: PatternWriteValidationOptions = {}
): Omit<Pattern, 'id'> => {
  const normalized = normalizePatternRecord({ id: 'pattern-draft', ...pattern });
  const validInterviewIds = options.validInterviewIds
    ? new Set(options.validInterviewIds.map((value) => value.trim()).filter(Boolean))
    : null;

  if (!normalized.companyId.trim()) {
    throw new Error('Patterns must stay attached to a company.');
  }

  if (!normalized.problemTheme) {
    throw new Error('Problem theme is required.');
  }

  if (!normalized.createdByPersonId.trim()) {
    throw new Error('Pattern audit ownership is required.');
  }

  if (!normalized.sourceInterviewIds.length) {
    throw new Error('Patterns must link back to at least one interview.');
  }

  if (validInterviewIds && normalized.sourceInterviewIds.some((interviewId) => !validInterviewIds.has(interviewId))) {
    throw new Error('One or more linked interviews no longer exist for this company.');
  }

  if (!Object.values(StageConfidence).includes(normalized.confidence)) {
    throw new Error('Confidence must be explicitly set to low, medium, or high.');
  }

  if (!Object.values(PatternStatus).includes(normalized.status)) {
    throw new Error('Strategic status must be keep, narrow, or pivot.');
  }

  if (normalized.numberOfMentions < 1) {
    throw new Error('Patterns must include at least one linked interview.');
  }

  if (!Number.isFinite(normalized.averagePainIntensity)) {
    throw new Error('Average pain intensity must be a finite number.');
  }

  if (normalized.unpromptedMentions > normalized.numberOfMentions) {
    throw new Error('Unprompted mentions cannot exceed total mentions.');
  }

  const isStrongPattern =
    normalized.confidence === StageConfidence.HIGH ||
    normalized.numberOfMentions >= 5 ||
    normalized.averagePainIntensity >= 4;

  if (isStrongPattern && !normalized.representativeQuote) {
    throw new Error('Strong patterns must include a representative quote from linked interviews.');
  }

  return {
    ...pattern,
    companyId: normalized.companyId,
    cohortParticipationId: normalized.cohortParticipationId,
    problemTheme: normalized.problemTheme,
    numberOfMentions: normalized.numberOfMentions,
    averagePainIntensity: normalized.averagePainIntensity,
    unpromptedMentions: normalized.unpromptedMentions,
    representativeQuote: normalized.representativeQuote,
    confidence: normalized.confidence,
    status: normalized.status,
    sourceInterviewIds: normalized.sourceInterviewIds,
    notes: normalized.notes || undefined,
    createdByPersonId: normalized.createdByPersonId,
    createdAt: pattern.createdAt,
    updatedAt: pattern.updatedAt,
  };
};

const patternScore = (pattern: Pattern) => {
  const confidenceScore =
    pattern.confidence === StageConfidence.HIGH ? 30 : pattern.confidence === StageConfidence.MEDIUM ? 15 : 0;

  return (
    pattern.numberOfMentions * 5 +
    pattern.averagePainIntensity * 4 +
    pattern.unpromptedMentions * 3 +
    confidenceScore
  );
};

export const summarizePatternWidgets = (patterns: Pattern[]): PatternWidgetSummary => {
  const normalizedPatterns = patterns.map((pattern) => normalizePatternRecord(pattern));
  const ordered = [...normalizedPatterns].sort((a, b) => patternScore(b) - patternScore(a));
  const strongPatterns = ordered.filter(
    (pattern) =>
      pattern.confidence === StageConfidence.HIGH ||
      pattern.numberOfMentions >= 5 ||
      pattern.averagePainIntensity >= 4
  );
  const lowConfidencePatterns = ordered.filter(
    (pattern) =>
      pattern.confidence === StageConfidence.LOW ||
      pattern.numberOfMentions < 3 ||
      pattern.averagePainIntensity < 3
  );
  const weakestPatterns = lowConfidencePatterns.filter((pattern) => pattern.status !== PatternStatus.PIVOT);
  const pivotCandidates = ordered.filter((pattern) => pattern.status === PatternStatus.PIVOT);

  return {
    strongestPattern: ordered[0] || null,
    strongPatterns,
    strongestPatterns: ordered.slice(0, 6),
    weakestPatterns: weakestPatterns.slice(0, 6),
    lowConfidencePatterns: lowConfidencePatterns.slice(0, 6),
    pivotCandidates: pivotCandidates.slice(0, 6),
    strongPatternCount: strongPatterns.length,
    pivotCandidateCount: pivotCandidates.length,
  };
};
