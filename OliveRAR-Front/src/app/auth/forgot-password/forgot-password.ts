import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
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
export class ForgotPasswordComponent {

  forgotForm: FormGroup;
  loading = false;
  errorMsg = '';

  toast: { message: string, type: 'success' | 'error', show: boolean } = {
    message: '',
    type: 'success',
    show: false
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() { return this.forgotForm.get('email')!; }

  showNotification(message: string, type: 'success' | 'error', duration: number = 4000) {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, duration);
  }

  onSubmit() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    const email = this.forgotForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.showNotification(response.message || 'Un lien de réinitialisation a été envoyé à votre adresse email.', 'success');
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Forgot password error:', err);
        const backendMessage = err?.error?.message;
        this.showNotification(
          backendMessage || 'Une erreur est survenue.',
          'error'
        );
      }
    });
  }
}
