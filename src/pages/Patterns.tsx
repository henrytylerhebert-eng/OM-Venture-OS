import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Building,
  Edit2,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import {
  createPattern,
  deletePattern,
  getInterviews,
  listPatternsByCompany,
  listPatternsForStaffReview,
  preparePatternWritePayload,
  summarizePatternWidgets,
  updatePattern,
} from '../services/evidenceService';
import { getCompanies } from '../services/companyService';
import { getMentorAssignments } from '../services/mentorService';
import {
  AssignmentStatus,
  Company,
  Interview,
  MentorAssignment,
  Pattern,
  PatternStatus,
  RoleType,
  StageConfidence,
} from '../types';
import { cn } from '../lib/utils';
import { getRoleScopedPath } from '../lib/roleRouting';

interface PatternFormState {
  problemTheme: string;
  numberOfMentions: number;
  averagePainIntensity: number;
  unpromptedMentions: number;
  representativeQuote: string;
  confidence: StageConfidence;
  status: PatternStatus;
  sourceInterviewIds: string[];
  notes: string;
}

interface ThemeSummary {
  theme: string;
  interviewIds: string[];
  interviewCount: number;
  averagePainIntensity: number;
  unpromptedMentions: number;
  representativeQuote: string;
  hasPattern: boolean;
}

interface InterviewEvidenceSummary {
  interviewCount: number;
  averagePainIntensity: number;
  unpromptedMentions: number;
  representativeQuote: string;
  defaultTheme: string;
  cohortParticipationId?: string;
}

interface PatternReviewTableProps {
  title: string;
  description: string;
  patterns: Pattern[];
  companiesById: Record<string, Company>;
  emptyState: string;
  showCompany?: boolean;
}

const initialFormState: PatternFormState = {
  problemTheme: '',
  numberOfMentions: 0,
  averagePainIntensity: 0,
  unpromptedMentions: 0,
  representativeQuote: '',
  confidence: StageConfidence.LOW,
  status: PatternStatus.KEEP,
  sourceInterviewIds: [],
  notes: '',
};

const normalizeThemeKey = (theme: string) => theme.trim().toLowerCase();

const deriveConfidence = (interviewCount: number, averagePainIntensity: number) => {
  if (interviewCount >= 5 || averagePainIntensity >= 4) {
    return StageConfidence.HIGH;
  }
  if (interviewCount >= 3 || averagePainIntensity >= 3) {
    return StageConfidence.MEDIUM;
  }

  return StageConfidence.LOW;
};

const summarizeInterviewEvidence = (interviews: Interview[]): InterviewEvidenceSummary => {
  if (interviews.length === 0) {
    return {
      interviewCount: 0,
      averagePainIntensity: 0,
      unpromptedMentions: 0,
      representativeQuote: '',
      defaultTheme: '',
      cohortParticipationId: undefined,
    };
  }

  const interviewCount = interviews.length;
  const totalPainIntensity = interviews.reduce((sum, interview) => sum + (interview.painIntensity || 0), 0);
  const averagePainIntensity = Number((totalPainIntensity / interviewCount).toFixed(1));
  const unpromptedMentions = interviews.filter((interview) => interview.mentionSpontaneous).length;
  const representativeQuote =
    interviews
      .slice()
      .sort((a, b) => b.painIntensity - a.painIntensity)
      .find((interview) => interview.bestQuote.trim())?.bestQuote || '';

  const themeCounts = interviews.reduce<Record<string, { theme: string; count: number }>>((acc, interview) => {
    const key = normalizeThemeKey(interview.problemTheme);
    if (!key) {
      return acc;
    }
    const existing = acc[key];
    acc[key] = {
      theme: interview.problemTheme,
      count: existing ? existing.count + 1 : 1,
    };
    return acc;
  }, {});

  const defaultTheme =
    Object.values(themeCounts).sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))[0]?.theme || '';
  const cohortParticipationId = interviews.find((interview) => interview.cohortParticipationId)?.cohortParticipationId;

  return {
    interviewCount,
    averagePainIntensity: Number.isFinite(averagePainIntensity) ? averagePainIntensity : 0,
    unpromptedMentions,
    representativeQuote,
    defaultTheme,
    cohortParticipationId,
  };
};

