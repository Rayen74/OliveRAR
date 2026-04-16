import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CommunauteApiService, Post, Commentaire } from '../../../../shared/services/communaute-api';
import { AuthService } from '../../../../auth/auth.service';
import { AgriculteurSidebarComponent } from '../../agriculteur-sidebar/agriculteur-sidebar';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgriculteurSidebarComponent
  ],
  templateUrl: './post-detail.html',
  styleUrls: ['./post-detail.css']
})
export class PostDetailComponent implements OnInit {

  post: Post | null = null;
  commentaires: Commentaire[] = [];
  nouveauCommentaire = '';
  agriculteurId = '';

  constructor(
    private route: ActivatedRoute,
    private communauteApi: CommunauteApiService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = this.authService.getConnectedUser();
    if (user?.id) {
      this.agriculteurId = user.id;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.charger(id);
    }
  }

  // =============================
  // Charger post + commentaires
  // =============================
  charger(id: string): void {
    this.communauteApi.getPost(id).subscribe((p: Post) => {
      this.post = p;
    });

    this.communauteApi.getCommentaires(id).subscribe((c: Commentaire[]) => {
      this.commentaires = c;
    });
  }

  // =============================
  // Ajouter commentaire
  // =============================
  commenter(): void {
    if (!this.nouveauCommentaire.trim() || !this.post) return;

    this.communauteApi
      .ajouterCommentaire(this.post.id, this.nouveauCommentaire)
      .subscribe((c: Commentaire) => {
        this.commentaires.push(c);

        if (this.post) {
          this.post.nombreCommentaires++;
        }

        this.nouveauCommentaire = '';
      });
  }

  // =============================
  // Supprimer commentaire
  // =============================
  supprimerCommentaire(id: string): void {
    this.communauteApi.supprimerCommentaire(id).subscribe(() => {
      this.commentaires = this.commentaires.filter(c => c.id !== id);

      if (this.post && this.post.nombreCommentaires > 0) {
        this.post.nombreCommentaires--;
      }
    });
  }

  isMonCommentaire(c: Commentaire): boolean {
    return c.agriculteurId === this.agriculteurId;
  }

  // =============================
  // Like / Unlike
  // =============================
  toggleLike(): void {
    if (!this.post) return;

    this.communauteApi.toggleLike(this.post.id).subscribe((updated: Post) => {
      this.post = updated;
    });
  }

  isLiked(): boolean {
    return this.post?.likes?.includes(this.agriculteurId) ?? false;
  }

  // =============================
  // Badge catégorie
  // =============================
  getBadgeClass(categorie: string): string {
    const map: Record<string, string> = {
      MALADIE: 'bg-red-50 text-red-700',
      METEO: 'bg-blue-50 text-blue-700',
      PRIX: 'bg-amber-50 text-amber-700',
      TECHNIQUE: 'bg-green-50 text-green-700',
      MATERIEL: 'bg-purple-50 text-purple-700',
    };

    return map[categorie] ?? 'bg-gray-100 text-gray-600';
  }

  // =============================
  // Retour
  // =============================
  retour(): void {
    window.history.back();
  }
}
