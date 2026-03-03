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

const CATEGORY_COLORS: Record<string, string> = {
  membresia: 'bg-brand text-white',
  temporal: 'bg-amber-500 text-white'
};

const CATEGORY_BADGE_LIGHT: Record<string, string> = {
  membresia: 'bg-brand/10 text-brand border-brand/20',
  temporal: 'bg-amber-50 text-amber-700 border-amber-100'
};

const StudentList: React.FC<StudentListProps> = ({ students, onAddStudent, onRenew, onUpdate, onDeleteStudent, selectedStudentId, onClearSelectedStudent }) => {
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
      studentCategory: 'membresia', groupName: '',
      bonosAsignados: 4, repetirMensualmente: false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!form.name.trim()) {
      alert('El nombre es obligatorio.');
      return;
    }
    const data = {
      ...form,
      status: getCalculatedStatus(form) as 'needs_renewal' | 'membresia',
      groupName: ''
    };
    // Close modal immediately — Supabase operations run in background
    setShowModal(false);
    setEditingStudent(null);
    if (editingStudent?.id) {
      onUpdate(editingStudent.id, data);
    } else {
      onAddStudent(data);
    }
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

  // Count per category
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
    <div className="h-full flex flex-col overflow-hidden bg-neutral-base">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 pt-8 pb-32">

        <header className="mb-12 animate-fade-in text-center md:text-left">
          <p className="text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-[0.2em] mb-4">MODULO DE GESTION</p>
          <h1 className="text-[36px] md:text-[52px] font-black text-neutral-textMain leading-none uppercase tracking-tighter">
            Listado de <span className="text-brand">Alumnos</span>
          </h1>
          <p className="text-[14px] md:text-[16px] font-light text-neutral-textSec mt-5 max-w-xl mx-auto md:mx-0">
            Administra la comunidad del taller, controla asistencias y renovaciones de bonos con precision artesanal.
          </p>
        </header>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['todos', 'membresia', 'temporal'] as CategoryFilter[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest border transition-all ${categoryFilter === cat
                ? (cat === 'todos' ? 'bg-neutral-textMain text-white border-neutral-textMain' : CATEGORY_COLORS[cat] + ' border-transparent')
                : 'bg-white text-neutral-textHelper border-neutral-border hover:border-neutral-textHelper'
                }`}
            >
              {cat === 'todos' ? 'Todos' : CATEGORY_LABELS[cat]} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="bg-white p-1.5 rounded-full border border-neutral-border soft-shadow flex items-center w-full md:w-auto overflow-x-auto no-scrollbar">
            {(['all', 'active', 'pending'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none whitespace-nowrap px-8 py-3 rounded-full text-[12px] font-extrabold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand text-white shadow-md' : 'text-neutral-textHelper hover:text-brand font-light'}`}
              >
                {tab === 'all' ? 'Todos' : tab === 'active' ? 'Al dia' : 'Pendientes'}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-[320px]">
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Buscar alumno (nombre)"
              className="w-full px-5 py-3 bg-white border border-neutral-border rounded-full text-[12px] font-extrabold uppercase tracking-widest shadow-sm"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-border rounded-2xl soft-shadow z-10 overflow-hidden">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onMouseDown={() => {
                      setSearchQuery(name);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[12px] font-extrabold uppercase tracking-widest text-neutral-textMain hover:bg-neutral-alt"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleCreateClick}
            className="w-full md:w-auto px-10 py-5 bg-neutral-textMain text-white rounded-full text-[13px] font-extrabold shadow-lg uppercase tracking-widest hover:bg-black active:scale-95 transition-all"
          >
            NUEVA FICHA
          </button>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStudents.map((s) => {
            const today = new Date().toISOString().split('T')[0];
            const isPending = s.status === 'needs_renewal' || s.classesRemaining <= 0 || (s.expiryDate && s.expiryDate < today);
            const cat = s.studentCategory || 'membresia';
            return (
              <div
                key={s.id}
                onClick={() => handleEditClick(s)}
                className="p-8 bg-white rounded-[2.5rem] border border-neutral-border soft-shadow hover:border-brand-light hover:scale-[1.02] transition-all cursor-pointer group flex flex-col h-full animate-fade-in"
              >
                <div className="flex items-center gap-5 mb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-[24px] ${CATEGORY_COLORS[cat] || 'bg-neutral-alt'} group-hover:brightness-110 transition-all shrink-0 shadow-inner`}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-extrabold text-neutral-textMain text-[20px] leading-tight uppercase tracking-tight truncate">{s.name} {s.surname}</h4>
                    <p className="text-[13px] font-light text-neutral-textSec uppercase tracking-widest mt-1">{s.phone}</p>
                  </div>
                </div>

                {/* Category badge + group */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border ${CATEGORY_BADGE_LIGHT[cat] || 'bg-neutral-alt text-neutral-textHelper border-neutral-border'}`}>
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                  {s.groupName && (
                    <span className="inline-block px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest bg-neutral-sec text-neutral-textHelper border border-neutral-border">
                      {s.groupName}
                    </span>
                  )}
                </div>

                <div className="mt-auto space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest">BONOS</span>
                    <span className={`text-[18px] font-black ${isPending ? 'text-red-500' : 'text-neutral-textMain'}`}>
                      {s.classesRemaining}<span className="text-[13px] font-bold text-neutral-textHelper">/{s.bonosAsignados || 4}</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-alt rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${isPending ? 'bg-red-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(100, (s.classesRemaining / (s.bonosAsignados || 4)) * 100)}%` }}
                    />
                  </div>
                  <span className={`inline-block w-full text-center py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border ${isPending ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    {isPending ? 'Pendiente de Pago' : 'Al dia'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-neutral-textMain/40 backdrop-blur-md z-[100] flex items-center justify-center p-3 md:p-6 overflow-hidden">
          <div className="bg-white w-full max-w-2xl max-h-[92dvh] rounded-[3.5rem] soft-shadow relative flex flex-col overflow-hidden animate-fade-in border border-neutral-border">

            <div className="px-10 pt-10 pb-6 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-[26px] md:text-[32px] font-black text-neutral-textMain uppercase tracking-tight leading-none">
                  {editingStudent ? 'Perfil del Alumno' : 'Nuevo Registro'}
                </h3>
                <p className="text-[20px] md:text-[24px] font-bold text-brand mt-2 capitalize tracking-tight">
                  {editingStudent ? `${editingStudent.name} ${editingStudent.surname || ''}`.trim() : 'Nuevo alumno'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-12 h-12 rounded-full bg-neutral-sec flex items-center justify-center text-neutral-textHelper hover:text-brand transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-44">
              <form onSubmit={handleSubmit} className="space-y-12 pt-6">

                {/* ─── FECHA DE CREACIÓN (auto, no editable) ─── */}
                <div className="flex items-center gap-4 p-4 bg-neutral-sec/60 rounded-2xl border border-neutral-border">
                  <svg className="w-5 h-5 text-neutral-textHelper shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-textHelper">FECHA DE CREACIÓN</p>
                    <p className="text-[13px] font-bold text-neutral-textMain">
                      {editingStudent?.createdAt
                        ? new Date(editingStudent.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Se generará automáticamente'}
                    </p>
                  </div>
                </div>

                {/* ─── 1. INFORMACIÓN PERSONAL (PRIMERO según solicitud) ─── */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                    <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Información Personal</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="NOMBRE" className="w-full p-5 bg-neutral-sec border border-neutral-border rounded-2xl text-[15px] font-light focus:border-brand outline-none transition-all" />
                    <input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} placeholder="APELLIDOS" className="w-full p-5 bg-neutral-sec border border-neutral-border rounded-2xl text-[15px] font-light focus:border-brand outline-none transition-all" />
                  </div>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="EMAIL" className="w-full p-5 bg-neutral-sec border border-neutral-border rounded-2xl text-[15px] font-light focus:border-brand outline-none transition-all" />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="TELÉFONO" className="w-full p-5 bg-neutral-sec border border-neutral-border rounded-2xl text-[15px] font-light focus:border-brand outline-none transition-all" />
                </section>

                {/* ─── 2. CATEGORÍA DE ALUMNO ─── */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                    <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Categoría del Alumno</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['membresia', 'temporal'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm({ ...form, studentCategory: cat })}
                        className={`py-4 rounded-2xl font-extrabold text-[11px] uppercase tracking-widest border transition-all ${form.studentCategory === cat
                          ? CATEGORY_COLORS[cat] + ' border-transparent shadow-md scale-[1.02]'
                          : 'bg-white text-neutral-textHelper border-neutral-border hover:border-neutral-textMain'
                          }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </section>

                {/* ─── 3. TIPO DE CLASE Y PAGO ─── */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-neutral-sec rounded-[2rem] border border-neutral-border group hover:border-brand-light transition-colors">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper mb-2">TIPO DE CLASE</label>
                    <select
                      value={form.classType}
                      onChange={(e) => setForm({ ...form, classType: e.target.value })}
                      className="w-full bg-transparent text-[16px] font-black text-neutral-textMain outline-none appearance-none cursor-pointer"
                    >
                      <option>Modelado</option>
                      <option>Torno</option>
                      <option>Coworking</option>
                      <option>Iniciación</option>
                    </select>
                  </div>
                  <div className="p-6 bg-neutral-sec rounded-[2rem] border border-neutral-border group hover:border-brand-light transition-colors">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper mb-2">CUOTA</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) })}
                      className="w-full bg-transparent text-[16px] font-black text-neutral-textMain outline-none"
                    />
                  </div>
                  <div className="p-6 bg-neutral-sec rounded-[2rem] border border-neutral-border group hover:border-brand-light transition-colors col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper mb-2">ESTADO PAGO</label>
                    <select
                      value={form.paymentStatus}
                      onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as 'paid' | 'pending' })}
                      className={`w-full bg-transparent text-[16px] font-black outline-none appearance-none cursor-pointer ${form.paymentStatus === 'pending' ? 'text-red-500' : 'text-green-600'}`}
                    >
                      <option value="paid">AL DIA</option>
                      <option value="pending">PENDIENTE</option>
                    </select>
                  </div>
                </div>

                {/* ─── 4. GESTIÓN DE BONOS ─── */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                    <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Gestión de Bonos</h4>
                  </div>

                  {/* Bonos contratados + restantes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper ml-2">BONOS CONTRATADOS</label>
                      <div className="flex items-center bg-white border border-neutral-border rounded-2xl overflow-hidden p-1 shadow-sm">
                        <button type="button" onClick={() => setForm(f => ({ ...f, bonosAsignados: Math.max(1, f.bonosAsignados - 1) }))} className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center text-brand hover:bg-neutral-alt transition-colors font-black">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18 12H6" /></svg>
                        </button>
                        <input type="number" readOnly value={form.bonosAsignados} className="flex-1 min-w-0 text-center font-black text-[18px] md:text-xl outline-none bg-transparent" />
                        <button type="button" onClick={() => setForm(f => ({ ...f, bonosAsignados: f.bonosAsignados + 1 }))} className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center text-brand hover:bg-neutral-alt transition-colors font-black">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper ml-2">CLASES RESTANTES</label>
                      <div className="flex items-center bg-white border border-neutral-border rounded-2xl overflow-hidden p-1 shadow-sm">
                        <button type="button" onClick={() => setForm(f => ({ ...f, classesRemaining: Math.max(0, f.classesRemaining - 1) }))} className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center text-brand hover:bg-neutral-alt transition-colors font-black">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18 12H6" /></svg>
                        </button>
                        <input type="number" readOnly value={form.classesRemaining} className="flex-1 min-w-0 text-center font-black text-[18px] md:text-xl outline-none bg-transparent" />
                        <button type="button" onClick={() => setForm(f => ({ ...f, classesRemaining: f.classesRemaining + 1 }))} className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center text-brand hover:bg-neutral-alt transition-colors font-black">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso visual */}
                  {form.bonosAsignados > 0 && (
                    <div className="mb-4 p-4 bg-neutral-sec rounded-2xl border border-neutral-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper">USO DE BONOS</span>
                        <span className="text-[12px] font-black text-neutral-textMain">{form.classesRemaining}/{form.bonosAsignados}</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-alt rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${form.classesRemaining <= 0 ? 'bg-red-400' : form.classesRemaining <= Math.ceil(form.bonosAsignados * 0.25) ? 'bg-amber-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(100, (form.classesRemaining / form.bonosAsignados) * 100)}%` }}
                        />
                      </div>
                      {form.classesRemaining <= 0 && (
                        <p className="text-[10px] font-bold text-red-500 mt-2 uppercase tracking-wider">⚠ Sin bonos disponibles</p>
                      )}
                    </div>
                  )}

                  {/* Expiración + Repetir mensual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper ml-2">EXPIRACIÓN</label>
                      <input
                        type="date"
                        value={form.expiryDate}
                        onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                        className="w-full p-4 bg-white border border-neutral-border rounded-2xl text-[15px] font-bold shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper ml-2">RENOVACIÓN AUTO</label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, repetirMensualmente: !f.repetirMensualmente }))}
                        className={`w-full p-4 rounded-2xl font-bold text-[13px] uppercase tracking-widest border transition-all flex items-center justify-center gap-3 ${form.repetirMensualmente
                          ? 'bg-brand text-white border-brand shadow-md'
                          : 'bg-white text-neutral-textHelper border-neutral-border hover:border-brand'
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {form.repetirMensualmente
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          }
                        </svg>
                        {form.repetirMensualmente ? 'Activo' : 'Repetir Mensual'}
                      </button>
                    </div>
                  </div>
                </section>

                {/* ─── 5. SEGUIMIENTO ASISTENCIA ─── */}
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-neutral-textMain rounded-full"></div>
                      <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Seguimiento Asistencia</h4>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {form.assignedClasses.length === 0 ? (
                      <p className="text-[13px] font-light text-neutral-textHelper italic text-center py-8 border border-dashed border-neutral-border rounded-2xl">No hay asistencias registradas aun.</p>
                    ) : (
                      form.assignedClasses.map((ac, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-neutral-sec rounded-2xl border border-neutral-border animate-fade-in">
                          <div>
                            <p className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-tight">{ac.date}</p>
                            <p className="text-[11px] font-light text-neutral-textSec uppercase tracking-widest">{ac.startTime} - {ac.endTime}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...form.assignedClasses];
                                updated[idx].status = updated[idx].status === 'present' ? 'pending' : 'present';
                                setForm({ ...form, assignedClasses: updated });
                              }}
                              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${ac.status === 'present' ? 'bg-green-500 text-white scale-110 shadow-md' : 'bg-white border border-neutral-border text-neutral-textHelper hover:border-green-400'}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...form.assignedClasses];
                                updated[idx].status = updated[idx].status === 'absent' ? 'pending' : 'absent';
                                setForm({ ...form, assignedClasses: updated });
                              }}
                              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${ac.status === 'absent' ? 'bg-red-400 text-white scale-110 shadow-md' : 'bg-white border border-neutral-border text-neutral-textHelper hover:border-red-400'}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr,1fr,80px] gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-neutral-textHelper ml-2">FECHA</label>
                      <input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} className="w-full p-4 bg-white border border-neutral-border rounded-xl text-[13px] font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-neutral-textHelper ml-2">HORA</label>
                      <input type="time" value={newSessionTime} onChange={(e) => setNewSessionTime(e.target.value)} className="w-full p-4 bg-white border border-neutral-border rounded-xl text-[13px] font-bold" />
                    </div>
                    <button type="button" onClick={handleAddSession} className="h-[52px] bg-neutral-textMain text-white font-black rounded-xl hover:bg-black transition-colors">+</button>
                  </div>
                </section>

                {/* ─── 6. OBSERVACIONES ─── */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                    <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Observaciones Internas</h4>
                  </div>
                  <textarea
                    value={form.observations}
                    onChange={(e) => setForm({ ...form, observations: e.target.value })}
                    placeholder="Notas sobre preferencias, nivel, avisos relevantes..."
                    className="w-full p-6 bg-neutral-sec border border-neutral-border rounded-[2.5rem] text-[15px] font-light focus:border-brand outline-none transition-all min-h-[160px] resize-none"
                  />
                </section>

                {editingStudent && (
                  <div className="pt-8 border-t border-neutral-border">
                    <button
                      type="button"
                      onClick={() => setStudentToDelete(editingStudent.id)}
                      className="w-full text-red-400 hover:text-red-600 font-extrabold uppercase text-[11px] tracking-[0.2em] transition-colors py-4"
                    >
                      Eliminar Alumno Definitivamente
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-10 bg-white/95 backdrop-blur-md border-t border-neutral-border flex items-center justify-center shrink-0 z-10">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-6 bg-brand text-white rounded-full font-black soft-shadow uppercase tracking-[0.2em] text-[16px] hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'GUARDANDO...' : (editingStudent ? 'ACTUALIZAR PERFIL' : 'GUARDAR REGISTRO')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!studentToDelete}
        title="¿Eliminar alumno?"
        message="¿Seguro que deseas eliminar el historial de este alumno? Esta acción no se puede deshacer."
        isDestructive={true}
        onConfirm={() => {
          if (studentToDelete) {
            const idToDelete = studentToDelete;
            // Close modals IMMEDIATELY — don't wait for network
            setStudentToDelete(null);
            setShowModal(false);
            setEditingStudent(null);
            // Fire-and-forget: deleteStudent already does optimistic UI removal
            onDeleteStudent(idToDelete);
          }
        }}
        onCancel={() => setStudentToDelete(null)}
      />
    </div>
  );
};

export default StudentList;
