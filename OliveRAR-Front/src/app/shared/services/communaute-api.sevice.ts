import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  imagePost?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommunauteApiService {
  private readonly apiUrl = `${API_PREFIX}/posts`;

  constructor(private readonly http: HttpClient) {}

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(this.apiUrl);
  }

  commenter(postId: string, commentaire: Partial<Commentaire>): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/${postId}/commentaires`, commentaire);
  }

  creerPost(post: Partial<Post>): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, post);
  }

  likePost(id: string): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/${id}/like`, {});
  }

  supprimerPost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
