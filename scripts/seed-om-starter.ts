import 'dotenv/config';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AssignmentStatus,
  AssignmentType,
  Company,
  MeetingRequest,
  MeetingStatus,
  MembershipStatus,
  Mentor,
  MentorAssignment,
  Organization,
  OrganizationType,
  Person,
  RoleType,
} from '../src/types';
import {
  OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
  OM_SEED_OM_ORGANIZATION_ID,
  OM_SEED_STAFF_ID,
  OM_STARTER_COMPANIES,
  OM_STARTER_CONNECTIONS,
  OM_STARTER_FEEDBACK,
  OM_STARTER_MEETING_REQUESTS,
  OM_STARTER_MENTORS,
  OM_STARTER_PEOPLE,
} from '../src/lib/omStarterSeed';

const now = new Date().toISOString();

const sanitizeData = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeData(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, sanitizeData(entryValue)])
    ) as T;
  }

  return value;
};

const roleTypeByLabel: Record<(typeof OM_STARTER_PEOPLE)[number]['roleLabel'], RoleType> = {
  om_admin: RoleType.OM_ADMIN,
  om_staff: RoleType.OM_STAFF,
  founder: RoleType.FOUNDER,
  startup_team: RoleType.STARTUP_TEAM,
  mentor: RoleType.MENTOR,
  personnel: RoleType.STARTUP_TEAM,
};

const orgNameFallbackById: Record<string, { name: string; type: OrganizationType; sourceTable: string }> = {
  [OM_SEED_OM_ORGANIZATION_ID]: {
    name: 'Opportunity Machine',
    type: OrganizationType.OM,
    sourceTable: 'Approved internal seed operator',
  },
  [OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID]: {
    name: 'Opportunity Machine Mentor Network',
    type: OrganizationType.MENTOR_ORG,
    sourceTable: 'Mentors-Grid view / Meeting Requests-ALL Meeting Status',
  },
  org_villa_creative: {
    name: 'Villa Creative, Inc.',
    type: OrganizationType.STARTUP,
    sourceTable: 'Personnel-Active Personnel',
  },
  org_om_tech_interns_fall_2025: {
    name: 'OM Tech Interns - Fall 2025',
    type: OrganizationType.PARTNER,
    sourceTable: 'Personnel-Active Personnel',
  },
};

const meetingStatusMap: Record<(typeof OM_STARTER_MEETING_REQUESTS)[number]['status'], MeetingStatus> = {
  scheduled: MeetingStatus.SCHEDULED,
  completed: MeetingStatus.COMPLETED,
};

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

