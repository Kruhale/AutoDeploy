import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { Router } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Login } from "./login";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

describe("Login", function() {
  let componente: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let usuarioServiceSpy: jasmine.SpyObj<UsuarioService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async function() {
    authServiceSpy = jasmine.createSpyObj<AuthService>("AuthService", ["login", "logout"]);
    usuarioServiceSpy = jasmine.createSpyObj<UsuarioService>("UsuarioService", ["login"]);
    routerSpy = jasmine.createSpyObj<Router>("Router", ["navigate"]);

    await TestBed.configureTestingModule({
      imports: [Login, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UsuarioService, useValue: usuarioServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("debe rechazar login con campos vacíos", fakeAsync(function() {
    componente.emailUsuario.set("");
    componente.passwordUsuario.set("");

    componente.iniciarSesion();
    tick();

    expect(componente.mensajeDeErrorVisible()).toBe(true);
    expect(usuarioServiceSpy.login).not.toHaveBeenCalled();
  }));

  it("debe llamar a UsuarioService.login con email/password correctos y navegar a /app", fakeAsync(function() {
    componente.emailUsuario.set("test@test.com");
    componente.passwordUsuario.set("password123");
    usuarioServiceSpy.login.and.returnValue(Promise.resolve({} as any));

    componente.iniciarSesion();
    tick();

    expect(usuarioServiceSpy.login).toHaveBeenCalledOnceWith("test@test.com", "password123");
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(["/app"]);
  }));

  it("debe mostrar mensaje de error si login falla", fakeAsync(function() {
    componente.emailUsuario.set("test@test.com");
    componente.passwordUsuario.set("malpassword");
    usuarioServiceSpy.login.and.returnValue(Promise.reject(new Error("Credenciales invalidas")));

    componente.iniciarSesion();
    tick();

    expect(componente.mensajeDeErrorVisible()).toBe(true);
    expect(componente.mensajeDeError()).toBe("Credenciales invalidas");
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  }));

  it("alternarVisibilidadPassword debe alternar el flag", function() {
    expect(componente.passwordEsVisible()).toBe(false);
    componente.alternarVisibilidadPassword();
    expect(componente.passwordEsVisible()).toBe(true);
    componente.alternarVisibilidadPassword();
    expect(componente.passwordEsVisible()).toBe(false);
  });

  it("codigoSesion debe ser un hex de 6 caracteres", function() {
    expect(componente.codigoSesion).toMatch(/^[0-9A-F]{6}$/);
  });
});
