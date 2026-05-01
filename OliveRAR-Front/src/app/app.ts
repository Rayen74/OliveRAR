import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './shared/components/toast-outlet/toast-outlet';
import { ChatWidgetComponent } from './shared/components/chat-widget/chat-widget';
import { AuthService, Role } from './auth/auth.service';
import { map } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent, ChatWidgetComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('OliveRAR');
  readonly isLoggedIn$;
  readonly isCooperativeManager$;

  constructor(private readonly authService: AuthService) {
    this.isLoggedIn$ = this.authService.currentUser$.pipe(map(u => !!u));
    this.isCooperativeManager$ = this.authService.currentUser$.pipe(
      map(u => u?.role === Role.RESPONSABLE_COOPERATIVE)
    );
  }
}
