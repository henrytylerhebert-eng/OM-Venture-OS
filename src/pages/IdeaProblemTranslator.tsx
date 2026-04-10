import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import { getBuilderFoundation, upsertBuilderFoundation } from '../services/builderFoundationService';
import { createEmptyBuilderFoundation } from '../lib/builderFoundation';
import { type Company } from '../types';
import { getRoleScopedPath } from '../lib/roleRouting';

const inputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none';
const textAreaClass = `${inputClass} min-h-[120px] resize-y`;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const IdeaProblemTranslator: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [formState, setFormState] = useState(() => ({
    founderIdea: '',
    problemOwner: '',
    problemMoment: '',
    currentBehavior: '',
    currentAlternative: '',
    whyCurrentPathFallsShort: '',
    desiredOutcome: '',
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
      return undefined;
    }

    return getBuilderFoundation(selectedCompanyId, (record) => {
      const nextFoundation = record || createEmptyBuilderFoundation(selectedCompanyId);
      setFormState({
        founderIdea: nextFoundation.ideaToProblem.founderIdea,
        problemOwner: nextFoundation.ideaToProblem.problemOwner,
        problemMoment: nextFoundation.ideaToProblem.problemMoment,
        currentBehavior: nextFoundation.ideaToProblem.currentBehavior,
        currentAlternative: nextFoundation.ideaToProblem.currentAlternative,
        whyCurrentPathFallsShort: nextFoundation.ideaToProblem.whyCurrentPathFallsShort,
        desiredOutcome: nextFoundation.ideaToProblem.desiredOutcome,
      });
    });
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const trimmedIdea = {
    founderIdea: formState.founderIdea.trim(),
    problemOwner: formState.problemOwner.trim(),
    problemMoment: formState.problemMoment.trim(),
    currentBehavior: formState.currentBehavior.trim(),
    currentAlternative: formState.currentAlternative.trim(),
    whyCurrentPathFallsShort: formState.whyCurrentPathFallsShort.trim(),
    desiredOutcome: formState.desiredOutcome.trim(),
  };
  const gateReady = Boolean(
    trimmedIdea.problemOwner &&
      trimmedIdea.problemMoment &&
      trimmedIdea.currentBehavior &&
      trimmedIdea.whyCurrentPathFallsShort
  );

  const translatedProblem = useMemo(() => {
    if (!formState.problemOwner || !formState.problemMoment) {
      return 'Name who has the problem and when it shows up so this step can turn an idea into a usable Builder direction.';
    }

    return `${formState.problemOwner} runs into this when ${formState.problemMoment}. Right now they ${formState.currentBehavior || 'follow a workaround that still needs to be named'}. That falls short because ${formState.whyCurrentPathFallsShort || 'the weakness in the current path is still not clear enough yet'}.`;
  }, [formState]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      return;
    }

    setSaveState('saving');
    setSaveError('');

    if (!gateReady) {
      setSaveState('error');
      setSaveError('Name who has the problem, when it shows up, what they do now, and why the current path falls short before saving.');
      return;
    }

    try {
      await upsertBuilderFoundation(
        selectedCompanyId,
        {
          ideaToProblem: {
            founderIdea: trimmedIdea.founderIdea,
            problemOwner: trimmedIdea.problemOwner,
            problemMoment: trimmedIdea.problemMoment,
            currentBehavior: trimmedIdea.currentBehavior,
            currentAlternative: trimmedIdea.currentAlternative,
            whyCurrentPathFallsShort: trimmedIdea.whyCurrentPathFallsShort,
            desiredOutcome: trimmedIdea.desiredOutcome,
          },
        },
        profile?.personId
      );

      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Unable to save Builder problem draft.');
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading Builder problem translator...</div>;
  }

  if (!selectedCompany) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <Target className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Start with a founder company first.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Register a company in your founder workspace before you shape the problem, canvas, and early adopter.
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
          Builder Input Layer
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Idea-to-Problem Translator</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Start Week 1 by translating the founder idea into a clear problem owner, current behavior, weak workaround, and desired outcome. This is clarity work, not evidence yet.
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

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Translate the founder idea into a customer problem.</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep this operational. Name the person, the moment, the current behavior, and why that path is not good enough.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              {selectedCompany.name}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">What are you trying to build?</span>
              <textarea
                value={formState.founderIdea}
                onChange={(event) => setFormState((current) => ({ ...current, founderIdea: event.target.value }))}
                className={textAreaClass}
                placeholder="Describe the founder idea in plain language before translating it into a customer problem."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Who clearly has the problem?</span>
              <input
                value={formState.problemOwner}
                onChange={(event) => setFormState((current) => ({ ...current, problemOwner: event.target.value }))}
                className={inputClass}
                placeholder="Small restaurant owners, local civil engineers, first-time HR leads..."
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">When does the problem show up?</span>
              <input
                value={formState.problemMoment}
                onChange={(event) => setFormState((current) => ({ ...current, problemMoment: event.target.value }))}
                className={inputClass}
                placeholder="When they prepare payroll, mark unsafe roads, onboard a new client..."
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">What do they do now?</span>
              <textarea
                value={formState.currentBehavior}
                onChange={(event) => setFormState((current) => ({ ...current, currentBehavior: event.target.value }))}
                className={textAreaClass}
                placeholder="Describe the current workflow or workaround in real-world terms."
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">What alternative or substitute shows up most often?</span>
              <textarea
                value={formState.currentAlternative}
                onChange={(event) => setFormState((current) => ({ ...current, currentAlternative: event.target.value }))}
                className={textAreaClass}
                placeholder="Spreadsheets, text threads, clipboards, agencies, manual calls..."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Why does the current path fall short?</span>
              <textarea
                value={formState.whyCurrentPathFallsShort}
                onChange={(event) => setFormState((current) => ({ ...current, whyCurrentPathFallsShort: event.target.value }))}
                className={textAreaClass}
                placeholder="Name the wasted time, missed visibility, bad outcomes, or repeated frustration."
                required
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">What better outcome are they trying to reach?</span>
              <textarea
                value={formState.desiredOutcome}
                onChange={(event) => setFormState((current) => ({ ...current, desiredOutcome: event.target.value }))}
                className={textAreaClass}
                placeholder="Describe the result the customer actually wants, not the product feature list."
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save problem draft'}
            </button>
            {saveState === 'saved' ? <span className="text-sm font-medium text-emerald-700">Saved to your Builder workspace.</span> : null}
            {saveState === 'error' ? <span className="text-sm font-medium text-rose-700">{saveError}</span> : null}
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Translated Problem Draft</p>
            <p className="mt-4 text-sm leading-7 text-slate-700">{translatedProblem}</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">Week 1 gate check</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                {gateReady ? 'ready for canvas' : 'still drafting'}
              </span>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Who has the problem</p>
                <p className="mt-1">{trimmedIdea.problemOwner || 'Still unnamed.'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">What they do now</p>
                <p className="mt-1">{trimmedIdea.currentBehavior || 'Current behavior still needs to be described.'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Why the current path falls short</p>
                <p className="mt-1">{trimmedIdea.whyCurrentPathFallsShort || 'The weak workaround is still unclear.'}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                This is still founder input, not customer proof. Real evidence starts once discovery conversations begin.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">How this feeds the next founder tools</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Assumption Mapper later</p>
                <p className="mt-1">The problem owner, weak workaround, and desired outcome become the first risky beliefs to test.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Interview Guide Builder later</p>
                <p className="mt-1">The problem moment and current behavior become the starting prompts for discovery questions.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Outreach Tracker later</p>
                <p className="mt-1">The named problem owner becomes the first target for sourcing interview candidates.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <li>Do not describe the product before you can describe the customer problem in their current workflow.</li>
              <li>Do not treat this as evidence. This is a Week 1 Builder input artifact that prepares later discovery, not proof.</li>
              <li>Keep the language concrete enough that another person could recognize the customer and the moment immediately.</li>
            </ul>
            <Link
              to={getRoleScopedPath(profile?.role, 'canvas')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
            >
              Continue to Lean Canvas Builder
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IdeaProblemTranslator;