const buildThemeSummaries = (interviews: Interview[], patterns: Pattern[]): ThemeSummary[] => {
  const patternKeys = new Set(patterns.map((pattern) => normalizeThemeKey(pattern.problemTheme)));
  const grouped = new Map<string, Interview[]>();

  interviews.forEach((interview) => {
    const key = normalizeThemeKey(interview.problemTheme || '');
    if (!key) {
      return;
    }

    const existing = grouped.get(key) || [];
    existing.push(interview);
    grouped.set(key, existing);
  });

  return Array.from(grouped.entries())
    .map(([_, themeInterviews]) => {
      const evidence = summarizeInterviewEvidence(themeInterviews);

      return {
        theme: themeInterviews[0].problemTheme,
        interviewIds: themeInterviews.map((interview) => interview.id),
        interviewCount: evidence.interviewCount,
        averagePainIntensity: evidence.averagePainIntensity,
        unpromptedMentions: evidence.unpromptedMentions,
        representativeQuote: evidence.representativeQuote,
        hasPattern: patternKeys.has(normalizeThemeKey(themeInterviews[0].problemTheme)),
      };
    })
    .sort((a, b) => {
      if (a.hasPattern !== b.hasPattern) {
        return a.hasPattern ? 1 : -1;
      }

      if (b.interviewCount !== a.interviewCount) {
        return b.interviewCount - a.interviewCount;
      }

      return b.averagePainIntensity - a.averagePainIntensity;
    });
};

const confidenceClass = (confidence: StageConfidence) =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    confidence === StageConfidence.HIGH && 'bg-emerald-100 text-emerald-700',
    confidence === StageConfidence.MEDIUM && 'bg-amber-100 text-amber-700',
    confidence === StageConfidence.LOW && 'bg-slate-200 text-slate-700'
  );

const statusClass = (status: PatternStatus) =>
  cn(
    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
    status === PatternStatus.KEEP && 'bg-sky-100 text-sky-700',
    status === PatternStatus.NARROW && 'bg-indigo-100 text-indigo-700',
    status === PatternStatus.PIVOT && 'bg-rose-100 text-rose-700'
  );

const getPatternReviewNote = (pattern: Pattern) => {
  if (pattern.status === PatternStatus.PIVOT) {
    return 'This theme is signaling a move-away or major narrowing decision.';
  }
  if (pattern.confidence === StageConfidence.LOW || pattern.numberOfMentions < 3) {
    return 'Evidence is still thin, so staff should pressure-test whether this is repeated truth or noise.';
  }
  if (pattern.averagePainIntensity >= 4 && pattern.unpromptedMentions >= 2) {
    return 'This is a strong repeated pain signal and should shape what gets tested next.';
  }

  return 'Evidence is directionally useful, but still needs sharper synthesis or more repetition.';
};

