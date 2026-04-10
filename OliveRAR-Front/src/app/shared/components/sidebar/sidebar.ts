import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  readonly currentUser$;

  menuItems = [
    { link: '/responsable/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { link: '/responsable/users', label: 'Utilisateurs', icon: 'group' },
    { link: '/responsable/profile', label: 'Mon profil', icon: 'person' }
  ];

  constructor(private authService: AuthService, private router: Router) {
    this.currentUser$ = this.authService.currentUser$;
  }

  getInitials(prenom?: string, nom?: string): string {
    const first = prenom?.charAt(0) ?? '';
    const last = nom?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'OP';
  }

  formatRole(role?: string): string {
    if (!role) {
      return '';
    }
    return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
