import type { ClassSession, Student } from '../../types';
import { supabase, withTimeout, buildSessionPayload, isAbortError, OpsContext } from './shared';

const syncSessionStudents = async (ctx: OpsContext, sessionId: string, studentNames: string[], attendance?: Record<string, 'present' | 'absent'>) => {
    const normalizedNames = [...new Set(studentNames.map(name => name.toUpperCase().trim()).filter(Boolean))];
    const { data: existing, error } = await withTimeout('session_students.select',
        supabase.from('session_students').select('student_id, student_name, sede_id').eq('session_id', sessionId)
    );
    if (error) throw new Error(`No se pudo leer session_students: ${error.message}`);
    const existingRows = existing || [];
    const existingNames = new Set(existingRows.map(row => (row.student_name || '').toUpperCase()));
    const desiredNames = new Set(normalizedNames);

    if (normalizedNames.length === 0) {
        const { error: deleteAllError } = await withTimeout('session_students.delete_all',
            supabase.from('session_students').delete().eq('session_id', sessionId)
        );
        if (deleteAllError) throw new Error(`No se pudo limpiar session_students: ${deleteAllError.message}`);
        return;
    }

    const toDelete = existingRows.filter(row => !desiredNames.has((row.student_name || '').toUpperCase()));
    if (toDelete.length) {
        const studentIdsToDelete = toDelete.map(row => row.student_id).filter(Boolean);
        if (studentIdsToDelete.length) {
            const { error: deleteError } = await withTimeout('session_students.delete_removed',
                supabase.from('session_students').delete().eq('session_id', sessionId).in('student_id', studentIdsToDelete)
            );
            if (deleteError) throw new Error(`No se pudieron eliminar vínculos antiguos: ${deleteError.message}`);
        }
    }

    const toInsert = normalizedNames.filter(name => !existingNames.has(name));
    const insertRows = toInsert.map(name => {
        const student = ctx.students.find(s => `${s.name} ${s.surname || ''}`.trim().toUpperCase() === name);
        if (!student) return null;
        const status = attendance?.[name] === 'present' || attendance?.[name] === 'absent' ? attendance?.[name] : 'pending';
        const isTemporary = student.studentCategory === 'temporal';
        return {
            session_id: sessionId, student_id: student.id, student_name: name,
            attendance: status, sede_id: ctx.sedeId || undefined,
            is_temporary: isTemporary, temp_group_name: isTemporary ? (student.groupName || null) : null
        };
    }).filter(Boolean);

    if (insertRows.length) {
        const { error: insertError } = await withTimeout('session_students.upsert',
            supabase.from('session_students').upsert(insertRows, { onConflict: 'session_id,student_id' })
        );
        if (insertError) throw new Error(`No se pudieron vincular alumnos a la sesión: ${insertError.message}`);
    }

    if (attendance && existingRows.length) {
        const updates = existingRows.map(row => ({
            session_id: sessionId, student_id: row.student_id, student_name: row.student_name,
            attendance: attendance[(row.student_name || '').toUpperCase()] || attendance[row.student_name || ''] || 'pending',
            sede_id: row.sede_id || ctx.sedeId || undefined
        }));
        const { error: upsertError } = await withTimeout('session_students.upsert_attendance',
            supabase.from('session_students').upsert(updates, { onConflict: 'session_id,student_id' })
        );
        if (upsertError) throw new Error(`No se pudo actualizar asistencia: ${upsertError.message}`);
    }
};

