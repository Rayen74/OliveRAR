import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type * as Leaflet from 'leaflet';

export interface MapPosition {
  latitude: number;
  longitude: number;
}

export interface VergerMapMarker extends MapPosition {
  id: string;
  title: string;
  subtitle?: string;
}

@Component({
  selector: 'app-verger-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verger-map.html',
  styleUrl: './verger-map.css'
})
export class VergerMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() markers: VergerMapMarker[] = [];
  @Input() interactive = false;
  @Input() selectedPosition: MapPosition | null = null;
  @Input() selectedMarkerId: string | null = null;
  @Input() mapHeight = 360;
  @Input() emptyMessage = 'Aucun verger localisable pour le moment.';

  @Output() positionSelected = new EventEmitter<MapPosition>();
  @Output() markerSelected = new EventEmitter<VergerMapMarker>();

  @ViewChild('mapHost', { static: true }) private readonly mapHost?: ElementRef<HTMLDivElement>;

  private leaflet?: typeof Leaflet;
  private map?: Leaflet.Map;
  private tileLayer?: Leaflet.TileLayer;
  private markerLayer?: Leaflet.LayerGroup | any;
  private selectionMarker?: Leaflet.Marker;
  private readonly defaultCenter: [number, number] = [34.7398, 10.7603];

  protected hasVisibleData = false;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.mapHost) {
      return;
    }

    await this.ensureLeaflet();
    this.initializeMap();
    this.renderMapState();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }

    this.renderMapState();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private async ensureLeaflet(): Promise<void> {
    if (this.leaflet) {
      return;
    }

    const leafletModule = await import('leaflet');
    await import('leaflet.markercluster');
    this.leaflet = leafletModule;
  }

  private initializeMap(): void {
    if (!this.leaflet || !this.mapHost) {
      return;
    }

    this.map = this.leaflet.map(this.mapHost.nativeElement, {
      center: this.defaultCenter,
      zoom: 7,
      zoomControl: true
    });

    this.tileLayer = this.leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });
    this.tileLayer.addTo(this.map);

    if (this.interactive) {
      this.map.on('click', (event: Leaflet.LeafletMouseEvent) => {
        const position = {
          latitude: Number(event.latlng.lat.toFixed(6)),
          longitude: Number(event.latlng.lng.toFixed(6))
        };

        this.positionSelected.emit(position);
      });
    }

    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private renderMapState(): void {
    if (!this.leaflet || !this.map) {
      return;
    }

    this.markerLayer?.remove();
    this.selectionMarker?.remove();

    const validMarkers = this.markers.filter((marker) =>
      this.isValidCoordinates(marker.latitude, marker.longitude)
    );

    this.hasVisibleData = this.interactive || validMarkers.length > 0;
    this.markerLayer = this.buildMarkerLayer(validMarkers);
    this.markerLayer.addTo(this.map);

    if (this.isValidCoordinates(this.selectedPosition?.latitude, this.selectedPosition?.longitude)) {
      this.selectionMarker = this.leaflet.marker(
        [this.selectedPosition!.latitude, this.selectedPosition!.longitude],
        { icon: this.buildMarkerIcon(true) }
      );
      this.selectionMarker.addTo(this.map);
    }

    this.fitMap(validMarkers);
  }

  private buildMarkerLayer(markers: VergerMapMarker[]): Leaflet.LayerGroup | any {
    if (!this.leaflet) {
      throw new Error('Leaflet is not loaded.');
    }

    const useCluster = markers.length >= 12 && typeof (this.leaflet as any).markerClusterGroup === 'function';
    const layerGroup = useCluster
      ? (this.leaflet as any).markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true
        })
      : this.leaflet.layerGroup();

    markers.forEach((marker) => {
      const leafletMarker = this.leaflet!.marker([marker.latitude, marker.longitude], {
        icon: this.buildMarkerIcon(marker.id === this.selectedMarkerId)
      });

      const popupParts = [marker.title];
      if (marker.subtitle) {
        popupParts.push(marker.subtitle);
      }

      leafletMarker.bindPopup(popupParts.join('<br>'));
      leafletMarker.on('click', () => this.markerSelected.emit(marker));
      layerGroup.addLayer(leafletMarker);
    });

    return layerGroup;
  }

  private buildMarkerIcon(isSelected: boolean): Leaflet.DivIcon {
    return this.leaflet!.divIcon({
      className: 'verger-map-marker-wrapper',
      html: `<span class="verger-map-marker${isSelected ? ' is-selected' : ''}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  private fitMap(markers: VergerMapMarker[]): void {
    if (!this.leaflet || !this.map) {
      return;
    }

    if (markers.length > 0) {
      const bounds = this.leaflet.latLngBounds(
        markers.map((marker) => [marker.latitude, marker.longitude] as [number, number])
      );
      this.map.fitBounds(bounds.pad(0.2));
      return;
    }

    if (this.isValidCoordinates(this.selectedPosition?.latitude, this.selectedPosition?.longitude)) {
      this.map.setView([this.selectedPosition!.latitude, this.selectedPosition!.longitude], 14);
      return;
    }

    this.map.setView(this.defaultCenter, 7);
  }

  private isValidCoordinates(latitude: number | undefined, longitude: number | undefined): boolean {
    return Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && (latitude as number) >= -90
      && (latitude as number) <= 90
      && (longitude as number) >= -180
      && (longitude as number) <= 180
      && !((latitude as number) === 0 && (longitude as number) === 0);
  }
}
