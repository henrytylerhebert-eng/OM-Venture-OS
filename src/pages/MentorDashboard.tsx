import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { where } from 'firebase/firestore';
import {
  AlertCircle,
  Calendar,
  ClipboardCheck,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Target,
  User,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import {
  buildCompanyEvidenceContextFromCurrentData,
  buildCompanyEvidenceNarrativeBrief,
  buildCompanyEvidenceQualityFlags,
} from '../services/companyEvidenceContextService';
import {
  getAssumptions,
  getExperiments,
  getInterviews,
  getPatterns,
  getSignals,
} from '../services/evidenceService';
import { getFeedback, getMeetingRequests, submitFeedback } from '../services/feedbackService';
import { getMentorAssignments, getMentorCompanyScopes } from '../services/mentorService';
import { getPortfolioProgress, getReadinessReviews } from '../services/progressService';
import { buildCompanyOperatingInsight } from '../lib/companyInsights';
import {
  AssignmentStatus,
  Assumption,
  Company,
  CompanyEvidenceReviewGoal,
  Experiment,
  Feedback,
  FeedbackRole,
  Interview,
  MeetingRequest,
  MeetingStatus,
  MentorAssignment,
  MentorCompanyScope,
  Pattern,
  PortfolioProgress,
  ReadinessReview,
  ReadinessStatus,
  ReadinessType,
  Signal,
  StageConfidence,
} from '../types';
import { cn } from '../lib/utils';

const phaseGuidanceByStage: Record<string, string> = {
  idea_development: 'Keep mentor guidance narrow. Help the founder sharpen the problem before they widen the concept.',
  customer_discovery: 'Stay close to customer pain, current alternatives, and sharper interview follow-through.',
  product_development: 'Push for clear learning goals before the founder adds more build scope.',
  beta_testing: 'Keep support focused on what the test is trying to prove and what signal should move next.',
  customer_acquisition: 'Treat early market movement as evidence to interpret, not as automatic readiness.',
  growth: 'Stay anchored in what is verified and what still needs review as the company scales.',
  alumni: 'Support the founder with context, but avoid treating alumni status as current Builder proof.',
};

const confidenceBadgeClass = (value: 'verified' | 'reported' | 'inference' | 'missing') =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    value === 'verified' && 'bg-emerald-100 text-emerald-700',
    value === 'reported' && 'bg-amber-100 text-amber-700',
    value === 'inference' && 'bg-sky-100 text-sky-700',
    value === 'missing' && 'bg-slate-200 text-slate-700'
  );

const qualityFlagClass = (severity: StageConfidence) =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    severity === StageConfidence.HIGH && 'bg-rose-100 text-rose-700',
    severity === StageConfidence.MEDIUM && 'bg-amber-100 text-amber-700',
    severity === StageConfidence.LOW && 'bg-slate-200 text-slate-700'
  );

const meetingStatusClass = (status?: MeetingStatus) =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    status === MeetingStatus.COMPLETED && 'bg-emerald-100 text-emerald-700',
    status === MeetingStatus.SCHEDULED && 'bg-sky-100 text-sky-700',
    status === MeetingStatus.REQUESTED && 'bg-amber-100 text-amber-700',
    status === MeetingStatus.CANCELLED && 'bg-slate-200 text-slate-700'
  );

const sortByDateDesc = <T,>(items: T[], pickDate: (item: T) => string | undefined) =>
  items
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(pickDate(left) || 0).getTime();
      const rightTime = new Date(pickDate(right) || 0).getTime();
      return rightTime - leftTime;
    });

const formatDirectionLabel = (value: string) => value.replace(/_/g, ' ');

const getPatternSourceInterviews = (pattern: Pattern, interviews: Interview[]) => {
  if (pattern.sourceInterviewIds.length > 0) {
    const linkedIds = new Set(pattern.sourceInterviewIds);
    return interviews.filter((interview) => linkedIds.has(interview.id));
  }

  return interviews.filter(
    (interview) => interview.problemTheme.trim().toLowerCase() === pattern.problemTheme.trim().toLowerCase()
  );
};

