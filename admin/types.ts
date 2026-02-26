
export enum WorkshopStatus {
  ACTIVE = 'Activo',
  INACTIVE = 'Inactivo'
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  WORKSHOP_ADMIN = 'Admin de Taller'
}

/* Fix: Added missing InvitationStatus enum */
export enum InvitationStatus {
  PENDING = 'Pendiente',
  ACCEPTED = 'Aceptada',
  REJECTED = 'Rechazada'
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  pais: string;
  ciudad: string;
  estado: WorkshopStatus;
  rolesGlobales: UserRole[];
  rolesPorTaller: { tallerId: string; rol: string }[];
  password?: string;
}

export interface Workshop {
  id: string;
  nombre: string;
  descripcion?: string;
  pais: string;
  ciudad: string;
  direccion: string;
  lat: number;
  lng: number;
  telefonoTaller?: string;
  emailTaller?: string;
  estado: WorkshopStatus;
  adminGeneralUserId?: string;
  adminUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  fecha: string;
  accion: string;
  usuario: string;
  tallerId?: string;
}

/* Fix: Added missing Invitation interface */
export interface Invitation {
  id: string;
  email: string;
  tallerId: string;
  rol: string;
  fechaEnvio: string;
  estado: InvitationStatus;
}
