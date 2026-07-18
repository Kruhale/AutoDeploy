import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Networking } from "./networking";

describe("Networking", function() {
  let fixture: ComponentFixture<Networking>;
  let componente: Networking;
  let httpMock: HttpTestingController;

  const servidoresEjemplo = [
    { id: "srv-1", nombre: "uno", direccionIp: "1.1.1.1", puertoSsh: 22, usuarioSsh: "root", metodoAutenticacion: "password", estado: "OK", fechaCreacion: "2026-01-01" },
    { id: "srv-2", nombre: "dos", direccionIp: "2.2.2.2", puertoSsh: 22, usuarioSsh: "root", metodoAutenticacion: "password", estado: "OK", fechaCreacion: "2026-01-02" }
  ];

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Networking, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Networking);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    const pendientes = httpMock.match(function() { return true; });
    pendientes.forEach(function(p) {
      try { p.flush({ success: true, message: "OK", data: [] }); } catch (e) { /* ignorar */ }
    });
    httpMock.verify();
  });

  function dispararCargaInicial(servidores: any[]) {
    fixture.detectChanges();
    const peticionServidores = httpMock.expectOne("/api/servidores");
    peticionServidores.flush({ success: true, message: "OK", data: servidores });
    // Por cada servidor se hace una petición de subdominios
    servidores.forEach(function(servidor) {
      const peticionSub = httpMock.expectOne("/api/subdominios/servidor/" + servidor.id);
      peticionSub.flush({ success: true, message: "OK", data: [] });
    });
  }

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("inicia con cargando=true y listas vacias", function() {
    expect(componente.cargando()).toBeTrue();
    expect(componente.listaDeDominios().length).toBe(0);
    expect(componente.listaServidores().length).toBe(0);
  });

  it("cargarTodo OK: rellena servidores y subdominios", function() {
    fixture.detectChanges();
    const peticionServidores = httpMock.expectOne("/api/servidores");
    peticionServidores.flush({ success: true, message: "OK", data: servidoresEjemplo });

    const peticionSub1 = httpMock.expectOne("/api/subdominios/servidor/srv-1");
    peticionSub1.flush({
      success: true,
      message: "OK",
      data: [
        { id: "sub-1", servidorId: "srv-1", nombre: "app.test", tipo: "primary", destino: "/", sslActivo: true, fechaCreacion: "x" }
      ]
    });

    const peticionSub2 = httpMock.expectOne("/api/subdominios/servidor/srv-2");
    peticionSub2.flush({ success: true, message: "OK", data: [] });

    expect(componente.listaServidores().length).toBe(2);
    expect(componente.nuevoServidorId()).toBe("srv-1");
    expect(componente.listaDeDominios().length).toBe(1);
    expect(componente.cargando()).toBeFalse();
  });

  it("cargarTodo sin servidores: lista vacia y cargando=false", function() {
    fixture.detectChanges();
    const peticionServidores = httpMock.expectOne("/api/servidores");
    peticionServidores.flush({ success: true, message: "OK", data: [] });

    expect(componente.listaDeDominios().length).toBe(0);
    expect(componente.cargando()).toBeFalse();
  });

  it("cargarTodo: error en listar servidores apaga cargando", function() {
    fixture.detectChanges();
    const peticionServidores = httpMock.expectOne("/api/servidores");
    peticionServidores.error(new ProgressEvent("error"), { status: 500, statusText: "Err" });
    expect(componente.cargando()).toBeFalse();
  });

  it("cargarSubdominios: error en una petición sigue completando", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: servidoresEjemplo });

    httpMock.expectOne("/api/subdominios/servidor/srv-1").error(new ProgressEvent("error"));
    httpMock.expectOne("/api/subdominios/servidor/srv-2").flush({ success: true, message: "OK", data: [] });

    expect(componente.cargando()).toBeFalse();
    expect(componente.listaDeDominios().length).toBe(0);
  });

  it("mostrarFormularioAgregar abre el formulario", function() {
    componente.mostrarFormularioAgregar();
    expect(componente.mostrarFormulario()).toBeTrue();
  });

  it("cancelarFormulario lo cierra y limpia campos", function() {
    componente.mostrarFormulario.set(true);
    componente.nuevoDominio.set("algo");
    componente.nuevoDestino.set("/x");
    componente.cancelarFormulario();
    expect(componente.mostrarFormulario()).toBeFalse();
    expect(componente.nuevoDominio()).toBe("");
    expect(componente.nuevoDestino()).toBe("/");
  });

  it("agregarDominio sin nombre o servidor no hace nada", function() {
    componente.nuevoDominio.set("");
    componente.nuevoServidorId.set("srv-1");
    componente.agregarDominio();
    httpMock.expectNone("/api/subdominios");

    componente.nuevoDominio.set("test.com");
    componente.nuevoServidorId.set("");
    componente.agregarDominio();
    httpMock.expectNone("/api/subdominios");
  });

  it("agregarDominio OK recarga todo", function() {
    dispararCargaInicial(servidoresEjemplo);

    componente.nuevoDominio.set("nuevo.com");
    componente.nuevoServidorId.set("srv-1");
    componente.nuevoTipo.set("primary");
    componente.nuevoDestino.set("");
    componente.agregarDominio();

    const peticion = httpMock.expectOne("/api/subdominios");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body.destino).toBe("/");
    peticion.flush({ success: true, message: "OK", data: { id: "s", servidorId: "srv-1", nombre: "nuevo.com", tipo: "primary", destino: "/", sslActivo: false, fechaCreacion: "x" } });

    expect(componente.guardando()).toBeFalse();
    expect(componente.mostrarFormulario()).toBeFalse();
    // Recarga: vuelve a pedir servidores
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: [] });
  });

  it("agregarDominio con error muestra mensaje y lo limpia", fakeAsync(function() {
    componente.nuevoDominio.set("test.com");
    componente.nuevoServidorId.set("srv-1");
    componente.agregarDominio();
    const peticion = httpMock.expectOne("/api/subdominios");
    peticion.error(new ProgressEvent("error"));

    expect(componente.guardando()).toBeFalse();
    expect(componente.mensajeAccion()).toBeTruthy();
    tick(4000);
    expect(componente.mensajeAccion()).toBe("");
  }));

  it("eliminarDominio OK recarga", function() {
    componente.eliminarDominio("sub-1");
    const peticion = httpMock.expectOne("/api/subdominios/sub-1");
    expect(peticion.request.method).toBe("DELETE");
    peticion.flush({});

    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: [] });
  });

  it("eliminarDominio con error muestra mensaje", fakeAsync(function() {
    componente.eliminarDominio("sub-1");
    const peticion = httpMock.expectOne("/api/subdominios/sub-1");
    peticion.error(new ProgressEvent("error"));

    expect(componente.mensajeAccion()).toBeTruthy();
    tick(4000);
    expect(componente.mensajeAccion()).toBe("");
  }));

  it("renovarSsl sin dominios muestra aviso y lo limpia", fakeAsync(function() {
    componente.listaDeDominios.set([]);
    componente.renovarSsl();
    expect(componente.mensajeAccion()).toBeTruthy();
    tick(3000);
    expect(componente.mensajeAccion()).toBe("");
  }));

  it("renovarSsl OK procesa servidores únicos", fakeAsync(function() {
    componente.listaDeDominios.set([
      { id: "1", servidorId: "srv-1", servidorNombre: "uno", nombre: "a", tipo: "primary", destino: "/", sslActivo: true, estado: "active" },
      { id: "2", servidorId: "srv-1", servidorNombre: "uno", nombre: "b", tipo: "primary", destino: "/", sslActivo: true, estado: "active" },
      { id: "3", servidorId: "srv-2", servidorNombre: "dos", nombre: "c", tipo: "primary", destino: "/", sslActivo: true, estado: "active" }
    ]);
    componente.renovarSsl();

    const p1 = httpMock.expectOne("/api/ssl/srv-1/renovar");
    p1.flush({});
    const p2 = httpMock.expectOne("/api/ssl/srv-2/renovar");
    p2.flush({});

    expect(componente.procesandoSsl()).toBeFalse();
    expect(componente.mensajeAccion()).toBeTruthy();
    // cargarTodo se reactiva
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: [] });
    tick(4000);
  }));

  it("renovarSsl con error muestra mensaje fallido", fakeAsync(function() {
    componente.listaDeDominios.set([
      { id: "1", servidorId: "srv-1", servidorNombre: "uno", nombre: "a", tipo: "primary", destino: "/", sslActivo: true, estado: "active" }
    ]);
    componente.renovarSsl();
    httpMock.expectOne("/api/ssl/srv-1/renovar").error(new ProgressEvent("error"));
    expect(componente.procesandoSsl()).toBeFalse();
    expect(componente.mensajeAccion()).toBeTruthy();
    tick(4000);
  }));

  it("verRegistrosDns sin dominios solo abre panel", function() {
    componente.listaDeDominios.set([]);
    componente.verRegistrosDns();
    expect(componente.panelDnsAbierto()).toBeTrue();
    expect(componente.dominioConsultando()).toBe("");
  });

  it("verRegistrosDns prellena el primer dominio sin lanzar la consulta sola", function() {
    componente.listaDeDominios.set([
      { id: "1", servidorId: "srv-1", servidorNombre: "uno", nombre: "dominio.com", tipo: "primary", destino: "/", sslActivo: false, estado: "active" }
    ]);
    componente.verRegistrosDns();
    expect(componente.panelDnsAbierto()).toBeTrue();
    expect(componente.dominioConsultando()).toBe("dominio.com");

    // No debe auto-consultar: un dominio no resoluble colgaba el modal
    httpMock.expectNone("/api/networking/dns/" + encodeURIComponent("dominio.com"));
    expect(componente.cargandoDns()).toBeFalse();
  });

  it("ejecutarConsultaDns pobla los registros cuando el usuario consulta", function() {
    componente.dominioConsultando.set("dominio.com");
    componente.ejecutarConsultaDns();

    const peticion = httpMock.expectOne("/api/networking/dns/" + encodeURIComponent("dominio.com"));
    peticion.flush({
      success: true,
      message: "OK",
      data: { a: ["1.1.1.1"], aaaa: [], cname: [], mx: [], ns: ["ns1"], txt: [] }
    });

    expect(componente.cargandoDns()).toBeFalse();
    expect(componente.registrosDns()?.a.length).toBe(1);
    expect(componente.filasRegistrosDns().length).toBe(6);
  });

  it("cerrarPanelDns limpia estado", function() {
    componente.panelDnsAbierto.set(true);
    componente.registrosDns.set({ a: [], aaaa: [], cname: [], mx: [], ns: [], txt: [] });
    componente.cerrarPanelDns();
    expect(componente.panelDnsAbierto()).toBeFalse();
    expect(componente.registrosDns()).toBeNull();
  });

  it("ejecutarConsultaDns sin dominio no hace nada", function() {
    componente.dominioConsultando.set("");
    componente.ejecutarConsultaDns();
    httpMock.expectNone(function(req) { return req.url.startsWith("/api/networking/dns/"); });
  });

  it("ejecutarConsultaDns error deja registros vacios", function() {
    componente.ejecutarConsultaDns("err.com");
    const peticion = httpMock.expectOne("/api/networking/dns/" + encodeURIComponent("err.com"));
    peticion.error(new ProgressEvent("error"));

    expect(componente.cargandoDns()).toBeFalse();
    expect(componente.registrosDns()?.a).toEqual([]);
    expect(componente.filasRegistrosDns().length).toBe(0);
  });

  it("ejecutarConsultaDns con respuesta sin data normaliza", function() {
    componente.ejecutarConsultaDns("vacio.com");
    const peticion = httpMock.expectOne("/api/networking/dns/" + encodeURIComponent("vacio.com"));
    peticion.flush({});
    expect(componente.registrosDns()?.a).toEqual([]);
  });

  it("configurarRedirecciones abre panel y carga lista", function() {
    componente.listaServidores.set(servidoresEjemplo);
    componente.configurarRedirecciones();
    expect(componente.panelRedirectsAbierto()).toBeTrue();
    expect(componente.servidorRedireccion()).toBe("srv-1");

    const peticion = httpMock.expectOne("/api/networking/redirects/srv-1");
    peticion.flush({ success: true, message: "OK", data: [{ id: "r-1", servidorId: "srv-1", hostOrigen: "a", urlDestino: "b", codigoEstado: 301 }] });

    expect(componente.cargandoRedirecciones()).toBeFalse();
    expect(componente.listaRedirecciones().length).toBe(1);
  });

  it("cargarRedirecciones sin servidor no hace petición", function() {
    componente.servidorRedireccion.set("");
    componente.cargarRedirecciones();
    httpMock.expectNone(function(req) { return req.url.startsWith("/api/networking/redirects/"); });
  });

  it("cargarRedirecciones con array directo lo acepta", function() {
    componente.servidorRedireccion.set("srv-1");
    componente.cargarRedirecciones();
    const peticion = httpMock.expectOne("/api/networking/redirects/srv-1");
    peticion.flush([{ id: "r-1", servidorId: "srv-1", hostOrigen: "a", urlDestino: "b", codigoEstado: 301 }]);
    expect(componente.listaRedirecciones().length).toBe(1);
  });

  it("cargarRedirecciones con error deja la lista vacia", function() {
    componente.servidorRedireccion.set("srv-1");
    componente.cargarRedirecciones();
    const peticion = httpMock.expectOne("/api/networking/redirects/srv-1");
    peticion.error(new ProgressEvent("error"));
    expect(componente.listaRedirecciones().length).toBe(0);
    expect(componente.cargandoRedirecciones()).toBeFalse();
  });

  it("cerrarPanelRedirects limpia inputs", function() {
    componente.panelRedirectsAbierto.set(true);
    componente.hostOrigenNuevo.set("origen");
    componente.urlDestinoNueva.set("destino");
    componente.cerrarPanelRedirects();
    expect(componente.panelRedirectsAbierto()).toBeFalse();
    expect(componente.hostOrigenNuevo()).toBe("");
    expect(componente.urlDestinoNueva()).toBe("");
  });

  it("crearRedireccion validaciones evitan petición", function() {
    componente.hostOrigenNuevo.set("");
    componente.urlDestinoNueva.set("destino");
    componente.servidorRedireccion.set("srv-1");
    componente.crearRedireccion();
    httpMock.expectNone("/api/networking/redirects");

    componente.hostOrigenNuevo.set("origen");
    componente.urlDestinoNueva.set("");
    componente.crearRedireccion();
    httpMock.expectNone("/api/networking/redirects");

    componente.urlDestinoNueva.set("destino");
    componente.servidorRedireccion.set("");
    componente.crearRedireccion();
    httpMock.expectNone("/api/networking/redirects");
  });

  it("crearRedireccion OK limpia inputs y recarga", function() {
    componente.servidorRedireccion.set("srv-1");
    componente.hostOrigenNuevo.set("origen.com");
    componente.urlDestinoNueva.set("https://destino.com");
    componente.codigoRedireccion.set(302);

    componente.crearRedireccion();
    const peticion = httpMock.expectOne("/api/networking/redirects");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body.codigoEstado).toBe(302);
    peticion.flush({ success: true, message: "OK", data: {} });

    expect(componente.hostOrigenNuevo()).toBe("");
    expect(componente.urlDestinoNueva()).toBe("");
    expect(componente.guardandoRedireccion()).toBeFalse();

    httpMock.expectOne("/api/networking/redirects/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("crearRedireccion error muestra mensaje", fakeAsync(function() {
    componente.servidorRedireccion.set("srv-1");
    componente.hostOrigenNuevo.set("origen.com");
    componente.urlDestinoNueva.set("https://destino.com");

    componente.crearRedireccion();
    const peticion = httpMock.expectOne("/api/networking/redirects");
    peticion.error(new ProgressEvent("error"));

    expect(componente.guardandoRedireccion()).toBeFalse();
    expect(componente.mensajeAccion()).toBeTruthy();
    tick(3000);
    expect(componente.mensajeAccion()).toBe("");
  }));

  it("eliminarRedireccion OK recarga", function() {
    componente.servidorRedireccion.set("srv-1");
    componente.eliminarRedireccion("r-1");
    const peticion = httpMock.expectOne("/api/networking/redirects/r-1");
    expect(peticion.request.method).toBe("DELETE");
    peticion.flush({});
    httpMock.expectOne("/api/networking/redirects/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("eliminarRedireccion error muestra mensaje", fakeAsync(function() {
    componente.eliminarRedireccion("r-1");
    const peticion = httpMock.expectOne("/api/networking/redirects/r-1");
    peticion.error(new ProgressEvent("error"));

    expect(componente.mensajeAccion()).toBeTruthy();
    tick(3000);
    expect(componente.mensajeAccion()).toBe("");
  }));
});
