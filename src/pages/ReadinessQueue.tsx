import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  Lightbulb,
  MessageSquare,
  Search,
  ShieldCheck,
  Signal as SignalIcon,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import {
  getAssumptions,
  getExperiments,
  getInterviews,
  getPatterns,
  getSignals,
} from '../services/evidenceService';
import { createReadinessReview, getReadinessReviews } from '../services/progressService';
import {
  buildCompanyEvidenceContextFromCurrentData,
  buildCompanyEvidenceNarrativeBrief,
  buildCompanyEvidenceQualityFlags,
} from '../services/companyEvidenceContextService';
import { buildCompanyOperatingInsight } from '../lib/companyInsights';
import { cn } from '../lib/utils';
import {
  Assumption,
  Company,
  CompanyEvidenceContext,
  CompanyEvidenceReviewGoal,
  Experiment,
  Interview,
  Pattern,
  ReadinessReview,
  ReadinessStatus,
  ReadinessType,
  Signal,
} from '../types';

const DECISION_TYPE_OPTIONS = [
  { value: ReadinessType.BUILDER_COMPLETION, label: 'Builder Completion' },
  { value: ReadinessType.COHORT_ADMISSION, label: 'Cohort Admission' },
  { value: ReadinessType.MENTOR_READY, label: 'Mentor Ready' },
  { value: ReadinessType.PITCH_READY, label: 'Pitch Ready' },
  { value: ReadinessType.INTERN_READY, label: 'Intern / Build Ready' },
];

const STATUS_OPTIONS = [
  { value: ReadinessStatus.NEEDS_REVIEW, label: 'Needs Review' },
  { value: ReadinessStatus.READY, label: 'Ready' },
  { value: ReadinessStatus.NEEDS_WORK, label: 'Needs Work' },
  { value: ReadinessStatus.NOT_READY, label: 'Not Ready' },
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const formatEnumLabel = (value: string) => value.replace(/_/g, ' ');

const statusBadgeClass = (status: ReadinessStatus) =>
  cn(
    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
    status === ReadinessStatus.READY && 'bg-emerald-100 text-emerald-700',
    status === ReadinessStatus.NEEDS_REVIEW && 'bg-amber-100 text-amber-700',
    (status === ReadinessStatus.NOT_READY || status === ReadinessStatus.NEEDS_WORK) &&
      'bg-rose-100 text-rose-700'
  );

const evidenceSeverityClass = (severity: 'low' | 'medium' | 'high') =>
  cn(
    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
    severity === 'high' && 'bg-rose-100 text-rose-700',
    severity === 'medium' && 'bg-amber-100 text-amber-700',
    severity === 'low' && 'bg-slate-200 text-slate-700'
  );

const coverageStatusClass = (status: 'present' | 'missing' | 'unknown') =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    status === 'present' && 'bg-emerald-100 text-emerald-700',
    status === 'missing' && 'bg-amber-100 text-amber-700',
    status === 'unknown' && 'bg-slate-200 text-slate-700'
  );

const formatCoverageLabel = (value: string) => value.replace(/_/g, ' ');

type CompanyEvidenceCoverageEntry = [
  keyof CompanyEvidenceContext['sourceCoverage'],
  CompanyEvidenceContext['sourceCoverage'][keyof CompanyEvidenceContext['sourceCoverage']]
];

