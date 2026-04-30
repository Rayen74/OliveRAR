import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import { ActiviteFilters, ActivitePaginatedResponse } from '../models/activite.model';

@Injectable({ providedIn: 'root' })
export class ActiviteService {
  private readonly apiUrl = `${API_PREFIX}/activites`;

  constructor(private readonly http: HttpClient) {}

  getActivites(filters: ActiviteFilters): Observable<ActivitePaginatedResponse> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('size', filters.size);

    if (filters.module && filters.module.trim() !== '')  params = params.set('module',  filters.module);
    if (filters.type && filters.type.trim() !== '')    params = params.set('type',    filters.type);
    if (filters.debut && filters.debut.trim() !== '')   params = params.set('debut',   filters.debut);
    if (filters.fin && filters.fin.trim() !== '')     params = params.set('fin',     filters.fin);

    return this.http.get<ActivitePaginatedResponse>(this.apiUrl, { params });
  }
}
