import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { finalize, take } from 'rxjs/operators';

import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { TourneeApiService, Tournee, TourneeCollecte } from '../../services/tournee-api.service';
import { ResourceApiService } from '../../../ressources/services/resource-api.service';

// Catégories véhicules selon le nouveau backend
const VEHICULE_CATEGORIES = [
  'TRACTEUR', 'BENNE', 'CAMIONNETTE', 'VOITURE_UTILITAIRE'
];

@Component({
  selector: 'app-tournees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './tournees.html',
  styleUrl: './tournees.css',
})
export class TourneesComponent implements OnInit {

  readonly Math = Math;

  tournees: Tournee[] = [];
  isLoading = false;
  error = '';

  // Pagination locale
  currentPage = 0;
  pageSize = 6;
  filterStatut = '';

  // Modals
  showCreateModal = false;
  showEditModal = false;
  showDeleteConfirm = false;
  isEditMode = false;
  editId: string | null = null;
  isSubmitting = false;
  tourneeToDelete: Tournee | null = null;
  isDeleting = false;

  form = {
    datePrevue: '',
    collecteIds: [] as string[],
    resourcesIds: [] as string[],   // ✅ unifié
    agentIds: [] as string[],
    status: 'PLANIFIEE',
  };

  collectesDuJour: TourneeCollecte[] = [];
  isLoadingCollectes = false;
  allResources: any[] = [];

  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  readonly statuts = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

  // ── Getters ressources ────────────────────────────────────

  get vehicules(): any[] {
    return this.allResources.filter(
      r => VEHICULE_CATEGORIES.includes(r.categorie) && r.status === 'DISPONIBLE'
    );
  }

  get materiels(): any[] {
    return this.allResources.filter(
      r => !VEHICULE_CATEGORIES.includes(r.categorie) && r.status === 'DISPONIBLE'
    );
  }

  // ── Getters pagination ────────────────────────────────────

  get filteredTournees(): Tournee[] {
    return this.filterStatut
      ? this.tournees.filter(t => t.status === this.filterStatut)
      : this.tournees;
  }

  get filteredTotal(): number {
    return this.filteredTournees.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTotal / this.pageSize));
  }

  get paginatedTournees(): Tournee[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredTournees.slice(start, start + this.pageSize);
  }

  constructor(
    private tourneeApi: TourneeApiService,
    private resourceApi: ResourceApiService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadResources();
    this.loadTournees();

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['date']) {
        this.form.datePrevue = params['date'];
        this.openCreateModal();
        this.onDateChange();
      }
    });
  }

  // ── Chargement ────────────────────────────────────────────

