import { TestBed } from "@angular/core/testing";
import { PlanService, PLANES } from "./plan.service";

describe("PlanService", function() {
  let servicio: PlanService;

  beforeEach(function() {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [PlanService]
    });
    servicio = TestBed.inject(PlanService);
  });

  afterEach(function() {
    sessionStorage.clear();
  });

  it("debe crear el servicio", function() {
    expect(servicio).toBeTruthy();
  });

  it("plan inicial por defecto es free cuando sessionStorage esta vacio", function() {
    expect(servicio.planActual()).toBe("free");
  });

  it("activarPlan: guarda el plan en sessionStorage y actualiza la signal", function() {
    servicio.activarPlan("pro");

    expect(sessionStorage.getItem("plan")).toBe("pro");
    expect(servicio.planActual()).toBe("pro");
  });

  it("activarPlan: permite cambiar a business", function() {
    servicio.activarPlan("business");

    expect(sessionStorage.getItem("plan")).toBe("business");
    expect(servicio.planActual()).toBe("business");
  });

  it("obtenerPlan: devuelve el plan free con sus datos correctos", function() {
    const plan = servicio.obtenerPlan("free");

    expect(plan.id).toBe("free");
    expect(plan.precio).toBe(0);
    expect(plan.limiteServidores).toBe(1);
    expect(plan.asistentIa).toBeFalse();
    expect(plan.soporte).toBe("community");
  });

  it("obtenerPlan: devuelve el plan pro con sus datos correctos", function() {
    const plan = servicio.obtenerPlan("pro");

    expect(plan.id).toBe("pro");
    expect(plan.precio).toBe(9);
    expect(plan.limiteServidores).toBe(5);
    expect(plan.limiteDespliegues).toBeNull();
    expect(plan.asistentIa).toBeTrue();
    expect(plan.dominiosPersonalizados).toBe(3);
    expect(plan.gestionEquipos).toBeFalse();
    expect(plan.soporte).toBe("priority");
  });

  it("obtenerPlan: devuelve el plan business con limites null", function() {
    const plan = servicio.obtenerPlan("business");

    expect(plan.id).toBe("business");
    expect(plan.precio).toBe(29);
    expect(plan.limiteServidores).toBeNull();
    expect(plan.limiteDespliegues).toBeNull();
    expect(plan.dominiosPersonalizados).toBeNull();
    expect(plan.gestionEquipos).toBeTrue();
    expect(plan.soporte).toBe("dedicated");
  });

  it("PLANES expone exactamente tres planes", function() {
    expect(PLANES.length).toBe(3);
  });
});
