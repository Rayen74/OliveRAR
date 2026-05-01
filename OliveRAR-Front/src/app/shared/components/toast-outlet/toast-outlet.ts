import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-outlet.html'
})
export class ToastOutletComponent implements OnInit, OnDestroy {
  toasts: ToastItem[] = [];
  private sub: Subscription | null = null;

  constructor(
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub = this.toastService.toasts$.subscribe(list => {
      this.toasts = list;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
    this.cdr.detectChanges();
  }
}