// tournees.component.ts
loadTournees(): void {
  this.isLoading = true;
  this.error = '';
  this.tourneeApi
    .getMyTournees()
    .pipe(finalize(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (res: any) => {
        // ✅ On s'assure que res.data contient bien les objets enrichis
        this.tournees = res.data ?? [];
        console.log('Tournées enrichies chargées :', this.tournees);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[tournees]', err);
        this.error = 'Impossible de charger les tournées.';
      },
    });
}

  private loadResources(): void {
    this.resourceApi.getAll().pipe(take(1)).subscribe({
      next: (res: any) => {
        this.allResources = res.data ?? [];  // ✅ toutes, pas seulement DISPONIBLE
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ── Pagination ────────────────────────────────────────────

  onFilterChange(): void {
    this.currentPage = 0;
    this.cdr.detectChanges();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  // ── Modal création ────────────────────────────────────────

  openCreateModal(): void {
    this.isEditMode = false;
    this.editId = null;
    this.form = {
      datePrevue: '',
      collecteIds: [],
      resourcesIds: [],
      agentIds: [],
      status: 'PLANIFIEE',
    };
    this.collectesDuJour = [];
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  // ── Modal modification ────────────────────────────────────

  openEditModal(t: Tournee): void {
    this.isEditMode = true;
    this.editId = t.id ?? null;
    this.form = {
      datePrevue: t.datePrevue ?? '',
      collecteIds: [...(t.collecteIds ?? [])],
      resourcesIds: [...(t.resourcesIds ?? [])],
      agentIds: [...(t.agentIds ?? [])],
      status: t.status ?? 'PLANIFIEE',
    };
    this.collectesDuJour = [];
    this.showEditModal = true;
    if (this.form.datePrevue) this.onDateChange();
    this.cdr.detectChanges();
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.isEditMode = false;
    this.editId = null;
    this.collectesDuJour = [];
    this.cdr.detectChanges();
  }

  // ── Collectes par date ────────────────────────────────────
onDateChange(): void {
  if (!this.form.datePrevue) { this.collectesDuJour = []; return; }
  this.isLoadingCollectes = true;
  if (!this.isEditMode) this.form.collecteIds = [];

  this.tourneeApi
    .getCollectesByDate(this.form.datePrevue)
    .pipe(finalize(() => { this.isLoadingCollectes = false; this.cdr.detectChanges(); }))
    .subscribe({
      next: (res: any) => {
        this.collectesDuJour = res.data ?? [];
        // 🔍 AJOUTE CECI POUR TESTER
        console.log('Collectes reçues pour le modal :', this.collectesDuJour);
      },
      error: (err: any) => {
        console.error('[by-date]', err);
        this.collectesDuJour = [];
      },
    });
}

  // ── Toggle sélections ─────────────────────────────────────

  toggleCollecte(id: string): void {
    const idx = this.form.collecteIds.indexOf(id);
    if (idx >= 0) this.form.collecteIds.splice(idx, 1);
    else this.form.collecteIds.push(id);
  }

  isCollecteSelected(id: string): boolean {
    return this.form.collecteIds.includes(id);
  }

  toggleResource(id: string): void {
    const idx = this.form.resourcesIds.indexOf(id);
    if (idx >= 0) this.form.resourcesIds.splice(idx, 1);
    else this.form.resourcesIds.push(id);
  }

  isResourceSelected(id: string): boolean {
    return this.form.resourcesIds.includes(id);
  }

  // ── Soumission ────────────────────────────────────────────

  submitForm(): void {
    if (!this.form.datePrevue) {
      this.showToast('La date est obligatoire.', 'error'); return;
    }
    if (this.form.collecteIds.length < 2) {
      this.showToast('Sélectionnez au moins 2 collectes.', 'error'); return;
    }

    const payload: Tournee = {
      datePrevue: this.form.datePrevue,
      collecteIds: this.form.collecteIds,
      resourcesIds: this.form.resourcesIds,
      agentIds: this.form.agentIds,
      status: this.form.status,
    };

    this.isSubmitting = true;
    const request$ = this.isEditMode && this.editId
      ? this.tourneeApi.update(this.editId, payload)
      : this.tourneeApi.create(payload);

    request$
      .pipe(finalize(() => { this.isSubmitting = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          if (res?.success === false) {
            this.showToast(res?.message ?? 'Erreur serveur.', 'error'); return;
          }
          this.showToast(
            this.isEditMode ? 'Tournée modifiée.' : 'Tournée créée.',
            'success'
          );
          this.closeModals();
          this.loadTournees();
        },
        error: (err: any) =>
          this.showToast(err?.error?.message ?? 'Erreur lors de la sauvegarde.', 'error'),
      });
  }

  // ── Suppression ───────────────────────────────────────────

  confirmDelete(t: Tournee): void {
    this.tourneeToDelete = t;
    this.showDeleteConfirm = true;
    this.cdr.detectChanges();
  }

  cancelDelete(): void {
    this.tourneeToDelete = null;
    this.showDeleteConfirm = false;
    this.cdr.detectChanges();
  }

  executeDelete(): void {
    if (!this.tourneeToDelete?.id) return;
    this.isDeleting = true;
    this.tourneeApi
      .delete(this.tourneeToDelete.id)
      .pipe(finalize(() => { this.isDeleting = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          this.showToast(res?.message ?? 'Tournée supprimée.', 'success');
          this.cancelDelete();
          this.loadTournees();
        },
        error: () => this.showToast('Erreur lors de la suppression.', 'error'),
      });
  }
// Configuration des groupes affichés
groupesRessources = [
  {
    label: 'Véhicules',
    categories: ['TRACTEUR', 'BENNE', 'CAMIONNETTE', 'VOITURE_UTILITAIRE']
  },
  {
    label: 'Outils traditionnels',
    categories: ['CISEAUX', 'ESCALIER', 'FILET_RECOLTE', 'PANIER', 'PEIGNE_MANUEL']
  },
  {
    label: 'Outils automatiques',
    categories: ['VIBRATEUR_ELECTRIQUE', 'VIBRATEUR_THERMIQUE', 'COMPRESSEUR', 'SECOUEUR_BRANCHE']
  },
  {
    label: 'Protection',
    categories: ['GANTS', 'CASQUE', 'LUNETTES', 'CHAUSSURES_SECURITE']
  },
  {
    label: 'Stockage',
    categories: ['CAISSE', 'SAC_OLIVE', 'BAC_PLASTIQUE']
  }
];

// Filtrer les ressources d’un groupe
ressourcesParGroupe(categories: string[]): any[] {
  return this.allResources.filter(r => categories.includes(r.categorie));
}


isReserve(r: any): boolean {
  return r.status === 'RESERVE';
}

// En mode édition, une ressource déjà dans la tournée
// doit être sélectionnable même si RESERVE
canSelect(r: any): boolean {
  return r.status === 'DISPONIBLE' || this.isResourceSelected(r.id);
}
  // ── Helpers ───────────────────────────────────────────────

  resourceName(id: string): string {
    return this.allResources.find(r => r.id === id)?.name ?? id;
  }

  isVehicule(r: any): boolean {
    return VEHICULE_CATEGORIES.includes(r.categorie);
  }

  formatStatut(s: string): string {
    const labels: Record<string, string> = {
      PLANIFIEE: 'Planifiée', EN_COURS: 'En cours',
      TERMINEE: 'Terminée', ANNULEE: 'Annulée',
    };
    return labels[s] || s;
  }

  statutClass(s: string): string {
    const classes: Record<string, string> = {
      PLANIFIEE: 'badge-planifiee', EN_COURS: 'badge-encours',
      TERMINEE: 'badge-terminee', ANNULEE: 'badge-annulee',
    };
    return classes[s] || '';
  }

  labelCategorie(v: string): string {
    const map: Record<string, string> = {
      TRACTEUR: 'Tracteur', BENNE: 'Benne',
      CAMIONNETTE: 'Camionnette', VOITURE_UTILITAIRE: 'Voiture utilitaire',
      CISEAUX: 'Ciseaux', ESCALIER: 'Échelle',
      FILET_RECOLTE: 'Filet de récolte', PANIER: 'Panier',
      PEIGNE_MANUEL: 'Peigne manuel',
      VIBRATEUR_ELECTRIQUE: 'Vibrateur électrique',
      VIBRATEUR_THERMIQUE: 'Vibrateur thermique',
      COMPRESSEUR: 'Compresseur', SECOUEUR_BRANCHE: 'Secoueur de branche',
      GANTS: 'Gants', CASQUE: 'Casque', LUNETTES: 'Lunettes',
      CHAUSSURES_SECURITE: 'Chaussures de sécurité',
      CAISSE: 'Caisse', SAC_OLIVE: 'Sac à olives', BAC_PLASTIQUE: 'Bac plastique',
    };
    return map[v] ?? v;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();
    setTimeout(() => { this.toast.show = false; this.cdr.detectChanges(); }, 3500);
  }
}