const buildOrganizations = (): Array<{ id: string; data: Omit<Organization, 'id'> }> => {
  const organizations = new Map<string, Omit<Organization, 'id'>>();

  organizations.set(OM_SEED_OM_ORGANIZATION_ID, {
    name: 'Opportunity Machine',
    type: OrganizationType.OM,
    active: true,
    notes: 'Approved OM starter seed operator record.',
    createdAt: now,
    updatedAt: now,
  });

  organizations.set(OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID, {
    name: 'Opportunity Machine Mentor Network',
    type: OrganizationType.MENTOR_ORG,
    active: true,
    notes:
      'Approved OM starter seed support organization for external mentors represented in Airtable Mentors and Meeting Requests source tables.',
    createdAt: now,
    updatedAt: now,
  });

  for (const company of OM_STARTER_COMPANIES) {
    organizations.set(company.organizationId, {
      name: company.name,
      type: OrganizationType.STARTUP,
      website: company.website,
      active: true,
      notes: `Seed provenance: Airtable "${company.sourceTable}". Program context: ${company.programContext}.${company.sourceNotes ? ` ${company.sourceNotes}` : ''}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const person of OM_STARTER_PEOPLE) {
    if (organizations.has(person.organizationId)) {
      continue;
    }

    const fallback = orgNameFallbackById[person.organizationId];
    if (!fallback) {
      continue;
    }

    organizations.set(person.organizationId, {
      name: fallback.name,
      type: fallback.type,
      active: true,
      notes: `Seed provenance: Airtable "${fallback.sourceTable}".`,
      createdAt: now,
      updatedAt: now,
    });
  }

  return Array.from(organizations.entries()).map(([id, data]) => ({ id, data: sanitizeData(data) }));
};

const buildCompanies = (): Array<{ id: string; data: Omit<Company, 'id'> }> =>
  OM_STARTER_COMPANIES.map((company) => ({
    id: company.id,
    data: sanitizeData({
      name: company.name,
      organizationId: company.organizationId,
      founderLeadPersonId: company.founderLeadPersonId,
      description: company.programContext,
      website: company.website,
      membershipStatus: company.membershipStatus,
      active: true,
      createdAt: now,
      updatedAt: now,
    }),
  }));

const buildPeople = (): Array<{ id: string; data: Omit<Person, 'id'> }> =>
  OM_STARTER_PEOPLE.map((person) => ({
    id: person.id,
    data: sanitizeData({
      firstName: person.firstName,
      lastName: person.lastName,
      fullName: person.fullName,
      primaryEmail: person.seedEmail,
      organizationId: person.organizationId,
      roleType: roleTypeByLabel[person.roleLabel],
      title:
        person.title ||
        (person.roleLabel === 'mentor'
          ? 'Mentor'
          : person.roleLabel === 'founder'
            ? 'Founder'
            : person.roleLabel === 'om_admin'
              ? 'OM Admin'
              : person.roleLabel === 'om_staff'
                ? 'OM Staff'
                : undefined),
      active: true,
      createdAt: now,
      updatedAt: now,
    }),
  }));

const buildMentors = (): Array<{ id: string; data: Omit<Mentor, 'id'> }> =>
  OM_STARTER_MENTORS.map((mentor) => ({
    id: mentor.id,
    data: sanitizeData({
      personId: mentor.personId,
      organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
      expertiseAreas: mentor.expertiseAreas,
      stageFit: [],
      shareEmail: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    }),
  }));

const buildMentorAssignments = (): Array<{ id: string; data: Omit<MentorAssignment, 'id'> }> =>
  OM_STARTER_MEETING_REQUESTS.map((request) => ({
    id: `assignment_${request.companyId}_${request.mentorPersonId}`,
    data: sanitizeData({
      companyId: request.companyId,
      founderPersonId: request.founderPersonId,
      mentorId: request.mentorPersonId,
      assignedByPersonId: OM_SEED_STAFF_ID,
      assignmentType: AssignmentType.STAFF_MATCHED,
      goal: `Approved mentor support context from ${request.sourceTable}.`,
      status: request.status === 'completed' ? AssignmentStatus.COMPLETED : AssignmentStatus.ACTIVE,
      startDate: request.meetingDate,
      endDate: request.status === 'completed' ? request.meetingDate : undefined,
      createdAt: now,
      updatedAt: now,
    }),
  }));

const buildMeetingRequests = (): Array<{ id: string; data: Omit<MeetingRequest, 'id'> }> =>
  OM_STARTER_MEETING_REQUESTS.map((request) => ({
    id: request.id,
    data: sanitizeData({
      companyId: request.companyId,
      founderPersonId: request.founderPersonId,
      mentorId: request.mentorPersonId,
      mentorAssignmentId: `assignment_${request.companyId}_${request.mentorPersonId}`,
      requestedByPersonId: request.founderPersonId,
      programContext: `${request.sourceTable}${request.cohort ? ` | cohort: ${request.cohort}` : ''}${request.locationContext ? ` | ${request.locationContext}` : ''}`,
      status: meetingStatusMap[request.status],
      meetingDate: request.meetingDate,
      notes: `Approved OM starter seed meeting request for ${request.founderName} with ${request.mentorName}.`,
      followUpNeeded: false,
      createdAt: now,
      updatedAt: now,
    }),
  }));

const main = async () => {
  const appletConfig = readAppletConfig();
  const app =
    getApps()[0] ||
    initializeApp({
      credential: buildCredential(),
      projectId: appletConfig.projectId,
    });

  const db = getFirestore(app, appletConfig.firestoreDatabaseId);
  const batch = db.batch();

  for (const organization of buildOrganizations()) {
    batch.set(db.collection('organizations').doc(organization.id), organization.data, { merge: true });
  }

  for (const person of buildPeople()) {
    batch.set(db.collection('people').doc(person.id), person.data, { merge: true });
  }

  for (const company of buildCompanies()) {
    batch.set(db.collection('companies').doc(company.id), company.data, { merge: true });
  }

  for (const mentor of buildMentors()) {
    batch.set(db.collection('mentors').doc(mentor.id), mentor.data, { merge: true });
  }

  for (const assignment of buildMentorAssignments()) {
    batch.set(db.collection('mentorAssignments').doc(assignment.id), assignment.data, { merge: true });
  }

  for (const request of buildMeetingRequests()) {
    batch.set(db.collection('meetingRequests').doc(request.id), request.data, { merge: true });
  }

  await batch.commit();

  console.log('Seeded approved OM starter records with deterministic ids.');
  console.log(`Organizations: ${buildOrganizations().length}`);
  console.log(`People: ${OM_STARTER_PEOPLE.length}`);
  console.log(`Companies: ${OM_STARTER_COMPANIES.length}`);
  console.log(`Mentors: ${OM_STARTER_MENTORS.length}`);
  console.log(`Mentor assignments: ${OM_STARTER_MEETING_REQUESTS.length}`);
  console.log(`Meeting requests: ${OM_STARTER_MEETING_REQUESTS.length}`);
  console.log(`Deferred feedback rows preserved in registry only: ${OM_STARTER_FEEDBACK.length}`);
  console.log(`Deferred connection rows preserved in registry only: ${OM_STARTER_CONNECTIONS.length}`);
  console.log('Builder evidence, readiness reviews, and progress records were intentionally left empty.');
};

main().catch((error) => {
  console.error('Failed to seed approved OM starter records.');
  console.error(
    'Provide FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS before running this script.'
  );
  console.error(error);
  process.exitCode = 1;
});
