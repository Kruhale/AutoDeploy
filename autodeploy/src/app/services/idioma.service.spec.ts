import { TestBed } from "@angular/core/testing";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideHttpClient } from "@angular/common/http";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { IdiomaService } from "./idioma.service";

describe("IdiomaService", function() {
  let servicio: IdiomaService;
  let translate: TranslateService;
  let httpTest: HttpTestingController;
  const CLAVE_LOCAL = "autodeploy_idioma";

  beforeEach(function() {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        IdiomaService
      ]
    });

    servicio = TestBed.inject(IdiomaService);
    translate = TestBed.inject(TranslateService);
    httpTest = TestBed.inject(HttpTestingController);

    spyOn(translate, "use").and.callThrough();
  });

  afterEach(function() {
    httpTest.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("inicializar usa el idioma guardado en localStorage si es válido", function() {
    localStorage.setItem(CLAVE_LOCAL, "fr");

    servicio.inicializar();

    expect(servicio.idiomaActual()).toBe("fr");
    expect(translate.use).toHaveBeenCalledWith("fr");
  });

  it("inicializar cae al idioma del navegador cuando no hay localStorage", function() {
    const navegadorMock = spyOnProperty(navigator, "language", "get").and.returnValue("de-DE");

    servicio.inicializar();

    expect(servicio.idiomaActual()).toBe("de");
    expect(translate.use).toHaveBeenCalledWith("de");
    expect(navegadorMock).toHaveBeenCalled();
  });

  it("inicializar cae a 'es' cuando el idioma del navegador no está soportado", function() {
    spyOnProperty(navigator, "language", "get").and.returnValue("ja-JP");

    servicio.inicializar();

    expect(servicio.idiomaActual()).toBe("es");
    expect(translate.use).toHaveBeenCalledWith("es");
  });

  it("cambiarIdioma a un idioma soportado lo aplica, persiste y sincroniza con backend", function() {
    sessionStorage.setItem("usuarioId", "usuario-123");

    servicio.cambiarIdioma("en");

    expect(servicio.idiomaActual()).toBe("en");
    expect(translate.use).toHaveBeenCalledWith("en");
    expect(localStorage.getItem(CLAVE_LOCAL)).toBe("en");

    const peticion = httpTest.expectOne("/api/usuarios/usuario-123/idioma");
    expect(peticion.request.method).toBe("PUT");
    expect(peticion.request.body).toEqual({ idioma: "en" });
    peticion.flush({ success: true, message: "OK", data: {} });

    expect(sessionStorage.getItem("idioma")).toBe("en");
  });

  it("cambiarIdioma con un código no soportado no aplica nada", function() {
    servicio.cambiarIdioma("zz");

    expect(servicio.idiomaActual()).toBe("es");
    expect(translate.use).not.toHaveBeenCalled();
    expect(localStorage.getItem(CLAVE_LOCAL)).toBeNull();
    httpTest.expectNone("/api/usuarios/usuario-123/idioma");
  });

  it("cambiarIdioma sin usuarioId en sessionStorage no llama al backend", function() {
    servicio.cambiarIdioma("it");

    expect(servicio.idiomaActual()).toBe("it");
    expect(localStorage.getItem(CLAVE_LOCAL)).toBe("it");
    httpTest.expectNone(function(req) {
      return req.url.includes("/idioma");
    });
  });

  it("aplicarIdiomaDelUsuario aplica el idioma sin llamar al backend", function() {
    sessionStorage.setItem("usuarioId", "usuario-456");

    servicio.aplicarIdiomaDelUsuario("fr");

    expect(servicio.idiomaActual()).toBe("fr");
    expect(localStorage.getItem(CLAVE_LOCAL)).toBe("fr");
    httpTest.expectNone(function(req) {
      return req.url.includes("/idioma");
    });
  });

  it("obtenerIdiomaSoportado devuelve el objeto cuando el código existe", function() {
    const idioma = servicio.obtenerIdiomaSoportado("de");

    expect(idioma).toBeDefined();
    expect(idioma?.nombre).toBe("Deutsch");
    expect(idioma?.bandera).toBe("DE");
  });

  it("obtenerIdiomaSoportado devuelve undefined cuando el código no existe", function() {
    expect(servicio.obtenerIdiomaSoportado("pt")).toBeUndefined();
  });

  it("aplicar un idioma actualiza el atributo lang del documento", function() {
    servicio.cambiarIdioma("it");

    expect(document.documentElement.getAttribute("lang")).toBe("it");
  });
});
