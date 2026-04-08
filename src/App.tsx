import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RoleGuard } from './components/RoleGuard';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SeedData from './pages/SeedData';
import QAPage from './pages/QAPage';
import Copilot from './pages/Copilot';
import DiscoveryInterviews from './pages/DiscoveryInterviews';
import Patterns from './pages/Patterns';
import Assumptions from './pages/Assumptions';
import Experiments from './pages/Experiments';
import Signals from './pages/Signals';
import ReadinessQueue from './pages/ReadinessQueue';

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
            <Route path="/login" element={<Login />} />
            <Route path="/seed" element={<SeedData />} />
            <Route path="/qa" element={<QAPage />} />
            
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              
              {/* Admin & Staff Only */}
              <Route 
                path="companies" 
                element={
                  <RoleGuard allowedRoles={['om_admin', 'om_staff']}>
                    <Placeholder title="Companies Management" />
                  </RoleGuard>
                } 
              />
              <Route 
                path="cohorts" 
                element={
                  <RoleGuard allowedRoles={['om_admin', 'om_staff']}>
                    <Placeholder title="Cohorts Management" />
                  </RoleGuard>
                } 
              />
              <Route 
                path="mentors" 
                element={
                  <RoleGuard allowedRoles={['om_admin', 'om_staff']}>
                    <Placeholder title="Mentors Management" />
                  </RoleGuard>
                } 
              />
              <Route 
                path="readiness" 
                element={
                  <RoleGuard allowedRoles={['om_admin', 'om_staff']}>
                    <ReadinessQueue />
                  </RoleGuard>
                } 
              />
              
              {/* Common Routes */}
              <Route 
                path="copilot"
                element={
                  <RoleGuard allowedRoles={['founder', 'om_admin', 'om_staff', 'mentor']}>
                    <Copilot />
                  </RoleGuard>
                }
              />
              <Route 
                path="discovery" 
                element={
                  <RoleGuard allowedRoles={['founder', 'om_admin', 'om_staff', 'mentor']}>
                    <DiscoveryInterviews />
                  </RoleGuard>
                } 
              />
              <Route 
                path="patterns" 
                element={
                  <RoleGuard allowedRoles={['founder', 'om_admin', 'om_staff', 'mentor']}>
                    <Patterns />
                  </RoleGuard>
                } 
              />
              <Route 
                path="assumptions" 
                element={
                  <RoleGuard allowedRoles={['founder', 'om_admin', 'om_staff', 'mentor']}>
                    <Assumptions />
                  </RoleGuard>
                } 
              />
              <Route 
                path="experiments" 
                element={
                  <RoleGuard allowedRoles={['founder', 'om_admin', 'om_staff', 'mentor']}>
                    <Experiments />
                  </RoleGuard>
                } 
              />
              <Route 
                path="signals" 
                element={
                  <RoleGuard allowedRoles={['founder', 'om_admin', 'om_staff', 'mentor']}>
                    <Signals />
                  </RoleGuard>
                } 
              />
              <Route path="profile" element={<Placeholder title="My Profile" />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
