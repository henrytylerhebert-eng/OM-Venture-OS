import {
  AccessStatus,
  CompanyResourceAccess,
  ResourceCatalogCategory,
  ResourceCatalogItem,
  UnlockRule,
  UnlockRuleId,
} from '../types';

const DEFAULT_MODEL_TIMESTAMP = 'system_default';

export interface UnlockMetricSnapshot {
  countedInterviews: number;
  highPainInterviewCount: number;
  strongPatternCount: number;
  assumptionCount: number;
  experimentCount: number;
  tractionSignalCount: number;
}

export interface DerivedUnlockResource {
  key: string;
  missingProof: string[];
}

export interface CompanyResourceViewItem extends ResourceCatalogItem {
  accessState: 'unlocked' | 'eligible' | 'locked';
  grantedAt?: string;
  grantedReason?: string;
  missingProof: string[];
}

export const DEFAULT_UNLOCK_RULES: UnlockRule[] = [
  {
    id: UnlockRuleId.VALIDATION_LEVEL_1,
    name: 'Validation Level 1',
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_1,
    minimumCountedInterviews: 15,
    minimumHighPainInterviews: 5,
    minimumStrongPatterns: 2,
    minimumAssumptions: 3,
    rationale: 'Discovery support should open only after repeated customer pain and ranked risk are present.',
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: UnlockRuleId.VALIDATION_LEVEL_2,
    name: 'Validation Level 2',
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_2,
    minimumExperiments: 1,
    minimumTractionSignals: 1,
    rationale: 'Build-heavy and capital-adjacent support should open only after testing moves beyond interviews.',
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
];

export const DEFAULT_RESOURCE_CATALOG: ResourceCatalogItem[] = [
  {
    id: 'testing_track',
    key: 'testing_track',
    name: 'Testing Track',
    category: ResourceCatalogCategory.PROGRAM,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_1,
    description: 'Structured support once customer discovery proof is strong enough to move into testing.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'monthly_reporting',
    key: 'monthly_reporting',
    name: 'Monthly Reporting',
    category: ResourceCatalogCategory.PROGRAM,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_1,
    description: 'Recurring founder accountability once Builder proof is active and reviewable.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'startup_circle',
    key: 'startup_circle',
    name: 'Startup Circle',
    category: ResourceCatalogCategory.PROGRAM,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_1,
    description: 'Peer support after appropriate customer discovery is in place.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'mentor_programs',
    key: 'mentor_programs',
    name: 'Mentor Programs',
    category: ResourceCatalogCategory.MENTOR,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_1,
    description: 'Mentor access once discovery proof is mature enough to support sharper guidance.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'pitch_opportunities',
    key: 'pitch_opportunities',
    name: 'Pitch Opportunities',
    category: ResourceCatalogCategory.PITCH,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_1,
    description: 'Pitch practice after core customer truth is established.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'mix_and_jingle',
    key: 'mix_and_jingle',
    name: 'Mix & Jingle',
    category: ResourceCatalogCategory.PITCH,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_1,
    description: 'Elevator-pitch support tied to validation level 1.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'tech_tank',
    key: 'tech_tank',
    name: 'Tech Tank',
    category: ResourceCatalogCategory.BUILD,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_2,
    description: 'Build-adjacent support once evidence moves beyond interviews into testing.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'product_requirements_doc',
    key: 'product_requirements_doc',
    name: 'Product Requirements Doc',
    category: ResourceCatalogCategory.BUILD,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_2,
    description: 'PRD help after validation extends past discovery and into live tests.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'tech_intern_support',
    key: 'tech_intern_support',
    name: 'Tech Intern Support',
    category: ResourceCatalogCategory.BUILD,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_2,
    description: 'Intern support after the business model has been validated beyond interviews alone.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'funding_support',
    key: 'funding_support',
    name: 'Funding Support',
    category: ResourceCatalogCategory.CAPITAL,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_2,
    description: 'Funding preparation once testing and signals support the story.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'sbir_sttr',
    key: 'sbir_sttr',
    name: 'SBIR / STTR',
    category: ResourceCatalogCategory.CAPITAL,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_2,
    description: 'Non-dilutive support once the venture has test-backed evidence.',
    founderVisible: true,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
  {
    id: 'angel_venture',
    key: 'angel_venture',
    name: 'Angel / Venture',
    category: ResourceCatalogCategory.CAPITAL,
    unlockRuleId: UnlockRuleId.VALIDATION_LEVEL_2,
    description: 'Investor pathway visibility only after stronger validation and traction signals exist.',
    founderVisible: false,
    active: true,
    createdAt: DEFAULT_MODEL_TIMESTAMP,
    updatedAt: DEFAULT_MODEL_TIMESTAMP,
  },
];

export const getDefaultUnlockRule = (unlockRuleId: UnlockRuleId) =>
  DEFAULT_UNLOCK_RULES.find((rule) => rule.unlockRuleId === unlockRuleId);

export const buildProofGapsFromRule = (rule: UnlockRule, metrics: UnlockMetricSnapshot) => {
  const proofGaps: string[] = [];

  if (rule.minimumCountedInterviews && metrics.countedInterviews < rule.minimumCountedInterviews) {
    proofGaps.push(
      `Log ${rule.minimumCountedInterviews - metrics.countedInterviews} more interviews that count toward the Builder minimum of ${rule.minimumCountedInterviews}.`
    );
  }

  if (rule.minimumHighPainInterviews && metrics.highPainInterviewCount < rule.minimumHighPainInterviews) {
    proofGaps.push(
      `Capture ${rule.minimumHighPainInterviews - metrics.highPainInterviewCount} more strong customer pain signals with pain intensity 4 or 5.`
    );
  }

  if (rule.minimumStrongPatterns && metrics.strongPatternCount < rule.minimumStrongPatterns) {
    proofGaps.push(`Synthesize at least ${rule.minimumStrongPatterns - metrics.strongPatternCount} more repeated problem patterns.`);
  }

  if (rule.minimumAssumptions && metrics.assumptionCount < rule.minimumAssumptions) {
    proofGaps.push(`Map ${rule.minimumAssumptions - metrics.assumptionCount} more risky assumptions that still need proof.`);
  }

  if (rule.minimumExperiments && metrics.experimentCount < rule.minimumExperiments) {
    proofGaps.push(`Run at least ${rule.minimumExperiments - metrics.experimentCount} more validation test${rule.minimumExperiments - metrics.experimentCount === 1 ? '' : 's'} beyond interviews.`);
  }

  if (rule.minimumTractionSignals && metrics.tractionSignalCount < rule.minimumTractionSignals) {
    proofGaps.push(`Log at least ${rule.minimumTractionSignals - metrics.tractionSignalCount} measurable traction signal${rule.minimumTractionSignals - metrics.tractionSignalCount === 1 ? '' : 's'} from live testing.`);
  }

  return proofGaps;
};

export const buildCompanyResourceView = ({
  catalog = DEFAULT_RESOURCE_CATALOG,
  accessRecords,
  availableResourceKeys,
  lockedResources,
}: {
  catalog?: ResourceCatalogItem[];
  accessRecords: CompanyResourceAccess[];
  availableResourceKeys: string[];
  lockedResources: DerivedUnlockResource[];
}): CompanyResourceViewItem[] => {
  const activeAccessByKey = accessRecords.reduce<Record<string, CompanyResourceAccess>>((acc, record) => {
    if (record.accessStatus === AccessStatus.ACTIVE) {
      acc[record.resourceKey] = record;
    }
    return acc;
  }, {});

  const availableKeySet = new Set(availableResourceKeys);
  const lockedByKey = lockedResources.reduce<Record<string, DerivedUnlockResource>>((acc, resource) => {
    acc[resource.key] = resource;
    return acc;
  }, {});

  return catalog
    .filter((resource) => resource.active)
    .map((resource) => {
      const activeAccess = activeAccessByKey[resource.key];
      if (activeAccess) {
        return {
          ...resource,
          accessState: 'unlocked',
          grantedAt: activeAccess.grantedAt,
          grantedReason: activeAccess.grantedReason,
          missingProof: [],
        };
      }

      if (availableKeySet.has(resource.key)) {
        return {
          ...resource,
          accessState: 'eligible',
          missingProof: [],
        };
      }

      return {
        ...resource,
        accessState: 'locked',
        missingProof: lockedByKey[resource.key]?.missingProof || [],
      };
    });
};
