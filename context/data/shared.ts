import React from 'react';
import { supabase } from '../../supabaseClient';
import type { Student, ClassSession, AssignedClass } from '../../types';

export { supabase };

export const WRITE_TIMEOUT_MS = 15000;
export const RELOAD_TIMEOUT_MS = 12000;

// AbortError happens when React re-renders and the browser cancels an in-flight fetch.
// The operation often succeeded on the server — we should NOT scare the user with an error.
export const isAbortError = (err: any): boolean =>
    err?.name === 'AbortError' || (typeof err?.message === 'string' && err.message.includes('aborted'));

// Timeout wrapper with REAL abort after hard limit.
// Warns at timeoutMs, rejects at 2x timeoutMs.
export const withTimeout = async <T,>(
    operation: string,
    queryOrPromise: T | Promise<T>,
    timeoutMs: number = WRITE_TIMEOUT_MS
): Promise<Awaited<T>> => {
    let didWarn = false;
    const hardLimit = timeoutMs * 2; // 30s for writes

    const warnTimer = setTimeout(() => {
        didWarn = true;
        console.warn(`⚠️ ${operation} is taking longer than ${timeoutMs}ms — still waiting...`);
    }, timeoutMs);

    try {
        const result = await Promise.race([
            Promise.resolve(queryOrPromise),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(
                    `${operation}: timeout after ${hardLimit}ms. Revisa tu conexión.`
                )), hardLimit)
            )
        ]);
        return result as Awaited<T>;
    } finally {
        clearTimeout(warnTimer);
        if (didWarn) console.log(`✅ ${operation} completed (was slow but succeeded)`);
    }
};

export const removeUndefined = (obj: Record<string, any>) => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) result[key] = value;
    }
    return result;
};

export const extractTime = (value: string | null | undefined): string => {
    if (!value) return '00:00';
    if (/^\d{2}:\d{2}$/.test(value)) return value;
    if (value.includes('T')) {
        const timePart = value.split('T')[1];
        if (timePart) return timePart.substring(0, 5);
    }
    return value.substring(0, 5);
};

export const normalizeForMatch = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
};

export const buildStudentPayload = (student: Partial<Student>) => {
    const fullName = student.name ? [student.name, student.surname].filter(Boolean).join(' ') : undefined;
    const payload: Record<string, any> = {};
    if (student.name !== undefined) payload.name = student.name;
    if (fullName !== undefined) payload.full_name = fullName;
    if (student.surname !== undefined) payload.surname = student.surname || null;
    if (student.email !== undefined) payload.email = student.email || null;
    if (student.phone !== undefined) payload.phone = student.phone || null;
    if (student.phoneCountry !== undefined) payload.phone_country = student.phoneCountry || null;
    if (student.birthDay !== undefined) payload.birth_day = student.birthDay ? Number(student.birthDay) : null;
    if (student.birthMonth !== undefined) payload.birth_month = student.birthMonth ? Number(student.birthMonth) : null;
    if (student.birthYear !== undefined) payload.birth_year = student.birthYear ? Number(student.birthYear) : null;
    if (student.classesRemaining !== undefined) payload.classes_remaining = student.classesRemaining;
    if (student.status !== undefined) payload.status = student.status;
    if (student.paymentMethod !== undefined) payload.payment_method = student.paymentMethod || null;
    if (student.notes !== undefined) payload.notes = student.notes || null;
    if (student.observations !== undefined) payload.observations = student.observations || null;
    if (student.price !== undefined) payload.price = student.price ?? null;
    if (student.classType !== undefined) payload.class_type = student.classType || null;
    if (student.expiryDate !== undefined) payload.expiry_date = student.expiryDate || null;
    if (student.studentCategory !== undefined) payload.student_category = student.studentCategory || 'membresia';
    if (student.groupName !== undefined) payload.group_name = student.groupName || null;
    if (student.bonosAsignados !== undefined) payload.bonos_asignados = student.bonosAsignados;
    if (student.repetirMensualmente !== undefined) payload.repetir_mensualmente = student.repetirMensualmente;
    return payload;
};

export const buildSessionPayload = (data: Partial<ClassSession>) => {
    let startTimestamp: string | undefined;
    let endTimestamp: string | undefined;
    if (data.date && data.startTime) startTimestamp = `${data.date}T${data.startTime}:00`;
    if (data.date && data.endTime) endTimestamp = `${data.date}T${data.endTime}:00`;
    const payload: Record<string, any> = {};
    if (data.date !== undefined) payload.date = data.date;
    if (data.startTime !== undefined || startTimestamp) payload.start_time = startTimestamp ?? data.startTime;
    if (data.endTime !== undefined || endTimestamp) payload.end_time = endTimestamp ?? data.endTime;
    if (data.classType !== undefined) payload.class_type = data.classType;
    if (data.teacherId !== undefined) payload.teacher_id = data.teacherId || null;
    if (data.teacherSubstituteId !== undefined) payload.teacher_substitute_id = data.teacherSubstituteId || null;
    if (data.completedAt !== undefined) payload.completed_at = data.completedAt || null;
    if (data.workshopName !== undefined) payload.workshop_name = data.workshopName || null;
    if (data.privateReason !== undefined) payload.private_reason = data.privateReason || null;
    if (data.sessionAudience !== undefined) payload.session_audience = data.sessionAudience || null;
    return payload;
};

export const mapStudentRowToModel = (row: any): Student => ({
    id: row.id,
    name: row.name || row.full_name || '',
    surname: row.surname || undefined,
    email: row.email || undefined,
    phone: row.phone || '',
    phoneCountry: row.phone_country || undefined,
    birthDay: row.birth_day ? String(row.birth_day) : undefined,
    birthMonth: row.birth_month ? String(row.birth_month) : undefined,
    birthYear: row.birth_year ? String(row.birth_year) : undefined,
    classesRemaining: row.classes_remaining ?? 0,
    status: row.status || 'new',
    paymentMethod: row.payment_method || undefined,
    notes: row.notes || undefined,
    observations: row.observations || undefined,
    price: row.price ?? undefined,
    assignedClasses: [],
    classType: row.class_type || undefined,
    expiryDate: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : undefined,
    studentCategory: row.student_category || 'membresia',
    groupName: row.group_name || undefined,
    bonosAsignados: row.bonos_asignados ?? 4,
    repetirMensualmente: row.repetir_mensualmente ?? false,
    createdAt: row.created_at || undefined
});

// Shared context passed to all operation modules
export interface OpsContext {
    sedeId: string | null;
    isSuperAdmin: boolean;
    operationLockRef: React.MutableRefObject<boolean>;
    students: Student[];
    sessions: ClassSession[];
    pieces: any[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    setSessions: React.Dispatch<React.SetStateAction<ClassSession[]>>;
    setTeachers: React.Dispatch<React.SetStateAction<any[]>>;
    setPieces: React.Dispatch<React.SetStateAction<any[]>>;
    setGiftCards: React.Dispatch<React.SetStateAction<any[]>>;
    setInventoryItems: React.Dispatch<React.SetStateAction<any[]>>;
    setInventoryMovements: React.Dispatch<React.SetStateAction<any[]>>;
    safeReload: () => Promise<void>;
}
