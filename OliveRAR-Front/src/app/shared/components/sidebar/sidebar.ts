import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  // Liens pour le Responsable Coopérative basés sur vos Use Cases
  menuItems = [
    { link: '/responsable/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { link: '/responsable/users', label: 'Utilisateurs', icon: 'group' },
    { link: '/responsable/carte', label: 'Carte Interactive', icon: 'map' },
    { link: '/responsable/collectes', label: 'Créer Collecte', icon: 'add_circle' },
    { link: '/responsable/rendements', label: 'Rendements', icon: 'bar_chart' }
  ];

  constructor(private authService: AuthService, private router: Router) { }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
