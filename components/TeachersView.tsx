import React, { useMemo, useState } from 'react';
import { Teacher, ClassSession } from '../types';

interface TeachersViewProps {
  teachers: Teacher[];
  sessions: ClassSession[];
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  onUpdateTeacher: (id: string, updates: Partial<Teacher>) => void;
  onDeleteTeacher: (id: string) => void;
}

const TeachersView: React.FC<TeachersViewProps> = ({ teachers, sessions, onAddTeacher, onUpdateTeacher, onDeleteTeacher }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({
    name: '',
    surname: '',
    specialty: '',
    email: '',
    phone: '',
    notes: ''
  });

  const filteredTeachers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter(t => {
      const full = `${t.name} ${t.surname || ''}`.toLowerCase();
      return full.includes(query) || (t.specialty || '').toLowerCase().includes(query);
    });
  }, [teachers, searchQuery]);

  const completedSessions = useMemo(
    () => sessions.filter(s => !!s.completedAt),
    [sessions]
  );

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Sin profesor';
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return 'Sin profesor';
    return `${teacher.name} ${teacher.surname || ''}`.trim();
  };

  const formatSessionDate = (dateValue: string) => {
    const parts = dateValue.split('-').map(Number);
    if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
      const [year, month, day] = parts;
      return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
    return new Date(dateValue).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const handleOpenNew = () => {
    setEditingTeacher(null);
    setForm({ name: '', surname: '', specialty: '', email: '', phone: '', notes: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm({
      name: teacher.name,
      surname: teacher.surname || '',
      specialty: teacher.specialty || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      notes: teacher.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('ERROR: El nombre es obligatorio.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      surname: form.surname.trim() || undefined,
      specialty: form.specialty.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined
    };
    if (editingTeacher) onUpdateTeacher(editingTeacher.id, payload);
    else onAddTeacher(payload);
    setShowModal(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-base px-6 py-4">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="BUSCAR PROFESOR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white px-5 py-3 rounded-full text-[12px] font-extrabold uppercase outline-none border border-neutral-border shadow-sm"
          />
        </div>
        <button
          onClick={handleOpenNew}
          className="px-6 py-3 bg-brand text-white rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest soft-shadow hover:bg-brand-hover active:scale-95 transition-all"
        >
          Nuevo profesor
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTeachers.map(teacher => {
            const fullName = `${teacher.name} ${teacher.surname || ''}`.trim();
            const completedCount = completedSessions.filter(s => s.teacherId === teacher.id || s.teacherSubstituteId === teacher.id).length;
            return (
              <div key={teacher.id} className="bg-white p-6 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col gap-4">
                <div>
                  <p className="text-[16px] font-extrabold text-neutral-textMain uppercase tracking-tight">{fullName}</p>
                  <p className="text-[11px] font-light text-neutral-textHelper uppercase tracking-widest mt-1">
                    {teacher.specialty || 'Sin especialidad'}
                  </p>
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper">
                  Clases concluidas: {completedCount}
                </div>
                {(teacher.email || teacher.phone) && (
                  <div className="text-[11px] font-light text-neutral-textSec space-y-1">
                    {teacher.email && <p>{teacher.email}</p>}
                    {teacher.phone && <p>{teacher.phone}</p>}
                  </div>
                )}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleOpenEdit(teacher)}
                    className="flex-1 py-2 bg-neutral-textMain text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar este profesor?')) onDeleteTeacher(teacher.id); }}
                    className="px-4 py-2 bg-red-50 text-red-400 rounded-xl text-[10px] font-extrabold uppercase tracking-widest"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="pt-4 mt-2 border-t border-neutral-border">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-textHelper mb-2">Historial de clases concluidas</p>
                  <div className="space-y-2">
                    {completedSessions
                      .filter(s => s.teacherId === teacher.id || s.teacherSubstituteId === teacher.id)
                      .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
                      .slice(0, 3)
                      .map(s => {
                        const isSub = s.teacherSubstituteId === teacher.id;
                        return (
                          <div key={s.id} className="bg-neutral-sec/60 p-3 rounded-xl border border-neutral-border">
                            <p className="text-[11px] font-extrabold text-neutral-textMain uppercase tracking-tight">
                              {formatSessionDate(s.date)} · {s.startTime} - {s.endTime}
                            </p>
                            <p className="text-[9px] font-light text-neutral-textHelper uppercase tracking-widest mt-1">
                              {s.classType.toUpperCase()} · {s.students.length} alumnos
                            </p>
                            {isSub && (
                              <p className="text-[9px] font-extrabold uppercase tracking-widest text-brand mt-1">
                                Reemplazo de {getTeacherName(s.teacherId)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    {completedSessions.filter(s => s.teacherId === teacher.id || s.teacherSubstituteId === teacher.id).length === 0 && (
                      <div className="py-4 text-center border border-dashed border-neutral-border rounded-xl text-[9px] font-light uppercase tracking-widest text-neutral-textHelper">
                        Sin clases concluidas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTeachers.length === 0 && (
            <div className="col-span-full py-16 text-center opacity-40 border-2 border-dashed border-neutral-border rounded-[2rem]">
              <p className="text-[12px] font-bold uppercase tracking-[0.2em]">No hay profesores</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10 soft-shadow relative animate-fade-in border border-neutral-border max-h-[85dvh] overflow-y-auto custom-scrollbar">
            <h3 className="text-[22px] md:text-[26px] font-extrabold text-neutral-textMain uppercase tracking-tight mb-6">
              {editingTeacher ? 'Editar profesor' : 'Nuevo profesor'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre"
                  className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                />
                <input
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                  placeholder="Apellido"
                  className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                />
              </div>
              <input
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="Especialidad"
                className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email"
                  className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Teléfono"
                  className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                />
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas"
                className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light min-h-[120px] resize-none"
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-4 bg-brand text-white rounded-2xl font-extrabold uppercase tracking-widest text-[12px] soft-shadow"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-4 bg-neutral-alt text-neutral-textSec rounded-2xl font-extrabold uppercase tracking-widest text-[12px]"
                >
                  Cancelar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersView;
