import { Unite } from '../../ressources/models/logistique.model';

export interface Collecte {
  id?: string;
  name: string;
  vergerId: string;
  vergerNom?: string;
  localisation?: string;
  latitude?: number;
  longitude?: number;
  datePrevue: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  chefRecolteId: string;
  chefRecolteNom?: string;
  responsableAffectationId?: string;
  responsableAffectationNom?: string;
  equipe?: { id: string; nom: string }[];
  statut: string;
  tourneeId?: string | null;
  tourneeName?: string | null;
  inheritedAffectations?: Affectation[];
  affectations?: Affectation[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Affectation {
  cibleId: string;
  typeCible: 'MACHINE' | 'HUMAIN';
  niveau?: 'TOURNEE' | 'COLLECTE';
  startTime: string;
  endTime: string;
  statutReservation: string;
  statutOperationnel?: string;
  unite?: Unite;
  resource?: {
    id: string;
    name: string;
    type: string;
    quantity: number;
    status: string;
    photoUrl?: string | null;
  };
}

export interface CollecteCalendarItem {
  id: string;
  datePrevue: string;
  statut: string;
  vergerNom: string;
  chefRecolteNom: string;
  equipeSize: number;
}

export interface PaginatedCollecteResponse {
  items: Collecte[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CollecteMutationResponse {
  success: boolean;
  message: string;
  data?: Collecte;
}

export interface DropdownUser {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  disponibilite?: string;
}

export interface DropdownVerger {
  id: string;
  nom: string;
  localisation: string;
  statut: string;
}
