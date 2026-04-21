import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import { Resource, ResourceMutationResponse } from '../models/resource.model';

@Injectable({ providedIn: 'root' })
export class ResourceApiService {
  private readonly apiUrl = `${API_PREFIX}/resources`;

  constructor(private readonly http: HttpClient) {}

  getAll(type?: string): Observable<Resource[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    return this.http.get<{ data?: Resource[] }>(this.apiUrl, { params }).pipe(
      map((response) => response.data ?? [])
    );
  }

  create(resource: Resource): Observable<ResourceMutationResponse> {
    return this.http.post<ResourceMutationResponse>(this.apiUrl, resource);
  }

  update(id: string, resource: Resource): Observable<ResourceMutationResponse> {
    return this.http.put<ResourceMutationResponse>(`${this.apiUrl}/${id}`, resource);
  }

  delete(id: string): Observable<ResourceMutationResponse> {
    return this.http.delete<ResourceMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
