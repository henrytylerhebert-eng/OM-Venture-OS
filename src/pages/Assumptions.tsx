import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { getAssumptions, createAssumption, updateAssumption, deleteAssumption } from '../services/evidenceService';
import { getCompanies } from '../services/companyService';
import { Assumption, Company, AssumptionType, AssumptionStatus } from '../types';
import { 
  Lightbulb, 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  BarChart3,
  ArrowUpRight,
  Filter,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';

const Assumptions: React.FC = () => {
  const { profile } = useAuth();
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newAssumption, setNewAssumption] = useState({
    statement: '',
    type: AssumptionType.DESIRABILITY,
    importanceScore: 5,
    evidenceScore: 0,
  });

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
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    return () => unsubAssumptions();
  }, [selectedCompanyId]);

  const handleAddAssumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    await createAssumption({
      companyId: selectedCompanyId,
      statement: newAssumption.statement,
      type: newAssumption.type,
      importanceScore: newAssumption.importanceScore,
      evidenceScore: newAssumption.evidenceScore,
      priorityScore: newAssumption.importanceScore + (10 - newAssumption.evidenceScore),
      status: AssumptionStatus.UNKNOWN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setNewAssumption({
      statement: '',
      type: AssumptionType.DESIRABILITY,
      importanceScore: 5,
      evidenceScore: 0,
    });
    setShowAddModal(false);
  };

  const handleUpdateStatus = async (id: string, status: AssumptionStatus) => {
    await updateAssumption(id, { status, updatedAt: new Date().toISOString() });
  };

  const handleDeleteAssumption = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this assumption?')) {
      await deleteAssumption(id);
    }
  };

  const filteredAssumptions = assumptions.filter(a => 
    a.statement.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risky Assumptions</h1>
          <p className="text-gray-500">Identify and prioritize the biggest risks to your business model.</p>
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
            <Plus className="h-4 w-4 mr-1" /> Add Assumption
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{assumptions.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Validated</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {assumptions.filter(a => a.status === AssumptionStatus.VALIDATED).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Invalidated</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {assumptions.filter(a => a.status === AssumptionStatus.INVALIDATED).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Unknown</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {assumptions.filter(a => a.status === AssumptionStatus.UNKNOWN).length}
          </p>
        </div>
      </div>

      {/* Assumption List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search assumptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredAssumptions.length > 0 ? (
            filteredAssumptions.map((a) => (
              <div key={a.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      a.type === AssumptionType.DESIRABILITY ? "bg-blue-50 text-blue-600" :
                      a.type === AssumptionType.FEASIBILITY ? "bg-green-50 text-green-600" :
                      "bg-purple-50 text-purple-600"
                    )}>
                      <Lightbulb className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-gray-900">{a.statement}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                          a.status === AssumptionStatus.VALIDATED ? "bg-green-100 text-green-700" :
                          a.status === AssumptionStatus.INVALIDATED ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 capitalize">
                        {a.type} Assumption • Priority Score: {a.priorityScore}
                      </p>
                      
                      <div className="mt-4 grid grid-cols-2 gap-8 max-w-md">
                        <div>
                          <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                            <span>Importance</span>
                            <span>{a.importanceScore}/10</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-gray-400 h-full rounded-full" style={{ width: `${a.importanceScore * 10}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                            <span>Evidence</span>
                            <span>{a.evidenceScore}/10</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${a.evidenceScore * 10}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => handleUpdateStatus(a.id, AssumptionStatus.VALIDATED)}
                      className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                      title="Mark as Validated"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(a.id, AssumptionStatus.INVALIDATED)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Mark as Invalidated"
                    >
                      <AlertCircle className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(a.id, AssumptionStatus.UNKNOWN)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Mark as Unknown"
                    >
                      <HelpCircle className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAssumption(a.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Assumption"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No assumptions identified</h3>
              <p className="text-gray-500 mt-1">Start mapping your business model risks.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add Assumption</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddAssumption} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assumption Statement</label>
                <textarea 
                  required
                  rows={3}
                  value={newAssumption.statement}
                  onChange={(e) => setNewAssumption({...newAssumption, statement: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., Customers are willing to pay $50/month for automated reporting."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select 
                  value={newAssumption.type}
                  onChange={(e) => setNewAssumption({...newAssumption, type: e.target.value as AssumptionType})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value={AssumptionType.DESIRABILITY}>Desirability (Do they want it?)</option>
                  <option value={AssumptionType.VIABILITY}>Viability (Should we do it?)</option>
                  <option value={AssumptionType.FEASIBILITY}>Feasibility (Can we do it?)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importance (1-10)</label>
                  <input 
                    type="range"
                    min="1"
                    max="10"
                    value={newAssumption.importanceScore}
                    onChange={(e) => setNewAssumption({...newAssumption, importanceScore: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span className="font-bold text-indigo-600">{newAssumption.importanceScore}</span>
                    <span>Critical</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Evidence (0-10)</label>
                  <input 
                    type="range"
                    min="0"
                    max="10"
                    value={newAssumption.evidenceScore}
                    onChange={(e) => setNewAssumption({...newAssumption, evidenceScore: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>None</span>
                    <span className="font-bold text-indigo-600">{newAssumption.evidenceScore}</span>
                    <span>Strong</span>
                  </div>
                </div>
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
                  Save Assumption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assumptions;
