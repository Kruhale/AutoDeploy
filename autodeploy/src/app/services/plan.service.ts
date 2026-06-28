import { Injectable, signal } from '@angular/core';

export type PlanId = 'free' | 'pro' | 'business';

export interface Plan {
  id: PlanId;
  nombre: string;
  precio: number;
  descripcion: string;
  limiteServidores: number | null;
  limiteDespliegues: number | null;
  asistentIa: boolean;
  dominiosPersonalizados: number | null;
  gestionEquipos: boolean;
  soporte: 'community' | 'priority' | 'dedicated';
}

export const PLANES: Plan[] = [
  {
    id: 'free',
    nombre: 'Free',
    precio: 0,
    descripcion: 'For developers exploring the platform.',
    limiteServidores: 1,
    limiteDespliegues: 5,
    asistentIa: false,
    dominiosPersonalizados: null,
    gestionEquipos: false,
    soporte: 'community',
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 9,
    descripcion: 'For teams shipping production apps.',
    limiteServidores: 5,
    limiteDespliegues: null,
    asistentIa: true,
    dominiosPersonalizados: 3,
    gestionEquipos: false,
    soporte: 'priority',
  },
  {
    id: 'business',
    nombre: 'Business',
    precio: 29,
    descripcion: 'For scaling infrastructure without limits.',
    limiteServidores: null,
    limiteDespliegues: null,
    asistentIa: true,
    dominiosPersonalizados: null,
    gestionEquipos: true,
    soporte: 'dedicated',
  },
];

@Injectable({ providedIn: 'root' })
export class PlanService {
  planActual = signal<PlanId>((sessionStorage.getItem('plan') as PlanId) ?? 'free');

  activarPlan(plan: PlanId): void {
    sessionStorage.setItem('plan', plan);
    this.planActual.set(plan);
  }

  obtenerPlan(id: PlanId): Plan {
    return PLANES.find(p => p.id === id)!;
  }
}
