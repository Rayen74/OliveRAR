import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { DashboardComponent } from './responsableCooperative/components/dashboard/dashboard';
import { UsersComponent } from './responsableCooperative/components/users/users';
import { ProfileComponent } from './responsableCooperative/components/profile/profile';
import { NotificationsresponsablecooperativeComponent } from './responsableCooperative/components/notificationsresponsablecooperative/notificationsresponsablecooperative';
import { VergersComponent } from './agriculteur/components/vergers/vergers';
import { NotificationsComponent } from './agriculteur/components/notifications/notifications';
import { AgriculteurProfileComponent } from './agriculteur/components/profile/profile';
import { CollectesComponent } from './responsableCooperative/components/collectes/collectes';
import { CollecteCalendarComponent } from './responsableCooperative/components/collecte-calendar/collecte-calendar';
import { agriculteurGuard } from './auth/agriculteur.guard';
import { authGuard } from './auth/auth.guard';
import { responsableCooperativeGuard } from './auth/responsable-cooperative.guard';
// Responsable Logistique
  import { EquipementsComponent } from './responsableLogistique/components/equipements/equipements';
  import { ResponsablelogistiqueProfileComponent } from './responsableLogistique/components/profile/profile';
  import { ResponsableLogistiqueGuard } from './auth/responsable-logistique.guard';   // ← Correction ici
// Responsable chef recolte
  import { responsableChefRecolteProfileComponent } from './responsableChefRecolte/components/profile/profile';
  import { ResponsableChefRecolteGuard } from './auth/responsable-chef-recolte.guard';   // ← Correction ici

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
      { path: 'notifications', component: NotificationsresponsablecooperativeComponent },
      { path: 'collectes', component: CollectesComponent },
      { path: 'collectes/calendrier', component: CollecteCalendarComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'agriculteur',
    canActivate: [authGuard, agriculteurGuard],
    children: [
      { path: 'vergers', component: VergersComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'profile', component: AgriculteurProfileComponent },
      { path: '', redirectTo: 'vergers', pathMatch: 'full' }
    ]
  },

{
    path: 'responsable-logistique',
    canActivate: [authGuard, ResponsableLogistiqueGuard],
    children: [
      { path: 'equipements', component: EquipementsComponent },
      { path: 'profile', component: ResponsablelogistiqueProfileComponent },
      { path: '', redirectTo: 'equipements', pathMatch: 'full' },
    ]
  },
{
    path: 'responsable-chef-recolte',
    canActivate: [authGuard, ResponsableChefRecolteGuard ],
    children: [
      { path: 'profile', component:  responsableChefRecolteProfileComponent},
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
    ]
  },

  { path: '**', redirectTo: 'login' }
];
