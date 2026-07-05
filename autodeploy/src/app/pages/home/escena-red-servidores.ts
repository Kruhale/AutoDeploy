import * as THREE from "three";

const NUMERO_DE_NODOS = 170;
const RANGO_DE_DISTRIBUCION = 320;
const UMBRAL_DE_CONEXION = 110;
// Paleta editorial: puntos casi blancos y un puñado ámbar muy contenido.
// En tema claro se invierte: tinta oscura y ámbar profundo sobre papel.
const COLOR_TINTA_NODOS = 0xd8d2c4;
const COLOR_ACENTO_AMBAR = 0xe8b84b;
const COLOR_TINTA_NODOS_CLARO = 0x2c2e38;
const COLOR_ACENTO_AMBAR_CLARO = 0xa3741c;
const COLOR_NIEBLA_OSCURO = 0x08090c;
const COLOR_NIEBLA_CLARO = 0xf2efe6;
const FRACCION_NODOS_ACENTO = 0.14;
const VELOCIDAD_ROTACION_Y = 0.00016;
const VELOCIDAD_ROTACION_X = 0.00007;
const FACTOR_LERP_PARALLAX = 0.03;
const INTENSIDAD_PARALLAX = 40;
// Viaje de camara conducido por el scroll de toda la landing (estilo igloo.inc):
// la camara se acerca y orbita la estructura mientras el usuario baja.
const DISTANCIA_CAMARA_INICIO = 470;
const DISTANCIA_CAMARA_FINAL = 340;
const GIRO_TOTAL_DEL_VIAJE = 2.2;
const FACTOR_LERP_VIAJE = 0.06;

export class EscenaRedServidores {
  private readonly contenedorDeEscena: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private escena: THREE.Scene | null = null;
  private camara: THREE.PerspectiveCamera | null = null;
  private grupoDeRed: THREE.Group | null = null;
  private geometriaDeNodos: THREE.BufferGeometry | null = null;
  private materialDeNodos: THREE.PointsMaterial | null = null;
  private geometriaDeLineas: THREE.BufferGeometry | null = null;
  private materialDeLineas: THREE.LineBasicMaterial | null = null;
  private texturaDeGlow: THREE.CanvasTexture | null = null;
  private idDelFrameAnimacion: number = 0;
  private intensidadDeResaltado = 0;
  private progresoDelViaje = 0;
  private progresoSuavizado = 0;
  private nodosDeAcento: boolean[] = [];
  private esTemaClaro = false;
  private posicionRatonNormalizada = { x: 0, y: 0 };
  private objetivoDeParallaxActual = { x: 0, y: 0 };
  private esModoReducido: boolean = false;
  private readonly manejadorDelBucle: () => void;
  private readonly manejadorDeCambioTamano: () => void;
  private readonly manejadorDeMovimientoRaton: (evento: MouseEvent) => void;

  constructor(contenedor: HTMLElement) {
    this.contenedorDeEscena = contenedor;
    this.manejadorDelBucle = this.bucleDeAnimacion.bind(this);
    this.manejadorDeCambioTamano = this.manejarCambioTamano.bind(this);
    this.manejadorDeMovimientoRaton = this.manejarMovimientoRaton.bind(this);
  }

  iniciar(): void {
    if (typeof window === "undefined") {
      return;
    }

    const consultaDeMovimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.esModoReducido = consultaDeMovimientoReducido.matches;

    this.crearRenderer();
    this.crearEscena();
    this.crearCamara();
    this.crearRedDeNodos();

    window.addEventListener("resize", this.manejadorDeCambioTamano);

    if (!this.esModoReducido) {
      window.addEventListener("mousemove", this.manejadorDeMovimientoRaton);
    }

    if (this.esModoReducido) {
      this.renderizarFrame();
    } else {
      this.bucleDeAnimacion();
    }
  }

  destruir(): void {
    if (typeof window === "undefined") {
      return;
    }

    cancelAnimationFrame(this.idDelFrameAnimacion);
    window.removeEventListener("resize", this.manejadorDeCambioTamano);
    window.removeEventListener("mousemove", this.manejadorDeMovimientoRaton);

    this.geometriaDeNodos?.dispose();
    this.materialDeNodos?.dispose();
    this.geometriaDeLineas?.dispose();
    this.materialDeLineas?.dispose();
    this.texturaDeGlow?.dispose();

    const canvasDelRenderer = this.renderer?.domElement;
    this.renderer?.dispose();

    if (canvasDelRenderer && this.contenedorDeEscena.contains(canvasDelRenderer)) {
      this.contenedorDeEscena.removeChild(canvasDelRenderer);
    }
  }

