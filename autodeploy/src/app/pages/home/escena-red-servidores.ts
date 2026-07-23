import * as THREE from "three";

// Reticula deliberada de nodos-servidor: una "sala de servidores" por la que la
// camara viaja hacia delante con el scroll, no una nube de particulas aleatoria.
const COLUMNAS_X = 6;
const FILAS_Y = 4;
const CAPAS_Z = 7;
const NUMERO_DE_NODOS = COLUMNAS_X * FILAS_Y * CAPAS_Z;
const SEPARACION_NODOS = 90;
const JITTER_MAXIMO = 7;
// Umbral < diagonal (127) para que solo conecten vecinos ortogonales: filamentos
// rectos que se leen como estructura, no como telarana.
const UMBRAL_DE_CONEXION = 100;

// Paleta editorial: puntos casi blancos y una unica ruta ambar muy contenida.
// En tema claro se invierte: tinta oscura y ambar profundo sobre papel.
const COLOR_TINTA_NODOS = 0xd8d2c4;
const COLOR_ACENTO_AMBAR = 0xe8b84b;
const COLOR_TINTA_NODOS_CLARO = 0x2c2e38;
const COLOR_ACENTO_AMBAR_CLARO = 0xa3741c;
// La niebla debe igualar a --fondo-editorial para desvanecer sin "muro de niebla".
const COLOR_NIEBLA_OSCURO = 0x0a0b0e;
const COLOR_NIEBLA_CLARO = 0xf5f1e9;
const COLOR_TEXTO_ETIQUETA_OSCURO = "rgba(216, 210, 196, 0.62)";
const COLOR_TEXTO_ETIQUETA_CLARO = "rgba(44, 46, 56, 0.6)";

const FACTOR_LERP_PARALLAX = 0.03;
const INTENSIDAD_PARALLAX = 24;
// Viaje de camara conducido por el scroll (estilo igloo.inc): en vez de orbitar,
// la camara avanza recta hacia delante atravesando las capas de la sala.
const Z_CAMARA_INICIO = 360;
const Z_CAMARA_FINAL = -180;
const FACTOR_LERP_VIAJE = 0.06;
// Paginas sin scroll (login/register/confirmar-free): deriva lenta ping-pong.
const VELOCIDAD_DERIVA_AUTONOMA = 0.0009;

const ESCALA_ETIQUETA_ANCHO = 48;
const ESCALA_ETIQUETA_ALTO = 15;

