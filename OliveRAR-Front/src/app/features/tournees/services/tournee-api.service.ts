import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import {
  PaginatedTourneesResponse,
  Tournee,
  TourneeMutationResponse
} from '../models/tournee.model';
import { Affectation } from '../../collectes/models/collecte.model';

@Injectable({ providedIn: 'root' })
export class TourneeApiService {
  private readonly apiUrl = `${API_PREFIX}/tournees`;

  constructor(private readonly http: HttpClient) { }

  getAll(page = 0, size = 6, search?: string, status?: string): Observable<PaginatedTourneesResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<PaginatedTourneesResponse>(this.apiUrl, { params });
  }

  getById(id: string): Observable<{ success: boolean; data: Tournee }> {
    return this.http.get<{ success: boolean; data: Tournee }>(`${this.apiUrl}/${id}`);
  }

  create(payload: Tournee): Observable<TourneeMutationResponse> {
    return this.http.post<TourneeMutationResponse>(this.apiUrl, payload);
  }

  update(id: string, payload: Tournee): Observable<TourneeMutationResponse> {
    return this.http.put<TourneeMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: string): Observable<TourneeMutationResponse> {
    return this.http.delete<TourneeMutationResponse>(`${this.apiUrl}/${id}`);
  }

  addCollect(id: string, collectId: string): Observable<TourneeMutationResponse> {
    return this.http.post<TourneeMutationResponse>(`${this.apiUrl}/${id}/collects`, { collectId });
  }

  removeCollect(id: string, collectId: string): Observable<TourneeMutationResponse> {
    return this.http.delete<TourneeMutationResponse>(`${this.apiUrl}/${id}/collects/${collectId}`);
  }

  updateResources(id: string, Affectations: Affectation[]): Observable<TourneeMutationResponse> {
    return this.http.patch<TourneeMutationResponse>(`${this.apiUrl}/${id}/resources`, Affectations);
  }

  getCalendarData(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.apiUrl}/calendar-data`);
  }

  getMyTours(): Observable<{ success: boolean; data: Tournee[] }> {
    return this.http.get<{ success: boolean; data: Tournee[] }>(`${this.apiUrl}/my-tours`);
  }
}
