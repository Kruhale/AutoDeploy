import { TestBed } from "@angular/core/testing";
import { ThemeService } from "./theme.service";

describe("ThemeService", function() {
  const CLAVE_ALMACEN = "tema";
  const CLASE_TEMA_CLARO = "tema-claro";
  let matchMediaOriginal: typeof window.matchMedia;
  let listenersRegistrados: Array<(evento: MediaQueryListEvent) => void>;

  function configurarMatchMedia(esquemaClaro: boolean) {
    window.matchMedia = function(consulta: string): MediaQueryList {
      const lista = {
        media: consulta,
        matches: consulta.includes("prefers-color-scheme: light") && esquemaClaro,
        onchange: null,
        addEventListener: function(_tipo: string, cb: (evento: MediaQueryListEvent) => void) {
          listenersRegistrados.push(cb);
        },
        removeEventListener: function() { /* noop en test */ },
        addListener: function() { /* legacy */ },
        removeListener: function() { /* legacy */ },
        dispatchEvent: function() { return true; }
      } as unknown as MediaQueryList;
      return lista;
    };
  }

  function disparaCambioSistema(esquemaClaro: boolean) {
    const evento = { matches: esquemaClaro } as MediaQueryListEvent;
    listenersRegistrados.forEach(function(cb) {
      cb(evento);
    });
  }

  beforeEach(function() {
    localStorage.removeItem(CLAVE_ALMACEN);
    document.documentElement.classList.remove(CLASE_TEMA_CLARO);
    matchMediaOriginal = window.matchMedia;
    listenersRegistrados = [];
  });

  afterEach(function() {
    window.matchMedia = matchMediaOriginal;
    localStorage.removeItem(CLAVE_ALMACEN);
    document.documentElement.classList.remove(CLASE_TEMA_CLARO);
  });

  it("usa el tema oscuro por defecto cuando no hay localStorage ni preferencia del sistema", function() {
    configurarMatchMedia(false);
    const servicio = TestBed.inject(ThemeService);
    expect(servicio.temaActual()).toBe("oscuro");
  });

  it("respeta la preferencia del sistema cuando no hay valor guardado", function() {
    configurarMatchMedia(true);
    const servicio = TestBed.inject(ThemeService);
    expect(servicio.temaActual()).toBe("claro");
  });

  it("prevalece el valor de localStorage sobre la preferencia del sistema", function() {
    localStorage.setItem(CLAVE_ALMACEN, "oscuro");
    configurarMatchMedia(true);
    const servicio = TestBed.inject(ThemeService);
    expect(servicio.temaActual()).toBe("oscuro");
  });

  it("alternarTema cambia el signal", function() {
    configurarMatchMedia(false);
    const servicio = TestBed.inject(ThemeService);
    expect(servicio.temaActual()).toBe("oscuro");

    servicio.alternarTema();
    expect(servicio.temaActual()).toBe("claro");

    servicio.alternarTema();
    expect(servicio.temaActual()).toBe("oscuro");
  });

  it("reacciona a cambios del sistema mientras no haya elección manual", function() {
    configurarMatchMedia(false);
    const servicio = TestBed.inject(ThemeService);
    expect(servicio.temaActual()).toBe("oscuro");

    disparaCambioSistema(true);
    expect(servicio.temaActual()).toBe("claro");

    disparaCambioSistema(false);
    expect(servicio.temaActual()).toBe("oscuro");
  });

  it("ignora cambios del sistema una vez el usuario eligió manualmente", function() {
    configurarMatchMedia(false);
    const servicio = TestBed.inject(ThemeService);

    servicio.alternarTema();
    expect(servicio.temaActual()).toBe("claro");

    disparaCambioSistema(false);
    expect(servicio.temaActual()).toBe("claro");
  });
});
