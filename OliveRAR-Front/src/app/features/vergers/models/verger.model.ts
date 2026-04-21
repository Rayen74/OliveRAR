export interface Verger {
  id?: string;
  nom: string;
  localisation: string;
  statut: string;
  superficie: number;
  nombreArbres: number;
  typeOlive: string;
  latitude: number;
  longitude: number;
  rendementEstime: number;
  agriculteurId?: string;
  dateAlerteMaturite?: string | null;
}

export interface VergerMutationResponse {
  success: boolean;
  data: Verger;
  message: string;
}

export interface VergerPaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedVergerResponse {
  items: Verger[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
