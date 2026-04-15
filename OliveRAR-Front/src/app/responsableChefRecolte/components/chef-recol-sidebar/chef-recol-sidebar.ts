import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
selector: 'app-chef-recol-sidebar',
 imports: [CommonModule, RouterModule],
  templateUrl: './chef-recol-sidebar.html',
})
export class ChefRecolSidebar {
  readonly currentUser$;

  menuItems = [
    { link: '/responsableChefRecolte/profile', label: 'Mon Profil', icon: 'person' },
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

