import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario.service';
import { PlanService, PlanId } from '../../services/plan.service';

type EstadoPago = 'formulario' | 'procesando' | 'exito' | 'error';
type TipoTarjeta = 'visa' | 'mastercard' | 'amex' | 'desconocida';

interface DatosPlanInfo {
  nombre: string;
  precio: string;
  descripcion: string;
}

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './pago.html',
  styleUrl: './pago.scss',
})
export class Pago implements OnInit {
  planSeleccionado = signal('pro');
  estadoPago = signal<EstadoPago>('formulario');

  numeroTarjeta = signal('');
  nombreTitular = signal('');
  fechaExpiracion = signal('');
  cvv = signal('');
  cvvVisible = signal(false);

  errorNumero = signal('');
  errorNombre = signal('');
  errorFecha = signal('');
  errorCvv = signal('');

  comprobacionNumero = false;
  comprobacionNombre = false;
  comprobacionFecha = false;
  comprobacionCvv = false;

  tipoTarjeta = computed<TipoTarjeta>(
    function (this: Pago) {
      const numero = this.numeroTarjeta().replace(/\s/g, '');
      if (numero.startsWith('4')) return 'visa';
      if (numero.startsWith('5')) return 'mastercard';
      if (numero.startsWith('34') || numero.startsWith('37')) return 'amex';
      return 'desconocida';
    }.bind(this),
  );

  numeroFormateado = computed(
    function (this: Pago) {
      const numero = this.numeroTarjeta();
      if (!numero) return '•••• •••• •••• ••••';
      const soloNumeros = numero.replace(/\s/g, '');
      const partes: string[] = [];
      for (let posicion = 0; posicion < soloNumeros.length; posicion += 4) {
        partes.push(soloNumeros.slice(posicion, posicion + 4));
      }
      return partes.join(' ') || '•••• •••• •••• ••••';
    }.bind(this),
  );

