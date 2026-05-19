import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { GestionServidor } from "./gestion-servidor";

describe("GestionServidor", function() {
  let component: GestionServidor;
  let fixture: ComponentFixture<GestionServidor>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [GestionServidor, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionServidor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });
});
