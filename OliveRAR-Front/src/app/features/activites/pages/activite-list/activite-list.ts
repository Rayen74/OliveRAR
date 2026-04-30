import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, BehaviorSubject, takeUntil, debounceTime, distinctUntilChanged, finalize, merge, of, interval, startWith, switchMap, catchError, filter, take, map, delay } from 'rxjs';

import { ActiviteService } from '../../services/activite.service';
import { AuthService, User } from '../../../../core/auth/auth.service';
import {
  Activite,
  ActiviteFilters,
  ActivitePaginatedResponse,
  MODULE_LABELS,
  MODULE_COLORS,
  MODULES_LIST
} from '../../models/activite.model';
import { Role } from '../../../../core/auth/auth.service';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';

function groupByDate(activites: Activite[]): { date: string; items: Activite[] }[] {
  const map = new Map<string, Activite[]>();
  for (const a of activites) {
    if (!a || !a.dateAction) continue;
    const key = String(a.dateAction).substring(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

@Component({
  selector: 'app-activite-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, TitleCasePipe, MatIconModule],
  templateUrl: './activite-list.html',
  styleUrl: './activite-list.css'
})
export class ActiviteListComponent implements OnInit, OnDestroy {

  // ---- state ----
  filtresForm!: FormGroup;
  groupes: { date: string; items: Activite[] }[] = [];
  pagination!: ActivitePaginatedResponse;
  loading = false;
  error: string | null = null;

  // ---- meta ----
  modules = MODULES_LIST;
  moduleLabels = MODULE_LABELS;
  moduleColors = MODULE_COLORS;
  isAdmin = false;
  currentUserId = '';

  private readonly page$ = new BehaviorSubject<number>(0);
  private readonly manualRefresh$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly activiteService: ActiviteService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // 1. Initialiser le formulaire
    this.filtresForm = this.fb.group({
      module: [''],
      type:   [''],
      debut:  [''],
      fin:    [''],
    });

    // 2. Attendre que l'utilisateur soit chargé pour déterminer les droits
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((user: User | null) => {
      if (user) {
        this.isAdmin = user.role === Role.RESPONSABLE_COOPERATIVE;
        this.currentUserId = user.id ?? '';
      }
    });

    // 3. Pipeline de chargement réactif (Attendre la session + Initial + Filtres + Auto-refresh)
    this.filtresForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(() => this.page$.next(0));

    this.authService.sessionReady$.pipe(
      filter(ready => !!ready),
      delay(0), // Senior approach: stabilisation technique
      take(1),
      switchMap(() => merge(
        this.page$,
        this.manualRefresh$.pipe(map(() => this.page$.value)),
        interval(30000).pipe(map(() => this.page$.value))
      )),
      switchMap((page) => {
        this.loading = true;
        this.error = null;
        const v = this.filtresForm.getRawValue();
        const filters: ActiviteFilters = {
          page: Number(page),
          size: 15,
          module: v.module || undefined,
          type:   v.type   || undefined,
          debut:  v.debut  || undefined,
          fin:    v.fin    || undefined,
        };
        return this.activiteService.getActivites(filters).pipe(
          catchError(err => {
            this.error = err?.error?.message ?? 'Erreur de connexion.';
            return of(null);
          }),
          finalize(() => { this.loading = false; })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(resp => {
      if (resp) {
        setTimeout(() => {
          this.pagination = resp;
          this.groupes = groupByDate(resp.items ?? []);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPage(page: number): void {
    this.page$.next(page);
  }



  reset(): void {
    this.filtresForm.reset({ module: '', type: '', debut: '', fin: '' });
  }

  /** Friendly time from ISO */
  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /** Friendly label for grouped date header */
  formatDateHeader(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  getBadgeColor(module: string): string {
    return this.moduleColors[module] ?? 'var(--badge-gray)';
  }

  getModuleLabel(module: string): string {
    return this.moduleLabels[module] ?? module;
  }

  getPages(): number[] {
    if (!this.pagination) return [];
    return Array.from({ length: this.pagination.totalPages }, (_, i) => i);
  }

  get currentPage(): number {
    return this.pagination ? this.pagination.page - 1 : 0;
  }
}
