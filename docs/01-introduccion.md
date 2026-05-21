# 01 · Introducción, objetivos y antecedentes

## Origen de la idea

AutoDeploy nace de una experiencia personal repetida: cada vez que había que desplegar una aplicación a un VPS (un proyecto en clase, una demo, una idea propia) el ciclo era el mismo. Conectarse por SSH, copiar el código, instalar dependencias, configurar nginx, abrir puertos en el firewall, recordar a qué dominio apunta el subdominio, configurar SSL con Let's Encrypt, programar backups cron, monitorizar métricas con `top`/`free`/`df`… horas de comandos y ningún panel que permita ver el estado del servidor de un vistazo.

Soluciones existentes como **Coolify**, **Dokku** o **CapRover** lo hacen, pero todas pasan por instalar su propio agente en el VPS. La idea de AutoDeploy es la opuesta: la app vive en un proveedor central (este SaaS) y se conecta al VPS del usuario únicamente por SSH/SFTP. Eso significa cero software preinstalado en el servidor, ningún agente que mantener, y un único punto de fallo (el SaaS, que se cae y restaura con Docker Compose).

## Motivación académica

El proyecto se desarrolla como **Proyecto Final Intermodular** del 2º curso del ciclo formativo Desarrollo de Aplicaciones Web (DAW), curso 2025-2026. Aglutina las cuatro asignaturas:

- **DIW** (Diseño de Interfaces Web): UX, prototipo Figma, sistema de diseño visual, HTML semántico, CSS3 con preprocesadores, accesibilidad WCAG.
- **DWES** (Desarrollo Web en Entorno Servidor): API REST con Spring Boot 3.4 + Java 21, MVC, MongoDB, autenticación con JWT.
- **DWEC** (Desarrollo Web en Entorno Cliente): Angular 20 con signals, manejo de eventos, modelo del documento, comunicación asíncrona con la API.
- **Despliegue de Aplicaciones Web**: Docker, nginx como reverse proxy, GitHub Actions para CI/CD, VPS con dominio público.

## Expectativas y objetivos específicos

| Objetivo | Estado |
|---|---|
| Aplicación funcional end-to-end (registro, login, conectar servidor por SSH real, desplegar app, ver métricas en vivo) | ✅ |
| API REST documentada con OpenAPI/Swagger | ✅ (`docs/API.md`) |
| Tests unitarios en frontend (Karma+Jasmine) | ✅ 68/68 |
| Despliegue público con HTTPS | ✅ https://autodeploy.kruhale.com |
| Documentación de la rúbrica de 4 módulos | En curso (este documento) |
| Prototipo Figma con guía de estilo y biblioteca de componentes | ✅ |
| Asistente IA integrado con LLM externo | ✅ OpenRouter (modelo configurable) |
| 5 idiomas (es / en / fr / de / it) | ✅ ngx-translate |
| Sistema de temas (oscuro / claro) con detección del SO | ✅ |

## Análisis comparativo

| Herramienta | Modelo | Punto fuerte | Diferencia con AutoDeploy |
|---|---|---|---|
| **Coolify** | Self-hosted (instala agente en el VPS) | Comunidad muy activa, gran ecosistema | AutoDeploy no requiere instalar nada en el VPS del usuario; conecta sólo por SSH |
| **Dokku** | Self-hosted (PaaS sobre Docker) | Conocido y estable | Dokku necesita Docker preinstalado en el VPS; AutoDeploy funciona con cualquier Linux con SSH |
| **CapRover** | Self-hosted | One-click apps | AutoDeploy se centra en VPS personalizados, no en plantillas predefinidas |
| **Vercel / Netlify** | SaaS | Cero configuración, edge funcional | Sólo serverless / SSG; AutoDeploy ofrece VPS reales con SSH e infraestructura propia |
| **Heroku** | SaaS | Familiar | Heroku abandonó el plan gratuito; AutoDeploy es self-hosted (gratis) |

AutoDeploy ocupa un hueco: **SaaS sin agente en el VPS**, enfocado a profesionales/devs con sus propios servidores que quieren un panel de gestión, no una plataforma cerrada.

## Estructura del documento

Esta carpeta `/docs` contiene los 10 apartados que pide la rúbrica del Proyecto Final Intermodular. Cada archivo enlaza, donde corresponde, a documentos técnicos más detallados (`API.md`, `ARCHITECTURE.md`, `DEPLOY.md`, `EVIDENCIA.md`, `VERIFICATION.md`, `ARTIFACTS.md`) y al documento específico de DIW en `docs/design/DOCUMENTACION.md`.

- [02 · Descripción](./02-descripcion.md)
- [03 · Instalación y preparación](./03-instalacion.md)
- [04 · Guía de estilos y prototipado](./04-guia-estilos.md)
- [05 · Diseño](./05-diseno.md)
- [06 · Desarrollo](./06-desarrollo.md)
- [07 · Pruebas](./07-pruebas.md)
- [08 · Despliegue](./08-despliegue.md)
- [09 · Manual de usuario](./09-manual-usuario.md)
- [10 · Conclusiones](./10-conclusiones.md)
