import React from 'react';
import { useData } from '../context/DataContext';
import HistoryView from '../components/HistoryView';

const HistoryPage: React.FC = () => {
    const { students, sessions, pieces, isLoadingData } = useData();

    if (isLoadingData) {
        return (
            <div className="h-full flex items-center justify-center text-neutral-textHelper uppercase text-[12px] tracking-widest">
                Cargando datos...
            </div>
        );
    }

    return (
        <HistoryView
            students={students}
            sessions={sessions}
            pieces={pieces}
        />
    );
};

export default HistoryPage;
