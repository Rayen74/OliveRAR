import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import { VergerIssue } from '../models/verger-issue.model';
import { ApiResponse } from '../../../shared/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class VergerIssueService {
  private readonly apiUrl = `${API_PREFIX}/verger-issues`;

  constructor(private http: HttpClient) {}

  getAll(filters: { vergerId?: string; statut?: string; type?: string; gravite?: string } = {}): Observable<VergerIssue[]> {
    let params = new HttpParams();
    if (filters.vergerId) params = params.set('vergerId', filters.vergerId);
    if (filters.statut) params = params.set('statut', filters.statut);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.gravite) params = params.set('gravite', filters.gravite);

    return this.http.get<VergerIssue[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<VergerIssue> {
    return this.http.get<VergerIssue>(`${this.apiUrl}/${id}`);
  }

  create(issue: VergerIssue): Observable<ApiResponse<VergerIssue>> {
    return this.http.post<ApiResponse<VergerIssue>>(this.apiUrl, issue);
  }

  update(id: string, issue: VergerIssue): Observable<ApiResponse<VergerIssue>> {
    return this.http.put<ApiResponse<VergerIssue>>(`${this.apiUrl}/${id}`, issue);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
