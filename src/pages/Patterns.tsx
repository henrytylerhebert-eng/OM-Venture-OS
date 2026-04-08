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
  getAssumptions,
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
  Assumption,
  AssumptionStatus,
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

interface RankedInterviewValue {
  label: string;
  count: number;
}

interface PatternDecisionCard {
  pattern: Pattern;
  strongestQuote: string;
  whoFeelsItMost: string;
  currentAlternative: string;
  evidenceStrength: 'repeated' | 'emerging' | 'thin';
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

const rankInterviewValues = (
  interviews: Interview[],
  pickValue: (interview: Interview) => string
): RankedInterviewValue[] =>
  Object.values(
    interviews.reduce<Record<string, RankedInterviewValue>>((acc, interview) => {
      const value = pickValue(interview).trim();
      if (!value) {
        return acc;
      }

      const key = value.toLowerCase();
      acc[key] = {
        label: value,
        count: (acc[key]?.count || 0) + 1,
      };
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

const getPatternSourceInterviews = (pattern: Pattern, interviews: Interview[]) => {
  if (pattern.sourceInterviewIds.length > 0) {
    const sourceIds = new Set(pattern.sourceInterviewIds);
    return interviews.filter((interview) => sourceIds.has(interview.id));
  }

  return interviews.filter(
    (interview) => normalizeThemeKey(interview.problemTheme) === normalizeThemeKey(pattern.problemTheme)
  );
};

const getPatternEvidenceStrength = (pattern: Pattern): PatternDecisionCard['evidenceStrength'] => {
  if (
    pattern.confidence === StageConfidence.HIGH ||
    pattern.numberOfMentions >= 4 ||
    pattern.averagePainIntensity >= 4 ||
    pattern.unpromptedMentions >= 2
  ) {
    return 'repeated';
  }

  if (
    pattern.confidence === StageConfidence.MEDIUM ||
    pattern.numberOfMentions >= 2 ||
    pattern.averagePainIntensity >= 3
  ) {
    return 'emerging';
  }

  return 'thin';
};

const buildPatternDecisionCards = (
  patterns: Pattern[],
  interviews: Interview[]
): PatternDecisionCard[] =>
  patterns
    .slice()
    .sort(
      (a, b) =>
        b.numberOfMentions - a.numberOfMentions ||
        b.averagePainIntensity - a.averagePainIntensity ||
        b.unpromptedMentions - a.unpromptedMentions
    )
    .map((pattern) => {
      const sourceInterviews = getPatternSourceInterviews(pattern, interviews);
      const strongestQuote =
        sourceInterviews.find((interview) => interview.bestQuote.trim())?.bestQuote || pattern.representativeQuote;
      const whoFeelsItMost = rankInterviewValues(sourceInterviews, (interview) => interview.intervieweeSegment)[0]?.label;
      const currentAlternative = rankInterviewValues(
        sourceInterviews,
        (interview) => interview.currentAlternative
      )[0]?.label;

      return {
        pattern,
        strongestQuote,
        whoFeelsItMost: whoFeelsItMost || 'Segment still needs sharper evidence',
        currentAlternative: currentAlternative || 'No clear alternative recorded yet',
        evidenceStrength: getPatternEvidenceStrength(pattern),
      };
    });

const getAssumptionGapLabel = (assumption: Assumption) => {
  if (assumption.notes?.trim()) {
    return assumption.notes.trim();
  }

  if (assumption.status === AssumptionStatus.VALIDATED) {
    return 'This assumption already has enough evidence to move out of the highest-risk stack.';
  }

  if (assumption.evidenceScore <= 2) {
    return 'Very little proof exists yet, so this risk still needs a direct test.';
  }

  if (assumption.evidenceScore <= 5) {
    return 'Some evidence exists, but it is not strong enough to remove the risk.';
  }

  return 'Pressure-test whether the existing evidence is strong enough to keep this out of the next test.';
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
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
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

  useEffect(() => {
    if (!selectedCompanyId) {
      setAssumptions([]);
      return undefined;
    }

    return getAssumptions(setAssumptions, selectedCompanyId);
  }, [selectedCompanyId]);

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
  const overallWidgetSummary = useMemo(
    () => summarizePatternWidgets(selectedCompanyPatterns),
    [selectedCompanyPatterns]
  );
  const strongestPattern = overallWidgetSummary.strongestPattern;
  const strongPatternCount = overallWidgetSummary.strongPatternCount;
  const pivotCandidateCount = overallWidgetSummary.pivotCandidateCount;
  const strongestPatterns = widgetSummary.strongestPatterns;
  const weakestPatterns = widgetSummary.weakestPatterns;
  const lowConfidencePatterns = widgetSummary.lowConfidencePatterns;
  const pivotPatterns = widgetSummary.pivotCandidates;
  const unsynthesizedThemes = themeSummaries.filter((theme) => !theme.hasPattern);
  const interviewsMissingTheme = selectedCompanyInterviews.filter((interview) => !interview.problemTheme.trim()).length;
  const interviewsMissingQuote = selectedCompanyInterviews.filter((interview) => !interview.bestQuote.trim()).length;
  const interviewsPath = getRoleScopedPath(profile?.role, 'discovery');
  const assumptionsPath = getRoleScopedPath(profile?.role, 'assumptions');
  const experimentsPath = getRoleScopedPath(profile?.role, 'experiments');
  const countedInterviewCount = selectedCompanyInterviews.filter((interview) => interview.countsTowardMinimum).length;
  const spontaneousMentionCount = selectedCompanyInterviews.filter((interview) => interview.mentionSpontaneous).length;
  const promptedMentionCount = Math.max(selectedCompanyInterviews.length - spontaneousMentionCount, 0);
  const topSegments = useMemo(
    () => rankInterviewValues(selectedCompanyInterviews, (interview) => interview.intervieweeSegment).slice(0, 3),
    [selectedCompanyInterviews]
  );
  const topAlternatives = useMemo(
    () => rankInterviewValues(selectedCompanyInterviews, (interview) => interview.currentAlternative).slice(0, 3),
    [selectedCompanyInterviews]
  );
  const patternDecisionCards = useMemo(
    () => buildPatternDecisionCards(selectedCompanyPatterns, selectedCompanyInterviews).slice(0, 5),
    [selectedCompanyInterviews, selectedCompanyPatterns]
  );
  const rankedAssumptions = useMemo(
    () =>
      assumptions
        .slice()
        .sort(
          (a, b) =>
            (b.priorityScore || 0) - (a.priorityScore || 0) ||
            (b.importanceScore || 0) - (a.importanceScore || 0) ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [assumptions]
  );
  const weakestAssumption = useMemo(
    () =>
      rankedAssumptions.find((assumption) => assumption.status !== AssumptionStatus.VALIDATED) ||
      rankedAssumptions[0],
    [rankedAssumptions]
  );
  const currentDirectionPattern = useMemo(
    () => strongestPattern || selectedCompanyPatterns[0] || null,
    [selectedCompanyPatterns, strongestPattern]
  );
  const mvpDesignUnlocked = Boolean(currentDirectionPattern && strongPatternCount > 0 && rankedAssumptions.length > 0);

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
          {isStaff ? 'OM Pattern Review' : isMentor ? 'Mentor Pattern Readout' : 'Builder Patterns & Assumptions'}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {isStaff
                ? 'Review repeated truth, not loose notes.'
                : isMentor
                  ? 'See the problem themes behind the founder story.'
                  : 'Patterns & Assumptions'}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {isStaff
                ? 'Use patterns to see which themes are strong enough to trust, which ones still look weak, which ones are low-confidence, and where a founder may need to narrow or pivot.'
                : isMentor
                  ? 'This is a read-only synthesis layer for assigned companies so mentor guidance can attach to repeated signals instead of one-off anecdotes.'
                  : 'This Builder step turns interview evidence into repeated truth, ranked risk, and a clear direction before you move into MVP or test design.'}
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

      {isFounder && selectedCompanyId && (
        <>
          <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">Interview Capture</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="rounded-full bg-sky-900 px-3 py-1 text-white">Patterns &amp; Assumptions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">MVP / Test Design</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Turn interview evidence into usable direction.</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                    You&apos;ve captured interviews. Now turn them into repeated truth. Patterns show what is real in the
                    evidence. Assumptions show what is still risky or unproven before you build the next test.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Progress Rule</p>
                <p className="mt-2 max-w-xs">
                  You cannot move into MVP / Test Design until repeated pain and top assumptions are named.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Evidence Intake Summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Start with the raw interview evidence this synthesis step is built from.
                </p>
              </div>
              <Link
                to={interviewsPath}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
              >
                Review Interview Capture
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Interviews In This Step</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{countedInterviewCount}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Counted interviews feeding this synthesis layer right now.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Who Feels It Most</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{topSegments[0]?.label || 'Segment still needs sharper evidence'}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {topSegments[0] ? `${topSegments[0].count} interviews in the strongest segment cluster.` : 'Add sharper segment labels in Interview Capture.'}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Strongest Repeated Pain</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {strongestPattern?.problemTheme || unsynthesizedThemes[0]?.theme || 'No repeated pain is clear yet'}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {strongestPattern
                    ? `${strongestPattern.numberOfMentions} repeated mentions linked to one synthesized pattern.`
                    : 'Create or refine a pattern before moving into test design.'}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Spontaneous Vs Prompted</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {spontaneousMentionCount} spontaneous / {promptedMentionCount} prompted
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Prompted pain is weaker than pain that keeps surfacing on its own.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What People Do Now</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {topAlternatives[0]?.label || 'No clear alternative recorded yet'}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {topAlternatives[0]
                    ? `${topAlternatives[0].count} interviews named this as the current workaround.`
                    : 'Capture current alternatives in Interview Capture to sharpen test design.'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Pattern Decision Board</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Patterns are evidence-backed observations. Confirm the repeated pains that are strong enough to steer your next move.
                </p>
              </div>
              <Brain className="h-5 w-5 text-sky-500" />
            </div>

            {patternDecisionCards.length > 0 ? (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {patternDecisionCards.map((card) => (
                  <article key={card.pattern.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{card.pattern.problemTheme}</h3>
                      {strongestPattern?.id === card.pattern.id && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                          Strongest Pattern
                        </span>
                      )}
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                          card.evidenceStrength === 'repeated' && 'bg-emerald-100 text-emerald-700',
                          card.evidenceStrength === 'emerging' && 'bg-amber-100 text-amber-700',
                          card.evidenceStrength === 'thin' && 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {card.evidenceStrength}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Who Feels It Most</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{card.whoFeelsItMost}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current Alternative</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{card.currentAlternative}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Evidence</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {card.pattern.numberOfMentions} mentions, {card.pattern.unpromptedMentions} spontaneous
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Direction Call</p>
                        <p className="mt-1 text-sm font-medium capitalize text-slate-900">{card.pattern.status}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border-l-4 border-sky-400 bg-white p-4">
                      <p className="text-sm italic leading-6 text-slate-700">
                        {card.strongestQuote ? `"${card.strongestQuote}"` : 'Add a strong quote from Interview Capture before treating this as repeated truth.'}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <p className="text-sm leading-6 text-slate-600">
                        {card.pattern.notes?.trim() || 'Add a short rationale explaining why this pattern points toward persevering, narrowing, or pivoting.'}
                      </p>
                      {canEditPatterns && (
                        <button
                          onClick={() => handleEdit(card.pattern)}
                          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
                        >
                          Refine
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8">
                <h3 className="text-lg font-semibold text-slate-950">No decision-ready patterns yet</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Auto-generated themes are waiting below. Tighten wording, merge duplicates, and turn repeated pains into
                  real pattern objects before you move on to assumptions.
                </p>
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Assumption Stack</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assumptions are the remaining risks. Use them to name what is still unproven before you design a test.
                  </p>
                </div>
                <Link
                  to={assumptionsPath}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
                >
                  Open Assumption Stack
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {rankedAssumptions.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {rankedAssumptions.slice(0, 3).map((assumption, index) => (
                    <div key={assumption.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">{assumption.statement}</h3>
                        {weakestAssumption?.id === assumption.id && (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                            Weakest Assumption
                          </span>
                        )}
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                          {assumption.type}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                          Priority {assumption.priorityScore}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why This Is Still Risky</p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">{getAssumptionGapLabel(assumption)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What Evidence Exists</p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {assumption.linkedPatternId
                              ? `Linked to ${selectedCompanyPatterns.find((pattern) => pattern.id === assumption.linkedPatternId)?.problemTheme || 'a pattern'} with evidence score ${assumption.evidenceScore}.`
                              : `Current evidence score ${assumption.evidenceScore}. Link this to a pattern when repeated truth is clear.`}
                          </p>
                        </div>
                      </div>
                      {index < rankedAssumptions.slice(0, 3).length - 1 && <div className="mt-4 border-t border-slate-200" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8">
                  <h3 className="text-lg font-semibold text-slate-950">No ranked assumptions yet</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    After patterns are clear, map the risks that would break this direction if they turn out to be wrong.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">Direction Decision</h2>
                <p className="mt-1 text-sm text-slate-500">
                  This is the Builder choice point. Tie the call directly to repeated evidence, not optimism.
                </p>
                <div className="mt-5 space-y-3">
                  {[PatternStatus.KEEP, PatternStatus.NARROW, PatternStatus.PIVOT].map((status) => (
                    <div
                      key={status}
                      className={cn(
                        'rounded-2xl border px-4 py-4',
                        currentDirectionPattern?.status === status
                          ? 'border-slate-900 bg-slate-950 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                        {status === PatternStatus.KEEP
                          ? 'Persevere'
                          : status === PatternStatus.NARROW
                            ? 'Narrow'
                            : 'Pivot'}
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        {status === PatternStatus.KEEP
                          ? 'The same pain and segment are repeating strongly enough to keep moving in this direction.'
                          : status === PatternStatus.NARROW
                            ? 'The pain looks real, but the segment, use case, or workflow needs a tighter focus.'
                            : 'The strongest evidence points away from the current direction and toward a different path.'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current Evidence-Tied Rationale</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {currentDirectionPattern?.notes?.trim() ||
                      'Add a short rationale in the strongest pattern so this decision is anchored to interview evidence, not opinion.'}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">MVP / Test Design Handoff</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The next step should inherit the strongest pain, priority segment, and weakest assumption.
                </p>
                {mvpDesignUnlocked ? (
                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Ready For MVP / Test Design</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-900">
                        Build only what helps you learn whether the weakest assumption is true.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">Pain to design around:</span>{' '}
                      {strongestPattern?.problemTheme || 'No strongest pattern set'}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">Segment to test first:</span>{' '}
                      {topSegments[0]?.label || 'Segment still needs sharper evidence'}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">Assumption to resolve:</span>{' '}
                      {weakestAssumption?.statement || 'No assumption ranked yet'}
                    </div>
                    <Link
                      to={experimentsPath}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Open MVP / Test Design
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <p className="font-semibold text-amber-950">This next step stays locked until synthesis is real.</p>
                    <ul className="mt-3 space-y-2 leading-6">
                      <li>At least one strong pattern must exist.</li>
                      <li>At least one ranked assumption must be named.</li>
                      <li>The current direction must be explicit through a persevere, narrow, or pivot call.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Keep These Distinctions Clean</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                ['Membership status', 'Program participation status only.'],
                ['Venture stage', 'Where the company is in the Builder journey.'],
                ['Readiness', 'OM staff judgment about whether the next step is truly earned.'],
                ['Unlock eligibility', 'What support may open after stronger proof exists.'],
                ['Investor visibility', 'Not active in this step and should not be implied by synthesis alone.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {selectedCompanyId && !isFounder && (
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
                    <label className="block text-sm font-medium text-slate-700">
                      {isFounder ? 'Direction Rationale' : 'Synthesis Notes'}
                    </label>
                    <textarea
                      rows={5}
                      value={formData.notes}
                      onChange={(event) => {
                        setFormError(null);
                        setFormData({ ...formData, notes: event.target.value });
                      }}
                      className="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                      placeholder={
                        isFounder
                          ? 'Why does this evidence point toward persevering, narrowing, or pivoting, and what should it change about the next test?'
                          : 'Why does this pattern matter, and what should it change about the next assumption or test?'
                      }
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
