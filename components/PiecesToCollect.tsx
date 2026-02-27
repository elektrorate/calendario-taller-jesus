import React, { useState, useMemo } from 'react';
import { CeramicPiece, PieceStatus, Student } from '../types';
import { ConfirmModal } from './shared/ConfirmModal';

// ─── Category visual helpers ───
const CATEGORY_LABELS: Record<string, string> = {
  regular: 'Regular',
  iniciacion: 'Iniciación',
  grupal: 'Grupal',
  temporal: 'Temporal',
  grupo_temporal: 'Grupo Temporal'
};
const CATEGORY_BADGE: Record<string, string> = {
  regular: 'bg-brand/10 text-brand border-brand/20',
  iniciacion: 'bg-blue-50 text-blue-600 border-blue-100',
  grupal: 'bg-purple-50 text-purple-600 border-purple-100',
  temporal: 'bg-amber-50 text-amber-700 border-amber-100',
  grupo_temporal: 'bg-orange-50 text-orange-600 border-orange-100'
};

// ─── PieceCard ───
interface PieceCardProps {
  piece: CeramicPiece;
  studentCategory?: string;
  groupName?: string;
  onEdit: (piece: CeramicPiece) => void;
  onUpdateStatus: (id: string, nextStatus: PieceStatus) => void;
  getStatusAction: (status: PieceStatus) => { label: string; next: PieceStatus } | null;
  getStatusLabel: (status: PieceStatus) => string;
  getStatusColor: (status: PieceStatus) => string;
  getPercentage: (status: PieceStatus) => number;
  isHistory?: boolean;
}

