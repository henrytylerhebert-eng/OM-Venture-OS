import { collection, doc, query, onSnapshot, updateDoc, addDoc, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { Cohort, CohortApplication, CohortParticipation, DecisionStatus, ParticipationStatus } from '../types';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';

// Cohorts
export const getCohorts = (callback: (cohorts: Cohort[]) => void) => {
  const q = query(collection(db, 'cohorts'));
  return onSnapshot(q, (snapshot) => {
    const cohorts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cohort));
    callback(cohorts);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'cohorts'));
};

// Applications
export const getApplications = (callback: (apps: CohortApplication[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'cohortApplications'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CohortApplication));
    callback(apps);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'cohortApplications'));
};

export const submitApplication = async (app: Omit<CohortApplication, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'cohortApplications'), sanitizeData(app));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'cohortApplications');
  }
};

export const updateApplicationStatus = async (id: string, decision: DecisionStatus, decidedByPersonId?: string): Promise<void> => {
  try {
    await updateDoc(
      doc(db, 'cohortApplications', id),
      sanitizeData({
        decision,
        decidedByPersonId,
        decidedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `cohortApplications/${id}`);
  }
};

export const approveCohortApplication = async (app: CohortApplication, decidedByPersonId: string): Promise<void> => {
  try {
    // 1. Update application status
    await updateApplicationStatus(app.id, DecisionStatus.APPROVED, decidedByPersonId);

    // 2. Create participation record
    const participation: Omit<CohortParticipation, 'id'> = {
      companyId: app.companyId,
      cohortId: app.requestedCohortId,
      founderLeadPersonId: app.founderPersonId,
      status: ParticipationStatus.ACTIVE,
      joinDate: new Date().toISOString(),
      interviewTarget: 20, // Default target
      interviewCount: 0,
      graduationReady: false,
      nextProgramEligible: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'cohortParticipations'), sanitizeData(participation));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'cohortParticipations');
  }
};

// Participations
export const getCohortParticipations = (callback: (participations: CohortParticipation[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'cohortParticipations'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const participations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CohortParticipation));
    callback(participations);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'cohortParticipations'));
};
