## Guards

Los guards controlan la autenticación y la validación previa al acceso de los controladores. Todos se aplican globalmente en `AppModule`, por lo que cada request pasa por esta cadena antes de ejecutar el handler.

### `ApiKeyGuard`

- **Funcionalidad**: Verifica que las peticiones a endpoints protegidos incluyan una API Key válida. Acepta la clave en el header `X-API-Key` o como token `Bearer`.
- **Integraciones**: Respeta el decorador `@Public()` para omitir la comprobación cuando el endpoint se marca como público.
- **Ventajas**
    - Añade una capa de seguridad estática para herramientas administrativas.
    - Genera trazabilidad mediante logs sobre intentos válidos y fallidos.
- **Buenas prácticas**
    - Rotar periódicamente la `ADMIN_API_KEY` y almacenarla en un secret manager.
    - Desplegar pruebas e2e que validen respuestas 401/403 al omitir o proporcionar claves incorrectas.
    - Mantener endpoints expuestos vía `@Public()` limitados a utilidades no críticas.

### `ApplicationValidationGuard`

- **Funcionalidad**: Verifica que el `applicationId` en el cuerpo de la petición pertenezca a la lista blanca definida en `ALLOWED_APPLICATIONS`.
- **Integraciones**: Se puede omitir por endpoint con `@SkipAppValidation()`.
- **Ventajas**
    - Protege la emisión de OTPs y recursos sensibles sólo a aplicaciones aprobadas.
    - Permite habilitar modo "abierto" en entornos de desarrollo cuando la lista está vacía.
- **Buenas prácticas**
    - Mantener la variable de entorno sincronizada con los clientes autorizados y monitorizarla vía infraestructura.
    - Validar explícitamente en DTOs el tipo de `applicationId` para recibir feedback temprano.
    - Registrar métricas de rechazos para detectar intentos no autorizados.

### `CustomThrottlerGuard`

- **Funcionalidad**: Extiende `ThrottlerGuard` para generar claves de rate limiting específicas. En rutas OTP combina `applicationId` + `identifier`; en el resto usa la IP del cliente. Emite respuestas enriquecidas con `retryAfter` y `identifier`.
- **Ventajas**
    - Soporta límites diferenciados (`short`, `medium`) configurados en Redis a través del módulo `throttler-redis`.
    - Reduce abuso en endpoints OTP al limitar por par aplicación/usuario.
    - Incluye logs detallados para depurar bloqueos y para análisis de fraude.
- **Buenas prácticas**
    - Ajustar los límites y TTLs según observabilidad y tráfico real, apoyándose en métricas de Redis.
    - Documentar internamente los identificadores de throttle usados (IP o applicationId:identifier) para facilitar soporte.
    - Añadir pruebas unitarias simulando payloads OTP y requests sin body para garantizar la función `getTracker`.

### Cadena de ejecución sugerida

1. `ApiKeyGuard` verifica si la ruta es pública y valida la clave cuando aplica.
2. `ApplicationValidationGuard` confirma el `applicationId` para aplicaciones registradas.
3. `CustomThrottlerGuard` impone límites de uso basados en Redis.

Mantener el orden y las configuraciones centralizadas asegura coherencia en toda la API y simplifica futuras extensiones.
