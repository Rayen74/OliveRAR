import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthResponse, Role } from './auth.service';
import { AlertApiService, AlertItem } from '../shared/services/alert-api.service';
import { NotificationService } from '../shared/services/notification';

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
    private cdr: ChangeDetectorRef,
    private alertApi: AlertApiService,
    private notificationService: NotificationService
  ) {
    this.loginForm = this.fb.group({
      email: [''],
      password: ['']
    });
  }

  get email() { return this.loginForm.get('email')!; }
  get password() { return this.loginForm.get('password')!; }

  togglePwd() { this.showPwd = !this.showPwd; }

  showNotification(message: string, type: 'success' | 'error') {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  onSubmit() {
    if (!this.loginForm.value.email || !this.loginForm.value.password) {
      this.showNotification('Veuillez remplir tous les champs.', 'error');
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response: AuthResponse) => {
        this.loading = false;
        this.cdr.detectChanges();

        if (response.success && response.user) {

          const token = response.token ?? `session-${Date.now()}`;
          this.authService.setSession(token, response.user);

          // Load unread alerts immediately after login so the badge shows at once
          if (response.user.role === Role.RESPONSABLE_COOPERATIVE) {
            this.alertApi.getByRole('RESPONSABLE_COOPERATIVE').subscribe({
              next: (alerts) => {
                const count = alerts.filter((a: AlertItem) => !a.lu).length;
                this.notificationService.setNonLues(count);
              },
              error: () => { }
            });
          }

          this.showNotification('Connexion réussie ! Bienvenue.', 'success');

          // ====================== REDIRECTION SELON LE RÔLE ======================
          let redirectPath = '/login';

          switch (response.user.role) {
            case Role.RESPONSABLE_COOPERATIVE:
              redirectPath = '/responsable/dashboard';
              break;

            case Role.AGRICULTEUR:
              redirectPath = '/agriculteur/vergers';
              break;

            case Role.RESPONSABLE_LOGISTIQUE:
              redirectPath = '/responsable-logistique/equipements';
              break;

            case Role.RESPONSABLE_CHEF_RECOLTE:
              redirectPath = '/responsable-chef-recolte/profile';   // ← Important
              break;

            default:
              redirectPath = '/login';
              this.showNotification('Rôle non reconnu.', 'error');
          }

          // Redirection après le message de succès
          setTimeout(() => {
            this.router.navigate([redirectPath]);
          }, 1400);

        } else {
          this.showNotification(response.message || 'Échec de la connexion.', 'error');
        }
      },

      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();

        console.error('Login error:', err);

        const message = err?.error?.message || 'Une erreur est survenue lors de la connexion.';
        this.showNotification(message, 'error');
      }
    });
  }
}
