import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { getSignals, createSignal, deleteSignal } from '../services/evidenceService';
import { getCompanies } from '../services/companyService';
import { Signal, Company } from '../types';
import { 
  Signal as SignalIcon, 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart,
  Activity,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const Signals: React.FC = () => {
  const { profile } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newSignal, setNewSignal] = useState({
    type: 'waitlist',
    value: '',
    source: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const signalTypes = [
    { id: 'waitlist', label: 'Waitlist Signup', field: 'waitlistSignups' },
    { id: 'call', label: 'Call Booked', field: 'callsBooked' },
    { id: 'pilot', label: 'Pilot Launched', field: 'pilots' },
    { id: 'loi', label: 'LOI Signed', field: 'lois' },
    { id: 'preorder', label: 'Pre-Order', field: 'preOrders' },
    { id: 'customer', label: 'Paying Customer', field: 'payingCustomers' },
    { id: 'revenue', label: 'Revenue ($)', field: 'revenue' },
    { id: 'usage', label: 'Repeat Usage', field: 'repeatUsage' },
    { id: 'other', label: 'Other Metric', field: 'value' },
  ];

  useEffect(() => {
    if (!profile?.personId) return;

    const unsubCompanies = getCompanies((allCompanies) => {
      const myCompanies = allCompanies.filter(c => c.founderLeadPersonId === profile.personId);
      setCompanies(myCompanies);
      if (myCompanies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(myCompanies[0].id);
      }
      setLoading(false);
    });

    return () => unsubCompanies();
  }, [profile?.personId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const unsubSignals = getSignals(setSignals, selectedCompanyId);
    return () => unsubSignals();
  }, [selectedCompanyId]);

  const handleAddSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    const selectedType = signalTypes.find(t => t.id === newSignal.type);
    const numericValue = parseFloat(newSignal.value) || 0;

    const signalData: any = {
      companyId: selectedCompanyId,
      signalDate: new Date(newSignal.date).toISOString(),
      date: newSignal.date,
      type: selectedType?.label || 'Other',
      source: newSignal.source,
      notes: newSignal.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (selectedType?.field) {
      if (selectedType.field === 'value') {
        signalData.value = newSignal.value;
      } else {
        signalData[selectedType.field] = numericValue;
        signalData.value = newSignal.value; // Keep for display
      }
    }

    await createSignal(signalData);

    setNewSignal({
      type: 'waitlist',
      value: '',
      source: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowAddModal(false);
  };

  const handleDeleteSignal = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this signal?')) {
      await deleteSignal(id);
    }
  };

  const filteredSignals = signals.filter(s => 
    (s.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.source || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.signalDate || b.date || '').getTime() - new Date(a.signalDate || a.date || '').getTime());

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quantitative Signals</h1>
          <p className="text-gray-500">Track hard data points and traction metrics.</p>
        </div>
        <div className="flex space-x-3">
          <select 
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" /> Log Signal
          </button>
        </div>
      </header>

      {/* Signal List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search signals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredSignals.length > 0 ? (
            filteredSignals.map((signal) => (
              <div key={signal.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                      <SignalIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{signal.type}</h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Activity className="h-4 w-4 mr-1" />
                          Source: {signal.source}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(signal.signalDate || signal.date || ''), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{signal.value}</div>
                      <div className="flex items-center justify-end text-xs font-medium text-green-600 mt-1">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Captured
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteSignal(signal.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Signal"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <SignalIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No signals logged</h3>
              <p className="text-gray-500 mt-1">Start tracking metrics to show your traction.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Log Signal</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddSignal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signal Type / Metric</label>
                <select 
                  required
                  value={newSignal.type}
                  onChange={(e) => setNewSignal({...newSignal, type: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {signalTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (Number)</label>
                  <input 
                    required
                    type="text"
                    value={newSignal.value}
                    onChange={(e) => setNewSignal({...newSignal, value: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., 1200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input 
                    required
                    type="date"
                    value={newSignal.date}
                    onChange={(e) => setNewSignal({...newSignal, date: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source / Proof</label>
                <input 
                  required
                  type="text"
                  value={newSignal.source}
                  onChange={(e) => setNewSignal({...newSignal, source: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., Stripe Dashboard, Google Analytics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  rows={2}
                  value={newSignal.notes}
                  onChange={(e) => setNewSignal({...newSignal, notes: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Additional context..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 shadow-sm"
                >
                  Save Signal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signals;
