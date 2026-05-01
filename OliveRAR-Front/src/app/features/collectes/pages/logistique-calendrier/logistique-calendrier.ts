import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import * as L from 'leaflet';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { TourneeApiService } from '../../../tournees/services/tournee-api.service';
import { CollecteApiService, CollecteCalendarItem } from '../../services/collecte-api.service';

// Fix icônes Leaflet avec Angular build
const iconDefault = L.icon({
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

interface DayDetail {
  date: string;
  collectes: CollecteCalendarItem[];
  tournees: any[];
}

@Component({
  selector: 'app-logistique-calendrier',
  standalone: true,
  imports: [CommonModule, RouterModule, FullCalendarModule, SidebarComponent],
  templateUrl: './logistique-calendrier.html',
  styleUrl: './logistique-calendrier.css',
})
export class LogistiqueCalendrierComponent implements OnInit, OnDestroy {
  isLoading = true;
  error = '';
  selectedDay: DayDetail | null = null;
  isMapLoading = false;

  allCollectes: CollecteCalendarItem[] = [];
  allTournees: any[] = [];

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

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
    dateClick: this.onDateClick.bind(this),
    eventDisplay: 'block',
    dayMaxEvents: 3,
    height: 'auto',
  };

  constructor(
    private tourneeApi: TourneeApiService,
    private collecteApi: CollecteApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  loadData(): void {
    this.isLoading = true;

    this.collecteApi.getCalendarData().subscribe({
      next: (res) => {
        this.allCollectes = res.data ?? [];
        this.buildCalendar();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger les données.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    this.tourneeApi.getCalendarTournees().subscribe({
      next: (res) => {
        this.allTournees = res.data ?? [];
        this.buildCalendar();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  private buildCalendar(): void {
    const collecteEvents = this.allCollectes.map(item => ({
      id: 'c_' + item.id,
      title: '🌿 ' + (item.vergerNom || 'Collecte'),
      date: item.datePrevue,
      backgroundColor: this.statutColor(item.statut),
      borderColor: this.statutBorderColor(item.statut),
      textColor: '#ffffff',
      extendedProps: { type: 'collecte', ...item },
    }));

    const tourneeEvents = this.allTournees.map(t => ({
      id: 't_' + t.id,
      title: '🚛 Tournée',
      date: t.datePrevue,
      backgroundColor: '#6366f1',
      borderColor: '#4338ca',
      textColor: '#ffffff',
      extendedProps: { type: 'tournee', ...t },
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: [...collecteEvents, ...tourneeEvents],
    };
    this.cdr.detectChanges();
  }

  onEventClick(info: EventClickArg): void {
    this.openDayDetail(info.event.startStr);
  }

  onDateClick(info: DateClickArg): void {
    this.openDayDetail(info.dateStr);
  }

  openDayDetail(date: string): void {
    const collectes = this.allCollectes.filter(c => {
      const cDate = typeof c.datePrevue === 'string' ? c.datePrevue : (c.datePrevue as any).toString();
      return cDate.includes(date);
    });
    const tournees = this.allTournees.filter(t => t.datePrevue === date);
    this.selectedDay = { date, collectes, tournees };
    this.cdr.detectChanges();

    // Initialiser la carte après que le DOM soit rendu
    if (collectes.length > 0) {
      setTimeout(() => this.initMap(collectes), 150);
    } else {
      this.destroyMap();
    }
  }

  closeDetail(): void {
    this.destroyMap();
    this.selectedDay = null;
    this.cdr.detectChanges();
  }

  // ─── Carte Leaflet ───────────────────────────────────────────

  private async initMap(collectes: CollecteCalendarItem[]): Promise<void> {
    this.destroyMap();
    this.isMapLoading = true;
    this.cdr.detectChanges();

    const el = document.getElementById('collectes-map');
    if (!el) { this.isMapLoading = false; return; }

    // Centre Tunisie par défaut
    this.map = L.map('collectes-map', { zoomControl: true }).setView([36.8, 10.1], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(this.map);

    for (const c of collectes) {
      let coords: [number, number] | null = null;

      // ✅ Priorité 1 : coordonnées GPS stockées directement
      if (c.vergerLat && c.vergerLng) {
        coords = [c.vergerLat, c.vergerLng];
      }
      // ✅ Priorité 2 : géocodage Nominatim (fallback)
      else if (c.vergerLocalisation) {
        coords = await this.geocode(c.vergerLocalisation);
      }

      if (coords && this.map) {
        const marker = L.marker(coords).addTo(this.map).bindPopup(`
          <div style="min-width:160px">
            <strong style="color:#5f6e27">${c.vergerNom}</strong><br>
            <span style="font-size:11px;color:#666">${c.vergerLocalisation}</span><br>
            <span style="font-size:11px">Chef : ${c.chefRecolteNom || '—'}</span><br>
            <span style="font-size:11px">${c.equipeSize ?? 0} ouvrier(s)</span>
          </div>
        `).openPopup(); // 👈 ouvre le popup directement
        this.markers.push(marker);
      }
    }

    // Centrer automatiquement sur les markers
    if (this.markers.length > 0 && this.map) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.4));
    }

    this.isMapLoading = false;
    this.cdr.detectChanges();
  }

  private async geocode(address: string): Promise<[number, number] | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=tn`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'fr', 'User-Agent': 'OliveRAR-App' }
      });
      const data = await res.json();
      if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch {}
    return null;
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
  }

  // ─── Helpers statut ──────────────────────────────────────────

  formatStatut(s: string): string {
    return { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' }[s] ?? s;
  }

  statutBadgeClass(s: string): string {
    return { PLANIFIEE: 'badge-planifiee', EN_COURS: 'badge-encours', TERMINEE: 'badge-terminee', ANNULEE: 'badge-annulee' }[s] ?? '';
  }

  private statutColor(s: string): string {
    return { PLANIFIEE: '#8a9e3a', EN_COURS: '#f5b731', TERMINEE: '#5f6e27', ANNULEE: '#ef4444' }[s] ?? '#8a9e3a';
  }

  private statutBorderColor(s: string): string {
    return { PLANIFIEE: '#5f6e27', EN_COURS: '#c47c18', TERMINEE: '#3a4418', ANNULEE: '#991b1b' }[s] ?? '#5f6e27';
  }

  formatTourneeStatut(s: string): string {
    return { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' }[s] ?? s;
  }
}
