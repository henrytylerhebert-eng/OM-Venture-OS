import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  UserProfile, 
  Company, 
  Cohort, 
  CohortApplication, 
  CohortParticipation, 
  MentorAssignment, 
  Feedback, 
  UserRole,
  Interview,
  Pattern,
  Assumption,
  Experiment,
  Signal,
  ReadinessReview
} from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
};

export const createUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await setDoc(doc(db, 'users', profile.uid), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${profile.uid}`);
  }
};

// Companies
export const getCompanies = (callback: (companies: Company[]) => void) => {
  const q = query(collection(db, 'companies'));
  return onSnapshot(q, (snapshot) => {
    const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    callback(companies);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'companies'));
};

export const getCompany = async (id: string): Promise<Company | null> => {
  try {
    const docRef = doc(db, 'companies', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Company) : null;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, `companies/${id}`);
  }
};

export const createCompany = async (company: Omit<Company, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'companies'), company);
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, 'companies');
  }
};

export const updateCompany = async (id: string, data: Partial<Company>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'companies', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `companies/${id}`);
  }
};

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
    await addDoc(collection(db, 'cohortApplications'), app);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'cohortApplications');
  }
};

export const updateApplicationStatus = async (id: string, status: 'approved' | 'denied'): Promise<void> => {
  try {
    await updateDoc(doc(db, 'cohortApplications', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `cohortApplications/${id}`);
  }
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
    // Use a deterministic ID to prevent duplicate assignments and for security rules check
    const id = `${assignment.mentorUid}_${assignment.companyId}`;
    await setDoc(doc(db, 'mentorAssignments', id), assignment);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'mentorAssignments');
  }
};

// Feedback
export const getFeedback = (callback: (feedback: Feedback[]) => void, companyId: string) => {
  const q = query(collection(db, 'feedback'), where('companyId', '==', companyId));
  return onSnapshot(q, (snapshot) => {
    const feedback = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
    callback(feedback);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'feedback'));
};

export const submitFeedback = async (feedback: Omit<Feedback, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'feedback'), feedback);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'feedback');
  }
};

// Phase 2: Evidence Engine

// Interviews
export const getInterviews = (callback: (interviews: Interview[]) => void, companyId: string) => {
  const q = query(collection(db, 'interviews'), where('companyId', '==', companyId));
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

// Patterns
export const getPatterns = (callback: (patterns: Pattern[]) => void, companyId: string) => {
  const q = query(collection(db, 'patterns'), where('companyId', '==', companyId));
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

// Readiness Reviews
export const getReadinessReviews = (callback: (reviews: ReadinessReview[]) => void, companyId: string) => {
  const q = query(collection(db, 'readinessReviews'), where('companyId', '==', companyId));
  return onSnapshot(q, (snapshot) => {
    const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadinessReview));
    callback(reviews);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'readinessReviews'));
};

export const createReadinessReview = async (review: Omit<ReadinessReview, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'readinessReviews'), review);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'readinessReviews');
  }
};
