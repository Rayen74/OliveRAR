import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { DashboardComponent } from './responsableCooperative/components/dashboard/dashboard';
import { UsersComponent } from './responsableCooperative/components/users/users';
import { ProfileComponent } from './responsableCooperative/components/profile/profile';
import { authGuard } from './auth/auth.guard';
import { responsableCooperativeGuard } from './auth/responsable-cooperative.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: 'responsable',
    canActivate: [authGuard, responsableCooperativeGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: UsersComponent },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
