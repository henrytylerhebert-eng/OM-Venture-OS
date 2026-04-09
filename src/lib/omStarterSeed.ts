import { MembershipStatus } from '../types';

export interface OMStarterCompanySeed {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  founderLeadName?: string;
  founderLeadPersonId?: string;
  website?: string;
  membershipStatus?: MembershipStatus;
  sourceTable: string;
  programContext: string;
  sourceNotes?: string;
}

export interface OMStarterPersonSeed {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleLabel: 'om_admin' | 'om_staff' | 'founder' | 'startup_team' | 'mentor' | 'personnel';
  sourceTable: string;
  companyName?: string;
  title?: string;
  seedEmail: string;
  sourceNotes?: string;
}

export interface OMStarterMentorSeed {
  id: string;
  personId: string;
  name: string;
  sourceTable: string;
  expertiseAreas: string[];
  sourceNotes?: string;
}

export interface OMStarterMeetingRequestSeed {
  id: string;
  companyId: string;
  founderPersonId: string;
  founderName: string;
  mentorPersonId: string;
  mentorName: string;
  status: 'scheduled' | 'completed';
  meetingDate: string;
  cohort?: string;
  locationContext?: string;
  sourceTable: string;
}

export interface OMStarterFeedbackSeed {
  id: string;
  founderName: string;
  mentorName: string;
  companyName?: string;
  overall: number;
  sourceTable: string;
  shareableProof?: string;
  internalNotes?: string;
  seedStatus: 'registry_only';
  deferredReason: string;
}

export interface OMStarterConnectionSeed {
  id: string;
  connection: string;
  status: string;
  complete: boolean;
  reason: string;
  sourceTable: string;
}

export const OM_SEED_OM_ORGANIZATION_ID = 'org_opportunity_machine';
export const OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID = 'org_opportunity_machine_mentor_network';
export const OM_SEED_STAFF_ADMIN_ID = 'person_om_admin_seed';
export const OM_SEED_STAFF_ID = 'person_om_staff_seed';

export const REMOVED_FAKE_SEED_FIXTURES = [
  'TechFlow Systems',
  'GreenGrid Energy',
  'Alice Founder',
  'Bob Founder',
  'Charlie Mentor',
  'Dana Mentor',
  'Builder 1.0 Spring 2026',
  'Builder 2.0 Summer 2026',
  'Synthetic readiness review created only for demo progression',
];

