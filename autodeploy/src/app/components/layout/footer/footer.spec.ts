import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Footer } from "./footer";

describe("Footer", function() {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Footer, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("renderiza un elemento footer en el DOM", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const footer = elemento.querySelector("footer");
    expect(footer).not.toBeNull();
  });

  it("incluye enlaces de navegación", function() {
    const elemento: HTMLElement = fixture.nativeElement;
    const enlaces = elemento.querySelectorAll("a");
    expect(enlaces.length).toBeGreaterThan(0);
  });

  it("usa el selector app-footer", function() {
    expect(fixture.nativeElement.tagName.toLowerCase()).toBe("app-footer");
  });
});
