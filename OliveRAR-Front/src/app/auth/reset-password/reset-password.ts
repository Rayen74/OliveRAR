import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ErrorComponent } from '../../shared/components/error/error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ErrorComponent],
  templateUrl: './reset-password.html',
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
export class ResetPasswordComponent implements OnInit {

  resetForm: FormGroup;
  loading = false;
  token: string = '';
  tokenValid = true;
  errorMsg = '';

  toast: { message: string, type: 'success' | 'error', show: boolean } = {
    message: '',
    type: 'success',
    show: false
  };

  // Password validation methods
  getPasswordValidationErrors(password: string): string[] {
    const errors: string[] = [];

    if (!password) return errors;

    if (password.length < 8) {
      errors.push('Au moins 8 caractères');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Au moins un chiffre');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Au moins une lettre majuscule');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Au moins une lettre minuscule');
    }

    if (!/[@#$%^&+=!*?]/.test(password)) {
      errors.push('Au moins un caractère spécial (@#$%^&+=!*?)');
    }

    return errors;
  }

  get passwordErrors(): string[] {
    const passwordValue = this.resetForm.get('password')?.value || '';
    return this.getPasswordValidationErrors(passwordValue);
  }

  get isPasswordValid(): boolean {
    return this.passwordErrors.length === 0 && (this.resetForm.get('password')?.value?.length > 0);
  }

  get doPasswordsMatch(): boolean {
    const pwd = this.resetForm.get('password')?.value;
    const confirmPwd = this.resetForm.get('confirmPassword')?.value;
    return pwd && confirmPwd && pwd === confirmPwd;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.resetForm = this.fb.group({
      password: [''],
      confirmPassword: ['']
    });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.tokenValid = false;
      this.showNotification('Token de réinitialisation manquant.', 'error');
      return;
    }

    this.authService.validateResetToken(this.token).subscribe({
      next: () => {
        this.tokenValid = true;
      },
      error: (err) => {
        this.tokenValid = false;
        const backendMessage = err?.error?.message || 'Le lien de réinitialisation est invalide ou expiré.';
        this.errorMsg = backendMessage;
        this.showNotification(backendMessage, 'error');
      }
    });
  }

  showNotification(message: string, type: 'success' | 'error', duration: number = 2000) {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, duration);
  }

  onSubmit() {
    const { password, confirmPassword } = this.resetForm.value;

    if (!password || !confirmPassword) {
      this.showNotification('Veuillez remplir tous les champs.', 'error');
      return;
    }

    if (!this.isPasswordValid) {
      this.showNotification('Le mot de passe ne respecte pas les critères de sécurité.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      this.showNotification('Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    if (!this.tokenValid) {
      this.showNotification('Le lien de réinitialisation a expiré ou est invalide.', 'error');
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.authService.resetPassword(this.token, password).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.cdr.detectChanges();

        this.showNotification('Mot de passe réinitialisé avec succès ! Redirection...', 'success', 2000);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Password reset error:', err);
        const backendMessage = err?.error?.message;
        this.showNotification(
          backendMessage || 'Une erreur est survenue lors de la réinitialisation.',
          'error'
        );
      }
    });
  }
}
