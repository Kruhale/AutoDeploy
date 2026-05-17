import { Component, signal, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
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
  imports: [FormsModule],
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
    private servidorService: ServidorService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargando.set(true);
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function(servidores: ServidorRemoto[]) {
        componente.listaServidores.set(servidores);
        if (servidores.length > 0 && !componente.nuevoServidorId()) {
          componente.nuevoServidorId.set(servidores[0].id);
        }
        componente.cargarSubdominios(servidores);
      },
      error: function() {
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

    servidores.forEach(function(servidor) {
      componente.http.get<any>("/api/subdominios/servidor/" + servidor.id).subscribe({
        next: function(respuesta: any) {
          const subdominios: SubdominioApi[] = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
          subdominios.forEach(function(subdominio) {
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
        error: function() {
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
      next: function() {
        componente.guardando.set(false);
        componente.cancelarFormulario();
        componente.cargarTodo();
      },
      error: function() {
        componente.guardando.set(false);
        componente.mensajeAccion.set("Could not add the domain. Try again.");
        setTimeout(function() { componente.mensajeAccion.set(""); }, 4000);
      }
    });
  }

  eliminarDominio(idSubdominio: string): void {
    const componente = this;
    this.http.delete("/api/subdominios/" + idSubdominio).subscribe({
      next: function() {
        componente.cargarTodo();
      },
      error: function() {
        componente.mensajeAccion.set("Could not remove the domain.");
        setTimeout(function() { componente.mensajeAccion.set(""); }, 4000);
      }
    });
  }

  renovarSsl(): void {
    const dominios = this.listaDeDominios();
    if (dominios.length === 0) {
      this.mensajeAccion.set("No domains to renew yet.");
      const componente = this;
      setTimeout(function() { componente.mensajeAccion.set(""); }, 3000);
      return;
    }
    this.procesandoSsl.set(true);
    this.mensajeAccion.set("Triggering SSL renewal on " + dominios.length + " domain(s)…");
    const componente = this;
    const servidoresUnicos = Array.from(new Set(dominios.map(function(d) { return d.servidorId; })));
    let respondidos = 0;

    servidoresUnicos.forEach(function(servidorId) {
      componente.http.post("/api/ssl/" + servidorId + "/renovar", {}).subscribe({
        next: function() {
          respondidos = respondidos + 1;
          if (respondidos === servidoresUnicos.length) {
            componente.procesandoSsl.set(false);
            componente.mensajeAccion.set("SSL renewal completed on " + servidoresUnicos.length + " server(s).");
            setTimeout(function() { componente.mensajeAccion.set(""); }, 4000);
            componente.cargarTodo();
          }
        },
        error: function() {
          respondidos = respondidos + 1;
          if (respondidos === servidoresUnicos.length) {
            componente.procesandoSsl.set(false);
            componente.mensajeAccion.set("SSL renewal failed on one or more servers.");
            setTimeout(function() { componente.mensajeAccion.set(""); }, 4000);
          }
        }
      });
    });
  }

  verRegistrosDns(): void {
    this.panelDnsAbierto.set(true);
    this.registrosDns.set(null);
    const primerDominio = this.listaDeDominios()[0];
    this.dominioConsultando.set(primerDominio ? primerDominio.nombre : "");
    if (primerDominio) {
      this.ejecutarConsultaDns(primerDominio.nombre);
    }
  }

  cerrarPanelDns(): void {
    this.panelDnsAbierto.set(false);
    this.registrosDns.set(null);
  }

  ejecutarConsultaDns(dominio?: string): void {
    const dominioFinal = dominio || this.dominioConsultando().trim();
    if (!dominioFinal) return;

    this.cargandoDns.set(true);
    this.dominioConsultando.set(dominioFinal);
    const componente = this;

    this.http.get<any>("/api/networking/dns/" + encodeURIComponent(dominioFinal)).subscribe({
      next: function(respuesta: any) {
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
      error: function() {
        componente.registrosDns.set({ a: [], aaaa: [], cname: [], mx: [], ns: [], txt: [] });
        componente.filasRegistrosDns.set([]);
        componente.cargandoDns.set(false);
      }
    });
  }

  configurarRedirecciones(): void {
    this.panelRedirectsAbierto.set(true);
    if (this.listaServidores().length > 0 && !this.servidorRedireccion()) {
      this.servidorRedireccion.set(this.listaServidores()[0].id);
    }
    this.cargarRedirecciones();
  }

  cerrarPanelRedirects(): void {
    this.panelRedirectsAbierto.set(false);
    this.hostOrigenNuevo.set("");
    this.urlDestinoNueva.set("");
  }

  cargarRedirecciones(): void {
    const servidorId = this.servidorRedireccion();
    if (!servidorId) return;
    this.cargandoRedirecciones.set(true);
    const componente = this;
    this.http.get<any>("/api/networking/redirects/" + servidorId).subscribe({
      next: function(respuesta: any) {
        const lista: RedireccionApi[] = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
        componente.listaRedirecciones.set(lista);
        componente.cargandoRedirecciones.set(false);
      },
      error: function() {
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
    this.http.post("/api/networking/redirects", {
      servidorId: servidorId,
      hostOrigen: origen,
      urlDestino: destino,
      codigoEstado: this.codigoRedireccion()
    }).subscribe({
      next: function() {
        componente.guardandoRedireccion.set(false);
        componente.hostOrigenNuevo.set("");
        componente.urlDestinoNueva.set("");
        componente.cargarRedirecciones();
      },
      error: function() {
        componente.guardandoRedireccion.set(false);
        componente.mensajeAccion.set("Could not create the redirect");
        setTimeout(function() { componente.mensajeAccion.set(""); }, 3000);
      }
    });
  }

  eliminarRedireccion(idRedireccion: string): void {
    const componente = this;
    this.http.delete("/api/networking/redirects/" + idRedireccion).subscribe({
      next: function() { componente.cargarRedirecciones(); },
      error: function() {
        componente.mensajeAccion.set("Could not delete the redirect");
        setTimeout(function() { componente.mensajeAccion.set(""); }, 3000);
      }
    });
  }
}