export const OM_STARTER_COMPANIES: OMStarterCompanySeed[] = [
  {
    id: 'company_glowsens',
    organizationId: 'org_glowsens',
    name: 'GlowSens',
    displayName: 'GlowSens (Road Paint)',
    founderLeadName: 'Noah',
    membershipStatus: MembershipStatus.ACTIVE,
    sourceTable: 'Member Companies-Startup Circle (Active from Any Cohort)',
    programContext: 'Startup Circle / cohort-linked',
    sourceNotes: 'Source record includes a Miro board link.',
  },
  {
    id: 'company_protech_method',
    organizationId: 'org_protech_method',
    name: 'ProTech Method',
    displayName: 'ProTech Method',
    founderLeadName: 'Alex',
    membershipStatus: MembershipStatus.ACTIVE,
    sourceTable: 'Member Companies-Startup Circle (Active from Any Cohort)',
    programContext: 'Startup Circle / cohort-linked',
  },
  {
    id: 'company_equity_hub',
    organizationId: 'org_equity_hub',
    name: 'Equity Hub',
    displayName: 'Equity Hub',
    founderLeadName: 'Tyren',
    membershipStatus: MembershipStatus.ACTIVE,
    sourceTable: 'Member Companies-Startup Circle (Active from Any Cohort)',
    programContext: 'Startup Circle / cohort-linked',
  },
  {
    id: 'company_fluidbalance',
    organizationId: 'org_fluidbalance',
    name: 'FluidBalance, LLC',
    displayName: 'FluidBalance, LLC',
    founderLeadName: 'Hari',
    sourceTable: 'Cohorts-Grid view',
    programContext: 'Cohort-linked',
    sourceNotes: 'Source record includes a Miro board link.',
  },
  {
    id: 'company_sparkl',
    organizationId: 'org_sparkl',
    name: 'SPARKL',
    displayName: 'SPARKL',
    founderLeadName: 'Kirsten Boudreaux',
    founderLeadPersonId: 'person_kirsten_boudreaux',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    programContext: 'Builder / mentor request activity',
  },
  {
    id: 'company_empath_legal',
    organizationId: 'org_empath_legal',
    name: 'Empath Legal',
    displayName: 'Empath Legal',
    founderLeadName: 'Grant Schexnailder',
    founderLeadPersonId: 'person_grant_schexnailder',
    website: 'https://www.empathlegal.com/',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    programContext: 'Builder / mentor request activity',
  },
  {
    id: 'company_blue_partner',
    organizationId: 'org_blue_partner',
    name: 'Blue Partner',
    displayName: 'Blue Partner',
    founderLeadName: 'Ryan Bourque & Sarah Brasseaux',
    founderLeadPersonId: 'person_ryan_bourque',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    programContext: 'Builder / mentor request activity',
  },
  {
    id: 'company_xrmedix',
    organizationId: 'org_xrmedix',
    name: 'XRMedix',
    displayName: 'XRMedix',
    founderLeadName: 'Prabhakar Vemavarapu',
    founderLeadPersonId: 'person_prabhakar_vemavarapu',
    website: 'https://xrmedix.com/',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    programContext: 'Builder / mentor request activity',
  },
  {
    id: 'company_bob_pixie',
    organizationId: 'org_bob_pixie',
    name: 'Bob & Pixie',
    displayName: 'Bob & Pixie',
    founderLeadName: 'Virginia Goetting',
    founderLeadPersonId: 'person_virginia_goetting',
    website: 'https://www.bobandpixie.com/',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    programContext: 'Builder / mentor request activity',
  },
  {
    id: 'company_ah_ammunition',
    organizationId: 'org_ah_ammunition',
    name: 'A&H Ammunition',
    displayName: 'A&H Ammunition',
    website: 'https://www.ahammunition.com/',
    membershipStatus: MembershipStatus.ACTIVE,
    sourceTable: 'Active Members-Active Members',
    programContext: 'Active Member',
    sourceNotes: 'Source record includes onboarding complete date 2025-07-23.',
  },
  {
    id: 'company_acadian_capital_research',
    organizationId: 'org_acadian_capital_research',
    name: 'Acadian Capital Research',
    displayName: 'Acadian Capital Research',
    website: 'https://www.acadian.vc/',
    membershipStatus: MembershipStatus.ACTIVE,
    sourceTable: 'Active Members-Active Members',
    programContext: 'Active Member',
  },
  {
    id: 'company_acadiana_software_group',
    organizationId: 'org_acadiana_software_group',
    name: 'Acadiana Software Group',
    displayName: 'Acadiana Software Group',
    membershipStatus: MembershipStatus.ACTIVE,
    sourceTable: 'Active Members-Active Members',
    programContext: 'Active Member',
  },
  {
    id: 'company_far_uvc_innovations',
    organizationId: 'org_far_uvc_innovations',
    name: 'Far UVC Innovations',
    displayName: 'Far UVC Innovations',
    founderLeadName: 'Michele Day',
    founderLeadPersonId: 'person_michele_day',
    sourceTable: 'Feedback-Grid view',
    programContext: 'Mentor feedback-linked company context',
  },
  {
    id: 'company_shared_tables',
    organizationId: 'org_shared_tables',
    name: 'Shared Tables, LLC - A Cajun Connection',
    displayName: 'Shared Tables, LLC - A Cajun Connection',
    founderLeadName: 'Simone Markerson',
    founderLeadPersonId: 'person_simone_markerson',
    sourceTable: 'Feedback-Grid view',
    programContext: 'Mentor feedback-linked company context',
  },
];

