
import React, { useState } from 'react';
import { GiftCard } from '../types';

interface GiftCardViewProps {
  giftCards: GiftCard[];
  onAddGiftCard: (card: Omit<GiftCard, 'id' | 'createdAt'>) => void;
  onUpdateGiftCard: (id: string, updates: Partial<GiftCard>) => void;
  onDeleteGiftCard: (id: string) => void;
}

const GiftCardItem: React.FC<{ 
  card: GiftCard; 
  onEdit: (card: GiftCard) => void;
  formatDateOnly: (isoString: string) => string;
}> = ({ card, onEdit, formatDateOnly }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const COMMENT_LIMIT = 60;
  const hasLongComment = (card.extraCommentary?.length || 0) > COMMENT_LIMIT;
  const displayText = isExpanded 
    ? card.extraCommentary 
    : card.extraCommentary?.slice(0, COMMENT_LIMIT) + (hasLongComment ? '...' : '');

  return (
    <div 
      onClick={() => onEdit(card)} 
      className="p-6 md:p-8 rounded-[28px] bg-white flex flex-col relative overflow-hidden group min-h-[340px] cursor-pointer hover:shadow-2xl transition-all border border-[#DED3CD] soft-shadow"
    >
       <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
             <span className="px-4 py-1.5 bg-[#CB7859] text-white rounded-full text-[10px] md:text-[11px] font-bold tracking-widest uppercase shadow-sm">
                {card.type.toUpperCase()}
             </span>
             <span className="text-[12px] font-bold text-[#A7A09E]">#{card.id.slice(-4).toUpperCase()}</span>
          </div>
          
          <div className="space-y-5 mb-6">
             <div>
                <p className="text-[10px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-1">COMPRADOR</p>
                <p className="font-bold text-[18px] md:text-[20px] text-[#3F373A] truncate leading-tight uppercase tracking-tight">{card.buyer}</p>
             </div>
             <div>
                <p className="text-[10px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-1">DESTINATARIO</p>
                <p className="font-medium text-[16px] md:text-[18px] text-[#877E7D] truncate leading-tight uppercase tracking-tight">{card.recipient}</p>
             </div>
          </div>

          {card.extraCommentary && (
            <div className="mb-6 p-4 bg-[#F6F2EE] rounded-2xl border border-[#DED3CD]">
              <p className="text-[13px] font-normal text-[#877E7D] leading-snug italic">
                "{displayText}"
              </p>
              {hasLongComment && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                  className="mt-2 text-[10px] font-bold text-[#CB7859] uppercase tracking-tighter hover:underline"
                >
                  {isExpanded ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          )}

          <div className="mt-auto flex justify-between items-end pt-6 border-t border-[#DED3CD]">
             <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] md:text-[36px] font-black text-[#3F373A] leading-none">{card.numClasses}</span>
                  <span className="text-[10px] md:text-[11px] font-bold text-[#A7A09E] uppercase tracking-widest">CLASES</span>
                </div>
                <p className="text-[10px] font-normal text-[#A7A09E] uppercase tracking-widest mt-1">
                  EMITIDO: <span className="font-semibold text-[#3F373A]">{formatDateOnly(card.createdAt)}</span>
                </p>
             </div>
             {card.scheduledDate ? (
                <div className="text-right">
                   <p className="text-[9px] text-[#CB7859] font-bold uppercase tracking-widest mb-0.5">CITA ASIGNADA</p>
                   <p className="text-[14px] font-bold text-[#3F373A] uppercase">{new Date(card.scheduledDate).toLocaleDateString()}</p>
                </div>
             ) : (
                <div className="px-4 py-2 bg-[#F6F2EE] text-[#CB7859] rounded-xl text-[10px] font-bold uppercase tracking-widest border border-[#DED3CD] hover:bg-white transition-all">
                  PENDIENTE
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

const GiftCardView: React.FC<GiftCardViewProps> = ({ giftCards, onAddGiftCard, onUpdateGiftCard, onDeleteGiftCard }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);

  const initialFormState = { buyer: '', recipient: '', numClasses: 2, type: 'modelado' as GiftCard['type'], scheduledDate: '', extraCommentary: '' };
  const [form, setForm] = useState(initialFormState);

  const handleEditClick = (card: GiftCard) => {
    setEditingCard(card);
    setForm({ 
      buyer: card.buyer, 
      recipient: card.recipient, 
      numClasses: card.numClasses, 
      type: card.type, 
      scheduledDate: card.scheduledDate ? card.scheduledDate.split('T')[0] : '',
      extraCommentary: card.extraCommentary || ''
    });
    setShowModal(true);
  };

  const handleCreateClick = () => {
    setEditingCard(null);
    setForm(initialFormState);
    setShowModal(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCard?.id && window.confirm('¿Estás seguro de que deseas eliminar esta tarjeta regalo?')) {
      onDeleteGiftCard(editingCard.id);
      setShowModal(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cardData = { ...form, scheduledDate: form.scheduledDate ? `${form.scheduledDate}T10:00:00` : undefined };
    if (editingCard?.id) onUpdateGiftCard(editingCard.id, cardData);
    else onAddGiftCard(cardData);
    setShowModal(false);
  };

  const formatDateOnly = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F7F1EB]">
      <header className="px-6 md:px-12 py-8 shrink-0 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
           <p className="text-[11px] font-semibold text-[#CB7859] uppercase tracking-[0.2em] mb-1">PROGRAMA DE REGALOS</p>
           <h2 className="text-[28px] md:text-[36px] font-black text-[#3F373A] uppercase tracking-tight leading-tight">BONOS <span className="text-[#CB7859]">DE CLASES</span></h2>
        </div>
        <button 
          onClick={handleCreateClick} 
          className="w-full md:w-auto px-10 py-5 bg-[#CB7859] text-white rounded-full text-[14px] font-bold uppercase tracking-[0.1em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#CB7859]/20"
        >
          NUEVA TARJETA
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {giftCards.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[#DED3CD] rounded-[3rem] bg-white/40">
               <p className="text-[14px] font-medium text-[#877E7D] uppercase tracking-widest">No hay tarjetas de regalo activas</p>
            </div>
          ) : (
            giftCards.map((card) => (
              <GiftCardItem 
                key={card.id} 
                card={card} 
                onEdit={handleEditClick}
                formatDateOnly={formatDateOnly}
              />
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#3F373A]/35 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-[94%] max-w-[560px] rounded-[28px] shadow-2xl relative animate-fade-in flex flex-col overflow-hidden max-h-[90dvh]">
            {/* Header del Modal */}
            <div className="px-6 md:px-10 pt-8 pb-4 shrink-0 flex justify-between items-start">
               <div>
                 <h3 className="text-[24px] font-bold text-[#3F373A] uppercase tracking-tight">{editingCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h3>
                 <p className="text-[12px] font-normal text-[#A7A09E] mt-1">Completa los datos para el bono regalo.</p>
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 text-[#3F373A] hover:opacity-50 transition-all">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            {/* Contenido Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 py-6 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-2">NOMBRE DEL COMPRADOR</label>
                  <input 
                    required 
                    type="text" 
                    value={form.buyer} 
                    onChange={(e) => setForm({...form, buyer: e.target.value})} 
                    className="w-full px-4 h-[48px] bg-[#F6F2EE] border border-[#DED3CD] rounded-[14px] text-[15px] font-medium text-[#3F373A] focus:outline-none focus:border-[#CB7859] transition-all placeholder:text-[#A7A09E]" 
                    placeholder="Ej: Michael Denzler" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-2">DESTINATARIO</label>
                  <input 
                    required 
                    type="text" 
                    value={form.recipient} 
                    onChange={(e) => setForm({...form, recipient: e.target.value})} 
                    className="w-full px-4 h-[48px] bg-[#F6F2EE] border border-[#DED3CD] rounded-[14px] text-[15px] font-medium text-[#3F373A] focus:outline-none focus:border-[#CB7859] transition-all placeholder:text-[#A7A09E]" 
                    placeholder="Ej: Kateryna" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-2">Nº CLASES</label>
                    <input 
                      type="number" 
                      value={form.numClasses} 
                      onChange={(e) => setForm({...form, numClasses: parseInt(e.target.value)})} 
                      className="w-full px-4 h-[48px] bg-[#F6F2EE] border border-[#DED3CD] rounded-[14px] text-[15px] font-medium text-[#3F373A] focus:outline-none focus:border-[#CB7859]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-2">TIPO</label>
                    <select 
                      value={form.type} 
                      onChange={(e) => setForm({...form, type: e.target.value as GiftCard['type']})} 
                      className="w-full px-4 h-[48px] bg-[#F6F2EE] border border-[#DED3CD] rounded-[14px] text-[15px] font-medium text-[#3F373A] focus:outline-none focus:border-[#CB7859] appearance-none"
                    >
                      <option value="modelado">Modelado</option>
                      <option value="torno">Torno</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-2">FECHA DE CITA (OPCIONAL)</label>
                  <input 
                    type="date" 
                    value={form.scheduledDate} 
                    onChange={(e) => setForm({...form, scheduledDate: e.target.value})} 
                    className="w-full px-4 h-[48px] bg-[#F6F2EE] border border-[#DED3CD] rounded-[14px] text-[15px] font-medium text-[#3F373A] focus:outline-none focus:border-[#CB7859]" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#CB7859] uppercase tracking-[0.08em] mb-2">OBSERVACIONES ADICIONALES</label>
                  <textarea 
                    value={form.extraCommentary} 
                    onChange={(e) => setForm({...form, extraCommentary: e.target.value})} 
                    className="w-full p-4 bg-[#F6F2EE] border border-[#DED3CD] rounded-[16px] text-[15px] font-medium text-[#3F373A] focus:outline-none focus:border-[#CB7859] transition-all placeholder:text-[#A7A09E] min-h-[120px] resize-none" 
                    placeholder="Detalles sobre el regalo o preferencias..." 
                  />
                </div>
              </div>
            </div>

            {/* Footer con Botones Fijos */}
            <div className="px-6 md:px-10 py-8 border-t border-[#DED3CD] bg-white sticky bottom-0">
               <button 
                onClick={handleSubmit} 
                className="w-full h-[60px] bg-[#CB7859] text-white rounded-[24px] font-bold text-[16px] uppercase tracking-[0.06em] shadow-lg shadow-[#CB7859]/20 hover:brightness-110 active:scale-[0.98] transition-all"
               >
                  {editingCard ? 'GUARDAR CAMBIOS' : 'CREAR TARJETA'}
               </button>
               {editingCard && (
                 <>
                   <div className="h-[1px] bg-[#DED3CD] my-4"></div>
                   <button 
                    type="button" 
                    onClick={handleDelete} 
                    className="w-full flex items-center justify-center gap-2 text-[#CB7859] font-bold text-[13px] uppercase tracking-widest hover:opacity-70 transition-opacity"
                   >
                    Eliminar Tarjeta
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftCardView;
