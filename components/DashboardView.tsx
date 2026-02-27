
import React, { useMemo, useState } from 'react';
import { Student, ClassSession, CeramicPiece, AppView } from '../types';

interface DashboardViewProps {
  students: Student[];
  sessions: ClassSession[];
  pieces: CeramicPiece[];
  onUpdateSession: (id: string, updates: Partial<ClassSession>) => void;
  onNavigate: (view: AppView) => void;
  onOpenStudentProfile: (studentId: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ students, sessions, pieces, onUpdateSession, onNavigate, onOpenStudentProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');

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

  const todayStr = new Date().toISOString().split('T')[0];

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
    const activeStudents = students.filter(s => s.status !== 'needs_renewal' && s.classesRemaining > 0).length;
    const pendingStudents = students.filter(s => s.status === 'needs_renewal' || s.classesRemaining <= 0).length;
    const totalPieces = pieces.length;
    const piecesInProgress = pieces.filter(p => p.status !== 'entregado').length;
    const piecesReady = pieces.filter(p => p.status === 'a_recogida').length;
    const totalSessions = sessions.length;

    // Students by category
    const byCategory: Record<string, number> = { regular: 0, iniciacion: 0, grupal: 0, temporal: 0, grupo_temporal: 0 };
    students.forEach(s => {
      const cat = s.studentCategory || 'regular';
      if (byCategory[cat] !== undefined) byCategory[cat]++;
    });

    return { totalStudents, activeStudents, pendingStudents, totalPieces, piecesInProgress, piecesReady, totalSessions, byCategory };
  }, [students, pieces, sessions]);

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
    // All students with low or expired bonuses
    students.forEach(student => {
      const fullName = `${student.name} ${student.surname || ''}`.trim();
      if (student.classesRemaining <= 1 && student.classesRemaining >= 0) {
        list.push({ id: student.id, name: fullName, reason: `Bono agotándose (${student.classesRemaining} rest.)`, type: 'critical' });
      }
      if (student.expiryDate && new Date(student.expiryDate) < new Date()) {
        list.push({ id: student.id, name: fullName, reason: 'Fecha de bono expirada', type: 'warning' });
      }
    });
    // Pieces ready for pickup
    pieces.filter(p => p.status === 'a_recogida').forEach(p => {
      list.push({ id: '', name: p.owner, reason: `Pieza lista para recoger: ${p.description}`, type: 'info' });
    });
    return list;
  }, [students, pieces]);

  // ─── All students searchable ───
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter(s => {
        if (!q) return true;
        const fullName = `${s.name} ${s.surname || ''}`.trim().toLowerCase();
        return fullName.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchQuery]);

  // Today's student list for attendance
  const todayStudentList = useMemo(() => {
    const list: { name: string; time: string; type: string; status?: string }[] = [];
    todaySessions.forEach(s => {
      s.students.forEach(st => {
        list.push({ name: st, time: s.startTime, type: s.classType, status: s.attendance?.[st] || 'pending' });
      });
    });
    return list;
  }, [todaySessions]);

  const handleAttendance = (session: ClassSession, studentName: string, status: 'present' | 'absent') => {
    const currentAtt = session.attendance || {};
    const newStatus = currentAtt[studentName] === status ? undefined : status;
    const nextAtt = { ...currentAtt };
    if (newStatus) nextAtt[studentName] = newStatus;
    else delete nextAtt[studentName];
    onUpdateSession(session.id, { attendance: nextAtt });
  };

  const CATEGORY_LABELS: Record<string, string> = { regular: 'Regular', iniciacion: 'Iniciación', grupal: 'Grupal', temporal: 'Temporal', grupo_temporal: 'Grupo T.' };
  const CATEGORY_COLORS: Record<string, string> = { regular: 'bg-brand', iniciacion: 'bg-blue-500', grupal: 'bg-purple-500', temporal: 'bg-amber-500', grupo_temporal: 'bg-orange-500' };

  return (
    <div className="h-full flex flex-col bg-neutral-base overflow-hidden animate-fade-in">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 pb-32">

        {/* ─── GLOBAL STATS ROW ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-5 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col justify-between min-h-[7rem]"
            onClick={() => onNavigate(AppView.STUDENTS)}
            style={{ cursor: 'pointer' }}>
            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Alumnos Totales</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[36px] font-black text-neutral-textMain">{globalStats.totalStudents}</span>
              <span className="text-[11px] font-bold text-green-500">{globalStats.activeStudents} activos</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col justify-between min-h-[7rem]">
            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Pendientes de pago</p>
            <span className={`text-[36px] font-black ${globalStats.pendingStudents > 0 ? 'text-red-500' : 'text-green-500'}`}>{globalStats.pendingStudents}</span>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col justify-between min-h-[7rem]"
            onClick={() => onNavigate(AppView.PIECES)}
            style={{ cursor: 'pointer' }}>
            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Piezas en proceso</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[36px] font-black text-brand">{globalStats.piecesInProgress}</span>
              {globalStats.piecesReady > 0 && (
                <span className="text-[11px] font-bold text-green-500">{globalStats.piecesReady} a recoger</span>
              )}
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col justify-between min-h-[7rem]">
            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Sesiones Totales</p>
            <span className="text-[36px] font-black text-neutral-textMain">{globalStats.totalSessions}</span>
          </div>
          {/* Today's metrics */}
          <div className="bg-white p-5 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col justify-between min-h-[7rem]">
            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Alumnos Hoy</p>
            <span className="text-[36px] font-black text-neutral-textMain">{todayStats.totalAlumnos}</span>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col justify-between min-h-[7rem]">
            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Sesiones Hoy</p>
            <span className="text-[36px] font-black text-neutral-textMain">{todayStats.totalSessions}</span>
          </div>
        </div>

        {/* ─── STUDENT CATEGORIES ROW ─── */}
        {globalStats.totalStudents > 0 && (
          <div className="flex flex-wrap gap-3 mb-8">
            {Object.entries(globalStats.byCategory).filter(([, count]) => (count as number) > 0).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-neutral-border soft-shadow">
                <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat] || 'bg-neutral-border'}`}></div>
                <span className="text-[10px] font-extrabold text-neutral-textMain uppercase tracking-widest">{CATEGORY_LABELS[cat] || cat}</span>
                <span className="text-[10px] font-black text-neutral-textHelper">{count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ─── TODAY TIMELINE (Left Column) ─── */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                <h4 className="text-[16px] font-extrabold text-neutral-textMain uppercase tracking-widest">Agenda de Hoy</h4>
              </div>
              <button onClick={() => onNavigate(AppView.CALENDAR)} className="text-[11px] font-extrabold text-brand uppercase hover:underline tracking-widest">
                Ver Calendario Completo
              </button>
            </div>

            <div className="space-y-4">
              {todaySessions.length === 0 ? (
                <div className="bg-white/40 border-2 border-dashed border-neutral-border p-12 rounded-[2.5rem] text-center">
                  <p className="text-neutral-textHelper font-light uppercase text-[12px] tracking-widest">No hay sesiones programadas para hoy</p>
                  <button onClick={() => onNavigate(AppView.CALENDAR)} className="mt-4 px-6 py-3 bg-brand text-white text-[11px] font-extrabold uppercase tracking-widest rounded-full hover:bg-brand-hover transition-all">
                    Crear Sesión
                  </button>
                </div>
              ) : (
                todaySessions.map(session => {
                  const capacity = session.classType === 'torno' ? DEFAULT_CAPACITY_TORNO : DEFAULT_CAPACITY_MESA;
                  const isFull = session.students.length >= capacity;
                  return (
                    <div key={session.id} className="bg-white p-6 rounded-[2.5rem] border border-neutral-border soft-shadow flex items-center justify-between group hover:border-brand transition-all">
                      <div className="flex items-center gap-6">
                        <div className="text-center min-w-[60px]">
                          <p className="text-[18px] font-black text-neutral-textMain leading-none">{session.startTime}</p>
                          <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase mt-1 tracking-tighter">INICIO</p>
                        </div>
                        <div className="h-8 w-[1px] bg-neutral-alt"></div>
                        <div>
                          <p className="text-[15px] font-extrabold text-neutral-textMain uppercase tracking-tight">{getSessionTypeLabel(session.classType)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold uppercase ${isFull ? 'text-red-500' : 'text-green-500'}`}>
                              {session.students.length}/{capacity} {isFull ? 'Completo' : 'Lugares'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex -space-x-2">
                          {session.students.slice(0, 3).map((st, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-neutral-alt border-2 border-white flex items-center justify-center text-[10px] font-black text-neutral-textSec">
                              {st.charAt(0)}
                            </div>
                          ))}
                          {session.students.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-brand/10 border-2 border-white flex items-center justify-center text-[10px] font-black text-brand">
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
            {alerts.length > 0 && (
              <section className="space-y-4 mt-8">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-1.5 h-6 bg-red-400 rounded-full"></div>
                  <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Alertas</h4>
                  <span className="text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest">({alerts.length})</span>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {alerts.map((alert, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${alert.type === 'critical' ? 'bg-red-50 border-red-100' : alert.type === 'warning' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                      <div>
                        <p className="text-[13px] font-black text-neutral-textMain uppercase tracking-tight">{alert.name}</p>
                        <p className={`text-[11px] font-medium ${alert.type === 'critical' ? 'text-red-600' : alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'}`}>{alert.reason}</p>
                      </div>
                      {alert.id && (
                        <button onClick={() => onOpenStudentProfile(alert.id)} className="text-[10px] font-black uppercase text-neutral-textMain hover:underline shrink-0">
                          Ver Ficha
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ─── RIGHT COLUMN: Students + Attendance ─── */}
          <div className="lg:col-span-5 space-y-8">

            {/* TODAY ATTENDANCE — only if there are sessions */}
            {todayStudentList.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
                    <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Asistencia Hoy</h4>
                  </div>
                  <span className="text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-widest">{todayStudentList.length} alumnos</span>
                </div>
                <div className="bg-white rounded-[2.5rem] border border-neutral-border soft-shadow overflow-hidden flex flex-col max-h-[300px]">
                  <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
                    {todayStudentList.map((item, i) => {
                      const sessionObj = todaySessions.find(s => s.startTime === item.time && s.students.includes(item.name));
                      return (
                        <div key={i} className="flex items-center justify-between p-3 border-b border-neutral-alt last:border-0">
                          <div className="flex flex-col overflow-hidden mr-2">
                            <span className="text-[13px] font-black text-neutral-textMain uppercase truncate leading-tight">{item.name.toLowerCase()}</span>
                            <span className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest mt-1">{item.time} • {item.type}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => sessionObj && handleAttendance(sessionObj, item.name, 'present')}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${item.status === 'present' ? 'bg-green-500 text-white shadow-md' : 'bg-neutral-alt text-neutral-textHelper hover:bg-green-100 hover:text-green-600'}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                              onClick={() => sessionObj && handleAttendance(sessionObj, item.name, 'absent')}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${item.status === 'absent' ? 'bg-red-400 text-white shadow-md' : 'bg-neutral-alt text-neutral-textHelper hover:bg-red-100 hover:text-red-500'}`}
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
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-neutral-textMain rounded-full"></div>
                  <h4 className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-widest">Directorio Alumnos</h4>
                </div>
                <span className="text-[11px] font-extrabold text-neutral-textHelper uppercase tracking-widest">{students.length} Total</span>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-neutral-border soft-shadow overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-4 border-b border-neutral-alt shrink-0">
                  <input
                    type="text"
                    placeholder="BUSCAR POR NOMBRE..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-sec px-5 py-3 rounded-xl text-[12px] font-extrabold uppercase outline-none focus:bg-neutral-alt transition-all"
                  />
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-1">
                  {filteredStudents.length === 0 ? (
                    <p className="text-center py-8 text-[12px] text-neutral-textHelper uppercase font-light tracking-widest italic">Sin resultados</p>
                  ) : (
                    filteredStudents.map((student) => {
                      const fullName = `${student.name} ${student.surname || ''}`.trim();
                      const isPending = student.status === 'needs_renewal' || student.classesRemaining <= 0;
                      const cat = student.studentCategory || 'regular';
                      return (
                        <div
                          key={student.id}
                          onClick={() => onOpenStudentProfile(student.id)}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-alt cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-[11px] shrink-0 ${CATEGORY_COLORS[cat]}`}>
                              {student.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[12px] font-black text-neutral-textMain uppercase truncate leading-tight">{fullName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] font-extrabold text-neutral-textHelper uppercase tracking-widest">{CATEGORY_LABELS[cat]}</span>
                                {student.groupName && (
                                  <span className="text-[8px] font-extrabold text-neutral-textSec uppercase">• {student.groupName}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] font-black ${isPending ? 'text-red-500' : 'text-green-500'}`}>
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
