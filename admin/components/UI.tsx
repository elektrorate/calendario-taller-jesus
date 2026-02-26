
import React from 'react';

export const Icon = {
  Home: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  Workshop: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V5a2 2 0 0 1 2-2z" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M12 22v-5" />
    </svg>
  ),
  Chart: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  ArrowUpRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7M17 7H8M17 7V16" />
    </svg>
  ),
  Filter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16" y2="16" />
    </svg>
  ),
  Target: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Refresh: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Bell: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  More: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
    </svg>
  ),
  IdCard: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <path d="M7 8a2 2 0 1 1 4 0v2a2 2 0 1 1-4 0z" />
      <line x1="14" y1="8" x2="17" y2="8" />
      <line x1="14" y1="11" x2="17" y2="11" />
      <line x1="7" y1="15" x2="17" y2="15" />
    </svg>
  )
};

export const ActivityPill: React.FC<{
  label: string;
  value: string;
  status: string;
  percentage: string;
  iconBg: string;
}> = ({ label, value, status, percentage, iconBg }) => {
  const parts = value.split(' / ');

  return (
    <div className="activity-pill group !py-8 !px-10 bg-[#F4EEE8]/50 hover:bg-[#F4EEE8] rounded-[48px] flex items-center shadow-none border border-transparent transition-all">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mr-8 shrink-0 shadow-lg shadow-black/5" style={{ backgroundColor: iconBg }}>
        <Icon.ArrowUpRight />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#9B9491] uppercase tracking-[0.05em] mb-1.5">{label}</p>
        <p className="text-[28px] font-extrabold text-[#312A2C] leading-none tracking-tighter">
          {parts[0]}
          {parts[1] && <span className="text-[#9B9491] font-bold"> / {parts[1]}</span>}
        </p>
      </div>
      <div className="text-right flex flex-col items-end shrink-0 pl-6">
        <p className="text-[12px] font-extrabold text-[#9B9491] mb-1.5 uppercase tracking-tight">{status}</p>
        <p className="text-[26px] font-black text-[#312A2C] tracking-tighter leading-none">{percentage}</p>
      </div>
    </div>
  );
};

