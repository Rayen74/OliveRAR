import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import { Tournee } from '../models/tournee.model';

@Injectable({ providedIn: 'root' })
export class TourneeApiService {
  private readonly apiUrl = `${API_PREFIX}/tournees`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Tournee[]> {
    return this.http.get<Tournee[]>(this.apiUrl);
  }
}