const ReadinessQueue: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allInterviews, setAllInterviews] = useState<Record<string, Interview[]>>({});
  const [allPatterns, setAllPatterns] = useState<Record<string, Pattern[]>>({});
  const [allAssumptions, setAllAssumptions] = useState<Record<string, Assumption[]>>({});
  const [allExperiments, setAllExperiments] = useState<Record<string, Experiment[]>>({});
  const [allSignals, setAllSignals] = useState<Record<string, Signal[]>>({});
  const [allReviews, setAllReviews] = useState<Record<string, ReadinessReview[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<ReadinessType>(ReadinessType.BUILDER_COMPLETION);
  const [reviewStatus, setReviewStatus] = useState<ReadinessStatus>(ReadinessStatus.NEEDS_REVIEW);
  const [reviewReasons, setReviewReasons] = useState('');

  useEffect(() => {
    const unsubCompanies = getCompanies((allCompanies) => {
      setCompanies(allCompanies);
      setLoading(false);
    });

    return () => unsubCompanies();
  }, []);

  useEffect(() => {
    if (companies.length === 0) {
      return undefined;
    }

    const unsubscribers = companies.flatMap((company) => [
      getInterviews((interviews) => {
        setAllInterviews((prev) => ({ ...prev, [company.id]: interviews }));
      }, company.id),
      getPatterns((patterns) => {
        setAllPatterns((prev) => ({ ...prev, [company.id]: patterns }));
      }, company.id),
      getAssumptions((assumptions) => {
        setAllAssumptions((prev) => ({ ...prev, [company.id]: assumptions }));
      }, company.id),
      getExperiments((experiments) => {
        setAllExperiments((prev) => ({ ...prev, [company.id]: experiments }));
      }, company.id),
      getSignals((signals) => {
        setAllSignals((prev) => ({ ...prev, [company.id]: signals }));
      }, company.id),
      getReadinessReviews((reviews) => {
        setAllReviews((prev) => ({ ...prev, [company.id]: reviews }));
      }, company.id),
    ]);

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [companies]);

  const companyRows = useMemo(
    () =>
      companies
        .map((company) => {
          const reviews = allReviews[company.id] || [];
          const insight = buildCompanyOperatingInsight({
            interviews: allInterviews[company.id] || [],
            patterns: allPatterns[company.id] || [],
            assumptions: allAssumptions[company.id] || [],
            experiments: allExperiments[company.id] || [],
            signals: allSignals[company.id] || [],
            reviews,
          });

          return {
            company,
            insight,
            latestReview: reviews
              .slice()
              .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())[0],
          };
        })
        .sort((a, b) => PRIORITY_ORDER[a.insight.staffAttentionLevel] - PRIORITY_ORDER[b.insight.staffAttentionLevel]),
    [allAssumptions, allExperiments, allInterviews, allPatterns, allReviews, allSignals, companies]
  );

  const filteredRows = companyRows.filter(({ company }) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const decisionRows = filteredRows.filter(({ insight }) => insight.needsReviewNow);
  const unlockCandidates = filteredRows.filter(({ insight }) => insight.availableResources.length > 0).slice(0, 6);
  const mentorEscalations = filteredRows
    .filter(({ insight }) => insight.needsMentor || insight.staffAttentionLevel === 'high')
    .slice(0, 6);
  const recentDecisions = filteredRows
    .filter(({ latestReview }) => latestReview)
    .sort((a, b) => new Date(b.latestReview!.reviewedAt).getTime() - new Date(a.latestReview!.reviewedAt).getTime())
    .slice(0, 6);

  const selectedRow = companyRows.find(({ company }) => company.id === selectedCompanyId);
  const selectedEvidenceContext = useMemo(() => {
    if (!selectedRow) {
      return null;
    }

    return buildCompanyEvidenceContextFromCurrentData({
      company: selectedRow.company,
      aliases: [],
      interviews: allInterviews[selectedRow.company.id] || [],
      patterns: allPatterns[selectedRow.company.id] || [],
      reviewGoal: CompanyEvidenceReviewGoal.READINESS,
      todayDate: new Date().toISOString(),
    });
  }, [allInterviews, allPatterns, selectedRow]);
  const selectedEvidenceNarrative = useMemo(
    () => (selectedEvidenceContext ? buildCompanyEvidenceNarrativeBrief(selectedEvidenceContext) : null),
    [selectedEvidenceContext]
  );
  const selectedEvidenceCoverageEntries = useMemo<CompanyEvidenceCoverageEntry[]>(
    () =>
      selectedEvidenceContext
        ? (Object.entries(selectedEvidenceContext.sourceCoverage) as CompanyEvidenceCoverageEntry[])
        : [],
    [selectedEvidenceContext]
  );
  const selectedEvidenceFlags = useMemo(
    () => (selectedEvidenceContext ? buildCompanyEvidenceQualityFlags(selectedEvidenceContext.evidenceQuality) : []),
    [selectedEvidenceContext]
  );

  useEffect(() => {
    if (!selectedRow) {
      return;
    }

    setReviewType(selectedRow.insight.recommendedDecisionType);
    setReviewStatus(
      selectedRow.insight.availableResources.length > 0
        ? ReadinessStatus.READY
        : selectedRow.latestReview?.status === ReadinessStatus.NOT_READY ||
            selectedRow.latestReview?.status === ReadinessStatus.NEEDS_WORK
          ? ReadinessStatus.NEEDS_WORK
          : ReadinessStatus.NEEDS_REVIEW
    );
    setReviewReasons('');
  }, [selectedRow]);

  const handleCreateReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.personId || !selectedCompanyId) {
      return;
    }

    await createReadinessReview({
      companyId: selectedCompanyId,
      reviewType,
      status: reviewStatus,
      reasons: reviewReasons
        .split('\n')
        .map((reason) => reason.trim())
        .filter(Boolean),
      reviewedByPersonId: profile.personId,
      reviewedAt: new Date().toISOString(),
    });

    setReviewReasons('');
    setSelectedCompanyId(null);
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading staff decision board...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
          OM Staff Decision Board
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Decide what support opens next.</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              This surface is for staff judgment, not generic queue management. It centers on the companies that need a
              decision now, the proof they have, the proof they still lack, and what OM should activate next.
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies needing staff judgment..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Needs Staff Judgment</p>
          <p className="mt-3 text-3xl font-semibold text-rose-950">{decisionRows.length}</p>
          <p className="mt-2 text-sm text-rose-800/80">Companies that currently need a readiness or support decision.</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Unlock Candidates</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-950">{unlockCandidates.length}</p>
          <p className="mt-2 text-sm text-emerald-800/80">Companies that have already earned the next support layer.</p>
        </div>
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Mentor / Escalation</p>
          <p className="mt-3 text-3xl font-semibold text-sky-950">{mentorEscalations.length}</p>
          <p className="mt-2 text-sm text-sky-800/80">Founders who need mentor activation or tighter staff follow-up.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Decisions</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{recentDecisions.length}</p>
          <p className="mt-2 text-sm text-slate-500">Latest formal OM decisions already recorded in the system.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Companies Needing Review Now</h2>
              <p className="mt-1 text-sm text-slate-500">
                Staff judgment should answer what support can activate next, what still needs proof, and whether mentor
                or escalation help is warranted.
              </p>
            </div>
            <AlertCircle className="h-5 w-5 text-rose-500" />
          </div>

          <div className="mt-6 space-y-4">
            {decisionRows.map(({ company, insight, latestReview }) => (
              <div key={company.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">{company.name}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {insight.stageLabel}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
                          insight.staffAttentionLevel === 'high'
                            ? 'bg-rose-100 text-rose-700'
                            : insight.staffAttentionLevel === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {insight.staffAttentionLevel} priority
                      </span>
                      {latestReview ? (
                        <span className={statusBadgeClass(latestReview.status)}>{formatEnumLabel(latestReview.status)}</span>
                      ) : null}
                    </div>

                    <p className="text-sm leading-6 text-slate-600">{insight.staffAttentionReason}</p>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Strongest Evidence</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {insight.strongestEvidence.length > 0 ? (
                            insight.strongestEvidence.map((evidence) => <li key={evidence}>{evidence}</li>)
                          ) : (
                            <li>Proof is still thin and needs more discovery before support should open.</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Biggest Proof Gaps</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {insight.proofGaps.length > 0 ? (
                            insight.proofGaps.slice(0, 3).map((gap) => <li key={gap}>{gap}</li>)
                          ) : (
                            <li>No immediate proof gaps are blocking the next support decision.</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next OM Action</p>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{insight.recommendedSupportAction}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Mentor / escalation
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{insight.escalationRecommendation}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      {insight.availableResources.length > 0 ? (
                        insight.availableResources.slice(0, 4).map((resource) => (
                          <span
                            key={resource.key}
                            className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"
                          >
                            {resource.name}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          No support unlocks yet
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCompanyId(company.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
                  >
                    Open Decision
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {decisionRows.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No companies currently surface as needing immediate staff judgment.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Unlock Candidates</h2>
                <p className="mt-1 text-sm text-slate-500">Support should open because proof was earned, not because a queue is aging.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="mt-6 space-y-4">
              {unlockCandidates.map(({ company, insight }) => (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompanyId(company.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{company.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{insight.recommendedDecisionLabel}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {insight.availableResources.slice(0, 3).map((resource) => (
                      <span
                        key={resource.key}
                        className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700"
                      >
                        {resource.name}
                      </span>
                    ))}
                  </div>
                </button>
              ))}

              {unlockCandidates.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No founders have crossed a support threshold that needs staff activation right now.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Mentor / Escalation Recommendations</h2>
                <p className="mt-1 text-sm text-slate-500">Mentor help should attach to clear proof and a specific next blocker.</p>
              </div>
              <UserCheck className="h-5 w-5 text-sky-500" />
            </div>

            <div className="mt-6 space-y-4">
              {mentorEscalations.map(({ company, insight }) => (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompanyId(company.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-slate-300"
                >
                  <p className="font-semibold text-slate-950">{company.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{insight.escalationRecommendation}</p>
                </button>
              ))}

              {mentorEscalations.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No mentor activation or escalation gaps are surfacing right now.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Recent Decisions</h2>
                <p className="mt-1 text-sm text-slate-500">Formal OM decisions stay visible, but they do not replace current proof review.</p>
              </div>
              <Clock3 className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-6 space-y-4">
              {recentDecisions.map(({ company, latestReview }) => (
                <div key={`${company.id}-${latestReview?.reviewedAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{company.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatEnumLabel(latestReview!.reviewType)} reviewed {format(new Date(latestReview!.reviewedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={statusBadgeClass(latestReview!.status)}>{formatEnumLabel(latestReview!.status)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {latestReview?.reasons?.[0] || 'No written rationale captured yet.'}
                  </p>
                </div>
              ))}

              {recentDecisions.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No formal readiness decisions have been recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-slate-950">{selectedRow.company.name}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {selectedRow.insight.stageLabel}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
                      selectedRow.insight.staffAttentionLevel === 'high'
                        ? 'bg-rose-100 text-rose-700'
                        : selectedRow.insight.staffAttentionLevel === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {selectedRow.insight.staffAttentionLevel} priority
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedRow.insight.staffAttentionReason}</p>
              </div>
              <button
                onClick={() => setSelectedCompanyId(null)}
                className="rounded-full border border-slate-300 p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-8 p-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Interviews</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedRow.insight.countedInterviews}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Strong Pain</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedRow.insight.highPainInterviewCount}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Patterns</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedRow.insight.strongPatternCount}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Experiments</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedRow.insight.experimentCount}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Signals</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{selectedRow.insight.tractionSignalCount}</p>
                </div>
              </section>

              {selectedEvidenceContext && (
                <section className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Company Evidence Context</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        A provenance-aware synthesis brief built before readiness or unlock scoring.
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Narrative Brief</h4>
                        <p className="mt-4 text-sm leading-7 text-slate-700">{selectedEvidenceNarrative}</p>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Company Identity</h4>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                            {selectedEvidenceContext.canonicalCompanyName}
                          </span>
                          {selectedEvidenceContext.lastConfirmedActivityDate ? (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                              Last confirmed activity {format(new Date(selectedEvidenceContext.lastConfirmedActivityDate), 'MMM d, yyyy')}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedEvidenceContext.aliasesDetected.length > 0 ? (
                            selectedEvidenceContext.aliasesDetected.map((alias) => (
                              <span
                                key={alias}
                                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700"
                              >
                                Alias detected: {alias}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                              No alias drift detected in current source lanes
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence Timeline</h4>
                        <div className="mt-4 space-y-3">
                          {selectedEvidenceContext.timeline.length > 0 ? (
                            selectedEvidenceContext.timeline.slice(0, 6).map((entry) => (
                              <div key={`${entry.date || 'no-date'}-${entry.source}-${entry.eventType}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    {entry.date || 'Date unavailable'}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                    {entry.source}
                                  </span>
                                  <span className={cn(
                                    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                                    entry.confidenceClass === 'verified' && 'bg-emerald-100 text-emerald-700',
                                    entry.confidenceClass === 'reported' && 'bg-amber-100 text-amber-700',
                                    entry.confidenceClass === 'inference' && 'bg-sky-100 text-sky-700',
                                    entry.confidenceClass === 'missing' && 'bg-slate-200 text-slate-700'
                                  )}>
                                    {entry.confidenceClass.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-700">{entry.summary}</p>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                              No evidence timeline events are available yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Source Coverage</h4>
                        <div className="mt-4 space-y-3">
                          {selectedEvidenceCoverageEntries.map(([lane, status]) => (
                            <div key={lane} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-950">{formatCoverageLabel(lane)}</p>
                                <span className={coverageStatusClass(status)}>{status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence Quality Flags</h4>
                        <div className="mt-4 space-y-3">
                          {selectedEvidenceFlags.length > 0 ? (
                            selectedEvidenceFlags.map((flag) => (
                              <div key={flag.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-slate-950">{flag.message}</p>
                                  <span className={evidenceSeverityClass(flag.severity)}>{flag.severity}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                              No active quality flags are surfacing from the current source lanes.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Readiness Recommendation</h4>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {[
                            ['internally usable', selectedEvidenceContext.readiness.internallyUsable],
                            ['content ready', selectedEvidenceContext.readiness.contentReady],
                            ['spotlight ready', selectedEvidenceContext.readiness.spotlightReady],
                            ['externally publishable', selectedEvidenceContext.readiness.externallyPublishable],
                          ].map(([label, value]) => (
                            <span
                              key={label}
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
                                value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                              )}
                            >
                              {label}: {value ? 'yes' : 'no'}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                          <p>{selectedEvidenceContext.readiness.reasoning.internallyUsable}</p>
                          <p>{selectedEvidenceContext.readiness.reasoning.contentReady}</p>
                          <p>{selectedEvidenceContext.readiness.reasoning.spotlightReady}</p>
                          <p>{selectedEvidenceContext.readiness.reasoning.externallyPublishable}</p>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Single Next Operational Action</h4>
                        <p className="mt-4 text-sm leading-6 text-slate-700">{selectedEvidenceContext.nextAction}</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Strongest Current Evidence</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                      {selectedRow.insight.strongestEvidence.length > 0 ? (
                        selectedRow.insight.strongestEvidence.map((evidence) => <li key={evidence}>{evidence}</li>)
                      ) : (
                        <li>The proof base is still early and needs more discovery before staff should open support.</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Biggest Proof Gaps</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                      {selectedRow.insight.proofGaps.length > 0 ? (
                        selectedRow.insight.proofGaps.map((gap) => <li key={gap}>{gap}</li>)
                      ) : (
                        <li>No immediate proof gap is blocking the next OM decision.</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recommended Next Move</h3>
                    <p className="mt-4 text-sm leading-6 text-slate-700">{selectedRow.insight.recommendedSupportAction}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mentor / escalation</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selectedRow.insight.escalationRecommendation}</p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Support That Could Unlock Next</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedRow.insight.availableResources.length > 0 ? (
                        selectedRow.insight.availableResources.map((resource) => (
                          <span
                            key={resource.key}
                            className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"
                          >
                            {resource.name}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          Still locked
                        </span>
                      )}
                    </div>
                    {selectedRow.insight.lockedResources.length > 0 ? (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        Locked support is waiting on: {selectedRow.insight.lockedResources[0].missingProof[0]}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-6 py-5">
                  <h3 className="text-lg font-semibold text-slate-950">Record OM Decision</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Suggested next decision: {selectedRow.insight.recommendedDecisionLabel}. Investor-facing decisions stay out of this phase.
                  </p>
                </div>

                <form onSubmit={handleCreateReview} className="space-y-6 px-6 py-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Decision Type</label>
                      <select
                        value={reviewType}
                        onChange={(event) => setReviewType(event.target.value as ReadinessType)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      >
                        {DECISION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Decision Status</label>
                      <select
                        value={reviewStatus}
                        onChange={(event) => setReviewStatus(event.target.value as ReadinessStatus)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Decision Rationale</label>
                    <textarea
                      required
                      rows={5}
                      value={reviewReasons}
                      onChange={(event) => setReviewReasons(event.target.value)}
                      className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      placeholder="What proof is strongest?&#10;What is still missing?&#10;What support should OM activate or hold back?"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                    <button
                      type="button"
                      onClick={() => setSelectedCompanyId(null)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Save Decision
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadinessQueue;
