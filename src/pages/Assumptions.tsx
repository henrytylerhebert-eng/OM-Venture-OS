import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Building,
  CheckCircle2,
  Edit2,
  FlaskConical,
  HelpCircle,
  Lightbulb,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import {
  createAssumption,
  deleteAssumption,
  getAssumptions,
  getPatterns,
  updateAssumption,
} from '../services/evidenceService';
import { getCompanies } from '../services/companyService';
import { getMentorAssignments } from '../services/mentorService';
import {
  Assumption,
  AssumptionStatus,
  AssumptionType,
  AssignmentStatus,
  Company,
  MentorAssignment,
  Pattern,
  RoleType,
  StageConfidence,
} from '../types';
import { cn } from '../lib/utils';
import { getRoleScopedPath } from '../lib/roleRouting';

interface AssumptionFormState {
  statement: string;
  type: AssumptionType;
  importanceScore: number;
  evidenceScore: number;
  linkedPatternId: string;
  notes: string;
}

const initialFormState: AssumptionFormState = {
  statement: '',
  type: AssumptionType.DESIRABILITY,
  importanceScore: 5,
  evidenceScore: 0,
  linkedPatternId: '',
  notes: '',
};

const statusClass = (status: AssumptionStatus) =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    status === AssumptionStatus.VALIDATED && 'bg-emerald-100 text-emerald-700',
    status === AssumptionStatus.INVALIDATED && 'bg-rose-100 text-rose-700',
    status === AssumptionStatus.UNKNOWN && 'bg-slate-200 text-slate-700'
  );

const typeClass = (type: AssumptionType) =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    type === AssumptionType.DESIRABILITY && 'bg-sky-100 text-sky-700',
    type === AssumptionType.VIABILITY && 'bg-indigo-100 text-indigo-700',
    type === AssumptionType.FEASIBILITY && 'bg-amber-100 text-amber-700'
  );

const getAssumptionGapLabel = (assumption: Assumption) => {
  if (assumption.notes?.trim()) {
    return assumption.notes.trim();
  }

  if (assumption.status === AssumptionStatus.VALIDATED) {
    return 'This risk already has enough proof to stay out of the next test decision.';
  }

  if (assumption.evidenceScore <= 2) {
    return 'Very little proof exists yet, so this assumption still needs a direct test.';
  }

  if (assumption.evidenceScore <= 5) {
    return 'Some proof exists, but the evidence is still too weak to remove this risk.';
  }

  return 'Pressure-test whether the current evidence is strong enough to move this out of the weakest-risk stack.';
};

const isStrongPattern = (pattern: Pattern) =>
  pattern.confidence === StageConfidence.HIGH ||
  pattern.numberOfMentions >= 4 ||
  pattern.averagePainIntensity >= 4 ||
  pattern.unpromptedMentions >= 2;

const calculatePriorityScore = (importanceScore: number, evidenceScore: number) =>
  importanceScore + (10 - evidenceScore);

