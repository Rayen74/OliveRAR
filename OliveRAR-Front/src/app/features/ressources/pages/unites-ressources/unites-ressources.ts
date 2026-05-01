import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap, take, tap } from 'rxjs/operators';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import {
  PaginatedUnitesResponse,
  SOUS_CATEGORIES,
  StatutOption,
  TypeRessource,
  Unite,
  UniteStatut,
  UNITE_STATUT_COLORS
} from '../../models/logistique.model';
import { TypeRessourceApiService } from '../../services/type-ressource-api.service';
import { UniteApiService } from '../../services/unite-api.service';

@Component({
  selector: 'app-unites-ressources',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './unites-ressources.html'
})
export class UnitesRessourcesComponent implements OnInit {

  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  unitesData$: Observable<PaginatedUnitesResponse> | undefined;

  isLoading = false;
  isSubmitting = false;
  showForm = false;
  showMultiForm = false;
  isDeleteModalOpen = false;
  isStatutModalOpen = false;
  isDesactiverModalOpen = false;
  showHistorique = false;

  editingId: string | null = null;
  targetUnite: Unite | null = null;
  selectedHistoriqueUnite: Unite | null = null;

  error = '';
  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  currentPage = 0;
  pageSize = 6;
  totalPages = 1;
  totalElements = 0;

  typesRessources: TypeRessource[] = [];
  statuts: StatutOption[] = [];
  readonly sousCategories = [...SOUS_CATEGORIES];
  readonly statutColors = UNITE_STATUT_COLORS;

