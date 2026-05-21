import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { NuevoDespliegue } from "./nuevo-despliegue";

describe("NuevoDespliegue", function() {
  let component: NuevoDespliegue;
  let fixture: ComponentFixture<NuevoDespliegue>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [NuevoDespliegue, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NuevoDespliegue);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("inicia con origenCodigo 'git'", function() {
    expect(component.origenCodigo()).toBe("git");
  });

  it("inicia con sslActivo en true", function() {
    expect(component.sslActivo()).toBeTrue();
  });

  it("inicia con rama 'main' y directorio './'", function() {
    expect(component.rama()).toBe("main");
    expect(component.directorioRaiz()).toBe("./");
  });

  it("permite cambiar origenCodigo a 'zip'", function() {
    component.cambiarOrigenCodigo("zip");
    expect(component.origenCodigo()).toBe("zip");
  });

  it("alternarSsl invierte el estado SSL", function() {
    const inicial = component.sslActivo();
    component.alternarSsl();
    expect(component.sslActivo()).toBe(!inicial);
  });

  it("seleccionarTecnologia actualiza la selección", function() {
    component.seleccionarTecnologia("PHP");
    expect(component.tecnologiaSeleccionada()).toBe("PHP");
  });

  it("carga 4 opciones de tecnología", function() {
    expect(component.opcionesDeTecnologia().length).toBe(4);
  });

  it("limpia mensajes al cambiar origen", function() {
    component.mensajeError.set("error previo");
    component.mensajeExito.set("éxito previo");
    component.cambiarOrigenCodigo("zip");
    expect(component.mensajeError()).toBe("");
    expect(component.mensajeExito()).toBe("");
  });
});
