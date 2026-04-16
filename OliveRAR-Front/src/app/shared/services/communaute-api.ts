import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Post {
  id: string;
  titre: string;
  contenu: string;
  categorie: string;
  region: string;
  agriculteurId: string;
  nomAgriculteur: string;
  prenomAgriculteur: string;
  photoUrl?: string;
  likes: string[];
  nombreCommentaires: number;
  createdAt: string;
}

export interface Commentaire {
  id: string;
  postId: string;
  contenu: string;
  agriculteurId: string;
  nomAgriculteur: string;
  prenomAgriculteur: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommunauteApiService {
  private readonly api = 'http://localhost:8080/api/communaute';

  constructor(private http: HttpClient) {}

  getPosts(categorie?: string, region?: string): Observable<Post[]> {
    let params = new HttpParams();
    if (categorie) params = params.set('categorie', categorie);
    if (region) params = params.set('region', region);
    return this.http.get<Post[]>(`${this.api}/posts`, { params });
  }

  getPost(id: string): Observable<Post> {
    return this.http.get<Post>(`${this.api}/posts/${id}`);
  }

  creerPost(post: Partial<Post>): Observable<Post> {
    return this.http.post<Post>(`${this.api}/posts`, post);
  }

  supprimerPost(id: string): Observable<any> {
    return this.http.delete(`${this.api}/posts/${id}`);
  }

  toggleLike(postId: string): Observable<Post> {
    return this.http.post<Post>(`${this.api}/posts/${postId}/like`, {});
  }

  getCommentaires(postId: string): Observable<Commentaire[]> {
    return this.http.get<Commentaire[]>(`${this.api}/posts/${postId}/commentaires`);
  }

  ajouterCommentaire(postId: string, contenu: string): Observable<Commentaire> {
    return this.http.post<Commentaire>(
      `${this.api}/posts/${postId}/commentaires`,
      { contenu }
    );
  }

  supprimerCommentaire(id: string): Observable<any> {
    return this.http.delete(`${this.api}/commentaires/${id}`);
  }
// Ajouter dans communaute-api.ts
  modifierPost(id: string, post: Partial<Post>): Observable<Post> {
    return this.http.put<Post>(`${this.api}/posts/${id}`, post);
  }

  getMesPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.api}/mes-posts`);
  }
}
