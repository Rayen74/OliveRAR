import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap, take, tap } from 'rxjs/operators';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import {
  CategorieOption,
  PaginatedTypeRessourcesResponse,
  RessourceCategorie,
  SOUS_CATEGORIES,
  TypeRessource
} from '../../models/logistique.model';
import { TypeRessourceApiService } from '../../services/type-ressource-api.service';

@Component({
  selector: 'app-types-ressources',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './types-ressources.html'
})
export class TypesRessourcesComponent implements OnInit {

  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  typesData$: Observable<PaginatedTypeRessourcesResponse> | undefined;

  isLoading = false;
  isSubmitting = false;
  showForm = false;
  isDeleteModalOpen = false;
  isDesactiverModalOpen = false;
  editingId: string | null = null;
  targetType: TypeRessource | null = null;
  error = '';
  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  currentPage = 0;
  pageSize = 6;
  totalPages = 1;
  totalElements = 0;

  categories: CategorieOption[] = [];
  readonly sousCategories = [...SOUS_CATEGORIES];

  filterForm: FormGroup;
  typeForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly typeRessourceApi: TypeRessourceApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      categorie: [''],
      sousCategorie: [''],
      actif: ['']
    });

    this.typeForm = this.fb.group({
      nom: [''],
      categorie: ['MATERIEL_ROULANT' as RessourceCategorie],
      sousCategorie: [''],
      description: [''],
      capaciteValeur: [null],
      capaciteUnite: [''],
      actif: [true]
    });
  }

  ngOnInit(): void {
    // Charger les catégories pour les dropdowns
    this.typeRessourceApi.getCategories().pipe(take(1)).subscribe({
      next: (res) => this.categories = res.data ?? [],
      error: () => this.categories = []
    });

    this.typesData$ = this.refreshTrigger$.pipe(
      tap(() => { this.isLoading = true; this.error = ''; }),
      switchMap(() => {
        const f = this.filterForm.getRawValue();
        return this.typeRessourceApi.getAll(this.currentPage, this.pageSize, {
          search: f.search,
          categorie: f.categorie,
          sousCategorie: f.sousCategorie,
          actif: f.actif === '' ? undefined : f.actif === 'true'
        }).pipe(
          catchError(() => {
            this.error = 'Impossible de charger les types de ressources.';
            return of({
              success: false, items: [], page: 0,
              size: this.pageSize, totalElements: 0, totalPages: 1
            } as PaginatedTypeRessourcesResponse);
          })
        );
      }),
      tap((res) => {
        this.totalElements = res.totalElements ?? 0;
        this.totalPages = Math.max(1, res.totalPages ?? 1);
        this.isLoading = false;
      })
    );
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.refreshTrigger$.next();
  }

  openCreateForm(): void {
    this.editingId = null;
    this.typeForm.reset({
      nom: '', categorie: 'MATERIEL_ROULANT', sousCategorie: '',
      description: '', capaciteValeur: null, capaciteUnite: '', actif: true
    });
    this.showForm = true;
  }

  startEdit(type: TypeRessource): void {
    this.editingId = type.id ?? null;
    this.typeForm.patchValue({
      nom: type.nom,
      categorie: type.categorie,
      sousCategorie: type.sousCategorie ?? '',
      description: type.description ?? '',
      capaciteValeur: type.capacite?.valeur ?? null,
      capaciteUnite: type.capacite?.unite ?? '',
      actif: type.actif
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  submitForm(): void {
    const raw = this.typeForm.getRawValue();
    if (!raw.nom?.trim()) {
      this.showToast('Le nom est obligatoire.', 'error');
      return;
    }

    const payload: TypeRessource = {
      nom: raw.nom.trim(),
      categorie: raw.categorie,
      sousCategorie: raw.sousCategorie?.trim() || undefined,
      description: raw.description?.trim() || undefined,
      capacite: raw.capaciteValeur != null
        ? { valeur: Number(raw.capaciteValeur), unite: raw.capaciteUnite || undefined }
        : undefined,
      actif: !!raw.actif
    };

    this.isSubmitting = true;
    const req$ = this.editingId
      ? this.typeRessourceApi.update(this.editingId, payload)
      : this.typeRessourceApi.create(payload);

    req$.pipe(finalize(() => this.isSubmitting = false)).subscribe({
      next: (res) => {
        if (res.success) {
          this.showToast(res.message, 'success');
          this.cancelForm();
          this.refreshTrigger$.next();
        }
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Une erreur est survenue.', 'error')
    });
  }

  openDesactiverModal(type: TypeRessource): void {
    this.targetType = type;
    this.isDesactiverModalOpen = true;
  }

  cancelDesactiver(): void {
    this.targetType = null;
    this.isDesactiverModalOpen = false;
  }

  confirmDesactiver(): void {
    if (!this.targetType?.id) return;
    this.typeRessourceApi.desactiver(this.targetType.id).subscribe({
      next: (res) => {
        this.showToast(res.message, 'success');
        this.cancelDesactiver();
        this.refreshTrigger$.next();
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Erreur.', 'error')
    });
  }

  openDeleteModal(type: TypeRessource): void {
    this.targetType = type;
    this.isDeleteModalOpen = true;
  }

  cancelDelete(): void {
    this.targetType = null;
    this.isDeleteModalOpen = false;
  }

  confirmDelete(): void {
    if (!this.targetType?.id) return;
    this.typeRessourceApi.supprimer(this.targetType.id).subscribe({
      next: (res) => {
        this.showToast(res.message, 'success');
        this.cancelDelete();
        this.refreshTrigger$.next();
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Erreur lors de la suppression.', 'error')
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) { this.currentPage++; this.refreshTrigger$.next(); }
  }

  previousPage(): void {
    if (this.currentPage > 0) { this.currentPage--; this.refreshTrigger$.next(); }
  }

  categorieLabel(cat: string): string {
    return this.categories.find(c => c.value === cat)?.libelle ?? cat;
  }

  categorieClass(cat: string): string {
    return ({
      MATERIEL_ROULANT: 'bg-blue-50 text-blue-700 border-blue-200',
      EQUIPEMENT:       'bg-amber-50 text-amber-700 border-amber-200',
      AUTRE:            'bg-gray-50 text-gray-600 border-gray-200'
    } as Record<string, string>)[cat] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();
    setTimeout(() => { this.toast.show = false; this.cdr.detectChanges(); }, 3000);
  }
}
