import type { Student, ClassSession, AssignedClass } from '../../types';
import { supabase, withTimeout, buildStudentPayload, extractTime, isAbortError, OpsContext } from './shared';
import { showError, showWarning } from '../toast';

const buildAssignedKey = (cls: AssignedClass) => `${cls.date}|${cls.startTime}|${cls.endTime}`;

const persistAssignedClasses = async (studentId: string, assignedClasses: AssignedClass[], sedeId: string | null) => {
    await withTimeout('assigned_classes.delete', supabase.from('student_assigned_classes').delete().eq('student_id', studentId));
    if (!assignedClasses.length) return;
    const rows = assignedClasses.map(cls => ({
        student_id: studentId,
        ...(sedeId ? { sede_id: sedeId } : {}),
        date: cls.date,
        start_time: cls.startTime,
        end_time: cls.endTime,
        status: cls.status || 'pending'
    }));
    const { error } = await withTimeout('assigned_classes.insert', supabase.from('student_assigned_classes').insert(rows));
    if (error) console.error('Assigned classes insert error', error);
};

const removeAssignedClassesFromSessions = async (student: Student, removedClasses: AssignedClass[], sessions: ClassSession[]) => {
    if (!removedClasses.length) return;
    for (const cls of removedClasses) {
        let sessionMatch = sessions.find(s => s.date === cls.date && s.startTime === cls.startTime && s.endTime === cls.endTime);
        if (!sessionMatch) {
            try {
                const { data, error } = await withTimeout('sessions.select_for_unlink',
                    supabase.from('sessions').select('id').eq('date', cls.date).eq('start_time', cls.startTime).eq('end_time', cls.endTime).limit(1).single()
                );
                if (error) continue;
                sessionMatch = { id: data.id } as ClassSession;
            } catch { continue; }
        }
        try {
            await withTimeout('session_students.delete_unassigned',
                supabase.from('session_students').delete().eq('session_id', sessionMatch.id).eq('student_id', student.id)
            );
        } catch (err) { console.error('Session student delete timeout in removeAssigned', err); }
    }
};

const syncAssignedClassesToSessions = async (student: Student, assignedClasses: AssignedClass[], sessions: ClassSession[]) => {
    if (!assignedClasses.length) return;
    const studentName = `${student.name} ${student.surname || ''}`.trim().toUpperCase();
    const inferredType = student.classType?.toLowerCase() === 'torno' ? 'torno' : 'mesa';

    for (const cls of assignedClasses) {
        let sessionMatch = sessions.find(s => s.date === cls.date && s.startTime === cls.startTime);
        if (!sessionMatch) {
            try {
                const { data, error } = await withTimeout('sessions.insert_for_assigned',
                    supabase.from('sessions').insert({ date: cls.date, start_time: cls.startTime, end_time: cls.endTime, class_type: inferredType }).select().single()
                );
                if (error) { console.error('Session insert error', error); continue; }
                sessionMatch = { id: data.id, date: data.date, startTime: extractTime(data.start_time), endTime: extractTime(data.end_time), classType: data.class_type, students: [] } as ClassSession;
            } catch { continue; }
        }
        const attendance = cls.status === 'present' || cls.status === 'absent' ? cls.status : 'pending';
        try {
            const { error } = await withTimeout('session_students.upsert_assigned',
                supabase.from('session_students').upsert({ session_id: sessionMatch.id, student_id: student.id, student_name: studentName, attendance }, { onConflict: 'session_id,student_id' })
            );
            if (error) console.error('Session student upsert error', error);
        } catch (err) { console.error('Session student upsert timeout', err); }
    }
};

