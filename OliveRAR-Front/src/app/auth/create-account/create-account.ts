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
    // ✅ FIX: Removed NgZone — same reason as login.ts. HTTP callbacks already run
    //         inside Angular's zone; wrapping them in ngZone.run() again created a
    //         re-entrant zone execution where detectChanges() could fire before the
    //         toast assignment landed, causing the notification to silently disappear.
  ) {
    this.registerForm = this.fb.group({
      prenom: [''],
      nom: [''],
      email: [''],
      password: [''],
      confirmPassword: [''],
      role: [Role.AGRICULTEUR]
    });
  }

  get prenom() { return this.registerForm.get('prenom')!; }
  get nom() { return this.registerForm.get('nom')!; }
  get email() { return this.registerForm.get('email')!; }
  get password() { return this.registerForm.get('password')!; }
  get confirmPassword() { return this.registerForm.get('confirmPassword')!; }
  get role() { return this.registerForm.get('role')!; }

  togglePwd() { this.showPwd = !this.showPwd; }

  // ✅ FIX: Simplified showNotification — direct state assignment + detectChanges().
  //         The duration is parameterised so success toasts can stay visible longer
  //         than error toasts (used below for the redirect countdown).
  showNotification(message: string, type: 'success' | 'error', duration: number = 4000) {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, duration);
  }

  onSubmit() {
    const { prenom, nom, email, password, confirmPassword, role } = this.registerForm.value;

    if (!prenom || !nom || !email || !password || !confirmPassword) {
      this.showNotification('Veuillez remplir tous les champs.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      this.showNotification('Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    console.log('Initiating registration for:', email);

    const registerRequest: RegisterRequest = { nom, prenom, email, password, role };

    this.authService.register(registerRequest).subscribe({
      next: (response: AuthResponse) => {
        console.log('[Register] Complete Response:', response);
        this.loading = false;
        this.cdr.detectChanges();

        if (response.success || response.id) {
          console.log('[Register] Success detected');
          // ✅ FIX: The original code used a 3500 ms redirect with ngZone.run().
          //         Because ngZone.run() conflicted with the already-active zone,
          //         the toast assignment was never committed to the view — the user
          //         saw the component navigate away with NO visible message.
          //
          //         Fix: showNotification now sets state synchronously + detectChanges(),
          //         so the toast renders immediately. The redirect is kept at 3 s to give
          //         the user a clear window to read the confirmation before leaving.
          this.showNotification('Compte créé avec succès ! Redirection dans 3 secondes…', 'success', 4000);
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          console.warn('Registration failed for:', email, '-', response.message);
          this.showNotification(response.message || 'Échec de la création du compte.', 'error');
        }
      },
      error: (err) => {
        this.loading = false;
        // ✅ FIX: Added detectChanges() here — identical issue to the login error path.
        //         Without it, the backend's password-validation message was extracted
        //         correctly (visible in the console) but the UI stayed on the loading
        //         spinner with no toast because the view was never updated.
        this.cdr.detectChanges();
        console.error('Registration error for:', email, err);
        const backendMessage = err?.error?.message;
        this.showNotification(
          backendMessage || 'Une erreur est survenue lors de la création du compte. Veuillez réessayer.',
          'error'
        );
      }
    });
  }
}