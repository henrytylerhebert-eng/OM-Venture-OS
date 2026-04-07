import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

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
            
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="companies" element={<Placeholder title="Companies Management" />} />
              <Route path="cohorts" element={<Placeholder title="Cohorts Management" />} />
              <Route path="mentors" element={<Placeholder title="Mentors Management" />} />
              <Route path="profile" element={<Placeholder title="My Profile" />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
