import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TranslateModule } from "@ngx-translate/core";
import { SelectorIdioma } from "./selector-idioma";
import { IdiomaService } from "../../../services/idioma.service";

describe("SelectorIdioma", function() {
  let fixture: ComponentFixture<SelectorIdioma>;
  let componente: SelectorIdioma;
  let idiomaService: IdiomaService;

  beforeEach(async function() {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SelectorIdioma, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectorIdioma);
    componente = fixture.componentInstance;
    idiomaService = TestBed.inject(IdiomaService);
    fixture.detectChanges();
  });

  afterEach(function() {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("desplegableAbierto arranca cerrado", function() {
    expect(componente.desplegableAbierto).toBeFalse();
  });

  it("modo por defecto es 'desplegable'", function() {
    expect(componente.modo).toBe("desplegable");
  });

  it("abrirCerrarDesplegable invierte el estado", function() {
    expect(componente.desplegableAbierto).toBeFalse();
    componente.abrirCerrarDesplegable();
    expect(componente.desplegableAbierto).toBeTrue();
    componente.abrirCerrarDesplegable();
    expect(componente.desplegableAbierto).toBeFalse();
  });

  it("seleccionarIdioma delega en el servicio y cierra el desplegable", function() {
    spyOn(idiomaService, "cambiarIdioma");
    componente.desplegableAbierto = true;

    componente.seleccionarIdioma("en");

    expect(idiomaService.cambiarIdioma).toHaveBeenCalledWith("en");
    expect(componente.desplegableAbierto).toBeFalse();
  });

  it("idiomaActivoActual devuelve el idioma activo del servicio", function() {
    idiomaService.idiomaActual.set("fr");

    const activo = componente.idiomaActivoActual();

    expect(activo).toBeDefined();
    expect(activo?.codigo).toBe("fr");
    expect(activo?.nombre).toBe("Français");
  });

  it("cerrarSiClicFuera no hace nada cuando el modo no es desplegable", function() {
    componente.modo = "expandido";
    componente.desplegableAbierto = true;
    const evento = { target: document.createElement("section") } as unknown as MouseEvent;

    componente.cerrarSiClicFuera(evento);

    expect(componente.desplegableAbierto).toBeTrue();
  });

  it("cerrarSiClicFuera no hace nada cuando el desplegable ya está cerrado", function() {
    componente.modo = "desplegable";
    componente.desplegableAbierto = false;
    const evento = { target: document.createElement("section") } as unknown as MouseEvent;

    componente.cerrarSiClicFuera(evento);

    expect(componente.desplegableAbierto).toBeFalse();
  });

  it("cerrarSiClicFuera cierra cuando se clica fuera del componente", function() {
    componente.modo = "desplegable";
    componente.desplegableAbierto = true;
    const evento = { target: document.createElement("section") } as unknown as MouseEvent;

    componente.cerrarSiClicFuera(evento);

    expect(componente.desplegableAbierto).toBeFalse();
  });

  it("cerrarSiClicFuera no cierra cuando se clica dentro del componente", function() {
    componente.modo = "desplegable";
    componente.desplegableAbierto = true;
    fixture.detectChanges();
    const elementoInterno = fixture.nativeElement.querySelector("button");
    const evento = { target: elementoInterno } as unknown as MouseEvent;

    componente.cerrarSiClicFuera(evento);

    expect(componente.desplegableAbierto).toBeTrue();
  });

  it("renderiza el modo expandido cuando se cambia el input", function() {
    componente.modo = "expandido";
    fixture.detectChanges();

    const elemento: HTMLElement = fixture.nativeElement;
    const seccionExpandida = elemento.querySelector(".selector-idioma-expandido");

    expect(seccionExpandida).not.toBeNull();
  });
});
