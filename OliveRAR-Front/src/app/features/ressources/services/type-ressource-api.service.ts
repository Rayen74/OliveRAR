import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import {
  CategorieOption,
  PaginatedTypeRessourcesResponse,
  TypeRessource,
  TypeRessourceMutationResponse
} from '../models/logistique.model';

@Injectable({ providedIn: 'root' })
export class TypeRessourceApiService {
  private readonly apiUrl = `${API_PREFIX}/types-ressources`;

  constructor(private readonly http: HttpClient) {}

  getAll(
    page = 0,
    size = 6,
    filters?: { search?: string; categorie?: string; sousCategorie?: string; actif?: boolean }
  ): Observable<PaginatedTypeRessourcesResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters?.categorie)      params = params.set('categorie', filters.categorie);
    if (filters?.sousCategorie)  params = params.set('sousCategorie', filters.sousCategorie);
    if (filters?.actif != null)  params = params.set('actif', String(filters.actif));
    return this.http.get<PaginatedTypeRessourcesResponse>(this.apiUrl, { params });
  }

  getById(id: string): Observable<{ success: boolean; data: TypeRessource }> {
    return this.http.get<{ success: boolean; data: TypeRessource }>(`${this.apiUrl}/${id}`);
  }

  getActifs(categorie?: string, sousCategorie?: string): Observable<{ success: boolean; data: TypeRessource[] }> {
    let params = new HttpParams();
    if (categorie)     params = params.set('categorie', categorie);
    if (sousCategorie) params = params.set('sousCategorie', sousCategorie);
    return this.http.get<{ success: boolean; data: TypeRessource[] }>(`${this.apiUrl}/actifs`, { params });
  }

  getCategories(): Observable<{ success: boolean; data: CategorieOption[] }> {
    return this.http.get<{ success: boolean; data: CategorieOption[] }>(`${this.apiUrl}/categories`);
  }

  create(payload: TypeRessource): Observable<TypeRessourceMutationResponse> {
    return this.http.post<TypeRessourceMutationResponse>(this.apiUrl, payload);
  }

  update(id: string, payload: TypeRessource): Observable<TypeRessourceMutationResponse> {
    return this.http.put<TypeRessourceMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  desactiver(id: string): Observable<TypeRessourceMutationResponse> {
    return this.http.patch<TypeRessourceMutationResponse>(`${this.apiUrl}/${id}/desactiver`, {});
  }

  supprimer(id: string): Observable<TypeRessourceMutationResponse> {
    return this.http.delete<TypeRessourceMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
