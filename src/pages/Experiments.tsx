import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import {
  getExperiments,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  getAssumptions,
  getPatterns,
  summarizePatternWidgets,
} from '../services/evidenceService';
import { getCompanies } from '../services/companyService';
import { Experiment, Company, TestType, Assumption, AssumptionStatus, Pattern, RoleType } from '../types';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { getRoleScopedPath } from '../lib/roleRouting';

const Experiments: React.FC = () => {
  const { profile } = useAuth();
  const isFounder = profile?.role === RoleType.FOUNDER || profile?.role === RoleType.STARTUP_TEAM;
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newExperiment, setNewExperiment] = useState({
    hypothesis: '',
    testType: TestType.LANDING_PAGE,
    channel: '',
    offer: '',
    successMetric: '',
    assumptionId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
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
    
    const unsubExperiments = getExperiments(setExperiments, selectedCompanyId);
    const unsubAssumptions = getAssumptions(setAssumptions, selectedCompanyId);
    const unsubPatterns = getPatterns(setPatterns, selectedCompanyId);
    
    return () => {
      unsubExperiments();
      unsubAssumptions();
      unsubPatterns();
    };
  }, [selectedCompanyId]);

  const strongestPattern = useMemo(
    () => summarizePatternWidgets(patterns).strongestPattern,
    [patterns]
  );
  const weakestAssumption = useMemo(
    () =>
      assumptions
        .slice()
        .sort(
          (left, right) =>
            right.priorityScore - left.priorityScore ||
            right.importanceScore - left.importanceScore ||
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )
        .find((assumption) => assumption.status !== AssumptionStatus.VALIDATED) || assumptions[0],
    [assumptions]
  );
  const liveTestPath = getRoleScopedPath(profile?.role, 'signals');
  const patternsPath = getRoleScopedPath(profile?.role, 'patterns');
  const primaryExperiment = useMemo(
    () =>
      experiments
        .slice()
        .sort((left, right) => {
          if (left.active !== right.active) {
            return left.active ? -1 : 1;
          }

          return new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime();
        })[0],
    [experiments]
  );
  const canStartExperiment = !isFounder || Boolean(strongestPattern && weakestAssumption);
  const canMoveToLiveTest = !isFounder || Boolean(primaryExperiment && primaryExperiment.successMetric?.trim());

  const openNewExperiment = () => {
    setNewExperiment({
      hypothesis: weakestAssumption
        ? `Test whether ${weakestAssumption.statement}`
        : '',
      testType: TestType.LANDING_PAGE,
      channel: '',
      offer: '',
      successMetric: '',
      assumptionId: weakestAssumption?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setShowAddModal(true);
  };

  const handleAddExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    await createExperiment({
      companyId: selectedCompanyId,
      hypothesis: newExperiment.hypothesis,
      testType: newExperiment.testType,
      channel: newExperiment.channel,
      offer: newExperiment.offer,
      successMetric: newExperiment.successMetric,
      assumptionId: newExperiment.assumptionId || undefined,
      active: true,
      startDate: new Date(newExperiment.startDate).toISOString(),
      endDate: newExperiment.endDate ? new Date(newExperiment.endDate).toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setNewExperiment({
      hypothesis: '',
      testType: TestType.LANDING_PAGE,
      channel: '',
      offer: '',
      successMetric: '',
      assumptionId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    });
    setShowAddModal(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updateExperiment(id, { active: !currentActive, updatedAt: new Date().toISOString() });
  };

  const handleDeleteExperiment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this experiment?')) {
      await deleteExperiment(id);
    }
  };

  const filteredExperiments = experiments.filter(e => 
    e.hypothesis.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8">
      {isFounder && selectedCompanyId && (
        <>
          <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">Patterns &amp; Assumptions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="rounded-full bg-sky-900 px-3 py-1 text-white">MVP / Test Design</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-sky-200">Live Test</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Design only the smallest test that helps you learn next.</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                    This step should inherit the strongest repeated pain and the weakest remaining assumption. Keep the test intent narrow enough that a live signal can prove or weaken one real belief.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Guardrail</p>
                <p className="mt-2 max-w-xs">
                  Do not turn this into a backlog. One clear risk, one clear test, one clear success metric.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Patterns handoff</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    The test design should stay anchored to repeated truth from synthesis, not widen back out into generic product planning.
                  </p>
                </div>
                <Link
                  to={patternsPath}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-400"
                >
                  Review Patterns
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Strongest repeated pain</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {strongestPattern?.problemTheme || 'No strong pattern is set yet'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {strongestPattern
                      ? `${strongestPattern.numberOfMentions} mentions, avg pain ${strongestPattern.averagePainIntensity}, status ${strongestPattern.status}.`
                      : 'Stay in synthesis until a repeated pain is clear enough to trust.'}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Weakest assumption</p>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {weakestAssumption?.statement || 'No ranked assumption yet'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {weakestAssumption
                      ? 'This is the risk the next test should resolve first.'
                      : 'Map and rank the key risk before moving into test design.'}
                  </p>
                </div>
              </div>

              {!canStartExperiment && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                  MVP / Test Design is still thin because synthesis is incomplete. Come in with at least one strong pattern and one ranked assumption so the next test has a real learning target.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Live Test handoff</h2>
              <p className="mt-1 text-sm text-slate-500">
                Once a test is designed, Live Test should inherit the test intent and the success metric without reinterpreting them.
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Current test intent:</span>{' '}
                  {primaryExperiment?.hypothesis || 'No active test intent is defined yet.'}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Success metric to carry forward:</span>{' '}
                  {primaryExperiment?.successMetric || 'No success metric is defined yet.'}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Test type in motion:</span>{' '}
                  {primaryExperiment ? primaryExperiment.testType.replace(/_/g, ' ') : 'No live test is in motion yet.'}
                </div>
                <Link
                  to={liveTestPath}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    canMoveToLiveTest
                      ? 'bg-slate-950 text-white hover:bg-slate-800'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                  )}
                  onClick={(event) => {
                    if (!canMoveToLiveTest) {
                      event.preventDefault();
                    }
                  }}
                >
                  Open Live Test
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isFounder ? 'MVP / Test Design' : 'Validation Experiments'}</h1>
          <p className="text-gray-500">
            {isFounder
              ? 'Turn synthesis into one focused test with a clear learning target and a clear success metric.'
              : 'Run structured tests to validate or invalidate risky assumptions.'}
          </p>
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
            onClick={openNewExperiment}
            disabled={!canStartExperiment}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium flex items-center',
              canStartExperiment
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
            )}
          >
            <Plus className="h-4 w-4 mr-1" /> New Experiment
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {experiments.filter(e => e.active).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {experiments.filter(e => !e.active && e.result).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{isFounder ? 'Signals Ready' : 'Success Rate'}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {isFounder
              ? experiments.filter(e => Boolean(e.successMetric?.trim())).length
              : experiments.filter(e => !e.active && e.result === 'success').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Run</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{experiments.length}</p>
        </div>
      </div>

      {/* Experiment List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search experiments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredExperiments.length > 0 ? (
            filteredExperiments.map((e) => (
              <div key={e.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={cn(
                      "p-3 rounded-xl",
                      e.active ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400"
                    )}>
                      <FlaskConical className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-gray-900">{e.hypothesis}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          e.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {e.active ? 'Active' : 'Completed'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center"><Target className="h-3 w-3 mr-1" /> {e.testType.replace('_', ' ')}</span>
                        {e.channel && <span className="flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> {e.channel}</span>}
                        <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" /> {format(new Date(e.startDate || ''), 'MMM d, yyyy')}</span>
                        {e.assumptionId && (
                          <span className="flex items-center text-indigo-600 font-medium">
                            <LinkIcon className="h-3 w-3 mr-1" /> 
                            {assumptions.find(a => a.id === e.assumptionId)?.statement.substring(0, 30)}...
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Success Metric</p>
                          <p className="text-sm text-gray-700 mt-1">{e.successMetric || 'Not specified'}</p>
                        </div>
                        {e.result && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Result</p>
                            <p className="text-sm text-gray-700 mt-1">{e.result}</p>
                          </div>
                        )}
                        {e.learning && (
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Key Learning</p>
                            <p className="text-sm text-gray-700 mt-1">{e.learning}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button 
                      onClick={() => handleToggleActive(e.id, e.active)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        e.active ? "text-gray-400 hover:text-green-600 hover:bg-green-50" : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                      )}
                      title={e.active ? "Mark as Completed" : "Mark as Active"}
                    >
                      {e.active ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </button>
                    <button 
                      onClick={() => handleDeleteExperiment(e.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Experiment"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                {isFounder ? 'No test design is recorded yet' : 'No experiments yet'}
              </h3>
              <p className="text-gray-500 mt-1">
                {isFounder
                  ? canStartExperiment
                    ? 'Start with one focused test tied to the weakest assumption, then carry its intent into Live Test.'
                    : 'Patterns and assumptions still need sharpening before this step becomes useful.'
                  : 'Start testing your assumptions with structured experiments.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Experiment</h2>
                {isFounder && (
                  <p className="mt-1 text-sm text-gray-500">
                    Keep this tied to one assumption and one measurable success metric.
                  </p>
                )}
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddExperiment} className="p-6 space-y-6">
              {isFounder && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Strongest repeated pain:</span> {strongestPattern?.problemTheme || 'No strong pattern set yet'}</p>
                  <p className="mt-2"><span className="font-semibold text-slate-900">Weakest assumption:</span> {weakestAssumption?.statement || 'No assumption ranked yet'}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hypothesis</label>
                <textarea 
                  required
                  rows={2}
                  value={newExperiment.hypothesis}
                  onChange={(e) => setNewExperiment({...newExperiment, hypothesis: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., If we offer a 20% discount on the landing page, then 5% of visitors will sign up for the waitlist."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                  <select 
                    value={newExperiment.testType}
                    onChange={(e) => setNewExperiment({...newExperiment, testType: e.target.value as TestType})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {Object.values(TestType).map(type => (
                      <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Assumption</label>
                  <select 
                    value={newExperiment.assumptionId}
                    onChange={(e) => setNewExperiment({...newExperiment, assumptionId: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">No Assumption Linked</option>
                    {assumptions.map(a => (
                      <option key={a.id} value={a.id}>{a.statement.substring(0, 50)}...</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel (e.g., LinkedIn Ads)</label>
                  <input 
                    type="text"
                    value={newExperiment.channel}
                    onChange={(e) => setNewExperiment({...newExperiment, channel: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer (e.g., Free Trial)</label>
                  <input 
                    type="text"
                    value={newExperiment.offer}
                    onChange={(e) => setNewExperiment({...newExperiment, offer: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Success Metric (e.g., 5% conversion rate)</label>
                <input 
                  type="text"
                  required
                  value={newExperiment.successMetric}
                  onChange={(e) => setNewExperiment({...newExperiment, successMetric: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input 
                    type="date"
                    required
                    value={newExperiment.startDate}
                    onChange={(e) => setNewExperiment({...newExperiment, startDate: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                  <input 
                    type="date"
                    value={newExperiment.endDate}
                    onChange={(e) => setNewExperiment({...newExperiment, endDate: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
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
                  {isFounder ? 'Save test design' : 'Launch Experiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Experiments;
