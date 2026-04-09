import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  QueryConstraint,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AssignmentStatus, Person, Mentor, MentorAssignment, MentorCompanyScope } from '../types';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';

const buildMentorCompanyScopeId = (mentorId: string, companyId: string) => `${mentorId}__${companyId}`;

const pickMostRecentAssignment = (assignments: MentorAssignment[]) =>
  assignments
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    })[0];

const syncMentorCompanyScope = async ({
  mentorId,
  companyId,
}: {
  mentorId: string;
  companyId: string;
}): Promise<void> => {
  const now = new Date().toISOString();
  const scopeId = buildMentorCompanyScopeId(mentorId, companyId);

  try {
    const assignmentsSnapshot = await getDocs(
      query(
        collection(db, 'mentorAssignments'),
        where('mentorId', '==', mentorId),
        where('companyId', '==', companyId)
      )
    );
    const assignments = assignmentsSnapshot.docs.map(
      (assignmentDoc) => ({ id: assignmentDoc.id, ...assignmentDoc.data() } as MentorAssignment)
    );

    if (assignments.length === 0) {
      return;
    }

    const activeAssignments = assignments.filter(
      (assignment) => assignment.status === AssignmentStatus.ACTIVE
    );
    const scopeSourceAssignment =
      pickMostRecentAssignment(activeAssignments) || pickMostRecentAssignment(assignments);
    const scopeRef = doc(db, 'mentorCompanyScopes', scopeId);
    const existingScope = await getDoc(scopeRef);
    const existingCreatedAt = existingScope.exists()
      ? (existingScope.data() as Partial<MentorCompanyScope>).createdAt
      : undefined;

    await setDoc(
      scopeRef,
      sanitizeData({
        mentorId,
        companyId,
        mentorAssignmentId: scopeSourceAssignment.id,
        active: activeAssignments.length > 0,
        createdAt: existingCreatedAt || scopeSourceAssignment.createdAt || now,
        updatedAt: now,
      } satisfies Omit<MentorCompanyScope, 'id'>),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mentorCompanyScopes/${scopeId}`);
  }
};

// People
export const getPeople = (callback: (people: Person[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'people'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const people = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
    callback(people);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'people'));
};

export const getPerson = async (id: string): Promise<Person | null> => {
  try {
    const docRef = doc(db, 'people', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Person) : null;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, `people/${id}`);
  }
};

export const createPerson = async (person: Omit<Person, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'people'), sanitizeData(person));
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, 'people');
  }
};

export const updatePerson = async (id: string, data: Partial<Person>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'people', id), sanitizeData(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `people/${id}`);
  }
};

// Mentors
export const getMentors = (callback: (mentors: Mentor[]) => void) => {
  const q = query(collection(db, 'mentors'));
  return onSnapshot(q, (snapshot) => {
    const mentors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mentor));
    callback(mentors);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'mentors'));
};

// Mentor Assignments
export const getMentorAssignments = (callback: (assignments: MentorAssignment[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'mentorAssignments'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MentorAssignment));
    callback(assignments);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'mentorAssignments'));
};

export const getMentorCompanyScopes = (
  callback: (scopes: MentorCompanyScope[]) => void,
  constraints: QueryConstraint[] = []
) => {
  const q = query(collection(db, 'mentorCompanyScopes'), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const scopes = snapshot.docs.map(
        (scopeDoc) => ({ id: scopeDoc.id, ...scopeDoc.data() } as MentorCompanyScope)
      );
      callback(scopes);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'mentorCompanyScopes')
  );
};

export const assignMentor = async (assignment: Omit<MentorAssignment, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'mentorAssignments'), sanitizeData(assignment));
    await syncMentorCompanyScope({
      mentorId: assignment.mentorId,
      companyId: assignment.companyId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'mentorAssignments');
  }
};

export const updateMentorAssignment = async (
  id: string,
  data: Partial<MentorAssignment> & Pick<MentorAssignment, 'mentorId' | 'companyId'>
): Promise<void> => {
  const updatedAt = new Date().toISOString();

  try {
    await updateDoc(doc(db, 'mentorAssignments', id), sanitizeData({ ...data, updatedAt }));
    await syncMentorCompanyScope({
      mentorId: data.mentorId,
      companyId: data.companyId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mentorAssignments/${id}`);
  }
};