export const OM_STARTER_PEOPLE: OMStarterPersonSeed[] = [
  {
    id: OM_SEED_STAFF_ADMIN_ID,
    organizationId: OM_SEED_OM_ORGANIZATION_ID,
    firstName: 'OM',
    lastName: 'Admin',
    fullName: 'OM Admin',
    roleLabel: 'om_admin',
    sourceTable: 'Approved internal seed operator',
    seedEmail: 'om.admin.seed@omventureos.local',
  },
  {
    id: OM_SEED_STAFF_ID,
    organizationId: OM_SEED_OM_ORGANIZATION_ID,
    firstName: 'OM',
    lastName: 'Staff',
    fullName: 'OM Staff',
    roleLabel: 'om_staff',
    sourceTable: 'Approved internal seed operator',
    seedEmail: 'om.staff.seed@omventureos.local',
  },
  {
    id: 'person_kirsten_boudreaux',
    organizationId: 'org_sparkl',
    firstName: 'Kirsten',
    lastName: 'Boudreaux',
    fullName: 'Kirsten Boudreaux',
    roleLabel: 'founder',
    companyName: 'SPARKL',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'kirsten.boudreaux.seed@omventureos.local',
  },
  {
    id: 'person_grant_schexnailder',
    organizationId: 'org_empath_legal',
    firstName: 'Grant',
    lastName: 'Schexnailder',
    fullName: 'Grant Schexnailder',
    roleLabel: 'founder',
    companyName: 'Empath Legal',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'grant.schexnailder.seed@omventureos.local',
  },
  {
    id: 'person_ryan_bourque',
    organizationId: 'org_blue_partner',
    firstName: 'Ryan',
    lastName: 'Bourque',
    fullName: 'Ryan Bourque',
    roleLabel: 'founder',
    companyName: 'Blue Partner',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'ryan.bourque.seed@omventureos.local',
  },
  {
    id: 'person_sarah_brasseaux',
    organizationId: 'org_blue_partner',
    firstName: 'Sarah',
    lastName: 'Brasseaux',
    fullName: 'Sarah Brasseaux',
    roleLabel: 'startup_team',
    companyName: 'Blue Partner',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'sarah.brasseaux.seed@omventureos.local',
    sourceNotes: 'Co-founder listed in source alongside Ryan Bourque.',
  },
  {
    id: 'person_prabhakar_vemavarapu',
    organizationId: 'org_xrmedix',
    firstName: 'Prabhakar',
    lastName: 'Vemavarapu',
    fullName: 'Prabhakar Vemavarapu',
    roleLabel: 'founder',
    companyName: 'XRMedix',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'prabhakar.vemavarapu.seed@omventureos.local',
  },
  {
    id: 'person_virginia_goetting',
    organizationId: 'org_bob_pixie',
    firstName: 'Virginia',
    lastName: 'Goetting',
    fullName: 'Virginia Goetting',
    roleLabel: 'founder',
    companyName: 'Bob & Pixie',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'virginia.goetting.seed@omventureos.local',
  },
  {
    id: 'person_michele_day',
    organizationId: 'org_far_uvc_innovations',
    firstName: 'Michele',
    lastName: 'Day',
    fullName: 'Michele Day',
    roleLabel: 'founder',
    companyName: 'Far UVC Innovations',
    sourceTable: 'Feedback-Grid view',
    seedEmail: 'michele.day.seed@omventureos.local',
  },
  {
    id: 'person_simone_markerson',
    organizationId: 'org_shared_tables',
    firstName: 'Simone',
    lastName: 'Markerson',
    fullName: 'Simone Markerson',
    roleLabel: 'founder',
    companyName: 'Shared Tables, LLC - A Cajun Connection',
    sourceTable: 'Feedback-Grid view',
    seedEmail: 'simone.markerson.seed@omventureos.local',
  },
  {
    id: 'person_aaron_watson',
    organizationId: 'org_villa_creative',
    firstName: 'Aaron',
    lastName: 'Watson',
    fullName: 'Aaron Watson',
    roleLabel: 'personnel',
    companyName: 'Villa Creative, Inc.',
    sourceTable: 'Personnel-Active Personnel',
    seedEmail: 'aaron.watson.seed@omventureos.local',
  },
  {
    id: 'person_adam_olivier',
    organizationId: 'org_ah_ammunition',
    firstName: 'Adam',
    lastName: 'Olivier',
    fullName: 'Adam Olivier',
    roleLabel: 'personnel',
    companyName: 'A&H Ammunition',
    sourceTable: 'Personnel-Active Personnel',
    seedEmail: 'adam.olivier.seed@omventureos.local',
  },
  {
    id: 'person_aiden_anderson',
    organizationId: 'org_om_tech_interns_fall_2025',
    firstName: 'Aiden',
    lastName: 'Anderson',
    fullName: 'Aiden Anderson',
    roleLabel: 'personnel',
    companyName: 'OM Tech Interns - Fall 2025',
    sourceTable: 'Personnel-Active Personnel',
    seedEmail: 'aiden.anderson.seed@omventureos.local',
  },
  {
    id: 'person_aditya_visweswaran',
    organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
    firstName: 'Aditya',
    lastName: 'Visweswaran',
    fullName: 'Aditya Visweswaran',
    roleLabel: 'mentor',
    sourceTable: 'Mentors-Grid view',
    seedEmail: 'aditya.visweswaran.seed@omventureos.local',
  },
  {
    id: 'person_aishwarya_parasuram',
    organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
    firstName: 'Aishwarya',
    lastName: 'Parasuram',
    fullName: 'Aishwarya Parasuram',
    roleLabel: 'mentor',
    sourceTable: 'Mentors-Grid view',
    seedEmail: 'aishwarya.parasuram.seed@omventureos.local',
  },
  {
    id: 'person_amol_desai',
    organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
    firstName: 'Amol',
    lastName: 'Desai',
    fullName: 'Amol Desai',
    roleLabel: 'mentor',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'amol.desai.seed@omventureos.local',
    sourceNotes: 'Lightweight mentor person seeded from meeting request history.',
  },
  {
    id: 'person_greg_palmer',
    organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
    firstName: 'Greg',
    lastName: 'Palmer',
    fullName: 'Greg Palmer',
    roleLabel: 'mentor',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'greg.palmer.seed@omventureos.local',
    sourceNotes: 'Lightweight mentor person seeded from meeting request history.',
  },
  {
    id: 'person_ali_chapman',
    organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
    firstName: 'Ali',
    lastName: 'Chapman',
    fullName: 'Ali Chapman',
    roleLabel: 'mentor',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'ali.chapman.seed@omventureos.local',
    sourceNotes: 'Lightweight mentor person seeded from meeting request history.',
  },
  {
    id: 'person_mike_eckert',
    organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
    firstName: 'Mike',
    lastName: 'Eckert',
    fullName: 'Mike Eckert',
    roleLabel: 'mentor',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'mike.eckert.seed@omventureos.local',
    sourceNotes: 'Lightweight mentor person seeded from meeting request history.',
  },
  {
    id: 'person_julia_lang',
    organizationId: OM_SEED_MENTOR_NETWORK_ORGANIZATION_ID,
    firstName: 'Julia',
    lastName: 'Lang',
    fullName: 'Julia Lang',
    roleLabel: 'mentor',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    seedEmail: 'julia.lang.seed@omventureos.local',
    sourceNotes: 'Lightweight mentor person seeded from meeting request history.',
  },
];

