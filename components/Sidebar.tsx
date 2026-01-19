
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout }) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Resumen', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    )},
    { id: AppView.CALENDAR, label: 'Calendario', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )},
    { id: AppView.STUDENTS, label: 'Alumnos', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )},
    { id: AppView.PIECES, label: 'Piezas', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    )},
    { id: AppView.GIFTCARDS, label: 'Bonos Regalo', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
    )},
    { id: AppView.HISTORY, label: 'Historial', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { id: AppView.INVENTORY, label: 'Inventario', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
  ];

  return (
    <div className="w-64 xl:w-72 bg-white border border-neutral-border flex flex-col h-full rounded-[2.5rem] md:rounded-[3.5rem] soft-shadow flex-shrink-0 animate-fade-in overflow-hidden">
      <div className="p-6 md:p-8 xl:p-10 flex flex-col h-full">
        <div className="flex items-center space-x-3 md:space-x-4 mb-8 md:mb-12">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-brand rounded-full flex items-center justify-center text-white font-extrabold text-xl md:text-2xl soft-shadow">A</div>
          <div className="overflow-hidden">
            <h1 className="text-base md:text-lg font-extrabold text-neutral-textMain leading-tight truncate uppercase tracking-tight">Alexander</h1>
            <p className="text-[10px] md:text-[11px] text-neutral-textHelper uppercase font-light tracking-widest">Estudio</p>
          </div>
        </div>

        <nav className="space-y-2 md:space-y-3 flex-1 overflow-y-auto no-scrollbar py-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 md:space-x-4 p-3 md:p-4 rounded-2xl transition-all duration-300 group ${
                currentView === item.id 
                ? 'bg-brand text-white soft-shadow' 
                : 'text-neutral-textSec hover:bg-neutral-alt hover:text-brand'
              }`}
            >
              <div className={`transition-transform duration-300 shrink-0 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className={`text-sm md:text-[16px] tracking-tight truncate uppercase tracking-widest ${currentView === item.id ? 'font-extrabold' : 'font-light'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-6 pt-6 border-t border-neutral-border space-y-4 shrink-0">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-4 py-2 text-neutral-textHelper hover:text-brand transition-colors"
          >
             <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             <span className="text-sm md:text-[16px] font-light uppercase tracking-wider">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
