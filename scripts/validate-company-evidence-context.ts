import assert from 'node:assert/strict';
import {
  buildCompanyEvidenceContext,
  DEFAULT_COMPANY_EVIDENCE_SOURCES,
} from '../src/services/companyEvidenceContextService';
import {
  CompanyEvidenceReviewGoal,
  CompanyEvidenceSourceLane,
  CompanyEvidenceSourceRecord,
  CompanyEvidenceTruthClass,
} from '../src/types';

const TODAY = '2026-04-08T00:00:00.000Z';

const makeRecord = (overrides: Partial<CompanyEvidenceSourceRecord>): CompanyEvidenceSourceRecord => ({
  id: overrides.id || crypto.randomUUID(),
  sourceLane: overrides.sourceLane || CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
  sourceTitle: overrides.sourceTitle || 'Test Source',
  canonicalCompanyId: overrides.canonicalCompanyId || 'company-1',
  sourceEntityName: overrides.sourceEntityName,
  recordDate: overrides.recordDate,
  eventType: overrides.eventType || 'note',
  truthClass: overrides.truthClass || CompanyEvidenceTruthClass.VERIFIED,
  summary: overrides.summary || 'Test summary',
  exactEvidence: overrides.exactEvidence,
  attributes: overrides.attributes,
  retrievalStatus: overrides.retrievalStatus || 'ok',
  retrievalError: overrides.retrievalError,
  approved: overrides.approved ?? true,
});

const makeInput = (sourceRecords: CompanyEvidenceSourceRecord[], allowedSources = DEFAULT_COMPANY_EVIDENCE_SOURCES) => ({
  canonicalCompanyId: 'company-1',
  canonicalCompanyName: 'Acme Health',
  aliases: ['Acme', 'Acme Health Inc'],
  reviewGoal: CompanyEvidenceReviewGoal.READINESS,
  allowedSources,
  sourceRecords,
  todayDate: TODAY,
});

const aliasResolutionContext = buildCompanyEvidenceContext(
  makeInput([
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceTitle: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceEntityName: 'Acme',
      eventType: 'company_profile',
      recordDate: '2026-04-01T00:00:00.000Z',
    }),
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
      sourceTitle: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
      sourceEntityName: 'Acme',
      eventType: 'interview',
      recordDate: '2026-04-02T00:00:00.000Z',
      exactEvidence: 'This is painful every payroll cycle.',
      attributes: {
        discoveryChannel: 'LinkedIn outreach',
        targetSegment: 'HR leaders',
        theme: 'Manual payroll corrections',
        interviewCount: 1,
      },
    }),
  ], [
    CompanyEvidenceSourceLane.MEMBER_COMPANIES,
    CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
  ])
);
assert(aliasResolutionContext.aliasesDetected.includes('Acme'));

const contradictionContext = buildCompanyEvidenceContext(
  makeInput([
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceTitle: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      eventType: 'company_profile',
      recordDate: '2026-04-01T00:00:00.000Z',
    }),
    ...Array.from({ length: 3 }, (_, index) =>
      makeRecord({
        id: `verified-interview-${index}`,
        sourceLane: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
        sourceTitle: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
        eventType: 'interview',
        recordDate: `2026-04-0${index + 1}T00:00:00.000Z`,
        attributes: {
          discoveryChannel: 'Email',
          targetSegment: 'Operations',
          theme: 'Scheduling waste',
          interviewCount: 1,
        },
      })
    ),
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.MONTHLY_REPORTING,
      sourceTitle: CompanyEvidenceSourceLane.MONTHLY_REPORTING,
      truthClass: CompanyEvidenceTruthClass.REPORTED,
      eventType: 'monthly_update',
      recordDate: '2026-04-05T00:00:00.000Z',
      attributes: {
        interviewCount: 2,
        reportingPeriod: 'Apr 2026',
      },
    }),
  ])
);
assert(contradictionContext.evidenceQuality.contradictions.length > 0);

const missingLaneContext = buildCompanyEvidenceContext(
  makeInput(
    [
      makeRecord({
        sourceLane: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
        sourceTitle: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
        eventType: 'company_profile',
        recordDate: '2026-04-01T00:00:00.000Z',
      }),
    ],
    [
      CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
      CompanyEvidenceSourceLane.MONTHLY_REPORTING,
    ]
  )
);
assert(
  missingLaneContext.sourceCoverage.monthly_reporting === 'missing'
);

const retrievalFailureContext = buildCompanyEvidenceContext(
  makeInput([
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceTitle: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      eventType: 'company_profile',
      recordDate: '2026-04-01T00:00:00.000Z',
    }),
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.FEEDBACK,
      sourceTitle: CompanyEvidenceSourceLane.FEEDBACK,
      eventType: 'feedback_log',
      retrievalStatus: 'failed',
      retrievalError: 'Connector timeout',
    }),
  ])
);
assert(
  retrievalFailureContext.evidenceQuality.retrievalFailures.some((item) => item.includes('Feedback'))
);

const stalePeriodsContext = buildCompanyEvidenceContext({
  ...makeInput([
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceTitle: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      eventType: 'company_profile',
      recordDate: '2025-12-01T00:00:00.000Z',
    }),
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.MONTHLY_REPORTING,
      sourceTitle: CompanyEvidenceSourceLane.MONTHLY_REPORTING,
      eventType: 'monthly_update',
      recordDate: '2026-01-01T00:00:00.000Z',
      attributes: {
        reportingPeriod: 'Jan 2026',
        highlight: 'Early traction note',
      },
    }),
  ]),
  reportingPeriodFilter: {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-03-31T00:00:00.000Z',
    label: 'Q1 2026',
  },
});
assert(stalePeriodsContext.evidenceQuality.staleSignals.length > 0);

const noDataContext = buildCompanyEvidenceContext(
  makeInput([], [
    CompanyEvidenceSourceLane.MEMBER_COMPANIES,
    CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
  ])
);
assert.equal(noDataContext.readiness.internallyUsable, false);

const publicGatingContext = buildCompanyEvidenceContext(
  makeInput([
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceTitle: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      eventType: 'company_profile',
      recordDate: '2026-04-01T00:00:00.000Z',
    }),
    makeRecord({
      sourceLane: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
      sourceTitle: 'Patterns',
      truthClass: CompanyEvidenceTruthClass.INFERENCE,
      eventType: 'pattern',
      recordDate: '2026-04-02T00:00:00.000Z',
      summary: 'Founder likely has a strong payroll problem theme.',
      attributes: {
        theme: 'Payroll pain',
        interviewCount: 4,
      },
    }),
  ], [
    CompanyEvidenceSourceLane.MEMBER_COMPANIES,
    CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
  ])
);
assert.equal(publicGatingContext.readiness.externallyPublishable, false);
assert(publicGatingContext.timeline.every((entry) => entry.confidenceClass !== CompanyEvidenceTruthClass.MISSING));

console.log('company_evidence_context validation scenarios passed');
