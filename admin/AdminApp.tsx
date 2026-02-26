
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Workshops } from './pages/Workshops';
import { WorkshopForm } from './pages/WorkshopForm';
import { WorkshopDetail } from './pages/WorkshopDetail';
import { Reports } from './pages/Reports';

/**
 * AdminApp - Self-contained admin module with its own context & layout.
 * This renders inside the main App's Router, wrapped by ProtectedRoute.
 * The original UI from entrada-a-la-app-calendario is preserved exactly.
 */
const AdminApp: React.FC = () => {
    return (
        <AppProvider>
            <Layout>
                <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="talleres" element={<Workshops />} />
                    <Route path="talleres/nuevo" element={<WorkshopForm />} />
                    <Route path="talleres/editar/:id" element={<WorkshopForm />} />
                    <Route path="talleres/:id" element={<WorkshopDetail />} />
                    <Route path="reportes" element={<Reports />} />
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </Layout>
        </AppProvider>
    );
};

export default AdminApp;
