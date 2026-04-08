import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { getMentorAssignments } from '../services/mentorService';
import { getCompanies } from '../services/companyService';
import { submitFeedback, getFeedback } from '../services/feedbackService';
import { getInterviews, getAssumptions, getExperiments, getSignals } from '../services/evidenceService';
import { Company, MentorAssignment, Feedback, Interview, Assumption, Experiment, Signal, FeedbackRole } from '../types';
import { MessageSquare, Calendar, User, ExternalLink, Lightbulb, FlaskConical, Signal as SignalIcon } from 'lucide-react';
import { format } from 'date-fns';
import { where } from 'firebase/firestore';

const MentorDashboard: React.FC = () => {
  const { profile, loading } = useAuth();
  const [assignments, setAssignments] = useState<MentorAssignment[]>([]);
  const [assignedCompanies, setAssignedCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [companyFeedback, setCompanyFeedback] = useState<Feedback[]>([]);

  // Evidence State
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    if (!profile?.personId) return;
    
    const unsubAssignments = getMentorAssignments((all) => {
      setAssignments(all);
    }, [where('mentorId', '==', profile.personId)]);

    const unsubCompanies = getCompanies((all) => {
      const assignedIds = assignments.map(a => a.companyId);
      setAssignedCompanies(all.filter(c => assignedIds.includes(c.id)));
    });

    return () => {
      unsubAssignments();
      unsubCompanies();
    };
  }, [profile?.personId, assignments.length]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    
    const unsubFeedback = getFeedback(setCompanyFeedback, selectedCompanyId);
    const unsubInterviews = getInterviews(setInterviews, selectedCompanyId);
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    const unsubExperiments = getExperiments(setExperiments, selectedCompanyId);
    const unsubSignals = getSignals(setSignals, selectedCompanyId);

    return () => {
      unsubFeedback();
      unsubInterviews();
      unsubAssumptions();
      unsubExperiments();
      unsubSignals();
    };
  }, [selectedCompanyId]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.personId || !selectedCompanyId || !feedbackText) return;

    await submitFeedback({
      meetingRequestId: 'manual_entry', // Or handle this differently
      companyId: selectedCompanyId,
      submittedByRole: FeedbackRole.MENTOR,
      internalNotes: feedbackText,
      submittedAt: new Date().toISOString()
    });

    setFeedbackText('');
  };

  const selectedCompany = assignedCompanies.find(c => c.id === selectedCompanyId);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Mentor Dashboard</h1>
        <p className="text-gray-500">Support your assigned startups and log progress.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assigned Startups List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" /> Assigned Startups
          </h2>
          <div className="space-y-3">
            {assignedCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedCompanyId === company.id 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-indigo-200'
                }`}
              >
                <h3 className="font-bold text-gray-900">{company.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{company.stage}</p>
              </button>
            ))}
            {assignedCompanies.length === 0 && (
              <div className="bg-white p-6 text-center rounded-lg border border-dashed border-gray-300">
                <p className="text-sm text-gray-500">No startups assigned yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Company Details & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCompany ? (
            <>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedCompany.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{selectedCompany.description || 'No description provided.'}</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                    {selectedCompany.stage}
                  </span>
                </div>
                
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-50 rounded-md text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Interviews</p>
                    <p className="text-lg font-bold text-gray-900">{interviews.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Assumptions</p>
                    <p className="text-lg font-bold text-gray-900">{assumptions.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Experiments</p>
                    <p className="text-lg font-bold text-gray-900">{experiments.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md text-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Signals</p>
                    <p className="text-lg font-bold text-gray-900">{signals.length}</p>
                  </div>
                </div>
              </div>

              {/* Evidence Review for Mentors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" /> Top Assumptions
                  </h4>
                  <div className="space-y-2">
                    {assumptions.slice(0, 3).map(a => (
                      <div key={a.id} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
                        <p className="font-medium text-gray-900">{a.statement}</p>
                        <p className="text-gray-500 mt-1 capitalize">{a.type} • Evidence: {a.evidenceScore}/5</p>
                      </div>
                    ))}
                    {assumptions.length === 0 && <p className="text-xs text-gray-500 italic">No assumptions logged.</p>}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <SignalIcon className="h-4 w-4 mr-2 text-indigo-500" /> Latest Signals
                  </h4>
                  <div className="space-y-2">
                    {signals.slice(0, 3).map(s => (
                      <div key={s.id} className="flex flex-col text-xs p-2 bg-gray-50 rounded border border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">Waitlist</span>
                          <span className="font-bold text-indigo-600">+{s.waitlistSignups || 0}</span>
                        </div>
                        {s.revenue ? (
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-medium text-gray-900">Revenue</span>
                            <span className="font-bold text-green-600">${s.revenue}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {signals.length === 0 && <p className="text-xs text-gray-500 italic">No signals logged.</p>}
                  </div>
                </div>
              </div>

              {/* Feedback Form */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" /> Submit Meeting Notes
                </h3>
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="What did you discuss? What are the next steps?"
                    className="w-full h-32 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                  />
                  <button 
                    type="submit"
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Save Notes
                  </button>
                </form>
              </div>

              {/* Feedback History */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Notes</h3>
                {companyFeedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(item.submittedAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.internalNotes}</p>
                  </div>
                ))}
                {companyFeedback.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No notes logged for this startup yet.</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white h-64 flex items-center justify-center rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <ExternalLink className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Select a startup to view details and log feedback.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;
