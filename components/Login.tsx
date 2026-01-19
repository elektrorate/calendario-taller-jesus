import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulación de carga
    setTimeout(() => {
      onLogin();
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-base p-6 md:p-8 font-sans">
      <div className="w-full max-w-xl bg-white rounded-[3.5rem] md:rounded-[4.5rem] p-10 md:p-20 border border-neutral-border soft-shadow animate-fade-in flex flex-col items-center relative overflow-hidden">
        {/* Adorno visual sutil similar a los interiores */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand/5 rounded-full blur-3xl"></div>

        <div className="w-20 h-20 md:w-24 md:h-24 bg-brand rounded-full flex items-center justify-center text-white font-extrabold text-[32px] md:text-[42px] mb-10 shadow-xl shadow-brand/20 relative z-10">A</div>
        
        <div className="text-center mb-12 relative z-10">
          <p className="text-[10px] md:text-[12px] font-light text-neutral-textHelper uppercase tracking-[0.3em] mb-2">SISTEMA DE GESTIÓN</p>
          <h1 className="text-[32px] md:text-[48px] font-extrabold text-neutral-textMain uppercase tracking-tight leading-[1.1]">
            BIENVENIDO AL <span className="text-brand">ESTUDIO</span>
          </h1>
          <div className="h-1 w-12 bg-brand mx-auto mt-6 rounded-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6 md:space-y-8 relative z-10">
          <div className="space-y-3">
            <label className="block text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-widest ml-4">Usuario o Email</label>
            <input 
              required 
              type="text" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-8 py-5 md:py-6 bg-neutral-sec border border-neutral-border focus:border-brand focus:bg-white rounded-[2rem] font-light text-[18px] md:text-[20px] outline-none transition-all placeholder:text-neutral-textHelper/50" 
              placeholder="alexander@estudio.com" 
            />
          </div>
          <div className="space-y-3">
            <label className="block text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-widest ml-4">Contraseña</label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-8 py-5 md:py-6 bg-neutral-sec border border-neutral-border focus:border-brand focus:bg-white rounded-[2rem] font-light text-[18px] md:text-[20px] outline-none transition-all placeholder:text-neutral-textHelper/50" 
              placeholder="••••••••" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full py-6 md:py-7 bg-brand text-white rounded-[2.5rem] font-extrabold shadow-lg shadow-brand/20 uppercase tracking-[0.2em] text-[16px] md:text-[18px] hover:bg-brand-hover hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 mt-4"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Entrar al Taller
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </>
            )}
          </button>
        </form>
        
        <p className="mt-16 text-[10px] md:text-[11px] font-light text-neutral-textHelper uppercase text-center tracking-[0.2em] opacity-60">Artesania & Gestión Studio v1.2</p>
      </div>
    </div>
  );
};

export default Login;