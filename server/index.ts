import express from 'express';
import { config } from 'dotenv';
import {
  AssumptionStatus,
  ReadinessStatus,
  StageConfidence,
  type Assumption,
  type Company,
  type Experiment,
  type Interview,
  type Pattern,
  type ReadinessReview,
  type Signal,
  type VentureCopilotAnalysis,
  type VentureCopilotInsight,
  type VentureCopilotRecommendation,
  type VentureCopilotRequest,
  type VentureCopilotResponse,
  type VentureCopilotRisk,
} from '../src/types';

config();

const app = express();
const port = Number(process.env.PORT || 8787);
const heuristicModelName = 'rules/venture-os-v1';

const openAiSchema = {
  type: 'object',
  properties: {
    executiveSummary: { type: 'string' },
    momentumScore: { type: 'number', minimum: 0, maximum: 100 },
    confidence: { type: 'string', enum: Object.values(StageConfidence) },
    marketPulse: { type: 'string' },
    tractionNarrative: { type: 'string' },
    problemInsights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
          evidence: { type: 'string' },
          confidence: { type: 'string', enum: Object.values(StageConfidence) },
          nextMove: { type: 'string' },
        },
        required: ['theme', 'evidence', 'confidence', 'nextMove'],
        additionalProperties: false,
      },
    },
    riskMap: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: {
            type: 'string',
            enum: ['desirability', 'feasibility', 'viability', 'fundraising', 'execution'],
          },
          severity: { type: 'string', enum: Object.values(StageConfidence) },
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['area', 'severity', 'title', 'detail'],
        additionalProperties: false,
      },
    },
    recommendedExperiments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          reason: { type: 'string' },
          owner: { type: 'string' },
          successMetric: { type: 'string' },
        },
        required: ['title', 'reason', 'owner', 'successMetric'],
        additionalProperties: false,
      },
    },
    investorReadiness: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['not_ready', 'emerging', 'ready'] },
        rationale: { type: 'string' },
        missingProof: {
          type: 'array',
          items: { type: 'string' },
        },
        nextMilestone: { type: 'string' },
      },
      required: ['status', 'rationale', 'missingProof', 'nextMilestone'],
      additionalProperties: false,
    },
    coachQuestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'executiveSummary',
    'momentumScore',
    'confidence',
    'marketPulse',
    'tractionNarrative',
    'problemInsights',
    'riskMap',
    'recommendedExperiments',
    'investorReadiness',
    'coachQuestions',
  ],
  additionalProperties: false,
};

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: process.env.AI_PROVIDER || 'auto' });
});

app.post('/api/copilot/analyze', async (req, res) => {
  const payload = req.body as VentureCopilotRequest | undefined;

  if (!payload?.company?.id) {
    return res.status(400).send('A company snapshot is required to generate a copilot brief.');
  }

  try {
    const result = await generateVentureCopilotResponse(payload);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected analysis failure.';
    return res.status(500).send(message);
  }
});

app.listen(port, () => {
  console.log(`Venture Copilot API listening on http://localhost:${port}`);
});

async function generateVentureCopilotResponse(
  payload: VentureCopilotRequest,
): Promise<VentureCopilotResponse> {
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();

  if ((provider === 'auto' || provider === 'openai') && process.env.OPENAI_API_KEY) {
    try {
      const analysis = await generateOpenAiAnalysis(payload);
      return {
        engine: {
          provider: 'openai',
          model: process.env.OPENAI_MODEL || 'gpt-5',
        },
        generatedAt: new Date().toISOString(),
        analysis,
      };
    } catch (error) {
      console.error('OpenAI Venture Copilot failed, falling back to heuristic mode.', error);
    }
  }

  return {
    engine: {
      provider: 'heuristic',
      model: heuristicModelName,
    },
    generatedAt: new Date().toISOString(),
    analysis: buildHeuristicAnalysis(payload),
  };
}

