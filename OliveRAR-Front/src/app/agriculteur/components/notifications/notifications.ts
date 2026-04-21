import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../../auth/auth.service';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';

export interface Notification {
  title?: string;
  description?: string;
  date?: string;
  status?: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './notifications.html'
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  loading = true;
  error = '';
  user: User | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.user = this.authService.getConnectedUser();
    this.loadNotifications();
  }

  loadNotifications() {
    this.http.get<Notification[]>('http://localhost:8080/api/harvests').subscribe({
      next: (data) => { this.notifications = data; this.loading = false; },
      error: () => { this.error = 'Erreur chargement notifications.'; this.loading = false; }
    });
  }
}
