# 10 · Conclusiones

> **Este es el apartado más importante para la defensa del proyecto** (Rublicas.md línea 118).

## Evaluación crítica respecto a los objetivos iniciales

| Objetivo inicial | Resultado | Comentario |
|---|---|---|
| Panel SaaS funcional para gestionar VPS por SSH sin instalar agente | ✅ | Apache MINA SSHD funciona limpio contra Linux moderno. Conexión real, no mock. |
| Despliegues automáticos desde Git | ✅ Funcional con repos públicos. ⚠️ Repos privados requieren clave deploy aún manual | Iteración futura: gestionar SSH keys de deploy desde la app. |
| Backups programados | ✅ Cron en VPS + indexado automático | Funcionalidad real, probada con backups que aparecen tras 24h. |
| Asistente IA contextual | ✅ con OpenRouter (modelo configurable) | Limita a plan Pro/Business. Funciona en modo "sugerencia + confirmación". |
| Despliegue público con HTTPS | ✅ https://autodeploy.kruhale.com | Let's Encrypt + HSTS, renovación automática. |
| WCAG 2.1 AA en frontend | ✅ todos los requisitos aplicados + Lighthouse 100/100 en `/`, `/login` y `/register` | Cierra todos los patrones que penalizaron Cofira en el trimestre anterior. |
| Documentación rúbrica DIW | ✅ con este documento + `docs/design/DOCUMENTACION.md` (7 secciones) + README de styles ampliado | Cubre el peso 20% de "preprocesadores" con evidencia de mixins/funciones/container queries. |
| 5 idiomas | ✅ es/en/fr/de/it con ngx-translate | Los aria-label también traducidos. |
| Tests automatizados en CI | ✅ 119 frontend + 38 backend, todos verdes | Cada PR pasa CI antes de merge; rollback automático si falla el smoke test. |
| Endurecimiento de seguridad | ✅ AES-GCM, CORS whitelist, JWT fail-fast, `@JsonIgnore`, ownership en endpoints, sanitización shell, autenticación WS | Auditoría interna detectó 7 vulnerabilidades críticas; todas cerradas (ver sección **Endurecimiento de seguridad** abajo). |

## Grado de cumplimiento del alcance propuesto

**Alcance entregado**: ~95 % del MVP definido en la fase 5 del proyecto Órbita 1.

Funcionalidades que quedaron en el roadmap futuro:
- **Stripe real** para el plan Pro (actualmente la página `/pago` es UI completa pero sin integración con un proveedor de pago real).
- **2FA** con TOTP (la base del login está preparada pero el flujo del segundo factor está fuera de scope para el primer release).
- **Notificaciones por email** (toasts y campana del header funcionan; el envío de emails reales con un SMTP externo queda pendiente).
- **Multi-tenant** (organizaciones con varios usuarios). Hoy cada usuario tiene sus propios servidores.

## Endurecimiento de seguridad

En el último sprint se lanzó una auditoría interna del código que detectó **siete vulnerabilidades de severidad alta o crítica**. Las siete quedan cerradas:

| # | Vulnerabilidad | Mitigación |
|---|---|---|
| SEC-1 | `CifradoUtil` usaba `AES/ECB` sin IV (mismo plaintext → mismo ciphertext) para passwords SSH y API keys | Migrado a **`AES/GCM/NoPadding`** con IV aleatorio de 12 bytes y tag de autenticación de 128 bits. Compat backwards: los registros antiguos siguen pudiéndose descifrar |
| SEC-2 | `CORS` con `setAllowedOriginPatterns("*")` + `setAllowCredentials(true)` permitía bypass total | Whitelist concreta de orígenes (producción + localhost), cabeceras limitadas a `Authorization/Content-Type/Accept/X-Requested-With` |
| SEC-3 | WebSocket `/ws/terminal` aceptaba handshake sin autenticación → cualquiera podía abrir terminal SSH ajena | `JwtHandshakeInterceptor` que extrae el JWT del query param `?token=...` y lo valida antes del upgrade. Frontend ya manda el token en los tres WS |
| SEC-4 | Endpoints `/api/usuarios/{id}/**` no comprobaban que `{id}` coincidiera con el usuario autenticado | `@PreAuthorize("hasRole('ADMIN') or #id == authentication.principal")` en 11 endpoints |
| SEC-5 | `LogService` concatenaba `archivo` y `patron` directos en `tail`/`grep` → inyección de comandos shell | Validación estricta por regex (whitelist de caracteres) + `grep -F` para tratar el patrón como literal |
| SEC-6 | `JWT secret` y `CIFRADO_CLAVE` tenían fallback **hardcoded** en `application.properties` → JWT forjable si faltaba la variable de entorno | `@PostConstruct` que aborta el arranque (`fail-fast`) si la variable falta o tiene menos de 32 bytes |
| SEC-7 | `passwordHash`, `passwordCifrada` y `claveSshPrivada` salían en el JSON de las respuestas (admin list, get servidor) | `@JsonIgnore` en los tres campos. La deserialización no se ve afectada porque los endpoints usan DTOs |

