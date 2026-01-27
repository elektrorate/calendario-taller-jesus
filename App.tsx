import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import CalendarView from './components/CalendarView';
import StudentList from './components/StudentList';
import PiecesToCollect from './components/PiecesToCollect';
import GiftCardView from './components/GiftCardView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import InventoryView from './components/InventoryView';
import Login from './components/Login';
import TeachersView from './components/TeachersView';
import { AppView, Student, ClassSession, CeramicPiece, GiftCard, AssignedClass, InventoryItem, InventoryMovement, Teacher } from './types';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [pieces, setPieces] = useState<CeramicPiece[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    let isActive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return;
      setSession(data.session);
      if (!data.session) {
        setStudents([]);
        setSessions([]);
        setPieces([]);
        setGiftCards([]);
        setInventoryItems([]);
        setInventoryMovements([]);
        setTeachers([]);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return;
      setSession(nextSession);
      if (!nextSession) {
        setStudents([]);
        setSessions([]);
        setPieces([]);
        setGiftCards([]);
        setInventoryItems([]);
        setInventoryMovements([]);
        setTeachers([]);
      }
    });
    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, []);

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

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
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
        supabase.from('students').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('session_students').select('*'),
        supabase.from('student_assigned_classes').select('*'),
        supabase.from('pieces').select('*'),
        supabase.from('gift_cards').select('*'),
        supabase.from('inventory_items').select('*'),
        supabase.from('inventory_movements').select('*')
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
  };

  useEffect(() => {
    if (session) loadAllData();
  }, [session]);

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

  const addStudent = async (newStudent: Omit<Student, 'id'>) => {
    const payload = buildStudentPayload(newStudent);
    const { data, error } = await supabase.from('students').insert(payload).select().single();
    if (error) {
      alert('ERROR: No se pudo crear el alumno.');
      return;
    }
    const assignedClasses = newStudent.assignedClasses || [];
    if (assignedClasses.length) {
      await persistAssignedClasses(data.id, assignedClasses);
      await syncAssignedClassesToSessions({ ...newStudent, id: data.id }, assignedClasses);
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
        await removeAssignedClassesFromSessions({ ...student, ...updates }, removed);
        await syncAssignedClassesToSessions({ ...student, ...updates }, updates.assignedClasses);
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

  const addSession = async (newSession: Omit<ClassSession, 'id'>) => {
    const payload = buildSessionPayload(newSession);
    const { data, error } = await supabase.from('sessions').insert(payload).select().single();
    if (error) {
      alert('ERROR: No se pudo crear la sesion.');
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
        alert('ERROR: No se pudo actualizar la sesion.');
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

  const addTeacher = async (newTeacher: Omit<Teacher, 'id'>) => {
    const { error } = await supabase.from('teachers').insert({
      name: newTeacher.name,
      surname: newTeacher.surname,
      specialty: newTeacher.specialty,
      email: newTeacher.email,
      phone: newTeacher.phone,
      notes: newTeacher.notes
    });
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

  const addPiece = async (newPiece: Omit<CeramicPiece, 'id'>) => {
    const ownerUpper = newPiece.owner.toUpperCase();
    const student = students.find(s => `${s.name} ${s.surname || ''}`.trim().toUpperCase() === ownerUpper);
    const { error } = await supabase.from('pieces').insert({
      owner_student_id: student?.id || null,
      owner_name: newPiece.owner,
      description: newPiece.description,
      status: newPiece.status,
      glaze_type: newPiece.glazeType,
      delivery_date: newPiece.deliveryDate || null,
      notes: newPiece.notes,
      extra_commentary: newPiece.extraCommentary
    });
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

  const addGiftCard = async (newCard: Omit<GiftCard, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('gift_cards').insert({
      buyer: newCard.buyer,
      recipient: newCard.recipient,
      num_classes: newCard.numClasses,
      type: newCard.type,
      scheduled_date: newCard.scheduledDate || null,
      extra_commentary: newCard.extraCommentary
    });
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

  const addInventoryItem = async (newItem: InventoryItem) => {
    const payload = removeUndefined({
      ...newItem,
      id: undefined,
      created_at: undefined,
      updated_at: undefined
    });
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
    const { error } = await supabase.from('inventory_movements').insert({
      item_id: newMov.item_id,
      type: newMov.type,
      quantity: newMov.quantity,
      new_quantity: newMov.new_quantity,
      unit: newMov.unit,
      reason: newMov.reason,
      date: newMov.date,
      notes: newMov.notes
    });
    if (error) {
      alert('ERROR: No se pudo registrar el movimiento.');
      return;
    }
    await loadAllData();
  };

  const getViewTitle = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <><span className="text-neutral-textHelper font-light text-[12px] block mb-0.5 tracking-widest">CENTRO DE OPERACIONES</span>ESTADO DEL <span className="text-brand">TALLER HOY</span></>;
      case AppView.CALENDAR: return <>GESTIÇ"N DE <span className="text-brand">AGENDA</span></>;
      case AppView.STUDENTS: return <>GESTIÇ"N DE <span className="text-brand">ALUMNOS</span></>;
      case AppView.TEACHERS: return <>GESTIÇ"N DE <span className="text-brand">PROFESORES</span></>;
      case AppView.PIECES: return <>CONTROL DE <span className="text-brand">PIEZAS</span></>;
      case AppView.GIFTCARDS: return <>TARJETAS DE <span className="text-brand">REGALO</span></>;
      case AppView.HISTORY: return <>HISTORIAL <span className="text-brand">MAESTRO</span></>;
      case AppView.INVENTORY: return <>INVENTARIO <span className="text-brand">ESTUDIO</span></>;
      case AppView.SETTINGS: return <>CONFIGURACIÇ"N DEL <span className="text-brand">SISTEMA</span></>;
      default: return 'ESTUDIO';
    }
  };

  const menuConfig = [
    { group: 'INICIO', items: [{ id: AppView.DASHBOARD, label: 'Inicio' }] },
    { group: 'GESTIÇ"N', items: [
      { id: AppView.CALENDAR, label: 'Calendario' },
      { id: AppView.STUDENTS, label: 'Alumnos' },
      { id: AppView.TEACHERS, label: 'Profesores' },
      { id: AppView.PIECES, label: 'Piezas' },
      { id: AppView.HISTORY, label: 'Historial' }
    ]},
    { group: 'TALLER', items: [{ id: AppView.INVENTORY, label: 'Inventario' }] },
    { group: 'COMERCIAL', items: [{ id: AppView.GIFTCARDS, label: 'Bonos Regalo' }] },
    { group: 'SISTEMA', items: [{ id: AppView.SETTINGS, label: 'ConfiguraciÇün' }] }
  ];

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return (
          <DashboardView 
            students={students} 
            sessions={sessions} 
            onUpdateSession={updateSession}
            onNavigate={(view) => setCurrentView(view)}
            onOpenStudentProfile={(studentId) => { setSelectedStudentId(studentId); setCurrentView(AppView.STUDENTS); }}
          />
        );
      case AppView.CALENDAR:
        return <CalendarView sessions={sessions} onAddSession={addSession} onUpdateSession={updateSession} onDeleteSession={deleteSession} students={students} teachers={teachers} />;
      case AppView.STUDENTS:
        return (
          <StudentList
            students={students}
            onAddStudent={addStudent}
            onRenew={renewStudent}
            onUpdate={updateStudent}
            onDeleteStudent={deleteStudent}
            selectedStudentId={selectedStudentId}
            onClearSelectedStudent={() => setSelectedStudentId(null)}
          />
        );
      case AppView.TEACHERS:
        return <TeachersView teachers={teachers} sessions={sessions} onAddTeacher={addTeacher} onUpdateTeacher={updateTeacher} onDeleteTeacher={deleteTeacher} />;
      case AppView.PIECES:
        return <PiecesToCollect pieces={pieces} students={students} onAddPiece={addPiece} onUpdatePiece={updatePiece} onDeletePiece={deletePiece} />;
      case AppView.GIFTCARDS:
        return <GiftCardView giftCards={giftCards} onAddGiftCard={addGiftCard} onUpdateGiftCard={updateGiftCard} onDeleteGiftCard={deleteGiftCard} />;
      case AppView.HISTORY:
        return <HistoryView students={students} sessions={sessions} pieces={pieces} />;
      case AppView.INVENTORY:
        return <InventoryView items={inventoryItems} movements={inventoryMovements} onAddItem={addInventoryItem} onUpdateItem={updateInventoryItem} onArchiveItem={archiveInventoryItem} onAddMovement={addInventoryMovement} />;
      case AppView.SETTINGS:
        return <SettingsView />;
      default:
        return (
          <DashboardView
            students={students}
            sessions={sessions}
            onUpdateSession={updateSession}
            onNavigate={(view) => setCurrentView(view)}
            onOpenStudentProfile={(studentId) => { setSelectedStudentId(studentId); setCurrentView(AppView.STUDENTS); }}
          />
        );
    }
  };

  if (!session) return <Login />;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-neutral-base overflow-hidden">
      <div className="hidden lg:block h-full py-6 pl-6 shrink-0">
        <Sidebar currentView={currentView} setView={setCurrentView} onLogout={() => supabase.auth.signOut()} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="p-3 md:p-6 shrink-0">
          <header className="bg-[#F2E8DF] rounded-[24px] md:rounded-[32px] px-6 md:px-8 py-5 md:py-6 flex justify-between items-center shadow-sm relative z-40">
            <div className="flex flex-col">
                <h2 className="text-[18px] md:text-[28px] font-black text-neutral-textMain leading-tight uppercase tracking-tight">
                  {getViewTitle()}
                </h2>
            </div>
            
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col justify-center items-end gap-[5px] w-[44px] h-[44px] hover:opacity-70 transition-opacity"
              aria-label="Abrir menÇ§"
            >
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
            </button>
          </header>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoadingData ? (
            <div className="h-full flex items-center justify-center text-neutral-textHelper uppercase text-[12px] tracking-widest">Cargando datos...</div>
          ) : (
            renderView()
          )}
        </div>
      </main>

      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[100] animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[300px] md:w-[380px] bg-white z-[110] shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden rounded-l-[3rem]">
            <div className="p-8 md:p-10 border-b border-[#EAEAEA] flex justify-between items-start">
               <div>
                 <h3 className="text-[18px] md:text-[22px] font-bold text-[#2B2B2B] uppercase tracking-tight">MenÇ§</h3>
                 <p className="text-[12px] text-[#9A9A9A] uppercase tracking-[0.1em] font-normal mt-0.5">Estudio de CerÇ­mica</p>
               </div>
               <button onClick={() => setIsMenuOpen(false)} className="text-[#2B2B2B] p-2 hover:opacity-50 transition-opacity">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 space-y-10">
               {menuConfig.map((group) => (
                 <div key={group.group} className="space-y-4">
                   <h4 className="text-[12px] font-semibold text-[#E26D5A] uppercase tracking-[0.1em] px-4">{group.group}</h4>
                   <div className="space-y-1">
                     {group.items.map(item => (
                       <button
                         key={item.id}
                         onClick={() => { setCurrentView(item.id); setIsMenuOpen(false); }}
                         className={`w-full text-left px-6 py-4 rounded-[1.2rem] text-[15px] md:text-[16px] uppercase tracking-wider transition-all duration-200 flex items-center h-[52px] ${
                           currentView === item.id 
                           ? 'bg-[#E26D5A] text-white font-bold shadow-lg shadow-[#E26D5A]/20' 
                           : 'text-[#2B2B2B] hover:bg-[#F3EDE6] font-medium'
                         }`}
                       >
                         {item.label}
                       </button>
                     ))}
                   </div>
                 </div>
               ))}
               
               <div className="pt-6 border-t border-[#EAEAEA]">
                  <button 
                    onClick={() => { supabase.auth.signOut(); setIsMenuOpen(false); }}
                    className="w-full text-left px-6 py-4 text-[#E26D5A] font-bold uppercase text-[14px] tracking-widest hover:opacity-70 transition-opacity"
                  >
                    Cerrar SesiÇün
                  </button>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
