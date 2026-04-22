import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../../core/config/api.config';

export interface Commentaire {
  id?: string;
  contenu: string;
  dateCreation?: string;
  agriculteurId: string;
  agriculteurNom?: string;
  agriculteurPhoto?: string;
}

export interface Post {
  id: string;
  titre: string;
  contenu: string;
  imageUrl?: string;
  dateCreation: string;
  agriculteurId: string;
  agriculteurNom: string;
  agriculteurPhoto?: string;
  commentaires: Commentaire[];
  likes: number;
  likedBy?: string[];
  imagePost?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommunauteApiService {
  private readonly apiUrl = `${API_PREFIX}/posts`;

  constructor(private readonly http: HttpClient) {}

  getPosts(page: number = 0, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<any>(this.apiUrl, { params });
  }

  commenter(postId: string, commentaire: Partial<Commentaire>): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/${postId}/commentaires`, commentaire);
  }

  creerPost(formData: FormData): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, formData);
  }

  likePost(id: string, userId: string): Observable<Post> {
    const headers = new HttpHeaders().set('X-User-Id', userId);
    return this.http.put<Post>(`${this.apiUrl}/${id}/like`, {}, { headers });
  }

  supprimerPost(id: string, userId: string): Observable<void> {
    const headers = new HttpHeaders().set('X-User-Id', userId);
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers });
  }

  supprimerCommentaire(postId: string, commentaireId: string, userId: string): Observable<void> {
    const headers = new HttpHeaders().set('X-User-Id', userId);
    return this.http.delete<void>(`${this.apiUrl}/${postId}/commentaires/${commentaireId}`, { headers });
  }
}
