import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArchiveX,
  CheckCircle2,
  FileSearch,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { cn } from '../lib/utils';
import { getCompanies } from '../services/companyService';
import { getPeople } from '../services/mentorService';
import {
  applySourceSubmissionMatch,
  flagSourceSubmissionForManualReview,
  getIngestionReviewQueue,
  getSourceSubmissions,
  markSourceSubmissionAsIgnored,
  markSourceSubmissionAsReadyToNormalize,
  markSourceSubmissionAsUnresolved,
  matchSourceSubmissionCandidates,
} from '../services/sourceIngestionService';
import { buildSourceIntakeReviewRows, summarizeSourceIntakeReviewRows } from '../lib/sourceIntakeInsights';
import {
  Company,
  IngestionReviewItem,
  IngestionReviewReason,
  Person,
  SourceSubmission,
} from '../types';

const displayStateClass = (state: string) =>
  cn(
    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
    state === 'ready_to_normalize' && 'bg-emerald-100 text-emerald-700',
    state === 'normalized' && 'bg-sky-100 text-sky-700',
    state === 'ignored' && 'bg-slate-200 text-slate-700',
    state === 'likely_duplicate' && 'bg-rose-100 text-rose-700',
    state === 'weak_evidence' && 'bg-amber-100 text-amber-700',
    state === 'unresolved' && 'bg-rose-100 text-rose-700',
    state === 'raw_source_evidence' && 'bg-white text-slate-700 border border-slate-200'
  );

const confidenceClass = (confidence: string) =>
  cn(
    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
    confidence === 'high' && 'bg-emerald-100 text-emerald-700',
    confidence === 'medium' && 'bg-amber-100 text-amber-700',
    confidence === 'low' && 'bg-slate-200 text-slate-700',
    confidence === 'unresolved' && 'bg-rose-100 text-rose-700'
  );

const usefulnessClass = (usefulness: string) =>
  cn(
    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
    usefulness === 'useful_evidence' && 'bg-emerald-100 text-emerald-700',
    usefulness === 'weak_evidence' && 'bg-amber-100 text-amber-700',
    usefulness === 'likely_duplicate_noise' && 'bg-rose-100 text-rose-700'
  );

const labelize = (value: string) => value.replace(/_/g, ' ');

