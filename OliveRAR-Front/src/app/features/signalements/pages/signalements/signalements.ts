import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { VergerIssuesComponent } from '../../../vergers/pages/vergers/verger-issues/verger-issues';
import { AuthService, User } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-signalements',
  standalone: true,
  imports: [CommonModule, SidebarComponent, VergerIssuesComponent],
  template: `
    <div class="flex min-h-screen bg-earth-bg">
      <app-sidebar></app-sidebar>
      <main class="flex-1 p-8">
        <header class="mb-6">
          <h1 class="text-3xl font-bold text-earth-text">Tous mes signalements</h1>
          <p class="mt-2 text-sm text-earth-muted">
            Suivi centralisé des problèmes sur l'ensemble de vos vergers.
          </p>
        </header>

        <app-verger-issues [user]="user"></app-verger-issues>
      </main>
    </div>
  `
})
export class SignalementsPageComponent implements OnInit {
  user: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.user = this.authService.getConnectedUser();
  }
}
