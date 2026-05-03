import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, delay, filter, take } from 'rxjs';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { DashboardApiService } from '../../../../shared/services/dashboard-api.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  kpis: any = null;
  loading = false;
  error = '';
  selectedPeriod = 'month';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dashboardApi: DashboardApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.sessionReady$
      .pipe(filter((ready) => !!ready), delay(0), take(1))
      .subscribe(() => {
        this.loadKPIs();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadKPIs(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.dashboardApi.getCooperativeKPIs(this.selectedPeriod).subscribe({
      next: (data) => {
        this.kpis = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = 'Erreur lors du chargement des indicateurs.';
        this.cdr.markForCheck();
      }
    });
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.loadKPIs();
  }

  getSelectedPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'day':
        return "Aujourd'hui";
      case 'week':
        return 'Cette semaine';
      case 'month':
      default:
        return 'Ce mois';
    }
  }

  getTrendSubtitle(): string {
    switch (this.selectedPeriod) {
      case 'day':
        return 'Evolution de la production du jour (kg)';
      case 'week':
        return 'Evolution hebdomadaire de la production (kg)';
      case 'month':
      default:
        return 'Evolution mensuelle de la production (kg)';
    }
  }

  getTrendLegendLabel(): string {
    switch (this.selectedPeriod) {
      case 'day':
        return 'Production kg / heure';
      case 'week':
        return 'Production kg / semaine';
      case 'month':
      default:
        return 'Production kg / mois';
    }
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITIQUE':
        return '#ef4444';
      case 'MOYENNE':
        return '#f97316';
      case 'FAIBLE':
        return '#eab308';
      default:
        return '#6b7280';
    }
  }

  getTrendMaxValue(): number {
    if (!this.kpis?.performance?.harvestTrend?.length) {
      return 100;
    }

    const max = Math.max(...this.kpis.performance.harvestTrend.map((t: any) => t.quantity));
    return max > 0 ? max : 100;
  }

  getCurvePath(isArea: boolean): string {
    const trend = this.kpis?.performance?.harvestTrend;
    if (!trend || trend.length === 0) {
      return '';
    }

    const max = this.getTrendMaxValue();
    const count = trend.length;
    const stepX = 100 / count;

    const points = trend.map((item: any, i: number) => {
      const x = i * stepX + stepX / 2;
      const topPadding = 8;
      const bottomLine = 100;
      const usableHeight = bottomLine - topPadding;
      const y = bottomLine - (item.quantity / max) * usableHeight;
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }

    if (isArea) {
      d += ` L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
    }

    return d;
  }

  getYAxisLabels(): number[] {
    const max = this.getTrendMaxValue();
    return [
      Math.round(max),
      Math.round(max * 0.75),
      Math.round(max * 0.5),
      Math.round(max * 0.25),
      0
    ];
  }

  getActivityUnitLabel(): string {
    const total = this.kpis?.activity?.total ?? 0;
    return total > 1 ? 'activités' : 'activité';
  }
}
