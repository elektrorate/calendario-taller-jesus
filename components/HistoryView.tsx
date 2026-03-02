
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Student, ClassSession, CeramicPiece, GiftCard } from '../types';

interface HistoryViewProps {
  students: Student[];
  sessions: ClassSession[];
  pieces: CeramicPiece[];
  giftCards: GiftCard[];
}

// Constantes de categorías
const CATEGORY_LABELS: Record<string, string> = {
  membresia: 'Membresía',
  iniciacion: 'Iniciación',
  grupal: 'Grupal',
  temporal: 'Temporal',
  grupo_temporal: 'Grupo Temporal'
};

const CATEGORY_COLORS: Record<string, string> = {
  membresia: 'bg-brand text-white',
  iniciacion: 'bg-blue-500 text-white',
  grupal: 'bg-purple-500 text-white',
  temporal: 'bg-amber-500 text-white',
  grupo_temporal: 'bg-orange-500 text-white'
};

type CategoryFilter = 'todos' | 'membresia' | 'iniciacion' | 'grupal' | 'temporal' | 'grupo_temporal';
const SEARCH_DEBOUNCE_MS = 250;
const SIDEBAR_PAGE_SIZE = 80;
const SIDEBAR_WINDOW_SIZE = 24;
const SIDEBAR_OVERSCAN = 8;
const APPROX_ROW_HEIGHT = 92;
const isTemporaryCategory = (category?: string) =>
  category === 'temporal' || category === 'grupo_temporal' || category === 'grupal';
const getDisplayCategory = (category?: string) => (isTemporaryCategory(category) ? 'temporal' : (category || 'membresia'));

type ExtendedCategoryFilter = 'todos' | 'membresia' | 'iniciacion' | 'temporal' | 'bonos_especiales';

