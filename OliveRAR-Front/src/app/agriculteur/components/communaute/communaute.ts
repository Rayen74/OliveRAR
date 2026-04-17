import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommunauteApiService, Post } from '../../../shared/services/communaute-api.sevice';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AgriculteurSidebarComponent } from '../agriculteur-sidebar/agriculteur-sidebar';

@Component({
  selector: 'app-communaute',
  templateUrl: './communaute.html',
  styleUrls: ['./communaute.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, AgriculteurSidebarComponent]
})
export class CommunauteComponent implements OnInit {

  posts: Post[] = [];
  imageSelectionnee: string | null = null;
  userIdConnecte: string = ''; // Pour stocker l'ID de l'agriculteur actuel

  nouveauPost = {
    titre: '',
    contenu: ''
  };

  nouveauCommentaire: { [key: string]: string } = {};

  constructor(
    private api: CommunauteApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Récupération de l'ID utilisateur au chargement
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userIdConnecte = JSON.parse(userStr).id;
    }
    this.chargerPosts();
  }

  chargerPosts() {
    this.api.getPosts().subscribe({
      next: (data) => {
        this.posts = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Erreur lors du chargement des posts", err)
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageSelectionnee = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  annulerImage() {
    this.imageSelectionnee = null;
  }

  publier() {
    if (!this.nouveauPost.titre || !this.nouveauPost.contenu || !this.userIdConnecte) return;

    const userStr = localStorage.getItem('user');
    const userConnecte = JSON.parse(userStr!);

    const postAEnvoyer = {
      ...this.nouveauPost,
      agriculteurId: this.userIdConnecte,
      agriculteurNom: userConnecte.nom + ' ' + userConnecte.prenom,
      imagePost: this.imageSelectionnee
    };

    this.api.creerPost(postAEnvoyer).subscribe(() => {
      this.nouveauPost = { titre: '', contenu: '' };
      this.imageSelectionnee = null;
      this.chargerPosts();
    });
  }

  liker(id: string) {
    this.api.likePost(id).subscribe(() => this.chargerPosts());
  }

  /**
   * Suppression sécurisée : On vérifie l'ID avant d'appeler l'API
   */
  supprimer(postId: string, agriculteurIdDuPost: string) {
    if (this.userIdConnecte !== agriculteurIdDuPost) {
      alert("Vous n'êtes pas autorisé à supprimer cette publication.");
      return;
    }

    if (confirm("Voulez-vous vraiment supprimer ce post ?")) {
      this.api.supprimerPost(postId).subscribe(() => this.chargerPosts());
    }
  }

  commenter(postId: string) {
    const texte = this.nouveauCommentaire[postId];
    if (!texte || !this.userIdConnecte) return;

    const commentairePayload = {
      contenu: texte,
      agriculteurId: this.userIdConnecte
    };

    this.api.commenter(postId, commentairePayload).subscribe(() => {
      this.nouveauCommentaire[postId] = '';
      this.chargerPosts();
    });
  }
}
