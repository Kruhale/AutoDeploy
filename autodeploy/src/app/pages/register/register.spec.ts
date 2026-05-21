import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Register } from "./register";

describe("Register", function() {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Register, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("inicializa los signals de formulario vacíos", function() {
    expect(component.nombreCompleto()).toBe("");
    expect(component.emailUsuario()).toBe("");
    expect(component.passwordUsuario()).toBe("");
    expect(component.confirmPasswordUsuario()).toBe("");
  });

  it("inicializa la password oculta por defecto", function() {
    expect(component.passwordEsVisible()).toBeFalse();
    expect(component.confirmPasswordEsVisible()).toBeFalse();
  });

  it("inicia sin errores ni cargando", function() {
    expect(component.mensajeDeErrorVisible()).toBeFalse();
    expect(component.cargando()).toBeFalse();
  });

  it("criterio de longitud falla con password corta", function() {
    component.passwordUsuario.set("ab");
    expect(component.criterioLongitud()).toBeFalse();
  });

  it("criterio de longitud pasa con 8+ caracteres", function() {
    component.passwordUsuario.set("12345678");
    expect(component.criterioLongitud()).toBeTrue();
  });

  it("criterio mayúscula detecta correctamente", function() {
    component.passwordUsuario.set("abcdefgh");
    expect(component.criterioMayuscula()).toBeFalse();
    component.passwordUsuario.set("Abcdefgh");
    expect(component.criterioMayuscula()).toBeTrue();
  });

  it("criterio número detecta correctamente", function() {
    component.passwordUsuario.set("Abcdefgh");
    expect(component.criterioNumero()).toBeFalse();
    component.passwordUsuario.set("Abcdefg1");
    expect(component.criterioNumero()).toBeTrue();
  });

  it("criterio especial detecta caracteres especiales", function() {
    component.passwordUsuario.set("Abcdefg1");
    expect(component.criterioEspecial()).toBeFalse();
    component.passwordUsuario.set("Abcdefg1!");
    expect(component.criterioEspecial()).toBeTrue();
  });
});
