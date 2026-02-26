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
    const [isLoadingData, setIsLoadingData] = useState(false);

    const removeUndefined = (obj: Record<string, unknown>) => {
        return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
    };

    const buildStudentPayload = (student: Partial<Student>) => {
        return removeUndefined({
            name: student.name,
            surname: student.surname,
            email: student.email,
            phone: student.phone,
            phone_country: student.phoneCountry,
            birth_day: student.birthDay ? Number(student.birthDay) : undefined,
            birth_month: student.birthMonth ? Number(student.birthMonth) : undefined,
            birth_year: student.birthYear ? Number(student.birthYear) : undefined,
            classes_remaining: student.classesRemaining,
            status: student.status,
            payment_method: student.paymentMethod,
            notes: student.notes,
            observations: student.observations,
            price: student.price,
            class_type: student.classType,
            expiry_date: student.expiryDate
        });
    };

    const buildSessionPayload = (data: Partial<ClassSession>) => {
        return removeUndefined({
            date: data.date,
            start_time: data.startTime,
            end_time: data.endTime,
            class_type: data.classType,
            teacher_id: data.teacherId,
            teacher_substitute_id: data.teacherSubstituteId,
            completed_at: data.completedAt,
            workshop_name: data.workshopName,
            private_reason: data.privateReason
        });
    };

    const loadAllData = useCallback(async () => {
        if (!session) return;

        setIsLoadingData(true);
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
                    startTime: row.start_time,
                    endTime: row.end_time,
                    status: row.status || 'pending'
                });
            });

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
                classesRemaining: row.classes_remaining || 0,
                status: row.status,
                paymentMethod: row.payment_method || undefined,
                notes: row.notes || undefined,
                observations: row.observations || undefined,
                price: row.price || undefined,
                assignedClasses: assignedMap[row.id] || [],
                classType: row.class_type || undefined,
                expiryDate: row.expiry_date || undefined
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
                    startTime: row.start_time,
                    endTime: row.end_time,
                    classType: row.class_type,
                    students: linked.map((item: any) => item.student_name),
                    attendance: Object.keys(attendance).length ? attendance : undefined,
                    teacherId: row.teacher_id || undefined,
                    teacherSubstituteId: row.teacher_substitute_id || undefined,
                    completedAt: row.completed_at || undefined,
                    workshopName: row.workshop_name || undefined,
                    privateReason: row.private_reason || undefined
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
                extraCommentary: row.extra_commentary || undefined
            }));

            const normalizedGiftCards: GiftCard[] = (giftRes.data || []).map((row: any) => ({
                id: row.id,
                buyer: row.buyer,
                recipient: row.recipient,
                numClasses: row.num_classes,
                type: row.type,
                scheduledDate: row.scheduled_date || undefined,
                createdAt: row.created_at,
                extraCommentary: row.extra_commentary || undefined
            }));

            setStudents(normalizedStudents);
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
        }
    }, [session, sedeId, isSuperAdmin]);

    useEffect(() => {
        if (session) {
            loadAllData();
        } else {
            setStudents([]);
            setSessions([]);
            setPieces([]);
            setGiftCards([]);
            setInventoryItems([]);
            setInventoryMovements([]);
            setTeachers([]);
        }
    }, [session, loadAllData]);

    const buildAssignedKey = (cls: AssignedClass) => `${cls.date}|${cls.startTime}|${cls.endTime}`;

    const persistAssignedClasses = async (studentId: string, assignedClasses: AssignedClass[]) => {
        await supabase.from('student_assigned_classes').delete().eq('student_id', studentId);
        if (!assignedClasses.length) return;
        const rows = assignedClasses.map(cls => ({
            student_id: studentId,
            date: cls.date,
            start_time: cls.startTime,
            end_time: cls.endTime,
            status: cls.status || 'pending'
        }));
        const { error } = await supabase.from('student_assigned_classes').insert(rows);
        if (error) console.error('Assigned classes insert error', error);
    };

    const removeAssignedClassesFromSessions = async (student: Student, removedClasses: AssignedClass[]) => {
        if (!removedClasses.length) return;
        for (const cls of removedClasses) {
            let sessionMatch = sessions.find(s =>
                s.date === cls.date && s.startTime === cls.startTime && s.endTime === cls.endTime
            );
            if (!sessionMatch) {
                const { data, error } = await supabase
                    .from('sessions')
                    .select('id')
                    .eq('date', cls.date)
                    .eq('start_time', cls.startTime)
                    .eq('end_time', cls.endTime)
                    .limit(1)
                    .single();
                if (error) {
                    continue;
                }
                sessionMatch = { id: data.id } as ClassSession;
            }
            await supabase
                .from('session_students')
                .delete()
                .eq('session_id', sessionMatch.id)
                .eq('student_id', student.id);
        }
    };

    const syncAssignedClassesToSessions = async (student: Student, assignedClasses: AssignedClass[]) => {
        if (!assignedClasses.length) return;
        const studentName = `${student.name} ${student.surname || ''}`.trim().toUpperCase();
        const inferredType = student.classType?.toLowerCase() === 'torno' ? 'torno' : 'mesa';

        for (const cls of assignedClasses) {
            let sessionMatch = sessions.find(s => s.date === cls.date && s.startTime === cls.startTime);
            if (!sessionMatch) {
                const { data, error } = await supabase
                    .from('sessions')
                    .insert({
                        date: cls.date,
                        start_time: cls.startTime,
                        end_time: cls.endTime,
                        class_type: inferredType
                    })
                    .select()
                    .single();
                if (error) {
                    console.error('Session insert error', error);
                    continue;
                }
                sessionMatch = {
                    id: data.id,
                    date: data.date,
                    startTime: data.start_time,
                    endTime: data.end_time,
                    classType: data.class_type,
                    students: []
                } as ClassSession;
            }

            const attendance = cls.status === 'present' || cls.status === 'absent' ? cls.status : 'pending';
            const { error } = await supabase
                .from('session_students')
                .upsert({
                    session_id: sessionMatch.id,
                    student_id: student.id,
                    student_name: studentName,
                    attendance
                }, { onConflict: 'session_id,student_id' });
            if (error) console.error('Session student upsert error', error);
        }
    };

    const syncSessionStudents = async (sessionId: string, studentNames: string[], attendance?: Record<string, 'present' | 'absent'>) => {
        const normalizedNames = studentNames.map(name => name.toUpperCase());
        const { data: existing, error } = await supabase
            .from('session_students')
            .select('student_id, student_name')
            .eq('session_id', sessionId);
        if (error) {
            console.error('Load session students error', error);
            return;
        }
        const existingRows = existing || [];
        const existingNames = new Set(existingRows.map(row => row.student_name.toUpperCase()));
        const desiredNames = new Set(normalizedNames);

        if (normalizedNames.length === 0) {
            await supabase.from('session_students').delete().eq('session_id', sessionId);
            return;
        }

        const toDelete = existingRows.filter(row => !desiredNames.has(row.student_name.toUpperCase()));
        if (toDelete.length) {
            await supabase
                .from('session_students')
                .delete()
                .eq('session_id', sessionId)
                .in('student_id', toDelete.map(row => row.student_id));
        }

        const toInsert = normalizedNames.filter(name => !existingNames.has(name));
        const insertRows = toInsert
            .map(name => {
                const student = students.find(s => `${s.name} ${s.surname || ''}`.trim().toUpperCase() === name);
                if (!student) return null;
                const status = attendance?.[name] === 'present' || attendance?.[name] === 'absent' ? attendance?.[name] : 'pending';
                return {
                    session_id: sessionId,
                    student_id: student.id,
                    student_name: name,
                    attendance: status
                };
            })
            .filter(Boolean);

        if (insertRows.length) {
            await supabase.from('session_students').insert(insertRows);
        }

        if (attendance && existingRows.length) {
            const updates = existingRows.map(row => ({
                session_id: sessionId,
                student_id: row.student_id,
                student_name: row.student_name,
                attendance: attendance[row.student_name] || 'pending'
            }));
            await supabase.from('session_students').upsert(updates, { onConflict: 'session_id,student_id' });
        }
    };

    const updateSessionAttendance = async (sessionId: string, attendance: Record<string, 'present' | 'absent'>) => {
        const { data: existing, error } = await supabase
            .from('session_students')
            .select('student_id, student_name')
            .eq('session_id', sessionId);
        if (error) {
            console.error('Load session students error', error);
            return;
        }
        const updates = (existing || []).map(row => ({
            session_id: sessionId,
            student_id: row.student_id,
            student_name: row.student_name,
            attendance: attendance[row.student_name] || 'pending'
        }));
        if (updates.length) {
            await supabase.from('session_students').upsert(updates, { onConflict: 'session_id,student_id' });
        }
    };

    // Student CRUD
    const addStudent = async (newStudent: Omit<Student, 'id'>) => {
        let payload = buildStudentPayload(newStudent);
        if (sedeId) {
            payload = { ...payload, sede_id: sedeId };
        }
        const { data, error } = await supabase.from('students').insert(payload).select().single();
        if (error) {
            alert('ERROR: No se pudo crear el alumno.');
            return;
        }
        const assignedClasses = newStudent.assignedClasses || [];
        if (assignedClasses.length) {
            await persistAssignedClasses(data.id, assignedClasses);
            await syncAssignedClassesToSessions({ ...newStudent, id: data.id } as Student, assignedClasses);
        }
        await loadAllData();
    };

    const updateStudent = async (id: string, updates: Partial<Student>) => {
        const payload = buildStudentPayload(updates);
        const { error } = await supabase.from('students').update(payload).eq('id', id);
        if (error) {
            alert('ERROR: No se pudo actualizar el alumno.');
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
        await loadAllData();
    };

    const deleteStudent = async (id: string) => {
        await supabase.from('students').delete().eq('id', id);
        await loadAllData();
    };

    const renewStudent = async (id: string, numClasses: number = 4) => {
        const student = students.find(s => s.id === id);
        if (!student) return;
        const nextClasses = (student.classesRemaining || 0) + numClasses;
        await updateStudent(id, { classesRemaining: nextClasses, status: 'regular' });
    };

    // Session CRUD
    const addSession = async (newSession: Omit<ClassSession, 'id'>) => {
        let payload = buildSessionPayload(newSession);
        if (sedeId) {
            payload = { ...payload, sede_id: sedeId };
        }
        const { data, error } = await supabase.from('sessions').insert(payload).select().single();
        if (error) {
            alert('ERROR: No se pudo crear la sesión.');
            return;
        }
        if (newSession.students && newSession.students.length) {
            await syncSessionStudents(data.id, newSession.students, newSession.attendance || undefined);
        }
        await loadAllData();
    };

    const updateSession = async (id: string, updates: Partial<ClassSession>) => {
        const payload = buildSessionPayload(updates);
        if (Object.keys(payload).length) {
            const { error } = await supabase.from('sessions').update(payload).eq('id', id);
            if (error) {
                alert('ERROR: No se pudo actualizar la sesión.');
                return;
            }
        }

        if (updates.classType === 'feriado') {
            await supabase.from('session_students').delete().eq('session_id', id);
        }

        if (updates.students) {
            await syncSessionStudents(id, updates.students, updates.attendance || undefined);
        } else if (updates.attendance) {
            await updateSessionAttendance(id, updates.attendance);
        }

        await loadAllData();
    };

    const deleteSession = async (id: string) => {
        await supabase.from('sessions').delete().eq('id', id);
        await loadAllData();
    };

    // Teacher CRUD
    const addTeacher = async (newTeacher: Omit<Teacher, 'id'>) => {
        const payload: any = {
            name: newTeacher.name,
            surname: newTeacher.surname,
            specialty: newTeacher.specialty,
            email: newTeacher.email,
            phone: newTeacher.phone,
            notes: newTeacher.notes
        };
        if (sedeId) {
            payload.sede_id = sedeId;
        }
        const { error } = await supabase.from('teachers').insert(payload);
        if (error) {
            alert('ERROR: No se pudo crear el profesor.');
            return;
        }
        await loadAllData();
    };

    const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
        const payload = removeUndefined({
            name: updates.name,
            surname: updates.surname,
            specialty: updates.specialty,
            email: updates.email,
            phone: updates.phone,
            notes: updates.notes
        });
        const { error } = await supabase.from('teachers').update(payload).eq('id', id);
        if (error) {
            alert('ERROR: No se pudo actualizar el profesor.');
            return;
        }
        await loadAllData();
    };

    const deleteTeacher = async (id: string) => {
        await supabase.from('teachers').delete().eq('id', id);
        await loadAllData();
    };

    // Piece CRUD
    const addPiece = async (newPiece: Omit<CeramicPiece, 'id'>) => {
        const ownerUpper = newPiece.owner.toUpperCase();
        const student = students.find(s => `${s.name} ${s.surname || ''}`.trim().toUpperCase() === ownerUpper);
        const payload: any = {
            owner_student_id: student?.id || null,
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
        const { error } = await supabase.from('pieces').insert(payload);
        if (error) {
            console.error('addPiece error:', error);
            alert(`ERROR: No se pudo crear la pieza. ${error.message || ''}`.trim());
            return;
        }
        await loadAllData();
    };

    const updatePiece = async (id: string, updates: Partial<CeramicPiece>) => {
        const payload = removeUndefined({
            owner_name: updates.owner,
            description: updates.description,
            status: updates.status,
            glaze_type: updates.glazeType,
            delivery_date: updates.deliveryDate || null,
            notes: updates.notes,
            extra_commentary: updates.extraCommentary
        });
        const { error } = await supabase.from('pieces').update(payload).eq('id', id);
        if (error) {
            alert('ERROR: No se pudo actualizar la pieza.');
            return;
        }
        await loadAllData();
    };

    const deletePiece = async (id: string) => {
        await supabase.from('pieces').delete().eq('id', id);
        await loadAllData();
    };

    // GiftCard CRUD
    const addGiftCard = async (newCard: Omit<GiftCard, 'id' | 'createdAt'>) => {
        const payload: any = {
            buyer: newCard.buyer,
            recipient: newCard.recipient,
            num_classes: newCard.numClasses,
            type: newCard.type,
            scheduled_date: newCard.scheduledDate || null,
            extra_commentary: newCard.extraCommentary
        };
        if (sedeId) {
            payload.sede_id = sedeId;
        }
        const { error } = await supabase.from('gift_cards').insert(payload);
        if (error) {
            alert('ERROR: No se pudo crear la tarjeta regalo.');
            return;
        }
        await loadAllData();
    };

    const updateGiftCard = async (id: string, updates: Partial<GiftCard>) => {
        const payload = removeUndefined({
            buyer: updates.buyer,
            recipient: updates.recipient,
            num_classes: updates.numClasses,
            type: updates.type,
            scheduled_date: updates.scheduledDate,
            extra_commentary: updates.extraCommentary
        });
        const { error } = await supabase.from('gift_cards').update(payload).eq('id', id);
        if (error) {
            alert('ERROR: No se pudo actualizar la tarjeta regalo.');
            return;
        }
        await loadAllData();
    };

    const deleteGiftCard = async (id: string) => {
        await supabase.from('gift_cards').delete().eq('id', id);
        await loadAllData();
    };

    // Inventory CRUD
    const addInventoryItem = async (newItem: InventoryItem) => {
        const payload: any = removeUndefined({
            ...newItem,
            id: undefined,
            created_at: undefined,
            updated_at: undefined
        });
        if (sedeId) {
            payload.sede_id = sedeId;
        }
        const { error } = await supabase.from('inventory_items').insert(payload);
        if (error) {
            alert('ERROR: No se pudo crear el item.');
            return;
        }
        await loadAllData();
    };

    const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
        const payload = removeUndefined({
            ...updates,
            id: undefined,
            created_at: undefined,
            updated_at: undefined
        });
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', id);
        if (error) {
            alert('ERROR: No se pudo actualizar el item.');
            return;
        }
        await loadAllData();
    };

    const archiveInventoryItem = async (id: string) => {
        await updateInventoryItem(id, { status: 'archived' });
    };

    const addInventoryMovement = async (newMov: Omit<InventoryMovement, 'id'>) => {
        const payload: any = {
            item_id: newMov.item_id,
            type: newMov.type,
            quantity: newMov.quantity,
            new_quantity: newMov.new_quantity,
            unit: newMov.unit,
            reason: newMov.reason,
            date: newMov.date,
            notes: newMov.notes
        };
        if (sedeId) {
            payload.sede_id = sedeId;
        }
        const { error } = await supabase.from('inventory_movements').insert(payload);
        if (error) {
            alert('ERROR: No se pudo registrar el movimiento.');
            return;
        }
        await loadAllData();
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
