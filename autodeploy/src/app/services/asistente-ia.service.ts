import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";

interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface MensajeChat {
  rol: "user" | "assistant";
  contenido: string;
  comandoPropuesto?: string;
  razonamiento?: string;
  requiereConfirmacion?: boolean;
  salidaComando?: string;
  estadoComando?: "pendiente" | "ejecutando" | "ejecutado" | "rechazado";
}

export interface RespuestaChatIa {
  respuesta: string;
  comandoPropuesto: string;
  razonamiento: string;
  requiereConfirmacion: boolean;
  salidaComandoAutoEjecutado: string | null;
}

export interface ConfiguracionAsistente {
  apiKeyConfigurada: boolean;
  modeloPreferido: string;
  comandosAutoAprobados: string[];
}

export interface PeticionConfiguracion {
  apiKey?: string;
  modeloPreferido?: string;
  comandosAutoAprobados?: string[];
}

@Injectable({ providedIn: "root" })
export class AsistenteIaService {

  private readonly urlBase = "/api/asistente-ia";

  historialMensajes = signal<MensajeChat[]>([]);
  estaEscribiendo = signal(false);

  constructor(private http: HttpClient) {}

  enviarMensaje(usuarioId: string, servidorId: string, mensaje: string): Promise<RespuestaChatIa> {
    const servicio = this;
    const historialFormateado = this.formatearHistorialParaBackend();
    const cuerpo = {
      usuarioId: usuarioId,
      servidorId: servidorId,
      mensaje: mensaje,
      historial: historialFormateado
    };

    return new Promise(function(resolver, rechazar) {
      servicio.http.post<RespuestaApi<RespuestaChatIa>>(servicio.urlBase + "/mensaje", cuerpo)
        .subscribe({
          next: function(respuesta: RespuestaApi<RespuestaChatIa>) {
            if (respuesta.success) {
              resolver(respuesta.data);
            } else {
              rechazar(new Error(respuesta.message));
            }
          },
          error: function(error: any) {
            const mensajeError = error.error?.message || "Error al hablar con el asistente";
            rechazar(new Error(mensajeError));
          }
        });
    });
  }

  ejecutarComandoConfirmado(servidorId: string, comando: string): Promise<string> {
    const servicio = this;
    const cuerpo = { servidorId: servidorId, comando: comando };

    return new Promise(function(resolver, rechazar) {
      servicio.http.post<RespuestaApi<{ salida: string }>>(servicio.urlBase + "/ejecutar", cuerpo)
        .subscribe({
          next: function(respuesta: RespuestaApi<{ salida: string }>) {
            if (respuesta.success) {
              resolver(respuesta.data.salida);
            } else {
              rechazar(new Error(respuesta.message));
            }
          },
          error: function(error: any) {
            const mensajeError = error.error?.message || "Error al ejecutar el comando";
            rechazar(new Error(mensajeError));
          }
        });
    });
  }

  obtenerConfiguracion(usuarioId: string): Promise<ConfiguracionAsistente> {
    const servicio = this;

    return new Promise(function(resolver, rechazar) {
      servicio.http.get<RespuestaApi<ConfiguracionAsistente>>(servicio.urlBase + "/configuracion/" + usuarioId)
        .subscribe({
          next: function(respuesta: RespuestaApi<ConfiguracionAsistente>) {
            if (respuesta.success) {
              resolver(respuesta.data);
            } else {
              rechazar(new Error(respuesta.message));
            }
          },
          error: function(error: any) {
            const mensajeError = error.error?.message || "Error al obtener configuracion";
            rechazar(new Error(mensajeError));
          }
        });
    });
  }

  actualizarConfiguracion(usuarioId: string, datos: PeticionConfiguracion): Promise<ConfiguracionAsistente> {
    const servicio = this;

    return new Promise(function(resolver, rechazar) {
      servicio.http.put<RespuestaApi<ConfiguracionAsistente>>(servicio.urlBase + "/configuracion/" + usuarioId, datos)
        .subscribe({
          next: function(respuesta: RespuestaApi<ConfiguracionAsistente>) {
            if (respuesta.success) {
              resolver(respuesta.data);
            } else {
              rechazar(new Error(respuesta.message));
            }
          },
          error: function(error: any) {
            const mensajeError = error.error?.message || "Error al guardar configuracion";
            rechazar(new Error(mensajeError));
          }
        });
    });
  }

  agregarMensaje(mensaje: MensajeChat): void {
    this.historialMensajes.update(function(historialActual) {
      return [...historialActual, mensaje];
    });
  }

  actualizarUltimoMensaje(cambios: Partial<MensajeChat>): void {
    this.historialMensajes.update(function(historialActual) {
      if (historialActual.length === 0) {
        return historialActual;
      }
      const historialCopiado = [...historialActual];
      const ultimoIndice = historialCopiado.length - 1;
      historialCopiado[ultimoIndice] = { ...historialCopiado[ultimoIndice], ...cambios };
      return historialCopiado;
    });
  }

  limpiarHistorial(): void {
    this.historialMensajes.set([]);
  }

  private formatearHistorialParaBackend(): Array<{ rol: string; contenido: string }> {
    const mensajesActuales = this.historialMensajes();
    const mensajesParaBackend: Array<{ rol: string; contenido: string }> = [];

    for (const mensaje of mensajesActuales) {
      const mensajeFormateado = {
        rol: mensaje.rol,
        contenido: mensaje.contenido
      };
      mensajesParaBackend.push(mensajeFormateado);
    }

    return mensajesParaBackend;
  }
}
