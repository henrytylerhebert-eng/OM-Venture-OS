import { collection, doc, getDoc, query, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Company, Organization } from '../types';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';

// Organizations
export const getOrganizations = (callback: (orgs: Organization[]) => void) => {
  const q = query(collection(db, 'organizations'));
  return onSnapshot(q, (snapshot) => {
    const orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
    callback(orgs);
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'organizations'));
};

export const createOrganization = async (org: Omit<Organization, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'organizations'), sanitizeData(org));
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, 'organizations');
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
    const docRef = await addDoc(collection(db, 'companies'), sanitizeData(company));
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, 'companies');
  }
};

export const updateCompany = async (id: string, data: Partial<Company>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'companies', id), sanitizeData(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `companies/${id}`);
  }
};
