import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../../../core/auth/auth.service';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { SignalementApiService } from '../../../signalements/services/signalement-api.service';
import { Signalement } from '../../../signalements/models/signalement.model';

interface NotificationViewModel {
  title: string;
  description: string;
  date: string;
  status: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './notifications.html'
})
export class NotificationsComponent implements OnInit {
  notifications: NotificationViewModel[] = [];
  loading = true;
  error = '';
  user: User | null = null;

  constructor(
    private readonly signalementApi: SignalementApiService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getConnectedUser();
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.signalementApi.getMine().subscribe({
      next: (signalements) => {
        this.notifications = signalements.map((signalement: Signalement) => ({
          title: signalement.issueType || 'Signalement',
          description: signalement.description,
          date: signalement.createdAt || '',
          status: signalement.status
        }));
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur de chargement des signalements.';
        this.loading = false;
      }
    });
  }
}
