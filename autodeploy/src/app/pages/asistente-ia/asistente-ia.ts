import { Component, ElementRef, OnInit, OnDestroy, ViewChild, signal, computed } from "@angular/core";
import { Subscription } from "rxjs";
import { FormsModule } from "@angular/forms";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AsistenteIaService, MensajeChat, ConfiguracionAsistente } from "../../services/asistente-ia.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";
import { UsuarioService } from "../../services/usuario.service";

interface SugerenciaEntrada {
  icono: string;
  texto: string;
}

interface ModeloEntrada {
  id: string;
  nombre: string;
}

@Component({
  selector: "app-asistente-ia",
  imports: [FormsModule, TranslateModule],
  templateUrl: "./asistente-ia.html",
  styleUrl: "./asistente-ia.scss"
})
export class AsistenteIa implements OnInit, OnDestroy {
  @ViewChild("contenedorMensajes") contenedorMensajes!: ElementRef<HTMLElement>;
  @ViewChild("areaEntrada") areaEntrada!: ElementRef<HTMLTextAreaElement>;

  sugerencias = computed<SugerenciaEntrada[]>(() => {
    this.versionTraducciones();
    return [
      {
        icono: "fa-solid fa-hard-drive",
        texto: this.translate.instant("asistenteIa.sugerencias.disco")
      },
      {
        icono: "fa-solid fa-microchip",
        texto: this.translate.instant("asistenteIa.sugerencias.ram")
      },
      {
        icono: "fa-solid fa-arrows-rotate",
        texto: this.translate.instant("asistenteIa.sugerencias.nginx")
      },
      {
        icono: "fa-solid fa-list-check",
        texto: this.translate.instant("asistenteIa.sugerencias.cpu")
      }
    ];
  });

  modelosDisponibles = computed<ModeloEntrada[]>(() => {
    this.versionTraducciones();
    return [
      { id: "openai/gpt-4o-mini", nombre: this.translate.instant("asistenteIa.modelos.gpt4oMini") },
      { id: "openai/gpt-4o", nombre: this.translate.instant("asistenteIa.modelos.gpt4o") },
      {
        id: "anthropic/claude-3.5-sonnet",
        nombre: this.translate.instant("asistenteIa.modelos.claudeSonnet")
      },
      {
        id: "google/gemini-2.0-flash-exp:free",
        nombre: this.translate.instant("asistenteIa.modelos.geminiFlash")
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        nombre: this.translate.instant("asistenteIa.modelos.llama")
      }
    ];
  });

  private versionTraducciones = signal<number>(0);
  private suscripcionIdioma: Subscription;

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
    const servidorEncontrado = lista.find(function (servidor) {
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
    public usuarioService: UsuarioService,
    private translate: TranslateService
  ) {
    const componente = this;
    this.suscripcionIdioma = this.translate.onLangChange.subscribe(function () {
      componente.versionTraducciones.update(function (valor) {
        return valor + 1;
      });
    });
  }

  ngOnInit(): void {
    this.cargarServidores();
    this.cargarConfiguracion();
  }

  ngOnDestroy(): void {
    this.suscripcionIdioma.unsubscribe();
  }

  private cargarServidores(): void {
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function (servidores: ServidorRemoto[]) {
        componente.listaServidores.set(servidores);
        if (servidores.length > 0 && !componente.servidorSeleccionadoId()) {
          componente.servidorSeleccionadoId.set(servidores[0].id);
        }
      }
    });
  }

  private async cargarConfiguracion(): Promise<void> {
    const idUsuarioActual = this.usuarioService.usuarioId();
    if (!idUsuarioActual) return;

    try {
      const configuracion: ConfiguracionAsistente = await this.asistenteService.obtenerConfiguracion(idUsuarioActual);
      this.apiKeyYaConfigurada.set(configuracion.apiKeyConfigurada);
      this.modeloEnEdicion.set(configuracion.modeloPreferido);
      const comandosUnidos = configuracion.comandosAutoAprobados.join("\n");
      this.comandosEnEdicion.set(comandosUnidos);
    } catch (error) {
      this.apiKeyYaConfigurada.set(false);
    }
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

    const datosPeticion: {
      apiKey?: string;
      modeloPreferido: string;
      comandosAutoAprobados: string[];
    } = {
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
      this.mensajeError.set(error.message || this.translate.instant("asistenteIa.mensajes.errorGuardarConfig"));
    } finally {
      this.estaCargandoConfiguracion.set(false);
    }
  }

  private parsearComandosDesdeTexto(texto: string): string[] {
    const lineasSeparadas = texto.split("\n");
    const comandosLimpios = lineasSeparadas
      .map(function (linea) {
        return linea.trim();
      })
      .filter(function (linea) {
        return linea.length > 0;
      });
    return comandosLimpios;
  }

  usarSugerencia(textoSugerencia: string): void {
    this.mensajeEnEdicion.set(textoSugerencia);
    const componente = this;
    setTimeout(function () {
      if (componente.areaEntrada) {
        componente.areaEntrada.nativeElement.focus();
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
        this.mensajeError.set(this.translate.instant("asistenteIa.mensajes.seleccionaServidor"));
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
        estadoComando: tieneSalidaAutoEjecutada ? "ejecutado" : tieneComando ? "pendiente" : undefined
      };

      this.asistenteService.agregarMensaje(mensajeRespuesta);
    } catch (error: any) {
      const prefijoError = this.translate.instant("asistenteIa.mensajes.errorRespuesta");
      const defectoError = this.translate.instant("asistenteIa.mensajes.errorDefault");
      const mensajeFallo: MensajeChat = {
        rol: "assistant",
        contenido: prefijoError + (error.message || defectoError)
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
      const prefijoEjecutar = this.translate.instant("asistenteIa.mensajes.errorEjecutar");
      const defectoFallo = this.translate.instant("asistenteIa.mensajes.falloComando");
      this.actualizarMensajeEnHistorial(indiceMensaje, {
        estadoComando: "ejecutado",
        salidaComando: prefijoEjecutar + (error.message || defectoFallo)
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
    this.asistenteService.historialMensajes.update(function (historial) {
      const copia = [...historial];
      copia[indice] = { ...copia[indice], ...cambios };
      return copia;
    });
  }

  limpiarConversacion(): void {
    this.asistenteService.limpiarHistorial();
  }

  private desplazarAlFinal(): void {
    const componente = this;
    setTimeout(function () {
      if (componente.contenedorMensajes) {
        const elemento = componente.contenedorMensajes.nativeElement;
        elemento.scrollTop = elemento.scrollHeight;
      }
    }, 50);
  }
}
