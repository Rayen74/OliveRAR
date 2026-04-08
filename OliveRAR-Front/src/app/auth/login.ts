import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthResponse, Role } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styles: [`
    @keyframes crossfade {
      0% { opacity: 0; }
      4% { opacity: 1; }
      20% { opacity: 1; }
      26% { opacity: 0; }
      100% { opacity: 0; }
    }
    .photo-slide {
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      animation: crossfade 25s linear infinite;
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }
    .toast-success {
      background-color: #f0fdf4 !important;
      border-color: #bbf7d0 !important;
      color: #166534 !important;
    }
    .toast-error {
      background-color: #fef2f2 !important;
      border-color: #fecaca !important;
      color: #991b1b !important;
    }
  `]
})
export class LoginComponent {

  loginForm: FormGroup;
  loading = false;
  errorMsg = '';
  showPwd = false;

  toast: { message: string, type: 'success' | 'error', show: boolean } = {
    message: '',
    type: 'success',
    show: false
  };

  photos = [
    '/images/1.png',
    '/images/2.png',
    '/images/3.png',
    '/images/4.png',
    '/images/5.png'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
    // ✅ FIX: Removed NgZone — HTTP observables already run inside Angular's zone.
    //         Using ngZone.run() when already inside the zone caused a timing conflict
    //         where detectChanges() fired before the property assignment was committed,
    //         so the toast silently failed to render.
  ) {
    this.loginForm = this.fb.group({
      email: [''],
      password: ['']
    });
  }

  get email() { return this.loginForm.get('email')!; }
  get password() { return this.loginForm.get('password')!; }

  togglePwd() { this.showPwd = !this.showPwd; }

  // ✅ FIX: Simplified showNotification — no more ngZone.run() wrapper.
  //         Sets toast state directly, then calls detectChanges() to force the view update
  //         synchronously. The previous ngZone.run() approach was redundant inside HTTP
  //         callbacks and caused the toast assignment to be skipped in the error path.
  showNotification(message: string, type: 'success' | 'error') {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  onSubmit() {
    if (!this.loginForm.value.email || !this.loginForm.value.password) {
      this.showNotification('Veuillez remplir tous les champs.', 'error');
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const credentials = this.loginForm.value;
    console.log('Initiating login for:', credentials.email);

    this.authService.login(credentials).subscribe({
      next: (response: AuthResponse) => {
        console.log('[Login] Complete Response:', response);
        this.loading = false;
        this.cdr.detectChanges();

        if (response.success) {
          console.log('[Login] Success detected');
          if (!response.user) {
            this.showNotification('Connexion refusée: utilisateur manquant.', 'error');
            return;
          }

          const token = response.token ?? `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          this.authService.setSession(token, response.user);
          this.showNotification('Connexion réussie ! Bienvenue.', 'success');

          const redirectPath = response.user.role === Role.RESPONSABLE_COOPERATIVE
            ? '/responsable/dashboard'
            : '/login';

          setTimeout(() => {
            this.router.navigate([redirectPath]);
          }, 1500);
        } else {
          console.warn('Login failed for:', credentials.email, '-', response.message);
          this.showNotification(response.message || 'Échec de la connexion.', 'error');
        }
      },
      error: (err) => {
        this.loading = false;
        // ✅ FIX: Added detectChanges() here so the spinner is dismissed BEFORE
        //         the toast is shown. Without this, loading stayed true while
        //         showNotification ran, leaving the UI stuck on the spinner
        //         and making the toast appear to do nothing.
        this.cdr.detectChanges();
        console.error('Login error for:', credentials.email, err);
        const backendMessage = err?.error?.message;
        this.showNotification(
          backendMessage || 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
          'error'
        );
      }
    });
  }
}
