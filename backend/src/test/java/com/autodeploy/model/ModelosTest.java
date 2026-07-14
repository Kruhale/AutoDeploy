package com.autodeploy.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests "smoke" para los modelos (POJOs con getters/setters).
 * Verifican el round-trip set→get de cada campo. Cubren los modelos
 * que de otra manera quedarian con 0% cobertura.
 */
class ModelosTest {

    @Test
    @DisplayName("MetricaServidor: round-trip getters/setters de todos los campos")
    void metricaServidor_roundTrip() {
        MetricaServidor m = new MetricaServidor();
        m.setId("met-1");
        m.setServidorId("srv-1");
        m.setCpuPorcentaje(35.5);
        m.setRamUsadaMb(1024);
        m.setRamTotalMb(4096);
        m.setDiscoUsadoPorcentaje(60);
        m.setDiscoUsadoGb(30);
        m.setDiscoTotalGb(50);
        m.setCargaPromedio(0.75);
        m.setTiempoEncendidoSegundos(86400);
        m.setWebDesplegadas(List.of("app1", "app2"));
        m.setContainersDocker(List.of("nginx", "mongo"));
        m.setSesionActiva(true);
        LocalDateTime ahora = LocalDateTime.now();
        m.setFechaMedicion(ahora);

        assertThat(m.getId()).isEqualTo("met-1");
        assertThat(m.getServidorId()).isEqualTo("srv-1");
        assertThat(m.getCpuPorcentaje()).isEqualTo(35.5);
        assertThat(m.getRamUsadaMb()).isEqualTo(1024);
        assertThat(m.getRamTotalMb()).isEqualTo(4096);
        assertThat(m.getDiscoUsadoPorcentaje()).isEqualTo(60);
        assertThat(m.getDiscoUsadoGb()).isEqualTo(30);
        assertThat(m.getDiscoTotalGb()).isEqualTo(50);
        assertThat(m.getCargaPromedio()).isEqualTo(0.75);
        assertThat(m.getTiempoEncendidoSegundos()).isEqualTo(86400);
        assertThat(m.getWebDesplegadas()).containsExactly("app1", "app2");
        assertThat(m.getContainersDocker()).containsExactly("nginx", "mongo");
        assertThat(m.isSesionActiva()).isTrue();
        assertThat(m.getFechaMedicion()).isEqualTo(ahora);
    }

