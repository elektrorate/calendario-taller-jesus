import { showError } from '../context/toast';
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AssignedClass } from '../types';
import { ConfirmModal } from './shared/ConfirmModal';

interface StudentListProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  onRenew: (id: string, numClasses: number) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  selectedStudentId?: string | null;
  onClearSelectedStudent?: () => void;
}

type TabType = 'all' | 'active' | 'pending';
type CategoryFilter = 'todos' | 'membresia' | 'temporal';

const CATEGORY_LABELS: Record<string, string> = {
  membresia: 'Membresía',
  temporal: 'Temporal'
};

const StudentList: React.FC<StudentListProps> = ({
  students,
  onAddStudent,
  onRenew,
  onUpdate,
  onDeleteStudent,
  selectedStudentId,
  onClearSelectedStudent
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('todos');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    notes: '',
    observations: '',
    classesRemaining: 4,
    price: 100,
    paymentStatus: 'paid' as 'paid' | 'pending',
    classType: 'Modelado',
    expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    assignedClasses: [] as AssignedClass[],
    studentCategory: 'membresia' as 'membresia' | 'temporal',
    groupName: '',
    bonosAsignados: 4,
    repetirMensualmente: false
  });

  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('10:00');

  useEffect(() => {
    if (!selectedStudentId) return;
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;
    handleEditClick(student);
    if (onClearSelectedStudent) onClearSelectedStudent();
  }, [selectedStudentId, students, onClearSelectedStudent]);

  const getCalculatedStatus = (studentData: typeof form) => {
    const today = new Date().toISOString().split('T')[0];
    if (studentData.classesRemaining <= 0 || (studentData.expiryDate && studentData.expiryDate < today) || studentData.paymentStatus === 'pending') {
      return 'needs_renewal';
    }
    return 'membresia';
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setForm({
      name: student.name,
      surname: student.surname || '',
      email: student.email || '',
      phone: student.phone,
      notes: student.notes || '',
      observations: student.observations || '',
      classesRemaining: student.classesRemaining,
      price: student.price || 100,
      paymentStatus: (student.status === 'needs_renewal' && student.classesRemaining > 0) ? 'pending' : 'paid',
      classType: student.classType || 'Modelado',
      expiryDate: student.expiryDate || '',
      assignedClasses: student.assignedClasses || [],
      studentCategory: student.studentCategory || 'membresia',
      groupName: student.groupName || '',
      bonosAsignados: student.bonosAsignados ?? 4,
      repetirMensualmente: student.repetirMensualmente ?? false
    });
    setShowModal(true);
  };

  const handleCreateClick = () => {
    setEditingStudent(null);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setForm({
      name: '', surname: '', email: '', phone: '', notes: '', observations: '',
      classesRemaining: 4, price: 100, paymentStatus: 'paid', classType: 'Modelado',
      expiryDate: nextMonth.toISOString().split('T')[0], assignedClasses: [],
      studentCategory: 'membresia', groupName: '', bonosAsignados: 4, repetirMensualmente: false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!form.name.trim()) {
      showError('El nombre es obligatorio.');
      return;
    }
    const data = { ...form, status: getCalculatedStatus(form) as 'needs_renewal' | 'membresia', groupName: '' };
    setShowModal(false);
    setEditingStudent(null);
    if (editingStudent?.id) onUpdate(editingStudent.id, data);
    else onAddStudent(data);
  };

  const handleAddSession = () => {
    if (!newSessionDate) return;
    const [h, m] = newSessionTime.split(':').map(Number);
    const endTime = `${String((h + 2) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setForm(prev => ({
      ...prev,
      assignedClasses: [...prev.assignedClasses, { date: newSessionDate, startTime: newSessionTime, endTime, status: 'pending' }]
    }));
    setNewSessionDate('');
  };

  const filteredStudents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return students.filter(s => {
      const isPending = s.status === 'needs_renewal' || s.classesRemaining <= 0 || (s.expiryDate && s.expiryDate < today);
      const fullName = `${s.name} ${s.surname || ''}`.trim().toLowerCase();
      const matchesSearch = !searchQuery.trim() || fullName.includes(searchQuery.trim().toLowerCase());
      const cat = s.studentCategory || 'membresia';
      const matchesCategory = categoryFilter === 'todos' || cat === categoryFilter;
      if (activeTab === 'pending') return isPending && matchesCategory;
      if (activeTab === 'active') return !isPending && matchesCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, activeTab, searchQuery, categoryFilter]);

  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return students
      .map(s => `${s.name} ${s.surname || ''}`.trim())
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [students, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: students.length, membresia: 0, temporal: 0 };
    students.forEach(s => {
      const cat = s.studentCategory || 'membresia';
      if (cat === 'membresia') counts.membresia++;
      if (cat === 'temporal') counts.temporal++;
    });
    return counts;
  }, [students]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F7F3EF] text-neutral-textMain" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7 pb-24">
        <div className="max-w-[1280px] mx-auto">
          <header className="flex flex-col gap-5 mb-7 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-[#8B6B5E] uppercase tracking-[0.18em] mb-2">Comunidad del taller</p>
                <h1 className="text-[32px] sm:text-[40px] leading-none tracking-[-0.04em] text-[#7B3F22]" style={{ fontFamily: "'Playfair Display', serif" }}>Alumnos</h1>
                <p className="text-[13px] text-[#8B6B5E] mt-2">Personas, bonos y actividad del taller.</p>
              </div>
              <button onClick={handleCreateClick} className="shrink-0 flex items-center gap-2 h-10 px-3 sm:px-4 bg-[#7B3F22] text-white rounded-lg text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-[#63321C] focus:outline-none focus:ring-2 focus:ring-[#C68952]/50 transition-colors" aria-label="Crear nuevo alumno">
                <span className="text-lg leading-none">+</span><span className="hidden sm:inline">Nuevo alumno</span><span className="sm:hidden">Nuevo</span>
              </button>
            </div>
            <div className="flex items-center gap-5 border-y border-[#DDBFA4]/60 py-3 text-[11px]">
              <span><strong className="text-[#7B3F22] text-base mr-1">{students.length}</strong><span className="text-[#8B6B5E]">alumnos</span></span>
              <span className="w-px h-4 bg-[#DDBFA4]" />
              <span><strong className="text-[#7B3F22] text-base mr-1">{categoryCounts.membresia}</strong><span className="text-[#8B6B5E]">membresías</span></span>
              <span className="w-px h-4 bg-[#DDBFA4]" />
              <span><strong className="text-[#7B3F22] text-base mr-1">{categoryCounts.temporal}</strong><span className="text-[#8B6B5E]">temporales</span></span>
            </div>
          </header>

          <section className="mb-6" aria-label="Filtros de alumnos">
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6B5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
              <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} placeholder="Buscar por nombre o apellidos" aria-label="Buscar alumno por nombre o apellidos" className="w-full h-11 pl-10 pr-10 bg-white border border-[#DDBFA4] rounded-lg text-[13px] text-[#7B3F22] placeholder:text-[#8B6B5E]/70 outline-none focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/15 transition-all" />
              {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B6B5E] hover:text-[#7B3F22]" aria-label="Limpiar búsqueda">×</button>}
              {showSuggestions && suggestions.length > 0 && <div className="absolute left-0 right-0 mt-1 bg-white border border-[#DDBFA4] rounded-lg shadow-[0_8px_24px_rgba(123,63,34,0.12)] z-20 overflow-hidden">{suggestions.map(name => <button key={name} onMouseDown={() => { setSearchQuery(name); setShowSuggestions(false); }} className="w-full text-left px-4 py-3 text-[13px] text-[#7B3F22] hover:bg-[#F7F1EB] border-b last:border-0 border-[#F0E5DB]">{name}</button>)}</div>}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex overflow-x-auto no-scrollbar border-b border-[#DDBFA4] gap-5" role="tablist" aria-label="Estado de alumnos">
                {(['all', 'active', 'pending'] as TabType[]).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab} className={`shrink-0 h-9 border-b-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${activeTab === tab ? 'border-[#7B3F22] text-[#7B3F22]' : 'border-transparent text-[#8B6B5E] hover:text-[#7B3F22]'}`}>{tab === 'all' ? 'Todos' : tab === 'active' ? 'Al día' : 'Pendientes'}</button>)}
              </div>
              <div className="flex gap-2 sm:ml-auto overflow-x-auto no-scrollbar">
                {(['todos', 'membresia', 'temporal'] as CategoryFilter[]).map(cat => <button key={cat} onClick={() => setCategoryFilter(cat)} className={`shrink-0 px-3 h-8 rounded-md text-[10px] font-bold uppercase tracking-[0.08em] border transition-colors ${categoryFilter === cat ? 'bg-[#F0E2D6] border-[#C68952] text-[#7B3F22]' : 'bg-white border-[#DDBFA4] text-[#8B6B5E] hover:border-[#C68952]'}`}>{cat === 'todos' ? 'Todos' : CATEGORY_LABELS[cat]} <span className="opacity-60">{categoryCounts[cat] || 0}</span></button>)}
              </div>
            </div>
          </section>

          <div className="bg-white border border-[#DDBFA4] rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(260px,1.8fr)_1fr_110px_118px] gap-4 px-5 py-3 border-b border-[#EDE2D8] text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B6B5E]"><span>Alumno</span><span>Actividad</span><span>Bonos</span><span>Estado</span></div>
            {filteredStudents.length === 0 ? <div className="px-6 py-16 text-center"><p className="text-[15px] text-[#7B3F22]" style={{ fontFamily: "'Playfair Display', serif" }}>No hay alumnos que mostrar</p><p className="text-[12px] text-[#8B6B5E] mt-1">Prueba a cambiar la búsqueda o los filtros.</p></div> : filteredStudents.map(s => {
              const today = new Date().toISOString().split('T')[0];
              const isPending = s.status === 'needs_renewal' || s.classesRemaining <= 0 || (s.expiryDate && s.expiryDate < today);
              const cat = s.studentCategory || 'membresia';
              const initials = `${s.name.charAt(0)}${s.surname?.charAt(0) || ''}`.toUpperCase();
              const percentage = Math.min(100, (s.classesRemaining / (s.bonosAsignados || 4)) * 100);
              return <button key={s.id} onClick={() => handleEditClick(s)} className="w-full text-left grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(260px,1.8fr)_1fr_110px_118px] gap-3 md:gap-4 items-center px-4 md:px-5 py-4 border-b last:border-0 border-[#EDE2D8] hover:bg-[#FCF8F4] focus:outline-none focus:bg-[#FCF8F4] transition-colors group">
                <div className="flex items-center gap-3 min-w-0"><span className="w-11 h-11 shrink-0 rounded-full bg-[#F0E2D6] text-[#7B3F22] flex items-center justify-center text-[12px] font-bold">{initials}</span><span className="min-w-0"><strong className="block text-[15px] text-[#7B3F22] truncate group-hover:text-[#C68952] transition-colors">{s.name} {s.surname}</strong><span className="block text-[11px] text-[#8B6B5E] truncate">{s.phone || s.email || 'Sin contacto añadido'}</span><span className="md:hidden block text-[10px] text-[#8B6B5E] mt-1">{s.classType || 'Sin actividad'} · {CATEGORY_LABELS[cat] || cat}</span></span></div>
                <div className="hidden md:block min-w-0"><span className="block text-[13px] text-[#7B3F22] truncate">{s.classType || 'Sin actividad'}</span><span className="inline-flex mt-1 px-2 py-0.5 rounded border border-[#DDBFA4] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8B6B5E]">{CATEGORY_LABELS[cat] || cat}</span></div>
                <div className="text-right md:text-left"><strong className={`text-[16px] ${isPending ? 'text-[#A85D3B]' : 'text-[#7B3F22]'}`}>{s.classesRemaining}<span className="text-[11px] text-[#8B6B5E] font-normal">/{s.bonosAsignados || 4}</span></strong><div className="w-16 h-1 bg-[#F0E5DB] rounded-full overflow-hidden mt-1 ml-auto md:ml-0"><span className={`block h-full ${isPending ? 'bg-[#C68952]' : 'bg-[#7B3F22]'}`} style={{ width: `${percentage}%` }} /></div></div>
                <span className={`hidden md:inline-flex justify-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-[0.08em] border ${isPending ? 'bg-[#FBF1EC] text-[#A85D3B] border-[#E8CABB]' : 'bg-[#F5F1E9] text-[#7B3F22] border-[#D8CDBE]'}`}>{isPending ? 'Revisar' : 'Al día'}</span>
              </button>;
            })}
          </div>
        </div>
      </div>

      {showModal && <div className="fixed inset-0 bg-[#4B2A1D]/45 backdrop-blur-[2px] z-[100] flex items-end md:items-center justify-center overflow-hidden">
        <div className="bg-[#FDFBF9] w-full md:max-w-5xl h-[100dvh] md:h-auto md:max-h-[92dvh] md:rounded-xl shadow-[0_20px_60px_rgba(75,42,29,0.2)] relative flex flex-col overflow-hidden animate-fade-in">
          <div className="px-4 sm:px-7 py-4 border-b border-[#E6D8CB] flex items-center justify-between shrink-0 bg-[#FDFBF9]"><div className="flex items-center gap-3 min-w-0"><span className="hidden sm:flex w-10 h-10 rounded-full bg-[#F0E2D6] text-[#7B3F22] items-center justify-center text-[12px] font-bold">{editingStudent ? `${editingStudent.name.charAt(0)}${editingStudent.surname?.charAt(0) || ''}` : '+'}</span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B6B5E]">{editingStudent ? 'Perfil del alumno' : 'Nuevo alumno'}</p><h3 className="text-[20px] text-[#7B3F22] truncate" style={{ fontFamily: "'Playfair Display', serif" }}>{editingStudent ? `${editingStudent.name} ${editingStudent.surname || ''}`.trim() : 'Crear ficha'}</h3></div></div><button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-md border border-[#DDBFA4] text-[#8B6B5E] flex items-center justify-center hover:bg-[#F0E2D6] hover:text-[#7B3F22] transition-colors" aria-label="Cerrar ficha"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 6l12 12M18 6 6 18" /></svg></button></div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-7 pb-24 md:pb-8"><form onSubmit={handleSubmit} className="py-5 md:py-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12">
            <div className="space-y-7">
              <section><div className="flex items-baseline justify-between mb-3"><h4 className="text-[14px] font-bold text-[#7B3F22]">Información personal</h4><span className="text-[10px] text-[#8B6B5E]">Datos de contacto</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" aria-label="Nombre" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] placeholder:text-[#8B6B5E] outline-none focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/15" /><input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="Apellidos" aria-label="Apellidos" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] placeholder:text-[#8B6B5E] outline-none focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/15" /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" aria-label="Email" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] placeholder:text-[#8B6B5E] outline-none focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/15" /><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" aria-label="Teléfono" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] placeholder:text-[#8B6B5E] outline-none focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/15" /></div></section>
              <section className="border-t border-[#E6D8CB] pt-6"><h4 className="text-[14px] font-bold text-[#7B3F22] mb-3">Actividad y categoría</h4><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><select value={form.classType} onChange={(e) => setForm({ ...form, classType: e.target.value })} aria-label="Tipo de clase" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] outline-none focus:border-[#C68952]"><option>Modelado</option><option>Torno</option><option>Coworking</option><option>Iniciación</option></select><select value={form.studentCategory} onChange={(e) => setForm({ ...form, studentCategory: e.target.value as 'membresia' | 'temporal' })} aria-label="Categoría del alumno" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] outline-none focus:border-[#C68952]"><option value="membresia">Membresía</option><option value="temporal">Temporal</option></select><select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as 'paid' | 'pending' })} aria-label="Estado del pago" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] outline-none focus:border-[#C68952]"><option value="paid">Pago al día</option><option value="pending">Pago pendiente</option></select><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) })} placeholder="Cuota" aria-label="Cuota" className="h-11 px-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] placeholder:text-[#8B6B5E] outline-none focus:border-[#C68952]" /></div></section>

              <section className="border-t border-[#E6D8CB] pt-6">
                <div className="flex items-baseline justify-between mb-4">
                  <h4 className="text-[14px] font-bold text-[#7B3F22]">Bonos</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[14px] font-medium text-[#7B3F22] mb-2">Bonos contratados</label>
                    <div className="flex items-center bg-white border border-[#E7B899] rounded-md overflow-hidden h-11">
                      <button type="button" onClick={() => setForm(f => ({ ...f, bonosAsignados: Math.max(1, f.bonosAsignados - 1) }))} className="w-10 h-11 shrink-0 text-[#A85D3B] hover:bg-[#F0E2D6]" aria-label="Reducir bonos">-</button>
                      <input type="number" readOnly value={form.bonosAsignados} aria-label="Bonos contratados" className="w-full min-w-0 text-center text-[14px] font-bold text-[#A85D3B] outline-none" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, bonosAsignados: f.bonosAsignados + 1 }))} className="w-10 h-11 shrink-0 text-[#A85D3B] hover:bg-[#F0E2D6]" aria-label="Aumentar bonos">+</button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2"><label className="block text-[14px] font-medium text-[#7B3F22]">Bonos restantes</label><span className="text-[12px] font-bold text-[#A85D3B]">{form.classesRemaining}/{form.bonosAsignados}</span></div>
                    <div className="flex items-center bg-white border border-[#E7B899] rounded-md overflow-hidden h-11">
                      <button type="button" onClick={() => setForm(f => ({ ...f, classesRemaining: Math.max(0, f.classesRemaining - 1) }))} className="w-10 h-11 shrink-0 text-[#A85D3B] hover:bg-[#F0E2D6]" aria-label="Reducir clases restantes">-</button>
                      <input type="number" readOnly value={form.classesRemaining} aria-label="Bonos restantes" className="w-full min-w-0 text-center text-[14px] font-bold text-[#A85D3B] outline-none" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, classesRemaining: f.classesRemaining + 1 }))} className="w-10 h-11 shrink-0 text-[#A85D3B] hover:bg-[#F0E2D6]" aria-label="Aumentar clases restantes">+</button>
                    </div>
                  </div>
                </div>
                <div className="h-1.5 bg-[#F0E5DB] rounded-full overflow-hidden mt-3"><div className={`h-full ${form.classesRemaining <= 0 ? 'bg-[#A85D3B]' : 'bg-[#7B3F22]'}`} style={{ width: `${Math.min(100, (form.classesRemaining / form.bonosAsignados) * 100)}%` }} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} aria-label="Fecha de expiración" className="h-11 px-3 bg-white border border-[#E7B899] rounded-md text-[13px] text-[#A85D3B] outline-none focus:border-[#C68952]" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, repetirMensualmente: !f.repetirMensualmente }))} className={`h-11 rounded-md border text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${form.repetirMensualmente ? 'bg-[#7B3F22] text-white border-[#7B3F22]' : 'bg-white text-[#A85D3B] border-[#E7B899] hover:border-[#C68952]'}`}>{form.repetirMensualmente ? 'Renovación activa' : 'Activar renovación'}</button>
                </div>
              </section>
            </div>

            <div className="space-y-7">
              <section><div className="flex items-baseline justify-between mb-3"><h4 className="text-[14px] font-bold text-[#7B3F22]">Asistencia</h4><span className="text-[10px] text-[#8B6B5E]">Registro de sesiones</span></div><div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">{form.assignedClasses.length === 0 ? <p className="py-6 border border-dashed border-[#DDBFA4] rounded-md text-center text-[12px] text-[#8B6B5E]">No hay asistencias registradas aún.</p> : form.assignedClasses.map((ac, idx) => <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white border border-[#E6D8CB] rounded-md"><div><p className="text-[13px] font-bold text-[#7B3F22]">{ac.date}</p><p className="text-[11px] text-[#8B6B5E]">{ac.startTime} - {ac.endTime}</p></div><div className="flex gap-1"><button type="button" onClick={() => { const updated = [...form.assignedClasses]; updated[idx].status = updated[idx].status === 'present' ? 'pending' : 'present'; setForm({ ...form, assignedClasses: updated }); }} className={`w-8 h-8 rounded-md flex items-center justify-center border ${ac.status === 'present' ? 'bg-[#7B3F22] text-white border-[#7B3F22]' : 'bg-white text-[#8B6B5E] border-[#DDBFA4]'}`} aria-label="Marcar presente">✓</button><button type="button" onClick={() => { const updated = [...form.assignedClasses]; updated[idx].status = updated[idx].status === 'absent' ? 'pending' : 'absent'; setForm({ ...form, assignedClasses: updated }); }} className={`w-8 h-8 rounded-md flex items-center justify-center border ${ac.status === 'absent' ? 'bg-[#A85D3B] text-white border-[#A85D3B]' : 'bg-white text-[#8B6B5E] border-[#DDBFA4]'}`} aria-label="Marcar ausente">×</button></div></div>)}</div><div className="grid grid-cols-[1fr_1fr_44px] gap-2 mt-3"><input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} aria-label="Fecha de asistencia" className="h-10 px-2 bg-white border border-[#DDBFA4] rounded-md text-[12px] text-[#7B3F22]" /><input type="time" value={newSessionTime} onChange={(e) => setNewSessionTime(e.target.value)} aria-label="Hora de asistencia" className="h-10 px-2 bg-white border border-[#DDBFA4] rounded-md text-[12px] text-[#7B3F22]" /><button type="button" onClick={handleAddSession} className="h-10 rounded-md bg-[#F0E2D6] text-[#7B3F22] text-lg hover:bg-[#DDBFA4]" aria-label="Añadir asistencia">+</button></div></section>
              <section className="border-t border-[#E6D8CB] pt-6"><h4 className="text-[14px] font-bold text-[#7B3F22] mb-3">Observaciones internas</h4><textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Preferencias, nivel o avisos relevantes" aria-label="Observaciones internas" className="w-full min-h-[120px] p-3 bg-white border border-[#DDBFA4] rounded-md text-[13px] text-[#7B3F22] placeholder:text-[#8B6B5E] outline-none resize-y focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/15" /></section>
              <div className="text-[11px] text-[#8B6B5E] border-t border-[#E6D8CB] pt-4">{editingStudent?.createdAt ? `Ficha creada el ${new Date(editingStudent.createdAt).toLocaleDateString('es-ES')}` : 'La ficha se registrará al guardar.'}</div>
              {editingStudent && <button type="button" onClick={() => setStudentToDelete(editingStudent.id)} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A85D3B] hover:text-[#7B3F22]">Eliminar alumno</button>}
            </div>
          </form></div>

          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-7 py-3 bg-[#FDFBF9]/95 backdrop-blur border-t border-[#E6D8CB] flex items-center justify-end gap-3 shrink-0 z-10"><button type="button" onClick={() => setShowModal(false)} className="h-10 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#8B6B5E] hover:text-[#7B3F22]">Cancelar</button><button onClick={handleSubmit} disabled={isSubmitting} className="h-10 px-4 sm:px-5 bg-[#7B3F22] text-white rounded-md text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-[#63321C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSubmitting ? 'Guardando...' : (editingStudent ? 'Guardar cambios' : 'Guardar alumno')}</button></div>
        </div>
      </div>}

      <ConfirmModal isOpen={!!studentToDelete} title="¿Eliminar alumno?" message="¿Seguro que deseas eliminar el historial de este alumno? Esta acción no se puede deshacer." isDestructive={true} onConfirm={() => { if (studentToDelete) { const idToDelete = studentToDelete; setStudentToDelete(null); setShowModal(false); setEditingStudent(null); onDeleteStudent(idToDelete); } }} onCancel={() => setStudentToDelete(null)} />
    </div>
  );
};

export default StudentList;