const EvidenceIntakeReview: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [submissions, setSubmissions] = useState<SourceSubmission[]>([]);
  const [reviewItems, setReviewItems] = useState<IngestionReviewItem[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [staffNotes, setStaffNotes] = useState('');
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCompanies = getCompanies((nextCompanies) => {
      setCompanies(nextCompanies);
      setLoading(false);
    });
    const unsubPeople = getPeople(setPeople);
    const unsubSubmissions = getSourceSubmissions(setSubmissions);
    const unsubReviewItems = getIngestionReviewQueue(setReviewItems);

    return () => {
      unsubCompanies();
      unsubPeople();
      unsubSubmissions();
      unsubReviewItems();
    };
  }, []);

  const rows = useMemo(
    () =>
      buildSourceIntakeReviewRows({
        submissions,
        reviewItems,
        companies,
        people,
      }),
    [companies, people, reviewItems, submissions]
  );

  const summary = useMemo(() => summarizeSourceIntakeReviewRows(rows), [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSearch =
          row.sourceFormTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.sourceFounderText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.sourceCompanyText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.proposedCompanyMatch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.proposedFounderMatch?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesState = stateFilter === 'all' || row.displayState === stateFilter;
        return matchesSearch && matchesState;
      }),
    [rows, searchTerm, stateFilter]
  );

  useEffect(() => {
    if (!selectedSubmissionId && filteredRows.length > 0) {
      setSelectedSubmissionId(filteredRows[0].id);
    }

    if (selectedSubmissionId && !filteredRows.some((row) => row.id === selectedSubmissionId)) {
      setSelectedSubmissionId(filteredRows[0]?.id || null);
    }
  }, [filteredRows, selectedSubmissionId]);

  const selectedSubmission = submissions.find((submission) => submission.id === selectedSubmissionId) || null;
  const selectedRow = filteredRows.find((row) => row.id === selectedSubmissionId) || rows.find((row) => row.id === selectedSubmissionId) || null;
  const selectedReviewItem = reviewItems.find((item) => item.sourceSubmissionId === selectedSubmissionId) || null;

  useEffect(() => {
    setStaffNotes(selectedRow?.staffNotes || '');
  }, [selectedRow?.id]);

  const handleRefreshMatch = async () => {
    if (!selectedSubmission) {
      return;
    }

    setWorking(true);
    try {
      const matchResult = matchSourceSubmissionCandidates(selectedSubmission, companies, people);
      if (matchResult.ingestionStatus === 'needs_review') {
        await flagSourceSubmissionForManualReview({
          sourceSubmission: selectedSubmission,
          matchResult,
          staffNotes,
          reviewedByPersonId: profile?.personId,
        });
      } else {
        await applySourceSubmissionMatch(selectedSubmission.id, matchResult, profile?.personId, staffNotes);
      }
    } finally {
      setWorking(false);
    }
  };

  const handleMarkUnresolved = async () => {
    if (!selectedSubmission) {
      return;
    }

    setWorking(true);
    try {
      await markSourceSubmissionAsUnresolved(
        selectedSubmission,
        profile?.personId,
        staffNotes,
        selectedReviewItem?.reviewReason || IngestionReviewReason.WEAK_CONTENT
      );
    } finally {
      setWorking(false);
    }
  };

  const handleMarkReady = async () => {
    if (!selectedSubmission) {
      return;
    }

    setWorking(true);
    try {
      await markSourceSubmissionAsReadyToNormalize(selectedSubmission, profile?.personId, staffNotes);
    } finally {
      setWorking(false);
    }
  };

  const handleIgnore = async () => {
    if (!selectedSubmission) {
      return;
    }

    setWorking(true);
    try {
      await markSourceSubmissionAsIgnored(selectedSubmission, profile?.personId, staffNotes);
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading evidence intake review...</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-800">
          OM Staff Evidence Intake
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Review raw source evidence before it becomes venture truth.</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              This staff-only lane is for Jotform-origin discovery evidence. It helps OM decide what came in, who it likely belongs to, whether it is useful evidence or weak duplicate noise, and whether it is ready to normalize into canonical evidence.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Membership status, venture stage, readiness, unlock eligibility, and investor visibility stay separate here.
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Raw Source Evidence</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.total}</p>
          <p className="mt-2 text-sm text-slate-500">Jotform-origin submissions now visible to staff review.</p>
        </div>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Unresolved</p>
          <p className="mt-3 text-3xl font-semibold text-rose-950">{summary.unresolved}</p>
          <p className="mt-2 text-sm text-rose-800/80">Identity or evidence judgment still needs staff resolution.</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Weak Evidence</p>
          <p className="mt-3 text-3xl font-semibold text-amber-950">{summary.weakEvidence}</p>
          <p className="mt-2 text-sm text-amber-800/80">Submissions that may be too thin to normalize safely.</p>
        </div>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Likely Duplicate</p>
          <p className="mt-3 text-3xl font-semibold text-rose-950">{summary.likelyDuplicate}</p>
          <p className="mt-2 text-sm text-rose-800/80">Possible duplicate noise that should not silently enter the vault.</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Ready to Normalize</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-950">{summary.readyToNormalize}</p>
          <p className="mt-2 text-sm text-emerald-800/80">Raw evidence with strong enough identity anchors for canonical review.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Evidence Intake Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Not a generic queue. This is where raw source evidence is judged before normalization.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search form, founder, or company..."
                  className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="all">All states</option>
                <option value="unresolved">Unresolved</option>
                <option value="likely_duplicate">Likely duplicate</option>
                <option value="weak_evidence">Weak evidence</option>
                <option value="ready_to_normalize">Ready to normalize</option>
                <option value="normalized">Normalized</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedSubmissionId(row.id)}
                className={cn(
                  'w-full rounded-3xl border p-5 text-left transition-colors',
                  selectedSubmissionId === row.id
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('font-semibold', selectedSubmissionId === row.id ? 'text-white' : 'text-slate-950')}>
                        {row.sourceFormTitle}
                      </p>
                      <span className={displayStateClass(row.displayState)}>{row.statusLabel}</span>
                      <span className={usefulnessClass(row.evidenceUsefulness)}>{labelize(row.evidenceUsefulness)}</span>
                    </div>
                    <p className={cn('text-sm', selectedSubmissionId === row.id ? 'text-white/80' : 'text-slate-600')}>
                      {row.sourceFounderText || 'Founder text missing'} • {row.sourceCompanyText || 'Company text missing'}
                    </p>
                    <div className={cn('flex flex-wrap gap-2 text-xs', selectedSubmissionId === row.id ? 'text-white/80' : 'text-slate-500')}>
                      <span>{row.submissionTypeLabel}</span>
                      <span>•</span>
                      <span>{row.sourceSubmissionDateLabel}</span>
                    </div>
                  </div>

                  <div className="space-y-2 lg:max-w-xs">
                    <div className="flex flex-wrap gap-2">
                      <span className={confidenceClass(row.matchConfidence)}>
                        {row.matchConfidence}
                      </span>
                    </div>
                    <p className={cn('text-sm leading-6', selectedSubmissionId === row.id ? 'text-white/85' : 'text-slate-600')}>
                      {row.nextAction}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {filteredRows.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                No raw source submissions match the current filters yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedSubmission && selectedRow ? (
            <>
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Source Intake Detail</h2>
                    <p className="mt-1 text-sm text-slate-500">Staff-only detail for one raw Jotform submission.</p>
                  </div>
                  <FileSearch className="h-5 w-5 text-slate-500" />
                </div>

                <div className="mt-6 space-y-5">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Raw Source Evidence</p>
                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-950">Form:</span> {selectedSubmission.sourceFormTitle}</p>
                      <p><span className="font-semibold text-slate-950">Raw import path:</span> {selectedSubmission.sourceImportPath || 'Legacy raw intake record'}</p>
                      <p><span className="font-semibold text-slate-950">Source submission id:</span> {selectedSubmission.sourceSubmissionId}</p>
                      <p><span className="font-semibold text-slate-950">Submission date:</span> {selectedRow.sourceSubmissionDateLabel}</p>
                      <p><span className="font-semibold text-slate-950">Submission type:</span> {selectedRow.submissionTypeLabel}</p>
                      <p><span className="font-semibold text-slate-950">Founder text:</span> {selectedRow.sourceFounderText || 'Missing in source payload'}</p>
                      <p><span className="font-semibold text-slate-950">Company text:</span> {selectedRow.sourceCompanyText || 'Missing in source payload'}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proposed Identity Match</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <p><span className="font-semibold text-slate-950">Company match:</span> {selectedRow.proposedCompanyMatch || 'No safe company match yet'}</p>
                      <p><span className="font-semibold text-slate-950">Founder / person match:</span> {selectedRow.proposedFounderMatch || 'No safe founder match yet'}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={confidenceClass(selectedRow.matchConfidence)}>{selectedRow.matchConfidence}</span>
                        <span className={displayStateClass(selectedRow.displayState)}>{selectedRow.statusLabel}</span>
                        <span className={usefulnessClass(selectedRow.evidenceUsefulness)}>{labelize(selectedRow.evidenceUsefulness)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payload Preview</p>
                    <div className="mt-4 space-y-3">
                      {selectedRow.payloadPreview.length > 0 ? (
                        selectedRow.payloadPreview.map((entry) => (
                          <div key={entry.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{entry.key}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{entry.value}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                          The raw payload is present, but there is no clean preview yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next Staff Action</p>
                    <p className="mt-4 text-sm leading-6 text-slate-700">{selectedRow.nextAction}</p>
                    {selectedRow.actionNeeded && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{selectedRow.actionNeeded}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Staff Notes and Actions</h2>
                    <p className="mt-1 text-sm text-slate-500">Handle ambiguous matches, weak evidence, duplicate noise, or normalization readiness.</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-slate-500" />
                </div>

                <textarea
                  value={staffNotes}
                  onChange={(event) => setStaffNotes(event.target.value)}
                  rows={5}
                  placeholder="Add staff notes about the match, evidence quality, duplication risk, or normalization readiness..."
                  className="mt-5 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                />

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleRefreshMatch}
                    disabled={working}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh proposed match
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkReady}
                    disabled={working}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark ready to normalize
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkUnresolved}
                    disabled={working}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Keep unresolved
                  </button>
                  <button
                    type="button"
                    onClick={handleIgnore}
                    disabled={working}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ArchiveX className="h-4 w-4" />
                    Ignore submission
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-950">No source submission selected</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Raw source evidence will land here once `sourceSubmissions` exists in the vault.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">OM Guardrails</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ['Membership status', 'Program access and membership context from Airtable anchors like Member Companies and Internal Application Review.'],
            ['Venture stage', 'Where the founder actually is in Builder evidence and testing, not where the intake note says they are.'],
            ['Readiness', 'Formal OM staff decision after evidence review, not a raw-source intake status.'],
            ['Unlock eligibility', 'Earned support threshold based on canonical evidence, not a Jotform note alone.'],
            ['Investor visibility', 'Future OM-controlled exposure decision, still separate from raw intake and readiness.'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default EvidenceIntakeReview;
