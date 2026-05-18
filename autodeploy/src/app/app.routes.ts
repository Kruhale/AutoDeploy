import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { planAsistenteGuard } from './guards/plan-asistente.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/layout/landing-layout/landing-layout').then(
        (modulo) => modulo.LandingLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home').then((modulo) => modulo.Home),
      },
      {
        path: 'aviso-legal',
        loadComponent: () =>
          import('./pages/aviso-legal/aviso-legal').then((modulo) => modulo.AvisoLegal),
      },
      {
        path: 'politica-privacidad',
        loadComponent: () =>
          import('./pages/politica-privacidad/politica-privacidad').then(
            (modulo) => modulo.PoliticaPrivacidad,
          ),
      },
      {
        path: 'politica-cookies',
        loadComponent: () =>
          import('./pages/politica-cookies/politica-cookies').then(
            (modulo) => modulo.PoliticaCookies,
          ),
      },
      {
        path: 'api-docs',
        loadComponent: () =>
          import('./pages/api-docs/api-docs').then((modulo) => modulo.ApiDocs),
      },
      {
        path: 'documentacion',
        loadComponent: () =>
          import('./pages/documentacion/documentacion').then((modulo) => modulo.Documentacion),
      },
      {
        path: 'estado',
        loadComponent: () =>
          import('./pages/estado/estado').then((modulo) => modulo.Estado),
      },
      {
        path: 'contacto',
        loadComponent: () =>
          import('./pages/contacto/contacto').then((modulo) => modulo.Contacto),
      },
      {
        path: 'comunidad',
        loadComponent: () =>
          import('./pages/comunidad/comunidad').then((modulo) => modulo.Comunidad),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((modulo) => modulo.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((modulo) => modulo.Register),
  },
  {
    path: 'confirmar-free',
    loadComponent: () =>
      import('./pages/confirmar-free/confirmar-free').then((modulo) => modulo.ConfirmarFree),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/layout/app-layout/app-layout').then((modulo) => modulo.AppLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((modulo) => modulo.Dashboard),
      },
      {
        path: 'servidor/:id',
        loadComponent: () =>
          import('./pages/gestion-servidor/gestion-servidor').then(
            (modulo) => modulo.GestionServidor,
          ),
      },
      {
        path: 'logs',
        loadComponent: () =>
          import('./pages/logs-terminal/logs-terminal').then((modulo) => modulo.LogsTerminal),
      },
      {
        path: 'nuevo-despliegue',
        loadComponent: () =>
          import('./pages/nuevo-despliegue/nuevo-despliegue').then(
            (modulo) => modulo.NuevoDespliegue,
          ),
      },
      {
        path: 'onboarding',
        loadComponent: () =>
          import('./pages/onboarding/onboarding').then((modulo) => modulo.Onboarding),
      },
      {
        path: 'cuenta',
        loadComponent: () => import('./pages/cuenta/cuenta').then((modulo) => modulo.Cuenta),
      },
      {
        path: 'billing',
        loadComponent: () => import('./pages/billing/billing').then((modulo) => modulo.Billing),
      },
      {
        path: 'networking',
        loadComponent: () =>
          import('./pages/networking/networking').then((modulo) => modulo.Networking),
      },
      {
        path: 'firewall',
        loadComponent: () => import('./pages/firewall/firewall').then((modulo) => modulo.Firewall),
      },
      {
        path: 'backups',
        loadComponent: () => import('./pages/backups/backups').then((modulo) => modulo.Backups),
      },
      {
        path: 'settings',
        redirectTo: 'cuenta',
        pathMatch: 'full',
      },
      {
        path: 'terminal',
        loadComponent: () =>
          import('./pages/terminal-selector/terminal-selector').then(
            (modulo) => modulo.TerminalSelector,
          ),
      },
      {
        path: 'terminal/:servidorId',
        loadComponent: () =>
          import('./pages/terminal-ssh/terminal-ssh').then((modulo) => modulo.TerminalSsh),
      },
      {
        path: 'pago',
        loadComponent: () => import('./pages/pago/pago').then((modulo) => modulo.Pago),
      },
      {
        path: 'asistente-ia',
        canActivate: [planAsistenteGuard],
        loadComponent: () =>
          import('./pages/asistente-ia/asistente-ia').then((modulo) => modulo.AsistenteIa),
      },
    ],
  },
];
