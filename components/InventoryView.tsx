
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryCategory, InventoryItemStatus, MovementType, InventoryMovement, StructuredFormula, FormulaComponent, ColorFamily, GlazeFinish } from '../types';

interface InventoryViewProps {
  items: InventoryItem[];
  movements: InventoryMovement[];
  onAddItem: (item: any) => void;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onArchiveItem: (id: string) => void;
  onAddMovement: (movement: Omit<InventoryMovement, 'id'>) => void;
}

type SubView = 'dashboard' | 'list' | 'detail' | 'form';

const InventoryView: React.FC<InventoryViewProps> = ({ items, movements, onAddItem, onUpdateItem, onArchiveItem, onAddMovement }) => {
  const [currentSubView, setCurrentSubView] = useState<SubView>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<InventoryCategory | 'all'>('glaze');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [dashboardFilter, setDashboardFilter] = useState<'ok' | 'low' | 'critical' | 'all'>('all');

  const categories: { id: InventoryCategory | 'all', label: string }[] = [
    { id: 'glaze', label: 'Esmaltes' }, { id: 'clay', label: 'Pastas' }, { id: 'engobe', label: 'Engobes' }, { id: 'oxide', label: 'Óxidos' }, { id: 'raw_material', label: 'Mat. Primas' }
  ];

  const getCategoryLabel = (id: InventoryCategory) => categories.find(c => c.id === id)?.label || id;
  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId), [items, selectedItemId]);

  const getItemHealth = (item: InventoryItem): 'ok' | 'low' | 'critical' => {
    if (!item.min_quantity) return 'ok';
    if (item.current_quantity <= 0) return 'critical';
    if (item.current_quantity <= (item.min_quantity * 0.5)) return 'critical';
    if (item.current_quantity <= item.min_quantity) return 'low';
    return 'ok';
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchHealth = dashboardFilter === 'all' || getItemHealth(item) === dashboardFilter;
      return matchCategory && matchSearch && matchHealth && item.status === 'active';
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, filterCategory, searchQuery, dashboardFilter]);

  const stats = useMemo(() => {
    const activeItems = items.filter(i => i.status === 'active');
    const low = activeItems.filter(i => getItemHealth(i) === 'low');
    const critical = activeItems.filter(i => getItemHealth(i) === 'critical');
    const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    const recentMovs = movements.filter(m => m.date && new Date(m.date) >= cutoffDate);
    const entries = recentMovs.filter(m => m.type === 'in');
    const outs = recentMovs.filter(m => m.type === 'out');
    return {
      activeCount: activeItems.length, lowCount: low.length, criticalCount: critical.length, movTotal: recentMovs.length, movIn: entries.length, movOut: outs.length,
      globalPercent: { ok: activeItems.length ? ((activeItems.length - low.length - critical.length) / activeItems.length) * 100 : 0, low: activeItems.length ? (low.length / activeItems.length) * 100 : 0, critical: activeItems.length ? (critical.length / activeItems.length) * 100 : 0 }
    };
  }, [items, movements, timeRange]);

  const categoryHealth = useMemo(() => {
    return categories.map(cat => {
      if (cat.id === 'all') return null;
      const catItems = items.filter(i => i.category === cat.id && i.status === 'active');
      const total = catItems.length;
      if (total === 0) {
        return { id: cat.id, label: cat.label, ok: 100, low: 0, crit: 0, empty: true };
      }
      const ok = catItems.filter(i => getItemHealth(i) === 'ok').length;
      const low = catItems.filter(i => getItemHealth(i) === 'low').length;
      const crit = catItems.filter(i => getItemHealth(i) === 'critical').length;
      return { id: cat.id, label: cat.label, ok: (ok / total) * 100, low: (low / total) * 100, crit: (crit / total) * 100, empty: false };
    }).filter(Boolean);
  }, [items]);

  const handleDrillDown = (filter: 'ok' | 'low' | 'critical' | 'all', cat: InventoryCategory | 'all' = 'all') => {
    setDashboardFilter(filter); setFilterCategory(cat); setCurrentSubView('list');
  };

  const handleOpenDetail = (id: string) => { setSelectedItemId(id); setCurrentSubView('detail'); };

  const renderDashboard = () => (
    <div className="space-y-6 md:space-y-10 animate-fade-in pb-24 px-4 md:px-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-neutral-border soft-shadow">
          <p className="text-[9px] md:text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-1">ACTIVOS</p>
          <p className="text-[28px] md:text-[38px] font-extrabold text-neutral-textMain leading-none">{stats.activeCount}</p>
        </div>
        <div onClick={() => handleDrillDown('low')} className="bg-white p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-neutral-border soft-shadow cursor-pointer hover:border-orange-400">
          <p className="text-[9px] md:text-[11px] font-extrabold text-orange-500 uppercase tracking-widest mb-1">STOCK BAJO</p>
          <p className="text-[28px] md:text-[38px] font-extrabold text-orange-500 leading-none">{stats.lowCount}</p>
        </div>
        <div onClick={() => handleDrillDown('critical')} className="bg-white p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-neutral-border soft-shadow cursor-pointer hover:border-red-500">
          <p className="text-[9px] md:text-[11px] font-extrabold text-red-500 uppercase tracking-widest mb-1">CRÍTICO</p>
          <p className="text-[28px] md:text-[38px] font-extrabold text-red-500 leading-none">{stats.criticalCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-neutral-border soft-shadow flex flex-col">
           <h3 className="text-[18px] md:text-[22px] font-extrabold text-neutral-textMain uppercase tracking-tight mb-2 md:mb-4">Visión General del Stock</h3>
           <div className="space-y-5">
             {categoryHealth.map(cat => (
               <div key={cat!.id} onClick={() => handleDrillDown('all', cat!.id as any)} className="space-y-2 cursor-pointer group">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] md:text-[12px] font-extrabold text-neutral-textMain uppercase group-hover:text-brand">{cat!.label}</span>
                    {cat!.empty && <span className="text-[9px] text-neutral-textHelper font-light uppercase">Sin ítems</span>}
                  </div>
                  <div className="flex h-1.5 md:h-2 rounded-full overflow-hidden bg-neutral-alt">
                     <div style={{ width: `${cat!.ok}%` }} className={`${cat!.empty ? 'bg-neutral-border opacity-30' : 'bg-green-500'} h-full transition-all duration-500`}></div>
                     <div style={{ width: `${cat!.low}%` }} className="bg-orange-400 h-full transition-all duration-500"></div>
                     <div style={{ width: `${cat!.crit}%` }} className="bg-red-500 h-full transition-all duration-500"></div>
                  </div>
               </div>
             ))}
           </div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-neutral-border soft-shadow flex flex-col">
           <h3 className="text-[18px] md:text-[22px] font-extrabold text-neutral-textMain uppercase tracking-tight mb-6">Alertas Prioritarias</h3>
           <div className="flex-1 overflow-y-auto max-h-[300px] md:max-h-none no-scrollbar space-y-4">
              {items.filter(i => getItemHealth(i) !== 'ok').slice(0, 10).map(item => (
                 <div key={item.id} onClick={() => handleOpenDetail(item.id)} className="flex justify-between items-center p-4 rounded-2xl hover:bg-neutral-alt transition-colors cursor-pointer border border-transparent active:border-brand-light">
                    <div>
                       <p className="text-[14px] font-extrabold text-neutral-textMain uppercase leading-tight truncate max-w-[150px] md:max-w-none">{item.name}</p>
                       <p className="text-[10px] font-light text-neutral-textHelper uppercase mt-0.5">{item.code} • {item.location || 'ESTUDIO'}</p>
                    </div>
                    <div className="text-right shrink-0">
                       <p className={`text-[15px] font-extrabold ${getItemHealth(item) === 'critical' ? 'text-red-500' : 'text-orange-500'}`}>{item.current_quantity} {item.unit}</p>
                       <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${getItemHealth(item) === 'critical' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>{getItemHealth(item) === 'critical' ? 'CRIT' : 'LOW'}</span>
                    </div>
                 </div>
              ))}
              {items.filter(i => getItemHealth(i) !== 'ok').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                   <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-textHelper">Stock Saludable</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-neutral-base overflow-hidden">
      <header className="px-5 py-4 md:px-8 md:py-6 shrink-0 bg-white/50 border-b border-neutral-border">
        <div className="flex flex-col gap-4">
          <div className="flex bg-white p-1 rounded-full border border-neutral-border soft-shadow w-full md:auto self-center md:self-start overflow-x-auto no-scrollbar">
             <button onClick={() => setCurrentSubView('dashboard')} className={`flex-1 md:flex-none px-6 py-2 rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest transition-all ${currentSubView === 'dashboard' ? 'bg-brand text-white' : 'text-neutral-textHelper'}`}>Dashboard</button>
             <button onClick={() => { setCurrentSubView('list'); setFilterCategory('glaze'); }} className={`flex-1 md:flex-none px-6 py-2 rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest transition-all ${currentSubView === 'list' ? 'bg-brand text-white' : 'text-neutral-textHelper'}`}>Inventario</button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full">
             <div className="relative w-full">
                <input type="text" placeholder="BUSCAR MATERIAL..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-6 py-3.5 bg-white border border-neutral-border rounded-full text-[13px] outline-none shadow-sm uppercase" />
                <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-textHelper" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <select value={timeRange} onChange={(e) => setTimeRange(Number(e.target.value) as any)} className="w-full md:w-auto px-6 py-3.5 bg-white border border-neutral-border rounded-full text-[11px] font-extrabold uppercase tracking-widest outline-none shadow-sm appearance-none cursor-pointer">
                <option value={7}>7 Días</option><option value={30}>30 Días</option><option value={90}>90 Días</option>
             </select>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
        {currentSubView === 'dashboard' && renderDashboard()}
        {currentSubView === 'list' && (
           <div className="space-y-8 md:space-y-10 pb-32 px-5 md:px-8">
              <div className="flex justify-center md:justify-start">
                <div className="inline-flex bg-white p-1 rounded-full border border-neutral-border soft-shadow overflow-x-auto no-scrollbar shrink-0 max-w-full">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-6 md:px-8 py-2.5 rounded-full text-[11px] md:text-[12px] uppercase tracking-widest transition-all whitespace-nowrap ${filterCategory === cat.id ? 'bg-brand text-white font-extrabold' : 'text-neutral-textHelper hover:text-brand'}`}>{cat.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredItems.map(item => {
                  const health = getItemHealth(item);
                  return (
                    <div key={item.id} onClick={() => handleOpenDetail(item.id)} className="bg-white p-6 md:p-8 rounded-[1.8rem] md:rounded-[3rem] border border-neutral-border soft-shadow active:border-brand transition-all cursor-pointer group flex flex-col relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-1.5 h-full ${health === 'critical' ? 'bg-red-500' : health === 'low' ? 'bg-orange-400' : 'bg-green-500'}`}></div>
                      <div className="flex justify-between items-start mb-4 md:mb-6"><span className="text-[9px] font-extrabold text-brand uppercase tracking-widest">{getCategoryLabel(item.category)}</span><span className="text-[10px] font-light text-neutral-textHelper">#{item.code}</span></div>
                      <h4 className="text-[18px] md:text-[22px] font-extrabold text-neutral-textMain uppercase tracking-tight leading-tight mb-6 flex-grow">{item.name}</h4>
                      <div className="flex items-baseline gap-2"><span className={`text-[32px] md:text-[36px] font-extrabold leading-none ${health === 'critical' ? 'text-red-500' : health === 'low' ? 'text-orange-500' : 'text-neutral-textMain'}`}>{item.current_quantity}</span><span className="text-[13px] md:text-[14px] font-light text-neutral-textHelper uppercase">{item.unit}</span></div>
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                   <div className="col-span-full py-20 text-center opacity-30 border-2 border-dashed border-neutral-border rounded-[2rem]">
                      <p className="text-[12px] font-bold uppercase tracking-[0.2em]">No hay materiales registrados en esta categoría</p>
                   </div>
                )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default InventoryView;
