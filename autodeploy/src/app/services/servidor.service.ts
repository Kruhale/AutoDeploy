import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

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

  constructor(private http: HttpClient) {}

  registrar(peticion: PeticionConexionSsh): Observable<ServidorRemoto> {
    return this.http.post<RespuestaApi<ServidorRemoto>>(this.urlBase, peticion)
      .pipe(map(function(respuesta: RespuestaApi<ServidorRemoto>) {
        return respuesta.data;
      }));
  }

  listar(): Observable<ServidorRemoto[]> {
    return this.http.get<RespuestaApi<ServidorRemoto[]>>(this.urlBase)
      .pipe(map(function(respuesta: RespuestaApi<ServidorRemoto[]>) {
        return respuesta.data;
      }));
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
    return this.http.delete<void>(this.urlBase + "/" + id);
  }
}
