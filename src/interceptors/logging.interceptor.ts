import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

interface RequestUser {
	email?: string
	[key: string]: unknown
}

interface LoggingRouteGeneric {
	Params: Record<string, unknown>
	Querystring: Record<string, unknown>
	Body: unknown
}

type LoggingRequest = FastifyRequest<LoggingRouteGeneric> & {
	user?: RequestUser
}

/**
 * Logging Interceptor
 *
 * Registra:
 * - Tiempo de ejecución de cada request
 * - Método y URL
 * - Usuario (si está autenticado)
 * - Datos de entrada (body, query, params)
 * - Datos de salida
 *
 * Útil para:
 * - Performance monitoring
 * - Debugging
 * - Auditoría
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger('LoggingInterceptor')

	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<unknown> {
		const request = context.switchToHttp().getRequest<LoggingRequest>()
		const { method, url, user } = request
		const body = request.body
		const query = request.query
		const params = request.params

		// Timestamp de inicio
		const now = Date.now()

		// Log de entrada
		this.logger.debug(
			`→ ${method} ${url} | User: ${user?.email ?? 'Anonymous'} | Body: ${safeStringify(body)} | Query: ${safeStringify(query)} | Params: ${safeStringify(params)}`,
		)

		return next.handle().pipe(
			tap({
				next: (data: unknown) => {
					// Calcular duración
					const duration = Date.now() - now

					// Log de salida exitosa
					this.logger.debug(
						`← ${method} ${url} | Duration: ${duration}ms | Response: ${safeStringify(data).slice(0, 200)}...`,
					)
				},
				error: (error: unknown) => {
					// Calcular duración
					const duration = Date.now() - now

					// Log de error
					this.logger.error(
						`✗ ${method} ${url} | Duration: ${duration}ms | Error: ${extractErrorMessage(error)}`,
					)
				},
			}),
		)
	}
}

function safeStringify(value: unknown): string {
	if (value === undefined) {
		return 'undefined'
	}

	if (typeof value === 'string') {
		return value
	}

	try {
		return JSON.stringify(value)
	} catch {
		return '[Unserializable]'
	}
}

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	return safeStringify(error)
}
