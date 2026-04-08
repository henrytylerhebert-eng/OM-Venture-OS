import { addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns';
import {
  Company,
  CompanyEvidenceContext,
  CompanyEvidenceContextInput,
  CompanyEvidenceCustomerDiscoverySummary,
  CompanyEvidenceQualityFlag,
  CompanyEvidenceQualityReview,
  CompanyEvidenceReadinessRecommendation,
  CompanyEvidenceReportingSummary,
  CompanyEvidenceReviewGoal,
  CompanyEvidenceSourceCoverage,
  CompanyEvidenceSourceLane,
  CompanyEvidenceSourceRecord,
  CompanyEvidenceTimelineEntry,
  CompanyEvidenceTruthClass,
  CompanyEvidenceSourceCoverageState,
  Interview,
  Pattern,
  StageConfidence,
} from '../types';

export const DEFAULT_COMPANY_EVIDENCE_SOURCES: CompanyEvidenceSourceLane[] = [
  CompanyEvidenceSourceLane.MEMBER_COMPANIES,
  CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
  CompanyEvidenceSourceLane.MEETING_NOTES,
  CompanyEvidenceSourceLane.MONTHLY_REPORTING,
  CompanyEvidenceSourceLane.INTERNAL_APPLICATION_REVIEW,
  CompanyEvidenceSourceLane.FEEDBACK,
  CompanyEvidenceSourceLane.MEETING_REQUESTS,
  CompanyEvidenceSourceLane.NEWS_TRACKER,
];

interface CurrentEvidenceAdapterInput {
  company: Company;
  aliases?: string[];
  interviews: Interview[];
  patterns: Pattern[];
  reviewGoal: CompanyEvidenceReviewGoal;
  todayDate: string;
}

const truthPriority: Record<CompanyEvidenceTruthClass, number> = {
  [CompanyEvidenceTruthClass.VERIFIED]: 0,
  [CompanyEvidenceTruthClass.REPORTED]: 1,
  [CompanyEvidenceTruthClass.INFERENCE]: 2,
  [CompanyEvidenceTruthClass.MISSING]: 3,
};

const normalizeName = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const toDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const readStringAttribute = (record: CompanyEvidenceSourceRecord, key: string) => {
  const value = record.attributes?.[key];
  return typeof value === 'string' ? value : undefined;
};

const readNumberAttribute = (record: CompanyEvidenceSourceRecord, key: string) => {
  const value = record.attributes?.[key];
  return typeof value === 'number' ? value : undefined;
};

const readStringListAttribute = (record: CompanyEvidenceSourceRecord, key: string) => {
  const value = record.attributes?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
};

const matchesCanonicalOrAlias = (sourceName: string | undefined, canonicalName: string, aliases: string[]) => {
  const normalizedSource = normalizeName(sourceName);
  if (!normalizedSource) {
    return { matches: true, matchedAlias: null as string | null };
  }

  const normalizedCanonical = normalizeName(canonicalName);
  if (normalizedSource === normalizedCanonical) {
    return { matches: true, matchedAlias: null as string | null };
  }

  const matchedAlias = aliases.find((alias) => normalizeName(alias) === normalizedSource) || null;
  return { matches: Boolean(matchedAlias), matchedAlias };
};

const isApprovedRecord = (record: CompanyEvidenceSourceRecord) => record.approved !== false;

const isQueryableRecord = (record: CompanyEvidenceSourceRecord) =>
  record.retrievalStatus !== 'failed' && record.retrievalStatus !== 'empty';

const mapCoverageState = (status: CompanyEvidenceSourceCoverage['retrievalStatus']): CompanyEvidenceSourceCoverageState => {
  if (status === 'ok') {
    return 'present';
  }
  if (status === 'failed') {
    return 'unknown';
  }
  return 'missing';
};

const buildSourceCoverageMap = (
  coverageSummary: CompanyEvidenceSourceCoverage[]
): CompanyEvidenceContext['sourceCoverage'] => {
  const lookup = coverageSummary.reduce<Record<CompanyEvidenceSourceLane, CompanyEvidenceSourceCoverageState>>(
    (acc, item) => {
      acc[item.lane] = mapCoverageState(item.retrievalStatus);
      return acc;
    },
    {
      [CompanyEvidenceSourceLane.MEMBER_COMPANIES]: 'unknown',
      [CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY]: 'unknown',
      [CompanyEvidenceSourceLane.MEETING_NOTES]: 'unknown',
      [CompanyEvidenceSourceLane.MONTHLY_REPORTING]: 'unknown',
      [CompanyEvidenceSourceLane.INTERNAL_APPLICATION_REVIEW]: 'unknown',
      [CompanyEvidenceSourceLane.FEEDBACK]: 'unknown',
      [CompanyEvidenceSourceLane.MEETING_REQUESTS]: 'unknown',
      [CompanyEvidenceSourceLane.NEWS_TRACKER]: 'unknown',
    }
  );

  return {
    member_companies: lookup[CompanyEvidenceSourceLane.MEMBER_COMPANIES],
    customer_discovery: lookup[CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY],
    meeting_notes: lookup[CompanyEvidenceSourceLane.MEETING_NOTES],
    monthly_reporting: lookup[CompanyEvidenceSourceLane.MONTHLY_REPORTING],
    internal_application_review: lookup[CompanyEvidenceSourceLane.INTERNAL_APPLICATION_REVIEW],
    feedback: lookup[CompanyEvidenceSourceLane.FEEDBACK],
    meeting_requests: lookup[CompanyEvidenceSourceLane.MEETING_REQUESTS],
    news_tracker: lookup[CompanyEvidenceSourceLane.NEWS_TRACKER],
  };
};

const deriveTimelineEventType = (
  record: CompanyEvidenceSourceRecord
): CompanyEvidenceTimelineEntry['eventType'] => {
  const normalizedEventType = record.eventType.toLowerCase();

  if (record.sourceLane === CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY) {
    return 'discovery';
  }
  if (
    [CompanyEvidenceSourceLane.MEETING_NOTES, CompanyEvidenceSourceLane.FEEDBACK, CompanyEvidenceSourceLane.MEETING_REQUESTS].includes(
      record.sourceLane
    )
  ) {
    return 'meeting';
  }
  if (record.sourceLane === CompanyEvidenceSourceLane.NEWS_TRACKER) {
    return 'news';
  }
  if (normalizedEventType.includes('milestone')) {
    return 'milestone';
  }
  if (normalizedEventType.includes('roadblock')) {
    return 'roadblock';
  }
  if (normalizedEventType.includes('ask')) {
    return 'ask';
  }
  if (record.sourceLane === CompanyEvidenceSourceLane.MONTHLY_REPORTING) {
    return 'reporting';
  }

  return 'other';
};

const buildCoverageSummary = (
  allowedSources: CompanyEvidenceSourceLane[],
  sourceRecords: CompanyEvidenceSourceRecord[]
): CompanyEvidenceSourceCoverage[] =>
  allowedSources.map((lane) => {
    const recordsForLane = sourceRecords.filter((record) => record.sourceLane === lane);
    const failedRecords = recordsForLane.filter((record) => record.retrievalStatus === 'failed');
    const emptyRecords = recordsForLane.filter((record) => record.retrievalStatus === 'empty');
    const approvedOkRecords = recordsForLane.filter((record) => isApprovedRecord(record) && isQueryableRecord(record));
    const pendingApprovalRecords = recordsForLane.filter((record) => !isApprovedRecord(record) && isQueryableRecord(record));

    if (failedRecords.length > 0) {
      const failureDetails = failedRecords
        .map((record) => record.retrievalError)
        .filter((value): value is string => Boolean(value))
        .slice(0, 2);

      return {
        lane,
        recordCount: approvedOkRecords.length,
        retrievalStatus: 'failed',
        note:
          failureDetails.length > 0
            ? `${failedRecords.length} retrieval failure${failedRecords.length === 1 ? '' : 's'} recorded: ${failureDetails.join(' | ')}`
            : `${failedRecords.length} retrieval failure${failedRecords.length === 1 ? '' : 's'} recorded.`,
      };
    }

    if (approvedOkRecords.length > 0) {
      return {
        lane,
        recordCount: approvedOkRecords.length,
        retrievalStatus: 'ok',
        note: `${approvedOkRecords.length} approved source record${approvedOkRecords.length === 1 ? '' : 's'} available.`,
      };
    }

    if (pendingApprovalRecords.length > 0) {
      return {
        lane,
        recordCount: 0,
        retrievalStatus: 'empty',
        note: `${pendingApprovalRecords.length} source record${pendingApprovalRecords.length === 1 ? '' : 's'} exist but are still awaiting approval.`,
      };
    }

    if (emptyRecords.length > 0) {
      return {
        lane,
        recordCount: 0,
        retrievalStatus: 'empty',
        note: 'Source lane was queried but returned no approved records.',
      };
    }

    return {
      lane,
      recordCount: 0,
      retrievalStatus: 'missing',
      note: 'Source lane is allowed for this review but no records are present yet.',
    };
  });

const buildTimeline = (records: CompanyEvidenceSourceRecord[]): CompanyEvidenceTimelineEntry[] =>
  records
    .sort((a, b) => {
      const left = toDate(a.recordDate)?.getTime() || 0;
      const right = toDate(b.recordDate)?.getTime() || 0;
      if (left !== right) {
        return left - right;
      }
      return truthPriority[a.truthClass] - truthPriority[b.truthClass];
    })
    .map((record) => ({
      date: record.recordDate || null,
      source: record.sourceTitle,
      eventType: deriveTimelineEventType(record),
      summary: record.exactEvidence || record.summary,
      confidenceClass: record.truthClass,
    }));

const buildCustomerDiscoverySummary = (records: CompanyEvidenceSourceRecord[]): CompanyEvidenceCustomerDiscoverySummary => {
  const discoveryRecords = records.filter((record) => record.sourceLane === CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY);
  const verifiedInterviewRecords = discoveryRecords.filter(
    (record) => record.eventType === 'interview' && record.truthClass === CompanyEvidenceTruthClass.VERIFIED
  );

  const reportedInterviewCount = records
    .filter((record) => record.truthClass === CompanyEvidenceTruthClass.REPORTED)
    .map((record) => readNumberAttribute(record, 'interviewCount') || readNumberAttribute(record, 'reportedInterviewCount'))
    .find((value): value is number => typeof value === 'number') ?? null;

  const discoveryChannels = Array.from(
    new Set(
      verifiedInterviewRecords
        .map((record) => readStringAttribute(record, 'discoveryChannel'))
        .filter((value): value is string => Boolean(value))
    )
  );

  const targetSegments = Array.from(
    new Set(
      verifiedInterviewRecords
        .map((record) => readStringAttribute(record, 'targetSegment'))
        .filter((value): value is string => Boolean(value))
    )
  );

  const repeatedThemes = Array.from(
    new Set(
      discoveryRecords
        .map((record) => readStringAttribute(record, 'theme'))
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 6);

  const strongestEvidence = discoveryRecords
    .filter((record) => record.truthClass !== CompanyEvidenceTruthClass.MISSING)
    .sort((a, b) => truthPriority[a.truthClass] - truthPriority[b.truthClass])
    .slice(0, 4)
    .map((record) => record.exactEvidence || record.summary);

  const majorUnknowns: string[] = [];
  if (verifiedInterviewRecords.length === 0) {
    majorUnknowns.push('Verified customer discovery interviews are still missing from the approved source set.');
  }
  if (repeatedThemes.length === 0) {
    majorUnknowns.push('Repeated themes are not yet clear enough to shape assumptions confidently.');
  }
  if (targetSegments.length === 0) {
    majorUnknowns.push('Target segments are not consistently captured in the approved discovery records.');
  }

  return {
    verifiedInterviewCount: verifiedInterviewRecords.length,
    reportedInterviewCount,
    channels: discoveryChannels,
    segments: targetSegments,
    themes: repeatedThemes,
    strongestEvidence,
    unknowns: majorUnknowns,
  };
};

const buildExpectedMonthlyPeriods = (filter?: CompanyEvidenceContextInput['reportingPeriodFilter']) => {
  if (!filter?.start || !filter?.end) {
    return [];
  }

  const start = toDate(filter.start);
  const end = toDate(filter.end);
  if (!start || !end || start > end) {
    return [];
  }

  const periods: string[] = [];
  let cursor = startOfMonth(start);
  const limit = startOfMonth(end);
  while (cursor <= limit) {
    periods.push(format(cursor, 'MMM yyyy'));
    cursor = addMonths(cursor, 1);
  }
  return periods;
};

const buildReportingSummary = (
  records: CompanyEvidenceSourceRecord[],
  filter?: CompanyEvidenceContextInput['reportingPeriodFilter']
): CompanyEvidenceReportingSummary => {
  const reportingRecords = records.filter((record) =>
    [CompanyEvidenceSourceLane.MONTHLY_REPORTING, CompanyEvidenceSourceLane.NEWS_TRACKER].includes(record.sourceLane)
  );

  const periodLabels = reportingRecords
    .map((record) => {
      const explicitPeriod = readStringAttribute(record, 'reportingPeriod');
      if (explicitPeriod) {
        return explicitPeriod;
      }

      const recordDate = toDate(record.recordDate);
      return recordDate ? format(recordDate, 'MMM yyyy') : undefined;
    })
    .filter((value): value is string => Boolean(value));

  const reportingPeriodsLocated = Array.from(new Set(periodLabels));
  const expectedPeriods = buildExpectedMonthlyPeriods(filter);
  const missingReportingPeriods = expectedPeriods.filter((period) => !reportingPeriodsLocated.includes(period));

  const highlights = reportingRecords
    .map((record) => readStringAttribute(record, 'highlight') || record.summary)
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);
  const milestones = reportingRecords
    .map((record) => readStringAttribute(record, 'milestone'))
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);
  const roadblocks = reportingRecords
    .map((record) => readStringAttribute(record, 'roadblock'))
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);
  const customerFeedback = reportingRecords
    .map((record) => readStringAttribute(record, 'customerFeedback'))
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);
  const asks = reportingRecords
    .map((record) => readStringAttribute(record, 'ask'))
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);

  return {
    periodsFound: reportingPeriodsLocated,
    highlights,
    milestones,
    roadblocks,
    customerFeedback,
    asks,
    missingPeriods: missingReportingPeriods,
  };
};

