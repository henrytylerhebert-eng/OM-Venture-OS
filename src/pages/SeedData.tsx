import React from 'react';
import {
  OM_STARTER_COMPANIES,
  OM_STARTER_CONNECTIONS,
  OM_STARTER_FEEDBACK,
  OM_STARTER_MEETING_REQUESTS,
  OM_STARTER_MENTORS,
  OM_STARTER_PEOPLE,
  OM_STARTER_SEED_GAPS,
  REMOVED_FAKE_SEED_FIXTURES,
} from '../lib/omStarterSeed';

const SeedData: React.FC = () => {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <header className="space-y-3">
        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
          OM Starter Seed
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Fake browser seeding is retired. Only approved OM starter records belong here now.
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-slate-600">
          The old invented startup/demo pack has been removed. Use the deterministic admin seed script
          to write the approved OM-shaped starter records, and use this page as the internal registry of
          what is real, what is deferred, and what must stay empty until actual Builder evidence exists.
        </p>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Seed command</h2>
            <p className="text-sm leading-6 text-slate-600">
              Run the approved seed path from the repo root with Firebase admin credentials available in
              your environment. This script writes deterministic IDs and leaves Builder evidence empty on
              purpose.
            </p>
          </div>
          <div className="space-y-2 text-right">
            <code className="block rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              npm run seed:om-starter
            </code>
            <code className="block rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              npm run cleanup:fake-seed
            </code>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Removing the old fake browser seeder did not auto-delete any legacy demo docs already written to
          Firestore. Use the cleanup script in dry-run mode first, then only use the execute mode if the
          matched records are clearly the known fake fixtures.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Companies</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{OM_STARTER_COMPANIES.length}</p>
          <p className="mt-2 text-sm text-slate-500">Approved real company records for the starter seed.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">People</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{OM_STARTER_PEOPLE.length}</p>
          <p className="mt-2 text-sm text-slate-500">Founders, mentors, staff, and personnel tied to real source rows.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mentors</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{OM_STARTER_MENTORS.length}</p>
          <p className="mt-2 text-sm text-slate-500">Official mentor profiles plus lightweight request-history profiles.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meeting Requests</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{OM_STARTER_MEETING_REQUESTS.length}</p>
          <p className="mt-2 text-sm text-slate-500">Approved mentor request history ready for Firestore.</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Registry-Only Rows</p>
          <p className="mt-3 text-3xl font-semibold text-amber-950">
            {OM_STARTER_FEEDBACK.length + OM_STARTER_CONNECTIONS.length}
          </p>
          <p className="mt-2 text-sm text-amber-800/80">Approved real rows that stay deferred until the schema can hold them cleanly.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Seedable Now</h2>
          <p className="mt-1 text-sm text-slate-500">
            These records map cleanly into the current repo-native collections without inventing Builder evidence.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Companies</h3>
              <div className="mt-3 space-y-3">
                {OM_STARTER_COMPANIES.map((company) => (
                  <div key={company.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{company.displayName}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {company.programContext}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Source: {company.sourceTable}</p>
                    {company.founderLeadName ? (
                      <p className="mt-1 text-sm text-slate-600">Founder lead from source: {company.founderLeadName}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Mentors</h3>
              <div className="mt-3 space-y-3">
                {OM_STARTER_MENTORS.map((mentor) => (
                  <div key={mentor.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">{mentor.name}</p>
                    <p className="mt-1 text-sm text-slate-600">Source: {mentor.sourceTable}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Expertise: {mentor.expertiseAreas.length > 0 ? mentor.expertiseAreas.join(', ') : 'Held empty until approved expertise is available in-source.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Operational Records Preserved</h2>
          <p className="mt-1 text-sm text-slate-500">
            These are the approved real workflow rows that shape the seed state without faking venture proof.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Meeting Requests</h3>
              <div className="mt-3 space-y-3">
                {OM_STARTER_MEETING_REQUESTS.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{request.founderName}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{request.mentorName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.sourceTable}
                      {request.cohort ? ` · ${request.cohort}` : ''}
                      {request.locationContext ? ` · ${request.locationContext}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">People</h3>
              <div className="mt-3 max-h-[22rem] space-y-3 overflow-auto pr-2">
                {OM_STARTER_PEOPLE.map((person) => (
                  <div key={person.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{person.fullName}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {person.roleLabel.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{person.sourceTable}</p>
                    {person.companyName ? (
                      <p className="mt-1 text-sm text-slate-600">Company context: {person.companyName}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">Registry-Only For Now</h2>
          <p className="mt-1 text-sm text-amber-800/80">
            These rows are approved and preserved, but the current repo should not force them into Firestore yet.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Feedback</h3>
              <div className="mt-3 space-y-3">
                {OM_STARTER_FEEDBACK.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                    <p className="font-semibold text-slate-950">
                      {item.founderName} · {item.mentorName}
                    </p>
                    {item.companyName ? (
                      <p className="mt-1 text-sm text-slate-600">{item.companyName}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-600">Source: {item.sourceTable}</p>
                    <p className="mt-2 text-sm text-amber-900">{item.deferredReason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Connections</h3>
              <div className="mt-3 space-y-3">
                {OM_STARTER_CONNECTIONS.map((connection) => (
                  <div key={connection.id} className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                    <p className="font-semibold text-slate-950">{connection.connection}</p>
                    <p className="mt-1 text-sm text-slate-600">{connection.status}</p>
                    <p className="mt-1 text-sm text-slate-600">{connection.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-rose-950">Fake Fixtures Removed</h2>
            <p className="mt-1 text-sm text-rose-800/80">
              These invented demo rows were removed from the seed path and should not come back.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {REMOVED_FAKE_SEED_FIXTURES.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Intentional Seed Gaps</h2>
            <p className="mt-1 text-sm text-slate-500">
              These gaps are correct. They keep the seed state honest instead of looking more validated than the real data supports.
            </p>

            <div className="mt-6 space-y-3">
              {OM_STARTER_SEED_GAPS.map((gap) => (
                <div key={gap.label} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{gap.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{gap.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SeedData;
