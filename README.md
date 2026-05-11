# AutoDeploy

Panel de gestión y despliegue automático para servidores VPS. 

Permite añadir servidores por SSH, desplegar aplicaciones vía ZIP o clonando repositorios Git, gestionar subdominios, certificados SSL y monitorizar el rendimiento (CPU, RAM, Disco) en tiempo real. Ahora también incluye un Asistente IA (OpenRouter) para generación de comandos y resolución de dudas.

---

## Documentación Completa

- [Instrucciones de Despliegue, Arquitectura y Artefactos (DEPLOY.md)](docs/DEPLOY.md)
- [Referencia completa de la API REST (API.md)](docs/API.md)

---

## Arquitectura del Proyecto

El sistema está completamente dockerizado. Se divide en un frontend estático servido por Nginx (que también actúa de reverse proxy), un backend en Java y una base de datos documental.

```mermaid
flowchart TD
    Internet((Internet)) -->|HTTP :80| Nginx[Nginx Reverse Proxy]
    Nginx -->|Sirve Angular estático| Front(Frontend Angular 20)
    Nginx -->|Redirige /api/| Back[Backend Spring Boot 3.4]
    Nginx -->|WebSockets /ws/| Back
    
    Back -->|Persistencia| DB[(MongoDB 8)]
    Back -->|Gestión remota| VPS[Servidor VPS remoto via SSH]
    
    subclass Local[Red Interna Segura Docker]
        Nginx
        Back
        DB
    end
```

---

## Stack tecnológico

- **Frontend:** Angular 20 + SCSS (Metodología ITCSS / BEM) + xterm.js (Terminal SSH en navegador)
- **Backend:** Spring Boot 3.4 (Java 21)
- **Base de datos:** MongoDB 8
- **Comunicaciones:** API REST y WebSockets (para terminal y métricas en tiempo real)
- **Infraestructura remota:** Apache MINA SSHD
- **Inteligencia Artificial:** Integración con OpenRouter API

---

## Inicio rápido (Entorno Docker de Producción)

El proyecto viene preparado con un `docker-compose.prod.yml` que orquesta la construcción de imágenes multi-stage y levanta la BD, el backend y el proxy frontend.

```bash
git clone https://github.com/Kruhale/AutoDeploy.git
cd AutoDeploy

# 1. Configurar variables de entorno y secretos
cp .env.example .env

# 2. Levantar toda la arquitectura
docker compose -f docker-compose.prod.yml up --build -d
```

La aplicación quedará disponible en **`http://localhost`**.
*(Para más detalles sobre verificación de red, carga y proxies, consulta `docs/DEPLOY.md`)*.

---

## Desarrollo Local

Si deseas desarrollar o debugear localmente sin la orquestación completa de producción:

### 1. Base de datos
Levanta solo el contenedor de Mongo:
```bash
docker compose up mongodb -d
```

### 2. Backend (Java)
```bash
cd backend
./mvnw spring-boot:run
```
La documentación interactiva de la API estará en `http://localhost:8080/swagger-ui.html`.

### 3. Frontend (Angular)
```bash
cd autodeploy
npm install
npm start
```
El panel estará disponible en `http://localhost:4200`.

---

## CI/CD (GitHub Actions)

Este repositorio gestiona el código de forma ordenada y ejecuta pipelines automáticos.
- **CI (Integración Continua):** Compila el código de Angular y Maven, y ejecuta todos los tests unitarios y de integración.
- **CD (Despliegue Continuo):** Al integrar en la rama `main`, empaqueta las imágenes Docker y las publica usando Secrets en el registro de artefactos (Docker Hub).

> **EVIDENCIA CI/CD:** 
> 
> *Añadir captura de pantalla de las Actions en este espacio.*

---

## Licencia

Este proyecto está bajo la licencia MIT.