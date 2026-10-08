import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logoutAndRedirect } from '../../utils/logout';

interface TalleristaLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    {
        path: '/dashboard', label: 'Resumen', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        )
    },
    {
        path: '/calendar', label: 'Calendario', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        )
    },
    {
        path: '/students', label: 'Alumnos', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        )
    },
    {
        path: '/teachers', label: 'Profesores', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6l7 4-7 4-7-4 7-4zm0 8v6m-7-2l7 4 7-4" /></svg>
        )
    },
    {
        path: '/giftcards', label: 'Bonos Regalo', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
        )
    },
    {
        path: '/history', label: 'Historial', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )
    },
    {
        path: '/inventory', label: 'Inventario', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        )
    },
    {
        path: '/team', label: 'Equipo', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        )
    },
];

const menuConfig = [
    { group: 'INICIO', items: [{ path: '/dashboard', label: 'Inicio' }] },
    {
        group: 'GESTIÓN', items: [
            { path: '/calendar', label: 'Calendario' },
            { path: '/students', label: 'Alumnos' },
            { path: '/teachers', label: 'Profesores' },
            { path: '/history', label: 'Historial' }
        ]
    },
    { group: 'TALLER', items: [{ path: '/inventory', label: 'Inventario' }] },
    { group: 'COMERCIAL', items: [{ path: '/giftcards', label: 'Bonos Regalo' }] },
    { group: 'SISTEMA', items: [{ path: '/team', label: 'Equipo' }, { path: '/settings', label: 'Configuración' }] }
];

const getViewTitle = (pathname: string) => {
    switch (pathname) {
        case '/dashboard': return <>
            <span className="eyebrow block mb-1">Centro de operaciones</span>
            Estado del <span className="text-brand italic">taller hoy</span>
        </>;
        case '/calendar': return <>Gestión de <span className="text-brand italic">agenda</span></>;
        case '/students': return <>Gestión de <span className="text-brand italic">alumnos</span></>;
        case '/teachers': return <>Gestión de <span className="text-brand italic">profesores</span></>;
        case '/pieces': return <>Control de <span className="text-brand italic">piezas</span></>;
        case '/giftcards': return <>Tarjetas de <span className="text-brand italic">regalo</span></>;
        case '/history': return <>Historial <span className="text-brand italic">maestro</span></>;
        case '/inventory': return <>Inventario del <span className="text-brand italic">estudio</span></>;
        case '/settings': return <>Configuración del <span className="text-brand italic">sistema</span></>;
        case '/team': return <>Equipo de <span className="text-brand italic">trabajo</span></>;
        default: return <>Estudio</>;
    }
};

const TalleristaLayout: React.FC<TalleristaLayoutProps> = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { profile } = useAuth();

    const handleLogout = async () => {
        await logoutAndRedirect('/login');
    };

    const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Estudio';
    const isStaff = profile?.role === 'staff';

    // Staff cannot see team management or settings
    const staffHiddenPaths = ['/team', '/settings'];
    const filteredNavItems = isStaff ? navItems.filter(item => !staffHiddenPaths.includes(item.path)) : navItems;
    const filteredMenuConfig = isStaff
        ? menuConfig.map(g => ({ ...g, items: g.items.filter(i => !staffHiddenPaths.includes(i.path)) })).filter(g => g.items.length > 0)
        : menuConfig;

    return (
        <div className="flex flex-col lg:flex-row h-screen w-full bg-neutral-base overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block h-full py-6 pl-6 shrink-0">
                <div className="w-64 xl:w-72 bg-white border border-neutral-border flex flex-col h-full rounded-2xl soft-shadow flex-shrink-0 animate-fade-in overflow-hidden">
                    <div className="p-5 xl:p-6 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white font-semibold text-lg shrink-0">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <h1 className="text-[17px] font-bold text-neutral-textMain leading-tight truncate">{displayName}</h1>
                                <p className="text-[10px] text-neutral-textHelper uppercase font-medium tracking-[0.14em]">Estudio</p>
                            </div>
                        </div>

                        <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar py-2">
                            {filteredNavItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center gap-3 px-3.5 min-h-[44px] rounded-[10px] transition-colors duration-200 group ${location.pathname === item.path
                                        ? 'bg-brand text-white'
                                        : 'text-neutral-textSec hover:bg-neutral-alt hover:text-brand'
                                        }`}
                                >
                                    <div className="transition-transform duration-200 shrink-0 group-hover:scale-105">
                                        {item.icon}
                                    </div>
                                    <span className={`text-[14px] truncate ${location.pathname === item.path ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="mt-4 pt-4 border-t border-neutral-border shrink-0">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3.5 min-h-[44px] rounded-[10px] text-neutral-textHelper hover:text-brand hover:bg-neutral-alt transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span className="text-[14px] font-medium">Salir</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="p-3 md:p-6 shrink-0">
                    <header className="bg-white border border-neutral-border rounded-2xl px-5 md:px-7 py-4 md:py-5 flex justify-between items-center gap-4 relative z-40">
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-[20px] md:text-[26px] text-neutral-textMain leading-tight">
                                {getViewTitle(location.pathname)}
                            </h2>
                        </div>

                        <div id="tallerista-header-actions" className="ml-auto flex items-center shrink-0"></div>

                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="flex flex-col justify-center items-end gap-[6px] w-[44px] h-[44px] shrink-0 hover:opacity-60 transition-opacity"
                            aria-label="Abrir menú"
                        >
                            <div className="w-[26px] h-[2px] bg-neutral-textMain rounded-full"></div>
                            <div className="w-[26px] h-[2px] bg-neutral-textMain rounded-full"></div>
                            <div className="w-[18px] h-[2px] bg-neutral-textMain rounded-full"></div>
                        </button>
                    </header>
                </div>

                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </main>

            {/* Mobile Menu Drawer */}
            {isMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[100] animate-fade-in"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="fixed top-0 right-0 h-full w-[280px] md:w-[340px] bg-white z-[110] shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden rounded-l-3xl">
                        <div className="px-6 py-5 border-b border-neutral-border flex justify-between items-start gap-4">
                            <div>
                                <h3 className="text-[20px] text-neutral-textMain">Menú</h3>
                                <p className="text-[11px] text-neutral-textHelper uppercase tracking-[0.14em] font-medium mt-0.5">Estudio de Cerámica</p>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú" className="w-10 h-10 -mr-2 rounded-full text-neutral-textMain hover:bg-neutral-sec flex items-center justify-center transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-8">
                            {filteredMenuConfig.map((group) => (
                                <div key={group.group} className="space-y-2">
                                    <h4 className="eyebrow px-3">{group.group}</h4>
                                    <div className="space-y-1">
                                        {group.items.map(item => (
                                            <button
                                                key={item.path}
                                                onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                                                className={`w-full text-left px-4 min-h-[44px] py-3 rounded-[10px] text-[15px] transition-colors duration-200 flex items-center ${location.pathname === item.path
                                                    ? 'bg-brand text-white font-semibold'
                                                    : 'text-neutral-textMain hover:bg-neutral-alt font-medium'
                                                    }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 border-t border-neutral-border">
                                <button
                                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 text-brand font-semibold text-[14px] hover:opacity-70 transition-opacity"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TalleristaLayout;
