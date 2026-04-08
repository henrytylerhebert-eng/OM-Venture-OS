import { collection, doc, getDoc, query, onSnapshot, updateDoc, addDoc, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { Person, Mentor, MentorAssignment } from '../types';
import { handleFirestoreError, OperationType } from './baseService';

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
    const docRef = await addDoc(collection(db, 'people'), person);
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, 'people');
  }
};

export const updatePerson = async (id: string, data: Partial<Person>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'people', id), data);
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

export const assignMentor = async (assignment: Omit<MentorAssignment, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'mentorAssignments'), assignment);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'mentorAssignments');
  }
};