// Anotaciones tecnicas mono, la firma de la escena. Repartidas en profundidad
// para que aparezcan en distintos momentos del viaje; srv-01 va delante para
// que el frame estatico de reduced-motion tenga etiqueta visible.
const ETIQUETAS_MONO = [
  { texto: "SRV-01", columna: 1, fila: 3, capa: 6 },
  { texto: "DOCKER", columna: 4, fila: 1, capa: 5 },
  { texto: "NGINX", columna: 2, fila: 2, capa: 4 },
  { texto: "SSL", columna: 5, fila: 3, capa: 3 },
  { texto: "SSH", columna: 0, fila: 1, capa: 2 },
  { texto: "DEPLOY", columna: 3, fila: 0, capa: 0 }
];

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
  private geometriaRutaAmbar: THREE.BufferGeometry | null = null;
  private materialRutaAmbar: THREE.LineBasicMaterial | null = null;
  private spritesDeEtiqueta: THREE.Sprite[] = [];
  private indicesDeLaRuta: number[] = [];
  private idDelFrameAnimacion: number = 0;
  private progresoDelViaje = 0;
  private progresoSuavizado = 0;
  private direccionDeDeriva = 1;
  private tieneViajeExterno = false;
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

    // Sin WebGL (navegadores capados, tests headless) la pagina sigue sin escena.
    try {
      this.crearRenderer();
    } catch {
      return;
    }
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
    this.geometriaRutaAmbar?.dispose();
    this.materialRutaAmbar?.dispose();

    // Cada etiqueta tiene su canvas-texture: liberarlas evita fuga al navegar
    // entre las 4 rutas que montan y desmontan la escena.
    for (let indice = 0; indice < this.spritesDeEtiqueta.length; indice++) {
      const material = this.spritesDeEtiqueta[indice].material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
    }

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
    this.escena.fog = new THREE.FogExp2(COLOR_NIEBLA_OSCURO, 0.0007);
  }

  private crearCamara(): void {
    const anchoDelContenedor = this.contenedorDeEscena.clientWidth || window.innerWidth;
    const altoDelContenedor = this.contenedorDeEscena.clientHeight || window.innerHeight;
    const relacionDeAspecto = anchoDelContenedor / altoDelContenedor;

    this.camara = new THREE.PerspectiveCamera(60, relacionDeAspecto, 1, 2000);
    this.camara.position.z = Z_CAMARA_INICIO;
  }

  // Indice plano del nodo en la celda (columna, fila, capa) de la reticula.
  private indiceDeCelda(columna: number, fila: number, capa: number): number {
    return capa * (FILAS_Y * COLUMNAS_X) + fila * COLUMNAS_X + columna;
  }

  // Jitter reproducible por nodo (hash tipo fract(sin)): la sala no queda CAD
  // perfecta pero siempre igual, sin depender de Math.random.
  private desplazamientoDeterministaDeNodo(indice: number, semilla: number): number {
    const valorCrudo = Math.sin(indice * 12.9898 + semilla * 78.233) * 43758.5453;
    const fraccion = valorCrudo - Math.floor(valorCrudo);
    const desplazamiento = (fraccion - 0.5) * 2 * JITTER_MAXIMO;
    return desplazamiento;
  }

  private generarPosicionesEnReticula(): Float32Array {
    const arrayDePosiciones = new Float32Array(NUMERO_DE_NODOS * 3);
    const anchoTotal = (COLUMNAS_X - 1) * SEPARACION_NODOS;
    const altoTotal = (FILAS_Y - 1) * SEPARACION_NODOS;
    const profundidadTotal = (CAPAS_Z - 1) * SEPARACION_NODOS;
    const origenX = -anchoTotal / 2;
    const origenY = -altoTotal / 2;
    const origenZ = -profundidadTotal / 2;

    for (let capa = 0; capa < CAPAS_Z; capa++) {
      for (let fila = 0; fila < FILAS_Y; fila++) {
        for (let columna = 0; columna < COLUMNAS_X; columna++) {
          const indiceDeNodo = this.indiceDeCelda(columna, fila, capa);
          const jitterX = this.desplazamientoDeterministaDeNodo(indiceDeNodo, 1);
          const jitterY = this.desplazamientoDeterministaDeNodo(indiceDeNodo, 2);
          const jitterZ = this.desplazamientoDeterministaDeNodo(indiceDeNodo, 3);

          const coordenadaX = origenX + columna * SEPARACION_NODOS + jitterX;
          const coordenadaY = origenY + fila * SEPARACION_NODOS + jitterY;
          const coordenadaZ = origenZ + capa * SEPARACION_NODOS + jitterZ;

          const baseDelNodo = indiceDeNodo * 3;
          arrayDePosiciones[baseDelNodo] = coordenadaX;
          arrayDePosiciones[baseDelNodo + 1] = coordenadaY;
          arrayDePosiciones[baseDelNodo + 2] = coordenadaZ;
        }
      }
    }

    return arrayDePosiciones;
  }

  // La ruta de despliegue: una escalera de nodos vecinos que cruza la sala de
  // delante a atras. Es el unico acento ambar de la escena.
  private construirRutaDeDespliegue(): number[] {
    const indicesDeLaRuta: number[] = [];
    let columnaActual = 0;
    let filaActual = 0;

    for (let capa = 0; capa < CAPAS_Z; capa++) {
      const indiceDelPeldano = this.indiceDeCelda(columnaActual, filaActual, capa);
      indicesDeLaRuta.push(indiceDelPeldano);

      if (capa % 2 === 0 && columnaActual < COLUMNAS_X - 1) {
        columnaActual++;
      }
      if (capa % 3 === 0 && filaActual < FILAS_Y - 1) {
        filaActual++;
      }
    }

    return indicesDeLaRuta;
  }

  private marcarNodosDeAcento(): void {
    this.nodosDeAcento = new Array(NUMERO_DE_NODOS).fill(false);
    for (let indice = 0; indice < this.indicesDeLaRuta.length; indice++) {
      const indiceDelNodo = this.indicesDeLaRuta[indice];
      this.nodosDeAcento[indiceDelNodo] = true;
    }
  }

  private generarColoresDeNodos(): Float32Array {
    const arrayDeColores = new Float32Array(NUMERO_DE_NODOS * 3);
    const colorTinta = new THREE.Color(this.esTemaClaro ? COLOR_TINTA_NODOS_CLARO : COLOR_TINTA_NODOS);
    const colorAcento = new THREE.Color(this.esTemaClaro ? COLOR_ACENTO_AMBAR_CLARO : COLOR_ACENTO_AMBAR);

    for (let indice = 0; indice < NUMERO_DE_NODOS; indice++) {
      const colorDelNodo = this.nodosDeAcento[indice] ? colorAcento : colorTinta;

      arrayDeColores[indice * 3] = colorDelNodo.r;
      arrayDeColores[indice * 3 + 1] = colorDelNodo.g;
      arrayDeColores[indice * 3 + 2] = colorDelNodo.b;
    }

    return arrayDeColores;
  }

  private generarTexturaDeEtiqueta(texto: string, colorDeTexto: string): THREE.CanvasTexture {
    const escalaDePixeles = Math.min(window.devicePixelRatio, 2);
    const anchoBase = 128;
    const altoBase = 40;

    const canvasParaTextura = document.createElement("canvas");
    canvasParaTextura.width = anchoBase * escalaDePixeles;
    canvasParaTextura.height = altoBase * escalaDePixeles;

    const contextoCanvas = canvasParaTextura.getContext("2d")!;
    contextoCanvas.scale(escalaDePixeles, escalaDePixeles);
    contextoCanvas.font = "600 20px 'JetBrains Mono', 'Fira Code', monospace";
    contextoCanvas.textBaseline = "middle";
    contextoCanvas.fillStyle = colorDeTexto;
    contextoCanvas.fillText(texto, 4, altoBase / 2);

    const texturaGenerada = new THREE.CanvasTexture(canvasParaTextura);
    return texturaGenerada;
  }

  private crearEtiquetasMono(posicionesDeNodos: Float32Array): void {
    if (!this.grupoDeRed) {
      return;
    }

    this.spritesDeEtiqueta = [];
    const colorDeTexto = this.esTemaClaro ? COLOR_TEXTO_ETIQUETA_CLARO : COLOR_TEXTO_ETIQUETA_OSCURO;

    for (let indice = 0; indice < ETIQUETAS_MONO.length; indice++) {
      const definicion = ETIQUETAS_MONO[indice];
      const indiceDelNodo = this.indiceDeCelda(definicion.columna, definicion.fila, definicion.capa);
      const baseDelNodo = indiceDelNodo * 3;

      const texturaDeEtiqueta = this.generarTexturaDeEtiqueta(definicion.texto, colorDeTexto);
      const materialDeEtiqueta = new THREE.SpriteMaterial({ map: texturaDeEtiqueta, transparent: true, depthWrite: false });
      const spriteDeEtiqueta = new THREE.Sprite(materialDeEtiqueta);

      spriteDeEtiqueta.position.set(posicionesDeNodos[baseDelNodo] + 16, posicionesDeNodos[baseDelNodo + 1] + 11, posicionesDeNodos[baseDelNodo + 2]);
      spriteDeEtiqueta.scale.set(ESCALA_ETIQUETA_ANCHO, ESCALA_ETIQUETA_ALTO, 1);

      this.grupoDeRed.add(spriteDeEtiqueta);
      this.spritesDeEtiqueta.push(spriteDeEtiqueta);
    }
  }

  private crearRutaAmbar(posicionesDeNodos: Float32Array): void {
    if (!this.grupoDeRed) {
      return;
    }

    const verticesDeLaRuta: number[] = [];
    for (let indice = 0; indice < this.indicesDeLaRuta.length - 1; indice++) {
      const baseInicio = this.indicesDeLaRuta[indice] * 3;
      const baseFin = this.indicesDeLaRuta[indice + 1] * 3;
      verticesDeLaRuta.push(
        posicionesDeNodos[baseInicio],
        posicionesDeNodos[baseInicio + 1],
        posicionesDeNodos[baseInicio + 2],
        posicionesDeNodos[baseFin],
        posicionesDeNodos[baseFin + 1],
        posicionesDeNodos[baseFin + 2]
      );
    }

    this.geometriaRutaAmbar = new THREE.BufferGeometry();
    this.geometriaRutaAmbar.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(verticesDeLaRuta), 3));

    this.materialRutaAmbar = new THREE.LineBasicMaterial({
      color: this.esTemaClaro ? COLOR_ACENTO_AMBAR_CLARO : COLOR_ACENTO_AMBAR,
      opacity: 0.55,
      transparent: true,
      depthWrite: false
    });

    const lineaDeLaRuta = new THREE.LineSegments(this.geometriaRutaAmbar, this.materialRutaAmbar);
    this.grupoDeRed.add(lineaDeLaRuta);
  }

  // Cambia la paleta de la escena en caliente al alternar el tema.
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

    if (this.materialDeLineas) {
      this.materialDeLineas.color.setHex(esClaro ? COLOR_TINTA_NODOS_CLARO : COLOR_TINTA_NODOS);
      this.materialDeLineas.opacity = esClaro ? 0.16 : 0.14;
      this.materialDeLineas.needsUpdate = true;
    }

    if (this.materialRutaAmbar) {
      this.materialRutaAmbar.color.setHex(esClaro ? COLOR_ACENTO_AMBAR_CLARO : COLOR_ACENTO_AMBAR);
      this.materialRutaAmbar.needsUpdate = true;
    }

    const colorDeTextoEtiqueta = esClaro ? COLOR_TEXTO_ETIQUETA_CLARO : COLOR_TEXTO_ETIQUETA_OSCURO;
    for (let indice = 0; indice < this.spritesDeEtiqueta.length; indice++) {
      const definicion = ETIQUETAS_MONO[indice];
      const materialDeEtiqueta = this.spritesDeEtiqueta[indice].material as THREE.SpriteMaterial;
      materialDeEtiqueta.map?.dispose();
      materialDeEtiqueta.map = this.generarTexturaDeEtiqueta(definicion.texto, colorDeTextoEtiqueta);
      materialDeEtiqueta.needsUpdate = true;
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

    this.indicesDeLaRuta = this.construirRutaDeDespliegue();
    this.marcarNodosDeAcento();

    const posicionesDeNodos = this.generarPosicionesEnReticula();
    const coloresDeNodos = this.generarColoresDeNodos();

    this.geometriaDeNodos = new THREE.BufferGeometry();
    this.geometriaDeNodos.setAttribute("position", new THREE.Float32BufferAttribute(posicionesDeNodos, 3));
    this.geometriaDeNodos.setAttribute("color", new THREE.Float32BufferAttribute(coloresDeNodos, 3));

    // Sin map ni AdditiveBlending: el punto GL por defecto es un cuadradito
    // nitido, coherente con el lenguaje editorial (filetes, sin glow).
    this.materialDeNodos = new THREE.PointsMaterial({
      size: 3.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: false,
      depthWrite: true
    });

    const puntosDeNodos = new THREE.Points(this.geometriaDeNodos, this.materialDeNodos);
    this.grupoDeRed.add(puntosDeNodos);

    const verticesDeConexiones = this.calcularVerticesDeConexiones(posicionesDeNodos);

    this.geometriaDeLineas = new THREE.BufferGeometry();
    this.geometriaDeLineas.setAttribute("position", new THREE.Float32BufferAttribute(verticesDeConexiones, 3));

    this.materialDeLineas = new THREE.LineBasicMaterial({
      color: COLOR_TINTA_NODOS,
      opacity: 0.14,
      transparent: true,
      depthWrite: false
    });

    const segmentosDeLineas = new THREE.LineSegments(this.geometriaDeLineas, this.materialDeLineas);
    this.grupoDeRed.add(segmentosDeLineas);

    this.crearRutaAmbar(posicionesDeNodos);
    this.crearEtiquetasMono(posicionesDeNodos);

    this.escena.add(this.grupoDeRed);
  }

  private bucleDeAnimacion(): void {
    this.idDelFrameAnimacion = requestAnimationFrame(this.manejadorDelBucle);
    this.actualizarCamara();
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
    this.tieneViajeExterno = true;
    this.progresoDelViaje = Math.min(Math.max(progreso, 0), 1);
  }

  // Paginas sin scroll: la camara deriva sola adelante y atras muy despacio.
  private avanzarDerivaAutonoma(): void {
    this.progresoDelViaje += VELOCIDAD_DERIVA_AUTONOMA * this.direccionDeDeriva;

    if (this.progresoDelViaje >= 1) {
      this.progresoDelViaje = 1;
      this.direccionDeDeriva = -1;
    }
    if (this.progresoDelViaje <= 0) {
      this.progresoDelViaje = 0;
      this.direccionDeDeriva = 1;
    }
  }

  private actualizarCamara(): void {
    if (!this.camara) {
      return;
    }

    if (!this.tieneViajeExterno) {
      this.avanzarDerivaAutonoma();
    }

    const diferenciaDeViaje = this.progresoDelViaje - this.progresoSuavizado;
    this.progresoSuavizado += diferenciaDeViaje * FACTOR_LERP_VIAJE;

    const distanciaZ = Z_CAMARA_INICIO + (Z_CAMARA_FINAL - Z_CAMARA_INICIO) * this.progresoSuavizado;

    const xObjetivo = this.posicionRatonNormalizada.x * INTENSIDAD_PARALLAX;
    const yObjetivo = this.posicionRatonNormalizada.y * INTENSIDAD_PARALLAX;
    const diferenciaPosicionX = xObjetivo - this.objetivoDeParallaxActual.x;
    const diferenciaPosicionY = yObjetivo - this.objetivoDeParallaxActual.y;

    this.objetivoDeParallaxActual.x += diferenciaPosicionX * FACTOR_LERP_PARALLAX;
    this.objetivoDeParallaxActual.y += diferenciaPosicionY * FACTOR_LERP_PARALLAX;

    this.camara.position.x = this.objetivoDeParallaxActual.x;
    this.camara.position.y = this.objetivoDeParallaxActual.y;
    this.camara.position.z = distanciaZ;
    // Mirar recto hacia delante = sensacion de atravesar la sala, sin orbitar.
    this.camara.lookAt(this.objetivoDeParallaxActual.x, this.objetivoDeParallaxActual.y, distanciaZ - 200);
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
