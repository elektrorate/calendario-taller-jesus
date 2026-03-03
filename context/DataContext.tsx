import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import {
    Student,
    ClassSession,
    CeramicPiece,
    GiftCard,
    AssignedClass,
    InventoryItem,
    InventoryMovement,
    Teacher
} from '../types';

interface DataContextType {
    // Data
    students: Student[];
    sessions: ClassSession[];
    pieces: CeramicPiece[];
    giftCards: GiftCard[];
    inventoryItems: InventoryItem[];
    inventoryMovements: InventoryMovement[];
    teachers: Teacher[];
    isLoadingData: boolean;

    // Student CRUD
    addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
    updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
    renewStudent: (id: string, numClasses?: number) => Promise<void>;

    // Session CRUD
    addSession: (session: Omit<ClassSession, 'id'>) => Promise<void>;
    updateSession: (id: string, updates: Partial<ClassSession>) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;

    // Teacher CRUD
    addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<void>;
    updateTeacher: (id: string, updates: Partial<Teacher>) => Promise<void>;
    deleteTeacher: (id: string) => Promise<void>;

    // Piece CRUD
    addPiece: (piece: Omit<CeramicPiece, 'id'>) => Promise<void>;
    updatePiece: (id: string, updates: Partial<CeramicPiece>) => Promise<void>;
    deletePiece: (id: string) => Promise<void>;

    // GiftCard CRUD
    addGiftCard: (card: Omit<GiftCard, 'id' | 'createdAt'>) => Promise<void>;
    updateGiftCard: (id: string, updates: Partial<GiftCard>) => Promise<void>;
    deleteGiftCard: (id: string) => Promise<void>;

    // Inventory CRUD
    addInventoryItem: (item: InventoryItem) => Promise<void>;
    updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
    archiveInventoryItem: (id: string) => Promise<void>;
    deleteInventoryItem: (id: string) => Promise<void>;
    addInventoryMovement: (movement: Omit<InventoryMovement, 'id'>) => Promise<void>;

    // Refresh
    loadAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

interface DataProviderProps {
    children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
    const { session, sedeId, isSuperAdmin } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [pieces, setPieces] = useState<CeramicPiece[]>([]);
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const hasLoadedOnceRef = useRef(false);
    const WRITE_TIMEOUT_MS = 30000;
    const RELOAD_TIMEOUT_MS = 30000;

    // withTimeout: NON-DESTRUCTIVE timeout wrapper.
    // If the operation takes longer than timeoutMs, it logs a warning but does NOT
    // reject or kill the operation. The Supabase call always completes naturally.
    // This prevents false "Timeout" errors that scared users when the operation actually succeeded.
    const withTimeout = async <T,>(operation: string, queryOrPromise: T | Promise<T>, timeoutMs: number = WRITE_TIMEOUT_MS): Promise<Awaited<T>> => {
        let didWarn = false;
        const warnTimer = setTimeout(() => {
            didWarn = true;
            console.warn(`⚠️ ${operation} is taking longer than ${timeoutMs}ms — still waiting...`);
        }, timeoutMs);

        try {
            const result = await Promise.resolve(queryOrPromise);
            return result as Awaited<T>;
        } finally {
            clearTimeout(warnTimer);
            if (didWarn) {
                console.log(`✅ ${operation} completed (was slow but succeeded)`);
            }
        }
    };

