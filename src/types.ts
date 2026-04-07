export type UserRole = 'om_admin' | 'om_staff' | 'founder' | 'mentor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
}

export type CompanyStatus = 'pending' | 'active' | 'inactive';
export type StartupStage = 
  | 'Idea Development'
  | 'Customer Discovery'
  | 'Product Development'
  | 'Beta Testing'
  | 'Customer Acquisition'
  | 'Growth'
  | 'Alumni';

export interface Company {
  id: string;
  name: string;
  description: string;
  status: CompanyStatus;
  stage: StartupStage;
  progressScore: number;
  readinessNotes: string;
  founderUids: string[];
  createdAt: string;
}

export interface Cohort {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type ApplicationStatus = 'pending' | 'approved' | 'denied';

export interface CohortApplication {
  id: string;
  companyId: string;
  cohortId: string;
  founderUid: string;
  status: ApplicationStatus;
  submittedAt: string;
}

export type ParticipationStatus = 'active' | 'completed' | 'dropped';

export interface CohortParticipation {
  id: string;
  companyId: string;
  cohortId: string;
  status: ParticipationStatus;
  joinedAt: string;
}

export interface MentorAssignment {
  id: string;
  mentorUid: string;
  companyId: string;
  assignedBy: string;
  assignedAt: string;
}

export interface Feedback {
  id: string;
  mentorUid: string;
  companyId: string;
  content: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  companyId: string;
  founderUid: string;
  segment: string;
  painIntensity: number;
  alternative: string;
  quote: string;
  spontaneous: boolean;
  followUp: boolean;
  date: string;
}

export type PatternStatus = 'keep' | 'narrow' | 'pivot';

export interface Pattern {
  id: string;
  companyId: string;
  theme: string;
  mentions: number;
  avgPain: number;
  quote: string;
  confidence: number;
  status: PatternStatus;
}

export type AssumptionType = 'desirability' | 'feasibility' | 'viability';

export interface Assumption {
  id: string;
  companyId: string;
  statement: string;
  type: AssumptionType;
  importance: number;
  evidence: number;
  status: string;
  patternId?: string;
  experimentId?: string;
}

export type ExperimentStatus = 'active' | 'closed';

export interface Experiment {
  id: string;
  companyId: string;
  hypothesis: string;
  testType: string;
  channel: string;
  offer: string;
  startDate: string;
  endDate: string;
  metric: string;
  result: string;
  learning: string;
  status: ExperimentStatus;
}

export type SignalType = 'call' | 'waitlist' | 'pilot' | 'loi' | 'preorder' | 'customer' | 'revenue' | 'repeat';

export interface Signal {
  id: string;
  companyId: string;
  type: SignalType;
  count: number;
  notes: string;
  date: string;
}

export type ReadinessType = 'builder_completion' | 'mentor' | 'intern' | 'pitch' | 'investor';
export type ReadinessStatus = 'ready' | 'not_ready' | 'pending';

export interface ReadinessReview {
  id: string;
  companyId: string;
  type: ReadinessType;
  status: ReadinessStatus;
  reasons: string;
  missingItems: string[];
  reviewedBy: string;
  reviewedOn: string;
}
