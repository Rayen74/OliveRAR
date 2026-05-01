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
}
