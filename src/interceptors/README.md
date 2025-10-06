## Interceptors

Los interceptores permiten ejecutar lógica transversal antes y después de un handler. En este servicio se aplican globalmente para ofrecer observabilidad, seguridad de datos y consistencia en las respuestas.

### `CacheInterceptor`

- **Funcionalidad**: Cachea respuestas `GET` exitosas en Redis utilizando una clave `cache:<método>:<url>:<userId>` y un TTL configurable.
- **Ventajas**
    - Reduce la carga en base de datos y servicios externos.
    - Mejora la latencia en endpoints consultados con frecuencia.
- **Buenas prácticas**
    - Ajustar el TTL según la frescura requerida; puedes inyectar un TTL distinto al crear la instancia con `@UseInterceptors(new CacheInterceptor(120))`.
    - Asegurarte de invalidar manualmente el cache cuando existan operaciones que mutan los datos subyacentes.
    - Requiere Redis operativo; manejar fallos de conexión con alertas para evitar degradación silenciosa.

### `LoggingInterceptor`

- **Funcionalidad**: Registra entrada, salida y errores de cada request, incluyendo usuario, parámetros y duración.
- **Ventajas**
    - Aporta trazabilidad para auditoría y debugging.
    - Permite detectar cuellos de botella midiendo tiempos de respuesta.
- **Buenas prácticas**
    - Mantener los logs estructurados (JSON) en producción para facilitar ingestión en sistemas de observabilidad.
    - Evitar registrar información sensible en el body; combinarlo con `SanitizeInterceptor` para limpiar respuestas.
    - Configurar niveles de log apropiados (`LOGGER_LEVEL`) según el entorno.

### `SanitizeInterceptor`

- **Funcionalidad**: Elimina recursivamente campos marcados como sensibles (`password`, `hashedOtp`, `apiKey`, etc.) de las respuestas.
- **Ventajas**
    - Previene fugas accidentales de datos confidenciales.
    - Facilita el cumplimiento de normativas (GDPR, PCI-DSS).
- **Buenas prácticas**
    - Mantener la lista de campos sensibles sincronizada con los modelos de datos; añadir casos nuevos cuando se incorporen secretos.
    - Complementar con tests que garanticen la exclusión de campos sensibles en endpoints críticos.
    - Para respuestas muy anidadas, monitorear rendimiento y ampliar la lista con prefijos específicos si es necesario.

### `TimeoutInterceptor`

- **Funcionalidad**: Aplica un límite de tiempo a cada request (30 segundos por defecto). Si se supera, lanza `RequestTimeoutException` con payload estándar.
- **Ventajas**
    - Evita que solicitudes colgadas consuman recursos de manera indefinida.
    - Mejora la experiencia del cliente con respuestas predecibles.
- **Buenas prácticas**
    - Configurar un timeout acorde a la operación (`@UseInterceptors(new TimeoutInterceptor(5000))` para procesos cortos).
    - Monitorizar los eventos de timeout para identificar endpoints que necesitan optimización o trabajo en background.
    - Documentar qué operaciones pueden reiniciarse de forma segura tras un timeout.

### `TransformInterceptor`

- **Funcionalidad**: Envuela todas las respuestas exitosas en un formato consistente `{ success, data, timestamp, path, method, statusCode, requestId }`.
- **Ventajas**
    - Simplifica el consumo desde frontends al recibir estructuras uniformes.
    - Añade metadata útil (requestId) para correlacionar logs y peticiones.
- **Buenas prácticas**
    - Asegurarse de que los controladores retornen datos serializables; el interceptor no atrapa errores de JSON.
    - Utilizar el `requestId` generado para correlacionar logs en servicios externos.
    - Mantener tests contractuales que validen la forma de respuesta para evitar regresiones.

### Orden sugerido

El orden de inyección en `AppModule` es: `LoggingInterceptor` → `TransformInterceptor` → `SanitizeInterceptor` → `TimeoutInterceptor`. Esto garantiza que los logs y transformaciones se ejecuten antes de sanitizar y que cualquier operación costosa finalice dentro del timeout configurado.
