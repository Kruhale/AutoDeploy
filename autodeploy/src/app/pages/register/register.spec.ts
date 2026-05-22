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

  it("inicializa el formulario reactivo con campos vacíos", function() {
    expect(component.formularioRegistro.controls.nombre.value).toBe("");
    expect(component.formularioRegistro.controls.email.value).toBe("");
    expect(component.formularioRegistro.controls.password.value).toBe("");
    expect(component.formularioRegistro.controls.confirmPassword.value).toBe("");
  });

  it("el formulario es invalido inicialmente (todos los campos required)", function() {
    expect(component.formularioRegistro.valid).toBeFalse();
  });

  it("inicializa la password oculta por defecto", function() {
    expect(component.passwordEsVisible()).toBeFalse();
    expect(component.confirmPasswordEsVisible()).toBeFalse();
  });

  it("inicia sin errores ni cargando", function() {
    expect(component.mensajeDeErrorVisible()).toBeFalse();
    expect(component.cargando()).toBeFalse();
  });

  it("criterio de longitud falla con password corta y pasa con 8+", function() {
    component.formularioRegistro.controls.password.setValue("ab");
    expect(component.criterioLongitud()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("12345678");
    expect(component.criterioLongitud()).toBeTrue();
  });

  it("criterio mayuscula detecta correctamente", function() {
    component.formularioRegistro.controls.password.setValue("abcdefgh");
    expect(component.criterioMayuscula()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("Abcdefgh");
    expect(component.criterioMayuscula()).toBeTrue();
  });

  it("criterio numero detecta correctamente", function() {
    component.formularioRegistro.controls.password.setValue("Abcdefgh");
    expect(component.criterioNumero()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("Abcdefg1");
    expect(component.criterioNumero()).toBeTrue();
  });

  it("criterio especial detecta caracteres especiales", function() {
    component.formularioRegistro.controls.password.setValue("Abcdefg1");
    expect(component.criterioEspecial()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("Abcdefg1!");
    expect(component.criterioEspecial()).toBeTrue();
  });

  it("passwordEsValida es true solo cuando se cumplen los 5 criterios", function() {
    component.formularioRegistro.controls.password.setValue("Abcdefg1!");
    expect(component.passwordEsValida()).toBeTrue();
  });

  it("hayConfirmacionInvalida es true cuando confirmPassword no coincide y se ha intentado enviar", function() {
    component.formularioRegistro.patchValue({
      nombre: "Pepe",
      email: "p@x.com",
      password: "Abcdefg1!",
      confirmPassword: "distinto"
    });
    component.formularioRegistro.controls.confirmPassword.markAsTouched();

    expect(component.hayConfirmacionInvalida()).toBeTrue();
  });
});
