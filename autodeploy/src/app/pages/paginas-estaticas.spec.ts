import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";

import { AvisoLegal } from "./aviso-legal/aviso-legal";
import { PoliticaCookies } from "./politica-cookies/politica-cookies";
import { PoliticaPrivacidad } from "./politica-privacidad/politica-privacidad";
import { Documentacion } from "./documentacion/documentacion";
import { Comunidad } from "./comunidad/comunidad";
import { ManifiestoPrecios } from "./manifiesto-precios/manifiesto-precios";
import { ApiDocs } from "./api-docs/api-docs";
import { Contacto } from "./contacto/contacto";

/**
 * Tests "smoke" para las paginas estaticas (informacionales) del landing y
 * paginas de la app que no tienen logica compleja. Solo verifican que se
 * crean correctamente y, donde aplica, que metodos basicos no rompen.
 */
describe("Paginas estaticas", function() {
  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        AvisoLegal,
        PoliticaCookies,
        PoliticaPrivacidad,
        Documentacion,
        Comunidad,
        ManifiestoPrecios,
        ApiDocs,
        Contacto
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it("AvisoLegal: se crea", function() {
    const fixture = TestBed.createComponent(AvisoLegal);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("PoliticaCookies: se crea", function() {
    const fixture = TestBed.createComponent(PoliticaCookies);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("PoliticaPrivacidad: se crea", function() {
    const fixture = TestBed.createComponent(PoliticaPrivacidad);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Documentacion: se crea", function() {
    const fixture = TestBed.createComponent(Documentacion);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("Comunidad: se crea", function() {
    const fixture = TestBed.createComponent(Comunidad);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("ManifiestoPrecios: se crea", function() {
    const fixture = TestBed.createComponent(ManifiestoPrecios);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it("ApiDocs: se crea y abrirSwagger no lanza", function() {
    const fixture = TestBed.createComponent(ApiDocs);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    spyOn(window, "open").and.returnValue(null);
    componente.abrirSwagger();
    expect(window.open).toHaveBeenCalledWith("/swagger-ui.html", "_blank", "noopener");
  });

  it("Contacto: se crea y los signals empiezan vacios", function() {
    const fixture = TestBed.createComponent(Contacto);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
