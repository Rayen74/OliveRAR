import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, Role, RegisterRequest, AuthResponse } from '../auth.service';

@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-account.html',
  styles: [`
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
export class CreateAccountComponent {
  registerForm: FormGroup;
  loading = false;
  errorMsg = '';
  showPwd = false;

  toast: { message: string, type: 'success' | 'error', show: boolean } = {
    message: '',
    type: 'success',
    show: false
  };

  roles = Object.values(Role);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      prenom: [''],
      nom: [''],
      email: [''],
      phoneNumber: [''],
      password: [''],
      confirmPassword: [''],
      role: [Role.AGRICULTEUR]
    });
  }

  get prenom() { return this.registerForm.get('prenom')!; }
  get nom() { return this.registerForm.get('nom')!; }
  get email() { return this.registerForm.get('email')!; }
  get phoneNumber() { return this.registerForm.get('phoneNumber')!; }
  get password() { return this.registerForm.get('password')!; }
  get confirmPassword() { return this.registerForm.get('confirmPassword')!; }
  get role() { return this.registerForm.get('role')!; }

  togglePwd() { this.showPwd = !this.showPwd; }

  get phoneError(): string {
    const value = (this.phoneNumber.value || '').trim();
    if (!value) {
      return '';
    }
    return /^\d{8}$/.test(value) ? '' : 'Le numero doit contenir exactement 8 chiffres.';
  }

  showNotification(message: string, type: 'success' | 'error', duration: number = 4000) {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, duration);
  }

  onSubmit() {
    const { prenom, nom, email, phoneNumber, password, confirmPassword, role } = this.registerForm.value;

    if (!prenom || !nom || !email || !phoneNumber || !password || !confirmPassword) {
      this.showNotification('Veuillez remplir tous les champs.', 'error');
      return;
    }
    if (this.phoneError) {
      this.showNotification(this.phoneError, 'error');
      return;
    }
    if (password !== confirmPassword) {
      this.showNotification('Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const registerRequest: RegisterRequest = { nom, prenom, email, phoneNumber, password, role };

    this.authService.register(registerRequest).subscribe({
      next: (response: AuthResponse) => {
        this.loading = false;
        this.cdr.detectChanges();

        if (response.success || response.id) {
          this.showNotification('Compte cree avec succes ! Redirection dans 3 secondes...', 'success', 4000);
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.showNotification(response.message || 'Echec de la creation du compte.', 'error');
        }
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        const backendMessage = err?.error?.message;
        this.showNotification(
          backendMessage || 'Une erreur est survenue lors de la creation du compte. Veuillez reessayer.',
          'error'
        );
      }
    });
  }
}
