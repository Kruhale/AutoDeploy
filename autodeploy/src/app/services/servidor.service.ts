import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map, tap } from "rxjs/operators";

interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ServidorRemoto {
  id: string;
  nombre: string;
  direccionIp: string;
  puertoSsh: number;
  usuarioSsh: string;
  metodoAutenticacion: string;
  estado: string;
  fechaCreacion: string;
}

export interface PeticionConexionSsh {
  nombre: string;
  direccionIp: string;
  puertoSsh: number;
  usuarioSsh: string;
  metodoAutenticacion: string;
  password: string;
  claveSshPrivada: string;
}

@Injectable({ providedIn: "root" })
export class ServidorService {

  private readonly urlBase = "/api/servidores";

  // Cache reactivo de los servidores del usuario. Lo rellena cargarYCachear()
  // y lo actualizan registrar() y eliminar() para mantenerlo en sincronia.
  readonly servidores = signal<ServidorRemoto[]>([]);

  // Total de servidores guardados, derivado del signal anterior.
  readonly cantidadServidores = computed(() => this.servidores().length);

  // Servidores con estado "conectado", utiles para el dashboard.
  readonly servidoresConectados = computed(() => {
    const listaCompleta = this.servidores();
    const listaFiltrada = listaCompleta.filter((servidor) => servidor.estado === "conectado");
    return listaFiltrada;
  });

  constructor(private http: HttpClient) {}

  registrar(peticion: PeticionConexionSsh): Observable<ServidorRemoto> {
    const cacheServidores = this.servidores;
    return this.http.post<RespuestaApi<ServidorRemoto>>(this.urlBase, peticion)
      .pipe(
        map(function(respuesta: RespuestaApi<ServidorRemoto>) {
          return respuesta.data;
        }),
        tap(function(servidorNuevo: ServidorRemoto) {
          cacheServidores.update(function(listaActual: ServidorRemoto[]) {
            return [...listaActual, servidorNuevo];
          });
        })
      );
  }

  listar(): Observable<ServidorRemoto[]> {
    return this.http.get<RespuestaApi<ServidorRemoto[]>>(this.urlBase)
      .pipe(map(function(respuesta: RespuestaApi<ServidorRemoto[]>) {
        return respuesta.data;
      }));
  }

  // Igual que listar() pero ademas guarda el resultado en el signal `servidores`.
  // Asi los componentes nuevos pueden leer el cache sin volver a pedir al backend.
  cargarYCachear(): Observable<ServidorRemoto[]> {
    const cacheServidores = this.servidores;
    return this.listar().pipe(
      tap(function(listaDelBackend: ServidorRemoto[]) {
        cacheServidores.set(listaDelBackend);
      })
    );
  }

  obtenerPorId(id: string): Observable<ServidorRemoto> {
    return this.http.get<RespuestaApi<ServidorRemoto>>(this.urlBase + "/" + id)
      .pipe(map(function(respuesta: RespuestaApi<ServidorRemoto>) {
        return respuesta.data;
      }));
  }

  probarConexion(peticion: PeticionConexionSsh): Observable<boolean> {
    return this.http.post<RespuestaApi<boolean>>(this.urlBase + "/probar-conexion", peticion)
      .pipe(map(function(respuesta: RespuestaApi<boolean>) {
        return respuesta.data;
      }));
  }

  eliminar(id: string): Observable<void> {
    const cacheServidores = this.servidores;
    return this.http.delete<void>(this.urlBase + "/" + id)
      .pipe(
        tap(function() {
          cacheServidores.update(function(listaActual: ServidorRemoto[]) {
            return listaActual.filter(function(servidor: ServidorRemoto) {
              return servidor.id !== id;
            });
          });
        })
      );
  }
}
