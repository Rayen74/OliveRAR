import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize, take } from 'rxjs/operators';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { CollecteApiService } from '../../../collectes/services/collecte-api.service';
import { Collecte, Affectation, DropdownUser } from '../../../collectes/models/collecte.model';
import {
  PaginatedTourneesResponse,
  Tournee,
  TourneeCollecteSummary
} from '../../models/tournee.model';
import { TourneeApiService } from '../../services/tournee-api.service';
import { Unite } from '../../../ressources/models/logistique.model';
import { UniteApiService } from '../../../ressources/services/unite-api.service';
import { AuthService, Role } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-tournees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './tournees.html'
})
export class TourneesPageComponent implements OnInit {
onFilterChange() {
throw new Error('Method not implemented.');
}
  // Direct state — no async pipe, guaranteed to load on first navigation
  tournees: Tournee[] = [];

  // Component state
  isLoading = false;
  isSubmitting = false;
  showForm = false;
  isDeleteModalOpen = false;
  showSpecificResourcesModal = false;
  showSummaryModal = false;
  targetCollecteForResources: Collecte | TourneeCollecteSummary | null = null;
  specificAssignments: Affectation[] = [];
  summarySharedAssignments: Affectation[] = [];
  selectedDetails: Tournee | null = null;
  editingId: string | null = null;
  deleteTarget: Tournee | null = null;
  error = '';

  currentPage = 0;
  pageSize = 6;
  totalPages = 1;
  totalElements = 0;

  get isResponsableLogistique(): boolean {
    const role = this.authService.getConnectedUser()?.role;
    return role === Role.RESPONSABLE_LOGISTIQUE || role === Role.RESPONSABLE_COOPERATIVE;
  }

  get canEdit(): boolean {
    const role = this.authService.getConnectedUser()?.role;
    return role === Role.RESPONSABLE_LOGISTIQUE || role === Role.RESPONSABLE_COOPERATIVE;
  }

