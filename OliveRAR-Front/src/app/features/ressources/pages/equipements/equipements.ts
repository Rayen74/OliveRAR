import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { ResourceApiService, Resource } from '../../services/resource-api.service';

type ResourceCategorie =
  | 'TRACTEUR' | 'BENNE' | 'CAMIONNETTE' | 'VOITURE_UTILITAIRE'
  | 'CISEAUX' | 'ESCALIER' | 'FILET_RECOLTE' | 'PANIER' | 'PEIGNE_MANUEL'
  | 'VIBRATEUR_ELECTRIQUE' | 'VIBRATEUR_THERMIQUE' | 'COMPRESSEUR' | 'SECOUEUR_BRANCHE'
  | 'GANTS' | 'CASQUE' | 'LUNETTES' | 'CHAUSSURES_SECURITE'
  | 'CAISSE' | 'SAC_OLIVE' | 'BAC_PLASTIQUE';

type ResourceStatus = 'DISPONIBLE' | 'EN_MAINTENANCE' | 'RESERVE';

interface CategorieGroup {
  label: string;
  values: ResourceCategorie[];
}

@Component({
  selector: 'app-equipements',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './equipements.html',
})
export class EquipementsComponent implements OnInit {

  resources: any[] = [];
  isLoading = false;
  isSubmitting = false;
  isDeleting = false;

  // Filtres
  filterCategorie = '';
  filterStatut = '';
  searchQuery = '';

  // Modals
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  activeResource: any = null;

  // Formulaire
  form = {
    name: '',
    code: '',
    categorie: 'PANIER' as ResourceCategorie,
    status: 'DISPONIBLE' as ResourceStatus,
    description: '',
  };
  imageFile: File | null = null;
  imagePreview: string | null = null;

  toast = { show: false, message: '', type: 'success' as 'success' | 'error' };

  readonly availableStatuses: ResourceStatus[] = [
    'DISPONIBLE', 'EN_MAINTENANCE', 'RESERVE'
  ];

  readonly categorieGroups: CategorieGroup[] = [
    {
      label: '🚛 Véhicules',
      values: ['TRACTEUR', 'BENNE', 'CAMIONNETTE', 'VOITURE_UTILITAIRE'],
    },
    {
      label: '✂️ Outils traditionnels',
      values: ['CISEAUX', 'ESCALIER', 'FILET_RECOLTE', 'PANIER', 'PEIGNE_MANUEL'],
    },
    {
      label: '⚡ Outils automatiques',
      values: ['VIBRATEUR_ELECTRIQUE', 'VIBRATEUR_THERMIQUE', 'COMPRESSEUR', 'SECOUEUR_BRANCHE'],
    },
    {
      label: '🦺 Protection / Sécurité',
      values: ['GANTS', 'CASQUE', 'LUNETTES', 'CHAUSSURES_SECURITE'],
    },
    {
      label: '📦 Stockage / Transport',
      values: ['CAISSE', 'SAC_OLIVE', 'BAC_PLASTIQUE'],
    },
  ];

  // Toutes les catégories à plat pour le filtre
  get allCategories(): ResourceCategorie[] {
    return this.categorieGroups.flatMap(g => g.values);
  }

  // Ressources filtrées
  get filtered(): any[] {
    return this.resources.filter(r => {
      const matchCat = !this.filterCategorie || r.categorie === this.filterCategorie;
      const matchStat = !this.filterStatut || r.status === this.filterStatut;
      const matchSearch = !this.searchQuery ||
        r.name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        r.code?.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCat && matchStat && matchSearch;
    });
  }

  constructor(
    private api: ResourceApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadResources();
  }

  loadResources(): void {
    this.isLoading = true;
    this.api.getAll()
      .pipe(finalize(() => { this.isLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          this.resources = res.data ?? [];
        },
        error: () => this.showToast('Erreur lors du chargement.', 'error'),
      });
  }

  // ── Modals ────────────────────────────────────────────────