    @Test
    @DisplayName("ClaveSshUsuario: constructor con params y getters/setters")
    void claveSshUsuario_constructorYAccessors() {
        ClaveSshUsuario c = new ClaveSshUsuario("c-1", "key-prod", "SHA256:abc", "ssh-rsa AAAA...");
        assertThat(c.getId()).isEqualTo("c-1");
        assertThat(c.getNombre()).isEqualTo("key-prod");
        assertThat(c.getHuella()).isEqualTo("SHA256:abc");
        assertThat(c.getClaveCompleta()).isEqualTo("ssh-rsa AAAA...");

        // Setters
        c.setId("c-2");
        c.setNombre("key-staging");
        c.setHuella("SHA256:xyz");
        c.setClaveCompleta("ssh-ed25519 BBBB...");
        LocalDateTime fecha = LocalDateTime.now();
        c.setFechaCreacion(fecha);
        assertThat(c.getId()).isEqualTo("c-2");
        assertThat(c.getNombre()).isEqualTo("key-staging");
        assertThat(c.getHuella()).isEqualTo("SHA256:xyz");
        assertThat(c.getClaveCompleta()).isEqualTo("ssh-ed25519 BBBB...");
        assertThat(c.getFechaCreacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("PreferenciasNotificacion: defaults true y round-trip")
    void preferenciasNotificacion_roundTrip() {
        PreferenciasNotificacion p = new PreferenciasNotificacion();
        assertThat(p.isEmail()).isTrue();
        assertThat(p.isAlertasCriticas()).isTrue();
        assertThat(p.isEventosDespliegue()).isTrue();

        p.setEmail(false);
        p.setAlertasCriticas(false);
        p.setEventosDespliegue(false);
        assertThat(p.isEmail()).isFalse();
        assertThat(p.isAlertasCriticas()).isFalse();
        assertThat(p.isEventosDespliegue()).isFalse();
    }

    @Test
    @DisplayName("Usuario: constructor con params y todos los accessors")
    void usuario_constructorYAccessors() {
        Usuario u = new Usuario("Pepe", "p@x.com", "hashPwd");
        assertThat(u.getNombre()).isEqualTo("Pepe");
        assertThat(u.getEmail()).isEqualTo("p@x.com");
        assertThat(u.getPasswordHash()).isEqualTo("hashPwd");
        // Default
        assertThat(u.getClavesSsh()).isNotNull();
        assertThat(u.getPreferenciasNotificacion()).isNotNull();

        // Setters
        u.setId("u-1");
        u.setPlan("pro");
        u.setRol("ADMIN");
        u.setIdioma("en");
        LocalDateTime fechaInicio = LocalDateTime.of(2026, 1, 1, 0, 0);
        LocalDateTime fechaFin = LocalDateTime.of(2027, 1, 1, 0, 0);
        u.setFechaInicioSuscripcion(fechaInicio);
        u.setFechaFinSuscripcion(fechaFin);
        u.setClavesSsh(new ArrayList<>(List.of(new ClaveSshUsuario("c-1", "n", "h", "k"))));
        u.setPreferenciasNotificacion(new PreferenciasNotificacion());
        u.setPasswordHash("nuevo-hash");

        assertThat(u.getId()).isEqualTo("u-1");
        assertThat(u.getPlan()).isEqualTo("pro");
        assertThat(u.getRol()).isEqualTo("ADMIN");
        assertThat(u.getIdioma()).isEqualTo("en");
        assertThat(u.getFechaInicioSuscripcion()).isEqualTo(fechaInicio);
        assertThat(u.getFechaFinSuscripcion()).isEqualTo(fechaFin);
        assertThat(u.getClavesSsh()).hasSize(1);
        assertThat(u.getPreferenciasNotificacion()).isNotNull();
        assertThat(u.getPasswordHash()).isEqualTo("nuevo-hash");
        assertThat(u.getFechaCreacion()).isNotNull();
    }

    @Test
    @DisplayName("HealthCheck: constructor con params y todos los accessors")
    void healthCheck_constructorYAccessors() {
        HealthCheck h = new HealthCheck("srv-1", "Mi VPS", "online", 25L, "OK");
        assertThat(h.getServidorId()).isEqualTo("srv-1");
        assertThat(h.getNombreServidor()).isEqualTo("Mi VPS");
        assertThat(h.getEstado()).isEqualTo("online");
        assertThat(h.getTiempoRespuestaMs()).isEqualTo(25L);
        assertThat(h.getMensaje()).isEqualTo("OK");
        assertThat(h.getFechaComprobacion()).isNotNull();  // se inicializa en constructor

        h.setId("h-1");
        h.setEstado("offline");
        h.setMensaje("timeout");
        h.setTiempoRespuestaMs(5000L);
        h.setNombreServidor("Otro");
        h.setServidorId("srv-2");
        LocalDateTime fecha = LocalDateTime.now();
        h.setFechaComprobacion(fecha);

        assertThat(h.getId()).isEqualTo("h-1");
        assertThat(h.getEstado()).isEqualTo("offline");
        assertThat(h.getMensaje()).isEqualTo("timeout");
        assertThat(h.getTiempoRespuestaMs()).isEqualTo(5000L);
        assertThat(h.getNombreServidor()).isEqualTo("Otro");
        assertThat(h.getServidorId()).isEqualTo("srv-2");
        assertThat(h.getFechaComprobacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("ActividadLog: constructor con params y todos los accessors")
    void actividadLog_constructorYAccessors() {
        ActividadLog a = new ActividadLog("info", "Algo paso", "fa-info");
        assertThat(a.getTipo()).isEqualTo("info");
        assertThat(a.getMensaje()).isEqualTo("Algo paso");
        assertThat(a.getIcono()).isEqualTo("fa-info");

        a.setId("a-1");
        a.setTipo("warning");
        a.setMensaje("nuevo");
        a.setIcono("fa-warning");
        LocalDateTime fecha = LocalDateTime.now();
        a.setFechaCreacion(fecha);
        assertThat(a.getId()).isEqualTo("a-1");
        assertThat(a.getTipo()).isEqualTo("warning");
        assertThat(a.getMensaje()).isEqualTo("nuevo");
        assertThat(a.getIcono()).isEqualTo("fa-warning");
        assertThat(a.getFechaCreacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("Notificacion: constructor con params y todos los accessors")
    void notificacion_constructorYAccessors() {
        Notificacion n = new Notificacion("info", "Titulo", "Desc", "u-1");
        assertThat(n.getTipo()).isEqualTo("info");
        assertThat(n.getTitulo()).isEqualTo("Titulo");
        assertThat(n.getDescripcion()).isEqualTo("Desc");
        assertThat(n.getUsuarioId()).isEqualTo("u-1");
        assertThat(n.isLeida()).isFalse();
        assertThat(n.getFechaCreacion()).isNotNull();

        n.setId("n-1");
        n.setLeida(true);
        n.setUsuarioId("u-2");
        n.setTipo("warning");
        n.setTitulo("T2");
        n.setDescripcion("D2");
        LocalDateTime fecha = LocalDateTime.now();
        n.setFechaCreacion(fecha);
        assertThat(n.getId()).isEqualTo("n-1");
        assertThat(n.isLeida()).isTrue();
        assertThat(n.getUsuarioId()).isEqualTo("u-2");
        assertThat(n.getTipo()).isEqualTo("warning");
        assertThat(n.getTitulo()).isEqualTo("T2");
        assertThat(n.getDescripcion()).isEqualTo("D2");
        assertThat(n.getFechaCreacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("ReglaFirewall: constructor y todos los accessors")
    void reglaFirewall_constructorYAccessors() {
        ReglaFirewall r = new ReglaFirewall("srv-1", "22", "TCP", "allow", "0.0.0.0/0", "SSH");
        assertThat(r.getServidorId()).isEqualTo("srv-1");
        assertThat(r.getPuerto()).isEqualTo("22");
        assertThat(r.getProtocolo()).isEqualTo("TCP");
        assertThat(r.getAccion()).isEqualTo("allow");
        assertThat(r.getOrigen()).isEqualTo("0.0.0.0/0");
        assertThat(r.getDescripcion()).isEqualTo("SSH");
        assertThat(r.getFechaCreacion()).isNotNull();

        r.setId("r-1");
        r.setPuerto("443");
        r.setProtocolo("UDP");
        r.setAccion("deny");
        r.setOrigen("10.0.0.0/8");
        r.setDescripcion("d");
        r.setServidorId("srv-x");
        assertThat(r.getId()).isEqualTo("r-1");
        assertThat(r.getPuerto()).isEqualTo("443");
        assertThat(r.getProtocolo()).isEqualTo("UDP");
        assertThat(r.getAccion()).isEqualTo("deny");
        assertThat(r.getOrigen()).isEqualTo("10.0.0.0/8");
        assertThat(r.getDescripcion()).isEqualTo("d");
        assertThat(r.getServidorId()).isEqualTo("srv-x");
    }

    @Test
    @DisplayName("Redireccion: constructor y todos los accessors")
    void redireccion_constructorYAccessors() {
        Redireccion r = new Redireccion("srv-1", "old.com", "https://new.com", 301);
        assertThat(r.getServidorId()).isEqualTo("srv-1");
        assertThat(r.getHostOrigen()).isEqualTo("old.com");
        assertThat(r.getUrlDestino()).isEqualTo("https://new.com");
        assertThat(r.getCodigoEstado()).isEqualTo(301);

        r.setId("re-1");
        r.setCodigoEstado(302);
        r.setUrlDestino("https://otra.com");
        r.setHostOrigen("aaa.com");
        r.setServidorId("srv-x");
        LocalDateTime fecha = LocalDateTime.now();
        r.setFechaCreacion(fecha);
        assertThat(r.getId()).isEqualTo("re-1");
        assertThat(r.getCodigoEstado()).isEqualTo(302);
        assertThat(r.getUrlDestino()).isEqualTo("https://otra.com");
        assertThat(r.getHostOrigen()).isEqualTo("aaa.com");
        assertThat(r.getServidorId()).isEqualTo("srv-x");
        assertThat(r.getFechaCreacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("Subdominio: round-trip de todos los accessors")
    void subdominio_roundTrip() {
        Subdominio s = new Subdominio();
        s.setId("sub-1");
        s.setServidorId("srv-1");
        s.setNombre("api");
        s.setTipo("A");
        s.setDestino("1.2.3.4");
        s.setSslActivo(true);
        LocalDateTime fecha = LocalDateTime.now();
        s.setFechaCreacion(fecha);

        assertThat(s.getId()).isEqualTo("sub-1");
        assertThat(s.getServidorId()).isEqualTo("srv-1");
        assertThat(s.getNombre()).isEqualTo("api");
        assertThat(s.getTipo()).isEqualTo("A");
        assertThat(s.getDestino()).isEqualTo("1.2.3.4");
        assertThat(s.isSslActivo()).isTrue();
        assertThat(s.getFechaCreacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("Despliegue: constructor y accessors completos incluyendo metadatos git")
    void despliegue_constructorYAccessors() {
        Despliegue d = new Despliegue("srv-1", "git", "https://github.com/x/y");
        assertThat(d.getServidorId()).isEqualTo("srv-1");
        assertThat(d.getTipo()).isEqualTo("git");
        assertThat(d.getUrl()).isEqualTo("https://github.com/x/y");
        assertThat(d.getFechaInicio()).isNotNull();

        d.setId("dep-1");
        d.setEstado("completado");
        d.setMensaje("Build ok");
        d.setTecnologia("node");
        d.setRama("main");
        d.setDirectorioRemoto("/srv/app");
        d.setTokenWebhook("tok-abc");
        LocalDateTime fechaFin = LocalDateTime.now();
        d.setFechaFin(fechaFin);
        d.setUrl("https://nueva.com");
        d.setTipo("zip");
        d.setServidorId("srv-x");

        assertThat(d.getId()).isEqualTo("dep-1");
        assertThat(d.getEstado()).isEqualTo("completado");
        assertThat(d.getMensaje()).isEqualTo("Build ok");
        assertThat(d.getTecnologia()).isEqualTo("node");
        assertThat(d.getRama()).isEqualTo("main");
        assertThat(d.getDirectorioRemoto()).isEqualTo("/srv/app");
        assertThat(d.getTokenWebhook()).isEqualTo("tok-abc");
        assertThat(d.getFechaFin()).isEqualTo(fechaFin);
        assertThat(d.getUrl()).isEqualTo("https://nueva.com");
        assertThat(d.getTipo()).isEqualTo("zip");
        assertThat(d.getServidorId()).isEqualTo("srv-x");
    }

    @Test
    @DisplayName("Backup: constructor y accessors completos")
    void backup_constructorYAccessors() {
        Backup b = new Backup("srv-1", "manual");
        assertThat(b.getServidorId()).isEqualTo("srv-1");
        assertThat(b.getTipo()).isEqualTo("manual");
        assertThat(b.getFechaCreacion()).isNotNull();
        assertThat(b.getNombre()).isNotBlank();
        assertThat(b.getEstado()).isNotBlank();

        b.setId("b-1");
        b.setEstado("completado");
        b.setTamano("250M");
        b.setRutaArchivo("/tmp/back.tar.gz");
        b.setNombre("nombre-custom");
        b.setTipo("auto");
        b.setServidorId("srv-x");
        LocalDateTime fecha = LocalDateTime.now();
        b.setFechaCreacion(fecha);

        assertThat(b.getId()).isEqualTo("b-1");
        assertThat(b.getEstado()).isEqualTo("completado");
        assertThat(b.getTamano()).isEqualTo("250M");
        assertThat(b.getRutaArchivo()).isEqualTo("/tmp/back.tar.gz");
        assertThat(b.getNombre()).isEqualTo("nombre-custom");
        assertThat(b.getTipo()).isEqualTo("auto");
        assertThat(b.getServidorId()).isEqualTo("srv-x");
        assertThat(b.getFechaCreacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("ConfiguracionAsistenteIa: round-trip de todos los accessors")
    void configuracionAsistenteIa_roundTrip() {
        ConfiguracionAsistenteIa c = new ConfiguracionAsistenteIa();
        c.setId("c-1");
        c.setUsuarioId("u-1");
        c.setApiKeyCifrada("xxx");
        c.setModeloPreferido("modelo-1");
        c.setComandosAutoAprobados(List.of("ls", "df"));
        LocalDateTime fecha = LocalDateTime.now();
        c.setFechaActualizacion(fecha);

        assertThat(c.getId()).isEqualTo("c-1");
        assertThat(c.getUsuarioId()).isEqualTo("u-1");
        assertThat(c.getApiKeyCifrada()).isEqualTo("xxx");
        assertThat(c.getModeloPreferido()).isEqualTo("modelo-1");
        assertThat(c.getComandosAutoAprobados()).containsExactly("ls", "df");
        assertThat(c.getFechaActualizacion()).isEqualTo(fecha);
    }

    @Test
    @DisplayName("Servidor: round-trip de los campos nuevos (usuarioId)")
    void servidor_roundTripCamposNuevos() {
        Servidor s = new Servidor();
        s.setUsuarioId("u-1");
        s.setId("srv-1");
        s.setBackupsAutomaticosActivos(true);
        s.setHoraBackupAutomatico("04:00");
        s.setFallosConsecutivosSsh(2);

        assertThat(s.getUsuarioId()).isEqualTo("u-1");
        assertThat(s.getId()).isEqualTo("srv-1");
        assertThat(s.isBackupsAutomaticosActivos()).isTrue();
        assertThat(s.getHoraBackupAutomatico()).isEqualTo("04:00");
        assertThat(s.getFallosConsecutivosSsh()).isEqualTo(2);
    }
}
