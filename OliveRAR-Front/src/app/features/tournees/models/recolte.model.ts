export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  RETARD = 'RETARD'
}

export enum UniteStatut {
  DISPONIBLE = 'DISPONIBLE',
  AFFECTE = 'AFFECTE',
  EN_MAINTENANCE = 'EN_MAINTENANCE',
  EN_PANNE = 'EN_PANNE',
  HORS_SERVICE = 'HORS_SERVICE'
}

export enum CheckStatus {
  OK = 'OK',
  PROBLEME = 'PROBLEME'
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface ResourceCheck {
  resourceUnitId: string;
  label: string;
  currentUnitStatus?: string; 
  items: ChecklistItem[];
  statutGlobal?: UniteStatut; // Updated to use UniteStatut
  noteIncident?: string;
}

export interface WorkerAttendance {
  workerId: string;
  workerName: string;
  statut: AttendanceStatus;
  heurePointage?: Date;
}

export interface Recolte {
  id?: string;
  tourId: string;
  chefId?: string;
  dateEnregistrement?: Date;
  quantiteOliveKg: number;
  vergerId: string;
  attendance: WorkerAttendance[];
  resourceChecks: ResourceCheck[];
  notesGlobales?: string;
}
