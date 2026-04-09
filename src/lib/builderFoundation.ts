import {
  type BuilderFoundation,
  type BuilderIdeaToProblem,
  type EarlyAdopterProfile,
  type LeanCanvasDraft,
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

export const createEmptyBuilderFoundation = (companyId: string): BuilderFoundation => {
  const now = new Date().toISOString();

  return {
    id: companyId,
    companyId,
    ideaToProblem: emptyIdeaToProblem(),
    leanCanvas: emptyLeanCanvas(),
    earlyAdopter: emptyEarlyAdopter(),
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
  interviewReady: boolean;
}

export const getBuilderFoundationCompletion = (foundation: BuilderFoundation | null): BuilderFoundationCompletion => {
  if (!foundation) {
    return {
      ideaToProblemComplete: false,
      leanCanvasComplete: false,
      earlyAdopterComplete: false,
      interviewReady: false,
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

  return {
    ideaToProblemComplete,
    leanCanvasComplete,
    earlyAdopterComplete,
    interviewReady: ideaToProblemComplete && leanCanvasComplete && earlyAdopterComplete,
  };
};
