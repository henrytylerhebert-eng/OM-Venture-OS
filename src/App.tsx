import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RoleGuard } from './components/RoleGuard';
import StaffLayout from './components/StaffLayout';
import FounderLayout from './components/FounderLayout';
import MentorLayout from './components/MentorLayout';
import RolePathRedirect from './components/RolePathRedirect';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import FounderDashboard from './pages/FounderDashboard';
import MentorDashboard from './pages/MentorDashboard';
import SeedData from './pages/SeedData';
import QAPage from './pages/QAPage';
import Copilot from './pages/Copilot';
import IdeaProblemTranslator from './pages/IdeaProblemTranslator';
import LeanCanvasBuilder from './pages/LeanCanvasBuilder';
import EarlyAdopterSelector from './pages/EarlyAdopterSelector';
import DiscoveryInterviews from './pages/DiscoveryInterviews';
import Patterns from './pages/Patterns';
import Assumptions from './pages/Assumptions';
import Experiments from './pages/Experiments';
import Signals from './pages/Signals';
import ReadinessQueue from './pages/ReadinessQueue';
import EvidenceIntakeReview from './pages/EvidenceIntakeReview';
import { RoleType } from './types';

// Placeholder pages for other routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-gray-500 mt-4">This feature is coming soon in Phase 1.5.</p>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/seed"
              element={
                <RoleGuard allowedRoles={[RoleType.OM_ADMIN]}>
                  <SeedData />
                </RoleGuard>
              }
            />
            <Route path="/qa" element={<QAPage />} />

            <Route
              path="/staff"
              element={
                <RoleGuard allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF]}>
                  <StaffLayout />
                </RoleGuard>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="readiness" element={<ReadinessQueue />} />
              <Route path="intake" element={<EvidenceIntakeReview />} />
              <Route path="copilot" element={<Copilot />} />
              <Route path="discovery" element={<DiscoveryInterviews />} />
              <Route path="patterns" element={<Patterns />} />
              <Route path="assumptions" element={<Assumptions />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="signals" element={<Signals />} />
              <Route path="profile" element={<Placeholder title="Staff Profile" />} />
            </Route>

            <Route
              path="/founder"
              element={
                <RoleGuard allowedRoles={[RoleType.FOUNDER, RoleType.STARTUP_TEAM]}>
                  <FounderLayout />
                </RoleGuard>
              }
            >
              <Route index element={<FounderDashboard />} />
              <Route path="copilot" element={<Copilot />} />
              <Route path="problem" element={<IdeaProblemTranslator />} />
              <Route path="canvas" element={<LeanCanvasBuilder />} />
              <Route path="early-adopter" element={<EarlyAdopterSelector />} />
              <Route path="discovery" element={<DiscoveryInterviews />} />
              <Route path="patterns" element={<Patterns />} />
              <Route path="assumptions" element={<Assumptions />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="signals" element={<Signals />} />
              <Route path="profile" element={<Placeholder title="Founder Profile" />} />
            </Route>

            <Route
              path="/mentor"
              element={
                <RoleGuard allowedRoles={[RoleType.MENTOR]}>
                  <MentorLayout />
                </RoleGuard>
              }
            >
              <Route index element={<MentorDashboard />} />
              <Route path="copilot" element={<Copilot />} />
              <Route path="discovery" element={<DiscoveryInterviews />} />
              <Route path="patterns" element={<Patterns />} />
              <Route path="assumptions" element={<Assumptions />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="signals" element={<Signals />} />
              <Route path="profile" element={<Placeholder title="Mentor Profile" />} />
            </Route>

            <Route path="/copilot" element={<RolePathRedirect segment="copilot" allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF, RoleType.FOUNDER, RoleType.STARTUP_TEAM, RoleType.MENTOR]} />} />
            <Route path="/problem" element={<RolePathRedirect segment="problem" allowedRoles={[RoleType.FOUNDER, RoleType.STARTUP_TEAM]} />} />
            <Route path="/canvas" element={<RolePathRedirect segment="canvas" allowedRoles={[RoleType.FOUNDER, RoleType.STARTUP_TEAM]} />} />
            <Route path="/early-adopter" element={<RolePathRedirect segment="early-adopter" allowedRoles={[RoleType.FOUNDER, RoleType.STARTUP_TEAM]} />} />
            <Route path="/discovery" element={<RolePathRedirect segment="discovery" allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF, RoleType.FOUNDER, RoleType.STARTUP_TEAM, RoleType.MENTOR]} />} />
            <Route path="/patterns" element={<RolePathRedirect segment="patterns" allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF, RoleType.FOUNDER, RoleType.STARTUP_TEAM, RoleType.MENTOR]} />} />
            <Route path="/assumptions" element={<RolePathRedirect segment="assumptions" allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF, RoleType.FOUNDER, RoleType.STARTUP_TEAM, RoleType.MENTOR]} />} />
            <Route path="/experiments" element={<RolePathRedirect segment="experiments" allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF, RoleType.FOUNDER, RoleType.STARTUP_TEAM, RoleType.MENTOR]} />} />
            <Route path="/signals" element={<RolePathRedirect segment="signals" allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF, RoleType.FOUNDER, RoleType.STARTUP_TEAM, RoleType.MENTOR]} />} />
            <Route path="/readiness" element={<RolePathRedirect segment="readiness" allowedRoles={[RoleType.OM_ADMIN, RoleType.OM_STAFF]} />} />
            <Route path="/companies" element={<RolePathRedirect />} />
            <Route path="/cohorts" element={<RolePathRedirect />} />
            <Route path="/mentors" element={<RolePathRedirect />} />
            <Route path="/profile" element={<RolePathRedirect />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
