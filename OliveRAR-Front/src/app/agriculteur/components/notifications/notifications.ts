import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';
import { RouterLink } from '@angular/router';
import { AgriculteurSidebarComponent } from '../agriculteur-sidebar/agriculteur-sidebar';
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, AgriculteurSidebarComponent],
  templateUrl: './notifications.html'
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  error = '';
  user: any;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.user = this.authService.getConnectedUser();
    this.loadNotifications();
  }

  loadNotifications() {
    this.http.get<any[]>('http://localhost:8080/api/harvests').subscribe({
      next: (data) => { this.notifications = data; this.loading = false; },
      error: () => { this.error = 'Erreur chargement notifications.'; this.loading = false; }
    });
  }
}
