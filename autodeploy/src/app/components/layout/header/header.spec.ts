import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Header } from "./header";

describe("Header", function() {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Header, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("renderiza un elemento header en el DOM", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const header = elemento.querySelector("header");
    expect(header).not.toBeNull();
  });

  it("incluye al menos un enlace o botón", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const interactivos = elemento.querySelectorAll("a, button");
    expect(interactivos.length).toBeGreaterThan(0);
  });
});
