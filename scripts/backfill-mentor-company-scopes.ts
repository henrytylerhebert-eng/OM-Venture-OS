import 'dotenv/config';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AssignmentStatus, MentorAssignment, MentorCompanyScope } from '../src/types';

const DRY_RUN = !process.argv.includes('--execute');

const buildMentorCompanyScopeId = (mentorId: string, companyId: string) => `${mentorId}__${companyId}`;

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

const hasCredentialConfiguration = () =>
  Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());

const pickMostRecentAssignment = (assignments: MentorAssignment[]) =>
  assignments
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    })[0];

const main = async () => {
  const now = new Date().toISOString();

  if (!hasCredentialConfiguration()) {
    console.error(
      'Missing admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS before running mentorCompanyScopes backfill.'
    );
    process.exitCode = 1;
    return;
  }

  const appletConfig = readAppletConfig();
  const app =
    getApps()[0] ||
    initializeApp({
      credential: buildCredential(),
      projectId: appletConfig.projectId,
    });
  const db = getFirestore(app, appletConfig.firestoreDatabaseId);

  const assignmentsSnapshot = await db.collection('mentorAssignments').get();
  const scopeSnapshot = await db.collection('mentorCompanyScopes').get();

  const assignmentGroups = new Map<string, MentorAssignment[]>();
  const skippedAssignments: Array<{ id: string; reason: string }> = [];

  for (const assignmentDoc of assignmentsSnapshot.docs) {
    const assignment = { id: assignmentDoc.id, ...assignmentDoc.data() } as MentorAssignment;
    if (!assignment.mentorId || !assignment.companyId) {
      skippedAssignments.push({
        id: assignmentDoc.id,
        reason: 'Missing mentorId or companyId; cannot derive deterministic scope id safely.',
      });
      continue;
    }

    const scopeId = buildMentorCompanyScopeId(assignment.mentorId, assignment.companyId);
    const current = assignmentGroups.get(scopeId) || [];
    current.push(assignment);
    assignmentGroups.set(scopeId, current);
  }

  const existingScopes = new Map<string, MentorCompanyScope>();
  for (const scopeDoc of scopeSnapshot.docs) {
    existingScopes.set(scopeDoc.id, { id: scopeDoc.id, ...scopeDoc.data() } as MentorCompanyScope);
  }

  const plannedUpserts: Array<{
    scopeId: string;
    reason: string;
    data: Omit<MentorCompanyScope, 'id'>;
  }> = [];
  const manualReview: Array<{ id: string; reason: string }> = [...skippedAssignments];

  for (const [scopeId, assignments] of assignmentGroups.entries()) {
    const activeAssignments = assignments.filter(
      (assignment) => assignment.status === AssignmentStatus.ACTIVE
    );
    const scopeSourceAssignment =
      pickMostRecentAssignment(activeAssignments) || pickMostRecentAssignment(assignments);
    const existingScope = existingScopes.get(scopeId);

    if (!scopeSourceAssignment) {
      manualReview.push({
        id: scopeId,
        reason: 'No source assignment available after grouping; review this mentor-company pair manually.',
      });
      continue;
    }

    const desiredScope: Omit<MentorCompanyScope, 'id'> = {
      mentorId: scopeSourceAssignment.mentorId,
      companyId: scopeSourceAssignment.companyId,
      mentorAssignmentId: scopeSourceAssignment.id,
      active: activeAssignments.length > 0,
      createdAt: existingScope?.createdAt || scopeSourceAssignment.createdAt || now,
      updatedAt: now,
    };

    const requiresUpsert =
      !existingScope ||
      existingScope.mentorAssignmentId !== desiredScope.mentorAssignmentId ||
      existingScope.active !== desiredScope.active ||
      existingScope.companyId !== desiredScope.companyId ||
      existingScope.mentorId !== desiredScope.mentorId;

    if (requiresUpsert) {
      plannedUpserts.push({
        scopeId,
        reason: existingScope
          ? `Scope will be updated to reflect ${activeAssignments.length} active assignment(s) across ${assignments.length} total assignment(s).`
          : `Scope will be created from ${assignments.length} assignment(s), including ${activeAssignments.length} active assignment(s).`,
        data: desiredScope,
      });
    }
  }

  for (const [scopeId, scope] of existingScopes.entries()) {
    if (!assignmentGroups.has(scopeId)) {
      manualReview.push({
        id: scopeId,
        reason: `Existing mentorCompanyScope has no backing mentorAssignments records. Review before deleting or revoking manually.`,
      });
    }
  }

  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'execute'}`);
  console.log(`mentorAssignments scanned: ${assignmentsSnapshot.size}`);
  console.log(`mentorCompanyScopes scanned: ${scopeSnapshot.size}`);
  console.log(`mentor-company pairs found: ${assignmentGroups.size}`);
  console.log(
    `pairs with active assignments: ${Array.from(assignmentGroups.values()).filter((assignments) =>
      assignments.some((assignment) => assignment.status === AssignmentStatus.ACTIVE)
    ).length}`
  );
  console.log(`scope upserts planned: ${plannedUpserts.length}`);
  console.log(`manual review items: ${manualReview.length}`);

  for (const plan of plannedUpserts) {
    console.log(
      `- ${plan.scopeId}: ${plan.reason} active=${String(plan.data.active)} mentorAssignmentId=${plan.data.mentorAssignmentId}`
    );
  }

  for (const item of manualReview) {
    console.log(`! ${item.id}: ${item.reason}`);
  }

  if (DRY_RUN) {
    console.log('Dry run complete. Use "npm run backfill:mentor-company-scopes:execute" once admin credentials are available.');
    return;
  }

  for (const plan of plannedUpserts) {
    await db.collection('mentorCompanyScopes').doc(plan.scopeId).set(plan.data, { merge: true });
  }

  console.log(`mentorCompanyScopes upserted: ${plannedUpserts.length}`);
};

main().catch((error) => {
  console.error('Failed to backfill mentorCompanyScopes.', error);
  process.exitCode = 1;
});
