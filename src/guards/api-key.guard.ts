import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'

import { IS_PUBLIC_KEY } from '@/src/decorators'

/**
 * API Key Guard
 *
 * Valida que la request tenga un API Key válido
 * Se usa para proteger endpoints administrativos
 *
 * Soporta API Key en:
 * 1. Header: X-API-Key
 * 2. Header: Authorization: Bearer <api-key>
 *
 * Se puede skipear con @Public()
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
	private readonly logger = new Logger(ApiKeyGuard.name)
	private readonly adminApiKey: string | null

	constructor(
		private reflector: Reflector,
		private configService: ConfigService,
	) {
		this.adminApiKey =
			this.configService.get<string>('ADMIN_API_KEY') ?? null

		if (!this.adminApiKey) {
			this.logger.error(
				'❌ ADMIN_API_KEY not configured! Admin endpoints will be unprotected!',
			)
			this.logger.error(
				'   Set ADMIN_API_KEY in your .env file for security.',
			)
		} else {
			this.logger.log(
				'✅ API Key authentication enabled for admin endpoints',
			)
		}
	}

	canActivate(context: ExecutionContext): boolean {
		// Verificar si el endpoint es público
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		)

		if (isPublic) {
			return true
		}

		// Si no hay API key configurada, denegar acceso por seguridad
		if (!this.adminApiKey) {
			throw new UnauthorizedException({
				success: false,
				message: 'API Key authentication is not properly configured',
				errorCode: 'API_KEY_NOT_CONFIGURED',
				statusCode: 401,
			})
		}

		const request = context.switchToHttp().getRequest<FastifyRequest>()
		const apiKey = this.extractApiKey(request)

		if (!apiKey) {
			throw new UnauthorizedException({
				success: false,
				message:
					'API Key is required. Provide it via X-API-Key header or Authorization: Bearer <key>',
				errorCode: 'MISSING_API_KEY',
				statusCode: 401,
			})
		}

		// Comparar API keys de forma segura (time-constant)
		if (!this.secureCompare(apiKey, this.adminApiKey)) {
			this.logger.warn(
				`🚫 Invalid API Key attempt from IP: ${request.ip}`,
			)

			throw new UnauthorizedException({
				success: false,
				message: 'Invalid API Key',
				errorCode: 'INVALID_API_KEY',
				statusCode: 401,
			})
		}

		this.logger.debug(`✅ Valid API Key from IP: ${request.ip}`)
		return true
	}

	/**
	 * Extrae el API Key de los headers
	 */
	private extractApiKey(request: FastifyRequest): string | undefined {
		// Opción 1: Header X-API-Key (preferido)
		const headerKey = request.headers['x-api-key']
		if (headerKey) {
			return Array.isArray(headerKey) ? headerKey[0] : headerKey
		}

		// Opción 2: Header Authorization: Bearer <api-key>
		const authHeader = request.headers.authorization
		if (authHeader) {
			const [type, token] = authHeader.split(' ')
			if (type === 'Bearer' && token) {
				return token
			}
		}

		return undefined
	}

	/**
	 * Comparación segura contra timing attacks
	 */
	private secureCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false
		}

		let result = 0
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i)
		}

		return result === 0
	}
}
