import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Home } from "./home";

describe("Home", function() {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Home, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("renderiza secciones principales (hero, features, pricing, cta)", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelector("#features")).not.toBeNull();
    expect(elemento.querySelector("#how-it-works")).not.toBeNull();
    expect(elemento.querySelector("#pricing")).not.toBeNull();
  });

  it("renderiza enlaces y botones de CTA", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const ctas = elemento.querySelectorAll("a, button");
    expect(ctas.length).toBeGreaterThan(0);
  });

  it("incluye iconos de tecnologías", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const iconos = elemento.querySelectorAll("i, svg");
    expect(iconos.length).toBeGreaterThan(0);
  });
});
