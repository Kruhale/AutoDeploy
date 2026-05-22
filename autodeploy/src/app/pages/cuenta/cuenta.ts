import { Component, signal, computed, Signal, HostListener, ElementRef } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { UpperCasePipe, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../services/auth.service";
import { PlanService, PLANES, PlanId, Plan } from "../../services/plan.service";
import { UsuarioService } from "../../services/usuario.service";
import { ThemeService } from "../../services/theme.service";
import { SelectorIdioma } from "../../components/shared/selector-idioma/selector-idioma";

interface FilaResumen {
  etiqueta: string;
  valor: string;
  estado: "activo" | "aviso" | "apagado" | "neutro";
}

interface ClaveSsh {
  id: string;
  nombre: string;
  huella: string;
  fechaCreacion: string;
}

const DURACION_HOLD_SALIDA_MS = 1100;
const SEGUNDOS_POR_DIA = 86400;
const DIAS_REFERENCIA_ANIVERSARIO = 365;

@Component({
  selector: "app-cuenta",
  imports: [RouterLink, UpperCasePipe, DatePipe, FormsModule, TranslateModule, SelectorIdioma],
  templateUrl: "./cuenta.html",
  styleUrl: "./cuenta.scss"
})
export class Cuenta {
  readonly planes = PLANES;
  readonly anioActual = new Date().getFullYear();
  readonly letrasIndiceVertical = ["Y", "O", "U", "R"];
  readonly letrasIndiceCuenta = ["A", "C", "C", "O", "U", "N", "T"];

  nombreEditable = signal("");
  emailEditable = signal("");
  guardando = signal(false);
  mensajeGuardado = signal("");
  cancelando = signal(false);
  progresoSalidaActivo = signal(false);

  listaDeClavesSsh = signal<ClaveSsh[]>([]);
  mostrarFormularioClave = signal(false);
  nombreNuevaClave = signal("");
  contenidoNuevaClave = signal("");

  notificacionesEmail = signal(true);
  notificacionesAlertasCriticas = signal(true);
  notificacionesDespliegues = signal(true);

  versionIdioma = signal(0);

  inicialDelNombre: Signal<string>;
  detallePlanActual: Signal<Plan>;
  resumenDeCuenta: Signal<FilaResumen[]>;
  fechaCreacionCuenta: Signal<Date | null>;
  diasComoMiembro: Signal<number>;
  progresoAniversarioPorcentaje: Signal<number>;
  idTruncado: Signal<string>;
  textoMarqueePlan: Signal<string>;

  private temporizadorSalida: ReturnType<typeof setTimeout> | null = null;

  suscripcionCancelada = computed(function(this: Cuenta) {
    return !!this.usuarioService.fechaFinSuscripcion();
  }.bind(this));

  fechaFinFormateada = computed(function(this: Cuenta) {
    const fecha = this.usuarioService.fechaFinSuscripcion();
    if (!fecha) return null;
    return new Date(fecha);
  }.bind(this));

  constructor(
    readonly authService: AuthService,
    readonly planService: PlanService,
    readonly usuarioService: UsuarioService,
    readonly themeService: ThemeService,
    private router: Router,
    private elemento: ElementRef<HTMLElement>,
    private translate: TranslateService
  ) {
    this.nombreEditable.set(this.usuarioService.nombre());
    this.emailEditable.set(this.usuarioService.email());

    this.cargarClavesYNotificaciones();

    const componente = this;

    this.translate.onLangChange.subscribe(function() {
      componente.versionIdioma.update(function(v) { return v + 1; });
    });

    this.inicialDelNombre = computed(function() {
      const nombre = componente.usuarioService.nombre();
      if (!nombre) return "?";
      return nombre.charAt(0).toUpperCase();
    });

    this.detallePlanActual = computed(function() {
      const idActual = componente.planService.planActual();
      const encontrado = PLANES.find(function(p) { return p.id === idActual; });
      return encontrado || PLANES[0];
    });

    this.fechaCreacionCuenta = computed(function() {
      return componente.extraerFechaCreacionDelId();
    });

    this.diasComoMiembro = computed(function() {
      const fechaCreacion = componente.fechaCreacionCuenta();
      if (!fechaCreacion) return 0;
      const milisDesdeCreacion = Date.now() - fechaCreacion.getTime();
      return Math.max(0, Math.floor(milisDesdeCreacion / (SEGUNDOS_POR_DIA * 1000)));
    });

    this.progresoAniversarioPorcentaje = computed(function() {
      const dias = componente.diasComoMiembro();
      const porcentajeCrudo = (dias / DIAS_REFERENCIA_ANIVERSARIO) * 100;
      return Math.min(100, Math.max(2, porcentajeCrudo));
    });

    this.resumenDeCuenta = computed(function(): FilaResumen[] {
      componente.versionIdioma();
      const plan = componente.detallePlanActual();
      const valorStatus = componente.suscripcionCancelada()
        ? componente.translate.instant("cuenta.resumen.pendingCancellation")
        : (plan.id === "free"
            ? componente.translate.instant("cuenta.resumen.freeTier")
            : componente.translate.instant("cuenta.resumen.active"));
      const valorServers = plan.limiteServidores === null
        ? componente.translate.instant("cuenta.resumen.unlimited")
        : String(plan.limiteServidores);
      const valorIa = plan.asistentIa
        ? componente.translate.instant("cuenta.resumen.enabled")
        : componente.translate.instant("cuenta.resumen.disabled");
      const valorSoporte = plan.soporte.charAt(0).toUpperCase() + plan.soporte.slice(1);
      return [
        {
          etiqueta: componente.translate.instant("cuenta.resumen.status"),
          valor: valorStatus,
          estado: componente.suscripcionCancelada() ? "aviso" : (plan.id === "free" ? "neutro" : "activo")
        },
        {
          etiqueta: componente.translate.instant("cuenta.resumen.servers"),
          valor: valorServers,
          estado: "neutro"
        },
        {
          etiqueta: componente.translate.instant("cuenta.resumen.aiAssistant"),
          valor: valorIa,
          estado: plan.asistentIa ? "activo" : "apagado"
        },
        {
          etiqueta: componente.translate.instant("cuenta.resumen.support"),
          valor: valorSoporte,
          estado: "neutro"
        }
      ];
    });

    this.idTruncado = computed(function() {
      const idCompleto = componente.usuarioService.usuarioId();
      if (!idCompleto || idCompleto.length < 8) return "";
      return idCompleto.substring(0, 6) + "···" + idCompleto.substring(idCompleto.length - 4);
    });

    this.textoMarqueePlan = computed(function() {
      componente.versionIdioma();
      const plan = componente.detallePlanActual();
      const palabras: string[] = [];
      palabras.push(plan.nombre.toUpperCase());
      const sufijoMes = componente.translate.instant("cuenta.marquee.perMonth");
      if (plan.precio > 0) palabras.push("€" + plan.precio + " " + sufijoMes);
      if (plan.limiteServidores === null) {
        palabras.push(componente.translate.instant("cuenta.marquee.unlimitedServers"));
      } else {
        palabras.push(plan.limiteServidores + " " + componente.translate.instant("cuenta.marquee.serversSuffix"));
      }
      if (plan.asistentIa) palabras.push(componente.translate.instant("cuenta.marquee.aiIncluded"));
      palabras.push(plan.soporte.toUpperCase() + " " + componente.translate.instant("cuenta.marquee.supportSuffix"));
      if (plan.id === "business") palabras.push(componente.translate.instant("cuenta.marquee.enterpriseGrade"));
      return palabras.join("   ·   ");
    });
  }

  @HostListener("mousemove", ["$event"])
  manejarMovimientoCursor(evento: MouseEvent): void {
    const cajaHost = this.elemento.nativeElement.getBoundingClientRect();
    const xRelativo = evento.clientX - cajaHost.left;
    const yRelativo = evento.clientY - cajaHost.top;
    this.elemento.nativeElement.style.setProperty("--cursor-x", xRelativo + "px");
    this.elemento.nativeElement.style.setProperty("--cursor-y", yRelativo + "px");
  }

  cambiarPlan(id: PlanId): void {
    const planActual = this.planService.planActual();

    if (id === "free" && planActual !== "free") {
      this.cancelarSuscripcion();
      return;
    }

    if (id !== "free" && id !== planActual) {
      this.router.navigate(["/app/pago"], { queryParams: { plan: id } });
      return;
    }
  }

  async cancelarSuscripcion(): Promise<void> {
    this.cancelando.set(true);
    try {
      await this.usuarioService.cancelarSuscripcion();
    } catch {
      // El estado del plan se queda como estaba; el usuario puede reintentar desde el mismo boton.
    } finally {
      this.cancelando.set(false);
    }
  }

  async guardarCambios(): Promise<void> {
    const nombre = this.nombreEditable();
    const email = this.emailEditable();

    if (!nombre || !email) return;

    this.guardando.set(true);
    this.mensajeGuardado.set("");

    try {
      await this.usuarioService.actualizarPerfil(nombre, email);
      this.mensajeGuardado.set(this.translate.instant("comun.guardado"));
    } catch (error: any) {
      this.mensajeGuardado.set(this.translate.instant("comun.error"));
    } finally {
      this.guardando.set(false);
      const componente = this;
      setTimeout(function() {
        componente.mensajeGuardado.set("");
      }, 2400);
    }
  }

  activarTema(tema: "oscuro" | "claro"): void {
    if (this.themeService.temaActual() === tema) return;
    this.themeService.alternarTema();
  }

  iniciarSalida(): void {
    this.cancelarSalida();
    this.progresoSalidaActivo.set(true);
    const componente = this;
    this.temporizadorSalida = setTimeout(function() {
      componente.cerrarSesion();
    }, DURACION_HOLD_SALIDA_MS);
  }

  cancelarSalida(): void {
    this.progresoSalidaActivo.set(false);
    if (this.temporizadorSalida) {
      clearTimeout(this.temporizadorSalida);
      this.temporizadorSalida = null;
    }
  }

  cerrarSesion(): void {
    this.cancelarSalida();
    this.usuarioService.limpiar();
    this.authService.logout();
    this.router.navigate(["/"]);
  }

  mostrarFormularioAgregarClave(): void {
    this.mostrarFormularioClave.set(true);
  }

  cancelarFormularioClave(): void {
    this.mostrarFormularioClave.set(false);
    this.nombreNuevaClave.set("");
    this.contenidoNuevaClave.set("");
  }

  async agregarClaveSsh(): Promise<void> {
    const nombre = this.nombreNuevaClave().trim();
    const contenido = this.contenidoNuevaClave().trim();
    if (!nombre || !contenido) {
      return;
    }

    try {
      const claveGuardada = await this.usuarioService.agregarClaveSsh(nombre, contenido);
      const fechaTexto = claveGuardada.fechaCreacion
        ? new Date(claveGuardada.fechaCreacion).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" })
        : new Date().toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" });
      const nueva: ClaveSsh = {
        id: claveGuardada.id,
        nombre: claveGuardada.nombre,
        huella: claveGuardada.huella,
        fechaCreacion: fechaTexto
      };
      this.listaDeClavesSsh.update(function(actual) { return [...actual, nueva]; });
      this.cancelarFormularioClave();
    } catch (error) {
      this.mensajeGuardado.set(this.translate.instant("comun.error"));
      const componente = this;
      setTimeout(function() { componente.mensajeGuardado.set(""); }, 2500);
    }
  }

  async eliminarClaveSsh(idClave: string): Promise<void> {
    try {
      await this.usuarioService.eliminarClaveSsh(idClave);
      this.listaDeClavesSsh.update(function(actual) {
        return actual.filter(function(c) { return c.id !== idClave; });
      });
    } catch (error) {
      this.mensajeGuardado.set(this.translate.instant("comun.error"));
      const componente = this;
      setTimeout(function() { componente.mensajeGuardado.set(""); }, 2500);
    }
  }

  async alternarNotificacion(tipo: "email" | "criticas" | "despliegues"): Promise<void> {
    if (tipo === "email") this.notificacionesEmail.update(function(v) { return !v; });
    if (tipo === "criticas") this.notificacionesAlertasCriticas.update(function(v) { return !v; });
    if (tipo === "despliegues") this.notificacionesDespliegues.update(function(v) { return !v; });

    const preferencias = {
      email: this.notificacionesEmail(),
      alertasCriticas: this.notificacionesAlertasCriticas(),
      eventosDespliegue: this.notificacionesDespliegues()
    };
    try {
      await this.usuarioService.guardarPreferenciasNotificacion(preferencias);
    } catch (error) {
      // Silencio intencional: la preferencia se guarda localmente aunque falle el sync
    }
  }

  private async cargarClavesYNotificaciones(): Promise<void> {
    if (!this.usuarioService.usuarioId()) return;

    try {
      const claves = await this.usuarioService.listarClavesSsh();
      const adaptadas: ClaveSsh[] = (claves || []).map(function(c) {
        const fechaTexto = c.fechaCreacion
          ? new Date(c.fechaCreacion).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" })
          : "—";
        return { id: c.id, nombre: c.nombre, huella: c.huella, fechaCreacion: fechaTexto };
      });
      this.listaDeClavesSsh.set(adaptadas);
    } catch (error) {
      // Silencio intencional
    }

    try {
      const prefs = await this.usuarioService.obtenerPreferenciasNotificacion();
      this.notificacionesEmail.set(prefs.email);
      this.notificacionesAlertasCriticas.set(prefs.alertasCriticas);
      this.notificacionesDespliegues.set(prefs.eventosDespliegue);
    } catch (error) {
      // Silencio intencional
    }
  }

  private extraerFechaCreacionDelId(): Date | null {
    const idCompleto = this.usuarioService.usuarioId();
    if (!idCompleto || idCompleto.length < 8) return null;
    const timestampHex = idCompleto.substring(0, 8);
    const timestampSegundos = parseInt(timestampHex, 16);
    if (isNaN(timestampSegundos) || timestampSegundos <= 0) return null;
    return new Date(timestampSegundos * 1000);
  }
}
