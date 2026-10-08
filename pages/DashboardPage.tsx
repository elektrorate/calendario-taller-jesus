import React from 'react';
import { useData } from '../context/DataContext';
import DashboardView from '../components/DashboardView';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
    const { students, sessions, updateSession, isLoadingData } = useData();
    const navigate = useNavigate();

    if (isLoadingData) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-textHelper uppercase text-[12px] tracking-widest">
                Cargando datos...
            </div>
        );
    }

    return (
        <DashboardView
            students={students}
            sessions={sessions}
            onUpdateSession={updateSession}
            onNavigate={(view) => navigate(`/${view}`)}
            onOpenStudentProfile={(studentId) => navigate(`/students?selected=${studentId}`)}
        />
    );
};

export default DashboardPage;