async function generateOpenAiAnalysis(payload: VentureCopilotRequest): Promise<VentureCopilotAnalysis> {
  const model = process.env.OPENAI_MODEL || 'gpt-5';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: [
        'You are the Venture Copilot for OM Venture OS.',
        'Create an operating brief for startup support teams using only the provided evidence snapshot.',
        'Separate observed evidence from inference.',
        'Prefer sharp, actionable recommendations over generic startup advice.',
        'If evidence is thin, say so plainly and lower confidence rather than filling gaps with certainty.',
      ].join(' '),
      input: JSON.stringify(compactPayload(payload), null, 2),
      text: {
        format: {
          type: 'json_schema',
          name: 'venture_copilot_analysis',
          strict: true,
          schema: openAiSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as { output_text?: string };
  if (!data.output_text) {
    throw new Error('OpenAI returned an empty analysis payload.');
  }

  return JSON.parse(data.output_text) as VentureCopilotAnalysis;
}

function compactPayload(payload: VentureCopilotRequest) {
  return {
    focusPrompt: payload.focusPrompt || null,
    company: {
      name: payload.company.name,
      description: payload.company.description || '',
      membershipStatus: payload.company.membershipStatus || 'unknown',
      website: payload.company.website || '',
    },
    interviews: payload.interviews
      .slice()
      .sort((a, b) => b.interviewDate.localeCompare(a.interviewDate))
      .slice(0, 20)
      .map((interview) => ({
        intervieweeSegment: interview.intervieweeSegment,
        interviewDate: interview.interviewDate,
        problemTheme: interview.problemTheme,
        painIntensity: interview.painIntensity,
        mentionSpontaneous: interview.mentionSpontaneous,
        currentAlternative: interview.currentAlternative,
        bestQuote: interview.bestQuote,
        followUpNeeded: interview.followUpNeeded,
      })),
    patterns: payload.patterns
      .slice()
      .sort((a, b) => b.numberOfMentions - a.numberOfMentions)
      .slice(0, 10)
      .map((pattern) => ({
        problemTheme: pattern.problemTheme,
        numberOfMentions: pattern.numberOfMentions,
        averagePainIntensity: pattern.averagePainIntensity || null,
        status: pattern.status,
        representativeQuote: pattern.representativeQuote || '',
      })),
    assumptions: payload.assumptions
      .slice()
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 12)
      .map((assumption) => ({
        statement: assumption.statement,
        type: assumption.type,
        importanceScore: assumption.importanceScore,
        evidenceScore: assumption.evidenceScore,
        priorityScore: assumption.priorityScore,
        status: assumption.status,
      })),
    experiments: payload.experiments
      .slice()
      .sort((a, b) => (b.startDate || b.createdAt).localeCompare(a.startDate || a.createdAt))
      .slice(0, 12)
      .map((experiment) => ({
        hypothesis: experiment.hypothesis,
        testType: experiment.testType,
        channel: experiment.channel || '',
        successMetric: experiment.successMetric || '',
        result: experiment.result || '',
        learning: experiment.learning || '',
        nextAction: experiment.nextAction || '',
        active: experiment.active,
      })),
    signals: payload.signals
      .slice()
      .sort((a, b) => (b.signalDate || b.createdAt).localeCompare(a.signalDate || a.createdAt))
      .slice(0, 12)
      .map((signal) => ({
        signalDate: signal.signalDate,
        type: signal.type || '',
        source: signal.source || '',
        waitlistSignups: signal.waitlistSignups || 0,
        callsBooked: signal.callsBooked || 0,
        pilots: signal.pilots || 0,
        lois: signal.lois || 0,
        preOrders: signal.preOrders || 0,
        payingCustomers: signal.payingCustomers || 0,
        revenue: signal.revenue || 0,
        repeatUsage: signal.repeatUsage || 0,
        notes: signal.notes || '',
      })),
    readinessReviews: payload.readinessReviews
      .slice()
      .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
      .slice(0, 5)
      .map((review) => ({
        reviewType: review.reviewType,
        status: review.status,
        reasons: review.reasons || [],
        missingItems: review.missingItems || [],
        notes: review.notes || '',
      })),
  };
}

function buildHeuristicAnalysis(payload: VentureCopilotRequest): VentureCopilotAnalysis {
  const themeCandidates = buildThemeCandidates(payload.interviews, payload.patterns);
  const problemInsights = themeCandidates.slice(0, 3).map((candidate) => ({
    theme: candidate.theme,
    evidence: candidate.evidence,
    confidence: candidate.confidence,
    nextMove: candidate.nextMove,
  }));

  const traction = summarizeSignals(payload.signals);
  const interviewCount = payload.interviews.length;
  const avgPain = average(payload.interviews.map((item) => item.painIntensity));
  const validatedAssumptions = payload.assumptions.filter(
    (assumption) => assumption.status === AssumptionStatus.VALIDATED,
  ).length;
  const activeExperiments = payload.experiments.filter((experiment) => experiment.active).length;
  const latestReadiness = payload.readinessReviews
    .slice()
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];

  const momentumScore = clamp(
    Math.round(
      interviewCount * 2 +
        avgPain * 6 +
        Math.min(traction.total, 30) +
        activeExperiments * 6 +
        validatedAssumptions * 4 +
        readinessBonus(latestReadiness),
    ),
    0,
    100,
  );

  const confidence = deriveConfidence(interviewCount, traction.total, payload.patterns.length);
  const riskMap = buildRiskMap(payload, avgPain, traction.total);
  const recommendedExperiments = buildRecommendations(payload, traction.total, interviewCount);
  const investorReadiness = buildInvestorReadiness(payload, traction.total, interviewCount);
  const coachQuestions = buildCoachQuestions(payload, traction.total, interviewCount);

  const executiveSummary = [
    `${payload.company.name} shows ${describeConfidence(confidence)} signal quality with a momentum score of ${momentumScore}/100.`,
    interviewCount > 0
      ? `The team has logged ${interviewCount} interviews with an average pain score of ${avgPain.toFixed(1)}/5.`
      : 'The team has not yet logged enough discovery evidence to support a confident thesis.',
    traction.total > 0
      ? `Traction is emerging through ${traction.summary.toLowerCase()}.`
      : 'Commercial proof is still thin, so the next cycle should focus on turning customer pain into measurable demand.',
  ].join(' ');

  return {
    executiveSummary,
    momentumScore,
    confidence,
    marketPulse:
      problemInsights.length > 0
        ? `${problemInsights[0].theme} is the clearest market signal right now.`
        : 'Market signal is still noisy because the evidence base is thin.',
    tractionNarrative:
      traction.total > 0
        ? `Current traction snapshot: ${traction.summary}.`
        : 'No meaningful traction signals are logged yet, so discovery and testing need to tighten before fundraising conversations.',
    problemInsights,
    riskMap,
    recommendedExperiments,
    investorReadiness,
    coachQuestions,
  };
}

