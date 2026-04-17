import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { VergerApiService, Verger } from '../../../shared/services/verger-api.service';
import { VergerMapComponent, VergerMapMarker } from '../../../shared/components/verger-map/verger-map';
import { AuthService } from '../../../auth/auth.service';
import { Subject, filter, take, delay } from 'rxjs';

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
  mapMarkers: VergerMapMarker[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly vergerApi: VergerApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService
  ) { }

  ngOnInit(): void {
    // Approche Senior : Nous attendons que la session soit restauree (sessionReady$).
    // Le 'delay(0)' est crucial : il repousse l'execution au prochain cycle de detection d'Angular.
    // Cela evite l'erreur NG0100 (ExpressionChangedAfterItHasBeenChecked) lors du rechargement.
    this.authService.sessionReady$.pipe(
      filter(ready => !!ready),
      delay(0), // Decalage technique pour stabiliser l'affichage
      take(1)   // On s'arrete des que c'est pret (une seule fois)
    ).subscribe(() => {
      this.loadVergers();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMarkerSelected(marker: VergerMapMarker): void {
    this.selectedVerger = this.vergers.find((verger) => (verger.id || verger.nom) === marker.id) ?? null;
    this.cdr.markForCheck();
  }

  onVergerChange(event: any): void {
    const selectedId = event.target.value;
    this.selectedVerger = this.vergers.find(v => v.id === selectedId) || null;
    this.cdr.markForCheck();
  }

  private loadVergers(): void {
    this.loadingVergers = true;
    this.mapError = '';
    this.cdr.markForCheck();

    this.vergerApi.getAll().subscribe({
      next: (vergers) => {
        // Use setTimeout to ensure we are in a clean cycle
        setTimeout(() => {
          this.vergers = vergers;
          if (this.vergers.length > 0) {
            this.selectedVerger = this.vergers[0];
          } else {
            this.selectedVerger = null;
          }
          this.calculateStats();
          this.loadingVergers = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges(); // Final sync
        });
      },
      error: () => {
        setTimeout(() => {
          this.loadingVergers = false;
          this.mapError = 'Impossible de charger les vergers pour la carte.';
          this.cdr.markForCheck();
        });
      }
    });
  }

  private calculateStats(): void {
    // Approche Senior : On calcule les marqueurs ici au lieu d'utiliser un 'getter' dans le template.
    // Les getters dynamiques peuvent causer des erreurs NG0100 car ils retournent souvent
    // une nouvelle reference d'objet a chaque verification.
    this.mapMarkers = this.vergers
      .filter((verger) => this.vergerApi.hasValidCoordinates(verger))
      .map((verger) => ({
        id: verger.id || verger.nom,
        title: verger.nom,
        subtitle: verger.localisation,
        latitude: verger.latitude,
        longitude: verger.longitude,
        statut: verger.statut,
        typeOlive: verger.typeOlive,
        rendement: verger.rendementEstime
      }));

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
