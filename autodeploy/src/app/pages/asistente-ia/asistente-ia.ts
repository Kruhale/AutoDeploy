import { Component, ElementRef, OnInit, ViewChild, signal, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AsistenteIaService, MensajeChat, ConfiguracionAsistente } from "../../services/asistente-ia.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";
import { UsuarioService } from "../../services/usuario.service";

const SUGERENCIAS_INICIALES = [
  { icono: "fa-solid fa-hard-drive", texto: "¿Cuánto espacio libre queda en el disco?" },
  { icono: "fa-solid fa-microchip", texto: "Muéstrame el consumo de memoria RAM" },
  { icono: "fa-solid fa-arrows-rotate", texto: "Reinicia el servicio nginx" },
  { icono: "fa-solid fa-list-check", texto: "Lista los procesos que más CPU consumen" }
];

const MODELOS_DISPONIBLES = [
  { id: "openai/gpt-4o-mini", nombre: "GPT-4o mini (rápido)" },
  { id: "openai/gpt-4o", nombre: "GPT-4o (potente)" },
  { id: "anthropic/claude-3.5-sonnet", nombre: "Claude 3.5 Sonnet" },
  { id: "google/gemini-2.0-flash-exp:free", nombre: "Gemini 2.0 Flash (gratis)" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", nombre: "Llama 3.3 70B (gratis)" }
];

@Component({
  selector: "app-asistente-ia",
  imports: [FormsModule],
  templateUrl: "./asistente-ia.html",
  styleUrl: "./asistente-ia.scss"
})
export class AsistenteIa implements OnInit {

  @ViewChild("contenedorMensajes") contenedorMensajes!: ElementRef<HTMLElement>;
  @ViewChild("areaEntrada") areaEntrada!: ElementRef<HTMLTextAreaElement>;

  readonly sugerencias = SUGERENCIAS_INICIALES;
  readonly modelosDisponibles = MODELOS_DISPONIBLES;

  listaServidores = signal<ServidorRemoto[]>([]);
  servidorSeleccionadoId = signal<string>("");
  mensajeEnEdicion = signal<string>("");
  mostrarPanelConfiguracion = signal<boolean>(false);
  estaCargandoConfiguracion = signal<boolean>(false);
  mensajeError = signal<string>("");

  apiKeyEnEdicion = signal<string>("");
  modeloEnEdicion = signal<string>("openai/gpt-4o-mini");
  comandosEnEdicion = signal<string>("");
  apiKeyYaConfigurada = signal<boolean>(false);

  servidorSeleccionado = computed<ServidorRemoto | null>(() => {
    const idActual = this.servidorSeleccionadoId();
    const lista = this.listaServidores();
    const servidorEncontrado = lista.find(function(servidor) {
      return servidor.id === idActual;
    });
    return servidorEncontrado || null;
  });

  historialEstaVacio = computed<boolean>(() => {
    const historial = this.asistenteService.historialMensajes();
    return historial.length === 0;
  });

  constructor(
    public asistenteService: AsistenteIaService,
    private servidorService: ServidorService,
    public usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.cargarServidores();
    this.cargarConfiguracion();
  }

  private cargarServidores(): void {
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function(servidores: ServidorRemoto[]) {
        componente.listaServidores.set(servidores);
        if (servidores.length > 0 && !componente.servidorSeleccionadoId()) {
          componente.servidorSeleccionadoId.set(servidores[0].id);
        }
      }
    });
  }

  private cargarConfiguracion(): void {
    const componente = this;
    const idUsuarioActual = this.usuarioService.usuarioId();
    if (!idUsuarioActual) return;

    this.asistenteService.obtenerConfiguracion(idUsuarioActual)
      .then(function(configuracion: ConfiguracionAsistente) {
        componente.apiKeyYaConfigurada.set(configuracion.apiKeyConfigurada);
        componente.modeloEnEdicion.set(configuracion.modeloPreferido);
        const comandosUnidos = configuracion.comandosAutoAprobados.join("\n");
        componente.comandosEnEdicion.set(comandosUnidos);
      })
      .catch(function() {
        componente.apiKeyYaConfigurada.set(false);
      });
  }

  abrirConfiguracion(): void {
    this.mostrarPanelConfiguracion.set(true);
  }

  cerrarConfiguracion(): void {
    this.mostrarPanelConfiguracion.set(false);
    this.apiKeyEnEdicion.set("");
    this.mensajeError.set("");
  }

  async guardarConfiguracion(): Promise<void> {
    const idUsuarioActual = this.usuarioService.usuarioId();
    if (!idUsuarioActual) return;

    this.estaCargandoConfiguracion.set(true);
    this.mensajeError.set("");

    const textoApiKey = this.apiKeyEnEdicion();
    const textoModelo = this.modeloEnEdicion();
    const textoComandos = this.comandosEnEdicion();
    const listaComandos = this.parsearComandosDesdeTexto(textoComandos);

    const datosPeticion: { apiKey?: string; modeloPreferido: string; comandosAutoAprobados: string[] } = {
      modeloPreferido: textoModelo,
      comandosAutoAprobados: listaComandos
    };

    if (textoApiKey && textoApiKey.length > 0) {
      datosPeticion.apiKey = textoApiKey;
    }

    try {
      const configuracion = await this.asistenteService.actualizarConfiguracion(idUsuarioActual, datosPeticion);
      this.apiKeyYaConfigurada.set(configuracion.apiKeyConfigurada);
      this.apiKeyEnEdicion.set("");
      this.mostrarPanelConfiguracion.set(false);
    } catch (error: any) {
      this.mensajeError.set(error.message || "Error guardando configuración");
    } finally {
      this.estaCargandoConfiguracion.set(false);
    }
  }

  private parsearComandosDesdeTexto(texto: string): string[] {
    const lineasSeparadas = texto.split("\n");
    const comandosLimpios = lineasSeparadas
      .map(function(linea) { return linea.trim(); })
      .filter(function(linea) { return linea.length > 0; });
    return comandosLimpios;
  }

  usarSugerencia(textoSugerencia: string): void {
    this.mensajeEnEdicion.set(textoSugerencia);
    setTimeout(() => {
      if (this.areaEntrada) {
        this.areaEntrada.nativeElement.focus();
      }
    }, 0);
  }

  manejarTeclaEnInput(evento: KeyboardEvent): void {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      this.enviarMensaje();
    }
  }

  async enviarMensaje(): Promise<void> {
    const textoMensaje = this.mensajeEnEdicion().trim();
    const idServidor = this.servidorSeleccionadoId();
    const idUsuario = this.usuarioService.usuarioId();

    if (!textoMensaje || !idServidor || !idUsuario) {
      if (!idServidor) {
        this.mensajeError.set("Selecciona un servidor antes de enviar el mensaje");
      }
      return;
    }

    this.mensajeError.set("");
    this.mensajeEnEdicion.set("");

    const mensajeDelUsuario: MensajeChat = { rol: "user", contenido: textoMensaje };
    this.asistenteService.agregarMensaje(mensajeDelUsuario);
    this.asistenteService.estaEscribiendo.set(true);
    this.desplazarAlFinal();

    try {
      const respuestaIa = await this.asistenteService.enviarMensaje(idUsuario, idServidor, textoMensaje);
      const tieneComando = respuestaIa.comandoPropuesto && respuestaIa.comandoPropuesto.length > 0;
      const tieneSalidaAutoEjecutada = respuestaIa.salidaComandoAutoEjecutado !== null && respuestaIa.salidaComandoAutoEjecutado !== undefined;

      const mensajeRespuesta: MensajeChat = {
        rol: "assistant",
        contenido: respuestaIa.respuesta,
        comandoPropuesto: tieneComando ? respuestaIa.comandoPropuesto : undefined,
        razonamiento: respuestaIa.razonamiento || undefined,
        requiereConfirmacion: respuestaIa.requiereConfirmacion,
        salidaComando: tieneSalidaAutoEjecutada ? respuestaIa.salidaComandoAutoEjecutado! : undefined,
        estadoComando: tieneSalidaAutoEjecutada ? "ejecutado" : (tieneComando ? "pendiente" : undefined)
      };

      this.asistenteService.agregarMensaje(mensajeRespuesta);
    } catch (error: any) {
      const mensajeFallo: MensajeChat = {
        rol: "assistant",
        contenido: "Ha ocurrido un error: " + (error.message || "no se pudo procesar tu mensaje")
      };
      this.asistenteService.agregarMensaje(mensajeFallo);
    } finally {
      this.asistenteService.estaEscribiendo.set(false);
      this.desplazarAlFinal();
    }
  }

  async confirmarComando(indiceMensaje: number): Promise<void> {
    const historial = this.asistenteService.historialMensajes();
    const mensajeObjetivo = historial[indiceMensaje];

    if (!mensajeObjetivo || !mensajeObjetivo.comandoPropuesto) return;

    const idServidor = this.servidorSeleccionadoId();
    if (!idServidor) return;

    this.actualizarMensajeEnHistorial(indiceMensaje, { estadoComando: "ejecutando" });

    try {
      const salida = await this.asistenteService.ejecutarComandoConfirmado(idServidor, mensajeObjetivo.comandoPropuesto);
      this.actualizarMensajeEnHistorial(indiceMensaje, {
        estadoComando: "ejecutado",
        salidaComando: salida,
        requiereConfirmacion: false
      });
    } catch (error: any) {
      this.actualizarMensajeEnHistorial(indiceMensaje, {
        estadoComando: "ejecutado",
        salidaComando: "Error: " + (error.message || "fallo al ejecutar el comando")
      });
    }

    this.desplazarAlFinal();
  }

  rechazarComando(indiceMensaje: number): void {
    this.actualizarMensajeEnHistorial(indiceMensaje, {
      estadoComando: "rechazado",
      requiereConfirmacion: false
    });
  }

  private actualizarMensajeEnHistorial(indice: number, cambios: Partial<MensajeChat>): void {
    this.asistenteService.historialMensajes.update(function(historial) {
      const copia = [...historial];
      copia[indice] = { ...copia[indice], ...cambios };
      return copia;
    });
  }

  limpiarConversacion(): void {
    this.asistenteService.limpiarHistorial();
  }

  private desplazarAlFinal(): void {
    setTimeout(() => {
      if (this.contenedorMensajes) {
        const elemento = this.contenedorMensajes.nativeElement;
        elemento.scrollTop = elemento.scrollHeight;
      }
    }, 50);
  }
}
