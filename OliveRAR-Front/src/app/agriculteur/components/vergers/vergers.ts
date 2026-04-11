import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { AgriculteurSidebarComponent } from '../agriculteur-sidebar/agriculteur-sidebar';

interface Verger {
  id?: string;
  nom: string;
  localisation: string;
  statut: string;
  superficie: number;
  nombreArbres: number;
  typeOlive: string;
  latitude: number;
  longitude: number;
  rendementEstime: number;
  agriculteurId?: string;
}

@Component({
  selector: 'app-vergers',
  standalone: true,
  imports: [CommonModule, FormsModule, AgriculteurSidebarComponent],
  templateUrl: './vergers.html'
})
export class VergersComponent implements OnInit {
  vergers: Verger[] = [];
  loading = false;
  error = '';
  user: any;

  showModal = false;
  isEditing = false;
  isSaving = false;
  currentVerger: Verger = this.emptyVerger();

  showDeleteModal = false;
  vergerToDelete: Verger | null = null;

  private apiUrl = 'http://localhost:8080/api/verger';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.user = this.authService.getConnectedUser();
    if (this.user?.id) {
      this.loadVergers();
    } else {
      this.error = 'Utilisateur non connecté.';
    }
  }

  emptyVerger(): Verger {
    return {
      nom: '', localisation: '', statut: 'EN_CROISSANCE',
      superficie: 0, nombreArbres: 0, typeOlive: 'Chemlali',
      latitude: 0, longitude: 0, rendementEstime: 0
    };
  }

  loadVergers() {
    this.loading = true;
    this.error = '';
    this.http.get<any>(`${this.apiUrl}/agriculteur/${this.user?.id}`).subscribe({
      next: (data) => {
        this.vergers = Array.isArray(data) ? data : (data?.data || []);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Erreur chargement: ' + (err?.error?.message || err?.status);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreate() {
    this.currentVerger = this.emptyVerger();
    this.isEditing = false;
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(verger: Verger) {
    this.currentVerger = { ...verger };
    this.isEditing = true;
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showModal = false;
    this.error = '';
    this.cdr.detectChanges();
  }

  save() {
    if (!this.currentVerger.nom || !this.currentVerger.localisation) {
      this.error = 'Nom et localisation sont obligatoires.';
      return;
    }
    this.isSaving = true;
    this.error = '';
    this.currentVerger.agriculteurId = this.user?.id;

    const request = this.isEditing
      ? this.http.put<any>(`${this.apiUrl}/${this.currentVerger.id}`, this.currentVerger)
      : this.http.post<any>(this.apiUrl, this.currentVerger);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.showModal = false;
        this.cdr.detectChanges();
        this.loadVergers();
      },
      error: (err) => {
        this.isSaving = false;
        this.error = err?.error?.message || 'Erreur sauvegarde.';
        this.cdr.detectChanges();
      }
    });
  }

  confirmDelete(verger: Verger) {
    this.vergerToDelete = verger;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  deleteVerger() {
    if (!this.vergerToDelete?.id) return;
    this.http.delete<any>(`${this.apiUrl}/${this.vergerToDelete.id}`).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.vergerToDelete = null;
        this.cdr.detectChanges();
        this.loadVergers();
      },
      error: () => {
        this.error = 'Erreur suppression.';
        this.showDeleteModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatutLabel(statut: string): string {
    const map: any = {
      'EN_CROISSANCE': 'En croissance',
      'PRET_POUR_RECOLTE': 'Prêt pour récolte',
      'TERMINE': 'Terminé'
    };
    return map[statut] || statut;
  }

  getStatutClass(statut: string): string {
    const map: any = {
      'EN_CROISSANCE': 'bg-blue-50 text-blue-700',
      'PRET_POUR_RECOLTE': 'bg-olive-50 text-olive-700',
      'TERMINE': 'bg-gray-100 text-gray-500'
    };
    return map[statut] || 'bg-gray-100 text-gray-500';
  }
}
