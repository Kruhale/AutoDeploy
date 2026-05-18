import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

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

  constructor(private http: HttpClient) {}

  obtenerRecientes(): Observable<ActividadLog[]> {
    return this.http
      .get<RespuestaApi<ActividadLog[]>>(this.urlBase)
      .pipe(map(function(respuesta) { return respuesta.data; }));
  }
}
