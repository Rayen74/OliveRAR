import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { CommunauteApiService, Post } from '../../../shared/services/communaute-api';
import { AuthService } from '../../../auth/auth.service';
import { AgriculteurSidebarComponent } from '../agriculteur-sidebar/agriculteur-sidebar';

@Component({
  selector: 'app-communaute',
  standalone: true,
  imports: [CommonModule, FormsModule, AgriculteurSidebarComponent],
  templateUrl: './communaute.html',
  styleUrl: './communaute.css'
})
export class CommunauteComponent implements OnInit {

  posts: Post[] = [];
  loading = false;
  showForm = false;
  currentUser$!: Observable<any>;

  categories = ['MALADIE', 'METEO', 'PRIX', 'TECHNIQUE', 'MATERIEL'];
  regions = ['Tunis', 'Sfax', 'Sousse', 'Mahdia', 'Monastir', 'Nabeul', 'Bizerte'];

  filtreCategorie = '';
  filtreRegion = '';

  nouveauPost = { titre: '', contenu: '', categorie: '', region: '' };
  agriculteurId = '';

  // ✅ NOUVEAU : édition
  editingPost: Post | null = null;
  editForm = { titre: '', contenu: '', categorie: '', region: '' };

  constructor(
    private communauteApi: CommunauteApiService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUser$ = this.authService.currentUser$;

    this.currentUser$.subscribe((user: any) => {
      if (user) {
        this.agriculteurId = user.id;
      }
    });

    this.chargerPosts();
  }

  chargerPosts() {
    this.loading = true;

    this.communauteApi.getPosts(
      this.filtreCategorie || undefined,
      this.filtreRegion || undefined
    ).subscribe({
      next: (data) => {
        this.posts = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  appliquerFiltres() {
    this.chargerPosts();
  }

  ouvrirPost(id: string) {
    this.router.navigate(['/agriculteur/communaute', id]);
  }

  toggleLike(event: Event, post: Post) {
    event.stopPropagation();

    if (!this.agriculteurId) return;

    const liked = post.likes.includes(this.agriculteurId);

    if (liked) {
      post.likes = post.likes.filter(id => id !== this.agriculteurId);
    } else {
      post.likes.push(this.agriculteurId);
    }

    this.communauteApi.toggleLike(post.id).subscribe();
  }

soumettre() {
  if (!this.nouveauPost.titre || !this.nouveauPost.contenu) return;

  const user = this.authService.getConnectedUser();

  const postToSend = {
    ...this.nouveauPost,
    agriculteurId: user?.id,
    nomAgriculteur: user?.nom,
    prenomAgriculteur: user?.prenom
  };

  this.communauteApi.creerPost(postToSend).subscribe({
    next: (post) => {
      this.posts.unshift(post);
      this.showForm = false;
      this.nouveauPost = { titre: '', contenu: '', categorie: '', region: '' };
    }
  });
}

  // ✅ ===== EDIT POST =====

  startEdit(event: Event, post: Post) {
    event.stopPropagation();

    this.editingPost = post;

    this.editForm = {
      titre: post.titre,
      contenu: post.contenu,
      categorie: post.categorie,
      region: post.region
    };
  }

  sauvegarderEdit() {
    if (!this.editingPost) return;

    this.communauteApi.modifierPost(this.editingPost.id, this.editForm)
      .subscribe(updated => {

        const idx = this.posts.findIndex(p => p.id === updated.id);

        if (idx !== -1) {
          this.posts[idx] = updated;
        }

        this.editingPost = null;
      });
  }

  annulerEdit() {
    this.editingPost = null;
  }

  supprimerPost(event: Event, id: string) {
    event.stopPropagation();

    if (!confirm('Supprimer ce post ?')) return;

    this.communauteApi.supprimerPost(id).subscribe(() => {
      this.posts = this.posts.filter(p => p.id !== id);
    });
  }

  // ✅ ===== UTILS =====

  isLiked(post: Post): boolean {
    return post.likes ? post.likes.includes(this.agriculteurId) : false;
  }

  get totalLikes(): number {
    return this.posts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
  }

  get totalCommentaires(): number {
    return this.posts.reduce((acc, p) => acc + (p.nombreCommentaires || 0), 0);
  }

  trackByPost(index: number, post: Post): string {
    return post.id;
  }

  getBadgeClass(categorie: string): string {
    const map: Record<string, string> = {
      MALADIE:  'bg-red-50 text-red-700',
      METEO:    'bg-blue-50 text-blue-700',
      PRIX:     'bg-amber-50 text-amber-700',
      TECHNIQUE:'bg-green-50 text-green-700',
      MATERIEL: 'bg-purple-50 text-purple-700',
    };

    return map[categorie] ?? 'bg-earth-bg text-earth-text';
  }
}
