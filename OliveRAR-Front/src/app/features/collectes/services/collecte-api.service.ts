import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import {
  Collecte,
  CollecteCalendarItem,
  CollecteMutationResponse,
  DropdownUser,
  DropdownVerger,
  PaginatedCollecteResponse
} from '../models/collecte.model';

export type {
  Collecte,
  CollecteCalendarItem,
  CollecteMutationResponse,
  DropdownUser,
  DropdownVerger,
  PaginatedCollecteResponse
} from '../models/collecte.model';

@Injectable({ providedIn: 'root' })
export class CollecteApiService {
  private readonly base = API_PREFIX;

  constructor(private readonly http: HttpClient) {}

  getAll(page = 0, size = 5, chefRecolteId?: string, statut?: string): Observable<PaginatedCollecteResponse> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (chefRecolteId) {
      params = params.set('chefRecolteId', chefRecolteId);
    }
    if (statut) {
      params = params.set('statut', statut);
    }
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

  getReadyVergers(): Observable<DropdownVerger[]> {
    return this.http.get<DropdownVerger[]>(`${this.base}/verger/ready`);
  }

  getUsersByRole(role: string, disponibilite?: string): Observable<{ success: boolean; users: DropdownUser[] }> {
    let params = new HttpParams().set('role', role);
    if (disponibilite) {
      params = params.set('disponibilite', disponibilite);
    }
    return this.http.get<{ success: boolean; users: DropdownUser[] }>(`${this.base}/users/by-role`, { params });
  }
}