const buildQualityReview = (
  input: CompanyEvidenceContextInput,
  allAllowedRecords: CompanyEvidenceSourceRecord[],
  approvedQueryableRecords: CompanyEvidenceSourceRecord[],
  coverageSummary: CompanyEvidenceSourceCoverage[],
  discoverySummary: CompanyEvidenceCustomerDiscoverySummary,
  reportingSummary: CompanyEvidenceReportingSummary
): CompanyEvidenceQualityReview => {
  const contradictions: string[] = [];
  const retrievalFailures = allAllowedRecords
    .filter((record) => record.retrievalStatus === 'failed')
    .map((record) => `${record.sourceTitle}: ${record.retrievalError || record.summary || 'Retrieval failed.'}`);
  const staleSignals: string[] = [];
  const namingDriftIssues: string[] = [];
  const fieldsNeedingReviewedTruth: string[] = [];

  if (
    typeof discoverySummary.reportedInterviewCount === 'number' &&
    discoverySummary.reportedInterviewCount < discoverySummary.verifiedInterviewCount
  ) {
    contradictions.push(
      `Reported interview count (${discoverySummary.reportedInterviewCount}) is lower than the verified interview count (${discoverySummary.verifiedInterviewCount}).`
    );
  }

  const aliasSet = new Set(input.aliases.map((alias) => normalizeName(alias)));
  const canonicalName = normalizeName(input.canonicalCompanyName);

  approvedQueryableRecords.forEach((record) => {
    const { matches, matchedAlias } = matchesCanonicalOrAlias(record.sourceEntityName, input.canonicalCompanyName, input.aliases);
    if (!matches && record.sourceEntityName) {
      namingDriftIssues.push(`${record.sourceTitle} uses "${record.sourceEntityName}" instead of a canonical or approved alias.`);
    }

    if (record.truthClass === CompanyEvidenceTruthClass.REPORTED) {
      fieldsNeedingReviewedTruth.push(`${record.sourceTitle} includes reported but unconfirmed evidence that still needs review.`);
    }
    if (record.truthClass === CompanyEvidenceTruthClass.INFERENCE) {
      fieldsNeedingReviewedTruth.push(`${record.sourceTitle} includes synthesized inference that should not become a public claim without reviewed truth.`);
    }

    const recordName = normalizeName(record.sourceEntityName);
    if (recordName && recordName !== canonicalName && !aliasSet.has(recordName) && !matchedAlias) {
      namingDriftIssues.push(`${record.sourceTitle} may point at a naming drift issue for this company record.`);
    }
  });

  const latestVerifiedActivity = approvedQueryableRecords
    .filter((record) => record.truthClass === CompanyEvidenceTruthClass.VERIFIED && record.recordDate)
    .map((record) => toDate(record.recordDate!))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const today = toDate(input.todayDate);
  if (latestVerifiedActivity && today && differenceInCalendarDays(today, latestVerifiedActivity) > 45) {
    staleSignals.push(
      `Last verified activity is stale by ${differenceInCalendarDays(today, latestVerifiedActivity)} days.`
    );
  }

  if (reportingSummary.missingPeriods.length > 0) {
    staleSignals.push(
      `Monthly reporting is missing for ${reportingSummary.missingPeriods.join(', ')}.`
    );
  }

  if (coverageSummary.some((item) => item.retrievalStatus === 'missing')) {
    coverageSummary
      .filter((item) => item.retrievalStatus === 'missing')
      .forEach((item) => {
        fieldsNeedingReviewedTruth.push(`${item.lane} is not connected yet, so context is incomplete.`);
      });
  }

  coverageSummary
    .filter((item) => item.retrievalStatus === 'empty')
    .forEach((item) => {
      fieldsNeedingReviewedTruth.push(`${item.lane} is currently a gap: ${item.note}`);
    });

  return {
    contradictions,
    retrievalFailures: Array.from(new Set(retrievalFailures)),
    staleSignals,
    namingDrift: Array.from(new Set(namingDriftIssues)),
    reviewedTruthNeeded: Array.from(new Set(fieldsNeedingReviewedTruth)),
  };
};

