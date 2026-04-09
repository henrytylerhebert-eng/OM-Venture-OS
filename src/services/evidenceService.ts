import { collection, doc, query, onSnapshot, updateDoc, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Interview, Pattern, Assumption, Experiment, Signal, PatternStatus, StageConfidence } from '../types';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';
import {
  normalizePatternRecord,
  preparePatternWritePayload,
  summarizePatternWidgets,
  type PatternWidgetSummary,
} from '../lib/patternUtils';

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeInterview = (interview: Partial<Interview> & { id: string }): Interview => ({
  id: interview.id,
  companyId: typeof interview.companyId === 'string' ? interview.companyId : '',
  cohortParticipationId:
    typeof interview.cohortParticipationId === 'string' && interview.cohortParticipationId.trim()
      ? interview.cohortParticipationId
      : undefined,
  interviewerPersonId: typeof interview.interviewerPersonId === 'string' ? interview.interviewerPersonId : '',
  intervieweeName: typeof interview.intervieweeName === 'string' ? interview.intervieweeName.trim() : '',
  intervieweeSegment: typeof interview.intervieweeSegment === 'string' ? interview.intervieweeSegment.trim() : '',
  interviewSource: typeof interview.interviewSource === 'string' ? interview.interviewSource.trim() : '',
  interviewDate: typeof interview.interviewDate === 'string' ? interview.interviewDate : '',
  problemTheme: typeof interview.problemTheme === 'string' ? interview.problemTheme.trim() : '',
  painIntensity: clampNumber(
    typeof interview.painIntensity === 'number' && Number.isFinite(interview.painIntensity)
      ? interview.painIntensity
      : 0,
    0,
    5
  ),
  mentionSpontaneous: Boolean(interview.mentionSpontaneous),
  currentAlternative: typeof interview.currentAlternative === 'string' ? interview.currentAlternative.trim() : '',
  bestQuote: typeof interview.bestQuote === 'string' ? interview.bestQuote.trim() : '',
  followUpNeeded: Boolean(interview.followUpNeeded),
  notes: typeof interview.notes === 'string' ? interview.notes.trim() : '',
  countsTowardMinimum: Boolean(interview.countsTowardMinimum),
  createdAt: typeof interview.createdAt === 'string' ? interview.createdAt : '',
  updatedAt:
    typeof interview.updatedAt === 'string'
      ? interview.updatedAt
      : typeof interview.createdAt === 'string'
        ? interview.createdAt
        : '',
});

const hasRequiredPatternFields = (data: Partial<Pattern>): data is Omit<Pattern, 'id'> =>
  typeof data.companyId === 'string' &&
  typeof data.problemTheme === 'string' &&
  typeof data.numberOfMentions === 'number' &&
  typeof data.averagePainIntensity === 'number' &&
  typeof data.unpromptedMentions === 'number' &&
  typeof data.representativeQuote === 'string' &&
  typeof data.confidence === 'string' &&
  typeof data.status === 'string' &&
  Array.isArray(data.sourceInterviewIds) &&
  typeof data.createdByPersonId === 'string' &&
  typeof data.createdAt === 'string' &&
  typeof data.updatedAt === 'string';

export type { PatternWidgetSummary };
export { preparePatternWritePayload, summarizePatternWidgets };

// Interviews
export const getInterviews = (callback: (interviews: Interview[]) => void, companyId?: string) => {
  const constraints = companyId ? [where('companyId', '==', companyId)] : [];
  const q = query(collection(db, 'interviews'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const interviews = snapshot.docs.map(doc => normalizeInterview({ id: doc.id, ...doc.data() } as Interview));
    callback(interviews);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'interviews'));
};

export const createInterview = async (interview: Omit<Interview, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'interviews'), sanitizeData(interview));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'interviews');
  }
};

export const updateInterview = async (id: string, data: Partial<Interview>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'interviews', id), sanitizeData(data));
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
export const listPatternsByCompany = (callback: (patterns: Pattern[]) => void, companyId: string) => {
  const q = query(collection(db, 'patterns'), where('companyId', '==', companyId));
  return onSnapshot(q, (snapshot) => {
    const patterns = snapshot.docs.map(doc => normalizePatternRecord({ id: doc.id, ...doc.data() } as Pattern));
    callback(patterns);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'patterns'));
};

export const listPatternsForStaffReview = (callback: (patterns: Pattern[]) => void) => {
  const q = query(collection(db, 'patterns'));
  return onSnapshot(q, (snapshot) => {
    const patterns = snapshot.docs.map(doc => normalizePatternRecord({ id: doc.id, ...doc.data() } as Pattern));
    callback(patterns);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'patterns'));
};

export const getPatterns = (callback: (patterns: Pattern[]) => void, companyId?: string) => {
  if (companyId) {
    return listPatternsByCompany(callback, companyId);
  }

  return listPatternsForStaffReview(callback);
};

export const createPattern = async (pattern: Omit<Pattern, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'patterns'), sanitizeData(preparePatternWritePayload(pattern)));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'patterns');
  }
};

export const updatePattern = async (id: string, data: Partial<Pattern>): Promise<void> => {
  try {
    await updateDoc(
      doc(db, 'patterns', id),
      sanitizeData(hasRequiredPatternFields(data) ? preparePatternWritePayload(data) : data)
    );
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
    await addDoc(collection(db, 'assumptions'), sanitizeData(assumption));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'assumptions');
  }
};

export const updateAssumption = async (id: string, data: Partial<Assumption>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'assumptions', id), sanitizeData(data));
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
    await addDoc(collection(db, 'experiments'), sanitizeData(experiment));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'experiments');
  }
};

export const updateExperiment = async (id: string, data: Partial<Experiment>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'experiments', id), sanitizeData(data));
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
    await addDoc(collection(db, 'signals'), sanitizeData(signal));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'signals');
  }
};

export const updateSignal = async (id: string, data: Partial<Signal>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'signals', id), sanitizeData(data));
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
