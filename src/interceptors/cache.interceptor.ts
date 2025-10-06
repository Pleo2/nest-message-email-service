import type { RedisClientType } from 'redis'

import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common'
import { InjectRedis } from '@nestjs-redis/kit'
import { FastifyRequest } from 'fastify'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators'

type CacheableRequest = FastifyRequest & {
	user?: {
		id?: string | number
	}
}

/**
 * Cache Interceptor (Redis)
 *
 * Cachea respuestas en Redis por un TTL configurable
 *
 * Cache key: method:url:userId (si aplica)
 * Ejemplo: GET:/api/otp/stats:user-123
 *
 * Solo cachea:
 * - Requests GET
 * - Respuestas exitosas (status 200)
 *
 * Útil para:
 * - Performance (respuestas instantáneas)
 * - Reducir carga en DB
 * - Escalabilidad
 *
 * Uso:
 * @UseInterceptors(new CacheInterceptor(60)) // 60 segundos
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
	private readonly logger = new Logger('CacheInterceptor')

	constructor(
		@InjectRedis()
		private readonly redis: RedisClientType,
		private readonly ttlInSeconds = 60, // TTL en segundos (default: 1 minuto)
	) {}

	async intercept(
		context: ExecutionContext,
		next: CallHandler<unknown>,
	): Promise<Observable<unknown>> {
		const request = context.switchToHttp().getRequest<CacheableRequest>()
		const { method, url } = request

		// Solo cachear requests GET
		if (method !== 'GET') {
			return next.handle()
		}

		// Generar cache key
		const userId = request.user?.id ?? 'anonymous'
		const cacheKey = `cache:${method}:${url}:${userId}`

		try {
			// Buscar en cache
			const cachedResponse = await this.redis.get(cacheKey)

			if (cachedResponse) {
				// Cache hit
				this.logger.debug(`✅ Cache HIT: ${cacheKey}`)
				return of(this.parseCachedResponse(cachedResponse, cacheKey))
			}

			// Cache miss
			this.logger.debug(`❌ Cache MISS: ${cacheKey}`)

			// Ejecutar controller y cachear respuesta
			return next.handle().pipe(
				tap(response => {
					try {
						// Solo cachear respuestas exitosas
						if (this.shouldCacheResponse(response)) {
							this.cacheResponse(cacheKey, response)
						}
					} catch (error) {
						// No fallar si el cache falla
						this.logger.error(
							`Failed to cache response: ${this.getErrorMessage(error)}`,
						)
					}
				}),
			)
		} catch (error) {
			// Si Redis falla, continuar sin cache
			this.logger.error(`Cache error: ${this.getErrorMessage(error)}`)
			return next.handle()
		}
	}

	private shouldCacheResponse(response: unknown): boolean {
		return response !== undefined && !this.hasErrorFlag(response)
	}

	private cacheResponse(cacheKey: string, response: unknown): void {
		let payload: string
		try {
			payload = JSON.stringify(response)
		} catch (error: unknown) {
			this.logger.error(
				`Failed to serialize response for cache ${cacheKey}: ${this.getErrorMessage(error)}`,
			)
			return
		}
		this.redis
			.setEx(cacheKey, this.ttlInSeconds, payload)
			.then(() => {
				this.logger.debug(
					`💾 Cached: ${cacheKey} (TTL: ${this.ttlInSeconds}s)`,
				)
			})
			.catch((error: unknown) => {
				this.logger.error(
					`Failed to cache response: ${this.getErrorMessage(error)}`,
				)
			})
	}

	private parseCachedResponse(value: string, cacheKey: string): unknown {
		try {
			return JSON.parse(value) as unknown
		} catch (error: unknown) {
			this.logger.warn(
				`Failed to parse cached response for ${cacheKey}: ${this.getErrorMessage(error)}`,
			)
			return undefined
		}
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : String(error)
	}

	private hasErrorFlag(value: unknown): boolean {
		if (!value || typeof value !== 'object') {
			return false
		}
		const record = value as Record<string, unknown>
		return 'error' in record && Boolean(record.error)
	}
}
