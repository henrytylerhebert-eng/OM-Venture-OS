import { collection, doc, onSnapshot, query, QueryConstraint, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  AccessStatus,
  CompanyResourceAccess,
  CompanyResourceAccessEvidenceSnapshot,
  ResourceCatalogItem,
  UnlockRule,
  UnlockRuleId,
} from '../types';
import {
  DEFAULT_RESOURCE_CATALOG,
  DEFAULT_UNLOCK_RULES,
  getEffectiveCompanyResourceAccessStatus,
} from '../lib/unlocks';
import { handleFirestoreError, OperationType, sanitizeData } from './baseService';

const normalizeResourceCatalog = (
  docId: string,
  data: Partial<ResourceCatalogItem>
): ResourceCatalogItem => ({
  id: docId,
  key: typeof data.key === 'string' ? data.key : docId,
  name: typeof data.name === 'string' ? data.name : docId,
  category: data.category ?? DEFAULT_RESOURCE_CATALOG.find((item) => item.id === docId)?.category ?? DEFAULT_RESOURCE_CATALOG[0].category,
  unlockRuleId:
    data.unlockRuleId ??
    DEFAULT_RESOURCE_CATALOG.find((item) => item.id === docId)?.unlockRuleId ??
    UnlockRuleId.VALIDATION_LEVEL_1,
  description: typeof data.description === 'string' ? data.description : '',
  founderVisible: typeof data.founderVisible === 'boolean' ? data.founderVisible : true,
  active: typeof data.active === 'boolean' ? data.active : true,
  createdAt: typeof data.createdAt === 'string' ? data.createdAt : 'system_default',
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : typeof data.createdAt === 'string' ? data.createdAt : 'system_default',
});

const normalizeUnlockRule = (docId: string, data: Partial<UnlockRule>): UnlockRule => ({
  id: docId,
  name: typeof data.name === 'string' ? data.name : docId,
  unlockRuleId:
    data.unlockRuleId ??
    DEFAULT_UNLOCK_RULES.find((rule) => rule.id === docId)?.unlockRuleId ??
    UnlockRuleId.VALIDATION_LEVEL_1,
  minimumCountedInterviews:
    typeof data.minimumCountedInterviews === 'number' ? data.minimumCountedInterviews : undefined,
  minimumHighPainInterviews:
    typeof data.minimumHighPainInterviews === 'number' ? data.minimumHighPainInterviews : undefined,
  minimumStrongPatterns:
    typeof data.minimumStrongPatterns === 'number' ? data.minimumStrongPatterns : undefined,
  minimumAssumptions:
    typeof data.minimumAssumptions === 'number' ? data.minimumAssumptions : undefined,
  minimumExperiments:
    typeof data.minimumExperiments === 'number' ? data.minimumExperiments : undefined,
  minimumTractionSignals:
    typeof data.minimumTractionSignals === 'number' ? data.minimumTractionSignals : undefined,
  rationale: typeof data.rationale === 'string' ? data.rationale : '',
  active: typeof data.active === 'boolean' ? data.active : true,
  createdAt: typeof data.createdAt === 'string' ? data.createdAt : 'system_default',
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : typeof data.createdAt === 'string' ? data.createdAt : 'system_default',
});

const normalizeCompanyResourceAccess = (
  docId: string,
  data: Partial<CompanyResourceAccess>
): CompanyResourceAccess => ({
  id: docId,
  companyId: typeof data.companyId === 'string' ? data.companyId : '',
  resourceKey: typeof data.resourceKey === 'string' ? data.resourceKey : '',
  resourceNameSnapshot: typeof data.resourceNameSnapshot === 'string' ? data.resourceNameSnapshot : '',
  unlockRuleId: data.unlockRuleId ?? UnlockRuleId.VALIDATION_LEVEL_1,
  accessStatus: data.accessStatus ?? AccessStatus.ACTIVE,
  grantedAt: typeof data.grantedAt === 'string' ? data.grantedAt : '',
  grantedByPersonId: typeof data.grantedByPersonId === 'string' ? data.grantedByPersonId : '',
  grantedReason: typeof data.grantedReason === 'string' ? data.grantedReason : '',
  evidenceSnapshot: data.evidenceSnapshot ?? {
    countedInterviews: 0,
    highPainInterviewCount: 0,
    strongPatternCount: 0,
    assumptionCount: 0,
    experimentCount: 0,
    tractionSignalCount: 0,
  },
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : typeof data.grantedAt === 'string' ? data.grantedAt : '',
  expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
  expiredAt: typeof data.expiredAt === 'string' ? data.expiredAt : undefined,
  revokedAt: typeof data.revokedAt === 'string' ? data.revokedAt : undefined,
  revokedReason: typeof data.revokedReason === 'string' ? data.revokedReason : undefined,
});

