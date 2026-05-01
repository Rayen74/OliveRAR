import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { catchError, finalize, switchMap, take, tap } from 'rxjs/operators';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import {
  Collecte,
  CollecteApiService,
  CollecteMutationResponse,
  DropdownUser,
  DropdownVerger,
  PaginatedCollecteResponse,
} from '../../services/collecte-api.service';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-collectes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './collectes.html',
  styleUrl: './collectes.css',
})
export class CollectesComponent implements OnInit, OnDestroy {
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  collectesData$: Observable<PaginatedCollecteResponse> | undefined;
  private readonly destroy$ = new Subject<void>();

  get todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  currentPage = 0;
  pageSize = 5;
  totalPages = 1;
  totalItems = 0;

  filterChefId = '';
  filterStatut = '';

  isLoading = false;
  isSubmitting = false;
  showForm = false;
  editingId: string | null = null;
  deleteTarget: Collecte | null = null;
  isDeleteModalOpen = false;
  toast = { message: '', type: 'success' as 'success' | 'error', show: false };
  error = '';

  readyVergers: DropdownVerger[] = [];
  chefsRecolte: DropdownUser[] = [];
  responsablesAffectation: DropdownUser[] = [];
  ouvriers: DropdownUser[] = [];
  selectedOuvrierIds: Set<string> = new Set();

  readonly statuts = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

  collecteForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private collecteApi: CollecteApiService,
    private cdr: ChangeDetectorRef,
  ) {
    this.collecteForm = this.fb.group({
      vergerId: [''],
      datePrevue: ['', this.futureDateValidator],
      chefRecolteId: [''],
      responsableAffectationId: [''],
    });
  }

  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const selected = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      return { pastDate: true };
    }
    return null;
  }

  ngOnInit(): void {
    this.loadDropdowns();

    this.collectesData$ = this.refreshTrigger$.pipe(
      tap(() => {
        this.isLoading = true;
        this.error = '';
      }),
      switchMap(() =>
        this.collecteApi.getAll(this.currentPage, this.pageSize, this.filterChefId, this.filterStatut).pipe(
          catchError(() => {
            this.error = 'Impossible de charger les collectes.';
            return of({
              items: [],
              totalItems: 0,
              totalPages: 1,
              page: 0,
              limit: this.pageSize,
              hasNext: false,
              hasPrevious: false
             } as PaginatedCollecteResponse);
          }),
        ),
      ),
      tap((res: PaginatedCollecteResponse) => {
        this.totalItems = res.totalItems ?? 0;
        this.totalPages = Math.max(1, res.totalPages ?? 1);
        this.isLoading = false;
      }),
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.refreshTrigger$.next();
  }

  private loadDropdowns(): void {
    this.collecteApi.getReadyVergers().pipe(take(1)).subscribe({
      next: (v) => (this.readyVergers = v),
      error: () => { },
    });

    this.collecteApi.getUsersByRole('RESPONSABLE_CHEF_RECOLTE').pipe(take(1)).subscribe({
      next: (res) => (this.chefsRecolte = res.users ?? []),
      error: () => { },
    });

    this.collecteApi.getUsersByRole('RESPONSABLE_LOGISTIQUE').pipe(take(1)).subscribe({
      next: (res) => (this.responsablesAffectation = res.users ?? []),
      error: () => { },
    });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.selectedOuvrierIds.clear();
    this.collecteForm.reset();
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  startEdit(c: Collecte): void {
    this.editingId = c.id ?? null;
    this.selectedOuvrierIds = new Set(c.equipeIds ?? []);
    this.collecteForm.patchValue({
      vergerId: c.vergerId,
      datePrevue: c.datePrevue,
      chefRecolteId: c.chefRecolteId,
      responsableAffectationId: c.responsableAffectationId ?? '',
      statut: c.statut,
    });
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.selectedOuvrierIds.clear();
    this.collecteForm.reset();
  }

  toggleOuvrier(id: string): void {
    if (this.selectedOuvrierIds.has(id)) {
      this.selectedOuvrierIds.delete(id);
    } else {
      this.selectedOuvrierIds.add(id);
    }
  }

  isOuvrierSelected(id: string): boolean {
    return this.selectedOuvrierIds.has(id);
  }

  submitForm(): void {
    const raw = this.collecteForm.getRawValue();

    if (!raw.vergerId) {
      this.showToast('Le verger est obligatoire.', 'error');
      return;
    }
    if (!raw.datePrevue) {
      this.showToast('La date prévue est obligatoire.', 'error');
      return;
    }
    if (!raw.chefRecolteId) {
      this.showToast('Le chef de récolte est obligatoire.', 'error');
      return;
    }

    const payload: Collecte = {
      ...raw,
      equipeIds: this.editingId ? Array.from(this.selectedOuvrierIds) : [],
    };

    this.isSubmitting = true;
    const req$ = this.editingId
      ? this.collecteApi.update(this.editingId, payload)
      : this.collecteApi.create(payload);

    req$.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: (res: CollecteMutationResponse) => {
        if (res.success) {
          this.showToast(res.message, 'success');
          this.cancelForm();
          this.refreshTrigger$.next();
        }
      },
      error: (err) => {
        this.showToast(err?.error?.message ?? 'Une erreur est survenue.', 'error');
      },
    });
  }

  openDelete(c: Collecte): void {
    this.deleteTarget = c;
    this.isDeleteModalOpen = true;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.isDeleteModalOpen = false;
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id) return;
    this.collecteApi.delete(this.deleteTarget.id).subscribe({
      next: (res) => {
        this.showToast(res.message, 'success');
        this.cancelDelete();
        if (this.currentPage > 0 && this.totalItems - 1 <= this.currentPage * this.pageSize) {
          this.currentPage--;
        }
        this.refreshTrigger$.next();
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error'),
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.refreshTrigger$.next();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.refreshTrigger$.next();
    }
  }

  formatStatut(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'Planifiée',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
    };
    return map[statut] ?? statut;
  }

  statutClass(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'statut-planifiee',
      EN_COURS: 'statut-encours',
      TERMINEE: 'statut-terminee',
      ANNULEE: 'statut-annulee',
    };
    return map[statut] ?? '';
  }

  userLabel(u: DropdownUser): string {
    return `${u.prenom} ${u.nom}`;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, 2000);
  }
}