export const buildCompanyEvidenceQualityFlags = (quality: CompanyEvidenceQualityReview): CompanyEvidenceQualityFlag[] => [
  ...quality.contradictions.map((message, index) => ({
    key: `contradiction-${index}`,
    severity: StageConfidence.HIGH,
    message,
  })),
  ...quality.retrievalFailures.map((message, index) => ({
    key: `retrieval-${index}`,
    severity: StageConfidence.HIGH,
    message,
  })),
  ...quality.staleSignals.map((message, index) => ({
    key: `stale-${index}`,
    severity: StageConfidence.MEDIUM,
    message,
  })),
  ...quality.namingDrift.map((message, index) => ({
    key: `drift-${index}`,
    severity: StageConfidence.MEDIUM,
    message,
  })),
  ...quality.reviewedTruthNeeded.map((message, index) => ({
    key: `review-${index}`,
    severity: StageConfidence.LOW,
    message,
  })),
];

const buildReadinessRecommendation = (
  coverageSummary: CompanyEvidenceSourceCoverage[],
  discoverySummary: CompanyEvidenceCustomerDiscoverySummary,
  quality: CompanyEvidenceQualityReview
): CompanyEvidenceReadinessRecommendation => {
  const hasIdentityCoverage = coverageSummary.some(
    (item) => item.lane === CompanyEvidenceSourceLane.MEMBER_COMPANIES && item.retrievalStatus === 'ok'
  );
  const hasDiscoveryCoverage = coverageSummary.some(
    (item) => item.lane === CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY && item.retrievalStatus === 'ok'
  );
  const hasContradictions = quality.contradictions.length > 0;
  const hasFailures = quality.retrievalFailures.length > 0;
  const hasUnreviewedTruth = quality.reviewedTruthNeeded.length > 0;
  const hasOnlyUnconfirmedOrInference =
    discoverySummary.verifiedInterviewCount === 0 && discoverySummary.strongestEvidence.length > 0;

  const internallyUsable = hasIdentityCoverage && (hasDiscoveryCoverage || discoverySummary.strongestEvidence.length > 0) && !hasFailures;
  const contentReady =
    internallyUsable &&
    discoverySummary.verifiedInterviewCount > 0 &&
    !hasContradictions;
  const spotlightReady =
    contentReady &&
    quality.staleSignals.length === 0 &&
    quality.namingDrift.length === 0 &&
    !hasFailures;
  const externallyPublishable =
    spotlightReady &&
    !hasOnlyUnconfirmedOrInference &&
    !hasUnreviewedTruth &&
    coverageSummary
      .filter((item) =>
        [
          CompanyEvidenceSourceLane.MEMBER_COMPANIES,
          CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
        ].includes(item.lane)
      )
      .every((item) => item.retrievalStatus === 'ok');

  return {
    internallyUsable,
    contentReady,
    spotlightReady,
    externallyPublishable,
    reasoning: {
      internallyUsable: internallyUsable
        ? 'Identity and evidence coverage are strong enough for internal staff use.'
        : 'Staff still lacks enough verified identity or evidence coverage to rely on this context safely.',
      contentReady: contentReady
        ? 'There is enough verified evidence to support an internal narrative or readiness conversation.'
        : 'The brief still depends on thin evidence, contradictions, or missing discovery truth.',
      spotlightReady: spotlightReady
        ? 'Signals are recent enough and naming/coverage issues are not blocking internal spotlight use.'
        : 'Stale periods, naming drift, or missing truth still block spotlight-style use.',
      externallyPublishable: externallyPublishable
        ? 'The source mix is verified enough to support external publishing.'
        : 'Public publishing stays blocked until reviewed truth replaces inference, gaps, and unconfirmed claims.',
    },
  };
};

