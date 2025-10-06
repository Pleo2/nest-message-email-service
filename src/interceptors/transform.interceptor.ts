import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * Response structure
 */
export interface Response<T> {
	success: boolean
	data: T
	timestamp: string
	path: string
	method: string
	statusCode: number
	requestId?: string
}

/**
 * Transform Interceptor
 *
 * Transforma todas las respuestas a un formato estándar:
 * {success: true,
 *   data: {...},
 *   timestamp: "2025-10-05T22:15:00.000Z",
 *   path: "/api/otp/generate",
 *   method: "POST",
 *   statusCode: 200
 * }
 *
 * Útil para:
 * - Consistencia en todas las respuestas
 * - Facilitar parsing en el cliente
 * - Agregar metadata útil
 */
@Injectable()
export class TransformInterceptor<T>
	implements NestInterceptor<T, Response<T>>
{
	intercept(
		context: ExecutionContext,
		next: CallHandler<T>,
	): Observable<Response<T>> {
		const request = context.switchToHttp().getRequest<FastifyRequest>()
		const response = context.switchToHttp().getResponse<FastifyReply>()

		const { method, url } = request
		const statusCode =
			typeof response.statusCode === 'number' ? response.statusCode : 200

		// Generar request ID único
		const requestId = Math.random().toString(36).slice(2, 15)

		return next.handle().pipe(
			map((data: T) => ({
				success: true,
				data,
				timestamp: new Date().toISOString(),
				path: url,
				method,
				statusCode,
				requestId,
			})),
		)
	}
}
