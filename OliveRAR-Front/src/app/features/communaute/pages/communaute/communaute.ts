import { Component, OnInit } from '@angular/core';
import { CommunauteApiService, Post } from '../../../../shared/services/communaute-api.sevice';
import { ToastService } from '../../../../shared/services/toast.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-communaute',
  templateUrl: './communaute.html',
  styleUrls: ['./communaute.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, SidebarComponent]
})
export class CommunauteComponent implements OnInit {

  private postsSubject = new BehaviorSubject<Post[]>([]);
  posts$ = this.postsSubject.asObservable();
  
  imageSelectionnee: string | null = null;
  selectedFile: File | null = null;
  userIdConnecte: string = ''; // Pour stocker l'ID de l'agriculteur actuel

  page: number = 0;
  size: number = 10;
  hasMore: boolean = true;
  isLoading: boolean = false;
  isPublishing: boolean = false;

  nouveauPost = {
    titre: '',
    contenu: ''
  };

  nouveauCommentaire: { [key: string]: string } = {};

  constructor(
    private api: CommunauteApiService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Récupération de l'ID utilisateur au chargement
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userIdConnecte = JSON.parse(userStr).id;
    }
    this.chargerPosts();
  }

  chargerPosts(reset: boolean = false): void {
    if (this.isLoading) return;
    
    if (reset) {
      this.page = 0;
      this.postsSubject.next([]);
      this.hasMore = true;
    }

    if (!this.hasMore) return;

    this.isLoading = true;
    this.api.getPosts(this.page, this.size).subscribe({
      next: (data) => {
        // data.content comes from Spring Page<Post>
        const fetchedPosts = data.content || data;
        
        if (fetchedPosts.length < this.size) {
          this.hasMore = false;
        }

        this.postsSubject.next(reset ? fetchedPosts : [...this.postsSubject.value, ...fetchedPosts]);
        this.page++;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Erreur lors du chargement des posts", err);
        this.isLoading = false;
        this.toastService.error('Erreur lors du chargement des publications');
      }
    });
  }

  chargerPlus(): void {
    this.chargerPosts(false);
  }

  /**
   * Compresse l'image côté client avant de l'envoyer au serveur
   */
  private compressImage(file: File, maxSize: number = 1024): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // fallback
            }
          }, 'image/jpeg', 0.8); // Qualité JPEG 80%
        };
      };
    });
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // 1. Afficher l'aperçu immédiatement
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.imageSelectionnee = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      // 2. Compresser le fichier en arrière-plan (réduit de ~5MB à ~200KB)
      this.selectedFile = await this.compressImage(file, 1024);
    }
  }

  annulerImage() {
    this.imageSelectionnee = null;
    this.selectedFile = null;
  }

  publier() {
    if (!this.nouveauPost.titre || !this.nouveauPost.contenu || !this.userIdConnecte) return;

    const userStr = localStorage.getItem('user');
    const userConnecte = JSON.parse(userStr!);

    const postAEnvoyer = {
      titre: this.nouveauPost.titre,
      contenu: this.nouveauPost.contenu,
      agriculteurId: this.userIdConnecte,
      agriculteurNom: userConnecte.nom + ' ' + userConnecte.prenom
    };

    const formData = new FormData();
    formData.append('post', new Blob([JSON.stringify(postAEnvoyer)], { type: 'application/json' }));
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.isPublishing = true;
    const toastId = this.toastService.loading('Publication en cours...');

    // --- MISE À JOUR OPTIMISTE (Optimistic UI) ---
    // On crée un post temporaire pour l'afficher instantanément
    const tempId = 'temp-' + Date.now();
    const tempPost: Post = {
      id: tempId,
      titre: postAEnvoyer.titre,
      contenu: postAEnvoyer.contenu,
      agriculteurId: postAEnvoyer.agriculteurId,
      agriculteurNom: postAEnvoyer.agriculteurNom,
      dateCreation: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      commentaires: [],
      imagePost: this.imageSelectionnee || undefined
    };

    // On l'ajoute directement en haut de la liste pour un effet immédiat
    this.postsSubject.next([tempPost, ...this.postsSubject.value]);
    
    // On vide le formulaire tout de suite
    this.nouveauPost = { titre: '', contenu: '' };
    this.imageSelectionnee = null;
    this.selectedFile = null;

    this.api.creerPost(formData).subscribe({
      next: (nouveauPostCree) => {
        this.isPublishing = false;
        this.toastService.update(toastId, 'Publication réussie !', 'success');
        
        // On remplace le faux post par le vrai post renvoyé par le backend
        const updatedPosts = [...this.postsSubject.value];
        const index = updatedPosts.findIndex(p => p.id === tempId);
        if (index !== -1) {
          updatedPosts[index] = nouveauPostCree;
          this.postsSubject.next(updatedPosts);
        }
      },
      error: () => {
        this.isPublishing = false;
        this.toastService.update(toastId, 'Erreur lors de la publication', 'error');
        // En cas d'erreur, on retire le faux post
        const filteredPosts = this.postsSubject.value.filter(p => p.id !== tempId);
        this.postsSubject.next(filteredPosts);
      }
    });
  }

  liker(id: string) {
    if (!this.userIdConnecte) return;
    this.api.likePost(id, this.userIdConnecte).subscribe(() => {
      const updatedPosts = [...this.postsSubject.value];
      const post = updatedPosts.find(p => p.id === id);
      if (post) {
        if (!post.likedBy) post.likedBy = [];
        if (post.likedBy.includes(this.userIdConnecte)) {
          post.likedBy = post.likedBy.filter(uid => uid !== this.userIdConnecte);
          post.likes = Math.max(0, post.likes - 1);
        } else {
          post.likedBy.push(this.userIdConnecte);
          post.likes++;
        }
        this.postsSubject.next(updatedPosts);
      }
    });
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
      const toastId = this.toastService.loading('Suppression...');
      this.api.supprimerPost(postId, this.userIdConnecte).subscribe({
        next: () => {
          this.toastService.update(toastId, 'Post supprimé', 'success');
          const filteredPosts = this.postsSubject.value.filter(p => p.id !== postId);
          this.postsSubject.next(filteredPosts);
        },
        error: () => this.toastService.update(toastId, 'Erreur de suppression', 'error')
      });
    }
  }

  commenter(postId: string) {
    const texte = this.nouveauCommentaire[postId];
    if (!texte || !this.userIdConnecte) return;

    const commentairePayload = {
      contenu: texte,
      agriculteurId: this.userIdConnecte
    };

    this.api.commenter(postId, commentairePayload).subscribe({
      next: (postMisAJour) => {
        this.nouveauCommentaire[postId] = '';
        const updatedPosts = [...this.postsSubject.value];
        const index = updatedPosts.findIndex(p => p.id === postId);
        if (index !== -1) {
          updatedPosts[index] = postMisAJour;
          this.postsSubject.next(updatedPosts);
        }
        this.toastService.success('Commentaire ajouté');
      },
      error: () => this.toastService.error('Erreur lors de l\'ajout du commentaire')
    });
  }

  supprimerCommentaire(postId: string, commentaireId: string) {
    if (confirm("Voulez-vous vraiment supprimer ce commentaire ?")) {
      this.api.supprimerCommentaire(postId, commentaireId, this.userIdConnecte).subscribe({
        next: () => {
          const updatedPosts = [...this.postsSubject.value];
          const post = updatedPosts.find(p => p.id === postId);
          if (post) {
            post.commentaires = post.commentaires.filter(c => c.id !== commentaireId);
            this.postsSubject.next(updatedPosts);
          }
          this.toastService.success('Commentaire supprimé');
        },
        error: () => this.toastService.error('Erreur de suppression du commentaire')
      });
    }
  }
}