const chooseNextOperationalAction = (
  coverageSummary: CompanyEvidenceSourceCoverage[],
  quality: CompanyEvidenceQualityReview,
  readiness: CompanyEvidenceReadinessRecommendation
) => {
  const missingIdentity = coverageSummary.find(
    (item) => item.lane === CompanyEvidenceSourceLane.MEMBER_COMPANIES && item.retrievalStatus !== 'ok'
  );
  if (missingIdentity) {
    return 'Resolve the Member Companies identity anchor before using this company in readiness or unlock decisions.';
  }

  if (quality.retrievalFailures.length > 0) {
    return 'Retry the failed source lane retrievals and resolve empty-result gaps before making a higher-stakes staff decision.';
  }

  if (quality.namingDrift.length > 0) {
    return 'Resolve alias and naming drift across approved source records before treating the context as complete.';
  }

  if (quality.contradictions.length > 0) {
    return 'Reconcile contradictory evidence counts or claims before using this brief for readiness, unlock, or public narrative decisions.';
  }

  if (!readiness.contentReady) {
    return 'Close the biggest discovery or reporting truth gap before escalating this company into a stronger readiness or unlock conversation.';
  }

  if (!readiness.externallyPublishable) {
    return 'Keep this brief internal and convert the remaining inference or unconfirmed claims into reviewed truth before any external use.';
  }

  return 'Use this verified context brief in the next staff readiness decision and keep the same evidence lanes current.';
};