  openAddModal(): void {
    this.form = {
      name: '', code: '', categorie: 'PANIER',
      status: 'DISPONIBLE', description: '',
    };
    this.imageFile = null;
    this.imagePreview = null;
    this.showAddModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(r: any): void {
    this.activeResource = r;
    this.form = {
      name: r.name ?? '',
      code: r.code ?? '',
      categorie: r.categorie ?? 'PANIER',
      status: r.status ?? 'DISPONIBLE',
      description: r.description ?? '',
    };
    this.imageFile = null;
    this.imagePreview = null;
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  openDeleteModal(r: any): void {
    this.activeResource = r;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeModals(): void {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.activeResource = null;
    this.cdr.detectChanges();
  }

  // ── CRUD ──────────────────────────────────────────────────

  submitAdd(): void {
    if (!this.form.name.trim()) {
      this.showToast('Le nom est obligatoire.', 'error'); return;
    }
    this.isSubmitting = true;

    const payload: Resource = {
      name: this.form.name,
      code: this.form.code,
      categorie: this.form.categorie,
      status: this.form.status,
      description: this.form.description,
      available: true,
    };

    this.api.create(payload)
      .pipe(finalize(() => { this.isSubmitting = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          const id = res.data?.id;
          if (id && this.imageFile) {
            this.api.uploadImage(id, this.imageFile).subscribe({
              next: () => this.loadResources(),
              error: () => this.loadResources(),
            });
          } else {
            this.loadResources();
          }
          this.showToast('Équipement ajouté avec succès.', 'success');
          this.closeModals();
        },
        error: (err: any) =>
          this.showToast(err?.error?.message ?? 'Erreur lors de l\'ajout.', 'error'),
      });
  }

  submitEdit(): void {
    if (!this.form.name.trim()) {
      this.showToast('Le nom est obligatoire.', 'error'); return;
    }
    if (!this.activeResource?.id) return;
    this.isSubmitting = true;

    const payload: Resource = {
      name: this.form.name,
      code: this.form.code,
      categorie: this.form.categorie,
      status: this.form.status,
      description: this.form.description,
      available: this.form.status === 'DISPONIBLE',
    };

    this.api.update(this.activeResource.id, payload)
      .pipe(finalize(() => { this.isSubmitting = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          const id = this.activeResource.id;
          if (this.imageFile) {
            this.api.uploadImage(id, this.imageFile).subscribe({
              next: () => this.loadResources(),
              error: () => this.loadResources(),
            });
          } else {
            this.loadResources();
          }
          this.showToast('Équipement modifié avec succès.', 'success');
          this.closeModals();
        },
        error: (err: any) =>
          this.showToast(err?.error?.message ?? 'Erreur lors de la modification.', 'error'),
      });
  }

  submitDelete(): void {
    if (!this.activeResource?.id) return;
    this.isDeleting = true;

    this.api.delete(this.activeResource.id)
      .pipe(finalize(() => { this.isDeleting = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: () => {
          this.showToast('Équipement supprimé.', 'success');
          this.closeModals();
          this.loadResources();
        },
        error: () => this.showToast('Erreur lors de la suppression.', 'error'),
      });
  }

  // ── Image ─────────────────────────────────────────────────

  onFile(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  getImage(r: any): string {
    return r.imageUrl ?? 'assets/placeholder.png';
  }

  // ── Labels ────────────────────────────────────────────────

  labelStatus(v: string): string {
    const map: Record<string, string> = {
      DISPONIBLE: 'Disponible',
      EN_MAINTENANCE: 'En maintenance',
      RESERVE: 'Réservé',
    };
    return map[v] ?? v;
  }

  statusClass(v: string): string {
    const map: Record<string, string> = {
      DISPONIBLE: 'bg-green-100 text-green-700',
      EN_MAINTENANCE: 'bg-amber-100 text-amber-700',
      RESERVE: 'bg-blue-100 text-blue-700',
    };
    return map[v] ?? 'bg-gray-100 text-gray-600';
  }

  labelCategorie(v: string): string {
    const map: Record<string, string> = {
      TRACTEUR: 'Tracteur',
      BENNE: 'Benne',
      CAMIONNETTE: 'Camionnette',
      VOITURE_UTILITAIRE: 'Voiture utilitaire',
      CISEAUX: 'Ciseaux',
      ESCALIER: 'Échelle',
      FILET_RECOLTE: 'Filet de récolte',
      PANIER: 'Panier',
      PEIGNE_MANUEL: 'Peigne manuel',
      VIBRATEUR_ELECTRIQUE: 'Vibrateur électrique',
      VIBRATEUR_THERMIQUE: 'Vibrateur thermique',
      COMPRESSEUR: 'Compresseur',
      SECOUEUR_BRANCHE: 'Secoueur de branche',
      GANTS: 'Gants',
      CASQUE: 'Casque',
      LUNETTES: 'Lunettes',
      CHAUSSURES_SECURITE: 'Chaussures de sécurité',
      CAISSE: 'Caisse',
      SAC_OLIVE: 'Sac à olives',
      BAC_PLASTIQUE: 'Bac plastique',
    };
    return map[v] ?? v;
  }

  groupLabel(categorie: string): string {
    for (const g of this.categorieGroups) {
      if ((g.values as string[]).includes(categorie)) return g.label;
    }
    return '';
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { show: true, message, type };
    this.cdr.detectChanges();
    setTimeout(() => { this.toast.show = false; this.cdr.detectChanges(); }, 3500);
  }
}
