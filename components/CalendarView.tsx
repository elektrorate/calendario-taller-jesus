import { showError, showWarning } from '../context/toast';
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
      showError('Esta sesión ya fue finalizada.');
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

    try {
      // Student updates share an operation lock, so they must be persisted in sequence.
      // Only present membership students consume one bonus.
      for (const studentName of presentStudentNames) {
        const student = students.find(s => {
          const fullName = `${s.name} ${s.surname || ''}`.trim().toUpperCase();
          return fullName === studentName.toUpperCase();
        });

        if (student && student.studentCategory === 'membresia' && student.classesRemaining > 0) {
          const nextClassesRemaining = student.classesRemaining - 1;
          await onUpdateStudent(student.id, {
            classesRemaining: nextClassesRemaining,
            status: nextClassesRemaining <= 0 ? 'needs_renewal' : student.status
          });
        }
      }

      await onUpdateSession(attendanceSession.id, {
        completedAt,
        attendance: finalAttendance,
        teacherSubstituteId: substituteId || undefined
      });

      setAttendanceSession(prev => prev ? { ...prev, completedAt, teacherSubstituteId: substituteId || undefined } : prev);
      setShowAttendanceModal(false);
    } catch (err: any) {
      console.error('Error finalizando control de asistencia:', err);
      showError(`No se pudo finalizar el control de asistencia. ${err?.message || 'Error de conexión. Intenta de nuevo.'}`);
    } finally {
      setIsSubmitting(false);
    }
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
      showError("Selecciona un día en el calendario antes de guardar.");
      return;
    }
    if (requiresTeacher(sessionForm.classType) && !sessionForm.teacherId) {
      showError("Debes asignar un profesor.");
      return;
    }
    if (requiresWorkshopName(sessionForm.classType) && !sessionForm.workshopName.trim()) {
      showError("Debes indicar el nombre del workshop.");
      return;
    }
    if (requiresPrivateReason(sessionForm.classType) && !sessionForm.privateReason.trim()) {
      showError("Debes indicar el motivo de la sesion privada.");
      return;
    }
    if (sessionForm.startTime >= sessionForm.endTime) {
      showError("La hora de inicio debe ser anterior a la hora de fin.");
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
      showError("Ya existe una sesión con el mismo horario y tipo.");
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
                      <div className="flex w-full flex-col items-start gap-2 pr-14 mb-4">
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
                      <div className="w-full flex-1 space-y-2 overflow-hidden">
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
                      {/* Control de asistencia */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenAttendanceModal(session); }}
                        className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/80 bg-[#C68952] text-white shadow-[0_6px_18px_rgba(123,63,34,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[#B87543] hover:shadow-[0_8px_22px_rgba(123,63,34,0.38)] focus:outline-none focus:ring-2 focus:ring-[#7B3F22] focus:ring-offset-2 active:translate-y-0"
                        title="Control de Asistencia"
                        aria-label="Abrir control de asistencia"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" /></svg>
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
          className="fixed inset-0 z-[110] flex items-end bg-[#2F1E17]/45 font-['Inter'] backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-5"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setShowAttendanceModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-modal-title"
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#FFFCF8] text-[#2F211B] shadow-[0_24px_70px_rgba(59,35,24,0.2)] sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-[24px] sm:border sm:border-[#E8D9CC] animate-fade-in"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[#E8D9CC] px-5 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))] sm:px-8 sm:py-4">
              <div className="min-w-0 pr-4 sm:flex sm:items-baseline sm:gap-4">
                <h3 id="attendance-modal-title" className="shrink-0 font-['Playfair_Display'] text-[24px] font-semibold leading-none text-[#7B3F22] sm:text-[27px]">Control de asistencia</h3>
                <p className="mt-1.5 truncate text-[11px] text-[#8B6B5E] first-letter:uppercase sm:mt-0 sm:text-[12px]">{formatSessionDate(attendanceSession.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                disabled={isSubmitting}
                aria-label="Cerrar modal"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8B6B5E] transition-colors hover:bg-[#F3E7DC] hover:text-[#7B3F22] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4 sm:px-8 sm:py-5">
              <div className="mb-5 rounded-[12px] border border-[#E8D9CC] bg-[#F8EEE5] px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[13px] font-semibold text-[#7B3F22]">{attendanceSession.startTime}–{attendanceSession.endTime}</span>
                  <span className="h-3 w-px bg-[#DDBFA4]" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-[#6E5145]">{getSessionLabel(attendanceSession)}</span>
                  <span className="text-[11px] text-[#8B6B5E]">{getTeacherName(attendanceSession.teacherId)}</span>
                  {attendanceSession.completedAt && (
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-[7px] bg-[#E7F0E8] px-2 py-1 text-[9px] font-semibold text-[#47704D]">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m5 13 4 4L19 7" /></svg>
                      Finalizada
                    </span>
                  )}
                </div>
                {(attendanceSession.workshopName || attendanceSession.privateReason || attendanceSession.classType === 'feriado') && (
                  <p className="mt-1.5 text-[11px] text-[#8B6B5E]">
                    {attendanceSession.workshopName || attendanceSession.privateReason || 'Vacaciones'}
                  </p>
                )}
                {attendanceSession.completedAt && (
                  <p className="mt-1.5 text-[10px] text-[#6B876F]">Completada el {new Date(attendanceSession.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                )}
              </div>

              <div className="mb-5">
                <label htmlFor="attendance-substitute" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B3F22]">Reemplazo</label>
                <div className="relative">
                <select
                  id="attendance-substitute"
                  value={substituteId}
                  onChange={(e) => setSubstituteId(e.target.value)}
                  disabled={!!attendanceSession.completedAt}
                  className="h-11 w-full appearance-none rounded-[10px] border border-[#DDBFA4] bg-white px-3.5 pr-10 text-[13px] text-[#2F211B] outline-none transition focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <option value="">Sin reemplazo</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{`${t.name} ${t.surname || ''}`.trim()}</option>
                  ))}
                </select>
                  <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B6B5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m7 10 5 5 5-5" /></svg>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B3F22]">Alumnos</h4>
                <span className="text-[11px] text-[#8B6B5E]">{attendanceSession.students.length} asignados</span>
              </div>

              <div className="overflow-hidden rounded-[12px] border border-[#E8D9CC] bg-white">
              {attendanceSession.students.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-[12px] text-[#8B6B5E]">No hay alumnos asignados</p>
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
                    <div key={idx} className="flex min-h-[62px] items-center justify-between gap-3 border-b border-[#EFE3D8] px-3 py-2.5 last:border-b-0 sm:px-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14px] font-medium capitalize text-[#3F2E27]">{studentName.toLowerCase()}</p>
                          {isMembership && (
                            <span className={`shrink-0 rounded-[6px] px-1.5 py-0.5 text-[9px] font-semibold ${bonos <= 0 ? 'bg-[#F7E3DF] text-[#9C4235]'
                              : bonos <= Math.ceil(bonosTotal * 0.25) ? 'bg-[#F5E8D4] text-[#916438]'
                                : 'bg-[#E7F0E8] text-[#47704D]'
                              }`}>
                              Bonos {bonos}/{bonosTotal}
                            </span>
                          )}
                        </div>
                        <span className={`mt-1 block text-[10px] font-medium ${status === 'present' ? 'text-[#47704D]' : status === 'absent' ? 'text-[#9C4235]' : 'text-[#9B8175]'}`}>
                          {status === 'present' ? 'Asiste' : status === 'absent' ? 'No asiste' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(studentName, 'present')}
                          disabled={!!attendanceSession.completedAt}
                          className={`flex h-10 w-10 items-center justify-center rounded-[9px] border transition focus:outline-none focus:ring-2 focus:ring-[#6B876F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${status === 'present' ? 'border-[#5F8065] bg-[#5F8065] text-white' : 'border-[#D8E4D9] bg-[#F4F8F4] text-[#5F8065] hover:bg-[#E7F0E8]'}`}
                          title={attendanceSession.completedAt ? "Sesión ya finalizada" : "Marcar Asistencia"}
                          aria-label={`Marcar asistencia de ${studentName}`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m5 13 4 4L19 7" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(studentName, 'absent')}
                          disabled={!!attendanceSession.completedAt}
                          className={`flex h-10 w-10 items-center justify-center rounded-[9px] border transition focus:outline-none focus:ring-2 focus:ring-[#9C4235] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${status === 'absent' ? 'border-[#9C4235] bg-[#9C4235] text-white' : 'border-[#EBCFC9] bg-[#FCF4F2] text-[#9C4235] hover:bg-[#F7E3DF]'}`}
                          title={attendanceSession.completedAt ? "Sesión ya finalizada" : "Marcar Falta"}
                          aria-label={`Marcar falta de ${studentName}`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                        {status !== 'pending' && !attendanceSession.completedAt && (
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(studentName, 'pending')}
                            className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#E8D9CC] bg-white text-[#8B6B5E] transition hover:bg-[#F8EEE5] hover:text-[#7B3F22] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2"
                            title="Resetear Estado"
                            aria-label={`Dejar pendiente a ${studentName}`}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-[#E8D9CC] bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:py-4">
              {attendanceSession.completedAt ? (
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="h-11 rounded-[10px] bg-[#C68952] px-6 text-[12px] font-semibold text-white shadow-[0_5px_14px_rgba(123,63,34,0.16)] transition hover:bg-[#B87543] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2"
                >
                  Cerrar
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setShowAttendanceModal(false)} disabled={isSubmitting} className="min-h-10 px-3 text-[12px] font-medium text-[#8B6B5E] transition hover:text-[#7B3F22] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2 disabled:opacity-50">Cancelar</button>
                  <button
                    type="button"
                    onClick={finalizeAttendance}
                    disabled={isSubmitting}
                    className="h-11 rounded-[10px] bg-[#C68952] px-5 text-[12px] font-semibold text-white shadow-[0_5px_14px_rgba(123,63,34,0.16)] transition hover:bg-[#B87543] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:px-6"
                  >
                    {isSubmitting ? 'Guardando…' : 'Finalizar control'}
                  </button>
                </>
              )}
            </footer>
          </section>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE SESIÓN (SOLO CONFIGURACIÓN) */}
      {showSessionModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-[#2F1E17]/45 font-['Inter'] backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-5"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setShowSessionModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-modal-title"
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#FFFCF8] text-[#2F211B] shadow-[0_24px_70px_rgba(59,35,24,0.2)] sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-[24px] sm:border sm:border-[#E8D9CC] animate-fade-in"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[#E8D9CC] px-5 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))] sm:px-8 sm:py-4">
              <div className="min-w-0 pr-4 sm:flex sm:items-baseline sm:gap-4">
                <h3 id="session-modal-title" className="shrink-0 font-['Playfair_Display'] text-[24px] font-semibold leading-none text-[#7B3F22] sm:text-[27px]">
                  {editingSessionId ? 'Editar sesión' : 'Nueva sesión'}
                </h3>
                <p className="mt-1.5 truncate text-[11px] text-[#8B6B5E] first-letter:uppercase sm:mt-0 sm:text-[12px]">
                  {sessionForm.date ? formatSessionDate(sessionForm.date) : 'Fecha no seleccionada'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                disabled={isSubmitting}
                aria-label="Cerrar modal"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8B6B5E] transition-colors hover:bg-[#F3E7DC] hover:text-[#7B3F22] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4 sm:px-8 sm:py-5">
              <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:gap-8">
                <div className="space-y-5">
                  <fieldset>
                    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B3F22]">Horario</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8B6B5E]">Inicio</span>
                        <input aria-label="Hora de inicio" type="time" value={sessionForm.startTime} onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })} disabled={sessionForm.classType === 'feriado'} className={`h-10 w-full rounded-[9px] border border-[#DDBFA4] bg-white px-3 text-[13px] font-medium text-[#2F211B] outline-none transition focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20 ${sessionForm.classType === 'feriado' ? 'cursor-not-allowed opacity-55' : ''}`} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8B6B5E]">Fin</span>
                        <input aria-label="Hora de fin" type="time" value={sessionForm.endTime} onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })} disabled={sessionForm.classType === 'feriado'} className={`h-10 w-full rounded-[9px] border border-[#DDBFA4] bg-white px-3 text-[13px] font-medium text-[#2F211B] outline-none transition focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20 ${sessionForm.classType === 'feriado' ? 'cursor-not-allowed opacity-55' : ''}`} />
                      </label>
                    </div>
                    {sessionForm.classType === 'feriado' && (
                      <p className="mt-2 text-[11px] leading-relaxed text-[#8B6B5E]">Día bloqueado por feriado (00:00–24:00).</p>
                    )}
                  </fieldset>

                  <div>
                    <label htmlFor="session-type" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B3F22]">Tipo de sesión</label>
                    <div className="relative">
                      <select
                        id="session-type"
                        value={sessionForm.classType}
                        onChange={(e) => {
                          const classType = e.target.value as ClassSession['classType'];
                          setSessionForm({
                            ...sessionForm,
                            classType,
                            teacherId: (classType === 'mesa' || classType === 'torno') ? sessionForm.teacherId : '',
                            workshopName: classType === 'workshop' ? sessionForm.workshopName : '',
                            privateReason: classType === 'privada' ? sessionForm.privateReason : '',
                            selectedStudents: classType === 'feriado' ? [] : sessionForm.selectedStudents,
                            startTime: classType === 'feriado' ? '00:00' : sessionForm.startTime,
                            endTime: classType === 'feriado' ? '24:00' : sessionForm.endTime
                          });
                        }}
                        className="h-11 w-full appearance-none rounded-[10px] border border-[#DDBFA4] bg-white px-3.5 pr-10 text-[13px] font-medium text-[#2F211B] outline-none transition focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20"
                      >
                        <option value="mesa">Mesa</option>
                        <option value="torno">Torno</option>
                        <option value="coworking">Coworking</option>
                        <option value="workshop">Workshop</option>
                        <option value="privada">Privadas</option>
                        <option value="feriado">Feriados</option>
                      </select>
                      <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B6B5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m7 10 5 5 5-5" /></svg>
                    </div>
                  </div>

                  {(sessionForm.classType === 'mesa' || sessionForm.classType === 'torno') && (
                    <div>
                      <label htmlFor="session-teacher" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B3F22]">
                        Profesor <span className="font-normal normal-case tracking-normal text-[#8B6B5E]">{sessionForm.classType === 'mesa' ? '(obligatorio)' : '(opcional)'}</span>
                      </label>
                  <select
                    id="session-teacher"
                    value={sessionForm.teacherId}
                    onChange={(e) => setSessionForm({ ...sessionForm, teacherId: e.target.value })}
                    className="h-11 w-full rounded-[10px] border border-[#DDBFA4] bg-white px-3.5 text-[13px] text-[#2F211B] outline-none transition focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20"
                  >
                    <option value="">Sin asignar</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{`${t.name} ${t.surname || ''}`.trim()}</option>
                    ))}
                  </select>
                    </div>
                  )}
                  {sessionForm.classType === 'workshop' && (
                  <input
                    aria-label="Nombre del workshop"
                    value={sessionForm.workshopName}
                    onChange={(e) => setSessionForm({ ...sessionForm, workshopName: e.target.value })}
                    className="h-11 w-full rounded-[10px] border border-[#DDBFA4] bg-white px-3.5 text-[13px] text-[#2F211B] outline-none transition placeholder:text-[#8B6B5E] focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20"
                    placeholder="Nombre del workshop"
                  />
                  )}
                  {sessionForm.classType === 'privada' && (
                  <input
                    aria-label="Motivo de la sesión privada"
                    value={sessionForm.privateReason}
                    onChange={(e) => setSessionForm({ ...sessionForm, privateReason: e.target.value })}
                    className="h-11 w-full rounded-[10px] border border-[#DDBFA4] bg-white px-3.5 text-[13px] text-[#2F211B] outline-none transition placeholder:text-[#8B6B5E] focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20"
                    placeholder="Motivo de la sesión"
                  />
                  )}
                </div>

                {sessionForm.classType !== 'feriado' && (
                  <div className="space-y-6 border-t border-[#E8D9CC] pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
                    <fieldset>
                      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B3F22]">Tipo de alumnos</legend>
                      <div className="grid grid-cols-3 gap-2 rounded-[12px] bg-[#F5E9DE] p-1">
                      <button
                        type="button"
                        onClick={() => { setSessionForm({ ...sessionForm, sessionAudience: 'membresia' }); setStudentSearchQuery(''); }}
                        className={`min-h-10 rounded-[9px] px-2 text-[10px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C68952] ${sessionForm.sessionAudience === 'membresia' ? 'bg-white text-[#7B3F22] shadow-sm' : 'text-[#8B6B5E] hover:text-[#7B3F22]'}`}
                      >
                        Membresía
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSessionForm({ ...sessionForm, sessionAudience: 'temporal' }); setStudentSearchQuery(''); }}
                        className={`min-h-10 rounded-[9px] px-2 text-[10px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C68952] ${sessionForm.sessionAudience === 'temporal' ? 'bg-white text-[#7B3F22] shadow-sm' : 'text-[#8B6B5E] hover:text-[#7B3F22]'}`}
                      >
                        Temporales
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSessionForm({ ...sessionForm, sessionAudience: 'ambos' }); setStudentSearchQuery(''); }}
                        className={`min-h-10 rounded-[9px] px-2 text-[10px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C68952] ${sessionForm.sessionAudience === 'ambos' ? 'bg-white text-[#7B3F22] shadow-sm' : 'text-[#8B6B5E] hover:text-[#7B3F22]'}`}
                      >
                        Ambos
                      </button>
                      </div>
                    </fieldset>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor="student-search" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B3F22]">Alumnos</label>
                        <span className="text-[11px] text-[#8B6B5E]">{sessionForm.selectedStudents.length} seleccionados</span>
                      </div>
                      <div className="relative mb-2.5">
                        <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8B6B5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>
                    <input
                      id="student-search"
                      type="text"
                      placeholder="Buscar por nombre o grupo"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="h-9 w-full rounded-[9px] border border-[#E1C9B5] bg-white pl-[2.125rem] pr-3 text-[12px] text-[#2F211B] outline-none transition placeholder:text-[#9B8175] focus:border-[#C68952] focus:ring-2 focus:ring-[#C68952]/20"
                    />
                      </div>
                    <div className="custom-scrollbar max-h-[230px] overflow-y-auto rounded-[10px] border border-[#E8D9CC] bg-white p-1.5">
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
                          return <p className="w-full py-6 text-center text-[12px] text-[#8B6B5E]">
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
                            <button type="button" key={s.id} onClick={() => {
                              const newList = isSelected
                                ? sessionForm.selectedStudents.filter(n => n !== studentKey)
                                : [...sessionForm.selectedStudents, studentKey];
                              setSessionForm({ ...sessionForm, selectedStudents: newList });
                            }} className={`mb-0.5 flex min-h-11 w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2 text-left transition last:mb-0 focus:outline-none focus:ring-2 focus:ring-[#C68952] ${isSelected ? 'bg-[#C68952] text-white' : 'text-[#4E3A31] hover:bg-[#F8EEE5]'}`}>
                              <span className="min-w-0 truncate text-[13px] font-medium">
                                {fullName}
                                {s.groupName && <span className="ml-1.5 text-[10px] font-normal opacity-65">{s.groupName}</span>}
                              </span>
                              <span className={`shrink-0 rounded-[6px] px-2 py-1 text-[9px] font-semibold ${isSelected ? 'bg-white/18 text-white' : isTemporary ? 'bg-[#F4E2D2] text-[#8A5633]' : 'bg-[#EEE5DE] text-[#6E5145]'}`}>
                                {isTemporary ? 'Temporal' : 'Membresía'}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                    {sessionForm.selectedStudents.length > 0 && (
                      <div className="mt-3 border-t border-[#E8D9CC] pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {sessionForm.selectedStudents.map(name => {
                            // Determinar el color basado en la categoría del estudiante
                            const studentObj = students.find(st => {
                              const fullName = `${st.name} ${st.surname || ''}`.trim().toUpperCase();
                              return fullName === name.toUpperCase() || st.name.toUpperCase() === name.toUpperCase();
                            });
                            const cat = studentObj?.studentCategory || 'membresia';
                            const isTemporary = cat === 'temporal';
                            return (
                              <span key={name} className="rounded-[7px] bg-[#F1E1D3] px-2 py-1 text-[9px] font-semibold text-[#7B3F22]">
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
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E8D9CC] bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:py-4">
              {editingSessionId && (
                <button
                  type="button"
                  onClick={() => setSessionToDelete(editingSessionId)}
                  className="mr-auto min-h-10 px-2 text-[11px] font-semibold text-[#9C4235] transition hover:text-[#742F26] focus:outline-none focus:ring-2 focus:ring-[#9C4235] focus:ring-offset-2"
                >
                  Eliminar
                </button>
              )}
              <button type="button" onClick={() => setShowSessionModal(false)} disabled={isSubmitting} className={`${editingSessionId ? '' : 'ml-auto'} min-h-10 px-3 text-[12px] font-medium text-[#8B6B5E] transition hover:text-[#7B3F22] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2 disabled:opacity-50`}>Cancelar</button>
              <button type="button" onClick={handleSessionSubmit} disabled={isSubmitting} className="h-11 rounded-[10px] bg-[#C68952] px-5 text-[12px] font-semibold text-white shadow-[0_5px_14px_rgba(123,63,34,0.16)] transition hover:bg-[#B87543] focus:outline-none focus:ring-2 focus:ring-[#C68952] focus:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:px-6">{isSubmitting ? 'Guardando…' : editingSessionId ? 'Guardar cambios' : 'Crear sesión'}</button>
            </footer>
          </section>
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