export const OM_STARTER_MENTORS: OMStarterMentorSeed[] = [
  {
    id: 'mentor_aditya_visweswaran',
    personId: 'person_aditya_visweswaran',
    name: 'Aditya Visweswaran',
    sourceTable: 'Mentors-Grid view',
    expertiseAreas: ['Hyperscale cloud software', 'IoT', 'Cybersecurity', 'AI'],
  },
  {
    id: 'mentor_aishwarya_parasuram',
    personId: 'person_aishwarya_parasuram',
    name: 'Aishwarya Parasuram',
    sourceTable: 'Mentors-Grid view',
    expertiseAreas: ['Robotics', 'Autonomous agents', 'Safety critical systems'],
  },
  {
    id: 'mentor_amol_desai',
    personId: 'person_amol_desai',
    name: 'Amol Desai',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    expertiseAreas: [],
    sourceNotes: 'Lightweight mentor profile created only from approved request history.',
  },
  {
    id: 'mentor_greg_palmer',
    personId: 'person_greg_palmer',
    name: 'Greg Palmer',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    expertiseAreas: [],
    sourceNotes: 'Lightweight mentor profile created only from approved request history.',
  },
  {
    id: 'mentor_ali_chapman',
    personId: 'person_ali_chapman',
    name: 'Ali Chapman',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    expertiseAreas: [],
    sourceNotes: 'Lightweight mentor profile created only from approved request history.',
  },
  {
    id: 'mentor_mike_eckert',
    personId: 'person_mike_eckert',
    name: 'Mike Eckert',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    expertiseAreas: [],
    sourceNotes: 'Lightweight mentor profile created only from approved request history.',
  },
  {
    id: 'mentor_julia_lang',
    personId: 'person_julia_lang',
    name: 'Julia Lang',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
    expertiseAreas: [],
    sourceNotes: 'Lightweight mentor profile created only from approved request history.',
  },
];

