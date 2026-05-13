package com.autodeploy.service;

import com.autodeploy.dto.ConexionSshRequest;
import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import com.autodeploy.util.CifradoUtil;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.session.ClientSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class ServidorService {

    private final ServidorRepository servidorRepository;

    @Value("${autodeploy.cifrado.clave}")
    private String claveCifrado;

    public ServidorService(ServidorRepository servidorRepository) {
        this.servidorRepository = servidorRepository;
    }

    public Servidor registrar(ConexionSshRequest peticion) {
        Servidor nuevoServidor = new Servidor();
        nuevoServidor.setNombre(peticion.nombre());
        nuevoServidor.setDireccionIp(peticion.direccionIp());
        nuevoServidor.setPuertoSsh(peticion.puertoSsh());
        nuevoServidor.setUsuarioSsh(peticion.usuarioSsh());
        nuevoServidor.setMetodoAutenticacion(peticion.metodoAutenticacion());

        if ("password".equals(peticion.metodoAutenticacion()) && peticion.password() != null) {
            String passwordCifrada = CifradoUtil.cifrar(peticion.password(), claveCifrado);
            nuevoServidor.setPasswordCifrada(passwordCifrada);
        }

        if ("key".equals(peticion.metodoAutenticacion()) && peticion.claveSshPrivada() != null) {
            String claveCifrada = CifradoUtil.cifrar(peticion.claveSshPrivada(), claveCifrado);
            nuevoServidor.setClaveSshPrivada(claveCifrada);
        }

        nuevoServidor.setEstado("conectado");

        Servidor servidorGuardado = servidorRepository.save(nuevoServidor);
        return servidorGuardado;
    }

    public List<Servidor> listar() {
        List<Servidor> listaDeServidores = servidorRepository.findAll();
        return listaDeServidores;
    }

    public Servidor obtenerPorId(String id) {
        Servidor servidor = servidorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Servidor no encontrado"));
        return servidor;
    }

    public void eliminar(String id) {
        boolean existe = servidorRepository.existsById(id);
        if (!existe) {
            throw new ResourceNotFoundException("Servidor no encontrado");
        }
        servidorRepository.deleteById(id);
    }

    public boolean probarConexion(ConexionSshRequest peticion) {
        SshClient cliente = SshClient.setUpDefaultClient();
        cliente.start();

        try {
            ClientSession sesion = cliente.connect(
                    peticion.usuarioSsh(),
                    peticion.direccionIp(),
                    peticion.puertoSsh()
            ).verify(10, TimeUnit.SECONDS).getSession();

            if ("password".equals(peticion.metodoAutenticacion())) {
                sesion.addPasswordIdentity(peticion.password());
            }

            sesion.auth().verify(10, TimeUnit.SECONDS);
            sesion.close();
            return true;
        } catch (Exception excepcion) {
            return false;
        } finally {
            cliente.stop();
        }
    }

    public String descifrarPassword(Servidor servidor) {
        if (servidor.getPasswordCifrada() == null) {
            return null;
        }
        String passwordDescifrada = CifradoUtil.descifrar(servidor.getPasswordCifrada(), claveCifrado);
        return passwordDescifrada;
    }

    public String descifrarClaveSsh(Servidor servidor) {
        if (servidor.getClaveSshPrivada() == null) {
            return null;
        }
        String claveDescifrada = CifradoUtil.descifrar(servidor.getClaveSshPrivada(), claveCifrado);
        return claveDescifrada;
    }
}