    const removeUndefined = (obj: Record<string, any>) => {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) result[key] = value;
        }
        return result;
    };

    // Extract HH:MM from ISO timestamp or return as-is if already HH:MM
    const extractTime = (value: string | null | undefined): string => {
        if (!value) return '00:00';
        // Already HH:MM format
        if (/^\d{2}:\d{2}$/.test(value)) return value;
        // ISO timestamp like "2026-02-26T10:00:00+00:00" or "2026-02-26T10:00:00"
        if (value.includes('T')) {
            const timePart = value.split('T')[1];
            if (timePart) return timePart.substring(0, 5);
        }
        return value.substring(0, 5);
    };

    const buildStudentPayload = (student: Partial<Student>) => {
        // Build full_name from name + surname (full_name is NOT NULL in DB)
        const fullName = student.name
            ? [student.name, student.surname].filter(Boolean).join(' ')
            : undefined;
        // CRITICAL FIX: Use null (not undefined) for optional fields in UPDATE payloads.
        // removeUndefined was stripping fields the user intentionally cleared, so Supabase
        // would leave the old value in place — causing edits to appear not to save.
        const payload: Record<string, any> = {};
        if (student.name !== undefined) payload.name = student.name;
        if (fullName !== undefined) payload.full_name = fullName;
        // Optional: always send null to explicitly clear, never skip
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

    // DT-3 FIX: Don't use removeUndefined for sessions.
    // Send null for optional fields that were cleared by the user.
    const buildSessionPayload = (data: Partial<ClassSession>) => {
        // Build full timestamps for start_time/end_time (timestamp with time zone NOT NULL in DB)
        // The frontend sends date as "2026-02-26" and startTime/endTime as "10:00"
        let startTimestamp: string | undefined;
        let endTimestamp: string | undefined;
        if (data.date && data.startTime) {
            startTimestamp = `${data.date}T${data.startTime}:00`;
        }
        if (data.date && data.endTime) {
            endTimestamp = `${data.date}T${data.endTime}:00`;
        }
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

    const loadAllData = useCallback(async () => {
        if (!session) return;
        // For non-super_admin, wait until sedeId is resolved
        if (!isSuperAdmin && !sedeId) return;

        // Only show loading spinner on the FIRST load.
        // After that, refresh silently in the background.
        if (!hasLoadedOnceRef.current) {
            setIsLoadingData(true);
        }
        try {
            // Build queries - filter by sede_id for non-super_admin users
            const buildQuery = (table: string) => {
                let query = supabase.from(table).select('*');
                if (!isSuperAdmin && sedeId) {
                    query = query.eq('sede_id', sedeId);
                }
                return query;
            };

            const [
                studentsRes,
                teachersRes,
                sessionsRes,
                sessionStudentsRes,
                assignedRes,
                piecesRes,
                giftRes,
                inventoryRes,
                movementsRes
            ] = await Promise.all([
                buildQuery('students'),
                buildQuery('teachers'),
                buildQuery('sessions'),
                buildQuery('session_students'),
                buildQuery('student_assigned_classes'),
                buildQuery('pieces'),
                buildQuery('gift_cards'),
                buildQuery('inventory_items'),
                buildQuery('inventory_movements')
            ]);

            if (studentsRes.error) throw studentsRes.error;
            if (teachersRes.error) throw teachersRes.error;
            if (sessionsRes.error) throw sessionsRes.error;
            if (sessionStudentsRes.error) throw sessionStudentsRes.error;
            if (assignedRes.error) throw assignedRes.error;
            if (piecesRes.error) throw piecesRes.error;
            if (giftRes.error) throw giftRes.error;
            if (inventoryRes.error) throw inventoryRes.error;
            if (movementsRes.error) throw movementsRes.error;

            const assignedMap: Record<string, AssignedClass[]> = {};
            (assignedRes.data || []).forEach((row: any) => {
                if (!assignedMap[row.student_id]) assignedMap[row.student_id] = [];
                assignedMap[row.student_id].push({
                    date: row.date,
                    startTime: extractTime(row.start_time),
                    endTime: extractTime(row.end_time),
                    status: row.status || 'pending'
                });
            });

            // BUG 5 FIX: Use ?? instead of || for numeric fields to preserve 0 values
            const normalizedStudents: Student[] = (studentsRes.data || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                surname: row.surname || undefined,
                email: row.email || undefined,
                phone: row.phone,
                phoneCountry: row.phone_country || undefined,
                birthDay: row.birth_day ? String(row.birth_day) : undefined,
                birthMonth: row.birth_month ? String(row.birth_month) : undefined,
                birthYear: row.birth_year ? String(row.birth_year) : undefined,
                classesRemaining: row.classes_remaining ?? 0,
                status: row.status,
                paymentMethod: row.payment_method || undefined,
                notes: row.notes || undefined,
                observations: row.observations || undefined,
                price: row.price ?? undefined,
                assignedClasses: assignedMap[row.id] || [],
                classType: row.class_type || undefined,
                expiryDate: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : undefined,
                studentCategory: row.student_category || 'membresia',
                groupName: row.group_name || undefined,
                bonosAsignados: row.bonos_asignados ?? 4,
                repetirMensualmente: row.repetir_mensualmente ?? false,
                createdAt: row.created_at || undefined
            }));

            const sessionStudentsMap: Record<string, any[]> = {};
            (sessionStudentsRes.data || []).forEach((row: any) => {
                if (!sessionStudentsMap[row.session_id]) sessionStudentsMap[row.session_id] = [];
                sessionStudentsMap[row.session_id].push(row);
            });

            const normalizedSessions: ClassSession[] = (sessionsRes.data || []).map((row: any) => {
                const linked = sessionStudentsMap[row.id] || [];
                const attendance: Record<string, 'present' | 'absent'> = {};
                linked.forEach((item: any) => {
                    if (item.attendance === 'present' || item.attendance === 'absent') {
                        attendance[item.student_name] = item.attendance;
                    }
                });
                return {
                    id: row.id,
                    date: row.date,
                    startTime: extractTime(row.start_time),
                    endTime: extractTime(row.end_time),
                    classType: row.class_type,
                    students: linked.map((item: any) => item.student_name),
                    attendance: Object.keys(attendance).length ? attendance : undefined,
                    teacherId: row.teacher_id || undefined,
                    teacherSubstituteId: row.teacher_substitute_id || undefined,
                    completedAt: row.completed_at || undefined,
                    workshopName: row.workshop_name || undefined,
                    privateReason: row.private_reason || undefined,
                    sessionAudience: row.session_audience || undefined
                };
            });

            const normalizedPieces: CeramicPiece[] = (piecesRes.data || []).map((row: any) => ({
                id: row.id,
                owner: row.owner_name,
                description: row.description,
                status: row.status,
                glazeType: row.glaze_type || undefined,
                deliveryDate: row.delivery_date || undefined,
                notes: row.notes || undefined,
                extraCommentary: row.extra_commentary || undefined,
                createdAt: row.created_at || undefined
            }));

            const normalizedGiftCards: GiftCard[] = (giftRes.data || []).map((row: any) => ({
                id: row.id,
                buyer: row.buyer,
                recipient: row.recipient,
                recipientStudentId: row.recipient_student_id || undefined,
                numClasses: row.num_classes,
                type: row.type,
                scheduledDate: row.scheduled_date || undefined,
                expiryDate: row.expiry_date || undefined,
                createdAt: row.created_at,
                extraCommentary: row.extra_commentary || undefined
            }));

            setStudents(normalizedStudents);

            // ★ AUTO-RENEWAL: renew expired memberships with repetir_mensualmente = true
            const today = new Date().toISOString().split('T')[0];
            const studentsToRenew = normalizedStudents.filter(s =>
                s.repetirMensualmente &&
                s.studentCategory === 'membresia' &&
                s.expiryDate &&
                s.expiryDate < today // Now safe: expiryDate is always YYYY-MM-DD from normalizer
            );
            if (studentsToRenew.length > 0) {
                // Fire-and-forget: don't block the UI
                (async () => {
                    for (const st of studentsToRenew) {
                        const currentExpiry = new Date(st.expiryDate!);
                        const newExpiry = new Date(currentExpiry);
                        newExpiry.setMonth(newExpiry.getMonth() + 1);
                        // If still in the past, jump to next month from today
                        if (newExpiry.toISOString().split('T')[0] < today) {
                            const fromToday = new Date();
                            fromToday.setMonth(fromToday.getMonth() + 1);
                            newExpiry.setTime(fromToday.getTime());
                        }
                        const newExpiryStr = newExpiry.toISOString().split('T')[0];
                        const renewedBonos = st.bonosAsignados ?? 4;
                        try {
                            await withTimeout('students.auto_renew', supabase.from('students').update({
                                classes_remaining: renewedBonos,
                                expiry_date: newExpiryStr,
                                status: 'membresia'
                            }).eq('id', st.id));
                            // Update local state
                            setStudents(prev => prev.map(s => s.id === st.id ? {
                                ...s,
                                classesRemaining: renewedBonos,
                                expiryDate: newExpiryStr,
                                status: 'membresia' as const
                            } : s));
                            console.log(`Auto-renewed membership for ${st.name}: ${renewedBonos} bonos, expires ${newExpiryStr}`);
                        } catch (err) {
                            console.error(`Auto-renewal failed for ${st.name}:`, err);
                        }
                    }
                })();
            }
            setTeachers((teachersRes.data || []) as Teacher[]);
            setSessions(normalizedSessions);
            setPieces(normalizedPieces);
            setGiftCards(normalizedGiftCards);
            setInventoryItems((inventoryRes.data || []) as InventoryItem[]);
            setInventoryMovements((movementsRes.data || []) as InventoryMovement[]);
        } catch (error) {
            console.error('Supabase load error', error);
        } finally {
            setIsLoadingData(false);
            hasLoadedOnceRef.current = true;
        }
    }, [session, sedeId, isSuperAdmin]);

    // ★ Safe reload wrapper: prevents CRUD operations from hanging forever
    // If loadAllData takes more than 10s, unblock the UI anyway
    // BUG 11 FIX: Added timeout logging and tracking
    const safeReload = useCallback(async () => {
        let didTimeout = false;
        try {
            await Promise.race([
                loadAllData(),
                new Promise((resolve) => {
                    setTimeout(() => {
                        didTimeout = true;
                        console.warn(`safeReload: timeout reached (${RELOAD_TIMEOUT_MS}ms), data may be stale. loadAllData continues in background.`);
                        resolve(undefined);
                    }, RELOAD_TIMEOUT_MS);
                })
            ]);
            if (!didTimeout) {
                console.log('safeReload: completed successfully');
            }
        } catch (err) {
            console.warn('safeReload: background refresh failed', err);
        }
    }, [loadAllData, RELOAD_TIMEOUT_MS]);

    useEffect(() => {
        if (session && (isSuperAdmin || sedeId)) {
            loadAllData();
        } else if (!session) {
            setStudents([]);
            setSessions([]);
            setPieces([]);
            setGiftCards([]);
            setInventoryItems([]);
            setInventoryMovements([]);
            setTeachers([]);
        }
    }, [session, sedeId, isSuperAdmin, loadAllData]);

    const buildAssignedKey = (cls: AssignedClass) => `${cls.date}|${cls.startTime}|${cls.endTime}`;

    const persistAssignedClasses = async (studentId: string, assignedClasses: AssignedClass[], studentSedeId?: string) => {
        await withTimeout('assigned_classes.delete', supabase.from('student_assigned_classes').delete().eq('student_id', studentId));
        if (!assignedClasses.length) return;
        const effectiveSedeId = studentSedeId || sedeId;
        const rows = assignedClasses.map(cls => ({
            student_id: studentId,
            ...(effectiveSedeId ? { sede_id: effectiveSedeId } : {}),
            date: cls.date,
            start_time: cls.startTime,
            end_time: cls.endTime,
            status: cls.status || 'pending'
        }));
        const { error } = await withTimeout('assigned_classes.insert', supabase.from('student_assigned_classes').insert(rows));
        if (error) console.error('Assigned classes insert error', error);
    };

    const removeAssignedClassesFromSessions = async (student: Student, removedClasses: AssignedClass[]) => {
        if (!removedClasses.length) return;
        for (const cls of removedClasses) {
            let sessionMatch = sessions.find(s =>
                s.date === cls.date && s.startTime === cls.startTime && s.endTime === cls.endTime
            );
            if (!sessionMatch) {
                try {
                    const { data, error } = await withTimeout(
                        'sessions.select_for_unlink',
                        supabase.from('sessions').select('id')
                            .eq('date', cls.date)
                            .eq('start_time', cls.startTime)
                            .eq('end_time', cls.endTime)
                            .limit(1)
                            .single()
                    );
                    if (error) continue;
                    sessionMatch = { id: data.id } as ClassSession;
                } catch (err) {
                    console.error('Session lookup timeout in removeAssigned', err);
                    continue;
                }
            }
            try {
                await withTimeout(
                    'session_students.delete_unassigned',
                    supabase.from('session_students').delete()
                        .eq('session_id', sessionMatch.id)
                        .eq('student_id', student.id)
                );
            } catch (err) {
                console.error('Session student delete timeout in removeAssigned', err);
            }
        }
    };

    const syncAssignedClassesToSessions = async (student: Student, assignedClasses: AssignedClass[]) => {
        if (!assignedClasses.length) return;
        const studentName = `${student.name} ${student.surname || ''}`.trim().toUpperCase();
        const inferredType = student.classType?.toLowerCase() === 'torno' ? 'torno' : 'mesa';

        for (const cls of assignedClasses) {
            let sessionMatch = sessions.find(s => s.date === cls.date && s.startTime === cls.startTime);
            if (!sessionMatch) {
                try {
                    const { data, error } = await withTimeout(
                        'sessions.insert_for_assigned',
                        supabase.from('sessions').insert({
                            date: cls.date,
                            start_time: cls.startTime,
                            end_time: cls.endTime,
                            class_type: inferredType
                        }).select().single()
                    );
                    if (error) {
                        console.error('Session insert error', error);
                        continue;
                    }
                    sessionMatch = {
                        id: data.id,
                        date: data.date,
                        startTime: extractTime(data.start_time),
                        endTime: extractTime(data.end_time),
                        classType: data.class_type,
                        students: []
                    } as ClassSession;
                } catch (err) {
                    console.error('Session insert timeout', err);
                    continue;
                }
            }

            const attendance = cls.status === 'present' || cls.status === 'absent' ? cls.status : 'pending';
            try {
                const { error } = await withTimeout(
                    'session_students.upsert_assigned',
                    supabase.from('session_students').upsert({
                        session_id: sessionMatch.id,
                        student_id: student.id,
                        student_name: studentName,
                        attendance
                    }, { onConflict: 'session_id,student_id' })
                );
                if (error) console.error('Session student upsert error', error);
            } catch (err) {
                console.error('Session student upsert timeout', err);
            }
        }
    };

    const syncSessionStudents = async (sessionId: string, studentNames: string[], attendance?: Record<string, 'present' | 'absent'>) => {
        const normalizedNames = [...new Set(studentNames.map(name => name.toUpperCase().trim()).filter(Boolean))];
        const { data: existing, error } = await withTimeout(
            'session_students.select',
            supabase
                .from('session_students')
                .select('student_id, student_name, sede_id')
                .eq('session_id', sessionId)
        );
        if (error) {
            throw new Error(`No se pudo leer session_students: ${error.message}`);
        }
        const existingRows = existing || [];
        const existingNames = new Set(existingRows.map(row => (row.student_name || '').toUpperCase()));
        const desiredNames = new Set(normalizedNames);

        if (normalizedNames.length === 0) {
            const { error: deleteAllError } = await withTimeout(
                'session_students.delete_all',
                supabase.from('session_students').delete().eq('session_id', sessionId)
            );
            if (deleteAllError) throw new Error(`No se pudo limpiar session_students: ${deleteAllError.message}`);
            return;
        }

        const toDelete = existingRows.filter(row => !desiredNames.has((row.student_name || '').toUpperCase()));
        if (toDelete.length) {
            const studentIdsToDelete = toDelete.map(row => row.student_id).filter(Boolean);
            if (studentIdsToDelete.length) {
                const { error: deleteError } = await withTimeout(
                    'session_students.delete_removed',
                    supabase
                        .from('session_students')
                        .delete()
                        .eq('session_id', sessionId)
                        .in('student_id', studentIdsToDelete)
                );
                if (deleteError) throw new Error(`No se pudieron eliminar vínculos antiguos: ${deleteError.message}`);
            }
        }

        const toInsert = normalizedNames.filter(name => !existingNames.has(name));
        const insertRows = toInsert
            .map(name => {
                const student = students.find(s => `${s.name} ${s.surname || ''}`.trim().toUpperCase() === name);
                if (!student) return null;
                const status = attendance?.[name] === 'present' || attendance?.[name] === 'absent' ? attendance?.[name] : 'pending';
                const isTemporary = student.studentCategory === 'temporal';
                return {
                    session_id: sessionId,
                    student_id: student.id,
                    student_name: name,
                    attendance: status,
                    sede_id: sedeId || undefined,
                    is_temporary: isTemporary,
                    temp_group_name: isTemporary ? (student.groupName || null) : null
                };
            })
            .filter(Boolean);

        if (insertRows.length) {
            const { error: insertError } = await withTimeout(
                'session_students.insert',
                supabase.from('session_students').insert(insertRows)
            );
            if (insertError) throw new Error(`No se pudieron vincular alumnos a la sesión: ${insertError.message}`);
        }

        if (attendance && existingRows.length) {
            const updates = existingRows.map(row => ({
                session_id: sessionId,
                student_id: row.student_id,
                student_name: row.student_name,
                attendance: attendance[(row.student_name || '').toUpperCase()] || attendance[row.student_name || ''] || 'pending',
                sede_id: row.sede_id || sedeId || undefined
            }));
            const { error: upsertError } = await withTimeout(
                'session_students.upsert_attendance',
                supabase.from('session_students').upsert(updates, { onConflict: 'session_id,student_id' })
            );
            if (upsertError) throw new Error(`No se pudo actualizar asistencia en session_students: ${upsertError.message}`);
        }
    };

    const updateSessionAttendance = async (sessionId: string, attendance: Record<string, 'present' | 'absent'>) => {
        const { data: existing, error } = await withTimeout(
            'session_students.select_for_attendance',
            supabase
                .from('session_students')
                .select('student_id, student_name, sede_id')
                .eq('session_id', sessionId)
        );
        if (error) {
            console.error('Load session students error', error);
            return;
        }
        const updates = (existing || []).map(row => ({
            session_id: sessionId,
            student_id: row.student_id,
            student_name: row.student_name,
            attendance: attendance[(row.student_name || '').toUpperCase()] || attendance[row.student_name || ''] || 'pending',
            sede_id: row.sede_id || sedeId || undefined
        }));
        if (updates.length) {
            const { error: upsertError } = await withTimeout(
                'session_students.upsert_attendance_only',
                supabase.from('session_students').upsert(updates, { onConflict: 'session_id,student_id' })
            );
            if (upsertError) console.error('Session attendance upsert error', upsertError);
        }
    };

    // Student CRUD
    const addStudent = async (newStudent: Omit<Student, 'id'>) => {
        let payload = buildStudentPayload(newStudent);
        if (sedeId) {
            payload = { ...payload, sede_id: sedeId };
        }
        try {
            const { data, error } = await withTimeout(
                'students.insert',
                supabase.from('students').insert(payload).select().single()
            );
            if (error) {
                console.error('addStudent error:', error);
                alert(`ERROR: No se pudo crear el alumno. ${error.message || ''}`);
                return;
            }
            const assignedClasses = newStudent.assignedClasses || [];
            if (assignedClasses.length) {
                await persistAssignedClasses(data.id, assignedClasses);
                await syncAssignedClassesToSessions({ ...newStudent, id: data.id } as Student, assignedClasses);
            }
            safeReload();
        } catch (err: any) {
            console.error('addStudent exception:', err);
            alert(`ERROR: No se pudo crear el alumno. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const updateStudent = async (id: string, updates: Partial<Student>) => {
        const payload = buildStudentPayload(updates);
        try {
            const { error } = await withTimeout(
                'students.update',
                supabase.from('students').update(payload).eq('id', id)
            );
            if (error) {
                console.error('updateStudent error:', error);
                alert(`ERROR: No se pudo actualizar el alumno. ${error.message || ''}`);
                return;
            }
            if (updates.assignedClasses) {
                const student = students.find(s => s.id === id);
                if (student) {
                    const prevAssigned = student.assignedClasses || [];
                    const prevSet = new Set(prevAssigned.map(buildAssignedKey));
                    const nextSet = new Set(updates.assignedClasses.map(buildAssignedKey));
                    const removed = prevAssigned.filter(cls => !nextSet.has(buildAssignedKey(cls)));

                    await persistAssignedClasses(id, updates.assignedClasses);
                    await removeAssignedClassesFromSessions({ ...student, ...updates } as Student, removed);
                    await syncAssignedClassesToSessions({ ...student, ...updates } as Student, updates.assignedClasses);
                }
            }
            safeReload();
        } catch (err: any) {
            console.error('updateStudent exception:', err);
            alert(`ERROR: No se pudo actualizar el alumno. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const deleteStudent = async (id: string) => {
        // Optimistic UI update — remove from UI immediately
        setStudents(prev => prev.filter(s => s.id !== id));

        try {
            // Step 1: Best-effort cleanup of dependent rows (silent — no alerts)
            // If these timeout, Supabase cascade deletes will clean up anyway
            await Promise.allSettled([
                supabase.from('session_students').delete().eq('student_id', id),
                supabase.from('student_assigned_classes').delete().eq('student_id', id),
                supabase.from('packages').delete().eq('student_id', id),
            ]);

            // Step 2: Delete the student itself — this is the only critical operation
            const { error } = await withTimeout(
                'students.delete',
                supabase.from('students').delete().eq('id', id)
            );

            if (error) {
                console.error('deleteStudent error:', error);
                alert(`ERROR: No se pudo eliminar el alumno. ${error.message || ''}`);
                safeReload(); // Re-fetch to restore if delete failed
                return;
            }

            console.log('deleteStudent: alumno eliminado correctamente');
        } catch (err: any) {
            console.error('deleteStudent exception:', err);
            // Only alert if the student delete itself fails
            alert(`ERROR: No se pudo eliminar el alumno. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
            safeReload(); // Re-fetch to restore if delete failed
        }
    };

    // BUG 10 FIX: Added explicit guard with user feedback when student not found
    // BUG 9 FIX: Also extend expiryDate when renewing
    const renewStudent = async (id: string, numClasses: number = 4) => {
        const student = students.find(s => s.id === id);
        if (!student) {
            alert('ERROR: Alumno no encontrado.');
            return;
        }
        const nextClasses = (student.classesRemaining ?? 0) + numClasses;

        // BUG 9 FIX: Extend expiry date by 1 month from today (or from current expiry if not expired)
        const today = new Date().toISOString().split('T')[0];
        const baseDate = student.expiryDate && student.expiryDate > today
            ? new Date(student.expiryDate)
            : new Date();
        baseDate.setMonth(baseDate.getMonth() + 1);
        const newExpiryDate = baseDate.toISOString().split('T')[0];

        await updateStudent(id, {
            classesRemaining: nextClasses,
            status: 'membresia',
            expiryDate: newExpiryDate
        });
    };

    // Session CRUD
    const addSession = async (newSession: Omit<ClassSession, 'id'>) => {
        let payload = buildSessionPayload(newSession);
        if (sedeId) {
            payload = { ...payload, sede_id: sedeId };
        }

        let data: any;
        try {
            const res = await withTimeout(
                'sessions.insert',
                supabase.from('sessions').insert(payload).select().single()
            );
            if (res.error) {
                console.error('addSession error:', res.error);
                alert(`ERROR: No se pudo crear la sesión. ${res.error.message || ''}`);
                return;
            }
            data = res.data;
        } catch (error: any) {
            console.error('addSession exception:', error);
            alert(`ERROR: No se pudo crear la sesión. ${error.message || 'Conexión lenta, intenta de nuevo.'}`);
            return;
        }

        if (newSession.students && newSession.students.length) {
            try {
                await syncSessionStudents(data.id, newSession.students, newSession.attendance || undefined);
            } catch (syncErr: any) {
                console.error('addSession syncSessionStudents error:', syncErr);
                alert(`ADVERTENCIA: La sesión se creó, pero no se pudieron vincular alumnos. ${syncErr?.message || ''}`);
            }
        }
        safeReload();
    };

    const updateSession = async (id: string, updates: Partial<ClassSession>) => {
        const payload = buildSessionPayload(updates);

        if (Object.keys(payload).length) {
            try {
                const { error } = await withTimeout(
                    'sessions.update',
                    supabase.from('sessions').update(payload).eq('id', id)
                );
                if (error) {
                    console.error('updateSession error:', error);
                    alert(`ERROR: No se pudo actualizar la sesión. ${error.message || ''}`);
                    return;
                }
            } catch (error: any) {
                console.error('updateSession exception:', error);
                alert(`ERROR: No se pudo actualizar la sesión. ${error.message || 'Conexión lenta, intenta de nuevo.'}`);
                return;
            }
        }

        if (updates.classType === 'feriado') {
            const { error: clearError } = await withTimeout(
                'session_students.clear_for_feriado',
                supabase.from('session_students').delete().eq('session_id', id)
            );
            if (clearError) console.error('session_students clear (feriado) error', clearError);
        }

        if (updates.students) {
            try {
                await syncSessionStudents(id, updates.students!, updates.attendance || undefined);
            } catch (syncErr: any) {
                console.error('updateSession syncSessionStudents error:', syncErr);
                alert(`ADVERTENCIA: La sesión se actualizó, pero falló la vinculación de alumnos. ${syncErr?.message || ''}`);
            }
        } else if (updates.attendance) {
            await updateSessionAttendance(id, updates.attendance);
        }

        safeReload();
    };

    const deleteSession = async (id: string) => {
        // Optimistic UI update
        setSessions(prev => prev.filter(s => s.id !== id));

        try {
            // Best-effort cleanup — silent, no alerts
            await Promise.allSettled([
                supabase.from('session_students').delete().eq('session_id', id),
            ]);

            const { error } = await withTimeout(
                'sessions.delete',
                supabase.from('sessions').delete().eq('id', id)
            );
            if (error) {
                console.error('deleteSession error:', error);
                alert(`ERROR: No se pudo eliminar la sesión. ${error.message || ''}`);
                safeReload();
                return;
            }
            console.log('deleteSession: sesión eliminada correctamente');
        } catch (err: any) {
            console.error('deleteSession exception:', err);
            alert(`ERROR: ${err.message || 'Error inesperado al eliminar sesión.'}`);
            safeReload();
        }
    };

    // Teacher CRUD
    // BOMBA 7 FIX: Send null for optional fields to be explicit with Supabase
    const addTeacher = async (newTeacher: Omit<Teacher, 'id'>) => {
        const payload: any = {
            name: newTeacher.name,
            surname: newTeacher.surname || null,
            specialty: newTeacher.specialty || null,
            email: newTeacher.email || null,
            phone: newTeacher.phone || null,
            notes: newTeacher.notes || null
        };
        if (sedeId) {
            payload.sede_id = sedeId;
        }
        try {
            const { error } = await withTimeout('teachers.insert', supabase.from('teachers').insert(payload));
            if (error) {
                console.error('addTeacher error:', error);
                alert(`ERROR: No se pudo crear el profesor. ${error.message || ''}`);
                return;
            }
            safeReload();
        } catch (err: any) {
            console.error('addTeacher exception:', err);
            alert(`ERROR: No se pudo crear el profesor. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
        const payload: Record<string, any> = {
            name: updates.name,
            surname: updates.surname || null,
            specialty: updates.specialty || null,
            email: updates.email || null,
            phone: updates.phone || null,
            notes: updates.notes || null
        };
        if (!payload.name) {
            console.error('updateTeacher: name is required');
            return;
        }
        try {
            const { error } = await withTimeout('teachers.update', supabase.from('teachers').update(payload).eq('id', id));
            if (error) {
                console.error('updateTeacher error:', error);
                alert(`ERROR: No se pudo actualizar el profesor. ${error.message || ''}`);
                return;
            }
            setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            safeReload();
        } catch (err: any) {
            console.error('updateTeacher exception:', err);
            alert(`ERROR: No se pudo actualizar el profesor. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const deleteTeacher = async (id: string) => {
        // Optimistic UI update
        setTeachers(prev => prev.filter(t => t.id !== id));

        try {
            // Best-effort unlink from sessions — silent
            await Promise.allSettled([
                supabase.from('sessions').update({ teacher_id: null }).eq('teacher_id', id),
                supabase.from('sessions').update({ teacher_substitute_id: null }).eq('teacher_substitute_id', id),
            ]);

            const { error } = await withTimeout('teachers.delete', supabase.from('teachers').delete().eq('id', id));
            if (error) {
                console.error('deleteTeacher error:', error);
                alert(`ERROR: No se pudo eliminar el profesor. ${error.message || ''}`);
                safeReload();
                return;
            }
            console.log('deleteTeacher: profesor eliminado correctamente');
        } catch (err: any) {
            console.error('deleteTeacher exception:', err);
            alert(`ERROR: ${err.message || 'Error inesperado al eliminar profesor.'}`);
            safeReload();
        }
    };

    // BUG 9 FIX: Helper to normalize strings for robust matching (removes accents, extra spaces)
    const normalizeForMatch = (str: string): string => {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .trim()
            .toUpperCase();
    };

    const mapStudentRowToModel = (row: any): Student => ({
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

    const resolveGiftCardRecipientStudentId = (recipient?: string): string | null => {
        if (!recipient) return null;
        const normalizedRecipient = normalizeForMatch(recipient);
        if (!normalizedRecipient) return null;

        const exactFullNameMatches = students.filter(s => {
            const fullName = normalizeForMatch(`${s.name} ${s.surname || ''}`);
            return fullName === normalizedRecipient;
        });
        if (exactFullNameMatches.length === 1) return exactFullNameMatches[0].id;

        const exactNameMatches = students.filter(s => normalizeForMatch(s.name) === normalizedRecipient);
        if (exactNameMatches.length === 1) return exactNameMatches[0].id;

        return null;
    };

    const createTemporaryStudentFromGiftCard = async (params: {
        recipient: string;
        numClasses?: number;
        type?: GiftCard['type'];
        expiryDate?: string;
    }): Promise<string | null> => {
        if (!sedeId) {
            console.warn('createTemporaryStudentFromGiftCard skipped: sedeId is not available');
            return null;
        }

        const recipient = (params.recipient || '').replace(/\s+/g, ' ').trim();
        if (!recipient) return null;

        const firstName = recipient.split(' ')[0] || recipient;
        const surnameRaw = recipient.slice(firstName.length).trim();
        const studentPayload: Record<string, any> = {
            sede_id: sedeId,
            full_name: recipient,
            name: firstName,
            surname: surnameRaw || null,
            phone: '',
            classes_remaining: Number.isFinite(params.numClasses as number) ? Math.max(0, params.numClasses as number) : 0,
            status: 'new',
            student_category: 'temporal',
            class_type: params.type === 'torno' ? 'Torno' : 'Modelado',
            expiry_date: params.expiryDate ? `${params.expiryDate}T00:00:00Z` : null,
            notes: 'Creado automaticamente desde bono regalo'
        };

        try {
            const { data, error } = await withTimeout(
                'students.insert_from_gift_card',
                supabase.from('students').insert(studentPayload).select('*').single(),
                5000
            );

            if (error) {
                console.error('createTemporaryStudentFromGiftCard error:', error);
                return null;
            }

            if (data) {
                const mappedStudent = mapStudentRowToModel(data);
                setStudents(prev => (prev.some(s => s.id === mappedStudent.id) ? prev : [mappedStudent, ...prev]));
                return data.id;
            }
        } catch (error) {
            console.error('createTemporaryStudentFromGiftCard exception:', error);
            return null;
        }

        return null;
    };

    const ensureGiftCardRecipientStudentId = async (params: {
        recipient?: string;
        recipientStudentId?: string;
        numClasses?: number;
        type?: GiftCard['type'];
        expiryDate?: string;
    }): Promise<string | null> => {
        if (params.recipientStudentId) return params.recipientStudentId;

        const resolvedExisting = resolveGiftCardRecipientStudentId(params.recipient);
        if (resolvedExisting) return resolvedExisting;

        if (!params.recipient) return null;

        return createTemporaryStudentFromGiftCard({
            recipient: params.recipient,
            numClasses: params.numClasses,
            type: params.type,
            expiryDate: params.expiryDate
        });
    };

    // Piece CRUD
    const addPiece = async (newPiece: Omit<CeramicPiece, 'id'>) => {
        // BUG 9 FIX: Normalize both strings for robust matching
        const ownerNormalized = normalizeForMatch(newPiece.owner);
        const student = students.find(s => {
            const fullName = normalizeForMatch(`${s.name} ${s.surname || ''}`);
            return fullName === ownerNormalized;
        });
        const payload: any = {
            student_id: student?.id || null,
            owner_name: newPiece.owner,
            description: newPiece.description,
            status: newPiece.status,
            glaze_type: newPiece.glazeType,
            delivery_date: newPiece.deliveryDate || null,
            notes: newPiece.notes,
            extra_commentary: newPiece.extraCommentary
        };
        if (sedeId) {
            payload.sede_id = sedeId;
        }
        try {
            const { error } = await withTimeout('pieces.insert', supabase.from('pieces').insert(payload));
            if (error) {
                console.error('addPiece error:', error);
                alert(`ERROR: No se pudo crear la pieza. ${error.message || ''}`.trim());
                return;
            }
            safeReload();
        } catch (err: any) {
            console.error('addPiece exception:', err);
            alert(`ERROR: No se pudo crear la pieza. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const updatePiece = async (id: string, updates: Partial<CeramicPiece>) => {
        // CRITICAL FIX: always include all fields with null for cleared optional fields
        const payload: Record<string, any> = {
            owner_name: updates.owner,
            description: updates.description,
            status: updates.status,
            glaze_type: updates.glazeType || null,
            delivery_date: updates.deliveryDate || null,
            notes: updates.notes || null,
            extra_commentary: updates.extraCommentary || null
        };
        // Only include defined fields (avoid overwriting with undefined on partial calls)
        Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
        try {
            const { error } = await withTimeout('pieces.update', supabase.from('pieces').update(payload).eq('id', id));
            if (error) {
                console.error('updatePiece error:', error);
                alert(`ERROR: No se pudo actualizar la pieza. ${error.message || ''}`);
                return;
            }
            setPieces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
            safeReload();
        } catch (err: any) {
            console.error('updatePiece exception:', err);
            alert(`ERROR: No se pudo actualizar la pieza. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const deletePiece = async (id: string) => {
        // Optimistic UI update
        setPieces(prev => prev.filter(p => p.id !== id));

        try {
            const { error } = await withTimeout('pieces.delete', supabase.from('pieces').delete().eq('id', id));
            if (error) {
                console.error('deletePiece error:', error);
                alert(`ERROR: No se pudo eliminar la pieza. ${error.message || ''}`);
                safeReload();
                return;
            }
            console.log('deletePiece: pieza eliminada correctamente');
        } catch (err: any) {
            console.error('deletePiece exception:', err);
            alert(`ERROR: No se pudo eliminar la pieza. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
            safeReload();
        }
    };

    // GiftCard CRUD
    const addGiftCard = async (newCard: Omit<GiftCard, 'id' | 'createdAt'>) => {
        const resolvedRecipientStudentId = await ensureGiftCardRecipientStudentId({
            recipient: newCard.recipient,
            recipientStudentId: newCard.recipientStudentId,
            numClasses: newCard.numClasses,
            type: newCard.type,
            expiryDate: newCard.expiryDate
        });
        const payload: any = {
            buyer: newCard.buyer,
            recipient: newCard.recipient,
            recipient_student_id: resolvedRecipientStudentId,
            num_classes: newCard.numClasses,
            type: newCard.type,
            scheduled_date: newCard.scheduledDate || null,
            extra_commentary: newCard.extraCommentary || null
        };
        if (newCard.expiryDate) payload.expiry_date = newCard.expiryDate;
        if (sedeId) {
            payload.sede_id = sedeId;
        }
        try {
            const { data, error } = await withTimeout(
                'gift_cards.insert',
                supabase.from('gift_cards').insert(payload).select().single()
            );
            if (error) {
                console.error('addGiftCard error:', error);
                alert(`ERROR: No se pudo crear la tarjeta regalo. ${error.message || ''}`);
                return;
            }
            if (data) {
                const mapped: GiftCard = {
                    id: data.id,
                    buyer: data.buyer,
                    recipient: data.recipient,
                    recipientStudentId: data.recipient_student_id || undefined,
                    numClasses: data.num_classes,
                    type: data.type,
                    scheduledDate: data.scheduled_date || undefined,
                    expiryDate: data.expiry_date || undefined,
                    createdAt: data.created_at,
                    extraCommentary: data.extra_commentary || undefined
                };
                setGiftCards(prev => [mapped, ...prev]);
            }
            safeReload();
        } catch (err: any) {
            console.error('addGiftCard exception:', err);
            alert(`ERROR: No se pudo crear la tarjeta regalo. ${err?.message || ''}`);
        }
    };

    const updateGiftCard = async (id: string, updates: Partial<GiftCard>) => {
        // Build patch payload explicitly to avoid sending nulls for untouched fields.
        const previousCard = giftCards.find(gc => gc.id === id);
        const payload: Record<string, any> = {};
        if (updates.buyer !== undefined) payload.buyer = updates.buyer;
        if (updates.recipient !== undefined) payload.recipient = updates.recipient;
        let resolvedRecipientStudentId: string | null | undefined = undefined;
        if (updates.recipientStudentId !== undefined || updates.recipient !== undefined) {
            resolvedRecipientStudentId = await ensureGiftCardRecipientStudentId({
                recipient: updates.recipient ?? previousCard?.recipient,
                recipientStudentId: updates.recipientStudentId,
                numClasses: updates.numClasses ?? previousCard?.numClasses,
                type: updates.type ?? previousCard?.type,
                expiryDate: updates.expiryDate ?? previousCard?.expiryDate
            });
            payload.recipient_student_id = resolvedRecipientStudentId;
        }
        if (updates.numClasses !== undefined) payload.num_classes = updates.numClasses;
        if (updates.type !== undefined) payload.type = updates.type;
        if (updates.scheduledDate !== undefined) payload.scheduled_date = updates.scheduledDate || null;
        if (updates.expiryDate !== undefined) payload.expiry_date = updates.expiryDate || null;
        if (updates.extraCommentary !== undefined) payload.extra_commentary = updates.extraCommentary || null;
        if (!Object.keys(payload).length) return;

        const optimisticUpdates: Partial<GiftCard> = { ...updates };
        if (resolvedRecipientStudentId !== undefined) {
            optimisticUpdates.recipientStudentId = resolvedRecipientStudentId || undefined;
        }
        setGiftCards(prev => prev.map(gc => gc.id === id ? { ...gc, ...optimisticUpdates } : gc));

        const revertOptimisticUpdate = () => {
            if (!previousCard) return;
            setGiftCards(prev => prev.map(gc => gc.id === id ? previousCard : gc));
        };

        try {
            const { error } = await withTimeout(
                'gift_cards.update',
                supabase.from('gift_cards').update(payload).eq('id', id),
                5000
            );
            if (error) {
                throw error;
            }
            safeReload(); // Background refresh without await
        } catch (err: any) {
            const isTimeout = typeof err?.message === 'string' && err.message.includes('Timeout en gift_cards.update');
            if (isTimeout) {
                console.warn('updateGiftCard timeout: retrying in background', err);
                void (async () => {
                    try {
                        const { error } = await supabase.from('gift_cards').update(payload).eq('id', id);
                        if (error) {
                            console.error('updateGiftCard background retry error:', error);
                            revertOptimisticUpdate();
                            alert(`ERROR: No se pudo actualizar la tarjeta regalo. ${error.message || ''}`);
                            return;
                        }
                        safeReload();
                    } catch (retryErr: any) {
                        console.error('updateGiftCard background retry exception:', retryErr);
                        revertOptimisticUpdate();
                        alert(`ERROR: No se pudo actualizar la tarjeta regalo. ${retryErr?.message || ''}`);
                    }
                })();
                return;
            }

            revertOptimisticUpdate();
            console.error('updateGiftCard exception:', err);
            alert(`ERROR: No se pudo actualizar la tarjeta regalo. ${err?.message || ''}`);
        }
    };

    const deleteGiftCard = async (id: string) => {
        // Optimistic UI update
        setGiftCards(prev => prev.filter(gc => gc.id !== id));

        try {
            const { error } = await withTimeout(
                'gift_cards.delete',
                supabase.from('gift_cards').delete().eq('id', id)
            );
            if (error) {
                console.error('deleteGiftCard error:', error);
                alert(`ERROR: No se pudo eliminar la tarjeta regalo. ${error.message || ''}`);
                safeReload();
                return;
            }
            console.log('deleteGiftCard: tarjeta eliminada correctamente');
        } catch (err: any) {
            console.error('deleteGiftCard exception:', err);
            alert(`ERROR: No se pudo eliminar la tarjeta regalo. ${err?.message || ''}`);
            safeReload();
        }
    };

    // Inventory CRUD
    // DB columns: id, sede_id, name, category, code, current_quantity, unit, min_quantity,
    //             status, location, created_at, updated_at, supplier_code, temperature,
    //             color, color_family, finish, recipe (jsonb), notes
    // NOTE: there is NO 'supplier' column — only 'supplier_code'
    const addInventoryItem = async (newItem: InventoryItem) => {
        const payload: any = removeUndefined({
            name: newItem.name,
            category: newItem.category,
            code: newItem.code,
            current_quantity: newItem.current_quantity ?? 0,
            unit: newItem.unit,
            min_quantity: newItem.min_quantity ?? 0,
            status: newItem.status || 'active',
            location: newItem.location,
            supplier_code: newItem.supplier_code,
            // firing_range (glazes) and cone_or_temp (clays) both map to 'temperature' column in DB
            temperature: newItem.firing_range || newItem.cone_or_temp || (newItem as any).temperature || undefined,
            color: newItem.color,
            color_family: newItem.color_family,
            finish: newItem.finish,
            // formula in frontend maps to recipe (jsonb) in DB
            recipe: newItem.formula || (newItem as any).recipe || undefined,
            notes: newItem.notes
        });
        if (sedeId) payload.sede_id = sedeId;
        try {
            const { error } = await withTimeout('inventory_items.insert', supabase.from('inventory_items').insert(payload));
            if (error) {
                console.error('addInventoryItem error:', error);
                alert(`ERROR: No se pudo crear el item. ${error.message || ''}`);
                return;
            }
            safeReload();
        } catch (err: any) {
            console.error('addInventoryItem exception:', err);
            alert(`ERROR: No se pudo crear el item. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    // BOMBA 1 FIX: Do NOT use removeUndefined for updates.
    // Send null for optional fields that were cleared by the user.
    const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
        const payload: Record<string, any> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.category !== undefined) payload.category = updates.category;
        if (updates.code !== undefined) payload.code = updates.code;
        if (updates.current_quantity !== undefined) payload.current_quantity = updates.current_quantity;
        if (updates.unit !== undefined) payload.unit = updates.unit;
        if (updates.min_quantity !== undefined) payload.min_quantity = updates.min_quantity;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.location !== undefined) payload.location = updates.location || null;
        if (updates.supplier_code !== undefined) payload.supplier_code = updates.supplier_code || null;
        // firing_range (glazes) and cone_or_temp (clays) both map to 'temperature' column in DB
        const tempValue = updates.firing_range || updates.cone_or_temp || (updates as any).temperature;
        if (tempValue !== undefined) payload.temperature = tempValue || null;
        if (updates.color !== undefined) payload.color = updates.color || null;
        if (updates.color_family !== undefined) payload.color_family = updates.color_family || null;
        if (updates.finish !== undefined) payload.finish = updates.finish || null;
        // formula in frontend maps to recipe (jsonb) in DB
        const recipeValue = updates.formula || (updates as any).recipe;
        if (recipeValue !== undefined) payload.recipe = recipeValue || null;
        if (updates.notes !== undefined) payload.notes = updates.notes || null;

        try {
            const { error } = await withTimeout('inventory_items.update', supabase.from('inventory_items').update(payload).eq('id', id));
            if (error) {
                console.error('updateInventoryItem error:', error);
                alert(`ERROR: No se pudo actualizar el item. ${error.message || ''}`);
                return;
            }
            setInventoryItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
            safeReload();
        } catch (err: any) {
            console.error('updateInventoryItem exception:', err);
            alert(`ERROR: No se pudo actualizar el item. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const archiveInventoryItem = async (id: string) => {
        await updateInventoryItem(id, { status: 'archived' });
    };

    const deleteInventoryItem = async (id: string) => {
        // Optimistic UI update
        setInventoryItems(prev => prev.filter(i => i.id !== id));

        try {
            // Best-effort cleanup of movements — silent
            await Promise.allSettled([
                supabase.from('inventory_movements').delete().or(`item_id.eq.${id},inventory_item_id.eq.${id}`),
            ]);

            const { error } = await withTimeout('inventory_items.delete', supabase.from('inventory_items').delete().eq('id', id));
            if (error) {
                console.error('deleteInventoryItem error:', error);
                alert(`ERROR: No se pudo eliminar el item. ${error.message || ''}`);
                safeReload();
                return;
            }
            console.log('deleteInventoryItem: item eliminado correctamente');
        } catch (err: any) {
            console.error('deleteInventoryItem exception:', err);
            alert(`ERROR: No se pudo eliminar el item. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
            safeReload();
        }
    };

    const addInventoryMovement = async (newMov: Omit<InventoryMovement, 'id'>) => {
        const payload: any = {
            inventory_item_id: newMov.item_id,
            item_id: newMov.item_id,
            type: newMov.type,
            quantity: newMov.quantity ?? 0,
            new_quantity: newMov.new_quantity ?? null,
            unit: newMov.unit,
            reason: newMov.reason,
            date: newMov.date || new Date().toISOString().split('T')[0],
            notes: newMov.notes || null
        };
        if (sedeId) payload.sede_id = sedeId;
        try {
            const { error } = await withTimeout('inventory_movements.insert', supabase.from('inventory_movements').insert(payload));
            if (error) {
                console.error('addInventoryMovement error:', error);
                alert(`ERROR: No se pudo registrar el movimiento. ${error.message || ''}`);
                return;
            }
            safeReload();
        } catch (err: any) {
            console.error('addInventoryMovement exception:', err);
            alert(`ERROR: No se pudo registrar el movimiento. ${err?.message || 'Conexión lenta, intenta de nuevo.'}`);
        }
    };

    const value: DataContextType = {
        students,
        sessions,
        pieces,
        giftCards,
        inventoryItems,
        inventoryMovements,
        teachers,
        isLoadingData,
        addStudent,
        updateStudent,
        deleteStudent,
        renewStudent,
        addSession,
        updateSession,
        deleteSession,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addPiece,
        updatePiece,
        deletePiece,
        addGiftCard,
        updateGiftCard,
        deleteGiftCard,
        addInventoryItem,
        updateInventoryItem,
        archiveInventoryItem,
        deleteInventoryItem,
        addInventoryMovement,
        loadAllData
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export default DataContext;
