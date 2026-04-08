export enum OrganizationType {
  OM = "om",
  STARTUP = "startup",
  MENTOR_ORG = "mentor_org",
  INVESTOR_ORG = "investor_org",
  UNIVERSITY = "university",
  PARTNER = "partner"
}

export enum RoleType {
  OM_ADMIN = "om_admin",
  OM_STAFF = "om_staff",
  FOUNDER = "founder",
  STARTUP_TEAM = "startup_team",
  MENTOR = "mentor",
  INVESTOR_REVIEWER = "investor_reviewer",
  INVESTOR_ADMIN = "investor_admin"
}

export enum MembershipStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ALUMNI = "alumni",
  PENDING = "pending"
}

export enum ProgramType {
  BUILDER_1_0 = "builder_1_0",
  BUILDER_2_0 = "builder_2_0",
  STARTUP_CIRCLE = "startup_circle",
  MENTOR_PROGRAM = "mentor_program"
}

export enum CohortStatus {
  PLANNED = "planned",
  ACTIVE = "active",
  COMPLETED = "completed"
}

export enum DecisionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  DECLINED = "declined",
  WAITLIST = "waitlist"
}

export enum ParticipationStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  WITHDRAWN = "withdrawn"
}

export enum HomeworkStatus {
  ON_TRACK = "on_track",
  BEHIND = "behind",
  COMPLETE = "complete"
}

export enum StartupStage {
  IDEA_DEVELOPMENT = "idea_development",
  CUSTOMER_DISCOVERY = "customer_discovery",
  PRODUCT_DEVELOPMENT = "product_development",
  BETA_TESTING = "beta_testing",
  CUSTOMER_ACQUISITION = "customer_acquisition",
  GROWTH = "growth",
  ALUMNI = "alumni"
}

export enum StageConfidence {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export enum FundingStage {
  NONE = "none",
  FRIENDS_FAMILY = "friends_family",
  PRE_SEED = "pre_seed",
  SEED = "seed",
  SERIES_A_PLUS = "series_a_plus",
  NON_DILUTIVE = "non_dilutive",
  REVENUE_FUNDED = "revenue_funded"
}

export enum ProofType {
  INTERVIEWS = "interviews",
  PATTERN = "pattern",
  MVP_LIVE = "mvp_live",
  BETA_USERS = "beta_users",
  PILOTS = "pilots",
  LOIS = "lois",
  REVENUE = "revenue",
  GROWTH = "growth"
}

export enum AssignmentType {
  REQUESTED = "requested",
  STAFF_MATCHED = "staff_matched",
  MILESTONE_BASED = "milestone_based"
}

export enum AssignmentStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  PAUSED = "paused"
}

export enum MeetingStatus {
  REQUESTED = "requested",
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

export enum FeedbackRole {
  FOUNDER = "founder",
  MENTOR = "mentor",
  OM_STAFF = "om_staff"
}

export enum PatternStatus {
  KEEP = "keep",
  NARROW = "narrow",
  PIVOT = "pivot"
}

export enum AssumptionType {
  DESIRABILITY = "desirability",
  FEASIBILITY = "feasibility",
  VIABILITY = "viability"
}

export enum AssumptionStatus {
  UNKNOWN = "unknown",
  WEAK = "weak",
  STRONG = "strong",
  VALIDATED = "validated",
  INVALIDATED = "invalidated"
}

export enum TestType {
  LANDING_PAGE = "landing_page",
  CONCIERGE = "concierge",
  WIZARD_OF_OZ = "wizard_of_oz",
  PROTOTYPE = "prototype",
  PILOT = "pilot",
  PRICING_TEST = "pricing_test",
  OUTREACH_TEST = "outreach_test",
  SMOKE_TEST = "smoke_test",
  PRE_ORDER = "pre_order"
}

export enum ReadinessType {
  BUILDER_COMPLETION = "builder_completion",
  MENTOR_READY = "mentor_ready",
  INTERN_READY = "intern_ready",
  PITCH_READY = "pitch_ready",
  INVESTOR_READY = "investor_ready",
  COHORT_ADMISSION = "cohort_admission",
  INVESTMENT_READY = "investment_ready"
}

export enum ReadinessStatus {
  READY = "ready",
  NOT_READY = "not_ready",
  NEEDS_REVIEW = "needs_review",
  NEEDS_WORK = "needs_work"
}

export enum InvestorType {
  ANGEL_GROUP = "angel_group",
  VC = "vc",
  FAMILY_OFFICE = "family_office",
  ECONOMIC_DEV = "economic_dev",
  GRANT_ORG = "grant_org"
}

export enum AccessStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked"
}

