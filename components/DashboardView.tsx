
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Student, ClassSession, AppView } from '../types';
import { isStudentArchived } from '../utils/studentLifecycle';

const getDateKey = () => new Date().toISOString().split('T')[0];

interface DashboardViewProps {
  students: Student[];
  sessions: ClassSession[];
  onUpdateSession: (id: string, updates: Partial<ClassSession>) => Promise<void>;
  onNavigate: (view: AppView) => void;
  onOpenStudentProfile: (studentId: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ students, sessions, onUpdateSession, onNavigate, onOpenStudentProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const alertAudioContextRef = useRef<AudioContext | null>(null);
  const previousAlertKeysRef = useRef<Set<string> | null>(null);

  // BUG 1 FIX: Local attendance state + debounce to prevent race conditions
  const [localAttendance, setLocalAttendance] = useState<Record<string, Record<string, 'present' | 'absent' | undefined>>>({});
  const debounceTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingUpdatesRef = useRef<Record<string, Record<string, 'present' | 'absent' | undefined>>>({});

  const DEFAULT_CAPACITY_TORNO = 5;
  const DEFAULT_CAPACITY_MESA = 8;

  const getSessionTypeLabel = (type: ClassSession['classType']) => {
    const map: Record<ClassSession['classType'], string> = {
      mesa: 'Mesa de Trabajo',
      torno: 'Clase de Torno',
      coworking: 'Coworking',
      workshop: 'Workshop',
      privada: 'Privadas',
      feriado: 'Feriados'
    };
    return map[type] || 'Sesion';
  };

  const [todayStr, setTodayStr] = useState(getDateKey);

  useEffect(() => {
    const timer = window.setInterval(() => setTodayStr(getDateKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // ─── TODAY's data ───
  const todaySessions = useMemo(() =>
    sessions.filter(s => s.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, todayStr]);

  const uniqueStudentsToday = useMemo(() => {
    const names = new Set<string>();
    todaySessions.forEach(s => s.students.forEach(st => names.add(st.toUpperCase())));
    return Array.from(names);
  }, [todaySessions]);

  // ─── GLOBAL stats ───
  const globalStats = useMemo(() => {
    const totalStudents = students.length;
     const activeStudents = students.filter(s =>
       !isStudentArchived(s)
       &&
       (s.studentCategory || 'membresia') === 'membresia'
       && s.status !== 'needs_renewal'
       && s.classesRemaining > 0
     ).length;
     const pendingStudents = students.filter(s =>
       !isStudentArchived(s)
       &&
       (s.studentCategory || 'membresia') === 'membresia'
        && s.status === 'needs_renewal'
        && s.classesRemaining > 0
        && !(s.expiryDate && s.expiryDate < todayStr)
      ).length;
     const totalSessions = sessions.length;

    // Students by category
    const byCategory: Record<string, number> = { membresia: 0, temporal: 0 };
    students.forEach(s => {
      const cat = s.studentCategory || 'membresia';
       if (byCategory[cat] !== undefined && !isStudentArchived(s)) byCategory[cat]++;
    });

     return { totalStudents, activeStudents, pendingStudents, totalSessions, byCategory };
    }, [students, sessions, todayStr]);

  // ─── TODAY stats ───
  const todayStats = useMemo(() => {
    let totalSpots = 0;
    let occupiedSpots = 0;
    let tornosTotales = 0;
    let tornosOcupados = 0;
    let mesasTotales = 0;
    let mesasOcupadas = 0;

    todaySessions.forEach(s => {
      const cap = s.classType === 'torno' ? DEFAULT_CAPACITY_TORNO : DEFAULT_CAPACITY_MESA;
      totalSpots += cap;
      occupiedSpots += s.students.length;
      if (s.classType === 'torno') { tornosTotales += cap; tornosOcupados += s.students.length; }
      else { mesasTotales += cap; mesasOcupadas += s.students.length; }
    });

    return {
      occTornos: tornosTotales > 0 ? Math.round((tornosOcupados / tornosTotales) * 100) : 0,
      mesasLibres: mesasTotales - mesasOcupadas,
      totalAlumnos: uniqueStudentsToday.length,
      totalSessions: todaySessions.length,
      globalOccupancy: totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0
    };
  }, [todaySessions, uniqueStudentsToday]);

  // ─── Alerts ───
  const alerts = useMemo(() => {
    const list: { id: string; name: string; reason: string; type: 'warning' | 'info' | 'critical' }[] = [];
    // Keep expiration and payment as separate causes so the dashboard is actionable.
    students.forEach(student => {
      if (isStudentArchived(student, todayStr)) return;
      const fullName = `${student.name} ${student.surname || ''}`.trim();
      const isMembership = (student.studentCategory || 'membresia') === 'membresia';
      const isExpired = Boolean(student.expiryDate && student.expiryDate < todayStr);
      const isPaymentPending = isMembership
        && student.status === 'needs_renewal'
        && student.classesRemaining > 0
        && !isExpired;

      if (student.classesRemaining <= 1 && student.classesRemaining >= 0) {
        list.push({ id: student.id, name: fullName, reason: `Bono agotándose (${student.classesRemaining} rest.)`, type: 'critical' });
      }
      if (isExpired && isMembership) {
        list.push({ id: student.id, name: fullName, reason: 'Membresía vencida', type: 'critical' });
      }
      if (isPaymentPending) {
        list.push({ id: student.id, name: fullName, reason: 'Pago pendiente de membresía', type: 'warning' });
      }
    });
    return list;
  }, [students, todayStr]);

  const playAlertSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = alertAudioContextRef.current || new AudioContextConstructor();
    alertAudioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, startAt);
    oscillator.frequency.setValueAtTime(988, startAt + 0.12);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.32);
    context.resume().catch(() => undefined);
  }, []);

  useEffect(() => {
    const currentKeys = new Set(alerts.map(alert => `${alert.type}:${alert.id}`));
    const previousKeys = previousAlertKeysRef.current;
    const hasNewAlert = previousKeys
      ? Array.from(currentKeys).some(key => !previousKeys.has(key))
      : false;

    if (hasNewAlert && soundEnabled) playAlertSound();
    previousAlertKeysRef.current = currentKeys;
  }, [alerts, soundEnabled, playAlertSound]);

  useEffect(() => () => {
    alertAudioContextRef.current?.close().catch(() => undefined);
  }, []);

  // ─── All students searchable ───
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
      return students
      .filter(s => {
        if (isStudentArchived(s)) return false;
        if (!q) return true;
        const fullName = `${s.name} ${s.surname || ''}`.trim().toLowerCase();
        return fullName.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchQuery]);

  // Today's student list for attendance - uses localAttendance for immediate UI feedback
  const todayStudentList = useMemo(() => {
    const list: { name: string; time: string; type: string; status?: string; sessionId: string }[] = [];
    todaySessions.forEach(s => {
      s.students.forEach(st => {
        // BUG 1 FIX: Prefer local state for immediate feedback, fallback to session state
        const currentAtt = localAttendance[s.id] ?? s.attendance;
        list.push({ name: st, time: s.startTime, type: s.classType, status: currentAtt?.[st] || 'pending', sessionId: s.id });
      });
    });
    return list;
  }, [todaySessions, localAttendance]);

  // BUG 1 FIX: Debounced attendance handler - accumulates clicks for 2 seconds before sending
  const handleAttendance = useCallback((session: ClassSession, studentName: string, status: 'present' | 'absent') => {
    const sessionId = session.id;

    // Get current attendance (merge session data with local pending changes)
    const baseAtt = session.attendance || {};
    const pendingAtt = pendingUpdatesRef.current[sessionId] || {};
    const currentAtt = { ...baseAtt, ...pendingAtt };

    // Toggle logic
    const newStatus = currentAtt[studentName] === status ? undefined : status;
    const nextAtt = { ...currentAtt };
    if (newStatus) nextAtt[studentName] = newStatus;
    else delete nextAtt[studentName];

    // Store pending update
    pendingUpdatesRef.current[sessionId] = nextAtt;

    // Update local state for immediate UI feedback
    setLocalAttendance(prev => ({ ...prev, [sessionId]: nextAtt }));

    // Clear existing timer for this session
    if (debounceTimerRef.current[sessionId]) {
      clearTimeout(debounceTimerRef.current[sessionId]);
    }

    // Set new debounce timer (2 seconds)
    debounceTimerRef.current[sessionId] = setTimeout(async () => {
      const finalAtt = pendingUpdatesRef.current[sessionId];
      if (finalAtt) {
        await onUpdateSession(sessionId, { attendance: finalAtt });
        // Clear pending after successful save
        delete pendingUpdatesRef.current[sessionId];
        delete debounceTimerRef.current[sessionId];
      }
    }, 2000);
  }, [onUpdateSession]);

  const CATEGORY_LABELS: Record<string, string> = { membresia: 'Membresía', temporal: 'Temporal' };
  const CATEGORY_COLORS: Record<string, string> = { membresia: 'bg-brand', temporal: 'bg-caramelo' };

  return (
    <div className="h-full flex flex-col bg-neutral-base overflow-hidden animate-fade-in">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-4 md:py-6 pb-32">

        {/* ─── GLOBAL STATS ROW ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-5">
           <div className="bg-white p-4 md:p-5 rounded-2xl border border-neutral-border flex flex-col justify-between min-h-[7rem]"
             onClick={() => onNavigate(AppView.STUDENTS)}
             style={{ cursor: 'pointer' }}>
             <p className="eyebrow">Alumnos Totales</p>
             <div className="flex items-baseline gap-2">
               <span className="text-[32px] font-bold text-neutral-textMain">{globalStats.totalStudents}</span>
               <span className="text-[11px] font-semibold text-[#20663B]">{globalStats.activeStudents} membresías activas</span>
             </div>
           </div>
           <div className="bg-white p-4 md:p-5 rounded-2xl border border-neutral-border flex flex-col justify-between min-h-[7rem]"
             onClick={() => onNavigate(AppView.STUDENTS)}
             style={{ cursor: 'pointer' }}>
             <p className="eyebrow">Activos de membresía</p>
             <span className="text-[32px] font-bold text-[#20663B]">{globalStats.activeStudents}</span>
           </div>
           <div className="bg-white p-4 md:p-5 rounded-2xl border border-neutral-border flex flex-col justify-between min-h-[7rem]">
            <p className="eyebrow">Pendientes de pago</p>
            <span className={`text-[32px] font-bold ${globalStats.pendingStudents > 0 ? 'text-[#9E3B2B]' : 'text-[#20663B]'}`}>{globalStats.pendingStudents}</span>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-neutral-border flex flex-col justify-between min-h-[7rem]">
            <p className="eyebrow">Sesiones Totales</p>
            <span className="text-[32px] font-bold text-neutral-textMain">{globalStats.totalSessions}</span>
          </div>
          {/* Today's metrics */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-neutral-border flex flex-col justify-between min-h-[7rem]">
            <p className="eyebrow">Alumnos Hoy</p>
            <span className="text-[32px] font-bold text-neutral-textMain">{todayStats.totalAlumnos}</span>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-neutral-border flex flex-col justify-between min-h-[7rem]">
            <p className="eyebrow">Sesiones Hoy</p>
            <span className="text-[32px] font-bold text-neutral-textMain">{todayStats.totalSessions}</span>
          </div>
        </div>

        {/* ─── STUDENT CATEGORIES ROW ─── */}
        {globalStats.totalStudents > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {Object.entries(globalStats.byCategory).filter(([, count]) => (count as number) > 0).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-neutral-border">
                <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat] || 'bg-neutral-border'}`}></div>
                <span className="text-[11px] font-semibold text-neutral-textMain">{CATEGORY_LABELS[cat] || cat}</span>
                <span className="text-[11px] font-semibold text-neutral-textHelper">{count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

          {/* ─── TODAY TIMELINE (Left Column) ─── */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                <h4 className="text-[16px] font-bold text-neutral-textMain">Agenda de Hoy</h4>
              </div>
              <button onClick={() => onNavigate(AppView.CALENDAR)} className="min-h-[44px] px-2 text-[13px] font-semibold text-brand hover:text-brand-hover transition-colors">
                Ver Calendario Completo
              </button>
            </div>

            <div className="space-y-3">
              {todaySessions.length === 0 ? (
                <div className="bg-white/60 border border-dashed border-neutral-border p-8 md:p-10 rounded-2xl text-center">
                  <p className="text-neutral-textHelper text-[13px]">No hay sesiones programadas para hoy</p>
                  <button onClick={() => onNavigate(AppView.CALENDAR)} className="mt-4 min-h-[44px] px-4 py-2.5 bg-brand text-white text-[14px] font-semibold rounded-[10px] hover:bg-brand-hover transition-all">
                    Crear Sesión
                  </button>
                </div>
              ) : (
                todaySessions.map(session => {
                  const capacity = session.classType === 'torno' ? DEFAULT_CAPACITY_TORNO : DEFAULT_CAPACITY_MESA;
                  const isFull = session.students.length >= capacity;
                  return (
                    <div key={session.id} className="bg-white p-4 md:p-5 rounded-2xl border border-neutral-border flex items-center justify-between group hover:border-arena transition-all">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-center min-w-[56px]">
                          <p className="text-[18px] font-bold text-neutral-textMain leading-none">{session.startTime}</p>
                          <p className="text-[9px] font-semibold text-neutral-textHelper mt-1 tracking-wide">Inicio</p>
                        </div>
                        <div className="h-8 w-[1px] bg-neutral-border"></div>
                        <div>
                          <p className="text-[15px] font-semibold text-neutral-textMain">{getSessionTypeLabel(session.classType)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] font-semibold ${isFull ? 'text-[#9E3B2B]' : 'text-[#20663B]'}`}>
                              {session.students.length}/{capacity} {isFull ? 'Completo' : 'Lugares'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex -space-x-2">
                          {session.students.slice(0, 3).map((st, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-neutral-sec border-2 border-white flex items-center justify-center text-[11px] font-semibold text-neutral-textSec">
                              {st.charAt(0)}
                            </div>
                          ))}
                          {session.students.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-brand-soft border-2 border-white flex items-center justify-center text-[11px] font-semibold text-brand">
                              +{session.students.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ─── ALERTS ─── */}
            <section className="space-y-3 mt-6">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-caramelo rounded-full"></div>
                    <h4 className="text-[15px] font-bold text-neutral-textMain">Alertas</h4>
                    <span className="text-[12px] font-semibold text-neutral-textHelper">({alerts.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!soundEnabled) playAlertSound();
                      setSoundEnabled(enabled => !enabled);
                    }}
                    aria-pressed={soundEnabled}
                    className={`min-h-[36px] px-2.5 rounded-[9px] border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${soundEnabled ? 'bg-[#DFF0E4] text-[#20663B] border-[#BFDECB]' : 'bg-white text-neutral-textHelper border-neutral-border hover:border-arena hover:text-brand'}`}
                    title={soundEnabled ? 'Desactivar sonido de alertas' : 'Activar sonido de alertas'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={soundEnabled ? 'M11 5L6 9H3v6h3l5 4V5zm5.5 3.5a5 5 0 010 7M19 5a9 9 0 010 14' : 'M11 5L6 9H3v6h3l5 4V5zm5 7H22'} /></svg>
                    <span className="hidden sm:inline">{soundEnabled ? 'Sonido activo' : 'Activar sonido'}</span>
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <div className="bg-white border border-dashed border-neutral-border rounded-2xl p-5 text-center">
                    <p className="text-[13px] text-neutral-textHelper">No hay alertas activas</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {alerts.map((alert, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${alert.type === 'critical' ? 'bg-[#F8E1DA] border-[#EFC9BE]' : alert.type === 'warning' ? 'bg-[#FBEAD2] border-[#EBD5AC]' : 'bg-brand-soft border-arena'}`}>
                        <div>
                          <p className="text-[13px] font-semibold text-neutral-textMain">{alert.name}</p>
                          <p className={`text-[12px] font-medium ${alert.type === 'critical' ? 'text-[#9E3B2B]' : alert.type === 'warning' ? 'text-[#8A5517]' : 'text-brand'}`}>{alert.reason}</p>
                        </div>
                        {alert.id && (
                          <button onClick={() => onOpenStudentProfile(alert.id)} className="min-h-[44px] px-2 text-[12px] font-semibold text-neutral-textMain hover:text-brand transition-colors shrink-0">
                            Ver Ficha
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
          </div>

          {/* ─── RIGHT COLUMN: Students + Attendance ─── */}
          <div className="lg:col-span-5 space-y-6">

            {/* TODAY ATTENDANCE — only if there are sessions */}
            {todayStudentList.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#20663B] rounded-full"></div>
                    <h4 className="text-[15px] font-bold text-neutral-textMain">Asistencia Hoy</h4>
                  </div>
                  <span className="text-[12px] font-semibold text-neutral-textHelper">{todayStudentList.length} alumnos</span>
                </div>
                <div className="bg-white rounded-2xl border border-neutral-border overflow-hidden flex flex-col max-h-[300px]">
                  <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
                    {todayStudentList.map((item, i) => {
                      const sessionObj = todaySessions.find(s => s.startTime === item.time && s.students.includes(item.name));
                      return (
                        <div key={i} className="flex items-center justify-between p-3 border-b border-neutral-border last:border-0">
                          <div className="flex flex-col overflow-hidden mr-2">
                            <span className="text-[13px] font-semibold text-neutral-textMain truncate leading-tight">{item.name.toLowerCase()}</span>
                            <span className="text-[11px] text-neutral-textHelper mt-0.5">{item.time} • {item.type}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => sessionObj && handleAttendance(sessionObj, item.name, 'present')}
                              className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${item.status === 'present' ? 'bg-[#20663B] text-white' : 'bg-neutral-sec text-neutral-textHelper hover:bg-[#DFF0E4] hover:text-[#20663B]'}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                              onClick={() => sessionObj && handleAttendance(sessionObj, item.name, 'absent')}
                              className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${item.status === 'absent' ? 'bg-[#9E3B2B] text-white' : 'bg-neutral-sec text-neutral-textHelper hover:bg-[#F8E1DA] hover:text-[#9E3B2B]'}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ALL REGISTERED STUDENTS */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-neutral-textMain rounded-full"></div>
                  <h4 className="text-[15px] font-bold text-neutral-textMain">Directorio Alumnos</h4>
                </div>
                <span className="text-[12px] font-semibold text-neutral-textHelper">{students.length} Total</span>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-border overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-3 border-b border-neutral-border shrink-0">
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[14px] text-neutral-textMain placeholder:text-neutral-textHelper"
                  />
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
                  {filteredStudents.length === 0 ? (
                    <p className="text-center py-8 text-[13px] text-neutral-textHelper italic">Sin resultados</p>
                  ) : (
                    filteredStudents.map((student) => {
                      const fullName = `${student.name} ${student.surname || ''}`.trim();
                      const isPending = student.status === 'needs_renewal' || student.classesRemaining <= 0;
                      const cat = student.studentCategory || 'membresia';
                      return (
                        <div
                          key={student.id}
                          onClick={() => onOpenStudentProfile(student.id)}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-alt cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-[12px] shrink-0 ${CATEGORY_COLORS[cat]}`}>
                              {student.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[13px] font-semibold text-neutral-textMain truncate leading-tight">{fullName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold text-neutral-textHelper tracking-wide">{CATEGORY_LABELS[cat]}</span>
                                {student.groupName && (
                                  <span className="text-[10px] font-medium text-neutral-textSec">• {student.groupName}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[12px] font-semibold ${isPending ? 'text-[#9E3B2B]' : 'text-[#20663B]'}`}>
                              {student.classesRemaining}
                            </span>
                            <svg className="w-4 h-4 text-neutral-border group-hover:text-brand transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