const PieceCard: React.FC<PieceCardProps> = ({ piece, studentCategory, groupName, onEdit, onUpdateStatus, getStatusAction, getStatusLabel, getStatusColor, getPercentage, isHistory }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const action = getStatusAction(piece.status);
  const COMMENT_LIMIT = 80;
  const hasLongComment = (piece.extraCommentary?.length || 0) > COMMENT_LIMIT;
  const displayText = isExpanded
    ? piece.extraCommentary
    : piece.extraCommentary?.slice(0, COMMENT_LIMIT) + (hasLongComment ? '...' : '');
  const progress = getPercentage(piece.status);
  const cat = studentCategory || 'regular';

  return (
    <div className={`bg-white rounded-[2rem] p-6 md:p-8 soft-shadow border border-neutral-border hover:border-brand-light transition-all relative flex flex-col group h-full overflow-hidden ${isHistory ? 'opacity-75' : ''}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-neutral-alt overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ease-out ${getStatusColor(piece.status)}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between items-start mb-4 pt-2">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-inner shrink-0 ${getStatusColor(piece.status)}`}>
            {piece.owner.charAt(0)}
          </div>
          <div>
            <h3 className="font-extrabold text-neutral-textMain text-[17px] leading-tight uppercase tracking-tight line-clamp-1 pr-4">
              {piece.owner}
            </h3>
            <p className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest mt-1">#ID-{piece.id.slice(-4).toUpperCase()}</p>
          </div>
        </div>
        <button onClick={() => onEdit(piece)} className="text-neutral-textHelper hover:text-brand transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      </div>

      {/* Category badge */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[8px] font-extrabold uppercase tracking-widest border ${CATEGORY_BADGE[cat] || 'bg-neutral-alt text-neutral-textHelper border-neutral-border'}`}>
          {CATEGORY_LABELS[cat] || cat}
        </span>
        {groupName && (
          <span className="inline-block px-2.5 py-0.5 rounded-lg text-[8px] font-extrabold uppercase tracking-widest bg-neutral-sec text-neutral-textHelper border border-neutral-border">
            {groupName}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <p className="text-[16px] font-light text-neutral-textMain mb-4 leading-snug">
          {piece.description}
        </p>

        {piece.glazeType && (
          <div className="mb-4 inline-flex items-center gap-2 px-2.5 py-1 bg-brand/5 border border-brand/10 rounded-lg self-start">
            <span className="text-[9px] font-extrabold text-brand uppercase tracking-wider">ESMALTE:</span>
            <span className="text-[12px] font-light text-neutral-textMain uppercase">{piece.glazeType}</span>
          </div>
        )}

        {piece.extraCommentary && (
          <div className="mb-6 p-4 bg-neutral-sec/50 rounded-2xl border border-neutral-border/30">
            <p className="text-[13px] font-light text-neutral-textSec italic leading-snug">
              "{displayText}"
            </p>
            {hasLongComment && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="mt-2 text-[9px] font-extrabold text-brand uppercase tracking-widest hover:underline">
                {isExpanded ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>
        )}

        {/* Delivery date for history items */}
        {isHistory && piece.deliveryDate && (
          <div className="mb-4 text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest">
            ENTREGADO: {new Date(piece.deliveryDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        )}

        <div className="mb-6 mt-auto">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-extrabold text-neutral-textHelper uppercase tracking-widest">ESTADO</span>
            <span className="text-[9px] font-extrabold text-neutral-textMain uppercase tracking-widest">{progress}%</span>
          </div>
          <span className={`inline-block w-full text-center px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border ${getStatusColor(piece.status)} text-white shadow-sm`}>
            {getStatusLabel(piece.status)}
          </span>
        </div>
      </div>

      <div className="pt-1">
        <button
          disabled={!action}
          onClick={() => action && onUpdateStatus(piece.id, action.next)}
          className={`w-full py-4 rounded-xl text-[12px] font-extrabold uppercase tracking-widest transition-all ${!action
            ? 'bg-neutral-alt text-neutral-textHelper cursor-not-allowed border border-neutral-border shadow-none opacity-50'
            : 'bg-neutral-textMain text-white hover:bg-black active:scale-[0.98] soft-shadow'
            }`}
        >
          {action ? action.label : 'FINALIZADO'}
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───
interface PiecesToCollectProps {
  pieces: CeramicPiece[];
  students: Student[];
  onAddPiece: (piece: Omit<CeramicPiece, 'id'>) => void;
  onUpdatePiece: (id: string, updates: Partial<CeramicPiece>) => void;
  onDeletePiece: (id: string) => void;
}

const PiecesToCollect: React.FC<PiecesToCollectProps> = ({ pieces, students, onAddPiece, onUpdatePiece, onDeletePiece }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingPiece, setEditingPiece] = useState<CeramicPiece | null>(null);
  const [filterStatus, setFilterStatus] = useState<PieceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [showHistory, setShowHistory] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'day' | 'week'>('all');
  const [dateValue, setDateValue] = useState<string>(new Date().toISOString().split('T')[0]);
  const [groupFilter, setGroupFilter] = useState<string>('todos');
  const [pieceToDelete, setPieceToDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    owner: '',
    description: '',
    status: '1era_quema' as PieceStatus,
    glazeType: '',
    deliveryDate: '',
    notes: '',
    extraCommentary: ''
  });

  const sortedStudents = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);

  // Map owner name → student for fast lookup
  const ownerStudentMap = useMemo(() => {
    const map: Record<string, Student> = {};
    students.forEach(s => {
      const fullName = `${s.name} ${s.surname || ''}`.trim().toUpperCase();
      map[fullName] = s;
    });
    return map;
  }, [students]);

  const getStudentForPiece = (piece: CeramicPiece): Student | undefined => {
    return ownerStudentMap[piece.owner.toUpperCase()];
  };

  // ─── Group names for filter ───
  const allGroupNames = useMemo(() => {
    const names = new Set<string>();
    students.forEach(s => { if (s.groupName) names.add(s.groupName); });
    return Array.from(names).sort();
  }, [students]);

  // ─── Date helpers ───
  const getWeekRange = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] };
  };

  const pieceMatchesDateFilter = (piece: CeramicPiece): boolean => {
    if (dateFilter === 'all') return true;
    // Use created_at or deliveryDate for date matching
    const pieceDate = piece.deliveryDate || piece.createdAt;
    if (!pieceDate) return true; // No date = show always
    const pDate = pieceDate.split('T')[0];
    if (dateFilter === 'day') return pDate === dateValue;
    if (dateFilter === 'week') {
      const { start, end } = getWeekRange(dateValue);
      return pDate >= start && pDate <= end;
    }
    return true;
  };

  // ─── Status helpers ───
  const getStatusLabel = (status: PieceStatus) => {
    switch (status) {
      case '1era_quema': return '1ª QUEMA';
      case 'esmaltado': return 'ESMALTADO';
      case 'a_recogida': return 'A RECOGIDA';
      case 'entregado': return 'ENTREGADO';
      default: return '';
    }
  };
  const getStatusColor = (status: PieceStatus) => {
    switch (status) {
      case '1era_quema': return 'bg-orange-400';
      case 'esmaltado': return 'bg-brand';
      case 'a_recogida': return 'bg-green-500';
      case 'entregado': return 'bg-neutral-textHelper';
      default: return 'bg-neutral-border';
    }
  };
  const getStatusAction = (status: PieceStatus) => {
    switch (status) {
      case '1era_quema': return { label: 'PASAR A ESMALTADO', next: 'esmaltado' as const };
      case 'esmaltado': return { label: 'LISTA PARA RECOGER', next: 'a_recogida' as const };
      case 'a_recogida': return { label: 'MARCAR ENTREGADO', next: 'entregado' as const };
      default: return null;
    }
  };
  const getPercentage = (status: PieceStatus) => {
    switch (status) {
      case '1era_quema': return 25;
      case 'esmaltado': return 50;
      case 'a_recogida': return 75;
      case 'entregado': return 100;
      default: return 0;
    }
  };

  // ─── Handlers ───
  const handleEditClick = (piece: CeramicPiece) => {
    setEditingPiece(piece);
    setForm({ owner: piece.owner, description: piece.description, status: piece.status, glazeType: piece.glazeType || '', deliveryDate: piece.deliveryDate || '', notes: piece.notes || '', extraCommentary: piece.extraCommentary || '' });
    setShowModal(true);
  };
  const handleCreateClick = () => {
    setEditingPiece(null);
    const defaultOwner = selectedOwner || (sortedStudents.length > 0 ? `${sortedStudents[0].name} ${sortedStudents[0].surname || ''}`.trim() : '');
    setForm({ owner: defaultOwner, description: '', status: '1era_quema', glazeType: '', deliveryDate: '', notes: '', extraCommentary: '' });
    setShowModal(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.owner) { alert("Por favor selecciona un propietario."); return; }
    if (editingPiece?.id) await onUpdatePiece(editingPiece.id, form);
    else await onAddPiece(form);
    setShowModal(false);
  };

  // ─── Search suggestions ───
  const ownerNames = useMemo(() => {
    const names = new Set<string>();
    pieces.forEach(p => names.add(p.owner));
    students.forEach(s => names.add(`${s.name} ${s.surname || ''}`.trim()));
    return Array.from(names).sort();
  }, [pieces, students]);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return ownerNames.filter(n => n.toLowerCase().includes(q)).slice(0, 8);
  }, [ownerNames, searchQuery]);

  // ─── Separate active vs history pieces ───
  const activePieces = useMemo(() => pieces.filter(p => p.status !== 'entregado'), [pieces]);
  const historyPieces = useMemo(() => pieces.filter(p => p.status === 'entregado'), [pieces]);

  // ─── Filtered ACTIVE pieces (excludes 'entregado') ───
  const filteredPieces = useMemo(() => {
    return activePieces.filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (selectedOwner && p.owner.toUpperCase() !== selectedOwner.toUpperCase()) return false;
      if (searchQuery.trim() && !selectedOwner) {
        const q = searchQuery.trim().toLowerCase();
        if (!p.owner.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== 'todos') {
        const student = getStudentForPiece(p);
        const cat = student?.studentCategory || 'regular';
        if (cat !== categoryFilter) return false;
      }
      if (groupFilter !== 'todos') {
        const student = getStudentForPiece(p);
        if (student?.groupName !== groupFilter) return false;
      }
      if (!pieceMatchesDateFilter(p)) return false;
      return true;
    });
  }, [activePieces, filterStatus, selectedOwner, searchQuery, categoryFilter, groupFilter, dateFilter, dateValue, ownerStudentMap]);

  // ─── Filtered HISTORY pieces ───
  const filteredHistoryPieces = useMemo(() => {
    return historyPieces.filter(p => {
      if (selectedOwner && p.owner.toUpperCase() !== selectedOwner.toUpperCase()) return false;
      if (searchQuery.trim() && !selectedOwner) {
        const q = searchQuery.trim().toLowerCase();
        if (!p.owner.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== 'todos') {
        const student = getStudentForPiece(p);
        const cat = student?.studentCategory || 'regular';
        if (cat !== categoryFilter) return false;
      }
      if (groupFilter !== 'todos') {
        const student = getStudentForPiece(p);
        if (student?.groupName !== groupFilter) return false;
      }
      if (!pieceMatchesDateFilter(p)) return false;
      return true;
    });
  }, [historyPieces, selectedOwner, searchQuery, categoryFilter, groupFilter, dateFilter, dateValue, ownerStudentMap]);

  // Group by status for section rendering (active only)
  const groupedPieces = useMemo(() => {
    const groups: Record<string, CeramicPiece[]> = { '1era_quema': [], 'esmaltado': [], 'a_recogida': [] };
    filteredPieces.forEach(p => {
      if (groups[p.status]) groups[p.status].push(p);
    });
    return groups;
  }, [filteredPieces]);

  // Selected owner's student info
  const selectedStudent = useMemo(() => {
    if (!selectedOwner) return null;
    return ownerStudentMap[selectedOwner.toUpperCase()] || null;
  }, [selectedOwner, ownerStudentMap]);

  const selectedOwnerPieceCount = useMemo(() => {
    if (!selectedOwner) return 0;
    return pieces.filter(p => p.owner.toUpperCase() === selectedOwner.toUpperCase()).length;
  }, [selectedOwner, pieces]);

  // Category counts for ACTIVE pieces only
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: activePieces.length, regular: 0, iniciacion: 0, grupal: 0, temporal: 0, grupo_temporal: 0 };
    activePieces.forEach(p => {
      const student = getStudentForPiece(p);
      const cat = student?.studentCategory || 'regular';
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [activePieces, ownerStudentMap]);

  // Week label
  const weekLabel = useMemo(() => {
    if (dateFilter !== 'week') return '';
    const { start, end } = getWeekRange(dateValue);
    const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [dateFilter, dateValue]);

  return (
    <div className="h-full flex flex-col overflow-hidden px-6 lg:px-10 bg-neutral-base">

      {/* ─── HEADER: Search + Filters ─── */}
      <header className="pt-8 shrink-0 space-y-5 mb-6">

        {/* Row 1: Search + New Piece */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <div className="flex items-center bg-white border border-neutral-border rounded-full soft-shadow overflow-hidden">
              <svg className="w-5 h-5 text-neutral-textHelper ml-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); if (!e.target.value.trim()) setSelectedOwner(null); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Buscar por nombre de alumno..."
                className="w-full px-4 py-3.5 bg-transparent text-[12px] font-extrabold uppercase tracking-widest outline-none"
              />
              {(searchQuery || selectedOwner) && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedOwner(null); }}
                  className="mr-4 text-neutral-textHelper hover:text-brand transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && !selectedOwner && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-border rounded-2xl soft-shadow z-30 overflow-hidden max-h-64 overflow-y-auto">
                {suggestions.map((name) => {
                  const student = ownerStudentMap[name.toUpperCase()];
                  const cat = student?.studentCategory || 'regular';
                  const pieceCount = pieces.filter(p => p.owner.toUpperCase() === name.toUpperCase()).length;
                  return (
                    <button
                      key={name}
                      onMouseDown={() => { setSelectedOwner(name); setSearchQuery(name); setShowSuggestions(false); }}
                      className="w-full text-left px-5 py-3.5 hover:bg-neutral-alt transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-extrabold text-sm shrink-0">
                          {name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[12px] font-extrabold text-neutral-textMain uppercase tracking-widest truncate">{name}</p>
                          <span className={`text-[8px] font-extrabold uppercase tracking-widest`} style={{ color: cat === 'regular' ? '#B7A67B' : cat === 'iniciacion' ? '#2563eb' : cat === 'grupal' ? '#9333ea' : cat === 'temporal' ? '#d97706' : '#ea580c' }}>
                            {CATEGORY_LABELS[cat] || 'Regular'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest shrink-0">
                        {pieceCount} pieza{pieceCount !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateClick}
            className="w-full md:w-auto px-10 py-4 bg-brand text-white rounded-full text-[13px] font-black soft-shadow uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-hover active:scale-95 transition-all shrink-0"
          >
            NUEVA PIEZA
          </button>
        </div>

        {/* Selected owner profile banner */}
        {selectedOwner && (
          <div className="bg-white rounded-2xl border border-neutral-border soft-shadow p-5 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center text-white font-extrabold text-xl shadow-inner">
                {selectedOwner.charAt(0)}
              </div>
              <div>
                <h3 className="text-[18px] font-black text-neutral-textMain uppercase tracking-tight">{selectedOwner}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {selectedStudent && (
                    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[8px] font-extrabold uppercase tracking-widest border ${CATEGORY_BADGE[selectedStudent.studentCategory || 'regular'] || 'bg-neutral-alt text-neutral-textHelper border-neutral-border'}`}>
                      {CATEGORY_LABELS[selectedStudent.studentCategory || 'regular']}
                    </span>
                  )}
                  {selectedStudent?.groupName && (
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-[8px] font-extrabold uppercase tracking-widest bg-neutral-sec text-neutral-textHelper border border-neutral-border">
                      {selectedStudent.groupName}
                    </span>
                  )}
                  <span className="text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest">
                    {selectedOwnerPieceCount} pieza{selectedOwnerPieceCount !== 1 ? 's' : ''} registrada{selectedOwnerPieceCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setSelectedOwner(null); setSearchQuery(''); }}
              className="px-5 py-2.5 bg-neutral-sec text-neutral-textHelper rounded-full text-[10px] font-extrabold uppercase tracking-widest hover:bg-neutral-alt transition-colors"
            >
              VER TODAS
            </button>
          </div>
        )}

        {/* Row 2: Category filter + Group filter */}
        <div className="flex flex-wrap gap-2 items-center">
          {(['todos', 'regular', 'iniciacion', 'grupal', 'temporal', 'grupo_temporal'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border transition-all ${categoryFilter === cat
                ? 'bg-neutral-textMain text-white border-neutral-textMain'
                : 'bg-white text-neutral-textHelper border-neutral-border hover:border-neutral-textHelper'
                }`}
            >
              {cat === 'todos' ? 'Todas categorías' : CATEGORY_LABELS[cat]} ({categoryCounts[cat] || 0})
            </button>
          ))}

          {/* Group name filter (only if groups exist) */}
          {allGroupNames.length > 0 && (
            <>
              <div className="w-px h-6 bg-neutral-border mx-1"></div>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className={`px-3.5 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border appearance-none cursor-pointer transition-all ${groupFilter !== 'todos'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-neutral-textHelper border-neutral-border hover:border-neutral-textHelper'
                  }`}
              >
                <option value="todos">TODOS LOS GRUPOS</option>
                {allGroupNames.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Row 3: Date filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-full border border-neutral-border soft-shadow">
            {([
              { key: 'all', label: 'SIN FILTRO' },
              { key: 'day', label: 'POR DÍA' },
              { key: 'week', label: 'POR SEMANA' }
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => setDateFilter(opt.key)}
                className={`px-4 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all ${dateFilter === opt.key ? 'bg-brand text-white shadow-sm' : 'text-neutral-textHelper hover:text-brand'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {dateFilter !== 'all' && (
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="px-4 py-2 bg-white border border-neutral-border rounded-full text-[11px] font-extrabold text-neutral-textMain outline-none focus:border-brand cursor-pointer"
            />
          )}
          {dateFilter === 'week' && (
            <span className="text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest">{weekLabel}</span>
          )}
        </div>

        {/* Row 4: Status filter + History toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white p-1.5 rounded-full border border-neutral-border soft-shadow overflow-x-auto no-scrollbar">
            {(['all', '1era_quema', 'esmaltado', 'a_recogida'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 md:px-6 lg:px-8 py-3 rounded-full text-[12px] lg:text-[13px] uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s ? 'bg-brand text-white font-black soft-shadow' : 'text-neutral-textSec font-black hover:text-brand'}`}
              >
                {s === 'all' ? 'TODAS' : getStatusLabel(s as PieceStatus)}
              </button>
            ))}
          </div>

          {/* History toggle button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-5 py-3 rounded-full text-[11px] font-extrabold uppercase tracking-widest transition-all border ${showHistory
              ? 'bg-neutral-textMain text-white border-neutral-textMain'
              : 'bg-white text-neutral-textHelper border-neutral-border hover:border-neutral-textHelper'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            HISTORIAL ({historyPieces.length})
          </button>
        </div>
      </header>

      {/* ─── PIECES GRID (Active) ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        {filteredPieces.length === 0 && !showHistory ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-16 h-16 text-neutral-border mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p className="text-[14px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">Sin piezas activas</p>
            <p className="text-[12px] font-light text-neutral-textSec">
              {selectedOwner ? `${selectedOwner} no tiene piezas en proceso.` : 'No hay piezas que coincidan con los filtros.'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {(['1era_quema', 'esmaltado', 'a_recogida'] as const).map(statusKey => {
              if (filterStatus !== 'all' && filterStatus !== statusKey) return null;
              const currentGroup = groupedPieces[statusKey] || [];
              if (currentGroup.length === 0) return null;

              return (
                <section key={statusKey} className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-6 sticky top-0 bg-neutral-base/95 backdrop-blur-md z-10 py-2">
                    <div className={`w-3 h-8 rounded-full ${getStatusColor(statusKey)} shadow-sm`}></div>
                    <h3 className="text-[22px] font-extrabold text-neutral-textMain uppercase tracking-tight">
                      {getStatusLabel(statusKey)}
                      <span className="ml-3 text-neutral-textHelper text-[14px] font-light">({currentGroup.length})</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentGroup.map(piece => {
                      const student = getStudentForPiece(piece);
                      return (
                        <PieceCard
                          key={piece.id}
                          piece={piece}
                          studentCategory={student?.studentCategory}
                          groupName={student?.groupName}
                          onEdit={handleEditClick}
                          onUpdateStatus={(id, next) => onUpdatePiece(id, { status: next })}
                          getStatusAction={getStatusAction}
                          getStatusLabel={getStatusLabel}
                          getStatusColor={getStatusColor}
                          getPercentage={getPercentage}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* ─── HISTORY SECTION (collapsible) ─── */}
            {showHistory && (
              <section className="animate-fade-in">
                <div className="flex items-center gap-4 mb-6 sticky top-0 bg-neutral-base/95 backdrop-blur-md z-10 py-2">
                  <div className="w-3 h-8 rounded-full bg-neutral-textHelper shadow-sm"></div>
                  <h3 className="text-[22px] font-extrabold text-neutral-textMain uppercase tracking-tight">
                    Historial de Piezas Entregadas
                    <span className="ml-3 text-neutral-textHelper text-[14px] font-light">({filteredHistoryPieces.length})</span>
                  </h3>
                </div>
                {filteredHistoryPieces.length === 0 ? (
                  <div className="bg-white/40 border-2 border-dashed border-neutral-border p-12 rounded-[2.5rem] text-center">
                    <p className="text-neutral-textHelper font-light uppercase text-[12px] tracking-widest">No hay piezas entregadas que coincidan con los filtros.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredHistoryPieces.map(piece => {
                      const student = getStudentForPiece(piece);
                      return (
                        <PieceCard
                          key={piece.id}
                          piece={piece}
                          studentCategory={student?.studentCategory}
                          groupName={student?.groupName}
                          onEdit={handleEditClick}
                          onUpdateStatus={(id, next) => onUpdatePiece(id, { status: next })}
                          getStatusAction={getStatusAction}
                          getStatusLabel={getStatusLabel}
                          getStatusColor={getStatusColor}
                          getPercentage={getPercentage}
                          isHistory
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-textMain/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] soft-shadow relative animate-fade-in flex flex-col border border-neutral-border overflow-hidden">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-neutral-textHelper hover:text-neutral-textMain transition-colors z-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-10 lg:p-12 overflow-y-auto custom-scrollbar">
              <h3 className="text-[28px] lg:text-[32px] font-extrabold text-neutral-textMain mb-2 uppercase tracking-tight leading-none">
                {editingPiece ? 'EDITAR PIEZA' : 'REGISTRAR PIEZA'}
              </h3>
              <p className="text-neutral-textSec text-[14px] lg:text-[16px] mb-8 font-light">Define los detalles para el seguimiento en el taller.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">PROPIETARIO</label>
                    <select
                      required
                      value={form.owner}
                      onChange={(e) => setForm({ ...form, owner: e.target.value })}
                      className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[16px] focus:outline-none focus:border-brand appearance-none"
                    >
                      <option value="" disabled>Seleccionar Alumno</option>
                      {sortedStudents.map(student => (
                        <option key={student.id} value={`${student.name} ${student.surname || ''}`.trim()}>
                          {`${student.name} ${student.surname || ''}`.trim()} — {CATEGORY_LABELS[student.studentCategory || 'regular']}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">ESTADO ACTUAL</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as PieceStatus })}
                      className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[14px] appearance-none cursor-pointer focus:outline-none focus:border-brand"
                    >
                      <option value="1era_quema">1ª QUEMA</option>
                      <option value="esmaltado">ESMALTADO</option>
                      <option value="a_recogida">A RECOGIDA</option>
                      <option value="entregado">ENTREGADO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">DESCRIPCIÓN DE LA OBRA</label>
                  <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[16px] focus:outline-none focus:border-brand" placeholder="Ej: Jarrón con textura" />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">TIPO DE ESMALTE / ACABADO</label>
                  <input value={form.glazeType} onChange={(e) => setForm({ ...form, glazeType: e.target.value })} className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[16px] focus:outline-none focus:border-brand" placeholder="Ej: Blanco Mate" />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">FECHA DE ENTREGA</label>
                  <input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[16px] focus:outline-none focus:border-brand" />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">NOTAS ADICIONALES</label>
                  <textarea value={form.extraCommentary} onChange={(e) => setForm({ ...form, extraCommentary: e.target.value })} className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[15px] min-h-[100px] resize-none focus:outline-none focus:border-brand" placeholder="..." />
                </div>

                <div className="pt-4 flex gap-3">
                  {editingPiece && (
                    <button
                      type="button"
                      onClick={() => setPieceToDelete(editingPiece.id)}
                      className="px-6 py-4 text-red-400 font-extrabold uppercase text-[11px] tracking-widest"
                    >
                      Eliminar
                    </button>
                  )}
                  <button type="submit" className="flex-1 py-5 bg-brand text-white rounded-2xl font-extrabold soft-shadow uppercase tracking-widest text-[16px] hover:bg-brand-hover active:scale-[0.98] transition-all">
                    GUARDAR CAMBIOS
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!pieceToDelete}
        title="¿Eliminar pieza?"
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        isDestructive={true}
        onConfirm={async () => {
          if (pieceToDelete) {
            await onDeletePiece(pieceToDelete);
            setPieceToDelete(null);
            setShowModal(false);
          }
        }}
        onCancel={() => setPieceToDelete(null)}
      />
    </div>
  );
};

export default PiecesToCollect;
