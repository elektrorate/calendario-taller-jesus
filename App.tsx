import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import TalleristaLayout from './components/layout/TalleristaLayout';
import Login from './components/Login';

// Tallerista Pages
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import PiecesPage from './pages/PiecesPage';
import GiftCardsPage from './pages/GiftCardsPage';
import HistoryPage from './pages/HistoryPage';
import InventoryPage from './pages/InventoryPage';
import SettingsPage from './pages/SettingsPage';

// Admin Module (self-contained with its own context + original UI)
import AdminApp from './admin/AdminApp';

// Root route handler - redirects based on role
const RootRedirect: React.FC = () => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3EDE6] flex items-center justify-center">
        <div className="text-[#A8A9AE] text-sm uppercase tracking-widest animate-pulse">
          Cargando...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Tallerista Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><DashboardPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><CalendarPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/students" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><StudentsPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/teachers" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><TeachersPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/pieces" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><PiecesPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/giftcards" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><GiftCardsPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><HistoryPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><InventoryPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['tallerista', 'staff']}>
              <DataProvider>
                <TalleristaLayout><SettingsPage /></TalleristaLayout>
              </DataProvider>
            </ProtectedRoute>
          } />

          {/* Admin Routes - Self-contained module with original UI */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AdminApp />
            </ProtectedRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
