import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-agriculteur-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agriculteur-sidebar.html'
})
export class AgriculteurSidebarComponent {
  readonly currentUser$;

  menuItems = [
    { link: '/agriculteur/vergers', label: 'Mes Vergers', icon: 'forest' },
    { link: '/agriculteur/notifications', label: 'Notifications Collecte', icon: 'notifications' },
    { link: '/agriculteur/profile', label: 'Mon Profil', icon: 'person' },
  ];

  constructor(private authService: AuthService, private router: Router) {
    this.currentUser$ = this.authService.currentUser$;
  }

  getInitials(prenom?: string, nom?: string): string {
    const first = prenom?.charAt(0) ?? '';
    const last = nom?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'AG';
  }

  formatRole(role?: string): string {
    if (!role) return '';
    return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
