import { TestBed } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { ServidorService, PeticionConexionSsh } from "./servidor.service";

describe("ServidorService", function() {
  let servicio: ServidorService;
  let httpMock: HttpTestingController;

  const servidorEjemplo = {
    id: "s1",
    nombre: "Test VPS",
    direccionIp: "1.2.3.4",
    puertoSsh: 22,
    usuarioSsh: "root",
    metodoAutenticacion: "password",
    estado: "conectado",
    fechaCreacion: "2026-05-18T00:00:00"
  };

  beforeEach(function() {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ServidorService]
    });
    servicio = TestBed.inject(ServidorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    httpMock.verify();
  });

  it("debe crear el servicio", function() {
    expect(servicio).toBeTruthy();
  });

  it("listar() debe llamar GET /api/servidores y extraer .data", function(done) {
    servicio.listar().subscribe(function(servidores) {
      expect(servidores.length).toBe(1);
      expect(servidores[0].id).toBe("s1");
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores");
    expect(peticion.request.method).toBe("GET");
    peticion.flush({ success: true, message: "OK", data: [servidorEjemplo] });
  });

  it("obtenerPorId() debe llamar GET /api/servidores/{id}", function(done) {
    servicio.obtenerPorId("s1").subscribe(function(servidor) {
      expect(servidor.id).toBe("s1");
      expect(servidor.nombre).toBe("Test VPS");
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores/s1");
    expect(peticion.request.method).toBe("GET");
    peticion.flush({ success: true, message: "OK", data: servidorEjemplo });
  });

  it("registrar() debe llamar POST /api/servidores con el body completo", function(done) {
    const peticionEsperada: PeticionConexionSsh = {
      nombre: "Nuevo",
      direccionIp: "1.1.1.1",
      puertoSsh: 22,
      usuarioSsh: "root",
      metodoAutenticacion: "password",
      password: "secreto",
      claveSshPrivada: ""
    };

    servicio.registrar(peticionEsperada).subscribe(function(servidor) {
      expect(servidor.id).toBe("s1");
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body).toEqual(peticionEsperada);
    peticion.flush({ success: true, message: "OK", data: servidorEjemplo });
  });

  it("probarConexion() debe llamar POST /api/servidores/probar-conexion y devolver booleano", function(done) {
    const peticionDePrueba: PeticionConexionSsh = {
      nombre: "Probar",
      direccionIp: "1.2.3.4",
      puertoSsh: 22,
      usuarioSsh: "root",
      metodoAutenticacion: "password",
      password: "p",
      claveSshPrivada: ""
    };

    servicio.probarConexion(peticionDePrueba).subscribe(function(resultado) {
      expect(resultado).toBe(true);
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores/probar-conexion");
    expect(peticion.request.method).toBe("POST");
    peticion.flush({ success: true, message: "OK", data: true });
  });

  it("eliminar() debe llamar DELETE /api/servidores/{id}", function(done) {
    servicio.eliminar("s1").subscribe(function() {
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores/s1");
    expect(peticion.request.method).toBe("DELETE");
    peticion.flush(null);
  });

  it("cargarYCachear() debe rellenar el signal servidores con la respuesta del backend", function(done) {
    expect(servicio.servidores().length).toBe(0);

    servicio.cargarYCachear().subscribe(function() {
      expect(servicio.servidores().length).toBe(1);
      expect(servicio.servidores()[0].id).toBe("s1");
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores");
    peticion.flush({ success: true, message: "OK", data: [servidorEjemplo] });
  });

  it("computed cantidadServidores debe reflejar el tamano del signal", function(done) {
    expect(servicio.cantidadServidores()).toBe(0);

    servicio.cargarYCachear().subscribe(function() {
      expect(servicio.cantidadServidores()).toBe(1);
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores");
    peticion.flush({ success: true, message: "OK", data: [servidorEjemplo] });
  });

  it("computed servidoresConectados debe filtrar los que tienen estado=conectado", function(done) {
    const servidorDesconectado = { ...servidorEjemplo, id: "s2", estado: "desconectado" };

    servicio.cargarYCachear().subscribe(function() {
      expect(servicio.servidoresConectados().length).toBe(1);
      expect(servicio.servidoresConectados()[0].id).toBe("s1");
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores");
    peticion.flush({ success: true, message: "OK", data: [servidorEjemplo, servidorDesconectado] });
  });

  it("registrar() debe anadir el servidor nuevo al cache reactivo", function(done) {
    const peticionRegistro: PeticionConexionSsh = {
      nombre: "Nuevo",
      direccionIp: "1.1.1.1",
      puertoSsh: 22,
      usuarioSsh: "root",
      metodoAutenticacion: "password",
      password: "secreto",
      claveSshPrivada: ""
    };

    expect(servicio.cantidadServidores()).toBe(0);

    servicio.registrar(peticionRegistro).subscribe(function() {
      expect(servicio.cantidadServidores()).toBe(1);
      expect(servicio.servidores()[0].id).toBe("s1");
      done();
    });

    const peticion = httpMock.expectOne("/api/servidores");
    peticion.flush({ success: true, message: "OK", data: servidorEjemplo });
  });

  it("eliminar() debe quitar el servidor del cache reactivo", function(done) {
    servicio.cargarYCachear().subscribe(function() {
      expect(servicio.cantidadServidores()).toBe(1);

      servicio.eliminar("s1").subscribe(function() {
        expect(servicio.cantidadServidores()).toBe(0);
        done();
      });

      const peticionBorrado = httpMock.expectOne("/api/servidores/s1");
      peticionBorrado.flush(null);
    });

    const peticionCarga = httpMock.expectOne("/api/servidores");
    peticionCarga.flush({ success: true, message: "OK", data: [servidorEjemplo] });
  });
});
