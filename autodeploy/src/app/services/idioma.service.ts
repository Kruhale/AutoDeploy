import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { TranslateService } from "@ngx-translate/core";

interface IdiomaSoportado {
  codigo: string;
  nombre: string;
  bandera: string;
}

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

const CLAVE_LOCAL_STORAGE = "autodeploy_idioma";
const IDIOMA_POR_DEFECTO = "es";

@Injectable({ providedIn: "root" })
export class IdiomaService {

  readonly idiomasSoportados: IdiomaSoportado[] = [
    { codigo: "es", nombre: "Español", bandera: "ES" },
    { codigo: "en", nombre: "English", bandera: "EN" },
    { codigo: "fr", nombre: "Français", bandera: "FR" },
    { codigo: "de", nombre: "Deutsch", bandera: "DE" },
    { codigo: "it", nombre: "Italiano", bandera: "IT" }
  ];

  idiomaActual = signal<string>(IDIOMA_POR_DEFECTO);

  private translate = inject(TranslateService);
  private http = inject(HttpClient);

  inicializar(): void {
    const idiomaGuardado = this.leerIdiomaLocal();
    const idiomaInicial = idiomaGuardado || this.detectarDelNavegador();
    this.aplicarIdiomaSinPersistir(idiomaInicial);
  }

  cambiarIdioma(codigo: string): void {
    if (!this.esIdiomaValido(codigo)) {
      return;
    }
    this.aplicarIdiomaSinPersistir(codigo);
    this.persistirEnLocal(codigo);
    this.sincronizarConBackend(codigo);
  }

  aplicarIdiomaDelUsuario(codigo: string): void {
    if (!this.esIdiomaValido(codigo)) {
      return;
    }
    this.aplicarIdiomaSinPersistir(codigo);
    this.persistirEnLocal(codigo);
  }

  obtenerIdiomaSoportado(codigo: string): IdiomaSoportado | undefined {
    const componente = this;
    return componente.idiomasSoportados.find(function(idioma: IdiomaSoportado) {
      return idioma.codigo === codigo;
    });
  }

  private aplicarIdiomaSinPersistir(codigo: string): void {
    this.translate.use(codigo);
    this.idiomaActual.set(codigo);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", codigo);
    }
  }

  private persistirEnLocal(codigo: string): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(CLAVE_LOCAL_STORAGE, codigo);
  }

  private leerIdiomaLocal(): string | null {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    const guardado = window.localStorage.getItem(CLAVE_LOCAL_STORAGE);
    if (guardado && this.esIdiomaValido(guardado)) {
      return guardado;
    }
    return null;
  }

  private detectarDelNavegador(): string {
    if (typeof navigator === "undefined" || !navigator.language) {
      return IDIOMA_POR_DEFECTO;
    }
    const codigo = navigator.language.substring(0, 2).toLowerCase();
    if (this.esIdiomaValido(codigo)) {
      return codigo;
    }
    return IDIOMA_POR_DEFECTO;
  }

  private esIdiomaValido(codigo: string): boolean {
    const componente = this;
    return componente.idiomasSoportados.some(function(idioma: IdiomaSoportado) {
      return idioma.codigo === codigo;
    });
  }

  private sincronizarConBackend(codigo: string): void {
    const usuarioId = sessionStorage.getItem("usuarioId");
    if (!usuarioId) {
      return;
    }
    const cuerpo = { idioma: codigo };
    this.http.put<RespuestaApi<DatosUsuario>>("/api/usuarios/" + usuarioId + "/idioma", cuerpo)
      .subscribe({
        next: function() {
          sessionStorage.setItem("idioma", codigo);
        },
        error: function() {
          // Persistencia local ya hecha; ignoramos fallos transitorios
        }
      });
  }
}