  filterForm: FormGroup;
  uniteForm: FormGroup;
  multiForm: FormGroup;
  statutForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly uniteApi: UniteApiService,
    private readonly typeApi: TypeRessourceApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      statut: [''],
      typeId: [''],
      disponible: ['']
    });

    this.uniteForm = this.fb.group({
      codeUnique: [''],
      typeId: [''],
      localisation: [''],
      notes: [''],
      derniereMaintenanceDate: [''],
      conducteurHabituelId: [''],
      seuilMaintenanceJours: [180]
    });

    this.multiForm = this.fb.group({
      typeId: [''],
      prefixCode: [''],
      debut: [1],
      nombre: [1],
      localisation: [''],
      notes: ['']
    });

    this.statutForm = this.fb.group({
      statut: [''],
      note: ['']
    });
  }

  ngOnInit(): void {
    // Charger les dépendances
    this.typeApi.getActifs().pipe(take(1)).subscribe({
      next: (res) => this.typesRessources = res.data ?? [],
      error: () => this.typesRessources = []
    });
    this.uniteApi.getStatuts().pipe(take(1)).subscribe({
      next: (res) => this.statuts = res.data ?? [],
      error: () => this.statuts = []
    });

    this.unitesData$ = this.refreshTrigger$.pipe(
      tap(() => { this.isLoading = true; this.error = ''; }),
      switchMap(() => {
        const f = this.filterForm.getRawValue();
        return this.uniteApi.getAll(this.currentPage, this.pageSize, {
          search: f.search,
          statut: f.statut,
          typeId: f.typeId,
          disponible: f.disponible === '' ? undefined : f.disponible === 'true'
        }).pipe(
          catchError(() => {
            this.error = 'Impossible de charger les unités.';
            return of({
              success: false, items: [], page: 0,
              size: this.pageSize, totalElements: 0, totalPages: 1
            } as PaginatedUnitesResponse);
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

  // ── Création simple ─────────────────────────────────────────

  openCreateForm(): void {
    this.editingId = null;
    this.uniteForm.reset({
      codeUnique: '', typeId: '', localisation: '', notes: '',
      derniereMaintenanceDate: '', conducteurHabituelId: '', seuilMaintenanceJours: 180
    });
    this.showForm = true;
  }

  startEdit(unite: Unite): void {
    this.editingId = unite.id ?? null;
    this.uniteForm.patchValue({
      codeUnique: unite.codeUnique,
      typeId: unite.typeId,
      localisation: unite.localisation ?? '',
      notes: unite.notes ?? '',
      derniereMaintenanceDate: unite.derniereMaintenanceDate ?? '',
      conducteurHabituelId: unite.conducteurHabituelId ?? '',
      seuilMaintenanceJours: unite.seuilMaintenanceJours ?? 180
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
  }

  submitForm(): void {
    const raw = this.uniteForm.getRawValue();
    if (!raw.codeUnique?.trim()) {
      this.showToast('Le code unique est obligatoire.', 'error');
      return;
    }
    if (!raw.typeId) {
      this.showToast('Le type de ressource est obligatoire.', 'error');
      return;
    }

    const payload: Unite = {
      codeUnique: raw.codeUnique.trim().toUpperCase(),
      typeId: raw.typeId,
      localisation: raw.localisation?.trim() || undefined,
      notes: raw.notes?.trim() || undefined,
      derniereMaintenanceDate: raw.derniereMaintenanceDate || undefined,
      conducteurHabituelId: raw.conducteurHabituelId || undefined,
      seuilMaintenanceJours: Number(raw.seuilMaintenanceJours) || 180
    };

    this.isSubmitting = true;
    const req$ = this.editingId
      ? this.uniteApi.modifier(this.editingId, payload)
      : this.uniteApi.creer(payload);

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

  // ── Multi-création ──────────────────────────────────────────

  openMultiForm(): void {
    this.multiForm.reset({ typeId: '', prefixCode: '', debut: 1, nombre: 1, localisation: '', notes: '' });
    this.showMultiForm = true;
  }

  cancelMultiForm(): void {
    this.showMultiForm = false;
  }

  submitMultiForm(): void {
    const raw = this.multiForm.getRawValue();
    if (!raw.typeId || !raw.prefixCode?.trim() || Number(raw.nombre) < 1) {
      this.showToast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }
    this.isSubmitting = true;
    this.uniteApi.creerMultiple({
      typeId: raw.typeId,
      prefixCode: raw.prefixCode.trim().toUpperCase(),
      debut: Number(raw.debut),
      nombre: Number(raw.nombre)
    }).pipe(finalize(() => this.isSubmitting = false)).subscribe({
      next: (res) => {
        if (res.success) {
          this.showToast(res.message, 'success');
          this.cancelMultiForm();
          this.refreshTrigger$.next();
        }
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Erreur multi-création.', 'error')
    });
  }

  // ── Changement de statut ────────────────────────────────────

  openStatutModal(unite: Unite): void {
    this.targetUnite = unite;
    this.statutForm.patchValue({ statut: unite.statut ?? '', note: '' });
    this.isStatutModalOpen = true;
  }

  cancelStatutModal(): void {
    this.targetUnite = null;
    this.isStatutModalOpen = false;
  }

  confirmChangerStatut(): void {
    if (!this.targetUnite?.id) return;
    const raw = this.statutForm.getRawValue();
    if (!raw.statut) {
      this.showToast('Veuillez sélectionner un statut.', 'error');
      return;
    }
    this.uniteApi.changerStatut(this.targetUnite.id, raw.statut, raw.note).subscribe({
      next: (res) => {
        this.showToast(res.message, 'success');
        this.cancelStatutModal();
        this.refreshTrigger$.next();
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Transition invalide.', 'error')
    });
  }

  // ── Désactivation ───────────────────────────────────────────

  openDesactiverModal(unite: Unite): void {
    this.targetUnite = unite;
    this.isDesactiverModalOpen = true;
  }

  cancelDesactiver(): void {
    this.targetUnite = null;
    this.isDesactiverModalOpen = false;
  }

  confirmDesactiver(): void {
    if (!this.targetUnite?.id) return;
    this.uniteApi.desactiver(this.targetUnite.id, 'Mise hors service via interface.').subscribe({
      next: (res) => {
        this.showToast(res.message, 'success');
        this.cancelDesactiver();
        this.refreshTrigger$.next();
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Erreur.', 'error')
    });
  }

  // ── Suppression ─────────────────────────────────────────────

  openDeleteModal(unite: Unite): void {
    this.targetUnite = unite;
    this.isDeleteModalOpen = true;
  }

  cancelDelete(): void {
    this.targetUnite = null;
    this.isDeleteModalOpen = false;
  }

  confirmDelete(): void {
    if (!this.targetUnite?.id) return;
    this.uniteApi.supprimer(this.targetUnite.id).subscribe({
      next: (res) => {
        this.showToast(res.message, 'success');
        this.cancelDelete();
        this.refreshTrigger$.next();
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Erreur lors de la suppression.', 'error')
    });
  }

  // ── Historique ──────────────────────────────────────────────

  viewHistorique(unite: Unite): void {
    this.selectedHistoriqueUnite = unite;
    this.showHistorique = true;
  }

  closeHistorique(): void {
    this.selectedHistoriqueUnite = null;
    this.showHistorique = false;
  }

  // ── Pagination ──────────────────────────────────────────────

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) { this.currentPage++; this.refreshTrigger$.next(); }
  }

  previousPage(): void {
    if (this.currentPage > 0) { this.currentPage--; this.refreshTrigger$.next(); }
  }

  // ── Helpers UI ──────────────────────────────────────────────

  statutClass(statut: UniteStatut | undefined): string {
    return statut ? (this.statutColors[statut] ?? 'bg-gray-50 text-gray-500 border-gray-200') : '';
  }

  typeLabel(typeId: string): string {
    return this.typesRessources.find(t => t.id === typeId)?.nom ?? typeId;
  }

  /** Transitions autorisées depuis un statut donné (pour le select). */
  transitionsAutorisees(currentStatut: UniteStatut | undefined): StatutOption[] {
    if (!currentStatut) return this.statuts;
    const transitions: Record<UniteStatut, UniteStatut[]> = {
      DISPONIBLE:     ['AFFECTE', 'EN_MAINTENANCE'],
      AFFECTE:        ['DISPONIBLE', 'EN_PANNE', 'HORS_SERVICE'],
      EN_MAINTENANCE: ['DISPONIBLE', 'HORS_SERVICE'],
      EN_PANNE:       ['EN_MAINTENANCE', 'HORS_SERVICE'],
      HORS_SERVICE:   ['DISPONIBLE']
    };
    const allowed = new Set(transitions[currentStatut] ?? []);
    return this.statuts.filter(s => allowed.has(s.value as UniteStatut));
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();
    setTimeout(() => { this.toast.show = false; this.cdr.detectChanges(); }, 3000);
  }
}
