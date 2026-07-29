import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateModule } from "@ngx-translate/core";
import { TerminalDespliegue } from "./terminal-despliegue";

describe("TerminalDespliegue", function () {
  let component: TerminalDespliegue;
  let fixture: ComponentFixture<TerminalDespliegue>;

  beforeEach(async function () {
    await TestBed.configureTestingModule({
      imports: [TerminalDespliegue, TranslateModule.forRoot()]
    }).compileComponents();
    fixture = TestBed.createComponent(TerminalDespliegue);
    component = fixture.componentInstance;
  });

  // fixture.destroy() dispara ngOnDestroy: corta el bucle y limpia temporizadores.
  afterEach(function () {
    fixture.destroy();
  });

  it("debe crear el componente", function () {
    expect(component).toBeTruthy();
  });

  it("prefijoDeLinea mapea cada tipo a su marcador", function () {
    expect(component.prefijoDeLinea("comando")).toBe("$");
    expect(component.prefijoDeLinea("final")).toBe("●");
    expect(component.prefijoDeLinea("paso")).toBe("↳");
  });

  it("numeroDeLinea rellena con cero a la izquierda como un listing", function () {
    expect(component.numeroDeLinea(0)).toBe("01");
    expect(component.numeroDeLinea(5)).toBe("06");
  });

  it("segundosFormateados convierte decimas en segundos con un decimal", function () {
    component.decimasTranscurridas.set(124);
    expect(component.segundosFormateados()).toBe("12.4s");
  });

  it("con reduced-motion muestra el guion entero, sin tecleo ni timer", function () {
    spyOn(window, "matchMedia").and.returnValue({ matches: true } as unknown as MediaQueryList);
    fixture.detectChanges();
    expect(component.lineasEscritas().length).toBeGreaterThan(0);
    expect(component.lineaEnCurso()).toBeNull();
    expect(component.mostrarTimer()).toBeFalse();
  });
});
