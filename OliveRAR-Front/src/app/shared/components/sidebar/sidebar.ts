import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { MenuItem } from '../../models/menu-item.model';
import { NotificationService } from '../../services/notification';
import { AlertApiService } from '../../services/alert-api.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent implements OnInit {
  readonly currentUser$;
  menuItems: MenuItem[] = [];
  nonLues = 0;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly sidebarService: SidebarService,
    private readonly alertApi: AlertApiService,
    private readonly notificationService: NotificationService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Determine menu items based on role
    this.currentUser$.subscribe(user => {
      if (user && user.role) {
        this.menuItems = this.sidebarService.getMenuItems(user.role);
        this.loadNonLues(user.role);
      }
    });

    this.notificationService.nonLues$.subscribe(count => {
      this.nonLues = count;
    });
  }

  /**
   * Fetches unread notifications for a specific role.
   * @param role User role string
   */
  private loadNonLues(role: string): void {
    // Only fetch if it's a role that has notifications (e.g., RESPONSABLE_COOPERATIVE)
    // You might want to generalize this logic in the backend-aware refactor
    if (role === 'RESPONSABLE_COOPERATIVE') {
      this.alertApi.getByRole(role).subscribe({
        next: (alerts) => {
          const count = alerts.filter(a => !a.lu).length;
          this.nonLues = count;
          this.notificationService.setNonLues(count);
        },
        error: () => { }
      });
    }
  }

  /**
   * Generates initials for user avatar display.
   * @param prenom User's first name
   * @param nom User's last name
   */
  getInitials(prenom?: string, nom?: string): string {
    const first = prenom?.charAt(0) ?? '';
    const last = nom?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }

  /**
   * Formats backend role string to human-readable format.
   * @param role Raw role string from backend
   */
  formatRole(role?: string): string {
    if (!role) return '';
    return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Clears session and redirects to login.
   */
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
