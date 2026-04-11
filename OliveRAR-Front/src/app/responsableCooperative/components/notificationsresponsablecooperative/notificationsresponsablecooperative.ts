import { Component, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { NotificationService } from '../../../shared/services/notification';

interface Alert {
  id: string;
  type: string;
  description: string;
  vergerId: string;
  nomVerger: string;
  localisationVerger: string;
  rendementEstime: number;
  typeOlive: string;
  nombreArbres: number;
  superficie: number;
  agriculteurId: string;
  nomAgriculteur: string;
  prenomAgriculteur: string;
  destinataireRole: string;
  lu: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-notificationsresponsablecooperative',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './notificationsresponsablecooperative.html'
})
export class NotificationsresponsablecooperativeComponent implements OnInit {
  alerts: Alert[] = [];
  loading = false;
  error = '';

  private apiUrl = 'http://localhost:8080/api/alerts';

  constructor(
    private http: HttpClient,
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
    this.http.get<Alert[]>(`${this.apiUrl}/role/RESPONSABLE_COOPERATIVE`).subscribe({
      next: (data) => {
        this.alerts = data.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.loading = false;
        this.notificationService.setNonLues(this.alerts.filter(a => !a.lu).length);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Erreur chargement notifications.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  marquerLu(alert: Alert) {
    this.http.put(`${this.apiUrl}/${alert.id}/lu`, {}).subscribe({
      next: () => {
        alert.lu = true;
        this.notificationService.decrement();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  get nonLues(): number {
    return this.alerts.filter(a => !a.lu).length;
  }
}
