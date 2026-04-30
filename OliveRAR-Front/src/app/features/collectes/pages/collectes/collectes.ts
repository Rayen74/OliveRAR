import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, ValidationErrors, Validators } from '@angular/forms';
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
  Affectation
} from '../../services/collecte-api.service';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Unite } from '../../../ressources/models/logistique.model';
import { UniteApiService } from '../../../ressources/services/unite-api.service';
import { AuthService, Role } from '../../../../auth/auth.service';

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

  get isResponsableLogistique(): boolean {
    const role = this.authService.getConnectedUser()?.role;
    return role === Role.RESPONSABLE_LOGISTIQUE || role === Role.RESPONSABLE_COOPERATIVE;
  }

  get canEdit(): boolean {
    return this.authService.getConnectedUser()?.role === Role.RESPONSABLE_LOGISTIQUE;
  }

  filterChefId = '';
  filterStatut = '';
  filterHasResources: boolean | '' = '';

  isLoading = false;
  isSubmitting = false;
  showForm = false;
  editingId: string | null = null;
  editingCollecte: Collecte | null = null;
  deleteTarget: Collecte | null = null;
  isDeleteModalOpen = false;
  toast = { message: '', type: 'success' as 'success' | 'error', show: false };
  error = '';

  readyVergers: DropdownVerger[] = [];
  chefsRecolte: DropdownUser[] = [];
  responsablesAffectation: DropdownUser[] = [];
  ouvriers: DropdownUser[] = [];
  unites: Unite[] = [];
  currentAssignments: Affectation[] = [];

  readonly statuts = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];
  readonly assignmentstatuses = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

  collecteForm: FormGroup;
  assignmentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private collecteApi: CollecteApiService,
    private uniteApi: UniteApiService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
    this.collecteForm = this.fb.group({
      name: [''],
      vergerId: [''],
      datePrevue: ['', this.futureDateValidator],
      chefRecolteId: ['', Validators.required],
      responsableAffectationId: [''],
      statut: ['PLANIFIEE', Validators.required]
    });

    this.assignmentForm = this.fb.group({
      cibleId: [''],
      startTime: [''],
      endTime: [''],
      statutReservation: ['PLANIFIEE']
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
        this.collecteApi.getAll(this.currentPage, this.pageSize, this.filterChefId, this.filterStatut, this.filterHasResources).pipe(
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
        this.cdr.detectChanges();
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
      error: () => {},
    });

    this.collecteApi.getUsersByRole('RESPONSABLE_CHEF_RECOLTE').pipe(take(1)).subscribe({
      next: (res) => (this.chefsRecolte = res.users ?? []),
      error: () => {},
    });

    this.collecteApi.getUsersByRole('RESPONSABLE_LOGISTIQUE').pipe(take(1)).subscribe({
      next: (res) => (this.responsablesAffectation = res.users ?? []),
      error: () => {},
    });

    this.collecteApi.getUsersByRole('OUVRIER').pipe(take(1)).subscribe({
      next: (res) => (this.ouvriers = res.users ?? []),
      error: () => {},
    });

    this.uniteApi.getDisponibles().pipe(take(1)).subscribe({
      next: (res) => (this.unites = res.data ?? []),
      error: () => {},
    });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.editingCollecte = null;
    this.currentAssignments = [];
    this.collecteForm.reset({
      name: '',
      vergerId: '',
      datePrevue: '',
      chefRecolteId: '',
      responsableAffectationId: '',
      statut: 'PLANIFIEE'
    });
    this.assignmentForm.reset({
      cibleId: '',
      startTime: '',
      endTime: '',
      statutReservation: 'PLANIFIEE'
    });
    this.showForm = true;
  }

  startEdit(c: Collecte): void {
    this.editingId = c.id ?? null;
    this.editingCollecte = c;
    this.currentAssignments = [...(c.affectations ?? [])];
    this.collecteForm.patchValue({
      name: c.name,
      vergerId: c.vergerId,
      datePrevue: c.datePrevue,
      chefRecolteId: c.chefRecolteId,
      responsableAffectationId: c.responsableAffectationId ?? '',
      statut: c.statut,
    });
    this.assignmentForm.reset({
      cibleId: '',
      startTime: '',
      endTime: '',
      statutReservation: 'PLANIFIEE'
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.editingCollecte = null;
    this.currentAssignments = [];
    this.collecteForm.reset();
  }

  addAssignment(): void {
    const raw = this.assignmentForm.getRawValue();
    if (!raw.cibleId) {
      this.showToast('Choisissez une unité.', 'error');
      return;
    }
    if (!raw.startTime || !raw.endTime) {
      this.showToast('Le créneau horaire est obligatoire.', 'error');
      return;
    }
    if (new Date(raw.endTime) <= new Date(raw.startTime)) {
      this.showToast('La date de fin doit être après la date de début.', 'error');
      return;
    }

    // Hybrid approach UX: Prevent confusing duplicate assignment in the same list
    const isDuplicate = this.currentAssignments.some(a => a.cibleId === raw.cibleId);
    if (isDuplicate) {
      this.showToast('Cette unité est déjà ajoutée aux ressources spécifiques.', 'error');
      return;
    }

    this.currentAssignments = [
      ...this.currentAssignments,
      {
        cibleId: raw.cibleId,
        typeCible: raw.typeCible || 'MACHINE',
        startTime: raw.startTime,
        endTime: raw.endTime,
        statutReservation: raw.statutReservation
      }
    ];

    this.assignmentForm.reset({
      cibleId: '',
      startTime: '',
      endTime: '',
      statutReservation: 'PLANIFIEE'
    });
  }

  removeAssignment(index: number): void {
    this.currentAssignments.splice(index, 1);
    this.currentAssignments = [...this.currentAssignments];
  }

  submitForm(): void {
    const raw = this.collecteForm.getRawValue();

    if (!raw.name?.trim()) {
      this.showToast('Le nom de la collecte est obligatoire.', 'error');
      return;
    }
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
      name: raw.name.trim(),
      affectations: this.currentAssignments
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

  resourceLabel(cibleId: string, assignment?: any): string {
    // 1. If we have enriched data from the backend (already formatted with code), use it
    if (assignment?.resource?.name) {
      return assignment.resource.name;
    }

    // 2. Fallback to local lookup for units
    const unite = this.unites.find((item) => item.id === cibleId);
    if (unite) return unite.codeUnique;
    
    // 3. Fallback to local lookup for users
    const user = this.ouvriers.find(u => u.id === cibleId);
    if (user) return `${user.prenom} ${user.nom}`;
    
    return cibleId;
  }

  selectedVergerLocation(): string {
    const vergerId = this.collecteForm.get('vergerId')?.value;
    const verger = this.readyVergers.find((item) => item.id === vergerId);
    return verger?.localisation ?? '';
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