function buildThemeCandidates(interviews: Interview[], patterns: Pattern[]) {
  if (patterns.length > 0) {
    return patterns
      .slice()
      .sort((a, b) => {
        const left = b.numberOfMentions - a.numberOfMentions;
        if (left !== 0) {
          return left;
        }

        return (b.averagePainIntensity || 0) - (a.averagePainIntensity || 0);
      })
      .map((pattern) => ({
        theme: pattern.problemTheme,
        evidence: `${pattern.numberOfMentions} mentions, ${formatPain(pattern.averagePainIntensity)} average pain, status ${pattern.status}.`,
        confidence: deriveConfidence(pattern.numberOfMentions, pattern.unpromptedMentions || 0, 1),
        nextMove:
          pattern.status === 'pivot'
            ? 'Pressure-test whether this problem is worth pursuing before investing in more build work.'
            : 'Run a targeted experiment that converts this pain pattern into demand or commitment.',
      }));
  }

  const grouped = new Map<string, Interview[]>();
  for (const interview of interviews) {
    const theme = interview.problemTheme?.trim() || 'Uncategorized';
    const group = grouped.get(theme) || [];
    group.push(interview);
    grouped.set(theme, group);
  }

  return Array.from(grouped.entries())
    .map(([theme, items]) => {
      const pain = average(items.map((item) => item.painIntensity));
      const spontaneousCount = items.filter((item) => item.mentionSpontaneous).length;
      return {
        theme,
        evidence: `${items.length} interviews, ${pain.toFixed(1)}/5 average pain, ${spontaneousCount} unprompted mentions.`,
        confidence: deriveConfidence(items.length, spontaneousCount, 1),
        nextMove: 'Cluster the strongest quotes into a clear value proposition and test conversion against one segment.',
      };
    })
    .sort((a, b) => extractLeadingCount(b.evidence) - extractLeadingCount(a.evidence));
}