export const addStudent = async (ctx: OpsContext, newStudent: Omit<Student, 'id'>) => {
    if (ctx.operationLockRef.current) {
        showWarning('Hay otra operación en progreso. Espera un momento e intenta de nuevo.');
        return;
    }
    ctx.operationLockRef.current = true;
    let payload = buildStudentPayload(newStudent);
    if (ctx.sedeId) payload = { ...payload, sede_id: ctx.sedeId };
    try {
        const { data, error } = await withTimeout('students.insert', supabase.from('students').insert(payload).select().single());
        if (error) { showError(`No se pudo crear el alumno. ${error.message || ''}`); return; }

        // IMMEDIATE UI update — don't wait for safeReload
        const newStudentWithId: Student = {
            ...newStudent,
            id: data.id,
            name: newStudent.name || data.name,
            surname: newStudent.surname || data.surname || undefined,
            phone: newStudent.phone || '',
            classesRemaining: newStudent.classesRemaining ?? data.classes_remaining ?? 0,
            status: newStudent.status || data.status || 'membresia',
            assignedClasses: newStudent.assignedClasses || [],
            studentCategory: newStudent.studentCategory || data.student_category || 'membresia',
            bonosAsignados: newStudent.bonosAsignados ?? data.bonos_asignados ?? 4,
            repetirMensualmente: newStudent.repetirMensualmente ?? false,
        };
        ctx.setStudents(prev => [newStudentWithId, ...prev]);

        const assignedClasses = newStudent.assignedClasses || [];
        if (assignedClasses.length) {
            await persistAssignedClasses(data.id, assignedClasses, ctx.sedeId);
            await syncAssignedClassesToSessions({ ...newStudent, id: data.id } as Student, assignedClasses, ctx.sessions);
        }
        // Background reload — if it fails, UI already has the student
        ctx.safeReload();
    } catch (err: any) {
        if (isAbortError(err)) { console.warn('addStudent: request aborted, reloading...'); ctx.safeReload(); }
        else showError(`No se pudo crear el alumno. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
    } finally { ctx.operationLockRef.current = false; }
};

export const updateStudent = async (ctx: OpsContext, id: string, updates: Partial<Student>) => {
    if (ctx.operationLockRef.current) {
        showWarning('Hay otra operación en progreso. Espera un momento e intenta de nuevo.');
        return;
    }
    ctx.operationLockRef.current = true;

    // OPTIMISTIC: update UI immediately
    const previousStudents = [...ctx.students];
    ctx.setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

    const payload = buildStudentPayload(updates);
    try {
        const { error } = await withTimeout('students.update', supabase.from('students').update(payload).eq('id', id));
        if (error) {
            // REVERT on error
            ctx.setStudents(previousStudents);
            showError(`No se pudo actualizar el alumno. ${error.message || ''}`);
            return;
        }
        if (updates.assignedClasses) {
            const student = previousStudents.find(s => s.id === id);
            if (student) {
                const prevAssigned = student.assignedClasses || [];
                const nextSet = new Set(updates.assignedClasses.map(buildAssignedKey));
                const removed = prevAssigned.filter(cls => !nextSet.has(buildAssignedKey(cls)));
                await persistAssignedClasses(id, updates.assignedClasses, ctx.sedeId);
                await removeAssignedClassesFromSessions({ ...student, ...updates } as Student, removed, ctx.sessions);
                await syncAssignedClassesToSessions({ ...student, ...updates } as Student, updates.assignedClasses, ctx.sessions);
            }
        }
        ctx.safeReload();
    } catch (err: any) {
        if (isAbortError(err)) { console.warn('updateStudent: request aborted, reloading...'); ctx.safeReload(); }
        else {
            ctx.setStudents(previousStudents); // REVERT
            showError(`No se pudo actualizar el alumno. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    } finally { ctx.operationLockRef.current = false; }
};

export const deleteStudent = async (ctx: OpsContext, id: string) => {
    if (ctx.operationLockRef.current) {
        showWarning('Hay otra operación en progreso. Espera un momento e intenta de nuevo.');
        return;
    }
    ctx.operationLockRef.current = true;
    ctx.setStudents(prev => prev.filter(s => s.id !== id));
    // Also remove from sessions UI immediately
    const deletedStudent = ctx.students.find(st => st.id === id);
    if (deletedStudent) {
        const fullName = `${deletedStudent.name} ${deletedStudent.surname || ''}`.trim().toUpperCase();
        ctx.setSessions(prev => prev.map(s => ({
            ...s, students: (s.students || []).filter(name => name.toUpperCase() !== fullName)
        })));
    }
    try {
        // DB has ON DELETE CASCADE for all dependents
        const { error } = await withTimeout('students.delete', supabase.from('students').delete().eq('id', id));
        if (error) { showError(`No se pudo eliminar el alumno. ${error.message || ''}`); ctx.safeReload(); return; }
        console.log('deleteStudent: alumno eliminado correctamente');
    } catch (err: any) {
        if (isAbortError(err)) { console.warn('deleteStudent: request aborted — optimistic update active, verifying...'); }
        else { showError(`No se pudo eliminar el alumno. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`); }
        ctx.safeReload();
    } finally { ctx.operationLockRef.current = false; }
};

export const renewStudent = async (ctx: OpsContext, id: string, numClasses: number = 4) => {
    const student = ctx.students.find(s => s.id === id);
    if (!student) { showError('Alumno no encontrado.'); return; }
    const nextClasses = (student.classesRemaining ?? 0) + numClasses;
    const today = new Date().toISOString().split('T')[0];
    const baseDate = student.expiryDate && student.expiryDate > today ? new Date(student.expiryDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);
    const newExpiryDate = baseDate.toISOString().split('T')[0];
    await updateStudent(ctx, id, { classesRemaining: nextClasses, status: 'membresia', expiryDate: newExpiryDate });
};
