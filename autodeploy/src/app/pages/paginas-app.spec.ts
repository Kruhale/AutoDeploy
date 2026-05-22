import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";

import { Billing } from "./billing/billing";
import { Cuenta } from "./cuenta/cuenta";
import { Firewall } from "./firewall/firewall";
import { Networking } from "./networking/networking";
import { Backups } from "./backups/backups";
import { Pago } from "./pago/pago";
import { ConfirmarFree } from "./confirmar-free/confirmar-free";
import { TerminalSelector } from "./terminal-selector/terminal-selector";
import { TerminalSsh } from "./terminal-ssh/terminal-ssh";
import { Estado } from "./estado/estado";
import { StyleGuide } from "./style-guide/style-guide";

/**
 * Tests smoke para las paginas internas de la app. Verifican que el
 * componente se crea sin lanzar, dejando que HttpTestingController capture
 * las peticiones HTTP del onInit (no se valida la respuesta concreta).
 */
describe("Paginas internas de la app", function() {
  let httpMock: HttpTestingController;

  beforeEach(async function() {
    sessionStorage.clear();
    sessionStorage.setItem("usuarioId", "u-1");
    sessionStorage.setItem("token", "fake-token");

    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot()
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    // Vaciamos cualquier peticion pendiente sin verificar para no romper si
    // un componente hace mas peticiones de las esperadas.
    try { httpMock.match(() => true).forEach(r => r.flush({ success: true, message: "OK", data: [] })); } catch {}
    sessionStorage.clear();
  });

  it("Billing: se crea", function() {
    const fixture = TestBed.createComponent(Billing);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Cuenta: se crea", function() {
    const fixture = TestBed.createComponent(Cuenta);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Firewall: se crea", function() {
    const fixture = TestBed.createComponent(Firewall);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Networking: se crea", function() {
    const fixture = TestBed.createComponent(Networking);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Backups: se crea", function() {
    const fixture = TestBed.createComponent(Backups);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Pago: se crea", function() {
    const fixture = TestBed.createComponent(Pago);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("ConfirmarFree: se crea", function() {
    const fixture = TestBed.createComponent(ConfirmarFree);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("TerminalSelector: se crea", function() {
    const fixture = TestBed.createComponent(TerminalSelector);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("TerminalSsh: se crea", function() {
    const fixture = TestBed.createComponent(TerminalSsh);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Estado: se crea", function() {
    const fixture = TestBed.createComponent(Estado);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("StyleGuide: se crea", function() {
    const fixture = TestBed.createComponent(StyleGuide);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