function buildRiskMap(
  payload: VentureCopilotRequest,
  avgPain: number,
  tractionTotal: number,
): VentureCopilotRisk[] {
  const risks: VentureCopilotRisk[] = [];
  const weakHighPriorityAssumption = payload.assumptions
    .filter((assumption) => assumption.priorityScore >= 12 && assumption.evidenceScore <= 2)
    .sort((a, b) => b.priorityScore - a.priorityScore)[0];

  if (payload.interviews.length < 10) {
    risks.push({
      area: 'desirability',
      severity: StageConfidence.HIGH,
      title: 'Discovery sample is still shallow',
      detail: `Only ${payload.interviews.length} interviews are logged. Increase sample depth before locking product direction.`,
    });
  }

  if (avgPain < 3.5 && payload.interviews.length > 0) {
    risks.push({
      area: 'desirability',
      severity: StageConfidence.MEDIUM,
      title: 'Pain intensity may not be sharp enough',
      detail: `Average pain is ${avgPain.toFixed(1)}/5, which suggests the team may still be too broad or too early on the right wedge.`,
    });
  }

  if (weakHighPriorityAssumption) {
    risks.push({
      area: weakHighPriorityAssumption.type === 'viability' ? 'viability' : weakHighPriorityAssumption.type,
      severity: StageConfidence.HIGH,
      title: 'A critical assumption is still under-evidenced',
      detail: `"${weakHighPriorityAssumption.statement}" has priority ${weakHighPriorityAssumption.priorityScore} but only evidence score ${weakHighPriorityAssumption.evidenceScore}.`,
    });
  }

  if (payload.experiments.filter((experiment) => experiment.active).length === 0) {
    risks.push({
      area: 'execution',
      severity: StageConfidence.MEDIUM,
      title: 'No active learning loop is running',
      detail: 'The team has evidence, but no active experiment is currently converting that evidence into the next proof point.',
    });
  }

  if (tractionTotal === 0) {
    risks.push({
      area: 'fundraising',
      severity: StageConfidence.HIGH,
      title: 'Traction proof is missing',
      detail: 'There are no logged traction signals yet, which makes investor and mentor escalation harder to justify.',
    });
  }

  const latestReadiness = payload.readinessReviews
    .slice()
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
  if (latestReadiness && latestReadiness.status !== ReadinessStatus.READY) {
    risks.push({
      area: 'fundraising',
      severity: latestReadiness.status === ReadinessStatus.NEEDS_WORK ? StageConfidence.HIGH : StageConfidence.MEDIUM,
      title: 'Readiness review is not yet green',
      detail: `Latest ${latestReadiness.reviewType} review is ${latestReadiness.status}, which suggests the company is not yet ready for the next capital motion.`,
    });
  }

  return risks.slice(0, 4);
}

function buildRecommendations(
  payload: VentureCopilotRequest,
  tractionTotal: number,
  interviewCount: number,
): VentureCopilotRecommendation[] {
  const recommendations: VentureCopilotRecommendation[] = [];
  const topUnknownAssumptions = payload.assumptions
    .filter((assumption) => assumption.status !== AssumptionStatus.VALIDATED)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 2);

  if (interviewCount < 10) {
    recommendations.push({
      title: 'Finish the next 5 focused discovery interviews',
      reason: 'The evidence base is still too thin for a durable product thesis.',
      owner: 'Founder',
      successMetric: 'At least 5 additional interviews with pain intensity 4 or 5 in the target segment.',
    });
  }

  for (const assumption of topUnknownAssumptions) {
    recommendations.push({
      title: `Test: ${assumption.statement}`,
      reason: `This is one of the highest-priority unresolved assumptions in the system.`,
      owner: assumption.type === 'viability' ? 'Founder + OM staff' : 'Founder',
      successMetric: `Raise the evidence score above 3 through one measurable experiment tied to ${assumption.type}.`,
    });
  }

  if (tractionTotal === 0) {
    recommendations.push({
      title: 'Launch a demand-capture test',
      reason: 'The product needs a measurable proof-of-interest loop, not just qualitative learning.',
      owner: 'Founder',
      successMetric: 'Generate a first wave of signups, meetings, pilots, or paid commitments tied to one clear offer.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Turn the strongest evidence theme into a sharper conversion experiment',
      reason: 'The company has enough signal to move from learning into commitment.',
      owner: 'Founder',
      successMetric: 'Create one experiment with a binary success metric and a hard deadline.',
    });
  }

  return recommendations.slice(0, 3);
}

