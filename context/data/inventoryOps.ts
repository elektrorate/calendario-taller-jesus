import type { InventoryItem, InventoryMovement } from '../../types';
import { showError, showWarning } from '../toast';
import { supabase, withTimeout, removeUndefined, isAbortError, OpsContext } from './shared';

export const addInventoryItem = async (ctx: OpsContext, item: InventoryItem) => {
    const payload: any = removeUndefined({
        name: item.name, category: item.category, code: item.code || undefined,
        current_quantity: item.current_quantity ?? 0, unit: item.unit || 'units',
        min_quantity: item.min_quantity ?? 0, status: item.status || 'active',
        location: item.location || undefined, supplier_code: item.supplier_code || undefined,
        color: item.color || undefined,
        color_family: item.color_family || undefined, finish: item.finish || undefined,
        notes: item.notes || undefined,
    });
    if (ctx.sedeId) payload.sede_id = ctx.sedeId;
    try {
        const { error } = await withTimeout('inventory_items.insert', supabase.from('inventory_items').insert(payload));
        if (error) { showError(`No se pudo crear el item. ${error.message || ''}`); return; }
        ctx.safeReload();
    } catch (err: any) {
        showError(`No se pudo crear el item. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
    }
};

export const updateInventoryItem = async (ctx: OpsContext, id: string, updates: Partial<InventoryItem>) => {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.code !== undefined) payload.code = updates.code || null;
    if (updates.current_quantity !== undefined) payload.current_quantity = updates.current_quantity;
    if (updates.unit !== undefined) payload.unit = updates.unit;
    if (updates.min_quantity !== undefined) payload.min_quantity = updates.min_quantity;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.location !== undefined) payload.location = updates.location || null;
    if (updates.supplier_code !== undefined) payload.supplier_code = updates.supplier_code || null;
    if (updates.color !== undefined) payload.color = updates.color || null;
    if (updates.color_family !== undefined) payload.color_family = updates.color_family || null;
    if (updates.finish !== undefined) payload.finish = updates.finish || null;
    if (updates.notes !== undefined) payload.notes = updates.notes || null;
    try {
        const { error } = await withTimeout('inventory_items.update', supabase.from('inventory_items').update(payload).eq('id', id));
        if (error) { showError(`No se pudo actualizar el item. ${error.message || ''}`); return; }
        ctx.setInventoryItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
        ctx.safeReload();
    } catch (err: any) {
        showError(`No se pudo actualizar el item. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
    }
};

export const archiveInventoryItem = async (ctx: OpsContext, id: string) => {
    try {
        const { error } = await withTimeout('inventory_items.archive',
            supabase.from('inventory_items').update({ status: 'archived' }).eq('id', id));
        if (error) { showError(`No se pudo archivar el item. ${error.message || ''}`); return; }
        ctx.setInventoryItems(prev => prev.map(i => i.id === id ? { ...i, status: 'archived' as const } : i));
    } catch (err: any) {
        showError(`No se pudo archivar el item. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
    }
};

export const deleteInventoryItem = async (ctx: OpsContext, id: string) => {
    ctx.setInventoryItems(prev => prev.filter(i => i.id !== id));
    try {
        const { error } = await withTimeout('inventory_items.delete', supabase.from('inventory_items').delete().eq('id', id));
        if (error) { showError(`No se pudo eliminar el item. ${error.message || ''}`); ctx.safeReload(); return; }
    } catch (err: any) {
        showError(`No se pudo eliminar el item. ${err?.message || ''}`);
        ctx.safeReload();
    }
};

export const addInventoryMovement = async (ctx: OpsContext, movement: Omit<InventoryMovement, 'id'>) => {
    const payload: any = {
        inventory_item_id: movement.item_id, item_id: movement.item_id,
        type: movement.type, quantity: movement.quantity,
        new_quantity: movement.new_quantity, unit: movement.unit || null,
        reason: movement.reason || null, date: movement.date || null,
        notes: movement.notes || null,
    };
    if (ctx.sedeId) payload.sede_id = ctx.sedeId;
    try {
        const { error } = await withTimeout('inventory_movements.insert', supabase.from('inventory_movements').insert(payload));
        if (error) { showError(`No se pudo registrar el movimiento. ${error.message || ''}`); return; }
        if (movement.new_quantity !== undefined) {
            ctx.setInventoryItems(prev => prev.map(item =>
                item.id === movement.item_id ? { ...item, current_quantity: movement.new_quantity! } : item
            ));
        }
        ctx.safeReload();
    } catch (err: any) {
        showError(`No se pudo registrar el movimiento. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
    }
};
