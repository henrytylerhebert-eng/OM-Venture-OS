import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  type BuilderFoundation,
  type BuilderIdeaToProblem,
  type EarlyAdopterProfile,
  type LeanCanvasDraft,
} from '../types';
import { createEmptyBuilderFoundation, normalizeBuilderFoundation } from '../lib/builderFoundation';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';

type BuilderFoundationWritePayload = Omit<BuilderFoundation, 'id'>;
type BuilderFoundationPatch = {
  ideaToProblem?: Partial<BuilderIdeaToProblem>;
  leanCanvas?: Partial<LeanCanvasDraft>;
  earlyAdopter?: Partial<EarlyAdopterProfile>;
  updatedByPersonId?: string;
};

const toWritePayload = (foundation: BuilderFoundation): BuilderFoundationWritePayload => ({
  companyId: foundation.companyId,
  ideaToProblem: foundation.ideaToProblem,
  leanCanvas: foundation.leanCanvas,
  earlyAdopter: foundation.earlyAdopter,
  createdAt: foundation.createdAt,
  updatedAt: foundation.updatedAt,
  updatedByPersonId: foundation.updatedByPersonId,
});

export const getBuilderFoundation = (
  companyId: string,
  callback: (foundation: BuilderFoundation | null) => void
) =>
  onSnapshot(
    doc(db, 'builderFoundations', companyId),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? normalizeBuilderFoundation({ id: snapshot.id, ...(snapshot.data() as Partial<BuilderFoundation>) })
          : null
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `builderFoundations/${companyId}`)
  );

export const upsertBuilderFoundation = async (
  companyId: string,
  patch: BuilderFoundationPatch,
  updatedByPersonId?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'builderFoundations', companyId);
    const snapshot = await getDoc(docRef);
    const existing = snapshot.exists()
      ? normalizeBuilderFoundation({ id: snapshot.id, ...(snapshot.data() as Partial<BuilderFoundation>) })
      : createEmptyBuilderFoundation(companyId);

    const nextFoundation = normalizeBuilderFoundation({
      ...existing,
      companyId,
      ideaToProblem: {
        ...existing.ideaToProblem,
        ...patch.ideaToProblem,
      },
      leanCanvas: {
        ...existing.leanCanvas,
        ...patch.leanCanvas,
      },
      earlyAdopter: {
        ...existing.earlyAdopter,
        ...patch.earlyAdopter,
      },
      updatedAt: new Date().toISOString(),
      updatedByPersonId,
    });

    await setDoc(docRef, sanitizeData(toWritePayload(nextFoundation)));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `builderFoundations/${companyId}`);
  }
};
