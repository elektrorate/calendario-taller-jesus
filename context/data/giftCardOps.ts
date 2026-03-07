import type { GiftCard, Student } from '../../types';
import { showError, showWarning } from '../toast';
import { supabase, withTimeout, normalizeForMatch, mapStudentRowToModel, OpsContext } from './shared';

const resolveRecipientStudentId = (students: Student[], recipient?: string): string | null => {
    if (!recipient) return null;
    const normalized = normalizeForMatch(recipient);
    if (!normalized) return null;
    const fullMatches = students.filter(s => normalizeForMatch(`${s.name} ${s.surname || ''}`) === normalized);
    if (fullMatches.length === 1) return fullMatches[0].id;
    const nameMatches = students.filter(s => normalizeForMatch(s.name) === normalized);
    if (nameMatches.length === 1) return nameMatches[0].id;
    return null;
};

const createTemporaryStudent = async (ctx: OpsContext, params: {
    recipient: string; numClasses?: number; type?: GiftCard['type']; expiryDate?: string;
}): Promise<string | null> => {
    if (!ctx.sedeId) return null;
    const recipient = (params.recipient || '').replace(/\s+/g, ' ').trim();
    if (!recipient) return null;
    const firstName = recipient.split(' ')[0] || recipient;
    const surnameRaw = recipient.slice(firstName.length).trim();
    const payload: Record<string, any> = {
        sede_id: ctx.sedeId, full_name: recipient, name: firstName, surname: surnameRaw || null,
        phone: '', classes_remaining: Number.isFinite(params.numClasses as number) ? Math.max(0, params.numClasses as number) : 0,
        status: 'new', student_category: 'temporal',
        class_type: params.type === 'torno' ? 'Torno' : 'Modelado',
        expiry_date: params.expiryDate ? `${params.expiryDate}T00:00:00Z` : null,
        notes: 'Creado automaticamente desde bono regalo'
    };
    try {
        const { data, error } = await withTimeout('students.insert_from_gift_card',
            supabase.from('students').insert(payload).select('*').single(), 5000
        );
        if (error) return null;
        if (data) {
            const mapped = mapStudentRowToModel(data);
            ctx.setStudents(prev => prev.some(s => s.id === mapped.id) ? prev : [mapped, ...prev]);
            return data.id;
        }
    } catch { return null; }
    return null;
};

const ensureRecipientStudentId = async (ctx: OpsContext, params: {
    recipient?: string; recipientStudentId?: string; numClasses?: number; type?: GiftCard['type']; expiryDate?: string;
}): Promise<string | null> => {
    if (params.recipientStudentId) return params.recipientStudentId;
    const existing = resolveRecipientStudentId(ctx.students, params.recipient);
    if (existing) return existing;
    if (!params.recipient) return null;
    return createTemporaryStudent(ctx, { recipient: params.recipient, numClasses: params.numClasses, type: params.type, expiryDate: params.expiryDate });
};

export const addGiftCard = async (ctx: OpsContext, newCard: Omit<GiftCard, 'id' | 'createdAt'>) => {
    const resolvedId = await ensureRecipientStudentId(ctx, {
        recipient: newCard.recipient, recipientStudentId: newCard.recipientStudentId,
        numClasses: newCard.numClasses, type: newCard.type, expiryDate: newCard.expiryDate
    });
    const payload: any = {
        buyer: newCard.buyer, recipient: newCard.recipient, recipient_student_id: resolvedId,
        num_classes: newCard.numClasses, type: newCard.type,
        scheduled_date: newCard.issuedDate || null, extra_commentary: newCard.extraCommentary || null
    };
    if (newCard.expiryDate) payload.expiry_date = newCard.expiryDate;
    if (ctx.sedeId) payload.sede_id = ctx.sedeId;
    try {
        const { data, error } = await withTimeout('gift_cards.insert', supabase.from('gift_cards').insert(payload).select().single());
        if (error) { showError(`No se pudo crear la tarjeta regalo. ${error.message || ''}`); return; }
        if (data) {
            const mapped: GiftCard = {
                id: data.id, buyer: data.buyer, recipient: data.recipient,
                recipientStudentId: data.recipient_student_id || undefined, numClasses: data.num_classes,
                type: data.type, issuedDate: data.scheduled_date || undefined,
                expiryDate: data.expiry_date || undefined, createdAt: data.created_at,
                extraCommentary: data.extra_commentary || undefined
            };
            ctx.setGiftCards(prev => [mapped, ...prev]);
        }
        ctx.safeReload();
    } catch (err: any) {
        showError(`No se pudo crear la tarjeta regalo. ${err?.message || ''}`);
    }
};

