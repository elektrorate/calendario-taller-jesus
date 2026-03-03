import React, { useState, useMemo } from 'react';
import { ClassSession, Student, Teacher } from '../types';
import { ConfirmModal } from './shared/ConfirmModal';
interface CalendarViewProps {
  sessions: ClassSession[];
  onAddSession: (session: Omit<ClassSession, 'id'>) => Promise<void>;
  onUpdateSession: (id: string, updates: Partial<ClassSession>) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  students: Student[];
  teachers: Teacher[];
}

type CalendarMode = 'day' | 'month';

const CalendarView: React.FC<CalendarViewProps> = ({ sessions, onAddSession, onUpdateSession, onDeleteSession, onUpdateStudent, students, teachers }) => {
  const [viewMode, setViewMode] = useState<CalendarMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modales separados
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<ClassSession | null>(null);
  const [substituteId, setSubstituteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const HOUR_HEIGHT = 140;

  const [sessionForm, setSessionForm] = useState({
    date: '',
    startTime: '10:00',
    endTime: '12:00',
    classType: 'mesa' as ClassSession['classType'],
    selectedStudents: [] as string[],
    teacherId: '',
    workshopName: '',
    privateReason: '',
    sessionAudience: 'membresia' as 'membresia' | 'temporal' | 'ambos'
  });

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Sin profesor';
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return 'Sin profesor';
    return `${teacher.name} ${teacher.surname || ''}`.trim();
  };

  const getTeacherSpecialty = (teacherId?: string) => {
    if (!teacherId) return '';
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.specialty || '';
  };

  const getSessionLabel = (session: ClassSession) => {
    const map: Record<ClassSession['classType'], string> = {
      mesa: 'Mesa',
      torno: 'Torno',
      coworking: 'Coworking',
      workshop: 'Workshop',
      privada: 'Privadas',
      feriado: 'Feriados'
    };
    return map[session.classType];
  };

  const requiresTeacher = (type: ClassSession['classType']) => type === 'mesa';
  const requiresWorkshopName = (type: ClassSession['classType']) => type === 'workshop';
  const requiresPrivateReason = (type: ClassSession['classType']) => type === 'privada';

  const getSessionBadgeClasses = (type: ClassSession['classType']) => {
    switch (type) {
      case 'torno':
        return 'bg-neutral-textMain';
      case 'coworking':
        return 'bg-green-500';
      case 'workshop':
        return 'bg-brand';
      case 'privada':
        return 'bg-orange-500';
      case 'feriado':
        return 'bg-neutral-textHelper';
      default:
        return 'bg-brand';
    }
  };

  // Abrir modal de Edición/Creación de Sesión
  const handleOpenSessionModal = (session?: ClassSession) => {
    setStudentSearchQuery(''); // Limpiar búsqueda al abrir modal
    if (session) {
      setEditingSessionId(session.id);
      setSessionForm({
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        classType: session.classType,
        selectedStudents: [...session.students],
        teacherId: session.teacherId || '',
        workshopName: session.workshopName || '',
        privateReason: session.privateReason || '',
        sessionAudience: session.sessionAudience || 'membresia'
      });
    } else {
      setEditingSessionId(null);
      setSessionForm({
        date: formatDateKey(selectedDate),
        startTime: '10:00',
        endTime: '12:00',
        classType: 'mesa',
        selectedStudents: [],
        teacherId: '',
        workshopName: '',
        privateReason: '',
        sessionAudience: 'membresia'
      });
    }
    setShowSessionModal(true);
  };

  // Abrir modal de Control de Asistencia (Nueva funcionalidad separada)
  const handleOpenAttendanceModal = (session: ClassSession) => {
    setAttendanceSession(session);
    setSubstituteId(session.teacherSubstituteId || '');
    setShowAttendanceModal(true);
  };

  const finalizeAttendance = async () => {
    if (!attendanceSession) return;
    if (attendanceSession.completedAt) {
      alert('Esta sesión ya fue finalizada.');
      return;
    }

    const finalAttendance = attendanceSession.attendance || {};

    // Check for membership students with 0 bonos
    const presentStudentNames = Object.entries(finalAttendance)
      .filter(([, status]) => status === 'present')
      .map(([name]) => name);

    const studentsWithNoBonos = presentStudentNames.filter(studentName => {
      const student = students.find(s => {
        const fullName = `${s.name} ${s.surname || ''}`.trim().toUpperCase();
        return fullName === studentName.toUpperCase() || fullName === studentName;
      });
      return student && student.studentCategory === 'membresia' && student.classesRemaining <= 0;
    });

    if (studentsWithNoBonos.length > 0) {
      const proceed = confirm(
        `⚠️ Los siguientes alumnos no tienen bonos disponibles:\n\n${studentsWithNoBonos.join('\n')}\n\n¿Deseas continuar igualmente?`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    const completedAt = new Date().toISOString();

    // Close modal immediately
    setAttendanceSession(prev => prev ? { ...prev, completedAt, teacherSubstituteId: substituteId || undefined } : prev);
    setShowAttendanceModal(false);
    setIsSubmitting(false);

    // Fire Supabase operations in background
    (async () => {
      try {
        await onUpdateSession(attendanceSession.id, {
          completedAt,
          attendance: finalAttendance,
          teacherSubstituteId: substituteId || undefined
        });

        const updatePromises = presentStudentNames.map(async (studentName) => {
          const student = students.find(s => {
            const fullName = `${s.name} ${s.surname || ''}`.trim().toUpperCase();
            return fullName === studentName.toUpperCase() || fullName === studentName;
          });
          if (student && student.classesRemaining > 0 && student.studentCategory === 'membresia') {
            try {
              await onUpdateStudent(student.id, {
                classesRemaining: student.classesRemaining - 1,
                status: (student.classesRemaining - 1) <= 0 ? 'needs_renewal' : student.status
              });
            } catch (err) {
              console.error(`Error actualizando clases de ${studentName}:`, err);
            }
          }
        });

        await Promise.all(updatePromises);
      } catch (err: any) {
        console.error('Error finalizando control de asistencia:', err);
        alert(`ERROR: No se pudo finalizar el control de asistencia. ${err?.message || 'Error de conexión. Intenta de nuevo.'}`);
      }
    })();
  };

  // ★ handleMarkAttendance: ONLY updates local state, does NOT call API
  // The actual save happens in finalizeAttendance to prevent race conditions
  const handleMarkAttendance = (studentName: string, status: 'present' | 'absent' | 'pending') => {
    if (!attendanceSession) return;

    const currentAttendance = { ...(attendanceSession.attendance || {}) };

    if (status === 'pending') {
      delete currentAttendance[studentName];
    } else {
      currentAttendance[studentName] = status;
    }

    const updatedSession = { ...attendanceSession, attendance: currentAttendance };
    setAttendanceSession(updatedSession); // Local state only — saved on finalize
  };

  const handleSessionSubmit = async () => {
    if (isSubmitting) return;
    if (!sessionForm.date) {
      alert("ERROR: Selecciona un día en el calendario antes de guardar.");
      return;
    }
    if (requiresTeacher(sessionForm.classType) && !sessionForm.teacherId) {
      alert("ERROR: Debes asignar un profesor.");
      return;
    }
    if (requiresWorkshopName(sessionForm.classType) && !sessionForm.workshopName.trim()) {
      alert("ERROR: Debes indicar el nombre del workshop.");
      return;
    }
    if (requiresPrivateReason(sessionForm.classType) && !sessionForm.privateReason.trim()) {
      alert("ERROR: Debes indicar el motivo de la sesion privada.");
      return;
    }
    if (sessionForm.startTime >= sessionForm.endTime) {
      alert("ERROR: La hora de inicio debe ser anterior a la hora de fin.");
      return;
    }
    const duplicate = sessions.some(s => {
      if (editingSessionId && s.id === editingSessionId) return false;
      return s.date === sessionForm.date
        && s.startTime === sessionForm.startTime
        && s.endTime === sessionForm.endTime
        && s.classType === sessionForm.classType;
    });
    if (duplicate) {
      alert("ERROR: Ya existe una sesión con el mismo horario y tipo.");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      date: sessionForm.date,
      startTime: sessionForm.startTime,
      endTime: sessionForm.endTime,
      classType: sessionForm.classType,
      students: sessionForm.classType === 'feriado' ? [] : sessionForm.selectedStudents,
      teacherId: sessionForm.teacherId || undefined,
      workshopName: sessionForm.workshopName.trim() || undefined,
      privateReason: sessionForm.privateReason.trim() || undefined,
      sessionAudience: sessionForm.sessionAudience
    };
    // Close modal immediately — Supabase operations run in background
    setShowSessionModal(false);
    setIsSubmitting(false);
    if (editingSessionId) {
      onUpdateSession(editingSessionId, payload);
    } else {
      onAddSession(payload);
    }
  };

  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = startOffset - 1; i >= 0; i--) days.push({ date: new Date(year, month, 1 - i - 1), currentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i), currentMonth: true });
    while (days.length < 42) days.push({ date: new Date(year, month, daysInMonth + days.length - (daysInMonth + startOffset) + 1), currentMonth: false });
    return days;
  }, [selectedDate]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    sessions.forEach(session => {
      if (!map[session.date]) map[session.date] = [];
      map[session.date].push(session);
    });
    return map;
  }, [sessions]);

  const renderDayView = () => {
    const dateKey = formatDateKey(selectedDate);
    const daySessions = sessions.filter(s => s.date === dateKey);
    const dayLabel = selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const dayTitle = `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)}`;

    let startHour = 8;
    let endHour = 22;
    if (daySessions.length > 0) {
      const hoursInDay = daySessions.map(s => parseInt(s.startTime.split(':')[0]));
      const endHoursInDay = daySessions.map(s => {
        const parts = s.endTime.split(':');
        const h = parseInt(parts[0]);
        return parseInt(parts[1]) > 0 ? h + 1 : h;
      });
      startHour = Math.min(...hoursInDay);
      endHour = Math.max(...endHoursInDay, startHour + 6);
      if (endHour > 24) endHour = 24;
    }

    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);
    const sortedSessions = [...daySessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const sessionsByTime: Record<string, ClassSession[]> = {};
    sortedSessions.forEach(s => {
      if (!sessionsByTime[s.startTime]) sessionsByTime[s.startTime] = [];
      sessionsByTime[s.startTime].push(s);
    });

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 md:px-10 pt-4 pb-3">
          <h3 className="text-[20px] md:text-[26px] font-semibold text-neutral-textMain tracking-tight">{dayTitle}</h3>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex bg-[#EDE7DF] p-1 rounded-full border border-[#E4DDD4] w-full md:w-auto">
              <button onClick={() => setViewMode('day')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white text-neutral-textMain shadow-sm' : 'text-neutral-textHelper'}`}>DIA</button>
              <button onClick={() => setViewMode('month')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-white text-neutral-textMain shadow-sm' : 'text-neutral-textHelper'}`}>MES</button>
            </div>
            <button onClick={() => handleOpenSessionModal()} className="px-5 py-2.5 md:px-7 bg-[#B7A67B] text-white rounded-full text-[11px] font-semibold uppercase tracking-widest shadow-sm hover:brightness-95 active:scale-95 transition-all">NUEVA SESION</button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 md:px-10 mb-5 overflow-x-auto pb-2 no-scrollbar shrink-0">
          <div className="w-9 h-9 rounded-xl border border-neutral-border/30 bg-white flex items-center justify-center text-neutral-textHelper">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          {weekDays.map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const dName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(new Date(date))}
                className={`flex flex-col items-center min-w-[82px] md:min-w-[96px] px-4 py-3 rounded-2xl transition-all border ${isSelected ? 'bg-[#B7A67B] border-[#B7A67B] text-white shadow-md' : 'bg-white border-neutral-border/40 text-neutral-textMain hover:border-neutral-border/70'}`}
              >
                <span className={`text-[10px] font-semibold capitalize mb-1 ${isSelected ? 'text-white/80' : 'text-neutral-textHelper'}`}>{dName}</span>
                <span className={`text-[20px] md:text-[22px] font-semibold leading-none ${isSelected ? 'text-white' : 'text-neutral-textMain'}`}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 overflow-hidden bg-[#F4F1ED] border-t border-neutral-border/30">
          <div className="h-full overflow-y-auto custom-scrollbar px-6 md:px-10 pt-4 pb-32">
            <div className="relative pl-20" style={{ minHeight: `${hours.length * HOUR_HEIGHT}px` }}>
              {hours.map((hour) => (
                <div key={hour} className="relative flex items-start border-t border-neutral-border/30 h-[140px]">
                  <span className="-ml-20 w-20 text-left text-[11px] font-medium text-neutral-textHelper -mt-2 uppercase tracking-wider">{hour === 24 ? '00' : hour}:00</span>
                </div>
              ))}

              {Object.keys(sessionsByTime).map(startTime => {
                const concurrentSessions = sessionsByTime[startTime];
                const widthPercent = 100 / concurrentSessions.length;
                return concurrentSessions.map((session, index) => {
                  const [startH, startM] = session.startTime.split(':').map(Number);
                  const topOffset = ((startH * 60 + startM - startHour * 60) / 60) * HOUR_HEIGHT;
                  const leftOffset = index * widthPercent;
                  return (
                    <div
                      key={session.id}
                      className="absolute rounded-[2rem] bg-white shadow-md border border-neutral-border/30 transition-all z-10 p-6 md:p-7 flex flex-col items-start overflow-hidden group cursor-pointer"
                      style={{ top: `${topOffset}px`, left: `calc(${leftOffset}% + 80px)`, width: `calc(${widthPercent}% - 92px)`, minHeight: '190px' }}
                      onClick={() => handleOpenSessionModal(session)}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start w-full mb-4 gap-2">
                        <span className="text-[16px] md:text-[18px] font-semibold text-neutral-textMain leading-none">{session.startTime} - {session.endTime}</span>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.2em] text-white ${getSessionBadgeClasses(session.classType)}`}>{getSessionLabel(session).toUpperCase()}</span>
                      </div>
                      <div className="text-[11px] font-medium text-neutral-textHelper uppercase tracking-widest mb-4">
                        <span>Profesor/a: </span>
                        <span className="text-[#B07D4E] font-semibold">{getTeacherName(session.teacherId)}</span>
                        {getTeacherSpecialty(session.teacherId) && (
                          <span className="block text-[10px] font-medium text-neutral-textSec uppercase tracking-widest mt-1">
                            {getTeacherSpecialty(session.teacherId)}
                          </span>
                        )}
                        {session.classType === 'workshop' && session.workshopName && (
                          <span className="block text-[10px] font-medium text-neutral-textSec uppercase tracking-widest mt-1">
                            {session.workshopName}
                          </span>
                        )}
                        {session.classType === 'privada' && session.privateReason && (
                          <span className="block text-[10px] font-medium text-neutral-textSec uppercase tracking-widest mt-1">
                            {session.privateReason}
                          </span>
                        )}
                        {session.classType === 'feriado' && (
                          <span className="block text-[10px] font-medium text-neutral-textSec uppercase tracking-widest mt-1">
                            Vacaciones
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 w-full flex-1 mb-10 overflow-hidden">
                        {session.students.map((studentName, idx) => {
                          const att = session.attendance?.[studentName];
                          // Buscar el alumno para obtener su categoría
                          const studentObj = students.find(st => {
                            const fullName = `${st.name} ${st.surname || ''}`.trim().toUpperCase();
                            return fullName === studentName.toUpperCase() || st.name.toUpperCase() === studentName.toUpperCase();
                          });
                          const cat = studentObj?.studentCategory || 'membresia';
                          const isTemporary = cat === 'temporal';
                          // Color de bolita: presente=verde, ausente=rojo, pendiente=según categoría
                          const dotColor = att === 'absent'
                            ? 'bg-red-500'
                            : att === 'present'
                              ? 'bg-green-500'
                              : isTemporary
                                ? 'bg-amber-500'
                                : 'bg-[#C88B6A]';
                          return (
                            <div key={idx} className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}></div>
                              <span className={`text-[12px] md:text-[13px] font-medium truncate ${att === 'absent' ? 'text-red-400 line-through opacity-60' : (att === 'present' ? 'text-green-600' : 'text-neutral-textMain')}`}>{studentName.toLowerCase()}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* BotÇün Control de Asistencia EspecÇðfico */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenAttendanceModal(session); }}
                        className="absolute bottom-4 right-4 w-10 h-10 bg-white border border-neutral-border/40 rounded-full flex items-center justify-center text-neutral-textMain shadow-sm hover:shadow-md transition-all z-20"
                        title="Control de Asistencia"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      </button>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F6F1EC]">
      {viewMode === 'day' ? renderDayView() : (
        <div className="flex-1 bg-white rounded-t-[2.5rem] md:rounded-t-[3rem] border-x border-t border-neutral-border p-4 md:p-8 flex flex-col items-center overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-4xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="text-[18px] md:text-[22px] font-semibold text-neutral-textMain tracking-tight">
              Calendario mensual
            </h3>
            <div className="flex items-center gap-3 md:gap-6">
              <div className="flex bg-[#EDE7DF] p-1 rounded-full border border-[#E4DDD4] w-full md:w-auto">
                <button onClick={() => setViewMode('day')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white text-neutral-textMain shadow-sm' : 'text-neutral-textHelper'}`}>DIA</button>
                <button onClick={() => setViewMode('month')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-white text-neutral-textMain shadow-sm' : 'text-neutral-textHelper'}`}>MES</button>
              </div>
              <button onClick={() => handleOpenSessionModal()} className="px-5 py-2.5 md:px-7 bg-[#B7A67B] text-white rounded-full text-[11px] font-semibold uppercase tracking-widest shadow-sm hover:brightness-95 active:scale-95 transition-all">NUEVA SESION</button>
            </div>
          </div>
          <div className="w-full max-w-md flex justify-between items-center mb-8">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-2 text-neutral-customGray hover:text-brand"><svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg></button>
            <h3 className="text-[16px] md:text-lg font-extrabold text-neutral-textMain uppercase tracking-widest">{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-2 text-neutral-customGray hover:text-brand"><svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg></button>
          </div>
          <div className="w-full max-w-4xl grid grid-cols-7 gap-1.5 md:gap-3">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d} className="text-center text-[10px] md:text-[11px] font-extrabold text-neutral-textHelper uppercase mb-1">{d}</div>)}
            {monthDays.map((item, i) => {
              const isSelected = item.date.toDateString() === selectedDate.toDateString();
              const dayKey = formatDateKey(item.date);
              const daySessions = sessionsByDate[dayKey] || [];
              const activeSessions = daySessions.filter(s => s.classType !== 'feriado');
              return (
                <div key={i} onClick={() => { setSelectedDate(item.date); setViewMode('day'); }} className={`aspect-square rounded-xl md:rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border ${!item.currentMonth ? 'opacity-10' : 'opacity-100'} ${isSelected ? 'bg-brand text-white border-brand' : 'bg-neutral-sec/50 border-neutral-border hover:bg-white'}`}>
                  <span className="text-[14px] md:text-lg font-extrabold">{item.date.getDate()}</span>
                  {activeSessions.length > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      {activeSessions.slice(0, 3).map((session, idx) => (
                        <span key={`${session.id}-${idx}`} className={`w-2 h-2 rounded-full ${getSessionBadgeClasses(session.classType)}`}></span>
                      ))}
                      {activeSessions.length > 3 && (
                        <span className="text-[9px] font-extrabold text-neutral-textHelper">+{activeSessions.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE CONTROL DE ASISTENCIA (EXCLUSIVO) */}
      {showAttendanceModal && attendanceSession && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={(e) => {
            // Cerrar al hacer click en el backdrop (fuera del modal)
            if (e.target === e.currentTarget && !isSubmitting) {
              setShowAttendanceModal(false);
            }
          }}
        >
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 md:p-12 soft-shadow relative animate-fade-in border border-neutral-border flex flex-col max-h-[85dvh]">
            {/* Botón X para cerrar */}
            <button
              onClick={() => setShowAttendanceModal(false)}
              disabled={isSubmitting}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-sec/80 hover:bg-neutral-sec flex items-center justify-center text-neutral-textHelper hover:text-neutral-textMain transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mb-8">
              <span className="text-[10px] font-extrabold text-brand uppercase tracking-[0.2em] mb-2 block">CHECK-IN DIARIO</span>
              <h3 className="text-[24px] md:text-[28px] font-black text-neutral-textMain uppercase tracking-tight leading-none">Control Asistencia</h3>
              {/* Indicador visual de sesión ya completada */}
              {attendanceSession.completedAt && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-[11px] font-extrabold text-green-600 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    SESIÓN YA FINALIZADA
                  </p>
                  <p className="text-[10px] text-green-500 mt-1">
                    Completada el {new Date(attendanceSession.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              <p className="text-[13px] font-light text-neutral-textHelper mt-4 uppercase tracking-widest">
                {formatSessionDate(attendanceSession.date)} <br />
                <span className="text-neutral-textSec font-bold">{attendanceSession.startTime} - {attendanceSession.endTime} • {getSessionLabel(attendanceSession).toUpperCase()}</span>
              </p>
              <p className="text-[11px] font-light text-neutral-textHelper uppercase tracking-widest mt-2">
                {getTeacherName(attendanceSession.teacherId)}
              </p>
              {attendanceSession.classType === 'workshop' && attendanceSession.workshopName && (
                <p className="text-[11px] font-light text-neutral-textHelper uppercase tracking-widest mt-2">
                  {attendanceSession.workshopName}
                </p>
              )}
              {attendanceSession.classType === 'privada' && attendanceSession.privateReason && (
                <p className="text-[11px] font-light text-neutral-textHelper uppercase tracking-widest mt-2">
                  {attendanceSession.privateReason}
                </p>
              )}
              {attendanceSession.classType === 'feriado' && (
                <p className="text-[11px] font-light text-neutral-textHelper uppercase tracking-widest mt-2">
                  Vacaciones
                </p>
              )}
              <div className="mt-4">
                <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-2">Reemplazo</label>
                <select
                  value={substituteId}
                  onChange={(e) => setSubstituteId(e.target.value)}
                  disabled={!!attendanceSession.completedAt}
                  className="w-full px-4 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[13px] font-light appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Sin reemplazo</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{`${t.name} ${t.surname || ''}`.trim()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {attendanceSession.students.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-neutral-border rounded-[2rem]">
                  <p className="text-[13px] font-light text-neutral-textHelper uppercase tracking-widest italic">No hay alumnos asignados</p>
                </div>
              ) : (
                attendanceSession.students.map((studentName, idx) => {
                  const status = attendanceSession.attendance?.[studentName] || 'pending';
                  // Find student object to show bonos info
                  const studentObj = students.find(s => {
                    const fullName = `${s.name} ${s.surname || ''}`.trim().toUpperCase();
                    return fullName === studentName.toUpperCase() || fullName === studentName;
                  });
                  const isMembership = studentObj?.studentCategory === 'membresia';
                  const bonos = studentObj?.classesRemaining ?? 0;
                  const bonosTotal = studentObj?.bonosAsignados ?? 4;
                  return (
                    <div key={idx} className="bg-neutral-sec/50 p-5 rounded-[2rem] border border-neutral-border flex items-center justify-between group transition-all">
                      <div className="flex flex-col overflow-hidden mr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-[16px] font-black text-neutral-textMain uppercase tracking-tight truncate">{studentName.toLowerCase()}</p>
                          {isMembership && (
                            <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${bonos <= 0 ? 'bg-red-50 text-red-500 border-red-200'
                              : bonos <= Math.ceil(bonosTotal * 0.25) ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-green-50 text-green-600 border-green-200'
                              }`}>
                              {bonos}/{bonosTotal}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-1 ${status === 'present' ? 'text-green-500' : status === 'absent' ? 'text-red-400' : 'text-neutral-textHelper'}`}>
                          {status === 'present' ? 'Asiste' : status === 'absent' ? 'No asiste' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {/* Botones deshabilitados si la sesión ya fue finalizada */}
                        <button
                          onClick={() => handleMarkAttendance(studentName, 'present')}
                          disabled={!!attendanceSession.completedAt}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${status === 'present' ? 'bg-green-500 text-white scale-110' : 'bg-white text-neutral-textHelper hover:bg-green-100 hover:text-green-600 disabled:hover:bg-white disabled:hover:text-neutral-textHelper'}`}
                          title={attendanceSession.completedAt ? "Sesión ya finalizada" : "Marcar Asistencia"}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(studentName, 'absent')}
                          disabled={!!attendanceSession.completedAt}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${status === 'absent' ? 'bg-red-400 text-white scale-110' : 'bg-white text-neutral-textHelper hover:bg-red-100 hover:text-red-400 disabled:hover:bg-white disabled:hover:text-neutral-textHelper'}`}
                          title={attendanceSession.completedAt ? "Sesión ya finalizada" : "Marcar Falta"}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        {status !== 'pending' && !attendanceSession.completedAt && (
                          <button
                            onClick={() => handleMarkAttendance(studentName, 'pending')}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white text-neutral-textHelper hover:text-brand transition-all shadow-sm"
                            title="Resetear Estado"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-8 shrink-0">
              {attendanceSession.completedAt ? (
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="w-full py-6 bg-neutral-textHelper text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[14px] hover:bg-neutral-textMain active:scale-[0.98] transition-all soft-shadow"
                >
                  CERRAR
                </button>
              ) : (
                <button
                  onClick={finalizeAttendance}
                  disabled={isSubmitting}
                  className="w-full py-6 bg-neutral-textMain text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[14px] hover:bg-black active:scale-[0.98] transition-all soft-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'GUARDANDO...' : 'FINALIZAR CONTROL'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE SESIÓN (SOLO CONFIGURACIÓN) */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 soft-shadow relative animate-fade-in border border-neutral-border flex flex-col max-h-[90dvh]">
            <h3 className="text-[24px] md:text-[28px] font-extrabold text-neutral-textMain uppercase tracking-tight">{editingSessionId ? 'Editar Sesión' : 'Nueva Sesión'}</h3>
            <p className="text-[12px] font-light text-neutral-textHelper uppercase tracking-widest mt-2 mb-6 md:mb-8">
              {sessionForm.date ? formatSessionDate(sessionForm.date) : 'Fecha no seleccionada'}
            </p>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-2">INICIO</label>
                  <input type="time" value={sessionForm.startTime} onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })} disabled={sessionForm.classType === 'feriado'} className={`w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl font-extrabold text-[16px] md:text-[18px] ${sessionForm.classType === 'feriado' ? 'opacity-60 cursor-not-allowed' : ''}`} />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-2">FIN</label>
                  <input type="time" value={sessionForm.endTime} onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })} disabled={sessionForm.classType === 'feriado'} className={`w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl font-extrabold text-[16px] md:text-[18px] ${sessionForm.classType === 'feriado' ? 'opacity-60 cursor-not-allowed' : ''}`} />
                </div>
              </div>
              {sessionForm.classType === 'feriado' && (
                <p className="text-[11px] font-light text-neutral-textHelper uppercase tracking-widest">
                  Dia bloqueado por feriado (00:00 - 24:00).
                </p>
              )}
              <div>
                <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-3">TIPO</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'mesa', label: 'Mesa' },
                    { id: 'torno', label: 'Torno' },
                    { id: 'coworking', label: 'Coworking' },
                    { id: 'workshop', label: 'Workshop' },
                    { id: 'privada', label: 'Privadas' },
                    { id: 'feriado', label: 'Feriados' }
                  ] as { id: ClassSession['classType']; label: string }[]).map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSessionForm({
                        ...sessionForm,
                        classType: option.id,
                        teacherId: (option.id === 'mesa' || option.id === 'torno') ? sessionForm.teacherId : '',
                        workshopName: option.id === 'workshop' ? sessionForm.workshopName : '',
                        privateReason: option.id === 'privada' ? sessionForm.privateReason : '',
                        selectedStudents: option.id === 'feriado' ? [] : sessionForm.selectedStudents,
                        startTime: option.id === 'feriado' ? '00:00' : sessionForm.startTime,
                        endTime: option.id === 'feriado' ? '24:00' : sessionForm.endTime
                      })}
                      className={`py-4 rounded-xl font-extrabold text-[12px] md:text-[13px] uppercase tracking-widest border transition-all ${sessionForm.classType === option.id ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-textHelper'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {(sessionForm.classType === 'mesa' || sessionForm.classType === 'torno') && (
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-3">
                    PROFESOR {sessionForm.classType === 'mesa' ? '(OBLIGATORIO)' : '(OPCIONAL)'}
                  </label>
                  <select
                    value={sessionForm.teacherId}
                    onChange={(e) => setSessionForm({ ...sessionForm, teacherId: e.target.value })}
                    className="w-full px-5 py-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light appearance-none"
                  >
                    <option value="">Sin asignar</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{`${t.name} ${t.surname || ''}`.trim()}</option>
                    ))}
                  </select>
                </div>
              )}
              {sessionForm.classType === 'workshop' && (
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-3">NOMBRE DEL WORKSHOP</label>
                  <input
                    value={sessionForm.workshopName}
                    onChange={(e) => setSessionForm({ ...sessionForm, workshopName: e.target.value })}
                    className="w-full px-5 py-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                    placeholder="Nombre del workshop"
                  />
                </div>
              )}
              {sessionForm.classType === 'privada' && (
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-3">MOTIVO</label>
                  <input
                    value={sessionForm.privateReason}
                    onChange={(e) => setSessionForm({ ...sessionForm, privateReason: e.target.value })}
                    className="w-full px-5 py-4 bg-neutral-sec border border-neutral-border rounded-xl text-[14px] font-light"
                    placeholder="Motivo de la sesion"
                  />
                </div>
              )}
              {sessionForm.classType !== 'feriado' && (
                <div className="space-y-4">
                  {/* Selector de audiencia */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-3">TIPO DE ALUMNOS</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { setSessionForm({ ...sessionForm, sessionAudience: 'membresia' }); setStudentSearchQuery(''); }}
                        className={`py-3 rounded-xl font-extrabold text-[10px] uppercase tracking-widest border transition-all ${sessionForm.sessionAudience === 'membresia' ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-textHelper border-neutral-border'}`}
                      >
                        Membresía
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSessionForm({ ...sessionForm, sessionAudience: 'temporal' }); setStudentSearchQuery(''); }}
                        className={`py-3 rounded-xl font-extrabold text-[10px] uppercase tracking-widest border transition-all ${sessionForm.sessionAudience === 'temporal' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-neutral-textHelper border-neutral-border'}`}
                      >
                        Temporales
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSessionForm({ ...sessionForm, sessionAudience: 'ambos' }); setStudentSearchQuery(''); }}
                        className={`py-3 rounded-xl font-extrabold text-[10px] uppercase tracking-widest border transition-all ${sessionForm.sessionAudience === 'ambos' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-neutral-textHelper border-neutral-border'}`}
                      >
                        Ambos
                      </button>
                    </div>
                  </div>
                  {/* Lista de alumnos filtrada por audiencia */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-3">
                      ALUMNOS ASIGNADOS ({sessionForm.sessionAudience === 'membresia' ? 'MEMBRESÍA' : sessionForm.sessionAudience === 'temporal' ? 'TEMPORALES' : 'TODOS'})
                    </label>
                    {/* Buscador de alumnos */}
                    <input
                      type="text"
                      placeholder="Buscar alumno por nombre o grupo..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full px-4 py-2.5 mb-3 bg-neutral-sec border border-neutral-border rounded-xl text-[11px] font-medium focus:border-brand outline-none transition-all"
                    />
                    <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                      {(() => {
                        const filtered = students
                          .filter(s => {
                            const cat = s.studentCategory || 'membresia';
                            // Filtro por audiencia - 'ambos' muestra todos los tipos
                            const matchesAudience = sessionForm.sessionAudience === 'ambos'
                              ? true
                              : sessionForm.sessionAudience === 'membresia'
                                ? (cat === 'membresia')
                                : (cat === 'temporal');
                            // Filtro por búsqueda
                            const fullName = `${s.name} ${s.surname || ''}`.trim().toLowerCase();
                            const groupName = (s.groupName || '').toLowerCase();
                            const query = studentSearchQuery.trim().toLowerCase();
                            const matchesSearch = !query || fullName.includes(query) || groupName.includes(query);
                            return matchesAudience && matchesSearch;
                          });

                        if (filtered.length === 0) {
                          return <p className="text-[11px] text-neutral-textHelper italic py-4">
                            {studentSearchQuery ? 'No se encontraron alumnos con ese nombre' : 'No hay alumnos en esta categoría'}
                          </p>;
                        }

                        return filtered.map(s => {
                          const fullName = `${s.name} ${s.surname || ''}`.trim();
                          const studentKey = fullName.toUpperCase();
                          const isSelected = sessionForm.selectedStudents.includes(studentKey);
                          const cat = s.studentCategory || 'membresia';
                          const isTemporary = cat === 'temporal';
                          return (
                            <button key={s.id} onClick={() => {
                              const newList = isSelected
                                ? sessionForm.selectedStudents.filter(n => n !== studentKey)
                                : [...sessionForm.selectedStudents, studentKey];
                              setSessionForm({ ...sessionForm, selectedStudents: newList });
                            }} className={`px-3 py-2 rounded-lg text-[10px] font-extrabold uppercase border transition-all ${isSelected ? (isTemporary ? 'bg-amber-500 text-white border-amber-500' : 'bg-brand text-white border-brand') : 'bg-white text-neutral-textHelper border-neutral-border'}`}>
                              {fullName}
                              {s.groupName && <span className="ml-1 opacity-70">({s.groupName})</span>}
                            </button>
                          );
                        });
                      })()}
                    </div>
                    {/* Mostrar alumnos seleccionados */}
                    {sessionForm.selectedStudents.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-border">
                        <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase mb-2">
                          SELECCIONADOS ({sessionForm.selectedStudents.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {sessionForm.selectedStudents.map(name => {
                            // Determinar el color basado en la categoría del estudiante
                            const studentObj = students.find(st => {
                              const fullName = `${st.name} ${st.surname || ''}`.trim().toUpperCase();
                              return fullName === name.toUpperCase() || st.name.toUpperCase() === name.toUpperCase();
                            });
                            const cat = studentObj?.studentCategory || 'membresia';
                            const isTemporary = cat === 'temporal';
                            return (
                              <span key={name} className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${isTemporary ? 'bg-amber-100 text-amber-700' : 'bg-brand/10 text-brand'}`}>
                                {name.toLowerCase()}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="pt-8 flex gap-3 shrink-0">
              {editingSessionId && (
                <button
                  onClick={() => setSessionToDelete(editingSessionId)}
                  className="px-6 py-5 bg-red-50 text-red-400 rounded-2xl font-extrabold uppercase tracking-widest text-[11px]"
                >
                  ELIMINAR
                </button>
              )}
              <button onClick={handleSessionSubmit} disabled={isSubmitting} className="flex-1 py-5 bg-brand text-white rounded-2xl font-extrabold uppercase tracking-widest soft-shadow text-[14px] disabled:opacity-60 disabled:cursor-not-allowed">{isSubmitting ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</button>
              <button onClick={() => setShowSessionModal(false)} disabled={isSubmitting} className="px-6 py-5 bg-neutral-alt text-neutral-textSec rounded-2xl font-extrabold uppercase tracking-widest text-[11px] disabled:opacity-60">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="¿Eliminar sesión?"
        message="¿Estás seguro de que deseas eliminar esta sesión de la agenda? Esta acción no se puede deshacer."
        isDestructive={true}
        onConfirm={() => {
          if (sessionToDelete) {
            const id = sessionToDelete;
            setSessionToDelete(null);
            setShowSessionModal(false);
            onDeleteSession(id);
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};

export default CalendarView;
