import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { 
  getCompanies, 
  getApplications, 
  updateApplicationStatus, 
  updateCompany,
  createReadinessReview,
  getInterviews,
  getSignals
} from '../services/firestoreService';
import { Company, CohortApplication, StartupStage, Interview, Signal, ReadinessType, ReadinessStatus } from '../types';
import { CheckCircle, XCircle, UserPlus, TrendingUp, Clock, ShieldCheck, MessageSquare, Signal as SignalIcon } from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<CohortApplication[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected company for review
  const [selectedReviewCompanyId, setSelectedReviewCompanyId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<ReadinessType>('builder_completion');
  const [reviewStatus, setReviewStatus] = useState<ReadinessStatus>('ready');
  const [reviewReasons, setReviewReasons] = useState('');

  useEffect(() => {
    const unsubCompanies = getCompanies(setCompanies);
    const unsubApps = getApplications(setApplications);
    setLoading(false);
    return () => {
      unsubCompanies();
      unsubApps();
    };
  }, []);

  const handleApproveApp = async (appId: string, companyId: string) => {
    await updateApplicationStatus(appId, 'approved');
    await updateCompany(companyId, { status: 'active' });
  };

  const handleDenyApp = async (appId: string) => {
    await updateApplicationStatus(appId, 'denied');
  };

  const updateStage = async (companyId: string, stage: StartupStage) => {
    await updateCompany(companyId, { stage });
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedReviewCompanyId) return;

    await createReadinessReview({
      companyId: selectedReviewCompanyId,
      type: reviewType,
      status: reviewStatus,
      reasons: reviewReasons,
      missingItems: [],
      reviewedBy: profile.displayName,
      reviewedOn: new Date().toISOString()
    });

    setReviewReasons('');
    setSelectedReviewCompanyId(null);
  };

  const stages: StartupStage[] = [
    'Idea Development',
    'Customer Discovery',
    'Product Development',
    'Beta Testing',
    'Customer Acquisition',
    'Growth',
    'Alumni'
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">OM Staff Dashboard</h1>
        <p className="text-gray-500">Manage founders, companies, and cohorts.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Companies</p>
              <h3 className="text-2xl font-bold text-gray-900">{companies.filter(c => c.status === 'active').length}</h3>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Apps</p>
              <h3 className="text-2xl font-bold text-gray-900">{applications.filter(a => a.status === 'pending').length}</h3>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Founders</p>
              <h3 className="text-2xl font-bold text-gray-900">{companies.reduce((acc, c) => acc + c.founderUids.length, 0)}</h3>
            </div>
            <UserPlus className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Pending Applications */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Cohort Applications</h2>
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.filter(a => a.status === 'pending').map((app) => {
                const company = companies.find(c => c.id === app.companyId);
                return (
                  <tr key={app.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(app.submittedAt), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleApproveApp(app.id, app.companyId)}
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </button>
                      <button 
                        onClick={() => handleDenyApp(app.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Deny
                      </button>
                    </td>
                  </tr>
                );
              })}
              {applications.filter(a => a.status === 'pending').length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No pending applications</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Portfolio Management */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Portfolio Progress</h2>
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update Stage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {company.name}
                      <div className="text-xs text-indigo-600 font-semibold mt-0.5">{company.stage}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select 
                        value={company.stage}
                        onChange={(e) => updateStage(company.id, e.target.value as StartupStage)}
                        className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Readiness Review Form */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShieldCheck className="h-5 w-5 mr-2" /> Readiness Review
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <form onSubmit={handleCreateReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company</label>
                <select 
                  required
                  value={selectedReviewCompanyId || ''}
                  onChange={(e) => setSelectedReviewCompanyId(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a company...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Review Type</label>
                  <select 
                    value={reviewType}
                    onChange={(e) => setReviewType(e.target.value as ReadinessType)}
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="builder_completion">Builder Completion</option>
                    <option value="mentor">Mentor Ready</option>
                    <option value="intern">Intern Ready</option>
                    <option value="pitch">Pitch Ready</option>
                    <option value="investor">Investor Ready</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                  <select 
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as ReadinessStatus)}
                    className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ready">Ready</option>
                    <option value="not_ready">Not Ready</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes / Reasons</label>
                <textarea 
                  value={reviewReasons}
                  onChange={(e) => setReviewReasons(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-24"
                  placeholder="Explain the decision..."
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={!selectedReviewCompanyId}
                className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
