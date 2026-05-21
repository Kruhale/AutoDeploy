# 02 · Descripción

## Descripción general

AutoDeploy es un panel SaaS de gestión y despliegue automático para servidores VPS. Permite a un usuario conectar sus VPS (DigitalOcean, OVH, IONOS, AWS Lightsail, Hetzner…) introduciendo IP + credenciales SSH y, desde un único panel:

- Desplegar aplicaciones desde Git o archivo ZIP.
- Configurar backups automáticos (cron en el VPS, persistidos en MongoDB).
- Gestionar firewall (reglas ufw) y redirecciones nginx.
- Configurar DNS y SSL/TLS (Let's Encrypt) con un par de clics.
- Monitorizar métricas en vivo (CPU, RAM, disco, red) por WebSocket.
- Ejecutar comandos remotos con un asistente IA que entiende lenguaje natural.

Nada del software de gestión vive en el VPS del usuario: AutoDeploy se conecta por SSH/SFTP usando Apache MINA SSHD.

## Funcionalidades principales

### 1. Onboarding del servidor
- Formulario que pide IP, usuario, contraseña o clave SSH privada.
- Validación inmediata: prueba la conexión antes de guardar.
- Las credenciales se cifran con AES (`AUTODEPLOY_CIFRADO_CLAVE`) antes de persistir en MongoDB.

### 2. Dashboard
- Tarjetas con estado y métricas en vivo de cada servidor.
- Container queries (`@container`) hacen que la tarjeta se adapte al ancho del contenedor padre (sidebar plegado, grid dashboard, panel detalle).

### 3. Terminal interactiva
- Componente Angular con xterm.js conectado por WebSocket (`/ws/terminal`) al backend, que reenvía al SSH del VPS con MINA SSHD.
- Multiplexable: varias terminales abiertas simultáneamente.

### 4. Asistente IA
- Caja de chat con un modelo LLM externo (configurable: por defecto `openai/gpt-4o-mini` vía OpenRouter).
- El asistente puede sugerir comandos y, con confirmación del usuario, ejecutarlos por SSH.

### 5. Despliegues
- Pull de repositorio Git en el VPS o subida de ZIP.
- Detección de stack (Node, Python, Java, Docker) y receta de build automática.
- Logs en tiempo real durante el build.

### 6. Backups automáticos
- Programación de cron en el VPS desde el frontend.
- `BackupService.activarBackupsAutomaticos` instala `$HOME/.autodeploy/backup.sh` + entrada en crontab.
- Cada 2 minutos, un `@Scheduled` del backend descubre nuevos archivos `auto-*.tar.gz` en el VPS y los registra en MongoDB.

### 7. Firewall (ufw)
- Listado de reglas activas, formulario para añadir/quitar (puerto, protocolo, regla allow/deny).
- Aplica con `SshCommandService` invocando `ufw allow ...`.

### 8. Networking (DNS + redirecciones)
- Resolución de DNS desde el frontend usando dnsjava (backend).
- Generación de configs nginx para redirecciones a subdominios.

### 9. Métricas en streaming
- WebSocket `/ws/metricas` que envía CPU, RAM, disco, red cada segundo.
- El backend ejecuta `top`/`free`/`df` por SSH y parsea la salida.

### 10. Cuenta + Billing
- Perfil del usuario, planes (free / pro / business), tarjeta de pago de ejemplo (no integrada con Stripe en esta versión).

## Interfaz de usuario y experiencia (UI/UX)

- **Tema oscuro por defecto** con un acento amarillo cálido para acciones principales; **tema claro** opcional con detección automática de `prefers-color-scheme`.
- **Tipografía**: Outfit (cuerpo) + JetBrains Mono (snippets, terminales). Outfit ofrece pesos hasta black para crear jerarquía.
- **Iconografía**: FontAwesome 6 + algunos SVG inline para redes sociales del footer.
- **Animaciones**: sólo `transform`/`opacity` (compositadas en GPU). Spinner de carga, fade-up para revelar tarjetas en scroll, micro-interacciones. Todas se desactivan con `prefers-reduced-motion`.
- **5 idiomas**: es / en / fr / de / it, gestionados con ngx-translate. Los `aria-label` también están traducidos.

## Usuarios objetivo

- **Persona 1: Desarrolladora freelance** que gestiona 3-4 VPS de clientes y quiere un único panel para no perder tiempo. Necesita: backup automático, terminal rápida, alertas de caída.
- **Persona 2: Estudiante DAW** que aprende sysadmin y necesita una capa visual antes de aprender todos los comandos. Necesita: comandos sugeridos por la IA, explicaciones contextuales.
- **Persona 3: Sysadmin** con muchos servidores que ya domina la CLI pero quiere paneles para presentar a no-técnicos. Necesita: métricas en vivo, multi-tenant.

## Casos de uso

| Caso | Pasos |
|---|---|
| Conectar primer VPS | Login → Onboarding → IP + usuario + clave SSH → Probar conexión → Guardar → Aparece en el dashboard |
| Desplegar app desde GitHub | Dashboard → Servidor → Aplicaciones → "Nuevo despliegue" → Pegar URL del repo → Detectar stack → Build → Logs en vivo → URL final |
| Programar backups diarios a las 03:00 | Servidor → Backups → "Activar automáticos" → Elegir hora → Confirmar → AutoDeploy instala cron en el VPS |
| Pedir ayuda a la IA para abrir el puerto 5432 | Asistente IA → "Cómo abro el puerto 5432 en este servidor" → IA responde con `sudo ufw allow 5432/tcp` → Confirmar ejecución → Resultado |
| Cambiar idioma | Footer → Selector idioma → "FR" → Recarga instantánea de las traducciones |
