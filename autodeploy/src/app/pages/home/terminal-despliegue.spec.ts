import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TerminalDespliegue } from "./terminal-despliegue";

describe("TerminalDespliegue", function () {
  let component: TerminalDespliegue;
  let fixture: ComponentFixture<TerminalDespliegue>;

  beforeEach(async function () {
    await TestBed.configureTestingModule({ imports: [TerminalDespliegue] }).compileComponents();
    fixture = TestBed.createComponent(TerminalDespliegue);
    component = fixture.componentInstance;
  });

  // fixture.destroy() dispara ngOnDestroy: corta el bucle y limpia el temporizador.
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

  it("con reduced-motion muestra el guion entero y sin linea en curso", function () {
    spyOn(window, "matchMedia").and.returnValue({ matches: true } as unknown as MediaQueryList);
    fixture.detectChanges();
    expect(component.lineasEscritas().length).toBeGreaterThan(0);
    expect(component.lineaEnCurso()).toBeNull();
  });
});
