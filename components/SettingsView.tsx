import { showError, showWarning } from '../context/toast';
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

/* ─── Collapsible Section ─── */
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, defaultOpen = false, badge, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border border-neutral-100 rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'bg-white shadow-sm' : 'bg-neutral-50/50 hover:bg-white hover:shadow-sm'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${open ? 'bg-[#C9A96E]/10 text-[#C9A96E]' : 'bg-neutral-100 text-gray-400 group-hover:bg-[#C9A96E]/10 group-hover:text-[#C9A96E]'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-black text-gray-700 uppercase tracking-wide">{title}</span>
          <span className="block text-[11px] text-gray-400 font-medium truncate">{subtitle}</span>
        </div>
        {badge && <div className="mr-2">{badge}</div>}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5 pb-5 pt-1 border-t border-neutral-100">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ─── Compact Input ─── */
const CompactField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E] transition-all";
const selectClass = `${inputClass} appearance-none`;


const SettingsView: React.FC = () => {
  const { students, sessions, pieces, giftCards, teachers, inventoryItems, inventoryMovements } = useData();
  const { profile } = useAuth();

  // Config states — persisted in localStorage
  const storageKey = `settings_${profile?.id || 'default'}`;
  const savedSettings = (() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  })();

  const [workshopName, setWorkshopName] = useState(savedSettings.workshopName || '');
  const [defaultClassDuration, setDefaultClassDuration] = useState(savedSettings.defaultClassDuration || '120');
  const [defaultMaxCapacity, setDefaultMaxCapacity] = useState(savedSettings.defaultMaxCapacity || '10');
  const [currency, setCurrency] = useState(savedSettings.currency || 'EUR');
  const [timezone, setTimezone] = useState(savedSettings.timezone || 'Europe/Madrid');
  const [notifyLowClasses, setNotifyLowClasses] = useState(savedSettings.notifyLowClasses ?? true);
  const [lowClassesThreshold, setLowClassesThreshold] = useState(savedSettings.lowClassesThreshold || '2');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const saveSettings = () => {
    const config = {
      workshopName,
      defaultClassDuration,
      defaultMaxCapacity,
      currency,
      timezone,
      notifyLowClasses,
      lowClassesThreshold
    };
    localStorage.setItem(storageKey, JSON.stringify(config));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // ── Excel Export (real, functional) ──
  const exportToExcel = (mode: 'all' | 'students' | 'sessions' | 'teachers' | 'pieces' | 'giftcards' | 'inventory') => {
    setIsExporting(true);

    try {
      const wb = XLSX.utils.book_new();
      const today = new Date().toISOString().slice(0, 10);

      const addSheet = (name: string, data: Record<string, unknown>[]) => {
        if (data.length === 0) {
          data = [{ info: 'Sin datos' }];
        }
        const ws = XLSX.utils.json_to_sheet(data);
        const maxWidths: number[] = [];
        data.forEach(row => {
          Object.keys(row).forEach((key, i) => {
            const val = String(row[key] ?? '');
            maxWidths[i] = Math.max(maxWidths[i] || key.length, val.length);
          });
        });
        ws['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 50) }));
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      };

      if (mode === 'all' || mode === 'students') {
        addSheet('Alumnos', students.map(s => ({
          Nombre: s.name || '', Apellido: s.surname || '', Email: s.email || '',
          Teléfono: s.phone || '', Estado: s.status || '', 'Clases restantes': s.classesRemaining ?? 0,
          'Método de pago': s.paymentMethod || '', Precio: s.price ?? '',
          'Tipo de clase': s.classType || '', Notas: s.notes || '', Observaciones: s.observations || ''
        })));
      }
      if (mode === 'all' || mode === 'sessions') {
        addSheet('Sesiones', sessions.map(s => ({
          Fecha: s.date || '', Inicio: s.startTime || '', Fin: s.endTime || '',
          'Tipo de clase': s.classType || '', Alumnos: (s.students || []).join(', '),
          Taller: s.workshopName || '', Completada: s.completedAt ? 'Sí' : 'No'
        })));
      }
      if (mode === 'all' || mode === 'teachers') {
        addSheet('Profesores', teachers.map(t => ({
          Nombre: t.name || '', Apellido: t.surname || '', Especialidad: t.specialty || '',
          Email: t.email || '', Teléfono: t.phone || '', Notas: t.notes || ''
        })));
      }
      if (mode === 'all' || mode === 'pieces') {
        addSheet('Piezas', pieces.map(p => ({
          Propietario: p.owner || '', Descripción: p.description || '', Estado: p.status || '',
          'Tipo de esmalte': p.glazeType || '', 'Fecha entrega': p.deliveryDate || '',
          Notas: p.notes || '', Comentarios: p.extraCommentary || ''
        })));
      }
      if (mode === 'all' || mode === 'giftcards') {
        addSheet('Bonos Regalo', giftCards.map(g => ({
          Comprador: g.buyer || '', Destinatario: g.recipient || '',
          'Nº Clases': g.numClasses ?? '', Tipo: g.type || '',
          'Fecha de emisión': g.issuedDate || '', Comentarios: g.extraCommentary || ''
        })));
      }
      if (mode === 'all' || mode === 'inventory') {
        addSheet('Inventario', inventoryItems.map((item: any) => ({
          Nombre: item.name || '', Categoría: item.category || '', Código: item.code || '',
          'Cantidad actual': item.current_quantity ?? 0, Unidad: item.unit || '',
          'Cantidad mínima': item.min_quantity ?? 0, Estado: item.status || '',
          Ubicación: item.location || ''
        })));
        if (mode === 'all') {
          addSheet('Movimientos Inv.', inventoryMovements.map((m: any) => ({
            Tipo: m.type || '', Cantidad: m.quantity ?? '', 'Nueva cantidad': m.new_quantity ?? '',
            Unidad: m.unit || '', Razón: m.reason || '', Fecha: m.date || '', Notas: m.notes || ''
          })));
        }
      }

      const fileName = mode === 'all'
        ? `backup_completo_${today}.xlsx`
        : `backup_${mode}_${today}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setExportDone(mode === 'all' ? 'completo' : mode);
      setTimeout(() => setExportDone(''), 3000);
    } catch (err) {
      console.error('Export error:', err);
      showError('Error al exportar datos.');
    } finally {
      setIsExporting(false);
    }
  };

  const totalRecords = students.length + sessions.length + pieces.length + giftCards.length + teachers.length + inventoryItems.length;

  /* ── Icons ── */
  const IconWorkshop = (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const IconSecurity = (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
  const IconBackup = (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-sm h-full flex flex-col overflow-y-auto custom-scrollbar">
      {/* ── Header ── */}
      <div className="mb-6">
        <h2 className="text-[18px] font-black text-gray-800 uppercase tracking-wide leading-tight">Ajustes</h2>
        <p className="text-[12px] text-gray-400 font-medium mt-0.5">Personaliza tu taller y gestiona tus datos</p>
      </div>

      {/* ── Sections ── */}
      <div className="flex flex-col gap-3 flex-1">

        {/* ─── 1. CONFIGURACIÓN DEL TALLER ─── */}
        <Section
          icon={IconWorkshop}
          title="Taller"
          subtitle="Nombre, duración, capacidad y moneda"
          defaultOpen={true}
        >
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            <CompactField label="Nombre del taller">
              <input
                type="text" value={workshopName}
                onChange={e => setWorkshopName(e.target.value)}
                placeholder="Ej: Cerámica artesanal"
                className={`${inputClass} col-span-1`}
              />
            </CompactField>

            <CompactField label="Duración clase">
              <select value={defaultClassDuration} onChange={e => setDefaultClassDuration(e.target.value)} className={selectClass}>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
                <option value="150">150 min</option>
                <option value="180">180 min</option>
              </select>
            </CompactField>

            <CompactField label="Capacidad máx.">
              <input type="number" min="1" max="50" value={defaultMaxCapacity}
                onChange={e => setDefaultMaxCapacity(e.target.value)} className={inputClass} />
            </CompactField>

            <CompactField label="Moneda">
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectClass}>
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
                <option value="GBP">£ GBP</option>
                <option value="MXN">$ MXN</option>
                <option value="ARS">$ ARS</option>
                <option value="COP">$ COP</option>
              </select>
            </CompactField>

            <CompactField label="Zona horaria">
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className={selectClass}>
                <option value="Europe/Madrid">España</option>
                <option value="Europe/London">Reino Unido</option>
                <option value="America/Mexico_City">México</option>
                <option value="America/Argentina/Buenos_Aires">Argentina</option>
                <option value="America/Bogota">Colombia</option>
                <option value="America/New_York">EE.UU. Este</option>
                <option value="America/Los_Angeles">EE.UU. Oeste</option>
              </select>
            </CompactField>

            {/* Alerta toggle — inline compact */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={notifyLowClasses} onChange={e => setNotifyLowClasses(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[#C9A96E]/30 rounded-full peer peer-checked:bg-[#C9A96E] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-tight">Alerta</span>
                <span className="text-[11px] text-gray-500 leading-tight">
                  Avisar si &lt;
                  <input type="number" min="1" max="10" value={lowClassesThreshold}
                    onChange={e => setLowClassesThreshold(e.target.value)}
                    className="w-7 mx-0.5 px-0.5 py-0 text-center bg-white border border-neutral-200 rounded text-[11px] font-bold text-gray-700 focus:outline-none inline"
                  /> clases
                </span>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={saveSettings}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-800 active:scale-[0.97] transition-all"
            >
              Guardar
            </button>
            {settingsSaved && (
              <span className="text-[11px] font-bold text-emerald-600 animate-pulse">✓ Guardado</span>
            )}
          </div>
        </Section>


        {/* ─── 2. SEGURIDAD ─── */}
        <Section
          icon={IconSecurity}
          title="Seguridad"
          subtitle="Contraseña de acceso"
        >
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-400 font-medium">Actualiza tu contraseña cuando lo necesites.</p>
            <button
              onClick={() => { setShowPasswordModal(true); setPasswordFeedback(null); }}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-800 active:scale-[0.97] transition-all shrink-0 ml-4"
            >
              Cambiar contraseña
            </button>
          </div>
        </Section>


        {/* ─── 3. RESPALDO ─── */}
        <Section
          icon={IconBackup}
          title="Respaldo de datos"
          subtitle="Exportar en Excel (.xlsx)"
          badge={
            <span className="text-[16px] font-black text-[#C9A96E]">{totalRecords}</span>
          }
        >
          <div className="mt-3">
            {/* Full backup */}
            <button
              onClick={() => exportToExcel('all')}
              disabled={isExporting}
              className="w-full py-3 bg-gradient-to-r from-[#C9A96E] to-[#B8956A] text-white rounded-xl font-bold text-[12px] uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {exportDone === 'completo' ? '✓ Descargado' : 'Backup completo'}
            </button>

            {/* Individual */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
              {[
                { key: 'students' as const, label: 'Alumnos', count: students.length, color: 'text-[#E55B69] bg-red-50 border-red-100' },
                { key: 'sessions' as const, label: 'Sesiones', count: sessions.length, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { key: 'teachers' as const, label: 'Profes', count: teachers.length, color: 'text-purple-600 bg-purple-50 border-purple-100' },
                { key: 'pieces' as const, label: 'Piezas', count: pieces.length, color: 'text-amber-700 bg-amber-50 border-amber-100' },
                { key: 'giftcards' as const, label: 'Bonos', count: giftCards.length, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { key: 'inventory' as const, label: 'Inventario', count: inventoryItems.length, color: 'text-gray-600 bg-gray-50 border-gray-200' }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => exportToExcel(item.key)}
                  disabled={isExporting}
                  className={`p-2.5 ${item.color} rounded-xl border font-bold text-[10px] uppercase tracking-wider hover:shadow-md active:scale-[0.97] transition-all disabled:opacity-50 flex flex-col items-center gap-0.5`}
                >
                  <span className="text-[16px] font-black leading-none">{item.count}</span>
                  <span className="leading-tight">{exportDone === item.key ? '✓' : item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Info note ── */}
        <div className="mt-1 px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl">
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
            <strong className="text-gray-500">Nota:</strong> Las configuraciones se guardan localmente.
            Los backups se descargan en formato .xlsx. Se recomienda hacer un respaldo semanal.
          </p>
        </div>
      </div>

      {/* ── PASSWORD CHANGE MODAL ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl relative animate-fade-in border border-neutral-200 overflow-hidden">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors z-20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-7">
              <h3 className="text-[16px] font-black text-gray-800 uppercase tracking-tight leading-none mb-1">Cambiar Contraseña</h3>
              <p className="text-gray-400 text-[12px] mb-5 font-medium">Actualiza tu contraseña de acceso.</p>

              {passwordFeedback && (
                <div className={`mb-4 p-3 rounded-xl text-[11px] font-bold ${passwordFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {passwordFeedback.msg}
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  setPasswordFeedback({ type: 'error', msg: 'Las contraseñas no coinciden.' });
                  return;
                }
                if (passwordForm.newPassword.length < 6) {
                  setPasswordFeedback({ type: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' });
                  return;
                }
                try {
                  setPasswordLoading(true);
                  const { createClient } = await import('@supabase/supabase-js');
                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL || '';
                  const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY || '');
                  const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
                  if (error) {
                    setPasswordFeedback({ type: 'error', msg: error.message || 'Error al cambiar contraseña.' });
                  } else {
                    setPasswordFeedback({ type: 'success', msg: 'Contraseña actualizada exitosamente.' });
                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                    setTimeout(() => setShowPasswordModal(false), 1500);
                  }
                } catch (err: any) {
                  setPasswordFeedback({ type: 'error', msg: err.message || 'Error de conexión.' });
                } finally {
                  setPasswordLoading(false);
                }
              }} className="space-y-4">
                <CompactField label="Nueva contraseña">
                  <input required type="password" value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Mínimo 6 caracteres" className={inputClass} />
                </CompactField>
                <CompactField label="Confirmar contraseña">
                  <input required type="password" value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Repite la nueva contraseña" className={inputClass} />
                </CompactField>
                <button type="submit" disabled={passwordLoading}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-800 active:scale-[0.97] transition-all mt-1 disabled:opacity-50"
                >
                  {passwordLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
