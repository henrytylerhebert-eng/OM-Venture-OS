import { collection, doc, query, onSnapshot, updateDoc, addDoc, QueryConstraint, where } from 'firebase/firestore';
import { db } from '../firebase';
import { PortfolioProgress, ReadinessReview } from '../types';
import { handleFirestoreError, OperationType } from './baseService';

// Portfolio Progress
export const getPortfolioProgress = (callback: (progress: PortfolioProgress[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'portfolioProgress'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const progress = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PortfolioProgress));
    callback(progress);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'portfolioProgress'));
};

export const updatePortfolioProgress = async (id: string, data: Partial<PortfolioProgress>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'portfolioProgress', id), { ...data, updatedAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `portfolioProgress/${id}`);
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
