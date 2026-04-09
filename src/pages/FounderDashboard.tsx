import React, { useEffect, useMemo, useState } from 'react';
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
  LayoutTemplate,
  MessageSquare,
  Plus,
  Signal as SignalIcon,
  Target,
  Users2,
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
  summarizePatternWidgets,
} from '../services/evidenceService';
import { getMentorAssignments } from '../services/mentorService';
import { getPortfolioProgress, getReadinessReviews } from '../services/progressService';
import { getCompanyResourceAccessForCompany } from '../services/unlockService';
import { getBuilderFoundation } from '../services/builderFoundationService';
import {
  Assumption,
  AssignmentStatus,
  BuilderFoundation,
  Cohort,
  CohortApplication,
  CompanyResourceAccess,
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
import { createEmptyBuilderFoundation, getBuilderFoundationCompletion } from '../lib/builderFoundation';
import { buildCompanyOperatingInsight } from '../lib/companyInsights';
import { buildCompanyResourceView } from '../lib/unlocks';
import { getRoleScopedPath } from '../lib/roleRouting';
import { cn } from '../lib/utils';

const formatDirectionLabel = (value: string) => value.replace(/_/g, ' ');

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
  const [companyResourceAccess, setCompanyResourceAccess] = useState<CompanyResourceAccess[]>([]);
  const [builderFoundation, setBuilderFoundation] = useState<BuilderFoundation | null>(null);

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
      setInterviews([]);
      setPatterns([]);
      setAssumptions([]);
      setExperiments([]);
      setSignals([]);
      setReadinessReviews([]);
      setCompanyResourceAccess([]);
      setBuilderFoundation(null);
      return undefined;
    }

    const unsubInterviews = getInterviews(setInterviews, selectedCompanyId);
    const unsubPatterns = getPatterns(setPatterns, selectedCompanyId);
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    const unsubExperiments = getExperiments(setExperiments, selectedCompanyId);
    const unsubSignals = getSignals(setSignals, selectedCompanyId);
    const unsubReadiness = getReadinessReviews(setReadinessReviews, selectedCompanyId);
    const unsubResourceAccess = getCompanyResourceAccessForCompany(setCompanyResourceAccess, selectedCompanyId);
    const unsubBuilderFoundation = getBuilderFoundation(selectedCompanyId, (record) => {
      setBuilderFoundation(record || createEmptyBuilderFoundation(selectedCompanyId));
    });

    return () => {
      unsubInterviews();
      unsubPatterns();
      unsubAssumptions();
      unsubExperiments();
      unsubSignals();
      unsubReadiness();
      unsubResourceAccess();
      unsubBuilderFoundation();
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
  const latestReadinessReview =
    selectedInsight?.latestReview ||
    readinessReviews
      .slice()
      .sort((left, right) => new Date(right.reviewedAt).getTime() - new Date(left.reviewedAt).getTime())[0];
  const strongestPattern = useMemo(
    () => summarizePatternWidgets(patterns).strongestPattern,
    [patterns]
  );
  const foundationCompletion = useMemo(
    () => getBuilderFoundationCompletion(builderFoundation),
    [builderFoundation]
  );
  const synthesisReady = Boolean(
    selectedInsight && selectedInsight.strongPatternCount > 0 && selectedInsight.assumptionCount > 0 && strongestPattern
  );
  const currentDirectionLabel =
    strongestPattern?.status.replace(/_/g, ' ') || 'direction still needs a decision';
  const currentBuilderStep = selectedInsight
    ? selectedInsight.countedInterviews === 0
      ? !foundationCompletion.ideaToProblemComplete
        ? {
            label: 'Idea-to-Problem Translator',
            description: 'Start Builder by naming who has the problem, what they do now, and why that path falls short before you collect discovery evidence.',
            nextAction: 'Translate the problem',
            nextPath: getRoleScopedPath(profile?.role, 'problem'),
          }
        : !foundationCompletion.leanCanvasComplete
          ? {
              label: 'Lean Canvas Builder',
              description: 'Turn the problem draft into a live Builder canvas with clear segments, alternatives, channels, and value promise before interviews start.',
              nextAction: 'Build the canvas',
              nextPath: getRoleScopedPath(profile?.role, 'canvas'),
            }
          : !foundationCompletion.earlyAdopterComplete
            ? {
                label: 'Early Adopter Selector',
                description: 'Choose the first customer group to learn from before you begin outreach and interview capture.',
                nextAction: 'Select the early adopter',
                nextPath: getRoleScopedPath(profile?.role, 'early-adopter'),
              }
            : {
                label: 'Interview Capture',
                description: 'Start logging customer conversations with clear pain, segment, alternatives, and quotes before you try to synthesize anything.',
                nextAction: 'Log interviews',
                nextPath: getRoleScopedPath(profile?.role, 'discovery'),
              }
      : !synthesisReady
        ? {
            label: 'Patterns & Assumptions',
            description: 'You have interview evidence. Now turn it into repeated truth, ranked risk, and a clear persevere, narrow, or pivot call before you design an MVP or test.',
            nextAction: 'Open synthesis step',
            nextPath: getRoleScopedPath(profile?.role, 'patterns'),
          }
        : {
            label: 'MVP / Test Design',
            description: 'Your strongest pattern and weakest assumption are ready to shape a focused test. Build only what helps you learn next.',
            nextAction: 'Design next test',
            nextPath: getRoleScopedPath(profile?.role, 'experiments'),
          }
    : null;

  const builderJourneySteps = selectedCompany
    ? [
        {
          label: 'Idea-to-Problem Translator',
          path: getRoleScopedPath(profile?.role, 'problem'),
          description: 'Translate the founder idea into a real customer problem, current behavior, and weak workaround.',
          count: foundationCompletion.ideaToProblemComplete ? 1 : 0,
          detail: builderFoundation?.ideaToProblem.problemOwner || 'Name the person with the problem first',
          icon: Target,
          state: foundationCompletion.ideaToProblemComplete ? 'complete' : 'current',
        },
        {
          label: 'Lean Canvas Builder',
          path: getRoleScopedPath(profile?.role, 'canvas'),
          description: foundationCompletion.ideaToProblemComplete
            ? 'Keep the Lean Canvas live as the working model for the problem, segment, alternatives, and value promise.'
            : 'Locked until the problem owner, current behavior, and weak workaround are named.',
          count:
            (builderFoundation?.leanCanvas.customerSegments.length || 0) +
            (builderFoundation?.leanCanvas.problems.length || 0),
          detail: foundationCompletion.leanCanvasComplete
            ? `${builderFoundation?.leanCanvas.customerSegments.length || 0} segment${(builderFoundation?.leanCanvas.customerSegments.length || 0) === 1 ? '' : 's'} / ${builderFoundation?.leanCanvas.problems.length || 0} problem${(builderFoundation?.leanCanvas.problems.length || 0) === 1 ? '' : 's'}`
            : 'Build the working model before interviews start',
          icon: LayoutTemplate,
          state:
            !foundationCompletion.ideaToProblemComplete
              ? 'locked'
              : foundationCompletion.leanCanvasComplete
                ? 'complete'
                : 'current',
        },
        {
          label: 'Early Adopter Selector',
          path: getRoleScopedPath(profile?.role, 'early-adopter'),
          description: foundationCompletion.leanCanvasComplete
            ? 'Choose the first customer group to learn from and where you can reach them.'
            : 'Locked until the Lean Canvas is clear enough to support a real target.',
          count: foundationCompletion.earlyAdopterComplete ? 1 : 0,
          detail: builderFoundation?.earlyAdopter.segmentName || 'Pick the first segment to learn from',
          icon: Users2,
          state:
            !foundationCompletion.leanCanvasComplete
              ? 'locked'
              : foundationCompletion.earlyAdopterComplete
                ? 'complete'
                : 'current',
        },
        {
          label: 'Interview Capture',
          path: getRoleScopedPath(profile?.role, 'discovery'),
          description: 'Capture customer truth before you try to synthesize or design a test.',
          count: selectedInsight?.countedInterviews || 0,
          detail: `${selectedInsight?.highPainInterviewCount || 0} strong pain signal${selectedInsight?.highPainInterviewCount === 1 ? '' : 's'}`,
          icon: MessageSquare,
          state:
            !foundationCompletion.interviewReady
              ? 'locked'
              : (selectedInsight?.countedInterviews || 0) === 0
                ? 'current'
                : 'complete',
        },
        {
          label: 'Patterns & Assumptions',
          path: getRoleScopedPath(profile?.role, 'patterns'),
          description: 'Turn interviews into repeated truth, ranked risk, and a direction decision before you move forward.',
          count: (selectedInsight?.strongPatternCount || 0) + (selectedInsight?.assumptionCount || 0),
          detail: `${selectedInsight?.strongPatternCount || 0} pattern${selectedInsight?.strongPatternCount === 1 ? '' : 's'} / ${selectedInsight?.assumptionCount || 0} assumption${selectedInsight?.assumptionCount === 1 ? '' : 's'}`,
          icon: Brain,
          state:
            !foundationCompletion.interviewReady || (selectedInsight?.countedInterviews || 0) === 0
              ? 'locked'
              : !synthesisReady
                ? 'current'
                : 'complete',
        },
        {
          label: 'MVP / Test Design',
          path: getRoleScopedPath(profile?.role, 'experiments'),
          description: synthesisReady
            ? 'Use your strongest pattern and weakest assumption to design the smallest useful test.'
            : 'Locked until repeated pain and top assumptions are named.',
          count: selectedInsight?.experimentCount || 0,
          icon: FlaskConical,
          detail: synthesisReady ? `Current direction: ${currentDirectionLabel}` : 'Complete synthesis first',
          state: !synthesisReady ? 'locked' : (selectedInsight?.experimentCount || 0) > 0 ? 'complete' : 'current',
        },
        {
          label: 'Live Test Signals',
          path: getRoleScopedPath(profile?.role, 'signals'),
          description: 'Track what changed once a real test started running in the market.',
          count: selectedInsight?.tractionSignalCount || 0,
          detail:
            selectedInsight?.experimentCount && selectedInsight.experimentCount > 0
              ? `${selectedInsight.experimentCount} test${selectedInsight.experimentCount === 1 ? '' : 's'} in motion`
              : 'No live tests yet',
          icon: SignalIcon,
          state:
            (selectedInsight?.experimentCount || 0) === 0
              ? 'locked'
              : (selectedInsight?.tractionSignalCount || 0) > 0
                ? 'complete'
                : 'current',
        },
      ]
    : [];
  const resourceView = useMemo(
    () =>
      selectedInsight
        ? buildCompanyResourceView({
            accessRecords: companyResourceAccess,
            availableResourceKeys: selectedInsight.availableResources.map((resource) => resource.key),
            lockedResources: selectedInsight.lockedResources.map((resource) => ({
              key: resource.key,
              missingProof: resource.missingProof,
            })),
          })
        : [],
    [companyResourceAccess, selectedInsight]
  );
  const unlockedResources = resourceView.filter(
    (resource) => resource.founderVisible && resource.accessState === 'unlocked'
  );
  const eligibleResources = resourceView.filter(
    (resource) => resource.founderVisible && resource.accessState === 'eligible'
  );
  const expiredResources = resourceView.filter(
    (resource) => resource.founderVisible && resource.accessState === 'expired'
  );
  const revokedResources = resourceView.filter(
    (resource) => resource.founderVisible && resource.accessState === 'revoked'
  );
  const lockedResourceView = resourceView.filter(
    (resource) => resource.founderVisible && resource.accessState === 'locked'
  );

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
              This workspace follows Builder as an operating system: problem clarity, customer truth, synthesis, testing, readiness, and earned support. It is not just a place to store notes.
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
              <p className="mt-2 text-sm text-slate-500">
                {selectedInsight.countedInterviews > 0
                  ? 'Builder asks for at least 15, with stronger support closer to 50.'
                  : 'No interviews are recorded yet. Builder still starts with discovery before synthesis.'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Strong Pain Signals</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{selectedInsight.highPainInterviewCount}</p>
              <p className="mt-2 text-sm text-slate-500">
                {selectedInsight.highPainInterviewCount > 0
                  ? 'Interviews that surfaced strong customer pain, not polite agreement.'
                  : 'No strong pain signal is confirmed yet. Do not treat polite interest as proof.'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Validation Tests</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{selectedInsight.experimentCount}</p>
              <p className="mt-2 text-sm text-slate-500">
                {selectedInsight.experimentCount > 0
                  ? 'Builder expects testing beyond discovery before build-heavy support unlocks.'
                  : 'No validation tests are recorded yet. Build-heavy support should stay locked.'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Traction Signals</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{selectedInsight.tractionSignalCount}</p>
              <p className="mt-2 text-sm text-slate-500">
                {selectedInsight.tractionSignalCount > 0
                  ? 'Measured signs that validation is becoming real in the market.'
                  : 'No traction signals are recorded yet. Sparse seed data should not read as market proof.'}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-950">Builder input layer</h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-500">
                  These founder inputs are not proof. They shape who you talk to, what you ask, and what assumptions and outreach lanes should exist later.
                </p>
              </div>
              <Link
                to={
                  !foundationCompletion.ideaToProblemComplete
                    ? getRoleScopedPath(profile?.role, 'problem')
                    : !foundationCompletion.leanCanvasComplete
                      ? getRoleScopedPath(profile?.role, 'canvas')
                      : !foundationCompletion.earlyAdopterComplete
                        ? getRoleScopedPath(profile?.role, 'early-adopter')
                        : getRoleScopedPath(profile?.role, 'discovery')
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {foundationCompletion.interviewReady ? 'Open Interview Capture' : 'Complete Builder inputs'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Who has the problem</p>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {builderFoundation?.ideaToProblem.problemOwner || 'Still unnamed'}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {builderFoundation?.ideaToProblem.problemMoment || 'Name the moment when the pain shows up.'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What they do now</p>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {builderFoundation?.ideaToProblem.currentBehavior || 'Current behavior still needs to be described'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Why it falls short</p>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {builderFoundation?.ideaToProblem.whyCurrentPathFallsShort || 'Weak workaround is still unclear'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Primary early adopter</p>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {builderFoundation?.earlyAdopter.segmentName || 'Still not chosen'}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {builderFoundation?.earlyAdopter.personaLabel || 'Choose the first role or person to learn from.'}
                </p>
              </div>
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
                {selectedInsight.recordedProgressScore !== undefined ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recorded Progress</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{selectedInsight.recordedProgressScore}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recorded Progress</p>
                    <p className="mt-1 text-sm font-medium text-slate-600">No staff progress record yet.</p>
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
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        No blocking proof gap is surfaced in the current record. Confirm interviews, synthesis, and test evidence are actually present before treating this step as cleared.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Unlocked Now</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Support currently opened through persistent OM access records. Eligibility alone does not count as unlocked.
                </p>
                <div className="mt-5 space-y-3">
                  {unlockedResources.length > 0 ? (
                    unlockedResources.map((resource) => (
                      <div key={resource.key} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-900">{resource.name}</p>
                        <p className="mt-1 text-sm text-emerald-800/80">{resource.grantedReason || resource.description}</p>
                        {resource.grantedAt ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            Unlocked {new Date(resource.grantedAt).toLocaleDateString()}
                          </p>
                        ) : null}
                        {resource.expiresAt ? (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            Expires {new Date(resource.expiresAt).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No support pathways are open yet. Builder evidence may still be early, or staff has not activated access yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Waiting On Staff Activation</h2>
                <p className="mt-1 text-sm text-slate-500">Support that may be eligible from the current record but is not unlocked yet.</p>
                <div className="mt-5 space-y-3">
                  {eligibleResources.length > 0 ? (
                    eligibleResources.map((resource) => (
                      <div key={resource.key} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-semibold text-amber-900">{resource.name}</p>
                        <p className="mt-1 text-sm text-amber-800/80">
                          Your current proof may justify staff review, but no access record is active yet.
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No support pathways are currently waiting on staff activation.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Expired Access</h2>
                <p className="mt-1 text-sm text-slate-500">Support that was previously open but has now timed out.</p>
                <div className="mt-5 space-y-3">
                  {expiredResources.length > 0 ? (
                    expiredResources.map((resource) => (
                      <div key={resource.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{resource.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {resource.grantedReason || 'This support was previously opened by OM staff.'}
                        </p>
                        {(resource.expiredAt || resource.expiresAt) ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Expired {new Date(resource.expiredAt || resource.expiresAt || '').toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No support pathways are currently in an expired state.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Revoked Access</h2>
                <p className="mt-1 text-sm text-slate-500">Support OM staff explicitly closed after review.</p>
                <div className="mt-5 space-y-3">
                  {revokedResources.length > 0 ? (
                    revokedResources.map((resource) => (
                      <div key={resource.key} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-sm font-semibold text-rose-900">{resource.name}</p>
                        <p className="mt-1 text-sm text-rose-800/80">
                          {resource.revokedReason || 'OM staff revoked this support access after review.'}
                        </p>
                        {resource.revokedAt ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                            Revoked {new Date(resource.revokedAt).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No support pathways are currently in a revoked state.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Still Locked</h2>
                <p className="mt-1 text-sm text-slate-500">What support still waits on more evidence.</p>
                <div className="mt-5 space-y-3">
                  {lockedResourceView.length > 0 ? (
                    lockedResourceView.slice(0, 4).map((resource) => (
                      <div key={resource.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{resource.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{resource.missingProof[0] || 'More Builder proof is still needed before this support can open.'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No additional locked pathways are configured in the current record yet. That does not replace staff review.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
            {currentBuilderStep && (
              <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm xl:col-span-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Current Builder Step</p>
                    <h2 className="text-xl font-semibold text-slate-950">{currentBuilderStep.label}</h2>
                    <p className="max-w-3xl text-sm leading-6 text-slate-700">{currentBuilderStep.description}</p>
                  </div>
                  <Link
                    to={currentBuilderStep.nextPath}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    {currentBuilderStep.nextAction}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Builder Journey</h2>
                  <p className="mt-1 text-sm text-slate-500">Move from problem clarity into discovery, synthesis, and then the smallest useful test.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {builderJourneySteps.map((item) => (
                  item.state === 'locked' ? (
                    <div
                      key={item.label}
                      className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 opacity-80"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <item.icon className="h-5 w-5 text-slate-400" />
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                          {item.count}
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-slate-950">{item.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      <p className="mt-3 text-sm font-medium text-slate-700">{item.detail}</p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                        Locked for now
                        <AlertCircle className="h-4 w-4" />
                      </span>
                    </div>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.path}
                      className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <item.icon className="h-5 w-5 text-slate-500" />
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 ring-1 ring-slate-200">
                            {item.count}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                              item.state === 'current' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                            )}
                          >
                            {item.state}
                          </span>
                        </div>
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-slate-950">{item.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      {item.detail && <p className="mt-3 text-sm font-medium text-slate-700">{item.detail}</p>}
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                        Open workspace
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  )
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Readiness Signals</h2>
                <p className="mt-1 text-sm text-slate-500">Official reviews stay separate from stage and membership. No review means undecided, not ready.</p>
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
                            {review?.reasons?.[0] || 'No official review captured yet. Treat this as undecided.'}
                          </p>
                        </div>
                        {icon}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Operational Distinctions</h2>
                <p className="mt-1 text-sm text-slate-500">Keep membership, venture stage, readiness, unlocks, and investor visibility separate.</p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Membership</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{selectedCompany.membershipStatus || 'unknown'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Venture stage</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{selectedInsight.stageLabel}</p>
                    <p className="mt-1 text-sm text-slate-500">This is the current Builder phase, not a readiness decision.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Readiness</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {latestReadinessReview ? formatDirectionLabel(latestReadinessReview.status) : 'No formal OM review yet'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Readiness stays staff-owned until an official review is recorded.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unlock eligibility</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {unlockedResources.length > 0
                        ? `${unlockedResources.length} support path${unlockedResources.length === 1 ? '' : 's'} unlocked`
                        : expiredResources.length > 0
                          ? `${expiredResources.length} path${expiredResources.length === 1 ? '' : 's'} expired`
                          : revokedResources.length > 0
                            ? `${revokedResources.length} path${revokedResources.length === 1 ? '' : 's'} revoked`
                        : eligibleResources.length > 0
                          ? `${eligibleResources.length} path${eligibleResources.length === 1 ? '' : 's'} waiting on staff activation`
                          : 'More Builder proof still needed'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Investor visibility</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">Not active in this workspace</p>
                    <p className="mt-1 text-sm text-slate-500">Investor-facing access stays out of this founder view.</p>
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
