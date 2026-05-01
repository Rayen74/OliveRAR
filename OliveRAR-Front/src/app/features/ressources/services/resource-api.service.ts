import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';

export interface Resource {
  id?: string;
  name: string;
  categorie: string; // Mis à jour pour correspondre au Java
  available: boolean;
  status?: string;
  code?: string;
  description?: string;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ResourceApiService {

  private readonly apiUrl = `${API_PREFIX}/resources`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  // Correction : Utilisation de this.apiUrl
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categories`);
  }

  // Correction : Utilisation de this.apiUrl
  getStatuses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statuses`);
  }

  create(resource: Resource): Observable<any> {
    return this.http.post<any>(this.apiUrl, resource);
  }

  update(id: string, resource: Resource): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, resource);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  uploadImage(id: string, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/${id}/image`, form);
  }
}
