import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Users2 } from 'lucide-react';
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

const EarlyAdopterSelector: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [foundation, setFoundation] = useState<BuilderFoundation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [formState, setFormState] = useState(() => ({
    segmentName: '',
    personaLabel: '',
    situation: '',
    currentBehavior: '',
    whyThisGroupFirst: '',
    reachChannels: '',
    excludedSegments: '',
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
        segmentName: nextFoundation.earlyAdopter.segmentName,
        personaLabel: nextFoundation.earlyAdopter.personaLabel,
        situation: nextFoundation.earlyAdopter.situation,
        currentBehavior: nextFoundation.earlyAdopter.currentBehavior,
        whyThisGroupFirst: nextFoundation.earlyAdopter.whyThisGroupFirst,
        reachChannels: formatBuilderList(nextFoundation.earlyAdopter.reachChannels),
        excludedSegments: formatBuilderList(nextFoundation.earlyAdopter.excludedSegments),
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
          earlyAdopter: {
            segmentName: formState.segmentName.trim(),
            personaLabel: formState.personaLabel.trim(),
            situation: formState.situation.trim(),
            currentBehavior: formState.currentBehavior.trim(),
            whyThisGroupFirst: formState.whyThisGroupFirst.trim(),
            reachChannels: parseBuilderList(formState.reachChannels),
            excludedSegments: parseBuilderList(formState.excludedSegments),
          },
        },
        profile?.personId
      );

      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Unable to save early adopter profile.');
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading early adopter selector...</div>;
  }

  if (!selectedCompany) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <Users2 className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Start with a founder company first.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Register a company in your founder workspace before selecting the primary early adopter.
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Early Adopter Selector</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Choose the primary early adopter you should learn from first. This is the person or segment that feels the problem sharply enough to interview, follow up with, and test with earliest.
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

      {!completion.leanCanvasComplete ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          The Lean Canvas is still incomplete. You can draft the primary early adopter now, but make sure the segment, problem, and alternatives are stable enough to support real outreach.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Name the first customer to learn from.</h2>
              <p className="mt-1 text-sm text-slate-500">
                This should be narrow enough that you know where to find them and what problem context to ask about.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              {selectedCompany.name}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Primary segment</span>
              <input
                value={formState.segmentName}
                onChange={(event) => setFormState((current) => ({ ...current, segmentName: event.target.value }))}
                className={inputClass}
                placeholder="Independent dentists, plant managers, local municipalities..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Person or role inside that segment</span>
              <input
                value={formState.personaLabel}
                onChange={(event) => setFormState((current) => ({ ...current, personaLabel: event.target.value }))}
                className={inputClass}
                placeholder="Clinic owner, ops lead, civil engineer, dispatcher..."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">What situation makes this problem urgent for them?</span>
              <textarea
                value={formState.situation}
                onChange={(event) => setFormState((current) => ({ ...current, situation: event.target.value }))}
                className={textAreaClass}
                placeholder="Describe the moment when they actively feel the pain."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">What do they do now in that moment?</span>
              <textarea
                value={formState.currentBehavior}
                onChange={(event) => setFormState((current) => ({ ...current, currentBehavior: event.target.value }))}
                className={textAreaClass}
                placeholder="Capture the current workaround or existing behavior for this specific early adopter."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Why should this group go first?</span>
              <textarea
                value={formState.whyThisGroupFirst}
                onChange={(event) => setFormState((current) => ({ ...current, whyThisGroupFirst: event.target.value }))}
                className={textAreaClass}
                placeholder="Explain why this group feels the pain sooner, more often, or more sharply than everyone else."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Best reach channels</span>
              <textarea
                value={formState.reachChannels}
                onChange={(event) => setFormState((current) => ({ ...current, reachChannels: event.target.value }))}
                className={textAreaClass}
                placeholder="One channel per line: warm intros, LinkedIn, field associations, local groups..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Not-now segments</span>
              <textarea
                value={formState.excludedSegments}
                onChange={(event) => setFormState((current) => ({ ...current, excludedSegments: event.target.value }))}
                className={textAreaClass}
                placeholder="Who is not the first interview target right now?"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save early adopter'}
            </button>
            {saveState === 'saved' ? <span className="text-sm font-medium text-emerald-700">Saved to your Builder workspace.</span> : null}
            {saveState === 'error' ? <span className="text-sm font-medium text-rose-700">{saveError}</span> : null}
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Primary early adopter draft</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-900">Segment:</span> {formState.segmentName || 'Still unnamed.'}</p>
              <p><span className="font-semibold text-slate-900">Role:</span> {formState.personaLabel || 'Still unnamed.'}</p>
              <p><span className="font-semibold text-slate-900">Situation:</span> {formState.situation || 'The trigger moment still needs to be described.'}</p>
              <p><span className="font-semibold text-slate-900">Why first:</span> {formState.whyThisGroupFirst || 'Why this group should go first is still not clear enough.'}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">How this feeds the next founder tools</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Assumption Mapper later</p>
                <p className="mt-1">This profile turns broad market guesses into one specific customer group whose behavior can prove or break the idea.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Interview Guide Builder later</p>
                <p className="mt-1">The trigger moment and current behavior become the first interview guide prompts and follow-up angles.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">Outreach Tracker later</p>
                <p className="mt-1">The reach channels and excluded segments define who to contact first and who to leave out for now.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <li>The primary early adopter is not “everyone who could buy.” Pick the group most likely to feel the problem sharply right now.</li>
              <li>Do not treat reach channels as traction. They are sourcing lanes for interviews, not proof that the market is already moving.</li>
              <li>If the trigger moment is still vague, keep tightening the problem and canvas before you assume the company is discovery-ready.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to={getRoleScopedPath(profile?.role, 'canvas')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ArrowLeft className="h-4 w-4" />
                Back to Lean Canvas Builder
              </Link>
              <Link to={getRoleScopedPath(profile?.role, 'discovery')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Continue to Interview Capture
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EarlyAdopterSelector;
