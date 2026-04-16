import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ✅ Interface Commentaire
export interface Commentaire {
  id: string;
  contenu: string;
  agriculteurNom: string;
  dateCreation: string;
}

// ✅ Interface Post
export interface Post {
  id: string;
  titre: string;
  contenu: string;
  imageUrl?: string;
  dateCreation: string;
  likes: number;
  commentaires: Commentaire[];
}

@Injectable({
  providedIn: 'root'
})
export class CommunauteApiService {

  private readonly api = 'http://localhost:8080/api/posts';

  constructor(private http: HttpClient) {}

  // ✅ GET POSTS
  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(this.api);
  }

  // ✅ CREATE POST
  creerPost(post: Partial<Post>): Observable<Post> {
    return this.http.post<Post>(this.api, post);
  }

  // ✅ DELETE POST
  supprimerPost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // ✅ LIKE POST
  likePost(id: string): Observable<Post> {
    return this.http.put<Post>(`${this.api}/${id}/like`, {});
  }

  // ✅ COMMENTER
  commenter(postId: string, contenu: string): Observable<Post> {
    return this.http.post<Post>(
      `${this.api}/${postId}/commentaires`,
      { contenu }
    );
  }
}