export const OM_STARTER_MEETING_REQUESTS: OMStarterMeetingRequestSeed[] = [
  {
    id: 'request_354',
    companyId: 'company_sparkl',
    founderPersonId: 'person_kirsten_boudreaux',
    founderName: 'Kirsten Boudreaux',
    mentorPersonId: 'person_amol_desai',
    mentorName: 'Amol Desai',
    status: 'scheduled',
    meetingDate: '2025-10-31T14:00:00.000Z',
    cohort: 'Fall 2025',
    locationContext: 'Local',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
  },
  {
    id: 'request_342',
    companyId: 'company_empath_legal',
    founderPersonId: 'person_grant_schexnailder',
    founderName: 'Grant Schexnailder',
    mentorPersonId: 'person_greg_palmer',
    mentorName: 'Greg Palmer',
    status: 'scheduled',
    meetingDate: '2025-10-31T11:00:00.000Z',
    cohort: 'Fall 2025',
    locationContext: 'Local',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
  },
  {
    id: 'request_368',
    companyId: 'company_blue_partner',
    founderPersonId: 'person_ryan_bourque',
    founderName: 'Ryan Bourque & Sarah Brasseaux',
    mentorPersonId: 'person_ali_chapman',
    mentorName: 'Ali Chapman',
    status: 'completed',
    meetingDate: '2025-12-04T10:30:00.000Z',
    cohort: 'Fall 2025',
    locationContext: 'Local',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
  },
  {
    id: 'request_332',
    companyId: 'company_xrmedix',
    founderPersonId: 'person_prabhakar_vemavarapu',
    founderName: 'Prabhakar Vemavarapu',
    mentorPersonId: 'person_mike_eckert',
    mentorName: 'Mike Eckert',
    status: 'completed',
    meetingDate: '2025-12-03T14:00:00.000Z',
    cohort: 'Fall 2025',
    locationContext: 'Not Local',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
  },
  {
    id: 'request_352',
    companyId: 'company_bob_pixie',
    founderPersonId: 'person_virginia_goetting',
    founderName: 'Virginia Goetting',
    mentorPersonId: 'person_julia_lang',
    mentorName: 'Julia Lang',
    status: 'completed',
    meetingDate: '2025-12-02T14:00:00.000Z',
    cohort: 'Fall 2025',
    locationContext: 'Local',
    sourceTable: 'Meeting Requests-ALL Meeting Status',
  },
];

