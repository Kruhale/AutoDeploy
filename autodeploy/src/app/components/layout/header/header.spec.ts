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

  it("inicializa las señales de menú y notificaciones en falso", function() {
    expect(component.notificacionesAbiertas()).toBeFalse();
    expect(component.menuMovilAbierto()).toBeFalse();
  });

  it("alternarNotificaciones invierte el valor de la señal", function() {
    expect(component.notificacionesAbiertas()).toBeFalse();
    component.alternarNotificaciones();
    expect(component.notificacionesAbiertas()).toBeTrue();
    component.alternarNotificaciones();
    expect(component.notificacionesAbiertas()).toBeFalse();
  });

  it("alternarMenuMovil invierte el valor de la señal del menú", function() {
    expect(component.menuMovilAbierto()).toBeFalse();
    component.alternarMenuMovil();
    expect(component.menuMovilAbierto()).toBeTrue();
    component.alternarMenuMovil();
    expect(component.menuMovilAbierto()).toBeFalse();
  });

  it("cerrarMenuMovil pone la señal del menú en falso", function() {
    component.alternarMenuMovil();
    expect(component.menuMovilAbierto()).toBeTrue();
    component.cerrarMenuMovil();
    expect(component.menuMovilAbierto()).toBeFalse();
  });

  it("listaNotificaciones expone las 4 notificaciones mock", function() {
    const lista = component.listaNotificaciones();
    expect(lista.length).toBe(4);
  });

  it("contadorSinLeer cuenta las notificaciones no leídas", function() {
    expect(component.contadorSinLeer()).toBe(3);
  });

  it("marcarTodasComoLeidas pone todas las notificaciones como leídas", function() {
    expect(component.contadorSinLeer()).toBeGreaterThan(0);
    component.marcarTodasComoLeidas();
    expect(component.contadorSinLeer()).toBe(0);
    const todasLeidas = component.listaNotificaciones().every(function(notif) {
      return notif.leida === true;
    });
    expect(todasLeidas).toBeTrue();
  });

  it("onEscape cierra ambos paneles cuando estaban abiertos", function() {
    component.alternarMenuMovil();
    component.alternarNotificaciones();
    expect(component.menuMovilAbierto()).toBeTrue();
    expect(component.notificacionesAbiertas()).toBeTrue();

    component.onEscape();

    expect(component.menuMovilAbierto()).toBeFalse();
    expect(component.notificacionesAbiertas()).toBeFalse();
  });
});
