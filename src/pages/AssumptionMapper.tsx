import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, HelpCircle, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import { createAssumption, deleteAssumption, getAssumptions, updateAssumption } from '../services/evidenceService';
import { getBuilderFoundation } from '../services/builderFoundationService';
import { createEmptyBuilderFoundation } from '../lib/builderFoundation';
import { type Assumption, AssumptionStatus, AssumptionType, type BuilderFoundation, type Company } from '../types';
import { cn } from '../lib/utils';
import { getRoleScopedPath } from '../lib/roleRouting';

const inputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none';
const textAreaClass = `${inputClass} min-h-[120px] resize-y`;

interface AssumptionFormState {
  statement: string;
  type: AssumptionType;
  importanceScore: number;
  evidenceScore: number;
  notes: string;
}

const initialFormState: AssumptionFormState = {
  statement: '',
  type: AssumptionType.DESIRABILITY,
  importanceScore: 5,
  evidenceScore: 0,
  notes: '',
};

const calculatePriorityScore = (importanceScore: number, evidenceScore: number) => importanceScore + (10 - evidenceScore);

const statusClass = (status: AssumptionStatus) =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    status === AssumptionStatus.VALIDATED && 'bg-emerald-100 text-emerald-700',
    status === AssumptionStatus.INVALIDATED && 'bg-rose-100 text-rose-700',
    (status === AssumptionStatus.UNKNOWN || status === AssumptionStatus.WEAK) && 'bg-slate-200 text-slate-700',
    status === AssumptionStatus.STRONG && 'bg-sky-100 text-sky-700'
  );

