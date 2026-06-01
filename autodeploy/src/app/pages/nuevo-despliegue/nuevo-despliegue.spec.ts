import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient, HttpEventType } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter, Router } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { NuevoDespliegue } from "./nuevo-despliegue";

describe("NuevoDespliegue", function() {
  let component: NuevoDespliegue;
  let fixture: ComponentFixture<NuevoDespliegue>;
  let httpMock: HttpTestingController;
  let router: Router;

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
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(function() {
    // Vaciamos posibles peticiones pendientes de cargarServidores en ngOnInit
    const pendientes = httpMock.match(function() { return true; });
    pendientes.forEach(function(p) { p.flush({ success: true, message: "OK", data: [] }); });
    httpMock.verify();
  });

  function construirArchivo(nombre: string, tamanoBytes: number): File {
    const blob = new Blob([new Uint8Array(tamanoBytes)], { type: "application/zip" });
    return new File([blob], nombre, { type: "application/zip" });
  }

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("inicia con origenCodigo 'git'", function() {
    expect(component.origenCodigo()).toBe("git");
  });

  it("inicia con sslActivo en true", function() {
    expect(component.sslActivo()).toBeTrue();
  });

  it("inicia con rama 'main' y directorio destino por defecto", function() {
    expect(component.rama()).toBe("main");
    expect(component.directorioRemotoGit()).toBe("~/apps/miapp");
  });

  it("permite cambiar origenCodigo a 'zip'", function() {
    component.cambiarOrigenCodigo("zip");
    expect(component.origenCodigo()).toBe("zip");
  });

  it("alternarSsl invierte el estado SSL", function() {
    const inicial = component.sslActivo();
    component.alternarSsl();
    expect(component.sslActivo()).toBe(!inicial);
  });

  it("seleccionarTecnologia actualiza la selección", function() {
    component.seleccionarTecnologia("PHP");
    expect(component.tecnologiaSeleccionada()).toBe("PHP");
  });

  it("carga 5 opciones de tecnología", function() {
    expect(component.opcionesDeTecnologia().length).toBe(5);
  });

  it("limpia mensajes al cambiar origen", function() {
    component.mensajeError.set("error previo");
    component.mensajeExito.set("éxito previo");
    component.cambiarOrigenCodigo("zip");
    expect(component.mensajeError()).toBe("");
    expect(component.mensajeExito()).toBe("");
  });

  it("cancelar navega al dashboard", function() {
    const espiaNavegar = spyOn(router, "navigate");
    component.cancelar();
    expect(espiaNavegar).toHaveBeenCalledWith(["/app/dashboard"]);
  });

  it("onDragOver activa archivoArrastrandose y previene default", function() {
    const eventoFalso = new DragEvent("dragover");
    const espiaPrevenir = spyOn(eventoFalso, "preventDefault");
    component.onDragOver(eventoFalso);
    expect(component.archivoArrastrandose()).toBeTrue();
    expect(espiaPrevenir).toHaveBeenCalled();
  });

  it("onDragLeave desactiva archivoArrastrandose", function() {
    component.archivoArrastrandose.set(true);
    const eventoFalso = new DragEvent("dragleave");
    spyOn(eventoFalso, "preventDefault");
    component.onDragLeave(eventoFalso);
    expect(component.archivoArrastrandose()).toBeFalse();
  });

  it("onDropArchivo acepta zip válido", function() {
    const archivoValido = construirArchivo("app.zip", 1024);
    const eventoFalso = {
      preventDefault: function() {},
      dataTransfer: { files: [archivoValido] }
    } as unknown as DragEvent;
    component.onDropArchivo(eventoFalso);
    expect(component.archivoArrastrandose()).toBeFalse();
    expect(component.archivoZipSeleccionado()).toBe(archivoValido);
  });

  it("onDropArchivo sin archivos no falla", function() {
    const eventoFalso = {
      preventDefault: function() {},
      dataTransfer: { files: [] }
    } as unknown as DragEvent;
    component.onDropArchivo(eventoFalso);
    expect(component.archivoZipSeleccionado()).toBeNull();
  });

  it("onSeleccionarArchivo guarda el archivo del input", function() {
    const archivoValido = construirArchivo("app.zip", 1024);
    const eventoFalso = {
      target: { files: [archivoValido] }
    } as unknown as Event;
    component.onSeleccionarArchivo(eventoFalso);
    expect(component.archivoZipSeleccionado()).toBe(archivoValido);
  });

  it("onSeleccionarArchivo sin archivos no altera el signal", function() {
    const eventoFalso = { target: { files: null } } as unknown as Event;
    component.onSeleccionarArchivo(eventoFalso);
    expect(component.archivoZipSeleccionado()).toBeNull();
  });

  it("aceptarArchivo rechaza archivos que no sean .zip", function() {
    const archivoMalo = construirArchivo("imagen.png", 1024);
    const eventoFalso = {
      preventDefault: function() {},
      dataTransfer: { files: [archivoMalo] }
    } as unknown as DragEvent;
    component.onDropArchivo(eventoFalso);
    expect(component.archivoZipSeleccionado()).toBeNull();
    expect(component.mensajeError()).not.toBe("");
  });

  it("aceptarArchivo rechaza archivo mayor a 50MB", function() {
    const tamanoExcedido = 51 * 1024 * 1024;
    const archivoGrande = construirArchivo("grande.zip", tamanoExcedido);
    const eventoFalso = {
      preventDefault: function() {},
      dataTransfer: { files: [archivoGrande] }
    } as unknown as DragEvent;
    component.onDropArchivo(eventoFalso);
    expect(component.archivoZipSeleccionado()).toBeNull();
    expect(component.mensajeError()).not.toBe("");
  });

  it("quitarArchivo limpia el archivo y resetea progreso", function() {
    component.archivoZipSeleccionado.set(construirArchivo("app.zip", 512));
    component.progresoSubida.set(80);
    const eventoFalso = { stopPropagation: function() {} } as unknown as Event;
    component.quitarArchivo(eventoFalso);
    expect(component.archivoZipSeleccionado()).toBeNull();
    expect(component.progresoSubida()).toBe(0);
  });

  it("tamanoLegible devuelve bytes para valores pequeños", function() {
    expect(component.tamanoLegible(500)).toBe("500 B");
  });

  it("tamanoLegible devuelve KB para valores medios", function() {
    expect(component.tamanoLegible(2048)).toBe("2.0 KB");
  });

  it("tamanoLegible devuelve MB para valores grandes", function() {
    expect(component.tamanoLegible(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("lanzarDespliegue exige servidor destino", function() {
    component.servidorDestinoId.set("");
    component.lanzarDespliegue();
    expect(component.mensajeError()).not.toBe("");
  });

  it("lanzarDespliegueGit exige repositorioUrl", function() {
    component.servidorDestinoId.set("srv-1");
    component.repositorioUrl.set("");
    component.lanzarDespliegue();
    expect(component.mensajeError()).not.toBe("");
  });

  it("lanzarDespliegueGit exige directorio remoto", function() {
    component.servidorDestinoId.set("srv-1");
    component.repositorioUrl.set("https://github.com/test/repo");
    component.directorioRemotoGit.set("   ");
    component.lanzarDespliegue();
    expect(component.mensajeError()).not.toBe("");
  });

  it("lanzarDespliegueGit OK navega al dashboard tras éxito", fakeAsync(function() {
    const espiaNavegar = spyOn(router, "navigate");
    component.servidorDestinoId.set("srv-1");
    component.repositorioUrl.set("https://github.com/test/repo");
    component.directorioRemotoGit.set("~/apps/x");
    component.lanzarDespliegue();

    const peticion = httpMock.expectOne("/api/deploy/git");
    expect(peticion.request.method).toBe("POST");
    peticion.flush({ success: true, message: "OK", data: {} });

    expect(component.desplegando()).toBeFalse();
    expect(component.mensajeExito()).not.toBe("");
    tick(1500);
    expect(espiaNavegar).toHaveBeenCalledWith(["/app/dashboard"]);
  }));

  it("lanzarDespliegueGit con error muestra mensaje del backend", function() {
    component.servidorDestinoId.set("srv-1");
    component.repositorioUrl.set("https://github.com/test/repo");
    component.directorioRemotoGit.set("~/apps/x");
    component.lanzarDespliegue();

    const peticion = httpMock.expectOne("/api/deploy/git");
    peticion.flush({ message: "Repo invalido" }, { status: 400, statusText: "Bad Request" });

    expect(component.desplegando()).toBeFalse();
    expect(component.mensajeError()).toBeTruthy();
  });

  it("lanzarDespliegueZip exige archivo", function() {
    component.servidorDestinoId.set("srv-1");
    component.cambiarOrigenCodigo("zip");
    component.archivoZipSeleccionado.set(null);
    component.lanzarDespliegue();
    expect(component.mensajeError()).not.toBe("");
  });

  it("lanzarDespliegueZip exige directorio", function() {
    component.servidorDestinoId.set("srv-1");
    component.cambiarOrigenCodigo("zip");
    component.archivoZipSeleccionado.set(construirArchivo("app.zip", 1024));
    component.directorioRemotoZip.set("   ");
    component.lanzarDespliegue();
    expect(component.mensajeError()).not.toBe("");
  });

  it("lanzarDespliegueZip actualiza progreso y completa al recibir Response", fakeAsync(function() {
    const espiaNavegar = spyOn(router, "navigate");
    component.servidorDestinoId.set("srv-1");
    component.cambiarOrigenCodigo("zip");
    component.archivoZipSeleccionado.set(construirArchivo("app.zip", 2048));
    component.directorioRemotoZip.set("/var/www/x");

    component.lanzarDespliegue();

    const peticion = httpMock.expectOne("/api/deploy/zip");
    expect(peticion.request.method).toBe("POST");

    peticion.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 } as any);
    expect(component.progresoSubida()).toBe(50);

    peticion.flush({ success: true, message: "OK", data: {} });

    expect(component.desplegando()).toBeFalse();
    expect(component.progresoSubida()).toBe(100);
    expect(component.mensajeExito()).not.toBe("");
    tick(2000);
    expect(espiaNavegar).toHaveBeenCalledWith(["/app/dashboard"]);
  }));

  it("lanzarDespliegueZip con error muestra mensaje", function() {
    component.servidorDestinoId.set("srv-1");
    component.cambiarOrigenCodigo("zip");
    component.archivoZipSeleccionado.set(construirArchivo("app.zip", 1024));
    component.directorioRemotoZip.set("/var/www/x");

    component.lanzarDespliegue();

    const peticion = httpMock.expectOne("/api/deploy/zip");
    peticion.flush({ message: "Tamaño excede" }, { status: 413, statusText: "Too Large" });

    expect(component.desplegando()).toBeFalse();
    expect(component.progresoSubida()).toBe(0);
    expect(component.mensajeError()).toBeTruthy();
  });

  it("cargarServidores en ngOnInit asigna el primer servidor por defecto", function() {
    // El fixture ya disparó ngOnInit; aquí flusheamos lo pendiente
    const peticion = httpMock.expectOne("/api/servidores");
    peticion.flush({
      success: true,
      message: "OK",
      data: [
        { id: "s-1", nombre: "uno", direccionIp: "1.1.1.1", puertoSsh: 22, usuarioSsh: "root", metodoAutenticacion: "password", estado: "OK", fechaCreacion: "x" }
      ]
    });
    expect(component.listaServidores().length).toBe(1);
    expect(component.servidorDestinoId()).toBe("s-1");
  });
});
