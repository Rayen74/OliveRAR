import { ResourceAssignment } from '../../collectes/models/collecte.model';

export interface TourneeCollecteSummary {
  id: string;
  name: string;
  vergerId: string;
  vergerNom: string;
  localisation: string;
  latitude?: number;
  longitude?: number;
  datePrevue?: string;
  statut?: string;
  resourceAssignments?: ResourceAssignment[];
}

export interface Tournee {
  id?: string;
  name: string;
  datePrevue?: string;
  collecteIds: string[];
  plannedStartTime: string;
  plannedEndTime: string;
  optimizationEnabled?: boolean;
  status: string;
  resourceAssignments?: ResourceAssignment[];
  createdAt?: string;
  updatedAt?: string;
  collectes?: TourneeCollecteSummary[];
}

export interface PaginatedTourneesResponse {
  success: boolean;
  items: Tournee[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TourneeMutationResponse {
  success: boolean;
  message: string;
  data?: Tournee;
}
