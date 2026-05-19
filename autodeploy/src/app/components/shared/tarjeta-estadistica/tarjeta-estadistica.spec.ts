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
});
