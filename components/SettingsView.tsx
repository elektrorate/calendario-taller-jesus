
import React, { useState } from 'react';

const SettingsView: React.FC = () => {
  const [githubConnected, setGithubConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleGithubConnect = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setGithubConnected(true);
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 shadow-sm h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
        <section className="space-y-8">
          <div className="p-10 border-2 border-dashed border-red-100 rounded-[3rem] bg-red-50/20">
            <h3 className="text-[23px] font-black text-gray-800 uppercase leading-tight mb-4">Sincronización GitHub</h3>
            <p className="text-[18px] text-gray-500 font-medium mb-10 leading-relaxed">Vincula tu repositorio para copias de seguridad automáticas.</p>
            <button onClick={handleGithubConnect} disabled={isSyncing} className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black shadow-xl uppercase tracking-widest text-[15px] flex items-center justify-center gap-4 transition-all">
              {isSyncing ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Vincular con GitHub'}
            </button>
          </div>
        </section>
        <section className="space-y-8">
          <div className="p-10 bg-white border border-red-50 rounded-[3rem] shadow-sm">
            <h3 className="text-[23px] font-black text-gray-800 uppercase leading-tight mb-4">Respaldo Manual</h3>
            <div className="space-y-6">
              <button className="w-full p-6 bg-red-50 text-[#E55B69] rounded-2xl font-black text-[13px] uppercase tracking-widest border border-red-100 transition-colors">Descargar JSON Alumnos</button>
              <button className="w-full p-6 bg-blue-50 text-blue-500 rounded-2xl font-black text-[13px] uppercase tracking-widest border border-blue-100 transition-colors">Descargar JSON Piezas</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
