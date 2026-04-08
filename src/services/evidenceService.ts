import { collection, doc, query, onSnapshot, updateDoc, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Interview, Pattern, Assumption, Experiment, Signal } from '../types';
import { handleFirestoreError, OperationType } from './baseService';

// Interviews
export const getInterviews = (callback: (interviews: Interview[]) => void, companyId?: string) => {
  const constraints = companyId ? [where('companyId', '==', companyId)] : [];
  const q = query(collection(db, 'interviews'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const interviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interview));
    callback(interviews);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'interviews'));
};

export const createInterview = async (interview: Omit<Interview, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'interviews'), interview);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'interviews');
  }
};

export const updateInterview = async (id: string, data: Partial<Interview>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'interviews', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `interviews/${id}`);
  }
};

export const deleteInterview = async (id: string): Promise<void> => {
  try {
    // Note: We'd normally use a deleteDoc tool if available, but we can use updateDoc to mark as inactive or just use standard firestore delete
    // For now, let's assume we want to actually delete it for this discovery phase
    const { deleteDoc: firestoreDelete } = await import('firebase/firestore');
    await firestoreDelete(doc(db, 'interviews', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `interviews/${id}`);
  }
};

// Patterns
export const getPatterns = (callback: (patterns: Pattern[]) => void, companyId?: string) => {
  const constraints = companyId ? [where('companyId', '==', companyId)] : [];
  const q = query(collection(db, 'patterns'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const patterns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pattern));
    callback(patterns);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'patterns'));
};

export const createPattern = async (pattern: Omit<Pattern, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'patterns'), pattern);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'patterns');
  }
};

export const updatePattern = async (id: string, data: Partial<Pattern>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'patterns', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `patterns/${id}`);
  }
};

export const deletePattern = async (id: string): Promise<void> => {
  try {
    const { deleteDoc: firestoreDelete } = await import('firebase/firestore');
    await firestoreDelete(doc(db, 'patterns', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `patterns/${id}`);
  }
};

// Assumptions
export const getAssumptions = (callback: (assumptions: Assumption[]) => void, companyId: string) => {
  const q = query(collection(db, 'assumptions'), where('companyId', '==', companyId));
  return onSnapshot(q, (snapshot) => {
    const assumptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assumption));
    callback(assumptions);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'assumptions'));
};

export const createAssumption = async (assumption: Omit<Assumption, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'assumptions'), assumption);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'assumptions');
  }
};

export const updateAssumption = async (id: string, data: Partial<Assumption>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'assumptions', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `assumptions/${id}`);
  }
};

export const deleteAssumption = async (id: string): Promise<void> => {
  try {
    const { deleteDoc: firestoreDelete } = await import('firebase/firestore');
    await firestoreDelete(doc(db, 'assumptions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `assumptions/${id}`);
  }
};

// Experiments
export const getExperiments = (callback: (experiments: Experiment[]) => void, companyId: string) => {
  const q = query(collection(db, 'experiments'), where('companyId', '==', companyId));
  return onSnapshot(q, (snapshot) => {
    const experiments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Experiment));
    callback(experiments);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'experiments'));
};

export const createExperiment = async (experiment: Omit<Experiment, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'experiments'), experiment);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'experiments');
  }
};

export const updateExperiment = async (id: string, data: Partial<Experiment>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'experiments', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `experiments/${id}`);
  }
};

export const deleteExperiment = async (id: string): Promise<void> => {
  try {
    const { deleteDoc: firestoreDelete } = await import('firebase/firestore');
    await firestoreDelete(doc(db, 'experiments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `experiments/${id}`);
  }
};

// Signals
export const getSignals = (callback: (signals: Signal[]) => void, companyId: string) => {
  const q = query(collection(db, 'signals'), where('companyId', '==', companyId));
  return onSnapshot(q, (snapshot) => {
    const signals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Signal));
    callback(signals);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'signals'));
};

export const createSignal = async (signal: Omit<Signal, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'signals'), signal);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'signals');
  }
};

export const updateSignal = async (id: string, data: Partial<Signal>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'signals', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `signals/${id}`);
  }
};

export const deleteSignal = async (id: string): Promise<void> => {
  try {
    const { deleteDoc: firestoreDelete } = await import('firebase/firestore');
    await firestoreDelete(doc(db, 'signals', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `signals/${id}`);
  }
};