const HistoryView: React.FC<HistoryViewProps> = ({ students, sessions, pieces, giftCards }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ExtendedCategoryFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(SIDEBAR_PAGE_SIZE);
  const [listScrollTop, setListScrollTop] = useState(0);
  const studentListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

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

  const normalizeIdentity = (value?: string) => {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const formatGiftCardDate = (dateValue?: string) => {
    if (!dateValue) return 'Sin fecha';
    return new Date(dateValue).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const studentDetails = useMemo(() => {
    if (!selectedStudentId) return null;
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;
    
    const fullName = `${student.name} ${student.surname || ''}`.trim();
    const upperFullName = fullName.toUpperCase();
    const upperNameOnly = student.name.toUpperCase();
    const normalizedFullName = normalizeIdentity(fullName);
    const normalizedNameOnly = normalizeIdentity(student.name);
    const normalizedSurname = normalizeIdentity(student.surname);
    const studentIsTemporary = isTemporaryCategory(student.studentCategory);
    
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

    const studentGiftCards = giftCards
      .filter(card => {
        if (!studentIsTemporary) return false;
        if (card.recipientStudentId) {
          return card.recipientStudentId === student.id;
        }
        const recipient = normalizeIdentity(card.recipient);
        if (!recipient) return false;
        if (recipient === normalizedFullName || recipient === normalizedNameOnly) return true;
        if (recipient.includes(normalizedFullName) || normalizedFullName.includes(recipient)) return true;
        if (normalizedSurname && recipient.includes(normalizedNameOnly) && recipient.includes(normalizedSurname)) return true;
        return false;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const activeGiftCards = studentGiftCards.filter(card => !isExpired(card.expiryDate));
    return {
      student,
      fullName,
      isTemporary: studentIsTemporary,
      sessions: studentSessions,
      pieces: studentPieces,
      giftCards: studentGiftCards,
      activeGiftCards
    };
  }, [selectedStudentId, students, sessions, pieces, giftCards]);

  const bonusSpecialStudentIds = useMemo(() => {
    const ids = new Set<string>();
    const temporaryStudents = students.filter(s => isTemporaryCategory(s.studentCategory)).map(s => ({
      id: s.id,
      normalizedFullName: normalizeIdentity(`${s.name} ${s.surname || ''}`),
      normalizedNameOnly: normalizeIdentity(s.name),
      normalizedSurname: normalizeIdentity(s.surname)
    }));

    giftCards.forEach(card => {
      if (card.recipientStudentId) {
        const matchedStudent = students.find(s => s.id === card.recipientStudentId);
        if (matchedStudent && isTemporaryCategory(matchedStudent.studentCategory)) {
          ids.add(matchedStudent.id);
        }
        return;
      }

      const recipient = normalizeIdentity(card.recipient);
      if (!recipient) return;
      const matched = temporaryStudents.filter(s => {
        if (recipient === s.normalizedFullName || recipient === s.normalizedNameOnly) return true;
        if (recipient.includes(s.normalizedFullName) || s.normalizedFullName.includes(recipient)) return true;
        if (s.normalizedSurname && recipient.includes(s.normalizedNameOnly) && recipient.includes(s.normalizedSurname)) return true;
        return false;
      });
      if (matched.length === 1) ids.add(matched[0].id);
    });

    return ids;
  }, [giftCards, students]);

  // Filtrar alumnos por categoría y búsqueda
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const cat = s.studentCategory || 'membresia';
      const isTemporary = isTemporaryCategory(cat);
      const matchesCategory = categoryFilter === 'todos'
        || (categoryFilter === 'membresia' && cat === 'membresia')
        || (categoryFilter === 'iniciacion' && cat === 'iniciacion')
        || (categoryFilter === 'temporal' && isTemporary)
        || (categoryFilter === 'bonos_especiales' && isTemporary && bonusSpecialStudentIds.has(s.id));
      const fullName = `${s.name} ${s.surname || ''}`.trim().toLowerCase();
      const matchesSearch = !debouncedSearchQuery
        || fullName.includes(debouncedSearchQuery)
        || (s.groupName && s.groupName.toLowerCase().includes(debouncedSearchQuery));
      return matchesCategory && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, categoryFilter, debouncedSearchQuery, bonusSpecialStudentIds]);

  useEffect(() => {
    if (!selectedStudentId) return;
    const stillVisible = filteredStudents.some(s => s.id === selectedStudentId);
    if (!stillVisible) {
      setSelectedStudentId(filteredStudents.length ? filteredStudents[0].id : null);
    }
  }, [filteredStudents, selectedStudentId]);

  useEffect(() => {
    setVisibleCount(SIDEBAR_PAGE_SIZE);
    setListScrollTop(0);
    if (studentListRef.current) {
      studentListRef.current.scrollTop = 0;
    }
  }, [categoryFilter, debouncedSearchQuery, students.length]);

  const canLoadMore = visibleCount < filteredStudents.length;
  const visibleStudents = useMemo(
    () => filteredStudents.slice(0, visibleCount),
    [filteredStudents, visibleCount]
  );

  const loadMoreStudents = useCallback(() => {
    if (!canLoadMore) return;
    setVisibleCount(prev => Math.min(prev + SIDEBAR_PAGE_SIZE, filteredStudents.length));
  }, [canLoadMore, filteredStudents.length]);

  const handleSidebarScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setListScrollTop(target.scrollTop);

    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 220;
    if (nearBottom) {
      loadMoreStudents();
    }
  }, [loadMoreStudents]);

  const virtualStartIndex = Math.max(0, Math.floor(listScrollTop / APPROX_ROW_HEIGHT) - SIDEBAR_OVERSCAN);
  const virtualEndIndex = Math.min(
    visibleStudents.length,
    virtualStartIndex + SIDEBAR_WINDOW_SIZE + SIDEBAR_OVERSCAN * 2
  );
  const virtualTopSpacer = virtualStartIndex * APPROX_ROW_HEIGHT;
  const virtualBottomSpacer = Math.max(0, (visibleStudents.length - virtualEndIndex) * APPROX_ROW_HEIGHT);
  const virtualStudents = visibleStudents.slice(virtualStartIndex, virtualEndIndex);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-base px-6 py-4">
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-8 pb-10">
        {/* BARRA LATERAL DE ALUMNOS */}
        <aside className="w-full lg:w-96 flex flex-col shrink-0 bg-white rounded-[2.5rem] border border-neutral-border soft-shadow overflow-hidden">
          <div className="p-5 border-b border-neutral-border bg-neutral-sec/30 space-y-4">
            <h3 className="text-[12px] font-extrabold text-neutral-textMain uppercase tracking-widest">Listado de Alumnos</h3>
            {/* Búsqueda */}
            <input
              type="text"
              placeholder="Buscar por nombre o grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-border rounded-xl text-[11px] font-medium focus:border-brand outline-none transition-all"
            />
            {/* Filtros por categoría */}
            <div className="flex flex-wrap gap-1.5">
              {(['todos', 'membresia', 'iniciacion', 'temporal', 'bonos_especiales'] as ExtendedCategoryFilter[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border transition-all ${
                    categoryFilter === cat
                      ? (cat === 'todos'
                        ? 'bg-neutral-textMain text-white border-neutral-textMain'
                        : cat === 'bonos_especiales'
                          ? 'bg-brand text-white border-transparent'
                          : CATEGORY_COLORS[cat] + ' border-transparent')
                      : 'bg-white text-neutral-textHelper border-neutral-border hover:border-neutral-textHelper'
                  }`}
                >
                  {cat === 'todos' ? 'Todos' : cat === 'bonos_especiales' ? 'Bonos especiales' : CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
          <div
            ref={studentListRef}
            onScroll={handleSidebarScroll}
            className="flex-1 overflow-y-auto custom-scrollbar p-4"
          >
            {filteredStudents.length === 0 ? (
              <p className="text-center py-8 text-[11px] text-neutral-textHelper uppercase font-light italic">Sin resultados</p>
            ) : (
              <>
                <div style={{ height: virtualTopSpacer }} />
                <div className="space-y-2">
                  {virtualStudents.map(s => {
                const cat = s.studentCategory || 'membresia';
                const displayCat = getDisplayCategory(cat);
                const isTemporary = isTemporaryCategory(cat);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between group ${selectedStudentId === s.id ? (isTemporary ? 'bg-amber-500 text-white border-amber-500' : 'bg-brand text-white border-brand') + ' soft-shadow' : 'bg-transparent border-transparent text-neutral-textSec hover:bg-neutral-alt'}`}
                  >
                    <div className="overflow-hidden flex-1">
                      <p className={`font-extrabold text-[13px] uppercase tracking-tight truncate ${selectedStudentId === s.id ? 'text-white' : 'text-neutral-textMain'}`}>{s.name} {s.surname || ''}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest ${selectedStudentId === s.id ? 'text-white/80' : 'text-neutral-textHelper'}`}>
                          {CATEGORY_LABELS[displayCat]}
                        </span>
                        {s.groupName && (
                          <span className={`text-[9px] font-light ${selectedStudentId === s.id ? 'text-white/70' : 'text-neutral-textSec'}`}>
                            • {s.groupName}
                          </span>
                        )}
                      </div>
                      {/* Info rápida para temporales */}
                      {isTemporary && (
                        <div className={`flex items-center gap-2 mt-1 text-[9px] ${selectedStudentId === s.id ? 'text-white/70' : 'text-neutral-textSec'}`}>
                          <span>{s.classesRemaining} clases</span>
                          {s.expiryDate && (
                            <span className={isExpired(s.expiryDate) ? 'text-red-400' : ''}>
                              • Exp: {formatExpiryDate(s.expiryDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <svg className={`w-5 h-5 shrink-0 ${selectedStudentId === s.id ? 'text-white' : 'text-neutral-border group-hover:text-brand'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </button>
                );
                  })}
                </div>
                <div style={{ height: virtualBottomSpacer }} />
                {canLoadMore && (
                  <div className="py-3 text-center text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">
                    Cargando más alumnos...
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* CONTENIDO DEL HISTORIAL */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
          {studentDetails ? (
            <div className="animate-fade-in space-y-10">
              {/* CABECERA ALUMNO */}
              {(() => {
                const cat = studentDetails.student.studentCategory || 'membresia';
                const displayCat = getDisplayCategory(cat);
                const isTemporary = studentDetails.isTemporary;
                const expired = isExpired(studentDetails.student.expiryDate);
                return (
                  <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-neutral-border soft-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                      <div>
                        <span className="text-[10px] font-extrabold text-brand uppercase tracking-[0.2em] mb-2 block">REGISTRO INTEGRAL</span>
                        <h3 className="text-[32px] md:text-[42px] font-extrabold text-neutral-textMain uppercase tracking-tight leading-none">{studentDetails.fullName}</h3>
                        <div className="flex flex-wrap gap-3 mt-4">
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${CATEGORY_COLORS[displayCat]}`}>
                            {CATEGORY_LABELS[displayCat]}
                          </span>
                          {studentDetails.student.groupName && (
                            <span className="px-3 py-1.5 bg-neutral-sec border border-neutral-border rounded-full text-[10px] font-extrabold uppercase tracking-widest text-neutral-textSec">
                              {studentDetails.student.groupName}
                            </span>
                          )}
                          <span className="px-3 py-1.5 bg-neutral-sec border border-neutral-border rounded-full text-[10px] font-extrabold uppercase tracking-widest text-neutral-textSec">
                            {studentDetails.student.classType || 'General'}
                          </span>
                        </div>
                      </div>
                      {/* KPIs principales */}
                      <div className={`grid grid-cols-2 ${isTemporary ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 w-full md:w-auto`}>
                        <div className={`p-4 rounded-2xl border text-center min-w-[100px] ${studentDetails.student.classesRemaining <= 1 ? 'bg-red-50 border-red-100' : 'bg-neutral-sec border-neutral-border'}`}>
                          <p className={`text-[24px] font-extrabold ${studentDetails.student.classesRemaining <= 1 ? 'text-red-500' : 'text-neutral-textMain'}`}>{studentDetails.student.classesRemaining}</p>
                          <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Clases Rest.</p>
                        </div>
                        <div className="bg-neutral-sec p-4 rounded-2xl border border-neutral-border text-center min-w-[100px]">
                          <p className="text-[24px] font-extrabold text-neutral-textMain">{studentDetails.sessions.length}</p>
                          <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Sesiones</p>
                        </div>
                        <div className="bg-neutral-sec p-4 rounded-2xl border border-neutral-border text-center min-w-[100px]">
                          <p className="text-[24px] font-extrabold text-neutral-textMain">{studentDetails.pieces.length}</p>
                          <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Piezas</p>
                        </div>
                        {isTemporary && (
                          <div className="bg-neutral-sec p-4 rounded-2xl border border-neutral-border text-center min-w-[100px]">
                            <p className="text-[24px] font-extrabold text-neutral-textMain">{studentDetails.giftCards.length}</p>
                            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Bonos</p>
                            {studentDetails.giftCards.length > 0 && (
                              <p className="text-[9px] font-bold text-green-600 mt-1">
                                {studentDetails.activeGiftCards.length} vig.
                              </p>
                            )}
                          </div>
                        )}
                        {studentDetails.student.expiryDate && (
                          <div className={`p-4 rounded-2xl border text-center min-w-[100px] ${expired ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <p className={`text-[13px] font-extrabold ${expired ? 'text-red-500' : 'text-green-600'}`}>
                              {formatExpiryDate(studentDetails.student.expiryDate)}
                            </p>
                            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">
                              {expired ? 'Expirado' : 'Expira'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Info adicional para temporales */}
                    {isTemporary && studentDetails.student.price && (
                      <div className="pt-4 border-t border-neutral-border flex flex-wrap gap-6">
                        <div>
                          <span className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Precio Bono</span>
                          <p className="text-[16px] font-extrabold text-neutral-textMain">{studentDetails.student.price}€</p>
                        </div>
                        {studentDetails.student.paymentMethod && (
                          <div>
                            <span className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">Método Pago</span>
                            <p className="text-[16px] font-extrabold text-neutral-textMain">{studentDetails.student.paymentMethod}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {studentDetails.isTemporary && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-6 bg-[#CB7859] rounded-full"></div>
                    <h4 className="text-[16px] font-extrabold text-neutral-textMain uppercase tracking-widest">Bonos de Regalo</h4>
                  </div>
                  {studentDetails.giftCards.length === 0 ? (
                    <div className="bg-white/50 p-8 rounded-[2.5rem] border border-dashed border-neutral-border text-center">
                      <p className="text-neutral-textHelper font-light uppercase text-xs tracking-widest">Sin bonos asociados a este perfil</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {studentDetails.giftCards.map(card => {
                        const expiredCard = isExpired(card.expiryDate);
                        return (
                          <div key={card.id} className="bg-white p-5 rounded-[2rem] border border-neutral-border soft-shadow flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-[14px] font-extrabold text-neutral-textMain uppercase tracking-tight">
                                {card.type} · {card.numClasses} clases
                              </p>
                              <p className="text-[10px] font-bold text-neutral-textHelper uppercase tracking-widest">
                                Emitido: <span className="text-neutral-textSec">{formatGiftCardDate(card.createdAt)}</span>
                              </p>
                              {card.scheduledDate && (
                                <p className="text-[10px] font-bold text-neutral-textHelper uppercase tracking-widest">
                                  Cita: <span className="text-neutral-textSec">{formatGiftCardDate(card.scheduledDate)}</span>
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`text-[11px] font-extrabold uppercase tracking-widest ${expiredCard ? 'text-red-500' : 'text-green-600'}`}>
                                {expiredCard ? 'Expirado' : 'Vigente'}
                              </p>
                              <p className={`text-[12px] font-extrabold ${expiredCard ? 'text-red-500' : 'text-neutral-textMain'}`}>
                                {formatGiftCardDate(card.expiryDate)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

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