const Assumptions: React.FC = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === RoleType.OM_STAFF || profile?.role === RoleType.OM_ADMIN;
  const isFounder = profile?.role === RoleType.FOUNDER || profile?.role === RoleType.STARTUP_TEAM;
  const isMentor = profile?.role === RoleType.MENTOR;
  const canEditAssumptions = isStaff || isFounder;

  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssumption, setEditingAssumption] = useState<Assumption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<AssumptionFormState>(initialFormState);

  useEffect(() => {
    if (!isMentor || !profile?.personId) {
      setMentorAssignments([]);
      return undefined;
    }

    return getMentorAssignments(setMentorAssignments, [where('mentorId', '==', profile.personId)]);
  }, [isMentor, profile?.personId]);

  useEffect(() => {
    const unsubscribe = getCompanies((allCompanies) => {
      const nextCompanies = isStaff
        ? allCompanies
        : isMentor
          ? allCompanies.filter((company) =>
              mentorAssignments.some(
                (assignment) =>
                  assignment.companyId === company.id && assignment.status === AssignmentStatus.ACTIVE
              )
            )
          : allCompanies.filter((company) => company.founderLeadPersonId === profile?.personId);

      setCompanies(nextCompanies);
      setSelectedCompanyId((current) => {
        if (current && nextCompanies.some((company) => company.id === current)) {
          return current;
        }

        return nextCompanies[0]?.id || '';
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isMentor, isStaff, mentorAssignments, profile?.personId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setAssumptions([]);
      setPatterns([]);
      return undefined;
    }

    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    const unsubPatterns = getPatterns(setPatterns, selectedCompanyId);

    return () => {
      unsubAssumptions();
      unsubPatterns();
    };
  }, [selectedCompanyId]);

  const rankedAssumptions = useMemo(
    () =>
      assumptions
        .slice()
        .filter((assumption) => assumption.statement.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort(
          (a, b) =>
            (b.priorityScore || 0) - (a.priorityScore || 0) ||
            (b.importanceScore || 0) - (a.importanceScore || 0) ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [assumptions, searchTerm]
  );

  const weakestAssumption = useMemo(
    () =>
      rankedAssumptions.find((assumption) => assumption.status !== AssumptionStatus.VALIDATED) ||
      rankedAssumptions[0],
    [rankedAssumptions]
  );

  const strongPatternCount = useMemo(
    () => patterns.filter((pattern) => isStrongPattern(pattern)).length,
    [patterns]
  );

  const unresolvedAssumptionCount = useMemo(
    () =>
      assumptions.filter((assumption) => assumption.status !== AssumptionStatus.VALIDATED).length,
    [assumptions]
  );

  const mvpDesignUnlocked = Boolean(strongPatternCount > 0 && assumptions.length > 0);
  const patternsPath = getRoleScopedPath(profile?.role, 'patterns');
  const experimentsPath = getRoleScopedPath(profile?.role, 'experiments');

  const openNewAssumption = (linkedPattern?: Pattern) => {
    setEditingAssumption(null);
    setFormData({
      ...initialFormState,
      linkedPatternId: linkedPattern?.id || '',
      type:
        linkedPattern?.status === undefined
          ? AssumptionType.DESIRABILITY
          : linkedPattern.status === 'pivot'
            ? AssumptionType.DESIRABILITY
            : AssumptionType.VIABILITY,
      notes: linkedPattern ? `We still need to learn whether "${linkedPattern.problemTheme}" is strong enough to support the next test.` : '',
    });
    setShowAddModal(true);
  };

  const handleEdit = (assumption: Assumption) => {
    setEditingAssumption(assumption);
    setFormData({
      statement: assumption.statement,
      type: assumption.type,
      importanceScore: assumption.importanceScore,
      evidenceScore: assumption.evidenceScore,
      linkedPatternId: assumption.linkedPatternId || '',
      notes: assumption.notes || '',
    });
    setShowAddModal(true);
  };

  const handleSaveAssumption = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId || !canEditAssumptions) {
      return;
    }

    const payload = {
      companyId: selectedCompanyId,
      statement: formData.statement.trim(),
      type: formData.type,
      importanceScore: formData.importanceScore,
      evidenceScore: formData.evidenceScore,
      priorityScore: calculatePriorityScore(formData.importanceScore, formData.evidenceScore),
      status: editingAssumption?.status || AssumptionStatus.UNKNOWN,
      linkedPatternId: formData.linkedPatternId || undefined,
      notes: formData.notes.trim() || undefined,
      createdAt: editingAssumption?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewedAt: editingAssumption?.reviewedAt,
      linkedExperimentId: editingAssumption?.linkedExperimentId,
    };

    if (editingAssumption) {
      await updateAssumption(editingAssumption.id, payload);
    } else {
      await createAssumption(payload);
    }

    setFormData(initialFormState);
    setEditingAssumption(null);
    setShowAddModal(false);
  };

  const handleUpdateStatus = async (id: string, status: AssumptionStatus) => {
    if (!canEditAssumptions) {
      return;
    }

    await updateAssumption(id, {
      status,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!canEditAssumptions) {
      return;
    }

    if (window.confirm('Delete this assumption? This removes the risk record, not the underlying evidence.')) {
      await deleteAssumption(id);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading assumption stack...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div
          className={cn(
            'inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]',
            isStaff
              ? 'border border-amber-200 bg-amber-50 text-amber-800'
              : isMentor
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-sky-200 bg-sky-50 text-sky-800'
          )}
        >
          {isStaff ? 'OM Assumption Review' : isMentor ? 'Mentor Assumption Readout' : 'Builder Assumption Stack'}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {isStaff
                ? 'Review what is still risky before a founder builds.'
                : isMentor
                  ? 'See the risks that still need proof.'
                  : 'Rank what is still risky before you build.'}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {isStaff
                ? 'Patterns are the repeated truths. Assumptions are the remaining risks. Use this stack to see what still needs proof before OM pushes a founder into test design or build support.'
                : isMentor
                  ? 'This is the read-only risk stack for assigned companies so mentor guidance attaches to what is still unproven.'
                  : 'Patterns are evidence-backed observations. Assumptions are the beliefs that could still break your direction if they turn out to be wrong.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
              <Building className="mr-2 h-4 w-4 text-slate-400" />
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                className="border-none bg-transparent p-0 pr-2 text-sm focus:outline-none"
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            {canEditAssumptions && (
              <button
                onClick={() => openNewAssumption()}
                disabled={!selectedCompanyId}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                New Assumption
              </button>
            )}
          </div>
        </div>
      </header>

      {companies.length === 0 && (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Lightbulb className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">No company context is available here yet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isStaff
              ? 'Once companies are loaded into the operating system, risk stacks will appear here.'
              : isMentor
                ? 'Assumption review opens after OM assigns you to a founder company.'
                : 'Assumption mapping opens after your company is connected to this workspace.'}
          </p>
        </section>
      )}

      {selectedCompanyId && isFounder && (
        <>
          <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">Patterns</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="rounded-full bg-sky-900 px-3 py-1 text-white">Assumption Stack</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">MVP / Test Design</span>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-700">
                  Use this step to answer one question clearly: what is still risky enough that the next MVP or test should be built to learn it?
                </p>
              </div>
              <Link
                to={patternsPath}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
              >
                Back to Patterns
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Weakest Assumption</p>
              <p className="mt-3 text-lg font-semibold text-rose-950">
                {weakestAssumption?.statement || 'No weak assumption named yet'}
              </p>
              <p className="mt-2 text-sm text-rose-900/80">
                {weakestAssumption ? 'This is the risk most likely to shape the next test.' : 'Add one after reviewing repeated patterns.'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Strong Patterns Ready</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{strongPatternCount}</p>
              <p className="mt-2 text-sm text-slate-600">Repeated truths strong enough to support ranked risks.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Unresolved Risks</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{unresolvedAssumptionCount}</p>
              <p className="mt-2 text-sm text-slate-600">Assumptions that still need proof before build-heavy work.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">MVP / Test Design</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{mvpDesignUnlocked ? 'Unlocked' : 'Still Locked'}</p>
              <p className="mt-2 text-sm text-slate-600">
                {mvpDesignUnlocked
                  ? 'You have enough synthesis to design the smallest useful test.'
                  : 'Name repeated truth and top risks first so the next test is grounded.'}
              </p>
            </div>
          </section>
        </>
      )}

      {selectedCompanyId && patterns.length === 0 && (
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-950">Patterns should come first.</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900/80">
                Do not guess at risks before you have repeated truth. Use the Patterns step to confirm repeated pain, who feels it most, and what people do now instead.
              </p>
            </div>
            <Link
              to={patternsPath}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-300"
            >
              Open Patterns
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {selectedCompanyId && (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Assumption Stack</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rank the risks that are still unproven so the next MVP or test resolves something important.
                </p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assumptions"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-full border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {rankedAssumptions.length > 0 ? (
              <div className="mt-6 space-y-4">
                {rankedAssumptions.map((assumption) => {
                  const linkedPattern = patterns.find((pattern) => pattern.id === assumption.linkedPatternId);

                  return (
                    <article key={assumption.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-950">{assumption.statement}</h3>
                            {weakestAssumption?.id === assumption.id && (
                              <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                                Weakest Assumption
                              </span>
                            )}
                            <span className={typeClass(assumption.type)}>{assumption.type}</span>
                            <span className={statusClass(assumption.status)}>{assumption.status}</span>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why This Is Still Risky</p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">{getAssumptionGapLabel(assumption)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What Evidence Exists</p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">
                                {linkedPattern
                                  ? `Linked to ${linkedPattern.problemTheme}. Evidence score ${assumption.evidenceScore}/10.`
                                  : `Current evidence score ${assumption.evidenceScore}/10. Link this to a pattern when repeated truth is clear.`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">
                                Importance {assumption.importanceScore}/10, priority {assumption.priorityScore}
                              </p>
                            </div>
                          </div>
                        </div>
                        {canEditAssumptions && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleEdit(assumption)}
                              className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-900"
                              title="Edit assumption"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(assumption.id, AssumptionStatus.VALIDATED)}
                              className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                              title="Mark validated"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(assumption.id, AssumptionStatus.UNKNOWN)}
                              className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-sky-300 hover:text-sky-700"
                              title="Keep unproven"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(assumption.id, AssumptionStatus.INVALIDATED)}
                              className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-700"
                              title="Mark invalidated"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(assumption.id)}
                              className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-700"
                              title="Delete assumption"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <Lightbulb className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-950">No assumptions ranked yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Start with the risk that would break this direction if it turns out to be wrong.
                </p>
                {canEditAssumptions && patterns[0] && (
                  <button
                    onClick={() => openNewAssumption(patterns[0])}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Draft From Strongest Pattern
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Founder Prompts</h2>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                <p>What still has not been proven?</p>
                <p>Which assumption would break this direction if it is wrong?</p>
                <p>What should the next MVP or test help you learn?</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                <p>Patterns are not assumptions. A repeated pain is evidence; an unproven belief is still a risk.</p>
                <p>Do not use this step to claim readiness, support access, or investor proof.</p>
                <p>Build only what helps you learn whether the weakest assumption is true.</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">MVP / Test Design Handoff</h2>
              <p className="mt-1 text-sm text-slate-500">
                The next screen should inherit the weakest assumption, not skip past it.
              </p>
              {mvpDesignUnlocked ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Your strongest patterns and ranked risks are in place. Design the smallest test that resolves the weakest assumption next.
                  </div>
                  <Link
                    to={experimentsPath}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Open MVP / Test Design
                    <FlaskConical className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Name at least one strong pattern and one ranked assumption before you move into MVP / Test Design.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {editingAssumption ? 'Refine assumption stack' : 'Add assumption from pattern evidence'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Assumptions are the remaining risks, not repeated truth. Tie them back to patterns wherever possible.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAssumption(null);
                  setFormData(initialFormState);
                }}
                className="rounded-full border border-slate-300 p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSaveAssumption} className="space-y-6 p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Assumption Statement</label>
                <textarea
                  required
                  rows={3}
                  value={formData.statement}
                  onChange={(event) => setFormData({ ...formData, statement: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  placeholder="We believe this customer will take the next step if the pain is strong enough."
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Assumption Type</label>
                  <select
                    value={formData.type}
                    onChange={(event) => setFormData({ ...formData, type: event.target.value as AssumptionType })}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  >
                    <option value={AssumptionType.DESIRABILITY}>Desirability</option>
                    <option value={AssumptionType.VIABILITY}>Viability</option>
                    <option value={AssumptionType.FEASIBILITY}>Feasibility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Linked Pattern</label>
                  <select
                    value={formData.linkedPatternId}
                    onChange={(event) => setFormData({ ...formData, linkedPatternId: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  >
                    <option value="">No linked pattern yet</option>
                    {patterns.map((pattern) => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.problemTheme}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Importance (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.importanceScore}
                    onChange={(event) => setFormData({ ...formData, importanceScore: parseInt(event.target.value, 10) })}
                    className="mt-3 w-full accent-slate-900"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Low</span>
                    <span className="font-semibold text-slate-900">{formData.importanceScore}</span>
                    <span>Critical</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Current Evidence (0-10)</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.evidenceScore}
                    onChange={(event) => setFormData({ ...formData, evidenceScore: parseInt(event.target.value, 10) })}
                    className="mt-3 w-full accent-slate-900"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>None</span>
                    <span className="font-semibold text-slate-900">{formData.evidenceScore}</span>
                    <span>Strong</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Why This Is Still Risky / What We Need To Learn</label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  placeholder="What still has not been proven, and what should the next test help us learn?"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAssumption(null);
                    setFormData(initialFormState);
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Save Assumption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assumptions;