  private crearRenderer(): void {
    const anchoDelContenedor = this.contenedorDeEscena.clientWidth || window.innerWidth;
    const altoDelContenedor = this.contenedorDeEscena.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(anchoDelContenedor, altoDelContenedor);

    this.contenedorDeEscena.appendChild(this.renderer.domElement);
  }

  private crearEscena(): void {
    this.escena = new THREE.Scene();
    // Negro para que la niebla coincida con el fondo CSS casi negro del contenedor
    this.escena.fog = new THREE.FogExp2(0x08090c, 0.0007);
  }

  private crearCamara(): void {
    const anchoDelContenedor = this.contenedorDeEscena.clientWidth || window.innerWidth;
    const altoDelContenedor = this.contenedorDeEscena.clientHeight || window.innerHeight;
    const relacionDeAspecto = anchoDelContenedor / altoDelContenedor;

    this.camara = new THREE.PerspectiveCamera(60, relacionDeAspecto, 1, 2000);
    this.camara.position.z = DISTANCIA_CAMARA_INICIO;
  }

  private generarTexturaDeGlow(): THREE.CanvasTexture {
    const TAMANO_DE_TEXTURA = 64;
    const canvasParaTextura = document.createElement("canvas");
    canvasParaTextura.width = TAMANO_DE_TEXTURA;
    canvasParaTextura.height = TAMANO_DE_TEXTURA;

    const contextoCanvas = canvasParaTextura.getContext("2d")!;
    const centroDeTextura = TAMANO_DE_TEXTURA / 2;

    const gradienteRadial = contextoCanvas.createRadialGradient(centroDeTextura, centroDeTextura, 0, centroDeTextura, centroDeTextura, centroDeTextura);

    gradienteRadial.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradienteRadial.addColorStop(0.25, "rgba(255, 255, 255, 0.7)");
    gradienteRadial.addColorStop(1, "rgba(255, 255, 255, 0)");

    contextoCanvas.fillStyle = gradienteRadial;
    contextoCanvas.fillRect(0, 0, TAMANO_DE_TEXTURA, TAMANO_DE_TEXTURA);

    const texturaGenerada = new THREE.CanvasTexture(canvasParaTextura);
    return texturaGenerada;
  }

  private generarPosicionesAleatorias(cantidadDeNodos: number, rangoDeEspacio: number): Float32Array {
    const arrayDePosiciones = new Float32Array(cantidadDeNodos * 3);

    for (let indice = 0; indice < cantidadDeNodos; indice++) {
      const coordenadaX = (Math.random() - 0.5) * rangoDeEspacio * 2;
      const coordenadaY = (Math.random() - 0.5) * rangoDeEspacio * 2;
      const coordenadaZ = (Math.random() - 0.5) * rangoDeEspacio * 2;

      arrayDePosiciones[indice * 3] = coordenadaX;
      arrayDePosiciones[indice * 3 + 1] = coordenadaY;
      arrayDePosiciones[indice * 3 + 2] = coordenadaZ;
    }

    return arrayDePosiciones;
  }

  private generarColoresDeNodos(cantidadDeNodos: number): Float32Array {
    const arrayDeColores = new Float32Array(cantidadDeNodos * 3);
    const colorTinta = new THREE.Color(this.esTemaClaro ? COLOR_TINTA_NODOS_CLARO : COLOR_TINTA_NODOS);
    const colorAcento = new THREE.Color(this.esTemaClaro ? COLOR_ACENTO_AMBAR_CLARO : COLOR_ACENTO_AMBAR);

    this.nodosDeAcento = [];

    for (let indice = 0; indice < cantidadDeNodos; indice++) {
      const esNodoDeAcento = Math.random() < FRACCION_NODOS_ACENTO;
      this.nodosDeAcento.push(esNodoDeAcento);
      const colorDelNodo = esNodoDeAcento ? colorAcento : colorTinta;

      arrayDeColores[indice * 3] = colorDelNodo.r;
      arrayDeColores[indice * 3 + 1] = colorDelNodo.g;
      arrayDeColores[indice * 3 + 2] = colorDelNodo.b;
    }

    return arrayDeColores;
  }

