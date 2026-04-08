import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { getCompanies } from '../services/companyService';
import { getInterviews, getAssumptions, getExperiments, getSignals } from '../services/evidenceService';
import { createReadinessReview, getReadinessReviews } from '../services/progressService';
import { Company, Interview, Assumption, Experiment, Signal, ReadinessReview, ReadinessType, ReadinessStatus } from '../types';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  Lightbulb, 
  FlaskConical, 
  Signal as SignalIcon,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const ReadinessQueue: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allInterviews, setAllInterviews] = useState<Record<string, Interview[]>>({});
  const [allAssumptions, setAllAssumptions] = useState<Record<string, Assumption[]>>({});
  const [allExperiments, setAllExperiments] = useState<Record<string, Experiment[]>>({});
  const [allSignals, setAllSignals] = useState<Record<string, Signal[]>>({});
  const [allReviews, setAllReviews] = useState<Record<string, ReadinessReview[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Review Form
  const [reviewType, setReviewType] = useState<ReadinessType>(ReadinessType.BUILDER_COMPLETION);
  const [reviewStatus, setReviewStatus] = useState<ReadinessStatus>(ReadinessStatus.READY);
  const [reviewReasons, setReviewReasons] = useState('');

  useEffect(() => {
    const unsubCompanies = getCompanies((allCompanies) => {
      setCompanies(allCompanies);
      setLoading(false);
      
      // Fetch evidence for each company
      allCompanies.forEach(company => {
        getInterviews((interviews) => {
          setAllInterviews(prev => ({ ...prev, [company.id]: interviews }));
        }, company.id);
        
        getAssumptions((assumptions) => {
          setAllAssumptions(prev => ({ ...prev, [company.id]: assumptions }));
        }, company.id);
        
        getExperiments((experiments) => {
          setAllExperiments(prev => ({ ...prev, [company.id]: experiments }));
        }, company.id);
        
        getSignals((signals) => {
          setAllSignals(prev => ({ ...prev, [company.id]: signals }));
        }, company.id);

        getReadinessReviews((reviews) => {
          setAllReviews(prev => ({ ...prev, [company.id]: reviews }));
        }, company.id);
      });
    });

    return () => unsubCompanies();
  }, []);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.personId || !selectedCompanyId) return;

    await createReadinessReview({
      companyId: selectedCompanyId,
      reviewType,
      status: reviewStatus,
      reasons: reviewReasons.split('\n').filter(r => r.trim()),
      reviewedByPersonId: profile.personId,
      reviewedAt: new Date().toISOString()
    });

    setReviewReasons('');
    setSelectedCompanyId(null);
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Readiness Review Queue</h1>
        <p className="text-gray-500">Evaluate startup evidence and issue readiness decisions.</p>
      </header>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredCompanies.map((company) => {
            const interviews = allInterviews[company.id] || [];
            const assumptions = allAssumptions[company.id] || [];
            const experiments = allExperiments[company.id] || [];
            const signals = allSignals[company.id] || [];
            const reviews = allReviews[company.id] || [];
            const latestReview = reviews.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())[0];

            return (
              <div key={company.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
                      {latestReview && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                          latestReview.status === ReadinessStatus.READY ? "bg-green-100 text-green-700" :
                          latestReview.status === ReadinessStatus.NOT_READY ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        )}>
                          {latestReview.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Stage: <span className="capitalize font-medium text-gray-700">{company.membershipStatus}</span>
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MessageSquare className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-bold mr-1">{interviews.length}</span> Interviews
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Lightbulb className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-bold mr-1">{assumptions.length}</span> Assumptions
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <FlaskConical className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-bold mr-1">{experiments.length}</span> Experiments
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <SignalIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-bold mr-1">{signals.length}</span> Signals
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => setSelectedCompanyId(company.id)}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 flex items-center"
                    >
                      <ClipboardCheck className="h-4 w-4 mr-1.5" /> Review Readiness
                    </button>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Modal */}
      {selectedCompanyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Readiness Review: {companies.find(c => c.id === selectedCompanyId)?.name}
              </h2>
              <button onClick={() => setSelectedCompanyId(null)} className="text-gray-400 hover:text-gray-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Evidence Summary Section */}
              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Evidence Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{allInterviews[selectedCompanyId]?.length || 0}</p>
                    <p className="text-xs text-gray-500">Interviews</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{allAssumptions[selectedCompanyId]?.length || 0}</p>
                    <p className="text-xs text-gray-500">Assumptions</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{allExperiments[selectedCompanyId]?.length || 0}</p>
                    <p className="text-xs text-gray-500">Experiments</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{allSignals[selectedCompanyId]?.length || 0}</p>
                    <p className="text-xs text-gray-500">Signals</p>
                  </div>
                </div>
              </section>

              {/* Review Form */}
              <form onSubmit={handleCreateReview} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Type</label>
                    <select 
                      value={reviewType}
                      onChange={(e) => setReviewType(e.target.value as ReadinessType)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value={ReadinessType.BUILDER_COMPLETION}>Builder Completion</option>
                      <option value={ReadinessType.COHORT_ADMISSION}>Cohort Admission</option>
                      <option value={ReadinessType.INVESTMENT_READY}>Investment Ready</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select 
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as ReadinessStatus)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value={ReadinessStatus.READY}>Ready</option>
                      <option value={ReadinessStatus.NOT_READY}>Not Ready</option>
                      <option value={ReadinessStatus.NEEDS_WORK}>Needs Work</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reasons / Feedback (one per line)</label>
                  <textarea 
                    required
                    rows={4}
                    value={reviewReasons}
                    onChange={(e) => setReviewReasons(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Why was this decision made?&#10;What is missing?&#10;What are the strengths?"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={() => setSelectedCompanyId(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 shadow-sm"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadinessQueue;
