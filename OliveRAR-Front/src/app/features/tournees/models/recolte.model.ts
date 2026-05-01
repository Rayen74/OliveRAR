export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  RETARD = 'RETARD'
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
  items: ChecklistItem[];
  statutGlobal?: CheckStatus;
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
