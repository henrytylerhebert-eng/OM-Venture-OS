import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import { getAssumptions } from '../services/evidenceService';
import { getBuilderFoundation, upsertBuilderFoundation } from '../services/builderFoundationService';
import {
  createEmptyBuilderFoundation,
  formatBuilderList,
  getBuilderFoundationCompletion,
  parseBuilderList,
} from '../lib/builderFoundation';
import { type Assumption, AssumptionStatus, type BuilderFoundation, type Company } from '../types';
import { getRoleScopedPath } from '../lib/roleRouting';

const textAreaClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none min-h-[120px] resize-y';
const inputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const InterviewGuideBuilder: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [builderFoundation, setBuilderFoundation] = useState<BuilderFoundation | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [formState, setFormState] = useState(() => ({
    targetSegment: '',
    primaryLearningGoal: '',
    assumptionIds: [] as string[],
    openingQuestions: '',
    problemQuestions: '',
    currentBehaviorQuestions: '',
    alternativeQuestions: '',
    closingQuestions: '',
    successSignalsToListenFor: '',
  }));

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
      const nextFoundation = record || createEmptyBuilderFoundation(selectedCompanyId);
      setBuilderFoundation(nextFoundation);
      setFormState({
        targetSegment: nextFoundation.interviewGuide.targetSegment || nextFoundation.earlyAdopter.segmentName,
        primaryLearningGoal:
          nextFoundation.interviewGuide.primaryLearningGoal ||
          (nextFoundation.ideaToProblem.problemOwner
            ? `Learn whether ${nextFoundation.ideaToProblem.problemOwner} really feels the problem strongly enough to change behavior.`
            : ''),
        assumptionIds: nextFoundation.interviewGuide.assumptionIds,
        openingQuestions: formatBuilderList(nextFoundation.interviewGuide.openingQuestions),
        problemQuestions: formatBuilderList(nextFoundation.interviewGuide.problemQuestions),
        currentBehaviorQuestions: formatBuilderList(nextFoundation.interviewGuide.currentBehaviorQuestions),
        alternativeQuestions: formatBuilderList(nextFoundation.interviewGuide.alternativeQuestions),
        closingQuestions: formatBuilderList(nextFoundation.interviewGuide.closingQuestions),
        successSignalsToListenFor: formatBuilderList(nextFoundation.interviewGuide.successSignalsToListenFor),
      });
    });
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);

    return () => {
      unsubFoundation();
      unsubAssumptions();
    };
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const completion = useMemo(() => getBuilderFoundationCompletion(builderFoundation), [builderFoundation]);

  const activeAssumptions = useMemo(
    () =>
      assumptions
        .filter((assumption) => assumption.status !== AssumptionStatus.VALIDATED)
        .sort((left, right) => right.priorityScore - left.priorityScore || right.importanceScore - left.importanceScore),
    [assumptions]
  );
  const weakestAssumption = activeAssumptions[0];
  const parsedGuide = useMemo(
    () => ({
      targetSegment: formState.targetSegment.trim(),
      primaryLearningGoal: formState.primaryLearningGoal.trim(),
      assumptionIds: formState.assumptionIds,
      openingQuestions: parseBuilderList(formState.openingQuestions),
      problemQuestions: parseBuilderList(formState.problemQuestions),
      currentBehaviorQuestions: parseBuilderList(formState.currentBehaviorQuestions),
      alternativeQuestions: parseBuilderList(formState.alternativeQuestions),
      closingQuestions: parseBuilderList(formState.closingQuestions),
      successSignalsToListenFor: parseBuilderList(formState.successSignalsToListenFor),
    }),
    [formState]
  );
  const selectedAssumptions = useMemo(
    () => activeAssumptions.filter((assumption) => parsedGuide.assumptionIds.includes(assumption.id)),
    [activeAssumptions, parsedGuide.assumptionIds]
  );

  useEffect(() => {
    if (!weakestAssumption) {
      return;
    }

    setFormState((current) =>
      current.assumptionIds.length > 0
        ? current
        : {
            ...current,
            assumptionIds: [weakestAssumption.id],
          }
    );
  }, [weakestAssumption]);

  const handleToggleAssumption = (assumptionId: string) => {
    setFormState((current) => ({
      ...current,
      assumptionIds: current.assumptionIds.includes(assumptionId)
        ? current.assumptionIds.filter((id) => id !== assumptionId)
        : [...current.assumptionIds, assumptionId],
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      return;
    }

    setSaveState('saving');
    setSaveError('');

    if (
      !parsedGuide.targetSegment ||
      !parsedGuide.primaryLearningGoal ||
      parsedGuide.assumptionIds.length === 0 ||
      parsedGuide.openingQuestions.length === 0 ||
      parsedGuide.problemQuestions.length === 0 ||
      parsedGuide.currentBehaviorQuestions.length === 0 ||
      parsedGuide.closingQuestions.length === 0
    ) {
      setSaveState('error');
      setSaveError(
        'Name the target segment and learning goal, link at least one risky assumption, and write the core question sets before saving.'
      );
      return;
    }

    try {
      await upsertBuilderFoundation(
        selectedCompanyId,
        {
          interviewGuide: {
            targetSegment: parsedGuide.targetSegment,
            primaryLearningGoal: parsedGuide.primaryLearningGoal,
            assumptionIds: parsedGuide.assumptionIds,
            openingQuestions: parsedGuide.openingQuestions,
            problemQuestions: parsedGuide.problemQuestions,
            currentBehaviorQuestions: parsedGuide.currentBehaviorQuestions,
            alternativeQuestions: parsedGuide.alternativeQuestions,
            closingQuestions: parsedGuide.closingQuestions,
            successSignalsToListenFor: parsedGuide.successSignalsToListenFor,
          },
        },
        profile?.personId
      );

      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Unable to save interview guide.');
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading interview guide builder...</div>;
  }

  if (!selectedCompany) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <FileText className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Start with a founder company first.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Register a company in your founder workspace before building an interview guide.
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Interview Guide Builder</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Turn your mapped risks into a real customer conversation guide. The guide should help you learn, not pitch, sell, or defend the idea.
            </p>
          </div>
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
        </div>
      </header>

      {!activeAssumptions.length ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          The assumption map is still empty. You can draft a guide now, but it will only become a real discovery guide once at least one risky belief is ranked clearly.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Build the conversation around what you need to learn.</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use one line per question. Keep the guide grounded in the early adopter and the riskiest assumptions.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              {selectedCompany.name}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Target segment for this guide</span>
              <input
                value={formState.targetSegment}
                onChange={(event) => setFormState((current) => ({ ...current, targetSegment: event.target.value }))}
                className={inputClass}
                placeholder="Who are you interviewing first?"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Primary learning goal</span>
              <input
                value={formState.primaryLearningGoal}
                onChange={(event) => setFormState((current) => ({ ...current, primaryLearningGoal: event.target.value }))}
                className={inputClass}
                placeholder="What should these interviews help you learn?"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Opening questions</span>
              <textarea
                value={formState.openingQuestions}
                onChange={(event) => setFormState((current) => ({ ...current, openingQuestions: event.target.value }))}
                className={textAreaClass}
                placeholder="Warm-up questions that help the customer talk about their real context."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Problem questions</span>
              <textarea
                value={formState.problemQuestions}
                onChange={(event) => setFormState((current) => ({ ...current, problemQuestions: event.target.value }))}
                className={textAreaClass}
                placeholder="Questions that help you hear the problem in their words."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Current behavior questions</span>
              <textarea
                value={formState.currentBehaviorQuestions}
                onChange={(event) => setFormState((current) => ({ ...current, currentBehaviorQuestions: event.target.value }))}
                className={textAreaClass}
                placeholder="Questions about what they do now and why."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Alternative questions</span>
              <textarea
                value={formState.alternativeQuestions}
                onChange={(event) => setFormState((current) => ({ ...current, alternativeQuestions: event.target.value }))}
                className={textAreaClass}
                placeholder="Questions about workarounds, tools, or substitutes."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Closing questions</span>
              <textarea
                value={formState.closingQuestions}
                onChange={(event) => setFormState((current) => ({ ...current, closingQuestions: event.target.value }))}
                className={textAreaClass}
                placeholder="Questions that help you understand urgency, follow-up, and next steps."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Signals to listen for</span>
              <textarea
                value={formState.successSignalsToListenFor}
                onChange={(event) => setFormState((current) => ({ ...current, successSignalsToListenFor: event.target.value }))}
                className={textAreaClass}
                placeholder="What would make you count this as a strong discovery signal?"
              />
            </label>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900">Assumptions this guide should pressure-test</p>
            <div className="mt-3 space-y-3">
              {activeAssumptions.length > 0 ? (
                activeAssumptions.map((assumption) => (
                  <label key={assumption.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={formState.assumptionIds.includes(assumption.id)}
                      onChange={() => handleToggleAssumption(assumption.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{assumption.statement}</p>
                      <p className="mt-1 text-sm text-slate-600">{assumption.notes || 'This risk still needs a sharper learning target.'}</p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No assumptions are mapped yet. Go back one step and name the risky beliefs first.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save interview guide'}
            </button>
            {saveState === 'saved' ? <span className="text-sm font-medium text-emerald-700">Saved to your Builder workspace.</span> : null}
            {saveState === 'error' ? <span className="text-sm font-medium text-rose-700">{saveError}</span> : null}
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Weakest Assumption Now</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-900">Risk:</span> {weakestAssumption?.statement || 'Still not ranked yet.'}</p>
              <p><span className="font-semibold text-slate-900">Type:</span> {weakestAssumption?.type || 'Name the first risky belief.'}</p>
              <p><span className="font-semibold text-slate-900">Why it matters:</span> {weakestAssumption?.notes || 'Use the assumption map to explain what discovery still needs to learn.'}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Guide check</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-900">Target segment:</span> {parsedGuide.targetSegment || 'Still not named.'}</p>
              <p><span className="font-semibold text-slate-900">Learning goal:</span> {parsedGuide.primaryLearningGoal || 'Still not clear enough.'}</p>
              <p>
                <span className="font-semibold text-slate-900">Mapped risks in play:</span>{' '}
                {selectedAssumptions.length > 0
                  ? selectedAssumptions.map((assumption) => assumption.statement).join(' • ')
                  : 'No assumptions linked yet.'}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              <p>Ask about real past behavior, not hypothetical future praise.</p>
              <p>Do not let this become a pitch script. It is a learning guide.</p>
              <p>Keep the guide tied to the risky assumptions you actually need discovery to pressure-test.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to={getRoleScopedPath(profile?.role, 'assumptions')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ArrowLeft className="h-4 w-4" />
                Back to Assumption Mapper
              </Link>
              <Link to={getRoleScopedPath(profile?.role, 'outreach')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Continue to Outreach Tracker
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InterviewGuideBuilder;
