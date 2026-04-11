import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent implements OnInit {
  readonly currentUser$;
  nonLues = 0;

  menuItems = [
    { link: '/responsable/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { link: '/responsable/notifications', label: 'Notifications', icon: 'notifications' },
    { link: '/responsable/users', label: 'Utilisateurs', icon: 'group' },
    { link: '/responsable/profile', label: 'Mon profil', icon: 'person' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    this.loadNonLues();
    this.notificationService.nonLues$.subscribe(count => {
      this.nonLues = count;
    });
  }

  loadNonLues() {
    this.http.get<any[]>('http://localhost:8080/api/alerts/role/RESPONSABLE_COOPERATIVE').subscribe({
      next: (alerts) => {
        const count = alerts.filter(a => !a.lu).length;
        this.nonLues = count;
        this.notificationService.setNonLues(count);
      },
      error: () => {}
    });
  }

  getInitials(prenom?: string, nom?: string): string {
    const first = prenom?.charAt(0) ?? '';
    const last = nom?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'OP';
  }

  formatRole(role?: string): string {
    if (!role) return '';
    return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
