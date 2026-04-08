import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Building,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Lightbulb,
  MessageSquare,
  Plus,
  Signal as SignalIcon,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { createCompany, getCompanies } from '../services/companyService';
import { getApplications, getCohorts, submitApplication } from '../services/cohortService';
import {
  getAssumptions,
  getExperiments,
  getInterviews,
  getPatterns,
  getSignals,
} from '../services/evidenceService';
import { getMentorAssignments } from '../services/mentorService';
import { getPortfolioProgress, getReadinessReviews } from '../services/progressService';
import {
  Assumption,
  AssignmentStatus,
  Cohort,
  CohortApplication,
  Company,
  DecisionStatus,
  Experiment,
  Interview,
  MembershipStatus,
  MentorAssignment,
  Pattern,
  PortfolioProgress,
  ReadinessReview,
  ReadinessStatus,
  ReadinessType,
  Signal,
} from '../types';
import { buildCompanyOperatingInsight } from '../lib/companyInsights';
import { getRoleScopedPath } from '../lib/roleRouting';

const FounderDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [myCompanies, setMyCompanies] = useState<Company[]>([]);
  const [myApplications, setMyApplications] = useState<CohortApplication[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [portfolioProgress, setPortfolioProgress] = useState<PortfolioProgress[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [readinessReviews, setReadinessReviews] = useState<ReadinessReview[]>([]);

  useEffect(() => {
    if (!profile?.personId) {
      return undefined;
    }

    const unsubCompanies = getCompanies((allCompanies) => {
      const filteredCompanies = allCompanies.filter(
        (company) => company.founderLeadPersonId === profile.personId
      );
      setMyCompanies(filteredCompanies);
      setSelectedCompanyId((current) => current || filteredCompanies[0]?.id || null);
      setLoading(false);
    });

    const unsubApplications = getApplications(
      (applications) => {
        setMyApplications(applications.filter((application) => application.founderPersonId === profile.personId));
      },
      [where('founderPersonId', '==', profile.personId)]
    );
    const unsubCohorts = getCohorts(setCohorts);
    const unsubProgress = getPortfolioProgress(setPortfolioProgress);
    const unsubMentorAssignments = getMentorAssignments(setMentorAssignments);

    return () => {
      unsubCompanies();
      unsubApplications();
      unsubCohorts();
      unsubProgress();
      unsubMentorAssignments();
    };
  }, [profile?.personId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      return undefined;
    }

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

  const handleCreateCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.personId || !newCompanyName) {
      return;
    }

    const companyId = await createCompany({
      name: newCompanyName,
      organizationId: 'default-org',
      founderLeadPersonId: profile.personId,
      description: '',
      membershipStatus: MembershipStatus.PENDING,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setSelectedCompanyId(companyId);
    setNewCompanyName('');
    setShowCreateCompany(false);
  };

  const handleApplyToCohort = async (companyId: string) => {
    if (!profile?.personId || cohorts.length === 0) {
      return;
    }

    const activeCohort = cohorts.find((cohort) => cohort.status === 'active') || cohorts[0];

    await submitApplication({
      companyId,
      founderPersonId: profile.personId,
      requestedCohortId: activeCohort.id,
      decision: DecisionStatus.PENDING,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const selectedCompany = myCompanies.find((company) => company.id === selectedCompanyId);
  const selectedInsight =
    selectedCompany &&
    buildCompanyOperatingInsight({
      interviews,
      patterns,
      assumptions,
      experiments,
      signals,
      reviews: readinessReviews,
      progress: portfolioProgress.find((progress) => progress.companyId === selectedCompany.id),
      mentorAssignments: mentorAssignments.filter(
        (assignment) =>
          assignment.companyId === selectedCompany.id && assignment.status === AssignmentStatus.ACTIVE
      ),
    });
  const selectedApplication = myApplications.find((application) => application.companyId === selectedCompanyId);
  const activeCohort = cohorts.find((cohort) => cohort.status === 'active') || cohorts[0];

  const evidenceLinks = selectedCompany
    ? [
        {
          label: 'Customer discovery',
          path: getRoleScopedPath(profile?.role, 'discovery'),
          description: 'Interviews that count toward the Builder minimum and surface real pain.',
          count: selectedInsight?.countedInterviews || 0,
          icon: MessageSquare,
        },
        {
          label: 'Patterns',
          path: getRoleScopedPath(profile?.role, 'patterns'),
          description: 'Repeated truths that turn interview notes into evidence.',
          count: selectedInsight?.strongPatternCount || 0,
          icon: Brain,
        },
        {
          label: 'Assumptions',
          path: getRoleScopedPath(profile?.role, 'assumptions'),
          description: 'Risks that still need proof before you build or fundraise.',
          count: selectedInsight?.assumptionCount || 0,
          icon: Lightbulb,
        },
        {
          label: 'Experiments',
          path: getRoleScopedPath(profile?.role, 'experiments'),
          description: 'Tests that move you beyond discovery and into validation.',
          count: selectedInsight?.experimentCount || 0,
          icon: FlaskConical,
        },
        {
          label: 'Signals',
          path: getRoleScopedPath(profile?.role, 'signals'),
          description: 'Measurable traction that proves the test is becoming real.',
          count: selectedInsight?.tractionSignalCount || 0,
          icon: SignalIcon,
        },
      ]
    : [];

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading builder workspace...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
          Builder Workspace
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Build proof before asking for more support.</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              This workspace follows Builder as an operating system: customer truth, synthesis, testing, readiness, and earned support. It is not just a place to store notes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {myCompanies.length > 0 && (
              <select
                value={selectedCompanyId || ''}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                {myCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowCreateCompany(true)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Startup
            </button>
          </div>
        </div>
      </header>

      {showCreateCompany && (
        <div className="rounded-[28px] border border-sky-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Register a startup</h2>
          <p className="mt-1 text-sm text-slate-500">Start a Builder workspace for a founder company before tracking proof.</p>
          <form onSubmit={handleCreateCompany} className="mt-5 flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              placeholder="Company name"
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              required
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Create workspace
              </button>
              <button
                type="button"
                onClick={() => setShowCreateCompany(false)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedCompany && selectedInsight ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Interviews Counted</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{selectedInsight.countedInterviews}</p>
              <p className="mt-2 text-sm text-slate-500">Builder asks for at least 15, with stronger support closer to 50.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Strong Pain Signals</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{selectedInsight.highPainInterviewCount}</p>
              <p className="mt-2 text-sm text-slate-500">Interviews that surfaced strong customer pain, not polite agreement.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Validation Tests</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{selectedInsight.experimentCount}</p>
              <p className="mt-2 text-sm text-slate-500">Builder expects testing beyond discovery before build-heavy support unlocks.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Traction Signals</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{selectedInsight.tractionSignalCount}</p>
              <p className="mt-2 text-sm text-slate-500">Measured signs that validation is becoming real in the market.</p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-slate-950">{selectedCompany.name}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      {selectedInsight.stageLabel}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                      membership: {selectedCompany.membershipStatus || 'unknown'}
                    </span>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    {selectedInsight.nextMilestone}
                  </p>
                </div>
                {selectedInsight.recordedProgressScore !== undefined && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recorded Progress</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{selectedInsight.recordedProgressScore}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-sky-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">This Week In Builder</p>
                  <ul className="mt-4 space-y-3">
                    {selectedInsight.weeklyPriorities.map((priority) => (
                      <li key={priority} className="flex gap-3 text-sm leading-6 text-slate-700">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-sky-600" />
                        <span>{priority}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Most Important Missing Proof</p>
                  <div className="mt-4 space-y-3">
                    {selectedInsight.proofGaps.length > 0 ? (
                      selectedInsight.proofGaps.slice(0, 3).map((gap) => (
                        <div key={gap} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          {gap}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        Current proof clears the next unlock threshold. Use staff support to move the next decision forward.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Support Available Now</h2>
                <p className="mt-1 text-sm text-slate-500">Support you have earned from the proof already in the system.</p>
                <div className="mt-5 space-y-3">
                  {selectedInsight.availableResources.length > 0 ? (
                    selectedInsight.availableResources.map((resource) => (
                      <div key={resource.key} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-900">{resource.name}</p>
                        <p className="mt-1 text-sm text-emerald-800/80">{resource.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No support pathways are open yet. Keep building the proof listed below.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Still Locked</h2>
                <p className="mt-1 text-sm text-slate-500">What support still waits on more evidence.</p>
                <div className="mt-5 space-y-3">
                  {selectedInsight.lockedResources.slice(0, 4).map((resource) => (
                    <div key={resource.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{resource.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{resource.missingProof[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Evidence Workflow</h2>
                  <p className="mt-1 text-sm text-slate-500">Open the Builder surfaces that move proof forward this week.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {evidenceLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <item.icon className="h-5 w-5 text-slate-500" />
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 ring-1 ring-slate-200">
                        {item.count}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-950">{item.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      Open workspace
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Readiness Signals</h2>
                <p className="mt-1 text-sm text-slate-500">Official reviews stay separate from stage and membership.</p>
                <div className="mt-5 space-y-4">
                  {[
                    ReadinessType.BUILDER_COMPLETION,
                    ReadinessType.MENTOR_READY,
                    ReadinessType.INTERN_READY,
                    ReadinessType.PITCH_READY,
                    ReadinessType.INVESTOR_READY,
                  ].map((reviewType) => {
                    const review = selectedInsight.readinessByType[reviewType];
                    const icon =
                      review?.status === ReadinessStatus.READY ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : review?.status === ReadinessStatus.NOT_READY ||
                        review?.status === ReadinessStatus.NEEDS_WORK ? (
                        <AlertCircle className="h-5 w-5 text-rose-500" />
                      ) : (
                        <Clock3 className="h-5 w-5 text-slate-300" />
                      );

                    return (
                      <div key={reviewType} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {reviewType.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {review?.reasons?.[0] || 'No official review captured yet.'}
                          </p>
                        </div>
                        {icon}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Program Status</h2>
                <p className="mt-1 text-sm text-slate-500">Operational status without confusing it for readiness.</p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Membership</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{selectedCompany.membershipStatus || 'unknown'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mentor support</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {selectedInsight.activeMentorAssignments > 0
                        ? `${selectedInsight.activeMentorAssignments} active mentor assignment${selectedInsight.activeMentorAssignments > 1 ? 's' : ''}`
                        : 'No active mentor assignment yet'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cohort application</p>
                    {selectedApplication ? (
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {selectedApplication.decision.replace(/_/g, ' ')}
                      </p>
                    ) : activeCohort ? (
                      <button
                        onClick={() => handleApplyToCohort(selectedCompany.id)}
                        disabled={!selectedInsight.isValidationLevelOneReady}
                        className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Apply to {activeCohort.name}
                      </button>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">No active cohort is available yet.</p>
                    )}
                    {!selectedApplication && activeCohort && !selectedInsight.isValidationLevelOneReady && (
                      <p className="mt-2 text-sm text-slate-500">
                        Close the current Builder proof gaps before asking staff to review a cohort application.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <Building className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950">No startup workspace yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Register your company first, then Builder evidence, readiness, and support unlocks can accumulate in one place.
          </p>
        </div>
      )}
    </div>
  );
};

export default FounderDashboard;
