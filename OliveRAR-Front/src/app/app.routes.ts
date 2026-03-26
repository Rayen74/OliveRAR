import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { CreateAccountComponent } from './auth/create-account/create-account';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'create-account', component: CreateAccountComponent }
];
