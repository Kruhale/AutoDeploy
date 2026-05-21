import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Sidebar } from "./sidebar.component";

describe("Sidebar", function() {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Sidebar, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("renderiza una etiqueta nav o aside como contenedor", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const contenedor = elemento.querySelector("nav, aside");
    expect(contenedor).not.toBeNull();
  });

  it("incluye al menos un enlace de navegación", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const enlaces = elemento.querySelectorAll("a");
    expect(enlaces.length).toBeGreaterThan(0);
  });
});
