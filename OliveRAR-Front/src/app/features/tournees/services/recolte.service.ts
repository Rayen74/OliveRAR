import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../../core/config/api.config';
import { Recolte } from '../models/recolte.model';

@Injectable({
  providedIn: 'root'
})
export class RecolteService {
  private readonly apiUrl = `${API_PREFIX}/recoltes`;

  constructor(private http: HttpClient) {}

  save(recolte: Recolte): Observable<Recolte> {
    return this.http.post<Recolte>(this.apiUrl, recolte);
  }

  getByTourId(tourId: string): Observable<Recolte> {
    return this.http.get<Recolte>(`${this.apiUrl}/tour/${tourId}`);
  }

  downloadReport(tourId: string): void {
    const url = `${this.apiUrl}/tour/${tourId}/report`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `rapport_recolte_${tourId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement du rapport', err);
      }
    });
  }
}
