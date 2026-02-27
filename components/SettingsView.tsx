import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

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
        // Auto-width columns
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
          Nombre: s.name || '',
          Apellido: s.surname || '',
          Email: s.email || '',
          Teléfono: s.phone || '',
          Estado: s.status || '',
          'Clases restantes': s.classesRemaining ?? 0,
          'Método de pago': s.paymentMethod || '',
          Precio: s.price ?? '',
          'Tipo de clase': s.classType || '',
          Notas: s.notes || '',
          Observaciones: s.observations || ''
        })));
      }

      if (mode === 'all' || mode === 'sessions') {
        addSheet('Sesiones', sessions.map(s => ({
          Fecha: s.date || '',
          Inicio: s.startTime || '',
          Fin: s.endTime || '',
          'Tipo de clase': s.classType || '',
          Alumnos: (s.students || []).join(', '),
          Taller: s.workshopName || '',
          Completada: s.completedAt ? 'Sí' : 'No'
        })));
      }

      if (mode === 'all' || mode === 'teachers') {
        addSheet('Profesores', teachers.map(t => ({
          Nombre: t.name || '',
          Apellido: t.surname || '',
          Especialidad: t.specialty || '',
          Email: t.email || '',
          Teléfono: t.phone || '',
          Notas: t.notes || ''
        })));
      }

      if (mode === 'all' || mode === 'pieces') {
        addSheet('Piezas', pieces.map(p => ({
          Propietario: p.owner || '',
          Descripción: p.description || '',
          Estado: p.status || '',
          'Tipo de esmalte': p.glazeType || '',
          'Fecha entrega': p.deliveryDate || '',
          Notas: p.notes || '',
          Comentarios: p.extraCommentary || ''
        })));
      }

      if (mode === 'all' || mode === 'giftcards') {
        addSheet('Bonos Regalo', giftCards.map(g => ({
          Comprador: g.buyer || '',
          Destinatario: g.recipient || '',
          'Nº Clases': g.numClasses ?? '',
          Tipo: g.type || '',
          'Fecha programada': g.scheduledDate || '',
          Comentarios: g.extraCommentary || ''
        })));
      }

      if (mode === 'all' || mode === 'inventory') {
        addSheet('Inventario', inventoryItems.map((item: any) => ({
          Nombre: item.name || '',
          Categoría: item.category || '',
          Código: item.code || '',
          'Cantidad actual': item.current_quantity ?? 0,
          Unidad: item.unit || '',
          'Cantidad mínima': item.min_quantity ?? 0,
          Estado: item.status || '',
          Ubicación: item.location || ''
        })));

        if (mode === 'all') {
          addSheet('Movimientos Inv.', inventoryMovements.map((m: any) => ({
            Tipo: m.type || '',
            Cantidad: m.quantity ?? '',
            'Nueva cantidad': m.new_quantity ?? '',
            Unidad: m.unit || '',
            Razón: m.reason || '',
            Fecha: m.date || '',
            Notas: m.notes || ''
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
      alert('Error al exportar datos.');
    } finally {
      setIsExporting(false);
    }
  };

  const totalRecords = students.length + sessions.length + pieces.length + giftCards.length + teachers.length + inventoryItems.length;

  return (
    <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 shadow-sm h-full flex flex-col overflow-y-auto custom-scrollbar">
      {/* ── CONFIGURACIÓN DEL TALLER ── */}
      <section className="mb-10">
        <h3 className="text-[23px] font-black text-gray-800 uppercase leading-tight mb-2">Configuración del Taller</h3>
        <p className="text-[14px] text-gray-400 font-medium mb-8">Personaliza los ajustes de tu espacio de trabajo</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nombre del taller */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Nombre del taller</label>
            <input
              type="text"
              value={workshopName}
              onChange={e => setWorkshopName(e.target.value)}
              placeholder="Ej: Taller de cerámica artesanal"
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[14px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E] transition-all"
            />
          </div>

          {/* Duración por defecto */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Duración clase (minutos)</label>
            <select
              value={defaultClassDuration}
              onChange={e => setDefaultClassDuration(e.target.value)}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[14px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E] transition-all appearance-none"
            >
              <option value="60">60 min</option>
              <option value="90">90 min</option>
              <option value="120">120 min (2 horas)</option>
              <option value="150">150 min (2.5 horas)</option>
              <option value="180">180 min (3 horas)</option>
            </select>
          </div>

          {/* Capacidad por defecto */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Capacidad máxima por clase</label>
            <input
              type="number"
              min="1"
              max="50"
              value={defaultMaxCapacity}
              onChange={e => setDefaultMaxCapacity(e.target.value)}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[14px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E] transition-all"
            />
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Moneda</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[14px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E] transition-all appearance-none"
            >
              <option value="EUR">€ Euro (EUR)</option>
              <option value="USD">$ Dólar (USD)</option>
              <option value="GBP">£ Libra (GBP)</option>
              <option value="MXN">$ Peso MX (MXN)</option>
              <option value="ARS">$ Peso AR (ARS)</option>
              <option value="COP">$ Peso CO (COP)</option>
            </select>
          </div>

          {/* Zona horaria */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Zona horaria</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[14px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30 focus:border-[#C9A96E] transition-all appearance-none"
            >
              <option value="Europe/Madrid">España (Madrid)</option>
              <option value="Europe/London">Reino Unido (Londres)</option>
              <option value="America/Mexico_City">México (CDMX)</option>
              <option value="America/Argentina/Buenos_Aires">Argentina (Buenos Aires)</option>
              <option value="America/Bogota">Colombia (Bogotá)</option>
              <option value="America/New_York">EE.UU. (Nueva York)</option>
              <option value="America/Los_Angeles">EE.UU. (Los Ángeles)</option>
            </select>
          </div>

          {/* Alerta clases bajas */}
          <div className="flex items-center gap-4 p-4 bg-neutral-50 border border-neutral-200 rounded-2xl">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifyLowClasses}
                onChange={e => setNotifyLowClasses(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[#C9A96E]/30 rounded-full peer peer-checked:bg-[#C9A96E] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <div>
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest block">Alerta clases bajas</span>
              <span className="text-[12px] text-gray-400">
                Avisar cuando un alumno tenga menos de
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={lowClassesThreshold}
                  onChange={e => setLowClassesThreshold(e.target.value)}
                  className="w-10 mx-1 px-1 py-0.5 text-center bg-white border border-neutral-200 rounded-lg text-[12px] font-bold text-gray-700 focus:outline-none"
                />
                clases
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={saveSettings}
            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-gray-800 active:scale-[0.97] transition-all"
          >
            Guardar cambios
          </button>
          {settingsSaved && (
            <span className="text-[13px] font-bold text-emerald-600 animate-pulse">
              ✓ Configuración guardada
            </span>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-neutral-100 my-2" />

      {/* ── RESPALDO EN EXCEL ── */}
      <section className="mt-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
          <div>
            <h3 className="text-[23px] font-black text-gray-800 uppercase leading-tight mb-2">Respaldo de Datos</h3>
            <p className="text-[14px] text-gray-400 font-medium">Exporta toda la información de tu taller en formato Excel (.xlsx)</p>
          </div>
          <div className="text-right">
            <span className="text-[36px] font-black text-[#C9A96E]">{totalRecords}</span>
            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">registros totales</span>
          </div>
        </div>

        {/* Full backup button */}
        <button
          onClick={() => exportToExcel('all')}
          disabled={isExporting}
          className="w-full mt-6 py-5 bg-gradient-to-r from-[#C9A96E] to-[#B8956A] text-white rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
        >
          {isExporting ? (
            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {exportDone === 'completo' ? '✓ Descargado' : 'Descargar Backup Completo'}
        </button>

        {/* Individual exports */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {[
            { key: 'students' as const, label: 'Alumnos', count: students.length, color: 'bg-red-50 text-[#E55B69] border-red-100' },
            { key: 'sessions' as const, label: 'Sesiones', count: sessions.length, color: 'bg-blue-50 text-blue-600 border-blue-100' },
            { key: 'teachers' as const, label: 'Profesores', count: teachers.length, color: 'bg-purple-50 text-purple-600 border-purple-100' },
            { key: 'pieces' as const, label: 'Piezas', count: pieces.length, color: 'bg-amber-50 text-amber-700 border-amber-100' },
            { key: 'giftcards' as const, label: 'Bonos Regalo', count: giftCards.length, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
            { key: 'inventory' as const, label: 'Inventario', count: inventoryItems.length, color: 'bg-gray-50 text-gray-600 border-gray-200' }
          ].map(item => (
            <button
              key={item.key}
              onClick={() => exportToExcel(item.key)}
              disabled={isExporting}
              className={`p-4 ${item.color} rounded-2xl border font-black text-[11px] uppercase tracking-widest hover:shadow-md active:scale-[0.97] transition-all disabled:opacity-50 flex flex-col items-center gap-1`}
            >
              <span className="text-[20px] font-black">{item.count}</span>
              <span>{exportDone === item.key ? '✓ Listo' : item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── INFO ── */}
      <section className="mt-10 mb-4">
        <div className="p-6 bg-neutral-50 border border-neutral-100 rounded-2xl">
          <p className="text-[12px] text-gray-400 font-medium leading-relaxed">
            <strong className="text-gray-500">Nota:</strong> Las configuraciones se guardan localmente en tu navegador.
            Los backups se descargan en formato Excel (.xlsx) compatible con Microsoft Office, Google Sheets y LibreOffice.
            Se recomienda hacer un respaldo completo al menos una vez por semana.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
