
export enum AppView {
  CALENDAR = 'calendar',
  STUDENTS = 'students',
  PIECES = 'pieces',
  GIFTCARDS = 'giftcards',
  DASHBOARD = 'dashboard',
  SETTINGS = 'settings',
  HISTORY = 'history',
  INVENTORY = 'inventory',
  TEACHERS = 'teachers'
}

export interface AssignedClass {
  date: string;
  startTime: string;
  endTime: string;
  status?: 'present' | 'absent' | 'pending';
}

export interface Student {
  id: string;
  name: string;
  surname?: string;
  email?: string;
  phone: string;
  phoneCountry?: string;
  birthDay?: string;
  birthMonth?: string;
  birthYear?: string;
  classesRemaining: number;
  status: 'regular' | 'needs_renewal' | 'new';
  paymentMethod?: string;
  notes?: string;
  observations?: string;
  price?: number;
  assignedClasses?: AssignedClass[];
  classType?: string;
  expiryDate?: string;
}

export interface ClassSession {
  id: string;
  date: string; // ISO format
  startTime: string;
  endTime: string;
  classType: 'mesa' | 'torno' | 'coworking' | 'workshop' | 'privada' | 'feriado';
  students: string[]; // List of student names
  attendance?: Record<string, 'present' | 'absent'>; // Record key is student name or ID
  teacherId?: string;
  teacherSubstituteId?: string;
  completedAt?: string;
  workshopName?: string;
  privateReason?: string;
}

export interface Teacher {
  id: string;
  name: string;
  surname?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  notes?: string;
}

export type PieceStatus = '1era_quema' | 'esmaltado' | 'a_recogida' | 'entregado';

export interface CeramicPiece {
  id: string;
  owner: string;
  description: string;
  status: PieceStatus;
  glazeType?: string;
  deliveryDate?: string; // ISO date string
  notes?: string;
  extraCommentary?: string;
}

export interface GiftCard {
  id: string;
  buyer: string;
  recipient: string;
  numClasses: number;
  type: 'modelado' | 'torno';
  scheduledDate?: string;
  createdAt: string; // ISO format
  extraCommentary?: string;
}

// --- INVENTORY TYPES ---

export type InventoryCategory = 'glaze' | 'clay' | 'engobe' | 'oxide' | 'raw_material';
export type InventoryItemStatus = 'active' | 'archived';
export type MovementType = 'in' | 'out' | 'adjust';
export type ColorFamily = 'blancos' | 'negros' | 'azules' | 'verdes' | 'tierras' | 'transparentes' | 'efectos' | 'otros';
export type GlazeFinish = 'mate' | 'satinado' | 'brillo';

export interface InventoryMovement {
  id: string;
  item_id: string;
  type: MovementType;
  quantity?: number;
  new_quantity?: number; // Para ajustes absolutos
  unit: string;
  reason: string;
  date: string;
  notes?: string;
}

export interface FormulaComponent {
  name: string;
  percentage: number;
}

export interface StructuredFormula {
  recipe: FormulaComponent[]; // Bloque A: 100%
  additives: FormulaComponent[]; // Bloque B: extras
  colorants: FormulaComponent[]; // Bloque C: extras
}

export interface InventoryItem {
  id: string;
  category: InventoryCategory;
  name: string;
  code: string;
  unit: string;
  current_quantity: number;
  min_quantity?: number;
  location?: string;
  supplier?: string;
  supplier_code?: string;
  cost_per_unit?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  status: InventoryItemStatus;
  
  // Específicos Esmaltes y Engobes
  formula_unit?: 'percent' | 'weight';
  formula?: StructuredFormula;
  firing_range?: string;
  surface?: string;
  color?: string;
  color_family?: ColorFamily;
  finish?: GlazeFinish;
  test_tile_reference?: string;
  hazard_notes?: string;
  state?: string;

  // Específicos Pastas
  clay_type?: string;
  cone_or_temp?: string;
  body_notes?: string;
  unit_weight?: number; // Peso unitario por pella/bolsa en kg

  // Específicos Engobes
  engobe_base?: string;

  // Específicos Óxidos
  chemical_name?: string;
  purity?: string;

  // Específicos Otros
  material_type?: string;
}
