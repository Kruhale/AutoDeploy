import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/layout/landing-layout/landing-layout').then(modulo => modulo.LandingLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home').then(modulo => modulo.Home),
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(modulo => modulo.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(modulo => modulo.Register),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./components/layout/app-layout/app-layout').then(modulo => modulo.AppLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(modulo => modulo.Dashboard),
      },
      {
        path: 'servidor/:id',
        loadComponent: () => import('./pages/gestion-servidor/gestion-servidor').then(modulo => modulo.GestionServidor),
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs-terminal/logs-terminal').then(modulo => modulo.LogsTerminal),
      },
      {
        path: 'nuevo-despliegue',
        loadComponent: () => import('./pages/nuevo-despliegue/nuevo-despliegue').then(modulo => modulo.NuevoDespliegue),
      },
      {
        path: 'onboarding',
        loadComponent: () => import('./pages/onboarding/onboarding').then(modulo => modulo.Onboarding),
      },
      {
        path: 'cuenta',
        loadComponent: () => import('./pages/cuenta/cuenta').then(modulo => modulo.Cuenta),
      }
    ]
  }
];
