// Contador de uptime: tiempo transcurrido desde que el navegador cargo la pagina.
// Se actualiza cada segundo y respeta prefers-reduced-motion no haciendo nada
// distinto, porque es solo texto.

const elementoContador = document.getElementById("contador-uptime");
const momentoInicial = Date.now();

function rellenarConCero(numero) {
  return numero.toString().padStart(2, "0");
}

function formatearTiempo(milisegundos) {
  const totalSegundos = Math.floor(milisegundos / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return `${rellenarConCero(horas)}:${rellenarConCero(minutos)}:${rellenarConCero(segundos)}`;
}

function actualizarContador() {
  const transcurrido = Date.now() - momentoInicial;
  elementoContador.textContent = formatearTiempo(transcurrido);
}

actualizarContador();
setInterval(actualizarContador, 1000);
