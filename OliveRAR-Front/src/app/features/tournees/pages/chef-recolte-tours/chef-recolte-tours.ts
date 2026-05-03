import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { CollecteApiService } from '../../../collectes/services/collecte-api.service';
import type { Collecte } from '../../../collectes/models/collecte.model';
import { AttendanceStatus, CheckStatus, UniteStatut } from '../../models/recolte.model';
import type { Recolte, ResourceCheck, WorkerAttendance } from '../../models/recolte.model';
import { RecolteService } from '../../services/recolte.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { UniteApiService } from '../../../ressources/services/unite-api.service';
import { SignalementApiService } from '../../../signalements/services/signalement-api.service';

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
  private readonly uniteApi = inject(UniteApiService);
  private readonly signalementApi = inject(SignalementApiService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  collectesData$: Observable<any> | undefined;

  isLoading = false;
  isSubmitting = false;
  error = '';
  
  // Pagination
  currentPage = 0;
  pageSize = 6;
  totalElements = 0;
  totalPages = 1;

  showModal = false;
  showSignalementModal = false;
  selectedResourceForSignalement: ResourceCheck | null = null;
  signalementType: 'MACHINE' | 'VERGER' = 'MACHINE';
  activeStep: 'Production' | 'Présences' | 'Matériel' = 'Production';
  readonly steps: ('Production' | 'Présences' | 'Matériel')[] = ['Production', 'Présences', 'Matériel'];
  selectedCollecte: Collecte | null = null;
  
  readonly AttendanceStatus = AttendanceStatus;
  readonly UniteStatut = UniteStatut;
  readonly CheckStatus = CheckStatus;

  harvestData: HarvestDataExtended = this.initHarvestData();
  filterForm: FormGroup;
  
  // Signalement form
  signalementForm: FormGroup = this.fb.group({
    issueType: ['AUTRE'],
    description: [''],
    latitude: [0],
    longitude: [0]
  });

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
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Erreur lors de la récupération des détails.');
        this.isLoading = false;
        this.cdr.detectChanges();
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
        currentUnitStatus: a.resource?.status,
        items: [],
        statutGlobal: a.resource?.status as UniteStatut || UniteStatut.DISPONIBLE
      }));

    // Try to load existing harvest if any
    if (collecte.tourneeId) {
      this.recolteService.getByTourId(collecte.tourneeId).subscribe({
        next: (existing) => {
          if (existing) {
            // Merge existing data but keep currentUnitStatus from the prepared ones
            const mergedResourceChecks = this.harvestData.resourceChecks.map(prepared => {
              const saved = existing.resourceChecks.find(r => r.resourceUnitId === prepared.resourceUnitId);
              return saved ? { ...saved, currentUnitStatus: prepared.currentUnitStatus } : prepared;
            });

            this.harvestData = {
              ...existing,
              attendance: existing.attendance.map(a => ({
                ...a,
                heureTime: a.heurePointage ? new Date(a.heurePointage).toTimeString().slice(0, 5) : this.getCurrentTime()
              })),
              resourceChecks: mergedResourceChecks
            };
            this.cdr.detectChanges();
          }
        },
        error: () => {} 
      });
    }
  }

  onUnitStatusChange(check: ResourceCheck, newStatus: UniteStatut): void {
    if (!check.resourceUnitId) return;
    
    this.uniteApi.changerStatut(check.resourceUnitId, newStatus, 'Mis à jour pendant la récolte').subscribe({
      next: () => {
        check.statutGlobal = newStatus;
        check.currentUnitStatus = newStatus;
        this.toast.success(`Statut de ${check.label} mis à jour en ${this.formatUnitStatus(newStatus)}`);
        
        // If status is PANNE or MAINTENANCE, suggest creating a signalement
        if (newStatus === UniteStatut.EN_PANNE || newStatus === UniteStatut.EN_MAINTENANCE) {
           this.openSignalement(check);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Action non autorisée ou erreur serveur.');
      }
    });
  }

  openSignalement(check: ResourceCheck): void {
    this.signalementType = 'MACHINE';
    this.selectedResourceForSignalement = check;
    this.signalementForm.patchValue({
      issueType: 'PANNE_MATERIELLE',
      description: `Incident signalé sur l'unité ${check.label} pendant la récolte au verger ${this.selectedCollecte?.vergerNom}.`,
      latitude: this.selectedCollecte?.latitude || 0,
      longitude: this.selectedCollecte?.longitude || 0
    });
    this.showSignalementModal = true;
    this.cdr.detectChanges();
  }

  openVergerSignalement(): void {
    this.signalementType = 'VERGER';
    this.selectedResourceForSignalement = null;
    this.signalementForm.patchValue({
      issueType: 'MALADIE_OU_PARASITE',
      description: `Problème signalé sur le verger ${this.selectedCollecte?.vergerNom} pendant la récolte.`,
      latitude: this.selectedCollecte?.latitude || 0,
      longitude: this.selectedCollecte?.longitude || 0
    });
    this.showSignalementModal = true;
    this.cdr.detectChanges();
  }

  submitSignalement(): void {
    if (!this.selectedCollecte?.vergerId) return;
    
    const payload = {
      ...this.signalementForm.value,
      vergerId: this.selectedCollecte.vergerId,
      status: 'NOUVEAU'
    };

    this.signalementApi.create(payload).subscribe({
      next: () => {
        this.toast.success('Signalement créé avec succès.');
        this.showSignalementModal = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Erreur lors de la création du signalement.');
      }
    });
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

  getWorkerCount(collecte: any): number {
    return collecte.equipe?.length || 0;
  }

  saveHarvest(): void {
    this.isSubmitting = true;

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

  formatStatut(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'Planifiée',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
    };
    return map[statut] ?? statut;
  }

  formatUnitStatus(statut: string | undefined): string {
    if (!statut) return 'Inconnu';
    const map: Record<string, string> = {
      DISPONIBLE: 'Opérationnel',
      EN_SERVICE: 'En service',
      EN_MAINTENANCE: 'Maintenance',
      EN_PANNE: 'En panne',
      HORS_SERVICE: 'HS'
    };
    return map[statut] ?? statut;
  }

  closeModal(): void {
    this.showModal = false;
  }
}
