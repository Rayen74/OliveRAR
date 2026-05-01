import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
// Chemin depuis : src/app/features/tournees/services/
import { API_PREFIX } from '../../../shared/config/api.config';

export interface Tournee {
  id?: string;
  collecteIds: string[];
  resourcesIds?: string[];
  agentIds?: string[];
  datePrevue: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // champs enrichis (réponse backend)
  collectes?: TourneeCollecte[];
  vehicle?: TourneeResource;
  driver?: TourneeUser;
  agents?: TourneeUser[];
  materials?: TourneeResource[];
}

// tournee-api.service.ts
export interface TourneeCollecte {
  id: string;
  vergerId: string;
  vergerNom: string;
  vergerLocalisation?: string;
  vergerRendementEstime?: number;
  vergerStatut?: string;
  chefRecolteNom?: string;
  vergerSuperficie?: number;
  statut: string; // ✅ Ajouté
}
export interface TourneeResource {
  id: string;
  name: string;
  code?: string;
  categorie: string;
  status: string;
  imageUrl?: string;
}

export interface TourneeUser {
  id: string;
  nom: string;
  prenom: string;
  role?: string;
}

export interface TourneeMutationResponse {
  success: boolean;
  message: string;
  data?: Tournee;
}

export interface PaginatedTourneeResponse {
  items: Tournee[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable({ providedIn: 'root' })
export class TourneeApiService {
  private readonly base = API_PREFIX;

  constructor(private readonly http: HttpClient) {}

  /** Toutes les tournées du logisticien connecté */
// Remplacez getMyTournees() par ceci
getMyTournees(): Observable<{ success: boolean; data: Tournee[] }> {
  return this.http.get<{ success: boolean; data: Tournee[] }>(
    `${this.base}/tournees/mes-tournees`
  );
}

  /** Tournées pour le calendrier (pas paginées) */
  getCalendarTournees(): Observable<{ success: boolean; data: Tournee[] }> {
    return this.http.get<{ success: boolean; data: Tournee[] }>(`${this.base}/tournees/calendar`);
  }

  getById(id: string): Observable<{ success: boolean; data: Tournee }> {
    return this.http.get<{ success: boolean; data: Tournee }>(`${this.base}/tournees/${id}`);
  }

  create(payload: Tournee): Observable<TourneeMutationResponse> {
    return this.http.post<TourneeMutationResponse>(`${this.base}/tournees`, payload);
  }

  update(id: string, payload: Partial<Tournee>): Observable<TourneeMutationResponse> {
    return this.http.put<TourneeMutationResponse>(`${this.base}/tournees/${id}`, payload);
  }

  delete(id: string): Observable<TourneeMutationResponse> {
    return this.http.delete<TourneeMutationResponse>(`${this.base}/tournees/${id}`);
  }

  /** Collectes assignées au logisticien connecté */
getMesCollectes(page = 0, size = 100, statut?: string): Observable<any> {
  let params = new HttpParams()
    .set('page', String(page))
    .set('size', String(size));
  if (statut) params = params.set('statut', statut);
  return this.http.get<any>(`${this.base}/collectes/mes-collectes`, { params });
}
  /** Collectes d'un jour précis (pour créer une tournée groupée) */
  getCollectesByDate(date: string): Observable<{ success: boolean; data: TourneeCollecte[] }> {
    const params = new HttpParams().set('date', date);
    return this.http.get<{ success: boolean; data: TourneeCollecte[] }>(`${this.base}/collectes/by-date`, { params });
  }

  /** Affecter équipe à une collecte (rôle logistique) */
  affecterEquipe(collecteId: string, equipeIds: string[]): Observable<any> {
    return this.http.patch<any>(`${this.base}/collectes/${collecteId}/equipe`, { equipeIds });
  }
}
