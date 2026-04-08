import assert from 'node:assert/strict';
import { normalizePatternRecord, preparePatternWritePayload, summarizePatternWidgets } from '../src/lib/patternUtils';
import { PatternStatus, StageConfidence } from '../src/types';

const basePattern = {
  companyId: 'company-1',
  cohortParticipationId: 'cohort-1',
  problemTheme: 'Manual payroll corrections',
  numberOfMentions: 3,
  averagePainIntensity: 4,
  unpromptedMentions: 2,
  representativeQuote: 'We fix payroll manually every cycle.',
  confidence: StageConfidence.HIGH,
  status: PatternStatus.KEEP,
  sourceInterviewIds: ['i-1', 'i-2', 'i-3'],
  notes: 'Repeated in operator interviews.',
  createdAt: '2026-04-08T00:00:00.000Z',
  updatedAt: '2026-04-08T00:00:00.000Z',
  createdByPersonId: 'person-1',
};

const normalized = normalizePatternRecord({
  id: 'pattern-1',
  ...basePattern,
  averagePainIntensity: Number.NaN,
  unpromptedMentions: 8,
  sourceInterviewIds: ['i-1', 'i-1', 'i-2'],
});
assert.equal(normalized.averagePainIntensity, 0);
assert.equal(normalized.unpromptedMentions, 3);
assert.deepEqual(normalized.sourceInterviewIds, ['i-1', 'i-2']);

const validWrite = preparePatternWritePayload(basePattern, {
  validInterviewIds: ['i-1', 'i-2', 'i-3', 'i-4'],
});
assert.equal(validWrite.numberOfMentions, 3);
assert.equal(validWrite.averagePainIntensity, 4);

assert.throws(
  () =>
    preparePatternWritePayload(
      {
        ...basePattern,
        representativeQuote: '   ',
      },
      {
        validInterviewIds: ['i-1', 'i-2', 'i-3'],
      }
    ),
  /Strong patterns must include a representative quote/
);

assert.throws(
  () =>
    preparePatternWritePayload(
      {
        ...basePattern,
        sourceInterviewIds: ['i-1', 'missing'],
      },
      {
        validInterviewIds: ['i-1', 'i-2', 'i-3'],
      }
    ),
  /linked interviews no longer exist/
);

const widgetSummary = summarizePatternWidgets([
  normalizePatternRecord({ id: 'strong', ...basePattern }),
  normalizePatternRecord({
    id: 'weak',
    ...basePattern,
    numberOfMentions: 1,
    averagePainIntensity: 2,
    unpromptedMentions: 0,
    confidence: StageConfidence.LOW,
    status: PatternStatus.NARROW,
    sourceInterviewIds: ['i-1'],
  }),
  normalizePatternRecord({
    id: 'pivot',
    ...basePattern,
    numberOfMentions: 4,
    averagePainIntensity: 4,
    unpromptedMentions: 2,
    status: PatternStatus.PIVOT,
    sourceInterviewIds: ['i-1', 'i-2', 'i-3', 'i-4'],
  }),
]);
assert(widgetSummary.strongestPattern);
assert(['strong', 'pivot'].includes(widgetSummary.strongestPattern.id));
assert(widgetSummary.strongPatterns.some((pattern) => pattern.id === 'strong'));
assert.equal(widgetSummary.pivotCandidateCount, 1);
assert.equal(widgetSummary.lowConfidencePatterns[0]?.id, 'weak');

console.log('pattern hardening validation scenarios passed');
