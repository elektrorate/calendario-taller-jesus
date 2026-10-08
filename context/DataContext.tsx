import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import {
    Student, ClassSession, CeramicPiece, GiftCard, AssignedClass,
    InventoryItem, InventoryMovement, Teacher, MembershipTier, MEMBERSHIP_PLANS, inferMembershipTier
} from '../types';

// Import modular operations
import { extractTime, normalizeForMatch, withTimeout, RELOAD_TIMEOUT_MS, OpsContext } from './data/shared';
import * as studentOps from './data/studentOps';
import * as sessionOps from './data/sessionOps';
import * as teacherOps from './data/teacherOps';
import * as pieceOps from './data/pieceOps';
import * as giftCardOps from './data/giftCardOps';
import * as inventoryOps from './data/inventoryOps';
import { isStudentArchived } from '../utils/studentLifecycle';

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
    renewStudent: (id: string, numClasses?: number, membershipTier?: MembershipTier) => Promise<void>;

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
    const operationLockRef = useRef(false);

    // ==================== DATA LOADING ====================
    const loadAllData = useCallback(async () => {
        if (!session) return;
        // Removed sedeId guard: RLS on Supabase will filter by get_owned_sede_id()
        // This ensures staff users can load data even before sedeId resolves
        if (!hasLoadedOnceRef.current) setIsLoadingData(true);

        try {
            const buildQuery = (table: string) => {
                let query = supabase.from(table).select('*');
                if (!isSuperAdmin && sedeId) query = query.eq('sede_id', sedeId);
                return query;
            };

            const [studentsRes, teachersRes, sessionsRes, sessionStudentsRes, piecesRes, giftRes, inventoryRes, movementsRes] = await Promise.all([
                buildQuery('students'), buildQuery('teachers'), buildQuery('sessions'),
                buildQuery('session_students'),
                buildQuery('pieces'), buildQuery('gift_cards'), buildQuery('inventory_items'), buildQuery('inventory_movements')
            ]);

            if (studentsRes.error) throw studentsRes.error;
            if (teachersRes.error) throw teachersRes.error;
            if (sessionsRes.error) throw sessionsRes.error;
            if (sessionStudentsRes.error) throw sessionStudentsRes.error;
            if (piecesRes.error) throw piecesRes.error;
            if (giftRes.error) throw giftRes.error;
            if (inventoryRes.error) throw inventoryRes.error;
            if (movementsRes.error) throw movementsRes.error;

            const today = new Date().toISOString().split('T')[0];

            // Normalize students and apply lifecycle rules before exposing them to the UI.
            const normalizedStudents: Student[] = (studentsRes.data || []).map((row: any) => {
                const studentCategory = row.student_category || 'membresia';
                const membershipTier = studentCategory === 'temporal' ? undefined : (row.membership_tier || inferMembershipTier(undefined, row.price));
                const student: Student = {
                id: row.id, name: row.name, surname: row.surname || undefined,
                email: row.email || undefined, phone: row.phone,
                phoneCountry: row.phone_country || undefined,
                birthDay: row.birth_day ? String(row.birth_day) : undefined,
                birthMonth: row.birth_month ? String(row.birth_month) : undefined,
                birthYear: row.birth_year ? String(row.birth_year) : undefined,
                classesRemaining: row.classes_remaining ?? 0, status: row.status,
                paymentMethod: row.payment_method || undefined,
                notes: row.notes || undefined, observations: row.observations || undefined,
                price: row.price ?? undefined,
                assignedClasses: [],
                classType: row.class_type || undefined,
                expiryDate: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : undefined,
                studentCategory,
                membershipTier,
                membershipActivatedAt: row.membership_activated_at || undefined,
                archivedAt: row.archived_at || undefined,
                groupName: row.group_name || undefined,
                bonosAsignados: row.bonos_asignados ?? (studentCategory === 'temporal' ? 1 : MEMBERSHIP_PLANS[membershipTier!].bonuses),
                repetirMensualmente: row.repetir_mensualmente ?? false,
                createdAt: row.created_at || undefined
                };
                if (student.studentCategory === 'temporal') {
                    student.bonosAsignados = Math.min(3, Math.max(1, student.bonosAsignados ?? 1));
                    student.classesRemaining = Math.min(student.classesRemaining, student.bonosAsignados);
                    student.repetirMensualmente = false;
                }
                return !student.archivedAt && isStudentArchived(student, today)
                    ? { ...student, archivedAt: today }
                    : student;
            });

            // Normalize session students
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
                    id: row.id, date: row.date,
                    startTime: extractTime(row.start_time), endTime: extractTime(row.end_time),
                    classType: row.class_type,
                    students: linked.map((item: any) => item.student_name),
                    studentIds: linked.map((item: any) => item.student_id || ''),
                    attendance: Object.keys(attendance).length ? attendance : undefined,
                    attendanceByStudentId: linked.reduce((result: Record<string, 'present' | 'absent'>, item: any) => {
                        if (item.student_id && (item.attendance === 'present' || item.attendance === 'absent')) {
                            result[item.student_id] = item.attendance;
                        }
                        return result;
                    }, {}),
                    teacherId: row.teacher_id || undefined,
                    teacherSubstituteId: row.teacher_substitute_id || undefined,
                    completedAt: row.completed_at || undefined,
                    workshopName: row.workshop_name || undefined,
                    privateReason: row.private_reason || undefined,
                    sessionAudience: row.session_audience || undefined
                };
            });

            const studentIdsByName = new Map(
                normalizedStudents.map(student => [normalizeForMatch(`${student.name} ${student.surname || ''}`), student.id])
            );
            const attendanceHistory: Record<string, AssignedClass[]> = {};
            normalizedSessions.forEach(session => {
                session.students.forEach((studentName, index) => {
                    const studentId = session.studentIds?.[index] || studentIdsByName.get(normalizeForMatch(studentName));
                    const status = (studentId && session.attendanceByStudentId?.[studentId]) || session.attendance?.[studentName];
                    if (!studentId || (status !== 'present' && status !== 'absent')) return;
                    if (!attendanceHistory[studentId]) attendanceHistory[studentId] = [];
                    attendanceHistory[studentId].push({
                        date: session.date,
                        startTime: session.startTime,
                        endTime: session.endTime,
                        status
                    });
                });
            });

            const studentsWithAttendance = normalizedStudents.map(student => ({
                ...student,
                assignedClasses: attendanceHistory[student.id] || []
            }));

            const normalizedPieces: CeramicPiece[] = (piecesRes.data || []).map((row: any) => ({
                id: row.id, owner: row.owner_name, description: row.description,
                status: row.status, glazeType: row.glaze_type || undefined,
                deliveryDate: row.delivery_date || undefined, notes: row.notes || undefined,
                extraCommentary: row.extra_commentary || undefined, createdAt: row.created_at || undefined
            }));

            const normalizedGiftCards: GiftCard[] = (giftRes.data || []).map((row: any) => ({
                id: row.id, buyer: row.buyer, recipient: row.recipient,
                recipientStudentId: row.recipient_student_id || undefined,
                numClasses: row.num_classes, type: row.type,
                issuedDate: row.scheduled_date || undefined,
                expiryDate: row.expiry_date || undefined, createdAt: row.created_at,
                extraCommentary: row.extra_commentary || undefined
            }));

            setStudents(studentsWithAttendance);

            const studentsToArchive = studentsWithAttendance.filter(student => student.archivedAt === today);
            if (studentsToArchive.length > 0) {
                Promise.all(studentsToArchive.map(student =>
                    withTimeout('students.auto_archive', supabase.from('students').update({ archived_at: today }).eq('id', student.id))
                )).catch(error => console.error('Auto-archive failed:', error));
            }

            // Auto-renewal of expired memberships
            const studentsToRenew = studentsWithAttendance.filter(s =>
                !s.archivedAt && s.repetirMensualmente && s.studentCategory === 'membresia' && s.expiryDate && s.expiryDate < today
            );
            if (studentsToRenew.length > 0) {
                (async () => {
                    for (const st of studentsToRenew) {
                        const currentExpiry = new Date(st.expiryDate!);
                        const newExpiry = new Date(currentExpiry);
                        newExpiry.setMonth(newExpiry.getMonth() + 1);
                        if (newExpiry.toISOString().split('T')[0] < today) {
                            const fromToday = new Date();
                            fromToday.setMonth(fromToday.getMonth() + 1);
                            newExpiry.setTime(fromToday.getTime());
                        }
                        const newExpiryStr = newExpiry.toISOString().split('T')[0];
                        const membershipTier = inferMembershipTier(st.membershipTier, st.price);
                        const membershipPlan = MEMBERSHIP_PLANS[membershipTier];
                        const renewedBonos = membershipPlan.bonuses;
                        try {
                            await withTimeout('students.auto_renew', supabase.from('students').update({
                                classes_remaining: renewedBonos,
                                bonos_asignados: renewedBonos,
                                membership_tier: membershipTier,
                                price: membershipPlan.price,
                                membership_activated_at: today,
                                archived_at: null,
                                expiry_date: newExpiryStr,
                                status: 'membresia'
                            }).eq('id', st.id));
                            setStudents(prev => prev.map(s => s.id === st.id ? {
                                ...s,
                                classesRemaining: renewedBonos,
                                bonosAsignados: renewedBonos,
                                membershipTier,
                                price: membershipPlan.price,
                                membershipActivatedAt: today,
                                archivedAt: undefined,
                                expiryDate: newExpiryStr,
                                status: 'membresia' as const
                            } : s));
                            console.log(`Auto-renewed membership for ${st.name}: ${renewedBonos} bonos, expires ${newExpiryStr}`);
                        } catch (err) { console.error(`Auto-renewal failed for ${st.name}:`, err); }
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

    const safeReload = useCallback(async () => {
        let didTimeout = false;
        try {
            await Promise.race([
                loadAllData(),
                new Promise((resolve) => {
                    setTimeout(() => { didTimeout = true; console.warn(`safeReload: timeout (${RELOAD_TIMEOUT_MS}ms)`); resolve(undefined); }, RELOAD_TIMEOUT_MS);
                })
            ]);
            if (!didTimeout) console.log('safeReload: completed successfully');
        } catch (err) { console.warn('safeReload: background refresh failed', err); }
    }, [loadAllData]);

    useEffect(() => {
        if (session) {
            // Always load when there's a session. RLS protects data at DB level.
            loadAllData();
        }
        if (!session) {
            setStudents([]); setSessions([]); setPieces([]);
            setGiftCards([]); setInventoryItems([]); setInventoryMovements([]); setTeachers([]);
        }
    }, [session, sedeId, isSuperAdmin, loadAllData]);

    // ==================== REFS FOR STABLE OPS CONTEXT ====================
    // Using refs prevents getOpsContext from changing on every state update,
    // which prevents React from aborting in-flight fetch requests (AbortError).
    const studentsRef = useRef(students);
    const sessionsRef = useRef(sessions);
    const piecesRef = useRef(pieces);
    const giftCardsRef = useRef(giftCards);
    useEffect(() => { studentsRef.current = students; }, [students]);
    useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
    useEffect(() => { piecesRef.current = pieces; }, [pieces]);
    useEffect(() => { giftCardsRef.current = giftCards; }, [giftCards]);

    const getOpsContext = useCallback((): OpsContext => ({
        sedeId, isSuperAdmin, operationLockRef,
        get students() { return studentsRef.current; },
        get sessions() { return sessionsRef.current; },
        get pieces() { return piecesRef.current; },
        setStudents, setSessions, setTeachers, setPieces, setGiftCards,
        setInventoryItems, setInventoryMovements, safeReload
    }), [sedeId, isSuperAdmin, safeReload]);

    // ==================== DELEGATED CRUD ====================
    // No useCallback needed — getOpsContext is now stable
    const addStudent = async (s: Omit<Student, 'id'>) => studentOps.addStudent(getOpsContext(), s);
    const updateStudent = async (id: string, u: Partial<Student>) => studentOps.updateStudent(getOpsContext(), id, u);
    const deleteStudent = async (id: string) => studentOps.deleteStudent(getOpsContext(), id);
    const renewStudent = async (id: string, n?: number, tier?: MembershipTier) => studentOps.renewStudent(getOpsContext(), id, n, tier);

    const addSession = async (s: Omit<ClassSession, 'id'>) => sessionOps.addSession(getOpsContext(), s);
    const updateSession = async (id: string, u: Partial<ClassSession>) => sessionOps.updateSession(getOpsContext(), id, u);
    const deleteSession = async (id: string) => sessionOps.deleteSession(getOpsContext(), id);

    const addTeacher = async (t: Omit<Teacher, 'id'>) => teacherOps.addTeacher(getOpsContext(), t);
    const updateTeacher = async (id: string, u: Partial<Teacher>) => teacherOps.updateTeacher(getOpsContext(), id, u);
    const deleteTeacher = async (id: string) => teacherOps.deleteTeacher(getOpsContext(), id);

    const addPiece = async (p: Omit<CeramicPiece, 'id'>) => pieceOps.addPiece(getOpsContext(), p);
    const updatePiece = async (id: string, u: Partial<CeramicPiece>) => pieceOps.updatePiece(getOpsContext(), id, u);
    const deletePiece = async (id: string) => pieceOps.deletePiece(getOpsContext(), id);

    const addGiftCard = async (c: Omit<GiftCard, 'id' | 'createdAt'>) => giftCardOps.addGiftCard(getOpsContext(), c);
    const updateGiftCard = async (id: string, u: Partial<GiftCard>) => giftCardOps.updateGiftCard(getOpsContext(), id, u, giftCardsRef.current);
    const deleteGiftCard = async (id: string) => giftCardOps.deleteGiftCard(getOpsContext(), id);

    const addInventoryItem = async (i: InventoryItem) => inventoryOps.addInventoryItem(getOpsContext(), i);
    const updateInventoryItem = async (id: string, u: Partial<InventoryItem>) => inventoryOps.updateInventoryItem(getOpsContext(), id, u);
    const archiveInventoryItem = async (id: string) => inventoryOps.archiveInventoryItem(getOpsContext(), id);
    const deleteInventoryItem = async (id: string) => inventoryOps.deleteInventoryItem(getOpsContext(), id);
    const addInventoryMovement = async (m: Omit<InventoryMovement, 'id'>) => inventoryOps.addInventoryMovement(getOpsContext(), m);

    const value: DataContextType = {
        students, sessions, pieces, giftCards, inventoryItems, inventoryMovements, teachers, isLoadingData,
        addStudent, updateStudent, deleteStudent, renewStudent,
        addSession, updateSession, deleteSession,
        addTeacher, updateTeacher, deleteTeacher,
        addPiece, updatePiece, deletePiece,
        addGiftCard, updateGiftCard, deleteGiftCard,
        addInventoryItem, updateInventoryItem, archiveInventoryItem, deleteInventoryItem, addInventoryMovement,
        loadAllData
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;

