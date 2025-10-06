# OTP Controller

Documentación funcional de los endpoints expuestos en `OtpController` (`/api/otp`). Aquí encontrarás los requisitos de cada petición, ejemplos de payloads válidos y las respuestas JSON esperadas. Todos los endpoints están protegidos por `CustomThrottlerGuard`; los administrativos además requieren API Key.

## Resumen rápido

| Método | Ruta                      | Acceso          | Descripción                                     |
| ------ | ------------------------- | --------------- | ----------------------------------------------- |
| POST   | `/api/otp/generate`       | Público         | Genera y envía un nuevo OTP                     |
| POST   | `/api/otp/verify`         | Público         | Verifica un OTP existente                       |
| POST   | `/api/otp/resend`         | Público         | Reenvía el último OTP disponible                |
| GET    | `/api/otp/stats`          | Admin (API Key) | Obtiene estadísticas globales o filtradas       |
| POST   | `/api/otp/cleanup`        | Admin (API Key) | Limpia OTPs expirados en Redis                  |
| POST   | `/api/otp/sync-redis`     | Admin (API Key) | Reconstruye la caché de Redis desde la base     |
| POST   | `/api/otp/cleanup/manual` | Admin (API Key) | Limpieza manual de claves Redis                 |
| GET    | `/api/otp/cron/status`    | Admin (API Key) | Estado actual de los cron jobs de mantenimiento |

## Consideraciones generales

- **Rate limiting**: se aplican los límites `short` y `medium` definidos en Redis. Los mensajes de error incluyen `retryAfter` en segundos.
- **Timeout**: los endpoints públicos usan `TimeoutInterceptor(5000)`, devolviendo 408 si la operación excede 5 segundos.
- **Validación de aplicación**: salvo que se indique lo contrario, el `ApplicationValidationGuard` exige que `applicationId` esté listado en `ALLOWED_APPLICATIONS`.
- **Formato común de éxito**: las respuestas principales se envuelven luego por `TransformInterceptor`, entregando `{ success, data, timestamp, path, method, statusCode, requestId }` al consumidor final.

## Endpoints públicos

### Generar OTP — `POST /api/otp/generate`

- **Acceso**: Público (`@Public()`), requiere `applicationId` válido.
- **Headers requeridos**: ninguno especial.
- **Body JSON**:

| Campo             | Tipo   | Requerido | Descripción                                                    |
| ----------------- | ------ | --------- | -------------------------------------------------------------- |
| `identifier`      | string | Sí        | Email o teléfono en formato E.164. Validado según `type`.      |
| `type`            | string | Sí        | Canal de entrega: `email` o `sms`.                             |
| `applicationId`   | string | Sí        | Cliente autorizado (min 3, max 100, sin espacios, minúsculas). |
| `applicationName` | string | No        | Nombre legible de la aplicación para auditoría.                |

#### Ejemplo de solicitud

```json
{
	"identifier": "user@example.com",
	"type": "email",
	"applicationId": "medusajs-storefront",
	"applicationName": "Medusa Storefront"
}
```

#### Respuesta 200 (payload interno)

```json
{
	"success": true,
	"message": "OTP generated successfully",
	"expiresAt": "2025-10-05T14:25:00.000Z",
	"resendAllowedAt": "2025-10-05T14:16:00.000Z"
}
```

#### Errores comunes

- `400 Bad Request` — `ValidationErrorDto` con arreglo de mensajes.
- `429 Too Many Requests` — `RateLimitErrorDto` con `retryAfter`.
- `429 Too Many Requests` — `BlockedOtpErrorDto` si se exceden reenvíos o existe bloqueo.

### Verificar OTP — `POST /api/otp/verify`

- **Acceso**: Público, requiere `applicationId` válido y match con OTP.
- **Headers requeridos**: ninguno.
- **Body JSON**:

| Campo           | Tipo   | Requerido | Descripción                                    |
| --------------- | ------ | --------- | ---------------------------------------------- |
| `identifier`    | string | Sí        | Debe coincidir con el usado al generar el OTP. |
| `otp`           | string | Sí        | Código de 6 dígitos, numérico.                 |
| `applicationId` | string | Sí        | Debe coincidir con la generación.              |

#### Ejemplo de solicitud

```json
{
	"identifier": "user@example.com",
	"otp": "123456",
	"applicationId": "medusajs-storefront"
}
```

