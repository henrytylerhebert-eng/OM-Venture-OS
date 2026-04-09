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
    uniqueValueProposition: '',
    solutionApproach: '',
    channels: '',
    keyMetrics: '',
    revenueStreams: '',
    costStructure: '',
    unfairAdvantage: '',
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
        uniqueValueProposition: nextFoundation.leanCanvas.uniqueValueProposition,
        solutionApproach: formatBuilderList(nextFoundation.leanCanvas.solutionApproach),
        channels: formatBuilderList(nextFoundation.leanCanvas.channels),
        keyMetrics: formatBuilderList(nextFoundation.leanCanvas.keyMetrics),
        revenueStreams: formatBuilderList(nextFoundation.leanCanvas.revenueStreams),
        costStructure: formatBuilderList(nextFoundation.leanCanvas.costStructure),
        unfairAdvantage: nextFoundation.leanCanvas.unfairAdvantage,
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
            uniqueValueProposition: formState.uniqueValueProposition.trim(),
            solutionApproach: parseBuilderList(formState.solutionApproach),
            channels: parseBuilderList(formState.channels),
            keyMetrics: parseBuilderList(formState.keyMetrics),
            revenueStreams: parseBuilderList(formState.revenueStreams),
            costStructure: parseBuilderList(formState.costStructure),
            unfairAdvantage: formState.unfairAdvantage.trim(),
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
              The Lean Canvas is a live Builder artifact. Use it to sharpen the problem, segment, alternative, value promise, and reach path before interviews and tests begin.
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
                Use one line per item for the list sections. Keep it plain enough that later interview prompts and tests can reuse it.
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

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Channels</span>
              <textarea
                value={formState.channels}
                onChange={(event) => setFormState((current) => ({ ...current, channels: event.target.value }))}
                className={textAreaClass}
                placeholder="Where this customer can actually be reached or discovered"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Unique value proposition</span>
              <textarea
                value={formState.uniqueValueProposition}
                onChange={(event) => setFormState((current) => ({ ...current, uniqueValueProposition: event.target.value }))}
                className={textAreaClass}
                placeholder="What makes this path meaningfully better for the customer once the problem is real?"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Solution approach</span>
              <textarea
                value={formState.solutionApproach}
                onChange={(event) => setFormState((current) => ({ ...current, solutionApproach: event.target.value }))}
                className={textAreaClass}
                placeholder="Name the smallest useful solution moves, not a full feature list"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Key metrics to learn from later</span>
              <textarea
                value={formState.keyMetrics}
                onChange={(event) => setFormState((current) => ({ ...current, keyMetrics: event.target.value }))}
                className={textAreaClass}
                placeholder="What will tell you the customer is moving, not just paying attention?"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Revenue streams</span>
              <textarea
                value={formState.revenueStreams}
                onChange={(event) => setFormState((current) => ({ ...current, revenueStreams: event.target.value }))}
                className={textAreaClass}
                placeholder="How value could turn into revenue later"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Cost structure</span>
              <textarea
                value={formState.costStructure}
                onChange={(event) => setFormState((current) => ({ ...current, costStructure: event.target.value }))}
                className={textAreaClass}
                placeholder="What this model depends on operationally or financially"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Unfair advantage</span>
              <textarea
                value={formState.unfairAdvantage}
                onChange={(event) => setFormState((current) => ({ ...current, unfairAdvantage: event.target.value }))}
                className={textAreaClass}
                placeholder="What gives you a real right to win here if the evidence holds up?"
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
              <p><span className="font-semibold text-slate-900">Promise:</span> {foundation?.leanCanvas.uniqueValueProposition || 'Value promise still missing.'}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">How this feeds the next founder tools</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Assumption Mapper later</p>
                <p className="mt-1">Your biggest problems, alternatives, and value promise become the first assumptions to rank.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Interview Guide Builder later</p>
                <p className="mt-1">Customer segments, problem blocks, and channels give the interview guide a real target and context.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Outreach Tracker later</p>
                <p className="mt-1">Channels and segments become the first sourcing lanes for real customer conversations.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <li>This is a working model. Expect to revise it once interviews start surfacing repeated truth.</li>
              <li>Do not turn key metrics into fake traction. Name what you want to learn later, not what you have already proven.</li>
              <li>If the problem, alternative, or channels are still fuzzy, tighten them before acting like the venture is interview-ready.</li>
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
