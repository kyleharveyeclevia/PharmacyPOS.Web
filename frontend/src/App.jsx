import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import POSPage from './pages/POSPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import TerminalSetupPage from './pages/TerminalSetupPage.jsx';
import TerminalGuard from './guards/TerminalGuard.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, isLoggedIn } = useAuth();

   // ✅ Terminal check
  const terminalGuid = localStorage.getItem('terminalGuid');

  if (!terminalGuid) {
    return <Navigate to="/terminal-setup" replace />;
  }
 
  // auth check
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <Routes>
          <Route path="/login" element={ <TerminalGuard>
    <LoginPage />
  </TerminalGuard>} />
          <Route path="/terminal-setup" element={<TerminalSetupPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pos"       element={<POSPage />} />
            <Route path="inventory" element={
              <ProtectedRoute children ={<InventoryPage />} roles={['Admin','Pharmacist']}></ProtectedRoute>
            } />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users"   element={
              <ProtectedRoute roles={['Admin']}><UsersPage /></ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
