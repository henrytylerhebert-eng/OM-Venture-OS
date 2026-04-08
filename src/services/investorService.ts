import { collection, query, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { InvestorOrganization, InvestorReviewAccess, InvestorPipeline } from '../types';
import { handleFirestoreError, OperationType } from './baseService';

// Investor Organizations
export const getInvestorOrganizations = (callback: (orgs: InvestorOrganization[]) => void) => {
  const q = query(collection(db, 'investorOrganizations'));
  return onSnapshot(q, (snapshot) => {
    const orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestorOrganization));
    callback(orgs);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'investorOrganizations'));
};

// Investor Review Access
export const getInvestorReviewAccess = (callback: (access: InvestorReviewAccess[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'investorReviewAccess'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const access = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestorReviewAccess));
    callback(access);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'investorReviewAccess'));
};

// Investor Pipeline
export const getInvestorPipeline = (callback: (pipeline: InvestorPipeline[]) => void, constraints: QueryConstraint[] = []) => {
  const q = query(collection(db, 'investorPipeline'), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const pipeline = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvestorPipeline));
    callback(pipeline);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'investorPipeline'));
};
