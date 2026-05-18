import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { IdiomaService } from "./idioma.service";

interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}

interface DatosUsuario {
  id: string;
  nombre: string;
  email: string;
  plan: string;
  fechaFinSuscripcion: string | null;
  idioma: string;
}

@Injectable({ providedIn: "root" })
export class UsuarioService {

  private readonly urlBase = "/api/usuarios";

  usuarioId = signal(sessionStorage.getItem("usuarioId") || "");
  nombre = signal(sessionStorage.getItem("nombre") || "");
  email = signal(sessionStorage.getItem("email") || "");
  plan = signal(sessionStorage.getItem("plan") || "free");
  fechaFinSuscripcion = signal<string | null>(sessionStorage.getItem("fechaFinSuscripcion"));

  private idiomaService = inject(IdiomaService);

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

  actualizarPlan(usuarioId: string, plan: string): Promise<DatosUsuario> {
    const servicio = this;
    const cuerpo = { plan: plan };

    return new Promise(function(resolver, rechazar) {
      servicio.http.put<RespuestaApi<DatosUsuario>>(servicio.urlBase + "/" + usuarioId + "/plan", cuerpo)
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
            rechazar(new Error("Error al actualizar plan"));
          }
        });
    });
  }

  cancelarSuscripcion(): Promise<DatosUsuario> {
    const servicio = this;
    const idActual = this.usuarioId();

    return new Promise(function(resolver, rechazar) {
      servicio.http.put<RespuestaApi<DatosUsuario>>(servicio.urlBase + "/" + idActual + "/cancelar-suscripcion", {})
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
            rechazar(new Error("Error al cancelar suscripción"));
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

  listarClavesSsh(): Promise<{ id: string; nombre: string; huella: string; fechaCreacion: string }[]> {
    const servicio = this;
    const idActual = this.usuarioId();
    return new Promise(function(resolver, rechazar) {
      servicio.http.get<RespuestaApi<any[]>>(servicio.urlBase + "/" + idActual + "/claves-ssh").subscribe({
        next: function(respuesta) { resolver(respuesta.data || []); },
        error: function() { rechazar(new Error("Could not load SSH keys")); }
      });
    });
  }

  agregarClaveSsh(nombre: string, claveCompleta: string): Promise<{ id: string; nombre: string; huella: string; fechaCreacion: string }> {
    const servicio = this;
    const idActual = this.usuarioId();
    return new Promise(function(resolver, rechazar) {
      servicio.http.post<RespuestaApi<any>>(servicio.urlBase + "/" + idActual + "/claves-ssh", { nombre: nombre, claveCompleta: claveCompleta }).subscribe({
        next: function(respuesta) { resolver(respuesta.data); },
        error: function() { rechazar(new Error("Could not save the SSH key")); }
      });
    });
  }

  eliminarClaveSsh(idClave: string): Promise<void> {
    const servicio = this;
    const idActual = this.usuarioId();
    return new Promise(function(resolver, rechazar) {
      servicio.http.delete(servicio.urlBase + "/" + idActual + "/claves-ssh/" + idClave).subscribe({
        next: function() { resolver(); },
        error: function() { rechazar(new Error("Could not delete the SSH key")); }
      });
    });
  }

  obtenerPreferenciasNotificacion(): Promise<{ email: boolean; alertasCriticas: boolean; eventosDespliegue: boolean }> {
    const servicio = this;
    const idActual = this.usuarioId();
    return new Promise(function(resolver, rechazar) {
      servicio.http.get<RespuestaApi<any>>(servicio.urlBase + "/" + idActual + "/notificaciones").subscribe({
        next: function(respuesta) { resolver(respuesta.data); },
        error: function() { rechazar(new Error("Could not load preferences")); }
      });
    });
  }

  guardarPreferenciasNotificacion(preferencias: { email: boolean; alertasCriticas: boolean; eventosDespliegue: boolean }): Promise<void> {
    const servicio = this;
    const idActual = this.usuarioId();
    return new Promise(function(resolver, rechazar) {
      servicio.http.put(servicio.urlBase + "/" + idActual + "/notificaciones", preferencias).subscribe({
        next: function() { resolver(); },
        error: function() { rechazar(new Error("Could not save preferences")); }
      });
    });
  }

  limpiar(): void {
    sessionStorage.removeItem("usuarioId");
    sessionStorage.removeItem("nombre");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("plan");
    sessionStorage.removeItem("fechaFinSuscripcion");
    this.usuarioId.set("");
    this.nombre.set("");
    this.email.set("");
    this.plan.set("free");
    this.fechaFinSuscripcion.set(null);
  }

  private guardarEnSesion(datos: DatosUsuario): void {
    sessionStorage.setItem("usuarioId", datos.id);
    sessionStorage.setItem("nombre", datos.nombre);
    sessionStorage.setItem("email", datos.email);
    sessionStorage.setItem("plan", datos.plan || "free");

    if (datos.fechaFinSuscripcion) {
      sessionStorage.setItem("fechaFinSuscripcion", datos.fechaFinSuscripcion);
      this.fechaFinSuscripcion.set(datos.fechaFinSuscripcion);
    } else {
      sessionStorage.removeItem("fechaFinSuscripcion");
      this.fechaFinSuscripcion.set(null);
    }

    this.usuarioId.set(datos.id);
    this.nombre.set(datos.nombre);
    this.email.set(datos.email);
    this.plan.set(datos.plan || "free");

    if (datos.idioma) {
      sessionStorage.setItem("idioma", datos.idioma);
      this.idiomaService.aplicarIdiomaDelUsuario(datos.idioma);
    }
  }
}
