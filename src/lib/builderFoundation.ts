import {
  type BuilderFoundation,
  type BuilderIdeaToProblem,
  type BuilderInterviewGuide,
  type BuilderOutreachTarget,
  type BuilderOutreachTracker,
  type EarlyAdopterProfile,
  type LeanCanvasDraft,
  OutreachTargetStatus,
} from '../types';

const emptyIdeaToProblem = (): BuilderIdeaToProblem => ({
  founderIdea: '',
  problemOwner: '',
  problemMoment: '',
  currentBehavior: '',
  currentAlternative: '',
  whyCurrentPathFallsShort: '',
  desiredOutcome: '',
});

const emptyLeanCanvas = (): LeanCanvasDraft => ({
  customerSegments: [],
  problems: [],
  existingAlternatives: [],
  uniqueValueProposition: '',
  solutionApproach: [],
  channels: [],
  keyMetrics: [],
  revenueStreams: [],
  costStructure: [],
  unfairAdvantage: '',
});

const emptyEarlyAdopter = (): EarlyAdopterProfile => ({
  segmentName: '',
  personaLabel: '',
  situation: '',
  currentBehavior: '',
  whyThisGroupFirst: '',
  reachChannels: [],
  excludedSegments: [],
});

const emptyInterviewGuide = (): BuilderInterviewGuide => ({
  targetSegment: '',
  primaryLearningGoal: '',
  assumptionIds: [],
  openingQuestions: [],
  problemQuestions: [],
  currentBehaviorQuestions: [],
  alternativeQuestions: [],
  closingQuestions: [],
  successSignalsToListenFor: [],
});

