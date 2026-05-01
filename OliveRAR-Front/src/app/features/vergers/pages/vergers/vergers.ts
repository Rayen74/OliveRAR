import { Component, OnDestroy, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService, User } from '../../../../core/auth/auth.service';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { VergerMapComponent } from '../../../../shared/components/verger-map/verger-map';
import { ReverseGeocodingService } from '../../../../shared/services/reverse-geocoding.service';
import {
  PaginatedVergerResponse,
  Verger,
  VergerApiService
} from '../../services/verger-api.service';

@Component({
  selector: 'app-vergers',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, VergerMapComponent],
  templateUrl: './vergers.html',
  styleUrl: './vergers.css'
})
export class VergersComponent implements OnInit, OnDestroy {
  vergers: Verger[] = [];
  loading = false;
  error = '';
  user: User | null = null;
  detailError = '';
  detailLoading = false;

  currentPage = 1;
  readonly pageSize = 5;
  totalVergers = 0;
  totalPages = 0;

  showModal = false;
  isEditing = false;
  isSaving = false;
  currentVerger: Verger = this.emptyVerger();
  selectedVerger: Verger | null = null;
  resolvedAddress = '';
  isResolvingAddress = false;

  showDeleteModal = false;
  vergerToDelete: Verger | null = null;

  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  private readonly destroy$ = new Subject<void>();
  private readonly selectedPosition$ = new Subject<{ latitude: number; longitude: number }>();
  private readonly pageCache = new Map<string, PaginatedVergerResponse>();
  private readonly vergerDetailsCache = new Map<string, Verger>();

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private vergerApi: VergerApiService,
    private reverseGeocodingService: ReverseGeocodingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.user = this.authService.getConnectedUser();
    if (this.user?.id) {
      this.loadVergers();
    } else {
      this.error = 'Utilisateur non connecté.';
    }

