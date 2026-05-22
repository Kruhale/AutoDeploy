import { TestBed } from "@angular/core/testing";
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { jwtInterceptor } from "./jwt.interceptor";

describe("jwtInterceptor", function() {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let routerNavigateSpy: jasmine.Spy;

  beforeEach(function() {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy("navigate").and.returnValue(Promise.resolve(true))
          }
        }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    routerNavigateSpy = TestBed.inject(Router).navigate as jasmine.Spy;
  });

  afterEach(function() {
    httpMock.verify();
    sessionStorage.clear();
  });

  it("debe añadir Authorization: Bearer si hay token y la ruta NO es pública", function() {
    sessionStorage.setItem("token", "mi-token-jwt");

    http.get("/api/servidores").subscribe();

    const peticion = httpMock.expectOne("/api/servidores");
    expect(peticion.request.headers.get("Authorization")).toBe("Bearer mi-token-jwt");
    peticion.flush({});
  });

  it("NO debe añadir Authorization en rutas públicas (login)", function() {
    sessionStorage.setItem("token", "mi-token-jwt");

    http.post("/api/usuarios/login", {}).subscribe();

    const peticion = httpMock.expectOne("/api/usuarios/login");
    expect(peticion.request.headers.get("Authorization")).toBeNull();
    peticion.flush({});
  });

  it("NO debe añadir Authorization en rutas públicas (registro)", function() {
    sessionStorage.setItem("token", "mi-token-jwt");

    http.post("/api/usuarios/registro", {}).subscribe();

    const peticion = httpMock.expectOne("/api/usuarios/registro");
    expect(peticion.request.headers.get("Authorization")).toBeNull();
    peticion.flush({});
  });

  it("NO debe añadir Authorization si no hay token en sessionStorage", function() {
    http.get("/api/servidores").subscribe();

    const peticion = httpMock.expectOne("/api/servidores");
    expect(peticion.request.headers.get("Authorization")).toBeNull();
    peticion.flush({});
  });

  it("ante 401 debe limpiar sessionStorage y redirigir a /login con sesionExpirada=true", function(done) {
    sessionStorage.setItem("token", "viejo");
    sessionStorage.setItem("usuarioId", "u1");
    sessionStorage.setItem("plan", "pro");

    http.get("/api/servidores").subscribe({
      next: () => done.fail("no debería pasar"),
      error: function(error: HttpErrorResponse) {
        expect(error.status).toBe(401);
        expect(sessionStorage.getItem("token")).toBeNull();
        expect(sessionStorage.getItem("usuarioId")).toBeNull();
        expect(sessionStorage.getItem("plan")).toBeNull();
        expect(routerNavigateSpy).toHaveBeenCalledWith(["/login"], { queryParams: { sesionExpirada: true } });
        done();
      }
    });

    const peticion = httpMock.expectOne("/api/servidores");
    peticion.flush({}, { status: 401, statusText: "Unauthorized" });
  });

  it("ante 403 NO debe redirigir (es falta de permisos, no sesion expirada)", function(done) {
    sessionStorage.setItem("token", "valido");

    http.get("/api/servidores").subscribe({
      next: () => done.fail("no debería pasar"),
      error: function(error: HttpErrorResponse) {
        expect(error.status).toBe(403);
        expect(routerNavigateSpy).not.toHaveBeenCalled();
        expect(sessionStorage.getItem("token")).toBe("valido");
        done();
      }
    });

    httpMock.expectOne("/api/servidores").flush({}, { status: 403, statusText: "Forbidden" });
  });

  it("ante 500 NO debe limpiar sesión ni redirigir", function(done) {
    sessionStorage.setItem("token", "valido");

    http.get("/api/servidores").subscribe({
      next: () => done.fail("no debería pasar"),
      error: function(error: HttpErrorResponse) {
        expect(error.status).toBe(500);
        expect(sessionStorage.getItem("token")).toBe("valido");
        expect(routerNavigateSpy).not.toHaveBeenCalled();
        done();
      }
    });

    httpMock.expectOne("/api/servidores").flush({}, { status: 500, statusText: "Server Error" });
  });

  it("ante 401 en ruta pública NO debe redirigir (login fallido sigue siendo login)", function(done) {
    http.post("/api/usuarios/login", {}).subscribe({
      next: () => done.fail("no debería pasar"),
      error: function() {
        expect(routerNavigateSpy).not.toHaveBeenCalled();
        done();
      }
    });

    httpMock.expectOne("/api/usuarios/login").flush({}, { status: 401, statusText: "Unauthorized" });
  });
});