export enum IntroStatus {
  NOT_STARTED = "not_started",
  INTRO_REQUESTED = "intro_requested",
  INTRO_MADE = "intro_made",
  IN_REVIEW = "in_review",
  PASSED = "passed",
  ADVANCING = "advancing"
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  website?: string;
  region?: string;
  active: boolean;
  relationshipOwnerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  primaryEmail: string;
  phone?: string;
  organizationId: string;
  roleType: RoleType;
  title?: string;
  linkedinUrl?: string;
  active: boolean;
  authUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  organizationId: string;
  founderLeadPersonId?: string;
  description?: string;
  website?: string;
  membershipStatus?: MembershipStatus;
  confirmedMembershipLevel?: string;
  active: boolean;
  omOwnerPersonId?: string;
  currentPortfolioProgressId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cohort {
  id: string;
  name: string;
  programType: ProgramType;
  startDate?: string;
  endDate?: string;
  status: CohortStatus;
  programOwnerPersonId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CohortApplication {
  id: string;
  companyId: string;
  founderPersonId: string;
  requestedCohortId: string;
  submissionNotes?: string;
  decision: DecisionStatus;
  fitNotes?: string;
  decidedByPersonId?: string;
  decidedAt?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface CohortParticipation {
  id: string;
  companyId: string;
  cohortId: string;
  founderLeadPersonId?: string;
  status: ParticipationStatus;
  joinDate?: string;
  miroUrl?: string;
  customerDiscoveryTrackerUrl?: string;
  interviewTarget: number;
  interviewCount: number;
  homeworkStatus?: HomeworkStatus;
  graduationReady: boolean;
  completionCertificateUrl?: string;
  nextProgramEligible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProgress {
  id: string;
  companyId: string;
  recommendedStage: StartupStage;
  stageOverride?: StartupStage;
  finalStage: StartupStage;
  progressScore: number;
  stageConfidence?: StageConfidence;
  fundingStage?: FundingStage;
  primaryProofType?: ProofType;
  primaryProofDetail?: string;
  liveProduct: boolean;
  betaLive: boolean;
  revenueStarted: boolean;
  payingCustomersCount: number;
  nextMilestone?: string;
  biggestBlocker?: string;
  omOwnerPersonId?: string;
  stageUpdatedAt: string;
  updatedAt: string;
}

export interface Mentor {
  id: string;
  personId: string;
  organizationId?: string;
  expertiseAreas: string[];
  stageFit: string[];
  geography?: string;
  shareEmail: boolean;
  active: boolean;
  lastEngagedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentorAssignment {
  id: string;
  companyId: string;
  founderPersonId?: string;
  mentorId: string;
  assignedByPersonId: string;
  assignmentType: AssignmentType;
  goal?: string;
  status: AssignmentStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRequest {
  id: string;
  companyId: string;
  founderPersonId: string;
  mentorId: string;
  mentorAssignmentId?: string;
  requestedByPersonId: string;
  reason?: string;
  programContext?: string;
  status: MeetingStatus;
  meetingDate?: string;
  notes?: string;
  followUpNeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  meetingRequestId: string;
  companyId: string;
  founderPersonId?: string;
  mentorId?: string;
  submittedByRole: FeedbackRole;
  overallRating?: number;
  willingToFollowUp?: boolean;
  shareableProof?: string;
  internalNotes?: string;
  submittedAt: string;
}

export interface Interview {
  id: string;
  companyId: string;
  cohortParticipationId?: string;
  interviewerPersonId: string;
  intervieweeName: string;
  intervieweeSegment: string;
  interviewSource: string;
  interviewDate: string;
  problemTheme: string;
  painIntensity: number; // 1-5
  mentionSpontaneous: boolean;
  currentAlternative: string;
  bestQuote: string;
  followUpNeeded: boolean;
  notes: string;
  countsTowardMinimum: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvidencePattern {
  id: string;
  companyId: string;
  cohortParticipationId?: string | null;
  problemTheme: string;
  numberOfMentions: number;
  averagePainIntensity: number;
  unpromptedMentions: number;
  representativeQuote: string;
  confidence: number;
  status: PatternStatus;
  sourceInterviewIds: string[];
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdByPersonId?: string;
}

export interface Pattern {
  id: string;
  companyId: string;
  cohortParticipationId?: string;
  problemTheme: string;
  numberOfMentions: number;
  averagePainIntensity: number;
  unpromptedMentions: number;
  representativeQuote: string;
  confidence: StageConfidence;
  status: PatternStatus;
  sourceInterviewIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdByPersonId: string;
}

export interface Assumption {
  id: string;
  companyId: string;
  statement: string;
  type: AssumptionType;
  importanceScore: number; // 1-5
  evidenceScore: number;   // 1-5
  priorityScore: number;
  status: AssumptionStatus;
  linkedPatternId?: string;
  linkedExperimentId?: string;
  notes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Experiment {
  id: string;
  companyId: string;
  hypothesis: string;
  testType: TestType;
  channel?: string;
  offer?: string;
  successMetric?: string;
  result?: string;
  learning?: string;
  nextAction?: string;
  assumptionId?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Signal {
  id: string;
  companyId: string;
  signalDate: string;
  date?: string;
  type?: string;
  value?: string;
  source?: string;
  callsBooked?: number;
  waitlistSignups?: number;
  pilots?: number;
  lois?: number;
  preOrders?: number;
  payingCustomers?: number;
  revenue?: number;
  repeatUsage?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessReview {
  id: string;
  companyId: string;
  reviewType: ReadinessType;
  status: ReadinessStatus;
  reasons?: string[];
  missingItems?: string[];
  reviewedByPersonId: string;
  reviewedAt: string;
  notes?: string;
}

export interface InvestorOrganization {
  id: string;
  organizationId: string;
  investorType: InvestorType;
  stagePreference: string[];
  geography?: string;
  focusAreas?: string[];
  checkSizeOrFundingType?: string;
  active: boolean;
  omRelationshipOwnerPersonId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorReviewAccess {
  id: string;
  investorOrganizationId: string;
  companyId: string;
  grantedByPersonId: string;
  grantedAt: string;
  accessStatus: AccessStatus;
  reasonForAccess?: string;
  expirationDate?: string;
}

export interface InvestorPipeline {
  id: string;
  companyId: string;
  investorOrganizationId: string;
  omSponsorPersonId?: string;
  readinessSnapshot?: string;
  introStatus: IntroStatus;
  introDate?: string;
  deckUrl?: string;
  dataRoomUrl?: string;
  investorFeedback?: string;
  nextStep?: string;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: RoleType;
  photoURL?: string;
  createdAt: string;
  personId?: string; // Link to people collection
}

export type CopilotEngineProvider = 'heuristic' | 'openai';
export type CopilotReadinessStatus = 'not_ready' | 'emerging' | 'ready';
export type CopilotRiskArea = 'desirability' | 'feasibility' | 'viability' | 'fundraising' | 'execution';

export interface VentureCopilotInsight {
  theme: string;
  evidence: string;
  confidence: StageConfidence;
  nextMove: string;
}

export interface VentureCopilotRisk {
  area: CopilotRiskArea;
  severity: StageConfidence;
  title: string;
  detail: string;
}

export interface VentureCopilotRecommendation {
  title: string;
  reason: string;
  owner: string;
  successMetric: string;
}

export interface VentureCopilotReadiness {
  status: CopilotReadinessStatus;
  rationale: string;
  missingProof: string[];
  nextMilestone: string;
}

export interface VentureCopilotAnalysis {
  executiveSummary: string;
  momentumScore: number;
  confidence: StageConfidence;
  marketPulse: string;
  tractionNarrative: string;
  problemInsights: VentureCopilotInsight[];
  riskMap: VentureCopilotRisk[];
  recommendedExperiments: VentureCopilotRecommendation[];
  investorReadiness: VentureCopilotReadiness;
  coachQuestions: string[];
}

export interface VentureCopilotRequest {
  company: Company;
  interviews: Interview[];
  patterns: Pattern[];
  assumptions: Assumption[];
  experiments: Experiment[];
  signals: Signal[];
  readinessReviews: ReadinessReview[];
  focusPrompt?: string;
}

export interface VentureCopilotResponse {
  engine: {
    provider: CopilotEngineProvider;
    model: string;
  };
  generatedAt: string;
  analysis: VentureCopilotAnalysis;
}

export enum CompanyEvidenceSourceLane {
  MEMBER_COMPANIES = "Member Companies",
  CUSTOMER_DISCOVERY = "Customer Discovery",
  MEETING_NOTES = "Meeting Notes",
  MONTHLY_REPORTING = "Monthly Reporting",
  INTERNAL_APPLICATION_REVIEW = "Internal Application Review",
  FEEDBACK = "Feedback",
  MEETING_REQUESTS = "Meeting Requests",
  NEWS_TRACKER = "News Tracker"
}

export type EvidenceConfidenceClass =
  | 'verified'
  | 'reported'
  | 'inference'
  | 'missing';

export const CompanyEvidenceTruthClass = {
  VERIFIED: 'verified',
  REPORTED: 'reported',
  INFERENCE: 'inference',
  MISSING: 'missing',
} as const;

export type CompanyEvidenceTruthClass =
  typeof CompanyEvidenceTruthClass[keyof typeof CompanyEvidenceTruthClass];

export const CompanyEvidenceReviewGoal = {
  READINESS: 'readiness',
  UNLOCK: 'unlock',
  MENTOR_MATCH: 'mentor_match',
  CONTENT: 'content',
  REPORTING: 'reporting',
} as const;

export type CompanyEvidenceReviewGoal =
  typeof CompanyEvidenceReviewGoal[keyof typeof CompanyEvidenceReviewGoal];

export type CompanyEvidenceSourceAttributeValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

export interface CompanyEvidenceSourceRecord {
  id: string;
  sourceLane: CompanyEvidenceSourceLane;
  sourceTitle: string;
  sourceRecordId?: string;
  canonicalCompanyId: string;
  sourceEntityName?: string;
  recordDate?: string;
  eventType: string;
  truthClass: CompanyEvidenceTruthClass;
  summary: string;
  exactEvidence?: string;
  attributes?: Record<string, CompanyEvidenceSourceAttributeValue>;
  retrievalStatus?: 'ok' | 'empty' | 'failed';
  retrievalError?: string;
  approved?: boolean;
}

export interface CompanyEvidenceContextInput {
  canonicalCompanyId: string;
  canonicalCompanyName: string;
  aliases: string[];
  reviewGoal: CompanyEvidenceReviewGoal;
  allowedSources: CompanyEvidenceSourceLane[];
  sourceRecords: CompanyEvidenceSourceRecord[];
  reportingPeriodFilter?: {
    start?: string;
    end?: string;
    label?: string;
  };
  todayDate: string;
}

export interface CompanyEvidenceSourceCoverage {
  lane: CompanyEvidenceSourceLane;
  recordCount: number;
  retrievalStatus: 'ok' | 'empty' | 'failed' | 'missing';
  note: string;
}

export interface CompanyEvidenceTimelineEntry {
  date: string | null;
  source: string;
  eventType: 'discovery' | 'reporting' | 'meeting' | 'milestone' | 'roadblock' | 'ask' | 'news' | 'other';
  summary: string;
  confidenceClass: EvidenceConfidenceClass;
}

export interface CompanyEvidenceCustomerDiscoverySummary {
  verifiedInterviewCount: number | null;
  reportedInterviewCount: number | string | null;
  channels: string[];
  segments: string[];
  themes: string[];
  strongestEvidence: string[];
  unknowns: string[];
}

export interface CompanyEvidenceReportingSummary {
  periodsFound: string[];
  highlights: string[];
  milestones: string[];
  roadblocks: string[];
  customerFeedback: string[];
  asks: string[];
  missingPeriods: string[];
}

export interface CompanyEvidenceQualityReview {
  contradictions: string[];
  retrievalFailures: string[];
  staleSignals: string[];
  namingDrift: string[];
  reviewedTruthNeeded: string[];
}

export interface CompanyEvidenceQualityFlag {
  key: string;
  severity: StageConfidence;
  message: string;
  sourceLane?: CompanyEvidenceSourceLane;
}

export interface CompanyEvidenceReadinessRecommendation {
  internallyUsable: boolean;
  contentReady: boolean;
  spotlightReady: boolean;
  externallyPublishable: boolean;
  reasoning: {
    internallyUsable: string;
    contentReady: string;
    spotlightReady: string;
    externallyPublishable: string;
  };
}

export type CompanyEvidenceSourceCoverageState = 'present' | 'missing' | 'unknown';

export interface CompanyEvidenceContext {
  companyId: string;
  canonicalCompanyName: string;
  aliasesDetected: string[];
  reviewGoal: CompanyEvidenceReviewGoal;
  lastConfirmedActivityDate: string | null;
  sourceCoverage: {
    member_companies: CompanyEvidenceSourceCoverageState;
    customer_discovery: CompanyEvidenceSourceCoverageState;
    meeting_notes: CompanyEvidenceSourceCoverageState;
    monthly_reporting: CompanyEvidenceSourceCoverageState;
    internal_application_review: CompanyEvidenceSourceCoverageState;
    feedback: CompanyEvidenceSourceCoverageState;
    meeting_requests: CompanyEvidenceSourceCoverageState;
    news_tracker: CompanyEvidenceSourceCoverageState;
  };
  timeline: CompanyEvidenceTimelineEntry[];
  customerDiscovery: CompanyEvidenceCustomerDiscoverySummary;
  reportingHistory: CompanyEvidenceReportingSummary;
  evidenceQuality: CompanyEvidenceQualityReview;
  readiness: CompanyEvidenceReadinessRecommendation;
  nextAction: string;
}
