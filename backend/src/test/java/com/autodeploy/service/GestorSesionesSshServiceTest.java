package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Servidor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GestorSesionesSshServiceTest {

    @Mock
    private ServidorService servidorService;

    @InjectMocks
    private GestorSesionesSshService gestor;

    @BeforeEach
    void setUp() {
        gestor.inicializar();
    }

    @Test
    @DisplayName("tieneSesionViva: false cuando no hay sesion en cache para ese servidor")
    void tieneSesionViva_falseSiNoExiste() {
        assertThat(gestor.tieneSesionViva("srv-1")).isFalse();
    }

    @Test
    @DisplayName("cerrarSesion: no falla cuando no hay sesion en cache")
    void cerrarSesion_noFallaSiNoHay() {
        gestor.cerrarSesion("srv-1");
        // Si no lanza, ok
        assertThat(gestor.tieneSesionViva("srv-1")).isFalse();
    }

    @Test
    @DisplayName("ejecutar: lanza RuntimeException si no se puede abrir sesion porque el servidor no existe")
    void ejecutar_lanzaSiServidorNoExiste() {
        when(servidorService.obtenerPorId("srv-x")).thenThrow(new ResourceNotFoundException("Servidor no encontrado"));

        assertThatThrownBy(() -> gestor.ejecutar("srv-x", "uptime"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("No hay sesion SSH");
    }

    @Test
    @DisplayName("ejecutar: lanza RuntimeException si la conexion SSH falla (servidor de prueba inalcanzable)")
    void ejecutar_lanzaSiConexionFalla() {
        Servidor s = new Servidor();
        s.setId("srv-1");
        s.setDireccionIp("127.0.0.1");
        // Puerto SSH cerrado intencionadamente para forzar fallo de conexion
        s.setPuertoSsh(1);
        s.setUsuarioSsh("root");
        s.setMetodoAutenticacion("password");
        when(servidorService.obtenerPorId("srv-1")).thenReturn(s);

        assertThatThrownBy(() -> gestor.ejecutar("srv-1", "uptime"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("apagar: limpia el mapa de sesiones sin lanzar aunque este vacio")
    void apagar_noFalla() {
        gestor.apagar();
        // Tras apagar, una nueva sesion no esta cacheada
        assertThat(gestor.tieneSesionViva("srv-1")).isFalse();
    }
}
