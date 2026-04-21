import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './auth/reset-password/reset-password';
import { DashboardComponent } from './responsableCooperative/components/dashboard/dashboard';
import { UsersComponent } from './responsableCooperative/components/users/users';
import { SharedProfileComponent } from './shared/components/profile/profile';
import { NotificationsresponsablecooperativeComponent } from './responsableCooperative/components/notificationsresponsablecooperative/notificationsresponsablecooperative';
import { VergersComponent } from './agriculteur/components/vergers/vergers';
import { NotificationsComponent } from './agriculteur/components/notifications/notifications';
import { CollectesComponent } from './responsableCooperative/components/collectes/collectes';
import { CollecteCalendarComponent } from './responsableCooperative/components/collecte-calendar/collecte-calendar';
import { agriculteurGuard } from './auth/agriculteur.guard';
import { authGuard } from './auth/auth.guard';
import { responsableCooperativeGuard } from './auth/responsable-cooperative.guard';
// Responsable Logistique
  import { EquipementsComponent } from './responsableLogistique/components/equipements/equipements';
  import { ResponsableLogistiqueGuard } from './auth/responsable-logistique.guard';   // ← Correction ici
// Responsable chef recolte
  import { ResponsableChefRecolteGuard } from './auth/responsable-chef-recolte.guard';   // ← Correction ici
//communaute agriculteur
import { CommunauteComponent } from './agriculteur/components/communaute/communaute';
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
      { path: 'profile', component: SharedProfileComponent },
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
      { path: 'profile', component: SharedProfileComponent },
      { path: 'communaute', component: CommunauteComponent },         // ✅ Déplacé ici
      { path: '', redirectTo: 'vergers', pathMatch: 'full' }
    ]
  },

{
    path: 'responsable-logistique',
    canActivate: [authGuard, ResponsableLogistiqueGuard],
    children: [
      { path: 'equipements', component: EquipementsComponent },
      { path: 'profile', component: SharedProfileComponent },
      { path: '', redirectTo: 'equipements', pathMatch: 'full' },
    ]
  },
{
    path: 'responsable-chef-recolte',
    canActivate: [authGuard, ResponsableChefRecolteGuard ],
    children: [
      { path: 'profile', component: SharedProfileComponent},
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
    ]
  },

  { path: '**', redirectTo: 'login' }
];
