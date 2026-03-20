import type { CeramicPiece } from '../../types';
import { showError, showWarning } from '../toast';
import { supabase, withTimeout, normalizeForMatch, isAbortError, OpsContext } from './shared';

export const addPiece = async (ctx: OpsContext, newPiece: Omit<CeramicPiece, 'id'>) => {
    const ownerNormalized = normalizeForMatch(newPiece.owner);
    const student = ctx.students.find(s => normalizeForMatch(`${s.name} ${s.surname || ''}`) === ownerNormalized);
    const payload: any = {
        student_id: student?.id || null, owner_name: newPiece.owner,
        description: newPiece.description, status: newPiece.status,
        glaze_type: newPiece.glazeType, delivery_date: newPiece.deliveryDate || null,
        notes: newPiece.notes, extra_commentary: newPiece.extraCommentary
    };
    if (ctx.sedeId) payload.sede_id = ctx.sedeId;
    try {
        // Return created record for optimistic UI update
        const { data, error } = await withTimeout('pieces.insert',
            supabase.from('pieces').insert(payload).select().single()
        );
        if (error) { showError(`No se pudo crear la pieza. ${error.message || ''}`); return; }

        // IMMEDIATE optimistic UI update
        if (data) {
            const newPieceWithId: CeramicPiece = {
                id: data.id, owner: data.owner_name, description: data.description,
                status: data.status, glazeType: data.glaze_type || undefined,
                deliveryDate: data.delivery_date || undefined, notes: data.notes || undefined,
                extraCommentary: data.extra_commentary || undefined,
                createdAt: data.created_at || undefined
            };
            ctx.setPieces(prev => [newPieceWithId, ...prev]);
        }
        // Background reload (UI already has the piece)
        ctx.safeReload();
    } catch (err: any) {
        showError(`No se pudo crear la pieza. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
    }
};

export const updatePiece = async (ctx: OpsContext, id: string, updates: Partial<CeramicPiece>) => {
    // OPTIMISTIC: update UI immediately
    const previousPieces = [...ctx.pieces];
    ctx.setPieces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

    const payload: Record<string, any> = {
        owner_name: updates.owner, description: updates.description, status: updates.status,
        glaze_type: updates.glazeType || null, delivery_date: updates.deliveryDate || null,
        notes: updates.notes || null, extra_commentary: updates.extraCommentary || null
    };
    Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
    try {
        const { error } = await withTimeout('pieces.update', supabase.from('pieces').update(payload).eq('id', id));
        if (error) {
            ctx.setPieces(previousPieces); // REVERT
            showError(`No se pudo actualizar la pieza. ${error.message || ''}`);
            return;
        }
        ctx.safeReload();
    } catch (err: any) {
        ctx.setPieces(previousPieces); // REVERT
        showError(`No se pudo actualizar la pieza. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
    }
};

export const deletePiece = async (ctx: OpsContext, id: string) => {
    ctx.setPieces(prev => prev.filter(p => p.id !== id));
    try {
        const { error } = await withTimeout('pieces.delete', supabase.from('pieces').delete().eq('id', id));
        if (error) { showError(`No se pudo eliminar la pieza. ${error.message || ''}`); ctx.safeReload(); return; }
    } catch (err: any) {
        showError(`No se pudo eliminar la pieza. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        ctx.safeReload();
    }
};
