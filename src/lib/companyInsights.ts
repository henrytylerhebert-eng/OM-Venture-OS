import {
  AssignmentStatus,
  Assumption,
  AssumptionStatus,
  Experiment,
  Interview,
  MentorAssignment,
  Pattern,
  PortfolioProgress,
  ReadinessReview,
  ReadinessStatus,
  ReadinessType,
  ResourceCatalogItem,
  Signal,
  StartupStage,
  UnlockRuleId,
} from '../types';
import { formatStageLabel } from './roleRouting';
import { buildProofGapsFromRule, DEFAULT_RESOURCE_CATALOG, getDefaultUnlockRule } from './unlocks';

export type SupportResourceStatus = 'available' | 'locked';

export interface SupportResourceState
  extends Pick<
    ResourceCatalogItem,
    'key' | 'name' | 'category' | 'description' | 'unlockRuleId' | 'founderVisible'
  > {
  status: SupportResourceStatus;
  missingProof: string[];
}

export interface CompanyOperatingInsight {
  stage: StartupStage;
  stageLabel: string;
  recordedProgressScore?: number;
  interviewCount: number;
  countedInterviews: number;
  highPainInterviewCount: number;
  patternCount: number;
  strongPatternCount: number;
  assumptionCount: number;
  validatedAssumptionCount: number;
  experimentCount: number;
  activeExperimentCount: number;
  tractionSignalCount: number;
  availableResources: SupportResourceState[];
  lockedResources: SupportResourceState[];
  strongestEvidence: string[];
  proofGaps: string[];
  weeklyPriorities: string[];
  nextMilestone: string;
  latestReview?: ReadinessReview;
  readinessByType: Partial<Record<ReadinessType, ReadinessReview>>;
  isValidationLevelOneReady: boolean;
  isValidationLevelTwoReady: boolean;
  activeMentorAssignments: number;
  needsMentor: boolean;
  needsReviewNow: boolean;
  recommendedDecisionType: ReadinessType;
  recommendedDecisionLabel: string;
  recommendedSupportAction: string;
  escalationRecommendation: string;
  staffAttentionLevel: 'high' | 'medium' | 'low';
  staffAttentionReason: string;
}

const countTractionSignals = (signals: Signal[]) =>
  signals.filter((signal) =>
    [
      signal.callsBooked,
      signal.waitlistSignups,
      signal.pilots,
      signal.lois,
      signal.preOrders,
      signal.payingCustomers,
      signal.revenue,
      signal.repeatUsage,
    ].some((value) => (value ?? 0) > 0)
  ).length;

const buildLatestReviewMap = (reviews: ReadinessReview[]) =>
  reviews.reduce<Partial<Record<ReadinessType, ReadinessReview>>>((acc, review) => {
    const existing = acc[review.reviewType];
    if (!existing || new Date(review.reviewedAt).getTime() > new Date(existing.reviewedAt).getTime()) {
      acc[review.reviewType] = review;
    }
    return acc;
  }, {});

const inferStage = (
  progress: PortfolioProgress | undefined,
  countedInterviews: number,
  activeExperimentCount: number,
  tractionSignalCount: number
): StartupStage => {
  if (progress?.finalStage) {
    return progress.finalStage;
  }

  if (tractionSignalCount > 0) {
    return StartupStage.CUSTOMER_ACQUISITION;
  }

  if (activeExperimentCount > 0) {
    return StartupStage.BETA_TESTING;
  }

  if (countedInterviews >= 15) {
    return StartupStage.CUSTOMER_DISCOVERY;
  }

  return StartupStage.IDEA_DEVELOPMENT;
};

const buildStrongestEvidence = ({
  countedInterviews,
  highPainInterviewCount,
  strongPatternCount,
  validatedAssumptionCount,
  experimentCount,
  tractionSignalCount,
}: {
  countedInterviews: number;
  highPainInterviewCount: number;
  strongPatternCount: number;
  validatedAssumptionCount: number;
  experimentCount: number;
  tractionSignalCount: number;
}) => {
  const evidence: string[] = [];

  if (countedInterviews > 0) {
    evidence.push(`${countedInterviews} interviews logged toward the Builder discovery bar.`);
  }
  if (highPainInterviewCount > 0) {
    evidence.push(`${highPainInterviewCount} interviews surfaced strong customer pain.`);
  }
  if (strongPatternCount > 0) {
    evidence.push(`${strongPatternCount} repeated patterns are strong enough to shape decisions.`);
  }
  if (validatedAssumptionCount > 0) {
    evidence.push(`${validatedAssumptionCount} risky assumptions already have stronger proof behind them.`);
  }
  if (experimentCount > 0) {
    evidence.push(`${experimentCount} validation test${experimentCount === 1 ? '' : 's'} moved the work beyond interviews.`);
  }
  if (tractionSignalCount > 0) {
    evidence.push(`${tractionSignalCount} traction signal${tractionSignalCount === 1 ? '' : 's'} suggest live market movement.`);
  }

  return evidence.slice(0, 4);
};