  // Cambia la paleta de la escena en caliente cuando el usuario alterna el
  // tema. En claro el blending aditivo no funciona (sumaria hacia blanco
  // sobre papel), asi que se cambia a blending normal.
  establecerTema(esClaro: boolean): void {
    this.esTemaClaro = esClaro;

    if (this.escena?.fog instanceof THREE.FogExp2) {
      this.escena.fog.color.setHex(esClaro ? COLOR_NIEBLA_CLARO : COLOR_NIEBLA_OSCURO);
    }

    const colorTinta = new THREE.Color(esClaro ? COLOR_TINTA_NODOS_CLARO : COLOR_TINTA_NODOS);
    const colorAcento = new THREE.Color(esClaro ? COLOR_ACENTO_AMBAR_CLARO : COLOR_ACENTO_AMBAR);

    const atributoDeColor = this.geometriaDeNodos?.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (atributoDeColor) {
      for (let indice = 0; indice < this.nodosDeAcento.length; indice++) {
        const colorDelNodo = this.nodosDeAcento[indice] ? colorAcento : colorTinta;
        atributoDeColor.setXYZ(indice, colorDelNodo.r, colorDelNodo.g, colorDelNodo.b);
      }
      atributoDeColor.needsUpdate = true;
    }

    if (this.materialDeNodos) {
      this.materialDeNodos.blending = esClaro ? THREE.NormalBlending : THREE.AdditiveBlending;
      this.materialDeNodos.needsUpdate = true;
    }

    if (this.materialDeLineas) {
      this.materialDeLineas.color.setHex(esClaro ? COLOR_TINTA_NODOS_CLARO : COLOR_TINTA_NODOS);
      this.materialDeLineas.opacity = esClaro ? 0.18 : 0.16;
      this.materialDeLineas.blending = esClaro ? THREE.NormalBlending : THREE.AdditiveBlending;
      this.materialDeLineas.needsUpdate = true;
    }

    if (this.esModoReducido) {
      this.renderizarFrame();
    }
  }

  private calcularVerticesDeConexiones(posicionesDeNodos: Float32Array): Float32Array {
    const listaDeVerticesConexion: number[] = [];
    const umbralAlCuadrado = UMBRAL_DE_CONEXION * UMBRAL_DE_CONEXION;

    for (let indiceA = 0; indiceA < NUMERO_DE_NODOS; indiceA++) {
      const baseIndiceA = indiceA * 3;

      for (let indiceB = indiceA + 1; indiceB < NUMERO_DE_NODOS; indiceB++) {
        const baseIndiceB = indiceB * 3;

        const deltaX = posicionesDeNodos[baseIndiceA] - posicionesDeNodos[baseIndiceB];
        const deltaY = posicionesDeNodos[baseIndiceA + 1] - posicionesDeNodos[baseIndiceB + 1];
        const deltaZ = posicionesDeNodos[baseIndiceA + 2] - posicionesDeNodos[baseIndiceB + 2];
        const distanciaAlCuadrado = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;

        if (distanciaAlCuadrado < umbralAlCuadrado) {
          listaDeVerticesConexion.push(
            posicionesDeNodos[baseIndiceA],
            posicionesDeNodos[baseIndiceA + 1],
            posicionesDeNodos[baseIndiceA + 2],
            posicionesDeNodos[baseIndiceB],
            posicionesDeNodos[baseIndiceB + 1],
            posicionesDeNodos[baseIndiceB + 2]
          );
        }
      }
    }

    return new Float32Array(listaDeVerticesConexion);
  }

