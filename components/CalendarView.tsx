
import React, { useState, useMemo } from 'react';
import { ClassSession, Student, Teacher } from '../types';

interface CalendarViewProps {
  sessions: ClassSession[];
  onAddSession: (session: Omit<ClassSession, 'id'>) => void;
  onUpdateSession: (id: string, updates: Partial<ClassSession>) => void;
  onDeleteSession: (id: string) => void;
  students: Student[];
  teachers: Teacher[];
}

type CalendarMode = 'day' | 'month';

const CalendarView: React.FC<CalendarViewProps> = ({ sessions, onAddSession, onUpdateSession, onDeleteSession, students, teachers }) => {
  const [viewMode, setViewMode] = useState<CalendarMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modales separados
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<ClassSession | null>(null);
  const [substituteId, setSubstituteId] = useState('');

  const HOUR_HEIGHT = 140;

  const [sessionForm, setSessionForm] = useState({
    date: '',
    startTime: '10:00',
    endTime: '12:00',
    classType: 'mesa' as ClassSession['classType'],
    selectedStudents: [] as string[],
    teacherId: '',
    workshopName: '',
    privateReason: ''
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
        privateReason: session.privateReason || ''
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
        privateReason: ''
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

  const finalizeAttendance = () => {
    if (!attendanceSession) return;
    const completedAt = new Date().toISOString();
    onUpdateSession(attendanceSession.id, {
      completedAt,
      teacherSubstituteId: substituteId || undefined
    });
    setAttendanceSession(prev => prev ? { ...prev, completedAt, teacherSubstituteId: substituteId || undefined } : prev);
    setShowAttendanceModal(false);
  };

  const handleMarkAttendance = (studentName: string, status: 'present' | 'absent' | 'pending') => {
    if (!attendanceSession) return;

    const currentAttendance = { ...(attendanceSession.attendance || {}) };

    if (status === 'pending') {
      delete currentAttendance[studentName];
    } else {
      currentAttendance[studentName] = status;
    }

    const updatedSession = { ...attendanceSession, attendance: currentAttendance };
    onUpdateSession(attendanceSession.id, { attendance: currentAttendance });
    setAttendanceSession(updatedSession); // Update local state for modal
  };

  const handleSessionSubmit = () => {
    if (!sessionForm.date) {
      alert("ERROR: Selecciona un d\u00eda en el calendario antes de guardar.");
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
      alert("ERROR: Ya existe una sesi\u00f3n con el mismo horario y tipo.");
      return;
    }
    const payload = {
      date: sessionForm.date,
      startTime: sessionForm.startTime,
      endTime: sessionForm.endTime,
      classType: sessionForm.classType,
      students: sessionForm.selectedStudents,
      teacherId: sessionForm.teacherId || undefined,
      workshopName: sessionForm.workshopName.trim() || undefined,
      privateReason: sessionForm.privateReason.trim() || undefined
    };
    if (editingSessionId) onUpdateSession(editingSessionId, payload);
    else onAddSession(payload);
    setShowSessionModal(false);
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

  const renderDayView = () => {
    const dateKey = formatDateKey(selectedDate);
    const daySessions = sessions.filter(s => s.date === dateKey);
    const dayNameLong = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();

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
        <div className="flex items-center justify-center gap-2 mb-6 px-4 overflow-x-auto pb-4 no-scrollbar shrink-0 mt-2">
          {weekDays.map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const dName = date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
            return (

              <button key={i} onClick={() => setSelectedDate(new Date(date))} className={`flex flex-col items-center min-w-[50px] md:min-w-[70px] py-3 rounded-2xl transition-all border ${isSelected ? 'bg-brand border-brand text-white soft-shadow scale-105 z-10' : 'bg-white border-white text-neutral-textHelper hover:border-brand-light'}`}>
                <span className={`text-[9px] font-extrabold uppercase mb-1 tracking-widest ${isSelected ? 'text-white/80' : 'text-[#A8A9AE]'}`}>{dName}</span>
                <span className={`text-[16px] md:text-[20px] font-extrabold ${isSelected ? 'text-white' : 'text-[#3D3437]'}`}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-4 px-5 md:px-8 flex items-center justify-between">
          <h3 className="text-[18px] md:text-[22px] font-extrabold text-neutral-textMain uppercase tracking-tight">{dayNameLong}</h3>
          <button onClick={() => handleOpenSessionModal()} className="px-5 py-3 md:px-8 bg-brand text-white rounded-full text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest soft-shadow hover:bg-brand-hover active:scale-95 transition-all">NUEVA SESIÓN</button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar px-5 md:px-8 pt-2 pb-32">
            <div className="relative" style={{ minHeight: `${hours.length * HOUR_HEIGHT}px` }}>
              {hours.map((hour) => (
                <div key={hour} className="relative flex items-start border-t border-neutral-border/20 h-[140px]">
                  <span className="w-10 text-left text-[10px] md:text-[11px] font-light text-neutral-textHelper -mt-2.5 uppercase tracking-tighter">{hour === 24 ? '00' : hour}:00</span>
                </div>
              ))}

              {Object.keys(sessionsByTime).map(startTime => {
                const concurrentSessions = sessionsByTime[startTime];
                const widthPercent = (100 - 15) / concurrentSessions.length;
                return concurrentSessions.map((session, index) => {
                  const [startH, startM] = session.startTime.split(':').map(Number);
                  const topOffset = ((startH * 60 + startM - startHour * 60) / 60) * HOUR_HEIGHT;
                  const leftOffset = 15 + (index * widthPercent);
                  return (
                    <div key={session.id} className="absolute rounded-[2rem] md:rounded-[2.5rem] bg-white soft-shadow border border-neutral-border/20 transition-all z-10 p-6 md:p-8 flex flex-col items-start overflow-hidden group cursor-pointer" style={{ top: `${topOffset}px`, left: `${leftOffset}%`, width: `calc(${widthPercent}% - 12px)`, minHeight: '180px' }} onClick={() => handleOpenSessionModal(session)}>
                      <div className="flex flex-col md:flex-row justify-between items-start w-full mb-4 md:mb-6 gap-2">
                        <span className="text-[18px] md:text-[22px] font-extrabold text-neutral-textMain leading-none tracking-tight">{session.startTime} - {session.endTime}</span>
                        <span className={`px-3 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.1em] text-white ${getSessionBadgeClasses(session.classType)}`}>{getSessionLabel(session).toUpperCase()}</span>
                      </div>
                      <div className="text-[11px] font-light text-neutral-textHelper uppercase tracking-widest mb-4">
                        <span>Profesor/a: </span>
                        <span className="text-brand font-extrabold">{getTeacherName(session.teacherId)}</span>
                        {getTeacherSpecialty(session.teacherId) && (
                          <span className="block text-[10px] font-light text-neutral-textSec uppercase tracking-widest mt-1">
                            {getTeacherSpecialty(session.teacherId)}
                          </span>
                        )}
                        {session.classType === 'workshop' && session.workshopName && (
                          <span className="block text-[10px] font-light text-neutral-textSec uppercase tracking-widest mt-1">
                            {session.workshopName}
                          </span>
                        )}
                        {session.classType === 'privada' && session.privateReason && (
                          <span className="block text-[10px] font-light text-neutral-textSec uppercase tracking-widest mt-1">
                            {session.privateReason}
                          </span>
                        )}
                        {session.classType === 'feriado' && (
                          <span className="block text-[10px] font-light text-neutral-textSec uppercase tracking-widest mt-1">
                            Vacaciones
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 md:space-y-3 w-full flex-1 mb-10 overflow-hidden">
                        {session.students.map((s, idx) => {
                          const att = session.attendance?.[s];
                          return (
                            <div key={idx} className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${att === 'absent' ? 'bg-red-500' : (att === 'present' ? 'bg-green-500' : 'bg-[#CA7859]')}`}></div>
                              <span className={`text-[14px] md:text-[16px] font-light truncate ${att === 'absent' ? 'text-red-400 line-through opacity-60' : (att === 'present' ? 'text-green-600 font-normal' : 'text-neutral-textMain')}`}>{s.toLowerCase()}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Botón Control de Asistencia Específico */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenAttendanceModal(session); }}
                        className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-10 h-10 md:w-14 md:h-14 bg-brand rounded-full flex items-center justify-center text-white soft-shadow hover:scale-105 transition-all z-20"
                        title="Control de Asistencia"
                      >
                        <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
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
    <div className="h-full flex flex-col overflow-hidden bg-neutral-base">
      <div className="flex justify-center md:justify-end px-5 md:px-8 pt-4 mb-2">
        <div className="flex bg-white p-1 rounded-full border border-neutral-border/30 soft-shadow w-full md:w-auto">
          <button onClick={() => setViewMode('day')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-brand text-white' : 'text-neutral-textHelper'}`}>DÍA</button>
          <button onClick={() => setViewMode('month')} className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-brand text-white' : 'text-neutral-textHelper'}`}>MES</button>
        </div>
      </div>

      {viewMode === 'day' ? renderDayView() : (
        <div className="flex-1 bg-white rounded-t-[2.5rem] md:rounded-t-[3rem] border-x border-t border-neutral-border p-4 md:p-8 flex flex-col items-center overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-md flex justify-between items-center mb-8">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-2 text-neutral-customGray hover:text-brand"><svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg></button>
            <h3 className="text-[16px] md:text-lg font-extrabold text-neutral-textMain uppercase tracking-widest">{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-2 text-neutral-customGray hover:text-brand"><svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg></button>
          </div>
          <div className="w-full max-w-4xl grid grid-cols-7 gap-1.5 md:gap-3">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d} className="text-center text-[10px] md:text-[11px] font-extrabold text-neutral-textHelper uppercase mb-1">{d}</div>)}
            {monthDays.map((item, i) => {
              const isSelected = item.date.toDateString() === selectedDate.toDateString();
              return (
                <div key={i} onClick={() => { setSelectedDate(item.date); setViewMode('day'); }} className={`aspect-square rounded-xl md:rounded-2xl flex items-center justify-center cursor-pointer transition-all border ${!item.currentMonth ? 'opacity-10' : 'opacity-100'} ${isSelected ? 'bg-brand text-white border-brand' : 'bg-neutral-sec/50 border-neutral-border hover:bg-white'}`}>
                  <span className="text-[14px] md:text-lg font-extrabold">{item.date.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE CONTROL DE ASISTENCIA (EXCLUSIVO) */}
      {showAttendanceModal && attendanceSession && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 md:p-12 soft-shadow relative animate-fade-in border border-neutral-border flex flex-col max-h-[85dvh]">
            <div className="mb-8">
              <span className="text-[10px] font-extrabold text-brand uppercase tracking-[0.2em] mb-2 block">CHECK-IN DIARIO</span>
              <h3 className="text-[24px] md:text-[28px] font-black text-neutral-textMain uppercase tracking-tight leading-none">Control Asistencia</h3>
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
                  className="w-full px-4 py-3 bg-neutral-sec border border-neutral-border rounded-xl text-[13px] font-light appearance-none"
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
                  return (
                    <div key={idx} className="bg-neutral-sec/50 p-5 rounded-[2rem] border border-neutral-border flex items-center justify-between group transition-all">
                      <div className="flex flex-col overflow-hidden mr-4">
                        <p className="text-[16px] font-black text-neutral-textMain uppercase tracking-tight truncate">{studentName.toLowerCase()}</p>
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-1 ${status === 'present' ? 'text-green-500' : status === 'absent' ? 'text-red-400' : 'text-neutral-textHelper'}`}>
                          {status === 'present' ? 'Asiste' : status === 'absent' ? 'No asiste' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleMarkAttendance(studentName, 'present')}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${status === 'present' ? 'bg-green-500 text-white scale-110' : 'bg-white text-neutral-textHelper hover:bg-green-100 hover:text-green-600'}`}
                          title="Marcar Asistencia"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(studentName, 'absent')}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${status === 'absent' ? 'bg-red-400 text-white scale-110' : 'bg-white text-neutral-textHelper hover:bg-red-100 hover:text-red-400'}`}
                          title="Marcar Falta"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        {status !== 'pending' && (
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
              <button
                onClick={finalizeAttendance}
                className="w-full py-6 bg-neutral-textMain text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[14px] hover:bg-black active:scale-[0.98] transition-all soft-shadow"
              >
                FINALIZAR CONTROL
              </button>
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
                  <input type="time" value={sessionForm.startTime} onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })} className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl font-extrabold text-[16px] md:text-[18px]" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-2">FIN</label>
                  <input type="time" value={sessionForm.endTime} onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })} className="w-full p-4 bg-neutral-sec border border-neutral-border rounded-xl font-extrabold text-[16px] md:text-[18px]" />
                </div>
              </div>
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
                        privateReason: option.id === 'privada' ? sessionForm.privateReason : ''
                      })}
                      className={`py-4 rounded-xl font-extrabold text-[12px] md:text-[13px] uppercase tracking-widest border transition-all ${
                        sessionForm.classType === option.id ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-textHelper'
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
              <div>
                <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase mb-4">ALUMNOS ASIGNADOS</label>
                <div className="flex flex-wrap gap-2">
                  {students.map(s => {
                    const fullName = `${s.name} ${s.surname || ''}`.trim();
                    const studentKey = fullName.toUpperCase();
                    const isSelected = sessionForm.selectedStudents.includes(studentKey);
                    return (
                      <button key={s.id} onClick={() => {
                        const newList = isSelected
                          ? sessionForm.selectedStudents.filter(n => n !== studentKey)
                          : [...sessionForm.selectedStudents, studentKey];
                        setSessionForm({ ...sessionForm, selectedStudents: newList });
                      }} className={`px-3 py-2 rounded-lg text-[10px] font-extrabold uppercase border transition-all ${isSelected ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-textHelper'}`}>{fullName}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pt-8 flex gap-3 shrink-0">
              {editingSessionId && (
                <button
                  onClick={() => { if (confirm("¿Eliminar esta sesión de la agenda?")) { onDeleteSession(editingSessionId); setShowSessionModal(false); } }}
                  className="px-6 py-5 bg-red-50 text-red-400 rounded-2xl font-extrabold uppercase tracking-widest text-[11px]"
                >
                  ELIMINAR
                </button>
              )}
              <button onClick={handleSessionSubmit} className="flex-1 py-5 bg-brand text-white rounded-2xl font-extrabold uppercase tracking-widest soft-shadow text-[14px]">GUARDAR CAMBIOS</button>
              <button onClick={() => setShowSessionModal(false)} className="px-6 py-5 bg-neutral-alt text-neutral-textSec rounded-2xl font-extrabold uppercase tracking-widest text-[11px]">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
