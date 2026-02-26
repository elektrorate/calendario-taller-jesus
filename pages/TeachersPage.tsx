import React from 'react';
import { useData } from '../context/DataContext';
import TeachersView from '../components/TeachersView';

const TeachersPage: React.FC = () => {
    const { teachers, sessions, addTeacher, updateTeacher, deleteTeacher, isLoadingData } = useData();

    if (isLoadingData) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-textHelper uppercase text-[12px] tracking-widest">
                Cargando datos...
            </div>
        );
    }

    return (
        <TeachersView
            teachers={teachers}
            sessions={sessions}
            onAddTeacher={addTeacher}
            onUpdateTeacher={updateTeacher}
            onDeleteTeacher={deleteTeacher}
        />
    );
};

export default TeachersPage;
