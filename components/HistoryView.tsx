
import React, { useState, useMemo } from 'react';
import { Student, ClassSession, CeramicPiece, AppView } from '../types';

interface HistoryViewProps {
  students: Student[];
  sessions: ClassSession[];
  pieces: CeramicPiece[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ students, sessions, pieces }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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

  const studentDetails = useMemo(() => {
    if (!selectedStudentId) return null;
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;
    
    const fullName = `${student.name} ${student.surname || ''}`.trim();
    const upperFullName = fullName.toUpperCase();
    const upperNameOnly = student.name.toUpperCase();
    
    // Filtrar sesiones donde el alumno participó (coincidencia de nombre)
    const studentSessions = sessions.filter(s => 
      s.students.some(name => {
        const key = name.toUpperCase();
        return key === upperFullName || key === upperNameOnly;
      })
    ).sort((a, b) => b.date.localeCompare(a.date));

    // Filtrar piezas del alumno
    const studentPieces = pieces.filter(p => 
      p.owner.toUpperCase() === upperFullName
    ).sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || ''));

    return { student, fullName, sessions: studentSessions, pieces: studentPieces };
  }, [selectedStudentId, students, sessions, pieces]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-base px-6 py-4">
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-8 pb-10">
        {/* BARRA LATERAL DE ALUMNOS */}
        <aside className="w-full lg:w-80 flex flex-col shrink-0 bg-white rounded-[2.5rem] border border-neutral-border soft-shadow overflow-hidden">
          <div className="p-6 border-b border-neutral-border bg-neutral-sec/30">
            <h3 className="text-[12px] font-extrabold text-neutral-textMain uppercase tracking-widest">Listado de Alumnos</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between group ${selectedStudentId === s.id ? 'bg-brand text-white border-brand soft-shadow' : 'bg-transparent border-transparent text-neutral-textSec hover:bg-neutral-alt'}`}
              >
                <div className="overflow-hidden">
                  <p className={`font-extrabold text-[14px] uppercase tracking-tight truncate ${selectedStudentId === s.id ? 'text-white' : 'text-neutral-textMain'}`}>{s.name} {s.surname || ''}</p>
                  <p className={`text-[10px] font-light uppercase tracking-widest ${selectedStudentId === s.id ? 'text-white/80' : 'text-neutral-textHelper'}`}>
                    {s.classType || 'General'}
                  </p>
                </div>
                <svg className={`w-5 h-5 shrink-0 ${selectedStudentId === s.id ? 'text-white' : 'text-neutral-border group-hover:text-brand'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        </aside>

        {/* CONTENIDO DEL HISTORIAL */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
          {studentDetails ? (
            <div className="animate-fade-in space-y-10">
              {/* CABECERA ALUMNO */}
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-neutral-border soft-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <span className="text-[10px] font-extrabold text-brand uppercase tracking-[0.2em] mb-2 block">REGISTRO INTEGRAL</span>
                   <h3 className="text-[32px] md:text-[42px] font-extrabold text-neutral-textMain uppercase tracking-tight leading-none">{studentDetails.fullName}</h3>
                   <div className="flex gap-4 mt-4">
                      <span className="px-3 py-1 bg-neutral-sec border border-neutral-border rounded-full text-[10px] font-extrabold uppercase tracking-widest text-neutral-textSec">
                        {studentDetails.student.classType}
                      </span>
                      <span className="px-3 py-1 bg-brand/10 border border-brand/20 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-brand">
                        ID: {studentDetails.student.id.toUpperCase()}
                      </span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                   <div className="bg-neutral-sec p-4 rounded-2xl border border-neutral-border text-center min-w-[120px]">
                      <p className="text-[24px] font-extrabold text-neutral-textMain">{studentDetails.sessions.length}</p>
                      <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Sesiones</p>
                   </div>
                   <div className="bg-neutral-sec p-4 rounded-2xl border border-neutral-border text-center min-w-[120px]">
                      <p className="text-[24px] font-extrabold text-neutral-textMain">{studentDetails.pieces.length}</p>
                      <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Piezas</p>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                 {/* COLUMNA SESIONES (TIMELINE) */}
                 <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                       <h4 className="text-[16px] font-extrabold text-neutral-textMain uppercase tracking-widest">Historial de Clases</h4>
                    </div>
                    <div className="space-y-4">
                       {studentDetails.sessions.length === 0 ? (
                         <div className="bg-white/50 p-10 rounded-[2.5rem] border border-dashed border-neutral-border text-center">
                            <p className="text-neutral-textHelper font-light uppercase text-xs tracking-widest">No se registran asistencias aún</p>
                         </div>
                       ) : (
                         studentDetails.sessions.map(s => {
                            const attendanceKey = studentDetails.fullName.toUpperCase();
                            const nameKey = studentDetails.student.name.toUpperCase();
                            const status = s.attendance?.[attendanceKey] || s.attendance?.[nameKey] || 'pending';
                            return (
                               <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-neutral-border soft-shadow flex justify-between items-center group hover:border-brand transition-all">
                                  <div className="flex flex-col">
                                     <p className="text-[15px] font-extrabold text-neutral-textMain uppercase tracking-tight">{formatSessionDate(s.date)}</p>
                                     <p className="text-[11px] font-light text-neutral-textSec mt-1">{s.startTime} - {s.endTime} • {s.classType.toUpperCase()}</p>
                                  </div>
                                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${status === 'present' ? 'bg-green-100 text-green-600' : status === 'absent' ? 'bg-red-100 text-red-500' : 'bg-neutral-alt text-neutral-textHelper'}`}>
                                     {status === 'present' ? 'Asistió' : status === 'absent' ? 'Faltó' : 'Pendiente'}
                                  </div>
                               </div>
                            );
                         })
                       )}
                    </div>
                 </section>

                 {/* COLUMNA PIEZAS (PORTFOLIO) */}
                 <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                       <div className="w-1.5 h-6 bg-[#3D3437] rounded-full"></div>
                       <h4 className="text-[16px] font-extrabold text-neutral-textMain uppercase tracking-widest">Catálogo de Producción</h4>
                    </div>
                    <div className="space-y-4">
                       {studentDetails.pieces.length === 0 ? (
                         <div className="bg-white/50 p-10 rounded-[2.5rem] border border-dashed border-neutral-border text-center">
                            <p className="text-neutral-textHelper font-light uppercase text-xs tracking-widest">No hay piezas registradas</p>
                         </div>
                       ) : (
                         studentDetails.pieces.map(p => (
                            <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-neutral-border soft-shadow flex flex-col gap-3 group hover:border-[#3D3437] transition-all">
                               <div className="flex justify-between items-start">
                                  <p className="text-[16px] font-extrabold text-neutral-textMain uppercase tracking-tight leading-tight">{p.description}</p>
                                  <span className={`shrink-0 px-3 py-1 rounded-lg text-[8px] font-extrabold uppercase tracking-widest text-white ${p.status === 'entregado' ? 'bg-neutral-textHelper' : 'bg-brand'}`}>
                                    {p.status.replace('_', ' ').toUpperCase()}
                                  </span>
                               </div>
                               <div className="flex items-center gap-4 text-[11px] font-light text-neutral-textSec border-t border-neutral-alt pt-3">
                                  <div className="flex items-center gap-1.5">
                                     <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>
                                     <span>{p.glazeType || 'Sin esmalte'}</span>
                                  </div>
                                  {p.status === 'entregado' && (
                                     <span className="text-green-600 font-extrabold">✓ ENTREGADA</span>
                                  )}
                               </div>
                            </div>
                         ))
                       )}
                    </div>
                 </section>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[4rem] border border-dashed border-neutral-border/60">
               <div className="w-24 h-24 bg-neutral-sec rounded-full flex items-center justify-center mb-8">
                  <svg className="w-12 h-12 text-neutral-textHelper" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
               </div>
               <h3 className="text-[24px] font-extrabold text-neutral-textMain uppercase tracking-tight mb-2">Selecciona un Perfil</h3>
               <p className="text-neutral-textSec font-light max-w-xs mx-auto">Explora el registro histórico de clases y piezas de cada alumno del taller.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HistoryView;
