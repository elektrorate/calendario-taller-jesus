import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

type LoginMode = 'login' | 'forgot-password';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<LoginMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { login, session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!session || !profile) return;

    const requestedPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
    const destination = profile.role === 'super_admin' ? '/admin' : '/dashboard';
    const canReturnToRequestedPath = requestedPath
      && (profile.role === 'super_admin' ? requestedPath.startsWith('/admin') : !requestedPath.startsWith('/admin'));

    navigate(canReturnToRequestedPath ? requestedPath : destination, { replace: true });
  }, [session, profile, navigate, location.state]);

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setIsLoading(true);

    const result = await login(email.trim().toLowerCase(), password);

    if (!result.success) {
      setErrorMessage(result.error || 'No se pudo iniciar sesión.');
    }

    setIsLoading(false);
  };

  const handlePasswordRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setIsLoading(true);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });

    if (error) {
      setErrorMessage('No se pudo enviar el correo. Inténtalo de nuevo dentro de unos minutos.');
    } else {
      setSuccessMessage('Si el correo pertenece a una cuenta autorizada, recibirás un enlace para crear una nueva contraseña.');
    }

    setIsLoading(false);
  };

  const changeMode = (nextMode: LoginMode) => {
    clearFeedback();
    setPassword('');
    setMode(nextMode);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-base p-4 md:p-8 font-sans">
      <div className="w-full max-w-[440px] bg-white rounded-2xl p-6 md:p-10 border border-neutral-border soft-shadow animate-fade-in flex flex-col items-center relative">
        <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl mb-8">A</div>

        <div className="text-center mb-8 w-full">
          <p className="eyebrow mb-2">Sistema de gestión</p>
          <h1 className="text-[30px] md:text-[36px] text-neutral-textMain leading-tight">
            {mode === 'login' ? <>Bienvenido al <span className="text-brand italic">estudio</span></> : <>Recupera tu <span className="text-brand italic">acceso</span></>}
          </h1>
          <div className="h-[3px] w-10 bg-caramelo mx-auto mt-5 rounded-full" />
          {mode === 'forgot-password' && <p className="mt-4 text-[14px] text-neutral-textHelper leading-relaxed">Escribe el correo asociado a tu cuenta y te enviaremos un enlace seguro.</p>}
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handlePasswordRecovery} className="w-full space-y-5 relative">
          {errorMessage && <div role="alert" className="rounded-[10px] bg-[#F8E1DA] border border-[#EFC9BE] px-4 py-3 text-[14px] text-[#9E3B2B]">{errorMessage}</div>}
          {successMessage && <div role="status" className="rounded-[10px] bg-[#DFF0E4] border border-[#BFDECB] px-4 py-3 text-[14px] text-[#20663B]">{successMessage}</div>}

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-[12px] font-semibold text-neutral-textSec">Correo electrónico</label>
            <input id="login-email" required autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full min-h-[48px] px-4 py-3 bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 rounded-[10px] text-[16px] outline-none transition-all placeholder:text-neutral-textHelper" placeholder="tu@correo.com" />
          </div>

          {mode === 'login' && (
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-[12px] font-semibold text-neutral-textSec">Contraseña</label>
              <input id="login-password" required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full min-h-[48px] px-4 py-3 bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 rounded-[10px] text-[16px] outline-none transition-all placeholder:text-neutral-textHelper" placeholder="••••••••" />
              <div className="flex justify-end pt-1">
                <button type="button" onClick={() => changeMode('forgot-password')} className="text-[13px] font-medium text-neutral-textHelper hover:text-brand transition-colors">¿Olvidaste tu contraseña?</button>
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full min-h-[48px] py-3 bg-brand text-white rounded-[10px] font-semibold text-[15px] hover:bg-brand-hover active:scale-[0.99] transition-all flex items-center justify-center gap-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : mode === 'login' ? 'Iniciar sesión' : 'Enviar enlace'}
          </button>

          {mode === 'forgot-password' && (
            <button type="button" onClick={() => changeMode('login')} className="w-full min-h-[44px] py-2 text-[14px] font-medium text-neutral-textHelper hover:text-brand transition-colors">Volver al inicio de sesión</button>
          )}
        </form>

        <p className="mt-10 text-[12px] text-neutral-textHelper text-center">Acceso exclusivo para usuarios autorizados</p>
      </div>
    </div>
  );
};

export default Login;
