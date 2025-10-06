// src/common/logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Logger Middleware
 *
 * Registra todas las peticiones HTTP con:
 * - Método (GET, POST, etc)
 * - URL
 * - Status code
 * - Tamaño de respuesta
 * - Duración en ms
 * - IP del cliente
 * - User agent
 *
 * Niveles de log:
 * - ERROR (5xx): Errores de servidor
 * - WARN (4xx): Errores de cliente
 * - LOG (2xx, 3xx): Requests exitosos
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
	private readonly logger = new Logger('HTTP')

	use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
		// Extraer información de la request
		const { method, url } = req
		const userAgent = req.headers['user-agent'] || 'Unknown'

		// Obtener IP (soporta proxies con x-forwarded-for)
		const ip =
			req.headers['x-forwarded-for'] ||
			req.socket.remoteAddress ||
			'Unknown'

		// Timestamp de inicio
		const startTime = Date.now()

		// Escuchar cuando termine la respuesta
		res.on('finish', () => {
			const { statusCode } = res
			const contentLength = res.getHeader('content-length') || 0
			const duration = Date.now() - startTime

			// Construir mensaje de log
			const logMessage = `${method} ${url} ${statusCode} ${contentLength}b - ${duration}ms - ${ip} - ${userAgent}`

			// Seleccionar nivel de log según status code
			if (statusCode >= 500) {
				// Errores de servidor (500, 502, 503, etc)
				this.logger.error(logMessage)
			} else if (statusCode >= 400) {
				// Errores de cliente (400, 401, 403, 404, etc)
				this.logger.warn(logMessage)
			} else {
				// Requests exitosos (200, 201, 204, 301, 302, etc)
				this.logger.log(logMessage)
			}
		})

		// Continuar con el siguiente middleware/handler
		next()
	}
}
