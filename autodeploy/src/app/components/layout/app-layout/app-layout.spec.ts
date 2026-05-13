import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NavigationEnd, provideRouter, Router } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { TranslateModule } from "@ngx-translate/core";
import { Subject } from "rxjs";
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

  it("alternarSidebar dos veces vuelve al valor original", function() {
    const valorInicial = component.sidebarAbierta();
    component.alternarSidebar();
    component.alternarSidebar();
    expect(component.sidebarAbierta()).toBe(valorInicial);
  });

  it("cerrarSidebar pone el flag en false", function() {
    component.sidebarAbierta.set(true);
    component.cerrarSidebar();
    expect(component.sidebarAbierta()).toBeFalse();
  });

  it("cerrarSidebar mantiene el flag en false si ya lo estaba", function() {
    component.sidebarAbierta.set(false);
    component.cerrarSidebar();
    expect(component.sidebarAbierta()).toBeFalse();
  });

  it("themeService debe estar inyectado en el componente", function() {
    expect(component.themeService).toBeTruthy();
  });

  it("cierra la sidebar al detectar un NavigationEnd del router", function() {
    component.sidebarAbierta.set(true);
    const router = TestBed.inject(Router);
    const eventos = router.events as unknown as Subject<unknown>;
    eventos.next(new NavigationEnd(1, "/origen", "/destino"));
    expect(component.sidebarAbierta()).toBeFalse();
  });
});
