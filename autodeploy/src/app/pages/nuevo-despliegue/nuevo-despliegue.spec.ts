import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { NuevoDespliegue } from "./nuevo-despliegue";

describe("NuevoDespliegue", function() {
  let component: NuevoDespliegue;
  let fixture: ComponentFixture<NuevoDespliegue>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [NuevoDespliegue, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NuevoDespliegue);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });
});
