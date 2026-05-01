import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import {
  PaginatedVergerResponse,
  Verger,
  VergerMutationResponse,
  VergerPaginationParams
} from '../models/verger.model';

export type {
  PaginatedVergerResponse,
  Verger,
  VergerMutationResponse,
  VergerPaginationParams
} from '../models/verger.model';

@Injectable({ providedIn: 'root' })
export class VergerApiService {
  private readonly apiUrl = `${API_PREFIX}/verger`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Verger[]> {
    return this.http.get<Verger[]>(this.apiUrl).pipe(
      map((vergers) => this.normalizeVergers(vergers))
    );
  }

  getByAgriculteur(agriculteurId: string): Observable<Verger[]> {
    return this.http.get<Verger[]>(`${this.apiUrl}/agriculteur/${agriculteurId}`).pipe(
      map((vergers) => this.normalizeVergers(vergers))
    );
  }

  getAllPaginated(params: VergerPaginationParams): Observable<PaginatedVergerResponse> {
    return this.http.get<PaginatedVergerResponse>(this.apiUrl, {
      params: {
        page: params.page,
        limit: params.limit
      }
    }).pipe(
      map((response) => this.normalizePaginatedResponse(response, params))
    );
  }

  getByAgriculteurPaginated(
    agriculteurId: string,
    params: VergerPaginationParams
  ): Observable<PaginatedVergerResponse> {
    return this.http.get<PaginatedVergerResponse>(`${this.apiUrl}/agriculteur/${agriculteurId}`, {
      params: {
        page: params.page,
        limit: params.limit
      }
    }).pipe(
      map((response) => this.normalizePaginatedResponse(response, params))
    );
  }

  getById(id: string): Observable<Verger> {
    return this.http.get<Verger>(`${this.apiUrl}/${id}`).pipe(
      map((verger) => this.normalizeVerger(verger))
    );
  }

  create(verger: Verger): Observable<VergerMutationResponse> {
    return this.http.post<VergerMutationResponse>(this.apiUrl, verger);
  }

  update(id: string, verger: Verger): Observable<VergerMutationResponse> {
    return this.http.put<VergerMutationResponse>(`${this.apiUrl}/${id}`, verger);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  hasValidCoordinates(verger: Pick<Verger, 'latitude' | 'longitude'> | null | undefined): boolean {
    if (!verger) {
      return false;
    }

    return this.isValidCoordinatePair(verger.latitude, verger.longitude);
  }

  private normalizeVergers(vergers: Verger[] | null | undefined): Verger[] {
    if (!Array.isArray(vergers)) {
      return [];
    }

    return vergers.map((verger) => this.normalizeVerger(verger));
  }

  private normalizeVerger(verger: Verger | null | undefined): Verger {
    return {
      id: verger?.id,
      nom: verger?.nom ?? '',
      localisation: verger?.localisation ?? '',
      statut: verger?.statut ?? '',
      typeOlive: verger?.typeOlive ?? '',
      agriculteurId: verger?.agriculteurId,
      dateAlerteMaturite: verger?.dateAlerteMaturite ?? null,
      superficie: this.toNumber(verger?.superficie),
      nombreArbres: this.toInteger(verger?.nombreArbres),
      latitude: this.toNumber(verger?.latitude),
      longitude: this.toNumber(verger?.longitude),
      rendementEstime: this.toNumber(verger?.rendementEstime)
    };
  }

  private normalizePaginatedResponse(
    response: PaginatedVergerResponse | null | undefined,
    fallback: VergerPaginationParams
  ): PaginatedVergerResponse {
    const items = this.normalizeVergers(response?.items);
    const totalItems = this.toInteger(response?.totalItems);
    const totalPages = Math.max(this.toInteger(response?.totalPages), totalItems > 0 ? 1 : 0);

    return {
      items,
      totalItems,
      totalPages,
      page: this.toInteger(response?.page) || fallback.page,
      limit: this.toInteger(response?.limit) || fallback.limit,
      hasNext: Boolean(response?.hasNext),
      hasPrevious: Boolean(response?.hasPrevious)
    };
  }

  private isValidCoordinatePair(latitude: number, longitude: number): boolean {
    return Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180
      && !(latitude === 0 && longitude === 0);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toInteger(value: unknown): number {
    return Math.trunc(this.toNumber(value));
  }
}
