import 'dotenv/config';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY_RUN = !process.argv.includes('--execute');

const FAKE_COMPANY_NAMES = new Set(['TechFlow Systems', 'GreenGrid Energy']);
const FAKE_PERSON_NAMES = new Set(['Alice Founder', 'Bob Founder', 'Charlie Mentor', 'Dana Mentor']);
const FAKE_COHORT_NAMES = new Set(['Builder 1.0 Spring 2026', 'Builder 2.0 Summer 2026']);
const MANUAL_REVIEW_NAMES = {
  organizations: new Set(['Opportunity Machine']),
  people: new Set(['OM Admin', 'OM Staff']),
};

type CollectionName =
  | 'organizations'
  | 'people'
  | 'companies'
  | 'mentors'
  | 'mentorAssignments'
  | 'cohorts'
  | 'cohortApplications'
  | 'cohortParticipations'
  | 'meetingRequests'
  | 'feedback'
  | 'readinessReviews'
  | 'portfolioProgress'
  | 'interviews'
  | 'patterns'
  | 'assumptions'
  | 'experiments'
  | 'signals'
  | 'sourceSubmissions'
  | 'ingestionReviewQueue';

interface MatchedRecord {
  id: string;
  reason: string;
}

interface ManualReviewRecord {
  id: string;
  reason: string;
}

const COLLECTIONS_TO_SCAN: CollectionName[] = [
  'organizations',
  'people',
  'companies',
  'mentors',
  'mentorAssignments',
  'cohorts',
  'cohortApplications',
  'cohortParticipations',
  'meetingRequests',
  'feedback',
  'readinessReviews',
  'portfolioProgress',
  'interviews',
  'patterns',
  'assumptions',
  'experiments',
  'signals',
  'sourceSubmissions',
  'ingestionReviewQueue',
];

const readAppletConfig = () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const configPath = resolve(currentDir, '../firebase-applet-config.json');
  return JSON.parse(readFileSync(configPath, 'utf8')) as {
    projectId: string;
    firestoreDatabaseId: string;
  };
};

const buildCredential = () => {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount?.trim()) {
    return cert(JSON.parse(rawServiceAccount));
  }

  return applicationDefault();
};

const exactName = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const exactKnownFixtureText = (value: unknown) => {
  const normalized = exactName(value);
  return (
    FAKE_COMPANY_NAMES.has(normalized) ||
    FAKE_PERSON_NAMES.has(normalized) ||
    FAKE_COHORT_NAMES.has(normalized)
  );
};

const addMatch = (
  target: Map<CollectionName, MatchedRecord[]>,
  collection: CollectionName,
  id: string,
  reason: string
) => {
  const current = target.get(collection) || [];
  if (current.some((record) => record.id === id)) {
    return;
  }
  current.push({ id, reason });
  target.set(collection, current);
};

const addManualReview = (
  target: Map<CollectionName, ManualReviewRecord[]>,
  collection: CollectionName,
  id: string,
  reason: string
) => {
  const current = target.get(collection) || [];
  if (current.some((record) => record.id === id)) {
    return;
  }
  current.push({ id, reason });
  target.set(collection, current);
};