export const DaySelector: React.FC<{ days: { num: string, name: string }[], activeDay: string }> = ({ days, activeDay }) => (
  <div className="flex items-center px-4 mb-12 overflow-x-auto gap-6 no-scrollbar py-6 -mx-4">
    {days.map(day => (
      <div
        key={day.num}
        className={`day-pill shrink-0 shadow-none border-none outline-none ${day.num === activeDay ? 'day-pill-active' : 'text-[#8A8481] hover:bg-white/50'}`}
      >
        <div className={`text-[32px] font-extrabold mb-1 tracking-tighter leading-none ${day.num === activeDay ? 'text-white' : 'text-[#312A2C]'}`}>{day.num}</div>
        <div className={`text-[11px] font-bold uppercase tracking-[0.15em] ${day.num === activeDay ? 'text-[#ADAEB3]' : 'opacity-60'}`}>{day.name}</div>
      </div>
    ))}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`premium-card p-10 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<any> = ({ variant = 'primary', size = 'md', children, className, ...props }) => {
  const variants: any = {
    primary: "bg-[#C17D5C] text-white hover:brightness-105 shadow-xl transition-all duration-300",
    dark: "bg-[#312A2C] text-white hover:bg-[#251F21] shadow-xl transition-all duration-300",
    outline: "border border-[#F1E9E2] bg-white text-[#312A2C] hover:border-[#C17D5C] hover:text-[#C17D5C] transition-all duration-300",
    ghost: "text-[#8A8481] hover:text-[#312A2C] transition-all duration-300",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-xl transition-all duration-300",
  };
  const sizes: any = {
    sm: "px-6 py-4 text-[11px]",
    md: "px-10 py-5 text-[12px]",
    lg: "px-14 py-8 text-[14px] tracking-[0.2em]"
  };
  return (
    <button className={`inline-flex items-center justify-center font-extrabold uppercase tracking-[0.2em] rounded-full active:scale-95 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Toast: React.FC<any> = ({ message, type }) => (
  <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
    <div className={`px-12 py-6 rounded-full shadow-2xl text-white font-extrabold tracking-widest flex items-center gap-5 ${type === 'error' ? 'bg-rose-600' : 'bg-[#312A2C]'}`}>
      <span className="text-xl">{type === 'success' ? '✓' : 'ℹ'}</span>
      <span className="text-[12px] uppercase">{message}</span>
    </div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'yellow' | 'success' | 'info' | 'error' | 'outline' | 'warning' | 'neutral' }> = ({ children, variant = 'default' }) => {
  const variants: any = {
    default: "bg-[#312A2C] text-white",
    yellow: "bg-[#F4D000] text-[#111111]",
    success: "bg-emerald-500 text-white",
    info: "bg-blue-500 text-white",
    error: "bg-rose-500 text-white",
    warning: "bg-amber-500 text-white",
    outline: "border border-[#F1E9E2] text-[#8A8481]",
    neutral: "bg-gray-100 text-gray-600"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<any> = ({ label, className, ...props }) => (
  <div className="w-full text-left">
    {label && <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 ml-4">{label}</label>}
    <input
      className={`w-full h-14 px-6 rounded-[20px] bg-gray-50 border border-[#E6E6E6] focus:bg-white focus:border-[#C17D5C] focus:ring-4 focus:ring-[#C17D5C]/10 outline-none transition-all font-medium text-sm ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<any> = ({ label, options, className, ...props }) => (
  <div className="w-full text-left">
    {label && <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 ml-4">{label}</label>}
    <div className="relative">
      <select
        className={`w-full h-14 px-6 rounded-[20px] bg-gray-50 border border-[#E6E6E6] focus:bg-white focus:border-[#C17D5C] focus:ring-4 focus:ring-[#C17D5C]/10 outline-none transition-all font-medium text-sm appearance-none ${className}`}
        {...props}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    </div>
  </div>
);

export const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="p-20 text-center bg-white/40 rounded-[48px] border border-dashed border-[#F1E9E2]">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl opacity-50">🏺</div>
    <h3 className="text-xl font-bold text-[#312A2C] mb-2">{title}</h3>
    {subtitle && <p className="text-sm text-[#8A8481] font-medium">{subtitle}</p>}
  </div>
);

export const SearchPill: React.FC<any> = ({ value, onChange, placeholder }) => (
  <div className="relative w-full max-w-xl group">
    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#8A8481] group-focus-within:text-[#C17D5C] transition-colors">
      <Icon.Filter />
    </div>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-16 pl-16 pr-8 rounded-full bg-white border border-[#F1E9E2] focus:border-[#C17D5C] focus:ring-8 focus:ring-[#C17D5C]/5 outline-none transition-all font-medium text-sm shadow-sm"
    />
  </div>
);

export const ListCard: React.FC<{
  title: string;
  subtitle: string;
  info: string;
  badge?: string;
  onView: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}> = ({ title, subtitle, info, badge, onView, onEdit, onDelete }) => (
  <div className="bg-white p-8 rounded-[32px] border border-[#F1E9E2] hover:border-[#C17D5C] hover:shadow-xl transition-all group flex flex-col md:flex-row md:items-center gap-6">
    <div className="w-16 h-16 bg-[#FDF8F3] rounded-2xl flex items-center justify-center text-[#C17D5C] shrink-0 group-hover:bg-[#C17D5C] group-hover:text-white transition-colors">
      <Icon.IdCard />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <h3 className="font-extrabold text-lg text-[#312A2C] truncate uppercase tracking-tighter">{title}</h3>
        {badge && <Badge variant="outline">{badge}</Badge>}
      </div>
      <p className="text-[11px] font-bold text-[#C17D5C] uppercase tracking-widest mb-1">{subtitle}</p>
      <p className="text-xs text-[#8A8481] font-medium truncate">{info}</p>
    </div>
    <div className="flex gap-3 shrink-0">
      <Button variant="outline" size="sm" onClick={onView} className="!px-6 !py-3">VER</Button>
      <Button variant="dark" size="sm" onClick={onEdit} className="!px-6 !py-3">EDITAR</Button>
      {onDelete && <Button variant="danger" size="sm" onClick={onDelete} className="!px-6 !py-3">ELIMINAR</Button>}
    </div>
  </div>
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode
}> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-[#312A2C]/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-[#F1E9E2] flex justify-between items-center shrink-0">
          <h2 className="text-xl font-extrabold text-[#312A2C] uppercase tracking-tighter">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-[#FDF8F3] flex items-center justify-center transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8481" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-10 overflow-y-auto no-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="p-10 border-t border-[#F1E9E2] bg-[#FDF8F3]/50 flex justify-end gap-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
