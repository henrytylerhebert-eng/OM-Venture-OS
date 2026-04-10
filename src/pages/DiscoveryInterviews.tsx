import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { getInterviews, createInterview, updateInterview, deleteInterview, getAssumptions } from '../services/evidenceService';
import { getCompanies } from '../services/companyService';
import { getCohortParticipations } from '../services/cohortService';
import { getBuilderFoundation } from '../services/builderFoundationService';
import { createEmptyBuilderFoundation, getBuilderFoundationCompletion } from '../lib/builderFoundation';
import {
  Interview,
  Company,
  CohortParticipation,
  BuilderFoundation,
  Assumption,
  OutreachTargetStatus,
} from '../types';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Trash2, 
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Quote,
  Edit2,
  Building,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { getRoleScopedPath } from '../lib/roleRouting';

const DiscoveryInterviews: React.FC = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'om_staff' || profile?.role === 'om_admin';
  
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [participations, setParticipations] = useState<CohortParticipation[]>([]);
  const [builderFoundation, setBuilderFoundation] = useState<BuilderFoundation | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Form state
  const initialFormState = {
    intervieweeName: '',
    intervieweeSegment: '',
    interviewSource: '',
    interviewDate: new Date().toISOString().split('T')[0],
    problemTheme: '',
    painIntensity: 3,
    mentionSpontaneous: false,
    currentAlternative: '',
    bestQuote: '',
    followUpNeeded: false,
    notes: '',
    countsTowardMinimum: true
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const unsubCompanies = getCompanies((allCompanies) => {
      if (isStaff) {
        setCompanies(allCompanies);
      } else {
        const myCompanies = allCompanies.filter(c => c.founderLeadPersonId === profile?.personId);
        setCompanies(myCompanies);
        if (myCompanies.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(myCompanies[0].id);
        }
      }
      setLoading(false);
    });

    const unsubParticipations = getCohortParticipations(setParticipations);

    return () => {
      unsubCompanies();
      unsubParticipations();
    };
  }, [profile?.personId, isStaff]);

  useEffect(() => {
    const unsubInterviews = getInterviews(setInterviews, isStaff ? undefined : selectedCompanyId);
    return () => unsubInterviews();
  }, [selectedCompanyId, isStaff]);

  useEffect(() => {
    if (isStaff || !selectedCompanyId) {
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
  }, [selectedCompanyId, isStaff]);

  const activeParticipation = useMemo(() => {
    if (!selectedCompanyId) return null;
    return participations.find(p => p.companyId === selectedCompanyId && p.status === 'active');
  }, [selectedCompanyId, participations]);
  const setupCompletion = useMemo(
    () => getBuilderFoundationCompletion(builderFoundation),
    [builderFoundation]
  );
  const discoverySetupReady =
    setupCompletion.ideaToProblemComplete &&
    setupCompletion.leanCanvasComplete &&
    setupCompletion.earlyAdopterComplete &&
    assumptions.length > 0 &&
    setupCompletion.interviewGuideComplete &&
    setupCompletion.outreachTrackerComplete;
  const weakestAssumption = useMemo(
    () =>
      assumptions
        .slice()
        .sort(
          (left, right) =>
            right.priorityScore - left.priorityScore ||
            right.importanceScore - left.importanceScore ||
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )[0],
    [assumptions]
  );
  const scheduledOutreachCount = builderFoundation?.outreachTracker.targets.filter(
    (target) => target.status === OutreachTargetStatus.SCHEDULED
  ).length || 0;
  const nextSetupPath = !setupCompletion.ideaToProblemComplete
    ? getRoleScopedPath(profile?.role, 'problem')
    : !setupCompletion.leanCanvasComplete
      ? getRoleScopedPath(profile?.role, 'canvas')
      : !setupCompletion.earlyAdopterComplete
        ? getRoleScopedPath(profile?.role, 'early-adopter')
        : assumptions.length === 0
          ? getRoleScopedPath(profile?.role, 'assumptions')
          : !setupCompletion.interviewGuideComplete
            ? getRoleScopedPath(profile?.role, 'interview-guide')
            : !setupCompletion.outreachTrackerComplete
              ? getRoleScopedPath(profile?.role, 'outreach')
              : '';

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !profile?.personId) return;

    const interviewData = {
      companyId: selectedCompanyId,
      cohortParticipationId: activeParticipation?.id || '',
      interviewerPersonId: profile.personId,
      ...formData,
      createdAt: editingInterview?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingInterview) {
      await updateInterview(editingInterview.id, interviewData);
    } else {
      await createInterview(interviewData);
    }

    setFormData(initialFormState);
    setEditingInterview(null);
    setShowAddModal(false);
  };

  const handleEdit = (interview: Interview) => {
    setEditingInterview(interview);
    setFormData({
      intervieweeName: interview.intervieweeName,
      intervieweeSegment: interview.intervieweeSegment,
      interviewSource: interview.interviewSource,
      interviewDate: interview.interviewDate,
      problemTheme: interview.problemTheme,
      painIntensity: interview.painIntensity,
      mentionSpontaneous: interview.mentionSpontaneous,
      currentAlternative: interview.currentAlternative,
      bestQuote: interview.bestQuote,
      followUpNeeded: interview.followUpNeeded,
      notes: interview.notes,
      countsTowardMinimum: interview.countsTowardMinimum
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this interview?')) {
      await deleteInterview(id);
    }
  };

  const filteredInterviews = interviews.filter(i => {
    const matchesSearch = 
      i.intervieweeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.problemTheme.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.notes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSegment = !filterSegment || i.intervieweeSegment === filterSegment;
    const matchesTheme = !filterTheme || i.problemTheme === filterTheme;
    const matchesDate = !filterDate || i.interviewDate === filterDate;
    const matchesCompany = !isStaff || !selectedCompanyId || i.companyId === selectedCompanyId;

    return matchesSearch && matchesSegment && matchesTheme && matchesDate && matchesCompany;
  }).sort((a, b) => new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime());

  // Stats for the selected company
  const companyInterviews = interviews.filter(i => i.companyId === selectedCompanyId);
  const interviewTarget = activeParticipation?.interviewTarget || 20;
  const completedCount = companyInterviews.filter(i => i.countsTowardMinimum).length;
  const progress = Math.min((completedCount / interviewTarget) * 100, 100);
  const followUpsNeeded = companyInterviews.filter(i => i.followUpNeeded).length;
  
  const strongestQuote = useMemo(() => {
    const withQuotes = companyInterviews.filter(i => i.bestQuote && i.painIntensity >= 4);
    return withQuotes.length > 0 ? withQuotes[0].bestQuote : null;
  }, [companyInterviews]);

  const segments = Array.from(new Set(interviews.map(i => i.intervieweeSegment))).filter(Boolean);
  const themes = Array.from(new Set(interviews.map(i => i.problemTheme))).filter(Boolean);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discovery Interviews</h1>
          <p className="text-gray-500">Track your customer discovery progress and insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-1.5">
            <Building className="h-4 w-4 text-gray-400 mr-2" />
            <select 
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="border-none p-0 text-sm focus:ring-0"
            >
              <option value="">{isStaff ? 'All Companies' : 'Select Company'}</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {!isStaff && (
            <button 
              onClick={() => {
                setEditingInterview(null);
                setFormData(initialFormState);
                setShowAddModal(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Log Interview
            </button>
          )}
        </div>
      </header>

      {!isStaff && selectedCompanyId && (
        <section
          className={cn(
            'rounded-[28px] border p-6 shadow-sm',
            discoverySetupReady ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p
                className={cn(
                  'text-xs font-semibold uppercase tracking-[0.18em]',
                  discoverySetupReady ? 'text-sky-800' : 'text-amber-800'
                )}
              >
                Discovery Setup Context
              </p>
              <h2 className="text-xl font-semibold text-slate-950">Interview Capture is the first hard proof layer.</h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-700">
                The problem draft, assumption map, interview guide, and outreach tracker should feed these interviews. They are setup work, not proof. Proof starts when real customer conversations are logged here.
              </p>
            </div>
            {!discoverySetupReady && nextSetupPath ? (
              <Link
                to={nextSetupPath}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Finish setup first
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-white/80 p-5 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Target segment</p>
              <p className="mt-3 text-sm font-semibold text-slate-950">
                {builderFoundation?.interviewGuide.targetSegment || builderFoundation?.earlyAdopter.segmentName || 'Still not chosen'}
              </p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Primary learning goal</p>
              <p className="mt-3 text-sm font-semibold text-slate-950">
                {builderFoundation?.interviewGuide.primaryLearningGoal || 'Still not written'}
              </p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Weakest assumption</p>
              <p className="mt-3 text-sm font-semibold text-slate-950">
                {weakestAssumption?.statement || 'Still not mapped'}
              </p>
            </div>
            <div className="rounded-3xl bg-white/80 p-5 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outreach status</p>
              <p className="mt-3 text-sm font-semibold text-slate-950">
                {builderFoundation?.outreachTracker.targets.length
                  ? `${scheduledOutreachCount} scheduled / ${builderFoundation.outreachTracker.targets.length} tracked`
                  : 'No tracked outreach yet'}
              </p>
            </div>
          </div>

          {!discoverySetupReady && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-white px-4 py-4 text-sm leading-6 text-amber-900">
              Discovery setup is still incomplete. Keep these conversations honest by finishing the missing Builder prep before treating interview volume as real progress.
            </div>
          )}
        </section>
      )}

      {/* Progress Stats - Only show if a company is selected */}
      {selectedCompanyId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Target className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Target Progress</span>
            </div>
            <div className="flex items-end justify-between mb-2">
              <div className="flex items-end space-x-2">
                <span className="text-3xl font-bold text-gray-900">{completedCount}</span>
                <span className="text-gray-500 mb-1">/ {interviewTarget} target</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  progress >= 100 ? "bg-green-500" : "bg-indigo-600"
                )} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Follow-ups</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{followUpsNeeded}</div>
            <p className="text-sm text-gray-500 mt-1">Interviews needing action</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Quote className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Strongest Quote</span>
            </div>
            {strongestQuote ? (
              <p className="text-sm text-gray-700 italic line-clamp-3">"{strongestQuote}"</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No high-intensity quotes yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Staff Review Needs - Only show if staff and no specific company selected */}
      {isStaff && !selectedCompanyId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-amber-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" /> Staff Review: Quality Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg border border-amber-100">
              <span className="text-sm font-medium text-gray-500">Below Target</span>
              <div className="mt-1 text-2xl font-bold text-amber-600">
                {companies.filter(c => {
                  const companyPart = participations.find(p => p.companyId === c.id && p.status === 'active');
                  const count = interviews.filter(i => i.companyId === c.id && i.countsTowardMinimum).length;
                  return companyPart && count < companyPart.interviewTarget;
                }).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-amber-100">
              <span className="text-sm font-medium text-gray-500">Missing Problem Theme</span>
              <div className="mt-1 text-2xl font-bold text-amber-600">
                {interviews.filter(i => !i.problemTheme).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-amber-100">
              <span className="text-sm font-medium text-gray-500">Missing Best Quote</span>
              <div className="mt-1 text-2xl font-bold text-amber-600">
                {interviews.filter(i => !i.bestQuote).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-amber-100">
              <span className="text-sm font-medium text-gray-500">Low Detail (Notes &lt; 100 chars)</span>
              <div className="mt-1 text-2xl font-bold text-amber-600">
                {interviews.filter(i => (i.notes?.length || 0) < 100).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by name, theme, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value)}
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Segments</option>
              {segments.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={filterTheme}
              onChange={(e) => setFilterTheme(e.target.value)}
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Themes</option>
              {themes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input 
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interviewee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Theme / Segment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intensity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInterviews.length > 0 ? (
                filteredInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-full text-gray-600 mr-3">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{interview.intervieweeName}</div>
                          <div className="text-xs text-gray-500 flex items-center mt-0.5">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(interview.interviewDate), 'MMM d, yyyy')}
                            <span className="mx-1">•</span>
                            {interview.interviewSource}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{interview.problemTheme || 'No theme'}</div>
                      <div className="text-xs text-gray-500">{interview.intervieweeSegment}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div 
                            key={star}
                            className={cn(
                              "h-2 w-2 rounded-full mr-1",
                              star <= interview.painIntensity ? "bg-amber-400" : "bg-gray-200"
                            )}
                          />
                        ))}
                        <span className="text-xs font-medium text-gray-600 ml-1">{interview.painIntensity}/5</span>
                      </div>
                      {interview.mentionSpontaneous && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 mt-1">
                          Spontaneous
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {interview.followUpNeeded && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertCircle className="h-3 w-3 mr-1" /> Follow-up
                          </span>
                        )}
                        {interview.countsTowardMinimum ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Counted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Excluded
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleEdit(interview)}
                          className="p-2 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {(isStaff || (!isStaff && interview.interviewerPersonId === profile?.personId)) && (
                          <button 
                            onClick={() => handleDelete(interview.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No interviews found</h3>
                    <p className="text-gray-500 mt-1">Start logging your customer discovery to see them here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingInterview ? 'Edit Interview' : 'Log New Interview'}</h2>
                <p className="text-sm text-gray-500">Capture structured evidence from your discovery call.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingInterview(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSaveInterview} className="p-6 space-y-8">
              {/* Core Info */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                  <User className="h-4 w-4 mr-2 text-indigo-600" /> Interviewee & Context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interviewee Name*</label>
                    <input 
                      required
                      type="text"
                      value={formData.intervieweeName}
                      onChange={(e) => setFormData({...formData, intervieweeName: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g. Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date*</label>
                    <input 
                      required
                      type="date"
                      value={formData.interviewDate}
                      onChange={(e) => setFormData({...formData, interviewDate: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Segment*</label>
                    <input 
                      required
                      type="text"
                      value={formData.intervieweeSegment}
                      onChange={(e) => setFormData({...formData, intervieweeSegment: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g. HR Manager, Small Biz Owner"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source*</label>
                    <input 
                      required
                      type="text"
                      value={formData.interviewSource}
                      onChange={(e) => setFormData({...formData, interviewSource: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g. LinkedIn, Referral, Cold Email"
                    />
                  </div>
                </div>
              </section>

              {/* Problem & Pain */}
              <section className="bg-gray-50 -mx-6 p-6 border-y border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" /> Problem & Pain Intensity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Problem Theme*</label>
                    <input 
                      required
                      type="text"
                      value={formData.problemTheme}
                      onChange={(e) => setFormData({...formData, problemTheme: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g. Manual data entry, High churn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pain Intensity (1-5)*</label>
                    <div className="flex items-center space-x-4 mt-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFormData({...formData, painIntensity: val})}
                          className={cn(
                            "h-10 w-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all",
                            formData.painIntensity === val 
                              ? "bg-indigo-600 border-indigo-600 text-white scale-110" 
                              : "bg-white border-gray-300 text-gray-500 hover:border-indigo-300"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.mentionSpontaneous}
                        onChange={(e) => setFormData({...formData, mentionSpontaneous: e.target.checked})}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 font-medium">Did they mention the pain spontaneously? (Unprompted)</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Insights */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-indigo-600" /> Qualitative Insights
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Alternative*</label>
                    <input 
                      required
                      type="text"
                      value={formData.currentAlternative}
                      onChange={(e) => setFormData({...formData, currentAlternative: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="How are they solving it today? (e.g. Excel, Hiring more staff)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Best Quote*</label>
                    <textarea 
                      required
                      rows={2}
                      value={formData.bestQuote}
                      onChange={(e) => setFormData({...formData, bestQuote: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="The most impactful thing they said..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Notes*</label>
                    <textarea 
                      required
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Detailed notes from the conversation..."
                    />
                  </div>
                </div>
              </section>

              {/* Status & Actions */}
              <section className="bg-indigo-50 -mx-6 -mb-6 p-6 border-t border-indigo-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.followUpNeeded}
                        onChange={(e) => setFormData({...formData, followUpNeeded: e.target.checked})}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 font-medium">Follow-up Needed</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.countsTowardMinimum}
                        onChange={(e) => setFormData({...formData, countsTowardMinimum: e.target.checked})}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 font-medium">Counts toward cohort minimum interviews</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setEditingInterview(null);
                      }}
                      className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 shadow-md"
                    >
                      {editingInterview ? 'Update Interview' : 'Save Interview'}
                    </button>
                  </div>
                </div>
              </section>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryInterviews;
