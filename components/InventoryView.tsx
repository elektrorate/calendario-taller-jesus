
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
  const [itemForm, setItemForm] = useState({
    category: 'glaze' as InventoryCategory,
    name: '',
    code: '',
    unit: 'kg',
    current_quantity: 0,
    min_quantity: 0,
    location: '',
    supplier: '',
    supplier_code: '',
    notes: '',
    color: '',
    firing_range: '',
    color_family: '' as ColorFamily | '',
    finish: '' as GlazeFinish | '',
    formulaRows: [{ name: '', value: 0 }],
    formulaUnit: 'percent' as 'percent' | 'weight'
  });
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementForm, setMovementForm] = useState({
    type: 'in' as MovementType,
    quantity: 0,
    new_quantity: 0,
    unit: 'kg',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const categories: { id: InventoryCategory | 'all', label: string }[] = [
    { id: 'glaze', label: 'Esmaltes' }, { id: 'clay', label: 'Pastas' }, { id: 'engobe', label: 'Engobes' }, { id: 'oxide', label: 'Óxidos' }, { id: 'raw_material', label: 'Mat. Primas' }
  ];

  const getCategoryLabel = (id: InventoryCategory) => categories.find(c => c.id === id)?.label || id;
  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId), [items, selectedItemId]);
  useEffect(() => {
    if (!selectedItem) return;
    setMovementForm(prev => ({
      ...prev,
      unit: selectedItem.unit || prev.unit
    }));
  }, [selectedItem]);

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

  const handleOpenDetail = (id: string) => {
    setSelectedItemId(id);
    setShowMovementForm(false);
    setCurrentSubView('detail');
  };
  const handleOpenForm = () => {
    setEditingItem(null);
    setItemForm({
      category: filterCategory === 'all' ? 'glaze' : filterCategory,
      name: '',
      code: '',
      unit: 'kg',
      current_quantity: 0,
      min_quantity: 0,
      location: '',
      supplier: '',
      supplier_code: '',
      notes: '',
      color: '',
      firing_range: '',
      color_family: '',
      finish: '',
      formulaRows: [{ name: '', value: 0 }],
      formulaUnit: 'percent'
    });
    setCurrentSubView('form');
  };

  const handleEditFromDetail = () => {
    if (!selectedItem) return;
    setEditingItem(selectedItem);
    setItemForm({
      category: selectedItem.category,
      name: selectedItem.name || '',
      code: selectedItem.code || '',
      unit: selectedItem.unit || 'kg',
      current_quantity: selectedItem.current_quantity || 0,
      min_quantity: selectedItem.min_quantity || 0,
      location: selectedItem.location || '',
      supplier: selectedItem.supplier || '',
      supplier_code: selectedItem.supplier_code || '',
      notes: selectedItem.notes || '',
      color: selectedItem.color || '',
      firing_range: selectedItem.firing_range || '',
      color_family: selectedItem.color_family || '',
      finish: selectedItem.finish || '',
      formulaRows: selectedItem.formula?.recipe?.length
        ? selectedItem.formula.recipe.map(comp => ({ name: comp.name, value: comp.percentage }))
        : [{ name: '', value: 0 }],
      formulaUnit: selectedItem.formula_unit || 'percent'
    });
    setCurrentSubView('form');
  };

  const submitItem = () => {
    if (!itemForm.name.trim()) {
      alert('ERROR: El nombre es obligatorio.');
      return;
    }
    const normalizedCode = itemForm.code.trim().toUpperCase();
    const duplicated = items.some(i => {
      if (editingItem && i.id === editingItem.id) return false;
      return i.code.trim().toUpperCase() === normalizedCode;
    });
    if (!normalizedCode) {
      alert('ERROR: El codigo es obligatorio.');
      return;
    }
    if (duplicated) {
      alert('ERROR: Ya existe un item con ese codigo.');
      return;
    }

    let parsedFormula: StructuredFormula | undefined;
    let formulaUnit: 'percent' | 'weight' | undefined;
    if (itemForm.category === 'glaze' || itemForm.category === 'engobe') {
      const rows = itemForm.formulaRows
        .map(row => ({ name: row.name.trim(), value: Number(row.value) }))
        .filter(row => row.name);
      if (rows.length > 0) {
        const invalidRow = rows.find(row => Number.isNaN(row.value) || row.value < 0);
        if (invalidRow) {
          alert('ERROR: Los valores de la receta deben ser numericos y no negativos.');
          return;
        }
        parsedFormula = {
          recipe: rows.map(row => ({ name: row.name, percentage: row.value })),
          additives: [],
          colorants: []
        };
        formulaUnit = itemForm.formulaUnit;
      }
    }
    const { formulaRows, formulaUnit: _formulaUnit, ...restForm } = itemForm;
    const payload = {
      ...restForm,
      code: normalizedCode,
      current_quantity: Number(itemForm.current_quantity) || 0,
      min_quantity: Number(itemForm.min_quantity) || 0,
      formula: parsedFormula,
      formula_unit: formulaUnit,
      color_family: itemForm.color_family || undefined,
      finish: itemForm.finish || undefined
    };
    if (editingItem) onUpdateItem(editingItem.id, payload);
    else onAddItem(payload);
    setCurrentSubView('list');
  };

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    submitItem();
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!movementForm.reason.trim()) {
      alert('ERROR: El motivo es obligatorio.');
      return;
    }
    if (movementForm.type === 'adjust' && Number.isNaN(Number(movementForm.new_quantity))) {
      alert('ERROR: La cantidad ajustada es invalida.');
      return;
    }
    if (movementForm.type !== 'adjust' && Number(movementForm.quantity) <= 0) {
      alert('ERROR: La cantidad debe ser mayor que 0.');
      return;
    }
    onAddMovement({
      item_id: selectedItem.id,
      type: movementForm.type,
      quantity: movementForm.type === 'adjust' ? undefined : Number(movementForm.quantity),
      new_quantity: movementForm.type === 'adjust' ? Number(movementForm.new_quantity) : undefined,
      unit: movementForm.unit || selectedItem.unit,
      reason: movementForm.reason.trim(),
      date: movementForm.date || new Date().toISOString(),
      notes: movementForm.notes || undefined
    });
    setShowMovementForm(false);
    setMovementForm({
      type: 'in',
      quantity: 0,
      new_quantity: 0,
      unit: selectedItem.unit || 'kg',
      reason: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const updateFormulaRow = (index: number, updates: { name?: string; value?: number }) => {
    setItemForm(prev => {
      const rows = [...prev.formulaRows];
      rows[index] = { ...rows[index], ...updates };
      return { ...prev, formulaRows: rows };
    });
  };

  const addFormulaRow = () => {
    setItemForm(prev => ({
      ...prev,
      formulaRows: [...prev.formulaRows, { name: '', value: 0 }]
    }));
  };

  const removeFormulaRow = (index: number) => {
    setItemForm(prev => {
      const rows = prev.formulaRows.filter((_, i) => i !== index);
      return { ...prev, formulaRows: rows.length ? rows : [{ name: '', value: 0 }] };
    });
  };

  const moveFormulaRow = (from: number, to: number) => {
    setItemForm(prev => {
      if (to < 0 || to >= prev.formulaRows.length) return prev;
      const rows = [...prev.formulaRows];
      const [row] = rows.splice(from, 1);
      rows.splice(to, 0, row);
      return { ...prev, formulaRows: rows };
    });
  };

  const renderDetail = () => {
    if (!selectedItem) {
      return (
        <div className="px-5 md:px-8 pb-32">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-neutral-border soft-shadow p-8 md:p-12 text-center">
            <p className="text-[13px] font-bold uppercase tracking-widest text-neutral-textHelper">No hay item seleccionado</p>
            <button
              onClick={() => setCurrentSubView('list')}
              className="mt-6 px-8 py-4 bg-brand text-white rounded-full text-[11px] font-extrabold uppercase tracking-widest"
            >
              Volver al inventario
            </button>
          </div>
        </div>
      );
    }

    const health = getItemHealth(selectedItem);
    const showFormula = !!selectedItem.formula && (selectedItem.category === 'glaze' || selectedItem.category === 'engobe');
    const formulaUnitLabel = selectedItem.formula_unit === 'weight' ? 'g' : '%';
    const recentMovements = movements
      .filter(m => m.item_id === selectedItem.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10);

    return (
      <div className="px-5 md:px-8 pb-32 space-y-6 md:space-y-8 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentSubView('list')}
            className="px-6 py-3 bg-white border border-neutral-border rounded-full text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper hover:text-brand"
          >
            Volver
          </button>
          <div className={`px-4 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${health === 'critical' ? 'bg-red-50 text-red-500' : health === 'low' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600'}`}>
            {health === 'critical' ? 'Critico' : health === 'low' ? 'Stock bajo' : 'Stock ok'}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-neutral-border soft-shadow p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <p className="text-[10px] font-extrabold text-brand uppercase tracking-widest">{getCategoryLabel(selectedItem.category)}</p>
              <h3 className="text-[24px] md:text-[32px] font-extrabold text-neutral-textMain uppercase tracking-tight mt-2">{selectedItem.name}</h3>
              <p className="text-[12px] text-neutral-textHelper uppercase tracking-widest mt-2">Codigo: #{selectedItem.code}</p>
            </div>
            <div className="text-right">
              <p className="text-[40px] md:text-[48px] font-extrabold text-neutral-textMain leading-none">{selectedItem.current_quantity}</p>
              <p className="text-[12px] text-neutral-textHelper uppercase tracking-widest">{selectedItem.unit}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-neutral-sec/60 rounded-2xl p-4 border border-neutral-border">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Minimo</p>
              <p className="text-[16px] font-extrabold text-neutral-textMain mt-1">{selectedItem.min_quantity ?? 'Sin definir'}</p>
            </div>
            <div className="bg-neutral-sec/60 rounded-2xl p-4 border border-neutral-border">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Ubicacion</p>
              <p className="text-[16px] font-extrabold text-neutral-textMain mt-1">{selectedItem.location || 'Estudio'}</p>
            </div>
            <div className="bg-neutral-sec/60 rounded-2xl p-4 border border-neutral-border">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Proveedor</p>
              <p className="text-[16px] font-extrabold text-neutral-textMain mt-1">{selectedItem.supplier || 'Sin definir'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-neutral-sec/60 rounded-2xl p-4 border border-neutral-border">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Codigo proveedor</p>
              <p className="text-[16px] font-extrabold text-neutral-textMain mt-1">{selectedItem.supplier_code || 'Sin definir'}</p>
            </div>
            <div className="bg-neutral-sec/60 rounded-2xl p-4 border border-neutral-border">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Color</p>
              <p className="text-[16px] font-extrabold text-neutral-textMain mt-1">{selectedItem.color || 'Sin definir'}</p>
            </div>
            <div className="bg-neutral-sec/60 rounded-2xl p-4 border border-neutral-border">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Temperatura</p>
              <p className="text-[16px] font-extrabold text-neutral-textMain mt-1">{selectedItem.firing_range || 'Sin definir'}</p>
            </div>
          </div>

          {selectedItem.notes && (
            <div className="mt-6 bg-neutral-sec/60 rounded-2xl p-5 border border-neutral-border">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Notas</p>
              <p className="text-[14px] text-neutral-textSec">{selectedItem.notes}</p>
            </div>
          )}
          {showFormula && (
            <div className="mt-6 bg-neutral-sec/60 rounded-2xl p-5 border border-neutral-border space-y-4">
              <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Receta</p>
              {selectedItem.formula!.recipe.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-neutral-textMain uppercase tracking-widest">Materiales</p>
                  <ul className="mt-2 space-y-1 text-[12px] text-neutral-textSec">
                    {selectedItem.formula!.recipe.map((comp, idx) => (
                      <li key={`r-${idx}`}>{comp.name}: {comp.percentage}{formulaUnitLabel}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleEditFromDetail}
                className="px-8 py-4 bg-neutral-textMain text-white rounded-full text-[11px] font-extrabold uppercase tracking-widest hover:bg-black"
              >
                Editar item
              </button>
              <button
                onClick={() => setShowMovementForm(prev => !prev)}
                className="px-8 py-4 bg-brand text-white rounded-full text-[11px] font-extrabold uppercase tracking-widest hover:bg-brand-hover"
              >
                Registrar movimiento
              </button>
            </div>
          </div>
        </div>

        {showMovementForm && (
          <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-neutral-border soft-shadow p-8 md:p-10">
            <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest mb-6">Nuevo movimiento</h4>
            <form onSubmit={handleSubmitMovement} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Tipo</label>
                  <select
                    value={movementForm.type}
                    onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as MovementType })}
                    className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light appearance-none"
                  >
                    <option value="in">Entrada</option>
                    <option value="out">Salida</option>
                    <option value="adjust">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">
                    {movementForm.type === 'adjust' ? 'Cantidad ajustada' : 'Cantidad'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementForm.type === 'adjust' ? movementForm.new_quantity : movementForm.quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMovementForm(movementForm.type === 'adjust'
                        ? { ...movementForm, new_quantity: val }
                        : { ...movementForm, quantity: val }
                      );
                    }}
                    className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Unidad</label>
                  <input
                    value={movementForm.unit}
                    onChange={(e) => setMovementForm({ ...movementForm, unit: e.target.value })}
                    className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Motivo</label>
                  <input
                    value={movementForm.reason}
                    onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                    className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                    placeholder="Ej: Compra, consumo, ajuste"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Fecha</label>
                  <input
                    type="date"
                    value={movementForm.date}
                    onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                    className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Notas</label>
                <textarea
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light min-h-[100px] resize-none"
                  placeholder="Opcional"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-5 bg-brand text-white rounded-2xl font-extrabold uppercase tracking-widest text-[14px] soft-shadow hover:bg-brand-hover active:scale-[0.98] transition-all"
                >
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-neutral-border soft-shadow p-8 md:p-10">
          <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest mb-6">Movimientos recientes</h4>
          {recentMovements.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-neutral-border rounded-2xl">
              <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-textHelper">Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMovements.map(mov => (
                <div key={mov.id} className="flex justify-between items-center p-4 rounded-2xl border border-neutral-border bg-neutral-sec/40">
                  <div>
                    <p className="text-[12px] font-extrabold text-neutral-textMain uppercase tracking-widest">{mov.type === 'in' ? 'Entrada' : mov.type === 'out' ? 'Salida' : 'Ajuste'}</p>
                    <p className="text-[10px] text-neutral-textHelper uppercase tracking-widest mt-1">{mov.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-extrabold text-neutral-textMain">{mov.type === 'adjust' ? mov.new_quantity : mov.quantity} {mov.unit}</p>
                    <p className="text-[10px] text-neutral-textHelper uppercase tracking-widest">{mov.date ? new Date(mov.date).toLocaleDateString('es-ES') : 'Sin fecha'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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

  const renderForm = () => {
    const formulaTotal = itemForm.formulaRows.reduce((sum, row) => {
      const value = Number(row.value);
      return Number.isNaN(value) ? sum : sum + value;
    }, 0);

    return (
    <div className="px-5 md:px-8 pb-32 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-neutral-border soft-shadow p-8 md:p-10 max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-extrabold text-brand uppercase tracking-widest">{editingItem ? 'Editar item' : 'Nuevo item'}</p>
            <h3 className="text-[22px] md:text-[28px] font-extrabold text-neutral-textMain uppercase tracking-tight mt-2">Registro de inventario</h3>
          </div>
          <button
            onClick={() => setCurrentSubView('list')}
            className="px-5 py-3 bg-neutral-alt text-neutral-textSec rounded-full text-[10px] font-extrabold uppercase tracking-widest"
          >
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSubmitItem} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Categoria</label>
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as InventoryCategory })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light appearance-none"
              >
                {categories.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Codigo</label>
              <input
                value={itemForm.code}
                onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                placeholder="Ej: GL-010"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Nombre</label>
            <input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
              placeholder="Ej: Esmalte blanco mate"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Cantidad actual</label>
              <input
                type="number"
                step="0.01"
                value={itemForm.current_quantity}
                onChange={(e) => setItemForm({ ...itemForm, current_quantity: Number(e.target.value) })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Minimo</label>
              <input
                type="number"
                step="0.01"
                value={itemForm.min_quantity}
                onChange={(e) => setItemForm({ ...itemForm, min_quantity: Number(e.target.value) })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Unidad</label>
              <input
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                placeholder="kg, l, un"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Ubicacion</label>
              <input
                value={itemForm.location}
                onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                placeholder="Estudio"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Proveedor</label>
              <input
                value={itemForm.supplier}
                onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                placeholder="Proveedor"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Codigo proveedor</label>
              <input
                value={itemForm.supplier_code}
                onChange={(e) => setItemForm({ ...itemForm, supplier_code: e.target.value })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                placeholder="Ej: SUP-123"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Temperatura</label>
              <input
                value={itemForm.firing_range}
                onChange={(e) => setItemForm({ ...itemForm, firing_range: e.target.value })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                placeholder="Ej: 1180-1220C"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Color</label>
              <input
                value={itemForm.color}
                onChange={(e) => setItemForm({ ...itemForm, color: e.target.value })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                placeholder="Ej: Blanco"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Familia color</label>
              <select
                value={itemForm.color_family}
                onChange={(e) => setItemForm({ ...itemForm, color_family: e.target.value as ColorFamily })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light appearance-none"
              >
                <option value="">Sin definir</option>
                {(['blancos', 'negros', 'azules', 'verdes', 'tierras', 'transparentes', 'efectos', 'otros'] as ColorFamily[]).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Acabado</label>
              <select
                value={itemForm.finish}
                onChange={(e) => setItemForm({ ...itemForm, finish: e.target.value as GlazeFinish })}
                className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light appearance-none"
              >
                <option value="">Sin definir</option>
                {(['mate', 'satinado', 'brillo'] as GlazeFinish[]).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {(itemForm.category === 'glaze' || itemForm.category === 'engobe') && (
            <div>
              <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-3">Receta de materiales</label>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <select
                  value={itemForm.formulaUnit}
                  onChange={(e) => setItemForm({ ...itemForm, formulaUnit: e.target.value as 'percent' | 'weight' })}
                  className="px-4 py-2 bg-neutral-sec border border-neutral-border rounded-lg text-[12px] font-extrabold uppercase tracking-widest"
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="weight">Peso (g)</option>
                </select>
              </div>

              <div className="space-y-2">
                {itemForm.formulaRows.map((row, idx) => (
                  <div key={`formula-${idx}`} className="grid grid-cols-1 sm:grid-cols-[1fr,140px,auto] gap-2 items-center">
                    <input
                      value={row.name}
                      onChange={(e) => updateFormulaRow(idx, { name: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                      placeholder="Nombre del material"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.value}
                      onChange={(e) => updateFormulaRow(idx, { value: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                      placeholder="0.00"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => removeFormulaRow(idx)}
                        className="px-3 py-2 bg-white border border-neutral-border rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-red-500"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex justify-end">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-textHelper">
                  Total: {formulaTotal.toFixed(2)}{itemForm.formulaUnit === 'percent' ? '%' : ' g'}
                </span>
              </div>

              <button
                type="button"
                onClick={addFormulaRow}
                className="mt-3 px-4 py-2 bg-white border border-neutral-border rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-neutral-textMain hover:text-brand"
              >
                Anadir material
              </button>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Notas</label>
            <textarea
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              className="w-full px-5 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light min-h-[120px] resize-none"
              placeholder="Observaciones..."
            />
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={submitItem}
              className="w-full py-5 bg-brand text-white rounded-2xl font-extrabold uppercase tracking-widest text-[14px] soft-shadow hover:bg-brand-hover active:scale-[0.98] transition-all"
            >
              {editingItem ? 'Guardar cambios' : 'Guardar item'}
            </button>
          </div>
        </form>
      </div>
    </div>
    );
  };

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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="inline-flex bg-white p-1 rounded-full border border-neutral-border soft-shadow overflow-x-auto no-scrollbar shrink-0 max-w-full">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-6 md:px-8 py-2.5 rounded-full text-[11px] md:text-[12px] uppercase tracking-widest transition-all whitespace-nowrap ${filterCategory === cat.id ? 'bg-brand text-white font-extrabold' : 'text-neutral-textHelper hover:text-brand'}`}>{cat.label}</button>
                  ))}
                </div>
                <button
                  onClick={handleOpenForm}
                  className="px-8 py-4 bg-brand text-white rounded-full text-[11px] font-extrabold uppercase tracking-widest soft-shadow hover:bg-brand-hover active:scale-[0.98] transition-all"
                >
                  Nuevo item
                </button>
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
        {currentSubView === 'detail' && renderDetail()}
        {currentSubView === 'form' && renderForm()}
      </div>
    </div>
  );
};

export default InventoryView;