const updateSessionAttendance = async (ctx: OpsContext, sessionId: string, attendance: Record<string, 'present' | 'absent'>) => {
    const { data: existing, error } = await withTimeout('session_students.select_for_attendance',
        supabase.from('session_students').select('student_id, student_name, sede_id').eq('session_id', sessionId)
    );
    if (error) { console.error('Load session students error', error); return; }
    const updates = (existing || []).map(row => ({
        session_id: sessionId, student_id: row.student_id, student_name: row.student_name,
        attendance: attendance[(row.student_name || '').toUpperCase()] || attendance[row.student_name || ''] || 'pending',
        sede_id: row.sede_id || ctx.sedeId || undefined
    }));
    if (updates.length) {
        const { error: upsertError } = await withTimeout('session_students.upsert_attendance_only',
            supabase.from('session_students').upsert(updates, { onConflict: 'session_id,student_id' })
        );
        if (upsertError) console.error('Session attendance upsert error', upsertError);
    }
};

export const addSession = async (ctx: OpsContext, newSession: Omit<ClassSession, 'id'>) => {
    let payload = buildSessionPayload(newSession);
    if (ctx.sedeId) payload = { ...payload, sede_id: ctx.sedeId };
    let data: any;
    try {
        const res = await withTimeout('sessions.insert', supabase.from('sessions').insert(payload).select().single());
        if (res.error) { alert(`ERROR: No se pudo crear la sesión. ${res.error.message || ''}`); return; }
        data = res.data;
    } catch (error: any) {
        alert(`ERROR: No se pudo crear la sesión. ${error.message || 'Conexión lenta, intenta de nuevo.'}`);
        return;
    }

    // IMMEDIATE UI update
    const newSessionWithId: ClassSession = {
        ...newSession,
        id: data.id,
        students: newSession.students || [],
    };
    ctx.setSessions(prev => [newSessionWithId, ...prev]);

    if (newSession.students && newSession.students.length) {
        try {
            await syncSessionStudents(ctx, data.id, newSession.students, newSession.attendance || undefined);
        } catch (syncErr: any) {
            alert(`ADVERTENCIA: La sesión se creó, pero no se pudieron vincular alumnos. ${syncErr?.message || ''}`);
        }
    }
    // Background reload
    ctx.safeReload();
};

export const updateSession = async (ctx: OpsContext, id: string, updates: Partial<ClassSession>) => {
    const payload = buildSessionPayload(updates);
    if (Object.keys(payload).length) {
        try {
            const { error } = await withTimeout('sessions.update', supabase.from('sessions').update(payload).eq('id', id));
            if (error) { alert(`ERROR: No se pudo actualizar la sesión. ${error.message || ''}`); return; }
        } catch (error: any) {
            alert(`ERROR: No se pudo actualizar la sesión. ${error.message || 'Conexión lenta, intenta de nuevo.'}`);
            return;
        }
    }
    if (updates.classType === 'feriado') {
        const { error: clearError } = await withTimeout('session_students.clear_for_feriado',
            supabase.from('session_students').delete().eq('session_id', id)
        );
        if (clearError) console.error('session_students clear (feriado) error', clearError);
    }
    if (updates.students) {
        try { await syncSessionStudents(ctx, id, updates.students!, updates.attendance || undefined); }
        catch (syncErr: any) {
            alert(`ADVERTENCIA: La sesión se actualizó, pero falló la vinculación de alumnos. ${syncErr?.message || ''}`);
        }
    } else if (updates.attendance) {
        await updateSessionAttendance(ctx, id, updates.attendance);
    }
    ctx.safeReload();
};

export const deleteSession = async (ctx: OpsContext, id: string) => {
    ctx.setSessions(prev => prev.filter(s => s.id !== id));
    try {
        // session_students has ON DELETE CASCADE from sessions
        const { error } = await withTimeout('sessions.delete', supabase.from('sessions').delete().eq('id', id));
        if (error) { alert(`ERROR: No se pudo eliminar la sesión. ${error.message || ''}`); ctx.safeReload(); return; }
        console.log('deleteSession: sesión eliminada correctamente');
    } catch (err: any) {
        if (isAbortError(err)) { console.warn('deleteSession: request aborted, optimistic update active'); }
        else { alert(`ERROR: ${err.message || 'Error inesperado al eliminar sesión.'}`); }
        ctx.safeReload();
    }
};