export const buildCompanyEvidenceNarrativeBrief = (context: CompanyEvidenceContext) => {
  const coverageLine = Object.entries(context.sourceCoverage)
    .map(([lane, status]) => `${lane}: ${status}`)
    .join(', ');

  const timelineLine =
    context.timeline.slice(0, 3).map((entry) => `${entry.date || 'unknown date'} ${entry.summary}`).join(' ') ||
    'No timeline events are available yet.';

  const discoveryLine =
    context.customerDiscovery.strongestEvidence.slice(0, 2).join(' ') ||
    'Customer discovery evidence is still thin or missing.';

  const qualityLine =
    context.evidenceQuality.contradictions[0] ||
    context.evidenceQuality.retrievalFailures[0] ||
    context.evidenceQuality.staleSignals[0] ||
    'No major evidence-quality issue is currently dominating the brief.';

  return [
    `${context.canonicalCompanyName} evidence context for staff review.`,
    `Coverage: ${coverageLine}.`,
    `Timeline: ${timelineLine}`,
    `Discovery: ${discoveryLine}`,
    `Quality: ${qualityLine}`,
    `Next action: ${context.nextAction}`,
  ].join(' ');
};

export const buildCompanyEvidenceContext = (input: CompanyEvidenceContextInput): CompanyEvidenceContext => {
  const filteredRecords = input.sourceRecords.filter((record) => input.allowedSources.includes(record.sourceLane));
  const approvedRecords = filteredRecords.filter((record) => isApprovedRecord(record));
  const coverageSummary = buildCoverageSummary(input.allowedSources, filteredRecords);
  const timelineRecords = approvedRecords.filter((record) => isQueryableRecord(record));
  const verifiedTimeline = buildTimeline(timelineRecords);
  const discoverySummary = buildCustomerDiscoverySummary(timelineRecords);
  const reportingSummary = buildReportingSummary(timelineRecords, input.reportingPeriodFilter);
  const qualityReview = buildQualityReview(
    input,
    filteredRecords,
    timelineRecords,
    coverageSummary,
    discoverySummary,
    reportingSummary
  );
  const readinessRecommendation = buildReadinessRecommendation(coverageSummary, discoverySummary, qualityReview);
  const nextOperationalAction = chooseNextOperationalAction(coverageSummary, qualityReview, readinessRecommendation);

  const lastConfirmedActivityDate = timelineRecords
    .filter((record) => record.truthClass === CompanyEvidenceTruthClass.VERIFIED && record.recordDate)
    .map((record) => record.recordDate!)
    .sort((a, b) => (toDate(b)?.getTime() || 0) - (toDate(a)?.getTime() || 0))[0];

  const aliasesDetected = Array.from(
    new Set(
      timelineRecords
        .map((record) => matchesCanonicalOrAlias(record.sourceEntityName, input.canonicalCompanyName, input.aliases).matchedAlias)
        .filter((value): value is string => Boolean(value))
    )
  );

  return {
    companyId: input.canonicalCompanyId,
    canonicalCompanyName: input.canonicalCompanyName,
    aliasesDetected,
    reviewGoal: input.reviewGoal,
    lastConfirmedActivityDate: lastConfirmedActivityDate || null,
    sourceCoverage: buildSourceCoverageMap(coverageSummary),
    timeline: verifiedTimeline,
    customerDiscovery: discoverySummary,
    reportingHistory: reportingSummary,
    evidenceQuality: qualityReview,
    readiness: readinessRecommendation,
    nextAction: nextOperationalAction,
  };
};

