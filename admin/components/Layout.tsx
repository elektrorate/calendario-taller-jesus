
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Toast, Icon, Button } from './UI';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast, currentUser, logout, workshops, showToast } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return 'CONTROL PANEL';
    if (path.startsWith('/admin/talleres')) return 'WORKSHOP NETWORK';
    if (path === '/admin/reportes') return 'MARKET ANALYTICS';
    return 'ADMIN';
  };

  const navItems = [
    { to: '/admin', label: 'INICIO', icon: <Icon.Home /> },
    { to: '/admin/talleres', label: 'TALLERES', icon: <Icon.Workshop /> },
    { to: '/admin/reportes', label: 'REPORTES', icon: <Icon.Chart /> },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Sincronización Exitosa', 'success');
    }, 1200);
  };

  const alertsCount = workshops.filter(w => !w.adminGeneralUserId).length;

  return (
    <div className="min-h-screen bg-[#F3EDE6] lg:pl-[320px]">

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[320px] bg-white border-r border-[#DDD5CD] flex-col p-12 z-50 overflow-y-auto no-scrollbar">
        <div className="flex flex-col items-center mb-16">
          <div className="w-16 h-16 bg-[#3D3437] rounded-[24px] flex items-center justify-center font-bold text-3xl text-white shadow-xl mb-6 tracking-tighter cursor-pointer" onClick={() => navigate('/admin')}>B</div>
          <span className="text-xl font-extrabold tracking-tighter text-[#3D3437] uppercase">Barro & Co.</span>
          <div className="accent-line mt-3"></div>
        </div>

        <nav className="space-y-4">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => `flex items-center gap-6 px-8 py-5 rounded-[28px] transition-all font-bold text-[12px] tracking-[0.15em] uppercase ${isActive ? 'bg-[#3D3437] text-white shadow-lg' : 'text-[#A8A9AE] hover:text-[#3D3437] hover:bg-[#F7F1EB]'}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`${isActive ? '' : 'opacity-40'}`}>{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sección Inferior del Sidebar */}
        <div className="mt-auto pt-10 flex flex-col gap-6">
          <Button
            variant="primary"
            size="sm"
            className="w-full !rounded-[32px] !py-7 shadow-xl shadow-[#CA7859]/20 gap-4 bg-[#CA7859] hover:bg-[#B56C50]"
            onClick={() => navigate('/admin/talleres/nuevo')}
          >
            NUEVA SEDE
            <Icon.ArrowUpRight />
          </Button>

          <div className="p-7 bg-[#F7F1EB] rounded-[48px] flex items-center gap-4 border border-[#DDD5CD] shadow-sm">
            <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-sm shrink-0 bg-white">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.nombre || 'Carlos'}`} alt="Admin" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-extrabold truncate uppercase tracking-tighter text-[#3D3437] leading-none mb-1">{currentUser?.nombre || 'CARLOS RUIZ'}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest leading-none">Activo</p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-8 py-4 eyebrow !text-[12px] hover:text-[#CA7859] transition-all group"
          >
            <span className="opacity-30 group-hover:opacity-100 transition-opacity rotate-180"><Icon.Logout /></span>
            DESCONECTAR
          </button>
        </div>
      </aside>

      {/* TopBar Minimal */}
      <header className="fixed top-0 left-0 lg:left-[320px] right-0 h-28 bg-[#F3EDE6]/80 backdrop-blur-xl z-40 px-12 flex items-center justify-between">
        <h1 className="text-[14px] font-extrabold tracking-widest text-[#3D3437] uppercase">{getTitle()}</h1>

        <div className="flex items-center gap-6">
          <button
            onClick={handleRefresh}
            className={`text-[#A8A9AE] hover:text-[#3D3437] transition-all ${isRefreshing ? 'animate-spin text-[#CA7859]' : ''}`}
          >
            <Icon.Refresh />
          </button>
          <button className="text-[#A8A9AE] hover:text-[#3D3437] transition-all relative">
            <Icon.Bell />
            {alertsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#CA7859] border-2 border-[#F3EDE6] rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                {alertsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 px-12 lg:px-20 pb-32">
        {children}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};