const main = async () => {
  const appletConfig = readAppletConfig();
  const app =
    getApps()[0] ||
    initializeApp({
      credential: buildCredential(),
      projectId: appletConfig.projectId,
    });
  const db = getFirestore(app, appletConfig.firestoreDatabaseId);

  const scans = new Map<CollectionName, Array<{ id: string; data: Record<string, unknown> }>>();

  for (const collectionName of COLLECTIONS_TO_SCAN) {
    const snapshot = await db.collection(collectionName).get();
    scans.set(
      collectionName,
      snapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data() as Record<string, unknown>,
      }))
    );
  }

  const matches = new Map<CollectionName, MatchedRecord[]>();
  const manualReview = new Map<CollectionName, ManualReviewRecord[]>();

  const companies = scans.get('companies') || [];
  const people = scans.get('people') || [];
  const cohorts = scans.get('cohorts') || [];
  const organizations = scans.get('organizations') || [];
  const mentors = scans.get('mentors') || [];

  const fakeCompanyIds = new Set<string>();
  const fakePersonIds = new Set<string>();
  const fakeCohortIds = new Set<string>();
  const fakeOrganizationIds = new Set<string>();
  const fakeMentorDocIds = new Set<string>();

  for (const record of companies) {
    const name = exactName(record.data.name);
    if (FAKE_COMPANY_NAMES.has(name)) {
      fakeCompanyIds.add(record.id);
      addMatch(matches, 'companies', record.id, `Exact fake company name match: "${name}"`);
    }
  }

  for (const record of people) {
    const fullName = exactName(record.data.fullName);
    if (FAKE_PERSON_NAMES.has(fullName)) {
      fakePersonIds.add(record.id);
      addMatch(matches, 'people', record.id, `Exact fake person name match: "${fullName}"`);
    } else if (MANUAL_REVIEW_NAMES.people.has(fullName)) {
      addManualReview(
        manualReview,
        'people',
        record.id,
        `Potential legacy browser-seed person "${fullName}" cannot be deleted safely without explicit provenance.`
      );
    }
  }

  for (const record of cohorts) {
    const name = exactName(record.data.name);
    if (FAKE_COHORT_NAMES.has(name)) {
      fakeCohortIds.add(record.id);
      addMatch(matches, 'cohorts', record.id, `Exact fake cohort name match: "${name}"`);
    }
  }

  for (const record of organizations) {
    const name = exactName(record.data.name);
    if (FAKE_COMPANY_NAMES.has(name)) {
      fakeOrganizationIds.add(record.id);
      addMatch(matches, 'organizations', record.id, `Exact fake organization name match: "${name}"`);
    } else if (MANUAL_REVIEW_NAMES.organizations.has(name)) {
      addManualReview(
        manualReview,
        'organizations',
        record.id,
        `Potential legacy browser-seed organization "${name}" cannot be deleted safely without explicit provenance.`
      );
    }
  }

  for (const record of mentors) {
    const personId = exactName(record.data.personId);
    if (fakePersonIds.has(personId)) {
      fakeMentorDocIds.add(record.id);
      addMatch(matches, 'mentors', record.id, `Mentor profile linked to fake person id "${personId}"`);
    }
  }

  const childLinkRules: Array<{
    collection: CollectionName;
    matcher: (record: { id: string; data: Record<string, unknown> }) => string | null;
  }> = [
    {
      collection: 'mentorAssignments',
      matcher: (record) => {
        const { companyId, founderPersonId, mentorId } = record.data;
        if (fakeCompanyIds.has(exactName(companyId))) {
          return `mentorAssignments.companyId linked to fake company id "${companyId}"`;
        }
        if (fakePersonIds.has(exactName(founderPersonId))) {
          return `mentorAssignments.founderPersonId linked to fake person id "${founderPersonId}"`;
        }
        if (fakePersonIds.has(exactName(mentorId)) || fakeMentorDocIds.has(exactName(mentorId))) {
          return `mentorAssignments.mentorId linked to fake mentor fixture "${mentorId}"`;
        }
        return null;
      },
    },
    {
      collection: 'meetingRequests',
      matcher: (record) => {
        const { companyId, founderPersonId, mentorId, mentorAssignmentId } = record.data;
        if (fakeCompanyIds.has(exactName(companyId))) {
          return `meetingRequests.companyId linked to fake company id "${companyId}"`;
        }
        if (fakePersonIds.has(exactName(founderPersonId))) {
          return `meetingRequests.founderPersonId linked to fake person id "${founderPersonId}"`;
        }
        if (fakePersonIds.has(exactName(mentorId)) || fakeMentorDocIds.has(exactName(mentorId))) {
          return `meetingRequests.mentorId linked to fake mentor fixture "${mentorId}"`;
        }
        const assignmentMatches =
          (matches.get('mentorAssignments') || []).some((match) => match.id === exactName(mentorAssignmentId));
        if (assignmentMatches) {
          return `meetingRequests.mentorAssignmentId linked to matched fake mentor assignment "${mentorAssignmentId}"`;
        }
        return null;
      },
    },
    {
      collection: 'feedback',
      matcher: (record) => {
        const { companyId, founderPersonId, mentorId, meetingRequestId } = record.data;
        if (fakeCompanyIds.has(exactName(companyId))) {
          return `feedback.companyId linked to fake company id "${companyId}"`;
        }
        if (fakePersonIds.has(exactName(founderPersonId))) {
          return `feedback.founderPersonId linked to fake person id "${founderPersonId}"`;
        }
        if (fakePersonIds.has(exactName(mentorId)) || fakeMentorDocIds.has(exactName(mentorId))) {
          return `feedback.mentorId linked to fake mentor fixture "${mentorId}"`;
        }
        const requestMatches = (matches.get('meetingRequests') || []).some(
          (match) => match.id === exactName(meetingRequestId)
        );
        if (requestMatches) {
          return `feedback.meetingRequestId linked to matched fake meeting request "${meetingRequestId}"`;
        }
        return null;
      },
    },
    {
      collection: 'cohortApplications',
      matcher: (record) => {
        const { companyId, founderPersonId, requestedCohortId } = record.data;
        if (fakeCompanyIds.has(exactName(companyId))) {
          return `cohortApplications.companyId linked to fake company id "${companyId}"`;
        }
        if (fakePersonIds.has(exactName(founderPersonId))) {
          return `cohortApplications.founderPersonId linked to fake person id "${founderPersonId}"`;
        }
        if (fakeCohortIds.has(exactName(requestedCohortId))) {
          return `cohortApplications.requestedCohortId linked to fake cohort id "${requestedCohortId}"`;
        }
        return null;
      },
    },
    {
      collection: 'cohortParticipations',
      matcher: (record) => {
        const { companyId, founderLeadPersonId, cohortId } = record.data;
        if (fakeCompanyIds.has(exactName(companyId))) {
          return `cohortParticipations.companyId linked to fake company id "${companyId}"`;
        }
        if (fakePersonIds.has(exactName(founderLeadPersonId))) {
          return `cohortParticipations.founderLeadPersonId linked to fake person id "${founderLeadPersonId}"`;
        }
        if (fakeCohortIds.has(exactName(cohortId))) {
          return `cohortParticipations.cohortId linked to fake cohort id "${cohortId}"`;
        }
        return null;
      },
    },
    {
      collection: 'readinessReviews',
      matcher: (record) =>
        fakeCompanyIds.has(exactName(record.data.companyId))
          ? `readinessReviews.companyId linked to fake company id "${record.data.companyId}"`
          : null,
    },
    {
      collection: 'portfolioProgress',
      matcher: (record) =>
        fakeCompanyIds.has(exactName(record.data.companyId))
          ? `portfolioProgress.companyId linked to fake company id "${record.data.companyId}"`
          : null,
    },
    {
      collection: 'interviews',
      matcher: (record) =>
        fakeCompanyIds.has(exactName(record.data.companyId))
          ? `interviews.companyId linked to fake company id "${record.data.companyId}"`
          : null,
    },
    {
      collection: 'patterns',
      matcher: (record) =>
        fakeCompanyIds.has(exactName(record.data.companyId))
          ? `patterns.companyId linked to fake company id "${record.data.companyId}"`
          : null,
    },
    {
      collection: 'assumptions',
      matcher: (record) =>
        fakeCompanyIds.has(exactName(record.data.companyId))
          ? `assumptions.companyId linked to fake company id "${record.data.companyId}"`
          : null,
    },
    {
      collection: 'experiments',
      matcher: (record) =>
        fakeCompanyIds.has(exactName(record.data.companyId))
          ? `experiments.companyId linked to fake company id "${record.data.companyId}"`
          : null,
    },
    {
      collection: 'signals',
      matcher: (record) =>
        fakeCompanyIds.has(exactName(record.data.companyId))
          ? `signals.companyId linked to fake company id "${record.data.companyId}"`
          : null,
    },
    {
      collection: 'sourceSubmissions',
      matcher: (record) => {
        const fields = [
          record.data.matchedCompanyId,
          record.data.matchedPersonId,
          record.data.sourceCompanyText,
          record.data.sourceFounderText,
          record.data.sourceSubmitterName,
        ];
        if (fakeCompanyIds.has(exactName(record.data.matchedCompanyId))) {
          return `sourceSubmissions.matchedCompanyId linked to fake company id "${record.data.matchedCompanyId}"`;
        }
        if (fakePersonIds.has(exactName(record.data.matchedPersonId))) {
          return `sourceSubmissions.matchedPersonId linked to fake person id "${record.data.matchedPersonId}"`;
        }
        const exactTextMatch = fields.find((value) => exactKnownFixtureText(value));
        if (exactTextMatch) {
          return `sourceSubmissions raw/source text exactly matches known fake fixture "${exactTextMatch}"`;
        }
        return null;
      },
    },
  ];

  for (const rule of childLinkRules) {
    const records = scans.get(rule.collection) || [];
    for (const record of records) {
      const reason = rule.matcher(record);
      if (reason) {
        addMatch(matches, rule.collection, record.id, reason);
      }
    }
  }

  const fakeSourceSubmissionIds = new Set((matches.get('sourceSubmissions') || []).map((record) => record.id));
  for (const record of scans.get('ingestionReviewQueue') || []) {
    const sourceSubmissionId = exactName(record.data.sourceSubmissionId);
    if (fakeSourceSubmissionIds.has(sourceSubmissionId)) {
      addMatch(
        matches,
        'ingestionReviewQueue',
        record.id,
        `ingestionReviewQueue.sourceSubmissionId linked to matched fake source submission "${sourceSubmissionId}"`
      );
    }
  }

  const totalMatched = Array.from(matches.values()).reduce((sum, records) => sum + records.length, 0);
  const totalManual = Array.from(manualReview.values()).reduce((sum, records) => sum + records.length, 0);

  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'execute'}`);
  console.log(`Collections scanned: ${COLLECTIONS_TO_SCAN.join(', ')}`);

  for (const collectionName of COLLECTIONS_TO_SCAN) {
    const records = matches.get(collectionName) || [];
    if (records.length === 0) {
      continue;
    }

    console.log(`\n[${collectionName}] ${records.length} record(s) matched`);
    for (const record of records) {
      console.log(`- ${record.id}: ${record.reason}`);
    }
  }

  if (totalManual > 0) {
    console.log('\nManual review items');
    for (const collectionName of COLLECTIONS_TO_SCAN) {
      const records = manualReview.get(collectionName) || [];
      if (records.length === 0) {
        continue;
      }
      console.log(`[${collectionName}] ${records.length} record(s)`);
      for (const record of records) {
        console.log(`- ${record.id}: ${record.reason}`);
      }
    }
  }

  let deletedCount = 0;
  if (!DRY_RUN && totalMatched > 0) {
    let activeBatch = db.batch();
    let operationCount = 0;

    for (const collectionName of COLLECTIONS_TO_SCAN) {
      const records = matches.get(collectionName) || [];
      for (const record of records) {
        if (operationCount === 450) {
          await activeBatch.commit();
          activeBatch = db.batch();
          operationCount = 0;
        }

        activeBatch.delete(db.collection(collectionName).doc(record.id));
        operationCount += 1;
        deletedCount += 1;
      }
    }

    if (operationCount > 0) {
      await activeBatch.commit();
    }
  }

  console.log('\nSummary');
  console.log(`- Records matched: ${totalMatched}`);
  console.log(`- Records deleted: ${DRY_RUN ? 0 : deletedCount}`);
  console.log(`- Manual-review leftovers: ${totalManual}`);

  if (DRY_RUN) {
    console.log('- Dry-run only. No records were deleted.');
    console.log('- Re-run with --execute to delete only the matched records above.');
  }
};

main().catch((error) => {
  console.error('Failed to inspect or clean legacy fake demo records.');
  console.error(
    'Provide FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS before running this script.'
  );
  console.error(error);
  process.exitCode = 1;
});
