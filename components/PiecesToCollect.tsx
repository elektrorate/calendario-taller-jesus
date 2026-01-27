import React, { useState, useMemo } from 'react';
import { CeramicPiece, PieceStatus, Student } from '../types';

interface PieceCardProps {
  piece: CeramicPiece;
  onEdit: (piece: CeramicPiece) => void;
  onUpdateStatus: (id: string, nextStatus: PieceStatus) => void;
  getStatusAction: (status: PieceStatus) => { label: string; next: PieceStatus } | null;
  getStatusLabel: (status: PieceStatus) => string;
  getStatusColor: (status: PieceStatus) => string;
  getPercentage: (status: PieceStatus) => number;
}

const PieceCard: React.FC<PieceCardProps> = ({ piece, onEdit, onUpdateStatus, getStatusAction, getStatusLabel, getStatusColor, getPercentage }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const action = getStatusAction(piece.status);

  const COMMENT_LIMIT = 80;
  const hasLongComment = (piece.extraCommentary?.length || 0) > COMMENT_LIMIT;
  const displayText = isExpanded
    ? piece.extraCommentary
    : piece.extraCommentary?.slice(0, COMMENT_LIMIT) + (hasLongComment ? '...' : '');

  const progress = getPercentage(piece.status);

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 soft-shadow border border-neutral-border hover:border-brand-light transition-all relative flex flex-col group h-full overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-neutral-alt overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ease-out ${getStatusColor(piece.status)}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between items-start mb-6 pt-2">
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
        <button
          onClick={() => onEdit(piece)}
          className="text-neutral-textHelper hover:text-brand transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
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
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-[9px] font-extrabold text-brand uppercase tracking-widest hover:underline"
              >
                {isExpanded ? 'Ver menos' : 'Ver más'}
              </button>
            )}
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

  const [form, setForm] = useState({
    owner: '',
    description: '',
    status: '1era_quema' as PieceStatus,
    glazeType: '',
    deliveryDate: '',
    notes: '',
    extraCommentary: ''
  });

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

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

  const handleEditClick = (piece: CeramicPiece) => {
    setEditingPiece(piece);
    setForm({
      owner: piece.owner,
      description: piece.description,
      status: piece.status,
      glazeType: piece.glazeType || '',
      deliveryDate: piece.deliveryDate || '',
      notes: piece.notes || '',
      extraCommentary: piece.extraCommentary || ''
    });
    setShowModal(true);
  };

  const handleCreateClick = () => {
    setEditingPiece(null);
    setForm({ owner: sortedStudents.length > 0 ? `${sortedStudents[0].name} ${sortedStudents[0].surname || ''}`.trim() : '', description: '', status: '1era_quema', glazeType: '', deliveryDate: '', notes: '', extraCommentary: '' });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.owner) {
      alert("Por favor selecciona un propietario.");
      return;
    }
    if (editingPiece?.id) onUpdatePiece(editingPiece.id, form);
    else onAddPiece(form);
    setShowModal(false);
  };

  const groupedPieces = useMemo(() => {
    const groups: Record<PieceStatus, CeramicPiece[]> = {
      '1era_quema': [],
      'esmaltado': [],
      'a_recogida': [],
      'entregado': []
    };
    pieces.forEach(p => {
      groups[p.status].push(p);
    });
    return groups;
  }, [pieces]);

  return (
    <div className="h-full flex flex-col overflow-hidden px-6 lg:px-10 bg-neutral-base">
      <header className="mb-10 flex flex-col md:flex-row items-center justify-start gap-6 pt-8 shrink-0">
        {/* Botón Nueva Pieza primero */}
        <button
          onClick={handleCreateClick}
          className="w-full md:w-auto px-10 py-5 bg-brand text-white rounded-full text-[14px] font-black soft-shadow uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-hover active:scale-95 transition-all order-first"
        >
          NUEVA PIEZA
        </button>

        {/* Filtros ajustados para legibilidad y orden */}
        <div className="flex bg-white p-1.5 rounded-full border border-neutral-border soft-shadow overflow-x-auto no-scrollbar w-full md:w-auto">
          {(['all', '1era_quema', 'esmaltado', 'a_recogida'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 md:px-6 lg:px-10 py-3 rounded-full text-[13px] lg:text-[15px] uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s ? 'bg-brand text-white font-black soft-shadow' : 'text-neutral-textSec font-black hover:text-brand'}`}
            >
              {s === 'all' ? 'TODAS' : getStatusLabel(s as PieceStatus)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <div className="space-y-12">
          {(['1era_quema', 'esmaltado', 'a_recogida'] as const).map(statusKey => {
            if (filterStatus !== 'all' && filterStatus !== statusKey) return null;
            const currentGroup = groupedPieces[statusKey];
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
                  {currentGroup.map(piece => (
                    <PieceCard
                      key={piece.id}
                      piece={piece}
                      onEdit={handleEditClick}
                      onUpdateStatus={(id, next) => onUpdatePiece(id, { status: next })}
                      getStatusAction={getStatusAction}
                      getStatusLabel={getStatusLabel}
                      getStatusColor={getStatusColor}
                      getPercentage={getPercentage}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

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
                        <option key={student.id} value={`${student.name} ${student.surname || ''}`.trim()}>{`${student.name} ${student.surname || ''}`.trim()}</option>
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
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[16px] focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-neutral-textHelper uppercase tracking-widest mb-2">NOTAS ADICIONALES</label>
                  <textarea value={form.extraCommentary} onChange={(e) => setForm({ ...form, extraCommentary: e.target.value })} className="w-full px-5 py-3.5 bg-neutral-sec border border-neutral-border rounded-xl font-light text-[15px] min-h-[100px] resize-none focus:outline-none focus:border-brand" placeholder="..." />
                </div>

                <div className="pt-4 flex gap-3">
                  {editingPiece && (
                    <button
                      type="button"
                      onClick={() => { if (confirm("¿Eliminar registro de pieza?")) { onDeletePiece(editingPiece.id); setShowModal(false); } }}
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
    </div>
  );
};

export default PiecesToCollect;