const AssumptionMapper: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [builderFoundation, setBuilderFoundation] = useState<BuilderFoundation | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssumption, setEditingAssumption] = useState<Assumption | null>(null);
  const [formState, setFormState] = useState<AssumptionFormState>(initialFormState);

  useEffect(() => {
    if (!profile?.personId) {
      return undefined;
    }

    return getCompanies((allCompanies) => {
      const founderCompanies = allCompanies.filter((company) => company.founderLeadPersonId === profile.personId);
      setCompanies(founderCompanies);
      setSelectedCompanyId((current) => current || founderCompanies[0]?.id || '');
      setLoading(false);
    });
  }, [profile?.personId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setBuilderFoundation(null);
      setAssumptions([]);
      return undefined;
    }

    const unsubFoundation = getBuilderFoundation(selectedCompanyId, (record) => {
      setBuilderFoundation(record || createEmptyBuilderFoundation(selectedCompanyId));
    });
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);

    return () => {
      unsubFoundation();
      unsubAssumptions();
    };
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);

  const weakestAssumption = useMemo(
    () =>
      assumptions
        .slice()
        .sort(
          (left, right) =>
            right.priorityScore - left.priorityScore ||
            right.importanceScore - left.importanceScore ||
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )
        .find((assumption) => assumption.status !== AssumptionStatus.VALIDATED) || assumptions[0],
    [assumptions]
  );

  const starterAssumptions = useMemo(() => {
    if (!builderFoundation) {
      return [];
    }

    const owner = builderFoundation.ideaToProblem.problemOwner || 'this customer';
    const moment = builderFoundation.ideaToProblem.problemMoment || 'the key problem moment';
    const currentAlternative =
      builderFoundation.ideaToProblem.currentAlternative ||
      builderFoundation.ideaToProblem.currentBehavior ||
      'their current workaround';
    const desiredOutcome = builderFoundation.ideaToProblem.desiredOutcome || 'a better result';
    const earlyAdopter = builderFoundation.earlyAdopter.segmentName || 'the primary early adopter';

    return [
      {
        type: AssumptionType.DESIRABILITY,
        statement: `${owner} feels the problem sharply enough during ${moment} to actively look for a better way.`,
        notes: `We need discovery evidence that ${earlyAdopter} brings this up without being led and treats the problem as worth solving now.`,
      },
      {
        type: AssumptionType.VIABILITY,
        statement: `${owner} will keep engaging if a new approach can deliver ${desiredOutcome}.`,
        notes: `We need to learn whether the outcome is important enough that they will keep talking, trialing, or paying attention once a better path exists.`,
      },
      {
        type: AssumptionType.FEASIBILITY,
        statement: `A lightweight first solution can improve on ${currentAlternative} enough to be useful.`,
        notes: 'We need to learn what “good enough” actually means before turning this into build work.',
      },
    ];
  }, [builderFoundation]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      return;
    }

    const payload = {
      companyId: selectedCompanyId,
      statement: formState.statement.trim(),
      type: formState.type,
      importanceScore: formState.importanceScore,
      evidenceScore: formState.evidenceScore,
      priorityScore: calculatePriorityScore(formState.importanceScore, formState.evidenceScore),
      status: editingAssumption?.status || AssumptionStatus.UNKNOWN,
      notes: formState.notes.trim() || undefined,
      createdAt: editingAssumption?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewedAt: editingAssumption?.reviewedAt,
      linkedPatternId: editingAssumption?.linkedPatternId,
      linkedExperimentId: editingAssumption?.linkedExperimentId,
    };

    if (editingAssumption) {
      await updateAssumption(editingAssumption.id, payload);
    } else {
      await createAssumption(payload);
    }

    setFormState(initialFormState);
    setEditingAssumption(null);
    setShowModal(false);
  };

  const openNewAssumption = (starter?: { statement: string; type: AssumptionType; notes: string }) => {
    setEditingAssumption(null);
    setFormState({
      ...initialFormState,
      statement: starter?.statement || '',
      type: starter?.type || AssumptionType.DESIRABILITY,
      notes: starter?.notes || '',
    });
    setShowModal(true);
  };

  const handleEdit = (assumption: Assumption) => {
    setEditingAssumption(assumption);
    setFormState({
      statement: assumption.statement,
      type: assumption.type,
      importanceScore: assumption.importanceScore,
      evidenceScore: assumption.evidenceScore,
      notes: assumption.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this mapped assumption?')) {
      await deleteAssumption(id);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading assumption mapper...</div>;
  }

  if (!selectedCompany) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <Lightbulb className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Start with a founder company first.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Register a company in your founder workspace before mapping risky assumptions.
        </p>
        <Link
          to={getRoleScopedPath(profile?.role)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Back to Builder workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
          Builder Discovery Setup
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Assumption Mapper</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Turn the problem, canvas, and early adopter into risky beliefs you need discovery to pressure-test. This is not proof yet. It is the map for what the next conversations must help you learn.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => openNewAssumption()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New assumption
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">Early Adopter</span>
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="rounded-full bg-sky-900 px-3 py-1 text-white">Assumption Mapper</span>
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">Interview Guide</span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-700">
              Ask one question clearly: what belief would break this direction if discovery shows it is wrong?
            </p>
          </div>
          <Link
            to={getRoleScopedPath(profile?.role, 'early-adopter')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
          >
            Back to Early Adopter
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Starter risks from your Builder setup</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use these as a starting point, then rewrite them until they sound like real beliefs that discovery could confirm or break.
          </p>
          <div className="mt-5 space-y-4">
            {starterAssumptions.map((assumption) => (
              <div key={assumption.statement} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 ring-1 ring-slate-200">
                      {assumption.type}
                    </span>
                    <p className="text-base font-semibold text-slate-950">{assumption.statement}</p>
                    <p className="text-sm leading-6 text-slate-600">{assumption.notes}</p>
                  </div>
                  <button
                    onClick={() => openNewAssumption(assumption)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
                  >
                    <Plus className="h-4 w-4" />
                    Draft from this
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Weakest assumption right now</p>
            <p className="mt-3 text-lg font-semibold text-rose-950">
              {weakestAssumption?.statement || 'No assumption mapped yet'}
            </p>
            <p className="mt-2 text-sm text-rose-900/80">
              {weakestAssumption
                ? weakestAssumption.notes || 'Use this as the main learning target for your first interviews.'
                : 'Map at least one risky belief before writing discovery questions.'}
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Founder prompts</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              <p>What belief is doing the most work in this idea right now?</p>
              <p>What would discovery need to show before you stopped believing it?</p>
              <p>Which assumption should shape the first interview guide?</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              <p>These are pre-evidence assumptions, not claims that the market already agrees.</p>
              <p>Do not turn assumptions into readiness, traction, or investor proof.</p>
              <p>Use the interview guide next so discovery questions are tied to the real risks.</p>
            </div>
            <Link
              to={getRoleScopedPath(profile?.role, 'interview-guide')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
            >
              Continue to Interview Guide Builder
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Mapped assumptions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep the list short and important. These should guide discovery, not become a giant backlog.
            </p>
          </div>
        </div>

        {assumptions.length > 0 ? (
          <div className="mt-6 space-y-4">
            {assumptions
              .slice()
              .sort((left, right) => right.priorityScore - left.priorityScore || right.importanceScore - left.importanceScore)
              .map((assumption) => (
                <article key={assumption.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-950">{assumption.statement}</p>
                        <span className={statusClass(assumption.status)}>{assumption.status}</span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type</p>
                          <p className="mt-1 text-sm text-slate-700">{assumption.type}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</p>
                          <p className="mt-1 text-sm text-slate-700">
                            Importance {assumption.importanceScore}/10, evidence {assumption.evidenceScore}/10
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why this matters</p>
                          <p className="mt-1 text-sm text-slate-700">{assumption.notes || 'This risk still needs sharper learning language.'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(assumption)}
                        className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-900"
                        title="Edit assumption"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(assumption.id)}
                        className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-700"
                        title="Delete assumption"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-950">No assumptions mapped yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Start with one belief that discovery could prove wrong quickly.
            </p>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {editingAssumption ? 'Edit mapped assumption' : 'Add mapped assumption'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep the statement sharp enough that discovery could prove it wrong.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingAssumption(null);
                  setFormState(initialFormState);
                }}
                className="rounded-full border border-slate-300 p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Assumption statement</label>
                <textarea
                  required
                  rows={3}
                  value={formState.statement}
                  onChange={(event) => setFormState({ ...formState, statement: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  placeholder="We believe this early adopter feels the problem strongly enough to look for a better way."
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Assumption type</label>
                  <select
                    value={formState.type}
                    onChange={(event) => setFormState({ ...formState, type: event.target.value as AssumptionType })}
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  >
                    <option value={AssumptionType.DESIRABILITY}>Desirability</option>
                    <option value={AssumptionType.VIABILITY}>Viability</option>
                    <option value={AssumptionType.FEASIBILITY}>Feasibility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Importance (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formState.importanceScore}
                    onChange={(event) => setFormState({ ...formState, importanceScore: parseInt(event.target.value, 10) })}
                    className="mt-3 w-full accent-slate-900"
                  />
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Low</span>
                    <span className="font-semibold text-slate-900">{formState.importanceScore}</span>
                    <span>Critical</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Current evidence (0-10)</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formState.evidenceScore}
                  onChange={(event) => setFormState({ ...formState, evidenceScore: parseInt(event.target.value, 10) })}
                  className="mt-3 w-full accent-slate-900"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>None</span>
                  <span className="font-semibold text-slate-900">{formState.evidenceScore}</span>
                  <span>Strong</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Why this is still risky / what discovery should help you learn</label>
                <textarea
                  rows={4}
                  value={formState.notes}
                  onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  placeholder="What still needs proof before this belief can stop driving decisions?"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAssumption(null);
                    setFormState(initialFormState);
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Save assumption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssumptionMapper;