La auditoría completa con archivo, línea y propuesta de fix está en el cuerpo del commit `0c4ae84`.

## Lecciones aprendidas

### Técnicas

1. **ITCSS + BEM funciona si se respeta la cascada**. La primera vez (en Cofira) puse Custom Properties en Settings y empecé a luchar contra la propia metodología. Mover los tokens a `02-generic/_design-tokens.scss` resolvió todo y desbloqueó la lectura del README de styles para terceros.

2. **`@function` y `@include` no son adorno**. Definirlos sin usarlos (como en Cofira) es peor que no tenerlos: confunde al lector. En AutoDeploy los 31 mixins y 11 funciones tienen al menos un uso real, documentado en el README.

3. **Container queries cambian el diseño responsive**. Una vez probadas, los componentes reutilizables como `tarjeta-servidor` se vuelven mucho más simples: ya no hay que pensar en "qué viewport tengo", sino "qué ancho tengo".

4. **`prefers-reduced-motion` es WCAG no opcional**. Las animaciones de entrada con `.animar-hijos` me parecían divertidas hasta que alguien con vestíbulo sensible me dijo que le marean. Envolverlas en `@include movimiento-reducido` fue tres líneas que mejoran la experiencia para mucha gente.

5. **Apache MINA SSHD > JSch**. Cambiar de librería ahorra horas de debug de handshake.

6. **MongoDB encaja con datos en evolución**. Cambiar el esquema en cada sprint sin migraciones manuales fue clave. Para datos transaccionales (pagos reales), pasaría a PostgreSQL.

### De seguridad

7. **Auditar el código propio con ojos críticos descubre lo que el desarrollo "natural" oculta**. El proyecto funcionaba a nivel UX y de tests, pero una revisión sistemática en busca de vulnerabilidades destapó AES en modo ECB, CORS `*`, JWT con secreto hardcoded en el repo, inyección de comandos en `tail`/`grep` por concatenar entradas del usuario, endpoints que devolvían password hashes en JSON, etc. Ninguna de esas debilidades habría aparecido haciendo testing funcional: hay que sentarse específicamente a buscar problemas de seguridad. El cierre de las 7 vulnerabilidades es la lección más útil del proyecto.

### De producto

8. **El usuario no quiere instalar software en su VPS**. La hipótesis inicial era correcta. Coolify, Dokku y CapRover son potentes pero requieren un compromiso que muchos developers freelance no quieren.

9. **Los lectores de pantalla descubren bugs visuales**. Probar con VoiceOver reveló que algunos `<section>` no tenían etiqueta accesible y que el sidebar móvil cerraba con el backdrop pero no avisaba al lector de que el menú se había cerrado (`aria-expanded`). Lo que pasaba el ojo, no pasaba el oído.

10. **El skip link no es decorativo**. Cuando empecé a tabular desde la primera carga, vi cuánto tiempo perdía pasando por la sidebar antes de llegar al contenido. Una utilidad de 30 líneas (`.u-saltar-contenido`) ahorra fricción real.

### De proceso

