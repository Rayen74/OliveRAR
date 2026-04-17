import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { VergerApiService, Verger } from '../../../shared/services/verger-api.service';
import { VergerMapComponent, VergerMapMarker } from '../../../shared/components/verger-map/verger-map';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, VergerMapComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  vergers: Verger[] = [];
  selectedVerger: Verger | null = null;
  loadingVergers = false;
  mapError = '';

  // Stats
  totalVergers = 0;
  readyVergers = 0;
  locatedVergers = 0;
  averageYield = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly vergerApi: VergerApiService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
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

  onMarkerSelected(marker: VergerMapMarker): void {
    this.selectedVerger = this.vergers.find((verger) => (verger.id || verger.nom) === marker.id) ?? null;
    this.cdr.detectChanges();
  }

  onVergerChange(event: any): void {
    const selectedId = event.target.value;
    this.selectedVerger = this.vergers.find(v => v.id === selectedId) || null;
    this.cdr.detectChanges();
  }

  private loadVergers(): void {
    this.loadingVergers = true;
    this.mapError = '';
    this.cdr.detectChanges();

    this.vergerApi.getAll().subscribe({
      next: (vergers) => {
        this.vergers = vergers;
        this.selectedVerger = null;
        this.calculateStats();
        this.loadingVergers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingVergers = false;
        this.mapError = 'Impossible de charger les vergers pour la carte.';
        this.cdr.detectChanges();
      }
    });
  }

  private calculateStats(): void {
    this.totalVergers = this.vergers.length;
    this.readyVergers = this.vergers.filter(v => v.statut === 'PRET_POUR_RECOLTE').length;
    this.locatedVergers = this.mapMarkers.length;
    
    if (this.vergers.length > 0) {
      const total = this.vergers.reduce((sum, v) => sum + (v.rendementEstime || 0), 0);
      this.averageYield = total / this.vergers.length;
    } else {
      this.averageYield = 0;
    }
  }
}