export const OM_STARTER_FEEDBACK: OMStarterFeedbackSeed[] = [
  {
    id: 'feedback_3',
    founderName: 'Lauren Sabatier',
    mentorName: 'Carissa McDaniel',
    overall: 5,
    sourceTable: 'Feedback-Grid view',
    internalNotes: 'Carissa was wonderful and beyond helpful!! Thank you!',
    seedStatus: 'registry_only',
    deferredReason: 'Current repo schema requires a canonical company and meetingRequest anchor. That anchor was not included in the approved seed pack for this record.',
  },
  {
    id: 'feedback_8',
    founderName: 'Michele Day',
    mentorName: 'Missy Rogers',
    companyName: 'Far UVC Innovations',
    overall: 5,
    sourceTable: 'Feedback-Grid view',
    internalNotes:
      'Mentor was extremely knowledgeable and had several suggestions for design, prototype, and bulk manufacturing.',
    seedStatus: 'registry_only',
    deferredReason: 'The current feedback model requires a canonical meetingRequest anchor. This starter pack includes the feedback row, but not the linked Meeting Requests row needed for a clean write.',
  },
  {
    id: 'feedback_6',
    founderName: 'Simone Markerson',
    mentorName: 'Jaci Russo',
    companyName: 'Shared Tables, LLC - A Cajun Connection',
    overall: 5,
    sourceTable: 'Feedback-Grid view',
    shareableProof: 'Happy help in the future if she needs it.',
    seedStatus: 'registry_only',
    deferredReason: 'The current feedback model requires a canonical meetingRequest anchor. This starter pack includes the feedback row, but not the linked Meeting Requests row needed for a clean write.',
  },
];

export const OM_STARTER_CONNECTIONS: OMStarterConnectionSeed[] = [
  {
    id: 'connection_scotty_yvette',
    connection: 'Scotty x Yvette Quantz',
    status: 'Straight to introduction',
    complete: true,
    reason:
      'Scotty is an Entrepreneurial Operating System coach and the source notes recommend the connection for EOS support.',
    sourceTable: 'Connections-Grid view',
  },
  {
    id: 'connection_shanna_thirumala',
    connection: 'Shanna x Thirumala Yenumula',
    status: 'Straight to introduction',
    complete: true,
    reason: 'Connection around paying freelancers and marketplace experience.',
    sourceTable: 'Connections-Grid view',
  },
  {
    id: 'connection_rachael_yvette',
    connection: 'Rachael x Yvette Quantz',
    status: 'Straight to introduction',
    complete: true,
    reason: 'Follow-up connection after Innovate South when the original 1:1 did not happen.',
    sourceTable: 'Connections-Grid view',
  },
];

export const OM_STARTER_SEED_GAPS = [
  {
    label: 'Builder evidence remains empty',
    detail:
      'Interviews, patterns, assumptions, experiments, signals, readiness reviews, and portfolio progress should stay empty until real evidence exists.',
  },
  {
    label: 'Connections stay registry-only',
    detail:
      'The current repo does not have a repo-native connections collection yet, so approved connection rows are preserved in the seed registry but not written into Firestore.',
  },
  {
    label: 'Feedback stays registry-only',
    detail:
      'The current feedback model requires a canonical meetingRequest anchor. Approved feedback rows are preserved, but not written until the source pack includes that anchor or the model is extended deliberately.',
  },
  {
    label: 'Partial founder identity stays partial',
    detail:
      'GlowSens, ProTech Method, Equity Hub, and FluidBalance remain company-level records only because the approved pack includes only first-name founder leads.',
  },
  {
    label: 'Placeholder seed emails are technical only',
    detail:
      'The repo requires primaryEmail on person records. Deterministic @omventureos.local addresses are used only where approved source emails were not supplied.',
  },
];