function buildInvestorReadiness(
  payload: VentureCopilotRequest,
  tractionTotal: number,
  interviewCount: number,
) {
  const latestReadiness = payload.readinessReviews
    .slice()
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
  const missingProof: string[] = [];

  if (interviewCount < 10) {
    missingProof.push('Deeper customer discovery sample');
  }

  if (tractionTotal === 0) {
    missingProof.push('A measurable traction signal');
  }

  if (payload.assumptions.every((assumption) => assumption.status !== AssumptionStatus.VALIDATED)) {
    missingProof.push('At least one validated core assumption');
  }

  if (latestReadiness?.status === ReadinessStatus.READY) {
    return {
      status: 'ready' as const,
      rationale: 'The latest readiness review is green and the current evidence stack supports a next-step conversation.',
      missingProof,
      nextMilestone: 'Package the best proof into an investor narrative and align the next warm intro motion.',
    };
  }

  if (interviewCount >= 10 && tractionTotal > 0) {
    return {
      status: 'emerging' as const,
      rationale: 'The company has a credible evidence base, but still needs a tighter proof package before investor-facing escalation.',
      missingProof,
      nextMilestone: 'Convert current traction into a stronger commitment metric or readiness review upgrade.',
    };
  }

  return {
    status: 'not_ready' as const,
    rationale: 'The company still needs more proof before capital-readiness work should accelerate.',
    missingProof,
    nextMilestone: 'Focus the next sprint on discovery depth, one decisive experiment, and the first traction signal.',
  };
}

function buildCoachQuestions(
  payload: VentureCopilotRequest,
  tractionTotal: number,
  interviewCount: number,
) {
  const questions = [
    'Which customer segment is showing the sharpest pain today, and what evidence makes that segment the wedge?',
    'What is the single proof point that would most change mentor or investor confidence in the next 30 days?',
  ];

  if (interviewCount < 10) {
    questions.push('What interview pattern still feels ambiguous because the sample size is too small?');
  }

  if (tractionTotal === 0) {
    questions.push('What offer can the team put in front of customers this week to produce a measurable yes or no?');
  }

  if (payload.experiments.filter((experiment) => experiment.active).length === 0) {
    questions.push('What learning loop should stay active continuously so evidence compounds every week?');
  }

  return questions.slice(0, 4);
}

function summarizeSignals(signals: Signal[]) {
  const totals = {
    waitlistSignups: 0,
    callsBooked: 0,
    pilots: 0,
    lois: 0,
    preOrders: 0,
    payingCustomers: 0,
    revenue: 0,
  };

  for (const signal of signals) {
    totals.waitlistSignups += signal.waitlistSignups || 0;
    totals.callsBooked += signal.callsBooked || 0;
    totals.pilots += signal.pilots || 0;
    totals.lois += signal.lois || 0;
    totals.preOrders += signal.preOrders || 0;
    totals.payingCustomers += signal.payingCustomers || 0;
    totals.revenue += signal.revenue || 0;
  }

  const parts = [
    totals.waitlistSignups > 0 ? `${totals.waitlistSignups} waitlist signups` : null,
    totals.callsBooked > 0 ? `${totals.callsBooked} calls booked` : null,
    totals.pilots > 0 ? `${totals.pilots} pilots` : null,
    totals.lois > 0 ? `${totals.lois} LOIs` : null,
    totals.preOrders > 0 ? `${totals.preOrders} pre-orders` : null,
    totals.payingCustomers > 0 ? `${totals.payingCustomers} paying customers` : null,
    totals.revenue > 0 ? `$${totals.revenue.toLocaleString()} revenue` : null,
  ].filter(Boolean) as string[];

  const total =
    Math.min(totals.waitlistSignups, 12) +
    totals.callsBooked * 3 +
    totals.pilots * 6 +
    totals.lois * 5 +
    totals.preOrders * 5 +
    totals.payingCustomers * 8 +
    Math.min(Math.round(totals.revenue / 250), 12);

  return {
    total,
    summary: parts.length > 0 ? parts.join(', ') : 'No traction signals logged yet',
  };
}

function deriveConfidence(primaryEvidence: number, secondaryEvidence: number, patternCount: number) {
  const score = primaryEvidence * 2 + secondaryEvidence + patternCount * 2;

  if (score >= 25) {
    return StageConfidence.HIGH;
  }

  if (score >= 12) {
    return StageConfidence.MEDIUM;
  }

  return StageConfidence.LOW;
}

function readinessBonus(review?: ReadinessReview) {
  if (!review) {
    return 0;
  }

  switch (review.status) {
    case ReadinessStatus.READY:
      return 12;
    case ReadinessStatus.NEEDS_REVIEW:
      return 6;
    default:
      return 0;
  }
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPain(value?: number) {
  return value ? `${value.toFixed(1)}/5` : 'unknown';
}

function describeConfidence(confidence: StageConfidence) {
  switch (confidence) {
    case StageConfidence.HIGH:
      return 'high';
    case StageConfidence.MEDIUM:
      return 'moderate';
    default:
      return 'early';
  }
}

function extractLeadingCount(input: string) {
  const match = input.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}
