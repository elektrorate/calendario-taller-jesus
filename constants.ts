
import { Student, ClassSession, CeramicPiece, GiftCard, InventoryItem, InventoryMovement, Teacher } from './types';

export const STUDENTS: Student[] = [
  { id: '1', name: 'Sergi', surname: 'Vidal', phone: '34 607 71 39 26', email: 'sergi.vidal@email.com', classesRemaining: 0, status: 'regular', price: 120, notes: 'Alumno avanzado, prefiere torno.', classType: 'Torno', expiryDate: '2026-02-01' },
  { id: '2', name: 'Chantal', surname: 'Dupont', phone: '33 6 73 72 14 32', email: 'c.dupont@email.com', classesRemaining: 0, status: 'needs_renewal', paymentMethod: 'Bizum', price: 100, classType: 'Torno', expiryDate: '2026-01-30' },
  { id: '3', name: 'Elvira', surname: 'Blanco', phone: '34 644 13 50 14', email: 'elvira.b@email.com', classesRemaining: 2, status: 'regular', paymentMethod: 'Bizum', price: 100, classType: 'Modelado', expiryDate: '2026-02-10' },
  { id: '4', name: 'Juan', surname: 'García', phone: '34 630 91 95 59', email: 'juan.g@email.com', classesRemaining: 0, status: 'needs_renewal', price: 180, classType: 'Torno', expiryDate: '2026-02-20' },
  { id: '5', name: 'Maria', surname: 'López', phone: '34 611 22 33 44', email: 'm.lopez@email.com', classesRemaining: 4, status: 'regular', price: 100, classType: 'Modelado', expiryDate: '2026-02-15' },
  { id: '6', name: 'Carlos', surname: 'Ruiz', phone: '34 655 44 33 22', email: 'carlos.r@email.com', classesRemaining: 3, status: 'regular', price: 120, classType: 'Torno', expiryDate: '2026-02-18' },
  { id: '7', name: 'Ana', surname: 'Martínez', phone: '34 600 00 11 22', email: 'ana.mtz@email.com', classesRemaining: 1, status: 'regular', price: 100, classType: 'Modelado', expiryDate: '2026-02-05' },
  { id: '8', name: 'Roberto', surname: 'Sánchez', phone: '34 622 33 44 55', email: 'rober.s@email.com', classesRemaining: 0, status: 'needs_renewal', price: 120, classType: 'Torno', expiryDate: '2026-01-25' },
  { id: '9', name: 'Lucía', surname: 'Fernández', phone: '34 633 44 55 66', email: 'lucia.f@email.com', classesRemaining: 8, status: 'regular', price: 200, classType: 'Torno', expiryDate: '2026-03-01' },
  { id: '10', name: 'Sofia', surname: 'Gómez', phone: '34 644 55 66 77', email: 'sofia.g@email.com', classesRemaining: 2, status: 'regular', price: 100, classType: 'Modelado', expiryDate: '2026-02-12' },
  { id: '11', name: 'Miguel', surname: 'Ángel', phone: '34 655 66 77 88', email: 'miguel.a@email.com', classesRemaining: 4, status: 'regular', price: 120, classType: 'Torno', expiryDate: '2026-02-28' },
  { id: '12', name: 'Elena', surname: 'Rodríguez', phone: '34 666 77 88 99', email: 'elena.rod@email.com', classesRemaining: 0, status: 'needs_renewal', price: 100, classType: 'Modelado', expiryDate: '2026-01-28' },
  { id: '13', name: 'David', surname: 'Pérez', phone: '34 677 88 99 00', email: 'david.p@email.com', classesRemaining: 5, status: 'regular', price: 120, classType: 'Torno', expiryDate: '2026-03-10' }
];

export const TEACHERS: Teacher[] = [
  { id: 't1', name: 'Laura', surname: 'Martinez', specialty: 'Torno', email: 'laura@taller.com' },
  { id: 't2', name: 'Ruben', surname: 'Garcia', specialty: 'Modelado', email: 'ruben@taller.com' }
];

