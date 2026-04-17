import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface pour correspondre à votre entité MongoDB
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
  // CRITIQUE : Déclaration de la variable apiUrl manquante
  private apiUrl = 'http://localhost:8080/api/posts';

  constructor(private http: HttpClient) {}

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(this.apiUrl);
  }

  // Accepte maintenant l'objet commentaire complet
  commenter(postId: string, commentaire: any): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/${postId}/commentaires`, commentaire);
  }

  creerPost(post: any): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, post);
  }

  likePost(id: string): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/${id}/like`, {});
  }

  supprimerPost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