  readonly statuses = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];
  collectes: Collecte[] = [];
  unites: Unite[] = [];
  dropdownUsers: DropdownUser[] = [];
  selectedCollecteIds = new Set<string>();
  currentAssignments: Affectation[] = [];
  selectedOuvrierIds = new Set<string>();
  editingAssignmentIndex: number | null = null;

  filterForm: FormGroup;
  tourneeForm: FormGroup;
  assignmentForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly tourneeApi: TourneeApiService,
    private readonly collecteApi: CollecteApiService,
    private readonly uniteApi: UniteApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
    private readonly toastService: ToastService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      statutReservation: ['']
    });

    this.tourneeForm = this.fb.group({
      name: [''],
      plannedStartTime: [''],
      plannedEndTime: [''],
      statutReservation: ['PLANIFIEE'],
      optimizationEnabled: [false]
    });

    this.tourneeForm.get('plannedStartTime')?.valueChanges.subscribe(val => {
      if (val && this.currentAssignments.length > 0) {
        this.syncAssignmentDates();
      }
    });

    this.assignmentForm = this.fb.group({
      cibleId: [''],
      startTime: [''],
      endTime: [''],
      statutReservation: ['PLANIFIEE']
    });

  }

  ngOnInit(): void {
    this.loadDependencies();
    this.loadTournees();
  }

  private loadTournees(): void {
    this.isLoading = true;
    this.error = '';
    this.tourneeApi.getAll(
      this.currentPage,
      this.pageSize,
      this.filterForm.get('search')?.value,
      this.filterForm.get('statutReservation')?.value
    ).pipe(take(1)).subscribe({
      next: (response) => {
        this.tournees = response.items ?? [];
        this.totalElements = response.totalElements ?? 0;
        this.totalPages = Math.max(1, response.totalPages ?? 1);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger les tournées.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
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
    
    this.collecteApi.getUsersByRole('OUVRIER').pipe(take(1)).subscribe({
      next: (res) => this.dropdownUsers = res.users ?? [],
      error: () => this.dropdownUsers = []
    });
  }



  openCreateForm(): void {
    this.editingId = null;
    this.selectedCollecteIds.clear();
    this.currentAssignments = [];
    this.tourneeForm.reset({
      name: '',
      plannedStartTime: '',
      plannedEndTime: '',
      statutReservation: 'PLANIFIEE',
      optimizationEnabled: false
    });
    this.assignmentForm.reset({
      cibleId: '',
      startTime: '',
      endTime: '',
      statutReservation: 'PLANIFIEE'
    });
    this.selectedOuvrierIds.clear();
    this.showForm = true;
  }

  startEdit(tournee: Tournee): void {
    this.editingId = tournee.id ?? null;
    this.selectedCollecteIds = new Set(tournee.collecteIds ?? []);
    this.currentAssignments = [...(tournee.affectations ?? [])];
    this.tourneeForm.patchValue({
      name: tournee.name,
      plannedStartTime: this.toDateTimeLocalValue(tournee.plannedStartTime),
      plannedEndTime: this.toDateTimeLocalValue(tournee.plannedEndTime),
      status: tournee.status,
      optimizationEnabled: !!tournee.optimizationEnabled
    });

    // Isoler les ouvriers des affectations existantes pour la gestion séparée
    this.selectedOuvrierIds.clear();
    this.currentAssignments = [];
    (tournee.affectations ?? []).forEach(aff => {
      if (aff.typeCible === 'HUMAIN') {
        this.selectedOuvrierIds.add(aff.cibleId);
      } else {
        this.currentAssignments.push(aff);
      }
    });

    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.selectedCollecteIds.clear();
    this.selectedOuvrierIds.clear();
    this.currentAssignments = [];
  }

  toggleOuvrier(userId: string): void {
    if (this.selectedOuvrierIds.has(userId)) {
      this.selectedOuvrierIds.delete(userId);
    } else {
      this.selectedOuvrierIds.add(userId);
    }
  }

  toggleCollecte(collecteId: string): void {
    const collecte = this.collectes.find((item) => item.id === collecteId);
    if (collecte && !this.isCollecteEligible(collecte)) {
      this.showToast(this.collecteIneligibilityReason(collecte), 'error');
      return;
    }

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
    if (!raw.cibleId || !raw.startTime || !raw.endTime) {
      this.showToast('Complétez les informations de l’affectation.', 'error');
      return;
    }

    const isUser = this.dropdownUsers.some(u => u.id === raw.cibleId);
    
    const tourStart = this.tourneeForm.get('plannedStartTime')?.value;
    const tourEnd = this.tourneeForm.get('plannedEndTime')?.value;

    if (tourStart && tourEnd) {
      if (raw.startTime < tourStart || raw.endTime > tourEnd) {
        this.showToast('L\'affectation doit être comprise dans le créneau de la tournée.', 'error');
        return;
      }
    }

    const newAssignment: Affectation = {
      cibleId: raw.cibleId,
      typeCible: isUser ? 'HUMAIN' : 'MACHINE',
      startTime: raw.startTime,
      endTime: raw.endTime,
      statutReservation: raw.statutReservation
    };

    if (this.editingAssignmentIndex !== null) {
      this.currentAssignments[this.editingAssignmentIndex] = newAssignment;
      this.editingAssignmentIndex = null;
    } else {
      const isDuplicate = this.currentAssignments.some(a => a.cibleId === raw.cibleId);
      if (isDuplicate) {
        this.showToast('Cette unité est déjà ajoutée aux ressources communes.', 'error');
        return;
      }
      this.currentAssignments = [...this.currentAssignments, newAssignment];
    }

    this.assignmentForm.reset({
      cibleId: '',
      startTime: '',
      endTime: '',
      statutReservation: 'PLANIFIEE'
    });
  }

  editAssignment(index: number): void {
    const aff = this.currentAssignments[index];
    this.editingAssignmentIndex = index;
    this.assignmentForm.patchValue({
      cibleId: aff.cibleId,
      typeCible: aff.typeCible,
      startTime: this.toDateTimeLocalValue(aff.startTime),
      endTime: this.toDateTimeLocalValue(aff.endTime),
      statutReservation: aff.statutReservation
    });
  }

  cancelEditAssignment(): void {
    this.editingAssignmentIndex = null;
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
    const raw = this.tourneeForm.getRawValue();

    if (!raw.name?.trim()) {
      this.showToast('Le nom de la tournée est obligatoire.', 'error');
      return;
    }
    if (this.selectedCollecteIds.size < 1) {
      this.showToast('Une tournée doit contenir au moins une collecte.', 'error');
      return;
    }
    if (!raw.plannedStartTime || !raw.plannedEndTime) {
      this.showToast('Le créneau de la tournée est obligatoire.', 'error');
      return;
    }

    const payload: Tournee = {
      name: raw.name.trim(),
      collecteIds: Array.from(this.selectedCollecteIds),
      plannedStartTime: raw.plannedStartTime,
      plannedEndTime: raw.plannedEndTime,
      datePrevue: raw.plannedStartTime?.split('T')[0],
      status: raw.statutReservation,
      optimizationEnabled: !!raw.optimizationEnabled,
      affectations: [
        ...this.currentAssignments,
        ...Array.from(this.selectedOuvrierIds).map(userId => ({
          cibleId: userId,
          typeCible: 'HUMAIN' as const,
          startTime: raw.plannedStartTime,
          endTime: raw.plannedEndTime,
          statutReservation: raw.statutReservation || 'PLANIFIEE'
        }))
      ]
    };

    this.isSubmitting = true;
    const request$ = this.editingId
      ? this.tourneeApi.update(this.editingId, payload)
      : this.tourneeApi.create(payload);

    request$.subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.showToast(response.message, 'success');
          this.cancelForm();
          this.loadTournees();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showToast(err?.error?.message ?? 'Une erreur est survenue.', 'error');
      }
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
        this.loadTournees();
      },
      error: (err) => this.showToast(err?.error?.message ?? 'Erreur lors de la suppression.', 'error')
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTournees();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTournees();
    }
  }


  manageSpecificResources(collecte: Collecte): void {
    this.targetCollecteForResources = collecte;
    this.specificAssignments = [...(collecte.affectations ?? [])];
    this.showSpecificResourcesModal = true;
  }

  closeSpecificResourcesModal(): void {
    this.showSpecificResourcesModal = false;
    this.targetCollecteForResources = null;
  }

  saveSpecificResources(): void {
    if (!this.targetCollecteForResources?.id) return;
    
    // On met à jour localement les affectations de la collecte
    const idx = this.collectes.findIndex(c => c.id === this.targetCollecteForResources?.id);
    if (idx !== -1) {
      this.collectes[idx].affectations = [...this.specificAssignments];
      this.showToast(`Ressources spécifiques mises à jour pour ${this.targetCollecteForResources.name}`, 'success');
    }
    this.closeSpecificResourcesModal();
  }

  addSpecificAssignment(): void {
    const raw = this.assignmentForm.getRawValue();
    if (!raw.cibleId || !raw.startTime || !raw.endTime) {
      this.showToast('Complétez les informations de l’affectation.', 'error');
      return;
    }
    const isUser = this.dropdownUsers.some(u => u.id === raw.cibleId);
    if (isUser) {
      this.toastService.error('L\'affectation des ouvriers doit se faire au niveau des ressources communes de la tournée.');
      return;
    }
    
    const tourStart = this.tourneeForm.get('plannedStartTime')?.value;
    const tourEnd = this.tourneeForm.get('plannedEndTime')?.value;

    if (tourStart && tourEnd) {
      if (raw.startTime < tourStart || raw.endTime > tourEnd) {
        this.showToast('L\'affectation doit être comprise dans le créneau de la tournée.', 'error');
        return;
      }
    }
    
    this.specificAssignments.push({
      cibleId: raw.cibleId,
      typeCible: 'MACHINE',
      startTime: raw.startTime,
      endTime: raw.endTime,
      statutReservation: raw.statutReservation
    });
  }

  removeSpecificAssignment(index: number): void {
    this.specificAssignments.splice(index, 1);
  }

  private syncAssignmentDates(): void {
    const tourneeStart = this.tourneeForm.get('plannedStartTime')?.value;
    const tourneeEnd = this.tourneeForm.get('plannedEndTime')?.value;
    
    if (!tourneeStart) return;

    this.currentAssignments = this.currentAssignments.map(a => ({
      ...a,
      startTime: tourneeStart,
      endTime: tourneeEnd || tourneeStart
    }));
    
    this.showToast('Dates des ressources communes synchronisées avec la tournée.', 'success');
  }

  formatStatus(statutReservation: string): string {
    return {
      PLANIFIEE: 'Planifiée',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée'
    }[statutReservation] ?? statutReservation;
  }

  userLabel(user: DropdownUser): string {
    return `${user.prenom} ${user.nom}`;
  }

  collecteHasResources(collecte: Collecte): boolean {
    return !!(collecte.inheritedAffectations?.length || collecte.affectations?.length);
  }

  isCollecteEligible(collecte: Collecte): boolean {
    const statutReservation = (collecte.statut ?? '').toUpperCase();
    const belongsToAnotherTournee = !!collecte.tourneeId && collecte.tourneeId !== this.editingId;
    
    // Check date range
    const tourneeStart = this.tourneeForm.get('plannedStartTime')?.value;
    const tourneeEnd = this.tourneeForm.get('plannedEndTime')?.value;
    let dateInRange = true;
    if (tourneeStart && tourneeEnd && collecte.datePrevue) {
      const tourStartStr = tourneeStart.split('T')[0];
      const tourEndStr = tourneeEnd.split('T')[0];
      const collDateStr = collecte.datePrevue.toString();
      dateInRange = collDateStr >= tourStartStr && collDateStr <= tourEndStr;
    }

    return !belongsToAnotherTournee && !['TERMINEE', 'ANNULEE'].includes(statutReservation) && dateInRange;
  }

  collecteIneligibilityReason(collecte: Collecte): string {
    const statutReservation = (collecte.statut ?? '').toUpperCase();
    if (collecte.tourneeId && collecte.tourneeId !== this.editingId) {
      return `La collecte ${collecte.name} appartient déjà à la tournée ${collecte.tourneeName ?? 'active'}.`;
    }
    if (statutReservation === 'TERMINEE' || statutReservation === 'ANNULEE') {
      return `La collecte ${collecte.name} est ${this.formatStatus(statutReservation).toLowerCase()} et ne peut pas être ajoutée à une tournée.`;
    }

    // Check date range for specific reason
    const tourneeStart = this.tourneeForm.get('plannedStartTime')?.value;
    const tourneeEnd = this.tourneeForm.get('plannedEndTime')?.value;
    if (tourneeStart && tourneeEnd && collecte.datePrevue) {
      const tourStartStr = tourneeStart.split('T')[0];
      const tourEndStr = tourneeEnd.split('T')[0];
      const collDateStr = collecte.datePrevue.toString();
      if (collDateStr < tourStartStr || collDateStr > tourEndStr) {
        return `La date de la collecte (${collDateStr}) est hors du créneau de la tournée (${tourStartStr} à ${tourEndStr}).`;
      }
    }

    return 'Cette collecte ne peut pas être ajoutée à la tournée.';
  }

  getMachineAffectations(affectations: Affectation[]): Affectation[] {
    if (!affectations) return [];
    return affectations.filter(a => a.typeCible !== 'HUMAIN');
  }

  getHumanAffectations(affectations: Affectation[]): Affectation[] {
    if (!affectations) return [];
    return affectations.filter(a => a.typeCible === 'HUMAIN');
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
    const user = this.dropdownUsers.find(u => u.id === cibleId);
    if (user) return `${user.prenom} ${user.nom}`;
    
    return cibleId;
  }

  openSummaryModal(collecte: Collecte | TourneeCollecteSummary, shared: Affectation[] = []): void {
    this.targetCollecteForResources = collecte;
    this.summarySharedAssignments = shared;
    this.showSummaryModal = true;
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
    this.targetCollecteForResources = null;
  }

  private toDateTimeLocalValue(value?: string): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 16);
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    if (type === 'success') {
      this.toastService.success(message);
    } else {
      this.toastService.error(message);
    }
  }
}
