# AutoDeploy

Panel de gestión y despliegue automático para servidores VPS.

## Stack tecnológico

- **Frontend:** Angular 20
- **Backend:** Spring Boot 3.4 (Java 21)
- **Base de datos:** MongoDB 8
- **Comunicación en tiempo real:** WebSocket
- **Conexión SSH:** Apache MINA SSHD

## Requisitos previos

- Java 21
- Node 22
- Docker y Docker Compose

## Inicio rápido con Docker

```bash
docker compose -f docker-compose.prod.yml up --build
```

La aplicación queda disponible en `http://localhost`.

## Desarrollo local

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

El backend arranca en `http://localhost:8080`.

### Frontend

```bash
cd autodeploy
npm install
npm start
```

El frontend arranca en `http://localhost:4200`.

### Base de datos

```bash
docker compose up mongodb
```

## Estructura del proyecto

```
AutoDeploy/
├── backend/                # API REST Spring Boot
│   ├── src/
│   └── Dockerfile
├── autodeploy/             # Aplicación Angular
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml      # Entorno de desarrollo (solo MongoDB)
└── docker-compose.prod.yml # Entorno completo (MongoDB + backend + frontend)
```

## Capturas de pantalla

_Proximamente._

## Licencia

MIT