11. **PRs pequeños y temáticos > PR gigante**. En esta entrega cada bloque del plan DIW es una PR independiente (rango aproximado #220 a #249, una por gap cerrado). El historial cuenta la historia del refactor y el evaluador puede revisar el cierre de cada gap por separado.

12. **No usar `Co-Authored-By` me obligó a revisar cada commit**. La regla obliga a ser consciente del autor y del mensaje, y resulta en un historial más legible.

13. **Documentar mientras se desarrolla > documentar al final**. Los documentos `docs/01-10` y `docs/design/DOCUMENTACION.md` se escribieron en paralelo a las PRs. Eso ahorra el sprint final dedicado sólo a docs (que siempre acaba siendo demasiado corto).

## Mejoras futuras propuestas

| Mejora | Prioridad |
|---|---|
| Stripe real para el plan Pro | Alta |
| 2FA con TOTP | Alta |
| Notificaciones por email (con MailJet o similar) | Media |
| Multi-tenant con organizaciones | Media |
| Webhooks (Slack, Discord) para eventos del servidor | Media |
| Plantillas de despliegue ("one-click WordPress", "one-click NextJS") | Baja |
| App móvil nativa con Capacitor/Ionic | Baja |
| Métricas históricas (gráficas) con retención > 30 días | Media |
| Migrar tests E2E a Playwright en CI | Alta |
| Auditoría Lighthouse / WAVE / TAW automatizada en cada PR | Alta |
| Pasar `pages/cuenta/cuenta.scss` a global (eliminar la excepción `:host`) | Baja |
| Lazy-load del módulo de billing/admin para reducir bundle inicial | Media |

## Reflexión personal

El proyecto consolidó cuatro asignaturas en una entrega. La parte que más me costó al principio fue la SSH al VPS (cambiando de JSch a MINA SSHD me dio mucha guerra), y la que más me satisfizo fue el sistema de temas con detección automática del SO: hacer que la app cambie sola cuando el usuario alterna entre día y noche en macOS y al mismo tiempo respete la elección manual una vez se ha tocado el botón es uno de esos detalles que parecen invisibles pero que se notan.

DIW en particular me obligó a desaprender. Después del proyecto Cofira (suspendido con 24/40), tenía claro qué NO hacer: Custom Properties en Settings, BEM plano, `<footer>` para botones, `<section>` sin heading. AutoDeploy aplica deliberadamente los patrones opuestos y, en algunos casos, va más allá (container queries, `prefers-color-scheme` automático con override manual, skip link, `aria-current`, tipografía fluida con función Sass propia). Cada gap de Cofira queda cerrado con una PR que lo demuestra con código.

La defensa la prepararé apoyándome en este documento, en `docs/design/DOCUMENTACION.md` (7 secciones que pide Rublicas10), en `autodeploy/src/styles/README.md` (mixins/funciones/estados/responsive/accesibilidad) y en `docs/accesibilidad/README.md` (8 secciones de Rublicas11 con auditorías Lighthouse). Tener la app desplegada en `autodeploy.kruhale.com` me permite hacer demos en vivo y dejar que el tribunal toque la UI con su propio teclado, móvil y lector de pantalla.

---

> Para acceder al detalle técnico de cada sección, ver los demás documentos de `/docs`:
>
> - [01 · Introducción](./01-introduccion.md)
> - [02 · Descripción](./02-descripcion.md)
> - [03 · Instalación](./03-instalacion.md)
> - [04 · Guía de estilos](./04-guia-estilos.md)
> - [05 · Diseño](./05-diseno.md)
> - [06 · Desarrollo](./06-desarrollo.md)
> - [07 · Pruebas](./07-pruebas.md)
> - [08 · Despliegue](./08-despliegue.md)
> - [09 · Manual de usuario](./09-manual-usuario.md)
> - [Arquitectura técnica detallada](./ARCHITECTURE.md)
> - [API REST](./API.md)
> - [Despliegue paso a paso](./DEPLOY.md)
> - [Evidencias visuales](./EVIDENCIA.md)
> - [Verificación de red](./VERIFICATION.md)
> - [Artefactos](./ARTIFACTS.md)
> - [Documentación DIW (7 secciones)](./design/DOCUMENTACION.md)
