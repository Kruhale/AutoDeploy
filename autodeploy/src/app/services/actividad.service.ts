import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map, tap } from "rxjs/operators";

interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ActividadLog {
  id: string;
  tipo: string;
  mensaje: string;
  icono: string;
  fechaCreacion: string;
}

@Injectable({ providedIn: "root" })
export class ActividadService {

  private readonly urlBase = "/api/actividad";

  // Cache reactivo de la actividad reciente del usuario. Lo rellena
  // cargarYCachear() y cualquier vista puede leerlo via signal sin re-pedir.
  readonly actividadesRecientes = signal<ActividadLog[]>([]);

  // Cantidad de eventos cacheados, derivada del signal.
  readonly cantidadActividades = computed(() => this.actividadesRecientes().length);

  // True si todavia no se ha cargado nada (lista vacia).
  readonly sinActividad = computed(() => this.actividadesRecientes().length === 0);

  constructor(private http: HttpClient) {}

  obtenerRecientes(): Observable<ActividadLog[]> {
    return this.http
      .get<RespuestaApi<ActividadLog[]>>(this.urlBase)
      .pipe(map(function(respuesta) { return respuesta.data; }));
  }

  // Igual que obtenerRecientes() pero ademas guarda el resultado en el signal.
  cargarYCachear(): Observable<ActividadLog[]> {
    const cacheActividades = this.actividadesRecientes;
    return this.obtenerRecientes().pipe(
      tap(function(listaDelBackend: ActividadLog[]) {
        cacheActividades.set(listaDelBackend);
      })
    );
  }
}
