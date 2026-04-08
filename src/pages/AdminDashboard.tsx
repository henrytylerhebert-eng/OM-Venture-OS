import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowRight,
  Clock3,
  FlaskConical,
  MessageSquare,
  ShieldCheck,
  Signal as SignalIcon,
  UserCheck,
} from 'lucide-react';
import { getCompanies } from '../services/companyService';
import { getApplications } from '../services/cohortService';
import {
  getAssumptions,
  getExperiments,
  getInterviews,
  getPatterns,
  getSignals,
} from '../services/evidenceService';
import { getMentorAssignments, getMentors } from '../services/mentorService';
import { getPortfolioProgress, getReadinessReviews } from '../services/progressService';
import {
  AssignmentStatus,
  Assumption,
  Company,
  CohortApplication,
  DecisionStatus,
  Experiment,
  Interview,
  Mentor,
  MentorAssignment,
  Pattern,
  PortfolioProgress,
  ReadinessReview,
  Signal,
} from '../types';
import { buildCompanyOperatingInsight } from '../lib/companyInsights';

const AdminDashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<CohortApplication[]>([]);
  const [portfolioProgress, setPortfolioProgress] = useState<PortfolioProgress[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [assignments, setAssignments] = useState<MentorAssignment[]>([]);
  const [allInterviews, setAllInterviews] = useState<Record<string, Interview[]>>({});
  const [allPatterns, setAllPatterns] = useState<Record<string, Pattern[]>>({});
  const [allAssumptions, setAllAssumptions] = useState<Record<string, Assumption[]>>({});
  const [allExperiments, setAllExperiments] = useState<Record<string, Experiment[]>>({});
  const [allSignals, setAllSignals] = useState<Record<string, Signal[]>>({});
  const [allReviews, setAllReviews] = useState<Record<string, ReadinessReview[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCompanies = getCompanies((allCompanies) => {
      setCompanies(allCompanies);
      setLoading(false);
    });
    const unsubApps = getApplications(setApplications);
    const unsubProgress = getPortfolioProgress(setPortfolioProgress);
    const unsubMentors = getMentors(setMentors);
    const unsubAssignments = getMentorAssignments(setAssignments);

    return () => {
      unsubCompanies();
      unsubApps();
      unsubProgress();
      unsubMentors();
      unsubAssignments();
    };
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

  const companyRows = companies
    .map((company) => {
      const insight = buildCompanyOperatingInsight({
        interviews: allInterviews[company.id] || [],
        patterns: allPatterns[company.id] || [],
        assumptions: allAssumptions[company.id] || [],
        experiments: allExperiments[company.id] || [],
        signals: allSignals[company.id] || [],
        reviews: allReviews[company.id] || [],
        progress: portfolioProgress.find((entry) => entry.companyId === company.id),
        mentorAssignments: assignments.filter(
          (assignment) =>
            assignment.companyId === company.id && assignment.status === AssignmentStatus.ACTIVE
        ),
      });

      return { company, insight };
    })
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.insight.staffAttentionLevel] - priority[b.insight.staffAttentionLevel];
    });

  const pendingApplications = applications
    .filter((application) => application.decision === DecisionStatus.PENDING)
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  const interventionNow = companyRows.filter(({ insight }) => insight.staffAttentionLevel !== 'low').slice(0, 6);
  const unlockCandidates = companyRows
    .filter(({ insight }) => insight.availableResources.length > 0)
    .sort((a, b) => b.insight.availableResources.length - a.insight.availableResources.length)
    .slice(0, 6);
  const mentorQueue = companyRows.filter(({ insight }) => insight.needsMentor).slice(0, 5);
  const levelOneReadyCount = companyRows.filter(({ insight }) => insight.isValidationLevelOneReady).length;
  const levelTwoReadyCount = companyRows.filter(({ insight }) => insight.isValidationLevelTwoReady).length;
  const activeCompanies = companies.filter((company) => company.active).length;
  const recentReadinessDecisions = companyRows
    .filter(({ insight }) => insight.latestReview)
    .sort((a, b) => {
      const aReviewedAt = a.insight.latestReview?.reviewedAt || '';
      const bReviewedAt = b.insight.latestReview?.reviewedAt || '';
      return new Date(bReviewedAt).getTime() - new Date(aReviewedAt).getTime();
    })
    .slice(0, 5);
  const cohortMomentum = [
    {
      label: 'Discovery in motion',
      count: companyRows.filter(
        ({ insight }) => insight.countedInterviews > 0 && !insight.isValidationLevelOneReady
      ).length,
      detail: 'Member Companies still building toward validation level 1.',
    },
    {
      label: 'Mentor / pitch eligible',
      count: levelOneReadyCount,
      detail: 'Founders who have earned mentor programs, startup circle, and pitch pathways.',
    },
    {
      label: 'Testing beyond interviews',
      count: companyRows.filter(
        ({ insight }) => insight.experimentCount > 0 && !insight.isValidationLevelTwoReady
      ).length,
      detail: 'Validation work is in motion, but build-heavy support is not yet earned.',
    },
    {
      label: 'Build / funding eligible',
      count: levelTwoReadyCount,
      detail: 'Validation level 2 is met, so build and capital support can be reviewed.',
    },
  ];

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading operating console...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          OM Staff Console
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Operate founder momentum, not generic accounts.</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              This view follows the live OM source lanes: Member Companies, Customer Discovery, Internal Application Review, Meeting Requests, Feedback, and News Tracker. Membership and venture stage stay visible, but they do not replace evidence.
            </p>
          </div>
          <Link
            to="/staff/readiness"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Open Readiness Queue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Member Companies In Motion</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{activeCompanies}</p>
          <p className="mt-2 text-sm text-slate-500">Active founder companies currently visible in the operating system.</p>
        </div>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Needs OM Intervention</p>
          <p className="mt-3 text-3xl font-semibold text-rose-950">{interventionNow.length}</p>
          <p className="mt-2 text-sm text-rose-800/80">Founders who are blocked on proof quality, readiness, or next-step clarity.</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Validation Level 1 Ready</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-950">{levelOneReadyCount}</p>
          <p className="mt-2 text-sm text-emerald-800/80">Eligible now for mentors, startup circle, and pitch pathways.</p>
        </div>
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Validation Level 2 Ready</p>
          <p className="mt-3 text-3xl font-semibold text-sky-950">{levelTwoReadyCount}</p>
          <p className="mt-2 text-sm text-sky-800/80">Founders who have moved beyond interviews into testing and traction signals.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Weekly Founder Progress</h2>
              <p className="mt-1 text-sm text-slate-500">Founders in motion this week, ordered by the proof gap OM most needs to help close.</p>
            </div>
            <AlertCircle className="h-5 w-5 text-rose-500" />
          </div>

          <div className="mt-6 space-y-4">
            {interventionNow.map(({ company, insight }) => (
              <div key={company.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">{company.name}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {insight.stageLabel}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          insight.staffAttentionLevel === 'high'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {insight.staffAttentionLevel} priority
                      </span>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-slate-600">{insight.staffAttentionReason}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-slate-400" />
                        {insight.countedInterviews} interviews
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FlaskConical className="h-4 w-4 text-slate-400" />
                        {insight.experimentCount} tests
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <SignalIcon className="h-4 w-4 text-slate-400" />
                        {insight.tractionSignalCount} traction signals
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 lg:max-w-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top proof gap</p>
                    <p className="text-sm leading-6 text-slate-700">
                      {insight.proofGaps[0] || insight.nextMilestone}
                    </p>
                    <Link
                      to="/staff/readiness"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                    >
                      Review in readiness queue
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {interventionNow.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No urgent interventions are surfacing right now.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Readiness Decisions</h2>
                <p className="mt-1 text-sm text-slate-500">Formal OM decisions stay separate from Internal Application Review and Scholarship Applications.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-sky-500" />
            </div>

            <div className="mt-6 space-y-4">
              {recentReadinessDecisions.map(({ company, insight }) => {
                const latestReview = insight.latestReview;
                if (!latestReview) {
                  return null;
                }

                return (
                  <div key={`${company.id}-${latestReview.reviewedAt}`} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{company.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {latestReview.reviewType.replace(/_/g, ' ')} reviewed {format(new Date(latestReview.reviewedAt), 'MMM d, yyyy')}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          {latestReview.reasons?.[0] || insight.staffAttentionReason}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          latestReview.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-700'
                            : latestReview.status === 'not_ready' || latestReview.status === 'needs_work'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {latestReview.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Internal Application Review / Scholarship Applications
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingApplications.length}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Intake and financial-access records still waiting on staff review. These are not venture-stage judgments.
                </p>
              </div>

              {recentReadinessDecisions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No readiness decisions have been recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Mentors / Meeting Requests / Feedback</h2>
                <p className="mt-1 text-sm text-slate-500">Mentor matching and meeting operations should follow proof, not guesswork.</p>
              </div>
              <UserCheck className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mentor pool</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{mentors.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active assignments</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {assignments.filter((assignment) => assignment.status === AssignmentStatus.ACTIVE).length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Waiting on mentor activation</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{mentorQueue.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Unlock Candidates</h2>
              <p className="mt-1 text-sm text-slate-500">Founders who have earned the next support layer from evidence already in the system.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-sky-500" />
          </div>

          <div className="mt-6 space-y-4">
            {unlockCandidates.map(({ company, insight }) => (
              <div key={company.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{company.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{insight.nextMilestone}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {insight.availableResources.slice(0, 4).map((resource) => (
                        <span
                          key={resource.key}
                          className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"
                        >
                          {resource.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    to="/staff/readiness"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                  >
                    Activate support
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}

            {unlockCandidates.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No founders have crossed a support unlock threshold yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Cohort Momentum</h2>
              <p className="mt-1 text-sm text-slate-500">First-pass momentum view grounded in Member Companies, Customer Discovery, evidence, and readiness.</p>
            </div>
            <Clock3 className="h-5 w-5 text-indigo-500" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {cohortMomentum.map((lane) => (
              <div key={lane.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{lane.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{lane.count}</p>
                    <p className="mt-2 text-sm text-slate-500">{lane.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Mentor Matching Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Companies that have earned mentor support but still need activation.</p>
            </div>
            <UserCheck className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="mt-6 space-y-4">
            {mentorQueue.map(({ company, insight }) => (
              <div key={company.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{company.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Validation level 1 met. {insight.countedInterviews} interviews, {insight.strongPatternCount} strong patterns, {insight.assumptionCount} mapped assumptions.
                    </p>
                  </div>
                  <Link
                    to="/staff/readiness"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400 hover:bg-white"
                  >
                    Review
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
            {mentorQueue.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No mentor-matching gaps are visible right now.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
