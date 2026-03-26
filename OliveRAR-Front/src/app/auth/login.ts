import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
  `]
})
export class LoginComponent {

  loginForm: FormGroup;
  loading = false;
  errorMsg = '';
  showPwd = false;

  photos = [
    '/images/1.png',
    '/images/2.png',
    '/images/3.png',
    '/images/4.png',
    '/images/5.png'
  ];

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get email() { return this.loginForm.get('email')!; }
  get password() { return this.loginForm.get('password')!; }

  togglePwd() { this.showPwd = !this.showPwd; }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
  }
}
