import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TranslateModule } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { ToastNotificaciones } from "./toast-notificaciones";
import { NotificacionService, Notificacion } from "../../../services/notificacion.service";

function crearNotificacionEjemplo(parcial: Partial<Notificacion> = {}): Notificacion {
  return {
    id: parcial.id || "n-1",
    tipo: parcial.tipo || "deployment",
    titulo: parcial.titulo || "Titulo de prueba",
    descripcion: parcial.descripcion || "Descripcion de prueba",
    leida: parcial.leida || false,
    fechaCreacion: parcial.fechaCreacion || "2026-01-01T00:00:00Z"
  };
}

describe("ToastNotificaciones", function() {
  let fixture: ComponentFixture<ToastNotificaciones>;
  let componente: ToastNotificaciones;
  let sujetoRecibidas: Subject<Notificacion>;
  let notificacionFake: { obtenerNotificacionesRecibidas: jasmine.Spy };

  beforeEach(async function() {
    sujetoRecibidas = new Subject<Notificacion>();
    notificacionFake = {
      obtenerNotificacionesRecibidas: jasmine.createSpy("obtenerNotificacionesRecibidas")
        .and.returnValue(sujetoRecibidas.asObservable())
    };

    await TestBed.configureTestingModule({
      imports: [ToastNotificaciones, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificacionService, useValue: notificacionFake }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastNotificaciones);
    componente = fixture.componentInstance;
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("toastsMostrados arranca vacío", function() {
    expect(componente.toastsMostrados.length).toBe(0);
  });

  it("ngOnInit se suscribe al observable del servicio", function() {
    componente.ngOnInit();
    expect(notificacionFake.obtenerNotificacionesRecibidas).toHaveBeenCalled();
  });

  it("al recibir una notificación añade un toast a la lista", function() {
    componente.ngOnInit();

    sujetoRecibidas.next(crearNotificacionEjemplo({ id: "n-100", titulo: "Hola" }));

    expect(componente.toastsMostrados.length).toBe(1);
    expect(componente.toastsMostrados[0].notificacion.titulo).toBe("Hola");
    expect(componente.toastsMostrados[0].id).toContain("toast-");
  });

  it("el toast se elimina automáticamente tras 3 segundos", fakeAsync(function() {
    componente.ngOnInit();

    sujetoRecibidas.next(crearNotificacionEjemplo());
    expect(componente.toastsMostrados.length).toBe(1);

    tick(3000);

    expect(componente.toastsMostrados.length).toBe(0);
  }));

  it("cerrarToast elimina el toast con el id indicado", function() {
    componente.ngOnInit();
    sujetoRecibidas.next(crearNotificacionEjemplo({ id: "n-1" }));
    const idGenerado = componente.toastsMostrados[0].id;

    componente.cerrarToast(idGenerado);

    expect(componente.toastsMostrados.length).toBe(0);
  });

  it("cerrarToast con id inexistente no rompe ni altera la lista", function() {
    componente.ngOnInit();
    sujetoRecibidas.next(crearNotificacionEjemplo());
    const tamanoPrevio = componente.toastsMostrados.length;

    componente.cerrarToast("id-que-no-existe");

    expect(componente.toastsMostrados.length).toBe(tamanoPrevio);
  });

  it("ngOnDestroy cancela la suscripción si existe", function() {
    componente.ngOnInit();
    const suscripcionInterna = (componente as unknown as { suscripcion: { unsubscribe: jasmine.Spy } }).suscripcion;
    spyOn(suscripcionInterna, "unsubscribe");

    componente.ngOnDestroy();

    expect(suscripcionInterna.unsubscribe).toHaveBeenCalled();
  });

  it("ngOnDestroy sin suscripción previa no lanza errores", function() {
    expect(function() {
      componente.ngOnDestroy();
    }).not.toThrow();
  });

  it("obtenerIconoPorTipo devuelve el icono específico de cada tipo", function() {
    expect(componente.obtenerIconoPorTipo("servidor_desconectado")).toBe("fa-server");
    expect(componente.obtenerIconoPorTipo("deployment")).toBe("fa-rocket");
    expect(componente.obtenerIconoPorTipo("error_critico")).toBe("fa-triangle-exclamation");
    expect(componente.obtenerIconoPorTipo("ssl_vencido")).toBe("fa-shield");
    expect(componente.obtenerIconoPorTipo("cambio_configuracion")).toBe("fa-gear");
  });

  it("obtenerIconoPorTipo devuelve fa-bell para tipos desconocidos", function() {
    expect(componente.obtenerIconoPorTipo("xxx")).toBe("fa-bell");
  });

  it("obtenerClasePorTipo devuelve la clase específica de cada tipo", function() {
    expect(componente.obtenerClasePorTipo("servidor_desconectado")).toBe("toast--error");
    expect(componente.obtenerClasePorTipo("deployment")).toBe("toast--info");
    expect(componente.obtenerClasePorTipo("error_critico")).toBe("toast--error");
    expect(componente.obtenerClasePorTipo("ssl_vencido")).toBe("toast--advertencia");
    expect(componente.obtenerClasePorTipo("cambio_configuracion")).toBe("toast--info");
  });

  it("obtenerClasePorTipo devuelve toast--info para tipos desconocidos", function() {
    expect(componente.obtenerClasePorTipo("xxx")).toBe("toast--info");
  });
});
