import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  private readonly apiUrl = `${API_PREFIX}/dashboard`;

  constructor(private readonly http: HttpClient) { }

  getCooperativeKPIs(period: string = 'month'): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cooperative`, { params: { period } });
  }
}
