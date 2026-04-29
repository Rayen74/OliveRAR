import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap, take, tap } from 'rxjs/operators';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { CollecteApiService, Collecte, ResourceAssignment, DropdownUser } from '../../../collectes/services/collecte-api.service';
import {
  PaginatedTourneesResponse,
  Tournee
} from '../../models/tournee.model';
import { TourneeApiService } from '../../services/tournee-api.service';
import { Unite } from '../../../ressources/models/logistique.model';
import { UniteApiService } from '../../../ressources/services/unite-api.service';
import { AuthService, Role } from '../../../../auth/auth.service';

@Component({
  selector: 'app-tournees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './tournees.html'
})
export class TourneesPageComponent implements OnInit {
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  tourneesData$: Observable<PaginatedTourneesResponse> | undefined;

  isLoading = false;
  isSubmitting = false;
  showForm = false;
  isDeleteModalOpen = false;
  selectedDetails: Tournee | null = null;
  editingId: string | null = null;
  deleteTarget: Tournee | null = null;
  error = '';
  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  currentPage = 0;
  pageSize = 6;
  totalPages = 1;
  totalElements = 0;

  get isResponsableLogistique(): boolean {
    return this.authService.getConnectedUser()?.role === Role.RESPONSABLE_LOGISTIQUE;
  }