export const SESSIONS: ClassSession[] = [
  { id: 's1', date: '2026-01-02', startTime: '10:00', endTime: '12:00', classType: 'torno', students: ['SERGI VIDAL'], attendance: { 'SERGI VIDAL': 'present' } },
  { id: 's2', date: '2026-01-02', startTime: '12:00', endTime: '14:00', classType: 'mesa', students: ['ELVIRA BLANCO', 'MARIA LÓPEZ'], attendance: { 'ELVIRA BLANCO': 'present', 'MARIA LÓPEZ': 'present' } },
  { id: 's3', date: '2026-01-05', startTime: '17:00', endTime: '19:00', classType: 'torno', students: ['JUAN GARCÍA', 'CARLOS RUIZ'], attendance: { 'JUAN GARCÍA': 'absent', 'CARLOS RUIZ': 'present' } },
  { id: 's4', date: '2026-01-07', startTime: '10:00', endTime: '12:00', classType: 'mesa', students: ['ANA MARTÍNEZ', 'SOFIA GÓMEZ'], attendance: { 'ANA MARTÍNEZ': 'present' } },
  { id: 's5', date: '2026-01-07', startTime: '18:00', endTime: '20:00', classType: 'torno', students: ['MIGUEL ÁNGEL', 'DAVID PÉREZ'], attendance: { 'MIGUEL ÁNGEL': 'present', 'DAVID PÉREZ': 'present' } },
  { id: 's6', date: '2026-01-09', startTime: '11:00', endTime: '13:00', classType: 'torno', students: ['LUCÍA FERNÁNDEZ'], attendance: { 'LUCÍA FERNÁNDEZ': 'present' } },
  { id: 's7', date: '2026-01-12', startTime: '16:00', endTime: '18:00', classType: 'mesa', students: ['ELENA RODRÍGUEZ', 'ELVIRA BLANCO'], attendance: { 'ELENA RODRÍGUEZ': 'present', 'ELVIRA BLANCO': 'absent' } },
  { id: 's8', date: '2026-01-14', startTime: '10:30', endTime: '12:30', classType: 'torno', students: ['SERGI VIDAL', 'CARLOS RUIZ'], attendance: { 'SERGI VIDAL': 'present', 'CARLOS RUIZ': 'present' } },
  { id: 's9', date: '2026-01-16', startTime: '17:30', endTime: '19:30', classType: 'mesa', students: ['ANA MARTÍNEZ', 'MARIA LÓPEZ', 'SOFIA GÓMEZ'], attendance: { 'ANA MARTÍNEZ': 'present', 'MARIA LÓPEZ': 'present', 'SOFIA GÓMEZ': 'present' } },
  { id: 's10', date: '2026-01-19', startTime: '12:00', endTime: '14:00', classType: 'torno', students: ['JUAN GARCÍA'], attendance: { 'JUAN GARCÍA': 'present' } },
  { id: 's11', date: '2026-01-21', startTime: '18:00', endTime: '20:00', classType: 'torno', students: ['MIGUEL ÁNGEL'], attendance: { 'MIGUEL ÁNGEL': 'present' } },
  { id: 's12', date: '2026-01-23', startTime: '11:00', endTime: '13:00', classType: 'mesa', students: ['ELENA RODRÍGUEZ'], attendance: { 'ELENA RODRÍGUEZ': 'present' } },
];

export const PIECES: CeramicPiece[] = [
  { id: 'p1', owner: 'Sergi Vidal', description: 'Bowl de Desayuno Grande', status: 'entregado', glazeType: 'Azul Cobalto Brillo' },
  { id: 'p2', owner: 'Elvira Blanco', description: 'Jarrón de Cuello Estrecho', status: 'a_recogida', glazeType: 'Celadón Clásico' },
  { id: 'p3', owner: 'Maria López', description: 'Set de 3 Tazas Espresso', status: 'esmaltado', glazeType: 'Blanco Nieve' }
];

export const GIFTCARDS: GiftCard[] = [
  { id: 'g1', buyer: 'Abril', recipient: 'Juan', numClasses: 2, type: 'modelado', createdAt: '2026-01-01T10:00:00Z' }
];

