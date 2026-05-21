import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Onboarding } from "./onboarding";

describe("Onboarding", function() {
  let component: Onboarding;
  let fixture: ComponentFixture<Onboarding>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Onboarding, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Onboarding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("usa 'key' como método de autenticación por defecto", function() {
    expect(component.metodoAutenticacion()).toBe("key");
  });

  it("inicializa puerto SSH a 22 y usuario a root", function() {
    expect(component.puertoSsh()).toBe("22");
    expect(component.usuarioSsh()).toBe("root");
  });

  it("inicia con estado de conexión 'waiting'", function() {
    expect(component.estadoConexion()).toBe("waiting");
    expect(component.conectando()).toBeFalse();
  });

  it("inicia con campos de servidor vacíos", function() {
    expect(component.nombreServidor()).toBe("");
    expect(component.direccionIp()).toBe("");
    expect(component.passwordServidor()).toBe("");
    expect(component.claveSshPrivada()).toBe("");
  });

  it("permite cambiar a método 'password'", function() {
    component.metodoAutenticacion.set("password");
    expect(component.metodoAutenticacion()).toBe("password");
  });
});
