import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
        path: '/pieces', label: 'Piezas', icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
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
            { path: '/pieces', label: 'Piezas' },
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
            <span className="text-neutral-textHelper font-light text-[12px] block mb-0.5 tracking-widest">CENTRO DE OPERACIONES</span>
            ESTADO DEL <span className="text-brand">TALLER HOY</span>
        </>;
        case '/calendar': return <>GESTIÓN DE <span className="text-brand">AGENDA</span></>;
        case '/students': return <>GESTIÓN DE <span className="text-brand">ALUMNOS</span></>;
        case '/teachers': return <>GESTIÓN DE <span className="text-brand">PROFESORES</span></>;
        case '/pieces': return <>CONTROL DE <span className="text-brand">PIEZAS</span></>;
        case '/giftcards': return <>TARJETAS DE <span className="text-brand">REGALO</span></>;
        case '/history': return <>HISTORIAL <span className="text-brand">MAESTRO</span></>;
        case '/inventory': return <>INVENTARIO <span className="text-brand">ESTUDIO</span></>;
        case '/settings': return <>CONFIGURACIÓN DEL <span className="text-brand">SISTEMA</span></>;
        case '/team': return <>EQUIPO DE <span className="text-brand">TRABAJO</span></>;
        default: return <>ESTUDIO</>;
    }
};

const TalleristaLayout: React.FC<TalleristaLayoutProps> = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, profile } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
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
                <div className="w-64 xl:w-72 bg-white border border-neutral-border flex flex-col h-full rounded-[2.5rem] md:rounded-[3.5rem] soft-shadow flex-shrink-0 animate-fade-in overflow-hidden">
                    <div className="p-6 md:p-8 xl:p-10 flex flex-col h-full">
                        <div className="flex items-center space-x-3 md:space-x-4 mb-8 md:mb-12">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand rounded-full flex items-center justify-center text-white font-extrabold text-xl md:text-2xl soft-shadow">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <h1 className="text-base md:text-lg font-extrabold text-neutral-textMain leading-tight truncate uppercase tracking-tight">{displayName}</h1>
                                <p className="text-[10px] md:text-[11px] text-neutral-textHelper uppercase font-light tracking-widest">Estudio</p>
                            </div>
                        </div>

                        <nav className="space-y-2 md:space-y-3 flex-1 overflow-y-auto no-scrollbar py-2">
                            {filteredNavItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center space-x-3 md:space-x-4 p-3 md:p-4 rounded-2xl transition-all duration-300 group ${location.pathname === item.path
                                        ? 'bg-brand text-white soft-shadow'
                                        : 'text-neutral-textSec hover:bg-neutral-alt hover:text-brand'
                                        }`}
                                >
                                    <div className={`transition-transform duration-300 shrink-0 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-sm md:text-[16px] tracking-tight truncate uppercase tracking-widest ${location.pathname === item.path ? 'font-extrabold' : 'font-light'}`}>{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="mt-6 pt-6 border-t border-neutral-border space-y-4 shrink-0">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-4 py-2 text-neutral-textHelper hover:text-brand transition-colors"
                            >
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span className="text-sm md:text-[16px] font-light uppercase tracking-wider">Salir</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="p-3 md:p-6 shrink-0">
                    <header className="bg-[#F2E8DF] rounded-[24px] md:rounded-[32px] px-6 md:px-8 py-5 md:py-6 flex justify-between items-center shadow-sm relative z-40">
                        <div className="flex flex-col">
                            <h2 className="text-[18px] md:text-[28px] font-black text-neutral-textMain leading-tight uppercase tracking-tight">
                                {getViewTitle(location.pathname)}
                            </h2>
                        </div>

                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="flex flex-col justify-center items-end gap-[5px] w-[44px] h-[44px] hover:opacity-70 transition-opacity"
                            aria-label="Abrir menú"
                        >
                            <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
                            <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
                            <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
                            <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
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
                    <div className="fixed top-0 right-0 h-full w-[300px] md:w-[380px] bg-white z-[110] shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden rounded-l-[3rem]">
                        <div className="p-8 md:p-10 border-b border-[#EAEAEA] flex justify-between items-start">
                            <div>
                                <h3 className="text-[18px] md:text-[22px] font-bold text-[#2B2B2B] uppercase tracking-tight">Menú</h3>
                                <p className="text-[12px] text-[#9A9A9A] uppercase tracking-[0.1em] font-normal mt-0.5">Estudio de Cerámica</p>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="text-[#2B2B2B] p-2 hover:opacity-50 transition-opacity">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 space-y-10">
                            {filteredMenuConfig.map((group) => (
                                <div key={group.group} className="space-y-4">
                                    <h4 className="text-[12px] font-semibold text-[#E26D5A] uppercase tracking-[0.1em] px-4">{group.group}</h4>
                                    <div className="space-y-1">
                                        {group.items.map(item => (
                                            <button
                                                key={item.path}
                                                onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                                                className={`w-full text-left px-6 py-4 rounded-[1.2rem] text-[15px] md:text-[16px] uppercase tracking-wider transition-all duration-200 flex items-center h-[52px] ${location.pathname === item.path
                                                    ? 'bg-[#E26D5A] text-white font-bold shadow-lg shadow-[#E26D5A]/20'
                                                    : 'text-[#2B2B2B] hover:bg-[#F3EDE6] font-medium'
                                                    }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="pt-6 border-t border-[#EAEAEA]">
                                <button
                                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                                    className="w-full text-left px-6 py-4 text-[#E26D5A] font-bold uppercase text-[14px] tracking-widest hover:opacity-70 transition-opacity"
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
