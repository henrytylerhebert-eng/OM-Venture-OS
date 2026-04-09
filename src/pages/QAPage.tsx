import React from 'react';

const QAPage: React.FC = () => {
  const tests = [
    {
      role: 'OM Admin',
      actions: [
        'Approve a pending company (updates membershipStatus to active)',
        'Approve a cohort application (creates participation record)',
        'Assign a mentor to a company',
        'Update a company stage only when a real stage judgment exists (updates PortfolioProgress)',
        'Create a readiness review and verify that no review means undecided, not ready'
      ]
    },
    {
      role: 'Founder',
      actions: [
        'Register a new startup (membershipStatus: pending)',
        'Request a cohort review (creates cohortApplication)',
        'Log only real Builder evidence (interviews first, then synthesis and tests if they actually exist)',
        'Verify they can only see their own startup(s)',
        'Verify they cannot edit official readiness/stage'
      ]
    },
    {
      role: 'Mentor',
      actions: [
        'View assigned startups only',
        'Submit scoped feedback/notes for a meeting without turning sparse evidence into readiness',
        'Verify they cannot see other companies'
      ]
    },
    {
      role: 'Unassigned User',
      actions: [
        'Verify they see the "Profile Not Found" message',
        'Verify they cannot access /companies or /cohorts'
      ]
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Phase 1 QA Checklist</h1>
      <p className="text-gray-600 mb-8">
        Use this page to verify that role-based access control, the OM starter seed, and sparse-evidence surfaces are functioning honestly.
      </p>

      <div className="space-y-8">
        {tests.map((test, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-indigo-600 mb-4">{test.role} Tests</h2>
            <ul className="space-y-3">
              {test.actions.map((action, actionIdx) => (
                <li key={actionIdx} className="flex items-start">
                  <input type="checkbox" className="mt-1 mr-3 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                  <span className="text-gray-700">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-indigo-50 rounded-lg border border-indigo-100">
        <h3 className="text-lg font-bold text-indigo-900 mb-2">Testing Instructions</h3>
        <ol className="list-decimal list-inside text-sm text-indigo-800 space-y-2">
          <li>If legacy fake browser-seed docs may still exist, run <code className="bg-indigo-100 px-1 rounded">npm run cleanup:fake-seed</code> first and review the dry-run output before any execute pass.</li>
          <li>Run <code className="bg-indigo-100 px-1 rounded">npm run seed:om-starter</code> from the repo root with Firebase admin credentials configured.</li>
          <li>Use <code className="bg-indigo-100 px-1 rounded">/seed</code> as the read-only registry of approved OM starter records and deferred gaps.</li>
          <li>Expect interviews, patterns, assumptions, experiments, signals, readiness reviews, and portfolio progress to remain empty unless real Builder evidence has been entered.</li>
          <li>Log in as different users (you may need to manually update the <code className="bg-indigo-100 px-1 rounded">users</code> collection in Firestore to change your own role for testing).</li>
          <li>Verify that the navigation menu changes based on your role.</li>
          <li>Try to access restricted URLs directly (e.g., <code className="bg-indigo-100 px-1 rounded">/companies</code> as a founder).</li>
        </ol>
      </div>
    </div>
  );
};

export default QAPage;
