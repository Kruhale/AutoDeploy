import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { TranslateModule } from "@ngx-translate/core";
import { AppLayout } from "./app-layout";

describe("AppLayout", function() {
  let component: AppLayout;
  let fixture: ComponentFixture<AppLayout>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [AppLayout, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("alternarSidebar debe invertir el flag sidebarAbierta", function() {
    const valorInicial = component.sidebarAbierta();
    component.alternarSidebar();
    expect(component.sidebarAbierta()).toBe(!valorInicial);
  });
});
