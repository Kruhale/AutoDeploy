package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ZipDeployServiceTest {

    @Mock private SftpUploadService sftpUploadService;
    @Mock private SshCommandService sshCommandService;

    @InjectMocks
    private ZipDeployService zipDeployService;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
    }

    private static byte[] zipMinimo() throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("index.html"));
            zos.write("<h1>hola</h1>".getBytes());
            zos.closeEntry();
            zos.putNextEntry(new ZipEntry("css/"));
            zos.closeEntry();
            zos.putNextEntry(new ZipEntry("css/style.css"));
            zos.write("body{}".getBytes());
            zos.closeEntry();
        }
        return baos.toByteArray();
    }

    @Test
    @DisplayName("desplegarDesdeZip: lanza si el archivo esta vacio")
    void desplegarDesdeZip_archivoVacio() {
        MockMultipartFile vacio = new MockMultipartFile("archivo", "x.zip", "application/zip", new byte[0]);

        assertThatThrownBy(() -> zipDeployService.desplegarDesdeZip(servidor, vacio, "/srv/app", "estatica"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(sshCommandService, never()).ejecutarComando(any(), any());
    }

    @Test
    @DisplayName("desplegarDesdeZip: lanza si el archivo no tiene extension .zip")
    void desplegarDesdeZip_extensionInvalida() throws Exception {
        MockMultipartFile mal = new MockMultipartFile("archivo", "x.txt", "text/plain", zipMinimo());

        assertThatThrownBy(() -> zipDeployService.desplegarDesdeZip(servidor, mal, "/srv/app", "estatica"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("desplegarDesdeZip: extension valida y archivo OK ejecuta limpieza + upload + build")
    void desplegarDesdeZip_estatica() throws Exception {
        MockMultipartFile zip = new MockMultipartFile("archivo", "deploy.zip", "application/zip", zipMinimo());
        when(sshCommandService.ejecutarComando(eq(servidor), contains("rm -rf /srv/app"))).thenReturn("OK");
        when(sshCommandService.ejecutarComando(eq(servidor), contains("Archivos estaticos"))).thenReturn("Archivos copiados");

        String salida = zipDeployService.desplegarDesdeZip(servidor, zip, "/srv/app", "estatica");

        assertThat(salida).contains("Archivos copiados");
        verify(sftpUploadService).subirCarpeta(eq(servidor), any(), eq("/srv/app"));
    }

    @Test
    @DisplayName("desplegarDesdeZip: con tecnologia 'nodejs' usa npm install + npm run build")
    void desplegarDesdeZip_nodejs() throws Exception {
        MockMultipartFile zip = new MockMultipartFile("archivo", "app.zip", "application/zip", zipMinimo());

        zipDeployService.desplegarDesdeZip(servidor, zip, "/srv/app", "nodejs");

        verify(sshCommandService).ejecutarComando(eq(servidor), contains("npm install --omit=dev"));
    }

    @Test
    @DisplayName("desplegarDesdeZip: con tecnologia desconocida usa el echo por defecto")
    void desplegarDesdeZip_tecnologiaDesconocida() throws Exception {
        MockMultipartFile zip = new MockMultipartFile("archivo", "app.zip", "application/zip", zipMinimo());

        zipDeployService.desplegarDesdeZip(servidor, zip, "/srv/app", "tecnologia-rara");

        verify(sshCommandService).ejecutarComando(eq(servidor), contains("Despliegue ZIP completado"));
    }

    @Test
    @DisplayName("desplegarDesdeZip: detecta entradas de Zip-Slip que se salen del destino")
    void desplegarDesdeZip_zipSlip() throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("../../../tmp/evil.sh"));
            zos.write("evil".getBytes());
            zos.closeEntry();
        }
        MockMultipartFile zip = new MockMultipartFile("archivo", "malo.zip", "application/zip", baos.toByteArray());

        assertThatThrownBy(() -> zipDeployService.desplegarDesdeZip(servidor, zip, "/srv/app", "estatica"))
                .isInstanceOf(RuntimeException.class);
    }
}
