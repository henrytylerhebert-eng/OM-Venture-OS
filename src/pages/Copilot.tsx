import React, { useEffect, useState, useTransition } from 'react';
import { where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Gauge,
  LoaderCircle,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import { getAssumptions, getExperiments, getInterviews, getPatterns, getSignals } from '../services/evidenceService';
import { getMentorAssignments } from '../services/mentorService';
import { getReadinessReviews } from '../services/progressService';
import { analyzeVentureEvidence } from '../services/copilotService';
import { cn } from '../lib/utils';
import type {
  Assumption,
  Company,
  Experiment,
  Interview,
  MentorAssignment,
  Pattern,
  ReadinessReview,
  Signal,
  StageConfidence,
  VentureCopilotResponse,
} from '../types';

const severityClasses: Record<StageConfidence, string> = {
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  high: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const readinessClasses = {
  ready: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  emerging: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  not_ready: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const Copilot: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [focusPrompt, setFocusPrompt] = useState('');
  const [analysis, setAnalysis] = useState<VentureCopilotResponse | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [readinessReviews, setReadinessReviews] = useState<ReadinessReview[]>([]);

  useEffect(() => {
    if (!profile?.personId) {
      return;
    }

    setLoadingWorkspace(true);
    const unsubCompanies = getCompanies((nextCompanies) => {
      setCompanies(nextCompanies);
      setLoadingWorkspace(false);
    });

    const unsubAssignments =
      profile.role === 'mentor'
        ? getMentorAssignments(setMentorAssignments, [where('mentorId', '==', profile.personId)])
        : () => undefined;

    return () => {
      unsubCompanies();
      unsubAssignments();
    };
  }, [profile?.personId, profile?.role]);

  const accessibleCompanies = companies.filter((company) => {
    if (!profile?.personId) {
      return false;
    }

    if (profile.role === 'founder') {
      return company.founderLeadPersonId === profile.personId;
    }

    if (profile.role === 'mentor') {
      return mentorAssignments.some((assignment) => assignment.companyId === company.id);
    }

    return true;
  });

  useEffect(() => {
    if (accessibleCompanies.length === 0) {
      setSelectedCompanyId('');
      return;
    }

    if (!accessibleCompanies.some((company) => company.id === selectedCompanyId)) {
      setSelectedCompanyId(accessibleCompanies[0].id);
    }
  }, [accessibleCompanies, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setInterviews([]);
      setPatterns([]);
      setAssumptions([]);
      setExperiments([]);
      setSignals([]);
      setReadinessReviews([]);
      setAnalysis(null);
      return;
    }

    setAnalysis(null);
    setAnalysisError('');

    const unsubInterviews = getInterviews(setInterviews, selectedCompanyId);
    const unsubPatterns = getPatterns(setPatterns, selectedCompanyId);
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    const unsubExperiments = getExperiments(setExperiments, selectedCompanyId);
    const unsubSignals = getSignals(setSignals, selectedCompanyId);
    const unsubReadiness = getReadinessReviews(setReadinessReviews, selectedCompanyId);

    return () => {
      unsubInterviews();
      unsubPatterns();
      unsubAssumptions();
      unsubExperiments();
      unsubSignals();
      unsubReadiness();
    };
  }, [selectedCompanyId]);

  const selectedCompany = accessibleCompanies.find((company) => company.id === selectedCompanyId) || null;
  const tractionTotal = signals.reduce(
    (total, signal) =>
      total +
      (signal.waitlistSignups || 0) +
      (signal.callsBooked || 0) +
      (signal.pilots || 0) +
      (signal.lois || 0) +
      (signal.preOrders || 0) +
      (signal.payingCustomers || 0),
    0,
  );
  const validatedAssumptions = assumptions.filter((assumption) => assumption.status === 'validated').length;
  const highPainInterviews = interviews.filter((interview) => interview.painIntensity >= 4).length;

  const handleAnalyze = async () => {
    if (!selectedCompany) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const result = await analyzeVentureEvidence({
        company: selectedCompany,
        interviews,
        patterns,
        assumptions,
        experiments,
        signals,
        readinessReviews,
        focusPrompt: focusPrompt.trim() || undefined,
      });

      startTransition(() => {
        setAnalysis(result);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The Venture Copilot could not generate a brief.';
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loadingWorkspace) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading venture workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 p-8 text-white shadow-xl shadow-indigo-950/10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100">
            <Sparkles className="h-4 w-4" />
            Venture Copilot
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Turn startup evidence into a tighter operating brief.</h1>
          <p className="max-w-2xl text-sm leading-6 text-indigo-100/90">
            This copilot reads interviews, patterns, assumptions, experiments, signals, and readiness notes to surface the sharpest risks,
            the strongest proof, and the next experiment that should move the company forward.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-indigo-50 lg:min-w-80">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-indigo-100/70">Workspace Coverage</p>
            <p className="mt-2 text-2xl font-semibold">{accessibleCompanies.length}</p>
            <p className="text-indigo-100/80">
              {profile?.role === 'founder' ? 'portfolio company' : 'accessible companies'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700">Company</label>
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              >
                {accessibleCompanies.length === 0 ? (
                  <option value="">No companies available</option>
                ) : (
                  accessibleCompanies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!selectedCompany || isAnalyzing}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition',
                !selectedCompany || isAnalyzing
                  ? 'cursor-not-allowed bg-gray-300'
                  : 'bg-indigo-600 hover:bg-indigo-700',
              )}
            >
              {isAnalyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isAnalyzing ? 'Generating brief...' : 'Generate brief'}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Focus prompt</label>
            <textarea
              value={focusPrompt}
              onChange={(event) => setFocusPrompt(event.target.value)}
              rows={4}
              placeholder="Example: Pressure-test whether we are ready for mentor escalation or the next investor conversation."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
            <p className="text-xs text-gray-500">
              Optional. Give the copilot a lens so it can tailor the brief to your next decision.
            </p>
          </div>

          {analysisError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{analysisError}</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: 'Interviews', value: interviews.length, detail: `${highPainInterviews} high-pain` },
              { label: 'Patterns', value: patterns.length, detail: 'qualitative clusters' },
              { label: 'Assumptions', value: assumptions.length, detail: `${validatedAssumptions} validated` },
              { label: 'Experiments', value: experiments.length, detail: `${experiments.filter((item) => item.active).length} active` },
              { label: 'Signals', value: signals.length, detail: `${tractionTotal} total recorded` },
              { label: 'Readiness Reviews', value: readinessReviews.length, detail: 'capital checkpoints' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{item.value}</p>
                <p className="mt-1 text-sm text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Gauge className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">How to use it</h2>
              <p className="text-sm text-gray-500">Best results come from evidence-rich company records.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm text-gray-600">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              The copilot works best when interviews are current, assumptions are prioritized, and at least one experiment or traction signal is logged.
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              If no AI key is configured, the app automatically falls back to a deterministic heuristic engine so the product stays usable while we wire up model access.
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              Every output is intended to guide an operating decision: where to narrow, what to test, and whether the company is truly ready for the next capital motion.
            </div>
          </div>
        </section>
      </div>

      {selectedCompany && analysis ? (
        <div className={cn('space-y-6 transition-opacity', isPending ? 'opacity-70' : 'opacity-100')}>
          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Executive Brief</p>
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedCompany.name}</h2>
                  <p className="max-w-3xl text-sm leading-6 text-gray-600">{analysis.analysis.executiveSummary}</p>
                </div>

                <div className="space-y-2 text-right text-xs text-gray-500">
                  <div className="inline-flex rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-600">
                    {analysis.engine.provider === 'openai' ? analysis.engine.model : 'Heuristic engine'}
                  </div>
                  <p>Updated {formatDistanceToNow(new Date(analysis.generatedAt), { addSuffix: true })}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Momentum Score</p>
                <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', severityClasses[analysis.analysis.confidence])}>
                  {analysis.analysis.confidence} confidence
                </span>
              </div>
              <p className="mt-5 text-5xl font-semibold tracking-tight text-gray-900">{analysis.analysis.momentumScore}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400"
                  style={{ width: `${analysis.analysis.momentumScore}%` }}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{analysis.analysis.marketPulse}</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Traction Narrative</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{analysis.analysis.tractionNarrative}</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Investor Readiness</h3>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1',
                    readinessClasses[analysis.analysis.investorReadiness.status],
                  )}
                >
                  {analysis.analysis.investorReadiness.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-gray-500">{analysis.analysis.investorReadiness.nextMilestone}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">{analysis.analysis.investorReadiness.rationale}</p>
              {analysis.analysis.investorReadiness.missingProof.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {analysis.analysis.investorReadiness.missingProof.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Problem Insights</h3>
              </div>
              <div className="mt-6 space-y-4">
                {analysis.analysis.problemInsights.map((insight) => (
                  <div key={insight.theme} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-gray-900">{insight.theme}</h4>
                      <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', severityClasses[insight.confidence])}>
                        {insight.confidence}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-600">{insight.evidence}</p>
                    <p className="mt-3 text-sm font-medium text-indigo-700">{insight.nextMove}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Risk Map</h3>
              </div>
              <div className="mt-6 space-y-4">
                {analysis.analysis.riskMap.map((risk) => (
                  <div key={`${risk.area}-${risk.title}`} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
                        {risk.area}
                      </span>
                      <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', severityClasses[risk.severity])}>
                        {risk.severity}
                      </span>
                    </div>
                    <h4 className="mt-3 font-semibold text-gray-900">{risk.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{risk.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recommended Experiments</h3>
              </div>
              <div className="mt-6 space-y-4">
                {analysis.analysis.recommendedExperiments.map((recommendation) => (
                  <div key={recommendation.title} className="rounded-2xl border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{recommendation.reason}</p>
                    <div className="mt-4 grid gap-2 text-sm text-gray-500">
                      <p>
                        <span className="font-medium text-gray-700">Owner:</span> {recommendation.owner}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Success metric:</span> {recommendation.successMetric}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <MessageSquareQuote className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Coach Questions</h3>
              </div>
              <div className="mt-6 space-y-3">
                {analysis.analysis.coachQuestions.map((question) => (
                  <div key={question} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-700">
                    {question}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
            <div className="rounded-full bg-indigo-50 p-4 text-indigo-600">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Generate the first operating brief</h2>
            <p className="text-sm leading-6 text-gray-500">
              Choose a company, optionally add a focus prompt, and let the Venture Copilot synthesize the current evidence stack into a crisp plan of attack.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

export default Copilot;