export const buildCompanyOperatingInsight = ({
  interviews,
  patterns,
  assumptions,
  experiments,
  signals,
  reviews,
  progress,
  mentorAssignments = [],
}: {
  interviews: Interview[];
  patterns: Pattern[];
  assumptions: Assumption[];
  experiments: Experiment[];
  signals: Signal[];
  reviews: ReadinessReview[];
  progress?: PortfolioProgress;
  mentorAssignments?: MentorAssignment[];
}): CompanyOperatingInsight => {
  const countedInterviews = interviews.filter((interview) => interview.countsTowardMinimum !== false).length;
  const highPainInterviewCount = interviews.filter(
    (interview) => interview.countsTowardMinimum !== false && interview.painIntensity >= 4
  ).length;
  const strongPatternCount = patterns.filter(
    (pattern) =>
      pattern.numberOfMentions >= 5 ||
      (pattern.averagePainIntensity ?? 0) >= 4 ||
      pattern.confidence === 'high'
  ).length;
  const validatedAssumptionCount = assumptions.filter((assumption) =>
    [AssumptionStatus.STRONG, AssumptionStatus.VALIDATED].includes(assumption.status)
  ).length;
  const activeExperimentCount = experiments.filter((experiment) => experiment.active).length;
  const tractionSignalCount = countTractionSignals(signals);
  const readinessByType = buildLatestReviewMap(reviews);
  const latestReview = Object.values(readinessByType)
    .filter((review): review is ReadinessReview => Boolean(review))
    .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())[0];
  const activeMentorAssignments = mentorAssignments.filter(
    (assignment) => assignment.status === AssignmentStatus.ACTIVE
  ).length;
  const unlockMetrics = {
    countedInterviews,
    highPainInterviewCount,
    strongPatternCount,
    assumptionCount: assumptions.length,
    experimentCount: experiments.length,
    tractionSignalCount,
  };
  const validationLevelOneRule = getDefaultUnlockRule(UnlockRuleId.VALIDATION_LEVEL_1);
  const validationLevelTwoRule = getDefaultUnlockRule(UnlockRuleId.VALIDATION_LEVEL_2);

  const levelOneProofGaps = validationLevelOneRule
    ? buildProofGapsFromRule(validationLevelOneRule, unlockMetrics)
    : [];

  const isValidationLevelOneReady = levelOneProofGaps.length === 0;

  const levelTwoProofGaps = validationLevelTwoRule
    ? buildProofGapsFromRule(validationLevelTwoRule, unlockMetrics)
    : [];
  if (!isValidationLevelOneReady) {
    levelTwoProofGaps.unshift('Complete validation level 1 before moving into build and funding pathways.');
  }

  const isValidationLevelTwoReady = levelTwoProofGaps.length === 0;
  const stage = inferStage(progress, countedInterviews, activeExperimentCount, tractionSignalCount);

  const activeResources = DEFAULT_RESOURCE_CATALOG.filter((resource) => resource.active);

  const availableResources = activeResources.filter((resource) =>
    resource.unlockRuleId === UnlockRuleId.VALIDATION_LEVEL_1 ? isValidationLevelOneReady : isValidationLevelTwoReady
  ).map((resource) => ({
    key: resource.key,
    name: resource.name,
    category: resource.category,
    unlockRuleId: resource.unlockRuleId,
    description: resource.description,
    founderVisible: resource.founderVisible,
    status: 'available' as const,
    missingProof: [],
  }));

  const lockedResources = activeResources.filter((resource) =>
    resource.unlockRuleId === UnlockRuleId.VALIDATION_LEVEL_1 ? !isValidationLevelOneReady : !isValidationLevelTwoReady
  ).map((resource) => ({
    key: resource.key,
    name: resource.name,
    category: resource.category,
    unlockRuleId: resource.unlockRuleId,
    description: resource.description,
    founderVisible: resource.founderVisible,
    status: 'locked' as const,
    missingProof:
      resource.unlockRuleId === UnlockRuleId.VALIDATION_LEVEL_1 ? levelOneProofGaps : levelTwoProofGaps,
  }));

  const proofGaps = isValidationLevelOneReady ? levelTwoProofGaps : levelOneProofGaps;
  const strongestEvidence = buildStrongestEvidence({
    countedInterviews,
    highPainInterviewCount,
    strongPatternCount,
    validatedAssumptionCount,
    experimentCount: experiments.length,
    tractionSignalCount,
  });
  const weeklyPriorities =
    proofGaps.length > 0
      ? proofGaps.slice(0, 3)
      : [
          isValidationLevelTwoReady
            ? 'Package the strongest evidence into a staff-ready operating brief before asking for more support.'
            : 'Design the next lightweight validation test and make sure it produces a measurable signal.',
          activeMentorAssignments > 0
            ? 'Use your active mentor support to close the next blocker instead of widening scope.'
            : 'Ask staff to activate the right support pathway now that the proof bar is met.',
        ];

  let nextMilestone = progress?.nextMilestone;
  if (!nextMilestone) {
    if (!isValidationLevelOneReady) {
      nextMilestone = 'Complete validation level 1 with strong customer discovery proof.';
    } else if (!isValidationLevelTwoReady) {
      nextMilestone = 'Move beyond interviews into a live validation test with measurable traction.';
    } else {
      nextMilestone = 'Prepare the next readiness review with proof-backed narrative and support activation.';
    }
  }

  let staffAttentionLevel: CompanyOperatingInsight['staffAttentionLevel'] = 'low';
  let staffAttentionReason = 'Evidence is moving and no urgent intervention is obvious.';

  if (latestReview?.status === ReadinessStatus.NOT_READY || latestReview?.status === ReadinessStatus.NEEDS_WORK) {
    staffAttentionLevel = 'high';
    staffAttentionReason = 'A recent readiness review flagged missing proof or rework.';
  } else if (!isValidationLevelOneReady) {
    staffAttentionLevel = 'high';
    staffAttentionReason = 'Customer discovery proof is still below the Builder threshold.';
  } else if (!isValidationLevelTwoReady || (isValidationLevelOneReady && activeMentorAssignments === 0)) {
    staffAttentionLevel = 'medium';
    staffAttentionReason = !isValidationLevelTwoReady
      ? 'The company is ready to move beyond interviews but still needs test-driven validation.'
      : 'Validation level 1 is satisfied and mentor support can likely be activated.';
  }

  const needsReviewNow =
    staffAttentionLevel !== 'low' ||
    availableResources.length > 0 ||
    latestReview?.status === ReadinessStatus.NEEDS_REVIEW;

  let recommendedDecisionType = ReadinessType.BUILDER_COMPLETION;
  let recommendedDecisionLabel = 'Builder completion review';
  if (isValidationLevelTwoReady) {
    recommendedDecisionType = ReadinessType.INTERN_READY;
    recommendedDecisionLabel = 'Intern / build readiness review';
  } else if (isValidationLevelOneReady) {
    recommendedDecisionType = ReadinessType.MENTOR_READY;
    recommendedDecisionLabel = 'Mentor readiness review';
  } else if (latestReview?.reviewType) {
    recommendedDecisionType = latestReview.reviewType;
    recommendedDecisionLabel = `${latestReview.reviewType.replace(/_/g, ' ')} re-review`;
  }

  let recommendedSupportAction =
    'Keep the founder in Builder evidence work and close the next proof gap before activating more support.';
  if (isValidationLevelOneReady && activeMentorAssignments === 0) {
    recommendedSupportAction =
      'Activate mentor matching and pitch-adjacent support from the evidence already on hand.';
  } else if (isValidationLevelOneReady && !isValidationLevelTwoReady) {
    recommendedSupportAction =
      'Hold build-heavy support for now and push one measurable validation test beyond interviews.';
  } else if (isValidationLevelTwoReady) {
    recommendedSupportAction =
      'Review build and funding-prep pathways now that testing and traction signals are in place.';
  }

  let escalationRecommendation = 'No immediate escalation is obvious.';
  if (latestReview?.status === ReadinessStatus.NOT_READY || latestReview?.status === ReadinessStatus.NEEDS_WORK) {
    escalationRecommendation =
      'Staff follow-up is needed to turn the latest review into a tighter rework plan.';
  } else if (isValidationLevelOneReady && activeMentorAssignments === 0) {
    escalationRecommendation = 'Mentor activation is the clearest next escalation.';
  } else if (isValidationLevelTwoReady) {
    escalationRecommendation =
      'Escalate to build-support review rather than widening founder scope alone.';
  }

  return {
    stage,
    stageLabel: formatStageLabel(stage),
    recordedProgressScore: progress?.progressScore,
    interviewCount: interviews.length,
    countedInterviews,
    highPainInterviewCount,
    patternCount: patterns.length,
    strongPatternCount,
    assumptionCount: assumptions.length,
    validatedAssumptionCount,
    experimentCount: experiments.length,
    activeExperimentCount,
    tractionSignalCount,
    availableResources,
    lockedResources,
    strongestEvidence,
    proofGaps,
    weeklyPriorities,
    nextMilestone,
    latestReview,
    readinessByType,
    isValidationLevelOneReady,
    isValidationLevelTwoReady,
    activeMentorAssignments,
    needsMentor: isValidationLevelOneReady && activeMentorAssignments === 0,
    needsReviewNow,
    recommendedDecisionType,
    recommendedDecisionLabel,
    recommendedSupportAction,
    escalationRecommendation,
    staffAttentionLevel,
    staffAttentionReason,
  };
};
