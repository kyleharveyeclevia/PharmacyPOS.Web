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
import ImportProductsPage from './pages/ImportProductsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import TerminalGuard from './guards/TerminalGuard.jsx';

/* =========================
   TERMINAL GUARD
========================= */
function TerminalGuardWrapper({ children }) {
  const terminalGuid = localStorage.getItem('terminalGuid');
  const terminalId = localStorage.getItem('terminalId');

  if (!terminalGuid || !terminalId) {
    return <Navigate to="/terminal-setup" replace />;
  }

  return children;
}

/* =========================
   AUTH GUARD
========================= */
function AuthGuard({ children, roles }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/* =========================
   PROTECTED LAYOUT ROUTE
========================= */
function ProtectedLayout() {
  return (
    <TerminalGuardWrapper>
      <AuthGuard>
        <Layout />
      </AuthGuard>
    </TerminalGuardWrapper>
  );
}

/* =========================
   APP
========================= */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />

        <Routes>

          {/* PUBLIC */}
          <Route path="/login" element={<TerminalGuard><LoginPage /></TerminalGuard>} />
          <Route path="/terminal-setup" element={<TerminalSetupPage />} />

          {/* PROTECTED LAYOUT */}
          <Route path="/" element={<ProtectedLayout />}>
            
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="pos" element={<POSPage />} />

            <Route
              path="inventory"
              element={
                <AuthGuard roles={['Admin', 'Pharmacist']}>
                  <InventoryPage />
                </AuthGuard>
              }
            />

            <Route path="categories" element={<CategoriesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="inventory/import" element={<ImportProductsPage />} />

            <Route path="reports" element={<ReportsPage />} />

            <Route
              path="users"
              element={
                <AuthGuard roles={['Admin']}>
                  <UsersPage />
                </AuthGuard>
              }
            />

          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}