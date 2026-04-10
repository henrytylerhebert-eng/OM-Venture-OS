import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import { getBuilderFoundation, upsertBuilderFoundation } from '../services/builderFoundationService';
import {
  createEmptyBuilderFoundation,
  formatBuilderList,
  getBuilderFoundationCompletion,
  parseBuilderList,
} from '../lib/builderFoundation';
import { type BuilderFoundation, type Company } from '../types';
import { getRoleScopedPath } from '../lib/roleRouting';

const inputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none';
const textAreaClass = `${inputClass} min-h-[120px] resize-y`;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const LeanCanvasBuilder: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [foundation, setFoundation] = useState<BuilderFoundation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [formState, setFormState] = useState(() => ({
    customerSegments: '',
    problems: '',
    existingAlternatives: '',
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
      setFoundation(null);
      return undefined;
    }

    return getBuilderFoundation(selectedCompanyId, (record) => {
      const nextFoundation = record || createEmptyBuilderFoundation(selectedCompanyId);
      setFoundation(nextFoundation);
      setFormState({
        customerSegments: formatBuilderList(nextFoundation.leanCanvas.customerSegments),
        problems: formatBuilderList(nextFoundation.leanCanvas.problems),
        existingAlternatives: formatBuilderList(nextFoundation.leanCanvas.existingAlternatives),
      });
    });
  }, [selectedCompanyId]);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const completion = useMemo(() => getBuilderFoundationCompletion(foundation), [foundation]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      return;
    }

    setSaveState('saving');
    setSaveError('');

    try {
      await upsertBuilderFoundation(
        selectedCompanyId,
        {
          leanCanvas: {
            customerSegments: parseBuilderList(formState.customerSegments),
            problems: parseBuilderList(formState.problems),
            existingAlternatives: parseBuilderList(formState.existingAlternatives),
          },
        },
        profile?.personId
      );

      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Unable to save Lean Canvas draft.');
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading Lean Canvas builder...</div>;
  }

  if (!selectedCompany) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <LayoutTemplate className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Start with a founder company first.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Register a company in your founder workspace before building the Lean Canvas.
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Lean Canvas Builder</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Keep the Week 1 Lean Canvas narrow. At this stage, focus on customer segments, early adopters, top problems, and existing alternatives before moving into later Builder work.
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

      {!completion.ideaToProblemComplete ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          The Idea-to-Problem step is still thin. You can work here now, but this canvas will be stronger once the problem owner, current behavior, and weak workaround are named clearly.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Build the working model, not a pitch slide.</h2>
              <p className="mt-1 text-sm text-slate-500">
                Use one line per item for the list sections. Keep it plain enough that later assumptions, interview guides, and outreach can reuse it.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              {selectedCompany.name}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Customer segments</span>
              <textarea
                value={formState.customerSegments}
                onChange={(event) => setFormState((current) => ({ ...current, customerSegments: event.target.value }))}
                className={textAreaClass}
                placeholder="One segment per line"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Top problems</span>
              <textarea
                value={formState.problems}
                onChange={(event) => setFormState((current) => ({ ...current, problems: event.target.value }))}
                className={textAreaClass}
                placeholder="What hurts most for this customer?"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Existing alternatives</span>
              <textarea
                value={formState.existingAlternatives}
                onChange={(event) => setFormState((current) => ({ ...current, existingAlternatives: event.target.value }))}
                className={textAreaClass}
                placeholder="Current tools, services, workarounds, or substitutes"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save Lean Canvas'}
            </button>
            {saveState === 'saved' ? <span className="text-sm font-medium text-emerald-700">Saved to your Builder workspace.</span> : null}
            {saveState === 'error' ? <span className="text-sm font-medium text-rose-700">{saveError}</span> : null}
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Working canvas check</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-900">Segments:</span> {foundation?.leanCanvas.customerSegments[0] || 'Still not named clearly yet.'}</p>
              <p><span className="font-semibold text-slate-900">Problem:</span> {foundation?.leanCanvas.problems[0] || 'Still too vague for interviews.'}</p>
              <p><span className="font-semibold text-slate-900">Alternative:</span> {foundation?.leanCanvas.existingAlternatives[0] || 'Current substitute still missing.'}</p>
              <p><span className="font-semibold text-slate-900">Early adopter next:</span> Pick the first customer group that feels this problem most sharply after this canvas is clear.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">How this feeds the next founder tools</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Assumption Mapper later</p>
                <p className="mt-1">Your biggest problems and current alternatives become the first risky beliefs to rank later.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Interview Guide Builder later</p>
                <p className="mt-1">Customer segments, early adopter focus, and problem blocks give the interview guide a real target and context later.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Outreach Tracker later</p>
                <p className="mt-1">The segments you keep and the ones you narrow later become the first sourcing lanes for customer conversations.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <li>This is a Week 1 working model. It should stay narrow enough to revise once real discovery starts.</li>
              <li>Do not turn this into a pitch deck. Focus on segments, top problems, and current alternatives first.</li>
              <li>If the problem or existing alternative is still fuzzy, tighten them before acting like the venture is ready for later Builder steps.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to={getRoleScopedPath(profile?.role, 'problem')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ArrowLeft className="h-4 w-4" />
                Back to Idea-to-Problem
              </Link>
              <Link to={getRoleScopedPath(profile?.role, 'early-adopter')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Continue to Early Adopter Selector
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LeanCanvasBuilder;
