import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import {
  PaginatedUnitesResponse,
  StatutOption,
  Unite,
  UniteMutationResponse
} from '../models/logistique.model';

@Injectable({ providedIn: 'root' })
export class UniteApiService {
  private readonly apiUrl = `${API_PREFIX}/unites`;

  constructor(private readonly http: HttpClient) {}

  getAll(
    page = 0,
    size = 6,
    filters?: { search?: string; statut?: string; typeId?: string; disponible?: boolean }
  ): Observable<PaginatedUnitesResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters?.statut)         params = params.set('statut', filters.statut);
    if (filters?.typeId)         params = params.set('typeId', filters.typeId);
    if (filters?.disponible != null) params = params.set('disponible', String(filters.disponible));
    return this.http.get<PaginatedUnitesResponse>(this.apiUrl, { params });
  }

  getById(id: string): Observable<{ success: boolean; data: Unite }> {
    return this.http.get<{ success: boolean; data: Unite }>(`${this.apiUrl}/${id}`);
  }

  getDisponibles(
    typeId?: string, categorie?: string, sousCategorie?: string
  ): Observable<{ success: boolean; data: Unite[] }> {
    let params = new HttpParams();
    if (typeId)       params = params.set('typeId', typeId);
    if (categorie)    params = params.set('categorie', categorie);
    if (sousCategorie) params = params.set('sousCategorie', sousCategorie);
    return this.http.get<{ success: boolean; data: Unite[] }>(`${this.apiUrl}/disponibles`, { params });
  }

  getStatuts(): Observable<{ success: boolean; data: StatutOption[] }> {
    return this.http.get<{ success: boolean; data: StatutOption[] }>(`${this.apiUrl}/statuts`);
  }

  creer(payload: Unite): Observable<UniteMutationResponse> {
    return this.http.post<UniteMutationResponse>(this.apiUrl, payload);
  }

  creerMultiple(body: {
    typeId: string;
    prefixCode: string;
    debut: number;
    nombre: number;
  }): Observable<{ success: boolean; message: string; data: Unite[] }> {
    return this.http.post<{ success: boolean; message: string; data: Unite[] }>(
      `${this.apiUrl}/multi`, body
    );
  }

  modifier(id: string, payload: Unite): Observable<UniteMutationResponse> {
    return this.http.put<UniteMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  changerStatut(id: string, statut: string, note?: string): Observable<UniteMutationResponse> {
    return this.http.patch<UniteMutationResponse>(`${this.apiUrl}/${id}/statut`, { statut, note });
  }

  desactiver(id: string, note?: string): Observable<UniteMutationResponse> {
    return this.http.patch<UniteMutationResponse>(`${this.apiUrl}/${id}/desactiver`, { note });
  }

  supprimer(id: string): Observable<UniteMutationResponse> {
    return this.http.delete<UniteMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
