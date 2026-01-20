
import React, { useState } from 'react';
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
import { STUDENTS as INITIAL_STUDENTS, SESSIONS as INITIAL_SESSIONS, PIECES as INITIAL_PIECES, GIFTCARDS as INITIAL_GIFTCARDS, INVENTORY_ITEMS as INITIAL_INVENTORY, INVENTORY_MOVEMENTS as INITIAL_MOVEMENTS, TEACHERS as INITIAL_TEACHERS } from './constants';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [sessions, setSessions] = useState<ClassSession[]>(INITIAL_SESSIONS);
  const [pieces, setPieces] = useState<CeramicPiece[]>(INITIAL_PIECES);
  const [giftCards, setGiftCards] = useState<GiftCard[]>(INITIAL_GIFTCARDS);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(INITIAL_MOVEMENTS);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const getViewTitle = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <><span className="text-neutral-textHelper font-light text-[12px] block mb-0.5 tracking-widest">CENTRO DE OPERACIONES</span>ESTADO DEL <span className="text-brand">TALLER HOY</span></>;
      case AppView.CALENDAR: return <>GESTIÓN DE <span className="text-brand">AGENDA</span></>;
      case AppView.STUDENTS: return <>GESTIÓN DE <span className="text-brand">ALUMNOS</span></>;
      case AppView.TEACHERS: return <>GESTIÓN DE <span className="text-brand">PROFESORES</span></>;
      case AppView.PIECES: return <>CONTROL DE <span className="text-brand">PIEZAS</span></>;
      case AppView.GIFTCARDS: return <>TARJETAS DE <span className="text-brand">REGALO</span></>;
      case AppView.HISTORY: return <>HISTORIAL <span className="text-brand">MAESTRO</span></>;
      case AppView.INVENTORY: return <>INVENTARIO <span className="text-brand">ESTUDIO</span></>;
      case AppView.SETTINGS: return <>CONFIGURACIÓN DEL <span className="text-brand">SISTEMA</span></>;
      default: return 'ESTUDIO';
    }
  };

  const syncSessionsWithStudents = (allStudents: Student[], currentSessions: ClassSession[]) => {
    let updatedSessions: ClassSession[] = currentSessions
      .filter(s => !s.id.startsWith('auto-'))
      .map(s => ({ ...s, students: [], attendance: {} }));

    allStudents.forEach(student => {
      const fullName = `${student.name} ${student.surname || ''}`.trim();
      if (student.assignedClasses && student.assignedClasses.length > 0) {
        student.assignedClasses.forEach((cls: AssignedClass) => {
          const existingSessionIndex = updatedSessions.findIndex(s => s.date === cls.date && s.startTime === cls.startTime);
          if (existingSessionIndex !== -1) {
            if (!updatedSessions[existingSessionIndex].students.includes(fullName)) {
              updatedSessions[existingSessionIndex].students.push(fullName.toUpperCase());
            }
            if (cls.status === 'present' || cls.status === 'absent') {
              updatedSessions[existingSessionIndex].attendance = {
                ...updatedSessions[existingSessionIndex].attendance,
                [fullName.toUpperCase()]: cls.status
              };
            }
          } else {
            updatedSessions.push({
              id: `auto-${Math.random().toString(36).substr(2, 5)}`,
              date: cls.date,
              startTime: cls.startTime,
              endTime: cls.endTime,
              classType: (student.classType?.toLowerCase() === 'torno' ? 'torno' : 'mesa') as 'mesa' | 'torno',
              students: [fullName.toUpperCase()],
              attendance: (cls.status === 'present' || cls.status === 'absent') ? { [fullName.toUpperCase()]: cls.status } : {}
            });
          }
        });
      }
    });
    return updatedSessions;
  };

  const addStudent = (newStudent: Omit<Student, 'id'>) => {
    const studentWithId: Student = { ...newStudent, id: Math.random().toString(36).substr(2, 9) };
    const updatedStudents = [...students, studentWithId];
    setStudents(updatedStudents);
    setSessions(prev => syncSessionsWithStudents(updatedStudents, prev));
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    const updatedStudents = students.map(s => s.id === id ? { ...s, ...updates } : s);
    setStudents(updatedStudents);
    setSessions(prev => syncSessionsWithStudents(updatedStudents, prev));
  };

  const deleteStudent = (id: string) => {
    const updatedStudents = students.filter(s => s.id !== id);
    setStudents(updatedStudents);
    setSessions(prev => syncSessionsWithStudents(updatedStudents, prev));
  };

  const renewStudent = (id: string, numClasses: number = 4) => {
    const updatedStudents = students.map(s => {
      if (s.id === id) return { ...s, classesRemaining: (s.classesRemaining || 0) + numClasses, status: 'regular' as const };
      return s;
    });
    setStudents(updatedStudents);
  };

  const addSession = (newSession: Omit<ClassSession, 'id'>) => {
    const sessionWithId: ClassSession = { ...newSession, id: `manual-${Math.random().toString(36).substr(2, 5)}` };
    setSessions([...sessions, sessionWithId]);
  };

  const updateSession = (id: string, updates: Partial<ClassSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(p => p.id !== id));
  };

  const addTeacher = (newTeacher: Omit<Teacher, 'id'>) => {
    const teacherWithId: Teacher = { ...newTeacher, id: Math.random().toString(36).substr(2, 9) };
    setTeachers(prev => [...prev, teacherWithId]);
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTeacher = (id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    setSessions(prev => prev.map(s => s.teacherId === id ? { ...s, teacherId: undefined } : s));
  };

  const addPiece = (newPiece: Omit<CeramicPiece, 'id'>) => {
    const pieceWithId: CeramicPiece = { ...newPiece, id: `p${Math.random().toString(36).substr(2, 5)}` };
    setPieces([...pieces, pieceWithId]);
  };

  const updatePiece = (id: string, updates: Partial<CeramicPiece>) => {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePiece = (id: string) => {
    setPieces(prev => prev.filter(p => p.id !== id));
  };

  const addGiftCard = (newCard: Omit<GiftCard, 'id' | 'createdAt'>) => {
    const cardWithId: GiftCard = { ...newCard, id: `g${Math.random().toString(36).substr(2, 5)}`, createdAt: new Date().toISOString() };
    setGiftCards([...giftCards, cardWithId]);
  };

  const updateGiftCard = (id: string, updates: Partial<GiftCard>) => {
    setGiftCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteGiftCard = (id: string) => {
    setGiftCards(prev => prev.filter(c => c.id !== id));
  };

  const addInventoryItem = (newItem: any) => {
    const itemWithId: InventoryItem = { 
      ...newItem, 
      id: `inv-${Math.random().toString(36).substr(2, 5)}`,
      current_quantity: newItem.current_quantity || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };
    setInventoryItems([...inventoryItems, itemWithId]);
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventoryItems(prev => prev.map(i => i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i));
  };

  const archiveInventoryItem = (id: string) => {
    updateInventoryItem(id, { status: 'archived' });
  };

  const addInventoryMovement = (newMov: Omit<InventoryMovement, 'id'>) => {
    const movWithId: InventoryMovement = { ...newMov, id: `mov-${Math.random().toString(36).substr(2, 5)}` };
    setInventoryMovements([...inventoryMovements, movWithId]);
    setInventoryItems(prev => prev.map(item => {
      if (item.id === newMov.item_id) {
        let newQuantity = item.current_quantity;
        if (newMov.type === 'in') newQuantity += (newMov.quantity || 0);
        else if (newMov.type === 'out') newQuantity -= (newMov.quantity || 0);
        else if (newMov.type === 'adjust') newQuantity = (newMov.new_quantity || 0);
        return { ...item, current_quantity: newQuantity, updated_at: new Date().toISOString() };
      }
      return item;
    }));
  };

  const menuConfig = [
    { group: 'INICIO', items: [{ id: AppView.DASHBOARD, label: 'Inicio' }] },
    { group: 'GESTIÓN', items: [
      { id: AppView.CALENDAR, label: 'Calendario' },
      { id: AppView.STUDENTS, label: 'Alumnos' },
      { id: AppView.TEACHERS, label: 'Profesores' },
      { id: AppView.PIECES, label: 'Piezas' },
      { id: AppView.HISTORY, label: 'Historial' }
    ]},
    { group: 'TALLER', items: [{ id: AppView.INVENTORY, label: 'Inventario' }] },
    { group: 'COMERCIAL', items: [{ id: AppView.GIFTCARDS, label: 'Bonos Regalo' }] },
    { group: 'SISTEMA', items: [{ id: AppView.SETTINGS, label: 'Configuración' }] }
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

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-neutral-base overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full py-6 pl-6 shrink-0">
        <Sidebar currentView={currentView} setView={setCurrentView} onLogout={() => setIsLoggedIn(false)} />
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
              aria-label="Abrir menú"
            >
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
               <div className="w-[30px] h-[1.5px] bg-[#6F625C]"></div>
            </button>
          </header>
        </div>

        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      </main>

      {/* Drawer Menú Lateral (Refinado según diseño solicitado) */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[100] animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[300px] md:w-[380px] bg-white z-[110] shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden rounded-l-[3rem]">
            {/* Header del Menú */}
            <div className="p-8 md:p-10 border-b border-[#EAEAEA] flex justify-between items-start">
               <div>
                 <h3 className="text-[18px] md:text-[22px] font-bold text-[#2B2B2B] uppercase tracking-tight">Menú</h3>
                 <p className="text-[12px] text-[#9A9A9A] uppercase tracking-[0.1em] font-normal mt-0.5">Estudio de Cerámica</p>
               </div>
               <button onClick={() => setIsMenuOpen(false)} className="text-[#2B2B2B] p-2 hover:opacity-50 transition-opacity">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            
            {/* Cuerpo con Scroll */}
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
                    onClick={() => { setIsLoggedIn(false); setIsMenuOpen(false); }}
                    className="w-full text-left px-6 py-4 text-[#E26D5A] font-bold uppercase text-[14px] tracking-widest hover:opacity-70 transition-opacity"
                  >
                    Cerrar Sesión
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
