import React, { useState } from 'react';
import { createOrganization, createCompany } from '../services/companyService';
import { createPerson, assignMentor } from '../services/mentorService';
import { createUserProfile } from '../services/authService';
import { submitApplication, approveCohortApplication } from '../services/cohortService';
import { createReadinessReview } from '../services/progressService';
import { 
  Organization, 
  Person, 
  Company, 
  Cohort, 
  CohortApplication, 
  Mentor, 
  UserProfile,
  OrganizationType,
  RoleType,
  MembershipStatus,
  ProgramType,
  CohortStatus,
  AssignmentType,
  AssignmentStatus,
  DecisionStatus,
  ReadinessType,
  ReadinessStatus
} from '../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SeedData: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeed = async () => {
    setLoading(true);
    setMessage('Seeding data...');
    try {
      // 1. Create OM Organization
      const omOrgId = await createOrganization({
        name: 'Opportunity Machine',
        type: OrganizationType.OM,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 2. Create Startup Organizations
      const startupOrg1Id = await createOrganization({
        name: 'TechFlow Systems',
        type: OrganizationType.STARTUP,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const startupOrg2Id = await createOrganization({
        name: 'GreenGrid Energy',
        type: OrganizationType.STARTUP,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 3. Create People
      const adminId = await createPerson({
        firstName: 'OM',
        lastName: 'Admin',
        fullName: 'OM Admin',
        primaryEmail: 'admin@opportunitymachine.org',
        organizationId: omOrgId,
        roleType: RoleType.OM_ADMIN,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const staffId = await createPerson({
        firstName: 'OM',
        lastName: 'Staff',
        fullName: 'OM Staff',
        primaryEmail: 'staff@opportunitymachine.org',
        organizationId: omOrgId,
        roleType: RoleType.OM_STAFF,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const founder1Id = await createPerson({
        firstName: 'Alice',
        lastName: 'Founder',
        fullName: 'Alice Founder',
        primaryEmail: 'alice@techflow.io',
        organizationId: startupOrg1Id,
        roleType: RoleType.FOUNDER,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const founder2Id = await createPerson({
        firstName: 'Bob',
        lastName: 'Founder',
        fullName: 'Bob Founder',
        primaryEmail: 'bob@greengrid.energy',
        organizationId: startupOrg2Id,
        roleType: RoleType.FOUNDER,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const mentor1Id = await createPerson({
        firstName: 'Charlie',
        lastName: 'Mentor',
        fullName: 'Charlie Mentor',
        primaryEmail: 'charlie@mentor.com',
        organizationId: omOrgId,
        roleType: RoleType.MENTOR,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const mentor2Id = await createPerson({
        firstName: 'Dana',
        lastName: 'Mentor',
        fullName: 'Dana Mentor',
        primaryEmail: 'dana@mentor.com',
        organizationId: omOrgId,
        roleType: RoleType.MENTOR,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4. Create Companies
      const company1Id = await createCompany({
        name: 'TechFlow Systems',
        organizationId: startupOrg1Id,
        founderLeadPersonId: founder1Id,
        membershipStatus: MembershipStatus.ACTIVE,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const company2Id = await createCompany({
        name: 'GreenGrid Energy',
        organizationId: startupOrg2Id,
        founderLeadPersonId: founder2Id,
        membershipStatus: MembershipStatus.PENDING,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 5. Create Cohorts
      const cohort1Ref = await addDoc(collection(db, 'cohorts'), {
        name: 'Builder 1.0 Spring 2026',
        programType: ProgramType.BUILDER_1_0,
        status: CohortStatus.ACTIVE,
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const cohort1Id = cohort1Ref.id;

      const cohort2Ref = await addDoc(collection(db, 'cohorts'), {
        name: 'Builder 2.0 Summer 2026',
        programType: ProgramType.BUILDER_2_0,
        status: CohortStatus.PLANNED,
        startDate: new Date('2026-06-01').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const cohort2Id = cohort2Ref.id;

      // 6. Create Mentor Profiles
      await addDoc(collection(db, 'mentors'), {
        personId: mentor1Id,
        organizationId: omOrgId,
        expertiseAreas: ['SaaS', 'Sales'],
        stageFit: ['idea_development', 'customer_discovery'],
        shareEmail: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 7. Create Mentor Assignment
      await assignMentor({
        companyId: company1Id,
        mentorId: mentor1Id,
        assignedByPersonId: staffId,
        assignmentType: AssignmentType.STAFF_MATCHED,
        status: AssignmentStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 8. Create Cohort Application (Pending)
      await submitApplication({
        companyId: company2Id,
        founderPersonId: founder2Id,
        requestedCohortId: cohort1Id,
        decision: DecisionStatus.PENDING,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 9. Create Approved Cohort Participation
      const appToApproveRef = await addDoc(collection(db, 'cohortApplications'), {
        companyId: company1Id,
        founderPersonId: founder1Id,
        requestedCohortId: cohort1Id,
        decision: DecisionStatus.PENDING,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      const appToApprove = {
        id: appToApproveRef.id,
        companyId: company1Id,
        founderPersonId: founder1Id,
        requestedCohortId: cohort1Id,
        decision: DecisionStatus.PENDING,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as CohortApplication;

      await approveCohortApplication(appToApprove, staffId);

      // 10. Create Readiness Review
      await createReadinessReview({
        companyId: company1Id,
        reviewType: ReadinessType.BUILDER_COMPLETION,
        status: ReadinessStatus.READY,
        reasons: ['Completed 20 interviews', 'Validated problem theme'],
        reviewedByPersonId: staffId,
        reviewedAt: new Date().toISOString()
      });

      setMessage('Seed data created successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Error seeding data: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Seed Test Data</h1>
      <p className="text-gray-600 mb-6">
        This utility will seed the database with a full set of Phase 1 test data, 
        including organizations, people, companies, cohorts, and assignments.
      </p>
      <button
        onClick={handleSeed}
        disabled={loading}
        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Seeding...' : 'Seed Database'}
      </button>
      {message && (
        <div className={`mt-4 p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default SeedData;
