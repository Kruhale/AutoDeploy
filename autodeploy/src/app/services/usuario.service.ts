import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
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
  token?: string | null;
}

interface ClaveSshUsuario {
  id: string;
  nombre: string;
  huella: string;
  fechaCreacion: string;
}

interface PreferenciasNotificacion {
  email: boolean;
  alertasCriticas: boolean;
  eventosDespliegue: boolean;
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

  async registrar(nombre: string, email: string, password: string): Promise<DatosUsuario> {
    const cuerpo = { nombre: nombre, email: email, password: password };
    let respuesta: RespuestaApi<DatosUsuario>;

    try {
      respuesta = await firstValueFrom(
        this.http.post<RespuestaApi<DatosUsuario>>(this.urlBase + "/registro", cuerpo)
      );
    } catch (errorHttp: any) {
      const mensaje = errorHttp?.error?.message || "Error al registrar";
      throw new Error(mensaje);
    }

    if (!respuesta.success) {
      throw new Error(respuesta.message);
    }

    this.guardarEnSesion(respuesta.data);
    return respuesta.data;
  }

  async login(email: string, password: string): Promise<DatosUsuario> {
    const cuerpo = { email: email, password: password };
    let respuesta: RespuestaApi<DatosUsuario>;

    try {
      respuesta = await firstValueFrom(
        this.http.post<RespuestaApi<DatosUsuario>>(this.urlBase + "/login", cuerpo)
      );
    } catch (errorHttp: any) {
      const mensaje = errorHttp?.error?.message || "Email o password incorrectos";
      throw new Error(mensaje);
    }

    if (!respuesta.success) {
      throw new Error(respuesta.message);
    }

    this.guardarEnSesion(respuesta.data);
    return respuesta.data;
  }

  async actualizarPlan(usuarioId: string, plan: string): Promise<DatosUsuario> {
    const cuerpo = { plan: plan };
    let respuesta: RespuestaApi<DatosUsuario>;

    try {
      respuesta = await firstValueFrom(
        this.http.put<RespuestaApi<DatosUsuario>>(this.urlBase + "/" + usuarioId + "/plan", cuerpo)
      );
    } catch {
      throw new Error("Error al actualizar plan");
    }

    if (!respuesta.success) {
      throw new Error(respuesta.message);
    }

    this.guardarEnSesion(respuesta.data);
    return respuesta.data;
  }

  async cancelarSuscripcion(): Promise<DatosUsuario> {
    const idActual = this.usuarioId();
    let respuesta: RespuestaApi<DatosUsuario>;

    try {
      respuesta = await firstValueFrom(
        this.http.put<RespuestaApi<DatosUsuario>>(this.urlBase + "/" + idActual + "/cancelar-suscripcion", {})
      );
    } catch {
      throw new Error("Error al cancelar suscripción");
    }

    if (!respuesta.success) {
      throw new Error(respuesta.message);
    }

    this.guardarEnSesion(respuesta.data);
    return respuesta.data;
  }

  async actualizarPerfil(nombre: string, email: string): Promise<DatosUsuario> {
    const idActual = this.usuarioId();
    const cuerpo = { nombre: nombre, email: email };
    let respuesta: RespuestaApi<DatosUsuario>;

    try {
      respuesta = await firstValueFrom(
        this.http.put<RespuestaApi<DatosUsuario>>(this.urlBase + "/" + idActual, cuerpo)
      );
    } catch {
      throw new Error("Error al actualizar perfil");
    }

    if (!respuesta.success) {
      throw new Error(respuesta.message);
    }

    this.guardarEnSesion(respuesta.data);
    return respuesta.data;
  }

  async listarClavesSsh(): Promise<ClaveSshUsuario[]> {
    const idActual = this.usuarioId();

    try {
      const respuesta = await firstValueFrom(
        this.http.get<RespuestaApi<ClaveSshUsuario[]>>(this.urlBase + "/" + idActual + "/claves-ssh")
      );
      return respuesta.data || [];
    } catch {
      throw new Error("Could not load SSH keys");
    }
  }

  async agregarClaveSsh(nombre: string, claveCompleta: string): Promise<ClaveSshUsuario> {
    const idActual = this.usuarioId();
    const cuerpo = { nombre: nombre, claveCompleta: claveCompleta };

    try {
      const respuesta = await firstValueFrom(
        this.http.post<RespuestaApi<ClaveSshUsuario>>(this.urlBase + "/" + idActual + "/claves-ssh", cuerpo)
      );
      return respuesta.data;
    } catch {
      throw new Error("Could not save the SSH key");
    }
  }

  async eliminarClaveSsh(idClave: string): Promise<void> {
    const idActual = this.usuarioId();

    try {
      await firstValueFrom(
        this.http.delete(this.urlBase + "/" + idActual + "/claves-ssh/" + idClave)
      );
    } catch {
      throw new Error("Could not delete the SSH key");
    }
  }

  async obtenerPreferenciasNotificacion(): Promise<PreferenciasNotificacion> {
    const idActual = this.usuarioId();

    try {
      const respuesta = await firstValueFrom(
        this.http.get<RespuestaApi<PreferenciasNotificacion>>(this.urlBase + "/" + idActual + "/notificaciones")
      );
      return respuesta.data;
    } catch {
      throw new Error("Could not load preferences");
    }
  }

  async guardarPreferenciasNotificacion(preferencias: PreferenciasNotificacion): Promise<void> {
    const idActual = this.usuarioId();

    try {
      await firstValueFrom(
        this.http.put(this.urlBase + "/" + idActual + "/notificaciones", preferencias)
      );
    } catch {
      throw new Error("Could not save preferences");
    }
  }

  limpiar(): void {
    sessionStorage.removeItem("token");
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
    if (datos.token) {
      sessionStorage.setItem("token", datos.token);
    }

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
