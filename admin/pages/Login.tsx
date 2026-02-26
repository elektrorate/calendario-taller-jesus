
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, Button, Input } from '../components/UI';

export const Login: React.FC = () => {
  const { login, authError, clearAuthError } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Keep the artificial delay for UX if desired, or remove it. 
    // Implementing proper async handling.
    await new Promise(resolve => setTimeout(resolve, 1000));
    await login(email, password);
    setLoading(false);
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    if (authError) clearAuthError();
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-6 animate-fade-in relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] aspect-square bg-[#CA7859]/5 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] aspect-square bg-[#3D3437]/5 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-[520px] space-y-10 text-center relative z-10">

        {/* Branding */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-[#CA7859] rounded-full flex items-center justify-center font-bold text-4xl text-white shadow-2xl animate-float">B</div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter text-[#3D3437] uppercase">Barro & Co.</h1>
            <div className="accent-line mx-auto"></div>
            <p className="eyebrow mt-4">Sistema de Control Central</p>
          </div>
        </div>

        {/* Local Error Message */}
        {authError && (
          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-[16px] border border-red-100 font-bold uppercase text-[11px] tracking-widest shadow-sm animate-fade-in">
            {authError}
          </div>
        )}

        {/* Login Form Card */}
        <Card className="!p-12 shadow-2xl border-none">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-left space-y-8">
              <Input
                label="Acceso de Usuario"
                type="email"
                placeholder="admin@barro.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setEmail, e.target.value)}
                required
              />
              <div className="space-y-4">
                <Input
                  label="Contraseña Segura"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(setPassword, e.target.value)}
                  required
                />
                <div className="flex justify-end px-2">
                  <button type="button" className="text-[11px] font-bold text-[#54545e] uppercase tracking-widest hover:text-[#CA7859] transition-colors">Solicitar Acceso</button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full !py-7 shadow-xl"
              disabled={loading}
            >
              {loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN'}
            </Button>
          </form>
        </Card>

        <p className="eyebrow !text-[11px] mt-10">
          © 2024 BARRO & CO. ESTUDIO • INFRAESTRUCTURA DE DATOS
        </p>
      </div>

      <style>{`
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
        }
        .animate-float { animation: float 6s infinite ease-in-out; }
      `}</style>
    </div>
  );
};