#### Respuesta 200 (payload interno)

```json
{
	"success": true,
	"message": "OTP verified successfully",
	"token": "eyJ...dHJ1ZX0="
}
```

#### Errores comunes

- `400 Bad Request` — formato inválido del código o identifier.
- `429 Too Many Requests` — demasiados intentos fallidos (`remainingAttempts` incluido).
- `200 OK` con `success: false` — OTP expirado, ya usado o bloqueado.

### Reenviar OTP — `POST /api/otp/resend`

- **Acceso**: Público, comparte validaciones con generación.
- **Headers requeridos**: ninguno.
- **Body JSON**: mismos campos que `generate`.

#### Ejemplo de solicitud

```json
{
	"identifier": "+584121234567",
	"type": "sms",
	"applicationId": "mobile-app",
	"applicationName": "Mobile App"
}
```

#### Respuesta 200 (payload interno)

```json
{
	"success": true,
	"message": "OTP resent successfully",
	"expiresAt": "2025-10-05T14:25:00.000Z",
	"resendAllowedAt": "2025-10-05T14:16:00.000Z"
}
```

#### Errores comunes

- `429 Too Many Requests` — cooldown activo (`resendAllowedAt` en respuesta) o reenvíos máximos.
- `429 Too Many Requests` — bloqueo temporal (`BlockedOtpErrorDto`).

## Endpoints administrativos (requieren API Key)

Todos los endpoints siguientes necesitan `X-API-Key` con la clave definida en `ADMIN_API_KEY`. Además, utilizan `@SkipAppValidation()` para omitir la validación de `applicationId`.

### Estadísticas — `GET /api/otp/stats`

- **Headers obligatorios**: `X-API-Key: <clave>`
- **Interceptors**: `OtpStatsCacheInterceptor` (cachea 600s).
- **Query params**:

| Campo           | Tipo   | Requerido | Descripción                                    |
| --------------- | ------ | --------- | ---------------------------------------------- |
| `applicationId` | string | No        | Filtra estadísticas por aplicación específica. |

#### Ejemplo de solicitud

```
GET /api/otp/stats?applicationId=medusajs-storefront
X-API-Key: super-secret-key
```

#### Respuesta 200 (payload interno)

```json
{
	"totalOtps": 1500,
	"activeOtps": 45,
	"verifiedOtps": 1200,
	"blockedOtps": 23,
	"cleanupNeeded": 232,
	"applicationId": "medusajs-storefront"
}
```

#### Errores comunes

- `401 Unauthorized` — falta o invalidez del header `X-API-Key`.
- `403 Forbidden` — `applicationId` no autorizado (si se aplica guard adicional).

### Limpieza de OTPs — `POST /api/otp/cleanup`

- **Headers obligatorios**: `X-API-Key`.
- **Body**: vacío.

#### Respuesta 200 (payload interno)

```json
{
	"success": true,
	"message": "Successfully cleaned up 150 expired OTPs",
	"cleanedCount": 150
}
```

### Sincronizar Redis — `POST /api/otp/sync-redis`

- **Headers obligatorios**: `X-API-Key`.
- **Body**: vacío.

#### Respuesta 200 (payload interno)

```json
{
	"success": true,
	"syncedCount": 42
}
```

### Limpieza manual agresiva — `POST /api/otp/cleanup/manual`

- **Headers obligatorios**: `X-API-Key`.
- **Body**: vacío.

#### Respuesta 200 (payload interno)

```json
{
	"redisKeysDeleted": 128,
	"dbRecordsKept": 3400
}
```

### Estado de cron jobs — `GET /api/otp/cron/status`

- **Headers obligatorios**: `X-API-Key`.
- **Body**: vacío.

#### Respuesta 200 (payload interno)

```json
{
	"cleanup-redis-otps": {
		"running": false,
		"lastDate": "2025-10-05T13:30:00.000Z",
		"nextDate": "2025-10-05T14:00:00.000Z"
	},
	"aggressive-redis-cleanup": {
		"running": false,
		"lastDate": "2025-10-05T06:00:00.000Z",
		"nextDate": "2025-10-05T12:00:00.000Z"
	},
	"daily-redis-report": {
		"lastDate": "2025-10-05T00:00:00.000Z",
		"nextDate": "2025-10-06T00:00:00.000Z"
	}
}
```
