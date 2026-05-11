import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";

interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
  token?: string;
}

interface DatosUsuario {
  id: string;
  nombre: string;
  email: string;
}

@Injectable({ providedIn: "root" })
export class UsuarioService {

  private readonly urlBase = "/api/usuarios";

  usuarioId = signal(sessionStorage.getItem("usuarioId") || "");
  nombre = signal(sessionStorage.getItem("nombre") || "");
  email = signal(sessionStorage.getItem("email") || "");

  constructor(private http: HttpClient) {}

  registrar(nombre: string, email: string, password: string): Promise<DatosUsuario> {
    const servicio = this;
    const cuerpo = { nombre: nombre, email: email, password: password };

    return new Promise(function(resolver, rechazar) {
      servicio.http.post<RespuestaApi<DatosUsuario>>(servicio.urlBase + "/registro", cuerpo)
        .subscribe({
          next: function(respuesta: RespuestaApi<DatosUsuario>) {
            if (respuesta.success) {
              servicio.guardarEnSesion(respuesta.data);
              resolver(respuesta.data);
            } else {
              rechazar(new Error(respuesta.message));
            }
          },
          error: function(error: any) {
            const mensaje = error.error?.message || "Error al registrar";
            rechazar(new Error(mensaje));
          }
        });
    });
  }

  login(email: string, password: string): Promise<DatosUsuario> {
    const servicio = this;
    const cuerpo = { email: email, password: password };

    return new Promise(function(resolver, rechazar) {
      servicio.http.post<RespuestaApi<DatosUsuario>>(servicio.urlBase + "/login", cuerpo)
        .subscribe({
          next: function(respuesta: RespuestaApi<DatosUsuario>) {
            if (respuesta.success) {
              if (respuesta.token) {
                sessionStorage.setItem("autodeploy_token", respuesta.token);
              }
              servicio.guardarEnSesion(respuesta.data);
              resolver(respuesta.data);
            } else {
              rechazar(new Error(respuesta.message));
            }
          },
          error: function(error: any) {
            const mensaje = error.error?.message || "Email o password incorrectos";
            rechazar(new Error(mensaje));
          }
        });
    });
  }

  actualizarPerfil(nombre: string, email: string): Promise<DatosUsuario> {
    const servicio = this;
    const idActual = this.usuarioId();
    const cuerpo = { nombre: nombre, email: email };

    return new Promise(function(resolver, rechazar) {
      servicio.http.put<RespuestaApi<DatosUsuario>>(servicio.urlBase + "/" + idActual, cuerpo)
        .subscribe({
          next: function(respuesta: RespuestaApi<DatosUsuario>) {
            if (respuesta.success) {
              servicio.guardarEnSesion(respuesta.data);
              resolver(respuesta.data);
            } else {
              rechazar(new Error(respuesta.message));
            }
          },
          error: function(error: any) {
            rechazar(new Error("Error al actualizar perfil"));
          }
        });
    });
  }

  limpiar(): void {
    sessionStorage.removeItem("usuarioId");
    sessionStorage.removeItem("nombre");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("autodeploy_token");
    this.usuarioId.set("");
    this.nombre.set("");
    this.email.set("");
  }

  private guardarEnSesion(datos: DatosUsuario): void {
    sessionStorage.setItem("usuarioId", datos.id);
    sessionStorage.setItem("nombre", datos.nombre);
    sessionStorage.setItem("email", datos.email);
    this.usuarioId.set(datos.id);
    this.nombre.set(datos.nombre);
    this.email.set(datos.email);
  }
}
