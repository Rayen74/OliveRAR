import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

interface ReverseGeocodingResponse {
  display_name?: string;
}

@Injectable({ providedIn: 'root' })
export class ReverseGeocodingService {
  private readonly apiUrl = 'https://nominatim.openstreetmap.org/reverse';

  constructor(private readonly http: HttpClient) {}

  reverse(latitude: number, longitude: number): Observable<string> {
    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('lat', latitude.toString())
      .set('lon', longitude.toString())
      .set('zoom', '18')
      .set('addressdetails', '1')
      .set('accept-language', 'fr');

    return this.http.get<ReverseGeocodingResponse>(this.apiUrl, { params }).pipe(
      map((response) => response.display_name?.trim() || '')
    );
  }
}