export const buildCompanyEvidenceContextFromCurrentData = ({
  company,
  aliases = [],
  interviews,
  patterns,
  reviewGoal,
  todayDate,
}: CurrentEvidenceAdapterInput): CompanyEvidenceContext => {
  const interviewIds = new Set(interviews.map((interview) => interview.id));
  const sourceRecords: CompanyEvidenceSourceRecord[] = [
    {
      id: `member-companies-${company.id}`,
      sourceLane: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceTitle: CompanyEvidenceSourceLane.MEMBER_COMPANIES,
      sourceRecordId: company.id,
      canonicalCompanyId: company.id,
      sourceEntityName: company.name,
      recordDate: company.updatedAt,
      eventType: 'company_profile',
      truthClass: CompanyEvidenceTruthClass.VERIFIED,
      summary: `Company profile is present with membership status ${company.membershipStatus || 'unknown'} and active=${company.active}.`,
      attributes: {
        membershipStatus: company.membershipStatus || null,
        active: company.active,
      },
      retrievalStatus: 'ok',
      approved: true,
    },
    ...interviews.map<CompanyEvidenceSourceRecord>((interview) => ({
      id: `customer-discovery-${interview.id}`,
      sourceLane: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
      sourceTitle: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
      sourceRecordId: interview.id,
      canonicalCompanyId: company.id,
      sourceEntityName: company.name,
      recordDate: interview.interviewDate,
      eventType: 'interview',
      truthClass: CompanyEvidenceTruthClass.VERIFIED,
      summary: `${interview.intervieweeSegment}: ${interview.problemTheme || 'theme missing'} at pain ${interview.painIntensity}.`,
      exactEvidence: interview.bestQuote || undefined,
      attributes: {
        discoveryChannel: interview.interviewSource,
        targetSegment: interview.intervieweeSegment,
        theme: interview.problemTheme,
        interviewCount: 1,
        painIntensity: interview.painIntensity,
        countsTowardMinimum: interview.countsTowardMinimum,
      },
      retrievalStatus: 'ok',
      approved: true,
    })),
    ...patterns.map<CompanyEvidenceSourceRecord>((pattern) => ({
      id: `pattern-${pattern.id}`,
      sourceLane: CompanyEvidenceSourceLane.CUSTOMER_DISCOVERY,
      sourceTitle: 'Patterns',
      sourceRecordId: pattern.id,
      canonicalCompanyId: company.id,
      sourceEntityName: company.name,
      recordDate: pattern.updatedAt || pattern.createdAt,
      eventType: 'pattern',
      truthClass: CompanyEvidenceTruthClass.INFERENCE,
      summary:
        pattern.sourceInterviewIds.length > 0 && pattern.sourceInterviewIds.every((interviewId) => interviewIds.has(interviewId))
          ? `Pattern "${pattern.problemTheme}" synthesized from ${pattern.sourceInterviewIds.length} linked interviews.`
          : `Pattern "${pattern.problemTheme}" is excluded from public truth because one or more linked interviews are missing.`,
      exactEvidence: pattern.representativeQuote || undefined,
      attributes: {
        theme: pattern.problemTheme,
        interviewCount: pattern.numberOfMentions,
        confidence: pattern.confidence,
        linkedInterviewCount: pattern.sourceInterviewIds.length,
      },
      retrievalStatus:
        pattern.sourceInterviewIds.length > 0 && pattern.sourceInterviewIds.every((interviewId) => interviewIds.has(interviewId))
          ? 'ok'
          : 'empty',
      approved:
        pattern.sourceInterviewIds.length > 0 && pattern.sourceInterviewIds.every((interviewId) => interviewIds.has(interviewId)),
    })),
  ];

  return buildCompanyEvidenceContext({
    canonicalCompanyId: company.id,
    canonicalCompanyName: company.name,
    aliases,
    reviewGoal,
    allowedSources: DEFAULT_COMPANY_EVIDENCE_SOURCES,
    sourceRecords,
    todayDate,
  });
};