const getTopCurrentAlternative = (pattern: Pattern, interviews: Interview[]) => {
  const alternatives = getPatternSourceInterviews(pattern, interviews).reduce<Record<string, number>>((acc, interview) => {
    const currentAlternative = interview.currentAlternative.trim();
    if (!currentAlternative) {
      return acc;
    }

    acc[currentAlternative] = (acc[currentAlternative] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(alternatives).sort((left, right) => right[1] - left[1])[0]?.[0];
};

const MentorDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<MentorAssignment[]>([]);
  const [mentorCompanyScopes, setMentorCompanyScopes] = useState<MentorCompanyScope[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [companyFeedback, setCompanyFeedback] = useState<Feedback[]>([]);
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [portfolioProgress, setPortfolioProgress] = useState<PortfolioProgress[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [readinessReviews, setReadinessReviews] = useState<ReadinessReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.personId) {
      return undefined;
    }

    const unsubAssignments = getMentorAssignments(
      (allAssignments) => {
        setAssignments(
          allAssignments.filter((assignment) => assignment.status === AssignmentStatus.ACTIVE)
        );
      },
      [where('mentorId', '==', profile.personId)]
    );
    const unsubScopes = getMentorCompanyScopes(
      (scopes) => {
        setMentorCompanyScopes(scopes.filter((scope) => scope.active));
      },
      [where('mentorId', '==', profile.personId)]
    );
    const unsubCompanies = getCompanies((companies) => {
      setAllCompanies(companies);
      setLoading(false);
    });

    return () => {
      unsubAssignments();
      unsubScopes();
      unsubCompanies();
    };
  }, [profile?.personId]);

  const assignedCompanies = useMemo(() => {
    const assignedCompanyIds = new Set(assignments.map((assignment) => assignment.companyId));
    return allCompanies.filter((company) => assignedCompanyIds.has(company.id));
  }, [allCompanies, assignments]);
  const scopedCompanyIds = useMemo(
    () => new Set(mentorCompanyScopes.filter((scope) => scope.active).map((scope) => scope.companyId)),
    [mentorCompanyScopes]
  );
  const accessibleAssignedCompanies = useMemo(
    () => assignedCompanies.filter((company) => scopedCompanyIds.has(company.id)),
    [assignedCompanies, scopedCompanyIds]
  );
  const companiesAwaitingScope = useMemo(
    () => assignedCompanies.filter((company) => !scopedCompanyIds.has(company.id)),
    [assignedCompanies, scopedCompanyIds]
  );

  useEffect(() => {
    setSelectedCompanyId((current) => {
      if (current && assignedCompanies.some((company) => company.id === current)) {
        return current;
      }

      return accessibleAssignedCompanies[0]?.id || assignedCompanies[0]?.id || null;
    });
  }, [accessibleAssignedCompanies, assignedCompanies]);

  useEffect(() => {
    if (accessibleAssignedCompanies.length === 0) {
      setPortfolioProgress([]);
      return undefined;
    }

    setPortfolioProgress((current) =>
      current.filter((entry) => accessibleAssignedCompanies.some((company) => company.id === entry.companyId))
    );

    const unsubscribers = accessibleAssignedCompanies.map((company) =>
      getPortfolioProgress(
        (progressEntries) => {
          setPortfolioProgress((current) => [
            ...current.filter((entry) => entry.companyId !== company.id),
            ...progressEntries,
          ]);
        },
        [where('companyId', '==', company.id)]
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [accessibleAssignedCompanies]);

  useEffect(() => {
    const hasSelectedCompanyScope = Boolean(selectedCompanyId && scopedCompanyIds.has(selectedCompanyId));

    if (!selectedCompanyId || !hasSelectedCompanyScope) {
      setCompanyFeedback([]);
      setMeetingRequests([]);
      setInterviews([]);
      setPatterns([]);
      setAssumptions([]);
      setExperiments([]);
      setSignals([]);
      setReadinessReviews([]);
      return undefined;
    }

    const unsubFeedback = getFeedback(setCompanyFeedback, selectedCompanyId);
    const unsubMeetingRequests = getMeetingRequests(setMeetingRequests, [where('companyId', '==', selectedCompanyId)]);
    const unsubInterviews = getInterviews(setInterviews, selectedCompanyId);
    const unsubPatterns = getPatterns(setPatterns, selectedCompanyId);
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    const unsubExperiments = getExperiments(setExperiments, selectedCompanyId);
    const unsubSignals = getSignals(setSignals, selectedCompanyId);
    const unsubReadiness = getReadinessReviews(setReadinessReviews, selectedCompanyId);

    return () => {
      unsubFeedback();
      unsubMeetingRequests();
      unsubInterviews();
      unsubPatterns();
      unsubAssumptions();
      unsubExperiments();
      unsubSignals();
      unsubReadiness();
    };
  }, [scopedCompanyIds, selectedCompanyId]);

  const selectedCompany = assignedCompanies.find((company) => company.id === selectedCompanyId);
  const selectedCompanyScope = mentorCompanyScopes.find(
    (scope) => scope.active && scope.companyId === selectedCompanyId
  );
  const selectedAssignment = assignments.find(
    (assignment) => assignment.companyId === selectedCompanyId && assignment.status === AssignmentStatus.ACTIVE
  );
  const selectedInsight = useMemo(
    () =>
      selectedCompany
        ? buildCompanyOperatingInsight({
            interviews,
            patterns,
            assumptions,
            experiments,
            signals,
            reviews: readinessReviews,
            progress: portfolioProgress.find((progress) => progress.companyId === selectedCompany.id),
            mentorAssignments: assignments.filter((assignment) => assignment.companyId === selectedCompany.id),
          })
        : null,
    [assumptions, assignments, experiments, interviews, patterns, portfolioProgress, readinessReviews, selectedCompany, signals]
  );
  const selectedEvidenceContext = useMemo(
    () =>
      selectedCompany
        ? buildCompanyEvidenceContextFromCurrentData({
            company: selectedCompany,
            aliases: [],
            interviews,
            patterns,
            reviewGoal: CompanyEvidenceReviewGoal.MENTOR_MATCH,
            todayDate: new Date().toISOString(),
          })
        : null,
    [interviews, patterns, selectedCompany]
  );
  const selectedEvidenceNarrative = useMemo(
    () => (selectedEvidenceContext ? buildCompanyEvidenceNarrativeBrief(selectedEvidenceContext) : ''),
    [selectedEvidenceContext]
  );
  const evidenceFlags = useMemo(
    () => (selectedEvidenceContext ? buildCompanyEvidenceQualityFlags(selectedEvidenceContext.evidenceQuality) : []),
    [selectedEvidenceContext]
  );
  const evidenceConfidenceCounts = useMemo(() => {
    if (!selectedEvidenceContext) {
      return { verified: 0, reported: 0, inference: 0, missing: 0 };
    }

    return selectedEvidenceContext.timeline.reduce(
      (acc, entry) => {
        acc[entry.confidenceClass] += 1;
        return acc;
      },
      { verified: 0, reported: 0, inference: 0, missing: 0 }
    );
  }, [selectedEvidenceContext]);
  const missingCoverageCount = useMemo(
    () =>
      selectedEvidenceContext
        ? Object.values(selectedEvidenceContext.sourceCoverage).filter((status) => status !== 'present').length
        : 0,
    [selectedEvidenceContext]
  );
  const strongestPatterns = useMemo(
    () =>
      patterns
        .slice()
        .sort(
          (left, right) =>
            right.numberOfMentions - left.numberOfMentions ||
            right.averagePainIntensity - left.averagePainIntensity ||
            right.unpromptedMentions - left.unpromptedMentions
        )
        .slice(0, 3),
    [patterns]
  );
  const majorUnknowns = useMemo(() => {
    if (!selectedEvidenceContext || !selectedInsight) {
      return [];
    }

    return Array.from(
      new Set([
        ...selectedEvidenceContext.customerDiscovery.unknowns,
        ...selectedInsight.proofGaps,
      ])
    ).slice(0, 4);
  }, [selectedEvidenceContext, selectedInsight]);
  const mentorReadyReview = useMemo(
    () =>
      readinessReviews
        .filter((review) => review.reviewType === ReadinessType.MENTOR_READY)
        .sort((left, right) => new Date(right.reviewedAt).getTime() - new Date(left.reviewedAt).getTime())[0],
    [readinessReviews]
  );
  const recentMeetingRequests = useMemo(
    () =>
      sortByDateDesc<MeetingRequest>(
        meetingRequests,
        (request) => request.meetingDate || request.updatedAt
      ).slice(0, 3),
    [meetingRequests]
  );
  const recentNotes = useMemo(
    () => sortByDateDesc<Feedback>(companyFeedback, (item) => item.submittedAt).slice(0, 3),
    [companyFeedback]
  );

  const handleSubmitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.personId || !selectedCompanyId || !feedbackText.trim()) {
      return;
    }

    const latestMeetingRequest = recentMeetingRequests[0];

    await submitFeedback({
      meetingRequestId: latestMeetingRequest?.id || `mentor_workspace_note_${selectedCompanyId}`,
      companyId: selectedCompanyId,
      mentorId: profile.personId,
      submittedByRole: FeedbackRole.MENTOR,
      internalNotes: feedbackText.trim(),
      submittedAt: new Date().toISOString(),
    });

    setFeedbackText('');
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading mentor workspace...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
          Mentor Workspace
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Support assigned founders with proof-aware context.</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            This surface is mentor-scoped. It shows current Builder phase, strongest evidence, major unknowns, and meeting context without turning thin records into readiness claims.
          </p>
        </div>
      </header>

      {companiesAwaitingScope.length > 0 && (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-900">Some mentor assignments are waiting on scope sync.</p>
              <p className="text-sm leading-6 text-amber-900/80">
                Your assignment exists, but the deterministic company scope record is not active yet for {companiesAwaitingScope.map((company) => company.name).join(', ')}. The workspace will hold back evidence reads until OM finishes the scope rollout.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-950">Assigned Companies</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Mentor view stays limited to active assignments only.</p>

            <div className="mt-5 space-y-3">
              {assignedCompanies.length > 0 ? (
                assignedCompanies.map((company) => {
                  const companyProgress = portfolioProgress.find((progress) => progress.companyId === company.id);
                  const phaseLabel = companyProgress
                    ? phaseGuidanceByStage[companyProgress.finalStage] || 'Current founder phase is recorded, but the evidence picture still needs a direct review.'
                    : 'No explicit phase record is attached yet. Open the workspace to review the current evidence picture directly.';

                  return (
                    <button
                      key={company.id}
                      onClick={() => setSelectedCompanyId(company.id)}
                      className={cn(
                        'w-full rounded-3xl border px-4 py-4 text-left transition-colors',
                        selectedCompanyId === company.id
                          ? 'border-sky-200 bg-sky-50'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{company.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {companyProgress?.finalStage
                              ? formatDirectionLabel(companyProgress.finalStage)
                              : scopedCompanyIds.has(company.id)
                                ? 'Needs phase review'
                                : 'Scope sync pending'}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                            selectedCompanyId === company.id
                              ? 'bg-white text-slate-700 ring-1 ring-slate-200'
                              : scopedCompanyIds.has(company.id)
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {selectedCompanyId === company.id
                            ? 'selected'
                            : scopedCompanyIds.has(company.id)
                              ? 'assignment active'
                              : 'scope pending'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{phaseLabel}</p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  No assigned founders are attached to this mentor record yet. The OM starter seed does not fabricate mentor assignments.
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          {selectedCompany && !selectedCompanyScope ? (
            <div className="rounded-[32px] border border-amber-200 bg-white p-12 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Assignment found, company scope still syncing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                OM has already attached you to {selectedCompany.name}, but the deterministic mentor-company scope record is not active yet. This workspace is intentionally holding back evidence reads so missing scope sync does not look like “no evidence” or “no assignment.”
              </p>
            </div>
          ) : selectedCompany && selectedInsight && selectedEvidenceContext ? (
            <>
              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-slate-950">{selectedCompany.name}</h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {selectedInsight.stageLabel}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                        membership: {selectedCompany.membershipStatus || 'unknown'}
                      </span>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">
                      {phaseGuidanceByStage[selectedInsight.stage] || selectedInsight.nextMilestone}
                    </p>
                    {selectedAssignment?.goal ? (
                      <p className="text-sm font-medium text-slate-700">Current assignment goal: {selectedAssignment.goal}</p>
                    ) : (
                      <p className="text-sm text-slate-500">No explicit mentor assignment goal is recorded yet.</p>
                    )}
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mentor Guardrail</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {selectedInsight.isValidationLevelOneReady
                        ? 'Discovery proof is stronger, but readiness still depends on OM review and the next blocker.'
                        : 'Keep advice discovery-scoped. Sparse evidence should not turn into product, traction, or readiness claims.'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Company Evidence Brief</h3>
                      <p className="mt-1 text-sm text-slate-500">A fast evidence-context read before you widen mentor advice.</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                  </div>

                  <p className="mt-5 text-sm leading-7 text-slate-700">{selectedEvidenceNarrative}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {(['verified', 'reported', 'inference', 'missing'] as const).map((truthClass) => (
                      <span key={truthClass} className={confidenceBadgeClass(truthClass)}>
                        {truthClass}: {evidenceConfidenceCounts[truthClass]}
                      </span>
                    ))}
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                      coverage gaps: {missingCoverageCount}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Strongest Verified Evidence</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                        {selectedEvidenceContext.customerDiscovery.strongestEvidence.length > 0 ? (
                          selectedEvidenceContext.customerDiscovery.strongestEvidence.slice(0, 3).map((item) => (
                            <li key={item}>{item}</li>
                          ))
                        ) : (
                          <li>No verified discovery evidence is summarized yet.</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quality Flags</p>
                      <div className="mt-3 space-y-3">
                        {evidenceFlags.length > 0 ? (
                          evidenceFlags.slice(0, 3).map((flag) => (
                            <div key={flag.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm leading-6 text-slate-700">{flag.message}</p>
                                <span className={qualityFlagClass(flag.severity)}>{flag.severity}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">
                            No active quality flags are surfacing from the current source lanes.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-sky-500" />
                    <h3 className="text-lg font-semibold text-slate-950">Mentor Focus Now</h3>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-3xl bg-sky-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">Current recommendation</p>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{selectedInsight.recommendedSupportAction}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Latest readiness signal</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        {mentorReadyReview
                          ? `${formatDirectionLabel(mentorReadyReview.status)} on ${format(new Date(mentorReadyReview.reviewedAt), 'MMM d, yyyy')}`
                          : 'No mentor-ready review is recorded yet.'}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {mentorReadyReview?.reasons?.[0] ||
                          'Use this workspace to sharpen the next blocker, not to infer a staff readiness decision.'}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next blocker to help close</p>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {majorUnknowns[0] || selectedInsight.proofGaps[0] || 'Discovery is still early. Help the founder gather sharper evidence first.'}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <h3 className="text-lg font-semibold text-slate-950">Strongest Patterns</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Repeated pains and current alternatives that matter now.</p>

                  <div className="mt-5 space-y-4">
                    {strongestPatterns.length > 0 ? (
                      strongestPatterns.map((pattern) => (
                        <div key={pattern.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{pattern.problemTheme}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                              {pattern.numberOfMentions} mentions
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                              {pattern.unpromptedMentions} spontaneous
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                              {formatDirectionLabel(pattern.status)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-700">
                            {pattern.representativeQuote || 'No representative quote is attached yet.'}
                          </p>
                          <p className="mt-3 text-sm text-slate-600">
                            Current alternative showing up most: {getTopCurrentAlternative(pattern, interviews) || 'not clear yet'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        No repeated patterns are recorded yet. Stay in discovery mode until the evidence actually repeats.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <h3 className="text-lg font-semibold text-slate-950">Major Unknowns</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">What the current record still cannot answer cleanly.</p>

                  <div className="mt-5 space-y-3">
                    {majorUnknowns.length > 0 ? (
                      majorUnknowns.map((item) => (
                        <div key={item} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        No major unknowns are summarized yet. That usually means the evidence base is still thin, not that the company is clear.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-950">Meeting Context</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Recent requests and meeting history already attached to this company.</p>

                  <div className="mt-5 space-y-4">
                    {recentMeetingRequests.length > 0 ? (
                      recentMeetingRequests.map((request) => (
                        <div key={request.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={meetingStatusClass(request.status)}>{request.status}</span>
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {request.meetingDate ? format(new Date(request.meetingDate), 'MMM d, yyyy h:mm a') : 'Date not recorded'}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-700">{request.reason || 'No meeting reason recorded yet.'}</p>
                          <p className="mt-2 text-sm text-slate-500">
                            {request.programContext || 'Program context not recorded.'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        No mentor meeting request is recorded for this company yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-sky-500" />
                    <h3 className="text-lg font-semibold text-slate-950">Scoped Notes</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Capture internal mentor notes without turning them into readiness or traction claims.</p>

                  <form onSubmit={handleSubmitFeedback} className="mt-5 space-y-4">
                    <textarea
                      value={feedbackText}
                      onChange={(event) => setFeedbackText(event.target.value)}
                      placeholder="What did you hear? What still needs proof? What should the founder do next?"
                      className="h-32 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      required
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Save note
                    </button>
                  </form>

                  <div className="mt-6 space-y-3">
                    {recentNotes.length > 0 ? (
                      recentNotes.map((note) => (
                        <div key={note.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {format(new Date(note.submittedAt), 'MMM d, yyyy h:mm a')}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-700">{note.internalNotes || 'No note text recorded.'}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        No mentor-scoped notes are recorded for this company yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <ExternalLink className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Select an assigned company</h2>
              <p className="mt-2 text-sm text-slate-500">
                This workspace only becomes useful when a mentor has an active assignment and a real company record to review.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MentorDashboard;
