import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, finalize, take } from 'rxjs';

import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { TourneeApiService } from '../../../tournees/services/tournee-api.service';
import { CollecteApiService, DropdownUser } from '../../services/collecte-api.service';

export interface LogistiqueCollecte {
  id: string;
  vergerId?: string;
  vergerNom?: string;
  datePrevue: string;
  statut: string;
  chefRecolteNom?: string;
  chefRecolteId?: string;
  responsableAffectationId?: string;
  responsableAffectationNom?: string;
  equipeIds?: string[];
  equipe?: { id: string; nom: string }[];
}

@Component({
  selector: 'app-logistique-collecte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './logistique-collecte.html',
  styleUrl: './logistique-collecte.css',
})
export class LogistiqueCollecteComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  collectes: LogistiqueCollecte[] = [];
  isLoading = false;
  error = '';

  // Pagination locale
  currentPage = 0;
  pageSize = 6;
  totalPages = 1;
  totalItems = 0;
  allCollectes: LogistiqueCollecte[] = []; // liste complète pour pagination locale
  filterStatut = '';

  // Panel équipe
  showEquipePanel = false;
  activeCollecte: LogistiqueCollecte | null = null;
  ouvriers: DropdownUser[] = [];
  selectedOuvrierIds: Set<string> = new Set();
  isSubmittingEquipe = false;

  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  readonly statuts = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

  constructor(
    private tourneeApi: TourneeApiService,
    private collecteApi: CollecteApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOuvriers();
    this.loadCollectes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOuvriers(): void {
    this.collecteApi.getUsersByRole('OUVRIER').pipe(take(1)).subscribe({
      next: (res) => {
        this.ouvriers = res.users ?? [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

loadCollectes(): void {
  this.isLoading = true;
  this.error = '';

  this.tourneeApi
    .getMesCollectes(0, 100, this.filterStatut || undefined)
    .pipe(finalize(() => { this.isLoading = false; this.cdr.detectChanges(); }))
    .subscribe({
      next: (res: any) => {
        console.log('[mes-collectes] réponse brute:', JSON.stringify(res));

        // ApiResponse { success, message, data: PaginatedResponse { items, ... } }
        let raw: any[] = [];

        if (res?.data?.items) {
          // Cas : ApiResponse wrapping PaginatedResponse
          raw = res.data.items;
        } else if (Array.isArray(res?.data)) {
          // Cas : ApiResponse wrapping List directement
          raw = res.data;
        } else if (res?.items) {
          // Cas : PaginatedResponse directement
          raw = res.items;
        } else if (Array.isArray(res)) {
          // Cas : tableau brut
          raw = res;
        }

        console.log('[mes-collectes] collectes extraites:', raw.length, raw);

        this.allCollectes = raw;
        this.totalItems = raw.length;
        this.currentPage = 0;
        this.applyPagination();
      },
      error: (err: any) => {
        console.error('[mes-collectes] ERREUR HTTP:', err.status, err.error);
        this.error = 'Impossible de charger les collectes.';
        this.cdr.detectChanges();
      },
    });
}

  private applyPagination(): void {
    // Filtre statut côté front si besoin
    const filtered = this.filterStatut
      ? this.allCollectes.filter(c => c.statut === this.filterStatut)
      : this.allCollectes;

    this.totalItems = filtered.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

    const start = this.currentPage * this.pageSize;
    this.collectes = filtered.slice(start, start + this.pageSize);
    this.cdr.detectChanges();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    // Si le filtre est géré backend, relancer loadCollectes()
    // Ici on filtre aussi localement pour réactivité immédiate
    this.applyPagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  // ── Panel équipe ──────────────────────────────────────────

  openEquipePanel(c: LogistiqueCollecte): void {
    this.activeCollecte = c;
    this.selectedOuvrierIds = new Set(c.equipeIds ?? []);
    this.showEquipePanel = true;
    this.cdr.detectChanges();
  }

  closeEquipePanel(): void {
    this.showEquipePanel = false;
    this.activeCollecte = null;
    this.selectedOuvrierIds.clear();
    this.cdr.detectChanges();
  }

  toggleOuvrier(id: string): void {
    if (this.selectedOuvrierIds.has(id)) {
      this.selectedOuvrierIds.delete(id);
    } else {
      this.selectedOuvrierIds.add(id);
    }
    this.cdr.detectChanges();
  }

  isSelected(id: string): boolean {
    return this.selectedOuvrierIds.has(id);
  }

  saveEquipe(): void {
    if (!this.activeCollecte?.id) return;
    this.isSubmittingEquipe = true;

    this.tourneeApi
      .affecterEquipe(this.activeCollecte.id, Array.from(this.selectedOuvrierIds))
      .pipe(finalize(() => { this.isSubmittingEquipe = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (res: any) => {
          if (res?.success === false) {
            this.showToast(res?.message ?? 'Erreur serveur.', 'error');
            return;
          }
          this.showToast('Équipe mise à jour avec succès.', 'success');
          this.closeEquipePanel();
          this.loadCollectes();
        },
        error: (err: any) => {
          const msg = err?.error?.message ?? 'Erreur lors de la mise à jour.';
          this.showToast(msg, 'error');
        },
      });
  }

  // ── Helpers ───────────────────────────────────────────────

  get equipeLabel(): string {
    if (!this.activeCollecte) return '';
    return `${this.activeCollecte.vergerNom ?? '—'} · ${this.activeCollecte.datePrevue}`;
  }

  formatStatut(s: string): string {
    return (
      ({ PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée' } as Record<string, string>)[s] ?? s
    );
  }

  statutClass(s: string): string {
    return (
      ({
        PLANIFIEE: 'badge-planifiee',
        EN_COURS: 'badge-encours',
        TERMINEE: 'badge-terminee',
        ANNULEE: 'badge-annulee',
      } as Record<string, string>)[s] ?? ''
    );
  }

  userLabel(u: DropdownUser): string {
    return `${u.prenom ?? ''} ${u.nom ?? ''}`.trim();
  }

  userInitials(u: DropdownUser): string {
    return `${(u.prenom ?? ' ')[0]}${(u.nom ?? ' ')[0]}`.toUpperCase();
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();
    setTimeout(() => { this.toast.show = false; this.cdr.detectChanges(); }, 3500);
  }
}