    this.selectedPosition$
      .pipe(
        debounceTime(650),
        distinctUntilChanged(
          (previous, current) =>
            previous.latitude === current.latitude && previous.longitude === current.longitude
        ),
        switchMap((position) => {
          this.isResolvingAddress = true;
          this.cdr.detectChanges();

          return this.reverseGeocodingService.reverse(position.latitude, position.longitude).pipe(
            catchError(() => of(''))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((address) => {
        this.isResolvingAddress = false;
        this.resolvedAddress = address;
        if (address) {
          this.currentVerger.localisation = address;
        }
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  emptyVerger(): Verger {
    return {
      nom: '',
      localisation: '',
      statut: 'EN_CROISSANCE',
      superficie: 0,
      nombreArbres: 0,
      typeOlive: 'Chemlali',
      latitude: 0,
      longitude: 0,
      rendementEstime: 0
    };
  }

  loadVergers() {
    const userId = this.user?.id;
    if (!userId) {
      return;
    }

    const cacheKey = this.getPageCacheKey(this.currentPage, this.pageSize);
    const cachedPage = this.pageCache.get(cacheKey);

    if (cachedPage) {
      this.applyPaginatedVergers(cachedPage);
      return;
    }

    this.loading = true;
    this.error = '';
    this.vergerApi.getByAgriculteurPaginated(userId, {
      page: this.currentPage,
      limit: this.pageSize
    }).subscribe({
      next: (response) => {
        this.pageCache.set(cacheKey, response);
        this.applyPaginatedVergers(response);
      },
      error: (err) => {
        this.error = 'Erreur chargement: ' + (err?.error?.message || err?.status);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreate() {
    this.currentVerger = this.emptyVerger();
    this.resolvedAddress = '';
    this.isEditing = false;
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(verger: Verger) {
    this.currentVerger = { ...verger };
    this.resolvedAddress = verger.localisation || '';
    this.isEditing = true;
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showModal = false;
    this.error = '';
    this.isResolvingAddress = false;
    this.cdr.detectChanges();
  }

  save() {
    if (!this.currentVerger.nom || !this.currentVerger.localisation) {
      this.error = 'Nom et localisation sont obligatoires.';
      return;
    }

    if (!this.vergerApi.hasValidCoordinates(this.currentVerger)) {
      this.error = 'Veuillez choisir un emplacement sur la carte.';
      return;
    }

    this.isSaving = true;
    this.error = '';
    this.currentVerger.agriculteurId = this.user?.id;

    const request = this.isEditing
      ? this.vergerApi.update(this.currentVerger.id!, this.currentVerger)
      : this.vergerApi.create(this.currentVerger);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.showModal = false;
        this.invalidateVergerCaches();
        this.showToast('Verger sauvegardé avec succès.', 'success');
        this.cdr.detectChanges();
        this.loadVergers();
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Erreur lors de la sauvegarde.';
        this.error = msg;
        this.showToast(msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  confirmDelete(verger: Verger) {
    this.vergerToDelete = verger;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  deleteVerger() {
    if (!this.vergerToDelete?.id) return;
    this.vergerApi.delete(this.vergerToDelete.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        const deletedId = this.vergerToDelete?.id;
        this.vergerToDelete = null;
        if (deletedId) {
          this.vergerDetailsCache.delete(deletedId);
        }
        this.invalidateVergerCaches();
        this.cdr.detectChanges();
        this.loadVergers();
      },
      error: () => {
        this.error = 'Erreur suppression.';
        this.showDeleteModal = false;
        this.cdr.detectChanges();
      }
    });
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      EN_CROISSANCE: 'En croissance',
      PRET_POUR_RECOLTE: 'Prêt pour récolte',
      TERMINE: 'Terminé'
    };
    return map[statut] || statut;
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      EN_CROISSANCE: 'bg-blue-50 text-blue-700',
      PRET_POUR_RECOLTE: 'bg-olive-50 text-olive-700',
      TERMINE: 'bg-gray-100 text-gray-500'
    };
    return map[statut] || 'bg-gray-100 text-gray-500';
  }

  onMapPositionSelected(position: { latitude: number; longitude: number }) {
    this.currentVerger.latitude = position.latitude;
    this.currentVerger.longitude = position.longitude;
    this.selectedPosition$.next(position);
  }

  hasValidCoordinates(verger: Verger | null | undefined): boolean {
    return this.vergerApi.hasValidCoordinates(verger);
  }

  selectVerger(verger: Verger): void {
    this.detailError = '';
    this.selectedVerger = this.resolveVergerDetails(verger);
  }

  trackByVerger(index: number, verger: Verger): string {
    return verger.id ?? `${verger.nom}-${index}`;
  }

  changePage(page: number): void {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages) || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.loadVergers();
  }

  get pageSummaryStart(): number {
    if (!this.totalVergers || !this.vergers.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageSummaryEnd(): number {
    if (!this.totalVergers || !this.vergers.length) {
      return 0;
    }

    return Math.min(this.currentPage * this.pageSize, this.totalVergers);
  }

  get totalSuperficie(): number {
    return this.vergers.reduce((sum, verger) => sum + (verger.superficie || 0), 0);
  }

  get vergersPrets(): number {
    return this.vergers.filter((verger) => verger.statut === 'PRET_POUR_RECOLTE').length;
  }

  get vergersGeolocalises(): number {
    return this.vergers.filter((verger) => this.vergerApi.hasValidCoordinates(verger)).length;
  }

  private pickPreferredVerger(selectedId?: string): Verger | null {
    if (!this.vergers.length) {
      return null;
    }

    return this.vergers.find((verger) => verger.id === selectedId) ?? this.vergers[0];
  }

  private applyPaginatedVergers(response: PaginatedVergerResponse): void {
    this.vergers = response.items;
    this.totalVergers = response.totalItems;
    this.totalPages = response.totalPages;
    this.currentPage = response.page;
    this.loading = false;

    this.vergers.forEach((verger) => {
      if (verger.id) {
        this.vergerDetailsCache.set(verger.id, verger);
      }
    });

    if (!response.items.length && response.totalItems > 0 && response.totalPages > 0 && this.currentPage > response.totalPages) {
      this.currentPage = response.totalPages;
      this.loadVergers();
      return;
    }

    this.selectedVerger = this.pickPreferredVerger(this.selectedVerger?.id);
    if (this.selectedVerger) {
      this.selectedVerger = this.resolveVergerDetails(this.selectedVerger);
    }

    this.cdr.detectChanges();
  }

  private resolveVergerDetails(verger: Verger): Verger {
    if (!verger.id) {
      return verger;
    }

    const cachedDetails = this.vergerDetailsCache.get(verger.id);
    if (cachedDetails) {
      return cachedDetails;
    }

    this.vergerDetailsCache.set(verger.id, verger);
    return verger;
  }

  private invalidateVergerCaches(): void {
    this.pageCache.clear();
  }

  private getPageCacheKey(page: number, limit: number): string {
    return `${this.user?.id || 'anonymous'}:${page}:${limit}`;
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
