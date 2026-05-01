import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'loading';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastItem[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();
  private nextId = 1;

  show(message: string, type: ToastType, durationMs = 2000): number {
    const toast: ToastItem = {
      id: this.nextId++,
      message,
      type
    };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(toast.id), durationMs);
    }

    return toast.id;
  }

  success(message: string, durationMs = 2000): number {
    return this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 2000): number {
    return this.show(message, 'error', durationMs);
  }

  loading(message: string): number {
    return this.show(message, 'loading', 0);
  }

  dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  update(id: number, message: string, type: ToastType, durationMs = 2000): void {
    const updated = this.toastsSubject.value.map((toast) =>
      toast.id === id ? { ...toast, message, type } : toast
    );
    this.toastsSubject.next(updated);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }
}
