import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { MigasPan } from "./migas-pan";

describe("MigasPan", function() {
  let component: MigasPan;
  let fixture: ComponentFixture<MigasPan>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [MigasPan, TranslateModule.forRoot()],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MigasPan);
    fixture.componentRef.setInput("migas", []);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("acepta lista vacía sin romper", function() {
    expect(component.migas()).toEqual([]);
  });

  it("renderiza las migas cuando se le pasan", function() {
    fixture.componentRef.setInput("migas", [
      { etiqueta: "Panel", enlace: "/app" },
      { etiqueta: "Servidores", enlace: "/app/servidores" },
      { etiqueta: "Detalle" }
    ]);
    fixture.detectChanges();
    expect(component.migas().length).toBe(3);
    expect(component.migas()[0].etiqueta).toBe("Panel");
    expect(component.migas()[2].enlace).toBeUndefined();
  });

  it("permite migas sin enlace (página actual)", function() {
    const migas = [{ etiqueta: "Soy la actual" }];
    fixture.componentRef.setInput("migas", migas);
    fixture.detectChanges();
    expect(component.migas()[0].enlace).toBeUndefined();
  });
});
