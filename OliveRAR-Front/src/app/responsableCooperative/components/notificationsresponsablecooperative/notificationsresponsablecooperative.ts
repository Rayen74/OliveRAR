import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { NotificationService } from '../../../shared/services/notification';
import { AlertApiService, AlertItem } from '../../../shared/services/alert-api.service';

@Component({
  selector: 'app-notificationsresponsablecooperative',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './notificationsresponsablecooperative.html'
})
export class NotificationsresponsablecooperativeComponent implements OnInit {
  alerts: AlertItem[] = [];
  loading = false;
  error = '';

  constructor(
    private alertApi: AlertApiService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadAlerts();
  }

  loadAlerts() {
    this.loading = true;
    this.error = '';
    this.alertApi.getByRole('RESPONSABLE_COOPERATIVE').subscribe({
      next: (data) => {
        this.alerts = data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.loading = false;
        this.notificationService.setNonLues(this.alerts.filter((a) => !a.lu).length);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Erreur chargement notifications.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  marquerLu(alert: AlertItem) {
    if (alert.lu) {
      return;
    }

    alert.lu = true;
    this.notificationService.setNonLues(this.alerts.filter((item) => !item.lu).length);
    this.cdr.detectChanges();

    this.alertApi.markAsRead(alert.id).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: () => {
        alert.lu = false;
        this.notificationService.setNonLues(this.alerts.filter((item) => !item.lu).length);
        this.cdr.detectChanges();
      }
    });
  }

  get nonLues(): number {
    return this.alerts.filter((a) => !a.lu).length;
  }
}