  readonly statuses = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];
  collectes: Collecte[] = [];
  unites: Unite[] = [];
  selectedCollecteIds = new Set<string>();
  currentAssignments: ResourceAssignment[] = [];

  filterForm: FormGroup;
  tourneeForm: FormGroup;
  assignmentForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly tourneeApi: TourneeApiService,
    private readonly collecteApi: CollecteApiService,
    private readonly uniteApi: UniteApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['']
    });

    this.tourneeForm = this.fb.group({
      name: [''],
      plannedStartTime: [''],
      plannedEndTime: [''],
      status: ['PLANIFIEE'],
      optimizationEnabled: [false]
    });

    this.assignmentForm = this.fb.group({
      uniteId: [''],
      startTime: [''],
      endTime: [''],
      status: ['PLANIFIEE']
    });
  }

  ngOnInit(): void {
    this.loadDependencies();

    this.tourneesData$ = this.refreshTrigger$.pipe(
      tap(() => {
        this.isLoading = true;
        this.error = '';
      }),
      switchMap(() =>
        this.tourneeApi.getAll(
          this.currentPage,
          this.pageSize,
          this.filterForm.get('search')?.value,
          this.filterForm.get('status')?.value
        ).pipe(
          catchError(() => {
            this.error = 'Impossible de charger les tournées.';
            return of({
              success: false,
              items: [],
              page: 0,
              size: this.pageSize,
              totalElements: 0,
              totalPages: 1
            } as PaginatedTourneesResponse);
          })
        )
      ),
      tap((response) => {
        this.totalElements = response.totalElements ?? 0;
        this.totalPages = Math.max(1, response.totalPages ?? 1);
        this.isLoading = false;
      })
    );
  }

  loadDependencies(): void {
    this.collecteApi.getAll(0, 100).pipe(take(1)).subscribe({
      next: (response) => {
        this.collectes = response.items ?? [];
      },
      error: () => {
        this.collectes = [];
      }
    });

    this.uniteApi.getDisponibles().pipe(take(1)).subscribe({
      next: (res) => this.unites = res.data ?? [],
      error: () => this.unites = []
    });
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.refreshTrigger$.next();
  }

  openCreateForm(): void {
    this.editingId = null;
    this.selectedCollecteIds.clear();
    this.currentAssignments = [];
    this.tourneeForm.reset({
      name: '',
      plannedStartTime: '',
      plannedEndTime: '',
      status: 'PLANIFIEE',
      optimizationEnabled: false
    });
    this.assignmentForm.reset({
      uniteId: '',
      startTime: '',
      endTime: '',
      status: 'PLANIFIEE'
    });
    this.showForm = true;
  }

  startEdit(tournee: Tournee): void {
    this.editingId = tournee.id ?? null;
    this.selectedCollecteIds = new Set(tournee.collecteIds ?? []);
    this.currentAssignments = [...(tournee.resourceAssignments ?? [])];
    this.tourneeForm.patchValue({
      name: tournee.name,
      plannedStartTime: this.toDateTimeLocalValue(tournee.plannedStartTime),
      plannedEndTime: this.toDateTimeLocalValue(tournee.plannedEndTime),
      status: tournee.status,
      optimizationEnabled: !!tournee.optimizationEnabled
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.selectedCollecteIds.clear();
    this.currentAssignments = [];
  }

  toggleCollecte(collecteId: string): void {
    if (this.selectedCollecteIds.has(collecteId)) {
      this.selectedCollecteIds.delete(collecteId);
    } else {
      this.selectedCollecteIds.add(collecteId);
    }
  }  isCollecteSelected(collecteId: string): boolean {
    return this.selectedCollecteIds.has(collecteId);
  }

  addAssignment(): void {
    const raw = this.assignmentForm.getRawValue();
    if (!raw.uniteId || !raw.startTime || !raw.endTime) {
      this.showToast('Complétez les informations de l’affectation.', 'error');
      return;
    }

    this.currentAssignments = [
      ...this.currentAssignments,
      {
        uniteId: raw.uniteId,
        startTime: new Date(raw.startTime).toISOString(),
        endTime: new Date(raw.endTime).toISOString(),
        status: raw.status
      }
    ];

    this.assignmentForm.reset({
      uniteId: '',
      startTime: '',
      endTime: '',
      status: 'PLANIFIEE'
    });
  }

  removeAssignment(index: number): void {
    this.currentAssignments.splice(index, 1);
    this.currentAssignments = [...this.currentAssignments];
  }

  submitForm(): void {
    const raw = this.tourneeForm.getRawValue();

    if (!raw.name?.trim()) {
      this.showToast('Le nom de la tournée est obligatoire.', 'error');
      return;
    }
    if (this.selectedCollecteIds.size < 2) {
      this.showToast('Une tournée doit contenir au moins deux collectes.', 'error');
      return;
    }
    if (!raw.plannedStartTime || !raw.plannedEndTime) {
      this.showToast('Le créneau de la tournée est obligatoire.', 'error');
      return;
    }

    const payload: Tournee = {
      name: raw.name.trim(),
      collecteIds: Array.from(this.selectedCollecteIds),
      plannedStartTime: new Date(raw.plannedStartTime).toISOString(),
      plannedEndTime: new Date(raw.plannedEndTime).toISOString(),
      datePrevue: raw.plannedStartTime?.split('T')[0],
      status: raw.status,
      optimizationEnabled: !!raw.optimizationEnabled,
      resourceAssignments: this.currentAssignments
    };

    this.isSubmitting = true;
    const request$ = this.editingId
      ? this.tourneeApi.update(this.editingId, payload)
      : this.tourneeApi.create(payload);

    request$.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: (response) => {
        if (response.success) {
          this.showToast(response.message, 'success');
          this.cancelForm();
          this.refreshTrigger$.next();
        }
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Une erreur est survenue.', 'error')
    });
  }

  viewDetails(tournee: Tournee): void {
    if (!tournee.id) {
      return;
    }

    this.tourneeApi.getById(tournee.id).pipe(take(1)).subscribe({
      next: (response) => {
        this.selectedDetails = response.data;
      },
      error: () => this.showToast('Impossible de charger les détails.', 'error')
    });
  }

  closeDetails(): void {
    this.selectedDetails = null;
  }

  openDeleteModal(tournee: Tournee): void {
    this.deleteTarget = tournee;
    this.isDeleteModalOpen = true;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.isDeleteModalOpen = false;
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id) {
      return;
    }

    this.tourneeApi.delete(this.deleteTarget.id).subscribe({
      next: (response) => {
        this.showToast(response.message, 'success');
        this.cancelDelete();
        this.refreshTrigger$.next();
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Erreur lors de la suppression.', 'error')
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

  formatStatus(status: string): string {
    return {
      PLANIFIEE: 'Planifiée',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée'
    }[status] ?? status;
  }

  userLabel(user: DropdownUser): string {
    return `${user.prenom} ${user.nom}`;
  }

  resourceLabel(uniteId: string): string {
    const unite = this.unites.find((item) => item.id === uniteId);
    return unite ? `${unite.codeUnique}` : uniteId;
  }

  private toDateTimeLocalValue(value?: string): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 16);
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
