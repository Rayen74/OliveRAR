import { Routes } from '@angular/router';
import { agriculteurGuard } from './core/guards/agriculteur.guard';
import { authGuard } from './core/guards/auth.guard';
import { responsableChefRecolteGuard } from './core/guards/responsable-chef-recolte.guard';
import { responsableCooperativeGuard } from './core/guards/responsable-cooperative.guard';
import { responsableLogistiqueGuard } from './core/guards/responsable-logistique.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login').then((m) => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/reset-password/reset-password').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'responsable',
    canActivate: [authGuard, responsableCooperativeGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard').then((m) => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/pages/users/users').then((m) => m.UsersComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./shared/components/profile/profile').then((m) => m.SharedProfileComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/pages/cooperative-notifications/notificationsresponsablecooperative')
          .then((m) => m.NotificationsresponsablecooperativeComponent)
      },
      {
        path: 'collectes',
        loadComponent: () => import('./features/collectes/pages/collectes/collectes').then((m) => m.CollectesComponent)
      },
      {
        path: 'tournees',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/tournees/pages/tournees/tournees').then((m) => m.TourneesPageComponent)
          },
          {
            path: 'calendrier',
            loadComponent: () => import('./features/collectes/pages/collecte-calendar/collecte-calendar').then((m) => m.CollecteCalendarComponent)
          }
        ]
      },
      {
        path: 'activites',
        loadComponent: () => import('./features/activites/pages/activite-list/activite-list').then((m) => m.ActiviteListComponent)
      },
      {
        path: 'types-ressources',
        loadComponent: () => import('./features/ressources/pages/types-ressources/types-ressources').then((m) => m.TypesRessourcesComponent)
      },
      {
        path: 'unites',
        loadComponent: () => import('./features/ressources/pages/unites-ressources/unites-ressources').then((m) => m.UnitesRessourcesComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'agriculteur',
    canActivate: [authGuard, agriculteurGuard],
    children: [
      {
        path: 'vergers',
        loadComponent: () => import('./features/vergers/pages/vergers/vergers').then((m) => m.VergersComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/pages/agriculteur-notifications/notifications').then((m) => m.NotificationsComponent)
      },
      {
        path: 'signalements',
        loadComponent: () => import('./features/signalements/pages/signalements/signalements')
          .then((m) => m.SignalementsPageComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./shared/components/profile/profile').then((m) => m.SharedProfileComponent)
      },
      {
        path: 'communaute',
        loadComponent: () => import('./features/communaute/pages/communaute/communaute').then((m) => m.CommunauteComponent)
      },
      { path: '', redirectTo: 'vergers', pathMatch: 'full' }
    ]
  },
  {
    path: 'responsable-logistique',
    canActivate: [authGuard, responsableLogistiqueGuard],
    children: [

      {
        path: 'types-ressources',
        loadComponent: () => import('./features/ressources/pages/types-ressources/types-ressources').then((m) => m.TypesRessourcesComponent)
      },
      {
        path: 'unites',
        loadComponent: () => import('./features/ressources/pages/unites-ressources/unites-ressources').then((m) => m.UnitesRessourcesComponent)
      },
      {
        path: 'collectes',
        loadComponent: () => import('./features/collectes/pages/collectes/collectes').then((m) => m.CollectesComponent)
      },
      {
        path: 'tournees',
        loadComponent: () => import('./features/tournees/pages/tournees/tournees').then((m) => m.TourneesPageComponent)
      },
      {
        path: 'activites',
        loadComponent: () => import('./features/activites/pages/activite-list/activite-list').then((m) => m.ActiviteListComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./shared/components/profile/profile').then((m) => m.SharedProfileComponent)
      },
      { path: '', redirectTo: 'types-ressources', pathMatch: 'full' },
    ]
  },
  {
    path: 'responsable-chef-recolte',
    canActivate: [authGuard, responsableChefRecolteGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./shared/components/profile/profile').then((m) => m.SharedProfileComponent)
      },
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
    ]
  },
  { path: '**', redirectTo: 'login' }
];
