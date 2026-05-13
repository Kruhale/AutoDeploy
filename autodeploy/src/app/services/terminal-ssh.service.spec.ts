import { TestBed } from "@angular/core/testing";
import { TerminalSshService } from "./terminal-ssh.service";

// Stub minimo de WebSocket que captura los listeners y permite simular eventos
class WebSocketStub {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = WebSocketStub.CONNECTING;
  onopen: ((ev?: any) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev?: any) => void) | null = null;
  onclose: ((ev?: any) => void) | null = null;
  enviados: string[] = [];

  constructor(public url: string) {}

  send(data: string) {
    this.enviados.push(data);
  }

  close() {
    this.readyState = WebSocketStub.CLOSED;
    if (this.onclose) {
      this.onclose();
    }
  }
}

describe("TerminalSshService", function() {
  let service: TerminalSshService;
  let socketCreado: WebSocketStub | null;
  let originalWebSocket: any;

  beforeEach(function() {
    socketCreado = null;
    originalWebSocket = (window as any).WebSocket;
    const fakeCtor: any = function (url: string) {
      socketCreado = new WebSocketStub(url);
      return socketCreado as any;
    };
    fakeCtor.CONNECTING = 0;
    fakeCtor.OPEN = 1;
    fakeCtor.CLOSING = 2;
    fakeCtor.CLOSED = 3;
    (window as any).WebSocket = fakeCtor;

    TestBed.configureTestingModule({
      providers: [TerminalSshService]
    });
    service = TestBed.inject(TerminalSshService);
  });

  afterEach(function() {
    (window as any).WebSocket = originalWebSocket;
  });

  it("se crea y empieza desconectado", function() {
    expect(service.estadoConexion()).toBe("desconectado");
  });

  it("conectar: abre WS y pone estado a conectando", function() {
    service.conectar("srv-1");
    expect(service.estadoConexion()).toBe("conectando");
    expect(socketCreado).not.toBeNull();
    expect(socketCreado!.url).toContain("/ws/terminal");
  });

  it("conectar: al recibir mensaje connected pasa a conectado", function() {
    service.conectar("srv-1");
    socketCreado!.readyState = WebSocketStub.OPEN;
    socketCreado!.onopen?.();

    // El onopen envia el connect
    expect(socketCreado!.enviados[0]).toContain("connect");

    socketCreado!.onmessage?.({
      data: JSON.stringify({ tipo: "connected", servidor: "VPS prod" })
    } as MessageEvent);

    expect(service.estadoConexion()).toBe("conectado");
  });

  it("conectar: al recibir mensaje error pasa a error", function() {
    service.conectar("srv-1");
    socketCreado!.onmessage?.({
      data: JSON.stringify({ tipo: "error", mensaje: "kaboom" })
    } as MessageEvent);

    expect(service.estadoConexion()).toBe("error");
  });

  it("conectar: si llega texto plano, lo propaga via datosRecibidos", function(done) {
    service.conectar("srv-1");
    service.datosRecibidos.subscribe((dato: string) => {
      if (dato === "salida-terminal") {
        done();
      }
    });
    socketCreado!.onmessage?.({ data: "salida-terminal" } as MessageEvent);
  });

  it("enviarEntrada: solo envia si el WS esta OPEN", function() {
    service.conectar("srv-1");
    // No envia porque sigue CONNECTING
    service.enviarEntrada("ls");
    expect(socketCreado!.enviados.filter(m => m.includes("input")).length).toBe(0);

    socketCreado!.readyState = WebSocketStub.OPEN;
    service.enviarEntrada("ls");
    expect(socketCreado!.enviados.some(m => m.includes("\"input\""))).toBeTrue();
  });

  it("enviarRedimensionar: envia tipo resize con columnas y filas", function() {
    service.conectar("srv-1");
    socketCreado!.readyState = WebSocketStub.OPEN;
    service.enviarRedimensionar(80, 24);
    expect(socketCreado!.enviados.some(m => m.includes("\"resize\"") && m.includes("80") && m.includes("24"))).toBeTrue();
  });

  it("desconectar: cierra el WS y pone estado a desconectado", function() {
    service.conectar("srv-1");
    socketCreado!.readyState = WebSocketStub.OPEN;
    service.desconectar();
    expect(service.estadoConexion()).toBe("desconectado");
  });

  it("onerror: pone estado a error", function() {
    service.conectar("srv-1");
    socketCreado!.onerror?.();
    expect(service.estadoConexion()).toBe("error");
  });
});
