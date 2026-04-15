import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { VergerMapComponent, VergerMapMarker } from '../../../shared/components/verger-map/verger-map';
import { Verger, VergerApiService } from '../../../shared/services/verger-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, VergerMapComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  users: any[] = [];
  vergers: Verger[] = [];
  filteredVergers: Verger[] = [];
  selectedVerger: Verger | null = null;
  loadingVergers = false;
  mapError = '';
  vergerSearch = '';
  showVergerOptions = false;

  private readonly destroy$ = new Subject<void>();
  private readonly vergerSearch$ = new Subject<string>();

  constructor(private readonly vergerApi: VergerApiService) { }

  ngOnInit(): void {
    this.vergerSearch$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((query) => {
        this.filteredVergers = this.filterVergers(query);
      });

    this.loadVergers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get mapMarkers(): VergerMapMarker[] {
    return this.vergers
      .filter((verger) => this.vergerApi.hasValidCoordinates(verger))
      .map((verger) => ({
        id: verger.id || verger.nom,
        title: verger.nom,
        subtitle: verger.localisation,
        latitude: verger.latitude,
        longitude: verger.longitude
      }));
  }

  get totalVergers(): number {
    return this.vergers.length;
  }

  get readyVergers(): number {
    return this.vergers.filter((verger) => verger.statut === 'PRET_POUR_RECOLTE').length;
  }

  get locatedVergers(): number {
    return this.mapMarkers.length;
  }

  get averageYield(): number {
    if (!this.vergers.length) {
      return 0;
    }

    const total = this.vergers.reduce((sum, verger) => sum + (verger.rendementEstime || 0), 0);
    return total / this.vergers.length;
  }

  get selectedVergerLabel(): string {
    if (!this.selectedVerger) {
      return '';
    }

    return `${this.selectedVerger.nom} - ${this.selectedVerger.localisation || 'Localisation non renseignée'}`;
  }

  onMarkerSelected(marker: VergerMapMarker): void {
    this.selectedVerger = this.vergers.find((verger) => (verger.id || verger.nom) === marker.id) ?? null;
    this.syncSearchWithSelection();
    this.showVergerOptions = false;
  }

  onSearchChange(query: string): void {
    this.vergerSearch = query;
    this.showVergerOptions = true;
    this.vergerSearch$.next(query);
  }

  selectVerger(verger: Verger): void {
    this.selectedVerger = verger;
    this.syncSearchWithSelection();
    this.showVergerOptions = false;
  }

  toggleVergerOptions(): void {
    this.showVergerOptions = !this.showVergerOptions;
    if (this.showVergerOptions) {
      this.filteredVergers = this.filterVergers(this.vergerSearch);
    }
  }

  private loadVergers(): void {
    this.loadingVergers = true;
    this.mapError = '';

    this.vergerApi.getAll().subscribe({
      next: (vergers) => {
        this.vergers = vergers;
        this.selectedVerger = vergers.find((verger) => this.vergerApi.hasValidCoordinates(verger)) ?? vergers[0] ?? null;
        this.filteredVergers = [...vergers];
        this.syncSearchWithSelection();
        this.loadingVergers = false;
      },
      error: () => {
        this.loadingVergers = false;
        this.mapError = 'Impossible de charger les vergers pour la carte.';
      }
    });
  }

  private filterVergers(query: string): Verger[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [...this.vergers];
    }

    return this.vergers.filter((verger) =>
      `${verger.nom} ${verger.localisation}`.toLowerCase().includes(normalizedQuery)
    );
  }

  private syncSearchWithSelection(): void {
    this.vergerSearch = this.selectedVergerLabel;
    this.filteredVergers = this.filterVergers('');
  }
}
