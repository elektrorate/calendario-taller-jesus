import { showError, showWarning } from '../context/toast';
import React, { useState } from 'react';
import { GiftCard } from '../types';
import { ConfirmModal } from './shared/ConfirmModal';
interface GiftCardViewProps {
  giftCards: GiftCard[];
  onAddGiftCard: (card: Omit<GiftCard, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateGiftCard: (id: string, updates: Partial<GiftCard>) => Promise<void>;
  onDeleteGiftCard: (id: string) => Promise<void>;
}

const GiftCardItem: React.FC<{
  card: GiftCard;
  onEdit: (card: GiftCard) => void;
  formatDateOnly: (isoString: string) => string;
  isExpiredDate: (dateString?: string) => boolean;
}> = ({ card, onEdit, formatDateOnly, isExpiredDate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const COMMENT_LIMIT = 60;
  const hasLongComment = (card.extraCommentary?.length || 0) > COMMENT_LIMIT;
  const displayText = isExpanded
    ? card.extraCommentary
    : card.extraCommentary?.slice(0, COMMENT_LIMIT) + (hasLongComment ? '...' : '');
  const isExpired = isExpiredDate(card.expiryDate);

  return (
    <div
      onClick={() => onEdit(card)}
      className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(220px,1.7fr)_minmax(100px,.8fr)_minmax(80px,.6fr)_minmax(145px,.9fr)_64px] gap-3 md:gap-4 items-center px-3 md:px-4 py-3 bg-white border-b border-neutral-border last:border-b-0 hover:bg-neutral-base transition-colors cursor-pointer group relative overflow-hidden"
    >
      <div className="min-w-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center font-bold text-[12px] shrink-0">
          {card.buyer.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-[14px] text-neutral-textMain truncate">{card.buyer}</h3>
            <span className="hidden sm:inline text-[10px] font-semibold text-neutral-textHelper shrink-0">#{card.id.slice(-4).toUpperCase()}</span>
          </div>
          <p className="text-[11px] text-neutral-textHelper truncate mt-0.5">Para: {card.recipient}</p>
        </div>
      </div>

      <div className="hidden md:block">
        <span className="inline-flex px-2 py-1 rounded-md bg-brand-soft text-brand text-[11px] font-semibold">{card.type}</span>
      </div>

      <div className="justify-self-end md:justify-self-start text-right md:text-left">
        <span className="text-[16px] font-bold text-neutral-textMain">{card.numClasses}</span>
        <span className="text-[11px] font-semibold text-neutral-textHelper ml-1">clases</span>
      </div>

      <div className="hidden md:block min-w-0">
        {card.expiryDate && (
          <div className="leading-tight">
            <p className={`text-[11px] font-semibold mb-0.5 ${isExpired ? 'text-[#9E3B2B]' : 'text-brand'}`}>{isExpired ? 'Expirado' : 'Expira'}</p>
            <p className={`text-[13px] font-semibold ${isExpired ? 'text-[#9E3B2B]' : 'text-neutral-textMain'}`}>{formatDateOnly(card.expiryDate)}</p>
          </div>
        )}
      </div>

      <button onClick={(e) => { e.stopPropagation(); onEdit(card); }} aria-label={`Editar bono de ${card.buyer}`} className="hidden md:flex justify-self-end w-8 h-8 items-center justify-center rounded-[8px] text-neutral-textHelper hover:text-brand hover:bg-brand-soft transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
      </button>

      <div className="col-span-2 md:hidden flex items-center gap-2 pt-2 border-t border-neutral-border">
        <span className="inline-flex px-2 py-1 rounded-md bg-brand-soft text-brand text-[10px] font-semibold">{card.type}</span>
        {card.expiryDate && <span className={`text-[11px] font-semibold ${isExpired ? 'text-[#9E3B2B]' : 'text-neutral-textHelper'}`}>{isExpired ? 'Expirado' : `Expira ${formatDateOnly(card.expiryDate)}`}</span>}
        {card.extraCommentary && (
          <div className="ml-auto flex items-center gap-1 min-w-0">
            <p className="text-[11px] text-neutral-textHelper italic truncate">"{displayText}"</p>
            {hasLongComment && <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-[11px] font-semibold text-brand shrink-0">{isExpanded ? 'menos' : 'más'}</button>}
          </div>
        )}
      </div>

      {card.extraCommentary && !isExpanded && (
        <span className="hidden md:block text-[11px] text-neutral-textHelper italic truncate col-span-2">"{displayText}"</span>
      )}
    </div>
  );
};

const GiftCardView: React.FC<GiftCardViewProps> = ({ giftCards, onAddGiftCard, onUpdateGiftCard, onDeleteGiftCard }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  // BUG 2 FIX: Add isSubmitting state to prevent double-click
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFormState = {
    buyer: '',
    recipient: '',
    numClasses: 2,
    type: 'modelado' as GiftCard['type'],
    expiryDate: '',
    issuedDate: '',
    extraCommentary: ''
  };
  const [form, setForm] = useState(initialFormState);

  const handleEditClick = (card: GiftCard) => {
    setEditingCard(card);
    setForm({
      buyer: card.buyer,
      recipient: card.recipient,
      numClasses: card.numClasses,
      type: card.type,
      expiryDate: card.expiryDate ? card.expiryDate.split('T')[0] : '',
      issuedDate: card.issuedDate ? card.issuedDate.split('T')[0] : '',
      extraCommentary: card.extraCommentary || ''
    });
    setShowModal(true);
  };

  const handleCreateClick = () => {
    setEditingCard(null);
    setForm(initialFormState);
    setShowModal(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCard?.id) {
      setCardToDelete(editingCard.id);
    }
  };

  // BUG 2 FIX: Protected submit with isSubmitting guard
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!form.expiryDate) {
        showError('La fecha de expiración es obligatoria.');
        setIsSubmitting(false);
        return;
      }
      if (!Number.isFinite(form.numClasses) || form.numClasses <= 0) {
        showError('El número de clases debe ser mayor que 0.');
        setIsSubmitting(false);
        return;
      }
      const cardData = {
        ...form,
        expiryDate: form.expiryDate || undefined,
        issuedDate: form.issuedDate ? `${form.issuedDate}T10:00:00` : undefined
      };
      // Close modal immediately — Supabase operations run in background
      setShowModal(false);
      setIsSubmitting(false);
      if (editingCard?.id) {
        onUpdateGiftCard(editingCard.id, cardData);
      } else {
        onAddGiftCard(cardData);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const formatDateOnly = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isExpiredDate = (dateString?: string) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateString);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-neutral-base">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 md:px-8 lg:px-10 pt-4 md:pt-6 pb-20">
        <header className="mb-5 animate-fade-in">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-1">Programa del estudio</p>
              <h1 className="text-[28px] md:text-[34px] font-bold text-neutral-textMain leading-tight">Bonos <span className="text-brand italic">de clases</span></h1>
              <p className="text-[13px] text-neutral-textHelper mt-1">Regalos, clases disponibles y fechas de vencimiento.</p>
            </div>
            <button
              onClick={handleCreateClick}
              className="min-h-[40px] px-4 py-2 bg-brand text-white rounded-[10px] text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand-hover active:scale-[0.98] transition-all shrink-0"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Nuevo bono</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </header>

        <section className="bg-white border border-neutral-border rounded-2xl overflow-hidden animate-fade-in">
          <div className="hidden md:grid grid-cols-[minmax(220px,1.7fr)_minmax(100px,.8fr)_minmax(80px,.6fr)_minmax(145px,.9fr)_64px] gap-4 px-4 py-3 bg-neutral-sec border-b border-neutral-border text-[10px] font-semibold text-neutral-textHelper uppercase tracking-[0.12em]">
            <span>Personas</span>
            <span>Tipo</span>
            <span>Clases</span>
            <span>Vencimiento</span>
            <span></span>
          </div>
          {giftCards.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] font-semibold text-neutral-textMain">No hay bonos registrados</p>
              <p className="text-[13px] text-neutral-textHelper mt-1">Crea el primero para empezar a gestionar las clases.</p>
            </div>
          ) : (
            giftCards.map((card) => (
              <GiftCardItem
                key={card.id}
                card={card}
                onEdit={handleEditClick}
                formatDateOnly={formatDateOnly}
                isExpiredDate={isExpiredDate}
              />
            ))
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-neutral-textMain/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-[94%] max-w-[560px] rounded-2xl soft-shadow relative animate-fade-in flex flex-col overflow-hidden max-h-[90dvh] border border-neutral-border">
            {/* Header del Modal */}
            <div className="px-5 md:px-8 pt-6 pb-4 shrink-0 flex justify-between items-start gap-3">
              <div>
                <h3 className="text-[22px] font-bold text-neutral-textMain">{editingCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h3>
                <p className="text-[13px] text-neutral-textHelper mt-1">Completa los datos para el bono regalo.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center text-neutral-textMain hover:bg-neutral-sec rounded-full transition-all shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Contenido Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 md:px-8 py-5 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-textSec mb-1.5">Nombre del comprador</label>
                  <input
                    required
                    type="text"
                    value={form.buyer}
                    onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[15px] text-neutral-textMain transition-all placeholder:text-neutral-textHelper"
                    placeholder="Ej: Michael Denzler"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-textSec mb-1.5">Destinatario</label>
                  <input
                    required
                    type="text"
                    value={form.recipient}
                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[15px] text-neutral-textMain transition-all placeholder:text-neutral-textHelper"
                    placeholder="Ej: Kateryna"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-textSec mb-1.5">Nº clases</label>
                    <input
                      type="number"
                      value={form.numClasses}
                      min={1}
                      step={1}
                      onChange={(e) => {
                        const parsed = Number.parseInt(e.target.value, 10);
                        setForm({ ...form, numClasses: Number.isFinite(parsed) ? parsed : 0 });
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[15px] text-neutral-textMain"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-neutral-textSec mb-1.5">Tipo</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as GiftCard['type'] })}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[15px] text-neutral-textMain appearance-none"
                    >
                      <option value="modelado">Modelado</option>
                      <option value="torno">Torno</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-textSec mb-1.5">Fecha de expiración</label>
                  <input
                    required
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[15px] text-neutral-textMain"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-textSec mb-1.5">Fecha de emisión</label>
                  <input
                    type="date"
                    value={form.issuedDate}
                    onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[15px] text-neutral-textMain"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-textSec mb-1.5">Observaciones adicionales</label>
                  <textarea
                    value={form.extraCommentary}
                    onChange={(e) => setForm({ ...form, extraCommentary: e.target.value })}
                    className="w-full min-h-[120px] px-4 py-2.5 rounded-[10px] bg-white border border-neutral-border focus:border-brand focus:ring-2 focus:ring-brand/15 outline-none text-[15px] text-neutral-textMain transition-all placeholder:text-neutral-textHelper resize-none"
                    placeholder="Detalles sobre el regalo o preferencias..."
                  />
                </div>
              </div>
            </div>

            {/* Footer con Botones Fijos */}
            <div className="px-5 md:px-8 py-5 border-t border-neutral-border bg-white sticky bottom-0">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full min-h-[44px] px-4 py-2.5 bg-brand text-white rounded-[10px] font-semibold text-[15px] hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Guardando...' : (editingCard ? 'Guardar cambios' : 'Crear tarjeta')}
              </button>
              {editingCard && (
                <>
                  <div className="h-[1px] bg-neutral-border my-4"></div>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 text-[13px] font-semibold text-[#9E3B2B] hover:text-[#8A3325] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Eliminar Tarjeta
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!cardToDelete}
        title="¿Eliminar tarjeta de regalo?"
        message="¿Estás seguro de que deseas eliminar esta tarjeta regalo? Esta acción no se puede deshacer."
        isDestructive={true}
        loading={isSubmitting}
        onConfirm={() => {
          if (cardToDelete && !isSubmitting) {
            const id = cardToDelete;
            setCardToDelete(null);
            setShowModal(false);
            onDeleteGiftCard(id);
          }
        }}
        onCancel={() => !isSubmitting && setCardToDelete(null)}
      />
    </div>
  );
};

export default GiftCardView;