const PatternReviewTable: React.FC<PatternReviewTableProps> = ({
  title,
  description,
  patterns,
  companiesById,
  emptyState,
  showCompany = false,
}) => (
  <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <Brain className="h-5 w-5 text-amber-500" />
    </div>

    {patterns.length > 0 ? (
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {showCompany && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Company
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Problem Theme
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Evidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Representative Quote
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {patterns.map((pattern) => (
              <tr key={pattern.id} className="align-top">
                {showCompany && (
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">
                    {companiesById[pattern.companyId]?.name || 'Unknown company'}
                  </td>
                )}
                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">{pattern.problemTheme}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {pattern.sourceInterviewIds.length} linked interview{pattern.sourceInterviewIds.length === 1 ? '' : 's'}
                  </p>
                </td>
                <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                  {pattern.numberOfMentions} mentions
                  <br />
                  avg pain {pattern.averagePainIntensity}
                  <br />
                  {pattern.unpromptedMentions} unprompted
                </td>
                <td className="px-4 py-4">
                  <span className={confidenceClass(pattern.confidence)}>{pattern.confidence} confidence</span>
                </td>
                <td className="px-4 py-4">
                  <span className={statusClass(pattern.status)}>{pattern.status}</span>
                </td>
                <td className="px-4 py-4 text-sm italic leading-6 text-slate-500">
                  {pattern.representativeQuote ? `"${pattern.representativeQuote}"` : 'No quote yet'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
        {emptyState}
      </p>
    )}
  </section>
);

const Patterns: React.FC = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === RoleType.OM_STAFF || profile?.role === RoleType.OM_ADMIN;
  const isFounder = profile?.role === RoleType.FOUNDER || profile?.role === RoleType.STARTUP_TEAM;
  const isMentor = profile?.role === RoleType.MENTOR;
  const canEditPatterns = isStaff || isFounder;

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [themeFilter, setThemeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PatternStatus>('all');
  const [formData, setFormData] = useState<PatternFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);

  const accessibleCompanyIds = useMemo(() => new Set(companies.map((company) => company.id)), [companies]);

  useEffect(() => {
    if (!selectedCompanyId) {
      return;
    }

    if (!accessibleCompanyIds.has(selectedCompanyId)) {
      setSelectedCompanyId(isStaff ? '' : companies[0]?.id || '');
    }
  }, [accessibleCompanyIds, companies, isStaff, selectedCompanyId]);

  useEffect(() => {
    if (!isMentor || !profile?.personId) {
      setMentorAssignments([]);
      return undefined;
    }

    const unsubscribe = getMentorAssignments(setMentorAssignments, [where('mentorId', '==', profile.personId)]);
    return () => unsubscribe();
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
    if (!isStaff && !selectedCompanyId) {
      setPatterns([]);
      return undefined;
    }

    if (isStaff && !selectedCompanyId) {
      return listPatternsForStaffReview(setPatterns);
    }

    return listPatternsByCompany(setPatterns, selectedCompanyId);
  }, [isStaff, selectedCompanyId]);

  useEffect(() => {
    if (!isStaff && !selectedCompanyId) {
      setInterviews([]);
      return undefined;
    }

    const companyScope = isStaff && !selectedCompanyId ? undefined : selectedCompanyId;
    return getInterviews(setInterviews, companyScope);
  }, [isStaff, selectedCompanyId]);

  const companiesById = useMemo(
    () =>
      companies.reduce<Record<string, Company>>((acc, company) => {
        acc[company.id] = company;
        return acc;
      }, {}),
    [companies]
  );

  const selectedCompanyPatterns = useMemo(
    () => (selectedCompanyId ? patterns.filter((pattern) => pattern.companyId === selectedCompanyId) : patterns),
    [patterns, selectedCompanyId]
  );

  const selectedCompanyInterviews = useMemo(
    () => (selectedCompanyId ? interviews.filter((interview) => interview.companyId === selectedCompanyId) : interviews),
    [interviews, selectedCompanyId]
  );

  const themeSummaries = useMemo(
    () => buildThemeSummaries(selectedCompanyInterviews, selectedCompanyPatterns),
    [selectedCompanyInterviews, selectedCompanyPatterns]
  );

  const filteredPatterns = useMemo(
    () =>
      selectedCompanyPatterns
        .filter((pattern) => {
          const matchesTheme = !themeFilter || pattern.problemTheme.toLowerCase().includes(themeFilter.toLowerCase());
          const matchesStatus = statusFilter === 'all' || pattern.status === statusFilter;
          return matchesTheme && matchesStatus;
        }),
    [selectedCompanyPatterns, statusFilter, themeFilter]
  );

  const widgetSummary = useMemo(() => summarizePatternWidgets(filteredPatterns), [filteredPatterns]);
  const strongestPattern = widgetSummary.strongestPattern;
  const strongPatternCount = widgetSummary.strongPatternCount;
  const pivotCandidateCount = widgetSummary.pivotCandidateCount;
  const strongestPatterns = widgetSummary.strongestPatterns;
  const weakestPatterns = widgetSummary.weakestPatterns;
  const lowConfidencePatterns = widgetSummary.lowConfidencePatterns;
  const pivotPatterns = widgetSummary.pivotCandidates;
  const unsynthesizedThemes = themeSummaries.filter((theme) => !theme.hasPattern);
  const interviewsMissingTheme = selectedCompanyInterviews.filter((interview) => !interview.problemTheme.trim()).length;
  const interviewsMissingQuote = selectedCompanyInterviews.filter((interview) => !interview.bestQuote.trim()).length;
  const interviewsPath = getRoleScopedPath(profile?.role, 'discovery');

  const selectedSourceInterviews = useMemo(() => {
    const sourceIds = new Set(formData.sourceInterviewIds);
    return selectedCompanyInterviews.filter((interview) => sourceIds.has(interview.id));
  }, [formData.sourceInterviewIds, selectedCompanyInterviews]);

  const selectedSourceEvidence = useMemo(
    () => summarizeInterviewEvidence(selectedSourceInterviews),
    [selectedSourceInterviews]
  );

  const applyEvidenceToForm = (
    interviewIds: string[],
    options?: {
      forceTheme?: string;
      forceQuote?: string;
      forceConfidence?: StageConfidence;
    }
  ) => {
    const uniqueIds = Array.from(new Set(interviewIds));
    const sourceInterviews = selectedCompanyInterviews.filter((interview) => uniqueIds.includes(interview.id));
    const evidence = summarizeInterviewEvidence(sourceInterviews);

    setFormData((current) => ({
      ...current,
      sourceInterviewIds: sourceInterviews.map((interview) => interview.id),
      numberOfMentions: evidence.interviewCount,
      averagePainIntensity: evidence.averagePainIntensity,
      unpromptedMentions: evidence.unpromptedMentions,
      problemTheme: options?.forceTheme ?? (current.problemTheme.trim() || evidence.defaultTheme),
      representativeQuote:
        options?.forceQuote ?? (current.representativeQuote.trim() || evidence.representativeQuote),
      confidence: options?.forceConfidence ?? current.confidence,
    }));
  };

  const openNewPattern = (summary?: ThemeSummary) => {
    setEditingPattern(null);
    setFormError(null);
    setShowAddModal(true);

    if (summary) {
      setFormData({
        ...initialFormState,
        problemTheme: summary.theme,
        numberOfMentions: summary.interviewCount,
        averagePainIntensity: summary.averagePainIntensity,
        unpromptedMentions: summary.unpromptedMentions,
        representativeQuote: summary.representativeQuote,
        confidence: deriveConfidence(summary.interviewCount, summary.averagePainIntensity),
        sourceInterviewIds: summary.interviewIds,
      });
      return;
    }

    setFormData(initialFormState);
  };

  const handleEdit = (pattern: Pattern) => {
    if (!isStaff && !accessibleCompanyIds.has(pattern.companyId)) {
      setFormError('You do not have access to edit patterns for that company.');
      return;
    }

    const fallbackInterviewIds =
      pattern.sourceInterviewIds.length > 0
        ? pattern.sourceInterviewIds
        : selectedCompanyInterviews
            .filter((interview) => normalizeThemeKey(interview.problemTheme) === normalizeThemeKey(pattern.problemTheme))
            .map((interview) => interview.id);

    setEditingPattern(pattern);
    setFormError(null);
    setFormData({
      problemTheme: pattern.problemTheme,
      numberOfMentions: pattern.numberOfMentions,
      averagePainIntensity: pattern.averagePainIntensity,
      unpromptedMentions: pattern.unpromptedMentions,
      representativeQuote: pattern.representativeQuote,
      confidence: pattern.confidence,
      status: pattern.status,
      sourceInterviewIds: fallbackInterviewIds,
      notes: pattern.notes || '',
    });
    setShowAddModal(true);
  };

  const toggleSourceInterview = (interviewId: string) => {
    setFormError(null);
    setFormData((current) => {
      const nextInterviewIds = current.sourceInterviewIds.includes(interviewId)
        ? current.sourceInterviewIds.filter((id) => id !== interviewId)
        : [...current.sourceInterviewIds, interviewId];
      const sourceInterviews = selectedCompanyInterviews.filter((interview) => nextInterviewIds.includes(interview.id));
      const evidence = summarizeInterviewEvidence(sourceInterviews);

      return {
        ...current,
        sourceInterviewIds: sourceInterviews.map((interview) => interview.id),
        numberOfMentions: evidence.interviewCount,
        averagePainIntensity: evidence.averagePainIntensity,
        unpromptedMentions: evidence.unpromptedMentions,
        problemTheme: current.problemTheme.trim() || evidence.defaultTheme,
        representativeQuote: current.representativeQuote.trim() || evidence.representativeQuote,
      };
    });
  };

  const synthesizeFromInterviews = () => {
    const sourceInterviews =
      formData.sourceInterviewIds.length > 0
        ? selectedSourceInterviews
        : selectedCompanyInterviews.filter(
            (interview) => normalizeThemeKey(interview.problemTheme) === normalizeThemeKey(formData.problemTheme)
          );

    if (sourceInterviews.length === 0) {
      setFormError('Link at least one interview or choose a matching interview theme before recalculating.');
      return;
    }

    const evidence = summarizeInterviewEvidence(sourceInterviews);
    setFormError(null);
    applyEvidenceToForm(sourceInterviews.map((interview) => interview.id), {
      forceTheme: formData.problemTheme.trim() || evidence.defaultTheme,
      forceQuote: evidence.representativeQuote || formData.representativeQuote.trim(),
      forceConfidence: deriveConfidence(evidence.interviewCount, evidence.averagePainIntensity),
    });
  };

  const handleSavePattern = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId || !profile?.personId || !canEditPatterns) {
      return;
    }

    if (!isStaff && !accessibleCompanyIds.has(selectedCompanyId)) {
      setFormError('You do not have access to save a pattern for that company.');
      return;
    }

    const normalizedTheme = formData.problemTheme.trim();
    if (!normalizedTheme) {
      setFormError('Problem theme is required.');
      return;
    }

    if (!Object.values(StageConfidence).includes(formData.confidence)) {
      setFormError('Confidence must be explicitly set to low, medium, or high.');
      return;
    }

    if (!Object.values(PatternStatus).includes(formData.status)) {
      setFormError('Strategic status must be keep, narrow, or pivot.');
      return;
    }

    const uniqueSourceIds = Array.from(new Set(formData.sourceInterviewIds));
    const sourceInterviews = selectedCompanyInterviews.filter((interview) => uniqueSourceIds.includes(interview.id));
    if (sourceInterviews.length === 0) {
      setFormError('Patterns must link back to at least one interview.');
      return;
    }

    if (sourceInterviews.length !== uniqueSourceIds.length) {
      setFormError('One or more linked interviews no longer exist for this company. Refresh the source links before saving.');
      return;
    }

    const evidence = summarizeInterviewEvidence(sourceInterviews);
    if (!Number.isFinite(evidence.averagePainIntensity)) {
      setFormError('Average pain intensity could not be calculated from the linked interviews.');
      return;
    }

    const representativeQuote = formData.representativeQuote.trim();
    const isStrongPattern =
      formData.confidence === StageConfidence.HIGH ||
      evidence.interviewCount >= 5 ||
      evidence.averagePainIntensity >= 4;

    if (isStrongPattern && !representativeQuote) {
      setFormError('Strong patterns must include a representative quote from the linked interviews.');
      return;
    }

    const timestamp = new Date().toISOString();
    let patternData: Omit<Pattern, 'id'>;
    try {
      patternData = preparePatternWritePayload(
        {
          companyId: selectedCompanyId,
          cohortParticipationId: evidence.cohortParticipationId,
          problemTheme: normalizedTheme,
          numberOfMentions: evidence.interviewCount,
          averagePainIntensity: evidence.averagePainIntensity,
          unpromptedMentions: evidence.unpromptedMentions,
          representativeQuote,
          confidence: formData.confidence,
          status: formData.status,
          sourceInterviewIds: sourceInterviews.map((interview) => interview.id),
          notes: formData.notes.trim() || undefined,
          createdAt: editingPattern?.createdAt || timestamp,
          updatedAt: timestamp,
          createdByPersonId: editingPattern?.createdByPersonId || profile.personId,
        },
        {
          validInterviewIds: selectedCompanyInterviews.map((interview) => interview.id),
        }
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Pattern validation failed.');
      return;
    }

    if (editingPattern) {
      await updatePattern(editingPattern.id, patternData);
    } else {
      await createPattern(patternData);
    }

    setFormError(null);
    setFormData(initialFormState);
    setEditingPattern(null);
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    const pattern = patterns.find((entry) => entry.id === id);
    if (!canEditPatterns || (!isStaff && pattern && !accessibleCompanyIds.has(pattern.companyId))) {
      return;
    }

    if (window.confirm('Delete this pattern? This removes the synthesis record, not the interviews underneath it.')) {
      await deletePattern(id);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading pattern synthesis...</div>;
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
          {isStaff ? 'OM Pattern Review' : isMentor ? 'Mentor Pattern Readout' : 'Builder Pattern Synthesis'}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {isStaff
                ? 'Review repeated truth, not loose notes.'
                : isMentor
                  ? 'See the problem themes behind the founder story.'
                  : 'Turn interviews into repeated truth.'}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {isStaff
                ? 'Use patterns to see which themes are strong enough to trust, which ones still look weak, which ones are low-confidence, and where a founder may need to narrow or pivot.'
                : isMentor
                  ? 'This is a read-only synthesis layer for assigned companies so mentor guidance can attach to repeated signals instead of one-off anecdotes.'
                  : 'Patterns should summarize repeated customer truth from interviews, not become another note field. Every pattern should stay linked to the interviews underneath it.'}
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
                <option value="">{isStaff ? 'All companies' : 'Select company'}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <Link
              to={interviewsPath}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
            >
              Review Interviews
              <ArrowRight className="h-4 w-4" />
            </Link>
            {canEditPatterns && (
              <button
                onClick={() => openNewPattern()}
                disabled={!selectedCompanyId}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                New Pattern
              </button>
            )}
          </div>
        </div>
      </header>

      {companies.length === 0 && (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Brain className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-950">No company context is available here yet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isStaff
              ? 'Once companies are loaded into the operating system, pattern synthesis will appear here.'
              : isMentor
                ? 'Pattern review opens after OM assigns you to a founder company.'
                : 'Pattern synthesis opens after your company is connected to this workspace.'}
          </p>
        </section>
      )}

      {selectedCompanyId && (interviewsMissingTheme > 0 || interviewsMissingQuote > 0 || unsynthesizedThemes.length > 0) && (
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-950">Discovery needs one quick quality pass before synthesis is complete.</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900/80">
                Patterns are only as good as the interview inputs behind them. Clean up missing themes, missing quotes,
                and unsynthesized repeated signals before you move on to assumptions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {interviewsMissingTheme > 0 && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                    {interviewsMissingTheme} interview{interviewsMissingTheme === 1 ? '' : 's'} missing a problem theme
                  </span>
                )}
                {interviewsMissingQuote > 0 && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                    {interviewsMissingQuote} interview{interviewsMissingQuote === 1 ? '' : 's'} missing a best quote
                  </span>
                )}
                {unsynthesizedThemes.length > 0 && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                    {unsynthesizedThemes.length} repeated theme{unsynthesizedThemes.length === 1 ? '' : 's'} not yet synthesized
                  </span>
                )}
              </div>
            </div>
            <AlertCircle className="mt-1 h-5 w-5 text-amber-700" />
          </div>
        </section>
      )}

      {selectedCompanyId && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Strongest Pattern</p>
            {strongestPattern ? (
              <>
                <p className="mt-3 text-xl font-semibold text-slate-950">{strongestPattern.problemTheme}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {strongestPattern.numberOfMentions} mentions, avg pain {strongestPattern.averagePainIntensity},{' '}
                  {strongestPattern.unpromptedMentions} unprompted
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No pattern is synthesized yet.</p>
            )}
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Strong Patterns</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-950">{strongPatternCount}</p>
            <p className="mt-2 text-sm text-emerald-900/80">Themes with enough repetition, pain, or confidence to shape next decisions.</p>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Pivot Candidates</p>
            <p className="mt-3 text-3xl font-semibold text-rose-950">{pivotCandidateCount}</p>
            <p className="mt-2 text-sm text-rose-900/80">Themes already signaling that the company may need to move away or narrow sharply.</p>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Pattern Filters</h2>
            <p className="mt-1 text-sm text-slate-500">Filter by problem theme and status before reviewing or refining synthesis.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={themeFilter}
                onChange={(event) => setThemeFilter(event.target.value)}
                placeholder="Filter by problem theme"
                className="w-full border-none bg-transparent p-0 text-sm focus:outline-none"
              />
            </label>
            <label className="flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
              <TrendingUp className="mr-2 h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | PatternStatus)}
                className="w-full border-none bg-transparent p-0 text-sm focus:outline-none"
              >
                <option value="all">All statuses</option>
                {Object.values(PatternStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {selectedCompanyId && themeSummaries.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Interview Themes Ready For Synthesis</h2>
              <p className="mt-1 text-sm text-slate-500">These repeated themes came directly from interview records and are ready to become pattern objects.</p>
            </div>
            <Lightbulb className="h-5 w-5 text-sky-500" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {themeSummaries.slice(0, 6).map((summary) => (
              <div key={summary.theme} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{summary.theme}</h3>
                      {summary.hasPattern ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Pattern exists
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                          Needs synthesis
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {summary.interviewCount} interviews, avg pain {summary.averagePainIntensity}, {summary.unpromptedMentions} unprompted mentions
                    </p>
                  </div>
                  {canEditPatterns && (
                    <button
                      onClick={() => openNewPattern(summary)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
                    >
                      {summary.hasPattern ? 'Refine' : 'Create'}
                    </button>
                  )}
                </div>
                {summary.representativeQuote && (
                  <div className="mt-4 rounded-2xl border-l-4 border-sky-400 bg-white p-4">
                    <p className="text-sm italic leading-6 text-slate-700">"{summary.representativeQuote}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {isStaff ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <PatternReviewTable
            title="Strongest Patterns"
            description="Repeated truths with enough pain, repetition, or confidence to shape founder decisions now."
            patterns={strongestPatterns}
            companiesById={companiesById}
            emptyState="No strong patterns match the current filter yet."
            showCompany={!selectedCompanyId}
          />
          <PatternReviewTable
            title="Weakest Patterns"
            description="Thin synthesis that still needs more repetition or sharper proof before it should drive action."
            patterns={weakestPatterns}
            companiesById={companiesById}
            emptyState="No weak patterns match the current filter."
            showCompany={!selectedCompanyId}
          />
          <PatternReviewTable
            title="Low-Confidence Patterns"
            description="Themes that should be pressure-tested before staff treats them as reliable truth."
            patterns={lowConfidencePatterns}
            companiesById={companiesById}
            emptyState="No low-confidence patterns match the current filter."
            showCompany={!selectedCompanyId}
          />
          <PatternReviewTable
            title="Pivot Candidates"
            description="Patterns already marked as move-away or sharp-narrowing candidates."
            patterns={pivotPatterns}
            companiesById={companiesById}
            emptyState="No pivot candidates are marked yet."
            showCompany={!selectedCompanyId}
          />
        </section>
      ) : (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{isMentor ? 'Scoped Pattern Ledger' : 'Pattern Ledger'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isMentor
                  ? 'Review the repeated themes that should shape your mentor guidance.'
                  : 'Capture patterns that are strong enough to shape assumptions, narrowing, or pivot decisions.'}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-sky-500" />
          </div>

          {filteredPatterns.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Problem Theme</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Evidence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Confidence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Representative Quote</th>
                    {canEditPatterns && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredPatterns.map((pattern) => (
                    <tr key={pattern.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">{pattern.problemTheme}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {pattern.sourceInterviewIds.length} linked interview{pattern.sourceInterviewIds.length === 1 ? '' : 's'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                        {pattern.numberOfMentions} mentions
                        <br />
                        avg pain {pattern.averagePainIntensity}
                        <br />
                        {pattern.unpromptedMentions} unprompted
                      </td>
                      <td className="px-4 py-4">
                        <span className={confidenceClass(pattern.confidence)}>{pattern.confidence} confidence</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={statusClass(pattern.status)}>{pattern.status}</span>
                      </td>
                      <td className="px-4 py-4 text-sm italic leading-6 text-slate-500">
                        {pattern.representativeQuote ? `"${pattern.representativeQuote}"` : 'No quote yet'}
                      </td>
                      {canEditPatterns && (
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(pattern)}
                              className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-900"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(pattern.id)}
                              className="rounded-full border border-slate-300 bg-white p-2 text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Brain className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">No patterns synthesized yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                {selectedCompanyId
                  ? 'Use repeated interview themes to create the first pattern records.'
                  : 'Select a company to review or synthesize patterns.'}
              </p>
            </div>
          )}
        </section>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {editingPattern ? 'Refine pattern synthesis' : 'Create pattern from interview evidence'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Patterns should summarize repeated truth from interviews, not replace the interviews themselves.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPattern(null);
                  setFormData(initialFormState);
                  setFormError(null);
                }}
                className="rounded-full border border-slate-300 p-2 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSavePattern} className="space-y-8 p-6">
              {formError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {formError}
                </div>
              )}

              {themeSummaries.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Start From Interviews</h3>
                      <p className="mt-1 text-sm text-slate-500">Choose a repeated theme or link interviews directly to prefill synthesis fields.</p>
                    </div>
                    <button
                      type="button"
                      onClick={synthesizeFromInterviews}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Recalculate
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {themeSummaries.slice(0, 8).map((summary) => (
                      <button
                        key={summary.theme}
                        type="button"
                        onClick={() => openNewPattern(summary)}
                        className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-white"
                      >
                        {summary.theme} · {summary.interviewCount}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Problem Theme</label>
                    <input
                      required
                      type="text"
                      value={formData.problemTheme}
                      onChange={(event) => {
                        setFormError(null);
                        setFormData({ ...formData, problemTheme: event.target.value });
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      placeholder="Manual data entry in HR"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mentions</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{formData.numberOfMentions}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Avg Pain</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{formData.averagePainIntensity}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unprompted</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{formData.unpromptedMentions}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Representative Quote</label>
                    <textarea
                      rows={3}
                      value={formData.representativeQuote}
                      onChange={(event) => {
                        setFormError(null);
                        setFormData({ ...formData, representativeQuote: event.target.value });
                      }}
                      className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      placeholder="The quote that best captures why this problem keeps showing up."
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Confidence</label>
                    <select
                      value={formData.confidence}
                      onChange={(event) => {
                        setFormError(null);
                        setFormData({ ...formData, confidence: event.target.value as StageConfidence });
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                    >
                      {Object.values(StageConfidence).map((value) => (
                        <option key={value} value={value}>
                          {value.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Strategic Status</label>
                    <select
                      value={formData.status}
                      onChange={(event) => {
                        setFormError(null);
                        setFormData({ ...formData, status: event.target.value as PatternStatus });
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                    >
                      {Object.values(PatternStatus).map((value) => (
                        <option key={value} value={value}>
                          {value.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Synthesis Notes</label>
                    <textarea
                      rows={5}
                      value={formData.notes}
                      onChange={(event) => {
                        setFormError(null);
                        setFormData({ ...formData, notes: event.target.value });
                      }}
                      className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      placeholder="Why does this pattern matter, and what should it change about the next assumption or test?"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Linked Interviews</h3>
                    <p className="mt-1 text-sm text-slate-500">Patterns cannot float free. Link the interviews that support this synthesis.</p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {selectedSourceInterviews.length} linked interview{selectedSourceInterviews.length === 1 ? '' : 's'}
                  </div>
                </div>

                {selectedCompanyInterviews.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCompanyInterviews.slice(0, 12).map((interview) => {
                      const checked = formData.sourceInterviewIds.includes(interview.id);
                      return (
                        <label
                          key={interview.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-4 rounded-3xl border p-4 transition-colors',
                            checked ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSourceInterview(interview.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-950">{interview.intervieweeName}</p>
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                {interview.problemTheme || 'Theme missing'}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                pain {interview.painIntensity}
                              </span>
                              {interview.mentionSpontaneous && (
                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                  unprompted
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-slate-500">
                              <span>{interview.interviewDate}</span>
                              <span>{interview.intervieweeSegment}</span>
                              <span>{interview.interviewSource}</span>
                            </div>
                            {interview.bestQuote && (
                              <p className="mt-3 text-sm italic leading-6 text-slate-600">"{interview.bestQuote}"</p>
                            )}
                          </div>
                          <MessageSquare className="mt-1 h-5 w-5 text-slate-300" />
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    No discovery interviews are available for this company yet.
                  </p>
                )}
              </section>

              {selectedSourceInterviews.length > 0 && (
                <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Linked Evidence Snapshot</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mentions</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedSourceEvidence.interviewCount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Avg Pain</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedSourceEvidence.averagePainIntensity}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unprompted</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{selectedSourceEvidence.unpromptedMentions}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Suggested Confidence</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {deriveConfidence(selectedSourceEvidence.interviewCount, selectedSourceEvidence.averagePainIntensity)}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPattern(null);
                    setFormData(initialFormState);
                    setFormError(null);
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  {editingPattern ? 'Update Pattern' : 'Save Pattern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patterns;
