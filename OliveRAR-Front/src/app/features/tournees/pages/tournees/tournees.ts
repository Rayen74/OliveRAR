import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-tournees',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-earth-bg">
      <app-sidebar></app-sidebar>
      <main class="flex-1 p-8">
        <h1 class="text-3xl font-bold text-earth-text">Tournées</h1>
        <p class="mt-2 text-sm text-earth-muted">
          Structure prête pour le planificateur de tournées multi-collectes et l’affectation logistique.
        </p>
      </main>
    </div>
  `
})
export class TourneesPageComponent {}
