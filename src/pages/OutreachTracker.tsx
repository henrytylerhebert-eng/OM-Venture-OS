import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Send, Trash2 } from 'lucide-react';
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
import {
  type Assumption,
  AssumptionStatus,
  type BuilderFoundation,
  type BuilderOutreachTarget,
  type Company,
  OutreachTargetStatus,
} from '../types';
import { getRoleScopedPath } from '../lib/roleRouting';

const textAreaClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none min-h-[120px] resize-y';
const inputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const createEmptyTarget = (): BuilderOutreachTarget => ({
  label: '',
  roleOrCompany: '',
  outreachChannel: '',
  status: OutreachTargetStatus.TO_CONTACT,
  notes: '',
});

const OutreachTracker: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [builderFoundation, setBuilderFoundation] = useState<BuilderFoundation | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [formState, setFormState] = useState(() => ({
    outreachGoal: '',
    targetCount: 10,
    sourcingChannels: '',
    messageHook: '',
    followUpWindow: '',
    targets: [createEmptyTarget()] as BuilderOutreachTarget[],
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
        outreachGoal:
          nextFoundation.outreachTracker.outreachGoal ||
          (nextFoundation.earlyAdopter.segmentName
            ? `Book discovery conversations with ${nextFoundation.earlyAdopter.segmentName}.`
            : ''),
        targetCount: nextFoundation.outreachTracker.targetCount || 10,
        sourcingChannels: formatBuilderList(
          nextFoundation.outreachTracker.sourcingChannels.length > 0
            ? nextFoundation.outreachTracker.sourcingChannels
            : nextFoundation.earlyAdopter.reachChannels
        ),
        messageHook: nextFoundation.outreachTracker.messageHook,
        followUpWindow: nextFoundation.outreachTracker.followUpWindow,
        targets: nextFoundation.outreachTracker.targets.length > 0 ? nextFoundation.outreachTracker.targets : [createEmptyTarget()],
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
  const primaryAssumption = useMemo(() => {
    const linkedAssumptions = builderFoundation?.interviewGuide.assumptionIds.length
      ? activeAssumptions.filter((assumption) => builderFoundation?.interviewGuide.assumptionIds.includes(assumption.id))
      : [];
    return linkedAssumptions[0] || activeAssumptions[0];
  }, [activeAssumptions, builderFoundation?.interviewGuide.assumptionIds]);
  const parsedSourcingChannels = useMemo(() => parseBuilderList(formState.sourcingChannels), [formState.sourcingChannels]);
  const sanitizedTargets = useMemo(
    () =>
      formState.targets
        .map((target) => ({
          ...target,
          label: target.label.trim(),
          roleOrCompany: target.roleOrCompany.trim(),
          outreachChannel: target.outreachChannel.trim(),
          notes: target.notes.trim(),
        }))
        .filter((target) => target.label || target.roleOrCompany),
    [formState.targets]
  );

  const updateTarget = (index: number, patch: Partial<BuilderOutreachTarget>) => {
    setFormState((current) => ({
      ...current,
      targets: current.targets.map((target, targetIndex) => (targetIndex === index ? { ...target, ...patch } : target)),
    }));
  };

  const addTarget = () => {
    setFormState((current) => ({
      ...current,
      targets: [...current.targets, createEmptyTarget()],
    }));
  };

  const removeTarget = (index: number) => {
    setFormState((current) => ({
      ...current,
      targets: current.targets.length === 1 ? [createEmptyTarget()] : current.targets.filter((_, targetIndex) => targetIndex !== index),
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) {
      return;
    }

    setSaveState('saving');
    setSaveError('');

    if (!formState.outreachGoal.trim() || parsedSourcingChannels.length === 0 || !formState.messageHook.trim() || sanitizedTargets.length === 0) {
      setSaveState('error');
      setSaveError('Name the outreach goal, list real sourcing channels, write the message hook, and add at least one real target before saving.');
      return;
    }

    try {
      await upsertBuilderFoundation(
        selectedCompanyId,
        {
          outreachTracker: {
            outreachGoal: formState.outreachGoal.trim(),
            targetCount: formState.targetCount,
            sourcingChannels: parsedSourcingChannels,
            messageHook: formState.messageHook.trim(),
            followUpWindow: formState.followUpWindow.trim(),
            targets: sanitizedTargets,
          },
        },
        profile?.personId
      );

      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      setSaveError(error instanceof Error ? error.message : 'Unable to save outreach tracker.');
    }
  };

  const scheduledTargets = sanitizedTargets.filter((target) => target.status === OutreachTargetStatus.SCHEDULED).length;
  const contactedTargets = sanitizedTargets.filter((target) => target.status === OutreachTargetStatus.CONTACTED).length;
  const repliedTargets = sanitizedTargets.filter((target) => target.status === OutreachTargetStatus.REPLIED).length;
  const realTargetCount = sanitizedTargets.filter((target) => target.label || target.roleOrCompany).length;

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading outreach tracker...</div>;
  }

  if (!selectedCompany) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <Send className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Start with a founder company first.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Register a company in your founder workspace before tracking outreach.
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Outreach Tracker</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Turn the interview guide into a real sourcing and contact plan. This is still setup work, not evidence. The goal is to get the right conversations booked.
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

      {!completion.interviewGuideComplete ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          The interview guide is still thin. You can start a tracker now, but outreach will be stronger once the learning goal, linked assumptions, and question sets are clear.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <form onSubmit={handleSave} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Track who to reach and where the conversations stand.</h2>
              <p className="mt-1 text-sm text-slate-500">
                This should stay tight and operational. Keep the list focused on the early adopter and the next round of discovery conversations.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
              {selectedCompany.name}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Outreach goal</span>
              <input
                value={formState.outreachGoal}
                onChange={(event) => setFormState((current) => ({ ...current, outreachGoal: event.target.value }))}
                className={inputClass}
                placeholder="What conversations are you trying to book?"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-900">Target conversation count</span>
              <input
                type="number"
                min="1"
                value={formState.targetCount}
                onChange={(event) => setFormState((current) => ({ ...current, targetCount: Math.max(1, parseInt(event.target.value || '1', 10)) }))}
                className={inputClass}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Sourcing channels</span>
              <textarea
                value={formState.sourcingChannels}
                onChange={(event) => setFormState((current) => ({ ...current, sourcingChannels: event.target.value }))}
                className={textAreaClass}
                placeholder="One channel per line: warm intros, LinkedIn, founder network, association list..."
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Message hook</span>
              <textarea
                value={formState.messageHook}
                onChange={(event) => setFormState((current) => ({ ...current, messageHook: event.target.value }))}
                className={textAreaClass}
                placeholder="What is the short honest reason they should take this conversation?"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-900">Follow-up window</span>
              <input
                value={formState.followUpWindow}
                onChange={(event) => setFormState((current) => ({ ...current, followUpWindow: event.target.value }))}
                className={inputClass}
                placeholder="How quickly will you follow up if they do not reply?"
              />
            </label>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Outreach targets</p>
                <p className="mt-1 text-sm text-slate-500">Track real people or target placeholders. Keep the list honest and current.</p>
              </div>
              <button
                type="button"
                onClick={addTarget}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
              >
                <Plus className="h-4 w-4" />
                Add target
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {formState.targets.map((target, index) => (
                <div key={`${index}-${target.label}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">Name or label</span>
                      <input
                        value={target.label}
                        onChange={(event) => updateTarget(index, { label: event.target.value })}
                        className={inputClass}
                        placeholder="Jane Smith or Target 1"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">Role or company</span>
                      <input
                        value={target.roleOrCompany}
                        onChange={(event) => updateTarget(index, { roleOrCompany: event.target.value })}
                        className={inputClass}
                        placeholder="Ops lead at regional clinic"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">Channel</span>
                      <input
                        value={target.outreachChannel}
                        onChange={(event) => updateTarget(index, { outreachChannel: event.target.value })}
                        className={inputClass}
                        placeholder="Warm intro, email, LinkedIn..."
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-900">Status</span>
                      <select
                        value={target.status}
                        onChange={(event) => updateTarget(index, { status: event.target.value as OutreachTargetStatus })}
                        className={inputClass}
                      >
                        <option value={OutreachTargetStatus.TO_CONTACT}>To contact</option>
                        <option value={OutreachTargetStatus.CONTACTED}>Contacted</option>
                        <option value={OutreachTargetStatus.REPLIED}>Replied</option>
                        <option value={OutreachTargetStatus.SCHEDULED}>Scheduled</option>
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-900">Notes</span>
                      <textarea
                        value={target.notes}
                        onChange={(event) => updateTarget(index, { notes: event.target.value })}
                        className={textAreaClass}
                        placeholder="Why this person fits, warm path, follow-up note, or scheduling context..."
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTarget(index)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-rose-300 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove target
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save outreach tracker'}
            </button>
            {saveState === 'saved' ? <span className="text-sm font-medium text-emerald-700">Saved to your Builder workspace.</span> : null}
            {saveState === 'error' ? <span className="text-sm font-medium text-rose-700">{saveError}</span> : null}
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Assumption Under Test</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-900">Risk:</span> {primaryAssumption?.statement || 'Still not chosen yet.'}</p>
              <p><span className="font-semibold text-slate-900">Learning goal:</span> {builderFoundation?.interviewGuide.primaryLearningGoal || 'Use the interview guide to set a clear learning goal first.'}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Tracker check</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p><span className="font-semibold text-slate-900">Goal:</span> {formState.outreachGoal || 'Still not named.'}</p>
              <p><span className="font-semibold text-slate-900">Targets listed:</span> {realTargetCount}</p>
              <p><span className="font-semibold text-slate-900">Pipeline:</span> {contactedTargets} contacted • {repliedTargets} replied • {scheduledTargets} scheduled</p>
              <p><span className="font-semibold text-slate-900">Sourcing lanes:</span> {parsedSourcingChannels.join(' • ') || 'Still not listed.'}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Guardrails</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              <p>This is not traction. It is your discovery sourcing plan.</p>
              <p>Do not let the list turn into a generic CRM. Track only the people you need for the next discovery round.</p>
              <p>The goal is to book conversations that help you test assumptions, not to accumulate contact rows.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to={getRoleScopedPath(profile?.role, 'interview-guide')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ArrowLeft className="h-4 w-4" />
                Back to Interview Guide
              </Link>
              {scheduledTargets > 0 ? (
                <Link to={getRoleScopedPath(profile?.role, 'discovery')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Continue to Interview Capture
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  Book the first interview to make Interview Capture real
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OutreachTracker;
