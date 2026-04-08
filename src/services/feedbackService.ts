import { collection, query, onSnapshot, addDoc, QueryConstraint, where } from 'firebase/firestore';
import { db } from '../firebase';
import { MeetingRequest, Feedback } from '../types';
import { handleFirestoreError, OperationType } from './baseService';

// Meeting Requests
export const getMeetingRequests = (callback: (requests: MeetingRequest[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'meetingRequests'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRequest));
    callback(requests);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'meetingRequests'));
};

export const createMeetingRequest = async (request: Omit<MeetingRequest, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'meetingRequests'), request);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'meetingRequests');
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