const normalizeOutreachTargets = (value: unknown): BuilderOutreachTarget[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .map((entry) => ({
          label: typeof entry.label === 'string' ? entry.label.trim() : '',
          roleOrCompany: typeof entry.roleOrCompany === 'string' ? entry.roleOrCompany.trim() : '',
          outreachChannel: typeof entry.outreachChannel === 'string' ? entry.outreachChannel.trim() : '',
          status:
            entry.status === OutreachTargetStatus.CONTACTED ||
            entry.status === OutreachTargetStatus.REPLIED ||
            entry.status === OutreachTargetStatus.SCHEDULED
              ? entry.status
              : OutreachTargetStatus.TO_CONTACT,
          notes: typeof entry.notes === 'string' ? entry.notes.trim() : '',
        }))
        .filter((entry) => entry.label || entry.roleOrCompany || entry.notes)
    : [];

const emptyOutreachTracker = (): BuilderOutreachTracker => ({
  outreachGoal: '',
  targetCount: 10,
  sourcingChannels: [],
  messageHook: '',
  followUpWindow: '',
  targets: [],
});

export const createEmptyBuilderFoundation = (companyId: string): BuilderFoundation => {
  const now = new Date().toISOString();

  return {
    id: companyId,
    companyId,
    ideaToProblem: emptyIdeaToProblem(),
    leanCanvas: emptyLeanCanvas(),
    earlyAdopter: emptyEarlyAdopter(),
    interviewGuide: emptyInterviewGuide(),
    outreachTracker: emptyOutreachTracker(),
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

export const normalizeBuilderFoundation = (
  foundation: Partial<BuilderFoundation> & { id: string; companyId?: string }
): BuilderFoundation => {
  const base = createEmptyBuilderFoundation(foundation.companyId || foundation.id);

  return {
    ...base,
    id: foundation.id,
    companyId: typeof foundation.companyId === 'string' && foundation.companyId.trim() ? foundation.companyId : base.companyId,
    ideaToProblem: {
      founderIdea: typeof foundation.ideaToProblem?.founderIdea === 'string' ? foundation.ideaToProblem.founderIdea.trim() : '',
      problemOwner: typeof foundation.ideaToProblem?.problemOwner === 'string' ? foundation.ideaToProblem.problemOwner.trim() : '',
      problemMoment: typeof foundation.ideaToProblem?.problemMoment === 'string' ? foundation.ideaToProblem.problemMoment.trim() : '',
      currentBehavior: typeof foundation.ideaToProblem?.currentBehavior === 'string' ? foundation.ideaToProblem.currentBehavior.trim() : '',
      currentAlternative:
        typeof foundation.ideaToProblem?.currentAlternative === 'string'
          ? foundation.ideaToProblem.currentAlternative.trim()
          : '',
      whyCurrentPathFallsShort:
        typeof foundation.ideaToProblem?.whyCurrentPathFallsShort === 'string'
          ? foundation.ideaToProblem.whyCurrentPathFallsShort.trim()
          : '',
      desiredOutcome:
        typeof foundation.ideaToProblem?.desiredOutcome === 'string'
          ? foundation.ideaToProblem.desiredOutcome.trim()
          : '',
    },
    leanCanvas: {
      customerSegments: normalizeStringArray(foundation.leanCanvas?.customerSegments),
      problems: normalizeStringArray(foundation.leanCanvas?.problems),
      existingAlternatives: normalizeStringArray(foundation.leanCanvas?.existingAlternatives),
      uniqueValueProposition:
        typeof foundation.leanCanvas?.uniqueValueProposition === 'string'
          ? foundation.leanCanvas.uniqueValueProposition.trim()
          : '',
      solutionApproach: normalizeStringArray(foundation.leanCanvas?.solutionApproach),
      channels: normalizeStringArray(foundation.leanCanvas?.channels),
      keyMetrics: normalizeStringArray(foundation.leanCanvas?.keyMetrics),
      revenueStreams: normalizeStringArray(foundation.leanCanvas?.revenueStreams),
      costStructure: normalizeStringArray(foundation.leanCanvas?.costStructure),
      unfairAdvantage:
        typeof foundation.leanCanvas?.unfairAdvantage === 'string'
          ? foundation.leanCanvas.unfairAdvantage.trim()
          : '',
    },
    earlyAdopter: {
      segmentName: typeof foundation.earlyAdopter?.segmentName === 'string' ? foundation.earlyAdopter.segmentName.trim() : '',
      personaLabel: typeof foundation.earlyAdopter?.personaLabel === 'string' ? foundation.earlyAdopter.personaLabel.trim() : '',
      situation: typeof foundation.earlyAdopter?.situation === 'string' ? foundation.earlyAdopter.situation.trim() : '',
      currentBehavior:
        typeof foundation.earlyAdopter?.currentBehavior === 'string'
          ? foundation.earlyAdopter.currentBehavior.trim()
          : '',
      whyThisGroupFirst:
        typeof foundation.earlyAdopter?.whyThisGroupFirst === 'string'
          ? foundation.earlyAdopter.whyThisGroupFirst.trim()
          : '',
      reachChannels: normalizeStringArray(foundation.earlyAdopter?.reachChannels),
      excludedSegments: normalizeStringArray(foundation.earlyAdopter?.excludedSegments),
    },
    interviewGuide: {
      targetSegment:
        typeof foundation.interviewGuide?.targetSegment === 'string'
          ? foundation.interviewGuide.targetSegment.trim()
          : '',
      primaryLearningGoal:
        typeof foundation.interviewGuide?.primaryLearningGoal === 'string'
          ? foundation.interviewGuide.primaryLearningGoal.trim()
          : '',
      assumptionIds: normalizeStringArray(foundation.interviewGuide?.assumptionIds),
      openingQuestions: normalizeStringArray(foundation.interviewGuide?.openingQuestions),
      problemQuestions: normalizeStringArray(foundation.interviewGuide?.problemQuestions),
      currentBehaviorQuestions: normalizeStringArray(foundation.interviewGuide?.currentBehaviorQuestions),
      alternativeQuestions: normalizeStringArray(foundation.interviewGuide?.alternativeQuestions),
      closingQuestions: normalizeStringArray(foundation.interviewGuide?.closingQuestions),
      successSignalsToListenFor: normalizeStringArray(foundation.interviewGuide?.successSignalsToListenFor),
    },
    outreachTracker: {
      outreachGoal:
        typeof foundation.outreachTracker?.outreachGoal === 'string'
          ? foundation.outreachTracker.outreachGoal.trim()
          : '',
      targetCount:
        typeof foundation.outreachTracker?.targetCount === 'number' && Number.isFinite(foundation.outreachTracker.targetCount)
          ? foundation.outreachTracker.targetCount
          : 10,
      sourcingChannels: normalizeStringArray(foundation.outreachTracker?.sourcingChannels),
      messageHook:
        typeof foundation.outreachTracker?.messageHook === 'string'
          ? foundation.outreachTracker.messageHook.trim()
          : '',
      followUpWindow:
        typeof foundation.outreachTracker?.followUpWindow === 'string'
          ? foundation.outreachTracker.followUpWindow.trim()
          : '',
      targets: normalizeOutreachTargets(foundation.outreachTracker?.targets),
    },
    createdAt: typeof foundation.createdAt === 'string' ? foundation.createdAt : base.createdAt,
    updatedAt: typeof foundation.updatedAt === 'string' ? foundation.updatedAt : base.updatedAt,
    updatedByPersonId:
      typeof foundation.updatedByPersonId === 'string' && foundation.updatedByPersonId.trim()
        ? foundation.updatedByPersonId
        : undefined,
  };
};

export const parseBuilderList = (value: string): string[] =>
  value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

export const formatBuilderList = (values: string[]): string => values.join('\n');

export interface BuilderFoundationCompletion {
  ideaToProblemComplete: boolean;
  leanCanvasComplete: boolean;
  earlyAdopterComplete: boolean;
  interviewGuideComplete: boolean;
  outreachTrackerComplete: boolean;
  discoveryReady: boolean;
}

export const getBuilderFoundationCompletion = (foundation: BuilderFoundation | null): BuilderFoundationCompletion => {
  if (!foundation) {
    return {
      ideaToProblemComplete: false,
      leanCanvasComplete: false,
      earlyAdopterComplete: false,
      interviewGuideComplete: false,
      outreachTrackerComplete: false,
      discoveryReady: false,
    };
  }

  const ideaToProblemComplete = [
    foundation.ideaToProblem.problemOwner,
    foundation.ideaToProblem.problemMoment,
    foundation.ideaToProblem.currentBehavior,
    foundation.ideaToProblem.whyCurrentPathFallsShort,
  ].every((value) => value.trim().length > 0);

  const leanCanvasComplete =
    foundation.leanCanvas.customerSegments.length > 0 &&
    foundation.leanCanvas.problems.length > 0 &&
    foundation.leanCanvas.existingAlternatives.length > 0 &&
    foundation.leanCanvas.uniqueValueProposition.trim().length > 0 &&
    foundation.leanCanvas.channels.length > 0;

  const earlyAdopterComplete = [
    foundation.earlyAdopter.segmentName,
    foundation.earlyAdopter.personaLabel,
    foundation.earlyAdopter.situation,
    foundation.earlyAdopter.currentBehavior,
    foundation.earlyAdopter.whyThisGroupFirst,
  ].every((value) => value.trim().length > 0);

  const interviewGuideComplete =
    foundation.interviewGuide.primaryLearningGoal.trim().length > 0 &&
    foundation.interviewGuide.openingQuestions.length > 0 &&
    foundation.interviewGuide.problemQuestions.length > 0 &&
    foundation.interviewGuide.currentBehaviorQuestions.length > 0 &&
    foundation.interviewGuide.closingQuestions.length > 0;

  const outreachTrackerComplete =
    foundation.outreachTracker.outreachGoal.trim().length > 0 &&
    foundation.outreachTracker.sourcingChannels.length > 0 &&
    foundation.outreachTracker.messageHook.trim().length > 0 &&
    foundation.outreachTracker.targets.length > 0;

  return {
    ideaToProblemComplete,
    leanCanvasComplete,
    earlyAdopterComplete,
    interviewGuideComplete,
    outreachTrackerComplete,
    discoveryReady:
      ideaToProblemComplete &&
      leanCanvasComplete &&
      earlyAdopterComplete &&
      interviewGuideComplete &&
      outreachTrackerComplete,
  };
};
