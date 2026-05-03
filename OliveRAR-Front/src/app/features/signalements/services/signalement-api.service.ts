import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import { Signalement } from '../models/signalement.model';

@Injectable({ providedIn: 'root' })
export class SignalementApiService {
  private readonly apiUrl = `${API_PREFIX}/signalements`;

  constructor(private readonly http: HttpClient) {}

  getMine(): Observable<Signalement[]> {
    return this.http.get<{ data?: Signalement[] }>(`${this.apiUrl}/mine`).pipe(
      map((response) => response.data ?? [])
    );
  }

  create(payload: Signalement): Observable<{ success: boolean; data: Signalement }> {
    return this.http.post<{ success: boolean; data: Signalement }>(this.apiUrl, payload);
  }

  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, null, { params: { status } });
  }
}
