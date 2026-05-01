import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../core/config/api.config';

export interface AlertItem {
  id: string;
  type: string;
  description: string;
  vergerId: string;
  nomVerger: string;
  localisationVerger: string;
  rendementEstime: number;
  typeOlive: string;
  nombreArbres: number;
  superficie: number;
  agriculteurId: string;
  nomAgriculteur: string;
  prenomAgriculteur: string;
  destinataireRole: string;
  lu: boolean;
  createdAt: string;
}

export interface AlertMutationResponse {
  success: boolean;
  data: AlertItem;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AlertApiService {
  private readonly apiUrl = `${API_PREFIX}/alerts`;

  constructor(private readonly http: HttpClient) {}

  getByRole(role: string): Observable<AlertItem[]> {
    return this.http.get<AlertItem[]>(`${this.apiUrl}/role/${role}`);
  }

  markAsRead(id: string): Observable<AlertMutationResponse> {
    return this.http.patch<AlertMutationResponse>(`${this.apiUrl}/${id}/lu`, {});
  }
}