export const getResourceCatalog = (callback: (items: ResourceCatalogItem[]) => void) => {
  const q = query(collection(db, 'resourceCatalog'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_RESOURCE_CATALOG);
        return;
      }

      callback(snapshot.docs.map((item) => normalizeResourceCatalog(item.id, item.data() as Partial<ResourceCatalogItem>)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'resourceCatalog')
  );
};

export const getUnlockRules = (callback: (items: UnlockRule[]) => void) => {
  const q = query(collection(db, 'unlockRules'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_UNLOCK_RULES);
        return;
      }

      callback(snapshot.docs.map((item) => normalizeUnlockRule(item.id, item.data() as Partial<UnlockRule>)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'unlockRules')
  );
};

export const getCompanyResourceAccess = (
  callback: (items: CompanyResourceAccess[]) => void,
  constraints: QueryConstraint[] = []
) => {
  const q = query(collection(db, 'companyResourceAccess'), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) =>
          normalizeCompanyResourceAccess(item.id, item.data() as Partial<CompanyResourceAccess>)
        )
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'companyResourceAccess')
  );
};

interface GrantCompanyResourceAccessInput {
  companyId: string;
  resourceKey: string;
  resourceNameSnapshot: string;
  unlockRuleId: UnlockRuleId;
  grantedByPersonId: string;
  grantedReason: string;
  evidenceSnapshot: CompanyResourceAccessEvidenceSnapshot;
  expiresAt?: string;
}

export const grantCompanyResourceAccess = async ({
  companyId,
  resourceKey,
  resourceNameSnapshot,
  unlockRuleId,
  grantedByPersonId,
  grantedReason,
  evidenceSnapshot,
  expiresAt,
}: GrantCompanyResourceAccessInput): Promise<void> => {
  const now = new Date().toISOString();
  const accessId = `${companyId}__${resourceKey}`;

  try {
    await setDoc(
      doc(db, 'companyResourceAccess', accessId),
      sanitizeData({
        companyId,
        resourceKey,
        resourceNameSnapshot,
        unlockRuleId,
        accessStatus: AccessStatus.ACTIVE,
        grantedAt: now,
        grantedByPersonId,
        grantedReason,
        evidenceSnapshot,
        expiresAt,
        updatedAt: now,
        expiredAt: undefined,
        revokedAt: undefined,
        revokedReason: undefined,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `companyResourceAccess/${accessId}`);
  }
};

export const revokeCompanyResourceAccess = async (
  companyId: string,
  resourceKey: string,
  revokedReason: string
): Promise<void> => {
  const accessId = `${companyId}__${resourceKey}`;
  const now = new Date().toISOString();

  try {
    await updateDoc(
      doc(db, 'companyResourceAccess', accessId),
      sanitizeData({
        accessStatus: AccessStatus.REVOKED,
        revokedAt: now,
        revokedReason,
        updatedAt: now,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `companyResourceAccess/${accessId}`);
  }
};

export const setCompanyResourceAccessExpiry = async (
  companyId: string,
  resourceKey: string,
  expiresAt?: string
): Promise<void> => {
  const accessId = `${companyId}__${resourceKey}`;

  try {
    await updateDoc(
      doc(db, 'companyResourceAccess', accessId),
      sanitizeData({
        expiresAt,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `companyResourceAccess/${accessId}`);
  }
};

export const getCompanyResourceAccessForCompany = (
  callback: (items: CompanyResourceAccess[]) => void,
  companyId: string
) => getCompanyResourceAccess(callback, [where('companyId', '==', companyId)]);

export const getActiveCompanyResourceAccess = (
  callback: (items: CompanyResourceAccess[]) => void,
  companyId: string
) =>
  getCompanyResourceAccess(
    (items) => callback(items.filter((item) => getEffectiveCompanyResourceAccessStatus(item) === AccessStatus.ACTIVE)),
    [where('companyId', '==', companyId)]
  );