export const updateGiftCard = async (ctx: OpsContext, id: string, updates: Partial<GiftCard>, giftCards: GiftCard[]) => {
    const previousCard = giftCards.find(gc => gc.id === id);
    const payload: Record<string, any> = {};
    if (updates.buyer !== undefined) payload.buyer = updates.buyer;
    if (updates.recipient !== undefined) payload.recipient = updates.recipient;
    let resolvedId: string | null | undefined = undefined;
    if (updates.recipientStudentId !== undefined || updates.recipient !== undefined) {
        resolvedId = await ensureRecipientStudentId(ctx, {
            recipient: updates.recipient ?? previousCard?.recipient, recipientStudentId: updates.recipientStudentId,
            numClasses: updates.numClasses ?? previousCard?.numClasses, type: updates.type ?? previousCard?.type,
            expiryDate: updates.expiryDate ?? previousCard?.expiryDate
        });
        payload.recipient_student_id = resolvedId;
    }
    if (updates.numClasses !== undefined) payload.num_classes = updates.numClasses;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.issuedDate !== undefined) payload.scheduled_date = updates.issuedDate || null;
    if (updates.expiryDate !== undefined) payload.expiry_date = updates.expiryDate || null;
    if (updates.extraCommentary !== undefined) payload.extra_commentary = updates.extraCommentary || null;
    if (!Object.keys(payload).length) return;

    const optimistic: Partial<GiftCard> = { ...updates };
    if (resolvedId !== undefined) optimistic.recipientStudentId = resolvedId || undefined;
    ctx.setGiftCards(prev => prev.map(gc => gc.id === id ? { ...gc, ...optimistic } : gc));
    const revert = () => { if (previousCard) ctx.setGiftCards(prev => prev.map(gc => gc.id === id ? previousCard : gc)); };

    try {
        const { error } = await withTimeout('gift_cards.update', supabase.from('gift_cards').update(payload).eq('id', id), 5000);
        if (error) throw error;
        ctx.safeReload();
    } catch (err: any) {
        const isTimeout = typeof err?.message === 'string' && err.message.includes('Timeout');
        if (isTimeout) {
            void (async () => {
                try {
                    const { error } = await supabase.from('gift_cards').update(payload).eq('id', id);
                    if (error) { revert(); showError(`No se pudo actualizar la tarjeta regalo. ${error.message || ''}`); return; }
                    ctx.safeReload();
                } catch { revert(); }
            })();
            return;
        }
        revert();
        showError(`No se pudo actualizar la tarjeta regalo. ${err?.message || ''}`);
    }
};

export const deleteGiftCard = async (ctx: OpsContext, id: string) => {
    ctx.setGiftCards(prev => prev.filter(gc => gc.id !== id));
    try {
        const { error } = await withTimeout('gift_cards.delete', supabase.from('gift_cards').delete().eq('id', id));
        if (error) { showError(`No se pudo eliminar la tarjeta regalo. ${error.message || ''}`); ctx.safeReload(); return; }
    } catch (err: any) {
        showError(`No se pudo eliminar la tarjeta regalo. ${err?.message || ''}`);
        ctx.safeReload();
    }
};
