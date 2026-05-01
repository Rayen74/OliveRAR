import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { CollecteApiService } from '../../../collectes/services/collecte-api.service';
import type { Collecte } from '../../../collectes/models/collecte.model';
import { AttendanceStatus, CheckStatus } from '../../models/recolte.model';
import type { Recolte, ResourceCheck, WorkerAttendance } from '../../models/recolte.model';
import { RecolteService } from '../../services/recolte.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AuthService } from '../../../../core/auth/auth.service';

interface HarvestDataExtended extends Recolte {

  attendance: (WorkerAttendance & { heureTime: string })[];
}

@Component({
  selector: 'app-chef-recolte-tours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './chef-recolte-tours.html',
  styleUrl: './chef-recolte-tours.css'
})
export class ChefRecolteToursComponent implements OnInit {
  private readonly collecteApi = inject(CollecteApiService);
  private readonly recolteService = inject(RecolteService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  collectesData$: Observable<import('../../../collectes/models/collecte.model').PaginatedCollecteResponse> | undefined;

  isLoading = false;
  isSubmitting = false;
  error = '';
  
  // Pagination
  currentPage = 0;
  pageSize = 6;
  totalElements = 0;
  totalPages = 1;

  showModal = false;
  activeStep: 'Production' | 'Présences' | 'Matériel' = 'Production';
  readonly steps: ('Production' | 'Présences' | 'Matériel')[] = ['Production', 'Présences', 'Matériel'];
  selectedCollecte: Collecte | null = null;
  readonly AttendanceStatus = AttendanceStatus;

  harvestData: HarvestDataExtended = this.initHarvestData();
  filterForm: FormGroup;

  constructor() {
    this.filterForm = this.fb.group({
      searchStatut: ['']
    });
  }

  ngOnInit(): void {
    const userId = this.authService.getConnectedUser()?.id;

    this.collectesData$ = this.refreshTrigger$.pipe(
      tap(() => {
        this.isLoading = true;
        this.error = '';
      }),
      switchMap(() =>
        this.collecteApi.getAll(
          this.currentPage,
          this.pageSize,
          userId,
          this.filterForm.get('searchStatut')?.value || undefined
        ).pipe(
          catchError(() => {
            this.error = 'Impossible de charger vos collectes.';
            return of({ items: [], totalItems: 0, totalPages: 1, page: 0, limit: this.pageSize, hasNext: false, hasPrevious: false });
          })
        )
      ),
      tap((response) => {
        this.totalElements = response.totalItems || 0;
        this.totalPages = Math.max(1, response.totalPages || 1);
        this.isLoading = false;
      })
    );
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.refreshTrigger$.next();
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

  openHarvestModal(collecte: Collecte): void {
    this.selectedCollecte = collecte;
    this.isLoading = true;

    // Refresh detail to get workers and resources
    this.collecteApi.getById(collecte.id!).subscribe({
      next: (res) => {
        const fullCollecte = res.data;
        this.prepareHarvestData(fullCollecte);
        this.showModal = true;
        this.isLoading = false;
      },
      error: () => {
        this.toast.error('Erreur lors de la récupération des détails.');
        this.isLoading = false;
      }
    });
  }

  private prepareHarvestData(collecte: Collecte): void {
    this.harvestData = this.initHarvestData();
    this.harvestData.tourId = collecte.tourneeId || '';
    this.harvestData.vergerId = collecte.vergerId;
    
    // Prepare workers attendance
    if (collecte.equipe) {
      this.harvestData.attendance = collecte.equipe.map((m: any) => ({
        workerId: m.id,
        workerName: m.nom,
        statut: AttendanceStatus.PRESENT,
        heureTime: this.getCurrentTime()
      }));
    }

    // Prepare resource checks (both specific and inherited)
    const allAffectations = [
      ...(collecte.inheritedAffectations || []),
      ...(collecte.affectations || [])
    ];

    this.harvestData.resourceChecks = allAffectations
      .filter(a => a.typeCible === 'MACHINE')
      .map(a => ({
        resourceUnitId: a.cibleId,
        label: a.resource?.name || a.cibleId,
        items: [
          { label: 'État général', checked: true },
          { label: 'Propreté', checked: true },
          { label: 'Fonctionnement', checked: true }
        ],
        statutGlobal: CheckStatus.OK
      }));

    // Try to load existing harvest if any
    if (collecte.tourneeId) {
      this.recolteService.getByTourId(collecte.tourneeId).subscribe({
        next: (existing) => {
          if (existing) {
            this.harvestData = {
              ...existing,
              attendance: existing.attendance.map(a => ({
                ...a,
                heureTime: a.heurePointage ? new Date(a.heurePointage).toTimeString().slice(0, 5) : this.getCurrentTime()
              }))
            };
          }
        },
        error: () => {} 
      });
    }
  }

  private initHarvestData(): HarvestDataExtended {
    return {
      tourId: '',
      vergerId: '',
      quantiteOliveKg: 0,
      attendance: [],
      resourceChecks: [],
      notesGlobales: ''
    };
  }

  getCurrentTime(): string {
    return new Date().toTimeString().slice(0, 5);
  }

  isCheckOk(check: ResourceCheck): boolean {
    return check.items.every(i => i.checked);
  }

  getWorkerCount(collecte: any): number {
    return collecte.equipe?.length || 0;
  }

  saveHarvest(): void {
    this.isSubmitting = true;

    // Convert heureTime back to Date objects
    const finalData: Recolte = {
      ...this.harvestData,
      attendance: this.harvestData.attendance.map(a => {
        const [h, m] = a.heureTime.split(':');
        const d = new Date();
        d.setHours(parseInt(h), parseInt(m), 0, 0);
        return {
          workerId: a.workerId,
          workerName: a.workerName,
          statut: a.statut,
          heurePointage: d
        };
      })
    };

    this.recolteService.save(finalData).subscribe({
      next: () => {
        this.toast.success('Récolte enregistrée avec succès !');
        this.showModal = false;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors de l\'enregistrement.');
        this.isSubmitting = false;
      }
    });
  }

  downloadReport(collecte: Collecte): void {
    if (collecte.tourneeId) {
      this.recolteService.downloadReport(collecte.tourneeId);
    } else {
      this.toast.error('Aucune tournée associée à cette collecte.');
    }
  }

  closeModal(): void {
    this.showModal = false;
  }
}