  infoDelPlan = computed<DatosPlanInfo>(
    function (this: Pago) {
      const plan = this.planSeleccionado();
      const planesDisponibles: Record<string, DatosPlanInfo> = {
        pro: {
          nombre: 'Pro',
          precio: '€9/mes',
          descripcion: 'Para equipos con apps en producción',
        },
        business: {
          nombre: 'Business',
          precio: '€29/mes',
          descripcion: 'Para infraestructura sin límites',
        },
      };
      return planesDisponibles[plan] || planesDisponibles['pro'];
    }.bind(this),
  );

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private usuarioService: UsuarioService,
    private planService: PlanService,
  ) {}

  ngOnInit(): void {
    const planDelQuery = this.activatedRoute.snapshot.queryParamMap.get('plan');
    if (planDelQuery === 'pro' || planDelQuery === 'business') {
      this.planSeleccionado.set(planDelQuery);
    }
  }

  formatearNumeroTarjeta(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const soloNumeros = input.value.replace(/\D/g, '');
    const longitudMaxima = this.tipoTarjeta() === 'amex' ? 15 : 16;
    const numerosRecortados = soloNumeros.slice(0, longitudMaxima);

    const partes: string[] = [];
    for (let posicion = 0; posicion < numerosRecortados.length; posicion += 4) {
      partes.push(numerosRecortados.slice(posicion, posicion + 4));
    }

    const numeroConEspacios = partes.join(' ');
    this.numeroTarjeta.set(numeroConEspacios);
    input.value = numeroConEspacios;
    this.validarNumero();
  }

  formatearFecha(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const soloNumeros = input.value.replace(/\D/g, '').slice(0, 4);
    let fechaFormateada = soloNumeros;
    if (soloNumeros.length >= 2) {
      fechaFormateada = soloNumeros.slice(0, 2) + '/' + soloNumeros.slice(2);
    }
    this.fechaExpiracion.set(fechaFormateada);
    input.value = fechaFormateada;
    this.validarFecha();
  }

  formatearCvv(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const longitudMaxima = this.tipoTarjeta() === 'amex' ? 4 : 3;
    const soloNumeros = input.value.replace(/\D/g, '').slice(0, longitudMaxima);
    this.cvv.set(soloNumeros);
    input.value = soloNumeros;
    this.validarCvv();
  }

  validarNumero(): void {
    const numero = this.numeroTarjeta().replace(/\s/g, '');
    const longitudEsperada = this.tipoTarjeta() === 'amex' ? 15 : 16;

    if (numero.length === 0) {
      this.errorNumero.set('El número de tarjeta es obligatorio');
      this.comprobacionNumero = false;
      return;
    }
    if (numero.length < longitudEsperada) {
      this.errorNumero.set('Número de tarjeta incompleto');
      this.comprobacionNumero = false;
      return;
    }
    if (!this.pasaAlgoritmoLuhn(numero)) {
      this.errorNumero.set('Número de tarjeta no válido');
      this.comprobacionNumero = false;
      return;
    }
    this.errorNumero.set('');
    this.comprobacionNumero = true;
    this.comprobarFormularioCompleto();
  }

  validarNombre(): void {
    const nombre = this.nombreTitular().trim();
    const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

    if (nombre.length === 0) {
      this.errorNombre.set('El nombre del titular es obligatorio');
      this.comprobacionNombre = false;
      return;
    }
    if (nombre.length < 3) {
      this.errorNombre.set('El nombre debe tener al menos 3 caracteres');
      this.comprobacionNombre = false;
      return;
    }
    if (!soloLetras.test(nombre)) {
      this.errorNombre.set('El nombre solo puede contener letras');
      this.comprobacionNombre = false;
      return;
    }
    this.errorNombre.set('');
    this.comprobacionNombre = true;
    this.comprobarFormularioCompleto();
  }

  validarFecha(): void {
    const fecha = this.fechaExpiracion();
    const formatoCorrecto = /^\d{2}\/\d{2}$/;

    if (!formatoCorrecto.test(fecha)) {
      this.errorFecha.set('Formato MM/AA incorrecto');
      this.comprobacionFecha = false;
      return;
    }

    const partesMes = fecha.split('/');
    const mes = parseInt(partesMes[0], 10);
    const anio = parseInt('20' + partesMes[1], 10);

    if (mes < 1 || mes > 12) {
      this.errorFecha.set('El mes no es válido');
      this.comprobacionFecha = false;
      return;
    }

    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1;

    const tarjetaEstaVencida = anio < anioActual || (anio === anioActual && mes < mesActual);
    if (tarjetaEstaVencida) {
      this.errorFecha.set('La tarjeta ha expirado');
      this.comprobacionFecha = false;
      return;
    }

    this.errorFecha.set('');
    this.comprobacionFecha = true;
    this.comprobarFormularioCompleto();
  }

  validarCvv(): void {
    const longitudEsperada = this.tipoTarjeta() === 'amex' ? 4 : 3;
    const cvvActual = this.cvv();

    if (cvvActual.length === 0) {
      this.errorCvv.set('El CVV es obligatorio');
      this.comprobacionCvv = false;
      return;
    }
    if (cvvActual.length < longitudEsperada) {
      this.errorCvv.set(`El CVV debe tener ${longitudEsperada} dígitos`);
      this.comprobacionCvv = false;
      return;
    }
    this.errorCvv.set('');
    this.comprobacionCvv = true;
    this.comprobarFormularioCompleto();
  }

  private comprobarFormularioCompleto(): void {
    const botonPagar = document.querySelector<HTMLButtonElement>('.pago__boton-pagar');
    if (!botonPagar) return;
    const formularioValido =
      this.comprobacionNumero &&
      this.comprobacionNombre &&
      this.comprobacionFecha &&
      this.comprobacionCvv;
    botonPagar.disabled = !formularioValido;
  }

  private pasaAlgoritmoLuhn(numero: string): boolean {
    let suma = 0;
    let esSegundo = false;

    for (let posicion = numero.length - 1; posicion >= 0; posicion--) {
      let digito = parseInt(numero[posicion], 10);
      if (esSegundo) {
        digito = digito * 2;
        if (digito > 9) {
          digito = digito - 9;
        }
      }
      suma = suma + digito;
      esSegundo = !esSegundo;
    }
    return suma % 10 === 0;
  }

  async procesarPago(): Promise<void> {
    const formularioEsValido =
      this.comprobacionNumero &&
      this.comprobacionNombre &&
      this.comprobacionFecha &&
      this.comprobacionCvv;
    if (!formularioEsValido) return;

    const usuarioId = this.usuarioService.usuarioId();
    if (!usuarioId) {
      console.warn('Sesión inválida: usuarioId vacío. Redirigiendo a login.');
      this.router.navigate(['/login']);
      return;
    }

    this.estadoPago.set('procesando');

    const componenteActual = this;
    await new Promise(function (resolver) {
      setTimeout(resolver, 2500);
    });

    try {
      const planElegido = this.planSeleccionado() as PlanId;
      await this.usuarioService.actualizarPlan(usuarioId, planElegido);
      this.planService.activarPlan(planElegido);
      componenteActual.estadoPago.set('exito');
    } catch (error) {
      console.error('Error al actualizar plan:', error);
      componenteActual.estadoPago.set('error');
    }
  }

  irAlDashboard(): void {
    this.router.navigate(['/app/dashboard']);
  }

  reintentar(): void {
    this.estadoPago.set('formulario');
  }
}