export const INVENTORY_ITEMS: InventoryItem[] = [
  // --- ESMALTES ---
  { id: 'inv-gl-1', category: 'glaze', name: 'Blanco Nieve Brillo', code: 'GL-001', unit: 'l', current_quantity: 4.5, min_quantity: 2.0, status: 'active', color_family: 'blancos', finish: 'brillo', location: 'Estante A-1', created_at: '2025-10-01T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  { id: 'inv-gl-2', category: 'glaze', name: 'Celadón Clásico Verde', code: 'GL-002', unit: 'l', current_quantity: 0.5, min_quantity: 1.0, status: 'active', color_family: 'verdes', finish: 'brillo', location: 'Estante A-2', created_at: '2025-10-01T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  { id: 'inv-gl-3', category: 'glaze', name: 'Tenmoku Negro Aceite', code: 'GL-003', unit: 'l', current_quantity: 3.5, min_quantity: 1.5, status: 'active', color_family: 'negros', finish: 'satinado', location: 'Estante A-1', created_at: '2025-10-01T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  { id: 'inv-gl-4', category: 'glaze', name: 'Azul Cobalto Mate', code: 'GL-004', unit: 'l', current_quantity: 0.2, min_quantity: 2.0, status: 'active', color_family: 'azules', finish: 'mate', location: 'Estante A-3', created_at: '2025-10-01T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  
  // --- PASTAS ---
  { id: 'inv-cl-1', category: 'clay', name: 'Gres con Chamota Fina', code: 'CL-001', unit: 'pellas', current_quantity: 12, min_quantity: 5, status: 'active', location: 'Almacén Fondo', created_at: '2025-11-01T10:00:00Z', updated_at: '2026-01-08T10:00:00Z' },
  { id: 'inv-cl-2', category: 'clay', name: 'Porcelana Limoges', code: 'CL-002', unit: 'pellas', current_quantity: 2, min_quantity: 3, status: 'active', location: 'Nevera Pro', created_at: '2025-11-01T10:00:00Z', updated_at: '2026-01-08T10:00:00Z' },
  
  // --- ENGOBES ---
  { id: 'inv-en-1', category: 'engobe', name: 'Engobe Turquesa', code: 'EN-001', unit: 'ml', current_quantity: 250, min_quantity: 500, status: 'active', color: 'turquesa', created_at: '2025-11-15T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
  { id: 'inv-en-2', category: 'engobe', name: 'Engobe Negro Carbón', code: 'EN-002', unit: 'ml', current_quantity: 700, min_quantity: 300, status: 'active', color: 'negro', created_at: '2025-11-15T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },

  // --- MATERIAS PRIMAS ---
  { id: 'inv-rm-1', category: 'raw_material', name: 'Carbonato de Cobalto', code: 'RM-001', unit: 'g', current_quantity: 450, min_quantity: 100, status: 'active', location: 'Caja Químicos', created_at: '2025-09-01T10:00:00Z', updated_at: '2025-12-01T10:00:00Z' },
  { id: 'inv-rm-2', category: 'raw_material', name: 'Bentonita Sódica', code: 'RM-002', unit: 'kg', current_quantity: 0, min_quantity: 2.5, status: 'active', location: 'Almacén Suelo', created_at: '2025-12-18T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' }
];

export const INVENTORY_MOVEMENTS: InventoryMovement[] = [
  { id: 'mov-1', item_id: 'inv-gl-1', type: 'in', quantity: 5.0, unit: 'l', reason: 'Producción lote semanal', date: '2026-01-01' },
  { id: 'mov-2', item_id: 'inv-cl-1', type: 'out', quantity: 8, unit: 'pellas', reason: 'Consumo clases torno', date: '2026-01-07' },
  { id: 'mov-3', item_id: 'inv-gl-4', type: 'out', quantity: 1.5, unit: 'l', reason: 'Esmaltado mural grande', date: '2026-01-08' },
  { id: 'mov-4', item_id: 'inv-rm-2', type: 'adjust', new_quantity: 0, unit: 'kg', reason: 'Rotura de bolsa / Limpieza', date: '2026-01-09' }
];
