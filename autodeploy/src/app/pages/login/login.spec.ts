import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { signal } from "@angular/core";

import { Login } from "./login";
import { UsuarioService } from "../../services/usuario.service";
import { AuthService } from "../../services/auth.service";

const mockUsuarioService = {
  login: jasmine.createSpy("login").and.returnValue(Promise.resolve({ id: "1", nombre: "Test", email: "test@test.com" })),
  emailUsuario: signal(""),
  passwordUsuario: signal("")
};

const mockAuthService = {
  login: jasmine.createSpy("login"),
  estaLogueado: signal(false)
};

describe("Login", function() {
  let componente: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: UsuarioService, useValue: mockUsuarioService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("deberia crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("deberia llamar a usuarioService.login al iniciar sesion con datos validos", async function() {
    componente.emailUsuario.set("test@test.com");
    componente.passwordUsuario.set("password123");

    await componente.iniciarSesion();

    expect(mockUsuarioService.login).toHaveBeenCalledWith("test@test.com", "password123");
  });

  it("deberia mostrar error si el email o password estan vacios", async function() {
    componente.emailUsuario.set("");
    componente.passwordUsuario.set("");

    await componente.iniciarSesion();

    expect(componente.mensajeDeErrorVisible()).toBeTrue();
  });
});
