import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private nonLuesSubject = new BehaviorSubject<number>(0);
  nonLues$ = this.nonLuesSubject.asObservable();

  setNonLues(count: number) {
    this.nonLuesSubject.next(count);
  }

  decrement() {
    const current = this.nonLuesSubject.getValue();
    if (current > 0) this.nonLuesSubject.next(current - 1);
  }
}
