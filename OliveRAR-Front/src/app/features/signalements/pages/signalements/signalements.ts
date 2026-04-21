import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-signalements',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-earth-bg">
      <app-sidebar></app-sidebar>
      <main class="flex-1 p-8">
        <h1 class="text-3xl font-bold text-earth-text">Signalements</h1>
        <p class="mt-2 text-sm text-earth-muted">
          Structure prête pour le module de signalement avec géolocalisation, historique et suivi de statut.
        </p>
      </main>
    </div>
  `
})
export class SignalementsPageComponent {}
