import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { 
  getCompanies, 
  submitApplication, 
  getApplications, 
  createCompany,
  getInterviews,
  createInterview,
  getAssumptions,
  createAssumption,
  updateAssumption,
  getExperiments,
  createExperiment,
  getSignals,
  createSignal,
  getReadinessReviews
} from '../services/firestoreService';
import { 
  Company, 
  CohortApplication, 
  Interview, 
  Assumption, 
  Experiment, 
  Signal, 
  ReadinessReview,
  SignalType,
  AssumptionType,
  ReadinessType,
  ReadinessStatus
} from '../types';
import { 
  Rocket, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Building, 
  MessageSquare, 
  Lightbulb, 
  FlaskConical, 
  Signal as SignalIcon, 
  ShieldCheck,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { where } from 'firebase/firestore';
import { cn } from '../lib/utils';

type Tab = 'overview' | 'interviews' | 'assumptions' | 'experiments' | 'signals' | 'readiness';

const FounderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [myCompanies, setMyCompanies] = useState<Company[]>([]);
  const [myApplications, setMyApplications] = useState<CohortApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Evidence State
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [readinessReviews, setReadinessReviews] = useState<ReadinessReview[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const unsubCompanies = getCompanies((all) => {
      const filtered = all.filter(c => c.founderUids.includes(user.uid));
      setMyCompanies(filtered);
      if (filtered.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(filtered[0].id);
      }
    });

    const unsubApps = getApplications((all) => {
      setMyApplications(all.filter(a => a.founderUid === user.uid));
    }, [where('founderUid', '==', user.uid)]);

    setLoading(false);
    return () => {
      unsubCompanies();
      unsubApps();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedCompanyId) return;

    const unsubInterviews = getInterviews(setInterviews, selectedCompanyId);
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    const unsubExperiments = getExperiments(setExperiments, selectedCompanyId);
    const unsubSignals = getSignals(setSignals, selectedCompanyId);
    const unsubReadiness = getReadinessReviews(setReadinessReviews, selectedCompanyId);

    return () => {
      unsubInterviews();
      unsubAssumptions();
      unsubExperiments();
      unsubSignals();
      unsubReadiness();
    };
  }, [selectedCompanyId]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCompanyName) return;
    
    const id = await createCompany({
      name: newCompanyName,
      description: '',
      status: 'pending',
      stage: 'Idea Development',
      progressScore: 0,
      readinessNotes: '',
      founderUids: [user.uid],
      createdAt: new Date().toISOString()
    });
    
    setSelectedCompanyId(id);
    setNewCompanyName('');
    setShowCreateCompany(false);
  };

  const handleApplyToCohort = async (companyId: string) => {
    if (!user) return;
    await submitApplication({
      companyId,
      cohortId: 'default-cohort',
      founderUid: user.uid,
      status: 'pending',
      submittedAt: new Date().toISOString()
    });
  };

  if (loading) return <div>Loading...</div>;

  const selectedCompany = myCompanies.find(c => c.id === selectedCompanyId);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Founder Dashboard</h1>
          <p className="text-gray-500">Track your startup's progress and evidence.</p>
        </div>
        <div className="flex gap-3">
          {myCompanies.length > 0 && (
            <select 
              value={selectedCompanyId || ''} 
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {myCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button 
            onClick={() => setShowCreateCompany(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" /> New Startup
          </button>
        </div>
      </header>

      {showCreateCompany && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-100">
          <h3 className="text-lg font-semibold mb-4">Register New Startup</h3>
          <form onSubmit={handleCreateCompany} className="flex gap-4">
            <input 
              type="text" 
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Company Name"
              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Create</button>
            <button type="button" onClick={() => setShowCreateCompany(false)} className="text-gray-500 px-4 py-2 hover:text-gray-700">Cancel</button>
          </form>
        </div>
      )}

      {selectedCompany ? (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Rocket },
                { id: 'interviews', label: 'Interviews', icon: MessageSquare },
                { id: 'assumptions', label: 'Assumptions', icon: Lightbulb },
                { id: 'experiments', label: 'Experiments', icon: FlaskConical },
                { id: 'signals', label: 'Signals', icon: SignalIcon },
                { id: 'readiness', label: 'Readiness', icon: ShieldCheck },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={cn(
                    "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all",
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <tab.icon className={cn(
                    "mr-2 h-5 w-5",
                    activeTab === tab.id ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{selectedCompany.stage}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedCompany.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {selectedCompany.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 uppercase font-bold">Interviews</p>
                        <p className="text-xl font-bold text-gray-900">{interviews.length}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 uppercase font-bold">Assumptions</p>
                        <p className="text-xl font-bold text-gray-900">{assumptions.length}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 uppercase font-bold">Experiments</p>
                        <p className="text-xl font-bold text-gray-900">{experiments.length}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 uppercase font-bold">Signals</p>
                        <p className="text-xl font-bold text-gray-900">{signals.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Latest Signals</h4>
                    <div className="space-y-3">
                      {signals.slice(0, 3).map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center">
                            <div className="bg-indigo-100 p-2 rounded mr-3">
                              <SignalIcon className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">{s.type}</p>
                              <p className="text-xs text-gray-500">{s.date}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-gray-900">+{s.count}</p>
                        </div>
                      ))}
                      {signals.length === 0 && <p className="text-sm text-gray-500 italic">No signals logged yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-indigo-600 p-6 rounded-lg shadow-sm text-white">
                    <h4 className="text-lg font-bold mb-2">Next Milestone</h4>
                    <p className="text-indigo-100 text-sm mb-6">Complete discovery phase by logging at least 10 interviews with a pain intensity {'>'} 7.</p>
                    <button 
                      onClick={() => handleApplyToCohort(selectedCompany.id)}
                      disabled={myApplications.some(a => a.companyId === selectedCompany.id && a.status === 'pending')}
                      className="w-full bg-white text-indigo-600 py-2 rounded-md text-sm font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                      Request Cohort Review
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Readiness Status</h4>
                    <div className="space-y-4">
                      {['builder_completion', 'mentor', 'intern', 'pitch', 'investor'].map(type => {
                        const review = readinessReviews.find(r => r.type === type);
                        return (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                            {review?.status === 'ready' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : review?.status === 'not_ready' ? (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'interviews' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Discovery Interviews</h3>
                  <button 
                    onClick={async () => {
                      if (!user || !selectedCompanyId) return;
                      await createInterview({
                        companyId: selectedCompanyId,
                        founderUid: user.uid,
                        segment: 'Early Adopter',
                        painIntensity: 8,
                        alternative: 'Manual spreadsheets',
                        quote: 'This would save me 10 hours a week.',
                        spontaneous: true,
                        followUp: true,
                        date: new Date().toISOString()
                      });
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Log Interview
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interviews.map(i => (
                    <div key={i.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-indigo-600 uppercase">{i.segment}</span>
                        <span className="text-xs text-gray-500">{format(new Date(i.date), 'MMM d')}</span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium italic mb-3">"{i.quote}"</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Pain: <span className="font-bold text-gray-900">{i.painIntensity}/10</span></span>
                        <span>Alt: <span className="font-bold text-gray-900">{i.alternative}</span></span>
                      </div>
                    </div>
                  ))}
                  {interviews.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No interviews logged yet. Start discovery to validate your problem.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'assumptions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Risky Assumptions</h3>
                  <button 
                    onClick={async () => {
                      if (!selectedCompanyId) return;
                      await createAssumption({
                        companyId: selectedCompanyId,
                        statement: 'Users will pay $50/mo for this service.',
                        type: 'viability',
                        importance: 9,
                        evidence: 2,
                        status: 'unvalidated'
                      });
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Assumption
                  </button>
                </div>
                <div className="space-y-4">
                  {assumptions.map(a => (
                    <div key={a.id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          a.type === 'desirability' ? "bg-blue-100 text-blue-600" :
                          a.type === 'feasibility' ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
                        )}>
                          <Lightbulb className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{a.statement}</p>
                          <p className="text-xs text-gray-500 capitalize">{a.type} • Importance: {a.importance} • Evidence: {a.evidence}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-600 h-full" style={{ width: `${(a.evidence / 10) * 100}%` }}></div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'experiments' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Validation Experiments</h3>
                  <button 
                    onClick={async () => {
                      if (!selectedCompanyId) return;
                      await createExperiment({
                        companyId: selectedCompanyId,
                        hypothesis: 'If we offer a free trial, 20% will sign up.',
                        testType: 'Landing Page',
                        channel: 'LinkedIn',
                        offer: 'Free Trial',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: '',
                        metric: 'Conversion Rate',
                        result: '',
                        learning: '',
                        status: 'active'
                      });
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> New Experiment
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {experiments.map(e => (
                    <div key={e.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase">{e.testType}</span>
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded",
                          e.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        )}>{e.status.toUpperCase()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2">{e.hypothesis}</h4>
                      <div className="space-y-2 text-xs text-gray-500">
                        <p><span className="font-semibold">Channel:</span> {e.channel}</p>
                        <p><span className="font-semibold">Metric:</span> {e.metric}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'signals' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Traction Signals</h3>
                  <button 
                    onClick={async () => {
                      if (!selectedCompanyId) return;
                      await createSignal({
                        companyId: selectedCompanyId,
                        type: 'waitlist',
                        count: 5,
                        notes: 'New signups from LinkedIn post.',
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Log Signal
                  </button>
                </div>
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {signals.map(s => (
                        <tr key={s.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 capitalize">{s.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-bold">+{s.count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{s.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'readiness' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Readiness Reviews</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {readinessReviews.map(r => (
                    <div key={r.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-sm font-bold text-gray-900 capitalize">{r.type.replace('_', ' ')} Review</h4>
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded",
                          r.status === 'ready' ? "bg-green-100 text-green-700" :
                          r.status === 'not_ready' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        )}>{r.status.toUpperCase()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{r.reasons}</p>
                      {r.missingItems.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Missing Items</p>
                          <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                            {r.missingItems.map((item, idx) => <li key={idx}>{item}</li>)}
                          </ul>
                        </div>
                      )}
                      <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
                        Reviewed by {r.reviewedBy} on {format(new Date(r.reviewedOn), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                  {readinessReviews.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No official reviews have been conducted yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-lg border border-dashed border-gray-300">
          <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No companies registered</h3>
          <p className="text-gray-500 mt-1">Register your startup to begin your journey with Opportunity Machine.</p>
        </div>
      )}
    </div>
  );
};

export default FounderDashboard;
