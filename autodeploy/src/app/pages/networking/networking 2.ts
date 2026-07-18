import { Component, signal, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface SubdominioApi {
  id: string;
  servidorId: string;
  nombre: string;
  tipo: string;
  destino: string;
  sslActivo: boolean;
  fechaCreacion: string;
}

interface DominioVista {
  id: string;
  servidorId: string;
  servidorNombre: string;
  nombre: string;
  tipo: string;
  destino: string;
  sslActivo: boolean;
  estado: "active" | "propagating" | "error";
}

interface RegistrosDns {
  a: string[];
  aaaa: string[];
  cname: string[];
  mx: string[];
  ns: string[];
  txt: string[];
}

interface RedireccionApi {
  id: string;
  servidorId: string;
  hostOrigen: string;
  urlDestino: string;
  codigoEstado: number;
}

@Component({
  selector: "app-networking",
  imports: [FormsModule, TranslateModule],
  templateUrl: "./networking.html",
  styleUrl: "./networking.scss"
})
export class Networking implements OnInit {
  listaDeDominios = signal<DominioVista[]>([]);
  listaServidores = signal<ServidorRemoto[]>([]);
  cargando = signal(true);

  mostrarFormulario = signal(false);
  nuevoDominio = signal("");
  nuevoTipo = signal<"primary" | "subdomain">("primary");
  nuevoServidorId = signal<string>("");
  nuevoDestino = signal<string>("/");

  guardando = signal(false);
  mensajeAccion = signal("");
  procesandoSsl = signal(false);

  panelDnsAbierto = signal(false);
  dominioConsultando = signal<string>("");
  cargandoDns = signal(false);
  registrosDns = signal<RegistrosDns | null>(null);
  filasRegistrosDns = signal<{ tipo: string; valores: string[] }[]>([]);

  panelRedirectsAbierto = signal(false);
  listaRedirecciones = signal<RedireccionApi[]>([]);
  cargandoRedirecciones = signal(false);
  servidorRedireccion = signal<string>("");
  hostOrigenNuevo = signal("");
  urlDestinoNueva = signal("");
  codigoRedireccion = signal<301 | 302>(301);
  guardandoRedireccion = signal(false);

  constructor(
    private http: HttpClient,
    private servidorService: ServidorService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargando.set(true);
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function (servidores: ServidorRemoto[]) {
        componente.listaServidores.set(servidores);
        if (servidores.length > 0 && !componente.nuevoServidorId()) {
          componente.nuevoServidorId.set(servidores[0].id);
        }
        componente.cargarSubdominios(servidores);
      },
      error: function () {
        componente.cargando.set(false);
      }
    });
  }

  private cargarSubdominios(servidores: ServidorRemoto[]): void {
    if (servidores.length === 0) {
      this.listaDeDominios.set([]);
      this.cargando.set(false);
      return;
    }

    const componente = this;
    const acumulado: DominioVista[] = [];
    let respondidos = 0;

    servidores.forEach(function (servidor) {
      componente.http.get<any>("/api/subdominios/servidor/" + servidor.id).subscribe({
        next: function (respuesta: any) {
          const subdominios: SubdominioApi[] = Array.isArray(respuesta) ? respuesta : respuesta && Array.isArray(respuesta.data) ? respuesta.data : [];
          subdominios.forEach(function (subdominio) {
            acumulado.push({
              id: subdominio.id,
              servidorId: subdominio.servidorId,
              servidorNombre: servidor.nombre,
              nombre: subdominio.nombre,
              tipo: subdominio.tipo || "primary",
              destino: subdominio.destino || "",
              sslActivo: subdominio.sslActivo,
              estado: "active"
            });
          });
          respondidos = respondidos + 1;
          if (respondidos === servidores.length) {
            componente.listaDeDominios.set([...acumulado]);
            componente.cargando.set(false);
          }
        },
        error: function () {
          respondidos = respondidos + 1;
          if (respondidos === servidores.length) {
            componente.listaDeDominios.set([...acumulado]);
            componente.cargando.set(false);
          }
        }
      });
    });
  }

  mostrarFormularioAgregar(): void {
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.nuevoDominio.set("");
    this.nuevoDestino.set("/");
  }

  agregarDominio(): void {
    const dominio = this.nuevoDominio().trim();
    const servidorId = this.nuevoServidorId();
    if (!dominio || !servidorId) {
      return;
    }

    this.guardando.set(true);
    const componente = this;

    const cuerpo = {
      servidorId: servidorId,
      nombre: dominio,
      tipo: this.nuevoTipo(),
      destino: this.nuevoDestino() || "/"
    };

    this.http.post<{ success: boolean; data: SubdominioApi }>("/api/subdominios", cuerpo).subscribe({
      next: function () {
        componente.guardando.set(false);
        componente.cancelarFormulario();
        componente.cargarTodo();
      },
      error: function () {
        componente.guardando.set(false);
        componente.mensajeAccion.set(componente.translate.instant("networking.mensajes.errorAgregar"));
        setTimeout(function () {
          componente.mensajeAccion.set("");
        }, 4000);
      }
    });
  }

  eliminarDominio(idSubdominio: string): void {
    const componente = this;
    this.http.delete("/api/subdominios/" + idSubdominio).subscribe({
      next: function () {
        componente.cargarTodo();
      },
      error: function () {
        componente.mensajeAccion.set(componente.translate.instant("networking.mensajes.errorEliminar"));
        setTimeout(function () {
          componente.mensajeAccion.set("");
        }, 4000);
      }
    });
  }

  renovarSsl(): void {
    const dominios = this.listaDeDominios();
    if (dominios.length === 0) {
      this.mensajeAccion.set(this.translate.instant("networking.mensajes.sinDominiosRenovar"));
      const componente = this;
      setTimeout(function () {
        componente.mensajeAccion.set("");
      }, 3000);
      return;
    }
    this.procesandoSsl.set(true);
    this.mensajeAccion.set(this.translate.instant("networking.mensajes.iniciandoRenovacion", { count: dominios.length }));
    const componente = this;
    const servidoresUnicos = Array.from(
      new Set(
        dominios.map(function (d) {
          return d.servidorId;
        })
      )
    );
    let respondidos = 0;

    servidoresUnicos.forEach(function (servidorId) {
      componente.http.post("/api/ssl/" + servidorId + "/renovar", {}).subscribe({
        next: function () {
          respondidos = respondidos + 1;
          if (respondidos === servidoresUnicos.length) {
            componente.procesandoSsl.set(false);
            componente.mensajeAccion.set(componente.translate.instant("networking.mensajes.renovacionCompletada", { count: servidoresUnicos.length }));
            setTimeout(function () {
              componente.mensajeAccion.set("");
            }, 4000);
            componente.cargarTodo();
          }
        },
        error: function () {
          respondidos = respondidos + 1;
          if (respondidos === servidoresUnicos.length) {
            componente.procesandoSsl.set(false);
            componente.mensajeAccion.set(componente.translate.instant("networking.mensajes.renovacionFallida"));
            setTimeout(function () {
              componente.mensajeAccion.set("");
            }, 4000);
          }
        }
      });
    });
  }

  // Guardamos el foco de origen y lo movemos al primer campo del modal
  // para que el teclado no se quede detras del scrim (WCAG 2.4.3)
  private elementoConFocoPrevio: HTMLElement | null = null;

  private guardarFocoYEnfocar(idCampo: string): void {
    this.elementoConFocoPrevio = document.activeElement as HTMLElement | null;
    // 100ms: con 0 el campo aun no esta pintado por la deteccion de cambios
    setTimeout(function () {
      const campo = document.getElementById(idCampo);
      campo?.focus();
    }, 100);
  }

  private devolverFoco(): void {
    this.elementoConFocoPrevio?.focus();
    this.elementoConFocoPrevio = null;
  }

  // Trampa de foco del modal: el Tab circula entre sus controles y no escapa
  // al fondo. querySelectorAll es la unica via para enumerar los focusables.
  manejarTabulacionModal(evento: Event, idCaja: string): void {
    const eventoTeclado = evento as KeyboardEvent;
    const caja = document.getElementById(idCaja);
    if (!caja) {
      return;
    }
    const focusables = caja.querySelectorAll<HTMLElement>("button:not(:disabled), input, select, textarea, a[href]");
    if (focusables.length === 0) {
      return;
    }
    const primero = focusables[0];
    const ultimo = focusables[focusables.length - 1];
    const elementoActivo = document.activeElement;
    if (eventoTeclado.shiftKey && elementoActivo === primero) {
      eventoTeclado.preventDefault();
      ultimo.focus();
      return;
    }
    if (!eventoTeclado.shiftKey && elementoActivo === ultimo) {
      eventoTeclado.preventDefault();
      primero.focus();
    }
  }

  verRegistrosDns(): void {
    this.panelDnsAbierto.set(true);
    this.registrosDns.set(null);
    this.guardarFocoYEnfocar("campo-consulta-dns");
    const primerDominio = this.listaDeDominios()[0];
    this.dominioConsultando.set(primerDominio ? primerDominio.nombre : "");
    if (primerDominio) {
      this.ejecutarConsultaDns(primerDominio.nombre);
    }
  }

  cerrarPanelDns(): void {
    this.panelDnsAbierto.set(false);
    this.registrosDns.set(null);
    this.devolverFoco();
  }

  ejecutarConsultaDns(dominio?: string): void {
    const dominioFinal = dominio || this.dominioConsultando().trim();
    if (!dominioFinal) return;

    this.cargandoDns.set(true);
    this.dominioConsultando.set(dominioFinal);
    const componente = this;

    this.http.get<any>("/api/networking/dns/" + encodeURIComponent(dominioFinal)).subscribe({
      next: function (respuesta: any) {
        const datos = respuesta && respuesta.data ? respuesta.data : null;
        const registrosNormalizados: RegistrosDns = {
          a: (datos && datos.a) || [],
          aaaa: (datos && datos.aaaa) || [],
          cname: (datos && datos.cname) || [],
          mx: (datos && datos.mx) || [],
          ns: (datos && datos.ns) || [],
          txt: (datos && datos.txt) || []
        };
        componente.registrosDns.set(registrosNormalizados);
        componente.filasRegistrosDns.set([
          { tipo: "A", valores: registrosNormalizados.a },
          { tipo: "AAAA", valores: registrosNormalizados.aaaa },
          { tipo: "CNAME", valores: registrosNormalizados.cname },
          { tipo: "MX", valores: registrosNormalizados.mx },
          { tipo: "NS", valores: registrosNormalizados.ns },
          { tipo: "TXT", valores: registrosNormalizados.txt }
        ]);
        componente.cargandoDns.set(false);
      },
      error: function () {
        componente.registrosDns.set({ a: [], aaaa: [], cname: [], mx: [], ns: [], txt: [] });
        componente.filasRegistrosDns.set([]);
        componente.cargandoDns.set(false);
      }
    });
  }

  configurarRedirecciones(): void {
    this.panelRedirectsAbierto.set(true);
    this.guardarFocoYEnfocar("campo-origen-redireccion");
    if (this.listaServidores().length > 0 && !this.servidorRedireccion()) {
      this.servidorRedireccion.set(this.listaServidores()[0].id);
    }
    this.cargarRedirecciones();
  }

  cerrarPanelRedirects(): void {
    this.panelRedirectsAbierto.set(false);
    this.hostOrigenNuevo.set("");
    this.urlDestinoNueva.set("");
    this.devolverFoco();
  }

  cargarRedirecciones(): void {
    const servidorId = this.servidorRedireccion();
    if (!servidorId) return;
    this.cargandoRedirecciones.set(true);
    const componente = this;
    this.http.get<any>("/api/networking/redirects/" + servidorId).subscribe({
      next: function (respuesta: any) {
        const lista: RedireccionApi[] = Array.isArray(respuesta) ? respuesta : respuesta && Array.isArray(respuesta.data) ? respuesta.data : [];
        componente.listaRedirecciones.set(lista);
        componente.cargandoRedirecciones.set(false);
      },
      error: function () {
        componente.listaRedirecciones.set([]);
        componente.cargandoRedirecciones.set(false);
      }
    });
  }

  crearRedireccion(): void {
    const origen = this.hostOrigenNuevo().trim();
    const destino = this.urlDestinoNueva().trim();
    const servidorId = this.servidorRedireccion();
    if (!origen || !destino || !servidorId) return;

    this.guardandoRedireccion.set(true);
    const componente = this;
    this.http
      .post("/api/networking/redirects", {
        servidorId: servidorId,
        hostOrigen: origen,
        urlDestino: destino,
        codigoEstado: this.codigoRedireccion()
      })
      .subscribe({
        next: function () {
          componente.guardandoRedireccion.set(false);
          componente.hostOrigenNuevo.set("");
          componente.urlDestinoNueva.set("");
          componente.cargarRedirecciones();
        },
        error: function () {
          componente.guardandoRedireccion.set(false);
          componente.mensajeAccion.set(componente.translate.instant("networking.mensajes.errorCrearRedirect"));
          setTimeout(function () {
            componente.mensajeAccion.set("");
          }, 3000);
        }
      });
  }

  eliminarRedireccion(idRedireccion: string): void {
    const componente = this;
    this.http.delete("/api/networking/redirects/" + idRedireccion).subscribe({
      next: function () {
        componente.cargarRedirecciones();
      },
      error: function () {
        componente.mensajeAccion.set(componente.translate.instant("networking.mensajes.errorEliminarRedirect"));
        setTimeout(function () {
          componente.mensajeAccion.set("");
        }, 3000);
      }
    });
  }
}
