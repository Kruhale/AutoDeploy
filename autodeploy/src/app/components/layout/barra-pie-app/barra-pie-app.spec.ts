import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { BarraPieApp } from "./barra-pie-app";

describe("BarraPieApp", function() {
  let component: BarraPieApp;
  let fixture: ComponentFixture<BarraPieApp>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [BarraPieApp, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BarraPieApp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });
});