  private crearRedDeNodos(): void {
    if (!this.escena) {
      return;
    }

    this.grupoDeRed = new THREE.Group();
    this.texturaDeGlow = this.generarTexturaDeGlow();

    const posicionesDeNodos = this.generarPosicionesAleatorias(NUMERO_DE_NODOS, RANGO_DE_DISTRIBUCION);
    const coloresDeNodos = this.generarColoresDeNodos(NUMERO_DE_NODOS);

    this.geometriaDeNodos = new THREE.BufferGeometry();
    this.geometriaDeNodos.setAttribute("position", new THREE.Float32BufferAttribute(posicionesDeNodos, 3));
    this.geometriaDeNodos.setAttribute("color", new THREE.Float32BufferAttribute(coloresDeNodos, 3));

    this.materialDeNodos = new THREE.PointsMaterial({
      size: 9,
      sizeAttenuation: true,
      vertexColors: true,
      map: this.texturaDeGlow,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    const puntosDeNodos = new THREE.Points(this.geometriaDeNodos, this.materialDeNodos);
    this.grupoDeRed.add(puntosDeNodos);

    const verticesDeConexiones = this.calcularVerticesDeConexiones(posicionesDeNodos);

    this.geometriaDeLineas = new THREE.BufferGeometry();
    this.geometriaDeLineas.setAttribute("position", new THREE.Float32BufferAttribute(verticesDeConexiones, 3));

    this.materialDeLineas = new THREE.LineBasicMaterial({
      color: COLOR_TINTA_NODOS,
      opacity: 0.16,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const segmentosDeLineas = new THREE.LineSegments(this.geometriaDeLineas, this.materialDeLineas);
    this.grupoDeRed.add(segmentosDeLineas);

    this.escena.add(this.grupoDeRed);
  }

  private bucleDeAnimacion(): void {
    this.idDelFrameAnimacion = requestAnimationFrame(this.manejadorDelBucle);
    this.actualizarParallax();
    this.rotarGrupoDeRed();
    this.aplicarResaltado();
    this.renderizarFrame();
  }

  private renderizarFrame(): void {
    if (!this.renderer || !this.escena || !this.camara) {
      return;
    }
    this.renderer.render(this.escena, this.camara);
  }

  // El scroll de la landing (0 → 1) fija el destino del viaje; el bucle lo
  // suaviza con lerp para que la camara nunca de tirones aunque el scroll si.
  establecerProgreso(progreso: number): void {
    this.progresoDelViaje = Math.min(Math.max(progreso, 0), 1);
  }

  private actualizarParallax(): void {
    if (!this.camara) {
      return;
    }

    const diferenciaDeViaje = this.progresoDelViaje - this.progresoSuavizado;
    this.progresoSuavizado += diferenciaDeViaje * FACTOR_LERP_VIAJE;

    const distanciaActual = DISTANCIA_CAMARA_INICIO + (DISTANCIA_CAMARA_FINAL - DISTANCIA_CAMARA_INICIO) * this.progresoSuavizado;
    const anguloDeOrbita = this.progresoSuavizado * GIRO_TOTAL_DEL_VIAJE;

    const xObjetivo = this.posicionRatonNormalizada.x * INTENSIDAD_PARALLAX;
    const yObjetivo = this.posicionRatonNormalizada.y * INTENSIDAD_PARALLAX;

    const diferenciaPosicionX = xObjetivo - this.objetivoDeParallaxActual.x;
    const diferenciaPosicionY = yObjetivo - this.objetivoDeParallaxActual.y;

    this.objetivoDeParallaxActual.x += diferenciaPosicionX * FACTOR_LERP_PARALLAX;
    this.objetivoDeParallaxActual.y += diferenciaPosicionY * FACTOR_LERP_PARALLAX;

    this.camara.position.x = Math.sin(anguloDeOrbita) * distanciaActual + this.objetivoDeParallaxActual.x;
    this.camara.position.y = this.objetivoDeParallaxActual.y + this.progresoSuavizado * 60;
    this.camara.position.z = Math.cos(anguloDeOrbita) * distanciaActual;
    this.camara.lookAt(0, 0, 0);
  }

  private rotarGrupoDeRed(): void {
    if (!this.grupoDeRed) {
      return;
    }
    this.grupoDeRed.rotation.y += VELOCIDAD_ROTACION_Y;
    this.grupoDeRed.rotation.x += VELOCIDAD_ROTACION_X;
  }

  // Pulso de brillo cuando el usuario interactua con la terminal del hero: los
  // nodos crecen y las lineas se encienden, y decae solo frame a frame.
  resaltar(): void {
    this.intensidadDeResaltado = 1;
  }

  private aplicarResaltado(): void {
    if (this.intensidadDeResaltado <= 0) {
      return;
    }

    if (this.materialDeNodos) {
      this.materialDeNodos.size = 5 + this.intensidadDeResaltado * 5;
    }
    if (this.materialDeLineas) {
      this.materialDeLineas.opacity = 0.1 + this.intensidadDeResaltado * 0.3;
    }

    this.intensidadDeResaltado *= 0.93;

    if (this.intensidadDeResaltado < 0.01) {
      this.intensidadDeResaltado = 0;
      if (this.materialDeNodos) {
        this.materialDeNodos.size = 5;
      }
      if (this.materialDeLineas) {
        this.materialDeLineas.opacity = 0.1;
      }
    }
  }

  private manejarCambioTamano(): void {
    if (!this.camara || !this.renderer) {
      return;
    }

    const anchoActualDelContenedor = this.contenedorDeEscena.clientWidth;
    const altoActualDelContenedor = this.contenedorDeEscena.clientHeight;
    const nuevaRelacionDeAspecto = anchoActualDelContenedor / altoActualDelContenedor;

    this.camara.aspect = nuevaRelacionDeAspecto;
    this.camara.updateProjectionMatrix();
    this.renderer.setSize(anchoActualDelContenedor, altoActualDelContenedor);
  }

  private manejarMovimientoRaton(evento: MouseEvent): void {
    const anchoDeVentana = window.innerWidth;
    const altoDeVentana = window.innerHeight;

    const racionX = evento.clientX / anchoDeVentana;
    const racionY = evento.clientY / altoDeVentana;

    this.posicionRatonNormalizada.x = racionX * 2 - 1;
    this.posicionRatonNormalizada.y = -(racionY * 2 - 1);
  }
}
