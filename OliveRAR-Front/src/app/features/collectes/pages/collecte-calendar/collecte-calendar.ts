import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';

import { CollecteApiService, CollecteCalendarItem } from '../../services/collecte-api.service';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';

interface SelectedEvent {
  id: string;
  title: string;
  datePrevue: string;
  statut: string;
  vergerNom: string;
  chefRecolteNom: string;
  equipeSize: number;
}

@Component({
  selector: 'app-collecte-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule, FullCalendarModule, SidebarComponent],
  templateUrl: './collecte-calendar.html',
  styleUrl: './collecte-calendar.css',
})
export class CollecteCalendarComponent implements OnInit {
  isLoading = true;
  error = '';
  selectedEvent: SelectedEvent | null = null;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: frLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek',
    },
    events: [],
    eventClick: this.onEventClick.bind(this),
    eventDisplay: 'block',
    dayMaxEvents: 3,
    height: 'auto',
  };

  constructor(
    private collecteApi: CollecteApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      if (this.isLoading) {
        this.error = "Timeout : la requête API n'a pas répondu ou s'est bloquée.";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 10000);

    this.collecteApi.getCalendarData().subscribe({
      next: (res) => {
        try {
          const events = (res.data ?? []).map((item: CollecteCalendarItem) => ({
            id: item.id,
            title: item.vergerNom || 'Collecte',
            date: item.datePrevue,
            backgroundColor: this.statutColor(item.statut),
            borderColor: this.statutBorderColor(item.statut),
            textColor: '#ffffff',
            extendedProps: {
              statut: item.statut,
              vergerNom: item.vergerNom,
              chefRecolteNom: item.chefRecolteNom,
              equipeSize: item.equipeSize,
            },
          }));
          this.calendarOptions = { ...this.calendarOptions, events };
          this.isLoading = false;
          this.cdr.detectChanges();
        } catch (err: unknown) {
          this.error = "Erreur JS lors du rendu : " + (err instanceof Error ? err.message : String(err));
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err: unknown) => {
        this.error = 'Erreur HTTP API : ' + (err instanceof Error ? err.message : String(err));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onEventClick(info: EventClickArg): void {
    this.selectedEvent = {
      id: info.event.id,
      title: info.event.title,
      datePrevue: info.event.startStr,
      statut: info.event.extendedProps['statut'],
      vergerNom: info.event.extendedProps['vergerNom'],
      chefRecolteNom: info.event.extendedProps['chefRecolteNom'],
      equipeSize: info.event.extendedProps['equipeSize'],
    };
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.selectedEvent = null;
    this.cdr.detectChanges();
  }

  formatStatut(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'Planifiée',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
    };
    return map[statut] ?? statut;
  }

  statutBadgeClass(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: 'badge-planifiee',
      EN_COURS: 'badge-encours',
      TERMINEE: 'badge-terminee',
      ANNULEE: 'badge-annulee',
    };
    return map[statut] ?? '';
  }

  private statutColor(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: '#8a9e3a',
      EN_COURS: '#f5b731',
      TERMINEE: '#5f6e27',
      ANNULEE: '#ef4444',
    };
    return map[statut] ?? '#8a9e3a';
  }

  private statutBorderColor(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIEE: '#5f6e27',
      EN_COURS: '#c47c18',
      TERMINEE: '#3a4418',
      ANNULEE: '#991b1b',
    };
    return map[statut] ?? '#5f6e27';
  }
}
