import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';

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
    await setDoc(doc(db, 'users', profile.uid), sanitizeData(profile));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${profile.uid}`);
  }
};
