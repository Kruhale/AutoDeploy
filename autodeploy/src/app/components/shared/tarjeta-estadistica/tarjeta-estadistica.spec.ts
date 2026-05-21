import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateModule } from "@ngx-translate/core";
import { TarjetaEstadistica } from "./tarjeta-estadistica";

describe("TarjetaEstadistica", function() {
  let component: TarjetaEstadistica;
  let fixture: ComponentFixture<TarjetaEstadistica>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [TarjetaEstadistica, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TarjetaEstadistica);
    fixture.componentRef.setInput("etiqueta", "Servidores activos");
    fixture.componentRef.setInput("valor", "12");
    fixture.componentRef.setInput("icono", "server");
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("expone los inputs etiqueta, valor e icono", function() {
    expect(component.etiqueta()).toBe("Servidores activos");
    expect(component.valor()).toBe("12");
    expect(component.icono()).toBe("server");
  });

  it("usa variante 'primario' por defecto", function() {
    expect(component.variante()).toBe("primario");
  });

  it("acepta valor 0 en barraProgreso por defecto", function() {
    expect(component.barraProgreso()).toBe(0);
  });

  it("acepta subtexto vacío por defecto", function() {
    expect(component.subtexto()).toBe("");
  });

  it("renderiza etiqueta y valor en el DOM", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.textContent).toContain("Servidores activos");
    expect(elemento.textContent).toContain("12");
  });

  it("aplica nueva variante cuando se cambia el input", function() {
    fixture.componentRef.setInput("variante", "exito");
    fixture.detectChanges();
    expect(component.variante()).toBe("exito");
  });

  it("acepta barraProgreso entre 0 y 100", function() {
    fixture.componentRef.setInput("barraProgreso", 75);
    fixture.detectChanges();
    expect(component.barraProgreso()).toBe(75);
  });
});
