import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../components/AuthProvider';
import { getPatterns, createPattern, updatePattern, deletePattern, getInterviews } from '../services/evidenceService';
import { getCompanies } from '../services/companyService';
import { Pattern, Interview, Company, PatternStatus, StageConfidence } from '../types';
import { 
  Brain, 
  Plus, 
  Search, 
  Trash2, 
  Target,
  TrendingUp,
  Filter,
  AlertCircle,
  CheckCircle2,
  Quote,
  Edit2,
  Building,
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Patterns: React.FC = () => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'om_staff' || profile?.role === 'om_admin';
  
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const initialFormState = {
    problemTheme: '',
    numberOfMentions: 0,
    averagePainIntensity: 0,
    unpromptedMentions: 0,
    representativeQuote: '',
    confidence: StageConfidence.LOW,
    status: PatternStatus.KEEP,
    notes: ''
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

    return () => unsubCompanies();
  }, [profile?.personId, isStaff]);

  useEffect(() => {
    const unsubPatterns = getPatterns(setPatterns, isStaff ? undefined : selectedCompanyId);
    const unsubInterviews = getInterviews(setInterviews, isStaff ? undefined : selectedCompanyId);
    
    return () => {
      unsubPatterns();
      unsubInterviews();
    };
  }, [selectedCompanyId, isStaff]);

  const handleSavePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    const patternData = {
      companyId: selectedCompanyId,
      ...formData,
      createdAt: editingPattern?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingPattern) {
      await updatePattern(editingPattern.id, patternData);
    } else {
      await createPattern(patternData);
    }

    setFormData(initialFormState);
    setEditingPattern(null);
    setShowAddModal(false);
  };

  const handleEdit = (pattern: Pattern) => {
    setEditingPattern(pattern);
    setFormData({
      problemTheme: pattern.problemTheme,
      numberOfMentions: pattern.numberOfMentions,
      averagePainIntensity: pattern.averagePainIntensity || 0,
      unpromptedMentions: pattern.unpromptedMentions || 0,
      representativeQuote: pattern.representativeQuote || '',
      confidence: pattern.confidence || StageConfidence.LOW,
      status: pattern.status,
      notes: pattern.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this pattern?')) {
      await deletePattern(id);
    }
  };

  const synthesizeFromInterviews = () => {
    if (!formData.problemTheme) {
      alert('Please enter a Problem Theme first.');
      return;
    }

    const themeInterviews = interviews.filter(i => 
      i.companyId === selectedCompanyId && 
      i.problemTheme.toLowerCase() === formData.problemTheme.toLowerCase()
    );

    if (themeInterviews.length === 0) {
      alert(`No interviews found with theme: "${formData.problemTheme}"`);
      return;
    }

    const mentions = themeInterviews.length;
    const avgPain = themeInterviews.reduce((acc, curr) => acc + curr.painIntensity, 0) / mentions;
    const unprompted = themeInterviews.filter(i => i.mentionSpontaneous).length;
    const bestQuote = themeInterviews.sort((a, b) => b.painIntensity - a.painIntensity)[0]?.bestQuote || '';

    setFormData({
      ...formData,
      numberOfMentions: mentions,
      averagePainIntensity: Number(avgPain.toFixed(1)),
      unpromptedMentions: unprompted,
      representativeQuote: bestQuote
    });
  };

  const filteredPatterns = patterns.filter(p => {
    const matchesSearch = 
      p.problemTheme.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesCompany = !isStaff || !selectedCompanyId || p.companyId === selectedCompanyId;

    return matchesSearch && matchesCompany;
  }).sort((a, b) => b.numberOfMentions - a.numberOfMentions);

  // Stats
  const companyPatterns = patterns.filter(p => p.companyId === selectedCompanyId);
  const strongPatterns = companyPatterns.filter(p => p.confidence === StageConfidence.HIGH).length;
  const pivotCandidates = companyPatterns.filter(p => p.status === PatternStatus.PIVOT).length;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Problem Patterns</h1>
          <p className="text-gray-500">Synthesize interview evidence into validated problem themes.</p>
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
                setEditingPattern(null);
                setFormData(initialFormState);
                setShowAddModal(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" /> New Pattern
            </button>
          )}
        </div>
      </header>

      {/* Stats */}
      {selectedCompanyId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Brain className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Total Patterns</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{companyPatterns.length}</div>
            <p className="text-sm text-gray-500 mt-1">Identified problem themes</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Strong Evidence</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{strongPatterns}</div>
            <p className="text-sm text-gray-500 mt-1">High confidence patterns</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <RefreshCw className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Pivot Signals</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{pivotCandidates}</div>
            <p className="text-sm text-gray-500 mt-1">Themes to move away from</p>
          </div>
        </div>
      )}

      {/* Pattern List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredPatterns.length > 0 ? (
            filteredPatterns.map((pattern) => (
              <div key={pattern.id} className="p-6 hover:bg-gray-50 transition-colors group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{pattern.problemTheme}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        pattern.status === PatternStatus.KEEP ? "bg-green-100 text-green-800" :
                        pattern.status === PatternStatus.NARROW ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {pattern.status}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        pattern.confidence === StageConfidence.HIGH ? "bg-indigo-100 text-indigo-800" :
                        pattern.confidence === StageConfidence.MEDIUM ? "bg-gray-100 text-gray-800" :
                        "bg-amber-100 text-amber-800"
                      )}>
                        {pattern.confidence} Confidence
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Target className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-medium mr-1">{pattern.numberOfMentions}</span> Mentions
                      </div>
                      <div className="flex items-center text-gray-600">
                        <TrendingUp className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-medium mr-1">{pattern.averagePainIntensity}</span> Avg Pain
                      </div>
                      <div className="flex items-center text-gray-600">
                        <AlertCircle className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-medium mr-1">{pattern.unpromptedMentions}</span> Unprompted
                      </div>
                    </div>

                    {pattern.representativeQuote && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                        <p className="text-sm text-gray-700 italic">"{pattern.representativeQuote}"</p>
                      </div>
                    )}

                    {pattern.notes && (
                      <p className="mt-3 text-sm text-gray-500 line-clamp-2">{pattern.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button 
                      onClick={() => handleEdit(pattern)}
                      className="p-2 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(pattern.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No patterns identified</h3>
              <p className="text-gray-500 mt-1">Start synthesizing your interviews to identify problem themes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingPattern ? 'Edit Pattern' : 'New Problem Pattern'}</h2>
                <p className="text-sm text-gray-500">Synthesize evidence into a validated problem theme.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPattern(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSavePattern} className="p-6 space-y-8">
              {/* Theme & Synthesis */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                    <Target className="h-4 w-4 mr-2 text-indigo-600" /> Theme & Evidence
                  </h3>
                  <button 
                    type="button"
                    onClick={synthesizeFromInterviews}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" /> Calculate from Interviews
                  </button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Problem Theme*</label>
                    <input 
                      required
                      type="text"
                      value={formData.problemTheme}
                      onChange={(e) => setFormData({...formData, problemTheme: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="e.g. Manual data entry in HR"
                    />
                    <p className="mt-1 text-xs text-gray-400">Must match the "Problem Theme" used in your interview logs to auto-calculate.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Mentions*</label>
                      <input 
                        required
                        type="number"
                        value={formData.numberOfMentions}
                        onChange={(e) => setFormData({...formData, numberOfMentions: parseInt(e.target.value)})}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Avg Pain Intensity*</label>
                      <input 
                        required
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.averagePainIntensity}
                        onChange={(e) => setFormData({...formData, averagePainIntensity: parseFloat(e.target.value)})}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unprompted Mentions*</label>
                      <input 
                        required
                        type="number"
                        value={formData.unpromptedMentions}
                        onChange={(e) => setFormData({...formData, unpromptedMentions: parseInt(e.target.value)})}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Status & Confidence */}
              <section className="bg-gray-50 -mx-6 p-6 border-y border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" /> Validation Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Level*</label>
                    <select 
                      required
                      value={formData.confidence}
                      onChange={(e) => setFormData({...formData, confidence: e.target.value as StageConfidence})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {Object.values(StageConfidence).map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Strategic Status*</label>
                    <select 
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as PatternStatus})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {Object.values(PatternStatus).map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Qualitative */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                  <Quote className="h-4 w-4 mr-2 text-indigo-600" /> Qualitative Summary
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Representative Quote*</label>
                    <textarea 
                      required
                      rows={2}
                      value={formData.representativeQuote}
                      onChange={(e) => setFormData({...formData, representativeQuote: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="The quote that best captures this problem..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Synthesis Notes</label>
                    <textarea 
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Why did you choose this status/confidence? What are the nuances?"
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPattern(null);
                  }}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 shadow-md"
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
