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
  Signal,
  StartupStage,
} from '../types';
import { formatStageLabel } from './roleRouting';

export type SupportResourceStatus = 'available' | 'locked';

export interface SupportResourceDefinition {
  key: string;
  name: string;
  category: 'program' | 'mentor' | 'pitch' | 'build' | 'capital';
  gate: 'validation_level_1' | 'validation_level_2';
  description: string;
}

export interface SupportResourceState extends SupportResourceDefinition {
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

const SUPPORT_RESOURCES: SupportResourceDefinition[] = [
  {
    key: 'testing_track',
    name: 'Testing Track',
    category: 'program',
    gate: 'validation_level_1',
    description: 'Structured support once customer discovery proof is strong enough to move into testing.',
  },
  {
    key: 'monthly_reporting',
    name: 'Monthly Reporting',
    category: 'program',
    gate: 'validation_level_1',
    description: 'Recurring founder accountability once Builder proof is active and reviewable.',
  },
  {
    key: 'startup_circle',
    name: 'Startup Circle',
    category: 'program',
    gate: 'validation_level_1',
    description: 'Peer support after appropriate customer discovery is in place.',
  },
  {
    key: 'mentor_programs',
    name: 'Mentor Programs',
    category: 'mentor',
    gate: 'validation_level_1',
    description: 'Mentor access once discovery proof is mature enough to support sharper guidance.',
  },
  {
    key: 'pitch_opportunities',
    name: 'Pitch Opportunities',
    category: 'pitch',
    gate: 'validation_level_1',
    description: 'Pitch practice after core customer truth is established.',
  },
  {
    key: 'mix_and_jingle',
    name: 'Mix & Jingle',
    category: 'pitch',
    gate: 'validation_level_1',
    description: 'Elevator-pitch support tied to validation level 1.',
  },
  {
    key: 'tech_tank',
    name: 'Tech Tank',
    category: 'build',
    gate: 'validation_level_2',
    description: 'Build-adjacent support once evidence moves beyond interviews into testing.',
  },
  {
    key: 'product_requirements_doc',
    name: 'Product Requirements Doc',
    category: 'build',
    gate: 'validation_level_2',
    description: 'PRD help after validation extends past discovery and into live tests.',
  },
  {
    key: 'tech_intern_support',
    name: 'Tech Intern Support',
    category: 'build',
    gate: 'validation_level_2',
    description: 'Intern support after the business model has been validated beyond interviews alone.',
  },
  {
    key: 'funding_support',
    name: 'Funding Support',
    category: 'capital',
    gate: 'validation_level_2',
    description: 'Funding preparation once testing and signals support the story.',
  },
  {
    key: 'sbir_sttr',
    name: 'SBIR / STTR',
    category: 'capital',
    gate: 'validation_level_2',
    description: 'Non-dilutive support once the venture has test-backed evidence.',
  },
  {
    key: 'angel_venture',
    name: 'Angel / Venture',
    category: 'capital',
    gate: 'validation_level_2',
    description: 'Investor pathway visibility only after stronger validation and traction signals exist.',
  },
];

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

  const levelOneProofGaps: string[] = [];
  if (countedInterviews < 15) {
    levelOneProofGaps.push(`Log ${15 - countedInterviews} more interviews that count toward the Builder minimum of 15.`);
  }
  if (highPainInterviewCount < 5) {
    levelOneProofGaps.push(
      `Capture ${5 - highPainInterviewCount} more strong customer pain signals with pain intensity 4 or 5.`
    );
  }
  if (strongPatternCount < 2) {
    levelOneProofGaps.push(`Synthesize at least ${2 - strongPatternCount} more repeated problem patterns.`);
  }
  if (assumptions.length < 3) {
    levelOneProofGaps.push(`Map ${3 - assumptions.length} more risky assumptions that still need proof.`);
  }

  const isValidationLevelOneReady = levelOneProofGaps.length === 0;

  const levelTwoProofGaps: string[] = [];
  if (!isValidationLevelOneReady) {
    levelTwoProofGaps.push('Complete validation level 1 before moving into build and funding pathways.');
  }
  if (experiments.length < 1) {
    levelTwoProofGaps.push('Run at least one validation test beyond interviews.');
  }
  if (tractionSignalCount < 1) {
    levelTwoProofGaps.push('Log at least one measurable traction signal from live testing.');
  }

  const isValidationLevelTwoReady = levelTwoProofGaps.length === 0;
  const stage = inferStage(progress, countedInterviews, activeExperimentCount, tractionSignalCount);

  const availableResources = SUPPORT_RESOURCES.filter((resource) =>
    resource.gate === 'validation_level_1' ? isValidationLevelOneReady : isValidationLevelTwoReady
  ).map((resource) => ({
    ...resource,
    status: 'available' as const,
    missingProof: [],
  }));

  const lockedResources = SUPPORT_RESOURCES.filter((resource) =>
    resource.gate === 'validation_level_1' ? !isValidationLevelOneReady : !isValidationLevelTwoReady
  ).map((resource) => ({
    ...resource,
    status: 'locked' as const,
    missingProof: resource.gate === 'validation_level_1' ? levelOneProofGaps : levelTwoProofGaps,
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
