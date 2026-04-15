import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ------------------------------------------------------------------ //
//  Interfaces
// ------------------------------------------------------------------ //

export interface Collecte {
  id?: string;
  vergerId: string;
  vergerNom?: string;
  datePrevue: string;
  chefRecolteId: string;
  chefRecolteNom?: string;
  responsableAffectationId?: string;
  responsableAffectationNom?: string;
  equipeIds: string[];
  equipe?: { id: string; nom: string }[];
  statut: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
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

// ------------------------------------------------------------------ //
//  Service
// ------------------------------------------------------------------ //

@Injectable({ providedIn: 'root' })
export class CollecteApiService {
  private readonly base = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // Collecte CRUD
  getAll(page = 0, size = 5, chefRecolteId?: string, statut?: string): Observable<PaginatedCollecteResponse> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (chefRecolteId) params = params.set('chefRecolteId', chefRecolteId);
    if (statut) params = params.set('statut', statut);
    return this.http.get<PaginatedCollecteResponse>(`${this.base}/collectes`, { params });
  }

  getById(id: string): Observable<{ success: boolean; data: Collecte }> {
    return this.http.get<{ success: boolean; data: Collecte }>(`${this.base}/collectes/${id}`);
  }

  create(payload: Collecte): Observable<CollecteMutationResponse> {
    return this.http.post<CollecteMutationResponse>(`${this.base}/collectes`, payload);
  }

  update(id: string, payload: Collecte): Observable<CollecteMutationResponse> {
    return this.http.put<CollecteMutationResponse>(`${this.base}/collectes/${id}`, payload);
  }

  delete(id: string): Observable<CollecteMutationResponse> {
    return this.http.delete<CollecteMutationResponse>(`${this.base}/collectes/${id}`);
  }

  getCalendarData(): Observable<{ success: boolean; data: CollecteCalendarItem[] }> {
    return this.http.get<{ success: boolean; data: CollecteCalendarItem[] }>(`${this.base}/collectes/calendar`);
  }

  // Dropdown data helpers
  getReadyVergers(): Observable<DropdownVerger[]> {
    return this.http.get<DropdownVerger[]>(`${this.base}/verger/ready`);
  }

  getUsersByRole(role: string, disponibilite?: string): Observable<{ success: boolean; users: DropdownUser[] }> {
    let params = new HttpParams().set('role', role);
    if (disponibilite) params = params.set('disponibilite', disponibilite);
    return this.http.get<{ success: boolean; users: DropdownUser[] }>(`${this.base}/users/by-role`, { params });
  }
}
